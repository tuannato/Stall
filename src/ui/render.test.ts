// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { BANNED_THEME_PROPS } from '../domain/theme';
import type { Outpoint, StallOffer, StallView, TokenMeta } from '../domain/state';
import {
    DASHED_PRICE,
    EMPTY_TITLE,
    HANDOFF_FINE_PRINT,
    HANDOFF_MAY_PRESELECT,
    HOME_LEDE,
    LINK_UNREADABLE_TITLE,
    OPEN_IN_CASHTAB,
    PRICE_FROM,
    UNBUYABLE_BADGE,
    TRY_AGAIN,
    UNREACHABLE_BODY,
    UNREADABLE_BODY,
    UNRESOLVABLE_TITLE,
    lookForPriceLine,
} from './copy';
import { renderStall } from './render';

const PK =
    '03aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const ADDR = 'ecash:qpjqjm0lasd3k54dmuczp20sr05tsykrlyc3j7hv09';
const TOKEN_ID = 'cd'.repeat(32);
const OUTPOINT: Outpoint = { txid: 'ab'.repeat(32), outIdx: 0 };

const BEANS: TokenMeta = {
    tokenId: TOKEN_ID,
    name: 'Roasted Beans',
    ticker: 'BEAN',
    decimals: 0,
};

const OFFER: StallOffer = {
    outpoint: OUTPOINT,
    tokenId: TOKEN_ID,
    atoms: 12n,
    variant: 'PARTIAL',
    askedSats: 1200n * 100n,
    askedAtoms: 1n,
};

function handlers() {
    return {
        onBuy: vi.fn(),
        onRetry: vi.fn(),
        onCloseSheet: vi.fn(),
    };
}

function paint(view: StallView) {
    const root = document.createElement('div');
    const h = handlers();
    renderStall(root, view, h);
    return { root, h };
}

function idlePubkey(over: Partial<StallView> = {}): StallView {
    return {
        route: { kind: 'pubkey', pubkeyHex: PK, address: ADDR },
        overlay: { kind: 'idle' },
        tokens: new Map(),
        address: ADDR,
        ...over,
    };
}

describe('empty vs unreachable', () => {
    it('empty has "This stall is empty" and no unreachable copy', () => {
        const { root, h } = paint(
            idlePubkey({
                fetch: { kind: 'empty' },
                stallName: "Nato's Corner",
            }),
        );
        const text = root.textContent ?? '';
        expect(text).toContain(EMPTY_TITLE);
        expect(text).not.toContain(UNREACHABLE_BODY);
        expect(text).not.toContain(TRY_AGAIN);
        expect(root.querySelector('button.buy')).toBeNull();
        expect(h.onRetry).not.toHaveBeenCalled();
    });

    it('unreachable has "We can\'t read prices" and must not contain "This stall is empty"', () => {
        const { root } = paint(
            idlePubkey({
                fetch: {
                    kind: 'unreachable',
                    triedAtMs: 0,
                    hosts: [{ host: 'chronik-native1.fabien.cash', result: 'timeout' }],
                },
            }),
        );
        const text = root.textContent ?? '';
        expect(text).toContain(UNREACHABLE_BODY);
        expect(text).not.toContain(EMPTY_TITLE);
        expect(text).toContain('chronik-native1.fabien.cash');
        expect(text).toContain(TRY_AGAIN);
        expect(root.querySelector('button.buy')).toBeNull();
    });

    it('later-visit unreachable keeps cached names, dashed prices, and a disabled buy', () => {
        const { root, h } = paint(
            idlePubkey({
                fetch: {
                    kind: 'unreachable',
                    triedAtMs: Date.UTC(2026, 0, 1, 17, 42, 6),
                    hosts: [{ host: 'chronik-native2.fabien.cash', result: 'timeout' }],
                },
                stallName: "Nato's Corner",
                tokens: new Map([[TOKEN_ID, BEANS]]),
            }),
        );
        const text = root.textContent ?? '';
        expect(text).toContain(UNREACHABLE_BODY);
        expect(text).not.toContain(EMPTY_TITLE);
        expect(text).toContain("Nato's Corner");
        expect(text).toContain('Roasted Beans');
        expect(text).toContain(DASHED_PRICE);
        const buy = root.querySelector('.stall button.buy') as HTMLButtonElement | null;
        expect(buy).not.toBeNull();
        expect(buy!.disabled).toBe(true);
        buy!.click();
        expect(h.onBuy).not.toHaveBeenCalled();
        const retry = root.querySelector('button.mini') as HTMLButtonElement;
        retry.click();
        expect(h.onRetry).toHaveBeenCalledTimes(1);
    });
});

