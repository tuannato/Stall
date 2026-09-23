/**
 * The workshop look, as data: `workshop/look.json` read through a strict
 * validator and turned into the two things the renderer takes — a
 * `DecodedTheme` row and its decoration rows.
 *
 * **Data, never code** (the step-1 critic's P2-7): Stall never
 * runs a creator's code, so the look under design is JSON, and this module is
 * the only thing that reads it. Every field is checked by type and range,
 * every unknown field is refused, and every problem is collected before
 * anything is thrown, so a creator reads one list and fixes it once rather
 * than meeting the faults one run at a time.
 *
 * What the file may say, and nothing else:
 *
 * - `label` — the look's name as the showroom and the probe print it.
 * - `base` — `modern`, `neo` or `rural`: the shipped row whose every field the
 *   look starts from (shape strings, the ornament strip, the sparse-shop
 *   voice and motif kind, the danger ink). The creator's sheet dresses the
 *   rest, and `pnpm workshop:start <base>` copies that look's sheet to start
 *   from.
 * - `palette` — any of the roles a mood may move (`PaletteDelta`), each an
 *   RGB triple `[r, g, b]`. One colour notation in the whole file: the mood
 *   rows below take the same triples.
 * - `fontIndex` — one of the shipped stacks (`FONT_STACKS`); `softness` — the
 *   radius in px.
 * - `shape` — **numbers only**: the shape fields that are one length
 *   (`SHAPE_PX_KEYS`, painted as `<n>px`) and the two weights. No CSS string
 *   from this file reaches an inline custom property; a creator's strings
 *   live in their stylesheet, where the lint reads them.
 * - `tierCeilings`, `overlayTierCeilings` — the two price ladders, required:
 *   they pair with the tier sizes the look's own sheet declares.
 * - `moods`, `decorations` — rows in the `ShippedAttachment` shape without
 *   `tokenId` (a kit row is never minted) and without `themeId` (the loader
 *   gives every row the kit's id).
 *
 * The id is fixed (`WORKSHOP_THEME_ID`), the class is fixed (`t-workshop`)
 * and `known` is true, because the look is ours to paint in the showroom and
 * `settingsNotes` would otherwise measure a screen no shipped look paints.
 */
import {
    ATTACHMENT_BITS,
    type AttachmentSlot,
    type PaletteDelta,
    type ShippedAttachment,
} from '../src/domain/attachments';
import { isLegibleText } from '../src/domain/text';
import {
    DEFAULT_THEME_ID,
    FONT_STACKS,
    NEO_CITY_THEME_ID,
    RURAL_THEME_ID,
    WORKSHOP_THEME_ID,
    decodeTheme,
    type DecodedTheme,
    type Rgb,
    type Shape,
} from '../src/domain/theme';

/** The one class the kit's sheet is scoped under. */
export const WORKSHOP_SHEET_CLASS = 't-workshop';

/** The shipped rows a kit look may start from, by the name the file uses. */
export const KIT_BASES = {
    modern: DEFAULT_THEME_ID,
    neo: NEO_CITY_THEME_ID,
    rural: RURAL_THEME_ID,
} as const;
export type KitBase = keyof typeof KIT_BASES;

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
const LABEL_MAX = 32;
const PLACE_MAX = 40;
const SOFTNESS_MAX = 64;
const PX_MAX = 2000;
const CEILING_MAX = 40;

/** A look the kit can paint: its row and its decoration rows. */
export type WorkshopLook = {
    readonly theme: DecodedTheme;
    readonly rows: readonly ShippedAttachment[];
};

/** Every problem the file has, in one error. */
export class WorkshopLookError extends Error {
    readonly problems: readonly string[];
    constructor(problems: readonly string[]) {
        super(
            `workshop/look.json has ${problems.length} problem${problems.length === 1 ? '' : 's'}:\n` +
                problems.map((p) => `  - ${p}`).join('\n'),
        );
        this.name = 'WorkshopLookError';
        this.problems = problems;
    }
}

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
        unknownKeys(here, raw, ROW_KEYS, problems, {
            tokenId: 'a kit row is never minted',
            themeId: 'the kit gives every row its own id',
        });
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
            if (raw['cls'] !== undefined || raw['paint'] !== undefined) {
                problems.push(`${here}: a mood moves the palette and paints nothing — no "cls" or "paint"`);
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
            if (typeof cls !== 'string' || !/^att-[a-z0-9]+(-[a-z0-9]+)*$/.test(cls)) {
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
            ...(at === 'moods'
                ? { palette: moodPalette! }
                : { cls: raw['cls'] as string, paint: raw['paint'] as 'root' | 'node' }),
        };
        out.push(row);
    });
    return out;
}

