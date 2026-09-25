/** Load-bearing stall copy. Screens quote these; do not paraphrase at the call site. */

import type { RecordAge } from '../domain/age';
import { fiatCurrency, type RateCheck } from '../domain/fiat';
import type { PayRateOutcome, PayRateWhy } from '../domain/state';

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

/**
 * The stall's own sign, when a settings record signed here was refused only
 * because it was not made from this stall's publish link and nothing else
 * won. The seller did sign something; silence would say they never did.
 */
export const SETTINGS_UNADDRESSED =
    'This stall signed a settings record that was not made from this stall\u2019s publish link, so this page does not apply it.';
export const SETTINGS_UNREADABLE =
    'This seller published stall settings that this page could not read, so it is showing the default look.';
/** The same fact over an older record that did win: the look on screen is the earlier one, not the default. */
export const SETTINGS_UNREADABLE_NEWER =
    'This seller published newer stall settings that this page could not read, so it is showing the earlier ones.';

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
 * PUBLISH_MUST_SIGN, the line directly above the controls: there "another
 * wallet" is the thing that buys a worthless record, here it meant another
 * *application* holding the same stall wallet. One phrase carrying both
 * meanings on one sheet is a trap; the label now names the app and MUST_SIGN
 * legitimizes it outright.
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
/*
 * One row of the picker says three things at once (round 12, owner's call: a
 * tick list beside the look, kept inside the sheet). Whether it is on,
 * whether this stall holds the token, and where to buy one if it does not.
 *
 * Five constants left with the shape they served — DECOR_PREVIEW_ONLY,
 * DECOR_NOT_MINTED, DECOR_HELD, DECOR_UNKNOWN_HOLDING and DECOR_SHOP. Each
 * said about ALL the chips at once what a row now says about itself, so a
 * seller read "you are looking at it, not wearing it" with no way to tell
 * which chip it was about; and the one shop link they ended with sat at the
 * foot of a closed fold. A constant nothing paints is deleted, never kept
 * (`every-copy-constant-has-a-reader`).
 *
 * `DECOR_ROW_UNKNOWN` carries round 11's hard-won third answer: absent
 * holdings mean the read did not answer, never that the stall holds nothing
 * — the same rule that keeps an empty shop and an unreachable index apart
 * (§4).
 */
export const DECOR_ROW_HELD = 'This stall holds it';
export const DECOR_ROW_NOT_HELD = 'Not held yet';
export const DECOR_ROW_UNKNOWN = 'Holding not known';
export const DECOR_ROW_UNMINTED = 'Not on sale yet';
export const DECOR_ROW_BUY = 'Buy it';
/**
 * The footer credit: the catalogue's own billboard, in our words.
 *
 * Kept as a whole sentence for anything that wants one string, and split into
 * its two pieces for the footer, which since round 12 makes each name a link
 * to the shop that sells it. One source either way, so the two can never
 * drift into two different sentences.
 */
export const WEARING_LEAD = 'Wearing:';
export const WEARING_SEP = ' \u00b7 ';
export const wearing = (labels: readonly string[]): string =>
    `${WEARING_LEAD} ${labels.join(WEARING_SEP)}`;
/**
 * Where that link goes. It was **undefined until the shop existed**: a control
 * that cannot be aimed is not painted, for the same reason the buy link is
 * never `action=BUY` — a button that does not do what it says is worse than
 * no button.
 *
 * The shop exists since 2026-09-17. Every one of the eleven shipped rows is
 * minted, and this address is the stall that sells them: verified against
 * chronik that day (`scripts/verify-decor-tokens.mjs`) — the `authPubkey` on
 * all eleven genesis records hashes to exactly this address, and the address
 * held all eleven tokens at the time of writing. It is left as the seller's
 * own string with its prefix; `stallPath` drops the prefix for the link and
 * the route puts it back.
 */
export const FITTINGS_STALL: string | undefined =
    'ecash:qpngxvfhtjuvehjm7la7m6xlwrw7230tzsl4d3vj8r';

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
    'This page cannot see your wallet. After you sign, the network has to agree the record exists — and while this page still has a connection, it re-reads on its own once that happens.';

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

/** The same fact when the token's decimals never arrived, so no count can be printed truthfully. */
export const UNBUYABLE_LINE_UNCOUNTED =
    'The contract’s smallest take is more than is left. No amount can be bought; only the seller can cancel it.';

/**
 * A rate this page cannot compute (the genesis decimals never arrived): the
 * face's rate line. Never an unbuyable offer's figure — that cell carries
 * `UNBUYABLE_BADGE` alone (2026-09-24).
 */
export const DASHED_PRICE = '—';
export const XEC = 'XEC';
export const TRIED = 'tried';
/**
 * What the hosts box says when it cannot attribute the failure to a host.
 *
 * The box listed all three nodes with one error's verdict copied onto each,
 * so a `plugin-missing` read — which stops at the first node that answers,
 * because a chronik proto error carries no retryable code — reported three
 * nodes without the plugin when only one had been asked, and not even
 * necessarily the first in the list. An owner reading it concluded the
 * plugin was gone network-wide (2026-09-20). Two invented rows are worth
 * less than one sentence that is true.
 *
 * **It says nothing about what answered**, which took two goes. The first
 * wording claimed one of them had; the second explained the mechanism —
 * "a read stops at the first node that answers, so…" — whose own premise
 * is still that one answered, on a screen headlined "No index answered"
 * and on paths where nothing did (a critic, the same day, on the second
 * try). What is left is the only thing true on every path: this page
 * cannot name them.
 * `hostsBox` paints on the `unreachable` screen as well as the
 * plugin-missing one, and `UNREACHABLE_BODY` directly above it reads "No
 * index answered" — so "one of the nodes answered with this" put two
 * paragraphs that contradict each other on the screen whose whole job is
 * keeping those two failures apart (critic + QA, same day). The paths that
 * reach it with nothing having answered are real: a chronik 4xx or 5xx, a
 * decode failure, anything `resolveSeller` throws. So this states the
 * MECHANISM — a read stops at the first answer — and draws no conclusion
 * about whether one happened.
 */
export const HOSTS_NOT_ATTRIBUTED =
    'This page cannot say which of the nodes were asked for this read.';

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
    'Public chain data this page read — not a ledger, and the same rows for every visitor.';
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
/**
 * The third card is every way this stall is put somewhere else (round 16,
 * 2026-09-20): the link first, then four doors in one dress — poster, shop
 * window, stream overlay, embed. Each door opens its own sheet; nothing on
 * the card composes anything.
 */
export const STUDIO_CARD_SHARE = 'Put it somewhere';
/** The four doors' names and one-line ledes; the poster's and the window's ledes are theirs. */
export const STUDIO_TOOL_STREAM_LEDE =
    'A card with one item and a QR on your live video, as an OBS Browser Source.';
export const STUDIO_TOOL_EMBED = 'Embed on your site';
export const STUDIO_TOOL_EMBED_LEDE =
    'One line of HTML: a picture of this look’s card that opens the stall.';
/**
 * The name card reads the whole record back (round 16): the announcement
 * under its chip, the look, and the decorations worn — the same set the
 * footer credit prints. "Wearing" is said only once the holdings read has
 * answered; before that `DECOR_ROW_UNKNOWN` (the §4 rule: an empty answer
 * and no answer are two things).
 */
export const STUDIO_ANNOUNCEMENT_ROW = 'Announcement';
export const STUDIO_WEARING_ROW = 'Wearing';
export const STUDIO_WEARING_NONE = 'Nothing worn';
/**
 * A row's state, derived from what this load read and nothing else: listed
 * on Agora (from the book, said only when the book answered — an unread
 * book says nothing, never "not listed"), the quote as `quoteFigure` prints
 * it, words, shelf. A quote this page cannot paint (a unit it does not
 * write, a genesis it could not read) is said as that, never dropped.
 */
export const STUDIO_STATE_LISTED = 'Listed on Agora';
export const STUDIO_STATE_QUOTE = 'Quote';
export const STUDIO_STATE_QUOTE_UNSHOWN = 'Quote this page cannot show';
export const STUDIO_STATE_WORDS = 'Words';
export const STUDIO_STATE_SHELF = 'Shelf';
export const STUDIO_STATE_NO_WORDS = 'No words yet';
/** The fold under a sheet's primary control: everything the record can also carry. */
export const SHEET_MORE = 'More';
/** The items card when the describe set is empty, and the way in for a token this stall minted but never listed. */
export const STUDIO_NO_ITEMS =
    'Nothing listed or described yet. Describe a token and paste its id to start.';
export const STUDIO_ITEMS_HINT =
    'A token you minted appears here while your wallet holds its mint baton. Any other: Describe a token, then paste its id.';

