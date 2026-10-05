/**
 * A worn-only look's sheet on the page (step 8d1; the plan is
 * `private/design/workshop-2026-09-23/STEP-8-PLAN.md` §3 and its "v2 after
 * the critic", which wins, and STEP-6-PLAN v2's items 6.3 and 6.8).
 *
 * A look row is `sheetLoad: 'bundled'` — its sheet is in the entry CSS every
 * visitor downloads, the three shipped looks — or `'worn'`: its own built
 * file, fetched only for a stall that paints it (CLAUDE.md §6). This module
 * is the one road a worn-only sheet takes onto a page, for the app
 * (`render.ts` asks it for the look it paints, a try-on included) and for
 * the layout harness (the probe's worn-only job, the showroom and the
 * workshop kit's pages load through it, so the probe measures this code and
 * not a copy of it).
 *
 * **One `<link rel="stylesheet">` per URL per document, appended to the
 * head** — after the entry CSS, so a worn-only sheet lands last in the
 * cascade, where a shipped look's sheet lands among the app's own — and
 * never removed. Same origin only: a URL that resolves to another origin, or
 * to none, is refused before any link exists, so the page's policy
 * (`style-src 'self'`, `img-src 'self' …`, `font-src 'self'`) is never asked
 * about a sheet this module would not load anyway, and no directive changes
 * for it. No inline style, and never Vite's `import()` of CSS: its failure
 * arrives as a global event and cannot be told apart per sheet.
 *
 * **Loaded is not `load`.** A sheet is `ready` only once its own CSSOM names
 * the look — `.t-x { --look-sheet: t-x; }`, the sentinel every look sheet
 * carries (`every-look-sheet-names-itself`). `vite preview` answers a missing
 * file with its SPA fallback, 200 and HTML, and Chrome fires `load`, not
 * `error`, on a stylesheet link answered that way (measured by the probe's
 * `a-worn-only-sheet-loads-under-the-production-policy`, 2026-09-27), so
 * `load` alone says a response arrived, and only the sheet's own name says
 * it is the sheet. Anything else — `error`, a load that is not the sheet, a
 * URL refused — is `failed`, and failed is sticky for the page's life: asked
 * again, the same URL answers the same failure and no second link is made
 * (`a-worn-only-sheet-is-fetched-once-per-page`). A retry that removes the
 * failed link first, and caps itself, is the unattended surfaces' (8d2,
 * CRITIC-STEP-8 item 18).
 *
 * **What a page shows while the sheet is not ready** (8d1, before 8d2's
 * hold): the look's class and its row's `--s-*` inline, over the base sheets
 * alone — the skeleton's state (`layout/looks.ts`, measured by the probe on
 * every screen) in the look's own palette, which `themeVars` has already
 * run through `legibleOn`. Nothing of the look's own sheet is on the page,
 * so nothing of it can cover a figure; when the sheet lands, its rules apply
 * to the class already on the stall without a repaint. A sheet that never
 * loads leaves exactly that state, which is what every build that carried a
 * private look painted before this module existed.
 */

import { LOOK_CLASS } from '../domain/lookClass';

/** The custom property a look sheet names itself with (`LOOK_SHEET_PROPERTY` in `scripts/workshop-css.mjs`). */
export const LOOK_SHEET_PROPERTY = '--look-sheet';

/** Where a worn-only sheet stands on one page. */
export type LookSheetState = 'pending' | 'ready' | 'failed';

/** A look's sheet, as the look table hands it for a worn-only row (`lookSheetOf`). */
export type LookSheet = { readonly url: string; readonly cls: string };


type Entry = {
    readonly cls: string;
    state: LookSheetState;
    readonly done: Promise<HTMLLinkElement>;
};

/** Every sheet asked for, per document, by its absolute URL. */
const PAGES = new WeakMap<Document, Map<string, Entry>>();

