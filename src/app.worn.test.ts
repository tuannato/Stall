// @vitest-environment happy-dom
import { encodeCashAddress } from 'ecashaddrjs';
import { fromHex, shaRmd160, toHex } from 'ecash-lib';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DUST_SATS } from './domain/money';
import { encodeManifestHex } from './domain/manifest';
import type { StallView } from './domain/state';
import type { ChainTx, HistoryPage } from './net/chain';
import { p2pkhOutputScript } from './net/script';
import { stallPath } from './domain/route';

/**
 * The hold before a worn-only look paints, through the app (step 8d2;
 * STEP-8-PLAN §3 and its "v2 after the critic"): the first paint, a record
 * that moves to such a look live, the failure path, and the unattended
 * screens' capped retry. A record road that puts a private look on screen
 * exists only for a look that is free or licensed, and step 8 has neither —
 * every reserved id is paid and no stall is licensed (`paintableLook`) — so
 * this file plants the theme table with the tracked fixture's id FREE
 * (`FREE_PRIVATE_LOOK_IDS`, the owner's list for a free private look): the
 * same build carries it, the gate lets it through, and its sheet is its own
 * file. Nothing here changes the public lists; `theme-table-ids-are-pinned`
 * holds those.
 *
 * The page's sheets are held rather than sent: the head records every link
 * the loader appends and connects none (a connected stylesheet link is a
 * request, `no-test-reaches-the-network`), and each test answers a link as a
 * browser would — `load` with the sheet, or `error`.
 */
vi.mock('virtual:stall-private-looks', async () =>
    (await import('../layout/fixturePrivateLooks')).fixturePrivateLooksModule(),
);
vi.mock('./domain/theme', async (importOriginal) => ({
    ...(await importOriginal<typeof import('./domain/theme')>()),
    PAID_LOOK_IDS: Object.freeze([]),
    FREE_PRIVATE_LOOK_IDS: Object.freeze([0x04]),
}));

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
    /** A holdings read that throws: the view keeps the worn set the settings road wrote. */
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

/**
 * What each measure of a paint saw (`a-record-look-is-measured-only-under-its-own-sheet`):
 * the ticker's pass and the wall's payment lines, recorded as they run —
 * whether the tree wore the fixture look, and where its sheet stood.
 */
const measures: { what: string; look: boolean; sheet: string | undefined }[] = [];
const seen = (what: string, root: ParentNode): void => {
    const stall = (root as Element).querySelector?.('.stall') ?? null;
    measures.push({
        what,
        look: stall?.classList.contains('t-fixture-private') === true,
        sheet: sheetStateNow(),
    });
};
let sheetStateNow: () => string | undefined = () => undefined;
vi.mock('./ui/broadcast', async (importOriginal) => {
    const real = await importOriginal<typeof import('./ui/broadcast')>();
    return {
        ...real,
        armTicker: (root: ParentNode, ...rest: [number?]) => {
            seen('ticker', root);
            return real.armTicker(root, ...rest);
        },
    };
});
vi.mock('./ui/window', async (importOriginal) => {
    const real = await importOriginal<typeof import('./ui/window')>();
    return {
        ...real,
        sayHiddenPayLines: (root: ParentNode) => {
            seen('pay lines', root);
            real.sayHiddenPayLines(root);
        },
    };
});

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

const { boot, WINDOW_BEAT_MS } = await import('./app');
const copy = await import('./ui/copy');
const { decodeLook, mintedLookTokens, paintableLook } = await import('./domain/lookTable');
const { LOOK_SHEET_PROPERTY, LOOK_SHEET_WAIT_MS, lookSheetState, resetLookSheetsForTests } = await import(
    './ui/lookSheets'
);
const { resetMarqueesForTests, setMarqueeMeasure } = await import('./ui/marquee');
const { fixturePrivateLooks } = await import('../layout/fixturePrivateLooks');

const FIXTURE_ID = 0x04;
/** The overlay's failure retry (`BROADCAST_RETRY_MS` in `app.ts`), which the sheet retry rides. */
const BROADCAST_RETRY_MS = 30_000;