/** The activity panel: what this page watched arrive, said honestly. */
export const ACTIVITY_SUB = 'Live activity';
/**
 * The one press that opens the panel's four notes (owner, 2026-09-08): the
 * not-a-ledger line, the gap warning, the empty line and the walk's lede
 * fold under it, closed, so the rows lead. The "watching since" line is gone
 * — each row's fold names its own clock.
 */
export const ACTIVITY_ABOUT_FOLD = 'About this list';
export const ACTIVITY_GAPS =
    'Some rows may be missing: a dropped connection, or a transaction this page could not read.';
export const ACTIVITY_NOT_WATCHING =
    'Not watching. This screen has no live connection — activity starts once the stall’s offers can be read.';
export const ACTIVITY_QUIET = 'Nothing yet — new activity appears here on its own.';
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
/**
 * The third state (since 2026-09-07): this stall's key signed it, but it does
 * not pay the stall back the publish dust, so it was not made from this
 * stall's own publish link and no reader applies it. Not "from another
 * wallet" — that would be false — and no instruction, because Activity is
 * public and the one place this state has appeared so far was a copycat's
 * own stall; the seller who needs the road has the Studio one press away.
 */
export const EVENT_SETTINGS_UNADDRESSED =
    'A settings record this stall signed, not made from this stall\u2019s publish link';
export const EVENT_DESCRIPTION_UNADDRESSED =
    'A description record this stall signed, not made from this stall\u2019s publish link';
/**
 * Under a stranger's record row. Twice on one evening the "stranger" was
 * the seller: a second Cashtab wallet signing the stall's own publish link
 * (2026-09-07). The row says whose it is not; this says what that means and
 * what to do, because the failure is otherwise silent — the record simply
 * never lands.
 */
