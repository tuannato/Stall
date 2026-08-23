/** 28-byte theme. Stall selects among shipped values; it never interprets a string. */

export const THEME_BYTES = 28;

export type Rgb = { r: number; g: number; b: number };

export type DecodedTheme = {
    bg: Rgb;
    surface: Rgb;
    text: Rgb;
    muted: Rgb;
    accent: Rgb;
    danger: Rgb;
    accentTwo: Rgb;
    fontIndex: number;
    softness: number;
    layoutIndex: number;
    ornamentIndex: number;
    stampIndex: number;
    attachments: number;
};

export const FONT_STACKS = [
    'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif',
] as const;

export const LAYOUT_CLASSES = [
    'layout-stack',
    'layout-shelf',
    'layout-vending',
    'layout-stack',
    'layout-stack',
    'layout-stack',
    'layout-stack',
    'layout-stack',
] as const;

export const DEFAULT_THEME: DecodedTheme = {
    bg: { r: 255, g: 255, b: 255 },
    surface: { r: 244, g: 246, b: 248 },
    text: { r: 20, g: 23, b: 26 },
    muted: { r: 107, g: 117, b: 128 },
    accent: { r: 44, g: 107, b: 228 },
    danger: { r: 178, g: 58, b: 46 },
    accentTwo: { r: 44, g: 107, b: 228 },
    fontIndex: 0,
    softness: 12,
    layoutIndex: 0,
    ornamentIndex: 0,
    stampIndex: 0,
    attachments: 0,
};

export const BANNED_THEME_PROPS = [
    'position',
    'z-index',
    'transform',
    'opacity',
    'filter',
    'pointer-events',
] as const;

export class ThemeDecodeError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ThemeDecodeError';
    }
}

export function clampIndex(index: number, length: number): number {
    if (!Number.isInteger(index) || index < 0 || index >= length) {
        return 0;
    }
    return index;
}

export function rgbCss(c: Rgb): string {
    return `rgb(${c.r}, ${c.g}, ${c.b})`;
}

export function decodeTheme(bytes: Uint8Array): DecodedTheme {
    if (bytes.length !== THEME_BYTES) {
        throw new ThemeDecodeError(`theme must be ${THEME_BYTES} bytes, got ${bytes.length}`);
    }
    const rgb = (o: number): Rgb => ({
        r: bytes[o]!,
        g: bytes[o + 1]!,
        b: bytes[o + 2]!,
    });
    const fontIndex = clampIndex(bytes[21]!, FONT_STACKS.length);
    const layoutIndex = clampIndex(bytes[23]!, LAYOUT_CLASSES.length);
    return {
        bg: rgb(0),
        surface: rgb(3),
        text: rgb(6),
        muted: rgb(9),
        accent: rgb(12),
        danger: rgb(15),
        accentTwo: rgb(18),
        fontIndex,
        softness: bytes[22]!,
        layoutIndex,
        ornamentIndex: bytes[24]!,
        stampIndex: bytes[25]!,
        attachments: (bytes[26]! << 8) | bytes[27]!,
    };
}

/** CSS custom properties only. Never banned properties, never a colour language. */
export function themeVars(theme: DecodedTheme): Record<string, string> {
    return {
        '--s-bg': rgbCss(theme.bg),
        '--s-surface': rgbCss(theme.surface),
        '--s-text': rgbCss(theme.text),
        '--s-muted': rgbCss(theme.muted),
        '--s-accent': rgbCss(theme.accent),
        '--s-danger': rgbCss(theme.danger),
        '--s-accent-2': rgbCss(theme.accentTwo),
        '--s-font': FONT_STACKS[theme.fontIndex]!,
        '--s-radius': `${theme.softness}px`,
    };
}
