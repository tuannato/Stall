/**
 * **Paints with no hit area that reach over money** (before 8g2, 1b,
 * report-only; the pure half of `reachAtRest` and its reads in
 * `layout/probe.ts`).
 *
 * 1a (`nothing-covers-money-or-a-protected-box`) asks the page what stands at
 * points over every money node with `pointer-events` forced on, so a box laid
 * over a figure answers wherever it has a hit area. A paint that has none does
 * not answer at all (the plan's C-1, confirmed in Chrome 155): a box-shadow,
 * an outline, a `border-image-outset` band, a text-shadow, a drop shadow or a
 * blur in a `filter`, and a pseudo-element's glyphs standing outside its own
 * box. The critic's PW — the price column's `::after`, `height: 0`, moved up
 * 60px, painting a 60px spread in a literal colour — hides the figure and
 * every point 1a asks returns the figure. This module says how far each such
 * paint reaches past the box it is drawn from, and whether that reach meets a
 * money node's line boxes or a protected box.
 *
 * - **Sharp reach counts in full.** A shadow's offset plus its spread, an
 *   outline's width plus its offset, a border image's outset, a text-shadow's
 *   offset, a decoration line's band: the rect the paint is drawn in, at any
 *   opacity above nothing (`sharpRect`, `outlineBox`, `borderImageBox`,
 *   `underlineBand`).
 * - **Blur counts under a policy** (`BLUR_OPACITY`). A blurred layer is a
 *   rect painted at its alpha and blurred by a Gaussian (CSS: a box-shadow's
 *   or a text-shadow's blur radius is twice the deviation; a `blur()`'s length
 *   is the deviation; a `drop-shadow()`'s is read as the deviation, which
 *   reaches further than reading it as a radius would, stated). Its coverage
 *   at a point is separable (`coverageAt`), and its most over a box is at the
 *   point of the box nearest the rect's centre, axis by axis
 *   (`maxCoverageOver`). Stacked copies are composited
 *   (`compositeOver`, one minus the product of what each leaves through) —
 *   an upper bound, each layer taken at its own most — so thirty copies of
 *   `0 0 40px` count as near opaque where one copy is a faint glow. A tail
 *   counts where the composite over the part of a target past the paint's
 *   own box reaches `BLUR_OPACITY`.
 * - **A pseudo-element's box is not known exactly** (no DOM API gives it).
 *   Its own resolved width and height, grown by its own text's font size
 *   when it holds text, placed anywhere in its host's border box, moved by its
 *   relative offsets and its margins (`pseudoRegion`): a region it stands
 *   somewhere inside. A pseudo whose size or place this cannot resolve, or
 *   that a transform, `translate`, `rotate`, `scale`, a motion path or its
 *   own zoom moves or sizes, or that is positioned out of flow, fails closed:
 *   it reaches anywhere.
 *   Because the region is wider than the box, a pseudo's paints are read with
 *   no "past its own box" exclusion — the region is not inside the box.
 * - **What a filter cannot say.** `filter: url()` names a filter this module
 *   cannot open: it fails closed (`parseFilter`).
 *
 * Pure: no DOM, no browser. Tested in `paintReach.test.ts`.
 */
import type { Box } from '../src/ui/signInk';

export type { Box };

/** The families of paint 1b reads, as a report counts them. */
export const REACH_KINDS = [
    'box-shadow',
    'box-shadow blur',
    'outline',
    'border-image',
    'text-shadow',
    'text-shadow blur',
    'drop-shadow',
    'drop-shadow blur',
    'blur',
    'decoration',
    'pseudo box',
    'unresolved',
] as const;
export type ReachKind = (typeof REACH_KINDS)[number];

/**
 * **The blur policy** (measured before it was set; `layout/PROBE-RULES.md`,
 * "Before 8g2, 1b"): a blurred tail counts where its composite coverage over
 * the part of a target past the paint's own box reaches this. The anchor: a
 * layer of the ground's own colour at 0.2 over a figure that reads 4.5:1 takes
 * it to about 3:1, the floor every money figure is held to; the clean tree's
 * soft shadows over money reach at most what `PROBE-RULES.md` records (the
 * dock's glow over the rows above it among them), and thirty stacked copies of
 * `0 0 40px` reach past 0.99 within half their blur.
 */
export const BLUR_OPACITY = 0.2;

