// @vitest-environment happy-dom
/**
 * The stream card's money tiers, painted (the lint-belts critic's fifth and
 * sixth reviews, ranked item 1). `[data-tier]` on the card's price row sizes
 * the figure the stream shows, and a look may match `[data-tier='2']`; the
 * fixtures that painted a card painted tiers 1 and 3 only. The ladder counts
 * the figure's characters and 2 for `from` (`priceTier`) against the look's
 * own `overlayTierCeilings` (Modern, Neo and the skeleton 5, 7, 9; Rural
 * 8, 10, 12), so two cards between the old ones — `from 123,456` and
 * `from 1,234,567` — put tier 2 on every look and tier 1 on Rural. **The
 * quote card wears the same ladder** under `[data-role='seller-price']`, and
 * every quote fixture painted tier 0 (the sixth review): an XEC quote of 7,
 * 9, 11 and 13 characters puts tiers 1, 2 and 3 on every look. The runner
 * owes the canvas pass the same, per rail (`STREAM_TIERS_OWED`,
 * `scripts/probe-coverage.mjs`, pinned by value there); this holds what the
 * fixtures paint, by value, without a browser.
 */
import { describe, expect, it } from 'vitest';
import { renderStall } from '../src/ui/render';
import { CANVAS_SCREENS, GEOMETRY_ONLY_SCREENS, NO_DECOR_SCREENS, SCREENS, handlers } from './fixtures';
import { measuredLooks, paintView } from './looks';

const CLASSES = ['t-modern', 't-neo', 't-rural', 't-skeleton'] as const;
const QUOTE_SCREENS = ['broadcast-quote-7', 'broadcast-quote-9', 'broadcast-quote-11', 'broadcast-quote-13'] as const;

type Rail = 'listings' | 'quotes';
/** The role of the figure each rail's price row holds. */
const ROLE: Record<Rail, string> = { listings: 'price', quotes: 'seller-price' };

/** The tier each card's price row on a rail wears on a look: `data-tier`, or `0` where the row has none. */
function tiersOn(screen: string, cls: string, rail: Rail = 'listings'): string[] {
    const look = measuredLooks().find((l) => l.theme.sheetClass === cls)!;
    const root = document.createElement('div');
    root.id = 'app';
    document.body.append(root);
    renderStall(root, paintView(SCREENS[screen]!, look, []), handlers);
    const tiers = [...root.querySelectorAll('.bc-item .bc-p')]
        .filter((row) => row.querySelector(`[data-role="${ROLE[rail]}"]`) !== null)
        .map((row) => row.getAttribute('data-tier') ?? '0');
    root.remove();
    return tiers;
}

describe('the-stream-card-is-painted-at-tiers-one-and-two', () => {
    it('paints from 123,456 at tier 2 and from 1,234,567 at tier 3, and Rural one tier lower (its ladder is 8, 10, 12)', () => {
        expect(Object.fromEntries(CLASSES.map((cls) => [cls, tiersOn('broadcast-from-123456', cls)]))).toEqual({
            't-modern': ['2'],
            't-neo': ['2'],
            't-rural': ['1'],
            't-skeleton': ['2'],
        });
        expect(Object.fromEntries(CLASSES.map((cls) => [cls, tiersOn('broadcast-from-1234567', cls)]))).toEqual({
            't-modern': ['3'],
            't-neo': ['3'],
            't-rural': ['2'],
            't-skeleton': ['3'],
        });
    });

    it('puts tier 2 on every look and tier 1 on Rural, with the older cards, and the runner owes exactly that', () => {
        const owed: Record<string, string[]> = { 't-modern': ['2'], 't-neo': ['2'], 't-rural': ['1', '2'], 't-skeleton': ['2'] };
        for (const cls of CLASSES) {
            const painted = new Set(
                ['broadcast', 'broadcast-clear', 'broadcast-from-123456', 'broadcast-from-1234567'].flatMap((screen) => tiersOn(screen, cls)),
            );
            for (const tier of owed[cls]!) expect(painted.has(tier), `${cls} paints tier ${tier}`).toBe(true);
        }
    });

    it('paints tier 3 alone with the older cards, so the tiers below it come from these two fixtures and from nothing else (Rural\'s tiers 1 and 2 included)', () => {
        for (const cls of CLASSES) {
            const older = new Set(['broadcast', 'broadcast-clear'].flatMap((screen) => tiersOn(screen, cls)));
            expect([...older], `${cls}: the older cards`).toEqual(['3']);
        }
    });

    it('are canvas screens that wear no decoration and are sampled for geometry only', () => {
        for (const screen of ['broadcast-from-123456', 'broadcast-from-1234567', ...QUOTE_SCREENS]) {
            expect(CANVAS_SCREENS.has(screen), `${screen} is a canvas screen`).toBe(true);
            expect(NO_DECOR_SCREENS.has(screen), `${screen} wears no decoration`).toBe(true);
            expect(GEOMETRY_ONLY_SCREENS.has(screen), `${screen} is geometry only`).toBe(true);
        }
    });
});

describe('the-quote-card-is-painted-at-tiers-one-two-and-three', () => {
    it('paints an XEC quote of 7, 9, 11 and 13 characters at the tiers each look\'s ladder gives it (Rural\'s is 8, 10, 12)', () => {
        const painted = (screen: string) => Object.fromEntries(CLASSES.map((cls) => [cls, tiersOn(screen, cls, 'quotes')]));
        // `123 XEC`: tier 1 on 5, 7, 9; Rural's first step is 8, so it has none.
        expect(painted('broadcast-quote-7')).toEqual({ 't-modern': ['1'], 't-neo': ['1'], 't-rural': ['0'], 't-skeleton': ['1'] });
        expect(painted('broadcast-quote-9')).toEqual({ 't-modern': ['2'], 't-neo': ['2'], 't-rural': ['1'], 't-skeleton': ['2'] });
        expect(painted('broadcast-quote-11')).toEqual({ 't-modern': ['3'], 't-neo': ['3'], 't-rural': ['2'], 't-skeleton': ['3'] });
        expect(painted('broadcast-quote-13')).toEqual({ 't-modern': ['3'], 't-neo': ['3'], 't-rural': ['3'], 't-skeleton': ['3'] });
    });

    it('counts a quote card on the quotes rail alone: a listing card is not a quote, and a quote card is not a listing', () => {
        for (const cls of CLASSES) {
            for (const screen of QUOTE_SCREENS) {
                expect(tiersOn(screen, cls, 'quotes'), `${screen} on ${cls} paints one quote card`).toHaveLength(1);
                expect(tiersOn(screen, cls, 'listings'), `${screen} on ${cls} paints no listing card`).toEqual([]);
            }
            expect(tiersOn('broadcast-from-123456', cls, 'quotes'), `a listing fixture on ${cls} paints no quote card`).toEqual([]);
        }
    });

    it('puts tiers 1, 2 and 3 on every look, and the runner owes exactly that', () => {
        for (const cls of CLASSES) {
            const painted = new Set(QUOTE_SCREENS.flatMap((screen) => tiersOn(screen, cls, 'quotes')));
            for (const tier of ['1', '2', '3']) expect(painted.has(tier), `${cls} paints quote tier ${tier}`).toBe(true);
        }
    });
});
