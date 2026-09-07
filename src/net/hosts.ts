/** Constructor order only. Do not add a host that lacks the agora plugin. */
export const CHRONIK_HOSTS = [
    'https://chronik-native1.fabien.cash',
    'https://chronik-native2.fabien.cash',
    'https://chronik-native3.fabien.cash',
] as const;

export type ChronikHost = (typeof CHRONIK_HOSTS)[number];

/**
 * The price feed. One origin, and the only non-chronik host `connect-src`
 * carries — the same endpoint Cashtab asks, so the currency list this app
 * offers is one that has been answered in production.
 *
 * A third party we now trust for a number: it can be down, it rate-limits
 * (429 is the common failure), and it can be wrong. None of that may reach the
 * asked amount — the fiat line is supplementary and absent when the rate did
 * not load. See `src/domain/fiat.ts`.
 */
export const PRICE_HOST = 'https://api.coingecko.com';

/**
 * The second price feed, asked beside the first wherever `readPayRate` runs
 * (the pay sheet's open, the `?pay=` landing, the press-time valve, the
 * refresh control) — and **only ever to speak about a figure, never to
 * supply one** (`judgeRates`, `src/domain/fiat.ts`). One feed cannot catch
 * its own wrong-but-plausible answer (its reply is cached for a minute or
 * two, so asking it twice reads the same number); two aggregators asked at
 * the same moment can — with the honest ceiling that both draw on the same
 * few venues, so this catches a unit bug, a stale cache during a move or
 * one hijacked host, and not a bad print on the dominant market. Nor a
 * network-position attacker: whoever can lie through one feed can usually
 * suppress the other, and then the figure rests on one feed inside the
 * window alone, which is why "one feed" is said on the rate line.
 *
 * Measured once, 2026-09-07, from the build machine, one sample each — facts
 * with a date, not standing properties: CORS `*`; no key; `ratelimit-limit`
 * 20,000 with a reset ~25 days out (a monthly budget; whether it is per IP
 * or shown per caller is not known from one reading); ticker `last_updated`
 * 77 s before the call, `cache-control: max-age=30`; 0.08 % from CoinGecko
 * at the same moment. Chosen over Binance (region blocks reported, quotes
 * USDT) and CoinCap (v2 retired, v3 keyed) on the same day's reading. The
 * Free plan is described as personal and non-commercial — the owner's call
 * to use it, 2026-09-07, recorded in PLAN § Decided; if it is ever refused,
 * the check goes absent and the rate line names one feed. It sees a
 * visitor's IP at those moments and nothing else: no referrer, no cookie,
 * and the URL names the asset, not the stall.
 */
export const PRICE_CHECK_HOST = 'https://api.coinpaprika.com';
