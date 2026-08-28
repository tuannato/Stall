import { fromHex, getStackArray } from 'ecash-lib';
import { describe, expect, it } from 'vitest';
import {
    MAX_DESCRIPTION_BYTES,
    STLD_HEX,
    decodeDescriptionPushes,
    descriptionBytes,
    encodeDescriptionHex,
    isStld,
} from './description';

const TOKEN = 'cd'.repeat(32);
const pushesOf = (hex: string): Uint8Array[] =>
    getStackArray(`6a${hex}`).map((p) => fromHex(p));

describe('published-description-is-readable-by-this-app', () => {
    /**
     * The failure §5 calls the worst one is a record that reads as never
     * published rather than as unreadable. So the encoder emits only what the
     * decoder accepts, and this proves the round trip rather than pinning a
     * hand-written vector beside the builder.
     */
    it('round-trips through the same pushes a wallet would broadcast', () => {
        const text = 'Single-origin, roasted weekly.';
        const hex = encodeDescriptionHex(TOKEN, text);
        expect(hex).toBeDefined();
        expect(hex!.startsWith(`04${STLD_HEX}`), 'lokad is the first push').toBe(true);
        expect(decodeDescriptionPushes(pushesOf(hex!))).toEqual({ tokenId: TOKEN, text });
    });

    it('round-trips a description that needs OP_PUSHDATA1', () => {
        // Over 75 bytes, which is where the push encoder used to corrupt the
        // output — and a description is the first payload here long enough.
        const text = 'A'.repeat(160);
        const hex = encodeDescriptionHex(TOKEN, text)!;
        expect(decodeDescriptionPushes(pushesOf(hex))?.text).toBe(text);
    });

    it('round-trips multi-byte text at the byte cap', () => {
        // The cap is bytes, not characters: each of these costs three, so a
        // promise of "180 characters" would be a promise the wire cannot keep.
        const text = 'ậu'.repeat(MAX_DESCRIPTION_BYTES / 4);
        expect(descriptionBytes(text)).toBe(MAX_DESCRIPTION_BYTES);
        const hex = encodeDescriptionHex(TOKEN, text)!;
        expect(decodeDescriptionPushes(pushesOf(hex))?.text).toBe(text);
        expect(encodeDescriptionHex(TOKEN, `${text}a`)).toBeUndefined();
    });
});

describe('a-description-record-is-refused-rather-than-guessed', () => {
    it('refuses what it cannot represent', () => {
        expect(encodeDescriptionHex(TOKEN, '')).toBeUndefined();
        expect(encodeDescriptionHex(TOKEN, '   ')).toBeUndefined();
        expect(encodeDescriptionHex('not-a-token', 'x')).toBeUndefined();
        // Upper case is not the form a token id takes anywhere else here.
        expect(encodeDescriptionHex(TOKEN.toUpperCase(), 'x')).toBeUndefined();
        expect(
            encodeDescriptionHex(TOKEN, 'A'.repeat(MAX_DESCRIPTION_BYTES + 1)),
        ).toBeUndefined();
    });

    it('refuses control characters, which can hide the rest of a sentence', () => {
        for (const [label, bad] of [
            ['null', 'a\u0000b'],
            ['newline', 'line\nbreak'],
            ['tab', 'tab\therenow'],
            ['line separator', 'sep\u2028here'],
            ['delete', 'del\u007fhere'],
        ] as const) {
            expect(encodeDescriptionHex(TOKEN, bad), label).toBeUndefined();
        }
    });

    it('is undefined for a record that is not STLD or is malformed', () => {
        const enc = new TextEncoder();
        expect(isStld([enc.encode('STL1')])).toBe(false);
        expect(decodeDescriptionPushes([])).toBeUndefined();
        expect(decodeDescriptionPushes([enc.encode('STLD')])).toBeUndefined();
        // A short token id is not a token id.
        expect(
            decodeDescriptionPushes([
                enc.encode('STLD'),
                new Uint8Array(31),
                enc.encode('x'),
            ]),
        ).toBeUndefined();
        // Invalid utf-8 is a record we cannot read, never one rendered as
        // replacement characters and attributed to a seller.
        expect(
            decodeDescriptionPushes([
                enc.encode('STLD'),
                new Uint8Array(32),
                Uint8Array.from([0xff, 0xfe]),
            ]),
        ).toBeUndefined();
    });

    it('keeps the STL1 lokad distinct so one reader cannot take the other', () => {
        expect(STLD_HEX).not.toBe('53544c31');
        expect(STLD_HEX).toHaveLength(8);
    });
});
