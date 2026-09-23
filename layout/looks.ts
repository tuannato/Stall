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
 * the ordinary probe never loads the kit's sheet or look.
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
};

let kit: Look | undefined;

/**
 * Make the workshop look paintable on this page. Once only: a page that
 * registered two kit looks would measure whichever came last under one id.
 */
export function registerWorkshopLook(look: {
    theme: DecodedTheme;
    rows: readonly ShippedAttachment[];
}): void {
    if (look.theme.id !== WORKSHOP_THEME_ID || look.rows.some((row) => row.themeId !== WORKSHOP_THEME_ID)) {
        throw new Error(`a workshop look carries id ${WORKSHOP_THEME_ID} on its row and every decoration`);
    }
    if (kit !== undefined) {
        throw new Error('the workshop look is already registered on this page');
    }
    kit = { id: look.theme.id, label: look.theme.label, theme: look.theme, rows: look.rows };
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

/** What the showroom offers: the shipped looks, and the kit's when registered. */
export function galleryLooks(): readonly Look[] {
    return kit === undefined ? shippedLooks() : [...shippedLooks(), kit];
}

/**
 * What the probe measures: the kit's look **alone** on a workshop page — a
 * creator's run judges their look, not Stall's three again — and every
 * shipped look everywhere else.
 */
export function measuredLooks(): readonly Look[] {
    return kit === undefined ? shippedLooks() : [kit];
}

/** A look by id, from what this page can paint. Throws on any other id. */
export function lookById(id: number): Look {
    const look = galleryLooks().find((candidate) => candidate.id === id);
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
 * The apex paints `view.theme ?? DEFAULT_THEME` and never fetches, so the
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
