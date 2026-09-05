/** Load-bearing stall copy. Screens quote these; do not paraphrase at the call site. */

import type { RecordAge } from '../domain/age';

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
/**
 * "App", because "another wallet" alone collides head-on with
 * PUBLISH_MUST_SIGN two lines under it: there "another wallet" is the thing
 * that buys a worthless record, here it meant another *application* holding
 * the same stall wallet. One phrase carrying both meanings on one sheet is a
 * trap; the label now names the app and MUST_SIGN legitimizes it outright.
 */
export const PUBLISH_OPEN_PAY = 'Sign with another wallet app';
/**
 * Decoration, in the sheet the seller already publishes from. The copy has to
 * carry three states without four controls: a row nobody can buy yet, a row on
 * sale that this stall does not hold, and a row it does. Silence about the
 * middle one is how a seller sets a flag, sees nothing, and is told nothing.
 */
export const DECOR_LABEL = 'Decoration';
export const DECOR_LEDE =
    'Decorations are tokens. Your stall wears one when it holds the token and your settings say so — so this is two things, and both are yours.';
export const DECOR_PREVIEW_ONLY =
    'You are looking at it, not wearing it. Publishing this changes nothing until the stall holds the token.';
export const DECOR_NOT_MINTED =
    'This one is not on sale yet. You can look at it, but the record you sign here will not name it — nothing can hold it until it exists.';
export const DECOR_HELD = 'This stall holds the token, so publishing will paint it.';
export const DECOR_SHOP = 'See the decorations';
/** The footer credit: the catalogue's own billboard, in our words. */
export const wearing = (labels: readonly string[]): string =>
    `Wearing: ${labels.join(' \u00b7 ')}`;
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

/**
 * The name sheet's subtitle: the fields of the record, named before the seller
 * fills any of them. It says "one record" because that is the fee — the token
 * descriptions moved to their own sheet, and their own transactions, exactly
 * so this sentence can be true.
 */
export const PUBLISH_SUB = 'One record: name, tagline, announcement, look, decorations';

/**
 * The two folds both sheets wear. Hex is the thing a seller checks once and
 * then never wants in the way again; the QR is a road to a phone that a phone
 * does not need (it opens the wallet by link), so it is offered at desk width
 * and folded even there.
 */
export const RECORD_BYTES_FOLD = 'Record bytes';
export const SCAN_WITH_PHONE_FOLD = 'Scan with a phone wallet';


/** Paying the right address is not enough: the record counts by who signed. */
export const PUBLISH_MUST_SIGN =
    'Sign it with this stall\u2019s own wallet, whatever app holds it. A record signed by any other wallet will never be this stall\u2019s.';

export const PUBLISH_WALLET_SHOWS_HEX =
    'Your wallet will show these bytes rather than the words above. That is the same record, written the way the chain stores it.';

export const PUBLISH_NAME_TOO_LONG =
    'Names are up to 32 bytes. Accents and emoji cost more than one byte each.';

/** The P5 fields, each optional, each one tagged push in the same record. */
export const PUBLISH_TAGLINE_LABEL = 'Tagline (optional)';
export const PUBLISH_TAGLINE_INVALID =
    'A tagline is one legible line, up to 64 bytes. Accents and emoji cost more than one byte each.';
/**
 * **Not painted.** Tag `0x04` is read and unhonoured (CLAUDE §8), so the sheet
 * offers no control for it — while a record that already carries one keeps it
 * on republish. Test: `republish-carries-an-existing-fiat-hint-forward`.
 */
/**
 * The announcement (tag 0x05). A dated sentence, not a status: "back on the
 * 10th" ages in front of the reader, while an away-flag goes stale with
 * nobody able to clear it — which is why this replaced that idea for good.
 */
export const PUBLISH_ANNOUNCEMENT_LABEL = 'Announcement (optional)';
export const PUBLISH_ANNOUNCEMENT_INVALID =
    'An announcement is one legible line, up to 64 bytes. Accents and emoji cost more than one byte each.';
/*
 * `publishBudget` ("Record size: N of M bytes") retired 2026-09-04: both
 * sheets now say the same figure at the end of their "Publishes:" line
 * (`summaryLine`), and two nodes counting one record is how a meter and an
 * encoder come to disagree in front of a seller.
 */
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
/* The generic empty copy retired 2026-08-30: each look speaks its own
   sparse voice from the theme row (theme.sparse). */
/** The sparse CTA under each look's own empty shelf — the words are shared. */
export const LIST_FIRST = 'List your first item';

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
 * A node that answered, which is not a network that did not.
 *
 * `plugin-missing` is a protocol-level 404 from a chronik that replied and
 * simply does not run `agora.py`. Serving it "No index answered" described our
 * own situation as the network's — the same error the `unresolved` screen
 * carried until it earned its own sentence.
 *
 * The second half is structural rather than a report of this load: the
 * seller's records are a different index on a different walk, so a missing
 * offer plugin says nothing about them either way. What that walk actually
 * found is the Quotes side's own to say — a count on its label, or one of its
 * three sentences — and this screen must not answer for it.
 */
export const PLUGIN_MISSING_BODY =
    'This node answered, and it does not run the index that lists offers — so there are no listings to show here. The seller’s own records are read separately, on the Quotes side.';

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
/*
 * Section titles in the third person: the panel is public — anyone can open
 * the Studio tab — so "Your stall record" over a stranger's screen would be
 * the page claiming to know who is reading it. The lede two lines up already
 * says whose tools these are.
 */
/**
 * What the Activity panel is, said where a seller reads their own tools. It
 * is a feed of what this page happened to read — a ring on the page clock and
 * a capped walk on the chain's — and calling it a ledger is exactly the claim
 * neither list can back.
 */
export const STUDIO_ACTIVITY_NOTE =
    'Activity is what this page read, not a ledger — keep your own records.';
