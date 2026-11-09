/**
 * **The ground under a money figure's glyphs, composited** (round 5 of
 * `a-money-figure-is-never-misdressed`, the critic's P1-1 and P1-2 on round
 * 4). The pure half: reading the colours a computed value writes, putting
 * paints together the way a browser does, and judging what lands under the
 * glyphs. The probe (`groundWalkRead` in `layout/probe.ts`) reads the
 * paints off the page, resolves every colour through the engine and hands
 * them here.
 *
 * Round 4 judged each paint alone and dropped one under half opaque, so
 * five layers of the ink's own colour at 0.49 — 0.97 opaque together —
 * passed; and it read a colour only in the three syntaxes it parsed, so a
 * ground in `color-mix(in oklch, currentColor 100%, transparent)`, which
 * Chrome computes as `oklch(…)`, was no colour at all. Here every colour is
 * a colour, and the paints that meet a stretch of ink are composited in
 * paint order before anything is judged.
 */
import { contrastRatio } from '../src/domain/theme';
import type { Colour } from './atRest';
import type { Box } from '../src/ui/signInk';

/** The colour functions a computed value can carry (CSS Color 4 and 5). */
export const COLOUR_FUNCTIONS: ReadonlySet<string> = new Set([
    'rgb',
    'rgba',
    'hsl',
    'hsla',
    'hwb',
    'lab',
    'lch',
    'oklab',
    'oklch',
    'color',
    'color-mix',
    'light-dark',
    'contrast-color',
    'device-cmyk',
]);
/** The two colour keywords a computed value may keep. */
export const COLOUR_KEYWORDS: ReadonlySet<string> = new Set(['transparent', 'currentcolor']);

/**
 * What a computed value writes, read for colour: every colour function with
 * its balanced arguments and every colour keyword (`tokens`, as written),
 * and every other bare word outside a colour function (`words`, lower case),
 * which the probe asks the engine about — a named colour is a word. A
 * function that is not a colour's (a gradient's, `url()`'s) is read into.
 * `undefined` when the parentheses do not balance: a value this reader
 * cannot take apart is not one it passes.
 */
export function colourTokens(value: string): { tokens: string[]; words: string[] } | undefined {
    const tokens: string[] = [];
    const words: string[] = [];
    const ident = /-{0,2}[A-Za-z_][A-Za-z0-9_-]*/y;
    const hex = /#[0-9A-Fa-f]+/y;
    const unit = /[0-9.]+[A-Za-z%]*/y;
    let depth = 0;
    for (let i = 0; i < value.length; ) {
        const c = value[i]!;
        if (c === '"' || c === "'") {
            // A string (a `url("…")`'s): skipped whole.
            const end = value.indexOf(c, i + 1);
            if (end < 0) return undefined;
            i = end + 1;
            continue;
        }
        if (c === '(') {
            depth += 1;
            i += 1;
            continue;
        }
        if (c === ')') {
            depth -= 1;
            if (depth < 0) return undefined;
            i += 1;
            continue;
        }
        // A number with its unit (`0px`, `66%`, `1e-05`): no colour.
        unit.lastIndex = i;
        const n = /[0-9.]/.test(c) ? unit.exec(value) : null;
        if (n !== null) {
            i += n[0]!.length;
            continue;
        }
        // A hex colour, kept as a token (Chrome computes none, but a value
        // carrying one is a colour the reader must see).
        hex.lastIndex = i;
        const h = c === '#' ? hex.exec(value) : null;
        if (h !== null) {
            tokens.push(h[0]!);
            i += h[0]!.length;
            continue;
        }
        ident.lastIndex = i;
        const m = ident.exec(value);
        if (m === null) {
            i += 1;
            continue;
        }
        const name = m[0]!;
        const after = i + name.length;
        const lower = name.toLowerCase();
        if (value[after] === '(') {
            if (lower === 'url') {
                // A picture's address: never read for colour.
                const close = closing(value, after);
                if (close < 0) return undefined;
                i = close + 1;
                continue;
            }
            if (COLOUR_FUNCTIONS.has(lower)) {
                const close = closing(value, after);
                if (close < 0) return undefined;
                tokens.push(value.slice(i, close + 1));
                i = close + 1;
                continue;
            }
            i = after;
            continue;
        }
        if (COLOUR_KEYWORDS.has(lower)) tokens.push(name);
        else words.push(lower);
        i = after;
    }
    return depth === 0 ? { tokens, words } : undefined;
}

/** The index of the `)` that closes the `(` at `open`, or -1. */
function closing(value: string, open: number): number {
    let depth = 0;
    for (let i = open; i < value.length; i += 1) {
        if (value[i] === '(') depth += 1;
        else if (value[i] === ')') {
            depth -= 1;
            if (depth === 0) return i;
        }
    }
    return -1;
}

/**
 * A colour as Chrome computes `color-mix(in srgb, <it> 100%, transparent)`:
 * `color(srgb r g b)` or `color(srgb r g b / a)`, a channel outside 0–1
 * clipped to it (the display's own answer for a colour out of gamut), or a
 * legacy `rgb()`/`rgba()`. `undefined` for anything else.
 */
export function srgbColour(text: string): Colour | undefined {
    const num = (v: string): number => (v === 'none' ? 0 : Number(v));
    const clip = (v: number): number => Math.min(1, Math.max(0, v));
    const f = /^color\(srgb\s+(\S+)\s+(\S+)\s+([^\s/)]+)(?:\s*\/\s*([^\s)]+))?\s*\)$/.exec(text.trim());
    if (f !== null) {
        const parts = [f[1]!, f[2]!, f[3]!].map(num);
        const alpha = f[4] === undefined ? 1 : num(f[4]);
        if (![...parts, alpha].every(Number.isFinite)) return undefined;
        return { rgb: parts.map((v) => clip(v) * 255) as [number, number, number], alpha: clip(alpha) };
    }
    const r = /^rgba?\(\s*([-\d.e]+)[\s,]+([-\d.e]+)[\s,]+([-\d.e]+)(?:\s*[,/]\s*([-\d.e]+))?\s*\)$/.exec(text.trim());
    if (r !== null) {
        const parts = [r[1]!, r[2]!, r[3]!].map(Number);
        const alpha = r[4] === undefined ? 1 : Number(r[4]);
        if (![...parts, alpha].every(Number.isFinite)) return undefined;
        return { rgb: parts.map((v) => Math.min(255, Math.max(0, v))) as [number, number, number], alpha: clip(alpha) };
    }
    return undefined;
}

