import { afterEach, describe, expect, it, vi } from 'vitest';
import { CHECKED_CODE, PRICE_CHECK_URL, fetchXecPriceCheck } from './priceCheck';
import { PRICE_CHECK_HOST } from './hosts';
import { scaleRate } from '../domain/fiat';

function stubFetch(impl: (url: string, init?: RequestInit) => unknown): {
    urls: string[];
    inits: (RequestInit | undefined)[];
} {
    const urls: string[] = [];
    const inits: (RequestInit | undefined)[] = [];
    vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
        urls.push(url);
        inits.push(init);
        const out = impl(url, init);
        return out instanceof Promise ? out : Promise.resolve(out);
    });
    return { urls, inits };
}

const ok = (body: unknown) => ({ ok: true, json: () => Promise.resolve(body) });

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('the-second-feed-is-absent-never-stale', () => {
    /**
     * The same contract as the first feed: a failure of any kind is silence,
     * which the judge reads as "unchecked". The shape is the one measured on
     * 2026-09-07 — `quotes.USD.price` — read defensively so a changed body is
     * no answer and never a number from the wrong field.
     */
    it('reads the USD quote from a good answer, at the asset URL, with no referrer', async () => {
        const { urls, inits } = stubFetch(() => ok({ quotes: { USD: { price: 0.000007356 } } }));
        const rate = await fetchXecPriceCheck('usd');
        expect(rate).toBe(scaleRate(0.000007356));
        expect(urls).toEqual([PRICE_CHECK_URL]);
        // The literal, so a lockstep edit of the constant cannot repoint the request.
        expect(PRICE_CHECK_URL).toBe('https://api.coinpaprika.com/v1/tickers/xec-ecash');
        expect(urls[0]).toContain(PRICE_CHECK_HOST);
        expect(urls[0], 'the path names the asset, never a stall').not.toMatch(/ecash:|\/s\//);
        expect(inits[0]?.referrerPolicy).toBe('no-referrer');
        expect(inits[0]?.credentials).toBe('omit');
        expect(inits[0]?.cache).toBe('no-store');
    });

    it('is undefined when the feed rate-limits or errors', async () => {
        stubFetch(() => ({ ok: false, json: () => Promise.resolve({}) }));
        expect(await fetchXecPriceCheck('usd')).toBeUndefined();
    });

    it('is undefined when the network never answered, and never throws', async () => {
        stubFetch(() => Promise.reject(new Error('offline')));
        await expect(fetchXecPriceCheck('usd')).resolves.toBeUndefined();
    });

    it('is undefined when the body changed shape', async () => {
        for (const body of [
            null,
            {},
            { quotes: null },
            { quotes: {} },
            { quotes: { USD: null } },
            { quotes: { USD: {} } },
            { quotes: { USD: { price: '0.000007' } } },
            { quotes: { USD: { price: 0 } } },
            { quotes: { USD: { price: -1 } } },
            { quotes: { EUR: { price: 0.000007 } } },
            { price: 0.000007 },
        ]) {
            stubFetch(() => ok(body));
            expect(await fetchXecPriceCheck('usd'), JSON.stringify(body)).toBeUndefined();
        }
    });

    it('wires the timeout to the request', async () => {
        const { inits } = stubFetch(() => ok({ quotes: { USD: { price: 0.000007 } } }));
        await fetchXecPriceCheck('usd', { timeoutMs: 1234 });
        expect(inits[0]?.signal).toBeInstanceOf(AbortSignal);
        const { inits: bare } = stubFetch(() => ok({ quotes: { USD: { price: 0.000007 } } }));
        await fetchXecPriceCheck('usd');
        expect(bare[0]?.signal).toBeUndefined();
    });
});

describe('the-second-feed-answers-only-for-usd', () => {
    /**
     * One asset, one quote. A code this feed is not asked about is not a
     * failure of the feed: no request is made and the judge sees "unchecked",
     * so a non-USD rate — should a picker ever return — is never refused by a
     * check that could not be made.
     */
    it('makes no request for any other code', async () => {
        const { urls } = stubFetch(() => ok({ quotes: { USD: { price: 0.000007 } } }));
        expect(CHECKED_CODE).toBe('usd');
        for (const code of ['eur', 'vnd', 'USD', '../../evil', '']) {
            expect(await fetchXecPriceCheck(code), code).toBeUndefined();
        }
        expect(urls, 'no request was made').toEqual([]);
    });
});