/*
 * The browser preference carries no heading — one toggle is not a section —
 * and this line says where the preference lives, in the register of the
 * comment above OPEN_BY_DEFAULT: what the control does, not what it feels
 * like.
 */
export const STUDIO_DEFAULT_HINT =
    'Kept in this browser only — it sets which stall the bare domain opens here. The shared link is unchanged.';

/**
 * The studio is three cards and a preference: Name & look (what the stall
 * record says, and one control to change it), Items & prices (the describe
 * sheet's own set — listed, described, quoted or pasted — one row each with
 * the two things a seller does to a token), and Share (the link, the code,
 * the poster and the stream overlay's recipe, folded). The browser
 * preference trails, because it is this browser's and not the stall's.
 */
export const STUDIO_CARD_NAME = 'Name & look';
export const STUDIO_CHANGE = 'Change';
export const STUDIO_LOOK_ROW = 'Look';
export const STUDIO_NO_NAME = 'No name published yet';
export const STUDIO_NO_TAGLINE = 'No tagline';
export const STUDIO_CARD_ITEMS = 'Items & prices';
export const STUDIO_DESCRIBE_ROW = 'Describe & price';
export const STUDIO_CARD_SHARE = 'Share';
/** The fold under a sheet's primary control: everything the record can also carry. */
export const SHEET_MORE = 'More';
/** The items card when the describe set is empty, and the way in for a token this stall minted but never listed. */
export const STUDIO_NO_ITEMS =
    'Nothing listed or described yet. Describe a token and paste its id to start.';
export const STUDIO_ITEMS_HINT =
    'A token you minted appears here while your wallet holds its mint baton. Any other: Describe a token, then paste its id.';

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
/**
 * A full ring has dropped its oldest rows in silence, and the lede's "what
 * this page has seen arrive" would then overclaim. One line, only when full.
 */
export const activityCapped = (kept: number): string =>
    `Only the newest ${kept} arrivals are kept — older ones have rolled off this page.`;
export const EVENT_SETTINGS = 'Stall settings published';
export const EVENT_DESCRIPTION = 'A token description published';
/**
 * A record shaped like this stall's, signed by another wallet.
 *
 * Anyone can publish an `STL1`- or `STLD`-shaped output paying this address,
 * and the readers refuse it — but a **row** is a sentence on screen, and
 * "Stall settings published" over a stranger's dust is a claim nothing
 * checked. The walk verifies the input script and says which it found.
 */
export const EVENT_SETTINGS_STRANGER = 'A settings record from another wallet';
export const EVENT_DESCRIPTION_STRANGER = 'A description record from another wallet';
export const EVENT_TOKEN_MOVE = 'A decoration token moved';
export const EVENT_OTHER = 'A transaction at this address';

/**
 * A direct payment: money that arrived carrying an `STLP` memo.
 *
 * **Paid, never bought or sold.** The chain proves satoshis reached the
 * seller's address and nothing else — no token changed hands, and whether the
 * seller delivered is off-chain. So the row names the payment, names who it
 * went to, and stops there.
 */
export const EVENT_PAYMENT = 'Payment · to the seller';
export const eventPayment = (amount: string): string =>
    `Payment · ${amount} ${XEC} · to the seller`;
/**
 * The memo, labelled as what it is. Every byte of it was written by whoever
 * paid: it is not signed by the seller, nothing cross-checks the item, and the
 * record carries no figure at all.
 */
export const EVENT_PAYMENT_CLAIM_LABEL = 'The payer’s claim';
export const paymentClaim = (item: string, quantity: string): string =>
    `${item} · ${quantity}`;
export const paymentQuantity = (count: string): string => `× ${count}`;
/**
 * Absent means one; a field that was written and could not be read means the
 * quantity is not stated. Words, never a number — a guessed one would sit
 * beside a figure somebody actually paid.
 */
export const PAYMENT_QUANTITY_UNSTATED = 'Quantity not stated';
export const EVENT_PAYMENT_NOT_PROOF =
    'Written by the payer — not a proof of what was delivered.';

/**
 * The Activity tab is public — anyone can open it — so it says so once,
 * before the rows. Nothing here is private to the seller, and a panel that
 * looked like a seller's own ledger would invite someone to treat it as one.
 */
export const ACTIVITY_PUBLIC =
    'Everything here is public chain data. Anyone opening this stall sees the same rows.';
export const ACTIVITY_HISTORY_LEDE =
    'Read from this address’s history when you ask for it, newest first, on the chain’s clock.';
/**
 * A row naming a decoration is named against what the stall wears **today**.
 * A walk cannot know what it wore a year ago, and inventing that is worse
 * than naming the comparison.
 */
export const ACTIVITY_HISTORY_DECOR_NOTE =
    'Token moves are named against the decorations this stall wears today.';
/** Nothing has been asked for yet: a walk is round trips, so it is a choice. */
export const ACTIVITY_HISTORY_READ = 'Read this address’s history';
export const ACTIVITY_HISTORY_MORE = 'Read more';
export const ACTIVITY_HISTORY_LOADING = 'Reading a page…';
export const ACTIVITY_HISTORY_END = 'That is the end of this address’s history.';
/**
 * Our own ceiling, never called an ending: `MAX_ACTIVITY_PAGES` is a bound
 * this page chose, and reporting it as the end of the history would be a
 * claim about the seller made from a guess (§5's rule, in a new place).
 */
export const activityHistoryCapped = (pages: number): string =>
    `Stopped after ${pages} pages. Older transactions are not read here.`;
export const ACTIVITY_HISTORY_FAILED =
    'That page did not answer. Nothing already read was lost.';
export const ACTIVITY_HISTORY_RETRY = 'Try that page again';

/**
 * The row detail. Short labels on purpose: they share a grid track with the
 * value beside them, and the txid takes a row of its own because 64
 * characters beside a label is the incident the probe's label rule was
 * written for.
 */
