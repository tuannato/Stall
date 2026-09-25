// @vitest-environment happy-dom
import { DUST_SATS, formatXec } from './domain/money';
import { encodeCashAddress } from 'ecashaddrjs';
import type { TokenMeta } from './domain/state';
import { shaRmd160, toHex } from 'ecash-lib';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STL1_HEX, encodeManifestHex } from './domain/manifest';
import { STLD_HEX, encodeDescriptionHex, encodeRemovalHex } from './domain/description';
import { DEFAULT_THEME_ID, NEO_CITY_THEME_ID } from './domain/theme';
import { MAX_ACTIVITY_PAGES, MAX_STALL_EVENTS, type StallView } from './domain/state';
import type { ChainTx, HistoryPage } from './net/chain';
import type { DescriptionLookup } from './net/descriptions';
import { UNKNOWN_TXID } from './net/live';
import { SECOND_FEED } from './net/hosts';
import { p2pkhOutputScript } from './net/script';
import { stallPath } from './domain/route';
import {
    SELECTION_DROPPED,
    selectionDroppedItems,
    QUOTE_MINTED_CHIP,
    WINDOW_QUOTES_AS_LAST_READ,
    WINDOW_SOME_QUOTES_AS_LAST_READ,
    selectionUnread,
    selectionCapped,
    windowSelectionUnread,
    windowSelectionCapped,
    HOME_LEDE,
    OPENING_BODY,
    PLUGIN_MISSING_BODY,
    UNREACHABLE_BODY,
    QUOTE_NOT_MINTED_HERE,
    FIRST_STALL_SUB,
    WITHHELD_ALL_LISTINGS,
    EVENT_BOOK,
    EVENT_SETTINGS,
    EVENT_SETTINGS_STRANGER,
    EVENT_SETTINGS_UNADDRESSED,
    PAY_NO_RATE_WHY,
    PAY_RATE_ASKING,
    PAY_RATE_DISAGREE,
    PAY_RATE_IMPLAUSIBLE_WHY,
    RATE_SOURCE_CHECK,
    RATE_SOURCE_PRIMARY,
    PAY_QUOTE_CHANGED,
    PAY_QUOTE_CHANGED_UNPRESSED,
    PAY_QUOTE_GONE,
    PAY_QUOTE_UNSHOWN,
    PAY_SEVERAL_GONE,
    payItemsChangedUnpressed,
    selectionDroppedCheck,
    selectionDroppedCheckPressed,
    payFigure,
    payItemsChanged,
    payTolerance,
} from './ui/copy';
import { satsForQuote, scaleRate } from './domain/fiat';
import {
    qrSvg,
    PAY_RECOMPOSE_GRACE_MS,
    PAY_CHECK_TIMEOUT_MS,
    FIAT_GLANCE_TIMEOUT_MS,
} from './ui/render';

/**
 * The live half of `app.ts`, against real readers and a fake chain.
 *
 * Its own file rather than more of `app.test.ts` because module mocking is
 * hoisted per file, and that file deliberately has none: it drives `boot`
 * through its injected loader and nothing else.
 *
 * **What is faked here is chronik, not the readers.** `loadManifest`,
 * `loadDescriptions`, `loadHeldTokens` and `resolveSeller` all run for real
 * against the pages below, so `unfinalized-settings-do-not-flip-the-look-live`
 * exercises `pickManifestWinner` itself rather than a stub that was written to
 * agree with it. Only the socket (`watchStall`), the offer read (which needs a
 * real `Agora`) and the price feed are replaced.
 */

const PK_BYTES = (() => {
    const pk = new Uint8Array(33);
    pk[0] = 0x02;
    pk.fill(0x11, 1);
    return pk;
})();
/** Nobody holds this key: it is a byte pattern, not a wallet. */
const PK = toHex(PK_BYTES);
const HASH = toHex(shaRmd160(PK_BYTES));
const ADDR = encodeCashAddress('ecash', 'p2pkh', HASH);
const STALL_SCRIPT = p2pkhOutputScript(HASH);
const STRANGER_SCRIPT = p2pkhOutputScript('ff'.repeat(20));
const TOKEN = 'aa'.repeat(32);

/** One row, so a description has somewhere to be painted. */
const OFFER = {
    outpoint: { txid: 'de'.repeat(32), outIdx: 1 },
    tokenId: TOKEN,
    atoms: 12n,
    variant: 'PARTIAL' as const,
    askedSats: 120_000n,
    askedAtoms: 1n,
};
const TOKEN_META = {
    tokenId: TOKEN,
    name: 'Ripe Beans',
    ticker: 'RB',
    decimals: 0,
};

function p2pkhScriptSig(pk: Uint8Array): string {
    const sig = new Uint8Array(71).fill(0x30);
    const script = new Uint8Array(1 + sig.length + 1 + pk.length);
    script[0] = sig.length;
    script.set(sig, 1);
    script[1 + sig.length] = pk.length;
    script.set(pk, 2 + sig.length);
    return toHex(script);
}

/** The chain this test controls, shared by every reader through `createChronik`. */
const chain = {
    /** Newest first, as chronik answers. */
    addressTxs: [] as ChainTx[],
    txs: new Map<string, ChainTx>(),
    utxos: [] as { token?: { tokenId?: string; isMintBaton?: boolean } }[],
    /**
     * Genesis facts this chain will answer for, keyed by token id. Empty by
     * default, so `chronik.token()` throws exactly as it always did here — a
     * quote whose metadata never arrived is its own case.
     */
    genesis: new Map<string, unknown>(),
    historyThrows: false,
    txThrows: false,
    utxosThrow: false,
    calls: { stl1: 0, stld: 0, addressHistory: 0, tx: 0, utxos: 0 },
    /** Paged address history, when a test drives the activity walk. */
    historyPages: undefined as ChainTx[][] | undefined,
    gate: undefined as Promise<void> | undefined,
    walksInFlight: 0,
    walksInFlightMax: 0,
    /** Page numbers whose read throws once asked for. */
    historyPageThrows: new Set<number>(),
    /** Every page number the walk asked for, in order. */
    historyPageCalls: [] as number[],
    /** What the next live offer re-read answers. Empty when unset. */
    book: undefined as import('./domain/state').FetchStatus | undefined,
    /** A live re-read that throws rather than answering. */
    bookThrows: false,
    /** A live re-read held open: it captures its answer at the call and waits here. */
    bookGate: undefined as Promise<void> | undefined,
};

function resetChain(): void {
    chain.addressTxs = [];
    chain.txs = new Map();
    chain.utxos = [];
    chain.genesis = new Map();
    chain.historyThrows = false;
    chain.txThrows = false;
    chain.utxosThrow = false;
    chain.calls = { stl1: 0, stld: 0, addressHistory: 0, tx: 0, utxos: 0 };
    chain.historyPages = undefined;
    chain.gate = undefined;
    chain.walksInFlight = 0;
    chain.walksInFlightMax = 0;
    chain.historyPageThrows = new Set();
    chain.historyPageCalls = [];
    chain.book = undefined;
    chain.bookThrows = false;
    chain.bookGate = undefined;
}

const addressPage = (): HistoryPage => ({
    txs: chain.addressTxs,
    numPages: 1,
    numTxs: chain.addressTxs.length,
});

/**
 * The lokad indexes are reported as enormous so `walkShorter` always takes the
 * address branch. One index to fill, and the branch a real busy stall takes.
 */
const lokadPage = (): HistoryPage => ({ txs: [], numPages: 1, numTxs: 1_000_000 });

const fakeChronik = {
    address(_address: string) {
        return {
            history: async (page = 0): Promise<HistoryPage> => {
                chain.calls.addressHistory += 1;
                // Overlap seam: a walk held open by `chain.gate`, and the most
                // walks ever in flight at once, for the one-at-a-time guard.
                chain.walksInFlight += 1;
                chain.walksInFlightMax = Math.max(chain.walksInFlightMax, chain.walksInFlight);
                try {
                    if (chain.gate !== undefined) {
                        await chain.gate;
                    }
                } finally {
                    chain.walksInFlight -= 1;
                }
                if (chain.historyThrows) {
                    throw new Error('no index answered');
                }
                if (chain.historyPages !== undefined) {
                    chain.historyPageCalls.push(page);
                    if (chain.historyPageThrows.has(page)) {
                        throw new Error('that page did not answer');
                    }
                    return {
                        txs: chain.historyPages[page] ?? [],
                        numPages: chain.historyPages.length,
                        numTxs: chain.historyPages.reduce((n, p) => n + p.length, 0),
                    };
                }
                return addressPage();
            },
            utxos: async () => {
                chain.calls.utxos += 1;
                if (chain.utxosThrow) {
                    throw new Error('no index answered');
                }
                return { utxos: chain.utxos };
            },
        };
    },
    lokadId(id: string) {
        return {
            history: async (): Promise<HistoryPage> => {
                if (id === STL1_HEX) {
                    chain.calls.stl1 += 1;
                } else if (id === STLD_HEX) {
                    chain.calls.stld += 1;
                }
                return lokadPage();
            },
        };
    },
    async tx(txid: string): Promise<ChainTx> {
        chain.calls.tx += 1;
        if (chain.txThrows) {
            throw new Error('not found');
        }
        const found = chain.txs.get(txid);
        if (found === undefined) {
            throw new Error('not found');
        }
        return found;
    },
    async token(tokenId: string): Promise<unknown> {
        const info = chain.genesis.get(tokenId);
        if (info === undefined) {
            throw new Error('no genesis here');
        }
        return info;
    },
};

/** Every watch opened this session, so a close can be seen from outside. */
type OpenedWatch = {
    stall: { pubkeyHex?: string; hash?: string };
    hooks: {
        onChanged?: (trigger: import('./net/live').LiveTrigger) => void;
        onBurst?: (
            txids: readonly string[],
            status?: ReadonlyMap<string, import('./net/live').LiveTxStatus>,
        ) => void;
        onReestablished?: () => void;
    };
    closed: boolean;
};
const watches: OpenedWatch[] = [];

vi.mock('./net', async (importOriginal) => {
    const real = await importOriginal<typeof import('./net')>();
    return {
        ...real,
        createChronik: () => fakeChronik,
        // Needs a real `Agora`, which needs a real client. The parse is not
        // what this file is about; the *answer* is controllable so the effect
        // gating can be driven: `chain.book` is what a live re-read returns.
        // The reader is a stub for the same reason — constructing the real
        // one against the fake chronik throws before loadOffers is reached.
        agoraOfferReader: () => ({}) as never,
        loadOffers: async () => {
            // The answer is what the book said when the read was *made*, and
            // a held read returns it late — the out-of-order seam.
            const answer = chain.book ?? ({ kind: 'empty' as const });
            const gate = chain.bookGate;
            if (gate !== undefined) {
                await gate;
            }
            if (chain.bookThrows) {
                throw new Error('index threw');
            }
            return answer;
        },
    };
});

vi.mock('./net/live', async (importOriginal) => {
    const real = await importOriginal<typeof import('./net/live')>();
    return {
        ...real,
        watchStall: (
            _chronik: unknown,
            stall: OpenedWatch['stall'],
            hooks: OpenedWatch['hooks'] = {},
        ) => {
            const entry: OpenedWatch = { stall, hooks, closed: false };
            watches.push(entry);
            return {
                close: () => {
                    entry.closed = true;
                },
                pause: () => undefined,
                resume: () => undefined,
            };
        },
    };
});

const { priceControl } = vi.hoisted(() => ({
    priceControl: {
        fetch: async (_code: string, _opts?: { timeoutMs?: number }): Promise<bigint | undefined> =>
            undefined,
        check: async (_code: string, _opts?: { timeoutMs?: number }): Promise<bigint | undefined> =>
            undefined,
    },
}));

vi.mock('./net/price', () => ({
    fetchXecPrice: (code: string, opts?: { timeoutMs?: number }) =>
        priceControl.fetch(code, opts),
}));
// The second feed is mocked beside the first even while `SECOND_FEED` is
// paused: the paused-check tests count its calls (none), and the day it is
// turned back on no test may make a real request under happy-dom's fetch.
vi.mock('./net/priceCheck', () => ({
    fetchXecPriceCheck: (code: string, opts?: { timeoutMs?: number }) =>
        priceControl.check(code, opts),
}));

/**
 * The last view painted on each root.
 *
 * The event ring is state nothing renders yet, so there is no text on screen to
 * read it back from. The real `renderStall` still runs — every other test in
 * this file asserts on the DOM it produces — and the view it was handed is
 * captured on the way through, **per root** (the critic, CARRYOVER-2 item 9):
 * every app an earlier test booted keeps listening and painting — a
 * `popstate`, a late burst timer — and one file-wide capture let any of them
 * write the view a later test then read as its own (measured: seed 29 turned
 * one test red). A test reads its own app's view, `viewOf(root)`.
 */
const paintedViews = new WeakMap<HTMLElement, StallView>();
/** The last view this root was painted with: this test's own app, never another's late paint. */
const viewOf = (root: HTMLElement): StallView | undefined => paintedViews.get(root);

vi.mock('./ui', async (importOriginal) => {
    const real = await importOriginal<typeof import('./ui')>();
    return {
        ...real,
        renderStall: (root: HTMLElement, view: StallView, handlers: never) => {
            paintedViews.set(root, view);
            return real.renderStall(root, view, handlers);
        },
    };
});

const { boot } = await import('./app');

/**
 * The words every "taken out" sentence shares — the wall's
 * `SELECTION_DROPPED` and the phone's named `selectionDroppedItems` — so a
 * test that says nothing was taken out reads both surfaces
 * (`the-taken-out-words-are-in-every-taken-out-sentence`).
 */
const DROPPED_WORDS = 'taken out';
type State = import('./app').AppState;

/** Let the queued promise chains run. Several helpers await in sequence. */
async function flush(times = 8): Promise<void> {
    for (let i = 0; i < times; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 0));
    }
}

/**
 * Wait for a condition rather than a count of ticks. A burst is a real timer,
 * and a fixed number of `setTimeout(0)` turns reached it on an idle box and
 * missed it on a busy one — measured as a red that came and went. Bounded,
 * so a condition that never comes still fails rather than hangs.
 */
async function until(cond: () => boolean, ms = 3_000): Promise<void> {
    const deadline = Date.now() + ms;
    while (!cond()) {
        if (Date.now() > deadline) {
            return;
        }
        await new Promise((resolve) => setTimeout(resolve, 5));
    }
}

/**
 * The page's monotonic clock, held still for the rest of one test (the
 * critic, CRITIC-CARRYOVER-4 item 10): a pay sheet's grace is a change's
 * `performance.now()` stamp against a press's `event.timeStamp`, which
 * happy-dom takes from the same clock — so a pause under load between a
 * change and a press moves neither, and only the test moves it on. Nothing
 * else in the app reads this clock; `until` and the app's floors read
 * `Date.now()`, which runs on.
 */
let heldClock: { mockRestore: () => void } | undefined;
function holdClock(): (ms: number) => void {
    let at = performance.now();
    heldClock?.mockRestore();
    heldClock = vi.spyOn(performance, 'now').mockImplementation(() => at);
    return (ms) => {
        at += ms;
    };
}
afterEach(() => {
    heldClock?.mockRestore();
    heldClock = undefined;
});

function stallEmpty(over: Partial<State['view']> = {}): State {
    return {
        view: {
            route: { kind: 'pubkey', pubkeyHex: PK, address: ADDR },
            fetch: { kind: 'empty' },
            overlay: { kind: 'idle' },
            address: ADDR,
            tokens: new Map(),
            ...over,
        },
        offers: [],
        pubkeyHex: PK,
    };
}

/**
 * The three presses that put the glance on screen: the row, the face it
 * opens, and the fold the fiat line lives inside. Synchronous — the fold's
 * own toggle is deliberately paintless.
 */
function openGlanceFold(root: HTMLElement): void {
    (root.querySelector('.item-head') as HTMLButtonElement).click();
    const fold = root.querySelector('[data-role="item-how"]') as HTMLDetailsElement;
    fold.open = true;
    fold.dispatchEvent(new Event('toggle'));
}

function waitingState(kind: 'unresolvable' | 'unresolved'): State {
    return {
        view: {
            route: { kind, address: ADDR },
            overlay: { kind: 'idle' },
            address: ADDR,
            tokens: new Map(),
        },
        offers: [],
    };
}

/** A transaction the stall's own key signed, which is what authorship means. */
function signedTx(opts: {
    txid: string;
    outputs: readonly string[];
    height?: number;
    isFinal?: boolean;
    tokens?: readonly string[];
}): ChainTx {
    return {
        txid: opts.txid,
        block: opts.height === undefined ? undefined : { height: opts.height },
        isFinal: opts.isFinal,
        inputs: [{ inputScript: p2pkhScriptSig(PK_BYTES), outputScript: STALL_SCRIPT }],
        // The publish link's own dust back to the stall: what makes a signed
        // record this stall's (`recordAddressedToStall`).
        outputs: [
            ...opts.outputs.map((outputScript) => ({ outputScript })),
            { outputScript: STALL_SCRIPT, sats: DUST_SATS },
        ],
        tokenEntries: opts.tokens?.map((tokenId) => ({ tokenId })),
    };
}

function stl1Output(name: string, themeId = DEFAULT_THEME_ID, flags = 0): string {
    const hex = encodeManifestHex(name, themeId, flags);
    if (hex === undefined) {
        throw new Error('fixture is not encodable');
    }
    return `6a${hex}`;
}

function stldOutput(tokenId: string, text: string): string {
    const hex = encodeDescriptionHex(tokenId, text);
    if (hex === undefined) {
        throw new Error('fixture is not encodable');
    }
    return `6a${hex}`;
}

/** Put a transaction both in the address history and behind `chronik.tx`. */
function publish(tx: ChainTx): string {
    chain.addressTxs = [tx, ...chain.addressTxs];
    chain.txs.set(tx.txid, tx);
    return tx.txid;
}

/**
 * The roots `bootStall` put on the page, taken off after each test (the
 * critic, CARRYOVER-3 item 8). On the page, as the app's own root is: a
 * sheet's async tails answer only while it is connected
 * (`wrap.isConnected`), and a detached root made every such tail return
 * early — so a test through `bootStall` never saw what they do. The app a
 * test booted keeps its listeners (`boot` removes none), so a later test's
 * `popstate` still repaints it: off the page, where it touches nothing.
 */
const onPage: HTMLElement[] = [];

function bootStall(state: State): { root: HTMLElement; loads: number } {
    const root = document.createElement('div');
    document.body.append(root);
    onPage.push(root);
    const counter = { root, loads: 0 };
    boot(root, async () => {
        counter.loads += 1;
        return state;
    });
    return counter;
}

afterEach(() => {
    for (const root of onPage.splice(0)) {
        root.remove();
    }
});

beforeEach(() => {
    window.history.replaceState(null, '', stallPath(PK));
    resetChain();
    watches.length = 0;
    localStorage.clear();
    priceControl.fetch = async () => undefined;
    priceControl.check = async () => undefined;
});
describe('a-records-read-that-failed-never-empties-a-choice', () => {
    /* Local, because this describe sits at the head of the file: every app a
       test boots stays listening, and a `popstate` reaches all of them, so
       these many-refresh tests run before the file has booted a hundred. */
    const fungible = (tokenId: string, name: string) => ({
        tokenId,
        name,
        ticker: name.slice(0, 4).toUpperCase(),
        decimals: 0,
        tokenType: { protocol: 'SLP', type: 'SLP_TOKEN_TYPE_FUNGIBLE' },
    });
    /**
     * The critic's fourth pass (2026-09-24, P1): a descriptions walk that
     * threw returns what it had read before the throw with `failed: true`,
     * and three things on the screen read that floor as the seller's whole
     * record — the prune took a chosen quote out of the customer's choice
     * (and blamed the seller, `SELECTION_DROPPED`), the wall's frozen payment
     * was compared with it and closed, and the stored rail moved off the
     * quotes. Our failure is never the seller removing a quote: one
     * predicate (`recordsKnown`) gates all three, and a same-stall refresh
     * keeps the last good records when its own walk failed — the refusal a
     * live re-read already applies. The fifth pass (P1): kept whole, the
     * names and attributions of the kept ids with them, because the load
     * builds both from the floor.
     *
     * Which case holds which gate: the first two hold the prune and the
     * carry-over (the second with the load's own floor-only names); the
     * third — an EMPTY partial read, with a payment standing — holds the
     * plate's comparison and the rail store, each proved red with its gate
     * reverted; the fourth holds the phone's Retry.
     */
    const A = 'a1'.repeat(32);
    const B = 'b2'.repeat(32);
    const XEC_A = { code: 'xec', exponent: 2, amount: 500_000n };
    const XEC_B = { code: 'xec', exponent: 2, amount: 700_000n };
    const tokens = new Map([
        [A, fungible(A, 'Plum Jam')],
        [B, fungible(B, 'Rye Flour')],
    ]);
    /** What `loadCurrent` builds over a walk that threw after reading B alone. */
    const floorTokens = new Map([[B, fungible(B, 'Rye Flour')]]);
    const genesisBoth = new Map([
        [A, 'attributed' as const],
        [B, 'attributed' as const],
    ]);
    const floorGenesis = new Map([[B, 'attributed' as const]]);
    /** What a walk that threw after reading B's record answers. */
    const failedLookup = {
        descriptions: new Map<string, string>(),
        shelves: new Map<string, string>(),
        prices: new Map([[B, XEC_B]]),
        quoteTimes: new Map<string, number>(),
        decided: new Set([B]),
        unreadable: new Set<string>(),
        truncated: false,
        failed: true,
        genesis: new Map(),
    };
    /** A walk that threw before it read anything. */
    const emptyFailedLookup = { ...failedLookup, prices: new Map(), decided: new Set<string>() };
    /** Boots with a loader that answers the states in turn, the last one for good. */
    const bootSequence = (states: State[]): HTMLElement => {
        const root = document.createElement('div');
        let at = 0;
        boot(root, async () => states[Math.min(at++, states.length - 1)]!);
        return root;
    };
    /*
     * Read off this test's own root: a `popstate` reaches every app an
     * earlier test booted in this file, and each of them repaints its own
     * root (`viewOf` is per root for that reason).
     */
    const wallCount = (root: HTMLElement, name: string): string | undefined =>
        [...root.querySelectorAll('.sw-strip .sw-row, .sw-strip .item')]
            .find((row) => row.textContent?.includes(name))
            ?.querySelector('.sw-step-n')?.textContent ?? undefined;
    const phoneCount = (root: HTMLElement, tokenId: string): string | undefined =>
        [...root.querySelectorAll<HTMLButtonElement>('[data-role="selection-more"]')]
            .find((b) => b.getAttribute('data-focus-key') === `selection-step:${tokenId}:more`)
            ?.parentElement?.querySelector('[data-role="selection-count"]')?.textContent ?? undefined;
    /** Presses the named control for this token, and fails when there is none. */
    const pressMore = (root: HTMLElement, role: string, tokenId: string): void => {
        const button = [...root.querySelectorAll<HTMLButtonElement>(`[data-role="${role}"]`)].find(
            (b) => (b.closest('[data-token]')?.getAttribute('data-token') ?? b.getAttribute('data-focus-key') ?? '').includes(tokenId),
        );
        if (button === undefined) {
            throw new Error(`no ${role} for ${tokenId}`);
        }
        button.click();
    };
    const wallRow = (root: HTMLElement, name: string): Element | undefined =>
        [...root.querySelectorAll('.sw-strip .sw-row, .sw-strip .item')].find((row) => row.textContent?.includes(name));
    const wall = (show: 'quotes' | 'all') => ({
        show,
        mode: 'browse' as const,
        payCode: true,
        turn: 'none' as const,
        touch: true,
    });

    it.each([
        ['address', stallPath(ADDR)],
        ['pubkey', stallPath(PK)],
    ])('a wall at its %s path whose walk failed while its book answered keeps the choice, the payment and the quotes', async (_, path) => {
        // The wall's own path in either form, so the refresh is the
        // heartbeat's same-stall re-read — the stall compared, not a
        // spelling (`pathNamesStall`): until 2026-09-25 a wall opened at
        // its pubkey never matched itself and kept no records at all.
        window.history.replaceState(null, '', `${path}?view=window&show=quotes&mode=browse&touch=on`);
        const good = stallEmpty({ tokens, prices: new Map([[A, XEC_A], [B, XEC_B]]), window: wall('quotes') });
        const failed = stallEmpty({
            tokens,
            prices: failedLookup.prices,
            descriptionsFailed: true,
            window: wall('quotes'),
        });
        const root = bootSequence([good, failed, good]);
        await flush();
        pressMore(root, 'window-step-more', A);
        await flush();
        expect(wallCount(root, 'Plum Jam')).toBe('1');
        (root.querySelector('[data-role="window-pay"]') as HTMLButtonElement).click();
        await flush();
        expect(root.querySelector('[data-role="window-paying"]'), 'a payment stands').not.toBeNull();

        // The heartbeat's refresh: the same stall, and a walk that threw.
        window.dispatchEvent(new PopStateEvent('popstate'));
        await flush();
        expect(root.querySelector('[data-role="window-selection"]')?.textContent, 'the choice stands').toContain('Plum Jam');
        expect(root.querySelector('.sw-sel-drop'), 'and nobody is told the seller took it').toBeNull();
        expect(root.querySelector('[data-role="window-paying"]'), 'the payment stands').not.toBeNull();
        expect(root.textContent).not.toContain(DROPPED_WORDS);
        // The last good records stand on the wall: the floor the throw left
        // would have taken the chosen item's own row off the list.
        expect(root.querySelector('.sw-strip')?.textContent, 'the chosen row stays on the wall').toContain('Plum Jam');

        window.dispatchEvent(new PopStateEvent('popstate'));
        await flush();
        expect(wallCount(root, 'Plum Jam')).toBe('1');
        expect(root.textContent).not.toContain(DROPPED_WORDS);
    });

    it("a failed walk's load names only the tokens of its floor, and the wall keeps the kept ids' names and attributions", async () => {
        // The fifth pass's P1: `loadCurrent` builds `tokens` and `genesis`
        // from the floor, so a chosen quote the walk never reached had a
        // price back and no name — no row, pruned, the payment closed.
        window.history.replaceState(null, '', `${stallPath(ADDR)}?view=window&show=quotes&mode=browse&touch=on`);
        const good = stallEmpty({
            tokens,
            genesis: genesisBoth,
            prices: new Map([[A, XEC_A], [B, XEC_B]]),
            window: wall('quotes'),
        });
        const failed = stallEmpty({
            tokens: floorTokens,
            genesis: floorGenesis,
            prices: failedLookup.prices,
            descriptionsFailed: true,
            window: wall('quotes'),
        });
        const root = bootSequence([good, failed, failed, good]);
        await flush();
        pressMore(root, 'window-step-more', A);
        await flush();
        (root.querySelector('[data-role="window-pay"]') as HTMLButtonElement).click();
        await flush();
        expect(root.querySelector('[data-role="window-paying"]'), 'a payment stands').not.toBeNull();

        for (const pass of ['the first walk that throws', 'the second in a row']) {
            window.dispatchEvent(new PopStateEvent('popstate'));
            await flush();
            expect(wallCount(root, 'Plum Jam'), `${pass}: the choice stands`).toBe('1');
            expect(root.querySelector('[data-role="window-paying"]'), `${pass}: the payment stands`).not.toBeNull();
            expect(root.textContent, pass).not.toContain(DROPPED_WORDS);
            expect(wallRow(root, 'Plum Jam')?.textContent, `${pass}: the kept row keeps its attribution`).toContain(
                QUOTE_MINTED_CHIP,
            );
        }
        window.dispatchEvent(new PopStateEvent('popstate'));
        await flush();
        expect(wallCount(root, 'Plum Jam'), 'and after the good read').toBe('1');
    });

    it('a wall whose book and walk both failed, over an empty read and a standing payment, keeps the payment and the rail', async () => {
        window.history.replaceState(null, '', `${stallPath(ADDR)}?view=window&show=all&mode=browse&touch=on`);
        const good = stallEmpty({ tokens, fetch: { kind: 'empty' }, prices: new Map([[A, XEC_A], [B, XEC_B]]), window: wall('all') });
        const bookFailed: State = {
            ...stallEmpty({
                tokens: new Map(),
                fetch: { kind: 'unreachable', triedAtMs: 0, hosts: [] },
                window: wall('all'),
            }),
            // A walk that threw before it read anything: no record at all,
            // which is what the plate's comparison and the rail store would
            // have judged the seller by.
            pendingFacts: {
                stall: { address: ADDR, hash: HASH },
                pubkeyHex: PK,
                manifest: Promise.resolve(undefined),
                descriptions: Promise.resolve(emptyFailedLookup),
            },
        };
        // The wall is on the quotes (nothing is listed), and a listing lands
        // with the next good read.
        const withListing = stallEmpty({
            tokens: new Map([...tokens, [TOKEN, TOKEN_META]]),
            fetch: { kind: 'offers', offers: [OFFER] },
            prices: new Map([[A, XEC_A], [B, XEC_B]]),
            window: wall('all'),
        });
        const root = bootSequence([good, bookFailed, withListing]);
        await flush();
        pressMore(root, 'window-step-more', A);
        await flush();
        expect(wallCount(root, 'Plum Jam')).toBe('1');
        // An XEC selection asks no feed: the press composes the code at once.
        (root.querySelector('[data-role="window-pay"]') as HTMLButtonElement).click();
        await flush();
        expect(root.querySelector('[data-role="window-paying"]'), 'a payment stands').not.toBeNull();

        window.dispatchEvent(new PopStateEvent('popstate'));
        await flush();
        expect(root.textContent).not.toContain(DROPPED_WORDS);

        window.dispatchEvent(new PopStateEvent('popstate'));
        await flush();
        expect(root.querySelector('.sw-strip [data-role="seller-price"]'), 'still the quotes').not.toBeNull();
        expect(root.querySelector('.sw-strip [data-role="price"]'), 'and no listing beside them').toBeNull();
        expect(root.querySelector('[data-role="window-selection"]')?.textContent, 'with the choice on it').toContain('Plum Jam');
        expect(wallCount(root, 'Plum Jam'), 'the choice stands over a failed book and walk').toBe('1');
        expect(root.querySelector('[data-role="window-paying"]'), 'and the payment code').not.toBeNull();
        expect(root.textContent).not.toContain(DROPPED_WORDS);
    });

    it('a phone retry on the quotes rail over a walk that failed keeps the choice', async () => {
        window.history.replaceState(null, '', stallPath(PK));
        const good = stallEmpty({ tokens, prices: new Map([[A, XEC_A], [B, XEC_B]]), shopTab: 'quotes' });
        const failed = stallEmpty({ tokens: floorTokens, prices: failedLookup.prices, descriptionsFailed: true, shopTab: 'quotes' });
        const root = bootSequence([good, failed, good]);
        await flush();
        (root.querySelector('[data-role="selection-toggle"]') as HTMLButtonElement).click();
        const more = [...root.querySelectorAll<HTMLButtonElement>('[data-role="selection-more"]')].find(
            (b) => b.getAttribute('data-focus-key') === `selection-step:${A}:more`,
        )!;
        more.click();
        expect(phoneCount(root, A)).toBe('1');

        window.dispatchEvent(new PopStateEvent('popstate'));
        await flush();
        expect(root.querySelector('[data-role="quotes-failed"]'), 'the walk failed').not.toBeNull();
        expect(root.querySelector('[data-role="selection-dropped"]'), 'nobody is told the seller took it').toBeNull();

        // The rail's own retry, over the failed read.
        (root.querySelector('.pay-sec [data-role="retry"]') as HTMLButtonElement).click();
        await flush();
        expect(phoneCount(root, A), 'the choice stands after the retry').toBe('1');
        expect(root.textContent).not.toContain(DROPPED_WORDS);
    });
});

describe('a-wall-over-records-kept-from-a-walk-that-threw-says-so', () => {
    /* Local, because this describe sits at the head of the file: every app a
       test boots stays listening, and a `popstate` reaches all of them, so
       these many-refresh tests run before the file has booted a hundred. */
    const fungible = (tokenId: string, name: string) => ({
        tokenId,
        name,
        ticker: name.slice(0, 4).toUpperCase(),
        decimals: 0,
        tokenType: { protocol: 'SLP', type: 'SLP_TOKEN_TYPE_FUNGIBLE' },
    });
    /**
     * The owner's wording (2026-09-24, "Nói rõ"): the kept records are the
     * last good read, older than the book beside them, so the status line
     * says so where the book's stamp would say "Updated just now" — and a
     * good read takes the sentence away.
     */
    const A = 'a1'.repeat(32);
    const tokens = new Map([[A, fungible(A, 'Plum Jam')]]);
    const XEC_A = { code: 'xec', exponent: 2, amount: 500_000n };

    it('prints the stale line on the quotes rail, twice in a row, and drops it on a good read', async () => {
        window.history.replaceState(null, '', `${stallPath(ADDR)}?view=window&show=quotes&mode=browse`);
        const params = { show: 'quotes' as const, mode: 'browse' as const, payCode: true, turn: 'none' as const, touch: false };
        const good = stallEmpty({ tokens, prices: new Map([[A, XEC_A]]), window: params });
        const failed = stallEmpty({ tokens: new Map(), prices: new Map(), descriptionsFailed: true, window: params });
        const root = document.createElement('div');
        const states = [good, failed, failed, good];
        let at = 0;
        boot(root, async () => states[Math.min(at++, states.length - 1)]!);
        await flush();
        const fresh = (): string | null | undefined => root.querySelector('[data-role="window-fresh"]')?.textContent;
        expect(fresh(), 'a good read carries the book stamp').toBe('Updated just now');

        for (const pass of ['the first walk that throws', 'the second in a row']) {
            window.dispatchEvent(new PopStateEvent('popstate'));
            await flush();
            expect(fresh(), pass).toBe(WINDOW_QUOTES_AS_LAST_READ);
            expect(root.querySelector('.sw-strip')?.textContent, `${pass}: the kept quote stands`).toContain('Plum Jam');
        }

        window.dispatchEvent(new PopStateEvent('popstate'));
        await flush();
        expect(fresh(), 'a good read takes it away').toBe('Updated just now');
    });
});

describe('a-choice-the-failed-read-did-not-reach-is-said-not-emptied', () => {
    /* Local, because this describe sits at the head of the file: every app a
       test boots stays listening, and a `popstate` reaches all of them, so
       these many-refresh tests run before the file has booted a hundred. */
    const fungible = (tokenId: string, name: string) => ({
        tokenId,
        name,
        ticker: name.slice(0, 4).toUpperCase(),
        decimals: 0,
        tokenType: { protocol: 'SLP', type: 'SLP_TOKEN_TYPE_FUNGIBLE' },
    });
    /**
     * The owner's wording (2026-09-24, "Nói rõ"), the critic's fifth pass
     * item 4: after a read that did not reach a chosen item the phone's
     * strip named nothing, said "1 item" over a blank total, and Pay opened
     * a sheet saying "0 items · one payment". The item is named from what
     * the page last read, the total and Pay give way to one sentence, and
     * the press is refused until a read reaches it again.
     */
    const A = 'a1'.repeat(32);
    const B = 'b2'.repeat(32);
    const XEC_A = { code: 'xec', exponent: 2, amount: 500_000n };
    const XEC_B = { code: 'xec', exponent: 2, amount: 700_000n };
    const tokens = new Map([
        [A, fungible(A, 'Plum Jam')],
        [B, fungible(B, 'Rye Flour')],
    ]);
    const bootSequence = (states: State[]): HTMLElement => {
        const root = document.createElement('div');
        let at = 0;
        boot(root, async () => states[Math.min(at++, states.length - 1)]!);
        return root;
    };

    it('on a phone: names it, says it in place of the total and Pay, and refuses the sheet', async () => {
        window.history.replaceState(null, '', stallPath(PK));
        const good = stallEmpty({ tokens, prices: new Map([[A, XEC_A], [B, XEC_B]]), shopTab: 'quotes' });
        // Exactly what `loadCurrent` answers over a walk that threw after
        // reading B: the floor's price and the floor's name, nothing of A.
        const failed = stallEmpty({
            tokens: new Map([[B, fungible(B, 'Rye Flour')]]),
            prices: new Map([[B, XEC_B]]),
            descriptionsFailed: true,
            shopTab: 'quotes',
        });
        const root = bootSequence([good, failed, good]);
        await flush();
        (root.querySelector('[data-role="selection-toggle"]') as HTMLButtonElement).click();
        [...root.querySelectorAll<HTMLButtonElement>('[data-role="selection-more"]')]
            .find((b) => b.getAttribute('data-focus-key') === `selection-step:${A}:more`)!
            .click();
        const stalePay = root.querySelector<HTMLButtonElement>('[data-role="pay-several-open"]');
        expect(stalePay, 'Pay stands over a read that reached the choice').not.toBeNull();

        window.dispatchEvent(new PopStateEvent('popstate'));
        await flush();
        const strip = root.querySelector('[data-role="selection-strip"]');
        expect(strip, 'the strip stands').not.toBeNull();
        expect(strip?.querySelector('[data-role="selection-names"]')?.textContent, 'the chosen item is named').toBe(
            'Plum Jam ×1',
        );
        expect(strip?.querySelector('[data-role="selection-unread"]')?.textContent).toBe(selectionUnread(1));
        expect(selectionUnread(1)).toBe('This page could not read 1 item you chose \u2014 try again to pay');
        expect(selectionUnread(2)).toContain('2 items you chose');
        expect(strip?.querySelector('[data-role="selection-total"]'), 'no total over part of a choice').toBeNull();
        expect(strip?.querySelector('[data-role="pay-several-open"]'), 'and no Pay').toBeNull();
        expect(root.textContent).not.toContain(DROPPED_WORDS);
        // The Pay a slow repaint left under a finger is refused too.
        stalePay!.click();
        await flush();
        expect(root.querySelector('[data-role="pay-several"]'), 'the sheet does not open').toBeNull();

        (root.querySelector('.pay-sec [data-role="retry"]') as HTMLButtonElement).click();
        await flush();
        expect(root.querySelector('[data-role="selection-unread"]'), 'a read that reaches it takes the line away').toBeNull();
        expect(root.querySelector('[data-role="selection-total"]')?.textContent).toBe('5,000.00 XEC');
        expect(root.querySelector('[data-role="pay-several-open"]'), 'and Pay is back').not.toBeNull();
    });

    it('on a touch wall: a walk that stopped at the page cap keeps the choice and refuses Pay in its own words, with no remedy', async () => {
        window.history.replaceState(null, '', `${stallPath(ADDR)}?view=window&show=quotes&mode=browse&touch=on`);
        // USD, so a press that was not refused would ask a feed.
        const USD_A = { code: 'usd', exponent: 2, amount: 500n };
        const USD_B = { code: 'usd', exponent: 2, amount: 700n };
        const params = { show: 'quotes' as const, mode: 'browse' as const, payCode: true, turn: 'none' as const, touch: true };
        const good = stallEmpty({ tokens, prices: new Map([[A, USD_A], [B, USD_B]]), window: params });
        // Our own page cap: B was reached, A lies past it.
        const truncated = stallEmpty({
            tokens: new Map([[B, fungible(B, 'Rye Flour')]]),
            prices: new Map([[B, USD_B]]),
            descriptionsTruncated: true,
            window: params,
        });
        const root = bootSequence([good, truncated, good]);
        await flush();
        [...root.querySelectorAll<HTMLButtonElement>('[data-role="window-step-more"]')]
            .find((b) => b.getAttribute('data-focus-key')?.includes(A))!
            .click();
        await flush();
        const stalePay = root.querySelector<HTMLButtonElement>('[data-role="window-pay"]');
        expect(stalePay, 'Pay stands over a read that reached the choice').not.toBeNull();
        let asked = 0;
        priceControl.fetch = async () => {
            asked += 1;
            return undefined;
        };

        window.dispatchEvent(new PopStateEvent('popstate'));
        await flush();
        const bar = root.querySelector('[data-role="window-selection"]');
        expect(bar?.textContent, 'the choice stands, named').toContain('Plum Jam ×1');
        expect(root.textContent, 'never "no longer quoted"').not.toContain(DROPPED_WORDS);
        // Past our own page cap: the heartbeat's next read stops in the same
        // place, so the sentence offers no remedy (the critic's sixth pass).
        expect(bar?.querySelector('[data-role="selection-unread"]')?.textContent).toBe(windowSelectionCapped(1));
        expect(windowSelectionCapped(1)).not.toMatch(/comes back|try again/);
        expect(bar?.querySelector('[data-role="selection-total"]'), 'no total').toBeNull();
        expect(root.querySelector('[data-role="window-pay"]'), 'and no Pay').toBeNull();
        expect(root.querySelector('[data-role="window-clear"]'), 'Clear all stays').not.toBeNull();
        // The Pay a slow repaint left under a finger is refused too: no feed
        // is asked for a code over part of a choice.
        stalePay!.click();
        await flush();
        expect(asked, 'no feed is asked').toBe(0);
        expect(root.querySelector('[data-role="window-pay-why"]'), 'and nothing is said to be asked').toBeNull();

        window.dispatchEvent(new PopStateEvent('popstate'));
        await flush();
        expect(root.querySelector('[data-role="window-pay"]'), 'Pay is back when the read reaches it').not.toBeNull();
        expect(root.querySelector('[data-role="selection-unread"]')).toBeNull();
    });
});


