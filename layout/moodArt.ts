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
 * and paints, in their place, flat rectangles of the worst ground its search
 * finds the layers can put under a line there. This module is the model, and
 * it touches no document.
 *
 * **(a) Toward which ink.** A page holds several inks. The ground is chosen
 * for the mood's own `--s-text`: of every colour the stack of layers can
 * paint at a point, composited over the element's own background colour on
 * the mood's `--s-bg`, the one that reads least against `--s-text`
 * (`judgeFor`). On a light mood that is the darkest ground, on a dark mood
 * the lightest. It is the worst for every ink on the text's side of the
 * ground (the muted, the accent, the red, the text itself) while the art
 * stays on the ground's side of that ink. Where the art can reach past an
 * ink toward the text, the painted ground is past it too, and that ink's
 * own worst — a ground near its own luminance — is not painted. **The
 * condition, stated (the critic's P3-6):** if the ink still clears 3:1 on
 * the painted ground, the text there reads at most a third of its own
 * contrast with that ink (on a light mood, `(Lg + .05) ≤ (Li + .05) / 3`, so
 * the text's `(Lg + .05) / (Lt + .05)` is at most a third of `(Li + .05) /
 * (Lt + .05)`), which is under 3:1 for any ink within 9:1 of the text — so
 * a line in the text's own ink on that same cell fails, and the job with
 * it; if the ink does not clear 3:1 on the painted ground, it fails itself.
 * **The gap:** an ink that clears 3:1 on the painted ground on a cell where
 * no line in the text's ink stands; an ink further than 9:1 from the text;
 * and a line whose ink is on the other side of the ground (a light line on a
 * light mood's ground, a dark one on a dark mood's). Each is not read at its
 * worst. None of the shipped moods' inks or the fixture's falls in it today:
 * every ink After hours paints on its bare page is lighter than its ground,
 * every ink Sun-faded paints darker than its paper (the critic's survey,
 * 2026-11-16).
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
 * shows wherever the top one is transparent. So the ground at a point is
 * searched over the stack, bottom to top (`worstStack`): **whole**, every
 * combination of one colour a layer, where there are at most
 * `EXHAUSTIVE_LIMIT` of them (`exhaustiveStack`); otherwise by a **beam**
 * (`beamStack`), which keeps at each layer the `BEAM` composites the judge
 * reads lowest and, beside them, the composites at each extreme of every
 * premultiplied channel and of alpha, since a later layer can carry a
 * composite far from the text toward it. A beam is a search, not a proof: on
 * seeded small stacks it misses the whole search on some (`moodArt.test.ts`;
 * the critic's beam6 case, which a beam of the lowest twelve alone missed,
 * both read right), so the probe counts the stacks it searched each way and
 * the runner prints them. Every layer is
 * taken to reach any phase of every other — two tiles whose periods share
 * nothing meet in every combination somewhere on a long page — which is
 * conservative where layers are drawn to avoid each other. The root's, an
 * open sheet's and the region's stacks are searched apart, each over its
 * own background colour.
 *
 * **(b) What area.** A layer that repeats along an axis covers its clip area
 * along it. Along an axis it does not repeat, its tile stands where its size
 * and position put it, and stands still while the content of any scroller
 * scrolls over it. The capture stands every scroller at its start (the probe
 * checks it, and refuses a page where one is not), so a line reaches the
 * tile only from below (or from the right), and only from as far as the
 * scroller's range can carry it: for every scroller (`overflow` `auto`,
 * `scroll` or `overlay`) along that axis whose box the tile reaches, the
 * tile is widened to the band from the start of its part inside the
 * scroller to the end of that part plus the scroller's range, cut to the
 * scroller's box, across the span the tile covers on the other axis — not
 * the whole page, and not only the tile. A scroller that cannot move widens
 * nothing, and a tile that meets no scroller is read where it is: the lines
 * over it do not move. The range is the probe's (`Scroller.range`): the
 * scroller's own overflow, or, for the boxes the capture grows to show
 * everything (the scroll region, an open sheet), at most how far the
 * capture grew the page past the job's own height — an upper bound, read at
 * the contrast pass's own heights (844, 900 and 1080) and no other: a
 * shorter screen sweeps a wider band. A line that can be scrolled over a
 * tile can also be scrolled off it, so a layer that is widened may not be
 * under a line at all, in its tile as in the band: a transparent colour is
 * among its own there. `background-attachment: local` moves with the
 * element's own content, so on a box that scrolls itself it is read where
 * it is against that box and widened for the scrollers inside it. A layer
 * the element animates the position or size of is taken to cover its whole
 * clip area.
 *
 * **(c) Size, position and clip.** Each layer's own computed size, position,
 * repeat, origin box and clip box (cycled over the layers as CSS cycles
 * them) give its tiles in the element's border box; the probe writes the
 * element's background as the flat rectangles of `worstCells`, each in px
 * from the border box, `no-repeat`, important, so no animation moves them,
 * and reads them back once every animation is frozen. Every cut is rounded
 * to a whole pixel, so two rectangles meet and never overlap.
 *
 * **(d) What cannot be read** answers a sentence, never a skip (`refused`):
 * an image that is neither a file nor a gradient this module models (an
 * `image-set()`, a prefixed gradient, `cross-fade()`); a gradient
 * interpolated in a space written other than sRGB, or with a stop outside
 * sRGB (`oklch()`, `lab()`, `color(display-p3 …)`); a gradient with a
 * `color(srgb …)` stop and no space written — Chrome interpolates it in
 * OKLab — wherever two of its stops are distinct, both visible and apart (a
 * segment to transparent, or a hard stop, paints the same in either space
 * and is read); a size, a position or a repeat it does not parse; a file
 * layer at `auto`, `cover` or `contain`; a `fixed` attachment, and a `local`
 * one on a box that does not scroll itself; a `text` clip; on a box the
 * capture grew, a tile placed or sized along the grown axis by a non-zero
 * percentage (the grown capture puts it elsewhere than the job's own
 * height would); a still tile under scrollers on two axes (the corner both
 * reach is not modelled). The probe adds a file that does not load or cannot
 * be read back, a background colour it cannot read, a transform, `rotate`,
 * `scale`, `translate` or `zoom` on the element or above it, a blend mode
 * other than `normal`, a scroller not at its start, and a mood whose
 * `--s-text` or `--s-bg` does not resolve. The runner refuses the job.
 *
 * Tests: `a-mood-art-layer-is-read-at-its-worst` (`moodArt.test.ts`).
 */
import { contrastOf, over, type Rgb } from './rainDrop';

/** A straight-alpha colour: sRGB channels 0–255, alpha 0–1. */
export type Rgba = readonly [number, number, number, number];
export const CLEAR: Rgba = [0, 0, 0, 0];

/** Steps on every segment between two stops of a gradient. */
export const SEGMENT_SAMPLES = 32;

/** The composites the beam keeps at each layer, the judge's lowest (`beamStack`; pinned by value in the tests). */
export const BEAM = 12;

/** Up to this many combinations of one colour a layer, a stack is searched whole (`exhaustiveStack`; pinned by value). */
export const EXHAUSTIVE_LIMIT = 200_000;

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
    // Each stop's colour as written, and its positions: where two stops meet at one position the
    // colour changes in a hard step and nothing is interpolated between them.
    const written: { colour: string; positions: string[] }[] = [];
    let spaceWritten = false;
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
                spaceWritten = space !== null;
                continue;
            }
            return { refused: `a gradient stop whose colour this read cannot model: ${item.slice(0, 60)}` };
        }
        stops.push(colour);
        written.push({ colour: lead.colour, positions: splitSpaces(lead.rest) });
    }
    /*
     * A stop that is not a legacy colour — `color(srgb …)`, which every
     * `color-mix()` computes to — makes Chrome interpolate the gradient in
     * OKLab when no space is written (the critic's grad.html: blue to yellow
     * paints (108,172,198) at the midpoint where sRGB paints (128,128,127)),
     * and this read samples sRGB. A segment to or from transparent, or a
     * hard stop, paints the same in either space; any other segment between
     * two distinct colours is refused.
     */
    if (!spaceWritten && written.some((w) => /^color\(/i.test(w.colour))) {
        for (let k = 1; k < stops.length; k += 1) {
            const [a, b] = [stops[k - 1]!, stops[k]!];
            const same = a.every((v, c) => Math.abs(v - b[c]!) < 1e-9);
            const hard = written[k - 1]!.positions.length > 0 && written[k]!.positions.length > 0 && written[k - 1]!.positions.at(-1) === written[k]!.positions[0];
            if (a[3] > 0 && b[3] > 0 && !same && !hard) {
                return {
                    refused:
                        `a gradient with a color(srgb …) stop and no interpolation space written, which Chrome interpolates in OKLab, ` +
                        `between ${written[k - 1]!.colour} and ${written[k]!.colour}: this read samples sRGB`,
                };
            }
        }
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

/**
 * A box that scrolls its content: its showing part in the element's border
 * box, the axes it scrolls along, how far along each its content can move
 * (`range`, px), and whether it is the element whose layers are read
 * (`self`: a `local` layer moves with this one's content).
 */
export type Scroller = { box: Box; x: boolean; y: boolean; range: { x: number; y: number }; self?: boolean };

/** The sum of a length's percentage terms (`50%`, `calc(95% - 10px)`), or 0. */
export function percentOf(token: string): number {
    let sum = 0;
    for (const m of token.matchAll(/([-+]?\s*(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)%/gi)) sum += Number(m[1]!.replace(/\s+/g, ''));
    return sum;
}

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
    grew = 0,
): Coverage | { refused: string } {
    const origin = boxes[style.origin as keyof ElementBoxes];
    const clip = boxes[style.clip as keyof ElementBoxes];
    if (origin === undefined) return { refused: `background-origin ${style.origin}, which this read does not model` };
    if (clip === undefined) return { refused: `background-clip ${style.clip}, which this read does not model` };
    if (style.attachment !== 'scroll' && style.attachment !== 'local') {
        return { refused: `background-attachment ${style.attachment}, which this read does not model` };
    }
    // `local` follows the element's own scrolling alone: on a box that does not scroll itself, the
    // layer stands still while a scroller inside it moves, which `scroll`'s reading would need.
    if (style.attachment === 'local' && !scrollers.some((s) => s.self === true)) {
        return { refused: 'background-attachment local on a box that does not scroll its own content: it stands still while a scroller inside it moves' };
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
    // On a box the capture grew (down only), a percentage along y resolves against the grown height,
    // not the job's own: the tile would be read where the grown capture puts it, or at its size.
    if (grew > 0) {
        const sizeY = sizes.length === 2 ? sizes[1]! : '';
        if (!covers.y && percentOf(style.posY) !== 0) {
            return { refused: `background-position-y ${style.posY} on a box the capture grew by ${Math.round(grew)}px: its tile is read where the grown box puts it, not the job's own` };
        }
        if ((file || !covers.y) && percentOf(sizeY) !== 0) {
            return { refused: `background-size ${style.size} on a box the capture grew by ${Math.round(grew)}px: its tile is sized against the grown box, not the job's own` };
        }
    }
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
    const bandAxes = new Set<'x' | 'y'>();
    {
        for (const axis of ['x', 'y'] as const) {
            if (covers[axis]) continue;
            for (const s of scrollers) {
                // A `local` layer moves with its own box's content: that one scroller does not widen it.
                if (style.attachment === 'local' && s.self === true) continue;
                const range = s.range[axis];
                if (!s[axis] || !(range > 0) || !meets(t, s.box)) continue;
                bandAxes.add(axis);
                // The tile's part inside the scroller, and as far past it as the range carries a line.
                const inside = cut(t, s.box)!;
                const band =
                    axis === 'y'
                        ? cut({ x0: inside.x0, x1: inside.x1, y0: inside.y0, y1: inside.y1 + range }, s.box)
                        : cut({ x0: inside.x0, x1: inside.x1 + range, y0: inside.y0, y1: inside.y1 }, s.box);
                const clipped = band === undefined ? undefined : cut(band, clip);
                if (clipped !== undefined) bands.push(clipped);
            }
        }
    }
    // Scrolled along both axes, a line reaches the tile from the corner too, which the bands of
    // one axis at a time do not cover.
    if (bandAxes.size > 1) {
        return { refused: 'a still tile under scrollers on two axes: the corner reached by scrolling both is not modelled' };
    }
    // A layer that moves and does not tile both ways may be anywhere, or not under a line at all.
    const absent = bands.length > 0 || (moving && !(repeats.x && repeats.y));
    return { tiles: [t], bands, tile, absent };
}

