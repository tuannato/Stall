/**
 * A private look's guard file (step 8i): `<slug>/guard.json`, the reasons
 * the decor gate reads for the look's decorations — what the shipped rows'
 * reasons are in public tables (`FOLLOWS`, `ART_UNDER_A_MOOD`,
 * `DECORATION_ART` in `src/ui/decor-gate.test.ts`, `MOVING_DECORATIONS` in
 * `layout/movingDecor.ts`). A private row's class says something about its
 * design, so its reasons live in its own repository, and the public tests
 * read them there.
 *
 * **Read by tests alone**, never by the build or the app: it is no file of
 * the bundle, and `look.json`, which every visitor of a deploy build
 * downloads as text and whose runtime validator refuses an unknown field,
 * stays as it is (`fonts.json` left `look.json` for the same reason,
 * `scripts/look-faces.mjs`). A private look repository may hold it
 * (`PRIVATE_LOOK_FILES`, `scripts/private-looks.mjs`); a look with none is
 * judged in the one shape that needs no reason
 * (`a-private-row-the-gate-cannot-judge-is-refused`).
 *
 * The shape:
 *
 *     { "rows": { "<cls>": { "follows": "palette" | "art",
 *                            "underMood"?: "<reason>",
 *                            "moving"?: { "reader": "<rule or test name>", "how": "<reason>" }
 *                                     | { "reason": "<reason>" } } },
 *       "art":  { "<selector> | <property>": "<reason>" } }
 *
 * **Read whole, or not at all** (`parseGuard`, test
 * `a-private-guard-file-is-read-whole`): a file that is not JSON, an unknown
 * field, a row class that is not one of the look's decorations, a decoration
 * with no entry, an entry with no `follows`, a reason of 40 characters or
 * fewer, a `moving` on a row that does not move or none on one that does,
 * and an `underMood` beside a row that draws no art each refuse the whole
 * file, so nothing downstream reads half of one — a look whose file is
 * refused has its rows judged as if it had none, which is the stricter
 * shape. The narrow art key (`guardArtKeyProblem`,
 * `a-private-decoration-art-key-names-its-own-box`) is the gate's own read
 * of each `art` entry, beside it.
 *
 * Node built-ins only; a `.d.mts` beside it. Pure.
 */

/** The file, in a look's directory. */
export const LOOK_GUARD_FILE = 'guard.json';

/** Where a row's colours come from, as `FOLLOWS` says it of a shipped row. */
export const GUARD_FOLLOWS = Object.freeze(['palette', 'art']);

/** A reason is written, not a placeholder: more than this many characters, as the shipped tables' reasons are. */
export const GUARD_REASON_MIN_CHARS = 41;

/** The app's own structure a narrow art key may pass through between the root and the row's box. */
export const GUARD_STRUCTURE_CLASSES = Object.freeze(['stall-scroll', 'stall-head', 'stall-sign', 'stall-headings']);

/** The properties a guard's art key may exempt: a ground, never a ring, a slab or a shadow. */
export const GUARD_ART_PROPS = Object.freeze(['background-image', 'background-color']);

/** A reader's name: a test or a rule name, lower-case words joined by hyphens. */
const READER_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)+$/;

const isPlainObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

const quote = (value) => JSON.stringify(String(value).slice(0, 80));

/** A reason's problem, or undefined: a string of more than 40 characters. */
function reasonProblem(value, what) {
    if (typeof value !== 'string') return `${what} is not a string`;
    if ([...value.trim()].length < GUARD_REASON_MIN_CHARS) return `${what} is ${[...value.trim()].length} characters, where a reason is more than ${GUARD_REASON_MIN_CHARS - 1}`;
    return undefined;
}

/**
 * The decorations of a parsed `look.json` the guard speaks for: every row
 * under `decorations` with a class (a mood is the look's own palette and its
 * class is held by `a-mood-class-is-look-scoped`, never by a guard), as
 * `{ cls, paint, motion, mount }`.
 */
