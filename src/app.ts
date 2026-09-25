import { encodeCashAddress } from 'ecashaddrjs';
import { isWithheldToken } from './domain/withheld';
import { fromHex, shaRmd160, toHex } from 'ecash-lib';
import {
    PAY_PARAM,
    isHomePath,
    parseBroadcastParams,
    parseWindowParams,
    parsePayParam,
    parseSellerParam,
    pathNamesStall,
    sellerFromPath,
    stallPath,
} from './domain/route';
import {
    ATTACHMENT_FLAGS_TAG,
    decodeAttachmentFlags,
    mintedAttachmentTokens,
    wornAttachments,
} from './domain/attachments';
import { DEFAULT_THEME_ID } from './domain/theme';
import { loadHeldTokens, loadHoldings } from './net/holdings';
import { fetchXecPrice } from './net/price';
import {
    DEFAULT_FIAT_CODE,
    isQuoteUnit,
    judgeQuoteRates,
    type RateCheck,
} from './domain/fiat';
import {
    MAX_SELECTION_ENTRIES,
    pruneSelection,
    selectionNeedsNoRate,
    selectionSats,
    selectionUnit,
} from './domain/selection';
import { decidedOf, mergeFailedRead, movedRecords, type RecordsNow } from './domain/records';
import {
    clearSavedStall,
    forgetSurcharge,
    isPinnedStall,
    readRememberedSurcharge,
    rememberSurcharge,
    isSavedStall,
    pinnedDoorIsFull,
    pinStall,
    readPinnedStalls,
    readSavedFiat,
    readSavedStall,
    saveFiat,
    saveStall,
    unpinStall,
    readPinnedNames,
} from './saved';
import {
    MAX_ACTIVITY_PAGES,
    MAX_STALL_EVENTS,
    type PayRateAnswer,
    type PayRateWhy,
} from './domain/state';
import type {
    SelectionAsk,
    RememberedSurcharge,
    EventStatus,
    FetchStatus,
    RouteParse,
    SessionTokenCache,
    ShopTab,
    StallEvent,
    StallHistory,
    StallOffer,
    StallView,
    WallPayment,
    WindowParams,
    TokenMeta,
    Overlay,
} from './domain/state';
import type { DecodedTheme } from './domain/theme';
import {
    agoraOfferReader,
    createChronik,
    HISTORY_PAGE_SIZE,
    loadManifest,
    hostAttempts,
    loadOffers,
    loadTokenMeta,
    resolveSeller,
    type ManifestLookup,
} from './net';
import { isNftChild } from './domain/category';
import { groupIdsToName, loadNftGroups } from './net/groups';
import { loadDescriptions, type DescriptionLookup } from './net/descriptions';
import {
    attributionFromAuthPubkey,
    type GenesisAttribution,
    rankDecision,
    type AttributionStrength,
    type GenesisDecision,
} from './domain/genesis';
import { loadGenesisAttribution, type GenesisChronik } from './net/genesis';
import { XEC_PRICE_CODE, type TokenPrice } from './domain/description';
import {
    ALL_FACTS,
    NO_FACTS,
    anyFact,
    classifyTx,
    historyEventOf,
    statusFromMessage,
    strongerStatus,
    unionFacts,
    walkableFacts,
    type EventContext,
} from './net/classify';

/**
 * Which tokens' cards a re-read actually moved: the offer **sets** differ, by
 * outpoint. Pure set comparison — a partial fill re-creates the remainder as
 * a new UTXO, so the outpoint is the honest identity of "this row changed".
 */
function changedTokens(
    prev: readonly StallOffer[],
    status: FetchStatus,
): ReadonlySet<string> {
    const next = status.kind === 'offers' ? status.offers : [];
    const keysByToken = (offers: readonly StallOffer[]): Map<string, Set<string>> => {
        const map = new Map<string, Set<string>>();
        for (const offer of offers) {
            const keys = map.get(offer.tokenId) ?? new Set();
            keys.add(`${offer.outpoint.txid}:${offer.outpoint.outIdx}`);
            map.set(offer.tokenId, keys);
        }
        return map;
    };
    const before = keysByToken(prev);
    const after = keysByToken(next);
    const out = new Set<string>();
    for (const token of new Set([...before.keys(), ...after.keys()])) {
        const a = before.get(token) ?? new Set();
        const b = after.get(token) ?? new Set();
        if (a.size !== b.size || [...a].some((key) => !b.has(key))) {
            out.add(token);
        }
    }
    return out;
}
import { p2pkhOutputScript } from './net/script';
import { payBip21 } from './domain/cashtab';
import { DUST_SATS } from './domain/money';
import {
    isDefiniteResult,
    watchStall,
    type LiveHandle,
    type LiveTxStatus,
} from './net/live';
import {
    broadcastCards,
    broadcastFigure,
    identityOf,
    quotedItems,
    unreadChosen,
    renderStall,
    recheckPaySheet,
    holdsLivePaint,
    shopWindowPaints,
    WINDOW_MIN_PX,
    broadcastRail,
    broadcastStep,
    broadcastTurns,
    tickerPages,
    tickerWrapped,
    tokenName,
    wallTouches,
} from './ui';
import {
    FIAT_GLANCE_MAX_AGE_MS,
    FIAT_GLANCE_TIMEOUT_MS,
    PAY_CHECK_TIMEOUT_MS,
    PAY_RATE_MAX_AGE_MS,
    PAY_RATE_TIMEOUT_MS,
} from './ui/render';
import { lastMarqueeRunAheadMs } from './ui/marquee';
import { fetchXecPriceCheck } from './net/priceCheck';
import { SECOND_FEED } from './net/hosts';
import { withDeadline } from './domain/deadline';
import { nextCard, tokensAtBlock } from './domain/window';
import { wallListings, windowRail, windowTurns } from './ui/window';

/**
 * Retry `refresh` while a resolved stall's fetch failed. Waiting screens
 * keep their script socket and must not have this timer tear it down.
 */
const BROADCAST_RETRY_MS = 30_000;

/**
 * How long one card stands in the shop window's `cycle`.
 *
 * Not the stream's `BROADCAST_FIXED_MS`. A stream viewer glances between
 * scenes and can scrub back; a customer in a shop notices the item, gets a
 * phone out of a pocket, unlocks it, opens a camera and aims — and if the
 * card changed halfway through, the code they are pointing at is a different
 * item's. Twenty seconds is the slowest thing on this screen on purpose.
 */
export const WINDOW_CARD_MS = 20_000;

/**
 * How often an unattended screen re-reads the chain regardless of the socket.
 *
 * The socket is the fast path and stays the fast path; this is the floor
 * underneath it. `chronik-client` sends no ping, so a half-open TCP connection
 * — a shop router rebooting, a NAT entry expiring — fires no `close` and no
 * `error`, `onReconnect` never runs, and the page shows yesterday's prices in
 * silence. Every other surface is saved by `visibilitychange` into `resume()`,
 * and a kiosk that is visible around the clock never fires it.
 *
 * A minute, because the thing it is catching is a socket that died hours ago,
 * not a price that moved a second ago — and the same read on three hosts is
 * the cost a shop's connection pays for it.
 */
export const WINDOW_BEAT_MS = 60_000;

/**
 * How long `browse` waits after somebody touches it before it scrolls itself
 * again (owner, 2026-09-18: "chỉ auto sau 1 khoảng thời gian đứng im").
 *
 * Long, because the interaction it is yielding to is a person reading. The
 * stream's dwell numbers are for somebody walking past; this one is for
 * somebody standing still and deciding.
 */
export const WINDOW_IDLE_MS = 45_000;

/** One step of the self-scroll, and the pause between steps. */
export const WINDOW_SCROLL_MS = 6_000;

/**
 * What counts as a touch, and `mousemove` deliberately does not.
 *
 * A customer walking past a counter knocks the mouse; a screen that stopped
 * scrolling every time somebody brushed the desk would be a screen that never
 * scrolls. These are all deliberate: a finger, a key, a wheel, a press.
 */
const WINDOW_TOUCHES = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
/** `mode=fixed` advances the cursor on this interval. */
export const BROADCAST_FIXED_MS = 8_000;
/**
 * After a card's cut name or words have run through, it stays this long
 * before the next card (owner, 2026-09-09): the run first, then the wait,
 * then the next item. A card with nothing running keeps the fixed dwell.
 */
export const BROADCAST_AFTER_RUN_MS = 5_000;
/** Rail mode rests this long, then lives `BROADCAST_RAIL_LIVE_MS`. */
export const BROADCAST_RAIL_REST_MS = 3_000;
export const BROADCAST_RAIL_LIVE_MS = 5_000;

/**
 * Copy the URL's own parameters onto a view — the stream overlay's, and the
 * item a scanned `?pay=` link named. Used by both `loadCurrent` and
 * `openingFromLocation`: `refresh` paints the latter first, and a first frame
 * without `view.broadcast` is the shop.
 */
function withUrlParams(state: AppState): AppState {
    // The door is not a stall. `view=broadcast` on `/` is dropped here, and so
    // is `?pay=`; `invalid` still carries the first and `renderStall` keeps the
    // ordinary screen.
    if (state.view.route.kind === 'home') {
        return state;
    }
    const broadcast = parseBroadcastParams(location.search);
    // The two screens read the same `view` param, so they can never both be
    // asked for; the parse is still guarded rather than assumed, because a
    // future third value must not silently be both. Whether this viewport is
    // a WALL is not decided here — `boot` settles that once, at paint time.
    const window = broadcast === undefined ? parseWindowParams(location.search) : undefined;
    // Neither of the unattended screens mounts a sheet, so an item named on
    // one would open nothing and say nothing. The parameter is simply not
    // carried there.
    const payHint =
        broadcast === undefined && window === undefined
            ? parsePayParam(location.search)
            : undefined;
    if (broadcast === undefined && window === undefined && payHint === undefined) {
        return state;
    }
    return {
        ...state,
        view: {
            ...state.view,
            ...(broadcast === undefined ? {} : { broadcast }),
            ...(window === undefined ? {} : { window }),
            ...(payHint === undefined ? {} : { payHint }),
        },
    };
}

/**
 * The card the overlay is showing: `broadcastCards`, then the cursor.
 *
 * The list is whichever rail the link asked for, and it is derived in that one
 * place — the renderer indexes the same function, so the cursor and the card
 * cannot mean two different rows.
 */
function shownCard(view: StallView): { kind: string; tokenId: string; figure: string } | undefined {
    const cards = broadcastCards(view);
    if (cards.length === 0) {
        return undefined;
    }
    const n = cards.length;
    const cursor = (((view.broadcastCursor ?? 0) % n) + n) % n;
    const card = cards[cursor]!;
    // The kind rides the identity (2026-09-21, `cards=all`): a token on both
    // rails is two cards, and a turn from one to the other is a step.
    return { kind: card.kind, tokenId: card.tokenId, figure: broadcastFigure(card) };
}

/**
 * The viewer's motion preference, as one list this page can listen to.
 * `boot` reads it once and again on every `change`, and writes the answer
 * onto the view at paint time (`broadcastTickerStill`) — never a fresh
 * `matchMedia` per reader, which is how the app's belief and the painted
 * ribbon came to disagree (the critic, 2026-09-22).
 */
function motionQuery(): MediaQueryList | undefined {
    return typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : undefined;
}

function isBroadcastFailure(kind: FetchStatus['kind'] | undefined): boolean {
    return kind === 'unreachable' || kind === 'plugin-missing' || kind === 'unreadable';
}

const sessionTokens = new Map<string, TokenMeta>();
const sessionNames = new Map<string, string>();
const sessionThemes = new Map<string, DecodedTheme>();
/**
 * Whose wallet minted each token, per stall, for this session.
 *
 * Beside `sessionTokens` and remembered for the same reason: a genesis is
 * permanent, so an answer about one cannot go stale. The merge is monotonic,
 * so a later read that learned nothing leaves what an earlier one decided.
 */
const sessionGenesis = new Map<string, GenesisDecision>();

/**
 * `chronik.tx()` concatenates whatever it is handed into a request path and
 * never checks it, and a txid off the socket is no more trusted than the one
 * `loadManifest` takes from the address bar. Same gate, same reason.
 */
const TXID = /^[0-9a-f]{64}$/;

/**
 * The entitlement, absent.
 *
 * `wornAttachments` skips the holdings check when it is handed `undefined` —
 * that affordance is for the picker's preview, where a seller looking at a
 * decoration has not claimed to own it. On a visitor's screen it must fail
 * closed: §7 says a flag set over a token the address does not hold paints
 * nothing, so until a holdings read has answered, nothing is worn.
 */
const NOTHING_HELD: ReadonlySet<string> = new Set();

/**
 * The two walks a failure screen is still owed.
 *
 * They ask the address history, which every chronik node serves, and the offer
 * book's failure says nothing about them — so they are started with the offer
 * read and neither is awaited before the failure paints. `boot` applies
 * whatever they answer afterwards.
 */
export type PendingFacts = {
    readonly stall: { address: string; hash: string };
    readonly pubkeyHex: string;
    readonly manifest: Promise<ManifestLookup | undefined>;
    readonly descriptions: Promise<DescriptionLookup | undefined>;
};

export type AppState = {
    view: StallView;
    offers: StallOffer[];
    pubkeyHex?: string;
    /** Present only on the screens that painted before their facts arrived. */
    pendingFacts?: PendingFacts;
    /**
     * The quoted tokens the free half of the attribution could not decide,
     * for the capped `chronik.tx` reads that run after the paint. Set by the
     * loader that read the stall, so a loader handed to `boot` for a test
     * starts no read — the same discipline `pendingFacts` keeps.
     */
    genesisPending?: { pubkeyHex: string; hash: string; tokenIds: readonly string[] };
};

