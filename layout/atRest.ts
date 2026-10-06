/**
 * **What the at-rest rule sets aside, decided from data alone**
 * (`an-outline-that-shows-at-rest` in `probe.ts`;
 * `a-new-root-layer-is-not-exempt-by-position`).
 *
 * The rule reads the ground painted between an outlined line and its
 * stall's root, and a few layers are not that ground: the rain, which is
 * what the outline is for; the aurora's washes and its tint over the rain,
 * and the look's own backdrop scanlines and top glow (Neo's), gradients
 * across the whole stall that no single colour can match; and Grid
 * horizon's art on the sign. Each is matched on its own computed form AND
 * on what paints it — a decoration's class worn on the stall, or the look's
 * own backdrop as its row states it (`LOOK_BACKDROP`) — and never on a
 * look's `t-*` class or id.
 *
 * Pure, so it is held by behaviour: the probe hands it the facts it read
 * off a stall (`RootFacts`: every class the root wears, the backdrop's
 * layers as the stall computes them, its token colours) and it answers the
 * reason a layer is set aside, or `undefined`. A starter wears Neo's rows
 * and Neo's backdrop under `t-workshop`, and the same facts under `t-neo`,
 * `t-workshop` or any class decide the same
 * (`the-at-rest-exceptions-decide-the-same-for-a-starter-and-its-look`).
 * Until 2026-10-06 the backdrop's two asked for `t-neo` inside the probe,
 * and the kit's Neo starter failed 212 lines its look does not paint.
 */

/** An sRGB colour, 0–255 a channel. */
export type Rgb = readonly [number, number, number];

/** A colour as computed, with its alpha. */
export type Colour = { rgb: [number, number, number]; alpha: number };

/** An sRGB colour as computed — `rgb()`, `rgba()` or `color(srgb …)` — with its alpha. */
export function colourOf(value: string): Colour | undefined {
    const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(value);
    if (m !== null) {
        return { rgb: [Number(m[1]), Number(m[2]), Number(m[3])], alpha: m[4] === undefined ? 1 : Number(m[4]) };
    }
    const f = /color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)/.exec(value);
    if (f !== null) {
        const rgb = [f[1], f[2], f[3]].map((v) => Math.round(Number(v) * 255)) as [number, number, number];
        return { rgb, alpha: f[4] === undefined ? 1 : Number(f[4]) };
    }
    /*
     * `oklab()` (step 5a″): a colour an animation sets is interpolated in
     * OKLab and computed as one — the failing lamp's outlined frames
     * (`att-hum-gutter-outlined`) serialise every shadow so, and read as
     * "not an outline" the lamp's glyph lost its outline in the prepare and
     * was read bare. Converted with Björn Ottosson's matrices, as CSS Color 4
     * does, to sRGB rounded to the level.
     */
    const k = /oklab\((-?[\d.]+) (-?[\d.]+) (-?[\d.]+)(?: \/ ([\d.]+))?\)/.exec(value);
    if (k !== null) {
        const [L, A, B] = [Number(k[1]), Number(k[2]), Number(k[3])];
        const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
        const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
        const q = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
        const lin = [
            4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * q,
            -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * q,
            -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * q,
        ];
        const rgb = lin.map((c) => {
            const v = Math.min(1, Math.max(0, c));
            return Math.round(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055));
        }) as [number, number, number];
        return { rgb, alpha: k[4] === undefined ? 1 : Number(k[4]) };
    }
    return undefined;
}

/**
 * What `paints` names when a layer is the look's own backdrop rather than a
 * decoration's: the row's `backdrop`, which the renderer hands the stall as
 * this custom property (`themeVars`). Read as data, so a look is read by
 * what its row paints and never by its class: a starter that copies Neo's
 * row under `t-workshop` carries Neo's backdrop and is read as Neo is.
 */
export const LOOK_BACKDROP = '--s-backdrop';

/** The stall's own tokens the aurora's entries compare a wash's colours with. */
export const ROOT_TOKENS = ['--s-accent', '--s-accent-2'] as const;

/** What the probe read off one stall root for this rule. */
export type RootFacts = {
    /** Every class the root wears — its look's `t-*` class among them, which decides nothing here. */
    readonly classes: readonly string[];
    /** The look's own backdrop layers, exactly as the stall computes `var(--s-backdrop)`. */
    readonly backdrop: readonly string[];
    /** The colours of `ROOT_TOKENS` as the stall computes them. */
    readonly tokens: Readonly<Partial<Record<(typeof ROOT_TOKENS)[number], Colour | undefined>>>;
};

/** A computed colour, in a layer's text. */
const C = String.raw`(?:rgba?\([^)]*\)|color\(srgb [\d.]+ [\d.]+ [\d.]+(?: \/ [\d.]+)?\))`;

