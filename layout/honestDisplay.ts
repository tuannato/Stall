/**
 * **The honest-display sentences are contrast targets, by role** (8e2,
 * CRITIC-STEP-8E2 item 11; the window's option (b), 2026-10-06). The
 * sentences on the four money sheets — the pay sheet, "Pay several", the
 * name sheet and the describe sheet — that state a money or signing fact:
 * that a payment is final, that no escrow stands behind it, that only this
 * stall's wallet can sign its record, that a token was minted by another
 * wallet, that a quote left the stall. They were `p.fine`, `p.note` and
 * `p.ctx` lines no `CONTRAST_TEXT` selector matched, so a look could paint
 * them unreadable — or collapse them out of view — and every pass stayed
 * green (the critic's plant: every `.fine` collapsed under the private look,
 * and the pay, Pay several and publish screens showed no skip at all).
 *
 * **By role, never by class**: a `fine` line elsewhere is not one of these,
 * and one of these may be dressed as `note`, `ctx` or `warn`. Each role is
 * written in `render.ts` (several by `roled`, a role and nothing else — no
 * visible change), and every selector is scoped to `.sheet`, because
 * `quote-not-minted` and `quote-minted` are also the row's, the face's and
 * the tag's. The one node left out by element: "Pay several"'s
 * `quote-not-minted` is a `dd` inside `pay-lines`, a money box read whole
 * (`moneySet.ts`), and a target inside a money box must be money.
 *
 * **A hidden or desk-only node is not a target where it is not rendered**:
 * `__contrastPrepare` drops an honest node with no layout box (`hidden`, a
 * `display: none` fold on a phone) before it is counted, so it is neither
 * read nor counted as a line skip (`LINE_SKIP_CEILING` is the public run's
 * own count and is unchanged). A node that IS rendered and yields no line on
 * screen is still a skip like any other target.
 *
 * **What a pass owes** is `HONEST_OWED`: per sampled screen and viewport,
 * the roles a contrast job there must READ — every job of that screen and
 * viewport, on every measured look, bare and worn. A look that collapses or
 * clips one of them out of view is not a skip that hides: it is a role owed
 * and not read, and the runner fails the job by name
 * (`the-honest-display-sentences-are-read`, `layout-check.mjs`). The table
 * is the fixtures' own state — the static half
 * (`honestDisplay.test.ts`) paints each owed screen in happy-dom and holds
 * every owed role to a node there, painted and not `hidden`.
 *
 * **Read where painted, owed nowhere, stated**: a role whose state no
 * sampled fixture stages — `pay-why` (on `pay-dust`, which stays geometry
 * only: its two Pay controls are `hidden` there, and sampled they measured
 * +7 not-rendered line targets a viewport over the unchanged
 * `LINE_SKIP_CEILING`), `pay-quantity-why`, `pay-whole-items`,
 * `pay-qr-stale`, Pay several's `pay-several-dropped`, `pay-qr-why` and its
 * own `pay-lost`, the describe sheet's state lines and the name sheet's
 * `publish-invalid`, `publish-same-look` and code caption — is a target the
 * day a sampled screen paints it, and owed by no job today
 * (`layout/PROBE-RULES.md`, "The honest-display sentences are read").
 */

/** The four sheets these sentences stand on. */
export type HonestSheet = 'pay' | 'pay-several' | 'publish-name' | 'describe';

export type HonestSentence = {
    readonly role: string;
    /** The sheets that paint it under this role. */
    readonly on: readonly HonestSheet[];
    /** The copy constant(s) it says, by name. */
    readonly says: readonly string[];
    /** What it states, in a line. */
    readonly fact: string;
    /** An element name, where the role is also carried by a node that must not be a target. */
    readonly element?: string;
};

