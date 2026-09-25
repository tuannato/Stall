import { describe, expect, it } from 'vitest';

import type { TokenPrice } from './description';
import { decidedOf, mergeFailedRead, mergeFinishedRead, movedRecords } from './records';

describe('a-walk-that-threw-keeps-the-records-per-token', () => {
    /**
     * The pure half of the critic's sixth pass, P1: what the walk resolved
     * wins, a removal included, and the kept read fills only what it never
     * reached — and says which tokens it filled, so a screen says "as last
     * read" only while one of them is shown.
     */
    const A = 'a'.repeat(64);
    const B = 'b'.repeat(64);
    const C = 'c'.repeat(64);
    const price = (amount: bigint) => ({ code: 'xec', exponent: 2, amount });
    const kept = {
        descriptions: new Map([
            [A, 'old words'],
            [B, 'kept words'],
        ]),
        shelves: new Map([[A, 'Old shelf']]),
        prices: new Map([
            [A, price(500_000n)],
            [B, price(700_000n)],
            [C, price(100_000n)],
        ]),
        quoteTimes: new Map([
            [A, 1],
            [B, 2],
            [C, 3],
        ]),
    };

    it('takes a resolved token from the walk, absences included, and fills the rest from the kept read', () => {
        // A read anew, C removed; B never reached.
        const read = {
            descriptions: new Map([[A, 'new words']]),
            shelves: new Map<string, string>(),
            prices: new Map([[A, price(900_000n)]]),
            quoteTimes: new Map([[A, 9]]),
        };
        const out = mergeFailedRead(read, new Set([A, C]), kept);
        expect(out.prices.get(A)).toEqual(price(900_000n));
        expect(out.descriptions.get(A)).toBe('new words');
        expect(out.shelves.has(A), 'the shelf went with the record that won').toBe(false);
        expect(out.prices.has(C), 'a removal the walk read drops the kept record').toBe(false);
        expect(out.prices.get(B)).toEqual(price(700_000n));
        expect(out.descriptions.get(B)).toBe('kept words');
        expect([...out.keptShown]).toEqual([B]);
    });

    it('counts a token its own maps name as resolved, whatever set it was handed', () => {
        const out = mergeFailedRead({ prices: new Map([[A, price(900_000n)]]) }, new Set(), kept);
        expect(out.prices.get(A)).toEqual(price(900_000n));
        expect(out.descriptions.has(A), 'the older words do not ride on the newer figure').toBe(false);
    });

    it('shows nothing kept when the walk resolved every token, and a kept clock alone is not shown', () => {
        const out = mergeFailedRead({}, new Set([A, B, C]), kept);
        expect(out.prices.size).toBe(0);
        expect(out.keptShown.size).toBe(0);
        const clockOnly = mergeFailedRead({}, new Set(), { quoteTimes: new Map([[A, 1]]) });
        expect(clockOnly.keptShown.size).toBe(0);
    });

    it('keeps the kept read where it decided a token at a higher rank (a newer edit mined a block early)', () => {
        // The eighth pass, item 4: the walk decided A at the older edit in
        // block 6 and threw before block 5, where the newer edit sits.
        const older = { height: 6, isFinal: false, txid: '6'.repeat(64), firstSeen: 100 };
        const newer = { height: 5, isFinal: false, txid: '5'.repeat(64), firstSeen: 200 };
        const read = { prices: new Map([[A, price(500_000n)]]), ranks: new Map([[A, older]]) };
        const out = mergeFailedRead(read, new Set([A]), {
            ...kept,
            prices: new Map([[A, price(900_000n)]]),
            ranks: new Map([[A, newer]]),
        });
        expect(out.prices.get(A), 'the higher rank wins, whichever read it came from').toEqual(price(900_000n));
        expect(out.descriptions.get(A), 'with the rest of its record').toBe('old words');
        expect(out.ranks.get(A)).toEqual(newer);
        expect(out.keptShown.has(A), 'shown from the kept read, so the screen says so').toBe(true);

        // The walk's newer record wins as before, and a kept removal that
        // outranks the walk's record takes the token out.
        const fresher = mergeFailedRead(
            { prices: new Map([[A, price(1n)]]), ranks: new Map([[A, { ...newer, firstSeen: 300 }]]) },
            new Set([A]),
            { ...kept, ranks: new Map([[A, newer]]) },
        );
        expect(fresher.prices.get(A)).toEqual(price(1n));
        const removed = mergeFailedRead(read, new Set([A]), { ranks: new Map([[A, newer]]) });
        expect(removed.prices.has(A), 'the kept read removed it, and that is newer').toBe(false);
        // No rank on one side: the walk's answer stands.
        expect(mergeFailedRead(read, new Set([A]), kept).prices.get(A)).toEqual(price(500_000n));
    });

    it('reads the resolved set from the maps when a view carries none', () => {
        expect([...decidedOf({ prices: new Map([[A, price(1n)]]), shelves: new Map([[B, 'x']]) })].sort()).toEqual([A, B]);
        expect([...decidedOf({ decided: new Set([C]), prices: new Map([[A, price(1n)]]) })]).toEqual([C]);
    });
});

