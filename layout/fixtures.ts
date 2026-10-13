/**
 * The fixture stall the layout probe and the gallery showroom both paint.
 *
 * One module on purpose: the probe proves rules about what the showroom is
 * used to design, so the two must be looking at the same shop — a screen that
 * exists only in one of them is a screen that is either unguarded or
 * undesignable.
 *
 * Identities are dummies nobody holds: the pubkey is a repeated byte, token
 * ids are repeated bytes, and the address is derived from nothing real —
 * AGENTS.md §8, a fixture must not tie this project to somebody's wallet.
 */
import { SHIPPED_ATTACHMENTS } from '../src/domain/attachments';
import { scaleRate } from '../src/domain/fiat';
import type { TokenPrice } from '../src/domain/description';
import type { GenesisAttribution } from '../src/domain/genesis';
import type {
    BroadcastParams,
    Outpoint,
    StallOffer,
    StallView,
    TokenMeta,
} from '../src/domain/state';
import type { StallHandlers } from '../src/ui/render';
import { CHRONIK_HOSTS } from '../src/net/hosts';

export const ADDR = 'ecash:qpjqjm0lasd3k54dmuczp20sr05tsykrlyc3j7hv09';
export const PK = `03${'aa'.repeat(32)}`;
export const T1 = 'cd'.repeat(32);
export const T2 = '11'.repeat(32);
/** FIRMA, by id — withheld by the owner's rule, so the offers screen paints the withheld line. */
export const FIRMA_WITHHELD = '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0';
export const NFT = 'ee'.repeat(32);
export const GROUP = 'aa'.repeat(32);
/** The long-figure rows: one tier-2 card, one tier-3 card (see priceTier). */
export const LONG = '33'.repeat(32);
export const LONGER = '44'.repeat(32);
/** The Studio items card's glance line: two tokens of one name and ticker, one with none, one unread. */
export const STUDIO_TWIN_A = `${'a7'.repeat(30)}01b2`;
export const STUDIO_TWIN_B = `${'a7'.repeat(30)}9c4e`;
export const STUDIO_NO_TICKER = '77'.repeat(32);
export const STUDIO_NO_GENESIS = '88'.repeat(32);
/**
 * A token the seller **quoted** and never listed. The pay rail is not gated on
 * a listing, so a fixture whose every quote also has an offer would measure
 * only half of what the section paints.
 */
export const QUOTED = '55'.repeat(32);
/** A token whose initials are the widest pair ("WM"), for the Activity tile's letters. */
export const WIDE_INITIALS = '66'.repeat(32);
export const OUT: Outpoint = { txid: 'ab'.repeat(32), outIdx: 0 };

/** A frozen instant, so a repainted screen is byte-identical to itself. */
export const TRIED_AT_MS = 1_756_400_000_000;

export const offer = (
    tokenId: string,
    outIdx: number,
    sats: bigint,
    over?: Partial<StallOffer>,
): StallOffer => ({
    outpoint: { txid: OUT.txid, outIdx },
    tokenId,
    atoms: 12n,
    variant: 'PARTIAL',
    askedSats: sats,
    askedAtoms: 1n,
    priceNanoSatsPerAtom: sats * 1_000_000_000n,
    ...over,
});

export const meta = (tokenId: string, name: string, type?: string): TokenMeta => ({
    tokenId,
    name,
    ticker: name.slice(0, 4).toUpperCase(),
    decimals: 0,
    ...(type === undefined ? {} : { tokenType: { protocol: 'SLP', type } }),
});

export const tokens = new Map<string, TokenMeta>([
    // T1 carries a genesis `url` so the item face mounts `tokenLink` and the
    // probe measures that block (a 12px nowrap line with an ellipsis) — no
    // fixture carried one before 2026-09-07, so it had never been measured.
    [T1, { ...meta(T1, 'Roasted Beans', 'SLP_TOKEN_TYPE_FUNGIBLE'), url: 'https://example.com/beans' }],
    [T2, meta(T2, 'Green Tea', 'SLP_TOKEN_TYPE_FUNGIBLE')],
    [NFT, meta(NFT, 'Pixel #1', 'SLP_TOKEN_TYPE_NFT1_CHILD')],
    [GROUP, meta(GROUP, 'Pixel Set')],
    // Multi-word names on the long-figure rows on purpose: the defect this
    // stresses is the name column collapsing under the price, and a short
    // name hides it (the critic's Tea-vs-Crate false-positive finding).
    [LONG, meta(LONG, 'Harvest Ledger', 'SLP_TOKEN_TYPE_FUNGIBLE')],
    [LONGER, meta(LONGER, 'Century Flag #7', 'SLP_TOKEN_TYPE_NFT1_CHILD')],
    [QUOTED, meta(QUOTED, 'Sticker pack', 'SLP_TOKEN_TYPE_FUNGIBLE')],
    [WIDE_INITIALS, meta(WIDE_INITIALS, 'Wool Mittens', 'SLP_TOKEN_TYPE_FUNGIBLE')],
]);

/**
 * The seller's own figures, in both units this app writes and with a margin on
 * the one that needs a rate. `[data-role="seller-price"]` is a protected box
 * and a contrast target, and a selector matching nothing in a fixture is a
 * guard that measures nothing.
 */
export const QUOTES = new Map<string, TokenPrice>([
    // With a surcharge too (2026-09-21), so the pay sheet's composed line
    // and the record's line on every quote surface are painted and measured.
    [T1, { code: 'usd', exponent: 2, amount: 500n, tolerancePct: 2, surchargePct: 5 }],
    // The XEC quote carries one too: `pay-xec` is the one screen where the
    // composed figure has no rate beside it and the quote must still be
    // printed as written (critic, 2026-09-21).
    [QUOTED, { code: 'xec', exponent: 2, amount: 500_000n, surchargePct: 5 }],
]);

/**
 * Whose wallet minted each quoted token.
 *
 * One of each, deliberately. `T1` is this stall's own, so its row paints an
 * icon and the short `QUOTE_MINTED_CHIP` beside the quote chip; `QUOTED` is
 * another wallet's, so that row paints initials plus `QUOTE_NOT_MINTED_HERE`
 * under the item's name — a taller row with one more string on it, which is
 * the geometry no other fixture stages. Two chips in a name column that
 * `minmax(0, 1fr)` lets shrink is the width this pairing is here to measure.
 */
export const GENESIS = new Map<string, GenesisAttribution>([
    [T1, 'attributed'],
    [QUOTED, 'not-attributed'],
]);

/**
 * When each quoted record was written, on the chain's clock.
 *
 * Fixed instants, not an offset from the clock the probe runs on: the phrase
 * grows a unit as the years pass and the geometry does not, which is the point
 * of measuring it here. `QUOTED` carries none, so the undated shape — one line
 * shorter, never a dash — is on the same screen as the dated one.
 */
export const QUOTE_TIMES = new Map<string, number>([[T1, 1_748_000_000]]);

/**
 * The seller's own words about one quoted item, which is what names it on the
 * pay row and in the pay sheet. `QUOTED` deliberately has none: the row falls
 * back to the token's name and says the seller wrote nothing, and both shapes
 * are measured on the same screen.
 */
export const QUOTE_WORDS = new Map<string, string>([
    [T1, 'Half kilo of beans, roasted on the day it ships'],
]);

/**
 * One quote in each currency whose sign a served face does not draw itself
 * (INR ₹, ILS ₪, KRW ₩, NGN ₦, PHP ₱, TRY ₺): the money node (`seller-price`)
 * carries the sign beside the digits, so these are the screens that show
 * whose glyph it is — the shipped face's, or a font of the reader's machine
 * (CLAUDE §6, "Every look's face is shipped"; `quotes-signs`, `pay-inr`).
 * Exponents are `QUOTE_UNITS`' own: a won is written whole.
 */
const SIGN_QUOTES = [
    { id: 'b1'.repeat(32), name: 'Scarf', words: 'Cotton, packed the day it ships', price: { code: 'inr', exponent: 2, amount: 49_900n } },
    { id: 'b2'.repeat(32), name: 'Soap', words: 'Cold-pressed, six bars', price: { code: 'ils', exponent: 2, amount: 3_500n } },
    { id: 'b3'.repeat(32), name: 'Ginseng', words: 'Fifty bags, sealed', price: { code: 'krw', exponent: 0, amount: 12_000n } },
    { id: 'b4'.repeat(32), name: 'Shea', words: 'Raw, one jar', price: { code: 'ngn', exponent: 2, amount: 450_000n } },
    { id: 'b5'.repeat(32), name: 'Mango', words: 'Cebu, a bag of ten', price: { code: 'php', exponent: 2, amount: 25_000n } },
    { id: 'b6'.repeat(32), name: 'Tile', words: 'Hand painted, boxed', price: { code: 'try', exponent: 2, amount: 12_000n } },
] as const;

/** The six sign quotes as the view holds them: tokens read, prices, words and attribution. */
const signQuoteView = (): Partial<StallView> => ({
    tokens: new Map([...tokens, ...SIGN_QUOTES.map((q) => [q.id, meta(q.id, q.name, 'SLP_TOKEN_TYPE_FUNGIBLE')] as const)]),
    prices: new Map<string, TokenPrice>(SIGN_QUOTES.map((q) => [q.id, q.price] as const)),
    descriptions: new Map(SIGN_QUOTES.map((q) => [q.id, q.words] as const)),
    genesis: new Map(SIGN_QUOTES.map((q) => [q.id, 'attributed' as GenesisAttribution] as const)),
});

/**
 * The rate the pay sheet froze. **Stamped now, not at a frozen instant**
 * (2026-09-22): a stamp from 2025 is past `PAY_RATE_MAX_AGE_MS` on every run,
 * so every pay screen painted `PAY_QR_STALE` where its code belongs and the
 * probe has never measured a pay code at all — which is how a 300px plate
 * went unseen under a constant that said 318. The screens that read the
 * stamp's VALUE stage their own (`pay-moved` and the wall's own fixtures);
 * this one exists so a code is on screen to measure.
 */
const PAY_RATE = { rate: scaleRate(0.00002)!, atMs: Date.now() };

/**
 * A touch wall with a payment of `n` chosen items standing (the critic's P1,
 * 2026-09-24): the tablet fix held for one item, and both touch fixtures
 * chose one — `.sw-pay-lines` grows a line per item and a selection holds up
 * to `MAX_SELECTION_ENTRIES` (35). Each item is a USD quote with a
 * surcharge, the tallest line the plate paints (its figure and the record's
 * surcharge line under it), chosen ×2.
 */
const SEVERAL_NAMES = [
    'Roasted Beans', 'Green Tea', 'Rye Flour', 'Honey Jar', 'Plum Jam', 'Oat Bag', 'Chili Oil',
    'Sea Salt', 'Dried Figs', 'Walnuts', 'Apple Butter', 'Maple Syrup', 'Pickled Beets', 'Brown Rice',
    'Barley Tea', 'Rose Soap', 'Beeswax Candle', 'Linen Towel', 'Clay Mug', 'Wool Socks', 'Bread Knife',
    'Seed Packet', 'Garlic Braid', 'Cider Vinegar', 'Hazelnuts', 'Lentils', 'Mustard', 'Sour Cherries',
    'Buckwheat', 'Chamomile', 'Pear Butter', 'Smoked Salt', 'Dill Pickles', 'Poppy Seeds', 'Cocoa Nibs',
];

function severalPaying(n: number, borrowedAt: readonly number[] = []): Partial<StallView> {
    const ids = SEVERAL_NAMES.slice(0, n).map((_, i) => (0x60 + i).toString(16).padStart(2, '0').repeat(32));
    const borrowed = new Set(borrowedAt.map((i) => ids[i]!));
    const quote: TokenPrice = { code: 'usd', exponent: 2, amount: 500n, surchargePct: 5 };
    const chosen = new Map(ids.map((id) => [id, 2n] as const));
    const prices = new Map(ids.map((id) => [id, quote] as const));
    const names = new Map(ids.map((id, i) => [id, SEVERAL_NAMES[i]!] as const));
    return {
        tokens: new Map([...tokens, ...ids.map((id, i) => [id, meta(id, SEVERAL_NAMES[i]!, 'SLP_TOKEN_TYPE_FUNGIBLE')] as const)]),
        prices,
        genesis: new Map(
            ids.map((id) => [id, (borrowed.has(id) ? 'not-attributed' : 'attributed') as GenesisAttribution] as const),
        ),
        selection: chosen,
        windowPaying: {
            // Each item 2 × $5.00 + 5% at $0.00002 a XEC: 525,000 XEC.
            sats: 52_500_000n * BigInt(n),
            uri: `${ADDR}?amount=${(525_000 * n).toFixed(2)}`,
            selection: chosen,
            prices,
            names,
            borrowed,
            unit: 'usd',
            rate: { rate: PAY_RATE.rate, atMs: PAY_RATE.atMs },
            atMs: PAY_RATE.atMs,
        },
    };
}


/** Hostile content: no spaces anywhere, so nothing can wrap by accident. */
export const UNBROKEN = 'A'.repeat(178);

/** The widest name a record carries: 32 bytes of the widest Latin letter (`hostile-name`, and the wall's long-name screens). */
export const LONGEST_NAME = 'W'.repeat(32);
/** A stall named in CJK: ten ideographs, 30 of the record's 32 bytes — the record's binding CJK case — and a tagline in the same script (8f2). */
export const CJK_NAME = '山間清泉茶葉老舖子店';
/**
 * A name in Vietnamese capitals with stacked marks (8f2, the 8f2 critic's
 * P1-1): its marks reach past the face's ascent, so a box that holds a
 * line's slot cuts them and Ẫ reads Â. 29 bytes.
 */
export const STACKED_NAME = 'ẪỮỆ ẤẦẨ ẪỮỆ';
export const CJK_TAGLINE = '每週新鮮烘焙，用心包裝';
/**
 * The longest tagline a record carries: 64 bytes, the cap of tag `0x02`, of
 * the widest Latin letter and with no space, so it breaks only where the
 * sign lets it.
 */
export const LONGEST_TAGLINE = 'W'.repeat(64);
/** The CJK tagline at the cap: 21 ideographs, 63 bytes, the most a record holds. */
export const LONGEST_CJK_TAGLINE = '每週新鮮烘焙咖啡豆用心包裝當日寄出歡迎選購';
/**
 * The longest asked amount there is: an output's value is eight bytes, and
 * `formatXec` of the largest eight-byte number is
 * `184,467,440,737,095,516.15`, 26 characters of figure, with `from` beside
 * it (a partial). A covenant's asked amount is any size a stranger's gift
 * listing chooses (§10), so the face must hold this one: since 2026-10-13
 * its figure steps down a ladder and, past 21 characters, breaks after a
 * comma (`CARD_FIGURE_CEILINGS`). Before the ladder this fixture held 15
 * characters, the most the shipped faces seated at 390.
 */
export const LONGEST_ASK_SATS = 2n ** 64n - 1n;
/**
 * The longest quote figure the editor can write: an XEC quote at the
 * largest eight-byte amount, `184,467,440,737,095,516.15 XEC`, 30
 * characters — every unit `QUOTE_UNITS` writes at exponent 2 or 0, with
 * its sign, is 30 or fewer (`SAR`, `HK$`, `NT$`, `Fr.` and ` kr` 29, `đ`
 * 27). Its ` XEC` is the case the ladder's last rung guards: the space before
 * the unit is a break opportunity, and the figure's last group keeps the
 * unit on its own line (`.fig-end`). Before the ladder this fixture was
 * `SAR999,999,999.99`, 17 characters, the most the shipped faces seated at
 * 390 — and the probe's 360 pass found it spilling on every look.
 */
