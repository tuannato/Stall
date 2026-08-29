/** Load-bearing stall copy. Screens quote these; do not paraphrase at the call site. */

export const LINK_UNREADABLE_TITLE = 'This link is unreadable';

/**
 * A valid address that cannot host a stall. It must not borrow the unreadable
 * copy above ("this is not an address" is false about it) nor the never-sent
 * copy below ("list, then come back" is a loop it can never leave).
 */
export const SCRIPT_ADDRESS_TITLE = 'A script address cannot be a stall';
export const SCRIPT_ADDRESS_BODY =
    'This is a real eCash address, but it is a script address. Offers are indexed by a public key, and a script address never reveals one — so there is no shop to open here, however many times it has sent. A stall opens from an address that starts with q, the one Cashtab shows on its Receive screen.';
export const HOME_PASTE_SCRIPT_ADDRESS =
    'That is a script address. A stall needs the address Cashtab shows on its Receive screen.';

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
/**
 * A seller going to sign a record, which is a different act from a buyer going
 * to look at a market — so it is a different label.
 *
 * Not "Sign in Cashtab": "sign in" is the fixed phrase for logging in, and this
 * product's own promise is that there is nothing to sign up for. "Sign with"
 * says who does the signing, which is the whole point of the handoff.
 */
export const PUBLISH_OPEN_CASHTAB = 'Sign with Cashtab';
export const PUBLISH_OPEN_PAY = 'Sign with another wallet';
/**
 * Decoration, in the sheet the seller already publishes from. The copy has to
 * carry three states without four controls: a row nobody can buy yet, a row on
 * sale that this stall does not hold, and a row it does. Silence about the
 * middle one is how a seller sets a flag, sees nothing, and is told nothing.
 */
export const DECOR_LABEL = 'Decoration';
export const DECOR_NONE = 'None';
export const DECOR_LEDE =
    'Decorations are tokens. Your stall wears one when it holds the token and your settings say so — so this is two things, and both are yours.';
export const DECOR_PREVIEW_ONLY =
    'You are looking at it, not wearing it. Publishing this changes nothing until the stall holds the token.';
export const DECOR_NOT_MINTED =
    'This one is not on sale yet. You can look at it; nothing can hold it until it exists.';
export const DECOR_HELD = 'This stall holds the token, so publishing will paint it.';
export const DECOR_SHOP = 'See the decorations';
/**
 * Where that link goes. **Undefined until the shop exists**: a control that
 * cannot be aimed is not painted, for the same reason the buy link is never
 * `action=BUY` — a button that does not do what it says is worse than no
 * button. Set this to the fittings stall's address and the link appears.
 */
export const FITTINGS_STALL: string | undefined = undefined;

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
 * tell that a purchase happened: it holds no key and watches no wallet. What it
 * now watches is the stall *address*, so a record published from that wallet
 * does arrive on its own — and every word here is about the conditions on that,
 * because **none of them is ours to promise.**
 *
 * The wrong wallet signs a record that will never belong to this stall. A host
 * without avalanche pre-consensus turns "seconds" into "next block", and which
 * of them is running it is not observable from here — so no timing is claimed.
 * A socket that is down delivers nothing and says nothing about being down.
 *
 * Hence the shape: what has to be true, said as a condition, and a control that
 * asks outright. `publish-does-not-promise-a-record-will-arrive` pins the
 * absence rather than the sentence, so it cannot rot into approving whatever
 * copy happens to be here.
 */
export const PUBLISH_AFTER_SIGNING =
    'This page cannot see your wallet. After you sign, the network has to agree the record exists — and while this page still has a connection, it re-reads on its own once that happens. If your stall still looks the same, ask for it here.';

export const PUBLISH_CHECK_NOW = 'Check for it now';

export const PUBLISH_UNAVAILABLE =
    'This stall has no address yet, so there is nothing to publish from.';

export const EMPTY_SUB = 'Nothing for sale right now';
export const EMPTY_TITLE = 'This stall is empty';
export const EMPTY_BODY =
    'The seller has no live offers. Anything they list will appear here on its own.';

/**
 * Our failure, said out loud on a working shop. `unreadable` covers the case
 * where every listing failed; this is the far commoner one where some did, and
 * it used to be silent — seven of ten shown reads as seven listed, which is a
 * claim about the seller's inventory made out of our own gap.
 */
