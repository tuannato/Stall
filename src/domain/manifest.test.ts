import { describe, expect, it } from 'vitest';
import { decodeManifestPushes, pickManifestWinner, STL1_ASCII } from './manifest';
import { DEFAULT_THEME_ID } from './theme';

function lokad(): Uint8Array {
    return Uint8Array.from(STL1_ASCII, (c) => c.charCodeAt(0));
}

function pushes(name: string, theme = new Uint8Array([DEFAULT_THEME_ID])): Uint8Array[] {
    return [lokad(), new TextEncoder().encode(name), theme];
}

function expectSameExtras(
    a: ReadonlyMap<number, Uint8Array>,
    b: ReadonlyMap<number, Uint8Array>,
): void {
    expect(a.size).toBe(b.size);
    for (const [tag, payload] of a) {
        expect(b.get(tag)).toEqual(payload);
    }
}

describe('decodeManifestPushes', () => {
    it('reads name + one-byte theme id', () => {
        // Built without `pushes()` so a swapped name/theme in the helper and
        // the decoder cannot stay green together.
        const m = decodeManifestPushes([
            lokad(),
            new TextEncoder().encode("Nato's Corner"),
            new Uint8Array([0xfe]),
        ]);
        expect(m.name).toBe("Nato's Corner");
        expect(m.theme.id).toBe(0xfe);
        expect(m.extras.size).toBe(0);
    });

    it('rejects missing pushes and a theme that is not one byte', () => {
        expect(() => decodeManifestPushes(pushes('x').slice(0, 2))).toThrow(/3 pushes/);
        const shortTheme = pushes('x');
        shortTheme[2] = new Uint8Array(0);
        expect(() => decodeManifestPushes(shortTheme)).toThrow(/theme id is not one byte/);
    });

    it('keeps an extra push instead of rejecting the record', () => {
        // The name this assertion used to carry said "rejects extra ... pushes".
        // Inverting the behaviour without inverting the name would have left a
        // sentence that reads as the opposite of what it guards.
        const extra = [...pushes('x', new Uint8Array([0xfe])), new Uint8Array([1])];
        const kept = decodeManifestPushes(extra);
        expect(kept.name).toBe('x');
        expect(kept.theme.id).toBe(0xfe);
        expect(kept.extras.get(1)).toEqual(new Uint8Array(0));
        expect(kept.extras.size).toBe(1);
    });
});

describe('theme-id-is-one-byte', () => {
    /**
     * The old wire pushed 28 bytes. Taking bytes[0] as the id and dropping the
     * tail would paint a look nobody chose — 0x01 is the only shipped row, so
     * that silent decode would even look selected.
     */
    it('a 28-byte theme push is unreadable, not the first byte as an id', () => {
        const oldWire = new Uint8Array(28);
        oldWire[0] = 0x01;
        expect(() => decodeManifestPushes(pushes("Nato's Corner", oldWire))).toThrow(
            /theme id is not one byte/,
        );
    });
});

describe('extra-pushes-are-tagged-not-positional', () => {
    const tagA = 0x0a;
    const payloadA = new Uint8Array([0x11, 0x22]);
    const tagB = 0x0b;
    const payloadB = new Uint8Array([0x33]);
    const extraA = new Uint8Array([tagA, ...payloadA]);
    const extraB = new Uint8Array([tagB, ...payloadB]);
    const id = new Uint8Array([0xfe]);

    it('two extra pushes in either order give the same extras map', () => {
        const forward = decodeManifestPushes([...pushes('Nato', id), extraA, extraB]);
        const reverse = decodeManifestPushes([...pushes('Nato', id), extraB, extraA]);
        expect(forward.extras.get(tagA)).toEqual(payloadA);
        expect(forward.extras.get(tagB)).toEqual(payloadB);
        expect(forward.extras.size).toBe(2);
        expectSameExtras(forward.extras, reverse.extras);
    });

    it('an extra push with no bytes carries no tag and is skipped', () => {
        const empty = new Uint8Array(0);
        const skipped = decodeManifestPushes([...pushes('Nato', id), empty, extraA]);
        expect(skipped.extras.has(0)).toBe(false);
        expect(skipped.extras.get(tagA)).toEqual(payloadA);
        expect(skipped.extras.size).toBe(1);

        const tagZero = new Uint8Array([0, 0xaa]);
        const kept = decodeManifestPushes([...pushes('Nato', id), empty, tagZero]);
        expect(kept.extras.get(0)).toEqual(new Uint8Array([0xaa]));
        expect(kept.extras.size).toBe(1);
    });

    it('a tag appearing twice keeps the first', () => {
        const first = new Uint8Array([tagA, 0x01]);
        const second = new Uint8Array([tagA, 0x02]);
        const dup = decodeManifestPushes([...pushes('Nato', id), first, second]);
        expect(dup.extras.get(tagA)).toEqual(new Uint8Array([0x01]));
        expect(dup.extras.size).toBe(1);
    });

    it('an unknown tag never changes name or theme', () => {
        const unknown = new Uint8Array([0x99, 0x01, 0x02]);
        const named = decodeManifestPushes([...pushes("Nato's Corner", id), unknown]);
        expect(named.name).toBe("Nato's Corner");
        expect(named.theme.id).toBe(0xfe);
        expect(named.extras.get(0x99)).toEqual(new Uint8Array([0x01, 0x02]));
    });
});

describe('prefers-higher-block-then-txid', () => {
    it('orders by block, then by txid, with no position term', () => {
        const winner = pickManifestWinner([
            { height: 10, isFinal: true, txid: 'bb' },
            { height: 11, isFinal: true, txid: 'aa' },
            { height: 11, isFinal: true, txid: 'cc' },
        ]);
        expect(winner?.txid).toBe('cc');
    });
});

describe('finalized-unmined-beats-mined', () => {
    /**
     * A record avalanche has finalized is newer than anything already in a
     * block, so it outranks every height rather than waiting for one. Mining is
     * the weaker signal: chronik reports a block being disconnected or
     * invalidated when avalanche has not finalized it.
     */
    it('lets a finalized record with no block win over a mined one', () => {
        const winner = pickManifestWinner([
            { height: 900000, isFinal: true, txid: 'aa' },
            { height: undefined, isFinal: true, txid: 'bb' },
        ]);
        expect(winner?.txid).toBe('bb');
    });

    it('breaks a tie between two finalized unmined records on txid', () => {
        const winner = pickManifestWinner([
            { height: undefined, isFinal: true, txid: 'bb' },
            { height: undefined, isFinal: true, txid: 'cc' },
            { height: undefined, isFinal: true, txid: 'aa' },
        ]);
        expect(winner?.txid).toBe('cc');
    });
});

describe('unconfirmed-manifest-is-not-a-winner', () => {
    /**
     * Unfinalized and unmined is one node's opinion. Two browsers reading
     * different nodes see different mempools, so letting that decide is how one
     * link renders two stalls. Finality is what lifted the wait, not impatience.
     */
    it('never lets an unfinalized unconfirmed record decide the stall', () => {
        expect(
            pickManifestWinner([{ height: undefined, isFinal: false, txid: 'aa' }]),
        ).toBeUndefined();
        const winner = pickManifestWinner([
            { height: 5, isFinal: true, txid: 'aa' },
            { height: undefined, isFinal: false, txid: 'zz' },
        ]);
        expect(winner?.txid).toBe('aa');
    });
});
