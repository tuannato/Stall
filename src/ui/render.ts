
import { cashtabPublishUrl, cashtabTokenUrl, payECashPublishUrl } from '../domain/cashtab';
import { iconUrl } from '../domain/icons';
import { encodeManifestHex } from '../domain/manifest';
import {
    formatAtoms,
    formatTokenRate,
    formatXec,
    isUnbuyable,
    RATE_TOO_SMALL,
} from '../domain/money';
import { parseSellerParam } from '../domain/route';
import type {
    FetchStatus,
    HostAttempt,
    Outpoint,
    StallOffer,
    StallView,
    TokenMeta,
} from '../domain/state';
import {
    DEFAULT_THEME,
    LAYOUT_CLASSES,
    SHIPPED_THEMES,
    clampIndex,
    themeVars,
    type DecodedTheme,
} from '../domain/theme';
import * as copy from './copy';
import './stall.css';

export type StallHandlers = {
    onBuy: (outpoint: Outpoint) => void;
    onRetry: () => void;
    onCloseSheet: () => void;
    /** Apex paste. Optional so a render-only test need not invent navigation. */
    onOpenStall?: (raw: string) => void;
    /** Stall → apex. Optional so a render-only test need not invent navigation. */
    onGoHome?: () => void;
    /** Toggle whether the bare domain opens this stall. */
    onToggleDefault?: (raw: string) => void;
    onOpenPublish?: () => void;
    onClosePublish?: () => void;
};

/**
 * One detached image per token for the session. `renderStall` throws the tree
 * away on every paint; a fresh `<img src>` each time is a request burst.
 * Initials stay until this image has loaded. A failed load keeps them.
 */
type IconEntry =
    | { state: 'pending'; img: HTMLImageElement }
    | { state: 'loaded'; img: HTMLImageElement }
    | { state: 'error' };

const iconCache = new Map<string, IconEntry>();

/** Cells from the current paint, so a load reveals without walking `document`. */
const paintedIconCells = new Map<string, HTMLElement[]>();

export function resetIconsForTests(): void {
    iconCache.clear();
    paintedIconCells.clear();
}

export function renderStall(
    root: HTMLElement,
    view: StallView,
    handlers: StallHandlers,
): void {
    paintedIconCells.clear();
    root.replaceChildren();
    applyTitle(view);
    const frame = el('div', 'frame');
    const stall = el('div', 'stall');
    applyTheme(stall, view.theme ?? DEFAULT_THEME);

    switch (view.route.kind) {
        case 'home':
            paintHome(stall, handlers);
            break;
        case 'invalid':
            paintInvalid(stall, view.route.raw, handlers);
            break;
        case 'unresolvable':
            paintUnresolvable(stall, view, handlers);
            break;
        case 'unresolved':
            paintUnresolved(stall, view, handlers);
            break;
        case 'pubkey':
            paintPubkey(stall, view, handlers);
            break;
    }

    frame.append(stall);
    root.append(frame);
}

function applyTheme(stall: HTMLElement, theme: DecodedTheme): void {
    const vars = themeVars(theme);
    for (const [name, value] of Object.entries(vars)) {
        stall.style.setProperty(name, value);
    }
    const layout =
        LAYOUT_CLASSES[clampIndex(theme.layoutIndex, LAYOUT_CLASSES.length)] ??
        LAYOUT_CLASSES[0];
    stall.classList.add(layout!);
}

function paintHome(stall: HTMLElement, handlers: StallHandlers): void {
    stall.append(header(copy.HOME_TITLE, copy.HOME_LEDE));
    const body = el('div', 'stall-body');
    body.append(mid('', [copy.HOME_HOW, copy.HOME_NO_ACCOUNT]));
    body.append(pasteForm(handlers));
    body.append(el('p', 'fine', copy.HOME_SELLER));
    stall.append(body);
}

function paintInvalid(stall: HTMLElement, raw: string, handlers: StallHandlers): void {
    stall.append(header(copy.LINK_UNREADABLE_TITLE));
    const body = el('div', 'stall-body');
    body.append(el('p', 'mid-p', raw));
    stall.append(body);
    stall.append(footer(undefined, { goHome: handlers.onGoHome }));
}

function paintUnresolvable(
    stall: HTMLElement,
    view: StallView,
    handlers: StallHandlers,
): void {
    const address = view.route.kind === 'unresolvable' ? view.route.address : undefined;
    stall.append(header(copy.UNRESOLVABLE_HEADER, copy.UNRESOLVABLE_SUB));
    const body = el('div', 'stall-body');
    body.append(
        mid(copy.UNRESOLVABLE_TITLE, [
            copy.UNRESOLVABLE_BODY,
            copy.UNRESOLVABLE_HINT,
            copy.LIST_IN_CASHTAB,
        ]),
    );
    stall.append(body);
    stall.append(stallFooter(address, view, handlers));
}

