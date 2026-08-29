import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
    BANNED_THEME_PROPS,
    DEFAULT_THEME,
    FONT_STACKS,
    DEFAULT_THEME_ID,
    MIN_CONTRAST,
    NEO_CITY_THEME_ID,
    RURAL_THEME_ID,
    contrastRatio,
    decodeTheme,
    isShippedThemeId,
    themeVars,
    type DecodedTheme,
    type Rgb,
} from './theme';

function rgbOf(cssValue: string): Rgb {
    const m = cssValue.match(/^rgb\((\d+), (\d+), (\d+)\)$/);
    if (!m) {
        throw new Error(`not an rgb() value: ${cssValue}`);
    }
    return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) };
}

/** WCAG relative luminance, for identity assertions: dark stays dark. */
function relativeLuminanceOf(c: Rgb): number {
    const f = (v: number): number => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
}

describe('decodeTheme', () => {
    it('returns the shipped row for an id we ship', () => {
        const t = decodeTheme(DEFAULT_THEME_ID);
        expect(t.id).toBe(DEFAULT_THEME_ID);
        expect(t.known).toBe(true);
        expect(t.bg).toEqual(DEFAULT_THEME.bg);
    });
});

describe('theme-table-ids-are-pinned', () => {
    /**
     * A published record names a number, and that number is permanent. What
     * the number means is a look's **identity**, not its pixels: the owner
     * decided (2026-08-29, PLAN-REDESIGN D1, while the only signed records on
     * chain were his own) that an id's mapping is frozen and its rendering may
     * be refined — a shop repainted is the same shop. A **replacement** look
     * is a new id, so what this asserts is what a replacement could not fake:
     * the ids themselves, and each look's family. Re-pointing Rural's id at a
     * dark cyber look goes red here; polishing Rural does not.
     */
    it('pins 0x01 as Modern, the look painted with no manifest at all', () => {
        expect(DEFAULT_THEME_ID).toBe(0x01);
        const t = decodeTheme(0x01);
        expect(t.known).toBe(true);
        // 0x01 IS the default look, whatever the default look currently is.
        expect(t.bg).toEqual(DEFAULT_THEME.bg);
        expect(relativeLuminanceOf(t.bg)).toBeGreaterThan(0.5);
    });

    it('pins 0x02 as the dark look and 0x03 as the warm light look', () => {
        expect(NEO_CITY_THEME_ID).toBe(0x02);
        expect(RURAL_THEME_ID).toBe(0x03);
        const neo = decodeTheme(0x02);
        // Neo city's identity is night. A light 0x02 is a re-point, not a polish.
        expect(relativeLuminanceOf(neo.bg)).toBeLessThan(0.1);
        const rural = decodeTheme(0x03);
        // Rural's identity is warm daylight paper: light, and warm-ordered.
        expect(relativeLuminanceOf(rural.bg)).toBeGreaterThan(0.5);
        expect(rural.bg.r).toBeGreaterThanOrEqual(rural.bg.g);
        expect(rural.bg.g).toBeGreaterThanOrEqual(rural.bg.b);
        // Three ids, three different shops.
        const modern = decodeTheme(0x01);
        expect(neo.bg).not.toEqual(modern.bg);
        expect(rural.bg).not.toEqual(modern.bg);
        expect(rural.bg).not.toEqual(neo.bg);
    });

    it('ships no id whose own palette hides the asked amount', () => {
        // The synthetic case below proves the correction works. This proves we
        // never needed it: a shipped look that had to be lifted would be a look
        // nobody reviewed, painted on somebody's shop.
        for (const id of [DEFAULT_THEME_ID, NEO_CITY_THEME_ID, RURAL_THEME_ID]) {
            const theme = decodeTheme(id);
            expect(isShippedThemeId(id)).toBe(true);
            const vars = themeVars(theme);
            expect(rgbOf(vars['--s-text']!)).toEqual(theme.text);
            expect(rgbOf(vars['--s-accent']!)).toEqual(theme.accent);
            expect(rgbOf(vars['--s-muted']!)).toEqual(theme.muted);
        }
    });
});

describe('unknown-theme-id-is-not-silent-default', () => {
    it('falls back without throwing and keeps the id it was asked for', () => {
        const t = decodeTheme(0xfe);
        expect(isShippedThemeId(0xfe)).toBe(false);
        // A bad byte must not brick a stall, so the look is the default one.
        expect(t.bg).toEqual(DEFAULT_THEME.bg);
        // But the screen has to be able to say the look is ours, not theirs.
        expect(t.known).toBe(false);
        expect(t.id).toBe(0xfe);
    });
});

describe('asked-amount-not-covered', () => {
    it('theme vars are custom properties only and never banned CSS', () => {
        const vars = themeVars(DEFAULT_THEME);
        const keys = Object.keys(vars);
        expect(keys.every((k) => k.startsWith('--s-'))).toBe(true);
        for (const banned of BANNED_THEME_PROPS) {
            expect(keys).not.toContain(banned);
            expect(Object.values(vars).join(' ')).not.toContain(banned);
        }
        expect(vars['--s-font']).toBe(FONT_STACKS[0]);
    });
});