describe('a-walk-that-threw-keeps-the-records-per-token', () => {
    /* Local, because this describe sits at the head of the file: every app a
       test boots stays listening, and a `popstate` reaches all of them. */
    const fungible = (tokenId: string, name: string) => ({
        tokenId,
        name,
        ticker: name.slice(0, 4).toUpperCase(),
        decimals: 0,
        tokenType: { protocol: 'SLP', type: 'SLP_TOKEN_TYPE_FUNGIBLE' },
    });
    /**
     * The critic's sixth pass (2026-09-24), P1: a wall walk that throws read
     * the NEWEST records first, so what it resolved before the throw is the
     * seller's latest word — and the wall kept the last good read whole over
     * it: an older figure on the row and a payment composed at it, or an
     * item the seller had removed still on offer. Per token now: what the
     * walk resolved wins, a removal included, and the kept records fill only
     * the tokens it never reached; the stale line stands only while one of
     * those is shown. Item 7: a book that failed beside the walk keeps the
     * records the same way, and a live walk that throws says it left older
     * records. Owner's (f): a chosen item this screen cannot read closes the
     * payment code.
     */
    const A = 'a1'.repeat(32);
    const B = 'b2'.repeat(32);
    const XEC_A = { code: 'xec', exponent: 2, amount: 500_000n };
    const XEC_A_NEWER = { code: 'xec', exponent: 2, amount: 900_000n };
    const XEC_B = { code: 'xec', exponent: 2, amount: 700_000n };
    const tokens = new Map([
        [A, fungible(A, 'Plum Jam')],
        [B, fungible(B, 'Rye Flour')],
    ]);
    const genesis = new Map([
        [A, 'attributed' as const],
        [B, 'attributed' as const],
    ]);
    const wall = { show: 'quotes' as const, mode: 'browse' as const, payCode: true, turn: 'none' as const, touch: true };
    const bootSequence = (states: State[]): HTMLElement => {
        const root = document.createElement('div');
        let at = 0;
        boot(root, async () => states[Math.min(at++, states.length - 1)]!);
        return root;
    };
    const wallRow = (root: HTMLElement, name: string): Element | undefined =>
        [...root.querySelectorAll('.sw-strip .sw-row, .sw-strip .item')].find((row) => row.textContent?.includes(name));
    const plate = (root: HTMLElement): Element | null => root.querySelector('[data-role="window-paying"]');
    const fresh = (root: HTMLElement): string | null | undefined =>
        root.querySelector('[data-role="window-fresh"]')?.textContent;
    const choose = async (root: HTMLElement, tokenId: string): Promise<void> => {
        const more = [...root.querySelectorAll<HTMLButtonElement>('[data-role="window-step-more"]')].find((b) =>
            b.getAttribute('data-focus-key')?.includes(tokenId),
        );
        if (more === undefined) {
            throw new Error(`no + for ${tokenId}`);
        }
        more.click();
        await flush();
    };
    const pay = async (root: HTMLElement): Promise<void> => {
        (root.querySelector('[data-role="window-pay"]') as HTMLButtonElement).click();
        await flush();
    };
    const good = (): State =>
        stallEmpty({ tokens, genesis, prices: new Map([[A, XEC_A], [B, XEC_B]]), window: wall });

    it('a-walk-that-threw-after-a-newer-quote-shows-the-newer-quote', async () => {
        window.history.replaceState(null, '', `${stallPath(ADDR)}?view=window&show=quotes&mode=browse&touch=on`);
        // Exactly what `loadCurrent` answers when the walk read A's newer
        // record on its first page and threw before it reached B.
        const failed = stallEmpty({
            tokens: new Map([[A, fungible(A, 'Plum Jam')]]),
            genesis: new Map([[A, 'attributed' as const]]),
            prices: new Map([[A, XEC_A_NEWER]]),
            descriptionsFailed: true,
            descriptionsDecided: new Set([A]),
            window: wall,
        });
        const root = bootSequence([good(), failed, failed]);
        await flush();
        await choose(root, A);
        await pay(root);
        expect(plate(root)?.getAttribute('data-pay-uri'), 'the code pays the figure read').toContain('amount=5000.00');

        window.dispatchEvent(new PopStateEvent('popstate'));
        await flush();
        expect(wallRow(root, 'Plum Jam')?.textContent, 'the row shows the figure the walk read').toContain('9,000.00');
        expect(wallRow(root, 'Plum Jam')?.textContent, 'and never the older one').not.toContain('5,000.00');
        expect(plate(root), 'the code at the older figure is closed').toBeNull();
        expect(wallRow(root, 'Rye Flour'), 'the record it never reached is kept').not.toBeUndefined();
        // One row read now, one kept: "some quotes", never a claim that the
        // quote read just now is an old one (the critic's eighth pass, item 5).
        expect(fresh(root), 'and said to be, of some quotes').toBe(WINDOW_SOME_QUOTES_AS_LAST_READ);
        expect(WINDOW_SOME_QUOTES_AS_LAST_READ).not.toBe(WINDOW_QUOTES_AS_LAST_READ);

        await pay(root);
        expect(plate(root)?.getAttribute('data-pay-uri'), 'a new press composes the newer figure').toContain(
            'amount=9000.00',
        );
    });

    it('a-walk-that-threw-after-a-removal-offers-nothing', async () => {
        window.history.replaceState(null, '', `${stallPath(ADDR)}?view=window&show=quotes&mode=browse&touch=on`);
        // The walk read A's removal (a tombstone: in no map, only resolved)
        // and threw before it reached B.
        const removed = stallEmpty({
            tokens: new Map(),
            prices: new Map(),
            descriptionsFailed: true,
            descriptionsDecided: new Set([A]),
            window: wall,
        });
        const root = bootSequence([good(), removed, removed]);
        await flush();
        await choose(root, A);
        await pay(root);
        expect(plate(root), 'a payment stands').not.toBeNull();

        window.dispatchEvent(new PopStateEvent('popstate'));
        await flush();
        expect(wallRow(root, 'Plum Jam'), 'the removed item is not on offer').toBeUndefined();
        expect(root.querySelector('[data-role="window-selection"]')?.textContent ?? '', 'nor in the choice').not.toContain(
            'Plum Jam',
        );
        expect(plate(root), 'nor in a code').toBeNull();
        expect(root.textContent, 'the seller removed it, and that is said').toContain(SELECTION_DROPPED);
        expect(wallRow(root, 'Rye Flour'), 'the record it never reached is kept').not.toBeUndefined();
        expect(fresh(root)).toBe(WINDOW_QUOTES_AS_LAST_READ);
    });

    it('a removal a walk reached before our page cap takes the item out as a finished read would', async () => {
        window.history.replaceState(null, '', `${stallPath(ADDR)}?view=window&show=quotes&mode=browse&touch=on`);
        // The walk finished at our cap: A's removal was on a page it read.
        const cappedRemoval = stallEmpty({
            tokens: new Map([[B, fungible(B, 'Rye Flour')]]),
            genesis: new Map([[B, 'attributed' as const]]),
            prices: new Map([[B, XEC_B]]),
            descriptionsTruncated: true,
            descriptionsDecided: new Set([A, B]),
            window: wall,
        });
        const root = bootSequence([good(), cappedRemoval]);
        await flush();
        await choose(root, A);
        await pay(root);
        expect(plate(root), 'a payment stands').not.toBeNull();
        window.dispatchEvent(new PopStateEvent('popstate'));
        await flush();
        expect(root.textContent, 'the seller removed it, and that is said').toContain(SELECTION_DROPPED);
        expect(root.querySelector('[data-role="selection-unread"]'), 'never "past our cap"').toBeNull();
        expect(plate(root), 'and the code is closed').toBeNull();
    });

    it('says nothing is as last read when the walk resolved everything the wall shows', async () => {
        window.history.replaceState(null, '', `${stallPath(ADDR)}?view=window&show=quotes&mode=browse`);
        const params = { ...wall, touch: false };
        // A removal of A and B's record, both resolved before the throw.
        const allRead = stallEmpty({
            tokens: new Map([[B, fungible(B, 'Rye Flour')]]),
            genesis: new Map([[B, 'attributed' as const]]),
            prices: new Map([[B, XEC_B]]),
            descriptionsFailed: true,
            descriptionsDecided: new Set([A, B]),
            window: params,
        });
        const root = bootSequence([
            stallEmpty({ tokens, genesis, prices: new Map([[A, XEC_A], [B, XEC_B]]), window: params }),
            allRead,
        ]);
        await flush();
        window.dispatchEvent(new PopStateEvent('popstate'));
        await flush();
        expect(wallRow(root, 'Plum Jam')).toBeUndefined();
        expect(wallRow(root, 'Rye Flour')).not.toBeUndefined();
        expect(fresh(root), 'nothing kept is shown, so nothing is said to be').toBe('Updated just now');
    });

    it('says nothing is as last read when what was kept is not on the quotes rail', async () => {
        window.history.replaceState(null, '', `${stallPath(ADDR)}?view=window&show=quotes&mode=browse`);
        const params = { ...wall, touch: false };
        // A carries words and no figure, so it is no quote row; B is read now.
        const threw = stallEmpty({
            tokens,
            genesis,
            prices: new Map([[B, XEC_B]]),
            descriptionsFailed: true,
            descriptionsDecided: new Set([B]),
            window: params,
        });
        const root = bootSequence([
            stallEmpty({
                tokens,
                genesis,
                descriptions: new Map([[A, 'Words alone']]),
                prices: new Map([[B, XEC_B]]),
                window: params,
            }),
            threw,
        ]);
        await flush();
        window.dispatchEvent(new PopStateEvent('popstate'));
        await flush();
        expect(viewOf(root)?.recordsStale, 'a kept record is shown').toBe(true);
        expect(wallRow(root, 'Rye Flour')).not.toBeUndefined();
        expect(fresh(root), 'but every quote on the rail was read now').toBe('Updated just now');
    });

    it('a wall whose book and walk both failed keeps the records and says so', async () => {
        window.history.replaceState(null, '', `${stallPath(ADDR)}?view=window&show=quotes&mode=browse`);
        const params = { ...wall, touch: false };
        const bookFailed: State = {
            ...stallEmpty({ tokens: new Map(), fetch: { kind: 'unreachable', triedAtMs: 0, hosts: [] }, window: params }),
            pendingFacts: {
                stall: { address: ADDR, hash: HASH },
                pubkeyHex: PK,
                manifest: Promise.resolve(undefined),
                descriptions: Promise.resolve({
                    descriptions: new Map<string, string>(),
                    shelves: new Map<string, string>(),
                    prices: new Map(),
                    quoteTimes: new Map<string, number>(),
                    decided: new Set<string>(),
                    unreadable: new Set<string>(),
                    truncated: false,
                    failed: true,
                    genesis: new Map(),
                }),
            },
        };
        const root = bootSequence([
            stallEmpty({ tokens, genesis, prices: new Map([[A, XEC_A], [B, XEC_B]]), window: params }),
            bookFailed,
        ]);
        await flush();
        window.dispatchEvent(new PopStateEvent('popstate'));
        await flush();
        expect(wallRow(root, 'Plum Jam'), 'the kept quotes stand').not.toBeUndefined();
        expect(wallRow(root, 'Rye Flour')).not.toBeUndefined();
        expect(fresh(root), 'as last read').toBe(WINDOW_QUOTES_AS_LAST_READ);
    });

    it('a walk that threw on the facts road still lands the genesis it passed', async () => {
        // The eighth pass, item 11: the whole-answer road folds a walk's free
        // genesis answers into the session; the kept road did not, so a
        // token the walk resolved lost its attribution on a wall whose book
        // and walk both failed.
        window.history.replaceState(null, '', `${stallPath(ADDR)}?view=window&show=quotes&mode=browse`);
        const params = { ...wall, touch: false };
        const C = 'c3'.repeat(32);
        const bookFailed: State = {
            ...stallEmpty({
                tokens: new Map([[C, fungible(C, 'Oat Milk')]]),
                fetch: { kind: 'unreachable', triedAtMs: 0, hosts: [] },
                window: params,
            }),
            pendingFacts: {
                stall: { address: ADDR, hash: HASH },
                pubkeyHex: PK,
                manifest: Promise.resolve(undefined),
                descriptions: Promise.resolve({
                    descriptions: new Map<string, string>(),
                    shelves: new Map<string, string>(),
                    prices: new Map([[C, XEC_B]]),
                    quoteTimes: new Map<string, number>(),
                    decided: new Set<string>([C]),
                    unreadable: new Set<string>(),
                    truncated: false,
                    failed: true,
                    genesis: new Map([[C, 'attributed' as const]]),
                }),
            },
        };
        const root = bootSequence([
            stallEmpty({ tokens, genesis, prices: new Map([[A, XEC_A], [B, XEC_B]]), window: params }),
            bookFailed,
        ]);
        await flush();
        window.dispatchEvent(new PopStateEvent('popstate'));
        await flush();
        expect(wallRow(root, 'Oat Milk'), 'the record the walk read is on the wall').not.toBeUndefined();
        expect(viewOf(root)?.genesis?.get(C), 'with the genesis it passed').toBe('attributed');
        expect(wallRow(root, 'Oat Milk')?.textContent).toContain(QUOTE_MINTED_CHIP);
    });

    it('a live walk that throws leaves the older records and says so', async () => {
        window.history.replaceState(null, '', `${stallPath(ADDR)}?view=window&show=quotes&mode=browse`);
        const params = { ...wall, touch: false };
        const root = bootStall(stallEmpty({ tokens, genesis, prices: new Map([[A, XEC_A]]), window: params })).root;
        await flush();
        expect(fresh(root)).toBe('Updated just now');
        chain.historyThrows = true;
        chain.txThrows = true;
        watches[0]!.hooks.onBurst?.(['0a'.repeat(32)]);
        await flush();
        expect(chain.calls.stld, 'it did try').toBe(1);
        expect(wallRow(root, 'Plum Jam'), 'the older record stays').not.toBeUndefined();
        expect(fresh(root), 'and is said to be older').toBe(WINDOW_QUOTES_AS_LAST_READ);
    });

    /** A record the stall signed, mined at `height` and first seen at `seen`. */
    const record = (txid: string, hex: string | undefined, height: number, seen?: number): ChainTx => {
        if (hex === undefined) {
            throw new Error('fixture is not encodable');
        }
        return {
            ...signedTx({ txid, outputs: [`6a${hex}`], height }),
            ...(seen === undefined ? {} : { timeFirstSeen: seen }),
        };
    };
    /** A live walk whose page 0 answers `first` and whose page 1 throws. */
    const liveWalkThatThrows = async (first: ChainTx[]): Promise<void> => {
        for (const tx of first) {
            chain.txs.set(tx.txid, tx);
        }
        chain.historyPages = [first, []];
        chain.historyPageThrows = new Set([1]);
        watches[0]!.hooks.onBurst?.([first[0]!.txid]);
        await flush();
        expect(chain.historyPageCalls, 'the walk reached the page that threw').toContain(1);
    };
    const pressForUrl = (root: HTMLElement, scope: string): string | undefined => {
        const open = vi.spyOn(window, 'open').mockImplementation(() => null);
        try {
            const control = root.querySelector(`[data-role="${scope}"] [data-role="pay-cashtab"]`) as HTMLElement | null;
            expect(control, `${scope} carries a Pay control`).not.toBeNull();
            control!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            const call = open.mock.calls[0];
            return call === undefined ? undefined : String(call[0]);
        } finally {
            open.mockRestore();
        }
    };

    describe('on a phone, a live walk that threw is merged per token (the eighth pass, item 3)', () => {
        /**
         * A phone has no heartbeat: until 2026-09-25 a live walk that threw
         * was refused whole, so the records on screen stood — an older figure
         * the walk had read past, an item the seller had removed — until the
         * reader reloaded, and Pay and Pay several composed them. Now the
         * walk's answer is merged over the records on screen per token.
         */
        const phone = (): State =>
            stallEmpty({ tokens, genesis, prices: new Map([[A, XEC_A], [B, XEC_B]]), shopTab: 'quotes' });
        const newerA = (): ChainTx => record('7a'.repeat(32), encodeDescriptionHex(A, 'Plum Jam', { price: XEC_A_NEWER }), 7);
        const removeB = (): ChainTx => record('7b'.repeat(32), encodeRemovalHex(B), 7);

        it('Pay composes the figure the walk read, and the removed item has no Pay', async () => {
            const { root } = bootStall(phone());
            await flush();
            expect(root.querySelectorAll('[data-role="pay-open"]').length).toBe(2);
            await liveWalkThatThrows([newerA(), removeB()]);

            const opens = root.querySelectorAll<HTMLButtonElement>('[data-role="pay-open"]');
            expect(opens.length, 'the removed item offers no Pay').toBe(1);
            expect(root.textContent, 'nor its name').not.toContain('Rye Flour');
            opens[0]!.click();
            await flush();
            expect(root.querySelector('[data-role="pay"] [data-role="price"]')?.textContent).toBe('9,000');
            const url = pressForUrl(root, 'pay');
            expect(url, 'the link carries the figure the walk read').toContain('amount=9000.00');
            expect(url, 'never the one it read past').not.toContain('amount=5000.00');
        });

        it('Pay several drops the removed item and composes the newer figure', async () => {
            const { root } = bootStall(phone());
            await flush();
            (root.querySelector('[data-role="selection-toggle"]') as HTMLButtonElement).click();
            for (const tokenId of [A, B]) {
                [...root.querySelectorAll<HTMLButtonElement>('[data-role="selection-more"]')]
                    .find((b) => b.getAttribute('data-focus-key') === `selection-step:${tokenId}:more`)!
                    .click();
            }
            expect(viewOf(root)?.selection?.size).toBe(2);
            await liveWalkThatThrows([newerA(), removeB()]);

            expect(viewOf(root)?.selection?.has(B), 'the removed item leaves the choice').toBe(false);
            expect(root.querySelector('[data-role="selection-dropped"]')?.textContent).toBe(selectionDroppedItems('Rye Flour', 1));
            (root.querySelector('[data-role="pay-several-open"]') as HTMLButtonElement).click();
            await flush();
            const sheet = root.querySelector('[data-role="pay-several"]');
            expect(sheet?.querySelector('[data-role="price"]')?.textContent).toBe('9,000');
            expect(sheet?.querySelector('[data-role="pay-lines"]')?.textContent ?? '').not.toContain('Rye Flour');
            const url = pressForUrl(root, 'pay-several');
            expect(url).toContain('amount=9000.00');
        });

        it('keeps what the walk never reached, and says it is as last read', async () => {
            const { root } = bootStall(phone());
            await flush();
            await liveWalkThatThrows([newerA()]);
            expect(viewOf(root)?.prices?.get(A)).toEqual(XEC_A_NEWER);
            expect(viewOf(root)?.prices?.get(B), 'B was never reached').toEqual(XEC_B);
            expect(viewOf(root)?.recordsStale).toBe(true);
        });
    });

    describe('a-newer-edit-mined-a-block-early-outranks-a-walk-that-threw-before-it', () => {
        /**
         * The critic's eighth pass, item 4. A walk reads newest BLOCK first,
         * but two settled records rank by first sighting before height
         * (`compareManifestRank`): the seller's newer edit, mined in block 5,
         * sits on a later page than their older edit mined in block 6. A
         * walk that finishes reads both and shows the newer; a walk that
         * throws before the page holding it decided the token at the OLDER
         * record — and the per-token merge used to hand it the token. The
         * winner's rank rides the records now, and the higher one wins.
         */
        const OLDER_SEEN = 1_756_400_000;
        const NEWER_SEEN = 1_756_400_600;
        const olderAt6 = (): ChainTx =>
            record('6a'.repeat(32), encodeDescriptionHex(A, 'Plum Jam', { price: XEC_A }), 6, OLDER_SEEN);
        const newerAt5 = (): ChainTx =>
            record('5a'.repeat(32), encodeDescriptionHex(A, 'Plum Jam', { price: XEC_A_NEWER }), 5, NEWER_SEEN);

        it('on the live road', async () => {
            const { root } = bootStall(stallEmpty({ tokens, genesis, prices: new Map([[A, XEC_A]]), shopTab: 'quotes' }));
            await flush();
            // A walk that finishes: both edits read, the newer wins.
            const older = olderAt6();
            const newer = newerAt5();
            chain.txs.set(older.txid, older);
            chain.txs.set(newer.txid, newer);
            chain.historyPages = [[older], [newer]];
            watches[0]!.hooks.onBurst?.([older.txid]);
            await flush();
            expect(viewOf(root)?.prices?.get(A), 'a finished walk shows the newer edit').toEqual(XEC_A_NEWER);

            // The same walk, and the page holding the newer edit throws.
            chain.historyPageThrows = new Set([1]);
            watches[0]!.hooks.onBurst?.([older.txid]);
            await flush();
            expect(chain.historyPageCalls.filter((p) => p === 1).length, 'the second walk reached page 1').toBe(2);
            expect(viewOf(root)?.prices?.get(A), 'the older edit the walk decided does not win').toEqual(XEC_A_NEWER);
        });

        it('through the real load, on a wall re-reading its stall', async () => {
            // `loadCurrent` itself must carry the walk's ranks onto the view,
            // or the kept read has nothing to compare.
            window.history.replaceState(null, '', `${stallPath(ADDR)}?view=window&show=quotes&mode=browse`);
            chain.genesis.set(A, {
                genesisInfo: { tokenName: 'Plum Jam', tokenTicker: 'PLUM', decimals: 0, url: '' },
                tokenType: { protocol: 'SLP', type: 'SLP_TOKEN_TYPE_FUNGIBLE' },
            });
            const older = olderAt6();
            const newer = newerAt5();
            chain.txs.set(older.txid, older);
            chain.txs.set(newer.txid, newer);
            chain.historyPages = [[older], [newer]];
            const root = document.createElement('div');
            boot(root);
            await flush();
            expect(wallRow(root, 'Plum Jam')?.textContent, 'a finished walk shows the newer edit').toContain('9,000.00');

            chain.historyPageThrows = new Set([1]);
            window.dispatchEvent(new PopStateEvent('popstate'));
            await flush();
            expect(chain.historyPageCalls.filter((p) => p === 1).length, 'the re-read reached page 1').toBeGreaterThan(1);
            expect(wallRow(root, 'Plum Jam')?.textContent, 'the newer edit stands').toContain('9,000.00');
            expect(wallRow(root, 'Plum Jam')?.textContent).not.toContain('5,000.00');
        });

        it('on a wall re-reading its stall', async () => {
            window.history.replaceState(null, '', `${stallPath(ADDR)}?view=window&show=quotes&mode=browse&touch=on`);
            const rankOf = (tx: ChainTx) => ({
                height: tx.block?.height,
                isFinal: false,
                txid: tx.txid,
                firstSeen: tx.timeFirstSeen,
            });
            const finished = stallEmpty({
                ...good().view,
                descriptionsDecided: new Set([A, B]),
                prices: new Map([[A, XEC_A_NEWER], [B, XEC_B]]),
                descriptionRanks: new Map([[A, rankOf(newerAt5())]]),
            });
            // What `loadCurrent` answers when the walk read block 6 and threw.
            const threw = stallEmpty({
                tokens: new Map([[A, fungible(A, 'Plum Jam')]]),
                genesis: new Map([[A, 'attributed' as const]]),
                prices: new Map([[A, XEC_A]]),
                descriptionsFailed: true,
                descriptionsDecided: new Set([A]),
                descriptionRanks: new Map([[A, rankOf(olderAt6())]]),
                window: wall,
            });
            const root = bootSequence([finished, threw]);
            await flush();
            expect(wallRow(root, 'Plum Jam')?.textContent).toContain('9,000.00');
            window.dispatchEvent(new PopStateEvent('popstate'));
            await flush();
            expect(wallRow(root, 'Plum Jam')?.textContent, 'the newer edit stands').toContain('9,000.00');
            expect(wallRow(root, 'Plum Jam')?.textContent).not.toContain('5,000.00');
            expect(fresh(root), 'it came from the kept read, and is said to be').toBe(WINDOW_QUOTES_AS_LAST_READ);
        });
    });

    it('a wall payment closes when a chosen item cannot be read', async () => {
        window.history.replaceState(null, '', `${stallPath(ADDR)}?view=window&show=quotes&mode=browse&touch=on`);
        // Our own page cap, B reached and A past it: the slot goes back to
        // the shop's code (the owner's (f), 2026-09-24).
        const capped = stallEmpty({
            tokens: new Map([[B, fungible(B, 'Rye Flour')]]),
            genesis: new Map([[B, 'attributed' as const]]),
            prices: new Map([[B, XEC_B]]),
            descriptionsTruncated: true,
            descriptionsDecided: new Set([B]),
            window: wall,
        });
        // A record whose genesis never arrived: our gap, a later read may fill it.
        const noGenesis = stallEmpty({
            tokens: new Map([[B, fungible(B, 'Rye Flour')]]),
            genesis: new Map([[B, 'attributed' as const]]),
            prices: new Map([[A, XEC_A], [B, XEC_B]]),
            window: wall,
        });
        for (const [label, after, said] of [
            ['past the cap', capped, windowSelectionCapped(1)],
            ['no genesis', noGenesis, windowSelectionUnread(1)],
        ] as const) {
            const root = bootSequence([good(), after]);
            await flush();
            await choose(root, A);
            await pay(root);
            expect(plate(root), `${label}: a payment stands`).not.toBeNull();
            window.dispatchEvent(new PopStateEvent('popstate'));
            await flush();
            expect(plate(root), `${label}: the code is closed`).toBeNull();
            expect(root.querySelector('[data-role="window-shop-code"], .sw-plate'), `${label}: the shop's code is back`).not.toBeNull();
            expect(root.querySelector('[data-role="selection-unread"]')?.textContent, label).toBe(said);
            expect(root.querySelector('[data-role="window-pay"]'), `${label}: and no Pay`).toBeNull();
        }
    });
});

describe('a-walk-behind-the-screen-does-not-erase-a-newer-quote', () => {
    /**
     * The critic, CARRYOVER-2 item 4, on a phone's live road. A walk that
     * FINISHED was applied whole over the records on screen: a lagging
     * replica that had not seen the seller's newest record answered an
     * older one — a figure, or an old tombstone — and took the newer quote
     * off the rail (or emptied it), and a walk that stopped at our own page
     * cap after resolving only a removal took every quote it never reached
     * off with it. Per token now (`mergeFinishedRead`): an answer below the
     * rank on screen (`descriptionRanks`) is refused for that token, and a
     * walk — capped or read to the end — removes only the tokens it decided
     * (CRITIC-CARRYOVER-3 item 3).
     */
    const fungible = (tokenId: string, name: string) => ({
        tokenId,
        name,
        ticker: name.slice(0, 4).toUpperCase(),
        decimals: 0,
        tokenType: { protocol: 'SLP', type: 'SLP_TOKEN_TYPE_FUNGIBLE' },
    });
    const A = 'c1'.repeat(32);
    const B = 'c2'.repeat(32);
    const XEC_A_OLD = { code: 'xec', exponent: 2, amount: 500_000n };
    const XEC_A_NEWER = { code: 'xec', exponent: 2, amount: 900_000n };
    const XEC_B = { code: 'xec', exponent: 2, amount: 700_000n };
    const tokens = new Map([
        [A, fungible(A, 'Plum Jam')],
        [B, fungible(B, 'Rye Flour')],
    ]);
    const genesis = new Map([
        [A, 'attributed' as const],
        [B, 'attributed' as const],
    ]);
    /** A record the stall signed, mined at `height` and first seen at `seen`. */
    const record = (txid: string, hex: string | undefined, height: number, seen: number): ChainTx => {
        if (hex === undefined) {
            throw new Error('fixture is not encodable');
        }
        return { ...signedTx({ txid, outputs: [`6a${hex}`], height }), timeFirstSeen: seen };
    };
    const newerA = () => record('9a'.repeat(32), encodeDescriptionHex(A, 'Plum Jam', { price: XEC_A_NEWER }), 9, 1_756_400_600);
    const recB = () => record('8b'.repeat(32), encodeDescriptionHex(B, 'Rye Flour', { price: XEC_B }), 8, 1_756_400_500);
    /** A walk of `pages`, woken by the socket on every open watch. */
    const walk = async (pages: ChainTx[][]): Promise<void> => {
        for (const page of pages) {
            for (const tx of page) {
                chain.txs.set(tx.txid, tx);
            }
        }
        chain.historyPages = pages;
        const first = pages.flat()[0]!;
        for (const watch of watches.filter((w) => !w.closed)) {
            watch.hooks.onBurst?.([first.txid]);
        }
        await flush();
    };
    /** The rail after a finished walk read the seller's newest records: Plum Jam at 9,000, Rye Flour at 7,000. */
    const onScreen = async (): Promise<HTMLElement> => {
        const { root } = bootStall(stallEmpty({ tokens, genesis, shopTab: 'quotes' }));
        await flush();
        await walk([[newerA(), recB()]]);
        expect(viewOf(root)?.prices?.get(A), 'the newest record is on screen').toEqual(XEC_A_NEWER);
        expect(viewOf(root)?.descriptionRanks?.get(A)?.height).toBe(9);
        // The opening side was decided before anything was quoted: the
        // reader turns to the quotes.
        (root.querySelector('[data-role="shop-tab-quotes"]') as HTMLButtonElement).click();
        await flush();
        expect(root.querySelectorAll('[data-role="pay-open"]').length, 'both quotes are rows').toBe(2);
        return root;
    };
    const payFigureOf = async (root: HTMLElement, name: string): Promise<string | undefined> => {
        const row = [...root.querySelectorAll('.item')].find((r) => r.textContent?.includes(name));
        const open = row?.querySelector<HTMLButtonElement>('[data-role="pay-open"]');
        if (open === undefined || open === null) {
            return undefined;
        }
        open.click();
        await flush();
        const figure = root.querySelector('[data-role="pay"] [data-role="price"]')?.textContent ?? undefined;
        (root.querySelector('[data-role="publish-close"]') as HTMLButtonElement | null)?.click();
        await flush();
        return figure;
    };

    it('a lagging replica’s older figure does not take the newer one off the rail', async () => {
        const root = await onScreen();
        const olderA = record('6a'.repeat(32), encodeDescriptionHex(A, 'Plum Jam', { price: XEC_A_OLD }), 6, 1_756_400_000);
        await walk([[olderA, recB()]]);
        expect(chain.historyPageCalls, 'the walk ran').toContain(0);
        expect(viewOf(root)?.prices?.get(A), 'the newer figure stands').toEqual(XEC_A_NEWER);
        expect(await payFigureOf(root, 'Plum Jam'), 'and Pay composes it').toBe('9,000');
    });

    it('a lagging replica’s old tombstone does not empty the rail', async () => {
        const root = await onScreen();
        const tombA = record('6b'.repeat(32), encodeRemovalHex(A), 6, 1_756_400_000);
        await walk([[tombA, recB()]]);
        expect(viewOf(root)?.prices?.get(A), 'the quote stays on the rail').toEqual(XEC_A_NEWER);
        expect(await payFigureOf(root, 'Plum Jam')).toBe('9,000');
    });

    it('a walk capped after a removal keeps every quote it never reached', async () => {
        const root = await onScreen();
        const removeB = record('ab'.repeat(32), encodeRemovalHex(B), 10, 1_756_400_900);
        // Page 0 holds the removal; past our page cap, the walk never
        // reaches the pages that hold A's record.
        await walk([[removeB], ...Array.from({ length: 11 }, () => [] as ChainTx[])]);
        expect(viewOf(root)?.descriptionsTruncated, 'the walk stopped at our cap').toBe(true);
        expect(viewOf(root)?.prices?.has(B), 'the removal it read is applied').toBe(false);
        expect(viewOf(root)?.prices?.get(A), 'the quote past the cap stays').toEqual(XEC_A_NEWER);
        expect(root.textContent).not.toContain('Rye Flour');
        expect(await payFigureOf(root, 'Plum Jam')).toBe('9,000');
    });

    it('a-replica-that-never-saw-the-record-does-not-remove-it: a walk that read to the end and never met a quote leaves it', async () => {
        // The owner, CRITIC-CARRYOVER-3 item 3: a replica that has Rye
        // Flour's record and never saw Plum Jam's answers a finished walk
        // that decided Rye Flour alone. Absence is our gap.
        const root = await onScreen();
        await walk([[recB()]]);
        expect(chain.historyPageCalls, 'the walk ran').toContain(0);
        expect(viewOf(root)?.descriptionsTruncated, 'it read to the end').not.toBe(true);
        expect(viewOf(root)?.prices?.get(A), 'the quote stays').toEqual(XEC_A_NEWER);
        expect(await payFigureOf(root, 'Plum Jam'), 'and Pay composes it').toBe('9,000');
    });

    it('a finished walk at or above the rank on screen is applied, a removal included', async () => {
        const root = await onScreen();
        const tombA = record('ac'.repeat(32), encodeRemovalHex(A), 10, 1_756_400_900);
        await walk([[tombA, recB()]]);
        expect(viewOf(root)?.prices?.has(A), 'the seller’s newer removal takes it off').toBe(false);
        expect(viewOf(root)?.prices?.get(B)).toEqual(XEC_B);
    });
});

