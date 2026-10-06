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

describe('no-app-sheet-names-a-mark', () => {
    /**
     * The marks are inert on Modern, Neo and Rural: `stall.css` hides them,
     * and no app sheet — the base, a screen's, a shipped look's — names one:
     * a rule that did would show it on a look nobody measured with it. A
     * private look's sheet is the one that shows a mark, so it is not held to
     * this. The browser half is the probe's `no-shipped-look-shows-a-mark`,
     * which reads every mark's computed display on every shipped look —
     * a selector can reach a mark without naming it. This half refuses the
     * structural selectors that would: a mark is the first child of
     * `.items` and of `.item-ic`, and the last of `.item-a`, `.pay-x`,
     * `.face-x` and `.bc-p`, so no served sheet — a private look's included
     * — counts or picks children there by position or emptiness (the 8f1
     * critic's item 2). Rows of a shelf are counted `:nth-child(… of .item)`
     * — and with no `.item` compound beside it, since `of S` adds S's weight
     * (`rural-rows-straighten-under-the-hand`).
     */
    const stall = SERVED.find((sheet) => sheet.path === 'src/ui/stall.css')!;
    const selectorsOf = (css: string): string[] =>
        [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{/g)].map((m) => m[1]!.trim());

    it('hides every mark in the base sheet, and keeps it off the zoom', () => {
        expect(stall.css).toMatch(/\n\[data-look-mark\] \{\n    display: none;\n\}/);
        expect(stall.css).toMatch(/\n\.zoom-frame \.zoom-ic \[data-look-mark\] \{\n    display: none !important;\n\}/);
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

    it('counts and picks no child of a mark’s host by position or emptiness, in any served sheet', () => {
        let counted = 0;
        for (const sheet of SERVED) {
            for (const selector of selectorsOf(sheet.css)) {
                const at = `${sheet.path}: ${selector}`;
                if (/\.items\b/.test(selector)) {
                    if (/:nth-(child|last-child)\(/.test(selector)) {
                        expect(selector, `${at} counts a shelf's rows by every child`).toMatch(/ of \.item\)/);
                        counted += 1;
                    }
                    expect(selector, at).not.toMatch(/:(first-child|first-of-type|only-child|only-of-type|nth-of-type|empty)/);
                }
                if (/\.(item-a|pay-x|face-x|bc-p)(?![\w-])/.test(selector)) {
                    expect(selector, at).not.toMatch(/:(last-child|nth-last-child|nth-last-of-type|last-of-type|only-child|only-of-type|empty)/);
                }
                if (/\.item-ic(?![\w-])/.test(selector)) {
                    expect(selector, at).not.toMatch(/:(first-child|first-of-type|only-child|only-of-type|empty|nth-child|nth-of-type)/);
                }
            }
        }
        expect(counted, "Rural's tilt is read").toBeGreaterThan(0);
    });
});

/**
 * The weight of a selector, (a, b, c) — Selectors 4: ids; classes,
 * attributes and pseudo-classes; types and pseudo-elements. `:where()` is
 * nothing, `:is()`, `:not()` and `:has()` their heaviest argument, and
 * `:nth-child(An+B of S)` one pseudo-class plus S's heaviest.
 */
function weightOf(selector: string): [number, number, number] {
    const w: [number, number, number] = [0, 0, 0];
    const add = (v: [number, number, number]): void => {
        w[0] += v[0];
        w[1] += v[1];
        w[2] += v[2];
    };
    const heaviest = (list: string): [number, number, number] =>
        splitTop(list)
            .map(weightOf)
            .reduce((m, v) => (compare(v, m) > 0 ? v : m), [0, 0, 0] as [number, number, number]);
    let i = 0;
    const text = selector.trim();
    const parens = (from: number): [string, number] => {
        let depth = 0;
        for (let j = from; j < text.length; j += 1) {
            if (text[j] === '(') depth += 1;
            else if (text[j] === ')' && --depth === 0) return [text.slice(from + 1, j), j + 1];
        }
        return [text.slice(from + 1), text.length];
    };
    while (i < text.length) {
        const c = text[i]!;
        if (c === '#') {
            w[0] += 1;
            i = ident(text, i + 1);
        } else if (c === '.') {
            w[1] += 1;
            i = ident(text, i + 1);
        } else if (c === '[') {
            w[1] += 1;
            i = text.indexOf(']', i) + 1;
        } else if (c === ':' && text[i + 1] === ':') {
            w[2] += 1;
            i = ident(text, i + 2);
            if (text[i] === '(') i = parens(i)[1];
        } else if (c === ':') {
            const end = ident(text, i + 1);
            const name = text.slice(i + 1, end).toLowerCase();
            i = end;
            const arg = text[i] === '(' ? parens(i) : undefined;
            if (arg !== undefined) i = arg[1];
            if (name === 'where') continue;
            if (name === 'before' || name === 'after') {
                w[2] += 1;
            } else if (name === 'is' || name === 'not' || name === 'has') {
                add(heaviest(arg?.[0] ?? ''));
            } else if (/^nth-(last-)?child$/.test(name) && / of /.test(arg?.[0] ?? '')) {
                w[1] += 1;
                add(heaviest(arg![0].slice(arg![0].indexOf(' of ') + 4)));
            } else {
                w[1] += 1;
            }
        } else if (/[a-zA-Z]/.test(c)) {
            w[2] += 1;
            i = ident(text, i);
        } else {
            i += 1;
        }
    }
    return w;
}

function ident(text: string, from: number): number {
    let i = from;
    while (i < text.length && /[\w-]/.test(text[i]!)) i += 1;
    return i;
}

function splitTop(list: string): string[] {
    const out: string[] = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < list.length; i += 1) {
        if (list[i] === '(') depth += 1;
        else if (list[i] === ')') depth -= 1;
        else if (list[i] === ',' && depth === 0) {
            out.push(list.slice(start, i));
            start = i + 1;
        }
    }
    out.push(list.slice(start));
    return out.map((part) => part.trim()).filter(Boolean);
}

function compare(a: readonly number[], b: readonly number[]): number {
    return a[0]! - b[0]! || a[1]! - b[1]! || a[2]! - b[2]!;
}

describe('rural-rows-straighten-under-the-hand', () => {
    /**
     * Rural pins its rows a little crooked and straightens a row under the
     * hand (`:hover`, `.open`) by a later rule of the same weight. A shelf's
     * first child is its mark (step 8f1), so the tilt counts rows
     * `:nth-child(… of .item)` — and `of S` adds S's weight: written beside
     * a `.item` compound the tilt was (0,5,0) and outranked the straightening
     * (0,4,0), so a hovered row lifted and stayed crooked (the 8f1 critic's
     * item 1; `looks:diff` shoots at rest and could not see it). Every rule
     * that tilts a row must lose to every rule that straightens one: lighter,
     * or as heavy and earlier. Red on the (0,5,0) shape.
     */
    it('weighs selectors as Selectors 4 does', () => {
        expect(weightOf('.t-rural .items .item:hover')).toEqual([0, 4, 0]);
        expect(weightOf('.t-rural .items .item:nth-child(3n + 1)')).toEqual([0, 4, 0]);
        expect(weightOf('.t-rural .items .item:nth-child(3n + 1 of .item)')).toEqual([0, 5, 0]);
        expect(weightOf('.t-rural .items :nth-child(3n + 1 of .item)')).toEqual([0, 4, 0]);
        expect(weightOf('.t-neo header.stall-head::before')).toEqual([0, 2, 2]);
        expect(weightOf(':where(.a) .b:is(#x, .y)')).toEqual([1, 1, 0]);
        expect(weightOf('.a:not(.b, .c .d)')).toEqual([0, 3, 0]);
    });

    it('lets every straightening rule outrank every tilt, on the served Rural sheet', () => {
        const rural = SERVED.find((sheet) => sheet.path === 'src/ui/theme-rural.css')!;
        const css = rural.css.replace(/\/\*[\s\S]*?\*\//g, '');
        const tilts: { selector: string; at: number }[] = [];
        const straights: { selector: string; at: number }[] = [];
        for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
            const rotate = /(?:^|;)\s*rotate\s*:\s*([^;]+)/.exec(m[2]!)?.[1]?.trim();
            if (rotate === undefined) continue;
            for (const selector of splitTop(m[1]!.trim())) {
                if (!/\.items\b/.test(selector)) continue;
                if (/:nth-(last-)?child\(/.test(selector) && rotate !== '0deg') tilts.push({ selector, at: m.index! });
                if (/:hover|\.open\b/.test(selector) && rotate === '0deg') straights.push({ selector, at: m.index! });
            }
        }
        expect(tilts.length, 'the tilts were read').toBeGreaterThanOrEqual(2);
        expect(straights.length, 'the straightening was read').toBeGreaterThanOrEqual(2);
        for (const tilt of tilts) {
            for (const straight of straights) {
                const order = compare(weightOf(straight.selector), weightOf(tilt.selector));
                expect(order > 0 || (order === 0 && straight.at > tilt.at), `${straight.selector} outranks ${tilt.selector}`).toBe(true);
            }
        }
    });
});
