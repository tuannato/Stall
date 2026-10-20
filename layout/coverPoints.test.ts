import { describe, expect, it } from 'vitest';
import {
    EDGE_INSET,
    SQUARE,
    charCentre,
    columnExcuses,
    cornerInset,
    fittedRadii,
    framePoints,
    gridPoints,
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

    it('takes a character at the centre of its rect', () => {
        expect(charCentre({ left: 10, top: 20, width: 8, height: 14 })).toEqual({ x: 14, y: 27, kind: 'char' });
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
        for (const kind of ['centre', 'corner', 'char', 'grid'] as const) {
            expect(columnExcuses(kind, 'column', undefined)).toBe(false);
        }
    });

    it('excuses a sibling inside the column at a corner point alone, and never one that was moved', () => {
        expect(columnExcuses('corner', 'inside', undefined)).toBe(true);
        expect(columnExcuses('char', 'inside', undefined)).toBe(false);
        expect(columnExcuses('centre', 'inside', undefined)).toBe(false);
        expect(columnExcuses('grid', 'inside', undefined)).toBe(false);
        expect(columnExcuses('corner', 'inside', 'top -60px (position relative)')).toBe(false);
        expect(columnExcuses('corner', 'outside', undefined)).toBe(false);
    });
});
