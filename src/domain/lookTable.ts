/**
 * The look table the app decodes against (step 8): the shipped looks
 * (`theme.ts`, `attachments.ts`, public) merged with the private looks a
 * build includes (`virtual:stall-private-looks`, `src/private-looks.d.ts`),
 * and the one gate every record's look passes before it paints
 * (`paintableLook`).
 *
 * **Public symbols keep their public meaning; merged views get new names.**
 * `decodeTheme`, `SHIPPED_THEMES`, `SHIPPED_ATTACHMENTS` and the attachment
 * readers that consult the catalogue stay the three shipped looks — every
 * pin that counts three looks, the harness that measures them and the
 * scripts that read `theme.ts` by Node's type stripping keep reading exactly
 * that — and every app site that turns a record's id into a look, or lists
 * the looks a seller can choose, reads the merged view here instead. A site
 * left on the public table would paint the default look under a private
 * look's id (the kit's P1 shape, `the-harness-chooses-looks-in-one-place`),
 * so an app file takes from `theme.ts` and `attachments.ts` only the names
 * that read no catalogue — an allow-list, each name with its reason, so a
 * new catalogue reader is refused before anyone has classified it
 * (`the-app-takes-from-the-public-table-only-what-reads-no-catalogue`) — and
 * the sites themselves are pinned to their merged views
 * (`no-app-site-decodes-against-the-shipped-table-alone`).
 *
 * | merged view               | the public table's view    |
 * |---------------------------|-----------------------------|
 * | `decodeLook`              | `decodeTheme`               |
 * | `LOOK_ROWS`               | `SHIPPED_THEMES`            |
 * | `LOOK_ATTACHMENTS`        | `SHIPPED_ATTACHMENTS`       |
 * | `attachmentsForLook`      | `attachmentsForTheme`       |
 * | `wornForLook`             | `wornAttachments`           |
 * | `publishableLookFlags`    | `publishableFlags`          |
 * | `mintedLookTokens`        | `mintedAttachmentTokens`    |
 * | `lookAttachmentByTokenId` | `attachmentByTokenId`       |
 *
 * These eight and the gate are the module's whole runtime export
 * (`the-look-table-exports-exactly-its-merged-views`). Each view answers a
 * public id exactly as its public counterpart does, rows by reference
 * (`every-merged-view-answers-a-public-id-as-the-public-table-does`), and a
 * private id from the private look (`every-merged-view-answers-the-fixture-look`).
 * All eight read ONE merged `LOOK_ATTACHMENTS` — the shipped rows by
 * reference, then each private look's rows — so a derived view cannot be
 * left on the shipped catalogue while the obvious ones move (the 8b1
 * critic's item 2), and `category.ts`'s `LOOK_ATTACHMENTS.indexOf(row)` holds
 * across the readers. The readers that take a worn set rather than an id
 * (`wornFrom`, `withMood`, `attachmentClasses`, `attachmentNodesWanted`)
 * consult no catalogue and stay where they are.
 *
 * **A private look is admitted at run time or dropped, never a thrown
 * boot.** The build validates every included look loudly
 * (`scripts/private-looks-build.mjs`); here a source is read again and
 * dropped — its id then reads as unknown, like any id this build ships no
 * row for — when its `look.json` fails `lookFromData`
 * (`a-private-row-that-does-not-validate-reads-as-an-unknown-id`), or when
 * its place would shadow something (`lookFromData` copies the place onto the
 * row unchecked; the 8b1 critic's item 4): an id `PRIVATE_LOOK_IDS` does not
 * reserve, a class that is not one `t-` token or is a shipped look's, an id
 * or a class another source also names (every source sharing it is dropped —
 * an ambiguity has no winner), or a row's token that a shipped row or
 * another private look's row also names
 * (`a-private-source-that-shadows-a-shipped-id-or-class-is-dropped`). The
 * harness's classes (the kit's, the skeleton's, the step-6 fixture look's)
 * are refused by the build (`privateIndexProblems`) and not spelt here: the
 * served bundle must not carry them, which is how `gallery-is-not-served`
 * and `the-ordinary-probe-loads-no-kit` tell a harness leak from the app. An
 * admitted look's row is `sheetLoad: 'worn'`: its sheet is its own file,
 * never the entry CSS.
 *
 * **The paid gate is one function** (the step-8 critic's item 3):
 * `paintableLook` decides what a record's look paints and wears. A record
 * naming a paid look (`PAID_LOOK_IDS`, public) that this stall holds no
 * licence for paints the default look and wears **nothing** — none of its
 * own rows, mood included, and none of the default's, so no flag of it is
 * ever read against the default's table — and says why (`not-unlocked`).
 * The licence is a seam: step 8 has no licence check, so no app site passes
 * one and nothing paid is ever licensed; step 9 fills it. Every site that
 * puts a record's look on screen goes through the gate — `view.worn` in
 * `app.ts`, `paintedTheme`, the sign's note and the Wearing row in
 * `render.ts` — and `wornForLook` itself is refused anywhere but here and
 * the try-on road, which shows a look without claiming it
 * (`no-app-site-wears-a-look-around-the-gate`). Only a look this build
 * carries is gated: a public build reads a paid id as unknown, exactly as
 * before (`THEME_UNKNOWN`), and `THEME_NOT_UNLOCKED` paints only where the
 * paid look is in the build. Tests:
 * `an-unlicensed-look-wears-none-of-the-default-looks-rows`,
 * `an-unlicensed-look-wears-none-of-its-own-rows`.
 */