describe('a-removed-item-never-comes-back-into-pay-several', () => {
    /**
     * The critic, CRITIC-CARRYOVER-4 item 3, through the real app (the
     * sheet's half — never composing an item it saw leave — is in
     * render.test.ts under the same name). Pay several over Roasted Beans at
     * 5,000 and Green Tea at 3,000; a walk read to the end decides Roasted
     * Beans' removal; then a walk stops at our page cap before the page
     * that holds it. The finished road's `descriptionsDecided` was this
     * walk's decided set and the tokens kept from the screen's MAPS — never
     * a removal, which no map shows — so Roasted Beans read as our gap: the
     * prune kept it chosen, and the sheet the app painted next could not
     * compose a choice holding an item with no record (the strip said this
     * page "could not read" it). The screen holds its tombstone's rank, and
     * that is a decision: it stays decided, and out.
     */
    const fungible = (tokenId: string, name: string) => ({
        tokenId,
        name,
        ticker: name.slice(0, 4).toUpperCase(),
        decimals: 0,
        tokenType: { protocol: 'SLP', type: 'SLP_TOKEN_TYPE_FUNGIBLE' },
    });
    const A = 'd1'.repeat(32);
    const B = 'd2'.repeat(32);
    const XEC_A = { code: 'xec', exponent: 2, amount: 500_000n };
    const XEC_B = { code: 'xec', exponent: 2, amount: 300_000n };
    const XEC_B_MOVED = { code: 'xec', exponent: 2, amount: 350_000n };
    const record = (txid: string, hex: string | undefined, height: number, seen: number): ChainTx => {
        if (hex === undefined) {
            throw new Error('fixture is not encodable');
        }
        return { ...signedTx({ txid, outputs: [`6a${hex}`], height }), timeFirstSeen: seen };
    };
    /** A walk of `pages`, woken by the socket on every open watch. */
    const walk = async (pages: ChainTx[][]): Promise<void> => {
        for (const page of pages) {
            for (const tx of page) {
                chain.txs.set(tx.txid, tx);
            }
        }
        chain.historyPages = pages;
        const first = pages.flat()[0]!;
        for (const watch of watches.filter((w) => !w.closed)) {
            watch.hooks.onBurst?.([first.txid]);
        }
        await flush();
    };
    const figureOf = (root: HTMLElement): string | undefined =>
        root.querySelector('[data-role="pay-several"] [data-role="price"]')?.textContent ?? undefined;
    const press = (root: HTMLElement): string | undefined => {
        const open = vi.spyOn(window, 'open').mockImplementation(() => null);
        try {
            const control = root.querySelector('[data-role="pay-several"] [data-role="pay-cashtab"]') as HTMLElement | null;
            expect(control, 'the sheet carries a Pay control').not.toBeNull();
            control!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            const call = open.mock.calls[0];
            return call === undefined ? undefined : String(call[0]);
        } finally {
            open.mockRestore();
        }
    };

    for (const road of ['unchanged', 'moved'] as const) {
        it(`Green Tea ${road} on the capped read: in place, and on the sheet the app paints next, Roasted Beans stays out`, async () => {
            const { root } = bootStall(
                stallEmpty({
                    tokens: new Map([[A, fungible(A, 'Roasted Beans')], [B, fungible(B, 'Green Tea')]]),
                    prices: new Map([[A, XEC_A], [B, XEC_B]]),
                    shopTab: 'quotes',
                }),
            );
            await flush();
            (root.querySelector('[data-role="selection-toggle"]') as HTMLButtonElement).click();
            for (const tokenId of [A, B]) {
                [...root.querySelectorAll<HTMLButtonElement>('[data-role="selection-more"]')]
                    .find((b) => b.getAttribute('data-focus-key') === `selection-step:${tokenId}:more`)!
                    .click();
            }
            (root.querySelector('[data-role="pay-several-open"]') as HTMLButtonElement).click();
            await flush();
            expect(figureOf(root)).toBe('8,000');

            // A walk read to the end decides the removal.
            await walk([[
                record('e1'.repeat(32), encodeRemovalHex(A), 10, 1_756_400_900),
                record('e2'.repeat(32), encodeDescriptionHex(B, 'Green Tea', { price: XEC_B }), 8, 1_756_400_500),
            ]]);
            await until(() => figureOf(root) === '3,000');
            expect(figureOf(root)).toBe('3,000');

            // The next walk stops at our page cap before the page that holds it.
            const b = road === 'unchanged' ? XEC_B : XEC_B_MOVED;
            const want = road === 'unchanged' ? '3,000' : '3,500';
            const calls = chain.historyPageCalls.length;
            await walk([
                [
                    road === 'unchanged'
                        ? record('e2'.repeat(32), encodeDescriptionHex(B, 'Green Tea', { price: b }), 8, 1_756_400_500)
                        : record('e3'.repeat(32), encodeDescriptionHex(B, 'Green Tea', { price: b }), 11, 1_756_401_000),
                ],
                ...Array.from({ length: 11 }, () => [] as ChainTx[]),
            ]);
            // Ten pages asked and the eleventh never: the walk stopped at our
            // cap. (The sheet holds the paint, so the view is read after it
            // closes.)
            await until(() => chain.historyPageCalls.slice(calls).includes(9));
            await until(() => figureOf(root) === want);
            expect(chain.historyPageCalls.slice(calls)).not.toContain(10);
            expect(figureOf(root), 'in place: the removed item is not composed again').toBe(want);

            // The sheet the app paints next: closed and opened again, the
            // choice pruned as every paint prunes it.
            (root.querySelector('[data-role="pay-close"]') as HTMLButtonElement).click();
            await flush();
            expect(viewOf(root)?.descriptionsTruncated, 'the walk stopped at our cap').toBe(true);
            expect(viewOf(root)?.descriptionsDecided?.has(A), 'the removal on screen stays decided').toBe(true);
            expect(root.textContent, 'our cap is not claimed over a removal this page read').not.toContain(
                selectionCapped(1),
            );
            expect(root.querySelector('[data-role="selection-total"]')?.textContent ?? '').toContain(want);
            (root.querySelector('[data-role="pay-several-open"]') as HTMLButtonElement).click();
            await flush();
            expect(figureOf(root)).toBe(want);
            expect(root.querySelector('[data-role="pay-several"] [data-role="pay-lines"]')?.textContent ?? '').not.toContain('Roasted Beans');
            expect(press(root), 'the press pays what stayed').toContain(`amount=${want.replace(',', '')}.00`);
        });
    }
});

describe('a-choice-is-not-called-unread-while-the-records-are-still-being-read', () => {
    const fungible = (tokenId: string, name: string) => ({
        tokenId,
        name,
        ticker: name.slice(0, 4).toUpperCase(),
        decimals: 0,
        tokenType: { protocol: 'SLP', type: 'SLP_TOKEN_TYPE_FUNGIBLE' },
    });
    /**
     * The critic's sixth pass (2026-09-24), P2: over a book that failed, the
     * walk is still in flight and the quotes rail says "Still reading" — and
     * the strip beside it said "could not read 1 item you chose — try again".
     * Nothing has failed yet: Pay waits and nothing is said. And a failure
     * screen names nothing this load did not read (CLAUDE §4): the chosen
     * item is counted until this load reads its genesis, never named from
     * an earlier read and never by its id.
     */
    const A = 'a1'.repeat(32);
    const XEC_A = { code: 'xec', exponent: 2, amount: 500_000n };

    it('withholds Pay and says nothing over a read in flight, then says it once the read fails', async () => {
        window.history.replaceState(null, '', stallPath(PK));
        let answer: (lookup: DescriptionLookup) => void = () => undefined;
        const inFlight = new Promise<DescriptionLookup>((resolve) => {
            answer = resolve;
        });
        const good = stallEmpty({ tokens: new Map([[A, fungible(A, 'Plum Jam')]]), prices: new Map([[A, XEC_A]]), shopTab: 'quotes' });
        const bookFailed: State = {
            ...stallEmpty({ tokens: new Map(), fetch: { kind: 'unreachable', triedAtMs: 0, hosts: [] }, shopTab: 'quotes' }),
            pendingFacts: {
                stall: { address: ADDR, hash: HASH },
                pubkeyHex: PK,
                manifest: Promise.resolve(undefined),
                descriptions: inFlight,
            },
        };
        const root = document.createElement('div');
        const states = [good, bookFailed];
        let at = 0;
        boot(root, async () => states[Math.min(at++, states.length - 1)]!);
        await flush();
        (root.querySelector('[data-role="selection-toggle"]') as HTMLButtonElement).click();
        [...root.querySelectorAll<HTMLButtonElement>('[data-role="selection-more"]')]
            .find((b) => b.getAttribute('data-focus-key') === `selection-step:${A}:more`)!
            .click();
        await flush();

        window.dispatchEvent(new PopStateEvent('popstate'));
        await flush();
        const strip = (): Element | null => root.querySelector('[data-role="selection-strip"]');
        expect(strip(), 'the choice stands').not.toBeNull();
        expect(strip()?.querySelector('[data-role="selection-unread"]'), 'nothing has failed yet').toBeNull();
        expect(root.textContent).not.toContain(selectionUnread(1));
        expect(strip()?.querySelector('[data-role="pay-several-open"]'), 'but Pay waits').toBeNull();
        const names = strip()?.querySelector('[data-role="selection-names"]')?.textContent ?? '';
        expect(names, 'a failure screen names nothing this load did not read').not.toContain('Plum Jam');
        expect(names, 'and never by its id').not.toContain(A);

        answer({
            descriptions: new Map(),
            shelves: new Map(),
            prices: new Map(),
            quoteTimes: new Map(),
            decided: new Set(),
            unreadable: new Set(),
            truncated: false,
            failed: true,
            genesis: new Map(),
        });
        await flush();
        expect(strip()?.querySelector('[data-role="selection-unread"]')?.textContent, 'now it failed, and says so').toBe(
            selectionUnread(1),
        );
        expect(strip()?.querySelector('[data-role="pay-several-open"]')).toBeNull();
    });

    it('a phone choice past our page cap is said with no remedy', async () => {
        window.history.replaceState(null, '', stallPath(PK));
        const B = 'b2'.repeat(32);
        const XEC_B = { code: 'xec', exponent: 2, amount: 700_000n };
        const both = new Map([
            [A, fungible(A, 'Plum Jam')],
            [B, fungible(B, 'Rye Flour')],
        ]);
        const good = stallEmpty({ tokens: both, prices: new Map([[A, XEC_A], [B, XEC_B]]), shopTab: 'quotes' });
        const capped = stallEmpty({
            tokens: new Map([[B, fungible(B, 'Rye Flour')]]),
            prices: new Map([[B, XEC_B]]),
            descriptionsTruncated: true,
            descriptionsDecided: new Set([B]),
            shopTab: 'quotes',
        });
        const root = document.createElement('div');
        const states = [good, capped];
        let at = 0;
        boot(root, async () => states[Math.min(at++, states.length - 1)]!);
        await flush();
        (root.querySelector('[data-role="selection-toggle"]') as HTMLButtonElement).click();
        [...root.querySelectorAll<HTMLButtonElement>('[data-role="selection-more"]')]
            .find((b) => b.getAttribute('data-focus-key') === `selection-step:${A}:more`)!
            .click();
        await flush();
        window.dispatchEvent(new PopStateEvent('popstate'));
        await flush();
        const said = root.querySelector('[data-role="selection-unread"]')?.textContent;
        expect(said).toBe(selectionCapped(1));
        expect(said, 'asking again stops in the same place').not.toMatch(/try again|comes back/);
        expect(root.querySelector('[data-role="pay-several-open"]')).toBeNull();
    });
});

describe('a-settings-publish-lands-without-a-reload', () => {
    /**
     * A settings transaction is not in the agora group, so the offer-book
     * subscription never carried one: a seller signed a name and a look in
     * another app, came back, and watched an unchanged stall until they
     * reloaded. The script subscription carries it, the classifier names it,
     * and the manifest walk applies it.
     */
    it('paints the name and the look the seller just signed', async () => {
        const { root } = bootStall(stallEmpty());
        await flush();
        expect(root.textContent, 'no name until one is published').not.toContain(
            'Ripe Beans',
        );
        const watch = watches[0]!;
        expect(watch.stall.hash, 'the address is watched, not only the book').toBe(HASH);
        expect(watch.stall.pubkeyHex).toBe(PK);

        const txid = publish(
            signedTx({
                txid: '01'.repeat(32),
                outputs: [STALL_SCRIPT, stl1Output('Ripe Beans', NEO_CITY_THEME_ID)],
                height: 800_000,
            }),
        );
        watch.hooks.onBurst?.([txid]);
        await flush();

        expect(root.textContent, 'the published name is on screen').toContain('Ripe Beans');
        expect(chain.calls.stl1, 'the settings index was consulted once').toBe(1);
        expect(chain.calls.stld, 'and the descriptions were not').toBe(0);
    });

    it('reads the words a seller published about a token', async () => {
        const { root } = bootStall(stallEmpty());
        await flush();
        const txid = publish(
            signedTx({
                txid: '02'.repeat(32),
                outputs: [STALL_SCRIPT, stldOutput(TOKEN, 'Grown on the hill')],
                height: 800_000,
            }),
        );
        watches[0]!.hooks.onBurst?.([txid]);
        await flush();

        expect(chain.calls.stld, 'the description index was consulted').toBe(1);
        expect(chain.calls.stl1, 'and the settings were left alone').toBe(0);
        expect(root.textContent).not.toContain(UNREACHABLE_BODY);
    });
});

describe('a-sale-does-not-walk-the-settings', () => {
    /**
     * The script subscription carries every transaction the stall address
     * touches, and most of it is ordinary money. The book has its own answer —
     * any message re-reads it — so a take must not also buy two capped history
     * walks in every open tab.
     */
    it('classifies a take as ordinary traffic and reads no index', async () => {
        bootStall(stallEmpty());
        await flush();

        const covenant = `a914${'cd'.repeat(20)}87`;
        const txid = '03'.repeat(32);
        chain.txs.set(txid, {
            txid,
            inputs: [{ inputScript: '00', outputScript: covenant }],
            outputs: [{ outputScript: STALL_SCRIPT }, { outputScript: covenant }],
            tokenEntries: [{ tokenId: 'bb'.repeat(32) }],
        });
        watches[0]!.hooks.onBurst?.([txid]);
        await flush();

        expect(chain.calls.tx, 'the transaction is read once, and only once').toBe(1);
        expect(chain.calls.stl1, 'no settings walk').toBe(0);
        expect(chain.calls.stld, 'no description walk').toBe(0);
        expect(chain.calls.utxos, 'no holdings read').toBe(0);
    });

    it('reads each reader at most once however many transactions name it', async () => {
        bootStall(stallEmpty());
        await flush();
        const first = publish(
            signedTx({
                txid: '04'.repeat(32),
                outputs: [stl1Output('One')],
                height: 800_001,
            }),
        );
        const second = publish(
            signedTx({
                txid: '05'.repeat(32),
                outputs: [stl1Output('Two')],
                height: 800_002,
            }),
        );
        watches[0]!.hooks.onBurst?.([first, second]);
        await flush();

        expect(chain.calls.tx, 'both transactions were read').toBe(2);
        expect(chain.calls.stl1, 'one walk for the burst, not one per record').toBe(1);
    });
});

describe('a-strangers-record-shaped-dust-walks-nothing', () => {
    /**
     * Anyone can pay this address an `STL1`-shaped output. `classifyTx`
     * names the shape so the Activity row stays a settings record; the
     * walk is `walkableFacts`'s question, and a stranger's dust must not
     * start two capped history walks in every open tab.
     */
    it('calls neither loader for a stranger’s STL1, and still walks the seller’s own', async () => {
        bootStall(stallEmpty());
        await flush();

        const stranger = 'c3'.repeat(32);
        chain.txs.set(stranger, {
            txid: stranger,
            inputs: [{ inputScript: '00', outputScript: STRANGER_SCRIPT }],
            outputs: [
                { outputScript: STALL_SCRIPT },
                { outputScript: stl1Output('Spoofed') },
            ],
        });
        watches[0]!.hooks.onBurst?.([stranger]);
        await flush();
        expect(chain.calls.stl1, 'a stranger’s STL1 is not a settings walk').toBe(
            0,
        );
        expect(chain.calls.stld, 'nor a descriptions walk').toBe(0);

        const mine = publish(
            signedTx({
                txid: 'c4'.repeat(32),
                outputs: [STALL_SCRIPT, stl1Output('Ripe Beans')],
                height: 800_000,
            }),
        );
        watches[0]!.hooks.onBurst?.([mine]);
        await flush();
        expect(chain.calls.stl1, 'the seller’s own still walks').toBe(1);
        expect(chain.calls.stld).toBe(0);
    });
});

describe('a-live-settings-row-from-a-stranger-says-so', () => {
    /**
     * The walk already labels a stranger's settings row. The live path
     * used to delete `signedByStall` before the ring, so the same dust
     * printed "Stall settings published" — the sentence the constant's
     * own docblock calls a claim nothing checked.
     */
    function openActivity(root: HTMLElement): void {
        (root.querySelector('[data-role="tab-activity"]') as HTMLButtonElement).click();
    }

    it('labels a stranger’s live STL1 as another wallet’s', async () => {
        const { root } = bootStall(stallEmpty());
        await flush();
        const txid = 'c9'.repeat(32);
        chain.txs.set(txid, {
            txid,
            inputs: [{ inputScript: '00', outputScript: STRANGER_SCRIPT }],
            outputs: [
                { outputScript: STALL_SCRIPT },
                { outputScript: stl1Output('Spoofed') },
            ],
        });
        watches[0]!.hooks.onBurst?.([txid]);
        await until(() => viewOf(root)?.events?.[0]?.txid === txid);

        const row = viewOf(root)?.events?.[0];
        expect(row?.kind).toBe('settings');
        expect(row?.recordAuthority).toBe('unsigned');

        openActivity(root);
        await until(
            () => root.querySelector('.event-kind')?.textContent === EVENT_SETTINGS_STRANGER,
        );
        expect(root.textContent).toContain(EVENT_SETTINGS_STRANGER);
        expect(root.textContent).not.toContain(EVENT_SETTINGS);
    });

    it('labels a live STL1 the stall signed without paying itself as unaddressed', async () => {
        // The third state, on the live path — where the last two label
        // regressions came through. Signed here, no dust back to the stall:
        // not made from this stall's publish link, so no walk wakes and the
        // row says which of the three it is.
        const { root } = bootStall(stallEmpty());
        await flush();
        const before = chain.calls.stl1;
        const txid = 'cb'.repeat(32);
        chain.txs.set(txid, {
            txid,
            inputs: [{ inputScript: p2pkhScriptSig(PK_BYTES), outputScript: STALL_SCRIPT }],
            outputs: [
                { outputScript: STALL_SCRIPT, sats: 9_000n },
                { outputScript: stl1Output('Elsewhere') },
            ],
        });
        watches[0]!.hooks.onBurst?.([txid]);
        await until(() => viewOf(root)?.events?.[0]?.txid === txid);

        const row = viewOf(root)?.events?.[0];
        expect(row?.kind).toBe('settings');
        expect(row?.recordAuthority).toBe('unaddressed');
        expect(chain.calls.stl1, 'no settings walk was woken').toBe(before);

        openActivity(root);
        await until(
            () => root.querySelector('.event-kind')?.textContent === EVENT_SETTINGS_UNADDRESSED,
        );
        expect(root.textContent).not.toContain(EVENT_SETTINGS_STRANGER);
        expect(root.textContent).not.toContain('Elsewhere');
    });

    it('labels the seller’s own live STL1 as published settings', async () => {
        const { root } = bootStall(stallEmpty());
        await flush();
        const txid = publish(
            signedTx({
                txid: 'ca'.repeat(32),
                outputs: [STALL_SCRIPT, stl1Output('Ripe Beans')],
                height: 800_000,
            }),
        );
        watches[0]!.hooks.onBurst?.([txid]);
        await until(() => viewOf(root)?.events?.[0]?.txid === txid);
        // The walk this publish starts must finish before the test ends: its
        // late paint is this root's own, but its timers run under a later
        // test.
        await until(() => (root.textContent ?? '').includes('Ripe Beans'));

        const row = viewOf(root)?.events?.[0];
        expect(row?.kind).toBe('settings');
        expect(row?.recordAuthority).toBe('stalls');

        openActivity(root);
        await until(() => root.querySelector('.event-kind')?.textContent === EVENT_SETTINGS);
        expect(root.textContent).toContain(EVENT_SETTINGS);
        expect(root.textContent).not.toContain(EVENT_SETTINGS_STRANGER);
    });
});

describe('an-unclassifiable-event-asks-everything', () => {
    /**
     * A transaction we could not fetch is one we cannot rule out. Asking costs
     * two capped walks; guessing "nothing" costs the seller a settings publish
     * that never lands, and they have no way to find out.
     *
     * Every txid in the burst is still tried — the loop used to `break` on the
     * first failure, which silently dropped every later transaction from the
     * activity ring with nothing to say a piece was missing. The fact readers
     * still run at most once for the whole burst.
     */
    it('runs every fact reader once when the transaction cannot be read', async () => {
        bootStall(stallEmpty());
        await flush();
        chain.txThrows = true;
        watches[0]!.hooks.onBurst?.(['06'.repeat(32), '07'.repeat(32)]);
        await flush();

        expect(chain.calls.tx, 'every txid is tried; the ring needs each one').toBe(2);
        expect(chain.calls.stl1).toBe(1);
        expect(chain.calls.stld).toBe(1);
    });

    it('never hands a txid it could not gate to chronik', async () => {
        // `chronik.tx()` concatenates its argument into a request path and
        // never checks it — the same gate the manifest hint gets, for the same
        // reason. A message that carried no txid arrives as exactly this.
        bootStall(stallEmpty());
        await flush();
        watches[0]!.hooks.onBurst?.([UNKNOWN_TXID]);
        await flush();

        expect(chain.calls.tx, 'not fetched at all').toBe(0);
        expect(chain.calls.stl1, 'and still asked everything').toBe(1);
        expect(chain.calls.stld).toBe(1);
    });
});

describe('failed-facts-refetch-keeps-the-painted-facts', () => {
    /**
     * The facts mirror of `failed-refetch-is-not-empty`. A walk that did not
     * finish knows less than the screen already does, and painting from it
     * would turn our own failure into a statement about the seller — here, that
     * they never named their stall.
     */
    it('leaves the painted name standing when the walk cannot finish', async () => {
        const { root } = bootStall(
            stallEmpty({ stallName: 'Ripe Beans', descriptions: new Map([[TOKEN, 'Sun dried']]) }),
        );
        await flush();
        expect(root.textContent).toContain('Ripe Beans');

        chain.historyThrows = true;
        chain.txThrows = true;
        watches[0]!.hooks.onBurst?.(['08'.repeat(32)]);
        await flush();

        expect(root.textContent, 'a failed walk is not a seller with no name').toContain(
            'Ripe Beans',
        );
        expect(chain.calls.stl1, 'it did try').toBe(1);
        expect(chain.calls.stld).toBe(1);
    });

    it('keeps a description when the walk answers empty because it failed', async () => {
        // `loadDescriptions` swallows its own failure by design and answers an
        // empty lookup, which on this path cannot be told from a seller who
        // wrote nothing. So an empty answer never replaces words on screen —
        // the same rule `isDefiniteResult` applies to an empty book.
        const { root } = bootStall(
            stallEmpty({
                fetch: { kind: 'offers', offers: [OFFER] },
                // The words live in the disclosure panel, so it has to be open
                // for them to be on screen at all.
                overlay: { kind: 'item', tokenId: TOKEN, rail: 'listings' },
                tokens: new Map([[TOKEN, TOKEN_META]]),
                descriptions: new Map([[TOKEN, 'Grown on the hill']]),
            }),
        );
        await flush();
        const painted = (): string =>
            root.querySelector('[data-role="token-description"]')?.textContent ?? '';
        expect(painted()).toContain('Grown on the hill');

        chain.historyThrows = true;
        chain.txThrows = true;
        watches[0]!.hooks.onBurst?.(['09'.repeat(32)]);
        await flush();

        expect(chain.calls.stld, 'it did try').toBe(1);
        expect(painted(), 'an empty answer is not a seller who wrote nothing').toContain(
            'Grown on the hill',
        );
        expect(root.textContent).not.toContain(OPENING_BODY);
    });
});

describe('unfinalized-settings-do-not-flip-the-look-live', () => {
    /**
     * Two nodes hold two mempools, which is how one link renders two stalls. §5
     * settles it: unfinalized **and** unmined never wins. The live path must
     * not be a way around that rule, and it is not — it goes through the same
     * `loadManifest`, so `pickManifestWinner` refuses the record and the walk
     * simply answers with the older winner.
     */
    it('waits for the chain to agree, then lands when it does', async () => {
        const { root } = bootStall(stallEmpty());
        await flush();

        const tx = signedTx({
            txid: '0a'.repeat(32),
            outputs: [stl1Output('Neon Stall', NEO_CITY_THEME_ID)],
            isFinal: false,
        });
        const txid = publish(tx);
        watches[0]!.hooks.onBurst?.([txid]);
        await flush();
        expect(
            root.textContent,
            'one node saying so is not the chain agreeing',
        ).not.toContain('Neon Stall');

        // Avalanche finalises it. That is another message on the same socket.
        chain.txs.set(txid, { ...tx, isFinal: true });
        chain.addressTxs = [{ ...tx, isFinal: true }];
        watches[0]!.hooks.onBurst?.([txid]);
        await flush();
        expect(root.textContent, 'and now it is the seller’s look').toContain(
            'Neon Stall',
        );
    });
});

describe('a-live-update-does-not-clear-a-half-written-record', () => {
    /**
     * `renderStall` begins with `replaceChildren()`, and the publish sheet keeps
     * the typed name in the DOM and nowhere else. A live paint while it is open
     * therefore wipes a record the seller is composing — and with a script
     * subscription, a stranger can force that from outside for the price of
     * dust.
     */
    it('defers the paint while the sheet is open, and flushes it on close', async () => {
        const { root } = bootStall(stallEmpty());
        await flush();

        // The publish control lives behind the Studio tab now.
        (root.querySelector('[data-role="tab-studio"]') as HTMLButtonElement).click();
        (root.querySelector('[data-role="studio-open-publish"]') as HTMLButtonElement).click();
        const input = root.querySelector(
            'input[name="stall-name"]',
        ) as HTMLInputElement;
        input.value = 'Half Written';

        const txid = publish(
            signedTx({
                txid: '0b'.repeat(32),
                outputs: [stl1Output('Ripe Beans')],
                height: 800_000,
            }),
        );
        watches[0]!.hooks.onBurst?.([txid]);
        await flush();

        const still = root.querySelector('input[name="stall-name"]') as HTMLInputElement;
        expect(still, 'the sheet is still mounted').not.toBeNull();
        expect(still.value, 'and what the seller typed is still in it').toBe('Half Written');
        expect(chain.calls.stl1, 'the state was read all the same').toBe(1);

        (root.querySelector('[data-role="publish-close"]') as HTMLButtonElement).click();
        expect(root.querySelector('input[name="stall-name"]')).toBeNull();
        expect(root.textContent, 'the deferred paint arrives with the close').toContain(
            'Ripe Beans',
        );
    });

    it('a narrow shop-window link protects its sheets like any other stall', async () => {
        /*
         * The two gates must be handed the SAME view (QA, 2026-09-20,
         * reproduced with a red/green pair).
         *
         * Below the wall's floor a `?view=window` link paints the ordinary
         * stall, sheets and all — that is the whole point of the fallback.
         * But the first rework stripped `window` from the PAINTED view only
         * and left `state.view` carrying it, so `livePaint` asked
         * `holdsLivePaint(state.view)`, got "this is a wall, it holds
         * nothing", and repainted over a sheet `renderStall` had mounted
         * from the stripped view. A seller composing a permanent `STLD`
         * record lost it to a stranger's dust.
         */
        const had = Object.getOwnPropertyDescriptor(globalThis, 'innerWidth');
        Object.defineProperty(globalThis, 'innerWidth', { value: 390, configurable: true });
        window.history.replaceState(null, '', `${stallPath(PK)}?view=window&mode=cycle`);
        try {
            // The loader's own view carries `window`, exactly as
            // `withUrlParams` gives it in production — which is the whole
            // point: the strip must happen where every reader sees it, not
            // on the way to the painter alone.
            const { root } = bootStall(
                stallEmpty({
                    window: { show: 'listings', mode: 'cycle', payCode: true, turn: 'none', touch: false },
                } as unknown as Partial<State['view']>),
            );
            await flush();
            expect(
                root.querySelector('[data-role="shop-window"]'),
                'below the floor it is the ordinary stall',
            ).toBeNull();

            (root.querySelector('[data-role="tab-studio"]') as HTMLButtonElement).click();
            (root.querySelector('[data-role="studio-open-publish"]') as HTMLButtonElement).click();
            const input = root.querySelector('input[name="stall-name"]') as HTMLInputElement;
            expect(input, 'the sheet opens here, which is the fallback').not.toBeNull();
            input.value = 'Half Written';

            const txid = publish(
                signedTx({
                    txid: '0c'.repeat(32),
                    outputs: [stl1Output('Ripe Beans')],
                    height: 800_001,
                }),
            );
            watches[0]!.hooks.onBurst?.([txid]);
            await flush();

            const still = root.querySelector('input[name="stall-name"]') as HTMLInputElement;
            expect(still, 'the sheet is still mounted').not.toBeNull();
            expect(still.value, 'and what the seller typed is still in it').toBe('Half Written');
        } finally {
            if (had === undefined) {
                delete (globalThis as { innerWidth?: number }).innerWidth;
            } else {
                Object.defineProperty(globalThis, 'innerWidth', had);
            }
            window.history.replaceState(null, '', stallPath(PK));
        }
    });

    it('a paint the seller asked for is untouched', async () => {
        // Opening and closing the sheet still repaint immediately: only the
        // paints nobody asked for wait.
        const { root } = bootStall(stallEmpty({ stallName: 'Ripe Beans' }));
        await flush();
        // The publish control lives behind the Studio tab now.
        (root.querySelector('[data-role="tab-studio"]') as HTMLButtonElement).click();
        (root.querySelector('[data-role="studio-open-publish"]') as HTMLButtonElement).click();
        expect(root.querySelector('[data-role="publish"]')).not.toBeNull();
        (root.querySelector('[data-role="publish-close"]') as HTMLButtonElement).click();
        expect(root.querySelector('[data-role="publish"]')).toBeNull();
    });

    it('the second sheet keeps its half-written record too', async () => {
        // The token record is its own sheet now, and its fields are the same
        // kind of thing: typed into the DOM and nowhere else. A kind added to
        // the render gate and forgotten in the paint gate is a sheet a
        // stranger can wipe with dust.
        const { root } = bootStall(
            stallEmpty({
                // The picker's set is what the stall lists, so a described
                // token needs a listing behind it.
                fetch: { kind: 'offers', offers: [OFFER] },
                tokens: new Map([[TOKEN, TOKEN_META]]),
            }),
        );
        await flush();
        (root.querySelector('[data-role="tab-studio"]') as HTMLButtonElement).click();
        (root.querySelector('[data-role="studio-open-describe"]') as HTMLButtonElement).click();
        const field = root.querySelector(
            '[data-role="describe-text"]',
        ) as HTMLTextAreaElement;
        expect(field, 'the describe sheet is open').not.toBeNull();
        field.value = 'Half written words';

        watches[0]!.hooks.onBurst?.([
            publish(
                signedTx({
                    txid: '0c'.repeat(32),
                    outputs: [stl1Output('Ripe Beans')],
                    height: 800_000,
                }),
            ),
        ]);
        await flush();
        const still = root.querySelector(
            '[data-role="describe-text"]',
        ) as HTMLTextAreaElement;
        expect(still, 'the sheet is still mounted').not.toBeNull();
        expect(still.value).toBe('Half written words');

        (root.querySelector('[data-role="publish-close"]') as HTMLButtonElement).click();
        expect(root.textContent, 'the deferred paint arrives with the close').toContain(
            'Ripe Beans',
        );
    });
});

describe('an-overlay-that-cannot-mount-does-not-stop-the-live-paint', () => {
    /**
     * `renderStall` and `livePaint` ask one predicate — `holdsLivePaint` — whether
     * a sheet is on screen. Two lists of overlay kinds kept in step by hand is
     * how an overlay the render gate refuses and the paint gate honours stops a
     * stall updating for good, with nothing on screen to say why.
     *
     * The broadcast is the reachable case: `overlayMounts` refuses every
     * overlay on a stream overlay (nothing on a stream can be clicked), so a
     * poster overlay set on a broadcast view mounts nothing. The poster's own
     * refusal — a share link past the QR ceiling — used to be the case here,
     * until `shareUrl()` stopped carrying the address bar's junk (2026-09-07);
     * that gate stays as insurance and is no longer reachable from a URL.
     */
    it('paints while an overlay that mounts nothing is set', async () => {
        window.history.replaceState(null, '', `${stallPath(PK)}?view=broadcast`);
        const { root } = bootStall(
            stallEmpty({
                overlay: { kind: 'poster', format: 'print' },
                broadcast: BROADCAST_FIXED,
            }),
        );
        await flush();
        expect(root.querySelector('.sheet-scrim'), 'no sheet is on screen').toBeNull();

        watches[0]!.hooks.onBurst?.([
            publish(
                signedTx({
                    txid: '0d'.repeat(32),
                    outputs: [stl1Output('Ripe Beans')],
                    height: 800_000,
                }),
            ),
        ]);
        await flush();
        expect(
            root.textContent,
            'the stall kept updating rather than waiting on a sheet nobody can see',
        ).toContain('Ripe Beans');
    });
});

describe('the-poster-survives-a-live-repaint', () => {
    /**
     * `renderStall` begins with `replaceChildren()`, and the poster used to
     * live in the DOM only. A socket message, a fiat answer or a carousel
     * tick then closed it mid-choice — the same hole the publish sheet had,
     * now that the poster has a format chooser and a canvas.
     */
    it('holds the sheet and its format while the book is read, and flushes on close', async () => {
        const { root } = bootStall(
            stallEmpty({ tokens: new Map([[TOKEN, TOKEN_META]]) }),
        );
        await flush();

        (root.querySelector('[data-role="tab-studio"]') as HTMLButtonElement).click();
        (root.querySelector('[data-role="open-poster"]') as HTMLButtonElement).click();
        (root.querySelector('[data-role="poster-format-story"]') as HTMLButtonElement).click();
        expect(
            root.querySelector('[role="dialog"]')?.getAttribute('data-format'),
        ).toBe('story');

        chain.book = { kind: 'offers', offers: [OFFER] };
        watches[0]!.hooks.onChanged?.('message');
        await flush();

        const still = root.querySelector('[data-role="poster"]') as HTMLElement;
        expect(still, 'the sheet is still mounted').not.toBeNull();
        expect(
            still.querySelector('[role="dialog"]')?.getAttribute('data-format'),
            'and the format the seller chose is still the one on it',
        ).toBe('story');
        expect(
            still.querySelector('[data-role="poster-format-story"]')?.getAttribute('aria-pressed'),
        ).toBe('true');
        expect(
            viewOf(root)?.fetch?.kind,
            'the paint waited; the last frame is still the empty stall',
        ).toBe('empty');

        (root.querySelector('[data-role="poster-close"]') as HTMLButtonElement).click();
        expect(root.querySelector('[data-role="poster"]')).toBeNull();
        expect(
            viewOf(root)?.fetch?.kind,
            'the deferred paint arrives with the close',
        ).toBe('offers');
        (root.querySelector('[data-role="tab-shop"]') as HTMLButtonElement).click();
        expect(root.textContent, 'and the new book is on the shop').toContain('Ripe Beans');
    });
});

describe('the-poster-survives-a-fiat-answer', () => {
    /**
     * `refreshFiat` used to call `paint()` itself. Opening Story, then letting
     * the price fetch land, remounted the sheet — the same hole as a book
     * tick, on a path `livePaint` never saw. The closing paint is the flush,
     * as it is for the book.
     *
     * Staged through the fold that starts the read (2026-09-12): the glance is
     * asked for when the line that shows it is on screen, so the reader opens
     * a listing's face and its fold, then leaves for the poster while the feed
     * is still thinking. Which is the same race the boot-time read used to
     * make on its own, and the only one left that can make it.
     */
    it('keeps the Story sheet node while the mocked price resolves', async () => {
        let resolvePrice!: (rate: bigint | undefined) => void;
        priceControl.fetch = () =>
            new Promise((resolve) => {
                resolvePrice = resolve;
            });

        const { root } = bootStall({
            ...stallEmpty({
                fetch: { kind: 'offers', offers: [OFFER] },
                tokens: new Map([[TOKEN, TOKEN_META]]),
            }),
            offers: [OFFER],
        });
        await flush();
        openGlanceFold(root);

        (root.querySelector('[data-role="tab-studio"]') as HTMLButtonElement).click();
        (root.querySelector('[data-role="open-poster"]') as HTMLButtonElement).click();
        (root.querySelector('[data-role="poster-format-story"]') as HTMLButtonElement).click();
        const sheet = root.querySelector('[data-role="poster"]') as HTMLElement;
        expect(sheet, 'Story is open before the rate lands').not.toBeNull();
        expect(
            sheet.querySelector('[role="dialog"]')?.getAttribute('data-format'),
        ).toBe('story');

        resolvePrice(30_000n);
        await flush();

        expect(
            root.querySelector('[data-role="poster"]'),
            'the same sheet node is still mounted',
        ).toBe(sheet);
        expect(
            viewOf(root)?.fiatRate,
            'the paint waited; the last frame has no rate yet',
        ).toBeUndefined();

        (root.querySelector('[data-role="poster-close"]') as HTMLButtonElement).click();
        expect(root.querySelector('[data-role="poster"]')).toBeNull();
        expect(
            viewOf(root)?.fiatRate,
            'the deferred paint arrives with the close',
        ).toBe(30_000n);
    });
});

describe('waiting-address-resolves-on-its-own', () => {
    /**
     * An address that has never spent is the first screen many sellers see:
     * they paste the address they sell from before listing anything, which is
     * the order the apex invites. A listing is a spend, and a spend reveals the
     * key — so the answer arrives on its own, if anything is watching. Nothing
     * was.
     */
    it('watches the address with no plugin subscription, and refreshes on a spend', async () => {
        const root = document.createElement('div');
        const states: State[] = [waitingState('unresolvable'), stallEmpty()];
        let loads = 0;
        boot(root, async () => states[Math.min(loads++, states.length - 1)]!);
        await flush();
        expect(root.textContent).toContain(FIRST_STALL_SUB);

        const watch = watches[0]!;
        expect(watch.stall.hash, 'the address is what there is to watch').toBe(HASH);
        expect(
            watch.stall.pubkeyHex,
            'there is no maker key yet, so no agora group',
        ).toBeUndefined();

        // The seller lists. A listing is an ordinary p2pkh spend, and the input
        // script is where the key finally shows.
        chain.addressTxs = [
            signedTx({ txid: '0c'.repeat(32), outputs: [STRANGER_SCRIPT], height: 800_000 }),
        ];
        watch.hooks.onBurst?.(['0c'.repeat(32)]);
        await flush();

        expect(loads, 'the resolve was worth a reload of the page state').toBe(2);
        expect(root.textContent).not.toContain(FIRST_STALL_SUB);
    });

    it('a re-establish asks again, because nothing announces a spend twice', async () => {
        const root = document.createElement('div');
        const states: State[] = [waitingState('unresolved'), stallEmpty()];
        let loads = 0;
        boot(root, async () => states[Math.min(loads++, states.length - 1)]!);
        await flush();

        chain.addressTxs = [
            signedTx({ txid: '0d'.repeat(32), outputs: [STRANGER_SCRIPT], height: 800_000 }),
        ];
        watches[0]!.hooks.onReestablished?.();
        await flush();
        expect(loads).toBe(2);
    });
});

describe('a-failed-live-resolve-does-not-repaint-the-waiting-screen', () => {
    /**
     * A receive fires a message and reveals no key — `pubkeyFromSpends` reads
     * inputs — so finding nothing is the ordinary case here. Painting
     * `unreachable` over a true `unresolvable` would be the empty-versus-
     * unreachable collapse arriving by a new road, and an `opening` flash under
     * every stranger's dust would be a stall that flickers for no reason.
     */
    it('holds the screen when the walk finds no key', async () => {
        const root = document.createElement('div');
        let loads = 0;
        boot(root, async () => {
            loads += 1;
            return waitingState('unresolvable');
        });
        await flush();

        // Somebody funded the address. A receive is not a spend.
        chain.addressTxs = [
            {
                txid: '0e'.repeat(32),
                inputs: [{ inputScript: '00', outputScript: STRANGER_SCRIPT }],
                outputs: [{ outputScript: STALL_SCRIPT }],
            },
        ];
        watches[0]!.hooks.onBurst?.(['0e'.repeat(32)]);
        await flush();

        expect(loads, 'nothing was reloaded').toBe(1);
        expect(root.textContent).toContain(FIRST_STALL_SUB);
        expect(root.textContent).not.toContain(OPENING_BODY);
        expect(root.textContent).not.toContain(UNREACHABLE_BODY);
    });

    it('holds the screen when the walk throws', async () => {
        const root = document.createElement('div');
        let loads = 0;
        boot(root, async () => {
            loads += 1;
            return waitingState('unresolvable');
        });
        await flush();

        chain.historyThrows = true;
        watches[0]!.hooks.onBurst?.(['0f'.repeat(32)]);
        await flush();

        expect(loads).toBe(1);
        expect(root.textContent).toContain(FIRST_STALL_SUB);
        expect(root.textContent).not.toContain(UNREACHABLE_BODY);
    });
});

