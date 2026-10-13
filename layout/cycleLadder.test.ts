// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { renderStall } from '../src/ui/render';
import { WALL_FIGURE_CEILINGS } from '../src/ui/window';
import { CANVAS_SCREENS, GEOMETRY_ONLY_SCREENS, SCREENS, STATE_SCREENS, handlers } from './fixtures';
import { deskWallScreens, wallScreens } from './screenSplit';

/** What one Cycle screen paints: its rail, its step and its figure's length as counted. */
type CycleRead = { screen: string; rail: 'listings' | 'quotes'; step: number; count: number; figure: string };

function cycleReads(): CycleRead[] {
    const out: CycleRead[] = [];
    for (const [screen, view] of Object.entries(SCREENS)) {
        if (view.window?.mode !== 'cycle') continue;
        const root = document.createElement('div');
        renderStall(root, view, handlers);
        const head = root.querySelector<HTMLElement>('.sw-strip .item-head');
        const figure = head?.querySelector<HTMLElement>('[data-role="price"], [data-role="seller-price"]');
        if (head === null || head === undefined || figure === null || figure === undefined) continue;
        const rail = figure.getAttribute('data-role') === 'price' ? 'listings' : 'quotes';
        const from = head.querySelector('.item-from') !== null;
        out.push({
            screen,
            rail,
            step: Number(head.getAttribute('data-wall-tier') ?? '0'),
            count: (figure.textContent ?? '').length + (from ? 2 : 0),
            figure: figure.textContent ?? '',
        });
    }
    return out;
}

describe('a-cycle-card-shows-every-digit-at-every-wall-size', () => {
    /**
     * The fixtures the probe's rule of this name reads (the Cycle card's
     * ladder, 2026-10-13): on both rails, every step of `WALL_FIGURE_CEILINGS`
     * at its widest figure — the step's ceiling as counted (a listing's
     * figure and two for its `from`), and on the last step the widest any
     * record can make: the eight-byte listing (28 as counted) and the
     * eight-byte XEC quote (30) — because a step's size is designed to hold
     * that figure, and a fixture under it would leave the size unproved.
     * Every one is measured on every wall pass: a wall screen (the tall
     * wall, the tablet, the short desk wall) and, where the desk pass does
     * not reach it by the canvas split, the desk wall pass's.
     */
    const reads = cycleReads();
    const widest = (rail: 'listings' | 'quotes', step: number): number =>
        step < WALL_FIGURE_CEILINGS.length ? WALL_FIGURE_CEILINGS[step]! : rail === 'listings' ? 28 : 30;

    it('paints every step at its widest figure on both rails', () => {
        const missing: string[] = [];
        for (const rail of ['listings', 'quotes'] as const) {
            for (let step = 0; step <= WALL_FIGURE_CEILINGS.length; step += 1) {
                const want = widest(rail, step);
                if (!reads.some((read) => read.rail === rail && read.step === step && read.count === want)) {
                    missing.push(`${rail} step ${step} at ${want}`);
                }
            }
        }
        expect(missing).toEqual([]);
        // The critic's own figures (round 4): a 6-character listing, an
        // 8- and a 9-character XEC quote, `$5.00` and `123,456.78 XEC`'s step.
        for (const figure of ['123.45', '1.23 XEC', '12.34 XEC', '$5.00']) {
            expect(reads.map((read) => read.figure), figure).toContain(figure);
        }
    });

    it('measures every Cycle screen on every wall pass, and samples the broken one', () => {
        const wall = new Set(wallScreens());
        const deskWall = new Set(deskWallScreens());
        for (const read of reads) {
            expect(wall.has(read.screen), `${read.screen} on the tall, tablet and short wall passes`).toBe(true);
            // At 1280x900: the desk pass by the canvas split, or the desk wall pass.
            expect(CANVAS_SCREENS.has(read.screen) === deskWall.has(read.screen), read.screen).toBe(true);
            expect(STATE_SCREENS.has(read.screen) || ['shop-window-cycle', 'shop-window-wall'].includes(read.screen), read.screen).toBe(true);
        }
        // The eight-byte listing as a page screen, on the contrast plan where it breaks.
        expect(reads.find((read) => read.screen === 'shop-window-cycle-longest-figure')?.count).toBe(28);
        expect(CANVAS_SCREENS.has('shop-window-cycle-longest-figure')).toBe(false);
        expect(GEOMETRY_ONLY_SCREENS.has('shop-window-cycle-longest-figure')).toBe(false);
    });
});
