// @vitest-environment happy-dom
import { encodeCashAddress } from 'ecashaddrjs';
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
    SHIPPED_THEMES,
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
    DEMO_STALL_ADDRESS,
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
import { MAX_DESCRIPTION_BYTES, encodeDescriptionHex } from '../domain/description';
import { scaleRate } from '../domain/fiat';
import * as copy from './copy';
import { SHIPPED_ATTACHMENTS, wornAttachments } from '../domain/attachments';
import { LIST_IN_CASHTAB_LINK, PUBLISH_OPEN_CASHTAB, PUBLISH_OPEN_PAY, DESC_LEDE, DESC_TOO_LONG, descBytesLeft, TOKEN_DESCRIPTION_LABEL, NFT_GROUPS_TRUNCATED, SECTION_UNSORTED_WHY, itemsForSale } from './copy';
import { SHARE_QR_TOO_LONG, TOKEN_LINK_WARNING } from './copy';
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

    it('lets an expanded row span the grid so the neighbour keeps its price', () => {
        const neighbour: StallOffer = {
            ...OFFER,
            outpoint: { txid: OUTPOINT.txid, outIdx: 1 },
        };
        const { root } = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER, neighbour] },
                overlay: { kind: 'buy', outpoint: OUTPOINT },
                tokens: new Map([[TOKEN_ID, BEANS]]),
                // Any look: the span is no longer one layout's privilege, so
                // the guarantee is asserted on the default one.
                theme: decodeTheme(RURAL_THEME_ID),
            }),
        );
        const stall = root.querySelector('.stall') as HTMLElement;
        const cards = [...stall.querySelectorAll('.item')];
        expect(cards).toHaveLength(2);
        expect(cards[0]?.classList.contains('open')).toBe(true);
        expect(cards[1]?.classList.contains('open')).toBe(false);
        const prices = stall.querySelectorAll('[data-role="price"]');
        expect(prices).toHaveLength(2);
        expect(prices[0]?.textContent).toBe('1,200');
        expect(prices[1]?.textContent).toBe('1,200');
        expect(stall.contains(prices[1]!)).toBe(true);
        // Whether the span actually keeps it on screen is a browser fact this
        // runner cannot see: happy-dom does not lay out. What is asserted here
        // is that the neighbour and its price are still rendered at all.
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
    over: Partial<StallView> = {},
): StallView {
    return idlePubkey({
        fetch: { kind: 'offers', offers },
        tokens,
        ...over,
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
            // Found by token, not by position: rows are ordered by token id
            // now, and this test is about which cell the image belongs to.
            const withImg = cells.filter((c) => c.querySelector('img') !== null);
            expect(withImg, 'exactly one token loaded').toHaveLength(1);
            const loaded = withImg[0]!;
            expect(loaded.querySelector('img')?.getAttribute('data-token-id')).toBe(
                TOKEN_ID,
            );
            expect(loaded.querySelector('img')?.getAttribute('src')).toBe(
                iconUrl(TOKEN_ID),
            );
            expect(loaded.textContent).toBe('');
            const lettered = cells.find((c) => c !== loaded)!;
            expect(lettered.querySelector('img')).toBeNull();
            expect(lettered.textContent).toBe('GT');
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
     * The socket watches the stall address now, so a record published from that
     * wallet does re-read on its own. Three things can each stop it, none of
     * them visible from here: the wrong wallet signs a record that will never be
     * this stall's, a host without avalanche pre-consensus turns seconds into
     * next block, and a socket that is down delivers nothing.
     *
     * So the pin is the **negative** — no unconditional arrival, no timing — plus
     * the control that asks outright. Pinning the sentence instead would make
     * this test approve whatever copy happened to be written.
     */
    it('publish-does-not-promise-a-record-will-arrive', () => {
        const { root, h } = open();
        const text = root.textContent ?? '';
        expect(text).toContain(PUBLISH_AFTER_SIGNING);

        const said = PUBLISH_AFTER_SIGNING.toLowerCase();
        for (const promise of [
            'will appear',
            'will show',
            'lands automatically',
            'automatically',
            'a few seconds',
            'within seconds',
        ]) {
            expect(said, `promises arrival: "${promise}"`).not.toContain(promise);
        }
        // And it does name the condition, so the absence above is a rewrite
        // rather than a deletion.
        expect(said, 'says nothing about what has to hold').toContain('connection');

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
        // A real route now, not a "coming soon". Still a link: the apex never
        // fetches, so it cannot promise what that shop has in it.
        const open = demo!.querySelector('[data-role="open-demo"]') as HTMLButtonElement;
        expect(open).not.toBeNull();
        open.click();
        expect(h.onOpenStall).toHaveBeenCalledWith(DEMO_STALL_ADDRESS);
        // The copy promises the page, never the inventory: this stall's last
        // offer can sell, and Stall cannot tell that it did.
        expect(demo!.textContent).not.toMatch(/coming soon/i);
        expect(demo!.textContent).not.toMatch(/\bdemo\b(?!\.)/i);
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
            const sign = head!.querySelector('.stall-sign') as HTMLElement | null;
            expect(sign, 'the sign carries the mark and the headings').not.toBeNull();
            const mark = sign!.querySelector('img.stall-mark') as HTMLImageElement | null;
            expect(mark, 'the mark leads the sign').not.toBeNull();
            expect(mark!.tagName).toBe('IMG');
            expect(mark!.getAttribute('src'), 'the logo asset is wired').toBeTruthy();
            expect(mark!.alt, 'decorative: the name beside it announces identity').toBe('');
            expect(sign!.firstElementChild, 'mark precedes the headings').toBe(mark);
            expect(head!.firstElementChild, 'the sign leads the header').toBe(sign);
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

describe('publish sheet is a sheet, not a row in the shop', () => {
    /**
     * The seller opened this deliberately, so it sits over the stall rather
     * than pushing the offers down. It carries the dialog roles a screen reader
     * needs, and the scrim closes it — a modal with only one way out is a trap
     * on a phone. A click inside the sheet must not close it.
     */
    it('mounts a scrim over the stall and closes only on the scrim', () => {
        const { root, h } = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                tokens: new Map([[TOKEN_ID, BEANS]]),
                overlay: { kind: 'publish' },
            }),
        );
        const scrim = root.querySelector('[data-role="sheet-scrim"]') as HTMLElement | null;
        expect(scrim, 'the sheet is carried by a scrim').not.toBeNull();
        const sheet = scrim!.querySelector('[data-role="publish"]') as HTMLElement | null;
        expect(sheet, 'the sheet sits inside the scrim').not.toBeNull();
        expect(sheet!.classList.contains('sheet')).toBe(true);
        expect(sheet!.getAttribute('role')).toBe('dialog');
        expect(sheet!.getAttribute('aria-modal')).toBe('true');
        // Over the stall, not inside the body flow that holds the offer rows.
        expect(scrim!.parentElement?.classList.contains('stall')).toBe(true);
        expect(root.querySelector('.stall-body')?.contains(scrim!)).toBe(false);

        sheet!.dispatchEvent(new Event('click', { bubbles: true }));
        expect(h.onClosePublish, 'a click inside the sheet keeps it open').not.toHaveBeenCalled();
        scrim!.dispatchEvent(new Event('click', { bubbles: true }));
        expect(h.onClosePublish).toHaveBeenCalledTimes(1);
    });
});

describe('unscannable-link-drops-the-qr-not-the-page', () => {
    /**
     * `qrMatrix` threw above ~2,300 characters, and `renderStall` empties the
     * root before it paints — so a forwarded link with a long query string blew
     * up mid-paint and left a permanently white page. Every repaint threw
     * again, so the retry control could not rescue it. Reproduced: a 2,603
     * character search string, `root.childElementCount === 0`.
     *
     * The cap is scannability, not the library's ceiling: at 2,272 characters
     * the matrix is 177 modules inside a 168px box, unreadable long before it
     * overflows. So the rule is that a link too long to scan keeps its copy
     * field and loses its code, and says so.
     */
    const longSearch = `?m=${'a'.repeat(2600)}`;

    function paintWithSearch(search: string) {
        const before = window.location.href;
        window.history.replaceState({}, '', `/s/x${search}`);
        try {
            return paint(idlePubkey({ fetch: { kind: 'empty' } }));
        } finally {
            window.history.replaceState({}, '', before);
        }
    }

    it('still paints the stall, and swaps the code for a reason', () => {
        const { root } = paintWithSearch(longSearch);
        expect(root.childElementCount, 'the page is not blank').toBeGreaterThan(0);
        expect(root.querySelector('.stall')).not.toBeNull();
        const share = root.querySelector('[data-role="copy-link"]');
        expect(share, 'the copy control survives').not.toBeNull();
        expect(share!.querySelector('svg.qr'), 'no unscannable code').toBeNull();
        const why = root.querySelector('[data-role="qr-too-long"]');
        expect(why, 'the page says why').not.toBeNull();
        expect(why!.textContent).toBe(SHARE_QR_TOO_LONG);
    });

    it('a normal link still gets its code', () => {
        const { root } = paintWithSearch('');
        const share = root.querySelector('[data-role="copy-link"]');
        expect(share!.querySelector('svg.qr')).not.toBeNull();
        expect(root.querySelector('[data-role="qr-too-long"]')).toBeNull();
    });
});

describe('screens have an outline and a main landmark', () => {
    /**
     * The whole site was `div`s: no heading anywhere, so a screen-reader user
     * had nothing to navigate by and the page had no outline. `stall.css`
     * selects on class, so this is purely additive.
     */
    it('gives each screen one h1 and one main, and never an empty heading', () => {
        for (const view of [
            { route: { kind: 'home' }, overlay: { kind: 'idle' }, tokens: new Map() } as StallView,
            idlePubkey({ fetch: { kind: 'offers', offers: [OFFER] }, tokens: new Map([[TOKEN_ID, BEANS]]) }),
            idlePubkey({ fetch: { kind: 'empty' } }),
        ]) {
            const { root } = paint(view);
            expect(root.querySelectorAll('h1')).toHaveLength(1);
            expect(root.querySelectorAll('main')).toHaveLength(1);
            for (const h of root.querySelectorAll('h1, h2')) {
                expect(h.textContent, 'a heading with no text is worse than none').not.toBe('');
            }
        }
    });
});

describe('phone-keyboard-cannot-invalidate-a-pasted-address', () => {
    /**
     * cashaddr is case-strict: `Ecash:qq…` fails validation for an address that
     * is correct. A phone keyboard capitalises the first character, so without
     * this a seller typing their own address is told it is not an eCash
     * address. Not fixed by lowercasing in the parser — mixed case is a real
     * cashaddr signal.
     */
    it('turns off autocapitalize and autocorrect on the paste field', () => {
        const { root } = paint({
            route: { kind: 'home' },
            overlay: { kind: 'idle' },
            tokens: new Map(),
        });
        const input = root.querySelector('.paste-in') as HTMLInputElement;
        expect(input.getAttribute('autocapitalize')).toBe('none');
        expect(input.getAttribute('autocorrect')).toBe('off');
    });
});

describe('controls that look like buttons are not underlined', () => {
    /**
     * `.buy` and `.mini` are worn by both `<button>` and `<a>`. An anchor is
     * inline by default, so `width: 100%` was ignored and the padding overflowed
     * the line box wherever the parent was not flex — which is `listInCashtab`,
     * on the first screen a new seller sees.
     */
    it('gives .buy a block box and no underline', () => {
        const css = readFileSync(join(UI_DIR, 'stall.css'), 'utf8').replace(
            /\/\*[\s\S]*?\*\//g,
            '',
        );
        const buy = css.match(/\.buy\s*\{([^}]+)\}/);
        expect(buy).not.toBeNull();
        expect(buy![1]).toMatch(/display:\s*block/);
        expect(buy![1]).toMatch(/text-decoration:\s*none/);
        const mini = css.match(/\.mini\s*\{([^}]+)\}/);
        expect(mini![1]).toMatch(/text-decoration:\s*none/);
    });
});

