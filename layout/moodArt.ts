/**
 * **A mood's page art at its worst** — pure (step 8i, B;
 * `a-mood-art-layer-is-read-at-its-worst`, `PROBE-RULES.md`).
 *
 * A mood's art, and every layer the bare look shares with it, is painted on
 * the stall's root, on an open sheet and on the scroll region, and it stands
 * still while the content scrolls over it: a line on the bare ground passes
 * over every patch of it, as a drop of Neo's rain crosses every line in
 * time. The contrast pass read it at one scroll position. So in every
 * contrast job that wears a mood, the probe (`moodArtAtItsWorst` in
 * `probe.ts`) reads each of those elements' `background-image` layers here
 * and paints, in their place, flat rectangles of the worst ground the
 * layers can put under a line there. This module is the model, and it
 * touches no document.
 *
 * **(a) Toward which ink.** A page holds several inks. The worst ground is
 * chosen for the mood's own `--s-text`: of every colour the stack of layers
 * can paint at a point, composited over the element's own background colour
 * on the mood's `--s-bg`, the one that reads least against `--s-text`
 * (`judgeFor`). On a light mood that is the darkest ground, on a dark mood
 * the lightest. It is the worst for every ink on the text's side of the
 * ground (the muted, the accent, the red, the text itself) while the art
 * stays on the ground's side of that ink. Where a ground reaches past an ink
 * toward the text, the text reads at most a third of its own contrast with
 * that ink there, under 3:1 for every ink within 9:1 of the text, so the
 * text fails first. **The gap, stated:** a line whose ink is on the other
 * side of the ground (a light line on a light mood's ground, a dark one on a
 * dark mood's), or one further than 9:1 from the text, is not read at its
 * worst — its worst is another colour, which this flattening does not paint.
 *
 * **What a layer can paint.** A gradient (`linear`, `radial`, `conic`,
 * repeating or not): every colour on every segment between two consecutive
 * stops, sampled at `SEGMENT_SAMPLES` steps in premultiplied sRGB, as a
 * legacy-syntax gradient interpolates. Its strongest stop is among them, and
 * so is a point between two stops of different hue, which can be darker than
 * either (a composite's luminance along a segment is convex, so its maximum
 * is a stop and its minimum may lie between). A file: every distinct pixel
 * of its raster at its painted size, read in the page (`rasterColours`).
 *
 * **The stack.** Layers are not taken one at a time: a scrap of opaque paper
 * on top, flattened alone, would hide a darker scrap on the layer below that
 * shows wherever the top one is transparent. So the worst ground at a point
 * is searched over the stack, bottom to top (`worstStack`): each layer adds
 * every colour it can paint there over every composite kept so far, and the
 * `BEAM` worst composites are kept for the next. Every layer is taken to
 * reach any phase of every other — two tiles whose periods share nothing
 * meet in every combination somewhere on a long page — which is
 * conservative where layers are drawn to avoid each other.
 *
 * **(b) What area.** A layer that repeats along an axis covers its clip area
 * along it. Along an axis it does not repeat, its tile stands where its size
 * and position put it, and stands still while the content of any scroller
 * scrolls over it: so for every scroller (`overflow` `auto` or `scroll`) that
 * scrolls along that axis and whose box the tile meets, the tile is widened
 * along the axis to the scroller's whole box, across the band its tile spans
 * on the other axis (cut to the scroller) — not the whole page, and not only
 * the tile. A line in that band can be scrolled over every part of the tile.
 * A tile that meets no scroller is read where it is: the lines over it do
 * not move. A line that can be scrolled over a tile can also be scrolled
 * off it, so a layer that is widened may not be under a line at all, in its
 * tile as in the band: a transparent colour is among its own there.
 * `background-attachment: local` moves with the content, so it is read where
 * it is. A layer the element animates the position or size of is taken to
 * cover its whole clip area.
 *
 * **(c) Size, position and clip.** Each layer's own computed size, position,
 * repeat, origin box and clip box (cycled over the layers as CSS cycles
 * them) give its tiles in the element's border box; the probe writes the
 * element's background as the flat rectangles of `worstCells`, each in px
 * from the border box, `no-repeat`, important, so no animation moves them.
 * Every cut is rounded to a whole pixel, so two rectangles meet and never
 * overlap.
 *
 * **(d) What cannot be read** answers a sentence, never a skip (`refused`):
 * an image that is neither a file nor a gradient this module models (an
 * `image-set()`, a prefixed gradient, a gradient interpolated in another
 * colour space or with a colour outside sRGB), a size, a position or a
 * repeat it does not parse, a file layer at `auto`, `cover` or `contain`, a
 * `fixed` attachment, a `text` clip. The probe adds a file that does not
 * load or cannot be read back, a transform on the element or above it, and a
 * blend mode other than `normal`. The runner refuses the job.
 *
 * Tests: `a-mood-art-layer-is-read-at-its-worst` (`moodArt.test.ts`).
 */
