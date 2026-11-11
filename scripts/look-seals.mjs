/**
 * A private look's seal, pinned by hash, and where it may paint (step 8g6;
 * STEP-8G-PLAN §4.3). `LOOK_SEALS` (`scripts/private-looks.mjs`) names, by a
 * look's class, the one art file that names the look as artwork and the
 * SHA-256 of its served bytes. Two readers over the served sheets
 * (`scripts/served-sheets.mjs`), tested in `scripts/look-seals.test.mjs`:
 *
 * - **`sealProblems`** (`the-seal-is-the-pinned-seal`): every private look a
 *   run reads whose class `LOOK_SEALS` names carries `art/<file>`, and its
 *   served bytes hash to the literal; the classes no run read are returned
 *   apart, for the test to say on stderr.
 * - **`sealPlacementProblems`** (`the-seal-paints-only-under-its-own-look`):
 *   a file that is a pinned seal — the pinned file of its look by name, or
 *   any file whose served or raw bytes hash to a pin — is named by `url()`
 *   (or an `image-set()` entry: `urlTargets`, the lint's own reader) only
 *   in its own look's sheet, only in a rule every selector of which is on
 *   the sign (`SEAL_SUBJECTS`), never in a rule naming an `att-` class (a
 *   decoration), never in a custom property, never inside an at-rule that
 *   is not `@media`, `@supports` or `@container` (a keyframe, a face); and
 *   no other sheet — shipped, screen, kit, harness fixture, another private
 *   look — names such a file, nor does another private look hold one.
 * - **`brandOnSignProblems`**: no rule on the page's or the wall's sign
 *   names a file whose bytes are one of Stall's own brand marks
 *   (`the-sellers-sign-carries-no-brand-mark`, `src/ui/render.test.ts`).
 *
 * **Stated limit**: the pin holds the seal file. It cannot judge any other
 * picture a look's sheet paints on the sign; that stays the private review's
 * and step 9's release diff's.
 *
 * Node built-ins and this repository's readers; a `.d.mts` beside it.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { LOOK_SEALS } from './private-looks.mjs';
import { ROOT } from './served-sheets.mjs';
import { sanitizeSvg } from './svg-allow.mjs';
import { declarationsOf, decodeEscapes, parseSheet, splitTopLevel, urlTargets } from './workshop-css.mjs';

/**
 * **The sign's subjects**: the boxes a rule naming a seal may have as its
 * subject, each only as its `::before` or `::after` (or the one-colon
 * `:before`, `:after`): the seal is generated paint on the sign, never the
 * sign's own box (a mask there would mask the seller's name) and never a
 * line inside it.
 *
 * - `stall-head`, `stall-sign`, `stall-headings`: the sign `header()`
 *   builds (`src/ui/render.ts`), on every page screen and on the wall,
 *   which builds the same sign (`src/ui/window.ts`);
 * - `bc-head`: the stream overlay's head plate (`renderBroadcastView`,
 *   `src/ui/broadcast.ts`);
 * - `tk-lab`: the ticker's flag (`renderTicker`), the overlay's other head.
 *
 * **Never beside Stall's brand word** (D-2026-11-11-16): the plate's and
 * the flag's first rows, `bc-brand` and `tk-brand`, carry `BROADCAST_BRAND`,
 * and a look's seal there would read as Stall's own stamp — so a rule whose
 * subject names one is refused with that sentence (`BRAND_ROWS`), even
 * where the subject also names a box of the sign.
 *
 * The subject is the last compound of each selector, read with every
 * escape decoded and everything inside parentheses blanked, so a class
 * inside `:not()`, `:is()` or `:has()` does not make it one.
 */
export const SEAL_SUBJECTS = Object.freeze([
    Object.freeze({ cls: 'stall-head', where: "the sign's header, on a page screen and on the wall" }),
    Object.freeze({ cls: 'stall-sign', where: "the sign's panel, on a page screen and on the wall" }),
    Object.freeze({ cls: 'stall-headings', where: "the sign's headings, on a page screen and on the wall" }),
    Object.freeze({ cls: 'bc-head', where: "the stream overlay's head plate" }),
    Object.freeze({ cls: 'tk-lab', where: "the ticker's flag" }),
]);