describe('initials-survive-an-astral-name', () => {
    it('does not split a surrogate pair into a lone half', () => {
        const { root, restore } = (() => {
            const p = probeImages();
            const painted = paint(
                idlePubkey({
                    fetch: { kind: 'offers', offers: [OFFER] },
                    tokens: new Map([[TOKEN_ID, { ...BEANS, name: '𝒮𝒽𝑜𝓅' }]]),
                }),
            );
            return { root: painted.root, restore: p.restore };
        })();
        try {
            const cell = root.querySelector('.item-ic') as HTMLElement;
            const text = cell.textContent ?? '';
            for (const unit of text) {
                const code = unit.charCodeAt(0);
                expect(code >= 0xd800 && code <= 0xdfff && unit.length === 1).toBe(false);
            }
            expect([...text]).toHaveLength(2);
        } finally {
            restore();
        }
    });
});

describe('same-token-rows-are-adjacent-on-screen', () => {
    /**
     * `compareOffers` has its own test, but a correct comparator nobody calls
     * paints nothing — the shape of the `--s-accent-2` bug. This asserts the
     * painted order, so removing the sort from `paintOffers` turns it red.
     */
    it('prints both offers of a token together, cheaper first', () => {
        const dear: StallOffer = {
            ...OFFER,
            outpoint: { ...OUTPOINT, outIdx: 3 },
            askedSats: 900n * 100n,
            priceNanoSatsPerAtom: 900n * 100n * 1_000_000_000n,
        };
        const cheap: StallOffer = {
            ...OFFER,
            outpoint: { ...OUTPOINT, outIdx: 4 },
            askedSats: 300n * 100n,
            priceNanoSatsPerAtom: 300n * 100n * 1_000_000_000n,
        };
        const other: StallOffer = {
            ...OFFER,
            tokenId: OTHER_TOKEN,
            outpoint: { ...OUTPOINT, outIdx: 5 },
        };
        // Interleaved on the way in, exactly as an unsorted index answers.
        // Both fungible on purpose: this is a test about ordering, and two
        // different categories would divide them into sections instead.
        const { root } = paint(
            offersView(
                [dear, other, cheap],
                new Map([
                    [TOKEN_ID, BEANS],
                    [OTHER_TOKEN, { ...TEA, tokenType: BEANS.tokenType }],
                ]),
            ),
        );
        const names = [...root.querySelectorAll('.item-n')].map((n) => n.textContent);
        expect(names, 'the two Beans rows are not split by Tea').toEqual([
            'Green Tea',
            'Roasted Beans',
            'Roasted Beans',
        ]);
        const prices = [...root.querySelectorAll('[data-role="price"]')].map(
            (p) => p.textContent,
        );
        // Within the token, the cheaper rate is printed first.
        expect(prices[1]).toBe('300');
        expect(prices[2]).toBe('900');
    });
});

describe('repaint-keeps-the-focused-control', () => {
    /**
     * Every handler in `app.ts` ends in a repaint and `renderStall` replaces the
     * whole tree, so pressing Enter on an offer put focus back on `<body>`: a
     * keyboard user had to tab from the top of the page to reach the disclosure
     * they had just opened, and a live agora message did the same thing
     * mid-interaction. Focus survives by a stable key per control.
     */
    it('returns focus to the same offer row across a repaint', () => {
        const root = document.createElement('div');
        document.body.append(root);
        try {
            const view = offersView([OFFER]);
            renderStall(root, view, handlers());
            const row = root.querySelector('button.item-head') as HTMLButtonElement;
            row.focus();
            expect(document.activeElement).toBe(row);
            const key = row.getAttribute('data-focus-key');
            expect(key).toBe(`offer:${OUTPOINT.txid}:${OUTPOINT.outIdx}`);

            renderStall(root, view, handlers());
            const after = root.querySelector('button.item-head') as HTMLButtonElement;
            expect(after, 'a fresh element, same identity').not.toBe(row);
            expect(document.activeElement, 'focus followed the key').toBe(after);
        } finally {
            root.remove();
        }
    });

    it('drops focus when the control it was on is gone', () => {
        const root = document.createElement('div');
        document.body.append(root);
        try {
            renderStall(root, offersView([OFFER]), handlers());
            (root.querySelector('button.item-head') as HTMLButtonElement).focus();
            // The offer sold: its outpoint is spent, so the row is not "the same
            // row that moved" and must not hand focus to whatever replaced it.
            renderStall(root, idlePubkey({ fetch: { kind: 'empty' } }), handlers());
            expect(root.querySelector('button.item-head')).toBeNull();
            expect(document.activeElement).not.toBe(null);
            expect((document.activeElement as HTMLElement).closest('.item-head')).toBeNull();
        } finally {
            root.remove();
        }
    });
});

