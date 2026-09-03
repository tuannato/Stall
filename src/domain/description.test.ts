import { fromHex, getStackArray } from 'ecash-lib';
import { describe, expect, it } from 'vitest';
import {
    MAX_DESCRIPTION_BYTES,
    MAX_PRICED_DESCRIPTION_BYTES,
    MAX_PRICED_SHELVED_DESCRIPTION_BYTES,
    MAX_SHELF_BYTES,
    PRICE_FIELD_BYTES,
    PRICE_TAG,
    STLD_HEX,
    XEC_PRICE_CODE,
    decodeDescriptionPushes,
    descriptionBytes,
    descriptionRecordBytes,
    encodeDescriptionHex,
    encodeRemovalHex,
    formatPriceFigure,
    isStld,
    parsePriceFigure,
    type TokenPrice,
} from './description';
import { OP_RETURN_BUDGET } from './manifest';

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

describe('a-shelf-rides-the-record-as-a-tagged-field', () => {
    /**
     * STLD tag 0x01 (P9): the seller's own heading over this token's card.
     * The same tag grammar as STL1's — first byte is the tag, empty pushes
     * skipped, first tag wins, unknown tags ignored — and the same screen as
     * the description text: a heading is a better place to hide a character
     * than a sentence, not a worse one.
     */
    it('round-trips a shelf beside the text and alone on a tombstone', () => {
        const withText = encodeDescriptionHex(TOKEN, 'Roasted weekly.', {
            shelf: 'Coffee',
        })!;
        expect(decodeDescriptionPushes(pushesOf(withText))).toEqual({
            kind: 'text',
            tokenId: TOKEN,
            text: 'Roasted weekly.',
            shelf: 'Coffee',
        });
        // "No words, shelved" is one record: the tombstone shape plus the
        // tag, because one record is the whole truth about one token.
        const shelfOnly = encodeDescriptionHex(TOKEN, '', { shelf: 'Kệ trà' })!;
        expect(decodeDescriptionPushes(pushesOf(shelfOnly))).toEqual({
            kind: 'tombstone',
            tokenId: TOKEN,
            shelf: 'Kệ trà',
        });
        // Empty text with no shelf stays a refusal here: a removal is an
        // instruction and keeps its own encoder.
        expect(encodeDescriptionHex(TOKEN, '')).toBeUndefined();
        expect(encodeDescriptionHex(TOKEN, '', { shelf: '' })).toBeUndefined();
    });

    it('a-malformed-shelf-voids-the-field-alone-never-the-record', () => {
        const base = pushesOf(encodeDescriptionHex(TOKEN, 'Fine words.')!);
        const tagged = (payload: Uint8Array): Uint8Array => {
            const out = new Uint8Array(1 + payload.length);
            out[0] = 0x01;
            out.set(payload, 1);
            return out;
        };
        // A bidi override under the known tag: the text still reads.
        const bidi = decodeDescriptionPushes([
            ...base,
            tagged(new TextEncoder().encode('K‮')),
        ]);
        expect(bidi?.kind).toBe('text');
        expect(bidi?.shelf).toBeUndefined();
        // Over the byte cap: same outcome.
        const long = decodeDescriptionPushes([
            ...base,
            tagged(new TextEncoder().encode('S'.repeat(33))),
        ]);
        expect(long?.shelf).toBeUndefined();
        // An unknown tag is somebody else's field, not a reason to refuse.
        const unknown = decodeDescriptionPushes([
            ...base,
            new Uint8Array([0x77, 0x01]),
        ]);
        expect(unknown?.kind).toBe('text');
        // A repeated shelf tag keeps the first — last-wins would let a
        // trailing push silently overrule the one before it.
        const twice = decodeDescriptionPushes([
            ...base,
            tagged(new TextEncoder().encode('First')),
            tagged(new TextEncoder().encode('Second')),
        ]);
        expect(twice?.shelf).toBe('First');
    });

    it('tag-budget-is-enforced-across-the-record', () => {
        /**
         * The 222-byte ceiling is shared, so the caps trade off: at a full
         * 180-byte description no shelf fits at all, at 179 exactly one byte
         * of shelf lands the record on 222 exactly. Asserted at the boundary
         * so the headroom is a number, not a feeling.
         */
        const full = 'D'.repeat(MAX_DESCRIPTION_BYTES);
        expect(encodeDescriptionHex(TOKEN, full)).toBeDefined();
        expect(encodeDescriptionHex(TOKEN, full, { shelf: 'K' })).toBeUndefined();
        const exact = encodeDescriptionHex(TOKEN, 'D'.repeat(179), { shelf: 'K' });
        expect(exact).toBeDefined();
        expect(exact!.length / 2).toBe(222);
        const back = decodeDescriptionPushes(pushesOf(exact!));
        expect(back?.shelf).toBe('K');
    });

    it('counts the price against the same 222 bytes as the words', () => {
        /**
         * The price field is one push of thirteen bytes, so it costs fourteen
         * with its push byte. That moves the maxima the ladder copy names:
         * with a price the words go to 168 bytes, and with a full 32-byte
         * shelf as well to 134. Both land on 222 exactly, so the headroom is
         * a number rather than a feeling.
         */
        const price = { code: 'usd', exponent: 2, amount: 1250n } as const;
        const priced = encodeDescriptionHex(
            TOKEN,
            'D'.repeat(MAX_PRICED_DESCRIPTION_BYTES),
            { price },
        );
        expect(MAX_PRICED_DESCRIPTION_BYTES).toBe(168);
        expect(priced).toBeDefined();
        expect(priced!.length / 2).toBe(OP_RETURN_BUDGET);
        expect(
            encodeDescriptionHex(TOKEN, 'D'.repeat(MAX_PRICED_DESCRIPTION_BYTES + 1), {
                price,
            }),
        ).toBeUndefined();

        const shelf = 'S'.repeat(MAX_SHELF_BYTES);
        const both = encodeDescriptionHex(
            TOKEN,
            'D'.repeat(MAX_PRICED_SHELVED_DESCRIPTION_BYTES),
            { shelf, price },
        );
        expect(MAX_PRICED_SHELVED_DESCRIPTION_BYTES).toBe(134);
        expect(both).toBeDefined();
        expect(both!.length / 2).toBe(OP_RETURN_BUDGET);
        expect(
            encodeDescriptionHex(
                TOKEN,
                'D'.repeat(MAX_PRICED_SHELVED_DESCRIPTION_BYTES + 1),
                { shelf, price },
            ),
        ).toBeUndefined();
    });

    it('the meter and the refusal agree about a priced record', () => {
        // One meter, one arithmetic: a meter that read under the ceiling while
        // the encoder refused would send a seller looking for a bug in a wallet.
        const price = { code: 'usd', exponent: 2, amount: 1250n } as const;
        for (const [text, shelf] of [
            ['', ''],
            ['Roasted weekly.', ''],
            ['Roasted weekly.', 'Coffee'],
            ['D'.repeat(MAX_PRICED_DESCRIPTION_BYTES), ''],
            ['D'.repeat(MAX_PRICED_SHELVED_DESCRIPTION_BYTES), 'S'.repeat(MAX_SHELF_BYTES)],
        ] as const) {
            const counted = descriptionRecordBytes(text, shelf, price);
            const hex = encodeDescriptionHex(TOKEN, text, {
                shelf: shelf === '' ? undefined : shelf,
                price,
            });
            expect(hex, `${text.length}/${shelf.length}`).toBeDefined();
            expect(hex!.length / 2, `${text.length}/${shelf.length}`).toBe(counted);
            expect(counted).toBeLessThanOrEqual(OP_RETURN_BUDGET);
        }
        // And it counts the field only when there is one.
        expect(descriptionRecordBytes('abc', '', price) - descriptionRecordBytes('abc')).toBe(
            PRICE_FIELD_BYTES + 1,
        );
    });

    it('refuses a shelf the decoder would drop, so it never writes a dead field', () => {
        expect(
            encodeDescriptionHex(TOKEN, 'Fine.', { shelf: 'K‮' }),
        ).toBeUndefined();
        expect(
            encodeDescriptionHex(TOKEN, 'Fine.', { shelf: 'S'.repeat(33) }),
        ).toBeUndefined();
        expect(encodeDescriptionHex(TOKEN, 'Fine.', { shelf: '   ' })).toBeUndefined();
    });
});

