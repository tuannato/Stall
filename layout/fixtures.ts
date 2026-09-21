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
/**
 * A token the seller **quoted** and never listed. The pay rail is not gated on
 * a listing, so a fixture whose every quote also has an offer would measure
 * only half of what the section paints.
 */
export const QUOTED = '55'.repeat(32);
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
    [QUOTED, { code: 'xec', exponent: 2, amount: 500_000n }],
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

/** The rate the pay sheet froze, at the fixture's own frozen instant. */
const PAY_RATE = { rate: scaleRate(0.00002)!, atMs: 1_756_400_000_000 };

/** Hostile content: no spaces anywhere, so nothing can wrap by accident. */
export const UNBROKEN = 'A'.repeat(178);

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

/** The wire the overlay is painted from. `parseBroadcastParams`' shape. */
const bc = (
    preset: BroadcastParams['preset'],
    mode: BroadcastParams['mode'],
    transparent = false,
    cards: BroadcastParams['cards'] = 'listings',
): BroadcastParams => ({ preset, mode, transparent, cards });

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
        attachmentFlags: 0b1,
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
     * `item-listing`.
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
    /* The other two panels of the shell. One panel in the DOM at a time. */
    studio: base({ fetch: { kind: 'empty' }, panel: 'studio' }),
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
                payment: { tokenId: T2, quantity: 2n },
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
                payment: { tokenId: T1, quantity: 2n },
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
        stallName: 'W'.repeat(32),
    }),
    'emoji-name': base({
        fetch: { kind: 'offers', offers: [offer(T1, 0, 120_000n)] },
        stallName: '\u{1F6D2}'.repeat(8),
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
        window: { show: 'listings', mode: 'cycle', payCode: true, turn: 'none' },
        announcement: 'Back on the 10th — orders ship then',
        readAtMs: 1_756_400_000_000 - 120_000,
    }),
    'shop-window-browse': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        window: { show: 'listings', mode: 'browse', upto: 874_213, payCode: true, turn: 'none' },
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
        window: { show: 'quotes', mode: 'browse', payCode: true, turn: 'none' },
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
     * The same screen at the size it is actually hung at. The page pass runs
     * the three above at 390 and 1280 — a phone, where the render gate hands
     * back the ordinary stall, and a small shop television. This one is the
     * 1920x1080 the feature exists for, and it is a separate fixture because
     * a screen sits on one side of the viewport split or the other.
     */
    'shop-window-wall': base({
        fetch: { kind: 'offers', offers: SHOP_OFFERS },
        window: { show: 'listings', mode: 'cycle', payCode: true, turn: 'none' },
        announcement: 'Back on the 10th — orders ship then',
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
        broadcast: { preset: 'corner', mode: 'fixed', transparent: true, cards: 'listings' },
        broadcastState: 'live',
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
};

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
    'item-quote',
    // The two tool sheets: the same sheet shape over the same shop; the
    // decoration interactions they could stage are `offers`' again.
    'stream-sheet',
    'embed-sheet',
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
    // The two tool sheets carry no money figure and no ink the record
    // sheets' hex boxes, `pub` lines and `mini` controls do not already put
    // on the same ground — the recipe's own text was never sampled under the
    // studio either; and the hero's plate is `broadcast`'s. The contrast
    // pass is 140 s of a 200 s ceiling, so these three are geometry.
    'embed-sheet',
    'stream-sheet',
    'broadcast-hero',
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
     * contrast pass samples (`item-listing`, the old `expanded`): `pay-xec`
     * is `pay`'s sheet with one figure in another unit, `emoji-name` is the
     * sign's ground with a different string on it. The three new sheet
     * states are geometry from the day they shipped: `pay-moved` and
     * `pay-dust` are `pay`'s card with one line changed, `item-quote` is the
     * quote row's ink on the card ground `item-listing` already samples.
     */
    'pay-xec',
    'emoji-name',
    'pay-moved',
    'pay-dust',
    'item-quote',
    // `offers`' ink with one name too wide for its row; the marquee cell is
    // a geometry rule, and the contrast pass has sampled that ground.
    'long-item-name',
    // The checklist is `unresolvable`'s ground with numbered steps on it;
    // its muted status lines are not contrast targets. Geometry only.
    'first-stall',
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
 *   `slot: 'mood'` rows to `applyTheme` and mounts no ornament strip, so the
 *   worn variants are the same paint measured three times. `variantsFor`
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
    'shop-window-wall',
]);

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
]);
