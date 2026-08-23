import { describe, expect, it } from 'vitest';
import {
    BANNED_THEME_PROPS,
    DEFAULT_THEME,
    FONT_STACKS,
    THEME_BYTES,
    decodeTheme,
    themeVars,
} from './theme';

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
