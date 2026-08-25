// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { BANNED_THEME_PROPS, DEFAULT_THEME } from '../domain/theme';
import type { Outpoint, StallOffer, StallView, TokenMeta } from '../domain/state';
import {
    COPY_LINK,
    COPY_LINK_FALLBACK,
    DASHED_PRICE,
    EMPTY_TITLE,
    HANDOFF_FINE_PRINT,
    HANDOFF_MAY_PRESELECT,
    HANDOFF_PRICE_IS_NOT_THE_ROW,
    HOME_LEDE,
    HOME_NO_ACCOUNT,
    HOME_PASTE_INVALID,
    HOME_PASTE_SUBMIT,
    HOME_TITLE,
    LINK_COPIED,
    LINK_UNREADABLE_TITLE,
    LIST_IN_CASHTAB,
    MIN_PURCHASE,
    OPEN_ANOTHER_STALL,
    OPEN_IN_CASHTAB,
    OPENING_BODY,
    PRICE_FROM,
    THIS_STALLS_STOCK,
    TOKEN_DECIMALS,
    TOKEN_ID as TOKEN_ID_LABEL,
    TOKEN_TICKER,
    TOKEN_TYPE,
    UNBUYABLE_BADGE,
    TRY_AGAIN,
    UNREACHABLE_BODY,
    UNREADABLE_BODY,
    UNRESOLVABLE_TITLE,
    tokenRate,
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
    tokenType: { protocol: 'SLP', type: 'SLP_TOKEN_TYPE_FUNGIBLE' },
};

const OFFER: StallOffer = {
    outpoint: OUTPOINT,
    tokenId: TOKEN_ID,
    atoms: 12n,
    variant: 'PARTIAL',
    askedSats: 1200n * 100n,
    askedAtoms: 1n,
    priceNanoSatsPerAtom: 1200n * 100n * 1_000_000_000n,
};

