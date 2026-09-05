
import {
    CASHTAB_LIST_URL,
    cashtabPayUrl,
    cashtabPublishUrl,
    cashtabTokenUrl,
    payBip21,
    payECashPayUrl,
    payECashPublishUrl,
    publishBip21,
} from '../domain/cashtab';
import { fiatCurrency, formatFiat, formatXecRate, satsForQuote } from '../domain/fiat';
import { isPriceable, sectionsOf, type Category } from '../domain/category';
import { ICON_HERO_SIZE, ICON_ROW_SIZE, iconUrl, type IconSize } from '../domain/icons';
import { tokenUrl, tokenUrlHost } from '../domain/tokenlink';
import { fitsQr, qrMatrix } from '../domain/qr';
import { OP_RETURN_BUDGET, encodeManifestHex } from '../domain/manifest';
import { encodePaymentMemoHex } from '../domain/payment';
import {
    MAX_DESCRIPTION_BYTES,
    XEC_PRICE_CODE,
    descriptionBytes,
    descriptionRecordBytes,
    encodeDescriptionHex,
    encodeRemovalHex,
    formatPriceFigure,
    parsePriceFigure,
    type TokenPrice,
} from '../domain/description';
import {
    compareOffers,
    DUST_SATS,
    formatAtoms,
    formatTokenRate,
    formatXec,
    isUnbuyable,
    RATE_TOO_SMALL,
} from '../domain/money';
import { parseSellerParam, stallPath } from '../domain/route';
import { isLegibleText, itemTitle, TOKEN_NAME_MAX_CHARS, cutAtCodePoints,} from '../domain/text';
import { isWithheldToken } from '../domain/withheld';
import type { GenesisAttribution } from '../domain/genesis';
import { recordAge } from '../domain/age';
import {
    attachmentClasses,
    attachmentNodesWanted,
    attachmentsForTheme,
    withMood,
    publishableFlags,
    wornAttachments,
    type ShippedAttachment,
} from '../domain/attachments';
import type {
    EventStatus,
    FetchStatus,
    HostAttempt,
    PanelKind,
    PosterFormat,
    RouteWhy,
    SessionTokenCache,
    ShopSort,
    ShopTab,
    StallEvent,
    StallHistory,
    StallOffer,
    StallView,
    TokenMeta,
    Overlay,
} from '../domain/state';
import { MAX_ACTIVITY_PAGES, MAX_STALL_EVENTS } from '../domain/state';
import { EXPLORER_TX_URL } from '../domain/explorer';
import {
    DEFAULT_THEME,
    DEFAULT_THEME_ID,
    FONT_STACKS,
    NEO_CITY_THEME_ID,
    RURAL_THEME_ID,
    SHIPPED_THEMES,
    decodeTheme,
    themeVars,
    tierCharCeilings,
    type DecodedTheme,
} from '../domain/theme';
import { stallMark } from './brand';
import * as copy from './copy';
import { renderBroadcastView } from './broadcast';
import { OBS_GUIDE_TITLE, paintObsGuide } from './obsGuide';
import {
    drawPoster,
    posterSpec,
    savePng,
    type PosterKind,
    type PosterPaint,
} from './posterImage';
import mingoIcon from './mingo-icon.png';
import './stall.css';
import './theme-modern.css';
import './theme-neo.css';
import './theme-rural.css';
import './broadcast.css';

export type StallHandlers = {
    /** Open one token's face on one rail — the expander raised to a surface. */
    onOpenItem: (tokenId: string, rail: 'listings' | 'quotes') => void;
    onRetry: () => void;
    onCloseSheet: () => void;
    /** Apex paste. Optional so a render-only test need not invent navigation. */
    onOpenStall?: (raw: string, pasted?: boolean) => void;
    /** Stall → apex. Optional so a render-only test need not invent navigation. */
    onGoHome?: () => void;
    /** Toggle whether the bare domain opens this stall. */
    onToggleDefault?: (raw: string) => void;
    /** Open the stall's own record: name, tagline, announcement, look, decor. */
    onOpenPublish?: () => void;
    /**
     * Open one token's record. The id is a preselection, never a promise: the
     * picker's set is what the stall lists, and an id that is not in it simply
     * does not select.
     */
    onOpenDescribe?: (tokenId?: string) => void;
    /** Change the currency the fiat line is read in. */
    onChangeFiat?: (code: string) => void;
    /**
     * Open the pay sheet for one quoted item. The app fetches and freezes the
     * rate there, so the figure a buyer reads cannot move under their cursor.
     */
    onOpenPay?: (tokenId: string) => void;
    /**
     * Ask the feed for a fresh rate for the open pay sheet: it is remembered
     * without a paint and handed straight back, because the sheet holds the
     * buyer's own quantity in its closure and a repaint would throw it away.
     *
     * The fetch itself stays on the app's side of the wall; the sheet decides
     * when to ask, which is on the refresh control and on a stale press.
     */
    /**
     * The quantity the buyer typed into the pay sheet, so a repaint — the
     * rate landing, a flush when the overlay closes — rebuilds the sheet with
     * it rather than at one. Answers nothing and paints nothing.
     */
    onPayQuantity?: (tokenId: string, quantity: bigint) => void;
    onPayRate?: (
        timeoutMs?: number,
    ) => Promise<{ rate: bigint; atMs: number } | undefined>;
    /**
     * One token, on the seller's own ask: its genesis facts, and whether this
     * stall's own wallet minted it.
     *
     * **Answered, never painted.** The describe sheet holds a half-written
     * record in the DOM and nowhere else, so an answer that triggered a repaint
     * would take it — this hands the answer back and the sheet refreshes in
     * place. The read itself stays on the app's side of the wall; `src/ui`
     * never imports chronik.
     */
    onLookupToken?: (
        tokenId: string,
    ) => Promise<{ meta?: TokenMeta; attribution: GenesisAttribution }>;
    /** Close whichever sheet is open. They all wear the same way out. */
    onClosePublish?: () => void;
    onOpenPoster?: () => void;
    onClosePoster?: () => void;
    onChoosePosterFormat?: (format: PosterFormat) => void;
    /** Switch the shell's panel. UI state only: no navigation, no load. */
    onSwitchPanel?: (panel: PanelKind) => void;
    /** Pin or unpin this stall on the browser's front door. */
    onTogglePin?: (raw: string) => void;
    /** Reorder a big shop's cards. UI state only, like the panel. */
    onChangeSort?: (sort: ShopSort) => void;
    /**
     * Show the other rail of the Shop panel. UI state only, like the sort —
     * no navigation, no load, and nothing written down: which figures a
     * reader is looking at is not a fact about the stall.
     */
    onSwitchShopTab?: (tab: ShopTab) => void;
    /** Narrow a big shop to cards matching the typed text. */
    onChangeFilter?: (text: string) => void;
    /**
     * The seller tries a look on. Undefined clears it — picking the
     * record's own look back is how a preview ends.
     */
    onPreviewLook?: (preview: { themeId: number; attachmentFlags: number } | undefined) => void;
    /**
     * Read one more page of this address's history.
     *
     * **A plain handler, called by whatever asks.** The panel's control calls
     * it, and so does an `IntersectionObserver` on the sentinel when the
     * reader scrolls to the foot of the list — the observer is an
     * accelerator, never the mechanism, because happy-dom's is a no-op and a
     * paging path only a real browser can reach is a paging path no test can
     * drive. The app decides which page that is; the panel never counts.
     */
    onReadHistoryPage?: () => void;
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
 *
 * Says whether it landed: the caller owns what happens when the control is
 * gone, because "gone" means two different things — a sold row must not hand
 * focus to whatever replaced it, and a closed sheet must hand focus back to
 * its opener rather than dropping a keyboard visitor at `<body>`, which
 * resets a screen reader to the top of the page.
 */
function restoreFocus(root: HTMLElement, key: string | null): boolean {
    if (key === null) {
        return false;
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
            return true;
        }
    }
    return false;
}

/**
 * Across paints, one fact each: whether the last painted view held an open
 * overlay, and the focus key of the control the visitor was on when it
 * opened. Module state rather than view state on purpose — it describes the
 * DOM this module just built, not the stall, and it must survive
 * `replaceChildren` exactly because nothing in the tree does.
 */
let overlayWasOpen = false;
let overlayOpener: string | null = null;

/**
 * The one node a live update may speak through. It lives on `<body>`, beside
 * the root and not inside it, because `renderStall` replaces the whole tree
 * on every paint — an `aria-live` region rebuilt with the paint it is meant
 * to announce is a region a screen reader never hears. Polite, and only for
 * the book: a page whose premise is a live socket said nothing at all to a
 * visitor who cannot see the outline pulse.
 */
function announce(doc: Document, message: string): void {
    let region = doc.getElementById('sr-live');
    if (region === null) {
        region = doc.createElement('div');
        region.id = 'sr-live';
        region.className = 'sr-live';
        region.setAttribute('role', 'status');
        doc.body.append(region);
    }
    // The same text twice is not re-announced; alternate an invisible tail.
    region.textContent = region.textContent === message ? `${message} ` : message;
}

/**
 * A look being tried on outranks the record's own on every paint — that is
 * what lets the seller walk to the Shop tab and see the candidate
 * storefront instead of snapping back. Previewing shows the rows
 * regardless of holding (looking is free); only a published record ever
 * needs the entitlement. One rule, one place: the frame and every card
 * that must know which look is painting it (`priceTier`'s per-look
 * ceilings) read it here.
 */
function activePreview(view: StallView): { themeId: number; attachmentFlags: number } | undefined {
    return view.previewLook !== undefined &&
        (view.previewLook.themeId !== (view.theme ?? DEFAULT_THEME).id ||
            view.previewLook.attachmentFlags !== (view.attachmentFlags ?? 0))
        ? view.previewLook
        : undefined;
}

export function paintedThemeId(view: StallView): number {
    return activePreview(view)?.themeId ?? (view.theme ?? DEFAULT_THEME).id;
}

export function renderStall(
    root: HTMLElement,
    view: StallView,
    handlers: StallHandlers,
): void {
    paintedIconCells.clear();
    // A timer from the paint before this one would fire against a tree that
    // no longer exists; the sheet that wants one arms it again below.
    clearPayQrTimer();
    const keptFocus = focusKeyOf(root.ownerDocument.activeElement);
    // Snapshot the opener on the idle→open edge only: a live repaint while
    // the sheet is up finds focus *inside* the sheet, and overwriting the
    // snapshot with that would return focus to a control about to vanish.
    const overlayOpen = view.overlay.kind !== 'idle';
    if (overlayOpen && !overlayWasOpen) {
        overlayOpener = focusKeyOf(root.ownerDocument.activeElement);
    }
    // Only a change a reader can see: a withheld listing that moved is a
    // book move over a screen on which nothing moved.
    const shownTokens = new Set(offersOf(view).map((offer) => offer.tokenId));
    if ([...(view.justChanged ?? [])].some((tokenId) => shownTokens.has(tokenId))) {
        announce(root.ownerDocument, copy.EVENT_BOOK);
    }
    root.replaceChildren();
    applyTitle(view);
    const frame = el('div', 'frame');
    const stall = el('div', 'stall');
    const previewed = activePreview(view);
    const theme = previewed !== undefined ? decodeTheme(previewed.themeId) : (view.theme ?? DEFAULT_THEME);

    /*
     * The overlay is a second render path on every route except `invalid`
     * (a streamer who typed a wrong seller needs to read that) and `home`
     * (the param cannot land there). Early return: no tabs, no publish
     * mount, no ornament, no footer. Moods still reach the palette.
     */
    if (
        view.broadcast !== undefined &&
        view.route.kind !== 'invalid' &&
        view.route.kind !== 'home'
    ) {
        const moods = (view.worn ?? []).filter((row) => row.slot === 'mood');
        applyTheme(stall, theme, moods, { ornament: false });
        stall.classList.add('broadcast');
        if (view.broadcast.transparent) {
            stall.classList.add('bc-clear');
            document.documentElement.classList.add('bc-clear');
            document.documentElement.style.backgroundColor = '';
            document
                .querySelector('meta[name="theme-color"]')
                ?.setAttribute('content', '');
        } else {
            document.documentElement.classList.remove('bc-clear');
        }
        stall.append(renderBroadcastView(view));
        frame.append(stall);
        root.append(frame);
        overlayWasOpen = overlayOpen;
        return;
    }

    document.documentElement.classList.remove('bc-clear');
    applyTheme(
        stall,
        theme,
        previewed !== undefined
            ? wornAttachments(previewed.themeId, previewed.attachmentFlags)
            : (view.worn ?? []),
    );

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
     * The sheets mount here, once, for every pubkey screen with an address —
     * they used to mount only inside paintOffers and paintEmpty, so the
     * footer's publish control on other screens flipped the overlay and
     * painted nothing. The studio launchers need them on their panel too.
     *
     * `overlayMounts` is the gate, and `livePaint` in app.ts asks that same
     * function whether to hold a paint back: two lists of overlay kinds kept
     * in step by hand is how an overlay that mounts nothing stops a stall
     * updating for good.
     */
    if (overlayMounts(view)) {
        if (view.overlay.kind === 'publish-name') {
            stall.append(sheetOverlay(nameSheet(view, handlers), 'publish-sheet', handlers));
        } else if (view.overlay.kind === 'describe') {
            stall.append(sheetOverlay(describeSheet(view, handlers), 'describe-sheet', handlers));
        } else if (view.overlay.kind === 'pay') {
            stall.append(sheetOverlay(paySheet(view, handlers), 'pay-sheet', handlers));
        } else if (view.overlay.kind === 'poster') {
            stall.append(posterSheet(view, shareUrl(), stall, handlers));
        }
    }

    // After the screen, because a `yard` needs the footer to sit above and a
    // `fringe` needs the strip to sit inside. `applyTheme` has already put the
    // root classes on, which is everything a `root` row needs.
    placeAttachmentNodes(stall, view.worn ?? []);

    frame.append(stall);
    root.append(frame);
    // A link that named no item brings the section into view once — the app
    // clears the flag with the paint that showed it, so a live repaint cannot
    // throw a reader who has scrolled elsewhere back down the page.
    if (view.payHintScroll === true) {
        scrollSectionIntoView(stall.querySelector('[data-role="pay-section"]'));
    }
    // The container is the last resort a repaint may hand focus to: not
    // tabbable, but focusable by script, so an orphaned keyboard visitor
    // resumes from the shop instead of from `<body>` at the top of the page.
    stall.tabIndex = -1;
    let landed = restoreFocus(root, keptFocus);
    if (!overlayOpen && overlayWasOpen) {
        // The sheet just closed. Its own controls are gone with it, so the
        // WAI-ARIA dialog contract applies: focus returns to the control
        // that opened it. `keptFocus` wins when it still exists — Escape
        // pressed with focus on a control the shop kept is not a hand-off.
        if (!landed) {
            landed = restoreFocus(root, overlayOpener);
        }
        overlayOpener = null;
    }
    if (!landed && keptFocus !== null) {
        // The control the visitor was on is gone — a sold row, a removed
        // screen — and nothing better claimed the focus. A sold row's
        // replacement must NOT (the test that pins this says why); the
        // container is neutral ground.
        stall.focus();
    }
    overlayWasOpen = overlayOpen;
}

/** id → the class its shipped stylesheet is scoped under. */
const THEME_CLASS: Record<number, string> = {
    [DEFAULT_THEME_ID]: 't-modern',
    [NEO_CITY_THEME_ID]: 't-neo',
    [RURAL_THEME_ID]: 't-rural',
};