/** A composite's key: its channels to a tenth and its alpha to a thousandth. */
const keyOf = (c: Rgba): string => (c[3] <= 0 ? 'clear' : `${c[0].toFixed(1)},${c[1].toFixed(1)},${c[2].toFixed(1)},${c[3].toFixed(3)}`);

/**
 * The ground a stack of layers can put down (bottom layer first) that
 * `judge` reads lowest: searched whole where the stack has at most
 * `EXHAUSTIVE_LIMIT` combinations of one colour a layer, otherwise by the
 * beam — a search, not a proof (the module's docblock).
 */
/** How many distinct stacks a read searched whole, and how many by the beam. */
export type SearchTally = { whole: number; beam: number };

export function worstStack(stack: readonly (readonly Rgba[])[], judge: (c: Rgba) => number, tally?: SearchTally): Rgba {
    let combinations = 1;
    for (const colours of stack) combinations *= Math.max(1, colours.length);
    const whole = combinations <= EXHAUSTIVE_LIMIT;
    if (tally !== undefined) tally[whole ? 'whole' : 'beam'] += 1;
    return whole ? exhaustiveStack(stack, judge) : beamStack(stack, judge);
}

/** Every combination of one colour a layer, composited bottom to top; the one `judge` reads lowest. */
export function exhaustiveStack(stack: readonly (readonly Rgba[])[], judge: (c: Rgba) => number): Rgba {
    let level = new Map<string, Rgba>([['clear', CLEAR]]);
    for (const colours of stack) {
        const next = new Map<string, Rgba>();
        for (const below of level.values()) {
            for (const p of colours) {
                const c = overRgba(p, below);
                next.set(keyOf(c), c);
            }
        }
        level = next;
    }
    let best: Rgba = CLEAR;
    let least = Infinity;
    for (const c of level.values()) {
        const v = judge(c);
        if (v < least) [best, least] = [c, v];
    }
    return best;
}