/** How far two boxes must overlap, on both axes, to meet: more than a pixel, as the halo rule reads one. */
export const MEET_TOL = 1;

/** How many deviations past its rect a blurred layer is taken to paint, for finding what it may reach (coverage there is under 3e-7 of its alpha). */
export const TAIL_SIGMAS = 5;

/** More drop shadows than this in one filter fail closed: each shadows the ones before it, and the offsets add up. */
export const MAX_DROP_SHADOWS = 4;

/** A box reaching everywhere: what fails closed. */
export const ANYWHERE: Box = { left: -Infinity, top: -Infinity, right: Infinity, bottom: Infinity };

/** A rect painted at `alpha`, blurred by a Gaussian of deviation `sigma` px (0: sharp), and what clips it (its box's clipping boxes: nothing past it paints). */
export type Layer = { rect: Box; alpha: number; sigma: number; clip?: Box };

export function grown(b: Box, by: number): Box {
    return { left: b.left - by, top: b.top - by, right: b.right + by, bottom: b.bottom + by };
}

export function moved(b: Box, dx: number, dy: number): Box {
    return { left: b.left + dx, top: b.top + dy, right: b.right + dx, bottom: b.bottom + dy };
}

/** Where two boxes overlap, or undefined where they share no area. */
export function intersect(a: Box, b: Box): Box | undefined {
    const left = Math.max(a.left, b.left);
    const top = Math.max(a.top, b.top);
    const right = Math.min(a.right, b.right);
    const bottom = Math.min(a.bottom, b.bottom);
    return right > left && bottom > top ? { left, top, right, bottom } : undefined;
}

/** The union's bounds. */
export function union(a: Box, b: Box): Box {
    return { left: Math.min(a.left, b.left), top: Math.min(a.top, b.top), right: Math.max(a.right, b.right), bottom: Math.max(a.bottom, b.bottom) };
}

/** The parts of `a` outside `b`: up to four boxes, none overlapping. */
export function minus(a: Box, b: Box | undefined): Box[] {
    const cut = b === undefined ? undefined : intersect(a, b);
    if (cut === undefined) return [a];
    const out: Box[] = [];
    if (cut.top > a.top) out.push({ left: a.left, top: a.top, right: a.right, bottom: cut.top });
    if (cut.bottom < a.bottom) out.push({ left: a.left, top: cut.bottom, right: a.right, bottom: a.bottom });
    if (cut.left > a.left) out.push({ left: a.left, top: cut.top, right: cut.left, bottom: cut.bottom });
    if (cut.right < a.right) out.push({ left: cut.right, top: cut.top, right: a.right, bottom: cut.bottom });
    return out;
}

/** A box wider and taller than `MEET_TOL`. */
function substantial(b: Box): boolean {
    return b.right - b.left > MEET_TOL && b.bottom - b.top > MEET_TOL;
}

/**
 * Where `reach` meets `target` past `base` — the box the paint is drawn
 * from, whose own area is its hit area and 1a's — or undefined: the first
 * piece of their overlap outside `base` wider and taller than `MEET_TOL`.
 * `base` undefined (a pseudo-element's region, which is no box): any overlap.
 */
export function meetsPast(reach: Box, target: Box, base?: Box): Box | undefined {
    const at = intersect(reach, target);
    if (at === undefined) return undefined;
    return minus(at, base).find(substantial);
}

/** The pieces of a target past a paint's own box, each substantial (`meetsPast`'s reading, for the blur policy). */
export function targetPast(target: Box, base?: Box): Box[] {
    return minus(target, base).filter(substantial);
}

/** The error function (Abramowitz and Stegun 7.1.26, error under 1.5e-7). */
function erf(x: number): number {
    const s = Math.sign(x);
    const a = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * a);
    const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a);
    return s * y;
}

/** The standard normal's cumulative distribution. */
export function normalCdf(z: number): number {
    return 0.5 * (1 + erf(z / Math.SQRT2));
}

/** One axis of a blurred rect: the share of [a0, a1] a Gaussian of deviation `sigma` centred at `u` covers. */
function axis(u: number, a0: number, a1: number, sigma: number): number {
    if (!(a1 > a0)) return 0;
    if (sigma <= 0) return u >= a0 && u <= a1 ? 1 : 0;
    return normalCdf((u - a0) / sigma) - normalCdf((u - a1) / sigma);
}

