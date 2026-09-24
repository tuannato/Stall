/**
 * The stream overlay. One skeleton for the corner card and the side rail,
 * and a second shape for the ticker. Chain-derived strings reach the DOM
 * through textContent only — same freeze as the theme module.
 *
 * **The ticker is a loop, and the loop is a standing exception scoped to
 * this surface.** `marquee.ts` bounds every run (three on a shop row, one on
 * a stream card) because a mover that runs for ever beside content is what
 * WCAG 2.2.2 names, and a loop is what that bound refuses. The exception is
 * not that OBS has no compositor — it composites through CEF, and the URL is
 * public, so a phone can open it. It is that **the broadcast root already
 * loops**: the carousel re-arms for the source's life, the auto-updating
 * surface with no pause control, decided and shipped. The ticker adds a
 * second loop to a surface where the bound was already waived, and its one
 * mitigation is reduced motion: under `prefers-reduced-motion` the ribbon
 * does not scroll — it shows one page of items and cuts to the next every
 * `BROADCAST_FIXED_MS`, which the probe's reduced-motion pass measures
 * (`broadcast-ticker-live`). Stated here, once, and nowhere else.
 */
import type { TokenPrice } from '../domain/description';
import { XEC_PRICE_CODE } from '../domain/description';
import { satsForQuote, satsWithSurcharge } from '../domain/fiat';
import { fitsQr } from '../domain/qr';
import { DUST_SATS, formatAtoms, formatXec, isUnbuyable } from '../domain/money';
import { payLandingUrl, stallPath } from '../domain/route';
import type { BroadcastParams, StallView } from '../domain/state';
import * as copy from './copy';
import { marqueeNode } from './marquee';
import { nextCard } from '../domain/window';
import type { TokenListing } from './render';
import {
    cheapestOf,
    identityOf,
    knownDecimals,
    listingsInShopOrder,
    paintedTheme,
    priceTier,
    qrSvg,
    quoteFigure,
    quotedItems,
    stallBaseUrl,
    tokenName,
    tokenTicker,
    unbuyableLabel,
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
    if (broadcastRail(view) === 'quotes') {
        const quotes = payableQuotes(view);
        if (quotes.length > 0) {
            return quotes;
        }
    }
    return streamListings(view).map((listing) => ({
        kind: 'listing',
        tokenId: listing.tokenId,
        listing,
    }));
}

/**
 * The listings the stream shows: the shop's, less every listing nobody can
 * take (the owner, 2026-09-24 — the wall's Cycle rule on the other
 * unattended surface). A card stands 8 s on a stream, a viewer can only
 * scan it, and an unbuyable one carried no figure and no road; the ticker's
 * item the same. A listings rail of only unbuyable listings is an empty
 * rail: `broadcastRail` turns a `cards=all` stream past it, and with
 * nothing to turn to the head plate carries the stall's name and code alone.
 */
export function streamListings(view: StallView): TokenListing[] {
    return listingsInShopOrder(view).filter((listing) => !isUnbuyable(cheapestOf(listing)));
}

/** The pay set as cards: every quote this page paints whose scan can reach a payment. */
function payableQuotes(view: StallView): BroadcastCard[] {
    return quotedItems(view)
        .filter((item) => isPayableHere(item.price))
        .map(
            (item): BroadcastCard => ({
                kind: 'quote',
                tokenId: item.tokenId,
                price: item.price,
            }),
        );
}

/**
 * Which rail the overlay is on — **the one derivation there is**, the shop
 * window's rule (`windowRail`) on this surface.
 *
 * `cards=quotes` is the quotes; `cards=listings` (or nothing) the listings;
 * `cards=all` (owner, 2026-09-21) takes turns and reads the explicit rail
 * `boot` wrote onto the view at paint time — never a rail inferred from the
 * cursor, which is how the cursor and the card come to mean different rows.
 * **An empty rail turns itself off** (`nextCard`'s rule): under `all` a
 * stall with nothing quoted stays on the listings, and one with nothing
 * listed stays on the quotes, so "nothing listed yet" is never printed every
 * other pass over a stall a viewer can pay.
 */