/**
 * The beam: at each layer, every colour it can paint over every composite
 * kept so far; kept for the next layer, the `width` the judge reads lowest
 * and, beside them, the composite at each extreme (least and most) of every
 * premultiplied channel and of alpha — a layer above can carry a composite
 * far from the text toward it, and source-over keeps each premultiplied
 * channel's order (`out = src + (1 − srcα) × below`).
 */
export function beamStack(stack: readonly (readonly Rgba[])[], judge: (c: Rgba) => number, width = BEAM): Rgba {
    let beam: Rgba[] = [CLEAR];
    for (const colours of stack) {
        const next = new Map<string, { c: Rgba; v: number }>();
        for (const below of beam) {
            for (const p of colours) {
                const c = overRgba(p, below);
                const key = keyOf(c);
                if (!next.has(key)) next.set(key, { c, v: judge(c) });
            }
        }
        const all = [...next.values()];
        const kept = new Set(all.slice().sort((a, b) => a.v - b.v).slice(0, width));
        const channels = [(c: Rgba) => c[0] * c[3], (c: Rgba) => c[1] * c[3], (c: Rgba) => c[2] * c[3], (c: Rgba) => c[3]];
        for (const channel of channels) {
            let lo = all[0]!;
            let hi = all[0]!;
            for (const n of all) {
                if (channel(n.c) < channel(lo.c)) lo = n;
                if (channel(n.c) > channel(hi.c)) hi = n;
            }
            kept.add(lo);
            kept.add(hi);
        }
        beam = [...kept].sort((a, b) => a.v - b.v).map((n) => n.c);
    }
    let best: Rgba = CLEAR;
    let least = Infinity;
    for (const c of beam) {
        const v = judge(c);
        if (v < least) [best, least] = [c, v];
    }
    return best;
}

