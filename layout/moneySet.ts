/**
 * **The money set** (step 5b, 2026-09-26; PROPOSAL §12 as amended by
 * CRITIC-STEP-5 items 1 and 2): the contrast targets that are money, as
 * selector literals.
 *
 * The contrast pass reads every other target over its own text's line
 * rects (`targetFor` in `probe.ts`, D7). A money box keeps the whole-box
 * sampler — the box, its border and radius stepped past, the lattice — or,
 * for a figure outlined on a decoration's bare ground, every ring pixel at
 * the decoration's worst: **a money box is never read by a weaker verdict**.
 * The line read is not weaker for text, but it reads less of the box, and
 * a figure a buyer checks against a wallet is not the place to find out
 * which pixels mattered.
 *
 * The set is closed and pinned by value (`moneySet.test.ts`). Its two
 * halves are both named `the-money-set-is-every-protected-contrast-target`:
 * statically, every selector that is in `PROTECTED` and in `CONTRAST_TEXT`
 * is here and every one here is in `CONTRAST_TEXT`; and in the browser, on
 * every screen of every geometry pass, every painted node that is a contrast
 * target and a protected box matches this set, and every node this set
 * matches is a contrast target standing in a protected box — save the pay
 * sheets' second road (`pay-wallet`), which is money by what it hands a
 * wallet and a `.mini` by its dress, so it is in no protected box.
 *
 * Removing the adopted pseudo blank sheet (D6(ii)) is safe for these boxes
 * only because D6(i) refuses a look pseudo that paints inside a protected
 * box: a whole-box read counts every pixel in the box as ground, and a
 * pseudo glyph standing there would be read as ground.
 */
export const MONEY_SET: readonly string[] = [
    '[data-role="price"]',
    '.row.big dd',
    '.buy',
    '.addr-short',
    '.addr-full',
    '[data-role="publish-hex"]',
    '[data-role="describe-hex"]',
    '[data-role="fiat"]',
    '[data-role="rate"]',
    '[data-role="receipt-amount"]',
    '[data-role="seller-price"]',
    '[data-role="pay-surcharge"]',
    '[data-role="quote-surcharge"]',
    '[data-role="selection-total"]',
    '[data-role="pay-lines"]',
    '[data-role="pay-total"]',
    '[data-role="pay-cashtab"]',
    '[data-role="pay-wallet"]',
];

/** The one money node allowed to stand in no protected box, and why is above. */
export const MONEY_OUTSIDE_PROTECTED = '[data-role="pay-wallet"]';

export const MONEY = MONEY_SET.join(', ');