describe('sheet-closes-on-escape', () => {
    /**
     * `aria-modal="true"` was a claim the markup did not honour: there was no
     * way out but the scrim and the close button, and focus never entered the
     * sheet at all.
     */
    it('takes focus on open and closes on Escape', () => {
        const root = document.createElement('div');
        document.body.append(root);
        try {
            const h = handlers();
            renderStall(
                root,
                idlePubkey({
                    fetch: { kind: 'offers', offers: [OFFER] },
                    tokens: new Map([[TOKEN_ID, BEANS]]),
                    overlay: { kind: 'publish' },
                }),
                h,
            );
            const sheet = root.querySelector('[data-role="publish"]') as HTMLElement;
            expect(sheet.tabIndex, 'focusable without joining the tab order').toBe(-1);
            sheet.focus();
            expect(document.activeElement).toBe(sheet);

            sheet.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'a', bubbles: true }),
            );
            expect(h.onClosePublish, 'only Escape closes it').not.toHaveBeenCalled();
            sheet.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
            );
            expect(h.onClosePublish).toHaveBeenCalledTimes(1);
        } finally {
            root.remove();
        }
    });
});

describe('danger-is-reserved-for-what-is-wrong', () => {
    /**
     * The two handoff sentences are the most load-bearing text on the buyer's
     * path, and they are an explanation. Painting them in the danger colour on
     * every expanded card spent the one colour that should mean something has
     * gone wrong. `.ctx` keeps the validation errors and the unbuyable line.
     */
    it('paints the handoff lines as notes, not errors', () => {
        const { root } = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                overlay: { kind: 'buy', outpoint: OUTPOINT },
                tokens: new Map([[TOKEN_ID, BEANS]]),
            }),
        );
        const panel = root.querySelector('[data-role="detail"]') as HTMLElement;
        const notes = [...panel.querySelectorAll('.note')].map((n) => n.textContent);
        expect(notes).toContain(HANDOFF_MAY_PRESELECT);
        expect(notes).toContain(HANDOFF_PRICE_IS_NOT_THE_ROW);
        // The buyable card has nothing wrong with it, so nothing is red.
        expect(panel.querySelector('.ctx')).toBeNull();
    });
});

/**
 * Resolve a `font-size` declaration to px, or **refuse the block loudly**.
 *
 * The first version matched `/([\d.]+)px/` and `continue`d when the regex
 * found nothing — so converting the type scale to `rem` would have turned the
 * two guards below into no-ops that stay green while guarding nothing. A
 * guard that cannot read a value must fail the suite, never skip the block.
 *
 * `px` is exact. `rem` resolves against the browser default of 16, which is
 * safe because the stylesheet never sets a font-size on `html` (asserted
 * below). Anything else — `em`, `clamp()`, `var()` — depends on context this
 * static scan does not have, so it is refused: use px or rem in blocks these
 * guards read.
 */
function fontSizePx(block: string): number | undefined {
    const decl = block.match(/font-size:\s*([^;}]+)/);
    if (decl === null) {
        return undefined;
    }
    const value = decl[1]!.trim();
    if (value === 'inherit') {
        return undefined;
    }
    // A theme-supplied size resolves through the shipped table: the guard
    // takes the smallest value any look gives the var, so a floor holds for
    // every theme at once rather than being skipped as unreadable.
    const themed = value.match(/^var\((--s-[a-z-]+)\)$/);
    if (themed !== null) {
        let min = Infinity;
        for (const t of SHIPPED_THEMES) {
            const emitted = themeVars(decodeTheme(t.id))[themed[1]!];
            const px = emitted?.match(/^([\d.]+)px$/);
            if (px == null) {
                throw new Error(
                    `${themed[1]} is used as a font-size and "${emitted}" is not a px value this guard can read`,
                );
            }
            min = Math.min(min, Number(px[1]));
        }
        return min;
    }
    const sized = value.match(/^([\d.]+)(px|rem)$/);
    if (sized === null) {
        throw new Error(
            `font-size "${value}" cannot be statically resolved — use px, rem or a --s-* var in guarded blocks`,
        );
    }
    const n = Number(sized[1]);
    return sized[2] === 'px' ? n : n * 16;
}