export function broadcastRail(view: StallView): 'listings' | 'quotes' {
    const cards = view.broadcast?.cards;
    if (cards === 'quotes') {
        return 'quotes';
    }
    if (cards !== 'all') {
        return 'listings';
    }
    const hasQuotes = payableQuotes(view).length > 0;
    const hasListings = streamListings(view).length > 0;
    if ((view.broadcastRail ?? 'listings') === 'quotes') {
        return hasQuotes ? 'quotes' : 'listings';
    }
    return hasListings || !hasQuotes ? 'listings' : 'quotes';
}

/**
 * A definite book with listings on it and not one the stream can show —
 * every one unbuyable — and no quote card in their place. The overlay says
 * so rather than standing empty: an empty rail on a surface with nothing
 * else to show (the critic's third pass, 2026-09-24).
 */
export function nothingToBuy(view: StallView): boolean {
    return (
        view.fetch?.kind === 'offers' &&
        broadcastRail(view) === 'listings' &&
        listingsInShopOrder(view).length > 0 &&
        streamListings(view).length === 0
    );
}

/** Under `cards=all`, both rails have something to show, so the wrap turns. */
export function broadcastTurns(view: StallView): boolean {
    return (
        view.broadcast?.cards === 'all' &&
        payableQuotes(view).length > 0 &&
        streamListings(view).length > 0
    );
}

/**
 * The step the carousel (or the ticker's wrap) takes: the next card — or the
 * next page — and, under `cards=all`, the other rail once this one has been
 * shown through. Pure, the window's own `nextCard`.
 */
export function broadcastStep(
    view: StallView,
    cursor: number,
    length: number,
): { cursor: number; rail: 'listings' | 'quotes' } {
    const rail = broadcastRail(view);
    // `all` turns only while the other rail has something to show: an empty
    // rail turns itself off rather than trapping the stream on a blank.
    const show = broadcastTurns(view) ? 'all' : rail;
    return nextCard(cursor, length, show, rail);
}

/** How many items one ticker pass carries when the ribbon moves. */
export const TICKER_ITEMS_PER_PASS = 8;
/**
 * A still page (reduced motion) shows ONE item: a still ribbon is a second
 * layout with a hard width budget, not the moving one paused — three quote
 * items with words never fit a 1,100–1,300px cell, and two of every three
 * were clipped away unseen (the critic, 2026-09-22). One item's name,
 * figure, chip and surcharge line stand inside the cell on every look; a
 * long words line is cut at the cell's edge, stated in `PROBE-RULES.md`.
 */
export const TICKER_STILL_ITEMS = 1;
/** The ribbon's pace: the stream marquee's words pace, one number and not a setting. */
export const TICKER_SPEED_PX_PER_S = 90;

export function tickerPageSize(still: boolean): number {
    return still ? TICKER_STILL_ITEMS : TICKER_ITEMS_PER_PASS;
}

/** How many passes the ticker needs to show every card once; never zero. */
export function tickerPages(cardCount: number, still: boolean): number {
    return Math.max(1, Math.ceil(cardCount / tickerPageSize(still)));
}

/** The cards on the page at the cursor: at most one pass's worth, in shop order. */
export function tickerItems(view: StallView): BroadcastCard[] {
    const cards = broadcastCards(view);
    const still = view.broadcastTickerStill === true;
    const pages = tickerPages(cards.length, still);
    const page = (((view.broadcastCursor ?? 0) % pages) + pages) % pages;
    const size = tickerPageSize(still);
    return cards.slice(page * size, page * size + size);
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
    // The figure the landing page composes, surcharge included: a quote
    // just under the floor whose surcharge lifts it over is payable.
    const sats = satsWithSurcharge(satsForQuote(price, 1n, undefined), price.surchargePct);
    return sats !== undefined && sats >= DUST_SATS;
}

/**
 * What a pulse compares: the same card, showing a different figure. A string
 * because the two rails count in different units — satoshis a covenant
 * encodes, and minor units a seller wrote.
 */
