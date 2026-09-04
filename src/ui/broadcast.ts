/**
 * The stream overlay. One skeleton for both presets. Chain-derived strings
 * reach the DOM through textContent only — same freeze as the theme module.
 */
import type { TokenPrice } from '../domain/description';
import { XEC_PRICE_CODE } from '../domain/description';
import { satsForQuote } from '../domain/fiat';
import { fitsQr } from '../domain/qr';
import { DUST_SATS, formatAtoms, formatXec, isUnbuyable } from '../domain/money';
import { payLandingUrl, stallPath } from '../domain/route';
import type { StallView } from '../domain/state';
import { overlayTierCharCeilings } from '../domain/theme';
import * as copy from './copy';
import type { TokenListing } from './render';
import {
    cheapestOf,
    identityOf,
    knownDecimals,
    listingsInShopOrder,
    paintedThemeId,
    priceTier,
    qrSvg,
    quoteFigure,
    quotedItems,
    stallBaseUrl,
    tokenName,
    tokenTicker,
} from './render';

function el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className?: string,
    text?: string,
): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    if (className !== undefined && className !== '') {
        node.className = className;
    }
    if (text !== undefined) {
        node.textContent = text;
    }
    return node;
}

/**
 * One card slot's content: a listing from the shop's book, or one of the
 * seller's own quotes. **One card, one kind** — the covenant's asked amount
 * and a quote are two different transactions, and a viewer who scans a code
 * has no way to ask which of them they were looking at.
 */
export type BroadcastCard =
    | { kind: 'listing'; tokenId: string; listing: TokenListing }
    | { kind: 'quote'; tokenId: string; price: TokenPrice };

/**
 * The list the carousel indexes, and the only place it is derived.
 *
 * The shop's listings in shop order, or the pay set when the link asked for
 * `cards=quotes`. Every cursor site asks this one function: a list derived
 * anywhere else is how the cursor and the card drift apart.
 *
 * **An empty quote set is the listings, silently.** Nothing on a stream can be
 * clicked, so a card saying the switch found nothing would be our own state
 * printed over somebody's video — and this is not even a failure: it is a
 * seller who has published no quote this page can paint.
 */
export function broadcastCards(view: StallView): BroadcastCard[] {
    if (view.broadcast?.cards === 'quotes') {
        const quotes = quotedItems(view)
            .filter((item) => isPayableHere(item.price))
            .map(
                (item): BroadcastCard => ({
                    kind: 'quote',
                    tokenId: item.tokenId,
                    price: item.price,
                }),
            );
        if (quotes.length > 0) {
            return quotes;
        }
    }
    return listingsInShopOrder(view).map((listing) => ({
        kind: 'listing',
        tokenId: listing.tokenId,
        listing,
    }));
}

/**
 * Whether a scan of this quote can reach a payment at all.
 *
 * Under `DUST_SATS` the network will not relay the output, so the page the
 * code opens composes nothing and the scan ends in a sentence rather than a
 * payment. An XEC quote is decided here — no rate is involved in one — while a
 * quote in any other unit needs a rate this overlay deliberately does not
 * hold, so it is shown and the landing page says what it finds.
 */
function isPayableHere(price: TokenPrice): boolean {
    if (price.code !== XEC_PRICE_CODE) {
        return true;
    }
    const sats = satsForQuote(price, 1n, undefined);
    return sats !== undefined && sats >= DUST_SATS;
}

/**
 * What a pulse compares: the same card, showing a different figure. A string
 * because the two rails count in different units — satoshis a covenant
 * encodes, and minor units a seller wrote.
 */
export function broadcastFigure(card: BroadcastCard): string {
    return card.kind === 'listing'
        ? String(cheapestOf(card.listing).askedSats)
        : `${card.price.code} ${card.price.exponent} ${card.price.amount}`;
}

function stallNameOf(view: StallView): string | undefined {
    if (view.stallName !== undefined && view.stallName !== '') {
        return view.stallName;
    }
    return identityOf(view);
}

/**
 * Head plate + QR plate, no chrome. The card is the shop's own first
 * (or cursor) listing; our failure never prints.
 */
