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

export const SETTINGS_UNREADABLE =
    'This seller published stall settings that this page could not read, so it is showing the default look.';

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
 * maker a row belongs to. "Every offer" would overstate it: Cashtab hides
 * some (FIRMA/XECX/unacceptable) and the preselect is cheapest *affordable*.
 */
export const HANDOFF_MAY_PRESELECT =
    'Cashtab opens this token’s offers and preselects the cheapest one the viewer can afford, which may belong to another seller.';
/**
 * Cashtab's depth bars are a per-token spot of the remaining lot (or fiat),
 * not the covenant minimum this card shows as YOU_PAY. Naming that minimum as
 * "the one priced at …" tells the buyer to hunt a number that is not on the
 * book. Say so; do not invent a second figure Stall cannot typeset.
 */
export const HANDOFF_PRICE_IS_NOT_THE_ROW =
    'Cashtab does not name the seller. Its prices are per token, and sometimes in fiat — not the minimum take on this card.';
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

export const OPEN_ANOTHER_STALL = 'Open another stall';

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

export const OPENING_SUB = 'Opening this stall';
export const OPENING_BODY = 'Reading the chain for this seller.';

export const HOME_PASTE_LABEL = 'Open a stall';
export const HOME_PASTE_HINT =
    'Paste the seller’s eCash address, or their compressed public key.';
export const HOME_PASTE_SUBMIT = 'Open stall';
export const HOME_PASTE_INVALID =
    'That is not an eCash address or a compressed public key.';
export const HOME_SELLER =
    'If this is your stall, list the token in Cashtab, then paste the address you sell from.';

export const LIST_IN_CASHTAB =
    'List the token in Cashtab. Once it is on Agora it will show up here on its own.';

export const COPY_LINK = 'Copy link';
export const LINK_COPIED = 'Link copied';
export const COPY_LINK_FALLBACK = 'Select and copy this stall’s link.';