describe('a-price-payload-is-exactly-13-bytes', () => {
    /**
     * STLD tag 0x02, frozen. The field is **one push of thirteen bytes**: the
     * tag, three ASCII letters of code, one exponent byte, then eight bytes of
     * unsigned big-endian amount. Twelve bytes of payload under the tag, which
     * is what `decodeTaggedExtras` hands the reader.
     *
     * Every part of that is load-bearing on a permanent wire, so each is
     * asserted rather than described: a shorter or longer push is not a price
     * this app can trust to mean anything, and reading one anyway would paint a
     * figure nobody signed.
     */
    const priced = (over: Partial<TokenPrice> = {}): TokenPrice => ({
        code: 'usd',
        exponent: 2,
        amount: 1250n,
        ...over,
    });

    const priceField = (hex: string): Uint8Array | undefined =>
        pushesOf(hex)
            .slice(3)
            .find((push) => push[0] === PRICE_TAG);

    it('writes thirteen bytes: tag, code, exponent, eight of amount', () => {
        const hex = encodeDescriptionHex(TOKEN, 'Roasted weekly.', { price: priced() })!;
        const field = priceField(hex)!;
        expect(field).toBeDefined();
        expect(field.length, 'the whole field is thirteen bytes').toBe(
            PRICE_FIELD_BYTES,
        );
        expect(PRICE_FIELD_BYTES).toBe(13);
        expect(field[0]).toBe(PRICE_TAG);
        expect(String.fromCharCode(field[1]!, field[2]!, field[3]!)).toBe('usd');
        expect(field[4], 'one exponent byte').toBe(2);
        // Big-endian, most significant first: 1250 = 0x04e2.
        expect([...field.slice(5)]).toEqual([0, 0, 0, 0, 0, 0, 0x04, 0xe2]);
    });

    it('round-trips the largest amount eight bytes can hold, as a bigint', () => {
        const max = (1n << 64n) - 1n;
        const hex = encodeDescriptionHex(TOKEN, 'x', { price: priced({ amount: max }) })!;
        const back = decodeDescriptionPushes(pushesOf(hex));
        expect(back?.price?.amount).toBe(max);
        expect(typeof back?.price?.amount, 'never a Number').toBe('bigint');
        // One over is not representable, so it is refused rather than wrapped.
        expect(
            encodeDescriptionHex(TOKEN, 'x', { price: priced({ amount: max + 1n }) }),
        ).toBeUndefined();
    });

    it('voids the field alone when the push is not thirteen bytes', () => {
        const base = pushesOf(encodeDescriptionHex(TOKEN, 'Fine words.')!);
        const field = priceField(
            encodeDescriptionHex(TOKEN, 'Fine words.', { price: priced() })!,
        )!;
        for (const [label, bad] of [
            ['one byte short', field.slice(0, PRICE_FIELD_BYTES - 1)],
            ['one byte long', new Uint8Array([...field, 0])],
            ['tag alone', field.slice(0, 1)],
        ] as const) {
            const back = decodeDescriptionPushes([...base, bad]);
            expect(back?.kind, label).toBe('text');
            expect(back?.price, label).toBeUndefined();
        }
    });

    it('voids the field for an exponent above eight or a code that is not letters', () => {
        const base = pushesOf(encodeDescriptionHex(TOKEN, 'Fine words.')!);
        const field = priceField(
            encodeDescriptionHex(TOKEN, 'Fine words.', { price: priced() })!,
        )!;
        const withByte = (index: number, value: number): Uint8Array => {
            const out = Uint8Array.from(field);
            out[index] = value;
            return out;
        };
        // The exponent bounds the fractional digits a reader will print, so a
        // byte outside the range is a record we cannot render, not one we clamp.
        expect(decodeDescriptionPushes([...base, withByte(4, 9)])?.price).toBeUndefined();
        expect(decodeDescriptionPushes([...base, withByte(4, 255)])?.price).toBeUndefined();
        expect(decodeDescriptionPushes([...base, withByte(4, 8)])?.price?.exponent).toBe(8);
        // A digit is not a currency code.
        expect(decodeDescriptionPushes([...base, withByte(1, 0x31)])?.price).toBeUndefined();
        // Upper case is the same code: the STL1 fiat hint reads it that way too.
        expect(decodeDescriptionPushes([...base, withByte(1, 0x55)])?.price?.code).toBe(
            'usd',
        );
    });
});

