import { encodeCashAddress } from 'ecashaddrjs';
import { describe, expect, it } from 'vitest';
import {
    MAX_PAY_PARAM_CHARS,
    MIN_PAY_PARAM_CHARS,
    PAY_PARAM_PREFIX,
    parseBroadcastParams,
    parsePayParam,
    parseSellerParam,
    payLandingUrl,
    sellerFromPath,
    stallPath,
} from './route';

const SAMPLE_P2PKH = encodeCashAddress(
    'ecash',
    'p2pkh',
    '00'.repeat(20),
);
/** hash160 of nothing anyone holds — never a real shop's script. */
const SAMPLE_P2SH = encodeCashAddress('ecash', 'p2sh', '11'.repeat(20));

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

describe('p2sh-is-not-a-stall-address', () => {
    /**
     * Offers are grouped by public key, and the only thing that reveals one is
     * a p2pkh spend putting it in an input script. A p2sh input never does, and
     * `pubkeyFromSpends` skips those inputs outright — so admitting a script
     * address bought ten pages of history and then said "this address has never
     * sent" about an address that may have sent thousands of times.
     */
    it('is refused at the parse, with its own reason', () => {
        const parsed = parseSellerParam(SAMPLE_P2SH);
        expect(parsed.kind).toBe('invalid');
        if (parsed.kind === 'invalid') {
            expect(parsed.why).toBe('script-address');
        }
    });

    it('does not read as an ordinary unreadable string', () => {
        const notAnAddress = parseSellerParam('hello');
        expect(notAnAddress.kind).toBe('invalid');
        if (notAnAddress.kind === 'invalid') {
            expect(notAnAddress.why).toBeUndefined();
        }
    });

    it('leaves a p2pkh address alone', () => {
        const parsed = parseSellerParam(SAMPLE_P2PKH);
        expect(parsed.kind).toBe('address');
    });
});

describe('a-misspelled-view-param-is-the-ordinary-stall', () => {
    /**
     * `view=broadcast` is the gate. Absent, empty, or any other value is the
     * shop — including a near-miss, because a stream overlay that appeared
     * from a typo is as wrong as one that vanished from one.
     */
    it('absent or empty view is the ordinary stall', () => {
        expect(parseBroadcastParams('')).toBeUndefined();
        expect(parseBroadcastParams('?')).toBeUndefined();
        expect(parseBroadcastParams('?preset=corner&mode=fixed')).toBeUndefined();
        expect(parseBroadcastParams('?m=abc&bg=transparent')).toBeUndefined();
        expect(parseBroadcastParams('?view=')).toBeUndefined();
    });

    it('any other view value is the ordinary stall', () => {
        expect(parseBroadcastParams('?view=shop')).toBeUndefined();
        expect(parseBroadcastParams('?view=Broadcast')).toBeUndefined();
        expect(parseBroadcastParams('?view=broadcas')).toBeUndefined();
        expect(parseBroadcastParams('?view=broadcastt')).toBeUndefined();
        expect(parseBroadcastParams('?view=overlay')).toBeUndefined();
    });

    it('a long view value is not compared as broadcast', () => {
        expect(parseBroadcastParams(`?view=${'broadcast'.padEnd(64, 'x')}`)).toBeUndefined();
    });
});

describe('a-malformed-broadcast-option-falls-back-to-its-default', () => {
    /**
     * Once the gate is open, a bad option becomes that param's default and
     * the page stays a broadcast. Dropping to the shop from a typo in
     * `preset` or `mode` is the failure C1 named.
     */
    const defaults = {
        preset: 'corner',
        mode: 'rail',
        transparent: false,
        cards: 'listings',
    } as const;

    it('view=broadcast with no options is the defaults', () => {
        expect(parseBroadcastParams('?view=broadcast')).toEqual(defaults);
        expect(parseBroadcastParams('view=broadcast')).toEqual(defaults);
    });

    it('unknown and reserved presets fall back to corner', () => {
        expect(parseBroadcastParams('?view=broadcast&preset=lower-third')).toEqual(
            defaults,
        );
        expect(parseBroadcastParams('?view=broadcast&preset=foo')).toEqual(defaults);
        expect(parseBroadcastParams('?view=broadcast&preset=')).toEqual(defaults);
        expect(parseBroadcastParams(`?view=broadcast&preset=${'rail'.padEnd(64, 'x')}`)).toEqual(
            defaults,
        );
    });

    it('unknown mode falls back to rail', () => {
        expect(parseBroadcastParams('?view=broadcast&mode=cycle')).toEqual(defaults);
        expect(parseBroadcastParams('?view=broadcast&mode=')).toEqual(defaults);
        expect(parseBroadcastParams('?view=broadcast&mode=Rail')).toEqual(defaults);
    });

    it('unknown bg is the theme ground, not transparent', () => {
        expect(parseBroadcastParams('?view=broadcast&bg=black')).toEqual(defaults);
        expect(parseBroadcastParams('?view=broadcast&bg=')).toEqual(defaults);
        expect(parseBroadcastParams('?view=broadcast&bg=Transparent')).toEqual(
            defaults,
        );
    });

    it('accepted values are kept', () => {
        expect(
            parseBroadcastParams('?view=broadcast&preset=corner&mode=fixed&bg=transparent'),
        ).toEqual({ ...defaults, mode: 'fixed', transparent: true });
        expect(parseBroadcastParams('?view=broadcast&preset=rail')).toEqual({
            ...defaults,
            preset: 'rail',
            mode: 'rail',
        });
        expect(parseBroadcastParams('?view=broadcast&mode=fixed')).toEqual({
            ...defaults,
            mode: 'fixed',
        });
        expect(parseBroadcastParams('?view=broadcast&bg=transparent')).toEqual({
            ...defaults,
            transparent: true,
        });
    });

    it('ignores mode when the preset is the rail', () => {
        expect(
            parseBroadcastParams('?view=broadcast&preset=rail&mode=fixed'),
        ).toEqual({ ...defaults, preset: 'rail', mode: 'rail' });
    });

    it('other search keys do not drop the overlay', () => {
        expect(
            parseBroadcastParams('?view=broadcast&m=ab&rows=8&fiat=usd&theme=2'),
        ).toEqual(defaults);
    });

    it('does not throw on garbage', () => {
        expect(() => parseBroadcastParams('%')).not.toThrow();
        expect(() => parseBroadcastParams('?view=broadcast&preset=%')).not.toThrow();
        expect(parseBroadcastParams('%')).toBeUndefined();
        expect(parseBroadcastParams('?view=broadcast&preset=%')).toEqual(defaults);
    });
});