describe('a-waiting-watch-is-closed-when-the-route-resolves', () => {
    /**
     * The waiting socket lives in the same `live` variable as a resolved
     * stall's, so `refresh()` closes it before it opens the next one. Two
     * lifecycles would mean a stall holding two sockets, one of them watching a
     * screen nobody is on.
     */
    it('closes the address watch and opens the book watch in its place', async () => {
        const root = document.createElement('div');
        const states: State[] = [waitingState('unresolvable'), stallEmpty()];
        let loads = 0;
        boot(root, async () => states[Math.min(loads++, states.length - 1)]!);
        await flush();
        expect(watches).toHaveLength(1);
        expect(watches[0]!.closed).toBe(false);

        chain.addressTxs = [
            signedTx({ txid: '10'.repeat(32), outputs: [STRANGER_SCRIPT], height: 800_000 }),
        ];
        watches[0]!.hooks.onBurst?.(['10'.repeat(32)]);
        await flush();

        expect(watches[0]!.closed, 'the waiting watch is closed, not left open').toBe(true);
        expect(watches).toHaveLength(2);
        expect(watches[1]!.stall.pubkeyHex, 'and the book is watched now').toBe(PK);
        expect(watches[1]!.stall.hash).toBe(HASH);
    });
});

describe('a-live-holdings-change-takes-a-decoration-off', () => {
    /**
     * §7: moving the token takes the decoration off, which is what selling a
     * decoration should do. And a read that did not answer is not a stall that
     * holds nothing — applying that would strip a decoration because a node
     * blinked.
     */
    it('applies a definite holdings answer and ignores a failed one', async () => {
        const worn = (root: HTMLElement): boolean =>
            root.querySelector('.stall')?.classList.contains('att-pinstripe') === true;

        // Bit 1 of the shipped default is `att-pinstripe`, a `root` row.
        const flagged = publish(
            signedTx({
                txid: '11'.repeat(32),
                outputs: [stl1Output('Ripe Beans', DEFAULT_THEME_ID, 0b10)],
                height: 800_000,
            }),
        );
        const { root } = bootStall(stallEmpty());
        await flush();

        chain.utxos = [
            { token: { tokenId: '9a0d0745a9ca0e82eea47f2690d2611ca791635f3eba26af6a9bf49dfd528e59' } },
        ];
        watches[0]!.hooks.onBurst?.([flagged]);
        await flush();
        expect(chain.calls.utxos, 'a flag is worth an entitlement read').toBe(1);
        expect(worn(root), 'held, opted into, so worn').toBe(true);

        // The holdings read fails. Nothing changes.
        chain.utxosThrow = true;
        watches[0]!.hooks.onReestablished?.();
        await flush();
        expect(worn(root), 'a failed read does not undress a stall').toBe(true);

        // The seller sells the decoration. That is a definite answer.
        chain.utxosThrow = false;
        chain.utxos = [];
        watches[0]!.hooks.onReestablished?.();
        await flush();
        expect(worn(root), 'gone with the token').toBe(false);
    });
});

describe('event-ring-is-capped-and-newest-first', () => {
    /**
     * The substrate for a live activity feed, laid down before anything renders
     * it: the classifier already names every transaction the script
     * subscription carries, and throwing that answer away meant a future feed
     * would have to read the socket a second time.
     *
     * **Nothing on screen shows this**, which is exactly why it needs a test:
     * a ring that silently stopped recording, or one that grew without bound,
     * would look identical from the outside. The cap is §2's rule about buffers
     * — a busy address names transactions as fast as the socket delivers them —
     * and the dedupe is chronik's own behaviour: one transaction arrives at
     * least twice, for the mempool and then for the block.
     */
    const payment = (txid: string): ChainTx => ({
        txid,
        inputs: [{ inputScript: '00', outputScript: STRANGER_SCRIPT }],
        outputs: [{ outputScript: STALL_SCRIPT }],
    });

    /** 64 lowercase hex, distinct per index, and not shaped like any other fixture. */
    const paymentTxid = (i: number): string => `${(i + 0x40).toString(16)}`.repeat(32);

    it('keeps the newest 50, one per txid, and names what each one was', async () => {
        const { root } = bootStall(stallEmpty());
        await flush();

        const overflow = MAX_STALL_EVENTS + 5;
        const txids: string[] = [];
        for (let i = 0; i < overflow; i += 1) {
            const txid = paymentTxid(i);
            chain.txs.set(txid, payment(txid));
            txids.push(txid);
        }
        // Last, so the burst ends in a fact that paints. Nothing paints for the
        // ring itself — that is the rule, not an accident of this fixture.
        const settingsTxid = publish(
            signedTx({
                txid: '0a'.repeat(32),
                outputs: [stl1Output('Ripe Beans')],
                height: 800_003,
            }),
        );
        txids.push(settingsTxid);

        watches[0]!.hooks.onBurst?.(txids);
        await flush(20);

        const events = viewOf(root)?.events;
        expect(events, 'the ring never reached the view').toBeDefined();
        expect(events, 'a busy address must not grow this without bound').toHaveLength(
            MAX_STALL_EVENTS,
        );

        // Newest first: the burst is read in order and each event goes on the
        // front, so the settings record the seller just signed is row one.
        expect(events?.[0]?.txid).toBe(settingsTxid);
        expect(events?.[0]?.kind).toBe('settings');
        expect(events?.[1]?.txid, 'the payment just before it').toBe(
            paymentTxid(overflow - 1),
        );
        expect(events?.[1]?.kind, 'an ordinary payment is not a sale').toBe('other');

        // 55 payments plus the record is 56 seen, so the six oldest fell off
        // the back — not the six newest off the front, which is the same length
        // and the opposite feed.
        const kept = new Set(events?.map((event) => event.txid));
        expect(kept.has(paymentTxid(0)), 'the oldest survived the cap').toBe(false);
        expect(kept.has(paymentTxid(5)), 'the sixth-oldest survived the cap').toBe(false);
        expect(kept.has(paymentTxid(6)), 'the 50th-newest is the last one kept').toBe(true);
        expect(kept.has(paymentTxid(overflow - 1)), 'the newest payment is kept').toBe(true);

        // Newest first is a claim about time too, not only about order.
        const stamps = events?.map((event) => event.seenAtMs) ?? [];
        for (let i = 1; i < stamps.length; i += 1) {
            expect(stamps[i - 1]!).toBeGreaterThanOrEqual(stamps[i]!);
        }
    });

    it('counts one transaction once, however many times the socket names it', async () => {
        const { root } = bootStall(stallEmpty());
        await flush();

        const settingsTxid = publish(
            signedTx({
                txid: '0b'.repeat(32),
                outputs: [stl1Output('Ripe Beans')],
                height: 800_004,
            }),
        );
        // The mempool arrival and the confirmation, which is what chronik
        // actually sends — plus a repeat inside one burst for good measure.
        watches[0]!.hooks.onBurst?.([settingsTxid, settingsTxid]);
        await flush(20);
        watches[0]!.hooks.onBurst?.([settingsTxid]);
        await flush(20);

        const events = viewOf(root)?.events ?? [];
        expect(events.filter((event) => event.txid === settingsTxid)).toHaveLength(1);
        expect(events, 'a confirmation is not a second event').toHaveLength(1);
    });

    it('starts a new ring when the visitor opens another stall', async () => {
        // The loader answers the stall the location names, as
        // `a new stall is a new list` does: one that answered this stall
        // for every route never opened another stall at all, and the ring
        // it "reset" was the same stall's (the critic, CARRYOVER-3 item 5).
        const PK_B_BYTES = Uint8Array.from([0x02, ...new Array<number>(32).fill(0xbb)]);
        const PK_B = toHex(PK_B_BYTES);
        const ADDR_B = encodeCashAddress('ecash', 'p2pkh', toHex(shaRmd160(PK_B_BYTES)));
        const stateB: State = {
            ...stallEmpty({ route: { kind: 'pubkey', pubkeyHex: PK_B, address: ADDR_B }, address: ADDR_B }),
            pubkeyHex: PK_B,
        };
        const root = document.createElement('div');
        boot(root, async () => (location.pathname === stallPath(PK_B) ? stateB : stallEmpty()));
        await flush();
        const first = paymentTxid(1);
        chain.txs.set(first, payment(first));
        watches[0]!.hooks.onBurst?.([first]);
        await flush(20);
        // Nothing paints for a plain payment, so ask for a paint that is not
        // about the ring: the currency control repaints whatever is on screen.
        root.querySelector<HTMLSelectElement>('select')?.dispatchEvent(
            new Event('change', { bubbles: true }),
        );
        expect(viewOf(root)?.events?.length ?? 0, 'the payment was recorded').toBe(1);

        // These are transactions at one address. Carrying them to the next
        // stall would attribute one seller's traffic to another.
        const before = watches.length;
        window.history.pushState(null, '', stallPath(PK_B));
        window.dispatchEvent(new PopStateEvent('popstate'));
        await flush(20);
        const route = viewOf(root)?.route;
        expect(route?.kind === 'pubkey' ? route.pubkeyHex : undefined, 'the other stall is on screen').toBe(PK_B);

        // **Every watch the navigation opened, not one of them.** `boot`
        // never removes its `popstate` listener, so every instance booted
        // earlier in this file refreshes on this event too and opens a watch
        // of its own, in the order their loads answer — which is not the
        // order they were booted. "The last watch is this test's" held only
        // while the view was read from a file-wide capture that any of them
        // could have written; read per root (`viewOf`), it did not. Each app
        // records into its own ring, so waking all of them wakes this one.
        const opened = watches.slice(before).filter((w) => !w.closed);

        // Asserted by recording on the *new* stall rather than by reading the
        // view straight after the route change: a fresh load carries no events
        // either way, so an uncleared ring only shows itself on the next event
        // it mirrors — which is exactly how it would reach a visitor's screen.
        const second = publish(
            signedTx({
                txid: '0c'.repeat(32),
                outputs: [stl1Output('Ripe Beans')],
                height: 800_005,
            }),
        );
        for (const watch of opened) {
            watch.hooks.onBurst?.([second]);
        }
        await flush(20);

        const events = viewOf(root)?.events ?? [];
        expect(events).toHaveLength(1);
        expect(events[0]?.txid).toBe(second);
        expect(
            events.some((event) => event.txid === first),
            'the previous stall traffic followed the visitor',
        ).toBe(false);
    });
});

describe('a-panel-switch-does-not-reload-the-stall', () => {
    /**
     * The shell's panels are app state, never history.state: the only
     * popstate listener runs refresh(), which closes the socket, empties the
     * event ring and re-runs the whole load — a Back that did all that to
     * leave a tab would wipe the very feed the tab shows. A tab costs a
     * paint, nothing else.
     */
    it('switches panels with no load, no navigation, and no ring reset', async () => {
        const counter = bootStall(stallEmpty());
        await flush();
        expect(counter.loads).toBe(1);
        const txid = publish(
            signedTx({ txid: '0a'.repeat(32), outputs: [STRANGER_SCRIPT] }),
        );
        watches[0]!.hooks.onBurst?.([txid]);
        await flush();
        expect(viewOf(counter.root)?.events?.length).toBe(1);
        const url = location.href;

        const toActivity = counter.root.querySelector(
            '[data-role="tab-activity"]',
        ) as HTMLButtonElement;
        expect(toActivity).not.toBeNull();
        toActivity.click();
        await flush();

        expect(counter.loads, 'a tab is a paint, not a load').toBe(1);
        expect(location.href, 'no navigation').toBe(url);
        expect(viewOf(counter.root)?.panel).toBe('activity');
        expect(viewOf(counter.root)?.events?.length, 'the ring survives').toBe(1);
        expect(watches[0]!.closed, 'the socket stays open').toBe(false);

        const toShop = counter.root.querySelector(
            '[data-role="tab-shop"]',
        ) as HTMLButtonElement;
        toShop.click();
        await flush();
        expect(viewOf(counter.root)?.panel).toBe('shop');
        expect(counter.loads).toBe(1);
    });

    it('keeps one title for one link, whichever panel is open', async () => {
        const counter = bootStall(stallEmpty());
        await flush();
        const before = document.title;
        (counter.root.querySelector('[data-role="tab-studio"]') as HTMLButtonElement).click();
        await flush();
        expect(document.title, 'panels share the route, so they share its title').toBe(
            before,
        );
    });
});

describe('a-reconnect-gap-is-said-not-hidden', () => {
    /**
     * What happened while the socket was down is unknown, and the ring cannot
     * show it. The counter is the honesty: above zero, the activity panel says
     * the list may be missing pieces instead of letting it read as complete.
     */
    it('counts a reconnect and a txid it could not read as gaps', async () => {
        const { root } = bootStall(stallEmpty());
        await flush();
        watches[0]!.hooks.onReestablished?.();
        await flush();
        expect(viewOf(root)?.activityGaps).toBe(1);
        chain.txThrows = true;
        watches[0]!.hooks.onBurst?.(['0b'.repeat(32)]);
        await flush();
        expect(viewOf(root)?.activityGaps).toBe(2);
    });
});

describe('storefront-effects-are-gated-on-proof', () => {
    /** A take-shaped transaction: a grouped agora entry on the spent input. */
    function consumedTx(txid: string): ChainTx {
        return {
            txid,
            inputs: [
                {
                    inputScript: p2pkhScriptSig(PK_BYTES),
                    outputScript: STALL_SCRIPT,
                    plugins: { agora: { groups: ['50aa'], data: [] } },
                },
            ],
            outputs: [{ outputScript: STALL_SCRIPT }],
        };
    }

    it('an-effect-is-consumed-by-the-paint-that-shows-it', async () => {
        const { root } = bootStall(stallEmpty());
        await flush();
        const proof = publish(consumedTx('1a'.repeat(32)));
        watches[0]!.hooks.onBurst?.([proof]);
        await flush();
        // The ring named it for what the entries prove — never a sale.
        expect(viewOf(root)?.events?.[0]?.book).toBe('consumed');

        chain.book = { kind: 'offers', offers: [OFFER] };
        watches[0]!.hooks.onChanged?.('message');
        await flush();
        expect(
            viewOf(root)?.justChanged?.has(TOKEN),
            'a proven message re-read pulses the changed card',
        ).toBe(true);

        // Any later paint shows it consumed: the flourish never replays.
        watches[0]!.hooks.onBurst?.([
            publish(signedTx({ txid: '1b'.repeat(32), outputs: [STRANGER_SCRIPT] })),
        ]);
        await flush();
        expect(viewOf(root)?.justChanged).toBeUndefined();
    });

    it('a-reconnect-read-does-not-animate-a-sale', async () => {
        const { root } = bootStall(stallEmpty());
        await flush();
        watches[0]!.hooks.onBurst?.([publish(consumedTx('2a'.repeat(32)))]);
        await flush();
        chain.book = { kind: 'offers', offers: [OFFER] };
        // The same proof stands — but this read is a recheck, whose diff is
        // replica skew as often as news.
        watches[0]!.hooks.onChanged?.('recheck');
        await flush();
        expect(viewOf(root)?.fetch?.kind, 'the book itself is applied').toBe('offers');
        expect(viewOf(root)?.justChanged).toBeUndefined();
    });

    it('a-partial-refetch-that-lost-one-row-does-not-animate-a-clear', async () => {
        const { root } = bootStall(stallEmpty());
        await flush();
        // No proof anywhere: the burst carried ordinary money.
        watches[0]!.hooks.onBurst?.([
            publish(signedTx({ txid: '3a'.repeat(32), outputs: [STRANGER_SCRIPT] })),
        ]);
        await flush();
        chain.book = { kind: 'offers', offers: [OFFER] };
        watches[0]!.hooks.onChanged?.('message');
        await flush();
        expect(
            viewOf(root)?.justChanged,
            'a diff without proof is a replica question, not a sale',
        ).toBeUndefined();
    });
});

const TOKEN_B = 'bb'.repeat(32);
const OFFER_B = {
    outpoint: { txid: 'ef'.repeat(32), outIdx: 2 },
    tokenId: TOKEN_B,
    atoms: 12n,
    variant: 'PARTIAL' as const,
    askedSats: 200_000n,
    askedAtoms: 1n,
};
const OFFER_A_DEARER = {
    ...OFFER,
    outpoint: { txid: 'cd'.repeat(32), outIdx: 3 },
    askedSats: 500_000n,
};
const BROADCAST_FIXED = {
    preset: 'corner' as const,
    mode: 'fixed' as const,
    transparent: false,
    cards: 'listings' as const, side: 'right' as const, edge: 'bottom' as const
};
const BROADCAST_RETRY_MS = 30_000;
const BROADCAST_FIXED_MS = 8_000;
const UNREACHABLE_HOSTS = [
    { host: 'chronik-native1.fabien.cash', result: 'timeout' as const },
];

function stallOffers(
    offers: State['offers'],
    over: Partial<State['view']> = {},
): State {
    return {
        view: {
            route: { kind: 'pubkey', pubkeyHex: PK, address: ADDR },
            fetch: { kind: 'offers', offers },
            overlay: { kind: 'idle' },
            address: ADDR,
            tokens: new Map(),
            broadcast: BROADCAST_FIXED,
            ...over,
        },
        offers,
        pubkeyHex: PK,
    };
}

function bootOverlay(state: State): { root: HTMLElement } {
    window.history.replaceState(
        null,
        '',
        `${stallPath(PK)}?view=broadcast&preset=corner&mode=fixed`,
    );
    return bootStall(state);
}

/** A take-shaped transaction: a grouped agora entry on the spent input. */
function consumedTx(txid: string): ChainTx {
    return {
        txid,
        inputs: [
            {
                inputScript: p2pkhScriptSig(PK_BYTES),
                outputScript: STALL_SCRIPT,
                plugins: { agora: { groups: ['50aa'], data: [] } },
            },
        ],
        outputs: [{ outputScript: STALL_SCRIPT }],
    };
}

describe('a-broadcast-url-never-paints-the-shop-chrome', () => {
    /**
     * C3's second half: `loadCurrent` itself must copy the params onto the
     * view. The injected-loader tests cannot see that path.
     */
    it('loadCurrent copies the search params onto the view', async () => {
        window.history.replaceState(
            null,
            '',
            `${stallPath(PK)}?view=broadcast&bg=transparent`,
        );
        const root = document.createElement('div');
        boot(root);
        await flush();
        expect(viewOf(root)?.broadcast).toEqual({
            preset: 'corner',
            mode: 'rail',
            transparent: true,
            // The switch the parser now answers with, off unless it is asked
            // for: this URL names no `cards`, so the carousel is the shop's.
            cards: 'listings', side: 'right' as const, edge: 'bottom' as const,
        });
        expect(root.querySelector('[data-role="broadcast"]')).not.toBeNull();
        expect(root.querySelector('.tabs')).toBeNull();
        expect(root.querySelector('.stall')?.classList.contains('bc-clear')).toBe(true);
    });
});

describe('a-broadcast-cursor-survives-a-live-repaint', () => {
    /**
     * The cursor is app state. A live book apply rebuilds `fetch` and
     * `justChanged`; it must not reset the carousel to card 0.
     */
    it('keeps the cursor the book apply did not shrink', async () => {
        const { root } = bootOverlay(stallOffers([OFFER, OFFER_B], { broadcastCursor: 1 }));
        await flush();
        expect(viewOf(root)?.broadcastCursor).toBe(1);

        chain.book = { kind: 'offers', offers: [OFFER, OFFER_B] };
        watches[0]!.hooks.onChanged?.('recheck');
        await flush();
        expect(viewOf(root)?.broadcastCursor, 'a same-size book leaves the cursor').toBe(
            1,
        );
        expect(viewOf(root)?.broadcast).toEqual(BROADCAST_FIXED);
    });
});

describe('a-broadcast-cursor-is-clamped-when-the-book-shrinks', () => {
    /**
     * A take can shrink the list under the cursor. C7: reduced modulo the
     * listing count after every book apply. The renderer also modulo's at
     * paint time, so this asserts the *stored* cursor, not the painted card.
     */
    it('stores the cursor modulo the new listing count', async () => {
        const third = {
            ...OFFER_B,
            tokenId: 'cc'.repeat(32),
            outpoint: { txid: 'ab'.repeat(32), outIdx: 4 },
        };
        const { root } = bootOverlay(stallOffers([OFFER, OFFER_B, third], { broadcastCursor: 2 }));
        await flush();
        expect(viewOf(root)?.broadcastCursor).toBe(2);

        chain.book = { kind: 'offers', offers: [OFFER, OFFER_B] };
        watches[0]!.hooks.onChanged?.('recheck');
        await flush();
        expect(viewOf(root)?.broadcastCursor, '2 mod 2 is 0').toBe(0);
    });
});

describe('a-sibling-fill-is-not-this-cards-price-change', () => {
    /**
     * `justChanged` is a set of token ids. A dearer row of the shown token
     * stamps the token and does not move `cheapestOf(...).askedSats`. The
     * pulse is that figure, compared in `boot` before and after the apply,
     * never `justChanged`.
     */
    it('a dearer row of the shown token does not pulse the figure', async () => {
        const { root } = bootOverlay(stallOffers([OFFER]));
        await flush();
        const proof = publish(consumedTx('c1'.repeat(32)));
        watches[0]!.hooks.onBurst?.([proof]);
        await flush();
        chain.book = { kind: 'offers', offers: [OFFER, OFFER_A_DEARER] };
        watches[0]!.hooks.onChanged?.('message');
        await flush();
        expect(
            viewOf(root)?.justChanged?.has(TOKEN),
            'the shop flourish still names the token',
        ).toBe(true);
        expect(viewOf(root)?.broadcastPulse, 'the overlay does not borrow it').toBeUndefined();
        expect(root.querySelector('[data-role="price"]')?.classList.contains('pulse')).toBe(
            false,
        );
    });

    it('this card\'s askedSats moving pulses the figure even on a recheck', async () => {
        const { root } = bootOverlay(stallOffers([OFFER]));
        await flush();
        const moved = { ...OFFER, askedSats: 180_000n };
        chain.book = { kind: 'offers', offers: [moved] };
        watches[0]!.hooks.onChanged?.('recheck');
        await flush();
        expect(
            viewOf(root)?.justChanged,
            'a recheck does not stage the shop flourish',
        ).toBeUndefined();
        expect(viewOf(root)?.broadcastPulse).toBe(true);
        expect(root.querySelector('[data-role="price"]')?.classList.contains('pulse')).toBe(
            true,
        );
        expect(root.querySelector('.bc-ext')?.classList.contains('in')).toBe(false);
    });

    it('this card\'s askedSats dropping pulses the figure even on a recheck', async () => {
        const dear = { ...OFFER, askedSats: 180_000n };
        const { root } = bootOverlay(stallOffers([dear]));
        await flush();
        const cheaper = { ...OFFER, askedSats: 120_000n };
        chain.book = { kind: 'offers', offers: [cheaper] };
        watches[0]!.hooks.onChanged?.('recheck');
        await flush();
        expect(viewOf(root)?.broadcastPulse, 'a drop is still this card\'s price').toBe(
            true,
        );
        expect(root.querySelector('[data-role="price"]')?.classList.contains('pulse')).toBe(
            true,
        );
        expect(root.querySelector('.bc-ext')?.classList.contains('in')).toBe(false);
    });
});

describe('a-broadcast-param-on-the-door-is-dropped', () => {
    /**
     * The door is not a stall. `view=broadcast` on `/` is dropped rather
     * than overlaying the paste screen — `invalid` already keeps its
     * ordinary screen, and home does too, on purpose.
     */
    it('does not copy the param onto a home view', async () => {
        window.history.replaceState(null, '', '/?view=broadcast');
        const root = document.createElement('div');
        boot(root);
        await flush();
        expect(viewOf(root)?.route.kind).toBe('home');
        expect(viewOf(root)?.broadcast, 'the door is not a stall').toBeUndefined();
        expect(root.querySelector('[data-role="broadcast"]')).toBeNull();
        expect(root.textContent).toContain(HOME_LEDE);
        expect(location.pathname).toBe('/');
    });
});

describe('a-broadcast-retries-our-failure-on-its-own', () => {
    /**
     * Waiting screens keep their script socket. A retry timer would
     * `refresh()` and tear that handle down every 30 s. The retry exists
     * only for a resolved stall whose fetch failed.
     */
    afterEach(() => {
        vi.useRealTimers();
    });

    it('does not retry unresolved+unreachable, and still holds a live handle', async () => {
        vi.useFakeTimers();
        window.history.replaceState(null, '', `${stallPath(ADDR)}?view=broadcast`);
        let loads = 0;
        const root = document.createElement('div');
        boot(root, async () => {
            loads += 1;
            return {
                view: {
                    route: { kind: 'unresolved' as const, address: ADDR },
                    fetch: {
                        kind: 'unreachable' as const,
                        triedAtMs: 0,
                        hosts: UNREACHABLE_HOSTS,
                    },
                    overlay: { kind: 'idle' as const },
                    address: ADDR,
                    tokens: new Map(),
                    broadcast: BROADCAST_FIXED,
                },
                offers: [],
            };
        });
        await vi.advanceTimersByTimeAsync(0);
        expect(loads).toBe(1);
        expect(root.querySelector('[data-role="broadcast"]')).not.toBeNull();
        const watch = watches[0];
        expect(watch, 'the waiting screen opened a script socket').toBeDefined();
        expect(watch!.stall.pubkeyHex, 'no maker key yet').toBeUndefined();
        expect(watch!.closed).toBe(false);
        await vi.advanceTimersByTimeAsync(BROADCAST_RETRY_MS);
        expect(loads, 'must not reload after 30 s').toBe(1);
        expect(watch!.closed, 'the waiting handle is still live').toBe(false);
    });
});

describe('a-replaced-card-at-the-cursor-fades-and-does-not-pulse', () => {
    /**
     * Cursor unchanged, token A gone, token B now at that index: it is a
     * new card. Fade it. Never pulse — the pulse is this card's price
     * changing, and this is not the same card.
     */
    it('a different token at the same cursor fades in and does not pulse', async () => {
        const { root } = bootOverlay(stallOffers([OFFER]));
        await flush();
        chain.book = { kind: 'offers', offers: [OFFER_B] };
        watches[0]!.hooks.onChanged?.('recheck');
        await flush();
        expect(viewOf(root)?.broadcastStepped, 'a new card fades').toBe(true);
        expect(viewOf(root)?.broadcastPulse, 'a swap is not a price change').toBeUndefined();
        expect(root.querySelector('.bc-ext')?.classList.contains('in')).toBe(true);
        expect(root.querySelector('[data-role="price"]')?.classList.contains('pulse')).toBe(
            false,
        );
    });
});

describe('a-broadcast-failed-reread-is-stale-not-blank', () => {
    /**
     * A live overlay whose later re-read fails keeps its last-good card
     * rather than going blank, marked stale, with the carousel stopped.
     * Our failure still must not print.
     */
    afterEach(() => {
        vi.useRealTimers();
    });

    async function bootLiveOverlay(): Promise<HTMLElement> {
        vi.useFakeTimers();
        const { root } = bootOverlay(stallOffers([OFFER, OFFER_B]));
        await vi.advanceTimersByTimeAsync(0);
        expect(root.querySelector('.bc-item'), 'the card is up').not.toBeNull();
        expect(
            root.querySelector('[data-role="broadcast"]')?.getAttribute('data-state'),
        ).not.toBe('stale');
        return root;
    }

    it('a live re-read that throws keeps the card, marks stale, and stops the carousel', async () => {
        const root = await bootLiveOverlay();
        const cursor = viewOf(root)?.broadcastCursor ?? 0;
        chain.bookThrows = true;
        watches[0]!.hooks.onChanged?.('recheck');
        await vi.advanceTimersByTimeAsync(0);
        expect(
            root.querySelector('[data-role="broadcast"]')?.getAttribute('data-state'),
        ).toBe('stale');
        expect(root.querySelector('.bc-item'), 'the last-good card stays').not.toBeNull();
        expect(root.textContent).not.toContain(UNREACHABLE_BODY);
        await vi.advanceTimersByTimeAsync(BROADCAST_FIXED_MS);
        expect(
            root.querySelector('[data-role="broadcast"]')?.getAttribute('data-state'),
            'a carousel tick would have returned to live',
        ).toBe('stale');
        expect(viewOf(root)?.broadcastCursor ?? 0, 'the carousel was cleared').toBe(
            cursor,
        );
    });

    it('a live re-read that answers unreachable keeps the card and marks stale', async () => {
        const root = await bootLiveOverlay();
        const cursor = viewOf(root)?.broadcastCursor ?? 0;
        chain.book = {
            kind: 'unreachable',
            triedAtMs: 0,
            hosts: UNREACHABLE_HOSTS,
        };
        watches[0]!.hooks.onChanged?.('recheck');
        await vi.advanceTimersByTimeAsync(0);
        expect(
            root.querySelector('[data-role="broadcast"]')?.getAttribute('data-state'),
        ).toBe('stale');
        expect(root.querySelector('.bc-item'), 'the last-good card stays').not.toBeNull();
        expect(root.textContent).not.toContain(UNREACHABLE_BODY);
        await vi.advanceTimersByTimeAsync(BROADCAST_FIXED_MS);
        expect(
            root.querySelector('[data-role="broadcast"]')?.getAttribute('data-state'),
            'a carousel tick would have returned to live',
        ).toBe('stale');
        expect(viewOf(root)?.broadcastCursor ?? 0, 'the carousel was cleared').toBe(
            cursor,
        );
    });
});

describe('a-broadcast-definite-apply-clears-stale', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('a later offers apply drops the stale mark', async () => {
        vi.useFakeTimers();
        const { root } = bootOverlay(stallOffers([OFFER, OFFER_B]));
        await vi.advanceTimersByTimeAsync(0);
        chain.book = {
            kind: 'unreachable',
            triedAtMs: 0,
            hosts: UNREACHABLE_HOSTS,
        };
        watches[0]!.hooks.onChanged?.('recheck');
        await vi.advanceTimersByTimeAsync(0);
        expect(
            root.querySelector('[data-role="broadcast"]')?.getAttribute('data-state'),
        ).toBe('stale');

        chain.book = { kind: 'offers', offers: [OFFER, OFFER_B] };
        watches[0]!.hooks.onChanged?.('recheck');
        await vi.advanceTimersByTimeAsync(0);
        expect(viewOf(root)?.broadcastState, 'fixed mode returns to live').toBe('live');
        expect(
            root.querySelector('[data-role="broadcast"]')?.getAttribute('data-state'),
        ).toBe('live');
        expect(root.querySelector('.bc-item')).not.toBeNull();
    });
});

describe('a-fiat-hint-is-read-and-ignored', () => {
    /**
     * Was `fiat-hint-is-a-hint`, and the hint is now unhonoured: one currency
     * above the table (CLAUDE §8), so the glance is `usd` for everybody and
     * nothing paints a control that could change it.
     *
     * The tag is still **read** — `0x04` is permanent, records carrying it
     * exist, and a reader that dropped it could not carry it forward when the
     * seller republishes. It is simply not obeyed, and nothing on screen says
     * a word about it: an unhonoured suggestion is not an error.
     */
    it('reads the tag, paints usd, and says nothing about it', async () => {
        const { root } = bootStall(stallEmpty({ fiatHint: 'vnd' }));
        await flush();
        expect(viewOf(root)?.fiatHint, 'the record still reads').toBe('vnd');
        expect(viewOf(root)?.fiatCode).toBe('usd');
        expect(root.textContent).not.toContain('VND');
    });

    it('a stale saved code cannot pin a browser to another currency', async () => {
        localStorage.setItem('stall.fiat', 'eur');
        const { root } = bootStall(stallEmpty({ fiatHint: 'vnd' }));
        await flush();
        expect(viewOf(root)?.fiatCode).toBe('usd');
        expect(localStorage.getItem('stall.fiat')).toBeNull();
    });
});

describe('a-failed-facts-walk-does-not-erase-a-price', () => {
    /**
     * A walk that answers nothing cannot be told, from the answer alone, from
     * a seller who published nothing — so `gotNothing && hadSomething` stays,
     * and the price map is counted on both sides of it. Without that, a stall
     * whose seller published prices and no words lost every figure the moment
     * one walk failed: `descriptions` and `shelves` were both empty before and
     * after, so the guard saw nothing to protect.
     *
     * `failed` joins that guard rather than replacing it. It covers a case the
     * empty test cannot see — a walk that threw part way and came back with
     * *some* records — while replacing the guard with it would repeal "an
     * empty answer never erases words", which is a different rule about a walk
     * that finished.
     */
    const PRICE = { code: 'usd', exponent: 2, amount: 1250n } as const;

    it('keeps a priced stall’s figures when the walk throws', async () => {
        const { root } = bootStall(
            stallEmpty({
                fetch: { kind: 'offers', offers: [OFFER] },
                tokens: new Map([[TOKEN, TOKEN_META]]),
                prices: new Map([[TOKEN, PRICE]]),
            }),
        );
        await flush();
        expect(viewOf(root)?.prices?.get(TOKEN)).toEqual(PRICE);

        chain.historyThrows = true;
        chain.txThrows = true;
        watches[0]!.hooks.onBurst?.(['0a'.repeat(32)]);
        await flush();

        expect(chain.calls.stld, 'it did try').toBe(1);
        expect(
            viewOf(root)?.prices?.get(TOKEN),
            'our own failure is not a seller who unpriced their stock',
        ).toEqual(PRICE);
    });

    it('an-empty-facts-answer-does-not-erase-a-price', async () => {
        // The walk answers, and finds nothing — indistinguishable on this path
        // from the walk that failed, so it is treated the same way.
        const { root } = bootStall(
            stallEmpty({
                fetch: { kind: 'offers', offers: [OFFER] },
                tokens: new Map([[TOKEN, TOKEN_META]]),
                prices: new Map([[TOKEN, PRICE]]),
            }),
        );
        await flush();

        watches[0]!.hooks.onBurst?.(['0b'.repeat(32)]);
        await flush();

        expect(chain.calls.stld, 'it did walk, and the index was empty').toBe(1);
        expect(viewOf(root)?.prices?.get(TOKEN)).toEqual(PRICE);
    });

    it('a-partial-answer-from-a-walk-that-threw-does-not-replace-the-map', async () => {
        /**
         * Page 0 answered with a record and page 1 threw, so the lookup
         * carries one token and is `failed`. It does not REPLACE the map —
         * a floor is not the seller's whole record — and since 2026-09-25 it
         * is MERGED into it per token (`overKept`, the critic's eighth pass,
         * item 3). The rule reversed because the old one was wrong on a
         * phone: the walk reads newest block first, so a token it resolved
         * is the seller's latest word, and refusing the whole answer kept a
         * figure the walk had already read past (or an item the seller had
         * removed) on a screen with no heartbeat to correct it — and Pay
         * composed it. So the token the walk resolved shows what it read,
         * and the token it never reached keeps the record on screen, said
         * to be as last read.
         */
        const { root } = bootStall(
            stallEmpty({
                fetch: { kind: 'offers', offers: [OFFER] },
                tokens: new Map([[TOKEN, TOKEN_META]]),
                prices: new Map([[TOKEN, PRICE]]),
            }),
        );
        await flush();

        const hex = encodeDescriptionHex(TOKEN_B, 'Sun dried', {
            price: { code: 'xec', exponent: 2, amount: 900n },
        });
        if (hex === undefined) {
            throw new Error('fixture is not encodable');
        }
        const record = signedTx({ txid: '0e'.repeat(32), outputs: [`6a${hex}`], height: 5 });
        chain.txs.set(record.txid, record);
        chain.historyPages = [[record], []];
        chain.historyPageThrows = new Set([1]);
        watches[0]!.hooks.onBurst?.([record.txid]);
        await flush();

        expect(chain.historyPageCalls, 'it did try the second page').toContain(1);
        expect(viewOf(root)?.prices?.get(TOKEN), 'the token it never reached keeps its record').toEqual(PRICE);
        expect(
            viewOf(root)?.prices?.get(TOKEN_B),
            'the token it resolved shows what it read',
        ).toEqual({ code: 'xec', exponent: 2, amount: 900n });
        expect(viewOf(root)?.recordsStale, 'and the kept record is said to be as last read').toBe(true);
    });

    it('applies a walk that did find something', async () => {
        // The guard must not become "never replace anything": a real answer
        // still lands, which is what makes the empty case a decision.
        const { root } = bootStall(
            stallEmpty({
                fetch: { kind: 'offers', offers: [OFFER] },
                tokens: new Map([[TOKEN, TOKEN_META]]),
                prices: new Map([[TOKEN, PRICE]]),
            }),
        );
        await flush();

        const hex = encodeDescriptionHex(TOKEN, 'Sun dried', {
            price: { code: 'xec', exponent: 2, amount: 900n },
        });
        if (hex === undefined) {
            throw new Error('fixture is not encodable');
        }
        publish(signedTx({ txid: '0c'.repeat(32), outputs: [`6a${hex}`], height: 5 }));
        watches[0]!.hooks.onBurst?.(['0c'.repeat(32)]);
        await flush();

        expect(viewOf(root)?.prices?.get(TOKEN)).toEqual({
            code: 'xec',
            exponent: 2,
            amount: 900n,
        });
    });
});

