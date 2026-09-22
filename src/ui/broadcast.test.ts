// @vitest-environment happy-dom
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import type { StallOffer, StallView, TokenMeta } from '../domain/state';
import {
    armTicker,
    broadcastCards,
    broadcastRail,
    broadcastStep,
    broadcastTurns,
    renderBroadcastView,
    resetTickerForTests,
    setTickerClock,
    tickerItems,
    tickerPages,
    tickerPassMs,
    TICKER_ITEMS_PER_PASS,
    TICKER_SPEED_PX_PER_S,
    TICKER_STILL_ITEMS,
} from './broadcast';
import * as copy from './copy';

const PUBKEY = '02' + 'ab'.repeat(32);
const ADDRESS = 'ecash:qpjq5v3d0wmxnamaw0kw4l3h8xr7l5dl2yjvrdd0dp';
const T = (n: number): string => n.toString(16).padStart(2, '0').repeat(32);

function offer(tokenId: string, sats: bigint): StallOffer {
    return {
        outpoint: { txid: '11'.repeat(32), outIdx: 0 },
        tokenId,
        variant: 'PARTIAL',
        atoms: 10n,
        askedAtoms: 10n,
        askedSats: sats,
        priceNanoSatsPerAtom: sats * 100_000_000n,
        blockHeight: 100,
    } as unknown as StallOffer;
}

function meta(tokenId: string, name: string): [string, TokenMeta] {
    return [
        tokenId,
        {
            tokenId,
            name,
            ticker: name.slice(0, 3).toUpperCase(),
            decimals: 0,
            tokenType: { protocol: 'SLP', type: 'SLP_TOKEN_TYPE_FUNGIBLE' },
        } as TokenMeta,
    ];
}

function tickerView(over: Partial<StallView> = {}, n = 3): StallView {
    const offers = Array.from({ length: n }, (_, i) => offer(T(i + 1), BigInt(100_000 + i * 100)));
    return {
        route: { kind: 'pubkey', pubkeyHex: PUBKEY },
        address: ADDRESS,
        overlay: { kind: 'idle' },
        fetch: { kind: 'offers', offers },
        tokens: new Map(Array.from({ length: n }, (_, i) => meta(T(i + 1), `Item ${i + 1}`))),
        stallName: 'Riverside Goods',
        broadcast: { preset: 'ticker', mode: 'fixed', transparent: false, cards: 'listings', side: 'right', edge: 'bottom' },
        broadcastState: 'live',
        ...over,
    } as unknown as StallView;
}

const QUOTE_A = { code: 'usd', exponent: 2, amount: 500n, surchargePct: 5 };

