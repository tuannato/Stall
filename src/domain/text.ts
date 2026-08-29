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
    // Bidi overrides, embeddings and isolates. An unterminated U+202E reorders
    // the rest of its paragraph: a seller could write a price that reads
    // backwards from the one they typed. A block boundary happens to contain it
    // today, which is a CSS accident and not a boundary.
    if (/[\u202a-\u202e\u2066-\u2069\u200e\u200f\u061c]/.test(text)) {
        return false;
    }
    // Invisible characters. They pad a name into a lookalike, or hide a word.
    if (/[\u00ad\u200b-\u200d\ufeff]/u.test(text)) {
        return false;
    }
    // A long stack of combining marks grows out of its line box and can cover
    // the row beside it — chain-supplied bytes over the asked amount, which is
    // the one thing §6 says must never happen. Four is past any real language.
    if (/\p{Mn}{5,}/u.test(text)) {
        return false;
    }
    return true;
}
