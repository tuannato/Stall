// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ICON_HOST, iconUrl } from '../domain/icons';
import {
    BANNED_THEME_PROPS,
    DEFAULT_THEME,
    DEFAULT_THEME_ID,
    NEO_CITY_THEME_ID,
    RURAL_THEME_ID,
    decodeTheme,
    themeVars,
} from '../domain/theme';
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
    HOME_SELLER,
    HOME_DEMO_SOON,
    UNRESOLVABLE_NEXT,
    SHARE_LEDE,
    HOME_NO_ACCOUNT,
    HOME_PASTE_INVALID,
    HOME_PASTE_SUBMIT,
    HOME_TITLE,
    LINK_COPIED,
    LINK_UNREADABLE_TITLE,
    LIST_IN_CASHTAB,
    MIN_PURCHASE,
    OPEN_ANOTHER_STALL,
    OPEN_BY_DEFAULT,
    PUBLISH_MUST_SIGN,
    PUBLISH_NAME_TOO_LONG,
    PUBLISH_UNAVAILABLE,
    SET_UP_THIS_STALL,
    PUBLISH_SAME_LOOK,
    PUBLISH_AFTER_SIGNING,
    PUBLISH_CHECK_NOW,
    UNRESOLVED_TITLE,
    UNRESOLVED_BODY,
    OPEN_IN_CASHTAB,
    OPENING_BY_DEFAULT,
    OPENING_BODY,
    PRICE_FROM,
    SETTINGS_UNREADABLE,
    THEME_UNKNOWN,
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
    tokenRateBound,
} from './copy';
import { renderStall, resetIconsForTests } from './render';

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
        onToggleDefault: vi.fn(),
        onOpenPublish: vi.fn(),
        onClosePublish: vi.fn(),
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

/** Direct-child notes from `settingsNotes`. Handoff fine print sits inside a row. */
function settingsFineCopy(root: HTMLElement): string[] {
    return [...root.querySelectorAll('.stall-body > p.fine')].map(
        (node) => node.textContent ?? '',
    );
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
        expect(root.querySelector('button.buy')).toBeNull();
        expect(h.onRetry).not.toHaveBeenCalled();
        // The retry control is shared with the failure screens and is not what
        // separates them: an empty stall carries it so a genuine sell-out can
        // clear, now that a live empty answer is no longer applied. What must
        // never appear here is the claim that no index answered, and the box
        // naming the hosts we failed to reach.
        expect(root.querySelector('[data-role="retry"]')).not.toBeNull();
        expect(root.querySelector('.hosts')).toBeNull();
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
        // Listing is now a link, not a sentence to read and act on separately.
        expect(root.querySelector('[data-role="list-in-cashtab"]')).not.toBeNull();
        expect(text).not.toContain(EMPTY_TITLE);
        expect(text).not.toContain(UNREACHABLE_BODY);
        expect(root.querySelector('button.buy')).toBeNull();
    });
});

describe('unresolved-without-fetch-is-not-no-index-answered', () => {
    /**
     * `resolveSeller` returns `unresolved` when the address walk hits
     * `MAX_HISTORY_PAGES`, and `loadCurrent` then paints that route with **no
     * fetch** — it never asked agora anything. The index answered every page we
     * requested; we stopped requesting. Sending that to the unreachable screen
     * printed "No index answered", which is our own cap reported as the
     * network's failure.
     *
     * Reachable exactly when a stall is doing well: takes pay the maker as
     * ordinary outputs, not as spends, so the one transaction that reveals the
     * key sinks below the cap while the shop fills with sales.
     */
    it('says we stopped reading, and blames no host for it', () => {
        const { root } = paint({
            route: { kind: 'unresolved', address: ADDR },
            overlay: { kind: 'idle' },
            address: ADDR,
            tokens: new Map(),
        });
        const text = root.textContent ?? '';
        expect(text).toContain(UNRESOLVED_TITLE);
        expect(text).toContain(UNRESOLVED_BODY);
        expect(text, 'the index answered').not.toContain(UNREACHABLE_BODY);
        expect(text, 'this is not a seller who never spent').not.toContain(
            UNRESOLVABLE_TITLE,
        );
        expect(text, 'and not a seller with nothing for sale').not.toContain(
            EMPTY_TITLE,
        );
        // Nothing failed to answer, so there is no host to list.
        expect(root.querySelector('.hosts')).toBeNull();
        // A new spend from this address lands on page 0, so asking again works.
        expect(root.querySelector('[data-role="retry"]')).not.toBeNull();
        expect(text).toContain(ADDR);
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
        expect(rate.textContent).toBe(tokenRate('190'));
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
        expect(rate.textContent).not.toContain(tokenRate('19'));
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
        expect(rate).toBe(tokenRate('19'));
        expect(rate).not.toBe(tokenRate('1,045.01'));
        expect(rate).not.toBe(DASHED_PRICE);
    });
});