describe('the-ticker-is-a-bar-a-flag-and-the-shops-code', () => {
    /**
     * The design (`private/design/ticker-2026-09-21/`, owner-approved
     * 2026-09-21): one bar, the label plate at the exit end, the ribbon in a
     * clipping cell, the shop's own code as a plate at the bar's end — and
     * nothing a viewer could press, the overlay's standing contract.
     */
    it('paints the flag, the ribbon and the shop code, with no control and the shop link', () => {
        const root = renderBroadcastView(tickerView());
        expect(root.getAttribute('data-role')).toBe('broadcast');
        expect(root.getAttribute('data-preset')).toBe('ticker');
        expect(root.getAttribute('data-mode')).toBe('fixed');
        expect(root.getAttribute('data-side')).toBe('right');
        expect(root.getAttribute('data-edge')).toBe('bottom');
        expect(root.querySelector('.tk-lab .tk-brand')?.textContent).toBe(copy.BROADCAST_BRAND);
        expect(root.querySelector('.tk-lab [data-role="stall-name"]')?.textContent).toBe('Riverside Goods');
        expect(root.querySelector('[data-role="ticker-rail"]')?.textContent).toBe(copy.BROADCAST_TICKER_LISTINGS);
        expect(root.querySelector('.tk-clip')?.hasAttribute('data-ribbon')).toBe(true);
        const items = root.querySelectorAll('.tk-run .tk-it');
        expect(items).toHaveLength(3);
        expect(items[0]!.querySelector('.tk-n')?.textContent).toBe('Item 1');
        expect(items[0]!.querySelector('[data-role="price"]')?.textContent).toBe('1,000');
        expect(root.querySelector('.tk-qrp [data-role="qr"]')).not.toBeNull();
        expect(root.querySelector('.tk-qrp .bc-cap')?.textContent).toBe(copy.WINDOW_SCAN_SHOP);
        expect(root.querySelectorAll('button, a, input, select, textarea')).toHaveLength(0);
        expect(root.querySelector('.bc-head')).toBeNull();
    });

    it('mirrors the two placements onto the root and nothing else moves', () => {
        const root = renderBroadcastView(
            tickerView({ broadcast: { preset: 'ticker', mode: 'fixed', transparent: false, cards: 'listings', side: 'left', edge: 'top' } }),
        );
        expect(root.getAttribute('data-side')).toBe('left');
        expect(root.getAttribute('data-edge')).toBe('top');
        // The flag stays at the ribbon's start in the DOM; CSS orders the plate.
        expect(root.firstElementChild?.classList.contains('tk-bar')).toBe(true);
    });

    it('a quote item wears the chip beside its figure, the surcharge line and the words; the flag says what paying does', () => {
        const root = renderBroadcastView(
            tickerView({
                prices: new Map([[T(1), QUOTE_A]]),
                descriptions: new Map([[T(1), 'Half kilo of beans']]),
                broadcast: { preset: 'ticker', mode: 'fixed', transparent: false, cards: 'quotes', side: 'right', edge: 'bottom' },
            }),
        );
        expect(root.querySelector('[data-role="ticker-rail"]')?.textContent).toBe(copy.BROADCAST_TICKER_QUOTES_LINE);
        expect(copy.BROADCAST_TICKER_QUOTES_LINE).toContain(copy.BROADCAST_QUOTE_LINE);
        const item = root.querySelector('.tk-run .tk-it')!;
        expect(item.querySelector('[data-role="seller-price"]')?.textContent).toBe('$5.00');
        expect(item.querySelector('.tk-chip')?.textContent).toBe(copy.SELLER_QUOTE_CHIP);
        expect(item.querySelector('[data-role="quote-surcharge"]')?.textContent).toBe(copy.streamSurchargeLine(5));
        expect(item.querySelector('.tk-w')?.textContent).toBe('Half kilo of beans');
        expect(root.querySelector('[data-role="price"]')).toBeNull();
        // The code is the shop's, never the item's landing link.
        expect(root.querySelector('[data-role="qr"]')?.getAttribute('aria-label')).toBe(copy.SHARE_QR_ALT);
    });

    it('our failure paints the flag and the code alone; an empty book with nothing quoted says so once', () => {
        const failed = renderBroadcastView(tickerView({ fetch: { kind: 'unreachable', triedAtMs: 0, hosts: [] } }));
        expect(failed.querySelector('.tk-run')).toBeNull();
        expect(failed.querySelector('.tk-empty')).toBeNull();
        expect(failed.querySelector('[data-role="qr"]')).not.toBeNull();
        const empty = renderBroadcastView(tickerView({ fetch: { kind: 'empty' } }));
        expect(empty.querySelector('.tk-run')).toBeNull();
        expect(empty.querySelector('.tk-empty')?.textContent).toBe(copy.BROADCAST_EMPTY);
        const stale = renderBroadcastView(tickerView({ broadcastState: 'stale' }));
        expect(stale.getAttribute('data-state')).toBe('stale');
    });

    it('a pinned ribbon is still at its offset; a reduced-motion ribbon is still and pages', () => {
        const pinned = renderBroadcastView(tickerView({ broadcastTickerAt: -260 }));
        const run = pinned.querySelector<HTMLElement>('.tk-run')!;
        expect(run.classList.contains('still')).toBe(true);
        expect(run.style.transform).toBe('translateX(-260px)');
        const still = renderBroadcastView(tickerView({ broadcastTickerStill: true }, 5));
        expect(still.querySelector('.tk-run')?.classList.contains('still')).toBe(true);
        expect(still.querySelectorAll('.tk-it')).toHaveLength(TICKER_STILL_ITEMS);
        expect(TICKER_STILL_ITEMS, 'a still page is one item: a layout with a width budget').toBe(1);
        // The cell says which of the three it is, because the probe's
        // sideways exemption applies to a moving or pinned ribbon and never
        // to a still page, which is a layout.
        expect(renderBroadcastView(tickerView()).querySelector('.tk-clip')?.getAttribute('data-ribbon')).toBe('moving');
        expect(pinned.querySelector('.tk-clip')?.getAttribute('data-ribbon')).toBe('pinned');
        expect(still.querySelector('.tk-clip')?.getAttribute('data-ribbon')).toBe('still');
    });
});

