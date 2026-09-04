// @vitest-environment happy-dom
import { encodeCashAddress } from 'ecashaddrjs';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ICON_HERO_SIZE, ICON_HOST, iconUrl } from '../domain/icons';
import {
    BANNED_THEME_PROPS,
    DEFAULT_THEME,
    DEFAULT_THEME_ID,
    NEO_CITY_THEME_ID,
    RURAL_THEME_ID,
    SHIPPED_THEMES,
    decodeTheme,
    themeVars,
    tierCharCeilings,
    overlayTierCharCeilings,
} from '../domain/theme';

import { qrMatrix } from '../domain/qr';
import type {
    BroadcastParams,
    Outpoint,
    PosterFormat,
    StallOffer,
    StallView,
    TokenMeta,
} from '../domain/state';
import { MAX_ACTIVITY_PAGES, MAX_STALL_EVENTS } from '../domain/state';
import { EXPLORER_TX_URL } from '../domain/explorer';
import { OBS_GUIDE_TITLE } from './obsGuide';
import {
    COPY_LINK,
    COPY_LINK_FALLBACK,
    DASHED_PRICE,
    HANDOFF_FINE_PRINT,
    HANDOFF_MAY_PRESELECT,
    HANDOFF_PRICE_IS_NOT_THE_ROW,
    HOME_LEDE,
    HOME_SELLER,
    HOME_STREAM_LINK,
    DEMO_STALL_ADDRESS,
    HOME_DEMO_SOON,
    UNRESOLVABLE_NEXT,
    SHARE_LEDE,
    STUDIO_DEFAULT_HINT,
    STUDIO_SEC_RECORD,
    STUDIO_SEC_SHARE,
    HOME_PASTE_INVALID,
    HOME_PASTE_SUBMIT,
    HOME_TITLE,
    LINK_COPIED,
    LINK_UNREADABLE_TITLE,
    MIN_PURCHASE,
    OPEN_ANOTHER_STALL,
    OPEN_BY_DEFAULT,
    PUBLISH_MUST_SIGN,
    PUBLISH_NAME_TOO_LONG,
    PUBLISH_UNAVAILABLE,
    PUBLISH_SAME_LOOK,
    PUBLISH_AFTER_SIGNING,
    PUBLISH_CHECK_NOW,
    PUBLISH_CLOSE,
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
import {
    MAX_DESCRIPTION_BYTES,
    MAX_PRICED_DESCRIPTION_BYTES,
    MAX_PRICED_SHELVED_DESCRIPTION_BYTES,
    MAX_TOLERANCE_DESCRIPTION_BYTES,
    MAX_TOLERANCE_SHELVED_DESCRIPTION_BYTES,
    encodeDescriptionHex,
    encodeRemovalHex,
} from '../domain/description';
import { OP_RETURN_BUDGET, encodeManifestHex } from '../domain/manifest';
import { scaleRate } from '../domain/fiat';
import * as copy from './copy';
import { SHIPPED_ATTACHMENTS, wornAttachments } from '../domain/attachments';
import { LIST_IN_CASHTAB_LINK, PUBLISH_OPEN_CASHTAB, PUBLISH_OPEN_PAY, DESC_LEDE, DESC_TOO_LONG, DESC_REMOVE, DESC_REMOVE_PAY, descBytesLeft, summaryLine, SUMMARY_WORDS, SUMMARY_NOTHING, TOKEN_DESCRIPTION_LABEL, NFT_GROUPS_TRUNCATED, SECTION_UNSORTED_WHY, itemsForSale } from './copy';
import { SHARE_QR_TOO_LONG, TOKEN_LINK_WARNING, listingsAtThisStall, lowestOfListings, TAB_SHOP, ACTIVITY_NOT_WATCHING, ACTIVITY_GAPS, ACTIVITY_QUIET, EVENT_BOOK, EVENT_OTHER, EVENT_BOOK_CONSUMED, EVENT_BOOK_APPEARED, EVENT_BOOK_BOTH, activityCapped } from './copy';
import {
    PAY_RATE_MAX_AGE_MS,
    priceTier,
    renderStall,
    resetIconsForTests,
    sheetMounts,
    stallBaseUrl,
} from './render';
import { satsForQuote } from '../domain/fiat';
import { formatXec } from '../domain/money';
import { cashtabPayUrl, payBip21, payECashPayUrl } from '../domain/cashtab';
import { encodePaymentMemoHex } from '../domain/payment';
import { payLandingUrl, stallPath } from '../domain/route';
import {
    lastDrawnPosterSpec,
    SQUARE_SIZE,
    STREAM_CARD_WIDTH,
    STORY_SIZE,
} from './posterImage';
import { BROADCAST_BRAND, BROADCAST_CAPTION } from './copy';

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
        onPreviewLook: vi.fn(),
        onOpenPublish: vi.fn(),
        onOpenDescribe: vi.fn(),
        onClosePublish: vi.fn(),
        onOpenPoster: vi.fn(),
        onClosePoster: vi.fn(),
        onChoosePosterFormat: vi.fn(),
        onSwitchPanel: vi.fn(),
        onTogglePin: vi.fn(),
        onChangeSort: vi.fn(),
        onChangeFilter: vi.fn(),
        onOpenPay: vi.fn(),
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

/*
 * The name sheet's two pickers, read and pressed as a *person* would — the
 * pressed segment, the pressed chip. Six tests used to query
 * `select[name="theme"]` and set `.value`, which pinned the element rather
 * than the rule and went red the day the design became a segmented control.
 * What the rules actually say is: the pressed look is the
 * painted look, changing it hides the same-look note, a place holds at most
 * one decoration, and the record carries what is pressed.
 */
function pressedLook(root: HTMLElement): number | undefined {
    const on = root.querySelector('[data-role="theme-picker"] [aria-pressed="true"]');
    const id = on?.getAttribute('data-theme-id');
    return id === null || id === undefined ? undefined : Number(id);
}

function pickLook(root: HTMLElement, themeId: number): void {
    const button = root.querySelector<HTMLButtonElement>(`[data-role="look-${themeId}"]`);
    expect(button, `no segment for look ${themeId}`).not.toBeNull();
    button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

/** The chips of one place, by the bit each one publishes. */
function decorChips(root: HTMLElement, slot: string): HTMLButtonElement[] {
    return [
        ...root.querySelectorAll<HTMLButtonElement>(
            `[data-role="decor-${slot}"] .dec [data-bit]`,
        ),
    ];
}

function pressedDecor(root: HTMLElement, slot: string): number[] {
    return decorChips(root, slot)
        .filter((chip) => chip.getAttribute('aria-pressed') === 'true')
        .map((chip) => Number(chip.getAttribute('data-bit')));
}

function pressDecor(root: HTMLElement, slot: string, bit: number): void {
    const chip = root.querySelector<HTMLButtonElement>(`[data-role="decor-${slot}-${bit}"]`);
    expect(chip, `no chip for ${slot} bit ${bit}`).not.toBeNull();
    chip!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
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
        expect(text).toContain(LIST_FIRST_LABEL);
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

    /*
     * Amended with the load path: the failure screen used to be handed a
     * session-cached name and token list, and painted the remembered shop as
     * placeholder rows behind the message. It is handed neither now — a shop
     * an earlier visit saw may have closed since — so the name is a settings
     * record this load walked to, and there are no item names at all.
     */
    it('unreachable keeps the name this load read, and names no item it did not', () => {
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
        expect(text, 'no listing was read, so no listing is named').not.toContain(
            'Roasted Beans',
        );
        expect(text).not.toContain(DASHED_PRICE);
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
        // A different token: two offers of one token are one card now, and
        // this test is about a card's expansion beside another card.
        const neighbour: StallOffer = {
            ...OFFER,
            tokenId: OTHER_TOKEN,
            outpoint: { txid: OUTPOINT.txid, outIdx: 1 },
        };
        const { root } = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER, neighbour] },
                overlay: { kind: 'buy', outpoint: OUTPOINT },
                tokens: new Map([
                    [TOKEN_ID, BEANS],
                    [OTHER_TOKEN, { ...TEA, tokenType: BEANS.tokenType }],
                ]),
                // Any look: the span is no longer one layout's privilege, so
                // the guarantee is asserted on the default one.
                theme: decodeTheme(RURAL_THEME_ID),
            }),
        );
        const stall = root.querySelector('.stall') as HTMLElement;
        const cards = [...stall.querySelectorAll('.item')];
        expect(cards).toHaveLength(2);
        // By class, not by position: `compareOffers` orders by token id, and
        // which token happens to sort first is not what this test is about.
        expect(cards.filter((c) => c.classList.contains('open'))).toHaveLength(1);
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
        // The two intro paragraphs became three chips and one trust line
        // (Stall Design, direction D) — the same facts, scannable.
        expect(text).toContain(copy.HOME_CHIPS_FINE);
        for (const chip of copy.HOME_CHIPS) {
            expect(text).toContain(chip);
        }
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
        expect(root.textContent).toContain(LIST_FIRST_LABEL);
        // The share block moved behind the Studio tab with the rest of the
        // seller tools; the storefront stays pure for a visitor.
        expect(root.querySelector('[data-role="copy-link"]')).toBeNull();
        expect(document.title).toBe(ADDR);
        expect(document.title).not.toBe(HOME_TITLE);
    });
});

describe('unreachable-without-a-manifest-name', () => {
    /*
     * Amended with the load path (was `cached-unreachable-without-manifest-name`):
     * a failure screen is no longer handed the token metadata an earlier visit
     * cached, so there are no remembered item names to paint. What is asserted
     * is what survives — the stall is titled by its own route, and nothing on
     * the screen claims to know its stock.
     */
    it('keeps the address in the header and claims no stock', () => {
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
        expect(root.textContent).not.toContain('Roasted Beans');
        expect(root.textContent).not.toContain(DASHED_PRICE);
        expect(root.textContent).toContain(UNREACHABLE_BODY);
        expect(root.querySelector('.stall button.buy')).toBeNull();
        expect(root.textContent).not.toContain(OPEN_IN_CASHTAB);
        expect(document.title).toBe(ADDR);
        expect(document.title).not.toBe(HOME_TITLE);
    });
});

