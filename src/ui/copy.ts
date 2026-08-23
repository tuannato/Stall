/** Load-bearing stall copy. Screens quote these; do not paraphrase at the call site. */

export const LINK_UNREADABLE_TITLE = 'This link is unreadable';

export const UNRESOLVABLE_HEADER = 'Stall not readable yet';
export const UNRESOLVABLE_SUB = 'This address has never sent';
export const UNRESOLVABLE_TITLE = 'Nothing to read from this address';
export const UNRESOLVABLE_BODY =
    'Offers are indexed by public key, and an address only reveals its key once it has sent a transaction. This one never has.';
export const UNRESOLVABLE_HINT =
    'Listing anything on Agora is a send, so a stall becomes readable the moment its first offer goes up.';

export const EMPTY_SUB = 'Nothing for sale right now';
export const EMPTY_TITLE = 'This stall is empty';
export const EMPTY_BODY =
    'The seller has no live offers. Anything they list will appear here on its own.';

export const UNREACHABLE_SUB = 'Prices unavailable';
export const UNREACHABLE_BODY = "We can't read prices right now. No index answered.";

export const BUY_WITH_STALL = 'Buy with Stall';
export const TRY_AGAIN = 'Try again';
export const YOU_PAY = 'You pay';
export const YOU_RECEIVE = 'You receive';
export const NETWORK_FEE = 'Network fee';
export const NETWORK_FEE_PLACEHOLDER = '~5 XEC';
export const BUY_FINE_PRINT =
    "This site's wallet builds and signs the payment. Keys stay in this browser. Stall cannot reverse a purchase and cannot restore a lost backup.";
export const STAGE1_BUY_NOTE = "Buying in Stall's wallet ships in a later stage.";
export const DASHED_PRICE = '—';
export const XEC = 'XEC';
export const TRIED = 'tried';

export function cheaperOffersLine(n: number): string {
    return `${n} offers for this token are cheaper. This price is the seller's.`;
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