export function boot(
    root: HTMLElement,
    load: () => Promise<AppState> = loadCurrent,
): void {
    /**
     * Every refresh claims a generation. A response that resolves after a newer
     * refresh started belongs to a page the visitor already left, so it is
     * dropped rather than painted. Comparing the seller instead would not catch
     * A -> B -> A.
     */
    let generation = 0;
    /** One socket per painted stall. Closed before the next one opens. */
    let live: LiveHandle | undefined;
    /**
     * Overlay timers. One carousel per painted stall; one retry for a
     * resolved stall whose fetch failed. Cleared wherever `live` is
     * closed (`refresh`).
     */
    let carousel: ReturnType<typeof setTimeout> | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;
    /**
     * The shop window's own three, cleared beside the broadcast's because a
     * timer outliving the stall it was armed for is how one screen ends up
     * driving another's cursor.
     */
    let windowCard: ReturnType<typeof setTimeout> | undefined;
    /**
     * When the Cycle card is due to turn, and it outlives the timer
     * (2026-09-24, the critic's second pass). The sixty-second heartbeat is a
     * full `refresh()`, which clears every timer here, and `syncWindow`
     * re-armed the card's from zero — so the card due when a beat landed
     * stood another `WINDOW_CARD_MS`: one card a minute stood 40 s rather
     * than the owner's 20. The stamp is kept across the clear and the timer
     * re-armed with what is left of it; it is cleared only for a new stall.
     */
    let windowCardDueAt: number | undefined;
    let windowBeat: ReturnType<typeof setTimeout> | undefined;
    let windowRoll: ReturnType<typeof setTimeout> | undefined;
    /*
     * The overlay's rail under `cards=all` (2026-09-21): explicit state,
     * written onto the view at paint time (`broadcastRail`) and turned at
     * the wrap — the shop window's `windowRailAt`, on the stream. And the
     * ticker's own two: its reduced-motion pager (a timer, where the moving
     * ribbon's wrap is the CSS animation's own iteration event), and the
     * paint it is holding until that wrap.
     */
    let broadcastRailAt: 'listings' | 'quotes' = 'listings';
    let tickerPager: ReturnType<typeof setTimeout> | undefined;
    let tickerRunning = false;
    /**
     * The hold's ceiling. `tickerRunning` is released by the ribbon's own
     * iteration event — and an animation that is cancelled (a reduce toggle
     * mid-pass, a sheet that stills it) fires `animationcancel`, never
     * another iteration, so the hold outlived the thing that releases it
     * and an idle stall's overlay froze for good (the critic's P1,
     * 2026-09-22). Two passes with no wrap is not a pass in flight: the
     * guard drops the hold and paints.
     */
    let tickerGuard: ReturnType<typeof setTimeout> | undefined;
    /** The viewer's motion preference, read from `motionQuery` at boot and on change. */
    let tickerStill = motionQuery()?.matches === true;
    /**
     * Every broadcast derivation in this closure reads the view WITH the
     * rail on it — `state.view` never carries it (it is written at paint
     * time, like `shopTab`), and a derivation over the bare state answered
     * the listings while the quotes were on screen: the ticker came back
     * from its quotes pass onto the second page instead of the first.
     */
    const withRail = (view: StallView): StallView => ({ ...view, broadcastRail: broadcastRailAt });

    const clearBroadcastTimers = (): void => {
        if (carousel !== undefined) {
            clearTimeout(carousel);
            carousel = undefined;
        }
        if (tickerPager !== undefined) {
            clearTimeout(tickerPager);
            tickerPager = undefined;
        }
        if (tickerGuard !== undefined) {
            clearTimeout(tickerGuard);
            tickerGuard = undefined;
        }
        if (retry !== undefined) {
            clearTimeout(retry);
            retry = undefined;
        }
        for (const timer of [windowCard, windowBeat, windowRoll, windowPayingTimer]) {
            if (timer !== undefined) {
                clearTimeout(timer);
            }
        }
        windowCard = undefined;
        windowBeat = undefined;
        windowRoll = undefined;
        windowPayingTimer = undefined;
    };
    /**
     * One currency above the table (CLAUDE §8). `readSavedFiat` answers `usd`
     * and clears a code an earlier build stored, so this is `usd` on every
     * load — written through the reader rather than as a literal, because the
     * clearing is the point and a literal would leave the stale key behind.
     */
    let fiatCode = readSavedFiat();
    /**
     * The glance rate. Absent until the feed answers, and absent again the
     * moment it fails — never a last-known value, because a stale rate renders
     * a two-dollar item at two cents and nobody would find out.
     *
     * **It is asked for when the line that shows it is on screen, and not
     * before** (`syncGlance`). Every read but the first one lived in two
     * places that were both removed on 2026-09-03 by one commit about which
     * currency wins — the picker, and the seller's currency hint — so from
     * that day this was read once per document load and never again, and
     * "never a last-known value" was true for one second of a tab's life.
     * The rule the pay rail already followed is the one applied here: ask
     * when a figure needs the number, never on a page that shows none.
     */
    let fiatRate: bigint | undefined;
    /**
     * When the held rate was read — `0` for never asked. Stamped on a failure
     * too, so a feed that is down is not asked again inside the window.
     */
    let fiatRateAt = 0;
    /** One glance read in flight at a time. */
    let fiatAsking = false;
    /**
     * The glance's own re-read timer. **Not** a broadcast timer: those belong
     * to one painted stall and `refresh` clears them, while a rate belongs to
     * no stall at all. This one is owned by `syncGlance`, which arms it only
     * while the line is on screen and the tab is showing.
     */
    let glanceTimer: ReturnType<typeof setTimeout> | undefined;
    /**
     * The rate the open pay sheet is composing against, and when it was read.
     *
     * **Its own field, never `fiatRate`.** That one is the glance beside a
     * covenant's asked amount and may vanish at any moment; this is frozen for
     * one buyer's visit to one sheet, because the figure they are about to
     * sign must not move under their cursor. The sheet keeps its own copy too
     * — it holds the typed quantity in a closure and cannot be repainted for a
     * rate — so this exists to seed the sheet when it opens.
     */
    let payRate: { rate: bigint; atMs: number; check?: RateCheck } | undefined;
    /** Why there is none — a feed that did not answer, or an answer refused (CLAUDE §8). */
    let payRateWhy: PayRateWhy | undefined;
    /** The feeds are being asked for the open sheet; painted as "asking", never as no answer. */
    let payRateAsking = false;
    /**
     * Which open of the pay sheet an in-flight rate read belongs to (since
     * 2026-09-09). `readPayRate` wrote the view before any guard, so a sheet
     * closed and reopened within the feeds' deadline had two reads in flight
     * over one slot: the first ask's timeout printed "did not answer" over
     * the sheet still asking — or, worse, wiped the figure and both Pay
     * controls the second ask had already painted. An answer from a session
     * that is no longer current writes nothing and paints nothing; it is
     * still handed back to its caller. The valve and the refresh control run
     * while their own sheet is on screen and take the current session by
     * default. Never bumped on close: a close with no reopen leaves nothing
     * to guard, and a fourth site to keep in step is one too many.
     */
    let paySession = 0;
    /** The buyer's quantity on the open pay sheet; reset with `payRate`. */
    let payQuantity: bigint | undefined;
    /**
     * The unit `payRate` was read for. A sheet is painted again from the
     * seller's record when a press finds it moved (`onPayRecordMoved`), and
     * a record can move to another unit: a rate read for the old one is then
     * never written onto the sheet, or it would compose a figure in one
     * currency from another's rate.
     */
    let payRateUnit: string | undefined;
    /**
     * The open pay sheet whose press found the seller's record moved
     * (`payOverlayKey`), so the paint that follows says so, and the tokens
     * whose records moved, for the line to name. Cleared when a pay sheet
     * opens or closes; a key that is not the open sheet's says nothing.
     */
    let payRecordMovedFor: string | undefined;
    let payRecordMovedItems: readonly string[] = [];
    /**
     * The records the open pay sheet was last painted from — the ones its
     * figure is composed of (`paint`). What a press found moved is judged
     * against these, so the line names what the buyer was shown and not
     * what a rate happened to be read for.
     */
    let payPainted = new Map<string, TokenPrice>();
    /**
     * "Pay several" (2026-09-21): the chosen quotes and counts, the strip's
     * open state and its one question, all closure state written onto the
     * view at paint time for `shopTab`'s reason; the two one-shots are
     * consumed by the paint after the press. Reset with the stall.
     */
    let selection = new Map<string, bigint>();
    let selectionOpen = false;
    let selectionAsk: SelectionAsk | undefined;
    let selectionEntered = false;
    let selectionBumped: string | undefined;
    let selectionDropped = false;
    const resetSelection = (): void => {
        selection = new Map();
        selectionOpen = false;
        selectionAsk = undefined;
        selectionEntered = false;
        selectionBumped = undefined;
        selectionDropped = false;
    };
    /**
     * A `?pay=` link is answered once per page load. The URL is deliberately
     * not rewritten, so a reload of a scanned link reopens the sheet — but the
     * seller's "check now" is a refresh of the same load, and reopening a
     * sheet the buyer closed would be this page arguing with them.
     */
    let payHintUsed = false;

    /**
     * A close that leaves `?pay=` in the URL is undone by anything that runs
     * the document again — Back, a wallet hand-off that navigated this tab,
     * and above all a desktop browser discarding a backgrounded tab, which is
     * how this was met (2026-09-19). `payHintUsed` only bounds THIS page load;
     * the next one reads the URL afresh and reopens the sheet the buyer
     * closed. So the close takes the param off. A reload *before* a close
     * still reopens it, which is what a scanned link should do.
     *
     * `replaceState`, and `history.state` is passed back untouched: §3's
     * `door` and `pasted` stamps ride that entry and a shared link's null
     * state must stay null. The path and every other param are kept, so a
     * `?view=` or `?m=` link survives a close.
     */
    const dropPayParam = (): void => {
        const url = new URL(window.location.href);
        if (!url.searchParams.has(PAY_PARAM)) {
            return;
        }
        url.searchParams.delete(PAY_PARAM);
        window.history.replaceState(
            window.history.state,
            '',
            `${url.pathname}${url.search}${url.hash}`,
        );
    };
    /**
     * Which rail of the Shop panel is on screen, and the stall that choice
     * belongs to.
     *
     * Closure state, written onto every paint like `fiatCode` — never a field
     * `loadCurrent` fills in: `refresh()` rebuilds the view from the load, so
     * a reader who pressed Retry while reading the quotes would come back to
     * the listings. `shopTabFor` is what makes it stall-scoped rather than
     * global: the same stall read again keeps the reader's side, and a
     * different seller decides again from their own shop.
     */
    let shopTab: ShopTab = 'listings';
    /**
     * Whether this page is wide enough to be a wall, read ONCE for the life
     * of the page.
     *
     * A `const`, not a paint-time read, and that is the whole point: the
     * predicates that decide the wall must not move under a rotation. See
     * the paint-time view literal for what asking a live width cost.
     */
    /**
     * Whether this page can be a wall at all — read ONCE, at boot, off the
     * SHORT axis.
     *
     * Once, because a predicate that re-reads flips under a rotation: a
     * reader below the floor with a sheet open, widening the viewport, would
     * have `holdsLivePaint` answer false and the next socket tick would
     * throw the half-written record away. That is the hazard the first
     * rework was for, and re-reading per call brings it straight back — the
     * test below caught that inside a minute.
     *
     * **The short axis, because "a phone is not a wall" is a statement about
     * the short side.** A width test alone passed a phone held in landscape
     * (844 across, 390 tall) and painted the wall layout into it. Reading
     * the turn and swapping axes fixed that direction and opened its mirror:
     * a phone held in PORTRAIT opening `?view=window&turn=cw` measured 844
     * of height and painted a frame 844 wide by **390 tall**, where
     * `window.css` gives the code `clamp(280px, 33cqh, 360px)` — 280 of a
     * 390-tall frame that also carries the sign, a row and the status bar,
     * clipped in silence by `overflow: hidden` (critic, 2026-09-20).
     *
     * `min` is the turn-independent form of the rule: turning swaps the two
     * axes and `min` is symmetric, so this needs no URL and cannot be wrong
     * about a direction. Stated cost: a screen shorter than the floor —
     * a 1024x600 netbook — stops being a wall, which is the honest reading
     * of a code whose own floor was measured off the bottom at 768.
     */
    const wallWidth =
        Math.min(globalThis.innerWidth ?? 0, globalThis.innerHeight ?? 0) >= WINDOW_MIN_PX;
    /**
     * The view as every reader must see it: wall-ness settled in ONE place.
     *
     * The first rework stripped `window` from the painted view alone and
     * left `state.view` carrying it, which is two sources of truth for one
     * fact — and both reviewers found what that costs. `livePaint` asked
     * `holdsLivePaint(state.view)` and got "this is a wall, it holds
     * nothing", while `renderStall` had been handed the stripped view and
     * had MOUNTED a sheet: a seller typing a permanent record on a narrow
     * `?view=window` page lost it to a stranger's dust (QA, reproduced with
     * a red/green pair). And `syncWindow`, reading the raw view, armed the
     * wall's three clocks over an unreadable link.
     *
     * So it is a function, it takes the view, and everything that decides
     * anything about the wall goes through it.
     */
    const settled = (view: StallView = state.view): StallView =>
        view.window === undefined || wallWidth ? view : { ...view, window: undefined };
    /**
     * Whether the view holds a read of the seller's records that can be
     * judged against (the critic's fourth pass, 2026-09-24): read, and not a
     * walk that threw. A failed walk answers the floor it read before the
     * throw, and three things read that floor as the seller's whole record —
     * the prune took a chosen quote out of a customer's choice and said the
     * seller had, the wall's frozen payment was closed as "moved", and the
     * stored rail left the quotes. Our failure is never the seller's doing;
     * all three ask this, and so do the Cycle step's rail and the opening
     * rail's decision.
     *
     * Records a wall kept from the last good read over a walk that threw
     * (`recordsStale`) ARE judged: they are a whole read, only older, and
     * the choice and the plate on screen were made off exactly them. A walk
     * that stopped at our own page cap (`descriptionsTruncated`) is judged
     * over what it read — a record it reached that moved to another unit is
     * the seller's doing — and what it did not reach is not, which is
     * `pruneSelection`'s `complete` and the plate's comparison below.
     */
    const recordsKnown = (view: StallView): boolean =>
        view.prices !== undefined && view.descriptionsFailed !== true;
    /**
     * The seller's records as this page holds them now, for a payment on
     * screen to be judged against (`movedRecords`): the touch wall's plate
     * at every paint, and a pay sheet at every press — a sheet holds the
     * live paint, so what it painted can be older than `state.view`.
     */
    const recordsNow = (): RecordsNow => ({
        ...(state.view.prices === undefined ? {} : { prices: state.view.prices }),
        ...(state.view.descriptions === undefined ? {} : { descriptions: state.view.descriptions }),
        ...(state.view.quoteTimes === undefined ? {} : { quoteTimes: state.view.quoteTimes }),
        known: recordsKnown(state.view),
        complete: state.view.descriptionsTruncated !== true,
        decided: decidedOf({ ...state.view, decided: state.view.descriptionsDecided }),
    });
    /** The open pay sheet, as a key — its token, or "several" — and undefined when none is open. */
    const payOverlayKey = (overlay: StallView['overlay']): string | undefined =>
        overlay.kind === 'pay' ? `pay:${overlay.tokenId}` : overlay.kind === 'pay-several' ? 'pay-several' : undefined;
    /**
     * The wall's own params, settled, without building a view.
     *
     * `settled` fixed the four readers that were found; a reviewer then
     * listed six more still asking `state.view.window` directly — four
     * inert only because their timers cannot arm, and two reachable: the
     * paint literal's cursor block, and `refresh`'s `sameStall`, which made
     * a page that is NOT a wall take the wall's refresh semantics and skip
     * the opening repaint a reader pressed Retry for. "A reader that was
     * missed" is the defect class of this whole round, so every one of them
     * goes through here.
     */
    const wallParams = (view: StallView = state.view): WindowParams | undefined =>
        wallWidth ? view.window : undefined;
    /**
     * The shop window's own state, and it lives here for `shopTab`'s reason:
     * the heartbeat below is a full `refresh()`, which rebuilds the view from
     * `loadCurrent()`. A cursor rebuilt from a load would snap the carousel
     * back to its first card every minute, and the rail would snap with it.
     */
    let windowCursorAt = 0;
    let windowRailAt: 'listings' | 'quotes' = 'listings';
    /**
     * The token ids this screen saw at its lock. Captured once, on the first
     * paint that has both a lock and a book, and kept across every refresh —
     * see `offersWithinLock` for why membership and not a height comparison.
     */
    let windowLockSet: ReadonlySet<string> | undefined;
    /**
     * The height that set was captured at. A same-path navigation (Back, a
     * bookmark) keeps the stall and so everything above — and a lock at
     * another height filtered by the old one's set kept a token settled
     * after the new height on the shelf (the critic's third pass).
     */
    let windowLockAt: number | undefined;
    /** When somebody last touched this screen. `0` is "nobody has". */
    let windowTouchedAt = 0;
    /**
     * When `browse` last turned the rail.
     *
     * A catalogue that FITS its strip has nothing to scroll, so the roll
     * timer reached the turn on every tick — a rail flip every six seconds on
     * a wall, for ever, on the commonest shape of small shop, with no
     * `prefers-reduced-motion` escape because nothing here is an animation.
     * A turn now waits a card's dwell, which is the pace the other mode was
     * given for a person's sake in the first place.
     */
    let windowTurnedAt = 0;
    /**
     * The touch wall's frozen payment (2026-09-21). The wall holds no paint,
     * so the plate is a SNAPSHOT taken at the press: `prices` moves on any
     * records re-read and the selection is pruned at paint time, and a
     * camera pointed at the code must decode what the screen is showing
     * (the critic's P1-2). Any change to a chosen item closes it rather
     * than redrawing it, and it empties whenever the selection does —
     * including the reset a heartbeat that came back with no pubkey makes.
     */
    let windowPaying: WallPayment | undefined;
    /** Its own expiry, so a wall nobody touches still gives the slot back. */
    let windowPayingTimer: ReturnType<typeof setTimeout> | undefined;
    /**
     * The rate that priced a payment aged out, so the plate closed: the
     * strip's control then says it composes again at a fresh price (T-D).
     * Cleared by the next press and by any change to the selection.
     */
    let windowPayAged = false;
    /** The press composed a figure under the dust floor: the strip says so. */
    let windowPaySubDust = false;
    /**
     * When this page last read the chain, by this browser's clock. Stamped
     * where a read LANDS — the load and the live re-read — never at paint, or
     * a repaint over a dead socket would keep saying the screen is current.
     * `0` until the first read, and the freshness line is absent with it.
     */
    let bookReadAt = 0;
    let shopTabFor: string | undefined;
    /**
     * Whether `shopTab` is settled for `shopTabFor`: the opening rail is
     * decided once, but only by a read that could decide it. A book that
     * answered empty beside a records walk that threw cannot say whether the
     * seller quotes anything, so the next load decides again — unless the
     * reader has pressed a tab, which settles it (the critic's fifth pass,
     * 2026-09-24).
     */
    let shopTabSettled = false;
    /**
     * The last read of the seller's records that finished, for one stall —
     * the maps, and the names and attributions of the tokens they name.
     * Closure state, taken at paint time from a view `recordsKnown` accepts
     * (a kept view re-takes the same records), so a SECOND walk that throws
     * in a row still has something to keep. Two readers: a
     * wall re-reading the same stall merges it per token under a walk that
     * threw (`overKept`: the walk's answer where it decided a token, unless
     * this read decided it at a higher rank — `ranks`), and any screen names a chosen item from it that its own read did not
     * reach (the strip, `chosenNames` below). Keyed by the stall's key, so
     * one seller's records never name another's items.
     */
    let lastGoodRecords:
        | {
              pubkeyHex: string;
              descriptions: StallView['descriptions'];
              shelves: StallView['shelves'];
              prices: NonNullable<StallView['prices']>;
              quoteTimes: StallView['quoteTimes'];
              descriptionsTruncated: StallView['descriptionsTruncated'];
              decided: ReadonlySet<string>;
              /** Each decided token's winning rank, compared on the next merge. */
              ranks: StallView['descriptionRanks'];
              tokens: StallView['tokens'];
              genesis: StallView['genesis'];
          }
        | undefined;
    /**
     * The transactions this page has watched arrive, newest first.
     *
     * Kept here as well as on the view because a paint is not guaranteed: a
     * burst that reaches the ring while a sheet is open is deferred by
     * `livePaint`, and the ring still has to remember it.
     */
    let events: readonly StallEvent[] = [];
    /**
     * Holes the ring is known to have: reconnects, and txids the page saw
     * named but could not read. The activity panel refuses to let its list
     * read as complete while this is above zero.
     */
    let activityGaps = 0;
    /**
     * What a reader has walked out of this stall's own history.
     *
     * Its own list beside the ring, with its own cap and its own clock (§4).
     * Absent until somebody asks: a walk is up to `MAX_ACTIVITY_PAGES` round
     * trips against a public index and any visitor can start one, so it is a
     * cost a reader chooses rather than one every page load spends.
     */
    let walked: StallHistory | undefined;
    /**
     * Walked pages, per stall, **for this page load only**, and capped.
     *
     * `refresh()` empties the live list because a new stall is a new ring, and
     * it empties this one for the same reason. But a refresh of the *same*
     * stall — a retry, a Back to a stall already read — should not make a
     * reader pay ten round trips again for pages this page already holds.
     *
     * Capped because a visitor can open stalls all afternoon and each entry
     * can hold `MAX_ACTIVITY_PAGES` pages of rows: §2 caps every buffer, and
     * an unbounded one keyed on somebody's browsing is exactly the shape that
     * rule names. Oldest key evicted first, so going back and forth between a
     * couple of stalls stays free and the twentieth costs a walk. Never
     * persisted.
     */
    const MAX_WALKED_STALLS = 4;
    const walkedByStall = new Map<string, StallHistory>();
    let state: AppState = {
        view: {
            route: { kind: 'invalid', raw: '' },
            overlay: { kind: 'idle' },
            tokens: new Map(),
        },
        offers: [],
    };

    /**
     * Ask the feed once, and paint whatever came back — including nothing. This
     * never rejects and never throws: the asked amount is on chain and does not
     * need a price feed to be right, so a feed that is down or rate-limited
     * costs the fiat line and nothing else.
     *
     * **A failure clears the held rate rather than keeping it.** That is the
     * absent-never-stale rule, and until the glance was read more than once it
     * had nothing to act on.
     */
    const refreshFiat = async (): Promise<void> => {
        if (fiatAsking) {
            return;
        }
        const asked = fiatCode;
        fiatAsking = true;
        let rate: bigint | undefined;
        try {
            // Bounded: an unbounded request keeps a browser's progress bar
            // alive for as long as the OS waits on a dead connection.
            rate = await fetchXecPrice(asked, { timeoutMs: FIAT_GLANCE_TIMEOUT_MS });
        } finally {
            fiatAsking = false;
        }
        // The visitor may have changed currency while this was in flight.
        if (asked !== fiatCode) {
            return;
        }
        const moved = rate !== fiatRate;
        fiatRate = rate;
        // Stamped before the paint, and stamped on a failure too: the next
        // read is a window away either way, and `syncGlance` below must not
        // read a stamp this call has not written yet.
        fiatRateAt = Date.now();
        // A number that did not move is not a reason to rebuild the face under
        // a reader — and neither is the door, which paints no fiat: a read
        // still in flight when someone navigates back to it would repaint the
        // paste box under whoever is typing an address into it.
        if (moved && state.view.route.kind !== 'home') {
            livePaint();
        }
        syncGlance();
    };

    /**
     * Whether a rate is on screen right now.
     *
     * One node in the whole app reads `view.fiatRate` — the fiat line inside
     * the listing face's `how` fold, which is closed until a reader opens it.
     * The quotes rail never converts a figure the seller signed, and its pay
     * sheet holds its own `payRate` with its own stamp and its own valve. So
     * this predicate is the complete answer to "does anything on screen need
     * the feed".
     */
    const glanceOnScreen = (): boolean => {
        const overlay = state.view.overlay;
        return (
            overlay.kind === 'item' && overlay.rail === 'listings' && overlay.how === true
        );
    };

    /**
     * The glance's whole schedule, in one idempotent call: ask only while the
     * line is on screen and the tab is showing, re-read once the held rate is
     * older than its window, and hold nothing running otherwise.
     *
     * Called from the paint, from the fold's own toggle (which deliberately
     * does not paint) and from both sides of `visibilitychange` — so a tab
     * that was hidden or asleep asks again on the way back, and a hidden one
     * asks nothing at all.
     *
     * The delay is computed from the stamp rather than from now, so calling
     * this on every paint re-arms for the same moment instead of pushing the
     * re-read out for ever on a busy stall.
     */
    const syncGlance = (): void => {
        if (glanceTimer !== undefined) {
            clearTimeout(glanceTimer);
            glanceTimer = undefined;
        }
        if (!glanceOnScreen() || document.visibilityState === 'hidden') {
            return;
        }
        const age = Date.now() - fiatRateAt;
        if (fiatRateAt === 0 || age >= FIAT_GLANCE_MAX_AGE_MS) {
            void refreshFiat();
            return;
        }
        glanceTimer = setTimeout(() => {
            glanceTimer = undefined;
            syncGlance();
        }, FIAT_GLANCE_MAX_AGE_MS - age);
    };

    /**
     * The seller's currency suggestion (manifest tag 0x04) is **read and not
     * obeyed**. One currency above the table (CLAUDE §8), so there is nothing
     * for a hint to fill: the glance is `usd` for every visitor and no control
     * paints beside it.
     *
     * Silently, on purpose — an unhonoured suggestion is not an error, and a
     * note about it would be this page explaining its own policy on somebody
     * else's shop. The tag keeps being decoded and the publish sheet carries an
     * existing one forward untouched: a field this app no longer edits is never
     * dropped from a record that already carries it.
     *
     * Kept as a named no-op rather than deleted at both call sites, so the
     * decision is legible where the hint would otherwise have been adopted.
     * Test: `a-fiat-hint-is-read-and-ignored`.
     */
    const adoptFiatHint = (): void => {};

    /**
     * The newest block any offer on this stall sits in, or nothing.
     *
     * Deliberately NOT the chain tip: this page never asks for one, and every
     * offer already carries the block it is in, so the highest of them is free
     * and is always at or below the tip. Below is the safe side — a suggestion
     * under the tip keeps every offer this page can see, where one above it
     * would keep offers nobody has read yet.
     */
    const seenBlockOf = (offers: readonly StallOffer[]): number | undefined => {
        let best: number | undefined;
        for (const offer of offers) {
            if (offer.blockHeight !== undefined && offer.blockHeight > (best ?? 0)) {
                best = offer.blockHeight;
            }
        }
        return best;
    };

    /**
     * The view's token names, with the names of chosen items this read did
     * not carry added from the last read that finished for this stall.
     */
    const chosenNames = (): StallView['tokens'] => {
        const kept = lastGoodRecords;
        // Never on a failure screen, which names nothing this load did not
        // read (CLAUDE §4): there a chosen item is counted, not named, until
        // this load reads its genesis (the critic's sixth pass, 2026-09-24).
        const bookAnswered = state.view.fetch?.kind === 'offers' || state.view.fetch?.kind === 'empty';
        if (kept === undefined || kept.pubkeyHex !== state.pubkeyHex || selection.size === 0 || !bookAnswered) {
            return state.view.tokens;
        }
        let out: SessionTokenCache | undefined;
        for (const tokenId of selection.keys()) {
            const meta = kept.tokens.get(tokenId);
            // Only for an item this read has no record of: a name can then
            // build no row, so the shop, the rails and every gate below read
            // the same set whether they take this view or `state.view`.
            if (meta !== undefined && !state.view.tokens.has(tokenId) && state.view.prices?.has(tokenId) !== true) {
                out ??= new Map(state.view.tokens);
                out.set(tokenId, meta);
            }
        }
        return out ?? state.view.tokens;
    };

    /**
     * A read whose walk threw (`view`: the floor it read, its names, and the
     * tokens it resolved) over records kept from an earlier read of the same
     * stall (the critic's sixth pass, 2026-09-24, P1). Per token: what the
     * walk resolved wins, a removal included — it reads newest block first,
     * so that is nearly always the seller's latest word — unless the kept
     * read decided the same token at a higher rank (a newer edit mined a
     * block before an older one sits on a page the walk never reached; the
     * eighth pass, item 4); the kept records fill the tokens it never
     * reached, with their names and attributions wherever this read has
     * none. `recordsStale` only while a kept record is shown, because that
     * is the one thing the stale line says. Two roads: a wall's same-stall
     * refresh keeps `lastGoodRecords`, and a live walk keeps the view's own
     * records (`applyDescriptions`).
     */
    const overKept = (
        view: StallView,
        kept: {
            descriptions?: StallView['descriptions'];
            shelves?: StallView['shelves'];
            prices?: StallView['prices'];
            quoteTimes?: StallView['quoteTimes'];
            descriptionsTruncated?: StallView['descriptionsTruncated'];
            decided?: ReadonlySet<string>;
            ranks?: StallView['descriptionRanks'];
            tokens?: StallView['tokens'];
            genesis?: StallView['genesis'];
        },
    ): Partial<StallView> => {
        const resolved = decidedOf({ ...view, decided: view.descriptionsDecided });
        const merged = mergeFailedRead(
            {
                descriptions: view.descriptions,
                shelves: view.shelves,
                prices: view.prices,
                quoteTimes: view.quoteTimes,
                ranks: view.descriptionRanks,
            },
            resolved,
            kept,
        );
        const tokens: SessionTokenCache = new Map(view.tokens);
        const genesis = new Map(view.genesis ?? []);
        for (const tokenId of merged.keptShown) {
            const meta = kept.tokens?.get(tokenId);
            if (meta !== undefined && !tokens.has(tokenId)) {
                tokens.set(tokenId, meta);
            }
            const attribution = kept.genesis?.get(tokenId);
            if (attribution !== undefined && !genesis.has(tokenId)) {
                genesis.set(tokenId, attribution);
            }
        }
        return {
            descriptions: merged.descriptions,
            shelves: merged.shelves,
            prices: merged.prices,
            quoteTimes: merged.quoteTimes,
            descriptionsFailed: false,
            descriptionsTruncated: kept.descriptionsTruncated,
            // A token the kept read resolved and this one did not is
            // resolved as of that read; one this read resolved, as of this.
            descriptionsDecided: new Set([...resolved, ...(kept.decided ?? [])]),
            descriptionRanks: merged.ranks,
            recordsStale: merged.keptShown.size > 0 ? true : undefined,
            recordsKept: merged.keptShown.size > 0 ? merged.keptShown : undefined,
            tokens,
            genesis,
        };
    };

    const paint = (): void => {
        // A quote that left the rail leaves the selection (D8), judged
        // against what this paint will show — never a count on an item the
        // seller no longer quotes.
        // The two one-shots ride this paint only.
        const entered = selectionEntered;
        const bumped = selectionBumped;
        selectionEntered = false;
        selectionBumped = undefined;
        // Only over a definite read of the records: `refresh()` paints
        // `opening` — no `prices` at all — before its load answers, and a
        // prune over that would empty the selection and then blame the
        // seller for it (the critic's P1, 2026-09-21). The same rule
        // `applyDescriptions` keeps: a walk that answered nothing erases
        // nothing.
        // What a walk that stopped at our own page cap did not reach is our
        // gap and stays chosen; a record there in a painted unit whose
        // genesis never arrived is our gap too (`pruneSelection`).
        const complete = state.view.descriptionsTruncated !== true;
        // What the read resolved is complete even where the read is not: a
        // removal it reached before our cap or a throw is the seller's.
        const decided = decidedOf({ ...state.view, decided: state.view.descriptionsDecided });
        if (recordsKnown(state.view) && state.view.prices !== undefined) {
            const pruned = pruneSelection(selection, state.view.prices, complete, decided);
            if (pruned.dropped) {
                selection = pruned.selection;
                selectionDropped = true;
                // A chosen item moved or left: the wall's plate is a frozen
                // figure over records that no longer stand, so the slot goes
                // back to the shop's code rather than showing a payment
                // nobody can now be asked to make (rule 9).
                cancelWallPayment();
                if (selectionAsk?.kind === 'remove' && !selection.has(selectionAsk.tokenId)) {
                    selectionAsk = undefined;
                }
            }
        }
        /*
         * A republished quote in the SAME unit does not prune — the item is
         * still quoted and still in the selection's unit — so the plate kept
         * a frozen figure while the strip beside it read the new record:
         * `selection-total` and `pay-total` said two different things about
         * the same two items, on the screen with nobody to ask (the critic's
         * P1-2). Any chosen item whose record moved closes the plate.
         */
        // Over a DEFINITE read only, the prune's own rule: `refresh()` paints
        // `opening` with no prices before its load answers, and a comparison
        // against that closed the plate every sixty seconds on a wall nobody
        // had touched. A record a capped walk did not reach has not moved;
        // one it resolved, a removal included, is judged (`movedRecords`,
        // the rule both pay sheets ask at the press).
        if (windowPaying !== undefined && movedRecords(windowPaying.prices, recordsNow()).length > 0) {
            cancelWallPayment();
        }
        /*
         * And whenever a chosen item cannot be read (the owner's (f),
         * 2026-09-24): the code pays for the whole choice, and a choice this
         * screen cannot show whole is not one a customer can check against
         * the code — the slot goes back to the shop's code. Not while the
         * records are still being read (`unreadChosen`'s `reading`): the
         * heartbeat paints a read in flight every sixty seconds, and closing
         * on that would close every plate on an untouched wall.
         */
        if (windowPaying !== undefined && unreadChosen(selection, state.view).some((u) => u.why !== 'reading')) {
            cancelWallPayment();
        }
        // The last read that finished, kept for the next walk that throws.
        // Its names and attributions ACCUMULATE over the visit to one stall:
        // a genesis cannot go stale, and a later read that stopped at our
        // page cap must not forget the name of an item a customer chose off
        // an earlier one.
        if (recordsKnown(state.view) && state.view.prices !== undefined && state.pubkeyHex !== undefined) {
            const prev = lastGoodRecords?.pubkeyHex === state.pubkeyHex ? lastGoodRecords : undefined;
            const names = new Map(prev?.tokens ?? []);
            for (const [tokenId, meta] of state.view.tokens) {
                names.set(tokenId, meta);
            }
            const genesis = new Map(prev?.genesis ?? []);
            for (const [tokenId, attribution] of state.view.genesis ?? []) {
                genesis.set(tokenId, attribution);
            }
            lastGoodRecords = {
                pubkeyHex: state.pubkeyHex,
                descriptions: state.view.descriptions,
                shelves: state.view.shelves,
                prices: state.view.prices,
                quoteTimes: state.view.quoteTimes,
                descriptionsTruncated: state.view.descriptionsTruncated,
                decided,
                ranks: state.view.descriptionRanks,
                tokens: names,
                genesis,
            };
        }
        /*
         * The freeze is captured ONCE per lock height, on the first paint
         * that has both a lock and a book, and here — before the view is
         * built — so the paint that shows a lock is the paint that took it.
         * After that the remembered set is what filters, so an item partly
         * sold since (its remaining utxo now in a later block) stays on the
         * shelf it was on when the seller locked it. A same-path navigation
         * to another `upto` takes a fresh set (`windowLockAt`).
         */
        const wall = wallParams();
        if (wall !== undefined && shopWindowPaints(settled())) {
            if (wall.upto !== windowLockAt) {
                windowLockSet = undefined;
                windowLockAt = wall.upto;
            }
            if (wall.upto !== undefined && windowLockSet === undefined && state.offers.length > 0) {
                windowLockSet = tokensAtBlock(state.offers, wall.upto);
            }
        }
        /*
         * The drivers hold the rail that is PAINTED (the critic's third
         * pass, 2026-09-24, a P1 of round 3). `windowRail` and
         * `broadcastRail` turn an empty rail off at paint time, but the
         * closure's own `windowRailAt` / `broadcastRailAt` moved only on a
         * turn or a Cycle step — so a `show=all` touch wall on a stall with
         * quotes and nothing listed painted the quotes while the driver
         * still said "listings", and the first listing to land flipped the
         * painter back under a customer's hands: the strip, Clear all, Pay
         * and the payment code gone. Stored here, every paint agrees with
         * the screen, and a rail that was chosen for being the only one is
         * kept once the other fills. Only over a read of the records this
         * page can judge (`recordsKnown`): a paint that has not read the
         * quotes, or read a floor a walk left when it threw, cannot say they
         * are empty, and storing "listings" off one would move a wall back
         * onto the listings for good.
         */
        if (recordsKnown(state.view)) {
            const params = wallParams();
            if (params !== undefined) {
                const seen: StallView = {
                    ...state.view,
                    ...(windowLockSet === undefined ? {} : { windowLock: windowLockSet }),
                };
                windowRailAt = windowRail(seen, params, windowRailAt);
            }
            if (state.view.broadcast !== undefined) {
                broadcastRailAt = broadcastRail(withRail(state.view));
            }
        }
        // Read at paint time, not at load: the toggle changes it without a
        // refetch, and a stale flag would leave the control lying about itself.
        const view: StallView = {
            ...settled(),
            /*
             * A phone is not a wall, and `settled` above is where that is
             * decided — for the painter and for every other reader alike,
             * which the first version of this got wrong.
             *
             * It belongs at paint time, beside `shopTab`, `fiatCode` and
             * `view.pasted`, for the reason all three live here.
             *
             * The render gate took the width on 2026-09-18 and the overlay
             * gate did not, so below the floor a link painted the ordinary
             * stall with every sheet refused. Asking the width in each
             * predicate fixed that and bought two worse things: a viewport
             * crossing the floor with a sheet open flips `holdsLivePaint`,
             * and the next socket tick throws away a half-written record —
             * the one thing `a-live-update-does-not-clear-a-half-written-
             * record` exists to stop, reachable by a rotation; and the beat's
             * own `.finally` re-armed a cleared heartbeat, so a narrowed
             * desktop kept a full `refresh()` and an ungated `paint()` every
             * minute over a stall somebody was reading (measured by the QA
             * that reviewed the first fix).
             *
             * So nothing downstream consults a live measurement: the view
             * says whether this is a wall, and the render gate, the overlay
             * gate and `syncWindow` all read the view. The cost, stated: a
             * desktop narrowed mid-session keeps the wall until the next
             * load, which is the same bargain `shopTab` takes.
             */
            isDefaultStall: isSavedStall(identityOf(state.view)),
            // The overlay's rail and the ticker's motion mode, read at paint
            // time like `wallWidth`: `broadcastRail` is turned by the wrap,
            // and a reduced-motion ticker pages instead of scrolling.
            broadcastRail: broadcastRailAt,
            ...(tickerStill ? { broadcastTickerStill: true as const } : {}),
            // The same read-at-paint rule: what the describe sheet prefills
            // is this browser's memory of the last quote handed to a wallet
            // on this stall (§2's second named exception), never a loader's.
            ...((): { rememberedSurcharge?: RememberedSurcharge } => {
                const remembered = readRememberedSurcharge(identityOf(state.view));
                return remembered === undefined ? {} : { rememberedSurcharge: remembered };
            })(),
            // Same read-at-paint rule as the default flag: a pin toggles
            // without a refetch, and a stale list would lie about itself.
            pinnedStalls: readPinnedStalls(),
            pinnedNames: readPinnedNames(),
            isPinnedStall: isPinnedStall(identityOf(state.view)),
            pinnedDoorFull: pinnedDoorIsFull(),
            fiatCode,
            ...(bookReadAt === 0 ? {} : { readAtMs: bookReadAt }),
            // The tip, for the freeze's SUGGESTION and nothing else. Free:
            // every offer already carries the block it sits in, so the
            // highest of them is the newest block this page has seen. Absent
            // on a stall with no offers, and the field stays editable either
            // way — a seller reading a height off an explorer is the road
            // that always works.
            ...(seenBlockOf(state.offers) === undefined ? {} : { tipHeight: seenBlockOf(state.offers) }),
            fiatRate,
            // Never a rate read for another unit than the open sheet composes
            // in: a press that found the seller's record moved paints the
            // sheet again from it, and the record may have changed unit.
            payRate: payOverlayKey(state.view.overlay) !== undefined && rateForAnotherUnit() ? undefined : payRate,
            payRateWhy,
            payRateAsking,
            payQuantity,
            ...(payRecordMovedFor !== undefined &&
            payRecordMovedFor === payOverlayKey(state.view.overlay) &&
            payRecordMovedItems.length > 0
                ? { payRecordMoved: payRecordMovedItems }
                : {}),
            selection: new Map(selection),
            /*
             * A chosen item this read did not reach is still named — the
             * strip says the page could not read it, and a sentence about
             * "1 item" with no name beside it is a count nobody can check.
             * The name is its genesis name, which cannot go stale, taken
             * from the last read that finished for this stall, and only for
             * a chosen item this read holds no record of: no row is built
             * from it (a row needs a record in `prices`), so nothing here
             * puts an item this load did not read on the shop.
             */
            tokens: chosenNames(),
            selectionOpen,
            ...(selectionAsk === undefined ? {} : { selectionAsk }),
            ...(entered ? { selectionEntered: true as const } : {}),
            ...(bumped === undefined ? {} : { selectionBumped: bumped }),
            ...(selectionDropped ? { selectionDropped: true as const } : {}),
            genesisPending: state.genesisPending?.tokenIds,
            shopTab,
            ...(wallParams() === undefined
                ? {}
                : {
                      windowCursor: windowCursorAt,
                      windowRail: windowRailAt,
                      ...(windowPaying === undefined ? {} : { windowPaying }),
                      ...(windowPayAged ? { windowPayAged: true as const } : {}),
                      ...(windowPaySubDust ? { windowPaySubDust: true as const } : {}),
                      ...(windowLockSet === undefined ? {} : { windowLock: windowLockSet }),
                  }),
            // From the entry's own state, at paint time: a loader never fills
            // it in, so a refresh cannot lose it and a shared link cannot gain it.
            pasted: (history.state as { pasted?: boolean } | null)?.pasted === true,
        };
        // The records the open pay sheet composes from, exactly as this paint
        // hands them to it: the single sheet's item when it is a quoted row,
        // every chosen item's on "Pay several" (`payPainted`).
        payPainted = new Map();
        if (view.overlay.kind === 'pay') {
            const tokenId = view.overlay.tokenId;
            const item = quotedItems(view).find((row) => row.tokenId === tokenId);
            if (item !== undefined) {
                payPainted.set(tokenId, item.price);
            }
        } else if (view.overlay.kind === 'pay-several') {
            for (const tokenId of view.selection?.keys() ?? []) {
                const painted = view.prices?.get(tokenId);
                if (painted !== undefined) {
                    payPainted.set(tokenId, painted);
                }
            }
        }
        renderStall(root, view, {
            onChangeFiat: (code: string): void => {
                fiatCode = code;
                saveFiat(code);
                // The old currency's rate is not this currency's rate, so it
                // goes immediately: a figure in the wrong currency is a worse
                // lie than no figure at all.
                fiatRate = undefined;
                // The stamp goes with the value, or the new currency's read
                // would be held back by the old one's window.
                fiatRateAt = 0;
                paint();
                syncGlance();
            },
            onOpenShopWindow: () => {
                state = {
                    ...state,
                    view: { ...state.view, overlay: { kind: 'shop-window' } },
                };
                paint();
            },
            onOpenStream: () => {
                state = { ...state, view: { ...state.view, overlay: { kind: 'stream' } } };
                paint();
            },
            onOpenEmbed: () => {
                state = { ...state, view: { ...state.view, overlay: { kind: 'embed' } } };
                paint();
            },
            onOpenItem: (tokenId, rail) => {
                state = { ...state, view: { ...state.view, overlay: { kind: 'item', tokenId, rail } } };
                paint();
            },
            onItemHow: (open) => {
                const overlay = state.view.overlay;
                if (overlay.kind === 'item') {
                    // State only: the fold already moved on screen, and a
                    // paint here would rebuild the face under the reader.
                    state = { ...state, view: { ...state.view, overlay: { ...overlay, how: open } } };
                }
                // This fold is the only thing on this origin that shows the
                // glance, so opening it is what asks the feed and closing it
                // is what stops. Not on the paint alone: the line above is
                // deliberately paintless.
                syncGlance();
            },
            onZoomIcon: (open) => {
                const overlay = state.view.overlay;
                if (overlay.kind !== 'item') {
                    return;
                }
                // This one paints, where `onItemHow` above deliberately does
                // not: the fold had already moved on screen by the time the
                // handler ran, and this opens a surface that does not exist
                // until the paint puts it there.
                state = { ...state, view: { ...state.view, overlay: { ...overlay, zoom: open } } };
                paint();
            },
            onRetry: () => {
                void refresh();
            },
            onCloseSheet: () => {
                state = { ...state, view: { ...state.view, overlay: { kind: 'idle' } } };
                paint();
            },
            onOpenStall: (raw, pasted) => {
                onOpenStall(raw, pasted);
            },
            onGoHome: () => {
                onGoHome();
            },
            onOpenPay: (tokenId) => {
                onOpenPay(tokenId);
            },
            onPayRate: (timeoutMs) => readPayRate(timeoutMs),
            onPayRecords: () => recordsNow(),
            onPayRecordMoved: (tokenId) => {
                onPayRecordMoved(tokenId);
            },
            onToggleSelection: () => {
                selectionOpen = !selectionOpen;
                selectionAsk = undefined;
                selectionDropped = false;
                // The entrance is the press's, never a repaint's: consumed by
                // the one paint that follows.
                selectionEntered = selectionOpen;
                paint();
            },
            onSelectionSet: (tokenId, count) => {
                // A change to the selection closes the wall's plate AND
                // cancels a press still waiting on a feed: the figure a
                // phone scans is the figure the Pay press made, never one
                // rebuilt under a scanning camera (T-A, rule 9), and never
                // one composed from a selection the presser never saw.
                cancelWallPayment();
                if (count <= 0n) {
                    selection.delete(tokenId);
                } else if (selection.has(tokenId) || selection.size < MAX_SELECTION_ENTRIES) {
                    selection.set(tokenId, count);
                } else {
                    return;
                }
                selectionAsk = undefined;
                selectionDropped = false;
                selectionBumped = count > 0n ? tokenId : undefined;
                paint();
            },
            onSelectionAsk: (ask) => {
                selectionAsk = ask;
                paint();
            },
            onSelectionClear: () => {
                cancelWallPayment();
                selection = new Map();
                selectionAsk = undefined;
                selectionDropped = false;
                paint();
            },
            onOpenPaySeveral: () => {
                onOpenPaySeveral();
            },
            onWallPay: () => {
                onWallPay();
            },
            onWallBack: () => {
                cancelWallPayment();
                paint();
            },
            onPayQuantity: (tokenId, quantity) => {
                if (state.view.overlay.kind === 'pay' && state.view.overlay.tokenId === tokenId) {
                    payQuantity = quantity;
                }
            },
            onLookupToken: (tokenId) => lookupToken(tokenId),
            onOpenPublish: () => {
                state = { ...state, view: { ...state.view, overlay: { kind: 'publish-name' } } };
                paint();
            },
            onOpenDescribe: (tokenId) => {
                state = {
                    ...state,
                    view: { ...state.view, overlay: { kind: 'describe', tokenId } },
                };
                paint();
            },
            onClosePublish: () => {
                if (state.view.overlay.kind === 'pay') {
                    dropPayParam();
                }
                payRecordMovedFor = undefined;
                payRecordMovedItems = [];
                state = { ...state, view: { ...state.view, overlay: { kind: 'idle' } } };
                paint();
            },
            onOpenPoster: (format = 'print', tokenId, from) => {
                state = {
                    ...state,
                    view: {
                        ...state.view,
                        overlay: { kind: 'poster', format, tokenId, from },
                    },
                };
                paint();
            },
            onClosePoster: () => {
                // A poster opened from the describe sheet closes back onto
                // it, on the same token: the sheet was where the seller was
                // working, and "idle" would eject them to the studio.
                const over = state.view.overlay;
                const back: Overlay =
                    over.kind === 'poster' && over.from === 'describe'
                        ? { kind: 'describe', tokenId: over.tokenId }
                        : { kind: 'idle' };
                state = { ...state, view: { ...state.view, overlay: back } };
                paint();
            },
            onChoosePosterFormat: (format) => {
                const over = state.view.overlay;
                const kept = over.kind === 'poster' ? over : undefined;
                state = {
                    ...state,
                    view: {
                        ...state.view,
                        overlay: {
                            kind: 'poster',
                            format,
                            tokenId: kept?.tokenId,
                            from: kept?.from,
                        },
                    },
                };
                paint();
            },
            onChoosePosterItem: (tokenId) => {
                const over = state.view.overlay;
                const kept = over.kind === 'poster' ? over : undefined;
                state = {
                    ...state,
                    view: {
                        ...state.view,
                        overlay: {
                            kind: 'poster',
                            format: kept?.format ?? 'tag',
                            tokenId,
                            from: kept?.from,
                        },
                    },
                };
                paint();
            },
            onPreviewLook: (preview) => {
                // No paint: the sheet already patched the DOM, and painting
                // would rebuild it under the seller's hands. The remembered
                // value is for every LATER paint — tab switches included.
                state = { ...state, view: { ...state.view, previewLook: preview } };
            },
            onToggleDefault: (raw) => {
                if (isSavedStall(raw)) {
                    clearSavedStall();
                } else {
                    saveStall(raw);
                }
                paint();
            },
            // The describe sheet handed a quote to a wallet: what it carried
            // is what the next quote on this stall opens with. No paint — the
            // sheet is open and holds a half-written record; the Studio line
            // reads storage on its next paint.
            onRememberSurcharge: (pct) => {
                const raw = identityOf(state.view);
                if (raw !== undefined) {
                    rememberSurcharge(raw, pct);
                }
            },
            onForgetSurcharge: () => {
                const raw = identityOf(state.view);
                if (raw !== undefined) {
                    forgetSurcharge(raw);
                    paint();
                }
            },
            onSwitchPanel: (panel) => {
                // UI state only, never history.state: the popstate listener
                // runs refresh(), which closes the socket, empties the event
                // ring and re-runs the whole load — a Back that did all that
                // to leave a tab would wipe the feed the tab shows.
                state = { ...state, view: { ...state.view, panel } };
                paint();
            },
            onTogglePin: (raw) => {
                if (isPinnedStall(raw)) {
                    unpinStall(raw);
                } else {
                    // The name travels with the pin as a snapshot (`saved.ts`):
                    // the door fetches nothing, so this is where it learns it.
                    pinStall(raw, state.view.stallName);
                }
                paint();
            },
            onChangeSort: (sort) => {
                // A way of looking at the shelves, not a fact about the
                // stall: UI state like `panel`, gone on the next full load.
                state = { ...state, view: { ...state.view, shopSort: sort } };
                paint();
            },
            onSwitchShopTab: (tab) => {
                // The reader's own choice, and it outlives the load: a
                // re-read of this stall paints whichever side they are on.
                shopTab = tab;
                shopTabSettled = true;
                // The dropped-item sentence lives until the tab switches (D8).
                selectionDropped = false;
                paint();
            },
            onChangeFilter: (text) => {
                state = {
                    ...state,
                    view: { ...state.view, shopFilter: text.slice(0, 64) },
                };
                paint();
            },
            onReadHistoryPage: () => {
                void readHistoryPage();
            },
        });
        // The ticker's pass is what `livePaint` waits on: a moving ribbon was
        // painted, so the next live paint holds until its wrap — for at most
        // two passes, after which the guard paints regardless.
        const ribbon = root.querySelector<HTMLElement>('.tk-run:not(.still)');
        tickerRunning = ribbon !== null;
        if (tickerGuard !== undefined) {
            clearTimeout(tickerGuard);
            tickerGuard = undefined;
        }
        if (ribbon !== null) {
            const passMs = Number.parseInt(ribbon.style.getPropertyValue('--tk-ms'), 10);
            if (passMs > 0) {
                tickerGuard = setTimeout(() => {
                    tickerGuard = undefined;
                    tickerRunning = false;
                    paint();
                }, 2 * passMs);
            }
        }
        // Idempotent, and here so a paint the ribbon's wrap did not schedule
        // (the reduce toggle, the guard) still arms or disarms the pager.
        syncTicker();
        // One-shots: the paint that showed them consumes them, same
        // discipline as `justChanged`. A later fiat answer or live
        // re-read must not replay the fade or the pulse.
        if (
            state.view.broadcastStepped !== undefined ||
            state.view.broadcastPulse !== undefined ||
            state.view.payHintScroll !== undefined
        ) {
            state = {
                ...state,
                view: {
                    ...state.view,
                    broadcastStepped: undefined,
                    broadcastPulse: undefined,
                    payHintScroll: undefined,
                },
            };
        }
        // Every other way the glance comes and goes — a face opened or closed,
        // a cross-link to the other rail, a stall navigated to, a refresh.
        // Idempotent, and its delay is measured from the read's own stamp, so
        // a busy stall repainting cannot postpone the re-read.
        syncGlance();
    };

    /**
     * A paint the visitor did not ask for.
     *
     * `renderStall` begins with `replaceChildren()`, and each record sheet keeps
     * what the seller has typed — a name, a look, chosen decorations, a token's
     * words and figure — in the DOM and nowhere else. The poster is the same
     * shape: a format chooser and a canvas preview a streamer is in the middle
     * of. So a paint while any of them is open throws that work away — and with
     * a script subscription watching the stall address, a stranger can now
     * cause that from outside for the price of dust.
     *
     * The state is updated either way; only the paint waits. Every path that
     * closes the sheet ends in a paint of its own, which is the flush: there is
     * no way out of the overlay that does not repaint.
     *
     * **The wait asks the same question the render gate does.** `holdsLivePaint`
     * is `renderStall`'s own predicate, so an overlay kind that mounts nothing —
     * a describe sheet on a route with no address, a poster whose link is past
     * the QR ceiling — cannot hold a paint back for a sheet that is not on
     * screen, which would stop the stall updating with nothing to say why.
     *
     * A paint a person asked for is untouched. (Until 2026-09-17 that included
     * the sheet's own "Check for it now", whose whole answer was the sheet
     * closing onto a re-read stall; the owner removed it — see `sheetFoot`.)
     */
    const livePaint = (): void => {
        if (holdsLivePaint(settled())) {
            // A pay sheet answers the re-read in place, without a rebuild:
            // its scan code is a road no press guards, so a record that moved
            // under it takes the code away now (`recheckPaySheet`).
            if (payOverlayKey(state.view.overlay) !== undefined) {
                recheckPaySheet(root);
            }
            return;
        }
        /*
         * The ticker holds the live paint until the wrap (2026-09-21): the
         * ribbon is rebuilt only between passes, never under a viewer's eye
         * — the card carousel's `cardReplaced` discipline. State is already
         * updated; the paint `advanceTicker` makes at the wrap carries it,
         * at most one pass away (one to four minutes).
         */
        if (state.view.broadcast?.preset === 'ticker' && tickerRunning) {
            return;
        }
        paint();
    };

    /**
     * How long the card just painted stays. When one of its lines is cut
     * and running, the run through (holds included) and then
     * `BROADCAST_AFTER_RUN_MS`; otherwise the fixed dwell. Read from the
     * tree the paint just measured, so the wait is the run the viewer sees.
     */
    const cardDwell = (fixedMs: number): number => {
        const run = lastMarqueeRunAheadMs();
        return run > 0 ? run + BROADCAST_AFTER_RUN_MS : fixedMs;
    };
    /** A live apply put a different card at the cursor: the armed dwell is the old card's. */
    let cardReplaced = false;

    const carouselTick = (): void => {
        carousel = undefined;
        const params = state.view.broadcast;
        if (params === undefined || params.preset !== 'corner') {
            return;
        }
        const n = broadcastCards(withRail(state.view)).length;
        // One card and nothing to turn to stands; one card on each rail
        // under `all` still takes turns.
        if (n < 2 && !broadcastTurns(withRail(state.view))) {
            return;
        }
        if (params.mode === 'fixed') {
            const step = broadcastStep(withRail(state.view), state.view.broadcastCursor ?? 0, n);
            broadcastRailAt = step.rail;
            state = {
                ...state,
                view: {
                    ...state.view,
                    broadcastCursor: step.cursor,
                    broadcastState: 'live',
                    broadcastStepped: true,
                },
            };
            paint();
            carousel = setTimeout(carouselTick, cardDwell(BROADCAST_FIXED_MS));
            return;
        }
        if (state.view.broadcastState === 'live') {
            const step = broadcastStep(withRail(state.view), state.view.broadcastCursor ?? 0, n);
            broadcastRailAt = step.rail;
            state = {
                ...state,
                view: {
                    ...state.view,
                    broadcastCursor: step.cursor,
                    broadcastState: 'rest',
                },
            };
            paint();
            carousel = setTimeout(carouselTick, BROADCAST_RAIL_REST_MS);
            return;
        }
        state = {
            ...state,
            view: {
                ...state.view,
                broadcastState: 'live',
                broadcastStepped: true,
            },
        };
        paint();
        carousel = setTimeout(carouselTick, cardDwell(BROADCAST_RAIL_LIVE_MS));
    };

    /**
     * The ticker's wrap: the next page of items — and, under `cards=all`,
     * the other rail once this one has been shown through — painted between
     * passes, with whatever live paint was held meanwhile.
     */
    const advanceTicker = (): void => {
        const params = state.view.broadcast;
        if (params === undefined || params.preset !== 'ticker') {
            return;
        }
        const cards = broadcastCards(withRail(state.view));
        const pages = tickerPages(cards.length, tickerStill);
        const step = broadcastStep(withRail(state.view), state.view.broadcastCursor ?? 0, pages);
        broadcastRailAt = step.rail;
        state = { ...state, view: { ...state.view, broadcastCursor: step.cursor } };
        paint();
    };

    /** The moving ribbon's own iteration event: one pass has run through. */
    const onTickerWrap = (): void => {
        if (state.view.broadcast?.preset !== 'ticker' || !tickerRunning) {
            return;
        }
        tickerWrapped();
        advanceTicker();
    };

    /**
     * Idempotent, like `syncCarousel`. A moving ribbon needs no timer — the
     * CSS animation's `animationiteration` is the scheduler's input. Under
     * reduced motion the ribbon is still and pages on `BROADCAST_FIXED_MS`,
     * the fixed carousel's own dwell, which is what the rhythm test pins.
     */
    const syncTicker = (): void => {
        const params = state.view.broadcast;
        const want = params !== undefined && params.preset === 'ticker' && tickerStill;
        if (!want) {
            if (tickerPager !== undefined) {
                clearTimeout(tickerPager);
                tickerPager = undefined;
            }
            return;
        }
        if (tickerPager !== undefined) {
            return;
        }
        tickerPager = setTimeout(function page() {
            tickerPager = undefined;
            if (state.view.broadcast?.preset !== 'ticker' || !tickerStill) {
                return;
            }
            advanceTicker();
            tickerPager = setTimeout(page, BROADCAST_FIXED_MS);
        }, BROADCAST_FIXED_MS);
    };

    const syncCarousel = (): void => {
        syncTicker();
        const params = state.view.broadcast;
        const n = broadcastCards(withRail(state.view)).length;
        const want =
            params !== undefined &&
            params.preset === 'corner' &&
            (n >= 2 || broadcastTurns(withRail(state.view)));
        // A card replaced under an armed timer takes its own dwell: the
        // armed one was measured on the card that left (2026-09-09).
        const rearm = cardReplaced;
        cardReplaced = false;
        if (!want) {
            if (carousel !== undefined) {
                clearTimeout(carousel);
                carousel = undefined;
            }
            return;
        }
        if (carousel !== undefined) {
            if (!rearm) {
                return;
            }
            clearTimeout(carousel);
            carousel = undefined;
        }
        const live = params.mode === 'fixed' || state.view.broadcastState === 'live';
        const delay = live
            ? cardDwell(params.mode === 'fixed' ? BROADCAST_FIXED_MS : BROADCAST_RAIL_LIVE_MS)
            : BROADCAST_RAIL_REST_MS;
        carousel = setTimeout(carouselTick, delay);
    };

    /**
     * The shop window drives itself, and every one of its three timers exists
     * because nobody is standing at the screen to do the thing by hand.
     *
     * Idempotent, like `syncGlance`: called after every paint, arms only what
     * the screen on the wall actually needs, and disarms the lot the moment
     * this stops being a window.
     */
    const syncWindow = (): void => {
        /*
         * The SETTLED view, and `shopWindowPaints` rather than a width test
         * of its own. Gathering the terms by hand dropped the two route ones
         * with the width, so an unreadable link at desk width armed the
         * wall's three clocks — a full `refresh()` every sixty seconds and a
         * `paint()` every twenty, for ever, over a screen that is not the
         * wall (QA, measured: four loads where there should be one). The
         * wall's clocks belong to the wall, and one predicate is what says
         * which pages those are.
         */
        const view = settled();
        if (!shopWindowPaints(view)) {
            return;
        }
        const params = view.window;

        /*
         * The code lives as long as the rate that priced it (T-D). At expiry
         * the plate closes and the shop's code comes back — the phone's
         * `aged` rule (the scan code is the one destination the valve does
         * not guard) plus the wall's own: a dead plate must not hold the one
         * road a passer-by has onto this stall. The selection and its total
         * stay on the strip, whose Pay control then says it composes again
         * at a fresh price.
         */
        // An XEC payment reads no rate, so nothing about it goes stale and
        // the code never ages (rule 8) — the phone's `xec` sheet says the
        // same about its own.
        const ages = windowPaying?.rate !== undefined;
        if (ages && Date.now() - windowPaying!.atMs >= PAY_RATE_MAX_AGE_MS) {
            windowPaying = undefined;
            windowPayAged = true;
            paint();
            return;
        }
        if (windowPayingTimer === undefined && ages) {
            const left = PAY_RATE_MAX_AGE_MS - (Date.now() - windowPaying!.atMs);
            windowPayingTimer = setTimeout(() => {
                windowPayingTimer = undefined;
                if (windowPaying !== undefined) {
                    windowPaying = undefined;
                    windowPayAged = true;
                    paint();
                }
            }, Math.max(0, left));
        }

        if (windowBeat === undefined) {
            const beat = (): void => {
                // A full refresh rather than a book re-read: the thing this is
                // catching is a socket that died without saying so, and only
                // rebuilding the socket heals that. The cursor, the rail and
                // the lock all survive it — they are closure state written at
                // paint time, which is exactly why they live there.
                //
                // Re-armed in `finally`, not before the call. `refresh()`
                // clears every timer as its first act and re-arms this one
                // through `syncWindow` at its last, so a rejection anywhere
                // between leaves an unattended screen with no socket and no
                // heartbeat, permanently, with nothing on it to say so. The
                // guard is what keeps the two paths from arming two timers:
                // on the ordinary path `syncWindow` has already set it.
                void refresh().finally(() => {
                    if (wallParams() !== undefined && windowBeat === undefined) {
                        windowBeat = setTimeout(beat, WINDOW_BEAT_MS);
                    }
                });
            };
            windowBeat = setTimeout(beat, WINDOW_BEAT_MS);
        }

        if (params.mode === 'cycle') {
            if (windowCard === undefined) {
                // What is left of the card's dwell, never a fresh one: the
                // heartbeat clears this timer every minute (`windowCardDueAt`).
                const now = Date.now();
                windowCardDueAt ??= now + WINDOW_CARD_MS;
                const step = (): void => {
                    windowCardDueAt = Date.now() + WINDOW_CARD_MS;
                    windowCard = setTimeout(step, WINDOW_CARD_MS);
                    advanceWindowCard();
                };
                windowCard = setTimeout(step, Math.max(0, windowCardDueAt - now));
            }
            return;
        }

        // `browse` yields to a person and takes the screen back when they
        // leave. One step every few seconds, never a per-frame loop: this runs
        // for hours on whatever computer is behind a shop's television.
        if (windowRoll === undefined) {
            windowRoll = setTimeout(function roll() {
                windowRoll = setTimeout(roll, WINDOW_SCROLL_MS);
                if (Date.now() - windowTouchedAt < WINDOW_IDLE_MS) {
                    return;
                }
                rollWindow();
            }, WINDOW_SCROLL_MS);
        }
    };

    /**
     * One card on, and at the end of the list the rail turns over.
     *
     * `show=all` **rotates**; the two rails never share a screen. Folding the
     * turn into the wrap rather than giving it a timer of its own is what
     * keeps them in step — two clocks is how a cursor comes to point into the
     * list it is not on.
     */
    const advanceWindowCard = (): void => {
        const params = wallParams();
        if (params === undefined) {
            return;
        }
        // The SAME derivation the painter uses, and the same view: the lock
        // is written onto the view at paint time, so counting off `state.view`
        // dropped the remembered-token branch the screen was painting.
        const seen: StallView = { ...state.view, ...(windowLockSet === undefined ? {} : { windowLock: windowLockSet }) };
        const rail = windowRail(seen, params, windowRailAt);
        const length =
            rail === 'quotes'
                ? quotedItems(seen).length
                : wallListings(seen, params).length;
        // `all` turns only while the other rail has something to show: an
        // empty rail turns itself off rather than standing a dwell on a blank.
        const step = nextCard(windowCursorAt, length, windowTurns(seen, params) ? 'all' : rail, rail);
        windowCursorAt = step.cursor;
        // The rail moves only over records this page can judge, the paint's
        // own rule: a Cycle step counting a floor a walk left when it threw
        // would turn a wall off its quotes for good (the critic's fifth
        // pass, 2026-09-24).
        if (recordsKnown(state.view)) {
            windowRailAt = step.rail;
        }
        paint();
    };

    /**
     * One step down the catalogue, and the turn at the bottom.
     *
     * A cut, never a cross-fade. A transition that mounted the outgoing rail
     * beside the incoming one would put a covenant's asked amount and a
     * seller's own quote in the tree together — the one pairing
     * `the-two-rails-never-paint-on-one-screen` forbids, on the screen with no
     * tab to press to ask which figure is which.
     */
    const rollWindow = (): void => {
        const params = wallParams();
        const strip = root.querySelector('.sw-strip') as HTMLElement | null;
        if (strip === null) {
            return;
        }
        const room = strip.scrollHeight - strip.clientHeight;
        if (room <= 1 || strip.scrollTop >= room - 1) {
            strip.scrollTop = 0;
            if (params === undefined || params.show !== 'all') {
                return;
            }
            // Only while the other rail has something on it: a turn onto an
            // empty rail is a turn `windowRail` would undo, one scroll later.
            const seen: StallView = { ...state.view, ...(windowLockSet === undefined ? {} : { windowLock: windowLockSet }) };
            if (!windowTurns(seen, params)) {
                return;
            }
            // A list that fits reaches this on every tick; one that scrolls
            // reaches it once it has been read. Either way the turn is paced
            // by the card's dwell, never by the scroll step.
            // The strip is the quotes rail's, so a turn under a customer's
            // hands would take their rows and their total away (T-C). The
            // hold ends when the selection empties — Clear all, or the last
            // "−" — and with no idle clearing (the owner's ruling) an
            // abandoned choice pins a `show=all` screen to the quotes side
            // until someone presses Clear all, which is stated.
            if (wallTouches(params) && selection.size > 0) {
                return;
            }
            const now = Date.now();
            if (now - windowTurnedAt < WINDOW_CARD_MS) {
                return;
            }
            windowTurnedAt = now;
            windowRailAt = windowRailAt === 'listings' ? 'quotes' : 'listings';
            windowCursorAt = 0;
            paint();
            return;
        }
        strip.scrollBy({ top: Math.round(strip.clientHeight * 0.8), behavior: 'smooth' });
    };

    const syncBroadcastTimers = (): void => {
        if (state.view.broadcast === undefined) {
            return;
        }
        if (isBroadcastFailure(state.view.fetch?.kind)) {
            // Only a resolved stall has no socket to heal the screen.
            // `unresolvable` / `unresolved` keep their waiting handle.
            if (state.pubkeyHex !== undefined && retry === undefined) {
                retry = setTimeout(() => {
                    retry = undefined;
                    void refresh();
                }, BROADCAST_RETRY_MS);
            }
            return;
        }
        syncCarousel();
    };

    /**
     * A re-read that could not be believed leaves what is on screen there,
     * dimmed. The condition is that there IS a card to keep — asking the card
     * list rather than the fetch kind, because a quote card is painted from
     * the seller's records and stands over an empty book too.
     */
    const markBroadcastStale = (): void => {
        if (state.view.broadcast === undefined) {
            return;
        }
        if (broadcastCards(withRail(state.view)).length === 0) {
            return;
        }
        if (state.view.broadcastState === 'stale') {
            return;
        }
        if (carousel !== undefined) {
            clearTimeout(carousel);
            carousel = undefined;
        }
        state = { ...state, view: { ...state.view, broadcastState: 'stale' } };
        livePaint();
    };

    /**
     * The overlay's cursor and its two one-shots, after a re-read that moved
     * what the carousel indexes.
     *
     * One function because there is one list: a book apply moves the listings
     * and a facts apply moves the quotes, and a cursor clamped on one path
     * only points past the end of the other. A different token at the cursor
     * is a new card and fades; the same card showing a different figure
     * pulses, a drop included.
     *
     * Mutates `next` in place, the way the apply that calls it builds it.
     */
    const carryBroadcastCursor = (
        prevCard: { kind: string; tokenId: string; figure: string } | undefined,
        next: StallView,
    ): void => {
        const params = next.broadcast;
        if (params === undefined) {
            return;
        }
        const cards = broadcastCards(withRail(next)).length;
        // The ticker's cursor is a PAGE, and its ribbon is rebuilt at the
        // wrap with no step and no pulse — the whole pass is the rebuild.
        const n = params.preset === 'ticker' ? tickerPages(cards, tickerStill) : cards;
        next.broadcastCursor =
            n === 0 ? 0 : (((state.view.broadcastCursor ?? 0) % n) + n) % n;
        if (state.view.broadcastState === 'stale') {
            next.broadcastState = params.mode === 'fixed' ? 'live' : 'rest';
        }
        if (params.preset === 'ticker') {
            return;
        }
        const nextCard = shownCard(withRail(next));
        if (prevCard === undefined || nextCard === undefined) {
            return;
        }
        if (prevCard.tokenId !== nextCard.tokenId || prevCard.kind !== nextCard.kind) {
            next.broadcastStepped = true;
            cardReplaced = true;
        } else if (prevCard.figure !== nextCard.figure) {
            next.broadcastPulse = true;
        }
    };

    /**
     * Open the pay sheet, then go and get a rate for it.
     *
     * The sheet opens first on purpose: a round trip before anything appears
     * would read as a control that did nothing, and the sheet's no-rate state
     * is an honest screen rather than a placeholder. The answer repaints it
     * once — a paint the buyer asked for, at the one moment they have typed
     * nothing into it yet.
     */
    const onOpenPay = (tokenId: string): void => {
        const claimed = generation;
        payRate = undefined;
        payRateWhy = undefined;
        payQuantity = undefined;
        payRecordMovedFor = undefined;
        payRecordMovedItems = [];
        // An XEC quote is the figure itself: no rate is read anywhere on its
        // sheet, so neither feed is asked — two requests to two third parties
        // for a number nobody uses, and two parties told a payment is being
        // composed (owner, 2026-09-07).
        const asks = !quoteNeedsNoRate(tokenId);
        const session = ++paySession;
        payRateAsking = asks;
        state = { ...state, view: { ...state.view, overlay: { kind: 'pay', tokenId } } };
        paint();
        if (!asks) {
            return;
        }
        void (async () => {
            await readPayRate(PAY_RATE_TIMEOUT_MS, session);
            if (session !== paySession) {
                // A later open owns the flag and the sheet now.
                return;
            }
            payRateAsking = false;
            // Only for the sheet that asked: a buyer who closed it, or moved
            // to another item, must not have it repainted under them. Every
            // answer repaints, a feed that did not answer included — the sheet
            // was saying "asking", and that sentence has to be replaced.
            if (
                claimed !== generation ||
                state.view.overlay.kind !== 'pay' ||
                state.view.overlay.tokenId !== tokenId
            ) {
                return;
            }
            if (rateForAnotherUnit()) {
                onPayRecordMoved(tokenId);
                return;
            }
            paint();
        })();
    };

    /**
     * The held rate was read for another unit than the open sheet now
     * composes in: the seller's record changed unit while the feeds were
     * being asked. The paint would carry no rate (`payRateUnit`), and "did
     * not answer" would be false, so the sheet is handled as a record that
     * moved under it — said, and its own unit asked for.
     */
    const rateForAnotherUnit = (): boolean =>
        payRate !== undefined && payRateUnit !== undefined && payRateUnit !== quoteUnitOnScreen();

    /** True for a quote written in XEC: its sheet reads no rate, so no feed is asked. */
    const quoteNeedsNoRate = (tokenId: string): boolean =>
        state.view.prices?.get(tokenId)?.code === XEC_PRICE_CODE;

    /**
     * The unit the open pay sheet's quote is written in.
     *
     * Read from the overlay rather than passed down, because the sheet's own
     * refresh control hands back only a timeout — and a rate read for the
     * wrong unit would put a figure on screen in one currency composed from
     * another's rate, which is the one mistake this whole rail is built to
     * make impossible. No sheet open is `usd`: the only other caller is the
     * `?pay=` landing, which opens one in the same turn.
     */
    const quoteUnitOnScreen = (): string => {
        const over = state.view.overlay;
        if (over.kind === 'pay-several') {
            // The selection's own unit — one per selection, its first item's.
            const code = selectionUnit(selection, state.view.prices);
            return code !== undefined && isQuoteUnit(code) ? code : DEFAULT_FIAT_CODE;
        }
        if (over.kind !== 'pay') {
            return DEFAULT_FIAT_CODE;
        }
        const code = state.view.prices?.get(over.tokenId)?.code;
        return code !== undefined && isQuoteUnit(code) ? code : DEFAULT_FIAT_CODE;
    };

    /**
     * "Pay several": the sheet over the whole selection, the single sheet's
     * road — opens first, asks the feeds only when the unit needs a rate,
     * repaints once for the sheet that asked.
     */
    const onOpenPaySeveral = (): void => {
        // Refused while a chosen item is one this read did not reach: the
        // strip says so in Pay's place, and a sheet over part of a choice
        // said "0 items · one payment" under a strip that said one.
        if (selection.size === 0 || unreadChosen(selection, state.view).length > 0) {
            return;
        }
        const claimed = generation;
        payRate = undefined;
        payRateWhy = undefined;
        payQuantity = undefined;
        payRecordMovedFor = undefined;
        payRecordMovedItems = [];
        selectionAsk = undefined;
        const asks = !selectionNeedsNoRate(selection, state.view.prices);
        const session = ++paySession;
        payRateAsking = asks;
        state = { ...state, view: { ...state.view, overlay: { kind: 'pay-several' } } };
        paint();
        if (!asks) {
            return;
        }
        void (async () => {
            await readPayRate(PAY_RATE_TIMEOUT_MS, session);
            if (session !== paySession) {
                return;
            }
            payRateAsking = false;
            if (claimed !== generation || state.view.overlay.kind !== 'pay-several') {
                return;
            }
            if (rateForAnotherUnit()) {
                onPayRecordMoved();
                return;
            }
            paint();
        })();
    };

    /**
     * A Pay press found the seller's record moved under its open sheet (the
     * critic's final merge, item 11). A sheet holds the live paint, so the
     * re-read that moved it is in `state.view` and not on screen: paint the
     * sheet again from the records as they stand — "Pay several"'s choice
     * pruned as every paint prunes it — saying so, and the next press is the
     * one that opens a wallet, the moved-rate valve's shape. The press sent
     * nothing. A record now in a unit the held rate was not read for asks
     * for its own rate, as an open does; until it answers the paint above
     * carries no rate (`payRateUnit`), so no figure is composed across units.
     */
    const onPayRecordMoved = (tokenId?: string): void => {
        const key = payOverlayKey(state.view.overlay);
        if (key === undefined || key !== (tokenId === undefined ? 'pay-several' : `pay:${tokenId}`)) {
            return;
        }
        // Judged against the records the sheet was painted from: the line
        // says what the buyer was shown moved, and names it on "Pay several".
        const moved = movedRecords(payPainted, recordsNow());
        if (moved.length > 0) {
            payRecordMovedFor = key;
            payRecordMovedItems = moved;
        }
        paint();
        const over = state.view.overlay;
        const composes =
            over.kind === 'pay' ? state.view.prices?.get(over.tokenId) !== undefined : selection.size > 0;
        const needs =
            over.kind === 'pay'
                ? !quoteNeedsNoRate(over.tokenId)
                : !selectionNeedsNoRate(selection, state.view.prices);
        const unit = quoteUnitOnScreen();
        if (!composes || !needs || (payRate !== undefined && payRateUnit === unit)) {
            return;
        }
        const claimed = generation;
        const session = ++paySession;
        payRate = undefined;
        payRateWhy = undefined;
        payRateAsking = true;
        paint();
        void (async () => {
            await readPayRate(PAY_RATE_TIMEOUT_MS, session, unit);
            if (session !== paySession) {
                return;
            }
            payRateAsking = false;
            if (claimed !== generation || payOverlayKey(state.view.overlay) !== key) {
                return;
            }
            if (rateForAnotherUnit()) {
                // Moved again while its own rate was asked for.
                onPayRecordMoved(tokenId);
                return;
            }
            paint();
        })();
    };

    /**
     * The touch wall's Pay press: the sheets' MOUNT path, and then a freeze.
     *
     * The same four things `onOpenPaySeveral` does — clear the held rate,
     * bump the session, say "asking", paint — so a second press five seconds
     * later cannot be answered by the first press's feed (the critic's
     * P2-6). The unit is passed explicitly (P1-1). The valve does not run: a
     * first press has no figure to move from, and `movedPastTolerance` with
     * no `before` answers "moved"; a re-press over a standing plate composes
     * the same selection again at a fresh rate, which is what the control
     * says it does. An XEC selection asks no feed at all.
     */
    /**
     * Close the wall's payment and cancel any press still waiting on a feed.
     * Bumping the session is what makes the cancellation real: `readPayRate`
     * writes nothing for a superseded ask, and `freezeWallPayment` refuses
     * to compose one.
     */
    const cancelWallPayment = (): void => {
        windowPaying = undefined;
        windowPayAged = false;
        windowPaySubDust = false;
        if (payRateAsking) {
            payRateAsking = false;
            paySession += 1;
        }
        if (windowPayingTimer !== undefined) {
            clearTimeout(windowPayingTimer);
            windowPayingTimer = undefined;
        }
    };

    const onWallPay = (): void => {
        const params = wallParams();
        // The phone's refusal, on the wall: no code over part of a choice.
        if (params === undefined || selection.size === 0 || unreadChosen(selection, state.view).length > 0) {
            return;
        }
        const claimed = generation;
        windowPaying = undefined;
        windowPayAged = false;
        payRate = undefined;
        payRateWhy = undefined;
        /*
         * The PRESS owns the payment, not the answer that lands eight seconds
         * later. The freeze is composed from what was chosen at this instant
         * — a tap during the ask used to be absorbed and then re-open the
         * plate from the new selection, and if that tap changed the unit the
         * code was composed at the old currency's rate: the cross-unit bug
         * the explicit unit argument was added to make impossible, back
         * through the door (the critic's P1-1, 2026-09-22). Every selection
         * handler bumps `paySession` too, so the answer to a cancelled press
         * is written nowhere.
         */
        const captured = {
            selection: new Map(selection),
            prices: new Map(state.view.prices ?? []),
        };
        const unit = selectionUnit(captured.selection, captured.prices);
        const asks = !selectionNeedsNoRate(captured.selection, captured.prices);
        const session = ++paySession;
        payRateAsking = asks;
        if (!asks) {
            freezeWallPayment(session, captured);
            paint();
            return;
        }
        paint();
        void (async () => {
            await readPayRate(PAY_RATE_TIMEOUT_MS, session, unit ?? DEFAULT_FIAT_CODE);
            if (session !== paySession || claimed !== generation) {
                return;
            }
            payRateAsking = false;
            freezeWallPayment(session, captured);
            paint();
        })();
    };

    /**
     * The snapshot itself: the satoshi sum, the URI, and the records and
     * names as they stand at this instant. Nothing on the plate is read from
     * the view again, so a records re-read cannot move a figure a camera is
     * pointed at; a prune or a price change closes the plate instead.
     */
    const freezeWallPayment = (
        session: number,
        captured: { selection: Map<string, bigint>; prices: Map<string, TokenPrice> },
    ): void => {
        if (session !== paySession) {
            return;
        }
        const { prices } = captured;
        const unit = selectionUnit(captured.selection, prices);
        const sats = selectionSats(captured.selection, prices, payRate?.rate);
        const address = state.view.address;
        if (unit === undefined || address === undefined) {
            return;
        }
        if (sats === undefined) {
            // A figure this page will not compose — no rate for the unit, or
            // a mixed selection. The strip's own line says which; a press
            // that quietly did nothing is what a customer presses again.
            return;
        }
        // Under the dust floor the network will not relay the output, so the
        // code would fail inside a wallet after the scan (§8): the strip says
        // so instead of composing one.
        if (sats < DUST_SATS) {
            windowPaySubDust = true;
            return;
        }
        windowPaySubDust = false;
        /*
         * **The wall's payment carries no memo, and that is a measurement**
         * (2026-09-22, the critic's P1-1). `STLP`'s second shape names the
         * items, and the phone sheet composes it — but the wall's one road
         * is a code read across a room, painted at 280–360px (`WINDOW_QR_PX`
         * and its floor), where a two-item memo is 5.28px a module and a
         * three-item one 4.91, under the only density this project has
         * proved (4.94). A memo that existed at two items and vanished at
         * three is worse than none; the payment always composes, and the
         * seller reads the items off the screen the customer chose them on.
         */
        const uri = payBip21(address, sats);
        if (uri === undefined) {
            return;
        }
        const frozenPrices = new Map<string, TokenPrice>();
        const names = new Map<string, string>();
        const borrowed = new Set<string>();
        for (const tokenId of captured.selection.keys()) {
            const price = prices.get(tokenId);
            if (price === undefined) {
                continue;
            }
            frozenPrices.set(tokenId, price);
            names.set(tokenId, tokenName(state.view.tokens, tokenId));
            if (state.view.genesis?.get(tokenId) === 'not-attributed') {
                borrowed.add(tokenId);
            }
        }
        windowPaying = {
            sats,
            uri,
            selection: new Map(captured.selection),
            prices: frozenPrices,
            names,
            borrowed,
            unit,
            ...(payRate === undefined ? {} : { rate: { ...payRate } }),
            atMs: Date.now(),
        };
    };

    /**
     * One fresh rate for the pay sheet: remembered here and handed back, with
     * **no paint**. The sheet holds the buyer's own quantity in a closure, and
     * `renderStall` opens with `replaceChildren()` — so a paint from this path
     * would throw away what they typed. The sheet refreshes itself in place.
     */
    const readPayRate = async (
        timeoutMs?: number,
        session: number = paySession,
        /**
         * The unit the figure is composed in. Passed explicitly wherever the
         * caller knows it — the wall has no overlay, and `quoteUnitOnScreen`
         * would have answered `usd` for a VND selection, composing a figure
         * in one currency from another's rate: the one mistake this rail is
         * built to make impossible (the critic's P1-1).
         */
        unit: string = quoteUnitOnScreen(),
    ): Promise<PayRateAnswer> => {
        // Two feeds, asked together, wherever this runs (the open, the `?pay=`
        // landing, the press-time valve, the refresh control) — **while
        // `SECOND_FEED` is on**. Paused (owner, 2026-09-23), the check is
        // not asked at all and the judge is handed nothing, so `check` is
        // `'none'` and the figure is the first feed's exactly as before: the
        // check never priced one. On, the second rides under its own,
        // shorter budget, so a hung check cannot hold the figure past the
        // primary's ceiling; at its deadline it is simply "unchecked".
        // Everything about what the two answers mean — the window, the
        // disagreement line, and that the check can only speak and never
        // price — is the domain's (`judgeRates`), not this file's. Neither
        // feed judges the glance (`refreshFiat`): that is `≈`, off the money
        // path, and has no sentence for absence (CLAUDE §8).
        //
        // A quote written in another unit adds ONE request: its own rate,
        // for the figure. The USD answer is still asked and still judges —
        // the window is written for USD, and the second feed (when on)
        // answers for USD alone, so that pair is the only place the fence and
        // the disagreement rule can run (`judgeQuoteRates`).
        const code = unit;
        const [primary, check, figure] = await Promise.all([
            fetchXecPrice(DEFAULT_FIAT_CODE, timeoutMs === undefined ? undefined : { timeoutMs }),
            SECOND_FEED === 'on'
                ? withDeadline(
                      fetchXecPriceCheck(DEFAULT_FIAT_CODE, { timeoutMs: PAY_CHECK_TIMEOUT_MS }),
                      PAY_CHECK_TIMEOUT_MS,
                  )
                : Promise.resolve(undefined),
            code === DEFAULT_FIAT_CODE
                ? Promise.resolve(undefined)
                : fetchXecPrice(code, timeoutMs === undefined ? undefined : { timeoutMs }),
        ]);
        const judged = judgeQuoteRates(code, figure, primary, check);
        const answer: PayRateAnswer =
            judged.kind === 'refused'
                ? { why: judged.why }
                : { rate: judged.rate, atMs: Date.now(), check: judged.check };
        if (session !== paySession) {
            // A superseded ask: the sheet that asked is gone or reopened.
            // Answered to its caller, written nowhere.
            return answer;
        }
        payRate =
            answer.rate === undefined
                ? undefined
                : { rate: answer.rate, atMs: answer.atMs, check: answer.check };
        payRateWhy = answer.rate === undefined ? answer.why : undefined;
        payRateUnit = answer.rate === undefined ? undefined : code;
        state = { ...state, view: { ...state.view, payRate, payRateWhy } };
        return answer;
    };

    const onOpenStall = (raw: string, pasted = false): void => {
        if (parseSellerParam(raw).kind === 'invalid') {
            return;
        }
        // The paste submit stamps the entry; `history.state` survives a reload
        // of it, so a seller who reloads their new stall keeps the invites,
        // and a demo press or a pinned open (no stamp) does not.
        history.pushState(pasted ? { pasted: true } : null, '', stallPath(raw));
        void refresh();
    };

    const onGoHome = (): void => {
        // Mark this door as chosen. `history.state` survives a reload of the
        // same entry, so a visitor who clicked "open another stall" and then
        // reloaded stays on the door instead of being snapped back to their
        // default stall. A freshly typed bare domain has null state and still
        // opens the default. See the cold-start block below.
        history.pushState({ door: true }, '', '/');
        void refresh();
    };

    /**
     * Remember one transaction, once — and let its **state** move afterwards.
     *
     * **Deduped by txid, first sighting kept, position kept.** chronik names one
     * transaction at least twice — added to the mempool, then confirmed, then
     * finalized — and a feed that listed a sale twice would be wrong about the
     * shop. A confirmation is not a new event, so the row does not re-front:
     * a reader watching the list must not see rows rearrange under them.
     *
     * What a later frame *does* change is how settled the row is. That update
     * happens in place, and only forwards (`strongerStatus`): a reorg
     * re-announced as a mempool arrival, or a replica that has not caught up,
     * would otherwise paint "not known to this page" over a state the chain
     * already proved.
     *
     * The Activity panel reads this, so the caller decides when to paint —
     * `readFacts` paints once per burst rather than once per transaction.
     */
    const recordEvent = (txid: string, row: StallEvent): void => {
        const at = events.findIndex((event) => event.txid === txid);
        if (at >= 0) {
            const prev = events[at]!;
            const status = strongerStatus(prev.status, row.status);
            // Structural, not by reference: `strongerStatus` mints a fresh
            // object when it merges two finalizations, and rebuilding the ring
            // for a state that did not actually move is churn nothing asked
            // for.
            if (sameStatus(status, prev.status)) {
                return;
            }
            const next = [...events];
            next[at] = { ...prev, ...(status === undefined ? {} : { status }) };
            events = next;
            state = { ...state, view: { ...state.view, events } };
            return;
        }
        events = [{ ...row, txid, seenAtMs: Date.now() }, ...events].slice(
            0,
            MAX_STALL_EVENTS,
        );
        state = { ...state, view: { ...state.view, events } };
    };

    /** Two answers a reader could not tell apart. */
    const sameStatus = (
        a: EventStatus | undefined,
        b: EventStatus | undefined,
    ): boolean => {
        if (a === undefined || b === undefined) {
            return a === b;
        }
        if (a.kind !== b.kind) {
            return false;
        }
        if (a.kind === 'finalized' && b.kind === 'finalized') {
            return a.avalanche === b.avalanche;
        }
        if (a.kind === 'in-block' && b.kind === 'in-block') {
            return a.height === b.height;
        }
        return true;
    };

    /**
     * When a burst last **proved** the book moved — a plugin entry with
     * groups, on an input or an output. The storefront effect is gated on
     * this: a message-triggered re-read whose burst proved nothing gets no
     * flourish, because its diff could as easily be a replica that lost a
     * row as a sale.
     */
    let bookProofAtMs = 0;

    /**
     * A hole in the ring, counted rather than hidden: the panel would
     * otherwise present a list with a piece missing as the whole story.
     */
    const recordGap = (): void => {
        activityGaps += 1;
        state = { ...state, view: { ...state.view, activityGaps } };
    };

    /**
     * What a scanned `?pay=` link opens, from the state the load answered
     * with — **once per page load**.
     *
     * Resolved against this stall's own records, never against the chain: the
     * parameter is a prefix of a token id and the pay set is the only place it
     * is looked for. Exactly one match opens the sheet through the same path
     * the Pay control uses; anything else opens nothing.
     *
     * Three outcomes rather than two, and the third is the whole point: a
     * screen that could not read the records must not report "no such item",
     * which is a claim about the seller made from our own failure (§4).
     */
    const applyPayHint = (next: AppState): AppState => {
        const hint = next.view.payHint;
        if (hint === undefined || payHintUsed) {
            return next;
        }
        payHintUsed = true;
        const matches = quotedItems(next.view).filter((item) =>
            item.tokenId.startsWith(hint),
        );
        if (matches.length === 1) {
            const tokenId = matches[0]!.tokenId;
            // A sheet already open holds a half-written record in the DOM and
            // nowhere else — on a failure screen the facts land after the
            // paint, and a seller may have opened the describe sheet in that
            // window. The link is answered from the records either way; it
            // may not swap a sheet out from under whoever opened it.
            // A sheet holds a half-written record or a buyer's own state; the
            // item face holds nothing typed, so the link replaces it — the
            // same table `livePaint` reads.
            if (holdsLivePaint(settled(next.view))) {
                return next;
            }
            // The rate comes from the same road the Pay control takes; the
            // sheet opens first and is repainted when it answers. The guard is
            // checked again after the await — a buyer who closed this sheet
            // and opened another item's has typed into that one by the time
            // a slow answer lands, and it must not be repainted under them.
            const claimed = generation;
            queueMicrotask(() => {
                if (
                    state.view.route.kind === 'pubkey' &&
                    state.view.overlay.kind === 'pay' &&
                    state.view.overlay.tokenId === tokenId &&
                    !quoteNeedsNoRate(tokenId)
                ) {
                    const session = ++paySession;
                    payRateAsking = true;
                    paint();
                    void (async () => {
                        await readPayRate(PAY_RATE_TIMEOUT_MS, session);
                        if (session !== paySession) {
                            return;
                        }
                        payRateAsking = false;
                        // The same gate `onOpenPay` keeps; every answer repaints,
                        // because the sheet is saying "asking" until it does.
                        if (
                            claimed !== generation ||
                            state.view.overlay.kind !== 'pay' ||
                            state.view.overlay.tokenId !== tokenId
                        ) {
                            return;
                        }
                        if (rateForAnotherUnit()) {
                            onPayRecordMoved(tokenId);
                            return;
                        }
                        paint();
                    })();
                }
            });
            payRecordMovedFor = undefined;
            payRecordMovedItems = [];
            return {
                ...next,
                view: { ...next.view, overlay: { kind: 'pay', tokenId } },
            };
        }
        // A withheld record is read and refused by this page's own rule —
        // neither "no such quote" nor "could not read", and no sheet.
        const withheldHit = [...(next.view.prices?.keys() ?? [])].some(
            (tokenId) =>
                tokenId.startsWith(hint) &&
                isWithheldToken(tokenId, next.view.tokens.get(tokenId)),
        );
        if (matches.length === 0 && withheldHit) {
            return {
                ...next,
                view: { ...next.view, payHintNote: 'withheld' },
            };
        }
        const routeKind = next.view.route.kind;
        /*
         * "Could not read" is about the records this link names, and the offer
         * book is not one of them — a quote needs no covenant, and the walk
         * that carries it runs whatever the agora plugin answered. So the
         * three fetch kinds do not appear here: what does is a walk that
         * failed or stopped at its cap, a route that never resolved (no
         * pubkey, so no walk was made at all), and a record whose token this
         * page holds no genesis for — `quotedItems` refuses that row because
         * it could be an NFT, and calling it "not quoted" would report our own
         * missing read as a fact about the seller.
         */
        const named = [...(next.view.prices?.keys() ?? [])].some((tokenId) =>
            tokenId.startsWith(hint),
        );
        const couldNotRead =
            routeKind === 'unresolved' ||
            routeKind === 'unresolvable' ||
            next.view.descriptionsTruncated === true ||
            next.view.descriptionsFailed === true ||
            (named && matches.length === 0);
        return {
            ...next,
            view: {
                ...next.view,
                payHintNote: couldNotRead ? 'unread' : 'unknown',
                // Only when there is something to bring into view, and only
                // for the paint that shows the note.
                ...(couldNotRead ? {} : { payHintScroll: true as const }),
            },
        };
    };

    /**
     * Which rail a stall opens on, decided **once** — on the first definite
     * fetch for that seller — and sticky from then on.
     *
     * `refresh()` paints the opening screen before the index is asked and a
     * live book lands after it, so a default recomputed at paint time would
     * say listings, flip to the quotes when the load landed and flip back on
     * the next message, all under a reader mid-sentence.
     *
     * A scanned `?pay=` link names an item on the quote rail, so it opens
     * there whether or not it matched. Otherwise the quotes win only when the
     * shop has nothing to browse and the seller has quoted something: a book
     * that **failed** is not a shop with nothing in it — it is a shop this
     * page could not read, and the screen that says so is the listings'.
     */
    const openingShopTab = (view: StallView): ShopTab => {
        if (view.payHint !== undefined) {
            return 'quotes';
        }
        return view.fetch?.kind === 'empty' && quotedItems(view).length > 0
            ? 'quotes'
            : 'listings';
    };
    /**
     * Whether `openingShopTab` answered from a read that could decide it. The
     * quotes win only over an `empty` book, and there the answer rests on the
     * records: a walk that threw (or has not answered) left a floor that may
     * hold none of the seller's quotes, and "listings" fixed off it would
     * keep a stall with nothing listed on its empty side for the rest of the
     * visit (the critic's fifth pass, 2026-09-24). Every other answer — a
     * `?pay=` link, a book with rows, a book that failed — is decided by the
     * book or the link alone.
     */
    const opensDecisively = (view: StallView): boolean =>
        view.payHint !== undefined || view.fetch?.kind !== 'empty' || recordsKnown(view);

    const refresh = async (): Promise<void> => {
        const claimed = ++generation;
        live?.close();
        live = undefined;
        clearBroadcastTimers();
        // A new stall is a new ring, and a new walk. These are transactions at
        // one address, and carrying either list across a route change would
        // attribute one seller's traffic to another.
        events = [];
        activityGaps = 0;
        walked = undefined;
        // Belt and braces beside the generation guard: a batch queued for the
        // stall just left must not carry its txids and statuses across.
        factsQueued = undefined;
        // Paint the parsed route before the index is asked, so a paste is not
        // a no-op while Chronik is in flight. Home is local; still cheap.
        // A shop window keeps what is on the wall while the read runs.
        //
        // The blanking repaint exists so a visitor who navigates sees the
        // stall's identity at once rather than the last one. On a wall, with
        // the heartbeat calling this every sixty seconds, it means losing the
        // seller's name, their look, their decorations and every row — and
        // printing "Opening…" — for the whole length of a full load, once a
        // minute, for ever. The broadcast refuses exactly this and keeps its
        // last-good card (`a-broadcast-failed-reread-is-stale-not-blank`); the
        // window inherited the opposite by taking this path.
        //
        // Only for the SAME stall: a navigation to another seller must not
        // leave the previous one's goods on screen under the new one's link.
        const opening = openingFromLocation();
        // Compared as STALLS, not as spellings (`pathNamesStall`). A stall
        // answers to its pubkey and its address, and this compared two
        // spellings twice over: first the prefixed address against the bare
        // payload, which never matched, then `stallPath(identityOf(view))`
        // against the path — and `identityOf` answers the address, so a wall
        // opened at `/s/<pubkey>` still never matched itself and blanked and
        // reset on every beat. A pubkey path is compared with the view's
        // resolved pubkey, an address path with its address, both through
        // the route's own parser (`a-wall-knows-its-own-stall-by-either-name`).
        const sameStall = wallParams() !== undefined && pathNamesStall(location.pathname, state.view);
        if (!sameStall) {
            state = opening;
            paint();
            // A new stall is a new screen. `events`, `walked` and
            // `factsQueued` are cleared above for the same reason, and these
            // carry one seller's remembered lock set, read time and cursor
            // onto another's wall if they are not — the shape of the
            // cross-stall contamination this project has already had once.
            windowLockSet = undefined;
            windowLockAt = undefined;
            windowCursorAt = 0;
            windowCardDueAt = undefined;
            windowRailAt = 'listings';
            broadcastRailAt = 'listings';
            windowTurnedAt = 0;
            windowTouchedAt = 0;
            bookReadAt = 0;
        }
        const next = await load();
        if (claimed !== generation) {
            return;
        }
        // Pages already walked for **this** stall in this page load come back:
        // a retry, or a Back to a stall already read, must not charge a reader
        // ten round trips for what this page is still holding. A different
        // stall finds nothing here, which is the clearing above.
        walked = walkedByStall.get(next.pubkeyHex ?? '');
        // The activity caption dates from here — the last full load — because
        // this function just emptied the ring; "since the page opened" would
        // claim coverage across a gap it cannot see.
        /*
         * A walk that threw, on a wall re-reading the SAME stall (the
         * heartbeat), keeps the last good records for every token it never
         * reached — and only those (`overKept`, the critic's sixth pass,
         * P1): the walk reads newest first, so a token it resolved before
         * the throw — a new figure, or a removal — is the seller's latest
         * word, and keeping the older read whole over it put a figure the
         * walk had read past on the wall and composed a payment at it. The
         * floor alone is not the seller's record either, and a wall with a
         * customer mid-choice must not repaint as if it were.
         *
         * **Names and attributions with them** (the fifth pass, P1):
         * `loadCurrent` builds `tokens` and `genesis` from the floor the
         * throw left, so the kept ids take the last read's names and
         * attributions wherever this load has none.
         *
         * **And said** (the owner, "Nói rõ"): while a kept record is shown
         * the view is `recordsStale`, so the wall prints
         * `WINDOW_QUOTES_AS_LAST_READ` where the book's freshness stamp would
         * claim the quotes were read just now. Taken from `lastGoodRecords`
         * rather than the view on screen, so a second walk that throws in a
         * row keeps the same records again. A book that failed too answers
         * the walk later, on the facts road, which keeps them the same way
         * (`applyPendingFacts`).
         */
        const keepFor =
            sameStall && lastGoodRecords !== undefined && lastGoodRecords.pubkeyHex === next.pubkeyHex
                ? lastGoodRecords
                : undefined;
        const keptRecords: Partial<StallView> =
            keepFor !== undefined && next.view.descriptionsFailed === true ? overKept(next.view, keepFor) : {};
        const loaded: AppState = {
            ...next,
            view: {
                ...next.view,
                ...keptRecords,
                watchedSinceMs: Date.now(),
                ...(walked === undefined ? {} : { history: walked }),
            },
        };
        // The first definite fetch for this seller decides the rail; a re-read
        // of a stall already open keeps whichever side the reader is on.
        if (next.pubkeyHex === undefined || next.pubkeyHex !== shopTabFor) {
            shopTab = openingShopTab(loaded.view);
            shopTabFor = next.pubkeyHex;
            shopTabSettled = opensDecisively(loaded.view);
            // A selection is one stall's (D7): a different seller starts empty.
            resetSelection();
            windowPaying = undefined;
        } else if (!shopTabSettled) {
            // The last load could not decide (an empty book beside a walk
            // that threw), and the reader has not chosen: this one may.
            shopTab = openingShopTab(loaded.view);
            shopTabSettled = opensDecisively(loaded.view);
        }
        // A scanned link is answered from the records, and on a failure screen
        // those arrive after this paint — judging the hint against the state
        // the failure returned would call the seller's own item unknown. The
        // pending apply asks instead, once it has them.
        state = next.pendingFacts === undefined ? applyPayHint(loaded) : loaded;
        // Only a definite answer is a read. Our own failures are not, and
        // stamping one tells a shop screen it is current because we
        // successfully failed — the live path guards this and said so, and
        // this line did not, one function away. Since the heartbeat is a full
        // `refresh()` every minute, an unstamped failure is what keeps a dead
        // router from reading as a fresh shelf for ever.
        const landed = next.view.fetch?.kind;
        if (landed === 'offers' || landed === 'empty') {
            bookReadAt = Date.now();
        }
        adoptFiatHint();
        paint();
        watch(claimed);
        syncBroadcastTimers();
        syncWindow();
        if (next.pendingFacts !== undefined) {
            applyPendingFacts(claimed, next.pendingFacts, keepFor);
        } else if (next.genesisPending !== undefined) {
            // The capped genesis reads, off the first paint: they land through
            // the same generation-guarded live paint a facts answer does.
            const pending = next.genesisPending;
            void fillQuotedGenesis(claimed, pending.pubkeyHex, pending.hash);
        }
    };

    /**
     * The facts a failure screen is still owed.
     *
     * `loadCurrent` returns the moment the book fails, with both walks still in
     * flight (`PendingFacts`), so this is where their answers land: the same
     * applies a live re-read uses, the same generation guard, and the same
     * `livePaint` gate that holds a paint back while a sheet is open. Nothing
     * is re-requested here — these are the reads the load already started.
     */
    const applyPendingFacts = (
        claimed: number,
        pending: PendingFacts,
        keepFor?: NonNullable<typeof lastGoodRecords>,
    ): void => {
        void (async () => {
            const lookup = await pending.manifest;
            if (claimed !== generation || lookup === undefined) {
                return;
            }
            applyManifest(lookup);
        })();
        void (async () => {
            const lookup = await pending.descriptions;
            if (claimed !== generation) {
                return;
            }
            if (lookup === undefined && keepFor === undefined) {
                // The walk answered nothing at all. Said on the view, because
                // a scanned link must not be told this stall quotes no such
                // item on the strength of a read that never happened.
                state = { ...state, view: { ...state.view, descriptionsFailed: true } };
            } else if (lookup === undefined) {
                // The same, on a wall re-reading its own stall: the last good
                // records stand for the whole of it, and say so.
                applyDescriptions({ ...NO_RECORDS, failed: true }, keepFor);
            } else {
                // A book that failed beside a walk that threw keeps the
                // wall's records too (the critic's sixth pass, item 7): the
                // same-stall rule `refresh` applies to a book that answered.
                applyDescriptions(lookup, keepFor);
                await fillRecordTokens(claimed, pending.pubkeyHex);
                if (claimed !== generation) {
                    return;
                }
            }
            answerPayHint();
            /*
             * Whose token each quote is, after the link has been answered and
             * never in front of it. A scanned code names an item this stall
             * either quotes or does not, and that answer is in the records
             * already read — putting a capped round of genesis reads before it
             * would leave a buyer looking at a spinner for a question nobody
             * asked. It repaints when it lands.
             */
            if (lookup !== undefined) {
                await fillQuotedGenesis(claimed, pending.pubkeyHex, pending.stall.hash);
            }
        })();
    };

    /**
     * Genesis facts for the tokens the seller's own records name, on the
     * screen where the book failed.
     *
     * `loadCurrent` makes this read after its own walk; here the walk answers
     * later, so the read follows it in the same place. A read that answers
     * nothing leaves those quotes off the page and unmentioned: our failure is
     * already on this screen once, and a count under a hosts box says it twice.
     *
     * Quoted **and** described, the same set `loadCurrent` reads: a record
     * with words and no figure paints no shop row, and still names a row on
     * the Studio's items card and an option in the describe picker.
     */
    const fillRecordTokens = async (claimed: number, pubkeyHex: string): Promise<void> => {
        const missing = [
            ...new Set([
                ...(state.view.prices?.keys() ?? []),
                ...(state.view.descriptions?.keys() ?? []),
            ]),
        ].filter((tokenId) => !state.view.tokens.has(tokenId));
        if (missing.length === 0) {
            return;
        }
        let metas: TokenMeta[];
        try {
            metas = await loadTokenMeta(createChronik(), missing);
        } catch {
            return;
        }
        if (claimed !== generation || metas.length === 0) {
            return;
        }
        const tokens: SessionTokenCache = new Map(state.view.tokens);
        for (const meta of metas) {
            sessionTokens.set(cacheKey(pubkeyHex, meta.tokenId), meta);
            tokens.set(meta.tokenId, meta);
        }
        state = { ...state, view: { ...state.view, tokens } };
        livePaint();
    };

    /**
     * Whose token each quoted item is, on the screen where the book failed.
     *
     * The walk's own free answers were folded in by `applyDescriptions`; this
     * is the `authPubkey` compare and the capped read that follow it, in the
     * same place `loadCurrent` runs them. A read that answers nothing leaves
     * those quotes undecided, which paints their icon and says nothing.
     */
    const fillQuotedGenesis = async (
        claimed: number,
        pubkeyHex: string,
        hash: string,
    ): Promise<void> => {
        // A withheld token is never painted, so its attribution is never
        // asked for — the reads are capped and shared with the real quotes.
        const quoted = [...(state.view.prices?.keys() ?? [])].filter(
            (tokenId) => !isWithheldToken(tokenId, state.view.tokens.get(tokenId)),
        );
        if (quoted.length === 0) {
            return;
        }
        try {
            await decideGenesis(
                createChronik(),
                pubkeyHex,
                hash,
                quoted,
                (tokenId) => state.view.tokens.get(tokenId),
            );
        } catch {
            return;
        }
        if (claimed !== generation) {
            return;
        }
        state = {
            ...state,
            view: { ...state.view, genesis: genesisFor(pubkeyHex, quoted) },
        };
        livePaint();
    };

    /**
     * What the scanned link opens, once the records it is resolved against are
     * on the view. A sheet the visitor asked for by scanning is painted at
     * once; a note about a link that opened nothing waits like any other paint
     * they did not ask for.
     */
    const answerPayHint = (): void => {
        const before = state.view.overlay.kind;
        state = applyPayHint(state);
        if (state.view.overlay.kind === before) {
            livePaint();
        } else {
            paint();
        }
    };

    /**
     * Everything one row needs to be named, from the stall this page is on.
     *
     * `wantedAttachmentTokens` reads the settings **currently** painted, which
     * is why a walked token move is labelled against today's decorations and
     * the panel says so: a row cannot know what the stall wore a year ago, and
     * inventing that is worse than naming the comparison.
     */
    const eventContext = (hash: string): EventContext => ({
        script: p2pkhOutputScript(hash),
        hash,
        wantedTokenIds: wantedAttachmentTokens(),
    });

    /** Hand the current walk to the view and paint it. */
    const applyHistory = (next: StallHistory): void => {
        walked = next;
        const key = state.pubkeyHex;
        // The in-flight state is never memoized. A refresh that lands while a
        // page is in the air abandons that read (the generation check below),
        // and a remembered `loading: true` would come back on the next visit
        // to this stall as a disabled control with nothing behind it.
        if (key !== undefined && next.loading !== true) {
            // Re-inserted, so the most recently walked stall is the last key
            // and the eviction below takes the least recently walked one.
            walkedByStall.delete(key);
            walkedByStall.set(key, next);
            while (walkedByStall.size > MAX_WALKED_STALLS) {
                const oldest = walkedByStall.keys().next().value;
                if (oldest === undefined) {
                    break;
                }
                walkedByStall.delete(oldest);
            }
        }
        state = { ...state, view: { ...state.view, history: next } };
        livePaint();
    };

    /**
     * Read one page of this stall's own history, from page zero.
     *
     * **Always from zero, never from "after the newest row the ring holds".**
     * Paging from N+1 would skip everything between the page load and the
     * first ask, so the overlap with the ring is deliberate: it is one page of
     * duplication against a hole nobody could see.
     *
     * One page in flight, so a reader pressing four times spends one round
     * trip rather than four. A page that throws is a hole in what **this page**
     * read — the rows already on screen stand, `failed` says so, and the same
     * control asks for the same page again. That is §4's rule about a failed
     * refetch, in a new place: our failure is never painted as a fact about
     * the seller.
     */
    const readHistoryPage = async (): Promise<void> => {
        const claimed = generation;
        const hash = state.view.route.kind === 'pubkey' ? hashOfStall() : undefined;
        const address = state.view.address;
        if (hash === undefined || address === undefined) {
            return;
        }
        const at: StallHistory = walked ?? { rows: [], pagesRead: 0 };
        if (at.loading === true || at.done === true || at.pagesRead >= MAX_ACTIVITY_PAGES) {
            return;
        }
        const page = at.pagesRead;
        applyHistory({ ...at, loading: true, failed: false });
        let answer;
        try {
            answer = await createChronik().address(address).history(page, HISTORY_PAGE_SIZE);
        } catch {
            if (claimed !== generation) {
                return;
            }
            // The page is not counted as read, so the retry asks for the same
            // one — and `done` is never set from a failure, because a page that
            // did not answer said nothing about where the history ends.
            applyHistory({ ...at, loading: false, failed: true });
            return;
        }
        if (claimed !== generation) {
            return;
        }
        const ctx = eventContext(hash);
        const rows = [...at.rows];
        const already = new Set(rows.map((row) => row.txid));
        for (const tx of answer.txs) {
            if (already.has(tx.txid)) {
                continue;
            }
            already.add(tx.txid);
            rows.push(mergeWithRing(historyEventOf(tx, ctx)));
        }
        const pagesRead = page + 1;
        applyHistory({
            rows,
            pagesRead,
            loading: false,
            failed: false,
            // Two different sentences, and only one of them is about the
            // seller: `done` is the end of their history, `capped` is our own
            // ceiling. Reporting the second as the first would be a claim made
            // from a guess (§5's rule about a truncated walk).
            done: pagesRead >= Math.max(answer.numPages, 1),
            capped: pagesRead >= MAX_ACTIVITY_PAGES,
        });
    };

    /**
     * A walked row, carrying anything the ring already proved about the same
     * transaction.
     *
     * Overlap between the two lists is normal — the walk starts at page zero —
     * and the ring can know things a walked page does not: plugin entries come
     * from the node that answered, and a `TX_FINALIZED` frame the socket
     * delivered is not in the history payload at all. The stronger fact wins;
     * neither list loses a row to the other.
     */
    const mergeWithRing = (row: StallEvent): StallEvent => {
        const seen = events.find((event) => event.txid === row.txid);
        if (seen === undefined) {
            return row;
        }
        const status = strongerStatus(row.status, seen.status);
        return {
            ...row,
            ...(row.book === undefined && seen.book !== undefined ? { book: seen.book } : {}),
            ...(status === undefined ? {} : { status }),
        };
    };

    /**
     * One token, on the seller's own ask: its genesis facts and whose mint it
     * was.
     *
     * **Answered, never painted.** The describe sheet is a half-written record
     * in the DOM and a `paint()` would throw it away, so the answer goes back
     * to the caller and the sheet refreshes itself in place. Memoized in the
     * session caches, so a seller flicking between two tokens asks once.
     */
    const lookupToken = async (
        tokenId: string,
    ): Promise<{ meta?: TokenMeta; attribution: GenesisAttribution }> => {
        const pubkeyHex = state.pubkeyHex;
        const hash = hashOfStall();
        // Gated as 64 hex before it reaches a request path: this one is typed
        // into a field, which is exactly where `loadManifest`'s hint comes from.
        if (pubkeyHex === undefined || hash === undefined || !TXID.test(tokenId)) {
            return { attribution: 'unknown' };
        }
        const key = cacheKey(pubkeyHex, tokenId);
        let meta = sessionTokens.get(key);
        if (meta === undefined) {
            try {
                const [read] = await loadTokenMeta(createChronik(), [tokenId]);
                if (read !== undefined) {
                    sessionTokens.set(key, read);
                    meta = read;
                }
            } catch {
                // No name is a smaller loss than a sheet that stops answering.
            }
        }
        try {
            await decideGenesis(createChronik(), pubkeyHex, hash, [tokenId], () =>
                sessionTokens.get(key),
            );
        } catch {
            // Undecided warns; it never refuses.
        }
        return { meta, attribution: sessionGenesis.get(key)?.state ?? 'unknown' };
    };

    /** The stall's hash160, from the key the route resolved to. */
    const hashOfStall = (): string | undefined => {
        const pubkeyHex = state.pubkeyHex;
        return pubkeyHex === undefined
            ? undefined
            : toHex(shaRmd160(fromHex(pubkeyHex)));
    };

    /**
     * Genesis facts for a token this page has never seen.
     *
     * A listing that arrives over the socket used to paint with no metadata at
     * all: the card showed the 64-character token id where the name goes, and
     * nothing corrected it until the visitor reloaded. Names and tickers come
     * from genesis and cannot go stale, so reading them once is honest.
     *
     * After the paint, never before it: the price moving is the thing the
     * socket woke us for, and it must not queue behind a token read — the same
     * ordering `loadCurrent` already keeps. The generation is re-checked after
     * the await, or a late read paints onto a stall the visitor has left.
     */
    const fillNewTokens = async (
        claimed: number,
        pubkeyHex: string,
        status: FetchStatus,
    ): Promise<void> => {
        if (status.kind !== 'offers') {
            return;
        }
        const missing = [
            ...new Set(
                status.offers
                    .map((o) => o.tokenId)
                    .filter((id) => !state.view.tokens.has(id)),
            ),
        ];
        if (missing.length === 0) {
            return;
        }
        let metas: TokenMeta[];
        try {
            metas = await loadTokenMeta(createChronik(), missing);
        } catch {
            // A name we could not read is not a reason to disturb the book.
            return;
        }
        if (claimed !== generation || metas.length === 0) {
            return;
        }
        const tokens: SessionTokenCache = new Map(state.view.tokens);
        for (const meta of metas) {
            sessionTokens.set(cacheKey(pubkeyHex, meta.tokenId), meta);
            tokens.set(meta.tokenId, meta);
        }
        state = { ...state, view: { ...state.view, tokens } };
        livePaint();
    };

    /**
     * The attachment tokens the page watches for, which is the whole minted
     * catalogue rather than the rows the painted record happens to wear.
     *
     * It decides two things: what the holdings read asks about, and — through
     * `classifyTx`'s `wantedTokenIds` — whether a token arriving at this
     * address is worth waking that read for. Narrowed to the worn rows, the
     * purchase of a decoration moved a token nobody was watching, so buying
     * one was invisible to the page until the seller published a flag blind.
     */
    const wantedAttachmentTokens = (): Set<string> => new Set(mintedAttachmentTokens());

    /**
     * The stall's own settings, re-read because something at its address looked
     * like a record.
     *
     * **Only a definite answer is applied.** A walk that threw leaves the
     * painted name, look and flags exactly where they were — the facts mirror
     * of `failed-refetch-is-not-empty`, and for the same reason: our failure
     * must never be painted as a statement about the seller. A walk that
     * finished and found nothing also leaves them standing, because a record on
     * chain cannot disappear; an absent one means we did not reach it.
     *
     * A record that is not yet finalised and not yet mined changes nothing
     * either, and nothing here has to know that: `pickManifestWinner` refuses
     * it, so the walk simply answers with the older winner. The `TX_FINALIZED`
     * message seconds later is another message, and it re-reads.
     */
    const refreshSettings = async (
        claimed: number,
        stall: { address: string; hash: string },
    ): Promise<void> => {
        let lookup;
        try {
            lookup = await loadManifest(createChronik(), stall);
        } catch {
            return;
        }
        if (claimed !== generation) {
            return;
        }
        applyManifest(lookup);
        // Always, even when no token moved in this burst: a flag switched on is
        // a decoration that needs an entitlement nothing else asked for.
        await refreshHoldings(claimed, stall.address);
    };

    /**
     * A settings answer, onto the view.
     *
     * Its own function because two roads reach it: a live re-read, and a walk
     * the failure screen started before it painted. The generation check
     * belongs to the caller — it is the one that knows when it awaited.
     */
    const applyManifest = (lookup: ManifestLookup): void => {
        const view: StallView = {
            ...state.view,
            // As the walk reports them: a capped walk and an undecodable record
            // are both things the seller has a right to be told, and both are
            // just as true now as they are on a full load.
            settingsTruncated: lookup.truncated,
            settingsUnreadable: lookup.unreadable,
            settingsUnaddressed: lookup.unaddressed,
            settingsRefusedNewer: lookup.refusedNewer,
        };
        const manifest = lookup.manifest;
        if (manifest !== undefined) {
            const flags = decodeAttachmentFlags(manifest.extras.get(ATTACHMENT_FLAGS_TAG));
            view.stallName = manifest.name;
            view.tagline = manifest.tagline;
            view.fiatHint = manifest.fiatHint;
            view.announcement = manifest.announcement;
            view.theme = manifest.theme;
            view.attachmentFlags = flags;
            // Recomputed here and not left to the holdings read below, because a
            // bit means a different row under a different theme: carrying the
            // old `worn` across a theme change would paint one look's decoration
            // on another's stall for as long as the entitlement read takes.
            view.worn = wornAttachments(manifest.theme.id, flags, view.heldTokens ?? NOTHING_HELD);
            const pubkeyHex = state.pubkeyHex;
            if (pubkeyHex !== undefined) {
                sessionNames.set(pubkeyHex, manifest.name);
                sessionThemes.set(pubkeyHex, manifest.theme);
            }
        }
        state = { ...state, view };
        adoptFiatHint();
        livePaint();
    };

    /**
     * Which of the wanted decoration tokens the stall address actually holds.
     *
     * No finality rule here, unlike the settings, and the asymmetry is stated
     * rather than discovered: a holding is read at mempool strength while a
     * record has to win `pickManifestWinner`. What bounds it is consent — only a
     * decoration the seller opted into in their own record can appear at all.
     */
    const refreshHoldings = async (claimed: number, address: string): Promise<void> => {
        const themeId = state.view.theme?.id ?? DEFAULT_THEME_ID;
        const flags = state.view.attachmentFlags ?? 0;
        let held: ReadonlySet<string> | undefined;
        try {
            held = await loadHeldTokens(
                createChronik() as never,
                address,
                wantedAttachmentTokens(),
            );
        } catch {
            return;
        }
        // `undefined` is a read that did not answer, never "holds none of them".
        // Applying it would take a decoration off because a node blinked.
        if (claimed !== generation || held === undefined) {
            return;
        }
        // The settings moved while this was in flight, so this answer is about a
        // question nobody is asking any more. Whoever changed them is reading
        // the holdings again.
        if (
            (state.view.theme?.id ?? DEFAULT_THEME_ID) !== themeId ||
            (state.view.attachmentFlags ?? 0) !== flags
        ) {
            return;
        }
        state = {
            ...state,
            view: {
                ...state.view,
                heldTokens: held,
                worn: wornAttachments(themeId, flags, held),
            },
        };
        livePaint();
    };

    /**
     * The seller's words about their tokens.
     *
     * A shop with no descriptions beats no shop, so `loadDescriptions` answers
     * rather than throwing — and it says which of the two it is answering with
     * (`failed`), because a walk that broke and a seller who wrote nothing
     * leave the same three empty maps.
     */
    const refreshDescriptions = async (
        claimed: number,
        stall: { address: string; hash: string },
    ): Promise<void> => {
        const lookup = await loadDescriptions(createChronik(), stall);
        if (claimed !== generation) {
            return;
        }
        applyDescriptions(lookup);
    };

    /**
     * A records answer, onto the view — from a live re-read, or from the walk
     * a failure screen started before it painted. The generation check belongs
     * to the caller, which is the one that knows when it awaited.
     *
     * **What is on screen is never replaced by an answer we cannot believe.**
     * A walk that threw carries what it managed to read, which is a floor and
     * not the seller's record — but a floor read newest block first, so every
     * token it resolved is the seller's latest word unless the records on
     * screen decided that token at a higher rank. So it adds to an empty view,
     * and over a full one it is merged per token (`overKept`, the critic's
     * eighth pass, item 3): refusing it whole, as this road did until
     * 2026-09-25, left a figure the walk had read past on a phone that has no
     * heartbeat to correct it, and Pay composed it. An empty answer from a
     * walk that finished is held
     * back for a different reason and only where there is something to lose:
     * `loadDescriptions` cannot see the difference between a seller who
     * removed their words and a walk that found none of them, so a removed
     * description survives until the next full load — the retry control and
     * any reload both are one.
     */
    const applyDescriptions = (lookup: DescriptionLookup, keptRead?: NonNullable<typeof lastGoodRecords>): void => {
        // The shelves and the prices ride the same records, so the same guard
        // covers all three: a wholly empty answer never erases any map already
        // on screen. Counting only two of them was not a smaller version of
        // this rule — a stall whose seller published prices and no words had
        // nothing on either counted side, so our own failed walk wiped every
        // figure and the guard saw nothing to protect.
        const gotNothing =
            lookup.descriptions.size === 0 &&
            lookup.shelves.size === 0 &&
            lookup.prices.size === 0;
        const hadSomething =
            (state.view.descriptions?.size ?? 0) > 0 ||
            (state.view.shelves?.size ?? 0) > 0 ||
            (state.view.prices?.size ?? 0) > 0;
        /*
         * A walk that threw, merged per token over records it may not simply
         * replace (`overKept`): what it resolved wins, a removal included,
         * unless the kept read decided that token at a higher rank; the kept
         * records fill every token it never reached; stale while a kept
         * record is shown. Two kept reads. On the facts road of a wall
         * re-reading its own stall beside a book that failed, the last good
         * records (`keptRead`, the critic's sixth pass, item 7 — the load's
         * own rule, `refresh`). On the live road, the records on screen
         * (the eighth pass, item 3): a phone has no heartbeat, so refusing
         * the walk's answer whole kept a figure it had read past until the
         * reader reloaded.
         */
        const onScreen = state.view;
        const over = !lookup.failed
            ? undefined
            : (keptRead ??
              (hadSomething
                  ? {
                        descriptions: onScreen.descriptions,
                        shelves: onScreen.shelves,
                        prices: onScreen.prices,
                        quoteTimes: onScreen.quoteTimes,
                        descriptionsTruncated: onScreen.descriptionsTruncated,
                        decided: decidedOf({ ...onScreen, decided: onScreen.descriptionsDecided }),
                        ranks: onScreen.descriptionRanks,
                        tokens: onScreen.tokens,
                        genesis: onScreen.genesis,
                    }
                  : undefined));
        if (over !== undefined) {
            const pubkeyHex = state.pubkeyHex;
            // The walk's free genesis answers, folded in as the whole-answer
            // road below folds them: `genesisFor` reads the session cache,
            // and a walk that threw may still have passed a genesis.
            if (pubkeyHex !== undefined) {
                for (const [tokenId, attribution] of lookup.genesis) {
                    rememberGenesis(pubkeyHex, tokenId, decisionOf(attribution, 'paid'));
                }
            }
            const kept = overKept(
                {
                    ...state.view,
                    descriptions: lookup.descriptions,
                    shelves: lookup.shelves,
                    prices: lookup.prices,
                    quoteTimes: lookup.quoteTimes,
                    descriptionsDecided: lookup.decided,
                    descriptionRanks: lookup.ranks,
                },
                over,
            );
            const prevCard =
                state.view.broadcast !== undefined ? shownCard(withRail(state.view)) : undefined;
            const merged: StallView = {
                ...state.view,
                ...kept,
                // Records on screen that were themselves a floor (a walk that
                // threw on a failure screen) do not become a finished read by
                // being merged with another floor.
                ...(keptRead === undefined && onScreen.descriptionsFailed === true
                    ? { descriptionsFailed: true }
                    : {}),
                genesis:
                    pubkeyHex === undefined || kept.prices === undefined
                        ? kept.genesis
                        : new Map([...(kept.genesis ?? []), ...genesisFor(pubkeyHex, kept.prices.keys())]),
            };
            carryBroadcastCursor(prevCard, merged);
            state = { ...state, view: merged };
            // On an overlay showing quotes, a card over kept records is
            // dimmed exactly as a failed book re-read leaves the listing card.
            if (merged.recordsStale === true && state.view.broadcast?.cards === 'quotes') {
                markBroadcastStale();
            }
            livePaint();
            if (state.view.broadcast !== undefined) {
                syncCarousel();
            }
            return;
        }
        if (gotNothing && hadSomething) {
            // A walk that finished and found nothing (a walk that threw is
            // merged above): not our failure and not said to be, but it
            // cannot be told from a seller who removed every word, so the
            // records on screen stand until a full load.
            // On an overlay showing quotes those figures came from this walk,
            // and this answer cannot be told from a seller who published
            // nothing — so the card already on screen stays, dimmed, exactly
            // as a failed book re-read leaves the listing card.
            if (state.view.broadcast?.cards === 'quotes') {
                markBroadcastStale();
            }
            return;
        }
        const prevCard =
            state.view.broadcast !== undefined ? shownCard(withRail(state.view)) : undefined;
        /*
         * The walk's free genesis answers, folded in rather than replaced.
         * `refreshDescriptions` builds its maps from scratch every time, and a
         * re-read that took the lokad branch sees no genesis at all — so
         * assigning this map wholesale would downgrade every token an earlier
         * read decided, and the editor would start refusing quotes on the
         * seller's own tokens seconds after the page opened.
         */
        const pubkeyHex = state.pubkeyHex;
        if (pubkeyHex !== undefined) {
            for (const [tokenId, attribution] of lookup.genesis) {
                rememberGenesis(pubkeyHex, tokenId, decisionOf(attribution, 'paid'));
            }
        }
        const nextFacts: StallView = {
            ...state.view,
            descriptions: lookup.descriptions,
            shelves: lookup.shelves,
            prices: lookup.prices,
            // The winning record's own clock, replaced with the maps it came
            // from: a time held over from an earlier walk would date this
            // walk's record from a record it never saw.
            quoteTimes: lookup.quoteTimes,
            // Both are about this page and neither is about the seller, and a
            // screen that reads them (the `?pay=` note) must read the walk it
            // actually got rather than the one the load made.
            descriptionsTruncated: lookup.truncated,
            descriptionsFailed: lookup.failed,
            descriptionsDecided: lookup.decided,
            descriptionRanks: lookup.ranks,
            // This walk's own answer replaces any records kept over an
            // earlier one that threw.
            recordsStale: undefined,
            recordsKept: undefined,
            genesis:
                pubkeyHex === undefined
                    ? state.view.genesis
                    : genesisFor(pubkeyHex, lookup.prices.keys()),
        };
        // The quotes are a card list too, and the shelves reorder the
        // listings, so a facts apply moves the carousel exactly as a book
        // apply does.
        carryBroadcastCursor(prevCard, nextFacts);
        state = { ...state, view: nextFacts };
        livePaint();
        if (state.view.broadcast !== undefined) {
            syncCarousel();
        }
    };

    /**
     * Everything, once. What a re-establish is owed: the socket was down for an
     * unknown length of time, and a settings record that arrived while it was
     * down is not going to be announced again.
     */
    /**
     * The reconnect's catch-up: everything, through the same one-at-a-time
     * road a burst takes, so a reconnect landing mid-walk queues rather than
     * doubling the walks.
     */
    const refreshAllFacts = async (
        claimed: number,
        stall: { address: string; hash: string },
    ): Promise<void> => {
        await readFacts(claimed, stall, [], undefined, true);
    };

    /**
     * One fact read at a time (audit 2026-09-08, F2). A burst arriving while
     * the previous one is still fetching and walking used to start a second
     * `readFacts` beside it, and a stall busy enough to overflow the burst
     * ceiling every block — nine of its own transactions in one block is
     * enough — stacked "ask everything" walks in every open tab. Now what
     * arrives mid-read is **merged and run once after**: the txids (so their
     * rows and finality frames still reach the ring), the statuses the socket
     * said, and the "ask everything" intent. Deferred, never dropped — the
     * floor §4 refuses is one that drops. A queued batch from a stall the
     * reader has since left is dropped by the generation guard, as any late
     * answer is.
     */
    let factsInFlight = false;
    /**
     * The queued batch carries **its own stall** (since 2026-09-09): the queue
     * shipped a day earlier keeping only the generation, and the drain ran
     * the next batch with the in-flight call's `stall` — so a burst at stall
     * B, queued behind a walk the reader started at stall A, was classified
     * against A's script (B's own record read "from another wallet" on the
     * public panel) and, on the "ask everything" road, painted A's name,
     * look and quotes over B's address. One `stall` per generation, so the
     * merge key stays `claimed`; the generation guard drops a batch from a
     * stall the reader left, and the field does the identity job.
     */
    let factsQueued:
        | {
              claimed: number;
              stall: { address: string; hash: string };
              txids: string[];
              said: Map<string, LiveTxStatus>;
              all: boolean;
          }
        | undefined;

    const readFacts = async (
        claimed: number,
        stall: { address: string; hash: string },
        txids: readonly string[],
        said?: ReadonlyMap<string, LiveTxStatus>,
        all = false,
    ): Promise<void> => {
        if (factsInFlight) {
            const queued =
                factsQueued !== undefined && factsQueued.claimed === claimed
                    ? factsQueued
                    : {
                          claimed,
                          stall,
                          txids: [],
                          said: new Map<string, LiveTxStatus>(),
                          all: false,
                      };
            for (const txid of txids) {
                if (!queued.txids.includes(txid)) {
                    queued.txids.push(txid);
                }
            }
            for (const [txid, status] of said ?? []) {
                queued.said.set(txid, status);
            }
            queued.all = queued.all || all;
            factsQueued = queued;
            return;
        }
        factsInFlight = true;
        try {
            // Each read under its own catch: a throw out of one (a paint over
            // a hostile string is the realistic source, and there is no
            // logger to hear it) must not strand what is queued behind it
            // until some later burst — "deferred, never dropped" has to hold
            // on the quiet stall too, where no later burst comes.
            try {
                await readFactsNow(claimed, stall, txids, said, all);
            } catch {
                // The queue still drains.
            }
            while (factsQueued !== undefined) {
                const next = factsQueued;
                factsQueued = undefined;
                if (next.claimed !== generation) {
                    continue;
                }
                try {
                    await readFactsNow(next.claimed, next.stall, next.txids, next.said, next.all);
                } catch {
                    // As above.
                }
            }
        } finally {
            factsInFlight = false;
        }
    };

    /**
     * What one burst of transactions could have changed.
     *
     * The script subscription carries everything the stall address touches, and
     * most of that is ordinary money. Walking the settings and description
     * indexes for each of those would turn a refund into two capped walks in
     * every open tab, so each transaction is fetched once and read with the same
     * predicates the readers use.
     *
     * **What cannot be classified asks everything.** A txid we could not fetch,
     * or a message that carried none, is a transaction we cannot rule out —
     * asking costs two capped walks, and guessing "nothing" costs the seller a
     * settings publish that never lands.
     */
    const readFactsNow = async (
        claimed: number,
        stall: { address: string; hash: string },
        txids: readonly string[],
        said?: ReadonlyMap<string, LiveTxStatus>,
        all = false,
    ): Promise<void> => {
        const ctx = eventContext(stall.hash);
        const chronik = createChronik();
        let facts = all ? ALL_FACTS : NO_FACTS;
        let ringMoved = false;
        for (const txid of txids) {
            if (!TXID.test(txid)) {
                // A hole, counted — never a `break`: breaking dropped every
                // later txid in the burst from the ring with nothing to say a
                // piece was missing (PLAN-REDESIGN P3.5, critic finding 4).
                facts = ALL_FACTS;
                recordGap();
                ringMoved = true;
                continue;
            }
            let tx;
            try {
                tx = await chronik.tx(txid);
            } catch {
                facts = ALL_FACTS;
                recordGap();
                ringMoved = true;
                continue;
            }
            if (claimed !== generation) {
                return;
            }
            const classified = classifyTx(tx, ctx.script, ctx.wantedTokenIds);
            const row = historyEventOf(tx, ctx);
            if (row.book !== undefined) {
                bookProofAtMs = Date.now();
            }
            // One event per transaction that was actually read. A txid that was
            // never fetched has no kind to give it, and inventing `other` for
            // one would put a claim in the ring that nothing checked.
            //
            // The state comes from the **frame** as well as the fetch: chronik
            // has just told this page a transaction is finalized, and the
            // stronger of the two answers is the one that stands. The row's
            // authority (`recordAuthority`) was set by `historyEventOf` with
            // the readers' own predicates — it is not re-derived here.
            row.status = strongerStatus(row.status, statusFromMessage(said?.get(txid)));
            recordEvent(txid, row);
            ringMoved = true;
            facts = unionFacts(facts, walkableFacts(classified, tx, stall.hash));
        }
        if (claimed !== generation) {
            return;
        }
        // The activity panel reads the ring, so a burst that changed it is a
        // paint — through `livePaint`, which holds off while a record is being
        // composed. A burst of ordinary payments changes no fact and used to
        // paint nothing; now the feed is on screen, it is the fact.
        if (ringMoved) {
            livePaint();
        }
        if (!anyFact(facts)) {
            return;
        }
        // Each reader runs at most once for a burst, however many transactions
        // named it. `refreshSettings` ends by reading the holdings, so asking
        // for both is one call, not two.
        if (facts.settings) {
            await refreshSettings(claimed, stall);
        } else if (facts.holdings) {
            await refreshHoldings(claimed, stall.address);
        }
        if (facts.descriptions) {
            await refreshDescriptions(claimed, stall);
        }
    };

    /**
     * Keep the painted book current. Only a fact about the seller is applied:
     * a refetch that fails leaves the last good list on screen rather than
     * turning a working stall into an error, and the offers are replaced
     * without disturbing an open expander.
     */
    const watch = (claimed: number): void => {
        const pubkeyHex = state.pubkeyHex;
        if (pubkeyHex === undefined) {
            watchWaiting(claimed);
            return;
        }
        // An empty stall is watched too. It is the one screen that promises
        // "anything they list will appear here on its own", and it was the one
        // screen with nothing listening: a seller's first offer never arrived
        // until the visitor reloaded.
        const kind = state.view.fetch?.kind;
        if (kind !== 'offers' && kind !== 'empty') {
            return;
        }
        const hash = toHex(shaRmd160(fromHex(pubkeyHex)));
        const stall = { address: state.view.address ?? p2pkhAddress(pubkeyHex), hash };
        /**
         * Which book re-read is the newest (since 2026-09-09). `onChanged`
         * fires one read per trigger with no guard between them, and two in
         * flight can land out of order when the first host's latency
         * differs by more than a burst between two requests: the older book
         * then painted over the newer — a row that had just sold came back.
         * Only the newest read applies; an older definite answer landing
         * after a newer failed one is dropped too, which is §4's direction
         * (our failure never paints, the last good book stands).
         */
        let bookSeq = 0;
        live = watchStall(
            createChronik() as never,
            { pubkeyHex, hash },
            {
                onChanged: (trigger) => {
                    const seq = ++bookSeq;
                    void (async () => {
                        let status: FetchStatus;
                        try {
                            status = await loadOffers(
                                agoraOfferReader(createChronik()),
                                pubkeyHex,
                            );
                        } catch {
                            // `loadOffers` answers rather than throws for
                            // everything it foresees, so a rejection here is
                            // something it did not — and an unhandled one on a
                            // page that is otherwise fine. The painted book
                            // stands, exactly as it does for an answer that is
                            // not definite.
                            markBroadcastStale();
                            return;
                        }
                        if (claimed !== generation || seq !== bookSeq) {
                            return;
                        }
                        if (!isDefiniteResult(status)) {
                            if (isBroadcastFailure(status.kind)) {
                                markBroadcastStale();
                            }
                            return;
                        }
                        // The flourish, strictly gated: a message-triggered
                        // read, inside the window of a burst whose plugin
                        // entries proved the book moved. A recheck's diff is
                        // replica skew as often as news, and a proof-less
                        // message diff could be a replica that lost a row —
                        // neither may stage our failover as a sale.
                        const proven =
                            trigger === 'message' &&
                            Date.now() - bookProofAtMs < 15_000;
                        const changed = proven
                            ? changedTokens(state.offers, status)
                            : undefined;
                        const prevCard =
                            state.view.broadcast !== undefined
                                ? shownCard(withRail(state.view))
                                : undefined;
                        const nextFetch: StallView = {
                            ...state.view,
                            fetch: status,
                            justChanged:
                                changed !== undefined && changed.size > 0
                                    ? changed
                                    : undefined,
                        };
                        carryBroadcastCursor(prevCard, nextFetch);
                        // A definite answer is a read; our own failures are
                        // not, and stamping one would tell a shop screen it is
                        // current because we successfully failed.
                        if (status.kind === 'offers' || status.kind === 'empty') {
                            bookReadAt = Date.now();
                        }
                        state = {
                            ...state,
                            offers: status.kind === 'offers' ? status.offers : [],
                            view: nextFetch,
                        };
                        livePaint();
                        // One shot: the paint above showed it; nothing may
                        // replay it — not a fiat answer, not a holdings read.
                        if (state.view.justChanged !== undefined) {
                            state = {
                                ...state,
                                view: { ...state.view, justChanged: undefined },
                            };
                        }
                        if (state.view.broadcast !== undefined) {
                            syncCarousel();
                        }
                        await fillNewTokens(claimed, pubkeyHex, status);
                    })();
                },
                onBurst: (txids, said) => {
                    void readFacts(claimed, stall, txids, said);
                },
                onReestablished: () => {
                    // What happened while the socket was down is unknown, and
                    // the ring cannot show it — say so rather than letting the
                    // feed read as complete across the gap.
                    recordGap();
                    livePaint();
                    void refreshAllFacts(claimed, stall);
                },
            },
        );
    };

    /**
     * The two screens that are waiting rather than shopping.
     *
     * An address that has never spent is the first screen many sellers see —
     * they paste the address they sell from before they have listed anything,
     * which is the order the apex invites. A listing is a spend, and a spend is
     * what reveals the key, so the answer arrives on its own if anything is
     * watching. Nothing was.
     *
     * The socket lives in the same `live` variable as a resolved stall's, so
     * `refresh()` closes it and the visibility handler pauses it — one
     * lifecycle, not two. There is no pubkey here, so no agora group and no
     * plugin subscription: the script subscription is the whole watch.
     */
    const watchWaiting = (claimed: number): void => {
        const route = state.view.route;
        if (route.kind !== 'unresolvable' && route.kind !== 'unresolved') {
            return;
        }
        const parsed = parseSellerParam(route.address);
        if (parsed.kind !== 'address') {
            return;
        }
        live = watchStall(
            createChronik() as never,
            { hash: parsed.hash.toLowerCase() },
            {
                // No `onChanged` on purpose. That hook also rides
                // `MIN_REREAD_MS` on a reconnect, and the floor **drops** — safe
                // for a book, whose next message corrects it, and wrong for a
                // resolve, which nothing announces twice.
                onBurst: () => {
                    void tryResolve(claimed, parsed);
                },
                onReestablished: () => {
                    void tryResolve(claimed, parsed);
                },
            },
        );
    };

    /**
     * Ask again whether this address has revealed a public key.
     *
     * **Only a success changes anything on screen.** A walk that found nothing,
     * and a walk that threw, both leave the waiting screen exactly as it is: no
     * `opening` flash, and never an `unreachable` painted over a true
     * `unresolvable`, which would be the empty-versus-unreachable collapse
     * arriving by a new road. A receive fires a message and reveals no key —
     * `pubkeyFromSpends` reads inputs — so finding nothing is the ordinary case
     * here, and the screen only ever promised what a spend does.
     */
    const tryResolve = async (claimed: number, parsed: RouteParse): Promise<void> => {
        let route;
        try {
            route = await resolveSeller(parsed, createChronik());
        } catch {
            return;
        }
        if (claimed !== generation || route.kind !== 'pubkey') {
            return;
        }
        void refresh();
    };

    window.addEventListener('popstate', () => {
        void refresh();
    });

    /**
     * A backgrounded tab does not need a socket, and holding one is how a
     * sleeping laptop wakes into a reconnect spin: chronik-client retries with
     * no backoff, and each retry asked this page for the offers again. The
     * library provides `pause`/`resume` for exactly this and says the app must
     * drive them, because it cannot predict what an OS does to a socket.
     *
     * Lives here rather than in `net/`, where `directory-walls` forbids
     * `document` — and this is the app's lifecycle to own anyway.
     */
    /*
     * A person touching the shop window takes it back from the driver.
     *
     * On the document and attached once, because `renderStall` throws the tree
     * away on every paint and a listener on the strip would be re-attached (or
     * silently lost) on every socket tick. Passive and capturing: this only
     * reads the clock, and a scroll listener that is not passive is a scroll
     * listener that can stutter a whole screen.
     *
     * `mousemove` is not on the list on purpose — see `WINDOW_TOUCHES`.
     */
    /*
     * The ticker's wrap (2026-09-21). Delegated on the document, capturing,
     * because `renderStall` throws the tree away on every paint and a
     * listener on the ribbon would be lost with it. Only the ribbon's own
     * keyframe counts: the pulse and the card fade fire the same event.
     */
    document.addEventListener(
        'animationiteration',
        (event) => {
            if ((event as AnimationEvent).animationName === 'tk-run') {
                onTickerWrap();
            }
        },
        { capture: true },
    );
    /*
     * A reduce toggle mid-pass cancels the ribbon's animation, so no wrap
     * ever arrives to release the hold; the preference is re-read here and
     * the ticker repainted at once — still and paging, or moving again.
     */
    motionQuery()?.addEventListener?.('change', (event) => {
        tickerStill = event.matches;
        if (state.view.broadcast?.preset === 'ticker') {
            tickerRunning = false;
            paint();
        }
    });

    for (const kind of WINDOW_TOUCHES) {
        document.addEventListener(
            kind,
            () => {
                if (wallParams() !== undefined) {
                    windowTouchedAt = Date.now();
                }
            },
            { passive: true, capture: true },
        );
    }

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            live?.pause();
        } else {
            live?.resume();
        }
        // A hidden tab asks no feed; a tab coming back — a device waking, a
        // window fronted — asks again if what it holds is past its window.
        // This is the only road for a sleep: the timer does not run while
        // hidden, and a browser throttles it there anyway.
        syncGlance();
    });
    // Cold start only. Someone who typed the bare domain gets the stall they
    // chose; `replaceState` rather than `pushState` so Back leaves the site
    // instead of bouncing between the door and the stall. In-app navigation to
    // `/` still paints the door, which is what the Open-another-stall control
    // is for.
    const saved = readSavedStall();
    const choseTheDoor = (history.state as { door?: boolean } | null)?.door === true;
    if (saved !== undefined && isHomePath(location.pathname) && !choseTheDoor) {
        history.replaceState(null, '', stallPath(saved));
    }
    // A stall path in capitals, or with a literal colon, is the same stall;
    // the share field, the share QR and every landing link read
    // `location.pathname` verbatim, so a visitor who arrived by such a link
    // would print it onward. Rewritten in place, search and state kept: the
    // `?pay=` hint is still applied once from this load, and the entry's own
    // `pasted` / `door` stamp survives.
    const here = sellerFromPath(location.pathname);
    if (here !== undefined) {
        const canonical = stallPath(here);
        if (canonical !== location.pathname) {
            history.replaceState(history.state, '', `${canonical}${location.search}`);
        }
    }
    void refresh();
}

