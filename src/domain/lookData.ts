/**
 * A look as data: a `look.json` read through a strict validator and turned
 * into the two things the renderer takes — a `DecodedTheme` row and its
 * decoration rows.
 *
 * **Data, never code** (the step-1 critic's P2-7): Stall never runs a look's
 * code, so a look's own settings are JSON, and this module is the only thing
 * that reads them. Every field is checked by type and range, every unknown
 * field is refused, and every problem is collected before anything is
 * thrown, so the author reads one list and fixes it once rather than meeting
 * the faults one run at a time.
 *
 * Two places read a `look.json` through it: the workshop kit's
 * `workshop/look.json` (`layout/workshopLook.ts` names the kit's place —
 * `WORKSHOP_THEME_ID`, `t-workshop`), and from step 8b2 a private look's
 * (`lookTable.ts`, at runtime, failing safe; the build, loudly). It moved
 * here from `layout/` in 8b1 because `src/` may not import the harness
 * (`directory-walls`) and the app's look table needs it; it imports nothing
 * but `src/domain`, so the kit's scripts still reach it through Vite's
 * `runnerImport` (Node's own type stripping cannot load an extensionless
 * import). It reads the kit's shape plus one field: a private look's row may
 * name the token that entitles it (`mintable`, 8b2). The other fields a
 * first-party look needs beyond the kit's (its sparse voice, a decoration's
 * mount and guard) arrive with the step that paints them.
 *
 * What the file may say, and nothing else:
 *
 * - `label` — the look's name as the showroom and the probe print it.
 * - `base` — `modern`, `neo` or `rural`: the shipped row whose every field the
 *   look starts from (shape strings, the ornament strip, the sparse-shop
 *   voice and motif kind, the danger ink). The look's own sheet dresses the
 *   rest, and `pnpm workshop:start <base>` copies that look's sheet to start
 *   from. A base is a shipped row by definition, so it is read from the
 *   public table (`decodeTheme`), never the merged one.
 * - `palette` — any of the roles a mood may move (`PaletteDelta`), each an
 *   RGB triple `[r, g, b]`. One colour notation in the whole file: the mood
 *   rows below take the same triples.
 * - `fontIndex` — one of the shipped stacks (`FONT_STACKS`); `softness` — the
 *   radius in px.
 * - `shape` — **numbers only**: the shape fields that are one length
 *   (`SHAPE_PX_KEYS`, painted as `<n>px`) and the two weights. No CSS string
 *   from this file reaches an inline custom property; a look's strings
 *   live in its stylesheet, where the lint reads them.
 * - `tierCeilings`, `overlayTierCeilings` — the two price ladders, required:
 *   they pair with the tier sizes the look's own sheet declares.
 * - `moods`, `decorations` — rows in the `ShippedAttachment` shape without
 *   `themeId` (the loader gives every row the place's id), and without
 *   `tokenId` unless the place is `mintable`: a kit row is never minted,
 *   while a private look's row names the token that entitles it once that
 *   token exists (64 lower-case hex, one token per row) and omits it until
 *   then. A mood may name one `cls` since D11
 *   (step 5c) and never a `paint`: its class lands on the stall root while it
 *   is worn and never on the stream overlay, it takes the decorations' `att-`
 *   shape, and no decoration of the look and no row Stall ships may own it
 *   (`moodClassProblems`); every rule naming it sits under the look's own
 *   class like every other rule of its sheet (the lint).
 *
 * The id, the class and the file named in the error are the caller's
 * (`LookPlace`), and `known` is true, because the look is one this build
 * paints as itself — `settingsNotes` would otherwise measure a screen no
 * look paints. Tests: `a-kit-look-json-is-validated-and-every-fault-listed`
 * (the kit's place, `layout/workshopLook.test.ts`) and
 * `a-look-is-read-under-the-place-it-is-given` (`lookData.test.ts`).
 */
import { ATT_CLASS, moodClassProblems, sameOwner } from './moodClass';
import {
    ATTACHMENT_BITS,
    SHIPPED_ATTACHMENTS,
    type AttachmentSlot,
    type PaletteDelta,
    type ShippedAttachment,
} from './attachments';
import { isLegibleText } from './text';
import {
    DEFAULT_THEME_ID,
    FONT_STACKS,
    NEO_CITY_THEME_ID,
    RURAL_THEME_ID,
    decodeTheme,
    type DecodedTheme,
    type Rgb,
    type Shape,
} from './theme';

