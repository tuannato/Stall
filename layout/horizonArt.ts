/**
 * Grid horizon's art at its brightest — pure (step 5a″, the critic's item 1).
 *
 * The horizon draws its skyline and its stars on the sign behind the seller's
 * name. Which of its lit windows and stars fall under a ring pixel of the
 * name's outline depends on the seller's own words, so a read of the art as
 * painted is a read of one name. The probe's contrast pass reads the sign as
 * painted — the failing guard — and then, for a report held to a baseline
 * (the owner's C, 2026-09-27), paints every horizon-wearing sign with its
 * skyline and star sheets flattened into one layer of the brightest paint
 * those sheets draw (`horizonAtItsWorst` in `probe.ts`, `HORIZON_WORST` in
 * the runner), as the rain's drops are (`rainDrop.ts`) — the rain as a fail,
 * because its drops cross every glyph; the horizon's lights are static and
 * sparse. `layout/horizonArt.test.ts` holds this reading to the four shipped
 * sheets.
 *
 * The moon is not one of them. It is drawn with a mask and a gradient this
 * reading does not model, it stands in the pin's gutter, clear of the name
 * by `has-pin`'s padding, and it is not drawn where there is no pin
 * (`stall.css`, Grid horizon) — so the flatten keeps it as it is, stated.
 */
import { over, relLum, type Drop, type Rgb } from './rainDrop';

/**
 * What a skyline or star sheet may hold, and nothing else: the root `<svg>`
 * with its frame, and `<rect>`s and `<circle>`s each carrying its geometry,
 * a six-digit `fill` and at most a `fill-opacity`. An allow-list: a group,
 * a transform, a style, a stroke, a gradient or a mask is a paint this
 * reading would miss, and it refuses the sheet rather than read it short.
 */
const ART_TAGS: Readonly<Record<string, ReadonlySet<string>>> = {
    svg: new Set(['xmlns', 'viewBox', 'width', 'height']),
    rect: new Set(['x', 'y', 'width', 'height', 'fill', 'fill-opacity']),
    circle: new Set(['cx', 'cy', 'r', 'fill', 'fill-opacity']),
};

/** One paint the art draws: a fill and its opacity. */
export type ArtPaint = Drop;

/** Every paint a sheet draws, or `undefined` when it holds anything the list does not. */
export function artPaints(sheet: string): ArtPaint[] | undefined {
    const out: ArtPaint[] = [];
    const body = sheet.replace(/<\/svg>/g, '');
    let rest = body;
    let first = true;
    for (const m of body.matchAll(/<([a-zA-Z]+)((?:\s+[a-zA-Z:-]+="[^"]*")*)\s*\/?>/g)) {
        rest = rest.replace(m[0], '');
        const allowed = ART_TAGS[m[1]!];
        if (allowed === undefined || (first !== (m[1] === 'svg'))) return undefined;
        first = false;
        const attrs = new Map<string, string>();
        for (const a of m[2]!.matchAll(/([a-zA-Z:-]+)="([^"]*)"/g)) {
            if (!allowed.has(a[1]!) || attrs.has(a[1]!)) return undefined;
            attrs.set(a[1]!, a[2]!);
        }
        if (m[1] === 'svg') continue;
        const hex = /^#([0-9a-fA-F]{6})$/.exec(attrs.get('fill') ?? '')?.[1];
        // A plain number from 0 to 1 and nothing else (the critic, step 5a″
        // item 2): `Number('')` is 0 and `Number('1e-1')` reads, and neither
        // is a way the art is written.
        const opacity = attrs.get('fill-opacity');
        if (opacity !== undefined && !/^(0|1|0?\.\d+)$/.test(opacity)) return undefined;
        const alpha = opacity === undefined ? 1 : Number(opacity);
        if (hex === undefined || !(alpha >= 0 && alpha <= 1)) return undefined;
        out.push({ rgb: [0, 2, 4].map((i) => Number.parseInt(hex.slice(i, i + 2), 16)) as unknown as Rgb, alpha });
    }
    // Anything the pattern did not consume — text, a comment, a tag written
    // another way — is something this reading has not understood.
    return rest.trim() === '' && !first ? out : undefined;
}

/** One of the four sheets this reading reads, as a computed `url()` layer. */
export const isHorizonSheet = (layer: string): boolean =>
    /^url\("?[^")]*\/horizon-(?:sky-left|sky-right|sky-fill|stars)[^")]*"?\)$/.test(layer);

/** The moon, which this reading does not read and the flatten keeps. */
export const isHorizonMoon = (layer: string): boolean => /^url\("?[^")]*\/horizon-moon[^")]*"?\)$/.test(layer);

/**
 * Whether a sign's computed background layers are ones the flatten may
 * replace: the four sheets each once, the moon at most once, and no other
 * picture — any other `url()` is art this reading has not read, and the
 * sign is refused rather than flattened around it (the critic, step 5a″
 * item 2).
 */
export function signLayersRead(layers: readonly string[]): boolean {
    const pictures = layers.filter((layer) => /^url\(/.test(layer));
    const sheets = pictures.filter(isHorizonSheet);
    const moons = pictures.filter(isHorizonMoon);
    return sheets.length === 4 && new Set(sheets.map((l) => /horizon-[a-z-]+/.exec(l)![0])).size === 4 && moons.length <= 1 && sheets.length + moons.length === pictures.length;
}

/**
 * The lightest paint the sheets draw over `ground` — Neo's inks on the sign
 * are light, so the lightest paint is the worst ground — or `undefined`
 * when a sheet holds anything `ART_TAGS` does not name, and the probe
 * refuses to flatten it.
 */
export function brightestArt(sheets: readonly string[], ground: Rgb): ArtPaint | undefined {
    let best: (ArtPaint & { lum: number }) | undefined;
    for (const sheet of sheets) {
        const paints = artPaints(sheet);
        if (paints === undefined) return undefined;
        for (const paint of paints) {
            const c = over(paint.rgb, paint.alpha, ground);
            const lum = relLum(c[0], c[1], c[2]);
            if (best === undefined || lum > best.lum) best = { ...paint, lum };
        }
    }
    return best === undefined ? undefined : { rgb: best.rgb, alpha: best.alpha };
}
