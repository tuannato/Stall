// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    LOOK_SHEET_PROPERTY,
    LOOK_SHEET_RETRIES,
    LOOK_SHEET_WAIT_MS,
    askForLookSheet,
    loadLookSheet,
    lookSheetRetriesLeft,
    lookSheetState,
    retryLookSheet,
    sheetNamesItself,
    waitForLookSheet,
} from './lookSheets';

/**
 * The worn-only loader (`lookSheets.ts`, step 8d1), over a page whose head
 * records what is appended and never connects it: a connected stylesheet
 * link is a request, and no test reaches the network
 * (`no-test-reaches-the-network`). The answer a browser gives — `load` with
 * the sheet, `load` with something else, `error` — is dispatched by hand,
 * which is also the only way to stage `vite preview`'s SPA fallback (200,
 * HTML, and Chrome fires `load`) without a server. The same code under
 * Chrome and the production policy is the probe's
 * `a-worn-only-sheet-loads-under-the-production-policy`.
 */

const ORIGIN = 'https://stall.test';

/** A page at `url`: the loader's document, and every element its head was handed. */
function page(url = `${ORIGIN}/s/qq`) {
    const appended: Element[] = [];
    const doc = {
        URL: url,
        baseURI: url,
        createElement: (tag: string) => document.createElement(tag),
        head: { append: (...nodes: Element[]) => appended.push(...nodes) },
    } as unknown as Document;
    return { doc, appended };
}

/** A sheet holding `css`, as a loaded link would carry it. */
function sheetOf(css: string): CSSStyleSheet {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    return sheet;
}

/** Answer `link` as a browser would: `load` with `sheet` (or none), or `error`. */
function answer(link: Element, how: { sheet: CSSStyleSheet | null } | 'error'): void {
    if (how === 'error') {
        link.dispatchEvent(new Event('error'));
        return;
    }
    Object.defineProperty(link, 'sheet', { value: how.sheet, configurable: true });
    link.dispatchEvent(new Event('load'));
}

const NAMED = (cls: string) => `.${cls} { ${LOOK_SHEET_PROPERTY}: ${cls}; } .${cls} .item-n { color: red; }`;

describe('a-worn-only-sheet-is-a-same-origin-link-and-no-inline-style', () => {
    it('appends one stylesheet link, on the page’s own origin, and nothing else', async () => {
        const { doc, appended } = page();
        const done = loadLookSheet('/assets/sheet-x-abc123.css', 't-x', doc);
        expect(appended).toHaveLength(1);
        const link = appended[0] as HTMLLinkElement;
        expect(link.tagName).toBe('LINK');
        expect(link.rel).toBe('stylesheet');
        expect(link.getAttribute('href')).toBe(`${ORIGIN}/assets/sheet-x-abc123.css`);
        expect(link.hasAttribute('style'), 'no inline style').toBe(false);
        expect([...link.attributes].map((a) => a.name).sort()).toEqual(['href', 'rel']);
        answer(link, { sheet: sheetOf(NAMED('t-x')) });
        await expect(done).resolves.toBe(link);
    });

    it('refuses another origin, a scheme that is not the page’s, and a class that is not a look’s — before any link', async () => {
        const { doc, appended } = page();
        for (const [url, cls] of [
            ['https://elsewhere.test/assets/x.css', 't-x'],
            ['//elsewhere.test/assets/x.css', 't-x'],
            ['data:text/css,.t-x{}', 't-x'],
            ['javascript:alert(1)', 't-x'],
            ['/assets/x.css', 'x'],
            ['/assets/x.css', 't-two classes'],
            ['/assets/x.css', 't-X'],
        ] as const) {
            await expect(loadLookSheet(url, cls, doc), `${url} as ${cls}`).rejects.toThrow();
        }
        expect(appended, 'no link was made').toEqual([]);
        // A page with no origin to compare against loads nothing either.
        const blank = page('about:blank');
        await expect(loadLookSheet('/assets/x.css', 't-x', blank.doc)).rejects.toThrow(/origin/);
        expect(blank.appended).toEqual([]);
    });
});

/**
 * One link per sheet per page, and a failure kept for the page's life. The
 * one exception is the unattended screens' retry (8d2, CRITIC-STEP-8 item
 * 18), which replaces a failed link with a fresh one only through
 * `retryLookSheet`, capped: `a-failed-sheet-gets-a-fresh-link-only-on-a-retry-and-only-so-often`.
 */