/** A layer's coverage at a point: its alpha times both axes' shares. */
export function coverageAt(layer: Layer, x: number, y: number): number {
    return layer.alpha * axis(x, layer.rect.left, layer.rect.right, layer.sigma) * axis(y, layer.rect.top, layer.rect.bottom, layer.sigma);
}

/**
 * A layer's most coverage over a box: each axis's share is symmetric about
 * the rect's centre and falls away from it, so the most is at the box's
 * point nearest the centre, axis by axis. A sharp layer covers the box fully
 * where the two overlap with area.
 */
export function maxCoverageOver(layer: Layer, over: Box): number {
    const r = layer.rect;
    if (!(r.right > r.left) || !(r.bottom > r.top) || layer.alpha <= 0) return 0;
    const b = layer.clip === undefined ? over : intersect(over, layer.clip);
    if (b === undefined) return 0;
    if (layer.sigma <= 0) return intersect(r, b) === undefined ? 0 : layer.alpha;
    const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
    const x = clamp((r.left + r.right) / 2, b.left, b.right);
    const y = clamp((r.top + r.bottom) / 2, b.top, b.bottom);
    return coverageAt(layer, x, y);
}

/**
 * Stacked layers over a box, composited: one minus the product of what each
 * leaves through, each at its own most over the box — an upper bound of the
 * composite's most, exact for copies that stand in one place.
 */
export function compositeOver(layers: readonly Layer[], b: Box): number {
    let through = 1;
    for (const layer of layers) through *= 1 - Math.min(1, maxCoverageOver(layer, b));
    return 1 - through;
}

/** The most composite coverage over any of `pieces`. */
export function compositeOverAny(layers: readonly Layer[], pieces: readonly Box[]): number {
    let most = 0;
    for (const p of pieces) most = Math.max(most, compositeOver(layers, p));
    return most;
}

/** Where a layer may paint at all, for finding what it reaches: its rect grown by `TAIL_SIGMAS` deviations. */
export function layerBound(layer: Layer): Box {
    return grown(layer.rect, TAIL_SIGMAS * layer.sigma);
}

/**
 * How far past its rect's edge one lone layer's tail stays at or above
 * `BLUR_OPACITY` (a half-plane's: `alpha` times the share past the edge),
 * for a sentence; 0 where it never does.
 */
export function tailReach(alpha: number, sigma: number, threshold = BLUR_OPACITY): number {
    if (sigma <= 0 || alpha * 0.5 < threshold) return 0;
    let lo = 0;
    let hi = TAIL_SIGMAS * sigma;
    for (let i = 0; i < 40; i += 1) {
        const mid = (lo + hi) / 2;
        if (alpha * (1 - normalCdf(mid / sigma)) >= threshold) lo = mid;
        else hi = mid;
    }
    return lo;
}

/** A shadow layer, as `box-shadow`, `text-shadow` and `drop-shadow()` compute it. */
export type Shadow = { x: number; y: number; blur: number; spread: number; inset: boolean; alpha: number; colour: string };

/** A comma list split at its top-level commas (a colour's own commas are inside parentheses). */
export function splitTop(value: string): string[] {
    const out: string[] = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < value.length; i += 1) {
        const c = value[i];
        if (c === '(') depth += 1;
        else if (c === ')') depth = Math.max(0, depth - 1);
        else if (c === ',' && depth === 0) {
            out.push(value.slice(start, i));
            start = i + 1;
        }
    }
    out.push(value.slice(start));
    return out.map((s) => s.trim()).filter((s) => s !== '');
}

const LENGTH = /^-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?px$/i;
const ZERO = /^-?0(?:\.0*)?$/;

/** A computed px length, or undefined: `0` alone is a length too. */
export function pxLength(token: string): number | undefined {
    if (LENGTH.test(token)) return Number.parseFloat(token);
    if (ZERO.test(token)) return 0;
    return undefined;
}

/** A computed `zoom` as a factor: a number, a percentage, `normal` (1); 1 where it does not read. */
export function zoomOf(value: string): number {
    const v = value.trim();
    if (v === '' || v === 'normal') return 1;
    const n = Number.parseFloat(v);
    if (!Number.isFinite(n) || !(n > 0)) return 1;
    return v.endsWith('%') ? n / 100 : n;
}