function paintUnresolved(
    stall: HTMLElement,
    view: StallView,
    handlers: StallHandlers,
): void {
    const fetch = view.fetch;
    if (fetch?.kind === 'opening') {
        paintOpening(stall, view, handlers);
        return;
    }
    if (fetch && (fetch.kind === 'unreachable' || fetch.kind === 'plugin-missing')) {
        paintUnreachable(stall, view, fetch, handlers);
        return;
    }
    // No fetch at all means `resolveSeller` returned rather than threw: it
    // walked, hit `MAX_HISTORY_PAGES`, and stopped. The index answered every
    // page. Painting the unreachable screen here told the visitor "no index
    // answered", which is our own limit reported as the network's failure —
    // the one collapse this project promised not to make.
    paintStoppedLooking(stall, view, handlers);
}

/**
 * We ran out of pages, not out of network. No hosts box, because nothing failed
 * to answer; a retry still helps, because any new spend from that address lands
 * on page 0 and resolves it.
 */
function paintStoppedLooking(
    stall: HTMLElement,
    view: StallView,
    handlers: StallHandlers,
): void {
    stall.append(header(identityOf(view), copy.UNRESOLVED_SUB));
    const body = el('div', 'stall-body');
    body.append(
        mid(copy.UNRESOLVED_TITLE, [copy.UNRESOLVED_BODY, copy.UNRESOLVED_HINT]),
    );
    body.append(retryControl(handlers));
    stall.append(body);
    stall.append(stallFooter(identityOf(view), view, handlers));
}

function paintPubkey(
    stall: HTMLElement,
    view: StallView,
    handlers: StallHandlers,
): void {
    const fetch = view.fetch;
    if (!fetch || fetch.kind === 'opening') {
        paintOpening(stall, view, handlers);
        return;
    }
    switch (fetch.kind) {
        case 'empty':
            paintEmpty(stall, view, handlers);
            break;
        case 'unreachable':
        case 'plugin-missing':
            paintUnreachable(stall, view, fetch, handlers);
            break;
        case 'unreadable':
            paintUnreadable(stall, view, handlers);
            break;
        case 'offers':
            paintOffers(stall, view, fetch.offers, handlers);
            break;
    }
}

function paintOpening(
    stall: HTMLElement,
    view: StallView,
    handlers: StallHandlers,
): void {
    stall.append(header(displayName(view), copy.OPENING_SUB));
    const body = el('div', 'stall-body');
    body.append(mid('', [copy.OPENING_BODY]));
    stall.append(body);
    stall.append(stallFooter(identityOf(view), view, handlers));
}

/**
 * Ask the chain again. On the failure screens this is the only way forward; on
 * the empty one it is what makes a genuine sell-out clear, now that a live
 * empty answer is no longer applied over a painted book.
 */
function retryControl(handlers: StallHandlers): HTMLElement {
    const retry = el('button', 'mini', copy.TRY_AGAIN);
    retry.type = 'button';
    retry.setAttribute('data-role', 'retry');
    retry.addEventListener('click', () => {
        handlers.onRetry();
    });
    return retry;
}

function paintEmpty(
    stall: HTMLElement,
    view: StallView,
    handlers: StallHandlers,
): void {
    stall.append(header(displayName(view), copy.EMPTY_SUB));
    const body = el('div', 'stall-body');
    body.append(mid(copy.EMPTY_TITLE, [copy.EMPTY_BODY, copy.LIST_IN_CASHTAB]));
    if (view.overlay.kind === 'publish') {
        body.append(publishSheet(view, handlers));
    }
    settingsNotes(body, view);
    // The live path no longer applies an empty answer, so a stall whose last
    // offer genuinely sold keeps that row until someone asks again. This is
    // where they ask.
    body.append(retryControl(handlers));
    stall.append(body);
    stall.append(stallFooter(identityOf(view), view, handlers));
}

/**
 * The index answered and we could not read what it said. Our failure, so it
 * takes the same shape as unreachable — but never its copy, because "no index
 * answered" would be a second untruth on top of the first.
 */
function paintUnreadable(
    stall: HTMLElement,
    view: StallView,
    handlers: StallHandlers,
): void {
    stall.append(header(displayName(view), copy.UNREADABLE_SUB));
    const body = el('div', 'stall-body');
    body.append(el('p', 'mid-p', copy.UNREADABLE_BODY));
    body.append(retryControl(handlers));
    stall.append(body);
    stall.append(stallFooter(identityOf(view), view, handlers));
}

