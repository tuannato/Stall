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

describe('prefers-higher-block-then-txid', () => {
    it('orders by block, then by txid, with no position term', () => {
        const winner = pickManifestWinner([
            { height: 10, txid: 'bb' },
            { height: 11, txid: 'aa' },
            { height: 11, txid: 'cc' },
        ]);
        expect(winner?.txid).toBe('cc');
    });
});

describe('unconfirmed-manifest-is-not-a-winner', () => {
    /**
     * Two browsers on different nodes see different mempools. An unconfirmed
     * record that could win would mean one printed link renders two different
     * stalls, which is the failure this ordering exists to prevent.
     */
    it('never lets an unconfirmed record decide the stall', () => {
        const mined = pickManifestWinner([
            { height: 11, txid: 'aa' },
            { height: undefined, txid: 'zz' },
        ]);
        expect(mined?.txid).toBe('aa');

        // Published but not yet mined: the stall keeps its previous look
        // rather than picking one node's view of the mempool.
        expect(pickManifestWinner([{ height: undefined, txid: 'zz' }])).toBeUndefined();
    });
});
