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
 * Vite resolves as a path even though a browser would not. Exported for the
 * weight guard (`scripts/weight-buckets.mjs`), so a look's budget reads the
 * targets the lint admits and never fewer.
 */
export function urlTargets(text) {
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
 * State the app writes for a look's own sheet and no base sheet reads (step
 * 8f1, `src/ui/lookHooks.ts`): the rung of the sign name's measured ladder
 * (`applyNameTiers`, one value per rung up to its `NAME_TIER_MAX`) and the
 * script a sign line is mostly written in (`scriptOf`, `src/domain/text.ts`).
 * Part of `STATE_ATTRIBUTES`; listed apart because "matched by a served
 * sheet" cannot be their proof of use until a look that reads them is
 * served — `a-look-cannot-target-one-seller` holds each to the module that
 * writes it instead.
 */
export const LOOK_HOOK_ATTRIBUTES = Object.freeze({
    'data-name-tier': Object.freeze(['1', '2', '3', '4', '5', '6']),
    'data-script': Object.freeze(['cjk']),
});

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
    // How a look's row tags stand below 390px (D-2026-10-13-04): written on
    // the stall's root from the look's own row (`narrowTag`, `dressLook` in
    // render.ts) and read by stall.css under `max-width: 389.98px`; a look
    // may read it at the widths its own media reach.
    'data-narrow-tag': Object.freeze(['own-row']),
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
    'data-touch': Object.freeze(['on']),
    'data-turn': Object.freeze(['ccw', 'cw']),
    ...LOOK_HOOK_ATTRIBUTES,
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
/**
 * The shared hooks a first-party look may dress (step 8f1,
 * `src/ui/lookHooks.ts`) — the marks, by class or attribute, and the state
 * attributes the hooks write — which the kit may not name until the
 * workshop README does (the 8f1 critic's item 3): no fixture the kit's probe
 * paints carries a CJK name or a name that climbs a rung, and no rule yet
 * measures a mark shown, so a kit rule under any of them paints on a screen
 * no pass measures. The `--name-rungs` declaration is refused beside them
 * (`declarationProblems`). Test: `the-kit-refuses-the-first-party-hooks`.
 */