describe('tiny-rate-is-not-free', () => {
    /**
     * A positive rate under the 4-decimal quantum is a bound, not a
     * figure. Wrapping it in `≈` would claim a rounded value we do not
     * have; printing `0` would read as free.
     */
    it('paints a bound without ≈ and does not touch the asked price', () => {
        const tiny: StallOffer = {
            ...OFFER,
            priceNanoSatsPerAtom: 1_000_000n,
        };
        const { root } = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [tiny] },
                tokens: new Map([[TOKEN_ID, BEANS]]),
            }),
        );
        const rate = root.querySelector('[data-role="rate"]') as HTMLElement;
        expect(rate.textContent).toBe(tokenRateBound('< 0.0001'));
        expect(rate.textContent).not.toContain('≈');
        expect(rate.textContent).not.toBe('0');
        expect(rate.textContent).not.toBe(tokenRate('0'));
        expect(
            (root.querySelector('[data-role="price"]') as HTMLElement).textContent,
        ).toBe('1,200');
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

describe('unknown-theme-id-is-not-silent-default', () => {
    /**
     * The record named an id we do not ship. The look is the shipped
     * default; saying nothing would read as a look the seller chose.
     * Empty is a separate call site — an offers-only check would miss it.
     */
    it('paints the default look and says so on the offers screen', () => {
        const { root } = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                tokens: new Map([[TOKEN_ID, BEANS]]),
                theme: decodeTheme(0xfe),
            }),
        );
        const stall = root.querySelector('.stall') as HTMLElement;
        expect(stall).not.toBeNull();
        expect(stall.style.getPropertyValue('--s-bg')).toBe(
            themeVars(DEFAULT_THEME)['--s-bg'],
        );
        expect(THEME_UNKNOWN.length).toBeGreaterThan(0);
        expect(settingsFineCopy(root)).toEqual([THEME_UNKNOWN]);
        expect(root.textContent).toContain('Roasted Beans');
        expect(root.textContent).not.toContain(EMPTY_TITLE);
    });

    it('paints the default look and says so on the empty screen', () => {
        const { root } = paint(
            idlePubkey({
                fetch: { kind: 'empty' },
                stallName: "Nato's Corner",
                theme: decodeTheme(0xfe),
            }),
        );
        const stall = root.querySelector('.stall') as HTMLElement;
        expect(stall).not.toBeNull();
        expect(stall.style.getPropertyValue('--s-bg')).toBe(
            themeVars(DEFAULT_THEME)['--s-bg'],
        );
        expect(settingsFineCopy(root)).toEqual([THEME_UNKNOWN]);
        expect(root.textContent).toContain(EMPTY_TITLE);
    });
});

describe('theme-unknown-is-not-settings-unreadable', () => {
    /**
     * A well-formed record naming an unshipped id is not a record we
     * could not read. The missing row is ours.
     */
    it('does not claim an unshipped id could not be read', () => {
        expect(THEME_UNKNOWN).not.toBe(SETTINGS_UNREADABLE);
        const { root } = paint(
            idlePubkey({
                fetch: { kind: 'empty' },
                theme: decodeTheme(0xfe),
            }),
        );
        const text = root.textContent ?? '';
        expect(text).toContain(THEME_UNKNOWN);
        expect(text).not.toContain(SETTINGS_UNREADABLE);
        expect(settingsFineCopy(root)).not.toContain(SETTINGS_UNREADABLE);
    });
});

describe('shipped-theme-id-says-nothing', () => {
    it('does not announce the default look when the id is one we ship', () => {
        const offers = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                tokens: new Map([[TOKEN_ID, BEANS]]),
                theme: decodeTheme(DEFAULT_THEME_ID),
            }),
        ).root;
        expect(settingsFineCopy(offers)).toEqual([]);
        expect(offers.textContent).not.toContain(THEME_UNKNOWN);

        const empty = paint(
            idlePubkey({
                fetch: { kind: 'empty' },
                theme: decodeTheme(DEFAULT_THEME_ID),
            }),
        ).root;
        expect(settingsFineCopy(empty)).toEqual([]);
        expect(empty.textContent).not.toContain(THEME_UNKNOWN);
    });

    /**
     * The other half of the guard: no manifest is not an unknown id.
     * `!view.theme?.known` would print THEME_UNKNOWN on every stall
     * that never published, and a shipped-id fixture would stay green.
     */
    it('does not announce a look the seller never named', () => {
        const { root } = paint(idlePubkey({ fetch: { kind: 'empty' } }));
        expect(settingsFineCopy(root)).toEqual([]);
        expect(root.textContent).not.toContain(THEME_UNKNOWN);
        expect(root.textContent).toContain(EMPTY_TITLE);
    });
});

