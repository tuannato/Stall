/**
 * A theme is a number. The manifest names an id and Stall ships the look, so
 * colours, fonts and layout never travel on chain: a record carrying them would
 * let anyone publish any look, and would put attacker-chosen bytes on the paint
 * path. Stall selects among shipped values; it never interprets a string.
 */

/** The theme push is exactly this long. A longer one is the old wire, not an id. */
export const THEME_ID_BYTES = 1;

export type Rgb = { r: number; g: number; b: number };

/**
 * A theme may ship a decorative header strip. The **kind** selects a shipped
 * style (a stylesheet rule in `stall.css`); the **label** is the text it shows.
 * Both are data that travels in the theme row, so adding a theme is adding one
 * row here — the renderer and the stylesheet only change when a genuinely new
 * *kind* is introduced, never per theme. It is never chain-supplied: like the
 * palette, the chain names an id and Stall ships what it looks like.
 */
export type OrnamentKind = 'ticker' | 'plate';
export type Ornament = { label: string; kind: OrnamentKind };

/**
 * The shape half of a shipped look: one DOM painted as three shops. Like the
 * palette, every value here is **ours** — the chain names a row and never
 * carries a byte of it, so nothing an attacker chooses reaches the paint path.
 *
 * A field exists here only when it differs **between themes**. What differs
 * only between viewports and is identical across all three looks (the sign
 * turning from a column into a row, the sheet docking to the bottom edge) is
 * plain CSS in `stall.css`'s media block — a variable that always holds the
 * same value is a value the stylesheet already knows.
 *
 * `M`/`D` suffixes are mobile and desktop. The specimen switched these in JS on
 * a resize; this origin repaints only when the offer book moves, so both are
 * emitted and CSS picks one. Sparse fields are optional and `themeVars`
 * substitutes the neutral default, because the emitted key set must be the same
 * for every look — `every-theme-var-reaches-the-stylesheet` samples one theme.
 */
export type Shape = {
    /** Body padding, and the inline padding its children align to. */
    padM: string;
    padD: string;
    padXM: string;
    padXD: string;
    detailX: string;
    gap: string;
    /** The offer card. */
    cardPad: string;
    cardGap: string;
    cardBorder: string;
    cardShadow: string;
    /** Token icon, and its larger self at the top of an opened card. */
    icon: string;
    iconRadius: string;
    iconClip: string;
    hero: string;
    heroRadius: string;
    /** The asked amount: its typesetting, and where it sits in its own cell. */
    priceSize: string;
    priceWeight: string;
    priceTrack: string;
    priceDir: string;
    priceInnerGap: string;
    priceCross: string;
    priceJust: string;
    priceAlign: string;
    priceCrossD?: string;
    priceJustD?: string;
    priceAlignD?: string;
    unit: string;
    paid: string;
    /** A rule or an edge separating the price from the rest of the card. */
    priceRuleM?: string;
    priceRuleD?: string;
    priceGapM?: string;
    priceGapD?: string;
    pricePadM?: string;
    pricePadD?: string;
    priceEdgeM?: string;
    priceEdgePadM?: string;
    /** The card's own grid, and how many cards sit side by side on desktop. */
    areasM: string;
    areasD: string;
    colsM: string;
    colsD: string;
    itemsD: string;
    cardTextD?: string;
    cardItemsD?: string;
    /** The shop's sign. */
    signPadM: string;
    signPadD: string;
    signSize: string;
    signCase: string;
    signRule: string;
    nameWeight: string;
    track: string;
    /** Controls and the codes beside them. */
    btnRadius: string;
    qrRadius: string;
    /** The publish sheet: a bottom sheet on a phone, a dialog on a desktop. */
    sheetRadiusM: string;
    sheetRadiusD: string;
    sheetMaxD: string;
    sheetBorder?: string;
};

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
    /** A shipped header strip, or absent — Modern ships none. */
    ornament?: Ornament;
    /** The shape half of the look. Ours, never the chain's. */
    shape: Shape;
};