import { contrastOf, over, type Rgb } from './rainDrop';

/** A straight-alpha colour: sRGB channels 0–255, alpha 0–1. */
export type Rgba = readonly [number, number, number, number];
export const CLEAR: Rgba = [0, 0, 0, 0];

/** Steps on every segment between two stops of a gradient. */
export const SEGMENT_SAMPLES = 32;

/** The composites kept at each layer of the stack search. */
export const BEAM = 12;

/** `src` over `dst`, straight alpha, source-over in sRGB, as a browser composites background layers. */
export function overRgba(src: Rgba, dst: Rgba): Rgba {
    const a = src[3] + dst[3] * (1 - src[3]);
    if (a <= 0) return CLEAR;
    const ch = (i: number): number => (src[i]! * src[3] + dst[i]! * dst[3] * (1 - src[3])) / a;
    return [ch(0), ch(1), ch(2), a];
}

/** `c` over an opaque ground. */
export function onGround(c: Rgba, ground: Rgb): Rgb {
    return over([c[0], c[1], c[2]], c[3], ground);
}

/** How a composite reads against the mood's text over `base`: the lower, the worse (a). */
export function judgeFor(text: Rgb, base: Rgb): (c: Rgba) => number {
    return (c) => contrastOf(text, onGround(c, base));
}

const NUM = String.raw`[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?`;
const RGB = new RegExp(String.raw`^rgba?\(\s*(${NUM})\s*,\s*(${NUM})\s*,\s*(${NUM})\s*(?:,\s*(${NUM})\s*)?\)$`, 'i');
const SRGB = new RegExp(String.raw`^color\(\s*srgb\s+(${NUM})\s+(${NUM})\s+(${NUM})\s*(?:\/\s*(${NUM})\s*)?\)$`, 'i');

const clamp = (v: number, hi: number): number => Math.min(hi, Math.max(0, v));

/**
 * A colour as Chrome computes one: `rgb()`/`rgba()` with commas, `color(srgb
 * r g b / a)` (what `color-mix()` in sRGB computes to) and `transparent`.
 * Anything else — `oklch()`, `lab()`, `color(display-p3 …)` — is outside
 * sRGB, where this composite does not hold, and answers `undefined`.
 */
export function parseColour(text: string): Rgba | undefined {
    const t = text.trim();
    if (/^transparent$/i.test(t)) return CLEAR;
    let m = RGB.exec(t);
    if (m !== null) return [clamp(+m[1]!, 255), clamp(+m[2]!, 255), clamp(+m[3]!, 255), m[4] === undefined ? 1 : clamp(+m[4], 1)];
    m = SRGB.exec(t);
    if (m !== null) return [clamp(+m[1]! * 255, 255), clamp(+m[2]! * 255, 255), clamp(+m[3]! * 255, 255), m[4] === undefined ? 1 : clamp(+m[4], 1)];
    return undefined;
}

/** A comma-separated CSS list split at its top-level commas (a function's own commas stay inside). */
export function splitTop(value: string): string[] {
    const out: string[] = [];
    let depth = 0;
    let quote: string | undefined;
    let start = 0;
    for (let i = 0; i < value.length; i += 1) {
        const c = value[i]!;
        if (quote !== undefined) {
            if (c === '\\') i += 1;
            else if (c === quote) quote = undefined;
        } else if (c === '"' || c === "'") {
            quote = c;
        } else if (c === '(') {
            depth += 1;
        } else if (c === ')') {
            depth -= 1;
        } else if (c === ',' && depth === 0) {
            out.push(value.slice(start, i));
            start = i + 1;
        }
    }
    out.push(value.slice(start));
    return out.map((x) => x.trim()).filter((x) => x !== '');
}

/** A value split at its top-level spaces. */
function splitSpaces(value: string): string[] {
    const out: string[] = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < value.length; i += 1) {
        const c = value[i]!;
        if (c === '(') depth += 1;
        else if (c === ')') depth -= 1;
        else if (/\s/.test(c) && depth === 0) {
            if (i > start) out.push(value.slice(start, i));
            start = i + 1;
        }
    }
    if (start < value.length) out.push(value.slice(start));
    return out;
}