describe('copy-link', () => {
    it('is behind the studio tab, not on the storefront or the apex', () => {
        const home = paint({
            route: { kind: 'home' },
            overlay: { kind: 'idle' },
            tokens: new Map(),
        }).root;
        expect(home.querySelector('[data-role="copy-link"]')).toBeNull();

        // The shop tab is pure storefront (owner's call, 2026-08-30).
        const shop = paint(
            idlePubkey({
                fetch: { kind: 'empty' },
                stallName: "Nato's Corner",
            }),
        ).root;
        expect(shop.querySelector('[data-role="copy-link"]')).toBeNull();

        const studio = paint(
            idlePubkey({
                fetch: { kind: 'empty' },
                stallName: "Nato's Corner",
                panel: 'studio',
            }),
        ).root;
        expect(studio.querySelector('[data-role="copy-link"]')).not.toBeNull();
        expect(studio.textContent).toContain(COPY_LINK);
    });

    /**
     * The copy action sits above the code on every screen that paints the
     * control: the studio, and the waiting-screen footers (`stallFooter`
     * defaults `share` to true off the pubkey route — the unresolved screen,
     * and opening/unreachable reached from it; `unresolvable` opts out). The
     * 240px QR used to come first and push the field below the fold, which
     * made the most-used action the least reachable — and nothing would have
     * gone red if the order regressed, so this is the pin.
     */
    it('the-copy-action-precedes-the-code-on-every-screen-that-shares', () => {
        const screens = [
            paint(idlePubkey({ fetch: { kind: 'empty' }, panel: 'studio' })).root,
            paint({
                route: { kind: 'unresolved', address: ADDR },
                overlay: { kind: 'idle' },
                address: ADDR,
                tokens: new Map(),
            }).root,
        ];
        for (const root of screens) {
            const share = root.querySelector('[data-role="copy-link"]')!;
            expect(share, 'the screen paints the share control').not.toBeNull();
            const field = share.querySelector('.share-url')!;
            const qr = share.querySelector('svg.share-qr')!;
            expect(field).not.toBeNull();
            expect(qr).not.toBeNull();
            expect(
                field.compareDocumentPosition(qr) &
                    Node.DOCUMENT_POSITION_FOLLOWING,
                'the field comes before the code',
            ).toBeTruthy();
        }
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
                    panel: 'studio',
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

describe('the-studio-groups-its-tools', () => {
    /**
     * Three titled sections — the record, the share tools, then the stream
     * overlay's recipe — and the browser preference trailing with no heading:
     * it is a preference of this browser, not a seller tool, so it comes last
     * and its fine line says where it lives. The heads carry their own
     * data-role so a query for the shop's `section-<category>` heads can
     * never collect a studio head.
     */
    it('paints the record, the share tools, the OBS guide, then the browser preference', () => {
        const { root } = paint(
            idlePubkey({ fetch: { kind: 'empty' }, panel: 'studio' }),
        );
        const secs = [...root.querySelectorAll('.studio-sec')];
        expect(secs.map((s) => s.getAttribute('data-role'))).toEqual([
            'studio-sec-record',
            'studio-sec-share',
            'studio-sec-broadcast',
        ]);
        expect(secs[0]!.querySelector('.section-title')?.textContent).toBe(
            STUDIO_SEC_RECORD,
        );
        expect(secs[1]!.querySelector('.section-title')?.textContent).toBe(
            STUDIO_SEC_SHARE,
        );
        expect(secs[2]!.querySelector('.section-title')?.textContent).toBe(
            OBS_GUIDE_TITLE,
        );
        // The guide paints into its own section, never into share.
        expect(secs[2]!.querySelector('[data-role="obs-guide"]')).not.toBeNull();
        expect(secs[1]!.querySelector('[data-role="obs-guide"]')).toBeNull();
        // Each tool sits in its group: the publish launcher in the record,
        // the copy-link and the poster in share, the toggle in neither.
        expect(
            secs[0]!.querySelector('[data-role="studio-open-publish"]'),
        ).not.toBeNull();
        expect(secs[1]!.querySelector('[data-role="copy-link"]')).not.toBeNull();
        expect(secs[1]!.querySelector('[data-role="open-poster"]')).not.toBeNull();
        const pref = root.querySelector('.studio-browser')!;
        expect(pref).not.toBeNull();
        expect(
            pref.querySelector('[data-role="studio-default-stall"]'),
        ).not.toBeNull();
        expect(pref.textContent).toContain(STUDIO_DEFAULT_HINT);
        expect(
            pref.compareDocumentPosition(secs[1]!) &
                Node.DOCUMENT_POSITION_PRECEDING,
            'the preference trails the share tools',
        ).toBeTruthy();
        // A studio head never answers a shop-category query.
        for (const head of root.querySelectorAll('.section-head')) {
            expect(head.getAttribute('data-role')).toBeNull();
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

    function studioControl(root: HTMLElement): HTMLButtonElement | null {
        return root.querySelector('[data-role="studio-default-stall"]');
    }

    it('offers to make this the default in the studio, and says so once it is', () => {
        // The storefront footer dropped it with the rest of the seller
        // tools (owner's call, 2026-08-30): the studio is its home.
        const shop = paint(idlePubkey({ fetch: { kind: 'empty' } })).root;
        expect(control(shop)).toBeNull();

        const off = paint(
            idlePubkey({ fetch: { kind: 'empty' }, panel: 'studio' }),
        ).root;
        expect(studioControl(off)?.textContent).toBe(OPEN_BY_DEFAULT);
        expect(studioControl(off)?.getAttribute('aria-pressed')).toBe('false');

        const on = paint(
            idlePubkey({
                fetch: { kind: 'empty' },
                panel: 'studio',
                isDefaultStall: true,
            }),
        ).root;
        expect(studioControl(on)?.textContent).toBe(OPENING_BY_DEFAULT);
        expect(studioControl(on)?.getAttribute('aria-pressed')).toBe('true');
        expect(OPEN_BY_DEFAULT).not.toBe(OPENING_BY_DEFAULT);
    });

    it('hands back the route token this stall answers to', () => {
        const { root, h } = paint(
            idlePubkey({ fetch: { kind: 'empty' }, panel: 'studio' }),
        );
        studioControl(root)?.click();
        expect(h.onToggleDefault).toHaveBeenCalledWith(ADDR);
    });

    it('is reachable from an unreachable stall too', () => {
        // Wanting this stall back tomorrow does not depend on an index
        // answering today — the tabs still paint, so the studio still opens.
        const { root } = paint(
            idlePubkey({
                fetch: { kind: 'unreachable', triedAtMs: 0, hosts: [] },
                panel: 'studio',
            }),
        );
        expect(studioControl(root)).not.toBeNull();
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

// The default look's sparse voice — the empty screen's title since the
// generic copy retired (each look speaks its own, from theme.sparse).
const EMPTY_TITLE = DEFAULT_THEME.sparse.emptyTitle;
const LIST_FIRST_LABEL = 'List your first item';

/* every-theme-var-reaches-the-stylesheet moved to theme-sheets.test.ts,
   widened to all four sheets by the 2026-08-30 review. */
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

    it('icon-src-is-set-once-per-token-and-size', () => {
        const { images, restore } = probeImages();
        try {
            const two: StallOffer[] = [
                OFFER,
                { ...OFFER, outpoint: { txid: OUTPOINT.txid, outIdx: 1 } },
            ];
            // Grouped, one token is one card — and the open detail's hero
            // is its own variant now: 128 for the 44px row cell, 256 for
            // the 120–140px hero, each fetched exactly once. A shared 64
            // was the old contract, and it painted every hero soft.
            const view = offersView(two, undefined, {
                overlay: { kind: 'buy', outpoint: OUTPOINT },
            });
            paint(view);
            expect(images).toHaveLength(2);
            expect(images[0]!.getAttribute('src')).toBe(iconUrl(TOKEN_ID));
            expect(images[1]!.getAttribute('src')).toBe(iconUrl(TOKEN_ID, ICON_HERO_SIZE));
            expect(images[0]!.referrerPolicy).toBe('no-referrer');
            images[0]!.dispatchEvent(new Event('load'));
            images[1]!.dispatchEvent(new Event('load'));
            const again = paint(view);
            paint(view);
            // Repaints clone the cached nodes; nothing asks the network twice.
            expect(images).toHaveLength(2);
            const row = again.root.querySelector('.item-ic:not(.item-ic-lg) img');
            const hero = again.root.querySelector('.item-ic-lg img');
            expect(row).not.toBeNull();
            expect(hero).not.toBeNull();
            expect(row).not.toBe(images[0]);
            expect(hero).not.toBe(images[1]);
            expect(row!.getAttribute('src')).toBe(iconUrl(TOKEN_ID));
            expect(hero!.getAttribute('src')).toBe(iconUrl(TOKEN_ID, ICON_HERO_SIZE));
            expect(row!.getAttribute('data-token-id')).toBe(TOKEN_ID);
            expect(hero!.getAttribute('data-token-id')).toBe(TOKEN_ID);
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
                overlay: { kind: 'publish-name' },
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

    it('the shop tab is pure storefront: publish lives behind the studio', () => {
        // The seller's tools moved behind the Studio tab (owner's call,
        // 2026-08-30) — a visitor's storefront carries no publish control.
        const { root } = paint(idlePubkey({ fetch: { kind: 'empty' } }));
        expect(root.querySelector('[data-role="open-publish"]')).toBeNull();
        const studio = paint(idlePubkey({ fetch: { kind: 'empty' }, panel: 'studio' }));
        expect(
            studio.root.querySelector('[data-role="studio-open-publish"]'),
        ).not.toBeNull();
    });

    /**
     * A stall with no settings is painted in the shipped default, which is also
     * the first row of the picker. Leaving the selection to the browser was
     * right by accident and read as nothing being chosen, so a seller published
     * the look they already had and saw an unchanged stall — the single most
     * likely reading of "I published and the theme did not render".
     */
    it('picker-shows-the-look-already-on-screen', () => {
        // Rewritten 2026-09-04 against the behaviour rather than the element:
        // the picker is a segmented control now, and "the pressed one is the
        // painted one" is the rule — whether it is a `<select>`, three buttons
        // or whatever a later design brings.
        const { root } = open();
        expect(pressedLook(root), 'the pressed segment is the painted look').toBe(
            DEFAULT_THEME_ID,
        );
        const note = root.querySelector('[data-role="publish-same-look"]') as HTMLElement;
        expect(note.hidden, 'default look is the painted one, so say so').toBe(false);
        expect(note.textContent).toBe(PUBLISH_SAME_LOOK);
    });

    it('picker-follows-a-published-theme-and-drops-the-note-on-a-change', () => {
        const { root } = open({ theme: decodeTheme(NEO_CITY_THEME_ID) });
        expect(pressedLook(root)).toBe(NEO_CITY_THEME_ID);
        const note = root.querySelector('[data-role="publish-same-look"]') as HTMLElement;
        expect(note.hidden).toBe(false);

        pickLook(root, RURAL_THEME_ID);
        expect(pressedLook(root), 'the choice is the pressed one').toBe(RURAL_THEME_ID);
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
            overlay: { kind: 'publish-name' },
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
                idlePubkey({
                    fetch,
                    tokens: new Map([[TOKEN_ID, BEANS]]),
                    panel: 'studio',
                }),
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
            overlay: { kind: 'publish-name' },
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
            // The door carries its own brand header (direction D); a stall
            // keeps the sign. Either way the mark leads a <header>.
            const sign = root.querySelector(
                view.route.kind === 'home' ? 'header.door-brand' : '.stall-head .stall-sign',
            ) as HTMLElement | null;
            expect(sign, 'the sign carries the mark and the headings').not.toBeNull();
            const mark = sign!.querySelector('img.stall-mark') as HTMLImageElement | null;
            expect(mark, 'the mark leads the sign').not.toBeNull();
            expect(mark!.tagName).toBe('IMG');
            expect(mark!.getAttribute('src'), 'the logo asset is wired').toBeTruthy();
            expect(mark!.alt, 'decorative: the name beside it announces identity').toBe('');
            expect(sign!.firstElementChild, 'mark precedes the headings').toBe(mark);
            if (view.route.kind !== 'home') {
                const head = root.querySelector('.stall-head') as HTMLElement;
                expect(head.firstElementChild, 'the sign leads the header').toBe(sign);
            }
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
                overlay: { kind: 'publish-name' },
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
            // The share block lives behind the studio tab now.
            return paint(idlePubkey({ fetch: { kind: 'empty' }, panel: 'studio' }));
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

describe('grouped-price-is-an-asked-amount-of-this-stall', () => {
    /**
     * One token, one card (owner, 2026-08-29). The card's figure must be an
     * `askedSats` the covenant encodes — the cheapest buyable of this stall's
     * own listings, never the market's (§10: the index silently drops offers,
     * so "lowest on Agora" is unprovable) and never a computed number. The
     * count label is its own words, because "from" already means minimum-take.
     */
    it('shows one card per token, priced at the cheapest ask', () => {
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
        // One card per token now (owner, 2026-08-29): the two Beans offers
        // are one card whose figure is the cheapest ask — an actual
        // `askedSats`, never computed — with a count label that is not a
        // second "from".
        const names = [...root.querySelectorAll('.item-n')].map((n) => n.textContent);
        expect(names, 'two tokens, two cards').toEqual(['Green Tea', 'Roasted Beans']);
        const prices = [...root.querySelectorAll('[data-role="price"]')].map(
            (p) => p.textContent,
        );
        expect(prices[1], 'the grouped card shows the cheapest ask').toBe('300');
        const lots = root.querySelector('.item-lots');
        expect(lots?.textContent).toBe(lowestOfListings(2));
    });

    it('lists every offer of the token in the detail, cheapest first', () => {
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
        const { root } = paint(
            offersView([dear, cheap], undefined, {
                overlay: { kind: 'buy', outpoint: cheap.outpoint },
            }),
        );
        const block = root.querySelector('[data-role="listings"]');
        expect(block, 'the detail carries the listings block').not.toBeNull();
        expect(block!.textContent).toContain(listingsAtThisStall(2));
        const figures = [...block!.querySelectorAll('[data-role="price"]')].map(
            (n) => n.textContent,
        );
        // Each figure is that offer's own asked amount, cheapest first, and
        // each wears the price role so the layout guard protects it too.
        expect(figures).toEqual(['300 XEC', '900 XEC']);
        // The card's stock line is the sum of real UTXO remainders.
        expect(root.querySelector('.item-q')?.textContent).toContain('24 left');
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

    it('lands on neutral ground when the control it was on is gone', () => {
        const root = document.createElement('div');
        document.body.append(root);
        try {
            renderStall(root, offersView([OFFER]), handlers());
            (root.querySelector('button.item-head') as HTMLButtonElement).focus();
            // The offer sold: its outpoint is spent, so the row is not "the same
            // row that moved" and must not hand focus to whatever replaced it.
            // But `<body>` is not the answer either — that resets a screen
            // reader to the top of the page. The container is neutral ground.
            renderStall(root, idlePubkey({ fetch: { kind: 'empty' } }), handlers());
            expect(root.querySelector('button.item-head')).toBeNull();
            expect((document.activeElement as HTMLElement).closest('.item-head')).toBeNull();
            expect(document.activeElement, 'the shop, not the page').toBe(
                root.querySelector('.stall'),
            );
        } finally {
            root.remove();
        }
    });

    it('hands focus back to the opener when the sheet closes', () => {
        /**
         * The WAI-ARIA dialog contract: focus returns to the control that
         * opened the dialog. The sheet's own controls vanish with it, so
         * without the opener snapshot every close dropped a keyboard
         * visitor at `<body>` — and the openers already carry focus keys.
         */
        const root = document.createElement('div');
        document.body.append(root);
        try {
            const idle = offersView([OFFER]);
            renderStall(root, idle, handlers());
            const opener = root.querySelector('[data-focus-key="tab-studio"]') as HTMLElement;
            opener.focus();

            renderStall(root, offersView([OFFER], undefined, { overlay: { kind: 'publish-name' } }), handlers());
            // Focus is wherever the sheet put it; what matters is that the
            // opener's key was snapshot on the idle→open edge.
            renderStall(root, idle, handlers());
            expect(
                document.activeElement?.getAttribute('data-focus-key'),
                'the control that opened the sheet has it back',
            ).toBe('tab-studio');
        } finally {
            root.remove();
        }
    });
});

describe('a-book-move-is-spoken-not-only-pulsed', () => {
    /**
     * The page's premise is a live socket, and every visible signal of a move
     * — the outline pulse, the feed row — is silent to a screen reader. One
     * polite region on `<body>`, beside the root and not inside it, because
     * an aria-live node rebuilt by the very paint it announces is one a
     * reader never hears.
     */
    it('announces into a persistent region outside the replaced tree', () => {
        const root = document.createElement('div');
        document.body.append(root);
        try {
            renderStall(
                root,
                offersView([OFFER], undefined, { justChanged: new Set([OFFER.tokenId]) }),
                handlers(),
            );
            const region = document.getElementById('sr-live');
            expect(region).not.toBeNull();
            expect(region!.closest('.frame'), 'outside the replaced tree').toBeNull();
            expect(region!.getAttribute('role')).toBe('status');
            expect(region!.textContent).toBe(EVENT_BOOK);

            // The same message twice still reads as a change to the region,
            // or the second move of a busy stall is never announced.
            renderStall(
                root,
                offersView([OFFER], undefined, { justChanged: new Set([OFFER.tokenId]) }),
                handlers(),
            );
            expect(region!.textContent).not.toBe(EVENT_BOOK);
            expect(region!.textContent!.trimEnd()).toBe(EVENT_BOOK);

            // A quiet paint says nothing new.
            renderStall(root, offersView([OFFER]), handlers());
            expect(region!.textContent!.trimEnd()).toBe(EVENT_BOOK);
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
                    overlay: { kind: 'publish-name' },
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

describe('the-way-out-is-at-both-ends-of-the-sheet', () => {
    /**
     * The sheet is 92vh on a phone — the scrim is a sliver and Escape needs a
     * keyboard — and it holds two whole record editors, so a close only at the
     * foot meant scrolling everything to leave. The head carries a close the
     * seller can always reach; the foot keeps the quiet one beside the
     * ask-outright control, after both editors, because the refresh it offers
     * re-reads both records alike.
     */
    it('closes from the header without scrolling, and from the foot after the editors', () => {
        const h = handlers();
        const root = document.createElement('div');
        renderStall(
            root,
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                tokens: new Map([[TOKEN_ID, BEANS]]),
                overlay: { kind: 'publish-name' },
            }),
            h,
        );
        const top = root.querySelector(
            '.sheet-head [data-role="publish-close-top"]',
        ) as HTMLButtonElement;
        expect(top, 'the header holds a close').not.toBeNull();
        expect(top.getAttribute('aria-label')).toBe(PUBLISH_CLOSE);
        top.click();
        expect(h.onClosePublish).toHaveBeenCalledTimes(1);

        const bottom = root.querySelector(
            '.sheet-foot [data-role="publish-close"]',
        ) as HTMLButtonElement;
        expect(bottom, 'the foot keeps its close').not.toBeNull();
        bottom.click();
        expect(h.onClosePublish).toHaveBeenCalledTimes(2);

        // The ask-outright control sits in the same foot, after both record
        // editors — the refresh serves the description record too.
        const check = root.querySelector(
            '.sheet-foot [data-role="publish-check"]',
        ) as HTMLElement;
        expect(check).not.toBeNull();
        const describe = root.querySelector('[data-role="describe"]');
        if (describe !== null) {
            expect(
                describe.compareDocumentPosition(check) &
                    Node.DOCUMENT_POSITION_FOLLOWING,
                'the foot trails the description editor',
            ).toBeTruthy();
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
                overlay: { kind: 'publish-name' },
                stallName: 'Riverside Goods',
                theme,
            }),
        );
        // Rewritten 2026-09-04 against the behaviour: the look is chosen by
        // pressing a segment, and what is asserted is the paint it causes.
        return { root, stall: root.querySelector('.stall') as HTMLElement };
    }

    it('repaints the live stall in the chosen look, strip and all', () => {
        const { root, stall } = openSheet();
        // Against the table, not a literal: D1 froze the mapping, not the
        // pixels, so this test asserts "painted in Modern", whatever Modern is.
        const modern = DEFAULT_THEME.bg;
        expect(stall.style.getPropertyValue('--s-bg')).toBe(
            `rgb(${modern.r}, ${modern.g}, ${modern.b})`,
        );
        expect(stall.querySelector('.orn'), 'Modern ships no strip').toBeNull();

        pickLook(root, NEO_CITY_THEME_ID);

        const neo = decodeTheme(NEO_CITY_THEME_ID);
        expect(stall.style.getPropertyValue('--s-bg')).toBe(
            `rgb(${neo.bg.r}, ${neo.bg.g}, ${neo.bg.b})`,
        );
        // The strip is part of the look: without this, choosing Neo left a
        // white shop and choosing Modern left Neo's ticker running above one.
        const strip = stall.querySelector('.orn') as HTMLElement;
        expect(strip).not.toBeNull();
        expect(strip.classList.contains('orn-ticker')).toBe(true);

        pickLook(root, DEFAULT_THEME_ID);
        expect(stall.querySelectorAll('.orn'), 'never two strips').toHaveLength(0);
        expect(stall.style.getPropertyValue('--s-bg')).toBe(
            `rgb(${modern.r}, ${modern.g}, ${modern.b})`,
        );
    });

    it('still says when publishing would not change anything', () => {
        const { root } = openSheet();
        const note = root.querySelector('[data-role="publish-same-look"]') as HTMLElement;
        expect(note.hidden, 'the painted look is the selected one').toBe(false);
        pickLook(root, RURAL_THEME_ID);
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
                overlay: { kind: 'describe' },
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
        // The meter counts the whole record against the shared 222-byte
        // ceiling — one meter for the text and the shelf, because they share
        // one budget (P9): 38 bytes of lokad + id + 9 of text push.
        //
        // Amended 2026-09-04: the count moved onto the "Publishes:" line, so
        // the figure is asserted inside it rather than as the whole node —
        // one node saying the size, from the encoder's own arithmetic.
        const counter = root.querySelector('[data-role="describe-summary"]') as HTMLElement;
        field.value = 'Cà phê';
        field.dispatchEvent(new Event('input'));
        expect(counter.textContent).toContain(descBytesLeft(47, OP_RETURN_BUDGET));
        expect(counter.textContent).toBe(
            summaryLine([{ label: SUMMARY_WORDS }], 47, OP_RETURN_BUDGET),
        );
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
        // Amended 2026-09-04: removal is a mode of this sheet rather than a
        // second link under it, so the control is the way IN and the sign
        // buttons carry the record. The gate is unchanged.
        const none = sheet();
        expect(
            (none.root.querySelector('[data-role="describe-remove"]') as HTMLElement).hidden,
            'a removal over nothing costs a fee and changes nothing',
        ).toBe(true);

        const some = sheet({ descriptions: new Map([[TOKEN_ID, 'Existing words']]) });
        const remove = some.root.querySelector(
            '[data-role="describe-remove"]',
        ) as HTMLButtonElement;
        expect(remove.hidden).toBe(false);
        expect(remove.textContent).toBe(copy.DESC_REMOVE_OPEN);
        remove.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        const hex = some.root.querySelector('[data-role="describe-hex"]') as HTMLElement;
        expect(hex.textContent).toBe(encodeRemovalHex(TOKEN_ID, {}));
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

        // Amended 2026-09-04: one sheet became two, so each record's hex is
        // reached through its own overlay kind. The rule under test is
        // unchanged — both nodes still wear `.publish-hex`.
        const sheets = [
            ['publish-hex', { kind: 'publish-name' } as const],
            ['describe-hex', { kind: 'describe' } as const],
        ] as const;
        for (const [role, overlay] of sheets) {
            const { root } = paint(
                idlePubkey({
                    fetch: { kind: 'offers', offers: [OFFER] },
                    tokens: new Map([[TOKEN_ID, BEANS]]),
                    overlay,
                    stallName: 'Riverside Goods',
                }),
            );
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
        // Amended 2026-09-04: the two records live on two sheets now, so each
        // primary handoff is reached through its own overlay kind. The rule is
        // unchanged — both say "Sign with", neither says "sign in".
        const sheets = [
            ['publish', { kind: 'publish-name' } as const],
            ['describe', { kind: 'describe' } as const],
        ] as const;
        for (const [prefix, overlay] of sheets) {
            const { root } = paint(
                idlePubkey({
                    fetch: { kind: 'offers', offers: [OFFER] },
                    tokens: new Map([[TOKEN_ID, BEANS]]),
                    overlay,
                    stallName: 'Riverside Goods',
                }),
            );
            const node = root.querySelector(
                `[data-role="${prefix}-cashtab"]`,
            ) as HTMLElement;
            expect(node, prefix).not.toBeNull();
            expect(node.textContent, prefix).toBe(PUBLISH_OPEN_CASHTAB);
            expect(node.textContent, `${prefix} must not read as log in`).not.toMatch(
                /sign in\b/i,
            );
            const other = root.querySelector(`[data-role="${prefix}-pay"]`) as HTMLElement;
            expect(other.textContent, prefix).toBe(PUBLISH_OPEN_PAY);
        }
    });

    it('gives each act its own words', () => {
        // Every wallet-bound label is distinct, so no two controls read as
        // the same one. The removal's pay link once wore PUBLISH_OPEN_PAY
        // verbatim — two identical pills signing two different records.
        const labels = [
            OPEN_IN_CASHTAB,
            PUBLISH_OPEN_CASHTAB,
            PUBLISH_OPEN_PAY,
            LIST_IN_CASHTAB_LINK,
            DESC_REMOVE,
            DESC_REMOVE_PAY,
        ];
        expect(new Set(labels).size).toBe(labels.length);
    });

    it('the-removal-road-names-the-removal', () => {
        // Amended 2026-09-04: the same two controls now sign both records, one
        // mode at a time — so instead of two pills a few lines apart, the rule
        // is that each mode renames them. A control that kept "Sign with
        // Cashtab" while aimed at a removal would be the same defect wearing
        // the other hat.
        const { root } = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                overlay: { kind: 'describe' },
                tokens: new Map([[TOKEN_ID, BEANS]]),
                descriptions: new Map([[TOKEN_ID, 'Existing words']]),
            }),
        );
        const write = root.querySelector('[data-role="describe-cashtab"]')!;
        const writePay = root.querySelector('[data-role="describe-pay"]')!;
        expect(write.textContent).toBe(PUBLISH_OPEN_CASHTAB);
        expect(writePay.textContent).toBe(PUBLISH_OPEN_PAY);

        root.querySelector<HTMLButtonElement>('[data-role="describe-remove"]')!
            .dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(write.textContent).toBe(DESC_REMOVE);
        expect(writePay.textContent).toBe(DESC_REMOVE_PAY);
        expect(writePay.textContent).not.toBe(PUBLISH_OPEN_PAY);
        // Danger is reserved for what it is: this one takes words off a page.
        expect(write.classList.contains('danger')).toBe(true);
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
                overlay: { kind: 'describe' },
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
    /**
     * A removal is a transaction like any other, so it gets the same roads to
     * a wallet as writing does — it had only the Cashtab web link once, which
     * stranded a seller who publishes from a phone: they could add words and
     * never take them back.
     *
     * Amended 2026-09-04: those roads are now the sheet's own two controls and
     * its own QR, in removal mode, rather than a second set below the first.
     */
    const open = (over: Partial<StallView> = {}) =>
        paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                overlay: { kind: 'describe' },
                tokens: new Map([[TOKEN_ID, BEANS]]),
                ...over,
            }),
        );

    it('offers the same three ways to a wallet as publishing does', () => {
        const { root } = open({ descriptions: new Map([[TOKEN_ID, 'Existing words']]) });
        root.querySelector<HTMLButtonElement>('[data-role="describe-remove"]')!
            .dispatchEvent(new MouseEvent('click', { bubbles: true }));
        const web = root.querySelector<HTMLAnchorElement>('[data-role="describe-cashtab"]')!;
        const pay = root.querySelector<HTMLAnchorElement>('[data-role="describe-pay"]')!;
        const qr = root.querySelector<HTMLElement>('[data-role="describe-qr"]')!;
        expect(web.hidden).toBe(false);
        expect(web.href).toContain('op_return_raw');
        expect(pay.hidden).toBe(false);
        expect(pay.href).toContain('op_return_raw');
        expect(qr.hidden).toBe(false);
        expect(qr.querySelector('svg')).not.toBeNull();
        // All three carry the removal record, not the one in the fields.
        const removal = encodeRemovalHex(TOKEN_ID, {})!;
        expect(pay.href).toContain(encodeURIComponent(removal));
        expect(root.querySelector('[data-role="describe-hex"]')!.textContent).toBe(removal);
    });

    it('offers none of them when there is nothing to remove', () => {
        const { root } = open();
        expect(
            root.querySelector<HTMLElement>('[data-role="describe-remove"]')!.hidden,
            'no way into a mode that would sign nothing',
        ).toBe(true);
    });

    it('keeps-the-words-comes-back', () => {
        // The way out of the mode, and the form it hands back: enabled fields
        // with the seller's own words still in them.
        const { root } = open({ descriptions: new Map([[TOKEN_ID, 'Existing words']]) });
        const toggle = root.querySelector<HTMLButtonElement>('[data-role="describe-remove"]')!;
        toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(toggle.textContent).toBe(copy.DESC_KEEP);
        const field = root.querySelector<HTMLTextAreaElement>('[data-role="describe-text"]')!;
        expect(field.disabled, 'the form on screen is the record being signed').toBe(true);
        expect(
            root.querySelector<HTMLInputElement>('[data-role="describe-shelf"]')!.disabled,
        ).toBe(true);
        expect(
            root.querySelector<HTMLInputElement>('[data-role="describe-price"]')!.disabled,
        ).toBe(true);
        const warn = root.querySelector<HTMLElement>('[data-role="describe-remove-warn"]')!;
        expect(warn.hidden).toBe(false);
        expect(warn.textContent).toBe(copy.DESC_REMOVE_LEDE);

        toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(toggle.textContent).toBe(copy.DESC_REMOVE_OPEN);
        expect(field.disabled).toBe(false);
        expect(field.value).toBe('Existing words');
        expect(warn.hidden).toBe(true);
        expect(root.querySelector('[data-role="describe-hex"]')!.textContent).toBe(
            encodeDescriptionHex(TOKEN_ID, 'Existing words'),
        );
    });
});

describe('aria-modal-is-a-promise-about-the-keyboard', () => {
    it('sends Tab from the last control back to the first', () => {
        const { root } = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                overlay: { kind: 'publish-name' },
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
                overlay: { kind: 'publish-name' },
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
    /**
     * The sheet-peek choreography is retired (owner, 2026-08-30): the shell
     * has tabs, so the way to review a look is to walk to the Shop tab —
     * which means the preview must live in view state and survive every
     * repaint, instead of being a DOM patch a tab switch throws away.
     */
    function openSheet() {
        const { root, h } = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                overlay: { kind: 'publish-name' },
                tokens: new Map([[TOKEN_ID, BEANS]]),
            }),
        );
        // Rewritten 2026-09-04: the look is pressed, not selected. Every
        // assertion below is about the paint and the report, which is what
        // the rules are — the control's tag name never was.
        const scrim = root.querySelector<HTMLElement>('[data-role="sheet-scrim"]')!;
        return { root, h, scrim };
    }

    it('applies the chosen look to the stall behind, without any peek', () => {
        const { root, scrim } = openSheet();
        const stall = root.querySelector<HTMLElement>('.stall')!;
        const before = stall.style.getPropertyValue('--s-bg');
        pickLook(root, NEO_CITY_THEME_ID);
        expect(stall.style.getPropertyValue('--s-bg')).not.toBe(before);
        expect(stall.classList.contains('t-neo')).toBe(true);
        expect(scrim.classList.contains('peek')).toBe(false);
    });

    it('reports the try-on so every later paint keeps it', () => {
        const { root, h } = openSheet();
        pickLook(root, NEO_CITY_THEME_ID);
        expect(h.onPreviewLook).toHaveBeenCalledWith({
            themeId: NEO_CITY_THEME_ID,
            attachmentFlags: 0,
        });
    });

    it('picking the record\'s own look back is how a preview ends', () => {
        const { root, h } = openSheet();
        pickLook(root, NEO_CITY_THEME_ID);
        pickLook(root, DEFAULT_THEME_ID);
        expect(h.onPreviewLook).toHaveBeenLastCalledWith(undefined);
    });

    it('a remembered preview outranks the record on a fresh paint', () => {
        // The tab switch: a whole new paint with the record's own theme in
        // the view — the preview must still win, rows shown without the
        // entitlement (looking is free; only a record needs the token).
        const { root } = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                tokens: new Map([[TOKEN_ID, BEANS]]),
                previewLook: { themeId: NEO_CITY_THEME_ID, attachmentFlags: 0b10 },
            }),
        );
        const stall = root.querySelector<HTMLElement>('.stall')!;
        expect(stall.classList.contains('t-neo')).toBe(true);
        expect(stall.classList.contains('att-rainfall')).toBe(true);
    });

    it('a preview equal to the record is no preview at all', () => {
        const { root } = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                tokens: new Map([[TOKEN_ID, BEANS]]),
                previewLook: { themeId: DEFAULT_THEME_ID, attachmentFlags: 0 },
            }),
        );
        const stall = root.querySelector<HTMLElement>('.stall')!;
        expect(stall.classList.contains('t-modern')).toBe(true);
    });

    it('a click on the scrim closes the sheet', () => {
        const { root, h, scrim } = openSheet();
        pickLook(root, NEO_CITY_THEME_ID);
        scrim.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(h.onClosePublish).toHaveBeenCalled();
    });
});

describe('a-decoration-is-chosen-where-the-look-is', () => {
    function sheet(over = {}) {
        const { root } = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                overlay: { kind: 'publish-name' },
                tokens: new Map([[TOKEN_ID, BEANS]]),
                theme: decodeTheme(RURAL_THEME_ID),
                ...over,
            }),
        );
        return root;
    }

    it('groups the chips per place, one place per slot the look ships', () => {
        // Rewritten 2026-09-04: the control is a run of chips per place, not a
        // select per place. The rule the old test held — one
        // control per slot, never one per row — is now "one group per slot,
        // every row of that slot a chip inside it".
        const root = sheet();
        // Rural after the live audit: the hanging sign folded into the
        // base, so crest is gone — five places.
        const slots = ['yard', 'mood', 'trim', 'fringe', 'badge'];
        for (const slot of slots) {
            expect(
                root.querySelector(`[data-role="decor-${slot}"]`),
                `rural offers the ${slot} slot`,
            ).not.toBeNull();
        }
        expect(root.querySelectorAll('.decor .dec').length).toBe(slots.length);
        // Every shipped row of this look is offered — held or not, minted or
        // not. Looking is free (§6/§7); holding decides what paints.
        const rural = SHIPPED_ATTACHMENTS.filter((r) => r.themeId === RURAL_THEME_ID);
        expect(root.querySelectorAll('.decor .dec [data-bit]').length).toBe(rural.length);
    });

    it('opens the look picker on every look, not just the second one', () => {
        for (const id of [DEFAULT_THEME_ID, NEO_CITY_THEME_ID, RURAL_THEME_ID]) {
            const root = sheet({ theme: decodeTheme(id) });
            expect(pressedLook(root), `painted ${id}`).toBe(id);
        }
    });

    it('opens on what the record already set', () => {
        const root = sheet({ attachmentFlags: 1 });
        expect(pressedDecor(root, 'yard')).toEqual([0]);
    });

    it('holds one decoration per place, and lets the place go bare again', () => {
        // Exclusive within a place: two bits in one slot are unrepresentable
        // here, which is a better answer than resolving them quietly after
        // the record is signed. Pressing the pressed one takes it off.
        const root = sheet({ stallName: 'Riverside' });
        pressDecor(root, 'yard', 0);
        expect(pressedDecor(root, 'yard')).toEqual([0]);
        pressDecor(root, 'yard', 0);
        expect(pressedDecor(root, 'yard'), 'a place can go bare again').toEqual([]);
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

    it('previews the choice on the stall behind', () => {
        const root = sheet({ stallName: 'Riverside' });
        document.body.append(root);
        pressDecor(root, 'yard', 0);
        expect(root.querySelector('.att-beetle')).not.toBeNull();
        root.remove();
    });

    it('puts the choice in the record the seller signs', () => {
        // A record needs a name: `encodeManifestHex` refuses an empty one.
        const root = sheet({ stallName: 'Riverside' });
        const hexBefore = root.querySelector('[data-role="publish-hex"]')!.textContent ?? '';
        pressDecor(root, 'yard', 0);
        const hexAfter = root.querySelector('[data-role="publish-hex"]')!.textContent ?? '';
        expect(hexAfter).not.toBe(hexBefore);
        // Tag byte then two payload bytes, appended after the three required
        // pushes: `03 01 01 00`.
        expect(hexAfter.endsWith('03010100')).toBe(true);
    });

    it('drops the flags when the look changes, rather than re-aiming them', () => {
        const root = sheet({ attachmentFlags: 1 });
        document.body.append(root);
        pickLook(root, NEO_CITY_THEME_ID);
        // Neo has no mood row; bit 0 there is a different row, so carrying
        // the flag over would wear something never chosen. (The yard slot
        // stopped being the discriminator when Neo grew a Grid horizon.)
        expect(root.querySelector('[data-role="decor-mood"]')).toBeNull();
        expect(pressedDecor(root, 'crest'), 'nothing carries across a look').toEqual([]);
        expect(pressedDecor(root, 'yard')).toEqual([]);
        root.remove();
    });

    it('paints no link to a shop that does not exist yet', () => {
        expect(sheet().querySelector('[data-role="decor-shop"]')).toBeNull();
    });
});

describe('a-worn-decoration-reaches-the-stall', () => {
    it('puts a root row on the stall and builds the yard under the sign', () => {
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
        // A stage, not the footer's doormat: the first billboard pass found
        // the beetle below the fold on every screen.
        expect(strip.previousElementSibling?.classList.contains('stall-head')).toBe(true);
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
        // A mood paints no node and carries no class of its own — the
        // look's stylesheet class is applyTheme's, not the mood's.
        expect(stall.className).toBe('stall t-modern');
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


describe('the-shell-and-its-tabs', () => {
    it('tabs on a resolved stall: our word leads, the name rides subordinate', () => {
        const h = handlers();
        const root = document.createElement('div');
        renderStall(
            root,
            offersView([OFFER], undefined, { stallName: 'Riverside Goods' }),
            h,
        );
        const bar = root.querySelector('nav.tabs');
        expect(bar).not.toBeNull();
        // Navigation semantics, not the tab pattern: `aria-current` on the
        // active panel's button, and no `tablist`/`tab` roles — the half of
        // that pattern this bar once claimed promised arrow-key behaviour
        // that was never implemented.
        expect(bar?.getAttribute('role')).toBeNull();
        const shop = root.querySelector('[data-role="tab-shop"]') as HTMLElement;
        expect(shop.getAttribute('role')).toBeNull();
        expect(shop.getAttribute('aria-current')).toBe('page');
        expect(shop.querySelector('.tab-label')?.textContent).toBe(TAB_SHOP);
        // The name is subordinate, never the label itself — and never the
        // address: only a manifest name rides the bar.
        expect(shop.querySelector('.tab-name')?.textContent).toBe('\u00b7 Riverside Goods');
        const studio = root.querySelector('[data-role="tab-studio"]') as HTMLButtonElement;
        studio.click();
        expect(h.onSwitchPanel).toHaveBeenCalledWith('studio');
    });

    it('an unnamed stall shows our word alone — the address never rides the bar', () => {
        const { root } = paint(offersView([OFFER], undefined, { stallName: undefined }));
        const shop = root.querySelector('[data-role="tab-shop"]') as HTMLElement;
        expect(shop.querySelector('.tab-name')).toBeNull();
        expect(shop.textContent).toBe(TAB_SHOP);
    });

    it('no tabs off the stall: the door and an unreadable link carry none', () => {
        const { root } = paint({
            route: { kind: 'home' },
            overlay: { kind: 'idle' },
            tokens: new Map(),
        });
        expect(root.querySelector('nav.tabs')).toBeNull();
    });

    it('the studio is a launcher that opens the same modal sheet', () => {
        const h = handlers();
        const root = document.createElement('div');
        renderStall(root, offersView([OFFER], undefined, { panel: 'studio' }), h);
        // One panel in the DOM at a time: no offer cards behind the studio.
        expect(root.querySelector('.item')).toBeNull();
        const open = root.querySelector(
            '[data-role="studio-open-publish"]',
        ) as HTMLButtonElement;
        expect(open).not.toBeNull();
        open.click();
        expect(h.onOpenPublish).toHaveBeenCalled();
        // And with the overlay set, the same modal sheet mounts over the panel.
        const withSheet = paint(
            offersView([OFFER], undefined, {
                panel: 'studio',
                overlay: { kind: 'publish-name' },
            }),
        );
        expect(withSheet.root.querySelector('[data-role="sheet-scrim"]')).not.toBeNull();
    });
});

describe('an-unwatched-stall-does-not-show-an-empty-feed', () => {
    it('says "not watching" on a screen with no socket, never an empty list', () => {
        const { root } = paint(
            offersView([], undefined, {
                panel: 'activity',
                fetch: {
                    kind: 'unreachable',
                    triedAtMs: 1_756_400_000_000,
                    hosts: [],
                },
            }),
        );
        expect(root.textContent).toContain(ACTIVITY_NOT_WATCHING);
        expect(root.querySelector('[data-role="events"]')).toBeNull();
    });

    it('says its gaps out loud, and its quiet honestly', () => {
        const noisy = paint(
            offersView([OFFER], undefined, {
                panel: 'activity',
                activityGaps: 1,
                events: [
                    { txid: 'ab'.repeat(32), kind: 'book', seenAtMs: 1_756_400_000_000 },
                    { txid: 'cd'.repeat(32), kind: 'other', seenAtMs: 1_756_399_000_000 },
                ],
            }),
        );
        expect(noisy.root.textContent).toContain(ACTIVITY_GAPS);
        const kinds = [...noisy.root.querySelectorAll('.event-kind')].map(
            (n) => n.textContent,
        );
        expect(kinds).toEqual([EVENT_BOOK, EVENT_OTHER]);
        // No row ever says "sold": a cancel and a full take are one shape.
        expect(noisy.root.textContent).not.toContain('sold');

        const quiet = paint(offersView([OFFER], undefined, { panel: 'activity' }));
        expect(quiet.root.textContent).toContain(ACTIVITY_QUIET);
        expect(quiet.root.textContent).not.toContain(ACTIVITY_GAPS);
    });

    /**
     * A clock time alone claims the stamp is from today. A tab left open
     * outlives midnight, so a row from another day names that day, and a row
     * from today stays a bare time — the short form is the common case.
     */
    it('a-feed-row-from-another-day-names-its-day', () => {
        const today = new Date();
        today.setHours(12, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const { root } = paint(
            offersView([OFFER], undefined, {
                panel: 'activity',
                events: [
                    { txid: 'ab'.repeat(32), kind: 'book', seenAtMs: today.getTime() },
                    { txid: 'cd'.repeat(32), kind: 'other', seenAtMs: yesterday.getTime() },
                ],
            }),
        );
        const times = [...root.querySelectorAll('.event-time')].map(
            (n) => n.textContent,
        );
        expect(times[0]).toBe('12:00:00');
        expect(times[1]).toMatch(/^[A-Z][a-z]{2} \d{1,2}, 12:00:00$/);
    });

    /**
     * A full ring has dropped its oldest rows in silence, and the lede's
     * "what this page has seen arrive" would then overclaim. The line
     * appears only when the ring is at its cap.
     */
    it('a-full-ring-says-older-rows-rolled-off', () => {
        const capped = paint(
            offersView([OFFER], undefined, {
                panel: 'activity',
                events: Array.from({ length: MAX_STALL_EVENTS }, (_, i) => ({
                    txid: i.toString(16).padStart(2, '0').repeat(32),
                    kind: 'other' as const,
                    seenAtMs: 1_756_400_000_000 - i * 1000,
                })),
            }),
        );
        expect(capped.root.textContent).toContain(activityCapped(MAX_STALL_EVENTS));
        // The feed is a real list now: an <ol> with one <li> per arrival.
        const list = capped.root.querySelector('ol[data-role="events"]');
        expect(list).not.toBeNull();
        expect(list!.querySelectorAll('li.event').length).toBe(MAX_STALL_EVENTS);

        const few = paint(
            offersView([OFFER], undefined, {
                panel: 'activity',
                events: [
                    { txid: 'ab'.repeat(32), kind: 'book', seenAtMs: 1_756_400_000_000 },
                ],
            }),
        );
        expect(few.root.textContent).not.toContain(
            activityCapped(MAX_STALL_EVENTS),
        );
    });
});

describe('a-book-row-says-consumed-or-appeared-never-sold', () => {
    it('labels the shapes the entries proved, and stays generic without one', () => {
        const { root } = paint(
            offersView([OFFER], undefined, {
                panel: 'activity',
                events: [
                    { txid: 'a1'.repeat(32), kind: 'book', seenAtMs: 1, book: 'consumed' },
                    { txid: 'a2'.repeat(32), kind: 'book', seenAtMs: 2, book: 'appeared' },
                    { txid: 'a3'.repeat(32), kind: 'book', seenAtMs: 3, book: 'both' },
                    { txid: 'a4'.repeat(32), kind: 'book', seenAtMs: 4 },
                ],
            }),
        );
        const kinds = [...root.querySelectorAll('.event-kind')].map((n) => n.textContent);
        expect(kinds).toEqual([
            EVENT_BOOK_CONSUMED,
            EVENT_BOOK_APPEARED,
            EVENT_BOOK_BOTH,
            EVENT_BOOK,
        ]);
        expect(root.textContent!.toLowerCase()).not.toContain('sold');
    });

    it('pulses exactly the cards the view names, one-shot state included', () => {
        const { root } = paint(
            offersView([OFFER], undefined, { justChanged: new Set([TOKEN_ID]) }),
        );
        expect(root.querySelector('.item.just-changed')).not.toBeNull();
        const without = paint(offersView([OFFER]));
        expect(without.root.querySelector('.item.just-changed')).toBeNull();
    });
});

describe('the-browser-chrome-joins-the-look', () => {
    it('theme-color follows the painted background, mood included', () => {
        const meta = document.createElement('meta');
        meta.setAttribute('name', 'theme-color');
        document.head.append(meta);
        try {
            paint(offersView([OFFER], undefined, { theme: decodeTheme(NEO_CITY_THEME_ID) }));
            const neo = decodeTheme(NEO_CITY_THEME_ID).bg;
            expect(meta.getAttribute('content')).toBe(
                `rgb(${neo.r}, ${neo.g}, ${neo.b})`,
            );
            paint(offersView([OFFER]));
            const modern = DEFAULT_THEME.bg;
            expect(meta.getAttribute('content')).toBe(
                `rgb(${modern.r}, ${modern.g}, ${modern.b})`,
            );
        } finally {
            meta.remove();
        }
    });
});

describe('the-door-remembers-what-this-browser-pinned', () => {
    function homeView(pins: string[]): StallView {
        return {
            route: { kind: 'home' },
            overlay: { kind: 'idle' },
            tokens: new Map(),
            pinnedStalls: pins,
        };
    }

    it('paints each pin as a link that opens the full route token', () => {
        const h = handlers();
        const root = document.createElement('div');
        renderStall(root, homeView([ADDR, PK]), h);
        const wrap = root.querySelector('[data-role="pinned-stalls"]');
        expect(wrap).not.toBeNull();
        const opens = [...root.querySelectorAll('[data-role="pinned-open"]')];
        expect(opens).toHaveLength(2);
        // Glance length on screen; the click carries the untouched token.
        expect(opens[0]!.textContent).toContain('…');
        expect(opens[0]!.textContent!.length).toBeLessThan(20);
        (opens[0] as HTMLButtonElement).click();
        expect(h.onOpenStall).toHaveBeenCalledWith(ADDR);
        const unpins = [...root.querySelectorAll('[data-role="pinned-unpin"]')];
        (unpins[1] as HTMLButtonElement).click();
        expect(h.onTogglePin).toHaveBeenCalledWith(PK);
    });

    it('an unpinned door carries no pinned section at all', () => {
        const { root } = paint(homeView([]));
        expect(root.querySelector('[data-role="pinned-stalls"]')).toBeNull();
    });
});

describe('the-sign-pin-says-which-way-it-goes', () => {
    /**
     * One icon at the name's corner replaced the studio's text button
     * (owner's call, 2026-08-30). The words moved into the label — a
     * screen reader still hears which way the toggle goes.
     */
    it('offers the pin on the storefront sign and reports state', () => {
        const h = handlers();
        const root = document.createElement('div');
        renderStall(root, offersView([OFFER]), h);
        const pin = root.querySelector('[data-role="pin-stall"]') as HTMLButtonElement;
        expect(pin, 'the pin sits on the shop sign').not.toBeNull();
        expect(pin.getAttribute('aria-pressed')).toBe('false');
        expect(pin.getAttribute('aria-label')).toBe(copy.PIN_TO_DOOR);
        expect(pin.querySelector('svg'), 'icon, not words').not.toBeNull();
        pin.click();
        expect(h.onTogglePin).toHaveBeenCalledWith(ADDR);

        const pinned = paint(offersView([OFFER], undefined, { isPinnedStall: true }));
        const on = pinned.root.querySelector('[data-role="pin-stall"]') as HTMLButtonElement;
        expect(on.getAttribute('aria-pressed')).toBe('true');
        expect(on.classList.contains('pinned')).toBe(true);
        // The studio's text pin is gone — one control, one place.
        const studio = paint(offersView([OFFER], undefined, { panel: 'studio' }));
        expect(studio.root.querySelector('[data-role="studio-pin"]')).toBeNull();
        expect(
            studio.root.querySelector('[data-role="pin-stall"]'),
            'the sign carries it on every panel',
        ).not.toBeNull();
    });

    it('a-full-door-refuses-with-a-named-reason-not-a-dead-control', () => {
        const h = handlers();
        const root = document.createElement('div');
        renderStall(root, offersView([OFFER], undefined, { pinnedDoorFull: true }), h);
        const pin = root.querySelector('[data-role="pin-stall"]') as HTMLButtonElement;
        expect(pin.disabled).toBe(true);
        expect(pin.getAttribute('aria-label')).toBe(copy.PIN_DOOR_FULL);
        expect(pin.title).toBe(copy.PIN_DOOR_FULL);
        pin.click();
        expect(h.onTogglePin).not.toHaveBeenCalled();
        // A stall already pinned is never the one refused: its control is the
        // unpin, full door or not.
        const pinned = paint(
            offersView([OFFER], undefined, {
                pinnedDoorFull: true,
                isPinnedStall: true,
            }),
        );
        const on = pinned.root.querySelector('[data-role="pin-stall"]') as HTMLButtonElement;
        expect(on.disabled).toBe(false);
        expect(on.getAttribute('aria-pressed')).toBe('true');
    });
});

/**
 * The poster is overlay state now, the same shape as publish: a click names
 * the handler, and the sheet appears on the paint that follows. Render-only
 * tests drive that loop themselves.
 */
function drivePoster(root: HTMLElement, view: StallView, h: ReturnType<typeof handlers>): void {
    let current = view;
    const paintNow = (): void => {
        renderStall(root, current, h);
    };
    h.onOpenPoster.mockImplementation(() => {
        current = { ...current, overlay: { kind: 'poster', format: 'print' } };
        paintNow();
    });
    h.onClosePoster.mockImplementation(() => {
        current = { ...current, overlay: { kind: 'idle' } };
        paintNow();
    });
    h.onChoosePosterFormat.mockImplementation((format: PosterFormat) => {
        current = { ...current, overlay: { kind: 'poster', format } };
        paintNow();
    });
    paintNow();
}

describe('the-poster-is-the-share-link-made-printable', () => {
    it('opens from the studio with the name, the QR and the untouched link', () => {
        const h = handlers();
        const root = document.createElement('div');
        document.body.append(root);
        window.history.pushState({}, '', `/s/${ADDR}`);
        try {
            drivePoster(
                root,
                offersView([OFFER], undefined, {
                    panel: 'studio',
                    stallName: 'Riverside Goods',
                    tagline: 'Fresh weekly',
                }),
                h,
            );
            const open = root.querySelector('[data-role="open-poster"]') as HTMLButtonElement;
            expect(open).not.toBeNull();
            open.click();
            const sheet = root.querySelector('[data-role="poster"]') as HTMLElement;
            expect(sheet).not.toBeNull();
            expect(sheet.querySelector('.poster-name')?.textContent).toBe('Riverside Goods');
            expect(sheet.querySelector('.poster-tagline')?.textContent).toBe('Fresh weekly');
            expect(sheet.querySelector('svg.poster-qr')).not.toBeNull();
            // The link on the page is the link itself, never a shortened one:
            // a poster outlives this browser, so the words must carry it whole.
            expect(sheet.querySelector('.poster-url')?.textContent).toContain('/s/');

            const printed = vi.fn();
            (window as { print: () => void }).print = printed;
            (sheet.querySelector('[data-role="poster-print"]') as HTMLButtonElement).click();
            expect(printed).toHaveBeenCalled();
            (sheet.querySelector('[data-role="poster-close"]') as HTMLButtonElement).click();
            expect(root.querySelector('[data-role="poster"]')).toBeNull();
        } finally {
            root.remove();
        }
    });

    it('printing is a dialog the seller opened, never a repaint', () => {
        // Opening names onOpenPoster, never a panel switch or the publish
        // sheet. The paint that follows is the one the seller asked for.
        const h = handlers();
        const root = document.createElement('div');
        document.body.append(root);
        try {
            drivePoster(root, offersView([OFFER], undefined, { panel: 'studio' }), h);
            (root.querySelector('[data-role="open-poster"]') as HTMLButtonElement).click();
            expect(root.querySelector('[data-role="poster"]')).not.toBeNull();
            expect(h.onOpenPoster).toHaveBeenCalled();
            expect(h.onSwitchPanel).not.toHaveBeenCalled();
            expect(h.onOpenPublish).not.toHaveBeenCalled();
        } finally {
            root.remove();
        }
    });
});

describe('big-shop-tools', () => {
    /** Seven distinct tokens: the threshold where the tools appear. */
    const idOf = (i: number): string => (0x20 + i).toString(16).repeat(32);
    const NAMES = ['Mango', 'Apple', 'Cherry', 'Banana', 'Fig', 'Elder', 'Date'];
    // Prices deliberately not in alphabetical order.
    const SATS = [700n, 300n, 500n, 100n, 600n, 200n, 400n].map((n) => n * 100n);

    function lot(i: number, over: Partial<StallOffer> = {}): StallOffer {
        return {
            outpoint: { txid: 'ef'.repeat(32), outIdx: i },
            tokenId: idOf(i),
            atoms: 5n,
            variant: 'PARTIAL',
            askedSats: SATS[i]!,
            askedAtoms: 1n,
            priceNanoSatsPerAtom: SATS[i]! * 1_000_000_000n,
            ...over,
        };
    }

    function bigShop(over: Partial<StallView> = {}): StallView {
        const offers = NAMES.map((_, i) => lot(i));
        const tokens = new Map(
            NAMES.map((name, i) => [
                idOf(i),
                { tokenId: idOf(i), name, ticker: '', decimals: 0 } as TokenMeta,
            ]),
        );
        return offersView(offers, tokens, over);
    }

    function cardNames(root: HTMLElement): string[] {
        return [...root.querySelectorAll('.item-n')].map((n) => n.textContent ?? '');
    }

    it('a small shop stays a stall: no tools below the threshold', () => {
        const { root } = paint(offersView([OFFER]));
        expect(root.querySelector('[data-role="shop-tools"]')).toBeNull();
    });

    it('a big shop gets the find box and the sort, and reports typing', () => {
        const h = handlers();
        const root = document.createElement('div');
        renderStall(root, bigShop(), h);
        expect(root.querySelector('[data-role="shop-tools"]')).not.toBeNull();
        const find = root.querySelector('[data-role="shop-filter"]') as HTMLInputElement;
        find.value = 'app';
        find.dispatchEvent(new Event('input', { bubbles: true }));
        expect(h.onChangeFilter).toHaveBeenCalledWith('app');
        const sort = root.querySelector('[data-role="shop-sort"]') as HTMLSelectElement;
        sort.value = 'price-asc';
        sort.dispatchEvent(new Event('change', { bubbles: true }));
        expect(h.onChangeSort).toHaveBeenCalledWith('price-asc');
    });

    it('the filter narrows the shelves and never the header count', () => {
        const { root } = paint(bigShop({ shopFilter: 'apple' }));
        expect(cardNames(root)).toEqual(['Apple']);
        // The header keeps counting everything listed: the filter is a way of
        // looking, not a claim about the stall.
        expect(root.textContent).toContain(itemsForSale(7));
    });

    it('an emptied shelf blames the filter, never the stall', () => {
        const { root } = paint(bigShop({ shopFilter: 'zzz' }));
        expect(cardNames(root)).toEqual([]);
        expect(root.textContent).toContain(copy.SHOP_FILTER_NONE);
        expect(root.textContent).not.toContain(EMPTY_TITLE);
    });

    it('price sorts order cards by the figure each card shows', () => {
        const asc = paint(bigShop({ shopSort: 'price-asc' }));
        expect(cardNames(asc.root)).toEqual([
            'Banana', 'Elder', 'Apple', 'Date', 'Cherry', 'Fig', 'Mango',
        ]);
        const desc = paint(bigShop({ shopSort: 'price-desc' }));
        expect(cardNames(desc.root)).toEqual([
            'Mango', 'Fig', 'Cherry', 'Date', 'Apple', 'Elder', 'Banana',
        ]);
        const name = paint(bigShop({ shopSort: 'name' }));
        expect(cardNames(name.root)).toEqual([
            'Apple', 'Banana', 'Cherry', 'Date', 'Elder', 'Fig', 'Mango',
        ]);
    });

    it('a-dashed-card-never-wins-cheapest', () => {
        // Banana is the cheapest card, but all its rows are unbuyable: its
        // figure is a dash, and a dash must not outrank a price that can be
        // paid — in either direction.
        const offers = NAMES.map((_, i) =>
            i === 3 ? lot(i, { minAcceptedAtoms: 50n }) : lot(i),
        );
        const tokens = new Map(
            NAMES.map((name, i) => [
                idOf(i),
                { tokenId: idOf(i), name, ticker: '', decimals: 0 } as TokenMeta,
            ]),
        );
        const asc = paint(offersView(offers, tokens, { shopSort: 'price-asc' }));
        expect(cardNames(asc.root).at(-1)).toBe('Banana');
        const desc = paint(offersView(offers, tokens, { shopSort: 'price-desc' }));
        expect(cardNames(desc.root).at(-1)).toBe('Banana');
    });

    it('an explicit sort is one flat run; the curated default keeps sections', () => {
        const sorted = paint(bigShop({ shopSort: 'price-asc' }));
        expect(sorted.root.querySelector('.section-head')).toBeNull();
        const curated = paint(bigShop());
        expect(cardNames(curated.root)).toHaveLength(7);
    });
});

function cssMediaBlock(css: string, query: string): string {
    const start = css.indexOf(query);
    expect(start, query).toBeGreaterThan(-1);
    const open = css.indexOf('{', start);
    let depth = 0;
    for (let i = open; i < css.length; i += 1) {
        const ch = css[i];
        if (ch === '{') {
            depth += 1;
        } else if (ch === '}') {
            depth -= 1;
            if (depth === 0) {
                return css.slice(open + 1, i);
            }
        }
    }
    throw new Error(`unclosed ${query}`);
}

describe('the-print-poster-stays-black-on-white', () => {
    it('keeps .poster-page ground and ink as literals, never theme tokens', () => {
        const css = readFileSync(join(UI_DIR, 'stall.css'), 'utf8').replace(
            /\/\*[\s\S]*?\*\//g,
            '',
        );
        const page = css.match(/\.poster-page\s*\{([^}]+)\}/);
        expect(page, '.poster-page rule').not.toBeNull();
        const body = page![1]!;
        expect(body).toMatch(/background:\s*#ffffff/);
        expect(body).toMatch(/color:\s*#000000/);
        expect(body).not.toMatch(/--s-surface/);
        expect(body).not.toMatch(/--s-text/);

        const print = cssMediaBlock(css, '@media print');
        expect(print).toMatch(/\.poster-chooser[\s\S]*?display:\s*none/);
        expect(print).toMatch(/\.poster-png[\s\S]*?display:\s*none/);
        const printPageRules = [...print.matchAll(/\.poster-page[^{]*\{([^}]+)\}/g)];
        expect(printPageRules.length, 'print rules for .poster-page').toBeGreaterThan(0);
        for (const [, rule] of printPageRules) {
            expect(rule).not.toMatch(/--s-surface/);
            expect(rule).not.toMatch(/--s-text/);
        }
    });
});

describe('the-print-page-is-rule-brand-name-tagline-qr-caption-url', () => {
    /**
     * The printed sheet is exactly this subtree in exactly this order — the
     * print stylesheet shows `.poster-page` and hides everything else, so the
     * node order *is* the page. The accent rule and the brand line lead: a
     * sheet on a wall says what it is before it says whose it is.
     */
    it('paints the accent rule and the brand line above the name', () => {
        const h = handlers();
        const root = document.createElement('div');
        document.body.append(root);
        window.history.pushState({}, '', `/s/${ADDR}`);
        try {
            drivePoster(
                root,
                offersView([OFFER], undefined, {
                    panel: 'studio',
                    stallName: 'Riverside Goods',
                    tagline: 'Fresh weekly',
                }),
                h,
            );
            (root.querySelector('[data-role="open-poster"]') as HTMLButtonElement).click();
            const page = root.querySelector('.poster-page') as HTMLElement;
            expect(page).not.toBeNull();
            expect([...page.children].map((n) => n.getAttribute('class'))).toEqual([
                'poster-rule',
                'poster-brand',
                'poster-name',
                'poster-tagline',
                'qr poster-qr',
                'poster-scan',
                'poster-url',
            ]);
            expect(page.querySelector('.poster-brand')?.textContent).toBe(BROADCAST_BRAND);
            // The rule is a node now, so the page's own border is not the look.
            const css = readFileSync(join(UI_DIR, 'stall.css'), 'utf8').replace(
                /\/\*[\s\S]*?\*\//g,
                '',
            );
            const ruleBody = css.match(/\.poster-rule\s*\{([^}]+)\}/);
            expect(ruleBody, '.poster-rule rule').not.toBeNull();
            expect(ruleBody![1]!).toMatch(/background:\s*var\(--s-accent\)/);
        } finally {
            root.remove();
        }
    });
});

describe('the-stream-card-is-the-rest-state', () => {
    it('is a 2× rest sticker: brand, name, QR, caption — no price, no card, no URL', () => {
        const h = handlers();
        const root = document.createElement('div');
        document.body.append(root);
        window.history.pushState({}, '', `/s/${ADDR}`);
        try {
            drivePoster(
                root,
                offersView([OFFER], undefined, {
                    panel: 'studio',
                    stallName: 'Riverside Goods',
                    tagline: 'Fresh weekly',
                }),
                h,
            );
            const open = root.querySelector('[data-role="open-poster"]') as HTMLButtonElement;
            expect(open.textContent).toBe('Poster & images');
            open.click();
            const sheet = root.querySelector('[data-role="poster"]') as HTMLElement;
            expect(sheet.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe(
                'Poster & images',
            );
            const format = sheet.querySelector(
                '[data-role="poster-format"]',
            ) as HTMLSelectElement;
            expect(format, 'format chooser').not.toBeNull();
            format.value = 'stream';
            format.dispatchEvent(new Event('change'));

            const canvas = root.querySelector(
                '[data-role="poster-png"] canvas',
            ) as HTMLCanvasElement;
            expect(canvas).not.toBeNull();
            expect(canvas.width).toBe(STREAM_CARD_WIDTH);

            const css = readFileSync(join(UI_DIR, 'broadcast.css'), 'utf8').replace(
                /\/\*[\s\S]*?\*\//g,
                '',
            );
            const rules = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)];
            const plate = rules.find(([, sel]) => sel!.trim() === '.stall.broadcast .bc');
            const widthPx = Number(/width:\s*(\d+)px/.exec(plate?.[2] ?? '')?.[1]);
            expect(STREAM_CARD_WIDTH).toBe(widthPx * 2);

            const spec = lastDrawnPosterSpec();
            expect(spec, 'drawPoster was handed a stream spec').toBeDefined();
            /*
             * The whole key set, so a field cannot reach the sticker without
             * somebody widening this list on purpose. Widened once, in the
             * poster port: a border and a ground are not a price, and each of
             * these is dress the card already wore in CSS.
             *   bg          the sheet formats' ground; the card ignores it
             *   accent2     the second rule under the head, when the look has one
             *   border      the plate's 1px edge, a colour or absent
             *   radius      the plate's corners, in pixels, off --s-radius
             *   nameCase    --s-sign-case, applied before the name is wrapped
             *   nameWeight  the poster name's weight, 800 or Rural's 700
             *   qrSide      the QR's reserved square, floored at a third
             */
            const allowed = [
                'kind',
                'width',
                'height',
                'qrSide',
                'bg',
                'surface',
                'text',
                'muted',
                'accent',
                'accent2',
                'border',
                'radius',
                'font',
                'name',
                'nameCase',
                'nameWeight',
                'matrix',
                'nameLines',
                'brand',
                'caption',
            ];
            expect(Object.keys(spec!).sort()).toEqual([...allowed].sort());
            expect(spec!.url).toBeUndefined();
            expect(spec!.tagline).toBeUndefined();
            expect(spec!.brand).toBe(BROADCAST_BRAND);
            expect(spec!.caption).toBe(BROADCAST_CAPTION);
            const texts = (value: unknown): string[] => {
                if (typeof value === 'string') {
                    return [value];
                }
                if (Array.isArray(value)) {
                    return value.flatMap(texts);
                }
                if (value !== null && typeof value === 'object') {
                    return Object.values(value).flatMap(texts);
                }
                return [];
            };
            for (const t of texts(spec)) {
                expect(t).not.toMatch(/\bXEC\b/);
                expect(t).not.toContain(PRICE_FROM);
            }
        } finally {
            root.remove();
        }
    });
});

describe('every-png-format-carries-the-qr-and-the-scan-line', () => {
    it('offers Square, Story and Stream card, each with a canvas, Save PNG, a QR matrix and a scan caption', () => {
        const h = handlers();
        const root = document.createElement('div');
        document.body.append(root);
        window.history.pushState({}, '', `/s/${ADDR}`);
        try {
            drivePoster(
                root,
                offersView([OFFER], undefined, {
                    panel: 'studio',
                    stallName: 'Riverside Goods',
                    tagline: 'Fresh weekly',
                }),
                h,
            );
            (root.querySelector('[data-role="open-poster"]') as HTMLButtonElement).click();
            const chooser = root.querySelector(
                '[data-role="poster-format"]',
            ) as HTMLSelectElement;
            expect([...chooser.options].map((o) => o.value)).toEqual([
                'print',
                'square',
                'story',
                'stream',
            ]);
            for (const kind of ['square', 'story', 'stream'] as const) {
                const format = root.querySelector(
                    '[data-role="poster-format"]',
                ) as HTMLSelectElement;
                format.value = kind;
                format.dispatchEvent(new Event('change'));
                const png = root.querySelector('[data-role="poster-png"]') as HTMLElement;
                const canvas = png.querySelector('canvas') as HTMLCanvasElement;
                expect(canvas, kind).not.toBeNull();
                expect(png.querySelector('[data-role="poster-save"]')?.textContent, kind).toBe(
                    'Save PNG',
                );
                const spec = lastDrawnPosterSpec();
                expect(spec, kind).toBeDefined();
                expect(spec!.kind, kind).toBe(kind);
                expect(canvas.width, kind).toBe(spec!.width);
                expect(canvas.height, kind).toBe(spec!.height);
                expect(spec!.matrix.length, kind).toBeGreaterThan(0);
                expect(spec!.caption, kind).toMatch(/scan/i);
                if (kind === 'square') {
                    expect(canvas.width).toBe(SQUARE_SIZE.width);
                    expect(canvas.height).toBe(SQUARE_SIZE.height);
                } else if (kind === 'story') {
                    expect(canvas.width).toBe(STORY_SIZE.width);
                    expect(canvas.height).toBe(STORY_SIZE.height);
                } else {
                    expect(canvas.width).toBe(STREAM_CARD_WIDTH);
                }
            }
        } finally {
            root.remove();
        }
    });
});

describe('a-poster-button-needs-an-address', () => {
    /**
     * The launcher used to gate only on `fitsQr`. The sheet itself also
     * requires an address, so a pubkey view with none would set overlay to
     * poster and paint no scrim — `livePaint` then waits forever. Same
     * address predicate as the publish launcher's `canPublish`.
     */
    it('does not paint the launcher when the view has no address', () => {
        const root = document.createElement('div');
        document.body.append(root);
        window.history.pushState({}, '', `/s/${ADDR}`);
        try {
            renderStall(
                root,
                offersView([OFFER], undefined, {
                    panel: 'studio',
                    address: undefined,
                }),
                handlers(),
            );
            expect(root.querySelector('[data-role="open-poster"]')).toBeNull();
        } finally {
            root.remove();
        }
    });

    it('paints the launcher when the view has an address', () => {
        const root = document.createElement('div');
        document.body.append(root);
        window.history.pushState({}, '', `/s/${ADDR}`);
        try {
            renderStall(
                root,
                offersView([OFFER], undefined, { panel: 'studio' }),
                handlers(),
            );
            expect(root.querySelector('[data-role="open-poster"]')).not.toBeNull();
        } finally {
            root.remove();
        }
    });
});

describe('the-poster-is-painted-from-the-overlay-state', () => {
    it('a view with overlay poster story paints the sheet on Story with no click', () => {
        const h = handlers();
        const root = document.createElement('div');
        document.body.append(root);
        window.history.pushState({}, '', `/s/${ADDR}`);
        try {
            renderStall(
                root,
                offersView([OFFER], undefined, {
                    panel: 'studio',
                    stallName: 'Riverside Goods',
                    tagline: 'Fresh weekly',
                    overlay: { kind: 'poster', format: 'story' },
                }),
                h,
            );
            const sheet = root.querySelector('[data-role="poster"]') as HTMLElement;
            expect(sheet, 'the sheet mounts from the view, not from a click').not.toBeNull();
            const format = sheet.querySelector(
                '[data-role="poster-format"]',
            ) as HTMLSelectElement;
            expect(format.value).toBe('story');
            expect(sheet.querySelector('[role="dialog"]')?.getAttribute('data-format')).toBe(
                'story',
            );
            expect(sheet.querySelector('[data-role="poster-png"] canvas')).not.toBeNull();
            expect(h.onOpenPoster).not.toHaveBeenCalled();
        } finally {
            root.remove();
        }
    });
});

describe('the-printed-poster-outweighs-the-hidden-app', () => {
    /**
     * The print stylesheet hides `#app *` and shows the poster subtree — and
     * a show rule without the id loses that specificity contest, which
     * printed a blank page (measured under emulated print media, not
     * deduced). happy-dom does not cascade, so this reads the stylesheet:
     * the hide rule and the id-bearing show rule must travel together.
     */
    it('keeps the id on the show rule that must outrank the hide rule', () => {
        const css = readFileSync(join(UI_DIR, 'stall.css'), 'utf8');
        const print = css.match(/@media print\s*\{([\s\S]+?)\n\}/);
        expect(print, 'no @media print block at all').not.toBeNull();
        const block = print![1]!;
        expect(block).toContain('#app *');
        expect(block).toMatch(/#app \.poster-page,\s*[^{]*#app \.poster-page \*/);
    });
});

describe('an-announcement-is-the-sellers-words-led-first', () => {
    it('paints the notice above the shelves, labelled as theirs', () => {
        const { root } = paint(
            offersView([OFFER], undefined, { announcement: 'Back on the 10th' }),
        );
        const notice = root.querySelector('[data-role="announcement"]') as HTMLElement;
        expect(notice).not.toBeNull();
        expect(notice.querySelector('.notice-text')?.textContent).toBe('Back on the 10th');
        // Whose words these are, said on the chip — and never a status word:
        // the wire carries a sentence, not an away-flag.
        expect(notice.querySelector('.notice-chip')?.textContent).toBe(
            copy.ANNOUNCEMENT_CHIP,
        );
        // Before the first card: the notice is what "back Monday" exists for.
        const body = root.querySelector('.stall-body')!;
        expect(body.firstElementChild).toBe(notice);
    });

    it('paints it on the empty shop too, where it is most of the answer', () => {
        const { root } = paint(
            idlePubkey({ fetch: { kind: 'empty' }, announcement: 'Away until Monday' }),
        );
        expect(
            root.querySelector('[data-role="announcement"] .notice-text')?.textContent,
        ).toBe('Away until Monday');
    });

    it('paints nothing without one — no empty frame, no empty chip', () => {
        const { root } = paint(offersView([OFFER]));
        expect(root.querySelector('[data-role="announcement"]')).toBeNull();
    });
});

describe('a-shelf-is-the-sellers-own-heading', () => {
    const TEA_ID = OTHER_TOKEN;
    const twoTokens = () =>
        offersView(
            [OFFER, { ...OFFER, outpoint: { txid: 'ef'.repeat(32), outIdx: 9 }, tokenId: TEA_ID }],
            new Map([
                [TOKEN_ID, BEANS],
                [TEA_ID, TEA],
            ]),
            { shelves: new Map([[TOKEN_ID, 'Morning roast']]) },
        );

    it('groups shelved tokens under the heading and keeps the rest on ours', () => {
        const { root } = paint(twoTokens());
        const shelf = root.querySelector('[data-role="shelf"]') as HTMLElement;
        expect(shelf).not.toBeNull();
        expect(shelf.querySelector('.collection-name')?.textContent).toBe('Morning roast');
        expect(shelf.querySelector('.collection-count')?.textContent).toBe(
            itemsForSale(1),
        );
        // The shelved card sits in the run right after its heading; the
        // unshelved token still paints, outside it.
        const names = [...root.querySelectorAll('.item-n')].map((n) => n.textContent);
        expect(names[0]).toBe('Roasted Beans');
        expect(names).toContain('Green Tea');
        // A heading carries a count and no price (§8).
        expect(shelf.querySelector('[data-role="price"]')).toBeNull();
    });

    it('an explicit sort flattens shelves exactly as it flattens sections', () => {
        const view = twoTokens();
        // Big-shop threshold does not apply here; force the sort directly.
        const { root } = paint({ ...view, shopSort: 'price-asc' });
        // Below the tools threshold the sort stays curated, shelves stand.
        expect(root.querySelector('[data-role="shelf"]')).not.toBeNull();
    });
});

describe('the-editor-shares-one-meter-between-text-and-shelf', () => {
    const sheet = (over: Partial<StallView> = {}) =>
        paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                tokens: new Map([[TOKEN_ID, BEANS]]),
                overlay: { kind: 'describe' },
                stallName: 'Riverside Goods',
                ...over,
            }),
        );

    it('publishes a shelf beside the words, and a shelf alone', () => {
        const { root } = sheet();
        const field = root.querySelector('[data-role="describe-text"]') as HTMLTextAreaElement;
        const shelfField = root.querySelector('[data-role="describe-shelf"]') as HTMLInputElement;
        const hex = root.querySelector('[data-role="describe-hex"]') as HTMLElement;

        field.value = 'Roasted weekly.';
        shelfField.value = 'Coffee';
        shelfField.dispatchEvent(new Event('input'));
        expect(hex.hidden).toBe(false);
        expect(hex.textContent).toBe(
            encodeDescriptionHex(TOKEN_ID, 'Roasted weekly.', { shelf: 'Coffee' }),
        );

        // A shelf with no words is a record too — the tombstone shape plus
        // the tag — so the links stay live rather than demanding a sentence.
        field.value = '';
        field.dispatchEvent(new Event('input'));
        expect(hex.hidden).toBe(false);
        expect(hex.textContent).toBe(
            encodeDescriptionHex(TOKEN_ID, '', { shelf: 'Coffee' }),
        );
    });

    it('one meter, and the budget refusal names the shared record', () => {
        const { root } = sheet();
        const field = root.querySelector('[data-role="describe-text"]') as HTMLTextAreaElement;
        const shelfField = root.querySelector('[data-role="describe-shelf"]') as HTMLInputElement;
        // Amended 2026-09-04: one node, `describe-summary`, says the size —
        // the count moved onto the "Publishes:" line beside the fields it is
        // counting. The rule (one meter, one shared budget) is unchanged.
        const counter = root.querySelector('[data-role="describe-summary"]') as HTMLElement;
        const err = root.querySelector('[data-role="describe-invalid"]') as HTMLElement;

        field.value = 'D'.repeat(MAX_DESCRIPTION_BYTES);
        shelfField.value = 'K';
        shelfField.dispatchEvent(new Event('input'));
        // 180 bytes of text and any shelf overflow one record: the meter
        // reads over 222 and the error names the shared budget, not the text.
        expect(counter.textContent).toContain(`of ${OP_RETURN_BUDGET} bytes`);
        expect(err.hidden).toBe(false);
        expect(err.textContent).toBe(copy.DESC_OVER_BUDGET);

        // An illegible shelf is its own refusal, named as the shelf's.
        field.value = 'Fine words.';
        shelfField.value = 'S​helf';
        shelfField.dispatchEvent(new Event('input'));
        expect(err.hidden).toBe(false);
        expect(err.textContent).toBe(copy.DESC_SHELF_REFUSED);
    });

    it('prefills the shelf per token and offers removal over a bare shelf', () => {
        const { root } = sheet({ shelves: new Map([[TOKEN_ID, 'Coffee']]) });
        const shelfField = root.querySelector('[data-role="describe-shelf"]') as HTMLInputElement;
        expect(shelfField.value).toBe('Coffee');
        // A shelf with no words is still something to remove: one removal
        // record erases the whole document for this token.
        const remove = root.querySelector('[data-role="describe-remove"]') as HTMLElement;
        expect(remove.hidden).toBe(false);
    });
});

describe('the-publish-sheet-carries-the-announcement', () => {
    it('encodes the typed sentence into the record and prefills from the view', () => {
        const { root } = paint(
            offersView([OFFER], undefined, {
                overlay: { kind: 'publish-name' },
                stallName: 'Riverside Goods',
                announcement: 'Back on the 10th',
            }),
        );
        const input = root.querySelector('[data-role="publish-announcement"]') as HTMLInputElement;
        expect(input.value).toBe('Back on the 10th');
        const hex = root.querySelector('[data-role="publish-hex"]') as HTMLElement;
        expect(hex.textContent).toBe(
            encodeManifestHex('Riverside Goods', DEFAULT_THEME_ID, 0, {
                announcement: 'Back on the 10th',
            }),
        );
        // And the refusal is named as the announcement's, not the tagline's.
        input.value = 'A'.repeat(65);
        input.dispatchEvent(new Event('input'));
        const err = root.querySelector('[data-role="publish-invalid"]') as HTMLElement;
        expect(err.hidden).toBe(false);
        expect(err.textContent).toBe(copy.PUBLISH_ANNOUNCEMENT_INVALID);
    });
});

describe('a-long-price-steps-down-before-it-moves-rows', () => {
    /**
     * The cut points are the contract between render and the tier rules in
     * the theme sheets: the probe's name-floor rule holds them true against
     * real layout, and this pins them against a casual re-tune. `from`
     * rides the figure's line, so it counts (as two characters), and the
     * ceilings are the look's own — Rural's tag chrome seats one fewer.
     */
    const MODERN = tierCharCeilings(DEFAULT_THEME_ID);
    const RURAL = tierCharCeilings(RURAL_THEME_ID);

    it('walks the ladder in order and only concedes the row at the end', () => {
        expect(priceTier('1,200', false, MODERN)).toBe(0);
        // The everyday partial: from + four figures stays at design size.
        expect(priceTier('1,200', true, MODERN)).toBe(0);
        expect(priceTier('1,000.01', false, MODERN)).toBe(1);
        expect(priceTier('99,999.99', false, MODERN)).toBe(1);
        expect(priceTier('99,999.99', true, MODERN)).toBe(2);
        // The measured live defect: one letter of name per line.
        expect(priceTier('100,000,000', false, MODERN)).toBe(2);
        expect(priceTier('100,000,000', true, MODERN)).toBe(3);
        expect(priceTier('999,999,999,999.99', false, MODERN)).toBe(3);
    });

    it('rural tiers the everyday partial its chrome cannot seat', () => {
        // Measured in the gallery at 390px: `from 1,200` at Rural's design
        // size left the name column 59px; one tier down it breathes.
        expect(priceTier('1,200', true, RURAL)).toBe(1);
        expect(priceTier('1,200', false, RURAL)).toBe(0);
    });
});

describe('the-head-wears-the-tier-the-figure-earned', () => {
    // Its own token: a second offer of BEANS would fold into one grouped
    // card speaking for the cheapest ask, and the long figure would vanish.
    const LONG_ID = '99'.repeat(32);
    const LONG_META: TokenMeta = {
        tokenId: LONG_ID,
        name: 'Harvest Ledger',
        ticker: 'HRVT',
        decimals: 0,
        tokenType: { protocol: 'SLP', type: 'SLP_TOKEN_TYPE_FUNGIBLE' },
    };
    const longOffer = (over: Partial<StallOffer>): StallOffer => ({
        ...OFFER,
        tokenId: LONG_ID,
        // 10^10 sats = 100,000,000 XEC — the live screenshot's figure.
        askedSats: 10_000_000_000n,
        ...over,
    });

    it('stamps data-price-tier on the head, and only when earned', () => {
        const { root } = paint(
            idlePubkey({
                tokens: new Map([
                    [TOKEN_ID, BEANS],
                    [LONG_ID, LONG_META],
                ]),
                fetch: {
                    kind: 'offers',
                    offers: [
                        OFFER,
                        longOffer({ outpoint: { txid: 'ab'.repeat(32), outIdx: 1 } }),
                    ],
                },
            }),
        );
        const plain = root.querySelector(`[data-focus-key="offer:${'ab'.repeat(32)}:0"]`)!;
        const long = root.querySelector(`[data-focus-key="offer:${'ab'.repeat(32)}:1"]`)!;
        // "1,200" with from: everyday, no attribute at all.
        expect(plain.hasAttribute('data-price-tier')).toBe(false);
        // "100,000,000" with from: past every legible size — its own row.
        expect(long.getAttribute('data-price-tier')).toBe('3');
    });

    it('a whole-lot ask of the same figure steps down instead', () => {
        const { root } = paint(
            idlePubkey({
                tokens: new Map([[LONG_ID, LONG_META]]),
                fetch: {
                    kind: 'offers',
                    // askedAtoms == atoms: no `from`, two characters shorter.
                    offers: [longOffer({ askedAtoms: 12n })],
                },
            }),
        );
        const head = root.querySelector('.item-head')!;
        expect(head.getAttribute('data-price-tier')).toBe('2');
    });
});

describe('every-shipped-look-sizes-every-price-tier', () => {
    /**
     * The tier sizes live in each theme sheet, next to that look's own
     * `.item-x` literal — the emitted `--s-price-size` is shadowed by all
     * three looks (the audit's PARTIAL table), so a base ladder on the var
     * would be a 0.2px change on Rural. The cost of per-look rules is that
     * a look can silently forget one and paint the full-size figure into a
     * tier-2 column; this is what notices.
     */
    const LOOKS = ['modern', 'neo', 'rural'] as const;

    it.each(LOOKS)('theme-%s sizes tiers 1, 2 and 3', (look) => {
        const css = readFileSync(join(UI_DIR, `theme-${look}.css`), 'utf8')
            .replace(/\/\*[\s\S]*?\*\//g, '')
            // Unwrap at-rule blocks: the tier rules live inside the phone
            // media query, and a flat rule scan must not glue the first
            // selector inside a block onto the block's own prelude.
            .replace(/@media[^{]*\{/g, '');
        const rules = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)];
        for (const tier of ['1', '2', '3']) {
            const sized = rules.some(
                ([, selector, body]) =>
                    selector!.includes(`.t-${look}`) &&
                    selector!.includes(`[data-price-tier='${tier}']`) &&
                    selector!.includes('.item-x') &&
                    body!.includes('font-size'),
            );
            expect(sized, `theme-${look}.css sizes tier ${tier}`).toBe(true);
        }
    });
});

describe('a-full-door-scrolls-its-pins-not-the-page', () => {
    /**
     * Twelve pins is the cap and over half a phone screen of rows: the
     * panel owns the scrolling (owner's call, 2026-08-30). happy-dom does
     * not lay out, so this reads the stylesheet — the door probe measures
     * the real thing at the full twelve.
     */
    it('bounds the pinned list and lets it scroll its own rows', () => {
        const css = readFileSync(join(UI_DIR, 'stall.css'), 'utf8').replace(
            /\/\*[\s\S]*?\*\//g,
            '',
        );
        const rule = css.match(/\.door \.pinned-list\s*\{([^}]+)\}/);
        expect(rule, 'the door styles its pinned list').not.toBeNull();
        expect(rule![1]).toMatch(/max-height:\s*\d+px/);
        expect(rule![1]).toMatch(/overflow-y:\s*auto/);
    });
});

const BROADCAST: BroadcastParams = {
    preset: 'corner',
    mode: 'rail',
    transparent: false,
    cards: 'listings',
};

function broadcastView(over: Partial<StallView> = {}): StallView {
    return idlePubkey({
        fetch: { kind: 'offers', offers: [OFFER] },
        tokens: new Map([[TOKEN_ID, BEANS]]),
        broadcast: BROADCAST,
        broadcastState: 'live',
        ...over,
    });
}

function qrPathOf(text: string): string {
    const matrix = qrMatrix(text);
    const quiet = 4;
    let d = '';
    for (let r = 0; r < matrix.length; r += 1) {
        for (let c = 0; c < matrix.length; c += 1) {
            if (matrix[r]![c]) {
                d += `M${c + quiet} ${r + quiet}h1v1h-1z`;
            }
        }
    }
    return d;
}

function shopQrHref(identity: string): string {
    return `${location.origin}${stallPath(identity)}`;
}

function assertNoShopChrome(root: HTMLElement): void {
    expect(root.querySelector('.tabs'), 'no tab bar').toBeNull();
    expect(root.querySelector('.orn'), 'no ornament strip').toBeNull();
    expect(root.querySelector('[data-role="sheet-scrim"]'), 'no sheet scrim').toBeNull();
    expect(root.querySelector('.stall-foot'), 'no footer').toBeNull();
    expect(root.querySelector('[data-role="publish"]'), 'no publish mount').toBeNull();
}

describe('a-broadcast-url-never-paints-the-shop-chrome', () => {
    /**
     * The overlay is a second render path on the same route. Tabs, the
     * ornament, the publish sheet and the footer are shop chrome: a
     * streamer who pointed OBS at this URL must never capture them, on
     * the opening frame or after the book lands.
     */
    const hosts = [{ host: 'chronik-native1.fabien.cash', result: 'timeout' as const }];

    const screens: { name: string; view: StallView }[] = [
        {
            name: 'opening',
            view: idlePubkey({ broadcast: BROADCAST, fetch: { kind: 'opening' } }),
        },
        {
            name: 'unresolvable',
            view: {
                route: { kind: 'unresolvable', address: ADDR },
                overlay: { kind: 'idle' },
                tokens: new Map(),
                address: ADDR,
                broadcast: BROADCAST,
            },
        },
        {
            name: 'unresolved',
            view: {
                route: { kind: 'unresolved', address: ADDR },
                overlay: { kind: 'idle' },
                tokens: new Map(),
                address: ADDR,
                broadcast: BROADCAST,
            },
        },
        { name: 'pubkey/offers', view: broadcastView() },
        {
            name: 'pubkey/empty',
            view: idlePubkey({ broadcast: BROADCAST, fetch: { kind: 'empty' } }),
        },
        {
            name: 'pubkey/unreadable',
            view: idlePubkey({
                broadcast: BROADCAST,
                fetch: { kind: 'unreadable', triedAtMs: 0, returned: 1 },
            }),
        },
        {
            name: 'pubkey/unreachable',
            view: idlePubkey({
                broadcast: BROADCAST,
                fetch: { kind: 'unreachable', triedAtMs: 0, hosts },
            }),
        },
        {
            name: 'pubkey/plugin-missing',
            view: idlePubkey({
                broadcast: BROADCAST,
                fetch: {
                    kind: 'plugin-missing',
                    triedAtMs: 0,
                    hosts: [{ host: 'chronik-native1.fabien.cash', result: 'plugin-missing' }],
                },
            }),
        },
    ];

    it.each(screens)('$name has no shop chrome', ({ view }) => {
        const { root } = paint(view);
        expect(root.querySelector('.stall')?.classList.contains('broadcast')).toBe(true);
        expect(root.querySelector('[data-role="broadcast"]')).not.toBeNull();
        assertNoShopChrome(root);
    });

    it('a publish overlay still does not mount', () => {
        const { root } = paint(broadcastView({ overlay: { kind: 'publish-name' } }));
        assertNoShopChrome(root);
    });

    it('Neo ships no ornament strip on the overlay', () => {
        const { root } = paint(
            broadcastView({ theme: decodeTheme(NEO_CITY_THEME_ID) }),
        );
        expect(root.querySelector('.orn')).toBeNull();
        expect(root.querySelector('.stall')?.classList.contains('t-neo')).toBe(true);
    });

    it('a transparent overlay clears the inline html colour and the meta', () => {
        const meta = document.createElement('meta');
        meta.setAttribute('name', 'theme-color');
        document.head.append(meta);
        try {
            const painted = paint(
                broadcastView({
                    broadcast: { ...BROADCAST, transparent: true },
                }),
            );
            const html = document.documentElement;
            expect(html.classList.contains('bc-clear')).toBe(true);
            expect(html.style.backgroundColor, 'inline colour cannot beat the sheet').toBe(
                '',
            );
            expect(meta.getAttribute('content')).toBe('');
            expect(painted.root.querySelector('.stall')?.classList.contains('bc-clear')).toBe(
                true,
            );

            paint(offersView([OFFER]));
            expect(html.classList.contains('bc-clear')).toBe(false);
            expect(html.style.backgroundColor).not.toBe('');
            expect(meta.getAttribute('content')).not.toBe('');
        } finally {
            meta.remove();
            document.documentElement.classList.remove('bc-clear');
            document.documentElement.style.backgroundColor = '';
        }
    });
});

describe('a-broadcast-url-with-an-unreadable-seller-still-says-so', () => {
    /**
     * A streamer who typed a wrong seller needs to read that in the OBS
     * preview. There is no stall to overlay, so `invalid` keeps its
     * ordinary screen.
     */
    it('paints the unreadable screen, not the overlay', () => {
        const { root } = paint({
            route: { kind: 'invalid', raw: 'not-a-seller' },
            overlay: { kind: 'idle' },
            tokens: new Map(),
            broadcast: BROADCAST,
        });
        expect(root.querySelector('[data-role="broadcast"]')).toBeNull();
        expect(root.querySelector('.stall')?.classList.contains('broadcast')).toBe(
            false,
        );
        expect(root.textContent).toContain(LINK_UNREADABLE_TITLE);
        expect(root.textContent).toContain('not-a-seller');
    });

    it('a script address still says it cannot be a stall', () => {
        const { root } = paint({
            route: { kind: 'invalid', raw: 'ecash:p...', why: 'script-address' },
            overlay: { kind: 'idle' },
            tokens: new Map(),
            broadcast: BROADCAST,
        });
        expect(root.querySelector('[data-role="broadcast"]')).toBeNull();
        expect(root.textContent).toContain(copy.SCRIPT_ADDRESS_TITLE);
    });
});

const BROADCAST_NO_CONTROLS =
    'button, a, input, select, textarea, summary, details, label, [tabindex], [contenteditable], [role="button"]';

describe('a-broadcast-carries-no-controls', () => {
    /**
     * The overlay is watched, never used. A button, a link or a field is
     * a control a viewer cannot click, and the QR is the only path off
     * the frame — to the shop, never back into the overlay.
     */
    it('has no interactive element, and the QR is the shop without a query', () => {
        const before = window.location.href;
        window.history.replaceState(
            {},
            '',
            `${stallPath(ADDR)}?view=broadcast&bg=transparent`,
        );
        try {
            const { root } = paint(
                broadcastView({
                    broadcast: { ...BROADCAST, transparent: true },
                }),
            );
            expect(root.querySelectorAll(BROADCAST_NO_CONTROLS)).toHaveLength(0);
            expect(root.querySelector('[data-role="retry"]')).toBeNull();
            const qr = root.querySelector('svg.qr');
            expect(qr, 'the code is a qr node').not.toBeNull();
            expect(qr!.getAttribute('data-role')).toBe('qr');
            const shop = shopQrHref(ADDR);
            expect(shop).not.toContain('?');
            expect(qr!.querySelector('path')?.getAttribute('d')).toBe(qrPathOf(shop));
            const overlayUrl = `${location.origin}${location.pathname}${location.search}`;
            expect(overlayUrl).toContain('view=broadcast');
            expect(qr!.querySelector('path')?.getAttribute('d')).not.toBe(
                qrPathOf(overlayUrl),
            );
        } finally {
            window.history.replaceState({}, '', before);
        }
    });

    it('a pubkey-route overlay still QRs the address shop with no query', () => {
        const before = window.location.href;
        window.history.replaceState({}, '', `${stallPath(PK)}?view=broadcast`);
        try {
            const { root } = paint(broadcastView());
            expect(root.querySelectorAll(BROADCAST_NO_CONTROLS)).toHaveLength(0);
            expect(location.pathname).toBe(stallPath(PK));
            const shop = shopQrHref(ADDR);
            expect(shop).not.toContain('?');
            expect(shop).not.toContain(PK);
            const qr = root.querySelector('svg.qr');
            expect(qr, 'the code is a qr node').not.toBeNull();
            expect(qr!.querySelector('path')?.getAttribute('d')).toBe(qrPathOf(shop));
        } finally {
            window.history.replaceState({}, '', before);
        }
    });

    it('the broadcast module never reaches the parser', () => {
        const src = readFileSync(join(UI_DIR, 'broadcast.ts'), 'utf8');
        expect(src).not.toMatch(/\binnerHTML\b/);
        expect(src).not.toMatch(/\binsertAdjacentHTML\b/);
        expect(src).not.toMatch(/\bcssText\b/);
        expect(src).not.toMatch(/url\s*\(/);
    });
});

describe('a-broadcast-shows-the-shops-first-card', () => {
    /**
     * The card is the shop's own first card: shelves first, then the
     * same section order `paintOffers` walks. Token-id order alone would
     * show Tea here.
     */
    const teaOffer: StallOffer = {
        ...OFFER,
        outpoint: { txid: 'ef'.repeat(32), outIdx: 9 },
        tokenId: OTHER_TOKEN,
    };
    const two = (
        over: Partial<StallView> = {},
    ): StallView =>
        idlePubkey({
            fetch: { kind: 'offers', offers: [OFFER, teaOffer] },
            tokens: new Map([
                [TOKEN_ID, BEANS],
                [OTHER_TOKEN, TEA],
            ]),
            shelves: new Map([[TOKEN_ID, 'Morning roast']]),
            ...over,
        });

    it('the overlay names the same first card the shop does', () => {
        const shop = paint(two());
        const shopFirst = shop.root.querySelector('.item-n')?.textContent;
        expect(shopFirst).toBe('Roasted Beans');

        const { root } = paint(two({ broadcast: BROADCAST, broadcastState: 'live' }));
        expect(root.querySelector('.bc-nm')?.textContent).toBe(shopFirst);
        expect(root.querySelector('.bc-more')?.textContent).toBe(copy.broadcastMore(1));
    });
});

describe('broadcast-stock-is-omitted-without-decimals', () => {
    /**
     * `decimalsOf` defaults to 0 and `formatAtoms` at 0 prints atoms
     * verbatim. A token whose genesis has not landed must not say
     * "12 left" for one token. Same footgun as
     * `unknown-decimals-is-not-a-stock-count`.
     */
    it('prints no stock count when genesis decimals did not load', () => {
        const { root } = paint(
            idlePubkey({
                broadcast: BROADCAST,
                broadcastState: 'live',
                fetch: { kind: 'offers', offers: [OFFER] },
                tokens: new Map(),
            }),
        );
        expect(root.querySelector('[data-role="broadcast"]'), 'the overlay is up').not.toBeNull();
        expect(root.querySelector('.bc-item'), 'the card is shown').not.toBeNull();
        expect(root.textContent ?? '').not.toMatch(/\d[\d,]* left/);
        expect(root.querySelector('.bc-tk')?.textContent ?? '').not.toContain('left');
    });
});

describe('a-partial-on-the-overlay-still-says-from', () => {
    it('keeps PRICE_FROM when the take is smaller than the lot', () => {
        const { root } = paint(broadcastView());
        const from = root.querySelector('.bc-from');
        expect(from, 'a partial still says from').not.toBeNull();
        expect(from!.textContent).toBe(PRICE_FROM);
        expect(root.querySelector('[data-role="price"]')?.textContent).toBe('1,200');
    });
});

describe('a-full-lot-on-the-overlay-does-not-say-from', () => {
    it('omits PRICE_FROM when the take is the whole lot', () => {
        const full: StallOffer = { ...OFFER, askedAtoms: OFFER.atoms };
        const { root } = paint(
            broadcastView({ fetch: { kind: 'offers', offers: [full] } }),
        );
        expect(root.querySelector('.bc-from')).toBeNull();
        expect(root.textContent).not.toContain(PRICE_FROM);
        expect(root.querySelector('[data-role="price"]')?.textContent).toBe('1,200');
    });
});

describe('an-unbuyable-card-on-the-overlay-says-why', () => {
    /**
     * A dash with no why is not honest. The shop already names the
     * stranded remainder; the overlay must too.
     */
    it('prints the badge beside the dash', () => {
        const stranded: StallOffer = {
            ...OFFER,
            atoms: 3n,
            askedAtoms: 10n,
            minAcceptedAtoms: 10n,
        };
        const { root } = paint(
            broadcastView({ fetch: { kind: 'offers', offers: [stranded] } }),
        );
        const priceRow = root.querySelector('.bc-p');
        expect(priceRow, 'the price row is on the card').not.toBeNull();
        expect(root.querySelector('[data-role="price"]')?.textContent).toBe(
            DASHED_PRICE,
        );
        expect(priceRow!.textContent).toContain(UNBUYABLE_BADGE);
    });
});

describe('a-broadcast-never-prints-our-failure', () => {
    /**
     * Our failure is never the seller's shop, in the one place a viewer
     * cannot click retry. Empty is the seller's fact and may speak;
     * unreachable is ours and must not.
     */
    function assertSilentFailure(root: HTMLElement): void {
        const text = root.textContent ?? '';
        expect(text).not.toContain(UNREACHABLE_BODY);
        expect(text).not.toContain(UNREADABLE_BODY);
        expect(text).not.toContain(TRY_AGAIN);
        expect(text).not.toContain(OPENING_BODY);
        expect(text).not.toContain(SETTINGS_UNREADABLE);
        expect(root.querySelector('.hosts')).toBeNull();
        expect(root.querySelector('[data-role="broadcast"]')).not.toBeNull();
    }

    it('the unreachable copy is absent on unreachable, and the empty line is only on empty', () => {
        const unreachable = paint(
            idlePubkey({
                broadcast: BROADCAST,
                fetch: {
                    kind: 'unreachable',
                    triedAtMs: 0,
                    hosts: [{ host: 'chronik-native1.fabien.cash', result: 'timeout' }],
                },
            }),
        );
        assertSilentFailure(unreachable.root);
        expect(unreachable.root.textContent).not.toContain(copy.BROADCAST_EMPTY);

        const empty = paint(idlePubkey({ broadcast: BROADCAST, fetch: { kind: 'empty' } }));
        expect(empty.root.textContent).toContain(copy.BROADCAST_EMPTY);
        expect(empty.root.textContent).not.toContain(UNREACHABLE_BODY);
        expect(empty.root.querySelector('.hosts')).toBeNull();
        expect(empty.root.textContent).not.toContain(TRY_AGAIN);

        const plugin = paint(
            idlePubkey({
                broadcast: BROADCAST,
                fetch: {
                    kind: 'plugin-missing',
                    triedAtMs: 0,
                    hosts: [{ host: 'chronik-native1.fabien.cash', result: 'plugin-missing' }],
                },
            }),
        );
        assertSilentFailure(plugin.root);
        expect(plugin.root.textContent).not.toContain(copy.BROADCAST_EMPTY);

        const unreadable = paint(
            idlePubkey({
                broadcast: BROADCAST,
                fetch: { kind: 'unreadable', triedAtMs: 0, returned: 3 },
            }),
        );
        assertSilentFailure(unreadable.root);
        expect(unreadable.root.textContent).not.toContain(copy.BROADCAST_EMPTY);
    });
});

describe('a-carousel-step-is-not-a-price-change', () => {
    /**
     * Two motions, two meanings. A carousel step fades the card in.
     * A price pulse fires only when the shown asked amount moved.
     */
    it('a step fades the card and does not pulse the price', () => {
        const { root } = paint(broadcastView({ broadcastStepped: true }));
        expect(root.querySelector('.bc-ext')?.classList.contains('in')).toBe(true);
        expect(root.querySelector('[data-role="price"]')?.classList.contains('pulse')).toBe(
            false,
        );
    });

    it('a price move pulses the figure and does not fade the card', () => {
        const { root } = paint(broadcastView({ broadcastPulse: true }));
        expect(root.querySelector('[data-role="price"]')?.classList.contains('pulse')).toBe(
            true,
        );
        expect(root.querySelector('.bc-ext')?.classList.contains('in')).toBe(false);
    });
});

describe('a-resting-card-mounts-no-price', () => {
    /**
     * Rail mode shows the name alone for three seconds of every eight.
     * Mounting the card and hiding it with `display: none` left a
     * `[data-role="price"]` with no box — the shape the covered-amount
     * rule exists to refuse. Rest does not mount `.bc-ext` at all, as the
     * rail preset already does.
     */
    it('mounts no card and no price on rest, and still mounts both when live', () => {
        const rest = paint(broadcastView({ broadcastState: 'rest' })).root;
        expect(rest.querySelector('[data-role="broadcast"]')?.getAttribute('data-state')).toBe(
            'rest',
        );
        expect(rest.querySelector('.bc-ext'), 'rest mounts no card').toBeNull();
        expect(rest.querySelector('[data-role="price"]'), 'rest mounts no price').toBeNull();

        const live = paint(broadcastView({ broadcastState: 'live' })).root;
        expect(live.querySelector('.bc-ext'), 'live still mounts the card').not.toBeNull();
        expect(
            live.querySelector('[data-role="price"]'),
            'live still mounts the price',
        ).not.toBeNull();
    });

    // The quote card is the same slot wearing the other rail's figure, so the
    // rule is the same one: a resting overlay mounts no money at all.
    it('mounts no quote figure on rest either', () => {
        const rest = paint(quoteCardView({ broadcastState: 'rest' })).root;
        expect(rest.querySelector('.bc-ext'), 'rest mounts no card').toBeNull();
        expect(
            rest.querySelector('[data-role="seller-price"]'),
            'rest mounts no quote',
        ).toBeNull();

        const live = paint(quoteCardView()).root;
        expect(
            live.querySelector('[data-role="seller-price"]'),
            'live still mounts the quote',
        ).not.toBeNull();
    });
});

/** A USD quote on the listed token, and the overlay switched to the quotes. */
const USD_QUOTE = { code: 'usd', exponent: 2, amount: 500n } as const;

function quoteCardView(over: Partial<StallView> = {}): StallView {
    return broadcastView({
        broadcast: { ...BROADCAST, mode: 'fixed', cards: 'quotes' },
        prices: new Map([[TOKEN_ID, USD_QUOTE]]),
        ...over,
    });
}

describe('a-quote-card-carries-the-landing-link-not-a-wallet-uri', () => {
    /**
     * The code on a quote card opens **this page at that item**, never a
     * wallet. A raw BIP21 would drop whoever scanned it into a wallet holding
     * an amount and a hex memo nobody explained to them; the landing link
     * opens the page that explains it, with the Pay control on it, and carries
     * no amount to go stale.
     *
     * Read from a location that carries the broadcast params, because the base
     * is origin + pathname with the **search dropped**: the share link keeps
     * the search, and keeping it here would encode `…&cards=quotes?pay=…` —
     * a code that opens the overlay it was scanned from.
     */
    it('encodes this page at the item, with no ecash: and no amount', () => {
        const before = window.location.href;
        window.history.replaceState(
            {},
            '',
            `${stallPath(ADDR)}?view=broadcast&cards=quotes&mode=fixed`,
        );
        try {
            const { root } = paint(quoteCardView());
            const landing = payLandingUrl(stallBaseUrl(), TOKEN_ID);
            expect(landing).toBeDefined();
            expect(landing!.startsWith(`${location.origin}${stallPath(ADDR)}?pay=`)).toBe(
                true,
            );
            expect(landing).not.toContain('ecash:');
            expect(landing).not.toContain('amount=');
            expect(landing).not.toContain('view=broadcast');
            expect(landing).not.toContain('cards=quotes');

            const qr = root.querySelector('svg.qr');
            expect(qr, 'the card still carries one code').not.toBeNull();
            expect(qr!.getAttribute('data-role')).toBe('qr');
            expect(qr!.querySelector('path')?.getAttribute('d')).toBe(qrPathOf(landing!));
            // One code, not two: the landing link replaces the stall link
            // while the card is up.
            expect(root.querySelectorAll('svg.qr')).toHaveLength(1);
            expect(qr!.querySelector('path')?.getAttribute('d')).not.toBe(
                qrPathOf(shopQrHref(ADDR)),
            );
        } finally {
            window.history.replaceState({}, '', before);
        }
    });

    it('a listings card still QRs the stall itself', () => {
        const { root } = paint(broadcastView());
        const qr = root.querySelector('svg.qr');
        expect(qr!.querySelector('path')?.getAttribute('d')).toBe(
            qrPathOf(shopQrHref(ADDR)),
        );
    });
});

describe('a-quote-card-mounts-no-price-node', () => {
    /**
     * `[data-role="price"]` is the covenant's own asked amount everywhere but
     * the pay sheet, and a quote is not that money. One card, one kind: the
     * figure sits under `seller-price`, in the seller's own unit, and nothing
     * on the card is the Agora figure.
     */
    it('paints the quote under seller-price and no price node at all', () => {
        const { root } = paint(quoteCardView());
        const card = root.querySelector('.bc-ext') as HTMLElement;
        expect(card, 'the card is up').not.toBeNull();
        expect(root.querySelector('[data-role="price"]')).toBeNull();
        const figure = root.querySelector('[data-role="seller-price"]');
        expect(figure?.textContent).toBe('$5.00');
        expect(card.textContent).toContain(copy.SELLER_QUOTE_CHIP);
        expect(card.textContent).toContain(copy.BROADCAST_QUOTE_LINE);
        expect(root.querySelector('.bc-nm')?.textContent).toBe(BEANS.name);
        // The covenant's figure is on the same book and must not ride along.
        expect(card.textContent).not.toContain('1,200');
        expect(card.textContent).not.toContain(PRICE_FROM);
    });

    it('an xec quote is the seller’s own unit, ungrouped by no rate', () => {
        const { root } = paint(
            quoteCardView({
                prices: new Map([[TOKEN_ID, { code: 'xec', exponent: 2, amount: 500_000n }]]),
            }),
        );
        expect(root.querySelector('[data-role="seller-price"]')?.textContent).toBe(
            `5,000.00 ${copy.XEC}`,
        );
    });
});

describe('a-quote-card-never-carries-a-rate', () => {
    /**
     * No rate, no converted figure, no "as of": a permanent record read
     * through a live feed would print a different price every hour under a
     * number nobody signed, and a stream has nobody to press refresh. The page
     * the code opens does the conversion, at the moment of the scan.
     */
    it('shows no rate, no fiat glance and no derived XEC, even holding a rate', () => {
        const { root } = paint(
            quoteCardView({ fiatCode: 'usd', fiatRate: scaleRate(0.00002) }),
        );
        const card = root.querySelector('.bc-ext') as HTMLElement;
        expect(root.querySelector('[data-role="rate"]')).toBeNull();
        expect(root.querySelector('[data-role="fiat"]')).toBeNull();
        expect(card.textContent).not.toContain('≈');
        expect(card.textContent).not.toMatch(/as of/i);
        expect(card.textContent).not.toContain(copy.XEC);
        expect(card.textContent).toBe(
            `${BEANS.name}${copy.SELLER_QUOTE_CHIP}$5.00${copy.BROADCAST_QUOTE_LINE}`,
        );
    });
});

describe('an-nft-never-gets-a-quote-card', () => {
    /**
     * A quote is per whole token and an NFT is one of one, so the pay set is
     * `isPriceable` and affirmative: metadata that never arrived answers
     * `unsorted`, and a card built from that would print a figure about a row
     * this page could not read.
     */
    it('drops an NFT quote and falls back to the listing card', () => {
        const nft: TokenMeta = {
            tokenId: OTHER_TOKEN,
            name: 'Pixel #1',
            ticker: 'PIX',
            decimals: 0,
            tokenType: { protocol: 'SLP', type: 'SLP_TOKEN_TYPE_NFT1_CHILD' },
        };
        const { root } = paint(
            quoteCardView({
                tokens: new Map([
                    [TOKEN_ID, BEANS],
                    [OTHER_TOKEN, nft],
                ]),
                prices: new Map([[OTHER_TOKEN, USD_QUOTE]]),
            }),
        );
        expect(root.querySelector('[data-role="seller-price"]')).toBeNull();
        expect(root.querySelector('[data-role="price"]')).not.toBeNull();
    });

    it('drops a quote whose genesis never arrived', () => {
        const { root } = paint(
            quoteCardView({
                tokens: new Map([[TOKEN_ID, BEANS]]),
                prices: new Map([[OTHER_TOKEN, USD_QUOTE]]),
            }),
        );
        expect(root.querySelector('[data-role="seller-price"]')).toBeNull();
    });
});

describe('a-sub-dust-xec-quote-is-not-a-card', () => {
    /**
     * Under `DUST_SATS` the network will not relay the output, so the code on
     * that card opens a page that can compose nothing. An XEC quote is decided
     * here — no rate is involved — while a USD one cannot be, so it is shown
     * and the landing page says what it finds.
     */
    it('drops an xec quote under the floor and keeps one at it', () => {
        const under = paint(
            quoteCardView({
                prices: new Map([[TOKEN_ID, { code: 'xec', exponent: 2, amount: 500n }]]),
            }),
        ).root;
        expect(satsForQuote({ code: 'xec', exponent: 2, amount: 500n }, 1n, undefined)).toBe(
            500n,
        );
        expect(under.querySelector('[data-role="seller-price"]')).toBeNull();
        expect(under.querySelector('[data-role="price"]'), 'the listings stand in').not.toBeNull();

        const at = paint(
            quoteCardView({
                prices: new Map([[TOKEN_ID, { code: 'xec', exponent: 2, amount: 546n }]]),
            }),
        ).root;
        expect(at.querySelector('[data-role="seller-price"]')?.textContent).toBe(
            `5.46 ${copy.XEC}`,
        );
    });
});

describe('an-empty-quote-set-shows-the-listings', () => {
    /**
     * `cards=quotes` over a stall with nothing this page can quote is the shop
     * it already was — the head plate unchanged and not one word about it. A
     * failure printed on a stream reads as the seller's own shop being down,
     * and this is not even our failure.
     */
    it('paints the listing card and prints nothing about the switch', () => {
        const { root } = paint(quoteCardView({ prices: new Map() }));
        expect(root.querySelector('[data-role="price"]')).not.toBeNull();
        expect(root.querySelector('[data-role="seller-price"]')).toBeNull();
        expect(root.querySelector('.bc-nm')?.textContent).toBe(BEANS.name);
        expect(root.textContent).not.toMatch(/quote/i);
    });

    it('an unpriced stall with no listings is still the empty screen', () => {
        const { root } = paint(
            quoteCardView({ fetch: { kind: 'empty' }, prices: new Map() }),
        );
        expect(root.querySelector('.bc-ext')).toBeNull();
        expect(root.textContent).toContain(copy.BROADCAST_EMPTY);
    });

    // A quote needs no covenant: a stall with nothing listed and one quote is
    // the price-tag case this rail exists for, and the overlay follows the pay
    // surface rather than hiding it behind a listing. The book's own empty
    // line goes away with the card up — "nothing listed yet" over something a
    // viewer can pay for reads as a contradiction.
    it('paints a quote card over a stall with nothing listed', () => {
        const { root } = paint(quoteCardView({ fetch: { kind: 'empty' } }));
        expect(root.querySelector('[data-role="seller-price"]')?.textContent).toBe('$5.00');
        expect(root.textContent).not.toContain(copy.BROADCAST_EMPTY);
    });
});

describe('a-long-figure-on-the-overlay-steps-down-before-it-spills', () => {
    /**
     * Overlay plate is 216px of content (252 − 2×18). The figure is 39px
     * tabular bold in the look's `--s-font`, and `from` + `XEC` ride the
     * same nowrap row at 22px. Cut points were measured in Chrome at
     * 1920×1080 against that row, not guessed; Neo's mono is the widest.
     * `from` still counts as two characters (`priceTier`'s shape); the
     * overlay's own ceilings absorb that `from` is 22px here, not the
     * shop's 10.5px tag. `100,000,000` with `from` is past every look.
     */
    const MODERN = overlayTierCharCeilings(DEFAULT_THEME_ID);
    const NEO = overlayTierCharCeilings(NEO_CITY_THEME_ID);
    const RURAL = overlayTierCharCeilings(RURAL_THEME_ID);
    const longOffer = (over: Partial<StallOffer> = {}): StallOffer => ({
        ...OFFER,
        askedSats: 10_000_000_000n,
        ...over,
    });

    it('walks the overlay ladder per look, and from 100,000,000 is tier 3 on every look', () => {
        // Everyday partial: 39px + from + XEC is 222px on Modern/Neo, 216px
        // on the plate — one step down. Rural's serif still seats it.
        expect(priceTier('1,200', true, MODERN)).toBe(1);
        expect(priceTier('1,200', true, NEO)).toBe(1);
        expect(priceTier('1,200', true, RURAL)).toBe(0);
        expect(priceTier('1,200', false, MODERN)).toBe(0);
        expect(priceTier('1,200', false, NEO)).toBe(0);
        expect(priceTier('1,200', false, RURAL)).toBe(0);
        expect(priceTier('100,000,000', true, MODERN)).toBe(3);
        expect(priceTier('100,000,000', true, NEO)).toBe(3);
        expect(priceTier('100,000,000', true, RURAL)).toBe(3);
        expect(priceTier('100,000,000', false, RURAL)).toBe(2);
    });

    it('stamps data-tier on the price row, and only when earned', () => {
        // Everyday 1,200 with from: Modern/Neo earn a step; Rural does not.
        const everyday = (theme: ReturnType<typeof decodeTheme>) =>
            paint(
                broadcastView({
                    theme,
                    broadcastState: 'live',
                }),
            ).root.querySelector('.bc-p');
        expect(everyday(decodeTheme(DEFAULT_THEME_ID))?.getAttribute('data-tier')).toBe('1');
        expect(everyday(decodeTheme(NEO_CITY_THEME_ID))?.getAttribute('data-tier')).toBe('1');
        expect(everyday(decodeTheme(RURAL_THEME_ID))?.hasAttribute('data-tier')).toBe(false);

        const wholeLot = paint(
            broadcastView({
                broadcastState: 'live',
                fetch: { kind: 'offers', offers: [{ ...OFFER, askedAtoms: OFFER.atoms }] },
            }),
        ).root.querySelector('.bc-p');
        expect(wholeLot?.hasAttribute('data-tier')).toBe(false);

        for (const id of [DEFAULT_THEME_ID, NEO_CITY_THEME_ID, RURAL_THEME_ID]) {
            const { root } = paint(
                broadcastView({
                    theme: decodeTheme(id),
                    broadcastState: 'live',
                    fetch: { kind: 'offers', offers: [longOffer()] },
                }),
            );
            expect(
                root.querySelector('.bc-p')?.getAttribute('data-tier'),
                `look ${id} stamps tier 3 on from 100,000,000`,
            ).toBe('3');
        }

        const noFromLong = paint(
            broadcastView({
                theme: decodeTheme(RURAL_THEME_ID),
                broadcastState: 'live',
                fetch: { kind: 'offers', offers: [longOffer({ askedAtoms: OFFER.atoms })] },
            }),
        ).root.querySelector('.bc-p');
        expect(noFromLong?.getAttribute('data-tier')).toBe('2');
    });

    it('broadcast.css sizes the three steps and the figure at tier 3 does not wrap', () => {
        const css = readFileSync(join(UI_DIR, 'broadcast.css'), 'utf8').replace(
            /\/\*[\s\S]*?\*\//g,
            '',
        );
        const rules = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)];
        const sized = (tier: string, px: string): boolean =>
            rules.some(
                ([, selector, body]) =>
                    selector!.includes(`[data-tier='${tier}']`) &&
                    selector!.includes("[data-role='price']") &&
                    body!.includes(`font-size: ${px}`),
            );
        expect(sized('1', '31px'), 'tier 1 is 31px').toBe(true);
        expect(sized('2', '24px'), 'tier 2 is 24px').toBe(true);
        expect(sized('3', '24px'), 'tier 3 is 24px').toBe(true);
        const figureNowrap = rules.some(
            ([, selector, body]) =>
                selector!.includes("[data-tier='3']") &&
                selector!.includes("[data-role='price']") &&
                /white-space:\s*nowrap/.test(body!),
        );
        expect(figureNowrap, 'the figure at tier 3 keeps nowrap').toBe(true);
        const rowWraps = rules.some(
            ([, selector, body]) =>
                selector!.includes("[data-tier='3']") &&
                selector!.includes('.bc-p') &&
                /flex-wrap:\s*wrap/.test(body!),
        );
        expect(rowWraps, 'tier 3 splits from+XEC onto their own line').toBe(true);
    });
});

describe('the-door-and-the-studio-link-to-the-stream-guide', () => {
    it('the door carries one plain link to /stream, named for what it opens', () => {
        const { root } = paint({ route: { kind: 'home' }, overlay: { kind: 'idle' }, tokens: new Map() });
        const link = root.querySelector('[data-role="door-stream-link"]');
        expect(link?.tagName).toBe('A');
        expect(link?.getAttribute('href')).toBe('/stream');
        expect(link?.textContent).toBe(HOME_STREAM_LINK);
        // One link, not a control: nothing about the door's paste path changed.
        expect(root.querySelectorAll('a[href="/stream"]')).toHaveLength(1);
    });
});

describe('the-visitor-has-no-currency-control-and-the-glance-is-usd', () => {
    /**
     * One currency above the table (CLAUDE §8). `FIAT_CURRENCIES` is untouched
     * — six assertions rest on it and the `symbolAfter` rule has to survive a
     * re-widening — but nothing paints a picker, so a visitor cannot put the
     * glance into a currency the seller's own figure was never written in.
     *
     * The handler is still passed in here on purpose: "not painted" has to mean
     * the footer declines to paint it, not that the test forgot to wire it.
     */
    it('paints no picker even when a change handler is supplied', () => {
        const root = document.createElement('div');
        renderStall(root, offersView([OFFER], new Map([[TOKEN_ID, BEANS]]), {
            fiatCode: 'usd',
            fiatRate: scaleRate(0.00003),
        }), { ...handlers(), onChangeFiat: vi.fn() });
        expect(root.querySelector('[data-role="fiat-picker"]')).toBeNull();
        expect(root.textContent).not.toContain(copy.FIAT_LABEL);
        // The glance itself stays: it is the covenant's own asked amount,
        // converted for a look, and it is not the seller's figure.
        expect(root.querySelector('[data-role="fiat"]')?.textContent).toBe('$0.04');
    });

    it('paints no picker on the waiting screens either', () => {
        for (const route of [
            { kind: 'unresolvable' as const, address: ADDR },
            { kind: 'unresolved' as const, address: ADDR },
            { kind: 'home' as const },
        ]) {
            const root = document.createElement('div');
            renderStall(
                root,
                { route, overlay: { kind: 'idle' }, tokens: new Map() },
                { ...handlers(), onChangeFiat: vi.fn() },
            );
            expect(root.querySelector('[data-role="fiat-picker"]'), route.kind).toBeNull();
        }
    });
});

describe('an-agora-row-never-carries-the-sellers-quote', () => {
    /**
     * Two rails, two figures, and never both on one row. An Agora row's price
     * is what its covenant asks; the seller's quote is a different number for
     * a different transaction, and a row carrying both would be two prices for
     * one thing with nothing on screen saying which one binds.
     *
     * The quote now paints — in its own section, under its own role — so these
     * assertions are scoped to the surfaces that must never carry it: the
     * offer row, the disclosure the row opens, the empty screen's own message,
     * the Activity panel and the stream overlay. The section below them is a
     * different surface and has its own tests.
     */
    const PRICE = { code: 'usd', exponent: 2, amount: 1250n } as const;
    const priced = (over: Partial<StallView> = {}) =>
        offersView([OFFER], new Map([[TOKEN_ID, BEANS]]), {
            prices: new Map([[TOKEN_ID, PRICE]]),
            descriptions: new Map([[TOKEN_ID, 'Roasted weekly.']]),
            ...over,
        });

    it('keeps the quote off the offer row and off the disclosure it opens', () => {
        const shop = paint(priced()).root;
        const row = shop.querySelector('.item') as HTMLElement;
        expect(row.querySelector('[data-role="seller-price"]')).toBeNull();
        expect(row.textContent).not.toContain('12.50');

        const opened = paint(priced({ overlay: { kind: 'buy', outpoint: OUTPOINT } })).root;
        const detail = opened.querySelector('[data-role="detail"]') as HTMLElement;
        expect(detail).not.toBeNull();
        expect(detail.querySelector('[data-role="seller-price"]')).toBeNull();
        expect(detail.textContent).not.toContain('12.50');
    });

    it('keeps it out of the empty screen’s message and off the Activity panel', () => {
        const empty = paint(priced({ fetch: { kind: 'empty' } })).root;
        const message = empty.querySelector('.sparse-empty') as HTMLElement;
        expect(message).not.toBeNull();
        expect(message.querySelector('[data-role="seller-price"]')).toBeNull();
        expect(message.textContent).not.toContain('12.50');

        const activity = paint(priced({ panel: 'activity' })).root;
        expect(activity.querySelector('[data-role="seller-price"]')).toBeNull();
        expect(activity.textContent).not.toContain('12.50');
    });

    // The overlay's own default: `cards=listings` is what a link with no
    // switch parses to, and a listings card carries the covenant's figure
    // alone however many quotes the stall has published.
    it('shows none on the broadcast overlay', () => {
        const { root } = paint(
            priced({
                broadcast: {
                    preset: 'corner',
                    mode: 'fixed',
                    transparent: false,
                    cards: 'listings',
                },
            }),
        );
        expect(root.querySelector('[data-role="seller-price"]')).toBeNull();
        expect(root.textContent).not.toContain('12.50');
    });

    it('leaves the covenant’s own asked amount exactly where it was', () => {
        const { root } = paint(priced());
        const row = root.querySelector('.item') as HTMLElement;
        expect(row.querySelector('[data-role="price"]')?.textContent).toBe('1,200');
    });
});

describe('the-editor-shows-the-sellers-price-back-under-its-own-role', () => {
    /**
     * Its own role, never `fiat`. The fiat node is a conversion of the
     * covenant's asked amount; this is a figure the seller wrote and signed,
     * and nothing converts it (CLAUDE §8). Two different things must not share
     * a selector, least of all one the probe measures for contrast.
     */
    const sheet = (over: Partial<StallView> = {}) =>
        paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                tokens: new Map([[TOKEN_ID, BEANS]]),
                overlay: { kind: 'describe' },
                stallName: 'Riverside Goods',
                ...over,
            }),
        );

    it('reads a published price back into the field and the line', () => {
        const { root } = sheet({
            prices: new Map([[TOKEN_ID, { code: 'usd', exponent: 2, amount: 1250n }]]),
        });
        const amount = root.querySelector('[data-role="describe-price"]') as HTMLInputElement;
        expect(amount.value).toBe('12.50');
        expect(
            root
                .querySelector('[data-role="describe-price-code"] [aria-pressed="true"]')
                ?.getAttribute('data-code'),
            'the pressed unit is the published one',
        ).toBe('usd');
        // Scoped to the sheet: the same role now paints on the pay surface
        // behind it, and a query from the root would read that row's figure.
        const back = root.querySelector(
            '[data-role="describe"] [data-role="seller-price"]',
        ) as HTMLElement;
        expect(back.hidden).toBe(false);
        expect(back.textContent).toBe(copy.sellerPrice('12.50', 'USD'));
        // Never the fiat node, which is the converted glance beside a covenant.
        expect(back.getAttribute('data-role')).not.toBe('fiat');
    });

    it('says nothing at all when the seller has published no price', () => {
        const { root } = sheet();
        const amount = root.querySelector('[data-role="describe-price"]') as HTMLInputElement;
        expect(amount.value).toBe('');
        expect(
            (
                root.querySelector(
                    '[data-role="describe"] [data-role="seller-price"]',
                ) as HTMLElement
            ).hidden,
        ).toBe(true);
    });

    it('only-a-fungible-token-can-be-priced', () => {
        // An NFT gets no field at all, and one line saying why — rather than a
        // field that silently refuses, or a record about a token whose kind
        // this page never read.
        const NFT: TokenMeta = {
            ...BEANS,
            tokenType: { protocol: 'SLP', type: 'SLP_TOKEN_TYPE_NFT1_CHILD' },
        };
        const { root } = sheet({ tokens: new Map([[TOKEN_ID, NFT]]) });
        expect(
            (root.querySelector('[data-role="describe-price-field"]') as HTMLElement).hidden,
        ).toBe(true);
        const why = root.querySelector('[data-role="describe-price-why"]') as HTMLElement;
        expect(why.hidden).toBe(false);
        expect(why.textContent).toBe(copy.DESC_PRICE_NOT_PRICEABLE);
        // And the record it would sign carries no price field.
        const field = root.querySelector('[data-role="describe-text"]') as HTMLTextAreaElement;
        field.value = 'Roasted weekly.';
        field.dispatchEvent(new Event('input'));
        const hex = root.querySelector('[data-role="describe-hex"]') as HTMLElement;
        expect(hex.textContent).toBe(encodeDescriptionHex(TOKEN_ID, 'Roasted weekly.'));
    });
});

describe('the-app-writes-usd-cents-and-nothing-else', () => {
    const sheet = (over: Partial<StallView> = {}) =>
        paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                tokens: new Map([[TOKEN_ID, BEANS]]),
                overlay: { kind: 'describe' },
                stallName: 'Riverside Goods',
                ...over,
            }),
        );

    // Amended 2026-09-04: the unit is a two-way segment, not a menu. Pressing
    // it is what a seller does; the assertions below are unchanged.
    const typePrice = (root: HTMLElement, figure: string, code = 'usd') => {
        const amount = root.querySelector('[data-role="describe-price"]') as HTMLInputElement;
        const unit = root.querySelector(
            `[data-role="describe-unit-${code}"]`,
        ) as HTMLButtonElement;
        unit.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        amount.value = figure;
        amount.dispatchEvent(new Event('input'));
        return root.querySelector('[data-role="describe-hex"]') as HTMLElement;
    };

    it('offers exactly two units, and writes each at two decimal places', () => {
        const { root } = sheet();
        const units = [
            ...root.querySelectorAll('[data-role="describe-price-code"] [data-code]'),
        ];
        expect(units.map((u) => u.getAttribute('data-code'))).toEqual(['usd', 'xec']);
        // The glyph is painted, the code is read aloud: "$" alone is a sign
        // three currencies share.
        expect(units.map((u) => u.textContent)).toEqual(['$', 'XEC']);
        expect(units.map((u) => u.getAttribute('aria-label'))).toEqual(['USD', 'XEC']);
        expect(units[0]!.getAttribute('aria-pressed'), 'opens on USD').toBe('true');

        // Amended: a typed USD figure now carries the tolerance byte as well,
        // at the preset the segment opens on. The rule this test guards has
        // not moved — two units, two decimal places, and nothing else — and
        // the margin is a field of the quote, written where the quote is.
        const hex = typePrice(root, '12.50');
        expect(hex.textContent).toBe(
            encodeDescriptionHex(TOKEN_ID, '', {
                price: { code: 'usd', exponent: 2, amount: 1250n, tolerancePct: 2 },
            }),
        );
        // `xec` is the chain's own unit and takes the same two decimals, so a
        // stream QR can carry a figure that never goes stale — and no margin,
        // because no rate is involved in one.
        const inXec = typePrice(root, '450.00', 'xec');
        expect(inXec.textContent).toBe(
            encodeDescriptionHex(TOKEN_ID, '', {
                price: { code: 'xec', exponent: 2, amount: 45_000n },
            }),
        );
    });

    it('refuses a figure the record cannot hold, and hands over nothing', () => {
        const { root } = sheet();
        const err = root.querySelector('[data-role="describe-invalid"]') as HTMLElement;
        const link = root.querySelector('[data-role="describe-cashtab"]') as HTMLAnchorElement;
        for (const bad of ['0', '0.001', '-1', 'free', '1,200']) {
            const hex = typePrice(root, bad);
            expect(hex.hidden, bad).toBe(true);
            expect(err.hidden, bad).toBe(false);
            expect(err.textContent, bad).toBe(copy.DESC_PRICE_REFUSED);
            expect(link.hidden, bad).toBe(true);
        }
    });

    it('names the price when the shared record overflows', () => {
        const { root } = sheet();
        const field = root.querySelector('[data-role="describe-text"]') as HTMLTextAreaElement;
        const err = root.querySelector('[data-role="describe-invalid"]') as HTMLElement;
        field.value = 'D'.repeat(MAX_PRICED_DESCRIPTION_BYTES + 1);
        field.dispatchEvent(new Event('input'));
        typePrice(root, '12.50');
        expect(err.hidden).toBe(false);
        // Amended: a typed figure carries a margin, so the ladder names the
        // pair that includes it. Both pairs are still stated, not implied.
        expect(err.textContent).toBe(copy.DESC_OVER_BUDGET_TOLERANCE);
        expect(copy.DESC_OVER_BUDGET_PRICED).toContain(
            String(MAX_PRICED_DESCRIPTION_BYTES),
        );
        expect(copy.DESC_OVER_BUDGET_PRICED).toContain(
            String(MAX_PRICED_SHELVED_DESCRIPTION_BYTES),
        );
        expect(copy.DESC_OVER_BUDGET_TOLERANCE).toContain(
            String(MAX_TOLERANCE_DESCRIPTION_BYTES),
        );
        expect(copy.DESC_OVER_BUDGET_TOLERANCE).toContain(
            String(MAX_TOLERANCE_SHELVED_DESCRIPTION_BYTES),
        );
        // And one meter still, counting the price into the same record.
        const counter = root.querySelector('[data-role="describe-summary"]') as HTMLElement;
        expect(counter.textContent).toContain(`of ${OP_RETURN_BUDGET} bytes`);
    });
});

describe('editing-words-does-not-drop-the-price', () => {
    /**
     * One record is the whole truth about one token, so every publish restates
     * every field. A sheet that loaded the words and not the figure would take
     * a seller's price off the chain the next time they fixed a typo.
     */
    const PRICE = { code: 'usd', exponent: 2, amount: 1250n } as const;
    const sheet = () =>
        paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                tokens: new Map([[TOKEN_ID, BEANS]]),
                overlay: { kind: 'describe' },
                stallName: 'Riverside Goods',
                descriptions: new Map([[TOKEN_ID, 'Old words']]),
                shelves: new Map([[TOKEN_ID, 'Coffee']]),
                prices: new Map([[TOKEN_ID, PRICE]]),
            }),
        );

    it('carries the price and the shelf through a change of words', () => {
        const { root } = sheet();
        const field = root.querySelector('[data-role="describe-text"]') as HTMLTextAreaElement;
        field.value = 'New words';
        field.dispatchEvent(new Event('input'));
        const hex = root.querySelector('[data-role="describe-hex"]') as HTMLElement;
        expect(hex.textContent).toBe(
            encodeDescriptionHex(TOKEN_ID, 'New words', { shelf: 'Coffee', price: PRICE }),
        );
    });

    it('removing-words-does-not-remove-the-price', () => {
        // Amended 2026-09-04: removal is a mode, so the record is read off the
        // sheet's own sign control once the mode is on. What it carries is the
        // rule and it has not moved — the words go, the shelf and the figure
        // are restated.
        const { root } = sheet();
        const toggle = root.querySelector('[data-role="describe-remove"]') as HTMLButtonElement;
        expect(toggle.hidden).toBe(false);
        toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        const removal = encodeRemovalHex(TOKEN_ID, { shelf: 'Coffee', price: PRICE });
        expect(removal).toBeDefined();
        expect(root.querySelector('[data-role="describe-hex"]')!.textContent).toBe(removal);
        const pay = root.querySelector('[data-role="describe-pay"]') as HTMLAnchorElement;
        expect(pay.getAttribute('href')).toContain(encodeURIComponent(removal!));
    });

    it('offers removal over a price alone', () => {
        // A record with only a figure in it is still something to remove, so
        // the gate counts prices the way it counts words and shelves.
        const { root } = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                tokens: new Map([[TOKEN_ID, BEANS]]),
                overlay: { kind: 'describe' },
                stallName: 'Riverside Goods',
                prices: new Map([[TOKEN_ID, PRICE]]),
            }),
        );
        expect(
            (root.querySelector('[data-role="describe-remove"]') as HTMLElement).hidden,
        ).toBe(false);
    });
});

