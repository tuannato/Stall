/**
 * **Where a box over money is hit-tested** (before 8g2, 1a; the pure half of
 * `coverFaults` in `layout/probe.ts`). The hit test asks the page what stands
 * at a point with `pointer-events` (and `interactivity`) forced on everywhere,
 * so a cover a look laid over a figure answers wherever it has a hit area;
 * this module says which points to ask, and which hits on the figure's own
 * price column are excused. A paint with no hit area (a shadow, an outline, a
 * neighbour's underline) is not here: 1b's.
 *
 * - **Points.** A box's centre and its four corners, each corner taken
 *   **inside the box's rounded shape** (`cornerInset`): a corner point two
 *   pixels in from a pill's edges stands outside the pill, hit testing honours
 *   `border-radius`, and the hit falls to the parent — 262 false reds over 72
 *   paints of the shipped looks in the critic's census, every one a corner of a
 *   rounded control and none on Neo, whose radius is 0. Every character's
 *   centre is asked beside them (the caller reads the rects). A code gets a
 *   grid (`gridPoints`) at a pitch the caller sets.
 * - **Frames.** Every point is taken in the box's own frame — before the turn
 *   of every ancestor — and turned back (`framePoints`), so a point of a
 *   swaying tag's figure is a point of the figure.
 * - **The column.** The price column is one composed figure: a sibling inside
 *   the same `.item-p` a pixel into a corner is the label's own typography.
 *   Excused only there (`columnExcuses`): never a hit on the column itself — a
 *   pseudo of the column moved over the figure reports as the column — never
 *   at a character's centre or a box's centre, and never a sibling moved by an
 *   offset, a transform or a negative margin (`movedBy`).
 *
 * Pure: no DOM, no browser. Tested in `coverPoints.test.ts`.
 */
import type { Box } from '../src/ui/signInk';

/** A corner's two radii, horizontal then vertical. */
export type Radii = { tl: [number, number]; tr: [number, number]; br: [number, number]; bl: [number, number] };

/** No rounding at all. */
export const SQUARE: Radii = { tl: [0, 0], tr: [0, 0], br: [0, 0], bl: [0, 0] };

/**
 * `radii` scaled the way CSS scales corner radii that overrun a side (one
 * factor for all, the least side's), for a box `w` wide and `h` tall.
 */
export function fittedRadii(radii: Radii, w: number, h: number): Radii {
    const f = Math.min(
        1,
        w / Math.max(1e-6, radii.tl[0] + radii.tr[0]),
        w / Math.max(1e-6, radii.bl[0] + radii.br[0]),
        h / Math.max(1e-6, radii.tl[1] + radii.bl[1]),
        h / Math.max(1e-6, radii.tr[1] + radii.br[1]),
    );
    const k = (r: [number, number]): [number, number] => [r[0] * f, r[1] * f];
    return { tl: k(radii.tl), tr: k(radii.tr), br: k(radii.br), bl: k(radii.bl) };
}

/** Whether point (x, y) stands inside `box` with rounded corners `radii` (already fitted), `tol` px of rounding allowed. */
export function insideRounded(box: Box, radii: Radii, x: number, y: number, tol = 1): boolean {
    if (x < box.left - tol || x > box.right + tol || y < box.top - tol || y > box.bottom + tol) return false;
    const corner = (cx: number, cy: number, [rx, ry]: [number, number]): boolean =>
        rx <= 0 || ry <= 0 || ((x - cx) / (rx + tol)) ** 2 + ((y - cy) / (ry + tol)) ** 2 <= 1;
    if (x < box.left + radii.tl[0] && y < box.top + radii.tl[1]) return corner(box.left + radii.tl[0], box.top + radii.tl[1], radii.tl);
    if (x > box.right - radii.tr[0] && y < box.top + radii.tr[1]) return corner(box.right - radii.tr[0], box.top + radii.tr[1], radii.tr);
    if (x > box.right - radii.br[0] && y > box.bottom - radii.br[1]) return corner(box.right - radii.br[0], box.bottom - radii.br[1], radii.br);
    if (x < box.left + radii.bl[0] && y > box.bottom - radii.bl[1]) return corner(box.left + radii.bl[0], box.bottom - radii.bl[1], radii.bl);
    return true;
}

/** A computed corner radius (`10px`, `10px 4px`, `50%`) against a box `w` by `h`. */
export function radiusOf(value: string, w: number, h: number): [number, number] {
    const parts = value.trim().split(/\s+/);
    const at = (v: string | undefined, basis: number): number => (v === undefined ? Number.NaN : v.endsWith('%') ? (Number.parseFloat(v) / 100) * basis : Number.parseFloat(v) || 0);
    const rx = at(parts[0], w);
    const ry = parts.length > 1 ? at(parts[1], h) : at(parts[0], h);
    return [Number.isFinite(rx) ? Math.max(0, rx) : 0, Number.isFinite(ry) ? Math.max(0, ry) : 0];
}

/** How far in from a box's edges a point stands: two pixels, as the five-point test always took. */
export const EDGE_INSET = 2;

/**
 * How far in from each of a corner's two edges its point stands, so that it
 * is inside the corner's curve by about `EDGE_INSET` as well as `EDGE_INSET`
 * in from each edge: on the curve's diagonal, the radius's
 * `1 - 1/√2` of each axis, plus the inset. A square corner is `EDGE_INSET`
 * on both axes, which is the five-point test's own point.
 */
