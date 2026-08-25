import { describe, expect, it } from 'vitest';
import { loadTokenMeta } from './tokens';

const ID = 'ab'.repeat(32);
const OTHER = 'cd'.repeat(32);

describe('loadTokenMeta', () => {
    it('dedupes, keeps token type, and drops a token the index did not answer', async () => {
        const chronik = {
            async token(tokenId: string) {
                if (tokenId === OTHER) {
                    throw new Error('not found');
                }
                return {
                    genesisInfo: {
                        tokenName: 'Roasted Beans',
                        tokenTicker: 'BEAN',
                        decimals: 4,
                    },
                    tokenType: {
                        protocol: 'SLP',
                        type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    },
                };
            },
        };
        const metas = await loadTokenMeta(chronik, [ID, ID, OTHER]);
        expect(metas).toHaveLength(1);
        expect(metas[0]).toEqual({
            tokenId: ID,
            name: 'Roasted Beans',
            ticker: 'BEAN',
            decimals: 4,
            tokenType: { protocol: 'SLP', type: 'SLP_TOKEN_TYPE_FUNGIBLE' },
        });
    });

    it('omits tokenType when the index did not name one', async () => {
        const chronik = {
            async token() {
                return {
                    genesisInfo: {
                        tokenName: 'X',
                        tokenTicker: 'X',
                        decimals: 0,
                    },
                };
            },
        };
        const metas = await loadTokenMeta(chronik, [ID]);
        expect(metas[0]?.tokenType).toBeUndefined();
        expect(metas[0]?.decimals).toBe(0);
    });
});