/**
 * One computed shadow layer: a colour (anything but lengths and `inset`,
 * resolved to an alpha by the caller, whose canvas knows every colour
 * syntax) and two to four px lengths. Undefined where it does not read.
 */
export function parseShadow(layer: string, alphaOf: (colour: string) => number | undefined): Shadow | undefined {
    const tokens: string[] = [];
    let depth = 0;
    let cur = '';
    for (const c of layer.trim()) {
        if (c === '(') depth += 1;
        if (c === ')') depth = Math.max(0, depth - 1);
        if (/\s/.test(c) && depth === 0) {
            if (cur !== '') tokens.push(cur);
            cur = '';
        } else {
            cur += c;
        }
    }
    if (cur !== '') tokens.push(cur);
    const lengths: number[] = [];
    const colour: string[] = [];
    let inset = false;
    for (const t of tokens) {
        const n = pxLength(t);
        if (n !== undefined) lengths.push(n);
        else if (t === 'inset') inset = true;
        else colour.push(t);
    }
    if (lengths.length < 2 || lengths.length > 4 || colour.length > 1) return undefined;
    const text = colour[0] ?? 'currentcolor';
    const alpha = alphaOf(text);
    if (alpha === undefined) return undefined;
    return { x: lengths[0]!, y: lengths[1]!, blur: Math.max(0, lengths[2] ?? 0), spread: lengths[3] ?? 0, inset, alpha, colour: text };
}

/** A computed shadow list (`none` is none), or undefined where any layer does not read. */
export function parseShadows(value: string, alphaOf: (colour: string) => number | undefined): Shadow[] | undefined {
    const v = value.trim();
    if (v === '' || v === 'none') return [];
    const out: Shadow[] = [];
    for (const part of splitTop(v)) {
        const s = parseShadow(part, alphaOf);
        if (s === undefined) return undefined;
        out.push(s);
    }
    return out;
}

/**
 * A box-shadow's layers off a box `base` (`scale`: how much the box's own
 * transforms magnify a length, at least 1): every outer layer with any
 * alpha, its rect the box grown by its spread and moved by its offset, its
 * deviation half its blur. An inset layer paints inside the box, which is its
 * hit area, and is left out.
 */
export function boxShadowLayers(base: Box, shadows: readonly Shadow[], scale = 1): Layer[] {
    const out: Layer[] = [];
    for (const s of shadows) {
        if (s.inset || s.alpha <= 0) continue;
        out.push({ rect: moved(grown(base, s.spread * scale), s.x * scale, s.y * scale), alpha: s.alpha, sigma: (s.blur * scale) / 2 });
    }
    return out;
}

/** A text-shadow's layers off a text's line boxes: each copy moved by its offset, its deviation half its blur. */
export function textShadowLayers(lines: readonly Box[], shadows: readonly Shadow[], scale = 1): Layer[] {
    const out: Layer[] = [];
    for (const s of shadows) {
        if (s.alpha <= 0) continue;
        for (const line of lines) out.push({ rect: moved(line, s.x * scale, s.y * scale), alpha: s.alpha, sigma: (s.blur * scale) / 2 });
    }
    return out;
}

/** An outline's outer edge, or undefined where it paints nothing past the box: its width plus its offset, the box grown by both. */
export function outlineBox(base: Box, style: string, width: number, offset: number, scale = 1): Box | undefined {
    if (style === 'none' || style === 'hidden' || !(width > 0)) return undefined;
    const reach = (offset + width) * scale;
    return reach > 0 ? grown(base, reach) : undefined;
}

/** A border image's outer edge: the box grown by its outset on each side (top, right, bottom, left, px), or undefined where it reaches nothing past the box. */
export function borderImageBox(base: Box, outset: readonly [number, number, number, number], scale = 1): Box | undefined {
    const [t, r, b, l] = outset.map((v) => Math.max(0, v) * scale) as [number, number, number, number];
    if (t === 0 && r === 0 && b === 0 && l === 0) return undefined;
    return { left: base.left - l, top: base.top - t, right: base.right + r, bottom: base.bottom + b };
}

/** A computed filter, read for what reaches: its drop shadows, its blurs, and whether it names a filter this cannot open. */
export type FilterReach = { drops: Shadow[]; blurs: number[]; unread?: string };

