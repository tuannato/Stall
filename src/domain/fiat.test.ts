import { describe, expect, it } from 'vitest';
import {
    DEFAULT_FIAT_CODE,
    FIAT_CURRENCIES,
    fiatFractionDigits,
    formatFiat,
    formatXecRate,
    isPlausibleRate,
    isSupportedFiat,
    judgeRates,
    RATE_DISAGREE_PCT,
    RATE_WINDOWS,
    ratesDisagree,
    satsForQuote,
    scaleRate,
} from './fiat';
import { XEC_PRICE_CODE, type TokenPrice } from './description';
import { QUOTE_UNITS, isQuoteUnit, judgeQuoteRates, quoteUnitExponent } from './fiat';

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

describe('a-rate-outside-the-window-is-implausible', () => {
    /**
     * The window is written in the module's own unit — the scaled `bigint`
     * `scaleRate` returns — and the inputs here go through `scaleRate` too,
     * so the test and `app.ts` speak one unit. A window in floats compared
     * against a scaled integer passes `tsc` and refuses every real rate.
     */
    it('refuses a unit-scale error at either end and keeps every real rate', () => {
        expect(isPlausibleRate('usd', scaleRate(0.00003)!)).toBe(true);
        expect(isPlausibleRate('usd', scaleRate(0.00001)!)).toBe(true);
        expect(isPlausibleRate('usd', scaleRate(0.001)!)).toBe(true);
        // A price in sats-per-XEC, or in another currency by a thousand.
        expect(isPlausibleRate('usd', scaleRate(1)!)).toBe(false);
        expect(isPlausibleRate('usd', scaleRate(5)!)).toBe(false);
        expect(isPlausibleRate('usd', scaleRate(0.00000001)!)).toBe(false);
    });

    it('is inclusive at both ends, and the ends are scaled', () => {
        const window = RATE_WINDOWS['usd']!;
        expect(window.min).toBe(scaleRate(1e-7)!);
        expect(window.max).toBe(scaleRate(1e-1)!);
        expect(isPlausibleRate('usd', window.min)).toBe(true);
        expect(isPlausibleRate('usd', window.max)).toBe(true);
        expect(isPlausibleRate('usd', window.min - 1n)).toBe(false);
        expect(isPlausibleRate('usd', window.max + 1n)).toBe(false);
    });

    it('judges no code that has no window', () => {
        expect(RATE_WINDOWS['vnd']).toBeUndefined();
        expect(isPlausibleRate('vnd', scaleRate(5)!)).toBe(true);
    });
});

describe('two-feeds-that-disagree-past-the-line-are-said-to', () => {
    /**
     * Five per cent of the larger, symmetric, in bigint — `Number()` on a
     * scaled rate is banned on the money path (CLAUDE §8). Either side of the
     * line, either order of the arguments.
     */
    it('draws the line at five per cent of the larger, either way round', () => {
        expect(RATE_DISAGREE_PCT).toBe(5n);
        const p = scaleRate(0.00003)!;
        const under = (p * 951n) / 1000n; // 4.9 % below
        const over = (p * 949n) / 1000n; // 5.1 % below
        expect(ratesDisagree(p, under)).toBe(false);
        expect(ratesDisagree(under, p)).toBe(false);
        expect(ratesDisagree(p, over)).toBe(true);
        expect(ratesDisagree(over, p)).toBe(true);
        expect(ratesDisagree(p, p * 2n), 'a doubled answer').toBe(true);
        expect(ratesDisagree(p, p)).toBe(false);
        expect(ratesDisagree(p, 0n), 'nothing is not agreement').toBe(true);
    });
});

describe('the-figure-comes-from-the-first-feed-and-never-the-check', () => {
    /**
     * The check's rate is not in the judge's return type, so no caller can be
     * handed it. Distinct but agreeing rates make an argument swap visible;
     * a check present while the primary is absent must not become a figure.
     */
    const primary = scaleRate(0.0000300)!;
    const agreeing = scaleRate(0.0000301)!;

    it('prices with the first feed and only speaks with the second', () => {
        expect(judgeRates('usd', primary, agreeing)).toEqual({ kind: 'rate', rate: primary, check: 'agree' });
        expect(judgeRates('usd', primary, primary * 2n)).toEqual({ kind: 'rate', rate: primary, check: 'disagree' });
        expect(judgeRates('usd', primary, undefined)).toEqual({ kind: 'rate', rate: primary, check: 'none' });
        // A check outside the window is no check, not a disagreement.
        expect(judgeRates('usd', primary, scaleRate(5)!)).toEqual({ kind: 'rate', rate: primary, check: 'none' });
    });

    it('refuses on the first feed alone, whatever the second said', () => {
        expect(judgeRates('usd', undefined, agreeing)).toEqual({ kind: 'refused', why: 'no-answer' });
        expect(judgeRates('usd', scaleRate(5)!, agreeing)).toEqual({ kind: 'refused', why: 'implausible' });
    });
});