describe('a-kept-rank-read-before-its-record-was-mined-does-not-outrank-the-walk', () => {
    /**
     * The critic's final merge, item 1. The kept read was taken while its
     * record was finalized and unmined, so its rank is frozen above every
     * height; the walk that threw later read a newer record mined at 900 by
     * a node that never saw it in its mempool (first-seen 0, unknown).
     * Compared whole, the frozen rank beat the walk and the older figure —
     * or an item the seller had since removed — came back. The kept read
     * outranks the walk on §5's ladder (stamps, heights, txid), and a kept
     * rank with no height never beats a walk rank that has one (the owner,
     * 2026-09-25).
     */
    const A = 'a'.repeat(64);
    const price = (amount: bigint) => ({ code: 'xec', exponent: 2, amount });
    const keptRank = { height: undefined, isFinal: true, txid: '1'.repeat(64), firstSeen: 1756400000 };
    const walkRank = { height: 900, isFinal: true, txid: '2'.repeat(64), firstSeen: 0 };
    const kept = {
        descriptions: new Map([[A, 'old words']]),
        prices: new Map([[A, price(500_000n)]]),
        quoteTimes: new Map([[A, 1]]),
        ranks: new Map([[A, keptRank]]),
    };

    it('keeps the walk\'s newer figure', () => {
        const read = {
            descriptions: new Map([[A, 'new words']]),
            prices: new Map([[A, price(900_000n)]]),
            ranks: new Map([[A, walkRank]]),
        };
        const out = mergeFailedRead(read, new Set([A]), kept);
        expect(out.prices.get(A), 'the figure the walk read, not the one it read past').toEqual(price(900_000n));
        expect(out.descriptions.get(A)).toBe('new words');
        expect(out.ranks.get(A)).toEqual(walkRank);
        expect(out.keptShown.has(A), 'nothing on screen came from the kept read').toBe(false);
    });

    it('keeps the walk\'s removal', () => {
        const read = { ranks: new Map([[A, walkRank]]) };
        const out = mergeFailedRead(read, new Set([A]), kept);
        expect(out.prices.has(A), 'the item the seller removed does not come back').toBe(false);
        expect(out.descriptions.has(A)).toBe(false);
        expect(out.keptShown.size).toBe(0);
    });

    it('still lets a kept record outrank the walk when both stamps say it is later', () => {
        const read = { prices: new Map([[A, price(900_000n)]]), ranks: new Map([[A, { ...walkRank, firstSeen: 1756300000 }]]) };
        expect(mergeFailedRead(read, new Set([A]), kept).prices.get(A)).toEqual(price(500_000n));
        // Equal stamps: the ladder goes on to the heights, and a kept rank
        // with none never beats a walk rank that has one.
        const tie = { prices: new Map([[A, price(900_000n)]]), ranks: new Map([[A, { ...walkRank, firstSeen: 1756400000 }]]) };
        expect(mergeFailedRead(tie, new Set([A]), kept).prices.get(A)).toEqual(price(900_000n));
    });

    it('follows §5’s ladder where the stamps do not decide: the heights, then the txid', () => {
        // The critic, 2026-09-25, item 5: the stamps-only rule left the walk
        // standing wherever the stamps were unknown, where §5 ranks by height
        // and then txid. The owner: §5's ladder, except the unmined kept rank.
        const at = (height: number | undefined, txid: string) => ({ height, isFinal: true, txid: txid.repeat(64), firstSeen: 0 });
        const merge = (keptRank: ReturnType<typeof at>, walkRank: ReturnType<typeof at>) =>
            mergeFailedRead(
                { prices: new Map([[A, price(900_000n)]]), ranks: new Map([[A, walkRank]]) },
                new Set([A]),
                { prices: new Map([[A, price(500_000n)]]), ranks: new Map([[A, keptRank]]) },
            ).prices.get(A);
        // Same height, both stamps 0: the txid decides, whichever read it came from.
        expect(merge(at(900, 'f'), at(900, '2')), 'the kept txid is higher').toEqual(price(500_000n));
        expect(merge(at(900, '2'), at(900, 'f')), 'the walk’s txid is higher').toEqual(price(900_000n));
        // Both heights known, stamps unknown: the higher block.
        expect(merge(at(901, '2'), at(900, 'f'))).toEqual(price(500_000n));
        expect(merge(at(899, 'f'), at(900, '2'))).toEqual(price(900_000n));
        // A kept rank with no height never beats a mined walk rank, whatever its txid.
        expect(merge(at(undefined, 'f'), at(900, '2'))).toEqual(price(900_000n));
        // A walk rank with no height (finalized, unmined) outranks a mined kept one.
        expect(merge(at(900, 'f'), at(undefined, '2'))).toEqual(price(900_000n));
    });
});

