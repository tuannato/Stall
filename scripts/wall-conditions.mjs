/**
 * The wall's own container conditions, read as sizes (STEP-WALL-CONTAINER,
 * D-2026-11-11-08).
 *
 * `window.css` composes the shop window over `@container sw <condition>`
 * blocks, and since this step a first-party look sheet may hold the same
 * blocks for exactly the conditions a wall pass enters (`LOOK_CONTAINER`,
 * `scripts/workshop-css.mjs`), to lay the wall out and never to paint it.
 * This module is the evaluator every reader of those conditions shares:
 *
 * - `parseWallCondition(prelude)`: the condition as an OR of ANDs. Only
 *   `(orientation: portrait|landscape)`, `(min-|max-width: <n>px)` and
 *   `(min-|max-height: <n>px)`, joined by `and`, and at most one top-level
 *   `or` of two parenthesised groups — the shapes window.css writes.
 *   Anything else throws: an evaluator that guessed would answer for a
 *   condition Chrome reads differently (fail closed).
 * - `holds(condition, width, height)`: CSS's own reading of it over a
 *   container's content box — portrait when the height is at least the
 *   width, min and max inclusive.
 * - `cellsOf(conditions)`: the distinct truth vectors the conditions cut the
 *   wall's sizes into (short side >= `WALL_MIN_PX`), each with one example
 *   size, from sample points that hit every cell: every threshold, a
 *   hundredth either side and the midpoints between neighbours, on both
 *   axes and crossed, and beside the diagonal (the orientation's edge) at
 *   every one of them. Held to a dense scan by
 *   `the-wall-conditions-are-window-css-own-and-a-pass-enters-each`.
 * - `wallPassSizes()`: the sizes the wall passes paint, read from
 *   `geometryPlan()` (`scripts/probe-passes.mjs`) and never typed again.
 *
 * Pure, and importing only `probe-passes.mjs`, which imports nothing: the
 * probe page imports `holds` for its own self-check
 * (`the-wall-condition-echo-agrees-with-this-chrome`).
 */
import { CANVAS, geometryPlan } from './probe-passes.mjs';

/** The wall's floor on its short side (`WINDOW_MIN_PX`, `src/app.ts`'s `wallWidth`): no wall paints below it. */
export const WALL_MIN_PX = 680;

/** The largest size a sample reaches: past every threshold window.css writes, so the cells above them all are read. */
const WALL_MAX_PX = 7680;

const FEATURE = /^\((?:(orientation): (portrait|landscape)|(min|max)-(width|height): (\d+(?:\.\d+)?)px)\)$/;

/** A condition's text with whitespace collapsed and one space after each colon, lower case (CSS reads features case-blind). */
export function normaliseCondition(text) {
    return String(text)
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/\(\s*/g, '(')
        .replace(/\s*\)/g, ')')
        .replace(/\s*:\s*/g, ': ')
        .trim();
}

/** `text` split at every top-level ` <word> ` (outside parentheses); undefined when a parenthesis does not close. */
function splitWord(text, word) {
    const parts = [];
    let depth = 0;
    let start = 0;
    const sep = ` ${word} `;
    for (let i = 0; i < text.length; i += 1) {
        const c = text[i];
        if (c === '(') depth += 1;
        else if (c === ')') {
            depth -= 1;
            if (depth < 0) return undefined;
        } else if (depth === 0 && text.startsWith(sep, i)) {
            parts.push(text.slice(start, i));
            start = i + sep.length;
            i += sep.length - 1;
        }
    }
    if (depth !== 0) return undefined;
    parts.push(text.slice(start));
    return parts;
}

/** `(…)` wrapping the whole of `text`, or undefined. */
function unwrap(text) {
    if (!text.startsWith('(') || !text.endsWith(')')) return undefined;
    let depth = 0;
    for (let i = 0; i < text.length; i += 1) {
        if (text[i] === '(') depth += 1;
        else if (text[i] === ')') {
            depth -= 1;
            if (depth === 0 && i !== text.length - 1) return undefined;
        }
    }
    return text.slice(1, -1);
}

