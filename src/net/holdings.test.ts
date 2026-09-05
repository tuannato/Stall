import { describe, expect, it } from 'vitest';
import { MAX_HELD_UTXOS, loadHeldTokens, loadHoldings } from './holdings';

const A = 'aa'.repeat(32);
const B = 'bb'.repeat(32);
const ADDR = 'ecash:qpjqjm0lasd3k54dmuczp20sr05tsykrlyc3j7hv09';

function chronikWith(utxos: unknown, throws = false) {
    return {
        address() {
            return {
                async utxos() {
                    if (throws) {
                        throw new Error('down');
                    }
                    return { utxos } as never;
                },
            };
        },
    };
}

describe('a-holdings-read-that-fails-is-not-a-missing-token', () => {
    /**
     * The distinction the whole picker rests on. An empty set says "this stall
     * holds none of them", which is a statement about the seller; a failed read
     * says nothing about them at all. Collapsing the two tells a seller who
     * paid for a decoration that they do not own it.
     */
    it('answers undefined when the index did not answer', async () => {
        const held = await loadHeldTokens(chronikWith([], true), ADDR, new Set([A]));
        expect(held).toBeUndefined();
    });

    it('answers an empty set when the address genuinely holds none', async () => {
        const held = await loadHeldTokens(chronikWith([]), ADDR, new Set([A]));
        expect(held).toEqual(new Set());
    });

    it('refuses an answer it cannot bound rather than scanning it', async () => {
        const many = Array.from({ length: MAX_HELD_UTXOS + 1 }, () => ({
            token: { tokenId: A },
        }));
        expect(await loadHeldTokens(chronikWith(many), ADDR, new Set([A]))).toBeUndefined();
    });

    it('refuses a shape it did not expect', async () => {
        expect(await loadHeldTokens(chronikWith(undefined), ADDR, new Set([A]))).toBeUndefined();
        expect(await loadHeldTokens(chronikWith('nope'), ADDR, new Set([A]))).toBeUndefined();
    });
});

describe('the holdings read asks a narrow question', () => {
    it('keeps only the ids it was asked about', async () => {
        const held = await loadHeldTokens(
            chronikWith([
                { token: { tokenId: A } },
                { token: { tokenId: B } },
                { token: { tokenId: 'cc'.repeat(32) } },
                {},
            ]),
            ADDR,
            new Set([A]),
        );
        expect(held).toEqual(new Set([A]));
    });

    it('asks nothing at all when no flag is set', async () => {
        let asked = 0;
        const counting = {
            address() {
                asked += 1;
                return {
                    async utxos() {
                        return { utxos: [] };
                    },
                };
            },
        };
        expect(await loadHeldTokens(counting, ADDR, new Set())).toEqual(new Set());
        expect(asked).toBe(0);
    });
});

describe('the-batons-this-wallet-holds-are-read-with-the-holdings', () => {
    /**
     * One read, two answers. A baton names a token this wallet can still
     * mint — the seller's own product — and is the one enumeration this
     * page makes of a wallet's utxos. A balance of somebody else's token is
     * not one, and a malformed id is not one either.
     */
    it('collects mint batons and only mint batons, beside the wanted ids', async () => {
        const B = 'b'.repeat(64);
        const C = 'c'.repeat(64);
        const answer = await loadHoldings(
            chronikWith([
                { token: { tokenId: A } },
                { token: { tokenId: B, isMintBaton: true } },
                { token: { tokenId: B } },
                { token: { tokenId: C, isMintBaton: false } },
                { token: { tokenId: 'not-a-token-id', isMintBaton: true } },
                {},
            ]),
            ADDR,
            new Set([A]),
        );
        expect(answer).toBeDefined();
        expect([...answer!.held]).toEqual([A]);
        expect([...answer!.mintedHere]).toEqual([B]);
    });

    it('answers nothing when the read failed or is too big to trust', async () => {
        expect(await loadHoldings(chronikWith([], true), ADDR, new Set())).toBeUndefined();
        const many = Array.from({ length: MAX_HELD_UTXOS + 1 }, () => ({ token: { tokenId: A, isMintBaton: true } }));
        expect(await loadHoldings(chronikWith(many), ADDR, new Set())).toBeUndefined();
        const none = await loadHoldings(chronikWith([]), ADDR, new Set());
        expect(none?.mintedHere.size).toBe(0);
    });
});
