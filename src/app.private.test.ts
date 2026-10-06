// @vitest-environment happy-dom
import { encodeCashAddress } from 'ecashaddrjs';
import { shaRmd160, toHex } from 'ecash-lib';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DUST_SATS } from './domain/money';
import { encodeManifestHex } from './domain/manifest';
import type { StallView } from './domain/state';
import type { ChainTx, HistoryPage } from './net/chain';
import { p2pkhOutputScript } from './net/script';
import { stallPath } from './domain/route';

/**
 * The paid gate through the app (step 8b2, the step-8 critic's item 3), in a
 * build that carries the tracked private-look fixture — the module a build
 * hands the app when it selects `layout/fixture-private-looks` at
 * `preview`, mocked for this whole file because a vitest run never selects
 * one (`scripts/private-looks-build.mjs`), and because a mock planted after
 * the app's network layer loaded would leave the record decoded against the
 * public table. The chain is a fake, as in `app.live.test.ts`, cut to what
 * the live settings road and the holdings read ask.
 */
vi.mock('virtual:stall-private-looks', async () =>
    (await import('../layout/fixturePrivateLooks')).fixturePrivateLooksModule(),
);

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

function p2pkhScriptSig(pk: Uint8Array): string {
    const sig = new Uint8Array(71).fill(0x30);
    const script = new Uint8Array(1 + sig.length + 1 + pk.length);
    script[0] = sig.length;
    script.set(sig, 1);
    script[1 + sig.length] = pk.length;
    script.set(pk, 2 + sig.length);
    return toHex(script);
}

const chain = {
    addressTxs: [] as ChainTx[],
    txs: new Map<string, ChainTx>(),
    utxos: [] as { token?: { tokenId?: string } }[],
    /** A holdings read that throws: the view keeps the set it had, and the settings road's own `worn` stands. */
    utxosThrow: false,
};

const fakeChronik = {
    address() {
        return {
            history: async (): Promise<HistoryPage> => ({ txs: chain.addressTxs, numPages: 1, numTxs: chain.addressTxs.length }),
            utxos: async () => {
                if (chain.utxosThrow) {
                    throw new Error('no index answered');
                }
                return { utxos: chain.utxos };
            },
        };
    },
    lokadId() {
        return { history: async (): Promise<HistoryPage> => ({ txs: [], numPages: 1, numTxs: 1_000_000 }) };
    },
    async tx(txid: string): Promise<ChainTx> {
        const found = chain.txs.get(txid);
        if (found === undefined) {
            throw new Error('not found');
        }
        return found;
    },
    async token(): Promise<unknown> {
        throw new Error('no genesis here');
    },
};

type Hooks = { onBurst?: (txids: readonly string[]) => void; onReestablished?: () => void };
const watches: { hooks: Hooks }[] = [];

vi.mock('./net', async (importOriginal) => ({
    ...(await importOriginal<typeof import('./net')>()),
    createChronik: () => fakeChronik,
    agoraOfferReader: () => ({}) as never,
    loadOffers: async () => ({ kind: 'empty' as const }),
}));
vi.mock('./net/live', async (importOriginal) => ({
    ...(await importOriginal<typeof import('./net/live')>()),
    watchStall: (_chronik: unknown, _stall: unknown, hooks: Hooks = {}) => {
        watches.push({ hooks });
        return { close: () => undefined, pause: () => undefined, resume: () => undefined };
    },
}));
vi.mock('./net/price', () => ({ fetchXecPrice: async () => undefined }));
vi.mock('./net/priceCheck', () => ({ fetchXecPriceCheck: async () => undefined }));

const painted = new WeakMap<HTMLElement, StallView>();
vi.mock('./ui', async (importOriginal) => {
    const real = await importOriginal<typeof import('./ui')>();
    return {
        ...real,
        renderStall: (root: HTMLElement, view: StallView, handlers: never) => {
            painted.set(root, view);
            return real.renderStall(root, view, handlers);
        },
    };
});

const { boot } = await import('./app');
const { THEME_NOT_UNLOCKED } = await import('./ui/copy');
const { mintedLookTokens } = await import('./domain/lookTable');

const running: Array<() => void> = [];
afterEach(() => {
    for (const stop of running.splice(0)) {
        stop();
    }
    document.body.replaceChildren();
});