function paintUnreachable(
    stall: HTMLElement,
    view: StallView,
    fetch: Extract<FetchStatus, { kind: 'unreachable' | 'plugin-missing' }>,
    handlers: StallHandlers,
): void {
    const identity = identityOf(view);
    const cached = hasCachedShop(view);
    if (cached) {
        stall.append(header(displayName(view), copy.UNREACHABLE_SUB));
    } else {
        stall.append(header(identity));
    }

    const body = el('div', 'stall-body');
    if (cached) {
        if (view.tokens.size > 0) {
            for (const meta of view.tokens.values()) {
                body.append(skeletonRow(meta.name || meta.ticker || meta.tokenId));
            }
        } else {
            body.append(skeletonRow());
            body.append(skeletonRow());
        }
    }
    body.append(el('p', 'mid-p', copy.UNREACHABLE_BODY));
    body.append(hostsBox(fetch.triedAtMs, fetch.hosts));
    body.append(retryControl(handlers));
    stall.append(body);

    if (cached || identity !== undefined) {
        stall.append(stallFooter(identity, view, handlers));
    }
}

function paintOffers(
    stall: HTMLElement,
    view: StallView,
    offers: StallOffer[],
    handlers: StallHandlers,
): void {
    stall.append(header(displayName(view), copy.itemsForSale(offers.length)));
    const body = el('div', 'stall-body');
    const items = el('div', 'items');
    for (const offer of offers) {
        items.append(offerRow(offer, view, handlers));
    }
    body.append(items);
    stall.append(body);

    if (view.overlay.kind === 'publish') {
        body.append(publishSheet(view, handlers));
    }
    settingsNotes(body, view);
    stall.append(stallFooter(identityOf(view), view, handlers));
}

/**
 * Why the stall does not look the way its seller asked. Painted on every screen
 * that has a stall behind it, not only on the one with offers: a seller whose
 * settings we could not read has the same right to know it when their shop is
 * empty, and silence there would read as a look they chose.
 */
function settingsNotes(body: HTMLElement, view: StallView): void {
    if (view.settingsUnreadable === true) {
        // They did publish. Silence here would say they never did.
        body.append(el('p', 'fine', copy.SETTINGS_UNREADABLE));
    }
    if (view.settingsTruncated === true) {
        // Without this the shipped default reads as a choice the seller made.
        body.append(el('p', 'fine', copy.SETTINGS_TRUNCATED));
    }
    if (view.theme !== undefined && !view.theme.known) {
        // The record was fine. The missing row is ours, and saying so keeps
        // this apart from a record we could not read.
        body.append(el('p', 'fine', copy.THEME_UNKNOWN));
    }
}

function isExpanded(view: StallView, offer: StallOffer): boolean {
    return (
        view.overlay.kind === 'buy' &&
        view.overlay.outpoint.txid === offer.outpoint.txid &&
        view.overlay.outpoint.outIdx === offer.outpoint.outIdx
    );
}

function iconKey(tokenId: string): string | undefined {
    if (iconUrl(tokenId) === undefined) {
        return undefined;
    }
    return tokenId.toLowerCase();
}

function iconMatchesToken(img: HTMLImageElement, key: string): boolean {
    const url = iconUrl(key);
    if (url === undefined) {
        return false;
    }
    return img.getAttribute('data-token-id') === key && img.getAttribute('src') === url;
}

function ensureIcon(tokenId: string): void {
    const key = iconKey(tokenId);
    if (key === undefined || iconCache.has(key)) {
        return;
    }
    const url = iconUrl(tokenId);
    if (url === undefined) {
        return;
    }
    const img = new Image();
    img.referrerPolicy = 'no-referrer';
    img.alt = '';
    img.setAttribute('data-token-id', key);
    iconCache.set(key, { state: 'pending', img });
    img.addEventListener('load', () => {
        const current = iconCache.get(key);
        if (current === undefined || current.state === 'error' || current.img !== img) {
            return;
        }
        if (!iconMatchesToken(img, key)) {
            return;
        }
        iconCache.set(key, { state: 'loaded', img });
        revealLoadedIcon(key, img);
    });
    img.addEventListener('error', () => {
        const current = iconCache.get(key);
        if (current === undefined || current.state === 'error' || current.img !== img) {
            return;
        }
        iconCache.set(key, { state: 'error' });
    });
    img.src = url;
}

function cloneLoadedIcon(tokenId: string): HTMLImageElement | undefined {
    const key = iconKey(tokenId);
    if (key === undefined) {
        return undefined;
    }
    const entry = iconCache.get(key);
    if (entry === undefined || entry.state !== 'loaded') {
        return undefined;
    }
    if (!iconMatchesToken(entry.img, key)) {
        return undefined;
    }
    const clone = entry.img.cloneNode(true) as HTMLImageElement;
    if (!iconMatchesToken(clone, key)) {
        return undefined;
    }
    return clone;
}

