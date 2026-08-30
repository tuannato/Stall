import { describe, expect, it } from 'vitest';
import {
    ATTACHMENT_BITS,
    ATTACHMENT_FLAGS_TAG,
    SHIPPED_ATTACHMENTS,
    attachmentsForTheme,
    attachmentClasses,
    attachmentNodesWanted,
    decodeAttachmentFlags,
    encodeAttachmentFlags,
    withMood,
    wornAttachments,
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
            '1:0:mood',
            '1:1:fringe',
            '2:0:crest',
            '2:1:fringe',
            '3:0:yard',
            '3:1:mood',
            // The second wave, 2026-08-29 — unminted until the fittings stall
            // opens, permanent from the first record that sets them.
            '1:2:badge',
            '1:3:trim',
            // Extraction round 1: bits 2-4 re-cut from the full dress while
            // unminted — the sanctioned cheapest moment, updated on purpose.
            '2:2:yard',
            '2:3:badge',
            '2:4:trim',
            '3:2:badge',
            '3:3:trim',
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

    it('ships at most one mover per look', () => {
        for (const id of [DEFAULT_THEME_ID, NEO_CITY_THEME_ID, RURAL_THEME_ID]) {
            const movers = attachmentsForTheme(id).filter((a) => a.motion);
            expect(movers.length, `theme ${id} has ${movers.length} moving rows`).toBeLessThan(2);
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
