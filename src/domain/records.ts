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
 * holds the newer. So where both reads decided a token and both carry the
 * winner's rank (`RecordMaps.ranks`), the two winners are ranked by §5's
 * own ladder (`keptOutranks`): the first-seen stamps when both are known and
 * differ, then the heights, then the txid.
 *
 * **With one exception, and never the whole rank.** A rank is frozen when it
 * is read, and a record read while finalized and unmined has no height and
 * ranks above every height. Compared whole, such a kept rank beat a newer
 * record the walk read mined at a height, by a node that never saw it in
 * its mempool (first-seen 0, unknown) — and the older figure, or an item the
 * seller had since removed, came back (the critic's final merge,
 * 2026-09-25, item 1). So a kept rank with no height never beats a walk
 * rank with one (the owner, 2026-09-25): the kept record may since have
 * been mined anywhere, and the walk read what is mined now.
 *
 * **Except a record the kept read already ranked below its own.** That
 * rule handed the screen back to a lagging replica that answered the
 * OLDER record, mined, with first-seen 0, over a fresh record finalized
 * and unmined on screen. So a read remembers, per token, the records it
 * ranked below its winner (`RecordRank.older`), and a later answer whose
 * winner is one of them is older by construction and never beats the
 * screen (the owner, CRITIC-CARRYOVER-4 item 9) — on a walk that threw
 * and on a walk that finished alike, since both merge here. Read both ways,
 * and only when exactly one side's set holds the other's winner: each set
 * is one node's ladder, and two nodes that disagree are left to the ladder
 * (CRITIC-CARRYOVER-5 item 4). Two reads that crowned the same record keep
 * the union of their sets (item 3), and a read whose winner replaced the
 * screen's keeps the one it replaced and that one's set as well
 * (CRITIC-CARRYOVER-6 item 3) — unless the no-height exception alone gave
 * it the win, which remembers nothing (CRITIC-CARRYOVER-7, the window's
 * decision): that is the win that can be wrong, and remembered it would
 * hold the right record below the wrong one for the session.
 *
 * So the two are merged per token: the failed walk's decided tokens win,
 * absence included, unless the kept read's winner for that token outranks
 * it on that ladder; the kept records fill the tokens the walk never
 * reached. Pure: no network, no DOM.
 */
import type { TokenPrice } from './description';
import { compareManifestRank, knownSeen, type ManifestRank } from './manifest';

/**
 * The rank of the record that won a token (`ManifestRank`), and the records
 * ranked below it — their txids: every settled record for that token the
 * walk read that lost to the winner (the owner, CRITIC-CARRYOVER-4 item 9:
 * "remember the older records"), and, once merged (`mergeFailedRead`), what
 * every read that crowned the same record ranked below it, and the winner
 * it replaced on screen with that one's own set (not when the no-height
 * exception alone decided that replacement: `verdictOf`). Bounded by the seller's own
 * records for the token: every txid in it is one `collectTx` accepted.
 * Unsettled records (unmined and unfinalized) are not ranked and are not in
 * it: one of those may yet win.
 */
export type RecordRank = ManifestRank & { readonly older?: ReadonlySet<string> };

/** The four record maps a view carries, as one read left them. */
export type RecordMaps = {
    readonly descriptions?: ReadonlyMap<string, string>;
    readonly shelves?: ReadonlyMap<string, string>;
    readonly prices?: ReadonlyMap<string, TokenPrice>;
    readonly quoteTimes?: ReadonlyMap<string, number>;
    /**
     * tokenId → the rank of the record that won that token, for every token
     * the read decided, a removal included (`DescriptionLookup.ranks`),
     * with the records that read ranked below it (`RecordRank.older`).
     * Absent where the read carried none: then nothing is compared.
     */
    readonly ranks?: ReadonlyMap<string, RecordRank>;
};