/**
 * One layer to flatten: where it paints, every colour it can paint there,
 * whether a line can be moved off it (`Coverage.absent`), and a name for its
 * colours (`id`: the same id, the same list) by which a search is reused.
 */
export type LayerPaint = { tiles: readonly Box[]; bands: readonly Box[]; colours: readonly Rgba[]; absent: boolean; id: string };

/** A flat rectangle the probe paints: a whole-pixel box and the worst ground under it. */
export type Cell = Box & { colour: Rgba };

/**
 * The flat rectangles that replace a stack of layers (bottom first): the
 * stack's cuts, each rounded to a whole pixel, make a grid; every cell some
 * layer covers takes the worst composite of the layers that cover it — a
 * layer's own colours inside its tiles, and its colours or nothing at all in
 * the band it is widened to (b) and in the tiles of a layer that is widened
 * or moves. A cell no layer covers, or whose worst is
 * clear, is not painted. `memo` reuses a search across calls, keyed by
 * `judgeKey` (what the judge reads) and the layers' ids.
 */
export function worstCells(
    layers: readonly LayerPaint[],
    judge: (c: Rgba) => number,
    memo: Map<string, Rgba> = new Map(),
    judgeKey = '',
    tally?: SearchTally,
): Cell[] {
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
    const cells: Cell[] = [];
    for (let i = 0; i + 1 < xcuts.length; i += 1) {
        for (let j = 0; j + 1 < ycuts.length; j += 1) {
            const [x0, x1, y0, y1] = [xcuts[i]!, xcuts[i + 1]!, ycuts[j]!, ycuts[j + 1]!];
            const [cx, cy] = [(x0 + x1) / 2, (y0 + y1) / 2];
            const stack: (readonly Rgba[])[] = [];
            const sign: string[] = [];
            for (const layer of layers) {
                if (layer.tiles.some((b) => inside(b, cx, cy))) {
                    stack.push(layer.absent ? [...layer.colours, CLEAR] : layer.colours);
                    sign.push(`${layer.id}${layer.absent ? '|or none' : ''}`);
                } else if (layer.bands.some((b) => inside(b, cx, cy))) {
                    stack.push([...layer.colours, CLEAR]);
                    sign.push(`${layer.id}|or none`);
                }
            }
            if (stack.length === 0) continue;
            // The search depends on the colours each layer can paint here, bottom first, and on the judge.
            const key = `${judgeKey}\n${sign.join('\n')}`;
            let colour = memo.get(key);
            if (colour === undefined) {
                colour = worstStack(stack, judge, tally);
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
