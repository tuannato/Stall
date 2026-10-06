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
 *
 * **The private looks a build carries are here too** (8e2): whatever the
 * build's selection put in `virtual:stall-private-looks`, read through the
 * app's own look table (`src/domain/lookTable.ts`) — the rows the app would
 * paint, by reference — and nothing when the build selects none, which is
 * every build but one a harness command was told to make
 * (`scripts/looks-selection.mjs`). The ordinary probe and the showroom
 * measure and offer them beside the shipped looks, each with its built
 * sheet, and paint them the one way the app paints a paid look without a
 * record (`paintView`).
 */
import {
    attachmentsForTheme,
    wornFrom,
    type ShippedAttachment,
} from '../src/domain/attachments';
import {
    LOOK_ROWS,
    attachmentsForLook,
    decodeLook,
    lookSheetOf,
    paintableLook,
    wornForLook,
} from '../src/domain/lookTable';
import type { StallView } from '../src/domain/state';
import {
    DEFAULT_THEME_ID,
    PAID_LOOK_IDS,
    SHIPPED_THEMES,
    WORKSHOP_THEME_ID,
    decodeTheme,
    type DecodedTheme,
} from '../src/domain/theme';
import { lookSheetState } from '../src/ui/lookSheets';

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
     * (`registerWorkshopLook`), and a carried private look's (`lookSheetOf`).
     * Absent for a bundled look, whose sheet is in the entry CSS.
     */
    readonly sheetUrl?: string;
    /**
     * Set on a private look this build carries (8e2): painted through the
     * try-on under the harness's licence, never through a record
     * (`paintView`).
     */
    readonly carried?: 'private';
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
 * Its row says so already: `lookFromData` builds every look read from data
 * `sheetLoad: 'worn'`.
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
        theme: look.theme,
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

const SHIPPED_IDS: ReadonlySet<number> = new Set(SHIPPED_THEMES.map(({ id }) => id));

/**
 * Every private look this build carries (8e2), in the order the app offers
 * them: each `LOOK_ROWS` id that is no shipped look's, its row and rows read
 * through the app's own merged views (`decodeLook`, `attachmentsForLook` —
 * the objects the renderer paints, by reference) and its sheet the URL the
 * build wrote for it (`lookSheetOf`). Empty in a build that selects none —
 * the ordinary probe, the showroom and every vitest run unless a test mocks
 * the module with the tracked fixture (`layout/fixturePrivateLooks.ts`).
 * A carried look with no sheet of its own is a build this harness cannot
 * measure with its sheet, and the page says so rather than painting it bare.
 */
const PRIVATE: readonly Look[] = LOOK_ROWS.filter(({ id }) => !SHIPPED_IDS.has(id)).map(({ id }) => {
    const theme = decodeLook(id);
    const sheet = lookSheetOf(theme);
    if (sheet === undefined) {
        throw new Error(
            `private look ${id} (${theme.sheetClass}) is carried with no sheet of its own — ` +
                'the harness cannot measure it with its sheet',
        );
    }
    return { id, label: theme.label, theme, rows: attachmentsForLook(id), sheetUrl: sheet.url, carried: 'private' };
});

/** The private looks this build carries (`PRIVATE`). */
export function privateLooks(): readonly Look[] {
    return PRIVATE;
}

/**
 * **The harness's licence** (8e2): every paid look this page carries,
 * stated here and held by the harness alone. The app's gate
 * (`paintableLook`) paints a paid look only for a stall licensed for it,
 * and step 8 licenses none — so no record the harness could write paints
 * one, and a probe that measured a paid look's record would measure the
 * default under its name. Measuring a paid look is a written choice, then,
 * never a record the gate let through: this set, handed to the app's own
 * gate to ask what the look paints once licensed (`harnessGateFaults`),
 * and the look put on screen the one road the app paints a paid look with
 * no licence — the try-on (`paintView`). The gate itself is untouched:
 * `harnessGateFaults` asks it, every page, that a paid look without this
 * set is still the default (`not-unlocked`), and the probe paints the record
 * road once and holds it to that in Chrome
 * (`the-record-road-paints-a-locked-look-as-the-default`).
 */
export const HARNESS_LICENCE: ReadonlySet<number> = new Set(
    PRIVATE.filter((look) => PAID_LOOK_IDS.includes(look.id)).map((look) => look.id),
);

/**
 * The class of the look the app's gate paints in a locked look's place —
 * the default row's (`paintableLook`'s `DEFAULT_THEME`) — named here, where
 * looks are named, for the probe's record-road check
 * (`the-record-road-paints-a-locked-look-as-the-default`), which holds the
 * gate to it rather than asking the gate what it is.
 */
export const DEFAULT_LOOK_CLASS: string = decodeTheme(DEFAULT_THEME_ID).sheetClass;

/** No holdings: the gate asked what a look paints, never what it wears. */
const NO_HOLDINGS: ReadonlySet<string> = new Set();