describe('muted-text-is-not-microscopic', () => {
    /**
     * `--s-muted` carries real content, not decoration: the rate, the stock,
     * the address, and the hosts box that says what we tried and why we failed.
     * Its floor is `MIN_CONTRAST` (3), which is the WCAG threshold for
     * interface components rather than for body text — correct for
     * `--s-accent`, which is a button background, and thin for a sentence.
     *
     * This does not make the palette compliant; 4.5:1 is the AA floor for text
     * at any size below 24px, and the shipped `muted` values sit at 4.33
     * (Modern) and 3.63 (Rural). What it does is stop the weakest colour on the
     * page from also being the smallest type. Raising the floor itself would
     * replace two shipped palettes with ink — see `legibleOn`, which swaps
     * rather than darkens — and that is a look change, not a fix.
     */
    it('sets no muted role below 11px', () => {
        const css = readFileSync(join(UI_DIR, 'stall.css'), 'utf8').replace(
            /\/\*[\s\S]*?\*\//g,
            '',
        );
        // The rem fallback in `fontSizePx` rests on the root staying at the
        // browser default. A `font-size` on html would quietly re-scale it.
        expect(css).not.toMatch(/html[^{]*\{[^}]*font-size/);

        const offenders: string[] = [];
        for (const block of css.split('}')) {
            if (!block.includes('color: var(--s-muted)')) {
                continue;
            }
            const px = fontSizePx(block);
            if (px !== undefined && px < 11) {
                const selector = block.split('{')[0]!.trim().replace(/\s+/g, ' ');
                offenders.push(`${selector} at ${px}px`);
            }
        }
        expect(offenders, 'muted is the weakest colour; it may not also be the smallest type').toEqual([]);
    });
});

describe('ios-does-not-zoom-a-focused-field', () => {
    /**
     * iOS Safari zooms the page when a field with type below 16px takes focus,
     * and does not zoom back out. On the apex that lands a seller inside a
     * pinched page on the one screen the door exists to serve. The `<select>`
     * for the look counts: it wears `.paste-in` too.
     */
    it('gives every field at least 16px', () => {
        const css = readFileSync(join(UI_DIR, 'stall.css'), 'utf8').replace(
            /\/\*[\s\S]*?\*\//g,
            '',
        );
        const { root } = paint({
            route: { kind: 'home' },
            overlay: { kind: 'idle' },
            tokens: new Map(),
        });
        const fields = [...root.querySelectorAll('input, select, textarea')];
        expect(fields.length, 'the door has a field to check').toBeGreaterThan(0);

        const tooSmall: string[] = [];
        for (const block of css.split('}')) {
            const selector = block.split('{')[0]!.trim().replace(/\s+/g, ' ');
            if (!/\.paste-in|\.share-url/.test(selector)) {
                continue;
            }
            const px = fontSizePx(block);
            if (px !== undefined && px < 16) {
                tooSmall.push(`${selector} at ${px}px`);
            }
        }
        expect(tooSmall, 'a field below 16px makes iOS zoom and stay zoomed').toEqual([]);
        // The classes the rule is written against are the ones actually worn.
        for (const f of fields) {
            expect(
                f.classList.contains('paste-in') || f.classList.contains('share-url'),
                `${f.tagName} wears no sized field class`,
            ).toBe(true);
        }
    });
});

describe('fiat-is-beside-the-price-never-inside-it', () => {
    /**
     * §8: the price node holds the number the covenant encodes. The fiat figure
     * is the same shape as the labelled rate that already sits beside it — a
     * rounded figure for a glance, in its own node — and it is absent whenever
     * the feed did not answer, because a stale rate renders a two-dollar item
     * at two cents and nobody would find out.
     */
    const withRate = (over = {}) =>
        idlePubkey({
            fetch: { kind: 'offers', offers: [OFFER] },
            tokens: new Map([[TOKEN_ID, BEANS]]),
            fiatCode: 'usd',
            fiatRate: scaleRate(0.00003),
            ...over,
        });

    it('paints a fiat line that is not the price node', () => {
        const { root } = paint(withRate());
        const fiat = root.querySelector('[data-role="fiat"]') as HTMLElement;
        expect(fiat).not.toBeNull();
        expect(fiat.textContent).toBe('$0.04');

        const price = root.querySelector('[data-role="price"]') as HTMLElement;
        // The asked amount is untouched, and does not contain the fiat figure.
        expect(price.textContent).toBe('1,200');
        expect(price.contains(fiat)).toBe(false);
        expect(price).not.toBe(fiat);
        const rate = root.querySelector('[data-role="rate"]') as HTMLElement;
        expect(rate.contains(fiat)).toBe(false);
    });

    it('paints nothing at all when the rate did not load', () => {
        for (const over of [
            { fiatRate: undefined },
            { fiatCode: undefined },
            { fiatCode: 'xyz' },
        ]) {
            const { root } = paint(withRate(over));
            expect(
                root.querySelector('[data-role="fiat"]'),
                JSON.stringify(over),
            ).toBeNull();
            // The stall still paints, and the asked amount is still there.
            expect(root.querySelector('[data-role="price"]')?.textContent).toBe('1,200');
        }
    });

    it('says nothing on an offer no covenant will sell', () => {
        const { root } = paint(
            withRate({
                fetch: {
                    kind: 'offers',
                    offers: [{ ...OFFER, askedAtoms: 999n, minAcceptedAtoms: 999n }],
                },
            }),
        );
        // No asked price is shown for an unbuyable remainder, so there is no
        // figure for a fiat line to be a conversion of.
        expect(root.querySelector('[data-role="fiat"]')).toBeNull();
    });
});

describe('genesis-link-arms-before-it-leaves', () => {
    /**
     * The minter wrote this field, it is permanent on chain, and nobody checked
     * it. So it does not arrive as a link: it arrives as inert text, touching
     * it says who wrote it and turns it live, and following it asks once more
     * and names the host. Two deliberate acts, and no second "Open…" button on
     * a card that already has one.
     */
    const withUrl = (url: string | undefined) =>
        idlePubkey({
            fetch: { kind: 'offers', offers: [OFFER] },
            overlay: { kind: 'buy', outpoint: OUTPOINT },
            tokens: new Map([[TOKEN_ID, { ...BEANS, url }]]),
        });

    it('starts inert, arms on touch, and confirms before leaving', () => {
        const { root } = paint(withUrl('https://example.com/beans'));
        const block = root.querySelector('[data-role="token-link"]') as HTMLElement;
        expect(block).not.toBeNull();

        const link = block.querySelector('[data-role="token-link-url"]') as HTMLAnchorElement;
        // The real destination from the start, so what is read is what is
        // followed — the raw genesis string is never displayed.
        expect(link.textContent).toBe('https://example.com/beans');
        expect(link.getAttribute('href')).toBe('https://example.com/beans');
        expect(link.target, 'a stranger’s page never replaces the stall').toBe('_blank');
        expect(link.rel).toContain('noopener');
        expect(link.rel).toContain('noreferrer');

        const warning = block.querySelector('[data-role="token-link-warning"]') as HTMLElement;
        expect(warning.hidden, 'nothing is said until it is touched').toBe(true);
        expect(link.classList.contains('token-link-live'), 'inert first').toBe(false);
        // No button anywhere in the block: the link is the control.
        expect(block.querySelector('button')).toBeNull();

        link.dispatchEvent(new Event('click', { bubbles: true, cancelable: true }));
        expect(warning.hidden, 'the first touch explains').toBe(false);
        expect(warning.textContent).toBe(TOKEN_LINK_WARNING);
        expect(link.classList.contains('token-link-live'), 'and arms it').toBe(true);
        expect(
            root.querySelector('[data-role="leave-confirm"]'),
            'arming is not leaving',
        ).toBeNull();

        link.dispatchEvent(new Event('click', { bubbles: true, cancelable: true }));
        const confirm = root.querySelector('[data-role="leave-confirm"]') as HTMLElement;
        expect(confirm, 'the second touch asks').not.toBeNull();
        const go = confirm.querySelector('[data-role="leave-confirm-go"]') as HTMLAnchorElement;
        expect(go.getAttribute('href')).toBe('https://example.com/beans');
        expect(go.rel).toContain('noopener');

        (confirm.querySelector('[data-role="leave-confirm-cancel"]') as HTMLButtonElement).click();
        expect(
            root.querySelector('[data-role="leave-confirm"]'),
            'the reader can stay',
        ).toBeNull();
    });

    it('calls it a link, never an address', () => {
        // Every other address on this page is an eCash address; calling this one
        // an address invites a reader to take it for the seller's wallet.
        expect(TOKEN_LINK_WARNING).toContain('This link was written');
        expect(TOKEN_LINK_WARNING).not.toContain('address');
    });

    it('paints no link at all for a scheme that would run code', () => {
        for (const raw of [
            'javascript:alert(1)',
            '  JaVaScRiPt:alert(1)',
            'data:text/html,<script>alert(1)</script>',
            '/relative',
            'not a url',
            undefined,
        ]) {
            const { root } = paint(withUrl(raw));
            expect(root.querySelector('[data-role="token-link"]'), String(raw)).toBeNull();
            for (const a of root.querySelectorAll('a')) {
                expect(a.getAttribute('href') ?? '').not.toContain('javascript:');
            }
        }
    });
});

describe('picker-previews-the-look-without-publishing-it', () => {
    /**
     * Choosing a look repaints the seller's own stall in it immediately. It is
     * a preview and nothing else: no record is signed here, so a reload brings
     * back whatever the chain says. The note beside the control has always been
     * about exactly that gap, and it still flips when the choice differs from
     * what was published.
     */
    function openSheet(theme = decodeTheme(DEFAULT_THEME_ID)) {
        const { root } = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                tokens: new Map([[TOKEN_ID, BEANS]]),
                overlay: { kind: 'publish' },
                stallName: 'Riverside Goods',
                theme,
            }),
        );
        return {
            root,
            stall: root.querySelector('.stall') as HTMLElement,
            select: root.querySelector('select[name="theme"]') as HTMLSelectElement,
        };
    }

    it('repaints the live stall in the chosen look, strip and all', () => {
        const { stall, select } = openSheet();
        // Against the table, not a literal: D1 froze the mapping, not the
        // pixels, so this test asserts "painted in Modern", whatever Modern is.
        const modern = DEFAULT_THEME.bg;
        expect(stall.style.getPropertyValue('--s-bg')).toBe(
            `rgb(${modern.r}, ${modern.g}, ${modern.b})`,
        );
        expect(stall.querySelector('.orn'), 'Modern ships no strip').toBeNull();

        select.value = String(NEO_CITY_THEME_ID);
        select.dispatchEvent(new Event('change'));

        const neo = decodeTheme(NEO_CITY_THEME_ID);
        expect(stall.style.getPropertyValue('--s-bg')).toBe(
            `rgb(${neo.bg.r}, ${neo.bg.g}, ${neo.bg.b})`,
        );
        // The strip is part of the look: without this, choosing Neo left a
        // white shop and choosing Modern left Neo's ticker running above one.
        const strip = stall.querySelector('.orn') as HTMLElement;
        expect(strip).not.toBeNull();
        expect(strip.classList.contains('orn-ticker')).toBe(true);

        select.value = String(DEFAULT_THEME_ID);
        select.dispatchEvent(new Event('change'));
        expect(stall.querySelectorAll('.orn'), 'never two strips').toHaveLength(0);
        expect(stall.style.getPropertyValue('--s-bg')).toBe(
            `rgb(${modern.r}, ${modern.g}, ${modern.b})`,
        );
    });

    it('still says when publishing would not change anything', () => {
        const { root, select } = openSheet();
        const note = root.querySelector('[data-role="publish-same-look"]') as HTMLElement;
        expect(note.hidden, 'the painted look is the selected one').toBe(false);
        select.value = String(RURAL_THEME_ID);
        select.dispatchEvent(new Event('change'));
        expect(note.hidden, 'a previewed look is a real change to publish').toBe(true);
    });
});

