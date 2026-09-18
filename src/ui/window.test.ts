// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { renderStall } from './render';
import { windowItemLink, windowLinkFor } from './window';
import { cashtabTokenUrl } from '../domain/cashtab';
import type { StallHandlers } from './render';
import type { StallOffer, StallView, WindowParams } from '../domain/state';

const PK = '02' + '11'.repeat(32);
const ADDR = 'ecash:qpjq0dcnn4j0c7lnrjqxpqk3z2qz0mfvyv8qyqz3hn';
const BEANS = 'a'.repeat(64);
const TEA = 'b'.repeat(64);
const JUNK = 'c'.repeat(64);

function handlers(): StallHandlers {
    return {
        onOpenStall: vi.fn(),
        onRetry: vi.fn(),
        onOpenItem: vi.fn(),
        onCloseSheet: vi.fn(),
        onOpenPay: vi.fn(),
        onSwitchShopTab: vi.fn(),
        onZoomIcon: vi.fn(),
    } as unknown as StallHandlers;
}

function offer(tokenId: string, blockHeight?: number): StallOffer {
    return {
        outpoint: { txid: 'd'.repeat(64), outIdx: 0 },
        tokenId,
        atoms: 10n,
        variant: 'PARTIAL',
        askedSats: 120_000n,
        askedAtoms: 1n,
        ...(blockHeight === undefined ? {} : { blockHeight }),
    };
}

function tokenMeta(tokenId: string, name: string) {
    return [tokenId, { name, ticker: name.slice(0, 3).toUpperCase(), decimals: 0 }] as const;
}

function windowView(params: WindowParams, over: Partial<StallView> = {}): StallView {
    return {
        route: { kind: 'pubkey', pubkeyHex: PK, address: ADDR },
        overlay: { kind: 'idle' },
        address: ADDR,
        stallName: 'Riverside Goods',
        tokens: new Map([tokenMeta(BEANS, 'Roasted Beans'), tokenMeta(TEA, 'Green Tea')]),
        fetch: { kind: 'offers', offers: [offer(BEANS, 100), offer(TEA, 100)] },
        window: params,
        ...over,
    } as StallView;
}

function paint(view: StallView): HTMLElement {
    const root = document.createElement('div');
    renderStall(root, view, handlers());
    return root;
}

describe('a-shop-window-carries-no-controls', () => {
    /**
     * The broadcast's contract, for the broadcast's reason, on a surface that
     * is even more exposed: a stream viewer cannot click, and a customer
     * standing at a shop screen can. A screen nobody attends must not be
     * navigable into a state the seller has to walk over and fix — so the
     * dock, the footer, the rail tabs and the row buttons are never built,
     * rather than built and hidden.
     */
    it('builds no button, anchor or input anywhere under the window', () => {
        for (const mode of ['cycle', 'browse'] as const) {
            const root = paint(windowView({ show: 'all', mode }));
            const window = root.querySelector('[data-role="shop-window"]');
            expect(window, `${mode} paints a window`).not.toBeNull();
            expect(window!.querySelectorAll('button, a, input, select, textarea')).toHaveLength(0);
            expect(root.querySelector('.tabs')).toBeNull();
            expect(root.querySelector('.stall-foot')).toBeNull();
            expect(root.querySelector('[data-role="shop-tabs"]')).toBeNull();
        }
    });
});

describe('the-window-row-wears-the-shop-row-anatomy', () => {
    /**
     * The one duplication this screen costs. The row is rebuilt here in
     * non-interactive elements, so it can drift from `offerRow` — and the
     * moment it does, every look's own rules stop reaching it and the screen
     * silently loses its dress. Pinned by the classes rather than by the
     * markup, because the classes are what the three look sheets select on.
     */
    it('paints the classes the looks select on', () => {
        const root = paint(windowView({ show: 'listings', mode: 'browse' }));
        const row = root.querySelector('.items .item');
        expect(row).not.toBeNull();
        for (const cls of ['item-head', 'item-ic', 'item-b', 'item-n', 'item-p', 'item-a']) {
            expect(row!.querySelector(`.${cls}`), cls).not.toBeNull();
        }
        // The figure is the covenant's own asked amount, under the role every
        // money guard in this repo reads.
        expect(row!.querySelector('[data-role="price"]')?.textContent).toBe('1,200');
    });
});

