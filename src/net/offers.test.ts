import { describe, expect, it } from 'vitest';
import { loadOffers, type AgoraOfferView, type AgoraReader } from './offers';

const PK = '02' + 'aa'.repeat(32);

function agoraWith(result: readonly AgoraOfferView[] | Error): AgoraReader {
    return {
        async activeOffersByPubKey() {
            if (result instanceof Error) {
                throw result;
            }
            return result;
        },
    };
}

function oneshot(askedSats: bigint, atoms = 1n): AgoraOfferView {
    return {
        variant: { type: 'ONESHOT' },
        outpoint: { txid: 'ab'.repeat(32), outIdx: 1 },
        token: { tokenId: 'cd'.repeat(32), atoms },
        askedSats: () => askedSats,
    };
}

describe('loadOffers', () => {
    it('empty array is empty', async () => {
        const status = await loadOffers(agoraWith([]), PK);
        expect(status).toEqual({ kind: 'empty' });
    });

    it('thrown plugin-missing is plugin-missing', async () => {
        const status = await loadOffers(
            agoraWith(new Error('Failed getting /plugin/agora/50xx/utxos: 404: Plugin "agora" not loaded')),
            PK,
        );
        expect(status.kind).toBe('plugin-missing');
        if (status.kind === 'plugin-missing') {
            expect(status.hosts.some((h) => h.result === 'plugin-missing')).toBe(true);
        }
    });

    it('thrown timeout is unreachable', async () => {
        const status = await loadOffers(
            agoraWith(Object.assign(new Error('timeout of 30000ms exceeded'), { code: 'ETIMEDOUT' })),
            PK,
        );
        expect(status.kind).toBe('unreachable');
    });

    it('maps a oneshot offer and skips one whose askedSats throws', async () => {
        const bad: AgoraOfferView = {
            variant: { type: 'ONESHOT' },
            outpoint: { txid: '11'.repeat(32), outIdx: 0 },
            token: { tokenId: 'ee'.repeat(32), atoms: 1n },
            askedSats: () => {
                throw new Error('unencodable');
            },
        };
        const status = await loadOffers(agoraWith([oneshot(80000n, 1n), bad]), PK);
        expect(status.kind).toBe('offers');
        if (status.kind === 'offers') {
            expect(status.offers).toHaveLength(1);
            expect(status.offers[0]?.askedSats).toBe(80000n);
            expect(status.offers[0]?.askedAtoms).toBe(1n);
            expect(status.offers[0]?.variant).toBe('ONESHOT');
            expect(status.offers[0]?.priceNanoSatsPerAtom).toBe(80_000n * 1_000_000_000n);
            // The one we refused is counted, not swallowed.
            expect(status.dropped).toBe(1);
        }
    });

    it('a-refused-offer-is-counted-not-swallowed', async () => {
        const status = await loadOffers(agoraWith([oneshot(80000n, 1n)]), PK);
        expect(status.kind).toBe('offers');
        if (status.kind === 'offers') {
            // Nothing refused: the field is absent rather than a zero, so a
            // screen cannot print "0 more listings".
            expect(status.dropped).toBeUndefined();
        }
    });

    it('prices a partial via minAcceptedAtoms when askedSats accepts it', async () => {
        const offer: AgoraOfferView = {
            variant: {
                type: 'PARTIAL',
                params: {
                    minAcceptedAtoms: () => 10n,
                    prepareAcceptedAtoms: (a: bigint) => a,
                },
            },
            outpoint: { txid: '22'.repeat(32), outIdx: 0 },
            token: { tokenId: 'ff'.repeat(32), atoms: 100n },
            askedSats: (atoms) => {
                if (atoms === undefined) {
                    throw new Error('Must provide acceptedAtoms for PARTIAL offers');
                }
                return atoms * 2n;
            },
        };
        const status = await loadOffers(agoraWith([offer]), PK);
        expect(status.kind).toBe('offers');
        if (status.kind === 'offers') {
            expect(status.offers[0]?.askedSats).toBe(20n);
            expect(status.offers[0]?.askedAtoms).toBe(10n);
            expect(status.offers[0]?.minAcceptedAtoms).toBe(10n);
            expect(status.offers[0]?.atoms).toBe(100n);
            // Rate of the remaining lot (100 × 2), not the min take (10 × 2).
            expect(status.offers[0]?.priceNanoSatsPerAtom).toBe(2n * 1_000_000_000n);
        }
    });

    it('carries a lot rate that does not invert to the asked sats', async () => {
        const askedLot = 1_945_601n;
        const offer: AgoraOfferView = {
            variant: {
                type: 'PARTIAL',
                params: {
                    minAcceptedAtoms: () => 55n,
                    prepareAcceptedAtoms: (a: bigint) => a,
                },
            },
            outpoint: { txid: '33'.repeat(32), outIdx: 0 },
            token: { tokenId: 'aa'.repeat(32), atoms: 1024n },
            askedSats: (atoms) => {
                if (atoms === undefined) {
                    throw new Error('Must provide acceptedAtoms for PARTIAL offers');
                }
                if (atoms === 55n) {
                    return 104_501n;
                }
                if (atoms === 1024n) {
                    return askedLot;
                }
                throw new Error(`unexpected ${atoms}`);
            },
        };
        const status = await loadOffers(agoraWith([offer]), PK);
        expect(status.kind).toBe('offers');
        if (status.kind === 'offers') {
            expect(status.offers[0]?.askedSats).toBe(104_501n);
            expect(status.offers[0]?.askedAtoms).toBe(55n);
            expect(status.offers[0]?.priceNanoSatsPerAtom).toBe(1_900_000_976_562n);
            expect(status.offers[0]?.priceNanoSatsPerAtom).not.toBe(
                (104_501n * 1_000_000_000n) / 55n,
            );
        }
    });
});

describe('unreadable-offers-are-not-empty', () => {
    it('does not call a shop empty when the index answered with listings we could not read', async () => {
        const agora = {
            activeOffersByPubKey: async () => [
                {
                    variant: { type: 'PARTIAL', params: {} },
                    outpoint: { txid: 'ab'.repeat(32), outIdx: 0 },
                    token: { tokenId: 'cd'.repeat(32), atoms: 12n },
                    askedSats: () => {
                        throw new Error('cannot price');
                    },
                },
            ],
        };
        const status = await loadOffers(agora as never, '02'.repeat(33));
        // "Empty" is a statement about the seller. This is a statement about us.
        expect(status.kind).toBe('unreadable');
        expect(status.kind === 'unreadable' && status.returned).toBe(1);
    });
});