function andList(text, whole) {
    const parts = splitWord(text, 'and');
    if (parts === undefined) throw new Error(`the wall condition "${whole}" does not close its parentheses`);
    return parts.map((part) => {
        const m = FEATURE.exec(part);
        if (m === null) {
            throw new Error(
                `the wall condition "${whole}" holds "${part}", which this evaluator does not read — it reads (orientation: portrait|landscape), (min-|max-width: <n>px) and (min-|max-height: <n>px), joined by "and", and one top-level "or" of two parenthesised groups`,
            );
        }
        return m[1] === 'orientation' ? { feature: 'orientation', value: m[2] } : { feature: m[4], bound: m[3], px: Number(m[5]) };
    });
}

/**
 * The condition as `{ text, groups }`: `text` normalised, `groups` an OR of
 * ANDs of features. Throws on anything but the shapes listed above — `not`,
 * a range (`width >= 900px`), `aspect-ratio`, a unit but px, `style()`, a
 * third `or` group, a group not in parentheses.
 */
export function parseWallCondition(prelude) {
    const text = normaliseCondition(prelude);
    if (text === '') throw new Error('an empty wall condition');
    const ors = splitWord(text, 'or');
    if (ors === undefined) throw new Error(`the wall condition "${text}" does not close its parentheses`);
    if (ors.length > 2) throw new Error(`the wall condition "${text}" has more than one top-level "or"`);
    if (ors.length === 1) return { text, groups: [andList(text, text)] };
    const groups = ors.map((part) => {
        const inner = unwrap(part);
        if (inner === undefined || !inner.startsWith('(')) {
            throw new Error(`the wall condition "${text}" has an "or" group that is not one parenthesised list: "${part}"`);
        }
        return andList(inner, text);
    });
    return { text, groups };
}

const parsedOf = (condition) => (typeof condition === 'string' ? parseWallCondition(condition) : condition);

/** Whether `condition` (a prelude, or `parseWallCondition`'s answer) holds over a container whose content box is `width` by `height`. */
export function holds(condition, width, height) {
    return parsedOf(condition).groups.some((group) =>
        group.every((f) => {
            if (f.feature === 'orientation') return f.value === (height >= width ? 'portrait' : 'landscape');
            const v = f.feature === 'width' ? width : height;
            return f.bound === 'min' ? v >= f.px : v <= f.px;
        }),
    );
}

/** The truth vector of `conditions` at one size: one `'1'` or `'0'` per condition, in order. */
export function vectorAt(conditions, width, height) {
    return parsedList(conditions)
        .map((c) => (holds(c, width, height) ? '1' : '0'))
        .join('');
}

function parsedList(conditions) {
    return conditions.map(parsedOf);
}

/** The values a sample takes on either axis: every threshold, a hundredth either side, the ends, and the midpoints between neighbours with the whole pixels beside them. */
function candidates(parsed) {
    const set = new Set([WALL_MIN_PX, WALL_MAX_PX]);
    for (const c of parsed) {
        for (const group of c.groups) {
            for (const f of group) {
                if (f.feature === 'orientation') continue;
                for (const v of [f.px - 0.01, f.px, f.px + 0.01]) set.add(Math.round(v * 100) / 100);
            }
        }
    }
    const sorted = [...set].sort((a, b) => a - b);
    const out = new Set(sorted);
    for (let i = 1; i < sorted.length; i += 1) {
        // The midpoint, and the whole pixels beside it: more samples never lose a cell, and they give a cell a whole-pixel example where it has one.
        const mid = (sorted[i - 1] + sorted[i]) / 2;
        for (const v of [mid, Math.floor(mid), Math.ceil(mid)]) if (v > sorted[i - 1] && v < sorted[i]) out.add(v);
        out.add(mid);
    }
    return [...out].sort((a, b) => a - b);
}

const integral = ([w, h]) => Number.isInteger(w) && Number.isInteger(h);

/**
 * The cells `conditions` cut the wall's sizes into: `[{ vector, example }]`,
 * each vector distinct (one `'1'`/`'0'` per condition, in order), each
 * `example` one `[width, height]` inside the cell with its short side at
 * least `WALL_MIN_PX` — a whole-pixel one where the cell holds one among
 * the samples. In the order the samples first meet them (widths ascending,
 * then heights).
 */