export const EVENT_STRANGER_HINT =
    'Signed by a wallet that is not this stall’s, so it changes nothing here. If that was you, open the stall’s own wallet in Cashtab and sign again from there.';
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
 * One line of a memo that names several items (`STLP`'s second shape). The
 * payer wrote four bytes of a token id, so both halves are printed: the
 * eight hex they signed, and — when exactly one quote on this stall starts
 * with them and its genesis name was read — the name this page made of it.
 * Never the name alone: the label above says the payer wrote the line, and a
 * republish can change what those bytes resolve to under the same row.
 */
export const paymentClaimPart = (prefix: string, quantity: string): string =>
    `${prefix} · ${quantity}`;
export const paymentClaimNamedPart = (
    item: string,
    prefix: string,
    quantity: string,
): string => `${item} · ${prefix} · ${quantity}`;
/**
 * Absent means one; a field that was written and could not be read means the
 * quantity is not stated. Words, never a number — a guessed one would sit
 * beside a figure somebody actually paid.
 */
export const PAYMENT_QUANTITY_UNSTATED = 'Quantity not stated';
export const EVENT_PAYMENT_NOT_PROOF =
    'Written by the payer — not a proof of what was delivered.';

/**
 * The walk's own lede: the one sentence between the two lists, because the
 * clock changing is the one thing worth a line. The head above it is one
 * line since 2026-09-08 (owner: six blocks of copy stood above the first
 * row on a phone) — public data, not a ledger, the same rows for everyone,
 * said once in `STUDIO_ACTIVITY_NOTE`; a panel that looked like a seller's
 * own ledger would invite someone to treat it as one.
 */
export const ACTIVITY_HISTORY_LEDE =
    'Older rows come from this address’s history when you ask, newest first, on the chain’s clock.';
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
/** The address box's accessible name: it is one control, and the control is the copy (round 9). */
export const addrCopyLabel = (address: string): string => `Copy the stall's address, ${address}`;
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
/**
 * The name beside a pin is a snapshot: the door fetches nothing, so it is
 * the name the stall had when it was pinned, kept in this browser with the
 * route token (§2's one exception for a chain-derived string, owner
 * 2026-09-20). The lede says so, because a renamed stall keeps its old name
 * here until it is pinned again.
 */
export const PINNED_LEDE =
    'Kept in this browser only — never on the chain. The name is the one the stall had when you pinned it.';
export const PINNED_NO_NAME = 'No name published';
/**
 * The empty pinned card teaches the gesture (owner, 2026-09-20): a card
 * that vanished when nothing was pinned said nothing about how to fill it.
 */
export const PINNED_EMPTY =
    'Nothing pinned yet. On any stall, press the pin at the corner of its sign and it lands here.';
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
    'A page to print, or an image to save: your name and a code that opens this shop — or a tag for one quoted item.';
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
 * The item tag: one quoted item on paper or as a PNG, with a code that opens
 * this stall at that item. The code is a link and never a payment URI (§3), so
 * the caption says the scan opens, as every other code's caption does; what
 * paying does is `BROADCAST_QUOTE_LINE` beneath it. `TAG_SNAPSHOT` is the one
 * sentence paper needs and no screen does: the figure on it is the record as
 * it stood when printed, and the page is where the current one is — said
 * about the paper, never as a promise about this page, which may itself be
 * reading a walk that failed.
 */
export const POSTER_FORMAT_TAG = 'Item tag';
/** The poster sheet's groups (round 16): a strip of formats, then the page and its one control. */
export const POSTER_GROUP_FORMAT = 'Format';
export const POSTER_FORMAT_WHY =
    'Print gives you an A4 page from this browser. The three image formats are saved on this device, in this look. An item tag needs a quoted item and carries no amount.';
export const POSTER_GROUP_PAGE = 'This page';
export const POSTER_PAGE_WHY =
    'Black-on-white code with its quiet zone, your name, your tagline, the whole link. What you see here is what the printer gets.';
export const POSTER_PRINT_TIP =
    'Turn on “background graphics” in the print dialog if the code comes out without its box.';
export const POSTER_ITEM_LABEL = 'Which item';
export const TAG_SCAN = 'Scan to open this item';
export const TAG_SNAPSHOT = 'This paper is a snapshot — scan for the quote as it stands.';
/**
 * On the describe sheet, over a published quote the form restates verbatim:
 * the road to that item's tag. Only then — the poster replaces the sheet, so
 * the link is offered only when nothing typed would be lost.
 */
export const DESC_TAG_OPEN = 'Make a tag for this item';
export const TAG_LEDE =
    'A tag for one quoted item: the token, your words, your figure and a code that opens this stall at that item. The code carries no amount — the page converts a USD quote when someone scans it, and your own reconciliation still needs a rate, so quote in XEC for a tag. Paper cannot prove who printed it; the page a scan opens shows the stall’s own address.';

/**
 * The big-shop tools. The sort options name the figure they order by — the
 * price on the card, which is this stall's cheapest asked amount for that
 * token — and never claim a market-wide anything (§10: the index silently
 * drops offers, so "lowest on Agora" is unprovable here). The empty-filter
 * line blames the filter, never the stall: an emptied shelf under a typed
 * word must not read as an empty shop.
 *
 * **Every option is a phrase that names an ordering**, because the control
 * wears no visible label: `SHOP_SORT_LABEL` is the select's accessible name
 * (the find box's own pattern — it has no visible label either), and what a
 * sighted reader sees is whichever option is chosen. "Name" alone read as a
 * noun in that position, so it is "By name" beside "By shelf".
 *
 * **And they are short because the strip is one row at 390px** (2026-09-22):
 * the two fields and the label line stood 123px tall above the first card on
 * a phone, and "Price on card — low first" is what forced the wrap — measured
 * in each look's own face at 16px, the widest option was 172–250px against a
 * 354–366px strip. It is a copy change and nothing rests on the old wording:
 * "on card" said which figure on a row a phrase beside a covenant's asked
 * amount meant, and this rail paints no other figure.
 */
/**
 * The find box's two strings. The placeholder is one word because that is
 * what the field holds at its narrowest: on Neo's mono at 390px the field is
 * 159px once the strip is one row, and the lens takes 24 of the 139 left, so
 * "Find in this stall" (193px) and "Find an item" (116px against 115px of
 * room) were each cut mid-phrase there — measured 2026-09-22. The lens beside
 * it says what kind of field it is. The accessible name says the whole
 * sentence and **opens with the placeholder's own word**, so a reader who
 * sees only the short one and a reader who hears only the long one name the
 * same control (WCAG 2.5.3).
 */
export const SHOP_FILTER_HINT = 'Find';
export const SHOP_FILTER_LABEL = 'Find an item in this stall';
export const SHOP_SORT_LABEL = 'Sort';
export const SHOP_SORT_CURATED = 'By shelf';
export const SHOP_SORT_PRICE_ASC = 'Low price first';
export const SHOP_SORT_PRICE_DESC = 'High price first';
export const SHOP_SORT_NAME = 'By name';
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
/** One line over the display: what the page is, before what it does. */
export const HOME_KICKER = 'A shop window for one eCash seller';
/**
 * The door's sentence covers both rails (owner, 2026-09-20; PLAN § Decided):
 * listings from Agora and the seller's own quotes, on the address that is the
 * shop. "Your wallet signs. Stall shows." is the whole trust model.
 */
export const HOME_LEDE =
    'Listings from Agora and prices you set yourself, on a link that is your own address. Your wallet signs. Stall shows.';

export const OPENING_SUB = 'Opening this stall';
export const OPENING_BODY = 'Reading the chain for this seller.';

/**
 * The facts under the counter, not styled as controls (round 8, item 6,
 * owner 2026-09-15; test `the-doors-facts-are-not-styled-as-controls`).
 * There were three; "One link" and "Prices straight from the chain" moved
 * into the tiles (`HOME_TILES`), where each has room to be explained. The
 * second said "No signup, no install" until 2026-09-07 — true of a reader,
 * false of a seller and a buyer; it says what is true of all three.
 */
export const HOME_CHIPS = [
    'Stall reads the chain and holds no keys',
    'No account here \u2014 your wallet signs',
] as const;

/**
 * The deck beside the counter: three real looks over one fixture. Fixture
 * words, painted `aria-hidden` and inert — it illustrates the *shape* every
 * stall opens as, not a shop this origin claims exists. The address is the
 * fixture dummy nobody holds; the prices are illustrative round numbers the
 * owner approved; the icon is a real token's (`DOOR_PREVIEW_ICON_TOKEN`).
 */
export const HOME_PREVIEW = {
    name: 'Riverside Goods',
    tagline: 'Fresh from the riverside — roasted and packed weekly',
    sub: '3 items for sale',
    items: [
        { name: 'Roasted Beans', price: '1,200' },
        { name: 'Green Tea', price: '875' },
        { name: 'Pixel #1', price: '500' },
    ],
    address: 'ecash:qpjqjm0lasd3k54dmuczp20sr05tsykrlyc3j7hv09',
} as const;
/** Under the deck, before `DECOR_LEDE` verbatim and the workshop line. */
export const HOME_DECK_CAP =
    'Three looks and a rack of decorations, chosen in the Studio and signed in your wallet.';
/**
 * The workshop is named on the door before it exists (owner, 2026-09-20:
 * "cứ nhắc để có người biết là chức năng đó sẽ có"). Named as next, never
 * dated: a date is the away-mode mistake, a promise nobody clears.
 */
export const HOME_WORKSHOP = 'Workshop';
export const HOME_WORKSHOP_TAG = 'next';
export const HOME_WORKSHOP_NEXT = 'The workshop, where other makers sell theirs, is next.';

/** The site bar: the two guides, each a page of its own (§9). */
export const HOME_NAV_LABEL = 'Guides';
export const HOME_NAV_STREAM = 'On stream';
export const HOME_STREAM_LINK = 'Put your stall on stream';
export const HOME_GUIDE_LINK = 'How a stall works';
/** The studio items card and the first-stall checklist point at the guide's chapters. */
export const STUDIO_GUIDE_LINK = 'How quotes work';
export const FIRST_STALL_GUIDE_LINK = 'How a stall works';

/**
 * Four tiles for what a stall does, each a door into the manual. The order
 * is the product's: listings lead (PLAN § Decided), the seller's own quotes
 * beside them, then the two ways a stall leaves the browser. "Cashtab" in a
 * body is painted as a link (`linkCashtab`).
 */
export const HOME_DOES = 'What a stall does';
export const HOME_TILES = [
    {
        title: 'Listings',
        body: 'Your Agora offers under one link. Buying happens in Cashtab, from any wallet that speaks Agora.',
        link: 'How listings work',
        href: '/guide#listings',
    },
    {
        title: 'Quotes',
        body: 'Name a price for what you deliver yourself. A buyer’s wallet pays your address directly — no escrow.',
        link: 'How quotes work',
        href: '/guide#quotes',
    },
    {
        title: 'On stream, in the shop',
        body: 'One item and a QR on your live video, or on a screen in your shop that nobody has to touch.',
        link: HOME_STREAM_LINK,
        href: '/stream',
    },
    {
        title: 'Poster & tags',
        body: 'A poster for the street, a tag for one item. Every code opens this page — never a wallet.',
        link: 'Share & print',
        href: '/guide#share',
    },
] as const;

export const HOME_PASTE_LABEL = 'Open a stall';
export const HOME_PASTE_HINT =
    'Paste the seller’s eCash address, or their compressed public key.';
export const HOME_PASTE_SUBMIT = 'Open stall';
export const HOME_PASTE_INVALID =
    'That is not an eCash address or a compressed public key.';
/**
 * What the paste box rests on, and the examples it types first
 * (`doorTyping.ts`). Each example is the p2pkh address of a dummy key —
 * `02` followed by one byte repeated (bb, cd, 7e) — so it is a real-looking,
 * decodable address that nobody holds; the first is the fixture payer of
 * `layout/fixtures.ts`. Never a real seller's (AGENTS §8).
 */
export const HOME_PASTE_PLACEHOLDER = 'your eCash address here';
export const HOME_PASTE_SAMPLES = [
    'ecash:qr9w00zzq6s88t3e97h3ktsuj32y3m87t5wzyf3kzq',
    'ecash:qrtkzrddx0yu8jskvg4jnn24amhgw9tww5l76ax9uw',
    'ecash:qrz9lrwa3rszvf466mqe07ywxv8dmws8vu3sjv0h93',
] as const;
export const HOME_SELLER =
    'If this is your stall: list your token in Cashtab, then paste your own eCash address here — the one Cashtab shows on its Receive screen. Your shop opens at a link that is yours to share.';
/**
 * The first-stall card on the door: the checklist's three step names
 * (`FIRST_STALL_STEPS`), with the paste step marked as where a new seller
 * is. Its status is the door's own — the checklist's says "opens here",
 * which is true on the checklist and not on the door.
 */
export const HOME_FIRST_TITLE = 'Your first stall';
export const HOME_FIRST_PASTE = 'Paste your address above; the Studio opens once the listing is read';

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
/**
 * The real stall's name and look, as the owner published them — a snapshot
 * like a pin's name (§2), because the door fetches nothing and cannot read
 * the record. The owner's own stall; when its record changes, this changes
 * by hand. `0x02` is Neo city.
 */
export const DEMO_STALL_NAME = 'STALL FITTINGS';
export const DEMO_STALL_THEME = 0x02;

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
    // Names the place, never an arrival. A resolved stall mounts no share
    // control of its own — `stallFooter` withholds it wherever there is a
    // Studio — so "appears when the stall resolves" promised a control that
    // never appears, on the one screen a new seller reads as instructions.
    { step: 'Share your link', status: 'In Studio → Share, once the stall resolves' },
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

/**
 * The embed box on the Share card: the cheapest widget, a picture that opens
 * the stall, for a seller with a site of their own. It says what the picture
 * is and is not — the look's card, unchanging — so nobody reads a still as a
 * live shop (owner, 2026-09-07; PLAN § Open, the widget).
 */
export const SHARE_EMBED_LEDE =
    'To put this stall on a site of your own, paste this where the site takes HTML. The picture is this look\u2019s card and does not change; the link is what opens the stall.';
export const COPY_EMBED = 'Copy the code';
/** The embed sheet (round 16): the picture a visitor sees, then the code. */
export const EMBED_PICTURE = 'What your visitors see';
export const EMBED_PICTURE_NOTE =
    'A still picture that opens your stall when pressed. It is not a live shop — it never shows an item or a price.';
export const EMBED_CODE = 'The code';
export const EMBED_FINE = 'One line of HTML, nothing else: no script, no frame, nothing that runs on your site.';
export const EMBED_COPIED = 'Code copied';
export const COPY_EMBED_FALLBACK = 'Select and copy this code.';
/** The picture's alt text: the stall's name when it has one. */
export const embedAlt = (name: string | undefined): string =>
    name === undefined || name === '' ? 'A stall on stall.cash' : `${name} on Stall`;
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
/**
 * And with a surcharge byte on the quote: three bytes more again. The four
 * maxima are the encoder's (`MAX_SURCHARGE_*_DESCRIPTION_BYTES` and the
 * priced pair less three), pinned by the test that reads this sentence.
 */
export const DESC_OVER_BUDGET_SURCHARGE =
    'The description, the shelf, the price and the surcharge share one record, and together they are over its size. With a price and a surcharge the words go up to 165 bytes \u2014 131 with a full shelf as well; with a tolerance too, 162 and 128.';
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

export const DESC_REMOVE = 'Remove this item';
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
export const DESC_REMOVE_OPEN = 'Remove this item…';
export const DESC_KEEP = 'Keep this item';
/**
 * The removal is the whole item since 2026-09-07 — words, shelf and price in
 * one record, the bare tombstone. It was the words alone, restating the
 * shelf and the price, and a seller who pressed it to take an item off the
 * rail saw the price stand and read the removal as doing nothing. Words
 * alone still come off through the field: empty them over a priced record
 * and the quote stays (`no-words-priced-is-a-tombstone-with-a-tag`).
 */
export const DESC_REMOVE_LEDE =
    'This publishes a record that takes this item off the stall: the words, the shelf and the price go. It is another transaction, and the record stays in the chain’s history — removing it takes it off this page, not off the chain.';
/**
 * Every field empty over a record that exists is a request, not silence: the
 * bare tombstone — the same record the remove control signs, reached by
 * clearing the fields by hand.
 */
/**
 * The road off the Quotes rail that nobody found: an emptied price field
 * over a published quote publishes the words without a figure, and the
 * summary simply stops naming a price. Said in place, so a seller who wants
 * the quote gone knows this is the way, and one who emptied it by accident
 * knows what they are about to sign (owner, 2026-09-07).
 */
export const DESC_PRICE_CLEARED =
    'Price left empty: publishing takes this quote off the Quotes rail. The words and the shelf stay.';
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
/**
 * A unit as the picker lists it: the code, then the currency's own name where
 * the shipped table has one. The code leads because the code is what goes
 * into the record, and a name alone would leave a seller guessing which three
 * letters they are signing.
 */
export const priceUnitLabel = (code: string): string => {
    const named = fiatCurrency(code)?.name;
    return named === undefined ? code.toUpperCase() : `${code.toUpperCase()} — ${named}`;
};
export const DESC_PRICE_LEDE =
    'Your own asking figure, published as you write it. Nothing here converts it.';
export const DESC_PRICE_REFUSED =
    'A price is a figure above zero with up to two decimal places — “12.50” or “12,50” — never a thousands separator (“1,200”) and never “0”.';
/**
 * The same refusal for a unit whose sub-unit is not in daily use. The figure
 * is whole there, and a seller typing a fraction is told so rather than
 * having it rounded into a permanent record.
 */
export const DESC_PRICE_REFUSED_WHOLE =
    'A price is a whole figure above zero \u2014 \u201c1250\u201d \u2014 never a thousands separator (\u201c1,200\u201d) and never \u201c0\u201d.';
export const priceRefusedFor = (exponent: number): string =>
    exponent === 0 ? DESC_PRICE_REFUSED_WHOLE : DESC_PRICE_REFUSED;
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
export const SUMMARY_SURCHARGE = 'surcharge';
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
    'Items the seller has quoted on-chain. Your wallet pays them in XEC for the figure they quoted — you receive no token; delivery is the seller’s, off-chain. You are trusting the seller, as with any seller you reach through a chat.';
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
    'This page does not carry a token Cashtab’s blacklist names, one whose name or ticker Cashtab refuses to mint, nor FIRMA, fCHF, fEUR or XECX.';
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
 * weakest true one: the token names this stall. It vouches for nothing
 * else — not that the name is not somebody's brand, and no reader of a chain
 * can. A chip on the row, where the space is a name column's; the whole
 * sentence in the sheet, which a scanned link can open with no row on screen.
 *
 * Plain words since 2026-09-07 ("Genesis" was jargon a buyer cannot parse),
 * same strength. "Token issued to this stall" was proposed and refused: a
 * `signed` genesis can send its whole supply elsewhere, and a `claimed` one
 * names an authority, not a recipient — "issued to" is a stronger claim than
 * two of the three sources can carry.
 */
export const QUOTE_MINTED_CHIP = 'Token names this stall';
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
/**
 * The quote as written, when a surcharge line follows it: the "=" moves to
 * the surcharge line, because the figure above is the quote PLUS the
 * seller's percent and an equals sign here would be false (critic,
 * 2026-09-21).
 */
export const payQuoteAsWritten = (figure: string): string =>
    `${figure} (seller\u2019s quote)`;
/**
 * The surcharge, said as the seller's record and never ruled: what the
 * quote becomes with it, in the unit they wrote. The satoshis above are
 * composed from the same percent (`satsWithSurcharge`).
 */
export const paySurchargeLine = (pct: number, figure: string): string =>
    `+ ${pct}% surcharge, the seller\u2019s record = ${figure}`;
/**
 * Beside a quote on every surface that prints one — the row, the face, the
 * tag, the stream card, the window card — so a figure printed next to a code
 * is never silently short of what the code's page composes.
 */
export const quoteSurchargeLine = (pct: number): string =>
    `+${pct}% surcharge \u00b7 the seller\u2019s record`;
/**
 * The stream card's form: the plate is 216px wide and the long line wrapped
 * to three at Neo's mono, which grew the tallest card past the OBS sticker
 * every streamer has typed by hand (`OBS_STICKER_HEIGHT`, the probe's
 * `the-sticker-height-fits-the-tallest-card`, 2026-09-21). One line; the
 * chip directly above it already says whose figure this is.
 */
export const streamSurchargeLine = (pct: number): string => `+${pct}% surcharge`;
/**
 * How the two seller numbers compose, said once where both are on the sheet
 * — as this page's own reading, never as the record's rule: the wire says
 * nothing about which figure the margin is measured against.
 */
export const PAY_FINE_SURCHARGE_TOLERANCE =
    'This page measures that margin against the figure it composes, surcharge included.';
/** An XEC quote is the figure itself: no rate is involved anywhere in it. */
export const PAY_XEC_QUOTE_NOTE =
    'Seller\u2019s quote, written in XEC \u2014 no rate involved';
/**
 * The two feeds by name. The first prices the figure; the second, when
 * `SECOND_FEED` is on, is asked beside it and can only speak about it
 * (`judgeRates`). The rate line names the feeds that were consulted, so
 * "one feed" and "two feeds agreed" are both visible on the node that
 * already carries the rate — no new line on the amount card, and no
 * silence to interpret. With the check paused (2026-09-23) `check` is
 * always `'none'`, so the line names CoinGecko alone.
 *
 * **CoinGecko is named beside every CoinGecko figure, on that figure's own
 * line, and never on a line of its own** (owner, 2026-09-23: the name, or
 * "Powered by" it, and no line pushed down for it). Text only — no link,
 * no logo. The rate lines already carry it; the listing face's fiat glance
 * carries `FIAT_SOURCE` in a sibling span on the same line.
 */
export const RATE_SOURCE_PRIMARY = 'CoinGecko';
export const RATE_SOURCE_CHECK = 'CoinPaprika';
/**
 * The fiat glance's source, beside the figure and never inside its node —
 * `[data-role="fiat"]` holds the converted figure and nothing else. The
 * leading space and the dot are this span's own, so the two read as one
 * line: "$0.04 · CoinGecko".
 */
export const FIAT_SOURCE = ` \u00b7 ${RATE_SOURCE_PRIMARY}`;
/**
 * `both` is false when the figure's own rate came from the first feed alone
 * — a quote written in a unit the second feed does not answer for. The two
 * feeds were still consulted and still judged each other, in USD, and a
 * disagreement between them still reaches the valve; what this line names is
 * where THIS FIGURE came from, and naming a feed that never priced it would
 * be the louder, weaker claim.
 */
export const rateSources = (check: RateCheck | undefined, both = true): string =>
    both && (check === 'agree' || check === 'disagree')
        ? `${RATE_SOURCE_PRIMARY} \u00b7 ${RATE_SOURCE_CHECK}`
        : RATE_SOURCE_PRIMARY;
/**
 * Where the converted figure came from. `\u2248`: a glance, never a second
 * price. `sources` is required: a CoinGecko figure names CoinGecko on its
 * own line, so no caller may paint the rate without saying whose it is.
 */
export const payRateLine = (rate: string, at: string, sources: string): string =>
    `\u2248 at 1 ${XEC} = ${rate} \u00b7 ${sources} \u00b7 ${at}`;
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
/*
 * The picture, at the size the page can actually show it (owner, 2026-09-18).
 * "See" and not "zoom": what opens is the token's own artwork at the largest
 * size this origin fetches — 256px, which is the biggest the icon Worker
 * routes — so promising a magnification it cannot deliver would be a claim
 * about somebody else's file. The label names the thing, not the gesture.
 */
export const ITEM_ICON_OPEN = 'See the picture';
export const ITEM_ICON_CLOSE = 'Close';

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
 * The other fact. CoinGecko answered, and the answer is outside the window
 * this page will compose a payment from (`isPlausibleRate`: a unit-error
 * fence two orders of magnitude outside anything XEC has traded at, never a
 * market opinion). Its own sentence, because a refused answer painted as a
 * feed that did not answer is the empty-versus-unreachable collapse on the
 * money path.
 */
/**
 * While the feeds are being asked. Its own sentence, because "asking" and
 * "did not answer" printed as one sentence is the empty-versus-unreachable
 * collapse on the money path — a buyer read a failure that had not happened
 * and could close the sheet on it.
 */
export const PAY_RATE_ASKING =
    'Asking the price feeds for a rate\u2026 The link and the code appear when one arrives.';
export const PAY_RATE_IMPLAUSIBLE_WHY =
    'CoinGecko answered with a rate far outside anything XEC has traded at, so this page will not turn it into an amount. There is no link and no code until a plausible price arrives.';
/**
 * Under the dust floor the network will not relay the output at all, so
 * nothing is composed and the sheet says which way out there is.
 */
export const PAY_SUB_DUST =
    'This total is under the smallest amount the network will relay. Raise the quantity, or ask the seller.';
export const PAY_QUANTITY_LABEL = 'Quantity';
export const PAY_QUANTITY_EDIT = 'Edit';
/** A count the field could not read; the count that stood before it still stands. */
export const PAY_QUANTITY_REFUSED =
    'A quantity is a whole number \u2014 \u201c3\u201d, never \u201c1,000\u201d or \u201c1.5\u201d. The count above stands.';
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
/** The press-time refetch answered, and the answer was refused — not the same fact as no answer. */
export const PAY_RATE_IMPLAUSIBLE = 'No usable price \u2014 press again';
/**
 * The press found the seller's record moved since the sheet was painted (a
 * new figure, unit, tolerance or surcharge), so it sent nothing and the
 * sheet was painted again from the record as it stands (the critic's final
 * merge, item 11). The valve's shape: the figure above is already the new
 * one, and the control restates it.
 */
export const PAY_QUOTE_CHANGED = 'The seller changed this quote \u2014 review and pay again';
/** The same, on "Pay several": one or more chosen items' records moved. */
export const PAY_QUOTES_CHANGED = 'The seller changed a quote here \u2014 review and pay again';
/**
 * The press found the item's record gone — taken off, or moved to a unit
 * this page does not paint — so there is nothing left to compose, and the
 * press sent nothing.
 */
export const PAY_QUOTE_GONE = 'This quote is no longer on the stall \u2014 nothing was sent';
/**
 * The second feed disagrees with the first past `RATE_DISAGREE_PCT`. Said,
 * never refused: the figure stands (it is the first feed's), the control
 * restates it, and the buyer decides with the fact in front of them — the
 * same shape as a moved rate. No timing is promised; nothing here knows
 * when two caches re-converge.
 */
export const PAY_RATE_DISAGREE = 'Two price sources disagree \u2014 check the figure before you pay';
/**
 * Every reason a figure is missing, and every valve outcome, has its own
 * sentence — and the compiler holds the tables to the unions, so a new
 * member cannot be added without one. Ternaries with an `else` let a new
 * `disagree` fall through to "CoinGecko did not answer", the exact collapse
 * D9(a) shipped to fix.
 */
export const PAY_RATE_WHY_TEXT: Readonly<Record<PayRateWhy, string>> = {
    'no-answer': PAY_NO_RATE_WHY,
    implausible: PAY_RATE_IMPLAUSIBLE_WHY,
};
export const PAY_VALVE_TEXT: Readonly<Record<PayRateOutcome, string>> = {
    unavailable: PAY_RATE_UNAVAILABLE,
    implausible: PAY_RATE_IMPLAUSIBLE,
    moved: PAY_RATE_MOVED,
    refreshed: PAY_RATE_REFRESHED,
    disagree: PAY_RATE_DISAGREE,
};
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
    'Arrange delivery with the seller off-chain. This page cannot tell that a payment was for this item \u2014 the memo is the payer\u2019s own claim \u2014 and never that anything was delivered.';
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
/** The seller's own published byte, attributed to them: the page prints it and rules on nothing. */
export const payTolerance = (pct: number): string =>
    `The seller\u2019s record says a payment short by up to ${pct}% still counts as paid in full.`;
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
    'A payment within this margin of your quote is one you accept as paid in full \u2014 rates move between glance and signature. With a surcharge, this page measures the margin against the quote plus the surcharge.';
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

/**
 * The seller's own surcharge control (STLD tag 0x04, 2026-09-21): a whole
 * percent added on top of the quote when a buyer pays. On every unit \u2014 a
 * surcharge is on the composed figure, and an XEC quote composes one too.
 * Above the fold and named on the "Publishes:" line, because the field is
 * PREFILLED from what this browser last signed on this stall (`saved.ts`):
 * the 2026-09-07 lesson was a byte pressed under a closed fold, and a
 * prefilled field a seller reads before signing is not that.
 */
export const DESC_SURCHARGE_LABEL = 'Surcharge on this quote, in % (optional)';
/** The empty field's own word: absent is "none", never zero. */
export const DESC_SURCHARGE_PLACEHOLDER = 'none';
export const DESC_SURCHARGE_HINT =
    'Added on top of the quote when a buyer pays here: this page composes the figure, and every screen prints \u201c+N% surcharge \u00b7 the seller\u2019s record\u201d beside your quote. Only this page adds it \u2014 a buyer paying by another route pays the quote. A whole percent, 1\u2013100; empty is none.';
/** A percent typed on a token with no price yet: said, never dropped in silence. */
export const DESC_SURCHARGE_NO_PRICE =
    'A surcharge rides a price. This quote has no figure yet, so nothing is published for it.';
/** Said while the field holds a value the seller did not type this time. What this app observes is the press, never the signature. */
export const descSurchargePrefilled = (pct: number): string =>
    `Prefilled with the ${pct}% surcharge this browser last handed to a wallet for this stall. Change or clear it before you sign.`;
export const DESC_SURCHARGE_REFUSED =
    'A surcharge is a whole number from 1 to 100 \u2014 \u201c5\u201d \u2014 or empty for none.';
/** The percent inside the summary line and the Studio's memory line. */
export const surchargePercent = (pct: number): string => `${pct}%`;
/** The Studio's "This browser" block: what the next describe sheet opens with, and the control that forgets it. */
export const studioSurchargeMemory = (pct: number): string =>
    `This browser prefills a new quote on this stall with a ${pct}% surcharge \u2014 the last one it handed to a wallet here.`;
export const STUDIO_SURCHARGE_MEMORY_NONE =
    'This browser prefills a new quote on this stall with no surcharge \u2014 the last quote it handed to a wallet here carried none.';
export const STUDIO_FORGET_SURCHARGE = 'Forget';
export const STUDIO_FORGET_SURCHARGE_LABEL = 'Forget the surcharge this browser remembers for this stall';

/*
 * "Pay several" (2026-09-21): one payment for several quotes. The control is
 * named for what it does and the word "basket" is in no copy (the design
 * round's D1; the owner may take "giỏ" back knowingly). The strip sits
 * under the rail tabs in the tabs' own dress; the sheet is the pay sheet's
 * shape over the lines.
 */
export const SELECTION_LABEL = 'Pay several items at once';
export const SELECTION_OPEN = 'Pay several';
export const selectionOpenCount = (n: number): string =>
    `Pay several \u00b7 ${n} item${n === 1 ? '' : 's'}`;
export const SELECTION_HINT = 'One payment for several quotes';
export const SELECTION_EMPTY = 'Add items below';
export const selectionCountLine = (n: number): string => `${n} item${n === 1 ? '' : 's'}`;
export const SELECTION_CLEAR = 'Clear';
export const SELECTION_CLEAR_LABEL = 'Remove every chosen item';
/** The strip's total already includes every chosen item's own surcharge; the note says so without a number, because the percents may differ. */
export const SELECTION_NOTE_SURCHARGE = 'incl. surcharge \u00b7 the seller\u2019s record';
export const SELECTION_PAY = 'Pay';
export const SELECTION_NOT_CHOSEN = 'Not chosen';
/** A chosen row's own line: count × the quote as written = the line's figure, surcharge included. */
export const selectionLine = (count: string, figure: string, total: string): string =>
    `${count} \u00d7 ${figure} = ${total}`;
/**
 * The stepper's names carry the count: `renderStall` rebuilds the tree on
 * every paint, so an `aria-live` count would be a region a screen reader
 * never hears (`announce`'s own reason); focus returns to the same control
 * after the press and its name is read again.
 */
export const selectionFewer = (name: string, count: string): string =>
    `One fewer ${name} (${count} chosen)`;
export const selectionMore = (name: string, count: string): string =>
    `One more ${name} (${count} chosen)`;
export const selectionAskRemove = (name: string): string => `Remove ${name}?`;
export const SELECTION_ASK_CLEAR = 'Remove every item?';
export const SELECTION_YES = 'Yes';
export const SELECTION_NO = 'No';
/** A row in another unit than the selection's: it keeps its own Pay, named for what it does now. */
export const PAY_OPEN_APART = 'Pay on its own';
export const selectionApart = (unit: string): string =>
    `Quoted in ${unit} \u2014 paid on its own`;
export const SELECTION_DROPPED =
    'Something you chose is no longer quoted as it was and was taken out.';
/**
 * A chosen item this page's own read did not reach — a walk that threw, or a
 * genesis that never arrived. In place of the strip's total and Pay: our
 * failure, never "no longer quoted" (the owner, "Nói rõ", 2026-09-24). A
 * read that is still in flight says nothing here, and one that stopped at
 * our page cap says `selectionCapped`, since trying again cannot help it.
 */
export const selectionUnread = (n: number): string =>
    `This page could not read ${n} item${n === 1 ? '' : 's'} you chose \u2014 try again to pay`;
/**
 * A chosen item past our own page cap on a walk that finished: asking again
 * stops in the same place, so this sentence offers no remedy (the critic's
 * sixth pass, 2026-09-24) — only the fact, which is about this page.
 */
export const selectionCapped = (n: number): string =>
    `This page stops reading the seller\u2019s records before it reaches ${n} item${n === 1 ? '' : 's'} you chose, so it cannot price ${n === 1 ? 'it' : 'them'} here`;
export const selectionFull = (n: number): string =>
    `Up to ${n} different items in one payment.`;
/* The several-items sheet. */
export const paySeveralTitle = (n: number): string =>
    `${n} item${n === 1 ? '' : 's'} \u00b7 one payment`;
export const paySeveralSub = (stall: string): string =>
    `Paid to ${stall} directly, in one payment.`;
export const PAY_SEVERAL_SUB_NO_NAME = 'Paid to the seller directly, in one payment.';
export const paySeveralLine = (name: string, count: string): string => `${name} \u00d7\u00a0${count}`;
export const paySeveralTotal = (figure: string): string => `= ${figure} in total`;
export const paySeveralTotalSurcharged = (figure: string): string =>
    `= ${figure} in total, surcharges included \u00b7 the seller\u2019s records`;
/** The card's caption over the lines while no figure can be composed: several quotes, not one. */
export const PAY_CAP_QUOTES = 'Seller\u2019s quotes';
/** The dust floor on the sum: add items rather than raise a quantity. */
export const PAY_SUB_DUST_SEVERAL =
    'The total is under the network\u2019s dust floor, so no wallet would relay it. Add items, or ask the seller.';
export const PAY_FINE_TOLERANCES_PER_ITEM =
    'Tolerances are per item: each item\u2019s own sheet shows the margin the seller\u2019s record states.';
/**
 * Three states, three sentences (2026-09-22, the critic's P2-8). The memo is
 * built now, so "carries no memo **yet**" — a sentence about this project's
 * roadmap — may not stand in for "this selection is too large to itemise",
 * which is a sentence about this payment. `NAMES` is said when the memo
 * rides along; `TOO_MANY` when the record would pass the 222 bytes a wallet
 * takes and the payment goes without it; `NO_MEMO` remains for a selection
 * this page could not compose one for at all, which is the same silence the
 * rail had before.
 */
export const PAY_FINE_MEMO_NAMES =
    'This payment carries the items in its memo: the seller sees what it was for, as your claim. Nothing on chain checks it.';
export const PAY_FINE_MEMO_TOO_MANY =
    'Too many items to fit in the memo, so this payment carries none: the seller sees the amount, not the items. Tell them what it was for.';
export const PAY_FINE_NO_MEMO =
    'This payment carries no memo: the seller sees the amount, not the items. Tell them what it was for.';
/**
 * The scan code is the one destination the press-time valve does not guard,
 * and it is also the one that has to be READ across a shop or a desk. A memo
 * grows the code with the items it names, so past the density this project
 * has proved (`QR_PROVEN_PX_PER_MODULE`) the fold says so instead of drawing
 * a code nobody's phone will take. It names the way out that still works:
 * both Pay controls are above it.
 */
/**
 * The wall's own version, on the one screen with no link to fall back to and
 * nobody to ask. Unreachable while the wall composes no memo — its URI is
 * ~68 characters — and painted rather than left blank because a plate that
 * said "Scan to pay" over an empty box would be a wall telling a customer to
 * scan nothing.
 */
export const WINDOW_PAY_NO_CODE =
    'This payment is too long for a code on this screen. Ask the seller.';
export const PAY_QR_TOO_MANY =
    'Too many items for a scan code. Use a Pay button above, or open this page on the phone that will pay.';
export const PAY_FINE_DELIVERY_SEVERAL =
    'Arrange delivery with the seller off-chain. This page cannot tell that a payment was for these items, and never that anything was delivered.';

/** The overlay's brand line. Ours, never the seller's. */
export const BROADCAST_BRAND = 'stall.cash';
/** Under the QR. The payload is the shop. */
export const BROADCAST_CAPTION = 'Scan to open';
/** Empty shop on the overlay. Muted; not a failure. */
export const BROADCAST_EMPTY = 'nothing listed yet';
/**
 * The overlay over a book that has listings and not one card to show
 * (the critic's third and fourth passes, 2026-09-24). Said about the
 * listings and never about the stall: a stall with quotes the stream does
 * not carry is not a stall with nothing to buy. Two sentences, because
 * there are two reasons: every listing is one nobody can take (its smallest
 * take is more than is left), and the stream skips them — or every listing
 * is a token this page does not carry (§4's withheld list). "Nothing listed
 * yet" would be false for both: they are listed.
 */
export const BROADCAST_NO_LISTING_BUYABLE = 'no listing can be bought right now';
export const BROADCAST_NO_LISTING_CARRIED = 'nothing listed here that this page shows';
/**
 * The one line under a quote card, and every limit of that rail in it: money
 * reaches the seller, nothing is held, and no token changes hands. It is the
 * only sentence a viewer gets before they scan, so it says what the payment
 * is rather than what the shop hopes for.
 */
export const BROADCAST_QUOTE_LINE = 'Pays the seller \u00b7 no escrow';
/* The ticker's label plate (2026-09-21): whose figures the pass carries. On
   the quotes pass the flag also carries what paying them does — PLAN § D
   rule 5's line, at the ribbon's exit for the whole pass, since a moving
   item cannot carry it (the owner's amendment, § Decided). */
export const BROADCAST_TICKER_LISTINGS = 'Listings';
export const BROADCAST_TICKER_QUOTES = 'Seller\u2019s quotes';
export const BROADCAST_TICKER_QUOTES_LINE = `${BROADCAST_TICKER_QUOTES} \u00b7 ${BROADCAST_QUOTE_LINE}`;
/** The code on a quote card opens this page at that item — never a wallet. */
export const BROADCAST_QUOTE_QR_ALT = 'QR code for this item at this stall';
/** Listings beyond the shown card. `n` is listings − 1. */
export function broadcastMore(n: number): string {
    return `+${n} more`;
}

/* ---------- the shop window ---------- */

/**
 * What a code on one item does, and it is deliberately not "buy".
 *
 * A quote's code opens this page's pay sheet; a listing's opens Cashtab's
 * token page, where every maker's offers are listed and the buyer picks a row
 * (§2 — no `action=BUY`). Neither is a purchase, and Cashtab may not even show
 * the row this screen is advertising (§10), so the word is "open".
 */
export const WINDOW_SCAN_ITEM = 'Scan to open this item';

/** The one code a catalogue carries: the shop, not a row of it. */
export const WINDOW_SCAN_SHOP = 'Scan to browse this shop on your phone';

/**
 * What the screen is showing, on the left of the status bar.
 *
 * No count: §4's rule is that a number is printed only when this page read the
 * whole of that side, and a screen nobody can question is the worst place to
 * print a floor as an inventory.
 */
export function windowState(
    rail: 'listings' | 'quotes',
    upto?: number,
    outcome?: string,
): string {
    // What this page actually knows outranks what it was asked to show: a
    // screen that could not read the shop must not claim to be showing it.
    if (outcome !== undefined) {
        return outcome;
    }
    const what = rail === 'quotes' ? 'Showing quotes' : 'Showing listings';
    return upto === undefined ? what : `${what} · locked at block ${upto.toLocaleString('en-US')}`;
}

/** How long a screen may go unread before the line rounds to the next unit. */
const WINDOW_FRESH_STEPS: ReadonlyArray<readonly [number, string]> = [
    [86_400, 'day'],
    [3_600, 'hour'],
    [60, 'minute'],
];

/**
 * How long ago this screen last read the chain.
 *
 * **Absent when it cannot be said.** A screen with no read time prints no line
 * rather than "just now", which is §5's rule about a record this page cannot
 * date, applied where the claim is about our own reading. A stamp ahead of
 * this browser's clock answers nothing for the same reason.
 *
 * It exists because nothing else on an unattended screen can say it:
 * `chronik-client` sends no ping, a half-open socket fires no `close`, and the
 * one recovery path that saves every other case — `visibilitychange` into
 * `resume()` — never fires on a kiosk that is visible around the clock.
 */
export function windowFreshness(readAtMs: number | undefined, nowMs: number): string | undefined {
    if (readAtMs === undefined || !Number.isFinite(readAtMs) || readAtMs > nowMs) {
        return undefined;
    }
    const seconds = Math.floor((nowMs - readAtMs) / 1000);
    if (seconds < 60) {
        return 'Updated just now';
    }
    for (const [size, unit] of WINDOW_FRESH_STEPS) {
        const count = Math.floor(seconds / size);
        if (count >= 1) {
            return `Updated ${count} ${unit}${count === 1 ? '' : 's'} ago`;
        }
    }
    return 'Updated just now';
}

/** The Studio's launcher for the shop window, in the Share card's family. */
export const WINDOW_OPEN = 'Open the shop window';
export const WINDOW_TITLE = 'Shop window';
export const WINDOW_LEDE = 'Put this stall on a screen in your shop. Nobody has to touch it.';
/**
 * The quarter-turn, named by the physical act rather than by an angle.
 *
 * A seller is standing in front of a sideways screen, not reading a spec:
 * the words that help are "turn it", and the instruction that always works
 * is "if it comes out upside down, use the other one".
 */
export const WINDOW_TURN_LABEL = 'Turn';
export const WINDOW_TURN_NONE = 'None';
export const WINDOW_TURN_CW = 'Turn right';
export const WINDOW_TURN_CCW = 'Turn left';
export const WINDOW_TURN_WHY =
    'For a screen hung sideways on a wall while the computer driving it still sends a landscape picture \u2014 an old television with no network of its own. Leave it on None unless the picture comes out sideways; if a turn lands upside down, use the other one.';

/**
 * The composing sheet over a Cycle wall that would show nothing: every
 * listing is one nobody can buy. Two sentences, because the quotes are a way
 * out only where there are some (the critic's third pass, 2026-09-24: the
 * one sentence offered them on a stall that quotes nothing).
 */
export const WINDOW_CYCLE_NOTHING =
    'This wall would show nothing: every listing here is one nobody can buy, and Cycle skips those. Choose Browse, where they are listed and labelled.';
export const WINDOW_CYCLE_NOTHING_QUOTED =
    'This wall would show nothing: every listing here is one nobody can buy, and Cycle skips those. Choose Browse, where they are listed and labelled, or show your quotes.';
export const WINDOW_SHOW_LABEL = 'Show';
export const WINDOW_MODE_LABEL = 'Mode';
export const WINDOW_SHOW_LISTINGS = 'Listings';
export const WINDOW_SHOW_QUOTES = 'Quotes';
export const WINDOW_SHOW_ALL = 'All';
export const WINDOW_MODE_CYCLE = 'Cycle';
export const WINDOW_MODE_BROWSE = 'Browse';
export const WINDOW_MODE_WHY =
    'Cycle shows one item at a time and needs nobody. Browse scrolls, and starts again on its own after a while without a touch.';
export const WINDOW_LOCK_LABEL = 'Lock the listings';
export const WINDOW_LOCK_PRESS = 'Show only listings up to block';
/**
 * The freeze's sentence, and it is about the SCREEN.
 *
 * A listing that arrives after the lock is still a real listing on a real
 * shop page; this only decides what a wall shows. Saying anything else would
 * be our own display choice reported as the seller's inventory, which is §4's
 * rule about a floor printed as a count.
 */
export const WINDOW_LOCK_WHY =
    'Suggested: one block past the newest listing this page has read. A listing that appears after it stays off this screen — it stays on your shop. Your own quotes are never locked: nobody else can add one.';
export const WINDOW_LINK_LABEL = 'Link';
export const WINDOW_LINK_WHY =
    'Bookmark this on the shop’s own computer to open the same screen tomorrow.';
/** The sheet's groups (round 16): what the screen shows, a preview, the lock, then open it. */
export const WINDOW_GROUP_SHOW = 'What the screen shows';
export const WINDOW_GROUP_PREVIEW = 'Preview';
export const WINDOW_GROUP_OPEN = 'Open it';
/** The preview's caption: which rail, which mode, and what that means on the wall. */
export const windowPreviewCaption = (show: string, mode: string, cycle: boolean): string =>
    `${mode} · ${show} · ${cycle ? 'one card and its code, 20 s each' : 'the whole catalogue, one code for the shop'}`;
export const WINDOW_OPEN_HERE = 'Open here';
export const WINDOW_OPEN_TAB = 'Open in a new tab';

/**
 * The lock's own refusal, said and never substituted.
 *
 * `parseBlockParam` refuses `"874,213"` — which its own docblock names as
 * what a seller reads off an explorer, commas and all. The first version
 * dropped the lock from the link in silence and left the control reporting
 * itself as pressed. §8's rule for a quantity this field cannot read: say so,
 * never guess one.
 *
 * And it names every refusal, not the one that prompted it: the parse also
 * turns away `0`, a leading space, a decimal point, an exponent, a minus sign
 * and anything over `MAX_BLOCK_HEIGHT`. A sentence about commas over a string
 * with no commas is the same silence in a different coat.
 */
export const WINDOW_LOCK_REFUSED =
    'A block height is a plain number: digits only, no commas, and under ten million.';

/** Said beside a rail this stall has nothing on, so the seller does not pick a blank wall. */
export const WINDOW_RAIL_EMPTY = 'This stall has nothing on that side right now.';

/**
 * What a shop window says about itself when it has no rows, and it is three
 * different sentences because they are three different facts.
 *
 * §4's rule arriving on a wall: `empty` is a claim about the seller,
 * `unreachable` / `plugin-missing` / `unreadable` are claims about us, and
 * `opening` is neither yet. The first version printed "Showing listings" over
 * all four — our own failure stated as the seller's inventory, on the one
 * surface with nobody to press retry.
 */
export function windowOutcome(
    kind: string | undefined,
    route?: string,
    /**
     * How many rows the listings rail is actually painting, when the caller
     * knows.
     *
     * The twin below has taken its own read since it shipped; this one had
     * none, so a shelf whose every item this page withholds (§4) or whose
     * every item the freeze drops printed "Showing listings" over a blank
     * strip — our own floor read, on a wall in a shop, as the seller's
     * inventory.
     *
     * **The count of what is hidden is deliberately NOT taken.** Only the
     * empty case speaks: a partly hidden shelf still shows goods, so
     * "Showing listings" is true of it and the lock line `windowState`
     * appends is worth more there than a number — and a number beside a
     * partial read is what CLAUDE §4 refuses anyway. The first version took
     * `{ rows, hidden }` and read only `rows`, which cost the call site a
     * `withheldListings` scan and two extra `windowListings` derivations
     * every twenty seconds on a wall, for a value no sentence used.
     */
    rows?: number,
): string | undefined {
    // §4's "three layers, not one enum", and the route is the first of them.
    // A never-spent address and a walk that hit our own page cap are facts
    // about IDENTITY — there is no shop to be empty or unreadable yet — and
    // the first version painted both as "Opening…" for ever, over a blank
    // wall with a code inviting customers to browse a stall that does not
    // exist.
    if (route === 'unresolvable') {
        return 'This address has not listed anything yet';
    }
    if (route === 'unresolved') {
        return 'This screen could not finish reading the address';
    }
    if (kind === 'offers') {
        // The same sentence the quotes rail says in the same situation, and
        // for the same reason: it is about this SCREEN and claims nothing
        // about the seller. It replaces the lock line rather than joining
        // it, which is the right trade over a blank strip — "locked at
        // block N" explains at most one of the two ways to get here.
        return rows === 0 ? 'Nothing here this screen can show' : undefined;
    }
    if (kind === 'empty') {
        return 'Nothing listed yet';
    }
    if (kind === undefined || kind === 'opening') {
        return 'Opening…';
    }
    // `unreachable`, `plugin-missing`, `unreadable`: ours, and said as ours.
    return 'This screen could not read the shop';
}

/**
 * The quotes rail's own outcome on the shop window, in its own words.
 *
 * §4's rule — neither side lends the other its words — reaches this screen
 * too, and here it had nothing to say at all: the rail printed "Showing
 * quotes" over a blank strip whether the seller had quoted nothing, the
 * descriptions walk had failed, it had stopped at our own page cap, or it
 * had not answered yet. On a wall in a shop that blank reads as the seller's
 * inventory, which is the empty-versus-unreachable collapse on the one
 * surface with nobody standing there to ask.
 *
 * Primitives rather than the view, like `windowOutcome` beside it: copy has
 * no business knowing the shape of a read. The order is the ordinary rail's
 * own precedence, collapsed to the one line a status bar has — a failure
 * outranks a cap, a cap outranks "still reading", and only a complete read
 * may say anything about the seller.
 *
 * `truncated` is carried even with rows on screen: the rail answered every
 * page it asked for and the end may be further on, which is a fact about
 * this screen and not about the shop.
 */
export function windowQuotesOutcome(read: {
    failed: boolean;
    truncated: boolean;
    answered: boolean;
    rows: number;
    /**
     * Records that produced no row — ones this page withholds (§4) and ones
     * whose genesis it could not read — counted together because every
     * sentence below says only that this SCREEN is not showing them. Two
     * facts under one wording is safe exactly while the wording claims
     * nothing about the seller; the moment one of these lines blames their
     * inventory, they have to come apart.
     */
    hidden: number;
}): string | undefined {
    if (read.failed) {
        return 'This screen could not read the quotes';
    }
    if (read.truncated) {
        return 'This screen read only part of the quotes';
    }
    if (!read.answered) {
        // Never "nothing quoted": that is a sentence about the seller, and
        // no record of theirs has been read yet.
        return 'Reading the quotes\u2026';
    }
    if (read.rows > 0) {
        // The freeze is Agora listings only, so nothing else wants this
        // line on the quotes rail and the outcome may own the whole of it.
        return read.hidden > 0 ? `Showing quotes \u00b7 ${read.hidden} not shown here` : undefined;
    }
    // A stall whose only quote this page holds back did not quote nothing.
    return read.hidden > 0 ? 'Nothing here this screen can show' : 'Nothing quoted yet';
}

/**
 * The freeze's own switch, and it is off.
 *
 * Most sellers never need it: it exists for §10's gift listing, which most
 * stalls never see. Off by default and folded behind one press, so a seller
 * who does not want it never meets a block height at all (owner, 2026-09-18:
 * "nếu user không muốn thì cũng không cần").
 */
/**
 * The quote code's own switch, and it is on.
 *
 * Off turns the screen into a price board — the figure the seller quoted and
 * nothing to scan — for a shop that takes payment at the counter. It names
 * what it does NOT cover, because the listings rail keeps a code either way
 * and a switch that read as "no codes anywhere" would be a promise this does
 * not keep.
 */
/** A switch's own state, in words — the one thing every look paints. */
export const WINDOW_SWITCH_ON = 'On';
export const WINDOW_SWITCH_OFF = 'Off';

/*
 * "Pay several" on a touch wall (2026-09-21, the owner's ask; the design is
 * `private/design/touch-2026-09-21/`). The switch's own line says the whole
 * of what the screen gains, because a seller composing this link is not
 * standing at the wall when a customer meets it.
 */
export const WINDOW_TOUCH_SWITCH = 'Let customers pick several quotes and pay in one scan';
export const WINDOW_TOUCH_WHY =
    'For a touch screen only. The screen gains plus and minus on each quote, Clear all and Pay \u2014 nothing else. A customer\u2019s choice stays until someone presses Clear all, and the code that pays it takes the shop\u2019s own code slot while it is up.';
/** Why the switch is refused while the pay code is off: the two contradict. */
export const WINDOW_TOUCH_NEEDS_CODE =
    'Turn the pay code on first: this composes a code that pays the quotes a customer picked, and a price board that pays at the counter has nowhere to put it.';
export const WINDOW_TOUCH_EMPTY = 'Tap + on the items you want to pay for together';
export const WINDOW_CLEAR_ALL = 'Clear all';
export const WINDOW_PAY = 'Pay';
/** Over a standing plate: the press composes the same figure again at a fresh rate. */
export const WINDOW_PAY_AGAIN = 'Pay again for a fresh price';
export const WINDOW_PAY_BACK = 'Back';
/*
 * What the wall says between the press and the code (2026-09-21). The
 * phone's own two sentences name "the link and the code", and a wall hands
 * off to nothing — it has a code and a Pay control and no link at all — so
 * these are its own, and they name the control a customer can actually
 * press rather than one that is not there.
 */
export const WINDOW_PAY_ASKING =
    'Asking the price feeds for a rate\u2026 the code appears when one arrives.';
/**
 * The wall's own sentence for a chosen item its read did not reach (a walk
 * that threw, a genesis that never arrived), in place of the strip's total
 * and Pay. The wall has no retry control: its heartbeat reads again within
 * a minute, so Pay comes back by itself once a read reaches it.
 */
export const windowSelectionUnread = (n: number): string =>
    `This screen could not read ${n} item${n === 1 ? '' : 's'} you chose just now \u2014 Pay comes back once it can`;
/**
 * The wall's sentence for a chosen item past our own page cap: the
 * heartbeat's next read stops in the same place, so no remedy is offered.
 */
export const windowSelectionCapped = (n: number): string =>
    `This screen stops reading the seller\u2019s records before it reaches ${n} item${n === 1 ? '' : 's'} you chose, so it cannot price ${n === 1 ? 'it' : 'them'} here`;
/**
 * The wall's status line over records kept from the last read that finished,
 * because this screen's own walk threw (the owner's wording, 2026-09-24): in
 * place of the book's freshness stamp, which would claim the quotes were read
 * just now.
 */
export const WINDOW_QUOTES_AS_LAST_READ =
    'Quotes as last read \u00b7 this screen could not read them just now';
/**
 * The same line when the walk that threw still read some of the quotes on
 * the rail (the critic's eighth pass, item 5): what it resolved shows what
 * it read, per token, so "Quotes as last read" would call a quote read just
 * now an old one.
 */
export const WINDOW_SOME_QUOTES_AS_LAST_READ =
    'Some quotes as last read \u00b7 this screen could not read them just now';
export const WINDOW_PAY_WHY_TEXT: Readonly<Record<PayRateWhy, string>> = {
    'no-answer':
        'No price feed answered just now, so there is no code to scan. Tap Pay again in a moment.',
    implausible:
        'A price feed answered with a rate far outside anything XEC has traded at, so this page will not turn it into an amount. Tap Pay again in a moment.',
};
export const windowPayCaption = (count: number): string =>
    `Scan with your phone wallet to pay ${count} ${count === 1 ? 'item' : 'items'}`;
/**
 * The payment's lines scroll inside the wall's plate — a selection holds up
 * to 35 items and a wall cannot scroll — so how many of them the scroller
 * does not show whole is said under it, and only when there are some
 * (owner, 2026-09-24). "Swipe" because this plate exists on a touch wall
 * alone.
 */
export const windowPayMore = (n: number): string =>
    `+${n} more ${n === 1 ? 'item' : 'items'}: swipe the list`;
/**
 * A chosen item on a token another wallet minted, said outside the lines'
 * scroller, where a customer reads it before scanning (the critic,
 * 2026-09-24): inside it, the line that said so could be scrolled out of
 * view while the code stood. One item is the item's own sentence; several
 * are counted, and each line still carries the mark so the list says which.
 */
export const windowPayBorrowed = (borrowed: number, lines: number): string =>
    lines === 1
        ? QUOTE_NOT_MINTED_HERE
        : `${borrowed} of these ${lines} items: ${QUOTE_NOT_MINTED_HERE.toLowerCase()} (marked in the list)`;
/** Said in advance, because a customer at a wall has no refresh control to press. */
export const windowPayGoodFor = (minutes: number): string =>
    `good for ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
/**
 * A quote in another unit than the selection's, on the wall. The phone says
 * "paid on its own" beside a Pay control; in `browse` no row carries a code
 * of its own, so that sentence would point at nothing (the critic, P2-13).
 */
export const windowApart = (unit: string): string =>
    `Quoted in ${unit} \u2014 scan the shop\u2019s code and pay it from your phone`;

export const WINDOW_PAYCODE_SWITCH = 'Show a code that pays each quote';
export const WINDOW_PAYCODE_WHY =
    'On by default. Turn it off for a screen that only shows prices, where a customer pays at the counter instead of from the wall. The listings keep their code either way: it opens the item in Cashtab and pays nobody.';

/**
 * The switch REVEALS the setting; the control inside it sets the lock.
 *
 * It read "Lock the listings to a block · On" while the link carried no
 * `upto` at all, with a height already suggested in the field beneath it —
 * a switch stating a lock that was not set (2026-09-20). Two controls is
 * the shape the owner chose on 2026-09-18 (the height lives behind one
 * press, because most stalls never meet the problem), so the words move
 * rather than the shape: this one names what turning it on does, and the
 * `why` line names the second step so nobody stops at the first.
 */
export const WINDOW_LOCK_SWITCH = 'Show the block-lock setting';
export const WINDOW_LOCK_SWITCH_WHY =
    'Off by default. Turn it on only if somebody has hung something on your stall that you do not sell — anyone can, and it pays you rather than them. Showing it does not lock anything: the control below does, once a block height is in the field.';