describe('hidden-beats-a-class-that-sets-display', () => {
    /**
     * The UA rule is `[hidden] { display: none }`, which any author rule
     * outranks. Three classes here set `display` and are toggled with
     * `.hidden`, so without an explicit rule the settings QR stayed on screen
     * for a record that was not ready to sign, and the reveal button sat beside
     * the confirmation it had just opened. happy-dom does not cascade, so this
     * reads the stylesheet.
     */
    it('declares the override, and every display-setting class needs it', () => {
        const css = readFileSync(join(UI_DIR, 'stall.css'), 'utf8').replace(
            /\/\*[\s\S]*?\*\//g,
            '',
        );
        const rule = css.match(/\[hidden\]\s*\{([^}]+)\}/);
        expect(rule, 'no [hidden] rule at all').not.toBeNull();
        expect(rule![1]).toMatch(/display:\s*none\s*!important/);

        // The classes the code actually toggles. If one of these stops setting
        // `display` the rule is merely redundant; if a new one appears, it is
        // already covered — this asserts the pairing is understood, not lucky.
        for (const cls of ['mini', 'publish-qr']) {
            const block = css.match(new RegExp(`\\.${cls}\\s*\\{([^}]+)\\}`));
            expect(block, `.${cls} missing`).not.toBeNull();
            expect(
                /display:/.test(block![1]),
                `.${cls} sets display, so it depends on the [hidden] rule above`,
            ).toBe(true);
        }
    });
});

describe('sections-name-our-failure-instead-of-hiding-it', () => {
    const fungible = { protocol: 'SLP', type: 'SLP_TOKEN_TYPE_FUNGIBLE' };
    const nftChild = { protocol: 'SLP', type: 'SLP_TOKEN_TYPE_NFT1_CHILD' };
    const NFT_ID = 'ee'.repeat(32);
    const GROUP_ID = 'aa'.repeat(32);

    const nftOffer = { ...OFFER, tokenId: NFT_ID, outpoint: { ...OUTPOINT, outIdx: 7 } };

    it('divides tokens, NFTs and the ones we could not read', () => {
        const { root } = paint(
            offersView(
                [OFFER, nftOffer, { ...OFFER, tokenId: OTHER_TOKEN, outpoint: { ...OUTPOINT, outIdx: 8 } }],
                new Map([
                    [TOKEN_ID, { ...BEANS, tokenType: fungible }],
                    [NFT_ID, { ...BEANS, tokenId: NFT_ID, name: 'Pixel #1', tokenType: nftChild }],
                    // No tokenType: the read failed, which is ours.
                    [OTHER_TOKEN, { ...TEA, tokenType: undefined }],
                ]),
            ),
        );
        expect(root.querySelector('[data-role="section-etoken"]')).not.toBeNull();
        expect(root.querySelector('[data-role="section-nft"]')).not.toBeNull();
        const unsorted = root.querySelector('[data-role="section-unsorted"]') as HTMLElement;
        expect(unsorted, 'a bucket for what we could not read').not.toBeNull();
        // It must say the failure is ours, not describe the seller's stock.
        expect(unsorted.textContent).toContain(SECTION_UNSORTED_WHY);
        // Every row is still painted exactly once.
        expect(root.querySelectorAll('.item')).toHaveLength(3);
    });

    it('draws no heading at all when there is only one section', () => {
        const { root } = paint(
            offersView([OFFER], new Map([[TOKEN_ID, { ...BEANS, tokenType: fungible }]])),
        );
        expect(root.querySelector('.section-head'), 'one kind is not a division').toBeNull();
        expect(root.querySelectorAll('.item')).toHaveLength(1);
    });

    it('heads a collection with a name and a count, and never a price', () => {
        const { root } = paint(
            offersView(
                [nftOffer],
                new Map([
                    [NFT_ID, { ...BEANS, tokenId: NFT_ID, name: 'Pixel #1', tokenType: nftChild }],
                    [GROUP_ID, { ...BEANS, tokenId: GROUP_ID, name: 'Pixel Set' }],
                ]),
                { nftGroups: new Map([[NFT_ID, GROUP_ID]]) },
            ),
        );
        const head = root.querySelector('[data-role="collection"]') as HTMLElement;
        expect(head).not.toBeNull();
        expect(head.textContent).toContain('Pixel Set');
        // The count is the other half of what a heading may say: how many rows
        // follow. Without it a collection is a label with no information.
        expect(head.querySelector('.collection-count')?.textContent).toBe(
            itemsForSale(1),
        );
        // A heading priced at its cheapest member would name a number no
        // covenant encodes, so it carries none.
        expect(head.querySelector('[data-role="price"]')).toBeNull();
        expect(head.textContent).not.toMatch(/\d+,?\d*\s*(XEC|\$)/);
    });

    it('says so when the group lookup stopped short', () => {
        const { root } = paint(
            offersView(
                [nftOffer, OFFER],
                new Map([
                    [NFT_ID, { ...BEANS, tokenId: NFT_ID, tokenType: nftChild }],
                    [TOKEN_ID, { ...BEANS, tokenType: fungible }],
                ]),
                { nftGroupsTruncated: true },
            ),
        );
        const nft = root.querySelector('[data-role="section-nft"]') as HTMLElement;
        expect(nft.textContent).toContain(NFT_GROUPS_TRUNCATED);
    });
});

describe('a-token-with-no-description-shows-no-empty-slot', () => {
    /**
     * Absent means the seller wrote none **or** our walk did not reach it, and
     * only one of those is a fact about them. The card prints a description
     * when there is one and says nothing at all when there is not — printing
     * "none" while holding "we did not look" is §4's collapse.
     */
    const opened = (descriptions?: ReadonlyMap<string, string>) =>
        paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                overlay: { kind: 'buy', outpoint: OUTPOINT },
                tokens: new Map([[TOKEN_ID, BEANS]]),
                ...(descriptions === undefined ? {} : { descriptions }),
            }),
        );

    it('paints the seller’s words, labelled as theirs', () => {
        const { root } = opened(new Map([[TOKEN_ID, 'Roasted the morning it ships.']]));
        const block = root.querySelector('[data-role="token-description"]') as HTMLElement;
        expect(block).not.toBeNull();
        expect(block.textContent).toContain('Roasted the morning it ships.');
        // Labelled, because a signature proves who wrote a sentence, not that
        // it is true — a description can name a price the covenant never asks.
        expect(block.textContent).toContain(TOKEN_DESCRIPTION_LABEL);
        // And it is not the price node, nor inside it.
        const price = root.querySelector('[data-role="price"]') as HTMLElement;
        expect(price.contains(block)).toBe(false);
        expect(price.textContent).toBe('1,200');
    });

    it('paints nothing when there is none, and nothing when we never looked', () => {
        for (const descriptions of [undefined, new Map<string, string>(), new Map([['other', 'x']])]) {
            const { root } = opened(descriptions);
            expect(
                root.querySelector('[data-role="token-description"]'),
                String(descriptions),
            ).toBeNull();
            // The card is otherwise intact.
            expect(root.querySelector('[data-role="detail"]')).not.toBeNull();
        }
    });

    it('never turns the seller’s words into a link', () => {
        // Stall's product is a handoff to Cashtab; a seller-supplied clickable
        // URL beside it would be the best phish this origin could ship.
        const { root } = opened(new Map([[TOKEN_ID, 'See https://example.com for more']]));
        const block = root.querySelector('[data-role="token-description"]') as HTMLElement;
        expect(block.textContent).toContain('https://example.com');
        expect(block.querySelector('a'), 'text, never a link').toBeNull();
    });
});