describe('a-lagging-replicas-older-record-never-beats-the-screen', () => {
    /**
     * The owner, CRITIC-CARRYOVER-4 item 9 ("remember the older records"),
     * the pure half; the app's half, through both roads, is in
     * app.live.test.ts under the same name. On screen: the seller's fresh
     * record, finalized and unmined, which the read that crowned it ranked
     * above the older record it also read. A lagging replica that never saw
     * the fresh one answers the older record, mined, with first-seen 0: the
     * ladder's no-height rule crowned it, and the older figure came back.
     * The read remembered that record as below its winner, so the answer is
     * older by construction and never beats the screen — on a walk that
     * threw and on a walk that finished alike.
     */
    const A = 'a'.repeat(64);
    const price = (amount: bigint) => ({ code: 'xec', exponent: 2, amount });
    const OLDER = '6'.repeat(64);
    const screenRank = { height: undefined, isFinal: true, txid: '9'.repeat(64), firstSeen: 1756400600, older: new Set([OLDER]) };
    const lagging = { height: 900, isFinal: true, txid: OLDER, firstSeen: 0 };
    const screen = { prices: new Map([[A, price(900_000n)]]), descriptions: new Map([[A, 'fresh words']]), ranks: new Map([[A, screenRank]]) };
    const answer = { prices: new Map([[A, price(500_000n)]]), descriptions: new Map([[A, 'old words']]), ranks: new Map([[A, lagging]]) };

    for (const [road, merge] of [
        ['a walk that threw', mergeFailedRead],
        ['a walk that finished', mergeFinishedRead],
    ] as const) {
        it(`${road}: the older record it answers never beats the fresh one on screen`, () => {
            const out = merge(answer, new Set([A]), screen);
            expect(out.prices.get(A), 'the screen keeps the fresh figure').toEqual(price(900_000n));
            expect(out.descriptions.get(A)).toBe('fresh words');
            expect(out.ranks.get(A), 'and its rank, older records with it').toEqual(screenRank);
        });
    }

    it('without the older records the ladder alone crowned the lagging answer (the case this closes)', () => {
        const blind = { ...screen, ranks: new Map([[A, { ...screenRank, older: undefined }]]) };
        expect(mergeFailedRead(answer, new Set([A]), blind).prices.get(A)).toEqual(price(500_000n));
    });

    it('decides nothing the read never saw: a record it did not rank still goes to the ladder', () => {
        const unseen = { ...answer, ranks: new Map([[A, { ...lagging, txid: '7'.repeat(64) }]]) };
        expect(mergeFinishedRead(unseen, new Set([A]), screen).prices.get(A), 'the no-height rule decides it').toEqual(
            price(500_000n),
        );
    });
});