/**
 * Every problem `source` has as a kit look, or an empty list. The kit's
 * commands call this before they build, so a creator reads the list in the
 * terminal rather than on a blank page.
 */
export function workshopLookProblems(source: string): string[] {
    try {
        parseWorkshopLook(source);
        return [];
    } catch (err) {
        if (err instanceof WorkshopLookError) {
            return [...err.problems];
        }
        throw err;
    }
}

/** The look `source` describes, or one `WorkshopLookError` listing every fault. */
export function parseWorkshopLook(source: string): WorkshopLook {
    let json: Json;
    try {
        json = JSON.parse(source);
    } catch (err) {
        throw new WorkshopLookError([`not JSON: ${(err as Error).message}`]);
    }
    return lookFromJson(json);
}

/** The same, over a value already parsed. */
export function lookFromJson(json: Json): WorkshopLook {
    const problems: string[] = [];
    if (!isObject(json)) {
        throw new WorkshopLookError(['the file must hold one object, {…}']);
    }
    unknownKeys('', json, TOP_KEYS, problems);
    for (const key of ['label', 'base', 'tierCeilings', 'overlayTierCeilings', 'moods', 'decorations']) {
        if (json[key] === undefined) {
            problems.push(`${key}: required`);
        }
    }
    const label = json['label'] === undefined ? undefined : text('label', json['label'], LABEL_MAX, problems);
    const baseName = json['base'];
    if (baseName !== undefined && (typeof baseName !== 'string' || !(baseName in KIT_BASES))) {
        problems.push(`base: must be one of ${Object.keys(KIT_BASES).join(', ')}`);
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
    const moods = json['moods'] === undefined ? [] : rows('moods', json['moods'], problems);
    const decorations =
        json['decorations'] === undefined ? [] : rows('decorations', json['decorations'], problems);

    const all = [...moods, ...decorations];
    const byBit = new Map<number, string>();
    const byCls = new Map<string, string>();
    const placeOfSlot = new Map<AttachmentSlot, string>();
    for (const row of all) {
        const seen = byBit.get(row.bit);
        if (seen !== undefined) {
            problems.push(`bit ${row.bit}: carried by both "${seen}" and "${row.label}" — a bit names one row`);
        } else {
            byBit.set(row.bit, row.label);
        }
        if (row.cls !== undefined) {
            const other = byCls.get(row.cls);
            if (other !== undefined) {
                problems.push(`class ${row.cls}: carried by both "${other}" and "${row.label}"`);
            } else {
                byCls.set(row.cls, row.label);
            }
        }
        const place = placeOfSlot.get(row.slot);
        if (place === undefined) {
            placeOfSlot.set(row.slot, row.place);
        } else if (place !== row.place) {
            problems.push(
                `slot ${row.slot}: named "${place}" and "${row.place}" — rows sharing a slot share its place word`,
            );
        }
    }

    if (problems.length > 0) {
        throw new WorkshopLookError(problems);
    }
    const base = decodeTheme(KIT_BASES[baseName as KitBase]);
    const theme: DecodedTheme = {
        ...base,
        ...colours,
        ...(fontIndex === undefined ? {} : { fontIndex }),
        ...(softness === undefined ? {} : { softness }),
        shape: { ...base.shape, ...shapeOver },
        id: WORKSHOP_THEME_ID,
        known: true,
        sheetClass: WORKSHOP_SHEET_CLASS,
        label: label!,
        tierCeilings: tiers!,
        overlayTierCeilings: overlayTiers!,
    };
    return {
        theme,
        // In bit order, as the shipped catalogue is: the probe measures rows
        // one by one in this order and a look's moods and decorations
        // interleave there.
        rows: [...all].sort((a, b) => a.bit - b.bit).map((row) => ({ ...row, themeId: WORKSHOP_THEME_ID })),
    };
}