describe('describing-a-token-is-its-own-transaction', () => {
    /**
     * A description is a separate record from the stall's settings, so
     * publishing one does not publish the other and describing three tokens
     * costs three fees. A seller who learns that after signing learns it the
     * expensive way, so the sheet says it before they do.
     *
     * It lives in the settings sheet rather than on every card: a control per
     * offer row would put a second publish button beside every buy control, for
     * every visitor, on a page that cannot know which of them is the seller.
     */
    const sheet = (over: Partial<StallView> = {}) =>
        paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                tokens: new Map([[TOKEN_ID, BEANS]]),
                overlay: { kind: 'publish' },
                stallName: 'Riverside Goods',
                ...over,
            }),
        );

    it('says the cost before anything is signed, and offers no card control', () => {
        const { root } = sheet();
        const block = root.querySelector('[data-role="describe"]') as HTMLElement;
        expect(block).not.toBeNull();
        expect(block.textContent).toContain(DESC_LEDE);
        // One entry point: nothing was added to the offer rows.
        expect(root.querySelector('.item [data-role="describe"]')).toBeNull();
    });

    it('builds a record from the token and the words, and counts bytes', () => {
        const { root } = sheet();
        const picker = root.querySelector('[data-role="describe-token"]') as HTMLSelectElement;
        const field = root.querySelector('[data-role="describe-text"]') as HTMLTextAreaElement;
        expect(picker.value).toBe(TOKEN_ID);

        field.value = 'Roasted weekly.';
        field.dispatchEvent(new Event('input'));
        const hex = root.querySelector('[data-role="describe-hex"]') as HTMLElement;
        expect(hex.hidden).toBe(false);
        expect(hex.textContent).toBe(encodeDescriptionHex(TOKEN_ID, 'Roasted weekly.'));
        const link = root.querySelector('[data-role="describe-cashtab"]') as HTMLAnchorElement;
        expect(link.hidden).toBe(false);
        expect(link.getAttribute('href')).toContain('op_return_raw');

        // Bytes, not characters: an accented character costs more than one.
        const counter = root.querySelector('[data-role="describe-bytes"]') as HTMLElement;
        field.value = 'Cà phê';
        field.dispatchEvent(new Event('input'));
        expect(counter.textContent).toBe(descBytesLeft(8, MAX_DESCRIPTION_BYTES));
    });

    it('refuses what the record cannot hold, and hands over nothing', () => {
        const { root } = sheet();
        const field = root.querySelector('[data-role="describe-text"]') as HTMLTextAreaElement;
        const err = root.querySelector('[data-role="describe-invalid"]') as HTMLElement;
        const link = root.querySelector('[data-role="describe-cashtab"]') as HTMLAnchorElement;

        field.value = 'A'.repeat(MAX_DESCRIPTION_BYTES + 1);
        field.dispatchEvent(new Event('input'));
        expect(err.hidden).toBe(false);
        expect(err.textContent).toBe(DESC_TOO_LONG);
        expect(link.hidden, 'nothing to sign while it cannot be written').toBe(true);
    });

    it('offers removal only where there is something to remove', () => {
        const none = sheet();
        expect(
            (none.root.querySelector('[data-role="describe-remove"]') as HTMLElement).hidden,
            'a removal over nothing costs a fee and changes nothing',
        ).toBe(true);

        const some = sheet({ descriptions: new Map([[TOKEN_ID, 'Existing words']]) });
        const remove = some.root.querySelector('[data-role="describe-remove"]') as HTMLAnchorElement;
        expect(remove.hidden).toBe(false);
        expect(remove.getAttribute('href')).toContain('op_return_raw');
        // The existing words are loaded for editing rather than starting blank.
        const field = some.root.querySelector('[data-role="describe-text"]') as HTMLTextAreaElement;
        expect(field.value).toBe('Existing words');
    });
});

describe('the-record-a-seller-signs-stays-on-screen', () => {
    /**
     * Hex has no spaces, so it runs off the side of the sheet without an
     * explicit rule — on the one screen where a seller reads what they are
     * about to sign, because Cashtab shows an unknown LOKAD as raw hex.
     */
    it('wraps both records rather than letting them overflow', () => {
        const css = readFileSync(join(UI_DIR, 'stall.css'), 'utf8').replace(
            /\/\*[\s\S]*?\*\//g,
            '',
        );
        const rule = css.match(/\.publish-hex\s*\{([^}]+)\}/);
        expect(rule, 'no wrap rule for the signed record').not.toBeNull();
        expect(rule![1]).toMatch(/overflow-wrap:\s*anywhere/);

        const { root } = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                tokens: new Map([[TOKEN_ID, BEANS]]),
                overlay: { kind: 'publish' },
                stallName: 'Riverside Goods',
            }),
        );
        for (const role of ['publish-hex', 'describe-hex']) {
            const node = root.querySelector(`[data-role="${role}"]`) as HTMLElement;
            expect(node, role).not.toBeNull();
            expect(node.classList.contains('publish-hex'), `${role} wears the rule`).toBe(true);
        }
    });
});

describe('cashtab-handoffs-say-which-act-they-are', () => {
    /**
     * Four controls hand off to Cashtab and they do four different things: a
     * buyer going to look at a market, a seller signing settings, a seller
     * signing a description, a seller listing for the first time. Labelled the
     * same they read as one control, and a reader stops reading them.
     *
     * The wording avoids two English fixed phrases on purpose. "Check in" is
     * registering an arrival, and "sign in" is logging in — on a product whose
     * own promise is that there is nothing to sign up for.
     */
    it('names the buyer’s handoff for looking, never for buying', () => {
        const { root } = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                overlay: { kind: 'buy', outpoint: OUTPOINT },
                tokens: new Map([[TOKEN_ID, BEANS]]),
            }),
        );
        const cta = root.querySelector('a.buy[href*="cashtab.com"]') as HTMLAnchorElement;
        expect(cta.textContent).toBe(OPEN_IN_CASHTAB);
        // Cashtab's token page cannot be pointed at one maker, so the label
        // must not promise a purchase from this seller.
        expect(cta.textContent).not.toMatch(/\bbuy\b/i);
        expect(cta.textContent).not.toMatch(/check in/i);
    });

    it('names the seller’s handoffs for signing, and not for logging in', () => {
        const { root } = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                tokens: new Map([[TOKEN_ID, BEANS]]),
                overlay: { kind: 'publish' },
                stallName: 'Riverside Goods',
            }),
        );
        for (const role of ['publish-cashtab', 'describe-cashtab']) {
            const node = root.querySelector(`[data-role="${role}"]`) as HTMLElement;
            expect(node, role).not.toBeNull();
            expect(node.textContent, role).toBe(PUBLISH_OPEN_CASHTAB);
            expect(node.textContent, `${role} must not read as log in`).not.toMatch(
                /sign in\b/i,
            );
        }
        const other = root.querySelector('[data-role="publish-pay"]') as HTMLElement;
        expect(other.textContent).toBe(PUBLISH_OPEN_PAY);
    });

    it('gives each act its own words', () => {
        // The four labels are distinct, so no two controls read as the same one.
        const labels = [
            OPEN_IN_CASHTAB,
            PUBLISH_OPEN_CASHTAB,
            PUBLISH_OPEN_PAY,
            LIST_IN_CASHTAB_LINK,
        ];
        expect(new Set(labels).size).toBe(labels.length);
    });
});

describe('a script address is told the true thing', () => {
    it('does not borrow the unreadable-link copy', () => {
        // Derived, not typed: an address written by hand had a bad checksum and
        // was not a script address at all, in a test named for one. hash160 of
        // a repeating byte is obviously nobody's script.
        const address = encodeCashAddress('ecash', 'p2sh', '11'.repeat(20));
        const { root } = paint({
            route: { kind: 'invalid', raw: address, why: 'script-address' },
            overlay: { kind: 'idle' },
            tokens: new Map(),
        });
        const text = root.textContent ?? '';
        expect(text).toContain(copy.SCRIPT_ADDRESS_TITLE);
        expect(text).toContain(copy.SCRIPT_ADDRESS_BODY);
        expect(text).not.toContain(copy.LINK_UNREADABLE_TITLE);
        // The tab strip and an unfurled link show this, and it said the wrong
        // thing while the screen said the right one — found in a browser, not
        // by this suite, which was reading `root.textContent` alone.
        expect(document.title).toBe(copy.SCRIPT_ADDRESS_TITLE);
        // The never-sent screen's promise is a loop for an address like this.
        expect(text).not.toContain(copy.UNRESOLVABLE_SUB);
    });

    it('leaves an ordinary unreadable link exactly as it was', () => {
        const { root } = paint({
            route: { kind: 'invalid', raw: 'nope' },
            overlay: { kind: 'idle' },
            tokens: new Map(),
        });
        const text = root.textContent ?? '';
        expect(text).toContain(copy.LINK_UNREADABLE_TITLE);
        expect(text).not.toContain(copy.SCRIPT_ADDRESS_TITLE);
        expect(document.title).toBe(copy.LINK_UNREADABLE_TITLE);
    });
});

