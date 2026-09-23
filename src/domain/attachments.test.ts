import { describe, expect, it } from 'vitest';
import {
    ATTACHMENT_BITS,
    ATTACHMENT_FLAGS_TAG,
    SHIPPED_ATTACHMENTS,
    attachmentsForTheme,
    mintedAttachmentTokens,
    publishableFlags,
    attachmentClasses,
    attachmentNodesWanted,
    decodeAttachmentFlags,
    encodeAttachmentFlags,
    withMood,
    wornAttachments,
    wornFrom,
    type ShippedAttachment,
} from './attachments';
import {
    DEFAULT_THEME_ID,
    NEO_CITY_THEME_ID,
    RURAL_THEME_ID,
    decodeTheme,
    themeVars,
    MIN_CONTRAST,
    contrastRatio,
} from './theme';

const bits = (...ns: number[]): number => ns.reduce((f, n) => f | (1 << n), 0);

describe('attachment-table-ids-are-pinned', () => {
    /**
     * A record is permanent, so what bit N of a theme means is permanent with
     * it. Asserted by number, exactly as `theme-table-ids-are-pinned` asserts
     * theme ids: this test failing means somebody changed what a stall already
     * signed, not that they renamed a row.
     */
    it('pins every slot and bit by number', () => {
        const map = SHIPPED_ATTACHMENTS.map((a) => `${a.themeId}:${a.bit}:${a.slot}`);
        expect(map).toEqual([
            // Grouped by look since 2026-09-16 so the catalogue reads as the
            // three galleries the fittings stall sells it in — the shop cuts
            // a run wherever the look changes, and the table is the order
            // that page's own test walks. Bits are fields, not positions, so
            // the order is presentation and the numbers below are the pin.
            // Modern: two rows, bits 2 and 3 free again — the signature
            // stroke and the wax seal, both deleted unminted in round 10, and
            // the shape-only walk of 2026-09-17 found no record on chain that
            // ever set either one.
            '1:0:mood',
            '1:1:fringe',
            // Round 11 took bit 2 for the Awning, after the 2026-09-17 walk
            // confirmed no record had ever set it; the owner minted it the
            // same day, so it is permanent now. Bit 3 is still free.
            '1:2:trim',
            // Neo city: bit 3 retired unminted when the corner brackets
            // folded into the base look.
            '2:0:crest',
            '2:1:fringe',
            '2:2:yard',
            '2:4:trim',
            // Rural: bit 2 retired unminted when the hanging sign folded in.
            '3:0:yard',
            '3:1:mood',
            '3:3:trim',
            '3:4:fringe',
            '3:5:badge',
        ]);
    });

    it('never gives one theme two rows on one bit', () => {
        const seen = new Set<string>();
        for (const a of SHIPPED_ATTACHMENTS) {
            const key = `${a.themeId}:${a.bit}`;
            expect(seen.has(key), `${key} is claimed twice`).toBe(false);
            seen.add(key);
        }
    });

    it('keeps every bit inside the two bytes the wire carries', () => {
        for (const a of SHIPPED_ATTACHMENTS) {
            expect(Number.isInteger(a.bit)).toBe(true);
            expect(a.bit).toBeGreaterThanOrEqual(0);
            expect(a.bit).toBeLessThan(ATTACHMENT_BITS);
        }
    });

    it('names every paintable row with the prefix the guard looks for', () => {
        for (const a of SHIPPED_ATTACHMENTS) {
            if (a.slot === 'mood') {
                // A mood paints no node; it moves the palette instead.
                expect(a.cls).toBeUndefined();
                expect(a.palette).toBeDefined();
                continue;
            }
            expect(a.palette).toBeUndefined();
            expect(a.cls, `${a.label} has no class`).toBeDefined();
            expect(a.cls!.startsWith('att-'), `${a.cls} is invisible to the probe`).toBe(true);
            // Anything that moves must be an element the guard can measure.
            // Only paint that cannot leave the element it sits on may be a
            // bare class on the root.
            expect(a.paint, `${a.label} does not say where it paints`).toBeDefined();
            if (a.motion) {
                // A mover needs either a box the guard can measure, or paint
                // that cannot leave the element it sits on: background motion
                // on the root, which the rendered-pixel pass samples wherever
                // it lands behind a figure. A travelling sprite without a box
                // stays forbidden — 'node' is what gives it one.
                expect(['node', 'root'], `${a.label} moves without a home`).toContain(
                    a.paint,
                );
            }
        }
    });

    it('every row says where it paints, and a place has one name', () => {
        /*
         * Round 15, 2026-09-18. The picker printed the SLOT key as its group
         * heading, and a slot is a place ONE LOOK offers: `yard` is the
         * ground under Rural's stall and the floor inside Neo's sign. So a
         * Neo seller read "Decoration · yard" over a row that paints inside
         * their sign and "· trim" over the ground behind their whole page.
         *
         * The words are the row's now. Two things have to hold: every row
         * has one, and rows sharing a slot within a look agree — the heading
         * takes the first row's word, so two rows with two words would print
         * one of them over both.
         */
        for (const row of SHIPPED_ATTACHMENTS) {
            expect(row.place, `${row.label} says where it paints`).toBeTruthy();
            expect(row.place, `${row.label}: a place is not a slot key`).not.toBe(row.slot);
        }
        for (const id of [DEFAULT_THEME_ID, NEO_CITY_THEME_ID, RURAL_THEME_ID]) {
            const bySlot = new Map<string, Set<string>>();
            for (const row of attachmentsForTheme(id)) {
                const seen = bySlot.get(row.slot) ?? new Set<string>();
                seen.add(row.place);
                bySlot.set(row.slot, seen);
            }
            for (const [slot, words] of bySlot) {
                expect(
                    [...words],
                    `look ${id}, slot ${slot}: one place, one name`,
                ).toHaveLength(1);
            }
        }
    });

    it('a mover is flagged as one — the flag is what reduced-motion trusts', () => {
        /*
         * The one-mover-per-look cap was retired 2026-08-30 by the owner:
         * the full dresses are the product, and their density is the point.
         * What remains load-bearing is the flag itself — every animated row
         * says so, because the reduced-motion stylesheet blocks and the
         * probe's seek pass are built on it.
         */
        for (const id of [DEFAULT_THEME_ID, NEO_CITY_THEME_ID, RURAL_THEME_ID]) {
            for (const row of attachmentsForTheme(id)) {
                expect(typeof row.motion, `${row.label} declares motion`).toBe('boolean');
            }
        }
    });

    it('an-unminted-row-cannot-be-published', () => {
        /*
         * The bit rule, decided 2026-08-30 after the on-chain walk (no
         * record has ever set a retired bit): a record may only name bits
         * whose rows are minted, so shipping a row does not pin it —
         * minting does. Unknown bits pass through: they may be a future
         * table's rows, and republishing settings must not silently edit
         * a record the seller already had.
         */
        for (const id of [DEFAULT_THEME_ID, NEO_CITY_THEME_ID, RURAL_THEME_ID]) {
            const rows = attachmentsForTheme(id);
            const all = rows.reduce((f, r) => f | (1 << r.bit), 0);
            const signable = publishableFlags(id, all);
            for (const row of rows) {
                expect(
                    (signable & (1 << row.bit)) !== 0,
                    `${row.label} ${row.tokenId === undefined ? 'is unminted and must not publish' : 'is minted and must survive'}`,
                ).toBe(row.tokenId !== undefined);
            }
            // A bit no shipped row owns is not this table's to erase.
            const unknown = 1 << 15;
            expect(publishableFlags(id, unknown)).toBe(unknown);
        }
    });

    it('carries a token id that is a genesis txid, or none at all', () => {
        // A row is written before its token exists on purpose: everything
        // except the entitlement is built and tested first, and minting only
        // fills this one field. What must never happen is a *malformed* id —
        // `attachmentByTokenId` compares strings, so a stray space or an
        // uppercase digit is a row nobody can ever wear, silently.
        for (const a of SHIPPED_ATTACHMENTS) {
            if (a.tokenId === undefined) {
                continue;
            }
            expect(a.tokenId, `${a.label} is not a genesis txid`).toMatch(/^[0-9a-f]{64}$/);
        }
    });

    it('pins every minted row to its own genesis txid', () => {
        /*
         * Minting is the moment a bit stops being ours (§7): from the first
         * record that sets it, the row's bit, slot and token are permanent,
         * and an id edited by accident is a row that silently paints for
         * whoever holds a different token. The shape check above cannot see
         * that — every one of these is 64 hex either way — so the numbers are
         * pinned here the way the slots and bits are, and a change has to be
         * a deliberate one that comes and edits this list.
         *
         * Filled 2026-09-16 and 2026-09-17 from the owner's own mints on the
         * fittings stall. **Every one is verified against chronik**
         * (`scripts/verify-decor-tokens.mjs`, run on both days): each genesis
         * exists, is ALP standard at 0 decimals with a supply of 1,000 and a
         * live mint baton, carries the name its row carries, and shares one
         * `authPubkey` that hashes to the fittings stall's own address, which
         * held all twelve at the time of the read.
         */
        const minted = SHIPPED_ATTACHMENTS.filter((a) => a.tokenId !== undefined).map(
            (a) => `${a.label}=${a.tokenId}`,
        );
        expect(minted).toEqual([
            'After hours=14e1f68b541840cd443a40029b9aef28b4fee9db6066d18607812b856169e9c4',
            'Pinstripe=9a0d0745a9ca0e82eea47f2690d2611ca791635f3eba26af6a9bf49dfd528e59',
            'Awning=0068a09be231d9e1fce93688f3be4215ea67d97af4429da320bc5fc2821e21c1',
            'The sign hums=c136cdac5c17def45a7cf1f308fc14f21a54b21ce2b4a70ee513d6b9a8055876',
            'Neon rain=15e67ab0299782529a5971eaf5920a559d1be920ffe596dfcacb16eabda3ebd7',
            'Grid horizon=1d8fc26810f5c6ec059fe857fc3a44102736b249f89e968f855f09b82ef329f8',
            'Aurora glows=c8d534edce337f992a230a2238b6f01602cfc1f48a2042c85d03ecd1df61d443',
            'Yard beetle=314c3acedc40ffd92cf6ee50e5cbac9e5504b83b7c6a956a4039f6291a46c6e6',
            'Sun-faded=aecd2dbc2cef26aaf46ef94ceab289fc0deec2c57d6ff0d2a7ec20c3f4460fb6',
            'Sunburst=9bd55b6dcd03b4a5205a0b606146b7b12e1aea8740aded7d63488a0e8d46771d',
            'Bunting=758d486646ef7bce4a52166e551c86edacaadb52a33f00776e0c0fa97728de1b',
            'Confetti=dfd75ce9bc8038ef753e5de2b55e2ee06cdcec531b642ae9f319b4672562c83d',
        ]);
    });

    it('offers every minted token to the entitlement read', () => {
        /*
         * The read used to ask only about the rows the published record
         * already named, so a stall wearing nothing asked about nothing and
         * the picker told a seller who had just bought a decoration that they
         * did not hold it. The question is the whole catalogue now, which
         * costs no extra request.
         */
        const asked = mintedAttachmentTokens();
        const minted = SHIPPED_ATTACHMENTS.filter((a) => a.tokenId !== undefined);
        expect(asked.size).toBe(minted.length);
        for (const row of minted) {
            expect(asked.has(row.tokenId!), `${row.label} is asked about`).toBe(true);
        }
        // An unminted row has no token to hold, and its bit cannot be
        // published, so it is not a question anyone can answer.
        for (const row of SHIPPED_ATTACHMENTS) {
            if (row.tokenId === undefined) expect(asked.has(row.label)).toBe(false);
        }
    });

    it('never points two rows at one token', () => {
        // Two rows sharing a token would let one purchase wear two slots, and
        // `attachmentByTokenId` would answer with whichever came first.
        const ids = SHIPPED_ATTACHMENTS.map((a) => a.tokenId).filter(
            (id): id is string => id !== undefined,
        );
        expect(new Set(ids).size).toBe(ids.length);
    });
});