/** The shipped rows a look may start from, by the name the file uses. */
export const LOOK_BASES = {
    modern: DEFAULT_THEME_ID,
    neo: NEO_CITY_THEME_ID,
    rural: RURAL_THEME_ID,
} as const;
export type LookBase = keyof typeof LOOK_BASES;

/** Exactly the roles `PaletteDelta` names — the compile-time check below holds it there. */
export const PALETTE_KEYS = [
    'bg',
    'surface',
    'text',
    'muted',
    'accent',
    'accentTwo',
    'shade',
] as const satisfies readonly (keyof PaletteDelta)[];
type PaletteKey = (typeof PALETTE_KEYS)[number];
// A role added to `PaletteDelta` and missing here fails `tsc` rather than
// being refused by the validator in silence.
const PALETTE_KEYS_COVER_THE_DELTA: Exclude<keyof PaletteDelta, PaletteKey> extends never
    ? true
    : false = true;
void PALETTE_KEYS_COVER_THE_DELTA;

/**
 * The shape fields a look may restate as a number of px: each is one length
 * wherever a stylesheet reads it, so `<n>px` is a valid value for all of
 * them. The rest of `Shape` is strings (grid templates, colour mixes, shadow
 * lists) and stays the base row's.
 */
export const SHAPE_PX_KEYS = [
    'padXM',
    'padXD',
    'gap',
    'cardPad',
    'cardGap',
    'icon',
    'iconD',
    'iconRadius',
    'hero',
    'heroRadius',
    'priceSize',
    'priceSizeD',
    'unit',
    'paid',
    'signSize',
    'signSizeD',
    'itemName',
    'itemNameD',
    'btnRadius',
    'qrRadius',
    'sheetRadiusD',
    'sheetMaxD',
    'contentMaxD',
    'headRadius',
    'addrRadius',
    'chipRadius',
    'tabsRadius',
    'tabActiveRadius',
    'tabSize',
    'tabsGap',
    'sectMarkSize',
    'sectMarkGap',
] as const satisfies readonly (keyof Shape)[];

/** The two font weights, as whole numbers. */
export const SHAPE_WEIGHT_KEYS = ['priceWeight', 'nameWeight'] as const satisfies readonly (keyof Shape)[];

const SLOTS: readonly AttachmentSlot[] = ['crest', 'fringe', 'yard', 'mood', 'badge', 'trim'];
const TOP_KEYS = [
    'label',
    'base',
    'palette',
    'fontIndex',
    'softness',
    'shape',
    'tierCeilings',
    'overlayTierCeilings',
    'moods',
    'decorations',
] as const;
const ROW_KEYS = ['bit', 'slot', 'label', 'place', 'cls', 'paint', 'palette', 'motion'] as const;
/** The token that entitles a minted row: its genesis txid, as chronik writes it. */
const TOKEN_ID = /^[0-9a-f]{64}$/;
const LABEL_MAX = 32;
const PLACE_MAX = 40;
const SOFTNESS_MAX = 64;
const PX_MAX = 2000;
const CEILING_MAX = 40;

/**
 * Where a look's data is read for: the id its row and every decoration row
 * carry, the one class its sheet is scoped under, and the file a reader is
 * told to fix. The kit's is `WORKSHOP_THEME_ID`, `t-workshop`,
 * `workshop/look.json` (`layout/workshopLook.ts`).
 */
export type LookPlace = {
    readonly id: number;
    readonly sheetClass: `t-${string}`;
    readonly file: string;
    /**
     * Whether a row may name its token (`tokenId`): a private look's place
     * (`lookTable.ts` at runtime, the build's plugin), never the kit's — a
     * kit row is never minted, and its file is refused for trying.
     */
    readonly mintable?: true;
};

/** A look this build can paint: its row and its decoration rows. */
export type LookData = {
    readonly theme: DecodedTheme;
    readonly rows: readonly ShippedAttachment[];
};

