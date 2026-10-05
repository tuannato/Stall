/**
 * How the layout harness reads that a look was painted with its sheet, and
 * which sheets a page it measures must load first (step 6, 6.7 of the
 * step-6 plan v2; step 8d1).
 *
 * **A look is measured with its sheet.** Every look sheet names itself on
 * its bare class (`.t-neo { --look-sheet: t-neo; }`,
 * `every-look-sheet-names-itself`), so a painted stall whose computed
 * `--look-sheet` is not its own `t-*` class was painted without its sheet —
 * a worn-only sheet that did not load, or a bundled one dropped from the
 * build — and every rule measured over it certified the base sheets alone.
 * The probe fails such a paint (`a-look-is-measured-with-its-sheet`) and
 * `pnpm looks:diff` refuses such a shot
 * (`looks-diff-refuses-a-look-painted-without-its-sheet`). The skeleton is
 * the one look painted without a sheet on purpose (`layout/looks.ts`).
 *
 * **The loading is the app's** (8d1): a worn-only sheet reaches a measured
 * page through `src/ui/lookSheets.ts`'s `loadLookSheet` — the loader the
 * renderer asks for a worn-only look it paints — so the probe's worn-only
 * job, the showroom and the workshop kit's pages measure that code and not
 * a copy of it. Until 8d1 this module carried its own `loadWornSheet`.
 */
import { LOOK_SHEET_PROPERTY } from '../src/ui/lookSheets';
import { SKELETON_SHEET_CLASS, type Look } from './looks';

export { LOOK_SHEET_PROPERTY };

/** The looks painted without a sheet on purpose: the skeleton, the base sheets alone. */
export const SHEETLESS_CLASSES: readonly string[] = [SKELETON_SHEET_CLASS];

/**
 * The sheet of every worn-only look among `looks`, as `{ url, cls }`: the
 * URL the page that registered the look handed over (`Look.sheetUrl` — the
 * workshop kit's, `layout/workshopKitSheet.ts`). A worn-only look with no
 * URL fails here, loudly, rather than being measured without its sheet.
 */
export function wornSheetsOf(looks: readonly Look[]): { url: string; cls: string }[] {
    return looks
        .filter((look) => look.theme.sheetLoad === 'worn')
        .map((look) => {
            if (look.sheetUrl === undefined) {
                throw new Error(
                    `${look.theme.sheetClass} is a worn-only look with no sheet URL on this page — ` +
                        'the harness cannot measure it with its sheet',
                );
            }
            return { url: look.sheetUrl, cls: look.theme.sheetClass };
        });
}

/**
 * One painted stall's look class, the name its computed style gives it, and
 * any name set inline on the stall itself — which must be none: the
 * renderer writes the theme's `--s-*` inline, and a `--look-sheet` among
 * them would read true on a stall whose sheet never loaded (the step-6
 * critic's P3).
 */
export type LookSheetRead = { readonly cls: string; readonly sheet: string; readonly inline: string };

/** Every painted `.stall` under `root` wearing a `t-*` class, with the `--look-sheet` it computes. */
export function lookSheetReads(root: ParentNode): LookSheetRead[] {
    const out: LookSheetRead[] = [];
    for (const stall of root.querySelectorAll('.stall')) {
        const sheet = getComputedStyle(stall).getPropertyValue(LOOK_SHEET_PROPERTY).trim();
        const inline = stall instanceof HTMLElement ? stall.style.getPropertyValue(LOOK_SHEET_PROPERTY).trim() : '';
        for (const cls of stall.classList) {
            if (cls.startsWith('t-')) out.push({ cls, sheet, inline });
        }
    }
    return out;
}

/** Why a read says a look was painted without its sheet, or undefined. */
export function lookSheetFault(read: LookSheetRead): string | undefined {
    if (read.inline !== '') {
        return `a stall wearing ${read.cls} sets ${LOOK_SHEET_PROPERTY}: ${read.inline} inline — only its sheet may name it`;
    }
    if (SHEETLESS_CLASSES.includes(read.cls) || read.sheet === read.cls) return undefined;
    return read.sheet === ''
        ? `a stall wearing ${read.cls} names no sheet — the look was painted without its own`
        : `a stall wearing ${read.cls} computes ${LOOK_SHEET_PROPERTY}: ${read.sheet}`;
}