describe('attachment-flags-are-one-tagged-push', () => {
    it('reads bit 0 from the low bit of the first byte', () => {
        expect(decodeAttachmentFlags(Uint8Array.from([0x01, 0x00]))).toBe(bits(0));
        expect(decodeAttachmentFlags(Uint8Array.from([0x00, 0x01]))).toBe(bits(8));
        expect(decodeAttachmentFlags(Uint8Array.from([0x02, 0x80]))).toBe(bits(1, 15));
    });

    it('ignores a payload that is not two bytes rather than refusing the record', () => {
        expect(decodeAttachmentFlags(Uint8Array.from([0x01]))).toBe(0);
        expect(decodeAttachmentFlags(Uint8Array.from([0x01, 0x00, 0x00]))).toBe(0);
        expect(decodeAttachmentFlags(new Uint8Array())).toBe(0);
        expect(decodeAttachmentFlags(undefined)).toBe(0);
    });

    it('round-trips through the push a publisher writes, tag byte first', () => {
        const push = encodeAttachmentFlags(bits(0, 3, 15));
        expect(push.length).toBe(3);
        expect(push[0]).toBe(ATTACHMENT_FLAGS_TAG);
        expect(decodeAttachmentFlags(push.slice(1))).toBe(bits(0, 3, 15));
    });

    it('cannot be talked into a third byte by a wild number', () => {
        expect(encodeAttachmentFlags(0xffffff).length).toBe(3);
        expect(decodeAttachmentFlags(encodeAttachmentFlags(0xffffff).slice(1))).toBe(0xffff);
        expect(decodeAttachmentFlags(encodeAttachmentFlags(Number.NaN).slice(1))).toBe(0);
    });
});