export function broadcastFigure(card: BroadcastCard): string {
    // The surcharge is part of what a scanner pays, so a republish that
    // moves only the percent is a figure change and pulses.
    return card.kind === 'listing'
        ? String(cheapestOf(card.listing).askedSats)
        : `${card.price.code} ${card.price.exponent} ${card.price.amount} ${card.price.surchargePct ?? '-'}`;
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
    if (params.preset === 'ticker') {
        return renderTicker(view, params);
    }
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
    } else if (ext === undefined && nothingToBuy(view)) {
        head.append(el('div', 'bc-empty', copy.BROADCAST_NOTHING_TO_BUY));
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
    // The name runs once when it is cut (`marquee.ts`), at the stream's pace.
    item.append(marqueeNode(el('span', 'bc-nm', tokenName(view.tokens, listing.tokenId)), 'name', listing.tokenId));
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
        // The stream skips such a listing (`streamListings`), so this is the
        // fence behind that rule: no figure, and nothing under the price role
        // — the role is the covenant's asked amount, and a take the covenant
        // refuses has none to show. The label alone (the owner, 2026-09-24).
        priceRow.append(unbuyableLabel('bc-why'));
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
        const tier = priceTier(amount, hasFrom, paintedTheme(view).overlayTierCeilings);
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
    item.append(marqueeNode(el('span', 'bc-nm', tokenName(view.tokens, tokenId)), 'name', tokenId));
    item.append(el('span', 'bc-chip', copy.SELLER_QUOTE_CHIP));
    // The seller's words, under the chip that says whose they are (owner,
    // 2026-09-09 — PLAN § D rule 8's stream clause reversed): one line that
    // runs once when it is cut. The quote card alone; on a listing card the
    // words would sit beside the covenant's figure with no label between.
    const words = view.descriptions?.get(tokenId);
    if (words !== undefined && words !== '') {
        item.append(marqueeNode(el('span', 'bc-words', words), 'words', tokenId));
    }
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
    const tier = priceTier(figure, false, paintedTheme(view).overlayTierCeilings);
    if (tier > 0) {
        row.setAttribute('data-tier', String(tier));
    }
    item.append(row);
    // The seller's surcharge, said as their record: the page the code opens
    // composes it, the card only says the byte is there (D5 — a stream has
    // nobody to ask what the pay sheet will add).
    if (price.surchargePct !== undefined) {
        const surcharge = el('div', 'bc-sur', copy.streamSurchargeLine(price.surchargePct));
        surcharge.setAttribute('data-role', 'quote-surcharge');
        item.append(surcharge);
    }
    item.append(el('div', 'bc-l', copy.BROADCAST_QUOTE_LINE));
    return item;
}

/**
 * The ticker: one bar a line high hung on the bottom (or top) edge, the
 * items running right-to-left inside a clipping cell, a fixed label plate at
 * the exit end saying whose figures are running past and which rail they
 * are on, and the shop's code as a plate at the bar's end — the corner
 * preset's own 204px code, because a bar-height code is 1.4–1.8 px a
 * module on either route form and scans from nothing (measured, the design
 * round's first point).
 *
 * One rail per pass, and `cards=all` turns at the wrap. A quote item wears
 * the chip beside its own figure and the record's short surcharge line; the
 * flag carries `BROADCAST_QUOTE_LINE` for the whole quotes pass, and the code
 * is the shop's — PLAN § D rule 5 as the owner amended it for this surface.
 * At most `TICKER_ITEMS_PER_PASS` items ride one pass; the rest come on the
 * next, so a pass is one to four minutes whatever the stall holds.
 *
 * Our failures paint the label plate and the code alone (silence, the
 * overlay's rule); a book that is `empty` with nothing quoted prints
 * `BROADCAST_EMPTY` in the ribbon's place, still, once; a live re-read that
 * failed leaves the last ribbon `stale`, dimmed like the card.
 */
