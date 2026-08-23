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
        }
    });
});