describe('a-finalized-message-updates-the-row-in-place', () => {
    /**
     * chronik names one transaction at least twice, and the later frame says
     * what happened to it — `TX_CONFIRMED`, then `TX_FINALIZED` with the
     * reason. The ring keeps the first sighting so rows do not rearrange
     * under a reader, and the status is what changes: same row, same
     * position, a new state.
     *
     * The status comes from the **message**, not from a second fetch: the
     * chain has just told this page the answer, and asking again would be a
     * round trip to learn what arrived in the frame we already have.
     */
    const payment = (txid: string): ChainTx => ({
        txid,
        inputs: [{ inputScript: '00', outputScript: STRANGER_SCRIPT }],
        outputs: [{ outputScript: STALL_SCRIPT, sats: 5_460n }],
    });

    it('keeps the row where it was and moves only its state', async () => {
        const { root } = bootStall(stallEmpty());
        await flush();
        const first = '31'.repeat(32);
        const second = '32'.repeat(32);
        chain.txs.set(first, payment(first));
        chain.txs.set(second, payment(second));

        watches[0]!.hooks.onBurst?.(
            [first, second],
            new Map([[first, { msgType: 'TX_ADDED_TO_MEMPOOL' }]]),
        );
        await flush(20);

        let events = viewOf(root)?.events ?? [];
        expect(events.map((e) => e.txid), 'newest first').toEqual([second, first]);
        expect(
            events[1]?.status,
            'a mempool frame is one node’s opinion, not a state this page states',
        ).toEqual({ kind: 'unknown' });

        watches[0]!.hooks.onBurst?.(
            [first],
            new Map([
                [
                    first,
                    {
                        msgType: 'TX_FINALIZED',
                        finalizationReasonType: 'TX_FINALIZATION_REASON_PRE_CONSENSUS',
                    },
                ],
            ]),
        );
        await flush(20);

        events = viewOf(root)?.events ?? [];
        expect(events, 'a confirmation is not a second row').toHaveLength(2);
        expect(events.map((e) => e.txid), 'and it did not jump the queue').toEqual([
            second,
            first,
        ]);
        expect(events[1]?.status).toEqual({ kind: 'finalized', avalanche: true });
        expect(events[1]?.seenAtMs, 'the first sighting is kept').toBe(
            viewOf(root)?.events?.[1]?.seenAtMs,
        );
    });

    it('never walks a state backwards', async () => {
        const { root } = bootStall(stallEmpty());
        await flush();
        const txid = '33'.repeat(32);
        chain.txs.set(txid, payment(txid));
        watches[0]!.hooks.onBurst?.(
            [txid],
            new Map([[txid, { msgType: 'TX_FINALIZED' }]]),
        );
        await flush(20);
        expect(viewOf(root)?.events?.[0]?.status).toEqual({
            kind: 'finalized',
            avalanche: false,
        });

        // A block reorg re-announces a finalized transaction as a mempool
        // arrival on some node. Painting "not known to this page" over a
        // state the chain already proved would be the feed unlearning.
        watches[0]!.hooks.onBurst?.(
            [txid],
            new Map([[txid, { msgType: 'TX_ADDED_TO_MEMPOOL' }]]),
        );
        await flush(20);
        expect(viewOf(root)?.events?.[0]?.status).toEqual({
            kind: 'finalized',
            avalanche: false,
        });
    });
});

describe('history-is-its-own-list-with-its-own-cap-and-clock', () => {
    /**
     * The ring and the walk answer two different questions on two different
     * clocks: "what has this page watched arrive" (page clock, capped at
     * `MAX_STALL_EVENTS`) and "what does this address's history hold" (chain
     * clock, capped at `MAX_ACTIVITY_PAGES` round trips). One list holding
     * both would truncate the walk to fifty rows and date them from a clock
     * that never saw them.
     */
    const walkedTx = (txid: string, over: Partial<ChainTx> = {}): ChainTx => ({
        txid,
        inputs: [{ inputScript: '00', outputScript: STRANGER_SCRIPT }],
        outputs: [{ outputScript: STALL_SCRIPT, sats: 5_460n }],
        timeFirstSeen: 1_756_400_000,
        block: { height: 800_100, timestamp: 1_756_400_600 },
        isFinal: true,
        ...over,
    });

    /** Open the Activity tab and press the control that reads one page. */
    async function readPage(root: HTMLElement): Promise<void> {
        const more = root.querySelector<HTMLButtonElement>('[data-role="history-more"]');
        expect(more, 'the panel offers a page to read').not.toBeNull();
        more!.click();
        await flush(20);
    }

    function openActivity(root: HTMLElement): void {
        (root.querySelector('[data-role="tab-activity"]') as HTMLButtonElement).click();
    }

    it('keeps two lists, two clocks, and its own page cap', async () => {
        const { root } = bootStall(stallEmpty());
        await flush();
        chain.historyPages = Array.from({ length: MAX_ACTIVITY_PAGES + 2 }, (_, i) => [
            walkedTx(`${(i + 0x50).toString(16)}`.repeat(32)),
        ]);
        openActivity(root);
        await flush();

        for (let i = 0; i < MAX_ACTIVITY_PAGES; i += 1) {
            await readPage(root);
        }

        const history = viewOf(root)?.history;
        expect(history?.rows).toHaveLength(MAX_ACTIVITY_PAGES);
        expect(history?.pagesRead).toBe(MAX_ACTIVITY_PAGES);
        expect(history?.capped, 'our own ceiling, said rather than hidden').toBe(true);
        expect(
            chain.historyPageCalls,
            'from page zero, one page per gesture, in order',
        ).toEqual(Array.from({ length: MAX_ACTIVITY_PAGES }, (_, i) => i));

        // The chain's clock, and never this page's.
        for (const row of history?.rows ?? []) {
            expect(row.chainTimeS).toBe(1_756_400_000);
            expect(row.seenAtMs).toBeUndefined();
            expect(row.status).toEqual({ kind: 'finalized', avalanche: false });
        }
        // Two lists: the ring is untouched by a walk.
        expect(viewOf(root)?.events ?? [], 'the walk is not the ring').toHaveLength(0);
        expect(
            root.querySelector('[data-role="history-more"]'),
            'at the cap the control is gone',
        ).toBeNull();
    });

    it('stops at the end of the address’s history without hitting the cap', async () => {
        const { root } = bootStall(stallEmpty());
        await flush();
        chain.historyPages = [[walkedTx('5a'.repeat(32))], [walkedTx('5b'.repeat(32))]];
        openActivity(root);
        await flush();
        await readPage(root);
        expect(viewOf(root)?.history?.done).toBeFalsy();
        await readPage(root);
        expect(viewOf(root)?.history?.done).toBe(true);
        expect(viewOf(root)?.history?.capped).toBeFalsy();
        expect(viewOf(root)?.history?.rows).toHaveLength(2);
    });

    it('carries the ring’s book shape onto the row the walk found again', async () => {
        // A walked page need not carry plugin entries — an older node, a
        // replica without the plugin — and the ring saw the entries live. The
        // overlap is normal; the stronger fact wins.
        const { root } = bootStall(stallEmpty());
        await flush();
        const txid = '5c'.repeat(32);
        chain.txs.set(txid, {
            txid,
            inputs: [
                {
                    inputScript: '00',
                    outputScript: STRANGER_SCRIPT,
                    plugins: { agora: { groups: ['50aa'], data: [] } },
                },
            ],
            outputs: [{ outputScript: STALL_SCRIPT, sats: 5_460n }],
        });
        watches[0]!.hooks.onBurst?.([txid]);
        await until(() => viewOf(root)?.events?.[0]?.book === 'consumed');
        expect(viewOf(root)?.events?.[0]?.book).toBe('consumed');

        chain.historyPages = [
            [
                {
                    txid,
                    inputs: [{ inputScript: '00', outputScript: STRANGER_SCRIPT }],
                    outputs: [{ outputScript: STALL_SCRIPT, sats: 5_460n }],
                    timeFirstSeen: 1_756_400_000,
                },
            ],
        ];
        openActivity(root);
        await flush();
        await readPage(root);
        expect(viewOf(root)?.history?.rows[0]?.book).toBe('consumed');
    });

    it('a new stall is a new list', async () => {
        // The loader answers the stall the location names. One that answered
        // this stall for every route brought its history back from the memo
        // on the "new" stall, and the test passed only while it read a
        // file-wide capture another app had painted last (CARRYOVER-2 item 9).
        const PK_C_BYTES = Uint8Array.from([0x02, ...new Array<number>(32).fill(0xcc)]);
        const PK_C = toHex(PK_C_BYTES);
        const ADDR_C = encodeCashAddress('ecash', 'p2pkh', toHex(shaRmd160(PK_C_BYTES)));
        const stateC: State = {
            ...stallEmpty({ route: { kind: 'pubkey', pubkeyHex: PK_C, address: ADDR_C }, address: ADDR_C }),
            pubkeyHex: PK_C,
        };
        const root = document.createElement('div');
        boot(root, async () => (location.pathname === stallPath(PK_C) ? stateC : stallEmpty()));
        await flush();
        chain.historyPages = [[walkedTx('5d'.repeat(32))]];
        openActivity(root);
        await flush();
        await readPage(root);
        expect(viewOf(root)?.history?.rows).toHaveLength(1);

        window.history.pushState(null, '', stallPath(PK_C));
        window.dispatchEvent(new PopStateEvent('popstate'));
        await flush(20);
        const route = viewOf(root)?.route;
        expect(route?.kind === 'pubkey' ? route.pubkeyHex : undefined, 'the new stall is on screen').toBe(PK_C);
        expect(
            viewOf(root)?.history,
            'one seller’s history must not be attributed to another',
        ).toBeUndefined();
    });
});

describe('a-walked-history-memo-is-capped-like-every-other-buffer', () => {
    /**
     * §2 caps every buffer. A visitor can open stalls all afternoon and each
     * entry here can hold `MAX_ACTIVITY_PAGES` pages of rows, so the memo that
     * saves a reader from re-walking a stall they came back to is bounded and
     * evicts the least recently walked one.
     */
    const walkedTx = (txid: string): ChainTx => ({
        txid,
        inputs: [{ inputScript: '00', outputScript: STRANGER_SCRIPT }],
        outputs: [{ outputScript: STALL_SCRIPT, sats: 1_000n }],
        timeFirstSeen: 1_756_400_000,
    });

    it('gives a stall its pages back on a refresh of the same stall', async () => {
        const { root } = bootStall(stallEmpty());
        await flush();
        chain.historyPages = [[walkedTx('80'.repeat(32))], [walkedTx('81'.repeat(32))]];
        (root.querySelector('[data-role="tab-activity"]') as HTMLButtonElement).click();
        await flush();
        root.querySelector<HTMLButtonElement>('[data-role="history-more"]')!.click();
        await flush(20);
        expect(viewOf(root)?.history?.rows).toHaveLength(1);

        // The same stall again, through the retry control, which is a full
        // `refresh()`. Asserted on **this app's own DOM**: `boot` never
        // removes its popstate listener, so a navigation-driven refresh
        // repaints every app booted earlier in this file too.
        (root.querySelector('[data-role="tab-shop"]') as HTMLButtonElement).click();
        await flush();
        (root.querySelector('[data-role="retry"]') as HTMLButtonElement).click();
        await flush(20);
        (root.querySelector('[data-role="tab-activity"]') as HTMLButtonElement).click();
        await flush();
        expect(
            root.querySelectorAll('[data-role="history"] li.event'),
            'the walk came back',
        ).toHaveLength(1);
        expect(chain.historyPageCalls, 'and nothing was re-read').toEqual([0]);
    });
});

describe('the-first-scroll-reads-page-zero', () => {
    /**
     * Paging from the newest transaction the ring happens to hold would
     * start at page N+1 and never read page 0, so everything between the
     * page load and the first scroll would be missing from both lists. The
     * walk always starts at zero; overlap with the ring is normal and cheap.
     */
    it('asks for page zero first, and reads one page per gesture', async () => {
        const { root } = bootStall(stallEmpty());
        await flush();
        chain.historyPages = [
            [
                {
                    txid: '60'.repeat(32),
                    inputs: [{ inputScript: '00', outputScript: STRANGER_SCRIPT }],
                    outputs: [{ outputScript: STALL_SCRIPT, sats: 1_000n }],
                    timeFirstSeen: 1_756_400_000,
                },
            ],
            [
                {
                    txid: '61'.repeat(32),
                    inputs: [{ inputScript: '00', outputScript: STRANGER_SCRIPT }],
                    outputs: [{ outputScript: STALL_SCRIPT, sats: 1_000n }],
                    timeFirstSeen: 1_756_300_000,
                },
            ],
        ];
        (root.querySelector('[data-role="tab-activity"]') as HTMLButtonElement).click();
        await flush();
        expect(chain.historyPageCalls, 'nothing is walked until it is asked for').toEqual(
            [],
        );

        const more = () =>
            root.querySelector<HTMLButtonElement>('[data-role="history-more"]')!;
        more().click();
        // A second press while the first page is in flight buys nothing: one
        // page at a time, or a fast reader spends ten round trips at once.
        more().click();
        await flush(20);
        expect(chain.historyPageCalls).toEqual([0]);
        expect(viewOf(root)?.history?.rows.map((r) => r.txid)).toEqual(['60'.repeat(32)]);

        more().click();
        await flush(20);
        expect(chain.historyPageCalls).toEqual([0, 1]);
        expect(viewOf(root)?.history?.rows).toHaveLength(2);
    });
});

describe('a-failed-page-does-not-poison-the-list', () => {
    /**
     * A page that did not answer is a hole in what this page read, not a
     * statement about the seller — the rule §4 already holds for the book.
     * What was read stays on screen, the panel says the page failed, and the
     * same control asks for that page again.
     */
    it('keeps what it read, says so, and retries the same page', async () => {
        const { root } = bootStall(stallEmpty());
        await flush();
        const good = (txid: string): ChainTx => ({
            txid,
            inputs: [{ inputScript: '00', outputScript: STRANGER_SCRIPT }],
            outputs: [{ outputScript: STALL_SCRIPT, sats: 1_000n }],
            timeFirstSeen: 1_756_400_000,
        });
        chain.historyPages = [[good('70'.repeat(32))], [good('71'.repeat(32))]];
        (root.querySelector('[data-role="tab-activity"]') as HTMLButtonElement).click();
        await flush();
        root.querySelector<HTMLButtonElement>('[data-role="history-more"]')!.click();
        await flush(20);
        expect(viewOf(root)?.history?.rows).toHaveLength(1);

        chain.historyPageThrows = new Set([1]);
        root.querySelector<HTMLButtonElement>('[data-role="history-more"]')!.click();
        await flush(20);
        expect(viewOf(root)?.history?.failed).toBe(true);
        expect(viewOf(root)?.history?.rows, 'nothing already read was lost').toHaveLength(
            1,
        );
        expect(viewOf(root)?.history?.pagesRead, 'the failed page was not counted').toBe(
            1,
        );
        expect(viewOf(root)?.history?.done, 'a failure is not an ending').toBeFalsy();

        chain.historyPageThrows = new Set();
        root.querySelector<HTMLButtonElement>('[data-role="history-retry"]')!.click();
        await flush(20);
        expect(chain.historyPageCalls, 'the same page, asked again').toEqual([0, 1, 1]);
        expect(viewOf(root)?.history?.rows).toHaveLength(2);
        expect(viewOf(root)?.history?.failed).toBeFalsy();
    });
});

describe('a-live-update-does-not-change-the-figure-under-a-buyer', () => {
    /**
     * The pay sheet holds the buyer's quantity in a closure and the rate it
     * froze in `view.payRate`. A book message and a facts re-read both land
     * while it is open — a stranger's dust is enough to cause one — and
     * neither may move the figure the buyer is about to sign.
     *
     * The state is what is asserted, not the DOM: `livePaint` already waits on
     * `holdsLivePaint`, so "the tree did not change" would pass without the rate
     * being protected at all.
     */
    const QUOTED_META = {
        tokenId: TOKEN,
        name: 'Ripe Beans',
        ticker: 'RB',
        decimals: 0,
        tokenType: { protocol: 'SLP', type: 'SLP_TOKEN_TYPE_FUNGIBLE' },
    };
    const FROZEN = 20_000_000n;

    it('keeps the frozen rate and the painted figure across a burst', async () => {
        priceControl.fetch = async () => FROZEN;
        const { root } = bootStall(
            stallEmpty({
                tokens: new Map([[TOKEN, QUOTED_META]]),
                prices: new Map([[TOKEN, { code: 'usd', exponent: 2, amount: 500n }]]),
            }),
        );
        await flush();
        (root.querySelector('[data-role="pay-open"]') as HTMLButtonElement).click();
        await flush();
        const figure = root.querySelector('[data-role="pay"] [data-role="price"]')
            ?.textContent;
        expect(figure, 'the sheet composed a figure').toBe('250,000');
        expect(viewOf(root)?.payRate?.rate).toBe(FROZEN);

        // The feed would answer differently now; nothing on the live path asks.
        priceControl.fetch = async () => 10_000_000n;
        chain.book = { kind: 'offers', offers: [OFFER] };
        watches[0]!.hooks.onChanged?.('message');
        watches[0]!.hooks.onBurst?.(['0d'.repeat(32)]);
        await flush();

        expect(viewOf(root)?.payRate?.rate, 'the frozen rate is untouched').toBe(FROZEN);
        expect(
            root.querySelector('[data-role="pay"] [data-role="price"]')?.textContent,
            'and so is the figure on screen',
        ).toBe(figure);
    });
});

describe('the-door-and-a-broadcast-drop-the-pay-hint', () => {
    /**
     * The door is not a stall, and a stream overlay mounts no sheet — so on
     * either of them an item named in the URL would open nothing and say
     * nothing. The parameter is not carried there at all.
     */
    // The real `loadCurrent`, because the parameter is read there: an
    // injected loader answers a state the URL never touched, which would make
    // this pass without either parameter being dropped by anything.
    it('carries no hint on the apex or under a broadcast', async () => {
        window.history.replaceState(null, '', `/?pay=${'cd'.repeat(6)}`);
        const root = document.createElement('div');
        boot(root);
        await flush();
        expect(viewOf(root)?.route.kind).toBe('home');
        expect(viewOf(root)?.payHint).toBeUndefined();
        expect(viewOf(root)?.payHintNote).toBeUndefined();

        window.history.replaceState(
            null,
            '',
            `${stallPath(PK)}?view=broadcast&pay=${'cd'.repeat(6)}`,
        );
        const overlay = document.createElement('div');
        boot(overlay);
        await flush();
        expect(viewOf(overlay)?.broadcast, 'the overlay is still the overlay').toBeDefined();
        expect(viewOf(overlay)?.payHint).toBeUndefined();
        expect(viewOf(overlay)?.overlay.kind).toBe('idle');
    });

    it('carries it on an ordinary stall URL', async () => {
        window.history.replaceState(null, '', `${stallPath(PK)}?pay=${'cd'.repeat(6)}`);
        const root = document.createElement('div');
        boot(root);
        await flush();
        expect(viewOf(root)?.payHint).toBe('cd'.repeat(6));
    });
});

/*
 * The overlay's other rail: the seller's own quotes, which come from the
 * descriptions walk and not from the book. Everything the listings carousel
 * does on a book apply, this one has to do on a facts apply — one selector,
 * or the cursor and the card drift apart.
 */
const BROADCAST_QUOTES = {
    preset: 'corner' as const,
    mode: 'fixed' as const,
    transparent: false,
    cards: 'quotes' as const, side: 'right' as const, edge: 'bottom' as const
};

const fungible = (tokenId: string, name: string) => ({
    tokenId,
    name,
    ticker: name.slice(0, 4).toUpperCase(),
    decimals: 0,
    tokenType: { protocol: 'SLP', type: 'SLP_TOKEN_TYPE_FUNGIBLE' },
});

const USD = (amount: bigint) => ({ code: 'usd', exponent: 2, amount });

function quotesOverlay(
    prices: Map<string, { code: string; exponent: number; amount: bigint }>,
    over: Partial<State['view']> = {},
): State {
    return {
        view: {
            route: { kind: 'pubkey', pubkeyHex: PK, address: ADDR },
            fetch: { kind: 'offers', offers: [OFFER] },
            overlay: { kind: 'idle' },
            address: ADDR,
            tokens: new Map([
                [TOKEN, fungible(TOKEN, 'Ripe Beans')],
                [TOKEN_B, fungible(TOKEN_B, 'Green Tea')],
            ]),
            prices,
            broadcast: BROADCAST_QUOTES,
            ...over,
        },
        offers: [OFFER],
        pubkeyHex: PK,
    };
}

function bootQuotesOverlay(state: State): { root: HTMLElement } {
    window.history.replaceState(
        null,
        '',
        `${stallPath(PK)}?view=broadcast&preset=corner&mode=fixed&cards=quotes`,
    );
    return bootStall(state);
}

/** One STLD record the stall's own key signed, with a figure on it. */
function pricedRecord(
    txid: string,
    tokenId: string,
    price: { code: string; exponent: number; amount: bigint },
): string {
    const hex = encodeDescriptionHex(tokenId, 'Sun dried', { price });
    if (hex === undefined) {
        throw new Error('fixture is not encodable');
    }
    return publish(signedTx({ txid, outputs: [`6a${hex}`], height: 5 }));
}

describe('a-pay-cursor-is-clamped-when-the-quotes-shrink', () => {
    /**
     * The carousel indexes one list, and on this rail that list is the pay
     * set — which moves when the descriptions walk answers, not when the book
     * does. A cursor clamped only on a book apply would point past the end of
     * a shrunken quote set and show nothing at all.
     */
    it('stores the cursor modulo the new quote count', async () => {
        const { root } = bootQuotesOverlay(
            quotesOverlay(
                new Map([
                    [TOKEN, USD(500n)],
                    [TOKEN_B, USD(900n)],
                ]),
                { broadcastCursor: 1 },
            ),
        );
        await flush();
        expect(viewOf(root)?.broadcastCursor).toBe(1);

        // The seller takes the second quote off: the walk reads the
        // removal, so the quote set shrinks to one. (A walk that merely
        // never met it would leave it — our gap, never the seller's;
        // CRITIC-CARRYOVER-3 item 3.)
        const txid = pricedRecord('0d'.repeat(32), TOKEN, USD(500n));
        const removal = encodeRemovalHex(TOKEN_B);
        if (removal === undefined) {
            throw new Error('fixture is not encodable');
        }
        const gone = publish(signedTx({ txid: '0c'.repeat(32), outputs: [`6a${removal}`], height: 5 }));
        watches[0]!.hooks.onBurst?.([txid, gone]);
        await flush();

        expect(viewOf(root)?.prices?.size, 'one quote left').toBe(1);
        expect(viewOf(root)?.broadcastCursor, '1 mod 1 is 0').toBe(0);
    });
});

describe('a-quote-change-pulses-and-a-replaced-quote-fades', () => {
    /**
     * The same two motions the listings card has, over the figure this card
     * actually shows: a new token at the cursor is a new card and fades, and
     * the seller republishing a figure on the shown token pulses.
     */
    it('pulses when the shown token’s own quote moves', async () => {
        const { root } = bootQuotesOverlay(quotesOverlay(new Map([[TOKEN, USD(500n)]])));
        await flush();
        expect(root.querySelector('[data-role="seller-price"]')?.textContent).toBe('$5.00');

        const txid = pricedRecord('0e'.repeat(32), TOKEN, USD(700n));
        watches[0]!.hooks.onBurst?.([txid]);
        await flush();

        expect(viewOf(root)?.broadcastPulse).toBe(true);
        expect(viewOf(root)?.broadcastStepped, 'the same card did not fade').toBeUndefined();
        expect(root.querySelector('[data-role="seller-price"]')?.textContent).toBe('$7.00');
        expect(
            root.querySelector('[data-role="seller-price"]')?.classList.contains('pulse'),
        ).toBe(true);
    });

    it('fades when a different token lands at the cursor', async () => {
        const { root } = bootQuotesOverlay(quotesOverlay(new Map([[TOKEN, USD(500n)]])));
        await flush();

        const txid = pricedRecord('0f'.repeat(32), TOKEN_B, USD(500n));
        watches[0]!.hooks.onBurst?.([txid]);
        await flush();

        expect(viewOf(root)?.broadcastStepped, 'a new card fades').toBe(true);
        expect(viewOf(root)?.broadcastPulse, 'a swap is not a price change').toBeUndefined();
        expect(root.querySelector('.bc-nm')?.textContent).toBe('Green Tea');
        expect(root.querySelector('.bc-ext')?.classList.contains('in')).toBe(true);
    });
});

describe('a-failed-facts-reread-leaves-the-quote-card-stale', () => {
    /**
     * `loadDescriptions` cannot tell its own failed walk from a seller who
     * published nothing, so an empty answer never erases the quotes already on
     * screen. On the overlay that leaves a card nobody could re-confirm: it
     * stays, dimmed, exactly as a failed book re-read leaves the listing card
     * — never blank, and never a word of our own failure.
     */
    it('keeps the card and marks it stale', async () => {
        const { root } = bootQuotesOverlay(quotesOverlay(new Map([[TOKEN, USD(500n)]])));
        await flush();
        expect(
            root.querySelector('[data-role="broadcast"]')?.getAttribute('data-state'),
        ).not.toBe('stale');

        chain.historyThrows = true;
        chain.txThrows = true;
        watches[0]!.hooks.onBurst?.(['1a'.repeat(32)]);
        await flush();

        expect(
            root.querySelector('[data-role="broadcast"]')?.getAttribute('data-state'),
        ).toBe('stale');
        expect(root.querySelector('[data-role="seller-price"]')?.textContent).toBe('$5.00');
        expect(root.textContent).not.toContain(UNREACHABLE_BODY);
    });
});

/*
 * The failure screens, against the real `loadCurrent`.
 *
 * The offer book and the seller's own records are two reads of two indexes,
 * and only one of them needs the agora plugin. What these pin is that the
 * other one still happens, still lands, and still says nothing it did not
 * read.
 */

/** What `chronik.token()` answers with for a token whose genesis this chain has. */
const genesisOf = (name: string) => ({
    genesisInfo: { tokenName: name, tokenTicker: name.slice(0, 4).toUpperCase(), decimals: 0, url: '' },
    tokenType: { protocol: 'SLP', type: 'SLP_TOKEN_TYPE_FUNGIBLE' },
});

/** Quoted, and never given a genesis by any test here. */
const UNREAD_TOKEN = '77'.repeat(32);

const PLUGIN_MISSING = {
    kind: 'plugin-missing' as const,
    triedAtMs: 0,
    hosts: [{ host: 'chronik-native1.fabien.cash', result: 'plugin-missing' as const }],
};

/**
 * A stall that published a name and one quote.
 *
 * The quoted token is given per call: genesis facts are cached per session by
 * design (§4), so a token another test in this file already read would arrive
 * with a name here and make "the metas never came" untestable.
 */
function publishNameAndQuote(tokenId: string, txids: readonly [string, string]): void {
    publish(signedTx({ txid: txids[0], outputs: [stl1Output('Riverside Goods')], height: 5 }));
    pricedRecord(txids[1], tokenId, USD(500n));
}

describe('a-plugin-failure-still-paints-the-quotes', () => {
    /**
     * `plugin-missing` is a node that answered — a protocol-level 404 from a
     * chronik without `agora.py`. The address history it also serves carries
     * the settings and the seller's own records, and a quote needs no covenant
     * at all, so gating the rail on the plugin was the wrong coupling.
     */
    it('paints the name and the quote this load read, under the failure', async () => {
        chain.book = PLUGIN_MISSING;
        publishNameAndQuote(TOKEN, ['3a'.repeat(32), '3b'.repeat(32)]);
        chain.genesis.set(TOKEN, genesisOf('Ripe Beans'));

        const root = document.createElement('div');
        boot(root);
        await flush();

        // In its own words: this node answered and has no offer plugin, which
        // is why the rail beside it read anything at all.
        expect(root.textContent, 'the book failed and says so').toContain(
            PLUGIN_MISSING_BODY,
        );
        expect(root.querySelector('.hosts')).not.toBeNull();
        expect(root.textContent, 'a name this load read').toContain('Riverside Goods');
        // The quotes are the panel's other rail now. A failed book is not a
        // shop with nothing in it, so the screen opens on the side that says
        // so — and the count on the other label is what says there is a quote
        // to go and read.
        const toQuotes = root.querySelector(
            '[data-role="shop-tab-quotes"]',
        ) as HTMLButtonElement;
        expect(toQuotes.textContent, 'the quote this load read is counted').toContain('1');
        toQuotes.click();
        expect(root.querySelector('[data-role="pay-row"]')).not.toBeNull();
        expect(root.querySelector('[data-role="seller-price"]')?.textContent).toBe('$5.00');
        expect(root.textContent).toContain('Ripe Beans');
    });
});

describe('a-failed-book-paints-no-quote-count-it-cannot-explain', () => {
    /**
     * The genesis read is how a quote becomes a row: without it the item could
     * be an NFT, and a figure per whole token means nothing about one. That gap
     * is counted out loud — but never on the screen that is already saying we
     * failed, where a reader would be told twice about one failure and the
     * second telling reads as being about the seller's items.
     *
     * The two are different sides of the panel now, so that is what keeps them
     * apart: the failure screen carries the message and the hosts box, the
     * count belongs to the rail it is about, and the label above says no number
     * at all rather than a zero it cannot stand behind.
     */
    it('says nothing about quotes whose genesis it could not read', async () => {
        chain.book = PLUGIN_MISSING;
        publishNameAndQuote(UNREAD_TOKEN, ['3c'.repeat(32), '3d'.repeat(32)]);
        // No genesis on this chain: `chronik.token()` throws for every id.

        const root = document.createElement('div');
        boot(root);
        await flush();

        expect(viewOf(root)?.prices?.size, 'the walk did find the record').toBe(1);
        expect(root.querySelector('[data-role="pay-unreadable"]')).toBeNull();
        expect(root.querySelector('[data-role="pay-section"]')).toBeNull();
        // The book failure this fixture stages is `plugin-missing`, whose
        // screen names itself; the point here is that the message is on it
        // once and the count is not.
        expect(root.textContent).toContain(PLUGIN_MISSING_BODY);
        // Not a zero either: this page knows of a quote it could not read.
        expect(
            root.querySelector('[data-role="shop-tab-quotes"]')?.textContent,
        ).not.toContain('0');
    });

    it('still counts it on the rail the count is about', async () => {
        publishNameAndQuote(UNREAD_TOKEN, ['3e'.repeat(32), '3f'.repeat(32)]);

        const root = document.createElement('div');
        boot(root);
        await flush();

        (
            root.querySelector('[data-role="shop-tab-quotes"]') as HTMLButtonElement
        ).click();
        expect(root.querySelector('[data-role="pay-unreadable"]')).not.toBeNull();
        expect(root.textContent, 'and nothing about the book').not.toContain(
            UNREACHABLE_BODY,
        );
    });
});

describe('a-first-load-failure-paints-no-name-it-did-not-read', () => {
    /**
     * A name this session remembered is a shop that may have closed since, and
     * a failure screen cannot tell. So the name on one is a settings record
     * **this load** walked to, never one carried forward from an earlier visit
     * — which is what the session cache would otherwise supply.
     */
    it('drops the session name when this load could read nothing', async () => {
        publish(signedTx({ txid: '4a'.repeat(32), outputs: [stl1Output('Riverside Goods')], height: 5 }));
        const root = document.createElement('div');
        boot(root);
        await flush();
        expect(root.textContent, 'the good load reads it').toContain('Riverside Goods');

        chain.book = PLUGIN_MISSING;
        chain.historyThrows = true;
        window.dispatchEvent(new PopStateEvent('popstate'));
        await flush();

        // The failure this stages is `plugin-missing`, which says so itself
        // now. What is pinned here is the name, not the sentence.
        expect(root.textContent).toContain(PLUGIN_MISSING_BODY);
        expect(root.textContent, 'nothing this load read says this').not.toContain(
            'Riverside Goods',
        );
        // Two whole loads through the real loader, each painting the stall
        // twice: measured at ~2.9s alone here and over five under the parallel
        // suite, which is the runner's default budget rather than a hang.
    }, 20_000);
});

describe('a-live-listing-does-not-move-a-reader-off-the-quotes-tab', () => {
    /**
     * Which rail is on screen is `boot`'s own closure state, so a repaint
     * nobody asked for cannot take it: a listing arriving over the socket is
     * news about the other side, and a reader mid-sentence on the quotes stays
     * where they are. The opening side is decided once, on the first definite
     * fetch, and never again for this stall.
     */
    const QUOTED_META = {
        tokenId: TOKEN,
        name: 'Ripe Beans',
        ticker: 'RB',
        decimals: 0,
        tokenType: { protocol: 'SLP', type: 'SLP_TOKEN_TYPE_FUNGIBLE' },
    };

    it('keeps the reader on the quotes across a book that moved', async () => {
        const { root } = bootStall(
            stallEmpty({
                fetch: { kind: 'offers', offers: [OFFER] },
                tokens: new Map([[TOKEN, QUOTED_META]]),
                prices: new Map([[TOKEN, { code: 'usd', exponent: 2, amount: 500n }]]),
            }),
        );
        await flush();
        const pressed = (): string | undefined =>
            root
                .querySelector('[data-role="shop-tabs"] [aria-pressed="true"]')
                ?.getAttribute('data-role') ?? undefined;
        expect(pressed(), 'a shop with listings opens on them').toBe('shop-tab-listings');

        (
            root.querySelector('[data-role="shop-tab-quotes"]') as HTMLButtonElement
        ).click();
        expect(pressed()).toBe('shop-tab-quotes');

        const listings = (): string =>
            root.querySelector('[data-role="shop-tab-listings"]')?.textContent ?? '';
        expect(listings(), 'one token listed').toContain('1');

        // A second token joins the book. The label counts it — the numbers are
        // read at paint time, so a live re-read moves them — and nothing else
        // about the reader's screen changes.
        chain.book = {
            kind: 'offers',
            offers: [
                OFFER,
                {
                    ...OFFER,
                    tokenId: 'bc'.repeat(32),
                    outpoint: { txid: 'ee'.repeat(32), outIdx: 0 },
                },
            ],
        };
        watches[0]!.hooks.onChanged?.('message');
        await flush();

        expect(viewOf(root)?.fetch?.kind, 'the book was applied').toBe('offers');
        expect(listings(), 'and the label counted it').toContain('2');
        expect(pressed(), 'and the reader did not move').toBe('shop-tab-quotes');
        expect(root.querySelector('[data-role="pay-row"]')).not.toBeNull();
    });
});

describe('a-pay-hint-rate-lands-only-on-the-sheet-that-asked', () => {
    /**
     * A `?pay=` link opens one item's sheet and asks for a rate. The guard
     * that stops that answer repainting a *different* sheet was checked before
     * the fetch and dropped after it — so a buyer who closed item A, opened
     * item B and typed a quantity had A's late rate rebuild B's sheet under
     * them, quantity gone. `onOpenPay` keeps the full guard across its await;
     * this road has to as well.
     */
    const TOKEN_B = 'bb'.repeat(32);
    const FROZEN = 20_000_000n;
    const META_A: TokenMeta = {
        tokenId: TOKEN,
        name: 'Roasted Beans',
        ticker: 'BEAN',
        decimals: 0,
        tokenType: { protocol: 'SLP', type: 'SLP_TOKEN_TYPE_FUNGIBLE' },
    };

    it('keeps a quantity typed into the other item’s sheet', async () => {
        // Every ask — the glance rate the listings paint and the rate A's
        // sheet froze — hangs until B is open; B's own ask is then answered
        // at once, and A's is answered last, over B's typed quantity.
        let answerA: (rate: bigint) => void = () => {};
        const rateA = new Promise<bigint>((resolve) => {
            answerA = resolve;
        });
        priceControl.fetch = () => rateA;
        const { root } = bootStall(
            stallEmpty({
                tokens: new Map([
                    [TOKEN, META_A],
                    [TOKEN_B, { ...META_A, tokenId: TOKEN_B, name: 'Second' }],
                ]),
                prices: new Map([
                    [TOKEN, { code: 'usd', exponent: 2, amount: 500n }],
                    [TOKEN_B, { code: 'usd', exponent: 2, amount: 700n }],
                ]),
                payHint: TOKEN.slice(0, 12),
            }),
        );
        await flush();
        expect(root.querySelector('[data-role="pay"]'), 'the link opened A').not.toBeNull();

        (root.querySelector('[data-role="pay-close"]') as HTMLButtonElement).click();
        priceControl.fetch = async () => FROZEN;
        const opens = root.querySelectorAll('[data-role="pay-open"]');
        expect(opens).toHaveLength(2);
        (opens[1] as HTMLButtonElement).click();
        await flush();
        const qty = root.querySelector('[data-role="pay-quantity"]') as HTMLInputElement;
        expect(qty, 'B is on screen with its figure').not.toBeNull();
        qty.value = '3';
        qty.dispatchEvent(new Event('input', { bubbles: true }));
        await flush();

        answerA(FROZEN);
        await flush();
        const after = root.querySelector('[data-role="pay-quantity"]') as HTMLInputElement;
        expect(after.value, 'A’s late answer rebuilt B’s sheet').toBe('3');
    });
});

describe('a-quantity-typed-before-the-rate-lands-survives-it', () => {
    /**
     * `onOpenPay` fetches the rate and paints when it lands; a paint rebuilds
     * the sheet. The quantity is the buyer's — typed into the sheet in the
     * window before the rate answered — and a rebuild that reset it to one
     * would sign the wrong figure. It rides the view now, like the rate.
     */
    const META: TokenMeta = {
        tokenId: TOKEN,
        name: 'Roasted Beans',
        ticker: 'BEAN',
        decimals: 0,
        tokenType: { protocol: 'SLP', type: 'SLP_TOKEN_TYPE_FUNGIBLE' },
    };

    it('keeps 3 when the rate lands after it was typed', async () => {
        let answer: (rate: bigint) => void = () => {};
        const pending = new Promise<bigint>((resolve) => {
            answer = resolve;
        });
        priceControl.fetch = () => pending;
        const { root } = bootStall(
            stallEmpty({
                tokens: new Map([[TOKEN, META]]),
                prices: new Map([[TOKEN, { code: 'usd', exponent: 2, amount: 500n }]]),
            }),
        );
        await flush();
        (root.querySelector('[data-role="pay-open"]') as HTMLButtonElement).click();
        await flush();
        expect(root.querySelector('[data-role="pay"]')).not.toBeNull();
        (
            root.querySelector('[data-role="pay-quantity-edit"]') as HTMLElement
        ).dispatchEvent(new MouseEvent('click', { bubbles: true }));
        const field = root.querySelector('[data-role="pay-quantity"]') as HTMLInputElement;
        field.value = '3';
        field.dispatchEvent(new Event('input', { bubbles: true }));

        answer(20_000_000n);
        await flush();
        const after = root.querySelector('[data-role="pay-quantity"]') as HTMLInputElement;
        expect(after.value, 'the rate landing rebuilt the sheet at one').toBe('3');
        expect(
            root.querySelector('[data-role="pay"] [data-role="price"]')?.textContent,
            'the figure is three items at the rate that landed',
        ).toBe('750,000');
    });
});