export function guardedDecorations(look) {
    const rows = isPlainObject(look) && Array.isArray(look.decorations) ? look.decorations : [];
    return rows
        .filter((row) => isPlainObject(row) && typeof row.cls === 'string')
        .map((row) => ({ cls: row.cls, paint: row.paint, motion: row.motion === true, mount: row.mount }));
}

/**
 * The guard file `text`, read for the look whose parsed `look.json` is
 * `look`: `{ guard, problems }`, `guard` undefined whenever a problem was
 * found (refused whole), and `{ rows, art }` otherwise.
 */
export function parseGuard(text, look) {
    let json;
    try {
        json = JSON.parse(text);
    } catch (error) {
        return { guard: undefined, problems: [`${LOOK_GUARD_FILE}: not JSON (${error.message})`] };
    }
    if (!isPlainObject(json)) {
        return { guard: undefined, problems: [`${LOOK_GUARD_FILE}: not an object`] };
    }
    const problems = [];
    for (const key of Object.keys(json)) {
        if (key !== 'rows' && key !== 'art') problems.push(`${LOOK_GUARD_FILE}: an unknown field ${quote(key)}`);
    }
    if (!isPlainObject(json.rows)) problems.push(`${LOOK_GUARD_FILE}: rows is not an object`);
    if (!isPlainObject(json.art)) problems.push(`${LOOK_GUARD_FILE}: art is not an object`);
    if (problems.length > 0) return { guard: undefined, problems };

    const decorations = guardedDecorations(look);
    const byClass = new Map(decorations.map((row) => [row.cls, row]));
    for (const [cls, entry] of Object.entries(json.rows)) {
        const where = `${LOOK_GUARD_FILE}: rows[${quote(cls)}]`;
        const row = byClass.get(cls);
        if (row === undefined) {
            problems.push(`${where}: not one of the look's decorations`);
            continue;
        }
        if (!isPlainObject(entry)) {
            problems.push(`${where}: not an object`);
            continue;
        }
        for (const key of Object.keys(entry)) {
            if (key !== 'follows' && key !== 'underMood' && key !== 'moving') problems.push(`${where}: an unknown field ${quote(key)}`);
        }
        if (!GUARD_FOLLOWS.includes(entry.follows)) {
            problems.push(`${where}.follows: one of ${GUARD_FOLLOWS.join(', ')}, where it is ${quote(entry.follows)}`);
        }
        if (Object.hasOwn(entry, 'underMood')) {
            const why = reasonProblem(entry.underMood, `${where}.underMood`);
            if (why !== undefined) problems.push(why);
            if (entry.follows !== 'art') problems.push(`${where}.underMood: an exemption for art under a mood, on a row that says it draws none`);
        }
        if (Object.hasOwn(entry, 'moving')) {
            const moving = entry.moving;
            if (!row.motion) {
                problems.push(`${where}.moving: the row does not move (its look.json says motion: false)`);
            } else if (!isPlainObject(moving)) {
                problems.push(`${where}.moving: not an object`);
            } else if (Object.hasOwn(moving, 'reader')) {
                for (const key of Object.keys(moving)) {
                    if (key !== 'reader' && key !== 'how') problems.push(`${where}.moving: an unknown field ${quote(key)} beside a reader`);
                }
                if (typeof moving.reader !== 'string' || !READER_NAME.test(moving.reader)) problems.push(`${where}.moving.reader: a rule or test name, lower-case words joined by hyphens`);
                const why = reasonProblem(moving.how, `${where}.moving.how`);
                if (why !== undefined) problems.push(why);
            } else {
                for (const key of Object.keys(moving)) {
                    if (key !== 'reason') problems.push(`${where}.moving: an unknown field ${quote(key)} beside a reason`);
                }
                const why = reasonProblem(moving.reason, `${where}.moving.reason`);
                if (why !== undefined) problems.push(why);
            }
        } else if (row.motion) {
            problems.push(`${where}: the row moves (its look.json says motion: true), and its entry carries no moving reader or reason`);
        }
    }
    for (const row of decorations) {
        if (!Object.hasOwn(json.rows, row.cls)) problems.push(`${LOOK_GUARD_FILE}: no entry for the look's decoration ${quote(row.cls)}`);
    }
    for (const [key, why] of Object.entries(json.art)) {
        const where = `${LOOK_GUARD_FILE}: art[${quote(key)}]`;
        const at = key.lastIndexOf(' | ');
        if (at <= 0 || !/^-?[a-z][a-z-]*$/.test(key.slice(at + 3)) || key !== key.replace(/\s+/g, ' ').trim()) {
            problems.push(`${where}: a key is "<selector> | <property>", the selector's whitespace folded to single spaces`);
        }
        const reason = reasonProblem(why, `${where}'s reason`);
        if (reason !== undefined) problems.push(reason);
    }
    if (problems.length > 0) return { guard: undefined, problems };
    return { guard: Object.freeze({ rows: json.rows, art: json.art }), problems: [] };
}