describe('a-zero-price-is-void', () => {
    /**
     * Zero is not a price — it is the absence of one, and a covenant that asks
     * nothing does not exist. Reading it as a price would paint "free" on a
     * token the seller never gave away.
     */
    it('refuses to write it and voids the field alone when it is read', () => {
        expect(
            encodeDescriptionHex(TOKEN, 'x', {
                price: { code: 'usd', exponent: 2, amount: 0n },
            }),
        ).toBeUndefined();

        const base = pushesOf(encodeDescriptionHex(TOKEN, 'Fine words.')!);
        const zero = new Uint8Array(PRICE_FIELD_BYTES);
        zero[0] = PRICE_TAG;
        zero[1] = 0x75;
        zero[2] = 0x73;
        zero[3] = 0x64;
        zero[4] = 2;
        const back = decodeDescriptionPushes([...base, zero]);
        expect(back?.kind, 'the words still read').toBe('text');
        expect(back?.price).toBeUndefined();
    });
});

describe('a-price-not-in-usd-or-xec-is-void-and-silent', () => {
    /**
     * Void **on this app's screens**, never on the wire. The reader decodes any
     * well-formed code because a record is permanent and a later version will
     * paint more of them; nothing here paints one, and nothing says a word
     * about it. What the wire reader must not do is forget it — an editor that
     * dropped the field on republish would destroy a record it could not read
     * back, which is the failure §5 names.
     *
     * `xec` is the one reserved code: the chain's own unit, `amount × 10^-exp`
     * XEC, with no rate anywhere in it.
     */
    it('decodes any three-letter code, and reserves xec for the chain’s unit', () => {
        for (const code of ['usd', 'xec', 'eur', 'vnd', 'zzz']) {
            const hex = encodeDescriptionHex(TOKEN, 'Fine.', {
                price: { code, exponent: 2, amount: 500n },
            });
            expect(hex, code).toBeDefined();
            expect(decodeDescriptionPushes(pushesOf(hex!))?.price, code).toEqual({
                code,
                exponent: 2,
                amount: 500n,
            });
        }
        expect(XEC_PRICE_CODE).toBe('xec');
    });

    it('refuses to write a code that is not three lowercase letters', () => {
        for (const code of ['US', 'USDD', 'USD', 'u5d', '']) {
            expect(
                encodeDescriptionHex(TOKEN, 'Fine.', {
                    price: { code, exponent: 2, amount: 500n },
                }),
                code,
            ).toBeUndefined();
        }
    });
});

