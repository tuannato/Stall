/**
 * The workshop's static CSS reader: a small parser over a look sheet, the
 * lint `pnpm workshop:lint` runs over `workshop/theme-workshop.css`, and the
 * re-scoping `pnpm workshop:start <look>` applies to a shipped look's sheet.
 *
 * Pure: strings in, strings out, no file access — the two CLIs read and
 * write. A parser rather than regexes over the text, because the lint's
 * rules are about STRUCTURE (which selector a rule has, which at-rule holds
 * it, what the last rule is) and a comment or a string holding `{` must not
 * move any of that. It reads the CSS a look sheet is made of — qualified
 * rules, `@media` / `@supports` / `@container` blocks, `@keyframes` — and
 * refuses what it does not read (nested rules), rather than guessing.
 *
 * **A sheet reaches only the art it was sent with.** Vite's build copies
 * whatever a `url()`, an `image-set()` entry or a custom property holding
 * one points at, `..` and absolute-looking paths included: a sheet that
 * passed this lint once made a kit build emit `/etc/hostname` and
 * `/etc/os-release` as assets and turn `?inline` into a `data:` URL (the
 * intake critic's item 1, 2026-09-23). So every such target must be exactly
 * `art/<name>.svg` or `./art/<name>.svg` — lower-case letters, digits and
 * hyphens, no query, no fragment, no `..`, no escape — naming a plain file
 * the caller listed in the sheet's `art/` folder, and `src()` is refused
 * outright. The lint is not the only guard: `workshop-build-check.mjs`
 * holds every kit build's output against what the build was given.
 *
 * **A look sheet, shipped or the kit's, obeys one more set of rules**
 * (`lookSheetRules` below; build step 4a, the critic's items 7–9 and 12 of
 * 2026-09-24): attribute selectors only on the state attributes the app
 * sets (G3 — never on a link, a picture, a label or a key that carries a
 * token id or an address, so a look cannot paint one seller's stall
 * differently); generated text only from a closed list, on `::before` and
 * `::after` (G2 — every other road a stylesheet has to print, reorder or
 * hide text is refused); and nothing that would make the look paint
 * differently from what Chrome painted for the probe, or paint around what
 * the probe reads (G4). `lintLookSheet` applies them to a shipped look
 * under its own class; `lintSheet` applies them to the kit's sheet beside
 * the kit's own rules. The flash rule (G6) needs every sheet at once, since
 * a rule in one sheet can re-time a keyframe declared in another:
 * `flashReport`.
 *
 * Tests: `scripts/workshop-lint.test.mjs` (the kit),
 * `scripts/look-lint.test.mjs` (the shipped sheets and the flash rule; both
 * node --test, in `pnpm test`), and `the-starter-is-each-shipped-look-rescoped`
 * over the real shipped sheets.
 */

/** The class every rule of a kit sheet is scoped under. */
export const KIT_CLASS = 't-workshop';

/** At-rules whose block is a list of rules. */
const GROUPING = new Set(['media', 'supports', 'container']);

const REDUCE_PRELUDE = /^@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)$/i;

/** A file name the art folder may hold and a sheet may name: `<name>.svg`, lower case. */
export const ART_NAME = /^[a-z0-9-]{1,64}\.svg$/;
/** The one shape a `url()` or `image-set()` target may take in a look sheet. */
export const ART_URL = /^(?:\.\/)?art\/([a-z0-9-]{1,64}\.svg)$/;
const ART_RULE = 'art is url(art/<name>.svg), a file in workshop/art/ named in lower-case letters, digits and hyphens';

/** The most of a creator's text a message quotes. */
const ECHO_MAX = 64;

/**
 * A creator's text as a message may quote it: at most `max` characters of
 * it, and every control, format, separator or surrogate character written
 * as an escape — a terminal must never receive one raw from a sheet.
 */
export function echo(text, max = ECHO_MAX) {
    const chars = [...String(text)];
    const shown = chars
        .slice(0, max)
        .map((c) =>
            /[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}]/u.test(c) ? `\\u{${c.codePointAt(0).toString(16)}}` : c,
        )
        .join('');
    return chars.length > max ? `${shown}…` : shown;
}

function skipString(text, at) {
    const quote = text[at];
    let i = at + 1;
    while (i < text.length && text[i] !== quote) {
        if (text[i] === '\\') {
            i += 1;
        }
        i += 1;
    }
    return i + 1;
}

/**
 * The text with every comment turned into spaces — newlines kept, so an
 * index and a line number mean the same thing in both. Strings are left
 * alone: a `/*` inside one is not a comment.
 */
export function blankComments(css) {
    let out = '';
    let i = 0;
    while (i < css.length) {
        const c = css[i];
        if (c === '"' || c === "'") {
            const end = skipString(css, i);
            out += css.slice(i, end);
            i = end;
        } else if (c === '/' && css[i + 1] === '*') {
            const close = css.indexOf('*/', i + 2);
            const end = close < 0 ? css.length : close + 2;
            out += css.slice(i, end).replace(/[^\n]/g, ' ');
            i = end;
        } else {
            out += c;
            i += 1;
        }
    }
    return out;
}

function lineOf(text, index) {
    let line = 1;
    for (let i = 0; i < index && i < text.length; i += 1) {
        if (text[i] === '\n') line += 1;
    }
    return line;
}

/** The index of the `}` closing the block opened at `open`, or -1. */
function closingBrace(text, open, to) {
    let depth = 0;
    let i = open;
    while (i < to) {
        const c = text[i];
        if (c === '"' || c === "'") {
            i = skipString(text, i);
            continue;
        }
        if (c === '{') depth += 1;
        if (c === '}') {
            depth -= 1;
            if (depth === 0) return i;
        }
        i += 1;
    }
    return -1;
}

function parseList(text, from, to, errors) {
    const nodes = [];
    let i = from;
    while (i < to) {
        while (i < to && /\s/.test(text[i])) i += 1;
        if (i >= to) break;
        if (text[i] === '}') {
            errors.push({ at: i, message: 'a "}" with no block to close' });
            i += 1;
            continue;
        }
        const start = i;
        let depth = 0;
        let j = i;
        while (j < to) {
            const c = text[j];
            if (c === '"' || c === "'") {
                j = skipString(text, j);
                continue;
            }
            if (c === '(' || c === '[') depth += 1;
            else if (c === ')' || c === ']') depth -= 1;
            else if (depth <= 0 && (c === '{' || c === ';' || c === '}')) break;
            j += 1;
        }
        const prelude = text.slice(start, j).trim();
        const atName = prelude.startsWith('@') ? /^@([\w-]+)/.exec(prelude)?.[1]?.toLowerCase() ?? '' : undefined;
        if (j >= to || text[j] !== '{') {
            // A statement: `@import …;`, `@charset …;`, or a stray declaration.
            if (atName !== undefined) {
                nodes.push({ kind: 'at', name: atName, prelude, statement: true, start, end: j });
            } else {
                errors.push({ at: start, message: `"${echo(prelude, 40)}" is not inside a rule` });
            }
            i = j < to && text[j] === ';' ? j + 1 : j;
            continue;
        }
        const close = closingBrace(text, j, to);
        if (close < 0) {
            errors.push({ at: start, message: `the block of "${echo(prelude, 40)}" is never closed` });
            break;
        }
        if (atName !== undefined) {
            const node = { kind: 'at', name: atName, prelude, statement: false, start, end: close + 1 };
            if (GROUPING.has(atName)) {
                node.children = parseList(text, j + 1, close, errors);
            } else {
                node.body = text.slice(j + 1, close);
            }
            nodes.push(node);
        } else {
            nodes.push({ kind: 'rule', prelude, body: text.slice(j + 1, close), start, end: close + 1 });
        }
        i = close + 1;
    }
    return nodes;
}

/** The sheet as a tree of rules and at-rules, over its comment-blanked text. */
export function parseSheet(css) {
    const text = blankComments(css);
    const errors = [];
    const nodes = parseList(text, 0, text.length, errors);
    return { text, nodes, errors };
}

/** Split at every top-level `sep`, outside strings, parentheses and brackets. */
export function splitTopLevel(text, sep) {
    const parts = [];
    let depth = 0;
    let start = 0;
    let i = 0;
    while (i < text.length) {
        const c = text[i];
        if (c === '"' || c === "'") {
            i = skipString(text, i);
            continue;
        }
        if (c === '(' || c === '[') depth += 1;
        else if (c === ')' || c === ']') depth -= 1;
        else if (c === sep && depth === 0) {
            parts.push(text.slice(start, i));
            start = i + 1;
        }
        i += 1;
    }
    parts.push(text.slice(start));
    return parts.map((part) => part.trim()).filter((part) => part !== '');
}

