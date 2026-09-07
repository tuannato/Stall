import { scaleRate } from '../domain/fiat';
import { PRICE_CHECK_HOST } from './hosts';

/**
 * One XEC in USD from the second feed, CoinPaprika — the same contract as
 * `fetchXecPrice`: **absent, never stale**, never throws, no cache. Every
 * failure — rate-limited, offline, a changed shape, a zero — is `undefined`,
 * which the judge reads as "unchecked" and the sheet says out loud.
 *
 * USD only, on purpose. The endpoint is one asset with one quote, and the
 * only unit this app fetches is `usd` (CLAUDE §8); a code this feed is not
 * asked for is not a failure of the feed and answers `undefined` without a
 * request, so a non-USD rate — should a picker ever return — is never
 * refused by a check that could not be made.
 *
 * What this feed may do with its answer is decided in the domain
 * (`judgeRates`): refuse a figure that disagrees with the first feed, never
 * supply one. A wrong answer here costs a payment; it cannot price one.
 */
export async function fetchXecPriceCheck(
    code: string,
    opts?: { timeoutMs?: number },
): Promise<bigint | undefined> {
    if (code !== CHECKED_CODE) {
        return undefined;
    }
    try {
        const res = await fetch(PRICE_CHECK_URL, {
            // Nothing about this request identifies the stall being viewed —
            // the path names the asset — and no referrer is sent either way.
            referrerPolicy: 'no-referrer',
            credentials: 'omit',
            cache: 'no-store',
            ...(opts?.timeoutMs === undefined
                ? {}
                : { signal: AbortSignal.timeout(opts.timeoutMs) }),
        });
        if (!res.ok) {
            return undefined;
        }
        const body: unknown = await res.json();
        return readCheckRate(body);
    } catch {
        return undefined;
    }
}

/** The one code this feed is asked about. */
export const CHECKED_CODE = 'usd';

/** One asset, one quote: the path names XEC, never the stall. */
export const PRICE_CHECK_URL = `${PRICE_CHECK_HOST}/v1/tickers/xec-ecash`;

/**
 * `{ quotes: { USD: { price: 0.0000073 } } }`, defensively — object, object,
 * object, number, then `scaleRate`, which refuses zero and anything that is
 * not a finite positive. A changed shape reads as "no answer", never as a
 * number from the wrong field.
 */
function readCheckRate(body: unknown): bigint | undefined {
    if (typeof body !== 'object' || body === null) {
        return undefined;
    }
    const quotes = (body as Record<string, unknown>)['quotes'];
    if (typeof quotes !== 'object' || quotes === null) {
        return undefined;
    }
    const usd = (quotes as Record<string, unknown>)['USD'];
    if (typeof usd !== 'object' || usd === null) {
        return undefined;
    }
    const price = (usd as Record<string, unknown>)['price'];
    if (typeof price !== 'number') {
        return undefined;
    }
    return scaleRate(price);
}