describe('a-walk-behind-the-screen-does-not-erase-a-newer-quote', () => {
    /**
     * The critic, CARRYOVER-2 item 4, at the merge. A walk that FINISHED was
     * applied whole: a lagging replica that had not yet seen the seller's
     * newest record answered an older one — an older figure, or an old
     * tombstone — and it took the newer quote off the rail; and a walk that
     * stopped at our page cap after resolving only a removal emptied every
     * quote past the cap. Per token now (`mergeFinishedRead`): the walk's
     * answer below the rank on screen is refused, and on a capped walk the
     * tokens it never reached keep the records on screen.
     */
    const A = 'a'.repeat(64);
    const B = 'b'.repeat(64);
    const price = (amount: bigint) => ({ code: 'xec', exponent: 2, amount });
    const at = (height: number, txid: string, firstSeen = 0) => ({ height, isFinal: true, txid: txid.repeat(64), firstSeen });
    const screen = {
        descriptions: new Map([[A, 'new words'], [B, 'rye']]),
        prices: new Map([[A, price(900_000n)], [B, price(700_000n)]]),
        quoteTimes: new Map([[A, 2], [B, 1]]),
        ranks: new Map([[A, at(9, '9', 1756400600)], [B, at(8, '8', 1756400500)]]),
    };

    it('a lagging replica’s older record, or its old tombstone, does not take the newer quote off', () => {
        const older = mergeFinishedRead(
            { prices: new Map([[A, price(500_000n)], [B, price(700_000n)]]), ranks: new Map([[A, at(7, '7', 1756400000)], [B, at(8, '8', 1756400500)]]) },
            new Set([A, B]),
            screen,
        );
        expect(older.prices.get(A), 'the newer figure on screen stands').toEqual(price(900_000n));
        expect(older.descriptions.get(A)).toBe('new words');
        expect(older.ranks.get(A)).toEqual(at(9, '9', 1756400600));
        const tombstone = mergeFinishedRead({ ranks: new Map([[A, at(6, '6', 1756399000)]]) }, new Set([A]), screen);
        expect(tombstone.prices.get(A), 'an old removal does not empty the rail').toEqual(price(900_000n));
        // A walk that never met B did not decide it: it stays (the owner,
        // CRITIC-CARRYOVER-3 item 3).
        expect(tombstone.prices.get(B)).toEqual(price(700_000n));
    });

    it('a walk at or above the rank on screen is applied, a removal included', () => {
        const newer = mergeFinishedRead(
            { prices: new Map([[A, price(1_000_000n)]]), ranks: new Map([[A, at(10, 'a', 1756400900)]]) },
            new Set([A]),
            screen,
        );
        expect(newer.prices.get(A)).toEqual(price(1_000_000n));
        const removal = mergeFinishedRead({ ranks: new Map([[A, at(10, 'a', 1756400900)]]) }, new Set([A]), screen);
        expect(removal.prices.has(A), 'the seller’s newer removal takes it off').toBe(false);
        // The same record read again, now mined: never refused as "below" itself.
        const same = mergeFinishedRead(
            { prices: new Map([[A, price(900_000n)]]), ranks: new Map([[A, at(9, '9', 1756400600)]]) },
            new Set([A]),
            { ...screen, ranks: new Map([[A, { height: undefined, isFinal: true, txid: '9'.repeat(64), firstSeen: 1756400600 }]]) },
        );
        expect(same.ranks.get(A)?.height).toBe(9);
    });

    it('a capped walk fills the tokens it never reached from the screen', () => {
        // It read B's removal before our page cap and never reached A.
        const capped = mergeFinishedRead({ ranks: new Map([[B, at(10, 'b', 1756400900)]]) }, new Set([B]), screen);
        expect(capped.prices.get(A), 'a quote past the cap stays').toEqual(price(900_000n));
        expect(capped.descriptions.get(A)).toBe('new words');
        expect(capped.prices.has(B), 'the removal it read is applied').toBe(false);
    });
});

describe('a-replica-that-never-saw-the-record-does-not-remove-it', () => {
    /**
     * The owner, CRITIC-CARRYOVER-3 item 3. A walk that read to the end
     * removed every token on screen it never met, as if absence were the
     * seller's answer. It is not: a finished walk decides every token it
     * read a winning record for, a tombstone included (`collate`) — a
     * removal it reached, settled and accepted — and a token the walk never
     * met is a record the replica that answered has not seen. Only what the
     * walk decided leaves.
     */
    const A = 'a'.repeat(64);
    const B = 'b'.repeat(64);
    const price = (amount: bigint) => ({ code: 'xec', exponent: 2, amount });
    const at = (height: number, txid: string) => ({ height, isFinal: true, txid: txid.repeat(64), firstSeen: 0 });
    const screen = {
        descriptions: new Map([[A, 'plum'], [B, 'rye']]),
        shelves: new Map([[A, 'Jams']]),
        prices: new Map([[A, price(900_000n)], [B, price(700_000n)]]),
        quoteTimes: new Map([[A, 2], [B, 1]]),
        ranks: new Map([[A, at(9, '9')], [B, at(8, '8')]]),
    };

    it('keeps every map of a token the walk never met, and applies what it did decide', () => {
        // A replica that has B's record and never saw A's.
        const merged = mergeFinishedRead(
            { prices: new Map([[B, price(800_000n)]]), descriptions: new Map([[B, 'rye, new']]), ranks: new Map([[B, at(10, 'c')]]) },
            new Set([B]),
            screen,
        );
        expect(merged.prices.get(A), 'the quote stays').toEqual(price(900_000n));
        expect(merged.descriptions.get(A)).toBe('plum');
        expect(merged.shelves.get(A)).toBe('Jams');
        expect(merged.quoteTimes.get(A)).toBe(2);
        expect(merged.ranks.get(A)).toEqual(at(9, '9'));
        expect(merged.prices.get(B), 'what it decided is applied').toEqual(price(800_000n));
        expect(merged.descriptions.get(B)).toBe('rye, new');
    });

    it('still removes a token it decided at a removal, the last one included', () => {
        const removed = mergeFinishedRead({ ranks: new Map([[A, at(10, 'd')]]) }, new Set([A]), screen);
        expect(removed.prices.has(A), 'the seller signed it').toBe(false);
        expect(removed.descriptions.has(A)).toBe(false);
        expect(removed.prices.get(B), 'never met: stays').toEqual(price(700_000n));
        // A walk that decided nothing removes nothing.
        expect(mergeFinishedRead({}, new Set(), screen).prices).toEqual(screen.prices);
    });
});

