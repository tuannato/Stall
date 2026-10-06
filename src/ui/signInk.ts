/**
 * How far a sign line's letters reach, and what may clip them (step 8f2,
 * after its critic's P1-1): **one ink model**, shared by the name ladder's
 * fit (`lookHooks.ts`'s `realFits`) and the layout probe's
 * `the-sellers-name-stands-whole` (`layout/probe.ts`), so the ladder climbs
 * exactly until the probe would call the name whole in its own box; and
 * **one clip model**, the probe's, of which the ladder asks only that box
 * (below).
 *
 * **Ink, not the line box.** A line's extent across its lines is where its
 * glyphs reach, measured (`measureText`'s actual bounding box of the line's
 * own text, in its computed face) from the line's baseline — never the
 * line-height's slot nor the face's content area. Under a tight line-height
 * the content area runs past the slot with every glyph inside it, and over a
 * Vietnamese capital the stacked marks run past both: "ẪỮỆ" at 44px in
 * Inter 800 reaches 48.7px above its baseline against a face ascent of 43
 * (the critic's measurement), so a box that holds the slot cuts the marks
 * and Ẫ reads Â. The text measured is the text painted: `text-transform`
 * applied, small caps and the width handed to the canvas (`painted`; the
 * critic's re-check of cdedb29 — read as written, a lowercase name a look
 * uppercases was measured 8px short of its marks). Along the line, its
 * advance, trailing letter-spacing aside.
 * In a vertical writing mode the over side of a line is its right, so the
 * ink is turned onto the horizontal axis — exact for a sideways (rotated)
 * line, an approximation for upright glyphs, which sit on a central
 * baseline.
 *
 * **Clips** (`paintClips`), each at the box CSS clips to: `overflow` on
 * either axis and `contain: paint` (the padding box, per axis, with whether
 * the box scrolls there), and a basic `clip-path` shape resolved against its
 * reference box — `inset()` (and what `xywh()`/`rect()` compute to) as a
 * box, `circle()` and `ellipse()` by their corners (an `inset()`'s round
 * corners are read square, stated). A `polygon()`, a `path()`, a bare box
 * keyword or a `url()` is a clip this model does not resolve and says so:
 * the probe resolves a polygon itself and fails the rest. The ladder asks
 * no clip but its own box (`inkFits`): the shapes cost the app's bundle
 * ~2.7 KB the served ceiling does not have, so a look that clips its name
 * with a shape is failed by the probe rather than climbed past — and the
 * probe holds the name's own padding box inside every clip and shape above
 * it too, so the ladder's fit (ink inside the box) and the probe's (the box
 * inside every clip) keep a name whole at lengths no screen paints.
 */

export type Box = { left: number; top: number; right: number; bottom: number };

/** A clip on the axes, at a padding box: `overflow` or `contain: paint`. */
export type AxisClip = { kind: 'axes'; box: Box; x: boolean; y: boolean; scrollsX: boolean; scrollsY: boolean };
/**
 * A `clip-path` shape this model resolves: whether a line's box stands
 * inside it, and for an `inset()` the box it is (read like an axis clip,
 * which a box above a scroller has to be).
 */
export type ShapeClip = { kind: 'shape'; inside: (b: Box) => boolean; what: string; box?: Box };
/** A `clip-path` this model does not resolve. */
export type OtherClip = { kind: 'other'; what: string };
export type PaintClip = AxisClip | ShapeClip | OtherClip;

const px = (v: string): number => Number.parseFloat(v) || 0;

/** `el`'s padding box (where overflow and `contain: paint` clip), in viewport px. */
export function paddingBox(el: Element): Box {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const left = r.left + px(cs.borderLeftWidth);
    const top = r.top + px(cs.borderTopWidth);
    return { left, top, right: left + el.clientWidth, bottom: top + el.clientHeight };
}

/** A computed length against `basis`: `Npx`, `N%`, `0`, or `calc(A% ± Bpx)`; NaN otherwise. */
function len(token: string, basis: number): number {
    const calc = /^calc\(\s*(-?[\d.]+)%\s*([+-])\s*(-?[\d.]+)px\s*\)$/.exec(token);
    if (calc !== null) {
        return (Number(calc[1]) / 100) * basis + (calc[2] === '-' ? -1 : 1) * Number(calc[3]);
    }
    const m = /^(-?[\d.]+)(px|%)?$/.exec(token);
    return m === null || (m[2] === undefined && m[1] !== '0') ? Number.NaN : m[2] === '%' ? (Number(m[1]) / 100) * basis : Number(m[1]);
}

