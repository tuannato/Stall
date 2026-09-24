/**
 * Neo's rain at its brightest — pure.
 *
 * The probe's contrast pass paints every rain-wearing stall with its drop
 * sheets flattened into one layer of the brightest drop the art draws
 * (`rainAtItsBrightest` in `probe.ts`); `layout/rainDrop.test.ts` holds this
 * reading of the art to the three shipped sheets.
 */

export type Rgb = readonly [number, number, number];
export type Drop = { rgb: Rgb; alpha: number };

/** WCAG relative luminance of an sRGB triple in 0–255. */
export function relLum(r: number, g: number, b: number): number {
    const c = (v: number): number => {
        const x = v / 255;
        return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
}

/** WCAG contrast ratio between two sRGB triples. */
export function contrastOf(a: Rgb, b: Rgb): number {
    const la = relLum(a[0], a[1], a[2]);
    const lb = relLum(b[0], b[1], b[2]);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** `paint` at `alpha` over `ground`, in sRGB, the way a browser composites. */
export function over(paint: Rgb, alpha: number, ground: Rgb): Rgb {
    return [0, 1, 2].map((i) => paint[i]! * alpha + ground[i]! * (1 - alpha)) as unknown as Rgb;
}

/**
 * What a drop sheet may hold, and nothing else (the critic's third pass,
 * round 8): the root `<svg>` with its frame, `<g>` groups carrying only the
 * art's own stroke settings and `fill="none"` — no paint and no opacity — and `<path>`s each
 * carrying exactly its `d`, a six-digit `stroke` and its `stroke-opacity`.
 * An allow-list, not a deny-list: an attribute nobody listed (an opacity on
 * a group, a `fill`, a `transform`, a `style`) is a paint this reading would
 * miss, and it refuses the sheet rather than model it wrongly.
 */
const SHEET_TAGS: Readonly<Record<string, ReadonlySet<string>>> = {
    svg: new Set(['xmlns', 'viewBox', 'width', 'height']),
    g: new Set(['fill', 'stroke-width', 'stroke-linecap']),
    path: new Set(['d', 'stroke', 'stroke-opacity']),
};

/** Every tag's attributes in a sheet, or `undefined` when it holds anything the list does not. */
function sheetTags(sheet: string): { tag: string; attrs: Map<string, string> }[] | undefined {
    const out: { tag: string; attrs: Map<string, string> }[] = [];
    const body = sheet.replace(/<\/(?:svg|g)>/g, '');
    let rest = body;
    for (const m of body.matchAll(/<([a-zA-Z]+)((?:\s+[a-zA-Z:-]+="[^"]*")*)\s*\/?>/g)) {
        rest = rest.replace(m[0], '');
        const allowed = SHEET_TAGS[m[1]!];
        if (allowed === undefined) return undefined;
        const attrs = new Map<string, string>();
        for (const a of m[2]!.matchAll(/([a-zA-Z:-]+)="([^"]*)"/g)) {
            if (!allowed.has(a[1]!) || attrs.has(a[1]!)) return undefined;
            attrs.set(a[1]!, a[2]!);
        }
        out.push({ tag: m[1]!, attrs });
    }
    // Anything the pattern did not consume — text, a comment, a tag written
    // another way — is something this reading has not understood.
    return rest.trim() === '' ? out : undefined;
}

/**
 * The lightest drop the three sheets draw over `ground` — Neo's ink is
 * light, so the lightest paint is the worst ground. Every `stroke` with its
 * `stroke-opacity` is read, and a group may carry only `fill="none"` and the
 * stroke's width and caps (`SHEET_TAGS`): a sheet holding anything else
 * answers `undefined`, and the probe refuses to flatten it.
 */
export function brightestDrop(sheets: readonly string[], ground: Rgb): Drop | undefined {
    let best: (Drop & { lum: number }) | undefined;
    for (const sheet of sheets) {
        const tags = sheetTags(sheet);
        // The strokes stand inside a group that fills nothing: a path
        // outside one would be filled in black by default, a paint unread.
        if (tags === undefined || tags[0]?.tag !== 'svg' || tags[1]?.tag !== 'g') return undefined;
        for (const { tag, attrs } of tags) {
            if (tag === 'g' && attrs.get('fill') !== 'none') return undefined;
            if (tag !== 'path') continue;
            const hex = /^#([0-9a-fA-F]{6})$/.exec(attrs.get('stroke') ?? '')?.[1];
            const alpha = Number(attrs.get('stroke-opacity') ?? Number.NaN);
            if (hex === undefined || !attrs.has('d') || !(alpha >= 0 && alpha <= 1)) return undefined;
            const rgb = [0, 2, 4].map((i) => Number.parseInt(hex.slice(i, i + 2), 16)) as unknown as Rgb;
            const composite = over(rgb, alpha, ground);
            const lum = relLum(composite[0], composite[1], composite[2]);
            if (best === undefined || lum > best.lum) {
                best = { rgb, alpha, lum };
            }
        }
    }
    return best === undefined ? undefined : { rgb: best.rgb, alpha: best.alpha };
}