/**
 * Whether every colour a layer names is one of the stall's own tokens, at no
 * more than `most` alpha, or transparent: the aurora's washes are its accent
 * and its second accent and nothing else (the critic, 2026-09-27: the entry
 * matched any root `radial-gradient(farthest-side, …` on a stall wearing
 * the aurora).
 */
function coloursAre(layer: string, facts: RootFacts, most: number): boolean {
    const allowed = ROOT_TOKENS.map((t) => facts.tokens[t]?.rgb);
    const named = layer.match(new RegExp(C, 'g')) ?? [];
    return (
        named.length > 0 &&
        named.every((text) => {
            const c = colourOf(text);
            if (c === undefined) return false;
            if (c.alpha === 0) return true;
            return c.alpha <= most + 1e-6 && allowed.some((a) => a !== undefined && a.every((v, i) => Math.abs(v - c.rgb[i]!) <= 1));
        })
    );
}

/**
 * The root's image layers this rule sets aside, each by its own form and
 * what paints it — a decoration's class, or `LOOK_BACKDROP` — with the
 * reason. A root layer none of these names is read like any layer under a
 * line.
 */
export const ROOT_LAYERS_SET_ASIDE: ReadonlyArray<{ name: string; paints: string; test: (layer: string, facts: RootFacts) => boolean }> = [
    // What the outline is for.
    { name: 'the rain', paints: 'att-rainfall', test: (l) => /^url\("?[^")]*\/rain-(?:near|mid|far)[^")]*"?\)$/.test(l) },
    // Two washes across the whole stall, each one accent at most 28% fading
    // to nothing at 66%, and their tint over the rain (140deg, the two
    // accents at most 16%, transparent at 46%) — the exact shapes
    // stall.css's aurora rules paint.
    {
        name: 'the aurora’s washes',
        paints: 'att-aurora',
        test: (l, facts) =>
            new RegExp(String.raw`^radial-gradient\(farthest-side, ${C}, rgba\(0, 0, 0, 0\) 66%\)$`).test(l) &&
            coloursAre(l, facts, 0.28),
    },
    {
        name: 'the aurora’s tint over the rain',
        paints: 'att-aurora',
        test: (l, facts) =>
            new RegExp(String.raw`^linear-gradient\(140deg, ${C}, rgba\(0, 0, 0, 0\) 46%, ${C}\)$`).test(l) &&
            coloursAre(l, facts, 0.16),
    },
    // The look's own backdrop (`--s-backdrop`, Neo's row's): a 1px scanline
    // every 4px, and the glow in its top 480px — each matched on its form AND
    // as a layer the row's backdrop paints, never on the look's class.
    { name: 'the backdrop’s scanlines', paints: LOOK_BACKDROP, test: (l) => /^repeating-linear-gradient\(0deg, .* 0px, .* 1px, .* 1px, .* 4px\)$/.test(l) },
    { name: 'the backdrop’s top glow', paints: LOOK_BACKDROP, test: (l) => /^linear-gradient\((?:180deg, )?[^,]*( 0%)?, rgba?\([^)]*\) 480px\)$/.test(l) },
];

/**
 * A decoration's own art on the surface it paints (step 5a″, D14): what the
 * outline is for, like the rain on the root — matched on its form, the
 * element it paints and the class that paints it. Grid horizon's skyline,
 * moon and stars on the sign. Every other layer of that surface is read as
 * any layer is: a full-size gradient evaluated under the line, a smaller
 * one set aside and counted, a radial or repeating one held to its stops.
 */
export const SURFACE_ART_SET_ASIDE: ReadonlyArray<{ name: string; paints: string; on: string; test: (layer: string) => boolean }> = [
    {
        name: 'Grid horizon’s skyline, moon and stars',
        paints: 'att-horizon',
        on: '.stall-sign',
        test: (l) => /^url\("?[^")]*\/horizon-(?:sky-left|sky-right|sky-fill|moon|stars)[^")]*"?\)$/.test(l),
    },
];

/** Whether `paints` painted `layer`: a decoration's class worn on the root, or one of the look's own backdrop layers, exactly. */
function paintedBy(paints: string, layer: string, facts: RootFacts): boolean {
    return paints === LOOK_BACKDROP ? facts.backdrop.includes(layer) : facts.classes.includes(paints);
}

/** The reason the stall root's `layer` is set aside, or `undefined` when it is read as a ground. */
export function rootLayerSetAside(layer: string, facts: RootFacts): string | undefined {
    return ROOT_LAYERS_SET_ASIDE.find((k) => k.test(layer, facts) && paintedBy(k.paints, layer, facts))?.name;
}

/**
 * The reason a layer of a surface between a line and its root is set aside
 * as a decoration's own art, or `undefined`: `classes` are the stall root's,
 * `matches` asks whether the surface is the element the art paints.
 */
export function surfaceArtSetAside(layer: string, classes: readonly string[], matches: (selector: string) => boolean): string | undefined {
    return SURFACE_ART_SET_ASIDE.find((k) => classes.includes(k.paints) && matches(k.on) && k.test(layer))?.name;
}