/** The loader's own list of undecided quoted tokens, on the state it answers with. */
function withGenesisPending(state: State, tokenIds: string[]): State {
    return { ...state, genesisPending: { pubkeyHex: PK, hash: HASH, tokenIds } };
}

describe('a-claim-against-the-stall-does-not-block-the-genesis-read', () => {
    /**
     * An ALP `authPubkey` is the minter's own claim. A well-formed one that
     * was not the stall's key used to decide `not-attributed` at once, and the
     * genesis transaction — which proves who signed — was never read. A claim
     * against the stall is exactly the case that read exists for.
     */
    const CLAIMED_BY_ANOTHER: TokenMeta = {
        tokenId: TOKEN,
        name: 'Roasted Beans',
        ticker: 'BEAN',
        decimals: 0,
        tokenType: { protocol: 'ALP', type: 'ALP_TOKEN_TYPE_STANDARD' },
        authPubkey: `02${'ee'.repeat(32)}`,
    };

    it('reads the genesis, and the stall’s own signature outranks the claim', async () => {
        publish({
            txid: TOKEN,
            inputs: [{ inputScript: p2pkhScriptSig(PK_BYTES), outputScript: STALL_SCRIPT }],
            outputs: [{ outputScript: STALL_SCRIPT, token: { tokenId: TOKEN } }],
        });
        const { root } = bootStall(
            withGenesisPending(
                stallEmpty({
                tokens: new Map([[TOKEN, CLAIMED_BY_ANOTHER]]),
                prices: new Map([[TOKEN, { code: 'usd', exponent: 2, amount: 500n }]]),
                }),
                [TOKEN],
            ),
        );
        await flush();
        expect(chain.calls.tx, 'the genesis was read').toBeGreaterThan(0);
        const row = root.querySelector('[data-role="pay-row"]') as HTMLElement;
        expect(row.querySelector('[data-role="quote-minted"]')).not.toBeNull();
        expect(row.querySelector('[data-role="quote-not-minted"]')).toBeNull();
    });
});

describe('the-first-paint-does-not-wait-for-the-genesis-read', () => {
    /**
     * Up to `MAX_GENESIS_LOOKUPS` transaction reads, each behind a fresh
     * failover client, sat in front of the first paint — which the Listings
     * rail never needed. A read that never answers must not hold the stall.
     */
    // Its own token: the session cache in `app.ts` outlives a test, and an
    // id another test decided would never be read again.
    const HUNG = 'b7'.repeat(32);
    const META: TokenMeta = {
        tokenId: HUNG,
        name: 'Roasted Beans',
        ticker: 'BEAN',
        decimals: 0,
        tokenType: { protocol: 'SLP', type: 'SLP_TOKEN_TYPE_FUNGIBLE' },
    };

    it('paints the quote as undecided while the read hangs', async () => {
        const hang = vi.spyOn(fakeChronik, 'tx').mockImplementation(() => new Promise(() => {}));
        try {
            const { root } = bootStall(
                withGenesisPending(
                    stallEmpty({
                    tokens: new Map([[HUNG, META]]),
                    prices: new Map([[HUNG, { code: 'usd', exponent: 2, amount: 500n }]]),
                    }),
                    [HUNG],
                ),
            );
            await flush();
            expect(hang, 'the read was asked for').toHaveBeenCalled();
            const row = root.querySelector('[data-role="pay-row"]');
            expect(row, 'the stall painted').not.toBeNull();
            expect(row!.querySelector('[data-role="quote-minted"]')).toBeNull();
            expect(row!.querySelector('[data-role="quote-not-minted"]')).toBeNull();
        } finally {
            hang.mockRestore();
        }
    });
});

describe('a-pay-sheet-opened-cold-learns-its-attribution-in-place', () => {
    /**
     * A scanned link opens the pay sheet on the first paint, and a live paint
     * waits while a sheet is open — so the genesis read that lands afterwards
     * would never reach the one surface money is composed on. The sheet asks
     * for its own answer and paints the line in place.
     */
    const COLD = 'c0'.repeat(32);
    const META: TokenMeta = {
        tokenId: COLD,
        name: 'Roasted Beans',
        ticker: 'BEAN',
        decimals: 0,
        tokenType: { protocol: 'SLP', type: 'SLP_TOKEN_TYPE_FUNGIBLE' },
    };
    const STRANGER_PK = Uint8Array.from([0x02, ...new Array<number>(32).fill(0xee)]);

    it('carries “minted by another wallet” on a sheet that opened before the read', async () => {
        publish({
            txid: COLD,
            inputs: [{ inputScript: p2pkhScriptSig(STRANGER_PK), outputScript: STRANGER_SCRIPT }],
            outputs: [{ outputScript: STRANGER_SCRIPT, token: { tokenId: COLD } }],
        });
        const { root } = bootStall(
            withGenesisPending(
                stallEmpty({
                tokens: new Map([[COLD, META]]),
                prices: new Map([[COLD, { code: 'usd', exponent: 2, amount: 500n }]]),
                payHint: COLD.slice(0, 12),
                }),
                [COLD],
            ),
        );
        // On the page (`bootStall`): the sheet paints its answer in place
        // only while it is connected (`wrap.isConnected`).
        try {
            await flush();
            const sheet = root.querySelector('[data-role="pay"]');
            expect(sheet, 'the link opened the sheet').not.toBeNull();
            const line = sheet!.querySelector('[data-role="quote-not-minted"]') as HTMLElement | null;
            expect(line?.textContent).toBe(QUOTE_NOT_MINTED_HERE);
            // The line exists from the start, hidden: what the sheet learned
            // is that it shows (this read `textContent` alone, which a hidden
            // line carries too).
            await until(() => line?.hidden === false);
            expect(line?.hidden, 'the sheet learned its attribution in place').toBe(false);
        } finally {
            root.remove();
        }
    });
});

const FIRMA_ID = '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0';
const FIRMA_META: TokenMeta = {
    tokenId: FIRMA_ID,
    name: 'Firma',
    ticker: 'FIRMA',
    decimals: 4,
    tokenType: { protocol: 'ALP', type: 'ALP_TOKEN_TYPE_STANDARD' },
};

describe('a-live-withheld-listing-never-reaches-the-shop', () => {
    /**
     * The socket brings a withheld offer in through the same re-read as any
     * other. No row, and no "the offer book moved" for a screen reader over
     * a screen on which nothing moved.
     */
    it('paints no row and announces nothing', async () => {
        document.getElementById('sr-live')?.remove();
        const { root } = bootStall(stallEmpty({ tokens: new Map([[FIRMA_ID, FIRMA_META]]) }));
        await flush();
        chain.book = {
            kind: 'offers',
            offers: [{ ...OFFER, tokenId: FIRMA_ID, outpoint: { txid: 'fa'.repeat(32), outIdx: 0 } }],
        };
        watches[0]!.hooks.onChanged?.('message');
        await flush();
        expect(root.querySelectorAll('.item')).toHaveLength(0);
        expect(root.textContent).toContain(WITHHELD_ALL_LISTINGS);
        expect(document.getElementById('sr-live')?.textContent ?? '').not.toBe(EVENT_BOOK);
    });
});

describe('a-withheld-quote-spends-no-genesis-lookup', () => {
    /**
     * Twenty-four reads per load, shared with the real quotes. A withheld
     * token is not painted, so its attribution is never asked for.
     */
    it('reads no genesis for a withheld token', async () => {
        publish({
            txid: FIRMA_ID,
            inputs: [{ inputScript: p2pkhScriptSig(PK_BYTES), outputScript: STALL_SCRIPT }],
            outputs: [{ outputScript: STALL_SCRIPT, token: { tokenId: FIRMA_ID } }],
        });
        bootStall(
            withGenesisPending(
                stallEmpty({
                    tokens: new Map([[FIRMA_ID, FIRMA_META]]),
                    prices: new Map([[FIRMA_ID, { code: 'usd', exponent: 2, amount: 500n }]]),
                }),
                [FIRMA_ID],
            ),
        );
        await flush();
        expect(chain.calls.tx).toBe(0);
    });
});

describe('a-token-whose-baton-the-wallet-holds-reaches-the-studio', () => {
    /**
     * A freshly minted token has no listing, no record and no quote, so the
     * describe set never held it and the seller had to paste its id. The
     * one utxo read a stall open already makes for the decorations answers
     * a second question: which tokens this wallet holds a mint baton for —
     * the seller's own product, on the items card by name.
     */
    it('lists the baton-held token on the items card, from the one holdings read of the load', async () => {
        const MINTED = '5e'.repeat(32);
        window.history.replaceState(null, '', stallPath(PK));
        chain.utxos = [
            { token: { tokenId: MINTED, isMintBaton: true } },
            { token: { tokenId: MINTED } },
        ];
        chain.genesis.set(MINTED, genesisOf('Fresh Mint'));
        const root = document.createElement('div');
        boot(root);
        await flush();
        await flush();
        expect(chain.calls.utxos, 'one holdings read per open').toBe(1);
        (root.querySelector('[data-role="tab-studio"]') as HTMLButtonElement).click();
        await flush();
        const row = root.querySelector(`[data-role="studio-item"][data-token-id="${MINTED}"]`);
        expect(row, 'the minted token has a row').not.toBeNull();
        expect(row?.textContent).toContain('Fresh Mint');
        expect(row?.querySelector('[data-role="studio-item-describe"]')).not.toBeNull();
    });
});

describe('a-described-token-is-named-by-its-genesis-like-a-quoted-one', () => {
    /**
     * The second `loadTokenMeta` asked about the priced records alone, on the
     * reasoning that only a quote puts a row on the shop. True, and it forgot
     * the two surfaces a description reaches with no figure on it at all: the
     * Studio's items card and the describe picker, both of which take
     * `describableTokenIds` — which has read the descriptions since it was
     * written. So a token the seller had only written words about was named
     * by its 64-character id in the one place they go to edit it.
     *
     * Measured on a live stall (2026-09-23): one `STLD` record carrying words
     * and no price, nothing listed on Agora, no baton held.
     */
    it('reads the genesis of a token the records name without quoting', async () => {
        const DESCRIBED = '6f'.repeat(32);
        window.history.replaceState(null, '', stallPath(PK));
        publish(signedTx({ txid: '6a'.repeat(32), outputs: [stl1Output('Riverside Goods')], height: 5 }));
        publish(
            signedTx({
                txid: '6b'.repeat(32),
                outputs: [stldOutput(DESCRIBED, 'One wrap, ten XEC')],
                height: 6,
            }),
        );
        chain.genesis.set(DESCRIBED, genesisOf('Beeswax Wrap'));

        const root = document.createElement('div');
        boot(root);
        await flush();
        await flush();

        expect(viewOf(root)?.prices?.size, 'words only: nothing is quoted').toBe(0);
        expect(viewOf(root)?.tokens.get(DESCRIBED)?.name).toBe('Beeswax Wrap');

        (root.querySelector('[data-role="tab-studio"]') as HTMLButtonElement).click();
        await flush();
        const row = root.querySelector(`[data-role="studio-item"][data-token-id="${DESCRIBED}"]`);
        expect(row, 'the described token has a row').not.toBeNull();
        expect(row?.textContent).toContain('Beeswax Wrap');
        expect(row?.textContent, 'never the id where a name goes').not.toContain(DESCRIBED);
    });
});

describe('an-implausible-feed-answer-is-refused-and-said', () => {
    /**
     * The window is the domain's (`isPlausibleRate`) and `readPayRate` applies
     * it to the figure a wallet signs: a refused answer leaves no `payRate`
     * on the view, names its reason in `payRateWhy`, and the sheet says so
     * in its own sentence — never "CoinGecko did not answer", which is a
     * different fact. The glance is not judged (CLAUDE §8).
     */
    const META = {
        tokenId: TOKEN,
        name: 'Ripe Beans',
        ticker: 'RB',
        decimals: 0,
        tokenType: { protocol: 'SLP', type: 'SLP_TOKEN_TYPE_FUNGIBLE' },
    };

    it('leaves no pay rate on the view, names the reason, and paints the refusal', async () => {
        // Five dollars per XEC: the kind of factor a mixed-up unit produces.
        priceControl.fetch = async () => scaleRate(5)!;
        const { root } = bootStall(
            stallEmpty({
                tokens: new Map([[TOKEN, META]]),
                prices: new Map([[TOKEN, { code: 'usd', exponent: 2, amount: 500n }]]),
            }),
        );
        await flush();
        (root.querySelector('[data-role="pay-open"]') as HTMLButtonElement).click();
        await flush();
        expect(viewOf(root)?.payRate).toBeUndefined();
        expect(viewOf(root)?.payRateWhy).toBe('implausible');
        const sheet = root.querySelector('[data-role="pay"]') as HTMLElement;
        expect(sheet.textContent).toContain(PAY_RATE_IMPLAUSIBLE_WHY);
        expect(sheet.textContent).not.toContain(PAY_NO_RATE_WHY);
        expect(sheet.querySelector('[data-role="price"]')?.textContent).toBe('');
    });

    it('a plausible answer still lands as the frozen rate', async () => {
        priceControl.fetch = async () => scaleRate(0.00003)!;
        const { root } = bootStall(
            stallEmpty({
                tokens: new Map([[TOKEN, META]]),
                prices: new Map([[TOKEN, { code: 'usd', exponent: 2, amount: 500n }]]),
            }),
        );
        await flush();
        (root.querySelector('[data-role="pay-open"]') as HTMLButtonElement).click();
        await flush();
        expect(viewOf(root)?.payRate?.rate).toBe(scaleRate(0.00003)!);
        expect(viewOf(root)?.payRateWhy).toBeUndefined();
    });
});

describe('the-pay-sheet-asks-one-feed-while-the-check-is-paused', () => {
    /**
     * `SECOND_FEED` is paused (owner, 2026-09-23): wherever `readPayRate`
     * runs, the first feed is asked and the check is not — so `check` is
     * `'none'`, the valve's disagreement line cannot fire, and the figure is
     * the first feed's exactly as it always was. The mock is still wired and
     * still answers, and it is counted, because a check that is asked and
     * then ignored would pass every assertion about the figure while telling
     * a second party a payment is being composed.
     */
    const META = {
        tokenId: TOKEN,
        name: 'Ripe Beans',
        ticker: 'RB',
        decimals: 0,
        tokenType: { protocol: 'SLP', type: 'SLP_TOKEN_TYPE_FUNGIBLE' },
    };
    const quoted = () =>
        stallEmpty({
            tokens: new Map([[TOKEN, META]]),
            prices: new Map([[TOKEN, { code: 'usd', exponent: 2, amount: 500n }]]),
        });

    it('pins the switch it describes', () => {
        expect(SECOND_FEED).toBe('paused');
    });

    it('never asks the check, and names the one feed that priced the figure', async () => {
        const fetch = vi.fn(async (_code: string, _opts?: { timeoutMs?: number }) => scaleRate(0.00003)!);
        const check = vi.fn(async (_code: string, _opts?: { timeoutMs?: number }) => scaleRate(0.0000301)!);
        priceControl.fetch = fetch;
        priceControl.check = check;
        const { root } = bootStall(quoted());
        await flush();
        const before = fetch.mock.calls.length;
        (root.querySelector('[data-role="pay-open"]') as HTMLButtonElement).click();
        await flush();
        // The answer lands on its own chain; a fixed tick count reached it on
        // an idle box and missed it on a busy one (this file's `until`).
        await until(() => viewOf(root)?.payRate !== undefined);
        expect(fetch.mock.calls.length, 'the first feed was asked for the sheet').toBeGreaterThan(before);
        expect(check, 'the paused check is never asked').not.toHaveBeenCalled();
        expect(viewOf(root)?.payRate?.check).toBe('none');
        const rate = root.querySelector('[data-role="pay"] [data-role="rate"]')?.textContent ?? '';
        expect(rate).toContain(RATE_SOURCE_PRIMARY);
        expect(rate).not.toContain(RATE_SOURCE_CHECK);
        expect(root.querySelector('[data-role="pay-valve"]')?.textContent).toBe('');
    });

    it('prices with the first feed, as it always did', async () => {
        priceControl.fetch = async () => scaleRate(0.00003)!;
        priceControl.check = async () => scaleRate(0.0000301)!;
        const { root } = bootStall(quoted());
        await flush();
        (root.querySelector('[data-role="pay-open"]') as HTMLButtonElement).click();
        await flush();
        await until(() => viewOf(root)?.payRate !== undefined);
        expect(viewOf(root)?.payRate?.rate).toBe(scaleRate(0.00003)!);
        expect(root.querySelector('[data-role="pay"] [data-role="price"]')?.textContent).toBe(
            '166,666.67',
        );
    });

    it('a check that would disagree is not asked, so the valve says nothing and the figure stands', async () => {
        priceControl.fetch = async () => scaleRate(0.00003)!;
        const check = vi.fn(async () => scaleRate(0.00006)!);
        priceControl.check = check;
        const { root } = bootStall(quoted());
        await flush();
        (root.querySelector('[data-role="pay-open"]') as HTMLButtonElement).click();
        await flush();
        await until(() => viewOf(root)?.payRate !== undefined);
        expect(check).not.toHaveBeenCalled();
        expect(viewOf(root)?.payRate?.rate, 'the figure is the first feed\u2019s').toBe(scaleRate(0.00003)!);
        expect(viewOf(root)?.payRate?.check).toBe('none');
        expect(root.querySelector('[data-role="pay-valve"]')?.textContent).toBe('');
        expect(root.textContent).not.toContain(PAY_RATE_DISAGREE);
        expect(root.querySelector('[data-role="pay"] [data-role="price"]')?.textContent).toBe(
            '166,666.67',
        );
    });

    it('a hung check cannot hold up the figure: it is never asked', async () => {
        vi.useFakeTimers();
        // `finally`, so a red here cannot leave the fake clock running under
        // every later test in this file (measured: a failure here turned
        // three unrelated tests into 20 s timeouts).
        try {
            priceControl.fetch = async () => scaleRate(0.00003)!;
            // Would never answer; while paused nobody waits on it, not even
            // for its own budget.
            priceControl.check = () => new Promise(() => {});
            const { root } = bootStall(quoted());
            for (let i = 0; i < 8; i += 1) {
                await vi.advanceTimersByTimeAsync(0);
            }
            (root.querySelector('[data-role="pay-open"]') as HTMLButtonElement).click();
            for (let i = 0; i < 4; i += 1) {
                await vi.advanceTimersByTimeAsync(0);
            }
            // No clock moved: the figure landed at t=0, where an asked check
            // would have held it for its whole budget.
            expect(
                viewOf(root)?.payRate?.rate,
                `landed without waiting out the check's ${PAY_CHECK_TIMEOUT_MS} ms`,
            ).toBe(scaleRate(0.00003)!);
            expect(viewOf(root)?.payRate?.check).toBe('none');
        } finally {
            vi.useRealTimers();
        }
    });
});

describe('an-xec-quote-asks-no-price-feed', () => {
    /**
     * An XEC quote is the figure itself — no rate is involved anywhere in it
     * (`PAY_XEC_QUOTE_NOTE`) — so opening its sheet must ask neither feed:
     * two requests to two third parties, spent from a monthly budget, to
     * learn a number the sheet never reads, and two parties told a payment
     * is being composed. The USD road is untouched (owner, 2026-09-07).
     */
    const META = {
        tokenId: TOKEN,
        name: 'Ripe Beans',
        ticker: 'RB',
        decimals: 0,
        tokenType: { protocol: 'SLP', type: 'SLP_TOKEN_TYPE_FUNGIBLE' },
    };

    it('opens the sheet with the figure and calls neither feed', async () => {
        const fetch = vi.fn(async () => scaleRate(0.00003)!);
        const check = vi.fn(async () => scaleRate(0.00003)!);
        priceControl.fetch = fetch;
        priceControl.check = check;
        const { root } = bootStall(
            stallEmpty({
                tokens: new Map([[TOKEN, META]]),
                prices: new Map([[TOKEN, { code: 'xec', exponent: 2, amount: 900n }]]),
            }),
        );
        await flush();
        // The boot glance (`refreshFiat`) asks the first feed once, for the
        // listings' ≈ line; opening an XEC sheet must add nothing to that.
        const before = fetch.mock.calls.length;
        (root.querySelector('[data-role="pay-open"]') as HTMLButtonElement).click();
        await flush();
        expect(root.querySelector('[data-role="pay"] [data-role="price"]')?.textContent).toBe('9');
        expect(fetch.mock.calls.length, 'the first feed was not asked for the sheet').toBe(before);
        expect(check, 'nor the second').not.toHaveBeenCalled();
        expect(viewOf(root)?.payRate).toBeUndefined();
        expect(viewOf(root)?.payRateWhy).toBeUndefined();
    });
});

describe('pay-several-at-the-app-level', () => {
    /**
     * The strip's state is boot closure state, so the rules about it live
     * in app.ts: a selection survives a tab switch and a retry (the opening
     * paint has no prices, and a prune over it would empty the selection and blame the
     * seller — the critic's P1, 2026-09-21); a live re-read that takes a
     * chosen quote off the rail prunes it and says so once; the several
     * sheet asks the first feed for a USD selection — never the check while
     * `SECOND_FEED` is paused — and neither for XEC.
     */
    // `fungible` picks tickers the withheld fence does not refuse — "GT" is
    // a top-500 coin's, and a token wearing it is not a row (§4).
    const META = fungible(TOKEN, 'Ripe Beans');
    const META_B = fungible(TOKEN_B, 'Green Tea');
    const withQuotes = (prices: Map<string, { code: string; exponent: number; amount: bigint }>) =>
        stallEmpty({
            tokens: new Map([[TOKEN, META], [TOKEN_B, META_B]]),
            prices,
            shopTab: 'quotes',
        });
    const choose = (root: HTMLElement, tokenId: string, times = 1): void => {
        for (let i = 0; i < times; i += 1) {
            const more = [...root.querySelectorAll<HTMLButtonElement>('[data-role="selection-more"]')].find(
                (b) => b.getAttribute('data-focus-key') === `selection-step:${tokenId}:more`,
            )!;
            more.click();
        }
    };

    it('a retry keeps the selection: the opening paint has no prices and prunes nothing', async () => {
        const state = withQuotes(new Map([[TOKEN, { code: 'usd', exponent: 2, amount: 500n }]]));
        const { root } = bootStall(state);
        await flush();
        (root.querySelector('[data-role="selection-toggle"]') as HTMLButtonElement).click();
        choose(root, TOKEN, 2);
        expect(root.querySelector('[data-role="selection-total"]')?.textContent).toBe('$10.00');
        // The quotes rail's own retry runs a full refresh().
        // A failed walk paints the retry beside the rows; stage it and press it.
        expect(viewOf(root)?.selection?.get(TOKEN)).toBe(2n);
        const before = viewOf(root);
        (root.querySelector('[data-role="shop-tab-listings"]') as HTMLButtonElement).click();
        (root.querySelector('[data-role="shop-tab-quotes"]') as HTMLButtonElement).click();
        expect(viewOf(root)?.selection?.get(TOKEN), 'a tab switch is a paint, not a prune').toBe(2n);
        expect(viewOf(root)?.selectionDropped).toBeUndefined();
        expect(before).not.toBe(viewOf(root));
    });

    it('a live re-read that takes a chosen quote off the rail prunes it and says so', async () => {
        const state = withQuotes(
            new Map([
                [TOKEN, { code: 'usd', exponent: 2, amount: 500n }],
                [TOKEN_B, { code: 'usd', exponent: 2, amount: 300n }],
            ]),
        );
        const { root } = bootStall(state);
        await flush();
        // Both quotes are on the chain, so the live walk finds them again.
        pricedRecord('0b'.repeat(32), TOKEN, { code: 'usd', exponent: 2, amount: 500n });
        pricedRecord('0c'.repeat(32), TOKEN_B, { code: 'usd', exponent: 2, amount: 300n });
        (root.querySelector('[data-role="selection-toggle"]') as HTMLButtonElement).click();
        choose(root, TOKEN, 1);
        choose(root, TOKEN_B, 1);
        expect(viewOf(root)?.selection?.size).toBe(2);
        // The seller republished B's record with no price, in a later block:
        // B leaves the rail, A stays.
        const hex = encodeDescriptionHex(TOKEN_B, 'Words only');
        const txid = publish(signedTx({ txid: '0d'.repeat(32), outputs: [`6a${hex}`], height: 6 }));
        watches[0]!.hooks.onBurst?.([txid]);
        await flush();
        expect(viewOf(root)?.selection?.has(TOKEN_B)).toBe(false);
        expect(viewOf(root)?.selection?.get(TOKEN)).toBe(1n);
        expect(viewOf(root)?.selectionDropped).toEqual([TOKEN_B]);
        expect(root.querySelector('[data-role="selection-dropped"]')?.textContent).toBe(selectionDroppedItems('Green Tea', 1));
        // Said until the selection next changes.
        choose(root, TOKEN, 1);
        expect(viewOf(root)?.selectionDropped).toBeUndefined();
    });

    it('the several sheet asks the first feed for a USD selection, never the paused check, and neither for XEC', async () => {
        const fetch = vi.fn(async () => scaleRate(0.00003)!);
        const check = vi.fn(async () => scaleRate(0.00003)!);
        priceControl.fetch = fetch;
        priceControl.check = check;
        const usd = bootStall(withQuotes(new Map([[TOKEN, { code: 'usd', exponent: 2, amount: 500n }]])));
        await flush();
        (usd.root.querySelector('[data-role="selection-toggle"]') as HTMLButtonElement).click();
        choose(usd.root, TOKEN, 1);
        const before = fetch.mock.calls.length;
        (usd.root.querySelector('[data-role="pay-several-open"]') as HTMLButtonElement).click();
        await flush();
        expect(usd.root.querySelector('[data-role="pay-several"] [data-role="price"]')).not.toBeNull();
        expect(fetch.mock.calls.length).toBeGreaterThan(before);
        expect(check, 'the check is paused').not.toHaveBeenCalled();

        fetch.mockClear();
        check.mockClear();
        const xec = bootStall(withQuotes(new Map([[TOKEN, { code: 'xec', exponent: 2, amount: 900n }]])));
        await flush();
        const boot = fetch.mock.calls.length;
        (xec.root.querySelector('[data-role="selection-toggle"]') as HTMLButtonElement).click();
        choose(xec.root, TOKEN, 3);
        (xec.root.querySelector('[data-role="pay-several-open"]') as HTMLButtonElement).click();
        await flush();
        expect(xec.root.querySelector('[data-role="pay-several"] [data-role="price"]')?.textContent).toBe('27');
        expect(fetch.mock.calls.length, 'the first feed was not asked for the sheet').toBe(boot);
        expect(check, 'nor the second').not.toHaveBeenCalled();
    });
});

describe('an-unanswered-feed-replaces-the-asking-line', () => {
    /**
     * The open paints "asking" before the feeds are asked, and every answer
     * repaints — a feed that did not answer included, because the sheet was
     * saying "asking" and that sentence has to go. The old road skipped the
     * repaint on no answer, which with an asking line would have left the
     * sheet asking forever.
     */
    const META = {
        tokenId: TOKEN,
        name: 'Ripe Beans',
        ticker: 'RB',
        decimals: 0,
        tokenType: { protocol: 'SLP', type: 'SLP_TOKEN_TYPE_FUNGIBLE' },
    };

    it('asks, then says no answer, then a figure on a later answer', async () => {
        let answer: (rate: bigint | undefined) => void = () => {};
        priceControl.fetch = () => new Promise<bigint | undefined>((resolve) => { answer = resolve; });
        const { root } = bootStall(
            stallEmpty({
                tokens: new Map([[TOKEN, META]]),
                prices: new Map([[TOKEN, { code: 'usd', exponent: 2, amount: 500n }]]),
            }),
        );
        await flush();
        // No glance is asked here (since 9816656 it is read only while a
        // listing face's fiat fold is open), so the sheet's own ask is the
        // one pending promise; answer that.
        (root.querySelector('[data-role="pay-open"]') as HTMLButtonElement).click();
        await flush();
        const sheet = () => root.querySelector('[data-role="pay"]') as HTMLElement;
        expect(viewOf(root)?.payRateAsking).toBe(true);
        expect(sheet().textContent).toContain(PAY_RATE_ASKING);
        expect(sheet().textContent).not.toContain(PAY_NO_RATE_WHY);

        answer(undefined);
        await flush();
        expect(viewOf(root)?.payRateAsking).toBe(false);
        expect(sheet().textContent).toContain(PAY_NO_RATE_WHY);
        expect(sheet().textContent).not.toContain(PAY_RATE_ASKING);
    });
});

describe('overlapping-bursts-do-not-overlap-their-walks', () => {
    /**
     * A burst past the ceiling asks everything: two capped walks and a
     * holdings read. A second such burst arriving mid-walk used to start a
     * second set beside the first — a busy stall overflowed the ceiling
     * every block and stacked walks in every open tab (audit 2026-09-08,
     * F2). Now one read runs at a time and what arrives meanwhile is merged
     * and run once after: never more than one walk in flight, nothing
     * dropped — the deferred burst's rows still reach the ring.
     */
    it('runs one read at a time, and the deferred burst still lands', async () => {
        const { root } = bootStall(stallEmpty());
        await flush();
        chain.walksInFlightMax = 0;
        let open: () => void = () => {};
        chain.gate = new Promise<void>((resolve) => { open = resolve; });
        const flood = Array.from({ length: 9 }, (_, i) => `${(0x40 + i).toString(16).padStart(2, '0')}`.repeat(32));
        // Every txid is fetchable, so the overflow — not a fetch failure — is
        // what turns the burst into "ask everything".
        for (const txid of flood) {
            chain.txs.set(txid, { txid, inputs: [], outputs: [{ outputScript: STALL_SCRIPT, sats: 1_000n }] });
        }
        const late = 'ee'.repeat(32);
        chain.txs.set(late, { txid: late, inputs: [], outputs: [{ outputScript: STALL_SCRIPT, sats: 2_000n }] });

        watches[0]!.hooks.onBurst?.([...flood.slice(0, 8), UNKNOWN_TXID]);
        await flush();
        expect(chain.walksInFlight, 'the first walk is held open').toBe(1);
        // A second overflowing burst, and an ordinary one, while the walk is held.
        watches[0]!.hooks.onBurst?.([...flood.slice(0, 8), UNKNOWN_TXID]);
        watches[0]!.hooks.onBurst?.([late]);
        await flush();
        expect(chain.walksInFlightMax, 'nothing started beside the held walk').toBe(1);

        // Release the held walk; the queued read runs after it, on the same
        // road, and its row lands. No fixed wait: the condition is the row.
        chain.gate = undefined;
        open();
        await until(() => viewOf(root)?.events?.some((e) => e.txid === late) === true, 8_000);
        // Read when the row lands, not after the flush below: an app an
        // earlier test booted is never torn down, and on a loaded box its
        // late timers ran into the flush (red under `pnpm test` at c633e60,
        // green alone, while the capture was one file-wide slot).
        const landed = viewOf(root)?.events?.some((e) => e.txid === late) === true;
        await flush();
        expect(chain.walksInFlight, 'every walk finished').toBe(0);
        expect(chain.walksInFlightMax, 'the deferred read ran after, not beside').toBe(1);
        expect(landed, 'the deferred burst’s row reached the ring').toBe(true);
        expect(root.querySelector('[data-role="tab-activity"]')).not.toBeNull();
    });
});

describe('a-tag-opened-from-the-describe-sheet-closes-back-onto-it', () => {
    /**
     * The describe sheet's link replaces the sheet with the poster on that
     * token's tag; closing the poster returns to the sheet on the same
     * token, not to the studio. The Share card's own control keeps closing
     * to idle.
     */
    it('opens the tag on the token and comes back to the sheet', async () => {
        const { root } = bootStall(
            stallEmpty({
                fetch: { kind: 'offers', offers: [OFFER] },
                // A fungible genesis: a quote is painted only on a token
                // `isPriceable` says yes to, and the bare meta has no kind.
                tokens: new Map([
                    [
                        TOKEN,
                        {
                            ...TOKEN_META,
                            tokenType: { protocol: 'ALP', type: 'ALP_TOKEN_TYPE_STANDARD' },
                        },
                    ],
                ]),
                prices: new Map([[TOKEN, { code: 'usd', exponent: 2, amount: 500n }]]),
                descriptions: new Map([[TOKEN, 'Roasted weekly.']]),
            }),
        );
        await flush();
        (root.querySelector('[data-role="tab-studio"]') as HTMLButtonElement).click();
        (root.querySelector('[data-role="studio-open-describe"]') as HTMLButtonElement).click();
        const picker = root.querySelector('[data-role="describe-token"]') as HTMLSelectElement;
        expect(picker, 'the describe sheet is open').not.toBeNull();
        const link = root.querySelector('[data-role="describe-tag"]') as HTMLButtonElement;
        expect(link.hidden, 'the record on screen is the published one').toBe(false);
        link.click();
        const dialog = root.querySelector('[data-role="poster"] [role="dialog"]') as HTMLElement;
        expect(dialog, 'the poster replaced the sheet').not.toBeNull();
        expect(dialog.getAttribute('data-format')).toBe('tag');
        expect(root.querySelector('.poster-tag .tag-name')?.textContent).toBe(TOKEN_META.name);
        expect(root.querySelector('[data-role="describe-text"]')).toBeNull();

        (root.querySelector('[data-role="poster-close"]') as HTMLButtonElement).click();
        expect(root.querySelector('[data-role="poster"]')).toBeNull();
        const back = root.querySelector('[data-role="describe-token"]') as HTMLSelectElement;
        expect(back, 'the sheet is back').not.toBeNull();
        expect(back.value).toBe(TOKEN);

        // The Share card's own poster still closes to nothing.
        (root.querySelector('[data-role="publish-close"]') as HTMLButtonElement).click();
        (root.querySelector('[data-role="open-poster"]') as HTMLButtonElement).click();
        (root.querySelector('[data-role="poster-close"]') as HTMLButtonElement).click();
        expect(root.querySelector('[data-role="describe-token"]')).toBeNull();
        expect(root.querySelector('[data-role="poster"]')).toBeNull();
    });
});

describe('the-glance-fetch-is-bounded', () => {
    /**
     * It was the boot that started this read, before the document had finished
     * loading, and WebKit's progress bar stays alive until every request
     * started then has ended — on a connection that died during a sleep, that
     * is the OS's own TCP timeout, minutes of "loading" over a shop that had
     * painted (owner, Chrome on iOS after a resume, 2026-09-08).
     *
     * The read is a reader's own press now, so that reason retired with the
     * boot fetch — and the bound did not, because it protects something else:
     * one read is in flight at a time, so a request that never ends holds that
     * flag for the life of the tab and the glance is never read again. A slow
     * feed is no rate, and never a line frozen at the number it had.
     */
    it('asks the feed with a deadline', async () => {
        let seen: { timeoutMs?: number } | undefined;
        let asked = 0;
        priceControl.fetch = async (_code, opts) => {
            asked += 1;
            seen = opts;
            return undefined;
        };
        const { root } = bootStall({
            ...stallEmpty({
                fetch: { kind: 'offers', offers: [OFFER] },
                tokens: new Map([[TOKEN, TOKEN_META]]),
            }),
            offers: [OFFER],
        });
        await flush();
        expect(asked, 'a painted shop asks nothing').toBe(0);
        openGlanceFold(root);
        await flush();
        expect(asked, 'the fold that shows the line is what asks').toBe(1);
        expect(seen?.timeoutMs).toBe(FIAT_GLANCE_TIMEOUT_MS);
    });
});

describe('a-burst-queued-behind-another-stalls-walk-runs-against-its-own-stall', () => {
    /**
     * The one-at-a-time queue (`1655475`) kept the generation and dropped the
     * stall: a burst at stall B, queued behind a walk the reader started at
     * stall A, ran with A's script — B's own record read "from another
     * wallet" on the public Activity panel, and on the ask-everything road
     * A's name and quotes were painted over B's address (audit 2026-09-09,
     * N1). The queued batch carries its own stall now. Two stalls, one
     * queue: the existing overlap test uses one stall and cannot go red here.
     */
    const PK_B_BYTES = Uint8Array.from([0x02, ...new Array<number>(32).fill(0xbb)]);
    const PK_B = toHex(PK_B_BYTES);
    const HASH_B = toHex(shaRmd160(PK_B_BYTES));
    const ADDR_B = encodeCashAddress('ecash', 'p2pkh', HASH_B);
    const STALL_B_SCRIPT = p2pkhOutputScript(HASH_B);

    it('classifies the deferred burst against the stall it arrived at', async () => {
        const root = document.createElement('div');
        document.body.append(root);
        const stateA = stallEmpty();
        const stateB: State = {
            ...stallEmpty({
                route: { kind: 'pubkey', pubkeyHex: PK_B, address: ADDR_B },
                address: ADDR_B,
            }),
            pubkeyHex: PK_B,
        };
        // Every instance booted earlier in this file still listens for
        // `popstate`, so the watches and the last paint are shared: this
        // test finds its own watch by the key it watches.
        const before = watches.length;
        boot(root, async () => (location.pathname === stallPath(PK_B) ? stateB : stateA));
        await flush();
        const watchA = watches[before];
        expect(watchA, 'A is watched').toBeDefined();

        // Hold A's ask-everything walk open.
        let open: () => void = () => {};
        chain.gate = new Promise<void>((resolve) => { open = resolve; });
        const flood = Array.from({ length: 9 }, (_, i) => `${(0x50 + i).toString(16).padStart(2, '0')}`.repeat(32));
        for (const txid of flood) {
            chain.txs.set(txid, { txid, inputs: [], outputs: [{ outputScript: STALL_SCRIPT, sats: 1_000n }] });
        }
        watchA!.hooks.onBurst?.([...flood.slice(0, 8), UNKNOWN_TXID]);
        await flush();
        expect(chain.walksInFlight, 'A’s walk is held open').toBe(1);

        // Leave for B while it runs.
        window.history.pushState(null, '', stallPath(PK_B));
        window.dispatchEvent(new PopStateEvent('popstate'));
        await until(() => {
            const route = viewOf(root)?.route;
            return route?.kind === 'pubkey' && route.pubkeyHex === PK_B && watches.some((w) => w.stall.pubkeyHex === PK_B && !w.closed);
        }, 3_000);
        await flush();
        // Every open watch on B, not the first: another app this file booted
        // may open B on the same navigation (the ring test's does, since it
        // opens another stall for real), and a burst sent to its watch alone
        // never reaches this root — as a real chain wakes every tab.
        const watchesB = watches.filter((w) => w.stall.pubkeyHex === PK_B && !w.closed);
        expect(watchesB.length, 'B is watched').toBeGreaterThan(0);

        // B's own description record, signed by B and paying B the dust.
        const txB: ChainTx = {
            txid: 'b1'.repeat(32),
            inputs: [{ inputScript: p2pkhScriptSig(PK_B_BYTES), outputScript: STALL_B_SCRIPT }],
            outputs: [
                { outputScript: stldOutput(TOKEN, 'Grown on the hill') },
                { outputScript: STALL_B_SCRIPT, sats: DUST_SATS },
            ],
        };
        chain.txs.set(txB.txid, txB);
        for (const watch of watchesB) {
            watch.hooks.onBurst?.([txB.txid]);
        }
        await flush();

        // Release A's walk; the queued batch drains after it.
        chain.gate = undefined;
        open();
        await until(() => viewOf(root)?.events?.some((e) => e.txid === txB.txid) === true, 8_000);
        const row = viewOf(root)?.events?.find((e) => e.txid === txB.txid);
        expect(row, 'the deferred burst’s row reached B’s ring').toBeDefined();
        expect(row?.kind).toBe('description');
        expect(row?.recordAuthority, 'B’s own record is B’s, not “from another wallet”').toBe('stalls');
        root.remove();
    });
});