const running: Array<() => void> = [];
let restoreHead: (() => void) | undefined;
afterEach(() => {
    for (const stop of running.splice(0)) {
        stop();
    }
    restoreHead?.();
    restoreHead = undefined;
    vi.useRealTimers();
    document.body.replaceChildren();
    chain.addressTxs = [];
    chain.txs.clear();
    chain.utxos = [];
    chain.utxosThrow = false;
});

/**
 * Hold the page's sheets: every link the loader appends is kept, none
 * connected. `made` is every link ever appended, in order; `current` the ones
 * still on the page (a retry removes the failed one).
 */
function holdSheets(): { current: () => HTMLLinkElement[]; made: () => HTMLLinkElement[] } {
    resetLookSheetsForTests(document);
    const holder = document.createElement('div');
    const made: HTMLLinkElement[] = [];
    const append = vi.spyOn(document.head, 'append').mockImplementation((...nodes) => {
        for (const node of nodes) {
            if (node instanceof HTMLLinkElement) {
                made.push(node);
            }
        }
        holder.append(...nodes);
    });
    restoreHead = () => {
        append.mockRestore();
        resetLookSheetsForTests(document);
    };
    return { current: () => [...holder.querySelectorAll('link')], made: () => [...made] };
}

/** Answer `link` as a browser would: `load` with the fixture's sheet, or `error`. */
function answer(link: HTMLLinkElement, how: 'sheet' | 'error'): void {
    if (how === 'error') {
        link.dispatchEvent(new Event('error'));
        return;
    }
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(`.t-fixture-private { ${LOOK_SHEET_PROPERTY}: t-fixture-private; }`);
    Object.defineProperty(link, 'sheet', { value: sheet, configurable: true });
    link.dispatchEvent(new Event('load'));
}

async function flush(times = 8): Promise<void> {
    for (let i = 0; i < times; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 0));
    }
}

/** A stall whose record names the fixture look — free in this file — with its trim and its mood, both held. */
function recordView(over: Partial<StallView> = {}): StallView {
    const theme = decodeLook(FIXTURE_ID);
    const held = mintedLookTokens();
    return {
        route: { kind: 'pubkey', pubkeyHex: PK, address: ADDR },
        fetch: { kind: 'empty' },
        overlay: { kind: 'idle' },
        address: ADDR,
        tokens: new Map(),
        stallName: 'Ink stall',
        recordTheme: theme,
        recordFlags: 0b11,
        heldTokens: held,
        worn: paintableLook(theme, 0b11, held).worn,
        ...over,
    };
}

function mount(path: string, view: () => StallView): HTMLElement {
    window.history.replaceState(null, '', path);
    const root = document.createElement('div');
    document.body.append(root);
    running.push(boot(root, async () => ({ view: view(), offers: [], pubkeyHex: PK })));
    return root;
}

const stallOf = (root: HTMLElement) => root.querySelector('.stall') as HTMLElement;
const lookOf = (root: HTMLElement) => [...stallOf(root).classList].filter((cls) => cls.startsWith('t-'));
const decorOf = (root: HTMLElement) => [...stallOf(root).classList].filter((cls) => cls.startsWith('att-'));

/**
 * The first paint of a stall in a worn-only look waits for that look's sheet
 * — the opening screen stands meanwhile — and the look goes on, decorations
 * and all, in the paint after the sheet has loaded; nothing paints in the
 * look over the base sheets alone. Red: the hold in `refresh` removed (the
 * shop paints at once, held at the default by the renderer, and nothing
 * repaints it when the sheet lands).
 */