describe('theme-cannot-hide-the-asked-amount', () => {
    /**
     * The banned-property list stops a layout being laid over the price. It
     * does not stop the price being painted its own background colour, which
     * hides it just as completely and costs one byte.
     */
    it('lifts a colour that would vanish into its background', () => {
        const invisible: DecodedTheme = {
            ...DEFAULT_THEME,
            bg: { r: 18, g: 18, b: 18 },
            surface: { r: 18, g: 18, b: 18 },
            text: { r: 18, g: 18, b: 18 },
            muted: { r: 18, g: 18, b: 18 },
            accent: { r: 18, g: 18, b: 18 },
        };
        const vars = themeVars(invisible);
        const bg = rgbOf(vars['--s-bg']!);

        // The price inherits --s-text; the buy label is --s-bg on --s-accent.
        expect(contrastRatio(rgbOf(vars['--s-text']!), bg)).toBeGreaterThanOrEqual(
            MIN_CONTRAST,
        );
        expect(contrastRatio(rgbOf(vars['--s-accent']!), bg)).toBeGreaterThanOrEqual(
            MIN_CONTRAST,
        );
        expect(contrastRatio(rgbOf(vars['--s-muted']!), bg)).toBeGreaterThanOrEqual(
            MIN_CONTRAST,
        );
    });

    it('leaves the shipped palette and a legible dark theme exactly as authored', () => {
        const shipped = themeVars(DEFAULT_THEME);
        expect(rgbOf(shipped['--s-text']!)).toEqual(DEFAULT_THEME.text);
        expect(rgbOf(shipped['--s-muted']!)).toEqual(DEFAULT_THEME.muted);
        expect(rgbOf(shipped['--s-accent']!)).toEqual(DEFAULT_THEME.accent);
        expect(rgbOf(shipped['--s-danger']!)).toEqual(DEFAULT_THEME.danger);

        const dark: DecodedTheme = {
            ...DEFAULT_THEME,
            bg: { r: 16, g: 18, b: 22 },
            surface: { r: 26, g: 29, b: 34 },
            text: { r: 236, g: 238, b: 242 },
            muted: { r: 150, g: 158, b: 170 },
            accent: { r: 122, g: 190, b: 255 },
            danger: { r: 240, g: 130, b: 120 },
        };
        const vars = themeVars(dark);
        expect(rgbOf(vars['--s-text']!)).toEqual(dark.text);
        expect(rgbOf(vars['--s-muted']!)).toEqual(dark.muted);
        expect(rgbOf(vars['--s-accent']!)).toEqual(dark.accent);
        expect(rgbOf(vars['--s-danger']!)).toEqual(dark.danger);
    });
});

describe('theme-ornaments-are-pinned-per-id', () => {
    /**
     * An ornament is theme data, like the palette: the label and kind travel in
     * the row, so adding a theme is adding a row and the renderer never grows.
     * Pin what each shipped id carries so a later edit cannot quietly restyle a
     * stall a seller already published.
     */
    it('Modern ships none, Neo a ticker, Rural a plate', () => {
        expect(decodeTheme(DEFAULT_THEME_ID).ornament).toBeUndefined();
        expect(decodeTheme(NEO_CITY_THEME_ID).ornament).toEqual({
            label: '// stall.cash',
            kind: 'ticker',
        });
        expect(decodeTheme(RURAL_THEME_ID).ornament).toEqual({
            label: 'Market stall',
            kind: 'plate',
        });
    });

    it('an unknown id falls back to the default look and ships no ornament', () => {
        expect(decodeTheme(0xfe).ornament).toBeUndefined();
    });
});

describe('theme-module-ships-no-markup-or-fetchable-string', () => {
    /**
     * CLAUDE.md §6 freezes this while there are no keys: the theme module is a
     * table of values, not a place that builds markup or names a remote thing.
     * `directory-walls` cannot see it — that scan looks for DOM access, network
     * calls and chronik/agora imports, none of which this file would ever have.
     * (It is a text scan over this directory, so naming those tokens here in
     * prose would trip it: the wall cannot tell a comment from code.)
     *
     * It matters more now than when the rule was written. The shape half added
     * ~40 string fields to the shipped table, and a string is where "just add a
     * banner image" arrives: `url(` reaches the network from a stylesheet,
     * `cssText` and the innerHTML family reach the parser. The table may hold a
     * colour, a length, a grid, a font stack — never markup, never a host.
     */
    it('contains no innerHTML, cssText or url(', () => {
        const here = dirname(fileURLToPath(import.meta.url));
        const src = readFileSync(join(here, 'theme.ts'), 'utf8');
        expect(src).not.toMatch(/\binnerHTML\b/);
        expect(src).not.toMatch(/\binsertAdjacentHTML\b/);
        expect(src).not.toMatch(/\bouterHTML\b/);
        expect(src).not.toMatch(/\bcssText\b/);
        // `url(` is the one that leaves the origin. Written without the paren
        // it is prose; with it, it is a request.
        expect(src).not.toMatch(/url\s*\(/);
    });
});