/** `text` split at top-level characters `sep` admits (no parenthesis, bracket or string open), the separators kept as their own items. */
function splitKeep(text, sep) {
    const out = [];
    let depth = 0;
    let quoteCh = '';
    let cur = '';
    for (const ch of text) {
        if (quoteCh !== '') {
            cur += ch;
            if (ch === quoteCh) quoteCh = '';
            continue;
        }
        if (ch === '"' || ch === "'") quoteCh = ch;
        else if (ch === '(' || ch === '[') depth += 1;
        else if (ch === ')' || ch === ']') depth -= 1;
        if (depth === 0 && sep(ch)) {
            out.push(cur, ch);
            cur = '';
            continue;
        }
        cur += ch;
    }
    out.push(cur);
    return out;
}

/**
 * A selector as compounds and the combinators between them:
 * `{ compounds: string[], combinators: string[] }`, combinators `>`, ` `,
 * `+` or `~`; undefined where it cannot be read (an empty compound).
 */
function compoundsOf(selector) {
    const parts = splitKeep(selector.trim(), (ch) => /[\s>+~]/.test(ch));
    const compounds = [];
    const combinators = [];
    let pending;
    for (const part of parts) {
        if (/^[\s>+~]$/.test(part)) {
            if (part !== ' ' || pending === undefined) pending = part === ' ' ? pending ?? ' ' : part;
            continue;
        }
        if (part === '') continue;
        if (compounds.length > 0) combinators.push(pending ?? ' ');
        compounds.push(part);
        pending = undefined;
    }
    return compounds.length === 0 ? undefined : { compounds, combinators };
}

/** A compound's simple selectors, each whole (a functional pseudo-class with its argument); undefined where it cannot be read. */
function simplesOf(compound) {
    const out = [];
    let i = 0;
    while (i < compound.length) {
        const rest = compound.slice(i);
        const cls = /^\.[a-zA-Z0-9_-]+/.exec(rest) ?? /^::?[a-zA-Z-]+/.exec(rest);
        if (cls === null) return undefined;
        let token = cls[0];
        i += token.length;
        if (token.startsWith(':') && compound[i] === '(') {
            let depth = 0;
            let j = i;
            for (; j < compound.length; j += 1) {
                if (compound[j] === '(') depth += 1;
                if (compound[j] === ')' && --depth === 0) break;
            }
            if (j >= compound.length) return undefined;
            token += compound.slice(i, j + 1);
            i = j + 1;
        }
        out.push(token);
    }
    return out;
}

/** The node classes a subject names: `.a`, or `:is(.a, .b, …)` of classes alone; undefined for anything else. */
function namedNodes(simple) {
    const one = /^\.([a-zA-Z0-9_-]+)$/.exec(simple);
    if (one !== null) return [one[1]];
    const list = /^:is\((.*)\)$/.exec(simple);
    if (list === null) return undefined;
    const items = list[1].split(',').map((item) => item.trim());
    const classes = items.map((item) => /^\.([a-zA-Z0-9_-]+)$/.exec(item)?.[1]);
    return classes.length > 0 && classes.every((c) => c !== undefined) ? classes : undefined;
}

