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
     * rank with no height does not beat a walk rank mined above the height
     * the kept read saw — nor any, when it saw none, as here (the owner,
     * 2026-09-25; the height seen, CRITIC-CARRYOVER-8 item 1:
     * `a-lagging-replicas-older-mined-record-loses-to-the-height-seen`).
     * The walk's win remembers the record it replaced, as every win does.
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
        // The walk's rank, remembering the record it replaced: a lagging
        // replica answering that record never undoes this right win
        // (`a-correct-exception-win-is-not-undone-by-a-lagging-replica`).
        expect(out.ranks.get(A)).toEqual({ ...walkRank, older: new Set([keptRank.txid]) });
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
        // A kept rank with no height, and no height seen, does not beat a
        // mined walk rank, whatever its txid.
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

describe('the-older-records-survive-a-read-that-crowns-the-same-winner', () => {
    /**
     * CRITIC-CARRYOVER-5 item 3, the pure half; the app's half is in
     * app.live.test.ts under the same name. On screen: the seller's fresh
     * record R2, finalized and unmined, which the read that crowned it
     * ranked above the older R1. A later read crowns R2 again without
     * reading R1 — a walk that threw after its first page, or one capped
     * before R1's page — and at equal rank its rank replaced the screen's,
     * older set and all: the set was gone, and a lagging replica answering
     * R1 (mined, first-seen 0) then beat R2 on the ladder's no-height rule.
     * Both reads crowned the same record, so what either ranked below it is
     * older than it: the merged rank keeps the union.
     */
    const A = 'a'.repeat(64);
    const price = (amount: bigint) => ({ code: 'xec', exponent: 2, amount });
    const R0 = '0'.repeat(64);
    const R1 = '1'.repeat(64);
    const R2 = '2'.repeat(64);
    const fresh = { height: undefined, isFinal: true, txid: R2, firstSeen: 1756400600 };
    const screen = { prices: new Map([[A, price(900_000n)]]), ranks: new Map([[A, { ...fresh, older: new Set([R1]) }]]) };
    const again = { prices: new Map([[A, price(900_000n)]]), ranks: new Map([[A, fresh]]) };
    const lagging = { prices: new Map([[A, price(500_000n)]]), ranks: new Map([[A, { height: 6, isFinal: true, txid: R1, firstSeen: 0 }]]) };

    for (const [road, merge] of [
        ['a walk that threw', mergeFailedRead],
        ['a walk that finished', mergeFinishedRead],
    ] as const) {
        it(`${road}: the re-crowned rank keeps what the screen ranked below it, and the lagging answer never beats it`, () => {
            const mid = merge(again, new Set([A]), screen);
            expect(mid.prices.get(A)).toEqual(price(900_000n));
            expect(mid.ranks.get(A)?.older, 'the screen’s older set survives').toEqual(new Set([R1]));
            const out = mergeFinishedRead(lagging, new Set([A]), mid);
            expect(out.prices.get(A), 'the lagging replica’s older figure does not come back').toEqual(price(900_000n));
        });
    }

    it('takes the union when both reads ranked records below the same winner', () => {
        const other = { ...again, ranks: new Map([[A, { ...fresh, older: new Set([R0]) }]]) };
        expect(mergeFailedRead(other, new Set([A]), screen).ranks.get(A)?.older).toEqual(new Set([R0, R1]));
        expect(mergeFinishedRead(other, new Set([A]), screen).ranks.get(A)?.older).toEqual(new Set([R0, R1]));
    });

    it('a winner that stands keeps its own set: nothing of the walk it outranked is lent to it', () => {
        // The walk answers R1, which the screen ranked below R2: the screen
        // stands, and R1's own set (R0) is not the screen's to take. A walk
        // whose winner REPLACES the screen's is the other case, and
        // `a-new-winner-remembers-the-record-it-replaced` asserts it.
        const behind = { prices: new Map([[A, price(500_000n)]]), ranks: new Map([[A, { height: 6, isFinal: true, txid: R1, firstSeen: 0, older: new Set([R0]) }]]) };
        const out = mergeFinishedRead(behind, new Set([A]), screen);
        expect(out.prices.get(A)).toEqual(price(900_000n));
        expect(out.ranks.get(A)?.older).toEqual(new Set([R1]));
    });
});

