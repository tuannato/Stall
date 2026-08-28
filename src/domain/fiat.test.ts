import { describe, expect, it } from 'vitest';
import {
    DEFAULT_FIAT_CODE,
    FIAT_CURRENCIES,
    fiatFractionDigits,
    formatFiat,
    isSupportedFiat,
    scaleRate,
} from './fiat';

/** A plausible XEC price: 1 XEC ≈ $0.00003. */
const USD_RATE = scaleRate(0.00003);

describe('symbol-sits-where-the-language-puts-it', () => {
    /**
     * A prefix is this table's default because most of it takes one, not
     * because it is neutral. "đ9" is not how the amount is written anywhere it
     * is spent, and a figure a seller cannot read at a glance is the same class
     * of defect as one rounded to `$0.00`.
     */
    it('writes the dong after the number, with nothing between', () => {
        const rate = scaleRate(0.0003);
        const out = formatFiat(1_000_000n, rate, 'vnd')!;
        expect(out.endsWith('đ')).toBe(true);
        expect(out.startsWith('đ')).toBe(false);
    });

    it('writes a symbol that is a word after the number, with a space', () => {
        const out = formatFiat(1_000_000n, scaleRate(0.0003), 'nok')!;
        expect(out.endsWith(' kr')).toBe(true);
        expect(out.startsWith('kr')).toBe(false);
    });

    it('leaves every prefix currency exactly where it was', () => {
        // 1,200 XEC = 120,000 sats. At $0.00003/XEC that is $0.036 -> $0.04.
        expect(formatFiat(120_000n, USD_RATE, 'usd')).toBe('$0.04');
        expect(formatFiat(1n, USD_RATE, 'usd')).toBe('< $0.01');
    });

    it('keeps the less-than marker in front of the whole figure', () => {
        // Never "đ< 1": the marker qualifies the amount, not the symbol.
        expect(formatFiat(1n, scaleRate(0.0000001), 'vnd')).toBe('< 1đ');
    });
});

describe('fiat-is-absent-not-stale', () => {
    /**
     * §8's other half: a lying indexer can show a dead offer, and a price feed
     * is the same dependency with worse failure modes — CoinGecko rate-limits,
     * and an hour-old rate renders a two-dollar item at two cents. With no rate
     * there is no figure, never a last-known one.
     */
    it('returns nothing when the rate is missing or unusable', () => {
        expect(formatFiat(1200n, undefined, 'usd')).toBeUndefined();
        expect(formatFiat(1200n, 0n, 'usd')).toBeUndefined();
        expect(scaleRate(0)).toBeUndefined();
        expect(scaleRate(-1)).toBeUndefined();
        expect(scaleRate(Number.NaN)).toBeUndefined();
        expect(scaleRate(Number.POSITIVE_INFINITY)).toBeUndefined();
    });

    it('returns nothing for a currency this feed was never asked about', () => {
        expect(formatFiat(1200n, USD_RATE, 'xyz')).toBeUndefined();
        expect(isSupportedFiat('xyz')).toBe(false);
        expect(isSupportedFiat(DEFAULT_FIAT_CODE)).toBe(true);
    });
});

describe('tiny-fiat-is-not-free', () => {
    /**
     * The measured median purchase is near $0.006, which two decimals print as
     * `$0.00` — a price that reads as free. `formatTokenRate` already solved
     * the same problem for the rate with `< 0.0001`.
     */
    it('says less-than rather than zero', () => {
        // 1 sat = 0.01 XEC ≈ $0.0000000003 at this rate.
        expect(formatFiat(1n, USD_RATE, 'usd')).toBe('< $0.01');
        // A zero-decimal currency's floor is a whole unit.
        expect(formatFiat(1n, scaleRate(0.0000001), 'jpy')).toBe('< ¥1');
    });

    it('never prints a bare zero', () => {
        for (const c of FIAT_CURRENCIES) {
            const out = formatFiat(1n, scaleRate(0.00000001), c.code);
            expect(out, `${c.code} printed nothing`).toBeDefined();
            expect(out!.startsWith('<'), `${c.code} rounded to ${out}`).toBe(true);
        }
    });
});

describe('fiat maths never leaves bigint', () => {
    it('converts satoshis at the feed rate and groups the result', () => {
        // 1,200 XEC = 120,000 sats. At $0.00003/XEC that is $0.036 -> $0.04.
        expect(formatFiat(120_000n, USD_RATE, 'usd')).toBe('$0.04');
        // A large stall: 100,000,000 XEC = 1e10 sats -> $3,000.00
        expect(formatFiat(10_000_000_000n, USD_RATE, 'usd')).toBe('$3,000.00');
    });

    it('drops the fraction for currencies written without one', () => {
        expect(fiatFractionDigits('jpy')).toBe(0);
        expect(fiatFractionDigits('usd')).toBe(2);
        // 1e10 sats = 1e8 XEC at 0.005 JPY/XEC = 500,000 yen
        expect(formatFiat(10_000_000_000n, scaleRate(0.005), 'jpy')).toBe('¥500,000');
    });

    it('survives an amount far beyond a double', () => {
        const huge = 9_007_199_254_740_993n * 1000n;
        const out = formatFiat(huge, USD_RATE, 'usd');
        expect(out).toBeDefined();
        // Exact, not the 9007199254740992 a double would collapse it to.
        expect(out).toContain(',');
        expect(out).not.toContain('e+');
        expect(out).not.toContain('NaN');
    });

    it('ships codes the feed names, with no duplicates', () => {
        const codes = FIAT_CURRENCIES.map((c) => c.code);
        expect(new Set(codes).size).toBe(codes.length);
        expect(codes).toContain('usd');
        expect(codes).toContain('vnd');
        for (const c of codes) {
            expect(c, `${c} must be the lowercase code the feed takes`).toBe(
                c.toLowerCase(),
            );
        }
    });
});
