import { shaRmd160, toHex } from 'ecash-lib';
import { describe, expect, it } from 'vitest';

describe('wasm-boots', () => {
    it('initialises ecash-lib wasm and hashes', () => {
        expect(toHex(shaRmd160(new Uint8Array()))).toBe(
            'b472a266d0bd89c13706a4132ccfb16f7c3b9fcb',
        );
    });
});