describe('the-window-shows-one-rail-and-rotates-between-them', () => {
    /**
     * `show=all` rotates; it never merges. A covenant's asked amount beside a
     * seller's own quote is what `the-two-rails-never-paint-on-one-screen`
     * forbids, and a screen nobody can question is the worst place to break
     * it — there is no tab to press to find out which figure is which.
     */
    it('never paints both rails’ figures at once', () => {
        for (const rail of ['listings', 'quotes'] as const) {
            const root = paint(
                windowView({ show: 'all', mode: 'browse' }, { windowRail: rail } as Partial<StallView>),
            );
            const covenant = root.querySelectorAll('[data-role="price"]').length;
            const quoted = root.querySelectorAll('[data-role="seller-price"]').length;
            expect(Math.min(covenant, quoted), `${rail} paints one kind of figure`).toBe(0);
        }
    });
});

describe('a-window-code-opens-the-road-its-own-rail-has', () => {
    /**
     * A quote's code opens this page's pay sheet; a listing's opens Cashtab's
     * token page. `applyPayHint` resolves a `?pay=` hint against `quotedItems`
     * alone, so a listing's code aimed here would tell somebody standing in
     * the shop that this stall does not quote the thing on the screen in front
     * of them.
     */
    it('sends a listing to Cashtab’s token page and a quote to the pay sheet', () => {
        const listing = windowItemLink(BEANS, 'listing');
        // The same composer the item face's Buy control already uses.
        expect(listing).toBe(cashtabTokenUrl(BEANS));
        // No action on the Cashtab link: §2's deep link takes the cheapest
        // affordable offer and never names the maker, so on a per-seller
        // stall it can quietly sell a competitor's tokens.
        expect(listing).not.toContain('action=');

        const quote = windowItemLink(BEANS, 'quote') ?? '';
        expect(quote).toContain('?pay=');
        expect(quote).not.toBe(cashtabTokenUrl(BEANS));
    });

    it('says open, never buy', () => {
        const root = paint(windowView({ show: 'listings', mode: 'cycle' }));
        const caption = root.querySelector('.sw-cap')?.textContent ?? '';
        expect(caption.toLowerCase()).toContain('open');
        expect(caption.toLowerCase()).not.toContain('buy');
    });

    /**
     * A catalogue gets one code, and it is the shop's. Five identical plates
     * down a wall read as a wall of codes rather than as goods, and at the
     * size this screen needs there would be no room left for the goods.
     */
    it('gives a catalogue one code and a card its own', () => {
        const browse = paint(windowView({ show: 'listings', mode: 'browse' }));
        expect(browse.querySelectorAll('.sw-qr')).toHaveLength(0);
        expect(browse.querySelectorAll('.sw-plate')).toHaveLength(1);

        const cycle = paint(windowView({ show: 'listings', mode: 'cycle' }));
        expect(cycle.querySelectorAll('.sw-qr')).toHaveLength(1);
        expect(cycle.querySelectorAll('.sw-plate')).toHaveLength(0);
    });
});

describe('the-window-freeze-refuses-a-stranger-and-never-the-seller', () => {
    it('drops a listing that arrived after the lock', () => {
        const view = windowView(
            { show: 'listings', mode: 'browse', upto: 120 },
            {
                tokens: new Map([
                    tokenMeta(BEANS, 'Roasted Beans'),
                    tokenMeta(JUNK, 'Somebody Else'),
                ]),
                fetch: { kind: 'offers', offers: [offer(BEANS, 100), offer(JUNK, 130)] },
            } as Partial<StallView>,
        );
        const names = [...paint(view).querySelectorAll('.item-n')].map((n) => n.textContent);
        expect(names).toEqual(['Roasted Beans']);
    });

    it('paints every listing when no lock is asked for', () => {
        const names = [...paint(windowView({ show: 'listings', mode: 'browse' }))
            .querySelectorAll('.item-n')].map((n) => n.textContent);
        expect(names.sort()).toEqual(['Green Tea', 'Roasted Beans']);
    });
});

