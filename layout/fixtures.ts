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
    [T1, meta(T1, 'Roasted Beans', 'SLP_TOKEN_TYPE_FUNGIBLE')],
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
    [T1, { code: 'usd', exponent: 2, amount: 500n, tolerancePct: 2 }],
    [QUOTED, { code: 'xec', exponent: 2, amount: 500_000n }],
]);

/**
 * Whose wallet minted each quoted token.
 *
 * One of each, deliberately. `T1` is this stall's own, so its row paints an
 * icon and no extra line; `QUOTED` is another wallet's, so that row paints
 * initials plus `QUOTE_NOT_MINTED_HERE` under the item's name — a taller row
 * with one more string on it, which is the geometry no other fixture stages.
 */
export const GENESIS = new Map<string, GenesisAttribution>([
    [T1, 'attributed'],
    [QUOTED, 'not-attributed'],
]);

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
    onBuy: () => {},
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

const HOSTS_DOWN = CHRONIK_HOSTS.map((host, i) => ({
    host,
    result: (i === 2 ? 'error' : 'timeout') as 'error' | 'timeout',
}));

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
    expanded: base({
        fetch: {
            kind: 'offers',
            offers: [offer(T1, 0, 120_000n), offer(T1, 3, 150_000n), offer(T2, 1, 87_500n)],
        },
        overlay: { kind: 'buy', outpoint: OUT },
        // The longest thing a seller can publish, with no spaces to break on.
        descriptions: new Map([[T1, UNBROKEN]]),
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
        overlay: { kind: 'pay', tokenId: QUOTED },
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
                    signedByStall: false,
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
            hosts: CHRONIK_HOSTS.map((host) => ({ host, result: 'plugin-missing' as const })),
        },
        tokens: new Map(),
        prices: QUOTES,
    }),
    /*
     * The win this rail was decoupled for: a node that answered without the
     * agora plugin, whose address history still carried the settings, the
     * records and the genesis of every token they name. The pay section paints
     * under the failure message and the hosts box — a protected figure below
     * two blocks of our own bad news, which is a ground no other screen puts
     * a `[data-role="seller-price"]` on.
     */
    'plugin-missing-quotes': base({
        fetch: {
            kind: 'plugin-missing',
            triedAtMs: TRIED_AT_MS,
            hosts: CHRONIK_HOSTS.map((host) => ({ host, result: 'plugin-missing' as const })),
        },
        prices: QUOTES,
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
    'unresolved',
    'invalid',
    'script',
    'unreachable',
    'unreadable',
    'plugin-missing',
    'plugin-missing-quotes',
    // Not state screens, but the same budget rule: the studio and activity
    // panels paint no offer cards, and the name-stress screens exist for the
    // sign and the bar, not for decoration interactions.
    'studio',
    'activity',
    'hostile-name',
    'emoji-name',
    'offers-changed',
    // Exists for the tools row and the flat sorted run; the decoration
    // interactions it could stage are the same ones `offers` already does.
    'crowded',
    // The same sheet shape as `pay`, in the one state that has no rate in it.
    // Its figures are measured; the decoration variants would be `pay`'s,
    // painted twice.
    'pay-xec',
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
export const NO_DECOR_SCREENS: ReadonlySet<string> = new Set([
    'broadcast',
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
