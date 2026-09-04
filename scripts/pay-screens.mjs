/**
 * Which measured screens owed a seller's figure and did not mount one.
 *
 * The layout guard's failure mode is not a red rule, it is a green pass that
 * measured nothing: a fixture whose `prices` map goes missing, or a section
 * that stops painting, leaves every rule about the seller's figure passing
 * over a screen that no longer has one. That has shipped twice — the probe's
 * viewport split and its reduced-motion pass both grew an audit for the same
 * reason.
 *
 * So the naming convention is load-bearing and enforced here: a screen whose
 * name starts with `pay` or carries `quotes` is a screen about the pay rail,
 * and it must have mounted at least one `[data-role="seller-price"]` while it
 * was measured. Its own module so the rule can be tested without starting a
 * browser; the runner is what calls it, because the page must not be the judge
 * of whether the page painted.
 */

/** True for a screen name that promises the seller's own figure. */
export function isPayScreen(name) {
    return name.startsWith('pay') || name.includes('quotes');
}

/**
 * @param {readonly string[]} measured screens the pass actually ran
 * @param {readonly string[]} withQuote screens that mounted a seller figure
 * @returns {string[]} the pay screens that measured no figure, in `measured` order
 */
export function payScreensMissingQuote(measured, withQuote) {
    const seen = new Set(withQuote);
    return measured.filter((name) => isPayScreen(name) && !seen.has(name));
}