describe('a-worn-only-sheet-is-fetched-once-per-page', () => {
    it('answers every later ask with the first one’s promise, and makes one link', async () => {
        const { doc, appended } = page();
        const first = loadLookSheet('/assets/a.css', 't-a', doc);
        const second = loadLookSheet('/assets/a.css', 't-a', doc);
        // The same URL written absolutely is the same sheet.
        const third = loadLookSheet(`${ORIGIN}/assets/a.css`, 't-a', doc);
        expect(second).toBe(first);
        expect(third).toBe(first);
        expect(appended).toHaveLength(1);
        expect(lookSheetState('/assets/a.css', doc)).toBe('pending');
        answer(appended[0]!, { sheet: sheetOf(NAMED('t-a')) });
        await first;
        expect(lookSheetState('/assets/a.css', doc)).toBe('ready');
        expect(loadLookSheet('/assets/a.css', 't-a', doc)).toBe(first);
        expect(appended).toHaveLength(1);
    });

    it('keeps a failure for the page’s life: asked again, the same failure and no second link', async () => {
        const { doc, appended } = page();
        const first = loadLookSheet('/assets/gone.css', 't-gone', doc);
        answer(appended[0]!, 'error');
        await expect(first).rejects.toThrow(/did not load/);
        expect(lookSheetState('/assets/gone.css', doc)).toBe('failed');
        expect(loadLookSheet('/assets/gone.css', 't-gone', doc)).toBe(first);
        expect(appended).toHaveLength(1);
    });

    it('refuses the same URL under another look, and gives another page its own link', async () => {
        const one = page();
        void loadLookSheet('/assets/a.css', 't-a', one.doc);
        await expect(loadLookSheet('/assets/a.css', 't-b', one.doc)).rejects.toThrow(/asked for as t-a/);
        expect(one.appended).toHaveLength(1);
        const two = page();
        void loadLookSheet('/assets/a.css', 't-a', two.doc);
        expect(two.appended).toHaveLength(1);
        expect(lookSheetState('/assets/b.css', one.doc), 'nothing asked for it').toBeUndefined();
    });
});

describe('a-sheet-that-loads-but-does-not-name-its-look-has-failed', () => {
    it('is ready only once the loaded sheet names its look', async () => {
        for (const [what, sheet] of [
            ['no sheet (an HTML answer, as vite preview’s SPA fallback is)', null],
            ['an empty sheet', sheetOf('')],
            ['another look’s sheet', sheetOf(NAMED('t-other'))],
            ['the name under a wider selector', sheetOf(`.stall.t-x { ${LOOK_SHEET_PROPERTY}: t-x; }`)],
            ['the class, naming another look', sheetOf(`.t-x { ${LOOK_SHEET_PROPERTY}: t-other; }`)],
        ] as const) {
            const { doc, appended } = page();
            const done = loadLookSheet('/assets/x.css', 't-x', doc);
            answer(appended[0]!, { sheet });
            await expect(done, what).rejects.toThrow(/is not a sheet naming t-x/);
            expect(lookSheetState('/assets/x.css', doc), what).toBe('failed');
        }
        const { doc, appended } = page();
        const done = loadLookSheet('/assets/x.css', 't-x', doc);
        answer(appended[0]!, { sheet: sheetOf(NAMED('t-x')) });
        await expect(done).resolves.toBe(appended[0]);
        expect(lookSheetState('/assets/x.css', doc)).toBe('ready');
    });

    it('reads the name off the sheet’s own rules, and a sheet it cannot read names nothing', () => {
        expect(sheetNamesItself(sheetOf(NAMED('t-x')), 't-x')).toBe(true);
        expect(sheetNamesItself(sheetOf(NAMED('t-x')), 't-y')).toBe(false);
        expect(sheetNamesItself(null, 't-x')).toBe(false);
        const unreadable = {
            get cssRules(): CSSRuleList {
                throw new DOMException('cross-origin', 'SecurityError');
            },
        } as unknown as CSSStyleSheet;
        expect(sheetNamesItself(unreadable, 't-x')).toBe(false);
    });
});

/**
 * The renderer's one road to the loader (`applyTheme` → `askForLookSheet`;
 * CRITIC-STEP-8D1 item 4): it puts the row's sheet on the page — one link,
 * with the row's URL, under the row's class — answers nothing and throws
 * nothing, whatever the document does: a failure is held on the page's
 * entry, never thrown on the paint path, and a document that will not take
 * the link leaves the sheet `failed`, never `pending` for the page's life.
 * Red: a no-op `askForLookSheet`; the URL and class swapped; the append
 * outside its `try`.
 */
