// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { renderStall } from './render';
import { WINDOW_QR_MIN_PX, WINDOW_QR_PX, windowItemLink, windowLinkFor } from './window';
import { cashtabTokenUrl } from '../domain/cashtab';
import type { StallHandlers } from './render';
import type { StallOffer, StallView, TokenMeta, WindowParams } from '../domain/state';

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

/** A fungible token, so `isPriceable` answers yes and the quote rail paints. */
function tokenMeta(tokenId: string, name: string): [string, TokenMeta] {
    return [
        tokenId,
        {
            tokenId,
            name,
            ticker: name.slice(0, 3).toUpperCase(),
            decimals: 0,
            tokenType: { protocol: 'SLP', type: 'SLP_TOKEN_TYPE_FUNGIBLE' },
        },
    ];
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
     * forbids, and a shop screen is the worst place to break it — there is no
     * tab to press to ask which figure is which.
     *
     * The first version of this test could not fail: its fixture set no
     * `prices`, so `quotedItems` was empty on BOTH halves and the quoted
     * count was zero whatever the screen painted. A stall that quotes
     * something is the only fixture that can tell a rotation from a merge.
     */
    const bothRails: Partial<StallView> = {
        prices: new Map([[BEANS, { code: 'xec', exponent: 2, amount: 500_000n }]]),
        descriptions: new Map([[BEANS, 'Half a kilo, roasted Tuesday']]),
    } as unknown as Partial<StallView>;

    it('paints one rail’s figures and never the other’s beside them', () => {
        const seen: Record<string, number> = {};
        for (const rail of ['listings', 'quotes'] as const) {
            const root = paint(
                windowView({ show: 'all', mode: 'browse' }, {
                    ...bothRails,
                    windowRail: rail,
                } as Partial<StallView>),
            );
            const covenant = root.querySelectorAll('[data-role="price"]').length;
            const quoted = root.querySelectorAll('[data-role="seller-price"]').length;
            // Both counts are asserted, so a screen that painted NEITHER
            // cannot pass the way the first version let it.
            expect(covenant + quoted, `${rail} paints figures at all`).toBeGreaterThan(0);
            expect(Math.min(covenant, quoted), `${rail} paints one kind`).toBe(0);
            seen[rail] = covenant > 0 ? 1 : 2;
        }
        // And the two halves painted DIFFERENT rails, or the rotation is a
        // rotation in name only.
        expect(seen.listings).not.toBe(seen.quotes);
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

describe('the-window-code-is-the-size-the-module-tests-pin', () => {
    /**
     * A number stated twice is a number that drifts. `qrSvg` draws a viewBox
     * and no size, so the box is the stylesheet's to give — and the first
     * version gave it none, which the layout probe found 378 times before a
     * browser ever showed anybody.
     *
     * It is a clamp and not a number, because a fixed 360 was measured off
     * the bottom of the screen at 1366x768, 1280x720 and 768x1024 — and a
     * symbol missing a quarter of itself does not scan. Both ends are pinned
     * here: the ceiling is a third of 1080 (the poster's own floor) and the
     * FLOOR is the smallest box at which this screen's densest destination
     * still clears the only reading this project has.
     */
    it('states one ceiling and one floor, in the sheet and in the module', () => {
        const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'window.css'), 'utf8');
        const block = /\.sw-qr svg,[\s\S]*?\}/.exec(css)?.[0] ?? '';
        expect(block).toContain(`${WINDOW_QR_PX}px)`);
        expect(block).toContain(`clamp(${WINDOW_QR_MIN_PX}px`);
        // A third of the short side of a 1080 screen, the poster's own floor.
        expect(WINDOW_QR_PX).toBeGreaterThanOrEqual(Math.floor(1080 / 3));
        // Cashtab's token page is the densest code this screen draws: 41 data
        // modules in a 49 painted span. The floor must still beat 3.60, the
        // only density this project has watched fail.
        expect(WINDOW_QR_MIN_PX / 49).toBeGreaterThan(4.5);
    });
});

