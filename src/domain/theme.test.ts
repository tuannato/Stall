import { describe, expect, it } from 'vitest';
import {
    BANNED_THEME_PROPS,
    DEFAULT_THEME,
    FONT_STACKS,
    MIN_CONTRAST,
    THEME_BYTES,
    contrastRatio,
    decodeTheme,
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
    it('reads 28 bytes and falls back unknown font/layout indices', () => {
        const bytes = new Uint8Array(THEME_BYTES);
        bytes.set([255, 255, 255], 0);
        bytes.set([244, 246, 248], 3);
        bytes.set([20, 23, 26], 6);
        bytes.set([107, 117, 128], 9);
        bytes.set([44, 107, 228], 12);
        bytes.set([178, 58, 46], 15);
        bytes.set([44, 107, 228], 18);
        bytes[21] = 99;
        bytes[22] = 12;
        bytes[23] = 99;
        const t = decodeTheme(bytes);
        expect(t.fontIndex).toBe(0);
        expect(t.layoutIndex).toBe(0);
        expect(t.bg).toEqual({ r: 255, g: 255, b: 255 });
    });

    it('rejects the wrong length rather than ignoring trailing bytes', () => {
        expect(() => decodeTheme(new Uint8Array(24))).toThrow(/28 bytes/);
        expect(() => decodeTheme(new Uint8Array(29))).toThrow(/28 bytes/);
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