describe('an-older-book-read-does-not-overwrite-a-newer-one', () => {
    /**
     * `onChanged` fires one read per trigger with nothing between them, and
     * two in flight could land out of order: the older book painted over the
     * newer, and a row that had just sold came back until the next message
     * (audit 2026-09-09, N6). Only the newest read applies now.
     */
    it('drops a read that answers after a newer one already painted', async () => {
        const { root } = bootStall(stallEmpty({ fetch: { kind: 'offers', offers: [OFFER] } }));
        await flush();
        const older = { kind: 'offers' as const, offers: [{ ...OFFER, askedSats: 111_000n }] };
        const newer = { kind: 'offers' as const, offers: [{ ...OFFER, askedSats: 222_000n }] };
        let release: () => void = () => {};
        chain.bookGate = new Promise<void>((resolve) => { release = resolve; });
        chain.book = older;
        watches[0]!.hooks.onChanged?.('message');
        chain.bookGate = undefined;
        chain.book = newer;
        watches[0]!.hooks.onChanged?.('message');
        await flush();
        const asked = () => {
            const fetch = viewOf(root)?.fetch;
            return fetch?.kind === 'offers' ? fetch.offers[0]?.askedSats : undefined;
        };
        expect(asked(), 'the newer read painted').toBe(222_000n);
        release();
        await flush();
        await flush();
        expect(asked(), 'the older read landing late does not un-say it').toBe(222_000n);
    });
});

describe('reopening-the-pay-sheet-does-not-let-the-first-ask-say-no-answer', () => {
    /**
     * `readPayRate` wrote the view before any guard, and the open kept no
     * id: a sheet closed and reopened within the feeds' deadline had two
     * asks in flight over one slot. The first ask's timeout printed "did not
     * answer" over the sheet still asking — or wiped the figure and both Pay
     * controls the second ask had already painted (audit 2026-09-09, N4).
     * An answer from a superseded open writes nothing now.
     */
    const quoted = () =>
        stallEmpty({
            tokens: new Map([
                [TOKEN, { ...TOKEN_META, tokenType: { protocol: 'ALP', type: 'ALP_TOKEN_TYPE_STANDARD' } }],
            ]),
            prices: new Map([[TOKEN, { code: 'usd', exponent: 2, amount: 500n }]]),
        });
    const closeSheet = (root: HTMLElement): void => {
        const close =
            root.querySelector<HTMLButtonElement>('[data-role="pay"] [data-role="pay-close"]') ??
            root.querySelector<HTMLButtonElement>('[data-role="pay"] [data-role="publish-close"]');
        expect(close, 'the sheet’s close control').not.toBeNull();
        close!.click();
    };

    it('the first ask’s timeout is written nowhere once the sheet was reopened', async () => {
        const answers: Array<(v: bigint | undefined) => void> = [];
        const { root } = bootStall(quoted());
        await flush();
        // After the boot's own glance fetch: every ask from here is the sheet's.
        priceControl.fetch = () => new Promise<bigint | undefined>((resolve) => { answers.push(resolve); });
        const open = () => (root.querySelector('[data-role="pay-open"]') as HTMLButtonElement).click();
        open();
        await flush();
        expect(answers).toHaveLength(1);
        closeSheet(root);
        await flush();
        expect(root.querySelector('[data-role="pay"]')).toBeNull();
        open();
        await flush();
        expect(answers).toHaveLength(2);

        // The first ask gives up: nothing may change on the sheet still asking.
        answers[0]!(undefined);
        await flush();
        const sheet = root.querySelector('[data-role="pay"]') as HTMLElement;
        expect(sheet, 'the reopened sheet is on screen').not.toBeNull();
        expect(sheet.textContent).toContain(PAY_RATE_ASKING);
        expect(sheet.textContent).not.toContain(PAY_NO_RATE_WHY);
        expect(viewOf(root)?.payRateAsking).toBe(true);

        // Its own ask lands: the figure.
        answers[1]!(10_000_000n);
        await flush();
        const after = root.querySelector('[data-role="pay"]') as HTMLElement;
        expect(after.textContent).not.toContain(PAY_RATE_ASKING);
        expect(after.querySelector('[data-role="price"]')).not.toBeNull();
    });

    it('a figure the reopened sheet painted stands when the superseded ask times out', async () => {
        const answers: Array<(v: bigint | undefined) => void> = [];
        const { root } = bootStall(quoted());
        await flush();
        priceControl.fetch = () => new Promise<bigint | undefined>((resolve) => { answers.push(resolve); });
        const open = () => (root.querySelector('[data-role="pay-open"]') as HTMLButtonElement).click();
        open();
        await flush();
        closeSheet(root);
        await flush();
        open();
        await flush();
        expect(answers).toHaveLength(2);
        answers[1]!(10_000_000n);
        await flush();
        const figure = () => root.querySelector('[data-role="pay"] [data-role="price"]');
        const cashtab = () => root.querySelector<HTMLElement>('[data-role="pay"] [data-role="pay-cashtab"]');
        expect(figure(), 'the reopened sheet painted its figure').not.toBeNull();
        expect(cashtab()?.hidden).toBe(false);

        answers[0]!(undefined);
        await flush();
        expect(figure(), 'the superseded ask did not wipe it').not.toBeNull();
        expect(cashtab()?.hidden).toBe(false);
        expect(root.querySelector('[data-role="pay"]')?.textContent).not.toContain(PAY_NO_RATE_WHY);
        expect(viewOf(root)?.payRate).toBeDefined();
    });
});

describe('a-new-card-under-an-armed-timer-gets-its-own-dwell', () => {
    /**
     * `syncCarousel` returned while a timer was armed, so a live apply that
     * put a different card at the cursor kept the dwell measured on the card
     * that left — and a longer card advanced mid-run (CRITIC-1 on the
     * marquee, 2026-09-09). A replaced card re-arms with its own dwell.
     */
    it('re-arms the carousel when a live apply replaces the card at the cursor', async () => {
        const A = { ...OFFER, tokenId: 'a1'.repeat(32), outpoint: { txid: 'a1'.repeat(32), outIdx: 1 } };
        const B = { ...OFFER, tokenId: 'b2'.repeat(32), outpoint: { txid: 'b2'.repeat(32), outIdx: 1 } };
        const C = { ...OFFER, tokenId: 'c3'.repeat(32), outpoint: { txid: 'c3'.repeat(32), outIdx: 1 } };
        window.history.replaceState(null, '', `${stallPath(PK)}?view=broadcast&preset=corner&mode=fixed`);
        const timeouts: number[] = [];
        const spy = vi.spyOn(globalThis, 'setTimeout');
        try {
            const { root } = bootStall(
                stallEmpty({
                    fetch: { kind: 'offers', offers: [A, B] },
                    broadcast: { preset: 'corner', mode: 'fixed', transparent: false, cards: 'listings', side: 'right' as const, edge: 'bottom' as const },
                }),
            );
            await flush();
            const armed = () =>
                spy.mock.calls.filter((call) => call[1] === 8_000).length;
            const before = armed();
            expect(before, 'the carousel is armed once on open').toBeGreaterThan(0);
            const shown = viewOf(root)?.broadcastCursor ?? 0;
            // A book that drops the shown card: the cursor lands on a different token.
            chain.book = { kind: 'offers', offers: [B, C] };
            watches[0]!.hooks.onChanged?.('message');
            await flush();
            expect(viewOf(root)?.fetch?.kind).toBe('offers');
            expect(viewOf(root)?.broadcastStepped, 'the card at the cursor changed').toBe(true);
            expect(armed(), 'the carousel was re-armed for the new card').toBe(before + 1);
            void timeouts;
            void shown;
        } finally {
            spy.mockRestore();
            window.history.replaceState(null, '', stallPath(PK));
        }
    });
});


describe('a-listing-arriving-does-not-turn-a-touch-wall-off-a-selection', () => {
    /**
     * The critic's third pass (2026-09-24, P1, a regression of round 3): a
     * `show=all` touch wall on a stall with quotes and nothing listed paints
     * the quotes — `windowRail` turns an empty rail off — but the driver's
     * own `windowRailAt` still said "listings", because only the turn and the
     * Cycle step ever wrote it. The first listing to land (the seller's own,
     * or a stranger's gift PARTIAL) flipped the painter back to listings
     * under a customer's hands: the strip, Clear all, Pay and the payment
     * code all went, with nothing on the wall to bring them back. The driver
     * now holds what is painted.
     */
    const QUOTE_TOKEN = 'cd'.repeat(32);
    const QUOTE_META = {
        tokenId: QUOTE_TOKEN,
        name: 'Plum Jam',
        ticker: 'PJ',
        decimals: 0,
        tokenType: { protocol: 'SLP', type: 'SLP_TOKEN_TYPE_FUNGIBLE' },
    };

    it('keeps the quotes, the choice and the payment code when a listing lands', async () => {
        window.history.replaceState(null, '', `${stallPath(PK)}?view=window&show=all&mode=browse&touch=on`);
        const { root } = bootStall(
            stallEmpty({
                fetch: { kind: 'empty' },
                tokens: new Map([[QUOTE_TOKEN, QUOTE_META]]),
                prices: new Map([[QUOTE_TOKEN, { code: 'xec', exponent: 2, amount: 500_000n }]]),
                window: { show: 'all', mode: 'browse', payCode: true, turn: 'none', touch: true },
            }),
        );
        await flush();
        const strip = (): Element | null => root.querySelector('.sw-strip');
        expect(strip()?.querySelector('[data-role="seller-price"]'), 'the quotes are on the wall').not.toBeNull();
        (root.querySelector('[data-role="window-step-more"]') as HTMLButtonElement).click();
        await flush();
        expect(root.querySelector('[data-role="window-selection"]'), 'a choice stands').not.toBeNull();
        // An XEC selection asks no feed: the press composes the code at once.
        (root.querySelector('[data-role="window-pay"]') as HTMLButtonElement).click();
        await flush();
        expect(root.querySelector('[data-role="window-paying"]'), 'the payment code stands').not.toBeNull();

        // A listing lands in the stall's group.
        chain.book = { kind: 'offers', offers: [OFFER] };
        watches[0]!.hooks.onChanged?.('message');
        await flush();

        expect(viewOf(root)?.fetch?.kind, 'the book was applied').toBe('offers');
        expect(strip()?.querySelector('[data-role="seller-price"]'), 'still the quotes').not.toBeNull();
        expect(strip()?.querySelector('[data-role="price"]'), 'and no listing beside them').toBeNull();
        expect(root.querySelector('[data-role="window-selection"]'), 'the choice is still there').not.toBeNull();
        expect(root.querySelector('[data-role="window-clear"]'), 'with its Clear all').not.toBeNull();
        expect(root.querySelector('[data-role="window-paying"]'), 'and the payment code').not.toBeNull();
    });
});

describe('a-listing-arriving-does-not-turn-the-stream-off-its-quote-card', () => {
    /**
     * The same disagreement on the stream (found looking for it, 2026-09-24):
     * under `cards=all` with nothing listed the overlay paints the quotes,
     * while `broadcastRailAt` still said "listings" — so a listing landing
     * mid-dwell swapped the card a viewer was reading for the listing, off
     * the carousel's own rhythm. The rail turns at the wrap, never on a
     * socket tick.
     */
    const QUOTE_TOKEN = 'cd'.repeat(32);

    it('keeps the quote card on screen when a listing lands', async () => {
        window.history.replaceState(null, '', `${stallPath(PK)}?view=broadcast&preset=corner&mode=fixed&cards=all`);
        const { root } = bootStall(
            stallEmpty({
                fetch: { kind: 'empty' },
                tokens: new Map([
                    [
                        QUOTE_TOKEN,
                        {
                            tokenId: QUOTE_TOKEN,
                            name: 'Plum Jam',
                            ticker: 'PJ',
                            decimals: 0,
                            tokenType: { protocol: 'SLP', type: 'SLP_TOKEN_TYPE_FUNGIBLE' },
                        },
                    ],
                ]),
                prices: new Map([[QUOTE_TOKEN, { code: 'xec', exponent: 2, amount: 500_000n }]]),
                broadcast: { preset: 'corner', mode: 'fixed', transparent: false, cards: 'all', side: 'right', edge: 'bottom' },
            }),
        );
        await flush();
        const card = (): string =>
            root.querySelector('[data-role="price"]') !== null
                ? 'listing'
                : root.querySelector('[data-role="seller-price"]') !== null
                  ? 'quote'
                  : 'none';
        expect(card(), 'the quote is the card').toBe('quote');

        chain.book = { kind: 'offers', offers: [OFFER] };
        watches[0]!.hooks.onChanged?.('message');
        await flush();

        expect(viewOf(root)?.fetch?.kind, 'the book was applied').toBe('offers');
        expect(card(), 'and the card a viewer is reading stays').toBe('quote');
    });
});

describe('a-finished-walk-that-read-the-last-removal-takes-the-quote-off', () => {
    /**
     * The critic, 2026-09-25, item 1. `applyDescriptions` refused a finished
     * walk's answer whose three maps were empty, over records on screen,
     * because it cannot be told from a walk that found nothing. But a walk
     * that read the bare tombstone of the stall's LAST quote names the token
     * in `decided`: the seller took the quote off, and refusing it kept the
     * item on the rail, where Pay and Pay several composed it. Only an answer
     * that resolved nothing is held back.
     */
    const A = 'a5'.repeat(32);
    const QUOTE = { code: 'xec', exponent: 2, amount: 500_000n };
    const shop = (): State =>
        stallEmpty({
            tokens: new Map([[A, fungible(A, 'Plum Jam')]]),
            prices: new Map([[A, QUOTE]]),
            shopTab: 'quotes',
        });
    const wake = async (txids: string[]): Promise<void> => {
        for (const watch of watches.filter((w) => !w.closed)) {
            watch.hooks.onBurst?.(txids);
        }
        await flush();
    };

    it('takes the only quote off the rail', async () => {
        const { root } = bootStall(shop());
        await flush();
        expect(root.querySelector('[data-role="pay-open"]'), 'the quote is on the rail').not.toBeNull();
        const removal = publish(signedTx({ txid: '5d'.repeat(32), outputs: [`6a${encodeRemovalHex(A)}`], height: 7 }));
        await wake([removal]);
        await until(() => root.querySelector('[data-role="pay-open"]') === null);
        expect(root.querySelector('[data-role="pay-open"]'), 'the seller took it off').toBeNull();
        expect(root.textContent, 'nor its name on the rail').not.toContain('Plum Jam');
    });

    it('still holds the records on screen over a finished walk that resolved nothing', async () => {
        const { root } = bootStall(shop());
        await flush();
        // An unclassifiable burst asks everything, and the chain carries no
        // record of the seller's at all: the walk finishes and resolves nothing.
        const walked = chain.calls.stld;
        await wake([UNKNOWN_TXID]);
        await until(() => chain.calls.stld > walked);
        await flush(20);
        expect(chain.calls.stld, 'the records were walked').toBeGreaterThan(walked);
        expect(root.querySelector('[data-role="pay-open"]'), 'our silence is not a removal').not.toBeNull();
    });
});

