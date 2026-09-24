import { describe, expect, it } from 'vitest';

import { decidedOf, mergeFailedRead } from './records';

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