export const LONGEST_QUOTE: TokenPrice = { code: 'xec', exponent: 2, amount: 2n ** 64n - 1n };
/**
 * The largest sum a payment could realistically sign: under the whole XEC
 * supply, 21 trillion. A USD quote of $447,280,000.00 at a rate of
 * $0.0000213 a XEC composes `20,999,061,032,863.85` XEC, 21 characters with
 * its cents — the pay sheet's figure on the ladder's last single-line step
 * (`CARD_FIGURE_CEILINGS`). The rate is its own so the figure has cents;
 * stamped now, so the code is drawn and measured like `pay`'s.
 */
export const LONGEST_PAY_QUOTE: TokenPrice = { code: 'usd', exponent: 2, amount: 44_728_000_000n };
const LONGEST_PAY_RATE = { rate: scaleRate(0.0000213)!, atMs: Date.now() };

export const handlers: StallHandlers = {
    onOpenItem: () => {},
    onRetry: () => {},
    onCloseSheet: () => {},
    onOpenStall: () => {},
    onGoHome: () => {},
    onToggleDefault: () => {},
    onOpenPublish: () => {},
    onOpenDescribe: () => {},
    onClosePublish: () => {},
    onChangeFiat: () => {},
    onTogglePin: () => {},
    onChangeSort: () => {},
    onChangeFilter: () => {},
    // Without this the face paints a bare tile and the picture's own control
    // is measured on no screen at all — the probe would be green about a
    // button it never saw.
    onZoomIcon: () => {},
};

export const base = (over: Partial<StallView>): StallView => ({
    route: { kind: 'pubkey', pubkeyHex: PK, address: ADDR },
    overlay: { kind: 'idle' },
    tokens,
    address: ADDR,
    stallName: 'Riverside Goods',
    tagline: 'Fresh from the riverside \u2014 roasted and packed weekly',
    fiatCode: 'usd',
    fiatRate: scaleRate(7.02e-6),
    nftGroups: new Map([[NFT, GROUP]]),
    ...over,
});

/** Every catalogue row that has a token, which is what the fittings shop lists. */
export const DECOR_ROWS = SHIPPED_ATTACHMENTS.filter((row) => row.tokenId !== undefined);

/*
 * The one failure the app still attributes per host: the library ran out of
 * hosts, so it really did ask them all.
 *
 * Every row says `error` and not a mix (2026-09-20). The exhaustion the
 * library throws — "Error connecting to known Chronik instances" — carries
 * no `code` and no `cause`, having discarded each host's own error, so
 * `isTimeout` and `isPluginMissing` both answer false and `hostAttempts`
 * writes `error` for all three. A fixture with a `timeout` row measured a
 * verdict the app cannot produce.
 */
const HOSTS_DOWN = CHRONIK_HOSTS.map((host) => ({ host, result: 'error' as const }));

/**
 * The shop's book. Shared with the broadcast screens on purpose: the overlay
 * walks `listingsInShopOrder` over the same offers the storefront paints, so
 * two lists would let the two surfaces be measured against different shops.
 *
 * T1 twice: the grouped card (cheapest ask + count label) is a measured
 * surface, not a code path the probe skips. The last two rows are the measured
 * defect: `100,000,000` XEC squeezed every name to a letter per line on the
 * live origin. One whole-lot ask (no `from`, tier 2) and one partial (`from`
 * pushes it past every legible size, tier 3).
 */
const SHOP_OFFERS: StallOffer[] = [
    offer(T1, 0, 120_000n),
    offer(T1, 3, 150_000n),
    offer(T2, 1, 87_500n),
    offer(NFT, 2, 50_000n),
    offer(LONG, 4, 10_000_000_000n, { askedAtoms: 12n }),
    offer(LONGER, 5, 10_000_000_000n),
];

/**
 * A listing nobody can take: its covenant's minimum accept (13) is more than
 * the 12 atoms left on the UTXO — the remainder of a partial fill, as it is
 * met in the wild (`isUnbuyable`). Every surface paints "Not buyable" where
 * the figure goes, and nothing else there.
 */
const UNBUYABLE_OFFER: StallOffer = offer(T2, 1, 87_500n, { minAcceptedAtoms: 13n });

/** The wire the overlay is painted from. `parseBroadcastParams`' shape. */
const bc = (
    preset: BroadcastParams['preset'],
    mode: BroadcastParams['mode'],
    transparent = false,
    cards: BroadcastParams['cards'] = 'listings',
    side: BroadcastParams['side'] = 'right',
    edge: BroadcastParams['edge'] = 'bottom',
): BroadcastParams => ({ preset, mode, transparent, cards, side, edge });

/** One listing on the wall's Cycle card, a partial (so it carries `from`), at `sats`. */
const cycleListing = (sats: bigint): StallView =>
    base({
        fetch: { kind: 'offers', offers: [offer(T1, 0, sats)] },
        window: { show: 'listings', mode: 'cycle', payCode: true, turn: 'none', touch: false },
        readAtMs: 1_756_400_000_000 - 120_000,
    });

/** One quote on the wall's Cycle card, on the quotes rail, at `price`. */
const cycleQuote = (price: TokenPrice): StallView =>
    base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        window: { show: 'quotes', mode: 'cycle', payCode: true, turn: 'none', touch: false },
        prices: new Map([[T1, price]]),
        descriptions: QUOTE_WORDS,
        genesis: GENESIS,
        quoteTimes: QUOTE_TIMES,
        readAtMs: 1_756_400_000_000 - 120_000,
        shopTab: 'quotes',
    });

