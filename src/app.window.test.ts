// @vitest-environment happy-dom
import { encodeCashAddress } from 'ecashaddrjs';
import { shaRmd160, toHex } from 'ecash-lib';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { stallPath } from './domain/route';
import type { StallView, TokenMeta } from './domain/state';

/*
 * The shop window's three timers, in their OWN file.
 *
 * They were written into `app.live.test.ts`, which already has the harness —
 * and the full suite then went red in `the-pay-sheet-asks-both-feeds`, twice,
 * on two different cases, while that file alone stayed green and HEAD without
 * these tests stayed green. Three `boot()` calls under fake timers leave a
 * context the neighbours in that file evidently share. Rather than chase it,
 * they live here: vitest isolates by file, and a timer test that destabilises
 * the money tests is worse than no timer test.
 *
 * The mocks are the minimum `boot` needs when it is handed its own loader:
 * nothing here reaches the network, and the socket is a no-op handle.
 */
vi.mock('./net', async (importOriginal) => {
    const real = await importOriginal<typeof import('./net')>();
    return {
        ...real,
        createChronik: () => ({}) as never,
        agoraOfferReader: () => ({}) as never,
        loadOffers: async () => ({ kind: 'empty' as const }),
    };
});

vi.mock('./net/live', async (importOriginal) => {
    const real = await importOriginal<typeof import('./net/live')>();
    return {
        ...real,
        watchStall: () => ({
            close: () => undefined,
            pause: () => undefined,
            resume: () => undefined,
        }),
    };
});

const { boot } = await import('./app');
const { WINDOW_BEAT_MS, WINDOW_CARD_MS, WINDOW_IDLE_MS, WINDOW_SCROLL_MS } = await import('./app');

const PK_BYTES = (() => {
    const bytes = new Uint8Array(33);
    bytes[0] = 2;
    bytes.fill(0x11, 1);
    return bytes;
})();
const PK = toHex(PK_BYTES);
const HASH = shaRmd160(PK_BYTES);
const ADDR = encodeCashAddress('ecash', 'p2pkh', HASH);
const TOKEN = 'ab'.repeat(32);
const OFFER = {
    outpoint: { txid: 'de'.repeat(32), outIdx: 1 },
    tokenId: TOKEN,
    atoms: 12n,
    variant: 'PARTIAL' as const,
    askedSats: 120_000n,
    askedAtoms: 1n,
};
const TOKEN_META: TokenMeta = {
    tokenId: TOKEN,
    name: 'Ripe Beans',
    ticker: 'RB',
    decimals: 0,
};

/*
 * The shop window drives itself, and until now nothing had watched it do so.
 * Both reviews of this feature named the same gap twice: three timers, zero
 * observations. These drive them.
 */