describe('a-description-field-refuses-the-key-not-the-record', () => {
    function describeSheet() {
        const { root } = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                overlay: { kind: 'publish' },
                tokens: new Map([[TOKEN_ID, BEANS]]),
                descriptions: new Map([[TOKEN_ID, 'Existing words']]),
            }),
        );
        return root;
    }

    it('does not let Enter put a line break in the field', () => {
        const root = describeSheet();
        const field = root.querySelector<HTMLTextAreaElement>('[data-role="describe-text"]')!;
        const event = new KeyboardEvent('keydown', {
            key: 'Enter',
            bubbles: true,
            cancelable: true,
        });
        field.dispatchEvent(event);
        expect(event.defaultPrevented).toBe(true);
    });

    it('names the line break when one arrives by paste', () => {
        const root = describeSheet();
        const field = root.querySelector<HTMLTextAreaElement>('[data-role="describe-text"]')!;
        field.value = 'one\ntwo';
        field.dispatchEvent(new Event('input', { bubbles: true }));
        const err = root.querySelector('[data-role="describe-invalid"]')!;
        expect(err.textContent).toBe(copy.DESC_ONE_LINE);
        // Not the copy about hiding a sentence: pressing Enter is not that.
        expect(err.textContent).not.toBe(copy.DESC_REFUSED);
    });
});

describe('removal-is-signable-from-a-phone', () => {
    it('offers the same three ways to a wallet as publishing does', () => {
        const { root } = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                overlay: { kind: 'publish' },
                tokens: new Map([[TOKEN_ID, BEANS]]),
                descriptions: new Map([[TOKEN_ID, 'Existing words']]),
            }),
        );
        const remove = root.querySelector<HTMLAnchorElement>('[data-role="describe-remove"]')!;
        const pay = root.querySelector<HTMLAnchorElement>('[data-role="describe-remove-pay"]')!;
        const qr = root.querySelector<HTMLElement>('[data-role="describe-remove-qr"]')!;
        expect(remove.hidden).toBe(false);
        expect(pay.hidden).toBe(false);
        expect(pay.href).toContain('op_return_raw');
        expect(qr.hidden).toBe(false);
        expect(qr.querySelector('svg')).not.toBeNull();
    });

    it('offers none of them when there is nothing to remove', () => {
        const { root } = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                overlay: { kind: 'publish' },
                tokens: new Map([[TOKEN_ID, BEANS]]),
            }),
        );
        expect(
            root.querySelector<HTMLElement>('[data-role="describe-remove"]')!.hidden,
        ).toBe(true);
        expect(
            root.querySelector<HTMLElement>('[data-role="describe-remove-pay"]')!.hidden,
        ).toBe(true);
        expect(
            root.querySelector<HTMLElement>('[data-role="describe-remove-qr"]')!.hidden,
        ).toBe(true);
    });
});

describe('aria-modal-is-a-promise-about-the-keyboard', () => {
    it('sends Tab from the last control back to the first', () => {
        const { root } = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                overlay: { kind: 'publish' },
                tokens: new Map([[TOKEN_ID, BEANS]]),
            }),
        );
        document.body.append(root);
        const sheet = root.querySelector<HTMLElement>('[data-role="publish"]')!;
        const focusable = [
            ...sheet.querySelectorAll<HTMLElement>(
                'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
            ),
        ].filter((n) => !n.hidden);
        expect(focusable.length).toBeGreaterThan(1);
        const last = focusable[focusable.length - 1]!;
        last.focus();
        const forward = new KeyboardEvent('keydown', {
            key: 'Tab',
            bubbles: true,
            cancelable: true,
        });
        last.dispatchEvent(forward);
        expect(forward.defaultPrevented).toBe(true);
        expect(document.activeElement).toBe(focusable[0]);
        root.remove();
    });

    it('sends Shift+Tab from the panel itself to the last control', () => {
        const { root } = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                overlay: { kind: 'publish' },
                tokens: new Map([[TOKEN_ID, BEANS]]),
            }),
        );
        document.body.append(root);
        const sheet = root.querySelector<HTMLElement>('[data-role="publish"]')!;
        sheet.focus();
        const back = new KeyboardEvent('keydown', {
            key: 'Tab',
            shiftKey: true,
            bubbles: true,
            cancelable: true,
        });
        sheet.dispatchEvent(back);
        expect(back.defaultPrevented).toBe(true);
        expect(sheet.contains(document.activeElement)).toBe(true);
        root.remove();
    });
});

describe('seven-of-ten-shown-is-not-seven-listed', () => {
    it('says how many listings this page refused', () => {
        const { root } = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER], dropped: 3 },
                tokens: new Map([[TOKEN_ID, BEANS]]),
            }),
        );
        expect(root.textContent).toContain(copy.droppedOffers(3));
    });

    it('says nothing when every listing was read', () => {
        const { root } = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                tokens: new Map([[TOKEN_ID, BEANS]]),
            }),
        );
        expect(root.textContent).not.toContain('could not be read here');
    });
});

describe('unknown-decimals-is-not-a-stock-count', () => {
    it('omits the count rather than printing atoms as whole tokens', () => {
        const { root } = paint(
            idlePubkey({
                // Metadata absent: exactly what a live-arrived listing looks
                // like before its genesis read lands.
                fetch: { kind: 'offers', offers: [{ ...OFFER, atoms: 1_000_000_000n }] },
                tokens: new Map(),
            }),
        );
        const text = root.textContent ?? '';
        expect(text).not.toContain('1000000000');
        expect(text).not.toContain('1,000,000,000');
    });

    it('still counts stock when genesis decimals are known', () => {
        const { root } = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                tokens: new Map([[TOKEN_ID, BEANS]]),
            }),
        );
        expect(root.querySelector('.item-q')).not.toBeNull();
    });
});

describe('choosing-a-look-shows-the-look', () => {
    function openSheet() {
        const { root, h } = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                overlay: { kind: 'publish' },
                tokens: new Map([[TOKEN_ID, BEANS]]),
            }),
        );
        const scrim = root.querySelector<HTMLElement>('[data-role="sheet-scrim"]')!;
        const select = root.querySelector<HTMLSelectElement>('select[name="theme"]')!;
        return { root, h, scrim, select };
    }

    it('lowers the panel when the look changes', () => {
        const { scrim, select } = openSheet();
        expect(scrim.classList.contains('peek')).toBe(false);
        select.value = String(NEO_CITY_THEME_ID);
        select.dispatchEvent(new Event('change', { bubbles: true }));
        expect(scrim.classList.contains('peek')).toBe(true);
    });

    it('raises it again when anything else in the panel is touched', () => {
        const { root, scrim, select } = openSheet();
        select.value = String(NEO_CITY_THEME_ID);
        select.dispatchEvent(new Event('change', { bubbles: true }));
        const name = root.querySelector<HTMLInputElement>('input[name="stall-name"]')!;
        name.dispatchEvent(new Event('pointerdown', { bubbles: true }));
        expect(scrim.classList.contains('peek')).toBe(false);
    });

    it('stays lowered while the picker itself is used', () => {
        const { scrim, select } = openSheet();
        select.value = String(NEO_CITY_THEME_ID);
        select.dispatchEvent(new Event('change', { bubbles: true }));
        // A keyboard seller changes the look with the arrow keys, which keeps
        // the focus on the picker. Raising here would make it unusable.
        select.dispatchEvent(new Event('focusin', { bubbles: true }));
        expect(scrim.classList.contains('peek')).toBe(true);
    });

    it('a click on the bare stall comes back rather than throwing the name away', () => {
        const { h, scrim, select } = openSheet();
        select.value = String(NEO_CITY_THEME_ID);
        select.dispatchEvent(new Event('change', { bubbles: true }));
        scrim.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(scrim.classList.contains('peek')).toBe(false);
        expect(h.onClosePublish).not.toHaveBeenCalled();

        // With the panel up, the same click closes as it always did.
        scrim.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(h.onClosePublish).toHaveBeenCalled();
    });

    it('still applies the chosen look to the stall behind', () => {
        const { root, select } = openSheet();
        const stall = root.querySelector<HTMLElement>('.stall')!;
        const before = stall.style.getPropertyValue('--s-bg');
        select.value = String(NEO_CITY_THEME_ID);
        select.dispatchEvent(new Event('change', { bubbles: true }));
        expect(stall.style.getPropertyValue('--s-bg')).not.toBe(before);
    });
});