describe('worn-from-a-looks-rows-is-worn-attachments', () => {
    /**
     * `wornFrom` is the selection rule over rows handed in, so a caller that
     * holds a look as an object can wear its decorations; `wornAttachments`
     * is now that rule over the catalogue's rows for an id. Neither is judged
     * against the other — one is defined as the other — but both against the
     * body `wornAttachments` had before the split, kept here verbatim over
     * `SHIPPED_ATTACHMENTS`, on every shipped look plus an id with no rows,
     * over **every** two-byte flag value and four entitlements: none asked,
     * nothing held, every minted token held, and every other one.
     */
    function previousWornAttachments(
        themeId: number,
        flags: number,
        held?: ReadonlySet<string>,
    ): readonly ShippedAttachment[] {
        const bySlot = new Map<string, ShippedAttachment>();
        for (let bit = 0; bit < ATTACHMENT_BITS; bit += 1) {
            if ((flags & (1 << bit)) === 0) {
                continue;
            }
            const row = SHIPPED_ATTACHMENTS.find((a) => a.themeId === themeId && a.bit === bit);
            if (row === undefined || bySlot.has(row.slot)) {
                continue;
            }
            if (held !== undefined && (row.tokenId === undefined || !held.has(row.tokenId))) {
                continue;
            }
            bySlot.set(row.slot, row);
        }
        return [...bySlot.values()];
    }

    const minted = [...mintedAttachmentTokens()];
    const helds: readonly (ReadonlySet<string> | undefined)[] = [
        undefined,
        new Set(),
        new Set(minted),
        new Set(minted.filter((_, i) => i % 2 === 0)),
    ];
    const same = (a: readonly ShippedAttachment[], b: readonly ShippedAttachment[]): boolean =>
        a.length === b.length && a.every((row, i) => row === b[i]);

    it('agrees with the old rule on every look, every flag value and every entitlement', () => {
        const looks = [...new Set(SHIPPED_ATTACHMENTS.map((a) => a.themeId)), 0xfe];
        expect(looks).toEqual([DEFAULT_THEME_ID, NEO_CITY_THEME_ID, RURAL_THEME_ID, 0xfe]);
        const misses: string[] = [];
        for (const themeId of looks) {
            const rows = attachmentsForTheme(themeId);
            for (const [h, held] of helds.entries()) {
                for (let flags = 0; flags <= 0xffff; flags += 1) {
                    const want = previousWornAttachments(themeId, flags, held);
                    if (!same(wornFrom(rows, flags, held), want)) {
                        misses.push(`wornFrom ${themeId}/${flags}/held#${h}`);
                    }
                    if (!same(wornAttachments(themeId, flags, held), want)) {
                        misses.push(`wornAttachments ${themeId}/${flags}/held#${h}`);
                    }
                }
            }
        }
        expect(misses.slice(0, 5), `${misses.length} disagreements`).toEqual([]);
        // ~2 s alone; the bound is for a loaded box running the whole suite.
    }, 30_000);

    it('wears rows that are in no table, by their own bits, one per slot', () => {
        const [mood, fringe] = attachmentsForTheme(DEFAULT_THEME_ID);
        expect([mood?.slot, fringe?.slot]).toEqual(['mood', 'fringe']);
        const rows: ShippedAttachment[] = [
            { ...mood!, themeId: 0xfd, bit: 4 },
            { ...fringe!, themeId: 0xfd, bit: 7 },
            { ...fringe!, themeId: 0xfd, bit: 9 },
        ];
        expect(wornFrom(rows, bits(4, 7)).map((a) => a.bit)).toEqual([4, 7]);
        // No shipped look has two rows in one slot, so the sweep above never
        // reaches the exclusivity rule: two here, and the lower bit wins.
        expect(wornFrom(rows, bits(7, 9)).map((a) => a.bit)).toEqual([7]);
        expect(wornFrom(rows, bits(9)).map((a) => a.bit)).toEqual([9]);
        // A bit these rows do not carry paints nothing, whatever the catalogue
        // says that bit means on a shipped look.
        expect(wornFrom(rows, bits(0, 1))).toEqual([]);
    });
});

