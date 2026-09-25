/**
 * The seller's records when a walk threw part-way (the critic's sixth pass,
 * 2026-09-24, P1; ranks, its eighth pass, 2026-09-25, item 4).
 *
 * A descriptions walk reads each index newest BLOCK first, so what it
 * collected before a throw is, nearly always, the newest part of the
 * seller's record: every token it resolved (`DescriptionLookup.decided`) is
 * resolved exactly as a finished walk would resolve it — a new figure, new
 * words, or a removal. Only the tokens it never reached are unknown. Keeping
 * the last good read WHOLE over such a walk showed an older figure the walk
 * had already read past (and composed a payment at it), and offered an item
 * the seller had removed.
 *
 * **Nearly always, not always.** Two settled records rank by the node's
 * first sighting before their height (`compareManifestRank`), so a newer edit
 * mined a block BEFORE an older one sits on a later page of the walk than
 * the edit it supersedes. A walk that threw before that page decided the
 * token at the older record, while the kept read — a walk that finished —
 * holds the newer. That is the one order a walk reading newest block first
 * gets backwards, so it is the one the kept read may correct: where both
 * reads decided a token and both winners' first-seen stamps are known
 * (`RecordMaps.ranks`, `knownSeen`), the kept record wins only when its
 * stamp is later. Everywhere else the failed walk's answer stands.
 *
 * **Never the whole rank.** A rank is frozen when it is read, and a record
 * read while finalized and unmined ranks above every height. Compared whole,
 * such a kept rank beat a newer record the walk read mined at a height, by
 * a node that never saw it in its mempool (first-seen 0, unknown) — and the
 * older figure, or an item the seller had since removed, came back (the
 * critic's final merge, 2026-09-25, item 1). Without a known stamp on both
 * sides the height ladder is the walk's own order, and the walk has already
 * read it.
 *
 * So the two are merged per token: the failed walk's decided tokens win,
 * absence included, unless the kept read's winner for that token was first
 * seen later; the kept records fill the tokens the walk never reached. Pure:
 * no network, no DOM.
 */
import type { TokenPrice } from './description';
import { knownSeen, type ManifestRank } from './manifest';

/** The four record maps a view carries, as one read left them. */
export type RecordMaps = {
    readonly descriptions?: ReadonlyMap<string, string>;
    readonly shelves?: ReadonlyMap<string, string>;
    readonly prices?: ReadonlyMap<string, TokenPrice>;
    readonly quoteTimes?: ReadonlyMap<string, number>;
    /**
     * tokenId → the rank of the record that won that token, for every token
     * the read decided, a removal included (`DescriptionLookup.ranks`).
     * Absent where the read carried none: then nothing is compared.
     */
    readonly ranks?: ReadonlyMap<string, ManifestRank>;
};

/** The merged maps, and the tokens whose records came from the kept read. */
export type MergedRecords = {
    readonly descriptions: ReadonlyMap<string, string>;
    readonly shelves: ReadonlyMap<string, string>;
    readonly prices: ReadonlyMap<string, TokenPrice>;
    readonly quoteTimes: ReadonlyMap<string, number>;
    /** The rank of whichever record each merged token was taken from. */
    readonly ranks: ReadonlyMap<string, ManifestRank>;
    /**
     * Every token shown from the kept read: in one of its maps, and either
     * never decided by the walk that threw or decided by it at a record the
     * kept read's own winner was first seen after. Empty means nothing on
     * screen is older than this read, and the screen must not say it is.
     */
    readonly keptShown: ReadonlySet<string>;
};

/**
 * The tokens a read resolved: its explicit set when the walk said, and
 * otherwise every token its maps name — each entry in them is a winner, so
 * that is the set minus the removals, which only an explicit set or a rank
 * can carry.
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
        ...(read.ranks?.keys() ?? []),
    ]);
}

/**
 * A walk that threw (`read`, resolving `decided`) over the records kept from
 * the last read that finished (`kept`): per token, the walk's answer when it
 * resolved the token — a removal included, which drops the kept record —
 * unless the kept read decided the same token at a record both stamps say
 * was first seen later, and the kept record otherwise.
 */
export function mergeFailedRead(read: RecordMaps, decided: ReadonlySet<string>, kept: RecordMaps): MergedRecords {
    // Anything the walk's own maps name it resolved, whatever set it passed.
    const resolved = new Set([...decided, ...decidedOf({ ...read, decided: undefined })]);
    // A token both reads decided, where both first-seen stamps are known and
    // the kept read's winner is the later one: the walk stopped before the
    // page that held it. Never the whole rank — a kept rank read before its
    // record was mined sits above every height and would beat a newer mined
    // record whose stamp is unknown.
    const keptWins = new Set<string>();
    for (const tokenId of resolved) {
        const mine = knownSeen(read.ranks?.get(tokenId)?.firstSeen);
        const theirs = knownSeen(kept.ranks?.get(tokenId)?.firstSeen);
        if (mine !== undefined && theirs !== undefined && theirs > mine) {
            keptWins.add(tokenId);
        }
    }
    const fromWalk = (tokenId: string): boolean => resolved.has(tokenId) && !keptWins.has(tokenId);
    const keptShown = new Set<string>();
    const merge = <V>(
        fresh: ReadonlyMap<string, V> | undefined,
        old: ReadonlyMap<string, V> | undefined,
        shows: boolean,
    ): Map<string, V> => {
        const out = new Map<string, V>();
        for (const [tokenId, value] of fresh ?? []) {
            if (!keptWins.has(tokenId)) {
                out.set(tokenId, value);
            }
        }
        for (const [tokenId, value] of old ?? []) {
            if (!fromWalk(tokenId)) {
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
        ranks: merge(read.ranks, kept.ranks, false),
        keptShown,
    };
}