describe('clearing-every-field-removes-everything', () => {
    /**
     * One record is the whole truth, so a shelf or a price comes off the chain
     * by publishing without it. But with every field empty the sheet used to
     * call that "nothing asked" and disable the control, while the remove road
     * restated the published shelf and price — so a token with no words and a
     * shelf had no road to a bare record at all. Every field empty over a
     * published record is a request: the bare tombstone, and a line that says
     * what it takes away.
     */
    const PRICE = { code: 'usd', exponent: 2, amount: 1250n } as const;
    const clearAll = (root: HTMLElement) => {
        for (const role of ['describe-text', 'describe-shelf', 'describe-price']) {
            const f = root.querySelector(`[data-role="${role}"]`) as HTMLInputElement;
            f.value = '';
            f.dispatchEvent(new Event('input'));
        }
    };

    it('publishes the bare tombstone when words, shelf and price are all cleared', () => {
        const { root } = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                tokens: new Map([[TOKEN_ID, BEANS]]),
                overlay: { kind: 'describe' },
                stallName: 'Riverside Goods',
                descriptions: new Map([[TOKEN_ID, 'Old words']]),
                shelves: new Map([[TOKEN_ID, 'Coffee']]),
                prices: new Map([[TOKEN_ID, PRICE]]),
            }),
        );
        clearAll(root);
        const hex = root.querySelector('[data-role="describe-hex"]') as HTMLElement;
        expect(hex.hidden).toBe(false);
        expect(hex.textContent).toBe(encodeRemovalHex(TOKEN_ID, {}));
        const lede = root.querySelector('[data-role="describe-clear-lede"]') as HTMLElement;
        expect(lede.hidden).toBe(false);
        expect(lede.textContent).toBe(copy.DESC_CLEAR_ALL_LEDE);
    });

    it('no-words-shelved-can-drop-its-shelf', () => {
        const { root } = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                tokens: new Map([[TOKEN_ID, BEANS]]),
                overlay: { kind: 'describe' },
                stallName: 'Riverside Goods',
                shelves: new Map([[TOKEN_ID, 'Coffee']]),
            }),
        );
        clearAll(root);
        const hex = root.querySelector('[data-role="describe-hex"]') as HTMLElement;
        expect(hex.textContent).toBe(encodeRemovalHex(TOKEN_ID, {}));
    });

    it('still asks nothing when nothing is published and every field is empty', () => {
        const { root } = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                tokens: new Map([[TOKEN_ID, BEANS]]),
                overlay: { kind: 'describe' },
                stallName: 'Riverside Goods',
            }),
        );
        clearAll(root);
        expect((root.querySelector('[data-role="describe-hex"]') as HTMLElement).hidden).toBe(true);
        expect(
            (root.querySelector('[data-role="describe-hex-fold"]') as HTMLElement).hidden,
            'the fold hides with the record it holds',
        ).toBe(true);
        expect(
            (root.querySelector('[data-role="describe-clear-lede"]') as HTMLElement).hidden,
        ).toBe(true);
        // And the line says so in words rather than printing a size for a
        // record nobody asked for.
        expect(
            (root.querySelector('[data-role="describe-summary"]') as HTMLElement).textContent,
        ).toBe(SUMMARY_NOTHING);
    });
});

