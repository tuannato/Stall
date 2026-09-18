import './window.css';
import { cashtabTokenUrl } from '../domain/cashtab';
import { formatXec } from '../domain/money';
import { payLandingUrl } from '../domain/route';
import type { StallOffer, StallView, WindowParams } from '../domain/state';
import { offersWithinLock } from '../domain/window';
import * as copy from './copy';
import { marqueeNode } from './marquee';
import type { TokenListing } from './render';
import {
    cheapestOf,
    header,
    itemIcon,
    listingsInShopOrder,
    qrSvg,
    quoteFigure,
    quotedItems,
    stallBaseUrl,
    tokenName,
} from './render';
import { ICON_HERO_SIZE } from '../domain/icons';

/**
 * The shop window: this stall on a screen in a physical shop.
 *
 * A mode of the stall, not a second product. The sign, the row anatomy, the
 * looks and every decoration are the ones already shipped — what changes is
 * the scale and what is left out, which is why a look dresses this screen
 * without anybody drawing a thing for it.
 *
 * **No controls, ever**, the broadcast's contract for the broadcast's reason:
 * a screen nobody attends must not be navigable into a state the seller then
 * has to walk over and fix. The dock, the footer, the rail tabs and the row
 * buttons are not hidden here — they are never built. Scrolling needs no
 * control and scanning needs no control, so nothing is missing.
 *
 * That costs one duplication, stated rather than hidden: the row below mirrors
 * `offerRow`'s anatomy in non-interactive elements. It wears the same classes
 * on purpose — `.item`, `.item-head`, `.item-ic`, `.item-b`, `.item-n`,
 * `.item-p`, `.item-a`, `.item-x` — so every look's own rules reach it, and
 * `the-window-row-wears-the-shop-row-anatomy` fails when the two drift.
 */

/** The QR's box, in px. Both destinations clear the project's own bracket here. */
export const WINDOW_QR_PX = 360;

/**
 * Which code a row carries, and it is not the same code on the two rails.
 *
 * A **quote** goes to this page's own pay sheet: `payLandingUrl` writes
 * `?pay=<prefix>`, which `applyPayHint` resolves against `quotedItems` and
 * opens the sheet for. That road is shipped and tested.
 *
 * A **listing** goes to Cashtab's token page — the destination the Buy control
 * on the item face already takes, `action`-less as §2 requires, where every
 * offer is listed and the buyer picks a row. `applyPayHint` would answer
 * `PAY_HINT_UNKNOWN` for a listing, because a covenant is not a quote, so
 * pointing a listing's code at this page would print "this stall does not
 * quote that" to somebody standing in the shop.
 *
 * Two things this cannot promise and so does not say (`WINDOW_SCAN_ITEM` is
 * "open", never "buy"): Cashtab's `prepareBuyableOffers` drops offers this
 * page can paint, so the row may be missing from the page its own code opens
 * (§10); and that page lists every maker's offers, not this seller's alone,
 * which is §2's deliberate refusal of `action=BUY`.
 */
export function windowItemLink(tokenId: string, rail: 'listing' | 'quote'): string | undefined {
    return rail === 'quote'
        ? payLandingUrl(stallBaseUrl(), tokenId)
        : cashtabTokenUrl(tokenId);
}

/** The shop's own link: one code for a whole catalogue, in `browse`. */
function shopLink(): string {
    return stallBaseUrl();
}

function codePlate(text: string, caption: string, cls: string): HTMLElement {
    const box = el('div', cls);
    box.append(qrSvg(text, caption));
    box.append(el('span', 'sw-cap', caption));
    return box;
}

function el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    cls?: string,
    text?: string,
): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    if (cls !== undefined) {
        node.className = cls;
    }
    if (text !== undefined) {
        node.textContent = text;
    }
    return node;
}

/** A listing, as the window paints it: picture, name, the covenant's figure. */
function listingRow(listing: TokenListing, view: StallView, withCode: boolean): HTMLElement {
    const offer = cheapestOf(listing);
    const name = tokenName(view.tokens, offer.tokenId);
    const card = el('div', 'item');
    const head = el('div', 'item-head sw-row');
    head.append(itemIcon(offer.tokenId, name, undefined, ICON_HERO_SIZE));
    const info = el('span', 'item-b');
    info.append(marqueeNode(el('span', 'item-n', name), 'name', offer.tokenId));
    head.append(info);

    const price = el('span', 'item-p');
    const amount = el('span', 'item-a');
    amount.append(el('span', 'item-from', copy.PRICE_FROM));
    const figure = el('span', 'item-x', formatXec(offer.askedSats));
    figure.setAttribute('data-role', 'price');
    amount.append(figure);
    amount.append(el('span', 'item-u', copy.XEC));
    price.append(amount);
    head.append(price);

    if (withCode) {
        const link = windowItemLink(offer.tokenId, 'listing');
        if (link !== undefined) {
            head.append(codePlate(link, copy.WINDOW_SCAN_ITEM, 'sw-qr'));
        }
    }
    card.append(head);
    return card;
}

