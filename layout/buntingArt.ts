/**
 * Where Rural's bunting starts to paint, read from its own art — pure
 * (step 5b, `the-bunting-never-swings-into-the-ornament-label`).
 *
 * The row's box is taller than its paint: the string hangs from a few
 * pixels below the box's top at the tile's edges and sags lower between
 * them. A swing bounded by the box alone read the box's top edge against the
 * strip's label and failed on the space between, where nothing is drawn. So
 * the swept region starts at the art's topmost paint: the least `y` any
 * path's control points reach (a Bézier lies inside its control polygon,
 * so that is a bound, never an estimate), less half the widest stroke that
 * path draws, as a share of the view box's height.
 *
 * An allow-list, as the rain's and the confetti's readers are: the root
 * `<svg>` with its view box, `<g>` groups carrying an opacity at most, and
 * `<path>`s carrying `d`, `fill`, `fill-opacity`, `stroke` and
 * `stroke-width`, their `d` in the commands M, L, H, V, C, S, Q, T and Z,
 * absolute or relative. Anything else refuses the art — `undefined` — and
 * the probe then refuses the check rather than guess.
 */
const TAGS: Readonly<Record<string, ReadonlySet<string>>> = {
    svg: new Set(['xmlns', 'viewBox', 'preserveAspectRatio']),
    g: new Set(['opacity']),
    path: new Set(['d', 'fill', 'fill-opacity', 'stroke', 'stroke-width']),
};

/** The least `y` a path's control points reach, or `undefined` for a `d` this reader does not read. */
export function pathTop(d: string): number | undefined {
    const tokens = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g);
    if (tokens === null || tokens.join('').length === 0) return undefined;
    // Every character of `d` must be a token or a separator.
    if (d.replace(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?|[\s,]/g, '') !== '') return undefined;
    const ARGS: Record<string, number> = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, z: 0 };
    let x = 0;
    let y = 0;
    let startX = 0;
    let startY = 0;
    let top = Infinity;
    let i = 0;
    let cmd = '';
    // The last control point of a cubic (C, S) or a quadratic (Q, T): an S
    // or a T reflects it through the current point, a control point `d`
    // never writes — and one that bounds the curve like any other.
    let cubic: [number, number] | undefined;
    let quad: [number, number] | undefined;
    while (i < tokens.length) {
        if (/[a-zA-Z]/.test(tokens[i]!)) {
            cmd = tokens[i]!;
            i += 1;
        } else if (cmd === '') {
            return undefined;
        }
        const lower = cmd.toLowerCase();
        const n = ARGS[lower];
        if (n === undefined) return undefined;
        const rel = cmd === lower;
        if (n === 0) {
            x = startX;
            y = startY;
            top = Math.min(top, y);
            cubic = undefined;
            quad = undefined;
            continue;
        }
        const nums = tokens.slice(i, i + n).map(Number);
        if (nums.length !== n || nums.some((v) => !Number.isFinite(v))) return undefined;
        i += n;
        if (lower === 'h') {
            x = rel ? x + nums[0]! : nums[0]!;
        } else if (lower === 'v') {
            y = rel ? y + nums[0]! : nums[0]!;
        } else {
            // Every pair is a control point or the end point: each y bounds the curve.
            const pts: [number, number][] = [];
            for (let k = 0; k < n; k += 2) {
                pts.push([rel ? x + nums[k]! : nums[k]!, rel ? y + nums[k + 1]! : nums[k + 1]!]);
            }
            if (lower === 's') {
                const r = cubic ?? [x, y];
                pts.unshift([2 * x - r[0], 2 * y - r[1]]);
            } else if (lower === 't') {
                const r = quad ?? [x, y];
                pts.unshift([2 * x - r[0], 2 * y - r[1]]);
            }
            for (const [, py] of pts) top = Math.min(top, py);
            cubic = lower === 'c' || lower === 's' ? pts[pts.length - 2] : undefined;
            quad = lower === 'q' || lower === 't' ? pts[pts.length - 2] : undefined;
            [x, y] = pts[pts.length - 1]!;
        }
        if (lower === 'h' || lower === 'v') {
            cubic = undefined;
            quad = undefined;
        }
        top = Math.min(top, y);
        if (lower === 'm') {
            startX = x;
            startY = y;
            // Further pairs after a moveto are linetos.
            cmd = rel ? 'l' : 'L';
        }
    }
    return Number.isFinite(top) ? top : undefined;
}

/** The art's topmost paint as a share of its view box's height (0 = the top edge), or `undefined`. */
export function artTopShare(svg: string): number | undefined {
    const body = svg.replace(/<\/(?:svg|g)>/g, '').trim();
    let rest = body;
    let viewH: number | undefined;
    let top = Infinity;
    for (const m of body.matchAll(/<([a-zA-Z]+)((?:\s+[a-zA-Z:-]+="[^"]*")*)\s*\/?>/g)) {
        rest = rest.replace(m[0], '');
        const allowed = TAGS[m[1]!];
        if (allowed === undefined) return undefined;
        const attrs = new Map<string, string>();
        for (const a of m[2]!.matchAll(/([a-zA-Z:-]+)="([^"]*)"/g)) {
            if (!allowed.has(a[1]!) || attrs.has(a[1]!)) return undefined;
            attrs.set(a[1]!, a[2]!);
        }
        if (m[1] === 'svg') {
            const box = (attrs.get('viewBox') ?? '').trim().split(/[\s,]+/).map(Number);
            if (box.length !== 4 || box.some((v) => !Number.isFinite(v)) || box[1] !== 0 || !(box[3]! > 0)) return undefined;
            viewH = box[3];
        } else if (m[1] === 'path') {
            const d = attrs.get('d');
            const t = d === undefined ? undefined : pathTop(d);
            if (t === undefined) return undefined;
            const stroked = attrs.has('stroke') && attrs.get('stroke') !== 'none';
            const width = stroked ? Number(attrs.get('stroke-width') ?? '1') : 0;
            if (!Number.isFinite(width)) return undefined;
            top = Math.min(top, t - width / 2);
        }
    }
    if (rest.trim() !== '' || viewH === undefined || !Number.isFinite(top)) return undefined;
    return Math.max(0, top) / viewH;
}
