import { isSupportedFiat, scaleRate } from '../domain/fiat';
import { PRICE_HOST } from './hosts';

/**
 * One XEC in a fiat currency, from CoinGecko — the endpoint Cashtab asks, so
 * the currency list this app offers is one that has been answered in
 * production.
 *
 * **Absent, never stale.** Every failure returns `undefined` and the caller
 * paints no fiat line: rate-limited (429 is the common one), offline, a body
 * that is not the shape we expected, a code the feed does not know. A rate from
 * an hour ago would render a two-dollar item at two cents, and unlike a stale
 * offer — which the seller can at least see on their own stall — nobody would
 * ever find out. There is no cache here on purpose.
 *
 * This never throws. A price feed must not be able to take the shop down: the
 * asked amount is on chain and does not need this to be right.
 */
export async function fetchXecPrice(code: string): Promise<bigint | undefined> {
    // The code is concatenated into a URL, so it is checked against the shipped
    // table first rather than trusted from storage or a query string.
    if (!isSupportedFiat(code)) {
        return undefined;
    }
    const url = `${PRICE_HOST}/api/v3/simple/price?ids=ecash&vs_currencies=${code}`;
    try {
        const res = await fetch(url, {
            // Nothing about this request identifies the stall being viewed, and
            // `Referrer-Policy: no-referrer` keeps the path off it too.
            referrerPolicy: 'no-referrer',
            credentials: 'omit',
            cache: 'no-store',
        });
        if (!res.ok) {
            return undefined;
        }
        const body: unknown = await res.json();
        return readRate(body, code);
    } catch {
        return undefined;
    }
}

/**
 * `{ ecash: { usd: 0.00003 } }`, defensively. The feed is a third party: a
 * changed shape must read as "no rate", never as a number from the wrong field.
 */
function readRate(body: unknown, code: string): bigint | undefined {
    if (typeof body !== 'object' || body === null) {
        return undefined;
    }
    const outer = (body as Record<string, unknown>)['ecash'];
    if (typeof outer !== 'object' || outer === null) {
        return undefined;
    }
    const value = (outer as Record<string, unknown>)[code];
    if (typeof value !== 'number') {
        return undefined;
    }
    return scaleRate(value);
}