function renderTicker(view: StallView, params: BroadcastParams): HTMLElement {
    const root = el('div', 'bc tk');
    root.setAttribute('data-role', 'broadcast');
    root.setAttribute('data-preset', 'ticker');
    root.setAttribute('data-mode', 'fixed');
    root.setAttribute('data-state', view.broadcastState === 'stale' ? 'stale' : 'live');
    root.setAttribute('data-side', params.side);
    root.setAttribute('data-edge', params.edge);

    const rail = broadcastRail(view);
    const bar = el('div', 'plate tk-bar');
    const flag = el('div', 'tk-lab');
    flag.append(el('div', 'tk-brand', copy.BROADCAST_BRAND));
    const name = stallNameOf(view);
    if (name !== undefined) {
        const nm = el('div', 'tk-name', name);
        nm.setAttribute('data-role', 'stall-name');
        flag.append(nm);
    }
    const railLine = el(
        'div',
        'tk-rail',
        rail === 'quotes' ? copy.BROADCAST_TICKER_QUOTES_LINE : copy.BROADCAST_TICKER_LISTINGS,
    );
    railLine.setAttribute('data-role', 'ticker-rail');
    flag.append(railLine);
    bar.append(flag);

    const clip = el('div', 'tk-clip');
    // The probe's scoped exception, by value: a protected figure inside a
    // MOVING or PINNED ribbon is clipped by design and exempt from
    // `cutSideways`; a STILL page is a layout and is measured like one
    // (`PROBE-RULES.md`, "The ticker"). The sampler clamps to the cell in
    // all three.
    clip.setAttribute(
        'data-ribbon',
        view.broadcastTickerAt !== undefined ? 'pinned' : view.broadcastTickerStill === true ? 'still' : 'moving',
    );
    const fetch = view.fetch;
    const definite = fetch?.kind === 'offers' || fetch?.kind === 'empty';
    if (definite) {
        const items = tickerItems(view);
        if (items.length > 0) {
            const run = el('div', 'tk-run');
            run.setAttribute('data-role', 'ticker-run');
            // The pass's identity: the same key across repaints keeps the
            // phase (`armTicker`); a new key is a new pass from the right.
            run.setAttribute(
                'data-tk-key',
                `${rail}:${view.broadcastCursor ?? 0}:${items.map((c) => c.tokenId).join(',')}`,
            );
            for (const card of items) {
                run.append(
                    card.kind === 'listing'
                        ? tickerListingItem(view, card.listing)
                        : tickerQuoteItem(view, card.price, card.tokenId),
                );
            }
            if (view.broadcastTickerStill === true) {
                run.classList.add('still');
            }
            if (view.broadcastTickerAt !== undefined) {
                // Pinned for the probe: no animation, one known offset.
                run.classList.add('still');
                run.style.transform = `translateX(${view.broadcastTickerAt}px)`;
            }
            clip.append(run);
        } else if (fetch?.kind === 'empty') {
            clip.append(el('div', 'tk-empty', copy.BROADCAST_EMPTY));
        } else if (nothingToBuy(view)) {
            // Listed, and not one of them can be bought: the stream skips
            // them all, and an empty ribbon under "Listings" reads as a
            // source that died.
            clip.append(el('div', 'tk-empty', copy.BROADCAST_NOTHING_TO_BUY));
        }
    }
    bar.append(clip);
    root.append(bar);

    const qrp = el('div', 'plate tk-qrp');
    const identity = identityOf(view);
    const shop = identity === undefined ? undefined : `${location.origin}${stallPath(identity)}`;
    if (shop !== undefined && fitsQr(shop)) {
        const svg = qrSvg(shop, copy.SHARE_QR_ALT);
        svg.setAttribute('data-role', 'qr');
        qrp.append(svg);
    }
    qrp.append(el('div', 'bc-cap', copy.WINDOW_SCAN_SHOP));
    root.append(qrp);
    return root;
}

/** A listing on the ribbon: the corner card's lines on one line. */
function tickerListingItem(view: StallView, listing: TokenListing): HTMLElement {
    const offer = cheapestOf(listing);
    const item = el('span', 'tk-it');
    item.append(el('span', 'tk-n', tokenName(view.tokens, listing.tokenId)));
    if (isUnbuyable(offer)) {
        // Skipped like the card (`streamListings`); the fence is its rule.
        item.append(unbuyableLabel('tk-w'));
    } else {
        if (offer.askedAtoms < offer.atoms) {
            item.append(el('span', 'tk-from', copy.PRICE_FROM));
        }
        const figure = el('span', 'tk-x', formatXec(offer.askedSats));
        figure.setAttribute('data-role', 'price');
        item.append(figure);
        item.append(el('span', 'tk-u', copy.XEC));
    }
    const known = knownDecimals(view.tokens, listing.tokenId);
    if (known !== undefined) {
        const totalAtoms = listing.offers.reduce((sum, o) => sum + o.atoms, 0n);
        item.append(el('span', 'tk-w', copy.remainingAtoms(formatAtoms(totalAtoms, known))));
    }
    return item;
}