/**
 * A computed `filter`. `drop-shadow()` and `blur()` reach; every other
 * function recolours what the box already paints and reaches nothing;
 * `url()` names an SVG filter whose primitives can grow or move the paint,
 * and fails closed, as does a function this does not read.
 */
export function parseFilter(value: string, alphaOf: (colour: string) => number | undefined): FilterReach {
    const v = value.trim();
    const out: FilterReach = { drops: [], blurs: [] };
    if (v === '' || v === 'none') return out;
    const fn = /([a-z-]+)\(/gi;
    let at = 0;
    while (at < v.length) {
        while (at < v.length && /\s/.test(v[at]!)) at += 1;
        if (at >= v.length) break;
        fn.lastIndex = at;
        const m = fn.exec(v);
        if (m === null || m.index !== at) return { ...out, unread: `a filter this cannot read (${v.slice(0, 60)})` };
        let depth = 0;
        let end = m.index + m[0].length - 1;
        for (; end < v.length; end += 1) {
            if (v[end] === '(') depth += 1;
            else if (v[end] === ')') {
                depth -= 1;
                if (depth === 0) break;
            }
        }
        const name = m[1]!.toLowerCase();
        const args = v.slice(m.index + m[0].length, end).trim();
        at = end + 1;
        if (name === 'url') return { ...out, unread: `filter: url(${args.slice(0, 40)}), an SVG filter whose primitives this cannot open` };
        if (name === 'blur') {
            const r = args === '' ? 0 : pxLength(args);
            if (r === undefined) return { ...out, unread: `blur(${args}) this cannot read` };
            if (r > 0) out.blurs.push(r);
        } else if (name === 'drop-shadow') {
            const s = parseShadow(args, alphaOf);
            if (s === undefined || s.inset || s.spread !== 0) return { ...out, unread: `drop-shadow(${args.slice(0, 40)}) this cannot read` };
            out.drops.push(s);
        } else if (!['brightness', 'contrast', 'grayscale', 'hue-rotate', 'invert', 'opacity', 'saturate', 'sepia'].includes(name)) {
            return { ...out, unread: `${name}() in a filter, which this does not read` };
        }
    }
    if (out.drops.length > MAX_DROP_SHADOWS) return { ...out, unread: `${out.drops.length} drop shadows in one filter (each shadows the ones before it)` };
    return out;
}

/**
 * A filter's layers off a box `base`: every combination of its drop
 * shadows (each shadows the element and the shadows before it, so their
 * offsets add up), each at the least alpha of the drops it chains, blurred
 * by its own deviation and every `blur()` in the list together (deviations
 * add in quadrature); and the element's own paint blurred by the `blur()`s,
 * at alpha 1 (what the element paints is not known: taken as opaque).
 */
export function filterLayers(base: Box, f: FilterReach, scale = 1): { drops: Layer[]; blur: Layer | undefined } {
    const blurVar = f.blurs.reduce((s, r) => s + (r * scale) ** 2, 0);
    const drops: Layer[] = [];
    const n = f.drops.length;
    for (let mask = 1; mask < 1 << n; mask += 1) {
        let x = 0;
        let y = 0;
        let alpha = 1;
        let dev = blurVar;
        for (let i = 0; i < n; i += 1) {
            if ((mask & (1 << i)) === 0) continue;
            const d = f.drops[i]!;
            x += d.x * scale;
            y += d.y * scale;
            alpha = Math.min(alpha, d.alpha);
            dev += (d.blur * scale) ** 2;
        }
        if (alpha > 0) drops.push({ rect: moved(base, x, y), alpha, sigma: Math.sqrt(dev) });
    }
    return { drops, blur: blurVar > 0 ? { rect: base, alpha: 1, sigma: Math.sqrt(blurVar) } : undefined };
}

/**
 * A computed length that may be a percentage of 1em (`text-underline-offset`,
 * `text-decoration-thickness` keep a percentage as written): px, a percentage
 * of `em`, or a `calc()` of two such; undefined where it does not read.
 */
export function emLength(token: string, em: number): number | undefined {
    const t = token.trim();
    const px = pxLength(t);
    if (px !== undefined) return px;
    const pct = /^(-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)%$/i.exec(t);
    if (pct !== null) return (Number.parseFloat(pct[1]!) / 100) * em;
    const calc = /^calc\(\s*(.+?)\s+([+-])\s+(.+?)\s*\)$/.exec(t);
    if (calc !== null) {
        const a = emLength(calc[1]!, em);
        const b = emLength(calc[3]!, em);
        if (a !== undefined && b !== undefined) return calc[2] === '-' ? a - b : a + b;
    }
    return undefined;
}

/**
 * A decoration line's band beside one line box: `under`, the line's own
 * box; `ascent`, the face's ascent above its baseline (the line's top plus
 * it is the alphabetic baseline). An underline stands at its offset below the
 * baseline (`text-underline-position: under`: below the line's bottom), as
 * thick as its thickness; an overline at the line's top; a line-through
 * across its middle. Offsets and thicknesses `auto` or `from-font` are read
 * as the face's own (0 and a twelfth of the size); a percentage is of 1em,
 * read against `em` (the caller's upper bound of the font sizes it may be
 * resolved against); a length that reads as neither fails closed
 * (`{ unread }`).
 */
export function underlineBand(
    line: Box,
    kind: 'underline' | 'overline' | 'line-through',
    ascent: number,
    fontSize: number,
    offset: string,
    thickness: string,
    position: string,
    em = fontSize,
): Box | undefined | { unread: string } {
    const auto = (v: string): boolean => v === 'auto' || v === 'from-font' || v === '';
    const thick = auto(thickness.trim()) ? Math.max(1, fontSize / 12) : emLength(thickness, em);
    if (thick === undefined) return { unread: `a decoration thickness this read cannot take apart (${thickness.slice(0, 40)})` };
    if (!(thick > 0)) return undefined;
    if (kind === 'overline') return { left: line.left, top: line.top - thick, right: line.right, bottom: line.top + thick };
    if (kind === 'line-through') {
        const mid = (line.top + line.bottom) / 2;
        return { left: line.left, top: mid - thick / 2, right: line.right, bottom: mid + thick / 2 };
    }
    const off = auto(offset.trim()) ? 0 : emLength(offset, em);
    if (off === undefined) return { unread: `an underline offset this read cannot take apart (${offset.slice(0, 40)})` };
    const from = /\bunder\b/.test(position) ? line.bottom : line.top + ascent;
    return { left: line.left, top: from + off, right: line.right, bottom: from + off + thick };
}

/** What a pseudo-element's place is read from: its host's border box, and its own computed style. */
export type PseudoFacts = {
    host: Box;
    display: string;
    position: string;
    width: string;
    height: string;
    top: string;
    right: string;
    bottom: string;
    left: string;
    marginTop: string;
    marginRight: string;
    marginBottom: string;
    marginLeft: string;
    paddingX: number;
    paddingY: number;
    borderX: number;
    borderY: number;
    fontSize: number;
    lineHeight: string;
    /** Its generated text (`content` as written, quotes and escapes taken off), '' where it holds none. */
    text: string;
    transform: string;
    translate: string;
    rotate: string;
    scale: string;
    offsetPath: string;
    /** Its own computed `zoom` (Chrome returns its lengths unzoomed). */
    zoom: string;
};

/** A pseudo-element's region, or why it fails closed. */
export type PseudoRegion = { box: Box } | { anywhere: string };

/**
 * **Where a pseudo-element can stand** (`PseudoFacts`): somewhere inside a
 * region — its host's border box widened so the pseudo's own width and
 * height fit from its top-left (a box can run past its container), every
 * side moved out by a margin's reach (a negative top or left margin pulls it
 * up or left, a positive one pushes it the other way) and by its relative
 * offsets, and grown by its own text's font size where it holds text (glyphs
 * stand outside a zero-height box). An inline pseudo's width is its text's,
 * each character read as one font size wide, plus its padding and borders;
 * its height its line's.
 *
 * Fails closed (reaches anywhere): a transform, `translate`, `rotate`,
 * `scale` or a motion path, which no box model here follows; its own `zoom`
 * other than 1, which scales every length it has while the computed style
 * gives them unzoomed; `absolute`,
 * `fixed` or `sticky`, out of flow; and a length that does not resolve. A
 * pseudo with `display: none` generates no box and paints nothing: the
 * caller leaves it out before it asks.
 */
export function pseudoRegion(f: PseudoFacts): PseudoRegion {
    for (const [prop, value, none] of [
        ['transform', f.transform, 'none'],
        ['translate', f.translate, 'none'],
        ['rotate', f.rotate, 'none'],
        ['scale', f.scale, 'none'],
        ['offset-path', f.offsetPath, 'none'],
    ] as const) {
        if (value.trim() !== '' && value.trim() !== none) return { anywhere: `it is moved by ${prop} ${value.slice(0, 40)}, which no box model here follows` };
    }
    // Its own zoom scales every length it has, and Chrome returns them unzoomed (the ninth critic's Z1): this reads none of them as painted.
    if (zoomOf(f.zoom) !== 1) return { anywhere: `it is zoomed ${f.zoom.slice(0, 20)}, and its lengths are read unzoomed` };
    if (f.position !== 'static' && f.position !== 'relative') return { anywhere: `it is positioned ${f.position}, out of flow` };
    const inline = f.display === 'inline' || f.display === 'contents';
    const lineH = pxLength(f.lineHeight) ?? f.fontSize * 1.3;
    let w = pxLength(f.width);
    let h = pxLength(f.height);
    if (inline) {
        w = [...f.text].length * f.fontSize + f.paddingX + f.borderX;
        h = Math.max(lineH, f.fontSize * 1.3) + f.paddingY + f.borderY;
    }
    if (w === undefined || h === undefined) return { anywhere: `its size does not resolve (width ${f.width}, height ${f.height})` };
    const m = [f.marginTop, f.marginRight, f.marginBottom, f.marginLeft].map((v) => (v === 'auto' ? 0 : pxLength(v)));
    if (m.some((v) => v === undefined)) return { anywhere: `a margin does not resolve (${f.marginTop} ${f.marginRight} ${f.marginBottom} ${f.marginLeft})` };
    const [mt, mr, mb, ml] = m as [number, number, number, number];
    let dx0 = 0;
    let dx1 = 0;
    let dy0 = 0;
    let dy1 = 0;
    if (f.position === 'relative') {
        const off = [f.top, f.right, f.bottom, f.left].map((v) => (v === 'auto' ? 0 : pxLength(v)));
        if (off.some((v) => v === undefined)) return { anywhere: `an offset does not resolve (${f.top} ${f.right} ${f.bottom} ${f.left})` };
        const [t, r, b, l] = off as [number, number, number, number];
        const dx = f.left !== 'auto' ? l : -r;
        const dy = f.top !== 'auto' ? t : -b;
        dx0 = dx1 = dx;
        dy0 = dy1 = dy;
    }
    const glyphs = f.text !== '' ? f.fontSize : 0;
    return {
        box: {
            left: f.host.left + Math.min(0, ml) - Math.max(0, mr) + dx0 - glyphs,
            top: f.host.top + Math.min(0, mt) - Math.max(0, mb) + dy0 - glyphs,
            right: Math.max(f.host.right, f.host.left + w) + Math.max(0, ml) + Math.max(0, -mr) + dx1 + glyphs,
            bottom: Math.max(f.host.bottom, f.host.top + h) + Math.max(0, mt) + Math.max(0, -mb) + dy1 + glyphs,
        },
    };
}

/** A would-be failure's numbers for its sentence: the kind, where it met the target, and the coverage a blur reached there. */
export type Meet = { kind: ReachKind; at: Box; coverage?: number; what: string };

/** The first sharp reach that meets a target past its base, as a meet. */
export function sharpMeet(kind: ReachKind, rects: readonly Box[], target: Box, base: Box | undefined, what: string): Meet | undefined {
    for (const r of rects) {
        const at = meetsPast(r, target, base);
        if (at !== undefined) return { kind, at, what };
    }
    return undefined;
}

/**
 * Whether blurred layers reach a target past their base under the policy:
 * the composite over the target's pieces past the base, where it reaches
 * `BLUR_OPACITY`, as a meet.
 */
export function blurMeet(kind: ReachKind, layers: readonly Layer[], target: Box, base: Box | undefined, what: string, threshold = BLUR_OPACITY): Meet | undefined {
    const soft = layers.filter((l) => l.sigma > 0);
    if (soft.length === 0) return undefined;
    const pieces = targetPast(target, base);
    if (pieces.length === 0) return undefined;
    const c = compositeOverAny(soft, pieces);
    return c >= threshold ? { kind, at: pieces[0]!, coverage: c, what } : undefined;
}