describe('the-options-sheet-closes-the-way-every-other-sheet-does', () => {
    function sheetRoot(): HTMLElement {
        const root = document.createElement('div');
        renderStall(
            root,
            { ...windowView({ show: 'all', mode: 'cycle' }), window: undefined,
              overlay: { kind: 'shop-window' } } as StallView,
            handlers(),
        );
        return root;
    }

    /**
     * §5: "Both sheets are the same shape and share their way out … the
     * scrim, Escape, the tab trap." The first version built its own scrim and
     * handed it to `sheetOverlay`, which wrapped it in a second one — so the
     * backdrop was two scrims deep, composited to ~80% black instead of 55%,
     * and every click on it landed on the inner node while the close handler
     * compared against the outer. The sheet could not be dismissed by its own
     * backdrop.
     */
    it('builds one scrim, and the sheet is what sits in it', () => {
        const root = sheetRoot();
        const scrims = root.querySelectorAll('[data-role="sheet-scrim"]');
        expect(scrims).toHaveLength(1);
        expect(scrims[0]!.firstElementChild?.classList.contains('sheet')).toBe(true);
    });
});

describe('the-window-lock-says-so-when-the-height-is-not-a-height', () => {
    /**
     * §8's rule for a figure this page cannot read: say so, never substitute
     * one. `parseBlockParam` refuses "874,213" — which its own docblock names
     * as what a seller reads off an explorer — and the first version dropped
     * the lock from the link in silence while the control went on reporting
     * itself as pressed.
     */
    it('refuses a comma out loud and does not report itself locked', () => {
        const root = document.createElement('div');
        renderStall(
            root,
            { ...windowView({ show: 'all', mode: 'cycle' }), window: undefined,
              overlay: { kind: 'shop-window' } } as StallView,
            handlers(),
        );
        const field = root.querySelector<HTMLInputElement>('[data-role="window-lock-height"]')!;
        const press = root.querySelector<HTMLButtonElement>('[data-role="window-lock"]')!;
        const link = root.querySelector<HTMLInputElement>('[data-role="shop-window-link"]')!;

        field.value = '874,213';
        field.dispatchEvent(new Event('input'));
        press.click();

        expect(root.querySelector('[data-role="window-lock-refused"]')?.hasAttribute('hidden'))
            .toBe(false);
        expect(press.getAttribute('aria-pressed')).toBe('false');
        expect(link.value).not.toContain('upto');

        field.value = '874213';
        field.dispatchEvent(new Event('input'));
        expect(press.getAttribute('aria-pressed')).toBe('true');
        expect(link.value).toContain('upto=874213');
    });
});

describe('a-planted-offer-after-the-lock-never-sets-the-figure', () => {
    /**
     * The freeze's whole reason, and the first version answered the wrong
     * question with it.
     *
     * Filtering by TOKEN decides whose goods are on the shelf. It does not
     * decide whose number is on the wall — and the number is what a shop
     * window is. `cheapestOf` then picks across every offer of a kept token,
     * so a stranger who plants a cheap PARTIAL (§10: it lands in any
     * `P + pubkey` group with no key of that pubkey) on a token the seller
     * already sells takes the price, while the lock reports itself as
     * holding. Measured before the fix: the seller's 1,200 painted as 6.
     */
    it('keeps the seller’s own figure when a stranger undercuts a locked token', () => {
        const view = windowView(
            { show: 'listings', mode: 'browse', upto: 120 },
            {
                tokens: new Map([tokenMeta(BEANS, 'Roasted Beans')]),
                fetch: {
                    kind: 'offers',
                    offers: [
                        offer(BEANS, 100),
                        { ...offer(BEANS, 900), askedSats: 600n },
                    ],
                },
                windowLock: new Set([BEANS]),
            } as Partial<StallView>,
        );
        expect(paint(view).querySelector('[data-role="price"]')?.textContent).toBe('1,200');
    });

    it('drops a token whose only offers arrived after the lock', () => {
        const view = windowView(
            { show: 'listings', mode: 'browse', upto: 120 },
            {
                tokens: new Map([tokenMeta(BEANS, 'Roasted Beans'), tokenMeta(JUNK, 'Planted')]),
                fetch: {
                    kind: 'offers',
                    offers: [offer(BEANS, 100), offer(JUNK, 900), offer(JUNK, 901)],
                },
            } as Partial<StallView>,
        );
        const names = [...paint(view).querySelectorAll('.item-n')].map((n) => n.textContent);
        expect(names).toEqual(['Roasted Beans']);
    });
});