describe('a-stall-in-a-worn-only-look-paints-once-its-sheet-has-loaded', () => {
    it('keeps the opening screen until the sheet lands, then paints the look', async () => {
        const sheets = holdSheets();
        const root = mount(stallPath(PK), () => recordView());
        await flush();
        expect(painted.get(root)?.fetch?.kind, 'still opening').toBe('opening');
        expect(lookOf(root)).not.toContain('t-fixture-private');
        expect(sheets.current()).toHaveLength(1);
        answer(sheets.current()[0]!, 'sheet');
        await flush();
        expect(painted.get(root)?.fetch?.kind).toBe('empty');
        expect(lookOf(root)).toEqual(['t-fixture-private']);
        expect(decorOf(root)).toContain('att-fixture-trim');
        expect(root.textContent).not.toContain(copy.THEME_SHEET_UNLOADED);
    });

    it('paints the look through the app’s own loader, the record asked for as soon as it is read', async () => {
        // The real `loadCurrent`, over the fake chain: the record is on the
        // address, and the sheet it names is asked for by the load.
        const sheets = holdSheets();
        const hex = encodeManifestHex('Ink stall', FIXTURE_ID, 0b11)!;
        const record: ChainTx = {
            txid: '21'.repeat(32),
            block: { height: 800_000 },
            inputs: [{ inputScript: p2pkhScriptSig(PK_BYTES), outputScript: STALL_SCRIPT }],
            outputs: [{ outputScript: `6a${hex}` }, { outputScript: STALL_SCRIPT, sats: DUST_SATS }],
        };
        chain.addressTxs = [record];
        chain.txs.set(record.txid, record);
        chain.utxos = [...mintedLookTokens()].map((tokenId) => ({ token: { tokenId } }));
        window.history.replaceState(null, '', stallPath(PK));
        const root = document.createElement('div');
        document.body.append(root);
        running.push(boot(root));
        await flush();
        expect(sheets.made()).toHaveLength(1);
        expect(lookOf(root)).not.toContain('t-fixture-private');
        answer(sheets.current()[0]!, 'sheet');
        await flush();
        expect(painted.get(root)?.stallName).toBe('Ink stall');
        expect(lookOf(root)).toEqual(['t-fixture-private']);
        expect(sheets.made(), 'one link for the page').toHaveLength(1);
    });
});

/**
 * A worn-only look whose sheet does not load — an error, or no answer within
 * `LOOK_SHEET_WAIT_MS` — paints the default wearing nothing (none of its own
 * rows, none of the default's) and says so in words about this page, never
 * the unknown-look or unreadable-record sentence. Red: the failure sentence
 * dropped; the hold's wait with no clock (the opening screen for good).
 */
describe('a-look-sheet-that-does-not-load-paints-the-default-and-says-so', () => {
    it('paints the default and says so when the sheet fails', async () => {
        const sheets = holdSheets();
        const root = mount(stallPath(PK), () => recordView());
        await flush();
        answer(sheets.current()[0]!, 'error');
        await flush();
        expect(painted.get(root)?.fetch?.kind).toBe('empty');
        expect(lookOf(root)).toEqual(['t-modern']);
        expect(decorOf(root)).toEqual([]);
        expect(root.textContent).toContain(copy.THEME_SHEET_UNLOADED);
        expect(root.textContent).not.toContain(copy.THEME_UNKNOWN);
        expect(root.textContent).not.toContain(copy.SETTINGS_UNREADABLE);
    });

    it('paints the default and says so when the sheet does not answer within the wait', async () => {
        vi.useFakeTimers();
        holdSheets();
        const root = mount(stallPath(PK), () => recordView());
        await vi.advanceTimersByTimeAsync(LOOK_SHEET_WAIT_MS - 1);
        expect(painted.get(root)?.fetch?.kind, 'still waiting').toBe('opening');
        await vi.advanceTimersByTimeAsync(1);
        expect(painted.get(root)?.fetch?.kind).toBe('empty');
        expect(lookOf(root)).toEqual(['t-modern']);
        expect(root.textContent).toContain(copy.THEME_SHEET_UNLOADED);
    });
});

/**
 * A sheet that lands after the page gave up on it changes nothing: the page
 * painted the default and said so, and a look swapping itself in under a
 * reader a moment later is the flash the wait exists to prevent. A later
 * load of the same stall keeps the failure (it is the page's, for its life).
 * Red: the loader answering an entry that is no longer pending.
 */
describe('a-late-sheet-changes-nothing-on-the-page', () => {
    it('keeps the default after a late answer, and on the next load', async () => {
        vi.useFakeTimers();
        const sheets = holdSheets();
        const root = mount(stallPath(PK), () => recordView());
        await vi.advanceTimersByTimeAsync(LOOK_SHEET_WAIT_MS);
        expect(lookOf(root)).toEqual(['t-modern']);
        answer(sheets.current()[0]!, 'sheet');
        await vi.advanceTimersByTimeAsync(0);
        expect(lookOf(root)).toEqual(['t-modern']);
        window.dispatchEvent(new PopStateEvent('popstate'));
        await vi.advanceTimersByTimeAsync(0);
        expect(painted.get(root)?.fetch?.kind).toBe('empty');
        expect(lookOf(root)).toEqual(['t-modern']);
        expect(root.textContent).toContain(copy.THEME_SHEET_UNLOADED);
        expect(sheets.made(), 'an ordinary page does not ask again').toHaveLength(1);
    });
});