async function loadCurrent(): Promise<AppState> {
    if (isHomePath(location.pathname)) {
        return withUrlParams({
            view: { route: { kind: 'home' }, overlay: { kind: 'idle' }, tokens: new Map() },
            offers: [],
        });
    }

    const raw = sellerFromPath(location.pathname);
    if (raw === undefined) {
        return withUrlParams({
            view: {
                route: { kind: 'invalid', raw: location.pathname },
                overlay: { kind: 'idle' },
                tokens: new Map(),
            },
            offers: [],
        });
    }

    const parsed = parseSellerParam(raw);
    const hint = new URLSearchParams(location.search).get('m') ?? undefined;
    const chronik = createChronik();

    let route;
    try {
        route = await resolveSeller(parsed, chronik);
    } catch (routeErr) {
        if (parsed.kind === 'invalid') {
            return withUrlParams({
                view: {
                    route: { kind: 'invalid', raw: parsed.raw, why: parsed.why },
                    overlay: { kind: 'idle' },
                    tokens: new Map(),
                },
                offers: [],
            });
        }
        if (parsed.kind === 'pubkey') {
            return withUrlParams({
                view: {
                    route: {
                        kind: 'pubkey',
                        pubkeyHex: parsed.pubkeyHex,
                        address: p2pkhAddress(parsed.pubkeyHex),
                    },
                    fetch: unreachableNow(routeErr),
                    overlay: { kind: 'idle' },
                    address: p2pkhAddress(parsed.pubkeyHex),
                    tokens: new Map(),
                },
                offers: [],
            });
        }
        return withUrlParams({
            view: {
                route: { kind: 'unresolved', address: parsed.address },
                fetch: unreachableNow(routeErr),
                overlay: { kind: 'idle' },
                address: parsed.address,
                tokens: new Map(),
            },
            offers: [],
        });
    }

    if (route.kind !== 'pubkey') {
        return withUrlParams({
            view: { route, overlay: { kind: 'idle' }, tokens: new Map(), address: addressOf(route) },
            offers: [],
        });
    }

    const reader = agoraOfferReader(chronik);
    const address = route.address ?? p2pkhAddress(route.pubkeyHex);
    const hash = toHex(shaRmd160(fromHex(route.pubkeyHex)));
    const cachedName = sessionNames.get(route.pubkeyHex);
    const cachedTheme = sessionThemes.get(route.pubkeyHex);

    /**
     * The two reads that need only an address and a hash, started here rather
     * than after the offers.
     *
     * They were sequential purely by the order they were written in, and it
     * cost the visitor dearly: measured from source, the seven awaits in this
     * function are up to 34 round trips before a price can be painted, and 22
     * of them belong to decoration. Neither of these depends on the offers, on
     * token metadata, or on each other.
     *
     * Nothing is dropped by starting them early, and nothing is skipped — the
     * same requests are made, in the same numbers. Only the waiting overlaps.
     *
     * The rejection is caught at the point of creation, not at the point of
     * use: the offers branch below can return before either is awaited, and a
     * promise that rejects with nobody listening is an unhandled rejection.
     */
    /**
     * Both walks below head the same address history, and each compares it
     * against its own lokad index — so page 0 of the address is one answer
     * asked twice in the same instant. Shared as a promise, not a cache:
     * live re-reads make their own requests. No `.catch` here — the
     * descriptions walk consumes it synchronously, so a rejection always
     * has a handler, and both loaders degrade exactly as they would had
     * their own copy of the request failed (same client, same failover).
     * A round-trip politeness to the index, not a speed-up: all four head
     * requests already flew concurrently.
     */
    const addrPageSoon = chronik.address(address).history(0, HISTORY_PAGE_SIZE);
    const descriptionsSoon = loadDescriptions(chronik, { address, hash }, addrPageSoon).catch(
        () => undefined,
    );
    const manifestSoon = loadManifest(chronik, { address, hash }, hint, addrPageSoon).catch(
        () => undefined,
    );

    let fetch: FetchStatus;
    try {
        fetch = await loadOffers(reader, route.pubkeyHex);
    } catch (err) {
        fetch = unreachableNow(err);
    }

    if (
        fetch.kind === 'unreachable' ||
        fetch.kind === 'plugin-missing' ||
        fetch.kind === 'unreadable'
    ) {
        /*
         * The failure paints now, and the facts land when they land.
         *
         * Both walks are in flight and neither is awaited here: they are capped
         * page walks over three hosts, and putting them in front of a screen
         * whose whole job is to say quickly that we failed would cost a visitor
         * every one of those timeouts before anything appeared. `boot` applies
         * their answers afterwards, through the paths a live re-read uses.
         *
         * Nothing remembered from an earlier visit travels onto this screen —
         * no name, no look, no token metadata. A shop this session cached may
         * have closed since, and a failure screen has no way to tell; what it
         * may show is what this load itself read.
         */
        return withUrlParams({
            view: {
                route,
                fetch,
                overlay: { kind: 'idle' },
                address,
                tokens: new Map(),
            },
            offers: [],
            pubkeyHex: route.pubkeyHex,
            pendingFacts: {
                stall: { address, hash },
                pubkeyHex: route.pubkeyHex,
                manifest: manifestSoon,
                descriptions: descriptionsSoon,
            },
        });
    }

    const offers = fetch.kind === 'offers' ? fetch.offers : [];
    const metas = await loadTokenMeta(
        chronik,
        offers.map((o) => o.tokenId),
    );
    for (const meta of metas) {
        sessionTokens.set(cacheKey(route.pubkeyHex, meta.tokenId), meta);
    }

    /**
     * Which collection each NFT was minted from. A request per NFT — the parent
     * id is not on `chronik.token()`, it is on the genesis transaction — so it
     * is capped, and a stall past the cap shows its NFTs ungrouped rather than
     * grouped from half the answer. Never throws: an ungrouped NFT is a much
     * smaller loss than a stall that fails to paint.
     */
    const byId = new Map(metas.map((m) => [m.tokenId, m]));
    const nftLookup = await loadNftGroups(
        chronik,
        offers.map((o) => o.tokenId),
        (id) => isNftChild(byId.get(id)),
    );
    // The collection's own name is another read, and one per collection rather
    // than one per NFT. A heading falls back to the group id without it.
    const groupMetas = await loadTokenMeta(chronik, groupIdsToName(nftLookup, byId));
    for (const meta of groupMetas) {
        sessionTokens.set(cacheKey(route.pubkeyHex, meta.tokenId), meta);
    }

    /**
     * The seller's words about their tokens, and the stall's own settings.
     * Both were started before the offers and have been running since; by the
     * time the token walk above is done they are usually already answered.
     *
     * `loadDescriptions` never throws by design — a shop with no descriptions
     * beats no shop — so an `undefined` here is the rejection guard above
     * firing, and reads the same as a walk that found nothing.
     */
    const descriptionLookup: DescriptionLookup = (await descriptionsSoon) ?? { ...NO_RECORDS, failed: true };

    let stallName = cachedName;
    let theme = cachedTheme;
    let tagline: string | undefined;
    let fiatHint: string | undefined;
    let announcement: string | undefined;
    let settingsTruncated = false;
    let settingsUnreadable = false;
    let settingsUnaddressed = false;
    let settingsRefusedNewer = false;
    let attachmentFlags = 0;
    {
        const lookup = await manifestSoon;
        if (lookup !== undefined) {
            settingsTruncated = lookup.truncated;
            settingsUnreadable = lookup.unreadable;
            settingsUnaddressed = lookup.unaddressed;
            settingsRefusedNewer = lookup.refusedNewer;
            const manifest = lookup.manifest;
            if (manifest) {
                stallName = manifest.name;
                theme = manifest.theme;
                tagline = manifest.tagline;
                fiatHint = manifest.fiatHint;
                announcement = manifest.announcement;
                // One tagged field, read by its tag rather than its position.
                // A payload that is not two bytes, or a bit with no row in this
                // theme's table, is nothing at all — never a reason to refuse
                // the record and never a note to a visitor, because a missing
                // decoration is not a lie about money.
                attachmentFlags = decodeAttachmentFlags(
                    manifest.extras.get(ATTACHMENT_FLAGS_TAG),
                );
                sessionNames.set(route.pubkeyHex, manifest.name);
                sessionThemes.set(route.pubkeyHex, manifest.theme);
            }
        }
        // A walk that failed leaves the session name and theme standing, which
        // is what the guard on `manifestSoon` above turns a rejection into.
    }

    /*
     * The holdings read: the entitlement for a worn decoration, and — since
     * the picker lists the tokens this wallet can still mint — the mint
     * batons, so every stall open makes this one request, a single round
     * after the manifest (the comment that said a stall wearing nothing never
     * asks was stale from 2026-09-05 to 09-08). It fails closed and silently
     * for a visitor — a missing beetle is not a lie about money — and the
     * picker is where a seller is told, because that is where we know a
     * seller is looking.
     */
    let heldTokens: ReadonlySet<string> | undefined;
    let mintedHere: ReadonlySet<string> | undefined;
    {
        // Every minted row, not the ones this record already wears: a stall
        // that has never worn anything used to ask about nothing, so the
        // seller who had just bought a decoration was told they did not hold
        // it. Same one `utxos()` call either way (`loadHoldings` filters
        // locally), and now a purchase is a question this page has asked.
        const wanted = mintedAttachmentTokens();
        // One utxo read per stall open, two answers: which decorations the
        // address holds, and which tokens it holds a mint baton for — the
        // seller's own product, the way a freshly minted token reaches the
        // studio without its id pasted by hand (owner, 2026-09-05). The
        // derived p2pkh when the route was a bare key: §3 says the stall
        // address is that, and it is the address both are held at.
        const holdings = await loadHoldings(createChronik() as never, address, wanted);
        // `undefined` means the read did not answer, and nothing else: the
        // question is never empty now, so an absent set can no longer be our
        // own unasked question filed as a fact about the seller (§4).
        heldTokens = holdings?.held;
        mintedHere = holdings?.mintedHere;
    }

    /*
     * Genesis facts for the tokens the seller's own records name, and for the
     * ones this wallet can still mint — none of which the book carries.
     *
     * A second read, and deliberately after the descriptions answered rather
     * than folded into the first: that one runs in parallel with this walk on
     * purpose (see `addrPageSoon`), and widening it would make the offers wait
     * for a set that does not exist until the walk is done.
     *
     * A read that fails leaves those rows unpainted and counted — a quote
     * whose genesis this page never saw could be an NFT, and a quote per whole
     * token means nothing about one.
     *
     * **Described, not only quoted.** It asked about the priced records alone
     * until 2026-09-23, on the reasoning that only a quote puts a row on the
     * shop — true, and it forgot the two surfaces a description reaches with
     * no figure on it at all: the Studio's items card and the describe
     * picker, both of which take `describableTokenIds`. A token the seller
     * had only written words about was therefore named by its 64-character id
     * in the one place they go to edit it (measured on a live stall).
     */
    const offBookIds = [
        ...new Set([
            ...descriptionLookup.prices.keys(),
            ...descriptionLookup.descriptions.keys(),
            ...(mintedHere ?? []),
        ]),
    ].filter((tokenId) => sessionTokens.get(cacheKey(route.pubkeyHex, tokenId)) === undefined);
    if (offBookIds.length > 0) {
        try {
            for (const meta of await loadTokenMeta(chronik, offBookIds)) {
                sessionTokens.set(cacheKey(route.pubkeyHex, meta.tokenId), meta);
            }
        } catch {
            // Counted by the section, never invented.
        }
    }

    /*
     * Whose token each quoted item is. It runs here, after the metadata the
     * ALP answer is read from, and it is bounded: the walk's answers are free,
     * the `authPubkey` compare is free, and only what is left costs a capped
     * read. A quote on a token this stall did not mint borrows that token's
     * id, its picture and whatever it stands for off-chain — so the reader
     * says so under the row and the editor refuses to write a new one.
     */
    // The free half only: the capped `chronik.tx` reads run after the paint,
    // through `fillQuotedGenesis`, because the Listings rail needs none of
    // them and every one is a request behind a fresh failover client.
    const genesisUndecided = decideGenesisFree(
        route.pubkeyHex,
        [...descriptionLookup.prices.keys()].filter(
            (tokenId) =>
                !isWithheldToken(tokenId, sessionTokens.get(cacheKey(route.pubkeyHex, tokenId))),
        ),
        (tokenId) => sessionTokens.get(cacheKey(route.pubkeyHex, tokenId)),
        descriptionLookup.genesis,
    );

    const tokens: SessionTokenCache = new Map();
    for (const offer of offers) {
        const meta = sessionTokens.get(cacheKey(route.pubkeyHex, offer.tokenId));
        if (meta) {
            tokens.set(offer.tokenId, meta);
        }
    }
    // The quoted items, listed or not: the pay rail needs a name and a kind
    // for every one of them, and a sold-out listing must not take the quote
    // off the page with it.
    for (const tokenId of descriptionLookup.prices.keys()) {
        const meta = sessionTokens.get(cacheKey(route.pubkeyHex, tokenId));
        if (meta) {
            tokens.set(tokenId, meta);
        }
    }
    // The tokens the seller has written words about, listed or not: they
    // carry no figure, so they reach no shop row — but they are rows on the
    // Studio's items card and options in the describe picker, and both take
    // their name from here (`describableTokenIds`).
    for (const tokenId of descriptionLookup.descriptions.keys()) {
        const meta = sessionTokens.get(cacheKey(route.pubkeyHex, tokenId));
        if (meta) {
            tokens.set(tokenId, meta);
        }
    }
    // The tokens this wallet can still mint: on the studio and in the picker
    // by name, or by their id when the genesis read did not answer.
    for (const tokenId of mintedHere ?? []) {
        const meta = sessionTokens.get(cacheKey(route.pubkeyHex, tokenId));
        if (meta !== undefined) {
            tokens.set(tokenId, meta);
        }
    }
    // The collections themselves, so a heading can print a name.
    for (const groupId of nftLookup.groups.values()) {
        const meta = sessionTokens.get(cacheKey(route.pubkeyHex, groupId));
        if (meta) {
            tokens.set(groupId, meta);
        }
    }

    return withUrlParams({
        view: {
            route,
            fetch,
            overlay: { kind: 'idle' },
            stallName,
            tagline,
            fiatHint,
            announcement,
            address,
            tokens,
            descriptions: descriptionLookup.descriptions,
            shelves: descriptionLookup.shelves,
            prices: descriptionLookup.prices,
            quoteTimes: descriptionLookup.quoteTimes,
            // Said on screen only where it changes an answer: a `?pay=` link
            // that matched nothing cannot be called unknown after a walk that
            // stopped early, nor after one that threw.
            descriptionsTruncated: descriptionLookup.truncated,
            descriptionsFailed: descriptionLookup.failed,
            descriptionsDecided: descriptionLookup.decided,
            descriptionRanks: descriptionLookup.ranks,
            genesis: genesisFor(route.pubkeyHex, descriptionLookup.prices.keys()),
            nftGroups: nftLookup.groups,
            nftGroupsTruncated: nftLookup.truncated,
            theme,
            attachmentFlags,
            heldTokens,
            mintedHere,
            // Fails closed: with no holdings answer — a read that failed, or a
            // record whose bits name only unminted rows — nothing is worn.
            // `undefined` here would be the picker's skip-the-check affordance
            // on a visitor's screen, painting a decoration this stall cannot
            // prove it holds.
            worn: wornAttachments(
                theme?.id ?? DEFAULT_THEME_ID,
                attachmentFlags,
                heldTokens ?? NOTHING_HELD,
            ),
            settingsTruncated,
            settingsUnreadable,
            settingsUnaddressed,
            settingsRefusedNewer,
        },
        offers,
        pubkeyHex: route.pubkeyHex,
        genesisPending:
            genesisUndecided.length > 0
                ? { pubkeyHex: route.pubkeyHex, hash, tokenIds: genesisUndecided }
                : undefined,
    });
}

