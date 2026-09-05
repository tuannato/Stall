import { describe, expect, it } from 'vitest';
import { WITHHELD_NAMES, WITHHELD_TOKEN_IDS } from './withheld-data';
import { isWithheldToken, normalizeTokenText } from './withheld';

const FIRMA = '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0';
const FCHF = 'a8c83ebe937b9c1b0a7cb7645f43459f57a10043744ddfbc2357e1bd43fe2465';
const FEUR = 'cd751e3dfc23da5344bf66cb8433c31464ab4adbdbc9082f22c71bb53eafa7e8';
const XECX = 'c67bf5c2b6d91cfb46a5c1772582eff80d88686887be10aa63b0945479cf4ed4';
/** Cashtab's offline display blacklist, first entry: the fake Blazer. */
const FAKE_BLAZER = '09c53c9a9fe0df2cb729dd6f99f2b836c59b842d6652becd85658e277caab611';
const FRESH = 'ab'.repeat(32);

const meta = (name: string, ticker: string) => ({
    tokenId: FRESH,
    name,
    ticker,
    decimals: 0,
    tokenType: { protocol: 'SLP' as const, type: 'SLP_TOKEN_TYPE_FUNGIBLE' as const },
});

describe('withheld-tokens-are-the-ids-abc-ships', () => {
    /**
     * The four the owner named (verified in cashtab/src/constants/tokens.ts,
     * cashtab/src/config/app.ts and apps/notifications-server) and ABC's own
     * display blacklist (cashtab/src/config/token.ts, apps/token-server
     * db.ts). Pinned by value so a regeneration that lost one is red.
     */
    it('carries the four by value, with a reason each', () => {
        for (const id of [FIRMA, FCHF, FEUR, XECX]) {
            expect(WITHHELD_TOKEN_IDS.get(id), id).toMatch(/owner rule/);
            expect(isWithheldToken(id, undefined)).toBe(true);
        }
    });

    it('carries ABC’s blacklist ids, each with its reason', () => {
        expect(WITHHELD_TOKEN_IDS.get(FAKE_BLAZER)).toBeDefined();
        expect(WITHHELD_TOKEN_IDS.size).toBeGreaterThanOrEqual(20);
        for (const [id, why] of WITHHELD_TOKEN_IDS) {
            expect(id).toMatch(/^[0-9a-f]{64}$/);
            expect(why.length).toBeGreaterThan(0);
        }
    });

    it('withholds nothing it was not told about', () => {
        expect(isWithheldToken(FRESH, undefined)).toBe(false);
        expect(isWithheldToken(FRESH, meta('Roasted Beans', 'BEAN'))).toBe(false);
    });
});

describe('the-name-fence-is-cashtabs-own-rule', () => {
    /**
     * Cashtab refuses these names at creation (`isProbablyNotAScam`): lower
     * case, trimmed, runs of spaces collapsed, then a whole-string match.
     * A token minted elsewhere with such a name is the case this backstop
     * exists for, so the rule is the same rule — a string Cashtab refuses
     * to mint is a string this page refuses to paint, on the name or the
     * ticker, whatever the case.
     */
    it('normalises the way Cashtab does', () => {
        expect(normalizeTokenText('  Staked   XEC ')).toBe('staked xec');
        expect(normalizeTokenText('FIRMA')).toBe('firma');
    });

    it('withholds by name or by ticker, whatever the case', () => {
        for (const [name, ticker] of [
            ['Firma', 'MINE'],
            ['Mine', 'FIRMA'],
            ['Staked  XEC', 'MINE'],
            ['Mine', 'xecx'],
            ['Firma CHF', 'MINE'],
            ['Mine', 'fEUR'],
            ['Bitcoin', 'MINE'],
            ['Mine', 'BTC'],
            ['Mine', 'USD'],
            ['$', 'MINE'],
        ]) {
            expect(isWithheldToken(FRESH, meta(name, ticker)), `${name} / ${ticker}`).toBe(true);
        }
    });

    it('matches whole strings only, so a neighbour is not caught', () => {
        for (const [name, ticker] of [
            ['Firmament', 'FRMT'],
            ['xecxy', 'XECXY'],
            ['Firma CHF Token', 'FCHFT'],
            ['bitcoin cash abc', 'BCHA'],
            ['Roasted Beans', 'BEAN'],
        ]) {
            expect(isWithheldToken(FRESH, meta(name, ticker)), `${name} / ${ticker}`).toBe(false);
        }
    });

    it('holds the list Cashtab refuses at creation, normalised and sorted', () => {
        expect(WITHHELD_NAMES.length).toBeGreaterThan(1_000);
        for (const entry of ['firma', 'xecx', 'staked xec', 'fchf', 'feur', 'bitcoin', 'usd', '$']) {
            expect(WITHHELD_NAMES).toContain(entry);
        }
        for (const entry of WITHHELD_NAMES) {
            expect(entry, 'normalised').toBe(normalizeTokenText(entry));
        }
        expect([...WITHHELD_NAMES]).toEqual([...WITHHELD_NAMES].sort());
    });
});
