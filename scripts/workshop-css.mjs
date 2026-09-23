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
 * Tests: `scripts/workshop-lint.test.mjs` (node --test, in `pnpm test`), and
 * `the-starter-is-each-shipped-look-rescoped` over the real shipped sheets.
 */

/** The class every rule of a kit sheet is scoped under. */
export const KIT_CLASS = 't-workshop';

/** At-rules whose block is a list of rules. */
const GROUPING = new Set(['media', 'supports', 'container']);

const REDUCE_PRELUDE = /^@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)$/i;

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
                errors.push({ at: start, message: `"${prelude.slice(0, 40)}" is not inside a rule` });
            }
            i = j < to && text[j] === ';' ? j + 1 : j;
            continue;
        }
        const close = closingBrace(text, j, to);
        if (close < 0) {
            errors.push({ at: start, message: `the block of "${prelude.slice(0, 40)}" is never closed` });
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

const KIT_CLASS_RE = new RegExp(`\\.${KIT_CLASS}(?![\\w-])`);

/**
 * Why one selector escapes `.t-workshop`, or undefined when it is scoped.
 *
 * Scoped means a compound selector at the top level carries the class — not
 * inside `:not()`, `:is()` or `:has()`, which can match elsewhere — and the
 * combinator straight after it is a descendant or a child one, or there is
 * none. `.t-workshop + .x` reaches a sibling of the stall; `.t-workshop .a +
 * .b` stays inside it.
 */
export function selectorEscape(selector) {
    const parts = flatten(selector).trim().split(/\s*([>+~])\s*|\s+/);
    for (let k = 0; k < parts.length; k += 2) {
        if (parts[k] !== undefined && KIT_CLASS_RE.test(parts[k])) {
            const next = parts[k + 1];
            if (next === '+' || next === '~') {
                return `"${selector}" reaches a sibling of .${KIT_CLASS} (${next})`;
            }
            return undefined;
        }
    }
    return `"${selector}" is not under .${KIT_CLASS}`;
}

/** Why a `url()` or `image-set()` target may not be in a look sheet, or undefined. */
export function urlProblem(target) {
    const value = target.trim();
    if (value.includes('\\')) return 'an escaped URL';
    if (/^data:/i.test(value)) return 'a data: URL — art goes in workshop/art/ as a file';
    if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return 'a URL with a scheme — nothing loads from another site';
    if (value.startsWith('//')) return 'a URL to another site';
    if (value.startsWith('/')) return 'an absolute path — use a path relative to the sheet';
    if (value === '') return 'an empty URL';
    return undefined;
}

/** Every `url(…)` and `image-set(…)` string target in the text, with its index. */
function urlTargets(text) {
    const out = [];
    const urlRe = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*?))\s*\)/gi;
    for (const m of text.matchAll(urlRe)) {
        out.push({ at: m.index, value: m[1] ?? m[2] ?? m[3] ?? '' });
    }
    const setRe = /image-set\(/gi;
    for (const m of text.matchAll(setRe)) {
        let depth = 0;
        let i = m.index + m[0].length - 1;
        const open = i;
        for (; i < text.length; i += 1) {
            if (text[i] === '(') depth += 1;
            if (text[i] === ')') {
                depth -= 1;
                if (depth === 0) break;
            }
        }
        const inner = text.slice(open + 1, i);
        for (const s of inner.matchAll(/"([^"]*)"|'([^']*)'/g)) {
            out.push({ at: m.index, value: s[1] ?? s[2] ?? '' });
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

/**
 * The kit's static rules over one sheet, as a list of sentences with line
 * numbers — empty when the sheet passes.
 *
 * 1. Every selector is under `.t-workshop` (at-rule wrappers allowed).
 * 2. No `@import`, no `@font-face`, and no at-rule but `@media`, `@supports`,
 *    `@container` and `@keyframes`.
 * 3. No `url(data:…)`, no `url()` with a scheme or to another site, no
 *    absolute path — art is a relative file — and no CSS escape outside a
 *    string, which is how a `url(` or a scheme would hide from rule 3.
 * 4. Every `@keyframes` is named `wk-…`: keyframes are global, and a look
 *    must never replace one of Stall's.
 * 5. The last rule of the sheet is `@media (prefers-reduced-motion: reduce)`,
 *    so a mover can never be declared after the block that stills it.
 */
export function lintSheet(css) {
    const { text, nodes, errors } = parseSheet(css);
    const problems = errors.map((e) => `line ${lineOf(text, e.at)}: ${e.message}`);
    const at = (index, message) => problems.push(`line ${lineOf(text, index)}: ${message}`);

    const walk = (list) => {
        for (const node of list) {
            if (node.kind === 'rule') {
                if (braceOutsideStrings(node.body)) {
                    at(node.start, `"${node.prelude}" holds a nested rule — write it flat, under .${KIT_CLASS}`);
                }
                for (const selector of splitTopLevel(node.prelude, ',')) {
                    const escape = selectorEscape(selector);
                    if (escape !== undefined) at(node.start, escape);
                }
                continue;
            }
            if (node.name === 'import') {
                at(node.start, '@import is not allowed — a look sheet is one file');
            } else if (node.name === 'font-face') {
                at(node.start, '@font-face is not allowed — a look uses one of the shipped font stacks');
            } else if (node.name === 'keyframes') {
                const name = node.prelude.replace(/^@keyframes\s*/i, '').trim();
                if (!/^wk-[\w-]+$/.test(name)) {
                    at(node.start, `@keyframes "${name}" must be named wk-… (keyframes are global)`);
                }
            } else if (GROUPING.has(node.name)) {
                walk(node.children ?? []);
            } else {
                at(node.start, `@${node.name} is not allowed in a look sheet`);
            }
        }
    };
    walk(nodes);

    for (const target of urlTargets(text)) {
        const why = urlProblem(target.value);
        if (why !== undefined) at(target.at, `url "${target.value}": ${why}`);
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
        if (value === '' || urlProblem(value) !== undefined || value.startsWith('#')) {
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