describe('a-shop-window-advances-and-re-reads-without-a-visit', () => {
    const SECOND = TOKEN.slice(0, 62) + 'ff';
    const WINDOW_OFFERS = [
        OFFER,
        { ...OFFER, outpoint: { txid: 'ab'.repeat(32), outIdx: 0 }, tokenId: SECOND },
    ];
    const WINDOW_TOKENS = new Map<string, TokenMeta>([
        [TOKEN, TOKEN_META],
        [SECOND, { ...TOKEN_META, tokenId: SECOND, name: 'Second Thing', ticker: 'ST' }],
    ]);

    /**
     * A loader handed to `boot` answers directly, so it never passes through
     * `withUrlParams` — the params go on the view, the way the broadcast
     * fixtures in this file already do.
     */
    function windowState(mode: 'cycle' | 'browse'): { view: StallView; offers: typeof WINDOW_OFFERS } {
        return {
            view: {
                route: { kind: 'pubkey' as const, pubkeyHex: PK, address: ADDR },
                fetch: { kind: 'offers' as const, offers: WINDOW_OFFERS },
                overlay: { kind: 'idle' as const },
                address: ADDR,
                stallName: 'Riverside Goods',
                tokens: WINDOW_TOKENS,
                window: { show: 'listings' as const, mode, payCode: true },
            },
            offers: WINDOW_OFFERS,
        };
    }

    const shown = (root: HTMLElement): string =>
        root.querySelector('[data-role="shop-window"] .item-n')?.textContent ?? '';

    afterEach(() => {
        vi.useRealTimers();
    });

    /**
     * Twenty seconds, not the stream's eight: a customer notices the item,
     * gets a phone out, unlocks it and aims, and a card that changed halfway
     * leaves them pointing at a different item's code.
     */
    it('turns the card on its own clock', async () => {
        vi.useFakeTimers();
        window.history.replaceState(null, '', `${stallPath(ADDR)}?view=window&mode=cycle`);
        const root = document.createElement('div');
        boot(root, async () => windowState('cycle'));
        await vi.advanceTimersByTimeAsync(0);

        const first = shown(root);
        expect(first, 'a card is on the wall').not.toBe('');
        // Well short of the dwell: a card that moves here is a card a customer
        // was still aiming at.
        await vi.advanceTimersByTimeAsync(WINDOW_CARD_MS - 1_000);
        expect(shown(root), 'the card holds for its whole dwell').toBe(first);
        await vi.advanceTimersByTimeAsync(2_000);
        expect(shown(root), 'and then it turns').not.toBe(first);
    });

    /**
     * The heartbeat, and the thing it must NOT do while it runs.
     *
     * `chronik-client` sends no ping, so a half-open socket fires no `close`
     * and `onReconnect` never runs; `visibilitychange` — the one recovery path
     * that saves every other surface — never fires on a kiosk. So the window
     * re-reads on a clock. And `refresh()` opens by painting `opening`, which
     * on a wall meant losing the seller's name and every row once a minute.
     */
    it('re-reads on its own, and never blanks the wall doing it', async () => {
        vi.useFakeTimers();
        window.history.replaceState(null, '', `${stallPath(ADDR)}?view=window&mode=cycle`);
        let loads = 0;
        const root = document.createElement('div');
        // A SLOW loader, deliberately: the blank this guards against lives
        // between `refresh()`'s first repaint and the load landing, so a
        // loader that answers instantly hides it behind the microtask queue.
        // A real one waits on three hosts.
        const SLOW = 5_000;
        boot(root, async () => {
            loads += 1;
            await new Promise((done) => setTimeout(done, SLOW));
            return windowState('cycle');
        });
        await vi.advanceTimersByTimeAsync(SLOW);
        expect(loads).toBe(1);
        expect(root.querySelector('.stall-name')?.textContent).toBe('Riverside Goods');

        await vi.advanceTimersByTimeAsync(WINDOW_BEAT_MS);
        expect(loads, 'the wall read the chain again with nobody there').toBe(2);
        // MID-LOAD, which is the whole point. `refresh()` opens by painting
        // `opening` — no name, no look, no rows — and on a wall that meant
        // losing the shop for the length of every read, once a minute.
        expect(
            root.querySelector('.stall-name')?.textContent,
            'and kept the seller’s name while it was reading',
        ).toBe('Riverside Goods');
        expect(
            root.querySelector('[data-role="shop-window"] .item-n')?.textContent ?? '',
            'and kept the goods',
        ).not.toBe('');

        await vi.advanceTimersByTimeAsync(SLOW);
        expect(root.querySelector('.stall-name')?.textContent).toBe('Riverside Goods');
    });

    /**
     * `browse` yields to a person and takes the screen back when they leave.
     * `mousemove` is deliberately not a touch — a customer brushing the desk
     * must not stop a screen for good.
     */
    it('stops scrolling itself when somebody touches it', async () => {
        vi.useFakeTimers();
        window.history.replaceState(null, '', `${stallPath(ADDR)}?view=window&mode=browse`);
        const root = document.createElement('div');
        boot(root, async () => windowState('browse'));
        await vi.advanceTimersByTimeAsync(0);
        const strip = root.querySelector('.sw-strip') as HTMLElement | null;
        expect(strip, 'browse paints a strip').not.toBeNull();

        let scrolls = 0;
        strip!.scrollBy = () => {
            scrolls += 1;
        };
        // happy-dom lays nothing out, so the strip reports no room to scroll
        // and `rollWindow` takes its rail-turn branch instead. What is being
        // observed here is the TIMER and the touch gate, not the geometry.
        Object.defineProperty(strip!, 'scrollHeight', { value: 4_000, configurable: true });
        Object.defineProperty(strip!, 'clientHeight', { value: 800, configurable: true });

        await vi.advanceTimersByTimeAsync(WINDOW_SCROLL_MS * 2);
        expect(scrolls, 'it scrolls itself while nobody is there').toBeGreaterThan(0);

        const before = scrolls;
        document.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
        await vi.advanceTimersByTimeAsync(WINDOW_SCROLL_MS * 3);
        expect(scrolls, 'and yields the moment somebody touches it').toBe(before);

        // The heartbeat rebuilds the tree once a minute, so the stub has to be
        // put back on whatever strip is on screen now — which is also a small
        // proof that the wall survived the re-read with a strip to scroll.
        await vi.advanceTimersByTimeAsync(WINDOW_IDLE_MS);
        const after = root.querySelector('.sw-strip') as HTMLElement | null;
        expect(after, 'the wall still has a strip after the beat').not.toBeNull();
        after!.scrollBy = () => {
            scrolls += 1;
        };
        Object.defineProperty(after!, 'scrollHeight', { value: 4_000, configurable: true });
        Object.defineProperty(after!, 'clientHeight', { value: 800, configurable: true });
        await vi.advanceTimersByTimeAsync(WINDOW_SCROLL_MS * 2);
        expect(scrolls, 'then takes the screen back').toBeGreaterThan(before);
    });
});