describe('a-decoration-is-chosen-where-the-look-is', () => {
    function sheet(over = {}) {
        const { root } = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                overlay: { kind: 'publish' },
                tokens: new Map([[TOKEN_ID, BEANS]]),
                theme: decodeTheme(RURAL_THEME_ID),
                ...over,
            }),
        );
        return root;
    }

    it('offers one control per slot, not one per row', () => {
        const root = sheet();
        // Rural has a yard and a mood, so two selects and no more.
        expect(root.querySelector('[data-role="decor-yard"]')).not.toBeNull();
        expect(root.querySelector('[data-role="decor-mood"]')).not.toBeNull();
        expect(root.querySelectorAll('.decor select').length).toBe(2);
    });

    it('opens the look picker on every look, not just the second one', () => {
        for (const id of [DEFAULT_THEME_ID, NEO_CITY_THEME_ID, RURAL_THEME_ID]) {
            const root = sheet({ theme: decodeTheme(id) });
            const themeSelect = root.querySelector<HTMLSelectElement>('select[name="theme"]')!;
            expect(themeSelect.value, `painted ${id}`).toBe(String(id));
        }
    });

    it('opens on what the record already set', () => {
        const root = sheet({ attachmentFlags: 1 });
        const yard = root.querySelector<HTMLSelectElement>('[data-role="decor-yard"]')!;
        expect(yard.value).toBe('0');
    });

    it('says a chosen row is only being looked at until the stall holds it', () => {
        // The tokens exist now, so the honest note is no longer "not on sale
        // yet" — it is that a flag without the token paints nothing.
        const root = sheet({ attachmentFlags: 1 });
        const note = root.querySelector('[data-role="decor-note"]')!;
        expect(note.textContent).toBe(copy.DECOR_PREVIEW_ONLY);
        expect((note as HTMLElement).hidden).toBe(false);
    });

    it('says it will paint once the stall is known to hold the token', () => {
        const held = SHIPPED_ATTACHMENTS.find((r) => r.themeId === RURAL_THEME_ID && r.bit === 0);
        const root = sheet({
            attachmentFlags: 1,
            heldTokens: new Set([held!.tokenId!]),
        });
        expect(root.querySelector('[data-role="decor-note"]')!.textContent).toBe(copy.DECOR_HELD);
    });

    it('says nothing at all when nothing is chosen', () => {
        const note = sheet().querySelector<HTMLElement>('[data-role="decor-note"]')!;
        expect(note.hidden).toBe(true);
    });

    it('previews the choice on the stall behind, and lowers the panel', () => {
        const root = sheet({ stallName: 'Riverside' });
        document.body.append(root);
        const scrim = root.querySelector<HTMLElement>('[data-role="sheet-scrim"]')!;
        const yard = root.querySelector<HTMLSelectElement>('[data-role="decor-yard"]')!;
        yard.value = '0';
        yard.dispatchEvent(new Event('change', { bubbles: true }));
        // eslint-disable-next-line no-console
        expect(root.querySelector('.att-beetle')).not.toBeNull();
        expect(scrim.classList.contains('peek')).toBe(true);
        root.remove();
    });

    it('puts the choice in the record the seller signs', () => {
        // A record needs a name: `encodeManifestHex` refuses an empty one.
        const root = sheet({ stallName: 'Riverside' });
        const hexBefore = root.querySelector('[data-role="publish-hex"]')!.textContent ?? '';
        const yard = root.querySelector<HTMLSelectElement>('[data-role="decor-yard"]')!;
        yard.value = '0';
        yard.dispatchEvent(new Event('change', { bubbles: true }));
        const hexAfter = root.querySelector('[data-role="publish-hex"]')!.textContent ?? '';
        expect(hexAfter).not.toBe(hexBefore);
        // Tag byte then two payload bytes, appended after the three required
        // pushes: `03 01 01 00`.
        expect(hexAfter.endsWith('03010100')).toBe(true);
    });

    it('drops the flags when the look changes, rather than re-aiming them', () => {
        const root = sheet({ attachmentFlags: 1 });
        document.body.append(root);
        const theme = root.querySelector<HTMLSelectElement>('select[name="theme"]')!;
        theme.value = String(NEO_CITY_THEME_ID);
        theme.dispatchEvent(new Event('change', { bubbles: true }));
        // Neo's slots are crest and fringe; bit 0 there is a different row, so
        // carrying the flag over would wear something never chosen.
        expect(root.querySelector('[data-role="decor-yard"]')).toBeNull();
        const crest = root.querySelector<HTMLSelectElement>('[data-role="decor-crest"]')!;
        expect(crest.value).toBe('');
        root.remove();
    });

    it('paints no link to a shop that does not exist yet', () => {
        expect(sheet().querySelector('[data-role="decor-shop"]')).toBeNull();
    });
});

describe('a-worn-decoration-reaches-the-stall', () => {
    it('puts a root row on the stall and builds a node row above the footer', () => {
        const { root } = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                tokens: new Map([[TOKEN_ID, BEANS]]),
                theme: decodeTheme(RURAL_THEME_ID),
                worn: wornAttachments(RURAL_THEME_ID, 1),
            }),
        );
        const strip = root.querySelector('.att-beetle')!;
        expect(strip).not.toBeNull();
        expect(strip.querySelector('.att-beetle-bug')).not.toBeNull();
        expect(strip.nextElementSibling?.classList.contains('stall-foot')).toBe(true);
    });

    it('moves the palette for a mood, through the contrast floor', () => {
        const { root } = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                tokens: new Map([[TOKEN_ID, BEANS]]),
                theme: decodeTheme(DEFAULT_THEME_ID),
                worn: wornAttachments(DEFAULT_THEME_ID, 1),
            }),
        );
        const stall = root.querySelector<HTMLElement>('.stall')!;
        expect(stall.style.getPropertyValue('--s-bg')).toBe('rgb(18, 21, 26)');
        // A mood paints no node and carries no class.
        expect(stall.className).toBe('stall');
    });
});

describe('the-fittings-shop-reads-as-three-runs', () => {
    /**
     * The whole path, through the shipped catalogue rather than an injected
     * one: six real token ids, filed by id into the Decorations section, and
     * grouped by the look each fits. This is the one page where those run
     * headings are the only dividers — a single section prints no section
     * heading — so if they are missing the shop is six rows in txid order.
     */
    const rows = SHIPPED_ATTACHMENTS.filter((r) => r.tokenId !== undefined);

    it('files every catalogue token under Decorations, by id', () => {
        expect(rows.length, 'no token is minted yet').toBeGreaterThan(0);
        const { root } = paint(
            idlePubkey({
                fetch: {
                    kind: 'offers',
                    offers: rows.map((r, i) => ({ ...OFFER, tokenId: r.tokenId!, outpoint: { txid: OUTPOINT.txid, outIdx: i } })),
                },
                tokens: new Map(
                    rows.map((r) => [
                        r.tokenId!,
                        { ...BEANS, tokenId: r.tokenId!, name: r.label },
                    ]),
                ),
            }),
        );
        // One section, so no section heading — the runs carry the page.
        expect(root.querySelector('[data-role="section-decor"]')).toBeNull();
        const runs = [...root.querySelectorAll('[data-role="decor-run"] .collection-name')].map(
            (n) => n.textContent,
        );
        expect(runs).toEqual([
            copy.decorFor('Modern'),
            copy.decorFor('Neo city'),
            copy.decorFor('Rural'),
        ]);
    });

    it('keeps a seller’s own stock above a decoration they resell', () => {
        const { root } = paint(
            idlePubkey({
                fetch: {
                    kind: 'offers',
                    offers: [
                        { ...OFFER, tokenId: rows[0]!.tokenId!, outpoint: { txid: OUTPOINT.txid, outIdx: 1 } },
                        OFFER,
                    ],
                },
                tokens: new Map<string, TokenMeta>([
                    [TOKEN_ID, BEANS],
                    [rows[0]!.tokenId!, { ...BEANS, tokenId: rows[0]!.tokenId!, name: rows[0]!.label }],
                ]),
            }),
        );
        const heads = [...root.querySelectorAll('.section-head')].map((n) =>
            n.getAttribute('data-role'),
        );
        expect(heads).toEqual(['section-etoken', 'section-decor']);
    });
});