export const SCREENS: Record<string, StallView> = {
    offers: base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        // The P9 surfaces, measured where they live: the seller's notice
        // above the shelves, and one seller-named shelf pulling T1 out of
        // the type sections under its own heading.
        announcement: 'Back on the 10th — orders ship then',
        shelves: new Map([[T1, 'Morning roast']]),
        // One quote on a listed token (which earns the Shop row its pointer)
        // and one on a token this stall does not list — the case the rail
        // exists for, and the one a listing-gated set would have hidden.
        prices: QUOTES,
        // Both naming shapes on one screen: an item titled by the seller's
        // own words with the token's name under it, and one with no words at
        // all that falls back to the token's name and says so. `QUOTED` is
        // another wallet's mint, so that row is initials plus one more line.
        descriptions: QUOTE_WORDS,
        genesis: GENESIS,
    }),
    /*
     * The address box in its other state (the 8g1 critic's P1-1): the
     * clipboard refused the copy, so the sign shows the whole string at
     * every width (`addressLine`'s `shown`, `data-copied="shown"`) — on a
     * phone the 48 characters where `shortAddress`' glance stood. No view
     * field reaches it: a press does, so the probe and the showroom stage
     * it on the painted tree (`STAGED`, below). The shop's book, so the
     * rows a wider sign could crowd are on the screen. Geometry only.
     */
    'addr-shown': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        prices: QUOTES,
        descriptions: QUOTE_WORDS,
        genesis: GENESIS,
    }),
    'item-listing': base({
        fetch: {
            kind: 'offers',
            offers: [offer(T1, 0, 120_000n), offer(T1, 3, 150_000n), offer(T2, 1, 87_500n), offer(FIRMA_WITHHELD, 0, 100_000n)],
        },
        overlay: { kind: 'item', tokenId: T1, rail: 'listings' },
        // The longest thing a seller can publish, with no spaces to break on.
        descriptions: new Map([[T1, UNBROKEN]]),
    }),
    /*
     * The face's picture at full size (2026-09-18). Its own screen because
     * it is its own scrim: the probe measures inside the scrim it finds, so
     * without this the surface would never be measured at all — the same
     * reason the two record sheets are two screens rather than one.
     */
    'item-zoom': base({
        fetch: {
            kind: 'offers',
            offers: [offer(T1, 0, 120_000n), offer(T2, 1, 87_500n)],
        },
        overlay: { kind: 'item', tokenId: T1, rail: 'listings', zoom: true },
    }),
    /*
     * An unbuyable offer beside a buyable one (2026-09-23; since 2026-09-24
     * the unbuyable one paints the label alone). T2's only listing asks a
     * minimum take its remainder cannot meet (`isUnbuyable`); T1's is an
     * ordinary ask, so the label stands in a row beside a real figure. The
     * probe's `an-unbuyable-offer-paints-no-figure-and-says-so` reads it here,
     * on the face below, on the two wall screens and on the overlay's two.
     */
    unbuyable: base({
        fetch: { kind: 'offers', offers: [offer(T1, 0, 120_000n, { askedAtoms: 12n }), UNBUYABLE_OFFER] },
    }),
    'item-unbuyable': base({
        fetch: { kind: 'offers', offers: [offer(T1, 0, 120_000n, { askedAtoms: 12n }), UNBUYABLE_OFFER] },
        overlay: { kind: 'item', tokenId: T2, rail: 'listings' },
    }),
    /*
     * The face's fold line (the critic, 2026-09-24): a token with one
     * buyable and one unbuyable offer, so the face paints the buyable figure
     * and its fold lists both — the unbuyable one as "Not buyable". An
     * all-unbuyable token's face returns before the fold's listings block,
     * so `item-unbuyable` above never painted this line.
     */
    'item-unbuyable-fold': base({
        fetch: {
            kind: 'offers',
            offers: [offer(T1, 0, 120_000n, { askedAtoms: 12n }), offer(T1, 6, 90_000n, { minAcceptedAtoms: 13n })],
        },
        overlay: { kind: 'item', tokenId: T1, rail: 'listings' },
    }),
    /*
     * The two record sheets, one screen each. They were one screen while they
     * were one sheet; splitting them is not a rename with a spare — the name
     * sheet carries the segmented look, the decoration chips and the stall
     * record's own hex, and the describe sheet carries the token picker, the
     * quote field and the read-back line. Measuring one would certify neither.
     */
    'publish-name': base({
        fetch: { kind: 'offers', offers: [offer(T1, 0, 120_000n)] },
        overlay: { kind: 'publish-name' },
        // A held decoration, so the chips paint pressed and unpressed rather
        // than one state of the control the probe never sees.
        recordFlags: 0b1,
        announcement: 'Back on the 10th — orders ship then',
    }),
    describe: base({
        fetch: { kind: 'offers', offers: [offer(T1, 0, 120_000n)] },
        overlay: { kind: 'describe' },
        descriptions: new Map([[T1, 'Existing words']]),
        shelves: new Map([[T1, 'Morning roast']]),
        // The selected token is this stall's own and is listed here, so the
        // two-prices warning is on screen — one warning line, painted, rather
        // than three selectors matching nothing. The paste field below the
        // picker mounts on every describe sheet.
        genesis: GENESIS,
        // A published price, so the editor's read-back line
        // (`[data-role="seller-price"]`) is a node the probe can see. Without
        // one it stays `hidden` and the only screen carrying that figure was
        // never measured.
        prices: new Map([[T1, { code: 'usd', exponent: 2, amount: 1250n }]]),
    }),
    /*
     * The pay sheet, at the two states its figure can be in.
     *
     * `pay` is the ordinary one: a USD quote, a frozen rate, the derived XEC
     * the wallet signs, the rate line and the scan code. `pay-xec` is the
     * seller's own unit — no rate anywhere in it, so no rate line, no refresh
     * and nothing that can go stale. Both sit over the shop, because the
     * sheet's own figures must be measured against the scrim and the stall
     * behind it.
     */
    pay: base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        prices: QUOTES,
        descriptions: QUOTE_WORDS,
        genesis: GENESIS,
        // The dated half of the pair: this card carries the age line and the
        // line saying the stall minted the token.
        quoteTimes: QUOTE_TIMES,
        overlay: { kind: 'pay', tokenId: T1 },
        payRate: PAY_RATE,
    }),
    'pay-xec': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        prices: QUOTES,
        descriptions: QUOTE_WORDS,
        // The other half of the pair: no words, another wallet's mint. The
        // head falls back to the token's name and the card carries the line
        // saying the token was not minted here.
        genesis: GENESIS,
        // The same map, which holds no entry for this token: the undated card
        // is a card one line shorter, measured beside the dated one.
        quoteTimes: QUOTE_TIMES,
        overlay: { kind: 'pay', tokenId: QUOTED },
    }),
    /*
     * Two more states of the same sheet, staged from the view because only a
     * press produces them: the valve's "moved" outcome, where the control
     * restates the figure it will open and a line says the rate jumped past
     * the seller's tolerance; and a quote under the dust floor, where no link
     * is composed and one line says which way out there is. Geometry only —
     * every ground on them is `pay`'s.
     */
    'pay-moved': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        prices: QUOTES,
        descriptions: QUOTE_WORDS,
        genesis: GENESIS,
        quoteTimes: QUOTE_TIMES,
        overlay: { kind: 'pay', tokenId: T1 },
        payRate: PAY_RATE,
        payRateOutcome: 'moved',
    }),
    /*
     * "Pay several" (2026-09-21): the strip open under the rail tabs with two
     * items chosen on the USD quote, so the XEC quote paints as an "apart"
     * row with its own Pay; the row's stepper; the strip's total under its
     * own protected role. `pay-several-ask` is the remove question in place
     * of a stepper (geometry only: its two words are the row's own ink);
     * `pay-several` is the sheet over the lot, with the frozen rate.
     */
    'pay-several-strip': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        prices: QUOTES,
        descriptions: QUOTE_WORDS,
        genesis: GENESIS,
        quoteTimes: QUOTE_TIMES,
        shopTab: 'quotes',
        selectionOpen: true,
        selection: new Map([[T1, 2n]]),
    }),
    /*
     * The strip with an XEC total: the memo's D15 condition (680–1280 with a
     * long total) — the probe measures 390 and 1280; 680–800 is measured by
     * hand (`private/MANUAL-CHECKS.md`).
     */
    'pay-several-strip-xec': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        prices: QUOTES,
        descriptions: QUOTE_WORDS,
        genesis: GENESIS,
        shopTab: 'quotes',
        selectionOpen: true,
        selection: new Map([[QUOTED, 3n]]),
    }),
    /*
     * The strip at its longest (round 3, the critic's P2-2, pre-existing): an
     * eight-byte XEC quote chosen once, so the strip's total and the row's
     * selection line both carry 30 characters of figure. On main the total
     * ran off the strip's left edge at 360 (its leading digits gone) and was
     * cut by the tray at 390 on Neo and Rural, and the line ran under the
     * stepper on Neo. Both break after a comma past 21 characters now, and
     * the total loses its tail before its head. Geometry only:
     * `pay-several-strip-xec`'s ink.
     */
    'pay-several-strip-long-figure': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        prices: new Map([
            [T1, LONGEST_QUOTE],
            [QUOTED, { code: 'xec', exponent: 2, amount: 500_000n }],
        ]),
        descriptions: QUOTE_WORDS,
        genesis: GENESIS,
        quoteTimes: QUOTE_TIMES,
        shopTab: 'quotes',
        selectionOpen: true,
        selection: new Map([[T1, 1n]]),
    }),
    /*
     * The strip's total either side of where it breaks (round 4, the
     * critic's P3-4): at 360 a total of 18 to 21 characters wrapped before
     * its unit and left ` XEC` alone on its line (Neo and Rural; at 390 from
     * 20). Broken after a comma from 18 (`STRIP_BREAK_CHARS`), the last group
     * and the unit together. `pay-several-strip`'s ink.
     */
    'pay-several-strip-18': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        prices: new Map([
            [T1, { code: 'xec', exponent: 2, amount: 10_000_000_000n }],
            [QUOTED, { code: 'xec', exponent: 2, amount: 500_000n }],
        ]),
        descriptions: QUOTE_WORDS,
        genesis: GENESIS,
        quoteTimes: QUOTE_TIMES,
        shopTab: 'quotes',
        selectionOpen: true,
        selection: new Map([[T1, 1n]]),
    }),
    'pay-several-strip-21': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        prices: new Map([
            [T1, { code: 'xec', exponent: 2, amount: 1_000_000_000_000n }],
            [QUOTED, { code: 'xec', exponent: 2, amount: 500_000n }],
        ]),
        descriptions: QUOTE_WORDS,
        genesis: GENESIS,
        quoteTimes: QUOTE_TIMES,
        shopTab: 'quotes',
        selectionOpen: true,
        selection: new Map([[T1, 1n]]),
    }),
    'pay-several-ask': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        prices: QUOTES,
        descriptions: QUOTE_WORDS,
        genesis: GENESIS,
        shopTab: 'quotes',
        selectionOpen: true,
        selection: new Map([[T1, 1n]]),
        selectionAsk: { kind: 'remove', tokenId: T1 },
    }),
    'pay-several': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        prices: QUOTES,
        descriptions: QUOTE_WORDS,
        genesis: GENESIS,
        quoteTimes: QUOTE_TIMES,
        selectionOpen: true,
        selection: new Map([[T1, 2n]]),
        overlay: { kind: 'pay-several' },
        payRate: PAY_RATE,
    }),
    /*
     * The two pay sheets at long figures (2026-10-13, the 8g1 critic's
     * P2-3): the figure the wallet signs has the face's ladder now
     * (`CARD_FIGURE_CEILINGS`), and no fixture had ever put a long one on
     * either sheet. `pay-long-figure` is the largest realistic sum
     * (`LONGEST_PAY_QUOTE`, 21 characters, one line on the ladder's last
     * single-line step); `pay-several-long-figure` is two XEC quotes at the
     * largest eight-byte amount, so the figure (25 characters), both lines
     * (30 each) and the total are past the last ceiling and break after a
     * comma — the longest figures the sheet composes from records the
     * editor can write. The second item is another wallet's mint, so its
     * line carries the borrowed-id warning under it. Geometry only: their
     * ink is `pay`'s and `pay-several`'s.
     */
    'pay-long-figure': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        prices: new Map([[T1, LONGEST_PAY_QUOTE]]),
        descriptions: QUOTE_WORDS,
        genesis: GENESIS,
        quoteTimes: QUOTE_TIMES,
        overlay: { kind: 'pay', tokenId: T1 },
        payRate: LONGEST_PAY_RATE,
    }),
    /*
     * The pay sheet over the eight-byte XEC quote (round 4, the critic's
     * P2-2): the one pay sheet whose figure, the XEC the wallet signs,
     * breaks after its commas (26 characters, past the ladder's last
     * ceiling). On the contrast plan, every piece of it read for its ink
     * (`BROKEN_FIGURE_SCREENS` in the runner).
     */
    'pay-longest-figure': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        prices: new Map([[T1, LONGEST_QUOTE]]),
        descriptions: QUOTE_WORDS,
        genesis: GENESIS,
        quoteTimes: QUOTE_TIMES,
        overlay: { kind: 'pay', tokenId: T1 },
    }),
    'pay-several-long-figure': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        prices: new Map([
            [T1, LONGEST_QUOTE],
            [QUOTED, LONGEST_QUOTE],
        ]),
        descriptions: QUOTE_WORDS,
        genesis: GENESIS,
        quoteTimes: QUOTE_TIMES,
        selectionOpen: true,
        selection: new Map([
            [T1, 1n],
            [QUOTED, 1n],
        ]),
        overlay: { kind: 'pay-several' },
    }),
    /*
     * Pay several over the eight-byte XEC quote, both items this stall's
     * own (round 4, the critic's P2-2): its figure, its two lines and its
     * total break after their commas, and it is on the contrast plan, every
     * piece read for its ink. Not `pay-several-long-figure`, whose second
     * item is another wallet's mint: the borrowed-id warning stands inside
     * `pay-lines` on a ground of its own, and the money box read, which reads
     * that container whole in its own ink, read it at 2.94:1 on Rural worn —
     * against no glyph of that ink (a reading of the container, left as it
     * was: that screen stays geometry only).
     */
    'pay-several-longest-figure': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        prices: new Map([
            [T1, LONGEST_QUOTE],
            [QUOTED, LONGEST_QUOTE],
        ]),
        descriptions: QUOTE_WORDS,
        genesis: new Map<string, GenesisAttribution>([
            [T1, 'attributed'],
            [QUOTED, 'attributed'],
        ]),
        quoteTimes: QUOTE_TIMES,
        selectionOpen: true,
        selection: new Map([
            [T1, 1n],
            [QUOTED, 1n],
        ]),
        overlay: { kind: 'pay-several' },
    }),
    'pay-dust': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        // One satoshi of XEC: no rate involved, and under `DUST_SATS`.
        prices: new Map<string, TokenPrice>([[T1, { code: 'xec', exponent: 2, amount: 1n }]]),
        descriptions: QUOTE_WORDS,
        genesis: GENESIS,
        quoteTimes: QUOTE_TIMES,
        overlay: { kind: 'pay', tokenId: T1 },
    }),
    /*
     * The pay sheet over a quote that left the stall (8e2, item 11): a
     * press found the record gone (`payRecordMoved` names the token, and
     * `prices` holds none for it), so the sheet is its title, the one
     * sentence in `pay-lost` and its close. That sentence — "no longer on
     * the stall … no wallet was opened" — is one of the honest-display
     * lines (`layout/honestDisplay.ts`), and no other screen paints it.
     * The shop behind it is on the quotes rail, so the screen mounts the
     * seller's own figure the pay-screens audit asks of a `pay` name.
     */
    'pay-gone': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        prices: QUOTES,
        descriptions: QUOTE_WORDS,
        genesis: GENESIS,
        quoteTimes: QUOTE_TIMES,
        shopTab: 'quotes',
        overlay: { kind: 'pay', tokenId: T2 },
        payRecordMoved: [T2],
    }),
    /*
     * The quote rail with one quote in each of the six currencies whose sign a
     * served face may not draw (`SIGN_QUOTES`): an empty book, the rail on the
     * quotes, and every row's figure is `seller-price` with the sign beside
     * its digits. Named `quotes-` so the pay-screens audit binds.
     * On the state and geometry-only lists: the rows are `offers`' quote rows
     * and the ink is theirs; what the screen is here for is the glyph's width.
     */
    'quotes-signs': base({
        fetch: { kind: 'empty' },
        ...signQuoteView(),
        shopTab: 'quotes',
    }),
    /*
     * The pay sheet over a quote in rupees: the seller's figure with ₹ in it,
     * the rate row, the XEC the wallet signs. Geometry only, like `pay`'s
     * other states. Named `pay-` so the pay-screens audit binds.
     */
    'pay-inr': base({
        fetch: { kind: 'empty' },
        ...signQuoteView(),
        shopTab: 'quotes',
        overlay: { kind: 'pay', tokenId: SIGN_QUOTES[0].id },
        // About 0.0017 rupees a XEC: ₹499 is some 290,000 XEC.
        payRate: { rate: scaleRate(0.0017)!, atMs: Date.now() },
    }),
    /*
     * The item tag on the poster sheet: one quoted item's print page — the
     * ink-on-white tile, the name, the chip, the figure under the seller's
     * own role, the words, the code that opens this page at the item — with
     * the PNG block under it. Named `pay-` so the pay-screens audit binds;
     * the positive assertion (the page mounts `seller-price`) is the render
     * test's, since the audit reads the whole document and the shop behind
     * the scrim carries quotes too. On the state and geometry-only lists:
     * the sheet's decorations sit outside the scrim, so every worn variant
     * measures the same tree, and its ground is black on white, sampled on
     * the record sheets already.
     */
    'pay-tag': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        prices: QUOTES,
        descriptions: QUOTE_WORDS,
        genesis: GENESIS,
        quoteTimes: QUOTE_TIMES,
        overlay: { kind: 'poster', format: 'tag', tokenId: T1 },
    }),
    /*
     * The quote rail's face: the seller's words as the title, the genesis
     * name under it, the figure in the unit they wrote, Pay, and the fold.
     * In-flow where the rows were, no scrim. The listings' face is
     * `item-listing`. Its pointer to the other rail stands on the stall's
     * ground, so it is sampled on Neo worn under the rain (`RAIN_JOBS`).
     */
    'item-quote': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        prices: QUOTES,
        descriptions: QUOTE_WORDS,
        genesis: GENESIS,
        quoteTimes: QUOTE_TIMES,
        overlay: { kind: 'item', tokenId: T1, rail: 'quotes' },
    }),
    /*
     * The two faces with long figures (the 8g1 critic's P2-1 and P2-3). The
     * rows' `100,000,000` stress never reached the face. A listing's asked
     * amount is the covenant's, `from` beside it (`LONGEST_ASK_SATS`, the
     * largest eight-byte amount); a quote's is the seller's, the longest
     * the editor writes (`LONGEST_QUOTE`, an XEC quote at the same amount).
     * Both are past the face's last ceiling (`CARD_FIGURE_CEILINGS`), so
     * they stand on its last rung, breaking after a comma at a phone's
     * width. Geometry only: their ink is `item-listing`'s and
     * `item-quote`'s.
     */
    'item-listing-long-figure': base({
        fetch: { kind: 'offers', offers: [offer(T1, 0, LONGEST_ASK_SATS), offer(T2, 1, 87_500n)] },
        overlay: { kind: 'item', tokenId: T1, rail: 'listings' },
    }),
    'item-quote-long-figure': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        prices: new Map([[T1, LONGEST_QUOTE]]),
        descriptions: QUOTE_WORDS,
        genesis: GENESIS,
        quoteTimes: QUOTE_TIMES,
        overlay: { kind: 'item', tokenId: T1, rail: 'quotes' },
    }),
    /*
     * The card ladder's every step at its widest (round 2, the critic's
     * P2-2): one screen per step and surface, so the cuts are held by the
     * probe on every look rather than by one hand measurement. Each figure is
     * the widest its step holds (`CARD_FIGURE_CEILINGS`):
     * - the listing face, which also carries the "You pay" row at the same
     *   tier: 14, 17 and 21 characters of asked amount;
     * - the quote face, in the units whose signs the faces do not draw, so
     *   the machine's fallback paints them at about 1em: `₩9,999,999,999`
     *   (14), `元9,999,999,999.99` (17), `元9,999,999,999,999.99` (21);
     * - the pay sheet, an XEC quote: 14 and 17 characters (21 and past it
     *   are `pay-long-figure` and `pay-several-long-figure`);
     * - Pay several with a 17- and an 18-character line (a line's own row
     *   starts at 18).
     * Every row behind them is on tier 0 or the last tier, so Rural's rows
     * at 360 (their own ladder's question) are not in the way. Geometry
     * only: their ink is `item-listing`'s, `item-quote`'s, `pay`'s and
     * `pay-several`'s.
     */
    'item-listing-figure-14': base({
        fetch: { kind: 'offers', offers: [offer(T1, 0, 99_999_999_999n), offer(T2, 1, 87_500n)] },
        overlay: { kind: 'item', tokenId: T1, rail: 'listings' },
    }),
    'item-listing-figure-17': base({
        fetch: { kind: 'offers', offers: [offer(T1, 0, 9_999_999_999_999n), offer(T2, 1, 87_500n)] },
        overlay: { kind: 'item', tokenId: T1, rail: 'listings' },
    }),
    'item-listing-figure-21': base({
        fetch: { kind: 'offers', offers: [offer(T1, 0, 9_999_999_999_999_999n), offer(T2, 1, 87_500n)] },
        overlay: { kind: 'item', tokenId: T1, rail: 'listings' },
    }),
    'item-quote-figure-14': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        prices: new Map([[T1, { code: 'krw', exponent: 0, amount: 9_999_999_999n }]]),
        descriptions: QUOTE_WORDS,
        genesis: GENESIS,
        quoteTimes: QUOTE_TIMES,
        overlay: { kind: 'item', tokenId: T1, rail: 'quotes' },
    }),
    'item-quote-figure-17': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        prices: new Map([[T1, { code: 'cny', exponent: 2, amount: 999_999_999_999n }]]),
        descriptions: QUOTE_WORDS,
        genesis: GENESIS,
        quoteTimes: QUOTE_TIMES,
        overlay: { kind: 'item', tokenId: T1, rail: 'quotes' },
    }),
    'item-quote-figure-21': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        prices: new Map([[T1, { code: 'cny', exponent: 2, amount: 999_999_999_999_999n }]]),
        descriptions: QUOTE_WORDS,
        genesis: GENESIS,
        quoteTimes: QUOTE_TIMES,
        overlay: { kind: 'item', tokenId: T1, rail: 'quotes' },
    }),
    'pay-figure-14': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        prices: new Map([[T1, { code: 'xec', exponent: 2, amount: 99_999_999_999n }]]),
        descriptions: QUOTE_WORDS,
        genesis: GENESIS,
        quoteTimes: QUOTE_TIMES,
        overlay: { kind: 'pay', tokenId: T1 },
    }),
    'pay-figure-17': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        prices: new Map([[T1, { code: 'xec', exponent: 2, amount: 9_999_999_999_999n }]]),
        descriptions: QUOTE_WORDS,
        genesis: GENESIS,
        quoteTimes: QUOTE_TIMES,
        overlay: { kind: 'pay', tokenId: T1 },
    }),
    'pay-several-figure-lines': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        prices: new Map([
            [T1, { code: 'xec', exponent: 2, amount: 1_000_000_000n }],
            [QUOTED, { code: 'xec', exponent: 2, amount: 10_000_000_000n }],
        ]),
        descriptions: QUOTE_WORDS,
        genesis: GENESIS,
        quoteTimes: QUOTE_TIMES,
        selectionOpen: true,
        selection: new Map([
            [T1, 1n],
            [QUOTED, 1n],
        ]),
        overlay: { kind: 'pay-several' },
    }),
    /*
     * Rows at the longest figures (round 2, the critic's P2-6): an
     * eight-byte asked amount on a listing row and an eight-byte XEC quote
     * on a quote row. They re-flow on the rows' last rung and break after a
     * comma (`rowFigure`); before, they grew to the left and cut their
     * leading digits at 360 on every look and at 390 on Neo, Rural, and for
     * the quote on every look. `row-longest-figure` is geometry only
     * (`offers`' ink); `quote-row-longest-figure` is sampled by the contrast
     * pass (round 3, the critic's P2-1): it is the one screen whose broken
     * figure's every digit is read for its ink.
     */
    'row-longest-figure': base({
        fetch: { kind: 'offers', offers: [offer(T1, 0, LONGEST_ASK_SATS), offer(T2, 1, 87_500n)] },
    }),
    'quote-row-longest-figure': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        prices: new Map([
            [T1, LONGEST_QUOTE],
            [QUOTED, { code: 'xec', exponent: 2, amount: 500_000n, surchargePct: 5 }],
        ]),
        descriptions: QUOTE_WORDS,
        genesis: GENESIS,
        quoteTimes: QUOTE_TIMES,
        shopTab: 'quotes',
    }),
    /*
     * Rows on either side of the re-flow's cut (round 3, the critic's P1-1;
     * `ROW_REFLOW_LISTING_CHARS` 17, `ROW_REFLOW_QUOTE_CHARS` 18, counted as
     * the row prints the figure). Under it, ordinary prices keep main's row
     * at every width — no row of their own at a desk, no extra height, no
     * `role="img"`: `quote-row-1m` (a 1,000,000.00 XEC quote, 16 characters,
     * about $20–30) and `row-15-16` (listings of 15 and 16 characters). At it:
     * `row-17` and `quote-row-18` (a 100,000,000.00 XEC quote) re-flow
     * without a break, and `row-21` (the whole supply with its cents) is the
     * first listing that breaks after a comma (`ROW_BREAK_CHARS`). Geometry
     * only: the ink is `offers`' and `plugin-missing-quotes`'.
     */
    'quote-row-1m': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        prices: new Map([
            [T1, { code: 'xec', exponent: 2, amount: 100_000_000n }],
            [QUOTED, { code: 'xec', exponent: 2, amount: 500_000n, surchargePct: 5 }],
        ]),
        descriptions: QUOTE_WORDS,
        genesis: GENESIS,
        quoteTimes: QUOTE_TIMES,
        shopTab: 'quotes',
    }),
    'quote-row-18': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        prices: new Map([
            [T1, { code: 'xec', exponent: 2, amount: 10_000_000_000n }],
            [QUOTED, { code: 'xec', exponent: 2, amount: 500_000n, surchargePct: 5 }],
        ]),
        descriptions: QUOTE_WORDS,
        genesis: GENESIS,
        quoteTimes: QUOTE_TIMES,
        shopTab: 'quotes',
    }),
    'row-15-16': base({
        fetch: { kind: 'offers', offers: [offer(T1, 0, 100_000_000_050n), offer(T2, 1, 1_000_000_000_050n)] },
    }),
    'row-17': base({
        fetch: { kind: 'offers', offers: [offer(T1, 0, 9_999_999_999_999n), offer(T2, 1, 87_500n)] },
    }),
    'row-21': base({
        fetch: { kind: 'offers', offers: [offer(T1, 0, 2_099_906_103_286_385n), offer(T2, 1, 87_500n)] },
    }),
    /*
     * The shop that sells decorations, which is the one page where the
     * Decorations section and its per-look runs are the only dividers there
     * are — a single section prints no section heading, so nothing else on
     * this page tells a buyer what fits what.
     *
     * Built from the shipped catalogue rather than from pasted ids, so it
     * follows the table instead of drifting from it.
     */
    decor: base({
        fetch: {
            kind: 'offers',
            offers: DECOR_ROWS.map((row, i) => offer(row.tokenId!, i, 5_000n * BigInt(i + 1))),
        },
        tokens: new Map(
            DECOR_ROWS.map((row) => [
                row.tokenId!,
                meta(row.tokenId!, row.label, 'ALP_TOKEN_TYPE_STANDARD'),
            ]),
        ),
    }),
    // The announcement on the empty shop, where "away until Monday" is most
    // of the explanation a visitor gets.
    // Quotes are not gated on listings, so the section paints here too — a
    // stall with nothing listed and a price tag is what this rail is for.
    empty: base({
        fetch: { kind: 'empty' },
        announcement: 'Away until Monday',
        prices: QUOTES,
    }),
    door: {
        route: { kind: 'home' },
        overlay: { kind: 'idle' },
        tokens: new Map(),
        // A door with pins is the superset screen: an empty pinned list
        // paints nothing, so the bare door needs no fixture of its own.
        // Twelve — the cap — so the probe measures the door at its fullest:
        // the pinned panel scrolls its own rows rather than stretching the
        // page, and only a full panel can prove that.
        pinnedStalls: [
            ADDR,
            PK,
            ...Array.from({ length: 10 }, (_, i) => `02${(0xb0 + i).toString(16).repeat(32)}`),
        ],
        // Two pins with the name they were made with, ten without: both rows
        // paint, and the probe measures the named one's ink.
        pinnedNames: new Map([
            [ADDR, 'Riverside Goods'],
            [PK, 'Harbour Prints'],
        ]),
    },
    /*
     * One item, nothing written: the sparse chrome at full strength — both
     * invitations and the look's closing motif. The probe measures the
     * motif's absolute children against every protected box here.
     */
    sparse: base({
        fetch: { kind: 'offers', offers: [offer(T1, 0, 120_000n)] },
        tagline: undefined,
        announcement: undefined,
        shelves: undefined,
    }),
    /*
     * The same stall reached by the seller's own paste (`pasted`), with no
     * announcement: the one road that paints the notice invite, a button on
     * the stall's bare ground (the critic's fourth pass, 2026-09-24: under
     * Neo's rain its words read 1.08:1 and no fixture painted it). Sampled
     * on Neo worn (`RAIN_JOBS`).
     */
    'sparse-pasted': base({
        fetch: { kind: 'offers', offers: [offer(T1, 0, 120_000n)] },
        tagline: undefined,
        announcement: undefined,
        shelves: undefined,
        pasted: true,
    }),
    /*
     * The seller's first screen after naming the stall and before listing
     * (the 8g1 critic's P2-4): an empty book, reached by their own paste
     * (`pasted`), with no tagline and no announcement — so the sign carries
     * the empty stall's state line (`EMPTY_SUB`) and the tagline invite
     * together, and the body the notice invite over the empty block. No
     * other screen painted the invites on the empty stall. Geometry only:
     * the notice invite's words are sampled on `sparse-pasted` where a rain
     * falls behind them, and the empty block's ink on `empty`.
     */
    'empty-pasted': base({
        fetch: { kind: 'empty' },
        tagline: undefined,
        announcement: undefined,
        pasted: true,
    }),
    /* The other two panels of the shell. One panel in the DOM at a time. */
    studio: base({ fetch: { kind: 'empty' }, panel: 'studio' }),
    /*
     * The items card with a row of every shape the glance line takes (owner,
     * 2026-09-25): two tokens of one name and one ticker told apart by their
     * short ids, one with no ticker (the short id alone), an NFT, and one
     * whose genesis this page never read (no id line — the title is the id).
     * The rows' second line is measured for spills, covers and cuts at every
     * width; the card's hint and its guide link paint only here.
     */
    'studio-items': base({
        fetch: { kind: 'empty' },
        panel: 'studio',
        tokens: new Map([
            ...tokens,
            [STUDIO_TWIN_A, { ...meta(STUDIO_TWIN_A, 'Honey jar', 'SLP_TOKEN_TYPE_FUNGIBLE'), ticker: 'HONEY' }],
            [STUDIO_TWIN_B, { ...meta(STUDIO_TWIN_B, 'Honey jar', 'SLP_TOKEN_TYPE_FUNGIBLE'), ticker: 'HONEY' }],
            [STUDIO_NO_TICKER, { ...meta(STUDIO_NO_TICKER, 'Beeswax candle', 'SLP_TOKEN_TYPE_FUNGIBLE'), ticker: '' }],
        ]),
        descriptions: new Map([
            [STUDIO_TWIN_A, 'A jar from the spring flowers'],
            [STUDIO_TWIN_B, 'A jar from the summer lime trees'],
            [STUDIO_NO_TICKER, 'Hand-dipped, one hour of burning'],
            [NFT, 'One of one'],
            [STUDIO_NO_GENESIS, 'Words on a token this page never read'],
        ]),
        // One twin carries a quote and a shelf, so the id line is measured in
        // the tallest row the card paints: the quote figure under
        // `seller-price` and the shelf beside the words (the critic,
        // 2026-09-26).
        prices: new Map<string, TokenPrice>([[STUDIO_TWIN_A, { code: 'usd', exponent: 2, amount: 1250n }]]),
        shelves: new Map([[STUDIO_TWIN_A, 'Spring shelf']]),
    }),
    /*
     * Both lists at once, because they are two different surfaces: the ring on
     * the page clock and the walk on the chain's, each with a row whose detail
     * the probe opens (a closed `<details>` lays out nothing, so every rule
     * below it would pass vacuously on exactly the content it guards).
     *
     * One event carries `sats` and one does not: `[data-role="receipt-amount"]`
     * is in `PROTECTED` and `CONTRAST_TEXT`, and a selector matching nothing in
     * the fixture is a guard that measures nothing. The walked rows carry the
     * 64-character txid in an open fold at 390px, which is the width the
     * label-wrap incident was measured at.
     */
    activity: base({
        fetch: { kind: 'offers', offers: [offer(T1, 0, 120_000n)] },
        panel: 'activity',
        watchedSinceMs: TRIED_AT_MS,
        activityGaps: 1,
        events: [
            {
                txid: 'ab'.repeat(32),
                kind: 'book',
                seenAtMs: TRIED_AT_MS,
                book: 'consumed',
                status: { kind: 'finalized', avalanche: true },
            },
            // Two rows wearing a tile: a description naming its token (the
            // picture, or letters until it lands) and a payment claim on a
            // token the seller never named (letters). The tile rule measures
            // both against the line beside them.
            {
                txid: 'ac'.repeat(32),
                kind: 'description',
                seenAtMs: TRIED_AT_MS - 30_000,
                tokenId: T1,
                recordAuthority: 'stalls',
            },
            {
                txid: 'ad'.repeat(32),
                kind: 'payment',
                seenAtMs: TRIED_AT_MS - 45_000,
                sats: 1_000_000n,
                payment: { kind: 'item' as const, tokenId: T2, quantity: 2n },
            },
            // The widest letters a tile gets, "WM" (the critic, 2026-09-24:
            // the 24px tile clips, and its letters are 11px now;
            // `a-tile-shows-its-letters-whole`), on a payment row of its own.
            // An ADDED row, which makes the list longer: a longer list is a
            // real stall's, and when this row first moved a line onto Neo's
            // rain at 2.7:1 the fixture was bent around it for a day — the
            // finding was the rain, and it is never answered by moving a
            // row: the rows wear an outline over the rain now
            // (`a-line-on-the-ground-reads-wherever-a-drop-falls`).
            {
                txid: 'af'.repeat(32),
                kind: 'payment',
                seenAtMs: TRIED_AT_MS - 50_000,
                sats: 1_000_000n,
                payment: { kind: 'item' as const, tokenId: WIDE_INITIALS, quantity: 1n },
            },
            {
                txid: 'cd'.repeat(32),
                kind: 'settings',
                seenAtMs: TRIED_AT_MS - 60_000,
                status: { kind: 'in-block', height: 800_123 },
            },
            // The receipt: an amount big enough to be a real figure on a
            // narrow screen, beside a row that has none.
            {
                txid: 'ee'.repeat(32),
                kind: 'other',
                seenAtMs: TRIED_AT_MS - 120_000,
                sats: 10_000_000_000n,
            },
            /*
             * A direct payment with the one thing a seller cannot otherwise
             * read: the address it was spent from. Its own row in the fold,
             * both grid tracks wide like the txid above it, because an address
             * beside a label at 390px is the wrap the label rule was written
             * for. It carries a copy control and no link — this panel is
             * public, and nothing on it may compose a payment.
             */
            {
                txid: '99'.repeat(32),
                kind: 'payment',
                seenAtMs: TRIED_AT_MS - 150_000,
                sats: 25_000_000n,
                payment: { kind: 'item' as const, tokenId: T1, quantity: 2n },
                // hash160 of the dummy key 02·bb×32 — nobody's, and decodable.
                payerAddress: 'ecash:qr9w00zzq6s88t3e97h3ktsuj32y3m87t5wzyf3kzq',
                status: { kind: 'finalized', avalanche: true },
            },
            { txid: '77'.repeat(32), kind: 'other', seenAtMs: TRIED_AT_MS - 180_000 },
        ],
        history: {
            rows: [
                // A walked row: the chain's clock, never this page's, and a
                // record another wallet signed, which is its own label.
                {
                    txid: '88'.repeat(32),
                    kind: 'token-move',
                    chainTimeS: Math.floor(TRIED_AT_MS / 1000) - 90_000,
                    status: { kind: 'finalized', avalanche: false },
                    sats: 5_460n,
                },
                {
                    txid: '99'.repeat(32),
                    kind: 'settings',
                    chainTimeS: Math.floor(TRIED_AT_MS / 1000) - 200_000,
                    recordAuthority: 'unsigned',
                    status: { kind: 'in-block', height: 799_002 },
                },
            ],
            pagesRead: 1,
        },
    }),
    /*
     * A shop big enough for the tools row: seven distinct tokens is the
     * threshold where the find box and the sort appear, and an explicit
     * price sort paints the flat run instead of sections \u2014 both surfaces
     * the smaller fixtures never show the probe.
     */
    crowded: base({
        fetch: {
            kind: 'offers',
            offers: Array.from({ length: 7 }, (_, i) =>
                offer((0x20 + i).toString(16).repeat(32), i, 10_000n * BigInt(7 - i)),
            ),
        },
        tokens: new Map(
            Array.from({ length: 7 }, (_, i) => {
                const id = (0x20 + i).toString(16).repeat(32);
                return [id, meta(id, `Crate ${i + 1}`, 'SLP_TOKEN_TYPE_FUNGIBLE')];
            }),
        ),
        shopSort: 'price-asc',
    }),
    /*
     * A card mid-flourish: the one instant the pulse animation exists, so
     * `checkOverTime` has something to seek — a runtime-only class would be
     * an animation the probe never sees (critic finding 8).
     */
    'offers-changed': base({
        fetch: {
            kind: 'offers',
            offers: [offer(T1, 0, 120_000n), offer(T2, 1, 87_500n)],
        },
        justChanged: new Set([T1]),
    }),
    /*
     * Name-stress screens: the sign, the tab bar and the title all carry a
     * seller's name, and the shipped fixture name is friendly. These are not:
     * 32 bytes with no break opportunity, and an all-emoji name that spends
     * four bytes a glyph. The probe's sideways-scroll check is the guard.
     */
    /*
     * A row whose **name** is cut on its own. The marquee shipped 2026-09-09
     * was thought to be measured on the words line alone — but at 390px on
     * Modern `offers` already arms two name cells (`Roasted Beans` on T1's
     * grouped card, `Harvest Ledger` beside its ten-billion figure), so the
     * name path of `src/ui/marquee.ts` had been under Chrome unknowingly
     * since that day. What this screen adds is a name that is wide on its
     * own rather than crushed, and a rule in `probe.ts` that refuses the
     * screen when T1's own cell does not run — measured, not assumed
     * (2026-09-14). Geometry only: its ink is `offers`'.
     */
    'long-item-name': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        tokens: new Map([
            ...tokens,
            [
                T1,
                {
                    ...meta(T1, 'Single-origin Yirgacheffe washed heirloom lot, roasted the morning it ships', 'SLP_TOKEN_TYPE_FUNGIBLE'),
                    url: 'https://example.com/beans',
                },
            ],
        ]),
    }),
    'hostile-name': base({
        fetch: { kind: 'offers', offers: [offer(T1, 0, 120_000n)] },
        stallName: LONGEST_NAME,
    }),
    'emoji-name': base({
        fetch: { kind: 'offers', offers: [offer(T1, 0, 120_000n)] },
        stallName: '\u{1F6D2}'.repeat(8),
    }),
    /*
     * A stall named in CJK (step 8f2; DECISIONS D4): the sign says so
     * (`data-script="cjk"`, `scriptOf`), and a look may set such a name its
     * own way — so the rule that the name stands whole
     * (`the-sellers-name-stands-whole`) is measured on one. Ten ideographs,
     * 30 bytes, the record's binding CJK case; a CJK tagline under it. The
     * glyphs come from the machine's own fallback face (no CJK face is
     * served): the layout is per OS here, and a machine with no CJK face
     * fails `a-cjk-name-is-set-in-a-cjk-face` rather than measuring boxes.
     * Geometry only.
     */
    'cjk-name': base({
        fetch: { kind: 'offers', offers: [offer(T1, 0, 120_000n)] },
        stallName: CJK_NAME,
        tagline: CJK_TAGLINE,
    }),
    /*
     * A stall named in Vietnamese capitals with stacked marks (8f2, the 8f2
     * critic's P1-1): the marks run past the face's ascent, so a look that
     * bounds its name must leave them room. Geometry only.
     */
    'stacked-name': base({
        fetch: { kind: 'offers', offers: [offer(T1, 0, 120_000n)] },
        stallName: STACKED_NAME,
    }),
    /*
     * The tagline at its cap: 64 bytes of the widest Latin letter, and 21
     * ideographs. The default tagline is 54 bytes and the CJK one 33, so no
     * other screen held a tagline as long as a record can, and the two
     * scripts reach the cap at very different lengths. Geometry only.
     */
    'longest-tagline': base({
        fetch: { kind: 'offers', offers: [offer(T1, 0, 120_000n)] },
        tagline: LONGEST_TAGLINE,
    }),
    'longest-cjk-tagline': base({
        fetch: { kind: 'offers', offers: [offer(T1, 0, 120_000n)] },
        tagline: LONGEST_CJK_TAGLINE,
    }),
    /*
     * The state screens. Most sellers meet one of these before they ever see
     * an offer — a new seller pastes before listing and lands on
     * `unresolvable` — so they are designed and measured surfaces, not error
     * paths the probe is allowed to skip.
     */
    opening: base({ fetch: { kind: 'opening' }, stallName: undefined }),
    unresolvable: {
        route: { kind: 'unresolvable', address: ADDR },
        overlay: { kind: 'idle' },
        tokens: new Map(),
    },
    /*
     * The same address, reached from the door's paste box: the seller's
     * first-stall checklist (`pasted`), with its numbered steps, the stuck
     * step marked and the two controls. `unresolvable` above is the visitor's
     * screen — since the gate of 2026-09-05 the checklist was on no screen.
     */
    'first-stall': {
        route: { kind: 'unresolvable', address: ADDR },
        overlay: { kind: 'idle' },
        tokens: new Map(),
        pasted: true,
    },
    unresolved: {
        route: { kind: 'unresolved', address: ADDR },
        overlay: { kind: 'idle' },
        tokens: new Map(),
    },
    invalid: {
        route: { kind: 'invalid', raw: 'not-an-address' },
        overlay: { kind: 'idle' },
        tokens: new Map(),
    },
    script: {
        route: { kind: 'invalid', raw: 'ecash:pq0dqjm0lasd3k54dmuczp20sr05tsykrlgyonz2w9', why: 'script-address' },
        overlay: { kind: 'idle' },
        tokens: new Map(),
    },
    /*
     * The three failure screens, as the load path can actually reach them.
     *
     * The book failed and the two record walks did not, so each carries a name
     * this load read and the seller's own quotes — and **no token metadata for
     * the tokens those quotes name**, because that read goes to the same
     * index that just failed and usually fails with it. A fixture that
     * supplied metadata the real path could not get would certify a section
     * nobody can reach. So the quotes here are the case where nothing paints
     * and nothing is counted; `plugin-missing-quotes` below is the one where
     * the metas did arrive.
     */
    unreachable: base({
        fetch: { kind: 'unreachable', triedAtMs: TRIED_AT_MS, hosts: HOSTS_DOWN },
        tokens: new Map(),
        prices: QUOTES,
    }),
    unreadable: base({
        fetch: { kind: 'unreadable', triedAtMs: TRIED_AT_MS, returned: 3 },
        tokens: new Map(),
        prices: QUOTES,
    }),
    'plugin-missing': base({
        fetch: {
            kind: 'plugin-missing',
            triedAtMs: TRIED_AT_MS,
            /*
             * Empty, because that is the shape the app now produces here
             * (2026-09-20). A chronik proto error — which the agora 404 is —
             * is thrown from the first node that answers, so `hostAttempts`
             * refuses to invent a verdict for the other two and `hostsBox`
             * paints `HOSTS_NOT_ATTRIBUTED` in their place. The old fixture
             * built three rows the app can no longer reach, so this pass was
             * measuring a dead shape and not measuring the sentence that now
             * always paints — the smallest type on the site, in the lowest
             * contrast role.
             */
            hosts: [],
        },
        tokens: new Map(),
        prices: QUOTES,
    }),
    /*
     * The populated quote rail, and the win this rail was decoupled for: a node
     * that answered without the agora plugin, whose address history still
     * carried the settings, the records and the genesis of every token they
     * name. The book's failure is the panel's other side, so what is measured
     * here is the rail itself — two rows, both naming shapes, a `$` figure and
     * an XEC one.
     *
     * **The one quote screen in the contrast pass.** Every figure, chip and
     * muted line the rail paints is on this screen; the outcome screens below
     * are its geometry with a sentence changed, on grounds this list already
     * holds.
     */
    'plugin-missing-quotes': base({
        fetch: {
            kind: 'plugin-missing',
            triedAtMs: TRIED_AT_MS,
            // Empty for the reason above: the shape the app can produce.
            hosts: [],
        },
        prices: QUOTES,
        descriptions: QUOTE_WORDS,
        genesis: GENESIS,
        // One dated row and one undated, so the age line's own ink and the row
        // one line shorter without it are both on the rail's contrast screen.
        quoteTimes: QUOTE_TIMES,
        shopTab: 'quotes',
    }),
    /*
     * The three states of the quote rail that are not rows, one screen each,
     * because each is a different sentence in a different place: a quiet one
     * where a seller has published nothing, a walk that threw (rows, a line and
     * a retry — a walk returns what it collected, so rows are the ordinary
     * shape), and our own page cap (rows and a line, no retry).
     *
     * **Geometry only**, out of `__contrastScreens`: the figures, the chips and
     * the muted prose are `plugin-missing-quotes`', painted on the same ground.
     * `nothing-quoted` deliberately carries no `quotes` in its name — the
     * runner's audit fails a screen whose name promises a seller's figure and
     * mounts none, and this one has none to mount.
     */
    'nothing-quoted': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        shopTab: 'quotes',
    }),
    'quotes-failed': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        prices: QUOTES,
        descriptions: QUOTE_WORDS,
        genesis: GENESIS,
        descriptionsFailed: true,
        shopTab: 'quotes',
    }),
    'quotes-truncated': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        prices: QUOTES,
        descriptions: QUOTE_WORDS,
        genesis: GENESIS,
        descriptionsTruncated: true,
        shopTab: 'quotes',
    }),
    /*
     * The stream overlay, at the four states it spends its time in plus the
     * transparent wire. Measured at 1920x1080 and nowhere else (see
     * NO_DECOR_SCREENS): 252px plates certified at 390px are the wrong pixels.
     *
     * `broadcastCursor: 3` on both card screens is deliberate. The overlay has
     * exactly ONE card slot, so the fixture spends it on the figure that breaks
     * things: listing 3 of this book is `Century Flag #7` at
     * `from 100,000,000 XEC` — the longest asked amount, the `from` prefix and
     * a wrapping name, in a plate 252px wide with `white-space: nowrap`. A
     * shorter card can only pass wherever this one does. (Order, re-derived
     * from `listingsInShopOrder`: token-id sort puts T2, LONG, T1 in the
     * etoken section and LONGER, NFT in the nft one.)
     */
    /**
     * The sheet that composes a wall's link — the SELLER's side, on an
     * ordinary stall, which is why it carries no `window` of its own.
     *
     * It had no fixture at all until 2026-09-20, and two rounds of changes
     * went into it unmeasured: the code switch and the freeze switch gained
     * their state in words, then the lock control became a switch too and
     * grew an uppercase pill beside a 30-character label. `.sw-lock` (the
     * row that holds that control beside the height field) and `.sw-block`
     * (the field) have no rule of their own in any stylesheet, so what that
     * row does at 390px was decided by the cascade and read by nobody.
     *
     * Every rule this pass has wanted it for: the 44px floors on three
     * `.mini` controls, `text-spills` over an unstyled row, the sheet being
     * bounded and scrollable, and the contrast of the switches' own labels
     * on each look's sheet ground. Not the state pill: it was tried as a
     * target the same day and withdrawn — see `CONTRAST_TEXT`.
     */
    /*
     * The two tool sheets of round 16, over the shop with offers and a quote
     * so the recipe has a stall to link and the embed has a name to alt. Both
     * hold nothing; the probe measures their figures and controls like any
     * other sheet.
     */
    'stream-sheet': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        overlay: { kind: 'stream' },
        prices: QUOTES,
        descriptions: QUOTE_WORDS,
    }),
    'embed-sheet': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        overlay: { kind: 'embed' },
    }),
    'shop-window-sheet': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        overlay: { kind: 'shop-window' },
        // A quoted item, so the code switch has something to be about, and a
        // block height for the freeze row to suggest.
        prices: QUOTES,
        descriptions: QUOTE_WORDS,
        tipHeight: 874_213,
    }),
    /**
     * The stall on a wall: one item, and the catalogue. Both wear a look's
     * decorations at `--s-decor-scale: 2`, which is the whole point of the
     * screen and the thing a probe at a phone's width cannot see.
     */
    'shop-window-cycle': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        window: { show: 'listings', mode: 'cycle', payCode: true, turn: 'none', touch: false },
        announcement: 'Back on the 10th — orders ship then',
        readAtMs: 1_756_400_000_000 - 120_000,
    }),
    'shop-window-browse': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        window: { show: 'listings', mode: 'browse', upto: 874_213, payCode: true, turn: 'none', touch: false },
        announcement: 'Back on the 10th — orders ship then',
        readAtMs: 1_756_400_000_000 - 120_000,
    }),
    /*
     * The quote rail on a wall, which nothing measured until now: the seller's
     * own figure under `[data-role="seller-price"]`, their words on a running
     * line, and the borrowed-token case at hero size — every one of them a
     * surface the listings fixtures never reach.
     */
    'shop-window-quotes': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        window: { show: 'quotes', mode: 'browse', payCode: true, turn: 'none', touch: false },
        prices: QUOTES,
        descriptions: QUOTE_WORDS,
        genesis: GENESIS,
        quoteTimes: QUOTE_TIMES,
        readAtMs: 1_756_400_000_000 - 120_000,
        // At 390 the render gate hands back the ordinary stall, and this says
        // which rail that stall opens on — or the pay-screen audit refuses a
        // screen whose name promises a quote and whose paint carries none.
        shopTab: 'quotes',
    }),
    /*
     * The unbuyable offer on a wall: Browse, an unbuyable row beside a
     * buyable one, no lock.
     */
    'shop-window-unbuyable': base({
        fetch: { kind: 'offers', offers: [offer(T1, 0, 120_000n, { askedAtoms: 12n }), UNBUYABLE_OFFER] },
        window: { show: 'listings', mode: 'browse', payCode: true, turn: 'none', touch: false },
        readAtMs: 1_756_400_000_000 - 120_000,
    }),
    /*
     * And the wall's one big card (Cycle) SKIPS it (the owner, 2026-09-24):
     * a buyable listing and the unbuyable one, the cursor at 0 — where the
     * shop's own order puts the unbuyable one (measured: with the skip taken
     * out, this card is "Not buyable") and where the cycle's list has the
     * one buyable card. What the probe holds here is that a Cycle card is
     * painted and carries no "Not buyable" (`skipChecks`, surface `wall-cycle`;
     * the probe also asserts the unbuyable listing is at the cursor).
     */
    'shop-window-cycle-unbuyable': base({
        fetch: { kind: 'offers', offers: [offer(T1, 0, 120_000n, { askedAtoms: 12n }), UNBUYABLE_OFFER] },
        window: { show: 'listings', mode: 'cycle', payCode: true, turn: 'none', touch: false },
        windowCursor: 0,
        readAtMs: 1_756_400_000_000 - 120_000,
    }),
    /*
     * The touch wall (2026-09-21): Browse, the quotes, one USD item chosen
     * ×2 and one XEC row standing apart with its own sentence. The steppers
     * and the strip are the only controls the wall ever mounts, and the
     * name carries "quotes" so the pay-screen audit sees the screen
     * (`isPayScreen`; the critic's P2-8).
     */
    'shop-window-touch-quotes': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        window: { show: 'quotes', mode: 'browse', payCode: true, turn: 'none', touch: true },
        prices: QUOTES,
        descriptions: QUOTE_WORDS,
        genesis: GENESIS,
        quoteTimes: QUOTE_TIMES,
        selection: new Map([[T1, 2n]]),
        shopTab: 'quotes',
    }),
    /*
     * The payment the press froze, in the wall's one code slot: the figure a
     * wallet signs, one line per item, the total, the rate and its lifetime.
     * A snapshot, so the fixture states it rather than deriving it.
     */
    'shop-window-touch-quotes-pay': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        window: { show: 'quotes', mode: 'browse', payCode: true, turn: 'none', touch: true },
        prices: QUOTES,
        descriptions: QUOTE_WORDS,
        genesis: GENESIS,
        quoteTimes: QUOTE_TIMES,
        selection: new Map([[T1, 2n]]),
        shopTab: 'quotes',
        windowPaying: {
            sats: 52_500_000n,
            uri: `${ADDR}?amount=525000.00`,
            selection: new Map([[T1, 2n]]),
            prices: new Map([[T1, QUOTES.get(T1)!]]),
            names: new Map([[T1, 'Roasted Beans']]),
            borrowed: new Set<string>(),
            unit: 'usd',
            rate: { rate: PAY_RATE.rate, atMs: PAY_RATE.atMs },
            atMs: PAY_RATE.atMs,
        },
    }),
    /*
     * The same payment of several items (the critic's P1, 2026-09-24): three,
     * where the tablet's band first ran past its body, and the cap of 35.
     */
    'shop-window-touch-quotes-pay-3': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        window: { show: 'quotes', mode: 'browse', payCode: true, turn: 'none', touch: true },
        shopTab: 'quotes',
        ...severalPaying(3),
    }),
    /*
     * One of the thirty-five is on a token another wallet minted — the
     * twenty-first, deep in the lines' scroller where no cap shows it — so
     * the sentence outside the scroller is what a customer reads, and
     * `nothing-on-the-wall-is-cut-from-below` holds it whole (2026-09-24).
     */
    'shop-window-touch-quotes-pay-35': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        window: { show: 'quotes', mode: 'browse', payCode: true, turn: 'none', touch: true },
        shopTab: 'quotes',
        ...severalPaying(35, [20]),
    }),
    /*
     * The same screen at the size it is actually hung at. The page pass runs
     * the three above at 390 and 1280 — a phone, where the render gate hands
     * back the ordinary stall, and a small shop television. This one is the
     * 1920x1080 the feature exists for, and it is a separate fixture because
     * a screen sits on one side of the viewport split or the other.
     */
    'shop-window-wall': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        window: { show: 'listings', mode: 'cycle', payCode: true, turn: 'none', touch: false },
        announcement: 'Back on the 10th — orders ship then',
        readAtMs: 1_756_400_000_000 - 120_000,
    }),
    /*
     * The sign under its binding case on every composition of the wall (step
     * 8f2; DECISIONS D4, REVIEW F2): a 32-byte Latin name — the widest a
     * record carries, `hostile-name`'s — on the Cycle card and in Browse, at
     * the desk width (the first two) and at the 1920x1080 a wall is hung at
     * (the last two), and every one on the portrait wall and the counter
     * tablet (`WINDOW_SCREENS`). And a stacked-mark name and a CJK name on
     * the Cycle card. Here for
     * `the-sellers-name-stands-whole`: a look that bounds its name on a wall
     * keeps it whole or climbs its ladder, and the rule is what fails when it
     * does not. Geometry only; bare and all worn.
     */
    'shop-window-long-name': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        window: { show: 'listings', mode: 'cycle', payCode: true, turn: 'none', touch: false },
        stallName: LONGEST_NAME,
        readAtMs: 1_756_400_000_000 - 120_000,
    }),
    'shop-window-browse-long-name': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        window: { show: 'listings', mode: 'browse', payCode: true, turn: 'none', touch: false },
        stallName: LONGEST_NAME,
        readAtMs: 1_756_400_000_000 - 120_000,
    }),
    'shop-window-stacked-name': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        window: { show: 'listings', mode: 'cycle', payCode: true, turn: 'none', touch: false },
        stallName: STACKED_NAME,
        readAtMs: 1_756_400_000_000 - 120_000,
    }),
    'shop-window-cjk-name': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        window: { show: 'listings', mode: 'cycle', payCode: true, turn: 'none', touch: false },
        stallName: CJK_NAME,
        tagline: CJK_TAGLINE,
        readAtMs: 1_756_400_000_000 - 120_000,
    }),
    'shop-window-wall-long-name': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        window: { show: 'listings', mode: 'cycle', payCode: true, turn: 'none', touch: false },
        stallName: LONGEST_NAME,
        readAtMs: 1_756_400_000_000 - 120_000,
    }),
    /*
     * The wall's rows at long figures (round 3, the critic's P2-3,
     * pre-existing: the wall's rows never had the shop's re-flow). Browse,
     * listings at 14, 17, 21 and 26 characters and quotes at 17
     * (`10,000,000.00 XEC`) and 30 (the eight-byte XEC quote), at the desk
     * (`shop-window-browse-long-figures`, `shop-window-quotes-long-figures`)
     * and on the 1920 wall (`shop-window-wall-browse-long-figures`), and a
     * touch wall's quotes (`shop-window-touch-quotes-long-figures`); the
     * tall and tablet passes measure all four (`WINDOW_SCREENS`). On main a
     * 14-character listing spilled its row and a 10,000,000.00 XEC quote lost
     * its ` XEC` on the tablet, and at 1280 a long figure ran over the item's
     * name (Modern) or under its picture (Neo). Geometry only:
     * `shop-window-browse`'s and `shop-window-quotes`' ink.
     */
    'shop-window-browse-long-figures': base({
        fetch: {
            kind: 'offers',
            offers: [
                offer(T1, 0, 99_999_999_999n),
                offer(T2, 1, 9_999_999_999_999n),
                offer(LONG, 4, 2_099_906_103_286_385n),
                offer(LONGER, 5, LONGEST_ASK_SATS),
            ],
        },
        window: { show: 'listings', mode: 'browse', payCode: true, turn: 'none', touch: false },
        readAtMs: 1_756_400_000_000 - 120_000,
    }),
    'shop-window-quotes-long-figures': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        window: { show: 'quotes', mode: 'browse', payCode: true, turn: 'none', touch: false },
        prices: new Map([
            [T1, { code: 'xec', exponent: 2, amount: 1_000_000_000n }],
            [QUOTED, LONGEST_QUOTE],
        ]),
        descriptions: QUOTE_WORDS,
        genesis: GENESIS,
        quoteTimes: QUOTE_TIMES,
        readAtMs: 1_756_400_000_000 - 120_000,
        shopTab: 'quotes',
    }),
    'shop-window-wall-browse-long-figures': base({
        fetch: {
            kind: 'offers',
            offers: [
                offer(T1, 0, 99_999_999_999n),
                offer(T2, 1, 9_999_999_999_999n),
                offer(LONG, 4, 2_099_906_103_286_385n),
                offer(LONGER, 5, LONGEST_ASK_SATS),
            ],
        },
        window: { show: 'listings', mode: 'browse', payCode: true, turn: 'none', touch: false },
        readAtMs: 1_756_400_000_000 - 120_000,
    }),
    'shop-window-touch-quotes-long-figures': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        window: { show: 'quotes', mode: 'browse', payCode: true, turn: 'none', touch: true },
        prices: new Map([
            [T1, { code: 'xec', exponent: 2, amount: 1_000_000_000n }],
            [QUOTED, LONGEST_QUOTE],
        ]),
        descriptions: QUOTE_WORDS,
        genesis: GENESIS,
        quoteTimes: QUOTE_TIMES,
        selection: new Map([[T1, 1n]]),
        shopTab: 'quotes',
    }),
    /*
     * The wall's one card (Cycle) either side of the rows' cuts (round 4, the
     * critic's P1-1 on round 3: the card took the shop's desk own-row grid
     * from 17 characters for a listing and 18 for a quote, and at 1920x1080
     * Neo printed a hundred million as ",000,000.00 XEC"). Listings at 16
     * (`1,234,567,890.12`), 17 and 18 characters as the row counts them,
     * quotes at 16 (`1,000,000.00 XEC`), 17, 18 (`100,000,000.00 XEC`) and
     * 19 (`$100,000,000,000.00`). The card does not take the rows' re-flow:
     * it is not a row. Since the card has a ladder of its own (the fixtures
     * below) these are measured on every wall pass, and on the 1920 wall they
     * paint as main did, but the 18-character listing (20 as counted), which
     * steps there: on Neo it ran 4px past its column. Geometry only:
     * `shop-window-cycle`'s ink.
     */
    'shop-window-cycle-listing-16': base({
        fetch: { kind: 'offers', offers: [offer(T1, 0, 123_456_789_012n)] },
        window: { show: 'listings', mode: 'cycle', payCode: true, turn: 'none', touch: false },
        readAtMs: 1_756_400_000_000 - 120_000,
    }),
    'shop-window-cycle-listing-17': base({
        fetch: { kind: 'offers', offers: [offer(T1, 0, 1_234_567_890_123n)] },
        window: { show: 'listings', mode: 'cycle', payCode: true, turn: 'none', touch: false },
        readAtMs: 1_756_400_000_000 - 120_000,
    }),
    'shop-window-cycle-listing-18': base({
        fetch: { kind: 'offers', offers: [offer(T1, 0, 12_345_678_901_234n)] },
        window: { show: 'listings', mode: 'cycle', payCode: true, turn: 'none', touch: false },
        readAtMs: 1_756_400_000_000 - 120_000,
    }),
    'shop-window-cycle-quote-16': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        window: { show: 'quotes', mode: 'cycle', payCode: true, turn: 'none', touch: false },
        prices: new Map([[T1, { code: 'xec', exponent: 2, amount: 100_000_000n }]]),
        descriptions: QUOTE_WORDS,
        genesis: GENESIS,
        quoteTimes: QUOTE_TIMES,
        readAtMs: 1_756_400_000_000 - 120_000,
        shopTab: 'quotes',
    }),
    'shop-window-cycle-quote-17': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        window: { show: 'quotes', mode: 'cycle', payCode: true, turn: 'none', touch: false },
        prices: new Map([[T1, { code: 'xec', exponent: 2, amount: 1_000_000_000n }]]),
        descriptions: QUOTE_WORDS,
        genesis: GENESIS,
        quoteTimes: QUOTE_TIMES,
        readAtMs: 1_756_400_000_000 - 120_000,
        shopTab: 'quotes',
    }),
    'shop-window-cycle-quote-18': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        window: { show: 'quotes', mode: 'cycle', payCode: true, turn: 'none', touch: false },
        prices: new Map([[T1, { code: 'xec', exponent: 2, amount: 10_000_000_000n }]]),
        descriptions: QUOTE_WORDS,
        genesis: GENESIS,
        quoteTimes: QUOTE_TIMES,
        readAtMs: 1_756_400_000_000 - 120_000,
        shopTab: 'quotes',
    }),
    'shop-window-cycle-quote-19': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        window: { show: 'quotes', mode: 'cycle', payCode: true, turn: 'none', touch: false },
        prices: new Map([[T1, { code: 'usd', exponent: 2, amount: 10_000_000_000_000n }]]),
        descriptions: QUOTE_WORDS,
        genesis: GENESIS,
        quoteTimes: QUOTE_TIMES,
        readAtMs: 1_756_400_000_000 - 120_000,
        shopTab: 'quotes',
    }),
    /*
     * The Cycle card's figure ladder (the critic's P1 on narrow-phone round 4,
     * pre-existing: the card had one figure size at every length, so the
     * counter tablet cut a 6-character listing and an 8-character XEC quote on
     * every look, and 1280x900 put Neo's `123,456.78 XEC` tail under the
     * code). One card at the widest figure of each step of
     * `WALL_FIGURE_CEILINGS`, counted as `wallFigureTier` counts (a listing's
     * figure and two for its `from`; these listings are partials, so they
     * carry it), on both rails: listings of 5, 6 (`123.45`, the first to
     * fail on the tablet), 7, 9, 11, 14, 20, 24 and 26 characters (the
     * eight-byte asked amount); XEC quotes of 8 (`1.23 XEC`), 9, 10, 13, 22,
     * 26 and 30 (the eight-byte quote); USD quotes of 5 (`$5.00`), 7, 9, 11,
     * 13, 22 and 27; and the widest sign at its longest, `元` drawn by the
     * machine's fallback, at 27. With the cut fixtures above, every step
     * holds its widest figure of each kind. Measured on every wall pass — the
     * canvas, 1280x900 and 1280x800 (`DESK_WALL_SCREENS` and `WINDOW_SCREENS`
     * in the runner), the tall wall and the counter tablet — by
     * `a-cycle-card-shows-every-digit-at-every-wall-size`. Geometry only:
     * `shop-window-cycle`'s ink, and `shop-window-cycle-longest-figure`'s
     * broken one.
     */
    ...Object.fromEntries(
        (
            [
                ['listing-5', 123_400n],
                ['listing-6', 12_345n],
                ['listing-7', 12_345_600n],
                ['listing-9', 123_456_700n],
                ['listing-11', 12_345_678_900n],
                ['listing-14', 1_234_567_890_100n],
                ['listing-20', 1_234_567_890_123_450n],
                ['listing-24', 123_456_789_012_345_678n],
                ['listing-26', LONGEST_ASK_SATS],
            ] as const
        ).map(([name, sats]) => [`shop-window-cycle-${name}`, cycleListing(sats)]),
    ),
    ...Object.fromEntries(
        (
            [
                ['quote-8', { code: 'xec', exponent: 2, amount: 123n }],
                ['quote-9', { code: 'xec', exponent: 2, amount: 1_234n }],
                ['quote-10', { code: 'xec', exponent: 2, amount: 12_345n }],
                ['quote-13', { code: 'xec', exponent: 2, amount: 1_234_567n }],
                ['quote-22', { code: 'xec', exponent: 2, amount: 12_345_678_901_234n }],
                ['quote-26', { code: 'xec', exponent: 2, amount: 12_345_678_901_234_567n }],
                ['quote-30', LONGEST_QUOTE],
                ['usd-5', { code: 'usd', exponent: 2, amount: 500n }],
                ['usd-7', { code: 'usd', exponent: 2, amount: 99_999n }],
                ['usd-9', { code: 'usd', exponent: 2, amount: 123_456n }],
                ['usd-11', { code: 'usd', exponent: 2, amount: 12_345_678n }],
                ['usd-13', { code: 'usd', exponent: 2, amount: 123_456_789n }],
                ['usd-22', { code: 'usd', exponent: 2, amount: 1_234_567_890_123_456n }],
                ['usd-27', { code: 'usd', exponent: 2, amount: 2n ** 64n - 1n }],
                ['cny-27', { code: 'cny', exponent: 2, amount: 2n ** 64n - 1n }],
            ] as const satisfies readonly (readonly [string, TokenPrice])[]
        ).map(([name, price]) => [`shop-window-cycle-${name}`, cycleQuote(price)]),
    ),
    /*
     * The same eight-byte listing as a page screen, so the desk pass measures
     * it where it breaks (1280x900: two lines on Modern and the skeleton,
     * three on Neo and Rural) and the contrast pass reads every piece of it there
     * (`BROKEN_FIGURE_SCREENS` in the runner, `a-broken-figure-paints-every-digit`).
     */
    'shop-window-cycle-longest-figure': cycleListing(LONGEST_ASK_SATS),
    'shop-window-wall-browse-long-name': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        window: { show: 'listings', mode: 'browse', payCode: true, turn: 'none', touch: false },
        stallName: LONGEST_NAME,
        readAtMs: 1_756_400_000_000 - 120_000,
    }),
    broadcast: base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        broadcast: bc('corner', 'fixed'),
        broadcastState: 'live',
        broadcastCursor: 3,
        // The two one-shots, so the sheet's `.in` and `.pulse` keyframes are
        // on the tree the probe measures rather than being classes only a
        // running app ever applies — a runtime-only animation is one the
        // reduced-motion pass can never see.
        broadcastStepped: true,
        broadcastPulse: true,
    }),
    /* `bg=transparent`: the OBS wire, and the only screen C13's rules read. */
    /*
     * The overlay at its plainest: one ordinary listing, no "+N more", on the
     * transparent ground — the frame `/stream`'s hero is composed from (round
     * 16, Q6: the hero used to show the stress fixture's hundred-million
     * figure). A screen the shipped renderer paints, so the hero stays a
     * real render; it costs the canvas pass one more cell per look.
     */
    'broadcast-hero': base({
        fetch: { kind: 'offers', offers: [offer(T1, 0, 120_000n)] },
        broadcast: bc('corner', 'fixed', true),
        broadcastState: 'live',
    }),
    /*
     * The stream SKIPS an unbuyable listing (the owner, 2026-09-24): a buyable
     * listing and the unbuyable one, the cursor at 0 — where the shop's own
     * order puts the unbuyable one, and where the stream's list has the one
     * buyable card. The probe holds the card to carrying no "Not buyable"
     * (`skipChecks`, surfaces `stream-card` and `stream-ticker`; the probe
     * also asserts the unbuyable listing is at the cursor, or on the page).
     */
    'broadcast-unbuyable': base({
        fetch: { kind: 'offers', offers: [offer(T1, 0, 120_000n, { askedAtoms: 12n }), UNBUYABLE_OFFER] },
        broadcast: bc('corner', 'fixed'),
        broadcastState: 'live',
        broadcastCursor: 0,
    }),
    'broadcast-clear': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        broadcast: bc('corner', 'fixed', true),
        broadcastState: 'live',
        broadcastCursor: 3,
    }),
    /*
     * The other rail's card, on the same plate: `cards=quotes`.
     *
     * `broadcastCursor: 0` lands on the USD quote (`QUOTES` is insertion
     * ordered and T1 is first), which is the one that carries a currency
     * symbol and the tolerance byte — the XEC one is the same shape with a
     * longer figure and no symbol. The figure is `[data-role="seller-price"]`,
     * already in `PROTECTED` and `CONTRAST_TEXT`, and the QR plate carries the
     * item's own landing link rather than the stall's.
     *
     * The two one-shots ride along so `bc-in` and `bc-pulse` are on this
     * tree as well: the pulse class sits on a different role here, and a
     * reduce block that stilled only the other one would be invisible.
     */
    'broadcast-quotes': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        prices: QUOTES,
        // The seller's words on the quote card (2026-09-09): without them the
        // sticker-height rule measured a card a line shorter than the one a
        // streamer gets, and `OBS_STICKER_HEIGHT` is set by that measurement.
        descriptions: QUOTE_WORDS,
        broadcast: bc('corner', 'fixed', false, 'quotes'),
        broadcastState: 'live',
        broadcastCursor: 0,
        broadcastStepped: true,
        broadcastPulse: true,
    }),
    /*
     * The tallest corner card there is: a quote card under a 32-byte name.
     *
     * The quote card is a line taller than a listing card (the chip and the
     * line under the rule), and Neo clamps `.bc-name` at three lines where the
     * others stop at two — so the sticker ceiling has to be measured against
     * both at once, not against each alone. Geometry only, like the other
     * long-name screens: every figure on it is `broadcast-quotes`'.
     */
    'broadcast-quotes-long-name': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        prices: QUOTES,
        // The seller's words on the quote card (2026-09-09): without them the
        // sticker-height rule measured a card a line shorter than the one a
        // streamer gets, and `OBS_STICKER_HEIGHT` is set by that measurement.
        descriptions: QUOTE_WORDS,
        broadcast: bc('corner', 'fixed', false, 'quotes'),
        broadcastState: 'live',
        broadcastCursor: 0,
        stallName: 'W'.repeat(32),
    }),
    /* The same card on the OBS wire, which is where pass 5 reads it. */
    'broadcast-quotes-clear': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        prices: QUOTES,
        broadcast: bc('corner', 'fixed', true, 'quotes'),
        broadcastState: 'live',
        broadcastCursor: 0,
    }),
    /* Rail mode's rest half: the head plate alone, no card, for 3s of every 8. */
    'broadcast-rest': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        broadcast: bc('corner', 'rail'),
        broadcastState: 'rest',
        broadcastCursor: 3,
    }),
    /*
     * The rail preset, pinned at `live`: it mounts no card in any state, so a
     * card appearing here is a preset that stopped being a rail.
     */
    'broadcast-rail': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        broadcast: bc('rail', 'rail'),
        broadcastState: 'live',
    }),
    /* Nothing listed: the one muted line the overlay is allowed to print. */
    'broadcast-empty': base({
        fetch: { kind: 'empty' },
        broadcast: bc('corner', 'fixed'),
        broadcastState: 'live',
    }),
    /*
     * The tallest head any look can paint, which is the whole reason this
     * screen exists. Neo clamps `.bc-name` at three lines where Modern and
     * Rural stop at two (`.t-neo.broadcast .bc-name`), and 32 bytes with no
     * break opportunity fill all three in a 216px column at 29px. Everything
     * else is `broadcast`'s — the corner preset, the fixed mode, the same
     * stress cursor — so the card under the name is still the longest asked
     * figure this book holds.
     *
     * `OBS_STICKER_HEIGHT` is a promise about the tallest card this app
     * paints, so `the-sticker-height-fits-the-tallest-card` has to measure it
     * against the worst name a manifest can carry (§5: 1-32 bytes) and not
     * against the friendly fixture one.
     *
     * **Geometry only.** It stays out of `__contrastScreens`: the plate, the
     * ink and every figure on it are `broadcast`'s, already sampled there,
     * and the contrast pass is most of this guard's runtime.
     */
    'broadcast-long-name': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        broadcast: bc('corner', 'fixed'),
        broadcastState: 'live',
        broadcastCursor: 3,
        stallName: 'W'.repeat(32),
    }),
    /*
     * The same name on the rail, because the rail has its OWN ceiling and a
     * ceiling derived from the other preset's card is a number nobody
     * measured. Measured 2026-09-02: the rail with the friendly fixture name
     * is 424px under Neo and 544 with both insets — sixteen under the 560 it
     * was shipped with — and this name, one line taller, measures 457 and
     * needs 577. The rail mounts no card, so the name is the only thing that
     * can grow, and a 32-byte one is what §5 lets a seller publish.
     */
    'broadcast-rail-long-name': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        broadcast: bc('rail', 'rail'),
        broadcastState: 'live',
        stallName: 'W'.repeat(32),
    }),
    /*
     * The ticker (2026-09-21). The ribbon is PINNED still at an offset where
     * one whole listing item stands inside the clipping cell, because the
     * probe measures a money figure at one instant and a figure that moved
     * between the layout read and the pixel read is a figure sampled where
     * the page painted something else. `-260` puts the first item's figure
     * and the second item's name in the cell at every look's metrics.
     */
    'broadcast-ticker': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        broadcast: bc('ticker', 'fixed'),
        broadcastState: 'live',
        broadcastTickerAt: -260,
    }),
    /* The quotes pass: the chip beside every figure, the flag's line, the code left, the bar on top. */
    'broadcast-ticker-quotes': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        prices: QUOTES,
        descriptions: QUOTE_WORDS,
        broadcast: bc('ticker', 'fixed', false, 'quotes', 'left', 'top'),
        broadcastState: 'live',
        broadcastTickerAt: -120,
    }),
    /* The ribbon RUNNING: the reduced-motion pass proves the kill on it, and
       the sticker rule reads the box as a streamer's source would. */
    'broadcast-ticker-live': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        broadcast: bc('ticker', 'fixed'),
        broadcastState: 'live',
        stallName: 'W'.repeat(32),
    }),
    /* A STILL page under reduced motion — a layout with a width budget, not
       the moving ribbon paused: one quote item, its figure and surcharge line
       inside the cell, its words cut at the cell's edge (stated). Geometry
       only; `cutSideways` applies here because `data-ribbon` is `still`. */
    'broadcast-ticker-quotes-still': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        prices: QUOTES,
        descriptions: QUOTE_WORDS,
        broadcast: bc('ticker', 'fixed', false, 'quotes'),
        broadcastState: 'live',
        broadcastTickerStill: true,
    }),
    /* And the ribbon skips it: the same two listings, pinned at the start — one item runs. */
    'broadcast-ticker-unbuyable': base({
        fetch: { kind: 'offers', offers: [offer(T1, 0, 120_000n, { askedAtoms: 12n }), UNBUYABLE_OFFER] },
        broadcast: bc('ticker', 'fixed'),
        broadcastState: 'live',
        broadcastTickerAt: 0,
    }),
    /*
     * Every listing unbuyable, `cards=listings` (the critic's third pass,
     * 2026-09-24): the ribbon has nothing to run, and the bar says so in its
     * place (`BROADCAST_NO_LISTING_BUYABLE`) rather than standing empty under
     * "Listings".
     */
    'broadcast-ticker-none-buyable': base({
        fetch: { kind: 'offers', offers: [UNBUYABLE_OFFER] },
        broadcast: bc('ticker', 'fixed'),
        broadcastState: 'live',
    }),
    /* The same bar on the OBS wire, where pass 5 reads it. */
    'broadcast-ticker-clear': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        prices: QUOTES,
        descriptions: QUOTE_WORDS,
        broadcast: bc('ticker', 'fixed', true, 'quotes'),
        broadcastState: 'live',
        broadcastTickerAt: -120,
    }),
};