describe('default-stall-control-says-which-way-it-goes', () => {
    /**
     * The control is the only way back to the door once the bare domain opens a
     * stall. A label that reads the same in both states would leave a visitor
     * who wants stall.cash with no way to ask for it.
     */
    function control(root: HTMLElement): HTMLButtonElement | null {
        return root.querySelector('[data-role="default-stall"]');
    }

    it('offers to make this the default, and says so once it is', () => {
        const off = paint(idlePubkey({ fetch: { kind: 'empty' } })).root;
        expect(control(off)?.textContent).toBe(OPEN_BY_DEFAULT);
        expect(control(off)?.getAttribute('aria-pressed')).toBe('false');

        const on = paint(
            idlePubkey({ fetch: { kind: 'empty' }, isDefaultStall: true }),
        ).root;
        expect(control(on)?.textContent).toBe(OPENING_BY_DEFAULT);
        expect(control(on)?.getAttribute('aria-pressed')).toBe('true');
        expect(OPEN_BY_DEFAULT).not.toBe(OPENING_BY_DEFAULT);
    });

    it('hands back the route token this stall answers to', () => {
        const { root, h } = paint(idlePubkey({ fetch: { kind: 'empty' } }));
        control(root)?.click();
        expect(h.onToggleDefault).toHaveBeenCalledWith(ADDR);
    });

    it('is offered on an unreachable stall too', () => {
        // Wanting this stall back tomorrow does not depend on an index
        // answering today.
        const { root } = paint(
            idlePubkey({
                fetch: { kind: 'unreachable', triedAtMs: 0, hosts: [] },
            }),
        );
        expect(control(root)).not.toBeNull();
    });

    it('is not offered for a link that is not a stall', () => {
        // An unreadable link has a footer, so this can regress: routing that
        // screen through the stall footer would offer to make an unparseable
        // string the default. The apex is not the case to assert — it paints no
        // footer at all, so an assertion there could never fail.
        const { root } = paint({
            route: { kind: 'invalid', raw: 'not-an-address' },
            overlay: { kind: 'idle' },
            tokens: new Map(),
        });
        expect(root.querySelector('.stall-foot')).not.toBeNull();
        expect(control(root)).toBeNull();
    });
});

const UI_DIR = dirname(fileURLToPath(import.meta.url));

describe('every-theme-var-reaches-the-stylesheet', () => {
    /**
     * `--s-accent-2` was emitted on every paint and read by no rule, so
     * `accentTwo` in the shipped table painted nothing: a seller publishing a
     * two-colour look got one colour and no way to tell why. A variable nobody
     * consumes is a value the chain carried for nothing, and neither the theme
     * table nor `asked-amount-not-covered` can see it — one asserts what
     * `themeVars` returns, the other never opens a stylesheet.
     */
    it('consumes every --s-* that themeVars emits', () => {
        const css = readFileSync(join(UI_DIR, 'stall.css'), 'utf8').replace(
            /\/\*[\s\S]*?\*\//g,
            '',
        );
        const emitted = Object.keys(themeVars(DEFAULT_THEME));
        expect(emitted.length).toBeGreaterThan(0);
        for (const name of emitted) {
            expect(css, `${name} is emitted on every paint and read by no rule`).toContain(
                `var(${name})`,
            );
        }
    });
});
const OTHER_TOKEN = '11'.repeat(32);
const TEA: TokenMeta = {
    tokenId: OTHER_TOKEN,
    name: 'Green Tea',
    ticker: 'TEA',
    decimals: 0,
};

function offersView(
    offers: StallOffer[] = [OFFER],
    tokens: Map<string, TokenMeta> = new Map([[TOKEN_ID, BEANS]]),
): StallView {
    return idlePubkey({
        fetch: { kind: 'offers', offers },
        tokens,
    });
}

function probeImages(): { images: HTMLImageElement[]; restore: () => void } {
    const images: HTMLImageElement[] = [];
    const Original = window.Image;
    function ProbedImage(width?: number, height?: number): HTMLImageElement {
        const img = new Original(width, height);
        images.push(img);
        return img;
    }
    vi.stubGlobal('Image', ProbedImage);
    return {
        images,
        restore: () => {
            vi.unstubAllGlobals();
        },
    };
}