function revealLoadedIcon(key: string, source: HTMLImageElement): void {
    if (!iconMatchesToken(source, key)) {
        return;
    }
    const cells = paintedIconCells.get(key);
    if (cells === undefined) {
        return;
    }
    for (const cell of cells) {
        if (cell.getAttribute('data-token-id') !== key) {
            continue;
        }
        const clone = source.cloneNode(true) as HTMLImageElement;
        if (!iconMatchesToken(clone, key)) {
            continue;
        }
        cell.replaceChildren(clone);
    }
}

function itemIcon(tokenId: string, name: string): HTMLElement {
    const cell = el('div', 'item-ic');
    const key = iconKey(tokenId);
    if (key !== undefined) {
        cell.setAttribute('data-token-id', key);
        let cells = paintedIconCells.get(key);
        if (cells === undefined) {
            cells = [];
            paintedIconCells.set(key, cells);
        }
        cells.push(cell);
        ensureIcon(tokenId);
        const clone = cloneLoadedIcon(tokenId);
        if (clone !== undefined) {
            cell.append(clone);
            return cell;
        }
    }
    cell.textContent = initials(name);
    return cell;
}


/**
 * Composing the settings transaction. This origin holds no key: it builds a
 * BIP21 string and the seller's own wallet signs it, the same handoff the buy
 * control uses.
 *
 * The record is shown in words here because the wallet cannot show it — Cashtab
 * previews an unrecognised LOKAD as raw hex — so this is the only screen where
 * a seller reads what they are about to sign.
 *
 * Nothing is composed unless the stall resolved to an address. A route that is
 * a bare pubkey still resolves to one; an unresolved or p2sh route does not,
 * and then the screen says so rather than offering a link that cannot work.
 */
function publishSheet(view: StallView, handlers: StallHandlers): HTMLElement {
    const wrap = el('div', 'item-detail');
    wrap.setAttribute('data-role', 'publish');
    wrap.append(el('div', 'item-n', copy.PUBLISH_TITLE));
    wrap.append(el('p', 'fine', copy.PUBLISH_LEDE));

    const address = view.address;
    if (address === undefined || address === '') {
        wrap.append(el('p', 'ctx', copy.PUBLISH_UNAVAILABLE));
        return wrap;
    }

    const form = el('form', 'paste');
    const label = el('label', 'paste-label', copy.PUBLISH_NAME_LABEL);
    const input = el('input', 'paste-in');
    input.type = 'text';
    input.name = 'stall-name';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.value = view.stallName ?? '';
    input.setAttribute('aria-label', copy.PUBLISH_NAME_LABEL);
    label.append(input);

    const themeLabel = el('label', 'paste-label', copy.PUBLISH_THEME_LABEL);
    const select = el('select', 'paste-in');
    select.name = 'theme';
    select.setAttribute('aria-label', copy.PUBLISH_THEME_LABEL);
    // The look on screen, selected explicitly. A stall with no manifest is
    // painted with the shipped default, so leaving this to the browser's
    // first-option rule happened to be right and read as nothing being chosen:
    // a seller who never touched the picker published the look they already had
    // and saw no change. `painted` is what the note below compares against.
    const painted = view.theme?.id ?? DEFAULT_THEME.id;
    for (const row of SHIPPED_THEMES) {
        const option = el('option', '', row.label);
        option.value = String(row.id);
        option.selected = row.id === painted;
        select.append(option);
    }
    themeLabel.append(select);

    const err = el('p', 'ctx', '');
    err.hidden = true;
    err.setAttribute('data-role', 'publish-invalid');
    const sameLook = el('p', 'fine', copy.PUBLISH_SAME_LOOK);
    sameLook.hidden = true;
    sameLook.setAttribute('data-role', 'publish-same-look');
    const bytes = el('p', 'fine', '');
    bytes.setAttribute('data-role', 'publish-hex');
    const web = el('a', 'buy', copy.PUBLISH_OPEN_CASHTAB);
    web.setAttribute('data-role', 'publish-cashtab');
    const app = el('a', 'mini another', copy.PUBLISH_OPEN_PAY);
    app.setAttribute('data-role', 'publish-pay');
    for (const link of [web, app]) {
        link.rel = 'noopener noreferrer';
        link.target = '_blank';
    }

    // Rebuilt in place rather than by repainting: a repaint would take the
    // focus out of the field on every keystroke.
    const refresh = (): void => {
        const hex = encodeManifestHex(input.value, Number(select.value));
        const cashtab = hex === undefined ? undefined : cashtabPublishUrl(address, hex);
        const pay = hex === undefined ? undefined : payECashPublishUrl(address, hex);
        const ready = cashtab !== undefined && pay !== undefined;
        err.hidden = ready || input.value === '';
        err.textContent = ready ? '' : copy.PUBLISH_NAME_TOO_LONG;
        // Say when the record will not change the look. Publishing the look
        // already on screen is a legitimate thing to do — it is how a name gets
        // set — but a seller who does it unaware reads the unchanged stall as
        // the publish having failed.
        sameLook.hidden = Number(select.value) !== painted;
        bytes.textContent = ready ? hex! : '';
        bytes.hidden = !ready;
        for (const [link, href] of [
            [web, cashtab],
            [app, pay],
        ] as const) {
            if (href === undefined) {
                link.removeAttribute('href');
                link.setAttribute('aria-disabled', 'true');
            } else {
                link.href = href;
                link.removeAttribute('aria-disabled');
            }
        }
    };
    input.addEventListener('input', refresh);
    select.addEventListener('change', refresh);
    form.addEventListener('submit', (event) => event.preventDefault());
    form.append(label, themeLabel, err, sameLook);
    wrap.append(form);
    wrap.append(el('p', 'fine', copy.PUBLISH_MUST_SIGN));
    wrap.append(el('p', 'fine', copy.PUBLISH_WALLET_SHOWS_HEX));
    wrap.append(bytes);
    wrap.append(web, app);

    // Signing happens in another app, and the live socket only listens to the
    // agora group — a settings transaction does not move the book, so no
    // message ever arrives and nothing re-reads the manifest. Without this
    // control the seller signs, comes back, and watches an unchanged stall.
    // It runs a full refresh, so the sheet closes and the answer is the stall.
    wrap.append(el('p', 'fine', copy.PUBLISH_AFTER_SIGNING));
    const check = el('button', 'mini', copy.PUBLISH_CHECK_NOW);
    check.type = 'button';
    check.setAttribute('data-role', 'publish-check');
    check.addEventListener('click', () => {
        handlers.onRetry();
    });
    wrap.append(check);

    const close = el('button', 'mini another', copy.PUBLISH_CLOSE);
    close.type = 'button';
    close.setAttribute('data-role', 'publish-close');
    if (handlers.onClosePublish !== undefined) {
        close.addEventListener('click', handlers.onClosePublish);
    }
    wrap.append(close);
    refresh();
    return wrap;
}

