import { encodeCashAddress } from 'ecashaddrjs';
import { describe, expect, it } from 'vitest';
import { parseSellerParam, sellerFromPath, stallPath } from './route';

const SAMPLE_P2PKH = encodeCashAddress(
    'ecash',
    'p2pkh',
    '00'.repeat(20),
);

describe('parseSellerParam', () => {
    it('accepts compressed pubkey hex', () => {
        const pk =
            '03aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
        const parsed = parseSellerParam(pk);
        expect(parsed.kind).toBe('pubkey');
        if (parsed.kind === 'pubkey') {
            expect(parsed.pubkeyHex).toBe(pk);
        }
    });

    it('rejects uncompressed or wrong-length hex as invalid, not empty', () => {
        expect(parseSellerParam('04' + 'aa'.repeat(32)).kind).toBe('invalid');
        expect(parseSellerParam('02' + 'aa'.repeat(31)).kind).toBe('invalid');
        expect(parseSellerParam('').kind).toBe('invalid');
        expect(parseSellerParam('not-an-address').kind).toBe('invalid');
    });

    it('accepts a p2pkh cashaddr', () => {
        const parsed = parseSellerParam(SAMPLE_P2PKH);
        expect(parsed.kind).toBe('address');
        if (parsed.kind === 'address') {
            expect(parsed.type).toBe('p2pkh');
            expect(parsed.hash).toMatch(/^[0-9a-f]{40}$/);
        }
    });
});

describe('sellerFromPath', () => {
    it('reads /s/:seller and nothing else', () => {
        expect(sellerFromPath('/s/03aabb')).toBe('03aabb');
        expect(sellerFromPath('/s/ecash%3Aqabc')).toBe('ecash:qabc');
        expect(sellerFromPath('/')).toBeUndefined();
        expect(sellerFromPath('/s/')).toBeUndefined();
        expect(sellerFromPath('/stall/x')).toBeUndefined();
    });
});

describe('stallPath', () => {
    it('stall-path-round-trips-cashaddr', () => {
        const path = stallPath(SAMPLE_P2PKH);
        expect(sellerFromPath(path)).toBe(SAMPLE_P2PKH);
        expect(parseSellerParam(sellerFromPath(path)!).kind).toBe('address');

        const prefixless = SAMPLE_P2PKH.replace(/^ecash:/, '');
        const prefixlessPath = stallPath(prefixless);
        expect(sellerFromPath(prefixlessPath)).toBe(SAMPLE_P2PKH);
        expect(parseSellerParam(sellerFromPath(prefixlessPath)!).kind).toBe(
            'address',
        );

        const pk =
            '03aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
        const pkPath = stallPath(pk);
        expect(sellerFromPath(pkPath)).toBe(pk);
        expect(parseSellerParam(sellerFromPath(pkPath)!).kind).toBe('pubkey');

        const invalid = 'not-an-address';
        expect(parseSellerParam(invalid).kind).toBe('invalid');
        expect(sellerFromPath(stallPath(invalid))).toBe(invalid);
        expect(parseSellerParam(sellerFromPath(stallPath(invalid))!).kind).toBe(
            'invalid',
        );
    });
});
