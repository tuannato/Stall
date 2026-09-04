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

import { MAX_PRICE_EXPONENT, XEC_PRICE_CODE, type TokenPrice } from './description';

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
    /**
     * Present when the symbol is written **after** the number, and the value is
     * what sits between them: `''` for a sign that hugs the digits (`9đ`), `' '`
     * for a symbol that is a word (`9 kr`). A prefix is the default because most
     * of this table takes one, not because it is neutral — `đ9` is not how the
     * amount is written anywhere it is spent.
     */
    readonly symbolAfter?: string;
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
    { code: 'nok', name: 'Norwegian Krone', symbol: 'kr', symbolAfter: ' ' },
    { code: 'php', name: 'Philippine Peso', symbol: '₱' },
    { code: 'rub', name: 'Russian Ruble', symbol: 'р.' },
    { code: 'twd', name: 'New Taiwan Dollar', symbol: 'NT$' },
    { code: 'sar', name: 'Saudi Riyal', symbol: 'SAR' },
    { code: 'zar', name: 'South African Rand', symbol: 'R' },
    { code: 'chf', name: 'Swiss Franc', symbol: 'Fr.' },
    { code: 'try', name: 'Turkish Lira', symbol: '₺' },
    { code: 'vnd', name: 'Vietnamese đồng', symbol: 'đ', symbolAfter: '' },
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
 * The seller's quote, in the satoshis a wallet will be asked to sign.
 *
 * **It lives here because the rate does.** `RATE_SCALE` is private to this
 * module on purpose — a second place that knows what a scaled rate means is a
 * second place that can be wrong about it — so the conversion comes to the
 * rate rather than the rate leaving.
 *
 * **XEC has two decimals.** The unit is `SATS_PER_XEC`, a hundred satoshis,
 * and never 10⁸: the off-by-a-million version of this composes links a
 * thousand times the seller's quote.
 *
 * **It rounds up, in both branches.** Rounding down composes a link that pays
 * the seller less than the figure they published, and a `12.345` XEC quote —
 * an exponent this editor does not write but another app may — has no exact
 * answer in satoshis at all.
 *
 * All bigint: an eight-byte amount overflows a double long before the wire
 * runs out of room (§8).
 */
export function satsForQuote(
    price: TokenPrice,
    qty: bigint,
    scaledRate: bigint | undefined,
): bigint | undefined {
    if (typeof qty !== 'bigint' || qty < 1n) {
        return undefined;
    }
    if (typeof price.amount !== 'bigint' || price.amount < 1n) {
        return undefined;
    }
    if (
        !Number.isInteger(price.exponent) ||
        price.exponent < 0 ||
        price.exponent > MAX_PRICE_EXPONENT
    ) {
        return undefined;
    }
    const unit = 10n ** BigInt(price.exponent);
    const items = price.amount * qty * SATS_PER_XEC;
    if (price.code === XEC_PRICE_CODE) {
        // The chain's own unit: no rate is involved, and none is consulted
        // even when the caller happens to hold one.
        return ceilDiv(items, unit);
    }
    if (scaledRate === undefined || scaledRate <= 0n) {
        return undefined;
    }
    return ceilDiv(items * RATE_SCALE, unit * scaledRate);
}

function ceilDiv(numerator: bigint, denominator: bigint): bigint {
    return (numerator + denominator - 1n) / denominator;
}

/**
 * What one XEC costs, for the line that says where a converted figure came
 * from. `undefined` when there is no rate, or no such currency.
 *
 * Not `formatFiat`: an XEC costs a small fraction of a cent, so two decimal
 * places would print every rate as `< $0.01` and the line would explain
 * nothing. Up to `RATE_GLANCE_DIGITS` places with the trailing zeros stripped
 * back to two — enough to recognise the feed's figure, and rounded, which is
 * what the `≈` the caller puts on the line is for.
 */
const RATE_GLANCE_DIGITS = 8;

export function formatXecRate(
    scaledRate: bigint | undefined,
    code: string,
): string | undefined {
    const currency = fiatCurrency(code);
    if (currency === undefined || scaledRate === undefined || scaledRate <= 0n) {
        return undefined;
    }
    const unit = 10n ** BigInt(RATE_GLANCE_DIGITS);
    const half = RATE_SCALE / (unit * 2n);
    const sub = (scaledRate + half) / (RATE_SCALE / unit);
    const text = sub.toString().padStart(RATE_GLANCE_DIGITS + 1, '0');
    const whole = text.slice(0, text.length - RATE_GLANCE_DIGITS);
    const frac = text
        .slice(text.length - RATE_GLANCE_DIGITS)
        .replace(/0+$/, '')
        .padEnd(2, '0');
    return withSymbol(currency, `${whole}.${frac}`);
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
        return `< ${withSymbol(currency, smallest)}`;
    }
    return withSymbol(currency, groupSubUnits(subUnits, digits));
}

/** The `< ` marker stays at the front either way: it qualifies the figure. */
function withSymbol(currency: FiatCurrency, figure: string): string {
    return currency.symbolAfter === undefined
        ? `${currency.symbol}${figure}`
        : `${figure}${currency.symbolAfter}${currency.symbol}`;
}

function groupSubUnits(subUnits: bigint, digits: number): string {
    const text = subUnits.toString().padStart(digits + 1, '0');
    const whole = digits === 0 ? text : text.slice(0, text.length - digits);
    const frac = digits === 0 ? '' : text.slice(text.length - digits);
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return frac === '' ? grouped : `${grouped}.${frac}`;
}