/** The selector with everything inside `()`, `[]` and strings turned into spaces. */
function flatten(selector) {
    let out = '';
    let depth = 0;
    let i = 0;
    while (i < selector.length) {
        const c = selector[i];
        if (c === '"' || c === "'") {
            const end = skipString(selector, i);
            out += ' '.repeat(end - i);
            i = end;
            continue;
        }
        if (c === '(' || c === '[') {
            out += depth === 0 ? c : ' ';
            depth += 1;
        } else if (c === ')' || c === ']') {
            depth -= 1;
            out += depth === 0 ? c : ' ';
        } else {
            out += depth > 0 ? ' ' : c;
        }
        i += 1;
    }
    return out;
}

/**
 * Why one selector escapes `.<cls>` (the kit's `.t-workshop` unless another
 * look's class is named), or undefined when it is scoped.
 *
 * Scoped means a compound selector at the top level carries the class — not
 * inside `:not()`, `:is()` or `:has()`, which can match elsewhere — and the
 * combinator straight after it is a descendant or a child one, or there is
 * none. `.t-workshop + .x` reaches a sibling of the stall; `.t-workshop .a +
 * .b` stays inside it.
 */
export function selectorEscape(selector, cls = KIT_CLASS) {
    const scope = new RegExp(`\\.${escapeRe(cls)}(?![\\w-])`);
    const parts = flatten(selector).trim().split(/\s*([>+~])\s*|\s+/);
    for (let k = 0; k < parts.length; k += 2) {
        if (parts[k] !== undefined && scope.test(parts[k])) {
            const next = parts[k + 1];
            if (next === '+' || next === '~') {
                return `"${echo(selector)}" reaches a sibling of .${cls} (${next})`;
            }
            return undefined;
        }
    }
    return `"${echo(selector)}" is not under .${cls}`;
}

/**
 * Why a `url()` or `image-set()` target may not be in a look sheet, or
 * undefined: it must be exactly `art/<name>.svg` (or `./art/…`) and `<name>`
 * must be in `art`, the plain files the sheet's `art/` folder holds.
 */
export function urlProblem(target, art = []) {
    const listed = art instanceof Set ? art : new Set(art);
    const m = ART_URL.exec(target);
    if (m !== null) {
        return listed.has(m[1]) ? undefined : `there is no plain file workshop/art/${m[1]} (a link is not one)`;
    }
    const value = target.trim();
    if (/^data:/i.test(value)) return `a data: URL — ${ART_RULE}`;
    if (/^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith('//')) {
        return `nothing loads from another site — ${ART_RULE}`;
    }
    return ART_RULE;
}

/** The shapes the starter's re-basing leaves alone: nothing to re-base, or not a path. */
function notAPath(value) {
    return (
        value === '' ||
        value.startsWith('#') ||
        value.startsWith('/') ||
        value.includes('\\') ||
        /^[a-z][a-z0-9+.-]*:/i.test(value)
    );
}

/** The index of the `)` closing the parenthesis opened at `open`, or -1. */
function closingParen(text, open) {
    let depth = 0;
    let i = open;
    while (i < text.length) {
        const c = text[i];
        if (c === '"' || c === "'") {
            i = skipString(text, i);
            continue;
        }
        if (c === '(') depth += 1;
        if (c === ')') {
            depth -= 1;
            if (depth === 0) return i;
        }
        i += 1;
    }
    return -1;
}

/**
 * Every target a build would resolve, with its index: each `url(…)` —
 * inside a string or a custom property too, because Vite rewrites those —
 * and each entry of an `image-set(…)` or `-webkit-image-set(…)` that is not
 * itself a `url()`: a quoted string, or the entry's first bare token, which
 * Vite resolves as a path even though a browser would not.
 */