export const EVENT_TXID_LABEL = 'Transaction';
export const EVENT_TIME_PAGE_LABEL = 'Seen by this page';
export const EVENT_TIME_CHAIN_LABEL = 'Chain time';
export const EVENT_KIND_LABEL = 'What it was';
export const EVENT_AMOUNT_LABEL = 'Received here';
export const EVENT_STATUS_LABEL = 'Status';
export const EVENT_OPEN_EXPLORER = 'Open in a block explorer';
/**
 * The address a payment was spent from, offered as twenty bytes to copy and
 * nothing else.
 *
 * **A citation, not a destination.** This panel is public — the line above
 * says so — and there is no seller session anywhere in this app, so a control
 * here is a control every visitor gets. One that composed a payment to an
 * address read off the chain would pay whoever last sent this stall money;
 * this one puts it on a clipboard and stops.
 *
 * The note is the honest half: a payer spending through an exchange or any
 * other custodial wallet spends from a key they do not hold, so this is where
 * the money came from and not somewhere they asked to be paid back at. No
 * sentence here uses the word refund, because the page cannot promise one
 * would arrive.
 */
export const EVENT_PAYER_LABEL = 'Paid from';
export const EVENT_PAYER_NOTE =
    'The address this payment was sent from. Money sent through an exchange or another custodial wallet comes from a key the payer does not hold, so this is not necessarily an address they can be paid at.';
export const EVENT_COPY_TXID = 'Copy';
export const EVENT_TXID_COPIED = 'Copied';
export const EVENT_TXID_SELECT = 'Select it';
/**
 * The amount is what arrived at this address, and it is never dressed as a
 * sale: a payment proves money moved, not that anything was bought. XEC, from
 * the covenant's own unit through `formatXec` — never a fiat conversion,
 * which would put a second figure on a fact.
 */
export const eventReceived = (formattedXec: string): string => `${formattedXec} ${XEC}`;

/**
 * The three finality states, and only three. **Never "in the mempool"**: a
 * missing `isFinal` is one node's silence, and even a mempool frame is one
 * node's opinion while two nodes hold two mempools — the same reason §5
 * refuses an unfinalized, unmined record as a winner. The third line says
 * what is true, which is that this page does not know.
 */
export const EVENT_STATUS_FINALIZED_AVALANCHE = 'Finalized by avalanche';
export const EVENT_STATUS_FINALIZED = 'Finalized in a block';
export const EVENT_STATUS_IN_BLOCK = 'In a block';
export const eventStatusInBlock = (height: number): string =>
    `In block ${group(height)}`;
export const EVENT_STATUS_UNKNOWN = 'Not known to this page';

