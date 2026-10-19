/**
 * **The ground under a money figure's glyphs, composited** (round 5 of
 * `a-money-figure-is-never-misdressed`, the critic's P1-1 and P1-2 on round
 * 4). The pure half: reading the colours a computed value writes, putting
 * paints together the way a browser does, and judging what lands under the
 * glyphs. The probe (`groundStackFault` in `layout/probe.ts`) reads the
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
 *   1/64px, and `round` rescales a tile by at most a third, still far above
 *   that edge);
 * - on an axis that **does not** (`no-repeat`, `space`, or `repeat-x`'s and
 *   `repeat-y`'s other axis), one tile is placed by the position — it covers
 *   the positioning area's span when it is at least that area and
 *   `MIN_TILE_PX` long and its `position` (one layer's computed
 *   `background-position-x` and `-y`: a percentage, a length, or a `calc()`
 *   of the two) puts it over all of it (a `space` tile at least the area
 *   long is placed once by its position, as `no-repeat` is); `placed` false
 *   (a `local` attachment, whose area scrolls with the content) proves
 *   nothing there;
 * - otherwise, nowhere.
 * A layer covers a pixel of its clip area only where both axes say so; the
 * rest of it is a paint that may not be there, judged with it and without
 * it. So a gradient written `no-repeat` that fills its box (the critic's FP)
 * covers its box, and one pixel square (SZ) or under 1/64px (SZt) covers
 * nothing. `area` is the positioning area's size: its origin box, or the
 * viewport where the layer is `fixed`; one with no width or no height places
 * no tile this reader vouches for.
 */
export function layerCovers(
    repeat: string,
    size: string,
    position: readonly [string, string],
    area: { w: number; h: number },
    placed = true,
): readonly [AxisCover, AxisCover] {
    const keys = repeat.trim().split(/\s+/);
    const pair: readonly [string, string] | undefined =
        keys.length === 1
            ? keys[0] === 'repeat-x'
                ? ['repeat', 'no-repeat']
                : keys[0] === 'repeat-y'
                  ? ['no-repeat', 'repeat']
                  : [keys[0]!, keys[0]!]
            : keys.length === 2
              ? [keys[0]!, keys[1]!]
              : undefined;
    const tokens = size.trim().split(/\s+(?![^(]*\))/).filter((t) => t !== '');
    const tile: readonly [number | undefined, number | undefined] =
        tokens.length === 1 && (tokens[0] === 'cover' || tokens[0] === 'contain')
            ? [area.w, area.h]
            : tokens.length === 1 || tokens.length === 2
              ? [tileLength(tokens[0]!, area.w), tileLength(tokens[1] ?? 'auto', area.h)]
              : [undefined, undefined];
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

/** One paint as the judge reads it: its name, its candidate colours (one, or a gradient's stops) and where it paints. */
export type StackPaint = { what: string; candidates: readonly Colour[]; rects: readonly Box[] };

/** What the judge found under a stretch of ink: the composite, its ratio and the paints in it, top first. */
export type StackVerdict = { ground: Colour; ratio: number; paints: string[] } | { tooMany: number };

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

/**
 * The worst ground the paints put under one stretch of ink (`ink`, a glyph
 * line's ink box), or `undefined` when every cell reads: the stretch is cut
 * into cells by every paint's edges; on each, the paints that cover it are
 * composited source-over in paint order (`paints` is bottom first; a blend
 * is the probe's to hold to `normal`), a gradient tried at
 * each of its stops, and a cell whose composite is at least `alphaFloor`
 * opaque and reads under `floor` against the ink fails. Under `alphaFloor`
 * the cell's ground is mostly what lies below the stack — the contrast
 * pass's. More than `STACK_CHOICES_CAP` ways of choosing the gradients'
 * stops over one cell is a stack this judge cannot read (`tooMany`).
 */
export function worstGround(
    paints: readonly StackPaint[],
    ink: Box,
    inkColour: readonly [number, number, number],
    floor: number,
    alphaFloor: number,
): StackVerdict | undefined {
    const meeting = paints.filter((p) => p.rects.some((r) => meets(ink, r)) && p.candidates.some((c) => c.alpha > 0));
    if (meeting.length === 0) return undefined;
    let worst: StackVerdict | undefined;
    const seen = new Set<string>();
    for (const cell of cellsOf(ink, meeting.flatMap((p) => p.rects))) {
        const over = meeting.filter((p) => p.rects.some((r) => covers(r, cell)));
        const key = over.map((p) => meeting.indexOf(p)).join(',');
        if (over.length === 0 || seen.has(key)) continue;
        seen.add(key);
        const choices = over.reduce((n, p) => n * Math.max(1, p.candidates.length), 1);
        if (choices > STACK_CHOICES_CAP) return { tooMany: choices };
        for (let k = 0; k < choices; k += 1) {
            let rest = k;
            const layers = over.map((p) => {
                const n = Math.max(1, p.candidates.length);
                const c = p.candidates[rest % n]!;
                rest = Math.floor(rest / n);
                return c;
            });
            const ground = composite(layers);
            if (ground.alpha < alphaFloor) continue;
            const ratio = contrastRatio({ r: ground.rgb[0], g: ground.rgb[1], b: ground.rgb[2] }, { r: inkColour[0], g: inkColour[1], b: inkColour[2] });
            if (ratio < floor && (worst === undefined || ('ratio' in worst && ratio < worst.ratio))) {
                worst = { ground, ratio, paints: [...over].reverse().map((p) => p.what) };
            }
        }
    }
    return worst;
}
