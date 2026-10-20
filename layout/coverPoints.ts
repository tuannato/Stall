/**
 * **Where a box over money is hit-tested** (before 8g2, 1a; the pure half of
 * `coverFaults` in `layout/probe.ts`). The hit test asks the page what stands
 * at a point with `pointer-events` (and `interactivity`) forced on everywhere,
 * so a cover a look laid over a figure answers wherever it has a hit area;
 * this module says which points to ask, and which hits on the figure's own
 * price column are excused. A paint with no hit area (a shadow, an outline, a
 * neighbour's underline) is not here: 1b's.
 *
 * - **Points over the ink** (`inkPoints`, before 8g2 item 2). A node with
 *   text is asked over every glyph's ink, at several heights and, on a wide
 *   glyph, across it: one centre a character left a band over half of every
 *   digit unasked (the critic's T5, a band of the look's ground over the
 *   lower half of the Cycle card's figure), and a box's corners asked its
 *   line box rather than its glyphs (20 of the 44 would-be failures of the
 *   first clean run were a stepper's box meeting a figure's line box where
 *   no glyph stood). The caller measures each glyph (`measurePainted`, the
 *   ink model's own).
 * - **A box's points.** A node with no text — a code — is asked at its
 *   centre and its four corners, each corner taken **inside the box's
 *   rounded shape** (`cornerInset`): a corner point two pixels in from a
 *   pill's edges stands outside the pill, hit testing honours
 *   `border-radius`, and the hit falls to the parent — 262 false reds over
 *   72 paints of the shipped looks in the critic's census, every one a
 *   corner of a rounded control and none on Neo, whose radius is 0. A code
 *   gets a grid (`gridPoints`) at a pitch the caller sets.
 * - **Frames.** Every point is taken in the box's own frame — before the turn
 *   of every ancestor — and turned back (`framePoints`), so a point of a
 *   swaying tag's figure is a point of the figure.
 * - **The column.** The price column is one composed figure: a sibling
 *   inside the same `.item-p` a pixel into a box's corner is the label's own
 *   typography. Excused only there (`columnExcuses`): only a true sibling —
 *   never a box that holds the figure (`columnPlace`): the column itself,
 *   `.item-a`, or any box between them, since a pseudo of any of them moved
 *   over the figure reports as that box (the critic's P1-1, and before 8g2
 *   item 7) — only at a corner point, which only a node with no text has
 *   (a glyph's points are never excused), and never a sibling moved by an
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

export type PointKind = 'centre' | 'corner' | 'ink' | 'grid';
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

/**
 * How far apart the points over a glyph's ink stand, CSS px, down the glyph
 * and across it. Set on cost (before 8g2, item 2): most of the app's money
 * is set at 11–16px, two rows and one column a glyph, and the phone pass
 * asks 174,213 points (106,455 hit-tested) where one centre a character
 * and every box's corners asked 118,437 (76,263); a 6px lattice would ask
 * about twice that again. A cover thinner than the pitch can stand between
 * two rows or columns, stated: a stroke of a digit is thinner than any pitch
 * a hit test can afford, and what a cover does to a glyph's own pixels is the
 * paint reads'.
 */
export const INK_ROW_PITCH = 6;
export const INK_COLUMN_PITCH = 12;
/** At least two rows over every glyph, so no half of it — above or below its middle — goes unasked. */
export const INK_MIN_ROWS = 2;
/**
 * At most this many rows and columns over one glyph: a wall's 60–80px figure
 * would otherwise take 50 points a digit, its rows then standing up to a
 * tenth of its height apart.
 */
export const INK_MAX_ROWS = 6;
export const INK_MAX_COLUMNS = 3;

/**
 * Points over a glyph's ink, in its character's own frame and turned back:
 * `ink` is where the glyph's ink reaches, from the character box's top-left
 * before its turn (`measurePainted`'s actual bounding box about the
 * baseline), cut to the box itself — a hit outside the character's own box
 * answers whatever stands beside it, the node's own parent included, which
 * is no cover. Rows every `INK_ROW_PITCH` down the ink, at least
 * `INK_MIN_ROWS`, and columns every `INK_COLUMN_PITCH` across it, at least
 * one, each at the middle of its band. An ink the box cuts to nothing (a
 * mark set wholly above its line's box, a metric that did not resolve) is
 * read as the box.
 */
export function inkPoints(f: Frame, ink: Box): CoverPoint[] {
    let left = Math.max(0, ink.left);
    let right = Math.min(f.w, ink.right);
    let top = Math.max(0, ink.top);
    let bottom = Math.min(f.h, ink.bottom);
    if (!(right - left >= 0.5 && bottom - top >= 0.5)) [left, right, top, bottom] = [0, f.w, 0, f.h];
    const w = right - left;
    const h = bottom - top;
    const rows = Math.min(INK_MAX_ROWS, Math.max(INK_MIN_ROWS, Math.ceil(h / INK_ROW_PITCH)));
    const columns = Math.min(INK_MAX_COLUMNS, Math.max(1, Math.ceil(w / INK_COLUMN_PITCH)));
    const out: CoverPoint[] = [];
    for (let i = 0; i < rows; i += 1) {
        for (let j = 0; j < columns; j += 1) {
            const [x, y] = onPage(f, left + ((j + 0.5) * w) / columns - f.w / 2, top + ((i + 0.5) * h) / rows - f.h / 2);
            out.push({ x, y, kind: 'ink' });
        }
    }
    return out;
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
 * Where a hit on something other than the figure stands against the figure's
 * own price column (`.item-p`): `outside` it; `column` — a box of the column
 * that holds the figure, the column itself and `.item-a` included, whose
 * pseudo moved over the figure reports as that box; or `inside`, a true
 * sibling of the figure in the column. `inColumn`: the column holds the
 * hit; `holdsNode`: the hit holds the figure.
 */
export function columnPlace(inColumn: boolean, holdsNode: boolean): 'column' | 'inside' | 'outside' {
    return !inColumn ? 'outside' : holdsNode ? 'column' : 'inside';
}

/**
 * Whether a hit on something other than the figure is excused because it
 * stands inside the figure's own price column (`columnPlace`): only a true
 * sibling, only at a corner point, and only one that no box between it and
 * the column moved (`moved`: the first move found on the hit or its
 * ancestors below the column, or undefined). A hit on a box that holds the
 * figure is never excused.
 */
export function columnExcuses(kind: PointKind, hit: 'column' | 'inside' | 'outside', moved: string | undefined): boolean {
    return hit === 'inside' && kind === 'corner' && moved === undefined;
}