/** The top-level space-separated tokens of `s` (a `calc(...)` stays one). */
function tokens(s: string): string[] {
    const out: string[] = [];
    let depth = 0;
    let cur = '';
    for (const c of s.trim()) {
        if (c === '(') depth += 1;
        if (c === ')') depth -= 1;
        if (c === ' ' && depth === 0) {
            if (cur !== '') out.push(cur);
            cur = '';
        } else {
            cur += c;
        }
    }
    if (cur !== '') out.push(cur);
    return out;
}

const SPOT: Readonly<Record<string, string>> = { left: '0%', top: '0%', center: '50%', right: '100%', bottom: '100%' };

/** A basic `clip-path` shape of `el`, resolved; undefined for none. */
function shapeOf(el: Element, value: string): ShapeClip | OtherClip | undefined {
    if (value === 'none' || value === '') return undefined;
    const m = /^(inset|circle|ellipse)\((.*)\)\s*(border-box|padding-box|content-box)?$/.exec(value);
    if (m === null) return { kind: 'other', what: value };
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    let ref: Box = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    if (m[3] === 'padding-box' || m[3] === 'content-box') {
        ref = paddingBox(el);
        if (m[3] === 'content-box') {
            ref = { left: ref.left + px(cs.paddingLeft), top: ref.top + px(cs.paddingTop), right: ref.right - px(cs.paddingRight), bottom: ref.bottom - px(cs.paddingBottom) };
        }
    }
    const w = ref.right - ref.left;
    const h = ref.bottom - ref.top;
    const [shape, rest] = [m[1], m[2]!.split(' round ')[0]!];
    if (shape === 'inset') {
        const t = tokens(rest);
        const [a, b = a, c = a, d = b] = t;
        const box = {
            top: ref.top + len(a ?? '0', h),
            right: ref.right - len(b ?? '0', w),
            bottom: ref.bottom - len(c ?? '0', h),
            left: ref.left + len(d ?? '0', w),
        };
        if (Object.values(box).some(Number.isNaN)) return { kind: 'other', what: value };
        return {
            kind: 'shape',
            what: value,
            box,
            inside: (l) => l.left >= box.left - 1 && l.right <= box.right + 1 && l.top >= box.top - 1 && l.bottom <= box.bottom + 1,
        };
    }
    const [radii, at] = rest.split(/\s*at\s*/);
    const pos = tokens(at ?? 'center center').map((p) => SPOT[p] ?? p);
    const cx = ref.left + len(pos[0] ?? '50%', w);
    const cy = ref.top + len(pos[1] ?? '50%', h);
    const side = (r1: string | undefined, basis: number, near: number, far: number): number =>
        r1 === undefined || r1 === 'closest-side' ? near : r1 === 'farthest-side' ? far : len(r1, basis);
    const r2 = tokens(radii ?? '');
    let rx: number;
    let ry: number;
    if (shape === 'circle') {
        const near = Math.min(cx - ref.left, ref.right - cx, cy - ref.top, ref.bottom - cy);
        const far = Math.max(cx - ref.left, ref.right - cx, cy - ref.top, ref.bottom - cy);
        rx = ry = side(r2[0], Math.hypot(w, h) / Math.SQRT2, near, far);
    } else {
        rx = side(r2[0], w, Math.min(cx - ref.left, ref.right - cx), Math.max(cx - ref.left, ref.right - cx));
        ry = side(r2[1], h, Math.min(cy - ref.top, ref.bottom - cy), Math.max(cy - ref.top, ref.bottom - cy));
    }
    if (![cx, cy, rx, ry].every(Number.isFinite)) return { kind: 'other', what: value };
    const inE = (x: number, y: number): boolean => ((x - cx) / (rx + 1)) ** 2 + ((y - cy) / (ry + 1)) ** 2 <= 1;
    return {
        kind: 'shape',
        what: value,
        inside: (l) => inE(l.left, l.top) && inE(l.right, l.top) && inE(l.left, l.bottom) && inE(l.right, l.bottom),
    };
}

/** Every clip `el` paints its content inside (the module's docblock). */
export function paintClips(el: Element): PaintClip[] {
    const cs = getComputedStyle(el);
    const out: PaintClip[] = [];
    const paint = /\b(paint|content|strict)\b/.test(cs.contain);
    const x = paint || cs.overflowX !== 'visible';
    const y = paint || cs.overflowY !== 'visible';
    if (x || y) {
        const scrolls = (v: string): boolean => v === 'auto' || v === 'scroll';
        out.push({
            kind: 'axes',
            box: paddingBox(el),
            x,
            y,
            scrollsX: scrolls(cs.overflowX) && el.scrollWidth > el.clientWidth + 1,
            scrollsY: scrolls(cs.overflowY) && el.scrollHeight > el.clientHeight + 1,
        });
    }
    const shape = shapeOf(el, cs.clipPath);
    if (shape !== undefined) out.push(shape);
    return out;
}