/**
 * States the app reaches by a press on the painted tree and by no view
 * field, staged right after the screen is painted (`stageScreen`), in the
 * probe's `paint` and the showroom's — so every pass, the contrast pass
 * included, and every shot of the screen are of the same state. The app
 * repaints nothing when the press lands, so neither does the stage: the
 * name's ladder and the marquees stand as the paint measured them.
 *
 * - `addr-shown`: the clipboard refused a tap on the address, and
 *   `addressLine` set `data-copied="shown"` on it — the whole string at
 *   every width, until the next paint (the 8g1 critic's P1-1).
 */
export const STAGED: Readonly<Record<string, (root: ParentNode) => number>> = Object.freeze({
    'addr-shown': (root: ParentNode) => {
        const boxes = root.querySelectorAll('[data-role="addr-copy"]');
        for (const addr of boxes) {
            addr.setAttribute('data-copied', 'shown');
        }
        return boxes.length;
    },
});

/**
 * Stage `screen`'s state on the tree just painted (`STAGED`), and say how
 * many nodes it staged — `undefined` for a screen with nothing to stage, so
 * a caller can refuse a staged screen that found nothing to press.
 */
export function stageScreen(screen: string, root: ParentNode): number | undefined {
    return Object.hasOwn(STAGED, screen) ? STAGED[screen]!(root) : undefined;
}