export const HONEST_DISPLAY: readonly HonestSentence[] = [
    // The pay sheets.
    { role: 'pay-direct', on: ['pay', 'pay-several'], says: ['PAY_NOTE_DIRECT'], fact: 'no escrow; no token is sent; the seller delivers off-chain' },
    { role: 'pay-final', on: ['pay', 'pay-several'], says: ['PAY_NOTE_FINAL'], fact: 'a payment is final and cannot be reversed' },
    {
        role: 'pay-lost',
        on: ['pay', 'pay-several'],
        says: ['PAY_QUOTE_GONE', 'PAY_QUOTE_UNSHOWN', 'PAY_HINT_UNKNOWN', 'PAY_SEVERAL_GONE', '…_OPENED'],
        fact: 'the quote left the stall, or this page cannot show it, and whether a wallet was opened',
    },
    { role: 'quote-not-minted', on: ['pay'], says: ['QUOTE_NOT_MINTED_HERE'], fact: 'the token was minted by another wallet', element: 'p' },
    { role: 'quote-minted', on: ['pay'], says: ['QUOTE_MINTED_HERE'], fact: 'what the genesis names, and not who owns the name' },
    { role: 'pay-why', on: ['pay', 'pay-several'], says: ['PAY_NO_RATE_WHY', 'PAY_RATE_IMPLAUSIBLE_WHY', 'PAY_RATE_ASKING', 'the dust line'], fact: 'why no link and no code were composed' },
    { role: 'pay-valve', on: ['pay', 'pay-several'], says: ['PAY_VALVE_TEXT', 'PAY_QUOTE_CHANGED', '…'], fact: 'the rate or the record moved, and what a press does now' },
    { role: 'pay-quantity-why', on: ['pay'], says: ['PAY_QUANTITY_REFUSED'], fact: 'a quantity the field refused is not used' },
    { role: 'pay-memo', on: ['pay'], says: ['PAY_FINE_MEMO'], fact: 'the memo is public' },
    { role: 'pay-some-wallets', on: ['pay'], says: ['PAY_FINE_SOME_WALLETS'], fact: 'some wallets drop the memo' },
    { role: 'pay-memo-line', on: ['pay-several'], says: ['PAY_FINE_MEMO_NAMES', 'PAY_FINE_MEMO_TOO_MANY', 'PAY_FINE_NO_MEMO'], fact: 'what the payment carries for the seller' },
    { role: 'pay-tolerance', on: ['pay'], says: ['payTolerance', 'PAY_TOLERANCE_NONE'], fact: 'the margin the seller’s record states' },
    { role: 'pay-surcharge-tolerance', on: ['pay'], says: ['PAY_FINE_SURCHARGE_TOLERANCE'], fact: 'the margin is measured against the composed figure' },
    { role: 'pay-tolerances-per-item', on: ['pay-several'], says: ['PAY_FINE_TOLERANCES_PER_ITEM'], fact: 'tolerances are per item' },
    { role: 'pay-delivery', on: ['pay', 'pay-several'], says: ['PAY_FINE_DELIVERY', 'PAY_FINE_DELIVERY_SEVERAL'], fact: 'this page cannot tell what a payment was for, nor that anything was delivered' },
    { role: 'pay-whole-items', on: ['pay'], says: ['PAY_FINE_WHOLE_ITEMS'], fact: 'whole items only' },
    { role: 'quote-age', on: ['pay'], says: ['quotedAgo'], fact: 'when the seller wrote the quote' },
    { role: 'pay-several-dropped', on: ['pay-several'], says: ['selectionDroppedItems', 'selectionDroppedCheck', '…'], fact: 'items taken out of the payment' },
    { role: 'pay-qr-lede', on: ['pay', 'pay-several'], says: ['PAY_QR_LEDE'], fact: 'the code opens the same payment' },
    { role: 'pay-qr-stale', on: ['pay'], says: ['PAY_QR_STALE'], fact: 'the code was taken away with the rate' },
    { role: 'pay-qr-why', on: ['pay-several'], says: ['PAY_QR_STALE', 'PAY_QR_TOO_MANY'], fact: 'why no code is drawn' },
    // The record sheets.
    { role: 'publish-must-sign', on: ['publish-name'], says: ['PUBLISH_MUST_SIGN'], fact: 'only this stall’s wallet can sign its record' },
    { role: 'describe-must-sign', on: ['describe'], says: ['PUBLISH_MUST_SIGN'], fact: 'only this stall’s wallet can sign its record' },
    { role: 'publish-lede', on: ['publish-name'], says: ['PUBLISH_LEDE'], fact: 'one transaction; Stall holds no key; the wallet signs' },
    { role: 'describe-lede', on: ['describe'], says: ['DESC_LEDE'], fact: 'one transaction per token, and one more per change' },
    { role: 'publish-wallet-hex', on: ['publish-name'], says: ['PUBLISH_WALLET_SHOWS_HEX'], fact: 'the wallet shows the record’s bytes' },
    { role: 'describe-wallet-hex', on: ['describe'], says: ['PUBLISH_WALLET_SHOWS_HEX'], fact: 'the wallet shows the record’s bytes' },
    { role: 'publish-after-signing', on: ['publish-name'], says: ['PUBLISH_AFTER_SIGNING'], fact: 'this page cannot see the wallet' },
    { role: 'describe-after-signing', on: ['describe'], says: ['PUBLISH_AFTER_SIGNING'], fact: 'this page cannot see the wallet' },
    { role: 'publish-qr-lede', on: ['publish-name'], says: ['PUBLISH_QR_LEDE'], fact: 'scan with the stall’s own wallet' },
    { role: 'describe-qr-lede', on: ['describe'], says: ['PUBLISH_QR_LEDE'], fact: 'scan with the stall’s own wallet' },
    { role: 'publish-invalid', on: ['publish-name'], says: ['the refused field'], fact: 'a field the record cannot carry' },
    { role: 'publish-same-look', on: ['publish-name'], says: ['PUBLISH_SAME_LOOK'], fact: 'publishing this look changes only the name' },
    { role: 'describe-invalid', on: ['describe'], says: ['the refused field'], fact: 'a field the record cannot carry' },
    { role: 'describe-price-lede', on: ['describe'], says: ['DESC_PRICE_LEDE'], fact: 'the figure is published as written and never converted' },
    { role: 'describe-surcharge-note', on: ['describe'], says: ['DESC_SURCHARGE_HINT'], fact: 'only this page adds the surcharge' },
    { role: 'describe-tolerance-note', on: ['describe'], says: ['DESC_TOLERANCE_HINT'], fact: 'what the margin accepts as paid in full' },
    { role: 'describe-two-prices', on: ['describe'], says: ['DESC_TWO_PRICES'], fact: 'the Agora price and the quote are not linked' },
    { role: 'describe-price-why', on: ['describe'], says: ['DESC_PRICE_NOT_PRICEABLE', 'DESC_QUOTE_NOT_YOURS', '…'], fact: 'why this token takes no price here' },
    { role: 'describe-warn-unattributed', on: ['describe'], says: ['DESC_QUOTE_UNATTRIBUTED'], fact: 'the minter is unknown' },
    { role: 'describe-warn-listed', on: ['describe'], says: ['DESC_QUOTE_LISTED_TOO'], fact: 'buyers see two prices' },
    { role: 'describe-warn-no-words', on: ['describe'], says: ['DESC_QUOTE_NO_WORDS'], fact: 'buyers see only the token’s name' },
    { role: 'describe-price-cleared', on: ['describe'], says: ['DESC_PRICE_CLEARED'], fact: 'an emptied price takes the quote off' },
    { role: 'describe-clear-lede', on: ['describe'], says: ['DESC_CLEAR_ALL_LEDE'], fact: 'publishing removes the words, the shelf and the price' },
    { role: 'describe-remove-warn', on: ['describe'], says: ['DESC_REMOVE_LEDE'], fact: 'a removal is another transaction and stays in the chain’s history' },
];

