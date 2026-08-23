import { describe, expect, it } from 'vitest';
import { isPluginMissing, isTimeout, isUnreachable } from './errors';
import { loadOffers } from './offers';

const PLUGIN_ERR = new Error(
    'Failed getting /plugin/agora/50ab/utxos: 404: Plugin "agora" not loaded',
);

describe('plugin-missing-is-not-empty', () => {
    it('classifies the agora plugin 404 as plugin-missing, not unreachable', () => {
        expect(isPluginMissing(PLUGIN_ERR)).toBe(true);
        expect(isUnreachable(PLUGIN_ERR)).toBe(false);
        expect(isTimeout(PLUGIN_ERR)).toBe(false);
    });

    it('loadOffers maps the plugin 404 to plugin-missing, never empty', async () => {
        const agora = {
            activeOffersByPubKey: async () => {
                throw PLUGIN_ERR;
            },
        };
        const status = await loadOffers(agora, '02' + 'aa'.repeat(32));
        expect(status.kind).toBe('plugin-missing');
        expect(status.kind === 'empty').toBe(false);
    });
});

describe('isUnreachable', () => {
    it('treats timeout and ECONNREFUSED as unreachable', () => {
        expect(isUnreachable(new Error('timeout of 30000ms exceeded'))).toBe(true);
        expect(
            isUnreachable(Object.assign(new Error('connect'), { code: 'ECONNREFUSED' })),
        ).toBe(true);
        expect(isUnreachable(new Error('Error connecting to known Chronik instances'))).toBe(
            true,
        );
        expect(isTimeout(Object.assign(new Error('aborted'), { code: 'ECONNABORTED' }))).toBe(
            true,
        );
    });
});