export function droppedOffers(count: number): string {
    return count === 1
        ? 'One more listing is on the chain and could not be read here, so it is not shown.'
        : `${count} more listings are on the chain and could not be read here, so they are not shown.`;
}

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
 * The label is what the control actually does, and every one of these says a
 * different thing — a buyer going to look at a market, a seller going to sign a
 * record, a seller going to list for the first time. They read as one control
 * when they all say "Open in Cashtab".
 *
 * Cashtab's token page cannot be pointed at one maker, so this opens a market:
 * it does not buy, and it must not be named for an outcome Stall cannot
 * deliver. "See offers" is also what the two handoff notes beside it explain —
 * that the page lists every maker's offers, not this seller's.
 *
 * Not "Check in Cashtab": in English "check in" is a fixed phrase for
 * registering an arrival, and the button would read as check-in.
 */
export const OPEN_IN_CASHTAB = 'See offers in Cashtab';
export const TRY_AGAIN = 'Try again';
export const YOU_PAY = 'You pay';
export const MIN_PURCHASE = 'Minimum purchase';
export const THIS_STALLS_STOCK = "This stall's stock";
/** The fold over the technical rows — reference data, one tap away. */
export const TOKEN_FACTS_SUMMARY = 'Token details';
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

/**
 * A token listed more than once is one card, and the card's figure is the
 * cheapest current ask. Deliberately not a second "from": `PRICE_FROM` already
 * means "the minimum take costs less than the lot", and one word carrying both
 * meanings on one card is how a buyer mis-reads a price. This label says
 * exactly which meaning the figure has, and the count invites the detail,
 * where every listing is shown.
 */
export function lowestOfListings(n: number): string {
    return `lowest of ${n} listings`;
}

/** The detail's heading over every listing of one token, scoped to this shop. */
export function listingsAtThisStall(n: number): string {
    return `${n} listings at this stall`;
}

/** One listing's minimum take, inline beside its asked amount. */
export const listingMin = (formatted: string): string => `min ${formatted}`;

export function unbuyableLine(minimum: string, left: string): string {
    return `The contract will not accept less than ${minimum}, and only ${left} is left. No amount can be bought; only the seller can cancel it.`;
}

export const DASHED_PRICE = '—';
export const XEC = 'XEC';
export const TRIED = 'tried';

export const OPEN_ANOTHER_STALL = 'Open another stall';

/**
 * The three tabs. Our words lead everywhere: the centre tab is `Shop · <name>`
 * with the seller's name subordinate (owner's call after the critic argued a
 * bare name in our navigation bar is chrome in our voice — a stall named
 * "Settings" would read as Stall speaking). Unnamed stalls show `Shop` alone.
 */
export const TAB_SHOP = 'Shop';
export const TAB_STUDIO = 'Studio';
export const TAB_ACTIVITY = 'Activity';

/** The studio: the seller's tools behind one tab, launching the same sheets. */
export const STUDIO_SUB = 'Seller studio';
export const STUDIO_LEDE =
    'The tools for whoever holds this stall’s wallet. Anyone can look; only that wallet can sign.';
export const STUDIO_OPEN_SETTINGS = 'Name this stall, choose a look';
export const STUDIO_SETTINGS_HINT =
    'One small record signs your name, look, decorations and token descriptions — built here, signed in your wallet.';

/** The activity panel: what this page watched arrive, said honestly. */
export const ACTIVITY_SUB = 'Live activity';
export const activitySince = (time: string): string =>
    `Watching since ${time} — what this page has seen arrive, newest first. Nothing is stored.`;
export const ACTIVITY_GAPS =
    'Some activity may be missing: the connection dropped or a transaction could not be read.';
export const ACTIVITY_NOT_WATCHING =
    'Not watching. This screen has no live connection — activity starts once the stall’s offers can be read.';
export const ACTIVITY_QUIET = 'Nothing has arrived yet. New activity appears here on its own.';
/**
 * Event rows say only what a transaction provably was. `book` deliberately
 * never says "sold": a cancel and a fully-taken offer are the same shape on
 * the wire, and naming a sale where a seller withdrew stock is a money claim
 * this page cannot back (PLAN-REDESIGN P3.5).
 */
export const EVENT_BOOK = 'The offer book moved';
/**
 * The two things the plugin entries can prove, in words that claim nothing
 * more: `consumed` is true of a take and of a cancel alike — the wire cannot
 * tell them apart, so neither may the copy.
 */
export const EVENT_BOOK_CONSUMED = 'An offer was consumed';
export const EVENT_BOOK_APPEARED = 'An offer appeared';
export const EVENT_BOOK_BOTH = 'An offer was consumed and another appeared';
export const EVENT_SETTINGS = 'Stall settings published';
export const EVENT_DESCRIPTION = 'A token description published';
export const EVENT_TOKEN_MOVE = 'A decoration token moved';
export const EVENT_OTHER = 'A transaction at this address';

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

