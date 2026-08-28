import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import { ICON_HOST } from './src/domain/icons';
import { CHRONIK_HOSTS, PRICE_HOST } from './src/net/hosts';

/**
 * Key derivation must not reach the bundle.
 *
 * Stall holds no key, but the origin was serving `Wallet.fromMnemonic`,
 * `mnemonicToSeed` and `HdNode.fromSeed` anyway. Nothing in `src/` asks for
 * them; CommonJS drags them in and cannot be tree-shaken. `ecash-agora` — the
 * only package this app imports to read offers — does a top-level
 * `require("ecash-wallet")`, and every one of its modules requires the
 * `ecash-lib` barrel, whose `index.js` re-exports `mnemonic.js` and
 * `hdwallet.js`.
 *
 * Replacing them is safe because none is on a path this app takes. Agora
 * touches exactly three `ecash-wallet` symbols and every use sits inside a
 * signing or transaction-building method that takes a `wallet` this origin
 * never has; inside `ecash-lib` only `index.js` requires the two key modules.
 * `activeOffersByPubKey` and `askedSats` reach neither, so the covenant maths
 * §8 protects is untouched.
 *
 * The stubs throw rather than return empty. If a path ever reaches one it must
 * fail loudly instead of quietly working: a silent no-op is how a wallet gets
 * half-wired. Test: `built-bundle-has-no-key-derivation`.
 */
const KEYS_REFUSED = 'Stall holds no key: key derivation is not bundled';

/** `find`/`replacement` cannot reach these: the requires are relative and inside a dependency. */
const KEY_MODULES: ReadonlyArray<readonly [RegExp, string]> = [
    [
        /[/\\]ecash-lib[/\\]dist[/\\]mnemonic\.js$/,
        ['entropyToMnemonic', 'mnemonicToEntropy', 'mnemonicToSeed'],
    ],
    [/[/\\]ecash-lib[/\\]dist[/\\]hdwallet\.js$/, ['HdNode']],
    // Both build a generator point with `new Ecc()` at module load, which is
    // the signing path this origin does not take. Nothing here imports their
    // exports; stubbing them keeps that `new Ecc()` from running at boot.
    [
        /[/\\]ecash-lib[/\\]dist[/\\]blindSchnorr\.js$/,
        ['BlindSigner', 'BlindSignatureRequest', 'buildBlindSigRequests', 'finalizeBlindSigs'],
    ],
    [
        /[/\\]ecash-lib[/\\]dist[/\\]pedersen\.js$/,
        [
            'PedersenSetup',
            'ResultAtInfinity',
            'InsecureHPoint',
            'NonceRangeError',
            'addCommitmentPoints',
            'verifyCommitmentSum',
            'addScalars',
        ],
    ],
].map(([re, names]) => [re as RegExp, stubSource(names as string[])] as const);

function stubSource(names: readonly string[]): string {
    const refuse = `const refuse = () => { throw new Error(${JSON.stringify(KEYS_REFUSED)}); };`;
    const body = names
        .map((name) =>
            /^[A-Z]/.test(name)
                ? `export class ${name} { constructor() { refuse(); } static fromSeed() { refuse(); } }`
                : `export function ${name}() { refuse(); }`,
        )
        .join('\n');
    return `${refuse}\n${body}\n`;
}

/** The whole surface `ecash-agora` uses. Grown only when agora grows. */
const WALLET_STUB_ID = '\0stall:ecash-wallet';
const WALLET_STUB = stubSource([
    'BuiltAction',
    'removeSpentUtxos',
    'getWalletUtxoFromOutput',
]);

/**
 * `ecash-lib` embeds a 1.2 MB wasm as base64 and runs `initSync` at import to
 * back its hashers — 80% of the served script, for the one hash this app calls:
 * `shaRmd160` (pubkey to address). Replace `initWasm.js` so the hashes come from
 * `@noble/hashes` (audited, ~50 KB) and the wasm never enters the bundle. Ecc,
 * the streaming hashers and sha512 are on the signing path this origin does not
 * take, so they throw — a wrong hash there must be loud, never silent.
 */