const FIRST_PARTY_HOOK = /\.(?:look-mark|mark-(?:figure|shelf|tile))(?![\w-])|\[\s*(?:data-look-mark|data-script|data-name-tier)(?![\w-])/;

/**
 * The classes the app writes on the pieces of a money figure it breaks after
 * its commas (`moneyFigure` in `src/ui/render.ts`): `.fig-say` and
 * `.fig-end`. **A look dresses a figure only as a whole** (D-2026-10-14-02,
 * the owner's "Theo khuyến nghị"), so a first-party look sheet names
 * neither. `.fig-wraps` and `.fig-narrow` are not pieces — they mark the
 * whole figure's box in its re-flow — and a look may dress them (round 2,
 * the critic's P3-3). The probe holds every piece to what an untouched piece
 * computes whatever selector reaches it
 * (`a-broken-figure-wears-the-figures-own-ink`); this is the belt that says
 * so at the sheet. **The kit lint is not changed**: the workshop README
 * states the rule (D-2026-10-14-06) and names `workshop:probe` as what
 * checks it. Test: `a-look-may-not-dress-a-figures-pieces`.
 */
const FIGURE_PIECE = /\.fig-(?:say|end)(?![\w-])/;

/*
 * **A money node's size never moves** (D-2026-10-19-03 (1), the owner's "as
 * recommended"; the wall-offsize critic's item 3). The wall's Cycle card is
 * fitted after the paint (`fitWallFigures`, `src/ui/wallFit.ts`): the
 * figure's size is the money node's own inline `font-size`, which no rule in
 * a look sheet out-ranks — the look lint refuses `!important` — but an
 * animation and a transition do: a keyframe's value beats an inline one, and
 * a running transition beats every declaration. The critic's plants, on Neo:
 * `.t-neo.shop-window .item-x { transition: all .4s }` read the figure
 * mid-transition after a resize (22 of 35 cards moved, two left at 79.92px,
 * past the design 65.5), and a keyframe at 64px out-ranked the fit on 56 of
 * 70 cards at 1024x768. The fit holds every transition on the card off while
 * it reads and puts them back only once the size it took is settled
 * (`holdStill`); this is the sheet's half.
 *
 * **Widened by D-2026-10-20-07** (the owner; the wall-offsize critic's
 * re-review, item 5, found that a keyframe on `letter-spacing` or `zoom` of
 * a money node passed the font-size-only rule and moved the figure 44–97px
 * past its column): the width the fit reads moves by more than the font's
 * size. A first-party look sheet may not:
 *
 * - transition `font-size`, `font`, `letter-spacing`, `word-spacing`, `zoom`,
 *   `scale` or `all` (a `transition` naming no property, or one the lint
 *   cannot read — a `var()`, a CSS-wide keyword — is `all`; a vendor prefix
 *   is read as its unprefixed name), or `transform` **when it scales** (a
 *   transition names a property and not its end value, so `transform` is
 *   refused when some rule of the sheet whose subject may be a money node
 *   sets a `transform` that is more than a turn and a shift or that this lint
 *   cannot read: `scale()`, a `skew()`, a `matrix()` that scales, shears or
 *   mirrors (`scalingOf` reads its columns and its determinant), a 3D
 *   function, a `var()`), on a rule whose subject may be a money node: a
 *   subject naming a money node's class or role (`MONEY_NODE`, `.row.big dd` by its
 *   `dd`), or naming no class, id or attribute of its own at all (`span`,
 *   `*`, a bare `:is(…)`), which may match one; a subject that is a
 *   pseudo-element (`::before`, `::after`) is not the node;
 * - name `font-size`, `font`, `letter-spacing`, `word-spacing` or `zoom` in
 *   any keyframe, nor a `scale`, a `transform` or a non-flat `rotate` that
 *   scales (the same reading as above, here on the stop's own value): which
 *   elements run a keyframe is a selector's to say — a money node or an
 *   ancestor of one, which is any box that is not known to hold none — and
 *   a size animated on any box, a money node among them, is a size the fit
 *   cannot hold. A keyframe that only turns or shifts (`rotate`,
 *   `translate`, `translate3d(x, y, 0)`, Rural's swing and tag) is not
 *   refused. **A custom property in a keyframe is refused too** (the
 *   lint-belts critic's P2, `declarationProblems`): a rule that reads
 *   `--g` as a `letter-spacing` moves the figure by it under no property
 *   name any check here reads.
 *
 * Duration is not read: a `transition-property` here and its duration in
 * another rule meet only in the cascade. **Not read, stated**: a transition
 * of `letter-spacing`, `word-spacing`, `zoom`, `scale` or `transform` on a box
 * that holds a money node and may not be one itself (`.item-p`, `.item-head`):
 * those names reach their descendants, so the gap is wider than font-size's
 * was; the same rule for ancestors would refuse them on every box that is not
 * a known leaf, and is the owner's call. `font-stretch`, `font-size-adjust`,
 * `font-variation-settings`, `text-indent`, `font-weight`, `font-family` and
 * `font-feature-settings` move a width too and are not named (the last three
 * were left off D-07's own list; the lint-belts critic's P3). A keyframe is
 * refused wherever a rule runs it, so a `scale`, a `letter-spacing` or a
 * `zoom` keyframe that only a pseudo-element runs is refused too: wider than
 * D-07's "of money nodes", kept (the lint-belts critic's P2, stated).
 * **No shipped look transitions or animates any of them, but one turn:**
 * Rural's
 * `.t-rural .item-p` runs `t-rural-tag` (a `transform: rotate`, ±0.8°) and
 * `.t-rural .stall-sign` swings by `t-rural-swing` (±0.6°); neither scales, so
 * neither is refused, and both are read at rest by the probe's dress rule.
 * The kit lint is not changed: a rule there is a line of the workshop README,
 * the owner's. Test: `a-look-never-animates-a-money-nodes-size`.
 */
const MONEY_NODE = /\.(?:item-x|x|pay-x-n|buy|addr-short|addr-full|sw-pay-v|sw-pay-s|fig-say|fig-end)(?![\w-])|\[\s*data-role(?![\w-])/i;
const SIZE_MOTION = new Set(['all', 'font', 'font-size', 'letter-spacing', 'word-spacing', 'zoom', 'scale']);
const CSS_WIDE = new Set(['initial', 'inherit', 'unset', 'revert', 'revert-layer']);
const EASING = /^(?:ease|ease-in|ease-out|ease-in-out|linear|step-start|step-end)$/i;

/** Whether a selector's subject may be a money node (see above). */
function mayBeMoneyNode(selector) {
    const subject = subjectOf(selector);
    if (/::?(?:before|after)(?![\w-])/i.test(subject)) return false;
    if (MONEY_NODE.test(subject) || /^dd(?![\w-])/i.test(subject)) return true;
    return !/[.#[]/.test(flatten(subject));
}

/**
 * A `<time>` token (`.4s`, `+.4s`, `1e3ms`) in seconds, or undefined. The
 * number goes through `numberToken`, so a sign and an exponent read as CSS
 * reads them: a transition whose time this missed took that time for the
 * property's name (the lint-belts critic's P1, `+.4s letter-spacing`).
 */
function timeToken(token) {
    const lower = token.toLowerCase();
    if (lower.endsWith('ms')) {
        const n = numberToken(lower.slice(0, -2));
        return n === undefined ? undefined : n / 1000;
    }
    if (lower.endsWith('s')) return numberToken(lower.slice(0, -1));
    return undefined;
}

/** The properties a `transition` or `transition-property` declaration transitions, lower case; `all` where it cannot be read. */
function transitioned(prop, value) {
    const v = value.trim().toLowerCase();
    if (/var\(/.test(v) || CSS_WIDE.has(v)) return ['all'];
    if (v === 'none') return [];
    if (prop === 'transition-property') return splitTopLevel(v, ',');
    return splitTopLevel(v, ',').map((one) => {
        const named = splitTopLevel(one, ' ').find(
            (token) => timeToken(token) === undefined && !EASING.test(token) && !token.includes('(') && token !== 'allow-discrete' && token !== 'normal',
        );
        return named ?? 'all';
    });
}

/**
 * Why a rule of a first-party look sheet animates a money node's size, one
 * sentence a declaration. `scales` is whether some rule of the sheet sets a
 * `transform` that scales or that cannot be read (`sheetSetsAScalingTransform`):
 * only then is a transition of `transform` one of a size.
 */
function moneySizeMotionProblems(decls, selectors, { scales = false } = {}) {
    const out = [];
    const reaching = selectors.filter(mayBeMoneyNode);
    if (reaching.length === 0) return out;
    for (const { prop, value } of decls) {
        if (prop !== 'transition' && prop !== 'transition-property') continue;
        const moving = transitioned(prop, value)
            .map((name) => name.replace(VENDOR_PREFIX, ''))
            .filter((name) => SIZE_MOTION.has(name) || (name === 'transform' && scales));
        if (moving.length > 0) {
            out.push(
                `${prop}: ${echo(value, 48)} transitions ${moving.join(', ')} on "${echo(reaching[0])}", which may be a money node — ` +
                    'the wall fits its figure by its size, and a running transition out-ranks the size it sets ' +
                    '(a size, a letter or word spacing, a zoom, a scale and a transform that scales each move the width it reads)',
            );
        }
    }
    return out;
}

/* ---------- transform values: what a value turns, shifts, scales or skews ---------- */

/**
 * A plain `<number>` token, or undefined. **Finite only**: `1e400` is
 * Infinity in a double, and an Infinity compares false against every bound
 * (`rotate: 1e400deg` and `scale: 1e400` passed the belt), so a number the
 * lint cannot hold reads as a value it cannot read, which every reader treats
 * as the worst case (the lint-belts critic's P2).
 */
function numberToken(token) {
    if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(token)) return undefined;
    const n = Number(token);
    return Number.isFinite(n) ? n : undefined;
}

/** The factor a `<number>` or `<percentage>` token stands for (`1.2`, `120%`), or undefined. */
function factorToken(token) {
    if (token.endsWith('%')) {
        const n = numberToken(token.slice(0, -1));
        return n === undefined ? undefined : n / 100;
    }
    return numberToken(token);
}

/**
 * The largest angle this lint reads, in degrees: ten turns. A turn is read
 * modulo 360, and a double that large has lost the digits the modulo needs
 * (`rotate: 1e300deg` read as 0°); no look turns a box ten times round, so a
 * larger one reads as a value the lint cannot read.
 */
export const ANGLE_CAP_DEG = 3600;

/** An `<angle>` token in degrees (a bare 0 is an angle), or undefined for a `calc()`, a `var()`, a keyword, a non-finite number or an angle past `ANGLE_CAP_DEG`. */
function angleToken(token) {
    const m = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(deg|grad|rad|turn)?$/i.exec(token);
    if (m === null) return undefined;
    const n = numberToken(m[1]);
    if (n === undefined) return undefined;
    const unit = (m[2] ?? '').toLowerCase();
    if (unit === '') return n === 0 ? 0 : undefined;
    const deg = unit === 'deg' ? n : unit === 'grad' ? n * 0.9 : unit === 'rad' ? (n * 180) / Math.PI : n * 360;
    return Number.isFinite(deg) && Math.abs(deg) <= ANGLE_CAP_DEG ? deg : undefined;
}

/** The CSS-wide keywords that read as `none` on a property that does not inherit (`transform`, `rotate`, `scale`, `translate`). */
const INITIAL_KEYWORD = /^(?:initial|unset)$/i;

/** Whether a token is a length of zero (`0`, `0px`, `0%`, `-0.0em`): a shift of nothing. A `calc()` is not read, so it is not zero. */
function zeroLength(token) {
    const m = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(?:[a-z]+|%)?$/i.exec(token);
    return m !== null && numberToken(m[1]) === 0;
}

/**
 * A `transform` value as the list of what it does — `{ kind: 'rotate', deg }`,
 * `{ kind: 'translate', zero }` (`zero`: every length of it is zero),
 * `'skew'`, `{ kind: 'scale', x, y }`, `{ kind: 'matrix', a, b, c, d, zero }`
 * and `'3d'` (a function that foreshortens or scales by depth) — or
 * undefined for a value this lint cannot take apart: a `var()`, a CSS-wide
 * keyword that reads another box's transform, a function it does not know.
 * **Fail closed**: every reader below treats undefined as the worst case.
 * **A shift in depth of zero is flat**: `translate3d(x, y, 0)` and
 * `translateZ(0)` are the 2D shift (and an identity), which Chrome computes
 * as a `matrix()`, the way the probe reads them; any other depth is `'3d'`
 * (the lint-belts critic's P2: a rain-like `translate3d(0, 100%, 0)` keyframe
 * was refused as a foreshortening).
 */
function transformOps(value) {
    let rest = value.replace(/\s*!\s*important\s*$/i, '').trim();
    if (/^none$/i.test(rest) || INITIAL_KEYWORD.test(rest)) return [];
    const ops = [];
    while (rest !== '') {
        const m = /^([a-z][a-z0-9-]*)\(/i.exec(rest);
        if (m === null) return undefined;
        let depth = 0;
        let end = -1;
        for (let i = m[0].length - 1; i < rest.length; i += 1) {
            const c = rest[i];
            if (c === '"' || c === "'") {
                i = skipString(rest, i) - 1;
            } else if (c === '(') {
                depth += 1;
            } else if (c === ')') {
                depth -= 1;
                if (depth === 0) {
                    end = i;
                    break;
                }
            }
        }
        if (end < 0) return undefined;
        const name = m[1].toLowerCase();
        const args = splitTopLevel(rest.slice(m[0].length, end), ',');
        rest = rest.slice(end + 1).trim();
        if (name === 'rotate' || name === 'rotatez') {
            const deg = args.length === 1 ? angleToken(args[0]) : undefined;
            if (deg === undefined) return undefined;
            ops.push({ kind: 'rotate', deg });
        } else if (name === 'translate' || name === 'translatex' || name === 'translatey') {
            if (args.length < 1 || args.length > (name === 'translate' ? 2 : 1)) return undefined;
            ops.push({ kind: 'translate', zero: args.every(zeroLength) });
        } else if (name === 'translate3d' || name === 'translatez') {
            if (args.length !== (name === 'translate3d' ? 3 : 1)) return undefined;
            const depth = args[args.length - 1];
            if (zeroLength(depth)) ops.push({ kind: 'translate', zero: args.every(zeroLength) });
            else ops.push({ kind: '3d' });
        } else if (name === 'scale') {
            const x = args.length >= 1 && args.length <= 2 ? factorToken(args[0]) : undefined;
            const y = args.length === 2 ? factorToken(args[1]) : x;
            if (x === undefined || y === undefined) return undefined;
            ops.push({ kind: 'scale', x, y });
        } else if (name === 'scalex' || name === 'scaley') {
            const f = args.length === 1 ? factorToken(args[0]) : undefined;
            if (f === undefined) return undefined;
            ops.push(name === 'scalex' ? { kind: 'scale', x: f, y: 1 } : { kind: 'scale', x: 1, y: f });
        } else if (name === 'skew' || name === 'skewx' || name === 'skewy') {
            if (args.length < 1 || args.length > (name === 'skew' ? 2 : 1) || !args.every((a) => angleToken(a) !== undefined)) return undefined;
            ops.push({ kind: 'skew' });
        } else if (name === 'matrix') {
            const n = args.map(numberToken);
            if (n.length !== 6 || n.some((v) => v === undefined)) return undefined;
            ops.push({ kind: 'matrix', a: n[0], b: n[1], c: n[2], d: n[3], zero: n[4] === 0 && n[5] === 0 });
        } else if (['rotatex', 'rotatey', 'rotate3d', 'scalez', 'scale3d', 'perspective', 'matrix3d'].includes(name)) {
            ops.push({ kind: '3d' });
        } else {
            return undefined;
        }
    }
    return ops;
}

/** The individual `rotate` property as ops: `none`, an angle, or `z <angle>` is flat; any other axis is 3D. */
function rotatePropertyOps(value) {
    const v = value.replace(/\s*!\s*important\s*$/i, '').trim();
    if (/^none$/i.test(v) || INITIAL_KEYWORD.test(v)) return [];
    const tokens = splitTopLevel(v, ' ');
    const angles = tokens.filter((t) => angleToken(t) !== undefined);
    const others = tokens.filter((t) => angleToken(t) === undefined);
    if (angles.length === 1 && others.length === 0) return [{ kind: 'rotate', deg: angleToken(angles[0]) }];
    if (angles.length === 1 && others.length === 1 && /^z$/i.test(others[0])) return [{ kind: 'rotate', deg: angleToken(angles[0]) }];
    if (angles.length === 1 && (others.length === 1 || others.length === 3) && others.every((t) => /^(?:x|y|z)$/i.test(t) || numberToken(t) !== undefined)) {
        return [{ kind: '3d' }];
    }
    return undefined;
}

/** The individual `scale` property as ops: `none` or one to three numbers or percentages. */
function scalePropertyOps(value) {
    const v = value.replace(/\s*!\s*important\s*$/i, '').trim();
    if (/^none$/i.test(v) || INITIAL_KEYWORD.test(v)) return [];
    const factors = splitTopLevel(v, ' ').map(factorToken);
    if (factors.length < 1 || factors.length > 3 || factors.some((f) => f === undefined)) return undefined;
    const [x, y = x, z = 1] = factors;
    const ops = [{ kind: 'scale', x, y }];
    if (z !== 1) ops.push({ kind: '3d' });
    return ops;
}

/** The individual `translate` property as ops: `none`, or one or two lengths; a third (depth) is 3D unless it is zero. */
function translatePropertyOps(value) {
    const v = value.replace(/\s*!\s*important\s*$/i, '').trim();
    if (/^none$/i.test(v) || INITIAL_KEYWORD.test(v)) return [];
    const tokens = splitTopLevel(v, ' ');
    if (tokens.length < 1 || tokens.length > 3) return undefined;
    if (tokens.length === 3 && !zeroLength(tokens[2])) return [{ kind: '3d' }];
    return [{ kind: 'translate', zero: tokens.every(zeroLength) }];
}

/** A transform-family declaration as ops: `transform`, `rotate`, `scale` or `translate` (vendor prefix read as plain), else undefined. */
function transformFamilyOps(name, value) {
    if (name === 'transform') return transformOps(value);
    if (name === 'rotate') return rotatePropertyOps(value);
    if (name === 'scale') return scalePropertyOps(value);
    if (name === 'translate') return translatePropertyOps(value);
    return undefined;
}

/** A factor within this of 1 is no scale (the probe's own tolerance for a box that holds a figure, `boxTransformFault`). */
const SCALE_EPSILON = 1e-3;

/**
 * Why ops are more than a turn and a shift — a factor other than 1, a skew, a
 * `matrix()` that scales, shears or mirrors, a 3D function — or undefined.
 * **Turn and shift only** (the lint-belts critic's B1): the column-lengths
 * check alone let `matrix(0.6, 0.8, 0.8, 0.6, 0, 0)` (a shear and a mirror)
 * and `skewX(60deg)` through a rule whose docblock said otherwise.
 */
function scalingOf(ops) {
    for (const op of ops) {
        if (op.kind === '3d') return 'a 3D function foreshortens it';
        if (op.kind === 'skew') return 'a skew shears it';
        if (op.kind === 'scale' && (Math.abs(op.x - 1) > SCALE_EPSILON || Math.abs(op.y - 1) > SCALE_EPSILON)) {
            return `scale ${op.x === op.y ? op.x : `${op.x}, ${op.y}`} scales it`;
        }
        if (op.kind === 'matrix') {
            const sx = Math.hypot(op.a, op.b);
            const sy = Math.hypot(op.c, op.d);
            if (Math.abs(sx - 1) > SCALE_EPSILON || Math.abs(sy - 1) > SCALE_EPSILON) return 'a matrix scales it';
            if (Math.abs(op.a * op.c + op.b * op.d) >= SCALE_EPSILON) return 'a matrix shears it';
            if (op.a * op.d - op.b * op.c <= 0) return 'a matrix mirrors it';
        }
    }
    return undefined;
}

/**
 * Whether some rule of a sheet whose subject may be a money node sets a
 * `transform` that scales or that this lint cannot read (at rest, under a
 * state or in a media block). A decoration's own perspective floor (Neo's
 * `.sm-floor`) is no money node's transform, so it does not make every
 * `transform` transition of a money node one of a size.
 */
function sheetSetsAScalingTransform(nodes) {
    return nodes.some((node) => {
        if (node.kind === 'rule') {
            if (!splitTopLevel(node.prelude, ',').some(mayBeMoneyNode)) return false;
            return declarationsOf(node.body).some(({ prop, value }) => {
                if (prop.replace(VENDOR_PREFIX, '') !== 'transform') return false;
                const ops = transformOps(value);
                return ops === undefined || scalingOf(ops) !== undefined;
            });
        }
        return node.name !== 'keyframes' && node.children !== undefined && sheetSetsAScalingTransform(node.children);
    });
}

/** The width-moving declarations of one keyframe stop, as `{ prop, why }` (`why` empty for a property that moves a width by name). */
function keyframeSizeMotion(decls) {
    const out = [];
    for (const { prop, value } of decls) {
        const name = prop.replace(VENDOR_PREFIX, '');
        if (name === 'font-size' || name === 'font' || name === 'letter-spacing' || name === 'word-spacing' || name === 'zoom') {
            out.push({ prop, why: '' });
        } else if (name === 'transform' || name === 'scale' || name === 'rotate' || name === 'translate') {
            const ops = transformFamilyOps(name, value);
            const why = ops === undefined ? 'a value this lint cannot read, which may scale it' : scalingOf(ops);
            if (why !== undefined) out.push({ prop, why });
        }
    }
    return out;
}

/* ---------- a state rule hides no money ---------- */

/*
 * **A state rule hides no money** (D5 (a), the owner's, on the plan before
 * step 8g2; the plan's critic, P2-4; widened by the window's reading of D5
 * (a) after the lint-belts critic's B2: the whole of the probe's two sets).
 * The probe measures every screen at rest and paints no hover, no focus, no
 * press and no turned wall's rotation, so a rule that arrives with one is
 * read by no pass — the one thing the file-mask rule above
 * (`a-file-mask-arrives-at-rest`) already says of a mask. A first-party look
 * sheet's rule whose selector names a state — `:hover`, `:focus`,
 * `:focus-visible`, `:focus-within`, `:active` or the attribute `[data-turn]`,
 * anywhere in the selector (an ancestor's state reaches a figure inside it,
 * and `:is()` and `:not()` are read as the state they name: fail closed) —
 * is held to what the probe holds at rest: **every longhand in the probe's
 * `DRESS_HELD` (a money node and the text under it) and `BOX_HELD` (a box
 * that holds one), read for the value the probe refuses**, each refused value
 * the one the probe refuses at rest and each allowed value the one it allows
 * (`STATE_BELT_ACCOUNT` lists every member and how it is read; the test
 * `the-state-belt-accounts-for-every-longhand-the-probe-holds` parses the two
 * sets out of `layout/probe.ts` and fails on a member this table does not
 * name). Read under a state (`STATE_BELT`):
 *
 * - a clip or a mask: `clip-path`, `clip`, every `mask` and `mask-*`
 *   property (the border and the legacy box image among them), only `none`
 *   (a clip that encloses the figure's ink is the probe's to judge at rest;
 *   under a state there is no ink to measure, so none stands);
 * - `filter`, only `none`; `backdrop-filter`, `none` or blurs alone (the
 *   probe allows a blur on a box that holds a figure and refuses every other
 *   function: it repaints the ground behind the glyphs);
 * - `mix-blend-mode` and `background-blend-mode`, only `normal`;
 * - `opacity` under 1, `visibility` but `visible`, `content-visibility` but
 *   `visible`, `zoom` but 1, `font-size-adjust` but `none`;
 * - `word-spacing`, `text-indent` and `letter-spacing` that are not plainly
 *   zero or more (`letter-spacing` is stricter than the probe, which reads a
 *   negative one per face for piling digits: no sheet can);
 * - `writing-mode` but `horizontal-tb`, `text-overflow` but `clip`,
 *   `line-clamp` but `none`, a motion path (`offset-path`; the `offset`
 *   shorthand as `none`, `normal` or `auto` alone — a motion path turns the
 *   box along it with `offset-rotate`, and the probe refuses any path);
 * - a line through or over the text (`text-decoration-line`, the
 *   `text-decoration` shorthand), an underline with a thickness but the
 *   face's own, an underline offset below zero;
 * - a `text-shadow` whose sharp copies stand further than
 *   `STATE_SHADOW_EM` (the probe's `DRESS_SHADOW_EM`, 0.12em) from the glyph or
 *   from each other (a glow, blurred as far as it stands off, stands). The
 *   size of the text is not known to a sheet, so a pixel is read at the type
 *   floor, 11px (`small-text-is-at-least-11px`): the strictest a figure can
 *   be;
 * - `color` whose alpha is under 1 (a faded ink is a faded figure), read in
 *   a literal (`transparent`, a `#rgba` or `#rrggbbaa`, the alpha of a
 *   colour function, a `color-mix()` that mixes a faint colour or whose
 *   percentages sum to under 100); a `var()` stands here (see below);
 * - on a subject that may be a money node, a picture in `background` or
 *   `background-image` (the probe fails a picture under a figure's glyphs);
 * - `transform`, `rotate`, `translate` and `scale`: **on a subject that may be
 *   a money node, the figure's own rule** (`figureTransformProblem`; the
 *   lint-belts critic's P1) — no `rotate`, `translate` or `scale` property at
 *   all (identities, `none`, `0deg`, `1`, stand), and `transform` only a
 *   uniform scale of at least 1, unturned and unmoved (the stream card's
 *   pulse); **on any other box, the holder's rule** — a tilt of at most
 *   `STATE_TILT_DEG` (the probe's `DRESS_TILT_DEG`, 10°) with any shift and
 *   any growth, and no shrink, stretch, skew, flip or foreshortening
 *   (`boxTransformProblem`; Rural's tag sways ±0.8° and its rows tilt 0.6°).
 *   `translate3d(x, y, 0)`, `translateZ(0)` and `translate: x y 0` are flat;
 *   a depth other than zero is 3D. **A holder's shift and growth are
 *   uncapped, as the probe leaves them at rest; capping them is the owner's
 *   call, not made;**
 * - **on top of the probe**: an `outline` whose width or whose positive
 *   offset is past `STATE_OUTLINE_MAX_PX` (8px, a number and not a
 *   measurement: "wider than its own box is wide" is not known to a sheet),
 *   a negative `outline-offset` (the ring falls inside the box, over the ink
 *   where the padding is thinner than the ring — only the probe's geometry
 *   can tell), and a `z-index` under zero or one this lint cannot read (it
 *   puts the figure behind its card's ground); **any custom property**, since
 *   a state rule that sets `--s-price-clip` or `--s-head-blur` re-states, in
 *   a rule the families above never see, the very value `stall.css` reads at
 *   rest as `clip-path` or `animation` (the lint-belts critic's P1); and **the
 *   keyframes a state starts**, through `animation` or `animation-name`: each
 *   stop of a keyframe a state rule names is read as if the state rule had
 *   set it, and a name this lint cannot read (a `var()`) is refused.
 *
 * **A `var()` in any of these fails closed**, whatever it would substitute,
 * save where the property carries a colour or a picture the sheet cannot
 * hide in a custom property (`color`, `background`, and the colour of an
 * `outline` written beside its width): a custom property holding a file is refused in a first-party
 * sheet and one set under a state is refused here, so a `var(--s-*)` there is
 * the theme table's own opaque token. Colour, ground, border and shadow
 * changes otherwise stand — all 16 state rules the shipped looks have set
 * nothing else but Rural's `rotate: 0deg` — so a hover that changes a
 * money control's colour to a low contrast is still read by no pass (the
 * plan's D5 (a), its stated cost).
 *
 * **Not read, stated, and why** (`STATE_BELT_ACCOUNT` names each):
 * - `background-color`, a gradient, and the contrast of `color` against the
 *   ground: the probe reads them as a stack of paints against the ink
 *   (`groundStackFault`), which needs the browser's layout and the colours
 *   the engine resolves; only the ink's alpha and a picture are read here;
 * - a `color` whose fade is carried by a custom property the sheet itself
 *   declares (`color: var(--wash)` with `--wash` translucent at rest);
 * - `display` but `list-item` (refused everywhere), `overflow` with a size,
 *   a position, a margin or a positive `z-index` that moves a box over a
 *   neighbour's figure: where a box stands is the coverage rules', at rest;
 * - paint that reaches a neighbour: a `box-shadow` spread, a
 *   `border-image-outset`;
 * - a pixel `text-shadow` is read at the 11px type floor, never against the
 *   real size of the text;
 * - an `animation` a state starts by a name the sheet does not declare (the
 *   keyframes are read only when the sheet holds them);
 * - the net of a rotation across two declarations (`transform` and
 *   `rotate`), which a computed transform would add up;
 * - a state this list does not name (`:checked`, `:disabled`,
 *   `[aria-pressed]`, which the fixtures paint).
 *
 * **First party only, and that is the owner's D5 as the window read it
 * (D-2026-10-20-01):** the workshop README says a pointer's hover is Stall's
 * at intake and not the kit's, so the kit lint carries no belt and the three
 * starters are unchanged by it (`the-state-belt-is-first-party-only`, which
 * holds the README's own words). A creator's `:hover` is read by a person at
 * intake, not by this lint. Test: `a-look-state-rule-never-hides-money`.
 */
export const STATE_TILT_DEG = 10;
export const STATE_SHADOW_EM = 0.12;
export const STATE_TYPE_FLOOR_PX = 11;
export const STATE_OUTLINE_MAX_PX = 8;
const STATE_PSEUDO_CLASS = /:(?:hover|focus|focus-visible|focus-within|active)(?![\w-])/i;
const BELT_TAIL = '; the probe measures every screen at rest and paints no hover, focus, press or turned wall, so what arrives with a state is read by no pass';
const BELT_VAR = 'a var() here carries a value past this check, so it is read as the worst it could be';

/** Whether a selector names a state the probe never paints (see above). */
function namesABeltState(selector) {
    return STATE_PSEUDO_CLASS.test(blankAttributes(selector)) || attributeBlocks(selector).some((inner) => /^\s*data-turn(?![\w-])/i.test(inner));
}

/** A `<length>` or `<percentage>` token as `{ n, unit }` (unit lower case, `''` for a bare number), or undefined. */
function lengthToken(token) {
    const m = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)([a-z]+|%)?$/i.exec(token);
    if (m === null) return undefined;
    const n = numberToken(m[1]);
    return n === undefined ? undefined : { n, unit: (m[2] ?? '').toLowerCase() };
}

/** Whether a token is a length or percentage of zero or more (a bare number is a length only at zero). */
function nonNegativeLength(token) {
    const len = lengthToken(token);
    return len !== undefined && len.n >= 0 && (len.unit !== '' || len.n === 0);
}

/** A reader for a longhand whose every comma-separated part must be one of `harmless`. */
const only = (harmless, why) => (clean) => (splitTopLevel(clean, ',').every((one) => harmless.test(one)) ? undefined : why);

/** A reader for a spacing whose value is `normal` or a length of zero or more. */
const noNegative = (why) => (clean) => (/^(?:normal|initial|unset)$/i.test(clean) || nonNegativeLength(clean) ? undefined : why);

const READ_OPACITY = (clean) => {
    if (INITIAL_KEYWORD.test(clean)) return undefined;
    const factor = factorToken(clean);
    if (factor === undefined) return 'an opacity this lint cannot read may fade a figure';
    return factor >= 1 ? undefined : `an opacity of ${clean} fades a figure`;
};

const READ_ZOOM = (clean) =>
    /^(?:normal|initial|unset)$/i.test(clean) || factorToken(clean) === 1 ? undefined : 'a zoom but 1 scales the glyphs under the size the type floor reads';

const READ_TEXT_INDENT = (clean) => {
    const rest = splitTopLevel(clean, ' ').filter((token) => !/^(?:each-line|hanging)$/i.test(token));
    if (rest.length === 1 && (/^(?:initial|unset)$/i.test(rest[0]) || nonNegativeLength(rest[0]))) return undefined;
    return 'a negative text-indent (or one this lint cannot read) pushes the first glyphs of a figure out of its line';
};

const DECORATION_LINES = /^(?:none|underline|blink|spelling-error|grammar-error|initial|unset)$/i;
const READ_DECORATION_LINE = (clean) =>
    splitTopLevel(clean, ' ').every((token) => DECORATION_LINES.test(token))
        ? undefined
        : 'a line through or over the text strikes a figure out (the probe fails line-through and overline in effect on it)';

const READ_UNDERLINE_OFFSET = (clean) =>
    /^(?:auto|initial|unset)$/i.test(clean) || nonNegativeLength(clean)
        ? undefined
        : 'an underline offset below zero (or one this lint cannot read) raises the line into the glyphs';

/** The `text-decoration` shorthand: a line through or over, or an underline with a thickness of its own. */
const READ_DECORATION = (clean) => {
    const tokens = splitTopLevel(clean, ' ');
    if (tokens.some((token) => /^(?:overline|line-through)$/i.test(token))) {
        return 'a line through or over the text strikes a figure out (the probe fails line-through and overline in effect on it)';
    }
    const thick = tokens.some((token) => lengthToken(token) !== undefined || /^(?:calc|min|max|clamp)\(/i.test(token));
    if (thick && tokens.some((token) => /^underline$/i.test(token))) {
        return "an underline with a thickness of its own (only the face's own, auto or from-font, stands under a figure)";
    }
    return undefined;
};

/** A `text-shadow`: glows stand, and sharp copies only within `STATE_SHADOW_EM` of the glyph and of each other. */
const READ_TEXT_SHADOW = (clean) => {
    if (/^(?:none|initial|unset)$/i.test(clean)) return undefined;
    const unreadable = 'a text-shadow this lint cannot size (a unit but px, em or zero, or a layer it cannot take apart) may draw a copy of a figure';
    const sharp = [[0, 0]];
    for (const layer of splitTopLevel(clean, ',')) {
        const lengths = [];
        for (const token of splitTopLevel(layer, ' ')) {
            const len = lengthToken(token);
            if (len === undefined) continue;
            if (len.unit === '' && len.n !== 0) return unreadable;
            if (len.unit !== '' && len.unit !== 'px' && len.unit !== 'em') return unreadable;
            lengths.push(len.unit === 'px' ? len.n / STATE_TYPE_FLOOR_PX : len.n);
        }
        if (lengths.length < 2 || lengths.length > 3) return unreadable;
        const [x, y, blur = 0] = lengths;
        if (blur >= Math.hypot(x, y)) continue;
        sharp.push([x, y]);
    }
    for (let i = 0; i < sharp.length; i += 1) {
        for (let j = i + 1; j < sharp.length; j += 1) {
            if (Math.hypot(sharp[i][0] - sharp[j][0], sharp[i][1] - sharp[j][1]) > STATE_SHADOW_EM + 1e-9) {
                return `a sharp text-shadow copy more than ${STATE_SHADOW_EM}em from the glyph or from another copy (a pixel is read at the ${STATE_TYPE_FLOOR_PX}px type floor) draws a second figure beside the first`;
            }
        }
    }
    return undefined;
};

/** The width keywords of `outline-width`, in pixels. */
const OUTLINE_WIDTH_KEYWORDS = Object.freeze({ thin: 1, medium: 3, thick: 5 });
const OUTLINE_STYLES = /^(?:none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset|auto)$/i;

/** An outline width in px, or undefined where this lint cannot size it. */
function outlineWidthPx(token) {
    const keyword = OUTLINE_WIDTH_KEYWORDS[token.toLowerCase()];
    if (keyword !== undefined) return keyword;
    const len = lengthToken(token);
    if (len === undefined || (len.unit !== 'px' && !(len.unit === '' && len.n === 0))) return undefined;
    return len.n;
}

const OUTLINE_TOO_WIDE = (px) =>
    `an outline ${px}px wide paints over what stands beside the box, a neighbour's figure among them ` +
    `(a sheet cannot know the box's own width; ${STATE_OUTLINE_MAX_PX}px is the most a look may draw)`;
const OUTLINE_UNSIZED = 'an outline width this lint cannot size (px, thin, medium, thick or zero are read) may paint over a neighbour';

const READ_OUTLINE_WIDTH = (clean) => {
    if (/^(?:initial|unset)$/i.test(clean)) return undefined;
    const px = outlineWidthPx(clean);
    if (px === undefined) return OUTLINE_UNSIZED;
    return px > STATE_OUTLINE_MAX_PX ? OUTLINE_TOO_WIDE(px) : undefined;
};

const READ_OUTLINE_OFFSET = (clean) => {
    if (/^(?:initial|unset)$/i.test(clean)) return undefined;
    const len = lengthToken(clean);
    if (len === undefined || (len.unit !== 'px' && !(len.unit === '' && len.n === 0))) {
        return 'an outline offset this lint cannot size (px or zero is read) may move the ring over a neighbour';
    }
    if (len.n < 0) return 'a negative outline offset draws the ring inside the box, over the ink where the padding is thinner than the ring';
    return len.n > STATE_OUTLINE_MAX_PX ? OUTLINE_TOO_WIDE(len.n) : undefined;
};

/**
 * The `outline` shorthand: its width is read, its colour and its style are
 * not. A `var()` is read as the colour (`outline: 2px solid var(--s-accent)`,
 * the base sheet's own ring), and so stands only beside a width written in px
 * or as a keyword: alone, or beside no width, it could carry the width.
 */
const READ_OUTLINE = (clean) => {
    let written = false;
    let carried = false;
    for (const token of splitTopLevel(clean, ' ')) {
        if (OUTLINE_STYLES.test(token) || /^(?:initial|unset)$/i.test(token)) continue;
        if (/(?<![\w-])var\s*\(/i.test(token)) {
            carried = true;
            continue;
        }
        const isWidth = Object.hasOwn(OUTLINE_WIDTH_KEYWORDS, token.toLowerCase()) || lengthToken(token) !== undefined || /^(?:calc|min|max|clamp)\(/i.test(token);
        if (isWidth) {
            written = true;
            const why = READ_OUTLINE_WIDTH(token);
            if (why !== undefined) return why;
        }
    }
    return carried && !written ? 'a var() in an outline with no width written beside it may carry the width (write it in px, or thin, medium or thick)' : undefined;
};

const READ_Z_INDEX = (clean) =>
    /^(?:auto|initial|unset)$/i.test(clean) || /^\+?\d+$/.test(clean)
        ? undefined
        : 'a z-index under zero (or one this lint cannot read) puts the box, and the figure in it, behind its card\'s ground';

/** Why a colour fades its ink: the alpha of a literal, of a colour function's, of a mix; undefined where it does not (a `var()` stands). */
function inkFade(value) {
    const v = value.trim();
    const fades = 'an ink under alpha 1 is a faded figure (the probe holds an ink at full alpha)';
    if (/^(?:inherit|initial|unset|revert|revert-layer|currentcolor)$/i.test(v)) return undefined;
    if (/^transparent$/i.test(v)) return fades;
    const hex = /^#([0-9a-f]+)$/i.exec(v);
    if (hex !== null) {
        const d = hex[1];
        const alpha = d.length === 4 ? Number.parseInt(d[3] + d[3], 16) : d.length === 8 ? Number.parseInt(d.slice(6), 16) : 255;
        return alpha < 255 ? fades : undefined;
    }
    const fn = /^([a-z-]+)\(([\s\S]*)\)$/i.exec(v);
    if (fn === null) return /^[a-z]+$/i.test(v) ? undefined : 'a colour this lint cannot take apart may be a faded ink';
    const name = fn[1].toLowerCase();
    const inner = fn[2];
    if (name === 'var') return undefined;
    if (name === 'light-dark') {
        for (const one of splitTopLevel(inner, ',')) {
            const why = inkFade(one);
            if (why !== undefined) return why;
        }
        return undefined;
    }
    if (name === 'color-mix') {
        const operands = splitTopLevel(inner, ',').slice(1);
        const shares = [];
        for (const operand of operands) {
            const tokens = splitTopLevel(operand, ' ');
            const percent = tokens.filter((token) => /^[+-]?[\d.]+%$/.test(token));
            const why = inkFade(tokens.filter((token) => !percent.includes(token)).join(' '));
            if (why !== undefined) return why;
            if (percent.length === 1) shares.push(Number.parseFloat(percent[0]));
        }
        return operands.length === 2 && shares.length === 2 && shares[0] + shares[1] < 100 ? fades : undefined;
    }
    if (!/^(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color)$/.test(name)) return 'a colour this lint cannot take apart may be a faded ink';
    if (/(?<![\w-])from(?![\w-])/i.test(inner)) return 'a relative colour this lint cannot take apart may be a faded ink';
    let alpha;
    const slash = inner.lastIndexOf('/');
    if (slash >= 0) alpha = inner.slice(slash + 1).trim();
    else if (/^(?:rgba?|hsla?)$/.test(name)) {
        const parts = splitTopLevel(inner, ',');
        if (parts.length === 4) alpha = parts[3];
    }
    if (alpha === undefined) return undefined;
    const factor = factorToken(alpha);
    if (factor === undefined) return 'an alpha this lint cannot read may fade the ink';
    return factor < 1 ? fades : undefined;
}

const PICTURE = /(?<![\w-])(?:url|image-set|-webkit-image-set|cross-fade|-webkit-cross-fade|element|paint)\s*\(/i;

/**
 * The figure's own rule for a transform-family value, taken apart (`ops`):
 * the probe's `dressHeldFault` — the `rotate`, `translate` and `scale`
 * properties are `none` (identity values stand), and `transform` is `none`
 * or a uniform scale of at least 1 with no turn, skew, flip or shift. The ops
 * are composed in order, as the computed matrix is.
 */
function figureTransformProblem(name, ops) {
    let a = 1;
    let b = 0;
    let c = 0;
    let d = 1;
    for (const op of ops) {
        if (op.kind === '3d') return 'a 3D function foreshortens it';
        if (op.kind === 'skew') return 'a skew shears it';
        if ((op.kind === 'translate' || op.kind === 'matrix') && !op.zero) return 'a shift moves it';
        let m;
        if (op.kind === 'matrix') {
            m = [op.a, op.b, op.c, op.d];
        } else if (op.kind === 'rotate') {
            const r = (op.deg * Math.PI) / 180;
            m = [Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r)];
        } else if (op.kind === 'scale') {
            m = [op.x, 0, 0, op.y];
        } else {
            continue;
        }
        [a, b, c, d] = [a * m[0] + c * m[1], b * m[0] + d * m[1], a * m[2] + c * m[3], b * m[2] + d * m[3]];
    }
    const sx = Math.hypot(a, b);
    const sy = Math.hypot(c, d);
    if (sx === 0 || sy === 0) return 'a transform collapses it';
    if (Math.abs(sx - sy) > SCALE_EPSILON * Math.max(sx, sy)) return 'a scale that is not the same both ways stretches it';
    if (Math.abs((a * c + b * d) / (sx * sy)) >= SCALE_EPSILON) return 'a transform skews it';
    if (a * d - b * c <= 0) return 'a transform mirrors it';
    const deg = (Math.atan2(b, a) * 180) / Math.PI;
    if (Math.abs(deg) >= 0.01) return `a turn of ${Number(deg.toFixed(1))}° turns it (the probe refuses any rotate on a figure, and any transform but a uniform scale of at least 1)`;
    if (sx < 1 - SCALE_EPSILON) return 'a scale under 1 shrinks it';
    if (name !== 'transform' && Math.abs(sx - 1) > SCALE_EPSILON) {
        return `the ${name} property scales it (the probe refuses any rotate, translate or scale on a figure; transform may grow it uniformly)`;
    }
    return undefined;
}

/** Why a transform-family value, taken apart, is more than a tilt on a box that holds a figure, or undefined. */
function boxTransformProblem(ops) {
    let turn = 0;
    for (const op of ops) {
        if (op.kind === '3d') return 'a 3D function foreshortens it';
        if (op.kind === 'skew') return 'a skew shears it';
        if (op.kind === 'scale') {
            const widest = Math.max(Math.abs(op.x), Math.abs(op.y));
            if (Math.abs(op.x - op.y) > SCALE_EPSILON * widest) return 'a scale that is not the same both ways stretches it';
            if (op.x < 1 - SCALE_EPSILON) return 'a scale under 1 shrinks or mirrors it';
        } else if (op.kind === 'matrix') {
            const sx = Math.hypot(op.a, op.b);
            const sy = Math.hypot(op.c, op.d);
            if (sx === 0 || sy === 0) return 'a matrix collapses it';
            if (Math.abs(sx - sy) > SCALE_EPSILON * Math.max(sx, sy)) return 'a matrix stretches it';
            if (sx < 1 - SCALE_EPSILON) return 'a matrix shrinks it';
            if (Math.abs((op.a * op.c + op.b * op.d) / (sx * sy)) >= SCALE_EPSILON) return 'a matrix skews it';
            if (op.a * op.d - op.b * op.c <= 0) return 'a matrix mirrors it';
            turn += (Math.atan2(op.b, op.a) * 180) / Math.PI;
        } else if (op.kind === 'rotate') {
            turn += op.deg;
        }
    }
    const net = ((turn % 360) + 360) % 360;
    const tilt = net > 180 ? net - 360 : net;
    return Math.abs(tilt) > STATE_TILT_DEG + 1e-9 ? `a turn of ${Number(tilt.toFixed(1))}° is more than a ${STATE_TILT_DEG}° tilt` : undefined;
}

const READ_TRANSFORM = (clean, ctx, name) => {
    const ops = transformFamilyOps(name, clean);
    if (ops === undefined) return 'a value this lint cannot take apart may do more than tilt the box';
    return ctx.money ? figureTransformProblem(name, ops) : boxTransformProblem(ops);
};

/**
 * The families the belt reads: which property names (a vendor prefix read as
 * plain), how, and whether a `var()` may stand (`varOk`). One entry per
 * property family; the first match reads. `read(clean, ctx, name)` gives the
 * reason a value may not stand, or undefined; `ctx.money` is whether the
 * rule's state selector may name a money node.
 */
const STATE_BELT = Object.freeze([
    { name: /^(?:clip-path|clip|mask(?:-.*)?)$/, read: only(/^(?:none|auto|initial|unset)$/i, 'a clip or a mask cuts a figure away') },
    { name: /^filter$/, read: only(/^(?:none|initial|unset)$/i, 'a filter blurs a figure out of sight') },
    {
        name: /^backdrop-filter$/,
        read: (clean) =>
            /^(?:none|initial|unset)$/i.test(clean) || /^(?:blur\([^()]*\)\s*)+$/i.test(clean)
                ? undefined
                : 'a backdrop-filter other than a blur repaints the ground behind a figure from what is behind it',
    },
    { name: /^(?:mix-blend-mode|background-blend-mode)$/, read: only(/^(?:normal|initial|unset)$/i, 'a blend mode loses a figure into what is behind it') },
    { name: /^visibility$/, read: only(/^(?:visible|initial)$/i, 'hiding a box hides the figure in it') },
    { name: /^content-visibility$/, read: only(/^(?:visible|initial)$/i, 'content-visibility but visible skips painting the figure') },
    { name: /^opacity$/, read: READ_OPACITY },
    { name: /^zoom$/, read: READ_ZOOM },
    { name: /^font-size-adjust$/, read: only(/^(?:none|initial|unset)$/i, 'a font-size-adjust scales the glyphs under the size the type floor reads') },
    { name: /^word-spacing$/, read: noNegative('a negative word-spacing (or one this lint cannot read) pulls the words of a figure onto each other') },
    {
        name: /^letter-spacing$/,
        read: noNegative(
            "a letter-spacing that is not plainly zero or more (or one this lint cannot read) may pile a figure's digits on each other; the probe reads the piling per face at rest, which no sheet can",
        ),
    },
    { name: /^text-indent$/, read: READ_TEXT_INDENT },
    { name: /^writing-mode$/, read: only(/^(?:horizontal-tb|initial)$/i, 'a writing mode but horizontal-tb reads a figure down') },
    { name: /^text-overflow$/, read: (clean) => (splitTopLevel(clean, ' ').every((t) => /^(?:clip|initial|unset)$/i.test(t)) ? undefined : 'an ellipsis prints in place of a figure\'s digits') },
    { name: /^line-clamp$/, read: only(/^(?:none|initial|unset)$/i, "a line clamp cuts a figure's later lines away and prints an ellipsis in their place") },
    { name: /^offset-path$/, read: only(/^(?:none|initial|unset)$/i, 'a motion path moves a box along it, and offset-rotate turns it') },
    { name: /^offset$/, read: only(/^(?:none|normal|auto|initial|unset)$/i, 'the offset shorthand may carry a motion path, which moves a box along it and turns it') },
    { name: /^text-decoration-line$/, read: READ_DECORATION_LINE },
    { name: /^text-decoration-thickness$/, read: only(/^(?:auto|from-font|initial|unset)$/i, "an underline thickness but the face's own (auto or from-font) strikes the glyphs") },
    { name: /^text-underline-offset$/, read: READ_UNDERLINE_OFFSET },
    { name: /^text-decoration$/, read: READ_DECORATION },
    { name: /^text-shadow$/, read: READ_TEXT_SHADOW },
    { name: /^outline-width$/, read: READ_OUTLINE_WIDTH },
    { name: /^outline-offset$/, read: READ_OUTLINE_OFFSET },
    { name: /^outline$/, read: READ_OUTLINE, varOk: true },
    { name: /^z-index$/, read: READ_Z_INDEX },
    { name: /^(?:transform|rotate|translate|scale)$/, read: READ_TRANSFORM },
    { name: /^color$/, read: inkFade, varOk: true },
    {
        name: /^(?:background|background-image)$/,
        read: (clean, ctx) => (ctx.money && PICTURE.test(withoutStrings(clean)) ? 'a picture under a figure\'s glyphs is a ground the probe cannot read, and fails' : undefined),
        varOk: true,
    },
]);

/**
 * Every longhand in the probe's `DRESS_HELD` set (`layout/probe.ts`; its
 * `BOX_HELD` is a subset), and how a first-party look sheet meets it. The
 * test `the-state-belt-accounts-for-every-longhand-the-probe-holds` parses
 * both sets out of the probe and fails on a member missing here, a member
 * here the probe no longer holds, and, for each `how`, on the behaviour it
 * names:
 * - `belt`: read under a state by `STATE_BELT` (a vendor prefix read as
 *   plain), save `outline-style`, which paints nothing without the width and
 *   offset that are read;
 * - `refused`: refused in a first-party look sheet wherever it stands, at rest
 *   or under a state (`REFUSED_PROPERTIES`, `PRINTING_KEYWORD`, or a keyword
 *   `declarationProblems` refuses);
 * - `unread`: read by no static rule, with the reason.
 */
export const STATE_BELT_ACCOUNT = Object.freeze({
    'clip-path': { how: 'belt' },
    clip: { how: 'belt' },
    'mask-image': { how: 'belt' },
    '-webkit-mask-image': { how: 'belt' },
    'mask-border-source': { how: 'belt' },
    '-webkit-mask-box-image-source': { how: 'belt' },
    '-webkit-mask-box-image': { how: 'belt' },
    filter: { how: 'belt' },
    'backdrop-filter': { how: 'belt' },
    'mix-blend-mode': { how: 'belt' },
    'background-blend-mode': { how: 'belt' },
    '-webkit-box-reflect': { how: 'refused' },
    'offset-path': { how: 'belt' },
    rotate: { how: 'belt' },
    scale: { how: 'belt' },
    translate: { how: 'belt' },
    transform: { how: 'belt' },
    opacity: { how: 'belt' },
    visibility: { how: 'belt' },
    'content-visibility': { how: 'belt' },
    zoom: { how: 'belt' },
    'font-size-adjust': { how: 'belt' },
    'word-spacing': { how: 'belt' },
    'text-indent': { how: 'belt' },
    'letter-spacing': { how: 'belt' },
    '-webkit-text-fill-color': { how: 'refused' },
    '-webkit-text-stroke-width': { how: 'refused' },
    '-webkit-text-security': { how: 'refused' },
    'background-clip': { how: 'refused' },
    '-webkit-background-clip': { how: 'refused' },
    'background-color': { how: 'unread', why: "its contrast against the ink is the probe's ground stack (`groundStackFault`), which needs the browser's layout and the engine's colours" },
    'background-image': { how: 'belt', why: 'a picture on a subject that may be a money node; a gradient is a ground, unread like background-color' },
    'outline-style': { how: 'belt' },
    'outline-width': { how: 'belt' },
    'outline-offset': { how: 'belt' },
    'text-decoration-line': { how: 'belt' },
    'text-decoration-thickness': { how: 'belt' },
    'text-underline-offset': { how: 'belt' },
    'text-emphasis-style': { how: 'refused' },
    'text-shadow': { how: 'belt' },
    direction: { how: 'refused' },
    'unicode-bidi': { how: 'refused' },
    'writing-mode': { how: 'belt' },
    '-webkit-writing-mode': { how: 'belt' },
    display: { how: 'refused', why: 'list-item is refused everywhere; display: none is skipped by the probe too (a figure a look hides whole)' },
    'animation-name': { how: 'belt', why: 'the keyframes a state rule names are read as if the state rule set them' },
    content: { how: 'refused' },
    '-webkit-text-decorations-in-effect': { how: 'unread', why: 'a computed value no sheet can set; the text-decoration properties that make it are read' },
    color: { how: 'belt', why: "the ink's alpha only, in a literal; its contrast against the ground is the ground stack's, and a var() stands" },
    'text-overflow': { how: 'belt' },
    'line-clamp': { how: 'belt' },
    '-webkit-line-clamp': { how: 'belt' },
});

/** Why one declaration under a state may not stand, or undefined. */
function stateBeltReason(prop, value, ctx) {
    if (prop.startsWith('--')) {
        return 'a custom property set under a state re-states, where no family here reads it, a value a rule at rest reads as a clip, a blur or an animation (stall.css reads --s-price-clip, --s-icon-clip, --s-head-blur and --s-tabs-blur that way)';
    }
    const name = prop.replace(VENDOR_PREFIX, '');
    const entry = STATE_BELT.find((family) => family.name.test(name));
    if (entry === undefined) return undefined;
    const clean = value.replace(/\s*!\s*important\s*$/i, '').trim();
    if (entry.varOk !== true && /(?<![\w-])var\s*\(/i.test(withoutStrings(clean))) return BELT_VAR;
    return entry.read(clean, ctx, name);
}

/** The names an `animation` or `animation-name` declaration starts, or undefined where it names one through a `var()`. */
function animationNames(prop, value) {
    const clean = value.replace(/\s*!\s*important\s*$/i, '').trim();
    if (/(?<![\w-])var\s*\(/i.test(clean)) return undefined;
    const names = [];
    for (const part of splitTopLevel(clean, ',')) {
        const name = prop === 'animation-name' ? part : parseSingleAnimation(part).name;
        if (name !== undefined) names.push(name.replace(/^["']|["']$/g, ''));
    }
    return names;
}

/**
 * Why the declarations of a rule whose selector names a state may not stand
 * (see above); a rule of no state has none. `keyframes` is the sheet's
 * keyframes by name (`keyframesOf`): the stops of one a declaration starts
 * are read as if the state rule had set them.
 */
function stateBeltProblems(decls, selectors, keyframes = new Map()) {
    const states = selectors.filter(namesABeltState);
    if (states.length === 0) return [];
    const state = states[0];
    const ctx = { money: states.some(mayBeMoneyNode) };
    const out = [];
    const said = new Set();
    for (const { prop, value } of decls) {
        const why = stateBeltReason(prop, value, ctx);
        if (why !== undefined) out.push(`${prop}: ${echo(value, 48)} under "${echo(state)}" — ${why}${BELT_TAIL}`);
        const name = prop.replace(VENDOR_PREFIX, '');
        if (name !== 'animation' && name !== 'animation-name') continue;
        const names = animationNames(name, value);
        if (names === undefined) {
            out.push(
                `${prop}: ${echo(value, 48)} under "${echo(state)}" — an animation a state starts by a name this lint cannot read (a var()) may run any keyframe, ` +
                    `and every stop of one is read as if the state rule had set it${BELT_TAIL}`,
            );
            continue;
        }
        for (const keyframe of names) {
            for (const stop of keyframes.get(keyframe) ?? []) {
                for (const decl of stop) {
                    const reason = stateBeltReason(decl.prop, decl.value, ctx);
                    const message = `${decl.prop}: ${echo(decl.value, 48)} in @keyframes "${echo(keyframe)}", which ${prop} starts under "${echo(state)}" — ${reason}${BELT_TAIL}`;
                    if (reason !== undefined && !said.has(message)) {
                        said.add(message);
                        out.push(message);
                    }
                }
            }
        }
    }
    return out;
}

/** The sheet's keyframes by name, each as the declarations of its stops: what a state rule that names one starts. */
function keyframesOf(nodes, into = new Map()) {
    for (const node of nodes) {
        if (node.kind === 'rule' || node.statement) continue;
        if (node.name === 'keyframes') {
            const name = node.prelude.replace(/^@keyframes\s*/i, '').trim().replace(/^["']|["']$/g, '');
            const body = node.body ?? '';
            const stops = parseList(body, 0, body.length, [])
                .filter((stop) => stop.kind === 'rule')
                .map((stop) => declarationsOf(stop.body));
            into.set(name, [...(into.get(name) ?? []), ...stops]);
        } else if (node.children !== undefined) {
            keyframesOf(node.children, into);
        }
    }
    return into;
}

function selectorProblems(selector, { kit = false } = {}) {
    const out = [];
    if (kit && FIRST_PARTY_HOOK.test(selector)) {
        out.push(
            `"${echo(selector)}" names a first-party hook (a look's mark, data-script or data-name-tier): the kit names none until the workshop README does`,
        );
    }
    const piece = kit ? null : FIGURE_PIECE.exec(selector);
    if (piece !== null) {
        out.push(
            `"${echo(selector)}" names ${piece[0]}, a piece of a money figure the app breaks after its commas — a look dresses a figure only as a whole`,
        );
    }
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
 * The properties that make a box a query container, which a first-party look
 * sheet may not set (`declarationProblems`, the 8g0 critic's P2-2): the
 * shop window's `@container sw` conditions and `cqw` / `cqh` units are the
 * wall's, not the look's.
 */
const CONTAINER_PROPERTIES = new Set(['container-name', 'container-type', 'container']);

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

/** The one prefixed property with no unprefixed twin that a first-party sheet may write, and only as `transparent`. */
const TAP_HIGHLIGHT = '-webkit-tap-highlight-color';

/**
 * `-webkit-mask-composite` takes the legacy compositing keywords, the
 * standard `mask-composite` the new ones, and these four pairs name the same
 * operation (step 8f1, the step-8 plan §4.2: a look that subtracts one mask
 * layer from another writes `source-out` beside `subtract`). In a look sheet
 * a prefixed `-webkit-mask-composite` stands beside a `mask-composite` whose
 * value is the same, or the same layer for layer through this table
 * (`a-legacy-mask-composite-is-the-same-value`). The kit keeps the plain
 * rule — "beside its unprefixed twin at the same value", as the workshop
 * README states it — until the owner words the README to match.
 */
export const MASK_COMPOSITE_LEGACY = Object.freeze({
    'source-over': 'add',
    'source-out': 'subtract',
    'source-in': 'intersect',
    xor: 'exclude',
});

/** Whether a `-webkit-mask-composite` value composes what a `mask-composite` value does, layer for layer. */
function compositesAgree(legacy, standard) {
    const a = legacy.toLowerCase().split(',').map((part) => part.trim());
    const b = standard.toLowerCase().split(',').map((part) => part.trim());
    return (
        a.length === b.length &&
        a.every((word, i) => word === b[i] || (Object.hasOwn(MASK_COMPOSITE_LEGACY, word) && MASK_COMPOSITE_LEGACY[word] === b[i]))
    );
}

/**
 * The boxes a look sheet may make `position: sticky` (step 8f1; the step-8
 * critic's item 20 — written as a shape any look may use, never as one
 * look's class): the sign's own box, `.stall-head`, so a look can keep the
 * seller's sign in view while the goods scroll.
 * One box, so at most one sticky box per look. Every other sticky box, and
 * every fixed one, is refused: a box that follows the scroll can stand over
 * a figure at a position no pass scrolled to. A rule is admitted only when
 * every selector's subject is exactly the listed class (optionally on its
 * `header`), at rest — no state pseudo-class, no attribute but `data-role`.
 * The kit refuses every sticky box, as the workshop README says.
 *
 * **Measured by the probe's scroll pass** (step 8f2,
 * `a-sticky-sign-covers-nothing-as-the-region-scrolls`): on every screen a
 * sticky sign is painted, its region is scrolled through stops and no
 * protected box may stand under it at any. The pass reads its subjects from
 * `layout/stickyBoxes.ts`, held to this table by
 * `the-scroll-pass-measures-what-the-lint-admits` — a box admitted here and
 * scrolled under by no pass would be a sticky box nobody measured. **Off
 * the wall only** (8f2, the 8f2 critic's P3-9): the shop window, and a
 * turned one above all — whose region scrolls along the screen's other axis
 * — is measured by no scroll pass, so the rule's look compound must say
 * `:not(.shop-window)` (`.t-x:not(.shop-window) .stall-head`) until one is.
 */
export const STICKY_BOXES = Object.freeze([
    Object.freeze({
        subject: 'stall-head',
        why: "the seller's sign, kept in view while the goods scroll",
    }),
]);

/** The last compound of a selector (its subject), split at the top-level combinators. */
function subjectOf(selector) {
    let depth = 0;
    let start = 0;
    const text = selector.trim();
    for (let i = 0; i < text.length; i += 1) {
        const c = text[i];
        if (c === '"' || c === "'") {
            i = skipString(text, i) - 1;
        } else if (c === '(' || c === '[') depth += 1;
        else if (c === ')' || c === ']') depth = Math.max(0, depth - 1);
        else if (depth === 0 && (c === '>' || c === '+' || c === '~' || /\s/.test(c))) start = i + 1;
    }
    return text.slice(start);
}

/** The top-level compounds of a selector, split at its combinators. */
function compoundsOf(selector) {
    const out = [];
    let depth = 0;
    let cur = '';
    const text = selector.trim();
    for (let i = 0; i < text.length; i += 1) {
        const c = text[i];
        if (c === '(' || c === '[') depth += 1;
        else if (c === ')' || c === ']') depth = Math.max(0, depth - 1);
        if (depth === 0 && (c === '>' || c === '+' || c === '~' || /\s/.test(c))) {
            if (cur !== '') out.push(cur);
            cur = '';
        } else {
            cur += c;
        }
    }
    if (cur !== '') out.push(cur);
    return out;
}

/** Whether a selector's look compound keeps it off the wall: `.t-x:not(.shop-window)`. */
function offTheWall(selector) {
    return compoundsOf(selector).some((compound) => /\.t-[a-z0-9-]+/.test(compound) && /:not\(\s*\.shop-window\s*\)/.test(compound));
}

/** Whether every selector of a rule names a box `STICKY_BOXES` admits, at rest and off the wall. */
function isStickyBox(selectors) {
    return (
        selectors !== undefined &&
        selectors.length > 0 &&
        selectors.every((selector) => {
            const subject = subjectOf(selector);
            return (
                !isStateSelector(selector) &&
                offTheWall(selector) &&
                STICKY_BOXES.some((box) => subject === `.${box.subject}` || subject === `header.${box.subject}`)
            );
        })
    );
}

/**
 * Why the declarations of one block may not stand, or nothing: G2 (generated
 * text and every other text road), G4 (`!important`, a fixed or sticky
 * position, a prefixed property with no twin, the ink roads). `selectors` is
 * the rule's selector list, or undefined inside a keyframe, where `content`
 * is refused outright.
 */
/** The properties that clip or mask a box: what a file's mask hides, it hides whole. */
const MASKING = /^(?:-webkit-)?mask(?:-|$)|^clip-path$|^-webkit-mask-box-image/;

/**
 * Whether a declaration masks or clips a box with a file (step 8g-pre, the
 * step critic's P2-1): a masking property (`MASKING`: a mask, its
 * shorthand, longhands and border, the legacy box image, a clip path)
 * whose value names a file target as the build reads one — `urlTargets`,
 * every `url()` and every `image-set()` / `-webkit-image-set()` entry —
 * read with every escape decoded. The one reader for "this masking value
 * names a file": the look rules' refusal of a file mask in a state rule or
 * a keyframe asks it, and so does the probe runner's owed art-off frame
 * (`sheetMasksWithAFile`, `CARRIED_FILE_ART` in `scripts/layout-check.mjs`).
 * A file a custom property carries in through `var()` is the custom
 * property rule's to refuse in a first-party sheet; a `var(--x, url(…))`
 * fallback names its file here.
 */
export function masksWithAFile(prop, value) {
    return MASKING.test(prop) && urlTargets(decodeEscapes(value)).length > 0;
}

/**
 * Whether a sheet masks or clips anything with a file, anywhere — a rule at
 * rest, a state rule, a media block, a keyframe stop: `masksWithAFile` over
 * every declaration of the parsed, comment-blanked sheet. The probe runner
 * reads it for the carried looks that owe an art-off frame
 * (`the-owed-art-off-frame-reads-every-file-a-mask-names`).
 */
export function sheetMasksWithAFile(css) {
    const anyIn = (list) =>
        list.some((node) => {
            if (node.kind === 'rule') {
                return declarationsOf(node.body).some(({ prop, value }) => masksWithAFile(prop, value));
            }
            if (node.body !== undefined) {
                return anyIn(parseList(node.body, 0, node.body.length, []));
            }
            return anyIn(node.children ?? []);
        });
    return anyIn(parseSheet(css).nodes);
}

/**
 * Pseudo-classes and attributes a box reaches only after the page is used:
 * the probe measures every screen at rest, so a rule gated on one of these
 * paints on a screen no pass measured.
 */
const STATE_PSEUDO = /:(?:hover|focus|focus-visible|focus-within|active|checked|target|open|popover-open|disabled|enabled|placeholder-shown|invalid|valid|indeterminate|visited|link|any-link)(?![\w-])/i;

/** True when a selector reaches its box only in a state (`STATE_PSEUDO`, or any attribute but `data-role`). */
function isStateSelector(selector) {
    if (STATE_PSEUDO.test(selector)) return true;
    return [...selector.matchAll(/\[\s*([\w-]+)/g)].some((m) => m[1].toLowerCase() !== 'data-role');
}

function declarationProblems(decls, selectors, { firstParty = false } = {}) {
    const out = [];
    for (const { prop, value } of decls) {
        const shown = `${prop}: ${echo(value, 48)}`;
        const bare = withoutStrings(value);
        /*
         * A file's mask or clip in a state rule or a keyframe (the step-6
         * critic's P3): `no-word-is-clipped-by-a-file` asks the probe's
         * paints, which are at rest and frozen at one instant, so a mask
         * that arrives with a hover, a pressed state or an animation step
         * would hide words on a screen the probe never measured. Refused
         * where it is written; a mask on a box at rest is the probe's to
         * judge. A file is every target `urlTargets` reads (`masksWithAFile`:
         * a `url()`, an `image-set()` entry, prefixed forms included — the
         * step 8g-pre critic's P2-1, where `image-set()` passed). A file
         * carried in by a custom property is not seen here, so a first-party
         * sheet may not write one there (below); in the kit's, not seen,
         * stated.
         */
        if (masksWithAFile(prop, value)) {
            if (selectors === undefined) {
                out.push(`${shown} — a file's mask or clip in a keyframe: the probe reads one frozen instant, so a mask that animates in is measured by no pass`);
            } else if (selectors.some(isStateSelector)) {
                out.push(`${shown} — a file's mask or clip in a state rule: the probe measures every screen at rest, so a mask that arrives with a state is measured by no pass`);
            }
        }
        /*
         * A file named inside a custom property (step 8g-pre; the 8g plan's
         * critic, P2-2): in a first-party look sheet — a shipped look's,
         * the harness's fixture look's, a private look's — every `url()`
         * and `image-set()` is written in the property that paints it.
         * Carried through `var()`, a file switches off two belts that read
         * the painting property's own value: the art-off frames the probe
         * owes a look whose sheet names a file in a mask or a clip
         * (`CARRIED_FILE_ART` in `scripts/layout-check.mjs`, over
         * `sheetMasksWithAFile`), and the
         * refusal above of a file mask in a state rule or a keyframe. Read
         * with every escape decoded and inside strings too, so `u\72l(`
         * and a quoted `url(` are the same function (an escape outside a
         * string is refused on its own as well, below). The kit keeps its
         * own rules: its README states them, and a rule added there is the
         * owner's line to write.
         */
        /*
         * A custom property in a keyframe (the lint-belts critic's P2): which
         * property a rule reads it as (`letter-spacing: var(--g)`, a clip, a
         * size) is the rule's, not the keyframe's, so every check that reads
         * the property names a keyframe sets — the money node's size and
         * width (`keyframeSizeMotion`), the state belt, the probe's own read
         * of a running animation's longhands — passes a figure that moves by
         * `--g`. No look sheet animates one; stall.css's own do (it is no
         * look sheet). The kit keeps the rules its README states.
         */
        if (firstParty && selectors === undefined && prop.startsWith('--')) {
            out.push(
                `${shown} — a custom property in a keyframe: it animates a value under no property name, so a rule that reads it as a letter-spacing, a clip or a size moves a money node past every check that reads the names a keyframe sets`,
            );
        }
        if (firstParty && prop.startsWith('--') && /(?:url|image-set)\(/i.test(decodeEscapes(value))) {
            out.push(
                `${shown} — a file named in a custom property: write each url() and image-set() in the property that paints it, where the file-art checks read it`,
            );
        }
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
        if (!firstParty && prop === '--name-rungs') {
            out.push(`${shown} — the name ladder is a first-party hook: the kit states no rungs until the workshop README does`);
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
        /*
         * The browser's own link colour (the 8e1 critic's item 10): `revert`
         * or `revert-layer` on `color` — or on `all`, which carries it —
         * rolls a link back to the user agent's blue and its `:visited`
         * purple, which no pass can see (a browser never tells script a
         * visited link's colour); `every-anchor-the-app-builds-sets-its-own-colour`
         * reads only that some sheet colours each anchor.
         */
        if ((prop === 'color' || prop === 'all') && /(?<![\w-])revert(?:-layer)?(?![\w-])/i.test(keywords)) {
            out.push(`${shown} — reverting the colour hands a link back to the browser's own blue and visited purple, which no pass can see`);
        }
        /*
         * `all` other than `inherit` or `unset` (the private face guards'
         * re-review, R-1): `all: initial` resets `font-family` to its
         * initial value, the browser's default — a font of the reader's
         * machine, on a money node as readily as anywhere — and writes no
         * family list for the served-face rules to read. `unset` lets
         * `font-family` inherit, as `inherit` does. A first-party sheet's
         * rule; the kit keeps the rules its README states.
         */
        if (firstParty && prop === 'all' && !/^(?:inherit|unset)$/i.test(clean)) {
            out.push(`${shown} — resets font-family to the browser's default, a font of the reader's machine; a look sheet writes all only as inherit or unset`);
        }
        /*
         * `text-transform: full-width` and `full-size-kana` (the re-review,
         * R-6) paint other characters than the page's — the fullwidth forms
         * (U+FF01–FF5E), the full-size kana — which no served face draws, so
         * the line falls to a font of the reader's machine whatever its
         * stack says. Refused as a keyword anywhere in a first-party
         * declaration, a function's arguments and a custom property
         * included: stall.css's `text-transform: var(--s-sign-case)` takes
         * it from a variable. No served sheet uses either. The kit keeps the
         * rules its README states.
         */
        if (firstParty && /(?<![\w-])(?:full-width|full-size-kana)(?![\w-])/i.test(bare)) {
            out.push(`${shown} — full-width and full-size-kana paint characters no served face draws (the fullwidth forms, the full-size kana): the line falls to a font of the reader's machine`);
        }
        /*
         * `container-name`, `container-type` and the `container` shorthand
         * (the 8g0 critic's P2-2): `@container` is refused above for sizing
         * rules to a box the probe does not choose, and these three are the
         * same door from the other side. `window.css` makes the shop
         * window's frame the one size container, named `sw`, and every
         * `@container sw` condition in it and every bare `cqw` / `cqh` unit
         * resolves against the nearest container that matches, so a look
         * that makes any box below the frame a container answers them with
         * a box of its own choosing. A first-party sheet's rule: no served
         * look sheet sets one (grepped), so the refusal is inert on the
         * tree. The kit keeps the rules its README states, and a line there
         * is the owner's to write.
         */
        if (firstParty && CONTAINER_PROPERTIES.has(prop)) {
            out.push(
                `${shown} — ${prop} would re-point the wall's container queries (window.css's @container sw conditions and its cqw and cqh units) at a box the look picks, one the probe does not choose; @container is refused for the same reason`,
            );
        }
        if (prop === 'position' && /(?<![\w-])(fixed|sticky|-webkit-sticky)(?![\w-])/i.test(keywords)) {
            const sign = firstParty && /^sticky$/i.test(keywords.trim()) && isStickyBox(selectors);
            if (!sign) {
                out.push(
                    `${shown} — a fixed or sticky box follows the scroll, and can stand over a figure at a position the probe never scrolled to` +
                        (firstParty ? ` (a look sheet may make sticky only ${STICKY_BOXES.map((b) => `.${b.subject}`).join(', ')}, at rest and off the wall: .t-x:not(.shop-window) .stall-head)` : ''),
                );
            }
        }
        /*
         * `-webkit-tap-highlight-color` (D5 (a)): the flash a touch screen
         * paints over whatever is tapped, a money control among them, in a
         * colour no pass reads. In a first-party sheet only `transparent`
         * stands, at rest, under a state and in a keyframe alike. It has no
         * unprefixed twin, so the twin rule below does not apply to it here.
         * The kit keeps that rule, which asks for a `tap-highlight-color` of
         * the same value beside it and passes the pair: `-webkit-tap-highlight-color:
         * red; tap-highlight-color: red;` is a kit sheet that stands (a
         * twin naming a property nothing reads satisfies the rule). So the
         * kit refuses the highlight only when it stands without such a twin
         * (the lint-belts critic's B1; this comment, the belt's docblock and
         * 009ddbc's message said "in any value").
         * `the-kit-twin-rule-passes-the-tap-highlight-beside-an-unread-twin`.
         */
        if (firstParty && prop === TAP_HIGHLIGHT && !/^transparent$/i.test(clean)) {
            out.push(`${shown} — a tap highlight paints a colour over whatever is tapped, a money control among them, where no pass looks; only transparent stands`);
        }
        const prefixed = PREFIXED_EVERYWHERE.has(prop) || (firstParty && prop === TAP_HIGHLIGHT) ? null : VENDOR_PREFIX.exec(prop);
        if (prefixed !== null) {
            const twin = prop.slice(prefixed[0].length);
            const same = decls.some((d) => {
                if (d.prop !== twin) return false;
                const theirs = d.value.replace(/\s*!\s*important\s*$/i, '');
                return theirs === clean || (firstParty && prop === '-webkit-mask-composite' && compositesAgree(clean, theirs));
            });
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
 * The families Stall serves itself: the `font-family` of every `@font-face`
 * its own sheets declare (`stall.css`: Inter, JetBrains Mono and Stall
 * Serif, each in Latin and Vietnamese subsets). Held to the sheets by
 * `every-font-family-opens-with-a-served-face` (`scripts/served-faces.test.mjs`),
 * so a face renamed on one side — Lora's rename to Stall Serif was one —
 * turns that test red rather than leaving a look painted in whatever the
 * reader's machine has.
 */
export const SERVED_FAMILIES = Object.freeze(['Inter', 'JetBrains Mono', 'Stall Serif']);

/** The first family of a family list, unquoted, its escapes decoded and its whitespace collapsed; undefined for an empty list. */
export function firstFamily(list) {
    const first = splitTopLevel(String(list), ',')[0];
    if (first === undefined) return undefined;
    const quoted = /^(["'])([\s\S]*)\1$/.exec(first);
    return decodeEscapes(quoted === null ? first : quoted[2])
        .replace(/\s+/g, ' ')
        .trim();
}

/** A token of a `font` shorthand before its size: a style, a variant, a weight or a stretch. */
const FONT_PREFIX = /^(?:normal|italic|oblique|small-caps|bold|bolder|lighter|\d+(?:\.\d+)?|(?:ultra-|extra-|semi-)?(?:condensed|expanded))$/i;
/** A `font` shorthand's size: a keyword, a length or percentage, or a math function. */
const FONT_SIZE = /^(?:xx-small|x-small|small|medium|large|x-large|xx-large|xxx-large|larger|smaller|-?[\d.]+(?:[a-z]+|%)|(?:calc|clamp|min|max)\([\s\S]*\))$/i;

/**
 * The family list of a `font` shorthand — what follows its size and line
 * height — or undefined when this reader finds no size followed by a list.
 */
export function shorthandFamilies(value) {
    const tokens = splitTopLevel(String(value), ' ');
    for (let i = 0; i < tokens.length; i += 1) {
        if (FONT_PREFIX.test(tokens[i])) continue;
        const [size, lineHeight] = tokens[i].split('/');
        if (!FONT_SIZE.test(size)) return undefined;
        let next = i + 1;
        if (lineHeight === '') next += 1;
        else if (lineHeight === undefined && tokens[next] === '/') next += 2;
        else if (lineHeight === undefined && tokens[next]?.startsWith('/')) next += 1;
        const rest = tokens.slice(next).join(' ');
        return rest === '' ? undefined : rest;
    }
    return undefined;
}

/**
 * Why a family list may not stand in a look sheet, or nothing
 * (`a-look-names-only-a-served-face`): it opens with `inherit` (alone), a
 * `var(--s-font…)`, a family Stall serves (`SERVED_FAMILIES`), or — in a
 * worn-only sheet — a family the sheet's own `@font-face` declares. Anything
 * else paints in whatever the reader's machine has, which the probe, run on
 * one machine, measures as that machine's: a misspelt name (`"Stal Serif"`),
 * a system face (`Georgia`), or a stack of generics alone (`serif`).
 */
export function familyListProblem(list, ownFamilies = []) {
    const first = firstFamily(list);
    if (first === undefined) return 'names no family';
    if (/^var\(\s*--s-font[\w-]*\s*(?:,[\s\S]*)?\)$/i.test(first)) return undefined;
    if (first.toLowerCase() === 'inherit') {
        return splitTopLevel(String(list), ',').length === 1 ? undefined : 'inherit stands alone or not at all';
    }
    const allowed = [...SERVED_FAMILIES, ...ownFamilies];
    if (allowed.some((family) => family.toLowerCase() === first.toLowerCase())) return undefined;
    return (
        `opens with "${echo(first)}", a family no served sheet declares — it paints in whatever the reader's machine has, ` +
        `and the probe measures this machine's; open with ${allowed.map((family) => `"${family}"`).join(', ')}, var(--s-font) or inherit`
    );
}

/** The font declarations of one block that name a face this page may not have (`a-look-names-only-a-served-face`). */
function fontProblems(decls, ownFamilies) {
    const out = [];
    for (const { prop, value } of decls) {
        const clean = value.replace(/\s*!\s*important\s*$/i, '').trim();
        const shown = `${prop}: ${echo(clean, 48)}`;
        if (prop === 'font-family' || /^--s-font[\w-]*$/.test(prop)) {
            const why = familyListProblem(clean, ownFamilies);
            if (why !== undefined) out.push(`${shown} — ${why} (a-look-names-only-a-served-face)`);
        } else if (prop === 'font' && clean.toLowerCase() !== 'inherit') {
            const families = shorthandFamilies(clean);
            const why =
                families === undefined
                    ? 'a font shorthand whose family this lint cannot read — write the family in font-family'
                    : familyListProblem(families, ownFamilies);
            if (why !== undefined) out.push(`${shown} — ${why} (a-look-names-only-a-served-face)`);
        }
    }
    return out;
}

/**
 * Every font declaration of a whole sheet that names a face this page may
 * not have — its rules, its `@media` blocks and its keyframes, never an
 * `@font-face`'s own descriptor — as `line N: …` sentences. `worn` reads
 * the sheet's own `@font-face` families as its own faces. The look lint
 * applies the same rule (`a-look-names-only-a-served-face`); this is the
 * form `every-font-family-opens-with-a-served-face` reads every served
 * sheet with, base and screen sheets included.
 */
export function sheetFontProblems(css, { worn = false } = {}) {
    const { text, nodes } = parseSheet(css);
    const ownFamilies = worn ? declaredNames(css).families : [];
    const out = [];
    const visit = (list, offset) => {
        for (const node of list) {
            const line = lineOf(text, offset + node.start);
            if (node.kind === 'rule') {
                for (const why of fontProblems(declarationsOf(node.body), ownFamilies)) out.push(`line ${line}: ${why}`);
            } else if (node.name === 'keyframes') {
                for (const stop of parseSheet(node.body ?? '').nodes) {
                    if (stop.kind !== 'rule') continue;
                    for (const why of fontProblems(declarationsOf(stop.body), ownFamilies)) out.push(`line ${line}: ${why}`);
                }
            } else if (node.name !== 'font-face' && node.children !== undefined) {
                visit(node.children, offset);
            }
        }
    };
    visit(nodes, 0);
    return out;
}

/**
 * One look sheet's static rules — `kit` adds the kit's own (art, `src()`,
 * `wk-` keyframes) to what every look sheet obeys. Shared by `lintSheet` and
 * `lintLookSheet`, so a rule the shipped looks obey is a rule the kit obeys.
 */
function lintLook(css, { scope, kit, art, load = 'bundled', ownArt = undefined }) {
    const { text, nodes, errors } = parseSheet(css);
    const problems = errors.map((e) => `line ${lineOf(text, e.at)}: ${e.message}`);
    const at = (index, message) => problems.push(`line ${lineOf(text, index)}: ${message}`);
    // A worn-only sheet may name its own face (`fontFaceProblems`); no other sheet declares one.
    const ownFamilies = load === 'worn' ? declaredNames(css).families : [];
    // Whether a transition of `transform` is one of a size: some rule of this sheet scales (money-size motion).
    const sheetScales = !kit && sheetSetsAScalingTransform(nodes);
    // The sheet's keyframes by name: a state rule that starts one is read as if it set the stops (the state belt).
    const keyframes = kit ? new Map() : keyframesOf(nodes);

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
                    for (const why of selectorProblems(selector, { kit })) at(node.start, why);
                }
                for (const why of declarationProblems(declarationsOf(node.body), selectors, { firstParty: !kit })) at(node.start, why);
                for (const why of fontProblems(declarationsOf(node.body), ownFamilies)) at(node.start, why);
                if (!kit) for (const why of moneySizeMotionProblems(declarationsOf(node.body), selectors, { scales: sheetScales })) at(node.start, why);
                if (!kit) for (const why of stateBeltProblems(declarationsOf(node.body), selectors, keyframes)) at(node.start, why);
                continue;
            }
            if (node.name === 'keyframes') {
                const name = node.prelude.replace(/^@keyframes\s*/i, '').trim();
                if (kit && !/^wk-[\w-]+$/.test(name)) {
                    at(node.start, `@keyframes "${echo(name)}" must be named wk-… (keyframes are global)`);
                }
                const stopErrors = [];
                const sizeMotionSaid = new Set();
                for (const stop of parseList(node.body ?? '', 0, (node.body ?? '').length, stopErrors)) {
                    if (stop.kind === 'rule') {
                        for (const why of declarationProblems(declarationsOf(stop.body), undefined, { firstParty: !kit })) at(node.start, why);
                        for (const why of fontProblems(declarationsOf(stop.body), ownFamilies)) at(node.start, why);
                        if (!kit) {
                            for (const { prop, why } of keyframeSizeMotion(declarationsOf(stop.body))) {
                                const message =
                                    `@keyframes "${echo(name)}" animates ${prop}${why === '' ? '' : ` (${why})`} — any box a rule runs it on, a money node among them, ` +
                                    'is a size or width the wall\'s fit cannot hold (a keyframe out-ranks the size it sets)';
                                if (!sizeMotionSaid.has(message)) {
                                    sizeMotionSaid.add(message);
                                    at(node.start, message);
                                }
                            }
                        }
                    }
                }
            } else if (node.name === 'font-face' && load === 'worn' && !node.statement) {
                for (const why of fontFaceProblems(node.body ?? '', scope)) at(node.start, why);
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

    for (const why of namesItselfProblems(nodes, scope)) problems.push(why);
    if (load === 'worn' && !kit) {
        const own = ownArt ?? { dir: '', files: [] };
        const listed = new Set(own.files);
        for (const target of urlTargets(text)) {
            const why = ownArtProblem(target.value, own.dir, listed);
            if (why !== undefined) at(target.at, `url "${echo(target.value)}": ${why}`);
        }
        for (const m of text.matchAll(/(?<![\w-])src\(/gi)) {
            at(m.index, `src() is not allowed — ${ownArtRule(own.dir)}`);
        }
    }
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
 *    fixed or sticky box, no prefixed property without its twin, no ink road,
 *    and no font family Stall does not serve (`a-look-names-only-a-served-face`).
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
 * a shipped sheet is Stall's own, built and reviewed here. And the
 * first-party rules the kit does not carry: the sign sticky off the wall,
 * the legacy mask-composite pairs, the hooks, no file named in a custom
 * property (`a-look-writes-each-url-in-the-property-that-paints-it`), and
 * nothing that puts a line in a font of the reader's machine past the
 * served-face rules: no `all` but `inherit` or `unset`, no `full-width` or
 * `full-size-kana` (`a-look-names-only-a-served-face`), and no
 * `container-name`, `container-type` or `container`, which would re-point
 * the wall's `@container sw` conditions at a box the look picks
 * (`a-look-names-no-container-of-its-own`); and no selector naming a piece
 * of a money figure the app breaks after its commas (`.fig-say`, `.fig-end`),
 * since a look dresses a figure only as a whole
 * (`a-look-may-not-dress-a-figures-pieces`); and no transition of a size, a
 * letter or word spacing, a zoom or a scale on a money node, nor a keyframe
 * of any of them or of a transform that scales anywhere
 * (`a-look-never-animates-a-money-nodes-size`); and, under a state the probe
 * never paints (`:hover`, `:focus`, `:focus-visible`, `:focus-within`,
 * `:active`, `[data-turn]`), any value of a longhand in the probe's
 * `DRESS_HELD` or `BOX_HELD` that the probe refuses at rest (a clip, a mask,
 * a filter, a blend mode, an opacity under 1, a hidden box, a transform past
 * a tilt, a motion path, a line through the text, a negative indent or
 * spacing, a vertical writing mode, an outline wider than a ring, a z-index
 * under zero, …), a custom property, and the keyframes a state starts, and
 * no tap highlight but transparent anywhere
 * (`a-look-state-rule-never-hides-money`). First party only: the kit lint
 * carries none of these.
 */
export function lintLookSheet(css, { lookClass, load = 'bundled', ownArt = undefined }) {
    return lintLook(css, { scope: lookClass, kit: false, art: [], load, ownArt });
}

/* ---------- a look sheet names itself; a worn-only sheet keeps to itself ---------- */

/**
 * The custom property a look sheet declares on its own bare class, holding
 * that class: `.t-neo { --look-sheet: t-neo; }`. It paints nothing. The
 * probe reads it on every painted stall wearing a look, and `looks:diff` on
 * every shot (`a-look-is-measured-with-its-sheet`), so a look measured
 * without its sheet — a worn-only sheet that did not load, or a bundled one
 * dropped from the build — fails rather than passing as the base sheets
 * alone. Not `--s-`: those are the theme table's vars, emitted inline.
 */
export const LOOK_SHEET_PROPERTY = '--look-sheet';

/**
 * `every-look-sheet-names-itself`: exactly one `--look-sheet` declaration in
 * the sheet, in a top-level rule whose selector is the look's bare class
 * and nothing else, holding that class. One, because a second in a state
 * rule or a media block could read true on a stall where the first does
 * not; the bare class, because the root of every stall wearing the look
 * carries it and nothing narrower is guaranteed to match.
 */
function namesItselfProblems(nodes, scope) {
    const found = [];
    const visit = (list, top) => {
        for (const node of list) {
            if (node.kind === 'rule') {
                for (const decl of declarationsOf(node.body)) {
                    if (decl.prop === LOOK_SHEET_PROPERTY) found.push({ node, decl, top });
                }
            } else if (node.children !== undefined) {
                visit(node.children, false);
            } else if (node.name === 'keyframes' && /--look-sheet\s*:/i.test(node.body ?? '')) {
                found.push({ node, decl: undefined, top: false });
            }
        }
    };
    visit(nodes, true);
    const want = `.${scope} { ${LOOK_SHEET_PROPERTY}: ${scope}; }`;
    if (found.length === 0) {
        return [`the sheet does not name itself — add ${want}, how the probe knows the sheet is loaded`];
    }
    if (found.length > 1) {
        return [`${LOOK_SHEET_PROPERTY} is declared ${found.length} times — the sheet names itself once, as ${want}`];
    }
    const [{ node, decl, top }] = found;
    if (!top || decl === undefined || node.prelude.replace(/\s+/g, ' ').trim() !== `.${scope}`) {
        return [`${LOOK_SHEET_PROPERTY} is declared under "${echo(node.prelude)}" — the sheet names itself on its bare class, as ${want}`];
    }
    if (decl.value !== scope) {
        return [`${LOOK_SHEET_PROPERTY} holds "${echo(decl.value)}" — the sheet names itself, as ${want}`];
    }
    return [];
}

/**
 * The other half of `every-look-sheet-names-itself` (the step-6 critic's
 * P3): a sheet that is no look's — the base, a screen sheet, a document,
 * the harness's chrome — declares `--look-sheet` nowhere. The name is how
 * the probe and looks:diff know a look's own sheet was on the page; one
 * declared anywhere else would read true on a stall whose sheet never
 * loaded. `sheets` are `{ path, css, lookClass }`, `lookClass` absent on a
 * sheet that is no look's.
 */
export function foreignNamingProblems(sheets) {
    const out = [];
    for (const sheet of sheets) {
        if (sheet.lookClass !== undefined) continue;
        const count = [...blankComments(sheet.css).matchAll(/--look-sheet\s*:/gi)].length;
        if (count > 0) {
            out.push(`${sheet.path}: declares ${LOOK_SHEET_PROPERTY} ${count} time(s) — only a look's own sheet names a look (every-look-sheet-names-itself)`);
        }
    }
    return out;
}

/** The one road a worn-only sheet's `url()` may take: a file in its own directory. */
function ownArtRule(dir) {
    return `a worn-only sheet names only its own art — url(./${dir}/<name>.svg|.woff2), a file in that directory named in lower-case letters, digits and hyphens`;
}

/** A file name a worn-only look's directory may hold: its art and its faces. */
export const OWN_ART_NAME = /^[a-z0-9-]{1,64}\.(?:svg|woff2)$/;

/**
 * `a-worn-only-sheet-names-only-its-own-art`: every `url()` or `image-set()`
 * target is `./<dir>/<name>` or `<dir>/<name>`, `dir` the look's own
 * directory relative to the sheet and `name` one of `files`, the plain files
 * that directory holds. A worn-only sheet and its art are one download,
 * counted together against the look's budget (`each-look-keeps-its-art-budget`);
 * a sheet that reached into the shared decorations would make one file two
 * buckets' (`every-emitted-file-is-in-one-weight-bucket`), and one that
 * reached anywhere else is the kit's intake problem on a shipped look.
 */
function ownArtProblem(target, dir, files) {
    const value = target.trim();
    if (/^data:/i.test(value)) return `a data: URL — ${ownArtRule(dir)}`;
    if (/^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith('//')) {
        return `nothing loads from another site — ${ownArtRule(dir)}`;
    }
    const m = /^(?:\.\/)?([a-z0-9/-]+)\/([^/]+)$/.exec(value);
    if (m === null || m[1] !== dir || !OWN_ART_NAME.test(m[2])) return ownArtRule(dir);
    return files.has(m[2]) ? undefined : `there is no plain file ${dir}/${m[2]} beside the sheet`;
}

/** The family names an `@font-face` block declares, unquoted. */
function fontFamiliesOf(body) {
    return declarationsOf(body)
        .filter((decl) => decl.prop === 'font-family')
        .map((decl) => decl.value.replace(/^(["'])([\s\S]*)\1$/, '$2').trim());
}

/** The `font-display` values a look's face may take: text paints at once, in the fallback, while the face loads. */
export const FACE_DISPLAY = Object.freeze(['swap', 'fallback']);

/**
 * A worn-only sheet may carry its own face (v2 of the step-6 plan, item 8):
 * an `@font-face` for a family namespaced to the look — `<class>-…`, so it
 * can collide with no family another sheet declares
 * (`a-worn-only-sheet-replaces-no-keyframes` holds the collision) — whose
 * `src` is its own directory's files alone, `url()` and `format()` and
 * nothing a reader's machine supplies: `local()` paints a face installed
 * there, which differs per machine. The file is the look's own art
 * directory's, checked with every other `url()`.
 *
 * **And it never hides a figure while it loads** (the step-8 critic's item
 * 9, step 8b2): every face states `font-display: swap` or `fallback`, as
 * each of `stall.css`'s own faces states `swap`. A face that says nothing
 * takes the browser's `auto`, which in Chrome blocks — text in a face still
 * loading is invisible for up to three seconds — and a look that sets its
 * figures in its own face would paint the asked amount blank on a slow line,
 * after the loader's hold had already let the stall paint
 * (`a-look-face-never-hides-a-figure-while-it-loads`).
 */
function fontFaceProblems(body, scope) {
    const out = [];
    const families = fontFamiliesOf(body);
    if (families.length !== 1) {
        out.push('an @font-face names exactly one font-family');
    }
    for (const family of families) {
        if (!new RegExp(`^${scope}-[a-z0-9-]+$`).test(family)) {
            out.push(`@font-face family "${echo(family)}" is not namespaced to the look — name it ${scope}-<name>`);
        }
    }
    for (const decl of declarationsOf(body)) {
        if (decl.prop === 'src' && /(?<![\w-])local\(/i.test(decl.value)) {
            out.push("@font-face src takes no local() — a face on the reader's machine paints differently per machine");
        }
    }
    const display = declarationsOf(body).filter((decl) => decl.prop === 'font-display');
    if (display.length !== 1 || !FACE_DISPLAY.includes(display[0].value.trim().toLowerCase())) {
        out.push(
            `@font-face states font-display: ${FACE_DISPLAY.join(' or ')}, once — any other paints no text while the face loads, and a figure set in it is blank on a slow line`,
        );
    }
    return out;
}

/** Every `@keyframes` name and `@font-face` family a sheet declares, at any depth. */
function declaredNames(css) {
    const keyframes = [];
    const families = [];
    const visit = (list) => {
        for (const node of list) {
            if (node.kind !== 'at') continue;
            if (node.name === 'keyframes') keyframes.push(node.prelude.replace(/^@keyframes\s*/i, '').trim());
            else if (node.name === 'font-face') families.push(...fontFamiliesOf(node.body ?? ''));
            else if (node.children !== undefined) visit(node.children);
        }
    };
    visit(parseSheet(css).nodes);
    return { keyframes, families };
}

/** Every selector of every rule a sheet holds, at any depth. */
function selectorsOf(css) {
    const out = [];
    const visit = (list) => {
        for (const node of list) {
            if (node.kind === 'rule') out.push(...splitTopLevel(node.prelude, ','));
            else if (node.children !== undefined) visit(node.children);
        }
    };
    visit(parseSheet(css).nodes);
    return out;
}

/**
 * The worn-only rules that need every sheet at once, over `sheets` — each
 * `{ path, css, load, lookClass }`, `load` absent on a sheet that is no
 * look's (a base, a screen, a document): it is loaded with whatever serves
 * it, never on its own.
 *
 * - `a-worn-only-sheet-replaces-no-keyframes`: a `@keyframes` name or an
 *   `@font-face` family a worn-only sheet declares is declared by no other
 *   sheet. Both are global: a worn sheet arrives after the entry CSS, so a
 *   name it shares with a bundled sheet REPLACES that one on every stall of
 *   the page from the moment it loads — Stall's own animation or face,
 *   redrawn by one look's file, on every look.
 * - `no-bundled-sheet-names-a-worn-only-look`: no other sheet has a
 *   selector naming a worn-only look's class. A bundled rule for that look
 *   paints before its sheet arrives and stays when the sheet fails — the
 *   look half-dressed — so a worn-only look keeps all of its rules (its
 *   overlay plate's included, which `broadcast.css` keeps for the bundled
 *   three) in its own file.
 */
export function wornSheetProblems(sheets) {
    const out = [];
    const worn = sheets.filter((sheet) => sheet.load === 'worn');
    const names = new Map(sheets.map((sheet) => [sheet.path, declaredNames(sheet.css)]));
    for (const sheet of worn) {
        const own = names.get(sheet.path);
        for (const other of sheets) {
            if (other.path === sheet.path) continue;
            const theirs = names.get(other.path);
            for (const name of own.keyframes.filter((n) => theirs.keyframes.includes(n))) {
                out.push(`${sheet.path}: @keyframes ${echo(name)} is also declared in ${other.path} — a worn-only sheet replaces no keyframes (a-worn-only-sheet-replaces-no-keyframes)`);
            }
            // Family names match without regard to case, as the cascade matches them.
            const lower = new Set(theirs.families.map((f) => f.toLowerCase()));
            for (const family of own.families.filter((f) => lower.has(f.toLowerCase()))) {
                out.push(`${sheet.path}: @font-face family "${echo(family)}" is also declared in ${other.path} — a worn-only sheet replaces no face (a-worn-only-sheet-replaces-no-keyframes)`);
            }
        }
        const cls = new RegExp(`\\.${escapeRe(sheet.lookClass)}(?![\\w-])`);
        for (const other of sheets) {
            if (other.path === sheet.path) continue;
            for (const selector of selectorsOf(other.css).filter((sel) => cls.test(sel))) {
                out.push(`${other.path}: "${echo(selector)}" names .${sheet.lookClass}, a worn-only look — its rules live in its own sheet (no-bundled-sheet-names-a-worn-only-look)`);
            }
        }
    }
    return out;
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
    return nodes.some(
        (node) => !(isReduceBlock(node) && (node.children ?? []).length === 0) && !isNamingRule(node),
    );
}

/** The skeleton's one rule: the kit's sheet naming itself, and nothing else in that block. */
function isNamingRule(node) {
    if (node.kind !== 'rule' || node.prelude.trim() !== `.${KIT_CLASS}`) return false;
    const decls = declarationsOf(node.body);
    return decls.length === 1 && decls[0].prop === LOOK_SHEET_PROPERTY && decls[0].value === KIT_CLASS;
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
    // The sheet's name is a value, not a selector: `.t-neo { --look-sheet: t-neo; }`
    // re-scoped must name the kit, or the starter fails its own lint.
    const named = new RegExp(`(${escapeRe(LOOK_SHEET_PROPERTY)}\\s*:\\s*)t-${escapeRe(base)}(?![\\w-])`, 'g');
    const rescope = (css) => rebaseUrls(css.replace(cls, `.${KIT_CLASS}`).replace(named, `$1${KIT_CLASS}`));
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