/**
 * Screens that paint no offer card. They still paint decorations — a beetle
 * strip sits above the footer on every screen with a stall — so they are
 * measured undecorated and fully decorated, and the single-row variants are
 * skipped: the probe's runtime is a budget (`PLAN-REDESIGN` P0.5), and the
 * interaction a single row could break that the full set does not is not one
 * these screens have room to stage.
 */
export const STATE_SCREENS: ReadonlySet<string> = new Set([
    'opening',
    'unresolvable',
    'first-stall',
    'unresolved',
    'invalid',
    'script',
    'unreachable',
    'unreadable',
    'plugin-missing',
    'plugin-missing-quotes',
    // The quote rail paints no offer cards either: its rows are the seller's
    // own, and the decoration interactions these could stage are `offers`'.
    'nothing-quoted',
    'quotes-failed',
    'quotes-truncated',
    // Not state screens, but the same budget rule: the studio and activity
    // panels paint no offer cards, and the name-stress screens exist for the
    // sign and the bar, not for decoration interactions.
    'studio',
    'studio-items',
    'activity',
    'hostile-name',
    // A row name wider than the row: the marquee's name path, geometry only.
    'long-item-name',
    // The poster sheet's tag: its decorations sit outside the scrim.
    'pay-tag',
    'emoji-name',
    'offers-changed',
    // Exists for the tools row and the flat sorted run; the decoration
    // interactions it could stage are the same ones `offers` already does.
    'crowded',
    // The same sheet shape as `pay`, in the one state that has no rate in it.
    // Its figures are measured; the decoration variants would be `pay`'s,
    // painted twice.
    'pay-xec',
    'pay-moved',
    'pay-dust',
    // The sheet over a quote that left (8e2): its title and one sentence.
    'pay-gone',
    // The sign quotes (`SIGN_QUOTES`): `offers`' quote rows and the pay
    // sheet's shape, in six currencies; the glyph is what they stage.
    'quotes-signs',
    'pay-inr',
    // The three "Pay several" screens: the same rows and sheet shape, and the
    // decoration interactions they could stage are `offers`'.
    'pay-several-strip',
    'pay-several-strip-xec',
    'pay-several-strip-long-figure',
    'pay-several-strip-18',
    'pay-several-strip-21',
    'pay-several-ask',
    'pay-several',
    'item-quote',
    // The two tool sheets: the same sheet shape over the same shop; the
    // decoration interactions they could stage are `offers`' again.
    'stream-sheet',
    'embed-sheet',
    // The unbuyable offer's page screens exist for one label (and the
    // Cycle card's skip); the decoration interactions they could stage are
    // `offers`' again.
    'unbuyable',
    'item-unbuyable',
    'item-unbuyable-fold',
    'shop-window-unbuyable',
    'shop-window-cycle-unbuyable',
    // The sign under stress (8f2): a 32-byte name, a CJK name; and the
    // tagline at its cap in both scripts. They exist for the sign; the
    // decoration interactions they could stage are `offers`' and
    // `shop-window-cycle`'s.
    'cjk-name',
    'stacked-name',
    'longest-tagline',
    'longest-cjk-tagline',
    'shop-window-long-name',
    'shop-window-browse-long-name',
    'shop-window-stacked-name',
    'shop-window-cjk-name',
    'shop-window-wall-long-name',
    'shop-window-wall-browse-long-name',
    // The wall's rows at long figures (round 3): `shop-window-browse`'s and
    // `shop-window-quotes`' shapes and ink.
    'shop-window-browse-long-figures',
    'shop-window-quotes-long-figures',
    'shop-window-wall-browse-long-figures',
    'shop-window-touch-quotes-long-figures',
    // The Cycle card at the rows' cuts (round 4): `shop-window-cycle`'s
    // decoration interactions and ink.
    'shop-window-cycle-listing-16',
    'shop-window-cycle-listing-17',
    'shop-window-cycle-listing-18',
    'shop-window-cycle-quote-16',
    'shop-window-cycle-quote-17',
    'shop-window-cycle-quote-18',
    'shop-window-cycle-quote-19',
    // The Cycle card's figure ladder: the same card at the widest figure of
    // each step, and the eight-byte listing as a page screen.
    'shop-window-cycle-listing-5',
    'shop-window-cycle-listing-6',
    'shop-window-cycle-listing-7',
    'shop-window-cycle-listing-9',
    'shop-window-cycle-listing-11',
    'shop-window-cycle-listing-14',
    'shop-window-cycle-listing-20',
    'shop-window-cycle-listing-24',
    'shop-window-cycle-listing-26',
    'shop-window-cycle-quote-8',
    'shop-window-cycle-quote-9',
    'shop-window-cycle-quote-10',
    'shop-window-cycle-quote-13',
    'shop-window-cycle-quote-22',
    'shop-window-cycle-quote-26',
    'shop-window-cycle-quote-30',
    'shop-window-cycle-usd-5',
    'shop-window-cycle-usd-7',
    'shop-window-cycle-usd-9',
    'shop-window-cycle-usd-11',
    'shop-window-cycle-usd-13',
    'shop-window-cycle-usd-22',
    'shop-window-cycle-usd-27',
    'shop-window-cycle-cny-27',
    'shop-window-cycle-longest-figure',
    // The address in its refused-copy state (the 8g1 critic's P1-1): the
    // decoration interactions it could stage are `offers`'.
    'addr-shown',
    // The empty stall a seller pasted (the 8g1 critic's P2-4): it exists
    // for the sign's cells, not for decoration interactions.
    'empty-pasted',
    // The two faces at long figures (the 8g1 critic's P2-1): the decoration
    // interactions they could stage are `item-listing`'s and `item-quote`'s.
    'item-listing-long-figure',
    'item-quote-long-figure',
    // The two pay sheets at long figures (2026-10-13): `pay`'s and
    // `pay-several`'s sheet shape, which sits over the shop.
    'pay-long-figure',
    'pay-longest-figure',
    'pay-several-long-figure',
    'pay-several-longest-figure',
    // The card ladder's every step and the rows at the longest figures
    // (round 2): the faces', the sheets' and the rows' shapes again.
    'item-listing-figure-14',
    'item-listing-figure-17',
    'item-listing-figure-21',
    'item-quote-figure-14',
    'item-quote-figure-17',
    'item-quote-figure-21',
    'pay-figure-14',
    'pay-figure-17',
    'pay-several-figure-lines',
    'row-longest-figure',
    'quote-row-longest-figure',
    // Round 3: the rows either side of the re-flow's cut.
    'quote-row-1m',
    'quote-row-18',
    'row-15-16',
    'row-17',
    'row-21',
]);

