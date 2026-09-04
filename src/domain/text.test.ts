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
