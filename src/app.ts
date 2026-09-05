import { encodeCashAddress } from 'ecashaddrjs';
import { fromHex, shaRmd160, toHex } from 'ecash-lib';
import {
    isHomePath,
    parseBroadcastParams,
    parsePayParam,
    parseSellerParam,
    sellerFromPath,
    stallPath,
} from './domain/route';
import {
    ATTACHMENT_FLAGS_TAG,
    decodeAttachmentFlags,
    wornAttachments,
} from './domain/attachments';
import { DEFAULT_THEME_ID } from './domain/theme';
import { loadHeldTokens } from './net/holdings';
import { fetchXecPrice } from './net/price';
import { DEFAULT_FIAT_CODE } from './domain/fiat';
import {
    clearSavedStall,
    isPinnedStall,
    isSavedStall,
    pinnedDoorIsFull,
    pinStall,
    readPinnedStalls,
    readSavedFiat,
    readSavedStall,
    saveFiat,
    saveStall,
    unpinStall,
} from './saved';
import { MAX_ACTIVITY_PAGES, MAX_STALL_EVENTS } from './domain/state';
import type {
    EventStatus,
    FetchStatus,
    Overlay,
    Outpoint,
    RouteParse,
    SessionTokenCache,
    ShopTab,
    StallEvent,
    StallHistory,
    StallOffer,
    StallView,
    TokenMeta,
} from './domain/state';
import type { DecodedTheme } from './domain/theme';
import {
    agoraOfferReader,
    createChronik,
    HISTORY_PAGE_SIZE,
    loadManifest,
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
    mergeAttribution,
    type GenesisAttribution,
} from './domain/genesis';
import { loadGenesisAttribution, type GenesisChronik } from './net/genesis';
import type { TokenPrice } from './domain/description';
import {
    ALL_FACTS,
    NO_FACTS,
    anyFact,
    classifyTx,
    historyEventOf,
    statusFromMessage,
    strongerStatus,
    unionFacts,
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
import {
    isDefiniteResult,
    watchStall,
    type LiveHandle,
    type LiveTxStatus,
} from './net/live';
import { CHRONIK_HOSTS } from './net/hosts';
import {
    broadcastCards,
    broadcastFigure,
    identityOf,
    quotedItems,
    renderStall,
    sheetMounts,
} from './ui';
import { PAY_RATE_TIMEOUT_MS } from './ui/render';

/**
 * Retry `refresh` while a resolved stall's fetch failed. Waiting screens
 * keep their script socket and must not have this timer tear it down.
 */
const BROADCAST_RETRY_MS = 30_000;
/** `mode=fixed` advances the cursor on this interval. */
const BROADCAST_FIXED_MS = 8_000;
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
    // A stream overlay mounts no sheet, so an item named on one would open
    // nothing and say nothing. The parameter is simply not carried there.
    const payHint = broadcast === undefined ? parsePayParam(location.search) : undefined;
    if (broadcast === undefined && payHint === undefined) {
        return state;
    }
    return {
        ...state,
        view: {
            ...state.view,
            ...(broadcast === undefined ? {} : { broadcast }),
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
function shownCard(view: StallView): { tokenId: string; figure: string } | undefined {
    const cards = broadcastCards(view);
    if (cards.length === 0) {
        return undefined;
    }
    const n = cards.length;
    const cursor = (((view.broadcastCursor ?? 0) % n) + n) % n;
    const card = cards[cursor]!;
    return { tokenId: card.tokenId, figure: broadcastFigure(card) };
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
const sessionGenesis = new Map<string, GenesisAttribution>();

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

    const clearBroadcastTimers = (): void => {
        if (carousel !== undefined) {
            clearTimeout(carousel);
            carousel = undefined;
        }
        if (retry !== undefined) {
            clearTimeout(retry);
            retry = undefined;
        }
    };
    /**
     * One currency above the table (CLAUDE §8). `readSavedFiat` answers `usd`
     * and clears a code an earlier build stored, so this is `usd` on every
     * load — written through the reader rather than as a literal, because the
     * clearing is the point and a literal would leave the stale key behind.
     */
    let fiatCode = readSavedFiat();
    /**
     * The fiat rate for this page load. Absent until the feed answers, and
     * absent again the moment it fails — never a last-known value, because a
     * stale rate renders a two-dollar item at two cents and nobody would find
     * out. Deliberately not refreshed on a timer: the offers are what this page
     * watches, and a fiat figure that quietly rewrites itself is worse than one
     * that is honestly a few minutes old at a glance.
     */
    let fiatRate: bigint | undefined;
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
    let payRate: { rate: bigint; atMs: number } | undefined;
    /** The buyer's quantity on the open pay sheet; reset with `payRate`. */
    let payQuantity: bigint | undefined;
    /**
     * A `?pay=` link is answered once per page load. The URL is deliberately
     * not rewritten, so a reload of a scanned link reopens the sheet — but the
     * seller's "check now" is a refresh of the same load, and reopening a
     * sheet the buyer closed would be this page arguing with them.
     */
    let payHintUsed = false;
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
    let shopTabFor: string | undefined;
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
     */
    const refreshFiat = async (): Promise<void> => {
        const asked = fiatCode;
        const rate = await fetchXecPrice(asked);
        // The visitor may have changed currency while this was in flight.
        if (asked !== fiatCode) {
            return;
        }
        fiatRate = rate;
        livePaint();
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

    const paint = (): void => {
        // Read at paint time, not at load: the toggle changes it without a
        // refetch, and a stale flag would leave the control lying about itself.
        const view: StallView = {
            ...state.view,
            isDefaultStall: isSavedStall(identityOf(state.view)),
            // Same read-at-paint rule as the default flag: a pin toggles
            // without a refetch, and a stale list would lie about itself.
            pinnedStalls: readPinnedStalls(),
            isPinnedStall: isPinnedStall(identityOf(state.view)),
            pinnedDoorFull: pinnedDoorIsFull(),
            fiatCode,
            fiatRate,
            payRate,
            payQuantity,
            shopTab,
        };
        renderStall(root, view, {
            onChangeFiat: (code: string): void => {
                fiatCode = code;
                saveFiat(code);
                // The old currency's rate is not this currency's rate, so it
                // goes immediately: a figure in the wrong currency is a worse
                // lie than no figure at all.
                fiatRate = undefined;
                paint();
                void refreshFiat();
            },
            onBuy: (outpoint) => {
                void onBuy(outpoint);
            },
            onRetry: () => {
                void refresh();
            },
            onCloseSheet: () => {
                state = { ...state, view: { ...state.view, overlay: { kind: 'idle' } } };
                paint();
            },
            onOpenStall: (raw) => {
                onOpenStall(raw);
            },
            onGoHome: () => {
                onGoHome();
            },
            onOpenPay: (tokenId) => {
                onOpenPay(tokenId);
            },
            onPayRate: (timeoutMs) => readPayRate(timeoutMs),
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
                state = { ...state, view: { ...state.view, overlay: { kind: 'idle' } } };
                paint();
            },
            onOpenPoster: () => {
                state = {
                    ...state,
                    view: { ...state.view, overlay: { kind: 'poster', format: 'print' } },
                };
                paint();
            },
            onClosePoster: () => {
                state = { ...state, view: { ...state.view, overlay: { kind: 'idle' } } };
                paint();
            },
            onChoosePosterFormat: (format) => {
                state = {
                    ...state,
                    view: { ...state.view, overlay: { kind: 'poster', format } },
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
                    pinStall(raw);
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
     * **The wait asks the same question the render gate does.** `sheetMounts`
     * is `renderStall`'s own predicate, so an overlay kind that mounts nothing —
     * a describe sheet on a route with no address, a poster whose link is past
     * the QR ceiling — cannot hold a paint back for a sheet that is not on
     * screen, which would stop the stall updating with nothing to say why.
     *
     * A paint a person asked for is untouched — including `PUBLISH_CHECK_NOW`,
     * whose whole answer is the sheet closing onto a re-read stall.
     */
    const livePaint = (): void => {
        if (sheetMounts(state.view)) {
            return;
        }
        paint();
    };

    const carouselTick = (): void => {
        carousel = undefined;
        const params = state.view.broadcast;
        if (params === undefined || params.preset !== 'corner') {
            return;
        }
        const n = broadcastCards(state.view).length;
        if (n < 2) {
            return;
        }
        if (params.mode === 'fixed') {
            state = {
                ...state,
                view: {
                    ...state.view,
                    broadcastCursor: ((state.view.broadcastCursor ?? 0) + 1) % n,
                    broadcastState: 'live',
                    broadcastStepped: true,
                },
            };
            paint();
            carousel = setTimeout(carouselTick, BROADCAST_FIXED_MS);
            return;
        }
        if (state.view.broadcastState === 'live') {
            state = {
                ...state,
                view: {
                    ...state.view,
                    broadcastCursor: ((state.view.broadcastCursor ?? 0) + 1) % n,
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
        carousel = setTimeout(carouselTick, BROADCAST_RAIL_LIVE_MS);
    };

    const syncCarousel = (): void => {
        const params = state.view.broadcast;
        const n = broadcastCards(state.view).length;
        const want = params !== undefined && params.preset === 'corner' && n >= 2;
        if (!want) {
            if (carousel !== undefined) {
                clearTimeout(carousel);
                carousel = undefined;
            }
            return;
        }
        if (carousel !== undefined) {
            return;
        }
        const delay = params.mode === 'fixed' ? BROADCAST_FIXED_MS : BROADCAST_RAIL_REST_MS;
        carousel = setTimeout(carouselTick, delay);
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
        if (broadcastCards(state.view).length === 0) {
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
        prevCard: { tokenId: string; figure: string } | undefined,
        next: StallView,
    ): void => {
        const params = next.broadcast;
        if (params === undefined) {
            return;
        }
        const n = broadcastCards(next).length;
        next.broadcastCursor =
            n === 0 ? 0 : (((state.view.broadcastCursor ?? 0) % n) + n) % n;
        if (state.view.broadcastState === 'stale') {
            next.broadcastState = params.mode === 'fixed' ? 'live' : 'rest';
        }
        const nextCard = shownCard(next);
        if (prevCard === undefined || nextCard === undefined) {
            return;
        }
        if (prevCard.tokenId !== nextCard.tokenId) {
            next.broadcastStepped = true;
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
        payQuantity = undefined;
        state = { ...state, view: { ...state.view, overlay: { kind: 'pay', tokenId } } };
        paint();
        void (async () => {
            const fresh = await readPayRate(PAY_RATE_TIMEOUT_MS);
            // Only for the sheet that asked: a buyer who closed it, or moved
            // to another item, must not have it repainted under them.
            if (
                claimed !== generation ||
                fresh === undefined ||
                state.view.overlay.kind !== 'pay' ||
                state.view.overlay.tokenId !== tokenId
            ) {
                return;
            }
            paint();
        })();
    };

    /**
     * One fresh rate for the pay sheet: remembered here and handed back, with
     * **no paint**. The sheet holds the buyer's own quantity in a closure, and
     * `renderStall` opens with `replaceChildren()` — so a paint from this path
     * would throw away what they typed. The sheet refreshes itself in place.
     */
    const readPayRate = async (
        timeoutMs?: number,
    ): Promise<{ rate: bigint; atMs: number } | undefined> => {
        const rate = await fetchXecPrice(
            DEFAULT_FIAT_CODE,
            timeoutMs === undefined ? undefined : { timeoutMs },
        );
        payRate = rate === undefined ? undefined : { rate, atMs: Date.now() };
        state = { ...state, view: { ...state.view, payRate } };
        return payRate;
    };

    const onBuy = async (outpoint: Outpoint): Promise<void> => {
        const overlay: Overlay = { kind: 'buy', outpoint };
        state = { ...state, view: { ...state.view, overlay } };
        paint();
    };

    const onOpenStall = (raw: string): void => {
        if (parseSellerParam(raw).kind === 'invalid') {
            return;
        }
        history.pushState(null, '', stallPath(raw));
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
            if (next.view.overlay.kind !== 'idle') {
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
                    state.view.overlay.tokenId === tokenId
                ) {
                    void (async () => {
                        const fresh = await readPayRate(PAY_RATE_TIMEOUT_MS);
                        if (
                            claimed !== generation ||
                            fresh === undefined ||
                            state.view.overlay.kind !== 'pay' ||
                            state.view.overlay.tokenId !== tokenId
                        ) {
                            return;
                        }
                        paint();
                    })();
                }
            });
            return {
                ...next,
                view: { ...next.view, overlay: { kind: 'pay', tokenId } },
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
        // Paint the parsed route before the index is asked, so a paste is not
        // a no-op while Chronik is in flight. Home is local; still cheap.
        state = openingFromLocation();
        paint();
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
        const loaded: AppState = {
            ...next,
            view: {
                ...next.view,
                watchedSinceMs: Date.now(),
                ...(walked === undefined ? {} : { history: walked }),
            },
        };
        // The first definite fetch for this seller decides the rail; a re-read
        // of a stall already open keeps whichever side the reader is on.
        if (next.pubkeyHex === undefined || next.pubkeyHex !== shopTabFor) {
            shopTab = openingShopTab(loaded.view);
            shopTabFor = next.pubkeyHex;
        }
        // A scanned link is answered from the records, and on a failure screen
        // those arrive after this paint — judging the hint against the state
        // the failure returned would call the seller's own item unknown. The
        // pending apply asks instead, once it has them.
        state = next.pendingFacts === undefined ? applyPayHint(loaded) : loaded;
        adoptFiatHint();
        paint();
        watch(claimed);
        syncBroadcastTimers();
        if (next.pendingFacts !== undefined) {
            applyPendingFacts(claimed, next.pendingFacts);
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
    const applyPendingFacts = (claimed: number, pending: PendingFacts): void => {
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
            if (lookup === undefined) {
                // The walk answered nothing at all. Said on the view, because
                // a scanned link must not be told this stall quotes no such
                // item on the strength of a read that never happened.
                state = { ...state, view: { ...state.view, descriptionsFailed: true } };
            } else {
                applyDescriptions(lookup);
                await fillQuotedTokens(claimed, pending.pubkeyHex);
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
     * Genesis facts for the tokens the seller's quotes name, on the screen
     * where the book failed.
     *
     * `loadCurrent` makes this read after its own walk; here the walk answers
     * later, so the read follows it in the same place. A read that answers
     * nothing leaves those quotes off the page and unmentioned: our failure is
     * already on this screen once, and a count under a hosts box says it twice.
     */
    const fillQuotedTokens = async (claimed: number, pubkeyHex: string): Promise<void> => {
        const missing = [...(state.view.prices?.keys() ?? [])].filter(
            (tokenId) => !state.view.tokens.has(tokenId),
        );
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
        const quoted = [...(state.view.prices?.keys() ?? [])];
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
        return { meta, attribution: sessionGenesis.get(key) ?? 'unknown' };
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

    /** The attachment tokens the settings currently on screen depend on. */
    const wantedAttachmentTokens = (): Set<string> =>
        new Set(
            wornAttachments(
                state.view.theme?.id ?? DEFAULT_THEME_ID,
                state.view.attachmentFlags ?? 0,
            )
                .map((row) => row.tokenId)
                .filter((id): id is string => id !== undefined),
        );

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
     * not the seller's record, so it may add to an empty view and may not
     * overwrite a full one. An empty answer from a walk that finished is held
     * back for a different reason and only where there is something to lose:
     * `loadDescriptions` cannot see the difference between a seller who
     * removed their words and a walk that found none of them, so a removed
     * description survives until the next full load — the retry control and
     * any reload both are one.
     */
    const applyDescriptions = (lookup: DescriptionLookup): void => {
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
        if ((lookup.failed || gotNothing) && hadSomething) {
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
            state.view.broadcast !== undefined ? shownCard(state.view) : undefined;
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
                rememberGenesis(pubkeyHex, tokenId, attribution);
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
    const refreshAllFacts = async (
        claimed: number,
        stall: { address: string; hash: string },
    ): Promise<void> => {
        // Reads the holdings itself, so there is no third call here.
        await refreshSettings(claimed, stall);
        await refreshDescriptions(claimed, stall);
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
    const readFacts = async (
        claimed: number,
        stall: { address: string; hash: string },
        txids: readonly string[],
        said?: ReadonlyMap<string, LiveTxStatus>,
    ): Promise<void> => {
        const ctx = eventContext(stall.hash);
        const chronik = createChronik();
        let facts = NO_FACTS;
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
            // stronger of the two answers is the one that stands.
            // Authorship is the walk's question, not the live path's:
            // `loadManifest` and `loadDescriptions` verify it themselves, so a
            // label in the ring would decide in a second place what counts as
            // the seller's signature (`classifyTx`'s own note).
            delete row.signedByStall;
            row.status = strongerStatus(row.status, statusFromMessage(said?.get(txid)));
            recordEvent(txid, row);
            ringMoved = true;
            facts = unionFacts(facts, classified);
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
        live = watchStall(
            createChronik() as never,
            { pubkeyHex, hash },
            {
                onChanged: (trigger) => {
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
                        if (claimed !== generation) {
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
                                ? shownCard(state.view)
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
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            live?.pause();
        } else {
            live?.resume();
        }
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
    void refresh();
    // Independent of the offer read: a feed that is slow or down must not hold
    // up the shop, and a shop that fails to load still has no use for a rate.
    void refreshFiat();
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
    } catch {
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
                    fetch: unreachableNow(),
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
                fetch: unreachableNow(),
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
    } catch {
        fetch = unreachableNow();
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
    const descriptionLookup: DescriptionLookup = (await descriptionsSoon) ?? {
        descriptions: new Map<string, string>(),
        shelves: new Map<string, string>(),
        prices: new Map<string, TokenPrice>(),
        quoteTimes: new Map<string, number>(),
        unreadable: new Set<string>(),
        genesis: new Map<string, GenesisAttribution>(),
        truncated: false,
        failed: true,
    };

    let stallName = cachedName;
    let theme = cachedTheme;
    let tagline: string | undefined;
    let fiatHint: string | undefined;
    let announcement: string | undefined;
    let settingsTruncated = false;
    let settingsUnreadable = false;
    let attachmentFlags = 0;
    {
        const lookup = await manifestSoon;
        if (lookup !== undefined) {
            settingsTruncated = lookup.truncated;
            settingsUnreadable = lookup.unreadable;
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
     * The entitlement, asked only when there is something to entitle. A stall
     * wearing nothing never makes this request, which is the majority of them;
     * one that does pays a single round after the manifest. It fails closed and
     * silently for a visitor — a missing beetle is not a lie about money — and
     * the picker is where a seller is told, because that is where we know a
     * seller is looking.
     */
    let heldTokens: ReadonlySet<string> | undefined;
    {
        const wanted = new Set(
            wornAttachments(theme?.id ?? DEFAULT_THEME_ID, attachmentFlags)
                .map((row) => row.tokenId)
                .filter((id): id is string => id !== undefined),
        );
        if (wanted.size > 0) {
            // The derived p2pkh when the route was a bare key: §3 says the stall
            // address is that, and it is the address a decoration is held at.
            heldTokens = await loadHeldTokens(createChronik() as never, address, wanted);
        }
    }

    /*
     * Genesis facts for tokens the seller **quoted** but does not list.
     *
     * A second read, and deliberately after the descriptions answered rather
     * than folded into the first: that one runs in parallel with this walk on
     * purpose (see `addrPageSoon`), and widening it would make the offers wait
     * for a set that does not exist until the walk is done.
     *
     * A read that fails leaves those rows unpainted and counted — a quote
     * whose genesis this page never saw could be an NFT, and a quote per whole
     * token means nothing about one.
     */
    const quotedIds = [...descriptionLookup.prices.keys()].filter(
        (tokenId) => sessionTokens.get(cacheKey(route.pubkeyHex, tokenId)) === undefined,
    );
    if (quotedIds.length > 0) {
        try {
            for (const meta of await loadTokenMeta(chronik, quotedIds)) {
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
    await decideGenesis(
        chronik,
        route.pubkeyHex,
        hash,
        [...descriptionLookup.prices.keys()],
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
            genesis: genesisFor(route.pubkeyHex, descriptionLookup.prices.keys()),
            nftGroups: nftLookup.groups,
            nftGroupsTruncated: nftLookup.truncated,
            theme,
            attachmentFlags,
            heldTokens,
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
        },
        offers,
        pubkeyHex: route.pubkeyHex,
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

function unreachableNow(): FetchStatus {
    return {
        kind: 'unreachable',
        triedAtMs: Date.now(),
        hosts: CHRONIK_HOSTS.map((host) => ({ host, result: 'timeout' as const })),
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
    next: GenesisAttribution,
): GenesisAttribution {
    const key = cacheKey(pubkeyHex, tokenId);
    const merged = mergeAttribution(sessionGenesis.get(key), next);
    sessionGenesis.set(key, merged);
    return merged;
}

/** What this session knows about these tokens, for the view. */
function genesisFor(
    pubkeyHex: string,
    tokenIds: Iterable<string>,
): Map<string, GenesisAttribution> {
    const out = new Map<string, GenesisAttribution>();
    for (const tokenId of tokenIds) {
        const state = sessionGenesis.get(cacheKey(pubkeyHex, tokenId));
        if (state !== undefined) {
            out.set(tokenId, state);
        }
    }
    return out;
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
    for (const [tokenId, state] of walked ?? []) {
        rememberGenesis(pubkeyHex, tokenId, state);
    }
    const undecided: string[] = [];
    for (const tokenId of tokenIds) {
        const meta = metaOf(tokenId);
        const state = rememberGenesis(
            pubkeyHex,
            tokenId,
            attributionFromAuthPubkey(meta?.authPubkey, pubkeyHex),
        );
        if (state === 'unknown') {
            undecided.push(tokenId);
        }
    }
    if (undecided.length === 0) {
        return;
    }
    const lookup = await loadGenesisAttribution(chronik, undecided, hash);
    for (const [tokenId, state] of lookup.attributions) {
        rememberGenesis(pubkeyHex, tokenId, state);
    }
}