describe('a-price-not-in-usd-or-xec-is-void-and-silent', () => {
    /**
     * Void on screen, never on the wire. The editor writes two units and paints
     * two; a record carrying anything else is read, shown nowhere and mentioned
     * nowhere. What it is **not** is forgotten: a publish from this sheet
     * restates every field, so an unwritable code is carried forward untouched
     * until the seller types a figure of their own over it. A field this app no
     * longer edits is never dropped — the same rule the STL1 fiat hint gets.
     */
    const EUR = { code: 'eur', exponent: 2, amount: 900n } as const;
    const sheet = () =>
        paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                tokens: new Map([[TOKEN_ID, BEANS]]),
                overlay: { kind: 'describe' },
                stallName: 'Riverside Goods',
                prices: new Map([[TOKEN_ID, EUR]]),
            }),
        );

    it('paints nothing about it and raises no error', () => {
        const { root } = sheet();
        const amount = root.querySelector('[data-role="describe-price"]') as HTMLInputElement;
        expect(amount.value, 'no figure this editor could write').toBe('');
        expect((root.querySelector('[data-role="seller-price"]') as HTMLElement).hidden).toBe(
            true,
        );
        expect(root.textContent).not.toContain('9.00');
        expect(root.textContent).not.toContain('EUR');
        const err = root.querySelector('[data-role="describe-invalid"]') as HTMLElement;
        expect(err.hidden, 'an unwritable code is not an error').toBe(true);
    });

    it('carries it forward rather than erasing it on the next publish', () => {
        const { root } = sheet();
        const field = root.querySelector('[data-role="describe-text"]') as HTMLTextAreaElement;
        field.value = 'New words';
        field.dispatchEvent(new Event('input'));
        const hex = root.querySelector('[data-role="describe-hex"]') as HTMLElement;
        expect(hex.textContent).toBe(
            encodeDescriptionHex(TOKEN_ID, 'New words', { price: EUR }),
        );
    });

    it('carries it forward when our own genesis read is what hid the field', () => {
        // `isPriceable` says no when the metadata never arrived, which is our
        // gap and not a fact about the token. Dropping the figure there would
        // destroy a record because one unrelated read failed.
        const { root } = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                tokens: new Map(),
                overlay: { kind: 'describe' },
                stallName: 'Riverside Goods',
                prices: new Map([[TOKEN_ID, { code: 'usd', exponent: 2, amount: 1250n }]]),
            }),
        );
        expect(
            (root.querySelector('[data-role="describe-price-field"]') as HTMLElement).hidden,
            'no field, because we could not read the kind',
        ).toBe(true);
        const field = root.querySelector('[data-role="describe-text"]') as HTMLTextAreaElement;
        field.value = 'New words';
        field.dispatchEvent(new Event('input'));
        expect(
            (root.querySelector('[data-role="describe-hex"]') as HTMLElement).textContent,
        ).toBe(
            encodeDescriptionHex(TOKEN_ID, 'New words', {
                price: { code: 'usd', exponent: 2, amount: 1250n },
            }),
        );
    });

    it('a figure the seller types wins over the carried one', () => {
        const { root } = sheet();
        const amount = root.querySelector('[data-role="describe-price"]') as HTMLInputElement;
        amount.value = '12.50';
        amount.dispatchEvent(new Event('input'));
        const hex = root.querySelector('[data-role="describe-hex"]') as HTMLElement;
        expect(hex.textContent).toBe(
            encodeDescriptionHex(TOKEN_ID, '', {
                price: { code: 'usd', exponent: 2, amount: 1250n },
            }),
        );
    });
});

