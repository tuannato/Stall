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