describe('a-quote-unit-table-the-display-table-cannot-move', () => {
    /**
     * The exponent a quote is written at goes into a permanent record, so it
     * is pinned HERE and never read from `fiatFractionDigits` — a display
     * convention this app may change on any deploy. The two agree today and
     * are allowed to diverge; what may never happen is a published record
     * meaning something different after a cosmetic release.
     */
    it('offers the chain’s unit first and the rate feeds’ unit second', () => {
        expect(QUOTE_UNITS[0]?.code).toBe(XEC_PRICE_CODE);
        expect(QUOTE_UNITS[1]?.code).toBe('usd');
    });

    it('covers every shipped currency exactly once, and the chain’s unit', () => {
        const codes = QUOTE_UNITS.map((u) => u.code);
        expect(new Set(codes).size, 'no code appears twice').toBe(codes.length);
        for (const currency of FIAT_CURRENCIES) {
            expect(isQuoteUnit(currency.code), currency.code).toBe(true);
        }
        expect(isQuoteUnit(XEC_PRICE_CODE)).toBe(true);
        expect(isQuoteUnit('zzz')).toBe(false);
    });

    /**
     * The one rule that actually protects a published record, pinned by
     * value (2026-09-20).
     *
     * Every assertion above is circular: `QUOTE_UNITS` is BUILT from
     * `FIAT_CURRENCIES` with `ZERO_DECIMAL_CODES.has(code) ? 0 : 2`, which
     * is `fiatFractionDigits` character for character over the same set. So
     * "covers every shipped currency" reads its own source, and "an exponent
     * the wire can carry" is satisfied by 0 and by 2 alike — move a code
     * into or out of `ZERO_DECIMAL_CODES` for the display reason its own
     * docblock gives ("Printing ¥1,200.00 is not wrong so much as foreign")
     * and the exponent a permanent record is written at moves with it,
     * every test still green, under a describe named for the rule that
     * forbids exactly this.
     *
     * A literal table is the only thing that can see that. It may GROW —
     * a new row is a new line here — and a row may never change its
     * exponent, which is what this refuses.
     */
    it('pins every unit to its exponent by value, so the display table cannot move one', () => {
        const PINNED: ReadonlyArray<readonly [string, number]> = [
            ['xec', 2],
            ['usd', 2],
            ['aed', 2],
            ['aud', 2],
            ['bhd', 2],
            ['brl', 2],
            ['gbp', 2],
            ['cad', 2],
            ['clp', 0],
            ['cny', 2],
            ['eur', 2],
            ['hkd', 2],
            ['inr', 2],
            ['idr', 0],
            ['ils', 2],
            ['jpy', 0],
            ['krw', 0],
            ['myr', 2],
            ['ngn', 2],
            ['nzd', 2],
            ['nok', 2],
            ['php', 2],
            ['rub', 2],
            ['twd', 2],
            ['sar', 2],
            ['zar', 2],
            ['chf', 2],
            ['try', 2],
            ['vnd', 0],
        ];
        // Every pinned row is still written at the exponent it was pinned at.
        for (const [code, exponent] of PINNED) {
            expect(quoteUnitExponent(code), `${code} changed its exponent`).toBe(exponent);
        }
        // And none was dropped: a row leaving the table takes the editor's
        // ability to restate a record already published in that unit.
        const codes = new Set(QUOTE_UNITS.map((u) => u.code));
        for (const [code] of PINNED) {
            expect(codes.has(code), `${code} left the table`).toBe(true);
        }
    });

    it('writes every unit at an exponent the wire can carry', () => {
        for (const unit of QUOTE_UNITS) {
            expect(Number.isInteger(unit.exponent), unit.code).toBe(true);
            expect(unit.exponent, unit.code).toBeGreaterThanOrEqual(0);
            expect(unit.exponent, unit.code).toBeLessThanOrEqual(8);
            expect(quoteUnitExponent(unit.code)).toBe(unit.exponent);
        }
        expect(quoteUnitExponent('zzz')).toBeUndefined();
    });
});

describe('a-quote-in-any-unit-is-judged-in-usd', () => {
    /**
     * The plausibility window is written for USD and the second feed answers
     * for USD alone, so the USD pair judges the FEED whatever the seller
     * quoted in, and the quote's own rate supplies the FIGURE.
     */
    const USD = scaleRate(0.00003)!;
    const OTHER = scaleRate(0.0007)!;

    it('is the old judgement exactly when the quote is in usd', () => {
        for (const check of [USD, scaleRate(0.0000305)!, scaleRate(0.00009)!, undefined]) {
            expect(judgeQuoteRates('usd', USD, USD, check)).toEqual(
                judgeRates('usd', USD, check),
            );
        }
    });

    it('prices the figure in the quote’s unit and keeps the usd verdict', () => {
        const agreed = judgeQuoteRates('eur', OTHER, USD, USD);
        expect(agreed).toEqual({ kind: 'rate', rate: OTHER, check: 'agree' });
        // The disagreement rule is the old one and it is still run in USD.
        const split = judgeQuoteRates('eur', OTHER, USD, scaleRate(0.00009)!);
        expect(split).toEqual({ kind: 'rate', rate: OTHER, check: 'disagree' });
    });

    it('refuses a figure it has no fence for', () => {
        // No USD answer is no window, and a figure a wallet signs is never
        // composed from an unfenced rate — even with the quote's own rate in.
        expect(judgeQuoteRates('eur', OTHER, undefined, USD)).toEqual({
            kind: 'refused',
            why: 'no-answer',
        });
        // A USD answer outside the window refuses whatever the unit is.
        expect(judgeQuoteRates('eur', OTHER, scaleRate(5)!, USD).kind).toBe('refused');
        // And the quote's own rate missing is no figure.
        expect(judgeQuoteRates('eur', undefined, USD, USD)).toEqual({
            kind: 'refused',
            why: 'no-answer',
        });
    });
});
