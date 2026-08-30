
import {
    CASHTAB_LIST_URL,
    cashtabPublishUrl,
    cashtabTokenUrl,
    payECashPublishUrl,
    publishBip21,
} from '../domain/cashtab';
import { FIAT_CURRENCIES, formatFiat, isSupportedFiat } from '../domain/fiat';
import { sectionsOf, type Category } from '../domain/category';
import { iconUrl } from '../domain/icons';
import { tokenUrl, tokenUrlHost } from '../domain/tokenlink';
import { fitsQr, qrMatrix } from '../domain/qr';
import { OP_RETURN_BUDGET, encodeManifestHex } from '../domain/manifest';
import {
    MAX_DESCRIPTION_BYTES,
    descriptionBytes,
    descriptionRecordBytes,
    encodeDescriptionHex,
    encodeRemovalHex,
} from '../domain/description';
import {
    compareOffers,
    formatAtoms,
    formatTokenRate,
    formatXec,
    isUnbuyable,
    RATE_TOO_SMALL,
} from '../domain/money';
import { parseSellerParam, stallPath } from '../domain/route';
import {
    attachmentClasses,
    attachmentNodesWanted,
    attachmentsForTheme,
    withMood,
    wornAttachments,
    type ShippedAttachment,
} from '../domain/attachments';
import type {
    FetchStatus,
    HostAttempt,
    Outpoint,
    PanelKind,
    RouteWhy,
    ShopSort,
    StallEvent,
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
import mingoIcon from './mingo-icon.png';
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
    /** Switch the shell's panel. UI state only: no navigation, no load. */
    onSwitchPanel?: (panel: PanelKind) => void;
    /** Pin or unpin this stall on the browser's front door. */
    onTogglePin?: (raw: string) => void;
    /** Reorder a big shop's cards. UI state only, like the panel. */
    onChangeSort?: (sort: ShopSort) => void;
    /** Narrow a big shop to cards matching the typed text. */
    onChangeFilter?: (text: string) => void;
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
            // A rebuilt text field starts its caret at 0, so a visitor typing
            // into the find box would insert every next letter at the front.
            if (node instanceof HTMLInputElement) {
                const end = node.value.length;
                try {
                    node.setSelectionRange(end, end);
                } catch {
                    // Some input types refuse selection; focus is enough.
                }
            }
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
    applyTheme(stall, theme, view.worn ?? []);

    switch (view.route.kind) {
        case 'home':
            paintHome(stall, view, handlers);
            break;
        case 'invalid':
            paintInvalid(stall, view.route.raw, handlers, view.route.why);
            break;
        case 'unresolvable':
            paintUnresolvable(stall, view, handlers);
            break;
        case 'unresolved':
            paintUnresolved(stall, view, handlers);
            break;
        case 'pubkey': {
            // The three-panel shell. The shared link always lands on the
            // storefront; the panel is app state, never history.state
            // (PLAN-REDESIGN P3 — Back must not reload the stall or empty
            // the activity ring). One panel in the DOM at a time: a hidden
            // panel's protected boxes have no box at all, which stops the
            // layout probe cold.
            //
            // The panel paints into its own scroll region and the bar sits
            // after it, outside the scroll — never sticky, never fixed: a bar
            // that overlays scrolling content covers whatever figure happens
            // to pass under it, and the probe rightly refused exactly that on
            // its first run (`you-pay figure is covered by button.tab`).
            const scroller = el('div', 'stall-scroll');
            if (view.panel === 'studio') {
                paintStudio(scroller, view, handlers);
            } else if (view.panel === 'activity') {
                paintActivity(scroller, view, handlers);
            } else {
                paintPubkey(scroller, view, handlers);
            }
            stall.append(scroller);
            stall.append(stallTabs(view, handlers));
            break;
        }
    }

    /*
     * The publish sheet mounts here, once, for every pubkey screen with an
     * address — it used to mount only inside paintOffers and paintEmpty, so
     * the footer's publish control on other screens flipped the overlay and
     * painted nothing. The studio launcher needs it on its panel too.
     */
    if (
        view.route.kind === 'pubkey' &&
        view.overlay.kind === 'publish' &&
        view.address !== undefined &&
        view.address !== ''
    ) {
        stall.append(publishOverlay(view, handlers));
    }

    // After the screen, because a `yard` needs the footer to sit above and a
    // `fringe` needs the strip to sit inside. `applyTheme` has already put the
    // root classes on, which is everything a `root` row needs.
    placeAttachmentNodes(stall, view.worn ?? []);

    frame.append(stall);
    root.append(frame);
    restoreFocus(root, keptFocus);
}

function applyTheme(
    stall: HTMLElement,
    theme: DecodedTheme,
    worn: readonly ShippedAttachment[] = [],
): void {
    // A mood is merged before `themeVars`, never as a stylesheet block: every
    // `--s-*` is written inline on this element, and an inline custom property
    // beats any rule. Merging here also keeps `legibleOn` in the path, so a
    // palette a seller bought still cannot hide the asked amount.
    const vars = themeVars(withMood(theme, worn));
    for (const [name, value] of Object.entries(vars)) {
        stall.style.setProperty(name, value);
    }
    // The browser chrome joins the look: the static #0a1b33 in index.html is
    // the pre-paint colour, and a Rural stall framed by navy is somebody
    // else's page. Mood included — it went through the same merge above.
    document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', vars['--s-bg']!);
    // The strip is part of the look, so a live preview has to swap it too —
    // otherwise choosing Modern leaves Neo's ticker running above a white shop.
    // Direct children only, and walked rather than selected: `:scope >` is not
    // universally supported, and a miss here leaves two strips stacked.
    for (const child of [...stall.children]) {
        if (child.classList.contains('orn')) {
            child.remove();
        }
    }
    for (const cls of [...stall.classList]) {
        if (cls.startsWith('att-')) {
            stall.classList.remove(cls);
        }
    }
    stall.classList.add(...attachmentClasses(worn));
    const next = ornamentStrip(theme);
    if (next !== null) {
        stall.prepend(next);
    }
}

/**
 * The door, direction D from the Stall Design project ("Stall front"): the
 * paste box is the hero on a market-stall scene — canopy above, counter slab
 * under the box — with the old intro paragraphs compressed into three chips.
 * The scene is structure, not decoration, and it is door-only chrome: none
 * of it exists on a seller's stall, so none of it can cover a price.
 */
function paintHome(
    stall: HTMLElement,
    view: StallView,
    handlers: StallHandlers,
): void {
    stall.classList.add('door');
    const canopy = el('div', 'door-canopy');
    canopy.setAttribute('aria-hidden', 'true');
    stall.append(canopy);
    const body = el('main', 'stall-body door-wrap');
    const brand = el('header', 'door-brand');
    brand.append(stallMark());
    brand.append(el('h1', 'door-word', copy.HOME_TITLE));
    brand.append(el('p', 'door-value', copy.HOME_LEDE));
    body.append(brand);
    body.append(pasteForm(handlers));
    const chips = el('ul', 'door-chips');
    for (const chip of copy.HOME_CHIPS) {
        chips.append(el('li', undefined, chip));
    }
    body.append(chips);
    body.append(el('p', 'fine door-chips-fine', copy.HOME_CHIPS_FINE));
    const pinned = pinnedDoor(view, handlers);
    if (pinned !== null) {
        body.append(pinned);
    }
    const yours = el('p', 'fine door-yours', copy.HOME_SELLER);
    body.append(yours);
    body.append(demoSoon(handlers));
    body.append(doorPreview());
    stall.append(body);
}

/*
 * The door preview's tile art is the mingo token's icon (token
 * d6c88f410551f1eaa48cc65ee381cbec770d0797c508e10a75da835030024cdb, the
 * owner's own), vendored as a fingerprinted same-origin asset rather than
 * fetched from the icon Worker on every door load — the owner's call: the
 * apex stays a page that asks nothing of any other service. Recolored per
 * row with CSS filters; the flat tile underneath still covers a failed load.
 */

/**
 * The tilted storefront preview on the wide door: what a stall looks like,
 * shown instead of described. Decorative and inert — `aria-hidden`, no
 * controls, fixture content — because the door must not promise any real
 * shop's inventory (§3); the caption names it as the page's shape.
 */
function doorPreview(): HTMLElement {
    const aside = el('aside', 'door-preview');
    aside.setAttribute('aria-hidden', 'true');
    aside.setAttribute('data-role', 'door-preview');
    const card = el('div', 'pv-card');
    const head = el('div', 'pv-head');
    head.append(stallMark());
    const id = el('div');
    id.append(el('p', 'pv-name', copy.HOME_PREVIEW.name));
    id.append(el('p', 'pv-tagline', copy.HOME_PREVIEW.tagline));
    id.append(el('p', 'pv-sub', copy.HOME_PREVIEW.sub));
    head.append(id);
    card.append(head);
    copy.HOME_PREVIEW.items.forEach((item, i) => {
        const row = el('div', 'pv-item');
        const ic = el('i', `pv-ic pv-i${i + 1}`);
        const img = el('img', 'pv-icimg');
        img.src = mingoIcon;
        img.alt = '';
        img.addEventListener('error', () => img.remove());
        ic.append(img);
        row.append(ic);
        const mid2 = el('span', 'pv-b');
        mid2.append(el('span', 'pv-n', item.name));
        mid2.append(el('span', 'pv-q', item.qty));
        row.append(mid2);
        const price = el('span', 'pv-p');
        price.append(el('span', 'pv-x', item.price));
        price.append(el('span', 'pv-u', copy.XEC));
        row.append(price);
        card.append(row);
    });
    card.append(el('div', 'pv-foot', copy.HOME_PREVIEW.address));
    aside.append(card);
    aside.append(el('span', 'pv-tag', copy.HOME_PREVIEW.caption));
    return aside;
}