/**
 * Why the app's gate does not answer as the harness's licence says it
 * should, for each carried private look — empty when it holds: licensed, a
 * look paints its own row; without the licence, a paid look is the default
 * (`not-unlocked`) and a free one its own row. Sentences, for the probe's
 * failures and for a test.
 */
export function harnessGateFaults(looks: readonly Look[] = PRIVATE): string[] {
    const out: string[] = [];
    for (const look of looks) {
        const licensed = paintableLook(look.theme, 0, NO_HOLDINGS, HARNESS_LICENCE);
        if (licensed.theme !== look.theme || licensed.why !== undefined) {
            out.push(
                `${look.label} (${look.theme.sheetClass}) under the harness's licence paints ` +
                    `${licensed.theme.sheetClass}${licensed.why === undefined ? '' : ` (${licensed.why})`}, not its own row`,
            );
        }
        const record = paintableLook(look.theme, 0, NO_HOLDINGS);
        const paid = PAID_LOOK_IDS.includes(look.id);
        if (paid && record.why !== 'not-unlocked') {
            out.push(
                `${look.label} is paid, and the gate with no licence answers ${record.theme.sheetClass}` +
                    `${record.why === undefined ? '' : ` (${record.why})`} — a record would paint it unlocked`,
            );
        }
        if (!paid && record.theme !== look.theme) {
            out.push(`${look.label} is free, and the gate with no licence answers ${record.theme.sheetClass}`);
        }
    }
    return out;
}

/** The flags that wear `rows` — one bit per row, as a picker sets them. */
export function flagsOf(rows: readonly ShippedAttachment[]): number {
    return rows.reduce((bits, row) => bits | (1 << row.bit), 0);
}

/**
 * The view that puts `look` on screen wearing `worn`, over a fixture's
 * `base` — the one place a harness page composes a look onto a view
 * (`the-harness-chooses-looks-in-one-place`).
 *
 * - **A shipped or harness look rides the record**: `recordTheme` is the
 *   look, `worn` its rows, as the app writes them for a stall whose record
 *   names it.
 * - **A carried private look rides the try-on** (8e2): `previewLook` names
 *   it with the flags that wear `worn` — the road the app paints a paid look
 *   on with no licence, and the one road the harness's licence
 *   (`HARNESS_LICENCE`) lets it take — `worn` is the try-on's own rows for
 *   those flags (`wornForLook`, no entitlement: looking is free, so an
 *   unminted row paints), and `lookSheets` is where the look's sheet stands
 *   on this page **as the app's loader holds it** (`lookSheetState`), read
 *   at paint time, the app's own rule. Only a sheet the loader holds
 *   `ready` paints the look: one still pending, or failed, is held back by
 *   the renderer (8d2's hold) and the page paints the stall's own look —
 *   which the probe's class audit and `a-look-is-measured-with-its-sheet`
 *   then refuse, so a look whose sheet did not load is never measured bare.
 *   The record is the fixture's own (no record of the private look is ever
 *   written: the gate would paint it as the default, rightly).
 *
 * A set of rows no flags can produce through the try-on — two in one slot —
 * throws: the try-on would paint fewer rows than the harness asked for, and
 * a measure of that paint would be of another dress.
 */
export function paintView(base: StallView, look: Look, worn: readonly ShippedAttachment[]): StallView {
    if (look.carried !== 'private') {
        return { ...base, recordTheme: look.theme, worn };
    }
    const flags = flagsOf(worn);
    const tried = wornForLook(look.id, flags);
    if (tried.length !== worn.length || worn.some((row) => !tried.includes(row))) {
        throw new Error(
            `${look.label}: the try-on paints [${tried.map((row) => row.label).join(', ')}] for flags ${flags}, ` +
                `not [${worn.map((row) => row.label).join(', ')}] — at most one row per slot`,
        );
    }
    const sheet = look.sheetUrl === undefined ? undefined : lookSheetState(look.sheetUrl);
    return {
        ...base,
        previewLook: { themeId: look.id, attachmentFlags: flags },
        worn: tried,
        lookSheets: new Map([[look.id, sheet ?? 'pending']]),
    };
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

/**
 * Every look the ordinary probe measures: the shipped looks, the private
 * looks the build carries (none unless a selection put them there), then
 * the skeleton.
 */
const MEASURED: readonly Look[] = [...SHIPPED, ...PRIVATE, SKELETON];

/** What the showroom offers: the shipped looks, the private looks the build carries, and the kit's when registered. */
export function galleryLooks(): readonly Look[] {
    return kit === undefined ? [...SHIPPED, ...PRIVATE] : [...SHIPPED, ...PRIVATE, kit];
}

/**
 * What the probe measures: the kit's look **alone** on a workshop page — a
 * creator's run judges their look, not Stall's three again — and every
 * shipped look, every carried private look and the skeleton everywhere else.
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
