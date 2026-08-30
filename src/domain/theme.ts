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
    /*
     * The chrome layer (extraction round 1.5): the per-look treatment of
     * the header panel, the status chip, the address, the price ink, the
     * announcement, the section rules and the tab bar — the difference,
     * measured against the approved full dresses, between a palette swap
     * and the look itself.
     */
    headBg?: string;
    headBorder?: string;
    headRadius?: string;
    headShadow?: string;
    headBlur?: string;
    headMargin?: string;
    subBg?: string;
    subInk?: string;
    subBorder?: string;
    subRadius?: string;
    subPad?: string;
    addrBg?: string;
    addrBorder?: string;
    addrRadius?: string;
    addrPad?: string;
    addrAlign?: string;
    priceInk?: string;
    priceGlow?: string;
    noticeBg?: string;
    noticeBorder?: string;
    noticeInk?: string;
    chipBg?: string;
    chipInk?: string;
    chipRadius?: string;
    chipPad?: string;
    sectRule?: string;
    sectInk?: string;
    tabsBg?: string;
    tabsBorder?: string;
    tabsRadius?: string;
    taglineInk?: string;
    taglineStyle?: string;
    sectMark?: string;
    sectMarkSize?: string;
    sectMarkGap?: string;
    tabsMargin?: string;
    tabsShadow?: string;
    priceBg?: string;
    priceClip?: string;
    /*
     * Base motion (round 3, owner ruling): animation shorthands naming
     * keyframes the stylesheet ships. The chain still supplies only a row
     * id; these strings are table data pointing at our own @keyframes.
     */
    nameAnim?: string;
    cardAnim?: string;
    cardSheen?: string;
    /* Full-fidelity pass (owner: "giống hoàn toàn"). */
    contentMaxD?: string;
    signSizeD?: string;
    priceSizeD?: string;
    iconD?: string;
    itemName?: string;
    itemNameD?: string;
    priceBorder?: string;
    priceAnim?: string;
    unitInk?: string;
    tabsBlur?: string;
    tabsGap?: string;
    tabPad?: string;
    tabInk?: string;
    tabSize?: string;
    tabCase?: string;
    tabTrack?: string;
    tabDivider?: string;
    tabActiveBg?: string;
    tabActiveInk?: string;
    tabActiveShadow?: string;
    tabActiveRadius?: string;
};