/**
 * Screens the pixel-contrast pass does not sample.
 *
 * That pass is most of this guard's runtime — a prepare is a full paint plus
 * `document.fonts.ready` plus two frames, bought per look and per worn state —
 * so a screen belongs in it only when it puts a figure or a label on a ground
 * no other screen does. These do not: each is another screen's ink with one
 * sentence changed, on the same ground, and their geometry is what they are
 * here for.
 *
 * Its own list rather than a flag on the fixture, so what the pass costs can
 * be read in one place, and next to the reason each name is on it.
 */
export const GEOMETRY_ONLY_SCREENS: ReadonlySet<string> = new Set([
    // Pruned from the contrast pass to pay for the touch wall's payment
    // plate, which had to join it (2026-09-22): this screen is
    // `shop-window-quotes` with a chosen row and a strip — the same ink on
    // the same ground, and the strip's own classes are sampled on the
    // paying screen beside it. Its geometry is what the two window passes
    // are here for.
    'shop-window-touch-quotes',
    // The two tool sheets carry no money figure and no ink the record
    // sheets' hex boxes, `pub` lines and `mini` controls do not already put
    // on the same ground — the recipe's own text was never sampled under the
    // studio either; and the hero's plate is `broadcast`'s. The contrast
    // pass is 140 s of a 200 s ceiling, so these three are geometry.
    'embed-sheet',
    'stream-sheet',
    'broadcast-hero',
    // The remove question in place of a stepper: two words in the row's own
    // ink, on the ground `pay-several-strip` already samples.
    'pay-several-ask',
    'nothing-quoted',
    'quotes-failed',
    'quotes-truncated',
    // Black ink on a white page inside a sheet: no ground the record sheets
    // and the stall poster's own page do not already put a figure on.
    'pay-tag',
    /*
     * The picture at full size carries no money figure at all — a token's
     * artwork, its name and a Close — and its two text nodes are white on a
     * scrim that is a literal no look touches. What this screen is here to
     * prove is geometry: that the surface is bounded, that it covers the
     * stall deliberately rather than by accident, and that nothing of the
     * face leaks past it.
     */
    'item-zoom',
    /*
     * These two were pruned to pay for the panel's segmented control, which
     * joined the sampled set on every page screen at once (`.seg-b` was
     * already a contrast target inside the record sheets) and took the run
     * past its ceiling. Neither loses a ground: every figure on them is an
     * offer card's, already sampled on `offers`, and what makes each of them
     * its own screen is geometry the pass never reads — `crowded`'s tools row
     * and flat sorted run, `sparse`'s closing motif, which cannot sit under a
     * protected box because the geometry rules refuse exactly that.
     */
    'crowded',
    'sparse',
    /*
     * Pruned 2026-09-05 to pay for the item face, which is a screen the
     * contrast pass samples (`item-listing`, the old `expanded`):
     * `emoji-name` is the sign's ground with a different string on it, and
     * `item-quote` is the quote row's ink on the card ground `item-listing`
     * already samples. `pay-xec` and `pay-moved` were here too — `pay`'s
     * card with one line changed — and that one line is the point since
     * 8e2: the borrowed-id warning and the valve's line are honest-display
     * sentences (`layout/honestDisplay.ts`), owed and read by role, so the
     * two are sampled again, beside `pay-gone`. `pay-dust` stays: its line
     * (`pay-why`) stands where no link was composed, so the sheet's two Pay
     * controls are `hidden` there, and a hidden control is a line target
     * not rendered — sampled, it measured +7 a viewport over the
     * `LINE_SKIP_CEILING` the window kept unchanged.
     */
    'emoji-name',
    'pay-dust',
    'item-quote',
    // The sign quotes (`SIGN_QUOTES`): the quote row's and the pay sheet's
    // ink on grounds `offers` and `pay` already sample; the screens exist
    // for the width of the currency sign beside the digits, in whichever
    // font draws it (geometry), and for looks:diff to see the money node.
    'quotes-signs',
    'pay-inr',
    // `offers`' ink with one name too wide for its row; the marquee cell is
    // a geometry rule, and the contrast pass has sampled that ground.
    'long-item-name',
    // The checklist is `unresolvable`'s ground with numbered steps on it;
    // its muted status lines are not contrast targets. Geometry only.
    'first-stall',
    // The payment of three items (2026-09-24) is here for its geometry: the
    // one-item plate is sampled on `shop-window-touch-quotes-pay`, and the
    // 35-item one — which alone carries the two lines outside the scroller,
    // "+N more" and the borrowed-token sentence — is sampled for those.
    'shop-window-touch-quotes-pay-3',
    // The sparse stall a seller pasted: its notice invite is sampled on Neo
    // worn, where the rain falls behind it (`RAIN_JOBS`), and its geometry
    // everywhere.
    'sparse-pasted',
    // The Cycle card that skips an unbuyable listing paints a buyable card
    // `shop-window-cycle` already samples. The unbuyable label itself is
    // sampled (2026-09-24, the critic: it is all a price cell says) on the
    // row, the face, its fold, the wall's Browse, the overlay card and the
    // ticker — `[data-role="unbuyable"]` in `CONTRAST_TEXT`.
    'shop-window-cycle-unbuyable',
    /*
     * The sign under stress (8f2, and the tagline at its cap): the sign's
     * ground with a longer name or tagline on it, which
     * `hostile-name` and `offers` already sample, and the wall's
     * own ground which `shop-window-cycle` and `shop-window-wall` sample.
     * What these screens are here for is geometry
     * (`the-sellers-name-stands-whole`). The CJK name's glyphs are the
     * machine's fallback face, so a contrast read of them would be a read of
     * whatever face each machine has.
     */
    'cjk-name',
    'stacked-name',
    'longest-tagline',
    'longest-cjk-tagline',
    'shop-window-long-name',
    'shop-window-browse-long-name',
    'shop-window-stacked-name',
    'shop-window-cjk-name',
    'shop-window-wall-long-name',
    'shop-window-wall-browse-long-name',
    // The wall's rows at long figures (round 3): `shop-window-browse`'s and
    // `shop-window-quotes`' shapes and ink.
    'shop-window-browse-long-figures',
    'shop-window-quotes-long-figures',
    'shop-window-wall-browse-long-figures',
    'shop-window-touch-quotes-long-figures',
    // The Cycle card at the rows' cuts (round 4): `shop-window-cycle`'s
    // decoration interactions and ink.
    'shop-window-cycle-listing-16',
    'shop-window-cycle-listing-17',
    'shop-window-cycle-listing-18',
    'shop-window-cycle-quote-16',
    'shop-window-cycle-quote-17',
    'shop-window-cycle-quote-18',
    'shop-window-cycle-quote-19',
    // The Cycle card's figure ladder: `shop-window-cycle`'s ink, here for the
    // figure inside its column. Not `shop-window-cycle-longest-figure`, which
    // the desk job samples where it breaks after its commas.
    'shop-window-cycle-listing-5',
    'shop-window-cycle-listing-6',
    'shop-window-cycle-listing-7',
    'shop-window-cycle-listing-9',
    'shop-window-cycle-listing-11',
    'shop-window-cycle-listing-14',
    'shop-window-cycle-listing-20',
    'shop-window-cycle-listing-24',
    'shop-window-cycle-listing-26',
    'shop-window-cycle-quote-8',
    'shop-window-cycle-quote-9',
    'shop-window-cycle-quote-10',
    'shop-window-cycle-quote-13',
    'shop-window-cycle-quote-22',
    'shop-window-cycle-quote-26',
    'shop-window-cycle-quote-30',
    'shop-window-cycle-usd-5',
    'shop-window-cycle-usd-7',
    'shop-window-cycle-usd-9',
    'shop-window-cycle-usd-11',
    'shop-window-cycle-usd-13',
    'shop-window-cycle-usd-22',
    'shop-window-cycle-usd-27',
    'shop-window-cycle-cny-27',
    // The address showing its whole string (the 8g1 critic's P1-1):
    // `offers`' ground with the sign's other span on it, and `.addr-full`
    // is sampled at the desk. It is here for the sign's width.
    'addr-shown',
    // The empty stall a seller pasted (the 8g1 critic's P2-4): `empty`'s
    // ground with the invites on it (the notice invite's words sampled on
    // `sparse-pasted` under the rain). It is here for the sign's cells.
    'empty-pasted',
    // The quote face at a long figure (the 8g1 critic's P2-1): `item-quote`'s
    // ink. Here for the figure inside its card. Not the listing face, the
    // two pay sheets or the strip at long figures: since round 4 (the
    // critic's P2-2) the contrast pass samples them, every broken figure's
    // every digit read for its ink (`BROKEN_FIGURE_SCREENS` in the runner).
    'item-quote-long-figure',
    // The pay sheet at the largest realistic sum: `pay`'s ink, one line on
    // the ladder's last single-line step, so nothing breaks; the pay sheet
    // that breaks its figure is `pay-longest-figure`, sampled.
    'pay-long-figure',
    // Pay several with another wallet's mint among its items: `pay-several`'s
    // ink. The Pay several that breaks every figure and is sampled is
    // `pay-several-longest-figure` (the warning inside `pay-lines` is a
    // ground the container's box read cannot be fair to).
    'pay-several-long-figure',
    // The card ladder's every step and the rows at the longest figures
    // (round 2): the ink of the screens they copy. Here for the geometry.
    'item-listing-figure-14',
    'item-listing-figure-17',
    'item-listing-figure-21',
    'item-quote-figure-14',
    'item-quote-figure-17',
    'item-quote-figure-21',
    'pay-figure-14',
    'pay-figure-17',
    'pay-several-figure-lines',
    'row-longest-figure',
    // Round 3: the rows either side of the re-flow's cut. Not
    // `quote-row-longest-figure`: the contrast pass samples it, with the
    // four surfaces above.
    // Round 4: the strip's total either side of its break (`pay-several-strip`'s ink).
    'pay-several-strip-18',
    'pay-several-strip-21',
    'quote-row-1m',
    'quote-row-18',
    'row-15-16',
    'row-17',
    'row-21',
]);