/** A settings record this stall signed, on the chain and announced on the live road. */
async function publish(name: string, themeId: number, txidByte: string): Promise<void> {
    const hex = encodeManifestHex(name, themeId, 0b11)!;
    const record: ChainTx = {
        txid: txidByte.repeat(32),
        block: { height: 800_000 },
        inputs: [{ inputScript: p2pkhScriptSig(PK_BYTES), outputScript: STALL_SCRIPT }],
        outputs: [{ outputScript: `6a${hex}` }, { outputScript: STALL_SCRIPT, sats: DUST_SATS }],
    };
    chain.addressTxs = [record];
    chain.txs.set(record.txid, record);
    watches.at(-1)!.hooks.onBurst?.([record.txid]);
    await flush();
}

/**
 * Only the look waits (STEP-8-PLAN §3, "Live change"): a record that moves a
 * stall to a worn-only look applies its name at once, keeps the look on
 * screen as it was — never the default in between — and puts the new look on
 * once its sheet has loaded; a newer record landing meanwhile wins. Red: the
 * whole record applied at once (the default flashes in), or the wait not
 * numbered (the older look put on over the newer record).
 */
describe('a-record-that-moves-to-a-worn-only-look-repaints-once-its-sheet-loads', () => {
    // Neo wearing its crest (bit 0): the new record's flags (bits 0 and 1)
    // would put Neo's rain on too, read against the wrong table.
    const neo = () =>
        recordView({
            stallName: 'Before',
            recordTheme: decodeLook(0x02),
            recordFlags: 0b1,
            worn: paintableLook(decodeLook(0x02), 0b1, mintedLookTokens()).worn,
        });

    it('applies the name now and the look once its sheet has loaded', async () => {
        const sheets = holdSheets();
        chain.utxos = [...mintedLookTokens()].map((tokenId) => ({ token: { tokenId } }));
        const root = mount(stallPath(PK), neo);
        await flush();
        expect(lookOf(root)).toEqual(['t-neo']);
        const decorBefore = decorOf(root);
        expect(decorBefore, 'Neo wears its crest').toEqual(['att-hum']);
        // The holdings read the record wakes fails, so what stands during
        // the wait is the settings road's own worn set, not a holdings
        // answer that recomputes it.
        chain.utxosThrow = true;
        await publish('After', FIXTURE_ID, '31');
        expect(painted.get(root)?.stallName, 'the name applies at once').toBe('After');
        expect(lookOf(root), 'the look stays as it was').toEqual(['t-neo']);
        expect(decorOf(root), 'and its decorations, read against its own flags').toEqual(decorBefore);
        expect(sheets.current()).toHaveLength(1);
        answer(sheets.current()[0]!, 'sheet');
        await flush();
        expect(lookOf(root)).toEqual(['t-fixture-private']);
        expect(decorOf(root)).toContain('att-fixture-trim');
        expect(painted.get(root)?.stallName).toBe('After');
    });

    it('lets a newer record win over a look still waiting for its sheet', async () => {
        const sheets = holdSheets();
        const root = mount(stallPath(PK), neo);
        await flush();
        await publish('After', FIXTURE_ID, '32');
        await publish('Later', 0x03, '33');
        expect(painted.get(root)?.stallName).toBe('Later');
        expect(lookOf(root)).toEqual(['t-rural']);
        answer(sheets.current()[0]!, 'sheet');
        await flush();
        expect(lookOf(root), 'the newer record stands').toEqual(['t-rural']);
        expect(painted.get(root)?.stallName).toBe('Later');
    });
});

/**
 * A look waiting for its sheet belongs to the stall whose record named it
 * (CRITIC-STEP-8D2 item 2): a reader who leaves for another stall before the
 * sheet lands sees that stall's look, never the first one's — its look, its
 * decorations and its record read back are its own, and its seller
 * republishing signs their own. Red: the wait's generation check dropped
 * (the first stall's look put on the second).
 */
