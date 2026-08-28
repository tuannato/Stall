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
     * A published record names a number, and that number is permanent. Assert
     * the numbers and the colours, not the names: renaming a look is free,
     * re-pointing an id silently changes what somebody already signed.
     */
    it('pins 0x01 Modern, the look painted with no manifest at all', () => {
        expect(DEFAULT_THEME_ID).toBe(0x01);
        const t = decodeTheme(0x01);
        expect(t.bg).toEqual({ r: 255, g: 255, b: 255 });
        expect(t.surface).toEqual({ r: 244, g: 246, b: 248 });
        expect(t.text).toEqual({ r: 20, g: 23, b: 26 });
        expect(t.accent).toEqual({ r: 44, g: 107, b: 228 });
        expect(t.fontIndex).toBe(0);
        expect(t.softness).toBe(12);
        expect(t.layoutIndex).toBe(0);
    });

    it('pins 0x02 Neo city and 0x03 Rural', () => {
        expect(NEO_CITY_THEME_ID).toBe(0x02);
        expect(RURAL_THEME_ID).toBe(0x03);
        const neo = decodeTheme(0x02);
        expect(neo.bg).toEqual({ r: 8, g: 10, b: 18 });
        expect(neo.accent).toEqual({ r: 24, g: 224, b: 216 });
        expect(neo.fontIndex).toBe(1);
        expect(neo.layoutIndex).toBe(2);
        const rural = decodeTheme(0x03);
        expect(rural.bg).toEqual({ r: 251, g: 244, b: 230 });
        expect(rural.accent).toEqual({ r: 180, g: 85, b: 44 });
        expect(rural.fontIndex).toBe(2);
        expect(rural.layoutIndex).toBe(1);
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
