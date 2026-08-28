import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchXecPrice } from './price';
import { PRICE_HOST } from './hosts';

function stubFetch(impl: (url: string) => unknown): string[] {
    const seen: string[] = [];
    vi.stubGlobal('fetch', (url: string) => {
        seen.push(url);
        const out = impl(url);
        return out instanceof Promise ? out : Promise.resolve(out);
    });
    return seen;
}

const ok = (body: unknown) => ({ ok: true, json: () => Promise.resolve(body) });

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('fiat-is-absent-not-stale', () => {
    /**
     * Every failure is silence. A rate from an hour ago renders a two-dollar
     * item at two cents, and unlike a stale offer — which the seller can see on
     * their own stall — nobody would find out. There is no cache here.
     */
    it('reads the rate from a good answer', async () => {
        const seen = stubFetch(() => ok({ ecash: { usd: 0.00003 } }));
        const rate = await fetchXecPrice('usd');
        expect(rate).toBeDefined();
        expect(rate! > 0n).toBe(true);
        expect(seen[0]).toContain(PRICE_HOST);
        expect(seen[0]).toContain('vs_currencies=usd');
    });

    it('is undefined when the feed rate-limits or errors', async () => {
        stubFetch(() => ({ ok: false, json: () => Promise.resolve({}) }));
        expect(await fetchXecPrice('usd')).toBeUndefined();
    });

    it('is undefined when the network never answered', async () => {
        stubFetch(() => Promise.reject(new Error('offline')));
        // Must not throw: a price feed may not take the shop down.
        await expect(fetchXecPrice('usd')).resolves.toBeUndefined();
    });

    it('is undefined when the body changed shape', async () => {
        for (const body of [
            null,
            {},
            { ecash: null },
            { ecash: {} },
            { ecash: { usd: 'not a number' } },
            { ecash: { usd: 0 } },
            { xec: { usd: 0.00003 } },
        ]) {
            stubFetch(() => ok(body));
            expect(await fetchXecPrice('usd'), JSON.stringify(body)).toBeUndefined();
        }
    });
});

describe('the currency code never reaches the url unchecked', () => {
    /**
     * The code is concatenated into a request path. It comes from storage or a
     * picker, so it is checked against the shipped table first — the same
     * discipline `iconUrl` uses for a token id.
     */
    it('does not fetch at all for a code we do not ship', async () => {
        const seen = stubFetch(() => ok({ ecash: { usd: 1 } }));
        expect(await fetchXecPrice('../../evil')).toBeUndefined();
        expect(await fetchXecPrice('usd&x=1')).toBeUndefined();
        expect(await fetchXecPrice('USD')).toBeUndefined();
        expect(seen, 'no request was made').toEqual([]);
    });
});
