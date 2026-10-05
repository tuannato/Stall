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
    expect(view.theme?.id, 'the record names the fixture look').toBe(0x04);
    expect(view.theme?.known, 'which this build carries').toBe(true);
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