describe('the-window-row-keeps-every-rule-the-shop-row-keeps', () => {
    /**
     * The duplication's real cost, and the first version paid all of it. The
     * test that stood here checked six class names were present, which is the
     * shape and not the rules — every one of the four below was green under it.
     */

    /** §5: on the quote rail the item is off-chain, so the words ARE the item. */
    it('prints the seller’s own words on a quote', () => {
        const root = paint(
            windowView({ show: 'quotes', mode: 'browse' }, {
                prices: new Map([[BEANS, { code: 'xec', exponent: 2, amount: 500_000n }]]),
                descriptions: new Map([[BEANS, 'Half a kilo, roasted Tuesday']]),
            } as unknown as Partial<StallView>),
        );
        expect(root.querySelector('[data-role="quote-words"]')?.textContent).toBe(
            'Half a kilo, roasted Tuesday',
        );
        expect(root.textContent ?? '').not.toContain('wrote nothing');
    });

    /**
     * §5's reader rule: a `not-attributed` quote paints initials rather than
     * the borrowed icon and carries `QUOTE_NOT_MINTED_HERE`. At 460px on a
     * wall the borrowed logo is the largest thing in the room.
     */
    it('borrows no icon and says so when the genesis is not this stall’s', () => {
        const root = paint(
            windowView({ show: 'quotes', mode: 'browse' }, {
                prices: new Map([[BEANS, { code: 'xec', exponent: 2, amount: 500_000n }]]),
                genesis: new Map([[BEANS, 'not-attributed']]),
            } as unknown as Partial<StallView>),
        );
        expect(root.querySelector('.item-ic')?.getAttribute('data-token-id')).toBeNull();
        expect(root.textContent ?? '').toContain('minted');
    });

    /**
     * `isUnbuyable`: the price this page holds is for a take the covenant will
     * refuse. A shop row a buyer can open to find out is one thing; a number
     * on a wall with nothing to press is another.
     */
    it('dashes a price the covenant would refuse', () => {
        const root = paint(
            windowView({ show: 'listings', mode: 'cycle' }, {
                tokens: new Map([tokenMeta(BEANS, 'Roasted Beans')]),
                fetch: {
                    kind: 'offers',
                    offers: [{ ...offer(BEANS, 100), minAcceptedAtoms: 999n }],
                },
            } as Partial<StallView>),
        );
        expect(root.querySelector('[data-role="price"]')).toBeNull();
        expect(root.querySelector('.dash')).not.toBeNull();
    });

    /** "from" says the figure prices PART of the lot. On a whole lot it is false. */
    it('says from only when the figure is for part of the lot', () => {
        const whole = paint(
            windowView({ show: 'listings', mode: 'cycle' }, {
                tokens: new Map([tokenMeta(BEANS, 'Roasted Beans')]),
                fetch: {
                    kind: 'offers',
                    offers: [{ ...offer(BEANS, 100), askedAtoms: 10n, atoms: 10n }],
                },
            } as Partial<StallView>),
        );
        expect(whole.querySelector('.item-from')).toBeNull();
        expect(paint(windowView({ show: 'listings', mode: 'cycle' }))
            .querySelector('.item-from')?.textContent).toBe('from');
    });
});
