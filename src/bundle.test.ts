import { build } from 'vite';
import { describe, expect, it } from 'vitest';

/** Structural, because `rollup` is not a dependency of this app to import types from. */
type BuiltPart = { type: string; code?: string };
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
