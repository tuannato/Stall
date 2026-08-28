import { describe, expect, it } from 'vitest';
import { MAX_HELD_UTXOS, loadHeldTokens } from './holdings';

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