function offerRow(
    offer: StallOffer,
    view: StallView,
    handlers: StallHandlers,
): HTMLElement {
    const expanded = isExpanded(view, offer);
    const card = el('div', expanded ? 'item open' : 'item');
    const name = tokenName(view.tokens, offer.tokenId);
    const ticker = tokenTicker(view.tokens, offer.tokenId);
    const d = decimalsOf(view.tokens, offer.tokenId);

    const head = el('button', 'item-head');
    head.type = 'button';
    head.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    head.append(itemIcon(offer.tokenId, name));
    const info = el('div', 'item-b');
    info.append(el('div', 'item-n', name));
    const left = copy.remainingAtoms(formatAtoms(offer.atoms, d));
    info.append(
        el('div', 'item-q', ticker !== undefined ? `${ticker} · ${left}` : left),
    );
    head.append(info);
    const price = el('div', 'item-p');
    if (isUnbuyable(offer)) {
        // The price we hold is for a take the covenant will refuse. Printing
        // it would advertise a purchase that cannot happen.
        price.append(el('div', 'dash', copy.DASHED_PRICE));
        price.append(el('div', 'item-u', copy.UNBUYABLE_BADGE));
    } else {
        const amount = el('div', 'item-a');
        if (offer.askedAtoms < offer.atoms) {
            amount.append(el('span', 'item-from', copy.PRICE_FROM));
        }
        const asked = el('div', 'item-x', formatXec(offer.askedSats));
        asked.setAttribute('data-role', 'price');
        amount.append(asked);
        price.append(amount);
        price.append(el('div', 'item-u', copy.XEC));
        price.append(rateLine(offer, view));
    }
    head.append(price);
    head.addEventListener('click', () => {
        if (expanded) {
            handlers.onCloseSheet();
        } else {
            handlers.onBuy(offer.outpoint);
        }
    });
    card.append(head);
    if (expanded) {
        card.append(itemDetail(view, offer));
    }
    return card;
}

/**
 * A labelled unit rate under the asked amount. Never written into the
 * price node: `askedSats` is what the covenant takes, and this is not it.
 */