/**
 * The screens that are not a shop page: the stream overlay.
 *
 * Three things follow from that, all in `probe.ts` and `layout-check.mjs`:
 *
 * - **They run at 1920x1080 and nowhere else.** The overlay is sized for an
 *   OBS Browser Source (plate 252px, QR 204px); certifying that chrome at
 *   390px measures pixels nobody paints. The page passes skip them for the
 *   same reason in reverse.
 * - **They wear no decorations.** `renderStall`'s broadcast branch passes only
 *   `slot: 'mood'` rows to `applyTheme`, strips every `att-` class a mood may
 *   carry (D11), and mounts no ornament strip, so the worn variants are the
 *   same paint measured three times. `variantsFor`
 *   returns the bare list and the contrast driver skips the `wornAll` loop
 *   outright — a `continue` after `__contrastPrepare` still pays the paint,
 *   the fonts wait and two frames, which is nearly the whole cost.
 * - **Two rules are scoped away** (see PROBE-RULES): "the theme reaches all
 *   four edges" — a transparent overlay paints nothing on purpose — and the
 *   `.item-b` name floor, which is a grid the overlay does not have.
 */
/**
 * Screens the runner measures at 1920x1080 rather than at a phone and a desk.
 *
 * The union of the stream overlay and the shop window, and they are here for
 * two different reasons: an overlay is a 1920 canvas by definition, and a
 * shop window is one because a wall is. `NO_DECOR_SCREENS` stayed the answer
 * to a DIFFERENT question — whether decorations paint — because the window
 * wears every one the seller chose (owner, 2026-09-18) and the overlay wears
 * none. One set answering both questions is how a screen ends up on the wrong
 * viewport or stripped of the thing it exists to show.
 */