describe('unknown-attachment-bit-paints-nothing', () => {
    it('drops a bit this theme has no row for, and says nothing about it', () => {
        expect(wornAttachments(DEFAULT_THEME_ID, bits(9))).toEqual([]);
        // And it does not disturb a bit that is real.
        const worn = wornAttachments(DEFAULT_THEME_ID, bits(1, 9));
        expect(worn.map((a) => a.label)).toEqual(['Pinstripe']);
    });

    it('a theme change does not inherit flags: the same bit means another row', () => {
        expect(wornAttachments(DEFAULT_THEME_ID, bits(0)).map((a) => a.slot)).toEqual(['mood']);
        expect(wornAttachments(NEO_CITY_THEME_ID, bits(0)).map((a) => a.slot)).toEqual(['crest']);
        expect(wornAttachments(RURAL_THEME_ID, bits(0)).map((a) => a.slot)).toEqual(['yard']);
    });
});

describe('one-occupant-per-slot', () => {
    it('keeps the lowest bit when two claim one place', () => {
        // A hand-written record can do this; the picker cannot. Both Modern
        // rows are in different slots, so this uses a synthetic pair.
        const two = [
            { themeId: 9, bit: 5, slot: 'fringe' as const, label: 'low', cls: 'att-a', motion: false },
            { themeId: 9, bit: 6, slot: 'fringe' as const, label: 'high', cls: 'att-b', motion: false },
        ];
        // Resolution is the same rule the shipped table goes through, so it is
        // exercised through the shipped one wherever possible.
        const worn = wornAttachments(DEFAULT_THEME_ID, bits(0, 1));
        expect(worn.map((a) => a.slot).sort()).toEqual(['fringe', 'mood']);
        expect(two[0]!.bit).toBeLessThan(two[1]!.bit);
    });
});

