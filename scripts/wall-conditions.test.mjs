import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { PLANTED_CLASS, beforeReduce, plantLooks, removePlants } from './private-looks-plant.mjs';
import { WALL_PASS_NAMES } from './probe-coverage.mjs';
import { guardSheets, privateRows, servedSheets } from './served-sheets.mjs';
import { LOOK_CONTAINER, LOOK_CONTAINER_EXCLUDED, blankComments, containerConditionsOf } from './workshop-css.mjs';
import { WALL_MIN_PX, cellsOf, covers, holds, parseWallCondition, unpaintedCells, unpaintedLookCells, vectorAt, wallCellOwedFaults, wallPassSizes } from './wall-conditions.mjs';

/**
 * The wall's own container conditions, and what a first-party look may do
 * with them (STEP-WALL-CONTAINER, D-2026-11-11-08). `node --test`, like
 * `look-lint.test.mjs`: a TypeScript test importing these `.mjs` modules
 * breaks `tsc` (TS7016).
 */
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WINDOW_CSS = readFileSync(join(ROOT, 'src/ui/window.css'), 'utf8');
/** window.css's `@container sw` preludes as it writes them, whitespace collapsed, each once. */
const WINDOW_PRELUDES = [...new Set([...blankComments(WINDOW_CSS).matchAll(/@container\s+sw\s+([^{]+)\{/g)].map((m) => m[1].replace(/\s+/g, ' ').trim()))];
const SIZES = wallPassSizes();

/**
 * The bare-frame matrix, by value: which wall passes enter each of
 * window.css's conditions when the frame's content box is the viewport
 * (STEP-WALL-CONTAINER-SPEC §1, recomputed by this evaluator; R1 holds
 * the evaluator to Chrome on every probe page).
 */
const MATRIX = {
    '(orientation: landscape) and (max-height: 900px)': ['desk-wall', 'short-wall', 'side-tablet', 'hd-wall'],
    '(orientation: landscape) and (min-height: 901px) and (max-height: 1200px)': ['canvas'],
    '(orientation: portrait)': ['portrait', 'tablet', 'tall-tablet', 'narrow-wall'],
    '(orientation: portrait) and (max-height: 1500px)': ['tablet', 'tall-tablet', 'narrow-wall'],
    '(orientation: landscape)': ['canvas', 'desk-wall', 'short-wall', 'side-tablet', 'hd-wall'],
    '((orientation: landscape) and (max-height: 900px)) or ((orientation: portrait) and (max-height: 1500px))': [
        'tablet',
        'desk-wall',
        'short-wall',
        'side-tablet',
        'hd-wall',
        'tall-tablet',
        'narrow-wall',
    ],
    '(orientation: landscape) and (max-height: 790px)': ['side-tablet', 'hd-wall'],
    '(orientation: landscape) and (max-height: 740px)': [],
    '(orientation: landscape) and (max-height: 870px)': ['short-wall', 'side-tablet', 'hd-wall'],
    '(orientation: portrait) and (max-width: 767.98px)': ['narrow-wall'],
    '(orientation: landscape) and (max-width: 1919.98px)': ['desk-wall', 'short-wall', 'side-tablet', 'hd-wall'],
    '(orientation: landscape) and (max-width: 1279.98px)': ['side-tablet'],
    '(orientation: portrait) and (max-width: 1079.98px)': ['tablet', 'tall-tablet', 'narrow-wall'],
};

/** The cells a dense scan finds: every 4px from the wall's floor to 3840, both axes, short side at least the floor. */
function scannedCells(conditions) {
    const parsed = conditions.map(parseWallCondition);
    const seen = new Set();
    for (let w = WALL_MIN_PX; w <= 3840; w += 4) {
        for (let h = WALL_MIN_PX; h <= 3840; h += 4) seen.add(vectorAt(parsed, w, h));
    }
    return seen;
}

describe('the-wall-conditions-are-window-css-own-and-a-pass-enters-each', () => {
    it('reads the wall pass sizes from the plan, one per wall pass name', () => {
        assert.deepEqual(SIZES.map((s) => s.name).sort(), [...WALL_PASS_NAMES].sort());
        assert.ok(SIZES.every((s) => Math.min(s.width, s.height) >= WALL_MIN_PX), JSON.stringify(SIZES));
    });

    it('lists only window.css preludes, as it writes them, and every one of them is listed or excluded', () => {
        assert.equal(WINDOW_PRELUDES.length, 13, WINDOW_PRELUDES.join('\n'));
        for (const entry of LOOK_CONTAINER) assert.ok(WINDOW_PRELUDES.includes(entry), `not a window.css prelude: ${entry}`);
        for (const prelude of WINDOW_PRELUDES) {
            assert.ok(LOOK_CONTAINER.includes(prelude) || Object.hasOwn(LOOK_CONTAINER_EXCLUDED, prelude), `window.css composes the wall over ${prelude}, which the table neither lists nor excludes`);
        }
        for (const excluded of Object.keys(LOOK_CONTAINER_EXCLUDED)) assert.ok(WINDOW_PRELUDES.includes(excluded) && !LOOK_CONTAINER.includes(excluded), excluded);
        // The lint's reader reads window.css's top-level blocks the same way.
        assert.deepEqual([...containerConditionsOf(WINDOW_CSS)].sort(), [...WINDOW_PRELUDES].sort());
    });

    it('pins the bare-frame matrix by value: every listed condition entered by a pass, every excluded one by none', () => {
        assert.deepEqual(Object.keys(MATRIX).sort(), [...WINDOW_PRELUDES].sort());
        for (const [condition, passes] of Object.entries(MATRIX)) {
            const entered = SIZES.filter((s) => holds(condition, s.width, s.height)).map((s) => s.name);
            assert.deepEqual(entered.sort(), [...passes].sort(), condition);
        }
        for (const entry of LOOK_CONTAINER) assert.ok(MATRIX[entry].length > 0, entry);
        for (const excluded of Object.keys(LOOK_CONTAINER_EXCLUDED)) assert.deepEqual(MATRIX[excluded], [], excluded);
    });

    it('reads a container query as CSS does: portrait when the height is at least the width, bounds inclusive', () => {
        assert.equal(holds('(orientation: portrait)', 1000, 1000), true);
        assert.equal(holds('(orientation: landscape)', 1000, 1000), false);
        assert.equal(holds('(orientation: landscape) and (max-height: 900px)', 1280, 900), true);
        assert.equal(holds('(orientation: landscape) and (max-height: 900px)', 1280, 900.01), false);
        assert.equal(holds('(orientation: landscape) and (min-height: 901px) and (max-height: 1200px)', 1920, 901), true);
        assert.equal(holds('(orientation: portrait) and (max-width: 767.98px)', 767.98, 1000), true);
        assert.equal(holds('(orientation: portrait) and (max-width: 767.98px)', 768, 1000), false);
        assert.equal(holds('((orientation: landscape) and (max-height: 900px)) or ((orientation: portrait) and (max-height: 1500px))', 768, 1024), true);
        assert.equal(holds('((orientation: landscape) and (max-height: 900px)) or ((orientation: portrait) and (max-height: 1500px))', 1920, 1080), false);
    });

    it('refuses every feature and connector it does not read', () => {
        for (const prelude of [
            '(min-aspect-ratio: 1/1)',
            '(aspect-ratio: 16/9)',
            '(orientation: square)',
            '(width >= 900px)',
            '(max-width: 50em)',
            '(max-width: 50cqw)',
            'not (orientation: landscape)',
            '(orientation: landscape), (orientation: portrait)',
            'style(--x: 1)',
            'scroll-state(stuck: top)',
            '(orientation: landscape) or (orientation: portrait) or (max-width: 900px)',
            '(orientation: landscape) or (orientation: portrait)',
            '((orientation: landscape) and (max-height: 900px)) and (orientation: portrait) or (max-width: 9px)',
            '(orientation: landscape',
            '',
            '(max-height: 900)',
            '(orientation: landscape) & (max-height: 900px)',
        ]) {
            assert.throws(() => parseWallCondition(prelude), Error, prelude);
        }
        for (const prelude of [...WINDOW_PRELUDES, '(MAX-WIDTH:900PX)', '((orientation: portrait)) or ((orientation: landscape) and (max-width: 900px))']) {
            assert.doesNotThrow(() => parseWallCondition(prelude), prelude);
        }
    });

    it('finds the cells a dense scan finds, over all thirteen conditions', () => {
        const cells = cellsOf(WINDOW_PRELUDES);
        const scanned = scannedCells(WINDOW_PRELUDES);
        assert.deepEqual(cells.map((c) => c.vector).sort(), [...scanned].sort());
        for (const { vector, example } of cells) {
            assert.equal(vectorAt(WINDOW_PRELUDES, example[0], example[1]), vector, `${example.join('x')} is not in its cell`);
            assert.ok(Math.min(...example) >= WALL_MIN_PX, example.join('x'));
        }
        // The spec's count over the twelve the table lists: 21 cells, 8 of them painted.
        const listed = cellsOf(LOOK_CONTAINER);
        assert.equal(listed.length, 21);
        assert.equal(listed.length - unpaintedCells(LOOK_CONTAINER, SIZES).length, 8);
    });

    it('says when one condition covers another', () => {
        assert.equal(covers('(orientation: landscape)', '(orientation: landscape) and (max-height: 900px)'), true);
        assert.equal(covers('(orientation: landscape) and (max-height: 900px)', '(orientation: landscape)'), false);
        assert.equal(covers('(orientation: landscape) and (max-height: 870px)', '(orientation: landscape) and (max-height: 790px)'), true);
        assert.equal(covers('(orientation: portrait) and (max-width: 1079.98px)', '(orientation: portrait) and (max-height: 1500px)'), false);
    });
});

/** The first-party look sheets a run reads: the shipped looks, the harness's fixture look, the tracked fixture and every private look selected. */
const FIRST_PARTY_ROLES = new Set(['look', 'fixture', 'private']);

/** One sentence per first-party look sheet whose wall conditions, crossed with window.css's own, cut the wall into a combination no wall pass paints. */
function combinationProblems(sheets, sizes = SIZES) {
    const out = [];
    for (const sheet of sheets) {
        if (!FIRST_PARTY_ROLES.has(sheet.role)) continue;
        const conditions = containerConditionsOf(sheet.css);
        let parsed;
        try {
            parsed = conditions.map(parseWallCondition);
        } catch (e) {
            out.push(`${sheet.path} (${sheet.lookClass}): ${e.message}`);
            continue;
        }
        const unpainted = unpaintedLookCells(parsed, WINDOW_PRELUDES, sizes);
        if (unpainted.length > 0) {
            const at = (cell) => {
                const size = cell.example.map((v) => Math.round(v * 100) / 100).join('x');
                const beside = cell.wall.filter((w) => !cell.look.includes(w));
                return beside.length === 0 ? size : `${size} (with window.css's ${beside.join(', ')})`;
            };
            out.push(
                `${sheet.path} (${sheet.lookClass}) uses ${conditions.map((c) => `@container sw ${c}`).join(', ')}; where it holds, window.css's own conditions cut the wall into ` +
                    `${unpainted.length} combination(s) beside it that no wall pass paints, so its layout there is measured by nothing — e.g. ${unpainted.map(at).join('; ')}`,
            );
        }
    }
    return out;
}

/**
 * Every condition the table admits, alone, by value: the sizes (one per
 * unpainted cell, `unpaintedLookCells`' examples) where it meets window.css's
 * own conditions in a combination no wall pass paints. Not one is empty:
 * with the nine wall passes there are today, no look may use any
 * `@container sw` block (CRITIC-STEP-8G5's P2; PLAN § Open names the passes
 * that would admit one).
 */
const VERDICTS = {
    '(orientation: landscape) and (max-height: 900px)': ['709x680', '870x830', '900x885', '1389x680', '4799x680', '4799x753', '4799x830', '4799x885'],
    '(orientation: landscape) and (min-height: 901px) and (max-height: 1200px)': ['990x901', '1389x901'],
    '(orientation: portrait)': ['680x1709', '778x1709', '1139x1139'],
    '(orientation: portrait) and (max-height: 1500px)': ['1139x1139'],
    '(orientation: landscape)': ['709x680', '870x830', '900x885', '1240x1239', '990x901', '1389x680', '1389x1239', '1389x901', '4799x680', '4799x753', '4799x830', '4799x885', '4799x1239'],
    '((orientation: landscape) and (max-height: 900px)) or ((orientation: portrait) and (max-height: 1500px))': ['709x680', '870x830', '900x885', '1139x1139', '1389x680', '4799x680', '4799x753', '4799x830', '4799x885'],
    '(orientation: landscape) and (max-height: 790px)': ['709x680', '1389x680', '4799x680', '4799x753'],
    '(orientation: landscape) and (max-height: 870px)': ['709x680', '870x830', '1389x680', '4799x680', '4799x753', '4799x830'],
    '(orientation: portrait) and (max-width: 767.98px)': ['680x1709'],
    '(orientation: landscape) and (max-width: 1919.98px)': ['709x680', '870x830', '900x885', '1240x1239', '990x901', '1389x680', '1389x1239', '1389x901'],
    '(orientation: landscape) and (max-width: 1279.98px)': ['709x680', '870x830', '900x885', '1240x1239', '990x901'],
    '(orientation: portrait) and (max-width: 1079.98px)': ['680x1709', '778x1709'],
};

/** A planted private look whose sheet holds one `@container sw` block per condition, each laying nothing out but `order: 0`. */
async function plantedWith(conditions) {
    const blocks = conditions.map((c) => `@container sw ${c} {\n    .${PLANTED_CLASS}.shop-window .stall-head { order: 0; }\n}`).join('\n');
    const repo = plantLooks((path, text) => (path === 'fixture/sheet.css' ? beforeReduce(text, blocks) : text));
    const rows = privateRows(await servedSheets({ env: repo.selection, fixture: true, gitEnv: repo.env }));
    const row = rows.find((sheet) => sheet.lookClass === PLANTED_CLASS);
    if (row === undefined) throw new Error('the planted look was not read');
    return row;
}

const C = LOOK_CONTAINER;
/** `SIZES` with more sizes added, as a pass would add them. */
const withSizes = (...extra) => [...SIZES, ...extra.map(([width, height]) => ({ name: `${width}x${height}`, width, height }))];
let SERVED;
let PLANTED;
before(async () => {
    SERVED = await guardSheets();
    PLANTED = {
        // The critic's case: the canvas's own condition alone.
        canvas: await plantedWith([C[1]]),
        // Accepted before the cells were crossed with window.css's.
        landscapeAndPortrait: await plantedWith([C[0], C[3]]),
    };
});
after(removePlants);

describe('a-look-uses-no-combination-of-wall-conditions-no-pass-paints', () => {
    it('finds none in any first-party look sheet a run reads, the tracked fixture among them', () => {
        assert.deepEqual(combinationProblems(SERVED), []);
        const fixture = privateRows(SERVED).find((sheet) => sheet.look.source === 'fixture');
        assert.ok(fixture !== undefined, 'the tracked fixture was not read');
        // No condition is admitted alone today (below), so the tracked fixture carries no block and the guard has no public subject that passes.
        assert.deepEqual(containerConditionsOf(fixture.css), []);
    });

    it('pins every admitted condition’s verdict by value: each, alone, meets window.css in a combination no pass paints', () => {
        assert.deepEqual(Object.keys(VERDICTS), [...C]);
        for (const condition of C) {
            assert.deepEqual(
                unpaintedLookCells([condition], WINDOW_PRELUDES, SIZES).map((cell) => cell.example.join('x')),
                VERDICTS[condition],
                condition,
            );
        }
        assert.ok(Object.values(VERDICTS).every((sizes) => sizes.length > 0), 'a condition is admitted alone: say so in CLAUDE.md and the fixture');
        // Cut over each condition alone, as the rule was before, every one passed.
        for (const condition of C) assert.deepEqual(unpaintedCells([condition], SIZES), [], condition);
    });

    it('refuses the canvas’s condition alone, naming the unpainted size, where 1280x1024 meets window.css’s (max-width: 1919.98px) rules', () => {
        assert.deepEqual(containerConditionsOf(PLANTED.canvas.css), [C[1]]);
        const said = combinationProblems([PLANTED.canvas]);
        assert.equal(said.length, 1, said.join('\n'));
        assert.match(said[0], new RegExp(`\\(${PLANTED_CLASS}\\) uses @container sw \\(orientation: landscape\\) and \\(min-height: 901px\\) and \\(max-height: 1200px\\);`));
        assert.match(said[0], /2 combination\(s\) beside it that no wall pass paints/);
        assert.match(said[0], /990x901 \(with window\.css's \(orientation: landscape\), \(orientation: landscape\) and \(max-width: 1919\.98px\), \(orientation: landscape\) and \(max-width: 1279\.98px\)\)/);
        assert.match(said[0], /1389x901 \(with window\.css's \(orientation: landscape\), \(orientation: landscape\) and \(max-width: 1919\.98px\)\)$/);
        // 1280x1024 — where the critic's scratch run read the look covering money — stands in the 1389x901 cell.
        const all = [C[1], ...WINDOW_PRELUDES];
        const cells = unpaintedLookCells([C[1]], WINDOW_PRELUDES, SIZES);
        assert.equal(cells[1].vector, vectorAt(all, 1280, 1024));
        // One more pass at 1280x1024 is not enough: the landscape frame 901–1200 tall under 1280 wide is still unpainted.
        assert.deepEqual(combinationProblems([PLANTED.canvas], withSizes([1280, 1024])).length, 1);
        assert.match(combinationProblems([PLANTED.canvas], withSizes([1280, 1024]))[0], /1 combination\(s\).*990x901/);
    });

    it('refuses a pair it accepted when cells were cut over the look’s own conditions alone', () => {
        assert.deepEqual(containerConditionsOf(PLANTED.landscapeAndPortrait.css), [C[0], C[3]]);
        assert.deepEqual(unpaintedCells([C[0], C[3]], SIZES), []);
        const said = combinationProblems([PLANTED.landscapeAndPortrait]);
        assert.equal(said.length, 1, said.join('\n'));
        assert.match(said[0], /9 combination\(s\) beside it that no wall pass paints/);
        // The old refusals stand: the height step and the width step together; the landscape split over 1200 tall.
        const pair = [C[0], C[9], ...WINDOW_PRELUDES];
        for (const [w, h] of [[908, 904], [1920, 720]]) {
            assert.ok(unpaintedLookCells([C[0], C[9]], WINDOW_PRELUDES, SIZES).some((cell) => cell.vector === vectorAt(pair, w, h)), `${w}x${h}`);
        }
        assert.ok(unpaintedLookCells([C[0], C[1], C[4]], WINDOW_PRELUDES, SIZES).some((cell) => cell.vector === vectorAt([C[0], C[1], C[4], ...WINDOW_PRELUDES], 1920, 1201)));
    });

    it('accepts a condition once every combination it meets is painted: the canvas’s with 1280x1024 and 1200x960, portrait ≤1500 with 1080x1080', () => {
        assert.deepEqual(combinationProblems([PLANTED.canvas], withSizes([1280, 1024], [1200, 960])), []);
        assert.deepEqual(unpaintedLookCells([C[3]], WINDOW_PRELUDES, withSizes([1080, 1080])), []);
        assert.deepEqual(unpaintedLookCells([C[8]], WINDOW_PRELUDES, withSizes([720, 1600])), []);
        // A cell where none of the look's conditions holds is not asked: the canvas's condition never owes a portrait size.
        assert.ok(unpaintedLookCells([C[1]], WINDOW_PRELUDES, SIZES).every((cell) => cell.look.length > 0));
    });
});

const OWED_CONDITIONS = [0, 9];
const OWED_VECTORS = cellsOf([C[0], C[9]]).map((c) => c.vector);
describe('every-wall-cell-a-look-uses-is-painted (the pure half)', () => {
    it('fails a look and variant whose wall paints did not enter every combination its conditions cut', () => {
        const conditions = OWED_CONDITIONS;
        const vectors = OWED_VECTORS;
        const echo = (w, h) => vectorAt(LOOK_CONTAINER, w, h);
        const faults = wallCellOwedFaults(
            { 't-x': { conditions, vectors, names: [C[0], C[9]] } },
            { 't-x': { bare: [echo(1280, 900), echo(1920, 1080)] } },
        );
        assert.equal(faults.length, 1, faults.join('\n'));
        assert.match(faults[0], /t-x \(bare\): no wall paint of this run entered 2 of the 4 combination\(s\)/);
        assert.deepEqual(
            wallCellOwedFaults({ 't-x': { conditions, vectors } }, { 't-x': { bare: [echo(1280, 900), echo(1920, 1080), echo(908, 904), echo(1920, 720)] } }),
            [],
        );
        assert.match(wallCellOwedFaults({ 't-x': { conditions, vectors } }, {}).join(''), /no wall paint of this run read its frame/);
        // A look that uses no condition owes nothing.
        assert.deepEqual(wallCellOwedFaults({ 't-y': { conditions: [], vectors: [''] } }, {}), []);
    });
});