export const CANVAS_SCREENS: ReadonlySet<string> = new Set([
    'broadcast',
    'broadcast-hero',
    'broadcast-clear',
    'broadcast-quotes',
    'broadcast-quotes-clear',
    'broadcast-quotes-long-name',
    'broadcast-rest',
    'broadcast-rail',
    'broadcast-empty',
    'broadcast-long-name',
    'broadcast-rail-long-name',
    'broadcast-ticker',
    'broadcast-ticker-quotes',
    'broadcast-ticker-live',
    'broadcast-ticker-quotes-still',
    'broadcast-ticker-clear',
    'broadcast-unbuyable',
    'broadcast-ticker-unbuyable',
    'broadcast-ticker-none-buyable',
    'shop-window-wall',
    'shop-window-wall-long-name',
    'shop-window-wall-browse-long-name',
    'shop-window-wall-browse-long-figures',
    'shop-window-touch-quotes-long-figures',
    'shop-window-cycle-listing-16',
    'shop-window-cycle-listing-17',
    'shop-window-cycle-listing-18',
    'shop-window-cycle-quote-16',
    'shop-window-cycle-quote-17',
    'shop-window-cycle-quote-18',
    'shop-window-cycle-quote-19',
    'shop-window-cycle-listing-5',
    'shop-window-cycle-listing-6',
    'shop-window-cycle-listing-7',
    'shop-window-cycle-listing-9',
    'shop-window-cycle-listing-11',
    'shop-window-cycle-listing-14',
    'shop-window-cycle-listing-20',
    'shop-window-cycle-listing-24',
    'shop-window-cycle-listing-26',
    'shop-window-cycle-quote-8',
    'shop-window-cycle-quote-9',
    'shop-window-cycle-quote-10',
    'shop-window-cycle-quote-13',
    'shop-window-cycle-quote-22',
    'shop-window-cycle-quote-26',
    'shop-window-cycle-quote-30',
    'shop-window-cycle-usd-5',
    'shop-window-cycle-usd-7',
    'shop-window-cycle-usd-9',
    'shop-window-cycle-usd-11',
    'shop-window-cycle-usd-13',
    'shop-window-cycle-usd-22',
    'shop-window-cycle-usd-27',
    'shop-window-cycle-cny-27',
    'shop-window-touch-quotes',
    'shop-window-touch-quotes-pay',
    'shop-window-touch-quotes-pay-3',
    'shop-window-touch-quotes-pay-35',
]);

/**
 * Whether a screen is painted bare and never worn: every overlay screen
 * (`NO_DECOR_SCREENS`), and the door, which wears no look and no decoration
 * of its own since 2026-09-24 (`renderStall` hands it no worn rows, and
 * `paintHome` strips the look's class) — so its worn variants paint the bare
 * door, and measuring them is time for nothing. Not the same question as
 * `NO_DECOR_SCREENS`, which also says a screen is the overlay.
 */
export function paintsBareOnly(screen: string): boolean {
    return NO_DECOR_SCREENS.has(screen) || screen === 'door';
}

export const NO_DECOR_SCREENS: ReadonlySet<string> = new Set([
    'broadcast',
    'broadcast-hero',
    'broadcast-clear',
    'broadcast-quotes',
    'broadcast-quotes-clear',
    'broadcast-quotes-long-name',
    'broadcast-rest',
    'broadcast-rail',
    'broadcast-empty',
    'broadcast-long-name',
    'broadcast-rail-long-name',
    'broadcast-ticker',
    'broadcast-ticker-quotes',
    'broadcast-ticker-live',
    'broadcast-ticker-quotes-still',
    'broadcast-ticker-clear',
    'broadcast-unbuyable',
    'broadcast-ticker-unbuyable',
    'broadcast-ticker-none-buyable',
]);