/**
 * The least a gradient layer's tile may measure on an axis, in CSS pixels,
 * for this reader to take its tiles as painting (round 7, the critic's P1-2
 * on round 6): Chrome paints nothing at all for a gradient tile under 1/64px
 * on an axis (measured in Chrome 155: `0.015px` paints nothing, `0.016px`
 * paints the box whole; `0.001px` under `round` nothing), so a tile that
 * small over a ground in the ink's own colour hid the figure while this
 * read composited the layer over it. One pixel is far above that edge, and a
 * tile under it is a paint this reader does not vouch for.
 */
export const MIN_TILE_PX = 1;

/**
 * Where a gradient layer's tiles are proved to paint on one axis: across the
 * whole painting area (its clip area — tiles that repeat meet edge to edge
 * wherever the position puts the first, and go on into the border's bands),
 * across its positioning area alone (one tile at least as large as that
 * area, placed where it covers all of it), or nowhere this reader vouches
 * for.
 */
export type AxisCover = 'painting-area' | 'positioning-area' | 'none';

/** A number as a computed value writes it (`0.5`, `-12`, `1e-05`). */
const NUMBER = '[-+]?(?:\\d+\\.?\\d*|\\.\\d+)(?:e[-+]?\\d+)?';
const PX = new RegExp(`^(${NUMBER})px$`, 'i');
const PERCENT = new RegExp(`^(${NUMBER})%$`, 'i');

/** A computed `background-size` dimension against its positioning area's extent: `auto` the extent (a gradient has no size of its own), a length, or a percentage of it; anything else (a `calc()`) undefined. */
function tileLength(token: string, extent: number): number | undefined {
    if (token === 'auto') return extent;
    const px = PX.exec(token);
    if (px !== null) return Number(px[1]);
    const pct = PERCENT.exec(token);
    return pct === null ? undefined : (Number(pct[1]) / 100) * extent;
}

/**
 * A computed `background-position-x` or `-y` as the tile's offset from the
 * positioning area's start, `free` the area less the tile: a percentage of
 * `free`, a length, or a `calc()` that sums the two (`calc(100% - 10px)`,
 * which Chrome computes `right 10px` to); anything else undefined.
 */
function tileOffset(value: string, free: number): number | undefined {
    const term = (t: string): number | undefined => {
        const px = PX.exec(t);
        if (px !== null) return Number(px[1]);
        const pct = PERCENT.exec(t);
        return pct === null ? undefined : (Number(pct[1]) / 100) * free;
    };
    const v = value.trim();
    const plain = term(v);
    if (plain !== undefined) return plain;
    const inner = /^calc\((.*)\)$/.exec(v)?.[1];
    if (inner === undefined) return undefined;
    const parts = inner.trim().split(/\s+([+-])\s+/);
    let sum = term(parts[0]!);
    for (let i = 1; i < parts.length && sum !== undefined; i += 2) {
        const t = term(parts[i + 1] ?? '');
        sum = t === undefined ? undefined : parts[i] === '+' ? sum + t : sum - t;
    }
    return sum;
}

/** One layer's computed `background-repeat`, axis by axis, or undefined. */
function repeatKeys(repeat: string): readonly [string, string] | undefined {
    const keys = repeat.trim().split(/\s+/);
    if (keys.length === 2) return [keys[0]!, keys[1]!];
    if (keys.length !== 1) return undefined;
    return keys[0] === 'repeat-x' ? ['repeat', 'no-repeat'] : keys[0] === 'repeat-y' ? ['no-repeat', 'repeat'] : [keys[0]!, keys[0]!];
}

/** One layer's computed `background-size` against its positioning area, axis by axis: a dimension not taken apart (a `calc()`) undefined. */
function tileOf(size: string, area: { w: number; h: number }, length: (token: string, extent: number) => number | undefined = tileLength): readonly [number | undefined, number | undefined] {
    const tokens = size.trim().split(/\s+(?![^(]*\))/).filter((t) => t !== '');
    if (tokens.length === 1 && (tokens[0] === 'cover' || tokens[0] === 'contain')) return [area.w, area.h];
    return tokens.length === 1 || tokens.length === 2 ? [length(tokens[0]!, area.w), length(tokens[1] ?? 'auto', area.h)] : [undefined, undefined];
}

/**
 * Where a gradient layer of a background is proved to paint, axis by axis
 * (round 6, the critic's P1-2 on round 5: a white layer one pixel square,
 * `no-repeat`, was read over the whole box and hid a ground in the ink's
 * own colour; round 7, the critic's P1-2 and P2-2 on round 6). Its tiles are
 * read, not trusted, **with each tile dimension resolved against the
 * positioning `area`** (`size`, one layer's computed `background-size`:
 * `auto`, `cover` and `contain` are the area's own extent for a gradient,
 * which has no size of its own; a length; a percentage of the area; a
 * `calc()` is not taken apart):
 * - on an axis that **repeats** (`repeat` or `round`), the tiles meet edge to
 *   edge across the whole painting area — **when the tile is at least
 *   `MIN_TILE_PX` on that axis** (Chrome paints nothing for a tile under
 *   1/64px. `round` rescales a tile so a whole number of them fill its
 *   area: one no larger than the area shrinks by at most a third, still far
 *   above that edge, and one larger becomes the area itself — never under
 *   the edge, since a box with an extent has at least one layout unit,
 *   1/64px, and Chrome paints a tile of that; round 8, the critic's P3-4 on
 *   round 7, where round 7 said "at most a third" of every tile);
 * - on an axis that **does not** (`no-repeat`, `space`, or `repeat-x`'s and
 *   `repeat-y`'s other axis), one tile is placed by the position — it covers
 *   the positioning area's span when it is at least that area and
 *   `MIN_TILE_PX` long and its `position` (one layer's computed
 *   `background-position-x` and `-y`: a percentage, a length, or a `calc()`
 *   of the two) puts it over all of it (a `space` tile at least the area
 *   long is placed once by its position, as `no-repeat` is) — **for a
 *   `scroll` layer alone** (`attachment`, the layer's computed
 *   `background-attachment`). A `local` layer's area scrolls with the
 *   content, and a `fixed` layer's is the viewport only while no box above
 *   it is transformed: under a transform, a `rotate` or a transform
 *   animation, Chrome paints `fixed` as `scroll` (CSS Transforms; measured
 *   by the critic in Chrome 155, a viewport-sized tile at `150% 150%` landed
 *   off a 102 × 37 box), and Rural sways its tag and tilts every third card —
 *   so the critic's FX, a white viewport tile over a ground in the ink's
 *   colour on the Cycle card's figure, read as a white ground there (round
 *   8, the critic's P1-2 on round 7). A lone tile of either proves nothing;
 * - otherwise, nowhere.
 * A layer covers a pixel of its clip area only where both axes say so; the
 * rest of it is a paint that may not be there, judged with it and without
 * it. So a gradient written `no-repeat` that fills its box (the critic's FP)
 * covers its box, and one pixel square (SZ) or under 1/64px (SZt) covers
 * nothing. `area` is the size the tiles are resolved against (`tileArea`):
 * the origin box, or, for a `fixed` layer, the smaller of that box and the
 * viewport on each axis; one with no width or no height places no tile this
 * reader vouches for. The area is the element's bounding box, which for an
 * inline split over lines or a block split over columns is not the box
 * Chrome positions a tile in (it lays the fragments end to end): the caller
 * asks neither `placeTile` nor a lone tile's proof of a box in more than one
 * fragment (`boxPaintsOf`, the seventeenth review's B2: `.pay-q` wraps on a
 * tier-3 face, and a look may tile it).
 */
