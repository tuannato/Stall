/**
 * A fiat figure beside the asked amount. Supplementary, never the price.
 *
 * CLAUDE.md §8 governs what may occupy the price node: the number the covenant
 * encodes, not one we computed. This is the same shape as the labelled rate
 * that already sits beside it — a rounded figure, for a glance, in its own
 * node. It never replaces `askedSats`, never enters `[data-role="price"]`, and
 * is typeset at rate size, because a fiat figure large enough to be comfortable
 * is a second price.
 *
 * Two rules the display has to keep, and both come from measurement:
 *
 * - **Absent, never stale.** §8's other half is that chronik is a trusted
 *   indexer and a lying one can show a dead offer. A price feed is the same
 *   kind of dependency with worse failure modes — CoinGecko rate-limits, and a
 *   rate from an hour ago renders a two-dollar item at two cents. When the rate
 *   did not load there is no fiat line at all.
 * - **The small number must not read as free.** PLAN.md records the measured
 *   median purchase near $0.006, which a two-decimal format prints as `$0.00`.
 *   Below the smallest representable figure this says `< $0.01`, exactly as
 *   `formatTokenRate` already says `< 0.0001` for a rate.
 *
 * Pure: no fetch, no DOM. The fetch lives in `src/net/price.ts`.
 */

/** Satoshis per XEC. The chain's unit is the satoshi; the price feed's is XEC. */
const SATS_PER_XEC = 100n;

/**
 * The rate is a float from the feed, and floats are not allowed near the asked
 * amount — so it is converted once, here, into an integer of this many
 * sub-units per whole currency unit and never touched as a float again.
 */
const RATE_SCALE = 1_000_000_000_000n;
const RATE_SCALE_DIGITS = 12;

export type FiatCurrency = {
    /** The code the feed is asked for, lowercase, as CoinGecko names it. */
    readonly code: string;
    readonly name: string;
    readonly symbol: string;
};

/**
 * The currencies this feed actually answers for — the list Cashtab ships
 * against the same endpoint. "Every currency" is a claim the feed cannot back,
 * and offering a code it does not know buys a silent empty answer.
 */
export const FIAT_CURRENCIES: readonly FiatCurrency[] = [
    { code: 'usd', name: 'US Dollar', symbol: '$' },
    { code: 'aed', name: 'UAE Dirham', symbol: 'Dh' },
    { code: 'aud', name: 'Australian Dollar', symbol: '$' },
    { code: 'bhd', name: 'Bahraini Dinar', symbol: 'BD' },
    { code: 'brl', name: 'Brazilian Real', symbol: 'R$' },
    { code: 'gbp', name: 'British Pound', symbol: '£' },
    { code: 'cad', name: 'Canadian Dollar', symbol: '$' },
    { code: 'clp', name: 'Chilean Peso', symbol: '$' },
    { code: 'cny', name: 'Chinese Yuan', symbol: '元' },
    { code: 'eur', name: 'Euro', symbol: '€' },
    { code: 'hkd', name: 'Hong Kong Dollar', symbol: 'HK$' },
    { code: 'inr', name: 'Indian Rupee', symbol: '₹' },
    { code: 'idr', name: 'Indonesian Rupiah', symbol: 'Rp' },
    { code: 'ils', name: 'Israeli Shekel', symbol: '₪' },
    { code: 'jpy', name: 'Japanese Yen', symbol: '¥' },
    { code: 'krw', name: 'Korean Won', symbol: '₩' },
    { code: 'myr', name: 'Malaysian Ringgit', symbol: 'RM' },
    { code: 'ngn', name: 'Nigerian Naira', symbol: '₦' },
    { code: 'nzd', name: 'New Zealand Dollar', symbol: '$' },
    { code: 'nok', name: 'Norwegian Krone', symbol: 'kr' },
    { code: 'php', name: 'Philippine Peso', symbol: '₱' },
    { code: 'rub', name: 'Russian Ruble', symbol: 'р.' },
    { code: 'twd', name: 'New Taiwan Dollar', symbol: 'NT$' },
    { code: 'sar', name: 'Saudi Riyal', symbol: 'SAR' },
    { code: 'zar', name: 'South African Rand', symbol: 'R' },
    { code: 'chf', name: 'Swiss Franc', symbol: 'Fr.' },
    { code: 'try', name: 'Turkish Lira', symbol: '₺' },
    { code: 'vnd', name: 'Vietnamese đồng', symbol: 'đ' },
] as const;