describe('the-renderers-ask-puts-one-link-on-the-page-and-never-throws', () => {
    const SHEET = { url: '/assets/sheet-x-abc123.css', cls: 't-x' } as const;

    it('puts one link for the row’s sheet on the page, however often it is asked', () => {
        const { doc, appended } = page();
        expect(askForLookSheet(SHEET, doc)).toBeUndefined();
        askForLookSheet(SHEET, doc);
        expect(appended).toHaveLength(1);
        expect((appended[0] as HTMLLinkElement).getAttribute('href')).toBe(`${ORIGIN}${SHEET.url}`);
        expect(lookSheetState(SHEET.url, doc)).toBe('pending');
        answer(appended[0]!, { sheet: sheetOf(NAMED('t-x')) });
        expect(lookSheetState(SHEET.url, doc)).toBe('ready');
    });

    it('holds a failure on the page and throws nothing, the answer or the ask', async () => {
        const { doc, appended } = page();
        askForLookSheet(SHEET, doc);
        expect(() => answer(appended[0]!, 'error')).not.toThrow();
        // Let the rejection settle: an unobserved one would fail this file.
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(lookSheetState(SHEET.url, doc)).toBe('failed');
        // A sheet refused before any link (another origin) is no throw either.
        expect(() => askForLookSheet({ url: 'https://elsewhere.test/x.css', cls: 't-x' }, doc)).not.toThrow();
        expect(appended).toHaveLength(1);
    });

    it('leaves a sheet the document would not take failed, and throws nothing', async () => {
        for (const head of [
            null,
            {
                append: () => {
                    throw new DOMException('the document refused the node', 'HierarchyRequestError');
                },
            },
        ]) {
            const doc = { ...(page().doc as unknown as object), head } as unknown as Document;
            expect(() => askForLookSheet(SHEET, doc), String(head)).not.toThrow();
            expect(lookSheetState(SHEET.url, doc), String(head)).toBe('failed');
            await expect(loadLookSheet(SHEET.url, SHEET.cls, doc)).rejects.toThrow(/could not be put on the page/);
        }
    });
});

/**
 * Late is failed (8d2; STEP-8-PLAN §3): a wait gives a pending sheet
 * `LOOK_SHEET_WAIT_MS` from the moment it starts, then gives it up — failed,
 * for the page's life — and an answer that arrives afterwards changes
 * nothing: the page already painted the default and said so. A wait never
 * rejects, and a sheet already settled is answered at once. Red: the load
 * handler acting on an entry that is no longer pending; the wait with no
 * clock.
 */
describe('a-late-sheet-changes-nothing-on-the-page', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('gives a pending sheet up at the wait, and a later load leaves it failed', async () => {
        vi.useFakeTimers();
        const { doc, appended } = page();
        const sheet = { url: '/assets/slow.css', cls: 't-slow' };
        const waited = waitForLookSheet(sheet, doc);
        await vi.advanceTimersByTimeAsync(LOOK_SHEET_WAIT_MS - 1);
        expect(lookSheetState(sheet.url, doc)).toBe('pending');
        await vi.advanceTimersByTimeAsync(1);
        await expect(waited).resolves.toBe('failed');
        expect(lookSheetState(sheet.url, doc)).toBe('failed');
        answer(appended[0]!, { sheet: sheetOf(NAMED('t-slow')) });
        expect(lookSheetState(sheet.url, doc), 'a late answer changes nothing').toBe('failed');
        await expect(loadLookSheet(sheet.url, sheet.cls, doc)).rejects.toThrow(/within/);
        expect(vi.getTimerCount(), 'no clock left running').toBe(0);
    });

    it('answers a sheet that lands in time, one already settled at once, and never rejects', async () => {
        vi.useFakeTimers();
        const { doc, appended } = page();
        const ready = { url: '/assets/ready.css', cls: 't-ready' };
        const waited = waitForLookSheet(ready, doc);
        answer(appended[0]!, { sheet: sheetOf(NAMED('t-ready')) });
        await expect(waited).resolves.toBe('ready');
        expect(vi.getTimerCount(), 'the clock is cleared when the sheet lands').toBe(0);
        await expect(waitForLookSheet(ready, doc)).resolves.toBe('ready');
        const gone = { url: '/assets/gone.css', cls: 't-gone' };
        const first = waitForLookSheet(gone, doc);
        answer(appended[1]!, 'error');
        await expect(first).resolves.toBe('failed');
        await expect(waitForLookSheet(gone, doc)).resolves.toBe('failed');
        await expect(waitForLookSheet({ url: 'https://elsewhere.test/x.css', cls: 't-x' }, doc)).resolves.toBe('failed');
        expect(appended, 'a settled sheet is not asked again').toHaveLength(2);
    });
});

