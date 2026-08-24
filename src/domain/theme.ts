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

/**
 * A theme may not cover the asked amount. Six of its bytes are a colour, and
 * painting text the colour of its own background hides the price exactly as
 * well as a layout laid over it — the banned-property list does not reach that.
 * 3:1 is the WCAG floor for user-interface components; below it a colour is not
 * a style choice, it is a disappearance.
 */
export const MIN_CONTRAST = 3;

/** Shipped inks. A failing colour falls back to one of these, never to a string. */
const INK_DARK: Rgb = { r: 20, g: 23, b: 26 };
const INK_LIGHT: Rgb = { r: 255, g: 255, b: 255 };

function channelLuminance(value: number): number {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(c: Rgb): number {
    return (
        0.2126 * channelLuminance(c.r) +
        0.7152 * channelLuminance(c.g) +
        0.0722 * channelLuminance(c.b)
    );
}

export function contrastRatio(a: Rgb, b: Rgb): number {
    const la = relativeLuminance(a);
    const lb = relativeLuminance(b);
    const lighter = Math.max(la, lb);
    const darker = Math.min(la, lb);
    return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Keep the seller's colour when it reads against every surface it lands on.
 * Otherwise swap in whichever shipped ink reads best there. Never throws — a
 * bad byte must not brick a stall.
 */
export function legibleOn(fg: Rgb, ...backgrounds: Rgb[]): Rgb {
    const worst = Math.min(...backgrounds.map((bg) => contrastRatio(fg, bg)));
    if (worst >= MIN_CONTRAST) {
        return fg;
    }
    const dark = Math.min(...backgrounds.map((bg) => contrastRatio(INK_DARK, bg)));
    const light = Math.min(...backgrounds.map((bg) => contrastRatio(INK_LIGHT, bg)));
    return dark >= light ? INK_DARK : INK_LIGHT;
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
    const { bg, surface } = theme;
    // Roles are corrected against the surfaces the stylesheet actually pairs
    // them with. accent carries bg as its label colour on the buy control, so
    // the same ratio governs both directions.
    return {
        '--s-bg': rgbCss(bg),
        '--s-surface': rgbCss(surface),
        '--s-text': rgbCss(legibleOn(theme.text, bg, surface)),
        '--s-muted': rgbCss(legibleOn(theme.muted, bg, surface)),
        '--s-accent': rgbCss(legibleOn(theme.accent, bg)),
        '--s-danger': rgbCss(legibleOn(theme.danger, surface)),
        '--s-accent-2': rgbCss(legibleOn(theme.accentTwo, bg)),
        '--s-font': FONT_STACKS[clampIndex(theme.fontIndex, FONT_STACKS.length)]!,
        '--s-radius': `${theme.softness}px`,
    };
}
