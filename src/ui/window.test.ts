// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import * as copy from './copy';
import { holdsLivePaint, overlayMounts, renderStall, resetIconsForTests } from './render';
import {
    WINDOW_QR_MIN_PX,
    WINDOW_QR_PX,
    cycleListings,
    hiddenPayLines,
    sayHiddenPayLines,
    shopWindowSheet,
    wallListings,
    windowItemLink,
    windowLinkFor,
    windowRail,
    windowTurns,
} from './window';
import { nextCard } from '../domain/window';
import type { TokenPrice } from '../domain/description';
import { cashtabTokenUrl } from '../domain/cashtab';
import { qrMatrix } from '../domain/qr';
import { payLandingUrl } from '../domain/route';
import type { StallHandlers } from './render';
import type { StallOffer, StallView, TokenMeta, WindowParams } from '../domain/state';

const PK = '02' + '11'.repeat(32);
const ADDR = 'ecash:qpjq0dcnn4j0c7lnrjqxpqk3z2qz0mfvyv8qyqz3hn';
const BEANS = 'a'.repeat(64);
const TEA = 'b'.repeat(64);
const RYE = 'e'.repeat(64);
const JUNK = 'c'.repeat(64);
/** One quote in each of two units: the touch wall's `in` row and its `apart` row. */
const QUOTE_USD: TokenPrice = { code: 'usd', exponent: 2, amount: 500n, surchargePct: 5 };
const QUOTE_XEC: TokenPrice = { code: 'xec', exponent: 2, amount: 500_000n };