/** A quote, as the window paints it: the seller's own figure and their words. */
function quoteRow(
    item: { tokenId: string; price: Parameters<typeof quoteFigure>[0]; words?: string },
    view: StallView,
    withCode: boolean,
): HTMLElement {
    const name = tokenName(view.tokens, item.tokenId);
    const card = el('div', 'item');
    const head = el('div', 'item-head item-head-q sw-row');
    head.append(itemIcon(item.tokenId, name, undefined, ICON_HERO_SIZE));
    const info = el('span', 'item-b');
    info.append(marqueeNode(el('span', 'item-n', name), 'name', item.tokenId));
    head.append(info);

    const price = el('span', 'item-p');
    const amount = el('span', 'item-a');
    const figure = el('span', 'item-x', quoteFigure(item.price));
    figure.setAttribute('data-role', 'seller-price');
    amount.append(figure);
    price.append(amount);
    head.append(price);

    if (withCode) {
        const link = windowItemLink(item.tokenId, 'quote');
        if (link !== undefined) {
            head.append(codePlate(link, copy.WINDOW_SCAN_ITEM, 'sw-qr'));
        }
    }
    card.append(head);

    // The seller's own words, on the rail where the item is off-chain and the
    // words ARE the item. Cut lines run; `marqueeNode` decides which.
    const foot = el('div', 'item-foot');
    const words = item.words ?? '';
    if (words === '') {
        foot.append(el('span', 'item-foot-words fine', copy.QUOTE_NO_WORDS_LINE));
    } else {
        const line = el('span', 'item-foot-words', words);
        line.setAttribute('data-role', 'quote-words');
        foot.append(marqueeNode(line, 'words', item.tokenId));
    }
    card.append(foot);
    return card;
}

/**
 * The offers this screen paints, after the freeze.
 *
 * Listings only — a quote cannot be planted, so there is nothing for a freeze
 * to refuse on that rail (`src/domain/window.ts`).
 */
export function windowListings(view: StallView, params: WindowParams): TokenListing[] {
    const all = listingsInShopOrder(view);
    if (params.upto === undefined) {
        return all;
    }
    const kept = new Set(
        offersWithinLock(
            all.map((l) => cheapestOf(l)) as readonly StallOffer[],
            params.upto,
            view.windowLock,
        ).map((o) => o.tokenId),
    );
    return all.filter((l) => kept.has(l.tokenId));
}

/**
 * Which rail is on screen right now.
 *
 * `all` **rotates**; it never merges. A covenant's asked amount beside a
 * seller's own quote is the one pairing `the-two-rails-never-paint-on-one-screen`
 * forbids, and a screen nobody can question is the worst place to break it.
 * The driver moves `view.windowRail`; this only reads it.
 */
export function windowRail(view: StallView, params: WindowParams): 'listings' | 'quotes' {
    if (params.show !== 'all') {
        return params.show;
    }
    return view.windowRail ?? 'listings';
}

/** The scrolling half of the screen, for the mode that is on. */
export function renderShopWindow(view: StallView, params: WindowParams): HTMLElement {
    const scroll = el('div', 'stall-scroll sw');
    scroll.setAttribute('data-role', 'shop-window');
    scroll.setAttribute('data-mode', params.mode);
    scroll.setAttribute('data-show', params.show);

    scroll.append(
        header(view.stallName, undefined, undefined, view.tagline, undefined),
    );

    const body = el('main', 'stall-body');
    const strip = el('div', 'items sw-strip');
    const rail = windowRail(view, params);
    const cycle = params.mode === 'cycle';

    if (rail === 'quotes') {
        const items = quotedItems(view);
        const at = cycle ? [items[windowCursor(view, items.length)]].filter(Boolean) : items;
        for (const item of at) {
            strip.append(quoteRow(item!, view, cycle));
        }
    } else {
        const items = windowListings(view, params);
        const at = cycle ? [items[windowCursor(view, items.length)]].filter(Boolean) : items;
        for (const listing of at) {
            strip.append(listingRow(listing!, view, cycle));
        }
    }
    body.append(strip);

    // A catalogue gets ONE code — the shop's. Five identical plates down a wall
    // read as a wall of codes rather than as goods, and a code per row at the
    // size this screen needs would leave no room for the goods themselves.
    if (!cycle) {
        body.append(codePlate(shopLink(), copy.WINDOW_SCAN_SHOP, 'sw-plate'));
    }
    scroll.append(body);
    scroll.append(statusBar(view, params, rail));
    return scroll;
}

/** Where the carousel is, clamped to a list that may have shrunk under it. */
function windowCursor(view: StallView, length: number): number {
    if (length === 0) {
        return 0;
    }
    return (view.windowCursor ?? 0) % length;
}

/**
 * What the screen is showing, and how fresh it is.
 *
 * The freshness line exists because nothing else on an unattended screen can
 * say it: `chronik-client` sends no ping, a half-open socket fires no `close`,
 * and the one recovery path that saves every other case — `visibilitychange`
 * into `resume()` — never fires on a kiosk that is visible around the clock.
 *
 * **No time, no line.** A screen that could not date its own read prints
 * nothing rather than "just now", which is §5's rule about a record this page
 * cannot date, applied where the claim is about our own reading.
 */
function statusBar(
    view: StallView,
    params: WindowParams,
    rail: 'listings' | 'quotes',
): HTMLElement {
    const bar = el('div', 'sw-status');
    const left = el('span', 'sw-state', copy.windowState(rail, params.upto));
    left.setAttribute('data-role', 'window-state');
    bar.append(left);
    const fresh = copy.windowFreshness(view.readAtMs, Date.now());
    if (fresh !== undefined) {
        const right = el('span', 'sw-fresh', fresh);
        right.setAttribute('data-role', 'window-fresh');
        bar.append(right);
    }
    return bar;
}
