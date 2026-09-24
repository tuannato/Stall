/**
 * The seller's records when a walk threw part-way (the critic's sixth pass,
 * 2026-09-24, P1).
 *
 * A descriptions walk reads each index newest first, so what it collected
 * before a throw is the newest part of the seller's record: every token it
 * resolved (`DescriptionLookup.decided`) is resolved exactly as a finished
 * walk would resolve it — a new figure, new words, or a removal. Only the
 * tokens it never reached are unknown. Keeping the last good read WHOLE over
 * such a walk showed an older figure the walk had already read past (and
 * composed a payment at it), and offered an item the seller had removed.
 *
 * So the two are merged per token: the failed walk's decided tokens win,
 * absence included, and the kept records fill only the tokens it never
 * reached. Pure: no network, no DOM.
 */
import type { TokenPrice } from './description';

/** The four record maps a view carries, as one read left them. */
export type RecordMaps = {
    readonly descriptions?: ReadonlyMap<string, string>;
    readonly shelves?: ReadonlyMap<string, string>;
    readonly prices?: ReadonlyMap<string, TokenPrice>;
    readonly quoteTimes?: ReadonlyMap<string, number>;
};

/** The merged maps, and the tokens whose records came from the kept read. */
export type MergedRecords = {
    readonly descriptions: ReadonlyMap<string, string>;
    readonly shelves: ReadonlyMap<string, string>;
    readonly prices: ReadonlyMap<string, TokenPrice>;
    readonly quoteTimes: ReadonlyMap<string, number>;
    /**
     * Every token shown from the kept read: in one of its maps and never
     * decided by the walk that threw. Empty means nothing on screen is older
     * than this read, and the screen must not say it is.
     */
    readonly keptShown: ReadonlySet<string>;
};

/**
 * The tokens a read resolved: its explicit set when the walk said, and
 * otherwise every token its maps name — each entry in them is a winner, so
 * that is the set minus the removals, which only an explicit set can carry.
 */
export function decidedOf(read: RecordMaps & { readonly decided?: ReadonlySet<string> }): ReadonlySet<string> {
    if (read.decided !== undefined) {
        return read.decided;
    }
    return new Set([
        ...(read.descriptions?.keys() ?? []),
        ...(read.shelves?.keys() ?? []),
        ...(read.prices?.keys() ?? []),
        ...(read.quoteTimes?.keys() ?? []),
    ]);
}

/**
 * A walk that threw (`read`, resolving `decided`) over the records kept from
 * the last read that finished (`kept`): per token, the walk's answer when it
 * resolved the token — a removal included, which drops the kept record — and
 * the kept record otherwise.
 */
export function mergeFailedRead(read: RecordMaps, decided: ReadonlySet<string>, kept: RecordMaps): MergedRecords {
    // Anything the walk's own maps name it resolved, whatever set it passed.
    const resolved = new Set([...decided, ...decidedOf({ ...read, decided: undefined })]);
    const keptShown = new Set<string>();
    const merge = <V>(
        fresh: ReadonlyMap<string, V> | undefined,
        old: ReadonlyMap<string, V> | undefined,
        shows: boolean,
    ): Map<string, V> => {
        const out = new Map<string, V>(fresh ?? []);
        for (const [tokenId, value] of old ?? []) {
            if (!resolved.has(tokenId)) {
                out.set(tokenId, value);
                if (shows) {
                    keptShown.add(tokenId);
                }
            }
        }
        return out;
    };
    return {
        descriptions: merge(read.descriptions, kept.descriptions, true),
        shelves: merge(read.shelves, kept.shelves, true),
        prices: merge(read.prices, kept.prices, true),
        // A record's clock is not a record: a kept time beside nothing else
        // kept shows nothing, so it does not make the screen stale.
        quoteTimes: merge(read.quoteTimes, kept.quoteTimes, false),
        keptShown,
    };
}
