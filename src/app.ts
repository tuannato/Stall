import { encodeCashAddress } from 'ecashaddrjs';
import { fromHex, shaRmd160, toHex } from 'ecash-lib';
import { isHomePath, parseSellerParam, sellerFromPath, stallPath } from './domain/route';
import {
    ATTACHMENT_FLAGS_TAG,
    decodeAttachmentFlags,
    wornAttachments,
} from './domain/attachments';
import { DEFAULT_THEME_ID } from './domain/theme';
import { loadHeldTokens } from './net/holdings';
import { fetchXecPrice } from './net/price';
import {
    clearSavedStall,
    hasSavedFiat,
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
import { MAX_STALL_EVENTS } from './domain/state';
import type {
    BookShape,
    FetchStatus,
    Overlay,
    Outpoint,
    RouteParse,
    SessionTokenCache,
    StallEvent,
    StallEventKind,
    StallOffer,
    StallView,
    TokenMeta,
} from './domain/state';
import type { DecodedTheme } from './domain/theme';
import {
    agoraOfferReader,
    createChronik,
    loadManifest,
    loadOffers,
    loadTokenMeta,
    resolveSeller,
} from './net';
import { isNftChild } from './domain/category';
import { isSupportedFiat } from './domain/fiat';
import { groupIdsToName, loadNftGroups } from './net/groups';
import { loadDescriptions } from './net/descriptions';
import {
    ALL_FACTS,
    NO_FACTS,
    anyFact,
    bookShapeOf,
    classifyTx,
    eventKindOf,
    unionFacts,
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
import { isDefiniteResult, watchStall, type LiveHandle } from './net/live';
import { CHRONIK_HOSTS } from './net/hosts';
import { identityOf, renderStall } from './ui';

const sessionTokens = new Map<string, TokenMeta>();
const sessionNames = new Map<string, string>();
const sessionThemes = new Map<string, DecodedTheme>();

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

export type AppState = {
    view: StallView;
    offers: StallOffer[];
    pubkeyHex?: string;
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
     * The fiat rate for this page load. Absent until the feed answers, and
     * absent again the moment it fails — never a last-known value, because a
     * stale rate renders a two-dollar item at two cents and nobody would find
     * out. Deliberately not refreshed on a timer: the offers are what this page
     * watches, and a fiat figure that quietly rewrites itself is worse than one
     * that is honestly a few minutes old at a glance.
     */
    const visitorChoseFiat = hasSavedFiat();
    let fiatCode = readSavedFiat();
    let fiatRate: bigint | undefined;
    /**
     * The transactions this page has watched arrive, newest first.
     *
     * **Nothing renders it.** It is the substrate for a live activity feed, and
     * it is laid down now so that feed is one render rather than a second pass
     * over the socket. Kept here rather than only on the view because a paint is
     * not guaranteed: a burst of ordinary payments changes no fact and paints
     * nothing, and the ring still has to remember them.
     */
    let events: readonly StallEvent[] = [];
    /**
     * Holes the ring is known to have: reconnects, and txids the page saw
     * named but could not read. The activity panel refuses to let its list
     * read as complete while this is above zero.
     */
    let activityGaps = 0;
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
        paint();
    };

    /**
     * The seller's currency suggestion fills silence and nothing else: a
     * buyer who ever chose a currency keeps it forever, and an unsupported
     * code is nothing rather than an error — it is a hint, not a setting.
     */
    const adoptFiatHint = (): void => {
        if (visitorChoseFiat) {
            return;
        }
        const hint = state.view.fiatHint;
        if (hint === undefined || !isSupportedFiat(hint) || fiatCode === hint) {
            return;
        }
        fiatCode = hint;
        fiatRate = undefined;
        void refreshFiat();
    };

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
            onOpenPublish: () => {
                state = { ...state, view: { ...state.view, overlay: { kind: 'publish' } } };
                paint();
            },
            onClosePublish: () => {
                state = { ...state, view: { ...state.view, overlay: { kind: 'idle' } } };
                paint();
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
            onChangeFilter: (text) => {
                state = {
                    ...state,
                    view: { ...state.view, shopFilter: text.slice(0, 64) },
                };
                paint();
            },
        });
    };

    /**
     * A paint the visitor did not ask for.
     *
     * `renderStall` begins with `replaceChildren()`, and the publish sheet keeps
     * the seller's typed name, their picked look and their chosen decorations in
     * the DOM and nowhere else. So a paint while that sheet is open throws away
     * a record they are half way through composing — and with a script
     * subscription watching the stall address, a stranger can now cause that
     * from outside for the price of dust.
     *
     * The state is updated either way; only the paint waits. Every path that
     * closes the sheet ends in a paint of its own, which is the flush: there is
     * no way out of the overlay that does not repaint.
     *
     * A paint a person asked for is untouched — including `PUBLISH_CHECK_NOW`,
     * whose whole answer is the sheet closing onto a re-read stall.
     */
    const livePaint = (): void => {
        if (state.view.overlay.kind === 'publish') {
            return;
        }
        paint();
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
     * Remember one transaction, once.
     *
     * **Deduped by txid, first sighting kept.** chronik names one transaction at
     * least twice — added to the mempool, then confirmed — and a feed that
     * listed a sale twice would be wrong about the shop. Keeping the first
     * sighting rather than re-fronting the later one also keeps the order
     * stable: a confirmation is not a new event, and a reader watching the list
     * must not see rows rearrange under them.
     *
     * No paint. Nothing on screen reads this, so painting for it would be a
     * repaint the visitor did not ask for — and `renderStall` throws the tree
     * away, which is what `livePaint` exists to be careful about.
     */
    const recordEvent = (txid: string, kind: StallEventKind, book?: BookShape): void => {
        if (events.some((event) => event.txid === txid)) {
            return;
        }
        events = [
            { txid, kind, seenAtMs: Date.now(), ...(book === undefined ? {} : { book }) },
            ...events,
        ].slice(0, MAX_STALL_EVENTS);
        state = { ...state, view: { ...state.view, events } };
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

    const refresh = async (): Promise<void> => {
        const claimed = ++generation;
        live?.close();
        live = undefined;
        // A new stall is a new ring. These are transactions at one address, and
        // carrying them across a route change would attribute one seller's
        // traffic to another.
        events = [];
        activityGaps = 0;
        // Paint the parsed route before the index is asked, so a paste is not
        // a no-op while Chronik is in flight. Home is local; still cheap.
        state = openingFromLocation();
        paint();
        const next = await load();
        if (claimed !== generation) {
            return;
        }
        // The activity caption dates from here — the last full load — because
        // this function just emptied the ring; "since the page opened" would
        // claim coverage across a gap it cannot see.
        state = { ...next, view: { ...next.view, watchedSinceMs: Date.now() } };
        adoptFiatHint();
        paint();
        watch(claimed);
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
        // Always, even when no token moved in this burst: a flag switched on is
        // a decoration that needs an entitlement nothing else asked for.
        await refreshHoldings(claimed, stall.address);
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
     * `loadDescriptions` never throws — a shop with no descriptions beats no
     * shop — so it answers an empty lookup both when the seller wrote nothing
     * and when its own walk failed. On this path those cannot be told apart, so
     * an empty answer never replaces words already on screen: the same rule
     * `isDefiniteResult` applies to an empty book, for the same reason. The cost
     * is chosen and small — a description a seller removes stays until the next
     * full load, which the retry control and any reload both are.
     */
    const refreshDescriptions = async (
        claimed: number,
        stall: { address: string; hash: string },
    ): Promise<void> => {
        const lookup = await loadDescriptions(createChronik(), stall);
        if (claimed !== generation) {
            return;
        }
        // The shelves ride the same records, so the same guard covers both:
        // a wholly empty answer never erases either map already on screen.
        const gotNothing = lookup.descriptions.size === 0 && lookup.shelves.size === 0;
        const hadSomething =
            (state.view.descriptions?.size ?? 0) > 0 ||
            (state.view.shelves?.size ?? 0) > 0;
        if (gotNothing && hadSomething) {
            return;
        }
        state = {
            ...state,
            view: {
                ...state.view,
                descriptions: lookup.descriptions,
                shelves: lookup.shelves,
            },
        };
        livePaint();
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
    ): Promise<void> => {
        const wanted = wantedAttachmentTokens();
        const script = p2pkhOutputScript(stall.hash);
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
            const classified = classifyTx(tx, script, wanted);
            const kind = eventKindOf(tx, classified);
            const book = kind === 'book' ? bookShapeOf(tx) : undefined;
            if (book !== undefined) {
                bookProofAtMs = Date.now();
            }
            // One event per transaction that was actually read. A txid that was
            // never fetched has no kind to give it, and inventing `other` for
            // one would put a claim in the ring that nothing checked.
            recordEvent(txid, kind, book);
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
                            return;
                        }
                        if (claimed !== generation || !isDefiniteResult(status)) {
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
                        state = {
                            ...state,
                            offers: status.kind === 'offers' ? status.offers : [],
                            view: {
                                ...state.view,
                                fetch: status,
                                justChanged:
                                    changed !== undefined && changed.size > 0
                                        ? changed
                                        : undefined,
                            },
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
                        await fillNewTokens(claimed, pubkeyHex, status);
                    })();
                },
                onBurst: (txids) => {
                    void readFacts(claimed, stall, txids);
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
        return {
            view: { route: { kind: 'home' }, overlay: { kind: 'idle' }, tokens: new Map() },
            offers: [],
        };
    }

    const raw = sellerFromPath(location.pathname);
    if (raw === undefined) {
        return {
            view: {
                route: { kind: 'invalid', raw: location.pathname },
                overlay: { kind: 'idle' },
                tokens: new Map(),
            },
            offers: [],
        };
    }

    const parsed = parseSellerParam(raw);
    const hint = new URLSearchParams(location.search).get('m') ?? undefined;
    const chronik = createChronik();

    let route;
    try {
        route = await resolveSeller(parsed, chronik);
    } catch {
        if (parsed.kind === 'invalid') {
            return {
                view: {
                    route: { kind: 'invalid', raw: parsed.raw, why: parsed.why },
                    overlay: { kind: 'idle' },
                    tokens: new Map(),
                },
                offers: [],
            };
        }
        if (parsed.kind === 'pubkey') {
            return {
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
            };
        }
        return {
            view: {
                route: { kind: 'unresolved', address: parsed.address },
                fetch: unreachableNow(),
                overlay: { kind: 'idle' },
                address: parsed.address,
                tokens: new Map(),
            },
            offers: [],
        };
    }

    if (route.kind !== 'pubkey') {
        return {
            view: { route, overlay: { kind: 'idle' }, tokens: new Map(), address: addressOf(route) },
            offers: [],
        };
    }

    const reader = agoraOfferReader(chronik);
    const address = route.address ?? p2pkhAddress(route.pubkeyHex);
    const hash = toHex(shaRmd160(fromHex(route.pubkeyHex)));
    const cachedName = sessionNames.get(route.pubkeyHex);
    const cachedTheme = sessionThemes.get(route.pubkeyHex);
    const cachedTokens = tokensFor(route.pubkeyHex);

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
    const descriptionsSoon = loadDescriptions(chronik, { address, hash }).catch(
        () => undefined,
    );
    const manifestSoon = loadManifest(chronik, { address, hash }, hint).catch(
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
        // The settings read is already in flight and may well answer. It is
        // deliberately not used here: this screen shows what a previous good
        // load left behind, and improving it is a separate change with its own
        // reasoning, not a side effect of running two reads at once.
        const later = Boolean(cachedName) || cachedTokens.size > 0;
        return {
            view: {
                route,
                fetch,
                overlay: { kind: 'idle' },
                stallName: later ? cachedName : undefined,
                address,
                tokens: later ? cachedTokens : new Map(),
                theme: later ? cachedTheme : undefined,
            },
            offers: [],
            pubkeyHex: route.pubkeyHex,
        };
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
    const descriptionLookup = (await descriptionsSoon) ?? {
        descriptions: new Map<string, string>(),
        shelves: new Map<string, string>(),
        unreadable: new Set<string>(),
        truncated: false,
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

    const tokens: SessionTokenCache = new Map();
    for (const offer of offers) {
        const meta = sessionTokens.get(cacheKey(route.pubkeyHex, offer.tokenId));
        if (meta) {
            tokens.set(offer.tokenId, meta);
        }
    }
    // The collections themselves, so a heading can print a name.
    for (const groupId of nftLookup.groups.values()) {
        const meta = sessionTokens.get(cacheKey(route.pubkeyHex, groupId));
        if (meta) {
            tokens.set(groupId, meta);
        }
    }

    return {
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
            nftGroups: nftLookup.groups,
            nftGroupsTruncated: nftLookup.truncated,
            theme,
            attachmentFlags,
            heldTokens,
            // Fails closed: with no holdings answer, nothing is worn. A stall
            // that paints a decoration it cannot prove is holding is exactly
            // the consent rule broken from the inside.
            worn: wornAttachments(theme?.id ?? DEFAULT_THEME_ID, attachmentFlags, heldTokens),
            settingsTruncated,
            settingsUnreadable,
        },
        offers,
        pubkeyHex: route.pubkeyHex,
    };
}

function openingFromLocation(): AppState {
    const idle = { kind: 'idle' as const };
    const emptyTokens = new Map();
    if (isHomePath(location.pathname)) {
        return {
            view: { route: { kind: 'home' }, overlay: idle, tokens: emptyTokens },
            offers: [],
        };
    }
    const raw = sellerFromPath(location.pathname);
    if (raw === undefined) {
        return {
            view: {
                route: { kind: 'invalid', raw: location.pathname },
                overlay: idle,
                tokens: emptyTokens,
            },
            offers: [],
        };
    }
    const parsed = parseSellerParam(raw);
    if (parsed.kind === 'invalid') {
        return {
            view: {
                route: { kind: 'invalid', raw: parsed.raw, why: parsed.why },
                overlay: idle,
                tokens: emptyTokens,
            },
            offers: [],
        };
    }
    if (parsed.kind === 'pubkey') {
        const address = p2pkhAddress(parsed.pubkeyHex);
        const cachedName = sessionNames.get(parsed.pubkeyHex);
        return {
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
        };
    }
    return {
        view: {
            route: { kind: 'unresolved', address: parsed.address },
            fetch: { kind: 'opening' },
            overlay: idle,
            address: parsed.address,
            tokens: emptyTokens,
        },
        offers: [],
    };
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

function tokensFor(pubkeyHex: string): SessionTokenCache {
    const out: SessionTokenCache = new Map();
    const prefix = `${pubkeyHex}:`;
    for (const [key, meta] of sessionTokens) {
        if (key.startsWith(prefix)) {
            out.set(meta.tokenId, meta);
        }
    }
    return out;
}
