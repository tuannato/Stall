import { describe, expect, it } from 'vitest';
import {
    EDGE_INSET,
    INK_COLUMN_PITCH,
    INK_MAX_COLUMNS,
    INK_MAX_ROWS,
    INK_MIN_ROWS,
    INK_ROW_PITCH,
    SQUARE,
    columnExcuses,
    columnPlace,
    cornerInset,
    fittedRadii,
    framePoints,
    gridPoints,
    inkPoints,
    insideRounded,
    movedBy,
    radiusOf,
    type Placement,
    type Radii,
} from './coverPoints';

const round = (r: number): Radii => ({ tl: [r, r], tr: [r, r], br: [r, r], bl: [r, r] });
const boxOf = (f: { cx: number; cy: number; w: number; h: number }) => ({ left: f.cx - f.w / 2, top: f.cy - f.h / 2, right: f.cx + f.w / 2, bottom: f.cy + f.h / 2 });

describe('nothing-covers-money-or-a-protected-box: where it is hit-tested', () => {
    /*
     * The critic's census (before 8g2): a corner point two pixels in from a
     * pill's edges stands outside the pill, and the hit falls to its parent.
     * The pay sheet's Cashtab control is 362 by 51 with a 25.5px radius on
     * Modern. Red with `cornerInset` answering `[EDGE_INSET, EDGE_INSET]`:
     * the corner points fall outside the curve.
     */
    it('takes every corner point inside a rounded box', () => {
        const pill = { cx: 195, cy: 558.5, w: 362, h: 51, angle: 0 };
        const points = framePoints(pill, round(25.5));
        expect(points.map((p) => p.kind)).toEqual(['centre', 'corner', 'corner', 'corner', 'corner']);
        const fitted = fittedRadii(round(25.5), pill.w, pill.h);
        for (const p of points) {
            // Inside the curve with no rounding allowed, and a pixel to spare.
            expect(insideRounded(boxOf(pill), fitted, p.x, p.y, -1)).toBe(true);
        }
    });

    it('takes a square corner two pixels in, the five-point test’s own point', () => {
        expect(cornerInset([0, 0])).toEqual([EDGE_INSET, EDGE_INSET]);
        const points = framePoints({ cx: 50, cy: 20, w: 100, h: 40, angle: 0 });
        expect(points.slice(1).map((p) => [p.x, p.y])).toEqual([
            [2, 2],
            [98, 2],
            [2, 38],
            [98, 38],
        ]);
    });

    it('fits radii that overrun a side before it insets (a 50% radius on a short box)', () => {
        const w = 80;
        const h = 20;
        const half = { tl: radiusOf('50%', w, h), tr: radiusOf('50%', w, h), br: radiusOf('50%', w, h), bl: radiusOf('50%', w, h) };
        const fitted = fittedRadii(half, w, h);
        for (const p of framePoints({ cx: 40, cy: 10, w, h, angle: 0 }, half)) {
            expect(insideRounded({ left: 0, top: 0, right: w, bottom: h }, fitted, p.x, p.y, -1)).toBe(true);
        }
    });

    it('never puts a corner past the centre of a box too small for the inset', () => {
        const points = framePoints({ cx: 10, cy: 10, w: 3, h: 3, angle: 0 }, round(20));
        for (const p of points) {
            expect(p.x).toBe(10);
            expect(p.y).toBe(10);
        }
    });

    it('takes the points in the box’s own frame and turns them back', () => {
        const angle = (0.8 * Math.PI) / 180;
        const f = { cx: 200, cy: 100, w: 160, h: 40, angle };
        const [, tl] = framePoints(f);
        // The top-left corner, two pixels in, turned about the centre.
        const dx = -78;
        const dy = -18;
        expect(tl!.x).toBeCloseTo(200 + dx * Math.cos(angle) - dy * Math.sin(angle), 9);
        expect(tl!.y).toBeCloseTo(100 + dx * Math.sin(angle) + dy * Math.cos(angle), 9);
    });

    it('lays a grid over a code inside its rounded corners, at the pitch asked', () => {
        const code = { cx: 195, cy: 916, w: 336, h: 336, angle: 0 };
        const grid = gridPoints(code, 24, round(14));
        expect(grid.length).toBeGreaterThan(40);
        const fitted = fittedRadii(round(14), code.w, code.h);
        for (const p of grid) {
            expect(p.kind).toBe('grid');
            expect(insideRounded(boxOf(code), fitted, p.x, p.y, -EDGE_INSET)).toBe(true);
        }
        // Square, it keeps every point of the lattice: 13 by 13 at 24px over 332px.
        expect(gridPoints(code, 24, SQUARE)).toHaveLength(13 * 13);
        expect(() => gridPoints(code, 0)).toThrow(/positive pitch/);
    });

    /*
     * The critic's T5 (before 8g2, item 2): a band of the look's ground laid
     * over the lower half of the Cycle card's digits, between the row of
     * character centres and the box's bottom corners, hid "875" and "XEC"
     * and met no point. Red with one centre point a glyph (the rule as it
     * was): nothing stands in the band.
     */
    it('asks every glyph at several heights, so a band over half of it meets a point', () => {
        // A 60px figure's digit: its box 36 by 73, its ink 4–32 across and
        // 15–59 down (the baseline at 59, the cap height 44).
        const f = { cx: 118, cy: 336.5, w: 36, h: 73, angle: 0 };
        const ink = { left: 4, right: 32, top: 15, bottom: 59 };
        const points = inkPoints(f, ink);
        const top = f.cy - f.h / 2;
        // The lower half of the ink, and a band 12px tall anywhere in it.
        for (let from = 15; from + 12 <= 59; from += 1) {
            expect(points.some((p) => p.y >= top + from && p.y <= top + from + 12)).toBe(true);
        }
        const rows = new Set(points.map((p) => p.y)).size;
        const columns = new Set(points.map((p) => p.x)).size;
        expect(rows).toBe(Math.min(INK_MAX_ROWS, Math.ceil(44 / INK_ROW_PITCH)));
        expect(columns).toBe(Math.min(INK_MAX_COLUMNS, Math.ceil(28 / INK_COLUMN_PITCH)));
        expect(points.every((p) => p.kind === 'ink')).toBe(true);
    });

    it('asks a small glyph at two heights at least, and at its middle across', () => {
        // An 11px digit: its ink 6 by 8.
        const points = inkPoints({ cx: 3.5, cy: 7, w: 7, h: 14, angle: 0 }, { left: 0.5, right: 6.5, top: 3, bottom: 11 });
        expect(points).toHaveLength(INK_MIN_ROWS);
        expect(points.map((p) => [p.x, p.y])).toEqual([
            [3.5, 5],
            [3.5, 9],
        ]);
    });

    it('cuts the ink to the character’s own box, and reads the box where nothing is left', () => {
        const f = { cx: 50, cy: 50, w: 20, h: 30, angle: 0 };
        // An italic overhang and a mark above the box: cut to it.
        for (const p of inkPoints(f, { left: -6, right: 26, top: -10, bottom: 25 })) {
            expect(p.x).toBeGreaterThanOrEqual(40);
            expect(p.x).toBeLessThanOrEqual(60);
            expect(p.y).toBeGreaterThanOrEqual(35);
            expect(p.y).toBeLessThanOrEqual(60);
        }
        // An ink wholly above the box: the box.
        const above = inkPoints(f, { left: 2, right: 18, top: -20, bottom: -5 });
        expect(Math.min(...above.map((p) => p.y))).toBeGreaterThan(35);
        expect(Math.max(...above.map((p) => p.y))).toBeLessThan(65);
    });

    it('takes a turned glyph’s points in its own frame and turns them back', () => {
        const angle = (0.8 * Math.PI) / 180;
        const f = { cx: 200, cy: 100, w: 20, h: 30, angle };
        const [first] = inkPoints(f, { left: 0, right: 20, top: 0, bottom: 30 });
        // The first row and the first column, each at the middle of its band, from the centre.
        const dx = 20 / Math.ceil(20 / INK_COLUMN_PITCH) / 2 - 10;
        const dy = 30 / Math.ceil(30 / INK_ROW_PITCH) / 2 - 15;
        expect(first!.x).toBeCloseTo(200 + dx * Math.cos(angle) - dy * Math.sin(angle), 9);
        expect(first!.y).toBeCloseTo(100 + dx * Math.sin(angle) + dy * Math.cos(angle), 9);
    });
});

