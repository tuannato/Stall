import { describe, expect, it } from 'vitest';
import { decodeManifestPushes, pickManifestWinner, STL1_ASCII } from './manifest';
import { THEME_BYTES } from './theme';

function pushes(name: string, theme = new Uint8Array(THEME_BYTES)): Uint8Array[] {
    return [
        Uint8Array.from(STL1_ASCII, (c) => c.charCodeAt(0)),
        new TextEncoder().encode(name),
        theme,
    ];
}

describe('decodeManifestPushes', () => {
    it('reads name + 28-byte theme', () => {
        const m = decodeManifestPushes(pushes("Nato's Corner"));
        expect(m.name).toBe("Nato's Corner");
        expect(m.theme.bg).toEqual({ r: 0, g: 0, b: 0 });
    });

    it('rejects extra or missing pushes and a short theme', () => {
        expect(() => decodeManifestPushes(pushes('x').slice(0, 2))).toThrow(/3 pushes/);
        const extra = [...pushes('x'), new Uint8Array([1])];
        expect(() => decodeManifestPushes(extra)).toThrow(/3 pushes/);
        const badTheme = pushes('x');
        badTheme[2] = new Uint8Array(24);
        expect(() => decodeManifestPushes(badTheme)).toThrow(/28 bytes/);
    });
});

describe('pickManifestWinner', () => {
    it('prefers higher block, then position, then txid', () => {
        const winner = pickManifestWinner([
            { height: 10, blockPos: 2, txid: 'bb' },
            { height: 11, blockPos: 0, txid: 'aa' },
            { height: 11, blockPos: 1, txid: 'cc' },
        ]);
        expect(winner?.txid).toBe('cc');
        const mempool = pickManifestWinner([
            { height: 11, blockPos: 9, txid: 'aa' },
            { height: undefined, blockPos: undefined, txid: 'zz' },
        ]);
        expect(mempool?.txid).toBe('zz');
    });
});
