import { fromHex, getStackArray } from 'ecash-lib';
import { describe, expect, it } from 'vitest';
import {
    MAX_MEMO_ITEMS,
    MAX_QUANTITY_BYTES,
    MEMO_PREFIX_BYTES,
    MULTI_MARKER,
    PAYMENT_REQUIRED_PUSHES,
    QUANTITY_TAG,
    STLP_HEX,
    decodePaymentPushes,
    encodeMultiPaymentMemoHex,
    encodePaymentMemoHex,
    isStlp,
} from './payment';
import { OP_RETURN_BUDGET } from './manifest';

const TOKEN = 'cd'.repeat(32);
const pushesOf = (hex: string): Uint8Array[] =>
    getStackArray(`6a${hex}`).map((p) => fromHex(p));

/** One push, direct form — every payload here is far under 75 bytes. */
const push = (bytes: readonly number[]): Uint8Array =>
    Uint8Array.from([bytes.length, ...bytes]);


const lokad = (): Uint8Array => push([...'STLP'].map((c) => c.charCodeAt(0)));
const idPush = (): Uint8Array =>
    push([...Array.from({ length: 32 }, () => 0xcd)]);

/** Assemble a record from raw pushes, so a malformed field can be posted. */
function rawPushes(parts: readonly Uint8Array[]): Uint8Array[] {
    let hex = '';
    for (const part of parts) {
        for (const byte of part) {
            hex += byte.toString(16).padStart(2, '0');
        }
    }
    return pushesOf(hex);
}

describe('stlp-required-pushes-are-two', () => {
    /**
     * Its own count, and not `STL1`'s three: the memo carries a lokad and a
     * token id, and everything else is a tagged field. A shared constant would
     * make a payment with no quantity read as a short record.
     */
    it('takes the lokad and the token id and nothing else', () => {
        expect(PAYMENT_REQUIRED_PUSHES).toBe(2);
        const hex = encodePaymentMemoHex(TOKEN, 1n);
        expect(hex).toBeDefined();
        expect(hex!.startsWith(`04${STLP_HEX}`), 'lokad is the first push').toBe(true);
        // One at quantity 1 writes no field: absent already means one.
        expect(pushesOf(hex!)).toHaveLength(PAYMENT_REQUIRED_PUSHES);
        expect(decodePaymentPushes(pushesOf(hex!))).toEqual({
            kind: 'item',
            tokenId: TOKEN,
            quantity: 1n,
        });
    });

    it('refuses a record with fewer pushes than that', () => {
        expect(decodePaymentPushes(rawPushes([lokad()]))).toBeUndefined();
        expect(isStlp(rawPushes([lokad()]))).toBe(true);
    });
});

describe('a-quantity-is-minimal-big-endian', () => {
    /**
     * Canonical or nothing. Two encodings of the same number are two records
     * that say the same thing, and a reader that accepted both would let a
     * payer choose which one a future index groups them under.
     */
    it('round-trips a quantity through the minimal form', () => {
        for (const quantity of [1n, 2n, 255n, 256n, 65_535n, 2n ** 63n]) {
            const hex = encodePaymentMemoHex(TOKEN, quantity);
            expect(hex, String(quantity)).toBeDefined();
            expect(decodePaymentPushes(pushesOf(hex!)), String(quantity)).toEqual({
                kind: 'item',
                tokenId: TOKEN,
                quantity,
            });
        }
    });

    it('writes the shortest byte string that holds the number', () => {
        // 256 is two bytes, 255 is one. A fixed width would spend eight on
        // every memo for a number almost always equal to one.
        // Push length, tag, payload: `02 01 ff` against `03 01 01 00`.
        expect(encodePaymentMemoHex(TOKEN, 255n)!.endsWith('0201ff')).toBe(true);
        expect(encodePaymentMemoHex(TOKEN, 256n)!.endsWith('03010100')).toBe(true);
    });

    it('voids the field on a non-minimal, zero, empty or oversized payload', () => {
        const cases: Record<string, Uint8Array> = {
            'leading zero': push([QUANTITY_TAG, 0x00, 0x01]),
            zero: push([QUANTITY_TAG, 0x00]),
            empty: push([QUANTITY_TAG]),
            'nine bytes': push([QUANTITY_TAG, ...Array(MAX_QUANTITY_BYTES + 1).fill(0x01)]),
        };
        for (const [label, field] of Object.entries(cases)) {
            const back = decodePaymentPushes(rawPushes([lokad(), idPush(), field]));
            // The record still reads — a malformed field voids itself alone —
            // and the quantity is **not stated**, never silently one.
            expect(back, label).toEqual({ kind: 'item', tokenId: TOKEN });
        }
    });

    it('refuses to write a quantity it could not read back', () => {
        expect(encodePaymentMemoHex(TOKEN, 0n)).toBeUndefined();
        expect(encodePaymentMemoHex(TOKEN, -1n)).toBeUndefined();
        expect(encodePaymentMemoHex(TOKEN, 2n ** 64n)).toBeUndefined();
        expect(encodePaymentMemoHex('not-a-token-id', 1n)).toBeUndefined();
    });
});