function openingFromLocation(): AppState {
    const idle = { kind: 'idle' as const };
    const emptyTokens = new Map();
    if (isHomePath(location.pathname)) {
        return withUrlParams({
            view: { route: { kind: 'home' }, overlay: idle, tokens: emptyTokens },
            offers: [],
        });
    }
    const raw = sellerFromPath(location.pathname);
    if (raw === undefined) {
        return withUrlParams({
            view: {
                route: { kind: 'invalid', raw: location.pathname },
                overlay: idle,
                tokens: emptyTokens,
            },
            offers: [],
        });
    }
    const parsed = parseSellerParam(raw);
    if (parsed.kind === 'invalid') {
        return withUrlParams({
            view: {
                route: { kind: 'invalid', raw: parsed.raw, why: parsed.why },
                overlay: idle,
                tokens: emptyTokens,
            },
            offers: [],
        });
    }
    if (parsed.kind === 'pubkey') {
        const address = p2pkhAddress(parsed.pubkeyHex);
        const cachedName = sessionNames.get(parsed.pubkeyHex);
        return withUrlParams({
            view: {
                route: {
                    kind: 'pubkey',
                    pubkeyHex: parsed.pubkeyHex,
                    address,
                },
                fetch: { kind: 'opening' },
                overlay: idle,
                stallName: cachedName,
                address,
                tokens: emptyTokens,
            },
            offers: [],
            pubkeyHex: parsed.pubkeyHex,
        });
    }
    return withUrlParams({
        view: {
            route: { kind: 'unresolved', address: parsed.address },
            fetch: { kind: 'opening' },
            overlay: idle,
            address: parsed.address,
            tokens: emptyTokens,
        },
        offers: [],
    });
}