export function cellsOf(conditions) {
    const parsed = parsedList(conditions);
    const values = candidates(parsed);
    const cells = new Map();
    const visit = (w, h) => {
        if (Math.min(w, h) < WALL_MIN_PX) return;
        const vector = parsed.map((c) => (holds(c, w, h) ? '1' : '0')).join('');
        const had = cells.get(vector);
        if (had === undefined) cells.set(vector, [w, h]);
        else if (!integral(had) && integral([w, h])) cells.set(vector, [w, h]);
    };
    for (const w of values) {
        for (const h of values) visit(w, h);
        for (const h of [w - 0.01, w, w + 0.01]) visit(w, h);
    }
    return [...cells].map(([vector, example]) => ({ vector, example }));
}

/**
 * The cells of `conditions` no size in `sizes` stands in: `[{ vector,
 * example }]`. `sizes` is `[{ name, width, height }]`, `wallPassSizes()`'s
 * shape. Empty when every combination the conditions cut the wall into is
 * one a wall pass paints (`a-look-uses-no-combination-of-wall-conditions-no-pass-paints`).
 */
export function unpaintedCells(conditions, sizes) {
    const painted = new Set(sizes.map(({ width, height }) => vectorAt(conditions, width, height)));
    return cellsOf(conditions).filter((cell) => !painted.has(cell.vector));
}

/**
 * Whether `outer` holds at every size where `inner` holds — so a rule under
 * `outer` written after one under `inner` takes it back wherever it applies
 * (the covering half of `a-container-rule-is-not-out-ranked-by-a-later-base-rule`).
 */
export function covers(outer, inner) {
    return cellsOf([inner, outer]).every((cell) => cell.vector !== '10');
}

/**
 * The sizes the wall passes paint, `[{ name, width, height }]`: every `wall`
 * entry of `geometryPlan()` and the canvas page pass, named by their
 * coverage names (`WALL_PASS_NAMES` in `probe-coverage.mjs`, which the
 * test holds this list to). The desktop page pass paints the wall's page
 * screens at the desk wall's 1280x900, so it adds no size.
 */
export function wallPassSizes() {
    return geometryPlan()
        .filter((pass) => pass.kind === 'wall' || (pass.kind === 'page' && pass.vp === CANVAS))
        .map((pass) => ({ name: pass.coverage, width: pass.vp.width, height: pass.vp.height }));
}

/**
 * `every-wall-cell-a-look-uses-is-painted`'s pure half. `required`: per look
 * class, `{ conditions: [indices into the probe's echo order], vectors:
 * [the cells the look's conditions cut the wall into] }`; `observed`: per
 * look class, per variant, the echo vectors (one bit per echoed condition,
 * in the echo order) its wall paints read. Answers one sentence per look
 * and variant with a required cell it never painted, and per look that
 * uses conditions and painted no wall at all.
 */
export function wallCellOwedFaults(required, observed) {
    const out = [];
    for (const [cls, { conditions, vectors, names = [] }] of Object.entries(required)) {
        if (conditions.length === 0) continue;
        const byVariant = observed[cls];
        if (byVariant === undefined || Object.keys(byVariant).length === 0) {
            out.push(`${cls} uses ${conditions.length} wall condition(s) and no wall paint of this run read its frame`);
            continue;
        }
        for (const [variant, echoes] of Object.entries(byVariant)) {
            const seen = new Set(echoes.map((echo) => conditions.map((i) => echo[i] ?? '0').join('')));
            const missing = vectors.filter((v) => !seen.has(v));
            if (missing.length > 0) {
                const said = missing
                    .map((v) => (names.length === conditions.length ? names.map((n, k) => `${v[k] === '1' ? '' : 'not '}${n}`).join(' and ') : v))
                    .join('; ');
                out.push(`${cls} (${variant}): no wall paint of this run entered ${missing.length} of the ${vectors.length} combination(s) its wall conditions cut the wall into — ${said}`);
            }
        }
    }
    return out;
}
