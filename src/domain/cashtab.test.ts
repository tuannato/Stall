import { encodeCashAddress } from 'ecashaddrjs';
import { describe, expect, it } from 'vitest';
import { DUST_SATS } from './money';
import {
    cashtabPayUrl,
    cashtabPublishUrl,
    cashtabTokenUrl,
    payBip21,
    payECashPayUrl,
    payECashPublishUrl,
    publishBip21,
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

describe('the-pay-link-is-its-own-composer', () => {
    /**
     * A sibling of `publishBip21`, never a widening of it. The publish link's
     * amount is dust and always dust — four call sites depend on that — while
     * this one carries a figure derived from the seller's quote, so one
     * function taking an optional amount would be one function two very
     * different screens could get wrong.
     */
    const MEMO = '0453544c50';

    it('leaves the publish link exactly as it was', () => {
        // Dust, and dust in XEC: `546` here would send 546 XEC.
        expect(publishBip21(P2PKH, HEX)).toBe(BIP21);
        expect(publishBip21(P2PKH, HEX)).toContain('amount=5.46');
    });

    it('writes the amount ungrouped, with exactly two decimals', () => {
        // A whole number keeps its point, a round figure keeps its zeros, and
        // nothing carries a thousands separator: three things `formatXec`
        // does that a BIP21 must not.
        expect(payBip21(P2PKH, 25_000_000n, MEMO)).toBe(
            `${P2PKH}?amount=250000.00&op_return_raw=${MEMO}`,
        );
        expect(payBip21(P2PKH, 546n, MEMO)).toBe(
            `${P2PKH}?amount=5.46&op_return_raw=${MEMO}`,
        );
        expect(payBip21(P2PKH, 100_000n, MEMO)).not.toContain(',');
    });

    it('mirrors the publish pair: raw in the fragment, encoded in the query', () => {
        const bip21 = payBip21(P2PKH, 25_000_000n, MEMO)!;
        expect(cashtabPayUrl(P2PKH, 25_000_000n, MEMO)).toBe(
            `https://cashtab.com/#/send?bip21=${bip21}`,
        );
        expect(cashtabPayUrl(P2PKH, 25_000_000n, MEMO)).not.toContain('ecash%3A');
        expect(payECashPayUrl(P2PKH, 25_000_000n, MEMO)).toBe(
            `https://pay.e.cash/?bip21=${encodeURIComponent(bip21)}`,
        );
    });

    it('refuses a script address and a payload the encoder would not write', () => {
        expect(payBip21(P2SH, 25_000_000n, MEMO)).toBeUndefined();
        expect(payBip21(P2PKH, 25_000_000n, `6a${MEMO}`)).toBeUndefined();
        expect(payBip21(P2PKH, 25_000_000n, MEMO.toUpperCase())).toBeUndefined();
        expect(payBip21(P2PKH, 25_000_000n, '01'.repeat(223))).toBeUndefined();
    });
});

describe('a-sub-dust-quote-has-no-pay-link', () => {
    /**
     * Under 546 satoshis the network will not relay the output at all, so a
     * link composed from one is a link that fails in the wallet after the
     * buyer has read the note and pressed Pay. Nothing composes it.
     */
    const MEMO = '0453544c50';

    it('composes nothing below the dust floor and everything at it', () => {
        expect(DUST_SATS).toBe(546n);
        expect(payBip21(P2PKH, DUST_SATS - 1n, MEMO)).toBeUndefined();
        expect(cashtabPayUrl(P2PKH, DUST_SATS - 1n, MEMO)).toBeUndefined();
        expect(payECashPayUrl(P2PKH, DUST_SATS - 1n, MEMO)).toBeUndefined();
        expect(payBip21(P2PKH, DUST_SATS, MEMO)).toBeDefined();
        expect(payBip21(P2PKH, 0n, MEMO)).toBeUndefined();
        expect(payBip21(P2PKH, -1n, MEMO)).toBeUndefined();
    });
});