/** The overlay's rows that carry Stall's brand word, where no look's seal may stand (D-2026-11-11-16). */
export const BRAND_ROWS = Object.freeze(['bc-brand', 'tk-brand']);

/** The page's and the wall's sign, where no brand mark paints: the boxes and lines `header()` builds. */
export const SIGN_CLASSES = Object.freeze(['stall-head', 'stall-sign', 'stall-headings', 'stall-name', 'stall-tagline', 'stall-sub', 'sign-lamp']);

/** Stall's own brand marks, from this checkout's root: the mark the door paints, the stream page's, and the icons. */
export const BRAND_FILES = Object.freeze([
    'src/ui/logo-mark.png',
    'public/stream-logo.png',
    'public/apple-touch-icon.png',
    'public/favicon.ico',
    'public/favicon-16.png',
    'public/favicon-32.png',
    'public/favicon-48.png',
    'public/favicon-96.png',
    'public/favicon-144.png',
]);

/** The SHA-256 of `bytes`, lower-case hex. */
export function sha256(bytes) {
    return createHash('sha256').update(bytes).digest('hex');
}

/** The served bytes of a file named `name`: an SVG's re-serialisation (undefined when the build would refuse it), anything else as it is. */
export function servedBytes(name, bytes) {
    if (!name.endsWith('.svg')) {
        return bytes;
    }
    const { svg } = sanitizeSvg(Buffer.from(bytes).toString('utf8'));
    return svg === undefined ? undefined : Buffer.from(svg, 'utf8');
}

/** Every hash a file might be matched under: its raw bytes and, for an SVG, its served ones. */
function hashesOf(name, bytes) {
    const out = new Set([sha256(bytes)]);
    const served = servedBytes(name, bytes);
    if (served !== undefined) {
        out.add(sha256(served));
    }
    return out;
}

/** Everything inside parentheses, brackets and strings blanked (to `_`, never a space, which would split a compound), so a top-level read sees the compound's own tokens. */
function flatten(text) {
    let out = '';
    let depth = 0;
    let quote;
    for (const c of text) {
        if (quote !== undefined) {
            out += '_';
            if (c === quote) quote = undefined;
            continue;
        }
        if (c === '"' || c === "'") {
            quote = c;
            out += '_';
            continue;
        }
        if (c === '(' || c === '[') {
            out += depth === 0 ? c : '_';
            depth += 1;
            continue;
        }
        if (c === ')' || c === ']') {
            depth = Math.max(0, depth - 1);
            out += depth === 0 ? c : '_';
            continue;
        }
        out += depth > 0 ? '_' : c;
    }
    return out;
}

/** The last compound of a selector (flattened), split at its top-level combinators. */
function subjectOf(selector) {
    const flat = flatten(selector).trim();
    const parts = flat.split(/\s*[>+~]\s*|\s+/).filter((part) => part !== '');
    return parts[parts.length - 1] ?? '';
}

/** The classes a compound names at its top level. */
function classesOf(compound) {
    return [...compound.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1]);
}

/**
 * Why `selector` is not on the sign as a seal's rule may be, or undefined:
 * it names an `att-` class anywhere, its subject is not a `::before` or
 * `::after`, or its subject names none of `SEAL_SUBJECTS`.
 */
export function sealSubjectProblem(selector) {
    const text = decodeEscapes(selector);
    if (/(?:^|[^\w-])att-/.test(text)) {
        return `"${text}" names a decoration's class (att-…), and a seal is never on a decoration`;
    }
    const subject = subjectOf(text);
    if (!/(?:^|[^:]):{1,2}(?:before|after)$/i.test(subject)) {
        return `"${text}" has no ::before or ::after as its subject: a seal is generated paint on the sign, never a box or a line of it`;
    }
    const named = classesOf(subject.replace(/:{1,2}(?:before|after)$/i, ''));
    const brandRow = named.find((cls) => BRAND_ROWS.includes(cls));
    if (brandRow !== undefined) {
        return `"${text}" puts the seal on .${brandRow}, beside Stall's brand word, where a look's seal would read as Stall's own stamp`;
    }
    if (!named.some((cls) => SEAL_SUBJECTS.some((s) => s.cls === cls))) {
        return `"${text}" does not have the sign as its subject (${SEAL_SUBJECTS.map((s) => `.${s.cls}`).join(', ')})`;
    }
    return undefined;
}