/**
 * The unattended screens' retry (8d2; CRITIC-STEP-8 item 18): a sheet that
 * failed gets a fresh link only through `retryLookSheet` — the failed link
 * removed from the page and its entry dropped first, so the page holds one
 * link for it — at most `LOOK_SHEET_RETRIES` times per page, after which it
 * stays failed: a screen nobody reloads makes a bounded number of requests,
 * never a loop. A sheet that is pending, ready or never asked for is left as
 * it is. A page older than a deploy asks for a hash the edge no longer has,
 * which no retry heals; a reload is a new page, which asks again. Red: the
 * failed link left on the page (two links), no cap (an eleventh link).
 */
describe('a-failed-sheet-gets-a-fresh-link-only-on-a-retry-and-only-so-often', () => {
    /** A page whose head is a real element no document holds: links are kept and removable, and none is a request. */
    function pageWithHead(url = `${ORIGIN}/s/qq`) {
        const head = document.createElement('div');
        const doc = { URL: url, baseURI: url, createElement: (tag: string) => document.createElement(tag), head } as unknown as Document;
        return { doc, links: () => [...head.querySelectorAll('link')] };
    }
    const SHEET = { url: '/assets/skewed.css', cls: 't-skewed' };

    it('replaces the failed link with one fresh one, and stops at its cap', async () => {
        const { doc, links } = pageWithHead();
        await expect(waitForLookSheet(SHEET, doc, 1)).resolves.toBe('failed');
        expect(links()).toHaveLength(1);
        const first = links()[0]!;
        expect(lookSheetRetriesLeft(SHEET, doc)).toBe(LOOK_SHEET_RETRIES);
        for (let i = 1; i <= LOOK_SHEET_RETRIES; i += 1) {
            const failedLink = links()[0]!;
            answer(failedLink, 'error');
            await new Promise((resolve) => setTimeout(resolve, 0));
            expect(lookSheetState(SHEET.url, doc)).toBe('failed');
            expect(retryLookSheet(SHEET, doc), `retry ${i}`).toBe(true);
            expect(links(), 'the failed link is gone, one fresh one in its place').toHaveLength(1);
            expect(links()[0]).not.toBe(failedLink);
            expect(lookSheetState(SHEET.url, doc)).toBe('pending');
            expect(lookSheetRetriesLeft(SHEET, doc)).toBe(LOOK_SHEET_RETRIES - i);
        }
        expect(links()[0]).not.toBe(first);
        answer(links()[0]!, 'error');
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(retryLookSheet(SHEET, doc), 'out of retries').toBe(false);
        expect(lookSheetState(SHEET.url, doc)).toBe('failed');
        expect(links()).toHaveLength(1);
        // A reload is a new page: it asks again, once.
        const reloaded = pageWithHead();
        const again = waitForLookSheet(SHEET, reloaded.doc);
        expect(reloaded.links()).toHaveLength(1);
        answer(reloaded.links()[0]!, { sheet: sheetOf(NAMED('t-skewed')) });
        await expect(again).resolves.toBe('ready');
    });

    it('leaves a sheet that is pending, ready or never asked for as it is', async () => {
        const { doc, links } = pageWithHead();
        expect(retryLookSheet(SHEET, doc), 'never asked for').toBe(false);
        expect(links()).toEqual([]);
        const pending = loadLookSheet(SHEET.url, SHEET.cls, doc);
        expect(retryLookSheet(SHEET, doc), 'pending').toBe(false);
        answer(links()[0]!, { sheet: sheetOf(NAMED('t-skewed')) });
        await pending;
        expect(retryLookSheet(SHEET, doc), 'ready').toBe(false);
        expect(retryLookSheet({ url: SHEET.url, cls: 't-other' }, doc), 'another look').toBe(false);
        expect(links()).toHaveLength(1);
        expect(lookSheetState(SHEET.url, doc)).toBe('ready');
    });
});