/**
 * The stalls this browser pinned. Route tokens from storage, painted as links
 * and nothing more: the apex never fetches, so no card here may promise a
 * name, a look or an inventory — that is the stall's own page to keep.
 */
function pinnedDoor(view: StallView, handlers: StallHandlers): HTMLElement | null {
    const pins = view.pinnedStalls ?? [];
    if (pins.length === 0) {
        return null;
    }
    const wrap = el('div', 'pinned');
    wrap.setAttribute('data-role', 'pinned-stalls');
    wrap.append(el('div', 'mid-t', copy.PINNED_TITLE));
    wrap.append(el('p', 'fine', copy.PINNED_LEDE));
    const list = el('div', 'pinned-list');
    for (const raw of pins) {
        const row = el('div', 'pinned-row');
        const open = el('button', 'pinned-open', shortStallToken(raw));
        open.type = 'button';
        open.setAttribute('data-role', 'pinned-open');
        // Value-compared by restoreFocus, never a selector — raw is storage.
        open.setAttribute('data-focus-key', `pin:${raw}`);
        const go = handlers.onOpenStall;
        if (go !== undefined) {
            open.addEventListener('click', () => go(raw));
        }
        row.append(open);
        const drop = el('button', 'pinned-drop', copy.PIN_REMOVE);
        drop.type = 'button';
        drop.setAttribute('data-role', 'pinned-unpin');
        drop.setAttribute('data-focus-key', `unpin:${raw}`);
        drop.setAttribute('aria-label', copy.unpinLabel(shortStallToken(raw)));
        const toggle = handlers.onTogglePin;
        if (toggle !== undefined) {
            drop.addEventListener('click', () => toggle(raw));
        }
        row.append(drop);
        list.append(row);
    }
    wrap.append(list);
    return wrap;
}

/**
 * A route token at glance length. Display only — the full token stays the
 * value every control carries; nothing routes on this string.
 */