describe('republish-carries-an-existing-fiat-hint-forward', () => {
    /**
     * STL1 tag `0x04` is read and unhonoured (CLAUDE §8), so the publish sheet
     * no longer offers a control for it. Dropping the field from the record
     * would be a different thing entirely: a republish is one transaction that
     * restates the whole document, and a field this app stopped editing must
     * not be erased by an unrelated change to the stall's name.
     */
    const sheet = (over: Partial<StallView> = {}) =>
        paint(
            idlePubkey({
                fetch: { kind: 'empty' },
                overlay: { kind: 'publish-name' },
                stallName: 'Riverside Goods',
                ...over,
            }),
        );

    it('offers no control and still writes the hint the record carries', () => {
        const { root } = sheet({ fiatHint: 'vnd' });
        expect(root.querySelector('[data-role="publish-fiat"]')).toBeNull();
        expect(root.textContent).not.toContain(copy.PUBLISH_FIAT_LABEL);
        const hex = root.querySelector('[data-role="publish-hex"]') as HTMLElement;
        expect(hex.textContent).toBe(
            encodeManifestHex('Riverside Goods', DEFAULT_THEME_ID, 0, { fiatHint: 'vnd' }),
        );
    });

    it('writes no hint into a record that never had one', () => {
        const { root } = sheet();
        const hex = root.querySelector('[data-role="publish-hex"]') as HTMLElement;
        expect(hex.textContent).toBe(
            encodeManifestHex('Riverside Goods', DEFAULT_THEME_ID, 0),
        );
    });
});