function urlTargets(text) {
    const out = [];
    const urlRe = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*?))\s*\)/gi;
    for (const m of text.matchAll(urlRe)) {
        out.push({ at: m.index, value: m[1] ?? m[2] ?? m[3] ?? '' });
    }
    for (const m of text.matchAll(/image-set\(/gi)) {
        const open = m.index + m[0].length - 1;
        const close = closingParen(text, open);
        const inner = text.slice(open + 1, close < 0 ? text.length : close);
        for (const entry of splitTopLevel(inner, ',')) {
            if (/^url\(/i.test(entry)) continue;
            const quoted = /^(["'])([\s\S]*?)\1/.exec(entry);
            out.push({ at: m.index, value: quoted !== null ? quoted[2] : entry.split(/\s+/)[0] });
        }
    }
    return out;
}

/** True when a `{` sits outside every string — a rule nested in a rule. */
function braceOutsideStrings(text) {
    let i = 0;
    while (i < text.length) {
        const c = text[i];
        if (c === '"' || c === "'") {
            i = skipString(text, i);
            continue;
        }
        if (c === '{') return true;
        i += 1;
    }
    return false;
}

/** The index of the first backslash outside every string — an escape in an identifier or a function name — or -1. */
function escapeOutsideStrings(text) {
    let i = 0;
    while (i < text.length) {
        const c = text[i];
        if (c === '"' || c === "'") {
            i = skipString(text, i);
            continue;
        }
        if (c === '\\') return i;
        i += 1;
    }
    return -1;
}

function isReduceBlock(node) {
    return node.kind === 'at' && node.name === 'media' && !node.statement && REDUCE_PRELUDE.test(node.prelude.replace(/\s+/g, ' '));
}

/* ---------- the rules every look sheet obeys, shipped or the kit's ---------- */

/**
 * The media conditions a look sheet may use, exactly: the ones the layout
 * probe's passes enter — the 390px phone (`max-width: 679.98px`), every desk,
 * wall and stream width (`min-width: 680px`), and the reduced-motion pass. A
 * look that paints differently under any other condition — a touch screen, a
 * width between two the probe measures, a colour scheme, print — paints
 * something nobody measured. Inventoried from the three shipped look sheets
 * on 2026-09-24, which use these three and nothing else; a new condition is a
 * new probe pass first, then a line here.
 */
export const LOOK_MEDIA = Object.freeze([
    '(max-width: 679.98px)',
    '(min-width: 680px)',
    '(prefers-reduced-motion: reduce)',
]);

/**
 * The attributes a look sheet may match a value on, and the values it may
 * match: state the app writes from a closed set of its own words. Read from
 * every served sheet on 2026-09-24 (the step-4 critic's item 7, re-checked:
 * `stall.css`, `window.css`, `broadcast.css` and `obsGuide.css` use exactly
 * these; the looks use `aria-current`, `aria-pressed` and `data-price-tier`).
 * A value selector is how a sheet singles out one element among many, so the
 * list is closed: a value a look needs is a line added here with its reason,
 * never a partial match.
 */
export const STATE_ATTRIBUTES = Object.freeze({
    'aria-current': Object.freeze(['page']),
    'aria-disabled': Object.freeze(['true']),
    'aria-pressed': Object.freeze(['true']),
    'data-code': Object.freeze(['false']),
    'data-copied': Object.freeze(['shown', 'true']),
    'data-edge': Object.freeze(['top']),
    'data-format': Object.freeze(['square', 'story', 'stream', 'tag']),
    'data-mode': Object.freeze(['browse', 'cycle', 'rail']),
    'data-over': Object.freeze(['true']),
    'data-paying': Object.freeze(['on']),
    'data-preset': Object.freeze(['corner', 'rail']),
    'data-price-tier': Object.freeze(['1', '2', '3']),
    'data-role': Object.freeze([
        'announcement',
        'pay-final',
        'poster-print',
        'price',
        'seller-price',
        'studio-card-share',
    ]),
    'data-side': Object.freeze(['left']),
    'data-state': Object.freeze(['stale']),
    'data-tier': Object.freeze(['1', '2', '3']),
    'data-tool': Object.freeze(['window']),
    'data-touch': Object.freeze(['on']),
    'data-turn': Object.freeze(['ccw', 'cw']),
});

/** Attributes a look sheet may test for presence alone (`[open]`), never for a value. */
export const PRESENCE_ATTRIBUTES = Object.freeze(['data-marquee', 'data-mq', 'disabled', 'hidden', 'open', 'readonly']);

/**
 * Attributes whose value carries a seller's words, a token id, an address or
 * a link — `data-focus-key` is `pin:<the stall>` and `item-open:<token>`,
 * `aria-label` is the copy control's whole address, `href` is the stall's
 * own path. Matching any of them is how one look would paint one seller's
 * stall differently from everyone else's. Every attribute off the two lists
 * above is refused anyway; these are named so the refusal says why.
 */
export const SELLER_ATTRIBUTES = Object.freeze([
    'alt',
    'aria-label',
    'data-focus-key',
    'data-mq-key',
    'data-pay-uri',
    'data-tk-key',
    'data-token-id',
    'href',
    'src',
    'title',
]);

/**
 * What `content` on a `::before` or `::after` may print, compared after its
 * escapes are decoded: nothing (a box to paint), Neo's `// ` section mark,
 * and the ticker's `\25c6` diamond (`broadcast.css`, carried into no look
 * today). A digit, a letter or a currency sign printed by a stylesheet reads
 * as the page's own words beside a price, so the list is closed. `none` and
 * `normal` print nothing and pass as well.
 */
export const GENERATED_TEXT = Object.freeze(['', '// ', '\u25c6']);

const PARTIAL_MATCH = new Set(['~=', '|=', '^=', '$=', '*=']);

const ATTRIBUTE_SELECTOR =
    /^\s*([^\s~|^$*="'\]]+)\s*(?:([~|^$*]?=)\s*("(?:[^"\\]|\\[\s\S])*"|'(?:[^'\\]|\\[\s\S])*'|[^\s"']+)\s*([a-z])?)?\s*$/i;

/**
 * The text with every CSS escape decoded: `\25c6 ` is `◆`, `\"` is `"`, and a
 * backslash before a newline (a string's line continuation) is nothing.
 */
export function decodeEscapes(text) {
    return String(text).replace(
        /\\(?:([0-9a-f]{1,6})(?:\r\n|[ \t\r\n\f])?|(\r\n|[\r\n\f])|([\s\S]))/gi,
        (_all, hex, newline, char) => {
            if (hex !== undefined) {
                const code = parseInt(hex, 16);
                return code === 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)
                    ? '�'
                    : String.fromCodePoint(code);
            }
            return newline !== undefined ? '' : char;
        },
    );
}

/** The inside of every `[…]` in a selector, outside strings, at any depth — inside `:has()` and `:not()` too. */
function attributeBlocks(selector) {
    const out = [];
    let i = 0;
    while (i < selector.length) {
        const c = selector[i];
        if (c === '"' || c === "'") {
            i = skipString(selector, i);
            continue;
        }
        if (c === '[') {
            let j = i + 1;
            while (j < selector.length && selector[j] !== ']') {
                j = selector[j] === '"' || selector[j] === "'" ? skipString(selector, j) : j + 1;
            }
            out.push(selector.slice(i + 1, j));
            i = j + 1;
            continue;
        }
        i += 1;
    }
    return out;
}

/**
 * Why one attribute selector — the text between its brackets — may not be in
 * a look sheet, or undefined. G3: exact values on the state attributes
 * above, presence on those and the presence-only ones, nothing else.
 */
export function attributeProblem(inner) {
    const shown = `[${echo(inner.trim(), 48)}]`;
    const m = ATTRIBUTE_SELECTOR.exec(inner);
    if (m === null) {
        return `${shown}: an attribute selector this lint does not read (a namespace, or more than a name and one value) — match a state attribute by its exact value`;
    }
    const [, rawName, op, rawValue, flag] = m;
    const name = decodeEscapes(rawName).toLowerCase();
    if (op !== undefined && PARTIAL_MATCH.has(op)) {
        return `${shown}: a partial match (${op}) can pick one seller's link, label or token out of every stall — match a state attribute by its exact value`;
    }
    if (SELLER_ATTRIBUTES.includes(name)) {
        return `${shown}: ${name} carries a seller's words, a token id, an address or a link — a look paints every stall alike`;
    }
    const values = Object.hasOwn(STATE_ATTRIBUTES, name) ? STATE_ATTRIBUTES[name] : undefined;
    if (values === undefined && !PRESENCE_ATTRIBUTES.includes(name)) {
        return `${shown}: ${echo(name, 32)} is not one of the state attributes a look may match (STATE_ATTRIBUTES and PRESENCE_ATTRIBUTES in scripts/workshop-css.mjs)`;
    }
    if (op === undefined) {
        return undefined;
    }
    if (values === undefined) {
        return `${shown}: ${name} is matched by its presence alone, never by a value`;
    }
    if (flag !== undefined) {
        return `${shown}: no "${echo(flag, 4)}" flag — match the value exactly as the app writes it`;
    }
    const value = /^["']/.test(rawValue) ? decodeEscapes(rawValue.slice(1, -1)) : decodeEscapes(rawValue);
    if (!values.includes(value)) {
        return `${shown}: "${echo(value, 32)}" is not a value of ${name} a look may match (${values.join(', ')})`;
    }
    return undefined;
}

/** The selector with its strings and the insides of its `[…]` blanked; parentheses are kept. */
function blankAttributes(selector) {
    let out = '';
    let i = 0;
    while (i < selector.length) {
        const c = selector[i];
        if (c === '"' || c === "'") {
            const end = skipString(selector, i);
            out += ' '.repeat(Math.min(end, selector.length) - i);
            i = end;
            continue;
        }
        if (c === '[') {
            let j = i + 1;
            while (j < selector.length && selector[j] !== ']') {
                j = selector[j] === '"' || selector[j] === "'" ? skipString(selector, j) : j + 1;
            }
            out += `[${' '.repeat(Math.max(0, Math.min(j, selector.length) - i - 1))}`;
            i = j;
            continue;
        }
        out += c;
        i += 1;
    }
    return out;
}

/** Pseudo-elements written with one colon, as CSS 2 did: still pseudo-elements. */
const LEGACY_PSEUDO_ELEMENTS = new Set(['before', 'after', 'first-letter', 'first-line']);

/** Every pseudo-class and pseudo-element a selector names, in order, lower case. */
function pseudoTokens(selector) {
    const out = [];
    for (const m of blankAttributes(selector).matchAll(/(::?)(-?[a-z_][\w-]*)/gi)) {
        const name = m[2].toLowerCase();
        out.push({ name, element: m[1] === '::' || LEGACY_PSEUDO_ELEMENTS.has(name) });
    }
    return out;
}

/** The last pseudo-element a selector names, or undefined: which box a `content` lands in. */
function lastPseudoElement(selector) {
    const elements = pseudoTokens(selector).filter((token) => token.element);
    return elements.length === 0 ? undefined : elements[elements.length - 1].name;
}

/** Why one selector of a look sheet may not stand (G3's attributes, G2's pseudo-elements, G4's engine-gated ones). */
function selectorProblems(selector) {
    const out = [];
    for (const inner of attributeBlocks(selector)) {
        const why = attributeProblem(inner);
        if (why !== undefined) out.push(why);
    }
    for (const { name, element } of pseudoTokens(selector)) {
        const shown = `${element ? '::' : ':'}${name}`;
        if (name.startsWith('-')) {
            out.push(
                `${shown} is one engine's selector — every other engine drops the whole rule, so a reader's browser paints a page the probe (Chrome) never measured`,
            );
        } else if (!element) {
            continue;
        } else if (name === 'first-letter' || name === 'first-line') {
            out.push(`${shown} restyles part of a line of text — a figure could lose its first digit to it`);
        } else if (name === 'marker') {
            out.push(`${shown} is a list marker, which prints a counter — a look prints no text of its own`);
        } else if (name !== 'before' && name !== 'after') {
            out.push(`${shown} is not ::before or ::after, the only pseudo-elements a look may dress`);
        }
    }
    return out;
}

/** The declarations of a block as `{ prop, value }`, the property lower case and the value's whitespace collapsed. */
export function declarationsOf(body) {
    const out = [];
    for (const part of splitTopLevel(body, ';')) {
        const colon = part.indexOf(':');
        if (colon <= 0) continue;
        out.push({
            prop: part.slice(0, colon).trim().toLowerCase(),
            value: part.slice(colon + 1).trim().replace(/\s+/g, ' '),
        });
    }
    return out;
}

/** The value with its strings and everything inside parentheses blanked: what is left is the value's own keywords. */
function keywordsOf(value) {
    let out = '';
    let depth = 0;
    let i = 0;
    while (i < value.length) {
        const c = value[i];
        if (c === '"' || c === "'") {
            const end = skipString(value, i);
            out += ' '.repeat(Math.min(end, value.length) - i);
            i = end;
            continue;
        }
        if (c === '(') depth += 1;
        out += depth > 0 ? ' ' : c;
        if (c === ')') depth = Math.max(0, depth - 1);
        i += 1;
    }
    return out;
}

/** The value with its strings blanked, functions kept: for finding a function by name. */
function withoutStrings(value) {
    let out = '';
    let i = 0;
    while (i < value.length) {
        const c = value[i];
        if (c === '"' || c === "'") {
            const end = skipString(value, i);
            out += ' '.repeat(Math.min(end, value.length) - i);
            i = end;
            continue;
        }
        out += c;
        i += 1;
    }
    return out;
}

const word = (keyword) => new RegExp(`(?<![\\w-])${keyword}(?![\\w-])`, 'i');

/**
 * Properties a look sheet may not set at all, with the reason. G2's text
 * roads — a stylesheet printing, hiding or mirroring text — G4's ink roads,
 * which paint text in a colour the contrast pass never reads, and the
 * scroll-driven timelines the flash rule (G6) cannot count.
 */
const REFUSED_PROPERTIES = Object.freeze({
    quotes: 'quotes is the text open-quote and close-quote print — a look prints no text of its own',
    'counter-reset': 'a counter is text a list marker or counter() prints — a look prints no text of its own',
    'counter-increment': 'a counter is text a list marker or counter() prints — a look prints no text of its own',
    'counter-set': 'a counter is text a list marker or counter() prints — a look prints no text of its own',
    '-webkit-text-security': 'draws a disc in place of every character — a figure it covers cannot be read',
    '-webkit-box-reflect': 'paints a mirrored copy of the element, text and all, where the probe measures nothing',
    '-webkit-text-fill-color': 'paints text in a colour the contrast pass never reads (it reads color)',
    '-webkit-text-stroke': 'outlines text in a colour the contrast pass never reads',
    '-webkit-text-stroke-color': 'outlines text in a colour the contrast pass never reads',
    '-webkit-text-stroke-width': 'outlines text in a colour the contrast pass never reads',
    // G6: a scroll-driven animation runs as fast as the reader scrolls, so
    // no duration bounds how often it can flash.
    'animation-timeline': 'ties an animation to the scroll, where no duration bounds how often it flashes',
    'animation-range': 'ties an animation to the scroll, where no duration bounds how often it flashes',
    'animation-range-start': 'ties an animation to the scroll, where no duration bounds how often it flashes',
    'animation-range-end': 'ties an animation to the scroll, where no duration bounds how often it flashes',
    'scroll-timeline': 'defines a scroll timeline, where no duration bounds how often an animation flashes',
    'scroll-timeline-name': 'defines a scroll timeline, where no duration bounds how often an animation flashes',
    'scroll-timeline-axis': 'defines a scroll timeline, where no duration bounds how often an animation flashes',
    'view-timeline': 'defines a scroll timeline, where no duration bounds how often an animation flashes',
    'view-timeline-name': 'defines a scroll timeline, where no duration bounds how often an animation flashes',
    'view-timeline-axis': 'defines a scroll timeline, where no duration bounds how often an animation flashes',
    'view-timeline-inset': 'defines a scroll timeline, where no duration bounds how often an animation flashes',
    'timeline-scope': 'defines a scroll timeline, where no duration bounds how often an animation flashes',
});

/**
 * Properties whose value these rules read for a keyword — a fixed box, a
 * right-to-left run, a list marker, a clip to the text — so a `var()` there
 * would carry the keyword past them. Written plainly in a look sheet; none of
 * the shipped ones sets any of them through a variable.
 */
const READ_PLAINLY = new Set([
    'position',
    'direction',
    'unicode-bidi',
    'display',
    'text-overflow',
    'background-clip',
    '-webkit-background-clip',
    'list-style',
    'list-style-type',
    'list-style-image',
]);

/**
 * Properties that print a glyph of their own, and the one value each may
 * take: a hyphenation point's string, emphasis marks over every character.
 */
const PRINTING_KEYWORD = Object.freeze({
    'hyphenate-character': 'auto',
    '-webkit-hyphenate-character': 'auto',
    'text-emphasis': 'none',
    'text-emphasis-style': 'none',
    '-webkit-text-emphasis': 'none',
    '-webkit-text-emphasis-style': 'none',
});

/**
 * Where a quoted string may stand at the top of a value in a look sheet:
 * `content` (held to `GENERATED_TEXT`), a font's family name and features,
 * the grid templates' area names, and a custom property (whose every reader
 * above is held on its own). A string anywhere else is text some property
 * prints — `hyphenate-character`, `text-overflow`, a list marker — or one a
 * later CSS will; a string inside `url()` is the kit's art rule's.
 */
const STRING_PROPERTIES = new Set([
    'content',
    'font-family',
    'font-feature-settings',
    'font-variation-settings',
    'grid-template-areas',
    'grid-template',
    'grid',
]);

/** True when a quoted string stands in the value outside every function. */
function stringAtTopLevel(value) {
    let depth = 0;
    for (let i = 0; i < value.length; i += 1) {
        const c = value[i];
        if (c === '"' || c === "'") {
            if (depth === 0) return true;
            i = skipString(value, i) - 1;
        } else if (c === '(') depth += 1;
        else if (c === ')') depth = Math.max(0, depth - 1);
    }
    return false;
}

const VENDOR_PREFIX = /^-(webkit|moz|ms|o)-/;

/**
 * Prefixed properties every engine reads under the prefix, so they need no
 * twin: the line-clamp idiom (`display: -webkit-box`, `-webkit-box-orient:
 * vertical`, `-webkit-line-clamp: N`), which CSS Overflow 4 keeps as the
 * legacy form Chrome, Firefox and Safari all implement — and whose
 * unprefixed `line-clamp` is the one that is not everywhere. Found by the
 * Neo starter, which carries `broadcast.css`'s `-webkit-line-clamp: 3` on the
 * stream card's name (2026-09-24); the twin rule is about engine-gated
 * prefixes, and this one is not.
 */
const PREFIXED_EVERYWHERE = new Set(['-webkit-line-clamp', '-webkit-box-orient']);

/**
 * Why the declarations of one block may not stand, or nothing: G2 (generated
 * text and every other text road), G4 (`!important`, a fixed or sticky
 * position, a prefixed property with no twin, the ink roads). `selectors` is
 * the rule's selector list, or undefined inside a keyframe, where `content`
 * is refused outright.
 */
function declarationProblems(decls, selectors) {
    const out = [];
    for (const { prop, value } of decls) {
        const shown = `${prop}: ${echo(value, 48)}`;
        const bare = withoutStrings(value);
        if (/!\s*important/i.test(bare)) {
            out.push(
                `${shown} — !important outranks the look's own inline values (a mood's palette, the contrast fence on the tokens); write the selector more specifically instead`,
            );
        }
        const clean = value.replace(/\s*!\s*important\s*$/i, '').trim();
        const keywords = keywordsOf(clean);
        if (prop === 'content') {
            out.push(...contentProblems(clean, selectors));
        }
        const fn = /(?<![\w-])(attr|counters?)\s*\(/i.exec(bare);
        if (fn !== null) {
            out.push(`${shown} — ${fn[1].toLowerCase()}() prints text taken from the page or a counter`);
        }
        if (Object.hasOwn(REFUSED_PROPERTIES, prop)) {
            out.push(`${prop} — ${REFUSED_PROPERTIES[prop]}`);
            continue;
        }
        if (Object.hasOwn(PRINTING_KEYWORD, prop) && clean.toLowerCase() !== PRINTING_KEYWORD[prop]) {
            out.push(`${shown} — ${prop} prints a glyph of its own beside the page's text; a look leaves it ${PRINTING_KEYWORD[prop]}`);
        } else if (
            !STRING_PROPERTIES.has(prop) &&
            !prop.startsWith('--') &&
            !prop.startsWith('list-style') &&
            prop !== 'text-overflow' &&
            stringAtTopLevel(clean)
        ) {
            out.push(`${shown} — a string here is text the look would print; a string stands only in content, a font's names and features, and the grid templates`);
        }
        if (READ_PLAINLY.has(prop) && /(?<![\w-])var\s*\(/i.test(bare)) {
            out.push(`${shown} — write ${prop} plainly: a var() here carries a value past these rules`);
        }
        if (prop.startsWith('--') && word('text').test(keywords)) {
            out.push(`${shown} — a custom property holding "text" is how a background clipped to the text hides in a shorthand`);
        }
        if ((prop === 'list-style' || prop === 'list-style-type' || prop === 'list-style-image') && clean.toLowerCase() !== 'none') {
            out.push(`${shown} — a list marker prints a counter or a string; a look's lists stay list-style: none`);
        }
        if (prop === 'display' && word('list-item').test(keywords)) {
            out.push(`${shown} — a list item grows a marker, which prints a counter`);
        }
        if (prop === 'unicode-bidi' && /override/i.test(keywords)) {
            out.push(`${shown} — overriding the bidi order reorders the characters of a figure`);
        }
        if (prop === 'direction' && word('rtl').test(keywords)) {
            out.push(`${shown} — right-to-left reorders a figure against its unit`);
        }
        if (prop === 'text-overflow' && /["']/.test(clean)) {
            out.push(`${shown} — a string here is text the look prints in place of the page's own`);
        }
        if (
            (prop === 'background-clip' || prop === '-webkit-background-clip' || prop === 'background') &&
            word('text').test(keywords)
        ) {
            out.push(`${shown} — a background clipped to the text paints the text's ink where the contrast pass reads color`);
        }
        if (prop === 'position' && /(?<![\w-])(fixed|sticky|-webkit-sticky)(?![\w-])/i.test(keywords)) {
            out.push(
                `${shown} — a fixed or sticky box follows the scroll, and can stand over a figure at a position the probe never scrolled to`,
            );
        }
        const prefixed = PREFIXED_EVERYWHERE.has(prop) ? null : VENDOR_PREFIX.exec(prop);
        if (prefixed !== null) {
            const twin = prop.slice(prefixed[0].length);
            const same = decls.some((d) => d.prop === twin && d.value.replace(/\s*!\s*important\s*$/i, '') === clean);
            if (!same) {
                out.push(
                    `${shown} — a prefixed property paints only in the engines that read the prefix; write ${twin}: with the same value beside it`,
                );
            }
        }
    }
    return out;
}

/** G2: `content` only on `::before` / `::after`, and only one of `GENERATED_TEXT` (or none / normal). */
function contentProblems(value, selectors) {
    const out = [];
    if (selectors === undefined) {
        return ['content in a keyframe — a look prints no text of its own, still or moving'];
    }
    for (const selector of selectors) {
        const element = lastPseudoElement(selector);
        if (element !== 'before' && element !== 'after') {
            out.push(
                `content on "${echo(selector)}" — only ::before and ::after may carry content (on an element, content: url() replaces the element)`,
            );
        }
    }
    const keyword = value.toLowerCase();
    if (keyword === 'none' || keyword === 'normal') {
        return out;
    }
    const single = /^["']/.test(value) && skipString(value, 0) === value.length;
    const printed = single ? decodeEscapes(value.slice(1, -1)) : undefined;
    if (printed === undefined || !GENERATED_TEXT.includes(printed)) {
        const allowed = GENERATED_TEXT.map((text) => JSON.stringify(text)).join(', ');
        out.push(
            `content: ${echo(value, 48)} — a look prints only ${allowed} (escapes decoded), or none; a digit, a letter or a currency sign would read as the page's own words`,
        );
    }
    return out;
}

/** The normalised condition of a `@media` prelude: lower case, one space after each colon. */
function mediaCondition(prelude) {
    return prelude
        .replace(/^@media\s*/i, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/\(\s*/g, '(')
        .replace(/\s*\)/g, ')')
        .replace(/\s*:\s*/g, ': ')
        .trim();
}

/** Why an at-rule a look sheet may not hold is refused (every at-rule but `@media` and `@keyframes` is). */
const REFUSED_AT_RULES = Object.freeze({
    import: '@import is not allowed — a look sheet is one file',
    'font-face': '@font-face is not allowed — a look uses one of the shipped font stacks',
    supports:
        "@supports gates rules on what an engine supports, so a reader's browser can paint rules Chrome skipped for the probe (or the reverse)",
    container:
        '@container sizes rules to a box the probe does not choose, and its style() queries match values the page writes',
    layer: "@layer re-orders the cascade against the app's own sheets",
    property:
        '@property changes how a custom property animates and inherits, and an engine without it paints the unregistered form',
    'counter-style': '@counter-style defines text a list marker or counter() prints — a look prints no text of its own',
});

/**
 * One look sheet's static rules — `kit` adds the kit's own (art, `src()`,
 * `wk-` keyframes) to what every look sheet obeys. Shared by `lintSheet` and
 * `lintLookSheet`, so a rule the shipped looks obey is a rule the kit obeys.
 */
function lintLook(css, { scope, kit, art }) {
    const { text, nodes, errors } = parseSheet(css);
    const problems = errors.map((e) => `line ${lineOf(text, e.at)}: ${e.message}`);
    const at = (index, message) => problems.push(`line ${lineOf(text, index)}: ${message}`);

    const walk = (list) => {
        for (const node of list) {
            if (node.kind === 'rule') {
                if (braceOutsideStrings(node.body)) {
                    at(node.start, `"${echo(node.prelude)}" holds a nested rule — write it flat, under .${scope}`);
                }
                const selectors = splitTopLevel(node.prelude, ',');
                for (const selector of selectors) {
                    const escape = selectorEscape(selector, scope);
                    if (escape !== undefined) at(node.start, escape);
                    for (const why of selectorProblems(selector)) at(node.start, why);
                }
                for (const why of declarationProblems(declarationsOf(node.body), selectors)) at(node.start, why);
                continue;
            }
            if (node.name === 'keyframes') {
                const name = node.prelude.replace(/^@keyframes\s*/i, '').trim();
                if (kit && !/^wk-[\w-]+$/.test(name)) {
                    at(node.start, `@keyframes "${echo(name)}" must be named wk-… (keyframes are global)`);
                }
                const stopErrors = [];
                for (const stop of parseList(node.body ?? '', 0, (node.body ?? '').length, stopErrors)) {
                    if (stop.kind === 'rule') {
                        for (const why of declarationProblems(declarationsOf(stop.body), undefined)) at(node.start, why);
                    }
                }
            } else if (node.name === 'media' && !node.statement) {
                const condition = mediaCondition(node.prelude);
                if (!LOOK_MEDIA.includes(condition)) {
                    at(
                        node.start,
                        `@media ${echo(condition)} is not a condition the probe enters — a look may use ${LOOK_MEDIA.join(', ')}`,
                    );
                }
                walk(node.children ?? []);
            } else {
                const why = Object.hasOwn(REFUSED_AT_RULES, node.name)
                    ? REFUSED_AT_RULES[node.name]
                    : `@${echo(node.name)} is not allowed in a look sheet — @media and @keyframes are`;
                at(node.start, node.name === 'container' && /style\s*\(/i.test(node.prelude) ? `${why} (here: style())` : why);
                walk(node.children ?? []);
            }
        }
    };
    walk(nodes);

    if (kit) {
        const listed = new Set(art);
        for (const target of urlTargets(text)) {
            const why = urlProblem(target.value, listed);
            if (why !== undefined) at(target.at, `url "${echo(target.value)}": ${why}`);
        }
        for (const m of text.matchAll(/(?<![\w-])src\(/gi)) {
            at(m.index, `src() is not allowed — ${ART_RULE}`);
        }
    }
    const escape = escapeOutsideStrings(text);
    if (escape >= 0) {
        at(escape, 'a CSS escape outside a string — write the name plainly');
    }

    const last = nodes[nodes.length - 1];
    if (last === undefined || !isReduceBlock(last)) {
        problems.push(
            'the last rule must be @media (prefers-reduced-motion: reduce) { … }, where anything that moves is stilled',
        );
    }
    return problems;
}

/**
 * The kit's static rules over one sheet, as a list of sentences with line
 * numbers — empty when the sheet passes.
 *
 * 1. Every selector is under `.t-workshop` (at-rule wrappers allowed).
 * 2. No `@import`, no `@font-face`, and no at-rule but `@media` — on one of
 *    `LOOK_MEDIA`'s conditions — and `@keyframes`.
 * 3. Every `url()` and `image-set()` target is `art/<name>.svg` naming a
 *    file in `art` (the plain files of the sheet's `art/` folder); no
 *    `src()`; and no CSS escape outside a string, which is how a `url(` or
 *    a scheme would hide from rule 3.
 * 4. Every `@keyframes` is named `wk-…`: keyframes are global, and a look
 *    must never replace one of Stall's.
 * 5. The last rule of the sheet is `@media (prefers-reduced-motion: reduce)`,
 *    so a mover can never be declared after the block that stills it.
 * 6. Every rule a shipped look obeys (`lintLookSheet`): attribute selectors
 *    from the state lists, generated text from `GENERATED_TEXT` on
 *    `::before` / `::after` alone, no other text road, no `!important`, no
 *    fixed or sticky box, no prefixed property without its twin, no ink road.
 *
 * The flash rule reads every sheet at once and is `flashReport`'s.
 */
export function lintSheet(css, { art = [] } = {}) {
    return lintLook(css, { scope: KIT_CLASS, kit: true, art });
}

/**
 * A shipped look's sheet under the rules every look sheet obeys (rules 1, 2,
 * 5 and 6 of `lintSheet`, scoped to the look's own class, and no escape
 * outside a string). The kit's art and keyframe-name rules are the kit's:
 * a shipped sheet is Stall's own, built and reviewed here.
 */
export function lintLookSheet(css, { lookClass }) {
    return lintLook(css, { scope: lookClass, kit: false, art: [] });
}

/* ---------- G6: how often a keyframe flashes, read from the sheets ---------- */

/**
 * WCAG 2.3.1: nothing flashes more than three times in any one second. A
 * flash is a pair of opposing changes, so this is six changes in a window
 * and not seven.
 */
export const MAX_FLASHES_PER_SECOND = 3;

/**
 * Animated properties that move or size a thing without changing what the
 * pixel under it shows. Every other animated property — opacity, colour,
 * background (position included: a background that jumps is a flash),
 * filter, visibility, shadows, a custom property that a colour reads — counts
 * toward a flash, so a property this list forgot errs toward a refusal.
 */
const MOVEMENT = new Set([
    'transform',
    'translate',
    'rotate',
    'scale',
    'transform-origin',
    'left',
    'right',
    'top',
    'bottom',
    'inset',
    'width',
    'height',
    'margin',
    'margin-top',
    'margin-right',
    'margin-bottom',
    'margin-left',
    'padding',
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
    'grid-template-rows',
    'grid-template-columns',
    'outline-offset',
]);

/** A value this reader could not work out: a `var()` nothing declares, set by script at run time. */
const UNKNOWN = '\u0000?';

const CYCLE_CAP = 10000;

function timeOf(token) {
    const literal = /^([+-]?(?:\d*\.)?\d+)(ms|s)$/i.exec(token);
    if (literal !== null) {
        return Number(literal[1]) / (literal[2].toLowerCase() === 'ms' ? 1000 : 1);
    }
    const calc = /^calc\(\s*([^()]*)\s*\)$/i.exec(token);
    if (calc !== null) {
        const parts = calc[1].split(/\s*([*/])\s*/);
        if (parts.length !== 3) return undefined;
        const [a, op, b] = parts;
        const time = timeOf(a) ?? timeOf(b);
        const number = /^[+-]?(?:\d*\.)?\d+$/.test(b) ? Number(b) : /^[+-]?(?:\d*\.)?\d+$/.test(a) ? Number(a) : undefined;
        if (time === undefined || number === undefined || (op === '/' && timeOf(a) === undefined)) return undefined;
        return op === '*' ? time * number : time / number;
    }
    return undefined;
}

/** The first top-level comma in `text`, or -1. */
function firstComma(text) {
    let depth = 0;
    for (let i = 0; i < text.length; i += 1) {
        const c = text[i];
        if (c === '"' || c === "'") {
            i = skipString(text, i) - 1;
            continue;
        }
        if (c === '(') depth += 1;
        else if (c === ')') depth -= 1;
        else if (c === ',' && depth === 0) return i;
    }
    return -1;
}

/**
 * Every value `text` can take once its `var()`s are replaced by the values
 * the sheets and the theme table give them (and each one's fallback). A
 * `var()` nothing declares becomes `UNKNOWN`, which the readers below treat
 * as "could be anything".
 */
function expandVars(text, lookup, depth = 0, budget = { left: 512 }) {
    const m = /var\(/i.exec(text);
    if (m === null) return [text];
    const open = m.index + m[0].length - 1;
    const close = closingParen(text, open);
    if (close < 0 || depth > 8 || budget.left <= 0) {
        return [text.slice(0, m.index) + UNKNOWN];
    }
    const inner = text.slice(open + 1, close);
    const comma = firstComma(inner);
    const name = (comma < 0 ? inner : inner.slice(0, comma)).trim();
    const candidates = [...(lookup.get(name) ?? [])];
    if (comma >= 0) candidates.push(inner.slice(comma + 1).trim());
    if (candidates.length === 0) candidates.push(UNKNOWN);
    const out = [];
    for (const candidate of new Set(candidates)) {
        for (const value of expandVars(text.slice(0, m.index) + candidate + text.slice(close + 1), lookup, depth + 1, budget)) {
            out.push(value);
            budget.left -= 1;
        }
    }
    return out;
}

const TIMING_WORDS = new Set(['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'step-start', 'step-end']);
const FILL_WORDS = new Set(['forwards', 'backwards', 'both']);
const PLAY_WORDS = new Set(['running', 'paused']);
const DIRECTION_WORDS = new Set(['normal', 'reverse', 'alternate', 'alternate-reverse']);
const GLOBAL_WORDS = new Set(['inherit', 'initial', 'unset', 'revert', 'revert-layer']);

/**
 * One single animation of an `animation` shorthand, as `{ name, seconds,
 * iterations, alternate }`: `seconds` is undefined when this reader cannot
 * tell it and null when the shorthand gives none (0s, which shows nothing).
 * A value it cannot read counts as an endless one.
 */
function parseSingleAnimation(text) {
    let name;
    let seconds = null;
    let times = 0;
    let iterations = 1;
    let alternate = false;
    for (const token of splitTopLevel(text, ' ')) {
        const lower = token.toLowerCase();
        if (token.includes(UNKNOWN)) {
            if (times === 0) seconds = undefined;
            iterations = Infinity;
            if (name === undefined && token === UNKNOWN) name = UNKNOWN;
            continue;
        }
        const time = timeOf(lower);
        if (time !== undefined || /^calc\(/.test(lower)) {
            if (times === 0 && seconds !== undefined) seconds = time;
            times += 1;
            continue;
        }
        if (lower === 'infinite') {
            iterations = Infinity;
        } else if (/^[+-]?(?:\d*\.)?\d+$/.test(lower)) {
            iterations = Number(lower);
        } else if (DIRECTION_WORDS.has(lower)) {
            alternate = alternate || lower.startsWith('alternate');
        } else if (
            TIMING_WORDS.has(lower) ||
            FILL_WORDS.has(lower) ||
            PLAY_WORDS.has(lower) ||
            GLOBAL_WORDS.has(lower) ||
            lower === 'none' ||
            /^(steps|cubic-bezier|linear)\(/.test(lower)
        ) {
            continue;
        } else if (name === undefined || name === UNKNOWN) {
            name = token;
        }
    }
    return { name, seconds, iterations, alternate };
}

/** The class names in a selector's subject — its last compound — which is the element the rule animates. */
function subjectClasses(selector) {
    const compounds = flatten(selector).trim().split(/\s*[>+~]\s*|\s+/);
    const subject = compounds[compounds.length - 1] ?? '';
    return new Set([...subject.matchAll(/\.([\w-]+)/g)].map((m) => m[1]));
}

/** Every qualified rule of a parsed sheet, grouping at-rules opened (their conditions do not matter here). */
function allRules(nodes) {
    const out = [];
    for (const node of nodes) {
        if (node.kind === 'rule') out.push(node);
        else if (node.children !== undefined) out.push(...allRules(node.children));
    }
    return out;
}

/** A keyframe's stops as `{ at, decls }`, `at` from 0 to 1, in source order. */
function keyframeStops(body) {
    const stops = [];
    for (const node of parseList(body, 0, body.length, [])) {
        if (node.kind !== 'rule') continue;
        const decls = declarationsOf(node.body).filter((d) => !d.prop.startsWith('animation-'));
        for (const selector of splitTopLevel(node.prelude, ',')) {
            const key = selector.trim().toLowerCase();
            const at =
                key === 'from' ? 0 : key === 'to' ? 1 : /^(?:\d*\.)?\d+%$/.test(key) ? parseFloat(key) / 100 : undefined;
            if (at !== undefined) stops.push({ at: Math.min(1, Math.max(0, at)), decls });
        }
    }
    return stops;
}

function numeric(value) {
    const m = /^([+-]?(?:\d*\.)?\d+(?:e[+-]?\d+)?)([a-z%]*)$/i.exec(value);
    return m === null ? undefined : { n: Number(m[1]), unit: m[2].toLowerCase() };
}

/** +1 or -1 when both values are numbers in one unit, else 0 (unknown direction, which never merges). */
function direction(from, to) {
    const a = numeric(from);
    const b = numeric(to);
    if (a === undefined || b === undefined || a.unit !== b.unit || a.n === b.n) return 0;
    return b.n > a.n ? 1 : -1;
}

/** True when a keyframe changes anything a flash is made of. */
function flashes(stops) {
    return stops.some((stop) => stop.decls.some((d) => !MOVEMENT.has(d.prop)));
}

/**
 * The most changes, and so flashes, any one-second window holds when a
 * keyframe runs for `seconds` a cycle, `iterations` times, alternating or
 * not. Per property: the declared stops (an endpoint a keyframe leaves out is
 * the element's own value, unknown here and so different from every declared
 * one), each change between two stops that differ — a run of changes the
 * same way in a number merged into one — and, cycle to cycle, the jump from
 * the last value back to the first. Changes of several properties at one
 * instant are one change; two of one property at one instant (a ramp's end
 * and the jump back) are two.
 */
export function keyframeFlashes(stops, { seconds, iterations = Infinity, alternate = false }) {
    const byProperty = new Map();
    for (const stop of [...stops].sort((a, b) => a.at - b.at)) {
        for (const { prop, value } of stop.decls) {
            if (MOVEMENT.has(prop)) continue;
            if (!byProperty.has(prop)) byProperty.set(prop, new Map());
            byProperty.get(prop).set(stop.at, value);
        }
    }
    if (!(seconds > 0) || byProperty.size === 0 || !(iterations > 0)) {
        return { changes: 0, flashes: 0 };
    }
    const cycles = Math.min(
        CYCLE_CAP,
        Number.isFinite(iterations) ? Math.ceil(iterations) : Math.ceil(1 / seconds) + 3,
    );
    const weight = new Map();
    for (const values of byProperty.values()) {
        const points = [...values].map(([at, value]) => ({ at, value }));
        if (points[0].at > 0) points.unshift({ at: 0, value: UNKNOWN });
        if (points[points.length - 1].at < 1) points.push({ at: 1, value: UNKNOWN });
        const changes = [];
        for (let i = 1; i < points.length; i += 1) {
            if (points[i].value === points[i - 1].value) continue;
            const dir = direction(points[i - 1].value, points[i].value);
            const last = changes[changes.length - 1];
            if (last !== undefined && dir !== 0 && last.dir === dir) {
                last.end = points[i].at;
            } else {
                changes.push({ start: points[i - 1].at, end: points[i].at, dir });
            }
        }
        const first = points[0].value;
        const final = points[points.length - 1].value;
        const events = [];
        for (let c = 0; c < cycles; c += 1) {
            const reversed = alternate && c % 2 === 1;
            if (!alternate && c > 0 && first !== final) {
                events.push({ t: c, dir: direction(final, first) });
            }
            const order = reversed ? [...changes].reverse() : changes;
            for (const change of order) {
                events.push(
                    reversed ? { t: c + 1 - change.start, dir: -change.dir } : { t: c + change.end, dir: change.dir },
                );
            }
        }
        const merged = [];
        for (const event of events) {
            const last = merged[merged.length - 1];
            if (last !== undefined && event.dir !== 0 && last.dir === event.dir) last.t = event.t;
            else merged.push({ ...event });
        }
        const local = new Map();
        for (const event of merged) {
            const key = Math.round(event.t * seconds * 1e6);
            local.set(key, (local.get(key) ?? 0) + 1);
        }
        for (const [key, count] of local) weight.set(key, Math.max(weight.get(key) ?? 0, count));
    }
    const times = [...weight].sort((a, b) => a[0] - b[0]);
    let best = 0;
    let sum = 0;
    let low = 0;
    for (let high = 0; high < times.length; high += 1) {
        sum += times[high][1];
        while (times[high][0] - times[low][0] >= 1e6) {
            sum -= times[low][1];
            low += 1;
        }
        best = Math.max(best, sum);
    }
    return { changes: best, flashes: Math.floor(best / 2) };
}

/**
 * G6, static: every `@keyframes` in `sheets` (`[{ name, css }]`) at every
 * timing a rule gives it, with the most flashes any second of it holds.
 *
 * A rule gives a keyframe its timings through an `animation` shorthand or
 * `animation-name` beside the timing longhands, after every `var()` is read
 * through the sheets' own custom properties and `vars` (the theme table's
 * `--s-*-anim` values, `{ name: [values] }`). A rule that sets a timing
 * longhand and names no keyframe re-times whatever runs on its element, so
 * it is paired with every keyframe a rule runs on an element of the same
 * class — or with every keyframe, when its subject names no class or a class
 * no animating rule names. Stated limit: an element carrying two classes,
 * one named by the re-timing rule and the other by the animation, is not
 * seen, since which classes share an element is the renderer's and not in
 * any sheet; and a change timed by script is not in a sheet at all.
 *
 * Returns `{ report, problems }`: `report` has one row per keyframe and
 * timing that changes a flash property; `problems` names each row over
 * `MAX_FLASHES_PER_SECOND` and each flashing keyframe run for a time this
 * reader cannot work out.
 */
export function flashReport(sheets, { vars = {} } = {}) {
    const keyframes = new Map();
    const lookup = new Map(Object.entries(vars).map(([name, values]) => [name, [...values]]));
    const rules = [];
    for (const sheet of sheets) {
        const { nodes } = parseSheet(sheet.css);
        const visit = (list) => {
            for (const node of list) {
                if (node.kind === 'at' && node.name === 'keyframes' && node.body !== undefined) {
                    const name = node.prelude.replace(/^@keyframes\s*/i, '').trim();
                    const list2 = keyframes.get(name) ?? [];
                    list2.push({ sheet: sheet.name, stops: keyframeStops(node.body) });
                    keyframes.set(name, list2);
                } else if (node.kind === 'at' && node.children !== undefined) {
                    visit(node.children);
                }
            }
        };
        visit(nodes);
        for (const rule of allRules(nodes)) {
            const decls = declarationsOf(rule.body);
            for (const { prop, value } of decls) {
                if (prop.startsWith('--')) {
                    const known = lookup.get(prop) ?? [];
                    known.push(value);
                    lookup.set(prop, known);
                }
            }
            rules.push({ sheet: sheet.name, rule, decls });
        }
    }

    const entries = [];
    const modifiers = [];
    for (const { sheet, rule, decls } of rules) {
        // What the rule's shorthand says, one single animation at a time, and
        // what its longhands say, which may re-time any of them.
        const singles = [];
        const named = new Set();
        const long = { seconds: new Set(), iterations: new Set(), alternates: new Set() };
        let timed = false;
        for (const { prop, value } of decls) {
            if (!prop.startsWith('animation')) continue;
            const values = expandVars(value.replace(/\s*!\s*important\s*$/i, ''), lookup);
            const each = (fn) => {
                for (const whole of values) for (const one of splitTopLevel(whole, ',')) fn(one);
            };
            if (prop === 'animation') {
                each((single) => {
                    const parsed = parseSingleAnimation(single);
                    if (parsed.name !== undefined) singles.push(parsed);
                });
            } else if (prop === 'animation-name') {
                each((one) => {
                    if (one.includes(UNKNOWN)) named.add(UNKNOWN);
                    else if (one.toLowerCase() !== 'none' && !GLOBAL_WORDS.has(one.toLowerCase())) named.add(one);
                });
            } else if (prop === 'animation-duration') {
                timed = true;
                each((one) => long.seconds.add(one.includes(UNKNOWN) ? undefined : timeOf(one.toLowerCase())));
            } else if (prop === 'animation-iteration-count') {
                timed = true;
                each((one) => long.iterations.add(/^[+-]?(?:\d*\.)?\d+$/.test(one) ? Number(one) : Infinity));
            } else if (prop === 'animation-direction') {
                timed = true;
                each((one) => long.alternates.add(one.includes(UNKNOWN) || /alternate/i.test(one)));
            }
        }
        const subjects = splitTopLevel(rule.prelude, ',').map(subjectClasses);
        const where = { sheet, selector: rule.prelude.replace(/\s+/g, ' ') };
        const withLong = (seconds, iterations, alternates) => ({
            seconds: new Set([...seconds, ...long.seconds]),
            iterations: new Set([...iterations, ...long.iterations]),
            alternates: new Set([...alternates, ...long.alternates]),
        });
        for (const single of singles) {
            entries.push({
                names: new Set([single.name]),
                ...withLong([single.seconds], [single.iterations], [single.alternate]),
                subjects,
                where,
            });
        }
        if (named.size > 0) {
            // `animation-name` beside a shorthand renames what the shorthand
            // timed; alone, it runs for the longhands' time or none (0s).
            entries.push({
                names: named,
                ...withLong(
                    singles.length > 0 ? singles.map((s) => s.seconds) : [null],
                    singles.length > 0 ? singles.map((s) => s.iterations) : [1],
                    singles.length > 0 ? singles.map((s) => s.alternate) : [false],
                ),
                subjects,
                where,
            });
        }
        if (singles.length === 0 && named.size === 0 && timed) {
            modifiers.push({
                seconds: long.seconds,
                iterations: long.iterations,
                alternates: long.alternates,
                subjects,
                where,
            });
        }
    }

    const classesOf = new Map();
    for (const entry of entries) {
        for (const name of entry.names) {
            const set = classesOf.get(name) ?? new Set();
            for (const subject of entry.subjects) for (const cls of subject) set.add(cls);
            classesOf.set(name, set);
        }
    }
    const animated = new Set([...classesOf.values()].flatMap((set) => [...set]));
    const pairs = (modifier, name) =>
        modifier.subjects.some(
            (subject) =>
                subject.size === 0 ||
                [...subject].every((cls) => !animated.has(cls)) ||
                [...subject].some((cls) => classesOf.get(name)?.has(cls)),
        );

    const report = [];
    const problems = [];
    const timings = new Map();
    const add = (name, source) => {
        const t = timings.get(name) ?? { seconds: new Map(), iterations: new Set(), alternates: new Set(), wheres: [] };
        for (const s of source.seconds) if (!t.seconds.has(s)) t.seconds.set(s, source.where);
        for (const i of source.iterations) t.iterations.add(i);
        for (const a of source.alternates) t.alternates.add(a);
        t.wheres.push(source.where);
        timings.set(name, t);
    };
    for (const entry of entries) for (const name of entry.names) add(name, entry);
    for (const modifier of modifiers) {
        for (const name of [...timings.keys()]) if (name !== UNKNOWN && pairs(modifier, name)) add(name, modifier);
    }
    for (const [name, timing] of timings) {
        if (name === UNKNOWN) {
            for (const where of timing.wheres) {
                problems.push(
                    `${where.sheet}: "${echo(where.selector)}" runs an animation whose keyframes this reader cannot name — name them plainly`,
                );
            }
            continue;
        }
        if (timing.iterations.size === 0) timing.iterations.add(1);
        if (timing.alternates.size === 0) timing.alternates.add(false);
        for (const declared of keyframes.get(name) ?? []) {
            if (!flashes(declared.stops)) continue;
            for (const [seconds, where] of timing.seconds) {
                if (seconds === null) continue;
                if (seconds === undefined) {
                    problems.push(
                        `@keyframes ${name} (${declared.sheet}) changes what a pixel shows, and "${echo(where.selector)}" (${where.sheet}) runs it for a time this reader cannot work out — write the duration plainly`,
                    );
                    continue;
                }
                for (const iterations of timing.iterations) {
                    for (const alternate of timing.alternates) {
                        const counted = keyframeFlashes(declared.stops, { seconds, iterations, alternate });
                        report.push({ name, sheet: declared.sheet, seconds, iterations, alternate, ...counted, where });
                        if (counted.flashes > MAX_FLASHES_PER_SECOND) {
                            problems.push(
                                `@keyframes ${name} (${declared.sheet}) flashes ${counted.flashes} times in one second when "${echo(where.selector)}" (${where.sheet}) runs it at ${seconds}s — at most ${MAX_FLASHES_PER_SECOND}`,
                            );
                        }
                    }
                }
            }
        }
    }
    return { report, problems: [...new Set(problems)] };
}

/** True when the sheet holds any rule — anything but an empty reduced-motion block. */
export function sheetHasRules(css) {
    const { nodes, errors } = parseSheet(css);
    if (errors.length > 0) return true;
    return nodes.some((node) => !(isReduceBlock(node) && (node.children ?? []).length === 0));
}

function escapeRe(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Relative `url()` targets rewritten from a sheet in `src/ui/` to one in `workshop/`. */
function rebaseUrls(css) {
    return css.replace(/url\(\s*(["']?)([^"')]*)\1\s*\)/gi, (all, quote, target) => {
        const value = target.trim();
        if (notAPath(value)) {
            return all;
        }
        const segments = ['..', 'src', 'ui'];
        for (const part of value.split('/')) {
            if (part === '..') segments.pop();
            else if (part !== '.' && part !== '') segments.push(part);
        }
        return `url(${quote}${segments.join('/')}${quote})`;
    });
}

/**
 * The rules of another sheet that dress `base` alone — `broadcast.css`'s
 * `.stall.t-neo.broadcast .plate` and its like — as text, with each selector
 * list cut to the selectors that name the look. Top level and one grouping
 * level deep, which is every place a shipped sheet puts them.
 */
export function lookRules(css, base) {
    const { nodes } = parseSheet(css);
    const cls = new RegExp(`\\.t-${escapeRe(base)}(?![\\w-])`);
    const out = [];
    const take = (list, wrap) => {
        for (const node of list) {
            if (node.kind === 'rule') {
                const selectors = splitTopLevel(node.prelude, ',').filter((s) => cls.test(s));
                if (selectors.length > 0) {
                    const rule = `${selectors.join(',\n')} {${node.body}}`;
                    out.push(wrap === undefined ? rule : `${wrap} {\n${rule}\n}`);
                }
            } else if (GROUPING.has(node.name) && wrap === undefined) {
                take(node.children ?? [], node.prelude);
            }
        }
    };
    take(nodes, undefined);
    return out;
}

/**
 * A shipped look's sheet as the kit's starter: `.t-<base>` becomes
 * `.t-workshop`, every `@keyframes` it declares is renamed `wk-…` (and every
 * use of the name with it), relative `url()`s are rewritten to resolve from
 * `workshop/`, and the look's rules that live in other sheets (`carried`,
 * each `{ from, css }`) are copied in re-scoped the same way — before the
 * reduced-motion block, which stays the last rule.
 */
export function rescopeSheet(lookCss, base, carried = []) {
    const cls = new RegExp(`\\.t-${escapeRe(base)}(?![\\w-])`, 'g');
    const rescope = (css) => rebaseUrls(css.replace(cls, `.${KIT_CLASS}`));
    let out = rescope(lookCss);
    const names = [...blankComments(lookCss).matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1]);
    const prefix = new RegExp(`^t-${escapeRe(base)}-`);
    const renamed = new Map();
    for (const name of names) {
        let next = `wk-${name.replace(prefix, '')}`;
        while ([...renamed.values()].includes(next)) next = `${next}-2`;
        renamed.set(name, next);
    }
    const rename = (css) => {
        let text = css;
        for (const [from, to] of renamed) {
            text = text.replace(new RegExp(`(?<![\\w-])${escapeRe(from)}(?![\\w-])`, 'g'), to);
        }
        return text;
    };
    out = rename(out);
    const extra = carried
        .map(({ from, css }) => ({ from, rules: lookRules(css, base) }))
        .filter(({ rules }) => rules.length > 0)
        .map(
            ({ from, rules }) =>
                `/*\n * Carried from ${from}: the rules that sheet keeps for this look, re-scoped.\n */\n` +
                rename(rescope(rules.join('\n\n'))) +
                '\n\n',
        )
        .join('');
    if (extra !== '') {
        const { nodes } = parseSheet(out);
        const last = nodes[nodes.length - 1];
        const cut = last !== undefined && isReduceBlock(last) ? last.start : out.length;
        out = `${out.slice(0, cut)}${extra}${out.slice(cut)}`;
    }
    const header =
        `/*\n * Started from src/ui/theme-${base}.css by \`pnpm workshop:start ${base}\`: every rule\n` +
        ` * re-scoped to .${KIT_CLASS}, keyframes renamed wk-…, and the look's rules from\n` +
        ' * other sheets carried in. Yours to change — `pnpm workshop:lint` and\n' +
        ' * `pnpm workshop:probe` say what binds.\n */\n\n';
    return header + out;
}
