// @vitest-environment happy-dom
/**
 * Where the shared hooks' marks stand (step 8f1, `src/ui/lookHooks.ts`), over
 * every screen the probe measures — the probe's own fixtures, so a surface
 * the probe paints is a surface this reads.
 *
 * `no-look-mark-is-inside-a-money-node` (the step-8 critic's item 21): a mark
 * a look may paint is never a descendant of a money node, and the figure's
 * mark is a sibling of its figure in the figure's own container — so a look
 * that hangs a stroke under the digits draws beside the money, and the money
 * box is read whole. What measures a mark a look SHOWS is step 8f2's
 * (`no-look-mark-paints-inside-a-protected-box`); no look shows one today,
 * which `no-shipped-look-shows-a-mark` holds statically.
 */
import { describe, expect, it } from 'vitest';
import { renderStall } from '../src/ui/render';
import { SCREENS, handlers } from './fixtures';
import { measuredLooks, paintView } from './looks';
import { MONEY } from './moneySet';
import { guardSheets } from '../scripts/served-sheets.mjs';

/**
 * Every sheet a run serves — the role table's, and every private look's the
 * run reads, the tracked fixture always (`scripts/served-sheets.mjs`).
 */
const SERVED = await guardSheets();
const FIGURE = '[data-role="price"], [data-role="seller-price"]';

/** Every mark each screen paints, on the default look, bare. */
function marksByScreen(): Map<string, Element[]> {
    const look = measuredLooks().find((l) => l.theme.sheetClass === 't-modern')!;
    const out = new Map<string, Element[]>();
    const root = document.createElement('div');
    root.id = 'app';
    document.body.append(root);
    for (const [screen, view] of Object.entries(SCREENS)) {
        renderStall(root, paintView(view, look, []), handlers);
        out.set(screen, [...root.querySelectorAll('[data-look-mark]')]);
    }
    root.remove();
    return out;
}

describe('no-look-mark-is-inside-a-money-node', () => {
    const marks = marksByScreen();

    it('stands every mark outside every money node, empty and hidden from readers', () => {
        let read = 0;
        for (const [screen, list] of marks) {
            for (const mark of list) {
                const kind = mark.getAttribute('data-look-mark');
                const at = `${screen}: a ${kind} mark`;
                expect(mark.closest(MONEY), `${at} is inside a money node`).toBeNull();
                expect(mark.getAttribute('aria-hidden'), at).toBe('true');
                expect(mark.childNodes, `${at} holds nothing`).toHaveLength(0);
                expect(['figure', 'shelf', 'tile'], at).toContain(kind);
                read += 1;
            }
        }
        expect(read, 'the screens painted marks to read').toBeGreaterThan(100);
    });

    it('stands each figure’s mark beside its figure, each shelf’s first, and each tile’s beside its letters or picture', () => {
        for (const [screen, list] of marks) {
            for (const mark of list) {
                const parent = mark.parentElement!;
                const kind = mark.getAttribute('data-look-mark');
                if (kind === 'figure') {
                    const figures = [...parent.children].filter((child) => child.matches(FIGURE));
                    expect(figures, `${screen}: a figure mark beside one figure`).toHaveLength(1);
                    expect(parent.lastElementChild, `${screen}: the figure mark is its container's last child`).toBe(mark);
                } else if (kind === 'shelf') {
                    expect(parent.classList.contains('items'), `${screen}: a shelf mark in a run of rows`).toBe(true);
                    expect(parent.firstElementChild, `${screen}: the shelf mark is first`).toBe(mark);
                    expect([...parent.children].slice(1).every((row) => row.classList.contains('item')), `${screen}: rows follow it`).toBe(true);
                } else {
                    expect(parent.classList.contains('item-ic'), `${screen}: a tile mark in a tile`).toBe(true);
                    expect(parent.firstElementChild, `${screen}: the tile mark is first`).toBe(mark);
                }
            }
        }
    });

    it('gives every figure on the surfaces the plan names a mark, and every run of rows and every tile one', () => {
        const root = document.createElement('div');
        const look = measuredLooks().find((l) => l.theme.sheetClass === 't-modern')!;
        document.body.append(root);
        // [screen, the figure's container]: the listing row, the quote row,
        // both faces, the pay sheet, Pay several, the wall's two rows, the
        // stream's two cards.
        const surfaces: [string, string][] = [
            ['offers', 'button.item-head .item-a'],
            ['plugin-missing-quotes', '.item-head-q .item-a'],
            ['item-listing', '.face-x'],
            ['item-quote', '.face-x'],
            ['pay', '.pay-x'],
            ['pay-several', '.pay-x'],
            ['shop-window-browse', '.sw-row .item-a'],
            ['shop-window-quotes', '.sw-row .item-a'],
            ['broadcast', '.bc-p'],
            ['broadcast-quotes', '.bc-p'],
        ];
        for (const [screen, container] of surfaces) {
            renderStall(root, paintView(SCREENS[screen]!, look, []), handlers);
            const figures = [...root.querySelectorAll(FIGURE)].filter((f) => f.parentElement?.matches(container));
            expect(figures.length, `${screen}: figures in ${container}`).toBeGreaterThan(0);
            for (const figure of figures) {
                const mark = [...figure.parentElement!.children].find((c) => c.getAttribute('data-look-mark') === 'figure');
                expect(mark, `${screen}: ${container} has its mark`).toBeDefined();
            }
        }
        for (const [screen, view] of Object.entries(SCREENS)) {
            renderStall(root, paintView(view, look, []), handlers);
            for (const items of root.querySelectorAll('.stall .items')) {
                if (items.closest('.deck-stall') !== null) continue;
                expect(items.firstElementChild?.getAttribute('data-look-mark'), `${screen}: a shelf without its mark`).toBe('shelf');
            }
            for (const tile of root.querySelectorAll('.item-ic')) {
                if (tile.closest('.deck-stall') !== null || tile.classList.contains('event-ic-empty')) continue;
                const mark = [...tile.children].find((c) => c.getAttribute('data-look-mark') === 'tile');
                expect(mark, `${screen}: a tile without its mark`).toBeDefined();
            }
        }
        root.remove();
    });
});