describe('a-ticker-pass-carries-at-most-eight-items-and-the-rest-come-next', () => {
    it('pages the cards by the pass size, and the cursor is the page', () => {
        expect(TICKER_ITEMS_PER_PASS).toBe(8);
        expect(tickerPages(0, false)).toBe(1);
        expect(tickerPages(8, false)).toBe(1);
        expect(tickerPages(9, false)).toBe(2);
        expect(tickerPages(9, true)).toBe(9);
        const view = tickerView({}, 10);
        expect(tickerItems(view).map((c) => c.tokenId)).toEqual(Array.from({ length: 8 }, (_, i) => T(i + 1)));
        expect(tickerItems({ ...view, broadcastCursor: 1 }).map((c) => c.tokenId)).toEqual([T(9), T(10)]);
        expect(tickerItems({ ...view, broadcastCursor: 2 }).map((c) => c.tokenId)).toEqual(Array.from({ length: 8 }, (_, i) => T(i + 1)));
    });
});

describe('cards-all-takes-turns-and-an-empty-rail-turns-itself-off', () => {
    /**
     * One rail per pass (or per card), the turn at the wrap — the shop
     * window's `nextCard`, on the stream. The rail is explicit state on the
     * view, never inferred from the cursor.
     */
    const both = (over: Partial<StallView> = {}): StallView =>
        tickerView({
            prices: new Map([[T(1), QUOTE_A]]),
            broadcast: { preset: 'ticker', mode: 'fixed', transparent: false, cards: 'all', side: 'right', edge: 'bottom' },
            ...over,
        });

    it('reads the explicit rail, turns at the wrap, and never turns onto an empty rail', () => {
        expect(broadcastRail(both())).toBe('listings');
        expect(broadcastRail(both({ broadcastRail: 'quotes' }))).toBe('quotes');
        expect(broadcastTurns(both())).toBe(true);
        expect(broadcastStep(both(), 0, 1)).toEqual({ cursor: 0, rail: 'quotes' });
        expect(broadcastStep(both({ broadcastRail: 'quotes' }), 0, 1)).toEqual({ cursor: 0, rail: 'listings' });
        expect(broadcastStep(both(), 0, 3)).toEqual({ cursor: 1, rail: 'listings' });
        // Nothing quoted: `all` stays on the listings and never turns.
        const noQuotes = both({ prices: new Map(), broadcastRail: 'quotes' });
        expect(broadcastRail(noQuotes)).toBe('listings');
        expect(broadcastTurns(noQuotes)).toBe(false);
        expect(broadcastStep(noQuotes, 0, 1)).toEqual({ cursor: 0, rail: 'listings' });
        // Nothing listed: the quotes, and no turn.
        const noListings = both({ fetch: { kind: 'empty' } });
        expect(broadcastRail(noListings)).toBe('quotes');
        expect(broadcastCards(noListings).map((c) => c.kind)).toEqual(['quote']);
    });

    it('cards=quotes and cards=listings are what they were', () => {
        expect(broadcastRail(tickerView())).toBe('listings');
        expect(broadcastRail(both({ broadcast: { preset: 'corner', mode: 'fixed', transparent: false, cards: 'quotes', side: 'right', edge: 'bottom' } }))).toBe('quotes');
        expect(broadcastStep(tickerView(), 2, 3)).toEqual({ cursor: 0, rail: 'listings' });
    });
});

