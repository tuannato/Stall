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

/**
 * The inside of every `[…]` in a selector, outside strings, at any depth —
 * inside `:has()` and `:not()` too — each with whether it stands inside a
 * `:not(…)` at any depth (`negated`: the sixth review's P3, a painted value
 * under a negation matches every value but that one).
 */
function attributeBlocksNegated(selector) {
    const out = [];
    // One entry per open parenthesis outside a string and a bracket: whether it opened a `:not(`.
    const open = [];
    let i = 0;
    while (i < selector.length) {
        const c = selector[i];
        if (c === '"' || c === "'") {
            i = skipString(selector, i);
            continue;
        }
        if (c === '(') {
            open.push(/:\s*not\s*$/i.test(selector.slice(0, i)));
        } else if (c === ')') {
            open.pop();
        } else if (c === '[') {
            let j = i + 1;
            while (j < selector.length && selector[j] !== ']') {
                j = selector[j] === '"' || selector[j] === "'" ? skipString(selector, j) : j + 1;
            }
            out.push({ inner: selector.slice(i + 1, j), negated: open.includes(true) });
            i = j + 1;
            continue;
        }
        i += 1;
    }
    return out;
}

/** The inside of every `[…]` in a selector, outside strings, at any depth — inside `:has()` and `:not()` too. */
function attributeBlocks(selector) {
    return attributeBlocksNegated(selector).map((block) => block.inner);
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

/**
 * Every pseudo-class and pseudo-element a selector names, in order, lower
 * case. **Whitespace is allowed after each colon** (the lint-belts critic's
 * B1): `blankComments` turns a comment into spaces, and a browser reads the
 * name through the comment, so a colon, an empty comment and `hover` are
 * `:hover`, and a double colon, a comment and `marker` are `::marker`. A
 * selector with a real space after the colon is no selector in
 * a browser; reading it as the pseudo is the fail-closed side. **The kit lint
 * reaches this**, through the older pseudo-element refusals (`::first-letter`,
 * `::first-line`, `::marker`, the engine-gated names and the rest, and the
 * pseudo-element `content` is written on), which a comment between the colon
 * and the name used to get past on main as well: a fix of a hole on main.
 * **A name with two dashes is read only when `dashed` is asked** (the fourth
 * review's smaller item): `:--open` is a custom selector no browser reads, and
 * the first-party belt reads it as the state it fails closed on; the kit
 * lint is unchanged and does not ask.
 */
function pseudoTokens(selector, dashed = false) {
    const out = [];
    const name = dashed ? /:(\s*:)?\s*(-{0,2}[a-z_][\w-]*)/gi : /:(\s*:)?\s*(-?[a-z_][\w-]*)/gi;
    for (const m of blankAttributes(selector).matchAll(name)) {
        const found = m[2].toLowerCase();
        out.push({ name: found, element: m[1] !== undefined || LEGACY_PSEUDO_ELEMENTS.has(found) });
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
 *   cannot read — a `var()`, a CSS-wide keyword — is `all`, and so is a
 *   custom property, which a registered one animates by its type; a vendor
 *   prefix is read as its unprefixed name), or `transform` **when it scales** (a
 *   transition names a property and not its end value, so `transform` is
 *   refused when some rule of the sheet whose subject may be a money node
 *   sets a `transform` that is more than a turn and a shift or that this lint
 *   cannot read: `scale()`, a `skew()`, a `matrix()` that scales, shears or
 *   mirrors (`scalingOf` reads its columns and its determinant), a 3D
 *   function, a `var()`) — **all of these on a rule whose subject may be a
 *   money node**: a subject naming a money node's class (`MONEY_NODE_CLASSES`,
 *   held to the tree by `the-money-node-classes-are-the-classes-of-the-money-nodes`)
 *   or role (`[data-role`), `.row.big dd` by its `dd`, or naming no class,
 *   id or attribute of its own at all (`span`, `*`, a bare `:is(…)`), which
 *   may match one; a subject that is a pseudo-element (`::before`, `::after`)
 *   is not the node;
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
 * were left off D-07's own list; the lint-belts critic's P3), and neither are
 * `width`, `min-width`, `max-width`, `padding*`, `margin*` and `border-width`,
 * which move the box a figure stands in (a transition or a keyframe of any of
 * them is accepted: the third review's plants `n6`, stated). The probe reads
 * what a keyframe of any of them does to a money figure at each keyframe
 * offset (before 8g2): `font-size-adjust` and a negative `text-indent` are
 * held by the dress rule there where the keyframe runs on the figure or a
 * box above it, and a figure's text that a keyframe of any of them cuts —
 * a positive indent, a size, a padding or a margin, wherever the keyframe
 * runs, a sibling's margin squeezing the figure inside its own clip among
 * them — is the self-clip read's (the fifth review's PTI, the sixth
 * review's PSQ2); a figure one spills over or covers, and a value between
 * two offsets, is read by nothing. Nor are `opacity` or `clip-path` in a keyframe named, which the
 * probe's dress rule holds on a money figure at each keyframe's written value
 * and at each keyframe offset, and on a box above it at each keyframe's
 * written value (a `clip-path` that moves refused, an opacity held at each
 * offset too); off money a moving ink is read at one frozen instant
 * (CLAUDE.md §10, "moving inks").
 * **`display` and `content-visibility` in a
 * keyframe are refused** (D-2026-10-20-10, `declarationProblems`): a keyframe
 * that sets either takes a box out of the layout for part of a cycle. A
 * keyframe is refused wherever a rule runs it, so a `scale`, a `letter-spacing` or a
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
/**
 * The classes a money node wears (the nodes `layout/moneySet.ts` names, by
 * the class the app gives each; the lint-belts critic's P2: `.listing-x`,
 * `.tk-x`, `.pay-eq`, `.pay-total` and `.pay-btn` were missing, and a rule
 * naming one of them was read as the rule of a box that is no money node).
 * A role is matched by `[data-role`, wherever it stands. Held by
 * `the-money-node-classes-are-the-classes-of-the-money-nodes`, which reads
 * `MONEY_SET`'s own class selectors and every node `src/ui/*.ts` gives a
 * money role (`el('tag', 'classes')` then `setAttribute('data-role', …)`, a
 * class chosen by a conditional, and the class a call hands
 * `quoteSurchargeNode` as its argument), and fails on a class missing here.
 * `another`, `fine`, `in`, `mini` and `pay-sub` are the classes such a node
 * shares with boxes that are not money, and are not listed (the lint-belts
 * critic's P3: `another` was listed and `mini` was not, though the one money
 * control that wears either, the pay sheets' second road `pay-wallet`, is a
 * `mini another` button and wears both: a hand-off control whose words are no
 * figure the fit reads). Pinned by value.
 */
export const MONEY_NODE_CLASSES = Object.freeze([
    'addr-full',
    'addr-short',
    'bc-q',
    'bc-sur',
    'buy',
    'event-dd',
    'face-surcharge',
    'fig-end',
    'fig-say',
    'item-fiat',
    'item-rate',
    'item-x',
    'listing-x',
    'pay-btn',
    'pay-eq',
    'pay-line-s',
    'pay-lines',
    'pay-q',
    'pay-rate',
    'pay-surcharge',
    'pay-total',
    'pay-x-n',
    'publish-hex',
    'quote-surcharge',
    'sel-sub',
    'sel-total',
    'sp',
    'sw-pay-fig',
    'sw-pay-lines',
    'sw-pay-rate',
    'sw-pay-s',
    'sw-pay-tot',
    'sw-pay-v',
    'sw-sel-btn',
    'sw-sel-pay',
    'sw-sel-t',
    'sw-sur',
    'tag-figure',
    'tag-surcharge',
    'tk-sur',
    'tk-x',
    'x',
]);
const MONEY_NODE = new RegExp(`\\.(?:${MONEY_NODE_CLASSES.join('|')})(?![\\w-])|\\[\\s*data-role(?![\\w-])`, 'i');
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
    if (prop === 'transition-property') return splitTopLevel(v, ',').map((name) => (name.startsWith('--') ? 'all' : name));
    return splitTopLevel(v, ',').map((one) => {
        const named = splitTopLevel(one, ' ').find(
            (token) => timeToken(token) === undefined && !EASING.test(token) && !token.includes('(') && token !== 'allow-discrete' && token !== 'normal',
        );
        // A custom property (a registered one, `@property --au-tide`, animates by its type) may drive any width: read as all.
        return named === undefined || named.startsWith('--') ? 'all' : named;
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
 * `matrix()` that scales, shears or mirrors, a 3D function that leaves the
 * plane (a depth of zero is flat, above) — or undefined.
 * **Turn and shift only** (the lint-belts critic's B1): the column-lengths
 * check alone let `matrix(0.6, 0.8, 0.8, 0.6, 0, 0)` (a shear and a mirror)
 * and `skewX(60deg)` through a rule whose docblock said otherwise.
 */
function scalingOf(ops) {
    for (const op of ops) {
        if (op.kind === '3d') return 'a 3D function that leaves the plane foreshortens it';
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

/* ---------- a state rule sets only what a state may ---------- */

/*
 * **A state rule sets only what a state may** (D-2026-10-20-08, the owner's
 * "Ok b" of 2026-10-20, which replaced the blocklist that D5 (a) of
 * D-2026-10-20-06 had built first: the lint-belts critic found a new hole in
 * it on each of three rounds, a faded colour carried by a theme token,
 * `all: inherit`, and a border, an outline or an underline written at rest
 * and switched on by a state; narrowed after the third review by
 * D-2026-10-20-10 and D-2026-10-20-11). The probe measures every screen at
 * rest and paints no hover, no focus, no press and no turned wall, so a
 * declaration that arrives with a state is read by no pass.
 *
 * **What names a state fails closed** (D-2026-10-20-11). A first-party look
 * sheet's selector names a state when it names *any* pseudo-class that is
 * not one of the sixteen structural ones (`STRUCTURAL_PSEUDO_CLASSES`), or
 * one of six attributes (`STATE_ATTRIBUTE_NAMES`: `[open]`, `[hidden]`,
 * `[data-turn]` and — the fourth review's B3 — `[data-state]`,
 * `[aria-disabled]` and `[data-over]`, the three a look may match and no
 * fixture paints), or — the fifth review's ranked item 1 —
 * `data-format` and `data-code` except for the values some screen paints
 * (`STATE_EXCEPT_PAINTED`: `data-format='tag'`, and no value of `data-code`),
 * in any form or case,
 * anywhere in the selector: an ancestor's state reaches a figure inside it,
 * and a state inside `:is()`, `:where()`, `:has()` or `:not()` is read as the
 * state it names, so `:not(:hover)` is a state rule too. The first version
 * named nine pseudo-classes and `[data-turn]`, and the critic found the
 * states it did not name: the probe opens every `<details>`, so a fold's
 * closed default is a state no pass paints
 * (`.sheet:has(details:not([open])) .pay-x`), and the same goes for a field
 * with a placeholder showing (`:placeholder-shown`) and a box with `hidden`.
 * A comment between the colon and the name is read through
 * (`pseudoTokens`). Such a rule sets the properties below and **nothing
 * else**. Every other declaration is refused with one sentence that names
 * the property (`STATE_ALLOWED` lists the properties;
 * `a-look-state-rule-sets-only-what-a-state-may` holds it).
 *
 * **A pseudo-element under a state is held to a shorter list**
 * (`STATE_PSEUDO_ALLOWED`): `cursor`, `transition` and its longhands, and the
 * exact identity transforms below. **Not `color`**: a generated glyph at a
 * large size would appear over a figure when its colour changed. The probe
 * measures a pseudo-element only by its paint at rest, so a ground, a border,
 * a shadow, an outline or an ink that a state gives one, when it was moved
 * over a figure at rest with its own paint clear, is read by no pass. Every
 * other declaration on one is refused with one sentence that names the
 * property and says so. A selector is a pseudo-element under a state when it
 * names both (`.item:hover .item-p::after`; `:before` and `:after` written
 * with one colon count, and so does any other pseudo-element, which the
 * selector rules refuse on their own); in a list, `.item:hover, .item-p::after`
 * is not (the pseudo-element there stands at rest, where the probe measures
 * it). What a pseudo-element may take from its host at rest, which a state
 * changes, is `pseudoHostPaintProblems`'s.
 *
 * **Allowed under a state:**
 * - `color`: a literal colour at alpha 1 (a name, `#rgb`/`#rrggbb`, or a
 *   colour function with no alpha or an alpha of exactly 1, no `var()`, no
 *   relative colour, no `color-mix()`), or `var(--s-…)` of a palette role in
 *   `STATE_OPAQUE_ROLES` with no fallback. **Not `inherit`, not
 *   `currentColor`** (D-2026-10-20-08's B2): either hands the ink to whatever
 *   the parent paints, and a parent a rule at rest drew clear fades the
 *   figure. The roles are the theme table's colours (`themeVars` writes each
 *   as `rgb(r, g, b)`); a test proves them opaque under every shipped look
 *   and every mood
 *   (`the-state-opaque-roles-are-the-opaque-colours-the-theme-table-emits`),
 *   and another that a private look's palette, built from RGB triples,
 *   cannot make one anything else (`a-private-look-palette-role-is-opaque-by-construction`),
 *   and a first-party sheet may not re-declare one (`declarationProblems`),
 *   which is what keeps the proof about the value a rule reads. `--s-addr-bg`
 *   (5% on Neo), `--s-tab-active-bg` and the shape tokens are not on the
 *   list. An ink at alpha 1 can still equal its ground: contrast is not read.
 * - `background-color`, `background-image` and `background`: colours of any
 *   alpha (a tint is a ground, not a faded ink: the shipped state rules
 *   write `rgba(37, 99, 235, 0.1)`), `transparent`, `initial`, `unset`,
 *   `var(--s-…)` and a `color-mix()` of those; **not `currentColor` and not
 *   `inherit`** (a ground the colour of the ink it holds hides the figure;
 *   `background-image: inherit` brings back a picture a rule at rest sized to
 *   nothing). Gradients only for a picture (`linear-gradient`,
 *   `radial-gradient`, `conic-gradient` and their `repeating-` forms): never
 *   `url()`, `image-set()`, `cross-fade()`, `element()` or `paint()`; the
 *   shorthand adds position, size, repeat and box keywords and numbers. A
 *   gradient's colours are not weighed (the probe reads the ground), but
 *   `currentColor` in one is refused like any ground the ink's colour.
 * - `border-color`, each `border-*-color` and `outline-color`, **colour
 *   only**, and not `currentColor`, `inherit`, `initial` or `unset` (the
 *   initial colour of an edge is `currentcolor`). **No `border`, no
 *   `border-style`, no `border-width`, no `outline`, `outline-style`,
 *   `outline-width` or `outline-offset`** (D-2026-10-20-11). The earlier
 *   rule allowed an outline whose width and offset were written in the same
 *   rule, and its sentence was false: the cascade defeats it. A later, more
 *   specific rule at rest sets `outline-width: 200px; outline-offset: -100px`
 *   and the state's rule has no say in what it draws. A border works the same
 *   way (`border-style: solid` over `border: 40px none`), and the shorthand
 *   under a state adds up to 3px of padding by another name.
 * - `box-shadow`, bounded: **each layer names one colour** (not
 *   `currentColor`; a layer that names none is drawn in the ink), **at most
 *   two outer layers, every blur at most `STATE_SHADOW_BLUR_MAX_PX` (16px)**
 *   (inset ones too), and an outer layer has **no spread** (a negative one
 *   stands) and an offset of at most `STATE_SHADOW_MAX_PX` (8px) each way, in
 *   px or zero. An inset shadow stands (it paints inside its own box, under
 *   its own text). The owner said "any shadow"; a spread or an offset that is
 *   a box's own size is a fill, not a shadow, and `0 0 0 4000px #000` on a
 *   row paints over the rows beside it when rows are grid or flex items (they
 *   paint as atomic units, in tree order, their shadows with them). **A blur
 *   is not a fade that dies with distance**: layers add, and twenty layers of
 *   `0 -8px 120px #000` come to about 99.8% black over a width of 240px (the
 *   arithmetic, not an observation), so the layer count and the blur are
 *   capped. A `var()` is refused unless it is a palette role standing as the
 *   colour.
 * - **The no-transform values**: `transform`, `rotate`, `scale` and
 *   `translate` as `none`, `initial`, `unset` or an identity (`rotate: 0deg`,
 *   `scale: 1`, `translate: 0`, `transform: translateZ(0)`) — Rural's
 *   straightening of a tilted row under a hand is `rotate: 0deg`.
 * - `transition` and its longhands (the size lint reads them on a money
 *   node: `moneySizeMotionProblems`).
 * - `cursor` (a keyword, here and at rest: see `cursorProblem`).
 * - `-webkit-tap-highlight-color` (its own rule below: `transparent` only).
 *
 * **Refused under a state, and named so their tests stay:** `all`; any custom
 * property; `animation` and every `animation-*` (CSS-wide keywords too: a
 * state starts no animation, so no keyframe is read as a state's);
 * `content`, `position`, `z-index`, `display`; every text and spacing
 * property; `font*`; padding, margin, sizes, `opacity`, `visibility`,
 * `filter`, `backdrop-filter`, `clip*`, `mask*`; `text-decoration*`; the
 * `border` shorthands and `border-style`; every `outline` property but its
 * colour; every non-identity transform.
 *
 * **Not read, stated** (each is a gap in `a-look-state-rule-sets-only-what-a-state-may`):
 * - the contrast of an ink, a ground or a border against what it stands on:
 *   a literal `#fff` ink over a white card passes, so does a ground the
 *   colour of the ink. The probe reads contrast at rest only;
 * - **the ring a rule at rest wrote in a clear colour, shown by a colour
 *   under a state**: an outline's ring reaches past its box, and the probe
 *   reads an outline at rest only across the glyphs of its own box and of the
 *   boxes above a figure (`outlineFault`, `outlineAboveFault`), never one on a
 *   box beside it. The owner's rule is colour only under a state
 *   (D-2026-10-20-11), and a state's `outline-color` shows whatever ring a
 *   rule at rest wrote, so **the ring is capped at rest** (the fourth
 *   review's ranked item 1, `outlineCapProblems`): per declaration, in a
 *   media block and a keyframe too, a width of at most 4px and an offset from
 *   -8px to 4px, in px, with no `var()` or `calc()` (a sum per rule was split
 *   by the cascade, and a keyframe can carry the widths). What is left is a
 *   ring of up to 4px, reaching 8px past the box, shown by a colour;
 * - the reach of an outer shadow: at most 8px of offset and 16px of blur
 *   (24px), in two layers, and an inset one stays inside its box. At rest,
 *   an outer shadow, a text shadow, a drop shadow, an outline, a column rule
 *   and a border image name their own colour (`pastTheBoxProblems`, B2 and
 *   the fifth review's B1), so a colour under a state cannot reveal one
 *   written in `currentColor` or no colour; an underline is within 4px of its
 *   line and at most 3px thick, a stroke at most 3 wide and `d` is not
 *   written (`inkReachProblems`, the fifth review's B1); no custom property
 *   holds `currentColor` or `inherit` (B2); a rule runs only the keyframes
 *   its own sheet declares (B3); and `light-dark()` and a dark
 *   `color-scheme` are not written;
 * - **`filter: url()` and `filter: blur()`**: an SVG filter's primitives are
 *   not opened, and a blur's radius is not capped, so a filter that grows or
 *   spreads the box's paint, ink included, is not read (the fifth review's
 *   "not verified"; plants `f2:7`, `f2:32`);
 * - **a colour a state gives an element, not a pseudo-element, that a rule at
 *   rest moved over a figure and left clear** (the fourth review's P2): the
 *   move is an offset (`position: relative; top: 40px`), a negative margin
 *   (`margin-bottom: -60px`) or a transform, the element is clear at rest —
 *   `background: transparent`, a border in `transparent`, or an inset shadow
 *   in `transparent` — or its `color` is, under a ground, a border or an
 *   inset shadow a rule at rest wrote in `currentColor`, and the state gives
 *   it a ground, a border colour, an inset shadow or only `color`. A state's
 *   colours are on the list for an element, and the probe reads an element at
 *   rest. The pseudo-element half is refused above and in `pseudoHostPaintProblems`;
 *   this half stands (plants `m4`, pinned as accepted). **The move can also be
 *   a growth, and a multiplier** (the fifth review's smaller item): an
 *   element that grows (`width`, `height`) or is scaled (`zoom`, `scale`,
 *   `transform: scale()`) multiplies what a capped ring, offset, stroke or
 *   underline reaches, because each cap is measured in the box's own
 *   pixels (`zoom: 40` on a box with a 4px outline at an offset of 4px
 *   reaches 320px; plants `f3:1`, `f3:2`, `f8:2`);
 * - a ground, an edge or a shadow colour read through a `--s-…` custom
 *   property is closed at the declaration since the fifth review: no
 *   first-party custom property holds `currentColor` or `inherit`, so a
 *   `var(--s-…)` with no fallback, accepted as a colour for a ground and an
 *   edge, brings in no ink;
 * - a state written another way: a class a script toggles, an attribute but
 *   the eight above (`[aria-pressed]`, `[disabled]`, `[aria-current]`, and the
 *   others the fixtures paint, are read as a rule at rest, which the probe
 *   measures: `[data-copied='shown']` by `addr-shown` and `[data-copied='true']`
 *   by `addr-copied`, both staged, and `[data-tier='2']` by the stream card's
 *   two fixtures), and a structural pseudo-class, which is the tree at rest. A
 *   value of `STATE_ATTRIBUTES` that no fixture paints and the belt does not
 *   name (the name ladder's rungs) is on `UNPAINTED` in
 *   `layout/stateAttributes.test.ts`;
 * - a transition (read only by the size lint, on a money node);
 * - a state rule in the kit: the kit lint carries none of it.
 *
 * **First party only** (D5, D-2026-10-20-06, as read in D-2026-10-20-08; the
 * kit lint is unchanged): the workshop README says a pointer's hover is
 * Stall's at intake and not the kit's, so a creator's `:hover` is read by a
 * person, not by `workshop:lint` (`the-state-belt-is-first-party-only`, which
 * holds the README's own words). All 16 state rules the shipped looks have
 * (Modern 5, Neo 5, Rural 6) set colour, ground, border colour, shadow and
 * Rural's `rotate: 0deg`, and nothing else. Test: `a-look-state-rule-sets-only-what-a-state-may`.
 */
export const STATE_SHADOW_MAX_PX = 8;
export const STATE_SHADOW_BLUR_MAX_PX = 16;
export const STATE_SHADOW_OUTER_LAYERS_MAX = 2;

/**
 * The palette roles a state rule may read in an ink: the colours `themeVars`
 * writes as `rgb(r, g, b)`, opaque by construction, held by
 * `the-state-opaque-roles-are-the-opaque-colours-the-theme-table-emits`
 * (every shipped look, bare and under every mood) and, for a private look's
 * own palette, `a-private-look-palette-role-is-opaque-by-construction`.
 * Pinned by value.
 */
export const STATE_OPAQUE_ROLES = Object.freeze([
    '--s-bg',
    '--s-surface',
    '--s-text',
    '--s-shade',
    '--s-muted',
    '--s-accent',
    '--s-danger',
    '--s-accent-2',
]);

const BORDER_SIDES = ['top', 'right', 'bottom', 'left', 'block', 'inline', 'block-start', 'block-end', 'inline-start', 'inline-end'];

/**
 * The properties a state rule may set, a vendor prefix read as plain (the
 * tap highlight, which has no unprefixed name, by its own). Pinned by value in
 * `a-look-state-rule-sets-only-what-a-state-may`; a property added here is
 * added to its reader below, and its test.
 */
export const STATE_ALLOWED = Object.freeze([
    'color',
    'background',
    'background-color',
    'background-image',
    'border-color',
    ...BORDER_SIDES.map((side) => `border-${side}-color`),
    'box-shadow',
    'cursor',
    'transform',
    'rotate',
    'scale',
    'translate',
    'outline-color',
    'transition',
    'transition-property',
    'transition-duration',
    'transition-delay',
    'transition-timing-function',
    'transition-behavior',
    '-webkit-tap-highlight-color',
]);

/**
 * The properties a pseudo-element under a state may set: a short list, because
 * the probe measures a pseudo-element only by its paint at rest. **Not
 * `color`** (D-2026-10-20-08's B3): a generated glyph such as `◆` at a large
 * size would appear over a figure when its colour changed. Each is read as
 * `STATE_ALLOWED` reads it (the identity transforms). Pinned by value in
 * `a-look-state-rule-sets-only-what-a-state-may`.
 */
export const STATE_PSEUDO_ALLOWED = Object.freeze([
    'cursor',
    'transform',
    'rotate',
    'scale',
    'translate',
    'transition',
    'transition-property',
    'transition-duration',
    'transition-delay',
    'transition-timing-function',
    'transition-behavior',
]);

/**
 * The pseudo-classes that are **not** states (D-2026-10-20-11): every other
 * pseudo-class, a name this list has not met included, is a state the probe
 * never paints. Sixteen, each a fact of the tree at rest, which the probe
 * does paint. Pinned by value in `a-look-state-rule-sets-only-what-a-state-may`.
 */
export const STRUCTURAL_PSEUDO_CLASSES = Object.freeze([
    'not', // holds other selectors, and a state named inside still counts (`:not(:hover)`)
    'is', // the same: a list of selectors, read as the states it names
    'where', // the same, at no weight
    'has', // the same: `:has(details:not([open]))` names `[open]`
    'nth-child', // a box's place among its siblings: the tree at rest
    'nth-last-child', // the same, counted from the end
    'nth-of-type', // the same, among siblings of its type
    'nth-last-of-type', // the same, counted from the end
    'first-child', // the first of its siblings: the tree at rest
    'last-child', // the last of its siblings
    'only-child', // the only one
    'first-of-type', // the first of its type
    'last-of-type', // the last of its type
    'only-of-type', // the only one of its type
    'empty', // whether a box holds children or text at all: the tree at rest
    'root', // the document's root element: one box, at rest
]);

/**
 * The attributes a first-party selector names that make it a state (in any
 * form or case): the turned wall, a fold, a hidden box, and — the fourth
 * review's B3 — three that `STATE_ATTRIBUTES` lets a look match and no probe
 * fixture paints: the stream card's stale plate (`data-state='stale'`), a
 * link with no destination (`aria-disabled='true'`) and the byte meter over its
 * ceiling (`data-over='true'`). `data-copied='true'` is not here: the staged
 * screen `addr-copied` paints it, so a rule under it is measured at rest
 * (`layout/stateAttributes.test.ts` holds both). `data-tier='2'` is not
 * here either: it sizes a figure, which a state may not, so the stream card's
 * fixtures paint it, per rail: the listing card's two (`broadcast-from-123456`,
 * `broadcast-from-1234567`) and the quote card's four (`broadcast-quote-7`,
 * `-9`, `-11` and `-13`).
 */
const STATE_ATTRIBUTE_NAMES = new Set(['data-turn', 'open', 'hidden', 'data-state', 'aria-disabled', 'data-over']);

/**
 * The attributes that are states **except for the values a probe screen
 * paints** (the fifth review's ranked item 1): `data-format` is the poster
 * sheet's format, and the fixtures paint `tag` and none of `square`, `story`
 * and `stream`; `data-code='false'` is the shop window sheet with its pay
 * code off, and no fixture sets `paycode=off`. A selector on the name that is
 * not an exact match on a painted value (`=`, no flag) is a state, and fails
 * closed: presence, a partial match, any other value, a form this lint cannot
 * parse. `layout/stateAttributes.test.ts` holds each painted value to a
 * screen. Pinned by value.
 */
export const STATE_EXCEPT_PAINTED = Object.freeze({
    'data-code': Object.freeze([]),
    'data-format': Object.freeze(['tag']),
});

const STRUCTURAL = new Set(STRUCTURAL_PSEUDO_CLASSES);
const BELT_TAIL = '; the probe measures every screen at rest and paints no hover, focus, press or turned wall, so what arrives with a state is read by no pass';

/** The name of an attribute selector (the text between its brackets): lower case, escapes decoded, a namespace prefix dropped. */
function attributeNameOf(inner) {
    const m = /^\s*(?:(?:[^\s|=~^$*"'\]]*|\*)\|(?!=))?\s*([^\s~|^$*="'\]]+)/.exec(decodeEscapes(inner));
    return m === null ? '' : m[1].toLowerCase();
}

/**
 * Whether one attribute selector names a state: one of the six, or a partly
 * painted one by any form but an exact match on a painted value — and a
 * painted value under `:not()` is a state too (`:not([data-format='tag'])`
 * matches the other three formats, which no screen paints).
 */
function attributeIsAState(inner, negated = false) {
    const name = attributeNameOf(inner);
    if (STATE_ATTRIBUTE_NAMES.has(name)) return true;
    if (!Object.hasOwn(STATE_EXCEPT_PAINTED, name)) return false;
    if (negated) return true;
    const m = ATTRIBUTE_SELECTOR.exec(inner);
    if (m === null || m[2] !== '=' || m[4] !== undefined) return true;
    const value = /^["']/.test(m[3]) ? decodeEscapes(m[3].slice(1, -1)) : decodeEscapes(m[3]);
    return !STATE_EXCEPT_PAINTED[name].includes(value);
}

/** Whether a selector names a state the probe never paints (see above): fail closed. */
export function namesAState(selector) {
    return (
        pseudoTokens(selector, true).some((token) => !token.element && !STRUCTURAL.has(token.name)) ||
        attributeBlocksNegated(selector).some(({ inner, negated }) => attributeIsAState(inner, negated))
    );
}

/**
 * Whether any rule of a sheet — a media block entered — names the attribute
 * in a selector, in any form or case (`[data-copied='true']`, `[DATA-COPIED]`,
 * an escaped name; `:has()` and `:not()` entered). The runner reads which
 * looks name `[data-copied]` with it (the fifth review's ranked item 4: the
 * two staged address screens are sampled for contrast for those looks), and
 * holds the plan the page derives from the stylesheet it loaded to it.
 */
export function sheetNamesAttribute(css, attribute) {
    const want = attribute.toLowerCase();
    const walk = (nodes) => {
        for (const node of nodes) {
            if (node.kind === 'rule') {
                if (splitTopLevel(node.prelude, ',').some((selector) => attributeBlocks(selector).some((inner) => attributeNameOf(inner) === want))) return true;
            } else if (node.children !== undefined && walk(node.children)) {
                return true;
            }
        }
        return false;
    };
    return walk(parseSheet(css).nodes);
}

/**
 * Whether one selector names a pseudo-element and a state together: a box the
 * probe measures only by its paint at rest, given a paint by a state (see
 * above). Any pseudo-element counts, `:before` and `:after` with one colon
 * too; the selector rules refuse all but two of them on their own.
 */
export function isPseudoUnderState(selector) {
    return namesAState(selector) && isPseudoElementSelector(selector);
}

/** Whether one selector names a pseudo-element (`:before` and `:after` with one colon included). */
function isPseudoElementSelector(selector) {
    return pseudoTokens(selector, true).some((token) => token.element);
}

/** A `<length>` or `<percentage>` token as `{ n, unit }` (unit lower case, `''` for a bare number), or undefined. */
function lengthToken(token) {
    const m = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)([a-z]+|%)?$/i.exec(token);
    if (m === null) return undefined;
    const n = numberToken(m[1]);
    return n === undefined ? undefined : { n, unit: (m[2] ?? '').toLowerCase() };
}

/** The 148 colour names CSS Color 4 gives; `transparent` and `currentcolor` are read apart, and a system colour is not a literal. */
const NAMED_COLOURS = new Set(
    (
        'aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue ' +
        'cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon ' +
        'darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen ' +
        'fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon ' +
        'lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey ' +
        'lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen ' +
        'mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen ' +
        'paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell ' +
        'sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen'
    ).split(' '),
);
const COLOUR_FUNCTIONS = new Set(['rgb', 'rgba', 'hsl', 'hsla', 'hwb', 'lab', 'lch', 'oklab', 'oklch', 'color']);

/**
 * A colour written out, as `{ alpha }` (1 where it writes none; `current:
 * true` for `currentcolor`), or undefined where this lint cannot read it: a
 * system colour, a `var()`, a `calc()`, a relative colour (`from`), a `none`
 * component or a `color-mix()` (read by `groundColourProblem` where a mix
 * stands). Reading the alpha is the point: the one place it matters is an ink.
 */
function literalColour(token) {
    const v = token.trim();
    const lower = v.toLowerCase();
    if (lower === 'transparent') return { alpha: 0 };
    if (lower === 'currentcolor') return { alpha: 1, current: true };
    if (NAMED_COLOURS.has(lower)) return { alpha: 1 };
    const hex = /^#([0-9a-f]+)$/i.exec(v);
    if (hex !== null) {
        const d = hex[1];
        if (![3, 4, 6, 8].includes(d.length)) return undefined;
        const alpha = d.length === 4 ? Number.parseInt(d[3] + d[3], 16) : d.length === 8 ? Number.parseInt(d.slice(6), 16) : 255;
        return { alpha: alpha / 255 };
    }
    const fn = /^([a-z-]+)\(([\s\S]*)\)$/i.exec(v);
    if (fn === null || !COLOUR_FUNCTIONS.has(fn[1].toLowerCase())) return undefined;
    const inner = fn[2];
    if (!/^[\w\s.,%+\-/]*$/.test(inner) || /(?<![\w-])(?:from|none|var|calc|env)(?![\w-])/i.test(inner)) return undefined;
    let alpha;
    const slash = inner.lastIndexOf('/');
    if (slash >= 0) {
        alpha = inner.slice(slash + 1).trim();
    } else if (/^(?:rgba?|hsla?)$/i.test(fn[1])) {
        const parts = inner.split(',');
        if (parts.length === 4) alpha = parts[3].trim();
    }
    if (alpha === undefined) return { alpha: 1 };
    const factor = factorToken(alpha);
    return factor === undefined ? undefined : { alpha: Math.min(1, Math.max(0, factor)) };
}

/** A `var(--s-…)` with no fallback: the theme table's own tokens, or a sheet's; the name, or undefined. */
const VAR_TOKEN = /^var\(\s*(--s-[a-z0-9-]+)\s*\)$/;

/**
 * Why a value is not a colour a state may paint a ground, an edge or a shadow
 * with, or undefined: a colour of any alpha, `transparent`, a `var(--s-…)`
 * and a `color-mix()` of those. `kind` says what stands where the colour
 * does: `ground` (a background colour: `initial` and `unset` are
 * `transparent` there), `edge` (a border or an outline: its initial colour is
 * `currentcolor`, so `initial` and `unset` are refused), `shadow`, or `own`
 * (the colour of a paint at rest that reaches past its box, the fourth
 * review's B2: as `edge`, and a `var()` stands only as a palette role,
 * `STATE_OPAQUE_ROLES`, and `revert` and `revert-layer` are refused, since
 * they roll an edge back to its initial colour, `currentcolor`).
 * **`inherit` and `currentcolor` are refused for all four** (D-2026-10-20-08's
 * B2): `inherit` takes the parent's, `currentcolor` the box's own ink, and
 * both move with an ink a state changes.
 */
function groundColourProblem(value, kind = 'ground') {
    const v = value.trim();
    if (/^inherit$/i.test(v)) return "inherit takes the colour the parent paints, which a rule at rest may have drawn clear and a state may change";
    if (kind === 'own' && /^revert(?:-layer)?$/i.test(v)) {
        return `${v.toLowerCase()} rolls the colour back to the browser's own, which for an edge, an outline or a shadow is currentcolor: the ink of the box`;
    }
    if (/^(?:initial|unset)$/i.test(v)) {
        return kind === 'ground' ? undefined : `${v.toLowerCase()} is currentcolor on an edge or a shadow: the ink of the box`;
    }
    const role = VAR_TOKEN.exec(v);
    if (role !== null) {
        return kind === 'own' && !STATE_OPAQUE_ROLES.includes(role[1])
            ? `${role[1]} is not a palette role (${STATE_OPAQUE_ROLES.join(', ')}): a custom property can hold currentcolor`
            : undefined;
    }
    const mix = /^color-mix\(([\s\S]*)\)$/i.exec(v);
    if (mix !== null) {
        const parts = splitTopLevel(mix[1], ',');
        if (parts.length < 3 || !/^in\s+[a-z0-9-]+(?:\s+(?:shorter|longer|increasing|decreasing)\s+hue)?$/i.test(parts[0])) {
            return `${echo(v, 32)} is a color-mix() this lint cannot take apart`;
        }
        for (const operand of parts.slice(1)) {
            const tokens = splitTopLevel(operand, ' ').filter((token) => !/^[\d.]+%$/.test(token));
            if (tokens.length !== 1) return `${echo(v, 32)} is a color-mix() this lint cannot take apart`;
            const why = groundColourProblem(tokens[0], kind);
            if (why !== undefined) return why;
        }
        return undefined;
    }
    const colour = literalColour(v);
    if (colour === undefined) {
        return `${echo(v, 32)} is not a colour this lint reads (a name, #hex, a colour function, a color-mix() of those, or a var(--s-…) with no fallback)`;
    }
    if (colour.current) {
        return kind === 'ground'
            ? 'currentcolor as a ground is the colour of the ink it holds: it hides the figure'
            : 'currentcolor is the ink of the box, which a state may change: a shadow or an edge in it follows the ink';
    }
    return undefined;
}

/** Why a value is not an ink a state may set (see `color` above), or undefined. */
function inkProblem(value) {
    const v = value.trim();
    if (/^(?:inherit|currentcolor)$/i.test(v)) {
        return `${v.toLowerCase() === 'inherit' ? 'inherit' : 'currentColor'} hands the ink to whatever the parent paints, and a parent a rule at rest drew clear fades the figure`;
    }
    const role = VAR_TOKEN.exec(v);
    if (role !== null) {
        return STATE_OPAQUE_ROLES.includes(role[1])
            ? undefined
            : `${role[1]} is not a palette role proved opaque (${STATE_OPAQUE_ROLES.join(', ')}): a theme token can carry an alpha, and an ink under alpha 1 is a faded figure`;
    }
    if (/^(?:color-mix|light-dark)\(/i.test(v)) return `${echo(v, 32)}: a mix of an ink with another colour is not a form an ink takes under a state — it can fade the figure into its ground`;
    if (/(?<![\w-])var\s*\(/i.test(withoutStrings(v))) return 'a var() with a fallback, or inside another value, may carry a faded ink';
    const colour = literalColour(v);
    if (colour === undefined) {
        return `${echo(v, 32)} is not an ink this lint reads (a literal colour at alpha 1: a name, #rgb or #rrggbb, a colour function with no alpha or alpha 1; or a palette role)`;
    }
    return colour.alpha < 1 ? 'an ink under alpha 1 is a faded figure (the probe holds an ink at full alpha)' : undefined;
}

/** A function that fetches or paints a picture: the ground a state's background may not be. */
const PICTURE = /(?<![\w-])(?:url|image|image-set|-webkit-image-set|cross-fade|-webkit-cross-fade|element|-moz-element|paint)\s*\(/i;
const GRADIENT = /^(?:-webkit-)?(?:repeating-)?(?:linear|radial|conic)-gradient$/i;
const NUMERIC_FUNCTIONS = new Set(['calc', 'min', 'max', 'clamp']);
const NO_PICTURE = "a state's background is a colour or a gradient: a picture (url(), image-set(), cross-fade(), element(), paint()) is a ground the probe cannot read";
const NO_INHERIT = "inherit takes the background the parent paints, a picture a rule at rest sized to nothing included, and a state may change it";

/** Why a value is not a `background-color`, `background-image` or `background` a state may set (`kind`), or undefined. */
function backgroundProblem(value, kind) {
    const v = value.trim();
    if (/^inherit$/i.test(v)) return NO_INHERIT;
    if (/^(?:initial|unset)$/i.test(v)) return undefined;
    if (kind === 'color') return groundColourProblem(v, 'ground');
    for (const layer of splitTopLevel(v, ',')) {
        const tokens = splitTopLevel(layer, ' ');
        if (kind === 'image' && tokens.length !== 1) return 'a background-image layer is `none`, a gradient or a var(--s-…)';
        for (const token of tokens) {
            if (/^inherit$/i.test(token)) return NO_INHERIT;
            const fn = /^([a-z-]+)\(/i.exec(token);
            if (fn === null) {
                if (/^none$/i.test(token) && kind === 'image') continue;
                if (kind === 'image') return 'a background-image layer is `none`, a gradient or a var(--s-…)';
                if (!/^[#a-z0-9.%+\-/]+$/i.test(token)) return `${echo(token, 24)} is not a part of a background this lint reads`;
                if (/^currentcolor$/i.test(token)) return groundColourProblem(token, 'ground');
                if (token.startsWith('#') && literalColour(token) === undefined) return `${echo(token, 24)} is not a colour this lint reads`;
                continue;
            }
            const name = fn[1].toLowerCase();
            if (GRADIENT.test(name)) {
                if (PICTURE.test(withoutStrings(token))) return NO_PICTURE;
                // A gradient of the ink's own colour is a ground the colour of the ink it holds (B2); its other colours are not weighed.
                if (/(?<![\w-])currentcolor(?![\w-])/i.test(token)) return groundColourProblem('currentcolor', 'ground');
            } else if (name === 'var') {
                if (!VAR_TOKEN.test(token)) return 'a var() here is read only as var(--s-…) with no fallback: a fallback could carry a picture';
            } else if (COLOUR_FUNCTIONS.has(name) || name === 'color-mix') {
                if (kind === 'image') return 'a background-image layer is `none`, a gradient or a var(--s-…)';
                const why = groundColourProblem(token, 'ground');
                if (why !== undefined) return why;
            } else if (NUMERIC_FUNCTIONS.has(name) && kind === 'shorthand') {
                if (PICTURE.test(withoutStrings(token))) return NO_PICTURE;
            } else {
                return PICTURE.test(token) ? NO_PICTURE : `${name}() is a function this lint does not read in a state's background`;
            }
        }
    }
    return undefined;
}

/** Why a value is not the colour or colours of a border or an outline a state may set, or undefined. */
function borderColourProblem(value) {
    const tokens = splitTopLevel(value.trim(), ' ');
    if (tokens.length < 1 || tokens.length > 4) return 'a border colour is one to four colours';
    for (const token of tokens) {
        const why = groundColourProblem(token, 'edge');
        if (why !== undefined) return why;
    }
    return undefined;
}

/** Why a `box-shadow` is a fill and not a shadow (see above), or undefined. */
function shadowProblem(value) {
    const v = value.trim();
    if (/^(?:none|initial|unset)$/i.test(v)) return undefined;
    const reads = 'a box-shadow this lint cannot size (px or zero lengths, one colour it reads on every layer, inset) may fill the boxes beside it';
    let outer = 0;
    for (const layer of splitTopLevel(v, ',')) {
        let inset = false;
        let colours = 0;
        const lengths = [];
        for (const token of splitTopLevel(layer, ' ')) {
            if (/^inset$/i.test(token)) {
                inset = true;
                continue;
            }
            const len = lengthToken(token);
            if (len !== undefined) {
                if (len.unit !== 'px' && !(len.unit === '' && len.n === 0)) return reads;
                lengths.push(len.n);
                continue;
            }
            const role = VAR_TOKEN.exec(token);
            const colourOk = role !== null ? STATE_OPAQUE_ROLES.includes(role[1]) : !/(?<![\w-])var\s*\(/i.test(token) && groundColourProblem(token, 'shadow') === undefined;
            if (!colourOk) return reads;
            colours += 1;
        }
        if (lengths.length < 2 || lengths.length > 4 || colours > 1) return reads;
        if (colours === 0) return 'a shadow layer that names no colour is drawn in the ink of the box, which a state may change; an inset one fills the box with it';
        const [x, y, blur = 0, spread = 0] = lengths;
        if (blur < 0) return reads;
        if (blur > STATE_SHADOW_BLUR_MAX_PX) {
            return `a shadow blur past ${STATE_SHADOW_BLUR_MAX_PX}px is a haze the size of a box, and layers add: twenty of 0 -8px 120px #000 come to about 99.8% black`;
        }
        if (!inset) {
            outer += 1;
            if (spread > 0 || Math.abs(x) > STATE_SHADOW_MAX_PX || Math.abs(y) > STATE_SHADOW_MAX_PX) {
                return `an outer shadow with a spread, or an offset past ${STATE_SHADOW_MAX_PX}px, is a fill the size of a box and not a shadow: it paints over the rows beside it`;
            }
        }
    }
    if (outer > STATE_SHADOW_OUTER_LAYERS_MAX) {
        return `more than ${STATE_SHADOW_OUTER_LAYERS_MAX} outer shadow layers: they add, and a stack of them is a fill the size of a box`;
    }
    return undefined;
}

/** Why a transform-family value is not the identity, or undefined. */
function identityProblem(name, value) {
    const v = value.trim();
    if (/^(?:none|initial|unset)$/i.test(v)) return undefined;
    const ops = transformFamilyOps(name, v);
    if (ops === undefined) return 'a value this lint cannot take apart may move, turn or scale the box';
    for (const op of ops) {
        const identity =
            (op.kind === 'rotate' && op.deg === 0) ||
            (op.kind === 'translate' && op.zero) ||
            (op.kind === 'scale' && op.x === 1 && op.y === 1) ||
            (op.kind === 'matrix' && op.zero && op.a === 1 && op.d === 1 && op.b === 0 && op.c === 0);
        if (!identity) return `a state sets the no-transform values only (none, rotate: 0deg, scale: 1, translate: 0): ${echo(v, 32)} moves, turns, scales or skews the box`;
    }
    return undefined;
}

/** The readers of the allow-list, by property name (a vendor prefix read as plain). */
const STATE_READERS = new Map([
    ['color', inkProblem],
    ['background-color', (value) => backgroundProblem(value, 'color')],
    ['background-image', (value) => backgroundProblem(value, 'image')],
    ['background', (value) => backgroundProblem(value, 'shorthand')],
    ['border-color', borderColourProblem],
    ...BORDER_SIDES.map((side) => [`border-${side}-color`, borderColourProblem]),
    ['outline-color', borderColourProblem],
    ['box-shadow', shadowProblem],
    // A cursor is read wherever it is written, a state or not: `cursorProblem`, in `declarationProblems`.
    ['cursor', () => undefined],
    ...['transform', 'rotate', 'scale', 'translate'].map((name) => [name, (value) => identityProblem(name, value)]),
    ...['transition', 'transition-property', 'transition-duration', 'transition-delay', 'transition-timing-function', 'transition-behavior'].map((name) => [name, () => undefined]),
]);

/** Why a property is not one a state may set, by family; the sentence names what the family does to a figure. */
const STATE_REFUSED_WHY = [
    [/^all$/, 'all re-states every property at once: a clip, an opacity, an animation among them'],
    [/^animation(?:-.+)?$/, 'an animation a state starts runs keyframes no pass measured, and a stop of one can hide a figure'],
    [/^(?:content|quotes|counter-.+)$/, 'generated text a state prints, beside or over a figure'],
    [/^(?:position|top|right|bottom|left|inset(?:-.+)?|z-index|float|clear|isolation|contain(?:-.+)?|overflow(?:-.+)?|scroll-.+)$/, "where a box stands, or what clips it, can put it over a neighbour's figure"],
    [
        /^(?:display|visibility|content-visibility|opacity|filter|backdrop-filter|mix-blend-mode|background-blend-mode|clip(?:-.+)?|mask(?:-.+)?|offset(?:-.+)?|box-reflect)$/,
        'it can hide, fade, cut, blur or move a figure',
    ],
    [
        /^(?:font(?:-.+)?|letter-spacing|word-spacing|line-height|text-.+|white-space(?:-.+)?|zoom|writing-mode|direction|unicode-bidi|hyphens|tab-size|vertical-align|line-clamp)$/,
        "it sets the size, the spacing, the shape or the look of a figure's text",
    ],
    [
        /^(?:margin(?:-.+)?|padding(?:-.+)?|width|height|min-.+|max-.+|aspect-ratio|flex(?:-.+)?|grid(?:-.+)?|gap|row-gap|column-gap|order|align-.+|justify-.+|place-.+|object-.+|box-sizing|border-(?:.*width|.*radius|image(?:-.+)?|collapse|spacing))$/,
        'it moves or squeezes a figure, or gives it a picture',
    ],
    [
        /^(?:border(?:-(?:top|right|bottom|left|block|inline|block-start|block-end|inline-start|inline-end))?(?:-style)?|outline(?:-style|-width|-offset)?)$/,
        "a state sets an edge's colour and nothing else: a style, a width or an offset written at rest is defeated by the cascade, and the shorthand adds the padding it resets",
    ],
];

/** Why one declaration under a state may not stand, or undefined. */
function stateDeclarationProblem(prop, value) {
    if (prop.startsWith('--')) {
        return 'a custom property set under a state re-states, where no property here reads it, a value a rule at rest reads as a clip, a blur or an animation (stall.css reads --s-price-clip, --s-icon-clip, --s-head-blur and --s-tabs-blur that way)';
    }
    const clean = value.replace(/\s*!\s*important\s*$/i, '').trim();
    if (prop === TAP_HIGHLIGHT) return undefined;
    const name = prop.replace(VENDOR_PREFIX, '');
    const read = STATE_READERS.get(name);
    if (read === undefined) {
        const family = STATE_REFUSED_WHY.find(([pattern]) => pattern.test(name));
        return `${name} is not a property a state rule may set${family === undefined ? '' : ` (${family[1]})`} — a state sets colour, ground, border and outline colour, shadow, cursor, transitions and the no-transform values`;
    }
    return read(clean, name);
}

/**
 * Why one declaration may not stand on a pseudo-element under a state, or
 * undefined: only `STATE_PSEUDO_ALLOWED` may, each read as an element's is. A
 * custom property keeps its own sentence, which is the same on both.
 */
function pseudoStateDeclarationProblem(prop, value) {
    const name = prop.replace(VENDOR_PREFIX, '');
    if (!prop.startsWith('--') && !STATE_PSEUDO_ALLOWED.includes(name)) {
        return `${name} is not a property a state rule may set on a pseudo-element (cursor, transitions and the no-transform values only: the probe measures a pseudo-element only by its paint at rest)`;
    }
    return stateDeclarationProblem(prop, value);
}

/**
 * Why the declarations of a rule whose selector names a state may not stand
 * (see above); a rule of no state has none.
 */
function stateBeltProblems(decls, selectors) {
    const states = selectors.filter(namesAState);
    if (states.length === 0) return [];
    // A pseudo-element under a state holds the whole rule to the shorter list: the declarations reach it.
    const pseudo = selectors.find(isPseudoUnderState);
    const state = echo(pseudo ?? states[0]);
    const out = [];
    for (const { prop, value } of decls) {
        const why = pseudo === undefined ? stateDeclarationProblem(prop, value) : pseudoStateDeclarationProblem(prop, value);
        if (why !== undefined) out.push(`${prop}: ${echo(value, 48)} under "${state}" — ${why}${BELT_TAIL}`);
    }
    return out;
}

/**
 * **A cursor is a keyword** (D-2026-10-20-11, in a first-party sheet, at rest
 * and under a state alike): `cursor: url(…)` and `image-set(…)` stand a
 * picture of up to 128px at the pointer, over whatever the pointer is over, a
 * figure among them, where no pass paints it. Every part of the list is one
 * keyword (`pointer`, `not-allowed`, `grab`, …); a `var()` is not one.
 * `a-cursor-is-a-keyword`.
 */
function cursorProblem(value) {
    const parts = splitTopLevel(value.trim(), ',');
    if (parts.length > 0 && parts.every((part) => /^[a-z-]+$/i.test(part))) return undefined;
    return 'a cursor that is not a keyword stands a picture of up to 128px at the pointer, over whatever the pointer is over, where no pass paints it; a cursor is a keyword (pointer, not-allowed, grab, …)';
}

/*
 * **A pseudo-element's paint is its own at rest** (D-2026-10-20-08's B3, and
 * the lint-belts critic's fourth review, B1). The probe measures a
 * pseudo-element by its paint at rest. One a rule at rest moved over a figure
 * (`position: relative; left: -80px`) whose paint is taken from its host or
 * from the cascade — a ground through `inherit`, an edge, a shadow, an
 * underline or a mask through `currentColor`, which is also what a shadow, a
 * border or an outline that names no colour is drawn in, a variable the host
 * set to `currentColor`, a colour rolled back by `revert` — is clear while
 * its host is clear, and covers the figure the moment a state gives the host
 * a ground or an ink: the host is an element, and an element may change both
 * under a state. So a first-party rule whose selector list holds a
 * pseudo-element (the rule, as with the state belt: the declarations reach
 * every selector of it):
 *
 * - **writes no `inherit`, `currentColor`, `revert` or `revert-layer`** in a
 *   `background*`, `border*`, `border-image*`, `outline*`, `column-rule*`,
 *   `text-decoration*`, `box-shadow`, `text-shadow`, `filter` or `mask*` value
 *   (a gradient inside a mask is read: a mask takes the alpha of its image,
 *   and `currentColor`'s alpha is the host's ink's), nor `initial` or
 *   `unset` for an edge's colour (the initial colour of an edge is
 *   `currentcolor`), nor `inherit`, `unset`, `revert`, `revert-layer` or
 *   `currentColor` for its own `color` (which is the host's by default);
 * - **reads a `var()` there only as a palette role** (`var(--s-text)` and its
 *   seven kin, `STATE_OPAQUE_ROLES`, no fallback): any other custom property
 *   may be one the host set to `currentColor` (`--g: currentColor` on the
 *   host, `background: var(--g)` on the pseudo-element). **In a mask that
 *   holds where the `var()` stands as a colour or as the picture, and nowhere
 *   it stands as a length** (`maskColourVar`, below): a size, a position, a
 *   stop's place or a `calc()` of them carries no colour;
 * - **writes no `all`, in any value**: it re-states every property, the paint
 *   among them, from the host's or the initial value, and a later rule's
 *   `all: unset` takes back what this rule wrote;
 * - **names a colour for each family and each side of what it draws**: a
 *   shadow or text-shadow layer, a `drop-shadow()`, a border side (top,
 *   right, bottom and left each), an outline, a column rule, a text
 *   decoration — one coloured edge does not clear the others, and one that
 *   names none is drawn in `currentColor`. A side with no style, a zero width
 *   or `none` draws nothing and needs none. **A logical border property**
 *   (`border-block`, `border-inline-start-color`, …) **is refused**: its side
 *   is a physical one that depends on the writing mode, a write to it may
 *   land on any of the four, and a style or a width written there may draw
 *   where the colour was written for another side (`LOGICAL_WHY`);
 * - **prints text** (a `content` that is not empty) **only with a `color` of its
 *   own in the same rule**, a literal colour or a palette role: a glyph is its
 *   host's ink otherwise.
 *
 * Under a state the pseudo-element may not set `color` at all
 * (`STATE_PSEUDO_ALLOWED`). Not read, stated: a style in one rule and its
 * colour in another (the check is per rule, in the order the rule writes, a
 * shorthand resetting what it covers), a colour-bearing property not named
 * above, and a pseudo-element's own `color` where nothing in the rule draws
 * with it.
 */
const EDGE_SIDE = '(?:-(?:top|right|bottom|left|block|inline|block-start|block-end|inline-start|inline-end))?';
/** The properties whose value is read for a host paint and a variable: the ones that carry a colour, a picture or a mask. */
const PSEUDO_PAINT_PROPS = new RegExp(
    `^(?:background(?:-color|-image)?|border${EDGE_SIDE}(?:-color)?|border-image(?:-source)?|outline(?:-color)?|column-rule(?:-color)?|text-decoration(?:-color)?|box-shadow|text-shadow|filter|mask(?:-[a-z-]+)?)$`,
);
const MASK_FAMILY = /^mask(?:-|$)/;
const EDGE_COLOUR_PROPS = new RegExp(`^(?:border${EDGE_SIDE}|outline|column-rule|text-decoration)-color$`);
const HOST_KEYWORD = /(?<![\w-])(?:inherit|currentcolor|revert-layer|revert)(?![\w-])/i;
const LINE_STYLE = /^(?:dotted|dashed|solid|double|groove|ridge|inset|outset|auto)$/i;
const DECORATION_LINE = /^(?:underline|overline|line-through|blink)$/i;
const NOT_A_COLOUR = /^(?:inset|none|hidden|auto|thin|medium|thick|dotted|dashed|solid|double|groove|ridge|outset|underline|overline|line-through|blink|wavy|from-font|spelling-error|grammar-error)$/i;
const WIDTH_KEYWORD = /^(?:thin|medium|thick)$/i;
const SHAPE_FUNCTION = /^(?:calc|min|max|clamp)\(/i;

/** Whether a value (a layer, a shorthand) holds a token that names a colour: not a length, a number, a keyword of a style or a line. */
function namesAColour(value) {
    return splitTopLevel(value, ' ').some(
        (token) => !NOT_A_COLOUR.test(token) && lengthToken(token) === undefined && !SHAPE_FUNCTION.test(token),
    );
}

/** The arguments of each `drop-shadow(…)` call of a filter value. */
function dropShadows(value) {
    const out = [];
    for (const m of value.matchAll(/drop-shadow\(/gi)) {
        const open = m.index + m[0].length - 1;
        const close = closingParen(value, open);
        out.push(value.slice(open + 1, close < 0 ? value.length : close));
    }
    return out;
}

/** Each `var(…)` call of a value, outside strings: what it reads when it reads a `--s-…` property plainly (no fallback), else undefined. */
function varCalls(value) {
    const bare = withoutStrings(value);
    const out = [];
    for (const m of bare.matchAll(/(?<![\w-])var\s*\(/gi)) {
        const open = m.index + m[0].length - 1;
        const close = closingParen(bare, open);
        const inner = bare.slice(open + 1, close < 0 ? bare.length : close).trim();
        out.push({ inner, name: /^--s-[a-z0-9-]+$/.test(inner) ? inner : undefined });
    }
    return out;
}

/** The first `var()` of a value that is not a palette role standing alone, or undefined. */
function nonRoleVar(value) {
    return varCalls(value).find((call) => call.name === undefined || !STATE_OPAQUE_ROLES.includes(call.name));
}

/*
 * **A `var()` in a mask is refused where it stands as a colour or as the
 * picture, and nowhere it stands as a length** (the window's selected check
 * after the fourth fix round: judgement 14 refused any non-role `var()`
 * anywhere in a pseudo-element's mask, and the private look at 0x04, read
 * under its selection, was refused on `var()` calls that stand as lengths).
 * The concern behind B1 (d) and (e) is a mask *colour* that follows the
 * host's ink, through `currentColor`, `inherit` or a custom property the host
 * set to `currentColor`; a length, a percentage or a `calc()` of them carries
 * no colour. So, in a first-party pseudo-element rule:
 *
 * - `mask-size`, `mask-position` (and `-x`, `-y`), `mask-repeat`,
 *   `mask-composite`, `mask-mode`, `mask-origin`, `mask-clip`, `mask-type` and
 *   the border mask's slice, width, outset, repeat and mode hold no picture
 *   and no colour: a `var()` in them is read by nothing (`MASK_NO_PICTURE`);
 * - in a picture (`mask-image`, `mask-border-source`, the `mask` and
 *   `mask-border` shorthands, a layer at a time) a gradient's arguments are
 *   taken apart at their top-level commas: an argument holding a geometry
 *   word (`to`, `at`, `from`, `in`, a side, a shape, a colour space) names no
 *   colour; any other is a stop, `<color> <length-percentage>?` with the
 *   colour first or last. A `var()` standing alone as a token of a stop is the
 *   stop's position only if the stop holds a colour that is not a `var()`
 *   (`#000 var(--r)`); otherwise it is the colour (`var(--g) 50%`) or, alone,
 *   ambiguous, and is refused unless it is a palette role. A `var()` inside a
 *   colour function (`rgb()`, `color-mix()`) is a colour; inside a `calc()`,
 *   `min()`, `max()` or `clamp()` it is a length;
 * - a bare `var()` in a picture slot is the picture: `mask-image: var(--m)`
 *   and a layer of the `mask` shorthand with no picture of its own, whose
 *   custom property may hold a gradient in `currentColor`, are refused unless
 *   a palette role. After a `/` (a size, a slice, a width) a `var()` is a
 *   length;
 * - `currentColor`, `inherit` and `revert` stay refused anywhere in a mask
 *   (`HOST_KEYWORD`, read first).
 *
 * A `var()` that stands as a position may hold more than a position —
 * substitution is by tokens, so a custom property the host set to
 * `50%, currentColor` would bring a stop in the host's ink into `#000
 * var(--x)` (plant `c1:8`; and the same in the `mask` position slot, the size
 * after a `/`, a radial gradient's `at` and a conic gradient's `from` or `in`,
 * the fifth review's B2). **That class is closed where the custom property is
 * declared**: no first-party custom property holds `currentColor` or
 * `inherit`, so what a `var()` brings in is a colour of the sheet's own
 * (`c1:8` is refused at its declaration; `c1:5` and `c1:7` stay accepted for
 * that reason).
 */
const MASK_NO_PICTURE =
    /^mask-(?:size|position(?:-x|-y)?|repeat|composite|mode|origin|clip|type|border-(?:slice|width|outset|repeat|mode)|box-image-(?:slice|width|outset|repeat))$/;
const MASK_PICTURE_ONLY = /^mask-(?:image|border-source|box-image-source)$/;
const GRADIENT_GEOMETRY =
    /^(?:to|at|from|in|left|right|top|bottom|center|circle|ellipse|closest-side|closest-corner|farthest-side|farthest-corner|shorter|longer|increasing|decreasing|hue|srgb|srgb-linear|display-p3|a98-rgb|prophoto-rgb|rec2020|lab|oklab|lch|oklch|hsl|hwb|xyz|xyz-d50|xyz-d65)$/i;
const PICTURE_FUNCTION = /^(?:url|image|image-set|-webkit-image-set|cross-fade|-webkit-cross-fade|element|-moz-element|paint)\s*\(/i;
const GRADIENT_CALL = /^(?:-webkit-)?(?:repeating-)?(?:linear|radial|conic)-gradient\s*\(/i;

/** A token that is one `var(…)` call and nothing else: `{ role }` (a palette role with no fallback), or undefined for any other token. */
function bareVar(token) {
    if (!/^var\s*\(/i.test(token)) return undefined;
    if (closingParen(token, token.indexOf('(')) !== token.length - 1) return undefined;
    const m = VAR_TOKEN.exec(token);
    return { role: m !== null && STATE_OPAQUE_ROLES.includes(m[1]) };
}

/** Whether a token is a length, a percentage, a number or an angle, or a `calc()`, `min()`, `max()` or `clamp()`: a place and never a colour. */
function placeToken(token) {
    return lengthToken(token) !== undefined || SHAPE_FUNCTION.test(token);
}

/** Whether a token is a colour this lint can read as one: a literal, or a `color-mix()` or `light-dark()`. */
function colourToken(token) {
    return literalColour(token) !== undefined || /^(?:color-mix|light-dark)\(/i.test(token);
}

/** The first token of a gradient's arguments that is a `var()` standing as a colour and not a palette role, or undefined. */
function gradientColourVar(inner) {
    for (const arg of splitTopLevel(inner, ',')) {
        const tokens = splitTopLevel(arg, ' ');
        if (tokens.some((token) => GRADIENT_GEOMETRY.test(token))) continue;
        const coloured = tokens.some((token) => {
            const v = bareVar(token);
            return v === undefined ? colourToken(token) : v.role;
        });
        for (const token of tokens) {
            const v = bareVar(token);
            if (v === undefined) {
                if (!placeToken(token)) {
                    const bad = nonRoleVar(token);
                    if (bad !== undefined) return bad;
                }
            } else if (!v.role && !coloured) return token;
        }
    }
    return undefined;
}

/** The first token of one layer of a mask picture that is a `var()` standing as a colour or as the picture and not a palette role, or undefined. */
function maskLayerVar(layer, pictureOnly) {
    // What follows a `/` is a size, a slice or a width: lengths.
    const [head = ''] = splitTopLevel(layer, '/');
    const tokens = splitTopLevel(head, ' ');
    const hasPicture = tokens.some((token) => /^none$/i.test(token) || PICTURE_FUNCTION.test(token) || GRADIENT_CALL.test(token));
    for (const token of tokens) {
        const v = bareVar(token);
        if (v !== undefined) {
            if (!v.role && (pictureOnly || !hasPicture)) return token;
            continue;
        }
        const gradient = GRADIENT_CALL.exec(token);
        if (gradient !== null) {
            const open = gradient[0].length - 1;
            const close = closingParen(token, open);
            const bad = gradientColourVar(token.slice(open + 1, close < 0 ? token.length : close));
            if (bad !== undefined) return bad;
        } else if (!placeToken(token)) {
            const bad = nonRoleVar(token);
            if (bad !== undefined) return bad;
        }
    }
    return undefined;
}

/** The first `var()` of a mask property's value that stands as a colour or as the picture and is not a palette role, or undefined (see above). */
function maskColourVar(name, value) {
    if (MASK_NO_PICTURE.test(name)) return undefined;
    const pictureOnly = MASK_PICTURE_ONLY.test(name);
    for (const layer of splitTopLevel(value, ',')) {
        const bad = maskLayerVar(layer, pictureOnly);
        if (bad !== undefined) return bad;
    }
    return undefined;
}

/** Whether a `color` a pseudo-element states is its own: a literal colour, or a palette role with no fallback. */
function ownInk(value) {
    const v = value.trim();
    const role = VAR_TOKEN.exec(v);
    if (role !== null) return STATE_OPAQUE_ROLES.includes(role[1]);
    const colour = literalColour(v);
    return colour !== undefined && colour.current !== true;
}

/**
 * An edge shorthand (`border`, `outline`, `column-rule`) as what it draws:
 * whether its style draws (`none` and `hidden` do not), whether a width of
 * zero was written, and the tokens that name a colour. A width, a style and a
 * `calc()` are not colours.
 */
function edgeShorthand(value) {
    const out = { visible: false, zero: false, colours: [] };
    for (const token of splitTopLevel(value, ' ')) {
        if (/^(?:none|hidden|initial|unset)$/i.test(token) || WIDTH_KEYWORD.test(token) || SHAPE_FUNCTION.test(token)) continue;
        const length = lengthToken(token);
        if (length !== undefined) {
            if (length.n === 0) out.zero = true;
        } else if (LINE_STYLE.test(token)) out.visible = true;
        else out.colours.push(token);
    }
    return out;
}

/** The four values of a `border-color`, `-style` or `-width` as top, right, bottom and left (one value is all four, two are top and bottom then right and left, three are top, right and left, bottom). */
function expandSides(values) {
    const [a = '', b = a, c = a, d = b] = values;
    return [a, b, c, d];
}

const BORDER_SIDES_PHYSICAL = ['top', 'right', 'bottom', 'left'];
const BORDER_PROP = /^border(?:-(top|right|bottom|left))?(?:-(color|style|width))?$/;
/** A logical border property: its side is a physical one that depends on the writing mode, so a write to it may land on any. */
const LOGICAL_BORDER = /^border-(?:block|inline)(?:-(?:start|end))?(?:-(?:color|style|width))?$/;

/** A family's state while a rule is read: does its style draw, was its width zero, does it name a colour. */
const freshEdge = () => ({ visible: false, zero: false, coloured: false });

/**
 * Apply one physical `border…` declaration to the four sides. The shorthands
 * write every side they cover (a shorthand resets what it does not name: a
 * style to none, a colour to `currentcolor`); a longhand writes its own.
 */
function applyBorder(sides, match, clean) {
    const [, side, part] = match;
    if (part === undefined) {
        const s = edgeShorthand(clean);
        for (const i of side === undefined ? [0, 1, 2, 3] : [BORDER_SIDES_PHYSICAL.indexOf(side)]) {
            sides[i] = { visible: s.visible, zero: s.zero, coloured: s.colours.length > 0 };
        }
        return;
    }
    const indexes = side === undefined ? [0, 1, 2, 3] : [BORDER_SIDES_PHYSICAL.indexOf(side)];
    const per = side === undefined ? expandSides(splitTopLevel(clean, ' ')) : [clean];
    indexes.forEach((i, k) => {
        const v = per[k] ?? '';
        if (part === 'style') sides[i].visible = LINE_STYLE.test(v);
        else if (part === 'width') sides[i].zero = lengthToken(v)?.n === 0;
        else sides[i].coloured = v !== '' && !/^(?:initial|unset)$/i.test(v);
    });
}

/** The name of the first border side that draws and names no colour, or undefined. */
function uncolouredBorderSide(sides) {
    const i = sides.findIndex((side) => side.visible && !side.zero && !side.coloured);
    return i < 0 ? undefined : BORDER_SIDES_PHYSICAL[i];
}

/** Apply `outline…` and `column-rule…` (the edge families with the shorthand's three parts) to one family's state. */
function applyEdge(family, part, clean) {
    if (part === undefined) {
        const s = edgeShorthand(clean);
        Object.assign(family, { visible: s.visible, zero: s.zero, coloured: s.colours.length > 0 });
    } else if (part === 'style') family.visible = splitTopLevel(clean, ' ').some((token) => LINE_STYLE.test(token));
    else if (part === 'width') family.zero = lengthToken(clean)?.n === 0;
    else family.coloured = clean !== '' && !/^(?:initial|unset)$/i.test(clean);
}

const HOST_WHY = "takes its paint from its host, which is an element and may change its ground or its ink under a state: the pseudo-element is clear while its host is, and covers a figure it was moved over once the host is not";
const REVERT_WHY = `rolls the paint back to the browser's own, which for an edge's colour is currentcolor, so it ${HOST_WHY}`;
const VAR_WHY = 'reads a custom property that is not a palette role (var(--s-text) and its seven kin, no fallback): the host may have set it to currentColor, and the paint then follows the ink of its host, which a state may change';
const VAR_MASK_WHY = `${VAR_WHY}; in a mask that is a var() standing as a colour (a stop's colour, a colour function's argument) or as the picture itself: a length, a percentage or a calc() of them, in a size, a position or a stop's place, is none`;
const LOGICAL_WHY = 'names a side by the writing mode (block, inline, start, end), so a write to it may land on any of the four a physical property covers, and one that sets a style or a width there may draw where no colour was written: write top, right, bottom and left';
const ALL_WHY = "all re-states every property from the host's or the initial value, the paint among them; a pseudo-element writes the properties it means";
const NO_COLOUR_WHY = 'names no colour, and is drawn in currentColor, the ink of its host, which a state may change';
const HOST_INK_WHY = "is its host's ink, which a state may change: a glyph or an underline in it is clear while the host's ink is clear";

/** Why a rule of a first-party sheet whose selector holds a pseudo-element takes its paint from its host (see above). */
function pseudoHostPaintProblems(decls, selectors) {
    const pseudo = selectors.find(isPseudoElementSelector);
    if (pseudo === undefined) return [];
    const out = [];
    const say = (decl, why) => out.push(`${decl.prop}: ${echo(decl.value, 48)} on "${echo(pseudo)}" — ${why}`);
    const border = BORDER_SIDES_PHYSICAL.map(freshEdge);
    const edges = { outline: freshEdge(), 'column-rule': freshEdge(), 'text-decoration': freshEdge() };
    const drawing = {};
    for (const decl of decls) {
        const name = decl.prop.replace(VENDOR_PREFIX, '');
        const clean = decl.value.replace(/\s*!\s*important\s*$/i, '').trim();
        const bare = withoutStrings(clean);
        if (name === 'all') {
            say(decl, ALL_WHY);
            continue;
        }
        if (name === 'color') {
            if (/^(?:inherit|unset|revert|revert-layer|currentcolor)$/i.test(clean)) say(decl, HOST_INK_WHY);
            continue;
        }
        if (PSEUDO_PAINT_PROPS.test(name)) {
            const keyword = HOST_KEYWORD.exec(bare);
            if (keyword !== null) say(decl, /^revert/i.test(keyword[0]) ? REVERT_WHY : HOST_WHY);
            else if ((MASK_FAMILY.test(name) ? maskColourVar(name, clean) : nonRoleVar(clean)) !== undefined) say(decl, MASK_FAMILY.test(name) ? VAR_MASK_WHY : VAR_WHY);
            if (EDGE_COLOUR_PROPS.test(name) && splitTopLevel(clean, ' ').some((token) => /^(?:initial|unset)$/i.test(token))) {
                say(decl, `${clean.toLowerCase()} is currentcolor on an edge, and it ${HOST_WHY}`);
            }
        }
        const borderMatch = BORDER_PROP.exec(name);
        if (LOGICAL_BORDER.test(name)) {
            say(decl, LOGICAL_WHY);
        } else if (borderMatch !== null) {
            const before = border.map((slot) => slot.visible);
            applyBorder(border, borderMatch, clean);
            if (border.some((slot, i) => slot.visible && !before[i])) drawing.border ??= decl;
        } else if (name === 'box-shadow' || name === 'text-shadow') {
            if (!/^(?:none|initial|unset)$/i.test(clean) && splitTopLevel(clean, ',').some((layer) => !namesAColour(layer))) say(decl, `a layer ${NO_COLOUR_WHY}`);
        } else if (name === 'filter') {
            if (dropShadows(bare).some((inner) => !namesAColour(inner))) say(decl, `a drop-shadow() ${NO_COLOUR_WHY}`);
        } else {
            const edge = /^(outline|column-rule)(?:-(style|width|color))?$/.exec(name);
            if (edge !== null) {
                applyEdge(edges[edge[1]], edge[2], clean);
                if (edges[edge[1]].visible) drawing[edge[1]] ??= decl;
            } else if (name === 'text-decoration') {
                const tokens = splitTopLevel(clean, ' ');
                edges['text-decoration'].visible = tokens.some((token) => DECORATION_LINE.test(token));
                edges['text-decoration'].coloured = tokens.some((token) => namesAColour(token));
                if (edges['text-decoration'].visible) drawing['text-decoration'] ??= decl;
            } else if (name === 'text-decoration-line') {
                edges['text-decoration'].visible = splitTopLevel(clean, ' ').some((token) => DECORATION_LINE.test(token));
                if (edges['text-decoration'].visible) drawing['text-decoration'] ??= decl;
            } else if (name === 'text-decoration-color') {
                edges['text-decoration'].coloured = clean !== '' && !/^(?:initial|unset)$/i.test(clean);
            }
        }
    }
    const side = uncolouredBorderSide(border);
    if (side !== undefined) say(drawing.border, `draws an edge or a line that ${NO_COLOUR_WHY} (the ${side} side of its border: each side names its own colour)`);
    for (const family of Object.keys(edges)) {
        const state = edges[family];
        if (state.visible && !state.zero && !state.coloured) say(drawing[family], `draws an edge or a line that ${NO_COLOUR_WHY} (its ${family})`);
    }
    const content = decls.find((decl) => decl.prop === 'content');
    if (content !== undefined) {
        const v = content.value.replace(/\s*!\s*important\s*$/i, '').trim();
        const prints = /^["']/.test(v) && skipString(v, 0) === v.length && decodeEscapes(v.slice(1, -1)) !== '';
        if (prints) {
            const ink = decls.filter((decl) => decl.prop === 'color').pop();
            if (ink === undefined || !ownInk(ink.value.replace(/\s*!\s*important\s*$/i, ''))) {
                say(content, "prints text and states no colour of its own in this rule (a literal colour or a palette role): a glyph is its host's ink otherwise, and a state may change that ink");
            }
        }
    }
    return out;
}

/*
 * **A paint that reaches past its box names its own colour** (the lint-belts
 * critic's fourth review, B2). A state may change the ink of a box — `color`
 * is on the state list — and a paint a rule at rest wrote in that ink, or in
 * no colour at all (which is drawn in it), changes with it. For a paint inside
 * its box the probe's at-rest read is the figure's neighbourhood, but one
 * that reaches past the box is under every neighbour's figure: `box-shadow: 0
 * 0 0 4000px currentColor` on a box at rest with a clear ink is invisible, and
 * a `color` under `:hover` fills the page. So in a first-party sheet — at
 * rest, in a media block and in a keyframe — each of these names a literal
 * colour or a palette role (`var(--s-text)` and its seven kin, no fallback):
 *
 * - every **outer** `box-shadow` layer (an `inset` one is inside its box, and
 *   the existing rules read it);
 * - every `text-shadow` layer;
 * - every `filter: drop-shadow()`;
 * - `outline` and `outline-color`, and `outline-style` when it draws (a ring
 *   that names no colour is drawn in `currentColor`);
 * - `column-rule` and `column-rule-color`, and `column-rule-style` when it
 *   draws, alike (the fifth review's B1: a rule wider than its gap reaches
 *   past the box, and with no colour it is drawn in the ink);
 * - a `border-image` and `border-image-source`.
 *
 * None of them is `currentColor`, `inherit`, `revert`, `revert-layer`,
 * `initial` or `unset` where those are `currentcolor` (a shadow's or an
 * outline's), a `var()` that is not a palette role, or a layer with no colour.
 * A border's own band lies inside its box and is not read here. The rule
 * runs on a rule that names no state (the belt refuses most of these by name
 * under one and bounds the rest) and on a rule that holds no pseudo-element.
 * **The other two readers read those rules differently, not "as strictly"**
 * (the fifth review's smaller item): the belt reads a state rule's
 * `box-shadow` colour as a literal or a palette role, and its `outline-color`
 * (and its border and ground colours) as a literal or a `var(--s-…)` of any
 * name with no fallback, never `currentColor`, `inherit`, `initial` or
 * `unset`; `pseudoHostPaintProblems` reads a pseudo-element rule's paints for
 * the same host keywords, a `var()` only as a palette role, and a colour for
 * each family and side, but counts any token that is not a length or a
 * keyword as a colour, so a system colour or an `env()` passes there and
 * `initial` or `unset` as a shadow's colour is not refused. Not read,
 * stated: a style in one rule and its colour in another (an `outline-style`
 * that draws names a colour in the same rule or is refused), and a colour
 * written as a system colour or a form this lint does not read (refused: it
 * is "not a colour this lint reads").
 */
const REACH_PROPS = /^(?:box-shadow|text-shadow|filter|outline|outline-color|outline-style|column-rule|column-rule-color|column-rule-style|border-image|border-image-source)$/;
const REACH_NO_COLOUR = 'names no colour, and is drawn in currentColor, the ink of its box, which a state may change';

/** Why the colour tokens of a layer, a call or a shorthand may not stand as the colour of a paint that reaches past its box, or undefined. */
function reachColourProblem(tokens) {
    const colours = tokens.filter((token) => lengthToken(token) === undefined && !SHAPE_FUNCTION.test(token));
    if (colours.length === 0) return REACH_NO_COLOUR;
    for (const token of colours) {
        const why = groundColourProblem(token, 'own');
        if (why !== undefined) return why;
    }
    return undefined;
}

/** Why a first-party rule's or keyframe stop's declarations let a paint past the box name no colour of its own (see above). */
function pastTheBoxProblems(decls) {
    const out = [];
    const say = (decl, why) => out.push(`${decl.prop}: ${echo(decl.value, 48)} — ${why}; it reaches past its box, where a state that changes the ink of its box shows it`);
    // The two edge families that reach past a box: an outline's ring, and a column rule, whose width can pass its gap (the fifth review's B1).
    const families = { outline: freshEdge(), 'column-rule': freshEdge() };
    const drawing = {};
    for (const decl of decls) {
        const name = decl.prop.replace(VENDOR_PREFIX, '');
        if (!REACH_PROPS.test(name)) continue;
        const clean = decl.value.replace(/\s*!\s*important\s*$/i, '').trim();
        const bare = withoutStrings(clean);
        if (/^(?:inherit|revert|revert-layer)$/i.test(clean)) {
            say(decl, `${clean.toLowerCase()} takes the paint of the parent or the cascade, not a colour of its own`);
            continue;
        }
        if (name === 'box-shadow' || name === 'text-shadow') {
            if (/^(?:none|initial|unset)$/i.test(clean)) continue;
            for (const layer of splitTopLevel(clean, ',')) {
                const tokens = splitTopLevel(layer, ' ');
                if (name === 'box-shadow' && tokens.some((token) => /^inset$/i.test(token))) continue;
                const why = reachColourProblem(tokens);
                if (why !== undefined) {
                    say(decl, `a layer: ${why}`);
                    break;
                }
            }
        } else if (name === 'filter') {
            for (const inner of dropShadows(bare)) {
                const why = reachColourProblem(splitTopLevel(inner, ' '));
                if (why !== undefined) {
                    say(decl, `a drop-shadow(): ${why}`);
                    break;
                }
            }
        } else if (name === 'border-image' || name === 'border-image-source') {
            if (/^(?:none|initial|unset)$/i.test(clean)) continue;
            const keyword = HOST_KEYWORD.exec(bare);
            const variable = nonRoleVar(clean);
            if (keyword !== null) say(decl, `${keyword[0].toLowerCase()} is the ink of the box or the cascade's, not a colour of its own`);
            else if (variable !== undefined) say(decl, `a var() that is not a palette role (${STATE_OPAQUE_ROLES.join(', ')}) may hold currentcolor`);
        } else {
            const edge = /^(outline|column-rule)(?:-(style|color))?$/.exec(name);
            applyEdge(families[edge[1]], edge[2], clean);
            if (families[edge[1]].visible) drawing[edge[1]] ??= decl;
            // The colour of the shorthand or the longhand, each token read as a shadow's is.
            const colours = edge[2] === 'style' ? [] : edge[2] === 'color' ? [clean] : edgeShorthand(clean).colours;
            for (const token of colours) {
                const why = groundColourProblem(token, 'own');
                if (why !== undefined) {
                    say(decl, why);
                    break;
                }
            }
        }
    }
    for (const [family, noun] of [['outline', 'an outline'], ['column-rule', 'a column rule']]) {
        const state = families[family];
        if (drawing[family] !== undefined && state.visible && !state.zero && !state.coloured) say(drawing[family], `${noun} that ${REACH_NO_COLOUR}`);
    }
    return out;
}

/*
 * **An outline is capped, per longhand** (the fourth review's ranked item 1,
 * decided by the window). An outline's ring reaches past its box over the
 * boxes beside it, and the probe reads an outline at rest only across the
 * glyphs of its own box and of the boxes above a figure
 * (`outlineFault`, `outlineAboveFault`), never one on a box beside it. A sum
 * per rule was split by the cascade (`outline: 8px solid transparent` in
 * one rule and `outline-offset: 8px` in another), and a keyframe can carry
 * the widths, so the cap is on each declaration, wherever it stands in a
 * first-party sheet — at rest, in a media block and in a keyframe: **a width
 * of at most `OUTLINE_WIDTH_MAX_PX` (4px)** in px or as `thin` or `medium`
 * (`thick` is 5px), and **an offset from `OUTLINE_OFFSET_MIN_PX` (-8px) to
 * `OUTLINE_OFFSET_MAX_PX` (4px)** in px, neither written as a `var()` or a
 * `calc()` (a palette role standing as the shorthand's colour is a colour,
 * not a width). The `outline` shorthand's width is read the same way. Under
 * a state the belt refuses all three by name. Rural's one outline, `1px`
 * at `-5px`, stands.
 */
export const OUTLINE_WIDTH_MAX_PX = 4;
export const OUTLINE_OFFSET_MIN_PX = -8;
export const OUTLINE_OFFSET_MAX_PX = 4;
const WIDTH_PX = { thin: 1, medium: 3, thick: 5 };

function outlineCapProblems(decls) {
    const out = [];
    const say = (decl, why) => out.push(`${decl.prop}: ${echo(decl.value, 48)} — ${why}; an outline's ring reaches over the boxes beside its box, where the probe reads it only across its own glyphs and those of the boxes above a figure (a width is at most ${OUTLINE_WIDTH_MAX_PX}px and an offset from ${OUTLINE_OFFSET_MIN_PX}px to ${OUTLINE_OFFSET_MAX_PX}px, written in px with no var() or calc())`);
    /** Why one width token may not stand, or undefined. */
    const widthWhy = (token) => {
        if (/^(?:thin|medium|thick)$/i.test(token)) {
            return WIDTH_PX[token.toLowerCase()] > OUTLINE_WIDTH_MAX_PX ? `${token.toLowerCase()} is ${WIDTH_PX[token.toLowerCase()]}px` : undefined;
        }
        const length = lengthToken(token);
        if (length === undefined) return `${echo(token, 32)} is not a width this lint reads`;
        if (length.unit !== 'px' && !(length.unit === '' && length.n === 0)) return `${echo(token, 32)} is not in px`;
        return length.n > OUTLINE_WIDTH_MAX_PX ? `${echo(token, 32)} is past ${OUTLINE_WIDTH_MAX_PX}px` : undefined;
    };
    for (const decl of decls) {
        const name = decl.prop.replace(VENDOR_PREFIX, '');
        if (name !== 'outline' && name !== 'outline-width' && name !== 'outline-offset') continue;
        const clean = decl.value.replace(/\s*!\s*important\s*$/i, '').trim();
        if (/^(?:initial|unset)$/i.test(clean)) continue;
        if (/^(?:inherit|revert|revert-layer)$/i.test(clean)) {
            say(decl, `${clean.toLowerCase()} is a value this lint cannot read`);
            continue;
        }
        if (name === 'outline-offset') {
            const length = lengthToken(clean);
            if (length === undefined || (length.unit !== 'px' && !(length.unit === '' && length.n === 0))) say(decl, `${echo(clean, 32)} is not a length in px`);
            else if (length.n < OUTLINE_OFFSET_MIN_PX || length.n > OUTLINE_OFFSET_MAX_PX) say(decl, `${echo(clean, 32)} is outside ${OUTLINE_OFFSET_MIN_PX}px to ${OUTLINE_OFFSET_MAX_PX}px`);
            continue;
        }
        const tokens = name === 'outline-width' ? [clean] : splitTopLevel(clean, ' ');
        for (const token of tokens) {
            if (name === 'outline') {
                const length = lengthToken(token);
                const role = VAR_TOKEN.exec(token);
                const isWidth = length !== undefined || WIDTH_KEYWORD.test(token) || SHAPE_FUNCTION.test(token) || /^var\s*\(/i.test(token);
                if (role !== null && STATE_OPAQUE_ROLES.includes(role[1])) continue;
                if (!isWidth) continue;
            }
            const why = /^(?:var|env|attr)\s*\(/i.test(token) || SHAPE_FUNCTION.test(token) ? `${echo(token, 32)} is a var() or calc() that this lint cannot size` : widthWhy(token);
            if (why !== undefined) {
                say(decl, why);
                break;
            }
        }
    }
    return out;
}

/*
 * **A line and a stroke are capped, per declaration** (the fifth review's B1).
 * An underline, a strike and an SVG stroke are drawn in the ink of their box
 * (`currentColor` is their initial colour), and each reaches past the box
 * with one number: `text-underline-offset: 300px` with
 * `text-decoration-thickness: 60px` draws a bar 300px below its line, and
 * stall.css already underlines `.guide-link`, `.wearing-link` and
 * `.token-link-live`, so a look needs no `text-decoration` of its own to
 * reach it; `stroke-width: 300` on a glyph (`.ic` is `stroke:
 * currentColor`) with `overflow: visible` fills the page. A state that
 * changes the ink then reveals it, with no move. So in a first-party sheet,
 * wherever a declaration stands (at rest, in a media block and in a
 * keyframe), each is capped where it is written, in px or a keyword and with
 * no `var()` or `calc()` (a sum per rule is split by the cascade):
 *
 * - `text-underline-offset`, at most `UNDERLINE_OFFSET_MAX_PX` (4px) either
 *   side of the line, or `auto` or `from-font`;
 * - `text-decoration-thickness`, and the thickness a `text-decoration`
 *   shorthand carries, at most `DECORATION_THICKNESS_MAX_PX` (3px), or `auto`
 *   or `from-font`; **the shorthand is read by an allow-list** (the sixth
 *   review's M1): each token is a line or style keyword, `auto`, `from-font`,
 *   a colour this lint reads or a palette role, or a px length within the cap,
 *   and every other token, a function of any name included, is refused;
 * - `stroke-width`, a bare number or px, at most `STROKE_WIDTH_MAX` (3; the
 *   shipped glyphs paint 1.75 to 2);
 * - the `d` property, which draws an SVG path from CSS, is not written.
 *
 * A column rule is the other half of the same road (its width can pass its
 * gap) and names its own colour like an outline (`pastTheBoxProblems`).
 * A CSS-wide keyword (`inherit`, `revert`, …) takes a value the cascade
 * already holds, a capped look rule's or a base sheet's, and is not read.
 * Under a state the belt refuses all of these properties by name. Not read,
 * stated: an element that grows (`width`, `height`, `zoom`, `scale`) so
 * that a capped stroke or offset is multiplied (the element road, in the
 * belt's list above), and `filter: url()`, an SVG filter whose primitives
 * this lint does not open.
 */
export const UNDERLINE_OFFSET_MAX_PX = 4;
export const DECORATION_THICKNESS_MAX_PX = 3;
export const STROKE_WIDTH_MAX = 3;

const INK_REACH_OFFSET = { low: -UNDERLINE_OFFSET_MAX_PX, high: UNDERLINE_OFFSET_MAX_PX, keywords: ['auto', 'from-font'], bare: false };
const INK_REACH_THICKNESS = { low: 0, high: DECORATION_THICKNESS_MAX_PX, keywords: ['auto', 'from-font'], bare: false };
const INK_REACH_STROKE = { low: 0, high: STROKE_WIDTH_MAX, keywords: [], bare: true };

/** Why one token may not stand as a length of the given reach (a px length within `low` to `high`, a keyword, or a bare number where `bare`), or undefined. */
function reachLengthWhy(token, { low, high, keywords, bare }) {
    if (keywords.includes(token.toLowerCase())) return undefined;
    if (/^(?:var|env|attr)\s*\(/i.test(token) || SHAPE_FUNCTION.test(token)) return `${echo(token, 32)} is a var() or calc() that this lint cannot size`;
    const length = lengthToken(token);
    if (length === undefined) return `${echo(token, 32)} is not a length this lint reads`;
    if (!(length.unit === 'px' || (length.unit === '' && (bare || length.n === 0)))) return `${echo(token, 32)} is not in px${bare ? ' or a bare number' : ''}`;
    return length.n < low || length.n > high ? `${echo(token, 32)} is outside ${low}px to ${high}px` : undefined;
}

/** The keywords a `text-decoration` shorthand may carry: a line, a style, and the two a thickness may be (`auto`, `from-font`). */
const DECORATION_KEYWORD = /^(?:none|underline|overline|line-through|blink|solid|double|dotted|dashed|wavy|auto|from-font)$/i;

/**
 * Why one token of a `text-decoration` shorthand may not stand, or undefined.
 * **Read by an allow-list** (the sixth review's M1): a token is a line or a
 * style keyword, `auto`, `from-font`, a colour this lint reads
 * (`literalColour`) or a palette role standing alone, or a length within the
 * thickness cap. Every other token is refused, a function of any name
 * included: a reader that refused the functions it knew (`calc()`, `min()`,
 * `max()`, `clamp()`) let `abs(60px)`, `round(60px, 1px)` and `hypot(60px)`
 * through, and Chrome draws a 30px bar for each.
 */
function decorationTokenWhy(token) {
    if (DECORATION_KEYWORD.test(token)) return undefined;
    if (lengthToken(token) !== undefined) return reachLengthWhy(token, INK_REACH_THICKNESS);
    const role = VAR_TOKEN.exec(token);
    if (role !== null && STATE_OPAQUE_ROLES.includes(role[1])) return undefined;
    if (literalColour(token) !== undefined) return undefined;
    return `${echo(token, 32)} is not a line or style keyword, a colour this lint reads, a palette role or a px thickness within the cap`;
}

function inkReachProblems(decls) {
    const out = [];
    const say = (decl, why) =>
        out.push(
            `${decl.prop}: ${echo(decl.value, 48)} — ${why}; an underline, a strike or a stroke is drawn in the ink of its box and reaches past it, where a state that changes the ink shows it (an underline sits within ${UNDERLINE_OFFSET_MAX_PX}px of its line and is at most ${DECORATION_THICKNESS_MAX_PX}px thick, a stroke is at most ${STROKE_WIDTH_MAX} wide, each in px or a keyword with no var() or calc(), and d is not written)`,
        );
    for (const decl of decls) {
        const name = decl.prop.replace(VENDOR_PREFIX, '');
        const clean = decl.value.replace(/\s*!\s*important\s*$/i, '').trim();
        if (name === 'd') {
            say(decl, "the d property draws an SVG path from CSS, anywhere in the glyph's space");
            continue;
        }
        if (name !== 'text-underline-offset' && name !== 'text-decoration-thickness' && name !== 'text-decoration' && name !== 'stroke-width') continue;
        // A CSS-wide keyword takes a value the cascade already holds: a capped look rule's, or a base sheet's (none of which reaches).
        if (/^(?:initial|unset|inherit|revert|revert-layer)$/i.test(clean)) continue;
        if (name === 'text-decoration') {
            const why = splitTopLevel(clean, ' ').map(decorationTokenWhy).find((found) => found !== undefined);
            if (why !== undefined) say(decl, why);
            continue;
        }
        const reach = name === 'text-underline-offset' ? INK_REACH_OFFSET : name === 'stroke-width' ? INK_REACH_STROKE : INK_REACH_THICKNESS;
        const why = reachLengthWhy(clean, reach);
        if (why !== undefined) say(decl, why);
    }
    return out;
}

/*
 * **A blur is capped** (the sixth review's judgement on `filter: blur()`,
 * decided by the window). `filter: blur(40px)` spreads the paint of a box,
 * its ink included, far past the box, and a colour under a state then shows
 * it with no move; the fifth review stated it as a gap. So in a first-party
 * sheet, wherever a `filter` stands (at rest, in a media block and in a
 * keyframe, `-webkit-filter` read as `filter`):
 *
 * - a `blur()` is a length in px (or a bare `0`) of at most
 *   `FILTER_BLUR_MAX_PX` (4px), with no `var()`, `calc()` or other function
 *   in it;
 * - a filter list holds at most one `blur()` (two blurs of 4px are 8px);
 * - the list takes no `var()`, `env()` or `attr()` outside a `drop-shadow()`
 *   (which the colour readers above read): a custom property can hold a
 *   whole `blur(80px)`, and the cap would then be read of nothing.
 *
 * `backdrop-filter` blurs what lies behind the box, not its own paint, and
 * is not read. A CSS-wide keyword takes a value the cascade already holds.
 * Under a state the belt refuses `filter` by name. Not read, stated: a
 * `filter: url()`, an SVG filter whose primitives this lint does not open.
 * Cost, surveyed: nil — the looks' filters are `sepia()`, `saturate()`,
 * `brightness()`, `contrast()` and `drop-shadow()`, and no sheet blurs its
 * own paint.
 */
export const FILTER_BLUR_MAX_PX = 4;

function blurCapProblems(decls) {
    const out = [];
    const say = (decl, why) =>
        out.push(
            `${decl.prop}: ${echo(decl.value, 48)} — ${why}; a blur() spreads the box's paint, its ink included, past the box, where a state that changes the ink shows it (a blur() in a filter is px only and at most ${FILTER_BLUR_MAX_PX}px, one to a list, with no var() or calc(), and no var() stands elsewhere in the list)`,
        );
    for (const decl of decls) {
        if (decl.prop.replace(VENDOR_PREFIX, '') !== 'filter') continue;
        const clean = decl.value.replace(/\s*!\s*important\s*$/i, '').trim();
        if (/^(?:none|initial|unset|inherit|revert|revert-layer)$/i.test(clean)) continue;
        let bare = withoutStrings(clean);
        // A drop-shadow()'s colour is the colour readers'; take each call out and read the rest of the list.
        for (const m of [...bare.matchAll(/drop-shadow\s*\(/gi)].reverse()) {
            const open = m.index + m[0].length - 1;
            const close = closingParen(bare, open);
            bare = bare.slice(0, m.index) + ' ' + (close < 0 ? '' : bare.slice(close + 1));
        }
        if (/(?<![\w-])(?:var|env|attr)\s*\(/i.test(bare)) {
            say(decl, 'a var() in a filter may hold a blur this lint never reads');
            continue;
        }
        const calls = [...bare.matchAll(/(?<![\w-])blur\s*\(/gi)];
        if (calls.length > 1) {
            say(decl, `${calls.length} blur() calls in one filter list: two blurs add`);
            continue;
        }
        for (const m of calls) {
            const open = m.index + m[0].length - 1;
            const close = closingParen(bare, open);
            const arg = bare.slice(open + 1, close < 0 ? bare.length : close).trim();
            if (arg === '') continue;
            const why = reachLengthWhy(arg, { low: 0, high: FILTER_BLUR_MAX_PX, keywords: [], bare: false });
            if (why !== undefined) say(decl, why);
        }
    }
    return out;
}

/*
 * **A rule runs only a keyframe its own sheet declares** (the fifth review's
 * B3). `@keyframes` names are global, and stall.css ships keyframes of its
 * own: `animation: pin-demo-land 1s 120s reverse forwards` on a quote's
 * `.item-a` runs a base keyframe that holds `visibility: hidden` from 0 to
 * 44% (the critic's PT, reopened by a name the sheet never declared);
 * `animation: sel-bump 1s infinite` on a money node scales it by 1.18, which
 * the money size lint refuses in a look's own keyframes and never reads in a
 * base sheet's; `animation-name: var(--an)` does the same through a custom
 * property. So in a first-party sheet each rule's `animation` and
 * `animation-name` name `none` or a keyframe the same sheet declares at its
 * top level, and never through a `var()`: the keyframes a look runs are the
 * keyframes the look lint reads. **Only a top-level `@keyframes` block counts**
 * (the sixth review's M2): inside `@media` a keyframe applies only while the
 * condition does, below it a base sheet's keyframe of the same name is the one
 * that runs, so a keyframe inside an at-rule is refused where it is written
 * (`lintLook`); `@keyframes x;` has no block, is no keyframes, and counts as
 * none. `declaredNames` (the cross-sheet rule) reads names without their quotes.
 * The shorthand is read single by single (`parseSingleAnimation`, the flash
 * rule's reader). `inherit`, `revert` and `revert-layer` take the parent's or
 * the cascade's name and are refused; `initial` and `unset` are `none`. Under
 * a state the belt refuses `animation*` by name. Cost: nil — every shipped
 * look, the fixture look, the tracked private fixture and the canary run
 * only their own keyframes, and so does every starter (`workshop:start`
 * renames the keyframes `wk-…` and the rules with them); none declares a
 * keyframe inside an at-rule. **Not read, stated**: a longhand that names no
 * keyframe (`animation-duration`, `animation-delay`) is not harmless. It
 * re-times what the cascade already runs on its element, a base sheet's
 * keyframe included (`.bc-ext { animation-delay: 120s }` re-times
 * `.bc-ext.in`'s `bc-in`), and nothing here reads it.
 */
function keyframeNamesOf(nodes) {
    const out = new Set();
    // Top level only (the sixth review's M2): a keyframe inside `@media` applies only while the condition does, so below it
    // a base sheet's keyframe of the same name is the one that runs. A nested keyframe is refused where it is written (`lintLook`).
    // A block only: `@keyframes x;` is no keyframes at all, and a browser drops it.
    for (const node of nodes) {
        if (node.kind === 'at' && node.name === 'keyframes' && !node.statement) out.add(unquoted(node.prelude.replace(/^@keyframes\s*/i, '').trim()));
    }
    return out;
}

function animationNameProblems(decls, own) {
    const out = [];
    const say = (decl, why) =>
        out.push(
            `${decl.prop}: ${echo(decl.value, 48)} — ${why}; a rule of a look sheet runs only a keyframe its own sheet declares (a base sheet's keyframes are global, and one can hide, scale or fade a money node), and never through a var()`,
        );
    for (const decl of decls) {
        const name = decl.prop.replace(VENDOR_PREFIX, '');
        if (name !== 'animation' && name !== 'animation-name') continue;
        const clean = decl.value.replace(/\s*!\s*important\s*$/i, '').trim();
        if (/^(?:initial|unset)$/i.test(clean)) continue;
        if (/^(?:inherit|revert|revert-layer)$/i.test(clean)) {
            say(decl, `${clean.toLowerCase()} takes the animation of the parent or the cascade, which this lint cannot name`);
            continue;
        }
        if (/(?<![\w-])(?:var|env|attr)\s*\(/i.test(withoutStrings(clean))) {
            say(decl, 'a var() can hold a keyframe name this lint never reads');
            continue;
        }
        for (const single of splitTopLevel(clean, ',')) {
            const named = name === 'animation' ? parseSingleAnimation(single).name : unquoted(single.trim());
            if (named === undefined || (name === 'animation-name' && /^none$/i.test(named))) continue;
            if (!own.has(named)) {
                say(decl, `${echo(named, 32)} is not a keyframe this sheet declares`);
                break;
            }
        }
    }
    return out;
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
    for (const { name, element } of pseudoTokens(selector, !kit)) {
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
 * The inherited longhands that paint text, which a first-party keyframe may
 * not set (`declarationProblems`, the inherited-ink belt beside the probe's
 * keyframe-offset read). The text's own fill colour and stroke,
 * `-webkit-text-fill-color` and the `-webkit-text-stroke` family, are not
 * here: they are refused everywhere (`REFUSED_PROPERTIES`). SVG `fill` and
 * `stroke` are a different paint, an element's own, and inherited too: a
 * first-party sheet sets them on a drawn icon alone, and never in a keyframe
 * (`SVG_PAINT`, `isIconRule`; D-2026-10-26-04 (b)).
 */
const KEYFRAME_INK = new Set([
    'color',
    'text-shadow',
    'caret-color',
    'text-emphasis',
    'text-emphasis-color',
    'text-emphasis-style',
    'text-emphasis-position',
    '-webkit-text-emphasis',
    '-webkit-text-emphasis-color',
    '-webkit-text-emphasis-style',
    '-webkit-text-emphasis-position',
    'paint-order',
    'font-palette',
]);

/**
 * The grounds and shadows a first-party keyframe may not set
 * (`declarationProblems`, before 8g2, the fourth review's item 2, the
 * critic's PG; D-2026-10-26-04 (a)): a background's colour or image, the
 * shorthand that sets them, and a box shadow, with its prefixed twin. A
 * keyframe that paints a ground on a box above a figure puts the figure on
 * that ground for part of a cycle — `background-color: var(--s-text)` from
 * 25% to 68% of a loop on Rural's quote `.item-a` sets the figure on its own
 * ink — and the probe reads the ground at rest, at the frozen instant and,
 * since the same review, at every keyframe offset where a seek changed it
 * (`offsetGroundFaults` in `layout/probe.ts`, the kit's road). The shipped
 * keyframes move a background's position, an opacity or a transform, and
 * none of these.
 */
const KEYFRAME_GROUND = new Set(['background', 'background-color', 'background-image', 'box-shadow', '-webkit-box-shadow']);

/** The SVG paint longhands a first-party sheet sets on a drawn icon alone (`isIconRule`; D-2026-10-26-04 (b)). */
const SVG_PAINT = /^(?:fill|stroke)(?:-|$)/;

/** The SVG shapes a drawn icon is made of, which a rule may reach under `.ic` (`src/ui/glyphs.ts` draws one `path`). */
const ICON_PARTS = /^(?:path|g|line|polyline|polygon|circle|ellipse|rect)$/;

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
 * The prefixed properties whose name without the prefix is no property
 * (G4's twin; before 8g2, the fifth review's side finding to item 6): the
 * twin rule read the twin as the name less its prefix, so the critic's PQM
 * wrote `mask-box-image:`, which nothing reads, beside
 * `-webkit-mask-box-image:` and stood. Measured in headless Chrome 156:
 * every `-webkit-` property it lists whose name less the prefix it neither
 * lists nor reads (`CSS.supports`), save the two every engine reads under
 * the prefix (`PREFIXED_EVERYWHERE`). Each maps to the property that is its
 * twin and takes the same value — the mask border's standard name, and the
 * logical box sides and sizes — or to `null` where none does, and then the
 * property is refused outright: its sentence says the name less the prefix
 * is none Chrome reads, which is what was measured — another engine may
 * read one (Firefox's `mask-position-x` and `-y` were not checked, with no
 * network; PLAN § Open). Read for a first-party sheet
 * alone (`lintLookSheet`): the kit keeps the plain rule the workshop README
 * states, and a twin there is the name less its prefix
 * (`the-kit-twin-rule-passes-the-tap-highlight-beside-an-unread-twin`). A
 * prefixed property Chrome does not list (`-webkit-backdrop-filter`, a
 * `-moz-` one) is read as before: its twin is not held to exist.
 */
export const PREFIXED_TWINS = Object.freeze({
    '-webkit-mask-box-image': 'mask-border',
    '-webkit-mask-box-image-outset': 'mask-border-outset',
    '-webkit-mask-box-image-repeat': 'mask-border-repeat',
    '-webkit-mask-box-image-slice': 'mask-border-slice',
    '-webkit-mask-box-image-source': 'mask-border-source',
    '-webkit-mask-box-image-width': 'mask-border-width',
    '-webkit-border-before': 'border-block-start',
    '-webkit-border-before-color': 'border-block-start-color',
    '-webkit-border-before-style': 'border-block-start-style',
    '-webkit-border-before-width': 'border-block-start-width',
    '-webkit-border-after': 'border-block-end',
    '-webkit-border-after-color': 'border-block-end-color',
    '-webkit-border-after-style': 'border-block-end-style',
    '-webkit-border-after-width': 'border-block-end-width',
    '-webkit-border-start': 'border-inline-start',
    '-webkit-border-start-color': 'border-inline-start-color',
    '-webkit-border-start-style': 'border-inline-start-style',
    '-webkit-border-start-width': 'border-inline-start-width',
    '-webkit-border-end': 'border-inline-end',
    '-webkit-border-end-color': 'border-inline-end-color',
    '-webkit-border-end-style': 'border-inline-end-style',
    '-webkit-border-end-width': 'border-inline-end-width',
    '-webkit-margin-before': 'margin-block-start',
    '-webkit-margin-after': 'margin-block-end',
    '-webkit-margin-start': 'margin-inline-start',
    '-webkit-margin-end': 'margin-inline-end',
    '-webkit-padding-before': 'padding-block-start',
    '-webkit-padding-after': 'padding-block-end',
    '-webkit-padding-start': 'padding-inline-start',
    '-webkit-padding-end': 'padding-inline-end',
    '-webkit-logical-width': 'inline-size',
    '-webkit-logical-height': 'block-size',
    '-webkit-min-logical-width': 'min-inline-size',
    '-webkit-min-logical-height': 'min-block-size',
    '-webkit-max-logical-width': 'max-inline-size',
    '-webkit-max-logical-height': 'max-block-size',
    '-webkit-border-horizontal-spacing': null,
    '-webkit-border-vertical-spacing': null,
    '-webkit-box-align': null,
    '-webkit-box-direction': null,
    '-webkit-box-flex': null,
    '-webkit-box-ordinal-group': null,
    '-webkit-box-pack': null,
    '-webkit-box-reflect': null,
    '-webkit-column-break-after': null,
    '-webkit-column-break-before': null,
    '-webkit-column-break-inside': null,
    '-webkit-font-smoothing': null,
    '-webkit-locale': null,
    '-webkit-mask-position-x': null,
    '-webkit-mask-position-y': null,
    '-webkit-perspective-origin-x': null,
    '-webkit-perspective-origin-y': null,
    '-webkit-rtl-ordering': null,
    '-webkit-tap-highlight-color': null,
    '-webkit-text-combine': null,
    '-webkit-text-decorations-in-effect': null,
    '-webkit-text-fill-color': null,
    '-webkit-text-security': null,
    '-webkit-text-stroke': null,
    '-webkit-text-stroke-color': null,
    '-webkit-text-stroke-width': null,
    '-webkit-transform-origin-x': null,
    '-webkit-transform-origin-y': null,
    '-webkit-transform-origin-z': null,
    '-webkit-user-drag': null,
    '-webkit-user-modify': null,
});

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

/**
 * A selector as its top-level compounds and the combinators between them:
 * `['.t-x', ' ', '.ic', '>', 'path']`, a descendant combinator as `' '`.
 */
function compoundsAndCombinators(selector) {
    const out = [];
    let depth = 0;
    let cur = '';
    let comb = null;
    const text = selector.trim();
    for (let i = 0; i < text.length; i += 1) {
        const c = text[i];
        if (c === '"' || c === "'") {
            const j = skipString(text, i);
            if (comb !== null) {
                out.push(comb);
                comb = null;
            }
            cur += text.slice(i, j);
            i = j - 1;
            continue;
        }
        if (c === '(' || c === '[') depth += 1;
        else if (c === ')' || c === ']') depth = Math.max(0, depth - 1);
        if (depth === 0 && (c === '>' || c === '+' || c === '~' || /\s/.test(c))) {
            if (cur !== '') {
                out.push(cur);
                cur = '';
                comb = ' ';
            }
            if (!/\s/.test(c)) comb = c;
            continue;
        }
        if (comb !== null) {
            out.push(comb);
            comb = null;
        }
        cur += c;
    }
    if (cur !== '') out.push(cur);
    return out;
}

/** Whether a compound is the drawn icon itself: classes alone (an `svg` type before them at most), `.ic` among them, no state, attribute or id. */
const isIconCompound = (compound) => /^(?:svg)?(?:\.[a-z_][a-z0-9_-]*)+$/i.test(compound) && compound.split('.').slice(1).includes('ic');

/**
 * Whether every selector of a rule names a drawn icon (`SVG_PAINT`'s one
 * home): its subject is the `.ic` svg (`isIconCompound`), or a shape
 * (`ICON_PARTS`) under one by a descendant or child combinator. A keyframe
 * (no selectors) names none.
 */
function isIconRule(selectors) {
    return (
        selectors !== undefined &&
        selectors.length > 0 &&
        selectors.every((selector) => {
            const parts = compoundsAndCombinators(selector);
            const subject = parts[parts.length - 1] ?? '';
            if (isIconCompound(subject)) return true;
            return ICON_PARTS.test(subject) && parts.length >= 3 && (parts[parts.length - 2] === ' ' || parts[parts.length - 2] === '>') && isIconCompound(parts[parts.length - 3]);
        })
    );
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
 * paints on a screen no pass measured. **This is the older, explicit list**
 * that the file-mask refusal and the sticky-sign test read, in the kit as in
 * a first-party sheet; it stays as it was, bar the whitespace after the colon
 * (the lint-belts critic's B1, a fix of a hole on main). **The state belt
 * does not read it**: the belt fails closed (`namesAState`, every
 * pseudo-class but `STRUCTURAL_PSEUDO_CLASSES`), and in a first-party sheet
 * the belt refuses a mask and a `position` under any state it names.
 */
const STATE_PSEUDO = /:\s*(?:hover|focus|focus-visible|focus-within|active|checked|target|open|popover-open|disabled|enabled|placeholder-shown|invalid|valid|indeterminate|visited|link|any-link)(?![\w-])/i;

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
        /*
         * An inherited ink in a keyframe (before 8g2; the critic's third
         * review, item 1, the belt beside PT2; D-2026-10-26-03): a keyframe
         * that sets `color`, a shadow or an emphasis mark on a box repaints
         * the text of every box below it, a money figure's among them, for
         * part of a cycle — `color: transparent` from 25% to 68% of a loop on
         * a quote's `.item-a` clears the figure under it, which the
         * custom-property refusal above does not see, since the keyframe
         * names a real property. The probe reads a figure's held dress at
         * every keyframe offset of every animation on its ancestry
         * (`offsetDressFaults` in `layout/probe.ts`); this refuses the road
         * where it is written, in a first-party sheet, wherever a rule runs
         * the keyframe. `KEYFRAME_INK`: the inherited longhands that paint
         * text — the ink, a text shadow, the caret, the emphasis marks (each
         * prefixed twin too), the order a stroke and a fill are painted in,
         * a colour font's palette. The text's fill colour and stroke
         * (`-webkit-text-fill-color`, `-webkit-text-stroke*`) are refused
         * everywhere already (`REFUSED_PROPERTIES`), SVG `fill` and `stroke`
         * off a drawn icon and in any keyframe below (`SVG_PAINT`), and the
         * tap highlight is `transparent` everywhere. No first-party sheet a run
         * serves sets one in a keyframe (the shipped looks, the starters, the
         * fixture look, the tracked private fixture and the canary;
         * `refuses-an-inherited-ink-in-a-keyframe`); stall.css does (the
         * sign's failing lamp, `att-hum-gutter`, and the door's pin demo),
         * and it is no look sheet. The kit keeps the rules its README states.
         */
        if (firstParty && selectors === undefined && KEYFRAME_INK.has(prop)) {
            out.push(
                `${shown} — ${prop} in a keyframe is inherited: it changes how the text of every box below the one that runs it is painted, a money figure's among them, for part of a cycle; a look sets its inks, shadows and marks at rest`,
            );
        }
        /*
         * A ground or a shadow in a keyframe (before 8g2, the fourth review's
         * item 2, the critic's PG; D-2026-10-26-04 (a), "Chặn cả hai"): a
         * keyframe that sets a background's colour or image, or a box shadow,
         * on a box above a money figure lays a ground under it for part of a
         * cycle, where the probe's reads at rest and at the frozen instant do
         * not look — PG puts Rural's quote figure on its own ink from 25% to
         * 68% of a loop. `KEYFRAME_GROUND`, wherever a rule runs the keyframe;
         * a background that moves (`background-position`, `background-size`)
         * is not here. No first-party sheet a run serves sets one in a
         * keyframe (the shipped looks, the starters, the fixture look, the
         * tracked private fixture and the canary;
         * `a-keyframe-never-sets-a-ground-or-a-shadow`); stall.css does (the
         * Neo card's pulse and the door's breathing button, a box shadow; the
         * yard's beetle and the door's pin demo, a background), and it is no
         * look sheet. The kit keeps the rules its README states: the probe
         * reads a kit look's keyframe ground at every offset where a seek
         * changed it.
         */
        if (firstParty && selectors === undefined && KEYFRAME_GROUND.has(prop)) {
            out.push(
                `${shown} — a ground or a shadow in a keyframe lays a ground under every box inside the one that runs it, a money figure's among them, for part of a cycle; a look sets its grounds and shadows at rest`,
            );
        }
        /*
         * SVG paint off a drawn icon (before 8g2, the fourth review's item 4,
         * the critic's PFQ; D-2026-10-26-04 (b)): an author `fill` beats the
         * presentation attribute `qrSvg` draws a code with, so
         * `.t-modern .qr path { fill: #fff }` blanked every pay and share
         * code on the look, its quiet zone white and its modules gone, and
         * passed the whole runner. In a first-party sheet `fill`, `stroke`
         * and every `fill-*` and `stroke-*` longhand stand only on a rule
         * whose every selector's subject is a drawn icon — the `.ic` svg
         * (`src/ui/glyphs.ts`), or a shape under it by a descendant or child
         * combinator (`isIconRule`) — the one shape the shipped looks write
         * (`.t-modern .ic { stroke-width: 2 }`, Neo's, Rural's); refused in a
         * keyframe, which has no selector. The probe holds every code's
         * colours computed (`qrColourFaults` in `layout/probe.ts`), the
         * kit's road. `-webkit-text-stroke` and `-webkit-text-fill-color`
         * are refused everywhere already (`REFUSED_PROPERTIES`).
         */
        if (firstParty && SVG_PAINT.test(prop) && !isIconRule(selectors)) {
            out.push(
                `${shown} — SVG paint stands only on a drawn icon (a rule whose every selector's subject is .ic, or a shape under it): an author fill or stroke beats the colours a code is drawn with, and a code with its modules painted white scans as nothing`,
            );
        }
        /*
         * A palette role re-declared (D-2026-10-20-08): a state rule may read
         * `var(--s-text)` and its seven kin as an opaque colour because
         * `themeVars` writes each as `rgb(r, g, b)` on the stall's root. A
         * rule that re-declares one on a descendant (`.item { --s-accent:
         * 300px solid red }`) re-points every reader below it, so the proof
         * held by `the-state-opaque-roles-are-the-opaque-colours-the-theme-table-emits`
         * would be about a value no reader gets. No served sheet declares one.
         */
        if (firstParty && STATE_OPAQUE_ROLES.includes(prop)) {
            out.push(`${shown} — ${prop} is a palette role the theme table writes on the stall; a state rule reads it as an opaque colour, which holds only while no sheet re-declares it`);
        }
        /*
         * A custom property that holds the ink of the box that reads it (the
         * fifth review's B2). `var()` is substituted as tokens, so wherever it
         * stands it can carry a comma and then a stop, a layer or a whole
         * value in `currentColor` into the box that reads it: a stop's place
         * (`#000 var(--x)` with `--x: 50%, currentColor`), the `mask` position
         * slot, the size after a `/`, a radial gradient's `at` and a conic
         * gradient's `from` or `in`. No read of the position a `var()` stands
         * in can tell, and the property is read by a rule this lint never
         * pairs with it. So in a first-party sheet no custom property holds
         * `currentColor` or `inherit` (anywhere in its value), and none is
         * `revert`, `revert-layer` or `unset` as its whole value (`unset` on a
         * custom property is `inherit`, which is inherited). That closes the
         * class the pseudo-element's mask reader left as a stated gap
         * (`c1:8`), backs up the pseudo-element reader's palette-role-only
         * rule for a colour, and closes the belt's `var(--s-…)` road (a state
         * rule accepts `var(--s-…)` as a colour with no look at what a sheet's
         * own property holds). No served sheet declares one (surveyed: the
         * shipped looks, the starters, the fixture look, the tracked private
         * fixture, the canary, the base and screen sheets). A rule under a
         * state is refused its custom properties by the belt on its own. The
         * kit keeps the rules its README states.
         */
        if (firstParty && prop.startsWith('--') && (selectors === undefined || !selectors.some(namesAState))) {
            const keyword = /(?<![\w-])(?:currentcolor|inherit)(?![\w-])/i.exec(bare);
            // `unset` on a custom property is `inherit`: a custom property is inherited, so it takes the parent's tokens (the sixth review's smaller item).
            const whole = /^(?:revert|revert-layer|unset)$/i.exec(value.replace(/\s*!\s*important\s*$/i, '').trim());
            if (keyword !== null || whole !== null) {
                out.push(
                    `${shown} — a custom property that holds ${keyword !== null ? keyword[0].toLowerCase() : whole[0].toLowerCase()}: a var() is substituted as tokens, so it brings the ink of the box that reads it (or the cascade's) into a stop, a layer or a value, wherever the var() stands`,
                );
            }
        }
        /*
         * The OS colour scheme (the fifth review's ranked item 3, older than this
         * branch). `light-dark(#000, transparent)` paints the first colour in
         * a light scheme and the second in a dark one, and system colours
         * (`Canvas`, `CanvasText`) flip the same way once `color-scheme`
         * lists `dark`; the probe paints one scheme only (the page's, light),
         * so a figure `light-dark()` leaves clear in a dark scheme is read by
         * no pass. In a first-party sheet `light-dark()` is not written, and
         * `color-scheme` is `normal` or `light`. None of the base sheets sets
         * a scheme (stall.css, window.css, broadcast.css, obsGuide.css) and no
         * served look sheet writes either, so the cost is nil. The kit keeps
         * the rules its README states.
         */
        if (firstParty && /(?<![\w-])light-dark\s*\(/i.test(bare)) {
            out.push(`${shown} — light-dark() paints one colour in a light colour scheme and another in a dark one, and the probe paints only the light one`);
        }
        if (firstParty && prop === 'color-scheme' && !/^(?:normal|light|initial)$/i.test(value.replace(/\s*!\s*important\s*$/i, '').trim())) {
            out.push(`${shown} — color-scheme other than normal or light lets the system colours (and light-dark()) paint a dark scheme the probe never paints`);
        }
        /*
         * `display`, `content-visibility` and `visibility` in a keyframe
         * (D-2026-10-20-10, the lint-belts critic's T2c; `visibility` added by
         * D-2026-10-20-13 (3), the critic's PT): a keyframe that sets one takes
         * a box out of the layout, leaves it unrendered or leaves it unseen for
         * part of a cycle, and the probe reads one frozen instant of an
         * animation, so a figure (or the card that holds it) a keyframe removes
         * for most of its time is measured while it is there. `@keyframes x {
         * 0%, 100% { display: none } }` run on a quote's `.item-a` is the first
         * plant; the second is `visibility: hidden` in a keyframe delayed 120s
         * and filled forwards, which the probe never reaches. The property is
         * read in capitals, with `!important`, inside a media block and when
         * the value is a `var()` (the property name decides, not the value). First party only:
         * the kit keeps the rules its README states.
         */
        if (firstParty && selectors === undefined && (prop === 'display' || prop === 'content-visibility' || prop === 'visibility')) {
            out.push(
                `${shown} — ${prop} in a keyframe takes a box (a money node, or the card that holds one) out of the layout, or leaves it unrendered or unseen, for part of a cycle, and the probe reads one frozen instant of it`,
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
        if (firstParty && prop === 'cursor') {
            const why = cursorProblem(clean);
            if (why !== undefined) out.push(`${shown} — ${why}`);
        }
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
         * `all` in a keyframe (the fourth review's smaller item): a stop that
         * re-states every property takes `display`, `opacity`, a clip and the
         * rest with it for part of a cycle, on a frame the probe reads one
         * instant of, and `all: inherit` or `all: unset` is allowed at rest
         * only because the cascade then shows it. No served sheet writes `all`
         * anywhere. A first-party rule; the kit keeps the rules its README states.
         */
        if (firstParty && selectors === undefined && prop === 'all') {
            out.push(`${shown} — all in a keyframe re-states every property (display, opacity, a clip, the paint) for part of a cycle, on a frame the probe reads one instant of`);
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
        // In a first-party sheet the twin is a property that exists (`PREFIXED_TWINS`): `mask-box-image` is no twin of `-webkit-mask-box-image`.
        const known = prefixed !== null && firstParty && Object.hasOwn(PREFIXED_TWINS, prop);
        if (known && PREFIXED_TWINS[prop] === null) {
            out.push(
                `${shown} — ${prop.slice(prefixed[0].length)} names no property Chrome reads, and ${prop} has no unprefixed twin there: it paints only in the engines that read the prefix, and this lint holds it to no twin`,
            );
        } else if (prefixed !== null) {
            const twin = known ? PREFIXED_TWINS[prop] : prop.slice(prefixed[0].length);
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
    // The keyframes this sheet declares: the only ones a first-party rule may run (`animationNameProblems`).
    const ownKeyframes = kit ? undefined : keyframeNamesOf(nodes);

    const walk = (list, nested = false) => {
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
                if (!kit) for (const why of stateBeltProblems(declarationsOf(node.body), selectors)) at(node.start, why);
                if (!kit) for (const why of pseudoHostPaintProblems(declarationsOf(node.body), selectors)) at(node.start, why);
                // The paints that reach past a box, and the outline's cap: on a rule that names no state (the belt
                // refuses most of them by name under one and bounds the rest), the colours on one with no
                // pseudo-element too (`pseudoHostPaintProblems` reads that rule's, by its own rules: see `pastTheBoxProblems`).
                if (!kit && !selectors.some(namesAState)) {
                    for (const why of outlineCapProblems(declarationsOf(node.body))) at(node.start, why);
                    for (const why of inkReachProblems(declarationsOf(node.body))) at(node.start, why);
                    for (const why of blurCapProblems(declarationsOf(node.body))) at(node.start, why);
                    for (const why of animationNameProblems(declarationsOf(node.body), ownKeyframes)) at(node.start, why);
                    if (!selectors.some(isPseudoElementSelector)) {
                        for (const why of pastTheBoxProblems(declarationsOf(node.body))) at(node.start, why);
                    }
                }
                continue;
            }
            if (node.name === 'keyframes') {
                const name = node.prelude.replace(/^@keyframes\s*/i, '').trim();
                if (kit && !/^wk-[\w-]+$/.test(name)) {
                    at(node.start, `@keyframes "${echo(name)}" must be named wk-… (keyframes are global)`);
                }
                // The sixth review's M2: inside a media block a keyframe applies only while the condition does, below it a base sheet's keyframe of the same name runs.
                if (nested && !kit) {
                    at(
                        node.start,
                        `@keyframes "${echo(name)}" stands inside another at-rule — a keyframe applies only while the condition does, and below it a base sheet's keyframe of the same name is the one a rule runs (write it at the top level of the sheet)`,
                    );
                }
                const stopErrors = [];
                const sizeMotionSaid = new Set();
                for (const stop of parseList(node.body ?? '', 0, (node.body ?? '').length, stopErrors)) {
                    if (stop.kind === 'rule') {
                        for (const why of declarationProblems(declarationsOf(stop.body), undefined, { firstParty: !kit })) at(node.start, why);
                        for (const why of fontProblems(declarationsOf(stop.body), ownFamilies)) at(node.start, why);
                        if (!kit) {
                            for (const why of outlineCapProblems(declarationsOf(stop.body))) at(node.start, why);
                            for (const why of inkReachProblems(declarationsOf(stop.body))) at(node.start, why);
                            for (const why of blurCapProblems(declarationsOf(stop.body))) at(node.start, why);
                            for (const why of pastTheBoxProblems(declarationsOf(stop.body))) at(node.start, why);
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
                walk(node.children ?? [], true);
            } else {
                const why = Object.hasOwn(REFUSED_AT_RULES, node.name)
                    ? REFUSED_AT_RULES[node.name]
                    : `@${echo(node.name)} is not allowed in a look sheet — @media and @keyframes are`;
                at(node.start, node.name === 'container' && /style\s*\(/i.test(node.prelude) ? `${why} (here: style())` : why);
                walk(node.children ?? [], true);
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
 * (`a-look-never-animates-a-money-nodes-size`); and a rule under a state the
 * probe never paints (any pseudo-class but the sixteen structural ones, which
 * is `:hover`, `:focus`, `:placeholder-shown` and every other; `[open]`,
 * `[hidden]`, `[data-turn]`, `[data-state]`, `[aria-disabled]` and
 * `[data-over]`) sets only colour, ground, border and outline
 * colour, a bounded shadow, a keyword cursor, transitions and the no-transform
 * values — every other declaration is refused by name, and a palette role may
 * not be re-declared (`a-look-state-rule-sets-only-what-a-state-may`); a
 * pseudo-element takes its paint from neither its host nor the cascade at rest
 * (`a-pseudo-element-paints-its-own-ground-and-ink`: a colour for each family
 * and side, no `revert`, `revert-layer` or `all`, masks read, a `var()` only
 * as a palette role where it stands as a colour or as a mask's picture, never
 * where it is a length); an outer shadow, a text shadow, a drop shadow, an
 * outline, a column rule and a border image name their own colour at rest
 * (`a-paint-past-its-box-names-its-own-colour`); an outline is at most 4px
 * wide and sits from -8px to 4px (`an-outline-is-capped-per-longhand`); an
 * underline sits within 4px of its line and is at most 3px thick, a stroke is
 * at most 3 wide and `d` is not written
 * (`a-line-and-a-stroke-are-capped-per-declaration`); no custom property
 * holds `currentColor` or `inherit` (`no-custom-property-holds-the-ink`); a
 * rule runs only `none` or a keyframe its own sheet declares
 * (`a-rule-runs-only-the-keyframes-its-own-sheet-declares`); no
 * `light-dark()` and no `color-scheme` but `normal` or `light`; no cursor but
 * a keyword; no `display`, `content-visibility`, `visibility` or `all` in a
 * keyframe; and no tap highlight but transparent anywhere. First party only:
 * the kit lint carries none of these (bar one fix of a hole on main).
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
            if (node.name === 'keyframes') keyframes.push(unquoted(node.prelude.replace(/^@keyframes\s*/i, '').trim()));
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

/** A keyframes name or an `animation-name` as written, without its quotes: `"ease"` and `ease` name one keyframes. */
function unquoted(name) {
    return name.replace(/^(["'])([\s\S]*)\1$/, '$2');
}

/**
 * One single animation of an `animation` shorthand, as `{ name, seconds,
 * iterations, alternate }`: `seconds` is undefined when this reader cannot
 * tell it and null when the shorthand gives none (0s, which shows nothing).
 * A value it cannot read counts as an endless one.
 *
 * **A keyword goes to the first property that can take it, and to the name
 * once that property has its value** (CSS Animations: "keywords that are
 * valid for properties other than animation-name whose values were not found
 * earlier in the shorthand must be accepted for those properties rather than
 * for animation-name"), so `animation: ease 1s ease` and `animation: forwards
 * 1s forwards` run keyframes named `ease` and `forwards` — which the first
 * version of this reader skipped as timing and fill words, losing the name
 * (the lint-belts critic's P2-5), and a keyframe so named flashed unseen. A
 * quoted string is always the name.
 */
function parseSingleAnimation(text) {
    let name;
    let seconds = null;
    let times = 0;
    let iterations = 1;
    let alternate = false;
    const taken = new Set();
    /** Whether the property `slot` takes this keyword: it does once, and the name takes the second. */
    const claim = (slot) => {
        if (taken.has(slot)) return false;
        taken.add(slot);
        return true;
    };
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
        if (/^["']/.test(token)) {
            if (name === undefined || name === UNKNOWN) name = unquoted(token);
            continue;
        }
        if (lower === 'infinite' && claim('count')) {
            iterations = Infinity;
        } else if (/^[+-]?(?:\d*\.)?\d+$/.test(lower) && claim('count')) {
            iterations = Number(lower);
        } else if (DIRECTION_WORDS.has(lower) && claim('direction')) {
            alternate = alternate || lower.startsWith('alternate');
        } else if ((TIMING_WORDS.has(lower) || /^(steps|cubic-bezier|linear)\(/.test(lower)) && claim('timing')) {
            continue;
        } else if (FILL_WORDS.has(lower) && claim('fill')) {
            continue;
        } else if (PLAY_WORDS.has(lower) && claim('play')) {
            continue;
        } else if (GLOBAL_WORDS.has(lower) || lower === 'none' || /^(steps|cubic-bezier|linear)\(/.test(lower)) {
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
                    const name = unquoted(node.prelude.replace(/^@keyframes\s*/i, '').trim());
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
                    else if (one.toLowerCase() !== 'none' && !GLOBAL_WORDS.has(one.toLowerCase())) named.add(unquoted(one));
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