describe('a-published-price-does-not-depend-on-the-display-table', () => {
    /**
     * The exponent is a byte in the record, never `fiatFractionDigits`. That
     * table is a display convention this app may change on any deploy — it
     * already has `bhd` at two digits where the currency has three — and a
     * record whose meaning moved with it would be a different price after an
     * unrelated release.
     */
    it('keeps the exponent the record carries, whatever the table says', () => {
        // `fiatFractionDigits('jpy')` is 0 and `('bhd')` is 2 in this build.
        for (const [code, exponent] of [
            ['jpy', 2],
            ['bhd', 3],
            ['usd', 0],
            ['xec', 8],
        ] as const) {
            const hex = encodeDescriptionHex(TOKEN, 'Fine.', {
                price: { code, exponent, amount: 7n },
            })!;
            expect(decodeDescriptionPushes(pushesOf(hex))?.price, code).toEqual({
                code,
                exponent,
                amount: 7n,
            });
        }
    });

    it('reads a figure back from the exponent alone', () => {
        expect(formatPriceFigure({ code: 'usd', exponent: 2, amount: 1250n })).toBe('12.50');
        expect(formatPriceFigure({ code: 'usd', exponent: 2, amount: 5n })).toBe('0.05');
        expect(formatPriceFigure({ code: 'jpy', exponent: 0, amount: 1200n })).toBe('1200');
        expect(formatPriceFigure({ code: 'xec', exponent: 8, amount: 1n })).toBe(
            '0.00000001',
        );
    });

    it('parses a typed figure into minor units without a float', () => {
        expect(parsePriceFigure('12.50', 'usd', 2)).toEqual({
            code: 'usd',
            exponent: 2,
            amount: 1250n,
        });
        expect(parsePriceFigure('0.01', 'usd', 2)?.amount).toBe(1n);
        expect(parsePriceFigure(' 7 ', 'usd', 2)?.amount).toBe(700n);
        // Below one minor unit, and zero, are not prices.
        expect(parsePriceFigure('0.001', 'usd', 2)).toBeUndefined();
        expect(parsePriceFigure('0', 'usd', 2)).toBeUndefined();
        expect(parsePriceFigure('0.00', 'usd', 2)).toBeUndefined();
        expect(parsePriceFigure('', 'usd', 2)).toBeUndefined();
        expect(parsePriceFigure('1,200', 'usd', 2)).toBeUndefined();
        expect(parsePriceFigure('-1', 'usd', 2)).toBeUndefined();
        expect(parsePriceFigure('1e3', 'usd', 2)).toBeUndefined();
    });
});

