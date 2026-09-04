import { fromHex, getStackArray } from 'ecash-lib';
import { describe, expect, it } from 'vitest';
import {
    MAX_QUANTITY_BYTES,
    PAYMENT_REQUIRED_PUSHES,
    QUANTITY_TAG,
    STLP_HEX,
    decodePaymentPushes,
    encodePaymentMemoHex,
    isStlp,
} from './payment';

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
            expect(back, label).toEqual({ tokenId: TOKEN });
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
        expect(back).toEqual({ tokenId: TOKEN, quantity: 2n });
    });

    it('is not a record when the id is not 32 bytes', () => {
        expect(
            decodePaymentPushes(rawPushes([lokad(), push([0x01, 0x02]), push([QUANTITY_TAG, 0x01])])),
        ).toBeUndefined();
    });
});
