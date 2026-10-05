/**
 * The one place the layout harness turns a look choice into what the renderer
 * paints: a row object and that look's decoration rows.
 *
 * Why one place (the step-1 critic's P1): after the row learned to carry its
 * own class, label and ladders, `decodeTheme(0xff)` still answers — with
 * MODERN's row, `known: false` — and `attachmentsForTheme(0xff)` answers `[]`.
 * A harness site left choosing by id would paint Modern bare under the kit's
 * name and pass it green, and the kit's own probe could not tell that from a
 * skeleton that passed. So `probe.ts` and `gallery.ts` never call those
 * functions (`the-harness-chooses-looks-in-one-place`), and the probe echoes
 * the `t-*` classes it actually painted for the runner to audit
 * (`the-workshop-probe-measures-the-workshop-look`).
 *
 * Shipped ids come from the shipped table. The workshop look (`0xff`) exists
 * only once a kit page registers it — `layout/workshopRegister.ts`, imported
 * by the workshop probe entry before the probe module, and the showroom — so
 * the ordinary probe never loads the kit's sheet or look. The skeleton
 * (`SKELETON_LOOK_ID`) is the harness's own and always here: the ordinary
 * probe measures it beside the shipped looks.
 */
import {
    attachmentsForTheme,
    wornFrom,
    type ShippedAttachment,
} from '../src/domain/attachments';
import {
    DEFAULT_THEME_ID,
    SHIPPED_THEMES,
    WORKSHOP_THEME_ID,
    decodeTheme,
    type DecodedTheme,
} from '../src/domain/theme';

/** A look the harness can paint. */
export type Look = {
    readonly id: number;
    readonly label: string;
    readonly theme: DecodedTheme;
    /** This look's decoration rows, in catalogue order. */
    readonly rows: readonly ShippedAttachment[];
    /**
     * A worn-only look's built sheet, which the page loads through the app's
     * loader before it paints the look (`wornSheetsOf`): the kit's
     * (`registerWorkshopLook`). Absent for a bundled look, whose sheet is in
     * the entry CSS.
     */
    readonly sheetUrl?: string;
};

let kit: Look | undefined;

/**
 * Make the workshop look paintable on this page, with the URL of its built
 * sheet. Once only: a page that registered two kit looks would measure
 * whichever came last under one id.
 *
 * **The kit loads the worn-only way** (8d1; STEP-6-PLAN v2 item 6.8): its
 * sheet is its own file (`layout/workshopKitSheet.ts`, `?url`), loaded by
 * the app's loader before the page paints (`wornSheetsOf`), the road a
 * private look's sheet takes in the app — never in a kit page's entry CSS.
 * So its row is `sheetLoad: 'worn'` whatever its base's was.
 */
export function registerWorkshopLook(
    look: {
        theme: DecodedTheme;
        rows: readonly ShippedAttachment[];
    },
    sheetUrl: string,
): void {
    if (look.theme.id !== WORKSHOP_THEME_ID || look.rows.some((row) => row.themeId !== WORKSHOP_THEME_ID)) {
        throw new Error(`a workshop look carries id ${WORKSHOP_THEME_ID} on its row and every decoration`);
    }
    if (kit !== undefined) {
        throw new Error('the workshop look is already registered on this page');
    }
    kit = {
        id: look.theme.id,
        label: look.theme.label,
        theme: { ...look.theme, sheetLoad: 'worn' },
        rows: look.rows,
        sheetUrl,
    };
}

/** The workshop look, when this page registered one. */
export function kitLook(): Look | undefined {
    return kit;
}

/**
 * Every shipped look, in the order a seller is offered them — built once, so
 * a look is one object for the life of the page and can be compared by
 * identity (`looksFor(screen).includes(look)`).
 */
const SHIPPED: readonly Look[] = SHIPPED_THEMES.map(({ id }) => {
    const theme = decodeTheme(id);
    return { id, label: theme.label, theme, rows: attachmentsForTheme(id) };
});

export function shippedLooks(): readonly Look[] {
    return SHIPPED;
}

/**
 * The harness's address for the skeleton — never a row, and never an id the
 * renderer sees: the skeleton paints the default row, `theme.id` included,
 * so this number only tells the harness's looks apart (`lookById`, the
 * contrast driver's `__themes`). Not a shipped id and not the kit's
 * (`the-skeleton-is-the-default-row-under-a-class-no-sheet-styles`).
 */
export const SKELETON_LOOK_ID = 0xfe;

/** The class the skeleton wears: a `t-*` class no stylesheet anywhere names. */
export const SKELETON_SHEET_CLASS = 't-skeleton';

/**
 * The skeleton (step 2d, the owner's D3, 2026-09-23): the default row
 * wearing `t-skeleton`, so the app's base sheets paint it and no look's
 * sheet does — what a look is before its own sheet has a rule (the committed
 * kit), and what a stall WOULD paint before its look's sheet arrived if
 * looks' sheets ever load apart from the app (Q17; today `render.ts` imports
 * every sheet with the app). The ordinary probe measures it beside the
 * shipped looks on every screen but the door, and pins the base's floor for
 * a look with no rules — the derived price ladder in stall.css — by
 * `the-skeletons-ladder-steps-the-rows-size`, so neither can rot behind a
 * sentence the way "the untouched kit does not pass the probe" did. Fixed
 * here and independent of `workshop/`: a creator's kit changes nothing about
 * it. It wears no decorations, as the kit's skeleton wears none.
 */