export const FONT_STACKS = [
    'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif',
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
    shape: {
        padM: '20px 18px',
        padD: '30px 34px',
        padXM: '18px',
        padXD: '34px',
        detailX: '16px',
        gap: '13px',
        cardPad: '16px',
        cardGap: '14px',
        cardBorder: '1px solid color-mix(in srgb, var(--s-muted) 22%, transparent)',
        cardShadow: '0 1px 2px color-mix(in srgb, var(--s-text) 8%, transparent)',
        icon: '46px',
        iconRadius: '12px',
        iconClip: 'none',
        hero: '132px',
        heroRadius: '16px',
        priceSize: '28px',
        priceWeight: '640',
        priceTrack: '-.02em',
        priceDir: 'column',
        priceInnerGap: '2px',
        priceCross: 'flex-end',
        priceJust: 'flex-end',
        priceAlign: 'right',
        unit: '11px',
        paid: '25px',
        priceRuleD: '1px solid color-mix(in srgb, var(--s-muted) 20%, transparent)',
        priceGapD: '14px',
        pricePadD: '13px 0 0',
        areasM: '"ic name price"',
        areasD: '"ic name" "price price"',
        colsM: '46px minmax(0, 1fr) auto',
        colsD: '46px minmax(0, 1fr)',
        itemsD: 'repeat(2, minmax(0, 1fr))',
        signPadM: '20px 18px 16px',
        signPadD: '26px 34px 22px',
        signSize: '22px',
        signCase: 'none',
        signRule: '1px solid color-mix(in srgb, var(--s-muted) 22%, transparent)',
        nameWeight: '600',
        track: '-.005em',
        btnRadius: '10px',
        qrRadius: '6px',
        sheetRadiusM: '20px 20px 0 0',
        sheetRadiusD: '16px',
        sheetMaxD: '560px',
    },
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
            ornament: { label: '// stall.cash', kind: 'ticker' },
            shape: {
                padM: '12px',
                padD: '20px 24px',
                padXM: '12px',
                padXD: '24px',
                detailX: '12px',
                gap: '6px',
                cardPad: '11px 12px',
                cardGap: '11px',
                cardBorder: '1px solid color-mix(in srgb, var(--s-accent) 22%, transparent)',
                cardShadow: 'none',
                icon: '40px',
                iconRadius: '0px',
                // The cut corner is the look's signature. A clip never moves a
                // sibling, so it cannot reach the price.
                iconClip: 'polygon(0 0, 100% 0, 100% 72%, 72% 100%, 0 100%)',
                hero: '120px',
                heroRadius: '0px',
                priceSize: '23px',
                priceWeight: '700',
                priceTrack: '.02em',
                priceDir: 'row',
                priceInnerGap: '6px',
                priceCross: 'baseline',
                priceJust: 'flex-end',
                priceAlign: 'right',
                unit: '11px',
                paid: '21px',
                priceRuleD: '1px solid color-mix(in srgb, var(--s-accent) 26%, transparent)',
                priceGapD: '10px',
                pricePadD: '9px 0 0',
                priceEdgeM: '1px solid color-mix(in srgb, var(--s-accent) 26%, transparent)',
                priceEdgePadM: '12px',
                areasM: '"ic name price"',
                areasD: '"ic name" "price price"',
                colsM: '40px minmax(0, 1fr) auto',
                colsD: '40px minmax(0, 1fr)',
                itemsD: 'repeat(3, minmax(0, 1fr))',
                signPadM: '13px 12px 12px',
                signPadD: '20px 24px 18px',
                signSize: '19px',
                signCase: 'uppercase',
                signRule: '1px solid color-mix(in srgb, var(--s-accent) 22%, transparent)',
                nameWeight: '700',
                track: '.06em',
                btnRadius: '0px',
                qrRadius: '0px',
                sheetRadiusM: '0px',
                sheetRadiusD: '0px',
                sheetMaxD: '540px',
                sheetBorder: '1px solid color-mix(in srgb, var(--s-accent) 40%, transparent)',
            },
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
            ornament: { label: 'Market stall', kind: 'plate' },
            shape: {
                padM: '20px 18px',
                padD: '32px 40px',
                padXM: '18px',
                padXD: '40px',
                detailX: '18px',
                gap: '16px',
                cardPad: '18px',
                cardGap: '14px',
                cardBorder: '1px dashed color-mix(in srgb, var(--s-muted) 60%, transparent)',
                cardShadow: 'none',
                icon: '52px',
                iconRadius: '999px',
                iconClip: 'none',
                hero: '140px',
                heroRadius: '999px',
                priceSize: '31px',
                priceWeight: '600',
                priceTrack: '0',
                priceDir: 'row',
                priceInnerGap: '7px',
                priceCross: 'baseline',
                priceJust: 'flex-end',
                priceAlign: 'right',
                // The only look that centres its card on a wide screen, so the
                // price keeps its own row rather than a right-hand column.
                priceCrossD: 'center',
                priceJustD: 'center',
                priceAlignD: 'center',
                unit: '12px',
                paid: '27px',
                priceRuleM: '1px dashed color-mix(in srgb, var(--s-muted) 55%, transparent)',
                priceRuleD: '1px dashed color-mix(in srgb, var(--s-muted) 55%, transparent)',
                priceGapM: '14px',
                priceGapD: '14px',
                pricePadM: '13px 0 0',
                pricePadD: '13px 0 0',
                areasM: '"ic name" "price price"',
                areasD: '"ic" "name" "price"',
                colsM: '52px minmax(0, 1fr)',
                colsD: 'minmax(0, 1fr)',
                itemsD: 'repeat(2, minmax(0, 1fr))',
                cardTextD: 'center',
                cardItemsD: 'center',
                signPadM: '20px 18px 16px',
                signPadD: '28px 40px 24px',
                signSize: '25px',
                signCase: 'none',
                signRule: '1px dashed color-mix(in srgb, var(--s-muted) 55%, transparent)',
                nameWeight: '600',
                track: '0',
                btnRadius: '999px',
                qrRadius: '8px',
                sheetRadiusM: '22px 22px 0 0',
                sheetRadiusD: '18px',
                sheetMaxD: '560px',
            },
        },
    ],
]);