/**
 * The status painted when a read threw before `loadOffers` could classify it.
 *
 * It hard-coded three timeouts without looking at the error, so a chronik
 * 400, a decode failure and a genuine outage all reported the same three
 * observations nobody had made (2026-09-20). `hostAttempts` answers what was
 * actually asked: three rows when the failover ran out of hosts, none when
 * it stopped at the first that answered.
 */
function unreachableNow(err?: unknown): FetchStatus {
    return {
        kind: 'unreachable',
        triedAtMs: Date.now(),
        hosts: hostAttempts(err),
    };
}

function p2pkhAddress(pubkeyHex: string): string {
    return encodeCashAddress('ecash', 'p2pkh', toHex(shaRmd160(fromHex(pubkeyHex))));
}

function addressOf(route: StallView['route']): string | undefined {
    if (route.kind === 'unresolvable' || route.kind === 'unresolved') {
        return route.address;
    }
    if (route.kind === 'pubkey') {
        return route.address;
    }
    return undefined;
}

function cacheKey(pubkeyHex: string, tokenId: string): string {
    return `${pubkeyHex}:${tokenId}`;
}

/**
 * One token's attribution, folded into the session cache and handed back.
 *
 * The fold is `mergeAttribution`, which never lets `unknown` overwrite a
 * decided state: a walk that took the lokad branch, or a lookup past its cap,
 * learns nothing and must not un-learn what an earlier read decided.
 */