/** Each sentence's selector: its role, on a sheet, and its element where one is named. */
export const HONEST_SELECTORS: readonly string[] = HONEST_DISPLAY.map(
    ({ role, element }) => `.sheet ${element ?? ''}[data-role="${role}"]`,
);

/** The selectors as one, for `matches` and `querySelectorAll`. */
export const HONEST_SELECTOR = HONEST_SELECTORS.join(', ');

/** The contrast pass's viewports a sheet is sampled at. */
export type HonestViewport = 'mobile' | 'desktop';

/** The same roles at both widths. */
const both = (...roles: string[]): Readonly<Record<HonestViewport, readonly string[]>> => ({ mobile: roles, desktop: roles });

/** The pay sheet's lines on `pay`'s own card: a USD quote with a margin and a surcharge, this stall's mint, a fresh rate. */
const PAY_CARD = [
    'pay-direct',
    'pay-final',
    'quote-minted',
    'pay-memo',
    'pay-some-wallets',
    'pay-tolerance',
    'pay-surcharge-tolerance',
    'pay-delivery',
    'quote-age',
    'pay-qr-lede',
];

/**
 * The roles each sampled sheet screen owes, per viewport: every contrast job
 * of that screen and viewport must read each of them, on every look and
 * variant the pass paints it in. What each fixture paints (`fixtures.ts`)
 * and nothing it does not: no line that a fixture paints only under some
 * look — `publish-same-look` depends on the look the picker shows, and the
 * private looks are painted as a try-on — and the describe sheet's code
 * caption only from 680px, where the record sheets' code fold
 * (`.sheet-qr-fold`) is shown at all. The pay sheets' own code fold is
 * shown at both widths.
 */
export const HONEST_OWED: Readonly<Record<string, Readonly<Record<HonestViewport, readonly string[]>>>> = {
    pay: both(...PAY_CARD),
    // Another wallet's mint, an XEC quote with no margin, no age.
    'pay-xec': both('pay-direct', 'pay-final', 'quote-not-minted', 'pay-memo', 'pay-some-wallets', 'pay-delivery', 'pay-qr-lede'),
    // `pay` with the valve's "moved" line.
    'pay-moved': both(...PAY_CARD, 'pay-valve'),
    // A quote that left the stall: the one sentence.
    'pay-gone': both('pay-lost'),
    'pay-several': both('pay-direct', 'pay-final', 'pay-memo-line', 'pay-tolerances-per-item', 'pay-delivery', 'pay-qr-lede'),
    // Not `publish-qr-lede`: the name sheet composes no record for a look
    // the stall has not unlocked — a paid private look, painted as a
    // try-on — so neither the code nor its caption is painted there
    // (measured on the fixture look, 2026-10-06). Read where it is.
    'publish-name': both('publish-must-sign', 'publish-lede', 'publish-wallet-hex', 'publish-after-signing'),
    describe: {
        mobile: [
            'describe-must-sign',
            'describe-lede',
            'describe-wallet-hex',
            'describe-after-signing',
            'describe-price-lede',
            'describe-surcharge-note',
            'describe-tolerance-note',
            'describe-two-prices',
            'describe-warn-listed',
        ],
        desktop: [
            'describe-must-sign',
            'describe-lede',
            'describe-wallet-hex',
            'describe-after-signing',
            'describe-price-lede',
            'describe-surcharge-note',
            'describe-tolerance-note',
            'describe-two-prices',
            'describe-warn-listed',
            'describe-qr-lede',
        ],
    },
};