export type DecodedTheme = {
    /** The id the record asked for, kept even when we ship no row for it. */
    id: number;
    /** False when the id has no shipped row, so the screen can say so. */
    known: boolean;
    /**
     * The page's backdrop layers — a CSS background-image value, ours from
     * this table exactly like `cardBorder`'s color-mix strings, never a byte
     * of it chain-supplied. It paints **behind** every surface; the pixel
     * contrast pass samples what actually lands behind each money figure, so
     * a wash or a scanline that dims one goes red in `pnpm test:layout`.
     */
    backdrop?: string;
    /** A glow on the sign's own text. Paint that cannot leave its glyphs. */
    signGlow?: string;
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
    // Inter is self-hosted (see the @font-face pair in stall.css); everything
    // after it is the fallback chain while it loads, and the per-glyph net
    // for characters outside the two vendored subsets.
    'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
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
    /*
     * Refined 2026-08-29 (PLAN-REDESIGN P1, under D1's mapping-frozen rule):
     * the canvas moves off pure white and the cards become the light layer on
     * it, so elevation reads as elevation instead of a grey box on a void.
     */
    /*
     * Re-cut 2026-08-30 from the approved full dress (extraction round 1):
     * the canvas cools a step further and the muted ink deepens with it —
     * measured at 4.6:1 on the new ground.
     */
    bg: { r: 242, g: 242, b: 239 },
    surface: { r: 255, g: 255, b: 255 },
    text: { r: 20, g: 23, b: 26 },
    muted: { r: 95, g: 105, b: 117 },
    accent: { r: 37, g: 99, b: 235 },
    danger: { r: 178, g: 58, b: 46 },
    accentTwo: { r: 37, g: 99, b: 235 },
    fontIndex: 0,
    softness: 14,
    backdrop:
        'radial-gradient(1100px 380px at 50% -120px, color-mix(in srgb, var(--s-accent) 6%, transparent), transparent 70%)',
    shape: {
        padM: '20px 18px',
        padD: '36px 34px',
        padXM: '18px',
        padXD: '34px',
        detailX: '16px',
        gap: '14px',
        cardPad: '16px',
        cardGap: '14px',
        cardBorder: '1px solid color-mix(in srgb, var(--s-muted) 14%, transparent)',
        cardShadow:
            '0 1px 2px color-mix(in srgb, var(--s-text) 6%, transparent), 0 8px 24px color-mix(in srgb, var(--s-text) 6%, transparent)',
        icon: '52px',
        iconRadius: '13px',
        iconClip: 'none',
        hero: '132px',
        heroRadius: '16px',
        priceSize: '30px',
        priceWeight: '650',
        priceTrack: '-.02em',
        priceDir: 'column',
        priceInnerGap: '2px',
        priceCross: 'flex-end',
        priceJust: 'flex-end',
        priceAlign: 'right',
        unit: '11px',
        paid: '25px',

        areasM: '"ic name price"',
        areasD: '"ic name price"',
        colsM: '52px minmax(0, 1fr) auto',
        colsD: 'var(--s-icon-d) minmax(0, 1fr) auto',
        itemsD: 'minmax(0, 1fr)',
        signPadM: '24px 18px 18px',
        signPadD: '40px 34px 26px',
        signSize: '25px',
        signCase: 'none',
        signRule: '1px solid color-mix(in srgb, var(--s-muted) 18%, transparent)',
        nameWeight: '650',
        track: '-.01em',
        btnRadius: '11px',
        qrRadius: '6px',
        sheetRadiusM: '20px 20px 0 0',
        sheetRadiusD: '16px',
        sheetMaxD: '560px',
        // Chrome (round 1.5): the glass showroom.
        headBg: 'color-mix(in srgb, var(--s-surface) 74%, transparent)',
        headBorder: '1px solid color-mix(in srgb, var(--s-muted) 16%, transparent)',
        headRadius: '20px',
        headShadow:
            '0 2px 6px color-mix(in srgb, var(--s-text) 5%, transparent), 0 18px 44px color-mix(in srgb, var(--s-text) 8%, transparent)',
        headBlur: 'blur(14px)',
        headMargin: '14px 14px 0',
        subBg: 'var(--s-accent)',
        subInk: '#ffffff',
        subRadius: '999px',
        subPad: '4px 11px',
        addrBg: 'color-mix(in srgb, var(--s-muted) 8%, var(--s-surface))',
        addrRadius: '10px',
        addrPad: '7px 10px',
        noticeBorder: '1px solid color-mix(in srgb, var(--s-muted) 22%, transparent)',
        chipBg: 'var(--s-accent)',
        chipInk: '#ffffff',
        chipRadius: '999px',
        chipPad: '4px 10px',
        sectRule: '2px solid color-mix(in srgb, var(--s-muted) 14%, transparent)',
        tabsBorder: '1px solid color-mix(in srgb, var(--s-muted) 18%, transparent)',
        tabsRadius: '999px',
        // In flow and centred, never fixed: the one licensed deviation from
        // the full dress — a floating dock overlays whatever price scrolls
        // under it, and that rule is not the owner's to waive lightly.
        tabsMargin: '10px auto 14px',
        tabsShadow: '0 8px 30px color-mix(in srgb, var(--s-text) 18%, transparent)',
        tabsBg: 'color-mix(in srgb, var(--s-surface) 88%, transparent)',
        tabsBlur: 'blur(16px)',
        tabsGap: '4px',
        tabPad: '9px 14px',
        tabInk: 'color-mix(in srgb, var(--s-text) 78%, var(--s-muted))',
        tabActiveBg: 'var(--s-accent)',
        tabActiveInk: '#ffffff',
        signSizeD: '44px',
        priceSizeD: '32px',
        iconD: '56px',
        priceRuleD: '0',
        priceGapD: '0',
        pricePadD: '0',
        itemName: '15.5px',
        itemNameD: '17px',
        unitInk: 'color-mix(in srgb, var(--s-accent) 80%, var(--s-text))',
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
            /*
             * Re-cut 2026-08-30 from the approved full dress (extraction
             * round 1): a deeper night, a brighter cyan, and the muted
             * channel lifted so small print holds 4.5:1 on the new black.
             */
            bg: { r: 5, g: 6, b: 13 },
            surface: { r: 13, g: 19, b: 34 },
            text: { r: 223, g: 246, b: 255 },
            muted: { r: 138, g: 166, b: 201 },
            accent: { r: 44, g: 233, b: 224 },
            danger: { r: 255, g: 77, b: 122 },
            accentTwo: { r: 255, g: 77, b: 122 },
            fontIndex: 1,
            softness: 0,
            // Night with its own light: a cyan wash falling from the strip,
            // and a scanline at four percent — texture, never a veil. The
            // rendered-pixel contrast pass arbitrates both.
            backdrop:
                'repeating-linear-gradient(0deg, color-mix(in srgb, var(--s-accent) 4%, transparent) 0 1px, transparent 1px 4px), linear-gradient(180deg, color-mix(in srgb, var(--s-accent) 9%, var(--s-bg)) 0%, var(--s-bg) 480px)',
            // The neon sign itself, from the full dress: a tight core and a
            // wide halo. Text-shadow has no box, so it stays on the name.
            signGlow:
                '0 0 8px color-mix(in srgb, var(--s-accent) 80%, transparent), 0 0 26px color-mix(in srgb, var(--s-accent) 45%, transparent)',
            ornament: { label: '// stall.cash', kind: 'ticker' },
            shape: {
                padM: '12px',
                padD: '28px 24px',
                padXM: '12px',
                padXD: '24px',
                detailX: '12px',
                gap: '6px',
                cardPad: '11px 12px',
                cardGap: '11px',
                cardBorder: '1px solid color-mix(in srgb, var(--s-accent) 42%, transparent)',
                cardShadow:
                    '0 0 0 1px color-mix(in srgb, var(--s-accent) 10%, transparent), 0 0 22px color-mix(in srgb, var(--s-accent) 10%, transparent)',
                icon: '40px',
                iconRadius: '0px',
                // The cut corner is the look's signature. A clip never moves a
                // sibling, so it cannot reach the price.
                iconClip: 'polygon(0 0, 100% 0, 100% 72%, 72% 100%, 0 100%)',
                hero: '120px',
                heroRadius: '0px',
                priceSize: '26px',
                priceWeight: '800',
                priceTrack: '.02em',
                priceDir: 'row',
                priceInnerGap: '6px',
                priceCross: 'baseline',
                priceJust: 'flex-end',
                priceAlign: 'right',
                unit: '11px',
                paid: '21px',

                                priceEdgeM: '1px solid color-mix(in srgb, var(--s-accent) 26%, transparent)',
                priceEdgePadM: '12px',
                areasM: '"ic name price"',
                areasD: '"ic name price"',
                colsM: '40px minmax(0, 1fr) auto',
                colsD: 'var(--s-icon-d) minmax(0, 1fr) auto',
                itemsD: 'minmax(0, 1fr)',
                signPadM: '16px 12px 13px',
                signPadD: '30px 24px 20px',
                signSize: '25px',
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
                // Chrome (round 1.5): the night market's panel and inks.
                headBg: 'linear-gradient(180deg, var(--s-surface), color-mix(in srgb, var(--s-surface) 72%, var(--s-bg)))',
                headBorder: '1px solid color-mix(in srgb, var(--s-accent) 40%, transparent)',
                headShadow:
                    '0 0 0 1px color-mix(in srgb, var(--s-accent) 10%, transparent), 0 0 34px color-mix(in srgb, var(--s-accent) 15%, transparent)',
                headMargin: '12px 12px 0',
                subInk: 'color-mix(in srgb, var(--s-accent-2) 75%, white)',
                subBorder: '1px solid color-mix(in srgb, var(--s-accent-2) 65%, transparent)',
                subRadius: '0px',
                subPad: '3px 9px',
                addrBg: 'color-mix(in srgb, var(--s-accent) 5%, transparent)',
                addrBorder: '1px dashed color-mix(in srgb, var(--s-accent) 45%, transparent)',
                addrPad: '7px 10px',
                priceInk: 'var(--s-accent)',
                priceGlow: '0 0 14px color-mix(in srgb, var(--s-accent) 45%, transparent)',
                noticeBg:
                    'linear-gradient(90deg, color-mix(in srgb, var(--s-accent-2) 16%, transparent), transparent)',
                noticeBorder: '1px solid color-mix(in srgb, var(--s-accent-2) 55%, transparent)',
                noticeInk: 'color-mix(in srgb, var(--s-accent-2) 25%, var(--s-text))',
                chipBg: 'var(--s-accent-2)',
                chipInk: '#1a070e',
                chipPad: '4px 9px',
                sectInk: 'var(--s-accent)',
                taglineInk: 'color-mix(in srgb, var(--s-accent-2) 70%, white)',
                sectMark: 'linear-gradient(135deg, var(--s-accent), var(--s-accent-2))',
                sectMarkSize: '10px',
                sectMarkGap: '8px',
                // The full dress's live neon: the sign misses a beat twice
                // a cycle, every card breathes, and a sheen crosses it.
                signSizeD: '44px',
                priceSizeD: '32px',
                iconD: '56px',
                priceRuleD: '0',
                priceGapD: '0',
                pricePadD: '0',
                itemName: '14px',
                itemNameD: '16px',
                unitInk: 'var(--s-accent)',
                tabsMargin: '10px auto 14px',
                tabsBg: 'color-mix(in srgb, var(--s-bg) 94%, transparent)',
                tabsBorder: '1px solid color-mix(in srgb, var(--s-accent) 50%, transparent)',
                tabsShadow: '0 0 24px color-mix(in srgb, var(--s-accent) 25%, transparent)',
                tabPad: '9px 13px',
                tabSize: '12px',
                tabCase: 'uppercase',
                tabTrack: '.06em',
                tabActiveBg: 'color-mix(in srgb, var(--s-accent) 14%, transparent)',
                tabActiveInk: 'var(--s-accent)',
                tabActiveShadow: 'inset 0 -2px 0 var(--s-accent)',
                tabActiveRadius: '0px',
                nameAnim: 'neo-flick 6s steps(1) infinite',
                cardAnim:
                    'neo-pulse 4.5s ease-in-out infinite, neo-sheen 6s ease-in-out infinite',
                cardSheen:
                    'linear-gradient(100deg, transparent 42%, color-mix(in srgb, var(--s-accent-2) 12%, transparent) 48%, color-mix(in srgb, var(--s-accent) 10%, transparent) 54%, transparent 60%)',
            },
        },
    ],
    [
        RURAL_THEME_ID,
        {
            /*
             * Re-cut 2026-08-30 from the approved full dress (extraction
             * round 1): warmer paper, terracotta deepened, and the second
             * accent turned harvest gold — the craft-fair tricolor's other
             * ink.
             */
            bg: { r: 251, g: 242, b: 223 },
            surface: { r: 255, g: 253, b: 244 },
            text: { r: 58, g: 42, b: 24 },
            muted: { r: 107, g: 89, b: 66 },
            accent: { r: 158, g: 70, b: 32 },
            danger: { r: 155, g: 53, b: 32 },
            accentTwo: { r: 201, g: 138, b: 44 },
            fontIndex: 2,
            softness: 8,
            // Paper, not pixels: two crossing weaves of the ink at three
            // percent. Strong enough to read as grain up close, weak enough
            // that the contrast pass cannot tell it from the sheet.
            backdrop:
                'repeating-linear-gradient(0deg, color-mix(in srgb, var(--s-muted) 6%, transparent) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, color-mix(in srgb, var(--s-muted) 6%, transparent) 0 1px, transparent 1px 3px)',
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
                cardBorder: '1px dashed color-mix(in srgb, var(--s-muted) 65%, transparent)',
                // The full dress's set-down card: a hard ground shadow and a
                // soft one, like a crate on a table.
                cardShadow:
                    '0 3px 0 color-mix(in srgb, var(--s-muted) 25%, transparent), 0 10px 22px color-mix(in srgb, var(--s-text) 8%, transparent)',
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
                unit: '12px',
                paid: '27px',
                priceGapM: '0',
                priceGapD: '0',
                pricePadM: '8px 10px 8px 26px',
                pricePadD: '8px 10px 8px 26px',
                // The full dress rides the tag inline on the row — the
                // stacked card was never its shape.
                areasM: '"ic name price"',
                areasD: '"ic name price"',
                colsM: '48px minmax(0, 1fr) auto',
                colsD: '48px minmax(0, 1fr) auto',
                itemsD: 'minmax(0, 1fr)',
                cardTextD: 'center',
                cardItemsD: 'center',
                signPadM: '22px 18px 17px',
                signPadD: '34px 40px 26px',
                signSize: '27px',
                signCase: 'none',
                signRule: '4px double color-mix(in srgb, var(--s-muted) 50%, transparent)',
                nameWeight: '600',
                track: '0',
                btnRadius: '999px',
                qrRadius: '8px',
                sheetRadiusM: '22px 22px 0 0',
                sheetRadiusD: '18px',
                sheetMaxD: '560px',
                // Chrome (round 1.5): the craft fair's pills, gold ribbon
                // and double rules. The wood sign stays a decoration.
                subBg: 'var(--s-surface)',
                subInk: 'color-mix(in srgb, var(--s-accent) 55%, var(--s-muted))',
                subBorder: '1px solid color-mix(in srgb, var(--s-muted) 35%, transparent)',
                subRadius: '999px',
                subPad: '4px 12px',
                addrBg: 'var(--s-surface)',
                addrBorder: '1px dashed color-mix(in srgb, var(--s-muted) 65%, transparent)',
                addrRadius: '999px',
                addrPad: '7px 12px',
                addrAlign: 'center',
                /*
                 * Gold as the ribbon's border, never its ground: the ground
                 * stays surface, whose ink pair legibleOn already corrects —
                 * a raw accent-2 ground turned to mud under the Sun-faded
                 * mood and swallowed the seller's sentence.
                 */
                noticeBg: 'var(--s-surface)',
                noticeBorder: '2px solid var(--s-accent-2)',
                noticeInk: 'var(--s-text)',
                chipBg: 'var(--s-accent)',
                chipInk: '#fff3ea',
                chipRadius: '999px',
                chipPad: '5px 9px',
                sectRule: '4px double color-mix(in srgb, var(--s-muted) 50%, transparent)',
                sectInk: 'var(--s-text)',
                taglineStyle: 'italic',
                /*
                 * The craft-fair price tag: a left-notched clip on the price
                 * column and a punched hole drawn into its ground. The ground
                 * is a bg/gold mix, never a raw accent (the Sun-faded lesson),
                 * and the clip is generous — the whole column, rate and fiat
                 * included, rides inside the tag.
                 */
                /*
                 * The tag, to the pixel: warm cardstock ground with the
                 * punched hole ring-drawn into it (a positioned pseudo has
                 * no box, so the hole is background), the terracotta
                 * border the clip trims at the notch exactly as the full
                 * dress trims it, and the sway of a tag on a string.
                 */
                priceBg:
                    'radial-gradient(circle at 9px 50%, var(--s-bg) 2.2px, var(--s-accent) 3px 4.4px, color-mix(in srgb, #fff3d9 90%, var(--s-accent-2)) 5.4px)',
                priceClip: 'polygon(13px 0, 100% 0, 100% 100%, 13px 100%, 0 50%)',
                priceBorder: '1.5px solid var(--s-accent)',
                priceAnim: 'rural-tag-sway 5.5s ease-in-out infinite',
                priceInk: '#2e1f08',
                unitInk: 'var(--s-accent)',
                signSizeD: '44px',
                iconD: '48px',
                itemName: '16.5px',
                itemNameD: '16.5px',
                tabsMargin: '10px auto 14px',
                tabsBg: 'color-mix(in srgb, var(--s-surface) 45%, #f3e7ce)',
                tabsBorder: '1.5px solid color-mix(in srgb, var(--s-muted) 60%, transparent)',
                tabsRadius: '13px',
                tabsShadow: '0 8px 24px color-mix(in srgb, var(--s-text) 25%, transparent)',
                tabPad: '9px 14px',
                tabSize: '13.5px',
                tabDivider: '1.5px dashed color-mix(in srgb, var(--s-muted) 50%, transparent)',
                tabActiveBg: 'var(--s-accent)',
                tabActiveInk: '#fff3ea',
                tabActiveRadius: '8px',
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
        '--s-backdrop': theme.backdrop ?? 'none',
        '--s-sign-glow': theme.signGlow ?? 'none',
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
        '--s-head-bg': s.headBg ?? 'none',
        '--s-head-border': s.headBorder ?? '0',
        '--s-head-radius': s.headRadius ?? '0px',
        '--s-head-shadow': s.headShadow ?? 'none',
        '--s-head-blur': s.headBlur ?? 'none',
        '--s-head-margin': s.headMargin ?? '0',
        '--s-sub-bg': s.subBg ?? 'transparent',
        '--s-sub-ink': s.subInk ?? 'var(--s-muted)',
        '--s-sub-border': s.subBorder ?? '0',
        '--s-sub-radius': s.subRadius ?? '999px',
        '--s-sub-pad': s.subPad ?? '0',
        '--s-addr-bg': s.addrBg ?? 'transparent',
        '--s-addr-border': s.addrBorder ?? '0',
        '--s-addr-radius': s.addrRadius ?? '0px',
        '--s-addr-pad': s.addrPad ?? '0',
        '--s-addr-align': s.addrAlign ?? 'left',
        '--s-price-ink': s.priceInk ?? 'var(--s-text)',
        '--s-price-glow': s.priceGlow ?? 'none',
        '--s-notice-bg': s.noticeBg ?? 'var(--s-surface)',
        '--s-notice-border':
            s.noticeBorder ?? '1px solid color-mix(in srgb, var(--s-muted) 40%, transparent)',
        '--s-notice-ink': s.noticeInk ?? 'var(--s-text)',
        '--s-chip-bg': s.chipBg ?? 'transparent',
        '--s-chip-ink': s.chipInk ?? 'var(--s-muted)',
        '--s-chip-radius': s.chipRadius ?? '0px',
        '--s-chip-pad': s.chipPad ?? '0',
        '--s-sect-rule': s.sectRule ?? '0',
        '--s-sect-ink': s.sectInk ?? 'var(--s-muted)',
        '--s-tabs-bg': s.tabsBg ?? 'var(--s-surface)',
        '--s-tabs-border':
            s.tabsBorder ?? '1px solid color-mix(in srgb, var(--s-muted) 22%, transparent)',
        '--s-tabs-radius': s.tabsRadius ?? '0px',
        '--s-tagline-ink':
            s.taglineInk ?? 'color-mix(in srgb, var(--s-text) 78%, var(--s-muted))',
        '--s-tagline-style': s.taglineStyle ?? 'normal',
        '--s-sect-mark': s.sectMark ?? 'none',
        '--s-sect-mark-size': s.sectMarkSize ?? '0px',
        '--s-sect-mark-gap': s.sectMarkGap ?? '0px',
        '--s-tabs-margin': s.tabsMargin ?? '0',
        '--s-tabs-shadow': s.tabsShadow ?? 'none',
        '--s-price-bg': s.priceBg ?? 'none',
        '--s-price-clip': s.priceClip ?? 'none',
        '--s-name-anim': s.nameAnim ?? 'none',
        '--s-card-anim': s.cardAnim ?? 'none',
        '--s-card-sheen': s.cardSheen ?? 'none',
        '--s-content-max-d': s.contentMaxD ?? '860px',
        '--s-sign-size-d': s.signSizeD ?? '44px',
        '--s-price-size-d': s.priceSizeD ?? s.priceSize,
        '--s-icon-d': s.iconD ?? s.icon,
        '--s-item-name': s.itemName ?? '15px',
        '--s-item-name-d': s.itemNameD ?? s.itemName ?? '15px',
        '--s-price-border': s.priceBorder ?? '0',
        '--s-price-anim': s.priceAnim ?? 'none',
        '--s-unit-ink': s.unitInk ?? 'var(--s-muted)',
        '--s-tabs-blur': s.tabsBlur ?? 'none',
        '--s-tabs-gap': s.tabsGap ?? '2px',
        '--s-tab-pad': s.tabPad ?? '9px 14px',
        '--s-tab-ink': s.tabInk ?? 'var(--s-muted)',
        '--s-tab-size': s.tabSize ?? '13px',
        '--s-tab-case': s.tabCase ?? 'none',
        '--s-tab-track': s.tabTrack ?? '0',
        '--s-tab-divider': s.tabDivider ?? '0',
        '--s-tab-active-bg': s.tabActiveBg ?? 'transparent',
        '--s-tab-active-ink': s.tabActiveInk ?? 'var(--s-accent)',
        '--s-tab-active-shadow': s.tabActiveShadow ?? 'none',
        '--s-tab-active-radius': s.tabActiveRadius ?? '999px',
    };
}