function handlers() {
    return {
        onBuy: vi.fn(),
        onRetry: vi.fn(),
        onCloseSheet: vi.fn(),
        onOpenStall: vi.fn(),
        onGoHome: vi.fn(),
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
        expect(text).toContain(LIST_IN_CASHTAB);
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

    it('later-visit unreachable keeps cached names, dashed prices, and no buy control', () => {
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
        expect(root.querySelector('.stall button.buy')).toBeNull();
        expect(text).not.toContain(OPEN_IN_CASHTAB);
        const retry = [...root.querySelectorAll('button')].find(
            (node) => node.textContent === TRY_AGAIN,
        ) as HTMLButtonElement;
        retry.click();
        expect(h.onRetry).toHaveBeenCalledTimes(1);
        expect(h.onBuy).not.toHaveBeenCalled();
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
        expect(text).toContain(LIST_IN_CASHTAB);
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
        const row = stall!.querySelector('button.item-head');
        expect(price).not.toBeNull();
        expect(price!.textContent).toBe('1,200');
        expect(row).not.toBeNull();
        expect(stall!.contains(price!)).toBe(true);
        expect(stall!.contains(row!)).toBe(true);
        expect((row as HTMLButtonElement).disabled).toBe(false);

        (row as HTMLButtonElement).click();
        expect(h.onBuy).toHaveBeenCalledWith(OUTPOINT);
    });

    it('lets an expanded shelf row span the grid so the neighbour keeps its price', () => {
        const neighbour: StallOffer = {
            ...OFFER,
            outpoint: { txid: OUTPOINT.txid, outIdx: 1 },
        };
        const { root } = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER, neighbour] },
                overlay: { kind: 'buy', outpoint: OUTPOINT },
                tokens: new Map([[TOKEN_ID, BEANS]]),
                theme: { ...DEFAULT_THEME, layoutIndex: 1 },
            }),
        );
        const stall = root.querySelector('.stall') as HTMLElement;
        expect(stall.classList.contains('layout-shelf')).toBe(true);
        const cards = [...stall.querySelectorAll('.item')];
        expect(cards).toHaveLength(2);
        expect(cards[0]?.classList.contains('open')).toBe(true);
        expect(cards[1]?.classList.contains('open')).toBe(false);
        const prices = stall.querySelectorAll('[data-role="price"]');
        expect(prices).toHaveLength(2);
        expect(prices[0]?.textContent).toBe('1,200');
        expect(prices[1]?.textContent).toBe('1,200');
        expect(stall.contains(prices[1]!)).toBe(true);
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
        expect(text).toContain(MIN_PURCHASE);
        expect(text).toContain(THIS_STALLS_STOCK);
        expect(text).toContain('1 BEAN');
        expect(text).toContain('12 left');
        expect(text).toContain(HANDOFF_MAY_PRESELECT);
        expect(text).toContain(HANDOFF_PRICE_IS_NOT_THE_ROW);
        expect(text).not.toContain('priced at 1,200');
        expect(text).toContain(HANDOFF_FINE_PRINT);

        // This origin builds nothing, so it has no fee of its own to quote.
        expect(text).not.toContain('Network fee');

        const detail = root.querySelector('[data-role="detail"]') as HTMLElement;
        expect(detail).not.toBeNull();
        expect(detail.textContent).toContain(HANDOFF_MAY_PRESELECT);
        expect(detail.textContent).toContain(HANDOFF_PRICE_IS_NOT_THE_ROW);

        const cta = detail.querySelector('a.buy') as HTMLAnchorElement;
        expect(cta).not.toBeNull();
        expect(cta.textContent).toBe(OPEN_IN_CASHTAB);
        // No action=BUY: that deep link picks a maker for the buyer.
        expect(cta.href).toBe(`https://cashtab.com/#/token/${TOKEN_ID}`);
        expect(cta.href).not.toContain('action=');
        expect(cta.href).not.toContain('quantity=');
        expect(cta.rel).toContain('noopener');

        // Both disclosure lines sit with the link, in the expander, not a sheet.
        expect(root.querySelector('.sheet')).toBeNull();
        const head = root.querySelector('button.item-head') as HTMLButtonElement;
        head.click();
        expect(h.onCloseSheet).toHaveBeenCalledTimes(1);
        expect(h.onBuy).not.toHaveBeenCalled();
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
        expect(text).toContain(HOME_NO_ACCOUNT);
        expect(text).toContain(HOME_PASTE_SUBMIT);
        expect(text).not.toContain(LINK_UNREADABLE_TITLE);
        expect(root.querySelector('[data-role="copy-link"]')).toBeNull();
        expect(document.title).toBe(HOME_TITLE);
    });

    it('invalid paste does not call onOpenStall', () => {
        const { root, h } = paint({
            route: { kind: 'home' },
            overlay: { kind: 'idle' },
            tokens: new Map(),
        });
        const input = root.querySelector('.paste-in') as HTMLInputElement;
        const form = root.querySelector('form.paste') as HTMLFormElement;
        input.value = 'not-a-seller';
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        expect(h.onOpenStall).not.toHaveBeenCalled();
        expect(root.textContent).toContain(HOME_PASTE_INVALID);
    });

    it('valid paste calls onOpenStall with the trimmed address', () => {
        const { root, h } = paint({
            route: { kind: 'home' },
            overlay: { kind: 'idle' },
            tokens: new Map(),
        });
        const input = root.querySelector('.paste-in') as HTMLInputElement;
        const form = root.querySelector('form.paste') as HTMLFormElement;
        input.value = `  ${ADDR}  `;
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        expect(h.onOpenStall).toHaveBeenCalledTimes(1);
        expect(h.onOpenStall).toHaveBeenCalledWith(ADDR);
        expect(root.textContent).not.toContain(HOME_PASTE_INVALID);
    });
});