export function layerCovers(
    repeat: string,
    size: string,
    position: readonly [string, string],
    area: { w: number; h: number },
    attachment = 'scroll',
): readonly [AxisCover, AxisCover] {
    const placed = attachment === 'scroll';
    const pair = repeatKeys(repeat);
    const tile = tileOf(size, area);
    // A hundredth of a pixel of rounding either way: a strip that thin is
    // under what Chrome paints a tile in at all.
    const slack = 0.01;
    const axis = (key: string | undefined, t: number | undefined, extent: number, at: string): AxisCover => {
        if (key === undefined || t === undefined || !(extent > 0) || !(t >= MIN_TILE_PX)) return 'none';
        if (key === 'repeat' || key === 'round') return 'painting-area';
        if ((key !== 'no-repeat' && key !== 'space') || !placed || t < extent - slack) return 'none';
        const offset = tileOffset(at, extent - t);
        return offset !== undefined && offset <= slack && offset + t >= extent - slack ? 'positioning-area' : 'none';
    };
    return [axis(pair?.[0], tile[0], area.w, position[0]), axis(pair?.[1], tile[1], area.h, position[1])];
}

/**
 * The size a layer's tiles are resolved against (`layerCovers`' `area`): the
 * layer's origin box (`own`) for a `scroll` or `local` layer. A `fixed`
 * layer's positioning area is the viewport, or its origin box where a box
 * above is transformed (Chrome paints it as `scroll` there), and this reader
 * does not ask which: it takes the smaller of the two on each axis, so a tile
 * given as a percentage of its area is never read larger than the engine may
 * paint it (round 8, the critic's P1-2 on round 7). A `fixed` lone tile
 * proves nothing either way; only tiles that repeat are read, and a smaller
 * area only ever reads them smaller.
 */
export function tileArea(
    attachment: string,
    own: { w: number; h: number },
    viewport: { w: number; h: number },
): { w: number; h: number } {
    return attachment === 'fixed' ? { w: Math.min(own.w, viewport.w), h: Math.min(own.h, viewport.h) } : own;
}

/**
 * **Where a layer's tiles stand** (before 8g2, the binding of 3a; J1(a) of
 * D-2026-10-28-01): the first tile's place from the positioning area's corner,
 * its size, and which axes repeat. A tile that does not repeat on an axis
 * paints there only over its own span, and one that repeats covers the whole
 * clip area on that axis. Read only where every value is one this reader
 * takes apart, and `undefined` otherwise: `layerCovers` then reads the layer
 * as before, a paint that may be anywhere in its clip area and may be absent.
 * So undefined for a `fixed` or `local` layer (whose area is not the box the
 * caller holds, `layerCovers`'s FX), for `round` and `space` (which move and
 * rescale the tiles), for a tile under `MIN_TILE_PX` (which the engine may
 * not paint at all), and for a size or a position not taken apart (a `min()`).
 */
export type TilePlace = { x: number; y: number; w: number; h: number; repeatX: boolean; repeatY: boolean };

export function placeTile(
    repeat: string,
    size: string,
    position: readonly [string, string],
    area: { w: number; h: number },
    attachment = 'scroll',
): TilePlace | undefined {
    if (attachment !== 'scroll' || !(area.w > 0) || !(area.h > 0)) return undefined;
    const keys = repeatKeys(repeat);
    if (keys === undefined || !keys.every((k) => k === 'repeat' || k === 'no-repeat')) return undefined;
    // A `calc()` of a length and a percentage is taken apart here (Chrome keeps `calc(100% - 32px)`), where `layerCovers` proves nothing by one.
    const [w, h] = tileOf(size, area, (token, extent) => (token === 'auto' ? extent : tileOffset(token, extent)));
    if (w === undefined || h === undefined || !(w >= MIN_TILE_PX) || !(h >= MIN_TILE_PX)) return undefined;
    const x = tileOffset(position[0], area.w - w);
    const y = tileOffset(position[1], area.h - h);
    if (x === undefined || y === undefined) return undefined;
    return { x, y, w, h, repeatX: keys[0] === 'repeat', repeatY: keys[1] === 'repeat' };
}

/** The strip of the page a tile plan can paint, the positioning area's corner at (`left`, `top`): the tile's own span on an axis that does not repeat, and every place on one that does. */
export function tileBand(tile: TilePlace, left: number, top: number): Box {
    return {
        left: tile.repeatX ? -Infinity : left + tile.x,
        right: tile.repeatX ? Infinity : left + tile.x + tile.w,
        top: tile.repeatY ? -Infinity : top + tile.y,
        bottom: tile.repeatY ? Infinity : top + tile.y + tile.h,
    };
}

/**
 * Whether one tile holds the whole of the gradient the area shows: on each
 * axis that repeats, a tile at least the area long (it meets the next one
 * only past the area, in the border's bands). Tiles smaller than that show
 * the gradient many times over a line of ink, and the engine snaps their
 * period to device pixels, so a stop's place is not read in them.
 */
export function tileHoldsItsGradient(tile: TilePlace, area: { w: number; h: number }): boolean {
    const slack = 0.01;
    return (!tile.repeatX || tile.w >= area.w - slack) && (!tile.repeatY || tile.h >= area.h - slack);
}

/**
 * A gradient's computed text, read: which kind, what stands before its first
 * stop, and its stops and transition hints in order (`colour` undefined for a
 * hint, `at` a position as written). `undefined` for anything this reader
 * does not place: a repeating or conic gradient, a prefixed form, an
 * interpolation written out (`in oklch`: the colours between two stops are
 * not a mix of them), or a stop it cannot split.
 */
export type GradientText = { kind: 'linear' | 'radial'; head: string; items: readonly { colour?: string; at?: string }[] };