describe('the activity panel’s two lists and the row detail', () => {
    const TXID_A = 'ab'.repeat(32);
    const TXID_B = 'cd'.repeat(32);
    const TXID_C = 'ef'.repeat(32);
    const AT = 1_756_400_000_000;

    const activity = (over: Partial<StallView> = {}) =>
        offersView([OFFER], undefined, { panel: 'activity', ...over });

    it('a-receipt-does-not-call-an-unknown-finality-a-mempool-transaction', () => {
        /**
         * Three states, and the third is about this page, not about the
         * chain. `isFinal` absent is one node's silence and a missing block
         * is not a mempool sighting — printing "in the mempool" from either
         * would be a claim nothing checked, which is the §4 collapse wearing
         * a money word.
         */
        const { root } = paint(
            activity({
                events: [
                    {
                        txid: TXID_A,
                        kind: 'other',
                        seenAtMs: AT,
                        status: { kind: 'finalized', avalanche: true },
                    },
                    {
                        txid: TXID_B,
                        kind: 'other',
                        seenAtMs: AT - 1000,
                        status: { kind: 'finalized', avalanche: false },
                    },
                    {
                        txid: TXID_C,
                        kind: 'other',
                        seenAtMs: AT - 2000,
                        status: { kind: 'in-block', height: 800_123 },
                    },
                    // chronik's `TX_CONFIRMED` frame names no height, so the
                    // state it proves has none and the line says the weaker
                    // thing rather than inventing a number.
                    {
                        txid: '02'.repeat(32),
                        kind: 'other',
                        seenAtMs: AT - 2500,
                        status: { kind: 'in-block' },
                    },
                    { txid: '01'.repeat(32), kind: 'other', seenAtMs: AT - 3000 },
                ],
            }),
        );
        const states = [...root.querySelectorAll('[data-role="event-status"]')].map(
            (n) => n.textContent,
        );
        expect(states).toEqual([
            copy.EVENT_STATUS_FINALIZED_AVALANCHE,
            copy.EVENT_STATUS_FINALIZED,
            copy.eventStatusInBlock(800_123),
            copy.EVENT_STATUS_IN_BLOCK,
            copy.EVENT_STATUS_UNKNOWN,
        ]);
        const text = (root.textContent ?? '').toLowerCase();
        expect(text, 'a state we do not know is not a mempool sighting').not.toContain(
            'mempool',
        );
    });

    it('a-walked-row-does-not-claim-this-page-saw-it-arrive', () => {
        /**
         * "Watching since" promises a page clock, and a walked row was never
         * watched — it was read out of the address's history long after it
         * happened. So a walked row prints the chain's own clock, labelled as
         * such, and a row with neither clock prints no time at all rather
         * than borrowing `Date.now()`.
         */
        const { root } = paint(
            activity({
                events: [{ txid: TXID_A, kind: 'other', seenAtMs: AT }],
                history: {
                    rows: [
                        { txid: TXID_B, kind: 'other', chainTimeS: Math.floor(AT / 1000) },
                        { txid: TXID_C, kind: 'other' },
                    ],
                    pagesRead: 1,
                },
            }),
        );
        const watching = root.querySelector('[data-role="activity-watching"]')!;
        const history = root.querySelector('[data-role="activity-history"]')!;
        expect(watching.querySelectorAll('li.event')).toHaveLength(1);
        expect(history.querySelectorAll('li.event')).toHaveLength(2);

        const labels = [...history.querySelectorAll('[data-role="event-time-label"]')].map(
            (n) => n.textContent,
        );
        expect(labels, 'the chain’s clock, named as the chain’s').toEqual([
            copy.EVENT_TIME_CHAIN_LABEL,
        ]);
        expect(
            [...watching.querySelectorAll('[data-role="event-time-label"]')].map(
                (n) => n.textContent,
            ),
        ).toEqual([copy.EVENT_TIME_PAGE_LABEL]);

        // The undated row has no glance time and no detail time: an undated
        // row is honest, a row dated from this page's clock is not.
        const rows = [...history.querySelectorAll('li.event')];
        expect(rows[1]!.querySelector('.event-time')).toBeNull();
    });

    it('activity-rows-carry-no-control-outside-the-detail', () => {
        const { root } = paint(
            activity({
                events: [
                    { txid: TXID_A, kind: 'book', seenAtMs: AT, book: 'consumed' },
                    { txid: TXID_B, kind: 'other', seenAtMs: AT - 1, sats: 5_460n },
                ],
            }),
        );
        const rows = [...root.querySelectorAll('li.event')];
        expect(rows).toHaveLength(2);
        for (const row of rows) {
            const fold = row.querySelector('[data-role="event-detail"]');
            expect(fold, 'every row is a disclosure').not.toBeNull();
            const body = row.querySelector('[data-role="event-body"]')!;
            for (const control of row.querySelectorAll('button, a, input, select')) {
                expect(
                    body.contains(control),
                    `${control.tagName} outside the detail body`,
                ).toBe(true);
            }
            // The glance line is data. A row that grew a control the visitor
            // did not ask for is a row that can be clicked by accident.
            expect(row.querySelector('summary')!.querySelector('button, a')).toBeNull();
        }
    });

    it('a-receipt-opens-the-explorer-with-a-gated-txid', () => {
        const { root } = paint(
            activity({
                events: [
                    { txid: TXID_A, kind: 'other', seenAtMs: AT },
                    // Not a txid: the flood stand-in, which names no
                    // transaction and must not become an href.
                    { txid: 'unknown', kind: 'other', seenAtMs: AT - 1 },
                ],
            }),
        );
        const rows = [...root.querySelectorAll('li.event')];
        const link = rows[0]!.querySelector<HTMLAnchorElement>(
            '[data-role="event-explorer"]',
        )!;
        expect(link).not.toBeNull();
        expect(link.getAttribute('href')).toBe(EXPLORER_TX_URL(TXID_A));
        expect(link.target).toBe('_blank');
        expect(link.rel).toBe('noopener noreferrer');
        expect(rows[1]!.querySelector('[data-role="event-explorer"]')).toBeNull();
        expect(root.textContent).toContain(copy.ACTIVITY_PUBLIC);
    });

    it('a-receipt-never-says-sold', () => {
        const { root } = paint(
            activity({
                events: [
                    { txid: TXID_A, kind: 'book', seenAtMs: AT, book: 'consumed' },
                    { txid: TXID_B, kind: 'book', seenAtMs: AT - 1, book: 'both' },
                    { txid: TXID_C, kind: 'other', seenAtMs: AT - 2, sats: 100_000n },
                ],
            }),
        );
        expect((root.textContent ?? '').toLowerCase()).not.toContain('sold');
        // The amount is what was received, under its own role, and never
        // dressed as a sale: a payment to this address is money arriving,
        // not proof that anything was bought.
        const amounts = [...root.querySelectorAll('[data-role="receipt-amount"]')].map(
            (n) => n.textContent,
        );
        expect(amounts).toEqual([copy.eventReceived('1,000')]);
    });

    it('a-receipt-with-no-amount-omits-the-row-rather-than-showing-zero', () => {
        const { root } = paint(
            activity({
                events: [{ txid: TXID_A, kind: 'other', seenAtMs: AT }],
            }),
        );
        expect(root.querySelector('[data-role="receipt-amount"]')).toBeNull();
        expect(root.textContent).not.toContain(copy.EVENT_AMOUNT_LABEL);
    });

    it('labels a record another wallet signed as another wallet’s', () => {
        const { root } = paint(
            activity({
                history: {
                    rows: [
                        { txid: TXID_A, kind: 'settings', signedByStall: true },
                        { txid: TXID_B, kind: 'settings', signedByStall: false },
                        { txid: TXID_C, kind: 'description', signedByStall: false },
                    ],
                    pagesRead: 1,
                },
            }),
        );
        const kinds = [...root.querySelectorAll('.event-kind')].map((n) => n.textContent);
        expect(kinds).toEqual([
            copy.EVENT_SETTINGS,
            copy.EVENT_SETTINGS_STRANGER,
            copy.EVENT_DESCRIPTION_STRANGER,
        ]);
    });

    it('history-says-its-own-state: reading, ended, capped, failed', () => {
        const more = paint(
            activity({ history: { rows: [], pagesRead: 1 } }),
        );
        expect(
            more.root.querySelector('[data-role="history-more"]'),
            'a page to read is a control, never an automatic walk',
        ).not.toBeNull();

        const loading = paint(
            activity({ history: { rows: [], pagesRead: 1, loading: true } }),
        );
        expect(loading.root.textContent).toContain(copy.ACTIVITY_HISTORY_LOADING);
        expect(
            loading.root.querySelector<HTMLButtonElement>('[data-role="history-more"]')
                ?.disabled,
            'one page in flight',
        ).toBe(true);

        const done = paint(
            activity({ history: { rows: [], pagesRead: 2, done: true } }),
        );
        expect(done.root.textContent).toContain(copy.ACTIVITY_HISTORY_END);
        expect(done.root.querySelector('[data-role="history-more"]')).toBeNull();

        const capped = paint(
            activity({
                history: { rows: [], pagesRead: MAX_ACTIVITY_PAGES, capped: true },
            }),
        );
        expect(capped.root.textContent).toContain(
            copy.activityHistoryCapped(MAX_ACTIVITY_PAGES),
        );
        expect(capped.root.querySelector('[data-role="history-more"]')).toBeNull();

        const failed = paint(
            activity({
                history: {
                    rows: [{ txid: TXID_A, kind: 'other', chainTimeS: 1_756_400_000 }],
                    pagesRead: 1,
                    failed: true,
                },
            }),
        );
        expect(failed.root.textContent).toContain(copy.ACTIVITY_HISTORY_FAILED);
        expect(
            failed.root.querySelector('[data-role="history-retry"]'),
            'a failed page is a retry, not a dead end',
        ).not.toBeNull();
        expect(
            failed.root.querySelectorAll('li.event'),
            'and what was already read stays on screen',
        ).toHaveLength(1);
    });

    it('the-paging-trigger-is-a-plain-handler-the-observer-only-calls', () => {
        const root = document.createElement('div');
        const h = { ...handlers(), onReadHistoryPage: vi.fn() };
        renderStall(root, activity({ history: { rows: [], pagesRead: 0 } }), h);
        expect(root.querySelector('[data-role="history-sentinel"]')).not.toBeNull();
        (
            root.querySelector('[data-role="history-more"]') as HTMLButtonElement
        ).click();
        expect(h.onReadHistoryPage).toHaveBeenCalledTimes(1);
    });

    it('a-live-update-keeps-the-readers-place-in-history', async () => {
        /**
         * `renderStall` starts with `replaceChildren()`, so a stranger's dust
         * used to throw the reader back to the top of a list they were
         * halfway down. The offset is remembered per stall and restored once
         * the new tree is connected.
         */
        const root = document.createElement('div');
        document.body.append(root);
        const view = activity({
            events: [{ txid: TXID_A, kind: 'other', seenAtMs: AT }],
            history: {
                rows: Array.from({ length: 30 }, (_, i) => ({
                    txid: i.toString(16).padStart(2, '0').repeat(32),
                    kind: 'other' as const,
                    chainTimeS: 1_756_400_000 - i,
                })),
                pagesRead: 1,
            },
        });
        renderStall(root, view, handlers());
        const scroller = root.querySelector<HTMLElement>('.stall-scroll')!;
        scroller.scrollTop = 420;
        scroller.dispatchEvent(new Event('scroll'));

        renderStall(root, view, handlers());
        await Promise.resolve();
        expect(root.querySelector<HTMLElement>('.stall-scroll')!.scrollTop).toBe(420);
        root.remove();
    });
});