/** Every problem the file has, in one error that names the file. */
export class LookDataError extends Error {
    readonly problems: readonly string[];
    constructor(file: string, problems: readonly string[]) {
        super(
            `${file} has ${problems.length} problem${problems.length === 1 ? '' : 's'}:\n` +
                problems.map((p) => `  - ${p}`).join('\n'),
        );
        this.name = 'LookDataError';
        this.problems = problems;
    }
}

/**
 * One private look as a build hands it to the app: the type of each entry
 * `virtual:stall-private-looks` exports (`src/private-looks.d.ts`, step 8).
 * The index's facts the app needs (the look's reserved id and its class),
 * the URL of its built sheet, and its `look.json` as parsed JSON —
 * `unknown`, because the look table validates it again at runtime with
 * `lookFromData` under `{ id, sheetClass, mintable }` and drops a look that
 * fails: the build's validation (`scripts/private-looks-build.mjs`) is the
 * loud one, the runtime's only fails safe. **The place is checked there
 * too, not here**: `lookFromData` copies `place.id` and `place.sheetClass`
 * onto the row unchecked (the kit's place is a literal), so a source naming
 * a shipped id or class, an unreserved id, or an id, a class or a token
 * another source has, is the table's to drop (the 8b1 critic's item 4,
 * `a-private-source-that-shadows-a-shipped-id-or-class-is-dropped`). Whether
 * the id is paid or released is never carried here — the public lists in
 * `theme.ts` decide (the step-8 critic's item 1).
 */
export type PrivateLookSource = {
    readonly id: number;
    readonly sheetClass: `t-${string}`;
    readonly sheetUrl: string;
    readonly look: unknown;
};

type Json = unknown;

function isObject(value: Json): value is Record<string, Json> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function codePoints(text: string): number {
    return [...text].length;
}

function unknownKeys(
    at: string,
    value: Record<string, Json>,
    allowed: readonly string[],
    problems: string[],
    why: Record<string, string> = {},
): void {
    for (const key of Object.keys(value)) {
        if (!allowed.includes(key)) {
            problems.push(
                `${at}${at === '' ? '' : '.'}${key}: unknown field${why[key] ? ` — ${why[key]}` : ''}` +
                    ` (allowed: ${allowed.join(', ')})`,
            );
        }
    }
}

function text(at: string, value: Json, max: number, problems: string[]): string | undefined {
    if (typeof value !== 'string' || !isLegibleText(value) || codePoints(value) > max) {
        problems.push(`${at}: must be text a reader can see, 1–${max} characters`);
        return undefined;
    }
    return value;
}

function wholeIn(at: string, value: Json, lo: number, hi: number, problems: string[]): number | undefined {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < lo || value > hi) {
        problems.push(`${at}: must be a whole number from ${lo} to ${hi}`);
        return undefined;
    }
    return value;
}

function rgb(at: string, value: Json, problems: string[]): Rgb | undefined {
    if (
        !Array.isArray(value) ||
        value.length !== 3 ||
        !value.every((c) => typeof c === 'number' && Number.isInteger(c) && c >= 0 && c <= 255)
    ) {
        problems.push(`${at}: must be three whole numbers 0–255, like [242, 242, 239]`);
        return undefined;
    }
    const [r, g, b] = value as [number, number, number];
    return { r, g, b };
}

function palette(at: string, value: Json, problems: string[]): PaletteDelta | undefined {
    if (!isObject(value)) {
        problems.push(`${at}: must be an object of colour roles (${PALETTE_KEYS.join(', ')})`);
        return undefined;
    }
    unknownKeys(at, value, PALETTE_KEYS, problems, { danger: 'the danger ink is the base row’s' });
    const out: PaletteDelta = {};
    for (const key of PALETTE_KEYS) {
        if (value[key] === undefined) {
            continue;
        }
        const colour = rgb(`${at}.${key}`, value[key], problems);
        if (colour !== undefined) {
            out[key] = colour;
        }
    }
    return out;
}

function ladder(at: string, value: Json, problems: string[]): [number, number, number] | undefined {
    if (
        !Array.isArray(value) ||
        value.length !== 3 ||
        !value.every((n) => typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= CEILING_MAX) ||
        !(value[0] < value[1] && value[1] < value[2])
    ) {
        problems.push(
            `${at}: must be three whole numbers 1–${CEILING_MAX}, each larger than the one before, like [7, 9, 12]`,
        );
        return undefined;
    }
    return [value[0], value[1], value[2]] as [number, number, number];
}