let measure: CanvasRenderingContext2D | null | undefined;

/** `font-stretch`'s computed percentages that canvas takes as keywords. */
const STRETCH: Readonly<Record<string, string>> = {
    '50%': 'ultra-condensed',
    '62.5%': 'extra-condensed',
    '75%': 'condensed',
    '87.5%': 'semi-condensed',
    '112.5%': 'semi-expanded',
    '125%': 'expanded',
    '150%': 'extra-expanded',
    '200%': 'ultra-expanded',
};

/**
 * A line's text as it is painted: `text-transform` applied (the 8f2
 * critic's re-check, item 1 — Neo's row uppercases its sign, and a seller
 * types a lowercase Vietnamese name: "ẫữệ" measured as written reaches
 * 40.7px above the baseline at 44px in Inter 800, "ẪỮỆ" as painted 48.7).
 * `capitalize` raises the letter after any non-letter, which can only
 * raise more letters than CSS does — the measure errs tall, never short.
 * Case is mapped without a locale: the app's documents are `lang="en"`.
 * `full-width` and `full-size-kana` are not applied, stated.
 */
function painted(text: string, transform: string): string {
    return transform === 'uppercase'
        ? text.toUpperCase()
        : transform === 'lowercase'
          ? text.toLowerCase()
          : transform === 'capitalize'
            ? text.replace(/(^|\P{L})(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase())
            : text;
}

/**
 * The ink of every line of `el`'s text: one box per line of each text
 * node, across the lines from the glyphs' measured reach about the
 * baseline, along them the advance less trailing letter-spacing. Where no
 * canvas measures (a test's DOM), the line box itself.
 */
export function inkLines(el: Element): Box[] {
    const ctx = (measure ??= document.createElement('canvas').getContext('2d'));
    const out: Box[] = [];
    const range = document.createRange();
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
        const text = node as Text;
        const owner = text.parentElement;
        if (owner === null || text.data.trim() === '') continue;
        const cs = getComputedStyle(owner);
        const vertical = !cs.writingMode.startsWith('horizontal');
        const spacing = Math.max(0, px(cs.letterSpacing));
        range.selectNodeContents(text);
        const lines = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
        // Which line each character stands on, by where its own box is.
        const words = lines.map(() => '');
        let line = 0;
        let at = 0;
        for (const ch of text.data) {
            range.setStart(text, at);
            range.setEnd(text, at + ch.length);
            at += ch.length;
            const r = range.getBoundingClientRect();
            if (r.width > 0 || r.height > 0) {
                const mid = vertical ? r.left + r.width / 2 : r.top + r.height / 2;
                const found = lines.findIndex((l) => (vertical ? mid >= l.left && mid <= l.right : mid >= l.top && mid <= l.bottom));
                if (found >= 0) line = found;
            }
            words[line] += ch;
        }
        lines.forEach((r, i) => {
            const word = painted(words[i]!.trim(), cs.textTransform);
            if (word === '') return;
            let up = 0;
            let down = 0;
            let ascent = 0;
            if (ctx !== null) {
                ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
                // Small caps and a width as painted; a stretch only a
                // percentage states falls back to normal (canvas takes the
                // nine keywords alone), which moves an advance, not the reach
                // above and below the baseline this measure reads.
                ctx.fontVariantCaps = cs.fontVariantCaps as CanvasFontVariantCaps;
                ctx.fontStretch = (STRETCH[cs.fontStretch] ?? 'normal') as CanvasFontStretch;
                const m = ctx.measureText(word);
                [up, down, ascent] = [m.actualBoundingBoxAscent, m.actualBoundingBoxDescent, m.fontBoundingBoxAscent];
            }
            if (ctx === null || !(up + down > 0)) {
                out.push({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
            } else if (vertical) {
                const base = r.right - ascent;
                out.push({ left: base - down, top: r.top, right: base + up, bottom: Math.max(r.top + 1, r.bottom - spacing) });
            } else {
                const base = r.top + ascent;
                out.push({ left: r.left, top: base - up, right: Math.max(r.left + 1, r.right - spacing), bottom: base + down });
            }
        });
    }
    return out;
}

/**
 * Whether `el`'s text stands whole in its own box: every line's ink inside
 * its padding box on both axes, whatever its `overflow` says (the look
 * bounds the box), a pixel of rounding allowed. No `clip-path` is asked
 * (the module's docblock).
 */
export function inkFits(el: Element): boolean {
    const box = paddingBox(el);
    return inkLines(el).every(
        (l) => l.left >= box.left - 1 && l.right <= box.right + 1 && l.top >= box.top - 1 && l.bottom <= box.bottom + 1,
    );
}