export function cornerInset([rx, ry]: [number, number]): [number, number] {
    const k = 1 - Math.SQRT1_2;
    return [Math.max(EDGE_INSET, rx * k + EDGE_INSET), Math.max(EDGE_INSET, ry * k + EDGE_INSET)];
}

/** A box in its own frame: its centre on the page, its size before the turn, and the turn (radians). */
export type Frame = { cx: number; cy: number; w: number; h: number; angle: number };

export type PointKind = 'centre' | 'corner' | 'char' | 'grid';
export type CoverPoint = { x: number; y: number; kind: PointKind };

/** A point given in the frame's own coordinates (from its centre, before the turn), on the page. */
function onPage(f: Frame, dx: number, dy: number): [number, number] {
    const cos = Math.cos(f.angle);
    const sin = Math.sin(f.angle);
    return [f.cx + dx * cos - dy * sin, f.cy + dx * sin + dy * cos];
}

/**
 * A box's five points in its own frame: its centre, and each corner inside
 * its curve (`cornerInset`, the radii fitted to the box first), never past
 * the centre on a box too small for the inset.
 */
export function framePoints(f: Frame, radii: Radii = SQUARE): CoverPoint[] {
    const fitted = fittedRadii(radii, f.w, f.h);
    const out: CoverPoint[] = [];
    const [cx, cy] = onPage(f, 0, 0);
    out.push({ x: cx, y: cy, kind: 'centre' });
    const corner = (r: [number, number], sx: -1 | 1, sy: -1 | 1): void => {
        const [ix, iy] = cornerInset(r);
        const dx = sx * Math.max(0, f.w / 2 - ix);
        const dy = sy * Math.max(0, f.h / 2 - iy);
        const [x, y] = onPage(f, dx, dy);
        out.push({ x, y, kind: 'corner' });
    };
    corner(fitted.tl, -1, -1);
    corner(fitted.tr, 1, -1);
    corner(fitted.bl, -1, 1);
    corner(fitted.br, 1, 1);
    return out;
}

/**
 * A grid over a box in its own frame, every `pitch` pixels about its centre,
 * each point at least `EDGE_INSET` inside the box's rounded shape — for a
 * code, where a cover over a few modules is a code that does not scan.
 */
export function gridPoints(f: Frame, pitch: number, radii: Radii = SQUARE): CoverPoint[] {
    if (!(pitch > 0)) throw new Error(`a grid needs a positive pitch, not ${pitch}`);
    const fitted = fittedRadii(radii, f.w, f.h);
    const own: Box = { left: -f.w / 2, top: -f.h / 2, right: f.w / 2, bottom: f.h / 2 };
    const hx = f.w / 2 - EDGE_INSET;
    const hy = f.h / 2 - EDGE_INSET;
    const out: CoverPoint[] = [];
    if (hx < 0 || hy < 0) return out;
    const nx = Math.floor(hx / pitch);
    const ny = Math.floor(hy / pitch);
    for (let j = -ny; j <= ny; j += 1) {
        for (let i = -nx; i <= nx; i += 1) {
            const dx = i * pitch;
            const dy = j * pitch;
            if (!insideRounded(own, fitted, dx, dy, -EDGE_INSET)) continue;
            const [x, y] = onPage(f, dx, dy);
            out.push({ x, y, kind: 'grid' });
        }
    }
    return out;
}

/** A character's centre on the page, from its range rect: a turned glyph's bounds share its centre. */
export function charCentre(r: { left: number; top: number; width: number; height: number }): CoverPoint {
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, kind: 'char' };
}

/** The computed longhands that say whether a box was moved off its place in the flow. */
export type Placement = {
    position: string;
    top: string;
    right: string;
    bottom: string;
    left: string;
    transform: string;
    translate: string;
    rotate: string;
    scale: string;
    marginTop: string;
    marginRight: string;
    marginBottom: string;
    marginLeft: string;
};

/**
 * Why a box stands off its place in the flow, or undefined: an offset of a
 * relative or sticky box, a transform, a `translate`, `rotate` or `scale`, or
 * a negative margin. A computed value this cannot read counts as a move.
 */
export function movedBy(p: Placement): string | undefined {
    const length = (v: string): number => (v === 'auto' || v === '' ? 0 : Number.parseFloat(v));
    if (p.position === 'relative' || p.position === 'sticky') {
        for (const side of ['top', 'right', 'bottom', 'left'] as const) {
            const v = length(p[side]);
            if (!Number.isFinite(v) || v !== 0) return `${side} ${p[side]} (position ${p.position})`;
        }
    }
    if (p.transform !== 'none' && p.transform !== '') return `transform ${p.transform}`;
    for (const prop of ['translate', 'rotate', 'scale'] as const) {
        if (p[prop] !== 'none' && p[prop] !== '') return `${prop} ${p[prop]}`;
    }
    for (const side of ['marginTop', 'marginRight', 'marginBottom', 'marginLeft'] as const) {
        const v = length(p[side]);
        if (!Number.isFinite(v) || v < 0) return `${side.replace('margin', 'margin-').toLowerCase()} ${p[side]}`;
    }
    return undefined;
}

/**
 * Whether a hit on something other than the figure is excused because it
 * stands inside the figure's own price column (`.item-p`): only a sibling,
 * only at a corner point, and only one that no box between it and the column
 * moved (`moved`: the first move found on the hit or its ancestors below the
 * column, or undefined). A hit on the column itself is never excused.
 */
export function columnExcuses(kind: PointKind, hit: 'column' | 'inside' | 'outside', moved: string | undefined): boolean {
    return hit === 'inside' && kind === 'corner' && moved === undefined;
}
