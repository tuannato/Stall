import './window.css';
import { cashtabTokenUrl } from '../domain/cashtab';
import { formatXec, isUnbuyable } from '../domain/money';
import { parseBlockParam, payLandingUrl } from '../domain/route';
import type { StallView, WindowParams } from '../domain/state';
import { offersWithinLock, suggestedLock } from '../domain/window';
import * as copy from './copy';
import { marqueeNode } from './marquee';
import type { TokenListing } from './render';
import { glyphLabel } from './glyphs';
import {
    announcementNote,
    cheapestOf,
    header,
    itemIcon,
    listingsInShopOrder,
    qrSvg,
    quoteFigure,
    quoteNaming,
    quotedItems,
    stallBaseUrl,
    tokenName,
    unreadableQuotes,
    withheldQuotes,
} from './render';
import { ICON_HERO_SIZE, ICON_WALL_SIZE } from '../domain/icons';

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

/**
 * The code's box: what it takes where there is room, and what it will not go
 * below.
 *
 * The ceiling is a third of 1080 — the floor `every-format-keeps-the-qr-at-a-
 * third-of-the-short-side` already applies to a poster.
 *
 * The minimum is derived from the DENSEST code this screen can draw, and that
 * depends on the origin: a quote's landing link carries `stallBaseUrl()`, so
 * a pubkey route is 41 data modules in a 49 span at `stall.cash` and 45 in a
 * 53 span at `stall-cash.pages.dev`. 280px clears 5.17px a module — the only
 * density this project has watched a phone read — at 53, and 5.71 at 49. The
 * first version pinned 240 against a hardcoded 49 and would have shipped 4.53
 * on the host §9 names.
 *
 * `the-window-code-is-the-size-the-module-tests-pin` recomputes the span from
 * the real composers, so a longer origin turns it red rather than shrinking
 * the code under a wall.
 */
export const WINDOW_QR_PX = 360;
export const WINDOW_QR_MIN_PX = 280;

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

/**
 * The link a seller bookmarks on the shop's own computer.
 *
 * Every option rides the URL rather than storage, the freeze included, because
 * the whole point is that the screen is opened on a DIFFERENT machine from the
 * one the seller composed it on. A choice kept in one browser's `localStorage`
 * would be set on a laptop and absent on the computer behind the television.
 *
 * Defaults are omitted, the way `cards=quotes` is on the stream link: a link
 * that names only what was chosen is a link a person can read.
 */
export function windowLinkFor(params: WindowParams, base = stallBaseUrl()): string {
    const query = new URLSearchParams({ view: 'window' });
    if (params.show !== 'all') {
        query.set('show', params.show);
    }
    if (params.mode !== 'cycle') {
        query.set('mode', params.mode);
    }
    if (params.upto !== undefined) {
        query.set('upto', String(params.upto));
    }
    // Written only when it is off: the link names a choice and omits a
    // default, which is what keeps a shared window link readable.
    if (!params.payCode) {
        query.set('paycode', 'off');
    }
    if (params.turn !== 'none') {
        query.set('turn', params.turn);
    }
    return `${base}?${query.toString()}`;
}

/** The shop's own link: one code for a whole catalogue, in `browse`. */
function shopLink(): string {
    return stallBaseUrl();
}

/**
 * A switch that says which way it is set, in words.
 *
 * `aria-pressed` alone was the whole state, and nothing painted it: there is
 * no base rule for it in `stall.css`, and the look-scoped
 * `.t-* .mini[aria-pressed='true']` exists on two of the three looks — so on
 * the third a seller pressed this and **nothing on screen changed** (owner,
 * 2026-09-19). The freeze switch had the same hole and got away with it,
 * because turning it on reveals the height field underneath and the
 * consequence stood in for the state.
 *
 * So the state is CONTENT, not dress: one span, two words, in the button.
 * It survives every look, every mood, a decoration painted over the sheet
 * and a reader who cannot see colour — none of which a pressed tint does.
 * `aria-pressed` stays for the screen reader that already reads it.
 */