describe('plugin-missing-is-not-empty', () => {
    it('plugin-missing uses unreachable copy, not empty', () => {
        const { root } = paint(
            idlePubkey({
                fetch: {
                    kind: 'plugin-missing',
                    triedAtMs: 1,
                    hosts: [
                        {
                            host: 'chronik.e.cash',
                            result: 'plugin-missing',
                        },
                    ],
                },
            }),
        );
        const text = root.textContent ?? '';
        expect(text).toContain(UNREACHABLE_BODY);
        expect(text).not.toContain(EMPTY_TITLE);
        expect(text).toContain('plugin-missing');
        expect(root.querySelector('button.buy')).toBeNull();
    });
});

describe('invalid is not empty', () => {
    it('says the link is unreadable and shows the raw param', () => {
        const raw = 'not-a-seller';
        const { root } = paint({
            route: { kind: 'invalid', raw },
            overlay: { kind: 'idle' },
            tokens: new Map(),
        });
        const text = root.textContent ?? '';
        expect(text).toContain(LINK_UNREADABLE_TITLE);
        expect(text).toContain(raw);
        expect(text).not.toContain(EMPTY_TITLE);
        expect(text).not.toContain(UNREACHABLE_BODY);
        expect(root.querySelector('button.buy')).toBeNull();
    });
});

describe('unresolvable', () => {
    it('has "Nothing to read from this address"', () => {
        const { root } = paint({
            route: { kind: 'unresolvable', address: ADDR },
            overlay: { kind: 'idle' },
            tokens: new Map(),
        });
        const text = root.textContent ?? '';
        expect(text).toContain(UNRESOLVABLE_TITLE);
        expect(text).toContain(ADDR);
        expect(text).not.toContain(EMPTY_TITLE);
        expect(text).not.toContain(UNREACHABLE_BODY);
        expect(root.querySelector('button.buy')).toBeNull();
    });
});

describe('unresolved address is unreachable not unresolvable', () => {
    it('paints our failure, not never-spent', () => {
        const { root } = paint({
            route: { kind: 'unresolved', address: ADDR },
            fetch: {
                kind: 'unreachable',
                triedAtMs: 1,
                hosts: [{ host: 'chronik-native1.fabien.cash', result: 'timeout' }],
            },
            overlay: { kind: 'idle' },
            address: ADDR,
            tokens: new Map(),
        });
        const text = root.textContent ?? '';
        expect(text).toContain(UNREACHABLE_BODY);
        expect(text).not.toContain(UNRESOLVABLE_TITLE);
        expect(text).not.toContain(EMPTY_TITLE);
        expect(text).toContain(ADDR);
        expect(text).toContain(TRY_AGAIN);
    });
});

describe('asked-amount-not-covered', () => {
    it('theme vars never set banned properties; price and buy live in the stall', () => {
        const { root, h } = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                stallName: "Nato's Corner",
                tokens: new Map([[TOKEN_ID, BEANS]]),
            }),
        );
        const stall = root.querySelector('.stall') as HTMLElement | null;
        expect(stall).not.toBeNull();
        for (const banned of BANNED_THEME_PROPS) {
            expect(stall!.style.getPropertyValue(banned)).toBe('');
            expect(stall!.style.cssText).not.toContain(banned);
        }
        const price = stall!.querySelector('[data-role="price"], .item-x');
        const row = stall!.querySelector('button.item');
        expect(price).not.toBeNull();
        expect(price!.textContent).toBe('1,200');
        expect(row).not.toBeNull();
        expect(stall!.contains(price!)).toBe(true);
        expect(stall!.contains(row!)).toBe(true);
        expect((row as HTMLButtonElement).disabled).toBe(false);

        (row as HTMLButtonElement).click();
        expect(h.onBuy).toHaveBeenCalledWith(OUTPOINT);
    });
});

describe('handoff-does-not-claim-this-maker-is-selected', () => {
    /**
     * The sheet used to precede a signature on this origin. It now precedes
     * Cashtab's order book, which preselects the cheapest offer the viewer can
     * afford and never labels which maker a row belongs to. A sheet that reads
     * like a checkout would be promising an outcome Stall cannot deliver.
     */
    it('sends the buyer to the token page, says another seller may be preselected, and names the price to look for', () => {
        const { root, h } = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                overlay: { kind: 'buy', outpoint: OUTPOINT },
                stallName: "Nato's Corner",
                tokens: new Map([[TOKEN_ID, BEANS]]),
            }),
        );
        const text = root.textContent ?? '';
        expect(text).toContain('1,200 XEC');
        expect(text).toContain('1 of 12');
        expect(text).toContain(HANDOFF_MAY_PRESELECT);
        expect(text).toContain(lookForPriceLine('1,200'));
        expect(text).toContain(HANDOFF_FINE_PRINT);

        // This origin builds nothing, so it has no fee of its own to quote.
        expect(text).not.toContain('Network fee');

        const cta = root.querySelector('.sheet a.buy') as HTMLAnchorElement;
        expect(cta).not.toBeNull();
        expect(cta.textContent).toBe(OPEN_IN_CASHTAB);
        // No action=BUY: that deep link picks a maker for the buyer.
        expect(cta.href).toBe(`https://cashtab.com/#/token/${TOKEN_ID}`);
        expect(cta.href).not.toContain('action=');
        expect(cta.rel).toContain('noopener');

        const backdrop = root.querySelector('.sheet') as HTMLElement;
        backdrop.click();
        expect(h.onCloseSheet).toHaveBeenCalledTimes(1);
    });
});