function shortStallToken(raw: string): string {
    const body = raw.toLowerCase().startsWith('ecash:')
        ? raw.slice('ecash:'.length)
        : raw;
    return body.length <= 14 ? body : `${body.slice(0, 6)}…${body.slice(-4)}`;
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

function paintInvalid(
    stall: HTMLElement,
    raw: string,
    handlers: StallHandlers,
    why?: RouteWhy,
): void {
    const script = why === 'script-address';
    stall.append(header(script ? copy.SCRIPT_ADDRESS_TITLE : copy.LINK_UNREADABLE_TITLE));
    const body = el('main', 'stall-body');
    body.append(el('p', 'mid-p', raw));
    if (script) {
        body.append(el('p', 'note', copy.SCRIPT_ADDRESS_BODY));
    }
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

/**
 * The seller's notice (STL1 tag 0x05), leading the shop because "back on the
 * 10th" is what a visitor needs before they browse. Labelled as the seller's
 * words — the same trust shape as a description: signature verified, sentence
 * unvouched — and painted on the empty screen too, where "away until Monday"
 * is most of the explanation.
 */
function announcementNote(view: StallView): HTMLElement | null {
    const text = view.announcement;
    if (text === undefined || text === '') {
        return null;
    }
    const wrap = el('div', 'notice');
    wrap.setAttribute('data-role', 'announcement');
    wrap.append(el('span', 'notice-chip', copy.ANNOUNCEMENT_CHIP));
    wrap.append(el('p', 'notice-text', text));
    return wrap;
}

function paintEmpty(
    stall: HTMLElement,
    view: StallView,
    handlers: StallHandlers,
): void {
    stall.append(
        header(
            displayName(view),
            copy.EMPTY_SUB,
            view.address,
            view.tagline,
            signPinOf(view, handlers),
        ),
    );
    const body = el('main', 'stall-body');
    const notice = announcementNote(view);
    if (notice !== null) {
        body.append(notice);
    }
    body.append(mid(copy.EMPTY_TITLE, [copy.EMPTY_BODY, copy.LIST_IN_CASHTAB]));
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
    // The header counts what the shop displays: distinct tokens, one card
    // each. The per-token listing counts live on the cards and in the detail.
    const distinct = new Set(offers.map((offer) => offer.tokenId)).size;
    stall.append(
        header(
            displayName(view),
            copy.itemsForSale(distinct),
            view.address,
            view.tagline,
            signPinOf(view, handlers),
        ),
    );
    const body = el('main', 'stall-body');
    const notice = announcementNote(view);
    if (notice !== null) {
        body.append(notice);
    }
    /*
     * A big shop gets tools; a small one stays a stall. The threshold counts
     * the full shop, never the filtered remainder, so the tools cannot
     * filter themselves off the page. The filter narrows what is painted —
     * a way of looking, never a claim: the header above keeps counting
     * everything listed, and an emptied shelf says the filter did it.
     */
    const tools = distinct >= SHOP_TOOLS_MIN;
    if (tools) {
        body.append(shopTools(view, handlers));
    }
    const filter = tools ? normalizedFilter(view.shopFilter) : undefined;
    const shown =
        filter === undefined
            ? offers
            : offers.filter((o) => tokenMatchesFilter(view.tokens, o.tokenId, filter));
    if (filter !== undefined && shown.length === 0) {
        const none = el('p', 'mid-p', copy.SHOP_FILTER_NONE);
        none.setAttribute('data-role', 'filter-none');
        body.append(none);
    }
    /*
     * The featured token leads the shop (manifest tag 0x03): its card is
     * pulled above the sections under our own "Featured" chip and excluded
     * from them, so one listing is never two cards. Only when actually
     * listed — a featured id with no live offer paints nothing at all.
     */
    const featuredId = view.featuredTokenId;
    const featuredOffers =
        featuredId === undefined ? [] : shown.filter((o) => o.tokenId === featuredId);
    if (featuredOffers.length > 0) {
        const wrap = el('section', 'featured-wrap');
        wrap.setAttribute('data-role', 'featured');
        wrap.append(el('span', 'featured-chip', copy.FEATURED));
        wrap.append(
            offerRow({ tokenId: featuredId!, offers: featuredOffers }, view, handlers),
        );
        body.append(wrap);
    }
    const shelfOffers =
        featuredOffers.length > 0
            ? shown.filter((o) => o.tokenId !== featuredId)
            : shown;
    // Ordered first, then divided. Nothing sorted before this, so two offers of
    // one token could sit either side of a third token's row. Copied: the array
    // belongs to the caller's view.
    const ordered = [...shelfOffers].sort(compareOffers);
    const sort: ShopSort = tools ? (view.shopSort ?? 'curated') : 'curated';
    if (sort === 'curated') {
        /*
         * The seller's own shelves lead the curated view (STLD tag 0x01):
         * tokens whose winning record names a shelf are pulled out of the
         * type sections and grouped under that heading, in the order the
         * curated sort first meets them. The heading is seller text — the
         * decoder screened it, and it lands as textContent, never markup.
         * An explicit sort below flattens shelves and sections alike.
         */
        const named = view.shelves;
        let unshelved = ordered;
        if (named !== undefined && named.size > 0) {
            const runs = new Map<string, StallOffer[]>();
            unshelved = [];
            for (const offer of ordered) {
                const shelfName = named.get(offer.tokenId);
                if (shelfName === undefined) {
                    unshelved.push(offer);
                    continue;
                }
                const run = runs.get(shelfName);
                if (run === undefined) {
                    runs.set(shelfName, [offer]);
                } else {
                    run.push(offer);
                }
            }
            for (const [shelfName, run] of runs) {
                const listings = listingsOf(run);
                body.append(shelfHead(shelfName, listings.length));
                const items = el('div', 'items');
                for (const listing of listings) {
                    items.append(offerRow(listing, view, handlers));
                }
                body.append(items);
            }
        }
        const sections = sectionsOf(unshelved, view.tokens, (id) => view.nftGroups?.get(id));
        // One section is not a division, it is a heading over the whole shop. A
        // stall that sells only tokens should look like a stall, not a filing
        // cabinet with one drawer.
        const divided = sections.length > 1;
        for (const section of sections) {
            if (divided) {
                body.append(sectionHead(section.category, view));
            }
            for (const group of section.groups) {
                const listings = listingsOf(group.offers);
                if (group.groupTokenId !== undefined) {
                    body.append(collectionHead(group.groupTokenId, listings.length, view));
                } else if (group.groupLabel !== undefined) {
                    body.append(lookHead(group.groupLabel, listings.length));
                }
                const items = el('div', 'items');
                for (const listing of listings) {
                    items.append(offerRow(listing, view, handlers));
                }
                body.append(items);
            }
        }
    } else {
        // An explicit sort is one flat run: a price order that restarted at
        // every section border would not be a price order. The section and
        // collection headings return with the curated default.
        const items = el('div', 'items');
        for (const listing of sortedListings(listingsOf(ordered), sort, view.tokens)) {
            items.append(offerRow(listing, view, handlers));
        }
        body.append(items);
    }
    // Said on the shop that works, because that is where it is invisible.
    const dropped = view.fetch?.kind === 'offers' ? (view.fetch.dropped ?? 0) : 0;
    if (dropped > 0) {
        body.append(el('p', 'fine', copy.droppedOffers(dropped)));
    }
    stall.append(body);

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
              : category === 'decor'
                ? copy.SECTION_DECOR
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
/**
 * A run of decorations for one look. Printed whether or not the page has more
 * than one section, because on the shop that sells them there is only one — so
 * these are the only dividers it has.
 */
function lookHead(look: string, count: number): HTMLElement {
    const wrap = el('div', 'collection-head');
    wrap.setAttribute('data-role', 'decor-run');
    wrap.append(el('div', 'collection-name', copy.decorFor(look)));
    wrap.append(el('div', 'collection-count', copy.itemsForSale(count)));
    return wrap;
}

/**
 * The seller's own heading over a run of their cards (STLD tag 0x01). The
 * collection-head shape on purpose: a shelf is the seller's collection. Like
 * every heading here it carries a count and **no price** — a heading priced
 * at its cheapest member is a number no covenant encodes (§8).
 */
function shelfHead(name: string, count: number): HTMLElement {
    const wrap = el('div', 'collection-head');
    wrap.setAttribute('data-role', 'shelf');
    wrap.append(el('div', 'collection-name', name));
    wrap.append(el('div', 'collection-count', copy.itemsForSale(count)));
    return wrap;
}

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

/**
 * Any member outpoint keeps the card open: the overlay was opened on the
 * cheapest row, and a live re-read can hand "cheapest" to a sibling — the
 * visitor is reading this token, not one UTXO of it.
 */
function isExpanded(view: StallView, listing: TokenListing): boolean {
    if (view.overlay.kind !== 'buy') {
        return false;
    }
    const open = view.overlay.outpoint;
    return listing.offers.some(
        (offer) =>
            offer.outpoint.txid === open.txid && offer.outpoint.outIdx === open.outIdx,
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
/** The offers behind the current screen, or none when it is not a shop. */
function offersOf(view: StallView): readonly StallOffer[] {
    return view.fetch?.kind === 'offers' ? view.fetch.offers : [];
}

/**
 * One token, every offer of it in this stall. The card is the token — the
 * owner's call, 2026-08-29 — and the handoff was always per token
 * (`#/token/<id>`), so a token listed at three prices used to be three cards
 * pointing at one Cashtab page. The offers keep their identity underneath:
 * the expander and the live diff still speak outpoints.
 */
type TokenListing = {
    tokenId: string;
    offers: readonly StallOffer[];
};

/**
 * Buckets in first-appearance order. `compareOffers` sorts a category's
 * offers by token id already, so buckets come out contiguous either way.
 */
function listingsOf(offers: readonly StallOffer[]): TokenListing[] {
    const byToken = new Map<string, StallOffer[]>();
    for (const offer of offers) {
        const bucket = byToken.get(offer.tokenId);
        if (bucket === undefined) {
            byToken.set(offer.tokenId, [offer]);
        } else {
            bucket.push(offer);
        }
    }
    return [...byToken.entries()].map(([tokenId, list]) => ({ tokenId, offers: list }));
}

/**
 * The card's figure: the cheapest **buyable** ask — an `askedSats` the
 * covenant encodes, never a computed number, and never the market's (§10:
 * the index silently drops offers it cannot parse, so "lowest on Agora" is a
 * claim this app cannot prove; "lowest at this stall" it can). All-unbuyable
 * falls back to the first row so the card can still say why nothing sells.
 */
function cheapestOf(listing: TokenListing): StallOffer {
    const buyable = listing.offers.filter((offer) => !isUnbuyable(offer));
    const pool = buyable.length > 0 ? buyable : listing.offers;
    return pool.reduce((best, offer) => (offer.askedSats < best.askedSats ? offer : best));
}

/**
 * Cards or more before the sort and the find box appear. Below this they are
 * chrome on a shop a glance already covers.
 */
const SHOP_TOOLS_MIN = 7;

/** The typed filter as it is matched, or undefined for "not filtering". */
function normalizedFilter(text: string | undefined): string | undefined {
    const trimmed = (text ?? '').trim().toLowerCase();
    return trimmed === '' ? undefined : trimmed;
}

/**
 * Matched on what the card shows — name and ticker — plus the token id, for
 * the visitor who pasted one. Case-blind substring; no pattern language, so
 * nothing typed can become a selector or a regex.
 */
function tokenMatchesFilter(
    tokens: StallView['tokens'],
    tokenId: string,
    filter: string,
): boolean {
    if (tokenId.toLowerCase().includes(filter)) {
        return true;
    }
    if (tokenName(tokens, tokenId).toLowerCase().includes(filter)) {
        return true;
    }
    const ticker = tokenTicker(tokens, tokenId);
    return ticker !== undefined && ticker.toLowerCase().includes(filter);
}

/**
 * The explicit orders. Price sorts by the figure the card shows — its
 * cheapest buyable `askedSats`, a number a covenant encodes — never by a rate
 * across tokens, which compares nothing a visitor sees. Cards whose figure is
 * dashed (all rows unbuyable) sink to the end in either direction rather than
 * winning "cheapest" with a price that cannot be paid.
 */
function sortedListings(
    listings: TokenListing[],
    sort: Exclude<ShopSort, 'curated'>,
    tokens: StallView['tokens'],
): TokenListing[] {
    if (sort === 'name') {
        return [...listings].sort((a, b) =>
            tokenName(tokens, a.tokenId).localeCompare(tokenName(tokens, b.tokenId)),
        );
    }
    const keyOf = (listing: TokenListing): bigint | undefined => {
        const offer = cheapestOf(listing);
        return isUnbuyable(offer) ? undefined : offer.askedSats;
    };
    const flip = sort === 'price-desc' ? -1 : 1;
    return [...listings].sort((a, b) => {
        const ka = keyOf(a);
        const kb = keyOf(b);
        if (ka === undefined && kb === undefined) {
            return 0;
        }
        if (ka === undefined) {
            return 1;
        }
        if (kb === undefined) {
            return -1;
        }
        if (ka === kb) {
            return 0;
        }
        return ka < kb ? -flip : flip;
    });
}

/**
 * The find box and the sort, painted only over a big shop. Rebuilt on every
 * keystroke like everything else; the focus-key machinery keeps the caret's
 * field, and `restoreFocus` puts the caret back at the end of it.
 */
function shopTools(view: StallView, handlers: StallHandlers): HTMLElement {
    const wrap = el('div', 'shop-tools');
    wrap.setAttribute('data-role', 'shop-tools');
    const find = el('input', 'paste-in shop-find');
    find.type = 'search';
    find.maxLength = 64;
    find.placeholder = copy.SHOP_FILTER_HINT;
    find.setAttribute('aria-label', copy.SHOP_FILTER_HINT);
    find.value = view.shopFilter ?? '';
    find.setAttribute('data-role', 'shop-filter');
    find.setAttribute('data-focus-key', 'shop-filter');
    const onFilter = handlers.onChangeFilter;
    if (onFilter !== undefined) {
        find.addEventListener('input', () => onFilter(find.value));
    }
    wrap.append(find);
    const label = el('label', 'paste-label shop-sort-label', copy.SHOP_SORT_LABEL);
    const select = el('select', 'paste-in shop-sort');
    select.name = 'shop-sort';
    select.setAttribute('data-role', 'shop-sort');
    select.setAttribute('data-focus-key', 'shop-sort');
    const options: { value: ShopSort; label: string }[] = [
        { value: 'curated', label: copy.SHOP_SORT_CURATED },
        { value: 'price-asc', label: copy.SHOP_SORT_PRICE_ASC },
        { value: 'price-desc', label: copy.SHOP_SORT_PRICE_DESC },
        { value: 'name', label: copy.SHOP_SORT_NAME },
    ];
    const active: ShopSort = view.shopSort ?? 'curated';
    for (const option of options) {
        const opt = el('option', undefined, option.label);
        opt.value = option.value;
        if (option.value === active) {
            opt.selected = true;
        }
        select.append(opt);
    }
    const onSort = handlers.onChangeSort;
    if (onSort !== undefined) {
        select.addEventListener('change', () => {
            const picked = options.find((o) => o.value === select.value);
            if (picked !== undefined) {
                onSort(picked.value);
            }
        });
    }
    label.append(select);
    wrap.append(label);
    return wrap;
}

/**
 * The description editor, inside the settings sheet rather than on every card.
 *
 * One entry point: a control per offer row would put a second "publish" button
 * beside every buy control, for every visitor, on a page that cannot know which
 * of them is the seller.
 *
 * **Its own transaction, and the sheet says so.** A description is a separate
 * record from the stall's settings, so publishing one does not publish the
 * other, and describing three tokens costs three fees. A seller who learns that
 * after signing learns it the expensive way.
 */
function describeSection(
    view: StallView,
    address: string,
    offers: readonly StallOffer[],
): HTMLElement {
    const wrap = el('div', 'desc-section');
    wrap.setAttribute('data-role', 'describe');
    wrap.append(el('div', 'item-n', copy.DESC_TITLE));
    wrap.append(el('p', 'fine', copy.DESC_LEDE));

    const tokenIds = [...new Set(offers.map((o) => o.tokenId))];
    if (tokenIds.length === 0) {
        wrap.append(el('p', 'fine', copy.DESC_NO_TOKENS));
        return wrap;
    }

    const tokenLabel = el('label', 'paste-label', copy.DESC_TOKEN_LABEL);
    const picker = el('select', 'paste-in');
    picker.name = 'describe-token';
    picker.setAttribute('data-role', 'describe-token');
    picker.setAttribute('data-focus-key', 'describe-token');
    for (const id of tokenIds) {
        const meta = view.tokens.get(id);
        const option = el('option', '', meta?.name ?? meta?.ticker ?? id);
        option.value = id;
        picker.append(option);
    }
    tokenLabel.append(picker);
    wrap.append(tokenLabel);

    const textLabel = el('label', 'paste-label', copy.DESC_TEXT_LABEL);
    const field = el('textarea', 'paste-in');
    field.name = 'describe-text';
    field.rows = 3;
    field.setAttribute('data-role', 'describe-text');
    field.setAttribute('data-focus-key', 'describe-text');
    field.setAttribute('autocapitalize', 'sentences');
    textLabel.append(field);
    wrap.append(textLabel);

    // The shelf (STLD tag 0x01): one more field in the same record. maxLength
    // counts characters and is only first aid; the byte cap and the shared
    // budget are the encoder's, and the one meter below shows the record.
    const shelfLabel = el('label', 'paste-label', copy.DESC_SHELF_LABEL);
    const shelfField = el('input', 'paste-in');
    shelfField.type = 'text';
    shelfField.name = 'describe-shelf';
    shelfField.maxLength = 32;
    shelfField.autocomplete = 'off';
    shelfField.spellcheck = false;
    shelfField.setAttribute('data-role', 'describe-shelf');
    shelfField.setAttribute('data-focus-key', 'describe-shelf');
    shelfLabel.append(shelfField);
    wrap.append(shelfLabel);

    const counter = el('p', 'fine', '');
    counter.setAttribute('data-role', 'describe-bytes');
    wrap.append(counter);

    const err = el('p', 'ctx', '');
    err.hidden = true;
    err.setAttribute('data-role', 'describe-invalid');
    wrap.append(err);

    const bytes = el('p', 'fine publish-hex', '');
    bytes.setAttribute('data-role', 'describe-hex');
    bytes.hidden = true;
    wrap.append(bytes);

    const qrBox = el('div', 'publish-qr');
    qrBox.setAttribute('data-role', 'describe-qr');
    qrBox.hidden = true;
    wrap.append(qrBox);

    const web = el('a', 'buy', copy.PUBLISH_OPEN_CASHTAB);
    web.setAttribute('data-role', 'describe-cashtab');
    web.setAttribute('data-focus-key', 'describe-cashtab');
    const app = el('a', 'mini another', copy.PUBLISH_OPEN_PAY);
    app.setAttribute('data-role', 'describe-pay');
    app.setAttribute('data-focus-key', 'describe-pay');
    for (const link of [web, app]) {
        link.rel = 'noopener noreferrer';
        link.target = '_blank';
    }
    wrap.append(web);
    wrap.append(app);

    // Removal is its own record and its own transaction, offered only where
    // there is something to remove. It erases the words from this page; the
    // chain keeps every record ever published, and the copy says so.
    const remove = el('a', 'mini another', copy.DESC_REMOVE);
    remove.setAttribute('data-role', 'describe-remove');
    const removePay = el('a', 'mini another', copy.PUBLISH_OPEN_PAY);
    removePay.setAttribute('data-role', 'describe-remove-pay');
    for (const link of [remove, removePay]) {
        link.rel = 'noopener noreferrer';
        link.target = '_blank';
    }
    // A removal is a transaction like any other, so it gets the same three ways
    // to reach a wallet as publishing does. It had only the Cashtab web link,
    // which strands a seller who publishes from a phone: they could add words
    // and never take them back.
    const removeQr = el('div', 'publish-qr');
    removeQr.setAttribute('data-role', 'describe-remove-qr');
    removeQr.hidden = true;
    const removeLede = el('p', 'fine', copy.DESC_REMOVE_LEDE);
    wrap.append(removeLede);
    wrap.append(remove);
    wrap.append(removePay);
    wrap.append(removeQr);

    const refresh = (): void => {
        const tokenId = picker.value;
        const text = field.value;
        const shelf = shelfField.value;
        const used = descriptionBytes(text);
        // One meter for both fields, in record bytes against the shared
        // ceiling — two meters would promise two budgets where there is one,
        // and the 180-byte text cap alone cannot say why a shelf was refused.
        counter.textContent = copy.descBytesLeft(
            descriptionRecordBytes(text, shelf),
            OP_RETURN_BUDGET,
        );

        const empty = text === '' && shelf === '';
        const hex = empty
            ? undefined
            : encodeDescriptionHex(tokenId, text, {
                  shelf: shelf === '' ? undefined : shelf,
              });
        const ready = hex !== undefined;
        err.hidden = ready || empty;
        // Which rule bit, most specific first: the text's own caps, then the
        // shared record budget, then the text's screen, then the shelf's.
        err.textContent =
            used > MAX_DESCRIPTION_BYTES
                ? copy.DESC_TOO_LONG
                : /[\r\n]/.test(text)
                  ? copy.DESC_ONE_LINE
                  : descriptionRecordBytes(text, shelf) > OP_RETURN_BUDGET
                    ? copy.DESC_OVER_BUDGET
                    : text !== '' && encodeDescriptionHex(tokenId, text) === undefined
                      ? copy.DESC_REFUSED
                      : copy.DESC_SHELF_REFUSED;

        bytes.hidden = !ready;
        bytes.textContent = ready ? hex : '';
        const cashtab = ready ? cashtabPublishUrl(address, hex) : undefined;
        const pay = ready ? payECashPublishUrl(address, hex) : undefined;
        const linked = cashtab !== undefined && pay !== undefined;
        web.hidden = !linked;
        app.hidden = !linked;
        if (linked) {
            web.href = cashtab;
            app.href = pay;
        }

        const bip21 = ready ? publishBip21(address, hex) : undefined;
        if (bip21 !== undefined && fitsQr(bip21)) {
            qrBox.replaceChildren(
                qrSvg(bip21, copy.PUBLISH_QR_ALT),
                el('p', 'fine', copy.PUBLISH_QR_LEDE),
            );
            qrBox.hidden = false;
        } else {
            qrBox.replaceChildren();
            qrBox.hidden = true;
        }

        // Only offered when this page found something to remove — words or a
        // shelf, since one removal record erases the whole document for this
        // token. Publishing a removal over nothing costs a fee and changes
        // nothing.
        const existing = view.descriptions?.get(tokenId) ?? view.shelves?.get(tokenId);
        const removalHex = existing === undefined ? undefined : encodeRemovalHex(tokenId);
        const canRemove = removalHex !== undefined;
        remove.hidden = !canRemove;
        removeLede.hidden = !canRemove;
        const removeUrl = canRemove ? cashtabPublishUrl(address, removalHex) : undefined;
        const removePayUrl =
            canRemove && removalHex !== undefined
                ? payECashPublishUrl(address, removalHex)
                : undefined;
        remove.hidden = removeUrl === undefined;
        removeLede.hidden = removeUrl === undefined;
        removePay.hidden = removePayUrl === undefined;
        if (removeUrl !== undefined) {
            remove.href = removeUrl;
        }
        if (removePayUrl !== undefined) {
            removePay.href = removePayUrl;
        }
        const removeBip21 =
            canRemove && removalHex !== undefined
                ? publishBip21(address, removalHex)
                : undefined;
        if (removeBip21 !== undefined && fitsQr(removeBip21)) {
            removeQr.replaceChildren(
                qrSvg(removeBip21, copy.PUBLISH_QR_ALT),
                el('p', 'fine', copy.PUBLISH_QR_LEDE),
            );
            removeQr.hidden = false;
        } else {
            removeQr.replaceChildren();
            removeQr.hidden = true;
        }
    };

    // Rebuilt in place, never by repainting: a repaint would take the focus out
    // of the field on every keystroke.
    // The one-line rule is the wire's, and it is right: a control character is
    // how one line is made to look like several. But the field offered three
    // rows and took the key, then refused the record with copy about hiding
    // text. Refusing the keystroke says the same thing at the moment it is
    // made. A pasted newline still reaches `refresh`, which now names it.
    field.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
        }
    });
    field.addEventListener('input', refresh);
    shelfField.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
        }
    });
    shelfField.addEventListener('input', refresh);
    picker.addEventListener('change', () => {
        // The words belong to the token, so switching tokens loads theirs.
        field.value = view.descriptions?.get(picker.value) ?? '';
        shelfField.value = view.shelves?.get(picker.value) ?? '';
        refresh();
    });
    field.value = view.descriptions?.get(picker.value) ?? '';
    shelfField.value = view.shelves?.get(picker.value) ?? '';
    refresh();
    return wrap;
}

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
            if (ev.target !== scrim) {
                return;
            }
            // While the panel is lowered the scrim is transparent and the stall
            // is what the seller is looking at, so a click on it means "come
            // back", not "throw away the name I typed". Escape still closes.
            if (scrim.classList.contains('peek')) {
                scrim.classList.remove('peek');
                return;
            }
            close();
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
    trapTab(sheet);
    // Not `keydown`: a keyboard seller changes the look with the arrow keys,
    // and raising the panel on the key that just lowered it would make the
    // control unusable without a mouse.
    for (const kind of ['pointerdown', 'focusin'] as const) {
        sheet.addEventListener(kind, (ev) => {
            const target = ev.target instanceof Element ? ev.target : null;
            if (target !== null && target.closest('[data-role="theme-picker"]') !== null) {
                return;
            }
            scrim.classList.remove('peek');
        });
    }
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
    themeLabel.setAttribute('data-role', 'theme-picker');
    const select = el('select', 'paste-in');
    select.name = 'theme';
    select.setAttribute('data-focus-key', 'theme-picker');
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
        select.append(option);
    }
    // Set on the select after the options exist, not as `option.selected`
    // before each is appended. The old shape depended on when the flag was
    // assigned relative to the append, and `picker-shows-the-look-already-on-
    // screen` was passing on a coincidence: the runner landed on the second
    // option whatever the painted look, which happens to be Neo city.
    select.value = String(painted);
    themeLabel.append(select);

    /*
     * The three P5 fields, each a tagged push the reader already skips when
     * absent. The budget meter below is the shared 222-byte ceiling made
     * visible before anything is signed.
     */
    const taglineLabel = el('label', 'paste-label', copy.PUBLISH_TAGLINE_LABEL);
    const taglineInput = el('input', 'paste-in');
    taglineInput.type = 'text';
    taglineInput.name = 'tagline';
    taglineInput.autocomplete = 'off';
    taglineInput.spellcheck = false;
    taglineInput.setAttribute('data-role', 'publish-tagline');
    taglineInput.setAttribute('data-focus-key', 'publish-tagline');
    taglineInput.setAttribute('aria-label', copy.PUBLISH_TAGLINE_LABEL);
    taglineInput.value = view.tagline ?? '';
    taglineLabel.append(taglineInput);

    // The announcement (tag 0x05): the seller's dated sentence, painted
    // above the shelves with a "from the seller" chip. Same screen, same
    // budget, same record as everything else on this sheet.
    const announceLabel = el('label', 'paste-label', copy.PUBLISH_ANNOUNCEMENT_LABEL);
    const announceInput = el('input', 'paste-in');
    announceInput.type = 'text';
    announceInput.name = 'announcement';
    announceInput.autocomplete = 'off';
    announceInput.spellcheck = false;
    announceInput.setAttribute('data-role', 'publish-announcement');
    announceInput.setAttribute('data-focus-key', 'publish-announcement');
    announceInput.setAttribute('aria-label', copy.PUBLISH_ANNOUNCEMENT_LABEL);
    announceInput.value = view.announcement ?? '';
    announceLabel.append(announceInput);

    const featuredLabel = el('label', 'paste-label', copy.PUBLISH_FEATURED_LABEL);
    featuredLabel.setAttribute('data-role', 'theme-picker');
    const featuredSelect = el('select', 'paste-in');
    featuredSelect.name = 'featured';
    featuredSelect.setAttribute('data-role', 'publish-featured');
    featuredSelect.setAttribute('data-focus-key', 'publish-featured');
    featuredSelect.setAttribute('aria-label', copy.PUBLISH_FEATURED_LABEL);
    {
        const none = el('option', undefined, copy.DECOR_NONE);
        none.value = '';
        featuredSelect.append(none);
        for (const tokenId of [...new Set(offersOf(view).map((o) => o.tokenId))]) {
            const opt = el('option', undefined, tokenName(view.tokens, tokenId));
            opt.value = tokenId;
            featuredSelect.append(opt);
        }
        featuredSelect.value =
            view.featuredTokenId !== undefined &&
            [...featuredSelect.options].some((o) => o.value === view.featuredTokenId)
                ? view.featuredTokenId
                : '';
    }
    featuredLabel.append(featuredSelect);

    const fiatLabel = el('label', 'paste-label', copy.PUBLISH_FIAT_LABEL);
    fiatLabel.setAttribute('data-role', 'theme-picker');
    const fiatSelect = el('select', 'paste-in');
    fiatSelect.name = 'fiat-hint';
    fiatSelect.setAttribute('data-role', 'publish-fiat');
    fiatSelect.setAttribute('data-focus-key', 'publish-fiat');
    fiatSelect.setAttribute('aria-label', copy.PUBLISH_FIAT_LABEL);
    {
        const none = el('option', undefined, copy.DECOR_NONE);
        none.value = '';
        fiatSelect.append(none);
        for (const currency of FIAT_CURRENCIES) {
            const opt = el('option', undefined, currency.code.toUpperCase());
            opt.value = currency.code;
            fiatSelect.append(opt);
        }
        fiatSelect.value =
            view.fiatHint !== undefined && isSupportedFiat(view.fiatHint)
                ? view.fiatHint
                : '';
    }
    fiatLabel.append(fiatSelect);

    const budget = el('p', 'fine', '');
    budget.setAttribute('data-role', 'publish-budget');

    const err = el('p', 'ctx', '');
    err.hidden = true;
    err.setAttribute('data-role', 'publish-invalid');
    const sameLook = el('p', 'fine', copy.PUBLISH_SAME_LOOK);
    sameLook.hidden = true;
    sameLook.setAttribute('data-role', 'publish-same-look');
    const bytes = el('p', 'fine publish-hex', '');
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
        const extras = {
            tagline: taglineInput.value === '' ? undefined : taglineInput.value,
            featuredTokenId: featuredSelect.value === '' ? undefined : featuredSelect.value,
            fiatHint: fiatSelect.value === '' ? undefined : fiatSelect.value,
            announcement: announceInput.value === '' ? undefined : announceInput.value,
        };
        const hex = encodeManifestHex(input.value, Number(select.value), flags, extras);
        const cashtab = hex === undefined ? undefined : cashtabPublishUrl(address, hex);
        const pay = hex === undefined ? undefined : payECashPublishUrl(address, hex);
        const ready = cashtab !== undefined && pay !== undefined;
        // Which field refused: the name's own rules first, then the
        // announcement's, then the tagline's and the shared ceiling — the
        // seller is told the one that bit.
        const nameAlone = encodeManifestHex(input.value, Number(select.value), flags);
        const sansAnnouncement = encodeManifestHex(input.value, Number(select.value), flags, {
            ...extras,
            announcement: undefined,
        });
        err.hidden = ready || input.value === '';
        err.textContent = ready
            ? ''
            : nameAlone === undefined
              ? copy.PUBLISH_NAME_TOO_LONG
              : sansAnnouncement !== undefined
                ? copy.PUBLISH_ANNOUNCEMENT_INVALID
                : copy.PUBLISH_TAGLINE_INVALID;
        budget.textContent =
            hex === undefined ? '' : copy.publishBudget(hex.length / 2, OP_RETURN_BUDGET);
        budget.hidden = hex === undefined;
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
    taglineInput.addEventListener('input', refresh);
    announceInput.addEventListener('input', refresh);
    featuredSelect.addEventListener('change', refresh);
    fiatSelect.addEventListener('change', refresh);
    select.addEventListener('change', () => {
        refresh();
        // Paint the chosen look on the seller's own stall straight away. It is
        // a preview and nothing more: no record is signed here, so a reload
        // brings back whatever the chain says — which is what the note beside
        // this control has always been about. Applied to the live `.stall`
        // rather than through a repaint, because a repaint would rebuild this
        // sheet and take the focus out of the picker.
        const chosen = Number(select.value);
        // Flags do not travel across a look. Bit N means row N of *this*
        // theme's table, so carrying them over would hand the seller a
        // decoration they never chose — which is the thing "holding is not
        // consent" exists to prevent, arriving through the front door.
        flags = 0;
        renderDecor(chosen);
        previewLook(select, chosen, flags);
        refresh();
    });
    form.addEventListener('submit', (event) => event.preventDefault());
    /*
     * Decoration, one control per slot rather than one per row. Two selects at
     * most on any shipped look, which is why this is a picker and not six
     * toggles: a slot that holds one thing is a choice, and a choice is a list.
     * It also makes two bits in one slot unrepresentable, which is a better
     * answer than resolving them quietly after the record is signed.
     */
    let flags = view.attachmentFlags ?? 0;
    const decorWrap = el('div', 'decor');
    decorWrap.setAttribute('data-role', 'decor');
    const decorNote = el('p', 'fine', '');
    decorNote.setAttribute('data-role', 'decor-note');

    const describeChoice = (themeId: number): string => {
        const chosen = wornAttachments(themeId, flags);
        if (chosen.length === 0) {
            return '';
        }
        // The first thing that is not simply true of everything chosen: a row
        // nobody can hold yet outranks one this stall merely does not hold.
        if (chosen.some((r) => r.tokenId === undefined)) {
            return copy.DECOR_NOT_MINTED;
        }
        const held = view.heldTokens;
        if (held !== undefined && chosen.every((r) => held.has(r.tokenId!))) {
            return copy.DECOR_HELD;
        }
        return copy.DECOR_PREVIEW_ONLY;
    };

    const renderDecor = (themeId: number): void => {
        decorWrap.replaceChildren();
        const rows = attachmentsForTheme(themeId);
        if (rows.length === 0) {
            return;
        }
        decorWrap.append(el('p', 'fine', copy.DECOR_LEDE));
        for (const slot of [...new Set(rows.map((r) => r.slot))]) {
            const slotLabel = el('label', 'paste-label', `${copy.DECOR_LABEL} · ${slot}`);
            // Marked as a picker so choosing here keeps the panel lowered, the
            // same way choosing a look does — this is the other control whose
            // whole subject is the stall behind the sheet.
            slotLabel.setAttribute('data-role', 'theme-picker');
            const slotSelect = el('select', 'paste-in');
            slotSelect.name = `att-${slot}`;
            slotSelect.setAttribute('data-role', `decor-${slot}`);
            slotSelect.setAttribute('data-focus-key', `decor-${slot}`);
            slotSelect.setAttribute('aria-label', `${copy.DECOR_LABEL} — ${slot}`);
            const none = el('option', undefined, copy.DECOR_NONE);
            none.value = '';
            slotSelect.append(none);
            for (const row of rows.filter((r) => r.slot === slot)) {
                const opt = el('option', undefined, row.label);
                opt.value = String(row.bit);
                slotSelect.append(opt);
            }
            const on = rows.find((r) => r.slot === slot && (flags & (1 << r.bit)) !== 0);
            slotSelect.value = on === undefined ? '' : String(on.bit);
            slotSelect.addEventListener('change', () => {
                // One occupant per slot, enforced where the choice is made: every
                // other bit in this slot goes off before the chosen one goes on.
                for (const r of rows.filter((x) => x.slot === slot)) {
                    flags &= ~(1 << r.bit);
                }
                if (slotSelect.value !== '') {
                    flags |= 1 << Number(slotSelect.value);
                }
                previewLook(select, Number(select.value), flags);
                decorNote.textContent = describeChoice(Number(select.value));
                decorNote.hidden = decorNote.textContent === '';
                refresh();
            });
            slotLabel.append(slotSelect);
            decorWrap.append(slotLabel);
        }
        decorNote.textContent = describeChoice(themeId);
        decorNote.hidden = decorNote.textContent === '';
        decorWrap.append(decorNote);
        if (copy.FITTINGS_STALL !== undefined) {
            const shop = el('a', 'mini another', copy.DECOR_SHOP);
            shop.setAttribute('data-role', 'decor-shop');
            shop.href = stallPath(copy.FITTINGS_STALL);
            decorWrap.append(shop);
        }
    };

    renderDecor(painted);
    form.append(label, taglineLabel, announceLabel, themeLabel, featuredLabel, fiatLabel, budget, err, sameLook, decorWrap);
    wrap.append(form);
    wrap.append(el('p', 'fine', copy.PUBLISH_MUST_SIGN));
    wrap.append(el('p', 'fine', copy.PUBLISH_WALLET_SHOWS_HEX));
    wrap.append(bytes);
    wrap.append(qrBox);
    wrap.append(web, app);

    // Signing happens in another app. The socket now watches the stall address
    // as well as the agora group, so a record published from that wallet does
    // re-read on its own — but only while this page still has a connection, and
    // only if the wallet that signed it is this stall's. Neither is ours to
    // promise, which is why the copy above states them as conditions and this
    // control exists to ask outright. It runs a full refresh, so the sheet
    // closes and the answer is the stall itself.
    wrap.append(el('p', 'fine', copy.PUBLISH_AFTER_SIGNING));
    const check = el('button', 'mini', copy.PUBLISH_CHECK_NOW);
    check.type = 'button';
    check.setAttribute('data-role', 'publish-check');
    check.setAttribute('data-focus-key', 'publish-check');
    check.addEventListener('click', () => {
        handlers.onRetry();
    });
    wrap.append(check);

    // A second record, in the same place a seller already came to publish one.
    wrap.append(describeSection(view, address, offersOf(view)));

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
    listing: TokenListing,
    view: StallView,
    handlers: StallHandlers,
): HTMLElement {
    // The card speaks for its cheapest buyable row; the detail shows them all.
    const offer = cheapestOf(listing);
    const expanded = isExpanded(view, listing);
    const card = el('div', expanded ? 'item open' : 'item');
    // One-shot: set only by a message-triggered re-read with proven book
    // movement, and cleared by this very paint's caller — see StallView.
    if (view.justChanged?.has(listing.tokenId) === true) {
        card.classList.add('just-changed');
    }
    const name = tokenName(view.tokens, offer.tokenId);
    const ticker = tokenTicker(view.tokens, offer.tokenId);

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
    /*
     * The stock line is omitted when genesis decimals did not load, for the
     * same reason `rateLine` omits the rate: `decimalsOf` defaults to 0, and
     * `formatAtoms` at 0 prints the atoms verbatim — so a nine-decimal token
     * with one token left read as "1000000000 left". That is not a missing
     * number, it is a wrong one, printed as confidently as a right one. A
     * ticker with no count still says which token it is.
     */
    const known = knownDecimals(view.tokens, offer.tokenId);
    // Summed across every listing of this token: each addend is a UTXO's own
    // remaining atoms, so the sum is chain truth, not an estimate.
    const totalAtoms = listing.offers.reduce((sum, o) => sum + o.atoms, 0n);
    const left =
        known === undefined ? undefined : copy.remainingAtoms(formatAtoms(totalAtoms, known));
    const stock =
        left === undefined ? ticker : ticker !== undefined ? `${ticker} · ${left}` : left;
    if (stock !== undefined) {
        info.append(el('span', 'item-q', stock));
    }
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
        // Which meaning the figure has, said outright — never a second "from".
        if (listing.offers.length > 1) {
            price.append(
                el('span', 'item-lots', copy.lowestOfListings(listing.offers.length)),
            );
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
        card.append(itemDetail(view, listing));
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
function itemDetail(view: StallView, listing: TokenListing): HTMLElement {
    const offer = cheapestOf(listing);
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
    const described = tokenDescription(view, offer.tokenId);
    if (described !== undefined) {
        panel.append(described);
    }
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

    // Every listing of this token, cheapest first — the rest of what the
    // card's "lowest of N" promised. Each figure is that offer's own
    // `askedSats`; each row's meta is its own minimum take and stock.
    if (listing.offers.length > 1) {
        panel.append(listingsBlock(listing, view));
    }

    panel.append(tokenFacts(offer, meta, ticker));
    const described = tokenDescription(view, offer.tokenId);
    if (described !== undefined) {
        panel.append(described);
    }
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
 * Every listing of one token in this stall, cheapest first. Each row's figure
 * is that offer's own `askedSats` — a real asked amount, so it wears
 * `data-role="price"` and the probe guards it like any other money figure.
 * The meta beside it is the row's own minimum take and remaining stock; an
 * unbuyable row says so instead of advertising a price its covenant refuses.
 */
function listingsBlock(listing: TokenListing, view: StallView): HTMLElement {
    const wrap = el('div', 'listings');
    wrap.setAttribute('data-role', 'listings');
    wrap.append(
        el('div', 'token-desc-label', copy.listingsAtThisStall(listing.offers.length)),
    );
    const d = decimalsOf(view.tokens, listing.tokenId);
    const known = knownDecimals(view.tokens, listing.tokenId);
    const ticker = tokenTicker(view.tokens, listing.tokenId);
    const sorted = [...listing.offers].sort((a, b) =>
        a.askedSats < b.askedSats ? -1 : a.askedSats > b.askedSats ? 1 : 0,
    );
    for (const offer of sorted) {
        const line = el('div', 'listing-line');
        if (isUnbuyable(offer)) {
            line.append(el('span', 'listing-x', copy.DASHED_PRICE));
            line.append(el('span', 'listing-meta', copy.UNBUYABLE_BADGE));
        } else {
            const figure = el('span', 'listing-x', copy.payAmount(formatXec(offer.askedSats)));
            figure.setAttribute('data-role', 'price');
            line.append(figure);
            const minAtoms = formatAtoms(offer.askedAtoms, d);
            const parts = [
                copy.listingMin(ticker !== undefined ? `${minAtoms} ${ticker}` : minAtoms),
            ];
            if (known !== undefined) {
                parts.push(copy.remainingAtoms(formatAtoms(offer.atoms, known)));
            }
            line.append(el('span', 'listing-meta', parts.join(' · ')));
        }
        wrap.append(line);
    }
    return wrap;
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
 * The seller's own words about this token, when they published any.
 *
 * **Nothing at all when there are none.** A card must never carry an empty
 * description slot: absent here means "the seller wrote none" *or* "our walk
 * did not reach it", and only one of those is a fact about them. Printing the
 * first while holding the second is the collapse §4 exists to prevent.
 *
 * Rendered as text through `textContent`, like everything else here, and
 * deliberately not linkified. Stall's whole product is a handoff to Cashtab; a
 * seller-supplied clickable URL sitting beside that handoff would be the best
 * phishing surface this origin could ship. The genesis link already has its
 * own armed, confirmed control — this is not that.
 */
function tokenDescription(view: StallView, tokenId: string): HTMLElement | undefined {
    const text = view.descriptions?.get(tokenId);
    if (text === undefined || text === '') {
        return undefined;
    }
    const wrap = el('div', 'token-desc');
    wrap.setAttribute('data-role', 'token-description');
    wrap.append(el('div', 'token-desc-label', copy.TOKEN_DESCRIPTION_LABEL));
    wrap.append(el('p', 'token-desc-text', text));
    return wrap;
}

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
    trapTab(box);
    queueMicrotask(() => {
        if (box.isConnected) {
            box.focus();
        }
    });
    return scrim;
}

/**
 * Folded behind a native disclosure: the 64-character token id took two lines
 * in the middle of a card whose job is the price and the buy control. The
 * facts stay one tap away and fully rendered when open — and the layout probe
 * opens every <details> before it measures, so the fold cannot become a place
 * where a wrapped label or a covered figure hides (P0.5).
 */
function tokenFacts(
    offer: StallOffer,
    meta: TokenMeta | undefined,
    ticker: string | undefined,
): HTMLElement {
    const box = el('details', 'token-facts');
    box.append(el('summary', 'token-facts-summary', copy.TOKEN_FACTS_SUMMARY));
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

/** The sign's pin control, when this screen offers one. */
type SignPin = { pinned: boolean; full: boolean; onToggle: () => void };

function header(
    name?: string,
    sub?: string,
    address?: string,
    tagline?: string,
    pin?: SignPin,
): HTMLElement {
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
        const h1 = el('h1', 'stall-name', name);
        if (pin !== undefined) {
            // The pin sits at the name's corner — one icon, not a sentence
            // (owner's call 2026-08-30): pinning is a visitor's flick, and
            // the words live in the aria-label where a reader needs them.
            const row = el('div', 'stall-name-row');
            row.append(h1);
            row.append(signPinButton(pin, name));
            headings.append(row);
        } else {
            headings.append(h1);
        }
    }
    // The seller's own line, screened at decode like the name (tag 0x02) and
    // rendered as text through `textContent` like everything else. It is
    // their sign — the same surface class the name already is.
    if (tagline !== undefined && tagline !== '') {
        headings.append(el('div', 'stall-tagline', tagline));
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
 * The icon-only pin at the sign's corner. A thumbtack drawn through the DOM
 * (never markup strings), state on `aria-pressed`, words in the label. A
 * full door disables it and says which rule bit — the same refusal the
 * studio's text button used to carry, at a fraction of the room.
 */
function signPinButton(pin: SignPin, name: string): HTMLButtonElement {
    const btn = el('button', pin.pinned ? 'pin-btn pinned' : 'pin-btn');
    btn.type = 'button';
    btn.setAttribute('data-role', 'pin-stall');
    btn.setAttribute('data-focus-key', 'pin-stall');
    btn.setAttribute('aria-pressed', pin.pinned ? 'true' : 'false');
    const blocked = !pin.pinned && pin.full;
    btn.setAttribute(
        'aria-label',
        blocked ? copy.PIN_DOOR_FULL : pin.pinned ? copy.unpinLabel(name) : copy.PIN_TO_DOOR,
    );
    if (blocked) {
        btn.disabled = true;
        btn.title = copy.PIN_DOOR_FULL;
    } else {
        btn.title = pin.pinned ? copy.PINNED_ON_DOOR : copy.PIN_TO_DOOR;
        btn.addEventListener('click', pin.onToggle);
    }
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.classList.add('pin-ic');
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute(
        'd',
        'M15 2 L20 7 L18.6 8.4 L18 8.2 L14.4 11.8 L14.8 15 L13.4 16.4 L9.8 12.8 L5.4 17.2 L4 16.8 L4.4 15.4 L8.8 11 L5.2 7.4 L6.6 6 L9.8 6.4 L13.4 2.8 L13.2 2.2 Z',
    );
    svg.append(path);
    btn.append(svg);
    return btn;
}

/** The sign pin for a resolved stall, when the app wired a toggle. */
function signPinOf(view: StallView, handlers: StallHandlers): SignPin | undefined {
    const raw = identityOf(view);
    const onPin = handlers.onTogglePin;
    if (raw === undefined || onPin === undefined) {
        return undefined;
    }
    return {
        pinned: view.isPinnedStall === true,
        full: view.pinnedDoorFull === true,
        onToggle: () => onPin(raw),
    };
}

/**
 * A per-theme header strip, above the sign. Its label and kind are theme data
 * (`domain/theme.ts`), so a theme carries its own ornament in its own row: this
 * function is written once and never grows when a theme is added — only a brand
 * new *kind* touches this file or the stylesheet. Modern ships none; the strip
 * simply does not appear. It decorates the top of the stall and is nowhere near
 * the price, which it must never cover.
 */
/**
 * `aria-modal="true"` is a promise that the rest of the page is not reachable,
 * and Escape plus initial focus is only half of keeping it. Without a Tab cycle
 * the third Tab is on the stall behind the scrim — a screen reader is told the
 * background is inert while the keyboard walks straight into it.
 *
 * Focus is cycled rather than the background made `inert`: the sheet is rebuilt
 * on every paint, and an `inert` attribute left on a stall that outlives its
 * overlay is a shop nobody can click.
 */
function trapTab(panel: HTMLElement): void {
    panel.addEventListener('keydown', (ev) => {
        const event = ev as KeyboardEvent;
        if (event.key !== 'Tab') {
            return;
        }
        const focusable = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
            (node) => !node.hidden && node.getAttribute('aria-hidden') !== 'true',
        );
        if (focusable.length === 0) {
            // Nothing to move to, so the only honest answer is to stay put.
            event.preventDefault();
            return;
        }
        const first = focusable[0]!;
        const last = focusable[focusable.length - 1]!;
        const active = document.activeElement;
        if (event.shiftKey && (active === first || active === panel)) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && active === last) {
            event.preventDefault();
            first.focus();
        }
    });
}

const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The elements a worn set needs, placed by slot rather than by row — so adding
 * a row to the catalogue is a table edit and never a change here.
 *
 * A `fringe` lives inside the ornament strip, which clips it, and is simply not
 * painted on a look that ships no strip: a decoration with nowhere to be is not
 * a decoration that goes somewhere else. A `yard` gets a reserved strip of its
 * own above the footer, so the sprite has a place that is not on top of
 * anything — the specimen's fixed offset from the bottom lands on whatever
 * happens to sit there, which in production is the share code.
 */
/**
 * Paint a look on the stall behind the sheet, decorations included.
 *
 * Applied to the live `.stall` rather than through a repaint, because a repaint
 * rebuilds the sheet and takes the focus out of the control being used. That is
 * the same reason the theme picker has always worked this way; decorations join
 * it because they are the other half of the same question.
 */
function previewLook(anchor: Element, themeId: number, flags: number): void {
    const stall = anchor.closest('.frame')?.querySelector('.stall');
    if (stall === null || stall === undefined || !Number.isInteger(themeId)) {
        return;
    }
    const worn = wornAttachments(themeId, flags);
    applyTheme(stall as HTMLElement, decodeTheme(themeId), worn);
    placeAttachmentNodes(stall as HTMLElement, worn);
    anchor.closest('[data-role="sheet-scrim"]')?.classList.add('peek');
}

function placeAttachmentNodes(
    stall: HTMLElement,
    worn: readonly ShippedAttachment[],
): void {
    for (const node of [...stall.querySelectorAll('[class^="att-"], [class*=" att-"]')]) {
        if (node.parentElement !== null && !node.classList.contains('orn')) {
            node.remove();
        }
    }
    for (const row of attachmentNodesWanted(worn)) {
        const node = el('div', row.cls!);
        node.setAttribute('aria-hidden', 'true');
        if (row.slot === 'fringe') {
            stall.querySelector('.orn')?.append(node);
            continue;
        }
        if (row.slot === 'badge') {
            // In flow beside the sign's headings: a real box the guard
            // measures, jewellery rather than a control — `aria-hidden` and
            // `pointer-events: none` say so twice.
            stall.querySelector('.stall-sign')?.append(node);
            continue;
        }
        if (row.slot === 'trim') {
            // Behind the sign: a shallow stage before the head that paints
            // its own rays — one real box the guard can measure, folded out
            // of the flow by its own negative margin.
            stall.querySelector('.stall-head')?.before(node);
            continue;
        }
        if (row.slot === 'yard') {
            // The sprite is a second real node rather than a pseudo-element:
            // `::before` has no box, so the guard cannot measure it, and it is
            // refused outright for exactly that reason. The yard sits under
            // the sign now — a stage, not the footer's doormat: the first
            // billboard pass found the beetle below the fold on every screen.
            // Only the beetle carries a sprite; a yard row that is all stage
            // (the grid horizon) gets no empty child to style around.
            if (row.cls === 'att-beetle') {
                node.append(el('div', `${row.cls}-bug`));
            }
            const head = stall.querySelector('.stall-head');
            if (head !== null) {
                head.after(node);
            } else {
                stall.append(node);
            }
        }
    }
}

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
/**
 * The shell's tab bar: Studio · Shop · Activity, our words leading. The
 * centre tab may carry the seller's manifest name **subordinate** to our
 * label (`Shop · <name>`) — never alone: a seller's 32 bytes styled as our
 * navigation is chrome in our voice, and a stall named "Settings" would read
 * as Stall speaking. Only the manifest name rides here, never the address.
 *
 * Sticky in flow, never `position: fixed`: the layout probe samples at
 * scroll 0, and a fixed bar sitting on the footer address at the bottom of a
 * long page would be invisible to it.
 */
function stallTabs(view: StallView, handlers: StallHandlers): HTMLElement {
    const bar = el('nav', 'tabs');
    bar.setAttribute('role', 'tablist');
    bar.setAttribute('aria-label', 'Stall panels');
    const active: PanelKind = view.panel ?? 'shop';
    const tabs: { key: PanelKind; label: string; name?: string }[] = [
        { key: 'studio', label: copy.TAB_STUDIO },
        { key: 'shop', label: copy.TAB_SHOP, name: view.stallName },
        { key: 'activity', label: copy.TAB_ACTIVITY },
    ];
    for (const tab of tabs) {
        const btn = el('button', tab.key === 'shop' ? 'tab tab-shop' : 'tab');
        btn.type = 'button';
        btn.setAttribute('role', 'tab');
        btn.setAttribute('aria-selected', active === tab.key ? 'true' : 'false');
        btn.setAttribute('data-role', `tab-${tab.key}`);
        btn.setAttribute('data-focus-key', `tab-${tab.key}`);
        btn.append(el('span', 'tab-label', tab.label));
        if (tab.name !== undefined && tab.name !== '') {
            btn.append(el('span', 'tab-name', `· ${tab.name}`));
        }
        const go = handlers.onSwitchPanel;
        if (go !== undefined) {
            btn.addEventListener('click', () => go(tab.key));
        }
        bar.append(btn);
    }
    return bar;
}

/**
 * The seller studio: a launcher, not the sheet dismantled. It opens the same
 * modal publish sheet the footer control does, so the scrim, the tab trap,
 * and the mid-compose guard all keep their meaning (PLAN-REDESIGN P3).
 * Anyone can look — only this stall's wallet can sign, and the copy says so.
 */
function paintStudio(
    stall: HTMLElement,
    view: StallView,
    handlers: StallHandlers,
): void {
    stall.append(
        header(
            displayName(view),
            copy.STUDIO_SUB,
            view.address,
            view.tagline,
            signPinOf(view, handlers),
        ),
    );
    const body = el('main', 'stall-body');
    body.append(el('p', 'fine', copy.STUDIO_LEDE));
    const canPublish =
        view.address !== undefined &&
        view.address !== '' &&
        handlers.onOpenPublish !== undefined;
    if (canPublish) {
        const open = el('button', 'buy', copy.STUDIO_OPEN_SETTINGS);
        open.type = 'button';
        open.setAttribute('data-role', 'studio-open-publish');
        open.setAttribute('data-focus-key', 'studio-open-publish');
        const go = handlers.onOpenPublish!;
        open.addEventListener('click', () => go());
        body.append(open);
        body.append(el('p', 'fine', copy.STUDIO_SETTINGS_HINT));
    } else {
        body.append(el('p', 'fine', copy.PUBLISH_UNAVAILABLE));
    }
    const raw = identityOf(view);
    const onToggle = handlers.onToggleDefault;
    if (raw !== undefined && onToggle !== undefined) {
        const isDefault = view.isDefaultStall === true;
        const btn = el(
            'button',
            'mini another',
            isDefault ? copy.OPENING_BY_DEFAULT : copy.OPEN_BY_DEFAULT,
        );
        btn.type = 'button';
        btn.setAttribute('data-role', 'studio-default-stall');
        btn.setAttribute('data-focus-key', 'studio-default-stall');
        btn.setAttribute('aria-pressed', isDefault ? 'true' : 'false');
        btn.addEventListener('click', () => onToggle(raw));
        body.append(btn);
    }
    body.append(shareControl());
    posterControl(body, view);
    stall.append(body);
}

/**
 * The poster: the share link made physical, for the stall that also exists as
 * a table on a street. Pure client — the QR is the same module matrix the
 * share control draws, nothing is fetched — and the print stylesheet in
 * stall.css shows the poster page alone. The QR stays black on white with its
 * quiet zone (§9); the sheet previews exactly what the printer gets.
 */
function posterControl(body: HTMLElement, view: StallView): void {
    const url = shareUrl();
    // No QR, no poster: past the library's ceiling the poster would be a
    // sheet of text, and the share control already explains the long link.
    if (!fitsQr(url)) {
        return;
    }
    const wrap = el('div', 'poster-launch');
    wrap.append(el('p', 'fine', copy.POSTER_LEDE));
    const open = el('button', 'mini another', copy.POSTER_OPEN);
    open.type = 'button';
    open.setAttribute('data-role', 'open-poster');
    open.setAttribute('data-focus-key', 'open-poster');
    open.addEventListener('click', () => {
        // Self-managed like confirmLeaving: the sheet owns its own removal,
        // so no app state and no repaint — printing is not a view change.
        body.closest('.stall')?.append(posterSheet(view, url));
    });
    wrap.append(open);
    body.append(wrap);
}

function posterSheet(view: StallView, url: string): HTMLElement {
    const scrim = el('div', 'sheet-scrim poster-scrim');
    scrim.setAttribute('data-role', 'poster');
    const box = el('div', 'sheet poster-box');
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', copy.POSTER_TITLE);
    box.tabIndex = -1;

    // The page itself — the print stylesheet shows exactly this subtree.
    const page = el('div', 'poster-page');
    const name = displayName(view);
    if (name !== undefined) {
        page.append(el('div', 'poster-name', name));
    }
    if (view.tagline !== undefined && view.tagline !== '') {
        page.append(el('p', 'poster-tagline', view.tagline));
    }
    const qr = qrSvg(url, copy.SHARE_QR_ALT);
    qr.classList.add('poster-qr');
    page.append(qr);
    page.append(el('p', 'poster-scan', copy.POSTER_SCAN));
    page.append(el('p', 'poster-url', url));
    box.append(page);

    const controls = el('div', 'poster-controls');
    const print = el('button', 'buy', copy.POSTER_PRINT);
    print.type = 'button';
    print.setAttribute('data-role', 'poster-print');
    print.addEventListener('click', () => {
        window.print();
    });
    const close = el('button', 'mini', copy.POSTER_CLOSE);
    close.type = 'button';
    close.setAttribute('data-role', 'poster-close');
    const done = (): void => scrim.remove();
    close.addEventListener('click', done);
    scrim.addEventListener('click', (ev) => {
        if (ev.target === scrim) {
            done();
        }
    });
    scrim.addEventListener('keydown', (ev) => {
        if ((ev as KeyboardEvent).key === 'Escape') {
            ev.preventDefault();
            done();
        }
    });
    controls.append(print, close);
    box.append(controls);
    scrim.append(box);
    trapTab(box);
    queueMicrotask(() => {
        if (box.isConnected) {
            box.focus();
        }
    });
    return scrim;
}

/**
 * The activity panel: what this page watched arrive, said honestly.
 *
 * The list never stands in for coverage it does not have: screens with no
 * live socket say "not watching" instead of showing an empty feed (an empty
 * list there would be a statement about us painted as one about the seller —
 * the §4 collapse); a known gap says activity may be missing; the caption
 * dates from the last full load, because `refresh()` empties the ring.
 */
function paintActivity(
    stall: HTMLElement,
    view: StallView,
    handlers: StallHandlers,
): void {
    stall.append(
        header(
            displayName(view),
            copy.ACTIVITY_SUB,
            view.address,
            view.tagline,
            signPinOf(view, handlers),
        ),
    );
    const body = el('main', 'stall-body');
    const watching = view.fetch?.kind === 'offers' || view.fetch?.kind === 'empty';
    if (!watching) {
        body.append(el('p', 'note', copy.ACTIVITY_NOT_WATCHING));
        stall.append(body);
        return;
    }
    if (view.watchedSinceMs !== undefined) {
        body.append(el('p', 'fine', copy.activitySince(formatTriedAt(view.watchedSinceMs))));
    }
    if ((view.activityGaps ?? 0) > 0) {
        body.append(el('p', 'note', copy.ACTIVITY_GAPS));
    }
    const events = view.events ?? [];
    if (events.length === 0) {
        body.append(el('p', 'mid-p', copy.ACTIVITY_QUIET));
    } else {
        const list = el('div', 'events');
        list.setAttribute('data-role', 'events');
        for (const event of events) {
            list.append(eventRow(event));
        }
        body.append(list);
    }
    stall.append(body);
}

/**
 * One watched transaction. The kind label says only what the classifier
 * proves — `book` never says "sold": a cancel and a fully-taken offer are the
 * same shape on the wire. The txid is shortened for a glance; it is data,
 * not a link — this page links out to a market, not to an explorer, and a
 * row must not grow a control the visitor did not ask for.
 */
function eventRow(event: StallEvent): HTMLElement {
    const row = el('div', 'event');
    row.append(el('span', 'event-time', formatTriedAt(event.seenAtMs)));
    row.append(el('span', 'event-kind', eventLabel(event.kind, event.book)));
    row.append(el('span', 'event-txid', `${event.txid.slice(0, 10)}…`));
    return row;
}

function eventLabel(kind: StallEvent['kind'], book?: StallEvent['book']): string {
    switch (kind) {
        case 'book':
            // Only what the plugin entries proved. `consumed` covers a take
            // and a cancel alike — the wire cannot tell them apart, so the
            // row never says "sold".
            if (book === 'consumed') {
                return copy.EVENT_BOOK_CONSUMED;
            }
            if (book === 'appeared') {
                return copy.EVENT_BOOK_APPEARED;
            }
            if (book === 'both') {
                return copy.EVENT_BOOK_BOTH;
            }
            return copy.EVENT_BOOK;
        case 'settings':
            return copy.EVENT_SETTINGS;
        case 'description':
            return copy.EVENT_DESCRIPTION;
        case 'token-move':
            return copy.EVENT_TOKEN_MOVE;
        case 'other':
            return copy.EVENT_OTHER;
    }
}

function stallFooter(
    identity: string | undefined,
    view: StallView,
    handlers: StallHandlers,
    opts: { share?: boolean } = {},
): HTMLElement {
    const raw = identityOf(view);
    const onToggle = handlers.onToggleDefault;
    /*
     * A resolved stall has the Studio tab, and the seller's tools live
     * there now (owner's call, 2026-08-30): the shop tab is pure
     * storefront, so its footer keeps only what a visitor uses — the way
     * out and the currency. Every pubkey screen has the tab bar, failure
     * states included, so "the studio has it" holds on all of them. The
     * unresolved routes have no tabs and keep the fuller footer: a seller
     * stranded there still deserves the default toggle, and there is no
     * studio to send them to.
     */
    const hasStudio = view.route.kind === 'pubkey';
    const ft = footer(identity, {
        // A stall that never resolved is not a shareable shop: its link opens a
        // page that says the address has never sent. The caller drops share
        // there. Everywhere else the link belongs to the studio's share block.
        share: hasStudio ? false : (opts.share ?? true),
        goHome: handlers.onGoHome,
        fiatCode: view.fiatCode,
        onChangeFiat: handlers.onChangeFiat,
        defaultStall:
            !hasStudio && raw !== undefined && onToggle !== undefined
                ? { raw, isDefault: view.isDefaultStall === true, onToggle }
                : undefined,
    });
    /*
     * The credit line: every worn decoration named, in our words. It is the
     * catalogue's own billboard — a visitor who likes what a stall wears is
     * told what it is called, and, once the fittings stall exists, where it
     * came from.
     */
    const worn = view.worn ?? [];
    if (worn.length > 0) {
        ft.append(
            el('p', 'fine wearing', copy.wearing(worn.map((row) => row.label))),
        );
    }
    return ft;
}

function footer(
    address: string | undefined,
    extra?: {
        share?: boolean;
        goHome?: () => void;
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
            // The title is what an unfurled link and a tab strip show, so it
            // carries the same distinction the screen does: "unreadable" about
            // a valid address is a false claim wherever it is printed.
            document.title =
                view.route.why === 'script-address'
                    ? copy.SCRIPT_ADDRESS_TITLE
                    : copy.LINK_UNREADABLE_TITLE;
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

/**
 * The hero paste box (Stall Design, direction D): the label is the page's
 * display line, the `s/` prefix shows the shape of the link being built, the
 * button lives inside the box, and the hint sits on the counter slab under
 * it. Same control contract as ever — same input attributes, same
 * `paste-invalid` line, same submit path into `onOpenStall`.
 */
function pasteForm(handlers: StallHandlers): HTMLFormElement {
    const form = el('form', 'paste door-paste');
    const label = el('label', 'door-display', copy.HOME_PASTE_LABEL);
    label.htmlFor = 'seller-input';
    const unit = el('div', 'door-unit');
    const pfx = el('span', 'door-pfx', 's/');
    pfx.setAttribute('aria-hidden', 'true');
    const input = el('input', 'paste-in door-paste-in');
    input.type = 'text';
    input.id = 'seller-input';
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
    const submit = el('button', 'buy door-open', copy.HOME_PASTE_SUBMIT);
    submit.type = 'submit';
    unit.append(pfx, input, submit);
    const slab = el('div', 'door-slab');
    // The counter's legs are a real node, not a positioned ::after: the
    // layout probe refuses positioned pseudo-elements outright — no box to
    // measure against the protected ones — and the door is measured
    // decorated like every screen.
    const legs = el('div', 'door-legs');
    legs.setAttribute('aria-hidden', 'true');
    slab.append(legs);
    const hint = el('p', 'fine door-hint', copy.HOME_PASTE_HINT);
    const err = el('p', 'ctx', '');
    err.hidden = true;
    err.setAttribute('data-role', 'paste-invalid');
    slab.append(hint, err);
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const raw = input.value.trim();
        const parsed = parseSellerParam(raw);
        if (parsed.kind === 'invalid') {
            err.textContent =
                parsed.why === 'script-address'
                    ? copy.HOME_PASTE_SCRIPT_ADDRESS
                    : copy.HOME_PASTE_INVALID;
            err.hidden = false;
            return;
        }
        err.hidden = true;
        handlers.onOpenStall?.(raw);
    });
    form.append(label, unit, slab);
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