describe('two-sheets-two-records', () => {
    /**
     * `STL1` is the stall's own document — one transaction, one fee — and
     * `STLD` is one token's, one transaction per token. The single sheet that
     * carried both read as one publish control covering both, and a seller
     * found that out a fee at a time.
     */
    it('the-studio-launches-two-records-not-one', () => {
        const h = handlers();
        const root = document.createElement('div');
        renderStall(root, offersView([OFFER], undefined, { panel: 'studio' }), h);

        const record = root.querySelector('[data-role="studio-sec-record"]') as HTMLElement;
        const name = record.querySelector(
            '[data-role="studio-open-publish"]',
        ) as HTMLButtonElement;
        const words = record.querySelector(
            '[data-role="studio-open-describe"]',
        ) as HTMLButtonElement;
        expect(name, 'the stall record keeps its launcher').not.toBeNull();
        expect(words, 'the token record gets its own').not.toBeNull();
        expect(name.textContent).toBe(copy.STUDIO_OPEN_SETTINGS);
        expect(words.textContent).toBe(copy.DESC_TITLE);

        name.click();
        expect(h.onOpenPublish).toHaveBeenCalledTimes(1);
        words.click();
        expect(h.onOpenDescribe).toHaveBeenCalledTimes(1);

        // The hint under the first no longer claims the second: it said
        // "name, look, decorations and token descriptions" while descriptions
        // were on the same sheet, and that is a fee-per-token promise.
        expect(record.textContent).toContain(copy.STUDIO_SETTINGS_HINT);
        expect(copy.STUDIO_SETTINGS_HINT.toLowerCase()).not.toContain('description');
        expect(record.textContent).toContain(copy.STUDIO_DESCRIBE_HINT);
    });

    it('each launcher opens its own sheet and only its own', () => {
        const named = paint(
            offersView([OFFER], undefined, { overlay: { kind: 'publish-name' } }),
        );
        expect(named.root.querySelector('[data-role="publish"]')).not.toBeNull();
        expect(named.root.querySelector('[data-role="describe"]')).toBeNull();

        const words = paint(
            offersView([OFFER], undefined, { overlay: { kind: 'describe' } }),
        );
        expect(words.root.querySelector('[data-role="describe"]')).not.toBeNull();
        expect(words.root.querySelector('[data-role="publish"]')).toBeNull();
        // Both are the same kind of thing: a dialog inside a scrim.
        for (const { root } of [named, words]) {
            const scrim = root.querySelector('[data-role="sheet-scrim"]') as HTMLElement;
            expect(scrim).not.toBeNull();
            const sheet = scrim.firstElementChild as HTMLElement;
            expect(sheet.classList.contains('sheet')).toBe(true);
            expect(sheet.getAttribute('aria-modal')).toBe('true');
        }
    });

    it('a-name-sheet-has-no-removal-road', () => {
        // STL1 has no tombstone: a stall cannot unset its record, so a
        // "Remove the words…" control on this sheet would be a control that
        // cannot do what it says. Removal lives on the token
        // record, which does have one.
        const { root } = paint(
            offersView([OFFER], undefined, {
                overlay: { kind: 'publish-name' },
                stallName: 'Riverside Goods',
                tagline: 'Fresh from the river bend',
            }),
        );
        const sheet = root.querySelector('[data-role="publish"]') as HTMLElement;
        expect(sheet.querySelector('[data-role="describe-remove"]')).toBeNull();
        expect(sheet.textContent).not.toContain(copy.DESC_REMOVE_OPEN);
        expect(sheet.textContent).not.toContain(copy.DESC_REMOVE);
    });

    it('a-describe-launcher-preselects-its-token', () => {
        // The id is a preselection, never a promise: the picker's set is what
        // the stall lists, and an id outside it simply does not select.
        const other = '77'.repeat(32);
        const view = offersView(
            [OFFER, { ...OFFER, outpoint: { txid: 'bc'.repeat(32), outIdx: 1 }, tokenId: other }],
            undefined,
            {
                overlay: { kind: 'describe', tokenId: other },
                tokens: new Map([
                    [TOKEN_ID, BEANS],
                    [other, { ...BEANS, tokenId: other, name: 'Green Tea' }],
                ]),
            },
        );
        const { root } = paint(view);
        const picker = root.querySelector('[data-role="describe-token"]') as HTMLSelectElement;
        expect(picker.value).toBe(other);

        const stray = paint(
            offersView([OFFER], undefined, {
                overlay: { kind: 'describe', tokenId: 'ff'.repeat(32) },
                tokens: new Map([[TOKEN_ID, BEANS]]),
            }),
        );
        expect(
            (stray.root.querySelector('[data-role="describe-token"]') as HTMLSelectElement).value,
            'an id this stall does not list selects nothing of its own',
        ).toBe(TOKEN_ID);
    });

    /**
     * One predicate, two callers. `renderStall` mounts a sheet only for a
     * resolved stall with an address; `livePaint` holds an unsolicited paint
     * back while a sheet is open. Two lists of overlay kinds kept in step by
     * hand is how an overlay that mounts nothing stops a stall updating with
     * nothing on screen to say why.
     */
    it('an-overlay-that-cannot-mount-does-not-stop-the-live-paint', () => {
        const kinds = [
            { kind: 'publish-name' } as const,
            { kind: 'describe' } as const,
            { kind: 'pay', tokenId: TOKEN_ID } as const,
            { kind: 'poster', format: 'print' } as const,
        ];
        for (const overlay of kinds) {
            const mountable = offersView([OFFER], undefined, { overlay });
            expect(sheetMounts(mountable), `${overlay.kind} mounts`).toBe(true);
            expect(
                paint(mountable).root.querySelector('.sheet-scrim'),
                `${overlay.kind} is on screen`,
            ).not.toBeNull();

            // No address: `paintUnresolvable` and a bare pubkey route both
            // reach this, and neither can sign anything.
            const homeless = offersView([OFFER], undefined, { overlay, address: undefined });
            expect(sheetMounts(homeless), `${overlay.kind} without an address`).toBe(false);
            expect(
                paint(homeless).root.querySelector('.sheet-scrim'),
                `${overlay.kind} without an address mounts nothing`,
            ).toBeNull();

            // The stream overlay returns before any sheet mounts.
            const streamed = offersView([OFFER], undefined, { overlay, broadcast: BROADCAST });
            expect(sheetMounts(streamed), `${overlay.kind} on a broadcast`).toBe(false);
            expect(
                paint(streamed).root.querySelector('.sheet-scrim'),
                `${overlay.kind} on a broadcast mounts nothing`,
            ).toBeNull();
        }

        // And the kinds that were never sheets are never waited on.
        for (const overlay of [
            { kind: 'idle' } as const,
            { kind: 'buy', outpoint: OUTPOINT } as const,
        ]) {
            expect(sheetMounts(offersView([OFFER], undefined, { overlay }))).toBe(false);
        }
    });
});

describe('the-summary-says-what-the-record-carries', () => {
    /**
     * One count, from the encoder. A meter doing its own arithmetic is a
     * second opinion about a permanent record, and the opinion on screen
     * would be the one nobody signed.
     */
    it('names every field the encoder was handed, and its own byte count', () => {
        const { root } = paint(
            offersView([OFFER], undefined, {
                overlay: { kind: 'publish-name' },
                stallName: 'Riverside Goods',
                tagline: 'Fresh from the river bend',
                announcement: 'Back on the 10th',
                fiatHint: 'vnd',
                theme: decodeTheme(RURAL_THEME_ID),
                attachmentFlags: 0b1,
            }),
        );
        const hex = encodeManifestHex('Riverside Goods', RURAL_THEME_ID, 0b1, {
            tagline: 'Fresh from the river bend',
            announcement: 'Back on the 10th',
            fiatHint: 'vnd',
        })!;
        expect(hex).toBeDefined();
        expect(root.querySelector('[data-role="publish-hex"]')!.textContent).toBe(hex);

        const rural = SHIPPED_THEMES.find((row) => row.id === RURAL_THEME_ID)!;
        const worn = wornAttachments(RURAL_THEME_ID, 0b1);
        const line = root.querySelector('[data-role="publish-summary"]') as HTMLElement;
        expect(line.hidden).toBe(false);
        expect(line.textContent).toBe(
            summaryLine(
                [
                    { label: copy.SUMMARY_NAME, value: 'Riverside Goods' },
                    { label: copy.SUMMARY_LOOK, value: rural.label },
                    { label: copy.SUMMARY_TAGLINE },
                    { label: copy.SUMMARY_ANNOUNCEMENT },
                    { label: copy.SUMMARY_FIAT_HINT, value: 'VND' },
                    { label: copy.SUMMARY_DECOR, value: worn.map((r) => r.label).join(' + ') },
                ],
                hex.length / 2,
                OP_RETURN_BUDGET,
            ),
        );
        // The size is the record's own length, never a second count.
        expect(line.textContent).toContain(descBytesLeft(hex.length / 2, OP_RETURN_BUDGET));
    });

    it('the-meter-and-the-encoder-count-the-same-record', () => {
        const { root } = paint(
            offersView([OFFER], undefined, {
                overlay: { kind: 'describe' },
                tokens: new Map([[TOKEN_ID, BEANS]]),
            }),
        );
        const field = root.querySelector('[data-role="describe-text"]') as HTMLTextAreaElement;
        const shelf = root.querySelector('[data-role="describe-shelf"]') as HTMLInputElement;
        field.value = 'Roasted weekly.';
        shelf.value = 'Coffee';
        shelf.dispatchEvent(new Event('input'));
        const hex = root.querySelector('[data-role="describe-hex"]') as HTMLElement;
        const line = root.querySelector('[data-role="describe-summary"]') as HTMLElement;
        expect(hex.hidden).toBe(false);
        // The figure the meter prints is the record the links carry, byte for
        // byte — the whole point of one source.
        expect(line.textContent).toContain(
            descBytesLeft(hex.textContent!.length / 2, OP_RETURN_BUDGET),
        );
        expect(line.textContent).toBe(
            summaryLine(
                [
                    { label: copy.SUMMARY_WORDS },
                    { label: copy.SUMMARY_SHELF, value: 'Coffee' },
                ],
                hex.textContent!.length / 2,
                OP_RETURN_BUDGET,
            ),
        );
    });

    it('names a carried field without painting a figure it cannot write', () => {
        // A price in a unit this editor does not write is carried forward
        // untouched and shown nowhere — but the record carries it, so the
        // line names the field. Silence about a field being signed is the
        // other half of the same honesty.
        const EUR = { code: 'eur', exponent: 2, amount: 900n } as const;
        const { root } = paint(
            offersView([OFFER], undefined, {
                overlay: { kind: 'describe' },
                tokens: new Map([[TOKEN_ID, BEANS]]),
                prices: new Map([[TOKEN_ID, EUR]]),
            }),
        );
        const field = root.querySelector('[data-role="describe-text"]') as HTMLTextAreaElement;
        field.value = 'New words';
        field.dispatchEvent(new Event('input'));
        const line = root.querySelector('[data-role="describe-summary"]') as HTMLElement;
        expect(line.textContent).toContain(copy.SUMMARY_QUOTE);
        expect(line.textContent, 'no figure this sheet cannot change').not.toContain('9.00');
        expect(line.textContent).not.toContain('EUR');
    });

    it('says nothing to publish rather than a size for a record nobody asked for', () => {
        const { root } = paint(
            offersView([OFFER], undefined, {
                overlay: { kind: 'describe' },
                tokens: new Map([[TOKEN_ID, BEANS]]),
            }),
        );
        expect(
            (root.querySelector('[data-role="describe-summary"]') as HTMLElement).textContent,
        ).toBe(SUMMARY_NOTHING);
    });
});

