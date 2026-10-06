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
 * (`a-worn-only-sheet-is-fetched-once-per-page`). **One exception, the
 * unattended screens'** (8d2, CRITIC-STEP-8 item 18): a wall or a stream
 * overlay, which nobody reloads, gives a failed sheet a fresh link
 * (`retryLookSheet`) — the failed link removed first, so a page holds at most
 * one link per sheet, and at most `LOOK_SHEET_RETRIES` times per page, so a
 * sheet that keeps failing costs a bounded number of requests and never a
 * loop. A tab older than a deploy asks for a hash the edge no longer has
 * (Pages: 404, `no-store`), which no retry can heal: that screen paints the
 * default until it is reloaded, and a reload asks for the new hash.
 *
 * **Late is failed** (8d2): a first paint waits for the sheet at most
 * `LOOK_SHEET_WAIT_MS` (`waitForLookSheet`), and a sheet still pending then
 * is given up — `failed`, sticky like any other failure — so an answer that
 * arrives afterwards changes nothing on the page
 * (`a-late-sheet-changes-nothing-on-the-page`): the stall painted the default
 * and said so, and a look that swapped itself in under a reader a moment
 * later would be the flash the wait exists to prevent. Only a pending entry
 * takes an answer at all.
 *
 * **What a page shows while the sheet is not ready** is the renderer's
 * (8d2's hold, `render.ts`): the default look wearing nothing until the
 * sheet is `ready`, never the look's class over the base sheets alone — so
 * nothing paints in a look whose own rules have not arrived, and everything
 * measured off a paint (a cut name's run, the ticker's pass, the wall's
 * payment lines) is measured under the sheet.
 */

import { LOOK_CLASS } from '../domain/lookClass';

/** The custom property a look sheet names itself with (`LOOK_SHEET_PROPERTY` in `scripts/workshop-css.mjs`). */
export const LOOK_SHEET_PROPERTY = '--look-sheet';

/** Where a worn-only sheet stands on one page. */
export type LookSheetState = 'pending' | 'ready' | 'failed';

/** A look's sheet, as the look table hands it for a worn-only row (`lookSheetOf`). */
export type LookSheet = { readonly url: string; readonly cls: string };

/**
 * How long a paint waits for a worn-only sheet before it paints the default
 * and calls the sheet failed (8d2; STEP-6-PLAN 6.4, STEP-8-PLAN §3): the
 * clock starts when the paint is otherwise ready, never at the request, so a
 * sheet asked for early — beside the chain reads — is waited for no longer
 * than one that was not. Three seconds: a few hundred milliseconds on the
 * slowest connection measured for the sheet's size, so a sheet that has not
 * arrived by then is one that is not coming.
 */
export const LOOK_SHEET_WAIT_MS = 3_000;

/**
 * How many fresh links an unattended screen gives one failed sheet, per page
 * (CRITIC-STEP-8 item 18): ten, so a wall on its sixty-second heartbeat tries
 * for ten minutes and an overlay on its thirty-second retry for five, then
 * stops. Bounded on purpose — a screen nobody reloads is the one place a
 * retry that never ends would run for a week.
 */
export const LOOK_SHEET_RETRIES = 10;

type Entry = {
    readonly cls: string;
    state: LookSheetState;
    readonly done: Promise<HTMLLinkElement>;
    /** The link this entry put on the page, once it exists: a retry removes it. */
    link?: HTMLLinkElement;
    /** Fail a pending entry — the wait gave up on it — and do nothing to a settled one. */
    readonly giveUp: (why: Error) => void;
};

/** Every sheet asked for, per document, by its absolute URL. */
const PAGES = new WeakMap<Document, Map<string, Entry>>();

/** How many fresh links each sheet has been given on a page (`retryLookSheet`), by its absolute URL. */
const RETRIED = new WeakMap<Document, Map<string, number>>();

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
    const done = settled(new Promise<HTMLLinkElement>((resolve, reject) => (answer = { resolve, reject })));
    // Only a pending entry is answered: once it is settled — ready, failed,
    // or given up by a wait that ran out — a later event changes nothing
    // (`a-late-sheet-changes-nothing-on-the-page`).
    const fail = (why: Error): void => {
        if (entry.state === 'pending') {
            entry.state = 'failed';
            answer.reject(why);
        }
    };
    const entry: Entry = { cls, state: 'pending', done, giveUp: fail };
    page.set(href, entry);
    // A document that will not take the link (no head, a head that throws)
    // is a sheet that failed — never a throw on the renderer's paint path,
    // and never an entry left `pending` for the page's life, which a hold
    // would wait on until its cap (CRITIC-STEP-8D1 item 4).
    try {
        const link = doc.createElement('link');
        link.rel = 'stylesheet';
        entry.link = link;
        link.addEventListener(
            'load',
            () => {
                if (entry.state !== 'pending') {
                    return;
                }
                if (sheetNamesItself(link.sheet, cls)) {
                    entry.state = 'ready';
                    answer.resolve(link);
                } else {
                    fail(new Error(`${url} loaded, and is not a sheet naming ${cls}`));
                }
            },
            { once: true },
        );
        link.addEventListener('error', () => fail(new Error(`the look sheet at ${url} did not load`)), { once: true });
        // Both attributes before the link is connected: a document asks for a
        // stylesheet the moment it is in the tree with both.
        link.href = href;
        doc.head.append(link);
    } catch (err) {
        fail(
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
 * The ask that waits nothing (`applyTheme`, and the app's early ask when the
 * record's look is first known): the sheet on the page, its answer kept on
 * the page's entry (`lookSheetState`) for whoever paints next. A failure is
 * never thrown at the caller.
 */
export function askForLookSheet(sheet: LookSheet, doc: Document): void {
    void loadLookSheet(sheet.url, sheet.cls, doc).catch(() => undefined);
}

/**
 * Ask for `sheet` and answer once it has settled: `ready`, or `failed` — an
 * error, a load that is not the sheet, a URL refused, or no answer within
 * `ms`, when a pending entry is given up for the page's life (the module
 * docblock: late is failed). Never rejects. One clock per wait, started now:
 * a sheet already settled answers at once.
 */
export function waitForLookSheet(
    sheet: LookSheet,
    doc: Document,
    ms: number = LOOK_SHEET_WAIT_MS,
): Promise<'ready' | 'failed'> {
    const done = loadLookSheet(sheet.url, sheet.cls, doc);
    const href = sameOrigin(sheet.url, doc);
    const entry = href === undefined ? undefined : PAGES.get(doc)?.get(href);
    const settledAs = done.then(
        (): 'ready' => 'ready',
        (): 'failed' => 'failed',
    );
    if (entry === undefined || entry.cls !== sheet.cls || entry.state !== 'pending') {
        return settledAs;
    }
    const timer = setTimeout(
        () => entry.giveUp(new Error(`the look sheet at ${sheet.url} did not load within ${ms} ms`)),
        ms,
    );
    return settledAs.finally(() => clearTimeout(timer));
}

/** How many more fresh links `retryLookSheet` would give `sheet` on `doc`. */
export function lookSheetRetriesLeft(sheet: LookSheet, doc: Document): number {
    const href = sameOrigin(sheet.url, doc);
    return href === undefined ? 0 : Math.max(0, LOOK_SHEET_RETRIES - (RETRIED.get(doc)?.get(href) ?? 0));
}

/**
 * The unattended screens' retry (the module docblock; CRITIC-STEP-8 item
 * 18): a sheet that failed on `doc` gets a fresh link — the failed one
 * removed and its entry dropped first, so the page holds one link for it —
 * while retries are left. Answers whether it asked again; a sheet that is
 * pending, ready, never asked for, or out of retries is left as it is.
 */
export function retryLookSheet(sheet: LookSheet, doc: Document): boolean {
    const href = sameOrigin(sheet.url, doc);
    const page = PAGES.get(doc);
    const known = href === undefined ? undefined : page?.get(href);
    if (href === undefined || page === undefined || known === undefined || known.state !== 'failed' || known.cls !== sheet.cls) {
        return false;
    }
    if (lookSheetRetriesLeft(sheet, doc) === 0) {
        return false;
    }
    let tried = RETRIED.get(doc);
    if (tried === undefined) {
        tried = new Map();
        RETRIED.set(doc, tried);
    }
    tried.set(href, (tried.get(href) ?? 0) + 1);
    known.link?.remove();
    page.delete(href);
    askForLookSheet(sheet, doc);
    return true;
}

/** Forget every sheet asked for on `doc`, and its retries: a test's fresh page, where the tests share one document. */
export function resetLookSheetsForTests(doc: Document): void {
    PAGES.delete(doc);
    RETRIED.delete(doc);
}