describe('opening-is-not-empty-or-unreachable', () => {
    it('says the stall is being opened, not empty and not down', () => {
        const { root } = paint(
            idlePubkey({
                fetch: { kind: 'opening' },
                stallName: "Nato's Corner",
            }),
        );
        const text = root.textContent ?? '';
        expect(text).toContain(OPENING_BODY);
        expect(text).toContain("Nato's Corner");
        expect(text).not.toContain(EMPTY_TITLE);
        expect(text).not.toContain(UNREACHABLE_BODY);
        expect(text).not.toContain(TRY_AGAIN);
        expect(root.querySelector('button.buy')).toBeNull();
    });

    it('unresolved opening is not never-spent and not unreachable', () => {
        const { root } = paint({
            route: { kind: 'unresolved', address: ADDR },
            fetch: { kind: 'opening' },
            overlay: { kind: 'idle' },
            address: ADDR,
            tokens: new Map(),
        });
        const text = root.textContent ?? '';
        expect(text).toContain(OPENING_BODY);
        expect(text).toContain(ADDR);
        expect(text).not.toContain(UNRESOLVABLE_TITLE);
        expect(text).not.toContain(UNREACHABLE_BODY);
        expect(text).not.toContain(EMPTY_TITLE);
    });

    it('unnamed pubkey opening puts the address in the header, not the site name', () => {
        const { root } = paint(idlePubkey({ fetch: { kind: 'opening' } }));
        expect(root.querySelector('.stall-name')?.textContent).toBe(ADDR);
        expect(document.title).toBe(ADDR);
        expect(document.title).not.toBe(HOME_TITLE);
        expect(root.textContent).toContain(OPENING_BODY);
    });
});

describe('document-title-follows-identity', () => {
    it('uses the stall name when it has one, and a kind title otherwise', () => {
        paint(
            idlePubkey({
                fetch: { kind: 'empty' },
                stallName: "Nato's Corner",
            }),
        );
        expect(document.title).toBe("Nato's Corner");

        paint({
            route: { kind: 'home' },
            overlay: { kind: 'idle' },
            tokens: new Map(),
        });
        expect(document.title).toBe(HOME_TITLE);

        paint({
            route: { kind: 'invalid', raw: 'nope' },
            overlay: { kind: 'idle' },
            tokens: new Map(),
        });
        expect(document.title).toBe(LINK_UNREADABLE_TITLE);
    });

    /**
     * The case every stall on chain is in today: a name comes from a manifest,
     * and nothing can publish one yet. Falling back to the site name here gives
     * every seller the apex's title, which is what an unfurled link shows.
     */
    it('names the stall by its address when no manifest has named it', () => {
        const offers = paint(idlePubkey({ fetch: { kind: 'offers', offers: [OFFER] } }));
        expect(document.title).toBe(ADDR);
        expect(document.title).not.toBe(HOME_TITLE);
        expect(offers.root.querySelector('.stall-name')?.textContent).toBe(ADDR);

        paint(idlePubkey({ fetch: { kind: 'empty' } }));
        expect(document.title).toBe(ADDR);
        expect(document.title).not.toBe(HOME_TITLE);

        paint(idlePubkey({ fetch: { kind: 'opening' } }));
        expect(document.title).toBe(ADDR);
        expect(document.title).not.toBe(HOME_TITLE);
    });
});

describe('empty-unnamed-is-still-this-seller', () => {
    it('puts the address in the header when no manifest has named the stall', () => {
        const { root } = paint(idlePubkey({ fetch: { kind: 'empty' } }));
        const name = root.querySelector('.stall-name') as HTMLElement | null;
        expect(name).not.toBeNull();
        expect(name!.textContent).toBe(ADDR);
        expect(root.textContent).toContain(EMPTY_TITLE);
        expect(root.textContent).toContain(LIST_IN_CASHTAB);
        expect(root.querySelector('[data-role="copy-link"]')).not.toBeNull();
        expect(document.title).toBe(ADDR);
        expect(document.title).not.toBe(HOME_TITLE);
    });
});

describe('cached-unreachable-without-manifest-name', () => {
    it('keeps the address in the header, dashed prices, and no buy control', () => {
        const { root } = paint(
            idlePubkey({
                fetch: {
                    kind: 'unreachable',
                    triedAtMs: 1,
                    hosts: [{ host: 'chronik-native2.fabien.cash', result: 'timeout' }],
                },
                tokens: new Map([[TOKEN_ID, BEANS]]),
            }),
        );
        const name = root.querySelector('.stall-name') as HTMLElement | null;
        expect(name).not.toBeNull();
        expect(name!.textContent).toBe(ADDR);
        expect(root.textContent).toContain('Roasted Beans');
        expect(root.textContent).toContain(DASHED_PRICE);
        expect(root.textContent).toContain(UNREACHABLE_BODY);
        expect(root.querySelector('.stall button.buy')).toBeNull();
        expect(root.textContent).not.toContain(OPEN_IN_CASHTAB);
        expect(document.title).toBe(ADDR);
        expect(document.title).not.toBe(HOME_TITLE);
    });
});