describe('the-record-folds-and-the-phone-code-is-a-desk-fold', () => {
    const sheetCss = (): string =>
        readFileSync(join(UI_DIR, 'stall.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

    it('both sheets fold the hex, with the hex node inside the fold', () => {
        const sheets = [
            ['publish', { kind: 'publish-name' } as const],
            ['describe', { kind: 'describe' } as const],
        ] as const;
        for (const [prefix, overlay] of sheets) {
            const { root } = paint(
                offersView([OFFER], undefined, {
                    overlay,
                    stallName: 'Riverside Goods',
                    tokens: new Map([[TOKEN_ID, BEANS]]),
                    descriptions: new Map([[TOKEN_ID, 'Existing words']]),
                }),
            );
            const fold = root.querySelector(
                `[data-role="${prefix}-hex-fold"]`,
            ) as HTMLDetailsElement;
            expect(fold, prefix).not.toBeNull();
            expect(fold.tagName).toBe('DETAILS');
            expect(fold.querySelector('summary')!.textContent).toBe(copy.RECORD_BYTES_FOLD);
            // The probe opens every `<details>` before it measures, so the
            // protected hex is still guarded inside one.
            expect(fold.querySelector(`[data-role="${prefix}-hex"]`), prefix).not.toBeNull();
        }
    });

    it('the-phone-qr-is-a-desk-fold', () => {
        // A phone opens its own wallet by link; the code is for the other
        // device, so it is offered at desk width and folded even there.
        const { root } = paint(
            offersView([OFFER], undefined, {
                overlay: { kind: 'publish-name' },
                stallName: 'Riverside Goods',
            }),
        );
        const fold = root.querySelector('[data-role="publish-qr-fold"]') as HTMLDetailsElement;
        expect(fold).not.toBeNull();
        expect(fold.tagName).toBe('DETAILS');
        expect(fold.classList.contains('sheet-qr-fold')).toBe(true);
        expect(fold.querySelector('summary')!.textContent).toBe(copy.SCAN_WITH_PHONE_FOLD);
        expect(fold.querySelector('[data-role="publish-qr"] svg.qr')).not.toBeNull();

        // Painted only from 680px up. happy-dom lays nothing out, so the rule
        // is read from the sheet that carries it — the same way the hex wrap
        // rule is.
        const css = sheetCss();
        expect(
            /\.sheet-qr-fold\s*\{[^}]*display:\s*none/.test(css),
            'the phone-code fold is off below the desk width',
        ).toBe(true);
        const desk = css.split('@media (min-width: 680px)').slice(1).join('\n');
        expect(
            /\.sheet-qr-fold\s*\{[^}]*display:\s*block/.test(desk),
            'and back on at 680px',
        ).toBe(true);
    });
});

describe('a-shelf-suggests-the-shelves-that-exist', () => {
    /**
     * A free field with a datalist, never a closed select: the
     * heading is the seller's own words, and the ones they already used are a
     * suggestion rather than a vocabulary.
     */
    it('offers the stall’s own shelves without refusing a new one', () => {
        const other = '77'.repeat(32);
        const { root } = paint(
            offersView(
                [
                    OFFER,
                    { ...OFFER, outpoint: { txid: 'bc'.repeat(32), outIdx: 1 }, tokenId: other },
                ],
                undefined,
                {
                    overlay: { kind: 'describe' },
                    tokens: new Map([
                        [TOKEN_ID, BEANS],
                        [other, { ...BEANS, tokenId: other, name: 'Green Tea' }],
                    ]),
                    shelves: new Map([
                        [TOKEN_ID, 'Morning roast'],
                        [other, 'Leaf'],
                    ]),
                },
            ),
        );
        const field = root.querySelector('[data-role="describe-shelf"]') as HTMLInputElement;
        expect(field.tagName, 'a field, not a menu').toBe('INPUT');
        const list = root.querySelector('[data-role="describe-shelf-list"]') as HTMLElement;
        expect(list).not.toBeNull();
        expect(field.getAttribute('list')).toBe(list.id);
        expect(
            [...list.querySelectorAll('option')].map((o) => o.value),
            'every shelf this stall already uses, deduped and ordered',
        ).toEqual(['Leaf', 'Morning roast']);

        // A heading nobody has used yet still reaches the record.
        field.value = 'Brand new shelf';
        field.dispatchEvent(new Event('input'));
        expect(root.querySelector('[data-role="describe-hex"]')!.textContent).toBe(
            encodeDescriptionHex(TOKEN_ID, '', { shelf: 'Brand new shelf' }),
        );
    });
});

describe('a-payment-row-says-paid-and-never-sold', () => {
    /**
     * The chain proves money arrived. It proves nothing about delivery, and
     * the memo beside it is the payer's own words — so the row names the
     * payment, prints the claim as a claim, and reaches no verdict.
     */
    const PAID = {
        txid: 'ab'.repeat(32),
        kind: 'payment' as const,
        seenAtMs: 1_756_400_000_000,
        sats: 25_000_000n,
        payment: { tokenId: TOKEN_ID, quantity: 3n },
    };

    it('names the payment, the amount and who it went to', () => {
        const { root } = paint(
            offersView([OFFER], new Map([[TOKEN_ID, BEANS]]), {
                panel: 'activity',
                events: [PAID],
            }),
        );
        const kind = root.querySelector('.event-kind');
        expect(kind?.textContent).toBe(copy.eventPayment('250,000'));
        expect(kind?.textContent).toContain('to the seller');
        for (const word of ['sold', 'bought', 'Sold', 'Bought']) {
            expect(root.textContent, word).not.toContain(word);
        }
    });

    it('carries the claim and says it is one', () => {
        const { root } = paint(
            offersView([OFFER], new Map([[TOKEN_ID, BEANS]]), {
                panel: 'activity',
                events: [PAID],
            }),
        );
        const claim = root.querySelector('[data-role="payment-claim"]');
        expect(claim?.textContent).toBe(
            copy.paymentClaim('Roasted Beans', copy.paymentQuantity('3')),
        );
        expect(root.textContent).toContain(copy.EVENT_PAYMENT_CLAIM_LABEL);
        expect(root.textContent).toContain(copy.EVENT_PAYMENT_NOT_PROOF);
    });

    it('prints an unstated quantity as words and an unknown item as its id', () => {
        const { root } = paint(
            offersView([OFFER], new Map(), {
                panel: 'activity',
                events: [{ ...PAID, payment: { tokenId: TOKEN_ID } }],
            }),
        );
        const claim = root.querySelector('[data-role="payment-claim"]');
        expect(claim?.textContent).toBe(
            copy.paymentClaim(TOKEN_ID, copy.PAYMENT_QUANTITY_UNSTATED),
        );
    });

    it('says only "to the seller" when no amount could be added up', () => {
        const { root } = paint(
            offersView([OFFER], new Map([[TOKEN_ID, BEANS]]), {
                panel: 'activity',
                events: [{ ...PAID, sats: undefined }],
            }),
        );
        expect(root.querySelector('.event-kind')?.textContent).toBe(copy.EVENT_PAYMENT);
    });
});

/* The direct-payment rail: the surface, the sheet and the landing hint. */

const QUOTE_USD = { code: 'usd', exponent: 2, amount: 500n } as const;
const TOKEN_UNLISTED = '11'.repeat(32);
const PAY_TEA: TokenMeta = {
    tokenId: TOKEN_UNLISTED,
    name: 'Green Tea',
    ticker: 'PAY_TEA',
    decimals: 0,
    tokenType: { protocol: 'SLP', type: 'SLP_TOKEN_TYPE_FUNGIBLE' },
};
/** 1 XEC = $0.00002, so $5.00 is 250,000 XEC — 25,000,000 satoshis. */
const PAY_RATE = { rate: scaleRate(0.00002)!, atMs: 1_756_400_000_000 };

function payView(over: Partial<StallView> = {}): StallView {
    return offersView([OFFER], new Map([[TOKEN_ID, BEANS]]), {
        prices: new Map([[TOKEN_ID, QUOTE_USD]]),
        ...over,
    });
}

describe('the-pay-section-paints-under-the-shop-and-the-empty-screen', () => {
    /**
     * A quote is not gated on a listing: a stall with nothing listed and three
     * quotes is exactly the price-tag use this rail exists for. So the section
     * lives under the shop list **and** under the empty screen's message, and
     * it is absent entirely when there is nothing quoted.
     */
    it('paints the rows on a shop, with the chip and the seller’s own unit', () => {
        const { root } = paint(payView());
        const section = root.querySelector('[data-role="pay-section"]') as HTMLElement;
        expect(section).not.toBeNull();
        expect(section.textContent).toContain(copy.PAY_SEC_TITLE);
        expect(section.textContent).toContain(copy.PAY_SEC_LEDE);
        const rows = [...section.querySelectorAll('[data-role="pay-row"]')];
        expect(rows).toHaveLength(1);
        expect(rows[0]!.textContent).toContain(copy.SELLER_QUOTE_CHIP);
        expect(
            rows[0]!.querySelector('[data-role="seller-price"]')?.textContent,
        ).toBe('$5.00');
        // The seller's figure, and nothing computed beside it.
        expect(rows[0]!.querySelector('[data-role="fiat"]')).toBeNull();
        expect(rows[0]!.textContent).not.toContain('≈');
        expect(rows[0]!.textContent).not.toContain(PRICE_FROM);
        expect(
            (rows[0]!.querySelector('[data-role="pay-open"]') as HTMLElement).textContent,
        ).toBe(copy.PAY_OPEN);
    });

    it('paints under the empty screen too, and not at all with no quotes', () => {
        const empty = paint(payView({ fetch: { kind: 'empty' } })).root;
        expect(empty.querySelector('[data-role="pay-section"]')).not.toBeNull();

        const bare = paint(offersView([OFFER])).root;
        expect(bare.querySelector('[data-role="pay-section"]')).toBeNull();
        expect(bare.textContent).not.toContain(copy.PAY_SEC_TITLE);
    });

    it('opens the sheet for the row that was pressed', () => {
        const { root, h } = paint(payView());
        (
            root.querySelector('[data-role="pay-open"]') as HTMLButtonElement
        ).dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(h.onOpenPay).toHaveBeenCalledWith(TOKEN_ID);
    });

    it('points a listed row at the section without changing the route', () => {
        const { root, h } = paint(payView());
        const pointer = root.querySelector('[data-role="pay-pointer"]') as HTMLElement;
        expect(pointer.textContent).toBe(copy.PAY_POINTER);
        pointer.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(h.onOpenPay).not.toHaveBeenCalled();
        expect(h.onBuy).not.toHaveBeenCalled();
        // A token with no quote gets no pointer at all.
        const unquoted = paint(offersView([OFFER])).root;
        expect(unquoted.querySelector('[data-role="pay-pointer"]')).toBeNull();
    });

    it('prints an xec quote in the seller’s own unit, unconverted', () => {
        const { root } = paint(
            payView({
                prices: new Map([[TOKEN_ID, { code: 'xec', exponent: 2, amount: 500_000n }]]),
            }),
        );
        const figure = root.querySelector('[data-role="pay-row"] [data-role="seller-price"]');
        expect(figure?.textContent).toBe(`5,000.00 ${copy.XEC}`);
    });
});

describe('a-quoted-token-with-no-listing-is-not-silently-dropped', () => {
    /**
     * The pay set is every record the seller published, not the intersection
     * with what is listed on Agora. A sold-out listing used to take the quote
     * off the page with it, which is the whole point of a rail that does not
     * need a covenant.
     */
    it('paints a quoted token this stall does not list', () => {
        const { root } = paint(
            payView({
                tokens: new Map([
                    [TOKEN_ID, BEANS],
                    [TOKEN_UNLISTED, PAY_TEA],
                ]),
                prices: new Map([
                    [TOKEN_ID, QUOTE_USD],
                    [TOKEN_UNLISTED, { code: 'usd', exponent: 2, amount: 1_200n }],
                ]),
            }),
        );
        const rows = [...root.querySelectorAll('[data-role="pay-row"]')];
        expect(rows).toHaveLength(2);
        expect(rows.map((r) => r.textContent)).toEqual([
            expect.stringContaining('Roasted Beans'),
            expect.stringContaining('Green Tea'),
        ]);
    });

    it('refuses to quote a token that is not fungible', () => {
        const nft: TokenMeta = {
            tokenId: TOKEN_UNLISTED,
            name: 'Pixel #1',
            ticker: 'PX',
            decimals: 0,
            tokenType: { protocol: 'SLP', type: 'SLP_TOKEN_TYPE_NFT1_CHILD' },
        };
        const { root } = paint(
            payView({
                tokens: new Map([
                    [TOKEN_ID, BEANS],
                    [TOKEN_UNLISTED, nft],
                ]),
                prices: new Map([
                    [TOKEN_ID, QUOTE_USD],
                    [TOKEN_UNLISTED, { code: 'usd', exponent: 2, amount: 1_200n }],
                ]),
            }),
        );
        expect(root.querySelectorAll('[data-role="pay-row"]')).toHaveLength(1);
    });
});

describe('a-quoted-token-whose-meta-never-arrived-is-counted-not-painted', () => {
    /**
     * Metadata this page could not read is our gap, and a row built without it
     * could be an NFT — so it is not painted. Counted out loud, exactly like
     * the listings this page could not read: seven of ten shown, silently,
     * reads as seven quoted.
     */
    it('counts it in a line and paints no row for it', () => {
        const { root } = paint(
            payView({
                prices: new Map([
                    [TOKEN_ID, QUOTE_USD],
                    [TOKEN_UNLISTED, { code: 'usd', exponent: 2, amount: 1_200n }],
                ]),
            }),
        );
        expect(root.querySelectorAll('[data-role="pay-row"]')).toHaveLength(1);
        const note = root.querySelector('[data-role="pay-unreadable"]');
        expect(note?.textContent).toBe(copy.quotedUnreadable(1));
    });

    it('says nothing when every quoted token was read', () => {
        const { root } = paint(payView());
        expect(root.querySelector('[data-role="pay-unreadable"]')).toBeNull();
    });
});

describe('the-figure-on-screen-is-the-figure-in-the-link', () => {
    /**
     * On this sheet `[data-role="price"]` is the figure the payer signs — a
     * number this page derived, which is the one place §8's rule is inverted,
     * and stated. So it and the link are proved to come from one `bigint`
     * rather than from two calls that happen to agree today.
     */
    const sheet = (over: Partial<StallView> = {}) =>
        paint(payView({ overlay: { kind: 'pay', tokenId: TOKEN_ID }, payRate: PAY_RATE, ...over }));

    it('paints the same satoshis it composed the BIP21 from', () => {
        const { root } = sheet();
        const sats = satsForQuote(QUOTE_USD, 1n, PAY_RATE.rate)!;
        expect(sats).toBe(25_000_000n);
        const figure = root.querySelector('[data-role="pay"] [data-role="price"]');
        expect(figure?.textContent).toBe(formatXec(sats));
        const bip21 = payBip21(ADDR, sats, encodePaymentMemoHex(TOKEN_ID, 1n)!)!;
        expect(
            (root.querySelector('[data-role="pay-cashtab"]') as HTMLAnchorElement).href,
        ).toBe(cashtabPayUrl(ADDR, sats, encodePaymentMemoHex(TOKEN_ID, 1n)!));
        expect(
            (root.querySelector('[data-role="pay-wallet"]') as HTMLAnchorElement).href,
        ).toBe(payECashPayUrl(ADDR, sats, encodePaymentMemoHex(TOKEN_ID, 1n)!));
        expect(bip21).toContain('250000.00');
    });

    it('keeps the quote in its own role and paints no fiat node', () => {
        const { root } = sheet();
        const quote = root.querySelector('[data-role="pay"] [data-role="seller-price"]');
        expect(quote?.textContent).toBe(copy.payQuoteEquals('$5.00'));
        expect(root.querySelector('[data-role="pay"] [data-role="fiat"]')).toBeNull();
        const rate = root.querySelector('[data-role="pay"] [data-role="rate"]');
        expect(rate?.textContent).toContain('≈ at 1 XEC = $0.00002');
        expect(rate?.textContent).toContain('CoinGecko');
    });

    it('drops the rate entirely for an xec quote', () => {
        const { root } = sheet({
            prices: new Map([[TOKEN_ID, { code: 'xec', exponent: 2, amount: 500_000n }]]),
        });
        expect(root.querySelector('[data-role="pay"] [data-role="rate"]')).toBeNull();
        expect(root.querySelector('[data-role="pay-refresh"]')).toBeNull();
        expect(
            root.querySelector('[data-role="pay"] [data-role="price"]')?.textContent,
        ).toBe('5,000');
        expect(root.textContent).toContain(copy.PAY_XEC_QUOTE_NOTE);
    });

    it('composes nothing at all with no rate, and says why', () => {
        const { root } = sheet({ payRate: undefined });
        expect(root.querySelector('[data-role="pay-cashtab"]')).toBeNull();
        expect(root.querySelector('[data-role="pay-wallet"]')).toBeNull();
        expect(root.querySelector('[data-role="pay-qr"]')).toBeNull();
        expect(root.textContent).toContain(copy.PAY_NO_RATE_WHY);
        // The refresh control is the only way forward, and it is there.
        expect(root.querySelector('[data-role="pay-refresh"]')).not.toBeNull();
    });

    it('carries the fine print the rail is bound by', () => {
        const { root } = sheet();
        for (const line of [
            copy.PAY_NOTE_DIRECT,
            copy.PAY_FINE_MEMO,
            copy.PAY_FINE_SOME_WALLETS,
            copy.PAY_FINE_DELIVERY,
            copy.PAY_TOLERANCE_NONE,
        ]) {
            expect(root.textContent, line).toContain(line);
        }
        for (const word of ['Buy', 'bought', 'sold']) {
            expect(
                root.querySelector('[data-role="pay"]')?.textContent,
                word,
            ).not.toContain(word);
        }
    });

    it('states the seller’s tolerance where they published one', () => {
        const stated = sheet({
            prices: new Map([[TOKEN_ID, { ...QUOTE_USD, tolerancePct: 5 }]]),
        }).root;
        expect(stated.textContent).toContain(copy.payTolerance(5));
        const wide = sheet({
            prices: new Map([[TOKEN_ID, { ...QUOTE_USD, tolerancePct: 60 }]]),
        }).root;
        expect(wide.textContent).toContain(copy.PAY_TOLERANCE_WIDE);
    });

    it('multiplies by the quantity the buyer typed, in the figure and the link', () => {
        const { root } = sheet();
        const edit = root.querySelector('[data-role="pay-quantity-edit"]') as HTMLElement;
        edit.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        const field = root.querySelector('[data-role="pay-quantity"]') as HTMLInputElement;
        field.value = '3';
        field.dispatchEvent(new Event('input'));
        const sats = satsForQuote(QUOTE_USD, 3n, PAY_RATE.rate)!;
        expect(
            root.querySelector('[data-role="pay"] [data-role="price"]')?.textContent,
        ).toBe(formatXec(sats));
        expect(
            (root.querySelector('[data-role="pay-cashtab"]') as HTMLAnchorElement).href,
        ).toBe(cashtabPayUrl(ADDR, sats, encodePaymentMemoHex(TOKEN_ID, 3n)!));
    });
});

describe('a-sub-dust-quote-has-no-pay-link', () => {
    /**
     * Below the dust floor the network refuses the output, so a link composed
     * from it fails inside the wallet after the buyer has read the page and
     * pressed Pay. The sheet composes nothing and says which way out there is.
     */
    it('paints one line instead of a link or a code', () => {
        const { root } = paint(
            payView({
                overlay: { kind: 'pay', tokenId: TOKEN_ID },
                payRate: PAY_RATE,
                // One cent at this rate is 33,334 sats — well over dust — so
                // the quote itself has to be tiny: 1 XEC is 100 satoshis.
                prices: new Map([[TOKEN_ID, { code: 'xec', exponent: 2, amount: 100n }]]),
            }),
        );
        expect(root.textContent).toContain(copy.PAY_SUB_DUST);
        expect(root.querySelector('[data-role="pay-cashtab"]')).toBeNull();
        expect(root.querySelector('[data-role="pay-qr"]')).toBeNull();
    });
});

describe('a-stale-rate-is-refetched-on-pay-and-a-jump-needs-a-second-press', () => {
    /**
     * The press is where a stale rate is caught, and the press never opens a
     * wallet afterwards: WebKit blocks `window.open` past an awaited fetch and
     * returns `null` whether it blocked or not, so an auto-open would be a
     * silent no-op on every iPhone. A second press is always required.
     */
    const stale = { rate: scaleRate(0.00002)!, atMs: Date.now() - 300_000 };

    it('refetches, repaints in place and asks for the press again', async () => {
        const view = payView({
            overlay: { kind: 'pay', tokenId: TOKEN_ID },
            payRate: stale,
        });
        const root = document.createElement('div');
        const h = {
            ...handlers(),
            onPayRate: vi.fn(async () => ({
                // A move well past the default valve: half the price per XEC
                // doubles the satoshis.
                rate: scaleRate(0.00001)!,
                atMs: Date.now(),
            })),
        };
        renderStall(root, view, h);
        // The buyer's own quantity, which must survive the refetch.
        (
            root.querySelector('[data-role="pay-quantity-edit"]') as HTMLElement
        ).dispatchEvent(new MouseEvent('click', { bubbles: true }));
        const field = root.querySelector('[data-role="pay-quantity"]') as HTMLInputElement;
        field.value = '3';
        field.dispatchEvent(new Event('input'));

        const link = root.querySelector('[data-role="pay-cashtab"]') as HTMLAnchorElement;
        const press = new MouseEvent('click', { bubbles: true, cancelable: true });
        link.dispatchEvent(press);
        expect(press.defaultPrevented, 'the stale press opened nothing').toBe(true);
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(h.onPayRate).toHaveBeenCalledTimes(1);
        expect(root.querySelector('[data-role="pay-valve"]')?.textContent).toBe(
            copy.PAY_RATE_MOVED,
        );
        expect(
            (root.querySelector('[data-role="pay-quantity"]') as HTMLInputElement).value,
            'the quantity is the buyer’s and survives the refetch',
        ).toBe('3');
        const fresh = satsForQuote(QUOTE_USD, 3n, scaleRate(0.00001)!)!;
        expect(
            root.querySelector('[data-role="pay"] [data-role="price"]')?.textContent,
        ).toBe(formatXec(fresh));
        expect(
            (root.querySelector('[data-role="pay-cashtab"]') as HTMLAnchorElement).href,
        ).toBe(cashtabPayUrl(ADDR, fresh, encodePaymentMemoHex(TOKEN_ID, 3n)!));
    });

    it('says the rate merely refreshed when the figure did not move', async () => {
        const root = document.createElement('div');
        const h = {
            ...handlers(),
            onPayRate: vi.fn(async () => ({ rate: stale.rate, atMs: Date.now() })),
        };
        renderStall(
            root,
            payView({ overlay: { kind: 'pay', tokenId: TOKEN_ID }, payRate: stale }),
            h,
        );
        (root.querySelector('[data-role="pay-cashtab"]') as HTMLAnchorElement).dispatchEvent(
            new MouseEvent('click', { bubbles: true, cancelable: true }),
        );
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(root.querySelector('[data-role="pay-valve"]')?.textContent).toBe(
            copy.PAY_RATE_REFRESHED,
        );
    });

    it('says so when no fresh price arrived', async () => {
        const root = document.createElement('div');
        const h = { ...handlers(), onPayRate: vi.fn(async () => undefined) };
        renderStall(
            root,
            payView({ overlay: { kind: 'pay', tokenId: TOKEN_ID }, payRate: stale }),
            h,
        );
        (root.querySelector('[data-role="pay-cashtab"]') as HTMLAnchorElement).dispatchEvent(
            new MouseEvent('click', { bubbles: true, cancelable: true }),
        );
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(root.querySelector('[data-role="pay-valve"]')?.textContent).toBe(
            copy.PAY_RATE_UNAVAILABLE,
        );
        expect(root.querySelector('[data-role="pay-cashtab"]')).toBeNull();
    });

    it('lets a fresh rate through untouched', () => {
        const root = document.createElement('div');
        const h = { ...handlers(), onPayRate: vi.fn(async () => undefined) };
        renderStall(
            root,
            payView({
                overlay: { kind: 'pay', tokenId: TOKEN_ID },
                payRate: { rate: scaleRate(0.00002)!, atMs: Date.now() },
            }),
            h,
        );
        const press = new MouseEvent('click', { bubbles: true, cancelable: true });
        (root.querySelector('[data-role="pay-cashtab"]') as HTMLAnchorElement).dispatchEvent(
            press,
        );
        expect(press.defaultPrevented).toBe(false);
        expect(h.onPayRate).not.toHaveBeenCalled();
    });
});

describe('a-pay-qr-never-carries-a-stale-amount', () => {
    /**
     * A phone can scan a code an hour after it was painted, and the amount in
     * it was derived from a rate that has moved since. The code has the rate's
     * own lifetime, and after that it is taken away rather than left scannable.
     */
    it('swaps the code for a line once the rate ages out', () => {
        vi.useFakeTimers();
        try {
            const root = document.createElement('div');
            renderStall(
                root,
                payView({
                    overlay: { kind: 'pay', tokenId: TOKEN_ID },
                    payRate: { rate: scaleRate(0.00002)!, atMs: Date.now() },
                }),
                handlers(),
            );
            expect(root.querySelector('[data-role="pay-qr"]')).not.toBeNull();
            vi.advanceTimersByTime(PAY_RATE_MAX_AGE_MS + 1_000);
            expect(root.querySelector('[data-role="pay-qr"]')).toBeNull();
            expect(root.textContent).toContain(copy.PAY_QR_STALE);
        } finally {
            vi.useRealTimers();
        }
    });

    it('never ages an xec quote, which has no rate in it', () => {
        vi.useFakeTimers();
        try {
            const root = document.createElement('div');
            renderStall(
                root,
                payView({
                    overlay: { kind: 'pay', tokenId: TOKEN_ID },
                    prices: new Map([
                        [TOKEN_ID, { code: 'xec', exponent: 2, amount: 500_000n }],
                    ]),
                }),
                handlers(),
            );
            vi.advanceTimersByTime(PAY_RATE_MAX_AGE_MS * 4);
            expect(root.querySelector('[data-role="pay-qr"]')).not.toBeNull();
            expect(root.textContent).not.toContain(copy.PAY_QR_STALE);
        } finally {
            vi.useRealTimers();
        }
    });

    it('opens the fold on a desk and leaves it closed on a phone', () => {
        const withWidth = (matches: boolean): HTMLElement => {
            vi.stubGlobal('matchMedia', () => ({ matches }));
            const root = document.createElement('div');
            renderStall(
                root,
                payView({
                    overlay: { kind: 'pay', tokenId: TOKEN_ID },
                    payRate: { rate: scaleRate(0.00002)!, atMs: Date.now() },
                }),
                handlers(),
            );
            vi.unstubAllGlobals();
            return root;
        };
        expect(
            (withWidth(true).querySelector('[data-role="pay-qr-fold"]') as HTMLDetailsElement)
                .open,
        ).toBe(true);
        expect(
            (withWidth(false).querySelector('[data-role="pay-qr-fold"]') as HTMLDetailsElement)
                .open,
        ).toBe(false);
        // No `matchMedia` at all is the closed state, never a throw.
        vi.stubGlobal('matchMedia', undefined);
        const root = document.createElement('div');
        renderStall(
            root,
            payView({
                overlay: { kind: 'pay', tokenId: TOKEN_ID },
                payRate: { rate: scaleRate(0.00002)!, atMs: Date.now() },
            }),
            handlers(),
        );
        vi.unstubAllGlobals();
        expect(
            (root.querySelector('[data-role="pay-qr-fold"]') as HTMLDetailsElement).open,
        ).toBe(false);
    });
});

describe('the-editor-writes-presets-only-and-reads-anything', () => {
    /**
     * The tolerance is written when the seller types a figure or presses a
     * preset over a carried one. An untouched carried price is restated
     * verbatim, byte or no byte — the encoder invents nothing.
     */
    const sheet = (over: Partial<StallView> = {}) =>
        paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                tokens: new Map([[TOKEN_ID, BEANS]]),
                overlay: { kind: 'describe' },
                stallName: 'Riverside Goods',
                ...over,
            }),
        );

    it('offers four presets, opens on 2%, and writes it with a typed figure', () => {
        const { root } = sheet();
        const seg = root.querySelector('[data-role="describe-tolerance"]') as HTMLElement;
        expect(seg).not.toBeNull();
        const presets = [...seg.querySelectorAll('[data-pct]')].map((b) =>
            b.getAttribute('data-pct'),
        );
        expect(presets).toEqual(['1', '2', '5', '10']);
        expect(seg.querySelector('[aria-pressed="true"]')?.getAttribute('data-pct')).toBe('2');
        expect(root.textContent).toContain(copy.DESC_TOLERANCE_HINT);
        expect(root.textContent).toContain(copy.DESC_TWO_PRICES);

        const amount = root.querySelector('[data-role="describe-price"]') as HTMLInputElement;
        amount.value = '12.50';
        amount.dispatchEvent(new Event('input'));
        expect(root.querySelector('[data-role="describe-hex"]')?.textContent).toBe(
            encodeDescriptionHex(TOKEN_ID, '', {
                price: { code: 'usd', exponent: 2, amount: 1250n, tolerancePct: 2 },
            }),
        );
        expect(root.querySelector('[data-role="describe-summary"]')?.textContent).toContain(
            copy.SUMMARY_TOLERANCE,
        );
    });

    it('hides the control under an xec quote and writes no byte there', () => {
        const { root } = sheet();
        (
            root.querySelector('[data-role="describe-unit-xec"]') as HTMLButtonElement
        ).dispatchEvent(new MouseEvent('click', { bubbles: true }));
        const amount = root.querySelector('[data-role="describe-price"]') as HTMLInputElement;
        amount.value = '450.00';
        amount.dispatchEvent(new Event('input'));
        expect(
            (root.querySelector('[data-role="describe-tolerance"]') as HTMLElement).hidden,
        ).toBe(true);
        expect(root.querySelector('[data-role="describe-hex"]')?.textContent).toBe(
            encodeDescriptionHex(TOKEN_ID, '', {
                price: { code: 'xec', exponent: 2, amount: 45_000n },
            }),
        );
    });

    it('reads a published value none of the presets can express, and keeps it', () => {
        const carried = { code: 'usd', exponent: 2, amount: 500n, tolerancePct: 15 } as const;
        const { root } = sheet({ prices: new Map([[TOKEN_ID, carried]]) });
        const seg = root.querySelector('[data-role="describe-tolerance"]') as HTMLElement;
        expect(seg.querySelector('[aria-pressed="true"]')).toBeNull();
        expect(
            [...seg.querySelectorAll('button')].every((b) => b.disabled),
            'a value this sheet cannot express takes no input',
        ).toBe(true);
        expect(root.textContent).toContain(copy.DESC_TOLERANCE_FIXED);
        // Untouched, the record is restated exactly as it stands.
        const field = root.querySelector('[data-role="describe-text"]') as HTMLTextAreaElement;
        field.value = 'New words';
        field.dispatchEvent(new Event('input'));
        expect(root.querySelector('[data-role="describe-hex"]')?.textContent).toBe(
            encodeDescriptionHex(TOKEN_ID, 'New words', { price: carried }),
        );
    });

    it('says none is stated over a carried price with no byte, and writes one on a press', () => {
        const carried = { code: 'usd', exponent: 2, amount: 500n } as const;
        const { root } = sheet({ prices: new Map([[TOKEN_ID, carried]]) });
        const seg = root.querySelector('[data-role="describe-tolerance"]') as HTMLElement;
        expect(seg.querySelector('[aria-pressed="true"]')).toBeNull();
        expect(root.textContent).toContain(copy.DESC_TOLERANCE_NONE);
        (seg.querySelector('[data-pct="5"]') as HTMLButtonElement).dispatchEvent(
            new MouseEvent('click', { bubbles: true }),
        );
        expect(root.querySelector('[data-role="describe-hex"]')?.textContent).toBe(
            encodeDescriptionHex(TOKEN_ID, '', {
                price: { ...carried, tolerancePct: 5 },
            }),
        );
    });
});

describe('retyping-a-figure-keeps-a-carried-tolerance', () => {
    /**
     * Carry is keyed on the value being one of the presets, never on the unit:
     * a seller fixing a typo in their figure must not lose the margin they
     * published with it.
     */
    it('keeps a preset value through a retyped figure', () => {
        const carried = { code: 'usd', exponent: 2, amount: 500n, tolerancePct: 5 } as const;
        const { root } = paint(
            idlePubkey({
                fetch: { kind: 'offers', offers: [OFFER] },
                tokens: new Map([[TOKEN_ID, BEANS]]),
                overlay: { kind: 'describe' },
                stallName: 'Riverside Goods',
                prices: new Map([[TOKEN_ID, carried]]),
            }),
        );
        const seg = root.querySelector('[data-role="describe-tolerance"]') as HTMLElement;
        expect(seg.querySelector('[aria-pressed="true"]')?.getAttribute('data-pct')).toBe('5');
        const amount = root.querySelector('[data-role="describe-price"]') as HTMLInputElement;
        amount.value = '6.00';
        amount.dispatchEvent(new Event('input'));
        expect(root.querySelector('[data-role="describe-hex"]')?.textContent).toBe(
            encodeDescriptionHex(TOKEN_ID, '', {
                price: { code: 'usd', exponent: 2, amount: 600n, tolerancePct: 5 },
            }),
        );
    });
});

describe('a-landing-link-drops-the-search', () => {
    /**
     * `shareUrl()` keeps `location.search` so a printed `?m=` survives being
     * shared. A landing link must not: on a broadcast URL that would produce
     * `…&cards=quotes?pay=…`, a link into the stream overlay rather than to
     * the page with the note on it.
     */
    it('builds from origin and path only', () => {
        const path = stallPath(PK);
        for (const search of ['?view=broadcast&cards=quotes', `?m=${'ab'.repeat(32)}`, '']) {
            window.history.replaceState(null, '', `${path}${search}`);
            expect(stallBaseUrl(), search).toBe(`${location.origin}${path}`);
            expect(payLandingUrl(stallBaseUrl(), TOKEN_ID), search).toBe(
                `${location.origin}${path}?pay=${TOKEN_ID.slice(0, 12)}`,
            );
        }
        window.history.replaceState(null, '', `${path}?m=${'ab'.repeat(32)}`);
        const shared = paint(offersView([OFFER], undefined, { panel: 'studio' })).root;
        expect(
            (shared.querySelector('.share-url') as HTMLInputElement).value,
            'the share link still keeps it',
        ).toContain('?m=');
    });
});

describe('a-pay-hint-that-opened-nothing-says-which-kind-of-nothing', () => {
    /**
     * Two sentences, and only one of them is about the seller: a complete read
     * that holds no such quote, against this page failing to read the records
     * at all. Collapsing them is §4's empty-versus-unreachable mistake on a
     * new surface.
     */
    it('says "not quoted" over a shop that was read', () => {
        const { root } = paint(payView({ payHintNote: 'unknown' }));
        expect(root.textContent).toContain(copy.PAY_HINT_UNKNOWN);
        expect(root.textContent).not.toContain(copy.PAY_HINT_UNREAD);
    });

    it('says "could not read" on every screen that failed', () => {
        for (const view of [
            payView({
                payHintNote: 'unread',
                fetch: { kind: 'unreachable', triedAtMs: 1_756_400_000_000, hosts: [] },
            }),
            payView({ payHintNote: 'unread', fetch: { kind: 'unreadable', triedAtMs: 1, returned: 2 } }),
            {
                route: { kind: 'unresolvable' as const, address: ADDR },
                overlay: { kind: 'idle' as const },
                tokens: new Map(),
                payHintNote: 'unread' as const,
            },
        ]) {
            const { root } = paint(view);
            expect(root.textContent).toContain(copy.PAY_HINT_UNREAD);
            expect(root.textContent).not.toContain(copy.PAY_HINT_UNKNOWN);
        }
    });
});