function shape(at: string, value: Json, problems: string[]): Partial<Shape> | undefined {
    if (!isObject(value)) {
        problems.push(`${at}: must be an object of numbers`);
        return undefined;
    }
    unknownKeys(at, value, [...SHAPE_PX_KEYS, ...SHAPE_WEIGHT_KEYS], problems);
    const out: Partial<Record<keyof Shape, string>> = {};
    for (const key of SHAPE_PX_KEYS) {
        const n = value[key];
        if (n === undefined) {
            continue;
        }
        if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > PX_MAX) {
            problems.push(`${at}.${key}: must be a number of px from 0 to ${PX_MAX}`);
            continue;
        }
        out[key] = `${n}px`;
    }
    for (const key of SHAPE_WEIGHT_KEYS) {
        if (value[key] === undefined) {
            continue;
        }
        const w = wholeIn(`${at}.${key}`, value[key], 100, 1000, problems);
        if (w !== undefined) {
            out[key] = String(w);
        }
    }
    return out as Partial<Shape>;
}

function rows(
    at: 'moods' | 'decorations',
    value: Json,
    problems: string[],
    mintable: boolean,
): Omit<ShippedAttachment, 'themeId'>[] {
    if (!Array.isArray(value)) {
        problems.push(`${at}: must be a list (write [] for none)`);
        return [];
    }
    const out: Omit<ShippedAttachment, 'themeId'>[] = [];
    value.forEach((raw, i) => {
        const here = `${at}[${i}]`;
        if (!isObject(raw)) {
            problems.push(`${here}: must be an object`);
            return;
        }
        const before = problems.length;
        unknownKeys(here, raw, mintable ? [...ROW_KEYS, 'tokenId'] : ROW_KEYS, problems, {
            tokenId: 'a kit row is never minted',
            themeId: 'the kit gives every row its own id',
        });
        const tokenId = raw['tokenId'];
        if (mintable && tokenId !== undefined && (typeof tokenId !== 'string' || !TOKEN_ID.test(tokenId))) {
            problems.push(`${here}.tokenId: must be the token's genesis txid, 64 lower-case hex — or left out until it is minted`);
        }
        const bit = wholeIn(`${here}.bit`, raw['bit'], 0, ATTACHMENT_BITS - 1, problems);
        const label = text(`${here}.label`, raw['label'], LABEL_MAX, problems);
        const place = text(`${here}.place`, raw['place'], PLACE_MAX, problems);
        if (typeof raw['motion'] !== 'boolean') {
            problems.push(`${here}.motion: must be true or false`);
        }
        const slot = raw['slot'];
        if (at === 'moods' && slot !== 'mood') {
            problems.push(`${here}.slot: a mood's slot is "mood"`);
        } else if (at === 'decorations' && (typeof slot !== 'string' || !SLOTS.includes(slot as AttachmentSlot) || slot === 'mood')) {
            problems.push(
                `${here}.slot: must be one of ${SLOTS.filter((s) => s !== 'mood').join(', ')} (a mood goes under "moods")`,
            );
        }
        let moodPalette: PaletteDelta | undefined;
        if (at === 'moods') {
            // A mood may name one class (D11): it lands on the stall root
            // while the mood is worn, and never on the stream overlay. Its
            // shape here; its owner below, once every row is read; its scope
            // is the sheet's (every rule under `.t-workshop`, the lint).
            if (raw['paint'] !== undefined) {
                problems.push(`${here}.paint: a mood's class lands on the stall root — no "paint"`);
            }
            const cls = raw['cls'];
            if (cls !== undefined && (typeof cls !== 'string' || !ATT_CLASS.test(cls))) {
                problems.push(
                    `${here}.cls: must be one class starting with "att-", lower-case letters, digits and single hyphens`,
                );
            }
            moodPalette = palette(`${here}.palette`, raw['palette'], problems);
            if (moodPalette !== undefined && Object.keys(moodPalette).length === 0) {
                problems.push(`${here}.palette: a mood must move at least one colour role`);
            }
        } else {
            if (raw['palette'] !== undefined) {
                problems.push(`${here}.palette: only a mood moves the palette`);
            }
            const cls = raw['cls'];
            if (typeof cls !== 'string' || !ATT_CLASS.test(cls)) {
                problems.push(
                    `${here}.cls: must be one class starting with "att-", lower-case letters, digits and single hyphens`,
                );
            }
            if (raw['paint'] !== 'root' && raw['paint'] !== 'node') {
                problems.push(`${here}.paint: must be "root" (paint on the stall) or "node" (a real element)`);
            }
        }
        if (problems.length > before) {
            return;
        }
        const row: Omit<ShippedAttachment, 'themeId'> = {
            bit: bit!,
            slot: slot as AttachmentSlot,
            label: label!,
            place: place!,
            motion: raw['motion'] as boolean,
            ...(mintable && typeof tokenId === 'string' ? { tokenId } : {}),
            ...(at === 'moods'
                ? { palette: moodPalette!, ...(raw['cls'] === undefined ? {} : { cls: raw['cls'] as string }) }
                : { cls: raw['cls'] as string, paint: raw['paint'] as 'root' | 'node' }),
        };
        out.push(row);
    });
    return out;
}

