/**
 * The stream overlay. One skeleton for both presets. Chain-derived strings
 * reach the DOM through textContent only — same freeze as the theme module.
 */
import { fitsQr } from '../domain/qr';
import { formatAtoms, formatXec, isUnbuyable } from '../domain/money';
import { stallPath } from '../domain/route';
import type { StallView } from '../domain/state';
import * as copy from './copy';
import {
    cheapestOf,
    identityOf,
    knownDecimals,
    listingsInShopOrder,
    qrSvg,
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

    const fetch = view.fetch;
    if (fetch?.kind === 'empty') {
        head.append(el('div', 'bc-empty', copy.BROADCAST_EMPTY));
    }

    if (params.preset !== 'rail' && fetch?.kind === 'offers') {
        const listings = listingsInShopOrder(view);
        if (listings.length > 0) {
            const n = listings.length;
            const cursor = (((view.broadcastCursor ?? 0) % n) + n) % n;
            const listing = listings[cursor]!;
            const offer = cheapestOf(listing);
            const ext = el('div', 'bc-ext');
            if (view.broadcastStepped === true) {
                ext.classList.add('in');
            }
            const item = el('div', 'bc-item');
            item.append(el('span', 'bc-nm', tokenName(view.tokens, listing.tokenId)));
            const ticker = tokenTicker(view.tokens, listing.tokenId);
            const known = knownDecimals(view.tokens, listing.tokenId);
            const totalAtoms = listing.offers.reduce((sum, o) => sum + o.atoms, 0n);
            const left =
                known === undefined
                    ? undefined
                    : copy.remainingAtoms(formatAtoms(totalAtoms, known));
            const stock =
                left === undefined
                    ? ticker
                    : ticker !== undefined
                      ? `${ticker} · ${left}`
                      : left;
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
            } else {
                if (offer.askedAtoms < offer.atoms) {
                    priceRow.append(el('span', 'bc-from', copy.PRICE_FROM));
                }
                const figure = el('span', undefined, formatXec(offer.askedSats));
                figure.setAttribute('data-role', 'price');
                if (view.broadcastPulse === true) {
                    figure.classList.add('pulse');
                }
                priceRow.append(figure);
                priceRow.append(el('span', 'bc-u', copy.XEC));
            }
            item.append(priceRow);
            ext.append(item);
            if (listings.length > 1) {
                ext.append(el('div', 'bc-more', copy.broadcastMore(listings.length - 1)));
            }
            head.append(ext);
        }
    }

    root.append(head);

    const qrp = el('div', 'plate bc-qrp');
    const identity = identityOf(view);
    if (identity !== undefined) {
        const href = `${location.origin}${stallPath(identity)}`;
        if (fitsQr(href)) {
            const svg = qrSvg(href, copy.SHARE_QR_ALT);
            svg.setAttribute('data-role', 'qr');
            qrp.append(svg);
        }
    }
    qrp.append(el('div', 'bc-cap', copy.BROADCAST_CAPTION));
    root.append(qrp);
    return root;
}
