/**
 * `the-aurora-is-read-at-both-ends-of-its-tide`, its pure half (step 5b, the
 * critic, 2026-09-27). The contrast pass reads Neo with the aurora worn alone
 * at `--au-tide` 0 and 1 (`TIDE_SCREENS`) on the claim that the worst ground
 * a line meets is at one end of the tide, never between. That holds on two
 * conditions, pinned here rather than assumed:
 *
 * - every channel of both washes' colours (the accent and the second accent)
 *   is at least the ground's, so each wash only ever lightens the ground;
 * - every ink the look sets on bare ground is lighter than the ground, so a
 *   lighter ground is a worse one.
 *
 * And then the claim itself, numerically: the two washes as `stall.css`
 * paints them (their alphas read from the sheet), stacked over the ground at
 * every strength a radial falloff gives them, across the tide — the least
 * contrast against every ink is at t = 0 or t = 1.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NEO_CITY_THEME_ID, contrastRatio, decodeTheme, themeVars } from '../src/domain/theme';

type Rgb = { r: number; g: number; b: number };
const CSS = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../src/ui/stall.css'), 'utf8');

const rgb = (css: string | undefined): Rgb => {
    const m = /^rgb\((\d+), (\d+), (\d+)\)$/.exec(css ?? '');
    if (m === null) throw new Error(`not rgb(): ${css}`);
    return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) };
};
const over = (top: Rgb, a: number, under: Rgb): Rgb => ({
    r: top.r * a + under.r * (1 - a),
    g: top.g * a + under.g * (1 - a),
    b: top.b * a + under.b * (1 - a),
});
const lum = (c: Rgb): number => {
    const ch = (v: number): number => {
        const x = v / 255;
        return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b);
};

/** The two washes' alphas as `a + b·t` in percent, read from the aurora's own rule. */
function washes(): { token: string; a: number; b: number }[] {
    const rule = /\.stall\.att-aurora \{([^}]*)\}/.exec(CSS)?.[1] ?? '';
    const out = [...rule.matchAll(/var\((--s-accent(?:-2)?)\) calc\((\d+)% ([+-]) (\d+)% \* var\(--au-tide/g)].map((m) => ({
        token: m[1]!,
        a: Number(m[2]),
        b: (m[3] === '+' ? 1 : -1) * Number(m[4]),
    }));
    return out;
}

describe('the-aurora-is-read-at-both-ends-of-its-tide', () => {
    const vars = themeVars(decodeTheme(NEO_CITY_THEME_ID));
    const ground = rgb(vars['--s-bg']);

    it('reads two washes, one rising and one falling with the tide', () => {
        const w = washes();
        expect(w.map((x) => x.token)).toEqual(['--s-accent', '--s-accent-2']);
        expect(w[0]!.b).toBeGreaterThan(0);
        expect(w[1]!.b).toBeLessThan(0);
    });

    it('holds its two conditions: each wash only lightens the ground, and every ink is lighter than the ground', () => {
        for (const token of ['--s-accent', '--s-accent-2']) {
            const c = rgb(vars[token]);
            expect(c.r >= ground.r && c.g >= ground.g && c.b >= ground.b, `${token} ≥ the ground on every channel`).toBe(true);
        }
        for (const ink of ['--s-text', '--s-muted', '--s-accent', '--s-danger']) {
            expect(lum(rgb(vars[ink])), `${ink} is lighter than the ground`).toBeGreaterThan(lum(ground));
        }
    });

    it('finds the least contrast at an end of the tide, at every strength the falloff gives either wash', () => {
        const [w1, w2] = washes();
        const c1 = rgb(vars[w1!.token]);
        const c2 = rgb(vars[w2!.token]);
        const inks = ['--s-text', '--s-muted', '--s-accent', '--s-danger'].map((k) => rgb(vars[k]));
        for (let f1 = 0; f1 <= 1.0001; f1 += 0.1) {
            for (let f2 = 0; f2 <= 1.0001; f2 += 0.1) {
                const at = (t: number): Rgb =>
                    over(c1, ((w1!.a + w1!.b * t) / 100) * f1, over(c2, ((w2!.a + w2!.b * t) / 100) * f2, ground));
                for (const ink of inks) {
                    const ends = Math.min(contrastRatio(ink, at(0)), contrastRatio(ink, at(1)));
                    for (let t = 0; t <= 1.0001; t += 0.02) {
                        expect(contrastRatio(ink, at(t)), `f1 ${f1.toFixed(1)} f2 ${f2.toFixed(1)} t ${t.toFixed(2)}`).toBeGreaterThanOrEqual(ends - 1e-9);
                    }
                }
            }
        }
    });
});