describe('the-ribbons-pass-is-measured-and-continued-across-a-repaint', () => {
    /**
     * The pace is one number (90 px/s, the stream marquee's words pace);
     * the pass is the cell's width plus the ribbon's at that pace; a repaint
     * of the same pass continues it by a negative delay, a new pass starts
     * from the right, and the wrap restarts the same pass.
     */
    beforeEach(() => {
        resetTickerForTests();
    });

    function fakeWidths(root: HTMLElement, clipPx: number, runPx: number): void {
        const clip = root.querySelector<HTMLElement>('.tk-clip')!;
        const run = root.querySelector<HTMLElement>('.tk-run')!;
        clip.getBoundingClientRect = () => ({ width: clipPx, height: 80, x: 0, y: 0, top: 0, left: 0, right: clipPx, bottom: 80, toJSON: () => ({}) });
        run.getBoundingClientRect = () => ({ width: runPx, height: 80, x: 0, y: 0, top: 0, left: 0, right: runPx, bottom: 80, toJSON: () => ({}) });
    }

    it('computes the pass from the widths at the design pace and keeps the phase', () => {
        expect(TICKER_SPEED_PX_PER_S).toBe(90);
        expect(tickerPassMs(1550, 2400)).toBe(Math.round((3950 / 90) * 1000));
        let now = 10_000;
        setTickerClock(() => now);
        const root = renderBroadcastView(tickerView());
        fakeWidths(root, 1550, 2400);
        const ms = armTicker(root);
        expect(ms).toBe(tickerPassMs(1550, 2400));
        const run = root.querySelector<HTMLElement>('.tk-run')!;
        expect(run.style.getPropertyValue('--tk-clip')).toBe('1550px');
        expect(run.style.getPropertyValue('--tk-run')).toBe('2400px');
        expect(run.style.getPropertyValue('--tk-ms')).toBe(`${ms}ms`);
        expect(run.style.getPropertyValue('--tk-delay')).toBe('-0ms');
        // A repaint 5 s in continues the same pass.
        now += 5_000;
        const again = renderBroadcastView(tickerView());
        fakeWidths(again, 1550, 2400);
        armTicker(again);
        expect(again.querySelector<HTMLElement>('.tk-run')!.style.getPropertyValue('--tk-delay')).toBe('-5000ms');
        // A different page is a new pass from the right.
        const next = renderBroadcastView(tickerView({ broadcastCursor: 1 }, 10));
        fakeWidths(next, 1550, 2400);
        armTicker(next);
        expect(next.querySelector<HTMLElement>('.tk-run')!.style.getPropertyValue('--tk-delay')).toBe('-0ms');
    });

    it('a still ribbon arms nothing', () => {
        const root = renderBroadcastView(tickerView({ broadcastTickerStill: true }));
        fakeWidths(root, 1550, 2400);
        expect(armTicker(root)).toBe(0);
    });
});

describe('only-the-ticker-cell-carries-data-ribbon', () => {
    /**
     * `cutSideways` switches itself off for any protected box under a
     * `[data-ribbon]` cell, and the contrast sampler re-parents its box to
     * that cell. A guard one attribute away from being switched off anywhere
     * costs a test: the attribute is written in one place, `renderTicker`,
     * and nowhere else in the app's source.
     */
    it('is written once, in the ticker renderer', () => {
        const dir = join(import.meta.dirname, '..');
        const hits: string[] = [];
        for (const sub of ['ui', 'domain', 'net']) {
            for (const name of readdirSync(join(dir, sub))) {
                if (!name.endsWith('.ts') || name.endsWith('.test.ts')) {
                    continue;
                }
                const text = readFileSync(join(dir, sub, name), 'utf8');
                const n = text.split("'data-ribbon'").length - 1;
                if (n > 0) {
                    hits.push(`${sub}/${name}:${n}`);
                }
            }
        }
        expect(hits).toEqual(['ui/broadcast.ts:1']);
    });
});