function rememberGenesis(
    pubkeyHex: string,
    tokenId: string,
    next: GenesisDecision,
): GenesisDecision {
    const key = cacheKey(pubkeyHex, tokenId);
    const merged = rankDecision(sessionGenesis.get(key), next);
    sessionGenesis.set(key, merged);
    return merged;
}

/** A state with no strength of its own, at the strength its source earns. */
function decisionOf(state: GenesisAttribution, strength: AttributionStrength): GenesisDecision {
    return state === 'unknown' ? { state } : { state, strength };
}

/** A walk that answered nothing: every map empty, nothing resolved. */
const NO_RECORDS: DescriptionLookup = {
    descriptions: new Map<string, string>(),
    shelves: new Map<string, string>(),
    prices: new Map<string, TokenPrice>(),
    quoteTimes: new Map<string, number>(),
    decided: new Set<string>(),
    unreadable: new Set<string>(),
    genesis: new Map<string, GenesisAttribution>(),
    truncated: false,
    failed: false,
};

/** What this session knows about these tokens, for the view. */
function genesisFor(
    pubkeyHex: string,
    tokenIds: Iterable<string>,
): Map<string, GenesisAttribution> {
    const out = new Map<string, GenesisAttribution>();
    for (const tokenId of tokenIds) {
        const decision = sessionGenesis.get(cacheKey(pubkeyHex, tokenId));
        if (decision !== undefined) {
            out.set(tokenId, decision.state);
        }
    }
    return out;
}