describe('token icon', () => {
    beforeEach(() => {
        resetIconsForTests();
    });

    it('pending-icon-keeps-the-letters', () => {
        const { root } = paint(offersView());
        const cell = root.querySelector('.item-ic') as HTMLElement;
        expect(cell).not.toBeNull();
        expect(cell.querySelector('img')).toBeNull();
        expect(cell.textContent).toBe('RB');
        expect(cell.childNodes).toHaveLength(1);
    });

    it('failed-icon-keeps-the-letters', () => {
        const { images, restore } = probeImages();
        try {
            const view = offersView();
            paint(view);
            expect(images).toHaveLength(1);
            images[0]!.dispatchEvent(new Event('error'));
            images[0]!.dispatchEvent(new Event('load'));
            const { root } = paint(view);
            const cell = root.querySelector('.item-ic') as HTMLElement;
            expect(cell.querySelector('img')).toBeNull();
            expect(cell.textContent).toBe('RB');
            paint(view);
            expect(images).toHaveLength(1);
        } finally {
            restore();
        }
    });

    it('loaded-icon-replaces-letters-not-covers-them', () => {
        const { images, restore } = probeImages();
        try {
            const view = offersView();
            const pending = paint(view);
            expect(pending.root.querySelector('.item-ic')?.textContent).toBe('RB');
            expect(pending.root.querySelector('.item-ic img')).toBeNull();
            images[0]!.dispatchEvent(new Event('load'));
            const { root } = paint(view);
            const cell = root.querySelector('.item-ic') as HTMLElement;
            const img = cell.querySelector('img');
            expect(img).not.toBeNull();
            expect(img!.parentElement).toBe(cell);
            expect(cell.textContent).toBe('');
            expect(cell.childNodes).toHaveLength(1);
            expect(cell.childNodes[0]).toBe(img);
        } finally {
            restore();
        }
    });

    it('icon-src-is-set-once-per-token', () => {
        const { images, restore } = probeImages();
        try {
            const two: StallOffer[] = [
                OFFER,
                { ...OFFER, outpoint: { txid: OUTPOINT.txid, outIdx: 1 } },
            ];
            const view = offersView(two);
            paint(view);
            expect(images).toHaveLength(1);
            expect(images[0]!.getAttribute('src')).toBe(iconUrl(TOKEN_ID));
            expect(images[0]!.referrerPolicy).toBe('no-referrer');
            images[0]!.dispatchEvent(new Event('load'));
            const again = paint(view);
            paint(view);
            expect(images).toHaveLength(1);
            const painted = again.root.querySelectorAll('.item-ic img');
            expect(painted).toHaveLength(2);
            expect(painted[0]).not.toBe(images[0]);
            expect(painted[1]).not.toBe(images[0]);
            expect(painted[0]).not.toBe(painted[1]);
            expect(painted[0]!.getAttribute('src')).toBe(iconUrl(TOKEN_ID));
            expect(painted[1]!.getAttribute('src')).toBe(iconUrl(TOKEN_ID));
            expect(painted[0]!.getAttribute('data-token-id')).toBe(TOKEN_ID);
            expect(painted[1]!.getAttribute('data-token-id')).toBe(TOKEN_ID);
        } finally {
            restore();
        }
    });

    it('loaded-image-belongs-to-one-token', () => {
        const { images, restore } = probeImages();
        try {
            const other: StallOffer = {
                ...OFFER,
                tokenId: OTHER_TOKEN,
                outpoint: { ...OUTPOINT, outIdx: 1 },
            };
            const view = offersView([OFFER, other], new Map([
                [TOKEN_ID, BEANS],
                [OTHER_TOKEN, TEA],
            ]));
            paint(view);
            expect(images).toHaveLength(2);
            const beans = images.find(
                (img) => img.getAttribute('src') === iconUrl(TOKEN_ID),
            );
            expect(beans).toBeDefined();
            beans!.dispatchEvent(new Event('load'));
            const { root } = paint(view);
            const cells = [...root.querySelectorAll('.item-ic')];
            expect(cells).toHaveLength(2);
            expect(cells[0]!.querySelector('img')?.getAttribute('data-token-id')).toBe(
                TOKEN_ID,
            );
            expect(cells[0]!.querySelector('img')?.getAttribute('src')).toBe(
                iconUrl(TOKEN_ID),
            );
            expect(cells[0]!.textContent).toBe('');
            expect(cells[1]!.querySelector('img')).toBeNull();
            expect(cells[1]!.textContent).toBe('GT');
        } finally {
            restore();
        }
    });

    it('icon-is-child-of-the-clipping-cell', () => {
        const { images, restore } = probeImages();
        try {
            const view = offersView();
            paint(view);
            images[0]!.dispatchEvent(new Event('load'));
            const { root } = paint(view);
            const cell = root.querySelector('.item-ic') as HTMLElement;
            const img = cell.querySelector('img') as HTMLImageElement | null;
            expect(cell.classList.contains('item-ic')).toBe(true);
            expect(img).not.toBeNull();
            expect(img!.parentElement).toBe(cell);
            expect(cell.contains(img!)).toBe(true);
            expect(img!.closest('.item-ic')).toBe(cell);
            const src = readFileSync(join(UI_DIR, 'render.ts'), 'utf8');
            expect(src).not.toMatch(/\binnerHTML\b/);
            expect(src).not.toMatch(/\binsertAdjacentHTML\b/);
        } finally {
            restore();
        }
    });

    it('item-ic-clips-its-image', () => {
        const css = readFileSync(join(UI_DIR, 'stall.css'), 'utf8').replace(
            /\/\*[\s\S]*?\*\//g,
            '',
        );
        const cell = css.match(/\.item-ic\s*\{([^}]+)\}/);
        expect(cell).not.toBeNull();
        expect(cell![1]).toMatch(/overflow:\s*hidden\s*;/);
        const img = css.match(/\.item-ic\s+img\s*\{([^}]+)\}/);
        expect(img).not.toBeNull();
        expect(img![1]).toMatch(/width:\s*100%/);
        expect(img![1]).toMatch(/height:\s*100%/);
        expect(img![1]).toMatch(/object-fit:\s*cover/);
        for (const banned of BANNED_THEME_PROPS) {
            expect(img![1].toLowerCase()).not.toContain(banned);
        }
        // happy-dom does not lay out. Whether a 64px bitmap actually stays
        // inside the 38px cell is a browser fact this runner cannot see.
    });

    it('genesis-url-is-not-an-image-source', () => {
        const trap: TokenMeta = {
            ...BEANS,
            name: 'https://evil.example/icon.png',
            ticker: 'https://minter.example/a.png',
        };
        const { images, restore } = probeImages();
        try {
            paint(
                idlePubkey({
                    fetch: { kind: 'offers', offers: [OFFER] },
                    tokens: new Map([[TOKEN_ID, trap]]),
                }),
            );
            expect(images).toHaveLength(1);
            expect(images[0]!.getAttribute('src')).toBe(iconUrl(TOKEN_ID));
            expect(images[0]!.getAttribute('src')).toContain(ICON_HOST);
            expect(images[0]!.getAttribute('src')).not.toContain('evil.example');
            expect(images[0]!.getAttribute('src')).not.toContain('minter.example');

            const junk: StallOffer = { ...OFFER, tokenId: 'not-a-token' };
            const { root } = paint(
                idlePubkey({
                    fetch: { kind: 'offers', offers: [junk] },
                    tokens: new Map([['not-a-token', trap]]),
                }),
            );
            expect(images).toHaveLength(1);
            expect(root.querySelector('.item-ic img')).toBeNull();
            // Scoped to token-icon cells: the only other <img> is the brand
            // mark, a same-origin fingerprinted asset, never a genesis url.
            for (const img of root.querySelectorAll('.item-ic img')) {
                expect(img.getAttribute('src')).not.toContain('evil.example');
                expect(img.getAttribute('src')).toContain(ICON_HOST);
            }

            const src = readFileSync(join(UI_DIR, 'render.ts'), 'utf8');
            expect(src).toMatch(/from ['"]\.\.\/domain\/icons['"]/);
            expect(src).toMatch(/\biconUrl\s*\(/);
            expect(src).not.toMatch(/\/icon\//);
        } finally {
            restore();
        }
    });

    it('load-replaces-letters-on-the-painted-cell', () => {
        const { images, restore } = probeImages();
        try {
            const { root } = paint(offersView());
            const cell = root.querySelector('.item-ic') as HTMLElement;
            expect(cell.textContent).toBe('RB');
            expect(root.isConnected).toBe(false);
            images[0]!.dispatchEvent(new Event('load'));
            const img = cell.querySelector('img');
            expect(img).not.toBeNull();
            expect(img!.parentElement).toBe(cell);
            expect(cell.textContent).toBe('');
            expect(cell.childNodes).toHaveLength(1);
        } finally {
            restore();
        }
    });
});

describe('initials-are-the-whole-fallback', () => {
    // The icon cache is module state: without this, a token another test
    // already loaded paints an image here and the assertion reads ''.
    beforeEach(() => {
        resetIconsForTests();
    });

    /**
     * Every row is letters until an icon loads, and letters for good if the
     * icon service is unreachable, so what `initials()` produces from a token
     * with no name is the shop's real floor - not a detail.
     *
     * `tokenName` falls back name, then ticker, then the token id, so an
     * unnamed token shows two hex characters. That is recorded here rather
     * than hidden: it is the weakest point of the two-stage design.
     */
    function cellText(view: StallView): string {
        const { root } = paint(view);
        return root.querySelector('.item-ic')?.textContent ?? '';
    }

    it('uses two words when the genesis name has them', () => {
        expect(
            cellText(
                idlePubkey({
                    fetch: { kind: 'offers', offers: [OFFER] },
                    tokens: new Map([[TOKEN_ID, BEANS]]),
                }),
            ),
        ).toBe('RB');
    });

    it('falls to the ticker when the name is empty', () => {
        expect(
            cellText(
                idlePubkey({
                    fetch: { kind: 'offers', offers: [OFFER] },
                    tokens: new Map([[TOKEN_ID, { ...BEANS, name: '' }]]),
                }),
            ),
        ).toBe(BEANS.ticker.slice(0, 2).toUpperCase());
    });

    it('shows two characters of the token id when genesis is unknown', () => {
        // Not a good glyph. Pinned so that improving it is a deliberate change
        // and not a surprise, and so the cost of the icon fallback is visible.
        expect(
            cellText(
                idlePubkey({ fetch: { kind: 'offers', offers: [OFFER] }, tokens: new Map() }),
            ),
        ).toBe(TOKEN_ID.slice(0, 2).toUpperCase());
    });
});

describe('publish-sheet', () => {
    function open(over: Partial<StallView> = {}) {
        return paint(
            idlePubkey({
                fetch: { kind: 'empty' },
                overlay: { kind: 'publish' },
                ...over,
            }),
        );
    }
    const links = (root: HTMLElement) => ({
        web: root.querySelector('[data-role="publish-cashtab"]') as HTMLAnchorElement | null,
        pay: root.querySelector('[data-role="publish-pay"]') as HTMLAnchorElement | null,
        hex: root.querySelector('[data-role="publish-hex"]'),
        err: root.querySelector('[data-role="publish-invalid"]') as HTMLElement | null,
    });

    it('offers the control on a stall that resolved to an address', () => {
        const { root } = paint(idlePubkey({ fetch: { kind: 'empty' } }));
        const btn = root.querySelector('[data-role="open-publish"]');
        expect(btn?.textContent).toBe(SET_UP_THIS_STALL);
    });

    /**
     * A stall with no settings is painted in the shipped default, which is also
     * the first row of the picker. Leaving the selection to the browser was
     * right by accident and read as nothing being chosen, so a seller published
     * the look they already had and saw an unchanged stall — the single most
     * likely reading of "I published and the theme did not render".
     */
    it('picker-shows-the-look-already-on-screen', () => {
        const { root } = open();
        const select = root.querySelector('select[name="theme"]') as HTMLSelectElement;
        expect(select.value).toBe(String(DEFAULT_THEME_ID));
        const note = root.querySelector('[data-role="publish-same-look"]') as HTMLElement;
        expect(note.hidden, 'default look is the painted one, so say so').toBe(false);
        expect(note.textContent).toBe(PUBLISH_SAME_LOOK);
    });

    it('picker-follows-a-published-theme-and-drops-the-note-on-a-change', () => {
        const { root } = open({ theme: decodeTheme(NEO_CITY_THEME_ID) });
        const select = root.querySelector('select[name="theme"]') as HTMLSelectElement;
        expect(select.value).toBe(String(NEO_CITY_THEME_ID));
        const note = root.querySelector('[data-role="publish-same-look"]') as HTMLElement;
        expect(note.hidden).toBe(false);

        select.value = String(RURAL_THEME_ID);
        select.dispatchEvent(new Event('change'));
        expect(note.hidden, 'a different look is a real change').toBe(true);
    });

    /**
     * The live socket listens to the agora group, and a settings transaction
     * does not move the offer book. So no message arrives, nothing re-reads the
     * manifest, and without this the seller signs in another app and comes back
     * to a stall that never changes.
     */
    it('publish-says-nothing-watches-the-wallet', () => {
        const { root, h } = open();
        const text = root.textContent ?? '';
        expect(text).toContain(PUBLISH_AFTER_SIGNING);

        const check = root.querySelector('[data-role="publish-check"]') as HTMLElement;
        expect(check.textContent).toBe(PUBLISH_CHECK_NOW);
        expect(h.onRetry).not.toHaveBeenCalled();
        check.dispatchEvent(new Event('click'));
        expect(h.onRetry).toHaveBeenCalledTimes(1);
    });

    it('does not offer it when there is no address to publish from', () => {
        // A route that never resolved has nothing to sign with, so a link here
        // would be one that cannot work.
        const { root } = paint({
            route: { kind: 'unresolvable', address: ADDR },
            overlay: { kind: 'idle' },
            tokens: new Map(),
        });
        expect(root.querySelector('[data-role="open-publish"]')).toBeNull();
    });

    /**
     * The fixture above is a state `loadCurrent` never builds: `addressOf` sets
     * `view.address` for `unresolvable` and `unresolved` alike, so the app
     * always had one here. Keying the control off the address therefore offered
     * it on a screen that mounts no sheet — a button that did nothing at all.
     * This is the shape the app actually produces.
     */
    it('does-not-offer-a-button-that-opens-nothing', () => {
        for (const route of [
            { kind: 'unresolvable', address: ADDR },
            { kind: 'unresolved', address: ADDR },
        ] as const) {
            const { root } = paint({
                route,
                overlay: { kind: 'idle' },
                address: ADDR,
                tokens: new Map(),
            });
            expect(
                root.querySelector('[data-role="open-publish"]'),
                `${route.kind} mounts no publish sheet, so it must offer no control`,
            ).toBeNull();
        }
    });

    it('paints no sheet on a route that never resolved', () => {
        // The guard inside the sheet is defence, not a screen: a route with no
        // address is painted by paintUnresolvable, which offers no control and
        // no sheet. Asserting the guard's copy here would test a state the app
        // cannot reach.
        const { root } = paint({
            route: { kind: 'unresolvable', address: ADDR },
            overlay: { kind: 'publish' },
            tokens: new Map(),
        });
        expect(root.querySelector('[data-role="publish"]')).toBeNull();
        expect(root.textContent).not.toContain(PUBLISH_UNAVAILABLE);
    });

    it('builds both bridges under their opposite encoding rules', () => {
        const { root } = open();
        const nameInput = root.querySelector('input[name="stall-name"]') as HTMLInputElement;
        nameInput.value = 'Nato';
        nameInput.dispatchEvent(new Event('input'));
        const { web, pay } = links(root);
        // Cashtab web takes the BIP21 raw in the fragment; pay.e.cash encodes it.
        expect(web?.href).toContain(`#/send?bip21=${ADDR}?amount=5.46&op_return_raw=`);
        expect(pay?.href).toContain('pay.e.cash/?bip21=');
        expect(pay?.href).toContain(encodeURIComponent(`${ADDR}?amount=5.46`));
        expect(web?.href).not.toContain('%3A');
    });

    it('shows the bytes, because the wallet shows nothing else', () => {
        const { root } = open();
        const nameInput = root.querySelector('input[name="stall-name"]') as HTMLInputElement;
        nameInput.value = 'Nato';
        nameInput.dispatchEvent(new Event('input'));
        const { hex } = links(root);
        // 04 STL1, 04 "Nato", 01 <id>
        expect(hex?.textContent).toBe('0453544c31044e61746f0101');
        expect(root.textContent).toContain(PUBLISH_MUST_SIGN);
    });

    it('refuses a name that is too many bytes, and offers no link', () => {
        const { root } = open();
        const nameInput = root.querySelector('input[name="stall-name"]') as HTMLInputElement;
        // 17 three-byte characters is 51 bytes, while its JS length is 17.
        nameInput.value = 'ế'.repeat(17);
        nameInput.dispatchEvent(new Event('input'));
        const { web, pay, err } = links(root);
        expect(err?.hidden).toBe(false);
        expect(err?.textContent).toBe(PUBLISH_NAME_TOO_LONG);
        expect(web?.hasAttribute('href')).toBe(false);
        expect(pay?.getAttribute('aria-disabled')).toBe('true');
    });
});

describe('apex directs the seller to their own address', () => {
    it('names the receive address, not a public key they cannot see', () => {
        const { root } = paint({ route: { kind: 'home' }, overlay: { kind: 'idle' }, tokens: new Map() });
        expect(root.textContent).toContain(HOME_SELLER);
        // A seller can copy their address out of Cashtab; the pubkey is shown
        // nowhere, so the seller line must not send them looking for one.
        expect(HOME_SELLER.toLowerCase()).toContain('address');
        expect(HOME_SELLER.toLowerCase()).not.toContain('public key');
    });
});

describe('unresolvable-is-not-a-shareable-shop', () => {
    it('drops copy-link, offers a retry and a real link to list', () => {
        const { root, h } = paint({
            route: { kind: 'unresolvable', address: ADDR },
            overlay: { kind: 'idle' },
            address: ADDR,
            tokens: new Map(),
        });
        // A never-spent address is not a shop, so its link is not offered.
        expect(root.querySelector('[data-role="copy-link"]')).toBeNull();
        // But a listing is a new spend that resolves it, so retry is the way on.
        expect(root.querySelector('[data-role="retry"]')).not.toBeNull();
        // And listing is a link, not a sentence.
        const link = root.querySelector('[data-role="list-in-cashtab"]') as HTMLAnchorElement;
        expect(link).not.toBeNull();
        expect(link.getAttribute('href')).toContain('cashtab.com');
        expect(root.textContent).not.toContain(UNREACHABLE_BODY);
        // Retry re-reads the address.
        expect(h.onRetry).not.toHaveBeenCalled();
        (root.querySelector('[data-role="retry"]') as HTMLElement).click();
        expect(h.onRetry).toHaveBeenCalledTimes(1);
    });
});

describe('resolved-stall-shows-the-share-link-as-the-prize', () => {
    const cases: Array<[string, StallView['fetch']]> = [
        ['offers', { kind: 'offers', offers: [OFFER] }],
        ['empty', { kind: 'empty' }],
    ];
    for (const [label, fetch] of cases) {
        it(`says what the link is for and draws its QR (${label})`, () => {
            const { root } = paint(
                idlePubkey({ fetch, tokens: new Map([[TOKEN_ID, BEANS]]) }),
            );
            const share = root.querySelector('[data-role="copy-link"]') as HTMLElement;
            expect(share).not.toBeNull();
            expect(share.textContent).toContain(SHARE_LEDE);
            const qr = share.querySelector('svg.qr.share-qr');
            expect(qr).not.toBeNull();
            // A real QR is one path of modules, not an empty box.
            expect((qr!.querySelector('path')?.getAttribute('d')?.length ?? 0)).toBeGreaterThan(100);
        });
    }
});

describe('publish-sheet-carries-a-scannable-bip21', () => {
    it('draws the QR for a valid record and hides it for an invalid name', () => {
        const view = idlePubkey({
            fetch: { kind: 'empty' },
            overlay: { kind: 'publish' },
            stallName: 'Shop',
        });
        const { root } = paint(view);
        const qrBox = root.querySelector('[data-role="publish-qr"]') as HTMLElement;
        expect(qrBox).not.toBeNull();
        expect(qrBox.hidden).toBe(false);
        expect(qrBox.querySelector('svg.qr')).not.toBeNull();

        const input = root.querySelector('input[name="stall-name"]') as HTMLInputElement;
        input.value = '';
        input.dispatchEvent(new Event('input'));
        expect(qrBox.hidden).toBe(true);
    });
});

describe('expanded-card-shows-a-large-token-image', () => {
    it('puts a large icon cell at the top of the opened detail', () => {
        resetIconsForTests();
        const { root } = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                tokens: new Map([[TOKEN_ID, BEANS]]),
                overlay: { kind: 'buy', outpoint: OUTPOINT },
            }),
        );
        const detail = root.querySelector('[data-role="detail"]') as HTMLElement;
        expect(detail).not.toBeNull();
        const big = detail.querySelector('.item-ic.item-ic-lg') as HTMLElement;
        expect(big).not.toBeNull();
        // It is the first thing in the panel.
        expect(detail.firstElementChild).toBe(big);
        // No icon has loaded, so it holds the initials, never an empty square.
        expect(big.textContent?.length ?? 0).toBeGreaterThan(0);
    });
});