describe('a-memo-is-a-claim-not-a-receipt', () => {
    /**
     * Every byte of it is written by whoever paid. Nothing here verifies
     * authorship, nothing cross-checks the amount, and the record carries no
     * figure at all — the sats that arrived are the only fact, and the memo is
     * what the payer says they were for.
     */
    it('carries no amount, no rate and no currency', () => {
        const hex = encodePaymentMemoHex(TOKEN, 3n)!;
        const pushes = pushesOf(hex);
        // Lokad, token id, quantity. A fourth push would be a field this
        // freeze does not have.
        expect(pushes).toHaveLength(3);
        expect(pushes[2]![0]).toBe(QUANTITY_TAG);
        expect(pushes[2]!.length, 'the tag and one minimal byte').toBe(2);
    });

    it('reads a stranger’s memo the same way it reads its own', () => {
        // Unknown tags are skipped, as in every record this app reads, so a
        // future field cannot make an old memo unreadable.
        const stranger = push([0x7f, 0xde, 0xad]);
        const back = decodePaymentPushes(
            rawPushes([lokad(), idPush(), stranger, push([QUANTITY_TAG, 0x02])]),
        );
        expect(back).toEqual({ kind: 'item', tokenId: TOKEN, quantity: 2n });
    });

    it('is not a record when the id is not 32 bytes', () => {
        expect(
            decodePaymentPushes(rawPushes([lokad(), push([0x01, 0x02]), push([QUANTITY_TAG, 0x01])])),
        ).toBeUndefined();
    });
});