/** A quote on the ribbon: name · figure · the chip · the surcharge line · the words whole. */
function tickerQuoteItem(view: StallView, price: TokenPrice, tokenId: string): HTMLElement {
    const item = el('span', 'tk-it tk-q');
    item.append(el('span', 'tk-n', tokenName(view.tokens, tokenId)));
    const figure = el('span', 'tk-x', quoteFigure(price));
    figure.setAttribute('data-role', 'seller-price');
    item.append(figure);
    item.append(el('span', 'tk-chip', copy.SELLER_QUOTE_CHIP));
    if (price.surchargePct !== undefined) {
        const surcharge = el('span', 'tk-sur', copy.streamSurchargeLine(price.surchargePct));
        surcharge.setAttribute('data-role', 'quote-surcharge');
        item.append(surcharge);
    }
    const words = view.descriptions?.get(tokenId);
    if (words !== undefined && words !== '') {
        item.append(el('span', 'tk-w', words));
    }
    return item;
}

/*
 * The ribbon's phase. `renderStall` rebuilds the overlay on every paint, so a
 * pass in flight is continued the marquee's way: a remembered start per pass
 * key and a negative `animation-delay`. The pass duration is computed from
 * the measured widths at `TICKER_SPEED_PX_PER_S` — the design's pace, not a
 * percentage over a fixed time, which varies with content — and re-measured
 * on `document.fonts.ready` without restarting the pass.
 */
type TickerPhase = { key: string; startedAtMs: number };
let tickerPhase: TickerPhase | undefined;
let tickerClock: () => number = () => Date.now();

export function setTickerClock(next: (() => number) | undefined): void {
    tickerClock = next ?? (() => Date.now());
}

export function resetTickerForTests(): void {
    tickerPhase = undefined;
    tickerClock = () => Date.now();
}

/** The pass a ribbon of `runPx` needs to cross a `clipPx` cell and leave it, in ms. */
export function tickerPassMs(clipPx: number, runPx: number): number {
    return Math.max(1, Math.round(((clipPx + runPx) / TICKER_SPEED_PX_PER_S) * 1000));
}

/**
 * Measure the painted ribbon and arm (or continue) its pass. Returns the
 * pass length in ms, or 0 when nothing moves (a still ribbon, or none).
 */
export function armTicker(root: ParentNode, now: number = tickerClock()): number {
    const run = root.querySelector<HTMLElement>('.tk-run');
    if (run === null || run.classList.contains('still')) {
        return 0;
    }
    const clip = run.parentElement;
    if (clip === null) {
        return 0;
    }
    const clipPx = clip.getBoundingClientRect().width;
    const runPx = run.getBoundingClientRect().width;
    if (clipPx <= 0 || runPx <= 0) {
        return 0;
    }
    const ms = tickerPassMs(clipPx, runPx);
    const key = run.getAttribute('data-tk-key') ?? '';
    if (tickerPhase === undefined || tickerPhase.key !== key) {
        tickerPhase = { key, startedAtMs: now };
    }
    const elapsed = Math.max(0, now - tickerPhase.startedAtMs) % ms;
    run.style.setProperty('--tk-clip', `${clipPx}px`);
    run.style.setProperty('--tk-run', `${runPx}px`);
    run.style.setProperty('--tk-ms', `${ms}ms`);
    run.style.setProperty('--tk-delay', `-${elapsed}ms`);
    return ms;
}

/** The wrap: the pass just ended, so the next paint of the SAME key starts from the right. */
export function tickerWrapped(now: number = tickerClock()): void {
    if (tickerPhase !== undefined) {
        tickerPhase = { key: tickerPhase.key, startedAtMs: now };
    }
}
