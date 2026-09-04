import { describe, expect, it } from 'vitest';
import {
    DEFAULT_FIAT_CODE,
    FIAT_CURRENCIES,
    fiatFractionDigits,
    formatFiat,
    formatXecRate,
    isSupportedFiat,
    satsForQuote,
    scaleRate,
} from './fiat';
import { XEC_PRICE_CODE, type TokenPrice } from './description';

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

describe('satsForQuote', () => {
    /**
     * The seller's quote, in the satoshis a wallet will sign.
     *
     * Every vector below is computed by hand, never by running the helper
     * twice: a round trip through the same arithmetic proves the function
     * agrees with itself and nothing else. XEC has **two** decimals — the unit
     * here is 100 satoshis, not 10⁸, and the off-by-a-million version of this
     * formula composed links a thousand times the quote.
     */
    const usd = (amount: bigint, exponent = 2): TokenPrice => ({
        code: 'usd',
        exponent,
        amount,
    });

    it('turns a dollar quote into satoshis at the frozen rate', () => {
        // $5.00 at 1 XEC = $0.00002 is 250,000 XEC, which is 25,000,000 sats.
        expect(satsForQuote(usd(500n), 1n, scaleRate(0.00002))).toBe(25_000_000n);
        // Three of them, and nothing else changes.
        expect(satsForQuote(usd(500n), 3n, scaleRate(0.00002))).toBe(75_000_000n);
        // $1.00 at 1 XEC = $0.00004 is 25,000 XEC = 2,500,000 sats.
        expect(satsForQuote(usd(100n), 1n, scaleRate(0.00004))).toBe(2_500_000n);
    });

    it('reads an xec quote with no rate at all', () => {
        // 5,000.00 XEC is 500,000 satoshis, whatever any feed says today.
        expect(
            satsForQuote({ code: XEC_PRICE_CODE, exponent: 2, amount: 500_000n }, 1n, undefined),
        ).toBe(500_000n);
        // 12.345 XEC — an exponent this editor does not write, which another
        // app may. 1,234.5 satoshis has no exact answer, so it rounds up.
        expect(
            satsForQuote({ code: XEC_PRICE_CODE, exponent: 3, amount: 12_345n }, 1n, undefined),
        ).toBe(1235n);
        // A rate offered beside an xec quote is ignored, not applied.
        expect(
            satsForQuote(
                { code: XEC_PRICE_CODE, exponent: 2, amount: 500_000n },
                1n,
                scaleRate(0.00002),
            ),
        ).toBe(500_000n);
    });

    it('rounds up, because rounding down underpays the seller', () => {
        // $0.01 at 1 XEC = $0.00003 is 333.33… XEC = 33,333.33 sats.
        expect(satsForQuote(usd(1n), 1n, scaleRate(0.00003))).toBe(33_334n);
    });

    it('answers nothing rather than a figure it cannot stand behind', () => {
        expect(satsForQuote(usd(500n), 1n, undefined), 'no rate').toBeUndefined();
        expect(satsForQuote(usd(500n), 1n, 0n), 'a zero rate').toBeUndefined();
        expect(satsForQuote(usd(500n), 0n, scaleRate(0.00002)), 'no items').toBeUndefined();
        expect(satsForQuote(usd(0n), 1n, scaleRate(0.00002)), 'no price').toBeUndefined();
        expect(
            satsForQuote(usd(500n, 9n as unknown as number), 1n, scaleRate(0.00002)),
            'an exponent off the wire',
        ).toBeUndefined();
    });

    it('holds an eight-byte amount without ever becoming a double', () => {
        // Past 2^53, where a `Number` would start losing the low bits.
        const amount = 2n ** 60n;
        expect(
            satsForQuote({ code: XEC_PRICE_CODE, exponent: 0, amount }, 1n, undefined),
        ).toBe(amount * 100n);
    });
});

describe('the-rate-a-pay-sheet-shows-is-a-glance', () => {
    /**
     * One XEC, in the currency the quote is in, at enough digits to be
     * recognisable — an XEC costs a small fraction of a cent, so the fiat
     * formatter's two decimals would print every rate as `< $0.01`.
     *
     * Rounded for a glance and marked as one by the `≈` the caller puts on
     * the line: it is what the conversion above was computed from, never a
     * second price.
     */
    it('prints the feed’s figure with its own digits and its own symbol', () => {
        expect(formatXecRate(scaleRate(0.00002), 'usd')).toBe('$0.00002');
        expect(formatXecRate(scaleRate(0.000035), 'usd')).toBe('$0.000035');
        // Two decimals at least, so a round figure does not read as an integer.
        expect(formatXecRate(scaleRate(1), 'usd')).toBe('$1.00');
        expect(formatXecRate(undefined, 'usd')).toBeUndefined();
        expect(formatXecRate(scaleRate(0.00002), 'not-a-code')).toBeUndefined();
    });
});
