
import {
    CASHTAB_LIST_URL,
    cashtabPublishUrl,
    cashtabTokenUrl,
    payECashPublishUrl,
    publishBip21,
} from '../domain/cashtab';
import { FIAT_CURRENCIES, formatFiat } from '../domain/fiat';
import { sectionsOf, type Category } from '../domain/category';
import { iconUrl } from '../domain/icons';
import { tokenUrl, tokenUrlHost } from '../domain/tokenlink';
import { fitsQr, qrMatrix } from '../domain/qr';
import { encodeManifestHex } from '../domain/manifest';
import {
    compareOffers,
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
    SHIPPED_THEMES,
    decodeTheme,
    themeVars,
    type DecodedTheme,
} from '../domain/theme';
import { stallMark } from './brand';
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
    /** Change the currency the fiat line is read in. */
    onChangeFiat?: (code: string) => void;
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

/**
 * Every handler in `app.ts` ends in a repaint, and a repaint replaces the whole
 * tree — so pressing Enter on the fifth offer put focus back on `<body>`, and a
 * keyboard user had to tab from the top of the page to read the disclosure they
 * had just opened. A live agora message did the same thing mid-interaction.
 *
 * The fix is a stable name per control that survives the rebuild. `publishSheet`
 * already knew this for one input — it rebuilds in place rather than repainting,
 * "a repaint would take the focus out of the field on every keystroke" — and the
 * lesson was never generalised.
 */
function focusKeyOf(node: Element | null): string | null {
    if (node === null) {
        return null;
    }
    return node.getAttribute('data-focus-key');
}

/**
 * Compared by value, never interpolated into a selector: an offer's key carries
 * a chain-derived txid, and `querySelector` would be parsing it.
 */
function restoreFocus(root: HTMLElement, key: string | null): void {
    if (key === null) {
        return;
    }
    for (const node of root.querySelectorAll('[data-focus-key]')) {
        if (node.getAttribute('data-focus-key') === key) {
            (node as HTMLElement).focus();
            return;
        }
    }
}

export function renderStall(
    root: HTMLElement,
    view: StallView,
    handlers: StallHandlers,
): void {
    paintedIconCells.clear();
    const keptFocus = focusKeyOf(root.ownerDocument.activeElement);
    root.replaceChildren();
    applyTitle(view);
    const frame = el('div', 'frame');
    const stall = el('div', 'stall');
    const theme = view.theme ?? DEFAULT_THEME;
    applyTheme(stall, theme);

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
    restoreFocus(root, keptFocus);
}

function applyTheme(stall: HTMLElement, theme: DecodedTheme): void {
    const vars = themeVars(theme);
    for (const [name, value] of Object.entries(vars)) {
        stall.style.setProperty(name, value);
    }
    // The strip is part of the look, so a live preview has to swap it too —
    // otherwise choosing Modern leaves Neo's ticker running above a white shop.
    // Direct children only, and walked rather than selected: `:scope >` is not
    // universally supported, and a miss here leaves two strips stacked.
    for (const child of [...stall.children]) {
        if (child.classList.contains('orn')) {
            child.remove();
        }
    }
    const next = ornamentStrip(theme);
    if (next !== null) {
        stall.prepend(next);
    }
}

function paintHome(stall: HTMLElement, handlers: StallHandlers): void {
    stall.append(header(copy.HOME_TITLE, copy.HOME_LEDE));
    const body = el('main', 'stall-body');
    body.append(mid('', [copy.HOME_HOW, copy.HOME_NO_ACCOUNT]));
    body.append(pasteForm(handlers));
    body.append(el('p', 'fine', copy.HOME_SELLER));
    body.append(demoSoon(handlers));
    stall.append(body);
}

/**
 * A signpost for the live demo stall, not the stall itself: the apex never
 * fetches. It waits on the owner listing from a real maker; until then this is
 * copy, never an empty shop dressed as a demo.
 */