describe('the-older-records-are-read-both-ways', () => {
    /**
     * CRITIC-CARRYOVER-5 item 4. An older set is one node's ladder, built on
     * that node's stamps and heights, and it outranked the whole ladder in
     * one direction only: the screen's set holding the walk's winner kept
     * the screen, while a walk whose own set held the screen's winner — it
     * read that record and ranked its own above it — was never believed.
     * Both ways now, and only when exactly one side's set holds the other's
     * winner; when both do (two nodes disagree) or neither does, §5's
     * ladder decides.
     */
    const A = 'a'.repeat(64);
    const price = (amount: bigint) => ({ code: 'xec', exponent: 2, amount });
    const R1 = '1'.repeat(64);
    const R2 = '2'.repeat(64);
    const one = (txid: string, amount: bigint, rank: { height?: number; firstSeen: number; older?: ReadonlySet<string> }) => ({
        prices: new Map([[A, price(amount)]]),
        ranks: new Map([[A, { height: rank.height, isFinal: true, txid, firstSeen: rank.firstSeen, ...(rank.older === undefined ? {} : { older: rank.older }) }]]),
    });

    for (const [road, merge] of [
        ['a walk that threw', mergeFailedRead],
        ['a walk that finished', mergeFinishedRead],
    ] as const) {
        it(`${road}: the screen's set holds the walk's winner and not the other way — the screen stands, though the ladder would crown the walk`, () => {
            // A fresh record, finalized and unmined, over an older one a
            // lagging replica answers mined with first-seen 0.
            const screen = one(R2, 900_000n, { height: undefined, firstSeen: 1756400600, older: new Set([R1]) });
            const walk = one(R1, 500_000n, { height: 6, firstSeen: 0 });
            expect(merge(walk, new Set([A]), screen).prices.get(A)).toEqual(price(900_000n));
        });

        it(`${road}: the walk's set holds the screen's winner and not the other way — the walk is newer, though the ladder would keep the screen`, () => {
            // The screen's read came from a node whose clock put R1 later;
            // the walk read R1 and ranked R2 above it.
            const screen = one(R1, 500_000n, { height: 900, firstSeen: 2000 });
            const walk = one(R2, 900_000n, { height: 800, firstSeen: 1000, older: new Set([R1]) });
            expect(merge(walk, new Set([A]), screen).prices.get(A)).toEqual(price(900_000n));
        });

        it(`${road}: both sets hold the other's winner — two nodes disagree — and the ladder decides (the critic's sequence, where one node's missing stamp stuck)`, () => {
            // Node A missed R2's sighting (first-seen 0) and ranked by
            // height: R1 at 900 above R2 at 800. Node B saw both, R2 later.
            const screen = one(R1, 500_000n, { height: 900, firstSeen: 1000, older: new Set([R2]) });
            const walk = one(R2, 900_000n, { height: 800, firstSeen: 2000, older: new Set([R1]) });
            expect(merge(walk, new Set([A]), screen).prices.get(A), 'the stamps decide: R2').toEqual(price(900_000n));
            // Neither set holds the other's winner: the ladder too.
            const blind = one(R1, 500_000n, { height: 900, firstSeen: 1000 });
            const blindWalk = one(R2, 900_000n, { height: 800, firstSeen: 2000 });
            expect(merge(blindWalk, new Set([A]), blind).prices.get(A)).toEqual(price(900_000n));
            const later = one(R1, 500_000n, { height: 900, firstSeen: 3000, older: new Set([R2]) });
            expect(merge(walk, new Set([A]), later).prices.get(A), 'and the ladder may keep the screen').toEqual(price(500_000n));
        });
    }
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

describe('a-new-winner-remembers-the-record-it-replaced', () => {
    /**
     * CRITIC-CARRYOVER-6 item 3, the pure half; the app's half is in
     * app.live.test.ts under the same name. On screen: R1, which a full read
     * ranked above R0. The seller edits — R2, finalized and unmined — or
     * removes their last quote — the tombstone T. A walk reads page 0 (R2 or
     * T) and throws, or stops at our page cap, before R1's page: its winner
     * replaced the screen's, but its own set lacked R1, and the merged rank
     * kept only that set. A lagging replica that never saw R2 or T then
     * answered R1, mined, first seen 0 — and the ladder's no-height rule
     * crowned it: the old figure came back, or the removed quote was payable
     * again. A new winner's set now gains the winner it replaced and that
     * one's set.
     */
    const A = 'a'.repeat(64);
    const price = (amount: bigint) => ({ code: 'xec', exponent: 2, amount });
    const R0 = '0'.repeat(64);
    const R1 = '1'.repeat(64);
    const R2 = '2'.repeat(64);
    const T = 'e'.repeat(64);
    const screen = {
        prices: new Map([[A, price(500_000n)]]),
        ranks: new Map([[A, { txid: R1, height: 6, isFinal: true, firstSeen: 1_000, older: new Set([R0]) }]]),
    };
    const lagging = {
        prices: new Map([[A, price(500_000n)]]),
        ranks: new Map([[A, { txid: R1, height: 6, isFinal: true, firstSeen: 0 }]]),
    };

    for (const [road, merge] of [
        ['a walk that threw', mergeFailedRead],
        ['a walk that finished (capped)', mergeFinishedRead],
    ] as const) {
        it(`${road}, a price change: the new winner remembers R1 and R0, and a lagging replica's R1 does not come back`, () => {
            const walk = {
                prices: new Map([[A, price(600_000n)]]),
                ranks: new Map([[A, { txid: R2, height: undefined, isFinal: true, firstSeen: 2_000 }]]),
            };
            const mid = merge(walk, new Set([A]), screen);
            expect(mid.prices.get(A)).toEqual(price(600_000n));
            expect(mid.ranks.get(A)?.txid).toBe(R2);
            expect(mid.ranks.get(A)?.older, 'the replaced winner and its own set').toEqual(new Set([R1, R0]));
            const out = mergeFinishedRead(lagging, new Set([A]), mid);
            expect(out.prices.get(A), 'the old figure does not come back').toEqual(price(600_000n));
            expect(out.ranks.get(A)?.txid).toBe(R2);
        });

        it(`${road}, the last quote removed: the removal remembers R1, and a lagging replica's R1 is not payable again`, () => {
            const walk = {
                prices: new Map<string, TokenPrice>(),
                ranks: new Map([[A, { txid: T, height: undefined, isFinal: true, firstSeen: 2_000 }]]),
            };
            const mid = merge(walk, new Set([A]), screen);
            expect(mid.prices.has(A), 'removed').toBe(false);
            expect(mid.ranks.get(A)?.older).toEqual(new Set([R1, R0]));
            const out = mergeFinishedRead(lagging, new Set([A]), mid);
            expect(out.prices.has(A), 'the removed quote does not come back').toBe(false);
            expect(out.ranks.get(A)?.txid).toBe(T);
        });
    }

    it('keeps the walk’s own set beside it, and never lists the winner below itself', () => {
        // Two nodes that disagreed: the screen's set holds the walk's winner
        // and the walk's holds the screen's, so the ladder decided (R2, by
        // its later stamp) — and the screen's set, which names R2, is merged
        // in without R2.
        const disagreeing = {
            prices: new Map([[A, price(500_000n)]]),
            ranks: new Map([[A, { txid: R1, height: 6, isFinal: true, firstSeen: 1_000, older: new Set([R2, R0]) }]]),
        };
        const walk = {
            prices: new Map([[A, price(600_000n)]]),
            ranks: new Map([[A, { txid: R2, height: 5, isFinal: true, firstSeen: 2_000, older: new Set([R1]) }]]),
        };
        const out = mergeFailedRead(walk, new Set([A]), disagreeing);
        expect(out.prices.get(A)).toEqual(price(600_000n));
        expect(out.ranks.get(A)?.older).toEqual(new Set([R1, R0]));
    });
});

describe('a-lagging-replicas-older-mined-record-loses-to-the-height-seen', () => {
    /**
     * CRITIC-CARRYOVER-8 item 1, the owner's first ruling ("ranks carry the
     * tip height seen at read time"); the app's half, and the walk that
     * records the height, are in app.live.test.ts and descriptions.test.ts
     * under the same name. On screen: R1, the seller's fresh record
     * (600,000), finalized and unmined, read on a page whose newest mined
     * transaction was at 7, from a read that did not reach R0. A lagging
     * replica answers R0 (500,000), mined at 6 and first seen 0: the no-height
     * exception alone would crown it. R0 was already in a block when the
     * kept read saw the chain at 7 and still put R1 on top, so R1 is the
     * newer: the kept record wins, and the old figure never comes back. The
     * round-7 entrenchment sequence — a correct read of R1 after it — ends at
     * 600,000.
     */
    const A = 'a'.repeat(64);
    const price = (amount: bigint) => ({ code: 'xec', exponent: 2, amount });
    const R0 = '0'.repeat(64);
    const R1 = '1'.repeat(64);
    const Rz = 'f'.repeat(64);
    const fresh = (seenHeight: number | undefined) => ({
        prices: new Map([[A, price(600_000n)]]),
        ranks: new Map([
            [
                A,
                {
                    txid: R1,
                    height: undefined,
                    isFinal: true,
                    firstSeen: 5_000,
                    ...(seenHeight === undefined ? {} : { seenHeight }),
                },
            ],
        ]),
    });
    const lagging = (height: number) => ({
        prices: new Map([[A, price(500_000n)]]),
        ranks: new Map([[A, { txid: R0, height, isFinal: true, firstSeen: 0, older: new Set([Rz]) }]]),
    });

    for (const [road, merge] of [
        ['a walk that threw', mergeFailedRead],
        ['a walk that finished', mergeFinishedRead],
    ] as const) {
        it(`${road}: R0, mined at or below the height R1's read saw, never beats R1, and a read of R1 after it ends at 600,000`, () => {
            const mid = merge(lagging(6), new Set([A]), fresh(7));
            expect(mid.prices.get(A), 'the old figure does not come back').toEqual(price(600_000n));
            expect(mid.ranks.get(A)?.txid).toBe(R1);
            expect(mid.ranks.get(A)?.seenHeight, 'the kept rank keeps the height it saw').toBe(7);
            expect(mid.keptShown.has(A), 'the figure on screen is the kept read’s').toBe(true);

            const out = merge(fresh(7), new Set([A]), mid);
            expect(out.prices.get(A), 'the round-7 sequence: 600,000, not 500,000').toEqual(price(600_000n));
            expect(out.ranks.get(A)?.txid).toBe(R1);
        });

        it(`${road}: at the height seen exactly, the kept record wins; one block above it, the exception stands and is remembered`, () => {
            expect(merge(lagging(7), new Set([A]), fresh(7)).prices.get(A), 'mined at the height seen').toEqual(
                price(600_000n),
            );
            const above = merge(lagging(8), new Set([A]), fresh(7));
            expect(above.prices.get(A), 'mined after the kept read saw the chain: the walk’s').toEqual(price(500_000n));
            expect(above.ranks.get(A)?.older, 'every win remembers what it replaced').toEqual(new Set([Rz, R1]));
        });
    }

    it('the stated cost: a read of R1 that saw no mined transaction on its page does not stop the wrong win, and the win is remembered', () => {
        // The discriminator is what keeps a wrong win from being made: with
        // no height seen, the exception crowns R0 as it always did, and —
        // every win remembering what it replaced — R1 is below it for the
        // session.
        const mid = mergeFinishedRead(lagging(6), new Set([A]), fresh(undefined));
        expect(mid.prices.get(A)).toEqual(price(500_000n));
        expect(mid.ranks.get(A)?.older).toEqual(new Set([Rz, R1]));
        expect(mergeFailedRead(fresh(undefined), new Set([A]), mid).prices.get(A)).toEqual(price(500_000n));
    });

    it('two reads that crowned one record, both seeing it unmined, keep the higher height either saw', () => {
        const out = mergeFinishedRead(fresh(5), new Set([A]), fresh(9));
        expect(out.ranks.get(A)?.seenHeight).toBe(9);
        const back = mergeFinishedRead(fresh(9), new Set([A]), fresh(5));
        expect(back.ranks.get(A)?.seenHeight).toBe(9);
        // Mined since: the rank has a height, and a height seen means nothing.
        const mined = {
            prices: new Map([[A, price(600_000n)]]),
            ranks: new Map([[A, { txid: R1, height: 10, isFinal: true, firstSeen: 5_000 }]]),
        };
        expect(mergeFinishedRead(mined, new Set([A]), fresh(9)).ranks.get(A)).toEqual({
            txid: R1,
            height: 10,
            isFinal: true,
            firstSeen: 5_000,
        });
    });
});

describe('a-correct-exception-win-is-not-undone-by-a-lagging-replica', () => {
    /**
     * CRITIC-CARRYOVER-8 item 1, the mirror (the critic's `y8` and `y8b`);
     * the app's half is in app.live.test.ts under the same name. On screen:
     * R1 (500,000), read finalized and unmined before block 900. A walk that
     * stops short of R1 reads the seller's newer record R2 (900,000) — or
     * their removal T2 — mined at 900 and first seen 0: above the height R1's
     * read saw, so the exception crowns it, and that is right. The win
     * remembers R1. A replica behind R1's block then answers R1, finalized
     * and unmined: it never beats the win, so 900,000 stays, and the removed
     * quote stays off.
     */
    const A = 'a'.repeat(64);
    const price = (amount: bigint) => ({ code: 'xec', exponent: 2, amount });
    const R1 = '1'.repeat(64);
    const R2 = '2'.repeat(64);
    const unminedR1 = (seenHeight: number | undefined) => ({
        prices: new Map([[A, price(500_000n)]]),
        ranks: new Map([
            [
                A,
                {
                    txid: R1,
                    height: undefined,
                    isFinal: true,
                    firstSeen: 1_756_400_000,
                    ...(seenHeight === undefined ? {} : { seenHeight }),
                },
            ],
        ]),
    });
    const edit = { prices: new Map([[A, price(900_000n)]]), ranks: new Map([[A, { txid: R2, height: 900, isFinal: true, firstSeen: 0 }]]) };
    const removal = { ranks: new Map([[A, { txid: R2, height: 900, isFinal: true, firstSeen: 0 }]]) };

    for (const [road, merge] of [
        ['a walk that threw', mergeFailedRead],
        ['a walk that finished', mergeFinishedRead],
    ] as const) {
        for (const seen of [850, undefined] as const) {
            const saw = seen === undefined ? 'no height' : `height ${seen}`;
            it(`${road}, R1 read seeing ${saw}: the newer figure stands against a lagging R1`, () => {
                const mid = merge(edit, new Set([A]), unminedR1(seen));
                expect(mid.prices.get(A), 'the exception crowns the newer record').toEqual(price(900_000n));
                expect(mid.ranks.get(A)?.older, 'and the win remembers what it replaced').toEqual(new Set([R1]));
                for (const lag of [mergeFailedRead, mergeFinishedRead]) {
                    expect(lag(unminedR1(seen), new Set([A]), mid).prices.get(A), '900,000 stays').toEqual(
                        price(900_000n),
                    );
                }
            });

            it(`${road}, R1 read seeing ${saw}: the removal stands against a lagging R1`, () => {
                const mid = merge(removal, new Set([A]), unminedR1(seen));
                expect(mid.prices.has(A), 'the removal is on screen').toBe(false);
                for (const lag of [mergeFailedRead, mergeFinishedRead]) {
                    const out = lag(unminedR1(seen), new Set([A]), mid);
                    expect(out.prices.has(A), 'the removed quote stays off').toBe(false);
                    expect(out.descriptions.has(A)).toBe(false);
                }
            });
        }
    }
});

describe('a-lagging-look-at-the-screens-record-keeps-its-height', () => {
    /**
     * CRITIC-CARRYOVER-9 item 1 (the critic's `y9`; the window's decision by
     * recommendation); the app's half is in app.live.test.ts under the same
     * name. On screen: R1 (600,000), read mined at 900 by a read that never
     * reached R0. Replica B, behind block 900 (and behind R0's), answers R1
     * finalized and unmined, on a page whose newest mined transaction is at
     * 850. Replica C answers R0 (500,000), mined at 870 and first seen 0, and
     * never saw R1. Taken whole, B's look put R1 back above every height with
     * 850 as its height seen, so C's R0 (870, above it) won the exception —
     * and, remembered, it beat a fresh read of R1 at 900 for the session.
     * One record read twice keeps its known height: 600,000 holds.
     */
    const A = 'a'.repeat(64);
    const price = (amount: bigint) => ({ code: 'xec', exponent: 2, amount });
    const R0 = '0'.repeat(64);
    const R1 = '1'.repeat(64);
    const Rz = 'f'.repeat(64);
    const screen = {
        prices: new Map([[A, price(600_000n)]]),
        ranks: new Map([[A, { txid: R1, height: 900, isFinal: true, firstSeen: 1_000 }]]),
    };
    const lagging = {
        prices: new Map([[A, price(600_000n)]]),
        ranks: new Map([
            [A, { txid: R1, height: undefined, isFinal: true, firstSeen: 1_000, seenHeight: 850, older: new Set([Rz]) }],
        ]),
    };
    const older = {
        prices: new Map([[A, price(500_000n)]]),
        ranks: new Map([[A, { txid: R0, height: 870, isFinal: true, firstSeen: 0 }]]),
    };

    for (const [road, merge] of [
        ['a walk that threw', mergeFailedRead],
        ['a walk that finished', mergeFinishedRead],
    ] as const) {
        it(`${road}: B's unmined look keeps R1's height 900, so C's R0 at 870 never wins, and a fresh R1 ends at 600,000`, () => {
            const s1 = merge(lagging, new Set([A]), screen);
            expect(s1.prices.get(A)).toEqual(price(600_000n));
            expect(s1.ranks.get(A), 'the known height, never the unmined look whole').toEqual({
                txid: R1,
                height: 900,
                isFinal: true,
                firstSeen: 1_000,
                // Whatever either read ranked below the record is still older than it.
                older: new Set([Rz]),
            });
            expect(s1.ranks.get(A)?.seenHeight, "the lagging replica's height seen is not lent to the mined rank").toBeUndefined();

            for (const next of [mergeFailedRead, mergeFinishedRead]) {
                const s2 = next(older, new Set([A]), s1);
                expect(s2.prices.get(A), 'R0, mined below R1’s block, does not win').toEqual(price(600_000n));
                expect(s2.ranks.get(A)?.txid).toBe(R1);
                const s3 = next(screen, new Set([A]), s2);
                expect(s3.prices.get(A), '600,000 holds').toEqual(price(600_000n));
                expect(s3.ranks.get(A)?.txid).toBe(R1);
            }
        });

        it(`${road}: the control — C straight over the screen, with no lagging look — is the same answer`, () => {
            expect(merge(older, new Set([A]), screen).prices.get(A)).toEqual(price(600_000n));
        });

        it(`${road}: the other way round is a later look, and is taken: a record read unmined, then mined, takes its height`, () => {
            const unmined = { ...lagging, ranks: new Map([[A, { ...lagging.ranks.get(A)!, older: undefined }]]) };
            const out = merge(screen, new Set([A]), unmined);
            expect(out.ranks.get(A)).toEqual({ txid: R1, height: 900, isFinal: true, firstSeen: 1_000 });
        });
    }
});

describe('a-same-record-merge-keeps-a-known-first-seen', () => {
    /**
     * CRITIC-CARRYOVER-10 item 3 (the critic's `y10a`; the window's decision
     * by recommendation, consistent with PLAN B8's "keep"). §5's backwards
     * case: the seller's older record R1 (500,000) mined at 900, their newer
     * edit R2 (900,000) mined a block early, at 899. On screen, a node that
     * never saw R1 in its mempool (first seen 0) crowned R1 by height — §5's
     * stated cost — with R2 ranked below it. Replica B, behind both blocks
     * and blind to R2, answers R1 finalized and unmined, first seen 1,000.
     * Replica C, up to date with both stamps, answers R2 (first seen 2,000)
     * over R1. One record read twice kept the screen's mined look whole, its
     * 0 included, so C's R2 lost to R1 on height again: 500,000. The stamp B
     * knew is kept now, and R2 wins on the stamps: 900,000.
     */
    const A = 'a'.repeat(64);
    const price = (amount: bigint) => ({ code: 'xec', exponent: 2, amount });
    const R1 = '1'.repeat(64);
    const R2 = '2'.repeat(64);
    const screen = {
        prices: new Map([[A, price(500_000n)]]),
        ranks: new Map([[A, { txid: R1, height: 900, isFinal: true, firstSeen: 0, older: new Set([R2]) }]]),
    };
    const lagging = {
        prices: new Map([[A, price(500_000n)]]),
        ranks: new Map([[A, { txid: R1, height: undefined, isFinal: true, firstSeen: 1_000, seenHeight: 850 }]]),
    };
    const current = {
        prices: new Map([[A, price(900_000n)]]),
        ranks: new Map([[A, { txid: R2, height: 899, isFinal: true, firstSeen: 2_000, older: new Set([R1]) }]]),
    };

    for (const [road, merge] of [
        ['a walk that threw', mergeFailedRead],
        ['a walk that finished', mergeFinishedRead],
    ] as const) {
        it(`${road}: B's look keeps R1's height and lends its known stamp, so C's R2 wins on the stamps: 900,000`, () => {
            const s1 = merge(lagging, new Set([A]), screen);
            expect(s1.prices.get(A)).toEqual(price(500_000n));
            for (const next of [mergeFailedRead, mergeFinishedRead]) {
                const s2 = next(current, new Set([A]), s1);
                expect(s2.prices.get(A), '900,000 holds').toEqual(price(900_000n));
                expect(s2.ranks.get(A)?.txid).toBe(R2);
            }
            expect(s1.ranks.get(A), 'the known height and the known stamp').toEqual({
                txid: R1,
                height: 900,
                isFinal: true,
                firstSeen: 1_000,
                older: new Set([R2]),
            });
        });

        it(`${road}: the control — C straight over the screen — is §5's stated cost, unchanged`, () => {
            expect(merge(current, new Set([A]), screen).prices.get(A)).toEqual(price(500_000n));
        });

        it(`${road}: two known stamps keep the look's own, and two unknown ones stay unknown`, () => {
            const known = {
                ...screen,
                ranks: new Map([[A, { txid: R1, height: 900, isFinal: true, firstSeen: 1_500 }]]),
            };
            expect(merge(lagging, new Set([A]), known).ranks.get(A)?.firstSeen, "the mined look's own").toBe(1_500);
            const blind = {
                ...lagging,
                ranks: new Map([[A, { ...lagging.ranks.get(A)!, firstSeen: 0 }]]),
            };
            const plain = { ...screen, ranks: new Map([[A, { txid: R1, height: 900, isFinal: true, firstSeen: 0 }]]) };
            expect(merge(blind, new Set([A]), plain).ranks.get(A)?.firstSeen, 'nothing known is invented').toBe(0);
        });
    }
});
