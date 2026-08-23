import { shaRmd160, toHex } from 'ecash-lib';
import { describe, expect, it } from 'vitest';
import { extractP2pkhPubKey, pubKeyMatchesHash } from './pubkey';

describe('extractP2pkhPubKey', () => {
    it('reads [sig, compressed pk] and rejects p2sh-shaped scripts', () => {
        const pk = new Uint8Array(33);
        pk[0] = 0x02;
        pk.fill(0xaa, 1);
        const sig = new Uint8Array(71);
        sig.fill(0x30);
        const script = new Uint8Array(1 + sig.length + 1 + pk.length);
        script[0] = sig.length;
        script.set(sig, 1);
        script[1 + sig.length] = pk.length;
        script.set(pk, 2 + sig.length);
        const hex = toHex(script);
        const got = extractP2pkhPubKey(hex);
        expect(got).toEqual(pk);
        expect(pubKeyMatchesHash(pk, toHex(shaRmd160(pk)))).toBe(true);
        expect(pubKeyMatchesHash(pk, '00'.repeat(20))).toBe(false);
        expect(extractP2pkhPubKey('00')).toBeUndefined();
    });
});

describe('wasm boots', () => {
    it('shaRmd160 returns 20 bytes', () => {
        expect(shaRmd160(new Uint8Array(33)).length).toBe(20);
    });
});
