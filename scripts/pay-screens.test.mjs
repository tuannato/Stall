import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { isPayScreen, payScreensMissingQuote } from './pay-screens.mjs';

/**
 * The layout runner's own self-check, tested where it can be tested: the rule
 * is about a browser run, but the predicate is arithmetic on two lists.
 *
 * `node --test` rather than vitest, like the icon Worker's suite — vitest's
 * `include` is `src/**` and this file is neither in `src` nor TypeScript.
 */
describe('every-pay-screen-mounts-a-quote-or-the-run-fails', () => {
    it('names a pay screen that measured no seller figure', () => {
        assert.deepEqual(
            payScreensMissingQuote(['offers', 'pay', 'pay-xec'], ['offers', 'pay']),
            ['pay-xec'],
        );
    });

    it('says nothing when every pay screen mounted one', () => {
        assert.deepEqual(
            payScreensMissingQuote(
                ['offers', 'pay', 'broadcast-quotes', 'plugin-missing-quotes'],
                ['pay', 'broadcast-quotes', 'plugin-missing-quotes'],
            ),
            [],
        );
    });

    it('asks nothing of a screen that never promised a figure', () => {
        // `offers` carries quotes today and may stop; the rule is about names
        // that promise the rail, so a shop screen is not one of them.
        assert.deepEqual(payScreensMissingQuote(['offers', 'unreachable'], []), []);
        assert.equal(isPayScreen('offers'), false);
        assert.equal(isPayScreen('unreachable'), false);
    });

    it('reads both halves of the convention', () => {
        for (const name of ['pay', 'pay-xec', 'broadcast-quotes', 'plugin-missing-quotes']) {
            assert.equal(isPayScreen(name), true, name);
        }
    });

    it('reports in the order the pass measured them', () => {
        assert.deepEqual(
            payScreensMissingQuote(['pay-xec', 'broadcast-quotes', 'pay'], []),
            ['pay-xec', 'broadcast-quotes', 'pay'],
        );
    });
});
