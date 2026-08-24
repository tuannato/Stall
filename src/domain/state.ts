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

export type RouteParse =
    | { kind: 'invalid'; raw: string }
    | { kind: 'pubkey'; pubkeyHex: PubKeyHex }
    | {
          kind: 'address';
          address: string;
          type: 'p2pkh' | 'p2sh';
          hash: string;
      };

export type RouteResolution =
    /** The apex. No seller was asked for, so nothing failed. */
    | { kind: 'home' }
    | { kind: 'invalid'; raw: string }
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
};

export type TokenMeta = {
    tokenId: string;
    name: string;
    ticker: string;
    decimals: number;
};

export type FetchStatus =
    | { kind: 'offers'; offers: StallOffer[] }
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
    | { kind: 'buy'; outpoint: Outpoint };

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
};