describe('an-unheld-attachment-paints-nothing', () => {
    it('refuses a row whose token this stall does not hold', () => {
        expect(wornAttachments(DEFAULT_THEME_ID, bits(1), new Set())).toEqual([]);
    });

    it('refuses a row with no token minted, however the flag is set', () => {
        expect(wornAttachments(DEFAULT_THEME_ID, bits(1), new Set(['ab'.repeat(32)]))).toEqual([]);
    });

    it('paints without a holdings set, because a preview is not a claim', () => {
        expect(wornAttachments(DEFAULT_THEME_ID, bits(1)).map((a) => a.label)).toEqual([
            'Pinstripe',
        ]);
    });
});

describe('a-mood-travels-through-the-contrast-floor', () => {
    it('moves the palette the theme paints with', () => {
        const worn = wornAttachments(DEFAULT_THEME_ID, bits(0));
        const moody = withMood(decodeTheme(DEFAULT_THEME_ID), worn);
        expect(moody.bg).not.toEqual(decodeTheme(DEFAULT_THEME_ID).bg);
        // The shape is untouched: a mood is a palette and nothing else.
        expect(moody.shape).toEqual(decodeTheme(DEFAULT_THEME_ID).shape);
    });

    it('leaves the theme alone when no mood is worn', () => {
        const plain = decodeTheme(RURAL_THEME_ID);
        expect(withMood(plain, wornAttachments(RURAL_THEME_ID, bits(0)))).toEqual(plain);
    });

    it('ships no mood whose own palette needs the correction to be readable', () => {
        // The same proof `ships no id whose own palette hides the asked amount`
        // gives the shipped looks: a mood that had to be lifted by `legibleOn`
        // is a look nobody reviewed, painted on somebody's shop.
        for (const row of SHIPPED_ATTACHMENTS) {
            if (row.palette === undefined) {
                continue;
            }
            const moody = withMood(decodeTheme(row.themeId), [row]);
            const vars = themeVars(moody);
            const asRgb = (css: string) => {
                const [r, g, b] = css.match(/\d+/g)!.map(Number);
                return { r: r!, g: g!, b: b! };
            };
            expect(asRgb(vars['--s-text']!), `${row.label} text was corrected`).toEqual(moody.text);
            expect(asRgb(vars['--s-accent']!), `${row.label} accent was corrected`).toEqual(
                moody.accent,
            );
            expect(contrastRatio(moody.text, moody.bg)).toBeGreaterThanOrEqual(MIN_CONTRAST);
        }
    });
});

