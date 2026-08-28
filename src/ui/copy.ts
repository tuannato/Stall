/** Load-bearing stall copy. Screens quote these; do not paraphrase at the call site. */

export const LINK_UNREADABLE_TITLE = 'This link is unreadable';

export const UNRESOLVABLE_HEADER = 'Stall not readable yet';
export const UNRESOLVABLE_SUB = 'This address has never sent';
export const UNRESOLVABLE_TITLE = 'Nothing to read from this address';
export const UNRESOLVABLE_BODY =
    'Offers are indexed by public key, and an address only reveals its key once it has sent a transaction. This one never has.';
/**
 * The forward half of the seller journey. A new seller who pastes before
 * listing lands here and can read "never sent" as broken; this says it is the
 * expected first step and what the address becomes once they list.
 */
export const UNRESOLVABLE_NEXT =
    'This is the first step, not a dead end. Once you list, come back and this page is your shop — with a link to share and a name you can set.';

export const UNRESOLVABLE_HINT =
    'Listing anything on Agora is a send, so a stall becomes readable the moment its first offer goes up.';

export const SETTINGS_TRUNCATED =
    "We stopped reading this seller's history before the end, so their stall settings may be newer than what is shown.";

export const SETTINGS_UNREADABLE =
    'This seller published stall settings that this page could not read, so it is showing the default look.';

/**
 * Distinct from SETTINGS_UNREADABLE on purpose. The record read perfectly; we
 * simply ship no look under that id. Saying "could not read" here would blame
 * the seller for a row we have not written yet.
 */
export const THEME_UNKNOWN =
    'This seller chose a look this page does not ship, so it is showing the default one.';

export const SET_UP_THIS_STALL = 'Name this stall';
export const PUBLISH_TITLE = 'Name this stall';
export const PUBLISH_NAME_LABEL = 'Stall name';
export const PUBLISH_THEME_LABEL = 'Look';
export const PUBLISH_OPEN_CASHTAB = 'Open in Cashtab';
export const PUBLISH_OPEN_PAY = 'Open my wallet app';
export const PUBLISH_CLOSE = 'Close';

/**
 * The signer is the whole security story here, and Cashtab cannot tell them:
 * it previews an unrecognised LOKAD as "Unknown Protocol" with the raw bytes,
 * so this screen is the only place the record is legible before it is signed.
 */
export const PUBLISH_LEDE =
    'This builds one small transaction that publishes your stall name and look. Stall never holds your key — your wallet signs it.';

/** Paying the right address is not enough: the record counts by who signed. */
export const PUBLISH_MUST_SIGN =
    'Sign it with this stall\u2019s own wallet. Paying from another wallet buys a record that will never be this stall\u2019s.';

export const PUBLISH_WALLET_SHOWS_HEX =
    'Your wallet will show these bytes rather than the words above. That is the same record, written the way the chain stores it.';

export const PUBLISH_NAME_TOO_LONG =
    'Names are up to 32 bytes. Accents and emoji cost more than one byte each.';

/**
 * A stall with no settings is painted in the shipped default, so the first look
 * in the picker is the look already on screen. Publishing it is a real thing to
 * want — it is how the name gets set — but a seller who does it without knowing
 * reads the unchanged stall as a failed publish.
 */
export const PUBLISH_SAME_LOOK =
    'That is the look this stall already shows. Publishing it sets the name and leaves the rest as it is.';

/**
 * Stall cannot tell that a record was signed, for the same reason it cannot
 * tell that a purchase happened: it holds no key and watches no wallet. The
 * live socket listens to the agora group, and a settings transaction does not
 * move the offer book, so nothing arrives to prompt a re-read.
 */
export const PUBLISH_AFTER_SIGNING =
    'Nothing here watches your wallet. After you sign, the network has to agree the record exists before this page will read it — usually a few seconds.';

export const PUBLISH_CHECK_NOW = 'Check for it now';

export const PUBLISH_UNAVAILABLE =
    'This stall has no address yet, so there is nothing to publish from.';

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
 * We stopped reading, and the index did not fail.
 *
 * This screen used to be `UNREACHABLE_BODY` — "No index answered" — which is a
 * statement about the network, made when the network answered every page we
 * asked for. A busy stall reaches it: takes pay the maker as ordinary outputs,
 * not as spends, so the one transaction that reveals the seller's key sinks
 * below `MAX_HISTORY_PAGES` while the shop is doing well.
 */
export const UNRESOLVED_SUB = 'Stopped reading';
export const UNRESOLVED_TITLE = 'We did not finish reading this address';
export const UNRESOLVED_BODY =
    'This address has a long history, and we stopped before finding the key that identifies the stall. Every page we asked for came back — we did not ask for enough.';
export const UNRESOLVED_HINT =
    'A link that carries the seller’s key instead of their address skips this entirely.';

/**
 * The label is what the control actually does. Cashtab's token page cannot be
 * pointed at one maker, so this opens a market — it does not buy, and it must
 * not be named for an outcome Stall cannot deliver.
 */
export const OPEN_IN_CASHTAB = 'Open in Cashtab';
export const TRY_AGAIN = 'Try again';
export const YOU_PAY = 'You pay';
export const MIN_PURCHASE = 'Minimum purchase';
export const THIS_STALLS_STOCK = "This stall's stock";
export const TOKEN_TICKER = 'Ticker';
export const TOKEN_DECIMALS = 'Decimals';
export const TOKEN_ID = 'Token ID';
export const TOKEN_TYPE = 'Token type';
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