describe('a-window-that-cannot-date-its-read-prints-no-time', () => {
    /**
     * §5's rule about a record this page cannot date, applied where the claim
     * is about our own reading. "Just now" over a screen that has been deaf
     * since three in the morning is the one lie this line exists to prevent.
     */
    it('mounts no freshness line without a read time', () => {
        const root = paint(windowView({ show: 'all', mode: 'cycle' }));
        expect(root.querySelector('[data-role="window-fresh"]')).toBeNull();
        expect(root.querySelector('[data-role="window-state"]')).not.toBeNull();
    });

    it('mounts one once the read is dated', () => {
        const root = paint(
            windowView({ show: 'all', mode: 'cycle' }, {
                readAtMs: Date.now() - 120_000,
            } as Partial<StallView>),
        );
        expect(root.querySelector('[data-role="window-fresh"]')?.textContent).toBe(
            'Updated 2 minutes ago',
        );
    });
});

describe('the-shop-window-sheet-composes-a-link-and-signs-nothing', () => {
    function sheet(): HTMLElement {
        const view = windowView({ show: 'all', mode: 'cycle' });
        const root = document.createElement('div');
        renderStall(
            root,
            { ...view, window: undefined, overlay: { kind: 'shop-window' } } as StallView,
            handlers(),
        );
        return root;
    }

    /**
     * Two ways out, and two different elements on purpose. §8 bans an anchor
     * on the two Pay controls because an anchor carries its destination where
     * a middle-click or "copy link address" can take it, past every listener —
     * and once a rate has aged that hands a wallet a stale amount. Nothing
     * here carries an amount and nothing here goes stale, so the anchor is
     * right and the browser's own "open in new tab" works for free.
     */
    it('opens here with a button and in a tab with a real anchor', () => {
        const root = sheet();
        const here = root.querySelector('[data-role="shop-window-open-here"]');
        expect(here?.tagName).toBe('BUTTON');
        const tab = root.querySelector('[data-role="shop-window-open-tab"]');
        expect(tab?.tagName).toBe('A');
        expect(tab?.getAttribute('href') ?? '').toContain('view=window');
        expect(tab?.getAttribute('rel')).toBe('noopener noreferrer');
    });

    /** It composes a URL. It signs nothing, so it carries no wallet road. */
    it('carries no publish or pay link', () => {
        const root = sheet();
        const hrefs = [...root.querySelectorAll('a')].map((a) => a.getAttribute('href') ?? '');
        for (const href of hrefs) {
            expect(href.startsWith('ecash:')).toBe(false);
            expect(href).not.toContain('op_return_raw');
        }
    });

    /**
     * A link that names only what was chosen is a link a person can read —
     * the rule `cards=quotes` already follows on the stream link.
     */
    it('omits every default and names every choice', () => {
        const base = 'https://stall.cash/s/qpjq';
        expect(windowLinkFor({ show: 'all', mode: 'cycle' }, base)).toBe(`${base}?view=window`);
        expect(windowLinkFor({ show: 'quotes', mode: 'browse', upto: 874_213 }, base)).toBe(
            `${base}?view=window&show=quotes&mode=browse&upto=874213`,
        );
    });
});

describe('a-shop-window-mounts-no-sheet', () => {
    /**
     * Sharper than the broadcast's reason for the same rule: the four sheets
     * HOLD the live paint, so one opened on an unattended screen would stop
     * the stall updating with nobody there to close it and nothing on screen
     * to say why.
     */
    it('refuses every overlay while the window is the screen', () => {
        const root = paint({
            ...windowView({ show: 'all', mode: 'cycle' }),
            overlay: { kind: 'shop-window' },
        } as StallView);
        expect(root.querySelector('[data-role="sheet-scrim"]')).toBeNull();
        expect(root.querySelector('[data-role="shop-window"]')).not.toBeNull();
    });
});
