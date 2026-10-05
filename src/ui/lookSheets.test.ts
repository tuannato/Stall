// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { LOOK_SHEET_PROPERTY, loadLookSheet, lookSheetState, sheetNamesItself } from './lookSheets';

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