function rateLine(offer: StallOffer, view: StallView): HTMLElement {
    const line = el('div', 'item-rate');
    line.setAttribute('data-role', 'rate');
    const decimals = knownDecimals(view.tokens, offer.tokenId);
    const formatted =
        decimals !== undefined && offer.priceNanoSatsPerAtom !== undefined
            ? formatTokenRate(offer.priceNanoSatsPerAtom, decimals)
            : undefined;
    if (formatted === undefined) {
        line.textContent = copy.DASHED_PRICE;
    } else if (formatted === RATE_TOO_SMALL) {
        line.textContent = copy.tokenRateBound(formatted);
    } else {
        line.textContent = copy.tokenRate(formatted);
    }
    return line;
}

/**
 * In-place detail. Lives next to the row button, never inside it: an `<a>`
 * nested in `button.item` would fire the row's own click.
 */
function itemDetail(view: StallView, offer: StallOffer): HTMLElement {
    const panel = el('div', 'item-detail');
    panel.setAttribute('data-role', 'detail');

    const d = decimalsOf(view.tokens, offer.tokenId);
    const ticker = tokenTicker(view.tokens, offer.tokenId);
    const meta = tokenMeta(view.tokens, offer.tokenId);

    if (isUnbuyable(offer)) {
        panel.append(
            el(
                'div',
                'ctx',
                copy.unbuyableLine(
                    formatAtoms(offer.minAcceptedAtoms!, d),
                    formatAtoms(offer.atoms, d),
                ),
            ),
        );
        panel.append(tokenFacts(offer, meta, ticker));
        // No link out: Cashtab will not show this row either.
        panel.append(el('p', 'fine', copy.HANDOFF_FINE_PRINT));
        return panel;
    }

    const asked = formatXec(offer.askedSats);
    const minAtoms = formatAtoms(offer.askedAtoms, d);
    const stock = formatAtoms(offer.atoms, d);
    panel.append(
        sheetRow(
            copy.MIN_PURCHASE,
            ticker !== undefined ? `${minAtoms} ${ticker}` : minAtoms,
        ),
    );
    panel.append(sheetRow(copy.YOU_PAY, copy.payAmount(asked), true));
    panel.append(sheetRow(copy.THIS_STALLS_STOCK, copy.remainingAtoms(stock)));

    panel.append(tokenFacts(offer, meta, ticker));

    // No network fee row: this origin builds nothing, so it has no fee to
    // quote. Cashtab shows its own before it signs.

    // The panel used to precede a signature here. It now precedes a market.
    // Cashtab's depth bars are a per-token spot (sometimes fiat), not the
    // covenant minimum on this card — so there is no hunt figure to print.
    panel.append(el('div', 'ctx', copy.HANDOFF_MAY_PRESELECT));
    panel.append(el('div', 'ctx', copy.HANDOFF_PRICE_IS_NOT_THE_ROW));

    const href = cashtabTokenUrl(offer.tokenId);
    if (href !== undefined) {
        const cta = el('a', 'buy', copy.OPEN_IN_CASHTAB);
        cta.href = href;
        cta.target = '_blank';
        // No opener: Stall has no reason to reach into that tab, and leaving
        // the handle would let it reach back into this one.
        cta.rel = 'noopener noreferrer';
        cta.addEventListener('click', (event) => {
            event.stopPropagation();
        });
        panel.append(cta);
    }
    panel.append(el('p', 'fine', copy.HANDOFF_FINE_PRINT));
    return panel;
}

function tokenFacts(
    offer: StallOffer,
    meta: TokenMeta | undefined,
    ticker: string | undefined,
): HTMLElement {
    const box = el('div', 'token-facts');
    if (ticker !== undefined) {
        box.append(sheetRow(copy.TOKEN_TICKER, ticker));
    }
    if (meta !== undefined) {
        box.append(sheetRow(copy.TOKEN_DECIMALS, String(meta.decimals)));
    }
    box.append(sheetRow(copy.TOKEN_ID, offer.tokenId));
    const type = meta?.tokenType;
    if (type !== undefined) {
        const label = copy.tokenTypeLabel(type.type, type.protocol);
        if (label !== undefined) {
            box.append(sheetRow(copy.TOKEN_TYPE, label));
        }
    }
    return box;
}

function sheetRow(label: string, value: string, big = false): HTMLElement {
    const row = el('dl', big ? 'row big' : 'row');
    row.append(el('dt', undefined, label));
    row.append(el('dd', undefined, value));
    return row;
}

function header(name?: string, sub?: string): HTMLElement {
    const hd = el('header', 'stall-head');
    if (name !== undefined && name !== '') {
        hd.append(el('div', 'stall-name', name));
    }
    if (sub !== undefined && sub !== '') {
        hd.append(el('div', 'stall-sub', sub));
    }
    return hd;
}

/**
 * The footer every screen with a stall behind it shares. The default-stall
 * control is offered wherever an identity exists — including an unreachable
 * one, because wanting this stall back tomorrow does not depend on today's
 * index answering.
 */
