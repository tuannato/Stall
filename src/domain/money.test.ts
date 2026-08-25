import { describe, expect, it } from 'vitest';
import {
    cheaperOfferCount,
    formatAtoms,
    formatTokenRate,
    formatXec,
    formatXecFromNanoSats,
    NANOSATS_PER_SAT,
    nanoSatsPerAtom,
} from './money';

describe('formatXec', () => {
    it('formats sats as XEC without Number()', () => {
        expect(formatXec(1200n * 100n)).toBe('1,200');
        expect(formatXec(5n * 100n)).toBe('5');
        expect(formatXec(1n)).toBe('0.01');
        expect(formatXec(10n ** 16n)).toBe('100,000,000,000,000');
        expect(formatXec(2n ** 53n + 1n)).toBe('90,071,992,547,409.93');
    });
});

describe('formatAtoms', () => {
    it('keeps full atom precision past Number.MAX_SAFE_INTEGER', () => {
        const atoms = 0xffffffffffffffffn;
        expect(formatAtoms(atoms, 0)).toBe(atoms.toString());
        expect(formatAtoms(1_500n, 3)).toBe('1.5');
        expect(formatAtoms(12n, 0)).toBe('12');
    });
});

describe('cheaperOfferCount', () => {
    it('counts strictly cheaper same-token offers', () => {
        const selected = { tokenId: 'aa', askedSats: 1200n, askedAtoms: 1n };
        const others = [
            { tokenId: 'aa', askedSats: 1000n, askedAtoms: 1n },
            { tokenId: 'aa', askedSats: 500n, askedAtoms: 1n },
            { tokenId: 'aa', askedSats: 2000n, askedAtoms: 1n },
            { tokenId: 'bb', askedSats: 1n, askedAtoms: 1n },
        ];
        expect(cheaperOfferCount(selected, others)).toBe(2);
    });
});

describe('rate-is-not-the-asked-price', () => {
    /**
     * AgoraPartial.priceNanoSatsPerAtom floor-divides. The 1024-atom lot
     * that asks 1,945,601 sats has a per-atom rate whose product is
     * 1,945,600.999999488 sats — not the asked amount. A display that
     * treated the rate as a price would be wrong by a sat.
     */
    it('floor-divides and does not invert to the asked sats', () => {
        const askedSats = 1_945_601n;
        const atoms = 1024n;
        const rate = nanoSatsPerAtom(askedSats, atoms);
        expect(rate).toBe(1_900_000_976_562n);
        expect(rate! * atoms).toBe(1_945_600_999_999_488n);
        expect(rate! * atoms).not.toBe(askedSats * NANOSATS_PER_SAT);
        expect(nanoSatsPerAtom(askedSats, 0n)).toBeUndefined();
    });

    it('formats the unrounded nanosat amount in bigint, past Number.MAX_SAFE_INTEGER', () => {
        expect(formatXecFromNanoSats(1_900_000_976_562n * 10n ** 1n)).toBe(
            '190.0000976562',
        );
        expect(formatTokenRate(120_000_000_000_000n, 0)).toBe('1,200');
        // 2^53 + 1 sats, as nanosats, must not pass through Number().
        const unsafeSats = 2n ** 53n + 1n;
        expect(formatXecFromNanoSats(unsafeSats * NANOSATS_PER_SAT)).toBe(
            formatXec(unsafeSats),
        );
        expect(formatTokenRate(unsafeSats * NANOSATS_PER_SAT, 0)).toBe(
            formatXec(unsafeSats),
        );
        expect(formatTokenRate(1n, 19)).toBeUndefined();
    });
});

describe('rate-is-rounded-for-a-glance', () => {
    /**
     * The 1024-atom lot that asks 1,945,601 sats has a per-token rate of
     * 190.0000976562 XEC at 1 decimal. That is the exact floor-div, and
     * it is unreadable. 2 XEC decimals at ≥ 10 rounds it to 190. This
     * fails if formatTokenRate goes back to the full bigint fraction.
     */
    it('does not print the full nanosat fraction', () => {
        expect(formatTokenRate(1_900_000_976_562n, 1)).toBe('190');
        expect(formatTokenRate(1_900_000_976_562n, 1)).not.toBe(
            '190.0000976562',
        );
        expect(formatXecFromNanoSats(1_900_000_976_562n * 10n ** 1n)).toBe(
            '190.0000976562',
        );
        expect(formatTokenRate(1_900_000_976_562n, 4)).toBe('190,000.1');
        expect(formatTokenRate(1_900_000_976_562n, 0)).toBe('19');
    });

    it('keeps 4 decimals below 10 XEC and half-up at the 2-decimal unit', () => {
        // 5.55555 XEC: < 10, 4 dp, half-up.
        expect(formatTokenRate(555_555_000_000n, 0)).toBe('5.5556');
        // 190.005 XEC: ≥ 10, 2 dp, half-up. Floor would stay 190.
        expect(formatTokenRate(19_000_500_000_000n, 0)).toBe('190.01');
        expect(formatTokenRate(90_000_719n, 0)).toBe('0.0009');
        expect(formatTokenRate(20_000_125_000_000n, 0)).toBe('200');
        expect(formatTokenRate(20_000_125_000_000n, 2)).toBe('20,000.13');
    });
});

describe('tiny-rate-is-not-free', () => {
    /**
     * 4 XEC decimals is the < 10 band. A positive rate under half that
     * quantum rounds to 0n; printing `0` would read as free. A per-atom
     * 0 is a lost rate, not a bound.
     */
    it('does not print a positive rate as 0', () => {
        expect(formatTokenRate(1_000_000n, 0)).toBe('< 0.0001');
        expect(formatTokenRate(1_000_000n, 0)).not.toBe('0');
        expect(formatTokenRate(5_000_000n, 0)).toBe('0.0001');
        expect(formatTokenRate(0n, 0)).toBeUndefined();
        expect(formatTokenRate(0n, 0)).not.toBe('0');
        expect(formatTokenRate(0n, 0)).not.toBe('< 0.0001');
    });
});
