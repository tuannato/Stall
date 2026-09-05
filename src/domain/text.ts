/**
 * What chain-supplied free text is allowed to be made of.
 *
 * The stall name and the description are the attacker-chosen strings on the
 * paint path, so §6's "the chain supplies a row, never bytes" stops covering
 * them and the check has to be explicit. It lives beside the decoders rather
 * than in CSS because the unit runner cannot lay anything out, so a decoder is
 * the only place an enforceable test can sit — and because tightening it after
 * records accumulate on chain would make published records unreadable. Every
 * new text field (PLAN-REDESIGN §2) reuses this screen rather than restating
 * it per tag.
 */
export function isLegibleText(text: string): boolean {
    if (text.trim() === '') {
        return false;
    }
    // C0/C1, DEL, and the two separators that end a line.
    if (/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/.test(text)) {
        return false;
    }
    // Format characters, the whole category. Bidi overrides, embeddings and
    // isolates (an unterminated U+202E reorders the rest of its paragraph — a
    // seller could write a price that reads backwards from the one they
    // typed), soft hyphens, zero-width spaces and joiners, the byte-order
    // mark, the word joiner, the Mongolian vowel separator and the tag block
    // all paint nothing and pad a name into a lookalike or hide a word. An
    // enumerated few were refused before; the rest went through. ZWJ and
    // ZWNJ were already on that list, so emoji sequences and Persian joining
    // are a standing cost of this screen, not one added here.
    if (/\p{Cf}/u.test(text)) {
        return false;
    }
    // A long stack of combining marks grows out of its line box and can cover
    // the row beside it — chain-supplied bytes over the asked amount, which is
    // the one thing §6 says must never happen. Four is past any real language.
    // Enclosing marks grow outward the way non-spacing marks grow upward, so
    // both kinds count, in one run: two thresholds left an interleaved stack
    // between them. Spacing marks (`Mc`) advance the pen and never stack —
    // refusing them would refuse Devanagari and Bengali.
    if (/[\p{Mn}\p{Me}]{5,}/u.test(text)) {
        return false;
    }
    // Something must be visible. The Hangul fillers and the halfwidth filler
    // are letters by category and the braille blank is a symbol, and a name
    // made of them titled a row beside a figure with nothing on it. Every
    // filler is a default-ignorable code point; the braille blank is the one
    // that is not. Non-spacing and enclosing marks need a base to show;
    // spacing marks have glyphs of their own and count as visible.
    const visible = [...text].some(
        (ch) => !/[\s\p{Mn}\p{Me}\p{Default_Ignorable_Code_Point}\u2800]/u.test(ch),
    );
    if (!visible) {
        return false;
    }
    return true;
}

/**
 * How much of a seller's words may stand in as an item's name.
 *
 * A description is up to 180 bytes — a sentence, not a title — and the pay row
 * and the pay sheet head each have one line for it. Forty code points is a
 * phrase a person reads at a glance and the longest thing either surface has
 * room for; the whole description is still painted inside the sheet, under its
 * own label, so nothing is hidden by the cut.
 */
export const ITEM_NAME_MAX_CHARS = 40;

/**
 * The item's name, from the seller's own words.
 *
 * **Code points, never UTF-16 units.** `slice` on a string of astral
 * characters ends on half a surrogate pair, which paints as a replacement
 * glyph — the same scar `initials` carries.
 *
 * No newline clause: a stored description cannot hold one. `isLegibleText`
 * refuses C0 and both line separators, and every description on the view came
 * through it, so a first-line rule here would be a second decoder's opinion
 * about a record the first one already screened.
 */
export function itemTitle(words: string): string {
    return cutAtCodePoints(words, ITEM_NAME_MAX_CHARS);
}

/**
 * The ceiling on a token's genesis name and ticker as painted. A genesis
 * string has no wire cap and `isLegibleText` is a screen, not a length rule.
 * Sixty-four rather than `ITEM_NAME_MAX_CHARS`: the genesis name is the small
 * line under the seller's words on the pay surfaces, where a cut is less
 * visible, and no probe rule measures a long one — a judgement, not a
 * measurement.
 */
export const TOKEN_NAME_MAX_CHARS = 64;

/** The first `max` code points — never UTF-16 units, which split a pair. */
export function cutAtCodePoints(text: string, max: number): string {
    return [...text].slice(0, max).join('');
}