/** The URL `url` resolves to on `doc`, when it is on `doc`'s own origin. */
function sameOrigin(url: string, doc: Document): string | undefined {
    try {
        const here = new URL(doc.URL);
        const there = new URL(url, doc.baseURI);
        if (there.origin !== here.origin || (there.protocol !== 'https:' && there.protocol !== 'http:')) {
            return undefined;
        }
        return there.href;
    } catch {
        return undefined;
    }
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

/** A rejection that no caller needs to have observed: the entry keeps the reason, and a caller that awaits still gets it. */
function settled(promise: Promise<HTMLLinkElement>): Promise<HTMLLinkElement> {
    promise.catch(() => undefined);
    return promise;
}

/**
 * Put the sheet at `url` on `doc` for look `cls`, once: the first ask
 * appends the link, every later ask answers the same promise — resolved with
 * the link once the loaded sheet names `cls`, rejected with why otherwise.
 * Refused, with no link made: a class that is not one `t-` token, a URL on
 * another origin or none, and a URL already asked for under another class
 * (one sheet names one look).
 */
export function loadLookSheet(url: string, cls: string, doc: Document = document): Promise<HTMLLinkElement> {
    if (!LOOK_CLASS.test(cls)) {
        return settled(Promise.reject(new Error(`${JSON.stringify(cls)} is not a look class`)));
    }
    const href = sameOrigin(url, doc);
    if (href === undefined) {
        return settled(Promise.reject(new Error(`the look sheet at ${url} is not on this page's origin`)));
    }
    let page = PAGES.get(doc);
    if (page === undefined) {
        page = new Map();
        PAGES.set(doc, page);
    }
    const known = page.get(href);
    if (known !== undefined) {
        return known.cls === cls
            ? known.done
            : settled(Promise.reject(new Error(`the look sheet at ${url} was asked for as ${known.cls}, not ${cls}`)));
    }
    // The entry is recorded before the link exists: a document may answer a
    // stylesheet link while it is being connected (happy-dom does, with CSS
    // loading off), and the answer lands on this entry either way.
    let answer!: { resolve: (link: HTMLLinkElement) => void; reject: (why: Error) => void };
    const entry: Entry = {
        cls,
        state: 'pending',
        done: settled(new Promise<HTMLLinkElement>((resolve, reject) => (answer = { resolve, reject }))),
    };
    page.set(href, entry);
    // A document that will not take the link (no head, a head that throws)
    // is a sheet that failed — never a throw on the renderer's paint path,
    // and never an entry left `pending` for the page's life, which a hold
    // would wait on until its cap (CRITIC-STEP-8D1 item 4).
    try {
        const link = doc.createElement('link');
        link.rel = 'stylesheet';
        link.addEventListener(
            'load',
            () => {
                if (sheetNamesItself(link.sheet, cls)) {
                    entry.state = 'ready';
                    answer.resolve(link);
                } else {
                    entry.state = 'failed';
                    answer.reject(new Error(`${url} loaded, and is not a sheet naming ${cls}`));
                }
            },
            { once: true },
        );
        link.addEventListener(
            'error',
            () => {
                entry.state = 'failed';
                answer.reject(new Error(`the look sheet at ${url} did not load`));
            },
            { once: true },
        );
        // Both attributes before the link is connected: a document asks for a
        // stylesheet the moment it is in the tree with both.
        link.href = href;
        doc.head.append(link);
    } catch (err) {
        entry.state = 'failed';
        answer.reject(
            new Error(`the look sheet at ${url} could not be put on the page: ${err instanceof Error ? err.message : String(err)}`),
        );
    }
    return entry.done;
}

/** Where the sheet at `url` stands on `doc`: undefined when nothing asked for it. */
export function lookSheetState(url: string, doc: Document = document): LookSheetState | undefined {
    const href = sameOrigin(url, doc);
    return href === undefined ? undefined : PAGES.get(doc)?.get(href)?.state;
}

/**
 * The renderer's ask, for the look it paints (`applyTheme`): the sheet, when
 * the look table says the row is worn-only, and nothing to wait for — the
 * paint goes ahead over the base sheets and the sheet's rules apply when it
 * lands (the module docblock). A failure is kept on the page's entry
 * (`lookSheetState`), where 8d2's failure path will read it.
 */
export function askForLookSheet(sheet: LookSheet, doc: Document): void {
    void loadLookSheet(sheet.url, sheet.cls, doc).catch(() => undefined);
}