describe('nothing-covers-money-or-a-protected-box: the price column', () => {
    const still: Placement = {
        position: 'static',
        top: 'auto',
        right: 'auto',
        bottom: 'auto',
        left: 'auto',
        transform: 'none',
        translate: 'none',
        rotate: 'none',
        scale: 'none',
        marginTop: '0px',
        marginRight: '0px',
        marginBottom: '0px',
        marginLeft: '0px',
    };

    it('reads a box in its place as unmoved, a relative box with no offset included', () => {
        expect(movedBy(still)).toBeUndefined();
        expect(movedBy({ ...still, position: 'relative', top: '0px', left: 'auto' })).toBeUndefined();
    });

    it('names every way a box is moved off its place', () => {
        expect(movedBy({ ...still, position: 'relative', top: '-153px' })).toMatch(/top -153px/);
        expect(movedBy({ ...still, position: 'sticky', bottom: '4px' })).toMatch(/bottom 4px/);
        expect(movedBy({ ...still, transform: 'matrix(1, 0, 0, 1, 0, 40)' })).toMatch(/transform/);
        expect(movedBy({ ...still, translate: '0px 40px' })).toMatch(/translate/);
        expect(movedBy({ ...still, rotate: '2deg' })).toMatch(/rotate/);
        expect(movedBy({ ...still, scale: '6' })).toMatch(/scale/);
        expect(movedBy({ ...still, marginTop: '-3em' })).toMatch(/margin-top/);
        expect(movedBy({ ...still, marginLeft: '-1px' })).toMatch(/margin-left/);
        // A value this cannot read counts as a move.
        expect(movedBy({ ...still, position: 'relative', top: 'anchor(top)' })).toMatch(/top/);
    });

    /*
     * The critic's P1-1: `.item-p::after` moved over the figure reports as
     * `.item-p` (a pseudo's paint is its host's), and `Node.contains` is
     * inclusive, so the five-point test excused it. Red with the column
     * answering 'inside': the first expectation fails.
     */
    it('never excuses a hit on the column itself', () => {
        for (const kind of ['centre', 'corner', 'ink', 'grid'] as const) {
            expect(columnExcuses(kind, 'column', undefined)).toBe(false);
        }
    });

    /*
     * The critic's item 7 (before 8g2): `.item-a` is the figure's parent,
     * and a pseudo of it moved over the figure reports as `.item-a` — a box
     * inside the column that is not the column, which the rule read as a
     * sibling and excused at a corner. Red with the place read as it was
     * (`hit === column` alone): `.item-a` answers 'inside'.
     */
    it('reads every box that holds the figure as the column, and never excuses it', () => {
        // .item-p, .item-a and any box between them hold the figure.
        expect(columnPlace(true, true)).toBe('column');
        for (const kind of ['centre', 'corner', 'ink', 'grid'] as const) {
            expect(columnExcuses(kind, columnPlace(true, true), undefined)).toBe(false);
        }
        // A true sibling in the column, and anything outside it.
        expect(columnPlace(true, false)).toBe('inside');
        expect(columnPlace(false, false)).toBe('outside');
        // An ancestor outside the column (the stall, whose pseudo was T6) is outside, and covers.
        expect(columnPlace(false, true)).toBe('outside');
    });

    it('excuses a sibling inside the column at a corner point alone, and never one that was moved', () => {
        expect(columnExcuses('corner', 'inside', undefined)).toBe(true);
        expect(columnExcuses('ink', 'inside', undefined)).toBe(false);
        expect(columnExcuses('centre', 'inside', undefined)).toBe(false);
        expect(columnExcuses('grid', 'inside', undefined)).toBe(false);
        expect(columnExcuses('corner', 'inside', 'top -60px (position relative)')).toBe(false);
        expect(columnExcuses('corner', 'outside', undefined)).toBe(false);
    });
});