const SKELETON: Look = {
    id: SKELETON_LOOK_ID,
    label: 'Skeleton',
    theme: { ...decodeTheme(DEFAULT_THEME_ID), sheetClass: SKELETON_SHEET_CLASS },
    rows: [],
};

/**
 * The harness's worn-only look (step 6, 6.7 of the step-6 plan v2): the
 * default row under `t-fixture-worn`, `sheetLoad: 'worn'`, whose sheet
 * (`layout/fixture-look.css`, its art in `layout/fixture-look/`) is its own
 * built file — `fixtureLook.ts` holds its URL, and only the probe imports
 * that, handing it to the app's loader (`src/ui/lookSheets.ts`) in its one
 * job. **Never a row and never measured**: `0xfd` is the harness's address
 * for it like the skeleton's `0xfe`, it is in neither `measuredLooks()` nor
 * `galleryLooks()`, and nothing under `src/` reaches it, so the production
 * build carries neither the class nor the sheet (`gallery-is-not-served`).
 * Its one job is `a-worn-only-sheet-loads-under-the-production-policy`
 * (`window.__wornSheetJob` in `probe.ts`); it is also the worn-only subject
 * of the weight guard and the worn-only lints until a shipped look is worn
 * only.
 */
export const FIXTURE_LOOK_ID = 0xfd;

/** The class the fixture's worn-only sheet is scoped under. */
export const FIXTURE_SHEET_CLASS = 't-fixture-worn';

export const FIXTURE_LOOK: Look = {
    id: FIXTURE_LOOK_ID,
    label: 'Fixture (worn-only)',
    theme: {
        ...decodeTheme(DEFAULT_THEME_ID),
        sheetClass: FIXTURE_SHEET_CLASS,
        sheetLoad: 'worn',
        label: 'Fixture (worn-only)',
    },
    rows: [],
};

/** Every look the ordinary probe measures: the shipped looks, then the skeleton. */
const MEASURED: readonly Look[] = [...SHIPPED, SKELETON];

/** What the showroom offers: the shipped looks, and the kit's when registered. */
export function galleryLooks(): readonly Look[] {
    return kit === undefined ? shippedLooks() : [...shippedLooks(), kit];
}

/**
 * What the probe measures: the kit's look **alone** on a workshop page — a
 * creator's run judges their look, not Stall's three again — and every
 * shipped look and the skeleton everywhere else.
 */
export function measuredLooks(): readonly Look[] {
    return kit === undefined ? MEASURED : [kit];
}

/** A look by id, from what this page can paint or measure. Throws on any other id. */
export function lookById(id: number): Look {
    const look = [...galleryLooks(), ...measuredLooks()].find((candidate) => candidate.id === id);
    if (look === undefined) {
        throw new Error(
            id === WORKSHOP_THEME_ID
                ? 'the workshop look is painted only on the workshop pages (pnpm workshop)'
                : `no look with id ${id} on this page`,
        );
    }
    return look;
}

/**
 * The measured looks a screen can actually wear.
 *
 * The apex paints the default look (no record) and never fetches, so the
 * door can only ever wear the default look. A door-under-Neo combination is
 * a screen no visitor can reach: its red is a false alarm (measured — the
 * Neo mini ink over the door's light ground), and its green is budget spent
 * certifying nothing. On a workshop page that leaves the door with no look at
 * all, which is right: its deck is three shipped looks by design (Q8).
 */
export function looksFor(screen: string): readonly Look[] {
    return measuredLooks().filter((look) => canWear(look, screen));
}

/** Whether `look` can wear `screen` at all — `looksFor`'s rule, for a caller holding its own list of looks. */
export function canWear(look: Look, screen: string): boolean {
    return screen !== 'door' || look.id === DEFAULT_THEME_ID;
}

/** The decorations `flags` puts on a look — `wornAttachments`' rule, over the look's own rows. */
export function wornOf(look: Look, flags: number): readonly ShippedAttachment[] {
    return wornFrom(look.rows, flags);
}

/**
 * Every all-worn state `look` can be in, as flags: one per mood (D11, the
 * step-5 plan's "one all-worn variant per mood").
 *
 * `0xffff` wears every row the picker can, one per slot — and a look's moods
 * share a slot, so it wears the mood with the lowest bit alone. A look with a
 * second mood then had an all-worn state no pass painted: that mood's
 * palette, and since D11 its class, beside every other row. Each further mood
 * is one more value here, `0xffff` with every other mood's bit cleared.
 * Every shipped look has at most one mood, so this is `[0xffff]` for each of
 * them and the plans' pinned counts do not move; Ink wash's two moods make it
 * two.
 */
export function wornAllFlags(look: Look): number[] {
    const moods = look.rows.filter((row) => row.slot === 'mood').sort((a, b) => a.bit - b.bit);
    const moodBits = moods.reduce((bits, row) => bits | (1 << row.bit), 0);
    return [0xffff, ...moods.slice(1).map((row) => (0xffff & ~moodBits) | (1 << row.bit))];
}
