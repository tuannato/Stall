import { describe, expect, it } from 'vitest';
import { cheaperOfferCount, formatAtoms, formatXec } from './money';

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