/**
 * The free half of an attribution: the descriptions walk's own answers (a
 * genesis it passed — the transaction was read, so `paid` strength) and every
 * ALP `authPubkey` compare (`claimed`). Synchronous, and what the first paint's
 * chips come from. Returns the tokens the capped read should still ask about:
 * still `unknown`, or decided **against** the stall by a claim alone — an
 * agreeing claim already yields what the reader paints, and re-reading it
 * would spend one of the lookups to change a label nothing prints.
 */
function decideGenesisFree(
    pubkeyHex: string,
    tokenIds: readonly string[],
    metaOf: (tokenId: string) => TokenMeta | undefined,
    walked?: ReadonlyMap<string, GenesisAttribution>,
): string[] {
    for (const [tokenId, state] of walked ?? []) {
        rememberGenesis(pubkeyHex, tokenId, decisionOf(state, 'paid'));
    }
    const undecided: string[] = [];
    for (const tokenId of tokenIds) {
        const meta = metaOf(tokenId);
        const decision = rememberGenesis(
            pubkeyHex,
            tokenId,
            decisionOf(attributionFromAuthPubkey(meta?.authPubkey, pubkeyHex), 'claimed'),
        );
        if (
            decision.state === 'unknown' ||
            (decision.state === 'not-attributed' && decision.strength === 'claimed')
        ) {
            undecided.push(tokenId);
        }
    }
    return undecided;
}