function handlers(): StallHandlers {
    return {
        onOpenStall: vi.fn(),
        onRetry: vi.fn(),
        onOpenItem: vi.fn(),
        onCloseSheet: vi.fn(),
        onOpenPay: vi.fn(),
        onSwitchShopTab: vi.fn(),
        onZoomIcon: vi.fn(),
        onClosePublish: vi.fn(),
        onSelectionSet: vi.fn(),
        onSelectionClear: vi.fn(),
        onWallPay: vi.fn(),
        onWallBack: vi.fn(),
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

/**
 * `payCode` defaults to ON here, the way the parse defaults it, so a test
 * that is not about the code says nothing about it — and the two tests that
 * ARE about it pass the field and read like what they assert.
 */
type WindowOpts = Omit<WindowParams, 'payCode' | 'turn' | 'touch'> & {
    payCode?: boolean;
    turn?: WindowParams['turn'];
    touch?: boolean;
};

function windowView(opts: WindowOpts, over: Partial<StallView> = {}): StallView {
    const params: WindowParams = { payCode: true, turn: 'none', touch: false, ...opts };
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
    paintedHandlers = handlers();
    renderStall(root, view, paintedHandlers);
    return root;
}

/** The handlers the last `paint` passed, so a press on the wall is observable. */
let paintedHandlers: StallHandlers = handlers();

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

    /**
     * The rule loses its "ever" on the owner's ask (2026-09-21), and what
     * replaces it is an ALLOW-LIST rather than a count: with `touch=on` the
     * wall carries exactly the selection's five roles and nothing else —
     * never a dock, a tab, a rail switch, a row that opens a face, a link
     * or a field. A count would pass the day somebody adds a sixth.
     */
    it('with touch on, carries exactly the selection’s controls and no other', () => {
        const root = paint(
            windowView(
                { show: 'quotes', mode: 'browse', touch: true },
                { prices: new Map([[BEANS, QUOTE_USD]]), selection: new Map([[BEANS, 2n]]) },
            ),
        );
        const window = root.querySelector('[data-role="shop-window"]')!;
        const controls = [...window.querySelectorAll('button, a, input, select, textarea')];
        expect(controls.length).toBeGreaterThan(0);
        const allowed = new Set(['window-step-fewer', 'window-step-more', 'window-clear', 'window-pay', 'window-back']);
        for (const node of controls) {
            expect(node.tagName, 'every control is a button').toBe('BUTTON');
            const role = node.getAttribute('data-role') ?? '';
            expect(allowed.has(role), `${role || node.outerHTML.slice(0, 60)} is not one of the five`).toBe(true);
        }
        expect(root.querySelector('.tabs')).toBeNull();
        expect(root.querySelector('.stall-foot')).toBeNull();
        expect(root.querySelector('[data-role="shop-tabs"]')).toBeNull();
        // Cycle has no list to choose from, and the listings rail's road off
        // this wall is Cashtab's token page: neither paints a control.
        for (const off of [
            windowView({ show: 'quotes', mode: 'cycle', touch: true }, { prices: new Map([[BEANS, QUOTE_USD]]) }),
            windowView({ show: 'listings', mode: 'browse', touch: true }),
            windowView({ show: 'quotes', mode: 'browse' }, { prices: new Map([[BEANS, QUOTE_USD]]) }),
        ]) {
            expect(
                paint(off).querySelectorAll('[data-role="shop-window"] button'),
                'no control outside Browse + quotes + the switch',
            ).toHaveLength(0);
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
            // The ROWS, not the screen: a touch wall's payment plate mounts
            // the XEC figure a wallet signs under `price` — the pay sheet's
            // stated inversion (§8) — and counting it here would have made
            // this rule quietly blind on the one screen it was written for
            // (the critic's P2-12). The plate is asserted below instead.
            const strip = root.querySelector('.sw-strip')!;
            const covenant = strip.querySelectorAll('[data-role="price"]').length;
            const quoted = strip.querySelectorAll('[data-role="seller-price"]').length;
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

    it('a touch wall’s plate carries the signed figure, and the rows stay one rail', () => {
        const root = paint(
            windowView(
                { show: 'quotes', mode: 'browse', touch: true },
                {
                    prices: new Map([[BEANS, QUOTE_USD]]),
                    selection: new Map([[BEANS, 2n]]),
                    windowPaying: {
                        sats: 52_500_000n,
                        uri: `${ADDR}?amount=525000.00`,
                        selection: new Map([[BEANS, 2n]]),
                        prices: new Map([[BEANS, QUOTE_USD]]),
                        names: new Map([[BEANS, 'Roasted Beans']]),
                        borrowed: new Set<string>(),
                        unit: 'usd',
                        atMs: Date.now(),
                    },
                } as unknown as Partial<StallView>,
            ),
        );
        const strip = root.querySelector('.sw-strip')!;
        expect(strip.querySelectorAll('[data-role="price"]'), 'the rows are the quotes rail').toHaveLength(0);
        expect(strip.querySelectorAll('[data-role="seller-price"]').length).toBeGreaterThan(0);
        const plate = root.querySelector('[data-role="window-paying"]')!;
        expect(plate.querySelectorAll('[data-role="price"]'), 'the figure a wallet signs').toHaveLength(1);
        expect(plate.querySelectorAll('[data-role="seller-price"]'), 'and never a quote beside it').toHaveLength(0);
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
        expect(windowLinkFor({ show: 'all', mode: 'cycle', payCode: true, turn: 'none', touch: false }, base)).toBe(
            `${base}?view=window`,
        );
        expect(
            windowLinkFor({ show: 'quotes', mode: 'browse', upto: 874_213, payCode: true, turn: 'none', touch: false }, base),
        ).toBe(`${base}?view=window&show=quotes&mode=browse&upto=874213`);
        // The code is on by default, so only OFF is written.
        expect(windowLinkFor({ show: 'quotes', mode: 'cycle', payCode: false, turn: 'none', touch: false }, base)).toBe(
            `${base}?view=window&show=quotes&paycode=off`,
        );
    });
});

describe('a-shop-window-mounts-no-sheet', () => {
    /**
     * Sharper than the broadcast's reason for the same rule: the four sheets
     * HOLD the live paint, so one opened on an unattended screen would stop
     * the stall updating with nobody there to close it and nothing on screen
     * to say why.
     *
     * The gate is asserted directly. The first version only looked at the
     * painted DOM — and the render path returns before any sheet mounts
     * anyway, so deleting the whole clause from `overlayAllowed` left the
     * entire suite green.
     */
    it('refuses the mount and the paint hold, on the table and on the screen', () => {
        const onWindow = windowView({ show: 'all', mode: 'cycle' });
        for (const kind of ['pay', 'describe', 'publish-name', 'poster', 'stream', 'embed'] as const) {
            const view = { ...onWindow, overlay: { kind } } as unknown as StallView;
            expect(overlayMounts(view), `${kind} mounts`).toBe(false);
            expect(holdsLivePaint(view), `${kind} holds`).toBe(false);
        }
        // And off a window the same kinds behave exactly as they always have,
        // or the clause would be a gate on everything.
        const ordinary = { ...onWindow, window: undefined, overlay: { kind: 'pay', tokenId: BEANS } } as unknown as StallView;
        expect(holdsLivePaint(ordinary)).toBe(true);

        const root = paint({ ...onWindow, overlay: { kind: 'shop-window' } } as StallView);
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
    it('states one ceiling and one floor, and the floor clears the densest code', () => {
        const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'window.css'), 'utf8');
        const block = /\.sw-qr svg,[\s\S]*?\}/.exec(css)?.[0] ?? '';
        expect(block).toContain(`${WINDOW_QR_PX}px)`);
        expect(block).toContain(`clamp(${WINDOW_QR_MIN_PX}px`);
        // A third of the short side of a 1080 screen, the poster's own floor.
        expect(WINDOW_QR_PX).toBeGreaterThanOrEqual(Math.floor(1080 / 3));

        /*
         * The floor is RECOMPUTED here from the real composers, not compared
         * against a number typed twice. A quote's landing link carries
         * `stallBaseUrl()`, so the span grows with this origin — the first
         * version divided by a hardcoded 49 and would have shipped 4.53px a
         * module on the host §9 names. Changing the domain now turns this red
         * instead of shrinking a code on somebody's wall.
         */
        const ORIGINS = ['https://stall.cash', 'https://stall-cash.pages.dev'];
        const ID = 'a'.repeat(64);
        const PK = '02' + '11'.repeat(32);
        const ADDR = 'qpjq0dcnn4j0c7lnrjqxpqk3z2qz0mfvyv8qyqz3hn';
        let worst = 0;
        for (const origin of ORIGINS) {
            for (const seller of [ADDR, PK]) {
                for (const link of [
                    payLandingUrl(`${origin}/s/${seller}`, ID),
                    `${origin}/s/${seller}`,
                ]) {
                    // `qrSvg` draws four quiet modules each side, so the box
                    // covers the data span plus eight.
                    worst = Math.max(worst, qrMatrix(link ?? '').length + 8);
                }
            }
        }
        worst = Math.max(worst, qrMatrix(cashtabTokenUrl(ID) ?? '').length + 8);
        // 5.17 is the only density this project has watched a phone read;
        // 3.60 is the only one it has watched fail (CLAUDE.md §9).
        expect(WINDOW_QR_MIN_PX / worst).toBeGreaterThanOrEqual(5.17);
    });
});

describe('the-options-sheet-closes-the-way-every-other-sheet-does', () => {
    it('builds one scrim, and pressing it closes', () => {
        const root = document.createElement('div');
        const h = handlers();
        renderStall(
            root,
            { ...windowView({ show: 'all', mode: 'cycle' }), window: undefined,
              overlay: { kind: 'shop-window' } } as StallView,
            h,
        );
        const scrims = root.querySelectorAll('[data-role="sheet-scrim"]');
        expect(scrims).toHaveLength(1);
        expect(scrims[0]!.firstElementChild?.classList.contains('sheet')).toBe(true);

        // The rule in the name, asserted. The first version checked the shape
        // and not the behaviour: breaking `sheetOverlay`'s close handler left
        // all twenty-six tests green.
        scrims[0]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(h.onClosePublish).toHaveBeenCalled();
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
    it('says a price the covenant would refuse is not buyable, and paints no figure', () => {
        const root = paint(
            windowView({ show: 'listings', mode: 'browse' }, {
                tokens: new Map([tokenMeta(BEANS, 'Roasted Beans')]),
                fetch: {
                    kind: 'offers',
                    offers: [{ ...offer(BEANS, 100), minAcceptedAtoms: 999n }],
                },
            } as Partial<StallView>),
        );
        expect(root.querySelector('[data-role="price"]')).toBeNull();
        expect(root.querySelector('.sw-row .item-p')?.textContent).toBe(copy.UNBUYABLE_BADGE);
        expect(root.textContent).not.toContain(copy.DASHED_PRICE);
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

describe('a-window-that-could-not-read-is-not-an-empty-shelf', () => {
    /**
     * §4's oldest rule, arriving on a wall. `plugin-missing-is-not-empty` is a
     * load-bearing name in §11, and the first version of this screen never
     * read `view.fetch` at all: `opening`, `empty`, `unreachable`,
     * `plugin-missing` and `unreadable` painted one identical screen under
     * "Showing listings" — our own failure stated as the seller's inventory,
     * on the one surface with nobody to press retry.
     */
    it('says a different thing for a failure, an empty shop and an opening one', () => {
        const said = (kind: string): string => {
            const root = paint(
                windowView({ show: 'listings', mode: 'browse' }, {
                    fetch: { kind },
                } as unknown as Partial<StallView>),
            );
            return root.querySelector('[data-role="window-state"]')?.textContent ?? '';
        };
        const failure = said('plugin-missing');
        const empty = said('empty');
        const opening = said('opening');
        expect(new Set([failure, empty, opening]).size).toBe(3);
        expect(failure).not.toBe(empty);
        // And our failure never claims to be showing the shop.
        expect(failure.toLowerCase()).not.toContain('showing');
        expect(said('unreachable')).toBe(failure);
    });

    /**
     * The freshness line is the other half of the same lie. The heartbeat is a
     * full `refresh()` every minute, so an unguarded stamp leaves a shop whose
     * hosts are down showing an empty shelf under "Updated just now" for ever.
     */
    it('is the state line that changes, not the shelf pretending to be fresh', () => {
        const root = paint(
            windowView({ show: 'listings', mode: 'browse' }, {
                fetch: { kind: 'unreachable' },
                readAtMs: Date.now() - 7_200_000,
            } as unknown as Partial<StallView>),
        );
        expect(root.querySelector('[data-role="window-fresh"]')?.textContent).toBe(
            'Updated 2 hours ago',
        );
    });
});

describe('the-window-lock-is-off-until-somebody-asks-for-it', () => {
    /**
     * A block height is a thing a seller has to go and look up, and most
     * stalls never meet the problem it solves — §10's gift listing. So the
     * sheet does not put one in front of everybody: off by default, and the
     * field, its refusal line and its explanation all live behind one press
     * (owner, 2026-09-18).
     */
    it('hides the height until the switch is on, and takes the lock back when it goes off', () => {
        const root = document.createElement('div');
        renderStall(
            root,
            { ...windowView({ show: 'all', mode: 'cycle' }), window: undefined,
              overlay: { kind: 'shop-window' } } as StallView,
            handlers(),
        );
        const sw = root.querySelector<HTMLButtonElement>('[data-role="window-lock-switch"]')!;
        const row = root.querySelector<HTMLElement>('.sw-lock')!;
        const press = root.querySelector<HTMLButtonElement>('[data-role="window-lock"]')!;
        const field = root.querySelector<HTMLInputElement>('[data-role="window-lock-height"]')!;
        const link = root.querySelector<HTMLInputElement>('[data-role="shop-window-link"]')!;

        expect(sw.getAttribute('aria-pressed')).toBe('false');
        expect(row.hidden).toBe(true);
        expect(link.value).not.toContain('upto');

        sw.click();
        expect(row.hidden).toBe(false);
        field.value = '874213';
        field.dispatchEvent(new Event('input'));
        press.click();
        expect(link.value).toContain('upto=874213');

        // And off takes it back: a link must never carry an `upto` from a
        // control the seller can no longer see.
        sw.click();
        expect(row.hidden).toBe(true);
        expect(press.getAttribute('aria-pressed')).toBe('false');
        expect(link.value).not.toContain('upto');
    });
});

describe('a-window-over-an-unresolved-address-says-which-layer-failed', () => {
    /**
     * §4's "three layers, not one enum", arriving on a wall. A never-spent
     * address and a walk that hit our own page cap are facts about IDENTITY —
     * there is no shop yet to be empty or unreadable — and the first version
     * painted both as "Opening…" for ever over a blank screen whose code
     * invited customers to browse a stall that does not exist.
     */
    it('tells a never-spent address from a walk that stopped from an opening one', () => {
        const said = (route: Record<string, unknown>, fetch?: Record<string, unknown>): string => {
            const root = paint(
                windowView({ show: 'listings', mode: 'browse' }, {
                    route,
                    ...(fetch === undefined ? {} : { fetch }),
                } as unknown as Partial<StallView>),
            );
            return root.querySelector('[data-role="window-state"]')?.textContent ?? '';
        };
        const never = said({ kind: 'unresolvable', address: ADDR });
        const stopped = said({ kind: 'unresolved', address: ADDR });
        const opening = said({ kind: 'pubkey', pubkeyHex: PK, address: ADDR }, { kind: 'opening' });
        expect(new Set([never, stopped, opening]).size).toBe(3);
        for (const line of [never, stopped]) {
            expect(line.toLowerCase()).not.toContain('showing');
        }
    });
});

describe('a-window-row-says-which-rail-it-is-on', () => {
    /**
     * With `show=all` a wall rotates between a covenant's asked amount and the
     * seller's own quote. This module's own reason for never merging the rails
     * is that there is "no tab to press to ask which figure is which" — and
     * the first version then dropped the only per-row thing that answers it.
     * Both shop rows carry one; so must these.
     */
    it('labels a listing and a quote', () => {
        const listing = paint(windowView({ show: 'listings', mode: 'browse' }));
        expect(listing.querySelector('[data-role="rail-label"]')?.textContent).toBe(
            copy.ROW_LABEL_AGORA,
        );
        const quote = paint(
            windowView({ show: 'quotes', mode: 'browse' }, {
                prices: new Map([[BEANS, { code: 'xec', exponent: 2, amount: 500_000n }]]),
            } as unknown as Partial<StallView>),
        );
        expect(quote.querySelector('[data-role="rail-label"]')?.textContent).toBe(
            copy.ROW_LABEL_PAY,
        );
    });
});

describe('the-window-listings-rail-says-its-own-outcome', () => {
    /**
     * The twin rail has taken its own read since it shipped, and its docblock
     * gives the reason: "On a wall in a shop that blank reads as the seller's
     * inventory." The listings rail could not say it — `windowOutcome` took
     * no read at all — so a shelf whose every item this page withholds (§4),
     * or whose every item the freeze drops, printed "Showing listings" over a
     * blank strip. That is the empty-versus-unreachable collapse this project
     * forbids everywhere else, on the screen with nobody standing at it.
     *
     * Only the empty case speaks. A partly hidden shelf still shows goods, so
     * "Showing listings" is true of it, and the lock line is worth more there
     * than a count.
     */
    const WITHHELD = '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0';

    const stateOf = (over: Partial<StallView>, opts: WindowOpts): string =>
        paint(windowView(opts, { windowRail: 'listings', ...over }))
            .querySelector('[data-role="window-state"]')!.textContent!;

    it('does not call a wholly withheld shelf a shelf it is showing', () => {
        const said = stateOf(
            {
                tokens: new Map([tokenMeta(WITHHELD, 'Impersonator')]),
                fetch: { kind: 'offers', offers: [offer(WITHHELD, 100)] },
            } as unknown as Partial<StallView>,
            { show: 'listings', mode: 'cycle' },
        );
        expect(said).toBe('Nothing here this screen can show');
        expect(said, 'never a claim about the seller').not.toContain('Nothing listed');
    });

    it('does not call a shelf the freeze emptied a shelf it is showing', () => {
        const said = stateOf({}, { show: 'listings', mode: 'cycle', upto: 1 });
        expect(said).toBe('Nothing here this screen can show');
    });

    it('still says it is showing listings, with the lock, when it is', () => {
        expect(stateOf({}, { show: 'listings', mode: 'cycle', upto: 874_213 })).toBe(
            'Showing listings \u00b7 locked at block 874,213',
        );
    });
});

describe('the-lock-line-is-the-listings-rails-alone', () => {
    /**
     * The freeze is listings-only by construction: `recordIsStalls` demands
     * the stall's own signature and a 546-sat self-output, so nobody can
     * plant a quote, and the sheet that composes this link says it out loud
     * — `WINDOW_LOCK_WHY`: "Your own quotes are never locked: nobody else
     * can add one."
     *
     * `statusBar` passed `params.upto` for BOTH rails, so a `show=all` link
     * with a freeze on — the sheet composes exactly that — printed
     * "Showing quotes · locked at block 874,213" on a wall in a shop, the
     * screen contradicting its own composer with nobody standing there to
     * ask (2026-09-20). The string was asserted nowhere; it is asserted
     * here, on both rails, so the two cannot drift apart again.
     */
    const stateOf = (rail: 'listings' | 'quotes'): string =>
        paint(
            windowView({ show: 'all', mode: 'cycle', upto: 874_213 }, {
                windowRail: rail,
                // A quote the rail can paint, so the outcome line stays out
                // of the way and `windowState`'s own sentence is what is
                // measured. With nothing quoted the rail says so instead,
                // which is the case the sibling describe already covers.
                prices: new Map([[BEANS, { code: 'xec', exponent: 2, amount: 500_000n }]]),
                descriptions: new Map([[BEANS, 'Half a kilo, roasted Tuesday']]),
            } as unknown as Partial<StallView>),
        ).querySelector('[data-role="window-state"]')!.textContent!;

    it('names the lock on the listings rail', () => {
        expect(stateOf('listings')).toBe('Showing listings \u00b7 locked at block 874,213');
    });

    it('never names it on the quotes rail', () => {
        const said = stateOf('quotes');
        expect(said).toBe('Showing quotes');
        expect(said, 'the sheet promises a quote is never locked').not.toContain('locked');
    });
});

describe('the-window-quotes-rail-says-its-own-outcome', () => {
    /**
     * §4's rule — neither rail lends the other its words — reaching the one
     * screen with nobody standing at it. The quotes rail printed "Showing
     * quotes" over a blank strip whatever had happened: a walk that failed,
     * a walk that stopped at our own page cap, a walk that had not answered,
     * a seller who quoted nothing, and a rail this page holds back entirely
     * all looked identical on a wall in a shop. Four of those five are OURS,
     * and a blank wall reads as the seller's inventory.
     */
    const quotesWindow = (over: Partial<StallView>): string =>
        paint(
            windowView({ show: 'quotes', mode: 'cycle' }, { windowRail: 'quotes', ...over }),
        ).querySelector('[data-role="window-state"]')!.textContent!;

    it('says a failed walk, and never that the seller quoted nothing', () => {
        const said = quotesWindow({ prices: new Map(), descriptionsFailed: true });
        expect(said).toBe('This screen could not read the quotes');
        expect(said).not.toContain('Nothing quoted');
    });

    it('says a walk that stopped at our own cap', () => {
        expect(quotesWindow({ prices: new Map(), descriptionsTruncated: true })).toBe(
            'This screen read only part of the quotes',
        );
    });

    it('says it is still reading before any record has landed', () => {
        // `prices` undefined is the failure screen's own window: no record of
        // the seller's has been read, so nothing may be said about them.
        const said = quotesWindow({ prices: undefined });
        expect(said).toBe('Reading the quotes…');
        expect(said).not.toContain('Nothing quoted');
    });

    it('says nothing quoted only over a complete, empty read', () => {
        expect(quotesWindow({ prices: new Map() })).toBe('Nothing quoted yet');
    });

    it('a rail this page holds back entirely does not say the seller quoted nothing', () => {
        // One quote, on a token whose genesis never arrived: `quotedItems`
        // yields no row and `unreadableQuotes` counts it.
        const said = quotesWindow({
            prices: new Map([[JUNK, { code: 'usd', exponent: 2, amount: 500n }]]),
            tokens: new Map(),
        });
        expect(said).toBe('Nothing here this screen can show');
        expect(said).not.toContain('Nothing quoted');
    });

    it('a partly hidden rail counts what it is not showing', () => {
        const said = quotesWindow({
            prices: new Map([
                [BEANS, { code: 'usd', exponent: 2, amount: 500n }],
                [JUNK, { code: 'usd', exponent: 2, amount: 900n }],
            ]),
        });
        expect(said).toBe('Showing quotes · 1 not shown here');
    });
});

describe('the-window-asks-for-the-size-its-own-tile-paints', () => {
    /**
     * The cycle card's tile is `clamp(200px, 40vh, 460px)` — one item on a
     * television — and it asked for the item face's 256, which is the same
     * softness the row size was raised to fix, two doublings later and read
     * across a room. Browse keeps 256: its tile is 72–160px and it paints
     * the whole catalogue, so the wall size there would be ~315KB a row for
     * nothing (§4's rule that a bigger ask is never free).
     *
     * The Worker is the enforcement — `client-path-matches-worker-route` is
     * what fails if only one side learns a size — and it **deploys first**,
     * or every window tile asks a route that 404s and paints letters.
     */
    /*
     * `itemIcon` paints initials and swaps the picture in only ON LOAD, so
     * nothing observable lands in the tree here — what is measured is the
     * request itself, the way `icon-src-is-set-once-per-token-and-size`
     * measures it: the detached `Image` the module builds per token AND size.
     */
    const asked = (mode: WindowParams['mode']): string[] => {
        resetIconsForTests();
        const made: HTMLImageElement[] = [];
        const Original = window.Image;
        vi.stubGlobal('Image', function Probed(w?: number, h?: number): HTMLImageElement {
            const img = new Original(w, h);
            made.push(img);
            return img;
        });
        try {
            paint(windowView({ show: 'listings', mode }));
        } finally {
            vi.unstubAllGlobals();
        }
        return made.map((img) => img.getAttribute('src') ?? '');
    };

    it('a cycle card asks for the wall size', () => {
        const srcs = asked('cycle');
        expect(srcs.length, 'the window asked for a picture at all').toBeGreaterThan(0);
        expect(srcs.every((src) => src.includes('/icon/512/'))).toBe(true);
    });

    it('a browse wall keeps the hero size', () => {
        const srcs = asked('browse');
        expect(srcs.length).toBeGreaterThan(0);
        expect(srcs.every((src) => src.includes('/icon/256/'))).toBe(true);
    });
});

describe('the-quote-code-is-a-switch-and-the-listings-code-is-not-its-business', () => {
    /**
     * A shop that takes payment at the counter wants the screen to be a
     * price board: the figure the seller quoted, and nothing on the wall a
     * customer can scan to pay from where they stand (owner, 2026-09-19).
     *
     * It is the **quote** code alone. A listing's code opens that token's
     * page in Cashtab, which pays nobody and names no maker (§2), and the
     * shop's own code in `browse` opens this stall — two different roads,
     * and a switch that took them too would be a promise its own words do
     * not make.
     */
    const quotesView = (payCode: boolean): StallView =>
        windowView(
            { show: 'quotes', mode: 'cycle', payCode },
            {
                windowRail: 'quotes',
                prices: new Map([[BEANS, { code: 'usd', exponent: 2, amount: 500n }]]),
            },
        );

    it('paints the pay code when the switch is on', () => {
        const root = paint(quotesView(true));
        expect(root.querySelector('.sw-qr')).not.toBeNull();
        expect(root.querySelector('[data-role="seller-price"]')).not.toBeNull();
    });

    it('paints the figure and no code when the switch is off', () => {
        const root = paint(quotesView(false));
        expect(root.querySelector('.sw-qr')).toBeNull();
        // The item is still on the wall — this is a price board, not a blank.
        expect(root.querySelector('[data-role="seller-price"]')?.textContent).toContain('5');
    });

    it('keeps the card at wall size with the code off', () => {
        /*
         * `cycle` and `withCode` were ONE argument while the code was
         * unconditional, and that argument also chose the icon size. Turning
         * the code off must not shrink the picture on a price board — which
         * is exactly what the un-split version did, silently.
         */
        resetIconsForTests();
        const made: HTMLImageElement[] = [];
        const Original = window.Image;
        vi.stubGlobal('Image', function Probed(w?: number, h?: number): HTMLImageElement {
            const img = new Original(w, h);
            made.push(img);
            return img;
        });
        try {
            paint(quotesView(false));
        } finally {
            vi.unstubAllGlobals();
        }
        const srcs = made.map((img) => img.getAttribute('src') ?? '');
        expect(srcs.length, 'the card asked for a picture').toBeGreaterThan(0);
        expect(srcs.every((src) => src.includes('/icon/512/'))).toBe(true);
    });

    it('a listing card keeps its code whatever the quote switch says', () => {
        const root = paint(windowView({ show: 'listings', mode: 'cycle', payCode: false }));
        expect(root.querySelector('.sw-qr')).not.toBeNull();
    });
});

describe('the-render-gate-and-the-overlay-gate-ask-one-question', () => {
    /**
     * The render gate grew a width term on 2026-09-18 — a phone is not a wall
     * — and `overlayAllowed` kept the width-blind clause beside it. So a
     * `?view=window` link opened narrow painted the ordinary stall AND
     * refused every sheet at the same time: controls on screen, none of them
     * opening anything, and a Pay press still asking two third parties for a
     * rate before mounting nothing (measured 2026-09-20).
     *
     * Asking the width in each predicate fixed that and bought worse: a
     * viewport crossing the floor with a sheet open flipped `holdsLivePaint`
     * and the next socket tick threw the half-written record away. So the
     * width left the predicates entirely — `boot` settles it once per page
     * and writes it onto the view, and `app.window.test.ts` drives that end.
     *
     * What is left here is the invariant that was actually broken: the two
     * gates ask ONE question of ONE view. Wherever the wall paints, no sheet
     * mounts; wherever it does not, a sheet the reader asked for does.
     */
    const withPaySheet = (over: Partial<StallView>): StallView =>
        ({
            ...windowView({ show: 'all', mode: 'cycle' }),
            overlay: { kind: 'pay', tokenId: BEANS },
            prices: new Map([[BEANS, { code: 'xec', exponent: 2, amount: 500_000n }]]),
            descriptions: new Map([[BEANS, 'Half a kilo, roasted Tuesday']]),
            ...over,
        }) as unknown as StallView;

    it('paints the wall and mounts no sheet on it', () => {
        const view = withPaySheet({});
        const root = paint(view);
        expect(root.querySelector('.stall.shop-window'), 'the wall').not.toBeNull();
        expect(overlayMounts(view), 'the wall mounts no sheet').toBe(false);
        expect(holdsLivePaint(view), 'and nothing on it holds the live paint').toBe(false);
    });

    it('paints the ordinary stall and mounts its sheets when the view is not a wall', () => {
        // What `boot` hands a paint below the floor: the same link, the same
        // route, and no `window` on the view.
        const view = withPaySheet({ window: undefined });
        const root = paint(view);
        expect(root.querySelector('.stall.shop-window'), 'not the wall').toBeNull();
        expect(overlayMounts(view), 'a sheet the reader asked for opens').toBe(true);
        expect(holdsLivePaint(view), 'and it holds the live paint like any sheet').toBe(true);
        expect(
            root.querySelector('[data-role="sheet-scrim"]'),
            'the sheet is in the tree, not merely allowed',
        ).not.toBeNull();
    });
});

describe('a-switch-says-which-way-it-is-set', () => {
    /**
     * `aria-pressed` was the whole state and nothing painted it: `stall.css`
     * has no base rule for it, and the look-scoped
     * `.t-* .mini[aria-pressed='true']` exists on two of the three looks — so
     * on the third a seller pressed the code switch and nothing on screen
     * changed (owner, 2026-09-19). The freeze switch had the same hole and
     * got away with it, because turning it on reveals the height field and
     * the consequence stood in for the state.
     *
     * The state is CONTENT now. A colour can be lost to a look, a mood, a
     * decoration over the sheet or a reader who cannot see it; two words
     * cannot.
     */
    // The sheet is the SELLER's side of the glass, so it paints on an
    // ordinary stall — `window: undefined` — and never on the window itself,
    // which mounts no overlay at all.
    const sheetOf = (): HTMLElement => {
        const view = windowView({ show: 'all', mode: 'cycle' });
        const root = document.createElement('div');
        renderStall(
            root,
            { ...view, window: undefined, overlay: { kind: 'shop-window' } } as StallView,
            handlers(),
        );
        return root;
    };

    for (const [role, opens] of [
        ['window-paycode-switch', true],
        ['window-lock-switch', false],
    ] as const) {
        it(`${role} carries its state in words`, () => {
            const root = sheetOf();
            const sw = root.querySelector<HTMLButtonElement>(`[data-role="${role}"]`);
            expect(sw, 'the switch is on the sheet').not.toBeNull();
            const state = sw!.querySelector(`[data-role="${role}-state"]`);
            expect(state, 'the state is a node, not only an attribute').not.toBeNull();
            expect(sw!.getAttribute('aria-pressed')).toBe(String(opens));
            expect(state!.textContent).toBe(
                opens ? copy.WINDOW_SWITCH_ON : copy.WINDOW_SWITCH_OFF,
            );

            sw!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            expect(sw!.getAttribute('aria-pressed')).toBe(String(!opens));
            expect(state!.textContent, 'the words follow the press').toBe(
                opens ? copy.WINDOW_SWITCH_OFF : copy.WINDOW_SWITCH_ON,
            );
        });
    }

    /**
     * The control that actually decides `upto` was left out of the 09-19 fix
     * (2026-09-20). It was a bare `.mini` whose whole state was
     * `aria-pressed`, so on the one look that re-states nothing for that
     * attribute — Neo — pressing the lock changed nothing on screen: the
     * same defect, on the control where being wrong costs a seller a
     * stranger's goods on their wall all afternoon.
     *
     * Its truth is conditional, which is why it is not in the loop above: a
     * press over a height the parse refuses must leave BOTH halves saying
     * off. Setting the attribute alone is the failure this rule is about,
     * inverted — so the words are what this asserts.
     */
    it('window-lock carries its state in words, and a refused height leaves it off', () => {
        const root = sheetOf();
        const press = root.querySelector<HTMLButtonElement>('[data-role="window-lock"]')!;
        const state = press.querySelector('[data-role="window-lock-state"]');
        const field = root.querySelector<HTMLInputElement>('[data-role="window-lock-height"]')!;
        expect(state, 'the lock states itself in content, not only in an attribute').not.toBeNull();
        expect(state!.textContent).toBe(copy.WINDOW_SWITCH_OFF);

        field.value = '874,213';
        field.dispatchEvent(new Event('input'));
        press.click();
        expect(press.getAttribute('aria-pressed')).toBe('false');
        expect(state!.textContent, 'a refused height leaves the words off too').toBe(
            copy.WINDOW_SWITCH_OFF,
        );

        field.value = '874213';
        field.dispatchEvent(new Event('input'));
        expect(state!.textContent, 'and a height it can read turns them on').toBe(
            copy.WINDOW_SWITCH_ON,
        );

        // And the press still toggles: the control asks its owner's flag, not
        // the attribute `settle` may have corrected under it.
        press.click();
        expect(state!.textContent, 'a second press turns it back off').toBe(
            copy.WINDOW_SWITCH_OFF,
        );
    });

    it('a press over a refused height does not strand the lock on', () => {
        /*
         * The `current` callback, pinned (QA, 2026-09-20: deleting
         * `() => locked` left this file green, because the case above presses
         * once and stops).
         *
         * Without it the press derives its next state from the attribute —
         * which `settle` has just corrected to `false` over a height the
         * parse refuses — so a second press sets `locked` true AGAIN instead
         * of toggling it off. The seller then fixes the height and the link
         * gains an `upto` they pressed twice to be rid of.
         */
        const root = sheetOf();
        const press = root.querySelector<HTMLButtonElement>('[data-role="window-lock"]')!;
        const field = root.querySelector<HTMLInputElement>('[data-role="window-lock-height"]')!;
        const link = root.querySelector<HTMLInputElement>('[data-role="shop-window-link"]')!;

        field.value = '874,213';
        field.dispatchEvent(new Event('input'));
        press.click(); // on, but refused — both halves read off
        press.click(); // off, and it must MEAN off

        field.value = '874213';
        field.dispatchEvent(new Event('input'));
        expect(
            press.getAttribute('aria-pressed'),
            'a readable height must not revive a lock that was pressed off',
        ).toBe('false');
        expect(link.value, 'and the link carries no upto nobody asked for').not.toContain('upto');
    });
});

describe('a-screen-hung-sideways-turns-itself-and-the-layout-follows', () => {
    /**
     * An old television hung vertically, driven by a computer that still
     * sends a landscape picture (owner, 2026-09-19). The OS cannot always
     * rotate the output and the browser reports the VIEWPORT, so nothing the
     * page could measure would know — the seller tells it, and the page turns
     * itself a quarter.
     *
     * The layout has to follow, which is why `window.css` asks a **container**
     * and not `@media`: turned, the painted box is 100vh wide by 100vw tall
     * while the viewport stays landscape, so every orientation rule and every
     * `cqw`/`cqh` reads the box that is painted. That half cannot be asserted
     * in happy-dom — it has no layout — so `pnpm test:layout` carries it and
     * this pins the wiring: the attribute the stylesheet selects on.
     */
    const frameOf = (turn: WindowParams['turn']): HTMLElement =>
        paint(windowView({ show: 'listings', mode: 'cycle', turn })).querySelector(
            '.stall.shop-window',
        ) as HTMLElement;

    it('stamps the direction on the frame the stylesheet selects', () => {
        expect(frameOf('cw').getAttribute('data-turn')).toBe('cw');
        expect(frameOf('ccw').getAttribute('data-turn')).toBe('ccw');
    });

    it('carries no attribute at all when nothing is turned', () => {
        // The absent case must carry no rule: an untouched screen does not
        // pay for a transform, a fixed position or a container it never
        // asked for.
        expect(frameOf('none').hasAttribute('data-turn')).toBe(false);
    });

    it('names the direction in the link and omits the default', () => {
        const base = 'https://stall.cash/s/qpjq';
        expect(
            windowLinkFor({ show: 'all', mode: 'cycle', payCode: true, turn: 'cw', touch: false }, base),
        ).toBe(`${base}?view=window&turn=cw`);
        expect(
            windowLinkFor({ show: 'all', mode: 'cycle', payCode: true, turn: 'ccw', touch: false }, base),
        ).toBe(`${base}?view=window&turn=ccw`);
        expect(
            windowLinkFor({ show: 'all', mode: 'cycle', payCode: true, turn: 'none', touch: false }, base),
        ).toBe(`${base}?view=window`);
    });

    it('offers both directions on the sheet, and opens on neither', () => {
        const view = windowView({ show: 'all', mode: 'cycle' });
        const root = document.createElement('div');
        renderStall(
            root,
            { ...view, window: undefined, overlay: { kind: 'shop-window' } } as StallView,
            handlers(),
        );
        const pressed = (value: string): string | null =>
            root
                .querySelector(`[data-role="window-turn-${value}"]`)
                ?.getAttribute('aria-pressed') ?? null;
        expect(pressed('none'), 'a screen that needs nothing is the default').toBe('true');
        expect(pressed('cw')).toBe('false');
        expect(pressed('ccw')).toBe('false');
    });
});

describe('the-shop-window-sheet-groups-its-controls-and-copies-the-link', () => {
    /**
     * Round 16: the same controls, four groups — what the screen shows, a
     * preview that follows the mode in words, the lock, and opening it —
     * and a copy control beside the two ways to open, with the share
     * link's own clipboard fallback.
     */
    it('paints the four groups in order and a preview caption that follows the pickers', () => {
        const view = windowView({ show: 'all', mode: 'cycle' });
        const root = document.createElement('div');
        renderStall(root, { ...view, window: undefined, overlay: { kind: 'shop-window' } } as StallView, handlers());
        const groups = [...root.querySelectorAll('[data-role^="window-group-"]')].map((g) => g.getAttribute('data-role'));
        expect(groups).toEqual(['window-group-show', 'window-group-preview', 'window-group-lock', 'window-group-open']);
        const cap = root.querySelector('[data-role="window-preview-cap"]')!;
        expect(cap.textContent).toContain('Cycle');
        expect(cap.textContent).toContain('All');
        (root.querySelector('[data-role="window-mode-browse"]') as HTMLButtonElement).click();
        expect(cap.textContent).toContain('Browse');
        expect(root.querySelector('[data-role="window-preview"]')?.getAttribute('data-mode')).toBe('browse');
        const copyBtn = root.querySelector('[data-role="shop-window-copy"]')!;
        expect(copyBtn.closest('[data-role="window-group-open"]')).not.toBeNull();
        expect(copyBtn.querySelector('svg.ic')).not.toBeNull();
        const link = root.querySelector('[data-role="shop-window-link"]') as HTMLInputElement;
        expect(link.value).toContain('mode=browse');
    });
});

describe('the-shop-window-door-paints-at-every-width-and-a-phone-only-copies', () => {
    /**
     * The owner, 2026-09-26: the door was desk-only by width and a seller on
     * a phone — which is where they are — found no way to the shop window
     * and nothing saying why. It paints at every width now; on a phone its
     * sheet keeps the link and Copy link and hides "Open here" and "Open in a
     * new tab", which would open the ordinary stall there (the wall starts at
     * `WINDOW_MIN_PX`). happy-dom lays nothing out, so the rules are read
     * from the sheet that carries them, like `the-phone-qr-is-a-desk-fold`.
     */
    const css = (): string =>
        readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'stall.css'), 'utf8');

    it('never hides the door by width', () => {
        expect(css()).not.toMatch(/\.tool\[data-tool='window'\]\s*\{[^}]*display:\s*none/);
    });

    it('hides the two ways to open below the desk width and nothing else', () => {
        const blocks = css().split('@media (max-width: 679.98px)').slice(1);
        const phone = blocks.find((b) => b.includes('shop-window-open-here')) ?? '';
        const rule = /([^{}]+)\{\s*display:\s*none;?\s*\}/.exec(phone);
        expect(rule, 'a phone-only rule hides the open controls').not.toBeNull();
        const selectors = rule![1]!.split(',').map((x) => x.trim());
        expect(selectors.sort()).toEqual([
            "[data-role='shop-window-open-here']",
            "[data-role='shop-window-open-tab']",
        ]);
        expect(css()).not.toMatch(/shop-window-copy'\][^{]*\{[^}]*display:\s*none/);
    });

    it('still builds all three controls, so the desk keeps both ways to open', () => {
        const view = windowView({ show: 'all', mode: 'cycle' });
        const root = document.createElement('div');
        renderStall(root, { ...view, window: undefined, overlay: { kind: 'shop-window' } } as StallView, handlers());
        for (const role of ['shop-window-open-here', 'shop-window-open-tab', 'shop-window-copy']) {
            expect(root.querySelector(`[data-role="${role}"]`), role).not.toBeNull();
        }
    });
});

describe('the-window-row-says-the-surcharge', () => {
    /**
     * The wall is one of the three unattended surfaces (paper, stream, wall)
     * that print `seller-price`, which is why the surcharge byte lives on the
     * quote's own record: a customer reading a figure off a screen in a shop
     * has nobody to ask what the pay sheet will add. The line is the seller's
     * record, in the foot under the figure; nothing here composes it — a
     * composed figure needs a quantity, and a wall has no buyer at it.
     */
    it('prints the seller’s surcharge line under the quote and never a composed figure', () => {
        const root = paint(
            windowView({ show: 'quotes', mode: 'browse' }, {
                prices: new Map([[BEANS, { code: 'xec', exponent: 2, amount: 500_000n, surchargePct: 5 }]]),
            } as unknown as Partial<StallView>),
        );
        expect(root.querySelector('[data-role="seller-price"]')?.textContent).toBe('5,000.00 XEC');
        expect(root.querySelector('.item-foot [data-role="quote-surcharge"]')?.textContent).toBe(
            copy.quoteSurchargeLine(5),
        );
        expect(root.textContent ?? '').not.toContain('5,250');
        expect(root.querySelector('[data-role="quote-surcharge"] button, [data-role="quote-surcharge"] a')).toBeNull();
    });

    it('mounts no line when the record carries none', () => {
        const root = paint(
            windowView({ show: 'quotes', mode: 'browse' }, {
                prices: new Map([[BEANS, { code: 'xec', exponent: 2, amount: 500_000n }]]),
            } as unknown as Partial<StallView>),
        );
        expect(root.querySelector('[data-role="seller-price"]')).not.toBeNull();
        expect(root.querySelector('[data-role="quote-surcharge"]')).toBeNull();
    });
});

describe('the-touch-walls-controls-keep-their-own-floor', () => {
    /**
     * `every-tappable-control-keeps-a-44px-floor` reads `stall.css` alone,
     * and the wall's controls live in `window.css` — so two documents said
     * this was pinned here and nothing was (the critic's P2-8). A wall's
     * control is pressed at arm's length rather than by a thumb at reading
     * distance, so the floor is 72px rather than 44, declared in each
     * control's own block the way the shared list demands.
     */
    it('declares 72px in window.css for the stepper and the strip’s two buttons', () => {
        const css = readFileSync(
            join(dirname(fileURLToPath(import.meta.url)), 'window.css'),
            'utf8',
        );
        const blockOf = (selector: string): string => {
            const at = css.indexOf(selector);
            expect(at, `${selector} has a block of its own`).toBeGreaterThan(-1);
            return css.slice(at, css.indexOf('}', at));
        };
        const stepper = blockOf(".sw-step-b {");
        expect(stepper, 'the stepper is square and at least 72px').toMatch(/min-width:\s*72px/);
        expect(stepper).toMatch(/min-height:\s*72px/);
        expect(blockOf(".sw-sel-btn {"), 'Clear all and Pay').toMatch(/min-height:\s*clamp\(72px/);
        // The phone's 44px is a thumb's floor and belongs to `stall.css`;
        // nothing in this sheet may declare a control smaller than the
        // wall's own.
        expect(stepper).not.toMatch(/min-(?:width|height):\s*(?:[0-6]?\d)px/);
    });
});

describe('a-touch-wall-counts-in-one-unit-and-says-the-other-rails-road', () => {
    /**
     * The customer's own half (2026-09-21, the owner's ask; the design is
     * `private/design/touch-2026-09-21/`). One unit per payment — the
     * phone's `selectionUnit`, the same code — so a row in another unit
     * paints no stepper and names the road it does have: in `browse` no row
     * carries a code of its own, so the phone's "paid on its own" would
     * point at nothing (the critic's P2-13).
     */
    const wall = (over: Partial<StallView> = {}) =>
        paint(
            windowView(
                { show: 'quotes', mode: 'browse', touch: true },
                {
                    prices: new Map([
                        [BEANS, QUOTE_USD],
                        [TEA, QUOTE_XEC],
                    ]),
                    ...over,
                },
            ),
        );
    const rowOf = (root: HTMLElement, tokenId: string): HTMLElement =>
        [...root.querySelectorAll<HTMLElement>('.item')].find((row) =>
            row.querySelector(`[data-role="window-step-more"][data-focus-key$="${tokenId}"]`) !== null ||
            (row.textContent ?? '').includes(tokenId === BEANS ? 'Roasted Beans' : 'Green Tea'),
        )!;

    it('every row steps while nothing is chosen, and one unit closes the other out', () => {
        const empty = wall();
        expect(empty.querySelectorAll('[data-role="window-step-more"]')).toHaveLength(2);
        expect(empty.querySelector('.sw-apart')).toBeNull();

        const chosen = wall({ selection: new Map([[BEANS, 2n]]) });
        const beans = rowOf(chosen, BEANS);
        const tea = rowOf(chosen, TEA);
        expect(beans.querySelector('[data-role="window-step-more"]')).not.toBeNull();
        expect(beans.querySelector('.item-head')?.classList.contains('sw-in')).toBe(true);
        expect(beans.querySelector('.sw-step-n')?.textContent).toBe('2');
        expect(beans.querySelector('.sw-step-n')?.getAttribute('aria-hidden')).toBe('true');
        expect(tea.querySelector('[data-role="window-step-more"]'), 'another unit steps nothing').toBeNull();
        expect(tea.querySelector('.sw-apart')?.textContent).toBe(copy.windowApart('XEC'));
        // The count rides the two buttons' names, the phone's rule.
        expect(beans.querySelector('[data-role="window-step-fewer"]')?.getAttribute('aria-label')).toBe(
            copy.selectionFewer('Roasted Beans', '2'),
        );
    });

    it('the steppers drive the phone’s own handler, and “−” at one asks nothing', () => {
        const root = wall({ selection: new Map([[BEANS, 1n]]) });
        const set = paintedHandlers.onSelectionSet as unknown as ReturnType<typeof vi.fn>;
        const fewer = rowOf(root, BEANS).querySelector('[data-role="window-step-fewer"]') as HTMLButtonElement;
        expect(fewer.disabled).toBe(false);
        fewer.click();
        expect(set).toHaveBeenCalledWith(BEANS, 0n);
        // No question anywhere on the wall: the owner's ruling (T-B).
        expect(root.querySelector('[data-role="selection-yes"]')).toBeNull();
        expect(root.querySelector('[data-role="selection-no"]')).toBeNull();
    });
});

describe('a-touch-wall-strip-says-the-total-and-composes-one-payment', () => {
    /**
     * The strip is a row of the frame's own grid — in flow, never sticky —
     * with the glance in the seller's unit (surcharges included, for the eye
     * and never for a link), Clear all, and Pay. The plate that press makes
     * is a SNAPSHOT: nothing on it is read from the view again.
     */
    const chosen = new Map([[BEANS, 2n]]);
    const wall = (over: Partial<StallView> = {}) =>
        paint(
            windowView(
                { show: 'quotes', mode: 'browse', touch: true },
                { prices: new Map([[BEANS, QUOTE_USD]]), selection: chosen, ...over },
            ),
        );

    it('empty, it says how to start; chosen, it totals the records and offers the two controls', () => {
        const empty = wall({ selection: new Map() });
        expect(empty.querySelector('[data-role="window-selection"]')?.textContent).toContain(
            copy.WINDOW_TOUCH_EMPTY,
        );
        expect(empty.querySelector('[data-role="window-pay"]'), 'nothing to pay for').toBeNull();

        const root = wall();
        const bar = root.querySelector('[data-role="window-selection"]')!;
        expect(bar.querySelector('.sw-sel-n')?.textContent).toBe('Roasted Beans ×2');
        expect(bar.querySelector('.sw-sel-c')?.textContent).toBe(copy.selectionCountLine(2));
        // 2 × $5.00, the surcharge on the product, rounded once: $10.50.
        expect(bar.querySelector('[data-role="selection-total"]')?.textContent).toBe('$10.50');
        expect(bar.querySelector('.sw-sel-s')?.textContent).toBe(copy.SELECTION_NOTE_SURCHARGE);
        expect(bar.querySelector('[data-role="window-clear"]')?.textContent).toBe(copy.WINDOW_CLEAR_ALL);
        expect(bar.querySelector('[data-role="window-pay"]')?.textContent).toBe(copy.WINDOW_PAY);
        // In flow: the strip is a grid row, never an absolutely placed bar.
        expect(bar.parentElement?.getAttribute('data-role')).toBe('shop-window');
    });

    it('says it is asking between the press and the code, and says why a feed refused', () => {
        const asking = wall({ payRateAsking: true } as Partial<StallView>);
        expect(asking.querySelector('[data-role="window-pay-why"]')?.textContent).toBe(copy.WINDOW_PAY_ASKING);
        // The wall's own sentences: the phone's name a link this screen does
        // not have, and the control they name here is one a customer can press.
        expect(copy.WINDOW_PAY_ASKING).not.toContain('link');
        for (const why of ['no-answer', 'implausible'] as const) {
            const refused = wall({ payRateWhy: why } as Partial<StallView>);
            expect(refused.querySelector('[data-role="window-pay-why"]')?.textContent).toBe(
                copy.WINDOW_PAY_WHY_TEXT[why],
            );
            expect(copy.WINDOW_PAY_WHY_TEXT[why]).toContain(copy.WINDOW_PAY);
        }
        // A figure the network would not relay is said, not swallowed.
        const dust = wall({ windowPaySubDust: true } as Partial<StallView>);
        expect(dust.querySelector('[data-role="window-pay-why"]')?.textContent).toBe(
            copy.PAY_SUB_DUST_SEVERAL,
        );
        // With a payment standing, the refusal that priced it is history.
        const paid = wall({
            payRateWhy: 'no-answer',
            windowPaying: {
                sats: 52_500_000n,
                uri: `${ADDR}?amount=525000.00`,
                selection: chosen,
                prices: new Map([[BEANS, QUOTE_USD]]),
                names: new Map([[BEANS, 'Roasted Beans']]),
                borrowed: new Set<string>(),
                unit: 'usd',
                atMs: Date.now(),
            },
        } as unknown as Partial<StallView>);
        expect(paid.querySelector('[data-role="window-pay-why"]')).toBeNull();
    });

    it('the plate paints the snapshot, carries the URI where the payee sweep reads it, and gives the slot back', () => {
        const paying = {
            sats: 525_000n,
            uri: `ecash:${ADDR.slice(6)}?amount=5250.00`,
            selection: chosen,
            prices: new Map([[BEANS, QUOTE_USD]]),
            names: new Map([[BEANS, 'Roasted Beans']]),
            borrowed: new Set<string>(),
            unit: 'usd',
            rate: { rate: 2_000n, atMs: Date.UTC(2026, 8, 21, 12, 3, 20) },
            atMs: Date.UTC(2026, 8, 21, 12, 3, 20),
        };
        const root = wall({ windowPaying: paying } as Partial<StallView>);
        const plate = root.querySelector('[data-role="window-paying"]')!;
        expect(plate.getAttribute('data-pay-uri'), 'the sweep can read the payee').toBe(paying.uri);
        expect(plate.querySelector('[data-role="price"]')?.textContent).toContain('5,250');
        expect(plate.querySelectorAll('[data-role="pay-lines"] .sw-pay-line')).toHaveLength(1);
        expect(plate.querySelector('[data-role="pay-total"]')?.textContent).toBe(
            copy.paySeveralTotalSurcharged('$10.50'),
        );
        expect(plate.querySelector('[data-role="rate"]')?.textContent).toContain(copy.windowPayGoodFor(2));
        expect(plate.textContent).toContain(copy.PAY_NOTE_FINAL);
        expect(plate.querySelector('[data-role="window-back"]')?.textContent).toBe(copy.WINDOW_PAY_BACK);
        // The wall hands off to nothing: no wallet control, no quantity.
        expect(plate.querySelector('[data-role="pay-cashtab"]')).toBeNull();
        expect(plate.querySelector('[data-role="pay-quantity"]')).toBeNull();
        // One code at a time: the shop's plate is gone while this is up.
        expect(root.querySelector('.sw-plate:not(.sw-paying)')).toBeNull();
        // Over a standing code the press composes the same selection again,
        // which "Pay" says; "Pay again for a fresh price" belongs to the
        // state where the price IS stale — after the rate aged out.
        expect(root.querySelector('[data-role="window-pay"]')?.textContent).toBe(copy.WINDOW_PAY);
        expect(
            wall({ windowPayAged: true } as Partial<StallView>).querySelector('[data-role="window-pay"]')
                ?.textContent,
        ).toBe(copy.WINDOW_PAY_AGAIN);
        // And with no payment the shop's own code is back.
        expect(wall().querySelector('.sw-plate')?.classList.contains('sw-paying')).toBe(false);
    });
});

describe('the-wall-payment-plate-stands-on-the-lists-card', () => {
    /**
     * The band had no ground of its own, so its text — the figure a wallet
     * signs among it — sat on whatever the look paints behind the stall, and
     * Neo's rain crossed a line's figure at 2.89:1 the day the probe first
     * shot this screen at its real 1080 (2026-09-24, `PROBE-RULES.md`). The
     * contrast pass is what proves the ground is there; this pins the two
     * halves it rests on.
     */
    const wall = () =>
        paint(
            windowView(
                { show: 'quotes', mode: 'browse', touch: true },
                {
                    prices: new Map([[BEANS, QUOTE_USD]]),
                    selection: new Map([[BEANS, 2n]]),
                    windowPaying: {
                        sats: 525_000n,
                        uri: `${ADDR}?amount=5250.00`,
                        selection: new Map([[BEANS, 2n]]),
                        prices: new Map([[BEANS, QUOTE_USD]]),
                        names: new Map([[BEANS, 'Roasted Beans']]),
                        borrowed: new Set<string>(),
                        unit: 'usd',
                        atMs: Date.now(),
                    },
                } as unknown as Partial<StallView>,
            ),
        );

    it('wears the class every look dresses its cards through, and nothing a row has', () => {
        const plate = wall().querySelector('[data-role="window-paying"]')!;
        expect(plate.classList.contains('item'), 'the look’s own card').toBe(true);
        // Outside the list, so the rules that dress a ROW of it — Rural's
        // tilt on `.items .item:nth-child` — never reach the payment.
        expect(plate.closest('.items')).toBeNull();
        expect(plate.querySelector('.item-head')).toBeNull();
    });

    it('draws the frame in the slack around the band, so the list keeps its room', () => {
        const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'window.css'), 'utf8');
        const at = css.indexOf('--sw-pay-pad-b:');
        expect(at, 'the plate states its padding once').toBeGreaterThan(-1);
        const block = css.slice(css.lastIndexOf('{', at), css.indexOf('}', at));
        // The margin is the padding plus the looks' 1px card border, so the
        // row the band takes is the height its content takes.
        expect(block).toMatch(/padding:\s*var\(--sw-pay-pad-b\) var\(--sw-pay-pad-i\);/);
        expect(block).toMatch(
            /margin:\s*calc\(-1 \* var\(--sw-pay-pad-b\) - 1px\) calc\(-1 \* var\(--sw-pay-pad-i\) - 1px\);/,
        );
        // `.item` clips, and a clipping grid item has no automatic minimum
        // height: a band taller than the body shrank its row and centred
        // itself up over the sign.
        expect(block).toMatch(/overflow:\s*visible;/);
    });
});

describe('the-touch-switch-is-the-sellers-and-needs-the-pay-code', () => {
    /**
     * One switch on the composing sheet, revealed by Browse (cycle has no
     * list to choose from) and refused while the pay code is off: a price
     * board that takes payment at the counter has nowhere to put a code
     * that pays the quotes a customer picked (the critic's P2-10).
     */
    it('appears under Browse, writes touch=on, and turns itself off with the code', () => {
        const sheet = shopWindowSheet(windowView({ show: 'all', mode: 'cycle' }), () => {});
        const field = () => sheet.querySelector('[data-role="shop-window-link"]') as HTMLInputElement;
        const row = () => sheet.querySelector('[data-role="window-touch-switch"]')!.closest('.sw-touch') as HTMLElement;
        const touch = () => sheet.querySelector('[data-role="window-touch-switch"]') as HTMLButtonElement;
        const state = () => sheet.querySelector('[data-role="window-touch-switch-state"]')?.textContent;
        expect(row().hidden, 'hidden outside Browse, never a control that does nothing').toBe(true);

        (sheet.querySelector('[data-role="window-mode-browse"]') as HTMLButtonElement).click();
        expect(row().hidden).toBe(false);
        expect(state()).toBe(copy.WINDOW_SWITCH_OFF);
        expect(new URL(field().value).searchParams.get('touch')).toBeNull();

        touch().click();
        expect(state()).toBe(copy.WINDOW_SWITCH_ON);
        expect(new URL(field().value).searchParams.get('touch')).toBe('on');

        // The pay code off contradicts it: the switch says off and says why.
        (sheet.querySelector('[data-role="window-paycode-switch"]') as HTMLButtonElement).click();
        expect(state(), 'the correction is painted, not just dropped from the link').toBe(copy.WINDOW_SWITCH_OFF);
        expect(new URL(field().value).searchParams.get('touch')).toBeNull();
        expect(
            (sheet.querySelector('[data-role="window-touch-why"]') as HTMLElement).hidden,
            'the reason is on screen while the code is off',
        ).toBe(false);
    });
});

describe('the-wall-cycle-skips-an-unbuyable-listing', () => {
    /**
     * The owner, 2026-09-24: the Cycle card skips a listing nobody can take
     * (`isUnbuyable`); Browse still lists it, labelled. A card stands twenty
     * seconds on a wall, and an unbuyable one had no figure and no code to
     * give a customer. `cycleListings` is the one derivation — the painter,
     * the driver's step and the status line all read it through
     * `wallListings` — so the cursor can never point at what the card
     * refuses to paint. The driver's own clock is `app.window.test.ts`'s.
     */
    const refused = (tokenId: string): StallOffer => ({ ...offer(tokenId, 100), minAcceptedAtoms: 999n });
    const three = {
        tokens: new Map([tokenMeta(BEANS, 'Roasted Beans'), tokenMeta(TEA, 'Green Tea'), tokenMeta(RYE, 'Rye Flour')]),
        fetch: { kind: 'offers' as const, offers: [offer(BEANS, 100), refused(TEA), offer(RYE, 100)] },
    };

    it('steps over an unbuyable listing between two buyable ones, and Browse still lists it', () => {
        const params: WindowParams = { show: 'listings', mode: 'cycle', payCode: true, turn: 'none', touch: false };
        const view = windowView(params, three as Partial<StallView>);
        expect(cycleListings(view, params).map((l) => l.tokenId).sort()).toEqual([BEANS, RYE].sort());
        expect(wallListings(view, params)).toHaveLength(2);
        const seen = new Set<string>();
        for (const cursor of [0, 1, 2, 3]) {
            const root = paint(windowView(params, { ...three, windowCursor: cursor } as Partial<StallView>));
            seen.add(root.querySelector('.sw-row .item-n')?.textContent ?? '');
            expect(root.textContent).not.toContain(copy.UNBUYABLE_BADGE);
            // The card at the cursor keeps its own code: the skip took the
            // unbuyable card, not the road off a buyable one.
            expect(root.querySelector('.sw-row .sw-qr')).not.toBeNull();
        }
        expect([...seen].sort()).toEqual(['Roasted Beans', 'Rye Flour']);
        const browse = paint(windowView({ show: 'listings', mode: 'browse' }, three as Partial<StallView>));
        expect([...browse.querySelectorAll('.sw-row .item-n')].map((n) => n.textContent)).toContain('Green Tea');
        expect(browse.textContent).toContain(copy.UNBUYABLE_BADGE);
    });

    it('treats a rail whose every listing is unbuyable as empty, and draws no code for it', () => {
        const only = {
            tokens: new Map([tokenMeta(TEA, 'Green Tea')]),
            fetch: { kind: 'offers' as const, offers: [refused(TEA)] },
        };
        const root = paint(windowView({ show: 'listings', mode: 'cycle' }, only as Partial<StallView>));
        expect(root.querySelector('.sw-row')).toBeNull();
        expect(root.querySelector('.sw-qr')).toBeNull();
        expect(root.textContent).not.toContain(copy.WINDOW_SCAN_ITEM);
        expect(root.querySelector('[data-role="window-state"]')?.textContent).toContain('Nothing here this screen can show');
        // And a screen showing both rails never stands on it: the rail it
        // holds resolves to the quotes while the quotes have something, and
        // the wrap does not turn back onto the empty one.
        const both: WindowParams = { show: 'all', mode: 'cycle', payCode: true, turn: 'none', touch: false };
        const quoted = windowView(both, {
            ...only,
            tokens: new Map([tokenMeta(TEA, 'Green Tea'), tokenMeta(BEANS, 'Roasted Beans')]),
            prices: new Map([[BEANS, QUOTE_XEC]]),
        } as Partial<StallView>);
        expect(windowRail(quoted, both, 'listings')).toBe('quotes');
        expect(windowTurns(quoted, both)).toBe(false);
        expect(nextCard(0, 1, windowTurns(quoted, both) ? 'all' : 'quotes', 'quotes')).toEqual({ cursor: 0, rail: 'quotes' });
    });

    /**
     * The freeze meets the skip, stated rather than smoothed (the critic,
     * 2026-09-24). A lock keeps a token by the offers it had at `upto`
     * (`offersWithinLock`), and when the only one it had was a remainder
     * nobody can take, a buyable relist mined after the lock is not let in —
     * it is exactly what a stranger's plant looks like. So that token is off
     * the Cycle until the seller re-locks, and Browse lists it as "Not
     * buyable": fewer of the seller's goods, never a stranger's, which is
     * the direction the freeze fails in.
     */
    it('keeps a token whose only pre-lock offer is unbuyable off the Cycle, relisted or not', () => {
        const stranded = { ...offer(TEA, 100), minAcceptedAtoms: 999n };
        const relisted = { ...offer(TEA, 130), outpoint: { txid: 'e'.repeat(64), outIdx: 1 } };
        const frozen = {
            tokens: new Map([tokenMeta(BEANS, 'Roasted Beans'), tokenMeta(TEA, 'Green Tea')]),
            fetch: { kind: 'offers' as const, offers: [offer(BEANS, 100), stranded, relisted] },
        };
        const cycle: WindowParams = { show: 'listings', mode: 'cycle', upto: 120, payCode: true, turn: 'none', touch: false };
        const view = windowView(cycle, frozen as Partial<StallView>);
        expect(cycleListings(view, cycle).map((l) => l.tokenId)).toEqual([BEANS]);
        const browse = paint(windowView({ ...cycle, mode: 'browse' }, frozen as Partial<StallView>));
        const tea = [...browse.querySelectorAll('.sw-row')].find((row) => row.textContent?.includes('Green Tea'));
        expect(tea?.querySelector('[data-role="unbuyable"]')?.textContent).toBe(copy.UNBUYABLE_BADGE);
        expect(tea?.querySelector('[data-role="price"]')).toBeNull();
    });

    /**
     * The composing sheet does not hand a seller a Cycle wall that shows
     * nothing (the critic, 2026-09-24): a rail with nothing on it was refused
     * at the picker, and the skip made a second road to a blank wall. With
     * every listing unbuyable and nothing quoted, Cycle composes no link and
     * says why; Browse, where they are listed and labelled, composes one.
     */
    it('composes no Cycle wall that would show nothing, and says what to choose', () => {
        const only = {
            tokens: new Map([tokenMeta(TEA, 'Green Tea')]),
            fetch: { kind: 'offers' as const, offers: [refused(TEA)] },
        };
        const sheet = shopWindowSheet(windowView({ show: 'all', mode: 'cycle' }, only as Partial<StallView>), () => {});
        document.body.append(sheet);
        const why = sheet.querySelector<HTMLElement>('[data-role="window-cycle-nothing"]')!;
        const link = sheet.querySelector<HTMLInputElement>('[data-role="shop-window-link"]')!;
        const here = sheet.querySelector<HTMLButtonElement>('[data-role="shop-window-open-here"]')!;
        expect(why.hidden).toBe(false);
        expect(why.textContent).toBe(copy.WINDOW_CYCLE_NOTHING);
        expect(link.value).toBe('');
        expect(here.disabled).toBe(true);
        expect(sheet.querySelector('[data-role="shop-window-open-tab"]')!.hasAttribute('href')).toBe(false);
        sheet.querySelector<HTMLButtonElement>('[data-role="window-mode-browse"]')!.click();
        expect(why.hidden).toBe(true);
        expect(link.value).toContain('mode=browse');
        expect(here.disabled).toBe(false);
        sheet.remove();
    });

    it('offers the quotes as the way out only where the stall quotes something', () => {
        // Nothing quoted: the sentence names Browse alone.
        expect(copy.WINDOW_CYCLE_NOTHING).not.toContain('quote');
        const quoted = {
            tokens: new Map([tokenMeta(TEA, 'Green Tea'), tokenMeta(BEANS, 'Roasted Beans')]),
            fetch: { kind: 'offers' as const, offers: [refused(TEA)] },
            prices: new Map([[BEANS, QUOTE_XEC]]),
        };
        // Listings only, on a stall that does quote: the quotes are a road.
        const sheet = shopWindowSheet(windowView({ show: 'all', mode: 'cycle' }, quoted as unknown as Partial<StallView>), () => {});
        document.body.append(sheet);
        sheet.querySelector<HTMLButtonElement>('[data-role="window-show-listings"]')!.click();
        const why = sheet.querySelector<HTMLElement>('[data-role="window-cycle-nothing"]')!;
        expect(why.hidden).toBe(false);
        expect(why.textContent).toBe(copy.WINDOW_CYCLE_NOTHING_QUOTED);
        sheet.remove();
    });
});

/**
 * A wall payment of `ids`, each a USD quote chosen twice — the plate the
 * three describes below paint. `borrowed` are the items whose genesis names
 * another wallet.
 */
function payingWall(ids: readonly string[], borrowed: readonly string[] = []): HTMLElement {
    const names = new Map(ids.map((id, i) => [id, `Item ${i + 1}`] as const));
    const selection = new Map(ids.map((id) => [id, 2n] as const));
    const prices = new Map(ids.map((id) => [id, QUOTE_USD] as const));
    return paint(
        windowView(
            { show: 'quotes', mode: 'browse', touch: true },
            {
                tokens: new Map(ids.map((id, i) => tokenMeta(id, `Item ${i + 1}`))),
                prices,
                selection,
                windowPaying: {
                    sats: 52_500_000n * BigInt(ids.length),
                    uri: `${ADDR}?amount=${(525_000 * ids.length).toFixed(2)}`,
                    selection,
                    prices,
                    names,
                    borrowed: new Set(borrowed),
                    unit: 'usd',
                    atMs: Date.now(),
                },
            } as unknown as Partial<StallView>,
        ),
    );
}

const SEVERAL = ['61', '62', '63'].map((b) => b.repeat(32));

describe('a-borrowed-item-on-a-wall-payment-is-said-outside-the-scroll', () => {
    /**
     * The payment's lines scroll inside the plate under a cap, and the line
     * that said an item's token was minted by another wallet was one of them:
     * a customer could scan and pay with it scrolled out of view (the critic,
     * 2026-09-24). The sentence stands outside the scroller now, whenever any
     * chosen item is borrowed; the lines keep a mark saying which.
     */
    it('counts the borrowed items outside the lines, and marks each one in them', () => {
        const root = payingWall(SEVERAL, [SEVERAL[1]!]);
        const said = root.querySelector('[data-role="pay-borrowed"]');
        expect(said?.textContent).toBe(copy.windowPayBorrowed(1, 3));
        expect(said?.closest('[data-role="pay-lines"]'), 'outside the scroller').toBeNull();
        expect(said?.closest('[data-role="window-paying"]'), 'on the plate').not.toBeNull();
        const marks = root.querySelectorAll('[data-role="pay-lines"] [data-role="quote-not-minted"]');
        expect(marks).toHaveLength(1);
        expect(marks[0]!.closest('.sw-pay-line')?.textContent).toContain('Item 2');
        expect(copy.windowPayBorrowed(2, 3)).toBe(
            `2 of these 3 items: ${copy.QUOTE_NOT_MINTED_HERE.toLowerCase()} (marked in the list)`,
        );
    });

    it('says one item’s own sentence once, and nothing when nothing is borrowed', () => {
        const one = payingWall([SEVERAL[0]!], [SEVERAL[0]!]);
        expect(one.querySelector('[data-role="pay-borrowed"]')?.textContent).toBe(copy.QUOTE_NOT_MINTED_HERE);
        expect(
            one.querySelector('[data-role="pay-lines"] [data-role="quote-not-minted"]'),
            'one line is the sentence’s own item: not said twice',
        ).toBeNull();
        const none = payingWall(SEVERAL);
        expect(none.querySelector('[data-role="pay-borrowed"]')).toBeNull();
        expect(none.querySelector('[data-role="quote-not-minted"]')).toBeNull();
    });
});

describe('a-payment-list-that-scrolls-says-how-many-lines-it-hides', () => {
    /**
     * The count is geometry — the cap is in pixels (`window.css`) and a
     * line's height is its fonts' — so it is set once the tree is laid out.
     * happy-dom lays nothing out: here the boxes are stubbed, and the probe
     * (`PROBE-RULES.md`) holds the real ones at the three wall sizes.
     */
    const place = (node: Element, top: number, height: number): void => {
        (node as HTMLElement).getBoundingClientRect = () =>
            ({ top, bottom: top + height, left: 0, right: 600, width: 600, height, x: 0, y: top }) as DOMRect;
    };

    it('mounts the line outside the scroller, hidden and silent until it is measured', () => {
        const root = payingWall(SEVERAL);
        const more = root.querySelector<HTMLElement>('[data-role="pay-lines-more"]')!;
        expect(more.closest('[data-role="pay-lines"]'), 'outside the scroller').toBeNull();
        expect(more.hidden, 'an unlaid tree says nothing').toBe(true);
        expect(more.textContent).toBe('');
    });

    it('counts the lines not wholly in the scroller’s box, singular and plural, and nothing when all show', () => {
        const root = payingWall(SEVERAL);
        const lines = root.querySelector<HTMLElement>('[data-role="pay-lines"]')!;
        const more = root.querySelector<HTMLElement>('[data-role="pay-lines-more"]')!;
        Object.defineProperty(lines, 'clientHeight', { value: 120, configurable: true });
        place(lines, 500, 120);
        const rows = [...lines.children];
        // Two whole lines under the cap, the third past it.
        rows.forEach((row, i) => place(row, 500 + i * 60, 57));
        sayHiddenPayLines(root);
        expect(hiddenPayLines(lines)).toBe(1);
        expect(more.hidden).toBe(false);
        expect(more.textContent).toBe(copy.windowPayMore(1));
        expect(copy.windowPayMore(1)).toBe('+1 more item: swipe the list');
        // Scrolled half a line: the first is cut at the top, the third at the
        // foot — neither can be read, so both count.
        rows.forEach((row, i) => place(row, 470 + i * 60, 57));
        lines.dispatchEvent(new Event('scroll'));
        expect(more.textContent).toBe(copy.windowPayMore(2));
        expect(copy.windowPayMore(2)).toBe('+2 more items: swipe the list');
        // A cap tall enough for all three: hidden and silent again.
        Object.defineProperty(lines, 'clientHeight', { value: 200, configurable: true });
        place(lines, 500, 200);
        rows.forEach((row, i) => place(row, 500 + i * 60, 57));
        sayHiddenPayLines(root);
        expect(more.hidden).toBe(true);
        expect(more.textContent).toBe('');
    });
});

describe('the-payment-lines-keep-their-place-across-a-repaint', () => {
    /**
     * `.sw-pay-lines` scrolls inside the plate, and every socket tick and
     * the sixty-second heartbeat rebuild the tree: a customer halfway down
     * thirty-five lines went back to the first (the critic, 2026-09-24).
     * The offset is read off the plate that stood and put back after the
     * tree is connected — never onto the next payment, which starts at its
     * first line.
     */
    const view = (paying: boolean): StallView => {
        const selection = new Map(SEVERAL.map((id) => [id, 2n] as const));
        const prices = new Map(SEVERAL.map((id) => [id, QUOTE_USD] as const));
        return windowView(
            { show: 'quotes', mode: 'browse', touch: true },
            {
                tokens: new Map(SEVERAL.map((id, i) => tokenMeta(id, `Item ${i + 1}`))),
                prices,
                selection,
                ...(paying
                    ? {
                          windowPaying: {
                              sats: 157_500_000n,
                              uri: `${ADDR}?amount=1575000.00`,
                              selection,
                              prices,
                              names: new Map(SEVERAL.map((id, i) => [id, `Item ${i + 1}`] as const)),
                              borrowed: new Set<string>(),
                              unit: 'usd',
                              atMs: Date.now(),
                          },
                      }
                    : {}),
            } as unknown as Partial<StallView>,
        );
    };
    const linesOf = (root: HTMLElement) => root.querySelector<HTMLElement>('.sw-paying .sw-pay-lines')!;

    it('puts the offset back on a repaint, and a new payment starts at its first line', async () => {
        const root = document.createElement('div');
        document.body.append(root);
        renderStall(root, view(true), handlers());
        linesOf(root).scrollTop = 120;
        renderStall(root, view(true), handlers());
        await Promise.resolve();
        expect(linesOf(root).scrollTop, 'a repaint keeps the place').toBe(120);
        // Back: no plate; then Pay again — a new payment, from the top.
        renderStall(root, view(false), handlers());
        renderStall(root, view(true), handlers());
        await Promise.resolve();
        expect(linesOf(root).scrollTop).toBe(0);
        root.remove();
    });
});