describe('no-words-priced-is-a-tombstone-with-a-tag', () => {
    /**
     * A price with no words is a real record — the same shape "no words,
     * shelved" already takes. One record is the whole truth about one token, so
     * a seller who only wants a figure on chain publishes one transaction, not a
     * removal plus a second document, which §5 forbids.
     */
    it('carries a price alone on the tombstone shape', () => {
        const hex = encodeDescriptionHex(TOKEN, '', {
            price: { code: 'usd', exponent: 2, amount: 999n },
        })!;
        expect(hex).toBeDefined();
        expect(decodeDescriptionPushes(pushesOf(hex))).toEqual({
            kind: 'tombstone',
            tokenId: TOKEN,
            price: { code: 'usd', exponent: 2, amount: 999n },
        });
        // Nothing at all is still a refusal: a removal is an instruction and
        // keeps its own encoder.
        expect(encodeDescriptionHex(TOKEN, '')).toBeUndefined();
    });

    it('carries words, shelf and price in one record', () => {
        const hex = encodeDescriptionHex(TOKEN, 'Roasted weekly.', {
            shelf: 'Coffee',
            price: { code: 'xec', exponent: 2, amount: 45_000n },
        })!;
        expect(decodeDescriptionPushes(pushesOf(hex))).toEqual({
            kind: 'text',
            tokenId: TOKEN,
            text: 'Roasted weekly.',
            shelf: 'Coffee',
            price: { code: 'xec', exponent: 2, amount: 45_000n },
        });
    });
});

describe('removing-words-does-not-remove-the-price', () => {
    /**
     * A removal says "take the words away", not "take everything away". One
     * record is the whole truth about one token, so the removal has to restate
     * every other field or publishing it silently erases the shelf and the
     * price too — which is what it did for the shelf before this existed.
     */
    it('carries the shelf and the price onto the tombstone', () => {
        const price = { code: 'usd', exponent: 2, amount: 1250n } as const;
        const hex = encodeRemovalHex(TOKEN, { shelf: 'Coffee', price })!;
        expect(hex).toBeDefined();
        expect(decodeDescriptionPushes(pushesOf(hex))).toEqual({
            kind: 'tombstone',
            tokenId: TOKEN,
            shelf: 'Coffee',
            price,
        });
    });

    it('removing-words-does-not-remove-the-shelf', () => {
        const hex = encodeRemovalHex(TOKEN, { shelf: 'Coffee' })!;
        expect(decodeDescriptionPushes(pushesOf(hex))).toEqual({
            kind: 'tombstone',
            tokenId: TOKEN,
            shelf: 'Coffee',
        });
    });

    it('tombstone-push-is-pushdata1-not-op-zero', () => {
        // Opcode 0x00 is refused by `opReturnPushes`, which would make the whole
        // record unreadable — so a removal would read as never published, §5's
        // worse failure. `4c00` is the form that survives the round trip.
        //
        // Asserted on the **third push**, not on the tail of the string: a
        // removal now carries tagged fields after it, and a tail assertion
        // silently stopped measuring the empty push the moment it did.
        const THIRD_PUSH_AT = ('04' + '53544c44' + '20' + 'cd'.repeat(32)).length;
        for (const [label, hex] of [
            ['bare', encodeRemovalHex(TOKEN)!],
            ['with a shelf', encodeRemovalHex(TOKEN, { shelf: 'Coffee' })!],
            [
                'with a price',
                encodeRemovalHex(TOKEN, {
                    price: { code: 'usd', exponent: 2, amount: 1n },
                })!,
            ],
        ] as const) {
            expect(hex.slice(THIRD_PUSH_AT, THIRD_PUSH_AT + 4), label).toBe('4c00');
            const pushes = pushesOf(hex);
            expect(pushes[2]!.length, label).toBe(0);
            expect(decodeDescriptionPushes(pushes)?.kind, label).toBe('tombstone');
        }
    });
});
