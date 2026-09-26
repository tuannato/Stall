/**
 * "A mood nobody can see", measured in CIEDE2000 — pure.
 *
 * The probe's billboard (`probe.ts`) asks every mood row to move the canvas
 * further than a buyer can fail to notice. Until step 5a′ it summed the RGB
 * channel moves of `bg` and `surface` and refused under 60, a proxy that
 * refused 青墨 (the design board's approved mood, 28 channels) while the
 * number that earned the rule — the first Sun-faded, 1.28 below — would
 * have been refused by anything. This module is the measure that replaced
 * it: CIEDE2000 (Sharma, Wu, Dalal, "The CIEDE2000 color-difference
 * formula: Implementation notes, supplementary test data, and mathematical
 * observations", Color Res. Appl. 30(1), 2005) over the D65 pipeline —
 * sRGB companded as `relLum` in `rainDrop.ts` does, the IEC 61966-2-1
 * matrix, CIELAB against white (0.95047, 1, 1.08883). The pipeline is
 * pinned because it moves the verdicts: CSS `lab()` is D50, and there the
 * fixtures read 7.89 / 4.18 / 6.97 (CRITIC-STEP-5 item 5).
 *
 * `moodIsVisible(base, palette)` is the largest ΔE00 over the two grounds a
 * mood swaps — `bg` and `surface`, each falling back to the base look's —
 * and the probe compares it with `MOOD_VISIBLE_MIN`. The fixtures in
 * `moodVisible.test.ts` are RGB literals, never names:
 *
 *   - 青墨 (#ece5d4 → #dde3df, bg only): 7.34, visible.
 *   - Sun-faded v1 (2dc16aa) against Rural's paper of that day: 1.28, not.
 *   - Sun-faded v2 (a450bc2) against today's Rural paper: 4.11, not.
 *   - Sun-faded as shipped (the (c) inks): 6.86, visible.
 *   - After hours against Modern: 88.6, visible.
 *
 * Recorded and NOT pinned as a verdict: Sun-faded v2 against its own day's
 * paper (251,244,230 / 243,231,206) reads 6.96 — above the threshold. It
 * was refused on 2026-08-30 only because Rural's paper moved to meet it, so
 * that reading is a fact about a paper nobody paints any more.
 */

export type Rgb = { readonly r: number; readonly g: number; readonly b: number };
export type Lab = readonly [number, number, number];

/**
 * The threshold, in ΔE00. Why 5 and not a just-noticeable difference
 * (≈ 2.3): CIEDE2000 discounts lightness differences near white and weights
 * hue lightly at low chroma, which is exactly the region Rural's papers
 * live in — so it separates 青墨 (7.34, a hue move on a pale ground a buyer
 * sees at once) from Sun-faded v2 over today's paper (4.11, a pale-on-pale
 * bleach). OKLab cannot: it reads 青墨 2.57 below v2's 2.85. Only the first
 * Sun-faded was ever judged by eye; the gap 4.11 → 6.86 is narrow, and a
 * mood that lands inside it is a call to make with the pictures, not by
 * moving this number.
 */
export const MOOD_VISIBLE_MIN = 5;

/** sRGB channel 0–255 to linear light, the companding `relLum` uses. */
function linear(v: number): number {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
}

/** CIELAB of an sRGB colour, D65 white (0.95047, 1, 1.08883). */
export function srgbToLab(c: Rgb): Lab {
    const r = linear(c.r);
    const g = linear(c.g);
    const b = linear(c.b);
    const x = 0.4124564 * r + 0.3575761 * g + 0.1804375 * b;
    const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
    const z = 0.0193339 * r + 0.119192 * g + 0.9503041 * b;
    const f = (t: number): number => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
    const fx = f(x / 0.95047);
    const fy = f(y / 1);
    const fz = f(z / 1.08883);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

const deg = (rad: number): number => (rad * 180) / Math.PI;
const rad = (d: number): number => (d * Math.PI) / 180;

/** CIEDE2000 colour difference, kL = kC = kH = 1, as in Sharma et al. */
export function deltaE2000(lab1: Lab, lab2: Lab): number {
    const [L1, a1, b1] = lab1;
    const [L2, a2, b2] = lab2;
    const C1 = Math.hypot(a1, b1);
    const C2 = Math.hypot(a2, b2);
    const Cbar = (C1 + C2) / 2;
    const G = 0.5 * (1 - Math.sqrt(Cbar ** 7 / (Cbar ** 7 + 25 ** 7)));
    const a1p = (1 + G) * a1;
    const a2p = (1 + G) * a2;
    const C1p = Math.hypot(a1p, b1);
    const C2p = Math.hypot(a2p, b2);
    const hue = (b: number, ap: number): number => {
        if (b === 0 && ap === 0) {
            return 0;
        }
        const h = deg(Math.atan2(b, ap));
        return h < 0 ? h + 360 : h;
    };
    const h1p = hue(b1, a1p);
    const h2p = hue(b2, a2p);
    const dLp = L2 - L1;
    const dCp = C2p - C1p;
    let dhp = 0;
    if (C1p * C2p !== 0) {
        dhp = h2p - h1p;
        if (dhp > 180) {
            dhp -= 360;
        } else if (dhp < -180) {
            dhp += 360;
        }
    }
    const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(rad(dhp / 2));
    const Lbarp = (L1 + L2) / 2;
    const Cbarp = (C1p + C2p) / 2;
    let hbarp = h1p + h2p;
    if (C1p * C2p !== 0) {
        if (Math.abs(h1p - h2p) <= 180) {
            hbarp = (h1p + h2p) / 2;
        } else if (h1p + h2p < 360) {
            hbarp = (h1p + h2p + 360) / 2;
        } else {
            hbarp = (h1p + h2p - 360) / 2;
        }
    }
    const T =
        1 -
        0.17 * Math.cos(rad(hbarp - 30)) +
        0.24 * Math.cos(rad(2 * hbarp)) +
        0.32 * Math.cos(rad(3 * hbarp + 6)) -
        0.2 * Math.cos(rad(4 * hbarp - 63));
    const dTheta = 30 * Math.exp(-(((hbarp - 275) / 25) ** 2));
    const Rc = 2 * Math.sqrt(Cbarp ** 7 / (Cbarp ** 7 + 25 ** 7));
    const Sl = 1 + (0.015 * (Lbarp - 50) ** 2) / Math.sqrt(20 + (Lbarp - 50) ** 2);
    const Sc = 1 + 0.045 * Cbarp;
    const Sh = 1 + 0.015 * Cbarp * T;
    const Rt = -Math.sin(rad(2 * dTheta)) * Rc;
    return Math.sqrt(
        (dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2 + Rt * (dCp / Sc) * (dHp / Sh),
    );
}

/** ΔE00 between two sRGB colours through the D65 pipeline above. */
export function deltaE2000Rgb(a: Rgb, b: Rgb): number {
    return deltaE2000(srgbToLab(a), srgbToLab(b));
}

/**
 * How far a mood moves the canvas: the larger ΔE00 of the two grounds it
 * swaps, each falling back to the base look's when the mood leaves it.
 * Compare with `MOOD_VISIBLE_MIN`.
 */
export function moodIsVisible(
    base: { readonly bg: Rgb; readonly surface: Rgb },
    palette: { readonly bg?: Rgb; readonly surface?: Rgb },
): number {
    return Math.max(
        deltaE2000Rgb(base.bg, palette.bg ?? base.bg),
        deltaE2000Rgb(base.surface, palette.surface ?? base.surface),
    );
}