/**
 * The state of a switch, as content.
 *
 * Its own function so a caller whose state is decided elsewhere repaints the
 * words and the attribute TOGETHER. Setting `aria-pressed` alone is the
 * 2026-09-19 defect in miniature: the words then say one thing and the
 * attribute another, which is worse than the colour-only state that bug was
 * about.
 */
function paintSwitch(button: HTMLButtonElement, on: boolean): void {
    button.setAttribute('aria-pressed', String(on));
    const state = button.querySelector('.sw-switch-state');
    if (state !== null) {
        state.textContent = on ? copy.WINDOW_SWITCH_ON : copy.WINDOW_SWITCH_OFF;
    }
}

/**
 * `current` is for a switch whose truth lives outside the button.
 *
 * Without it the next press is derived from the attribute — and a control
 * that can be repainted to `false` while its owner's flag is `true` (the
 * lock over a height the parse refuses) would then read its own correction
 * as the state and never toggle back. The lock passes its own flag; the
 * paycode switch owns its state and passes nothing.
 */
function switchControl(
    label: string,
    role: string,
    on: boolean,
    onToggle: (on: boolean) => void,
    current?: () => boolean,
): HTMLButtonElement {
    const button = el('button', 'mini sw-switch') as HTMLButtonElement;
    button.type = 'button';
    button.setAttribute('data-role', role);
    /*
     * The words in their own span, so the contrast pass can sample them
     * (2026-09-20). The button's box holds the state pill, which paints its
     * own ground — the accent, when pressed — and `.mini`'s ink IS the
     * accent on two of the three looks, so sampling the button measured the
     * label's ink against the pill's background and read 1.00:1 on every
     * look and width the day this sheet first met the probe. The same shape
     * as the sign's address row on 2026-09-15: a container holding a control
     * with its own ground stops being the target, and its text becomes one.
     */
    const words = el('span', 'sw-switch-label', label);
    const state = el('span', 'sw-switch-state');
    state.setAttribute('data-role', `${role}-state`);
    button.append(words, state);
    paintSwitch(button, on);
    button.addEventListener('click', () => {
        const now =
            current === undefined ? button.getAttribute('aria-pressed') === 'true' : current();
        paintSwitch(button, !now);
        onToggle(!now);
    });
    return button;
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

/**
 * Which rail this row is on, in the row.
 *
 * Both shop rows carry one and the window's dropped it — on the surface that
 * needs it MOST. With `show=all` a wall rotates between a covenant's asked
 * amount and the seller's own quote, and this module's own docblock gives
 * "no tab to press to ask which figure is which" as the reason the two rails
 * never share a screen. Dropping the only per-row thing that answers that
 * question left a customer looking at a number with no way to know which kind
 * it is.
 */
function railLabel(words: string): HTMLElement {
    const rail = el('span', 'item-q rail-label', words);
    rail.setAttribute('data-role', 'rail-label');
    return rail;
}

/**
 * Which icon the window's tile asks the Worker for.
 *
 * `cycle` paints ONE card, at up to 460px, so it pays 512's ~315KB once;
 * `browse` paints every row into a 72–160px tile and keeps the hero's 256.
 * Sizing the wall card off the catalogue's tile is what left a 256px source
 * upscaled across a room.
 */
function tileSize(cycle: boolean): typeof ICON_WALL_SIZE | typeof ICON_HERO_SIZE {
    return cycle ? ICON_WALL_SIZE : ICON_HERO_SIZE;
}

/** A listing, as the window paints it: picture, name, the covenant's figure. */
function listingRow(listing: TokenListing, view: StallView, withCode: boolean): HTMLElement {
    const offer = cheapestOf(listing);
    const name = tokenName(view.tokens, offer.tokenId);
    const card = el('div', 'item');
    const head = el('div', 'item-head sw-row');
    // `withCode` is `cycle`, and cycle is exactly when this tile is
    // `clamp(200px, 40vh, 460px)` rather than `clamp(72px, 9vw, 140px)` —
    // one card on a television against the whole catalogue down a wall. One
    // flag decides both because they are one fact about the screen.
    head.append(itemIcon(offer.tokenId, name, undefined, tileSize(withCode)));
    const info = el('span', 'item-b');
    info.append(marqueeNode(el('span', 'item-n', name), 'name', offer.tokenId));
    info.append(railLabel(copy.ROW_LABEL_AGORA));
    head.append(info);

    const price = el('span', 'item-p');
    if (isUnbuyable(offer)) {
        // The price this page holds is for a take the covenant will refuse,
        // so it is not shown as a price — `offerRow`'s rule, and it matters
        // more here: a shop row a buyer can open to find out is one thing, a
        // number on a wall with nothing to press is another.
        price.append(el('span', 'dash', copy.DASHED_PRICE));
        price.append(el('span', 'item-u', copy.UNBUYABLE_BADGE));
    } else {
        const amount = el('span', 'item-a');
        // "from" is a claim about the figure — that it prices PART of the lot.
        // On a whole-lot offer it is simply false.
        if (offer.askedAtoms < offer.atoms) {
            amount.append(el('span', 'item-from', copy.PRICE_FROM));
        }
        const figure = el('span', 'item-x', formatXec(offer.askedSats));
        figure.setAttribute('data-role', 'price');
        amount.append(figure);
        amount.append(el('span', 'item-u', copy.XEC));
        price.append(amount);
    }
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
/**
 * `cycle` and `withCode` are two facts, not one.
 *
 * They were one argument, which was right while the code was unconditional:
 * cycle paints one card, so cycle is when a card gets its own code AND when
 * the tile is 200–460px rather than 72–160. `paycode=off` separates them —
 * the card keeps its size and loses its code — so folding them back together
 * would shrink the picture on a price board for no reason anyone could name.
 */
function quoteRow(
    item: { tokenId: string; price: Parameters<typeof quoteFigure>[0] },
    view: StallView,
    cycle: boolean,
    withCode: boolean,
): HTMLElement {
    // The words come from the descriptions map through the shop's own helper.
    // They are NOT on `QuotedItem`, which carries a token and a price — the
    // first version read a field that does not exist, TypeScript saw an
    // optional, and every quote on every wall said the seller wrote nothing.
    const named = quoteNaming(view, item.tokenId);
    const name = named.title;
    // §5's reader rule: a quote on somebody else's token borrows its id, its
    // picture and whatever it stands for, so the icon is refused and the
    // sentence is said. At 460px on a shop wall the borrowed logo is the
    // largest thing in the room.
    const minted = view.genesis?.get(item.tokenId);
    const card = el('div', 'item');
    const head = el('div', 'item-head item-head-q sw-row');
    head.append(
        itemIcon(item.tokenId, name, undefined, tileSize(cycle), minted !== 'not-attributed'),
    );
    const info = el('span', 'item-b');
    info.append(marqueeNode(el('span', 'item-n', name), 'name', item.tokenId));
    info.append(railLabel(copy.ROW_LABEL_PAY));
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
    if (named.words === undefined) {
        foot.append(el('span', 'item-foot-words fine', named.note ?? copy.QUOTE_NO_WORDS_LINE));
    } else {
        const line = el('span', 'item-foot-words', named.words);
        line.setAttribute('data-role', 'quote-words');
        foot.append(marqueeNode(line, 'words', item.tokenId));
    }
    // One of the two provenance sentences, never displaced by the words —
    // the shop's foot rule, and a buyer at a wall has no fold to open.
    // Three states, three shapes (§5). `unknown` — and an absent map, which
    // is every first paint before `fillQuotedGenesis` lands — says NOTHING:
    // the positive is only honest because silence is what "this page could
    // not tell" looks like, and a chip that vouched for a borrowed token on a
    // wall is the one direction this must not err in.
    if (minted === 'not-attributed') {
        foot.append(el('span', 'chip', copy.QUOTE_NOT_MINTED_HERE));
    } else if (minted === 'attributed') {
        foot.append(el('span', 'chip', copy.QUOTE_MINTED_CHIP));
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
    const kept: TokenListing[] = [];
    for (const listing of all) {
        // The OFFERS, not the token. Filtering by token decides whose goods
        // are on the shelf and leaves `cheapestOf` to pick across every offer
        // of a kept token — so a stranger who plants a cheap PARTIAL on
        // something the seller already sells takes the figure, while the lock
        // reports itself as holding. Measured before this was written: the
        // seller's 1,200 painted as 6.
        const within = offersWithinLock(listing.offers, params.upto);
        if (within.length > 0) {
            kept.push({ tokenId: listing.tokenId, offers: within });
            continue;
        }
        // Nothing of this token survives the height test, and that is the
        // partial-fill case as often as it is a stranger: a fill spends the
        // offer and re-creates the remainder in a later block (§3), so the
        // seller's own goods move past the lock by being bought. The
        // remembered set is what tells the two apart — and it only tells them
        // apart by TOKEN, so what is left here is the seller's item shown at
        // whatever price now stands against it.
        //
        // **The hole this leaves, stated rather than hidden:** a token that
        // was on the shelf at the lock, whose every pre-lock offer has since
        // gone, and which a stranger has planted against, shows the
        // stranger's figure. It needs both halves; a plant alone no longer
        // reaches the wall. Closing it means refusing the item outright once
        // its own offers have moved, which takes a partly-sold item off the
        // screen until the seller re-locks — a product trade, not a bug fix.
        if (view.windowLock?.has(listing.tokenId) === true) {
            kept.push(listing);
        }
    }
    return kept;
}

/**
 * Which rail is on screen right now — **the one derivation there is**.
 *
 * `all` rotates; it never merges. A covenant's asked amount beside a seller's
 * own quote is what `the-two-rails-never-paint-on-one-screen` forbids, and a
 * shop screen has no tab to press to ask which figure is which.
 *
 * Pure, and taking both halves as arguments, because the painter reads the
 * rail off the view and the driver holds it in a closure — and when those were
 * two expressions the driver stepped the cursor modulo the LISTINGS count
 * while the painter indexed the quotes. Measured: `show=quotes` on a stall
 * with one listing and three quotes showed the same card for ever. CLAUDE.md
 * §4 states this for the stream in one line — "a list derived in five places
 * is how the cursor and the card come to mean different rows" — and this
 * screen had two.
 */
export function windowRail(
    show: WindowParams['show'],
    rail: 'listings' | 'quotes',
): 'listings' | 'quotes' {
    return show === 'all' ? rail : show;
}

/** The scrolling half of the screen, for the mode that is on. */
export function renderShopWindow(view: StallView, params: WindowParams): HTMLElement {
    const scroll = el('div', 'stall-scroll sw');
    scroll.setAttribute('data-role', 'shop-window');
    scroll.setAttribute('data-show', params.show);

    /*
     * The sign, and the seller's own sentence inside it.
     *
     * A shop window's sign has width the phone's never had, and the first
     * draft left it as a name centred in 1720px of nothing. The announcement
     * (`STL1` tag 0x05) is the piece of copy on this screen a regular
     * customer would actually read twice — market days, a thank-you, "back on
     * the 10th" — so it fills the space rather than a decoration doing it.
     * Dropping it, which the first draft also did, took the most
     * shop-window-native thing this app has off the shop window.
     */
    const sign = header(view.stallName, undefined, undefined, view.tagline, undefined);
    const notice = announcementNote(view);
    if (notice !== null) {
        sign.querySelector('.stall-headings')?.append(notice);
    }
    scroll.append(sign);

    const body = el('main', 'stall-body');
    const strip = el('div', 'items sw-strip');
    const rail = windowRail(params.show, view.windowRail ?? 'listings');
    const cycle = params.mode === 'cycle';

    if (rail === 'quotes') {
        const items = quotedItems(view);
        const at = cycle ? [items[windowCursor(view, items.length)]].filter(Boolean) : items;
        for (const item of at) {
            strip.append(quoteRow(item!, view, cycle, cycle && params.payCode));
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
    // The quotes rail is read from the descriptions walk, not the book, so a
    // failed BOOK says nothing about it — §4's rule that neither side lends
    // the other its words, on a new surface.
    // The route outranks the rail: an address that never spent has no quotes
    // rail either, so the exemption below is only about the BOOK.
    const route = view.route.kind === 'pubkey' ? undefined : view.route.kind;
    const outcome =
        route !== undefined
            ? copy.windowOutcome(view.fetch?.kind, route)
            : rail === 'quotes'
              ? copy.windowQuotesOutcome({
                    failed: view.descriptionsFailed === true,
                    truncated: view.descriptionsTruncated === true,
                    answered: view.prices !== undefined,
                    rows: quotedItems(view).length,
                    hidden: withheldQuotes(view) + unreadableQuotes(view),
                })
              : // What is on the strip. Only the empty case produces a
                // sentence, so nothing else needs counting here.
                copy.windowOutcome(
                    view.fetch?.kind,
                    undefined,
                    windowListings(view, params).length,
                );
    /*
     * The lock line is the listings rail's alone. The freeze is listings-only
     * by construction — `recordIsStalls` demands the stall's own signature
     * and a 546-sat self-output, so nobody can plant a quote and a freeze
     * over that rail would be a control with nothing to do — and the sheet
     * that composes this link says so in `WINDOW_LOCK_WHY`: "Your own quotes
     * are never locked: nobody else can add one." Passing `upto` for both
     * rails printed "Showing quotes · locked at block N" on a wall in a shop,
     * contradicting the screen's own composer, with nobody standing there to
     * ask (2026-09-20).
     */
    const lockLine = rail === 'listings' ? params.upto : undefined;
    const left = el('span', 'sw-state', copy.windowState(rail, lockLine, outcome));
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

/**
 * The options, on the seller's own side of the glass.
 *
 * Every choice here is **local to this sheet** — no app state, no handler per
 * picker, nothing on the view. The options exist only to compose a URL, so the
 * sheet keeps them in its own closure and rewrites the link field on every
 * press. A seller who closes it and reopens it starts from the defaults, which
 * is correct: the link they already bookmarked is where the choice lives.
 *
 * Two ways out, and they are two different elements on purpose. "Open here" is
 * a `<button>`; "Open in a new tab" is a real `<a target="_blank">`. §8 bans an
 * anchor on the two Pay controls because an anchor carries its destination
 * where a middle-click or "copy link address" can take it, past every listener
 * — and once a rate has aged that hands a wallet a stale amount. Nothing here
 * carries an amount and nothing here goes stale, so the anchor is right, and
 * the browser's own "open in new tab" works for free.
 */
export function shopWindowSheet(
    view: StallView,
    onClose: () => void,
    tipHeight?: number,
): HTMLElement {
    let show: WindowParams['show'] = 'all';
    let mode: WindowParams['mode'] = 'cycle';
    let payCode = true;
    let turn: WindowParams['turn'] = 'none';
    let locked = false;
    let height = tipHeight === undefined ? undefined : suggestedLock(tipHeight);
    const noListings = listingsInShopOrder(view).length === 0;
    const noQuotes = quotedItems(view).length === 0;

    const sheet = el('div', 'sheet sw-sheet');
    sheet.setAttribute('data-role', 'shop-window-sheet');

    const head = el('div', 'sheet-head');
    const title = el('div', 'sheet-head-t');
    title.append(el('h2', undefined, copy.WINDOW_TITLE));
    title.append(el('p', 'fine', copy.WINDOW_LEDE));
    head.append(title);
    const x = el('button', 'mini another sheet-x', copy.PUBLISH_CLOSE);
    x.type = 'button';
    x.setAttribute('data-role', 'shop-window-close-top');
    x.addEventListener('click', onClose);
    head.append(x);
    sheet.append(head);

    const linkField = el('input', 'share-url');
    linkField.readOnly = true;
    linkField.setAttribute('data-role', 'shop-window-link');
    const openHere = el('button', 'buy', copy.WINDOW_OPEN_HERE);
    openHere.type = 'button';
    openHere.setAttribute('data-role', 'shop-window-open-here');
    const openTab = el('a', 'mini another', copy.WINDOW_OPEN_TAB);
    openTab.setAttribute('target', '_blank');
    openTab.setAttribute('rel', 'noopener noreferrer');
    openTab.setAttribute('data-role', 'shop-window-open-tab');

    const composed = (): WindowParams => ({
        show,
        mode,
        payCode,
        turn,
        ...(locked && height !== undefined ? { upto: height } : {}),
    });
    const sync = (): void => {
        const url = windowLinkFor(composed());
        linkField.value = url;
        openTab.setAttribute('href', url);
        screen.setAttribute('data-mode', mode);
        screen.setAttribute('data-show', show);
        screen.setAttribute('data-code', String(payCode));
        cap.textContent = copy.windowPreviewCaption(showWords[show], modeWords[mode], mode === 'cycle');
    };

    const picker = <T extends string>(
        label: string,
        options: ReadonlyArray<readonly [T, string, boolean?]>,
        current: () => T,
        set: (value: T) => void,
    ): HTMLElement => {
        const wrap = el('div');
        wrap.append(el('label', 'paste-label', label));
        const seg = el('div', 'seg');
        for (const [value, words, empty] of options) {
            const button = el('button', 'seg-b', words);
            button.type = 'button';
            // A rail this stall has nothing on is a blank wall for however
            // long the screen is left running, so the sheet says so where the
            // choice is made rather than letting the seller find out in the
            // shop.
            if (empty === true) {
                button.disabled = true;
                button.title = copy.WINDOW_RAIL_EMPTY;
                button.setAttribute('data-role-empty', 'true');
            }
            button.setAttribute('data-role', `window-${label.toLowerCase()}-${value}`);
            button.setAttribute('aria-pressed', String(current() === value));
            button.addEventListener('click', () => {
                set(value);
                for (const other of seg.querySelectorAll('.seg-b')) {
                    other.setAttribute('aria-pressed', 'false');
                }
                button.setAttribute('aria-pressed', 'true');
                sync();
            });
            seg.append(button);
        }
        wrap.append(seg);
        return wrap;
    };

    const form = el('form', 'paste sw-form');
    form.addEventListener('submit', (event) => event.preventDefault());
    /*
     * Four groups (round 16), each one job: what the screen shows, a
     * preview of it with the code switch, the lock, and opening it. The
     * controls and their roles are the ones the tests drive; only the
     * grouping, the preview and the copy control are new.
     */
    const group = (role: string, title: string): HTMLElement => {
        const box = el('div', 'sw-group');
        box.setAttribute('data-role', `window-group-${role}`);
        box.append(el('p', 'pub sw-gt', title));
        return box;
    };
    const shows = group('show', copy.WINDOW_GROUP_SHOW);
    shows.append(
        picker(
            copy.WINDOW_SHOW_LABEL,
            [
                ['listings', copy.WINDOW_SHOW_LISTINGS, noListings],
                ['quotes', copy.WINDOW_SHOW_QUOTES, noQuotes],
                ['all', copy.WINDOW_SHOW_ALL, noListings && noQuotes],
            ] as const,
            () => show,
            (value) => {
                show = value;
            },
        ),
    );
    shows.append(
        picker(
            copy.WINDOW_MODE_LABEL,
            [
                ['cycle', copy.WINDOW_MODE_CYCLE],
                ['browse', copy.WINDOW_MODE_BROWSE],
            ] as const,
            () => mode,
            (value) => {
                mode = value;
            },
        ),
    );
    shows.append(el('p', 'fine', copy.WINDOW_MODE_WHY));

    shows.append(
        picker(
            copy.WINDOW_TURN_LABEL,
            [
                ['none', copy.WINDOW_TURN_NONE],
                ['cw', copy.WINDOW_TURN_CW],
                ['ccw', copy.WINDOW_TURN_CCW],
            ] as const,
            () => turn,
            (value) => {
                turn = value;
            },
        ),
    );
    shows.append(el('p', 'fine', copy.WINDOW_TURN_WHY));
    form.append(shows);

    /*
     * On, because the code is what the quotes rail is for. Off makes the
     * screen a price board for a shop that takes payment at the counter —
     * a whole way of using this feature, and one press rather than a second
     * link to compose by hand.
     */
    // The preview: a schematic of the wall, never a render — one card and
    // its code in cycle, a strip of rows in browse — captioned in words so
    // the picture is not the only thing saying what was chosen.
    const preview = group('preview', copy.WINDOW_GROUP_PREVIEW);
    const screen = el('div', 'sw-preview');
    screen.setAttribute('data-role', 'window-preview');
    screen.setAttribute('aria-hidden', 'true');
    const wall = el('div', 'sw-pv-wall');
    wall.append(el('i', 'sw-pv-card'), el('i', 'sw-pv-qr'));
    screen.append(wall);
    preview.append(screen);
    const cap = el('p', 'fine sw-preview-cap');
    cap.setAttribute('data-role', 'window-preview-cap');
    preview.append(cap);
    const showWords: Record<WindowParams['show'], string> = {
        listings: copy.WINDOW_SHOW_LISTINGS,
        quotes: copy.WINDOW_SHOW_QUOTES,
        all: copy.WINDOW_SHOW_ALL,
    };
    const modeWords: Record<WindowParams['mode'], string> = {
        cycle: copy.WINDOW_MODE_CYCLE,
        browse: copy.WINDOW_MODE_BROWSE,
    };

    const codeSwitch = switchControl(
        copy.WINDOW_PAYCODE_SWITCH,
        'window-paycode-switch',
        true,
        (on) => {
            payCode = on;
            sync();
        },
    );
    preview.append(codeSwitch);
    preview.append(el('p', 'fine', copy.WINDOW_PAYCODE_WHY));
    form.append(preview);

    const lock = group('lock', copy.WINDOW_LOCK_LABEL);
    /*
     * The switch comes first, and the machinery only after it.
     *
     * A block height is a thing a seller has to go and look up, and most
     * stalls never meet the problem it solves — so the sheet does not put one
     * in front of everybody. Off is the default and off is the common answer;
     * the height field, its refusal line and the explanation all live behind
     * this one press.
     */
    const lockSwitch = switchControl(
        copy.WINDOW_LOCK_SWITCH,
        'window-lock-switch',
        false,
        (on) => showLock(on),
    );
    lock.append(lockSwitch);
    lock.append(el('p', 'fine', copy.WINDOW_LOCK_SWITCH_WHY));
    const lockRow = el('div', 'sw-lock');
    /*
     * The control that actually decides `upto`, and it is a switch like the
     * two above it (2026-09-20). It was a bare `.mini` carrying `aria-pressed`
     * and nothing else — the exact hole `1d25685` closed for the other two,
     * still open on the one that matters: `stall.css` has no base rule for
     * that attribute and only two of the three looks re-state
     * `.t-* .mini[aria-pressed='true']`, so on Neo pressing the lock changed
     * nothing on screen. Its truth is `locked && height !== undefined`, which
     * `settle` owns, so it is a CONTROLLED switch: the press asks `locked`
     * rather than the attribute it may have been corrected through.
     */
    const lockPress = switchControl(
        copy.WINDOW_LOCK_PRESS,
        'window-lock',
        false,
        (on) => {
            locked = on;
            settle();
        },
        () => locked,
    );
    const heightField = el('input', 'paste-in sw-block');
    heightField.setAttribute('inputmode', 'numeric');
    heightField.setAttribute('data-role', 'window-lock-height');
    heightField.value = height === undefined ? '' : String(height);
    const refused = el('p', 'fine', copy.WINDOW_LOCK_REFUSED);
    refused.setAttribute('data-role', 'window-lock-refused');
    refused.hidden = true;
    /**
     * A lock is on only when there is a height to lock at. Pressing it over a
     * field the parse refuses used to say `aria-pressed="true"` while the
     * link silently carried no `upto` — a control claiming to do the one
     * thing it was not doing.
     */
    const settle = (): void => {
        const typed = heightField.value.trim();
        height = parseBlockParam(typed);
        refused.hidden = typed === '' || height !== undefined;
        paintSwitch(lockPress, locked && height !== undefined);
        sync();
    };
    heightField.addEventListener('input', settle);
    lockRow.append(lockPress, heightField);
    const lockWhy = el('p', 'fine', copy.WINDOW_LOCK_WHY);
    lock.append(lockRow);
    lock.append(refused);
    lock.append(lockWhy);
    form.append(lock);
    // Hidden until the switch is on, and turning it off takes the lock with
    // it — a link must never carry an `upto` from a control the seller can no
    // longer see.
    const showLock = (on: boolean): void => {
        lockRow.hidden = !on;
        lockWhy.hidden = !on;
        if (!on) {
            refused.hidden = true;
            locked = false;
            paintSwitch(lockPress, false);
        }
        sync();
    };
    showLock(false);
    sheet.append(form);

    const open = group('open', copy.WINDOW_GROUP_OPEN);
    linkField.setAttribute('aria-label', copy.WINDOW_LINK_LABEL);
    open.append(linkField);
    open.append(el('p', 'fine', copy.WINDOW_LINK_WHY));
    openHere.addEventListener('click', () => {
        window.location.assign(windowLinkFor(composed()));
    });
    // The copy control, for the shop's own computer: the same fallback the
    // share link keeps — select the field and say so when the clipboard
    // refuses.
    const copyBtn = el('button', 'mini another');
    copyBtn.type = 'button';
    copyBtn.setAttribute('data-role', 'shop-window-copy');
    const say = glyphLabel(copyBtn, 'copy', copy.COPY_LINK);
    const fallback = (): void => {
        linkField.focus();
        linkField.select();
        say(copy.COPY_LINK_FALLBACK);
    };
    copyBtn.addEventListener('click', () => {
        const clipboard = navigator.clipboard;
        if (clipboard !== undefined && typeof clipboard.writeText === 'function') {
            void clipboard.writeText(linkField.value).then(
                () => {
                    say(copy.LINK_COPIED, 'check');
                },
                () => {
                    fallback();
                },
            );
            return;
        }
        fallback();
    });
    const acts = el('div', 'acts');
    acts.append(openHere, openTab, copyBtn);
    open.append(acts);
    sheet.append(open);

    const foot = el('div', 'sheet-foot');
    const close = el('button', 'mini another', copy.PUBLISH_CLOSE);
    close.type = 'button';
    close.setAttribute('data-role', 'shop-window-close');
    close.addEventListener('click', onClose);
    foot.append(close);
    sheet.append(foot);

    sync();
    return sheet;
}