describe('apex signposts a demo without becoming a shop', () => {
    it('shows a coming-soon placeholder, not a fetched stall', () => {
        const h = handlers();
        const root = document.createElement('div');
        renderStall(root, { route: { kind: 'home' }, overlay: { kind: 'idle' }, tokens: new Map() }, h);
        const demo = root.querySelector('[data-role="demo-soon"]');
        expect(demo).not.toBeNull();
        expect(demo!.textContent).toContain(HOME_DEMO_SOON);
        // The door never paints a shop: no offer rows, no copy-link, no price.
        expect(root.querySelector('[data-role="price"]')).toBeNull();
        expect(root.querySelector('[data-role="copy-link"]')).toBeNull();
        expect(root.querySelector('.item')).toBeNull();
    });
});

describe('unresolvable narrates the journey forward', () => {
    it('tells a new seller this is the first step, not a dead end', () => {
        const { root } = paint({
            route: { kind: 'unresolvable', address: ADDR },
            overlay: { kind: 'idle' },
            address: ADDR,
            tokens: new Map(),
        });
        expect(root.textContent).toContain(UNRESOLVABLE_NEXT);
    });
});

describe('brand mark leads the header', () => {
    /**
     * The mark is the app's identity, so it precedes every screen's headings —
     * the apex and a resolved stall alike. It is the shipped logo image on a
     * same-origin, fingerprinted asset (no external host, `img-src 'self'`),
     * and it is decorative: the name beside it carries identity to a reader.
     */
    it('is the logo image, first in the header, on apex and stall', () => {
        const views: StallView[] = [
            { route: { kind: 'home' }, overlay: { kind: 'idle' }, tokens: new Map() },
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                tokens: new Map([[TOKEN_ID, BEANS]]),
                theme: decodeTheme(NEO_CITY_THEME_ID),
            }),
        ];
        for (const view of views) {
            const { root } = paint(view);
            const head = root.querySelector('.stall-head') as HTMLElement | null;
            expect(head, 'every header exists').not.toBeNull();
            const mark = head!.querySelector('img.stall-mark') as HTMLImageElement | null;
            expect(mark, 'the mark leads the header').not.toBeNull();
            expect(mark!.tagName).toBe('IMG');
            expect(mark!.getAttribute('src'), 'the logo asset is wired').toBeTruthy();
            expect(mark!.alt, 'decorative: the name beside it announces identity').toBe('');
            expect(head!.firstElementChild, 'mark precedes the headings').toBe(mark);
        }
    });
});

