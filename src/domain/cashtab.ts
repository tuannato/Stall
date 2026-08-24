/**
 * Where a buyer is sent to complete a purchase. Stall reads; Cashtab signs.
 *
 * Deliberately no `action=BUY`. That deep-link action hands the buyer to a
 * confirm screen which selects the cheapest affordable offer and never names
 * the maker, so on a per-seller stall it can quietly sell someone else's
 * tokens. With no action the wallet falls back to opening its token page,
 * where every offer is listed and the buyer can pick a row themselves.
 */

const CASHTAB_ORIGIN = 'https://cashtab.com';
const TOKEN_ID_RE = /^[0-9a-f]{64}$/;

/**
 * Cashtab uses hash routing, so the path lives after the `#`. Returns
 * undefined rather than a guess when the token id is not one we can vouch for.
 */
export function cashtabTokenUrl(tokenId: string): string | undefined {
    const id = tokenId.toLowerCase();
    if (!TOKEN_ID_RE.test(id)) {
        return undefined;
    }
    return `${CASHTAB_ORIGIN}/#/token/${id}`;
}