describe('copy-link', () => {
    it('is on a pubkey stall and not on the apex', () => {
        const home = paint({
            route: { kind: 'home' },
            overlay: { kind: 'idle' },
            tokens: new Map(),
        }).root;
        expect(home.querySelector('[data-role="copy-link"]')).toBeNull();

        const stall = paint(
            idlePubkey({
                fetch: { kind: 'empty' },
                stallName: "Nato's Corner",
            }),
        ).root;
        expect(stall.querySelector('[data-role="copy-link"]')).not.toBeNull();
        expect(stall.textContent).toContain(COPY_LINK);
    });

    it('falls back to a selectable field when clipboard is missing', () => {
        const original = navigator.clipboard;
        Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: undefined,
        });
        try {
            const { root } = paint(
                idlePubkey({
                    fetch: { kind: 'empty' },
                }),
            );
            const btn = root.querySelector('.share button.mini') as HTMLButtonElement;
            btn.click();
            expect(root.textContent).toContain(COPY_LINK_FALLBACK);
            expect(root.textContent).not.toContain(LINK_COPIED);
        } finally {
            Object.defineProperty(navigator, 'clipboard', {
                configurable: true,
                value: original,
            });
        }
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

        const retry = [...root.querySelectorAll('button')].find(
            (node) => node.textContent === TRY_AGAIN,
        ) as HTMLButtonElement;
        expect(retry).not.toBeNull();
        retry.click();
        expect(h.onRetry).toHaveBeenCalledTimes(1);
    });

    it('names an unnamed unreadable stall by its address, not the site name', () => {
        const { root } = paint(
            idlePubkey({
                fetch: { kind: 'unreadable', triedAtMs: Date.now(), returned: 3 },
            }),
        );
        expect(root.querySelector('.stall-name')?.textContent).toBe(ADDR);
        expect(document.title).toBe(ADDR);
        expect(document.title).not.toBe(HOME_TITLE);
        expect(root.textContent).toContain(UNREADABLE_BODY);
        expect(root.textContent).not.toContain(EMPTY_TITLE);
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
        expect(root.querySelector('[data-role="detail"] a.buy')).toBeNull();
        expect(text).toContain('only the seller can cancel it');
    });
});

describe('look-for-is-not-the-min-take', () => {
    it('does not tell the buyer to hunt the minimum take on Cashtab’s book', () => {
        const { root } = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                overlay: { kind: 'buy', outpoint: OUTPOINT },
                tokens: new Map([[TOKEN_ID, BEANS]]),
            }),
        );
        const text = root.textContent ?? '';
        expect(text).toContain(HANDOFF_PRICE_IS_NOT_THE_ROW);
        expect(text).toContain('1,200 XEC');
        expect(text).not.toContain('priced at 1,200');
        expect(text).not.toContain('the one priced at');
        const cta = root.querySelector('[data-role="detail"] a.buy') as HTMLAnchorElement;
        expect(cta.href).not.toContain('action=');
        expect(cta.href).not.toContain('quantity=');
    });
});

describe('token identity on the row and sheet', () => {
    it('shows the genesis ticker next to the name when both exist', () => {
        const { root } = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                overlay: { kind: 'buy', outpoint: OUTPOINT },
                tokens: new Map([[TOKEN_ID, BEANS]]),
            }),
        );
        expect(root.textContent).toContain('Roasted Beans');
        expect(root.textContent).toContain('BEAN');
        expect(root.querySelector('.item-q')?.textContent).toContain('BEAN');
        expect(root.textContent).toContain(TOKEN_TICKER);
    });

    it('uses the ticker as the name when genesis has no name', () => {
        const tickerOnly: TokenMeta = {
            tokenId: TOKEN_ID,
            name: '',
            ticker: 'BEAN',
            decimals: 0,
        };
        const { root } = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                overlay: { kind: 'buy', outpoint: OUTPOINT },
                tokens: new Map([[TOKEN_ID, tickerOnly]]),
            }),
        );
        expect(root.querySelector('.item-n')?.textContent).toBe('BEAN');
        expect(root.textContent).not.toContain(TOKEN_TICKER);
    });

    it('falls back to the token id when genesis meta is missing', () => {
        const { root } = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
            }),
        );
        expect(root.querySelector('.item-n')?.textContent).toBe(TOKEN_ID);
    });
});

