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
import type { Outpoint, StallOffer, StallView, TokenMeta } from '../src/domain/state';
import type { StallHandlers } from '../src/ui/render';
import { CHRONIK_HOSTS } from '../src/net/hosts';

export const ADDR = 'ecash:qpjqjm0lasd3k54dmuczp20sr05tsykrlyc3j7hv09';
export const PK = `03${'aa'.repeat(32)}`;
export const T1 = 'cd'.repeat(32);
export const T2 = '11'.repeat(32);
export const NFT = 'ee'.repeat(32);
export const GROUP = 'aa'.repeat(32);
export const OUT: Outpoint = { txid: 'ab'.repeat(32), outIdx: 0 };

/** A frozen instant, so a repainted screen is byte-identical to itself. */
export const TRIED_AT_MS = 1_756_400_000_000;

export const offer = (tokenId: string, outIdx: number, sats: bigint): StallOffer => ({
    outpoint: { txid: OUT.txid, outIdx },
    tokenId,
    atoms: 12n,
    variant: 'PARTIAL',
    askedSats: sats,
    askedAtoms: 1n,
    priceNanoSatsPerAtom: sats * 1_000_000_000n,
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
]);

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
    onClosePublish: () => {},
    onChangeFiat: () => {},
};

export const base = (over: Partial<StallView>): StallView => ({
    route: { kind: 'pubkey', pubkeyHex: PK, address: ADDR },
    overlay: { kind: 'idle' },
    tokens,
    address: ADDR,
    stallName: 'Riverside Goods',
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

export const SCREENS: Record<string, StallView> = {
    offers: base({
        fetch: {
            kind: 'offers',
            // T1 twice on purpose: the grouped card (cheapest ask + count
            // label) is a measured surface, not a code path the probe skips.
            offers: [
                offer(T1, 0, 120_000n),
                offer(T1, 3, 150_000n),
                offer(T2, 1, 87_500n),
                offer(NFT, 2, 50_000n),
            ],
        },
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
    publish: base({
        fetch: { kind: 'offers', offers: [offer(T1, 0, 120_000n)] },
        overlay: { kind: 'publish' },
        descriptions: new Map([[T1, 'Existing words']]),
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
    empty: base({ fetch: { kind: 'empty' } }),
    door: {
        route: { kind: 'home' },
        overlay: { kind: 'idle' },
        tokens: new Map(),
    },
    /* The other two panels of the shell. One panel in the DOM at a time. */
    studio: base({ fetch: { kind: 'empty' }, panel: 'studio' }),
    activity: base({
        fetch: { kind: 'offers', offers: [offer(T1, 0, 120_000n)] },
        panel: 'activity',
        watchedSinceMs: TRIED_AT_MS,
        activityGaps: 1,
        events: [
            { txid: 'ab'.repeat(32), kind: 'book', seenAtMs: TRIED_AT_MS },
            { txid: 'cd'.repeat(32), kind: 'settings', seenAtMs: TRIED_AT_MS - 60_000 },
            { txid: 'ee'.repeat(32), kind: 'other', seenAtMs: TRIED_AT_MS - 120_000 },
        ],
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
    unreachable: base({
        fetch: { kind: 'unreachable', triedAtMs: TRIED_AT_MS, hosts: HOSTS_DOWN },
    }),
    unreadable: base({
        fetch: { kind: 'unreadable', triedAtMs: TRIED_AT_MS, returned: 3 },
    }),
    'plugin-missing': base({
        fetch: {
            kind: 'plugin-missing',
            triedAtMs: TRIED_AT_MS,
            hosts: CHRONIK_HOSTS.map((host) => ({ host, result: 'plugin-missing' as const })),
        },
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
    // Not state screens, but the same budget rule: the studio and activity
    // panels paint no offer cards, and the name-stress screens exist for the
    // sign and the bar, not for decoration interactions.
    'studio',
    'activity',
    'hostile-name',
    'emoji-name',
]);