function applyTheme(
    stall: HTMLElement,
    theme: DecodedTheme,
    worn: readonly ShippedAttachment[] = [],
    opts: { ornament?: boolean } = {},
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
    // And so does the page behind the page: rubber-band overscroll shows
    // whatever colour <html> carries, and white above a night market reads
    // as a broken frame (owner report, 2026-08-30).
    document.documentElement.style.backgroundColor = vars['--s-bg']!;
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
        if (cls.startsWith('att-') || cls.startsWith('t-')) {
            stall.classList.remove(cls);
        }
    }
    /*
     * The look's own stylesheet, by class (owner's ruling, 2026-08-30:
     * the design files apply directly). The chain still supplies only a
     * one-byte id — this maps it to a class over CSS we ship, exactly as
     * the ornament kind always has. Unknown ids wear the default's class.
     */
    stall.classList.add(THEME_CLASS[theme.id] ?? 't-modern');
    stall.classList.add(...attachmentClasses(worn));
    if (opts.ornament !== false) {
        const next = ornamentStrip(theme);
        if (next !== null) {
            stall.prepend(next);
        }
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
    // One quiet line for streamers. A plain link to a document path: the
    // guide is static and outside the app's router (§9), so this is a real
    // navigation, not a pushState.
    const stream = el('p', 'fine door-stream');
    stream.append(copy.HOME_STREAM_LEAD, ' ');
    const streamLink = el('a', undefined, copy.HOME_STREAM_LINK);
    streamLink.setAttribute('href', '/stream');
    streamLink.setAttribute('data-role', 'door-stream-link');
    stream.append(streamLink);
    body.append(stream);
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

/**
 * A numbered checklist: the number is a real `<i>` node, never a `::before`
 * counter the layout probe refuses. `now` marks the step the reader is on
 * (`aria-current="step"`); a `status` line under a step says what this page
 * is waiting for or will do — a fact about the page, never a time.
 */
function stepsList(
    rows: ReadonlyArray<{ step: string; status?: string }>,
    now?: number,
): HTMLOListElement {
    const list = el('ol', 'steps');
    rows.forEach((row, i) => {
        const li = el('li', i === now ? 'now' : undefined);
        if (i === now) {
            li.setAttribute('aria-current', 'step');
        }
        li.append(el('i', undefined, String(i + 1)));
        const words = el('span');
        words.append(row.step);
        if (row.status !== undefined) {
            words.append(el('span', 'st', row.status));
        }
        li.append(words);
        list.append(li);
    });
    return list;
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
    stall.append(header(copy.FIRST_STALL_HEADER, copy.FIRST_STALL_SUB, address));
    const body = el('main', 'stall-body');
    // A waiting state, not a shop, and for a new seller the first screen: they
    // pasted the address they sell from before listing, which is the order
    // the door invites. A checklist with the stuck step marked, one control
    // for that step, a retry — a listing is a new spend on page 0 and
    // resolves this address the next time it is read — and the one fact
    // about this page: it is watching (`waiting-address-resolves-on-its-own`).
    // No timing is promised: the wrong wallet, a silent node or a dropped
    // socket each break the promise a "seconds" would make.
    appendPayHintNote(body, view);
    const card = el('section', 'card beat first-stall');
    card.setAttribute('data-role', 'first-stall');
    card.append(stepsList(copy.FIRST_STALL_STEPS, 0));
    const acts = el('div', 'acts');
    acts.setAttribute('data-role', 'first-stall-acts');
    acts.append(listInCashtab(), retryControl(handlers, copy.CHECK_AGAIN));
    card.append(acts);
    card.append(el('p', 'fine', copy.FIRST_STALL_WATCHING));
    body.append(card);
    stall.append(body);
    // No share: the link here opens this screen.
    stall.append(stallFooter(address, view, handlers, { share: false }));
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * A QR of `text` as an SVG, drawn from the module matrix with one `<path>` built
 * through the DOM, not a markup string, and no external image. Always black on
 * white with a quiet zone: a QR that inherits a theme colour or loses its margin
 * does not scan. `title` is what a screen reader announces.
 */
export function qrSvg(text: string, title: string): SVGSVGElement {
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
    const link = el('a', 'buy', copy.LIST_IN_CASHTAB_LINK);
    link.href = CASHTAB_LIST_URL;
    link.rel = 'noopener noreferrer';
    link.target = '_blank';
    link.setAttribute('data-role', 'list-in-cashtab');
    link.setAttribute('data-focus-key', 'list-in-cashtab');
    return link;
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
    appendPayHintNote(body, view);
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
            paintOffers(stall, view, [...offersOf(view)], handlers);
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
function retryControl(handlers: StallHandlers, label = copy.TRY_AGAIN): HTMLElement {
    const retry = el('button', 'mini', label);
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


/**
 * The sparse-shop chrome (design round 2026-08-30). Three pieces, all
 * driven by the theme row's `sparse` data: an invitation under the name
 * when the seller has no tagline, a ghost note where the announcement
 * would sit, and a closing motif in the look's own material so an empty
 * lower half reads as intent instead of absence. The invitations open the
 * publish sheet — they are honest wayfinding, not controls of their own.
 */
function taglineInvite(view: StallView, handlers: StallHandlers): HTMLElement | null {
    if (view.pasted !== true || (view.tagline ?? '') !== '' || handlers.onOpenPublish === undefined) {
        return null;
    }
    const theme = view.theme ?? DEFAULT_THEME;
    const btn = el('button', 'tagline-invite');
    btn.type = 'button';
    btn.setAttribute('data-role', 'edit-tagline');
    btn.append(el('b', undefined, theme.sparse.kind === 'floor' ? '>' : '+'));
    btn.append(document.createTextNode(theme.sparse.taglineInvite));
    const cursor = el('i', 'invite-cursor');
    cursor.setAttribute('aria-hidden', 'true');
    btn.append(cursor);
    btn.addEventListener('click', () => handlers.onOpenPublish!());
    return btn;
}

function noticeInvite(view: StallView, handlers: StallHandlers): HTMLElement | null {
    if (view.pasted !== true || (view.announcement ?? '') !== '' || handlers.onOpenPublish === undefined) {
        return null;
    }
    const theme = view.theme ?? DEFAULT_THEME;
    const btn = el('button', 'notice-invite');
    btn.type = 'button';
    btn.setAttribute('data-role', 'announcement-invite');
    const pin = el('i', 'invite-pin');
    pin.setAttribute('aria-hidden', 'true');
    btn.append(pin);
    btn.append(el('span', 'ghost-chip', theme.sparse.noticeChip));
    btn.append(el('span', 'invite-text', theme.sparse.noticeInvite));
    const cursor = el('i', 'invite-cursor');
    cursor.setAttribute('aria-hidden', 'true');
    btn.append(cursor);
    btn.addEventListener('click', () => handlers.onOpenPublish!());
    return btn;
}

/** The kind's fixed child set — like the ornament, adding a look means
 *  adding a row that picks a kind, never growing this function per theme. */
function sparseMotif(view: StallView): HTMLElement {
    const theme = view.theme ?? DEFAULT_THEME;
    // The kind rides as `sm-kind-*`, never bare `sm-${kind}`: 'floor' is
    // also a CHILD class, and the collision dressed the container as its
    // own perspective grid — measured as a 28px sideways scroll.
    const motif = el('div', `sparse-motif sm-kind-${theme.sparse.kind}`);
    motif.setAttribute('aria-hidden', 'true');
    if (theme.sparse.kind === 'floor') {
        motif.append(el('i', 'sm-floor'), el('i', 'sm-haze'));
        const sign = el('div', 'sm-neon');
        sign.append(el('i', 'sm-stem'));
        for (const ch of 'OPEN') {
            sign.append(el('span', undefined, ch));
        }
        motif.append(sign);
        const chevrons = el('div', 'sm-chevrons');
        chevrons.append(el('i'), el('i'), el('i'));
        motif.append(chevrons);
        motif.append(el('span', 'sm-cap', 'scan to enter'));
    } else if (theme.sparse.kind === 'planks') {
        motif.append(
            el('i', 'sm-pl sm-p1'),
            el('i', 'sm-pl sm-p2'),
            el('i', 'sm-pl sm-p3'),
            el('i', 'sm-carve sm-carve-l'),
            el('i', 'sm-carve sm-carve-r'),
        );
        const brand = el('div', 'sm-brand');
        brand.append(stallMark());
        motif.append(brand);
    } else {
        motif.append(
            el('i', 'sm-1'),
            el('i', 'sm-2'),
            el('i', 'sm-3'),
            el('i', 'sm-line'),
            el('i', 'sm-sweep'),
        );
    }
    return motif;
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
    const hint = payHintNote(view);
    if (hint !== null) {
        body.append(hint);
    }
    const notice = announcementNote(view) ?? noticeInvite(view, handlers);
    if (notice !== null) {
        body.append(notice);
    }
    settingsNotes(body, view);
    stall.querySelector('.stall-headings')?.append(
        ...[taglineInvite(view, handlers)].filter((n): n is HTMLElement => n !== null),
    );
    const face = facePanel(view, handlers);
    if (face !== null) {
        // One token's face replaces the rail it came from: no tabs, no rows.
        body.append(face);
    } else {
        body.append(shopTabsControl(view, handlers));
        if (shopTabOf(view) === 'quotes') {
            // A stall with nothing listed and three quotes is exactly what this
            // rail is for, so the empty book is not the whole screen here.
            body.append(quotesPanel(view, handlers));
        } else {
            const theme = view.theme ?? DEFAULT_THEME;
            const emptyBlock = el('div', 'sparse-empty');
            emptyBlock.append(el('p', 'sparse-empty-t', theme.sparse.emptyTitle));
            emptyBlock.append(el('p', 'sparse-empty-s', theme.sparse.emptySub));
            emptyBlock.append(el('div', 'sparse-shelf'));
            const cta = el('a', 'cta', copy.LIST_FIRST);
            cta.setAttribute('data-role', 'list-first');
            cta.href = CASHTAB_LIST_URL;
            cta.target = '_blank';
            cta.rel = 'noopener';
            emptyBlock.append(cta);
            body.append(emptyBlock);
            // The live path no longer applies an empty answer, so a stall whose
            // last offer genuinely sold keeps that row until someone asks again.
            // This is where they ask.
            body.append(retryControl(handlers));
            body.append(sparseMotif(view));
        }
    }
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
    const identity = identityOf(view);
    stall.append(
        readName(view) === undefined
            ? header(identity)
            : header(displayName(view), copy.UNREADABLE_SUB, view.address),
    );
    const body = el('main', 'stall-body');
    appendPayHintNote(body, view);
    const face = facePanel(view, handlers);
    if (face !== null) {
        // One token's face replaces the rail it came from: no tabs, no rows.
        body.append(face);
    } else {
        body.append(shopTabsControl(view, handlers));
        if (shopTabOf(view) === 'quotes') {
            body.append(quotesPanel(view, handlers));
        } else {
            body.append(el('p', 'mid-p', copy.UNREADABLE_BODY));
            body.append(retryControl(handlers));
        }
    }
    stall.append(body);
    stall.append(stallFooter(identity, view, handlers));
}

function paintUnreachable(
    stall: HTMLElement,
    view: StallView,
    fetch: Extract<FetchStatus, { kind: 'unreachable' | 'plugin-missing' }>,
    handlers: StallHandlers,
): void {
    const identity = identityOf(view);
    const named = readName(view) !== undefined;
    if (named) {
        stall.append(header(displayName(view), copy.UNREACHABLE_SUB, view.address));
    } else {
        stall.append(header(identity));
    }

    const body = el('main', 'stall-body');
    appendPayHintNote(body, view);
    const face = facePanel(view, handlers);
    if (face !== null) {
        // One token's face replaces the rail it came from: no tabs, no rows.
        body.append(face);
    } else {
        body.append(shopTabsControl(view, handlers));
        if (shopTabOf(view) === 'quotes') {
            body.append(quotesPanel(view, handlers));
        } else {
            // Two failures, two sentences. `plugin-missing` is a node that
            // answered — a protocol-level 404 from a chronik without `agora.py` —
            // and telling a reader no index answered describes our own situation
            // as the network's. The hosts box already names which of the two this
            // was, and the retry is a way forward from either.
            body.append(
                el(
                    'p',
                    'mid-p',
                    fetch.kind === 'plugin-missing'
                        ? copy.PLUGIN_MISSING_BODY
                        : copy.UNREACHABLE_BODY,
                ),
            );
            body.append(hostsBox(fetch.triedAtMs, fetch.hosts));
            body.append(retryControl(handlers));
        }
    }
    stall.append(body);

    if (named || identity !== undefined) {
        stall.append(stallFooter(identity, view, handlers));
    }
}

/**
 * The stall's name, when **this load** read it.
 *
 * The two failure screens key their chrome on this rather than on anything
 * remembered: the load path carries no session name, look or token metadata
 * onto a failed book, so a name here came off a settings record walked to
 * while the offer index was failing. A shop this session cached may have
 * closed since, and neither screen has any way to tell.
 */
function readName(view: StallView): string | undefined {
    const name = view.stallName;
    return name === undefined || name === '' ? undefined : name;
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
    const withheld = withheldListings(view);
    stall.append(
        header(
            displayName(view),
            // A number while anything is withheld would be a floor, and a
            // zero over a stall whose listings this page chose not to paint
            // is the empty-versus-unreachable collapse in the largest type.
            withheld === 0
                ? copy.itemsForSale(distinct)
                : distinct === 0
                  ? copy.WITHHELD_ALL_LISTINGS
                  : copy.ITEMS_FOR_SALE_WITHHELD,
            view.address,
            view.tagline,
            signPinOf(view, handlers),
        ),
    );
    const body = el('main', 'stall-body');
    const hint = payHintNote(view);
    if (hint !== null) {
        body.append(hint);
    }
    const notice = announcementNote(view);
    if (notice !== null) {
        body.append(notice);
    }
    // Why the look is not the one the seller asked for, above the control:
    // it is about the stall, so it belongs to neither rail.
    settingsNotes(body, view);
    const face = facePanel(view, handlers);
    if (face !== null) {
        // One token's face replaces the rail it came from: no tabs, no tools,
        // no rows. The header above still counts the whole shop.
        body.append(face);
        stall.append(body);
        stall.append(stallFooter(identityOf(view), view, handlers));
        return;
    }
    body.append(shopTabsControl(view, handlers));
    /*
     * A big shop gets tools; a small one stays a stall. The threshold counts
     * the full shop, never the filtered remainder, so the tools cannot
     * filter themselves off the page. The filter narrows what is painted —
     * a way of looking, never a claim: the header above keeps counting
     * everything listed, and an emptied shelf says the filter did it.
     *
     * Computed whichever rail is on screen, because the sparse chrome below
     * keys on the shown count and that chrome belongs to the stall.
     */
    const tools = distinct >= SHOP_TOOLS_MIN;
    const filter = tools ? normalizedFilter(view.shopFilter) : undefined;
    const shown =
        filter === undefined
            ? offers
            : offers.filter((o) => tokenMatchesFilter(view.tokens, o.tokenId, filter));
    const onQuotes = shopTabOf(view) === 'quotes';
    if (onQuotes) {
        body.append(quotesPanel(view, handlers));
    } else {
        if (tools) {
            body.append(shopTools(view, handlers));
        }
        if (withheld > 0) {
            const note = el('p', 'fine', copy.withheldListingsLine(withheld));
            note.setAttribute('data-role', 'withheld-note');
            body.append(note, el('p', 'fine', copy.WITHHELD_WHY));
        }
        if (filter !== undefined && shown.length === 0) {
            const none = el('p', 'mid-p', copy.SHOP_FILTER_NONE);
            none.setAttribute('data-role', 'filter-none');
            body.append(none);
        }
        // Ordered first, then divided. Nothing sorted before this, so two offers
        // of one token could sit either side of a third token's row. Copied: the
        // array belongs to the caller's view.
        const ordered = [...shown].sort(compareOffers);
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
            // One section is not a division, it is a heading over the whole shop.
            // A stall that sells only tokens should look like a stall, not a
            // filing cabinet with one drawer.
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
    }
    // A shop of one or two is a big stage with a small cast: the look's own
    // closing motif fills the lower half with intent, and the empty fields
    // invite the seller by name. Presence keys on the SHOWN count — a
    // filter narrowing to two earns the motif too, and its arrival is an
    // append below the cards, never a re-layout above them. The motif closes
    // the shelves, so it belongs to the rail that paints them.
    if (shown.length <= 2) {
        stall.querySelector('.stall-headings')?.append(
            ...[taglineInvite(view, handlers)].filter((n): n is HTMLElement => n !== null),
        );
        if (announcementNote(view) === null) {
            const invite = noticeInvite(view, handlers);
            if (invite !== null) {
                body.prepend(invite);
            }
        }
        if (!onQuotes) {
            body.append(sparseMotif(view));
        }
    }
    stall.append(body);
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
    // Through the same screen as every other genesis string: a collection's
    // own name is a minter's free text, and this heading paints it over a run
    // of cards.
    wrap.append(el('div', 'collection-name', copy.collectionOf(tokenName(view.tokens, groupTokenId))));
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
/**
 * One icon variant per (size, token): the row's 128 and the opened card's
 * 256 are separate fetches with separate cache entries, keyed together so
 * a loaded hero never reveals into a 44px row cell or vice versa. The
 * `data-token-id` attribute stays the bare id — it is identity, not
 * variant — and the src check carries the size.
 */
function iconRef(
    tokenId: string,
    size: IconSize,
): { key: string; id: string; size: IconSize } | undefined {
    const id = tokenId.toLowerCase();
    if (iconUrl(id, size) === undefined) {
        return undefined;
    }
    return { key: `${size}/${id}`, id, size };
}

function iconMatchesToken(
    img: HTMLImageElement,
    ref: { id: string; size: IconSize },
): boolean {
    const url = iconUrl(ref.id, ref.size);
    if (url === undefined) {
        return false;
    }
    return img.getAttribute('data-token-id') === ref.id && img.getAttribute('src') === url;
}

function ensureIcon(ref: { key: string; id: string; size: IconSize }): void {
    if (iconCache.has(ref.key)) {
        return;
    }
    const url = iconUrl(ref.id, ref.size);
    if (url === undefined) {
        return;
    }
    const img = new Image();
    img.referrerPolicy = 'no-referrer';
    img.alt = '';
    img.setAttribute('data-token-id', ref.id);
    iconCache.set(ref.key, { state: 'pending', img });
    img.addEventListener('load', () => {
        const current = iconCache.get(ref.key);
        if (current === undefined || current.state === 'error' || current.img !== img) {
            return;
        }
        if (!iconMatchesToken(img, ref)) {
            return;
        }
        iconCache.set(ref.key, { state: 'loaded', img });
        revealLoadedIcon(ref, img);
    });
    img.addEventListener('error', () => {
        const current = iconCache.get(ref.key);
        if (current === undefined || current.state === 'error' || current.img !== img) {
            return;
        }
        iconCache.set(ref.key, { state: 'error' });
    });
    img.src = url;
}

function cloneLoadedIcon(
    ref: { key: string; id: string; size: IconSize },
): HTMLImageElement | undefined {
    const entry = iconCache.get(ref.key);
    if (entry === undefined || entry.state !== 'loaded') {
        return undefined;
    }
    if (!iconMatchesToken(entry.img, ref)) {
        return undefined;
    }
    const clone = entry.img.cloneNode(true) as HTMLImageElement;
    if (!iconMatchesToken(clone, ref)) {
        return undefined;
    }
    return clone;
}

function revealLoadedIcon(
    ref: { key: string; id: string; size: IconSize },
    source: HTMLImageElement,
): void {
    if (!iconMatchesToken(source, ref)) {
        return;
    }
    const cells = paintedIconCells.get(ref.key);
    if (cells === undefined) {
        return;
    }
    for (const cell of cells) {
        if (cell.getAttribute('data-token-id') !== ref.id) {
            continue;
        }
        const clone = source.cloneNode(true) as HTMLImageElement;
        if (!iconMatchesToken(clone, ref)) {
            continue;
        }
        cell.replaceChildren(clone);
    }
}

/**
 * `attributed` is false only on a quote surface, and only for a token this
 * stall did not mint: `iconUrl` keys on the token id, so painting it there
 * would put somebody else's logo on this seller's own row. Initials instead —
 * the same treatment a pending or failed load already gets. Every Agora row
 * keeps its icon whatever the genesis says: there the token *is* the thing
 * being sold, and its picture is its own.
 */
function itemIcon(
    tokenId: string,
    name: string,
    extraClass?: string,
    size: IconSize = ICON_ROW_SIZE,
    attributed = true,
): HTMLElement {
    const cell = el('div', 'item-ic');
    if (extraClass !== undefined) {
        cell.classList.add(extraClass);
    }
    const ref = attributed ? iconRef(tokenId, size) : undefined;
    if (ref !== undefined) {
        cell.setAttribute('data-token-id', ref.id);
        let cells = paintedIconCells.get(ref.key);
        if (cells === undefined) {
            cells = [];
            paintedIconCells.set(ref.key, cells);
        }
        cells.push(cell);
        ensureIcon(ref);
        const clone = cloneLoadedIcon(ref);
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
    // The one place a listing becomes a row: a withheld token leaves here,
    // so every derivation — the shop, the picker, the card list — is clean.
    return view.fetch?.kind === 'offers'
        ? view.fetch.offers.filter(
              (offer) => !isWithheldToken(offer.tokenId, view.tokens.get(offer.tokenId)),
          )
        : [];
}

/** Distinct listed tokens this page chose not to paint. */
function withheldListings(view: StallView): number {
    const ids = new Set<string>();
    for (const offer of view.fetch?.kind === 'offers' ? view.fetch.offers : []) {
        if (isWithheldToken(offer.tokenId, view.tokens.get(offer.tokenId))) {
            ids.add(offer.tokenId);
        }
    }
    return ids.size;
}

/** Quoted tokens this page chose not to paint. */
function withheldQuotes(view: StallView): number {
    let n = 0;
    for (const tokenId of view.prices?.keys() ?? []) {
        if (isWithheldToken(tokenId, view.tokens.get(tokenId))) {
            n += 1;
        }
    }
    return n;
}

/**
 * One token, every offer of it in this stall. The card is the token — the
 * owner's call, 2026-08-29 — and the handoff was always per token
 * (`#/token/<id>`), so a token listed at three prices used to be three cards
 * pointing at one Cashtab page. The offers keep their identity underneath:
 * the expander and the live diff still speak outpoints.
 */
export type TokenListing = {
    tokenId: string;
    offers: readonly StallOffer[];
};

/**
 * Buckets in first-appearance order. `compareOffers` sorts a category's
 * offers by token id already, so buckets come out contiguous either way.
 */
export function listingsOf(offers: readonly StallOffer[]): TokenListing[] {
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
export function cheapestOf(listing: TokenListing): StallOffer {
    const buyable = listing.offers.filter((offer) => !isUnbuyable(offer));
    const pool = buyable.length > 0 ? buyable : listing.offers;
    return pool.reduce((best, offer) => (offer.askedSats < best.askedSats ? offer : best));
}

/**
 * The shop's card order: seller shelves first, then `sectionsOf`, with
 * `compareOffers` only inside a run. The overlay's carousel walks this
 * rather than token-id order, so the first card is the shop's first card.
 */
export function listingsInShopOrder(view: StallView): TokenListing[] {
    const offers = offersOf(view);
    const ordered = [...offers].sort(compareOffers);
    const out: TokenListing[] = [];
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
        for (const run of runs.values()) {
            out.push(...listingsOf(run));
        }
    }
    const sections = sectionsOf(unshelved, view.tokens, (id) => view.nftGroups?.get(id));
    for (const section of sections) {
        for (const group of section.groups) {
            out.push(...listingsOf(group.offers));
        }
    }
    return out;
}

/** The units a quote is painted in. Every other code is decoded and silent. */
const PAINTED_QUOTE_CODES: readonly string[] = ['usd', XEC_PRICE_CODE];

/** One item the seller has quoted, and the figure they wrote for it. */
export type QuotedItem = { tokenId: string; price: TokenPrice };

/**
 * The pay set: every quote this page can paint, **not** the intersection with
 * what is listed on Agora.
 *
 * A quote needs no covenant, so gating it on a listing would defeat the rail:
 * a stall with nothing listed and three quotes is the price-tag case this
 * exists for, and a sold-out listing would otherwise take the quote off the
 * page with it.
 *
 * `isPriceable` is affirmative, so a token whose genesis this page never read
 * is not a row — it could be an NFT, and a quote per whole token means nothing
 * about one. Those are counted instead (`unreadableQuotes`).
 */
export function quotedItems(view: StallView): QuotedItem[] {
    const out: QuotedItem[] = [];
    for (const [tokenId, price] of view.prices ?? []) {
        if (!PAINTED_QUOTE_CODES.includes(price.code)) {
            continue;
        }
        if (!isPriceable(tokenId, view.tokens.get(tokenId))) {
            continue;
        }
        if (isWithheldToken(tokenId, view.tokens.get(tokenId))) {
            continue;
        }
        out.push({ tokenId, price });
    }
    return out;
}

/**
 * Quotes this page could not read the item's genesis for. Our own gap, said
 * out loud for the same reason the dropped-listings line is: a section that
 * silently showed two of three would report our failure as the seller's
 * inventory.
 */
export function unreadableQuotes(view: StallView): number {
    // Every record in `prices` that did not become a row, whatever stopped
    // it: a genesis this page never read, a unit it does not paint, a kind
    // `isPriceable` refuses. Counting only the first of those let the other
    // two vanish from the rows and the count alike, and a label then said
    // `0` about a seller who had quoted.
    const prices = view.prices;
    if (prices === undefined) {
        return 0;
    }
    // A withheld record is not one this page could not read: subtracted
    // here, or the seller's withheld quote would be reported as our gap.
    return prices.size - quotedItems(view).length - withheldQuotes(view);
}

/**
 * The seller's figure, in the seller's own unit, exactly as they wrote it.
 *
 * Grouped for reading and never converted: the record's own exponent decides
 * the decimals, so a quote published as `5000.00` XEC prints five thousand
 * XEC with its own two places rather than being rounded, trimmed or run
 * through a rate (§8).
 */
export function quoteFigure(price: TokenPrice): string {
    const figure = groupWholePart(formatPriceFigure(price));
    if (price.code === XEC_PRICE_CODE) {
        return `${figure} ${copy.XEC}`;
    }
    const currency = fiatCurrency(price.code);
    if (currency === undefined) {
        return figure;
    }
    return currency.symbolAfter === undefined
        ? `${currency.symbol}${figure}`
        : `${figure}${currency.symbolAfter}${currency.symbol}`;
}

function groupWholePart(figure: string): string {
    const [whole = '', frac] = figure.split('.');
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return frac === undefined ? grouped : `${grouped}.${frac}`;
}

/** Which rail of the Shop panel is painted. Absent is the listings. */
function shopTabOf(view: StallView): ShopTab {
    return view.shopTab ?? 'listings';
}

/**
 * How many rows a side holds — or **no number at all**, which is the whole
 * rule these two functions exist for.
 *
 * The count rides the tab's label, and a label is the one thing a reader who
 * never scrolls will see. So it may only ever say what this page actually
 * read: a zero is a claim about the seller, and a side whose read did not
 * finish has nothing to claim. That covers the three book failures, a records
 * walk that threw, and — on either side — a read that came back knowing it had
 * dropped rows, because a floor printed as a count is our gap reported as
 * their inventory.
 *
 * A walk that stopped at our own cap is different and keeps its number: it
 * answered every page it asked for, and the tab's own line is what admits the
 * end may be further on.
 */
function listingsCount(view: StallView): number | undefined {
    const fetch = view.fetch;
    if (fetch === undefined) {
        return undefined;
    }
    if (fetch.kind === 'empty') {
        return 0;
    }
    if (fetch.kind === 'offers' && (fetch.dropped ?? 0) === 0 && withheldListings(view) === 0) {
        // One card per token, which is what the shop paints — and no number
        // while a card is withheld, because that number would be a floor.
        return new Set(offersOf(view).map((offer) => offer.tokenId)).size;
    }
    return undefined;
}

function quotesCount(view: StallView): number | undefined {
    // A number only when this page read the whole side and every record it
    // read is a row on it. No records yet is the failure screen's window
    // before its facts land — a zero there is a claim about the seller made
    // before anything was read, the same collapse `listingsCount` refuses
    // with no fetch.
    const prices = view.prices;
    if (prices === undefined || view.descriptionsFailed === true) {
        return undefined;
    }
    if (withheldQuotes(view) > 0) {
        return undefined;
    }
    const rows = quotedItems(view).length;
    return rows === prices.size ? rows : undefined;
}

/**
 * The Shop panel's two rails, as a segmented control at the top of the panel.
 *
 * `role="group"` with `aria-pressed`, the pattern every other segmented
 * control here already uses — deliberately **not** `role="tablist"`, which
 * promises a screen reader `tabpanel`, `aria-controls`, a roving `tabindex`
 * and arrow keys that this screen does not have, and buys nothing it does not
 * already get from a pressed button. Never a second dock either: the bar
 * below switches panels and is untouched.
 */
function shopTabsControl(view: StallView, handlers: StallHandlers): HTMLElement {
    const seg = el('div', 'seg seg-two shop-seg');
    seg.setAttribute('role', 'group');
    seg.setAttribute('aria-label', copy.SHOP_TABS_LABEL);
    seg.setAttribute('data-role', 'shop-tabs');
    const active = shopTabOf(view);
    const sides: { key: ShopTab; label: string; count?: number }[] = [
        { key: 'listings', label: copy.SHOP_TAB_LISTINGS, count: listingsCount(view) },
        { key: 'quotes', label: copy.SHOP_TAB_QUOTES, count: quotesCount(view) },
    ];
    for (const side of sides) {
        const button = el('button', 'seg-b', copy.shopTabLabel(side.label, side.count));
        button.type = 'button';
        button.setAttribute('aria-pressed', side.key === active ? 'true' : 'false');
        button.setAttribute('data-role', `shop-tab-${side.key}`);
        button.setAttribute('data-focus-key', `shop-tab-${side.key}`);
        const go = handlers.onSwitchShopTab;
        if (go !== undefined) {
            button.addEventListener('click', () => go(side.key));
        }
        seg.append(button);
    }
    return seg;
}

/**
 * The direct-payment rail: the seller's own quotes, and the outcomes of the
 * walk that found them.
 *
 * Its own side of the panel rather than a section under the shop list, so the
 * covenant's asked amount and the seller's figure are never on one screen.
 * Every sentence here is about the records walk and none of them is about the
 * offer book: a quote needs no covenant, so the book's failure is one tab over
 * and its words stay there.
 *
 * The three things this side can be short of are three different sentences.
 * The count of quotes whose item this page could not read is the seller's
 * inventory minus our own gap, said out loud rather than silently shortening
 * the list. A walk that threw says the read did not finish — never that the
 * records came back damaged, which is a different thing that does not stop a
 * walk — and carries the retry, because that is a failure with a way forward.
 * Our own page cap is the third, and gets no retry: asking again stops in the
 * same place. Nothing quoted at all is none of those and is not a failure:
 * this rail is the seller's to opt into.
 */
function quotesPanel(view: StallView, handlers: StallHandlers): HTMLElement {
    const items = quotedItems(view);
    const unreadable = unreadableQuotes(view);
    const section = el('section', 'pay-sec');
    section.setAttribute('data-role', 'pay-section');
    section.append(el('h2', 'section-title', copy.PAY_SEC_TITLE));
    section.append(el('p', 'fine pay-lede', copy.PAY_SEC_LEDE));
    if (items.length > 0) {
        const rows = el('div', 'items pay-items');
        for (const item of items) {
            rows.append(payRow(item, view, handlers));
        }
        section.append(rows);
    }
    if (unreadable > 0) {
        const note = el('p', 'fine', copy.quotedUnreadable(unreadable));
        note.setAttribute('data-role', 'pay-unreadable');
        section.append(note);
    }
    const withheld = withheldQuotes(view);
    if (withheld > 0) {
        const note = el('p', 'fine', copy.withheldQuotesLine(withheld));
        note.setAttribute('data-role', 'withheld-note');
        section.append(note, el('p', 'fine', copy.WITHHELD_WHY));
    }
    if (view.descriptionsFailed === true) {
        const note = el('p', 'fine', copy.QUOTES_FAILED);
        note.setAttribute('data-role', 'quotes-failed');
        section.append(note);
        section.append(retryControl(handlers));
    }
    if (view.descriptionsTruncated === true) {
        const note = el('p', 'fine', copy.QUOTES_TRUNCATED);
        note.setAttribute('data-role', 'quotes-truncated');
        section.append(note);
    }
    if (view.prices === undefined) {
        // The walk has not answered — a failure screen paints before its
        // facts land. "Nothing quoted" is a sentence about the seller and
        // cannot be said before their records were read.
        const reading = el('p', 'fine', copy.QUOTES_READING);
        reading.setAttribute('data-role', 'quotes-reading');
        section.append(reading);
    } else if (
        items.length === 0 &&
        unreadable === 0 &&
        view.descriptionsFailed !== true &&
        view.descriptionsTruncated !== true
    ) {
        // A stall whose only quote is withheld did not quote nothing.
        const quiet = el('p', 'mid-p', withheld > 0 ? copy.WITHHELD_ALL_QUOTES : copy.QUOTES_NONE);
        if (withheld === 0) {
            quiet.setAttribute('data-role', 'quotes-none');
        }
        section.append(quiet);
    }
    return section;
}

/**
 * What a quoted item is called on the two pay surfaces, and what is said
 * beside it.
 *
 * **The seller's own words name the item.** A genesis name names a *token*,
 * which is true and is rarely the thing a buyer is paying for — a stall
 * selling half-kilo bags through one fungible token would put the token's name
 * on every row. So the words take the title, cut at `ITEM_NAME_MAX_CHARS`, and
 * the token's name takes a small line under it.
 *
 * With no words the token's name is the title, and the row says the seller
 * wrote nothing rather than letting a token name read as a description. The
 * stream overlay is deliberately not on this rule: its plate is 216px of
 * nowrap with an ellipsis, a cut no probe rule can see, so it keeps the short
 * stable string.
 */
function quoteNaming(
    view: StallView,
    tokenId: string,
): { title: string; tokenName?: string; note?: string } {
    const genesisName = tokenName(view.tokens, tokenId);
    const words = view.descriptions?.get(tokenId);
    if (words === undefined || words === '') {
        return { title: genesisName, note: copy.QUOTE_NO_WORDS_LINE };
    }
    return { title: itemTitle(words), tokenName: genesisName };
}

/**
 * How old the seller's quote is, or **nothing at all**.
 *
 * A stall that sold out and never published the removal leaves Pay lit for
 * ever, and nothing else on these two surfaces lets a buyer price that. Stock
 * cannot say it — the item is off-chain and only the seller knows — so this
 * says the one thing the chain proves: when the record was written.
 *
 * A record this page cannot date gets no node, not a dash and not a height:
 * both callers ask for the node and mount it only if there is one, so an
 * undated quote is one line shorter rather than one line wrong.
 *
 * A relative age rather than the absolute date `formatTriedAt` would give,
 * because what a reader is judging is a length of time — "written three months
 * ago" prices the staleness by itself, where a date has first to be compared
 * against today, in whatever timezone the reader is in and on a stream overlay
 * nobody can ask.
 */
function quoteAgeNode(
    view: StallView,
    tokenId: string,
    tag: 'span' | 'p',
    className: string,
): HTMLElement | null {
    const age = recordAge(view.quoteTimes?.get(tokenId), Date.now());
    if (age === undefined) {
        return null;
    }
    const node = el(tag, className, copy.quotedAgo(age));
    node.setAttribute('data-role', 'quote-age');
    return node;
}

/**
 * One quoted item: the seller's figure and the way to pay it.
 *
 * No "from", no stock, no rate, no converted glance — every one of those
 * belongs to an Agora row, and a quote wearing them would read as the same
 * money. The chip says whose figure this is; nothing on the row says what it
 * is worth in anything else.
 */
function payRow(
    item: QuotedItem,
    view: StallView,
    handlers: StallHandlers,
): HTMLElement {
    const row = el('div', 'item pay-row');
    row.setAttribute('data-role', 'pay-row');
    const named = quoteNaming(view, item.tokenId);
    const minted = view.genesis?.get(item.tokenId);
    row.append(itemIcon(item.tokenId, named.title, undefined, ICON_ROW_SIZE, minted !== 'not-attributed'));
    const words = el('div', 'pay-b');
    // The name opens the face; the row's Pay control still opens the pay
    // sheet in one press, so no press is added to the money path.
    const openFace = el('button', 'item-n item-open', named.title);
    openFace.type = 'button';
    openFace.setAttribute('data-role', 'item-open');
    openFace.setAttribute('data-focus-key', `item-open:${item.tokenId}`);
    openFace.addEventListener('click', () => handlers.onOpenItem(item.tokenId, 'quotes'));
    words.append(openFace);
    const rail = el('span', 'pay-sub rail-label', copy.ROW_LABEL_PAY);
    rail.setAttribute('data-role', 'rail-label');
    words.append(rail);
    // The token's own name, small, under the item's: a genesis name is true
    // and is rarely the thing a buyer is paying for. Absent when it is already
    // the title, which is what a quote with no words falls back to.
    if (named.tokenName !== undefined) {
        const under = el('span', 'pay-sub', named.tokenName);
        under.setAttribute('data-role', 'quote-token-name');
        words.append(under);
    }
    if (named.note !== undefined) {
        const note = el('span', 'pay-sub', named.note);
        note.setAttribute('data-role', 'quote-no-words');
        words.append(note);
    }
    if (minted === 'not-attributed') {
        const borrowed = el('span', 'pay-sub', copy.QUOTE_NOT_MINTED_HERE);
        borrowed.setAttribute('data-role', 'quote-not-minted');
        words.append(borrowed);
    } else if (minted === 'attributed') {
        // The positive half. Without it, silence meant either "this stall
        // minted it" or "this page could not tell", and the reader had no way
        // to know which — `unknown` is the one that still says nothing.
        const here = el('span', 'chip', copy.QUOTE_MINTED_CHIP);
        here.setAttribute('data-role', 'quote-minted');
        words.append(here);
    }
    const age = quoteAgeNode(view, item.tokenId, 'span', 'pay-sub');
    if (age !== null) {
        words.append(age);
    }
    row.append(words);
    const right = el('div', 'pay-r');
    const figure = el('span', 'pay-q', quoteFigure(item.price));
    figure.setAttribute('data-role', 'seller-price');
    right.append(figure);
    const open = el('button', 'buy pay-btn', copy.PAY_OPEN);
    open.type = 'button';
    open.setAttribute('data-role', 'pay-open');
    open.setAttribute('data-focus-key', `pay-open:${item.tokenId}`);
    const onOpenPay = handlers.onOpenPay;
    if (onOpenPay !== undefined) {
        open.addEventListener('click', () => onOpenPay(item.tokenId));
    }
    right.append(open);
    row.append(right);
    return row;
}

/**
 * The one line a Shop row may carry about the other rail.
 *
 * A sibling of the row's head button, never inside it: the head is a
 * `<button>` and a control nested in one is markup no browser agrees about.
 * It shows the other side and changes no route — the two figures stay on two
 * screens, and this only says the other one exists.
 */
function payPointer(
    tokenId: string,
    view: StallView,
    handlers: StallHandlers,
): HTMLElement | null {
    if (!quotedItems(view).some((item) => item.tokenId === tokenId)) {
        return null;
    }
    const pointer = el('button', 'pay-pointer', copy.PAY_POINTER);
    pointer.type = 'button';
    pointer.setAttribute('data-role', 'pay-pointer');
    pointer.setAttribute('data-focus-key', `pay-pointer:${tokenId}`);
    pointer.addEventListener('click', (event) => {
        // The row's head opens the listing; this is a control of its own.
        event.stopPropagation();
        handlers.onSwitchShopTab?.('quotes');
    });
    return pointer;
}

/** happy-dom has no scroller, so the call is a capability check, not a cast. */
function scrollSectionIntoView(node: Element | null): void {
    if (node === null) {
        return;
    }
    const scroll = (node as { scrollIntoView?: unknown }).scrollIntoView;
    if (typeof scroll === 'function') {
        (node as HTMLElement).scrollIntoView({ block: 'start' });
    }
}

/**
 * What a `?pay=` link that opened nothing has to say, under the screen it
 * landed on. Two sentences, and only one of them is about the seller.
 */
function appendPayHintNote(body: HTMLElement, view: StallView): void {
    const note = payHintNote(view);
    if (note !== null) {
        body.append(note);
    }
}

function payHintNote(view: StallView): HTMLElement | null {
    if (view.payHintNote === undefined) {
        return null;
    }
    const note = el(
        'p',
        'note',
        view.payHintNote === 'unknown'
            ? copy.PAY_HINT_UNKNOWN
            : view.payHintNote === 'withheld'
              ? copy.PAY_HINT_WITHHELD
              : copy.PAY_HINT_UNREAD,
    );
    note.setAttribute('data-role', 'pay-hint-note');
    return note;
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
 * The units this editor writes, and the only ones it reads back to a seller.
 * `usd` is what most sellers think in; `xec` is the chain's own unit, which is
 * the one figure a printed QR cannot make stale. Every other code the wire
 * carries is decoded, never painted, and carried forward untouched.
 */
const EDITABLE_PRICE_CODES = ['usd', XEC_PRICE_CODE] as const;

/**
 * Two decimal places for both, which is what the record's exponent byte says.
 * Never `fiatFractionDigits`: that table is a display convention this app may
 * change on any deploy, and a published record whose meaning moved with it
 * would be a different price after an unrelated release.
 */
const EDITOR_PRICE_EXPONENT = 2;

/**
 * The margins this editor offers, and the reason for the steps: under 1% is
 * unpayable in practice once a feed's update cadence and its rounding are in
 * play, 2% covers the drift between a glance and a signature on an ordinary
 * day, and past 10% the quote is decorative. The **reader** takes any 1–100,
 * because a record is permanent and another app may write one.
 */
const TOLERANCE_PRESETS = [1, 2, 5, 10] as const;

/**
 * A labelled group inside a sheet: a heading over a control that is not one
 * `<input>` (a segmented picker, a run of chips). Real fields keep their
 * `<label>`; a `<label>` over a group of buttons names nothing a browser can
 * point at.
 */
function sheetGroup(title: string): HTMLElement {
    const wrap = el('div', 'f');
    wrap.append(el('div', 'lab', title));
    return wrap;
}

/**
 * A fold. The hex and the QR are both things a seller checks once — the bytes
 * before the first signature, the code only when the wallet is on another
 * device — and both were walls of the sheet before they were folds.
 *
 * `<details>` and nothing else: the layout probe opens every one before it
 * measures, so a folded protected box is still guarded (`publish-hex` is in
 * `PROTECTED`), and a fold is the one disclosure a keyboard reaches without
 * script.
 */
function sheetFold(role: string, title: string, body: HTMLElement, extra?: string): HTMLElement {
    const fold = el('details', extra === undefined ? 'fold' : `fold ${extra}`);
    fold.setAttribute('data-role', role);
    fold.append(el('summary', 'fold-sum', title));
    fold.append(body);
    return fold;
}

/**
 * The byte meter: the record's size against the shared ceiling, as a bar.
 *
 * The figure itself is said in words on the summary line beside it — one
 * count, from the encoder — so this is the glance and never a second number.
 * The fill is written through the CSSOM, the same channel `applyTheme` uses
 * for every `--s-*`: an inline `style` attribute would be refused outright by
 * `style-src 'self'`, and a class per percentage is a stylesheet of 101 rules.
 */
function sheetMeter(): { wrap: HTMLElement; set: (used: number, max: number) => void } {
    const wrap = el('div', 'meter');
    wrap.setAttribute('aria-hidden', 'true');
    const fill = el('i', 'meter-i');
    wrap.append(fill);
    return {
        wrap,
        set: (used, max) => {
            const pct = max <= 0 ? 0 : Math.max(0, Math.min(100, (used / max) * 100));
            fill.style.setProperty('--meter-fill', `${pct.toFixed(1)}%`);
            wrap.setAttribute('data-over', used > max ? 'true' : 'false');
        },
    };
}

/**
 * A figure for the summary line, and **only** for a unit this editor writes.
 *
 * A carried price in some other code is void on screen and never on the wire
 * (`a-price-not-in-usd-or-xec-is-void-and-silent`): painting a figure this
 * sheet cannot change would offer a seller an edit that is not there. The
 * field is still named, because the record still carries it — the summary
 * says what is being signed, and "quote" with no figure is the honest half.
 */
function sayPrice(price: TokenPrice): string | undefined {
    return (EDITABLE_PRICE_CODES as readonly string[]).includes(price.code)
        ? `${formatPriceFigure(price)} ${price.code.toUpperCase()}`
        : undefined;
}

/**
 * The token descriptions sheet: one token's own record — words, shelf, quote.
 *
 * **Its own sheet because it is its own record.** `STLD` is a document about
 * one token and `STL1` is the stall's; describing three tokens costs three
 * fees, and a seller who reads one publish control as covering both learns
 * that the expensive way. One entry point still: a control per offer row would
 * put a second publish button beside every buy control, for every visitor, on
 * a page that cannot know which of them is the seller.
 */
/**
 * Every token this stall may write a record about: what it lists, what the
 * seller has already described or quoted — and whatever they paste into the
 * describe sheet, which joins in the sheet itself. The raw book, not
 * `offersOf`: a withheld token stays in the set so a record the seller
 * already published on it — words, shelf, removal — stays reachable; only its
 * price field is refused. The set used to be the shop's alone, so a listing
 * that sold out took its own record out of reach. Never a holdings read: the
 * sheet is visible to any visitor.
 */
export function describableTokenIds(view: StallView): string[] {
    const listed = (view.fetch?.kind === 'offers' ? view.fetch.offers : []).map((o) => o.tokenId);
    return [
        ...new Set([
            ...listed,
            ...(view.descriptions?.keys() ?? []),
            ...(view.prices?.keys() ?? []),
        ]),
    ];
}

function describeSheet(view: StallView, handlers: StallHandlers): HTMLElement {
    const wrap = el('div', 'sheet');
    wrap.setAttribute('data-role', 'describe');
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.setAttribute('aria-label', copy.DESC_TITLE);
    wrap.append(sheetHead(copy.DESC_TITLE, copy.DESC_SUB, handlers));
    // Everything the record can carry beyond words and a figure folds under
    // "More" after the sign controls: the shelf, the tolerance, the way in
    // for a pasted token id, the meter, removal, the bytes and the phone QR.
    const more = el('div', 'sheet-more');
    more.append(el('p', 'fine', copy.DESC_LEDE));

    const address = view.address;
    if (address === undefined || address === '') {
        wrap.append(el('p', 'ctx', copy.PUBLISH_UNAVAILABLE));
        return wrap;
    }

    const tokenIds = describableTokenIds(view);
    const listed = new Set((view.fetch?.kind === 'offers' ? view.fetch.offers : []).map((o) => o.tokenId));
    /**
     * Genesis facts and attributions this sheet asked for itself, held in its
     * own closure. A lookup answered by a repaint would take a half-written
     * record with it — `renderStall` opens with `replaceChildren()` — so the
     * handler answers and the sheet refreshes itself in place.
     */
    const known: SessionTokenCache = new Map(view.tokens);
    const learned = new Map<string, GenesisAttribution>();
    const asked = new Set<string>();
    const attributionOf = (tokenId: string): GenesisAttribution =>
        learned.get(tokenId) ?? view.genesis?.get(tokenId) ?? 'unknown';

    const pick = el('div', 'paste');
    const tokenLabel = el('label', 'paste-label', copy.DESC_TOKEN_LABEL);
    const picker = el('select', 'paste-in');
    picker.name = 'describe-token';
    picker.setAttribute('data-role', 'describe-token');
    picker.setAttribute('data-focus-key', 'describe-token');
    const addOption = (id: string): void => {
        if ([...picker.options].some((option) => option.value === id)) {
            return;
        }
        // Screened like every other genesis string: this label is a minter's
        // free text in a control the seller reads before signing.
        const option = el('option', '', tokenName(known, id));
        option.value = id;
        picker.append(option);
    };
    for (const id of tokenIds) {
        addOption(id);
    }
    // The launcher may name a token — the row a seller pressed. An id the
    // picker does not hold is simply not selected.
    const preselect = view.overlay.kind === 'describe' ? view.overlay.tokenId : undefined;
    if (preselect !== undefined && tokenIds.includes(preselect)) {
        picker.value = preselect;
    }
    tokenLabel.append(picker);
    pick.append(tokenLabel);

    // Nothing listed, described or quoted. A note now, never an early return:
    // the paste field below it is the way in, and returning here is what put a
    // seller with one unlisted token in front of a dead end.
    const noTokens = el('p', 'fine', copy.DESC_NO_TOKENS);
    noTokens.setAttribute('data-role', 'describe-no-tokens');
    pick.append(noTokens);

    /*
     * The way in for a token this stall neither lists nor has written about.
     * The seller reads the id off their own wallet; nothing here enumerates
     * what the address holds, because the sheet is visible to any visitor and
     * a holdings walk is round trips any of them could start.
     */
    const pasteLabel = el('label', 'paste-label', copy.DESC_PASTE_LABEL);
    const pasteField = el('input', 'paste-in');
    pasteField.type = 'text';
    pasteField.name = 'describe-paste';
    pasteField.autocomplete = 'off';
    pasteField.spellcheck = false;
    pasteField.maxLength = 64;
    pasteField.setAttribute('data-role', 'describe-paste');
    pasteField.setAttribute('data-focus-key', 'describe-paste');
    pasteLabel.append(pasteField);
    const pasteAdd = el('button', 'mini another', copy.DESC_PASTE_ADD);
    pasteAdd.type = 'button';
    pasteAdd.setAttribute('data-role', 'describe-paste-add');
    pasteAdd.setAttribute('data-focus-key', 'describe-paste-add');
    const pasteWhy = el('p', 'ctx', '');
    pasteWhy.hidden = true;
    pasteWhy.setAttribute('data-role', 'describe-paste-why');
    more.append(pasteLabel, pasteAdd, pasteWhy);
    wrap.append(pick);

    const form = el('form', 'paste');

    const textLabel = el('label', 'paste-label', copy.DESC_TEXT_LABEL);
    const field = el('textarea', 'paste-in');
    field.name = 'describe-text';
    field.rows = 3;
    field.setAttribute('data-role', 'describe-text');
    field.setAttribute('data-focus-key', 'describe-text');
    field.setAttribute('autocapitalize', 'sentences');
    textLabel.append(field);
    form.append(textLabel);

    // The shelf (STLD tag 0x01): one more field in the same record. maxLength
    // counts characters and is only first aid; the byte cap and the shared
    // budget are the encoder's, and the one meter below shows the record.
    //
    // A free field with a datalist, never a closed select: the
    // heading is the seller's own words, and a list of the ones they already
    // used is a suggestion, not a vocabulary.
    const shelfLabel = el('label', 'paste-label', copy.DESC_SHELF_LABEL);
    const shelfField = el('input', 'paste-in');
    shelfField.type = 'text';
    shelfField.name = 'describe-shelf';
    shelfField.maxLength = 32;
    shelfField.autocomplete = 'off';
    shelfField.spellcheck = false;
    shelfField.setAttribute('data-role', 'describe-shelf');
    shelfField.setAttribute('data-focus-key', 'describe-shelf');
    const shelvesKnown = [...new Set([...(view.shelves?.values() ?? [])])].sort();
    if (shelvesKnown.length > 0) {
        const list = el('datalist');
        list.id = 'stall-shelves';
        list.setAttribute('data-role', 'describe-shelf-list');
        for (const name of shelvesKnown) {
            const option = el('option');
            option.value = name;
            list.append(option);
        }
        shelfField.setAttribute('list', list.id);
        shelfLabel.append(list);
    }
    shelfLabel.append(shelfField);
    more.append(shelfLabel);

    /*
     * The quote (STLD tag 0x02): what the seller asks for one whole token.
     *
     * Two units, and no more. `usd` is what most sellers think in; `xec` is
     * the chain's own unit, and it is the only figure that does not go stale
     * behind a printed QR. Both at two decimal places, which is what the
     * record's exponent byte carries — never `fiatFractionDigits`, a display
     * table this app may change on any deploy.
     *
     * Offered only for a fungible token (`isPriceable`), because the figure is
     * per whole token and because a permanent record must not be written about
     * a row whose kind this page could not read.
     */
    const priceWrap = el('div', 'desc-price');
    priceWrap.setAttribute('data-role', 'describe-price-field');
    const priceAmountLabel = el('label', 'paste-label', copy.DESC_PRICE_LABEL);
    const priceAmount = el('input', 'paste-in');
    priceAmount.type = 'text';
    priceAmount.name = 'describe-price';
    priceAmount.inputMode = 'decimal';
    priceAmount.autocomplete = 'off';
    priceAmount.spellcheck = false;
    priceAmount.maxLength = 24;
    priceAmount.setAttribute('data-role', 'describe-price');
    priceAmount.setAttribute('data-focus-key', 'describe-price');
    priceAmountLabel.append(priceAmount);
    /*
     * The unit as a two-way segment. A `<select>` of two options is a menu
     * for a choice that is always visible, and the accessible name carries
     * the code — "$" alone is a glyph three currencies share.
     */
    const priceUnit = sheetGroup(copy.DESC_PRICE_CODE_LABEL);
    priceUnit.setAttribute('data-role', 'describe-price-code');
    const unitSeg = el('div', 'seg seg-two');
    unitSeg.setAttribute('role', 'group');
    unitSeg.setAttribute('aria-label', copy.DESC_PRICE_CODE_LABEL);
    let priceCode: string = EDITABLE_PRICE_CODES[0];
    const unitButtons: HTMLButtonElement[] = [];
    const paintUnits = (): void => {
        for (const button of unitButtons) {
            button.setAttribute(
                'aria-pressed',
                button.getAttribute('data-code') === priceCode ? 'true' : 'false',
            );
        }
    };
    for (const code of EDITABLE_PRICE_CODES) {
        const button = el('button', 'seg-b', copy.priceUnitGlyph(code));
        button.type = 'button';
        button.setAttribute('data-code', code);
        button.setAttribute('data-role', `describe-unit-${code}`);
        button.setAttribute('data-focus-key', `describe-unit-${code}`);
        // The glyph on screen, the code in the accessible name: a "$" read
        // aloud is not a currency.
        button.setAttribute('aria-label', code.toUpperCase());
        button.addEventListener('click', () => {
            priceCode = code;
            paintUnits();
            refresh();
        });
        unitButtons.push(button);
        unitSeg.append(button);
    }
    priceUnit.append(unitSeg);
    priceWrap.append(priceAmountLabel, priceUnit);
    form.append(priceWrap);
    const priceLede = el('p', 'fine', copy.DESC_PRICE_LEDE);
    form.append(priceLede);
    /*
     * The tolerance (STLD tag 0x03): the shortfall this seller accepts on a
     * quote that needs a rate. Presets only, because <1% is unpayable in
     * practice and >10% makes the quote decorative — but the reader takes any
     * 1–100, since a record is permanent and another app may write one.
     *
     * Hidden under an XEC quote: no rate is involved in one, so there is no
     * drift for a margin to cover. A record that already carries a byte beside
     * an XEC quote keeps it — this sheet simply never adds one.
     */
    const toleranceGroup = sheetGroup(copy.DESC_TOLERANCE_LABEL);
    toleranceGroup.setAttribute('data-role', 'describe-tolerance');
    const toleranceSeg = el('div', 'seg');
    toleranceSeg.setAttribute('role', 'group');
    toleranceSeg.setAttribute('aria-label', copy.DESC_TOLERANCE_LABEL);
    const toleranceButtons: HTMLButtonElement[] = [];
    /**
     * What the sheet will write, and how it got there.
     *
     * `pressed` is the seller's own choice on this screen; it starts at the
     * default so a **typed** figure carries one without a second press. A
     * carried price is different: an untouched one is restated verbatim, byte
     * or no byte, so nothing is pressed until the seller presses it.
     */
    let tolerancePressed: number | undefined = TOLERANCE_PRESETS[1];
    let toleranceTouched = false;
    const paintTolerance = (): void => {
        for (const button of toleranceButtons) {
            button.setAttribute(
                'aria-pressed',
                Number(button.getAttribute('data-pct')) === tolerancePressed
                    ? 'true'
                    : 'false',
            );
        }
    };
    for (const pct of TOLERANCE_PRESETS) {
        const button = el('button', 'seg-b', copy.tolerancePreset(pct));
        button.type = 'button';
        button.setAttribute('data-pct', String(pct));
        button.setAttribute('data-role', `describe-tolerance-${pct}`);
        button.setAttribute('data-focus-key', `describe-tolerance-${pct}`);
        button.addEventListener('click', () => {
            tolerancePressed = pct;
            toleranceTouched = true;
            paintTolerance();
            refresh();
        });
        toleranceButtons.push(button);
        toleranceSeg.append(button);
    }
    toleranceGroup.append(toleranceSeg);
    const toleranceNote = el('p', 'fine', copy.DESC_TOLERANCE_HINT);
    toleranceNote.setAttribute('data-role', 'describe-tolerance-note');
    toleranceGroup.append(toleranceNote);
    more.append(toleranceGroup);
    /*
     * The two rails, and the sentence that they are not one thing. Nothing
     * links them: the covenant asks what it asks, and this figure is what the
     * seller wrote.
     */
    const twoPrices = el('p', 'fine', copy.DESC_TWO_PRICES);
    twoPrices.setAttribute('data-role', 'describe-two-prices');
    form.append(twoPrices);
    const priceWhy = el('p', 'fine', copy.DESC_PRICE_NOT_PRICEABLE);
    priceWhy.setAttribute('data-role', 'describe-price-why');
    priceWhy.hidden = true;
    form.append(priceWhy);
    /*
     * Three warnings, and not one of them blocks a publish.
     *
     * A genesis this page could not read is **our** gap; a token listed here
     * as well is a choice the seller is allowed to make; a figure with no
     * words is a record that will paint under a token's name. Each is a thing
     * the seller has a right to know before signing and none is a thing this
     * app may decide for them. The one refusal is above: a **new** quote on a
     * token another wallet minted.
     */
    const warnUnattributed = el('p', 'fine', copy.DESC_QUOTE_UNATTRIBUTED);
    warnUnattributed.setAttribute('data-role', 'describe-warn-unattributed');
    warnUnattributed.hidden = true;
    const warnListed = el('p', 'fine', copy.DESC_QUOTE_LISTED_TOO);
    warnListed.setAttribute('data-role', 'describe-warn-listed');
    warnListed.hidden = true;
    const warnNoWords = el('p', 'fine', copy.DESC_QUOTE_NO_WORDS);
    warnNoWords.setAttribute('data-role', 'describe-warn-no-words');
    warnNoWords.hidden = true;
    form.append(warnUnattributed, warnListed, warnNoWords);
    /*
     * The seller's own figure, read back from the record they signed — its own
     * role, never `fiat`. That node is a conversion of the covenant's asked
     * amount; this is a number the seller wrote, and nothing on this page
     * converts it (CLAUDE §8).
     */
    const sellerPriceLine = el('p', 'fine', '');
    sellerPriceLine.setAttribute('data-role', 'seller-price');
    sellerPriceLine.hidden = true;
    form.append(sellerPriceLine);

    const meter = sheetMeter();
    more.append(meter.wrap);
    const counter = el('p', 'pub', '');
    counter.setAttribute('data-role', 'describe-summary');
    form.append(counter);

    const err = el('p', 'ctx', '');
    err.hidden = true;
    err.setAttribute('data-role', 'describe-invalid');
    form.append(err);

    const clearLede = el('p', 'fine', copy.DESC_CLEAR_ALL_LEDE);
    clearLede.setAttribute('data-role', 'describe-clear-lede');
    clearLede.hidden = true;
    form.append(clearLede);

    // Removal is a mode of this sheet, not a second pair of links under it:
    // the same meter, the same summary and the same two sign controls swap to
    // the removal record, so what is on screen is the record being signed.
    const warn = el('p', 'warn', copy.DESC_REMOVE_LEDE);
    warn.setAttribute('data-role', 'describe-remove-warn');
    warn.hidden = true;
    form.append(warn);

    wrap.append(form);

    const acts = el('div', 'acts');
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
    acts.append(web, app);
    // Never inside the fold: a phone reaches its wallet by this link.
    wrap.append(acts);

    const removeToggle = el('button', 'mini another link-mute', copy.DESC_REMOVE_OPEN);
    removeToggle.type = 'button';
    removeToggle.setAttribute('data-role', 'describe-remove');
    removeToggle.setAttribute('data-focus-key', 'describe-remove');
    more.append(removeToggle);

    // Cashtab previews an unknown LOKAD as raw hex, so this sheet is the only
    // place an `STLD` record is legible before it is signed — the same reason
    // the stall's own record says it, and the same sentence.
    more.append(el('p', 'fine', copy.PUBLISH_WALLET_SHOWS_HEX));
    const bytes = el('p', 'fine publish-hex', '');
    bytes.setAttribute('data-role', 'describe-hex');
    const hexFold = sheetFold('describe-hex-fold', copy.RECORD_BYTES_FOLD, bytes);
    more.append(hexFold);

    const qrBox = el('div', 'publish-qr');
    qrBox.setAttribute('data-role', 'describe-qr');
    qrBox.hidden = true;
    more.append(
        sheetFold('describe-qr-fold', copy.SCAN_WITH_PHONE_FOLD, qrBox, 'sheet-qr-fold'),
    );
    const moreFold = sheetFold('describe-more', copy.SHEET_MORE, more) as HTMLDetailsElement;
    wrap.append(moreFold);

    /** Removal mode: the same controls, aimed at the removal record. */
    let removing = false;

    const refresh = (): void => {
        const tokenId = picker.value;
        const text = field.value;
        const shelf = shelfField.value;
        const used = descriptionBytes(text);

        // Nothing to write a record about yet. The picker and its note stay;
        // the record itself has no subject, so it is not on screen.
        const noToken = tokenId === '';
        noTokens.hidden = !noToken;
        tokenLabel.hidden = noToken;
        form.hidden = noToken;
        // Nothing to pick: the way in is the paste field, which sits in the
        // fold — so the fold opens, or the note above points at a closed door.
        if (noToken) {
            moreFold.open = true;
        }

        // Per whole token, and only for a fungible one: no field at all
        // otherwise, with the line saying why in its place.
        const priceable = isPriceable(tokenId, known.get(tokenId));
        const attribution = attributionOf(tokenId);
        /*
         * The one refusal on this sheet. A quote on a token another wallet
         * minted borrows that token's id, its picture and whatever it stands
         * for off-chain, so the field goes and the reason takes its place —
         * the shape `priceWhy` already had for a token that is not fungible.
         * Words and shelf stay editable: those are the seller's own sentences
         * about a row they are selling, and nothing is borrowed by writing one.
         */
        const notOurs = attribution === 'not-attributed';
        // A withheld token keeps its words, shelf and removal road — a
        // published record is permanent — and loses only the quote, which
        // this page would never show.
        const withheld = isWithheldToken(tokenId, known.get(tokenId));
        const quotable = priceable && !notOurs && !withheld;
        priceWrap.hidden = !quotable;
        priceLede.hidden = !quotable;
        priceWhy.hidden = quotable;
        // Most fundamental first: a token whose kind this page never read is
        // not a token it may write a per-whole-token figure about at all.
        priceWhy.textContent = withheld
            ? copy.DESC_QUOTE_WITHHELD
            : priceable
              ? copy.DESC_QUOTE_NOT_YOURS
              : copy.DESC_PRICE_NOT_PRICEABLE;

        const published = view.prices?.get(tokenId);
        // Whether the field on screen can express what the chain already says.
        const editable =
            quotable &&
            published !== undefined &&
            (EDITABLE_PRICE_CODES as readonly string[]).includes(published.code);
        /*
         * A published price this field cannot express is carried forward
         * untouched, not dropped — whichever reason it cannot: a unit this
         * editor does not write, or a token `isPriceable` refuses because its
         * genesis read failed, which is our gap and not a fact about the
         * seller. A publish restates the whole document, so erasing a field
         * this app merely could not show would destroy a permanent record as a
         * side effect of fixing a typo. The seller's own figure, once typed,
         * wins over it — so there is no record this sheet can reach but never
         * change.
         */
        const carriedPrice = editable ? undefined : published;
        const figure = quotable ? priceAmount.value.trim() : '';
        const typedPrice =
            figure === ''
                ? undefined
                : parsePriceFigure(figure, priceCode, EDITOR_PRICE_EXPONENT);
        const priceRefused = figure !== '' && typedPrice === undefined;
        /*
         * Which margin the record carries, and the whole rule in one place:
         * a **typed** figure takes the pressed preset (2% by default), a
         * preset **pressed over a carried price** republishes that price with
         * the byte, and an **untouched carried price is restated verbatim**,
         * byte or no byte. The encoder writes what it is handed and invents
         * nothing.
         *
         * The carried value is offered back only when a preset can say it. One
         * this sheet cannot express is shown disabled and carried forward
         * untouched — a publish restates the whole document, so a sheet that
         * dropped a field it merely could not edit would destroy a permanent
         * record as a side effect of fixing a typo (the `0x04` rule).
         */
        const carriedTolerance = published?.tolerancePct;
        const carriedIsPreset =
            carriedTolerance !== undefined &&
            (TOLERANCE_PRESETS as readonly number[]).includes(carriedTolerance);
        // Hidden under an XEC quote (no rate, no drift) and over a price this
        // sheet is only carrying forward: pressing a margin onto a record it
        // cannot otherwise edit would be an edit disguised as a restatement.
        const toleranceEditable =
            quotable && priceCode !== XEC_PRICE_CODE && carriedPrice === undefined;
        toleranceGroup.hidden = !toleranceEditable;
        for (const button of toleranceButtons) {
            button.disabled = removing || (carriedTolerance !== undefined && !carriedIsPreset);
        }
        if (!toleranceTouched) {
            tolerancePressed = carriedIsPreset
                ? carriedTolerance
                : carriedTolerance !== undefined
                  ? undefined
                  : published === undefined
                    ? TOLERANCE_PRESETS[1]
                    : undefined;
            paintTolerance();
        }
        toleranceNote.textContent =
            carriedTolerance !== undefined && !carriedIsPreset
                ? copy.DESC_TOLERANCE_FIXED
                : tolerancePressed === undefined
                  ? copy.DESC_TOLERANCE_NONE
                  : copy.DESC_TOLERANCE_HINT;
        /*
         * The margin the record will carry. An XEC quote takes only what the
         * record already had; a USD one takes what is pressed, falling back to
         * the carried byte so an untouched record is restated verbatim.
         */
        const tolerancePct =
            priceCode === XEC_PRICE_CODE
                ? carriedTolerance
                : (tolerancePressed ?? carriedTolerance);
        const typedWithMargin =
            typedPrice === undefined || tolerancePct === undefined
                ? typedPrice
                : { ...typedPrice, tolerancePct };
        const price = typedWithMargin ?? carriedPrice;

        /*
         * The three warnings, each shown where it is true and none of them
         * blocking. The unattributed one rides the field's presence — there is
         * nothing to warn about on a row that takes no quote at all — and the
         * other two ride the quote itself.
         */
        warnUnattributed.hidden = noToken || !quotable || attribution !== 'unknown';
        warnListed.hidden = noToken || price === undefined || !listed.has(tokenId);
        warnNoWords.hidden = noToken || price === undefined || text !== '';

        // Read back what the chain says, in the unit it says it — never a
        // conversion, and never for a code this editor could not have written.
        sellerPriceLine.hidden = !editable;
        sellerPriceLine.textContent =
            published === undefined || !editable
                ? ''
                : copy.sellerPrice(formatPriceFigure(published), published.code.toUpperCase());

        const publishedShelf = view.shelves?.get(tokenId);
        const existing =
            view.descriptions?.get(tokenId) ?? publishedShelf ?? published;
        // Nothing asked of the record yet, which is not a refusal and gets no
        // error. A figure that was typed and cannot be written **is** asked of
        // it, so it does not count as untouched — otherwise the one refusal a
        // seller can reach with the other fields blank would print nothing.
        const blank = text === '' && shelf === '' && price === undefined && !priceRefused;
        // Every field empty over a record that exists is a request — the bare
        // tombstone, which takes the words, the shelf and the price off this
        // page in one record. Over nothing it is still nothing asked.
        const clearing = blank && existing !== undefined;
        const empty = blank && existing === undefined;

        // The removal record: the words taken away and every other field
        // restated. One record is the whole truth about one token, so a
        // removal carrying only the empty push would take the shelf and the
        // figure off the chain with the words.
        const removalHex =
            existing === undefined
                ? undefined
                : encodeRemovalHex(tokenId, {
                      shelf: publishedShelf,
                      price: published,
                  });
        const canRemove = removalHex !== undefined;
        if (removing && !canRemove) {
            // The token changed under the mode, or there is nothing left to
            // remove. A removal over nothing costs a fee and changes nothing.
            removing = false;
        }
        removeToggle.hidden = !canRemove && !removing;
        removeToggle.textContent = removing ? copy.DESC_KEEP : copy.DESC_REMOVE_OPEN;
        warn.hidden = !removing;
        // The form on screen is the record being signed, so in removal mode
        // the fields it will not publish take no input.
        for (const input of [field, shelfField, priceAmount]) {
            input.disabled = removing;
        }
        for (const button of unitButtons) {
            button.disabled = removing;
        }
        form.classList.toggle('removing', removing);

        clearLede.hidden = removing || !clearing;
        const hex = removing
            ? removalHex
            : empty || priceRefused
              ? undefined
              : clearing
                ? encodeRemovalHex(tokenId, {})
                : encodeDescriptionHex(tokenId, text, {
                      shelf: shelf === '' ? undefined : shelf,
                      price,
                  });
        const ready = hex !== undefined;
        err.hidden = removing || ready || empty;
        // Which rule bit, most specific first: the text's own caps, then the
        // price's own shape, then the shared record budget, then the text's
        // screen, then the shelf's.
        err.textContent =
            used > MAX_DESCRIPTION_BYTES
                ? copy.DESC_TOO_LONG
                : /[\r\n]/.test(text)
                  ? copy.DESC_ONE_LINE
                  : priceRefused
                    ? copy.DESC_PRICE_REFUSED
                    : descriptionRecordBytes(text, shelf, price) > OP_RETURN_BUDGET
                      ? price === undefined
                          ? copy.DESC_OVER_BUDGET
                          : price.tolerancePct === undefined
                            ? copy.DESC_OVER_BUDGET_PRICED
                            : copy.DESC_OVER_BUDGET_TOLERANCE
                      : text !== '' && encodeDescriptionHex(tokenId, text) === undefined
                        ? copy.DESC_REFUSED
                        : copy.DESC_SHELF_REFUSED;

        /*
         * One meter and one summary, over the same record the encoder built.
         * The size is `descriptionRecordBytes` — the encoder's own arithmetic,
         * so a refused record still shows how far over it is — and every part
         * named is a field that same call was handed. Nothing here counts
         * anything twice.
         */
        const name = tokenName(known, tokenId);
        const parts: copy.SummaryPart[] = [];
        let size: number;
        if (removing) {
            parts.push({ label: copy.SUMMARY_REMOVAL, value: name });
            if (publishedShelf !== undefined) {
                parts.push({ label: copy.SUMMARY_SHELF, value: publishedShelf });
            }
            if (published !== undefined) {
                parts.push({ label: copy.SUMMARY_QUOTE, value: sayPrice(published) });
            }
            size = descriptionRecordBytes('', publishedShelf ?? '', published);
        } else if (clearing) {
            parts.push({ label: copy.SUMMARY_CLEARS, value: name });
            size = descriptionRecordBytes('');
        } else {
            if (text !== '') {
                parts.push({ label: copy.SUMMARY_WORDS });
            }
            if (shelf !== '') {
                parts.push({ label: copy.SUMMARY_SHELF, value: shelf });
            }
            if (price !== undefined) {
                parts.push({ label: copy.SUMMARY_QUOTE, value: sayPrice(price) });
                if (price.tolerancePct !== undefined) {
                    parts.push({
                        label: copy.SUMMARY_TOLERANCE,
                        value: copy.tolerancePreset(price.tolerancePct),
                    });
                }
            }
            size = descriptionRecordBytes(text, shelf, price);
        }
        counter.textContent = empty
            ? copy.SUMMARY_NOTHING
            : copy.summaryLine(parts, size, OP_RETURN_BUDGET);
        meter.set(empty ? 0 : size, OP_RETURN_BUDGET);

        bytes.textContent = ready ? hex : '';
        // The node and its fold hide together: a fold open over an empty hex
        // is a disclosure of nothing.
        bytes.hidden = !ready;
        hexFold.hidden = !ready;
        const cashtab = ready ? cashtabPublishUrl(address, hex) : undefined;
        const pay = ready ? payECashPublishUrl(address, hex) : undefined;
        const linked = cashtab !== undefined && pay !== undefined;
        web.hidden = !linked;
        app.hidden = !linked;
        // A removal is a transaction like any other, so it gets the same
        // roads to a wallet as writing does — and its own words on them, or
        // two identical pills would sign two different records.
        web.textContent = removing ? copy.DESC_REMOVE : copy.PUBLISH_OPEN_CASHTAB;
        app.textContent = removing ? copy.DESC_REMOVE_PAY : copy.PUBLISH_OPEN_PAY;
        web.classList.toggle('danger', removing);
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
    };

    /**
     * Whose token the selected one is, asked once per token.
     *
     * The answer comes back to this closure and the sheet refreshes itself;
     * the app never repaints for it. Skipped when the view already carries an
     * answer — the load path decides every quoted token, so this is for the
     * ones only the seller looks at: a listed row not yet quoted, and a pasted
     * id.
     */
    const askAbout = (tokenId: string): void => {
        const lookup = handlers.onLookupToken;
        if (lookup === undefined || tokenId === '' || asked.has(tokenId)) {
            return;
        }
        if (learned.has(tokenId) || view.genesis?.get(tokenId) !== undefined) {
            return;
        }
        asked.add(tokenId);
        void lookup(tokenId)
            .then((answer) => {
                if (answer.meta !== undefined) {
                    known.set(tokenId, answer.meta);
                }
                learned.set(tokenId, answer.attribution);
                refresh();
            })
            .catch(() => {
                // Undecided warns and never refuses, which is what an absent
                // answer already reads as.
            });
    };

    /** `chronik.tx()` concatenates its argument into a request path unchecked. */
    const TOKEN_ID_HEX = /^[0-9a-f]{64}$/;
    pasteAdd.addEventListener('click', () => {
        const typed = pasteField.value.trim().toLowerCase();
        const lookup = handlers.onLookupToken;
        if (!TOKEN_ID_HEX.test(typed) || lookup === undefined) {
            pasteWhy.hidden = false;
            pasteWhy.textContent = copy.DESC_PASTE_INVALID;
            return;
        }
        pasteWhy.hidden = true;
        asked.add(typed);
        void lookup(typed)
            .then((answer) => {
                learned.set(typed, answer.attribution);
                if (answer.meta === undefined) {
                    // No genesis facts is no row: the sheet would offer a
                    // picker entry named by a 64-character id, over a record
                    // whose kind it could not check.
                    pasteWhy.hidden = false;
                    pasteWhy.textContent = copy.DESC_PASTE_UNREAD;
                    refresh();
                    return;
                }
                known.set(typed, answer.meta);
                addOption(typed);
                picker.value = typed;
                pasteField.value = '';
                removing = false;
                loadToken();
                refresh();
            })
            .catch(() => {
                pasteWhy.hidden = false;
                pasteWhy.textContent = copy.DESC_PASTE_UNREAD;
            });
    });
    pasteField.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
        }
    });

    removeToggle.addEventListener('click', () => {
        removing = !removing;
        refresh();
    });

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
    priceAmount.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
        }
    });
    priceAmount.addEventListener('input', refresh);
    /**
     * Every field belongs to the token, so switching tokens loads that token's
     * record — words, shelf and figure together. Loading two of the three is
     * how a publish quietly drops the one it did not load.
     */
    const loadToken = (): void => {
        const tokenId = picker.value;
        askAbout(tokenId);
        field.value = view.descriptions?.get(tokenId) ?? '';
        shelfField.value = view.shelves?.get(tokenId) ?? '';
        const price = view.prices?.get(tokenId);
        const editable =
            price !== undefined &&
            (EDITABLE_PRICE_CODES as readonly string[]).includes(price.code);
        priceAmount.value = editable ? formatPriceFigure(price) : '';
        priceCode = editable ? price.code : EDITABLE_PRICE_CODES[0];
        // A margin belongs to one token's record, so switching tokens drops
        // whatever was pressed for the last one.
        toleranceTouched = false;
        tolerancePressed = undefined;
        paintUnits();
    };
    picker.addEventListener('change', () => {
        // A removal is about one token. Switching tokens is a different
        // record, so the mode does not follow the picker.
        removing = false;
        loadToken();
        refresh();
    });
    form.addEventListener('submit', (event) => event.preventDefault());

    wrap.append(el('p', 'fine', copy.PUBLISH_MUST_SIGN));
    wrap.append(el('p', 'fine', copy.PUBLISH_AFTER_SIGNING));
    wrap.append(sheetFoot(handlers));
    loadToken();
    refresh();
    return wrap;
}

/**
 * How long a frozen rate may compose a payment before it is asked again.
 *
 * Two minutes bounds the gap between the figure a buyer read and the figure
 * their wallet is handed — it is a span between reading a page and pressing a
 * control, not a claim about the market.
 */
export const PAY_RATE_MAX_AGE_MS = 120_000;

/** A refetch that has not answered by here is "no fresh price", not a wait. */
export const PAY_RATE_TIMEOUT_MS = 8_000;

/**
 * The valve's own threshold when the seller stated none.
 *
 * **Never painted as the seller's.** A tolerance on screen is something they
 * published; this is only this app deciding when a moved figure deserves a
 * second look, and the sheet says outright that the seller stated nothing.
 */
const PAY_VALVE_DEFAULT_PCT = 2;

/** What the memo's quantity field holds: eight unsigned bytes. */
const MAX_PAY_QUANTITY = (1n << 64n) - 1n;

/** The width the design opens the scan fold at. Read once, at paint. */
const PAY_QR_OPEN_QUERY = '(min-width: 680px)';

/**
 * The open sheet's own timer, in module state because `renderStall` throws the
 * tree away on every paint and a timer left armed would fire against a sheet
 * that is no longer there. Cleared at the top of every paint, re-armed by the
 * sheet that wants it.
 */
let payQrTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * The seller's tolerance as the rail says it: only for a quote that involves
 * a rate. An xec quote mounts no line at all — not the figure and not its
 * absence: the record may carry the byte (it is carried whatever the code),
 * and "not stated" would be a sentence that record contradicts. One helper,
 * so the pay sheet and the item face cannot disagree about which quotes
 * have one.
 */
export function toleranceLine(price: TokenPrice): HTMLElement | null {
    if (price.code === XEC_PRICE_CODE) {
        return null;
    }
    const stated = price.tolerancePct;
    const line = el(
        'p',
        'fine',
        stated === undefined
            ? copy.PAY_TOLERANCE_NONE
            : stated > 25
              ? copy.PAY_TOLERANCE_WIDE
              : copy.payTolerance(stated),
    );
    line.setAttribute('data-role', 'pay-tolerance');
    return line;
}

function clearPayQrTimer(): void {
    if (payQrTimer !== undefined) {
        clearTimeout(payQrTimer);
        payQrTimer = undefined;
    }
}

/**
 * One quoted item, and the payment a buyer's own wallet would sign for it.
 *
 * **Disclosure, not a checkout.** This origin holds no key: it composes a
 * BIP21 and the buyer's wallet signs it, the same hand-off the buy control and
 * both record sheets already use. Nothing here can tell that a payment
 * happened, and nothing on it claims to.
 *
 * The rate the figure was composed against lives in this closure, seeded from
 * `view.payRate`; so does the quantity, seeded from `view.payQuantity` and
 * reported back through `onPayQuantity` on every accepted input — because
 * `renderStall` opens with `replaceChildren()`, and a repaint that rebuilt
 * the sheet at one after the buyer typed three would sign the wrong figure.
 * Every update this sheet makes itself — the refresh control, the press-time
 * valve, the code ageing out — is its own `refresh()`, in place.
 */
function paySheet(view: StallView, handlers: StallHandlers): HTMLElement {
    const wrap = el('div', 'sheet');
    wrap.setAttribute('data-role', 'pay');
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.setAttribute('aria-label', copy.PAY_TITLE);

    const tokenId = view.overlay.kind === 'pay' ? view.overlay.tokenId : '';
    const item = quotedItems(view).find((row) => row.tokenId === tokenId);
    const address = view.address ?? '';
    if (item === undefined) {
        // A scanned link, or a re-read, can name a token this stall does not
        // quote. Say that rather than painting a sheet with no figure on it —
        // and keep the sheet's own title, because there is no item to name
        // here and a bare token id in a head is not one.
        wrap.append(sheetHead(copy.PAY_TITLE, copy.PAY_HINT_UNKNOWN, handlers));
        wrap.append(el('p', 'ctx', copy.PAY_HINT_UNKNOWN));
        wrap.append(payFoot(handlers));
        return wrap;
    }
    // The item is named by the seller's words, with the token's own name — or
    // the fact that they wrote none — on the head's second line.
    const named = quoteNaming(view, tokenId);
    wrap.append(sheetHead(named.title, named.tokenName ?? named.note ?? '', handlers));
    const price = item.price;
    const usesRate = price.code !== XEC_PRICE_CODE;

    /** The buyer's own quantity: whole items, at least one. */
    let quantity = view.payQuantity ?? 1n;
    /** The rate this sheet froze, and when. Never `view.fiatRate`. */
    let rate = usesRate ? view.payRate : undefined;

    const card = el('div', 'pay-amt');
    const cap = el('div', 'pay-cap', copy.PAY_CAP_SIGNS);
    card.append(cap);
    const figureRow = el('div', 'pay-x');
    const figure = el('span', 'pay-x-n', '');
    figure.setAttribute('data-role', 'price');
    figureRow.append(figure, el('span', 'item-u', copy.XEC));
    card.append(figureRow);
    const quote = el('div', 'pay-eq', '');
    quote.setAttribute('data-role', 'seller-price');
    card.append(quote);
    const rateRow = el('div', 'pay-rate-row');
    const rateLabel = el('span', 'pay-rate', '');
    rateLabel.setAttribute('data-role', 'rate');
    const refreshRate = el('button', 'mini', copy.PAY_RATE_REFRESH);
    refreshRate.type = 'button';
    refreshRate.setAttribute('data-role', 'pay-refresh');
    refreshRate.setAttribute('data-focus-key', 'pay-refresh');
    rateRow.append(rateLabel, refreshRate);
    if (usesRate) {
        card.append(rateRow);
    }
    const why = el('p', 'fine', '');
    why.hidden = true;
    card.append(why);
    // The rail's own limits, under the figure and inside the card: this is
    // where a buyer is looking when they decide, and a note further down the
    // sheet is a note read after the decision.
    card.append(el('p', 'note pay-amt-note', copy.PAY_NOTE_DIRECT));
    // Whose genesis this is, said here as well as on the row: a scanned link
    // opens this sheet without the row ever being on screen. One node, painted
    // in place, because the answer can land after the sheet did.
    // The borrowed-id warning stays in the card, beside the figure: the id,
    // the picture and whatever the token stands for off-chain are all
    // borrowed, and a buyer decides here. The positive half — what the
    // genesis points at, never who signed — is mechanism, and folds.
    const borrowed = el('p', 'fine', copy.QUOTE_NOT_MINTED_HERE);
    borrowed.setAttribute('data-role', 'quote-not-minted');
    borrowed.hidden = true;
    card.append(borrowed);
    const minted = el('p', 'fine', copy.QUOTE_MINTED_HERE);
    minted.setAttribute('data-role', 'quote-minted');
    minted.hidden = true;
    const paintProvenance = (mintedBy: GenesisAttribution | undefined): void => {
        borrowed.hidden = mintedBy !== 'not-attributed';
        minted.hidden = mintedBy !== 'attributed';
    };
    const mintedBy = view.genesis?.get(tokenId);
    paintProvenance(mintedBy);
    if (
        (mintedBy === undefined || mintedBy === 'unknown') &&
        view.genesisPending?.includes(tokenId) === true &&
        handlers.onLookupToken !== undefined
    ) {
        // The capped genesis read lands after the first paint, and a live
        // paint waits while a sheet is open — so a sheet a scanned link opened
        // on that first paint would never learn the answer. It asks itself
        // (cached once decided) and paints the line in place — only for a
        // token the loader said it is reading, and only while this is still
        // the sheet on screen: a repaint detaches this tree.
        void handlers
            .onLookupToken(tokenId)
            .then((answer) => {
                if (wrap.parentNode !== null) {
                    paintProvenance(answer.attribution);
                }
            })
            .catch(() => {
                // Undecided says nothing, which is what the sheet already shows.
            });
    }
    wrap.append(card);

    /*
     * The seller's whole description, under its own label. The head carries a
     * cut of it as a title; this is the sheet where "describe the item so they
     * know what they pay for" pays off, so nothing here is shortened.
     */
    const words = view.descriptions?.get(tokenId);
    if (words !== undefined && words !== '') {
        const said = el('dl', 'row pay-words');
        said.append(el('dt', undefined, copy.PAY_WORDS_LABEL));
        const value = el('dd', undefined, words);
        value.setAttribute('data-role', 'pay-words');
        said.append(value);
        wrap.append(said);
    }

    const valve = el('p', 'note', '');
    valve.setAttribute('data-role', 'pay-valve');
    valve.hidden = true;
    wrap.append(valve);

    /*
     * Quantity: a figure with a way in, because one is the ordinary case and a
     * bare number field over a money figure invites an edit nobody came here
     * to make.
     */
    const qtyRow = el('dl', 'row pay-qty');
    qtyRow.append(el('dt', undefined, copy.PAY_QUANTITY_LABEL));
    const qtyValue = el('dd');
    const qtyShown = el('b', undefined, copy.payQuantityShown(quantity.toString()));
    const qtyEdit = el('button', 'mini another', copy.PAY_QUANTITY_EDIT);
    qtyEdit.type = 'button';
    qtyEdit.setAttribute('data-role', 'pay-quantity-edit');
    qtyEdit.setAttribute('data-focus-key', 'pay-quantity-edit');
    const qtyField = el('input', 'paste-in pay-qty-in');
    qtyField.type = 'text';
    qtyField.inputMode = 'numeric';
    qtyField.autocomplete = 'off';
    qtyField.value = quantity.toString();
    qtyField.maxLength = 20;
    qtyField.hidden = true;
    qtyField.setAttribute('aria-label', copy.PAY_QUANTITY_LABEL);
    qtyField.setAttribute('data-role', 'pay-quantity');
    qtyField.setAttribute('data-focus-key', 'pay-quantity');
    qtyValue.append(qtyShown, qtyEdit, qtyField);
    qtyRow.append(qtyValue);
    wrap.append(qtyRow);
    qtyEdit.addEventListener('click', () => {
        qtyShown.hidden = true;
        qtyEdit.hidden = true;
        qtyField.hidden = false;
        qtyField.focus();
    });
    qtyField.addEventListener('input', () => {
        // Whole items only, at least one, and no larger than the memo's own
        // field holds — eight unsigned bytes. Read as a `bigint`, never a
        // `Number`: the ceiling is past where a double keeps every digit.
        const typed = qtyField.value.trim();
        const asked = /^\d{1,20}$/.test(typed) ? BigInt(typed) : 0n;
        quantity = asked >= 1n && asked <= MAX_PAY_QUANTITY ? asked : 1n;
        qtyShown.textContent = copy.payQuantityShown(quantity.toString());
        handlers.onPayQuantity?.(tokenId, quantity);
        refresh();
    });

    // Everything that binds the rail and is not the figure's own sentence
    // goes under one closed summary after the control: mechanism, read by
    // whoever wants it, never standing between the figure and Pay.
    const how = el('div');
    how.append(el('p', 'fine', copy.PAY_FINE_MEMO));
    how.append(el('p', 'fine', copy.PAY_FINE_SOME_WALLETS));
    /*
     * The seller's own margin, and the two honest ways of not having one. Only
     * a quote that needs a rate can drift, and a value past what this app's
     * own presets can say is named as wider rather than printed as a figure
     * whose meaning nothing here can vouch for.
     */
    const tolerance = toleranceLine(price);
    if (tolerance !== null) {
        how.append(tolerance);
    }
    how.append(el('p', 'fine', copy.PAY_FINE_DELIVERY));
    if (decimalsOf(view.tokens, tokenId) > 0) {
        how.append(el('p', 'fine', copy.PAY_FINE_WHOLE_ITEMS));
    }
    const age = quoteAgeNode(view, tokenId, 'p', 'fine');
    if (age !== null) {
        how.append(age);
    }
    how.append(minted);
    // Below the card, which keeps its one sentence: that the money cannot come
    // back is said right under the control that sends it.
    const final = el('p', 'fine', copy.PAY_NOTE_FINAL);
    final.setAttribute('data-role', 'pay-final');

    const acts = el('div', 'acts');
    // Buttons, not anchors. An anchor carries its destination where a
    // middle-click, the context menu's "open in new tab" or "copy link
    // address", or a drag to the address bar can take it — none of which
    // reaches the press-time valve below — so once the rate had aged, every
    // road but the guarded one handed a wallet the stale amount. A button
    // holds no destination: the URL lives here, is rewritten by every
    // `refresh()`, and reaches a wallet only through a press the valve saw.
    const web = el('button', 'buy', copy.PAY_CASHTAB);
    web.type = 'button';
    web.setAttribute('data-focus-key', 'pay-cashtab');
    const app = el('button', 'mini another', copy.PAY_OTHER_WALLET);
    app.type = 'button';
    app.setAttribute('data-focus-key', 'pay-wallet');
    /** The composed destinations: written by `refresh()`, read at press time. */
    let webUrl: string | undefined;
    let appUrl: string | undefined;
    acts.append(web, app);
    wrap.append(acts);

    const qrBody = el('div', 'publish-qr pay-qr-body');
    const qrFold = sheetFold('pay-qr-fold', copy.PAY_QR_FOLD, qrBody);
    /*
     * Closed on a phone, open from the width the design opens it at. Read once
     * at paint and never again: there is no resize handling, so a widened
     * window keeps whatever state it opened with — accepted, because the
     * summary is one click away either way, and a sentence explaining that on
     * a buyer's sheet would be chrome about the chrome.
     *
     * Not `.sheet-qr-fold`: that one hides itself on a phone, and this code is
     * the point of the sheet on a desktop and still worth reaching on a phone.
     */
    (qrFold as HTMLDetailsElement).open = payQrFoldOpens();
    wrap.append(final);
    wrap.append(qrFold);
    wrap.append(sheetFold('pay-how', copy.PAY_HOW_FOLD, how));
    wrap.append(payFoot(handlers));

    /**
     * Everything the figure touches, recomposed from one `satsForQuote`
     * result: the figure on screen, both links and the code are that same
     * `bigint`, so a buyer cannot be shown one number and handed another.
     */
    /** What the valve last found; seeded from the view so a fixture can stage it. */
    let outcome: StallView['payRateOutcome'] = view.payRateOutcome;

    const refresh = (): void => {
        clearPayQrTimer();
        const sats = satsForQuote(price, quantity, rate?.rate);
        const memoHex = encodePaymentMemoHex(tokenId, quantity);
        const subDust = sats !== undefined && sats < DUST_SATS;
        const composable = sats !== undefined && memoHex !== undefined;
        const bip21 = composable ? payBip21(address, sats, memoHex) : undefined;
        const cashtab = composable ? cashtabPayUrl(address, sats, memoHex) : undefined;
        const pay = composable ? payECashPayUrl(address, sats, memoHex) : undefined;

        figureRow.hidden = sats === undefined;
        figure.textContent = sats === undefined ? '' : formatXec(sats);
        cap.textContent = sats === undefined ? copy.PAY_CAP_QUOTE : copy.PAY_CAP_SIGNS;
        /*
         * With a figure, the quote sits under it labelled as the seller's; an
         * XEC quote **is** the figure, so restating it would print one number
         * twice and the line says where it came from instead. With no figure
         * at all the quote is the only thing there is to show, and it takes
         * the top of the card.
         */
        quote.textContent = !usesRate
            ? copy.PAY_XEC_QUOTE_NOTE
            : sats === undefined
              ? quoteFigure(price)
              : copy.payQuoteEquals(quoteFigure(price));

        if (usesRate) {
            const glance = formatXecRate(rate?.rate, price.code);
            rateRow.hidden = glance === undefined;
            rateLabel.textContent =
                glance === undefined || rate === undefined
                    ? ''
                    : copy.payRateLine(glance, formatTriedAt(rate.atMs));
        }
        why.hidden = sats !== undefined && !subDust;
        why.textContent = subDust
            ? copy.PAY_SUB_DUST
            : sats === undefined
              ? copy.PAY_NO_RATE_WHY
              : '';

        const linked = cashtab !== undefined && pay !== undefined;
        webUrl = cashtab;
        appUrl = pay;
        web.hidden = !linked;
        app.hidden = !linked;
        // After the price moved the control restates the figure it will open,
        // composed from the same satoshis as the figure and both URLs.
        web.textContent =
            outcome === 'moved' && sats !== undefined ? copy.payFigure(formatXec(sats)) : copy.PAY_CASHTAB;
        valve.hidden = outcome === undefined;
        valve.textContent =
            outcome === 'unavailable'
                ? copy.PAY_RATE_UNAVAILABLE
                : outcome === 'moved'
                  ? copy.PAY_RATE_MOVED
                  : outcome === 'refreshed'
                    ? copy.PAY_RATE_REFRESHED
                    : '';
        // A control with no destination is not a control: the role comes off
        // with the destination, so nothing on screen offers a press that does
        // nothing.
        if (linked) {
            web.setAttribute('data-role', 'pay-cashtab');
            app.setAttribute('data-role', 'pay-wallet');
        } else {
            web.removeAttribute('data-role');
            app.removeAttribute('data-role');
        }

        /*
         * The code has the rate's own lifetime. A phone can scan it an hour
         * after it was painted, and the amount inside it came from a rate that
         * has moved since — so it is taken away rather than left scannable,
         * and a timer does that without anyone touching the page. An XEC quote
         * never ages: no rate is involved in it at all.
         */
        const aged =
            usesRate && rate !== undefined && Date.now() - rate.atMs >= PAY_RATE_MAX_AGE_MS;
        qrFold.hidden = bip21 === undefined;
        if (bip21 !== undefined && !aged && fitsQr(bip21)) {
            const box = el('div', 'pay-qr');
            box.setAttribute('data-role', 'pay-qr');
            box.append(qrSvg(bip21, copy.PAY_QR_ALT), el('p', 'fine', copy.PAY_QR_LEDE));
            qrBody.replaceChildren(box);
            if (usesRate && rate !== undefined) {
                const left = rate.atMs + PAY_RATE_MAX_AGE_MS - Date.now();
                payQrTimer = setTimeout(refresh, Math.max(left, 0));
            }
        } else if (bip21 !== undefined) {
            qrBody.replaceChildren(el('p', 'fine', copy.PAY_QR_STALE));
        } else {
            qrBody.replaceChildren();
        }
    };

    /**
     * The press-time valve. A frozen rate older than `PAY_RATE_MAX_AGE_MS` is
     * refetched **on the press**, and the press opens nothing afterwards: a
     * second press is always required.
     *
     * That is the platform, not caution about the market. WebKit blocks
     * `window.open` after an awaited fetch as a matter of course, and a link
     * opened with `noopener` returns `null` whether it was blocked or not — so
     * an auto-open would be a silent no-op on every iPhone, with a buyer
     * pressing a control that appears to do nothing. The change lands on the
     * press and never under the cursor.
     */
    const armValve = (control: HTMLButtonElement, destination: () => string | undefined): void => {
        control.addEventListener('click', () => {
            const url = destination();
            if (url === undefined) {
                return;
            }
            if (!usesRate || rate === undefined || Date.now() - rate.atMs <= PAY_RATE_MAX_AGE_MS) {
                // Synchronously, inside the buyer's own press — the one open a
                // browser treats as theirs. `noreferrer` on top of `noopener`;
                // the origin's `Referrer-Policy: no-referrer` header is the belt
                // behind it.
                window.open(url, '_blank', 'noopener,noreferrer');
                return;
            }
            const before = satsForQuote(price, quantity, rate.rate);
            void (async () => {
                const fresh = await handlers.onPayRate?.(PAY_RATE_TIMEOUT_MS);
                rate = fresh;
                const after = satsForQuote(price, quantity, fresh?.rate);
                outcome =
                    fresh === undefined || after === undefined
                        ? 'unavailable'
                        : movedPastTolerance(before, after, price.tolerancePct)
                          ? 'moved'
                          : 'refreshed';
                refresh();
            })();
        });
    };
    armValve(web, () => webUrl);
    armValve(app, () => appUrl);

    refreshRate.addEventListener('click', () => {
        void (async () => {
            rate = await handlers.onPayRate?.(PAY_RATE_TIMEOUT_MS);
            outcome = rate === undefined ? 'unavailable' : 'refreshed';
            refresh();
        })();
    });

    refresh();
    return wrap;
}

/** happy-dom ships no `matchMedia`, and the honest fallback is the closed one. */
function payQrFoldOpens(): boolean {
    const mq = (window as { matchMedia?: (query: string) => { matches: boolean } })
        .matchMedia;
    if (typeof mq !== 'function') {
        return false;
    }
    try {
        return mq.call(window, PAY_QR_OPEN_QUERY).matches === true;
    } catch {
        return false;
    }
}

/**
 * Did the figure move by more than the seller's stated margin? The app's own
 * default stands in when they stated none — and the sheet says that in words
 * rather than printing this number as theirs.
 */
function movedPastTolerance(
    before: bigint | undefined,
    after: bigint,
    tolerancePct: number | undefined,
): boolean {
    if (before === undefined || before <= 0n) {
        return true;
    }
    const pct = BigInt(tolerancePct ?? PAY_VALVE_DEFAULT_PCT);
    const drift = after > before ? after - before : before - after;
    return drift * 100n > before * pct;
}

/** The pay sheet's foot: one way out, and no record to go looking for. */
function payFoot(handlers: StallHandlers): HTMLElement {
    const foot = el('div', 'sheet-foot');
    const close = el('button', 'mini another', copy.PUBLISH_CLOSE);
    close.type = 'button';
    close.setAttribute('data-role', 'pay-close');
    close.setAttribute('data-focus-key', 'pay-close');
    if (handlers.onClosePublish !== undefined) {
        close.addEventListener('click', handlers.onClosePublish);
    }
    foot.append(close);
    return foot;
}

/**
 * The head both sheets wear: the title, what the record is, and a close the
 * seller can reach without scrolling. In flow, never positioned — an
 * absolutely placed control would land in the probe's decoration sweep for
 * nothing.
 */
function sheetHead(title: string, sub: string, handlers: StallHandlers): HTMLElement {
    const head = el('div', 'sheet-head');
    const words = el('div', 'sheet-head-t');
    words.append(el('div', 'item-n', title));
    words.append(el('p', 'fine', sub));
    head.append(words);
    if (handlers.onClosePublish !== undefined) {
        const x = el('button', 'mini another sheet-x', copy.PUBLISH_X);
        x.type = 'button';
        x.setAttribute('data-role', 'publish-close-top');
        x.setAttribute('data-focus-key', 'publish-close-top');
        x.setAttribute('aria-label', copy.PUBLISH_CLOSE);
        x.addEventListener('click', handlers.onClosePublish);
        head.append(x);
    }
    return head;
}

/**
 * The foot both sheets wear: the ask-outright control beside the quiet close.
 *
 * Signing happens in another app. The socket watches the stall address, so a
 * record published from that wallet does re-read on its own — but only while
 * this page still has a connection, and only if the wallet that signed it is
 * this stall's. Neither is ours to promise, which is why the copy above states
 * them as conditions and this control exists to ask outright. It runs a full
 * refresh, so the sheet closes and the answer is the stall itself.
 */
function sheetFoot(handlers: StallHandlers): HTMLElement {
    const foot = el('div', 'sheet-foot');
    const check = el('button', 'mini', copy.PUBLISH_CHECK_NOW);
    check.type = 'button';
    check.setAttribute('data-role', 'publish-check');
    check.setAttribute('data-focus-key', 'publish-check');
    check.addEventListener('click', () => {
        handlers.onRetry();
    });
    foot.append(check);

    const close = el('button', 'mini another', copy.PUBLISH_CLOSE);
    close.type = 'button';
    close.setAttribute('data-role', 'publish-close');
    close.setAttribute('data-focus-key', 'publish-close');
    if (handlers.onClosePublish !== undefined) {
        close.addEventListener('click', handlers.onClosePublish);
    }
    foot.append(close);
    return foot;
}

/**
 * Whether this view actually puts a sheet in the DOM.
 *
 * **One predicate, two callers.** `renderStall` mounts a sheet only for a
 * resolved stall with an address (and, for the poster, a link short enough to
 * scan), and `livePaint` holds an unsolicited paint back while a sheet is
 * open — so an overlay kind the render gate refuses but the paint gate honours
 * is a stall that silently stops updating, with nothing on screen to say why.
 * That was two lists of kinds in two files, kept in step by hand.
 *
 * The broadcast branch returns early before any sheet mounts, so a stream
 * overlay never waits either.
 */
/**
 * One table, per overlay kind: whether it mounts at all, and whether an
 * unsolicited paint waits for it. The four sheets hold a half-written record
 * or a buyer's own state in the DOM, so a paint nobody asked for waits. The
 * item face mounts and never holds: nothing on it is typed, a listing's
 * figure is the chain's, and a quote face repainting costs nothing. Two
 * lists kept in step by hand is how an overlay that mounts nothing stops a
 * stall updating for good — so both predicates read this one table.
 */
const OVERLAY_TABLE: Record<Overlay['kind'], { mounts: boolean; holds: boolean }> = {
    idle: { mounts: false, holds: false },
    item: { mounts: true, holds: false },
    'publish-name': { mounts: true, holds: true },
    describe: { mounts: true, holds: true },
    pay: { mounts: true, holds: true },
    poster: { mounts: true, holds: true },
};

function overlayAllowed(view: StallView): boolean {
    if (
        view.broadcast !== undefined &&
        view.route.kind !== 'invalid' &&
        view.route.kind !== 'home'
    ) {
        return false;
    }
    if (view.route.kind !== 'pubkey') {
        return false;
    }
    if (view.address === undefined || view.address === '') {
        return false;
    }
    if (view.overlay.kind === 'poster') {
        return fitsQr(shareUrl());
    }
    return true;
}

/** Whether the overlay on the view mounts at all — the render gate. */
export function overlayMounts(view: StallView): boolean {
    return overlayAllowed(view) && OVERLAY_TABLE[view.overlay.kind].mounts;
}

/** Whether a paint nobody asked for waits for the overlay on the view. */
export function holdsLivePaint(view: StallView): boolean {
    return overlayAllowed(view) && OVERLAY_TABLE[view.overlay.kind].holds;
}

/**
 * The sheet sits over the shop, docked to the bottom edge on a phone and
 * centred on a desktop. It is a disclosure the seller opened deliberately, so
 * covering the stall behind it is the point — but it scrolls and is never
 * taller than the screen, so it cannot strand an asked amount out of reach.
 * A click on the scrim closes it; a click inside it does not.
 */
function sheetOverlay(sheet: HTMLElement, focusKey: string, handlers: StallHandlers): HTMLElement {
    const scrim = el('div', 'sheet-scrim');
    scrim.setAttribute('data-role', 'sheet-scrim');
    scrim.append(sheet);
    const close = handlers.onClosePublish;
    if (close !== undefined) {
        scrim.addEventListener('click', (ev) => {
            if (ev.target !== scrim) {
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
    sheet.setAttribute('data-focus-key', focusKey);
    trapTab(sheet);
    queueMicrotask(() => {
        if (sheet.isConnected) {
            sheet.focus();
        }
    });
    return scrim;
}

/**
 * The stall's own record: name, tagline, announcement, look, decorations.
 *
 * One record and one fee, which is what the subtitle says — the token
 * descriptions moved to their own sheet precisely so that sentence is true.
 * No removal road here: `STL1` has no tombstone, a stall cannot unset its
 * record, and a control that cannot do what it says is worse than none.
 */
function nameSheet(view: StallView, handlers: StallHandlers): HTMLElement {
    const wrap = el('div', 'sheet');
    wrap.setAttribute('data-role', 'publish');
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.setAttribute('aria-label', copy.PUBLISH_TITLE);
    wrap.append(sheetHead(copy.PUBLISH_TITLE, copy.PUBLISH_SUB, handlers));

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

    /*
     * The look, as a segmented control rather than a menu: three shipped rows,
     * always visible, and the pressed one is the look on screen.
     *
     * A stall with no manifest is painted in the shipped default, which is also
     * the first row — so leaving the choice to a `<select>`'s first-option rule
     * happened to be right and read as nothing being chosen: a seller who never
     * touched the picker published the look they already had and saw no change.
     * `painted` is what the note below compares against, and the marker stays
     * `theme-picker` because that is what the sheet's other controls are keyed
     * against.
     */
    const painted = view.theme?.id ?? DEFAULT_THEME.id;
    let chosenTheme = painted;
    const themeGroup = sheetGroup(copy.PUBLISH_THEME_LABEL);
    themeGroup.setAttribute('data-role', 'theme-picker');
    const seg = el('div', 'seg');
    seg.setAttribute('role', 'group');
    seg.setAttribute('aria-label', copy.PUBLISH_THEME_LABEL);
    const lookButtons: HTMLButtonElement[] = [];
    const paintLooks = (): void => {
        for (const button of lookButtons) {
            button.setAttribute(
                'aria-pressed',
                button.getAttribute('data-theme-id') === String(chosenTheme) ? 'true' : 'false',
            );
        }
    };
    for (const row of SHIPPED_THEMES) {
        const button = el('button', 'seg-b', row.label);
        button.type = 'button';
        button.setAttribute('data-theme-id', String(row.id));
        button.setAttribute('data-role', `look-${row.id}`);
        button.setAttribute('data-focus-key', `look-${row.id}`);
        button.addEventListener('click', () => chooseLook(row.id));
        lookButtons.push(button);
        seg.append(button);
    }
    themeGroup.append(seg);

    /*
     * The three P5 fields, each a tagged push the reader already skips when
     * absent. The meter and the summary below are the shared 222-byte ceiling
     * made visible before anything is signed.
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

    /*
     * Tag 0x04, the seller's display-currency suggestion, has **no control
     * here**: one currency above the table (CLAUDE §8), so a suggestion has
     * nothing to suggest. It is still carried forward untouched — a republish
     * restates the whole document, and erasing a field this app merely stopped
     * editing would take it off the chain as a side effect of renaming a stall.
     * The summary names it, because a record carrying a field the line does not
     * mention is a line that under-reports what is being signed.
     * Any three lowercase letters, not only a code this build's display table
     * knows: the record's field is wider than the table, and narrowing it here
     * would drop a code somebody signed.
     */
    const carriedFiatHint =
        view.fiatHint !== undefined && /^[a-z]{3}$/.test(view.fiatHint)
            ? view.fiatHint
            : undefined;

    const meter = sheetMeter();
    const summary = el('p', 'pub', '');
    summary.setAttribute('data-role', 'publish-summary');

    const err = el('p', 'ctx', '');
    err.hidden = true;
    err.setAttribute('data-role', 'publish-invalid');
    const sameLook = el('p', 'fine', copy.PUBLISH_SAME_LOOK);
    sameLook.hidden = true;
    sameLook.setAttribute('data-role', 'publish-same-look');
    const bytes = el('p', 'fine publish-hex', '');
    bytes.setAttribute('data-role', 'publish-hex');
    const hexFold = sheetFold('publish-hex-fold', copy.RECORD_BYTES_FOLD, bytes);
    const qrBox = el('div', 'publish-qr');
    qrBox.setAttribute('data-role', 'publish-qr');
    qrBox.hidden = true;
    const qrFold = sheetFold(
        'publish-qr-fold',
        copy.SCAN_WITH_PHONE_FOLD,
        qrBox,
        'sheet-qr-fold',
    );
    const acts = el('div', 'acts');
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
    acts.append(web, app);

    // Rebuilt in place rather than by repainting: a repaint would take the
    // focus out of the field on every keystroke.
    const refresh = (): void => {
        const extras = {
            tagline: taglineInput.value === '' ? undefined : taglineInput.value,
            fiatHint: carriedFiatHint,
            announcement: announceInput.value === '' ? undefined : announceInput.value,
        };
        // The record never names an unminted row's bit — previewing one is
        // free, signing it would pin a row nothing can hold yet (§6).
        const signable = publishableFlags(chosenTheme, flags);
        const hex = encodeManifestHex(input.value, chosenTheme, signable, extras);
        const cashtab = hex === undefined ? undefined : cashtabPublishUrl(address, hex);
        const pay = hex === undefined ? undefined : payECashPublishUrl(address, hex);
        const ready = cashtab !== undefined && pay !== undefined;
        // Which field refused: the name's own rules first, then the
        // announcement's, then the tagline's and the shared ceiling — the
        // seller is told the one that bit.
        const nameAlone = encodeManifestHex(input.value, chosenTheme, signable);
        const sansAnnouncement = encodeManifestHex(input.value, chosenTheme, signable, {
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
        /*
         * The meter and the "Publishes:" line, over the record the encoder
         * just built: the size is that record's own byte length and every part
         * named is an argument of the same call — the name, the look, the
         * signable flags and the three extras. Nothing recounts anything,
         * so the line cannot describe a record nobody signed.
         */
        const parts: copy.SummaryPart[] = [];
        if (input.value !== '') {
            parts.push({ label: copy.SUMMARY_NAME, value: input.value });
        }
        const lookRow = SHIPPED_THEMES.find((row) => row.id === chosenTheme);
        parts.push({
            label: copy.SUMMARY_LOOK,
            value: lookRow?.label ?? String(chosenTheme),
        });
        if (extras.tagline !== undefined) {
            parts.push({ label: copy.SUMMARY_TAGLINE });
        }
        if (extras.announcement !== undefined) {
            parts.push({ label: copy.SUMMARY_ANNOUNCEMENT });
        }
        if (extras.fiatHint !== undefined) {
            parts.push({ label: copy.SUMMARY_FIAT_HINT, value: extras.fiatHint.toUpperCase() });
        }
        const worn = wornAttachments(chosenTheme, signable);
        if (worn.length > 0) {
            parts.push({
                label: copy.SUMMARY_DECOR,
                value: worn.map((row) => row.label).join(' + '),
            });
        }
        summary.hidden = hex === undefined;
        summary.textContent =
            hex === undefined ? '' : copy.summaryLine(parts, hex.length / 2, OP_RETURN_BUDGET);
        meter.set(hex === undefined ? 0 : hex.length / 2, OP_RETURN_BUDGET);
        // Say when the record will not change the look. Publishing the look
        // already on screen is a legitimate thing to do — it is how a name gets
        // set — but a seller who does it unaware reads the unchanged stall as
        // the publish having failed.
        sameLook.hidden = chosenTheme !== painted;
        bytes.textContent = ready ? hex! : '';
        bytes.hidden = !ready;
        hexFold.hidden = !ready;
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

    const reportPreview = (themeId: number, chosenFlags: number): void => {
        const recordTheme = view.theme?.id ?? DEFAULT_THEME.id;
        const recordFlags = view.attachmentFlags ?? 0;
        handlers.onPreviewLook?.(
            themeId === recordTheme && chosenFlags === recordFlags
                ? undefined
                : { themeId, attachmentFlags: chosenFlags },
        );
    };
    function chooseLook(themeId: number): void {
        chosenTheme = themeId;
        paintLooks();
        // Paint the chosen look on the seller's own stall straight away and
        // remember it in view state: the DOM patch keeps the picker's focus
        // (a repaint would rebuild this sheet), and the remembered preview is
        // what every LATER paint applies — so walking to the Shop tab shows
        // the candidate storefront instead of snapping back. No record is
        // signed here; a reload still brings back whatever the chain says.
        //
        // Flags do not travel across a look. Bit N means row N of *this*
        // theme's table, so carrying them over would hand the seller a
        // decoration they never chose — which is the thing "holding is not
        // consent" exists to prevent, arriving through the front door.
        flags = 0;
        renderDecor(themeId);
        previewLook(seg, themeId, flags);
        reportPreview(themeId, flags);
        refresh();
    }
    form.addEventListener('submit', (event) => event.preventDefault());
    /*
     * Decoration, chips grouped per place rather than one control per row.
     * Exclusive within a place — pressing one turns its neighbours off, and
     * pressing the pressed one takes the place back to bare — which makes two
     * bits in one slot unrepresentable, a better answer than resolving them
     * quietly after the record is signed.
     *
     * Every row of the painted look is offered, held or not: looking is free
     * (§6/§7), and `heldTokens` is **absent** whenever the holdings read has
     * not answered — a chip list built from an absent set would tell a seller
     * they own nothing. What holding decides is what actually paints, and the
     * note under the chips says which of the three states this choice is in.
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
        const sayNote = (): void => {
            decorNote.textContent = describeChoice(themeId);
            decorNote.hidden = decorNote.textContent === '';
        };
        for (const slot of [...new Set(rows.map((r) => r.slot))]) {
            const place = sheetGroup(`${copy.DECOR_LABEL} · ${slot}`);
            place.classList.add('decor-place');
            // The place is the marker, one per slot the look ships; the chips
            // inside carry the bit. Nothing at runtime reads `theme-picker`
            // off a decoration group — the look's group keeps that name for
            // the tests keyed to it, and this one is named for what it is.
            place.setAttribute('data-role', `decor-${slot}`);
            const chips = el('div', 'dec');
            chips.setAttribute('role', 'group');
            chips.setAttribute('aria-label', `${copy.DECOR_LABEL} — ${slot}`);
            const here = rows.filter((r) => r.slot === slot);
            const paintChips = (): void => {
                for (const chip of chips.querySelectorAll('[data-bit]')) {
                    const bit = Number(chip.getAttribute('data-bit'));
                    chip.setAttribute(
                        'aria-pressed',
                        (flags & (1 << bit)) !== 0 ? 'true' : 'false',
                    );
                }
            };
            for (const row of here) {
                const chip = el('button', 'dec-chip', row.label);
                chip.type = 'button';
                chip.setAttribute('data-bit', String(row.bit));
                chip.setAttribute('data-role', `decor-${slot}-${row.bit}`);
                chip.setAttribute('data-focus-key', `decor-${slot}-${row.bit}`);
                chip.setAttribute('aria-pressed', (flags & (1 << row.bit)) !== 0 ? 'true' : 'false');
                chip.addEventListener('click', () => {
                    const wasOn = (flags & (1 << row.bit)) !== 0;
                    // One occupant per place, enforced where the choice is
                    // made: every other bit here goes off before this one on.
                    for (const other of here) {
                        flags &= ~(1 << other.bit);
                    }
                    if (!wasOn) {
                        flags |= 1 << row.bit;
                    }
                    paintChips();
                    previewLook(chips, themeId, flags);
                    reportPreview(themeId, flags);
                    sayNote();
                    refresh();
                });
                chips.append(chip);
            }
            place.append(chips);
            decorWrap.append(place);
        }
        sayNote();
        decorWrap.append(decorNote);
        if (copy.FITTINGS_STALL !== undefined) {
            const shop = el('a', 'mini another', copy.DECOR_SHOP);
            shop.setAttribute('data-role', 'decor-shop');
            shop.href = stallPath(copy.FITTINGS_STALL);
            decorWrap.append(shop);
        }
    };

    renderDecor(painted);
    paintLooks();
    // Name, tagline, the "Publishes:" line and the sentence that refused a
    // field stand before the sign controls, and nothing else does. The look,
    // the announcement, the decorations, the meter, the bytes and the phone
    // QR fold under "More": the record carries them, a seller renaming a
    // stall does not read them. The pay.e.cash road never folds.
    form.append(label, taglineLabel, summary, err, sameLook);
    wrap.append(form);
    wrap.append(acts);
    const more = el('div', 'sheet-more');
    more.append(el('p', 'fine', copy.PUBLISH_LEDE));
    more.append(themeGroup, announceLabel, decorWrap, meter.wrap);
    more.append(el('p', 'fine', copy.PUBLISH_MUST_SIGN));
    more.append(el('p', 'fine', copy.PUBLISH_WALLET_SHOWS_HEX));
    more.append(hexFold, qrFold);
    wrap.append(sheetFold('publish-more', copy.SHEET_MORE, more));
    wrap.append(el('p', 'fine', copy.PUBLISH_AFTER_SIGNING));
    wrap.append(sheetFoot(handlers));
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
    const card = el('div', 'item');
    // One-shot: set only by a message-triggered re-read with proven book
    // movement, and cleared by this very paint's caller — see StallView.
    if (view.justChanged?.has(listing.tokenId) === true) {
        card.classList.add('just-changed');
    }
    const name = tokenName(view.tokens, offer.tokenId);

    const head = el('button', 'item-head');
    head.type = 'button';
    head.setAttribute('aria-haspopup', 'true');
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
    // Which rail this row is on. The ticker and the stock moved to the face,
    // where the fold has room to say what each means.
    const rail = el('span', 'item-q rail-label', copy.ROW_LABEL_AGORA);
    rail.setAttribute('data-role', 'rail-label');
    info.append(rail);
    head.append(info);
    // A touch device gets no cursor and no hover, so nothing said these rows
    // open. `aria-expanded` already told a screen reader; this tells a thumb.
    // The design's own fourth column — a named grid area now, so it can sit
    // at the row's right edge instead of dangling under the name.
    const caret = el('span', 'item-caret');
    caret.setAttribute('aria-hidden', 'true');
    const price = el('span', 'item-p');
    if (isUnbuyable(offer)) {
        // The price we hold is for a take the covenant will refuse. Printing
        // it would advertise a purchase that cannot happen.
        price.append(el('span', 'dash', copy.DASHED_PRICE));
        price.append(el('span', 'item-u', copy.UNBUYABLE_BADGE));
    } else {
        const amount = el('span', 'item-a');
        const hasFrom = offer.askedAtoms < offer.atoms;
        if (hasFrom) {
            amount.append(el('span', 'item-from', copy.PRICE_FROM));
        }
        const figure = formatXec(offer.askedSats);
        // The figure's dress for the width it has — set on the head, which
        // owns the grid the tier rules re-cut, per the look actually being
        // painted (a try-on included). Desktop never reads it.
        const tier = priceTier(figure, hasFrom, tierCharCeilings(paintedThemeId(view)));
        if (tier > 0) {
            head.setAttribute('data-price-tier', String(tier));
        }
        const asked = el('span', 'item-x', figure);
        asked.setAttribute('data-role', 'price');
        amount.append(asked);
        // The unit rides the amount's own baseline row — "from 1,200 XEC"
        // is one line in every design; a block unit under the number was
        // what stretched every card on every look.
        amount.append(el('span', 'item-u', copy.XEC));
        price.append(amount);
    }
    // Fiat sits beside the rate, at rate size, in its own node — never inside
    // `[data-role="price"]`. It is supplementary: the covenant encodes
    // `askedSats`, and a figure large enough to be comfortable is a second
    // price. Absent whenever the feed did not answer.
    // The rate, the fiat glance and "lowest of N" live on the face, where the
    // fold explains them: a row is icon, name, rail label, from and figure.
    head.append(price);
    head.append(caret);
    head.addEventListener('click', () => {
        handlers.onOpenItem(listing.tokenId, 'listings');
    });
    card.append(head);
    const pointer = payPointer(listing.tokenId, view, handlers);
    if (pointer !== null) {
        card.append(pointer);
    }
    return card;
}

/**
 * Which dress the asked figure wears for the width it has, on a phone. The
 * price column is an `auto` track, so it grows to the figure — which cannot
 * wrap (§8: the number the covenant encodes, whole) — and the name column
 * is the one that pays. Tiers 1–2 step the type down; each look states its
 * own tier sizes in its own sheet, at its own scale. Tier 3 concedes that
 * no legible size fits and gives the tag a row of its own (`--s-areas-m3`).
 * The supplementary lines never join this arithmetic: rate, fiat and lots
 * carry a `max-width` in stall.css and wrap, because a glance-line two rows
 * tall is fine and a name two letters wide is not.
 *
 * Character count, not measurement — render never reads layout. The
 * ceilings are per look (`tierCharCeilings`, data beside the theme table:
 * Rural's tag chrome seats one character fewer), and the probe's
 * name-floor rule is what holds them true on every shipped look; `from`
 * rides the figure's own line, so it counts as two characters. Desktop has
 * the width and none of the rules read the attribute there.
 */
export function priceTier(
    figure: string,
    hasFrom: boolean,
    ceilings: readonly [number, number, number],
): 0 | 1 | 2 | 3 {
    const chars = figure.length + (hasFrom ? 2 : 0);
    if (chars <= ceilings[0]) return 0;
    if (chars <= ceilings[1]) return 1;
    if (chars <= ceilings[2]) return 2;
    return 3;
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
/**
 * One token's face, on one rail — the expander raised to a surface of its
 * own, in-flow under the sign where the rows were. A listing's face is name,
 * `from` and the figure, stock, one control to the token page, and the two
 * handoff sentences (two different truths, decided once); the rate, the fiat
 * glance, "lowest of N", the covenant rows, the token's facts and words fold
 * under "How this works". A quote's face is the seller's words as title, the
 * genesis name under it, the borrowed-id warning, the figure in the unit they
 * wrote, Pay, and one sentence — the mechanism folds. Neither composes a
 * BIP21: the pay sheet is where money is composed. The face never holds the
 * live paint (see `OVERLAY_TABLE`): a listing's figure is the chain's.
 */
function itemFace(
    view: StallView,
    tokenId: string,
    rail: 'listings' | 'quotes',
    handlers: StallHandlers,
): HTMLElement | null {
    const panel = el('div', 'item-face');
    panel.setAttribute('data-role', 'item-face');
    const back = el('button', 'item-back', rail === 'quotes' ? copy.ITEM_BACK_QUOTES : copy.ITEM_BACK_LISTINGS);
    back.type = 'button';
    back.setAttribute('data-role', 'item-back');
    back.setAttribute('data-focus-key', 'item-back');
    back.addEventListener('click', () => handlers.onCloseSheet());
    panel.append(back);
    const card = el('div', 'card face');
    panel.append(card);
    const how = el('div');

    if (rail === 'quotes') {
        const item = quotedItems(view).find((row) => row.tokenId === tokenId);
        if (item === undefined) {
            return null;
        }
        const named = quoteNaming(view, tokenId);
        const minted = view.genesis?.get(tokenId);
        const headRow = el('div', 'face-h');
        headRow.append(itemIcon(tokenId, named.title, 'item-ic-lg', ICON_HERO_SIZE, minted !== 'not-attributed'));
        const names = el('div');
        names.append(el('div', 'face-nm', named.title));
        if (named.tokenName !== undefined) {
            const under = el('div', 'pay-sub', named.tokenName);
            under.setAttribute('data-role', 'quote-token-name');
            names.append(under);
        }
        if (named.note !== undefined) {
            const note = el('div', 'pay-sub', named.note);
            note.setAttribute('data-role', 'quote-no-words');
            names.append(note);
        }
        if (minted === 'not-attributed') {
            const borrowed = el('div', 'pay-sub warn', copy.QUOTE_NOT_MINTED_HERE);
            borrowed.setAttribute('data-role', 'quote-not-minted');
            names.append(borrowed);
        }
        headRow.append(names);
        card.append(headRow);
        const figure = el('div', 'face-x');
        const q = el('span', 'x pay-q', quoteFigure(item.price));
        q.setAttribute('data-role', 'seller-price');
        figure.append(q);
        card.append(figure);
        const open = el('button', 'buy pay-btn', copy.PAY_OPEN);
        open.type = 'button';
        open.setAttribute('data-role', 'pay-open');
        open.setAttribute('data-focus-key', `pay-open:${tokenId}`);
        const onOpenPay = handlers.onOpenPay;
        if (onOpenPay !== undefined) {
            open.addEventListener('click', () => onOpenPay(tokenId));
        }
        card.append(open);
        card.append(el('p', 'fine', copy.QUOTE_PAID_DIRECT));
        how.append(el('p', 'fine', copy.PAY_NOTE_DIRECT));
        const tolerance = toleranceLine(item.price);
        if (tolerance !== null) {
            how.append(tolerance);
        }
        const age = quoteAgeNode(view, tokenId, 'p', 'fine');
        if (age !== null) {
            how.append(age);
        }
        if (minted === 'attributed') {
            const here = el('p', 'fine', copy.QUOTE_MINTED_HERE);
            here.setAttribute('data-role', 'quote-minted');
            how.append(here);
        }
        card.append(sheetFold('item-how', copy.PAY_HOW_FOLD, how));
        if (offersOf(view).some((offer) => offer.tokenId === tokenId)) {
            const across = el('button', 'pay-pointer', copy.LISTED_POINTER);
            across.type = 'button';
            across.setAttribute('data-role', 'listed-pointer');
            across.addEventListener('click', () => {
                handlers.onOpenItem(tokenId, 'listings');
            });
            panel.append(across);
        }
        return panel;
    }

    const listing = listingsInShopOrder(view).find((row) => row.tokenId === tokenId);
    if (listing === undefined) {
        return null;
    }
    const offer = cheapestOf(listing);
    const d = decimalsOf(view.tokens, offer.tokenId);
    const ticker = tokenTicker(view.tokens, offer.tokenId);
    const meta = tokenMeta(view.tokens, offer.tokenId);
    const name = tokenName(view.tokens, offer.tokenId);
    const headRow = el('div', 'face-h');
    headRow.append(itemIcon(offer.tokenId, name, 'item-ic-lg', ICON_HERO_SIZE));
    headRow.append(el('div', 'face-nm', name));
    card.append(headRow);

    const figure = el('div', 'face-x');
    if (isUnbuyable(offer)) {
        figure.append(el('span', 'dash', copy.DASHED_PRICE));
        figure.append(el('span', 'item-u', copy.UNBUYABLE_BADGE));
        card.append(figure);
        card.append(
            el(
                'div',
                'ctx',
                copy.unbuyableLine(
                    formatAtoms(offer.minAcceptedAtoms!, d),
                    formatAtoms(offer.atoms, d),
                ),
            ),
        );
        how.append(tokenFacts(offer, meta, ticker));
        const described = tokenDescription(view, offer.tokenId);
        if (described !== undefined) {
            how.append(described);
        }
        const link = tokenLink(meta);
        if (link !== undefined) {
            how.append(link);
        }
        // No link out: Cashtab will not show this row either.
        how.append(el('p', 'fine', copy.HANDOFF_FINE_PRINT));
        card.append(sheetFold('item-how', copy.PAY_HOW_FOLD, how));
        return panel;
    }
    if (offer.askedAtoms < offer.atoms) {
        figure.append(el('span', 'item-from from', copy.PRICE_FROM));
    }
    const asked = el('span', 'x item-x', formatXec(offer.askedSats));
    asked.setAttribute('data-role', 'price');
    figure.append(asked);
    figure.append(el('span', 'item-u', copy.XEC));
    card.append(figure);
    // The stock, summed across every listing of this token: each addend is a
    // UTXO's own remaining atoms, so the sum is chain truth. Omitted, not
    // guessed, when the genesis decimals never arrived.
    const known = knownDecimals(view.tokens, offer.tokenId);
    if (known !== undefined) {
        const totalAtoms = listing.offers.reduce((sum, o) => sum + o.atoms, 0n);
        const stock = el('div', 'face-stock', copy.remainingAtoms(formatAtoms(totalAtoms, known)));
        stock.setAttribute('data-role', 'item-stock');
        card.append(stock);
    }
    const href = cashtabTokenUrl(offer.tokenId);
    if (href !== undefined) {
        const cta = el('a', 'buy', copy.OPEN_IN_CASHTAB);
        cta.href = href;
        cta.target = '_blank';
        // No opener: Stall has no reason to reach into that tab, and leaving
        // the handle would let it reach back into this one.
        cta.rel = 'noopener noreferrer';
        card.append(cta);
    }
    // The two most load-bearing sentences on the buyer's path, and an
    // explanation, not an error: `.note`, never the danger colour.
    card.append(el('div', 'note', copy.HANDOFF_MAY_PRESELECT));
    card.append(el('div', 'note', copy.HANDOFF_PRICE_IS_NOT_THE_ROW));

    how.append(rateLine(offer, view));
    const fiat = formatFiat(offer.askedSats, view.fiatRate, view.fiatCode ?? '');
    if (fiat !== undefined) {
        const fiatLine = el('span', 'item-fiat', fiat);
        fiatLine.setAttribute('data-role', 'fiat');
        how.append(fiatLine);
    }
    if (listing.offers.length > 1) {
        how.append(el('span', 'item-lots', copy.lowestOfListings(listing.offers.length)));
    }
    const minAtoms = formatAtoms(offer.askedAtoms, d);
    how.append(sheetRow(copy.MIN_PURCHASE, ticker !== undefined ? `${minAtoms} ${ticker}` : minAtoms));
    how.append(sheetRow(copy.YOU_PAY, copy.payAmount(formatXec(offer.askedSats)), true));
    how.append(sheetRow(copy.THIS_STALLS_STOCK, copy.remainingAtoms(formatAtoms(offer.atoms, d))));
    if (listing.offers.length > 1) {
        how.append(listingsBlock(listing, view));
    }
    how.append(tokenFacts(offer, meta, ticker));
    const described = tokenDescription(view, offer.tokenId);
    if (described !== undefined) {
        how.append(described);
    }
    const link = tokenLink(meta);
    if (link !== undefined) {
        how.append(link);
    }
    how.append(el('p', 'fine', copy.HANDOFF_FINE_PRINT));
    card.append(sheetFold('item-how', copy.PAY_HOW_FOLD, how));
    const pointer = payPointer(tokenId, view, handlers);
    if (pointer !== null) {
        panel.append(pointer);
    }
    return panel;
}

/** The face for the overlay on the view, or null when it names nothing on that rail. */
function facePanel(view: StallView, handlers: StallHandlers): HTMLElement | null {
    if (view.overlay.kind !== 'item' || !overlayMounts(view)) {
        return null;
    }
    return itemFace(view, view.overlay.tokenId, view.overlay.rail, handlers);
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

/**
 * `summary` is in the list because both sheets now fold the hex and the QR:
 * a `<summary>` is natively focusable, so a trap that did not count one let
 * Tab walk out of the dialog at the fold — the exact promise `aria-modal`
 * makes and the reason `trapTab` exists.
 */
const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

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
        if (row.slot === 'crest') {
            // Under the seller's own name — the signature stroke's home.
            const name = stall.querySelector('.stall-name-row') ?? stall.querySelector('.stall-name');
            name?.after(node);
            continue;
        }
        if (row.slot === 'badge') {
            // In flow INSIDE the headings column, under the chip — never a
            // sibling of the name row: a 50px badge beside the name wrapped
            // it at 390px. A real box the guard measures, jewellery rather
            // than a control.
            (stall.querySelector('.stall-headings') ?? stall.querySelector('.stall-sign'))?.append(
                node,
            );
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
            if (head === null) {
                stall.append(node);
            } else if (row.cls === 'att-beetle') {
                // The beetle's rail is a stage under the sign.
                head.after(node);
            } else {
                // A yard that is all floor (the grid horizon) belongs ABOVE
                // the sign: between the sign and the goods it read as a
                // divider band costing ~75px against the design's zero.
                head.before(node);
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
    // A `<nav>` of buttons with `aria-current`, deliberately NOT
    // `role="tablist"`: these switch full panels, not in-page tabpanels,
    // and the half of the tab pattern this bar used to claim (`tablist` +
    // `tab` + `aria-selected`, with no `tabpanel`, no `aria-controls`, no
    // arrow keys) promises a screen reader keyboard behaviour that was
    // never there — worse than plain buttons that say where you are.
    const bar = el('nav', 'tabs');
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
        if (active === tab.key) {
            btn.setAttribute('aria-current', 'page');
        }
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
 *
 * Two titled sections — the record, then the share tools — wearing the shop's
 * own `.section-head` chrome so each look's section voice applies, but their
 * own data-role: `sectionHead` stamps `section-<category>`, and a studio head
 * answering a shop-category query would poison any test that walks them.
 * The browser preference trails with no heading of its own: one toggle is not
 * a section (the "single drawer" rule on `.section-head`'s own comment), and
 * it comes last because it is a preference of this browser, not a seller tool.
 */
/** One studio card: a head row with the title and one control, then rows. */
function studioCard(role: string, title: string): { card: HTMLElement; head: HTMLElement } {
    const card = el('section', 'card scard');
    card.setAttribute('data-role', `studio-card-${role}`);
    const head = el('div', 'scard-h');
    head.append(el('h2', 'scard-t', title));
    card.append(head);
    return { card, head };
}

/** A label and a value on one line of a studio card. */
function kvRow(label: string, value: string, role?: string): HTMLElement {
    const row = el('div', 'kv');
    if (role !== undefined) {
        row.setAttribute('data-role', role);
    }
    row.append(el('span', undefined, label), el('span', undefined, value));
    return row;
}

/**
 * The studio: three cards and a preference. Name & look reads the stall
 * record back and carries the one control that changes it; Items & prices
 * lists the describe sheet's own set, one row per token with the two things
 * a seller does to one (a withheld token keeps its row and loses only the
 * price control, the sheet's own refusal); Share holds the link, the code,
 * the poster and the stream overlay's recipe under a fold. The browser
 * preference trails: it is this browser's, not the stall's. No count is
 * printed anywhere on it — a failed book leaves the items card listing what
 * the records still name, and a number would be a claim about the seller.
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
    const body = el('main', 'stall-body studio');
    // The honest qualifier the dock label cannot carry.
    body.append(el('p', 'fine studio-lede', copy.STUDIO_LEDE));
    /*
     * Both launchers are gated on the address, and on nothing else:
     * `overlayMounts` refuses an overlay with no address, so a control offered
     * without one would set a state that paints nothing and holds `livePaint`
     * back forever.
     */
    const hasAddress = view.address !== undefined && view.address !== '';
    const openPublish = handlers.onOpenPublish;
    const openDescribe = handlers.onOpenDescribe;

    const name = studioCard('name', copy.STUDIO_CARD_NAME);
    if (hasAddress && openPublish !== undefined) {
        const change = el('button', 'mini', copy.STUDIO_CHANGE);
        change.type = 'button';
        change.setAttribute('data-role', 'studio-open-publish');
        change.setAttribute('data-focus-key', 'studio-open-publish');
        change.addEventListener('click', () => openPublish());
        name.head.append(change);
    }
    name.card.append(
        kvRow(view.stallName ?? copy.STUDIO_NO_NAME, view.tagline ?? copy.STUDIO_NO_TAGLINE, 'studio-name-row'),
    );
    const lookId = view.theme?.id ?? DEFAULT_THEME.id;
    name.card.append(
        kvRow(
            copy.STUDIO_LOOK_ROW,
            SHIPPED_THEMES.find((row) => row.id === lookId)?.label ?? String(lookId),
            'studio-look-row',
        ),
    );
    if (!hasAddress || (openPublish === undefined && openDescribe === undefined)) {
        name.card.append(el('p', 'fine', copy.PUBLISH_UNAVAILABLE));
    }
    body.append(name.card);

    const items = studioCard('items', copy.STUDIO_CARD_ITEMS);
    if (hasAddress && openDescribe !== undefined) {
        const open = el('button', 'mini', copy.DESC_TITLE);
        open.type = 'button';
        open.setAttribute('data-role', 'studio-open-describe');
        open.setAttribute('data-focus-key', 'studio-open-describe');
        open.addEventListener('click', () => openDescribe());
        items.head.append(open);
    }
    const ids = describableTokenIds(view);
    if (ids.length === 0) {
        items.card.append(el('p', 'fine', copy.DESC_NO_TOKENS));
    }
    for (const id of ids) {
        const row = el('div', 'trow');
        row.setAttribute('data-role', 'studio-item');
        row.setAttribute('data-token-id', id);
        const title = tokenName(view.tokens, id);
        row.append(itemIcon(id, title));
        row.append(el('div', 'nm', title));
        const acts = el('div', 'acts2');
        if (hasAddress && openDescribe !== undefined) {
            const describe = el('button', 'mini', copy.STUDIO_DESCRIBE_ROW);
            describe.type = 'button';
            describe.setAttribute('data-role', 'studio-item-describe');
            describe.setAttribute('data-focus-key', `studio-item-describe:${id}`);
            describe.addEventListener('click', () => openDescribe(id));
            acts.append(describe);
            // The describe sheet's own refusal, said where the row is: a
            // withheld token keeps its words and its shelf, and no quote.
            if (isWithheldToken(id, view.tokens.get(id))) {
                const why = el('span', 'fine', copy.DESC_QUOTE_WITHHELD);
                why.setAttribute('data-role', 'studio-item-withheld');
                acts.append(why);
            } else {
                const price = el('button', 'mini', copy.STUDIO_PRICE_ROW);
                price.type = 'button';
                price.setAttribute('data-role', 'studio-item-price');
                price.setAttribute('data-focus-key', `studio-item-price:${id}`);
                price.addEventListener('click', () => openDescribe(id));
                acts.append(price);
            }
        }
        row.append(acts);
        items.card.append(row);
    }
    body.append(items.card);

    const share = studioCard('share', copy.STUDIO_CARD_SHARE);
    share.card.append(shareControl());
    posterControl(share.card, view, handlers);
    // The stream overlay's recipe, folded: its strings live in the module
    // itself, and it never navigates or stores.
    const obs = el('div');
    paintObsGuide(obs, view, handlers);
    share.card.append(sheetFold('obs-guide-fold', OBS_GUIDE_TITLE, obs));
    body.append(share.card);

    const raw = identityOf(view);
    const onToggle = handlers.onToggleDefault;
    if (raw !== undefined && onToggle !== undefined) {
        const pref = el('div', 'pref studio-browser');
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
        pref.append(btn);
        pref.append(el('p', 'fine', copy.STUDIO_DEFAULT_HINT));
        body.append(pref);
    }
    stall.append(body);
}

/**
 * The poster: the share link made physical, for the stall that also exists as
 * a table on a street. Pure client — the QR is the same module matrix the
 * share control draws, nothing is fetched — and the print stylesheet in
 * stall.css shows the poster page alone. The QR stays black on white with its
 * quiet zone (§9); the sheet previews exactly what the printer gets.
 */
function posterControl(body: HTMLElement, view: StallView, handlers: StallHandlers): void {
    const url = shareUrl();
    // Same address gate as the publish launcher: without one the sheet
    // does not mount, and `onOpenPoster` must not set an overlay that
    // `livePaint` then waits on forever. No QR, no poster: past the
    // library's ceiling the poster would be a sheet of text, and the
    // share control already explains the long link.
    if (
        view.address === undefined ||
        view.address === '' ||
        !fitsQr(url)
    ) {
        return;
    }
    const wrap = el('div', 'poster-launch');
    wrap.append(el('p', 'fine', copy.POSTER_LEDE));
    const open = el('button', 'mini another', copy.POSTER_OPEN);
    open.type = 'button';
    open.setAttribute('data-role', 'open-poster');
    open.setAttribute('data-focus-key', 'open-poster');
    const go = handlers.onOpenPoster;
    if (go !== undefined) {
        open.addEventListener('click', () => go());
    }
    wrap.append(open);
    body.append(wrap);
}

/**
 * The look, resolved for a canvas. Everything crosses as a number or a plain
 * colour: `--s-radius` is parsed here rather than handed over as `14px`, and
 * the plate's edge is a colour or nothing, never a CSS shorthand — a canvas
 * has no cascade to fall back on when a string does not parse.
 *
 * The edge and the name's weight are keyed off the painted look's class, the
 * way `nameLines` already is. Radius follows the shipped table (14 / 0 / 8),
 * not the design cards' 24 / 0 / 12: the table is what every other corner in
 * the app is cut to.
 *
 * `--s-name-weight` is emitted but is the stall sign's weight at 30px
 * (650 / 700 / 600); the poster's name is 108px and the design cuts it at 800,
 * Rural 700. Two jobs, two numbers.
 */
function posterPaintFromStall(stall: HTMLElement, view: StallView, url: string): PosterPaint {
    const fallbackFont = FONT_STACKS[0] ?? 'sans-serif';
    const bg = stall.style.getPropertyValue('--s-bg');
    const surface = stall.style.getPropertyValue('--s-surface');
    const text = stall.style.getPropertyValue('--s-text');
    const muted = stall.style.getPropertyValue('--s-muted');
    const accent = stall.style.getPropertyValue('--s-accent');
    const accentTwo = stall.style.getPropertyValue('--s-accent-2');
    const font = stall.style.getPropertyValue('--s-font');
    const radius = Number.parseFloat(stall.style.getPropertyValue('--s-radius'));
    const signCase = stall.style.getPropertyValue('--s-sign-case').trim();
    const tagline = view.tagline !== undefined && view.tagline !== '' ? view.tagline : undefined;
    const neo = stall.classList.contains('t-neo');
    const rural = stall.classList.contains('t-rural');
    const ink = accent === '' ? '#000000' : accent;
    const quiet = muted === '' ? '#555555' : muted;
    return {
        bg: bg === '' ? '#ffffff' : bg,
        surface: surface === '' ? '#ffffff' : surface,
        text: text === '' ? '#000000' : text,
        muted: quiet,
        accent: ink,
        accent2: accentTwo === '' ? ink : accentTwo,
        border: neo ? ink : rural ? quiet : undefined,
        radius: Number.isFinite(radius) ? radius : 0,
        font: font === '' ? fallbackFont : font,
        name: displayName(view) ?? url,
        nameCase: signCase === 'uppercase' ? 'uppercase' : 'none',
        nameWeight: rural ? '700' : '800',
        tagline,
        url,
        matrix: qrMatrix(url),
        nameLines: neo ? 3 : 2,
    };
}

function posterSheet(
    view: StallView,
    url: string,
    stall: HTMLElement,
    handlers: StallHandlers,
): HTMLElement {
    const format: PosterFormat =
        view.overlay.kind === 'poster' ? view.overlay.format : 'print';
    const paint = posterPaintFromStall(stall, view, url);
    const scrim = el('div', 'sheet-scrim poster-scrim');
    scrim.setAttribute('data-role', 'poster');
    const box = el('div', 'sheet poster-box');
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', copy.POSTER_TITLE);
    box.setAttribute('data-format', format);
    box.tabIndex = -1;

    const chooser = el('div', 'poster-chooser');
    const select = el('select', 'paste-in');
    select.setAttribute('data-role', 'poster-format');
    select.setAttribute('aria-label', copy.POSTER_TITLE);
    const formats: Array<[PosterFormat, string]> = [
        ['print', copy.POSTER_FORMAT_PRINT],
        ['square', copy.POSTER_FORMAT_SQUARE],
        ['story', copy.POSTER_FORMAT_STORY],
        ['stream', copy.POSTER_FORMAT_STREAM],
    ];
    for (const [value, text] of formats) {
        const opt = el('option', undefined, text);
        opt.value = value;
        select.append(opt);
    }
    select.value = format;
    chooser.append(select);
    box.append(chooser);

    // The page itself — the print stylesheet shows exactly this subtree. Node
    // order is the printed order: rule, brand, name, tagline, QR, caption,
    // link. The rule is the one themed mark on a black-on-white sheet, and the
    // brand line says whose window this is before the name says whose stall.
    const page = el('div', 'poster-page');
    page.append(el('div', 'poster-rule'));
    page.append(el('p', 'poster-brand', copy.BROADCAST_BRAND));
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

    const png = el('div', 'poster-png');
    png.setAttribute('data-role', 'poster-png');
    const canvas = document.createElement('canvas');
    canvas.setAttribute('data-role', 'poster-canvas');
    png.append(canvas);
    png.append(el('p', 'fine', copy.POSTER_PNG_LEDE));
    const save = el('button', 'buy', copy.POSTER_SAVE);
    save.type = 'button';
    save.setAttribute('data-role', 'poster-save');
    png.append(save);
    box.append(png);

    const pngKind: PosterKind = format === 'print' ? 'square' : format;
    save.addEventListener('click', () => {
        if (save.disabled) {
            return;
        }
        save.disabled = true;
        savePng(canvas, `stall-${pngKind}.png`, () => {
            save.disabled = false;
        });
    });
    // PNG formats draw on every mount — the canvas is cheap. Print keeps
    // the page DOM and does not touch the canvas.
    if (format !== 'print') {
        drawPoster(canvas, posterSpec(format, paint));
    }
    const choose = handlers.onChoosePosterFormat;
    if (choose !== undefined) {
        select.addEventListener('change', () => {
            const value = select.value;
            if (
                value === 'print' ||
                value === 'square' ||
                value === 'story' ||
                value === 'stream'
            ) {
                choose(value);
            }
        });
    }

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
    const done = handlers.onClosePoster;
    if (done !== undefined) {
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
    }
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
 * Where the reader was in the Activity panel, per stall, for this page load.
 *
 * `renderStall` starts with `replaceChildren()`, so every unsolicited paint —
 * a stranger's dust on the script subscription is enough — used to throw a
 * reader halfway down the history straight back to the top. Module state
 * rather than view state on purpose: a scroll offset is not a fact about the
 * stall, and routing it through the app would repaint on every scroll event,
 * which is the thing this exists to survive. Keyed by identity so switching
 * stalls does not restore somebody else's place, and never persisted.
 */
let activityScroll: { key: string; top: number } | undefined;

/**
 * The activity panel: what this page watched arrive, and what a reader asked
 * the address's history for.
 *
 * **Two lists, two clocks, two caps** — mixing them is the same collapse §4
 * warns about wearing a clock. "Watching" is the live ring on the page clock,
 * capped at `MAX_STALL_EVENTS`; "History" is a walk on the chain's clock,
 * capped at `MAX_ACTIVITY_PAGES` round trips. One list holding both would
 * truncate the walk to fifty rows and date them from a clock that never saw
 * them.
 *
 * Neither list stands in for coverage it does not have: screens with no live
 * socket say "not watching" instead of showing an empty feed (an empty list
 * there would be a statement about us painted as one about the seller); a
 * known gap says activity may be missing; the caption dates from the last full
 * load, because `refresh()` empties the ring; and the history is walked only
 * when a reader asks, because it is round trips against somebody's index.
 */
function paintActivity(
    // The shell's scroll region, which is what a reader's place is measured
    // in: the panel paints into it and `historyControl` observes it.
    scroller: HTMLElement,
    view: StallView,
    handlers: StallHandlers,
): void {
    scroller.append(
        header(
            displayName(view),
            copy.ACTIVITY_SUB,
            view.address,
            view.tagline,
            signPinOf(view, handlers),
        ),
    );
    const body = el('main', 'stall-body');
    // What this panel is, said on the panel: a ring on the page clock and a
    // capped walk on the chain's, neither of which can back the word "ledger".
    const note = el('p', 'fine', copy.STUDIO_ACTIVITY_NOTE);
    note.setAttribute('data-role', 'studio-activity-note');
    body.append(note);
    const watching = view.fetch?.kind === 'offers' || view.fetch?.kind === 'empty';
    if (!watching) {
        body.append(el('p', 'note', copy.ACTIVITY_NOT_WATCHING));
        scroller.append(body);
        return;
    }
    // Said once, before the rows: this tab is public, and a panel that read
    // like the seller's own ledger would invite somebody to treat it as one.
    body.append(el('p', 'fine', copy.ACTIVITY_PUBLIC));
    body.append(watchingSection(view));
    body.append(historySection(view, handlers, scroller));
    scroller.append(body);

    const key = identityOf(view) ?? '';
    scroller.addEventListener(
        'scroll',
        () => {
            activityScroll = { key, top: scroller.scrollTop };
        },
        { passive: true },
    );
    // After the tree is built, and after it is connected: a browser does not
    // keep `scrollTop` on a detached node, so this rides a microtask the way
    // the sheets' focus hand-off does.
    const saved = activityScroll?.key === key ? activityScroll.top : 0;
    if (saved > 0) {
        queueMicrotask(() => {
            if (scroller.isConnected) {
                scroller.scrollTop = saved;
            }
        });
    }
}

/**
 * The live ring: what this page watched arrive, on this page's clock. The
 * panel is one visual strip over two sections — this one and the walk under
 * it — with no heading on either: the live line leads, the walk's own lede
 * says the clock changes, and the rows wear one treatment. Two `<ol>`s
 * because they are two lists with two clocks and two caps; one strip because
 * a reader scrolls one feed.
 */
function watchingSection(view: StallView): HTMLElement {
    const wrap = el('section', 'activity-sec');
    wrap.setAttribute('data-role', 'activity-watching');
    if (view.watchedSinceMs !== undefined) {
        // Its own class, never `:first-child`: the design's live chip must not
        // leak onto whatever paragraph happens to lead another screen's body.
        wrap.append(
            el('p', 'fine activity-lede', copy.activitySince(formatTriedAt(view.watchedSinceMs))),
        );
    }
    if ((view.activityGaps ?? 0) > 0) {
        wrap.append(el('p', 'note', copy.ACTIVITY_GAPS));
    }
    const events = view.events ?? [];
    if (events.length === 0) {
        wrap.append(el('p', 'mid-p', copy.ACTIVITY_QUIET));
        return wrap;
    }
    // An <ol>, because the feed IS an ordered list — a reader hears
    // "list, N items" instead of a run of unrelated lines.
    const list = el('ol', 'events');
    list.setAttribute('data-role', 'events');
    for (const event of events) {
        list.append(eventRow(event, view));
    }
    wrap.append(list);
    if (events.length >= MAX_STALL_EVENTS) {
        // A full ring has already dropped its oldest rows in silence.
        // The lede promises "what this page has seen arrive", and a
        // rolled ring has seen more than it shows — say so.
        wrap.append(el('p', 'fine', copy.activityCapped(MAX_STALL_EVENTS)));
    }
    return wrap;
}

/**
 * The walk: what a reader asked this address's history for.
 *
 * Every state it can be in says which it is, because they are four different
 * things and three of them are about us: a page in flight, a page that did not
 * answer, the end of the address's history, and our own page ceiling. Only the
 * third is a fact about the seller, and it is the only one worded as one.
 */
function historySection(
    view: StallView,
    handlers: StallHandlers,
    scroller: HTMLElement,
): HTMLElement {
    const wrap = el('section', 'activity-sec');
    wrap.setAttribute('data-role', 'activity-history');
    wrap.append(el('p', 'fine', copy.ACTIVITY_HISTORY_LEDE));
    const history: StallHistory = view.history ?? { rows: [], pagesRead: 0 };
    if (history.rows.length > 0) {
        const list = el('ol', 'events');
        list.setAttribute('data-role', 'history');
        for (const row of history.rows) {
            list.append(eventRow(row, view));
        }
        wrap.append(list);
        // Only where a row could carry the label: a note about decorations on
        // a list holding none is chrome explaining a case that is not there.
        if (history.rows.some((row) => row.kind === 'token-move')) {
            wrap.append(el('p', 'fine', copy.ACTIVITY_HISTORY_DECOR_NOTE));
        }
    }
    if (history.failed === true) {
        wrap.append(el('p', 'note', copy.ACTIVITY_HISTORY_FAILED));
    }
    if (history.loading === true) {
        wrap.append(el('p', 'fine', copy.ACTIVITY_HISTORY_LOADING));
    }
    if (history.done === true) {
        wrap.append(el('p', 'fine', copy.ACTIVITY_HISTORY_END));
    } else if (history.capped === true) {
        wrap.append(el('p', 'note', copy.activityHistoryCapped(MAX_ACTIVITY_PAGES)));
    } else {
        wrap.append(historyControl(history, handlers, scroller));
    }
    return wrap;
}

/**
 * The one control that reads a page, and the sentinel that also calls it.
 *
 * A control rather than an automatic walk: this is up to ten round trips
 * against somebody's chronik index, any visitor can start one, and the cost is
 * theirs to spend. It is also the keyboard path — an observer-only trigger is
 * unreachable without a pointer, which would be a paging list nobody using a
 * keyboard could page.
 *
 * The observer **only calls the same handler**, and only after a scroll that
 * followed the last paint: a repaint rebuilds this subtree, so a sentinel that
 * armed itself on mount would fire a page read for every stranger's dust that
 * landed while the panel was open.
 */
function historyControl(
    history: StallHistory,
    handlers: StallHandlers,
    scroller: HTMLElement,
): HTMLElement {
    const wrap = el('div', 'history-foot');
    const retry = history.failed === true;
    const button = el(
        'button',
        'mini',
        retry
            ? copy.ACTIVITY_HISTORY_RETRY
            : history.loading === true
              ? copy.ACTIVITY_HISTORY_LOADING
              : history.pagesRead === 0
                ? copy.ACTIVITY_HISTORY_READ
                : copy.ACTIVITY_HISTORY_MORE,
    );
    button.type = 'button';
    button.setAttribute('data-role', retry ? 'history-retry' : 'history-more');
    button.setAttribute('data-focus-key', 'history-page');
    // One page in flight. A fast reader pressing four times would otherwise
    // spend four round trips to be told the same page four times.
    button.disabled = history.loading === true;
    const ask = (): void => {
        if (history.loading === true) {
            return;
        }
        handlers.onReadHistoryPage?.();
    };
    button.addEventListener('click', ask);
    wrap.append(button);

    // In flow and empty: a sentinel the probe can measure, never a positioned
    // pseudo-element.
    const sentinel = el('div', 'history-sentinel');
    sentinel.setAttribute('data-role', 'history-sentinel');
    sentinel.setAttribute('aria-hidden', 'true');
    wrap.append(sentinel);

    if (typeof IntersectionObserver === 'function') {
        let armed = false;
        const onScroll = (): void => {
            armed = true;
        };
        scroller.addEventListener('scroll', onScroll, { passive: true });
        const observer = new IntersectionObserver(
            (entries) => {
                if (!armed || !entries.some((entry) => entry.isIntersecting)) {
                    return;
                }
                // Disarmed before the ask, so one gesture buys one page even
                // if the observer fires again before the paint lands.
                armed = false;
                ask();
            },
            { root: scroller },
        );
        observer.observe(sentinel);
    }
    return wrap;
}

/**
 * One transaction at this stall: a glance line that is data, and a fold that
 * is the record.
 *
 * The kind label says only what the classifier proves — `book` never says
 * "sold": a cancel and a fully-taken offer are the same shape on the wire.
 *
 * **The glance line carries no control, and the fold carries all of them.**
 * The txid used to be shortened text and nothing else, with a standing comment
 * saying this page links out to a market rather than to an explorer. That
 * sentence was about `action=BUY` (§2), which takes the cheapest affordable
 * offer and can quietly sell a competitor's tokens from a seller's own stall.
 * A link to the public record of *this* transaction is the opposite kind of
 * thing: a citation of a fact the row already states, on a page anyone can
 * read, that cannot transact. What the old comment was really defending is
 * kept and made stricter — a row must not grow a control the visitor did not
 * ask for, so every control lives behind the disclosure they opened.
 */
function eventRow(event: StallEvent, view: StallView): HTMLElement {
    const row = el('li', 'event');
    const fold = el('details', 'event-fold');
    fold.setAttribute('data-role', 'event-detail');
    const glance = el('summary', 'event-sum');
    const at = eventTime(event);
    if (at !== undefined) {
        glance.append(el('span', 'event-time', at.text));
    }
    glance.append(el('span', 'event-kind', eventLabel(event)));
    glance.append(el('span', 'event-txid', `${event.txid.slice(0, 10)}…`));
    // A real node, because `summary { display: grid }` drops the browser's own
    // marker and a fold with nothing saying it opens is a fold nobody opens.
    const caret = el('span', 'event-caret', '›');
    caret.setAttribute('aria-hidden', 'true');
    glance.append(caret);
    fold.append(glance);

    const body = el('div', 'event-body');
    body.setAttribute('data-role', 'event-body');
    const dl = el('dl', 'event-fields');
    // The txid takes a row of its own: 64 characters beside a label at 390px
    // is exactly the incident the probe's label rule was written for, and this
    // one is longer than the token id that caused it.
    const txidKey = el('dt', 'event-dt wide', copy.EVENT_TXID_LABEL);
    const txidValue = el('dd', 'event-dd wide');
    const full = el('code', 'event-txid-full', event.txid);
    full.setAttribute('data-role', 'event-txid-full');
    txidValue.append(full);
    txidValue.append(copyControl(event.txid, 'event-copy'));
    dl.append(txidKey, txidValue);

    if (at !== undefined) {
        const key = el('dt', 'event-dt', at.label);
        key.setAttribute('data-role', 'event-time-label');
        dl.append(key, el('dd', 'event-dd', at.text));
    }
    dl.append(el('dt', 'event-dt', copy.EVENT_KIND_LABEL));
    dl.append(el('dd', 'event-dd', eventLabel(event)));

    // Only when every output to the stall carried a figure and the stall was
    // not on the input side. Absent is absent: a zero here would be a number,
    // and a wrong one.
    if (event.sats !== undefined) {
        dl.append(el('dt', 'event-dt', copy.EVENT_AMOUNT_LABEL));
        const amount = el('dd', 'event-dd', copy.eventReceived(formatXec(event.sats)));
        amount.setAttribute('data-role', 'receipt-amount');
        dl.append(amount);
    }

    // The memo, in three parts and with no verdict between them: what the
    // payer said the money was for, what they said the quantity was, and the
    // sentence that neither is a proof of delivery. Nothing signed it and
    // nothing checks it against the amount above.
    if (event.payment !== undefined) {
        const claimed = event.payment;
        const name = view.tokens.has(claimed.tokenId)
            ? tokenName(view.tokens, claimed.tokenId)
            : claimed.tokenId;
        dl.append(el('dt', 'event-dt', copy.EVENT_PAYMENT_CLAIM_LABEL));
        const claim = el(
            'dd',
            'event-dd',
            copy.paymentClaim(
                name,
                claimed.quantity === undefined
                    ? copy.PAYMENT_QUANTITY_UNSTATED
                    : copy.paymentQuantity(claimed.quantity.toString()),
            ),
        );
        claim.setAttribute('data-role', 'payment-claim');
        dl.append(claim);
        /*
         * Where the money came from, for a seller who wants to send some of it
         * back by hand. **A citation and nothing else**: this panel is public
         * (the line at its head says so) and this app has no seller session at
         * all, so a control here is a control every visitor gets — one that
         * composed a payment to an address read off the chain would pay
         * whoever last sent this stall money. Absent, rather than empty or
         * disabled, whenever the inputs do not name exactly one address.
         */
        if (event.payerAddress !== undefined) {
            // The same shape the txid takes, and for the same measured
            // reason: an address beside a label at 390px is the wrap the
            // probe's label rule exists to refuse, so the value gets both
            // tracks and the copy sits under it.
            const fromKey = el('dt', 'event-dt wide', copy.EVENT_PAYER_LABEL);
            const fromValue = el('dd', 'event-dd wide');
            const payer = el('code', 'event-txid-full', event.payerAddress);
            payer.setAttribute('data-role', 'payer-address');
            fromValue.append(payer, copyControl(event.payerAddress, 'payer-copy'));
            dl.append(fromKey, fromValue);
        }
    }

    dl.append(el('dt', 'event-dt', copy.EVENT_STATUS_LABEL));
    const status = el('dd', 'event-dd', eventStatusLabel(event.status));
    status.setAttribute('data-role', 'event-status');
    dl.append(status);

    // Gated at 64 lowercase hex, so the burst's `UNKNOWN_TXID` stand-in — a
    // message that named no transaction — never becomes an href.
    body.append(dl);
    if (event.payment !== undefined) {
        body.append(el('p', 'fine', copy.EVENT_PAYMENT_NOT_PROOF));
        if (event.payerAddress !== undefined) {
            body.append(el('p', 'fine', copy.EVENT_PAYER_NOTE));
        }
    }
    const url = EXPLORER_TX_URL(event.txid);
    if (url !== undefined) {
        const link = el('a', 'mini another event-out', copy.EVENT_OPEN_EXPLORER);
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.setAttribute('data-role', 'event-explorer');
        body.append(link);
    }
    fold.append(body);
    row.append(fold);
    return row;
}

/** Copy one txid, with the same clipboard-then-select fallback the link uses. */
/**
 * Put one value on the clipboard, and say what happened.
 *
 * Shared by the two things a row hands over — the transaction's own id and the
 * address a payment came from — because both are the same gesture: a string
 * this page already painted, copied. Neither opens anything.
 */
function copyControl(value: string, role: string): HTMLElement {
    const btn = el('button', 'mini event-copy', copy.EVENT_COPY_TXID);
    btn.type = 'button';
    btn.setAttribute('data-role', role);
    btn.addEventListener('click', () => {
        const clipboard = navigator.clipboard;
        if (clipboard !== undefined && typeof clipboard.writeText === 'function') {
            void clipboard.writeText(value).then(
                () => {
                    btn.textContent = copy.EVENT_TXID_COPIED;
                },
                () => {
                    btn.textContent = copy.EVENT_TXID_SELECT;
                },
            );
            return;
        }
        btn.textContent = copy.EVENT_TXID_SELECT;
    });
    return btn;
}

/**
 * Which clock a row is entitled to print, and what to call it.
 *
 * The page clock when this page watched it arrive; the chain's when it did
 * not. **Never a fallback to `Date.now()`** — a walked row dated "just now"
 * would be the panel claiming to have seen something it read out of history
 * long afterwards. A row with neither clock prints no time at all.
 */
function eventTime(event: StallEvent): { label: string; text: string } | undefined {
    if (event.seenAtMs !== undefined) {
        return {
            label: copy.EVENT_TIME_PAGE_LABEL,
            text: formatTriedAt(event.seenAtMs),
        };
    }
    if (event.chainTimeS !== undefined) {
        return {
            label: copy.EVENT_TIME_CHAIN_LABEL,
            text: formatTriedAt(event.chainTimeS * 1000),
        };
    }
    return undefined;
}

function eventStatusLabel(status: EventStatus | undefined): string {
    // Absent and `unknown` are the same sentence, and it is the honest one: a
    // missing flag is this page not knowing, never a mempool sighting.
    if (status === undefined || status.kind === 'unknown') {
        return copy.EVENT_STATUS_UNKNOWN;
    }
    if (status.kind === 'finalized') {
        return status.avalanche
            ? copy.EVENT_STATUS_FINALIZED_AVALANCHE
            : copy.EVENT_STATUS_FINALIZED;
    }
    return status.height === undefined
        ? copy.EVENT_STATUS_IN_BLOCK
        : copy.eventStatusInBlock(status.height);
}

function eventLabel(event: StallEvent): string {
    switch (event.kind) {
        case 'payment':
            // Paid, never bought or sold: the chain proves money arrived at
            // the seller's address and says nothing about delivery. The
            // amount joins the line only when every output to the stall
            // carried a figure — omitted, never zero.
            return event.sats === undefined
                ? copy.EVENT_PAYMENT
                : copy.eventPayment(formatXec(event.sats));
        case 'book':
            // Only what the plugin entries proved. `consumed` covers a take
            // and a cancel alike — the wire cannot tell them apart, so the
            // row never says "sold".
            if (event.book === 'consumed') {
                return copy.EVENT_BOOK_CONSUMED;
            }
            if (event.book === 'appeared') {
                return copy.EVENT_BOOK_APPEARED;
            }
            if (event.book === 'both') {
                return copy.EVENT_BOOK_BOTH;
            }
            return copy.EVENT_BOOK;
        case 'settings':
            // `false` only where the walk actually checked. The live path
            // leaves it absent, and absent must not read as a stranger's.
            return event.signedByStall === false
                ? copy.EVENT_SETTINGS_STRANGER
                : copy.EVENT_SETTINGS;
        case 'description':
            return event.signedByStall === false
                ? copy.EVENT_DESCRIPTION_STRANGER
                : copy.EVENT_DESCRIPTION;
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
    /*
     * No currency control. One currency above the table (CLAUDE §8): the
     * glance beside a covenant is `usd` for every visitor, and a picker here
     * would let one browser read a seller's shop in a unit nothing on it was
     * written in. `FIAT_CURRENCIES` and `onChangeFiat` both stay for the day
     * that changes. Test:
     * `the-visitor-has-no-currency-control-and-the-glance-is-usd`.
     */
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

function tokenMeta(
    tokens: StallView['tokens'],
    tokenId: string,
): TokenMeta | undefined {
    return tokens.get(tokenId);
}

/**
 * A token's name, screened.
 *
 * **A genesis string is chain-supplied free text on the paint path**, exactly
 * like a stall name or a description, and for a long time it was the only one
 * `isLegibleText` never saw: a minter could put an unterminated bidi override
 * or a stack of combining marks in a token name and this app painted it beside
 * an asked amount on every surface it has.
 *
 * Name, then ticker, then the **token id** — 64 hex, which needs no screen.
 * Never `initials`: that is an icon treatment, and a two-letter title is
 * wrong where a name goes.
 */
export function tokenName(tokens: StallView['tokens'], tokenId: string): string {
    const meta = tokenMeta(tokens, tokenId);
    if (!meta) {
        return tokenId;
    }
    // Cut by code points after the screen: a genesis string has no wire cap
    // and the screen is not a length rule.
    if (isLegibleText(meta.name)) {
        return cutAtCodePoints(meta.name, TOKEN_NAME_MAX_CHARS);
    }
    if (isLegibleText(meta.ticker)) {
        return cutAtCodePoints(meta.ticker, TOKEN_NAME_MAX_CHARS);
    }
    return tokenId;
}

/**
 * Genesis ticker, screened on its own, omitted when missing, unreadable, or
 * when it would duplicate the name. Its own screen rather than a fall-through
 * from the name: a token with a clean name and a hostile ticker painted both.
 */
export function tokenTicker(tokens: StallView['tokens'], tokenId: string): string | undefined {
    const ticker = tokenMeta(tokens, tokenId)?.ticker;
    if (ticker === undefined || !isLegibleText(ticker)) {
        return undefined;
    }
    const cut = cutAtCodePoints(ticker, TOKEN_NAME_MAX_CHARS);
    // Compared in cut form: a ticker the name repeats is dropped, and a long
    // ticker reaches the same row as a long name.
    if (cut === tokenName(tokens, tokenId)) {
        return undefined;
    }
    return cut;
}

function decimalsOf(tokens: StallView['tokens'], tokenId: string): number {
    return tokenMeta(tokens, tokenId)?.decimals ?? 0;
}

/**
 * Genesis decimals, or undefined when metadata did not load. Distinct from
 * `decimalsOf`, which defaults to 0 and would throw a rate off by 10^decimals.
 */
export function knownDecimals(tokens: StallView['tokens'], tokenId: string): number | undefined {
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

const MONTHS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

/**
 * A clock time alone is a claim the stamp is from today. An activity row and
 * a cached failure both outlive midnight in a tab left open, so a stamp from
 * another day names that day.
 */
function formatTriedAt(ms: number): string {
    const d = new Date(ms);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    const time = `${hh}:${mm}:${ss}`;
    const now = new Date();
    const sameDay =
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate();
    return sameDay ? time : `${MONTHS[d.getMonth()]} ${d.getDate()}, ${time}`;
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
            document.title = copy.FIRST_STALL_HEADER;
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
        // The one road that stamps the navigation: the seller invites paint
        // on a stall reached from here and on no other (see `view.pasted`).
        handlers.onOpenStall?.(raw, true);
    });
    form.append(label, unit, slab);
    return form;
}

function shareUrl(): string {
    return `${location.origin}${location.pathname}${location.search}`;
}

/**
 * The stall's own page, with the **search dropped**.
 *
 * `shareUrl()` keeps it, so a printed link carrying `?m=` still hints at the
 * settings record when somebody shares it. A landing link must not: on a
 * `?view=broadcast&cards=quotes` URL that would compose
 * `…&cards=quotes?pay=…`, which is a link into the stream overlay rather than
 * to the page with the note on it.
 *
 * Here rather than in `src/domain` because it reads `location`, which that
 * layer has no business touching (§9's directory walls); `payLandingUrl` takes
 * the base and stays pure.
 */
export function stallBaseUrl(): string {
    return `${location.origin}${location.pathname}`;
}

function shareControl(): HTMLElement {
    const wrap = el('div', 'share');
    wrap.setAttribute('data-role', 'copy-link');
    // The link is what this page exists to produce, so it says what it is for
    // rather than sitting unlabelled at the foot.
    wrap.append(el('p', 'fine', copy.SHARE_LEDE));
    const url = shareUrl();
    const row = el('div', 'share-row');
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
    // The copy action before the code: the field and its button share a
    // wrapping row (the fallback label more than doubles the button — wrap,
    // never crush the field it tells the reader to select), and the QR comes
    // after IN THE DOM — keyboard and reader order — while the ticket's CSS
    // may seat the code first visually (owner's design, 2026-09-01).
    row.append(field, btn);
    // The ticket: the scannable pair boxed together, the lede outside it.
    const ticket = el('div', 'share-ticket');
    ticket.append(row);
    // A link too long to scan gets the copy field and a line saying why. Never
    // a code: past ~2,300 characters the library throws, and this runs inside
    // the footer of a tree `renderStall` has already emptied — so the throw
    // took the whole page down and every repaint took it down again.
    if (fitsQr(url)) {
        const qr = qrSvg(url, copy.SHARE_QR_ALT);
        qr.classList.add('share-qr');
        ticket.append(qr);
    } else {
        const note = el('p', 'fine', copy.SHARE_QR_TOO_LONG);
        note.setAttribute('data-role', 'qr-too-long');
        ticket.append(note);
    }
    wrap.append(ticket);
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
