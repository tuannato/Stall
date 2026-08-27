import { fromHex, shaRmd160, sha256, toHex } from 'ecash-lib';
import { describe, expect, it } from 'vitest';

/**
 * `shaRmd160` (and `sha256` under it) is the whole reason this app touched a
 * 1.2 MB wasm blob. `noKeyDerivation` in `vite.config.ts` now backs it with
 * `@noble/hashes` and drops the wasm; vitest applies that plugin, so this runs
 * against the real replacement, not the wasm it replaced.
 *
 * A hash swap is a correctness change on the identity path — pubkey to address,
 * and manifest authorship. One vector is not enough, so these are independently
 * verifiable: `sha256('abc')` is the NIST vector, and the hash160 of the
 * secp256k1 generator point is a fixed Bitcoin constant.
 */
describe('hashes-are-noble-not-wasm', () => {
    it('shaRmd160 of empty is the pinned value', () => {
        expect(toHex(shaRmd160(new Uint8Array()))).toBe(
            'b472a266d0bd89c13706a4132ccfb16f7c3b9fcb',
        );
    });

    it('hash160 of the generator point matches the known constant', () => {
        const g = fromHex(
            '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
        );
        expect(toHex(shaRmd160(g))).toBe('751e76e8199196d454941c45d1b3a323f1433bd6');
    });

    it('sha256 matches the NIST "abc" vector', () => {
        expect(toHex(sha256(new TextEncoder().encode('abc')))).toBe(
            'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
        );
    });
});