/** The merged maps, and the tokens whose records came from the kept read. */
export type MergedRecords = {
    readonly descriptions: ReadonlyMap<string, string>;
    readonly shelves: ReadonlyMap<string, string>;
    readonly prices: ReadonlyMap<string, TokenPrice>;
    readonly quoteTimes: ReadonlyMap<string, number>;
    /** The rank of whichever record each merged token was taken from, its older records with it. */
    readonly ranks: ReadonlyMap<string, RecordRank>;
    /**
     * Every token shown from the kept read: in one of its maps, and either
     * never decided by the walk that threw or decided by it at a record the
     * kept read's own winner outranks. Empty means nothing on screen is older
     * than this read, and the screen must not say it is.
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
 * Whether the kept read's winner for a token outranks the walk's.
 *
 * **First, by the older sets, read both ways** (the owner, CRITIC-CARRYOVER-4
 * item 9; both directions, CRITIC-CARRYOVER-5 item 4). A walk whose winner
 * is one of the records the kept read ranked BELOW its own
 * (`RecordRank.older`) answered an older record — a lagging replica that
 * has not seen the seller's newest one — and never beats the record on
 * screen: the case the ladder gets wrong, a fresh record finalized and
 * unmined on screen and the older one answered mined with first-seen 0 by a
 * node that never saw it in its mempool, which the no-height rule below
 * would crown. And the other way: a walk whose own older set holds the
 * screen's winner read that record and ranked its own above it, so it is
 * the newer. **Only when exactly one side's set holds the other's winner**:
 * each set is one node's ladder, built on that node's stamps and heights,
 * so when both claim to be newer the two nodes disagree — one missed a
 * sighting and ranked by height, the other saw both — and a set taken
 * alone would make one node's missing stamp stick for the session. Then,
 * and when neither set holds the other's winner, §5's ladder decides.
 *
 * The ladder (`compareManifestRank`: known, differing first-seen stamps;
 * then heights; then txid) — except that a kept rank read before its record
 * was mined (no height) never beats a walk rank that has one. **That
 * exception decides only what the older sets cannot see**: a walk winner the
 * kept read never read at all (a newer record, mined since, or an older one
 * past the kept read's own page cap). No read this page makes carries the
 * tip height, so nothing finer is built.
 */
function keptOutranks(kept: RecordRank, walk: RecordRank): boolean {
    return verdictOf(kept, walk) === 'kept';
}

/**
 * Which winner a token keeps (`keptOutranks`), and whether the walk's win
 * rests on the no-height exception alone: the ladder would have kept the
 * screen's record, and only the rule that a kept rank with no height never
 * beats a walk rank with one gave it to the walk. Such a win is the one
 * that can be wrong (a lagging replica answering an older record mined with
 * first-seen 0 over a fresh one finalized and unmined), so it remembers
 * nothing (`mergeFailedRead`).
 */
function verdictOf(kept: RecordRank, walk: RecordRank): 'kept' | 'walk' | 'walk-by-no-height' {
    const keptRankedWalkBelow = kept.older?.has(walk.txid) === true;
    const walkRankedKeptBelow = walk.older?.has(kept.txid) === true;
    if (keptRankedWalkBelow !== walkRankedKeptBelow) {
        return keptRankedWalkBelow ? 'kept' : 'walk';
    }
    const keptSeen = knownSeen(kept.firstSeen);
    const walkSeen = knownSeen(walk.firstSeen);
    if (keptSeen !== undefined && walkSeen !== undefined && keptSeen !== walkSeen) {
        return keptSeen > walkSeen ? 'kept' : 'walk';
    }
    const ladder = compareManifestRank(kept, walk) > 0;
    if (kept.height === undefined && walk.height !== undefined) {
        return ladder ? 'walk-by-no-height' : 'walk';
    }
    return ladder ? 'kept' : 'walk';
}

/**
 * A walk that threw (`read`, resolving `decided`) over the records kept from
 * the last read that finished (`kept`): per token, the walk's answer when it
 * resolved the token — a removal included, which drops the kept record —
 * unless the kept read decided the same token at a record that outranks it
 * (`keptOutranks`), and the kept record otherwise.
 */
export function mergeFailedRead(read: RecordMaps, decided: ReadonlySet<string>, kept: RecordMaps): MergedRecords {
    // Anything the walk's own maps name it resolved, whatever set it passed.
    const resolved = new Set([...decided, ...decidedOf({ ...read, decided: undefined })]);
    // A token both reads decided, where the kept read's winner outranks the
    // walk's on §5's ladder: the walk stopped before the page that held it.
    // A kept rank with no height never beats a walk rank with one
    // (`keptOutranks`).
    const keptWins = new Set<string>();
    // A token the walk won on the no-height exception alone: its win adds
    // nothing to the older set (`verdictOf`).
    const noHeightWins = new Set<string>();
    for (const tokenId of resolved) {
        const mine = read.ranks?.get(tokenId);
        const theirs = kept.ranks?.get(tokenId);
        if (mine === undefined || theirs === undefined) {
            continue;
        }
        if (keptOutranks(theirs, mine)) {
            keptWins.add(tokenId);
        } else if (verdictOf(theirs, mine) === 'walk-by-no-height') {
            noHeightWins.add(tokenId);
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
    const ranks = merge(read.ranks, kept.ranks, false);
    for (const [tokenId, rank] of ranks) {
        const mine = read.ranks?.get(tokenId);
        const theirs = kept.ranks?.get(tokenId);
        if (mine === undefined || theirs === undefined) {
            continue;
        }
        // Both reads crowned the same record: whatever either ranked below
        // it is older than it, so the merged rank keeps the union of the two
        // sets (CRITIC-CARRYOVER-5 item 3). Taking one side's set alone —
        // the walk's, at equal rank — dropped the other's whenever a later
        // read re-crowned the winner without reading the older records again
        // (a walk that threw after page 0, or a capped one), and a lagging
        // replica's older record then beat the screen on the ladder.
        //
        // And the walk's winner REPLACED the screen's (CRITIC-CARRYOVER-6
        // item 3): the record it replaced, and everything that record
        // ranked below itself, are older than the new winner — this merge
        // just decided so — whether or not the walk read them. A walk that
        // threw after page 0, or stopped at our cap, crowned a newer record
        // without reaching the one on screen, its own set lacked it, and a
        // lagging replica answering that record (or, over a removal, the
        // last quote) beat the new winner on the ladder: the old figure, or
        // the removed quote, came back.
        //
        // **Except a win the no-height exception alone decided** (the
        // window's decision, CRITIC-CARRYOVER-7): the ladder would have kept
        // the screen's record, and the exception is the rule that can be
        // wrong — a lagging replica's older record, mined and first seen 0,
        // crowned over a fresh one finalized and unmined. Remembered, that
        // wrong winner held the fresh record in its set, and the next read
        // that crowned the fresh record without reaching the older one lost
        // to it for the session: 500,000 stayed where 600,000 should have
        // come back. So it remembers nothing: the walk's own set stands and
        // the replaced record is not added.
        const replaced = mine.txid !== theirs.txid && !keptWins.has(tokenId);
        if (mine.txid !== theirs.txid && (!replaced || noHeightWins.has(tokenId))) {
            continue;
        }
        const older = new Set([
            ...(mine.older ?? []),
            ...(replaced ? [theirs.txid] : []),
            ...(theirs.older ?? []),
        ]);
        // A winner is never below itself: the screen's set may hold the new
        // winner when two nodes disagreed (`keptOutranks`).
        older.delete(rank.txid);
        if (older.size > 0) {
            ranks.set(tokenId, { ...rank, older });
        }
    }
    return {
        descriptions: merge(read.descriptions, kept.descriptions, true),
        shelves: merge(read.shelves, kept.shelves, true),
        prices: merge(read.prices, kept.prices, true),
        // A record's clock is not a record: a kept time beside nothing else
        // kept shows nothing, so it does not make the screen stale.
        quoteTimes: merge(read.quoteTimes, kept.quoteTimes, false),
        ranks,
        keptShown,
    };
}

/**
 * A walk that FINISHED (`read`, resolving `decided`) over the records on
 * screen (`screen`), per token (the critic, CARRYOVER-2 item 4): the walk's
 * answer wins, a removal included, unless the screen decided that token at
 * a record that outranks the walk's on §5's ladder (`keptOutranks`) — a
 * lagging replica that has not seen the seller's newest record answers an
 * older one, and applied whole it took the newer figure off the rail, or
 * emptied it with an old tombstone.
 *
 * **It removes only what it decided** (the owner, CRITIC-CARRYOVER-3 item
 * 3). A walk that finished decides every token it read a winning record
 * for, a tombstone included (`collate`) — a removal it reached, settled and
 * accepted, never one past our cap, one still unfinalized and unmined (the
 * older record wins in its place) or one `collectTx` refused; a token on
 * screen the walk never met is a record this replica has not seen — our
 * gap, never the seller's — and the screen's record for it stands. That holds whether the walk read to the
 * end or stopped at our page cap, which is why a finished walk now merges
 * exactly as a walk that threw does (`mergeFailedRead`).
 */
export function mergeFinishedRead(read: RecordMaps, decided: ReadonlySet<string>, screen: RecordMaps): MergedRecords {
    return mergeFailedRead(read, decided, screen);
}

/**
 * What the app holds of the seller's records at one instant, for a press to
 * judge a payment on screen against (`movedRecords`).
 */
export type RecordsNow = {
    readonly prices?: ReadonlyMap<string, TokenPrice>;
    /**
     * The seller's words and each record's clock, beside the prices: what
     * an open sheet takes in place when a record changed in a way that does
     * not move what the buyer pays (`samePayment`).
     */
    readonly descriptions?: ReadonlyMap<string, string>;
    readonly quoteTimes?: ReadonlyMap<string, number>;
    /** A definite read: the records were read and the walk did not throw. */
    readonly known: boolean;
    /** The walk read to the end, rather than stopping at our page cap. */
    readonly complete: boolean;
    /** The tokens the read resolved, a removal included (`decidedOf`). */
    readonly decided: ReadonlySet<string>;
};

/**
 * Whether two records ask a buyer for the same payment: the same unit, the
 * same figure and the same surcharge (the owner, 2026-09-25: "moved" is what
 * the buyer pays changing). The figure is compared as a value, so a record
 * restating it at another exponent asks the same satoshis (`satsForQuote`
 * divides by the exponent exactly). The tolerance is not in it — a margin
 * on the seller's side of a payment, not a part of it — and neither are the
 * words, which a record carries beside its price. Absent on both sides is
 * the same; absent on one is a record that came or went.
 */
export function samePayment(a: TokenPrice | undefined, b: TokenPrice | undefined): boolean {
    if (a === undefined || b === undefined) {
        return a === b;
    }
    return (
        a.code === b.code &&
        a.surchargePct === b.surchargePct &&
        a.amount * 10n ** BigInt(b.exponent) === b.amount * 10n ** BigInt(a.exponent)
    );
}

/**
 * The tokens among `composed` — the records a payment on screen was composed
 * from, or the records a sheet last SAW (the critic, CARRYOVER-3 item 1),
 * where a record the sheet saw gone is `undefined` — whose record now asks a
 * buyer for another payment (`samePayment`: the figure, the unit, the
 * surcharge, the record gone, or a record gone that came back). A record
 * that changed only its tolerance or its words is not among them; a sheet
 * takes that in place and the press goes on.
 *
 * Over a definite read only (`RecordsNow.known`): a read that has not
 * answered, or a failure screen's floor (`descriptionsFailed`), cannot say a
 * record moved, and saying so would stop a payment on our own failure. On
 * the live road a walk that threw is not such a floor: it is merged per
 * token over the records on screen (`mergeFailedRead`, the app's
 * `applyDescriptions`) and what the merge holds is judged like any read. A
 * token a walk that stopped at our page cap did not reach has not moved;
 * one it resolved, a removal included, is judged. The touch wall's plate
 * closes on the same answer, and both pay sheets ask it at every press and
 * whenever a re-read lands under them (the scan code is no press): a sheet
 * holds the live paint, so without it a press handed a wallet a figure the
 * page no longer held as the seller's quote, and said nothing.
 */
export function movedRecords(composed: ReadonlyMap<string, TokenPrice | undefined>, now: RecordsNow): string[] {
    if (!now.known || now.prices === undefined) {
        return [];
    }
    const moved: string[] = [];
    for (const [tokenId, price] of composed) {
        const current = now.prices.get(tokenId);
        if (current === undefined && !now.complete && !now.decided.has(tokenId)) {
            continue;
        }
        if (!samePayment(price, current)) {
            moved.push(tokenId);
        }
    }
    return moved;
}