function stallFooter(
    identity: string | undefined,
    view: StallView,
    handlers: StallHandlers,
): HTMLElement {
    const raw = identityOf(view);
    const onToggle = handlers.onToggleDefault;
    return footer(identity, {
        share: true,
        goHome: handlers.onGoHome,
        // Only where the sheet can actually open. `publishSheet` is mounted by
        // `paintOffers` and `paintEmpty`, both under `paintPubkey`; on any
        // other screen this was a button that flipped the overlay and repainted
        // the same page — no sheet, no error, no feedback. An address route
        // that never resolved still carries `view.address`, so the address
        // alone was never the right condition. Stall cannot know who is
        // looking; the copy says only this stall's wallet can sign.
        onPublish:
            view.route.kind === 'pubkey' &&
            view.address !== undefined &&
            view.address !== ''
                ? handlers.onOpenPublish
                : undefined,
        defaultStall:
            raw !== undefined && onToggle !== undefined
                ? { raw, isDefault: view.isDefaultStall === true, onToggle }
                : undefined,
    });
}

function footer(
    address: string | undefined,
    extra?: {
        share?: boolean;
        goHome?: () => void;
        onPublish?: () => void;
        defaultStall?: { raw: string; isDefault: boolean; onToggle: (raw: string) => void };
    },
): HTMLElement {
    const ft = el('footer', 'stall-foot');
    if (address !== undefined && address !== '') {
        ft.append(el('div', 'addr', address));
    }
    const publish = extra?.onPublish;
    if (publish !== undefined) {
        const btn = el('button', 'mini another', copy.SET_UP_THIS_STALL);
        btn.type = 'button';
        btn.setAttribute('data-role', 'open-publish');
        btn.addEventListener('click', publish);
        ft.append(btn);
    }
    const pin = extra?.defaultStall;
    if (pin !== undefined) {
        const label = pin.isDefault ? copy.OPENING_BY_DEFAULT : copy.OPEN_BY_DEFAULT;
        const btn = el('button', 'mini another', label);
        btn.type = 'button';
        btn.setAttribute('data-role', 'default-stall');
        btn.setAttribute('aria-pressed', pin.isDefault ? 'true' : 'false');
        btn.addEventListener('click', () => pin.onToggle(pin.raw));
        ft.append(btn);
    }
    if (extra?.goHome !== undefined) {
        const back = el('button', 'mini another', copy.OPEN_ANOTHER_STALL);
        back.type = 'button';
        back.setAttribute('data-role', 'open-another');
        back.addEventListener('click', extra.goHome);
        ft.append(back);
    }
    if (extra?.share === true) {
        ft.append(shareControl());
    }
    return ft;
}

function mid(title: string, paragraphs: string[]): HTMLElement {
    const wrap = el('div', 'mid');
    wrap.append(el('div', 'mid-t', title));
    for (const p of paragraphs) {
        wrap.append(el('p', 'mid-p', p));
    }
    return wrap;
}

function skeletonRow(name?: string): HTMLElement {
    const row = el('div', 'sk');
    row.append(el('div', 'sk-ic'));
    const info = el('div');
    if (name !== undefined && name !== '') {
        info.append(el('div', 'item-n', name));
    } else {
        info.append(el('div', 'sk-n'));
        info.append(el('div', 'sk-q'));
    }
    row.append(info);
    row.append(el('div', 'dash', copy.DASHED_PRICE));
    return row;
}

function hostsBox(triedAtMs: number, hosts: HostAttempt[]): HTMLElement {
    const box = el('div', 'hosts');
    const line = el('div');
    line.append(document.createTextNode(`${copy.TRIED} `));
    line.append(el('span', 'hosts-time', formatTriedAt(triedAtMs)));
    box.append(line);
    for (const host of hosts) {
        box.append(el('div', undefined, `${host.host} · ${host.result}`));
    }
    return box;
}

/** Manifest name when present; otherwise the stall's own address or pubkey. */
function displayName(view: StallView): string | undefined {
    if (view.stallName !== undefined && view.stallName !== '') {
        return view.stallName;
    }
    return identityOf(view);
}

/**
 * The route token this stall answers to — an address when one is known, else
 * whatever the route carried. Exported because `app.ts` needs the same answer
 * to decide whether this is the browser's default stall, and two copies of the
 * rule would drift.
 */
export function identityOf(view: StallView): string | undefined {
    if (view.address !== undefined && view.address !== '') {
        return view.address;
    }
    switch (view.route.kind) {
        case 'invalid':
            return view.route.raw;
        case 'unresolvable':
            return view.route.address;
        case 'unresolved':
            return view.route.address;
        case 'pubkey':
            return view.route.address ?? view.route.pubkeyHex;
    }
}