export const DEFAULT_FIAT_CODE = 'usd';

/** Never trust a stored or pasted code: only a shipped row may reach the feed. */
export function isSupportedFiat(code: string): boolean {
    return FIAT_CURRENCIES.some((c) => c.code === code);
}

export function fiatCurrency(code: string): FiatCurrency | undefined {
    return FIAT_CURRENCIES.find((c) => c.code === code);
}

/**
 * Currencies conventionally written without a fractional part. Printing
 * `¥1,200.00` is not wrong so much as foreign — and for these the sub-unit is
 * not in daily use, so the "too small to show" floor is a whole unit.
 */
const ZERO_DECIMAL_CODES = new Set(['jpy', 'krw', 'idr', 'clp', 'vnd']);

export function fiatFractionDigits(code: string): number {
    return ZERO_DECIMAL_CODES.has(code) ? 0 : 2;
}

/** A feed rate as an integer of `RATE_SCALE` sub-units per XEC, or undefined. */
export function scaleRate(xecPriceInFiat: number): bigint | undefined {
    if (!Number.isFinite(xecPriceInFiat) || xecPriceInFiat <= 0) {
        return undefined;
    }
    // toFixed, not multiplication: the float is converted through its decimal
    // text so the bigint never inherits a binary rounding artefact.
    const text = xecPriceInFiat.toFixed(RATE_SCALE_DIGITS);
    const [whole, frac = ''] = text.split('.');
    const digits = `${whole}${frac.padEnd(RATE_SCALE_DIGITS, '0')}`.replace(/^0+(?=\d)/, '');
    try {
        const scaled = BigInt(digits);
        return scaled > 0n ? scaled : undefined;
    } catch {
        return undefined;
    }
}

/**
 * The asked amount in fiat, formatted. `undefined` when there is no rate — the
 * caller paints nothing rather than a figure it cannot stand behind.
 *
 * All bigint: `askedSats` never becomes a `Number`.
 */
export function formatFiat(
    askedSats: bigint,
    scaledRate: bigint | undefined,
    code: string,
): string | undefined {
    const currency = fiatCurrency(code);
    if (currency === undefined || scaledRate === undefined || scaledRate <= 0n) {
        return undefined;
    }
    const digits = fiatFractionDigits(code);
    const unit = 10n ** BigInt(digits);
    // askedSats/100 XEC × rate/RATE_SCALE fiat, held as `unit` sub-units.
    const numerator = askedSats * scaledRate * unit;
    const denominator = SATS_PER_XEC * RATE_SCALE;
    const subUnits = (numerator + denominator / 2n) / denominator;

    if (subUnits <= 0n) {
        // Rounds to nothing at this currency's precision. Saying `0` would read
        // as free, and the measured median purchase is near $0.006.
        const smallest = digits === 0 ? '1' : `0.${'0'.repeat(digits - 1)}1`;
        return `< ${currency.symbol}${smallest}`;
    }
    return `${currency.symbol}${groupSubUnits(subUnits, digits)}`;
}

function groupSubUnits(subUnits: bigint, digits: number): string {
    const text = subUnits.toString().padStart(digits + 1, '0');
    const whole = digits === 0 ? text : text.slice(0, text.length - digits);
    const frac = digits === 0 ? '' : text.slice(text.length - digits);
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return frac === '' ? grouped : `${grouped}.${frac}`;
}