describe('a-pay-press-judges-the-records-it-composed-from', () => {
    /**
     * The pure half of the critic's final merge, item 11: which of the
     * records a payment on screen was composed from the app now holds
     * otherwise. Over a definite read only, and a token a capped walk did
     * not reach has not moved.
     */
    const A = 'a'.repeat(64);
    const B = 'b'.repeat(64);
    const xec = (amount: bigint): TokenPrice => ({ code: 'xec', exponent: 2, amount });
    const composed = new Map<string, TokenPrice>([
        [A, xec(500_000n)],
        [B, xec(700_000n)],
    ]);
    const now = (prices: Map<string, TokenPrice>, over: Partial<{ known: boolean; complete: boolean; decided: Set<string> }> = {}) => ({
        prices,
        known: true,
        complete: true,
        decided: new Set<string>(),
        ...over,
    });

    it('names nothing while every record stands, and each one that moved or left', () => {
        expect(movedRecords(composed, now(new Map(composed)))).toEqual([]);
        expect(movedRecords(composed, now(new Map<string, TokenPrice>([[A, xec(900_000n)], [B, xec(700_000n)]])))).toEqual([A]);
        expect(movedRecords(composed, now(new Map<string, TokenPrice>([[A, { code: 'usd', exponent: 2, amount: 500_000n }], [B, xec(700_000n)]])))).toEqual([A]);
        expect(movedRecords(composed, now(new Map<string, TokenPrice>([[A, { ...xec(500_000n), surchargePct: 5 }], [B, xec(700_000n)]])))).toEqual([A]);
        expect(movedRecords(composed, now(new Map<string, TokenPrice>([[A, xec(500_000n)]]))), 'a removal read to the end').toEqual([B]);
    });

    it('counts what the buyer pays, never the margin or how the figure is written', () => {
        // The owner, 2026-09-25: "moved" is the figure, the unit or the
        // surcharge changing. A new tolerance is taken in place.
        expect(movedRecords(composed, now(new Map<string, TokenPrice>([[A, { ...xec(500_000n), tolerancePct: 5 }], [B, xec(700_000n)]])))).toEqual([]);
        expect(movedRecords(composed, now(new Map<string, TokenPrice>([[A, { code: 'xec', exponent: 3, amount: 5_000_000n }], [B, xec(700_000n)]])))).toEqual([]);
        expect(movedRecords(composed, now(new Map<string, TokenPrice>([[A, { code: 'xec', exponent: 3, amount: 5_000_001n }], [B, xec(700_000n)]])))).toEqual([A]);
    });

    it('judges nothing over a read that is not definite, and nothing a capped walk did not reach', () => {
        const moved = new Map<string, TokenPrice>([[A, xec(900_000n)]]);
        expect(movedRecords(composed, now(moved, { known: false }))).toEqual([]);
        expect(movedRecords(composed, { known: true, complete: true, decided: new Set() })).toEqual([]);
        expect(movedRecords(composed, now(moved, { complete: false })), 'B was never reached').toEqual([A]);
        expect(movedRecords(composed, now(moved, { complete: false, decided: new Set([B]) })), 'B was, and is gone').toEqual([A, B]);
    });
});