async function flush(times = 8): Promise<void> {
    for (let i = 0; i < times; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 0));
    }
}

/** Boot a stall with no record, holding `held` already (an earlier holdings read). */
async function bootHolding(held: ReadonlySet<string> | undefined): Promise<HTMLElement> {
    window.history.replaceState(null, '', stallPath(PK));
    const root = document.createElement('div');
    document.body.append(root);
    running.push(
        boot(root, async () => ({
            view: {
                route: { kind: 'pubkey', pubkeyHex: PK, address: ADDR },
                fetch: { kind: 'empty' },
                overlay: { kind: 'idle' },
                address: ADDR,
                tokens: new Map(),
                ...(held === undefined ? {} : { heldTokens: held }),
            },
            offers: [],
            pubkeyHex: PK,
        })),
    );
    await flush();
    return root;
}

/** A settings record this stall signed, naming the fixture look with every flag set, on the chain and announced. */
async function publishLockedRecord(): Promise<void> {
    const hex = encodeManifestHex('Locked look', 0x04, 0xffff)!;
    const record: ChainTx = {
        txid: '12'.repeat(32),
        block: { height: 800_000 },
        inputs: [{ inputScript: p2pkhScriptSig(PK_BYTES), outputScript: STALL_SCRIPT }],
        outputs: [{ outputScript: `6a${hex}` }, { outputScript: STALL_SCRIPT, sats: DUST_SATS }],
    };
    chain.addressTxs = [record];
    chain.txs.set(record.txid, record);
    watches.at(-1)!.hooks.onBurst?.([record.txid]);
    await flush();
}

function expectLocked(root: HTMLElement): void {
    const view = painted.get(root)!;
    expect(view.recordTheme?.id, 'the record names the fixture look').toBe(0x04);
    expect(view.recordTheme?.known, 'which this build carries').toBe(true);
    expect(view.heldTokens?.has('f1'.repeat(32)), 'the stall holds its tokens').toBe(true);
    expect(view.worn).toEqual([]);
    const stall = root.querySelector('.stall') as HTMLElement;
    expect(stall.classList.contains('t-modern')).toBe(true);
    expect(stall.classList.contains('t-fixture-private')).toBe(false);
    expect([...stall.classList].filter((cls) => cls.startsWith('att-'))).toEqual([]);
    expect(root.textContent).toContain(THEME_NOT_UNLOCKED);
}

/**
 * A settings record naming a paid look this build carries, with every flag
 * set, on a stall whose address holds every token the merged catalogue can
 * be entitled by — the look's own decoration and mood, and every shipped
 * one — wears nothing on the live road and after the holdings read: the
 * look's own rows, mood included, and the default's, whose bits those flags
 * would name if read against the wrong table. Step 8 licenses no paid look.
 * Each case holds one road: proved red by restoring 8b1's
 * `wornForLook(manifest.theme.id, …)` in `applyManifest` (the first) and
 * `wornForLook(themeId, …)` in `refreshHoldings` (the second). The full
 * load's own site is held by `a-full-load-wears-nothing-it-cannot-prove` and
 * `no-app-site-wears-a-look-around-the-gate`.
 */
describe('an-unlicensed-look-wears-none-of-its-own-rows', () => {
    it('wears nothing from the settings road, the holdings read failing behind it', async () => {
        // The stall already holds every token (an earlier read); the read the
        // record wakes fails, so what stands is the settings road's own worn
        // set (`applyManifest`), not the holdings road's.
        const root = await bootHolding(mintedLookTokens());
        chain.utxosThrow = true;
        await publishLockedRecord();
        expectLocked(root);
    });

    it('wears nothing after the holdings read answers, and after one that lands later', async () => {
        chain.utxosThrow = false;
        const root = await bootHolding(undefined);
        chain.utxos = [...mintedLookTokens()].map((tokenId) => ({ token: { tokenId } }));
        await publishLockedRecord();
        expectLocked(root);
        watches.at(-1)!.hooks.onReestablished?.();
        await flush();
        expectLocked(root);
    });
});