export function renderBroadcastView(view: StallView): HTMLElement {
    const params = view.broadcast!;
    const root = el('div', 'bc');
    root.setAttribute('data-role', 'broadcast');
    root.setAttribute('data-preset', params.preset);
    root.setAttribute('data-mode', params.mode);
    const state = view.broadcastState ?? (params.mode === 'fixed' ? 'live' : 'rest');
    root.setAttribute('data-state', state);

    const head = el('div', 'plate bc-head');
    head.append(el('div', 'bc-brand', copy.BROADCAST_BRAND));
    const name = stallNameOf(view);
    if (name !== undefined) {
        const nm = el('div', 'bc-name', name);
        nm.setAttribute('data-role', 'stall-name');
        head.append(nm);
    }

    /*
     * A card is mounted only over a book this page actually read. `empty` is
     * one of those: a quote needs no covenant, so a stall with nothing listed
     * and one quote is the price-tag case the pay rail exists for, and the
     * listings simply have no card there. Our failures mount nothing at all.
     */
    const fetch = view.fetch;
    const definite = fetch?.kind === 'offers' || fetch?.kind === 'empty';
    let shown: BroadcastCard | undefined;
    let ext: HTMLElement | undefined;
    if (params.preset !== 'rail' && state !== 'rest' && definite) {
        const cards = broadcastCards(view);
        if (cards.length > 0) {
            const n = cards.length;
            const cursor = (((view.broadcastCursor ?? 0) % n) + n) % n;
            shown = cards[cursor]!;
            ext = el('div', 'bc-ext');
            if (view.broadcastStepped === true) {
                ext.classList.add('in');
            }
            ext.append(
                shown.kind === 'listing'
                    ? listingCard(view, shown.listing)
                    : quoteCard(view, shown.price, shown.tokenId),
            );
            if (n > 1) {
                ext.append(el('div', 'bc-more', copy.broadcastMore(n - 1)));
            }
        }
    }

    // "Nothing listed yet" is about the Agora book, and it is not printed over
    // a card: a quote card stands on a stall with nothing listed, and the two
    // together would tell a viewer the shop is empty while showing them
    // something they can pay for.
    if (fetch?.kind === 'empty' && ext === undefined) {
        head.append(el('div', 'bc-empty', copy.BROADCAST_EMPTY));
    }
    if (ext !== undefined) {
        head.append(ext);
    }

    root.append(head);

    const qrp = el('div', 'plate bc-qrp');
    /*
     * One code on the frame, never two: while a quote card is up, the code is
     * that item's landing link rather than the stall's own. It is a link to
     * this page and not a payment URI on purpose — a raw BIP21 drops whoever
     * scanned it into a wallet holding an amount and a hex memo nobody
     * explained to them, and it carries no amount to go stale on a stream.
     *
     * The base drops the search (`stallBaseUrl`), because this page's own URL
     * carries the broadcast params and a link built over them would open the
     * overlay it was scanned from.
     */
    const landing =
        shown?.kind === 'quote'
            ? payLandingUrl(stallBaseUrl(), shown.tokenId)
            : undefined;
    const identity = identityOf(view);
    const shop =
        identity === undefined ? undefined : `${location.origin}${stallPath(identity)}`;
    const href = landing ?? shop;
    if (href !== undefined && fitsQr(href)) {
        const svg = qrSvg(
            href,
            landing === undefined ? copy.SHARE_QR_ALT : copy.BROADCAST_QUOTE_QR_ALT,
        );
        svg.setAttribute('data-role', 'qr');
        qrp.append(svg);
    }
    qrp.append(el('div', 'bc-cap', copy.BROADCAST_CAPTION));
    root.append(qrp);
    return root;
}

/** The shop's own card: the covenant's asked amount, and what is left of it. */
function listingCard(view: StallView, listing: TokenListing): HTMLElement {
    const offer = cheapestOf(listing);
    const item = el('div', 'bc-item');
    item.append(el('span', 'bc-nm', tokenName(view.tokens, listing.tokenId)));
    const ticker = tokenTicker(view.tokens, listing.tokenId);
    const known = knownDecimals(view.tokens, listing.tokenId);
    const totalAtoms = listing.offers.reduce((sum, o) => sum + o.atoms, 0n);
    const left =
        known === undefined ? undefined : copy.remainingAtoms(formatAtoms(totalAtoms, known));
    const stock =
        left === undefined ? ticker : ticker !== undefined ? `${ticker} · ${left}` : left;
    if (stock !== undefined) {
        item.append(el('span', 'bc-tk', stock));
    }
    const priceRow = el('div', 'bc-p');
    if (isUnbuyable(offer)) {
        const figure = el('span', undefined, copy.DASHED_PRICE);
        figure.setAttribute('data-role', 'price');
        if (view.broadcastPulse === true) {
            figure.classList.add('pulse');
        }
        priceRow.append(figure);
        priceRow.append(el('span', 'bc-why', copy.UNBUYABLE_BADGE));
    } else {
        const hasFrom = offer.askedAtoms < offer.atoms;
        if (hasFrom) {
            priceRow.append(el('span', 'bc-from', copy.PRICE_FROM));
        }
        const amount = formatXec(offer.askedSats);
        const figure = el('span', undefined, amount);
        figure.setAttribute('data-role', 'price');
        if (view.broadcastPulse === true) {
            figure.classList.add('pulse');
        }
        priceRow.append(figure);
        priceRow.append(el('span', 'bc-u', copy.XEC));
        const tier = priceTier(amount, hasFrom, overlayTierCharCeilings(paintedThemeId(view)));
        if (tier > 0) {
            priceRow.setAttribute('data-tier', String(tier));
        }
    }
    item.append(priceRow);
    return item;
}

/**
 * The seller's own quote, in the seller's own unit.
 *
 * **No rate, no derived XEC, no "as of", and no `[data-role="price"]`.** The
 * price role is the covenant's asked amount, and this card carries none of
 * that money: converting a permanent record through a live feed would print a
 * different figure every hour under a number nobody signed, and a stream has
 * nobody to press refresh. The conversion happens on the page the code opens,
 * at the moment of the scan.
 *
 * No stock and no "from" either — both belong to a covenant.
 */
function quoteCard(view: StallView, price: TokenPrice, tokenId: string): HTMLElement {
    const item = el('div', 'bc-item bc-q-item');
    item.append(el('span', 'bc-nm', tokenName(view.tokens, tokenId)));
    item.append(el('span', 'bc-chip', copy.SELLER_QUOTE_CHIP));
    const row = el('div', 'bc-p');
    const figure = quoteFigure(price);
    const node = el('span', 'bc-q', figure);
    node.setAttribute('data-role', 'seller-price');
    if (view.broadcastPulse === true) {
        node.classList.add('pulse');
    }
    row.append(node);
    // The same ladder the asked figure walks, on the same 216px of plate: the
    // unit rides inside this figure, so the whole string is what is measured.
    const tier = priceTier(figure, false, overlayTierCharCeilings(paintedThemeId(view)));
    if (tier > 0) {
        row.setAttribute('data-tier', String(tier));
    }
    item.append(row);
    item.append(el('div', 'bc-l', copy.BROADCAST_QUOTE_LINE));
    return item;
}