describe('home is not an unreadable link', () => {
    it('paints a landing with no identity at the apex', () => {
        const { root } = paint({
            route: { kind: 'home' },
            overlay: { kind: 'idle' },
            tokens: new Map(),
        });
        const text = root.textContent ?? '';
        expect(text).toContain(HOME_LEDE);
        expect(text).not.toContain(LINK_UNREADABLE_TITLE);
    });
});

describe('list-price-says-what-it-buys', () => {
    /**
     * Measured on a live stall: an offer of 1024 atoms with a minimum of 55
     * asks 1,045.01 XEC for that minimum, while the whole 1024 costs
     * 19,456.01 XEC. Printing the first figure beside "1024 left" claims the
     * second.
     */
    it('says "from" when the price buys less than the stock, and not when it buys the lot', () => {
        const partOfStock = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                tokens: new Map([[TOKEN_ID, BEANS]]),
            }),
        ).root;
        const partRow = partOfStock.querySelector('.item-p') as HTMLElement;
        expect(partRow.textContent).toContain(PRICE_FROM);
        expect(
            (partOfStock.querySelector('[data-role="price"]') as HTMLElement).textContent,
        ).toBe('1,200');

        const wholeLot: StallOffer = { ...OFFER, askedAtoms: OFFER.atoms };
        const allOfStock = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [wholeLot] },
                tokens: new Map([[TOKEN_ID, BEANS]]),
            }),
        ).root;
        expect(
            (allOfStock.querySelector('.item-p') as HTMLElement).textContent,
        ).not.toContain(PRICE_FROM);
    });
});

describe('unreadable-offers-are-not-empty', () => {
    it('blames us, not the seller, and offers a retry', () => {
        const { root, h } = paint(
            idlePubkey({
                fetch: { kind: 'unreadable', triedAtMs: Date.now(), returned: 3 },
                stallName: "Nato's Corner",
            }),
        );
        const text = root.textContent ?? '';
        expect(text).toContain(UNREADABLE_BODY);
        expect(text).not.toContain(EMPTY_TITLE);
        // Nothing timed out, so the "no index answered" copy would be a
        // second untruth on top of the first.
        expect(text).not.toContain(UNREACHABLE_BODY);

        const retry = root.querySelector('button.mini') as HTMLButtonElement;
        expect(retry).not.toBeNull();
        retry.click();
        expect(h.onRetry).toHaveBeenCalledTimes(1);
    });
});

describe('min-exceeds-remaining-is-not-buyable', () => {
    /**
     * The remainder of a partial fill can fall below the covenant's own
     * minimum. No quantity then satisfies the script, so the price we hold is
     * for a take that cannot happen. The row stays — hiding it would turn
     * "listed but unspendable" into "not listed" — but it must not carry a
     * price or a link to a page that will not show it either.
     */
    it('shows the row without a price and offers no way out to Cashtab', () => {
        const stranded: StallOffer = {
            ...OFFER,
            atoms: 3n,
            askedAtoms: 10n,
            minAcceptedAtoms: 10n,
        };
        const { root } = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [stranded] },
                overlay: { kind: 'buy', outpoint: OUTPOINT },
                tokens: new Map([[TOKEN_ID, BEANS]]),
            }),
        );
        const text = root.textContent ?? '';
        expect(text).toContain('Roasted Beans');
        expect(text).toContain(UNBUYABLE_BADGE);
        expect(text).not.toContain(EMPTY_TITLE);

        // No price for an impossible take, and no "from" either.
        expect(root.querySelector('[data-role="price"]')).toBeNull();
        expect(text).not.toContain(PRICE_FROM);

        // Cashtab drops this offer too, so a link there is a dead end.
        expect(root.querySelector('.sheet a.buy')).toBeNull();
        expect(text).toContain('only the seller can cancel it');
    });
});