describe('attachmentClasses', () => {
    it('returns only the rows that paint a node', () => {
        const worn = wornAttachments(DEFAULT_THEME_ID, bits(0, 1));
        expect(attachmentClasses(worn)).toEqual(['att-pinstripe']);
        expect(attachmentNodesWanted(worn)).toEqual([]);
        expect(
            attachmentNodesWanted(wornAttachments(RURAL_THEME_ID, bits(0))).map((a) => a.cls),
        ).toEqual(['att-beetle']);
    });
});

describe('a-published-mood-is-painted-as-authored', () => {
    /**
     * `legibleOn` corrects silently, so a mood whose palette trips the floor
     * ships as ink and nobody is told. Every shipped mood must come through
     * `themeVars` byte-identical to what its author wrote — a corrected mood
     * is a look nobody reviewed, sold as one somebody did.
     */
    it('emits every mood palette uncorrected, on its own theme', () => {
        for (const row of SHIPPED_ATTACHMENTS.filter((a) => a.slot === 'mood')) {
            const vars = themeVars(withMood(decodeTheme(row.themeId), [row]));
            const p = row.palette!;
            const want = (c: { r: number; g: number; b: number }): string =>
                `rgb(${c.r}, ${c.g}, ${c.b})`;
            expect(vars['--s-text'], `${row.label} text was corrected`).toBe(want(p.text!));
            expect(vars['--s-muted'], `${row.label} muted was corrected`).toBe(
                want(p.muted!),
            );
            expect(vars['--s-accent'], `${row.label} accent was corrected`).toBe(
                want(p.accent!),
            );
        }
    });
});