describe('a-look-waiting-for-its-sheet-never-lands-on-another-stall', () => {
    it('drops the wait when the reader goes to another stall', async () => {
        const sheets = holdSheets();
        const PK_B = `03${'22'.repeat(32)}`;
        const ADDR_B = encodeCashAddress('ecash', 'p2pkh', toHex(shaRmd160(fromHex(PK_B))));
        const other = (): StallView => ({
            route: { kind: 'pubkey', pubkeyHex: PK_B, address: ADDR_B },
            fetch: { kind: 'empty' },
            overlay: { kind: 'idle' },
            address: ADDR_B,
            tokens: new Map(),
            stallName: 'Other stall',
            recordTheme: decodeLook(0x03),
            recordFlags: 0,
            heldTokens: new Set(),
            worn: [],
        });
        const first = (): StallView =>
            recordView({ stallName: 'Before', recordTheme: decodeLook(0x02), recordFlags: 0, worn: [] });
        window.history.replaceState(null, '', stallPath(PK));
        const root = document.createElement('div');
        document.body.append(root);
        running.push(
            boot(root, async () =>
                location.pathname === stallPath(PK_B)
                    ? { view: other(), offers: [], pubkeyHex: PK_B }
                    : { view: first(), offers: [], pubkeyHex: PK },
            ),
        );
        await flush();
        await publish('After', FIXTURE_ID, '51');
        expect(painted.get(root)?.stallName).toBe('After');
        expect(sheets.current(), 'the first stall’s look is waiting for its sheet').toHaveLength(1);
        window.history.pushState(null, '', stallPath(PK_B));
        window.dispatchEvent(new PopStateEvent('popstate'));
        await flush();
        expect(painted.get(root)?.stallName).toBe('Other stall');
        expect(lookOf(root)).toEqual(['t-rural']);
        answer(sheets.current()[0]!, 'sheet');
        await flush();
        expect(lookOf(root), 'the second stall keeps its own look').toEqual(['t-rural']);
        expect(painted.get(root)?.recordTheme?.id).toBe(0x03);
        expect(painted.get(root)?.route).toEqual({ kind: 'pubkey', pubkeyHex: PK_B, address: ADDR_B });
        expect(decorOf(root)).toEqual([]);
    });
});

/**
 * The unattended screens retry a failed sheet with a fresh link, by rate and
 * never stopping (CRITIC-STEP-8 item 18, CRITIC-STEP-8D2 item 3): a wall on
 * its heartbeat — the beat paints at once, in the default, never held for the
 * retry, and paints again in the look when the link lands — and a stream
 * overlay on its own timer, 30 s doubling to ten minutes. The failed link is
 * removed first, so the page holds one. A tab older than a deploy asks for a
 * hash the edge no longer has, which no retry heals; it paints the default
 * until reloaded. Neither screen says the failure in words: the wall says
 * none of the sign's notes, and a broadcast's failure paints no text. Red:
 * the retry dropped from the wall's refresh or the overlay's timer (the look
 * never comes back), a lifetime cap put back (the asking stops), the beat
 * held for its retry (the beat's paint waits on the link).
 */
