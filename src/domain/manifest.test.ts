import { fromHex, getStackArray, toHex } from 'ecash-lib';
import { describe, expect, it } from 'vitest';
import {
    decodeManifestPushes,
    encodeManifestHex,
    OP_RETURN_BUDGET,
    pickManifestWinner,
    STL1_ASCII,
    encodePush,
} from './manifest';
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

/**
 * Domain tests do not import `opReturnPushes` from `src/net/` — that is a
 * different wall. Cashtab survival is `getStackArray` (what
 * `nodeWillAcceptOpReturnRaw` calls). Stall survival of OP_0 / OP_n is the
 * hand-written hex below; `getStackArray` treats opcode 0 as a one-byte
 * push of `00`, so a theme-0 round-trip through it would stay green.
 */
function decodeEncoded(hex: string) {
    const stack = getStackArray(`6a${hex}`);
    return decodeManifestPushes(stack.map((h) => fromHex(h)));
}

describe('encodeManifestHex', () => {
    it('round-trips name and theme id through getStackArray', () => {
        const cases: [string, number][] = [
            ['Nato', 0xfe],
            ["Nato's Corner", 0x01],
            ['a'.repeat(32), 255],
            ['\u00e9'.repeat(16), 0],
        ];
        for (const [name, themeId] of cases) {
            const hex = encodeManifestHex(name, themeId);
            expect(hex, name).toBeDefined();
            const m = decodeEncoded(hex!);
            expect(m.name).toBe(name);
            expect(m.theme.id).toBe(themeId);
        }
    });
});

describe('encoded-hex-is-not-the-builder', () => {
    /**
     * Same literal as `hex-vector-is-not-the-builder`, without the leading
     * `6a` Cashtab prepends. 0xfe is not the shipped default: an encoder
     * that always writes 0x01 would still pass a 0x01 vector.
     */
    it('emits a hand-written payload for Nato and theme 0xfe', () => {
        // 04 STL1 / 04 "Nato" / 01 0xfe
        expect(encodeManifestHex('Nato', 0xfe)).toBe('0453544c31044e61746f01fe');
    });
});

describe('shipped-theme-id-is-a-one-byte-push', () => {
    /**
     * 0x01 is Modern. `pushBytesOp` would emit OP_1 (`51`) instead of
     * `0101`, and Stall would drop the output as an unknown opcode.
     */
    it('pushes the shipped default as one data byte, not OP_1', () => {
        expect(encodeManifestHex('Nato', 0x01)).toBe('0453544c31044e61746f0101');
    });
});

describe('theme-zero-is-a-one-byte-push', () => {
    /**
     * `pushNumberOp(0)` is OP_0. Cashtab's `getStackArray` would still
     * report theme id 0; Stall's reader would void the whole output.
     */
    it('pushes theme 0 as one data byte, not OP_0', () => {
        expect(encodeManifestHex('Nato', 0)).toBe('0453544c31044e61746f0100');
    });
});

describe('utf8-byte-length-is-not-js-length', () => {
    it('rejects a name whose utf-8 length exceeds 32 while JS length does not', () => {
        const long = '\u00e9'.repeat(32);
        expect(long.length).toBe(32);
        expect(new TextEncoder().encode(long).length).toBeGreaterThan(32);
        expect(encodeManifestHex(long, 0x01)).toBeUndefined();
    });
});

describe('empty-name-is-not-a-record', () => {
    it('rejects an empty name and a non-string name', () => {
        expect(encodeManifestHex('', 0x01)).toBeUndefined();
        expect(encodeManifestHex(null as unknown as string, 0x01)).toBeUndefined();
    });
});

describe('theme-id-is-a-byte', () => {
    it('rejects a theme id that is not an integer 0-255', () => {
        expect(encodeManifestHex('Nato', 256)).toBeUndefined();
        expect(encodeManifestHex('Nato', -1)).toBeUndefined();
        expect(encodeManifestHex('Nato', 1.5)).toBeUndefined();
        expect(encodeManifestHex('Nato', NaN)).toBeUndefined();
        expect(encodeManifestHex('Nato', Infinity)).toBeUndefined();
    });
});

describe('op-return-raw-does-not-start-with-6a', () => {
    it('emits lowercase even-length hex that never starts with 6a', () => {
        const hexes = [
            encodeManifestHex('Nato', 0xfe),
            encodeManifestHex('Nato', 0x01),
            encodeManifestHex('Nato', 0),
            encodeManifestHex('a'.repeat(32), 255),
        ];
        for (const hex of hexes) {
            expect(hex).toBeDefined();
            expect(hex!.startsWith('6a')).toBe(false);
            expect(hex!.length % 2).toBe(0);
            expect(hex).toMatch(/^[a-f0-9]+$/);
        }
    });
});

describe('push-longer-than-75-bytes-uses-pushdata1', () => {
    /**
     * Writing the length into the opcode byte is valid only to 75. At 76 that
     * byte *is* `OP_PUSHDATA1`, with no length after it — so the reader takes
     * the first payload byte as the length and the output decodes as something
     * else entirely. §5 names that as the worse failure: the record reads as
     * never published, not as unreadable.
     *
     * The name is capped at 32, so nothing shipped could reach this. A
     * description can.
     */
    it('round-trips a payload on both sides of the boundary', () => {
        // `OP_PUSHDATA1` could carry 255, but the OP_RETURN relay limit (223)
        // binds first and ecash-lib enforces it — so the ceiling that matters
        // here is the output's, not the opcode's.
        for (const len of [1, 74, 75, 76, 77, 200, 210]) {
            const payload = new Uint8Array(len).fill(0x41);
            const hex = toHex(encodePush(payload));
            const pushes = getStackArray(`6a${hex}`);
            expect(pushes, `${len} bytes did not decode as one push`).toHaveLength(1);
            // The stack comes back as hex strings, two characters per byte.
            expect(fromHex(pushes[0]!).length, `${len} bytes came back wrong`).toBe(len);
        }
    });

    it('emits OP_PUSHDATA1 only where it is needed', () => {
        expect(encodePush(new Uint8Array(75))[0]).toBe(75);
        // 0x4c is OP_PUSHDATA1, and the length follows it rather than being it.
        expect(encodePush(new Uint8Array(76))[0]).toBe(0x4c);
        expect(encodePush(new Uint8Array(76))[1]).toBe(76);
    });
});

