import type { ShippedAttachment } from './attachments';
import type { DecodedTheme } from './theme';

/** Three-layer stall state. Mixing layers is how empty and unreachable collapse. */

export type PubKeyHex = string;

export type Outpoint = {
    txid: string;
    outIdx: number;
};

export type HostAttempt = {
    host: string;
    result: 'ok' | 'timeout' | 'plugin-missing' | 'error';
    detail?: string;
};

/**
 * `why` distinguishes "these bytes are not an address" from "this is a real
 * address that cannot host a stall". Both are unreadable routes — a stall is
 * indexed by a public key — but telling a seller their valid address is not an
 * address is a lie, and telling them to list and come back is a loop that never
 * ends. A script address never reveals a pubkey to recover.
 */
export type RouteWhy = 'script-address';

export type RouteParse =
    | { kind: 'invalid'; raw: string; why?: RouteWhy }
    | { kind: 'pubkey'; pubkeyHex: PubKeyHex }
    | {
          kind: 'address';
          address: string;
          type: 'p2pkh';
          hash: string;
      };

export type RouteResolution =
    /** The apex. No seller was asked for, so nothing failed. */
    | { kind: 'home' }
    | { kind: 'invalid'; raw: string; why?: RouteWhy }
    | { kind: 'unresolvable'; address: string }
    /** Address parsed; history was not read (index down). Not unresolvable. */
    | { kind: 'unresolved'; address: string }
    | { kind: 'pubkey'; pubkeyHex: PubKeyHex; address?: string };

export type StallOffer = {
    outpoint: Outpoint;
    tokenId: string;
    /** Remaining atoms on this UTXO. */
    atoms: bigint;
    variant: 'ONESHOT' | 'PARTIAL';
    /** Encoded asked sats for the displayed quantity. */
    askedSats: bigint;
    /** Atoms the askedSats figure is for (all remaining, or a prepared take). */
    askedAtoms: bigint;
    minAcceptedAtoms?: bigint;
    /**
     * Floor-divided nanosats per atom of the remaining lot (oneshot: the
     * asked take). An annotation, not a second asked amount — multiplying
     * back does not recover `askedSats`. Absent when it cannot be formed.
     */
    priceNanoSatsPerAtom?: bigint;
};

export type TokenTypeMeta = {
    protocol: string;
    type: string;
};

export type TokenMeta = {
    tokenId: string;
    name: string;
    ticker: string;
    decimals: number;
    tokenType?: TokenTypeMeta;
    /**
     * The homepage the minter wrote into genesis. Permanent, and checked by
     * nobody — see `domain/tokenlink.ts` before it reaches an href.
     */
    url?: string;
};

export type FetchStatus =
    /**
     * First paint: identity is known or parsed, the index has not been asked
     * yet. Not empty, not unreachable, not unreadable.
     */
    | { kind: 'opening' }
    /**
     * `dropped` counts listings this app started to read and could not finish:
     * a covenant that **crashed the parser**, and one that parsed but could not
     * be priced. Optional, and painted only when it is above zero — seven of
     * ten shown reads as seven listed, which is our failure printed as a fact
     * about somebody's inventory.
     *
     * **What it still cannot see, in two different places.** A utxo the plugin
     * never indexed is invisible to every reader of the group, Cashtab
     * included: `agora.py` returns nothing for a non-SLP oneshot, so an ALP one
     * exists on chain and is in no group at all. And a utxo the parser answers
     * `undefined` for is skipped in silence on purpose — nothing binds a group
     * entry to the seller, so counting a stranger's dust-funded junk would let
     * anyone print a drop count on anyone's stall.
     */
    | { kind: 'offers'; offers: StallOffer[]; dropped?: number }
    | { kind: 'empty' }
    /**
     * The group held listings and none of them could be read. Our failure,
     * never an empty shop — `empty` is a statement about the seller. No host
     * list: nothing timed out, the answer was the part we could not use.
     *
     * `returned` is how many utxos this app **started to read as a listing** —
     * not how many the group held. The silently skipped ones are excluded for
     * the reason above, so a stranger cannot inflate this number. In this branch
     * it necessarily equals `dropped` would-be rows: reaching here means every
     * attempt failed.
     */
    | { kind: 'unreadable'; triedAtMs: number; returned: number }
    | { kind: 'unreachable'; triedAtMs: number; hosts: HostAttempt[] }
    | { kind: 'plugin-missing'; triedAtMs: number; hosts: HostAttempt[] };

export type Overlay =
    | { kind: 'idle' }
    | { kind: 'buy'; outpoint: Outpoint }
    /** Composing the settings transaction. Disclosure, not a wallet. */
    | { kind: 'publish' };