function hasCachedShop(view: StallView): boolean {
    return Boolean(view.stallName) || view.tokens.size > 0;
}

function tokenMeta(
    tokens: StallView['tokens'],
    tokenId: string,
): TokenMeta | undefined {
    return tokens.get(tokenId);
}

function tokenName(tokens: StallView['tokens'], tokenId: string): string {
    const meta = tokenMeta(tokens, tokenId);
    if (!meta) {
        return tokenId;
    }
    if (meta.name !== '') {
        return meta.name;
    }
    if (meta.ticker !== '') {
        return meta.ticker;
    }
    return tokenId;
}

/** Genesis ticker, omitted when missing or when it would duplicate the name. */
function tokenTicker(tokens: StallView['tokens'], tokenId: string): string | undefined {
    const ticker = tokenMeta(tokens, tokenId)?.ticker;
    if (ticker === undefined || ticker === '') {
        return undefined;
    }
    if (ticker === tokenName(tokens, tokenId)) {
        return undefined;
    }
    return ticker;
}

function decimalsOf(tokens: StallView['tokens'], tokenId: string): number {
    return tokenMeta(tokens, tokenId)?.decimals ?? 0;
}

/**
 * Genesis decimals, or undefined when metadata did not load. Distinct from
 * `decimalsOf`, which defaults to 0 and would throw a rate off by 10^decimals.
 */
function knownDecimals(tokens: StallView['tokens'], tokenId: string): number | undefined {
    const decimals = tokenMeta(tokens, tokenId)?.decimals;
    if (decimals === undefined || !Number.isInteger(decimals) || decimals < 0) {
        return undefined;
    }
    return decimals;
}

function initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter((p) => p.length > 0);
    if (parts.length >= 2) {
        return (parts[0]!.slice(0, 1) + parts[1]!.slice(0, 1)).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
}

function formatTriedAt(ms: number): string {
    const d = new Date(ms);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
}

function applyTitle(view: StallView): void {
    switch (view.route.kind) {
        case 'home':
            document.title = copy.HOME_TITLE;
            return;
        case 'invalid':
            document.title = copy.LINK_UNREADABLE_TITLE;
            return;
        case 'unresolvable':
            document.title = copy.UNRESOLVABLE_HEADER;
            return;
        default: {
            // A stall's own address, not the site name. stallName only exists
            // once a manifest has been published, and nothing can publish one
            // yet — so without this every real stall shares the apex's title,
            // which is exactly what an unfurled link shows.
            const name = displayName(view);
            document.title =
                name === undefined || name === '' ? copy.HOME_TITLE : name;
        }
    }
}

function pasteForm(handlers: StallHandlers): HTMLFormElement {
    const form = el('form', 'paste');
    const label = el('label', 'paste-label', copy.HOME_PASTE_LABEL);
    const input = el('input', 'paste-in');
    input.type = 'text';
    input.name = 'seller';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.setAttribute('aria-label', copy.HOME_PASTE_LABEL);
    const hint = el('p', 'fine', copy.HOME_PASTE_HINT);
    const err = el('p', 'ctx', '');
    err.hidden = true;
    err.setAttribute('data-role', 'paste-invalid');
    const submit = el('button', 'buy', copy.HOME_PASTE_SUBMIT);
    submit.type = 'submit';
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const raw = input.value.trim();
        if (parseSellerParam(raw).kind === 'invalid') {
            err.textContent = copy.HOME_PASTE_INVALID;
            err.hidden = false;
            return;
        }
        err.hidden = true;
        handlers.onOpenStall?.(raw);
    });
    label.append(input);
    form.append(label, hint, err, submit);
    return form;
}

function shareUrl(): string {
    return `${location.origin}${location.pathname}${location.search}`;
}

function shareControl(): HTMLElement {
    const wrap = el('div', 'share');
    wrap.setAttribute('data-role', 'copy-link');
    const url = shareUrl();
    const field = el('input', 'share-url');
    field.type = 'text';
    field.readOnly = true;
    field.value = url;
    field.setAttribute('aria-label', copy.COPY_LINK);
    const btn = el('button', 'mini', copy.COPY_LINK);
    btn.type = 'button';
    const fallback = (): void => {
        field.focus();
        field.select();
        btn.textContent = copy.COPY_LINK_FALLBACK;
    };
    btn.addEventListener('click', () => {
        const clipboard = navigator.clipboard;
        if (clipboard !== undefined && typeof clipboard.writeText === 'function') {
            void clipboard.writeText(url).then(
                () => {
                    btn.textContent = copy.LINK_COPIED;
                },
                () => {
                    fallback();
                },
            );
            return;
        }
        fallback();
    });
    wrap.append(field, btn);
    return wrap;
}

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