/**
 * Whose token each of these is, learned in the order the answers get cheaper
 * to the visitor.
 *
 * 1. Whatever the descriptions walk saw for free — genesis transactions at the
 *    stall's own address, which it fetched anyway.
 * 2. ALP's `authPubkey`, on metadata this page already holds. No request at
 *    all, and shape-gated before it is compared.
 * 3. One `chronik.tx(tokenId)` for each token still undecided, capped by
 *    `MAX_GENESIS_LOOKUPS`. SLP names its minter nowhere else, and without
 *    this the rule would bind ALP tokens alone.
 *
 * Never throws: an undecided token warns in the editor and says nothing at all
 * to a visitor, which is what our own gap is allowed to do.
 */
async function decideGenesis(
    chronik: GenesisChronik,
    pubkeyHex: string,
    hash: string,
    tokenIds: readonly string[],
    /**
     * Where the ALP field is read from. The load path keeps its metadata in
     * the session cache; the screen that painted before its facts arrived
     * keeps it on the view — and asking the wrong one turns a free comparison
     * into a round trip for every quoted token.
     */
    metaOf: (tokenId: string) => TokenMeta | undefined,
    walked?: ReadonlyMap<string, GenesisAttribution>,
): Promise<void> {
    const undecided = decideGenesisFree(pubkeyHex, tokenIds, metaOf, walked);
    if (undecided.length === 0) {
        return;
    }
    const lookup = await loadGenesisAttribution(chronik, undecided, hash);
    for (const [tokenId, decision] of lookup.attributions) {
        rememberGenesis(pubkeyHex, tokenId, decision);
    }
}
