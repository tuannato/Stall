import { fromHex, getStackArray } from 'ecash-lib';
import { describe, expect, it } from 'vitest';
import {
    MAX_DESCRIPTION_BYTES,
    STLD_HEX,
    decodeDescriptionPushes,
    descriptionBytes,
    encodeDescriptionHex,
    encodeRemovalHex,
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
        expect(decodeDescriptionPushes(pushesOf(hex!))).toEqual({ kind: 'text', tokenId: TOKEN, text });
    });

    it('round-trips a description that needs OP_PUSHDATA1', () => {
        // Over 75 bytes, which is where the push encoder used to corrupt the
        // output — and a description is the first payload here long enough.
        const text = 'A'.repeat(160);
        const hex = encodeDescriptionHex(TOKEN, text)!;
        const back = decodeDescriptionPushes(pushesOf(hex));
        expect(back?.kind).toBe('text');
        expect(back?.kind === 'text' ? back.text : undefined).toBe(text);
    });

    it('round-trips multi-byte text at the byte cap', () => {
        // The cap is bytes, not characters: each of these costs three, so a
        // promise of "180 characters" would be a promise the wire cannot keep.
        const text = 'ậu'.repeat(MAX_DESCRIPTION_BYTES / 4);
        expect(descriptionBytes(text)).toBe(MAX_DESCRIPTION_BYTES);
        const hex = encodeDescriptionHex(TOKEN, text)!;
        const back = decodeDescriptionPushes(pushesOf(hex));
        expect(back?.kind).toBe('text');
        expect(back?.kind === 'text' ? back.text : undefined).toBe(text);
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

describe('empty-description-is-a-tombstone-not-unreadable', () => {
    /**
     * A record says one of two things: here are the words, or take them away.
     * They must never collapse. A tombstone is the seller's instruction and
     * wins, erasing an older record; a record we could not read is our failure
     * and must not win, or one undecodable byte would silently delete what a
     * seller published — §4's empty/unreachable mistake, moved to the wire.
     */
    it('reads an empty third push as a removal', () => {
        const hex = encodeRemovalHex(TOKEN);
        expect(hex).toBeDefined();
        const back = decodeDescriptionPushes(pushesOf(hex!));
        expect(back).toEqual({ kind: 'tombstone', tokenId: TOKEN });
    });

    it('tombstone-push-is-pushdata1-not-op-zero', () => {
        // Opcode 0x00 is refused by `opReturnPushes`, which would make the whole
        // record unreadable — so a removal would read as never published, §5's
        // worse failure. `4c00` is the form that survives the round trip.
        const hex = encodeRemovalHex(TOKEN)!;
        expect(hex.endsWith('4c00'), `got ${hex.slice(-6)}`).toBe(true);
        expect(hex.endsWith('00' + '00')).toBe(false);
    });

    it('never lets a removal be written as if it were text', () => {
        expect(encodeDescriptionHex(TOKEN, '')).toBeUndefined();
        expect(encodeDescriptionHex(TOKEN, '   ')).toBeUndefined();
        expect(encodeRemovalHex('not-a-token')).toBeUndefined();
    });
});

describe('description-refuses-bidi-and-invisible-formatting', () => {
    /**
     * The first attacker-chosen free text on the paint path since the stall
     * name, so §6's structural defence — "the chain supplies a row, never
     * bytes" — stops covering it here. Enforced in the decoder because this
     * runner cannot lay anything out, and because tightening it once records
     * exist would make published ones unreadable.
     */
    it('refuses characters that reorder or hide what is written', () => {
        for (const [label, ch] of [
            ['right-to-left override', '\u202e'],
            ['left-to-right override', '\u202d'],
            ['first strong isolate', '\u2068'],
            ['pop isolate', '\u2069'],
            ['left-to-right mark', '\u200e'],
            ['arabic letter mark', '\u061c'],
            ['zero width space', '\u200b'],
            ['zero width joiner', '\u200d'],
            ['soft hyphen', '\u00ad'],
            ['byte order mark', '\ufeff'],
        ] as const) {
            expect(encodeDescriptionHex(TOKEN, `price${ch}low`), label).toBeUndefined();
        }
    });

    it('refuses a stack of combining marks that would grow out of its line', () => {
        // 180 bytes of these overlap the row beside them — chain-supplied bytes
        // over the asked amount, which is the one thing §6 forbids.
        expect(encodeDescriptionHex(TOKEN, `a${'\u0300'.repeat(5)}`)).toBeUndefined();
        // Real language keeps its marks: Vietnamese decomposes to two.
        expect(encodeDescriptionHex(TOKEN, 'Ca\u0300 phê ngon')).toBeDefined();
        expect(encodeDescriptionHex(TOKEN, 'Cà phê rang mộc')).toBeDefined();
    });
});