/**
 * Why `key` (`<selector> | <property>`) is no art key a private look's guard
 * may name, or undefined (step 8i, the plan critic's P2-5; test
 * `a-private-decoration-art-key-names-its-own-box`). A key exempts a ground
 * on the row's own box and nowhere else:
 *
 * - the property is `background-image` or `background-color`;
 * - the selector opens with the stall's root, `.stall.<look>`, optionally
 *   `:not(.shop-window)`;
 * - every compound between the root and the subject is one of the app's own
 *   structure classes (`GUARD_STRUCTURE_CLASSES`), joined by `>` or a space;
 * - the subject is a **node** row's class, or `:is()` of several of the
 *   look's node rows' classes, optionally followed by `:not(<the same shape>
 *   ~ *)` (the first of them worn), optionally `::before` or `::after`.
 *
 * **A root row has no key** (D-2026-11-15-06): the plan's one root row with
 * art of its own was dropped from 8i, so no look carries a subject for the
 * form it would have taken (its class on the root, alone or above
 * ` > .stall-scroll`), and a key naming a row's class on the root, or the
 * root itself, is refused. A root row draws in the tokens, or its key waits
 * for a row that needs one.
 *
 * `look`: `{ lookClass, nodeClasses }`, the look's class and its node
 * decoration rows' classes. Whether the sheet declares the key is the gate's
 * to ask (`declaredKeys`).
 */
export function guardArtKeyProblem(key, { lookClass, nodeClasses }) {
    const at = key.lastIndexOf(' | ');
    if (at <= 0) return 'a key is "<selector> | <property>"';
    const selector = key.slice(0, at);
    const prop = key.slice(at + 3);
    if (!GUARD_ART_PROPS.includes(prop)) return `${prop} is no ground a key exempts: ${GUARD_ART_PROPS.join(' or ')} alone`;
    const shape = compoundsOf(selector);
    if (shape === undefined) return 'its selector cannot be read';
    if (shape.combinators.some((c) => c !== '>' && c !== ' ')) return 'its selector joins compounds by + or ~, where a key names a box by descent';
    const simples = shape.compounds.map(simplesOf);
    if (simples.some((s) => s === undefined)) return 'its selector holds a simple selector this reader cannot read';
    const [root, ...rest] = simples;
    if (root[0] !== '.stall' || root[1] !== `.${lookClass}`) return `its selector does not open with the stall's root, .stall.${lookClass}`;
    for (const extra of root.slice(2)) {
        if (extra === ':not(.shop-window)') continue;
        return `its root compound names ${extra}, where it names the look and optionally :not(.shop-window) alone (a root row has no key)`;
    }
    if (rest.length === 0) return 'its subject is the stall\'s root, where a key names a node row\'s own box (a root row has no key)';
    for (const middle of rest.slice(0, -1)) {
        const cls = middle.length === 1 ? /^\.([a-zA-Z0-9_-]+)$/.exec(middle[0])?.[1] : undefined;
        if (cls === undefined || !GUARD_STRUCTURE_CLASSES.includes(cls)) {
            return `it passes through ${middle.join('')}, where a key passes through the app's own structure alone (${GUARD_STRUCTURE_CLASSES.join(', ')})`;
        }
    }
    const subject = [...rest.at(-1)];
    const named = namedNodes(subject.shift() ?? '');
    if (named === undefined || !named.every((cls) => nodeClasses.includes(cls))) {
        return `its subject is no node row of ${lookClass}: a key names the row's own box`;
    }
    if (subject.length > 0 && subject[0].startsWith(':not(')) {
        const inner = /^:not\((.*) ~ \*\)$/.exec(subject[0])?.[1];
        const first = inner === undefined ? undefined : namedNodes(inner);
        if (first === undefined || !first.every((cls) => nodeClasses.includes(cls))) {
            return `its subject's ${subject[0]} is not ":not(<the look's node rows> ~ *)", the first of them worn`;
        }
        subject.shift();
    }
    if (subject.length > 0 && (subject[0] === '::before' || subject[0] === '::after')) subject.shift();
    if (subject.length > 0) return `its subject goes on with ${subject.join('')}, where it ends at the node, or its ::before or ::after`;
    return undefined;
}