/**
 * The stall name is chain-supplied free text painted as the sign's <h1>, and
 * it went unscreened for as long as the description had a screen. Same set,
 * one module (`domain/text.ts`), enforced at decode and encode both — an
 * illegible record is unreadable (which has honest copy), never sanitised.
 */
describe('a-stall-name-cannot-reorder-the-page', () => {
    it('refuses a bidi override at decode', () => {
        expect(() => decodeManifestPushes(pushes('100 XEC\u202e'))).toThrow(
            /not legible/,
        );
    });

    it('refuses the same name at encode, so this app never writes it', () => {
        expect(encodeManifestHex('100 XEC\u202e', DEFAULT_THEME_ID)).toBeUndefined();
    });
});

describe('a-stall-name-cannot-hide-itself', () => {
    it('refuses zero-width padding at decode', () => {
        expect(() => decodeManifestPushes(pushes('Sta\u200bll'))).toThrow(
            /not legible/,
        );
    });

    it('refuses a name that is only whitespace', () => {
        expect(() => decodeManifestPushes(pushes('   '))).toThrow(/not legible/);
    });

    it('refuses both shapes at encode', () => {
        expect(encodeManifestHex('Sta\u200bll', DEFAULT_THEME_ID)).toBeUndefined();
        expect(encodeManifestHex('   ', DEFAULT_THEME_ID)).toBeUndefined();
    });

    it('still reads an ordinary name, accents included', () => {
        const m = decodeManifestPushes(pushes('C\u00e0 ph\u00ea 1st'));
        expect(m.name).toBe('C\u00e0 ph\u00ea 1st');
    });
});

describe('a-record-this-app-writes-fits-the-op-return-budget', () => {
    /**
     * Every field at its simultaneous maximum, against the shared 222-byte
     * ceiling — a per-field cap cannot express a shared budget. The exact sum
     * is asserted so the headroom is a number, not a feeling.
     */
    it('encodes the full record, round-trips it, and states its size', () => {
        const name = 'N'.repeat(32);
        const tagline = 'T'.repeat(64);
        const featuredTokenId = 'ab'.repeat(32);
        const hex = encodeManifestHex(name, DEFAULT_THEME_ID, 0xffff, {
            tagline,
            featuredTokenId,
            fiatHint: 'vnd',
        });
        expect(hex).toBeDefined();
        // 5 lokad + 33 name + 2 theme + 4 flags + 66 tagline + 34 featured
        // + 5 fiat = 149 of 222.
        expect(hex!.length / 2).toBe(149);
        expect(hex!.length / 2).toBeLessThanOrEqual(OP_RETURN_BUDGET);

        const back = decodeEncoded(hex!);
        expect(back.name).toBe(name);
        expect(back.tagline).toBe(tagline);
        expect(back.featuredTokenId).toBe(featuredTokenId);
        expect(back.fiatHint).toBe('vnd');
    });

    it('refuses what decode would drop, so it never writes a dead field', () => {
        expect(
            encodeManifestHex('Shop', DEFAULT_THEME_ID, 0, { tagline: 'x\u202ey' }),
        ).toBeUndefined();
        expect(
            encodeManifestHex('Shop', DEFAULT_THEME_ID, 0, { tagline: 'T'.repeat(65) }),
        ).toBeUndefined();
        expect(
            encodeManifestHex('Shop', DEFAULT_THEME_ID, 0, { featuredTokenId: 'ab' }),
        ).toBeUndefined();
        expect(
            encodeManifestHex('Shop', DEFAULT_THEME_ID, 0, { fiatHint: 'US1' }),
        ).toBeUndefined();
    });
});

describe('unknown-tag-payload-is-ignored-alone', () => {
    /**
     * A malformed payload under a known tag voids that field and nothing
     * else — the mirror of unknown tags being skipped. Refusing the record
     * would let one bad byte take a seller's name and look down with it.
     */
    it('drops a malformed featured id and keeps the tagline beside it', () => {
        const lokadPush = lokad();
        const name = new TextEncoder().encode('Shop');
        const theme = new Uint8Array([DEFAULT_THEME_ID]);
        const goodTagline = new Uint8Array([
            0x02,
            ...new TextEncoder().encode('Fresh weekly'),
        ]);
        const badFeatured = new Uint8Array([0x03, ...new Uint8Array(31).fill(0xab)]);
        const badFiat = new Uint8Array([0x04, 0x55, 0x24, 0x31]);
        const m = decodeManifestPushes([
            lokadPush,
            name,
            theme,
            goodTagline,
            badFeatured,
            badFiat,
        ]);
        expect(m.name).toBe('Shop');
        expect(m.tagline).toBe('Fresh weekly');
        expect(m.featuredTokenId).toBeUndefined();
        expect(m.fiatHint).toBeUndefined();
    });

    it('reads an uppercase fiat hint as its lowercase code', () => {
        const m = decodeManifestPushes([
            lokad(),
            new TextEncoder().encode('Shop'),
            new Uint8Array([DEFAULT_THEME_ID]),
            new Uint8Array([0x04, 0x56, 0x4e, 0x44]),
        ]);
        expect(m.fiatHint).toBe('vnd');
    });
});