/**
 * Conditional, because an empty stall is a link anyone can hold — a buyer who
 * bookmarked a shop that has since sold out reads an unconditional "list the
 * token in Cashtab" as an instruction meant for them. The never-spent screen
 * can address the seller directly (nobody else can be looking at an address
 * that has never sent); a resolved, empty one cannot.
 */
export const LIST_IN_CASHTAB =
    'If this is your stall: list the token in Cashtab, and it will appear here on its own.';

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

/** The currency the supplementary fiat figure is read in. */
export const FIAT_LABEL = 'Show prices in';

/**
 * The homepage a token's minter wrote into genesis. Permanent on chain, and
 * checked by nobody — least of all by this page, which reads the chain and
 * verifies no claim made in it. So the destination is printed in full, the
 * reader is told who wrote it, and nothing opens without a second click.
 */
export const TOKEN_LINK_LABEL = 'Link from the token’s creator';
/**
 * "Link", never "address". Every other address on this page is an eCash
 * address, so calling this one an address invites a reader to read it as the
 * seller's wallet — which is the one thing it is certainly not.
 */
export const TOKEN_LINK_WARNING =
    'This link was written into the token by whoever minted it. Stall does not check it and cannot vouch for it — it is not verified, and it may not belong to this seller.';
export const TOKEN_LINK_CONFIRM_TITLE = 'Leave Stall?';
export const TOKEN_LINK_CONFIRM = 'Visit this link';
export const TOKEN_LINK_CANCEL = 'Stay here';
export const tokenLinkHost = (host: string): string => `You will be taken to ${host}`;

/**
 * Section headings. The third is named for what it is: a row lands there when
 * *we* could not read its type, so it must not be dressed as a kind of token
 * the seller chose to list.
 */
export const SECTION_ETOKEN = 'Tokens';
export const SECTION_NFT = 'NFTs';
export const SECTION_DECOR = 'Decorations';
export const SECTION_UNSORTED = 'Type not read';
export const SECTION_UNSORTED_WHY =
    'These are listed, and this page could not read what kind of token they are. That is our failure, not a claim about them.';
/** A collection heading carries a name and a count, and never a price. */
export const collectionOf = (name: string): string => `Collection · ${name}`;
/**
 * A decoration run's heading: which look these fit. The look name is ours, from
 * the shipped table — never a string read off a token, which anyone can write.
 */
export const decorFor = (look: string): string => `For ${look}`;
export const NFT_GROUPS_TRUNCATED =
    'Some NFTs are shown without their collection: this page stopped looking after the first few.';

/**
 * The seller's own words about a token. Labelled as theirs, because this page
 * verifies a signature and nothing else: it proves who wrote the sentence, not
 * that the sentence is true. A description can say "only 100 XEC" while the
 * covenant asks a million — so it never sits in the price cell's typography,
 * and it says whose claim it is.
 */
export const TOKEN_DESCRIPTION_LABEL = 'From the seller';

/**
 * Describing a token. Its own record and its own transaction — one per token,
 * so a seller must know before they sign that changing three descriptions costs
 * three fees. Nothing here watches their wallet, for the same reason the
 * settings sheet does not: the live socket listens to the offer book, and a
 * description transaction does not move it.
 */
export const DESC_TITLE = 'Describe a token';
export const DESC_LEDE =
    'Your own words about one token you list. This builds a second small transaction — one for each token you describe, and one more each time you change one.';
export const DESC_TOKEN_LABEL = 'Which token';
export const DESC_TEXT_LABEL = 'What buyers should know';
export const DESC_TOO_LONG =
    'That is longer than one record holds. Shorten it until the counter is not over.';
export const DESC_REFUSED =
    'That cannot be written to a record — it holds no readable text, or contains characters that could hide part of a sentence.';
/**
 * A newline is refused by the same rule that refuses a bidi override, and for
 * the same reason — but a seller who pressed Enter has done nothing suspicious
 * and deserves to be told which key it was. The generic refusal names hiding
 * text, which reads as an accusation for a line break.
 */
export const DESC_ONE_LINE =
    'A description is one line. Remove the line break, and the rest is fine.';

export const DESC_REMOVE = 'Remove this description';
export const DESC_REMOVE_LEDE =
    'This publishes a record that erases what you wrote. It is another transaction, and the words stay in the chain’s history — removing them takes them off this page, not off the chain.';
export const DESC_NO_TOKENS = 'Nothing is listed to describe yet.';
/** Bytes, never characters: an accented character costs two or three. */
export const descBytesLeft = (used: number, max: number): string =>
    `${used} of ${max} bytes`;