const GRADIENT_HEAD = /^(?:to\b|in\b|at\b|circle\b|ellipse\b|closest-|farthest-|[-+.\d]|calc\()/i;

/** A value split at its top-level commas. */
function topLevelCommas(value: string): string[] {
    const out: string[] = [];
    let depth = 0;
    let from = 0;
    for (let i = 0; i < value.length; i += 1) {
        if (value[i] === '(') depth += 1;
        else if (value[i] === ')') depth -= 1;
        else if (value[i] === ',' && depth === 0) {
            out.push(value.slice(from, i).trim());
            from = i + 1;
        }
    }
    out.push(value.slice(from).trim());
    return out;
}

/** A value split at its top-level spaces. */
function topLevelWords(value: string): string[] {
    const out: string[] = [];
    let depth = 0;
    let from = 0;
    for (let i = 0; i < value.length; i += 1) {
        if (value[i] === '(') depth += 1;
        else if (value[i] === ')') depth -= 1;
        else if (/\s/.test(value[i]!) && depth === 0) {
            if (i > from) out.push(value.slice(from, i));
            from = i + 1;
        }
    }
    if (value.length > from) out.push(value.slice(from));
    return out;
}

/** The colour a stop starts with and what stands after it, or undefined for a bare position (a hint). */
function leadingColour(arg: string): { colour: string; rest: string } | undefined {
    if (arg[0] === '#') {
        const hex = /^#[0-9A-Fa-f]+/.exec(arg)?.[0];
        return hex === undefined ? undefined : { colour: hex, rest: arg.slice(hex.length).trim() };
    }
    const name = /^-{0,2}[A-Za-z_][A-Za-z0-9_-]*/.exec(arg)?.[0];
    if (name === undefined || name.toLowerCase() === 'calc') return undefined;
    if (arg[name.length] !== '(') return { colour: name, rest: arg.slice(name.length).trim() };
    if (!COLOUR_FUNCTIONS.has(name.toLowerCase())) return undefined;
    const close = closing(arg, name.length);
    return close < 0 ? undefined : { colour: arg.slice(0, close + 1), rest: arg.slice(close + 1).trim() };
}

export function readGradient(layer: string): GradientText | undefined {
    const m = /^(linear|radial)-gradient\(/i.exec(layer.trim());
    if (m === null) return undefined;
    const text = layer.trim();
    const open = m[0].length - 1;
    if (closing(text, open) !== text.length - 1) return undefined;
    const args = topLevelCommas(text.slice(open + 1, -1));
    const head = GRADIENT_HEAD.test(args[0] ?? '') ? args.shift()! : '';
    if (/(?:^|\s)in\s/i.test(head)) return undefined;
    const items: { colour?: string; at?: string }[] = [];
    for (const arg of args) {
        const stop = leadingColour(arg);
        if (stop === undefined) {
            // A hint is one position and nothing else.
            if (topLevelWords(arg).length !== 1) return undefined;
            items.push({ at: arg });
            continue;
        }
        const at = topLevelWords(stop.rest);
        if (at.length > 2) return undefined;
        if (at.length === 0) items.push({ colour: stop.colour });
        for (const one of at) items.push({ colour: stop.colour, at: one });
    }
    if (items.filter((i) => i.colour !== undefined).length < 2) return undefined;
    return { kind: m[1]!.toLowerCase() as 'linear' | 'radial', head, items };
}

/** A gradient's shape in its tile: its line (where 0% to 100% run, `length` px long, through the centre along (`ux`, `uy`)), or its centre and the ending shape's radii. */
export type GradientShape =
    | { kind: 'linear'; cx: number; cy: number; ux: number; uy: number; length: number }
    | { kind: 'radial'; cx: number; cy: number; rx: number; ry: number };

/** A linear gradient's direction as a unit vector, from what stands before its stops (`''` is `to bottom`): undefined for a head this reader does not take apart. */
function linearDirection(head: string, w: number, h: number): readonly [number, number] | undefined {
    if (head === '') return [0, 1];
    const deg = new RegExp(`^(${NUMBER})deg$`, 'i').exec(head);
    if (deg !== null) {
        const a = (Number(deg[1]) * Math.PI) / 180;
        return [Math.sin(a), -Math.cos(a)];
    }
    const to = /^to\s+(.*)$/i.exec(head);
    if (to === null) return undefined;
    const sides = to[1]!.trim().toLowerCase().split(/\s+/);
    let sx = 0;
    let sy = 0;
    for (const side of sides) {
        if (side === 'left') sx = -1;
        else if (side === 'right') sx = 1;
        else if (side === 'top') sy = -1;
        else if (side === 'bottom') sy = 1;
        else return undefined;
    }
    if (sides.length > 2 || (sx === 0 && sy === 0)) return undefined;
    if (sx === 0 || sy === 0) return [sx, sy];
    // To a corner: perpendicular to the line through the two other corners.
    const norm = Math.hypot(h, w);
    return [(sx * h) / norm, (sy * w) / norm];
}

/** A radial gradient's ending shape from what stands before its stops, in a tile `w` × `h`: undefined for a head this reader does not take apart, and for a shape with no extent (the engine draws those another way). */
function radialShape(head: string, w: number, h: number): GradientShape | undefined {
    const at = /^(.*?)(?:^|\s)at\s+(.*)$/i.exec(head);
    const size = (at === null ? head : at[1]!).trim();
    let cx = w / 2;
    let cy = h / 2;
    if (at !== null) {
        const place = topLevelWords(at[2]!);
        if (place.length !== 2) return undefined;
        const x = tileOffset(place[0]!, w);
        const y = tileOffset(place[1]!, h);
        if (x === undefined || y === undefined) return undefined;
        cx = x;
        cy = y;
    }
    const tokens = size === '' ? [] : topLevelWords(size).map((t) => t.toLowerCase());
    const shapeWord = tokens.find((t) => t === 'circle' || t === 'ellipse');
    const rest = tokens.filter((t) => t !== 'circle' && t !== 'ellipse');
    const extent = rest.length === 1 && /^(?:closest|farthest)-(?:side|corner)$/.test(rest[0]!) ? rest[0]! : undefined;
    const lengths = extent === undefined ? rest : [];
    if (lengths.length > 2) return undefined;
    const circle = shapeWord === 'circle' || lengths.length === 1;
    if (circle && (lengths.length > 1 || shapeWord === 'ellipse')) return undefined;
    const done = (rx: number, ry: number): GradientShape | undefined => (rx > 0 && ry > 0 && Number.isFinite(rx) && Number.isFinite(ry) ? { kind: 'radial', cx, cy, rx, ry } : undefined);
    if (lengths.length > 0) {
        if (circle) {
            const r = PX.exec(lengths[0]!);
            return r === null ? undefined : done(Number(r[1]), Number(r[1]));
        }
        const rx = tileOffset(lengths[0]!, w);
        const ry = tileOffset(lengths[1] ?? '', h);
        return rx === undefined || ry === undefined ? undefined : done(rx, ry);
    }
    const near = (extent ?? 'farthest-corner').startsWith('closest');
    const pick = near ? Math.min : Math.max;
    const sideX = pick(Math.abs(cx), Math.abs(w - cx));
    const sideY = pick(Math.abs(cy), Math.abs(h - cy));
    if ((extent ?? 'farthest-corner').endsWith('side')) {
        const r = pick(sideX, sideY);
        return circle ? done(r, r) : done(sideX, sideY);
    }
    const corners = [
        [cx, cy],
        [w - cx, cy],
        [cx, h - cy],
        [w - cx, h - cy],
    ].map(([dx, dy]) => [Math.abs(dx!), Math.abs(dy!)] as const);
    const corner = corners.reduce((a, b) => {
        const closer = Math.hypot(b[0], b[1]) < Math.hypot(a[0], a[1]);
        return closer === near ? b : a;
    });
    if (circle) return done(Math.hypot(corner[0], corner[1]), Math.hypot(corner[0], corner[1]));
    if (!(sideX > 0) || !(sideY > 0)) return undefined;
    const aspect = sideX / sideY;
    const rx = Math.hypot(corner[0], corner[1] * aspect);
    return done(rx, rx / aspect);
}

/**
 * A gradient placed in a tile `w` × `h`: its shape and each colour stop's
 * position in units of the gradient line (0 to 1, a radial's at the ending
 * shape), in order, by the rules CSS gives: a first or last stop with no
 * position at 0 or 1, a position under one written before it raised to that
 * one, and a run with none spaced evenly. `undefined` for anything this
 * reader does not take apart (a `min()`, a head it cannot read).
 */
export function placeGradient(text: GradientText, w: number, h: number): { shape: GradientShape; at: number[] } | undefined {
    let shape: GradientShape | undefined;
    let length: number;
    if (text.kind === 'linear') {
        const dir = linearDirection(text.head, w, h);
        if (dir === undefined) return undefined;
        length = Math.abs(w * dir[0]) + Math.abs(h * dir[1]);
        if (!(length > 0)) return undefined;
        shape = { kind: 'linear', cx: w / 2, cy: h / 2, ux: dir[0], uy: dir[1], length };
    } else {
        shape = radialShape(text.head, w, h);
        if (shape === undefined || shape.kind !== 'radial') return undefined;
        length = shape.rx;
    }
    const raw: { at: number | undefined; stop: boolean }[] = [];
    for (const item of text.items) {
        if (item.at === undefined) {
            raw.push({ at: undefined, stop: true });
            continue;
        }
        const px = tileOffset(item.at, length);
        if (px === undefined) return undefined;
        raw.push({ at: px / length, stop: item.colour !== undefined });
    }
    const stopsAt = raw.flatMap((r, i) => (r.stop ? [i] : []));
    raw[stopsAt[0]!]!.at ??= 0;
    raw[stopsAt[stopsAt.length - 1]!]!.at ??= 1;
    let most = -Infinity;
    for (const r of raw) {
        if (r.at === undefined) continue;
        r.at = Math.max(r.at, most);
        most = r.at;
    }
    for (let i = 0; i < raw.length; i += 1) {
        if (raw[i]!.at !== undefined) continue;
        let j = i;
        while (raw[j]!.at === undefined) j += 1;
        const from = raw[i - 1]!.at!;
        const to = raw[j]!.at!;
        for (let k = i; k < j; k += 1) raw[k]!.at = from + ((to - from) * (k - i + 1)) / (j - i + 1);
    }
    return { shape, at: raw.filter((r) => r.stop).map((r) => r.at!) };
}

/**
 * A gradient where it stands on the page: its shape in its tile, the first
 * tile's corner and size, which axes repeat, and its stops in order. The
 * paints of `layout/probe.ts` carry one where every value was read.
 */
export type GradientPlace = {
    shape: GradientShape;
    tile: { left: number; top: number; w: number; h: number; repeatX: boolean; repeatY: boolean };
    stops: readonly { at: number; colour: Colour }[];
};

/** The gradient moved with what carries it. */
export function shiftPlace(place: GradientPlace, dx: number, dy: number): GradientPlace {
    return { ...place, tile: { ...place.tile, left: place.tile.left + dx, top: place.tile.top + dy } };
}

/**
 * A pixel either way on where a stop falls: the engine snaps a box to device
 * pixels, and a stop a pixel off a stretch of ink is not one this read may
 * prove elsewhere.
 */
export const STOP_SLACK_PX = 1;

/** The stretch of a gradient's line a box (in its tile) lies on, in units of that line, a pixel wider each way (`STOP_SLACK_PX`). */
function rangeOver(shape: GradientShape, b: Box): readonly [number, number] {
    if (shape.kind === 'linear') {
        const ts = [b.left, b.right].flatMap((x) => [b.top, b.bottom].map((y) => 0.5 + ((x - shape.cx) * shape.ux + (y - shape.cy) * shape.uy) / shape.length));
        const slack = STOP_SLACK_PX / shape.length;
        return [Math.min(...ts) - slack, Math.max(...ts) + slack];
    }
    const norm = (x: number, y: number): number => Math.hypot((x - shape.cx) / shape.rx, (y - shape.cy) / shape.ry);
    const nearX = Math.min(b.right, Math.max(b.left, shape.cx));
    const nearY = Math.min(b.bottom, Math.max(b.top, shape.cy));
    const far = Math.max(...[b.left, b.right].flatMap((x) => [b.top, b.bottom].map((y) => norm(x, y))));
    const slack = STOP_SLACK_PX / Math.min(shape.rx, shape.ry);
    return [norm(nearX, nearY) - slack, far + slack];
}

/** The tiles of one axis a span meets, by index: the one tile on an axis that does not repeat. */
function tilesMet(from: number, to: number, origin: number, size: number, repeats: boolean): number[] {
    if (!repeats) return [0];
    const out: number[] = [];
    for (let i = Math.floor((from - origin) / size); origin + i * size < to; i += 1) out.push(i);
    return out;
}

/** The most tiles of a gradient one cell is read over before all its stops are taken (`stopsOver`). */
const STOPS_TILES_CAP = 16;

/**
 * The stops of a gradient that bear on a cell: every stop whose position
 * falls on the stretch of the line the cell lies on, and the stop on either
 * side of that stretch, whose colour the ramp there is still a mix of. A stop
 * past them is proved elsewhere, and is no candidate. Read in every tile the
 * cell meets (a tile repeats only past its own area: `tileHoldsItsGradient`).
 */
export function stopsOver(place: GradientPlace, cell: Box): readonly Colour[] {
    const { tile, stops } = place;
    const xs = tilesMet(cell.left, cell.right, tile.left, tile.w, tile.repeatX);
    const ys = tilesMet(cell.top, cell.bottom, tile.top, tile.h, tile.repeatY);
    if (xs.length * ys.length > STOPS_TILES_CAP || xs.length * ys.length === 0) return stops.map((s) => s.colour);
    let low = Infinity;
    let high = -Infinity;
    for (const ix of xs) {
        for (const iy of ys) {
            const left = tile.left + ix * tile.w;
            const top = tile.top + iy * tile.h;
            const part = {
                left: Math.max(cell.left, left) - left,
                right: Math.min(cell.right, left + tile.w) - left,
                top: Math.max(cell.top, top) - top,
                bottom: Math.min(cell.bottom, top + tile.h) - top,
            };
            if (part.right < part.left || part.bottom < part.top) continue;
            const [a, b] = rangeOver(place.shape, part);
            low = Math.min(low, a);
            high = Math.max(high, b);
        }
    }
    if (low > high) return stops.map((s) => s.colour);
    let first = 0;
    for (let i = 0; i < stops.length; i += 1) if (stops[i]!.at <= low) first = i;
    let last = stops.length - 1;
    for (let i = stops.length - 1; i >= 0; i -= 1) if (stops[i]!.at >= high) last = i;
    return stops.slice(first, Math.max(first, last) + 1).map((s) => s.colour);
}

/** A colour's relative luminance, read off the one contrast formula the app uses (black's luminance is 0). */
export function luminance(rgb: readonly [number, number, number]): number {
    return contrastRatio({ r: rgb[0], g: rgb[1], b: rgb[2] }, { r: 0, g: 0, b: 0 }) * 0.05 - 0.05;
}

/** Paints composited source-over, bottom first, from nothing: the stack's own colour (un-premultiplied) and how opaque it is together. */
export function composite(layers: readonly Colour[]): Colour {
    let pr = 0;
    let pg = 0;
    let pb = 0;
    let a = 0;
    for (const l of layers) {
        const k = l.alpha;
        pr = l.rgb[0] * k + pr * (1 - k);
        pg = l.rgb[1] * k + pg * (1 - k);
        pb = l.rgb[2] * k + pb * (1 - k);
        a = k + a * (1 - k);
    }
    return a > 0 ? { rgb: [pr / a, pg / a, pb / a], alpha: a } : { rgb: [0, 0, 0], alpha: 0 };
}

/**
 * Whether every colour a stack of these paints could put under the glyphs
 * reads at `floor` against `ink`, whatever subset of them meets the ink, in
 * whatever order, wherever a gradient's stop falls — so the probe can pass
 * a stack without reading its geometry. A composite's colour is, channel by
 * channel, a weighted mean of the paints' colours (browsers blend in
 * encoded sRGB), and where the stack is judged at all (at least
 * `alphaFloor` opaque together) a paint of alpha α weighs at most
 * α / `alphaFloor` of it: its share is α times what lies over it, over the
 * total. So each channel lies between the lightest and darkest mean those
 * caps allow (`meanBound`), the composite's luminance between the
 * luminances of those two colours, and if that span lies wholly on one side
 * of the band of luminances that read under `floor` against the ink, no
 * composite does. Every candidate (a gradient's every stop) is counted as a
 * paint of its own, which only loosens the bound. Paints at alpha 0 weigh
 * nothing; caps that cannot reach a whole are a stack never `alphaFloor`
 * opaque, which reads.
 */
export function everyMixReads(
    paints: readonly (readonly Colour[])[],
    ink: readonly [number, number, number],
    floor: number,
    alphaFloor: number,
): boolean {
    const items = paints.flat().filter((c) => c.alpha > 0);
    if (items.reduce((n, c) => n + Math.min(1, c.alpha / alphaFloor), 0) < 1) return true;
    const lo = [0, 1, 2].map((i) => meanBound(items, i, alphaFloor, 'least')) as [number, number, number];
    const hi = [0, 1, 2].map((i) => meanBound(items, i, alphaFloor, 'most')) as [number, number, number];
    const li = luminance(ink);
    // A luminance L reads under `floor` against the ink exactly when it lies
    // strictly inside (bandLow, bandHigh).
    const bandLow = (li + 0.05) / floor - 0.05;
    const bandHigh = floor * (li + 0.05) - 0.05;
    return luminance(hi) <= bandLow || luminance(lo) >= bandHigh;
}

/** The least (or most) a channel's weighted mean can be when each colour weighs at most its alpha over `alphaFloor` and the weights make a whole. */
function meanBound(items: readonly Colour[], channel: number, alphaFloor: number, which: 'least' | 'most'): number {
    const sorted = [...items].sort((a, b) => (which === 'least' ? a.rgb[channel]! - b.rgb[channel]! : b.rgb[channel]! - a.rgb[channel]!));
    let left = 1;
    let sum = 0;
    for (const c of sorted) {
        const take = Math.min(left, c.alpha / alphaFloor);
        sum += take * c.rgb[channel]!;
        left -= take;
        if (left <= 0) break;
    }
    return sum;
}

/** How opaque a stack could be at most: each paint at its most opaque candidate, all of them meeting. */
export function mostOpaque(paints: readonly (readonly Colour[])[]): number {
    return 1 - paints.reduce((keep, candidates) => keep * (1 - Math.max(0, ...candidates.map((c) => c.alpha))), 1);
}

/**
 * One paint as the judge reads it: its name, its candidate colours (one, or a
 * gradient's stops), where it paints and, for a gradient whose every value was
 * read, where its stops fall (`gradient`: only the stops that bear on a cell
 * are candidates there, `stopsOver`). `picture` marks a paint whose colours no
 * read here takes (a `url()` layer, a box this rule cannot read), which the
 * judge composites as absent and `picturesShowing` names where it shows; `fault`
 * is the sentence a picture fails with where it shows (the figure's own
 * background picture, a border image that is one, a box above that cannot be
 * read), and a picture with none is named and left to the contrast pass (a box
 * above's background picture).
 */
export type StackPaint = { what: string; candidates: readonly Colour[]; rects: readonly Box[]; gradient?: GradientPlace; picture?: boolean; fault?: string };

/** What the judge found under a stretch of ink: the composite, its ratio and the paints in it, top first; or how many ways of choosing its stops one cell had, over the cap, where no cell failed. */
export type StackVerdict = { ground: Colour; ratio: number; paints: string[] } | { tooMany: number };

/**
 * The alpha at which a paint is taken to hide everything below it, the walk's
 * own threshold for an opaque background colour (the read's before the binding,
 * `bg.alpha >= 0.999`).
 */
export const OPAQUE_ALPHA = 0.999;

/** Whether a paint hides what is below it wherever it paints: every colour it may be is opaque (one that may be absent, a picture, or none at all, does not). */
export function hidesBelow(p: { candidates: readonly Colour[]; picture?: boolean }): boolean {
    return p.picture !== true && p.candidates.length > 0 && p.candidates.every((c) => c.alpha >= OPAQUE_ALPHA);
}

/**
 * The paints over one cell from the topmost one that hides what is below it,
 * bottom first (before 8g2, 3a): source-over paints nothing of a layer under
 * an opaque one, so every paint below the topmost opaque paint that covers
 * the cell is no part of its ground, and is not tried. `over` is bottom
 * first; the whole list when none hides.
 */
export function fromTopmostOpaque<T extends { candidates: readonly Colour[]; picture?: boolean }>(over: readonly T[]): T[] {
    for (let i = over.length - 1; i >= 0; i -= 1) if (hidesBelow(over[i]!)) return over.slice(i);
    return [...over];
}

/**
 * Why a box on the walk paints none of its own paints, or undefined (before
 * 8g2, 3a; the critic's V and DC): a box whose `visibility` is not
 * `visible` paints no ground, no edge and no shadow (a child set `visible`
 * still paints its own), and one whose `display` is `contents` has no box at
 * all. Either still computes a background colour, and the walk took an
 * opaque one for a ground that hid every paint above it.
 */
export function paintsNothing(visibility: string, display: string): 'invisible' | 'no box' | undefined {
    if (display === 'contents') return 'no box';
    return visibility === 'visible' ? undefined : 'invisible';
}

/** The part of `a` inside `b`, or undefined when it is under half a pixel either way. */
function within(a: Box, b: Box): Box | undefined {
    const i = { left: Math.max(a.left, b.left), right: Math.min(a.right, b.right), top: Math.max(a.top, b.top), bottom: Math.min(a.bottom, b.bottom) };
    return i.right - i.left > 0.5 && i.bottom - i.top > 0.5 ? i : undefined;
}

/** Box `outer` less its part `inner` (inside it), as up to four bands, none under half a pixel either way. */
function around(outer: Box, inner: Box): Box[] {
    return [
        { left: outer.left, right: outer.right, top: outer.top, bottom: inner.top },
        { left: outer.left, right: outer.right, top: inner.bottom, bottom: outer.bottom },
        { left: outer.left, right: inner.left, top: inner.top, bottom: inner.bottom },
        { left: inner.right, right: outer.right, top: inner.top, bottom: inner.bottom },
    ].filter((b) => b.right - b.left > 0.5 && b.bottom - b.top > 0.5);
}

/** A scroll this read takes for a part of an ink: the paints the scroller numbered `by` carries move by (`dx`, `dy`) with it. */
export type ScrollMove = { by: number; dx: number; dy: number };

/**
 * A stretch of ink split by the scrollers that carry it, innermost first
 * (before 8g2, 3a), each part where it stands once scrolled into view: a part
 * inside every scroller's view as it stands, and a part outside one moved
 * into its view by the least scroll that brings it there (`moves`) — the
 * paints that scroller carries moving with it, the scroller's own and every
 * paint it does not carry standing still, so a row below the fold is read
 * over the stall's own paints where it will stand, and never over the
 * scroller's edge, which no content stands over. A scroller moves a part only
 * on an axis it scrolls (`sx`, `sy`); on an axis it clips and cannot scroll
 * (`overflow-x: hidden` beside `overflow-y: auto`) it cuts, as any clip does.
 * `at` numbers the scroller (`ScrollMove`'s `by`). One scroll is taken for
 * each part, the one to the nearest edge of the view; a part larger than the
 * view keeps what fits.
 */
export function byScroller(
    ink: Box,
    scrollers: readonly { at: number; box: Box; sx: boolean; sy: boolean; cx: boolean; cy: boolean }[],
): { part: Box; moves: ScrollMove[] }[] {
    let pieces: { part: Box; moves: ScrollMove[] }[] = [{ part: ink, moves: [] }];
    for (const s of scrollers) {
        const view: Box = {
            left: s.sx ? s.box.left : -Infinity,
            right: s.sx ? s.box.right : Infinity,
            top: s.sy ? s.box.top : -Infinity,
            bottom: s.sy ? s.box.bottom : Infinity,
        };
        const cut: Box = {
            left: !s.sx && s.cx ? s.box.left : -Infinity,
            right: !s.sx && s.cx ? s.box.right : Infinity,
            top: !s.sy && s.cy ? s.box.top : -Infinity,
            bottom: !s.sy && s.cy ? s.box.bottom : Infinity,
        };
        const next: { part: Box; moves: ScrollMove[] }[] = [];
        for (const piece of pieces) {
            const part = within(piece.part, cut);
            if (part === undefined) continue;
            const kept = within(part, view);
            if (kept !== undefined) next.push({ part: kept, moves: piece.moves });
            for (const band of kept === undefined ? [part] : around(part, kept)) {
                const dy = band.top < view.top ? view.top - band.top : band.bottom > view.bottom ? view.bottom - band.bottom : 0;
                const dx = band.left < view.left ? view.left - band.left : band.right > view.right ? view.right - band.right : 0;
                const moved = within({ left: band.left + dx, right: band.right + dx, top: band.top + dy, bottom: band.bottom + dy }, view);
                if (moved !== undefined) next.push({ part: moved, moves: [...piece.moves, { by: s.at, dx, dy }] });
            }
        }
        pieces = next;
    }
    return pieces;
}

/** How far a paint moves with a part scrolled into view: by every scroll of a scroller that carries it (`carried`, numbered as `byScroller`'s `at`). */
export function shiftFor(carried: ReadonlySet<number>, moves: readonly ScrollMove[]): { dx: number; dy: number } {
    let dx = 0;
    let dy = 0;
    for (const m of moves) {
        if (carried.has(m.by)) {
            dx += m.dx;
            dy += m.dy;
        }
    }
    return { dx, dy };
}

/** A paint as it stands over one cell: a placed gradient's candidates are the stops that bear on it (`stopsOver`). */
function atCell(p: StackPaint, cell: Box): StackPaint {
    return p.gradient === undefined ? p : { ...p, candidates: stopsOver(p.gradient, cell) };
}

/**
 * The picture paints (`picture`) that show over any cell of a stretch of ink
 * (before 8g2, 3a; a border image that is a picture since the binding, the
 * twelfth critic's BIP): a picture paint covering a cell, with no paint over
 * it there that hides what is below it. A picture's colours are not read, so
 * it is named, not judged: the contrast pass's, on the screens it samples,
 * unless it carries a `fault` of its own, which the caller fails with.
 */
export function picturesShowing(paints: readonly StackPaint[], ink: Box): StackPaint[] {
    const meeting = paints.filter((p) => p.rects.some((r) => meets(ink, r)) && (p.picture === true || p.candidates.some((c) => c.alpha > 0)));
    if (!meeting.some((p) => p.picture === true)) return [];
    const out = new Set<StackPaint>();
    for (const cell of cellsOf(ink, meeting.flatMap((p) => p.rects))) {
        const over = fromTopmostOpaque(meeting.filter((p) => p.rects.some((r) => covers(r, cell))).map((p) => atCell(p, cell)));
        for (const p of over) if (p.picture === true) out.add(p);
    }
    return [...out];
}

/** The largest number of ways the gradients over one cell may be chosen before the stack is called unreadable. */
export const STACK_CHOICES_CAP = 256;

/** Two boxes share more than half a pixel each way. */
const meets = (a: Box, b: Box): boolean =>
    Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5;

/**
 * The cells of `ink` the paints' edges cut it into: every edge of every rect
 * that meets it, inside it, splits it on its axis, so each cell is covered
 * wholly or not at all by every rect. Cells under half a pixel either way
 * are dropped, as `meets` drops them.
 */
export function cellsOf(ink: Box, rects: readonly Box[]): Box[] {
    const xs = new Set<number>([ink.left, ink.right]);
    const ys = new Set<number>([ink.top, ink.bottom]);
    for (const r of rects) {
        if (!meets(ink, r)) continue;
        for (const x of [r.left, r.right]) if (x > ink.left && x < ink.right) xs.add(x);
        for (const y of [r.top, r.bottom]) if (y > ink.top && y < ink.bottom) ys.add(y);
    }
    const sx = [...xs].sort((a, b) => a - b);
    const sy = [...ys].sort((a, b) => a - b);
    const out: Box[] = [];
    for (let i = 1; i < sx.length; i += 1) {
        for (let j = 1; j < sy.length; j += 1) {
            const cell = { left: sx[i - 1]!, right: sx[i]!, top: sy[j - 1]!, bottom: sy[j]! };
            if (cell.right - cell.left > 0.5 && cell.bottom - cell.top > 0.5) out.push(cell);
        }
    }
    return out;
}

/** Whether a rect covers a cell: its centre is inside (a cell lies wholly inside or wholly outside every rect that cut it). */
const covers = (r: Box, cell: Box): boolean => {
    const x = (cell.left + cell.right) / 2;
    const y = (cell.top + cell.bottom) / 2;
    return x > r.left && x < r.right && y > r.top && y < r.bottom;
};

/** A paint's candidates less those that composite alike: every colour at alpha 0 is nothing at all, and two equal colours are one (a gradient's repeated stops, its transparent ends, and the absence of a tile that may not paint). */
function distinct(candidates: readonly Colour[]): Colour[] {
    const out: Colour[] = [];
    const keys = new Set<string>();
    for (const c of candidates) {
        const key = c.alpha === 0 ? 'none' : `${c.rgb.join(',')}/${c.alpha}`;
        if (keys.has(key)) continue;
        keys.add(key);
        out.push(c);
    }
    return out;
}

/**
 * The worst ground the paints put under one stretch of ink (`ink`, a glyph
 * line's ink box), or `undefined` when every cell reads: the stretch is cut
 * into cells by every paint's edges; on each, the paints that cover it are
 * read from the topmost one that hides what is below it (`fromTopmostOpaque`),
 * composited source-over in paint order (`paints` is bottom first; a blend is
 * the probe's to hold to `normal`), a gradient tried at each stop that bears
 * on the cell (`stopsOver`; every stop where none is placed), and a cell whose
 * composite is at least `alphaFloor` opaque and reads under `floor` against
 * the ink fails. Under `alphaFloor` the cell's ground is mostly what lies below
 * the stack, the contrast pass's. A paint's candidates that composite alike
 * are tried once (`distinct`), and a cell no blend of whose paints can read
 * under the floor passes without its stops being enumerated (`everyMixReads`):
 * neither passes a cell that fails. A picture paint (`picture`) has no colour
 * here, and is composited as absent. More than `STACK_CHOICES_CAP` ways of
 * choosing one cell's stops is a stack this judge cannot read: `tooMany`, and
 * only where no other cell of the ink fails (the twelfth critic's P2: it
 * returned at the first such cell, and hid a failure found in another).
 */
export function worstGround(paints: readonly StackPaint[], ink: Box, inkColour: readonly [number, number, number], floor: number, alphaFloor: number): StackVerdict | undefined {
    const meeting = paints.filter((p) => p.picture !== true && p.rects.some((r) => meets(ink, r)) && p.candidates.some((c) => c.alpha > 0));
    if (meeting.length === 0) return undefined;
    let worst: { ground: Colour; ratio: number; paints: string[] } | undefined;
    let tooMany = 0;
    const seen = new Set<string>();
    for (const cell of cellsOf(ink, meeting.flatMap((p) => p.rects))) {
        const over = fromTopmostOpaque(meeting.filter((p) => p.rects.some((r) => covers(r, cell))).map((p) => atCell(p, cell)));
        const key = over.map((p) => `${p.what}/${p.candidates.length}/${p.candidates.map((c) => `${c.rgb.join(',')}/${c.alpha}`).join(';')}`).join('|');
        if (over.length === 0 || seen.has(key)) continue;
        seen.add(key);
        if (everyMixReads(over.map((p) => p.candidates), inkColour, floor, alphaFloor)) continue;
        const candidates = over.map((p) => distinct(p.candidates));
        const choices = candidates.reduce((n, c) => n * Math.max(1, c.length), 1);
        if (choices > STACK_CHOICES_CAP) {
            tooMany = Math.max(tooMany, choices);
            continue;
        }
        for (let k = 0; k < choices; k += 1) {
            let rest = k;
            const layers = candidates.map((c) => {
                const n = Math.max(1, c.length);
                const one = c[rest % n]!;
                rest = Math.floor(rest / n);
                return one;
            });
            const ground = composite(layers);
            if (ground.alpha < alphaFloor) continue;
            const ratio = contrastRatio({ r: ground.rgb[0], g: ground.rgb[1], b: ground.rgb[2] }, { r: inkColour[0], g: inkColour[1], b: inkColour[2] });
            if (ratio < floor && (worst === undefined || ratio < worst.ratio)) worst = { ground, ratio, paints: [...over].reverse().map((p) => p.what) };
        }
    }
    return worst ?? (tooMany > 0 ? { tooMany } : undefined);
}
