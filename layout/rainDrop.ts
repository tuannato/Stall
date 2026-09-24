/**
 * Neo's rain at its brightest, and the veil a line on it needs — pure.
 *
 * Two readers, one derivation. The probe's contrast pass paints every
 * rain-wearing stall with its drop sheets flattened into one layer of the
 * brightest drop the art draws (`rainAtItsBrightest` in `probe.ts`), and
 * `a-rain-veil-is-the-least-that-reads` (`src/ui/decor-gate.test.ts`)
 * recomputes, from the same art and the look's palette, that each veil step
 * stated in `stall.css` is the least that clears the floor. A drop colour
 * derived twice is how the test and the pass come to disagree about what the
 * worst ground is.
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
 * The lightest drop the three sheets draw over `ground` — Neo's ink is
 * light, so the lightest paint is the worst ground. Every `stroke` with its
 * `stroke-opacity` is read, or none is: a path whose paint the pattern does
 * not match (a full-opacity stroke, swapped attributes, an opacity on its
 * group) would otherwise drop out of the choice and leave a brighter drop
 * unmodelled (the critic's third pass). A sheet the pattern cannot read
 * whole answers `undefined`, and both readers refuse to go on.
 */
export function brightestDrop(sheets: readonly string[], ground: Rgb): Drop | undefined {
    let best: (Drop & { lum: number }) | undefined;
    for (const sheet of sheets) {
        const drops = [...sheet.matchAll(/<path\b[^>]*\sstroke="#([0-9a-fA-F]{6})"\s+stroke-opacity="([0-9.]+)"/g)];
        if (drops.length !== (sheet.match(/<path\b/g) ?? []).length || /<g\b[^>]*opacity/.test(sheet)) {
            return undefined;
        }
        for (const m of drops) {
            const hex = m[1]!;
            const rgb = [0, 2, 4].map((i) => Number.parseInt(hex.slice(i, i + 2), 16)) as unknown as Rgb;
            const alpha = Number(m[2]);
            const composite = over(rgb, alpha, ground);
            const lum = relLum(composite[0], composite[1], composite[2]);
            if (best === undefined || lum > best.lum) {
                best = { rgb, alpha, lum };
            }
        }
    }
    return best === undefined ? undefined : { rgb: best.rgb, alpha: best.alpha };
}

/** A tint the look paints over a line's own box, kept on top of its veil. */
export type Tint = { rgb: Rgb; alpha: number };

/**
 * The least whole step of `stepPct` at which a veil of `veil` over every one
 * of `grounds` — with the line's own `tint`, when it has one, painted on top
 * — reads `floor` against every one of `inks`, or `undefined` when no step up
 * to 100% does.
 */
export function leastVeil(
    inks: readonly Rgb[],
    veil: Rgb,
    grounds: readonly Rgb[],
    tint?: Tint,
    floor = 3,
    stepPct = 5,
): number | undefined {
    for (let pct = 0; pct <= 100; pct += stepPct) {
        if (readsAt(inks, veil, grounds, pct, tint, floor)) {
            return pct;
        }
    }
    return undefined;
}

/** Whether a veil of `veil` at `pct` (and the tint on top) over every ground reads `floor` for every ink. */
export function readsAt(
    inks: readonly Rgb[],
    veil: Rgb,
    grounds: readonly Rgb[],
    pct: number,
    tint?: Tint,
    floor = 3,
): boolean {
    return grounds.every((ground) => {
        const veiled = over(veil, pct / 100, ground);
        const painted = tint === undefined ? veiled : over(tint.rgb, tint.alpha, veiled);
        return inks.every((ink) => contrastOf(ink, painted) >= floor);
    });
}