import { carriesPrivateLooks, privateLooks } from 'virtual:stall-private-looks';
import { SHIPPED_ATTACHMENTS, wornFrom, type ShippedAttachment } from './attachments';
import { lookFromData, type LookData, type PrivateLookSource } from './lookData';
import {
    DEFAULT_THEME,
    PAID_LOOK_IDS,
    PRIVATE_LOOK_IDS,
    SHIPPED_THEMES,
    decodeTheme,
    type DecodedTheme,
} from './theme';

/** One `t-` class token, as the private index writes one. */
const LOOK_CLASS = /^t-[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** How many times each value `key` gives appears across `items`. */
function counts<T, K>(items: readonly T[], key: (item: T) => K): Map<K, number> {
    const out = new Map<K, number>();
    for (const item of items) {
        out.set(key(item), (out.get(key(item)) ?? 0) + 1);
    }
    return out;
}

/** The private looks this build carries, each admitted or dropped (the docblock above), in the index's order. */
function admitted(sources: readonly PrivateLookSource[]): readonly LookData[] {
    const shippedClasses = new Set(SHIPPED_THEMES.map(({ id }) => decodeTheme(id).sheetClass));
    const shippedTokens = new Set(SHIPPED_ATTACHMENTS.flatMap((row) => (row.tokenId === undefined ? [] : [row.tokenId])));
    const wellFormed = sources.filter(
        (source): source is PrivateLookSource => typeof source === 'object' && source !== null,
    );
    const ids = counts(wellFormed, (source) => source.id);
    const classes = counts(wellFormed, (source) => source.sheetClass);
    const read: LookData[] = [];
    for (const source of wellFormed) {
        const cls = source.sheetClass;
        if (
            !PRIVATE_LOOK_IDS.includes(source.id) ||
            ids.get(source.id) !== 1 ||
            typeof cls !== 'string' ||
            !LOOK_CLASS.test(cls) ||
            shippedClasses.has(cls) ||
            classes.get(cls) !== 1
        ) {
            continue;
        }
        try {
            const data = lookFromData(source.look, {
                id: source.id,
                sheetClass: cls,
                file: `private look ${source.id}`,
                mintable: true,
            });
            read.push({ theme: { ...data.theme, sheetLoad: 'worn' }, rows: data.rows });
        } catch {
            // Dropped: its id reads as unknown. The build said why, loudly.
        }
    }
    const tokens = counts(
        read.flatMap((look) => look.rows.flatMap((row) => (row.tokenId === undefined ? [] : [row.tokenId]))),
        (token) => token,
    );
    return read.filter((look) =>
        look.rows.every(
            (row) => row.tokenId === undefined || (!shippedTokens.has(row.tokenId) && tokens.get(row.tokenId) === 1),
        ),
    );
}

/**
 * The private looks this build carries, admitted. `carriesPrivateLooks` is a
 * literal the build writes beside the list (`false` with no look selected),
 * so Rollup drops this branch — and with it `lookFromData` and the whole
 * runtime validator — from every build that carries none: the public build
 * pays a little over a kilobyte for the join, not the validator's nine.
 */
const PRIVATE_LOOKS: readonly LookData[] = carriesPrivateLooks ? admitted(privateLooks) : [];
const PRIVATE_ROWS: ReadonlyMap<number, DecodedTheme> = new Map(PRIVATE_LOOKS.map((look) => [look.theme.id, look.theme]));

/** Every look a seller can choose, in the order they are offered: the shipped three, then each private look. */
export const LOOK_ROWS: readonly { readonly id: number; readonly label: string }[] = [
    ...SHIPPED_THEMES,
    ...PRIVATE_LOOKS.map((look) => ({ id: look.theme.id, label: look.theme.label })),
];

/** Every decoration row: the shipped catalogue by reference, then each private look's rows. */
export const LOOK_ATTACHMENTS: readonly ShippedAttachment[] = [
    ...SHIPPED_ATTACHMENTS,
    ...PRIVATE_LOOKS.flatMap((look) => look.rows),
];

/** A record's look by id: a private look's row, a shipped row, or the default's with `known: false`. */
export function decodeLook(id: number): DecodedTheme {
    return PRIVATE_ROWS.get(id) ?? decodeTheme(id);
}

/** One look's decoration rows, in catalogue order. */
export function attachmentsForLook(themeId: number): readonly ShippedAttachment[] {
    return LOOK_ATTACHMENTS.filter((row) => row.themeId === themeId);
}

/**
 * What a look's flags wear, at most one per slot, lowest bit first —
 * `wornAttachments`' rule over the merged catalogue. `held` absent skips the
 * entitlement: that is the try-on's, never a record's (`paintableLook`).
 */
export function wornForLook(
    themeId: number,
    flags: number,
    held?: ReadonlySet<string>,
): readonly ShippedAttachment[] {
    return wornFrom(attachmentsForLook(themeId), flags, held);
}

/** The flags a record may carry: every bit naming a row with no token yet masked out (`publishableFlags`' rule). */
export function publishableLookFlags(themeId: number, flags: number): number {
    let out = flags;
    for (const row of attachmentsForLook(themeId)) {
        if (row.tokenId === undefined) {
            out &= ~(1 << row.bit);
        }
    }
    return out;
}

/** Every token the merged catalogue can be entitled by. */
export function mintedLookTokens(): ReadonlySet<string> {
    return new Set(LOOK_ATTACHMENTS.flatMap((row) => (row.tokenId === undefined ? [] : [row.tokenId])));
}

/** The row a token entitles, by its genesis txid. */
export function lookAttachmentByTokenId(tokenId: string): ShippedAttachment | undefined {
    return LOOK_ATTACHMENTS.find((row) => row.tokenId === tokenId);
}

/** What a record's look paints and wears, and why it is not its own when it is not. */
export type PaintedLook = {
    readonly theme: DecodedTheme;
    readonly worn: readonly ShippedAttachment[];
    /**
     * `unknown`: an id this build carries no row for (the default's row,
     * `known: false`). `not-unlocked`: a paid look this stall holds no
     * licence for. Absent when the record's own look paints.
     */
    readonly why?: 'unknown' | 'not-unlocked';
};

const NO_LICENCE: ReadonlySet<number> = new Set();

/**
 * The gate (the docblock above): what `record` — a record's look, as
 * `decodeLook` or the harness hands it — paints and wears under `flags`,
 * with the decorations `held` entitles. `licensed` is the paid looks this
 * stall holds a licence for; step 8 has no licence check, so no app site
 * passes it and a paid look is never licensed.
 */
export function paintableLook(
    record: DecodedTheme,
    flags: number,
    held: ReadonlySet<string>,
    licensed: ReadonlySet<number> = NO_LICENCE,
): PaintedLook {
    if (!record.known) {
        return { theme: record, worn: [], why: 'unknown' };
    }
    if (PAID_LOOK_IDS.includes(record.id) && !licensed.has(record.id)) {
        return { theme: DEFAULT_THEME, worn: [], why: 'not-unlocked' };
    }
    return { theme: record, worn: wornForLook(record.id, flags, held) };
}
