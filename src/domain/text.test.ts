// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { ITEM_NAME_MAX_CHARS, isLegibleText, itemTitle } from './text';

describe('a-long-description-titles-an-item-without-splitting-a-character', () => {
    /**
     * The cut is by code point, never by UTF-16 unit: `slice` on a string of
     * astral characters ends on half a surrogate pair, and half a pair paints
     * as a replacement glyph in the one place a buyer reads what they are
     * paying for. `initials` carries the same scar.
     */
    it('cuts an emoji description at the ceiling and leaves whole characters', () => {
        const title = itemTitle('\u{1F6D2}'.repeat(ITEM_NAME_MAX_CHARS + 10));
        expect([...title]).toHaveLength(ITEM_NAME_MAX_CHARS);
        // A lone surrogate is what a UTF-16 cut leaves behind.
        expect(/[\uD800-\uDFFF]/.test(title.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, ''))).toBe(
            false,
        );
    });

    it('leaves anything short of the ceiling exactly as the seller wrote it', () => {
        expect(itemTitle('Roasted beans, 250g bag')).toBe('Roasted beans, 250g bag');
        expect(itemTitle('')).toBe('');
    });

    it('needs no newline clause, because no stored description can hold one', () => {
        expect(isLegibleText('two\nlines')).toBe(false);
        expect(isLegibleText('two\rlines')).toBe(false);
    });
});

describe('a-name-with-nothing-visible-is-not-legible', () => {
    /**
     * Hangul fillers, the halfwidth filler and the braille blank are letters
     * or symbols by category and paint nothing, so a name made of them passed
     * every clause and titled a row beside a figure with an empty string.
     */
    it('refuses a string of fillers, blanks or marks alone', () => {
        for (const blank of ['\u3164', '\u115f', '\u1160', '\uffa0', '\u2800']) {
            expect(isLegibleText(blank.repeat(6)), blank.codePointAt(0)!.toString(16)).toBe(false);
            expect(isLegibleText(`  ${blank}  `)).toBe(false);
        }
        expect(isLegibleText('\u0301\u0301')).toBe(false);
    });

    it('accepts the moment one visible character is there', () => {
        expect(isLegibleText('\u3164a')).toBe(true);
        expect(isLegibleText('a\u2800')).toBe(true);
    });
});

describe('a-stack-of-enclosing-marks-is-refused-like-a-stack-of-combining-ones', () => {
    /**
     * Enclosing marks grow outward from their base the way a stack of
     * non-spacing marks grows upward — the box-overflow shape the `\p{Mn}`
     * rule was written for, on marks that rule did not cover. One clause,
     * one threshold, so an interleaved stack cannot slip between two.
     */
    it('refuses five enclosing marks, and five marks of mixed kind', () => {
        expect(isLegibleText('a' + '\u20dd'.repeat(5))).toBe(false);
        expect(isLegibleText('a' + '\u0301'.repeat(4) + '\u20dd' + '\u0301'.repeat(4))).toBe(false);
        expect(isLegibleText('a' + '\u0301'.repeat(2) + '\u20dd' + '\u0301'.repeat(2))).toBe(false);
    });

    it('allows the stacks real languages use', () => {
        expect(isLegibleText('a' + '\u20dd')).toBe(true);
        expect(isLegibleText('Việt Nam')).toBe(true);
        expect(isLegibleText('ệ')).toBe(true);
    });
});

describe('a-format-character-is-refused-wherever-it-sits', () => {
    /**
     * Word joiners, the Mongolian vowel separator and the tag block are all
     * format characters that paint nothing, and only a handful were listed.
     * The whole category is refused now. ZWJ and ZWNJ were already in the
     * list — emoji sequences and Persian joining are a known cost of this
     * screen, not a change made here.
     */
    it('refuses U+2060, U+180E and a tag character', () => {
        expect(isLegibleText('A\u2060B')).toBe(false);
        expect(isLegibleText('A\u180eB')).toBe(false);
        expect(isLegibleText('A\u{e0041}B')).toBe(false);
        expect(isLegibleText('A\u200dB')).toBe(false);
    });

    it('keeps the variation selector an emoji needs, which is a mark and not a format', () => {
        expect(isLegibleText('❤️')).toBe(true);
    });
});

describe('spacing-marks-are-language-and-never-refused', () => {
    /**
     * A spacing combining mark advances the pen; it does not stack. A rule
     * against `\p{Mc}` would refuse Devanagari and Bengali outright, and this
     * test exists so that rule cannot be added green.
     */
    it('accepts Devanagari, Bengali and Vietnamese', () => {
        expect(isLegibleText('क्षि')).toBe(true);
        expect(isLegibleText('বাংলা')).toBe(true);
        expect(isLegibleText('Cà phê rang xay')).toBe(true);
        expect(isLegibleText('ि'.repeat(8))).toBe(true);
    });
});