describe('a-wall-retries-a-sheet-that-failed-on-its-heartbeat', () => {
    const WALL = `${stallPath(PK)}?view=window&mode=cycle`;
    const wallView = () =>
        recordView({ window: { show: 'listings', mode: 'cycle', payCode: true, turn: 'none', touch: false } });
    const OVERLAY = `${stallPath(PK)}?view=broadcast`;
    const overlayView = () =>
        recordView({
            broadcast: { preset: 'corner', mode: 'fixed', transparent: false, cards: 'listings', side: 'right', edge: 'bottom' },
        });

    it('paints a beat at once, and puts the look on the wall when the beat’s fresh link loads', async () => {
        vi.useFakeTimers();
        const sheets = holdSheets();
        // Each load names the stall afresh, so a paint shows which load it is.
        let loads = 0;
        const wall = mount(WALL, () => ({ ...wallView(), stallName: `Ink stall ${(loads += 1)}` }));
        await vi.advanceTimersByTimeAsync(0);
        answer(sheets.current()[0]!, 'error');
        await vi.advanceTimersByTimeAsync(0);
        expect(stallOf(wall).classList.contains('shop-window')).toBe(true);
        expect(lookOf(wall)).toEqual(['t-modern']);
        expect(wall.textContent).not.toContain(copy.THEME_SHEET_UNLOADED);
        const failed = sheets.current()[0]!;
        await vi.advanceTimersByTimeAsync(WINDOW_BEAT_MS);
        expect(painted.get(wall)?.stallName, 'the beat painted at once, its link still out').toBe('Ink stall 2');
        expect(lookOf(wall)).toEqual(['t-modern']);
        expect(sheets.current(), 'the failed link is gone, one fresh one in its place').toHaveLength(1);
        expect(sheets.current()[0]).not.toBe(failed);
        answer(sheets.current()[0]!, 'sheet');
        await vi.advanceTimersByTimeAsync(0);
        expect(lookOf(wall)).toEqual(['t-fixture-private']);
        expect(stallOf(wall).classList.contains('shop-window')).toBe(true);
    });

    it('asks again on every beat, never stopping, and never piles up links', async () => {
        vi.useFakeTimers();
        const sheets = holdSheets();
        const root = mount(WALL, wallView);
        await vi.advanceTimersByTimeAsync(0);
        const BEATS = 15;
        for (let beat = 0; beat < BEATS; beat += 1) {
            answer(sheets.current()[0]!, 'error');
            await vi.advanceTimersByTimeAsync(WINDOW_BEAT_MS);
            expect(sheets.current(), `beat ${beat + 1}: one link on the page`).toHaveLength(1);
        }
        expect(sheets.made(), 'the first ask and one fresh link a beat').toHaveLength(1 + BEATS);
        expect(lookOf(root)).toEqual(['t-modern']);
        // An outage that ends heals the wall on the next beat that loads.
        answer(sheets.current()[0]!, 'sheet');
        await vi.advanceTimersByTimeAsync(0);
        expect(lookOf(root)).toEqual(['t-fixture-private']);
    });

    it('puts the look on a stream overlay once its own retry loads, and says nothing', async () => {
        vi.useFakeTimers();
        const sheets = holdSheets();
        const root = mount(OVERLAY, overlayView);
        await vi.advanceTimersByTimeAsync(0);
        answer(sheets.current()[0]!, 'error');
        await vi.advanceTimersByTimeAsync(0);
        expect(stallOf(root).classList.contains('broadcast')).toBe(true);
        expect(lookOf(root)).toEqual(['t-modern']);
        expect(root.textContent).not.toContain(copy.THEME_SHEET_UNLOADED);
        await vi.advanceTimersByTimeAsync(BROADCAST_RETRY_MS);
        expect(sheets.current()).toHaveLength(1);
        expect(sheets.made()).toHaveLength(2);
        answer(sheets.current()[0]!, 'sheet');
        await vi.advanceTimersByTimeAsync(0);
        expect(stallOf(root).classList.contains('broadcast')).toBe(true);
        expect(lookOf(root)).toEqual(['t-fixture-private']);
    });

    it('retries on a stream overlay a sheet that failed on the live road', async () => {
        vi.useFakeTimers();
        const sheets = holdSheets();
        const root = mount(OVERLAY, () => ({ ...overlayView(), recordTheme: decodeLook(0x02), recordFlags: 0, worn: [] }));
        await vi.advanceTimersByTimeAsync(0);
        expect(lookOf(root)).toEqual(['t-neo']);
        const hex = encodeManifestHex('Moved', FIXTURE_ID, 0b11)!;
        const record: ChainTx = {
            txid: '41'.repeat(32),
            block: { height: 800_000 },
            inputs: [{ inputScript: p2pkhScriptSig(PK_BYTES), outputScript: STALL_SCRIPT }],
            outputs: [{ outputScript: `6a${hex}` }, { outputScript: STALL_SCRIPT, sats: DUST_SATS }],
        };
        chain.addressTxs = [record];
        chain.txs.set(record.txid, record);
        watches.at(-1)!.hooks.onBurst?.([record.txid]);
        await vi.advanceTimersByTimeAsync(0);
        answer(sheets.current()[0]!, 'error');
        await vi.advanceTimersByTimeAsync(0);
        expect(lookOf(root), 'the default, the look having failed').toEqual(['t-modern']);
        await vi.advanceTimersByTimeAsync(BROADCAST_RETRY_MS);
        expect(sheets.made()).toHaveLength(2);
        answer(sheets.current()[0]!, 'sheet');
        await vi.advanceTimersByTimeAsync(0);
        expect(lookOf(root)).toEqual(['t-fixture-private']);
    });

    it('backs the overlay off from 30 s, doubling to ten minutes, and never stops', async () => {
        vi.useFakeTimers();
        const sheets = holdSheets();
        mount(OVERLAY, overlayView);
        await vi.advanceTimersByTimeAsync(0);
        answer(sheets.current()[0]!, 'error');
        await vi.advanceTimersByTimeAsync(0);
        const waits = [30, 60, 120, 240, 480, 600, 600, 600, 600, 600, 600, 600].map((s) => s * 1_000);
        for (const [i, wait] of waits.entries()) {
            const before = sheets.made().length;
            await vi.advanceTimersByTimeAsync(wait - 1);
            expect(sheets.made().length, `retry ${i + 1} not before ${wait / 1_000} s`).toBe(before);
            await vi.advanceTimersByTimeAsync(1);
            expect(sheets.made().length, `retry ${i + 1} at ${wait / 1_000} s`).toBe(before + 1);
            expect(sheets.current()).toHaveLength(1);
            answer(sheets.current()[0]!, 'error');
            await vi.advanceTimersByTimeAsync(0);
        }
        expect(vi.getTimerCount(), 'still armed after an hour and more').toBeGreaterThan(0);
    });
});