/**
 * Query that selects the stream overlay. Parsed by `parseBroadcastParams`.
 * A new name on purpose: `overlay` is CLAUDE.md §4's third layer.
 */
export type BroadcastParams = {
    preset: 'corner' | 'rail';
    /** Rest/live cycle. Ignored when `preset` is `rail`. */
    mode: 'fixed' | 'rail';
    /** `bg=transparent` on the wire. Absent is the theme ground. */
    transparent: boolean;
};

/**
 * Which panel of a resolved stall is on screen. **App state, never
 * `history.state`**: the only popstate listener runs `refresh()`, which
 * closes the socket, empties the event ring and re-runs the whole load — a
 * panel switch on Back would wipe the very feed the activity panel renders
 * (PLAN-REDESIGN P3, critic finding 1). Absent means the storefront.
 */
export type PanelKind = 'shop' | 'studio' | 'activity';

/**
 * How a big shop's cards are ordered. `curated` is the shipped order —
 * sections by kind, `compareOffers` within them; the rest are one flat run,
 * because a price order that stopped at section borders would not be one.
 */
export type ShopSort = 'curated' | 'price-asc' | 'price-desc' | 'name';

export type SessionTokenCache = Map<string, TokenMeta>;

/**
 * What one transaction at this stall turned out to be.
 *
 * `book` is an agora-touching transaction — a listing, a take, a cancel. The
 * rest are what the script subscription carries: the stall's own records, a
 * decoration's token moving, and ordinary money, which is most of it.
 */
export type StallEventKind = 'book' | 'settings' | 'description' | 'token-move' | 'other';

/**
 * What a `book` transaction provably did, from the plugin's own group
 * entries. **Never a sale, never a cancel**: on the wire a cancel and a
 * fully-taken offer are the same shape — a grouped offer input spent, an
 * ungrouped ERROR output — so `consumed` says exactly what is true of both.
 * `appeared` is a grouped output: a live covenant entered the book.
 * Absent means the shapes could not be read, which stays "the book moved".
 */
export type BookShape = 'consumed' | 'appeared' | 'both';

/**
 * One transaction the live socket named, once it had been read.
 *
 * `seenAtMs` is when **this page** saw it, not when the chain did: a message
 * arrives for the mempool and again for the block, and a first-seen stamp is
 * the honest thing a reader can say without a timestamp from the node.
 */
export type StallEvent = {
    txid: string;
    kind: StallEventKind;
    seenAtMs: number;
    /** For a `book` event: what the plugin entries prove it did. */
    book?: BookShape;
};

/**
 * How many of them are kept. A ring, not a log: §2 caps every buffer, and this
 * one grows on somebody else's schedule — a busy address can name transactions
 * as fast as the socket delivers them.
 */
export const MAX_STALL_EVENTS = 50;

