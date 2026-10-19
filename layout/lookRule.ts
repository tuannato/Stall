/**
 * **Which `::before` / `::after` is a look's** (`markLookPseudos` in
 * `layout/probe.ts`; D6(i), step 5b; round 8 of `money-guards`, the critic's
 * P1-1 on round 7).
 *
 * A look pseudo is one a look sheet or a decoration rule generates: a rule
 * whose selector names a look's class (`t-…`, `LOOK_CLASS`) or a
 * decoration's (`att-…`, `ATT_CLASS`). The contrast pass keeps its glyphs
 * whatever their colour and reads its paint in the look-pseudo frames
 * (`no-look-pseudo-paints-inside-a-protected-box`); a pseudo it does not
 * take for a look's, in its host's ink, goes blank with its host and is
 * read nowhere.
 *
 * Until round 8 the class had to follow the start, a space, a combinator,
 * a comma or `(`, so a look pseudo spelt with its class in a compound —
 * `.stall.t-modern .stall-tagline::after`, `div.t-rural …`, `[x].t-x …` —
 * was the app's to the probe: the critic's PSc, a diamond over the address
 * that both look lints admit, passed the whole runner (and main, which
 * blanked by `color`, caught it). Now the class may stand anywhere: the dot
 * is the boundary, and the class is read as a whole token, the shape the two
 * class rules give (`t-fixture-private` and `att-beetle-bug` are one class
 * each). Every class the app writes that starts `t-` or `att-` is a look's
 * or a decoration's (round 8, by grep over `src/`, `layout/` and
 * `workshop/`: the three looks, the skeleton, the kit, the harness's two
 * fixture looks and the decorations, `att-beetle-bug` the beetle's own;
 * `t-rural-tag` and `att-hum-gutter-outlined` are keyframes, never a
 * selector), so the wider reading marks no chrome.
 *
 * And a selector list is split at its top-level commas (`selectorList`),
 * never inside `:is()`, `:where()`, `:not()` or an attribute's value: split
 * naively, `:is(.t-x, .a) .b::after` left a chunk with the class and no
 * pseudo-element and one with the pseudo-element and no class.
 *
 * Not read, stated: a rule that reaches a stall's element without naming a
 * look's or a decoration's class (an attribute selector on `class` — the
 * look lints admit none — or a base sheet's own rule).
 */
import { LOOK_CLASS } from '../src/domain/lookClass';
import { ATT_CLASS } from '../src/domain/moodClass';

/** A class rule's pattern without its anchors. */
const token = (anchored: RegExp): string => anchored.source.replace(/^\^/, '').replace(/\$$/, '');

/** A selector naming a look's class or a decoration's, anywhere in it, as a whole token. */
export const LOOK_RULE = new RegExp(`\\.(?:${token(LOOK_CLASS)}|${token(ATT_CLASS)})(?![\\w-])`);

/** Which pseudo-element a selector generates, if it generates `::before` or `::after`. */
export const PSEUDO_AT = /::?(before|after)\b/;

/**
 * A selector list, or a computed comma list (`mask-image`'s layers), split
 * at its top-level commas: never inside parentheses, brackets or a quoted
 * string, nor at an escaped comma.
 */
export function selectorList(text: string): string[] {
    const out: string[] = [];
    let depth = 0;
    let quote = '';
    let start = 0;
    for (let i = 0; i < text.length; i += 1) {
        const c = text[i]!;
        if (quote !== '') {
            if (c === '\\') i += 1;
            else if (c === quote) quote = '';
            continue;
        }
        if (c === '\\') {
            i += 1;
        } else if (c === '"' || c === "'") {
            quote = c;
        } else if (c === '(' || c === '[') {
            depth += 1;
        } else if (c === ')' || c === ']') {
            depth = Math.max(0, depth - 1);
        } else if (c === ',' && depth === 0) {
            out.push(text.slice(start, i));
            start = i + 1;
        }
    }
    out.push(text.slice(start));
    return out.map((s) => s.trim()).filter((s) => s !== '');
}

/**
 * The look pseudo one selector (one entry of a list) generates: which
 * pseudo-element, and the selector of the element that hosts it; undefined
 * when it generates none, or names no look's or decoration's class.
 */
export function lookPseudoOf(selector: string): { which: 'before' | 'after'; host: string } | undefined {
    const pseudo = PSEUDO_AT.exec(selector);
    if (pseudo === null || !LOOK_RULE.test(selector)) return undefined;
    return {
        which: pseudo[1] as 'before' | 'after',
        host: selector.replace(/::?(?:before|after)\b/g, '').trim() || '*',
    };
}
