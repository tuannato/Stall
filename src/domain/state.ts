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
     * `dropped` counts listings the index returned that this app refused to
     * map. Optional, and painted only when it is above zero: seven of ten shown
     * reads as seven listed, which is our failure printed as a fact about
     * somebody's inventory. It cannot see an offer the agora library dropped
     * before we ever saw it — that one is still open, and §10 says so.
     */
    | { kind: 'offers'; offers: StallOffer[]; dropped?: number }
    | { kind: 'empty' }
    /**
     * The index returned listings and none of them could be read. Our failure,
     * never an empty shop — `empty` is a statement about the seller. No host
     * list: nothing timed out, the answer was the part we could not use.
     */
    | { kind: 'unreadable'; triedAtMs: number; returned: number }
    | { kind: 'unreachable'; triedAtMs: number; hosts: HostAttempt[] }
    | { kind: 'plugin-missing'; triedAtMs: number; hosts: HostAttempt[] };

export type Overlay =
    | { kind: 'idle' }
    | { kind: 'buy'; outpoint: Outpoint }
    /** Composing the settings transaction. Disclosure, not a wallet. */
    | { kind: 'publish' };

export type SessionTokenCache = Map<string, TokenMeta>;

export type StallView = {
    route: RouteResolution;
    fetch?: FetchStatus;
    overlay: Overlay;
    stallName?: string;
    /** Cashaddr to show in the footer when known. */
    address?: string;
    tokens: SessionTokenCache;
    theme?: DecodedTheme;
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
};