/**
 * The overlay's sheet retry is a timer of the app's, so it goes with the app
 * and with a `refresh` (CRITIC-STEP-8D2 item 14): the teardown leaves none
 * armed and no link appears after it, and a `refresh` re-arms it from its
 * repaint rather than leaving the old one to fire beside the new one. Red:
 * the timer not cleared with the broadcast's (a link at the old time after a
 * refresh, and after the teardown).
 */
describe('an-overlays-sheet-retry-is-cleared-with-the-app', () => {
    const OVERLAY = `${stallPath(PK)}?view=broadcast`;
    const overlayView = () =>
        recordView({
            broadcast: { preset: 'corner', mode: 'fixed', transparent: false, cards: 'listings', side: 'right', edge: 'bottom' },
        });

    async function failedOverlay() {
        vi.useFakeTimers();
        const sheets = holdSheets();
        mount(OVERLAY, overlayView);
        await vi.advanceTimersByTimeAsync(0);
        answer(sheets.current()[0]!, 'error');
        await vi.advanceTimersByTimeAsync(0);
        return sheets;
    }

    it('leaves no retry armed, and asks for nothing, once the app is torn down', async () => {
        const sheets = await failedOverlay();
        expect(vi.getTimerCount(), 'a retry is armed').toBeGreaterThan(0);
        running.pop()!();
        expect(vi.getTimerCount()).toBe(0);
        await vi.advanceTimersByTimeAsync(BROADCAST_RETRY_MS * 40);
        expect(sheets.made()).toHaveLength(1);
    });

    it('re-arms on a refresh instead of firing the old timer beside a new one', async () => {
        const sheets = await failedOverlay();
        await vi.advanceTimersByTimeAsync(10_000);
        window.dispatchEvent(new PopStateEvent('popstate'));
        await vi.advanceTimersByTimeAsync(0);
        await vi.advanceTimersByTimeAsync(BROADCAST_RETRY_MS - 10_000);
        expect(sheets.made(), 'the old timer was cleared by the refresh').toHaveLength(1);
        await vi.advanceTimersByTimeAsync(10_000);
        expect(sheets.made(), 'the re-armed one fires').toHaveLength(2);
        expect(sheets.current()).toHaveLength(1);
    });
});