/**
 * Says what the control does, not what it feels like. "Save" would suggest the
 * stall is kept here; nothing is. What is kept is which stall this browser
 * opens when someone types the bare domain.
 */
export const OPEN_BY_DEFAULT = 'Open this stall by default';
export const OPENING_BY_DEFAULT = 'Opens by default — stop';

export function itemsForSale(n: number): string {
    return n === 1 ? '1 item for sale' : `${n} items for sale`;
}

export function remainingAtoms(formatted: string): string {
    return `${formatted} left`;
}

export function payAmount(formattedXec: string): string {
    return `${formattedXec} ${XEC}`;
}

/** Labelled unit rate. The ≈ is the point: this is not the asked amount. */
export function tokenRate(formattedXec: string): string {
    return `≈ ${formattedXec} ${XEC}/token`;
}

/**
 * A positive rate that rounded to 0. A bound, not a figure, so no `≈`.
 */
export function tokenRateBound(formattedXec: string): string {
    return `${formattedXec} ${XEC}/token`;
}

/**
 * Chronik's tokenType.type, mapped to the short labels a reader already
 * sees on explorer.e.cash / eCash-Live. Unknown strings pass through rather
 * than being invented; empty input is omitted by the caller.
 */
export function tokenTypeLabel(type: string, protocol: string): string | undefined {
    switch (type) {
        case 'SLP_TOKEN_TYPE_FUNGIBLE':
            return 'SLP V1 (fungible)';
        case 'SLP_TOKEN_TYPE_NFT1_GROUP':
            return 'SLP NFT1 group';
        case 'SLP_TOKEN_TYPE_NFT1_CHILD':
            return 'SLP NFT1 child';
        case 'SLP_TOKEN_TYPE_MINT_VAULT':
            return 'SLP mint vault';
        case 'ALP_TOKEN_TYPE_STANDARD':
            return 'ALP standard';
        case 'SLP_TOKEN_TYPE_UNKNOWN':
            return 'SLP';
        case 'ALP_TOKEN_TYPE_UNKNOWN':
            return 'ALP';
        default:
            if (type !== '') {
                return type;
            }
            if (protocol !== '') {
                return protocol;
            }
            return undefined;
    }
}

/** The apex. No identity, because Stall has no account to show. */
export const HOME_TITLE = 'Stall';
export const HOME_LEDE = "A shop page for one seller's listings on eCash Agora.";
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
    'If this is your stall: list your token in Cashtab, then paste your own eCash address here — the one Cashtab shows on its Receive screen. Your shop opens at a link that is yours to share.';

/**
 * A placeholder for the live demo stall, which needs the owner to list from a
 * real maker first. Copy only — no fetch, no fake shop. The apex stays a door.
 */
export const HOME_DEMO_TITLE = 'See a real stall';
/**
 * The promise is the page, not the inventory. Stall cannot watch this stall any
 * more than it can watch a purchase (§2), so if its last offer sells the link
 * opens an empty shop — and copy that promised "one in action" would have been
 * lying by then, silently. "Not a demo" is the honest part: it is a real seller
 * with real listings, and the buy control there hands to Cashtab like any other.
 */
export const HOME_DEMO_SOON =
    'A real seller’s shop, listed on Agora — not a demo. Open it to see what a stall looks like.';

/** Where "See a real stall" goes. The owner's own stall, decided by the owner. */
export const DEMO_STALL_ADDRESS = 'ecash:qpngxvfhtjuvehjm7la7m6xlwrw7230tzsl4d3vj8r';
export const HOME_DEMO_OPEN = 'Open this stall';

export const LIST_IN_CASHTAB =
    'List the token in Cashtab. Once it is on Agora it will show up here on its own.';

/** The clickable form, for a screen where the seller has not listed yet. */
export const LIST_IN_CASHTAB_LINK = 'List a token in Cashtab';

/** Says what the link is for, so a resolved stall reads as the thing to send. */
/**
 * Said to whoever is looking, and Stall cannot know who that is: it holds no
 * key. The old wording ("This link is your shop") told every visitor they owned
 * the stall they had just been sent. This is true for the seller and the buyer
 * both.
 */
export const SHARE_LEDE =
    'This stall’s link. Send it to anyone — they open it in a browser, and buying happens in their own Cashtab.';

export const SHARE_QR_ALT = 'QR code for this stall’s link';

/**
 * A link long enough to be unscannable is still a link: the copy field stays,
 * and the code goes. Said out loud, because a QR that silently vanishes reads
 * as a broken page — and the alternative shipped for a while was worse, a throw
 * mid-paint that emptied the whole screen.
 */
export const SHARE_QR_TOO_LONG =
    'This link is too long for a scannable code. Copy it instead.';

/** The settings BIP21 as a QR, for signing from a phone wallet. */
export const PUBLISH_QR_ALT = 'QR code for the settings transaction';
export const PUBLISH_QR_LEDE =
    'On a phone, scan this with the wallet that holds this stall to sign the same transaction.';

export const COPY_LINK = 'Copy link';
export const LINK_COPIED = 'Link copied';
export const COPY_LINK_FALLBACK = 'Select and copy this stall’s link.';
