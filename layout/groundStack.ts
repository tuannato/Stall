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
 * Whether a gradient layer of a background paints every pixel of its clip
 * area (round 6, the critic's P1-2 on round 5: a white layer one pixel
 * square, `no-repeat`, was read over the whole box and hid a ground in the
 * ink's own colour). Its tiles are read, not trusted: a layer covers its
 * clip area only when it **repeats on both axes** (`repeat` or `round`,
 * whose tiles meet edge to edge wherever the position puts the first — a
 * `space` leaves gaps between them, and `no-repeat`, `repeat-x` and
 * `repeat-y` leave the box but the tile's own row, column or rect) **and
 * its tile has an area** (`size`, the layer's computed `background-size`:
 * `auto`, `cover` and `contain` are the positioning `area` for a gradient,
 * which has no size of its own, and that area must have both a width and a
 * height; a length or a percentage of the area must be more than nothing,
 * and anything this reader does not take apart — a `calc()` — is not
 * proved). A layer that does not cover is a paint that
 * may not be under a given pixel, and the probe judges every cell both with
 * it and without it. `repeat` is one layer's keywords, `size` one layer's
 * value.
 */
export function layerCovers(repeat: string, size: string, area: { w: number; h: number }): boolean {
    const keys = repeat.trim().split(/\s+/);
    if (keys.length > 2 || !keys.every((k) => k === 'repeat' || k === 'round')) return false;
    // A positioning area with no width or no height places no tile this
    // reader can vouch for, whatever the size says.
    if (!(area.w > 0 && area.h > 0)) return false;
    const tokens = size.trim().split(/\s+(?![^(]*\))/).filter((t) => t !== '');
    if (tokens.length === 1 && (tokens[0] === 'cover' || tokens[0] === 'contain')) return true;
    if (tokens.length < 1 || tokens.length > 2) return false;
    const [w, h = 'auto'] = tokens;
    const dim = (t: string): boolean => t === 'auto' || /^([\d.]*[1-9][\d.]*)(px|%)$/.test(t);
    return dim(w!) && dim(h);
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
 * composited in paint order (`paints` is bottom first), a gradient tried at
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
