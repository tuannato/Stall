import { describe, expect, it } from 'vitest';
import { TOKEN_META_WINDOW, loadTokenMeta } from './tokens';

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

describe('token-reads-run-eight-at-a-time', () => {
    /**
     * One `chronik.token()` per listed token, and a stranger can grow that
     * number through gift listings under the seller's key (CLAUDE §10). Until
     * 2026-09-14 every read left at once — two hundred requests in one burst
     * on a two-hundred-token stall — so the reads now run through a window of
     * `TOKEN_META_WINDOW`, inherited by every call site (the cold load, the
     * live path's `fillNewTokens`, the quoted-but-unlisted read, the group
     * names). Nothing visible changes; a busy stall opens in waves. PLAN
     * § Open item 4's "if it must be cheap", chosen after the critic holed
     * the read-the-tail-after-the-paint option three ways.
     */
    it('never has more than the window in flight, and still answers every id in order', async () => {
        let inFlight = 0;
        let peak = 0;
        const ids = Array.from({ length: 20 }, (_, i) => i.toString(16).padStart(2, '0').repeat(32));
        const failing = ids[7]!;
        const chronik = {
            async token(tokenId: string) {
                inFlight += 1;
                peak = Math.max(peak, inFlight);
                await new Promise((resolve) => setTimeout(resolve, 2));
                inFlight -= 1;
                if (tokenId === failing) {
                    throw new Error('not found');
                }
                return {
                    genesisInfo: { tokenName: `T${tokenId.slice(0, 2)}`, tokenTicker: 'T', decimals: 0 },
                };
            },
        };
        const metas = await loadTokenMeta(chronik, [...ids, ...ids]);
        expect(peak, 'in flight at once').toBeLessThanOrEqual(TOKEN_META_WINDOW);
        expect(peak, 'the window is used, not one at a time').toBe(TOKEN_META_WINDOW);
        expect(metas.map((m) => m.tokenId)).toEqual(ids.filter((id) => id !== failing));
    });
});