/** Thousands separators, the way `formatXec` writes them. */
function group(n: number): string {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Says what the control does, not what it feels like. "Save" would suggest the
 * stall is kept here; nothing is. What is kept is which stall this browser
 * opens when someone types the bare domain.
 */
export const OPEN_BY_DEFAULT = 'Open this stall by default';
export const OPENING_BY_DEFAULT = 'Opens by default — stop';

/**
 * Pins. Same register as the default-stall control: what the control does,
 * never "save" — nothing about the stall is kept, only its route token, and
 * the lede says whose browser holds it. The full-door line states the bound
 * and the way out, because a disabled control with no sentence reads as
 * broken, and a silent eviction would drop a pin somebody chose.
 */
export const PINNED_TITLE = 'Pinned stalls';
export const PINNED_LEDE = 'Kept in this browser only — never on the chain.';
export const PIN_TO_DOOR = 'Pin to the front door';
export const PINNED_ON_DOOR = 'Pinned to the front door — remove';
export const PIN_REMOVE = 'Unpin';
export const unpinLabel = (which: string): string => `Unpin ${which}`;
export const PIN_DOOR_FULL =
    'The front door holds 12 pinned stalls and is full. Unpin one there to pin this one.';

/**
 * The poster: the share link made printable, and PNG formats saved on this
 * device. Print stays a black-on-white page; the images take this look.
 */
export const POSTER_TITLE = 'Poster & images';
export const POSTER_LEDE =
    'A page to print, or an image to save: your name and a code that opens this shop.';
export const POSTER_OPEN = 'Poster & images';
export const POSTER_PRINT = 'Print';
export const POSTER_CLOSE = 'Close';
export const POSTER_SCAN = 'Scan to open this stall';
export const POSTER_PNG_LEDE =
    'Saved on this device, in this look — the font is what this device resolves.';
export const POSTER_SAVE = 'Save PNG';
export const POSTER_FORMAT_PRINT = 'Print';
export const POSTER_FORMAT_SQUARE = 'Square 1080×1080';
export const POSTER_FORMAT_STORY = 'Story 1080×1920';
export const POSTER_FORMAT_STREAM = 'Stream card';

/**
 * The big-shop tools. The sort options name the figure they order by — the
 * price on the card, which is this stall's cheapest asked amount for that
 * token — and never claim a market-wide anything (§10: the index silently
 * drops offers, so "lowest on Agora" is unprovable here). The empty-filter
 * line blames the filter, never the stall: an emptied shelf under a typed
 * word must not read as an empty shop.
 */
export const SHOP_FILTER_HINT = 'Find in this stall';
export const SHOP_SORT_LABEL = 'Sort';
export const SHOP_SORT_CURATED = 'By shelf';
export const SHOP_SORT_PRICE_ASC = 'Price on card — low first';
export const SHOP_SORT_PRICE_DESC = 'Price on card — high first';
export const SHOP_SORT_NAME = 'Name';
export const SHOP_FILTER_NONE =
    'Nothing listed here matches that. Clear the find box to see the whole stall.';

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

export const OPENING_SUB = 'Opening this stall';
export const OPENING_BODY = 'Reading the chain for this seller.';

/**
 * The door's three chips — the two intro paragraphs compressed to the three
 * facts a visitor actually scans for (Stall Design, direction D). The one
 * sentence kept in prose is the trust line under them.
 */
export const HOME_CHIPS = [
    'One link: /s/ + your address',
    'Prices straight from the chain',
    'No signup, no install',
] as const;
export const HOME_CHIPS_FINE = 'Stall reads the chain and holds no keys.';

/**
 * The tilted storefront preview on the wide door. Fixture words, painted
 * `aria-hidden` and inert: it illustrates the *shape* every stall opens as,
 * not a shop this origin claims exists — the caption says exactly that. The
 * address is the fixture dummy nobody holds; the prices are illustrative
 * round numbers the owner approved; the icon is a real token's (see
 * `DOOR_PREVIEW_ICON_TOKEN`), recolored per row.
 */
export const HOME_PREVIEW = {
    name: 'Riverside Goods',
    tagline: 'Fresh from the riverside — roasted and packed weekly',
    sub: '3 items for sale',
    items: [
        { name: 'Roasted Beans', qty: 'ROAS · 24 left', price: 'from 1,200' },
        { name: 'Green Tea', qty: 'GREE · 12 left', price: 'from 875' },
        { name: 'Pixel #1', qty: 'PIXE · 12 left', price: 'from 500' },
    ],
    address: 'ecash:qpjqjm0lasd3k54dmuczp20sr05tsykrlyc3j7hv09',
    caption: 'Every stall opens as a page like this.',
} as const;

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
/** The door's one line for streamers: the guide is a page of its own (§9). */
export const HOME_STREAM_LEAD = 'Streaming?';
export const HOME_STREAM_LINK = 'Put your stall on stream';
/** The door's one line for the general guide: a page of its own, like the stream guide (§9). */
export const HOME_GUIDE_LEAD = 'New here?';
export const HOME_GUIDE_LINK = 'How a stall works';
/** The studio items card and the first-stall checklist point at the guide's chapters. */
export const STUDIO_GUIDE_LINK = 'How quotes work';
export const FIRST_STALL_GUIDE_LINK = 'How a stall works';

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

/** The clickable form, for a screen where the seller has not listed yet. */
export const LIST_IN_CASHTAB_LINK = 'List a token in Cashtab';


/**
 * The first-stall screen — an address that has never spent, which for a new
 * seller is the first screen and not a rare case (§3). A three-step
 * checklist with the stuck step marked, one control for that step, a retry,
 * and one fact: the page is watching. It promises no timing — the wrong
 * wallet, a silent node or a dropped socket each break the promise a
 * "seconds" would make — and shares no link, because the link opens this
 * screen. The address stays on the sign, as on every screen.
 */
export const FIRST_STALL_HEADER = 'Your first stall';
export const FIRST_STALL_SUB = 'Nothing on the chain yet';
export const FIRST_STALL_STEPS = [
    { step: 'List a token in Cashtab', status: 'Waiting for a listing from this address' },
    { step: 'Name your stall', status: 'Opens here once the listing is read' },
    { step: 'Share your link', status: 'Appears when the stall resolves' },
] as const;
export const FIRST_STALL_WATCHING =
    'This page is watching the address. If nothing shows after a listing confirms, check the address you pasted.';
export const CHECK_AGAIN = 'Check again';
/**
 * The same never-spent address seen by someone who did not paste it — a buyer
 * who scanned a poster before the seller listed. Nothing here is theirs: no
 * checklist, no "you", no control that lists a token. A fact about the
 * seller and a retry.
 */
export const NEVER_SPENT_HEADER = 'Not open yet';
export const NEVER_SPENT_VISITOR =
    'This address has not listed anything yet. A stall opens here once its seller lists a token.';

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

/**
 * The currency the supplementary fiat figure is read in.
 *
 * **Not painted.** One currency above the table (CLAUDE §8), so no control
 * offers a choice — kept here because `FIAT_CURRENCIES` is untouched and this
 * is the label the picker wears the day it comes back. Test:
 * `the-visitor-has-no-currency-control-and-the-glance-is-usd`.
 */

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
 * The announcement's chip: the same attribution as a description, because it
 * is the same trust shape — a signature verified, words unvouched. Never a
 * status word like "away" or "open": the sentence is the seller's claim and
 * the label only says whose.
 */
export const ANNOUNCEMENT_CHIP = 'From the seller';

/**
 * Describing a token. Its own record and its own transaction — one per token,
 * so a seller must know before they sign that changing three descriptions costs
 * three fees. Nothing here watches their wallet, for the same reason the
 * settings sheet does not: the live socket listens to the offer book, and a
 * description transaction does not move it.
 */
export const DESC_TITLE = 'Describe a token';
/** The sheet's subtitle: the three fields, and that they are one record. */
export const DESC_SUB = 'Words · shelf · quote → one record';
export const DESC_LEDE =
    'Your own words about one token you list. This builds a second small transaction — one for each token you describe, and one more each time you change one.';
export const DESC_TOKEN_LABEL = 'Which token';
export const DESC_TEXT_LABEL = 'What buyers should know';
/**
 * The shelf (STLD tag 0x01): the seller's own heading over this token's
 * card. One field, one meter — the shelf and the description share one
 * record's budget, so at a full description no shelf fits, and the meter
 * below both fields is the honest place that shows it.
 */
export const DESC_SHELF_LABEL = 'Shelf (optional) — your own heading over this token';
export const DESC_SHELF_REFUSED =
    'A shelf is one short legible heading, up to 32 bytes. Accents and emoji cost more than one byte each.';
export const DESC_OVER_BUDGET =
    'The description and the shelf share one record, and together they are over its size. Shorten either until the meter is not over.';
/**
 * The same ceiling with a price in it. The maxima are stated because a meter
 * that only says "over" leaves a seller trimming a byte at a time:
 * `MAX_PRICED_DESCRIPTION_BYTES` and `MAX_PRICED_SHELVED_DESCRIPTION_BYTES`
 * are where they come from, and `tag-budget-is-enforced-across-the-record`
 * pins both to the encoder.
 */
export const DESC_OVER_BUDGET_PRICED =
    'The description, the shelf and the price share one record, and together they are over its size. With a price the words go up to 168 bytes — 134 with a full shelf as well.';
/**
 * And with a tolerance byte riding the quote as well: three bytes more, so
 * the ladder names its own pair. `MAX_TOLERANCE_DESCRIPTION_BYTES` and
 * `MAX_TOLERANCE_SHELVED_DESCRIPTION_BYTES` are where these come from.
 */
export const DESC_OVER_BUDGET_TOLERANCE =
    'The description, the shelf, the price and the tolerance share one record, and together they are over its size. With both the words go up to 165 bytes \u2014 131 with a full shelf as well.';
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
/**
 * The removal's second road wore PUBLISH_OPEN_PAY verbatim, so two identical
 * pills signed two different records a few lines apart. Every control is
 * named for what it does (§2): this one removes.
 */
export const DESC_REMOVE_PAY = 'Remove with another wallet app';
/**
 * The way into removal, and the way back out.
 *
 * Removal is a **mode of this sheet**, not a second pair of links below it:
 * the same fields, the same meter and the same two sign controls swap to the
 * removal record, so what is on screen is the record being signed. The fields
 * go disabled, because a form a seller can type into while it publishes
 * something else is a form that lies.
 */
export const DESC_REMOVE_OPEN = 'Remove the words…';
export const DESC_KEEP = 'Keep the words';
export const DESC_REMOVE_LEDE =
    'This publishes a record that erases what you wrote; the shelf and the price stay. It is another transaction, and the words stay in the chain’s history — removing them takes them off this page, not off the chain.';
/**
 * Every field empty over a record that exists is a request, not silence: the
 * bare tombstone. Said before signing, because the remove control beside it
 * keeps the shelf and the price and this one does not.
 */
export const DESC_CLEAR_ALL_LEDE =
    'Every field is empty: publishing this removes the words, the shelf and the price for this token.';
/**
 * The picker's set is what the seller has published or listed, so a stall with
 * neither has nothing to select — and the paste field below it is the way in.
 * Never an early return any more: a seller with an unlisted token they want to
 * quote met this sentence and no field at all.
 */
export const DESC_NO_TOKENS =
    'Nothing listed or described yet — paste a token id below to describe one.';
/** The way in for a token this stall neither lists nor has written about. */
export const DESC_PASTE_LABEL = 'Or paste a token id';
export const DESC_PASTE_ADD = 'Add';
export const DESC_PASTE_INVALID =
    'A token id is 64 characters of hex. Copy it from the token’s page in your wallet.';
/** The read answered nothing: no name, no kind, and nothing to select. */
export const DESC_PASTE_UNREAD =
    'That token could not be read. Check the id, or try again in a moment.';

/*
 * Whose token a quote is written on.
 *
 * A quote borrows the token's id, its picture and whatever it stands for
 * off-chain, so the editor refuses to write a **new** one on a token another
 * wallet minted, and warns — never blocks — everywhere else. Nothing on the
 * wire changed, and every quote a seller already signed still paints.
 */
export const DESC_QUOTE_NOT_YOURS =
    'This token was minted by another wallet. A quote on it would borrow its id, its picture and whatever it stands for — mint your own token for this item.';
/**
 * The field gone for a token this page withholds. The words, the shelf and
 * the removal road stay: a published record is permanent, and an editor
 * that could not reach it could not retract it either.
 */
export const DESC_QUOTE_WITHHELD =
    'This page does not carry this token, so a quote on it would never be shown here.';
export const DESC_QUOTE_UNATTRIBUTED =
    'This page could not tell which wallet minted this token.';
export const DESC_QUOTE_LISTED_TOO =
    'Buyers will see two prices for this token: the Agora row and this quote.';
export const DESC_QUOTE_NO_WORDS =
    'Buyers will see the token’s name — describe the item so they know what they pay for.';

/**
 * The price (STLD tag 0x02): what the seller asks for **one whole token**, in
 * a unit they name. Two units and no more — US dollars, or XEC, the chain's
 * own unit, which is the only figure that cannot go stale behind a printed QR.
 *
 * Nothing on this page converts it. §8 keeps the covenant's asked amount as
 * the only price on an Agora row; this is the seller's own figure, published
 * as they wrote it and read back to them the same way.
 */
export const DESC_PRICE_LABEL = 'Price for one whole token (optional)';
export const DESC_PRICE_CODE_LABEL = 'Unit';
/**
 * What a unit wears on the segment. `$` is three characters shorter than USD
 * and three currencies wide, so the button's accessible name carries the code
 * and only the glyph is painted.
 */
export const priceUnitGlyph = (code: string): string =>
    code === 'usd' ? '$' : code.toUpperCase();
export const DESC_PRICE_LEDE =
    'Your own asking figure, published as you write it. Nothing here converts it.';
export const DESC_PRICE_REFUSED =
    'A price is a figure above zero, with up to two decimal places and no separators — “12.50”, not “1,200” or “0”.';
/**
 * A price is per whole token, so a token whose kind this page has not read is
 * not one it may write a permanent record about. Affirmative, never a
 * suppression list — `isPriceable`.
 */
export const DESC_PRICE_NOT_PRICEABLE =
    'Only a fungible token takes a price here. A price is per whole token, and this row is an NFT, a decoration, or a token whose kind this page could not read.';
/** The seller's own figure, read back from the record they signed. */
export const sellerPrice = (figure: string, code: string): string =>
    `Published price: ${figure} ${code}`;
/** Bytes, never characters: an accented character costs two or three. */
export const descBytesLeft = (used: number, max: number): string =>
    `${used} of ${max} bytes`;

/**
 * One part of the "Publishes:" line — a field the record will carry, and its
 * value where the value is short enough to read back.
 */
export type SummaryPart = { label: string; value?: string };

/**
 * What this record publishes, said in words beside the bytes. Both sheets
 * wear it, and it is the only place either one states a size.
 *
 * **Composed from the parts the encoder was handed**, and never counted a
 * second time: the byte figure is the record the same call produced, and each
 * part is one field that call put in it. A summary doing its own arithmetic
 * would be a second opinion about a permanent record, and the opinion on
 * screen would be the one nobody signed.
 */
export const summaryLine = (
    parts: readonly SummaryPart[],
    used: number,
    max: number,
): string => {
    const said = parts.map((p) => (p.value === undefined ? p.label : `${p.label} ${p.value}`));
    return `Publishes: ${[...said, descBytesLeft(used, max)].join(' · ')}`;
};

/** The fields a summary can name. Lower case: they run inside a sentence. */
export const SUMMARY_NAME = 'name';
export const SUMMARY_LOOK = 'look';
export const SUMMARY_TAGLINE = 'tagline';
export const SUMMARY_ANNOUNCEMENT = 'announcement';
export const SUMMARY_DECOR = 'decor';
/**
 * Tag `0x04` has no control on the sheet (CLAUDE §8) and is still carried
 * forward on every republish, so the line names it: a summary that omitted a
 * field the record carries would under-report what is being signed.
 */
export const SUMMARY_FIAT_HINT = 'currency hint';
export const SUMMARY_WORDS = 'words';
export const SUMMARY_SHELF = 'shelf';
export const SUMMARY_QUOTE = 'quote';
export const SUMMARY_TOLERANCE = 'tolerance';
/** The two records that take something away, named as what they do. */
export const SUMMARY_REMOVAL = 'removal for';
export const SUMMARY_CLEARS = 'clears every field for';
/** Nothing has been asked of the record yet — not a refusal, not a size. */
export const SUMMARY_NOTHING = 'Nothing to publish yet.';

/*
 * The direct-payment rail: the seller's own quote, and the payment a buyer's
 * wallet signs for it.
 *
 * **Paid, never bought or sold.** No token changes hands, nothing is held in
 * escrow, and this page cannot tell whether the seller delivered — so every
 * sentence here is about money leaving a wallet and nothing else. The word
 * for the seller's on-chain figure is a **quote**; the thing it is for is an
 * **item**; the control is **Pay**.
 */
export const PAY_SEC_TITLE = 'Pay the seller directly';
/**
 * One lede on the section, and one sentence in it about where the trust sits.
 * There is no escrow and no reputation system here, so the honest thing to say
 * is the thing that is true of any seller reached through a chat window.
 */
export const PAY_SEC_LEDE =
    'Items the seller has quoted on-chain. Your wallet pays them, in the amount they wrote — you receive no token; they deliver off-chain. You are trusting the seller, as with any seller you reach through a chat.';
/*
 * The Shop panel's two rails. A segmented control, never a second tab bar and
 * never a tablist: the dock below it is the only bar that switches panels, and
 * this one only says which figures are on screen.
 */
export const SHOP_TABS_LABEL = 'Which rail of this shop to show';
export const SHOP_TAB_LISTINGS = 'Listings';
export const SHOP_TAB_QUOTES = 'Quotes';
/**
 * The count rides the label because that is the one place a reader who never
 * scrolls will meet it. **No number at all** when the side's read did not
 * finish: a zero is a fact about the seller, and that would be a fact about
 * this page.
 */
export const shopTabLabel = (side: string, count?: number): string =>
    count === undefined ? side : `${side} · ${count}`;
/**
 * Nothing quoted. A quiet sentence and never an error — the rail is the
 * seller's to opt into, and a stall that published no quote has simply not
 * chosen it. No retry: there is nothing here that failed.
 */
export const QUOTES_NONE =
    'This seller has not quoted anything to pay for directly.';
/**
 * Rows this page chose not to paint — never "could not read". The count and
 * the reason, on the rail the count is about; the tokens are not named,
 * because naming them is painting them.
 */
export const withheldListingsLine = (n: number): string =>
    `${n} ${n === 1 ? 'listing is' : 'listings are'} not shown here.`;
export const withheldQuotesLine = (n: number): string =>
    `${n} ${n === 1 ? 'quote is' : 'quotes are'} not shown here.`;
export const WITHHELD_WHY =
    'This page does not carry tokens on eCash’s impersonation blacklist, nor FIRMA, fCHF, fEUR or XECX.';
export const WITHHELD_ALL_LISTINGS = 'Everything listed here is a token this page does not carry.';
export const WITHHELD_ALL_QUOTES = 'Everything quoted here is a token this page does not carry.';
/** The shop header when a number would be a floor. */
export const ITEMS_FOR_SALE_WITHHELD = 'Items for sale';
/**
 * The records are still being read — a failure screen paints before its
 * facts land. Not `QUOTES_NONE`, which is a claim about the seller.
 */
export const QUOTES_READING = 'Still reading the seller’s records.';
/**
 * The records walk threw. **The read did not finish** — never that the records
 * came back damaged, which is a different thing (a record this page could not
 * decode) and does not stop a walk.
 */
export const QUOTES_FAILED =
    'This page did not finish reading the seller’s records, so quotes may be missing from this list.';
/** Our own page cap on the same walk. Their history is long; we stopped. */
export const QUOTES_TRUNCATED =
    'We stopped reading this seller’s history before the end, so they may have quoted more than this.';
/**
 * The item's name is the seller's own words; the token's genesis name takes
 * the small line beside it. A token name is true and is rarely the thing a
 * buyer is paying for.
 */
export const QUOTE_NO_WORDS_LINE = 'The seller wrote nothing about this item';
/**
 * A quote on a token this stall did not mint. Said under the row and in the
 * sheet, because the borrowed part is the id and the off-chain product, not
 * only the picture the row already withholds.
 */
export const QUOTE_NOT_MINTED_HERE = 'Token minted by another wallet';
/**
 * The positive half, so absence stops being ambiguous.
 *
 * With only the negative line and silence, a row that said nothing meant
 * either "attributed" or "this page could not tell" — two different facts
 * wearing one shape, which is the empty-versus-unreachable collapse on the
 * quote rail.
 *
 * **It says what the genesis points at, and never who signed it.** Three
 * sources decide `attributed`, and two of them prove no signature: an ALP
 * `authPubkey` is the minter's own unauthenticated claim, and a mint output
 * paying this stall's script is something anyone can send. Only the third —
 * the stall's key on the genesis input — proves this stall minted it, and the
 * reader cannot tell which of the three it has. So the sentence is the
 * weakest true one: the genesis names this stall. It vouches for nothing
 * else — not that the name is not somebody's brand, and no reader of a chain
 * can. A chip on the row, where the space is a name column's; the whole
 * sentence in the sheet, which a scanned link can open with no row on screen.
 */
export const QUOTE_MINTED_CHIP = 'Genesis names this stall';
export const QUOTE_MINTED_HERE =
    'This token’s genesis names this stall — as the minter’s own claim, or by paying the minted supply here. It says where the token came from, not who owns its name.';
/** The units `recordAge` counts in, as a reader says them. */
const AGE_NOUNS = {
    minute: 'minute',
    hour: 'hour',
    day: 'day',
    month: 'month',
    year: 'year',
} as const;
/**
 * When the seller **wrote** the quote, and nothing else.
 *
 * A stall that sold out and never published the removal leaves Pay lit for
 * ever, and nothing else on the row lets a buyer price that. Stock cannot be
 * the answer — the item is off-chain and only the seller knows it — so this
 * says the one thing the chain does prove: the age of the record. It must not
 * be heard as "still available", which is why it names the quote and never the
 * item, and why there is no threshold, no colour and no verdict anywhere near
 * it. A record this page cannot date prints nothing at all.
 */
export const quotedAgo = (age: RecordAge): string =>
    age.unit === 'under-a-minute'
        ? 'Quoted under a minute ago'
        : `Quoted ${age.count} ${AGE_NOUNS[age.unit]}${age.count === 1 ? '' : 's'} ago`;
/** Over the seller's whole description, inside the sheet. */
export const PAY_WORDS_LABEL = 'The seller’s words';
/** The chip that says whose figure a row carries. Never beside an Agora price. */
export const SELLER_QUOTE_CHIP = 'Seller\u2019s quote';
export const PAY_OPEN = 'Pay';
/**
 * The one line a Shop row may carry about the other rail.
 *
 * It names the other number rather than pointing vaguely at it, because a row
 * that said only "also: pay directly" would leave a buyer to assume the
 * covenant's figure and the seller's quote are the same money.
 */
export const PAY_POINTER =
    'Also: the seller\u2019s own quote for one, paid directly \u2014 not this listing';
/**
 * Our own gap, counted rather than hidden \u2014 the listings line, one surface
 * over. It covers every record that is not a row: a genesis this page never
 * read, a quote in a unit it does not paint, a token of a kind it refuses to
 * price. The unit is never named (§5), only the record counted.
 */
export const quotedUnreadable = (n: number): string =>
    `${n} quoted ${n === 1 ? 'item' : 'items'} this page could not read.`;

export const PAY_TITLE = 'Pay the seller';
/** Over the figure the wallet will be asked to sign. */
export const PAY_CAP_SIGNS = 'Your wallet signs';
/** Over the quote itself, when there is no figure to sign yet. */
export const PAY_CAP_QUOTE = 'Seller\u2019s quote';
/**
 * The quote, restated under the derived figure. Labelled as the seller's,
 * because the number above it is one this page computed and this one is not.
 */
export const payQuoteEquals = (figure: string): string =>
    `= ${figure} (seller\u2019s quote)`;
/** An XEC quote is the figure itself: no rate is involved anywhere in it. */
export const PAY_XEC_QUOTE_NOTE =
    'Seller\u2019s quote, written in XEC \u2014 no rate involved';
/** Where the converted figure came from. `\u2248`: a glance, never a second price. */
export const payRateLine = (rate: string, at: string): string =>
    `\u2248 at 1 ${XEC} = ${rate} \u00b7 CoinGecko \u00b7 ${at}`;
export const PAY_RATE_REFRESH = 'Get a fresh price';
/**
 * The rail's remaining fine print under one closed summary: memo, wallets
 * that drop it, delivery, whole units, tolerance, the quote's age and its
 * provenance when the genesis names this stall. Closed, because a buyer is
 * deciding on the figure and the two sentences that stay beside it; open
 * to anyone who wants the mechanism. Never the no-escrow sentence, the
 * final line or the borrowed-id warning, which stay where they are.
 */
export const PAY_HOW_FOLD = 'How this works';
/** Which rail a shop row is on, under its name: the covenant's book, or the seller's own quote. */
export const ROW_LABEL_AGORA = 'Agora';
export const ROW_LABEL_PAY = 'Pay the seller';
/** The face's close control: back to the rail it came from. */
/** The words alone: the back glyph is drawn beside them, never typed. */
export const ITEM_BACK_LISTINGS = 'Listings';
export const ITEM_BACK_QUOTES = 'Quotes';
/** Under the Pay control on a quote's face — the one sentence, the rest folds. */
export const QUOTE_PAID_DIRECT = 'Paid directly to the seller.';
/** The quote face's pointer to the other rail, when the token is listed too. */
export const LISTED_POINTER = 'Also listed on Agora';
/** The Pay control after the rate moved: it restates the figure it will open. */
export const payFigure = (xec: string): string => `Pay ${xec} ${XEC}`;
export const PAY_NO_RATE_WHY =
    'CoinGecko did not answer, so the wallet cannot be told how much XEC to send. There is no link and no code until a price arrives.';
/**
 * Under the dust floor the network will not relay the output at all, so
 * nothing is composed and the sheet says which way out there is.
 */
export const PAY_SUB_DUST =
    'This total is under the smallest amount the network will relay. Raise the quantity, or ask the seller.';
export const PAY_QUANTITY_LABEL = 'Quantity';
export const PAY_QUANTITY_EDIT = 'Edit';
export const payQuantityShown = (count: string): string => `\u00d7 ${count}`;
/**
 * The two hand-offs, named for what they do. **Pay, never Buy**: on this rail
 * nothing is bought \u2014 money reaches the seller and the seller delivers.
 */
export const PAY_CASHTAB = 'Pay in Cashtab';
export const PAY_OTHER_WALLET = 'Pay with another wallet app';
/**
 * The press-time valve. A rate older than `PAY_RATE_MAX_AGE_MS` is refetched
 * on the press, and the press never opens a wallet afterwards \u2014 so each of
 * these ends by asking for the press again, and the figure it refers to has
 * already been repainted above it.
 */
export const PAY_RATE_MOVED = 'Price updated \u2014 review and pay again';
export const PAY_RATE_REFRESHED = 'Rate refreshed \u2014 press Pay again';
export const PAY_RATE_UNAVAILABLE = 'No fresh price \u2014 press again';
export const PAY_QR_FOLD = 'Scan with a phone wallet';
export const PAY_QR_ALT = 'QR code of the payment';
export const PAY_QR_LEDE = 'Opens the same payment in the phone\u2019s wallet.';
/**
 * A phone can scan a code an hour after it was painted, so the code carries
 * the rate's own lifetime and is taken away rather than left to be scanned
 * for an amount nobody would recognise.
 */
export const PAY_QR_STALE = 'Get a fresh price to scan';

/**
 * The fine print. Every sentence is a limit of this rail, said before the
 * press \u2014 and this one sits **under the figure**, inside the amount card,
 * because that is where a buyer is looking when they decide.
 *
 * "No token is sent to you" in place of "no token changes hands": the second
 * is an idiom, and this sentence has to survive a reader whose first language
 * is not English.
 */
export const PAY_NOTE_DIRECT =
    'You pay the seller directly. No escrow. No token is sent to you \u2014 the seller delivers off-chain.';
export const PAY_FINE_MEMO =
    'The memo names the item and quantity \u2014 both are public parts of the transaction.';
export const PAY_FINE_SOME_WALLETS = 'Some wallets pay without the memo.';
export const PAY_FINE_DELIVERY =
    'Arrange delivery with the seller off-chain. This page cannot tell that a payment happened, and never that anything was delivered.';
/**
 * That the money cannot come back. Below the card, which keeps its one
 * sentence; no refund verb, because this page composes no refund and must
 * not read as if it could.
 */
export const PAY_NOTE_FINAL =
    'A payment is final once the network has it. This page cannot reverse one, and neither can the seller’s wallet on your behalf.';
/** Quantity is whole items: the record has no way to say half of one. */
export const PAY_FINE_WHOLE_ITEMS =
    'Whole items only \u2014 this quote is per whole token, and a fractional quantity is not supported.';
/**
 * The seller's stated margin, and the two honest ways of not stating one.
 * Never a verdict and never a check mark: this says what the seller wrote,
 * and whether a particular payment covered it is the seller's call.
 */
export const payTolerance = (pct: number): string =>
    `The seller accepts within ${pct}% of this quote.`;
export const PAY_TOLERANCE_WIDE = 'The seller accepts more than the app shows.';
export const PAY_TOLERANCE_NONE = 'The seller has not stated a tolerance.';

/**
 * A `?pay=` link that opened nothing, in two sentences that are not the same
 * claim: the first is about the stall, the second is about this page.
 */
export const PAY_HINT_UNKNOWN = 'This link named an item this stall does not quote';
export const PAY_HINT_UNREAD =
    'This link named an item, and this page could not read the seller\u2019s records';
/** The link named a record this page read and withholds by its own rule. */
export const PAY_HINT_WITHHELD =
    'This link named a token this page does not carry, so there is nothing to pay for here.';

/**
 * The seller's own tolerance control (STLD tag 0x03), on USD quotes only \u2014
 * an XEC quote involves no rate, so there is no drift for a margin to cover.
 */
export const DESC_TOLERANCE_LABEL = 'Tolerance';
/** A preset on the segment, and the same figure inside the summary line. */
export const tolerancePreset = (pct: number): string => `${pct}%`;
export const DESC_TOLERANCE_HINT =
    'A payment within this margin of your quote still counts as paid in full \u2014 rates move between glance and signature.';
export const DESC_TOLERANCE_NONE = 'No tolerance is stated on this quote yet.';
/**
 * A published value none of the presets can express. Shown, disabled, and
 * carried forward untouched: a record is permanent, and a sheet that could
 * reach a field but not restate it would erase it on the next republish.
 */
export const DESC_TOLERANCE_FIXED =
    'This quote carries a tolerance this sheet cannot change. Publishing keeps it as it is.';
/**
 * The two figures a seller now has, and the sentence that they are not one
 * thing. Nothing links them: the covenant asks what it asks, and this quote
 * is what the seller wrote.
 */
export const DESC_TWO_PRICES =
    'Buyers see your Agora price in the Shop and this quote under Pay the seller; the two are not linked.';

/** The overlay's brand line. Ours, never the seller's. */
export const BROADCAST_BRAND = 'stall.cash';
/** Under the QR. The payload is the shop. */
export const BROADCAST_CAPTION = 'Scan to open';
/** Empty shop on the overlay. Muted; not a failure. */
export const BROADCAST_EMPTY = 'nothing listed yet';
/**
 * The one line under a quote card, and every limit of that rail in it: money
 * reaches the seller, nothing is held, and no token changes hands. It is the
 * only sentence a viewer gets before they scan, so it says what the payment
 * is rather than what the shop hopes for.
 */
export const BROADCAST_QUOTE_LINE = 'Pays the seller \u00b7 no escrow';
/** The code on a quote card opens this page at that item — never a wallet. */
export const BROADCAST_QUOTE_QR_ALT = 'QR code for this item at this stall';
/** Listings beyond the shown card. `n` is listings − 1. */
export function broadcastMore(n: number): string {
    return `+${n} more`;
}
