import { describe, expect, it } from 'vitest';
import { MAX_GROUP_LOOKUPS, loadNftGroups } from './groups';

const hex = (n: number) => n.toString(16).padStart(2, '0').repeat(32);
const GROUP = 'aa'.repeat(32);

function chronikWith(entries: Record<string, string | undefined>, spy?: string[]) {
    return {
        tx: (txid: string) => {
            spy?.push(txid);
            const group = entries[txid];
            return Promise.resolve({
                tokenEntries: [{ tokenId: txid, ...(group === undefined ? {} : { groupTokenId: group }) }],
            });
        },
    };
}

describe('group-lookup-gates-the-id-as-64-hex', () => {
    /**
     * `chronik.tx()` concatenates its argument into a request path and never
     * checks it, and `verifyTxid` sits unused in that same package — the trap
     * CLAUDE.md §5 already records for the `?m=` hint.
     */
    it('never asks for an id that is not a txid', async () => {
        const asked: string[] = [];
        const out = await loadNftGroups(
            chronikWith({}, asked),
            // 'AB'... is a valid txid in the wrong case; the gate is lowercase-only.
            ['../../evil', 'ZZ'.repeat(32), 'abc', '', 'AB'.repeat(32), `${hex(1)}x`],
            () => true,
        );
        expect(asked, 'no request was made').toEqual([]);
        expect(out.groups.size).toBe(0);
    });

    it('refuses a group id the feed returned that is not a txid either', async () => {
        const out = await loadNftGroups(
            chronikWith({ [hex(1)]: 'not-a-txid' }),
            [hex(1)],
            () => true,
        );
        expect(out.groups.size).toBe(0);
    });
});

describe('group-lookup-is-capped-and-never-throws', () => {
    it('asks only for NFT children, once each', async () => {
        const asked: string[] = [];
        const ids = [hex(1), hex(1), hex(2), hex(3)];
        await loadNftGroups(chronikWith({}, asked), ids, (id) => id !== hex(3));
        expect(asked).toEqual([hex(1), hex(2)]);
    });

    it('stops at the cap and says the shop is grouped in part', async () => {
        const ids = Array.from({ length: MAX_GROUP_LOOKUPS + 5 }, (_, i) => hex(i + 1));
        const asked: string[] = [];
        const out = await loadNftGroups(chronikWith({}, asked), ids, () => true);
        expect(asked).toHaveLength(MAX_GROUP_LOOKUPS);
        expect(out.truncated, 'a partial grouping says so').toBe(true);
    });

    it('is not truncated when everything fitted', async () => {
        const out = await loadNftGroups(chronikWith({ [hex(1)]: GROUP }), [hex(1)], () => true);
        expect(out.truncated).toBe(false);
        expect(out.groups.get(hex(1))).toBe(GROUP);
    });

    it('drops a failed read rather than guessing a parent', async () => {
        const chronik = {
            tx: (txid: string) =>
                txid === hex(1)
                    ? Promise.reject(new Error('offline'))
                    : Promise.resolve({ tokenEntries: [{ tokenId: txid, groupTokenId: GROUP }] }),
        };
        // Must not reject: an ungrouped NFT is a smaller loss than a stall that
        // fails to paint, and the offer book does not depend on any of this.
        const out = await loadNftGroups(chronik, [hex(1), hex(2)], () => true);
        expect(out.groups.has(hex(1)), 'a failed read has no parent').toBe(false);
        expect(out.groups.get(hex(2))).toBe(GROUP);
    });
});