/**
 * Everything a paint measures off a record's worn-only look is measured
 * under that look's own sheet (CRITIC-STEP-8D1 item 6): the cut lines' runs,
 * the ticker's pass and the wall's payment lines are measured on the tree the
 * paint builds, and with the hold no paint puts the look on before its sheet
 * is ready — so none of them ever runs on a tree wearing the look while its
 * sheet is still on its way, and the paint after the sheet lands measures the
 * look. Held on the shop (the rows' marquees), the stream overlay (the
 * card's marquee, and the ticker's pass) and the wall (its marquees and its
 * payment lines), each measure recorded as it runs. Red: the app's hold
 * removed (the first paint goes ahead while the sheet is on its way, held at
 * the default by the renderer, and nothing paints again when it lands, so
 * the look is never measured). The renderer's own hold — what keeps a paint
 * made while a sheet is pending or failed off the look — is held by
 * `a-look-sheet-that-does-not-load-paints-the-default-and-says-so` and
 * `render.worn.test.ts`; on this road the app's wait alone keeps every paint
 * of the look after its sheet.
 */
describe('a-record-look-is-measured-only-under-its-own-sheet', () => {
    const TOKEN = 'cd'.repeat(32);
    const shop = (over: Partial<StallView> = {}) =>
        recordView({
            fetch: {
                kind: 'offers',
                offers: [
                    {
                        outpoint: { txid: 'ab'.repeat(32), outIdx: 0 },
                        tokenId: TOKEN,
                        atoms: 12n,
                        variant: 'PARTIAL',
                        askedSats: 120_000n,
                        askedAtoms: 1n,
                        priceNanoSatsPerAtom: 120_000n * 1_000_000_000n,
                    },
                ],
            },
            tokens: new Map([[TOKEN, { tokenId: TOKEN, name: 'A name far too long for its line', ticker: 'LONG', decimals: 0 }]]),
            ...over,
        });

    afterEach(() => {
        resetMarqueesForTests();
    });

    for (const [where, path, view, owed] of [
        ['the shop', stallPath(PK), () => shop(), ['marquee']],
        [
            'the stream overlay’s card',
            `${stallPath(PK)}?view=broadcast`,
            () =>
                shop({
                    broadcast: { preset: 'corner', mode: 'fixed', transparent: false, cards: 'listings', side: 'right', edge: 'bottom' },
                }),
            ['marquee'],
        ],
        [
            'the stream overlay’s ticker',
            `${stallPath(PK)}?view=broadcast&preset=ticker`,
            () =>
                shop({
                    broadcast: { preset: 'ticker', mode: 'fixed', transparent: false, cards: 'listings', side: 'right', edge: 'bottom' },
                }),
            ['ticker'],
        ],
        [
            'the wall',
            `${stallPath(PK)}?view=window&mode=cycle`,
            () => shop({ window: { show: 'listings', mode: 'cycle', payCode: true, turn: 'none', touch: false } }),
            ['marquee', 'pay lines'],
        ],
    ] as const) {
        it(`measures ${where} in the look only once its sheet is ready`, async () => {
            const sheets = holdSheets();
            const url = fixturePrivateLooks()[0]!.sheetUrl;
            sheetStateNow = () => lookSheetState(url, document);
            measures.length = 0;
            setMarqueeMeasure((node) => {
                measures.push({
                    what: 'marquee',
                    look: node.closest('.stall')?.classList.contains('t-fixture-private') === true,
                    sheet: sheetStateNow(),
                });
                return 0;
            });
            const root = mount(path, view);
            await flush();
            answer(sheets.current()[0]!, 'sheet');
            await flush();
            expect(lookOf(root)).toEqual(['t-fixture-private']);
            for (const what of owed) {
                const inLook = measures.filter((m) => m.what === what && m.look);
                expect(inLook.length, `${what}: the paint after the sheet landed measured the look`).toBeGreaterThan(0);
                expect(inLook.every((m) => m.sheet === 'ready'), `${what}: never in the look before its sheet`).toBe(true);
            }
        });
    }
});

/**
 * The door paints no stall's look and asks for no sheet (STEP-8-PLAN §3): a
 * build that carries a worn-only look costs the door nothing. The render
 * half — a door view that names the look as a record and a try-on — is
 * `render.private.test.ts`'s.
 */
describe('a-look-the-door-does-not-paint-costs-the-door-nothing', () => {
    it('opens the door through the app’s own loader and asks for no sheet', async () => {
        const sheets = holdSheets();
        window.history.replaceState(null, '', '/');
        const root = document.createElement('div');
        document.body.append(root);
        running.push(boot(root));
        await flush();
        expect(stallOf(root).classList.contains('door')).toBe(true);
        expect(sheets.made()).toEqual([]);
    });
});