export type StallView = {
    route: RouteResolution;
    fetch?: FetchStatus;
    overlay: Overlay;
    stallName?: string;
    /** Cashaddr to show in the footer when known. */
    address?: string;
    tokens: SessionTokenCache;
    theme?: DecodedTheme;
    /**
     * The decorations this stall is actually wearing: resolved from the
     * manifest's flags against what the address holds, so the view never has to
     * re-derive an entitlement. Empty is the ordinary case.
     */
    worn?: readonly ShippedAttachment[];
    /** The flags this stall's own record set, so the picker opens on them. */
    attachmentFlags?: number;
    /**
     * A look the seller is trying on, session-only and never persisted:
     * every paint applies it over the record's own look until it is
     * cleared, so switching to the Shop tab shows the candidate storefront
     * instead of snapping back (owner, 2026-08-30 — the old sheet-peek
     * choreography is retired with it).
     */
    previewLook?: { themeId: number; attachmentFlags: number };
    /**
     * Token ids the stall address holds, when a holdings read answered. Absent
     * means "not read", which is not the same as "holds nothing" — the picker
     * says the weaker thing rather than telling a seller they own nothing.
     */
    heldTokens?: ReadonlySet<string>;
    /** The settings walk hit its cap, so this look may not be the current one. */
    settingsTruncated?: boolean;
    /** The seller published settings this page could not read. */
    settingsUnreadable?: boolean;
    /** True when the bare domain opens this stall for this browser. */
    isDefaultStall?: boolean;
    /**
     * The fiat currency this browser chose, and one XEC in it as an integer
     * (see `domain/fiat.ts`). The rate is **absent** whenever the feed did not
     * answer — never a last-known value — so a missing rate paints no fiat line
     * rather than an old one.
     */
    fiatCode?: string;
    fiatRate?: bigint;
    /**
     * tokenId → the seller's own words about that token.
     *
     * Deliberately **not** on `TokenMeta`. §4 allows session memory of a name
     * and a ticker because those come from genesis and cannot go stale; a
     * description is republishable, so a remembered one can be wrong, and
     * `TokenMeta` is reused on the unreachable path where it would survive as
     * if it were genesis truth.
     *
     * A token that is absent here has no description **or** we did not find
     * one. Nothing may print the first meaning: the card renders a description
     * when there is one and says nothing at all when there is not.
     */
    descriptions?: ReadonlyMap<string, string>;
    /** tokenId -> the NFT collection it was minted from, where we could read it. */
    nftGroups?: ReadonlyMap<string, string>;
    /** The group lookup hit its cap, so some NFTs are shown without a collection. */
    nftGroupsTruncated?: boolean;
    /**
     * The transactions this page has watched arrive, newest first.
     *
     * The Activity tab renders this ring newest-first, and says when the cap
     * has rolled older rows off. Capped at `MAX_STALL_EVENTS`, deduped by txid, held in
     * memory for one painted stall and **never persisted**: §2 lets
     * `localStorage` hold display preferences and nothing that grows.
     *
     * Absent means no transaction has arrived yet, which on a quiet stall is
     * the ordinary case — it is not a claim that nothing happened.
     */
    events?: readonly StallEvent[];
    /** The seller's line under their name — manifest tag 0x02, screened. */
    tagline?: string;
    /** The token whose card leads the shop — manifest tag 0x03. */
    /** The seller's display-currency suggestion — manifest tag 0x04. */
    fiatHint?: string;
    /**
     * The seller's notice — manifest tag 0x05, screened like the name.
     * Labelled as theirs on screen and carrying no status semantics: a dated
     * sentence ages in front of the reader; a status bit goes stale in
     * silence (D5, the away-mode replacement).
     */
    announcement?: string;
    /**
     * tokenId → the seller's own shelf heading (STLD tag 0x01). Same record
     * as the description, same trust: signature verified, words unvouched.
     * Same absence rule as `descriptions` — absent is "none found", which is
     * not "none published".
     */
    shelves?: ReadonlyMap<string, string>;
    /** The active panel of a resolved stall. Absent is the storefront. */
    panel?: PanelKind;
    /**
     * The stalls this browser pinned to the front door — route tokens from
     * `saved.ts`, read at paint time like `isDefaultStall`. Only the door
     * renders them; the apex never fetches, so each is a link, not a preview.
     */
    pinnedStalls?: readonly string[];
    /** True when this stall is on this browser's door. */
    isPinnedStall?: boolean;
    /** True when the door holds its full 12 and a new pin would be refused. */
    pinnedDoorFull?: boolean;
    /**
     * How a big shop's cards are ordered, and the visitor's find-box text.
     * UI state only, like `panel` — never history, never storage: a sort is a
     * way of looking at the shelves, not a fact about the stall. The price
     * sorts order cards by the figure each card already shows (its cheapest
     * buyable `askedSats`), so no number is computed that is not on screen.
     */
    shopSort?: ShopSort;
    shopFilter?: string;
    /**
     * Tokens whose cards the next paint may pulse — **one-shot**: set only by
     * a message-triggered re-read in the same window as a burst whose plugin
     * entries proved the book moved (never by a reconnect or resume re-read,
     * whose diff is replica skew as often as news), and cleared by the paint
     * that shows it, so an unrelated repaint cannot replay the flourish.
     */
    justChanged?: ReadonlySet<string>;
    /**
     * When this page's watching began — the last **full load**, not the page
     * open: `refresh()` empties the ring, so a caption dated from the page
     * open would claim coverage across a gap it cannot see.
     */
    watchedSinceMs?: number;
    /**
     * How many holes the ring is known to have: reconnects (what happened
     * while the socket was down is unknown) and txids the page saw named but
     * could not read. Zero is a real claim; above zero the panel says
     * activity may be missing rather than letting the list read as complete.
     */
    activityGaps?: number;
    /**
     * Stream overlay from the URL, when `parseBroadcastParams` answered.
     * Absent is the ordinary stall. Not `overlay`.
     */
    broadcast?: BroadcastParams;
    /** Which listing the carousel is showing. App-owned; modulo after a book apply. */
    broadcastCursor?: number;
    /** `stale` is a last-good card after a failed re-read — a dim, never copy. */
    broadcastState?: 'live' | 'rest' | 'stale';
    /**
     * One-shot: the carousel moved. Set for the paint that shows the fade,
     * cleared after — same shape as `justChanged`.
     */
    broadcastStepped?: true;
    /**
     * One-shot: the shown card's asked price moved. Set for the paint that
     * shows the pulse, cleared after.
     */
    broadcastPulse?: true;
};
