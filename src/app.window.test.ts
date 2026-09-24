// @vitest-environment happy-dom
import { encodeCashAddress } from 'ecashaddrjs';
import { shaRmd160, toHex } from 'ecash-lib';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseWindowParams, stallPath } from './domain/route';
import type { StallView, TokenMeta } from './domain/state';

/*
 * The shop window's three timers, in their OWN file.
 *
 * They were written into `app.live.test.ts`, which already has the harness —
 * and the full suite then went red in `the-pay-sheet-asks-both-feeds` (since
 * renamed `the-pay-sheet-asks-one-feed-while-the-check-is-paused`), twice,
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
const { PAY_RATE_MAX_AGE_MS } = await import('./ui/render');
const { BROADCAST_FIXED_MS, WINDOW_BEAT_MS, WINDOW_CARD_MS, WINDOW_IDLE_MS, WINDOW_SCROLL_MS } =
    await import('./app');

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
                window: { show: 'listings' as const, mode, payCode: true, turn: 'none', touch: false as const },
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
     * The magnitudes themselves, by value (2026-09-20).
     *
     * Every timing test in this file derives its expectation from the symbol
     * it is testing — `advanceTimersByTimeAsync(WINDOW_CARD_MS - 1_000)` —
     * so the rule each docblock states held at any number at all. Measured:
     * `WINDOW_CARD_MS` changed from 20,000 to 2,000 leaves `pnpm test` green
     * at 1,385 passes, `pnpm build` green, and the probe untouched because it
     * imports `renderStall` and never `boot`. A card that turns in two
     * seconds is the exact failure the constant exists to prevent, on an
     * unattended screen where nobody can report it.
     *
     * The stream's side is already pinned this way — `the-carousel-waits-for-
     * the-run-then-five-seconds` uses the literal `1_500 + 10_000 + 1_500`.
     * This is that, for the wall.
     *
     * These are the owner's rulings, not measurements: changing one is a
     * decision, and this is what makes it look like one.
     */
    it('holds the owner’s own magnitudes', () => {
        // A customer notices the item, gets a phone out, unlocks it, opens a
        // camera and aims. Deliberately the slowest thing on this screen, and
        // deliberately not the stream's dwell.
        expect(WINDOW_CARD_MS).toBe(20_000);
        expect(WINDOW_CARD_MS).toBeGreaterThan(BROADCAST_FIXED_MS);
        // The floor under a socket that died without saying so, on a screen
        // no `visibilitychange` ever rescues.
        expect(WINDOW_BEAT_MS).toBe(60_000);
        // Yielding to a person standing still and reading, not walking past.
        expect(WINDOW_IDLE_MS).toBe(45_000);
        /*
         * An ordering between the idle wait and the card dwell is
         * deliberately NOT pinned: the two govern different modes — the
         * dwell only in `cycle`, the idle wait only in the `browse` roll —
         * so they are never both in play on one screen, and an ordering
         * between them is a rule nobody wrote. A pin that would turn red for
         * a seller who wants a slower shop is a tax, not a guard.
         *
         * `WINDOW_SCROLL_MS` keeps a FLOOR rather than a value. The first
         * de-pinning cited its docblock as saying "a few seconds"; it does
         * not — that phrase is in `syncWindow`'s body, and it carries the
         * half that binds: "never a per-frame loop: this runs for hours on
         * whatever computer is behind a shop's television." A rule that is
         * written down needs a guard, and 4, 6 or 8 seconds all satisfy it
         * where 16 milliseconds does not (critic, 2026-09-20).
         */
        expect(WINDOW_SCROLL_MS).toBeGreaterThanOrEqual(1_000);
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
     * Whether this page is a wall is decided ONCE, for its whole life
     * (2026-09-20).
     *
     * The gate started as a predicate every reader asked at paint time. The
     * QA measured what that cost: `clearBroadcastTimers()` cleared the beat
     * and the beat's own `.finally` — whose guard is `view.window !==
     * undefined` — armed it straight back, so a narrowed desktop kept a full
     * `refresh()` and an ungated `paint()` every sixty seconds over an
     * ordinary stall, rebuilding a half-typed sheet. The critic named the
     * other half: crossing the floor UPWARD with a sheet open flipped
     * `holdsLivePaint` to false, and the next socket tick threw the
     * half-written record away — reachable by a rotation.
     *
     * Both are gone because nothing consults a live width any more. What
     * this pins is the two ends of that bargain: a page that booted narrow
     * is never a wall and arms no wall clock, and a page that booted wide
     * stays one even when the viewport changes under it. The second half is
     * the stated cost, not an oversight, so it is asserted rather than
     * left to be rediscovered as a bug.
     */
    const atWidth = async (px: number, run: () => Promise<void>): Promise<void> => {
        const had = Object.getOwnPropertyDescriptor(globalThis, 'innerWidth');
        Object.defineProperty(globalThis, 'innerWidth', { value: px, configurable: true });
        try {
            await run();
        } finally {
            // Restored in `finally`: a failure here used to leave every later
            // test in this file reading a phone's width.
            if (had === undefined) {
                delete (globalThis as { innerWidth?: number }).innerWidth;
            } else {
                Object.defineProperty(globalThis, 'innerWidth', had);
            }
        }
    };

    it('booted narrow, it is never a wall and arms no wall clock', async () => {
        await atWidth(390, async () => {
            vi.useFakeTimers();
            window.history.replaceState(null, '', `${stallPath(ADDR)}?view=window&mode=cycle`);
            let loads = 0;
            const root = document.createElement('div');
            boot(root, async () => {
                loads += 1;
                return windowState('cycle');
            });
            await vi.advanceTimersByTimeAsync(0);
            expect(
                root.querySelector('[data-role="shop-window"]'),
                'a phone gets the ordinary stall',
            ).toBeNull();
            expect(loads).toBe(1);

            // No beat, no card timer, no roll: the wall's clocks belong to
            // the wall, and this is not one. The timer COUNT, not just the
            // load count — `loads` alone proves the beat and says nothing
            // about `windowCard`, which calls `paint()` rather than the
            // loader, or about `windowRoll` (critic, 2026-09-20).
            expect(vi.getTimerCount(), 'no wall clock was armed at all').toBe(0);
            await vi.advanceTimersByTimeAsync(WINDOW_BEAT_MS * 3);
            expect(loads, 'nothing re-read on a wall clock').toBe(1);
        });
    });

    it('a phone is not a wall on either axis, turned or not', async () => {
        /*
         * The floor is on the SHORT painted axis, and this is the guard it
         * did not have: reverting the branch to a plain `innerWidth` test
         * left the whole suite green (QA, 2026-09-20).
         *
         * Two directions, both of which a phone can reach:
         *  - held LANDSCAPE, 844x390, a plain window link. A width test
         *    passes 844 and paints the wall layout into a 390-tall frame.
         *    This hole predates the round.
         *  - held PORTRAIT, 390x844, a `turn=cw` link. `window.css` sizes a
         *    turned frame `100vh x 100vw`, so the painted box is 844 wide by
         *    390 TALL. A reviewer proposed asserting this one IS a wall; the
         *    arithmetic says otherwise and is why it is here: at a container
         *    height of 390 the code is `clamp(280px, 33cqh, 360px)` = 280
         *    (72% of the frame) and the tile `clamp(200px, 34cqh, 460px)` =
         *    200 (51%), leaving 110px for the sign, the row and the status
         *    bar — clipped in silence by `overflow: hidden`.
         *
         * `min` of the two axes is the turn-independent form of "a phone is
         * not a wall", which is a statement about the short side.
         */
        const sizes = async (w: number, h: number, search: string): Promise<boolean> => {
            const hadW = Object.getOwnPropertyDescriptor(globalThis, 'innerWidth');
            const hadH = Object.getOwnPropertyDescriptor(globalThis, 'innerHeight');
            Object.defineProperty(globalThis, 'innerWidth', { value: w, configurable: true });
            Object.defineProperty(globalThis, 'innerHeight', { value: h, configurable: true });
            try {
                vi.useFakeTimers();
                window.history.replaceState(null, '', `${stallPath(ADDR)}${search}`);
                const root = document.createElement('div');
                boot(root, async () => windowState('cycle'));
                await vi.advanceTimersByTimeAsync(0);
                return root.querySelector('[data-role="shop-window"]') !== null;
            } finally {
                for (const [key, had] of [
                    ['innerWidth', hadW],
                    ['innerHeight', hadH],
                ] as const) {
                    if (had === undefined) {
                        delete (globalThis as Record<string, unknown>)[key];
                    } else {
                        Object.defineProperty(globalThis, key, had);
                    }
                }
            }
        };

        expect(
            await sizes(844, 390, '?view=window&mode=cycle'),
            'a phone held landscape is not a wall',
        ).toBe(false);
        expect(
            await sizes(390, 844, '?view=window&mode=cycle&turn=cw'),
            'nor turned: the painted frame is 390 tall',
        ).toBe(false);
        expect(
            await sizes(390, 844, '?view=window&mode=cycle&turn=ccw'),
            'the other direction paints the same box',
        ).toBe(false);
        // And the screens this feature is for are untouched, both ways up.
        expect(await sizes(1920, 1080, '?view=window&mode=cycle'), 'a television').toBe(true);
        expect(
            await sizes(1080, 1920, '?view=window&mode=cycle&turn=cw'),
            'one hung on its side',
        ).toBe(true);
        expect(await sizes(768, 1024, '?view=window&mode=cycle'), 'a counter tablet').toBe(true);
    });

    it('an unreadable link arms no wall clock', async () => {
        /*
         * The route terms, which a hand-gathered guard dropped along with the
         * width (QA, measured: four loads where there should be one).
         *
         * `withUrlParams` returns early only for `home`, so an `invalid`
         * route keeps `view.window` — and `syncWindow`, asking a width test
         * of its own instead of `shopWindowPaints`, armed the beat and the
         * card timer over a screen that says "this link is unreadable". A
         * full `refresh()` every sixty seconds and a `paint()` every twenty,
         * for ever, on a page that never changes.
         */
        await atWidth(1280, async () => {
            vi.useFakeTimers();
            window.history.replaceState(null, '', '/s/notanaddress?view=window&mode=cycle');
            let loads = 0;
            const root = document.createElement('div');
            boot(root, async () => {
                loads += 1;
                return {
                    view: {
                        route: { kind: 'invalid' as const, raw: '/s/notanaddress' },
                        overlay: { kind: 'idle' as const },
                        tokens: new Map(),
                        window: { show: 'listings' as const, mode: 'cycle' as const, payCode: true, turn: 'none', touch: false as const },
                    },
                    offers: [],
                } as unknown as ReturnType<typeof windowState>;
            });
            await vi.advanceTimersByTimeAsync(0);
            expect(loads).toBe(1);
            // The timer COUNT as well: `loads` proves the beat and says
            // nothing about the card timer, which calls `paint()` — and the
            // docblock above names both. Its sibling got this line in the
            // same commit and this test did not (QA + critic, 2026-09-20).
            expect(vi.getTimerCount(), 'no wall clock was armed at all').toBe(0);
            await vi.advanceTimersByTimeAsync(WINDOW_BEAT_MS * 3);
            expect(loads, 'an unreadable screen is not a wall and keeps no clock').toBe(1);
        });
    });

    it('booted wide, it stays a wall when the viewport changes under it', async () => {
        await atWidth(1280, async () => {
            vi.useFakeTimers();
            window.history.replaceState(null, '', `${stallPath(ADDR)}?view=window&mode=cycle`);
            const root = document.createElement('div');
            boot(root, async () => windowState('cycle'));
            await vi.advanceTimersByTimeAsync(0);
            expect(root.querySelector('[data-role="shop-window"]')).not.toBeNull();

            // The screen narrows — a rotation, or a window dragged in. The
            // stated cost: it keeps the wall until the next load, and that is
            // what stops a sheet being thrown away by a gesture.
            Object.defineProperty(globalThis, 'innerWidth', { value: 390, configurable: true });
            await vi.advanceTimersByTimeAsync(WINDOW_BEAT_MS);
            expect(
                root.querySelector('[data-role="shop-window"]'),
                'still the wall, by design',
            ).not.toBeNull();
        });
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

/**
 * "Pay several" on a touch wall (2026-09-21, the owner's ask; the design is
 * `private/design/touch-2026-09-21/`, T-A…T-E decided).
 *
 * The press is the sheets' own MOUNT path — clear the held rate, bump the
 * session, say "asking", paint, then read both feeds **in the seller's own
 * unit**, which is passed explicitly because the wall has no overlay for
 * `quoteUnitOnScreen` to read (the critic's P1-1). What it leaves behind is
 * a SNAPSHOT: the wall holds no paint, so a figure recomputed from the view
 * would move under a camera pointed at the code (P1-2).
 */
describe('the-wall-cycle-skips-an-unbuyable-listing', () => {
    /**
     * The owner, 2026-09-24: the Cycle card skips a listing nobody can take.
     * This drives the wall's own clock — the step is the driver's, and it
     * must count the list the painter paints (`wallListings`), or the cursor
     * lands on a slot the card no longer has.
     */
    const id = (c: string): string => c.repeat(64);
    const meta = (tokenId: string, name: string): TokenMeta => ({
        tokenId,
        name,
        ticker: name.slice(0, 2).toUpperCase(),
        decimals: 0,
        tokenType: { protocol: 'SLP', type: 'SLP_TOKEN_TYPE_FUNGIBLE' },
    } as TokenMeta);
    const listing = (tokenId: string, n: number, unbuyable = false) => ({
        ...OFFER,
        outpoint: { txid: id(String(n)), outIdx: n },
        tokenId,
        ...(unbuyable ? { atoms: 3n, askedAtoms: 10n, minAcceptedAtoms: 10n } : {}),
    });
    const shownName = (root: HTMLElement): string =>
        root.querySelector('[data-role="shop-window"] .item-n')?.textContent ?? '';

    afterEach(() => {
        vi.useRealTimers();
    });

    it('never stops on an unbuyable listing between two buyable ones', async () => {
        vi.useFakeTimers();
        window.history.replaceState(null, '', `${stallPath(ADDR)}?view=window&mode=cycle`);
        const offers = [listing(id('1'), 1), listing(id('2'), 2, true), listing(id('3'), 3)];
        const tokens = new Map([
            [id('1'), meta(id('1'), 'Apples')],
            [id('2'), meta(id('2'), 'Stranded Pears')],
            [id('3'), meta(id('3'), 'Cherries')],
        ]);
        const root = document.createElement('div');
        boot(root, async () => ({
            view: {
                route: { kind: 'pubkey' as const, pubkeyHex: PK, address: ADDR },
                fetch: { kind: 'offers' as const, offers },
                overlay: { kind: 'idle' as const },
                address: ADDR,
                stallName: 'Riverside Goods',
                tokens,
                window: { show: 'listings' as const, mode: 'cycle' as const, payCode: true, turn: 'none' as const, touch: false as const },
            },
            offers,
        }));
        await vi.advanceTimersByTimeAsync(0);
        const seen: string[] = [shownName(root)];
        for (let i = 0; i < 5; i += 1) {
            await vi.advanceTimersByTimeAsync(WINDOW_CARD_MS + 10);
            seen.push(shownName(root));
        }
        expect(seen).not.toContain('Stranded Pears');
        // Every dwell moves the card, past the heartbeat too (the escape
        // this assertion had while the beat reset the card's timer is gone:
        // `the-wall-card-keeps-its-twenty-seconds-across-the-heartbeat`).
        expect(seen).toEqual(['Apples', 'Cherries', 'Apples', 'Cherries', 'Apples', 'Cherries']);
        expect(root.textContent).not.toContain('Not buyable');
    });

    /**
     * The critic's second pass, 2026-09-24: the sixty-second heartbeat is a
     * full `refresh()`, which cleared the card's timer, and `syncWindow`
     * re-armed it from zero — so the card due when a beat landed stood 40 s,
     * one card a minute. `windowCardDueAt` survives the clear and the timer
     * is re-armed with what is left. Ten dwells across three beats, each
     * card standing its twenty seconds to within the sampling: the name just
     * before the due time is the old card's, and just after it the next.
     */
    it('the-wall-card-keeps-its-twenty-seconds-across-the-heartbeat', async () => {
        vi.useFakeTimers();
        window.history.replaceState(null, '', `${stallPath(ADDR)}?view=window&mode=cycle`);
        const offers = [listing(id('1'), 1), listing(id('3'), 3)];
        const tokens = new Map([
            [id('1'), meta(id('1'), 'Apples')],
            [id('3'), meta(id('3'), 'Cherries')],
        ]);
        let loads = 0;
        const root = document.createElement('div');
        boot(root, async () => {
            loads += 1;
            return {
                view: {
                    route: { kind: 'pubkey' as const, pubkeyHex: PK, address: ADDR },
                    fetch: { kind: 'offers' as const, offers },
                    overlay: { kind: 'idle' as const },
                    address: ADDR,
                    stallName: 'Riverside Goods',
                    tokens,
                    window: { show: 'listings' as const, mode: 'cycle' as const, payCode: true, turn: 'none' as const, touch: false as const },
                },
                offers,
            };
        });
        await vi.advanceTimersByTimeAsync(0);
        const names = ['Apples', 'Cherries'];
        expect(shownName(root)).toBe('Apples');
        // A refresh MID-dwell (a same-path navigation runs the same
        // `refresh()` the beat does): the card's timer is cleared ten seconds
        // in and re-armed with the ten that are left — the branch a beat
        // landing on a due time never reaches. It also moves the beat to 70 s,
        // 130 s and 190 s, so every later beat lands mid-dwell too.
        await vi.advanceTimersByTimeAsync(WINDOW_CARD_MS / 2);
        window.dispatchEvent(new PopStateEvent('popstate'));
        await vi.advanceTimersByTimeAsync(0);
        expect(shownName(root), 'the refresh keeps the card').toBe('Apples');
        let at = WINDOW_CARD_MS / 2;
        for (let dwell = 1; dwell <= 10; dwell += 1) {
            const due = dwell * WINDOW_CARD_MS;
            await vi.advanceTimersByTimeAsync(due - 200 - at);
            expect(shownName(root), `just before dwell ${dwell} ends`).toBe(names[(dwell - 1) % 2]);
            await vi.advanceTimersByTimeAsync(400);
            at = due + 200;
            expect(shownName(root), `just after dwell ${dwell} ends`).toBe(names[dwell % 2]);
        }
        // Ten dwells are 200 s: the heartbeat ran three times in them, each
        // mid-dwell, and is the thing this test is about.
        expect(10 * WINDOW_CARD_MS).toBeGreaterThan(WINDOW_CARD_MS / 2 + 3 * WINDOW_BEAT_MS);
        expect(loads, 'the first load, the refresh and three beats').toBe(5);
    });

    /**
     * `a-wall-showing-both-rails-never-stands-on-an-empty-one` (the owner,
     * 2026-09-24; the stream's `broadcastRail` on the wall). A listings rail
     * whose every listing is unbuyable has nothing to cycle, so a wall showing
     * both rails is on the quotes from the first paint and at every dwell —
     * never an empty strip. The first version of this test asserted only that
     * the stranded listing was not shown, which a blank card also satisfies.
     */
    it('a-wall-showing-both-rails-never-stands-on-an-empty-one', async () => {
        vi.useFakeTimers();
        window.history.replaceState(null, '', `${stallPath(ADDR)}?view=window&mode=cycle`);
        const offers = [listing(id('2'), 2, true)];
        const tokens = new Map([
            [id('2'), meta(id('2'), 'Stranded Pears')],
            [id('4'), meta(id('4'), 'Plum Jam')],
        ]);
        const root = document.createElement('div');
        boot(root, async () => ({
            view: {
                route: { kind: 'pubkey' as const, pubkeyHex: PK, address: ADDR },
                fetch: { kind: 'offers' as const, offers },
                overlay: { kind: 'idle' as const },
                address: ADDR,
                stallName: 'Riverside Goods',
                tokens,
                prices: new Map([[id('4'), { code: 'xec', exponent: 2, amount: 500_000n }]]),
                window: { show: 'all' as const, mode: 'cycle' as const, payCode: true, turn: 'none' as const, touch: false as const },
            },
            offers,
        }));
        await vi.advanceTimersByTimeAsync(0);
        for (let dwell = 0; dwell <= 5; dwell += 1) {
            expect(shownName(root), `dwell ${dwell}`).toBe('Plum Jam');
            expect(root.querySelector('[data-role="seller-price"]'), `dwell ${dwell}`).not.toBeNull();
            expect(root.querySelector('[data-role="window-state"]')?.textContent, `dwell ${dwell}`).not.toContain(
                'Nothing here this screen can show',
            );
            await vi.advanceTimersByTimeAsync(WINDOW_CARD_MS + 10);
        }
    });
});

describe('a-cycle-step-over-a-walk-that-threw-leaves-the-rail', () => {
    /**
     * The critic's fifth pass (2026-09-24, P3): the Cycle step stored the
     * rail it counted, and over a floor a walk left when it threw the quotes
     * count nothing — so a wall resting on the quotes was moved to the
     * listings off our own failure and came back there. The step's rail
     * moves only over records this page can judge (`recordsKnown`).
     */
    afterEach(() => {
        vi.useRealTimers();
    });
    const A = 'a1'.repeat(32);
    const Q = 'c3'.repeat(32);
    const meta = (tokenId: string, name: string): TokenMeta =>
        ({ tokenId, name, ticker: name.slice(0, 2).toUpperCase(), decimals: 0, tokenType: { protocol: 'SLP', type: 'SLP_TOKEN_TYPE_FUNGIBLE' } }) as TokenMeta;
    const params = { show: 'all' as const, mode: 'cycle' as const, payCode: true, turn: 'none' as const, touch: false as const };
    const base = {
        route: { kind: 'pubkey' as const, pubkeyHex: PK, address: ADDR },
        overlay: { kind: 'idle' as const },
        address: ADDR,
        stallName: 'Riverside Goods',
        window: params,
    };
    const quoted = new Map([[Q, { code: 'xec', exponent: 2, amount: 500_000n }]]);
    const offers = [{ ...OFFER, tokenId: A }];

    it('keeps a wall on the quotes across a dwell over a walk that threw', async () => {
        vi.useFakeTimers();
        window.history.replaceState(null, '', `${stallPath(ADDR)}?view=window&show=all&mode=cycle`);
        const states = [
            // Nothing listed: the wall rests on the quotes.
            { view: { ...base, fetch: { kind: 'empty' as const }, tokens: new Map([[Q, meta(Q, 'Plum Jam')]]), prices: quoted }, offers: [], pubkeyHex: PK },
            // The book fails and the walk throws before it reads a record.
            {
                view: { ...base, fetch: { kind: 'unreachable' as const, triedAtMs: 0, hosts: [] }, tokens: new Map() },
                offers: [],
                pubkeyHex: PK,
                pendingFacts: {
                    stall: { address: ADDR, hash: toHex(HASH) },
                    pubkeyHex: PK,
                    manifest: Promise.resolve(undefined),
                    descriptions: Promise.resolve({
                        descriptions: new Map<string, string>(),
                        shelves: new Map<string, string>(),
                        prices: new Map(),
                        quoteTimes: new Map<string, number>(),
                        decided: new Set<string>(),
                        unreadable: new Set<string>(),
                        truncated: false,
                        failed: true,
                        genesis: new Map(),
                    }),
                },
            },
            // Then a good read with a listing and the quote.
            {
                view: {
                    ...base,
                    fetch: { kind: 'offers' as const, offers },
                    tokens: new Map([
                        [A, meta(A, 'Apples')],
                        [Q, meta(Q, 'Plum Jam')],
                    ]),
                    prices: quoted,
                },
                offers,
                pubkeyHex: PK,
            },
        ];
        let at = 0;
        const root = document.createElement('div');
        boot(root, async () => states[Math.min(at++, states.length - 1)]!);
        await vi.advanceTimersByTimeAsync(0);
        expect(root.querySelector('[data-role="seller-price"]'), 'on the quotes').not.toBeNull();

        window.dispatchEvent(new PopStateEvent('popstate'));
        await vi.advanceTimersByTimeAsync(0);
        // A whole dwell over the floor the throw left.
        await vi.advanceTimersByTimeAsync(WINDOW_CARD_MS + 10);

        window.dispatchEvent(new PopStateEvent('popstate'));
        await vi.advanceTimersByTimeAsync(0);
        expect(root.querySelector('[data-role="seller-price"]'), 'still the quotes').not.toBeNull();
        expect(root.querySelector('[data-role="price"]'), 'not the listing').toBeNull();
    });
});

describe('a-new-lock-height-on-the-same-stall-takes-a-fresh-set', () => {
    /**
     * The freeze is captured once and kept across every refresh — for the
     * SAME lock. A same-path navigation (Back, Forward, a bookmark) to the
     * stall's wall at another `upto` kept the set captured at the first,
     * so the new height was filtered by the old one's tokens (the critic's
     * third pass, 2026-09-24). The set is keyed by the height it was taken
     * at.
     */
    afterEach(() => {
        vi.useRealTimers();
    });

    const A = 'a1'.repeat(32);
    const B = 'b2'.repeat(32);
    const meta = (tokenId: string, name: string): TokenMeta =>
        ({ tokenId, name, ticker: name.slice(0, 2).toUpperCase(), decimals: 0, tokenType: { protocol: 'SLP', type: 'SLP_TOKEN_TYPE_FUNGIBLE' } }) as TokenMeta;
    const offers = [
        { ...OFFER, tokenId: A, outpoint: { txid: 'a3'.repeat(32), outIdx: 0 }, blockHeight: 90 },
        { ...OFFER, tokenId: B, outpoint: { txid: 'b4'.repeat(32), outIdx: 0 }, blockHeight: 150 },
    ];
    const names = (root: HTMLElement): string[] =>
        [...root.querySelectorAll('[data-role="shop-window"] .item-n')].map((n) => n.textContent ?? '').sort();

    it('filters a new height by its own tokens, not the old height’s', async () => {
        vi.useFakeTimers();
        window.history.replaceState(null, '', `${stallPath(ADDR)}?view=window&mode=browse&upto=200`);
        const root = document.createElement('div');
        boot(root, async () => ({
            view: {
                route: { kind: 'pubkey' as const, pubkeyHex: PK, address: ADDR },
                fetch: { kind: 'offers' as const, offers },
                overlay: { kind: 'idle' as const },
                address: ADDR,
                stallName: 'Riverside Goods',
                tokens: new Map([
                    [A, meta(A, 'Apples')],
                    [B, meta(B, 'Barley')],
                ]),
                window: parseWindowParams(location.search)!,
            },
            offers,
        }));
        await vi.advanceTimersByTimeAsync(0);
        expect(names(root), 'locked at 200: both').toEqual(['Apples', 'Barley']);

        // Back to a lower lock on the same stall: Barley settled at 150, so
        // a lock at 100 must not carry it on the remembered set of the 200.
        window.history.pushState(null, '', `${stallPath(ADDR)}?view=window&mode=browse&upto=100`);
        window.dispatchEvent(new PopStateEvent('popstate'));
        await vi.advanceTimersByTimeAsync(0);
        expect(names(root), 'locked at 100: only what was settled by then').toEqual(['Apples']);
    });
});

describe('a-touch-wall-freezes-the-payment-its-press-composed', () => {
    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    /** A wall is 680px or wider; `boot` reads the width once (CLAUDE §4). */
    const atWall = async (run: () => Promise<void>): Promise<void> => {
        const had = Object.getOwnPropertyDescriptor(globalThis, 'innerWidth');
        Object.defineProperty(globalThis, 'innerWidth', { value: 1920, configurable: true });
        try {
            await run();
        } finally {
            if (had === undefined) {
                delete (globalThis as { innerWidth?: number }).innerWidth;
            } else {
                Object.defineProperty(globalThis, 'innerWidth', had);
            }
        }
    };

    const QUOTE_TOKEN = 'cd'.repeat(32);
    // `quotedItems` is affirmative: a token whose genesis never named a
    // fungible kind is not a row (CLAUDE §5), so the meta says so.
    const quoteMeta = {
        tokenId: QUOTE_TOKEN,
        name: 'Roasted Beans',
        ticker: 'RB',
        decimals: 0,
        tokenType: { protocol: 'SLP', type: 'SLP_TOKEN_TYPE_FUNGIBLE' },
    } as unknown as TokenMeta;
    const wallState = (over: Partial<StallView> = {}) => ({
        view: {
            route: { kind: 'pubkey' as const, pubkeyHex: PK, address: ADDR },
            fetch: { kind: 'offers' as const, offers: [OFFER] },
            overlay: { kind: 'idle' as const },
            address: ADDR,
            stallName: 'Riverside Goods',
            tokens: new Map([
                [TOKEN, TOKEN_META],
                [QUOTE_TOKEN, quoteMeta],
            ]),
            prices: new Map([[QUOTE_TOKEN, { code: 'usd', exponent: 2, amount: 500n }]]),
            window: { show: 'quotes' as const, mode: 'browse' as const, payCode: true, turn: 'none' as const, touch: true },
            ...over,
        } as unknown as StallView,
        offers: [OFFER],
        pubkeyHex: PK,
    });

    const press = (root: HTMLElement, role: string): void => {
        (root.querySelector(`[data-role="${role}"]`) as HTMLButtonElement | null)?.click();
    };
    const plate = (root: HTMLElement) => root.querySelector('[data-role="window-paying"]');

    it('asks the feeds in the selection’s own unit, freezes the figure, and closes on any change', async () => {
      await atWall(async () => {
        vi.useFakeTimers();
        const asked: string[] = [];
        vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
            const url = String(input);
            asked.push(url);
            return {
                ok: true,
                json: async () => ({ ecash: { vnd: 0.0005, usd: 0.00002 }, quotes: { VND: { price: 0.0005 }, USD: { price: 0.00002 } } }),
            } as unknown as Response;
        });
        window.history.replaceState(null, '', `${stallPath(PK)}?view=window&mode=browse&show=quotes&touch=on`);
        const root = document.createElement('div');
        boot(root, async () => wallState({ prices: new Map([[QUOTE_TOKEN, { code: 'vnd', exponent: 0, amount: 120_000n }]]) }) as never);
        await vi.advanceTimersByTimeAsync(0);
        press(root, 'window-step-more');
        await vi.advanceTimersByTimeAsync(0);
        expect(root.querySelector('[data-role="selection-total"]')).not.toBeNull();
        expect(plate(root), 'the first + asks no feed and composes nothing').toBeNull();
        expect(asked, 'a wall nobody has pressed Pay at asks no third party').toHaveLength(0);

        press(root, 'window-pay');
        await vi.advanceTimersByTimeAsync(50);
        // The seller's unit, never the overlay's default: a VND selection
        // composed from a USD rate is the one mistake this rail forbids.
        expect(asked.some((url) => url.includes('vnd')), `asked ${asked.join(' ')}`).toBe(true);
        const frozen = plate(root);
        expect(frozen, 'the press left a payment on the wall').not.toBeNull();
        const uri = frozen!.getAttribute('data-pay-uri') ?? '';
        expect(uri.startsWith(`${ADDR}?`), uri).toBe(true);
        /*
         * **No memo on the wall, and it is a measurement** (2026-09-22): the
         * phone sheet composes `STLP`'s second shape, but this screen's one
         * road is a code read across a room at 280–360px, where a two-item
         * memo is 5.28px a module and a three-item one 4.91 — under the only
         * density this project has proved. A memo that existed at two items
         * and vanished at three is worse than none.
         */
        expect(uri, 'the wall composes no memo').not.toContain('op_return_raw');

        // Any change to the selection gives the slot back to the shop's code.
        press(root, 'window-step-more');
        await vi.advanceTimersByTimeAsync(0);
        expect(plate(root), 'a stepper press closes the plate').toBeNull();
        expect(root.querySelector('.sw-plate')).not.toBeNull();
      });
    });

    it('gives the code slot back when the rate that priced it ages out', async () => {
      await atWall(async () => {
        vi.useFakeTimers();
        vi.stubGlobal('fetch', async () =>
            ({ ok: true, json: async () => ({ ecash: { usd: 0.00002 }, quotes: { USD: { price: 0.00002 } } }) }) as unknown as Response,
        );
        window.history.replaceState(null, '', `${stallPath(PK)}?view=window&mode=browse&show=quotes&touch=on`);
        const root = document.createElement('div');
        boot(root, async () => wallState() as never);
        await vi.advanceTimersByTimeAsync(0);
        press(root, 'window-step-more');
        await vi.advanceTimersByTimeAsync(0);
        press(root, 'window-pay');
        await vi.advanceTimersByTimeAsync(50);
        expect(plate(root)).not.toBeNull();
        await vi.advanceTimersByTimeAsync(PAY_RATE_MAX_AGE_MS - 100);
        expect(plate(root), 'inside the rate’s own lifetime the code stands').not.toBeNull();
        await vi.advanceTimersByTimeAsync(200);
        // The shop's own code is the one road a passer-by has onto this
        // stall, so a dead plate must not hold it (T-D); the selection and
        // its total stay, and the control says it composes again.
        expect(plate(root)).toBeNull();
        expect(root.querySelector('.sw-plate')).not.toBeNull();
        expect(root.querySelector('[data-role="selection-total"]')).not.toBeNull();
      });
    });

    /**
     * The heartbeat is a full `refresh()`, and a read that came back with no
     * route resets the selection — so the plate over it must go too, or the
     * wall would stand showing a payment for a selection that no longer
     * exists (the critic's P3-18).
     */
    it('a re-read that lost the route leaves no payment plate', async () => {
      await atWall(async () => {
        vi.useFakeTimers();
        vi.stubGlobal('fetch', async () =>
            ({ ok: true, json: async () => ({ ecash: { usd: 0.00002 }, quotes: { USD: { price: 0.00002 } } }) }) as unknown as Response,
        );
        window.history.replaceState(null, '', `${stallPath(PK)}?view=window&mode=browse&show=quotes&touch=on`);
        const root = document.createElement('div');
        let routed = true;
        boot(root, async () =>
            (routed
                ? wallState()
                : { ...wallState(), pubkeyHex: undefined, view: { ...wallState().view, prices: undefined } }) as never,
        );
        await vi.advanceTimersByTimeAsync(0);
        press(root, 'window-step-more');
        await vi.advanceTimersByTimeAsync(0);
        press(root, 'window-pay');
        await vi.advanceTimersByTimeAsync(50);
        expect(plate(root)).not.toBeNull();
        routed = false;
        await vi.advanceTimersByTimeAsync(WINDOW_BEAT_MS + 50);
        expect(plate(root), 'no payment stands over a selection that was reset').toBeNull();
      });
    });
});