function look(theme: DecodedTheme): Omit<DecodedTheme, 'id' | 'known'> {
    const { id: _id, known: _known, ...rest } = theme;
    return rest;
}

/**
 * The looks a seller can choose, in the order they are offered. Labels are ours
 * and renaming one is free; the **id** is what a published record carries, so
 * `theme-table-ids-are-pinned` asserts the numbers and this list must agree
 * with `SHIPPED_LOOKS` rather than drift beside it.
 */
export const SHIPPED_THEMES: readonly { readonly id: number; readonly label: string }[] = [
    { id: DEFAULT_THEME_ID, label: 'Modern' },
    { id: NEO_CITY_THEME_ID, label: 'Neo city' },
    { id: RURAL_THEME_ID, label: 'Rural' },
];

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
        ...shapeVars(theme.shape ?? DEFAULT_THEME.shape),
    };
}

/**
 * The shape half, as custom properties. **Custom properties only** — the
 * specimen's own `vars()` also returned raw `position`, `display` and
 * `flexDirection`, and `position` is banned: copying it wholesale would set a
 * banned property inline on the stall. Layout keywords belong in the stylesheet.
 *
 * Every key here is emitted for every look, sparse fields included, because the
 * guard that proves the stylesheet reads them samples a single theme. A neutral
 * default is what "this look does not ask for one" paints as.
 */
function shapeVars(s: Shape): Record<string, string> {
    return {
        '--s-pad-m': s.padM,
        '--s-pad-d': s.padD,
        '--s-pad-x-m': s.padXM,
        '--s-pad-x-d': s.padXD,
        '--s-detail-x': s.detailX,
        '--s-gap': s.gap,
        '--s-card-pad': s.cardPad,
        '--s-card-gap': s.cardGap,
        '--s-card-border': s.cardBorder,
        '--s-card-shadow': s.cardShadow,
        '--s-icon': s.icon,
        '--s-icon-radius': s.iconRadius,
        '--s-icon-clip': s.iconClip,
        '--s-hero': s.hero,
        '--s-hero-radius': s.heroRadius,
        '--s-price-size': s.priceSize,
        '--s-price-weight': s.priceWeight,
        '--s-price-track': s.priceTrack,
        '--s-price-dir': s.priceDir,
        '--s-price-inner-gap': s.priceInnerGap,
        '--s-price-cross-m': s.priceCross,
        '--s-price-cross-d': s.priceCrossD ?? s.priceCross,
        '--s-price-just-m': s.priceJust,
        '--s-price-just-d': s.priceJustD ?? s.priceJust,
        '--s-price-align-m': s.priceAlign,
        '--s-price-align-d': s.priceAlignD ?? s.priceAlign,
        '--s-unit-size': s.unit,
        '--s-paid-size': s.paid,
        '--s-price-rule-m': s.priceRuleM ?? '0',
        '--s-price-rule-d': s.priceRuleD ?? '0',
        '--s-price-gap-m': s.priceGapM ?? '0',
        '--s-price-gap-d': s.priceGapD ?? '0',
        '--s-price-pad-m': s.pricePadM ?? '0',
        '--s-price-pad-d': s.pricePadD ?? '0',
        '--s-price-edge-m': s.priceEdgeM ?? '0',
        '--s-price-edge-pad-m': s.priceEdgePadM ?? '0',
        '--s-areas-m': s.areasM,
        '--s-areas-d': s.areasD,
        '--s-cols-m': s.colsM,
        '--s-cols-d': s.colsD,
        '--s-items-d': s.itemsD,
        '--s-card-text-d': s.cardTextD ?? 'left',
        '--s-card-items-d': s.cardItemsD ?? 'stretch',
        '--s-sign-pad-m': s.signPadM,
        '--s-sign-pad-d': s.signPadD,
        '--s-sign-size': s.signSize,
        '--s-sign-case': s.signCase,
        '--s-sign-rule': s.signRule,
        '--s-name-weight': s.nameWeight,
        '--s-track': s.track,
        '--s-btn-radius': s.btnRadius,
        '--s-qr-radius': s.qrRadius,
        '--s-sheet-radius-m': s.sheetRadiusM,
        '--s-sheet-radius-d': s.sheetRadiusD,
        '--s-sheet-max-d': s.sheetMaxD,
        '--s-sheet-border': s.sheetBorder ?? '0',
    };
}