/**
 * Every `url()` / `image-set()` target of a sheet, each with what holds it:
 * `{ value, selectors, inProperty, at }` — `selectors` the rule's selector
 * list, `inProperty` the declaration's property, `at` the enclosing at-rule
 * that is not a grouping one (a keyframe, a face), when there is one.
 */
export function sheetTargets(css) {
    const out = [];
    const walk = (nodes, at) => {
        for (const node of nodes) {
            if (node.kind === 'rule') {
                const selectors = splitTopLevel(node.prelude, ',');
                for (const { prop, value } of declarationsOf(node.body)) {
                    for (const target of urlTargets(value)) {
                        out.push({ value: target.value, selectors, inProperty: prop, at });
                    }
                }
            } else if (node.children !== undefined) {
                walk(node.children, at);
            } else if (node.body !== undefined) {
                const inner = parseSheet(node.body);
                const before = out.length;
                walk(inner.nodes, at ?? `@${node.name}`);
                if (out.length === before) {
                    // A face's or a counter's descriptors are declarations, not rules.
                    for (const target of urlTargets(node.body)) {
                        out.push({ value: target.value, selectors: [], inProperty: undefined, at: at ?? `@${node.name}` });
                    }
                }
            }
        }
    };
    walk(parseSheet(css).nodes, undefined);
    return out;
}