describe('a-multi-item-memo-is-a-second-shape-an-old-reader-refuses', () => {
    const idOf = (i: number): string => (0x10 + i).toString(16).repeat(32);
    const items = (n: number, quantity = 1n): { tokenId: string; quantity: bigint }[] =>
        Array.from({ length: n }, (_, i) => ({ tokenId: idOf(i), quantity }));
    const prefixOf = (id: string): string => id.slice(0, MEMO_PREFIX_BYTES * 2);
    /** The hex, or `undefined` — the tests that care about the reason read it. */
    const hexOf = (
        out: { readonly hex: string } | { readonly why: string },
    ): string | undefined => ('hex' in out ? out.hex : undefined);

    /**
     * The whole compatibility story, asserted as the predicate every
     * un-updated build applies rather than as a comment: `decodePaymentPushes`
     * has always required push 1 to be exactly 32 bytes, so a one-byte marker
     * is refused outright and an old reader makes NO claim — it does not read
     * a garbage token id as a single item. The marker is its own push for
     * exactly this: inline, an ordinary basket lands the list on 32 bytes.
     */
    const oldReader = (pushes: Uint8Array[]): boolean =>
        pushes.length >= 2 && isStlp(pushes) && pushes[1]!.length === 32;

    it('writes a marker push an old reader refuses, at every list size', () => {
        for (const n of [2, 3, 5, 12, MAX_MEMO_ITEMS]) {
            const hex = hexOf(encodeMultiPaymentMemoHex(items(n)));
            expect(hex, String(n)).toBeDefined();
            const pushes = pushesOf(hex!);
            expect(pushes, String(n)).toHaveLength(3);
            expect(pushes[1], String(n)).toEqual(Uint8Array.from([MULTI_MARKER]));
            expect(oldReader(pushes), String(n)).toBe(false);
            const back = decodePaymentPushes(pushes);
            expect(back?.kind, String(n)).toBe('items');
            expect(back?.kind === 'items' && back.items.length, String(n)).toBe(n);
        }
    });

    it('round-trips the prefixes and the counts in the order they were written', () => {
        const written = [
            { tokenId: idOf(2), quantity: 1n },
            { tokenId: idOf(0), quantity: 300n },
            { tokenId: idOf(1), quantity: 2n ** 63n },
        ];
        const back = decodePaymentPushes(pushesOf(hexOf(encodeMultiPaymentMemoHex(written))!));
        expect(back).toEqual({
            kind: 'items',
            items: written.map((w) => ({ prefix: prefixOf(w.tokenId), quantity: w.quantity })),
        });
        // Order is the buyer's own and never canonicalised: two orders are
        // two records, and both read back as what they say.
        const other = decodePaymentPushes(
            pushesOf(hexOf(encodeMultiPaymentMemoHex([...written].reverse()))!),
        );
        expect(other?.kind === 'items' && other.items[0]!.prefix).toBe(prefixOf(idOf(1)));
    });

    /**
     * The reason rides the answer, so a caller never re-derives it from the
     * same entries: "too many items" names a cause and the encoder refuses
     * for more than one.
     */
    it('composes nothing for one item, and says which refusal each one is', () => {
        expect(encodeMultiPaymentMemoHex(items(1))).toEqual({ why: 'one-item' });
        expect(encodeMultiPaymentMemoHex([])).toEqual({ why: 'one-item' });
        expect(encodeMultiPaymentMemoHex(items(MAX_MEMO_ITEMS + 1))).toEqual({ why: 'too-big' });
        expect(encodeMultiPaymentMemoHex(items(MAX_MEMO_ITEMS, 300n))).toEqual({ why: 'too-big' });
        const twin = `${idOf(3).slice(0, MEMO_PREFIX_BYTES * 2)}${'ab'.repeat(28)}`;
        expect(
            encodeMultiPaymentMemoHex([
                { tokenId: idOf(3), quantity: 1n },
                { tokenId: twin, quantity: 2n },
            ]),
        ).toEqual({ why: 'prefix-clash' });
        expect(
            encodeMultiPaymentMemoHex([
                { tokenId: idOf(0), quantity: 1n },
                { tokenId: 'nothex', quantity: 1n },
            ]),
        ).toEqual({ why: 'malformed' });
        expect(
            encodeMultiPaymentMemoHex([
                { tokenId: idOf(0), quantity: 1n },
                { tokenId: idOf(1), quantity: 0n },
            ]),
        ).toEqual({ why: 'malformed' });
    });

    it('is capped by the budget, and the item count is only a floor', () => {
        const full = hexOf(encodeMultiPaymentMemoHex(items(MAX_MEMO_ITEMS)));
        expect(full).toBeDefined();
        expect(full!.length / 2).toBeLessThanOrEqual(OP_RETURN_BUDGET);
        // An entry grows with its own count, so a full list of two-byte
        // counts is over 222 — the byte check is the authority.
        expect(hexOf(encodeMultiPaymentMemoHex(items(30, 300n)))).toBeDefined();
        expect(hexOf(encodeMultiPaymentMemoHex(items(16, 2n ** 63n)))).toBeDefined();
        expect(hexOf(encodeMultiPaymentMemoHex(items(20, 2n ** 63n)))).toBeUndefined();
    });

    it('refuses a duplicate prefix, on the way out and on the way in', () => {
        const same = idOf(3).slice(0, MEMO_PREFIX_BYTES * 2) + 'ab'.repeat(28);
        expect(
            hexOf(
                encodeMultiPaymentMemoHex([
                    { tokenId: idOf(3), quantity: 1n },
                    { tokenId: same, quantity: 2n },
                ]),
            ),
        ).toBeUndefined();
        const entry = (prefix: readonly number[], q: number): number[] => [...prefix, 1, q];
        expect(
            decodePaymentPushes(
                rawPushes([
                    lokad(),
                    push([MULTI_MARKER]),
                    push([...entry([1, 2, 3, 4], 1), ...entry([1, 2, 3, 4], 2)]),
                ]),
            ),
        ).toBeUndefined();
    });

    /**
     * Half a list beside an amount somebody paid is worse than no list: a
     * record that is not exactly consumed by whole entries is not a shorter
     * claim, it is one this reader cannot read.
     */
    it('voids the memo on an empty, ragged or malformed list', () => {
        const ok = [1, 2, 3, 4, 1, 7];
        const cases: [string, number[]][] = [
            ['empty', []],
            ['trailing byte', [...ok, 0x00]],
            ['short entry', [1, 2, 3, 4, 1]],
            ['zero width', [1, 2, 3, 4, 0]],
            ['width past eight', [1, 2, 3, 4, MAX_QUANTITY_BYTES + 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]],
            ['leading zero', [1, 2, 3, 4, 2, 0x00, 0x07]],
            ['zero quantity', [1, 2, 3, 4, 1, 0x00]],
            ['width runs off the end', [1, 2, 3, 4, 4, 1, 2]],
        ];
        for (const [label, list] of cases) {
            expect(
                decodePaymentPushes(rawPushes([lokad(), push([MULTI_MARKER]), push(list)])),
                label,
            ).toBeUndefined();
        }
        // The marker with no list at all is not a memo either.
        expect(decodePaymentPushes(rawPushes([lokad(), push([MULTI_MARKER])]))).toBeUndefined();
        /*
         * The reader's own cap, which is not the encoder's: a record on chain
         * must not become unreadable when a UI ceiling moves. It is defence
         * in depth — a 36-entry record is 226 bytes of OP_RETURN and the
         * chain's own 223-byte rule refuses it before any reader sees it
         * (`getStackArray` throws on exactly that, which is why this case is
         * built as a push array rather than through `pushesOf`).
         */
        const listOf = (n: number): Uint8Array => {
            const bytes: number[] = [];
            for (let i = 0; i < n; i += 1) {
                bytes.push(0, 0, (i >> 8) & 0xff, i & 0xff, 1, 1);
            }
            return Uint8Array.from(bytes);
        };
        const marker = Uint8Array.from([MULTI_MARKER]);
        const lokadBytes = Uint8Array.from('STLP', (c) => c.charCodeAt(0));
        expect(
            decodePaymentPushes([lokadBytes, marker, listOf(MAX_MEMO_ITEMS + 1)]),
        ).toBeUndefined();
        const ok35 = decodePaymentPushes([lokadBytes, marker, listOf(MAX_MEMO_ITEMS)]);
        expect(ok35?.kind === 'items' && ok35.items.length).toBe(MAX_MEMO_ITEMS);
        // A marker byte that is not the marker is not this shape.
        expect(
            decodePaymentPushes(rawPushes([lokad(), push([0x02]), push(ok)])),
        ).toBeUndefined();
    });

    /**
     * `STL1`'s rule, settled here before the first record exists: a reader
     * skips what it does not know rather than refusing the record, or the
     * day a field is added every memo already on chain becomes unreadable.
     */
    it('ignores pushes after the list rather than refusing the record', () => {
        const back = decodePaymentPushes(
            rawPushes([
                lokad(),
                push([MULTI_MARKER]),
                push([1, 2, 3, 4, 1, 9]),
                push([0x7f, 0xaa, 0xbb]),
            ]),
        );
        expect(back?.kind).toBe('items');
        expect(back?.kind === 'items' && back.items).toEqual([
            { prefix: '01020304', quantity: 9n },
        ]);
    });

    it('reads a one-entry list, because a reader is not the spec for other writers', () => {
        const back = decodePaymentPushes(
            rawPushes([lokad(), push([MULTI_MARKER]), push([1, 2, 3, 4, 1, 1])]),
        );
        expect(back).toEqual({ kind: 'items', items: [{ prefix: '01020304', quantity: 1n }] });
    });
});
