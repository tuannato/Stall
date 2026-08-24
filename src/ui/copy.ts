/** Load-bearing stall copy. Screens quote these; do not paraphrase at the call site. */

export const LINK_UNREADABLE_TITLE = 'This link is unreadable';

export const UNRESOLVABLE_HEADER = 'Stall not readable yet';
export const UNRESOLVABLE_SUB = 'This address has never sent';
export const UNRESOLVABLE_TITLE = 'Nothing to read from this address';
export const UNRESOLVABLE_BODY =
    'Offers are indexed by public key, and an address only reveals its key once it has sent a transaction. This one never has.';
export const UNRESOLVABLE_HINT =
    'Listing anything on Agora is a send, so a stall becomes readable the moment its first offer goes up.';

export const SETTINGS_TRUNCATED =
    "We stopped reading this seller's history before the end, so their stall settings may be newer than what is shown.";

export const EMPTY_SUB = 'Nothing for sale right now';
export const EMPTY_TITLE = 'This stall is empty';
export const EMPTY_BODY =
    'The seller has no live offers. Anything they list will appear here on its own.';

export const UNREADABLE_SUB = 'Prices unavailable';
export const UNREADABLE_BODY =
    'The index answered with listings this page could not read. That is a fault on our side, not an empty stall.';

export const UNREACHABLE_SUB = 'Prices unavailable';
export const UNREACHABLE_BODY = "We can't read prices right now. No index answered.";

/**
 * The label is what the control actually does. Cashtab's token page cannot be
 * pointed at one maker, so this opens a market — it does not buy, and it must
 * not be named for an outcome Stall cannot deliver.
 */
export const OPEN_IN_CASHTAB = 'Open in Cashtab';
export const TRY_AGAIN = 'Try again';
export const YOU_PAY = 'You pay';
export const YOU_RECEIVE = 'You receive';
export const HANDOFF_FINE_PRINT =
    'Cashtab builds and signs the payment, not this site. Stall never holds a key, never sees one, and cannot reverse a purchase.';
/**
 * The one thing a buyer cannot work out for themselves. Cashtab's order book
 * preselects the cheapest offer the viewer can afford and never labels which
 * maker a row belongs to, so a buyer who wants this seller has to be told.
 */
export const HANDOFF_MAY_PRESELECT =
    'Cashtab opens every offer for this token and preselects the cheapest one, which may belong to another seller.';
/**
 * The covenant prices the minimum accept, not the whole shelf. A list row that
 * shows that figure beside the full remaining stock reads as the price of the
 * lot, and on live offers the lot can cost an order of magnitude more. Said
 * only when the priced quantity is smaller than what is left.
 */
export const PRICE_FROM = 'from';
export const UNBUYABLE_BADGE = 'Not buyable';

export function unbuyableLine(minimum: string, left: string): string {
    return `The contract will not accept less than ${minimum}, and only ${left} is left. No amount can be bought; only the seller can cancel it.`;
}

export const DASHED_PRICE = '—';
export const XEC = 'XEC';
export const TRIED = 'tried';

/**
 * Rows in Cashtab's order book carry a price and nothing else that identifies
 * the maker, so the price is the only handle a buyer has on this seller's
 * offer.
 */
export function lookForPriceLine(formattedXec: string): string {
    return `This seller's offer is the one priced at ${formattedXec} ${XEC}.`;
}

export function itemsForSale(n: number): string {
    return n === 1 ? '1 item for sale' : `${n} items for sale`;
}

export function youReceiveAmount(asked: string, remaining: string): string {
    return `${asked} of ${remaining}`;
}

export function remainingAtoms(formatted: string): string {
    return `${formatted} left`;
}

export function payAmount(formattedXec: string): string {
    return `${formattedXec} ${XEC}`;
}

/** The apex. No identity, because Stall has no account to show. */
export const HOME_TITLE = 'Stall';
export const HOME_LEDE = 'A shop page for anything listed on eCash Agora.';
export const HOME_HOW =
    'Every stall lives at /s/ followed by the seller\u2019s eCash address. Open that link and you see what they have listed right now, priced as the contract on chain encodes it.';
export const HOME_NO_ACCOUNT =
    'There is nothing to sign up for and nothing to install. Stall reads the chain and holds no keys.';