describe('theme ornament is data, not per-theme code', () => {
    function ornOf(theme: ReturnType<typeof decodeTheme>): HTMLElement | null {
        const { root } = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                tokens: new Map([[TOKEN_ID, BEANS]]),
                theme,
            }),
        );
        return root.querySelector('.stall .orn') as HTMLElement | null;
    }

    it('Neo city ships a ticker strip and Rural a plate, above the sign', () => {
        const neo = ornOf(decodeTheme(NEO_CITY_THEME_ID));
        expect(neo, 'Neo city ships an ornament').not.toBeNull();
        expect(neo!.classList.contains('orn-ticker')).toBe(true);
        expect(neo!.textContent).toBe('// stall.cash');

        const rural = ornOf(decodeTheme(RURAL_THEME_ID));
        expect(rural, 'Rural ships an ornament').not.toBeNull();
        expect(rural!.classList.contains('orn-plate')).toBe(true);
        expect(rural!.textContent).toBe('Market stall');
    });

    it('Modern and an unknown id ship none — the strip simply does not appear', () => {
        expect(ornOf(decodeTheme(DEFAULT_THEME_ID))).toBeNull();
        expect(ornOf(decodeTheme(0xfe))).toBeNull();
    });

    it('sits at the very top of the stall, before the header', () => {
        const { root } = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                tokens: new Map([[TOKEN_ID, BEANS]]),
                theme: decodeTheme(NEO_CITY_THEME_ID),
            }),
        );
        const stall = root.querySelector('.stall') as HTMLElement;
        expect(stall.firstElementChild?.classList.contains('orn')).toBe(true);
    });
});