/** Min-take 55 atoms / 1,045.01 XEC; remaining lot 1024 at the floor-div rate. */
const PARTIAL_LOT: StallOffer = {
    ...OFFER,
    askedSats: 104_501n,
    askedAtoms: 55n,
    atoms: 1024n,
    minAcceptedAtoms: 55n,
    priceNanoSatsPerAtom: 1_900_000_976_562n,
};

describe('rate-is-not-the-asked-price', () => {
    /**
     * The asked amount is what the covenant takes (the min take). The rate
     * is an annotation of the remaining lot, floor-divided, and labelled
     * so it cannot be read as a second price.
     */
    it('keeps the asked sats as the price and puts a labelled rate under it', () => {
        const oneDec: TokenMeta = { ...BEANS, decimals: 1 };
        const { root } = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [PARTIAL_LOT] },
                tokens: new Map([[TOKEN_ID, oneDec]]),
            }),
        );
        expect(
            (root.querySelector('[data-role="price"]') as HTMLElement).textContent,
        ).toBe('1,045.01');
        expect(root.querySelector('[data-role="price"]')?.textContent).not.toContain(
            '≈',
        );
        const rate = root.querySelector('[data-role="rate"]') as HTMLElement;
        expect(rate).not.toBeNull();
        expect(rate.textContent).toBe(tokenRate('190.0000976562'));
        expect(rate.textContent).toContain('XEC/token');
        expect(rate.textContent).toContain('≈');
        expect(rate.textContent).not.toBe(tokenRate('1,045.01'));
        // The rate must not replace or share the price node.
        expect(root.querySelector('[data-role="price"]')?.contains(rate)).toBe(false);
    });
});

describe('unknown-decimals-is-not-a-rate', () => {
    /**
     * `decimalsOf` defaults to 0 when genesis did not load. A rate computed
     * with that 0 is off by 10^decimals. A dash is the honest answer.
     */
    it('shows a dash when token metadata is missing, not a number as if decimals were 0', () => {
        const { root } = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [PARTIAL_LOT] },
                overlay: { kind: 'buy', outpoint: OUTPOINT },
            }),
        );
        const rate = root.querySelector('[data-role="rate"]') as HTMLElement;
        expect(rate).not.toBeNull();
        expect(rate.textContent).toBe(DASHED_PRICE);
        expect(rate.textContent).not.toContain('XEC/token');
        expect(rate.textContent).not.toContain('0.019');
        expect(rate.textContent).not.toContain('190.0000976562');
        expect(rate.textContent).not.toContain(tokenRate('19.00000976562'));
        // The asked price does not depend on decimals and still prints.
        expect(
            (root.querySelector('[data-role="price"]') as HTMLElement).textContent,
        ).toBe('1,045.01');
        // A missing genesis must not mint a decimals=0 token fact.
        const detail = root.querySelector('[data-role="detail"]') as HTMLElement;
        expect(detail.textContent).not.toContain(TOKEN_DECIMALS);
        expect(detail.textContent).not.toContain(TOKEN_TYPE);
    });

    it('still prints a rate when genesis decimals are known to be 0', () => {
        const zeroDec: TokenMeta = { ...BEANS, decimals: 0 };
        const { root } = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [PARTIAL_LOT] },
                tokens: new Map([[TOKEN_ID, zeroDec]]),
            }),
        );
        const rate = root.querySelector('[data-role="rate"]')?.textContent;
        expect(rate).toBe(tokenRate('19.00000976562'));
        expect(rate).not.toBe(tokenRate('1,045.01'));
        expect(rate).not.toBe(DASHED_PRICE);
    });
});

