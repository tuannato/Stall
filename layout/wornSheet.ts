/**
 * How the layout harness puts a worn-only look's sheet on a page, and how it
 * reads that a look was painted with its sheet (step 6, 6.7 of the step-6
 * plan v2).
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
 * **The loading here is the harness's, not the app's.** The production
 * loader — one link per URL per page, its state on the view, the hold and
 * the failure path — is step 8's, with the first shipped worn-only look
 * (Ink wash); until then no row is `worn` and the app loads every look
 * sheet with its entry CSS. This module does the one thing the harness
 * needs: append a same-origin `<link rel="stylesheet">` and say whether it
 * loaded — no inline style, no `import()` of CSS (whose failure arrives as
 * a global event and cannot be retried) — which is also exactly what the
 * dedicated job `a-worn-only-sheet-loads-under-the-production-policy`
 * proves the production policy lets through.
 */
import { SKELETON_SHEET_CLASS, type Look } from './looks';

/** The custom property a look sheet names itself with (`LOOK_SHEET_PROPERTY` in `scripts/workshop-css.mjs`). */
export const LOOK_SHEET_PROPERTY = '--look-sheet';

/** The looks painted without a sheet on purpose: the skeleton, the base sheets alone. */
export const SHEETLESS_CLASSES: readonly string[] = [SKELETON_SHEET_CLASS];

/**
 * Append `<link rel="stylesheet" href>` to the head and settle when it has:
 * resolved with the link once it loaded AND the loaded sheet names
 * `names` (`.<names> { --look-sheet: <names>; }`, read from its own CSSOM);
 * rejected on `error` (a 404, a policy refusal) or on a load that is not
 * that sheet. The second half is not caution: `vite preview` answers a
 * missing file with its SPA fallback, 200 and HTML, and Chrome fires `load`
 * on a stylesheet link it refused to apply for its MIME type (measured by
 * `a-worn-only-sheet-loads-under-the-production-policy`, 2026-09-27) — so
 * `load` alone says a response arrived, and only the sheet's own name says
 * it is the sheet. The link stays either way; a failed one is inert.
 */
export function loadWornSheet(href: string, names: string, doc: Document = document): Promise<HTMLLinkElement> {
    return new Promise((resolve, reject) => {
        const link = doc.createElement('link');
        link.rel = 'stylesheet';
        link.addEventListener(
            'load',
            () => {
                if (sheetNamesItself(link.sheet, names)) {
                    resolve(link);
                } else {
                    reject(new Error(`${href} loaded, and is not a sheet naming ${names}`));
                }
            },
            { once: true },
        );
        link.addEventListener('error', () => reject(new Error(`the look sheet at ${href} did not load`)), {
            once: true,
        });
        link.href = href;
        doc.head.append(link);
    });
}

/** True when `sheet` holds the rule `.<cls> { --look-sheet: <cls>; }` at its top level. */
export function sheetNamesItself(sheet: CSSStyleSheet | null, cls: string): boolean {
    if (sheet === null) return false;
    let rules: CSSRuleList;
    try {
        rules = sheet.cssRules;
    } catch {
        return false;
    }
    return [...rules].some(
        (rule) =>
            rule instanceof CSSStyleRule &&
            rule.selectorText === `.${cls}` &&
            rule.style.getPropertyValue(LOOK_SHEET_PROPERTY).trim() === cls,
    );
}

/**
 * The sheet of every worn-only look among `looks`, as `{ url, cls }`. No
 * row is worn-only yet, so there is no URL to give: the map from a
 * worn-only look's class to its built file arrives with the production
 * loader (step 8), and until then a worn-only look reaching a measured page
 * fails here, loudly, rather than being measured without its sheet.
 */
export function wornSheetsOf(
    looks: readonly Look[],
    urls: ReadonlyMap<string, string> = new Map(),
): { url: string; cls: string }[] {
    return looks
        .filter((look) => look.theme.sheetLoad === 'worn')
        .map((look) => {
            const url = urls.get(look.theme.sheetClass);
            if (url === undefined) {
                throw new Error(
                    `${look.theme.sheetClass} is a worn-only look with no sheet URL on this page — ` +
                        'the harness cannot measure it with its sheet',
                );
            }
            return { url, cls: look.theme.sheetClass };
        });
}

/** One painted stall's look class and the name its sheet gave it. */
export type LookSheetRead = { readonly cls: string; readonly sheet: string };

/** Every painted `.stall` under `root` wearing a `t-*` class, with the `--look-sheet` it computes. */
export function lookSheetReads(root: ParentNode): LookSheetRead[] {
    const out: LookSheetRead[] = [];
    for (const stall of root.querySelectorAll('.stall')) {
        const sheet = getComputedStyle(stall).getPropertyValue(LOOK_SHEET_PROPERTY).trim();
        for (const cls of stall.classList) {
            if (cls.startsWith('t-')) out.push({ cls, sheet });
        }
    }
    return out;
}

/** Why a read says a look was painted without its sheet, or undefined. */
export function lookSheetFault(read: LookSheetRead): string | undefined {
    if (SHEETLESS_CLASSES.includes(read.cls) || read.sheet === read.cls) return undefined;
    return read.sheet === ''
        ? `a stall wearing ${read.cls} names no sheet — the look was painted without its own`
        : `a stall wearing ${read.cls} computes ${LOOK_SHEET_PROPERTY}: ${read.sheet}`;
}