/**
 * Every problem `source` has as a look read for `place`, or an empty list.
 * The kit's commands call this before they build, so a creator reads the
 * list in the terminal rather than on a blank page.
 */
export function lookDataProblems(source: string, place: LookPlace): string[] {
    try {
        parseLookData(source, place);
        return [];
    } catch (err) {
        if (err instanceof LookDataError) {
            return [...err.problems];
        }
        throw err;
    }
}

/** The look `source` describes, read for `place`, or one `LookDataError` listing every fault. */
export function parseLookData(source: string, place: LookPlace): LookData {
    let json: Json;
    try {
        json = JSON.parse(source);
    } catch (err) {
        throw new LookDataError(place.file, [`not JSON: ${(err as Error).message}`]);
    }
    return lookFromData(json, place);
}

/** The same, over a value already parsed. */
export function lookFromData(json: Json, place: LookPlace): LookData {
    const problems: string[] = [];
    if (!isObject(json)) {
        throw new LookDataError(place.file, ['the file must hold one object, {…}']);
    }
    unknownKeys('', json, TOP_KEYS, problems);
    for (const key of ['label', 'base', 'tierCeilings', 'overlayTierCeilings', 'moods', 'decorations']) {
        if (json[key] === undefined) {
            problems.push(`${key}: required`);
        }
    }
    const label = json['label'] === undefined ? undefined : text('label', json['label'], LABEL_MAX, problems);
    const baseName = json['base'];
    if (baseName !== undefined && (typeof baseName !== 'string' || !(baseName in LOOK_BASES))) {
        problems.push(`base: must be one of ${Object.keys(LOOK_BASES).join(', ')}`);
    }
    const colours = json['palette'] === undefined ? {} : palette('palette', json['palette'], problems);
    const fontIndex =
        json['fontIndex'] === undefined
            ? undefined
            : wholeIn('fontIndex', json['fontIndex'], 0, FONT_STACKS.length - 1, problems);
    const softness =
        json['softness'] === undefined
            ? undefined
            : wholeIn('softness', json['softness'], 0, SOFTNESS_MAX, problems);
    const shapeOver = json['shape'] === undefined ? {} : shape('shape', json['shape'], problems);
    const tiers =
        json['tierCeilings'] === undefined ? undefined : ladder('tierCeilings', json['tierCeilings'], problems);
    const overlayTiers =
        json['overlayTierCeilings'] === undefined
            ? undefined
            : ladder('overlayTierCeilings', json['overlayTierCeilings'], problems);
    const mintable = place.mintable === true;
    const moods = json['moods'] === undefined ? [] : rows('moods', json['moods'], problems, mintable);
    const decorations =
        json['decorations'] === undefined ? [] : rows('decorations', json['decorations'], problems, mintable);

    const all = [...moods, ...decorations];
    const byBit = new Map<number, string>();
    const byCls = new Map<string, string>();
    const byToken = new Map<string, string>();
    const placeOfSlot = new Map<AttachmentSlot, string>();
    for (const row of all) {
        const seen = byBit.get(row.bit);
        if (seen !== undefined) {
            problems.push(`bit ${row.bit}: carried by both "${seen}" and "${row.label}" — a bit names one row`);
        } else {
            byBit.set(row.bit, row.label);
        }
        if (row.tokenId !== undefined) {
            const other = byToken.get(row.tokenId);
            if (other !== undefined) {
                problems.push(`token ${row.tokenId}: entitles both "${other}" and "${row.label}" — a token names one row`);
            } else {
                byToken.set(row.tokenId, row.label);
            }
        }
        if (row.cls !== undefined) {
            const other = byCls.get(row.cls);
            if (other !== undefined) {
                problems.push(`class ${row.cls}: carried by both "${other}" and "${row.label}"`);
            } else {
                byCls.set(row.cls, row.label);
            }
        }
        // A mood's class is the look's own: no other row of this look and
        // no decoration Stall ships owns it, in either direction of the
        // child-class rule — `att-rainfall` would wear Neo's rain wherever
        // stall.css paints `.stall.att-rainfall`, which names no look
        // (`moodClassProblems`, the catalogue's own pin). A shipped MOOD's
        // class is not refused: its rules are scoped to its own look, and
        // `pnpm workshop:start` copies them re-scoped to `.t-workshop` with
        // the row. Two rows of one look with one class are the duplicate
        // check's (`byCls`, above). The catalogue read is the shipped one:
        // whether two private looks' classes collide is the join's to say
        // (step 8b2), not one look's file.
        const others = [
            ...all.filter((other) => other.cls !== row.cls),
            ...SHIPPED_ATTACHMENTS.filter((shipped) => shipped.slot !== 'mood'),
        ];
        for (const why of moodClassProblems(row, others)) {
            problems.push(`moods: "${row.label}" — ${why}`);
        }
        // A private look's row classes are its own (the 8b2 critic's item 4):
        // stall.css paints `.stall.att-rainfall`, `.att-hum` and
        // `.att-horizon` for any look, so a private decoration named after a
        // shipped one would wear its paint, and the probe's class-keyed
        // tables would read it as the shipped row. Every shipped row is
        // checked for a decoration, the shipped moods for a mood (its
        // decorations are `moodClassProblems`' above). Not the kit's: a
        // starter copies a shipped look's rows, classes and all, on purpose.
        if (mintable && row.cls !== undefined) {
            for (const shipped of SHIPPED_ATTACHMENTS) {
                if (
                    shipped.cls !== undefined &&
                    (row.slot !== 'mood' || shipped.slot === 'mood') &&
                    sameOwner(row.cls, shipped.cls)
                ) {
                    const how = shipped.cls === row.cls ? 'is' : 'shares an owner with';
                    problems.push(
                        `class ${row.cls}: ${how} ${shipped.cls} ("${shipped.label}"), a row Stall ships — a private look's row classes are its own`,
                    );
                }
            }
        }
        const word = placeOfSlot.get(row.slot);
        if (word === undefined) {
            placeOfSlot.set(row.slot, row.place);
        } else if (word !== row.place) {
            problems.push(
                `slot ${row.slot}: named "${word}" and "${row.place}" — rows sharing a slot share its place word`,
            );
        }
    }

    if (problems.length > 0) {
        throw new LookDataError(place.file, problems);
    }
    const base = decodeTheme(LOOK_BASES[baseName as LookBase]);
    const theme: DecodedTheme = {
        ...base,
        ...colours,
        ...(fontIndex === undefined ? {} : { fontIndex }),
        ...(softness === undefined ? {} : { softness }),
        shape: { ...base.shape, ...shapeOver },
        id: place.id,
        known: true,
        sheetClass: place.sheetClass,
        // Every look read from data is worn-only: its sheet is its own file
        // (a private look's, the workshop kit's — 8d1), never the entry CSS
        // its base's row is bundled in. Stamped here, where the row is
        // built, so no reader meets the base's `bundled`.
        sheetLoad: 'worn',
        label: label!,
        tierCeilings: tiers!,
        overlayTierCeilings: overlayTiers!,
    };
    return {
        theme,
        // In bit order, as the shipped catalogue is: the probe measures rows
        // one by one in this order and a look's moods and decorations
        // interleave there.
        rows: [...all].sort((a, b) => a.bit - b.bit).map((row) => ({ ...row, themeId: place.id })),
    };
}