/** The art file of a private look a target names (`art/<name>` or `./art/<name>`), or undefined. */
function privateArtOf(row, value) {
    const m = /^(?:\.\/)?art\/([^/?#]+)$/.exec(decodeEscapes(value).trim());
    if (m === null) {
        return undefined;
    }
    return row.look.art.find((file) => file.name === m[1]);
}

/** The bytes a public sheet's target resolves to on the disk under `root`, with its name, or undefined. */
function publicFileOf(root, sheetPath, value) {
    const target = decodeEscapes(value).trim().replace(/[?#].*$/, '');
    if (target === '' || /^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('//')) {
        return undefined;
    }
    const path = target.startsWith('/') ? join(root, 'public', target) : join(root, dirname(sheetPath), target);
    const inside = normalize(path);
    if (!inside.startsWith(normalize(root)) || !existsSync(inside) || !statSync(inside).isFile()) {
        return undefined;
    }
    return { name: inside, bytes: readFileSync(inside) };
}

/**
 * The private looks a run reads that `seals` names, checked: `problems`
 * (a named look with no such file, or one whose served bytes are another
 * file's), `read` (the classes checked) and `unread` (the classes no row
 * carried, for the caller to say).
 */
export function sealProblems(sheets, seals = LOOK_SEALS) {
    const problems = [];
    const read = [];
    for (const row of sheets) {
        if (row.role !== 'private' || !Object.hasOwn(seals, row.lookClass)) {
            continue;
        }
        const { file, sha256: pinned } = seals[row.lookClass];
        read.push(row.lookClass);
        const at = row.look.art.find((art) => art.name === file);
        if (at === undefined) {
            problems.push(`${row.lookClass} (${row.look.source} @${row.look.commit.slice(0, 12)}) carries no art/${file}, and LOOK_SEALS pins one`);
            continue;
        }
        const served = servedBytes(file, at.bytes);
        if (served === undefined) {
            problems.push(`${row.artDir}/${file}: the build would refuse it (svg-allow), so it serves nothing the pin can match`);
            continue;
        }
        const got = sha256(served);
        if (got !== pinned) {
            problems.push(`${row.artDir}/${file}: its served bytes hash to ${got}, and LOOK_SEALS pins ${pinned} for ${row.lookClass}`);
        }
    }
    const unread = Object.keys(seals).filter((cls) => !read.includes(cls));
    return { problems, read, unread };
}

/**
 * Where a pinned seal is named, and why each place it may not be: see the
 * module's docblock. `readPublic(sheetPath, target)` resolves a public
 * sheet's target to `{ name, bytes }` (the disk under `root` by default).
 * `uses` counts the seal's places that passed, so a caller can hold the
 * scan to having seen one.
 */
export function sealPlacementProblems(sheets, { seals = LOOK_SEALS, root = ROOT, readPublic } = {}) {
    const resolvePublic = readPublic ?? ((sheetPath, value) => publicFileOf(root, sheetPath, value));
    const pinned = new Map(Object.entries(seals).map(([cls, seal]) => [seal.sha256, cls]));
    const problems = [];
    let uses = 0;
    const sealOf = (name, bytes) => {
        for (const hash of hashesOf(name, bytes)) {
            if (pinned.has(hash)) return pinned.get(hash);
        }
        return undefined;
    };
    for (const row of sheets) {
        const own = row.role === 'private' && Object.hasOwn(seals, row.lookClass) ? row.lookClass : undefined;
        for (const target of sheetTargets(row.css)) {
            let file;
            let isOwnSeal = false;
            if (row.role === 'private') {
                file = privateArtOf(row, target.value);
                if (file !== undefined && own !== undefined && file.name === seals[own].file) {
                    isOwnSeal = true;
                }
            } else {
                file = resolvePublic(row.path, target.value);
            }
            const sealCls = isOwnSeal ? own : file === undefined ? undefined : sealOf(file.name, file.bytes);
            if (sealCls === undefined) {
                continue;
            }
            const where = `${row.path}: url(${target.value})`;
            if (sealCls !== own) {
                problems.push(`${where} names ${sealCls}'s seal, which only ${sealCls}'s own sheet may paint`);
                continue;
            }
            const why = [];
            if (target.at !== undefined) {
                why.push(`it stands inside ${target.at}, not in a rule on the sign`);
            }
            if (target.inProperty !== undefined && target.inProperty.startsWith('--')) {
                why.push(`it is held in the custom property ${target.inProperty}, which can carry it off the sign`);
            }
            if (target.at === undefined && target.selectors.length === 0) {
                why.push('it is in no rule');
            }
            for (const selector of target.selectors) {
                const problem = sealSubjectProblem(selector);
                if (problem !== undefined) why.push(problem);
            }
            if (why.length > 0) {
                problems.push(`${where}: ${why.join('; ')}`);
            } else {
                uses += 1;
            }
        }
        if (row.role === 'private') {
            for (const file of row.look.art) {
                const sealCls = sealOf(file.name, file.bytes);
                if (sealCls !== undefined && sealCls !== row.lookClass) {
                    problems.push(`${row.artDir}/${file.name} is ${sealCls}'s seal, held by ${row.lookClass}, which may not carry another look's seal`);
                }
            }
        }
    }
    return { problems, uses };
}

/**
 * No rule whose selector names the page's or the wall's sign
 * (`SIGN_CLASSES`, anywhere at its top level, with any subject) names a
 * file whose bytes are one of Stall's brand marks (`brand`: hashes, from
 * `BRAND_FILES` by default).
 */
export function brandOnSignProblems(sheets, { root = ROOT, brand, readPublic } = {}) {
    const marks = brand ?? new Set(BRAND_FILES.map((path) => sha256(readFileSync(join(root, path)))));
    const resolvePublic = readPublic ?? ((sheetPath, value) => publicFileOf(root, sheetPath, value));
    const problems = [];
    for (const row of sheets) {
        for (const target of sheetTargets(row.css)) {
            const file = row.role === 'private' ? privateArtOf(row, target.value) : resolvePublic(row.path, target.value);
            if (file === undefined || !marks.has(sha256(file.bytes))) {
                continue;
            }
            const onSign = target.selectors.filter((selector) =>
                flatten(decodeEscapes(selector))
                    .split(/\s*[>+~]\s*|\s+/)
                    .some((compound) => classesOf(compound).some((cls) => SIGN_CLASSES.includes(cls))),
            );
            if (onSign.length > 0) {
                problems.push(`${row.path}: url(${target.value}) paints Stall's brand mark on the seller's sign (${onSign.join(', ')})`);
            }
        }
    }
    return problems;
}