/**
 * A locked look is never asked for, on any road (CRITIC-STEP-8D2 item 1):
 * every road the app takes to a record's look asks for the sheet of the
 * row the gate chose (`sheetForLook`), and under a paid look this stall
 * holds no licence for that is the default, a shipped look in the entry CSS
 * — so no road loads the locked look's sheet, and no first paint waits for
 * it. Held over the real loader and the real `loadCurrent`, on a full load,
 * a wall run past three heartbeats, a stream overlay run past three of its
 * retries, and a live record naming the locked look; the page's head records
 * every link and connects none. Red: the gate bypassed in `sheetForLook`
 * (the full load asks, and holds its first paint), and a boot prefetch of
 * every worn-only sheet on the wall and the overlay (the plan's §3 bullet,
 * not built — its sheet would reach every wall).
 */
const { resetLookSheetsForTests } = await import('./ui/lookSheets');
const { WINDOW_BEAT_MS } = await import('./app');

describe('a-locked-look-is-never-asked-for-on-any-road', () => {
    /** The overlay's failure retry (`BROADCAST_RETRY_MS` in `app.ts`), which its sheet retry starts from. */
    const BROADCAST_RETRY_MS = 30_000;
    let restore: (() => void) | undefined;

    /** The page's head, recording: every link the app appends, none connected. */
    function holdLinks(): () => Element[] {
        resetLookSheetsForTests(document);
        const made: Element[] = [];
        const append = vi.spyOn(document.head, 'append').mockImplementation((...nodes) => {
            made.push(...nodes.filter((node): node is Element => node instanceof Element));
        });
        restore = () => {
            append.mockRestore();
            resetLookSheetsForTests(document);
        };
        return () => [...made];
    }

    afterEach(() => {
        restore?.();
        restore = undefined;
        vi.useRealTimers();
        chain.addressTxs = [];
        chain.txs.clear();
        chain.utxos = [];
    });

    /** The locked record on the address, as the real loader reads it. */
    function lockedOnChain(): void {
        const hex = encodeManifestHex('Locked look', 0x04, 0xffff)!;
        const record: ChainTx = {
            txid: '61'.repeat(32),
            block: { height: 800_000 },
            inputs: [{ inputScript: p2pkhScriptSig(PK_BYTES), outputScript: STALL_SCRIPT }],
            outputs: [{ outputScript: `6a${hex}` }, { outputScript: STALL_SCRIPT, sats: DUST_SATS }],
        };
        chain.addressTxs = [record];
        chain.txs.set(record.txid, record);
        chain.utxos = [...mintedLookTokens()].map((tokenId) => ({ token: { tokenId } }));
    }

    function bootAt(path: string): HTMLElement {
        window.history.replaceState(null, '', path);
        const root = document.createElement('div');
        document.body.append(root);
        running.push(boot(root));
        return root;
    }

    it('asks for no sheet on a full load, and holds no first paint for one', async () => {
        const links = holdLinks();
        lockedOnChain();
        const root = bootAt(stallPath(PK));
        await flush();
        expect(painted.get(root)?.fetch?.kind, 'the first paint was not held').not.toBe('opening');
        expectLocked(root);
        expect(links()).toEqual([]);
    });

    it('asks for no sheet on a wall, beat after beat, nor on an overlay, retry after retry', async () => {
        vi.useFakeTimers();
        const links = holdLinks();
        lockedOnChain();
        const wall = bootAt(`${stallPath(PK)}?view=window&mode=cycle`);
        await vi.advanceTimersByTimeAsync(WINDOW_BEAT_MS * 3 + 1_000);
        expect(wall.querySelector('.stall.shop-window'), 'a wall').not.toBeNull();
        running.pop()!();
        document.body.replaceChildren();
        const overlay = bootAt(`${stallPath(PK)}?view=broadcast`);
        await vi.advanceTimersByTimeAsync(BROADCAST_RETRY_MS * 3 + 1_000);
        expect(overlay.querySelector('.stall.broadcast'), 'an overlay').not.toBeNull();
        expect(links()).toEqual([]);
    });

    it('asks for no sheet when a live record names the locked look', async () => {
        const links = holdLinks();
        chain.utxosThrow = false;
        chain.utxos = [...mintedLookTokens()].map((tokenId) => ({ token: { tokenId } }));
        const root = await bootHolding(mintedLookTokens());
        await publishLockedRecord();
        expectLocked(root);
        expect(links()).toEqual([]);
    });
});
