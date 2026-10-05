/**
 * The workshop look, as data: `workshop/look.json` read for the kit's place
 * — `WORKSHOP_THEME_ID`, the `t-workshop` class, the file a creator is told
 * to fix — and turned into the two things the renderer takes, a
 * `DecodedTheme` row and its decoration rows.
 *
 * The validator itself is `src/domain/lookData.ts` (moved there in step 8b1,
 * so the app's look table can read a private look's `look.json` with the
 * same rules): what the file may say, why every fault is listed in one
 * error, and why no string of a creator's reaches an inline custom property
 * are that module's docblock. This file names the kit's place and keeps the
 * names the kit's pages, scripts and tests have always used, its error's
 * runtime name included. Tests:
 * `a-kit-look-json-is-validated-and-every-fault-listed`,
 * `the-kit-error-keeps-its-name`.
 */
import {
    LOOK_BASES,
    LookDataError,
    lookDataProblems,
    lookFromData,
    parseLookData,
    type LookBase,
    type LookData,
    type LookPlace,
} from '../src/domain/lookData';
import { WORKSHOP_THEME_ID } from '../src/domain/theme';

export { PALETTE_KEYS, SHAPE_PX_KEYS, SHAPE_WEIGHT_KEYS } from '../src/domain/lookData';

/** The one class the kit's sheet is scoped under. */
export const WORKSHOP_SHEET_CLASS = 't-workshop';

/** The shipped rows a kit look may start from, by the name the file uses. */
export const KIT_BASES = LOOK_BASES;
export type KitBase = LookBase;

/** A look the kit can paint: its row and its decoration rows. */
export type WorkshopLook = LookData;

/** Where the kit's look is read for. */
const KIT_PLACE: LookPlace = {
    id: WORKSHOP_THEME_ID,
    sheetClass: WORKSHOP_SHEET_CLASS,
    file: 'workshop/look.json',
};

/**
 * Every problem the kit's file has, in one error naming `workshop/look.json`
 * — the kit's own error, by name as well as by kind, as it was before the
 * validator moved: a `LookDataError` too, so a reader that asks either is
 * answered. Test: `the-kit-error-keeps-its-name`.
 */
export class WorkshopLookError extends LookDataError {
    constructor(problems: readonly string[]) {
        super(KIT_PLACE.file, problems);
        this.name = 'WorkshopLookError';
    }
}

/** Run a read for the kit's place, and hand its faults back as the kit's error. */
function asKit<T>(read: () => T): T {
    try {
        return read();
    } catch (err) {
        if (err instanceof LookDataError && !(err instanceof WorkshopLookError)) {
            throw new WorkshopLookError(err.problems);
        }
        throw err;
    }
}

/**
 * Every problem `source` has as a kit look, or an empty list. The kit's
 * commands call this before they build, so a creator reads the list in the
 * terminal rather than on a blank page.
 */
export function workshopLookProblems(source: string): string[] {
    return lookDataProblems(source, KIT_PLACE);
}

/** The look `source` describes, or one `WorkshopLookError` listing every fault. */
export function parseWorkshopLook(source: string): WorkshopLook {
    return asKit(() => parseLookData(source, KIT_PLACE));
}

/** The same, over a value already parsed. */
export function lookFromJson(json: unknown): WorkshopLook {
    return asKit(() => lookFromData(json, KIT_PLACE));
}