describe('unbuyable-has-no-rate', () => {
    it('keeps the badge and does not invent a rate for a take that cannot happen', () => {
        const stranded: StallOffer = {
            ...OFFER,
            atoms: 3n,
            askedAtoms: 10n,
            minAcceptedAtoms: 10n,
            priceNanoSatsPerAtom: 1_900_000_976_562n,
        };
        const { root } = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [stranded] },
                overlay: { kind: 'buy', outpoint: OUTPOINT },
                tokens: new Map([[TOKEN_ID, BEANS]]),
            }),
        );
        expect(root.textContent).toContain(UNBUYABLE_BADGE);
        expect(root.querySelector('[data-role="rate"]')).toBeNull();
        expect(root.querySelector('[data-role="price"]')).toBeNull();
        expect(root.textContent).not.toContain(tokenRate('1,200'));
        expect(root.textContent).not.toContain('XEC/token');
        expect(root.querySelector('[data-role="detail"] a.buy')).toBeNull();
    });
});

describe('cashtab-link-is-not-inside-the-row-button', () => {
    /**
     * A nested `<a>` inside `button.item` receives the button's click too.
     * The expander puts the link in a sibling panel so it can open Cashtab
     * without toggling the row.
     */
    it('keeps the Cashtab link outside the row button, so a click does not toggle', () => {
        const { root, h } = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                overlay: { kind: 'buy', outpoint: OUTPOINT },
                tokens: new Map([[TOKEN_ID, BEANS]]),
            }),
        );
        const link = root.querySelector('a.buy') as HTMLAnchorElement;
        const head = root.querySelector('button.item-head') as HTMLButtonElement;
        expect(link).not.toBeNull();
        expect(head).not.toBeNull();
        expect(head.contains(link)).toBe(false);
        expect(link.closest('button')).toBeNull();

        link.click();
        expect(h.onBuy).not.toHaveBeenCalled();
        expect(h.onCloseSheet).not.toHaveBeenCalled();
    });
});

describe('token-facts-on-the-expander', () => {
    it('lists ticker, decimals, token id, and token type in the open panel', () => {
        const { root } = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                overlay: { kind: 'buy', outpoint: OUTPOINT },
                tokens: new Map([[TOKEN_ID, BEANS]]),
            }),
        );
        const detail = root.querySelector('[data-role="detail"]') as HTMLElement;
        expect(detail.textContent).toContain(TOKEN_TICKER);
        expect(detail.textContent).toContain('BEAN');
        expect(detail.textContent).toContain(TOKEN_ID_LABEL);
        expect(detail.textContent).toContain(TOKEN_ID);
        expect(detail.textContent).toContain(TOKEN_TYPE);
        expect(detail.textContent).toContain('SLP V1 (fungible)');
        const decimalsRow = [...detail.querySelectorAll('dl.row')].find(
            (row) => row.querySelector('dt')?.textContent === TOKEN_DECIMALS,
        );
        expect(decimalsRow?.querySelector('dd')?.textContent).toBe('0');
    });

    it('omits type when chronik did not name one, and keeps the full token id', () => {
        const noType: TokenMeta = {
            tokenId: TOKEN_ID,
            name: 'Roasted Beans',
            ticker: 'BEAN',
            decimals: 2,
        };
        const { root } = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                overlay: { kind: 'buy', outpoint: OUTPOINT },
                tokens: new Map([[TOKEN_ID, noType]]),
            }),
        );
        const detail = root.querySelector('[data-role="detail"]') as HTMLElement;
        expect(detail.textContent).not.toContain(TOKEN_TYPE);
        expect(detail.textContent).toContain(TOKEN_ID);
        expect(detail.textContent).not.toContain(TOKEN_ID.slice(0, 10) + '…');
        const decimalsRow = [...detail.querySelectorAll('dl.row')].find(
            (row) => row.querySelector('dt')?.textContent === TOKEN_DECIMALS,
        );
        expect(decimalsRow?.querySelector('dd')?.textContent).toBe('2');
    });
});

describe('open-another-stall', () => {
    it('returns to the apex from a stall and is absent on the home paste', () => {
        const home = paint({
            route: { kind: 'home' },
            overlay: { kind: 'idle' },
            tokens: new Map(),
        });
        expect(home.root.querySelector('[data-role="open-another"]')).toBeNull();

        const { root, h } = paint(idlePubkey({ fetch: { kind: 'empty' } }));
        const back = root.querySelector('[data-role="open-another"]') as HTMLButtonElement;
        expect(back).not.toBeNull();
        expect(back.textContent).toBe(OPEN_ANOTHER_STALL);
        back.click();
        expect(h.onGoHome).toHaveBeenCalledTimes(1);
    });
});