describe('a-pay-press-over-a-record-that-moved-sends-nothing-and-asks-again', () => {
    /**
     * The critic's final merge, item 11. A pay sheet holds the live paint, so
     * a re-read that moves the seller's record while it is open lands in the
     * app's state and not on screen. The press used to open the wallet on the
     * sheet's own closure — the figure on screen, and one the page no longer
     * held as the seller's quote — and say nothing. Now the press asks the
     * records first: if the one it composed from moved, it sends nothing,
     * the sheet is painted again from the record as it stands with one line
     * saying so, and the next press is the one that opens.
     */
    const A = 'a4'.repeat(32);
    const B = 'b4'.repeat(32);
    /**
     * Held still for every test here: every Pay press inside the grace of a
     * change on screen is absorbed (`PAY_RECOMPOSE_GRACE_MS`), so the press
     * that opens is made after `later` moves the clock past it.
     */
    let later: (ms: number) => void = () => undefined;
    beforeEach(() => {
        later = holdClock();
    });
    const XEC_OLD = { code: 'xec', exponent: 2, amount: 500_000n };
    const XEC_NEW = { code: 'xec', exponent: 2, amount: 900_000n };
    const XEC_B = { code: 'xec', exponent: 2, amount: 700_000n };
    const phone = (prices: Map<string, { code: string; exponent: number; amount: bigint }>): State =>
        stallEmpty({
            tokens: new Map([
                [A, fungible(A, 'Plum Jam')],
                [B, fungible(B, 'Rye Flour')],
            ]),
            prices,
            shopTab: 'quotes',
        });
    /**
     * The seller's own record, published and woken by the socket — on every
     * open watch, as a real chain wakes every tab on the stall. An app an
     * earlier test booted is never torn down, and a late refresh of one can
     * open a watch before this test's app does, so `watches[0]` is not
     * certainly this app's. Seen: a Pay several case red under `pnpm test`
     * with its code never taken away, green alone; that this was the cause
     * is inferred, not observed.
     */
    const republish = async (txids: readonly [string, string | undefined][]): Promise<void> => {
        const ids = txids.map(([txid, hex]) => {
            if (hex === undefined) {
                throw new Error('fixture is not encodable');
            }
            return publish(signedTx({ txid, outputs: [`6a${hex}`], height: 7 }));
        });
        for (const watch of watches.filter((w) => !w.closed)) {
            watch.hooks.onBurst?.(ids);
        }
        await flush();
    };
    /** One press on the open sheet's Cashtab control: the URL a wallet was handed, or undefined. */
    const press = (root: HTMLElement, scope: string): string | undefined => {
        const open = vi.spyOn(window, 'open').mockImplementation(() => null);
        try {
            const control = root.querySelector(`[data-role="${scope}"] [data-role="pay-cashtab"]`) as HTMLElement | null;
            expect(control, `${scope} carries a Pay control`).not.toBeNull();
            control!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            const call = open.mock.calls[0];
            return call === undefined ? undefined : String(call[0]);
        } finally {
            open.mockRestore();
        }
    };
    const figureOf = (root: HTMLElement, scope: string): string | undefined =>
        root.querySelector(`[data-role="${scope}"] [data-role="price"]`)?.textContent ?? undefined;

    it('a new figure: the sheet shows the new one in place and says so, the press after it sends nothing, and the next press pays it', async () => {
        const { root } = bootStall(phone(new Map([[A, XEC_OLD]])));
        await flush();
        (root.querySelector('[data-role="pay-open"]') as HTMLButtonElement).click();
        await flush();
        expect(figureOf(root, 'pay')).toBe('5,000');

        await republish([['7c'.repeat(32), encodeDescriptionHex(A, 'Plum Jam', { price: XEC_NEW })]]);
        // The sheet holds the live paint and answers the re-read in place
        // (the owner, 2026-09-25): the new figure, said — the first clause
        // alone, since nobody pressed (CRITIC-CARRYOVER-3 item 2).
        expect(figureOf(root, 'pay'), 'recomposed in place').toBe('9,000');
        expect(root.querySelector('[data-role="pay"] [data-role="pay-valve"]')?.textContent).toBe(PAY_QUOTE_CHANGED_UNPRESSED);

        expect(press(root, 'pay'), 'the press after the move is absorbed').toBeUndefined();
        expect(figureOf(root, 'pay')).toBe('9,000');
        expect(root.querySelector('[data-role="pay"] [data-role="pay-valve"]')?.textContent).toBe(PAY_QUOTE_CHANGED);
        expect(
            root.querySelector('[data-role="pay"] [data-role="pay-cashtab"]')?.textContent,
            'the control restates the figure it will open',
        ).toBe(payFigure('9,000'));

        expect(press(root, 'pay'), 'a second press inside the grace is absorbed too').toBeUndefined();
        later(PAY_RECOMPOSE_GRACE_MS + 1);
        const url = press(root, 'pay');
        expect(url, 'a press after the grace pays the record as it stands').toContain('amount=9000.00');
    });

    it('a removal: the sheet says the quote is gone and offers nothing to press', async () => {
        // B stays quoted here; the stall's only quote removed is the next
        // case.
        const { root } = bootStall(phone(new Map([[A, XEC_OLD], [B, XEC_B]])));
        await flush();
        (root.querySelector('[data-role="pay-open"]') as HTMLButtonElement).click();
        await flush();
        expect(figureOf(root, 'pay')).toBe('5,000');
        await republish([
            ['7b'.repeat(32), encodeDescriptionHex(B, 'Rye Flour', { price: XEC_B })],
            ['7d'.repeat(32), encodeRemovalHex(A)],
        ]);

        const sheet = root.querySelector('[data-role="pay"]');
        expect(sheet?.querySelector('[data-role="pay-qr"]'), 'no code').toBeNull();
        expect(sheet?.textContent).toContain(PAY_QUOTE_GONE);
        expect(sheet?.querySelector('[data-role="pay-cashtab"]'), 'nothing left to pay').toBeNull();
    });

    it('a removal of the stall’s only quote: the sheet says the quote is gone and offers nothing to press', async () => {
        // The critic, 2026-09-25, item 1: a finished walk that read the bare
        // tombstone of the last quote answers with every map empty and the
        // token in `decided`; that is a removal, not our silence.
        const { root } = bootStall(phone(new Map([[A, XEC_OLD]])));
        await flush();
        (root.querySelector('[data-role="pay-open"]') as HTMLButtonElement).click();
        await flush();
        expect(figureOf(root, 'pay')).toBe('5,000');
        await republish([['7d'.repeat(32), encodeRemovalHex(A)]]);
        await until(() => root.querySelector('[data-role="pay"] [data-role="pay-qr"]') === null);

        const sheet = root.querySelector('[data-role="pay"]');
        expect(sheet?.textContent).toContain(PAY_QUOTE_GONE);
        expect(sheet?.querySelector('[data-role="pay-cashtab"]'), 'nothing left to pay').toBeNull();
    });

    it('the same record republished: the press opens at once', async () => {
        const { root } = bootStall(phone(new Map([[A, XEC_OLD]])));
        await flush();
        (root.querySelector('[data-role="pay-open"]') as HTMLButtonElement).click();
        await flush();
        await republish([['7e'.repeat(32), encodeDescriptionHex(A, 'Plum Jam', { price: XEC_OLD })]]);

        expect(press(root, 'pay')).toContain('amount=5000.00');
        expect(root.querySelector('[data-role="pay"] [data-role="pay-valve"]')?.textContent ?? '').not.toBe(PAY_QUOTE_CHANGED);
    });

    it('a new unit: the rate held for the old one is never used, and the new one is asked for', async () => {
        const USD_RATE = 20_000_000n;
        const EUR_RATE = 18_000_000n;
        const asked: string[] = [];
        priceControl.fetch = async (code) => {
            asked.push(code);
            return code === 'usd' ? USD_RATE : code === 'eur' ? EUR_RATE : undefined;
        };
        const USD_QUOTE = { code: 'usd', exponent: 2, amount: 500n };
        const EUR_QUOTE = { code: 'eur', exponent: 2, amount: 500n };
        // On the page (`bootStall`): the sheet's own ask answers in place
        // only while it is connected (`wrap.isConnected`).
        const { root } = bootStall(phone(new Map([[A, USD_QUOTE]])));
        await flush();
        (root.querySelector('[data-role="pay-open"]') as HTMLButtonElement).click();
        await flush();
        expect(figureOf(root, 'pay')).toBe(formatXec(satsForQuote(USD_QUOTE, 1n, USD_RATE)!));
        asked.length = 0;

        await republish([['7f'.repeat(32), encodeDescriptionHex(A, 'Plum Jam', { price: EUR_QUOTE })]]);
        await flush();

        // Recomposed in place: the sheet asked the new unit's own rate.
        expect(asked, 'the new unit’s own rate is asked for').toContain('eur');
        const eur = formatXec(satsForQuote(EUR_QUOTE, 1n, EUR_RATE)!);
        expect(figureOf(root, 'pay')).toBe(eur);
        expect(figureOf(root, 'pay'), 'never the euro quote at the dollar’s rate').not.toBe(
            formatXec(satsForQuote(EUR_QUOTE, 1n, USD_RATE)!),
        );
        expect(root.querySelector('[data-role="pay"] [data-role="pay-valve"]')?.textContent).toBe(PAY_QUOTE_CHANGED_UNPRESSED);
        expect(press(root, 'pay'), 'the press after the move is absorbed').toBeUndefined();
        await flush();
        expect(figureOf(root, 'pay')).toBe(eur);
        later(PAY_RECOMPOSE_GRACE_MS + 1);
        expect(press(root, 'pay')).toContain(`amount=${eur.replace(/,/g, '')}`);
    });

    it('a new unit while the open’s own rate is asked for: never composed across units, and said', async () => {
        const USD_RATE = 20_000_000n;
        const EUR_RATE = 18_000_000n;
        let release!: () => void;
        const gate = new Promise<void>((resolve) => {
            release = resolve;
        });
        const asked: string[] = [];
        priceControl.fetch = async (code) => {
            asked.push(code);
            if (asked.length === 1) {
                // The open's own ask, held while the seller republishes.
                await gate;
            }
            return code === 'usd' ? USD_RATE : code === 'eur' ? EUR_RATE : undefined;
        };
        const EUR_QUOTE = { code: 'eur', exponent: 2, amount: 500n };
        const { root } = bootStall(phone(new Map([[A, { code: 'usd', exponent: 2, amount: 500n }]])));
        await flush();
        (root.querySelector('[data-role="pay-open"]') as HTMLButtonElement).click();
        await flush();
        expect(asked).toEqual(['usd']);

        await republish([['7a'.repeat(32), encodeDescriptionHex(A, 'Plum Jam', { price: EUR_QUOTE })]]);
        // The feeds answer long after the move was painted: the figure
        // that answer puts on screen is what the grace is measured from.
        later(PAY_RECOMPOSE_GRACE_MS + 1);
        release();
        await flush();

        expect(figureOf(root, 'pay') ?? '', 'never the euro quote at the dollar’s rate').not.toBe(
            formatXec(satsForQuote(EUR_QUOTE, 1n, USD_RATE)!),
        );
        expect(asked, 'the new unit’s own rate is asked for').toContain('eur');
        const eur = formatXec(satsForQuote(EUR_QUOTE, 1n, EUR_RATE)!);
        expect(figureOf(root, 'pay')).toBe(eur);
        // Painted by the open's own tail, which no press asked for: the
        // line asks for no second press. The figure that answer put on
        // screen is a change of its own (CRITIC-CARRYOVER-4 item 6): a
        // press inside its grace is absorbed, and one after it opens.
        expect(root.querySelector('[data-role="pay"] [data-role="pay-valve"]')?.textContent).toBe(PAY_QUOTE_CHANGED_UNPRESSED);
        expect(press(root, 'pay'), 'inside the grace of the figure the answer painted').toBeUndefined();
        later(PAY_RECOMPOSE_GRACE_MS + 1);
        expect(press(root, 'pay')).toContain(`amount=${eur.replace(/,/g, '')}`);
    });

    it('Pay several: a chosen item’s new figure is the new total in place, the press after it sends nothing, and the next press pays it', async () => {
        const { root } = bootStall(phone(new Map([[A, XEC_OLD], [B, XEC_B]])));
        await flush();
        (root.querySelector('[data-role="selection-toggle"]') as HTMLButtonElement).click();
        for (const tokenId of [A, B]) {
            [...root.querySelectorAll<HTMLButtonElement>('[data-role="selection-more"]')]
                .find((b) => b.getAttribute('data-focus-key') === `selection-step:${tokenId}:more`)!
                .click();
        }
        (root.querySelector('[data-role="pay-several-open"]') as HTMLButtonElement).click();
        await flush();
        expect(figureOf(root, 'pay-several')).toBe('12,000');

        await republish([
            ['8b'.repeat(32), encodeDescriptionHex(B, 'Rye Flour', { price: XEC_B })],
            ['8a'.repeat(32), encodeDescriptionHex(A, 'Plum Jam', { price: XEC_NEW })],
        ]);
        expect(figureOf(root, 'pay-several'), 'recomposed in place').toBe('16,000');

        expect(press(root, 'pay-several'), 'the press after the move is absorbed').toBeUndefined();
        expect(figureOf(root, 'pay-several')).toBe('16,000');
        expect(root.querySelector('[data-role="pay-several"] [data-role="pay-valve"]')?.textContent).toBe(
            payItemsChanged('Plum Jam'),
        );
        expect(press(root, 'pay-several'), 'a second press inside the grace is absorbed too').toBeUndefined();
        later(PAY_RECOMPOSE_GRACE_MS + 1);
        expect(press(root, 'pay-several')).toContain('amount=16000.00');
    });

    it('a unit this page does not paint: the sheet says the page can no longer show it and offers nothing to press', async () => {
        // The critic, 2026-09-25, item 3: the record is still the seller's,
        // in a unit this page does not write — our gap, never "no longer on
        // the stall".
        const { root } = bootStall(phone(new Map([[A, XEC_OLD]])));
        await flush();
        (root.querySelector('[data-role="pay-open"]') as HTMLButtonElement).click();
        await flush();
        await republish([['7c'.repeat(32), encodeDescriptionHex(A, 'Plum Jam', { price: { code: 'zzz', exponent: 2, amount: 500n } })]]);

        const sheet = root.querySelector('[data-role="pay"]');
        expect(sheet?.querySelector('[data-role="pay-qr"]'), 'no code').toBeNull();
        expect(sheet?.textContent).toContain(PAY_QUOTE_UNSHOWN);
        expect(sheet?.textContent).not.toContain(PAY_QUOTE_GONE);
        expect(sheet?.querySelector('[data-role="pay-cashtab"]')).toBeNull();
    });

    it('a new margin and new words: the press opens at once, and the sheet takes both in place', async () => {
        // The owner, 2026-09-25: "moved" is what the buyer pays changing.
        const RATE = 20_000_000n;
        priceControl.fetch = async (code) => (code === 'usd' ? RATE : undefined);
        const USD_QUOTE = { code: 'usd', exponent: 2, amount: 500n };
        const { root } = bootStall(phone(new Map([[A, USD_QUOTE]])));
        await flush();
        (root.querySelector('[data-role="pay-open"]') as HTMLButtonElement).click();
        await flush();
        const figure = figureOf(root, 'pay');
        expect(figure).toBe(formatXec(satsForQuote(USD_QUOTE, 1n, RATE)!));

        await republish([['7c'.repeat(32), encodeDescriptionHex(A, 'Now in a jar', { price: { ...USD_QUOTE, tolerancePct: 5 } })]]);
        const url = press(root, 'pay');
        expect(url, 'no stop and no second press').toContain(`amount=${figure!.replace(/,/g, '')}.00`);
        expect(root.querySelector('[data-role="pay"] [data-role="pay-valve"]')?.textContent ?? '').toBe('');
        expect(root.querySelector('[data-role="pay"] [data-role="pay-words"]')?.textContent).toBe('Now in a jar');
        expect(root.querySelector('[data-role="pay"] [data-role="pay-tolerance"]')?.textContent).toBe(payTolerance(5));
    });

    describe('the-line-is-decided-against-the-record-the-sheet-was-opened-on', () => {
        /**
         * The critic, 2026-09-25, item 7, and item 6's untested tails. After
         * an ask, a sheet is handed back to `onPayRecordMoved` when the
         * records it was painted from moved — not only when the rate
         * arrived for another unit — so a move in the SAME unit during the
         * open's own ask is said, where it was painted in silence; and every
         * road that asks (the open, the `?pay=` link, Pay several's open,
         * the move's own ask) composes only at the unit the record now
         * stands in.
         */
        const USD_RATE = 20_000_000n;
        const EUR_RATE = 18_000_000n;
        const GBP_RATE = 16_000_000n;
        const rates: Record<string, bigint> = { usd: USD_RATE, eur: EUR_RATE, gbp: GBP_RATE };
        const USD_QUOTE = { code: 'usd', exponent: 2, amount: 500n };
        const EUR_QUOTE = { code: 'eur', exponent: 2, amount: 500n };
        const GBP_QUOTE = { code: 'gbp', exponent: 2, amount: 500n };
        /** The price feed, with the next ask held until `release`. */
        const holdNextAsk = (): { asked: string[]; release: () => void } => {
            const asked: string[] = [];
            let release!: () => void;
            const gate = new Promise<void>((resolve) => {
                release = resolve;
            });
            let held = false;
            priceControl.fetch = async (code) => {
                asked.push(code);
                if (!held) {
                    held = true;
                    await gate;
                }
                return rates[code];
            };
            return { asked, release: () => release() };
        };
        const at = (quote: { code: string; exponent: number; amount: bigint }, rate: bigint): string =>
            formatXec(satsForQuote(quote, 1n, rate)!);

        it('a new figure in the same unit during the open’s own ask is said', async () => {
            const { root } = bootStall(phone(new Map([[A, USD_QUOTE]])));
            await flush();
            const { release } = holdNextAsk();
            (root.querySelector('[data-role="pay-open"]') as HTMLButtonElement).click();
            await flush();
            await republish([['4a'.repeat(32), encodeDescriptionHex(A, 'Plum Jam', { price: { ...USD_QUOTE, amount: 700n } })]]);
            release();
            await until(() => figureOf(root, 'pay') !== undefined && figureOf(root, 'pay') !== '');
            expect(figureOf(root, 'pay')).toBe(at({ ...USD_QUOTE, amount: 700n }, USD_RATE));
            // Told — in the first clause alone: the open's tail painted it,
            // and no press was made to ask for again (item 7).
            expect(root.querySelector('[data-role="pay"] [data-role="pay-valve"]')?.textContent, 'the buyer is told').toBe(
                PAY_QUOTE_CHANGED_UNPRESSED,
            );
        });

        describe('a-pay-hint-sheet-never-composes-across-units', () => {
            it('a `?pay=` sheet whose record moves to another unit during its ask asks that unit and says so', async () => {
                const { root } = bootStall(
                    stallEmpty({
                        tokens: new Map([[A, fungible(A, 'Plum Jam')]]),
                        prices: new Map([[A, USD_QUOTE]]),
                        shopTab: 'quotes',
                        payHint: A.slice(0, 12),
                    }),
                );
                const { asked, release } = holdNextAsk();
                await flush();
                expect(root.querySelector('[data-role="pay"]'), 'the link opened the sheet').not.toBeNull();
                await republish([['4b'.repeat(32), encodeDescriptionHex(A, 'Plum Jam', { price: EUR_QUOTE })]]);
                release();
                await until(() => figureOf(root, 'pay') === at(EUR_QUOTE, EUR_RATE));
                expect(asked, 'the new unit’s own rate').toContain('eur');
                expect(figureOf(root, 'pay'), 'never the euro quote at the dollar’s rate').toBe(at(EUR_QUOTE, EUR_RATE));
                expect(root.querySelector('[data-role="pay"] [data-role="pay-valve"]')?.textContent).toBe(PAY_QUOTE_CHANGED_UNPRESSED);
            });
        });

        it('a record that moves again while the move’s own rate is asked for composes at the last unit', async () => {
            priceControl.fetch = async (code) => rates[code];
            // On the page (`bootStall`): the sheet's own ask answers only
            // while connected.
            const { root } = bootStall(phone(new Map([[A, USD_QUOTE]])));
            await flush();
            (root.querySelector('[data-role="pay-open"]') as HTMLButtonElement).click();
            await flush();
            const { asked, release } = holdNextAsk();
            // Recomposed in place, and the euro's own rate asked for — held
            // (the dollar's first, which judges the feed, then the euro's).
            await republish([['4c'.repeat(32), encodeDescriptionHex(A, 'Plum Jam', { price: EUR_QUOTE })]]);
            expect(asked).toEqual(['usd', 'eur']);
            await republish([['4d'.repeat(32), encodeDescriptionHex(A, 'Plum Jam', { price: GBP_QUOTE })]]);
            release();
            await until(() => figureOf(root, 'pay') === at(GBP_QUOTE, GBP_RATE));
            expect(figureOf(root, 'pay'), 'never the pound quote at the euro’s rate').toBe(at(GBP_QUOTE, GBP_RATE));
            expect(asked).toContain('gbp');
            expect(press(root, 'pay'), 'the press after the move is absorbed').toBeUndefined();
            await until(() => figureOf(root, 'pay') === at(GBP_QUOTE, GBP_RATE));
            later(PAY_RECOMPOSE_GRACE_MS + 1);
            expect(press(root, 'pay')).toContain(`amount=${at(GBP_QUOTE, GBP_RATE).replace(/,/g, '')}`);
        });

        it('Pay several: a chosen item that moves unit during the open’s ask leaves, and the rest compose at the chosen unit', async () => {
            priceControl.fetch = async (code) => rates[code];
            const USD_B = { code: 'usd', exponent: 2, amount: 300n };
            const { root } = bootStall(phone(new Map([[A, USD_QUOTE], [B, USD_B]])));
            await flush();
            (root.querySelector('[data-role="selection-toggle"]') as HTMLButtonElement).click();
            for (const tokenId of [A, B]) {
                [...root.querySelectorAll<HTMLButtonElement>('[data-role="selection-more"]')]
                    .find((b) => b.getAttribute('data-focus-key') === `selection-step:${tokenId}:more`)!
                    .click();
            }
            const { release } = holdNextAsk();
            (root.querySelector('[data-role="pay-several-open"]') as HTMLButtonElement).click();
            await flush();
            await republish([
                ['4f'.repeat(32), encodeDescriptionHex(B, 'Rye Flour', { price: USD_B })],
                ['4e'.repeat(32), encodeDescriptionHex(A, 'Plum Jam', { price: EUR_QUOTE })],
            ]);
            release();
            await until(() => figureOf(root, 'pay-several') === at(USD_B, USD_RATE));
            expect(figureOf(root, 'pay-several'), 'Rye Flour alone, at the dollar’s rate').toBe(at(USD_B, USD_RATE));
            const sheet = root.querySelector('[data-role="pay-several"]');
            // Plum Jam left the choice: named once, on the dropped line, and
            // never on the valve beside it (item 6) — asking the buyer to
            // check the total, since that is all the re-read did to it and
            // no press was made (CRITIC-CARRYOVER-3 item 2).
            expect(sheet?.querySelector('[data-role="pay-valve"]')?.textContent ?? '').toBe('');
            expect(sheet?.querySelector('[data-role="pay-several-dropped"]')?.textContent).toBe(selectionDroppedCheck('Plum Jam', 1));
        });
    });

    describe('a-sheet-over-a-moved-record-shows-the-new-figure', () => {
        /**
         * The owner, 2026-09-25 (CRITIC-CARRYOVER-2, item 1), through the
         * real app. A re-read that moves what the buyer pays while a sheet
         * is open recomposes the SAME sheet node in place from the record as
         * it stands — the figure, the code, both links, the restated figure,
         * the buyer's quantity kept — and says so; the press after it is
         * absorbed and paints the sheet again from the same records; the
         * press after that pays the new figure. A record back to what the
         * sheet was opened on clears the line and the absorb. Replaces the
         * round-2 test that pinned "nothing on it is recomposed".
         */
        const RATE = 20_000_000n;
        const USD_A = { code: 'usd', exponent: 2, amount: 500n };
        const USD_A2 = { code: 'usd', exponent: 2, amount: 700n };
        const USD_B = { code: 'usd', exponent: 2, amount: 300n };
        const scope = (root: HTMLElement, name: string) => root.querySelector(`[data-role="${name}"]`) as HTMLElement | null;
        const choose = async (root: HTMLElement): Promise<void> => {
            (root.querySelector('[data-role="selection-toggle"]') as HTMLButtonElement).click();
            for (const tokenId of [A, B]) {
                [...root.querySelectorAll<HTMLButtonElement>('[data-role="selection-more"]')]
                    .find((b) => b.getAttribute('data-focus-key') === `selection-step:${tokenId}:more`)!
                    .click();
            }
            (root.querySelector('[data-role="pay-several-open"]') as HTMLButtonElement).click();
            await flush();
        };
        const cases = [
            { unit: 'XEC', prices: new Map([[A, XEC_OLD], [B, XEC_B]]), moved: XEC_NEW, rate: undefined },
            { unit: 'USD', prices: new Map([[A, USD_A], [B, USD_B]]), moved: USD_A2, rate: RATE },
        ] as const;

        for (const c of cases) {
            it(`${c.unit === 'XEC' ? 'an' : 'a'} ${c.unit} quote on the single sheet, the buyer’s quantity kept`, async () => {
                priceControl.fetch = async (code) => (code === 'usd' ? RATE : undefined);
                const { root } = bootStall(phone(new Map(c.prices)));
                await flush();
                (root.querySelector('[data-role="pay-open"]') as HTMLButtonElement).click();
                // A USD sheet is painted again when its rate lands: capture
                // the sheet that holds the code, not the one asking.
                await until(() => scope(root, 'pay')?.querySelector('[data-role="pay-qr"]') != null);
                const sheet = scope(root, 'pay')!;
                (sheet.querySelector('[data-role="pay-quantity-edit"]') as HTMLButtonElement).click();
                const field = sheet.querySelector('[data-role="pay-quantity"]') as HTMLInputElement;
                field.value = '2';
                field.dispatchEvent(new Event('input'));
                const figure = figureOf(root, 'pay');
                expect(figure).toBe(formatXec(satsForQuote(c.prices.get(A)!, 2n, c.rate)!));

                await republish([['6a'.repeat(32), encodeDescriptionHex(A, 'Plum Jam', { price: c.moved })]]);
                // The burst is a real timer (`until`'s own reason).
                const moved = formatXec(satsForQuote(c.moved, 2n, c.rate)!);
                await until(() => figureOf(root, 'pay') === moved);
                expect(scope(root, 'pay'), 'the sheet is not rebuilt under the buyer').toBe(sheet);
                expect(figureOf(root, 'pay'), 'the new figure, for the two the buyer asked').toBe(moved);
                expect(sheet.querySelector('[data-role="pay-qr"]'), 'a code for the record as it stands').not.toBeNull();
                expect(sheet.querySelector('[data-role="pay-valve"]')?.textContent).toBe(PAY_QUOTE_CHANGED_UNPRESSED);
                expect(sheet.querySelector('[data-role="pay-cashtab"]')?.textContent).toBe(payFigure(moved));

                expect(press(root, 'pay'), 'the press after the move is absorbed').toBeUndefined();
                const again = scope(root, 'pay')!;
                expect(again, 'painted again from the same records').not.toBe(sheet);
                expect(figureOf(root, 'pay')).toBe(moved);
                expect(again.querySelector('[data-role="pay-qr"]')).not.toBeNull();
                expect(again.querySelector('[data-role="pay-valve"]')?.textContent).toBe(PAY_QUOTE_CHANGED);
                later(PAY_RECOMPOSE_GRACE_MS + 1);
                expect(press(root, 'pay')).toContain(`amount=${moved.replace(/,/g, '')}`);
            });

            it(`${c.unit} quotes on Pay several`, async () => {
                priceControl.fetch = async (code) => (code === 'usd' ? RATE : undefined);
                const { root } = bootStall(phone(new Map(c.prices)));
                await flush();
                await choose(root);
                await until(() => scope(root, 'pay-several')?.querySelector('[data-role="pay-qr"]') != null);
                const sheet = scope(root, 'pay-several')!;
                const figure = figureOf(root, 'pay-several');

                await republish([
                    ['6b'.repeat(32), encodeDescriptionHex(B, 'Rye Flour', { price: c.prices.get(B)! })],
                    ['6c'.repeat(32), encodeDescriptionHex(A, 'Plum Jam', { price: c.moved })],
                ]);
                const moved = formatXec(satsForQuote(c.moved, 1n, c.rate)! + satsForQuote(c.prices.get(B)!, 1n, c.rate)!);
                await until(() => figureOf(root, 'pay-several') === moved);
                expect(moved).not.toBe(figure);
                expect(scope(root, 'pay-several'), 'the sheet is not rebuilt under the buyer').toBe(sheet);
                expect(figureOf(root, 'pay-several')).toBe(moved);
                expect(sheet.querySelector('[data-role="pay-qr"]'), 'a code for the choice as it stands').not.toBeNull();
                expect(sheet.querySelector('[data-role="pay-valve"]')?.textContent).toBe(payItemsChangedUnpressed('Plum Jam'));

                expect(press(root, 'pay-several'), 'the press after the move is absorbed').toBeUndefined();
                expect(scope(root, 'pay-several')).not.toBe(sheet);
                expect(figureOf(root, 'pay-several')).toBe(moved);
                later(PAY_RECOMPOSE_GRACE_MS + 1);
                expect(press(root, 'pay-several')).toContain(`amount=${moved.replace(/,/g, '')}`);
            });
        }

        it('a record gone or in a unit this page does not paint leaves no figure, code or Pay, said once', async () => {
            for (const [txid, hex, line] of [
                ['6e'.repeat(32), encodeRemovalHex(A), PAY_QUOTE_GONE],
                ['6f'.repeat(32), encodeDescriptionHex(A, 'Plum Jam', { price: { code: 'zzz', exponent: 2, amount: 500n } }), PAY_QUOTE_UNSHOWN],
            ] as const) {
                const { root } = bootStall(phone(new Map([[A, XEC_OLD], [B, XEC_B]])));
                await flush();
                (root.querySelector('[data-role="pay-open"]') as HTMLButtonElement).click();
                await until(() => scope(root, 'pay')?.querySelector('[data-role="pay-qr"]') != null);
                const sheet = scope(root, 'pay')!;
                await republish([
                    ['6d'.repeat(32), encodeDescriptionHex(B, 'Rye Flour', { price: XEC_B })],
                    [txid, hex],
                ]);
                await until(() => sheet.querySelector('[data-role="pay-lost"]') !== null);
                expect(scope(root, 'pay'), line).toBe(sheet);
                expect(sheet.querySelector('[data-role="pay-lost"]')?.textContent).toBe(line);
                expect((sheet.textContent ?? '').split(line).length - 1, 'said once').toBe(1);
                expect(sheet.querySelector('[data-role="pay-qr"]')).toBeNull();
                expect(sheet.querySelector('[data-role="pay-cashtab"]')).toBeNull();
            }
        });

        it('a-return-to-the-opened-record-is-a-change-with-its-own-grace: the line stays, the figure is restated, a press inside its grace opens nothing', async () => {
            // CRITIC-CARRYOVER-4 item 2, through the real app (the sheet's
            // own half is in render.test.ts under the same name).
            const { root } = bootStall(phone(new Map([[A, XEC_OLD]])));
            await flush();
            (root.querySelector('[data-role="pay-open"]') as HTMLButtonElement).click();
            await until(() => scope(root, 'pay')?.querySelector('[data-role="pay-qr"]') != null);
            const sheet = scope(root, 'pay')!;
            await republish([['5e'.repeat(32), encodeDescriptionHex(A, 'Plum Jam', { price: XEC_NEW })]]);
            await until(() => figureOf(root, 'pay') === '9,000');
            expect(sheet.querySelector('[data-role="pay-valve"]')?.textContent).toBe(PAY_QUOTE_CHANGED_UNPRESSED);
            // Republished at the first figure, in a later block.
            const hex = encodeDescriptionHex(A, 'Plum Jam', { price: XEC_OLD });
            const txid = publish(signedTx({ txid: '5f'.repeat(32), outputs: [`6a${hex!}`], height: 8 }));
            for (const watch of watches.filter((w) => !w.closed)) {
                watch.hooks.onBurst?.([txid]);
            }
            await until(() => figureOf(root, 'pay') === '5,000');
            expect(scope(root, 'pay')).toBe(sheet);
            expect(sheet.querySelector('[data-role="pay-valve"]')?.textContent, 'the line stays').toBe(PAY_QUOTE_CHANGED_UNPRESSED);
            expect(sheet.querySelector('[data-role="pay-cashtab"]')?.textContent, 'the figure is restated').toBe(payFigure('5,000'));
            expect(press(root, 'pay'), 'inside the return’s own grace').toBeUndefined();
            const rebuilt = scope(root, 'pay')!;
            expect(rebuilt, 'painted again').not.toBe(sheet);
            expect(rebuilt.querySelector('[data-role="pay-valve"]')?.textContent, 'the absorbed press says so').toBe(PAY_QUOTE_CHANGED);
            expect(rebuilt.querySelector('[data-role="pay-cashtab"]')?.textContent, 'never the plain control again').toBe(
                payFigure('5,000'),
            );
            expect(press(root, 'pay'), 'a second tap on the sheet the app painted').toBeUndefined();
            later(PAY_RECOMPOSE_GRACE_MS + 1);
            expect(press(root, 'pay'), 'after the grace').toContain('amount=5000.00');
        });

        it('a new margin and new words under the open sheet are taken in place, and the code stays', async () => {
            priceControl.fetch = async (code) => (code === 'usd' ? RATE : undefined);
            const { root } = bootStall(phone(new Map([[A, USD_A]])));
            await flush();
            (root.querySelector('[data-role="pay-open"]') as HTMLButtonElement).click();
            await until(() => scope(root, 'pay')?.querySelector('[data-role="pay-qr"]') != null);
            const sheet = scope(root, 'pay')!;
            await republish([['6d'.repeat(32), encodeDescriptionHex(A, 'Now in a jar', { price: { ...USD_A, tolerancePct: 5 } })]]);
            await until(() => sheet.querySelector('[data-role="pay-words"]') !== null);
            expect(scope(root, 'pay')).toBe(sheet);
            expect(sheet.querySelector('[data-role="pay-qr"]'), 'the payment did not move').not.toBeNull();
            expect(sheet.querySelector('[data-role="pay-words"]')?.textContent).toBe('Now in a jar');
            expect(sheet.querySelector('[data-role="pay-tolerance"]')?.textContent).toBe(payTolerance(5));
            expect(sheet.querySelector('[data-role="pay-valve"]')?.textContent ?? '').toBe('');
            expect(press(root, 'pay'), 'one press').toContain('amount=');
        });
    });

    describe('a-record-that-comes-back-under-an-open-sheet-is-composed-again', () => {
        /**
         * The critic, CARRYOVER-3 item 1. A sheet judged each re-read against
         * the record it last COMPOSED, which a record that left never moves:
         * the single sheet kept its last figure as `price`, and Pay several
         * held nothing at all for an item a re-read took out. So a record
         * that came back — at the figure it left at, which is exactly the
         * trap — read as "no change" and the sheet went on saying it was
         * gone, or "taken out" while its code paid the rest alone. Judged
         * against the last record SEEN now (`seen`), every sequence below
         * ends composed from the records as they stand: one bigint on the
         * figure, the code and the link, and none of the sentences the
         * earlier re-reads left behind.
         */
        const XEC_MID = { code: 'xec', exponent: 2, amount: 700_000n };
        const sheetOf = (root: HTMLElement, name: string) => root.querySelector(`[data-role="${name}"]`) as HTMLElement | null;
        const codeOf = (sheet: HTMLElement | null): string | null | undefined =>
            sheet?.querySelector('[data-role="pay-qr"] path')?.getAttribute('d');
        /** The figure on screen, its code, and the link a press opens: one bigint. */
        const oneFigure = (root: HTMLElement, name: string, figure: string): void => {
            const sheet = sheetOf(root, name);
            expect(figureOf(root, name), 'the figure').toBe(figure);
            const code = codeOf(sheet);
            expect(code, 'a code for the records as they stand').toBeTruthy();
            let url = press(root, name);
            if (url === undefined) {
                // Every press inside the grace of a change is absorbed; a
                // press after it opens.
                later(PAY_RECOMPOSE_GRACE_MS + 1);
                url = press(root, name);
            }
            expect(url, 'the link').toContain(`amount=${figure.replace(/,/g, '')}.00`);
            const bip21 = url!.split('#/send?bip21=')[1]!;
            expect(qrSvg(bip21, '').querySelector('path')?.getAttribute('d'), 'the code is the link').toBe(code);
        };
        const choose = async (root: HTMLElement): Promise<void> => {
            (root.querySelector('[data-role="selection-toggle"]') as HTMLButtonElement).click();
            for (const tokenId of [A, B]) {
                [...root.querySelectorAll<HTMLButtonElement>('[data-role="selection-more"]')]
                    .find((b) => b.getAttribute('data-focus-key') === `selection-step:${tokenId}:more`)!
                    .click();
            }
            (root.querySelector('[data-role="pay-several-open"]') as HTMLButtonElement).click();
            await flush();
        };
        const stale = [PAY_QUOTE_GONE, PAY_QUOTE_UNSHOWN, PAY_SEVERAL_GONE];

        it('the single sheet: moved, removed, then republished at the figure it left at', async () => {
            const { root } = bootStall(phone(new Map([[A, XEC_OLD]])));
            await flush();
            (root.querySelector('[data-role="pay-open"]') as HTMLButtonElement).click();
            await flush();
            const sheet = sheetOf(root, 'pay');
            expect(figureOf(root, 'pay')).toBe('5,000');
            await republish([['c1'.repeat(32), encodeDescriptionHex(A, 'Plum Jam', { price: XEC_NEW })]]);
            await until(() => figureOf(root, 'pay') === '9,000');
            await republish([['c2'.repeat(32), encodeRemovalHex(A)]]);
            await until(() => sheet?.querySelector('[data-role="pay-lost"]') != null);
            expect(sheet?.querySelector('[data-role="pay-lost"]')?.textContent).toBe(PAY_QUOTE_GONE);

            await republish([['c3'.repeat(32), encodeDescriptionHex(A, 'Plum Jam', { price: XEC_NEW })]]);
            await until(() => sheet?.querySelector('[data-role="pay-lost"]') == null);
            expect(sheetOf(root, 'pay'), 'the same sheet, not rebuilt').toBe(sheet);
            for (const line of stale) {
                expect(sheet?.textContent ?? '', line).not.toContain(line);
            }
            expect(sheet?.querySelector('[data-role="pay-valve"]')?.textContent, 'moved from what it was opened on').toBe(PAY_QUOTE_CHANGED_UNPRESSED);
            oneFigure(root, 'pay', '9,000');
        });

        it('the single sheet: moved, then in a unit this page does not paint, then back', async () => {
            const { root } = bootStall(phone(new Map([[A, XEC_OLD]])));
            await flush();
            (root.querySelector('[data-role="pay-open"]') as HTMLButtonElement).click();
            await flush();
            const sheet = sheetOf(root, 'pay');
            await republish([['c4'.repeat(32), encodeDescriptionHex(A, 'Plum Jam', { price: XEC_NEW })]]);
            await until(() => figureOf(root, 'pay') === '9,000');
            await republish([['c5'.repeat(32), encodeDescriptionHex(A, 'Plum Jam', { price: { code: 'zzz', exponent: 2, amount: 500n } })]]);
            await until(() => sheet?.querySelector('[data-role="pay-lost"]') != null);
            expect(sheet?.querySelector('[data-role="pay-lost"]')?.textContent).toBe(PAY_QUOTE_UNSHOWN);

            await republish([['c6'.repeat(32), encodeDescriptionHex(A, 'Plum Jam', { price: XEC_NEW })]]);
            await until(() => sheet?.querySelector('[data-role="pay-lost"]') == null);
            expect(sheetOf(root, 'pay')).toBe(sheet);
            for (const line of stale) {
                expect(sheet?.textContent ?? '', line).not.toContain(line);
            }
            expect(sheet?.querySelector('[data-role="pay-valve"]')?.textContent).toBe(PAY_QUOTE_CHANGED_UNPRESSED);
            oneFigure(root, 'pay', '9,000');
        });

        it('Pay several: every chosen item removed, then one back', async () => {
            const { root } = bootStall(phone(new Map([[A, XEC_OLD], [B, XEC_B]])));
            await flush();
            await choose(root);
            const sheet = sheetOf(root, 'pay-several');
            expect(figureOf(root, 'pay-several')).toBe('12,000');
            await republish([
                ['d1'.repeat(32), encodeRemovalHex(A)],
                ['d2'.repeat(32), encodeRemovalHex(B)],
            ]);
            await until(() => sheet?.querySelector('[data-role="pay-lost"]') != null);
            expect(sheet?.querySelector('[data-role="pay-lost"]')?.textContent).toBe(PAY_SEVERAL_GONE);

            await republish([['d3'.repeat(32), encodeDescriptionHex(B, 'Rye Flour', { price: XEC_B })]]);
            await until(() => sheet?.querySelector('[data-role="pay-lost"]') == null);
            expect(sheetOf(root, 'pay-several')).toBe(sheet);
            for (const line of stale) {
                expect(sheet?.textContent ?? '', line).not.toContain(line);
            }
            expect(sheet?.querySelector('[data-role="pay-lines"]')?.textContent ?? '', 'Rye Flour is back').toContain('Rye Flour');
            expect(sheet?.querySelector('[data-role="pay-several-dropped"]')?.textContent ?? '', 'Plum Jam is still out').toContain('Plum Jam');
            oneFigure(root, 'pay-several', '7,000');
        });

        it('Pay several: one chosen item taken out, then back at a new figure', async () => {
            const { root } = bootStall(phone(new Map([[A, XEC_OLD], [B, XEC_B]])));
            await flush();
            await choose(root);
            const sheet = sheetOf(root, 'pay-several');
            await republish([
                ['e1'.repeat(32), encodeDescriptionHex(B, 'Rye Flour', { price: XEC_B })],
                ['e2'.repeat(32), encodeRemovalHex(A)],
            ]);
            await until(() => figureOf(root, 'pay-several') === '7,000');
            expect(sheet?.querySelector('[data-role="pay-several-dropped"]')?.textContent ?? '').toContain('Plum Jam');

            await republish([['e3'.repeat(32), encodeDescriptionHex(A, 'Plum Jam', { price: XEC_MID })]]);
            await until(() => figureOf(root, 'pay-several') === '14,000');
            expect(sheetOf(root, 'pay-several')).toBe(sheet);
            expect(sheet?.querySelector('[data-role="pay-several-dropped"]'), 'nothing is taken out now').toBeNull();
            expect(sheet?.querySelector('[data-role="pay-lines"]')?.textContent ?? '').toContain('Plum Jam');
            expect(sheet?.querySelector('[data-role="pay-valve"]')?.textContent).toBe(payItemsChangedUnpressed('Plum Jam'));
            oneFigure(root, 'pay-several', '14,000');
        });
    });

    describe('a-press-inside-the-grace-is-absorbed-and-one-after-it-opens', () => {
        /**
         * The owner, 2026-09-25 (CRITIC-CARRYOVER-3 item 2), through the real
         * app. A re-read that recomposes an open sheet in place says so with
         * the first clause alone — nobody pressed. A press inside
         * `PAY_RECOMPOSE_GRACE_MS` of it is absorbed and SAYS so: the sheet
         * is painted again asking for the press again, and the press after
         * it opens. A press after the grace opens the new figure at once.
         * On Pay several, a re-read that only took an item out says so on
         * the dropped line with "check the total". The grace is measured on
         * the page's monotonic clock, held still for the whole test
         * (`holdClock`, the describe's `later`; CRITIC-CARRYOVER-4 item 10):
         * a pause under load between the change and the press cannot turn
         * "inside" into "after".
         */
        const valveOf = (root: HTMLElement, name: string): string =>
            root.querySelector(`[data-role="${name}"] [data-role="pay-valve"]`)?.textContent ?? '';
        const droppedOf = (root: HTMLElement): string =>
            root.querySelector('[data-role="pay-several"] [data-role="pay-several-dropped"]')?.textContent ?? '';
        const choose = async (root: HTMLElement): Promise<void> => {
            (root.querySelector('[data-role="selection-toggle"]') as HTMLButtonElement).click();
            for (const tokenId of [A, B]) {
                [...root.querySelectorAll<HTMLButtonElement>('[data-role="selection-more"]')]
                    .find((b) => b.getAttribute('data-focus-key') === `selection-step:${tokenId}:more`)!
                    .click();
            }
            (root.querySelector('[data-role="pay-several-open"]') as HTMLButtonElement).click();
            await flush();
        };

        it('the single sheet, inside the grace: absorbed, and the sheet asks for the press again', async () => {
            const { root } = bootStall(phone(new Map([[A, XEC_OLD]])));
            await flush();
            (root.querySelector('[data-role="pay-open"]') as HTMLButtonElement).click();
            await flush();
            await republish([['f1'.repeat(32), encodeDescriptionHex(A, 'Plum Jam', { price: XEC_NEW })]]);
            await until(() => figureOf(root, 'pay') === '9,000');
            expect(valveOf(root, 'pay')).toBe(PAY_QUOTE_CHANGED_UNPRESSED);
            expect(press(root, 'pay'), 'inside the grace').toBeUndefined();
            expect(valveOf(root, 'pay'), 'the absorbed press says so').toBe(PAY_QUOTE_CHANGED);
            later(PAY_RECOMPOSE_GRACE_MS + 1);
            expect(press(root, 'pay')).toContain('amount=9000.00');
        });

        it('the single sheet, after the grace: the press opens the new figure', async () => {
            const { root } = bootStall(phone(new Map([[A, XEC_OLD]])));
            await flush();
            (root.querySelector('[data-role="pay-open"]') as HTMLButtonElement).click();
            await flush();
            const sheet = root.querySelector('[data-role="pay"]');
            await republish([['f2'.repeat(32), encodeDescriptionHex(A, 'Plum Jam', { price: XEC_NEW })]]);
            await until(() => figureOf(root, 'pay') === '9,000');
            later(PAY_RECOMPOSE_GRACE_MS + 1);
            expect(press(root, 'pay'), 'one press').toContain('amount=9000.00');
            expect(root.querySelector('[data-role="pay"]'), 'nothing handed back').toBe(sheet);
        });

        it('Pay several, an item taken out: "check the total" in place; inside the grace absorbed and said, after it open', async () => {
            for (const inside of [true, false]) {
                const { root } = bootStall(phone(new Map([[A, XEC_OLD], [B, XEC_B]])));
                await flush();
                await choose(root);
                await republish([
                    [(inside ? 'f3' : 'f5').repeat(32), encodeDescriptionHex(B, 'Rye Flour', { price: XEC_B })],
                    [(inside ? 'f4' : 'f6').repeat(32), encodeRemovalHex(A)],
                ]);
                await until(() => figureOf(root, 'pay-several') === '7,000');
                expect(droppedOf(root)).toBe(selectionDroppedCheck('Plum Jam', 1));
                expect(valveOf(root, 'pay-several'), 'said once, on the dropped line').toBe('');
                if (inside) {
                    expect(press(root, 'pay-several'), 'inside the grace').toBeUndefined();
                    expect(droppedOf(root), 'the absorbed press says so').toBe(selectionDroppedCheckPressed('Plum Jam', 1));
                }
                later(PAY_RECOMPOSE_GRACE_MS + 1);
                expect(press(root, 'pay-several')).toContain('amount=7000.00');
                if (inside) {
                    expect(droppedOf(root), 'a wallet opened: nothing left to press again').toBe(
                        selectionDroppedCheck('Plum Jam', 1),
                    );
                }
            }
        });
    });

    describe('a-unit-change-on-the-first-chosen-item-drops-that-item-not-the-rest', () => {
        /**
         * The critic, 2026-09-25, item 4. Chosen in XEC, first Plum Jam and
         * then Rye Flour; the seller republishes Plum Jam in USD. The prune
         * judged the first kept item's CURRENT unit, so Rye Flour went and
         * Plum Jam — the item that moved — stayed. Now the choice keeps the
         * unit it was chosen in: Plum Jam leaves, Rye Flour stays, and the
         * strip and the sheet say which item left.
         */
        const pick = (root: HTMLElement): void => {
            (root.querySelector('[data-role="selection-toggle"]') as HTMLButtonElement).click();
            for (const tokenId of [A, B]) {
                [...root.querySelectorAll<HTMLButtonElement>('[data-role="selection-more"]')]
                    .find((b) => b.getAttribute('data-focus-key') === `selection-step:${tokenId}:more`)!
                    .click();
            }
        };
        const USD_A = { code: 'usd', exponent: 2, amount: 500n };

        it('on the strip', async () => {
            priceControl.fetch = async (code) => (code === 'usd' ? 20_000_000n : undefined);
            const { root } = bootStall(phone(new Map([[A, XEC_OLD], [B, XEC_B]])));
            await flush();
            pick(root);
            await republish([
                ['5b'.repeat(32), encodeDescriptionHex(B, 'Rye Flour', { price: XEC_B })],
                ['5a'.repeat(32), encodeDescriptionHex(A, 'Plum Jam', { price: USD_A })],
            ]);
            // Read off this app's own tree (see `overlapping-bursts-…`).
            await until(() => root.querySelector('[data-role="selection-dropped"]') !== null);
            expect(root.querySelector('[data-role="selection-names"]')?.textContent, 'the item that moved leaves, the rest stay').toBe('Rye Flour ×1');
            expect(root.querySelector('[data-role="selection-dropped"]')?.textContent).toBe(selectionDroppedItems('Plum Jam', 1));
            expect(root.querySelector('[data-role="selection-total"]')?.textContent, 'the rest, in the unit they were chosen in').toContain('7,000');
            (root.querySelector('[data-role="pay-several-open"]') as HTMLButtonElement).click();
            await flush();
            expect(root.querySelector('[data-role="pay-several"] [data-role="pay-several-dropped"]')?.textContent).toBe(
                selectionDroppedItems('Plum Jam', 1),
            );
            expect(press(root, 'pay-several')).toContain('amount=7000.00');
        });

        it('under the open sheet: the press says which item left and composes the rest', async () => {
            priceControl.fetch = async (code) => (code === 'usd' ? 20_000_000n : undefined);
            const { root } = bootStall(phone(new Map([[A, XEC_OLD], [B, XEC_B]])));
            await flush();
            pick(root);
            (root.querySelector('[data-role="pay-several-open"]') as HTMLButtonElement).click();
            await flush();
            expect(figureOf(root, 'pay-several')).toBe('12,000');
            await republish([
                ['5d'.repeat(32), encodeDescriptionHex(B, 'Rye Flour', { price: XEC_B })],
                ['5c'.repeat(32), encodeDescriptionHex(A, 'Plum Jam', { price: USD_A })],
            ]);
            // In place: Plum Jam leaves the choice, named on the dropped line,
            // which asks the buyer to check the total (CRITIC-CARRYOVER-3
            // item 2).
            await until(() => figureOf(root, 'pay-several') === '7,000');
            expect(root.querySelector('[data-role="pay-several"] [data-role="pay-several-dropped"]')?.textContent).toBe(
                selectionDroppedCheck('Plum Jam', 1),
            );

            expect(press(root, 'pay-several'), 'the press is absorbed').toBeUndefined();
            const sheet = root.querySelector('[data-role="pay-several"]');
            expect(figureOf(root, 'pay-several'), 'Rye Flour alone, still in XEC').toBe('7,000');
            // Named once, on the dropped line, and never on the valve (item 6);
            // the absorbed press asks for the press again.
            expect(sheet?.querySelector('[data-role="pay-valve"]')?.textContent ?? '').toBe('');
            expect(sheet?.querySelector('[data-role="pay-several-dropped"]')?.textContent).toBe(selectionDroppedCheckPressed('Plum Jam', 1));
            expect(sheet?.querySelector('[data-role="pay-lines"]')?.textContent ?? '').not.toContain('Plum Jam');
            later(PAY_RECOMPOSE_GRACE_MS + 1);
            expect(press(root, 'pay-several')).toContain('amount=7000.00');
        });

        it('on a touch wall', async () => {
            // The critic, CARRYOVER-2 item 5: the wall's prune was untested.
            // The wall reads the same chosen unit (`selectionChosenUnit`) and
            // says the generic `SELECTION_DROPPED`.
            priceControl.fetch = async (code) => (code === 'usd' ? 20_000_000n : undefined);
            const state = phone(new Map([[A, XEC_OLD], [B, XEC_B]]));
            state.view = {
                ...state.view,
                window: { show: 'quotes', mode: 'browse', payCode: true, turn: 'none', touch: true },
            };
            const { root } = bootStall(state);
            await flush();
            for (const tokenId of [A, B]) {
                const more = root.querySelector<HTMLButtonElement>(`[data-focus-key="window-step-more:${tokenId}"]`);
                expect(more, `the wall offers + for ${tokenId === A ? 'Plum Jam' : 'Rye Flour'}`).not.toBeNull();
                more!.click();
                await flush();
            }
            const strip = (): Element | null => root.querySelector('[data-role="window-selection"]');
            expect(strip()?.textContent).toContain('Plum Jam');
            expect(root.querySelector('[data-role="selection-total"]')?.textContent, 'chosen in XEC').toContain('12,000');

            await republish([
                ['5f'.repeat(32), encodeDescriptionHex(B, 'Rye Flour', { price: XEC_B })],
                ['5e'.repeat(32), encodeDescriptionHex(A, 'Plum Jam', { price: USD_A })],
            ]);
            await until(() => root.querySelector('[data-role="selection-dropped"]') !== null);
            expect(root.querySelector('[data-role="selection-dropped"]')?.textContent).toBe(SELECTION_DROPPED);
            expect(strip()?.querySelector('.sw-sel-n')?.textContent ?? '', 'the item that moved leaves').not.toContain('Plum Jam');
            expect(strip()?.querySelector('.sw-sel-n')?.textContent, 'the rest stay').toContain('Rye Flour');
            expect(root.querySelector('[data-role="selection-total"]')?.textContent, 'in the unit they were chosen in').toContain('7,000');
            (root.querySelector('[data-role="window-pay"]') as HTMLButtonElement).click();
            await flush();
            expect(root.querySelector('[data-role="window-paying"]')?.getAttribute('data-pay-uri')).toContain('amount=7000.00');
        });
    });

    describe('a-double-tap-inside-the-grace-opens-nothing', () => {
        /**
         * CRITIC-CARRYOVER-4 item 1, through the real app (the sheet's half
         * is in render.test.ts under the same name). The first press of a
         * double tap inside the grace was absorbed and asked the app to
         * paint the sheet again — and the sheet it painted started with no
         * grace, so the second tap opened the new figure a few hundred
         * milliseconds after it appeared. The app carries the stamp across
         * that paint (`payChangedAt`).
         */
        it('the single sheet: both taps absorbed, and a press after the grace opens', async () => {
            const { root } = bootStall(phone(new Map([[A, XEC_OLD]])));
            await flush();
            (root.querySelector('[data-role="pay-open"]') as HTMLButtonElement).click();
            await flush();
            await republish([['c1'.repeat(32), encodeDescriptionHex(A, 'Plum Jam', { price: XEC_NEW })]]);
            await until(() => figureOf(root, 'pay') === '9,000');
            const sheet = root.querySelector('[data-role="pay"]');
            later(100);
            expect(press(root, 'pay'), 'the first tap').toBeUndefined();
            expect(root.querySelector('[data-role="pay"]'), 'the app painted the sheet again').not.toBe(sheet);
            later(250);
            expect(press(root, 'pay'), 'the second tap, on the sheet the app painted').toBeUndefined();
            later(PAY_RECOMPOSE_GRACE_MS);
            expect(press(root, 'pay'), 'after the grace').toContain('amount=9000.00');
        });

        it('Pay several: both taps absorbed, and a press after the grace opens', async () => {
            const { root } = bootStall(phone(new Map([[A, XEC_OLD], [B, XEC_B]])));
            await flush();
            (root.querySelector('[data-role="selection-toggle"]') as HTMLButtonElement).click();
            for (const tokenId of [A, B]) {
                [...root.querySelectorAll<HTMLButtonElement>('[data-role="selection-more"]')]
                    .find((b) => b.getAttribute('data-focus-key') === `selection-step:${tokenId}:more`)!
                    .click();
            }
            (root.querySelector('[data-role="pay-several-open"]') as HTMLButtonElement).click();
            await flush();
            await republish([
                ['c2'.repeat(32), encodeDescriptionHex(B, 'Rye Flour', { price: XEC_B })],
                ['c3'.repeat(32), encodeDescriptionHex(A, 'Plum Jam', { price: XEC_NEW })],
            ]);
            await until(() => figureOf(root, 'pay-several') === '16,000');
            later(100);
            expect(press(root, 'pay-several'), 'the first tap').toBeUndefined();
            later(250);
            expect(press(root, 'pay-several'), 'the second tap').toBeUndefined();
            later(PAY_RECOMPOSE_GRACE_MS);
            expect(press(root, 'pay-several'), 'after the grace').toContain('amount=16000.00');
        });
    });

    describe('the-press-again-line-shows-only-over-a-pay-press-that-was-absorbed', () => {
        /**
         * CRITIC-CARRYOVER-4 item 4, through the real app (the sheet's half
         * is in render.test.ts under the same name). The refresh control's
         * ask came back after a re-read had taken an item out under it: the
         * sheet was handed back, and `onPayRecordMoved` defaulted to a Pay
         * press — so the sheet the app painted asked for the press again
         * although nobody had pressed Pay. The caller says now.
         */
        it('Pay several: the refresh control’s tail paints "check the total", never the press-again line', async () => {
            const RATE = 20_000_000n;
            const USD_A = { code: 'usd', exponent: 2, amount: 500n };
            const USD_B = { code: 'usd', exponent: 2, amount: 300n };
            priceControl.fetch = async (code) => (code === 'usd' ? RATE : undefined);
            const { root } = bootStall(phone(new Map([[A, USD_A], [B, USD_B]])));
            await flush();
            (root.querySelector('[data-role="selection-toggle"]') as HTMLButtonElement).click();
            for (const tokenId of [A, B]) {
                [...root.querySelectorAll<HTMLButtonElement>('[data-role="selection-more"]')]
                    .find((b) => b.getAttribute('data-focus-key') === `selection-step:${tokenId}:more`)!
                    .click();
            }
            (root.querySelector('[data-role="pay-several-open"]') as HTMLButtonElement).click();
            // The open's own rate has landed: the sheet composes, and is the
            // one the refresh control is pressed on.
            await until(() => root.querySelector('[data-role="pay-several"] [data-role="pay-cashtab"]') !== null);
            const sheet = root.querySelector('[data-role="pay-several"]');
            expect(root.querySelector('[data-role="pay-several"] [data-role="pay-cashtab"]'), 'composed').not.toBeNull();
            let release!: () => void;
            const gate = new Promise<void>((resolve) => {
                release = resolve;
            });
            priceControl.fetch = async (code) => {
                await gate;
                return code === 'usd' ? RATE : undefined;
            };
            (root.querySelector('[data-role="pay-several"] [data-role="pay-refresh"]') as HTMLButtonElement).click();
            await republish([
                ['c4'.repeat(32), encodeDescriptionHex(B, 'Rye Flour', { price: USD_B })],
                ['c5'.repeat(32), encodeRemovalHex(A)],
            ]);
            await until(() => (root.querySelector('[data-role="pay-several-dropped"]')?.textContent ?? '').includes('Plum Jam'));
            expect(root.querySelector('[data-role="pay-several"]'), 'recomposed in place').toBe(sheet);
            release();
            await until(() => root.querySelector('[data-role="pay-several"]') !== sheet);
            const dropped = root.querySelector('[data-role="pay-several"] [data-role="pay-several-dropped"]')?.textContent;
            expect(root.querySelector('[data-role="pay-several"]'), 'handed back and painted again').not.toBe(sheet);
            expect(viewOf(root)?.payRecordMovedUnpressed, 'no Pay press did it').toBe(true);
            expect(dropped).toBe(selectionDroppedCheck('Plum Jam', 1));
        });
    });
});

describe('the-taken-out-words-are-in-every-taken-out-sentence', () => {
    it('reads both surfaces', () => {
        expect(SELECTION_DROPPED).toContain(DROPPED_WORDS);
        expect(selectionDroppedItems('Plum Jam', 1)).toContain(DROPPED_WORDS);
        expect(selectionDroppedItems('Plum Jam and Rye Flour', 2)).toContain(DROPPED_WORDS);
    });
});