describe('no-shipped-look-shows-a-mark', () => {
    /**
     * The marks are inert on Modern, Neo and Rural: `stall.css` hides them,
     * and no app sheet — the base, a screen's, a shipped look's — names one:
     * a rule that did would show it on a look nobody measured with it
     * (`pnpm looks:diff` is the browser half). A private look's sheet is the
     * one that shows a mark, so it is not held to this. A shelf's first child
     * is its mark, so no served sheet — a private look's included — counts
     * the rows of `.items` by every child.
     */
    const stall = SERVED.find((sheet) => sheet.path === 'src/ui/stall.css')!;
    const selectorsOf = (css: string): string[] =>
        [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{/g)].map((m) => m[1]!.trim());

    it('hides every mark in the base sheet, and keeps it off the zoom', () => {
        expect(stall.css).toMatch(/\n\[data-look-mark\] \{\n    display: none;\n\}/);
        expect(stall.css).toMatch(/\n\.zoom-frame \.zoom-ic \[data-look-mark\] \{\n    display: none;\n\}/);
    });

    it('names no mark in any app sheet', () => {
        const app = SERVED.filter((sheet) => ['base', 'look', 'screen'].includes(sheet.role));
        expect(app.map((sheet) => sheet.path)).toContain('src/ui/theme-rural.css');
        for (const sheet of app) {
            for (const selector of selectorsOf(sheet.css)) {
                const shows = /look-mark|mark-(figure|shelf|tile)|data-look-mark/.test(selector);
                const base = sheet === stall && /^(\.zoom-frame \.zoom-ic )?\[data-look-mark\]$/.test(selector);
                expect(shows && !base, `${sheet.path}: ${selector}`).toBe(false);
            }
        }
    });

    it('counts no shelf’s rows by every child, in any served sheet', () => {
        let counted = 0;
        for (const sheet of SERVED) {
            for (const selector of selectorsOf(sheet.css).filter((sel) => /\.items\b/.test(sel))) {
                if (/:nth-(child|last-child)\(/.test(selector)) {
                    expect(selector, `${sheet.path}: counts a shelf's rows by every child`).toMatch(/ of \.item\)/);
                    counted += 1;
                }
                expect(selector, `${sheet.path}: ${selector}`).not.toMatch(/:(first-child|first-of-type|only-child|nth-of-type)/);
            }
        }
        expect(counted, "Rural's tilt is read").toBeGreaterThan(0);
    });
});
