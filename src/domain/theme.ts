/**
 * A theme is a number. The manifest names an id and Stall ships the look, so
 * colours, fonts and layout never travel on chain: a record carrying them would
 * let anyone publish any look, and would put attacker-chosen bytes on the paint
 * path. Stall selects among shipped values; it never interprets a string.
 */

/** The theme push is exactly this long. A longer one is the old wire, not an id. */
export const THEME_ID_BYTES = 1;

export type Rgb = { r: number; g: number; b: number };

export type DecodedTheme = {
    /** The id the record asked for, kept even when we ship no row for it. */
    id: number;
    /** False when the id has no shipped row, so the screen can say so. */
    known: boolean;
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

/**
 * Ids are permanent. `0x01` is Modern, the look Stall paints with no manifest at
 * all, so a seller who publishes it is asking for what they already had.
 */
export const DEFAULT_THEME_ID = 0x01;
export const NEO_CITY_THEME_ID = 0x02;
export const RURAL_THEME_ID = 0x03;

export const DEFAULT_THEME: DecodedTheme = {
    id: DEFAULT_THEME_ID,
    known: true,
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
};

/**
 * The shipped table. The chain supplies which row; every value here is ours.
 *
 * Add rows, never re-map one: a published record is permanent, so changing what
 * an id means changes what someone already signed. An id with no row is not an
 * error — it falls back and says so.
 */
const SHIPPED_LOOKS: ReadonlyMap<number, Omit<DecodedTheme, 'id' | 'known'>> = new Map([
    [DEFAULT_THEME_ID, look(DEFAULT_THEME)],
    [
        NEO_CITY_THEME_ID,
        {
            bg: { r: 8, g: 10, b: 18 },
            surface: { r: 17, g: 21, b: 36 },
            text: { r: 223, g: 246, b: 255 },
            muted: { r: 110, g: 134, b: 168 },
            accent: { r: 24, g: 224, b: 216 },
            danger: { r: 255, g: 77, b: 122 },
            accentTwo: { r: 255, g: 77, b: 122 },
            fontIndex: 1,
            softness: 0,
            layoutIndex: 2,
        },
    ],
    [
        RURAL_THEME_ID,
        {
            bg: { r: 251, g: 244, b: 230 },
            surface: { r: 243, g: 231, b: 206 },
            text: { r: 58, g: 44, b: 28 },
            muted: { r: 138, g: 116, b: 88 },
            accent: { r: 180, g: 85, b: 44 },
            danger: { r: 155, g: 53, b: 32 },
            accentTwo: { r: 138, g: 116, b: 88 },
            fontIndex: 2,
            softness: 8,
            layoutIndex: 1,
        },
    ],
]);

function look(theme: DecodedTheme): Omit<DecodedTheme, 'id' | 'known'> {
    const { id: _id, known: _known, ...rest } = theme;
    return rest;
}

export function isShippedThemeId(id: number): boolean {
    return SHIPPED_LOOKS.has(id);
}

export const BANNED_THEME_PROPS = [
    'position',
    'z-index',
    'transform',
    'opacity',
    'filter',
    'pointer-events',
] as const;

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

/**
 * Look up a shipped row. Never throws: an id we do not ship falls back to the
 * default and carries `known: false`, so the screen can say the look is ours
 * rather than the seller's. A bad byte must not brick a stall.
 */
export function decodeTheme(id: number): DecodedTheme {
    const row = SHIPPED_LOOKS.get(id);
    if (row === undefined) {
        return { ...DEFAULT_THEME, id, known: false };
    }
    return { ...row, id, known: true };
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