function demoSoon(handlers: StallHandlers): HTMLElement {
    const wrap = el('div', 'demo-soon');
    wrap.setAttribute('data-role', 'demo-soon');
    wrap.append(el('div', 'mid-t', copy.HOME_DEMO_TITLE));
    wrap.append(el('p', 'fine', copy.HOME_DEMO_SOON));
    // A real route into a real stall. Still no fetch here: the apex never reads
    // the chain, so this is a link, not a preview — the door cannot promise
    // what that shop has in it, only that it is one.
    const open = el('button', 'mini', copy.HOME_DEMO_OPEN);
    open.type = 'button';
    open.setAttribute('data-role', 'open-demo');
    open.setAttribute('data-focus-key', 'open-demo');
    if (handlers.onOpenStall !== undefined) {
        const go = handlers.onOpenStall;
        open.addEventListener('click', () => go(copy.DEMO_STALL_ADDRESS));
    }
    wrap.append(open);
    return wrap;
}

function paintInvalid(stall: HTMLElement, raw: string, handlers: StallHandlers): void {
    stall.append(header(copy.LINK_UNREADABLE_TITLE));
    const body = el('main', 'stall-body');
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
    stall.append(header(copy.UNRESOLVABLE_HEADER, copy.UNRESOLVABLE_SUB, address));
    const body = el('main', 'stall-body');
    // A waiting state, not a shop. The seller pasted the address they sell from
    // before listing, which is the order the apex invites, so this is the first
    // screen a new seller sees — not a rare case. Give them the way forward: a
    // link to list, and a retry, because a listing is a new spend on page 0 and
    // resolves this address the next time it is read.
    body.append(
        mid(copy.UNRESOLVABLE_TITLE, [
            copy.UNRESOLVABLE_NEXT,
            copy.UNRESOLVABLE_BODY,
            copy.UNRESOLVABLE_HINT,
        ]),
    );
    body.append(listInCashtab());
    body.append(retryControl(handlers));
    stall.append(body);
    // No share: the link here opens "this address has never sent."
    stall.append(stallFooter(address, view, handlers, { share: false }));
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * A QR of `text` as an SVG, drawn from the module matrix with one `<path>` built
 * through the DOM, not a markup string, and no external image. Always black on
 * white with a quiet zone: a QR that inherits a theme colour or loses its margin
 * does not scan. `title` is what a screen reader announces.
 */
function qrSvg(text: string, title: string): SVGSVGElement {
    const matrix = qrMatrix(text);
    const n = matrix.length;
    const quiet = 4;
    const size = n + quiet * 2;
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', title);
    svg.classList.add('qr');
    const bg = document.createElementNS(SVG_NS, 'rect');
    bg.setAttribute('width', String(size));
    bg.setAttribute('height', String(size));
    bg.setAttribute('fill', '#ffffff');
    svg.append(bg);
    let d = '';
    for (let r = 0; r < n; r += 1) {
        for (let c = 0; c < n; c += 1) {
            if (matrix[r]![c]) {
                d += `M${c + quiet} ${r + quiet}h1v1h-1z`;
            }
        }
    }
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', '#000000');
    svg.append(path);
    return svg;
}

/** A real link to list, for a seller who has not listed yet. */
function listInCashtab(): HTMLElement {
    const wrap = el('p', 'mid-p');
    const link = el('a', 'buy', copy.LIST_IN_CASHTAB_LINK);
    link.href = CASHTAB_LIST_URL;
    link.rel = 'noopener noreferrer';
    link.target = '_blank';
    link.setAttribute('data-role', 'list-in-cashtab');
    link.setAttribute('data-focus-key', 'list-in-cashtab');
    wrap.append(link);
    return wrap;
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
    stall.append(header(identityOf(view), copy.UNRESOLVED_SUB, view.address));
    const body = el('main', 'stall-body');
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
    stall.append(header(displayName(view), copy.OPENING_SUB, view.address));
    const body = el('main', 'stall-body');
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
    retry.setAttribute('data-focus-key', 'retry');
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
    stall.append(header(displayName(view), copy.EMPTY_SUB, view.address));
    const body = el('main', 'stall-body');
    body.append(mid(copy.EMPTY_TITLE, [copy.EMPTY_BODY, copy.LIST_IN_CASHTAB]));
    if (view.overlay.kind === 'publish') {
        stall.append(publishOverlay(view, handlers));
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
    stall.append(header(displayName(view), copy.UNREADABLE_SUB, view.address));
    const body = el('main', 'stall-body');
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
        stall.append(header(displayName(view), copy.UNREACHABLE_SUB, view.address));
    } else {
        stall.append(header(identity));
    }

    const body = el('main', 'stall-body');
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
    stall.append(header(displayName(view), copy.itemsForSale(offers.length), view.address));
    const body = el('main', 'stall-body');
    // Ordered first, then divided. Nothing sorted before this, so two offers of
    // one token could sit either side of a third token's row. Copied: the array
    // belongs to the caller's view.
    const ordered = [...offers].sort(compareOffers);
    const sections = sectionsOf(ordered, view.tokens, (id) => view.nftGroups?.get(id));
    // One section is not a division, it is a heading over the whole shop. A
    // stall that sells only tokens should look like a stall, not a filing
    // cabinet with one drawer.
    const divided = sections.length > 1;
    for (const section of sections) {
        if (divided) {
            body.append(sectionHead(section.category, view));
        }
        for (const group of section.groups) {
            if (group.groupTokenId !== undefined) {
                body.append(collectionHead(group.groupTokenId, group.offers.length, view));
            }
            const items = el('div', 'items');
            for (const offer of group.offers) {
                items.append(offerRow(offer, view, handlers));
            }
            body.append(items);
        }
    }
    stall.append(body);

    if (view.overlay.kind === 'publish') {
        stall.append(publishOverlay(view, handlers));
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
/**
 * A section heading. The unsorted one explains itself: a row lands there
 * because *we* could not read its type, and a reader owed that distinction is
 * the same reader §4 protects from "empty" standing in for "unreachable".
 */
function sectionHead(category: Category, view: StallView): HTMLElement {
    const wrap = el('div', 'section-head');
    wrap.setAttribute('data-role', `section-${category}`);
    const label =
        category === 'etoken'
            ? copy.SECTION_ETOKEN
            : category === 'nft'
              ? copy.SECTION_NFT
              : copy.SECTION_UNSORTED;
    wrap.append(el('h2', 'section-title', label));
    if (category === 'unsorted') {
        wrap.append(el('p', 'fine', copy.SECTION_UNSORTED_WHY));
    }
    if (category === 'nft' && view.nftGroupsTruncated === true) {
        wrap.append(el('p', 'fine', copy.NFT_GROUPS_TRUNCATED));
    }
    return wrap;
}

/**
 * A collection heading over a run of NFTs minted from one group. It carries the
 * collection's name and how many rows follow, and **no price**: a heading
 * priced at its cheapest member would name a number no covenant encodes.
 */
function collectionHead(groupTokenId: string, count: number, view: StallView): HTMLElement {
    const wrap = el('div', 'collection-head');
    wrap.setAttribute('data-role', 'collection');
    const meta = view.tokens.get(groupTokenId);
    const name = meta?.name ?? meta?.ticker ?? groupTokenId;
    wrap.append(el('div', 'collection-name', copy.collectionOf(name)));
    wrap.append(el('div', 'collection-count', copy.itemsForSale(count)));
    return wrap;
}

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

function itemIcon(tokenId: string, name: string, extraClass?: string): HTMLElement {
    const cell = el('div', 'item-ic');
    if (extraClass !== undefined) {
        cell.classList.add(extraClass);
    }
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
/**
 * The sheet sits over the shop, docked to the bottom edge on a phone and
 * centred on a desktop. It is a disclosure the seller opened deliberately, so
 * covering the stall behind it is the point — but it scrolls and is never
 * taller than the screen, so it cannot strand an asked amount out of reach.
 * A click on the scrim closes it; a click inside it does not.
 */
function publishOverlay(view: StallView, handlers: StallHandlers): HTMLElement {
    const scrim = el('div', 'sheet-scrim');
    scrim.setAttribute('data-role', 'sheet-scrim');
    const sheet = publishSheet(view, handlers);
    scrim.append(sheet);
    const close = handlers.onClosePublish;
    if (close !== undefined) {
        scrim.addEventListener('click', (ev) => {
            if (ev.target === scrim) {
                close();
            }
        });
        // Escape is the other way out. Without it `aria-modal` was a claim the
        // markup did not honour — a dialog a keyboard user could not dismiss.
        // Bound on the sheet, which takes focus when it opens, so it hears the
        // key without the document growing a listener that outlives the paint.
        scrim.addEventListener('keydown', (ev) => {
            if ((ev as KeyboardEvent).key === 'Escape') {
                ev.preventDefault();
                close();
            }
        });
    }
    // Focus enters the sheet on open, so the next Tab is inside it and Escape
    // reaches the handler above. `tabindex="-1"` makes the panel itself a
    // target without putting it in the tab order.
    sheet.tabIndex = -1;
    sheet.setAttribute('data-focus-key', 'publish-sheet');
    queueMicrotask(() => {
        if (sheet.isConnected) {
            sheet.focus();
        }
    });
    return scrim;
}

function publishSheet(view: StallView, handlers: StallHandlers): HTMLElement {
    const wrap = el('div', 'sheet');
    wrap.setAttribute('data-role', 'publish');
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.setAttribute('aria-label', copy.PUBLISH_TITLE);
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
    // A phone keyboard capitalises the first character, and cashaddr is
    // case-strict: `Ecash:qq…` fails validation for an address that is correct.
    // Not fixed by lowercasing in the parser — mixed case is a real cashaddr
    // signal, and swallowing it is the leniency AGENTS.md §5 warns about.
    input.setAttribute('autocapitalize', 'none');
    input.setAttribute('autocorrect', 'off');
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
    const qrBox = el('div', 'publish-qr');
    qrBox.setAttribute('data-role', 'publish-qr');
    qrBox.hidden = true;
    const web = el('a', 'buy', copy.PUBLISH_OPEN_CASHTAB);
    web.setAttribute('data-role', 'publish-cashtab');
    web.setAttribute('data-focus-key', 'publish-cashtab');
    const app = el('a', 'mini another', copy.PUBLISH_OPEN_PAY);
    app.setAttribute('data-role', 'publish-pay');
    app.setAttribute('data-focus-key', 'publish-pay');
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
        // The bare BIP21 as a QR: the same record, for a phone wallet to scan
        // rather than a desktop link to follow. Rebuilt because its content is
        // the record, which changes with the name and the look.
        const bip21 = hex === undefined ? undefined : publishBip21(address, hex);
        // Bounded by the manifest grammar — a 32-byte name and a one-byte id —
        // so this never reaches the cap today. Asked anyway: the share QR was
        // also "obviously short enough" until a forwarded query string proved
        // otherwise, and a throw here lands inside a live rebuild.
        if (ready && bip21 !== undefined && fitsQr(bip21)) {
            qrBox.replaceChildren(
                qrSvg(bip21, copy.PUBLISH_QR_ALT),
                el('p', 'fine', copy.PUBLISH_QR_LEDE),
            );
            qrBox.hidden = false;
        } else {
            qrBox.replaceChildren();
            qrBox.hidden = true;
        }
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
    select.addEventListener('change', () => {
        refresh();
        // Paint the chosen look on the seller's own stall straight away. It is
        // a preview and nothing more: no record is signed here, so a reload
        // brings back whatever the chain says — which is what the note beside
        // this control has always been about. Applied to the live `.stall`
        // rather than through a repaint, because a repaint would rebuild this
        // sheet and take the focus out of the picker.
        const chosen = Number(select.value);
        const stall = select.closest('.frame')?.querySelector('.stall');
        if (stall !== null && stall !== undefined && Number.isInteger(chosen)) {
            applyTheme(stall as HTMLElement, decodeTheme(chosen));
        }
    });
    form.addEventListener('submit', (event) => event.preventDefault());
    form.append(label, themeLabel, err, sameLook);
    wrap.append(form);
    wrap.append(el('p', 'fine', copy.PUBLISH_MUST_SIGN));
    wrap.append(el('p', 'fine', copy.PUBLISH_WALLET_SHOWS_HEX));
    wrap.append(bytes);
    wrap.append(qrBox);
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
    check.setAttribute('data-focus-key', 'publish-check');
    check.addEventListener('click', () => {
        handlers.onRetry();
    });
    wrap.append(check);

    const close = el('button', 'mini another', copy.PUBLISH_CLOSE);
    close.type = 'button';
    close.setAttribute('data-role', 'publish-close');
    close.setAttribute('data-focus-key', 'publish-close');
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
    // Keyed by the outpoint: a partial fill re-creates the remainder as a new
    // UTXO, so a row that changed identity correctly loses focus rather than
    // handing it to whatever took its place in the list.
    head.setAttribute(
        'data-focus-key',
        `offer:${offer.outpoint.txid}:${offer.outpoint.outIdx}`,
    );
    head.append(itemIcon(offer.tokenId, name));
    // Spans, not divs: `<button>` takes phrasing content, and these are grid
    // items either way. The invalid markup also meant the button's accessible
    // name was one unbroken run of name, ticker, stock, "from", figure and rate.
    const info = el('span', 'item-b');
    info.append(el('span', 'item-n', name));
    const left = copy.remainingAtoms(formatAtoms(offer.atoms, d));
    info.append(
        el('span', 'item-q', ticker !== undefined ? `${ticker} · ${left}` : left),
    );
    // A touch device gets no cursor and no hover, so nothing said these rows
    // open. `aria-expanded` already told a screen reader; this tells a thumb.
    // Inside the name column on purpose — a fourth grid child with no named
    // area is auto-placed, and the implicit row it grows lands beside the price.
    const caret = el('span', 'item-caret');
    caret.setAttribute('aria-hidden', 'true');
    info.append(caret);
    head.append(info);
    const price = el('span', 'item-p');
    if (isUnbuyable(offer)) {
        // The price we hold is for a take the covenant will refuse. Printing
        // it would advertise a purchase that cannot happen.
        price.append(el('span', 'dash', copy.DASHED_PRICE));
        price.append(el('span', 'item-u', copy.UNBUYABLE_BADGE));
    } else {
        const amount = el('span', 'item-a');
        if (offer.askedAtoms < offer.atoms) {
            amount.append(el('span', 'item-from', copy.PRICE_FROM));
        }
        const asked = el('span', 'item-x', formatXec(offer.askedSats));
        asked.setAttribute('data-role', 'price');
        amount.append(asked);
        price.append(amount);
        price.append(el('span', 'item-u', copy.XEC));
        price.append(rateLine(offer, view));
    }
    // Fiat sits beside the rate, at rate size, in its own node — never inside
    // `[data-role="price"]`. It is supplementary: the covenant encodes
    // `askedSats`, and a figure large enough to be comfortable is a second
    // price. Absent whenever the feed did not answer.
    if (!isUnbuyable(offer)) {
        const fiat = formatFiat(offer.askedSats, view.fiatRate, view.fiatCode ?? '');
        if (fiat !== undefined) {
            const fiatLine = el('span', 'item-fiat', fiat);
            fiatLine.setAttribute('data-role', 'fiat');
            price.append(fiatLine);
        }
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
    const line = el('span', 'item-rate');
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

    // The token's own image, large, at the top of the opened card. Same source
    // and cache as the row icon (our Worker); initials stay until it loads and
    // a failed load keeps them, exactly as the small one does.
    const name = meta?.name ?? meta?.ticker ?? offer.tokenId;
    panel.append(itemIcon(offer.tokenId, name, 'item-ic-lg'));

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
    const link = tokenLink(meta);
    if (link !== undefined) {
        panel.append(link);
    }
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
    const link = tokenLink(meta);
    if (link !== undefined) {
        panel.append(link);
    }

    // No network fee row: this origin builds nothing, so it has no fee to
    // quote. Cashtab shows its own before it signs.

    // The panel used to precede a signature here. It now precedes a market.
    // Cashtab's depth bars are a per-token spot (sometimes fiat), not the
    // covenant minimum on this card — so there is no hunt figure to print.
    // `.note`, not `.ctx`. These are the two most load-bearing sentences on the
    // buyer's path, and they are an explanation, not an error: painting them in
    // the danger colour on every expanded card spent the one colour that should
    // mean something has gone wrong. `.ctx` keeps the validation errors and the
    // unbuyable line above, where red is the truth.
    panel.append(el('div', 'note', copy.HANDOFF_MAY_PRESELECT));
    panel.append(el('div', 'note', copy.HANDOFF_PRICE_IS_NOT_THE_ROW));

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

/**
 * The homepage from the token's genesis, if it is one this app will offer to
 * open. Two clicks, never one: the string was written by whoever minted the
 * token, it is permanent, and nobody checked it. So the reader sees the label,
 * the warning and the full destination before anything is a link at all —
 * and what opens is the parsed URL that was displayed, not the raw field.
 *
 * `noopener noreferrer` because the opened page must not reach back into this
 * one and must not learn which stall sent it.
 */
/**
 * The homepage from the token's genesis, in two deliberate steps.
 *
 * The string was written by whoever minted the token, it is permanent on chain,
 * and nobody checked it — least of all this page, which reads the chain and
 * verifies no claim in it. So it does not arrive as a link. It arrives as text:
 * shortened, in the muted role, plainly inert. Touching it reveals who wrote it
 * and what that is worth, and only then does the same text become a link and
 * take the accent colour — the colour change *is* the signal that it is now
 * live, which is why the arming step does not also move it.
 *
 * Following it then asks once more, naming the host, because a link a reader
 * did not choose to follow, from a source nobody verified, on a page about
 * money, is a phishing surface. The confirm is an anchor, not `window.open`:
 * the navigation stays a user gesture, so no popup blocker eats it.
 */
function tokenLink(meta: TokenMeta | undefined): HTMLElement | undefined {
    const href = tokenUrl(meta?.url);
    if (href === undefined) {
        return undefined;
    }
    const wrap = el('div', 'token-link');
    wrap.setAttribute('data-role', 'token-link');
    wrap.append(el('div', 'token-link-label', copy.TOKEN_LINK_LABEL));

    // One node throughout: an anchor carrying the real destination from the
    // start, so what is read is what is followed. Before it is armed it is
    // styled inert and its click arms instead of navigating.
    const link = el('a', 'token-link-url');
    link.textContent = href;
    link.href = href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('data-role', 'token-link-url');
    link.setAttribute('data-focus-key', `token-link:${meta?.tokenId ?? 'unknown'}`);
    link.setAttribute('aria-describedby', 'token-link-warning');

    const warning = el('p', 'note', copy.TOKEN_LINK_WARNING);
    warning.id = 'token-link-warning';
    warning.setAttribute('data-role', 'token-link-warning');
    warning.hidden = true;

    let armed = false;
    link.addEventListener('click', (ev) => {
        ev.preventDefault();
        if (!armed) {
            // First touch: say who wrote it, and let the colour say it is live.
            armed = true;
            warning.hidden = false;
            link.classList.add('token-link-live');
            return;
        }
        wrap.append(confirmLeaving(href));
    });

    wrap.append(link);
    wrap.append(warning);
    return wrap;
}

/**
 * The last step before leaving. Names the host on its own line: a lookalike
 * domain is caught there and nowhere else in a long href.
 */
function confirmLeaving(href: string): HTMLElement {
    const scrim = el('div', 'sheet-scrim');
    scrim.setAttribute('data-role', 'leave-confirm');
    const box = el('div', 'sheet');
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', copy.TOKEN_LINK_CONFIRM_TITLE);
    box.tabIndex = -1;
    box.append(el('div', 'mid-t', copy.TOKEN_LINK_CONFIRM_TITLE));
    const host = tokenUrlHost(href);
    if (host !== undefined) {
        box.append(el('div', 'token-link-host', copy.tokenLinkHost(host)));
    }
    box.append(el('div', 'token-link-url', href));
    box.append(el('p', 'note', copy.TOKEN_LINK_WARNING));

    const go = el('a', 'buy');
    go.textContent = copy.TOKEN_LINK_CONFIRM;
    go.href = href;
    go.target = '_blank';
    go.rel = 'noopener noreferrer';
    go.setAttribute('data-role', 'leave-confirm-go');
    const stay = el('button', 'mini', copy.TOKEN_LINK_CANCEL);
    stay.type = 'button';
    stay.setAttribute('data-role', 'leave-confirm-cancel');

    const close = (): void => scrim.remove();
    stay.addEventListener('click', close);
    go.addEventListener('click', close);
    scrim.addEventListener('click', (ev) => {
        if (ev.target === scrim) {
            close();
        }
    });
    scrim.addEventListener('keydown', (ev) => {
        if ((ev as KeyboardEvent).key === 'Escape') {
            ev.preventDefault();
            close();
        }
    });
    box.append(go);
    box.append(stay);
    scrim.append(box);
    queueMicrotask(() => {
        if (box.isConnected) {
            box.focus();
        }
    });
    return scrim;
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

function header(name?: string, sub?: string, address?: string): HTMLElement {
    const hd = el('header', 'stall-head');
    // The brand mark leads every screen — the app's identity, sitting beside
    // the seller's stall name, never replacing it. It carries its own colours
    // (§brand), so it reads on any theme this header is painted in.
    const sign = el('div', 'stall-sign');
    sign.append(stallMark());
    const headings = el('div', 'stall-headings');
    if (name !== undefined && name !== '') {
        // The one <h1> on every screen. A screen reader needs an outline to
        // navigate by; the whole site was <div>s. `stall.css` selects on class,
        // so nothing restyles.
        headings.append(el('h1', 'stall-name', name));
    }
    if (sub !== undefined && sub !== '') {
        headings.append(el('div', 'stall-sub', sub));
    }
    sign.append(headings);
    hd.append(sign);
    // The address belongs to the sign: it is what the shop is reachable at.
    // Never when it is already the name — an unnamed stall is titled by its own
    // route, and printing that twice says nothing the first line did not.
    if (address !== undefined && address !== '' && address !== name) {
        hd.append(el('div', 'addr', address));
    }
    return hd;
}

/**
 * A per-theme header strip, above the sign. Its label and kind are theme data
 * (`domain/theme.ts`), so a theme carries its own ornament in its own row: this
 * function is written once and never grows when a theme is added — only a brand
 * new *kind* touches this file or the stylesheet. Modern ships none; the strip
 * simply does not appear. It decorates the top of the stall and is nowhere near
 * the price, which it must never cover.
 */
function ornamentStrip(theme: DecodedTheme): HTMLElement | null {
    const orn = theme.ornament;
    if (orn === undefined) {
        return null;
    }
    // `kind` is a shipped enum, not chain bytes, so it is safe in a class name;
    // the label is set as text, never markup.
    return el('div', `orn orn-${orn.kind}`, orn.label);
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
    opts: { share?: boolean } = {},
): HTMLElement {
    const raw = identityOf(view);
    const onToggle = handlers.onToggleDefault;
    return footer(identity, {
        // A stall that never resolved is not a shareable shop: its link opens a
        // page that says the address has never sent. The caller drops share
        // there. Everywhere else the link is the point.
        share: opts.share ?? true,
        goHome: handlers.onGoHome,
        fiatCode: view.fiatCode,
        onChangeFiat: handlers.onChangeFiat,
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
        fiatCode?: string;
        onChangeFiat?: (code: string) => void;
    },
): HTMLElement {
    // The address is the sign's now, not the footer's: it names the shop, so it
    // belongs beside the name rather than under the controls. The parameter
    // stays because every caller still identifies the stall it is footing.
    void address;
    const ft = el('footer', 'stall-foot');
    const publish = extra?.onPublish;
    if (publish !== undefined) {
        const btn = el('button', 'mini another', copy.SET_UP_THIS_STALL);
        btn.type = 'button';
        btn.setAttribute('data-role', 'open-publish');
    btn.setAttribute('data-focus-key', 'open-publish');
        btn.addEventListener('click', publish);
        ft.append(btn);
    }
    const pin = extra?.defaultStall;
    if (pin !== undefined) {
        const label = pin.isDefault ? copy.OPENING_BY_DEFAULT : copy.OPEN_BY_DEFAULT;
        const btn = el('button', 'mini another', label);
        btn.type = 'button';
        btn.setAttribute('data-role', 'default-stall');
    btn.setAttribute('data-focus-key', 'default-stall');
        btn.setAttribute('aria-pressed', pin.isDefault ? 'true' : 'false');
        btn.addEventListener('click', () => pin.onToggle(pin.raw));
        ft.append(btn);
    }
    if (extra?.goHome !== undefined) {
        const back = el('button', 'mini another', copy.OPEN_ANOTHER_STALL);
        back.type = 'button';
        back.setAttribute('data-role', 'open-another');
    back.setAttribute('data-focus-key', 'open-another');
        back.addEventListener('click', extra.goHome);
        ft.append(back);
    }
    if (extra?.share === true) {
        ft.append(shareControl());
    }
    const onFiat = extra?.onChangeFiat;
    if (onFiat !== undefined) {
        ft.append(fiatPicker(extra?.fiatCode ?? '', onFiat));
    }
    return ft;
}

function mid(title: string, paragraphs: string[]): HTMLElement {
    const wrap = el('div', 'mid');
    // An empty heading is worse than none: it lands in the outline carrying no
    // text. The apex calls this with no title on purpose.
    if (title !== '') {
        wrap.append(el('h2', 'mid-t', title));
    }
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
    // Code points, not UTF-16 units: `slice` splits a surrogate pair, so an
    // emoji or astral-plane token name put a lone surrogate in the tile.
    return [...name].slice(0, 2).join('').toUpperCase();
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
    // A phone keyboard capitalises the first character, and cashaddr is
    // case-strict: `Ecash:qq…` fails validation for an address that is correct.
    // Not fixed by lowercasing in the parser — mixed case is a real cashaddr
    // signal, and swallowing it is the leniency AGENTS.md §5 warns about.
    input.setAttribute('autocapitalize', 'none');
    input.setAttribute('autocorrect', 'off');
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

/**
 * Which currency the fiat line is read in. A display preference, kept in
 * `localStorage` like the default stall — never anything that grows, never a
 * key. The list is the one the feed answers for, so a choice here cannot ask
 * for a code that silently returns nothing.
 */
function fiatPicker(code: string, onChange: (code: string) => void): HTMLElement {
    const label = el('label', 'paste-label', copy.FIAT_LABEL);
    const select = el('select', 'paste-in');
    select.name = 'fiat';
    select.setAttribute('data-role', 'fiat-picker');
    select.setAttribute('data-focus-key', 'fiat-picker');
    for (const c of FIAT_CURRENCIES) {
        const opt = el('option', undefined, `${c.name} (${c.symbol})`);
        opt.value = c.code;
        if (c.code === code) {
            opt.selected = true;
        }
        select.append(opt);
    }
    select.addEventListener('change', () => onChange(select.value));
    label.append(select);
    return label;
}

function shareControl(): HTMLElement {
    const wrap = el('div', 'share');
    wrap.setAttribute('data-role', 'copy-link');
    // The link is what this page exists to produce, so it says what it is for
    // rather than sitting unlabelled at the foot.
    wrap.append(el('p', 'fine', copy.SHARE_LEDE));
    const url = shareUrl();
    // A link too long to scan gets the copy field and a line saying why. Never
    // a code: past ~2,300 characters the library throws, and this runs inside
    // the footer of a tree `renderStall` has already emptied — so the throw
    // took the whole page down and every repaint took it down again.
    if (fitsQr(url)) {
        const qr = qrSvg(url, copy.SHARE_QR_ALT);
        qr.classList.add('share-qr');
        wrap.append(qr);
    } else {
        const note = el('p', 'fine', copy.SHARE_QR_TOO_LONG);
        note.setAttribute('data-role', 'qr-too-long');
        wrap.append(note);
    }
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