const INIT_WASM = /[/\\]ecash-lib[/\\]dist[/\\]initWasm\.js$/;
const INIT_WASM_SOURCE = `
import { __setHashes } from './hash.js';
import { __setEcc } from './ecc.js';
import { __setPkc } from './publicKeyCrypto.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { ripemd160 } from '@noble/hashes/legacy.js';

const refuse = () => { throw new Error(${JSON.stringify(KEYS_REFUSED)}); };
const sha256d = (b) => sha256(sha256(b));
const shaRmd160 = (b) => ripemd160(sha256(b));
function RefusingHasher() { return { update: refuse, finalize: refuse, free() {} }; }

__setHashes({
    sha256,
    sha256d,
    shaRmd160,
    sha512: refuse,
    Sha256H: RefusingHasher,
    Sha512H: RefusingHasher,
});
// Return a throwing function on any read; only calling it throws. A signing
// method read at boot must be tolerated, a signing method called must not be.
__setEcc(new Proxy({}, { get: () => refuse }));
__setPkc(new Proxy({}, { get: () => refuse }));
`;

function noKeyDerivation(): Plugin {
    return {
        name: 'stall-no-key-derivation',
        enforce: 'pre',
        resolveId(source) {
            return source === 'ecash-wallet' ? WALLET_STUB_ID : null;
        },
        load(id) {
            if (id === WALLET_STUB_ID) {
                return WALLET_STUB;
            }
            if (INIT_WASM.test(id)) {
                return INIT_WASM_SOURCE;
            }
            for (const [pattern, source] of KEY_MODULES) {
                if (pattern.test(id)) {
                    return source;
                }
            }
            return null;
        },
    };
}

/**
 * HTTP header only — <meta> would drop frame-ancestors.
 *
 * Derived from CHRONIK_HOSTS so a fourth node cannot be added to the app while
 * the policy silently blocks it: the failover proxy treats a CSP refusal as an
 * unreachable host and moves on, so the drift would cost a node without ever
 * failing loudly.
 *
 * img-src is derived from ICON_HOST the same way. The page never fetches that
 * origin — only an <img> loads it — so the host does not belong on connect-src.
 *
 * object-src, frame-src and worker-src are stated rather than left to
 * default-src: worker-src does not fall back to default-src at all (it falls
 * back through child-src to script-src).
 *
 * script-src is exactly 'self': the wasm that once forced 'wasm-unsafe-eval' is
 * gone (see `noKeyDerivation`), so the loosest allowance the origin needed is
 * removed rather than merely justified.
 */
export const CSP = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    `img-src 'self' ${ICON_HOST}`,
    "font-src 'self'",
    "object-src 'none'",
    "frame-src 'none'",
    "worker-src 'none'",
    // Both schemes, from the one constant. chronik-client turns each https
    // host into wss://<host>/ws for its subscription socket, and CSP does not
    // infer one from the other — a missing wss:// is a silent dead socket.
    `connect-src 'self' ${CHRONIK_HOSTS.join(' ')} ${CHRONIK_HOSTS.map((h) => h.replace('https://', 'wss://')).join(' ')} ${PRICE_HOST}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
].join('; ');

/**
 * Dev only, and never deployed. Vite's dev server injects styles as inline
 * <style> and runs an optimizer worker from a blob: URL, both of which the
 * real policy blocks — without this the dev page renders with no CSS at all,
 * which is a very convincing way to verify the wrong thing.
 *
 * `preview` deliberately keeps the strict policy: it serves the built output,
 * so it is the honest rehearsal for production.
 */
const DEV_CSP = CSP.replace("style-src 'self'", "style-src 'self' 'unsafe-inline'")
    .replace("worker-src 'none'", "worker-src 'self' blob:");

// Deployed copies already send no-referrer: a stall path is the seller's
// key or address. Preview is the production rehearsal and must match.
const REFERRER_POLICY = 'no-referrer';

export default defineConfig({
    appType: 'spa',
    plugins: [noKeyDerivation()],
    build: {
        // The polyfill is emitted as an inline <script>, which this policy has
        // no 'unsafe-inline' and no hash for. Disabling it keeps the built
        // document free of inline script instead of growing a hash ritual.
        modulePreload: { polyfill: false },
    },
    server: {
        headers: {
            'Content-Security-Policy': DEV_CSP,
            'Referrer-Policy': REFERRER_POLICY,
        },
    },
    preview: {
        headers: {
            'Content-Security-Policy': CSP,
            'Referrer-Policy': REFERRER_POLICY,
        },
    },
    test: {
        include: ['src/**/*.test.ts'],
        environment: 'node',
        reporters: ['default'],
    },
});