export type LayerRead = { kind: 'gradient'; colours: Rgba[] } | { kind: 'file'; url: string } | { refused: string };

const GRADIENT = /^(repeating-)?(linear|radial|conic)-gradient\(([\s\S]*)\)$/;
const FUNCTION_HEAD = /^([a-z-]+)\(/i;
/** An item that opens with a colour function is a stop, whatever space its colour is in. */
const COLOUR_FUNCTION = /^(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix|light-dark|device-cmyk)\(/i;
/** A stop's position, or a transition hint: a length, a percentage or an angle, alone or in a `calc()`. */
const POSITION = /^(?:[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?(?:%|px|deg|turn|rad|grad)?|calc\([^()]*\))$/i;

/** The leading function call or word of a stop: its colour, and what follows it. */
function leadingColour(item: string): { colour: string; rest: string } | undefined {
    const head = FUNCTION_HEAD.exec(item);
    if (head !== null) {
        let depth = 0;
        for (let i = head[1]!.length; i < item.length; i += 1) {
            if (item[i] === '(') depth += 1;
            else if (item[i] === ')') {
                depth -= 1;
                if (depth === 0) return { colour: item.slice(0, i + 1), rest: item.slice(i + 1).trim() };
            }
        }
        return undefined;
    }
    const word = /^([a-z]+)\b/i.exec(item);
    return word === null ? undefined : { colour: word[1]!, rest: item.slice(word[0].length).trim() };
}

/**
 * Every colour a gradient paints, from its computed value: each stop, and
 * `SEGMENT_SAMPLES` steps on each segment between two consecutive stops,
 * interpolated in premultiplied sRGB as a legacy-syntax gradient is. A
 * transition hint moves where the colours fall, not which colours they are,
 * and is passed over. Refused: an interpolation space other than sRGB, a
 * stop whose colour is outside sRGB, a gradient with no colour.
 */
export function gradientColours(layer: string): { colours: Rgba[] } | { refused: string } {
    const m = GRADIENT.exec(layer.trim());
    if (m === null) return { refused: 'not a gradient this read models' };
    const items = splitTop(m[3]!);
    const stops: Rgba[] = [];
    for (const [i, item] of items.entries()) {
        if (POSITION.test(item)) continue;
        const lead = leadingColour(item);
        const colour = lead === undefined ? undefined : parseColour(lead.colour);
        if (colour === undefined || lead === undefined || !splitSpaces(lead.rest).every((p) => POSITION.test(p))) {
            // The first item is the gradient's line or shape unless it opens with a colour function.
            if (i === 0 && !COLOUR_FUNCTION.test(item)) {
                // The gradient's line or shape: read for an interpolation space alone.
                const space = /\bin\s+([a-z-]+)/i.exec(item);
                if (space !== null && space[1]!.toLowerCase() !== 'srgb') {
                    return { refused: `a gradient interpolated in ${space[1]}, which this read does not model` };
                }
                continue;
            }
            return { refused: `a gradient stop whose colour this read cannot model: ${item.slice(0, 60)}` };
        }
        stops.push(colour);
    }
    if (stops.length === 0) return { refused: 'a gradient with no colour stop this read can find' };
    const colours: Rgba[] = [stops[0]!];
    for (let s = 1; s < stops.length; s += 1) {
        const [a, b] = [stops[s - 1]!, stops[s]!];
        for (let k = 1; k <= SEGMENT_SAMPLES; k += 1) {
            const t = k / SEGMENT_SAMPLES;
            const alpha = a[3] * (1 - t) + b[3] * t;
            if (alpha <= 0) {
                colours.push(CLEAR);
                continue;
            }
            const ch = (c: number): number => (a[c]! * a[3] * (1 - t) + b[c]! * b[3] * t) / alpha;
            colours.push([ch(0), ch(1), ch(2), alpha]);
        }
    }
    return { colours: distinct(colours) };
}

/** One layer of a computed `background-image` list, read for what it is. */
export function readLayer(layer: string): LayerRead {
    const url = /^url\(\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|([^'"()\s]+))\s*\)$/.exec(layer.trim());
    if (url !== null) return { kind: 'file', url: (url[1] ?? url[2] ?? url[3]!).replace(/\\(.)/g, '$1') };
    if (GRADIENT.test(layer.trim())) {
        const read = gradientColours(layer);
        return 'refused' in read ? read : { kind: 'gradient', colours: read.colours };
    }
    const head = FUNCTION_HEAD.exec(layer.trim());
    return { refused: `${head === null ? 'an image' : `${head[1]}()`} this read does not model` };
}

/** The distinct colours of a list, by their 8-bit channels and alpha in thousandths. */
export function distinct(colours: readonly Rgba[]): Rgba[] {
    const seen = new Map<string, Rgba>();
    for (const c of colours) {
        const key = c[3] <= 0 ? 'clear' : `${c[0].toFixed(1)},${c[1].toFixed(1)},${c[2].toFixed(1)},${c[3].toFixed(3)}`;
        if (!seen.has(key)) seen.set(key, c[3] <= 0 ? CLEAR : c);
    }
    return [...seen.values()];
}

/** Every distinct pixel of a raster read back from a canvas (`getImageData`: straight alpha, 8 bits). */
export function rasterColours(data: ArrayLike<number>): Rgba[] {
    const seen = new Map<number, Rgba>();
    for (let i = 0; i + 3 < data.length; i += 4) {
        const a = data[i + 3]!;
        const key = a === 0 ? -1 : ((data[i]! << 24) | (data[i + 1]! << 16) | (data[i + 2]! << 8) | a) >>> 0;
        if (!seen.has(key)) seen.set(key, a === 0 ? CLEAR : [data[i]!, data[i + 1]!, data[i + 2]!, a / 255]);
    }
    return [...seen.values()];
}

/** A rectangle in an element's border box, in px. */
export type Box = { x0: number; y0: number; x1: number; y1: number };

const meets = (a: Box, b: Box): boolean => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
const cut = (a: Box, b: Box): Box | undefined => {
    const r = { x0: Math.max(a.x0, b.x0), y0: Math.max(a.y0, b.y0), x1: Math.min(a.x1, b.x1), y1: Math.min(a.y1, b.y1) };
    return r.x0 < r.x1 && r.y0 < r.y1 ? r : undefined;
};

/** A length the computed style gives, in px: `Npx`, `N%` of `ref`, `0`, or a `calc()` of those added and subtracted. */
export function lengthOf(token: string, ref: number): number | undefined {
    const t = token.trim();
    const one = (s: string): number | undefined => {
        const m = /^([-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)(px|%)?$/i.exec(s.trim());
        if (m === null) return undefined;
        if (m[2] === undefined) return Number(m[1]) === 0 ? 0 : undefined;
        return m[2] === '%' ? (Number(m[1]) / 100) * ref : Number(m[1]);
    };
    const calc = /^calc\(([^()]*)\)$/i.exec(t);
    if (calc === null) return one(t);
    const terms = calc[1]!.trim().split(/\s+([+-])\s+/);
    let sum = one(terms[0]!);
    for (let i = 1; i < terms.length && sum !== undefined; i += 2) {
        const v = one(terms[i + 1] ?? '');
        sum = v === undefined ? undefined : terms[i] === '-' ? sum - v : sum + v;
    }
    return sum;
}

/** The computed style of one background layer, each longhand already cycled to this layer. */
export type LayerStyle = {
    size: string;
    posX: string;
    posY: string;
    repeat: string;
    origin: string;
    clip: string;
    attachment: string;
};

/** The element's three boxes, in its own border box. */
export type ElementBoxes = { 'border-box': Box; 'padding-box': Box; 'content-box': Box };

/** A box that scrolls its content: its showing part in the element's border box, and the axes it scrolls along. */
export type Scroller = { box: Box; x: boolean; y: boolean };

/**
 * Where a layer paints: its tiles, the band (b) widens them to, the tile's
 * painted size, and whether a line under its tiles can be moved off it
 * (`absent`: it is widened, or it moves).
 */
export type Coverage = { tiles: Box[]; bands: Box[]; tile: { w: number; h: number }; absent: boolean };

const REPEAT_COVERS = new Set(['repeat', 'round', 'space']);

/** A layer's repeat, per axis: whether it tiles along it. */
export function repeatsOf(repeat: string): { x: boolean; y: boolean } | undefined {
    const words = repeat.trim().split(/\s+/);
    if (words.length === 1) {
        const w = words[0]!;
        if (w === 'repeat-x') return { x: true, y: false };
        if (w === 'repeat-y') return { x: false, y: true };
        if (w === 'no-repeat') return { x: false, y: false };
        if (REPEAT_COVERS.has(w)) return { x: true, y: true };
        return undefined;
    }
    if (words.length === 2 && words.every((w) => w === 'no-repeat' || REPEAT_COVERS.has(w))) {
        return { x: REPEAT_COVERS.has(words[0]!), y: REPEAT_COVERS.has(words[1]!) };
    }
    return undefined;
}

/**
 * Where one layer paints (b, c), or why it cannot be read (d). `file` is
 * true for a file layer, whose size must be stated (no `auto`, `cover` or
 * `contain`: its intrinsic size is not read here); a gradient's `auto` is
 * its origin box, as CSS sizes an image with no intrinsic size. `moving`: the
 * element animates this layer's position or size, so it may stand anywhere
 * along both axes.
 */
export function layerCoverage(
    style: LayerStyle,
    boxes: ElementBoxes,
    file: boolean,
    scrollers: readonly Scroller[],
    moving: boolean,
): Coverage | { refused: string } {
    const origin = boxes[style.origin as keyof ElementBoxes];
    const clip = boxes[style.clip as keyof ElementBoxes];
    if (origin === undefined) return { refused: `background-origin ${style.origin}, which this read does not model` };
    if (clip === undefined) return { refused: `background-clip ${style.clip}, which this read does not model` };
    if (style.attachment !== 'scroll' && style.attachment !== 'local') {
        return { refused: `background-attachment ${style.attachment}, which this read does not model` };
    }
    const ow = origin.x1 - origin.x0;
    const oh = origin.y1 - origin.y0;
    const sizes = splitSpaces(style.size.trim());
    let w: number | undefined;
    let h: number | undefined;
    if (sizes.length === 1 && (sizes[0] === 'cover' || sizes[0] === 'contain' || sizes[0] === 'auto')) {
        if (file) return { refused: `a file layer at background-size ${style.size}: its painted size is not read without a stated size` };
        [w, h] = [ow, oh];
    } else if (sizes.length === 2) {
        w = sizes[0] === 'auto' ? undefined : lengthOf(sizes[0]!, ow);
        h = sizes[1] === 'auto' ? undefined : lengthOf(sizes[1]!, oh);
        if ((sizes[0] === 'auto' || sizes[1] === 'auto') && file) {
            return { refused: `a file layer at background-size ${style.size}: its painted size is not read without a stated size` };
        }
        if (sizes[0] === 'auto') w = ow;
        if (sizes[1] === 'auto') h = oh;
    }
    if (w === undefined || h === undefined) return { refused: `background-size ${style.size}, which this read does not parse` };
    const repeats = repeatsOf(style.repeat);
    if (repeats === undefined) return { refused: `background-repeat ${style.repeat}, which this read does not parse` };
    const px = lengthOf(style.posX, ow - w);
    const py = lengthOf(style.posY, oh - h);
    if (px === undefined || py === undefined) return { refused: `background-position ${style.posX} ${style.posY}, which this read does not parse` };
    const tile = { w, h };
    if (w <= 0 || h <= 0) return { tiles: [], bands: [], tile, absent: false };
    const covers = { x: repeats.x || moving, y: repeats.y || moving };
    const span = (axis: 'x' | 'y'): [number, number] => {
        const [c0, c1] = axis === 'x' ? [clip.x0, clip.x1] : [clip.y0, clip.y1];
        if (covers[axis]) return [c0, c1];
        const start = axis === 'x' ? origin.x0 + px : origin.y0 + py;
        const size = axis === 'x' ? w! : h!;
        return [Math.max(c0, start), Math.min(c1, start + size)];
    };
    const [x0, x1] = span('x');
    const [y0, y1] = span('y');
    if (!(x0 < x1 && y0 < y1)) return { tiles: [], bands: [], tile, absent: false };
    const t: Box = { x0, y0, x1, y1 };
    const bands: Box[] = [];
    if (style.attachment === 'scroll') {
        for (const axis of ['x', 'y'] as const) {
            if (covers[axis]) continue;
            for (const s of scrollers) {
                if (!s[axis] || !meets(t, s.box)) continue;
                const band =
                    axis === 'y'
                        ? cut({ x0: t.x0, x1: t.x1, y0: s.box.y0, y1: s.box.y1 }, s.box)
                        : cut({ x0: s.box.x0, x1: s.box.x1, y0: t.y0, y1: t.y1 }, s.box);
                const clipped = band === undefined ? undefined : cut(band, clip);
                if (clipped !== undefined) bands.push(clipped);
            }
        }
    }
    // A layer that moves and does not tile both ways may be anywhere, or not under a line at all.
    const absent = bands.length > 0 || (moving && !(repeats.x && repeats.y));
    return { tiles: [t], bands, tile, absent };
}

/**
 * The worst composite a stack of layers can put down, bottom layer first:
 * each layer's colours over every composite kept so far, the `BEAM` that
 * `judge` reads lowest kept for the next layer.
 */
export function worstStack(stack: readonly (readonly Rgba[])[], judge: (c: Rgba) => number): Rgba {
    let beam: Rgba[] = [CLEAR];
    for (const colours of stack) {
        const next: { c: Rgba; v: number }[] = [];
        const seen = new Set<string>();
        for (const below of beam) {
            for (const p of colours) {
                const c = overRgba(p, below);
                const key = `${c[0].toFixed(1)},${c[1].toFixed(1)},${c[2].toFixed(1)},${c[3].toFixed(3)}`;
                if (seen.has(key)) continue;
                seen.add(key);
                next.push({ c, v: judge(c) });
            }
        }
        next.sort((a, b) => a.v - b.v);
        beam = next.slice(0, BEAM).map((n) => n.c);
    }
    return beam[0] ?? CLEAR;
}

/** One layer to flatten: where it paints, every colour it can paint there, and whether a line can be moved off it (`Coverage.absent`). */
export type LayerPaint = { tiles: readonly Box[]; bands: readonly Box[]; colours: readonly Rgba[]; absent: boolean };

/** A flat rectangle the probe paints: a whole-pixel box and the worst ground under it. */
export type Cell = Box & { colour: Rgba };

/**
 * The flat rectangles that replace a stack of layers (bottom first): the
 * stack's cuts, each rounded to a whole pixel, make a grid; every cell some
 * layer covers takes the worst composite of the layers that cover it — a
 * layer's own colours inside its tiles, and its colours or nothing at all in
 * the band it is widened to (b) and in the tiles of a layer that is widened
 * or moves. A cell no layer covers, or whose worst is
 * clear, is not painted.
 */
export function worstCells(layers: readonly LayerPaint[], judge: (c: Rgba) => number): Cell[] {
    const xs = new Set<number>();
    const ys = new Set<number>();
    for (const layer of layers) {
        for (const b of [...layer.tiles, ...layer.bands]) {
            xs.add(Math.round(b.x0));
            xs.add(Math.round(b.x1));
            ys.add(Math.round(b.y0));
            ys.add(Math.round(b.y1));
        }
    }
    const xcuts = [...xs].sort((a, b) => a - b);
    const ycuts = [...ys].sort((a, b) => a - b);
    const inside = (b: Box, x: number, y: number): boolean => x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1;
    const memo = new Map<string, Rgba>();
    const cells: Cell[] = [];
    for (let i = 0; i + 1 < xcuts.length; i += 1) {
        for (let j = 0; j + 1 < ycuts.length; j += 1) {
            const [x0, x1, y0, y1] = [xcuts[i]!, xcuts[i + 1]!, ycuts[j]!, ycuts[j + 1]!];
            const [cx, cy] = [(x0 + x1) / 2, (y0 + y1) / 2];
            const stack: (readonly Rgba[])[] = [];
            const sign: string[] = [];
            for (const [k, layer] of layers.entries()) {
                if (layer.tiles.some((b) => inside(b, cx, cy))) {
                    stack.push(layer.absent ? [...layer.colours, CLEAR] : layer.colours);
                    sign.push(`${k}t`);
                } else if (layer.bands.some((b) => inside(b, cx, cy))) {
                    stack.push([...layer.colours, CLEAR]);
                    sign.push(`${k}b`);
                }
            }
            if (stack.length === 0) continue;
            const key = sign.join(',');
            let colour = memo.get(key);
            if (colour === undefined) {
                colour = worstStack(stack, judge);
                memo.set(key, colour);
            }
            if (colour[3] > 0) cells.push({ x0, x1, y0, y1, colour });
        }
    }
    return cells;
}

/** A colour as the probe writes it into a flat layer. */
export function cssOf(c: Rgba): string {
    const r = (v: number): string => String(Math.round(v * 1000) / 1000);
    return `rgba(${r(c[0])}, ${r(c[1])}, ${r(c[2])}, ${r(c[3])})`;
}
