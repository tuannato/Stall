import { build } from 'vite';
import { describe, expect, it } from 'vitest';

/** Structural, because `rollup` is not a dependency of this app to import types from. */
type BuiltPart = { type: string; code?: string; fileName?: string };
type BuiltOutput = { output: readonly BuiltPart[] };

/**
 * What the origin actually serves, not what `src/` imports.
 *
 * `directory-walls` greps source for an import of the wallet package and will
 * never see this: the key code arrived through a CommonJS `require` inside a
 * dependency, where no import of ours appears. `CLAUDE.md` said that package was
 * "vendored but unused" and the served script carried `Wallet.fromMnemonic`,
 * `mnemonicToSeed` and `HdNode.fromSeed` for every visitor.
 *
 * So this builds the app and reads the bytes. It cannot pass vacuously against
 * a stale or missing `dist/`, and it cannot be satisfied by a comment.
 */
describe('built-bundle-has-no-key-derivation', () => {
    /**
     * Implementations, not export names. The stubs in `vite.config.ts` must
     * keep the names `ecash-lib`'s barrel re-exports, so forbidding
     * `mnemonicToSeed` outright would forbid the fix. These strings appear only
     * in the real bodies.
     */
    const FORBIDDEN = [
        'fromMnemonic',
        'derivePath',
        'WatchOnlyWallet',
        'DEFAULT_GAP_LIMIT',
    ] as const;

    /** Proof the stubs are wired, so an empty result cannot read as a pass. */
    const REFUSAL = 'Stall holds no key: key derivation is not bundled';

    it('serves no path from a mnemonic to a private key', async () => {
        const result = (await build({
            logLevel: 'silent',
            build: { write: false },
        })) as unknown as BuiltOutput;

        const scripts = result.output.filter((part) => part.type === 'chunk');
        expect(scripts.length, 'no script chunk was emitted').toBeGreaterThan(0);
        const code = scripts.map((chunk) => chunk.code ?? '').join('\n');

        expect(code).toContain(REFUSAL);
        for (const symbol of FORBIDDEN) {
            expect(code, `${symbol} is in the served script`).not.toContain(symbol);
        }

        // The 1.2 MB wasm was base64-inlined and ran through `initSync` at
        // import — 80% of the script, for one hash. It must not come back: a
        // `.wasm` re-fetch would need `wasm-unsafe-eval`, and an inline blob is
        // the weight `@noble/hashes` replaced.
        expect(code, 'the wasm base64 is back in the bundle').not.toContain(
            'ECASH_LIB_WASM_BASE64',
        );
        expect(code, 'wasm is being instantiated at runtime').not.toContain('initSync');
    }, 120_000);
});

/**
 * The showroom is a workshop tool, not a page this origin serves.
 *
 * `layout/gallery.html` paints the fixture stall with seekable animations and
 * a control strip — exactly the kind of page that must never ride along into
 * production, where its fixture shop would be one route-typo away from looking
 * like a real seller. The build has a single entry (`index.html`), so the
 * gallery is excluded by construction; this reads the emitted output so that a
 * future second entry cannot bring it in silently.
 */
describe('gallery-is-not-served', () => {
    it('emits no gallery file and no showroom code', async () => {
        const result = (await build({
            logLevel: 'silent',
            build: { write: false },
        })) as unknown as BuiltOutput | readonly BuiltOutput[];
        const outputs = Array.isArray(result) ? result : [result as BuiltOutput];
        const parts = outputs.flatMap((o) => o.output);
        expect(parts.length, 'nothing was built').toBeGreaterThan(0);

        for (const part of parts) {
            expect(part.fileName ?? '', 'a gallery file is in the build').not.toContain(
                'gallery',
            );
        }
        const code = parts
            .filter((part) => part.type === 'chunk')
            .map((part) => part.code ?? '')
            .join('\n');
        expect(code, 'showroom code is in the served script').not.toContain(
            '__galleryReady',
        );
    }, 120_000);
});

/**
 * A chronik request that never returns is how a stall hangs forever.
 *
 * `chronik-client` calls axios with no `timeout`, and axios defaults to `0` —
 * wait indefinitely. Its own `_request` loop is written to fail over to the
 * next host on an error carrying a `code`, but a half-open socket, which is
 * what sleeping a laptop leaves behind, never returns *and never throws*: the
 * loop never advances, the load never settles, and the page sits on `opening`
 * with the browser's spinner running. `src/net/errors.ts` already sorts
 * `ETIMEDOUT` and `ECONNABORTED` onto the unreachable screen — the machinery
 * to report this existed and nothing ever started a clock.
 *
 * `chronikRequestTimeout` in `vite.config.ts` injects one at build time, the
 * same way key derivation is stubbed out. A grep of `src/` cannot see that
 * either, so this reads the bytes the origin actually serves.
 */
describe('built-bundle-times-out-a-chronik-request', () => {
    it('gives both axios calls a timeout, beside the request they belong to', async () => {
        const result = (await build({
            logLevel: 'silent',
            build: { write: false },
        })) as unknown as BuiltOutput | readonly BuiltOutput[];
        const outputs = Array.isArray(result) ? result : [result as BuiltOutput];
        const code = outputs
            .flatMap((o) => o.output)
            .filter((part) => part.type === 'chunk')
            .map((part) => part.code ?? '')
            .join('\n');

        expect(code.length, 'nothing was built').toBeGreaterThan(0);
        // The proxy is in the bundle at all, so an absent match cannot read as
        // a pass because chronik was tree-shaken away.
        expect(code, 'the chronik request path is not in the bundle').toContain(
            'arraybuffer',
        );

        // Minified: 5000 becomes 5e3. Both call sites — the GET the app uses
        // and the POST beside it — must carry it, and it must sit in the same
        // options object as the request, not merely somewhere in the bundle.
        const paired = code.match(/timeout:\s*5e3\s*,\s*responseType:\s*["']arraybuffer["']/g);
        expect(paired?.length, 'both chronik axios calls need the clock').toBe(2);

        // And nothing in the chronik path is left waiting forever.
        expect(code).not.toMatch(/timeout:\s*0\s*,\s*responseType:\s*["']arraybuffer["']/);
    });
});