describe('the-quote-cards-switch-is-opt-in-and-bounded', () => {
    /**
     * `cards=quotes` is the one switch that changes what the carousel indexes:
     * the seller's own quotes instead of the shop's listings. Absent is the
     * listings, and so is anything else — the same fallback every other
     * broadcast option has, because a stream that silently became a different
     * shop window is the failure C1 named.
     */
    it('is off unless the value is exactly quotes', () => {
        expect(parseBroadcastParams('?view=broadcast')?.cards).toBe('listings');
        expect(parseBroadcastParams('?view=broadcast&cards=quotes')?.cards).toBe(
            'quotes',
        );
        for (const raw of [
            'listings',
            'Quotes',
            'QUOTES',
            'quote',
            'quotess',
            '',
            '1',
            'quotes'.padEnd(64, 'x'),
        ]) {
            expect(
                parseBroadcastParams(`?view=broadcast&cards=${raw}`)?.cards,
                raw,
            ).toBe('listings');
        }
    });

    it('opens no overlay on its own', () => {
        expect(parseBroadcastParams('?cards=quotes')).toBeUndefined();
        expect(parseBroadcastParams('?view=shop&cards=quotes')).toBeUndefined();
    });
});

describe('a-malformed-pay-param-is-ignored', () => {
    /**
     * `?pay=` names an item by a prefix of its token id. Bounded and
     * lowercase-hex or nothing: the value is compared against this stall's own
     * records and never concatenated into a request, but a parser that
     * accepted anything would hand an unbounded search string to the matcher.
     */
    it('takes a bounded lowercase hex prefix and nothing else', () => {
        const id = 'cd'.repeat(32);
        expect(parsePayParam(`?pay=${id.slice(0, MIN_PAY_PARAM_CHARS)}`)).toBe(
            id.slice(0, MIN_PAY_PARAM_CHARS),
        );
        expect(parsePayParam(`?pay=${id}`)).toBe(id);
        expect(parsePayParam(`?view=broadcast&pay=${id}`)).toBe(id);
    });

    it('refuses short, long, uppercase, non-hex and absent', () => {
        const id = 'cd'.repeat(32);
        for (const raw of [
            id.slice(0, MIN_PAY_PARAM_CHARS - 1),
            `${id}c`,
            id.slice(0, 12).toUpperCase(),
            'zzzzzzzzzzzz',
            '',
        ]) {
            expect(parsePayParam(`?pay=${raw}`), raw).toBeUndefined();
        }
        expect(parsePayParam('')).toBeUndefined();
        expect(parsePayParam('?m=abc')).toBeUndefined();
        expect(MAX_PAY_PARAM_CHARS).toBe(64);
    });
});

describe('a-landing-link-names-an-item-by-a-prefix', () => {
    /**
     * The base is passed in, never read from `location`: this module is pure,
     * and a domain function reaching for the browser's URL is the wall §9
     * draws around `src/domain`.
     */
    it('appends the parameter to whatever base it is handed', () => {
        const id = 'cd'.repeat(32);
        const prefix = id.slice(0, PAY_PARAM_PREFIX);
        expect(payLandingUrl('https://stall.cash/s/abc', id)).toBe(
            `https://stall.cash/s/abc?pay=${prefix}`,
        );
        // The prefix is what the parser accepts back, so a scanned link
        // resolves rather than being dropped as malformed.
        expect(parsePayParam(`?pay=${prefix}`)).toBe(prefix);
    });

    it('refuses a token id it could not name', () => {
        expect(payLandingUrl('https://stall.cash/s/abc', 'not-a-token-id')).toBeUndefined();
        expect(payLandingUrl('', 'cd'.repeat(32))).toBeUndefined();
    });
});

describe('a-foreign-prefix-is-not-a-stall-address', () => {
    /**
     * `isValidCashAddress` accepts any prefix whose own checksum validates
     * unless told which one to demand. An `etoken:` or `bitcoincash:` string
     * then reached `view.address` and every composer refused it downstream
     * with no sentence — a figure on the pay sheet and no way to pay. The
     * prefix is demanded at the parse, where a refusal has a screen.
     */
    it('refuses etoken: and bitcoincash: forms of a valid hash', () => {
        for (const prefix of ['etoken', 'bitcoincash']) {
            const foreign = encodeCashAddress(prefix, 'p2pkh', '22'.repeat(20));
            expect(parseSellerParam(foreign).kind, foreign).toBe('invalid');
        }
    });

    it('still resolves the ecash: form and the bare form', () => {
        const own = encodeCashAddress('ecash', 'p2pkh', '22'.repeat(20));
        expect(parseSellerParam(own).kind).toBe('address');
        expect(parseSellerParam(own.slice('ecash:'.length)).kind).toBe('address');
    });
});
