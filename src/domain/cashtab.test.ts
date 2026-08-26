import { encodeCashAddress } from 'ecashaddrjs';
import { describe, expect, it } from 'vitest';
import {
    cashtabPublishUrl,
    cashtabTokenUrl,
    payECashPublishUrl,
} from './cashtab';

const P2PKH = encodeCashAddress('ecash', 'p2pkh', '00'.repeat(20));
const P2SH = encodeCashAddress('ecash', 'p2sh', '00'.repeat(20));
const HEX = '0453544c31';
const BIP21 = `${P2PKH}?amount=5.46&op_return_raw=${HEX}`;

describe('cashtabTokenUrl', () => {
    it('returns undefined rather than a guess', () => {
        const id = 'aa'.repeat(32);
        expect(cashtabTokenUrl(id)).toBe(`https://cashtab.com/#/token/${id}`);
        expect(cashtabTokenUrl(id.toUpperCase())).toBe(
            `https://cashtab.com/#/token/${id}`,
        );
        expect(cashtabTokenUrl('not-a-token-id')).toBeUndefined();
        expect(cashtabTokenUrl('aa'.repeat(31))).toBeUndefined();
    });
});

describe('cashtab-web-bip21-is-raw-in-the-hash', () => {
    it('concatenates the BIP21 after #/send?bip21= without encoding', () => {
        const url = cashtabPublishUrl(P2PKH, HEX);
        expect(url).toBe(`https://cashtab.com/#/send?bip21=${BIP21}`);
        expect(url).toContain('#/send?bip21=ecash:');
        expect(url).not.toContain('ecash%3A');
        expect(url).not.toContain('addr=');
    });
});

describe('pay-e-cash-bip21-is-encoded-in-the-query', () => {
    it('puts encodeURIComponent of the same BIP21 in the query', () => {
        const url = payECashPublishUrl(P2PKH, HEX);
        expect(url).toBe(
            `https://pay.e.cash/?bip21=${encodeURIComponent(BIP21)}`,
        );
        expect(url).toContain('?bip21=ecash%3A');
        expect(url).not.toMatch(/\?bip21=ecash:/);
        expect(url).not.toContain('addr=');
    });
});

describe('amount-is-xec-not-satoshis', () => {
    it('writes dust as 5.46 XEC, not 546', () => {
        const inner = (url: string) =>
            decodeURIComponent(url.split('bip21=')[1]!);
        const cashtabInner = inner(cashtabPublishUrl(P2PKH, HEX)!);
        const payInner = inner(payECashPublishUrl(P2PKH, HEX)!);
        expect(cashtabInner).toBe(BIP21);
        expect(payInner).toBe(BIP21);
        expect(cashtabInner).not.toContain('amount=546');
        expect(payInner).not.toContain('amount=546');
    });
});

describe('publish urls refuse rather than guess', () => {
    it('p2sh-is-not-a-publish-destination', () => {
        expect(cashtabPublishUrl(P2SH, HEX)).toBeUndefined();
        expect(payECashPublishUrl(P2SH, HEX)).toBeUndefined();
    });

    it('prefixless p2pkh is canonicalized to ecash:', () => {
        const prefixless = P2PKH.replace(/^ecash:/, '');
        expect(cashtabPublishUrl(prefixless, HEX)).toBe(
            cashtabPublishUrl(P2PKH, HEX),
        );
        expect(payECashPublishUrl(prefixless, HEX)).toBe(
            payECashPublishUrl(P2PKH, HEX),
        );
    });

    it('garbage, etoken, and mixed-case addresses are undefined', () => {
        expect(cashtabPublishUrl('not-an-address', HEX)).toBeUndefined();
        expect(payECashPublishUrl('not-an-address', HEX)).toBeUndefined();
        const etoken = encodeCashAddress('etoken', 'p2pkh', '00'.repeat(20));
        expect(cashtabPublishUrl(etoken, HEX)).toBeUndefined();
        expect(payECashPublishUrl(etoken, HEX)).toBeUndefined();
        const mixed = `${P2PKH.slice(0, -1)}${P2PKH.slice(-1).toUpperCase()}`;
        expect(cashtabPublishUrl(mixed, HEX)).toBeUndefined();
        expect(payECashPublishUrl(mixed, HEX)).toBeUndefined();
    });

    it('op-return-raw-must-look-like-the-encoder', () => {
        const refuse = (hex: string) => {
            expect(cashtabPublishUrl(P2PKH, hex)).toBeUndefined();
            expect(payECashPublishUrl(P2PKH, hex)).toBeUndefined();
        };
        refuse('6a' + HEX);
        refuse(HEX.toUpperCase());
        refuse(HEX + '0');
        refuse('');
        refuse('0x' + HEX);
        refuse('0453544c3g');
        refuse('01'.repeat(223));
        expect(cashtabPublishUrl(P2PKH, '01'.repeat(222))).toBeDefined();
        expect(payECashPublishUrl(P2PKH, '01'.repeat(222))).toBeDefined();
    });
});
