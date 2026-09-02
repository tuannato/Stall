// @vitest-environment happy-dom
import { encodeCashAddress } from 'ecashaddrjs';
import { shaRmd160, toHex } from 'ecash-lib';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STL1_HEX, encodeManifestHex } from './domain/manifest';
import { STLD_HEX, encodeDescriptionHex } from './domain/description';
import { DEFAULT_THEME_ID, NEO_CITY_THEME_ID } from './domain/theme';
import { MAX_STALL_EVENTS, type StallView } from './domain/state';
import type { ChainTx, HistoryPage } from './net/chain';
import { UNKNOWN_TXID } from './net/live';
import { p2pkhOutputScript } from './net/script';
import { stallPath } from './domain/route';
import {
    HOME_LEDE,
    OPENING_BODY,
    UNREACHABLE_BODY,
    UNRESOLVABLE_TITLE,
} from './ui/copy';

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
    utxos: [] as { token?: { tokenId?: string } }[],
    historyThrows: false,
    txThrows: false,
    utxosThrow: false,
    calls: { stl1: 0, stld: 0, addressHistory: 0, tx: 0, utxos: 0 },
    /** What the next live offer re-read answers. Empty when unset. */
    book: undefined as import('./domain/state').FetchStatus | undefined,
    /** A live re-read that throws rather than answering. */
    bookThrows: false,
};

function resetChain(): void {
    chain.addressTxs = [];
    chain.txs = new Map();
    chain.utxos = [];
    chain.historyThrows = false;
    chain.txThrows = false;
    chain.utxosThrow = false;
    chain.calls = { stl1: 0, stld: 0, addressHistory: 0, tx: 0, utxos: 0 };
    chain.book = undefined;
    chain.bookThrows = false;
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
            history: async (): Promise<HistoryPage> => {
                chain.calls.addressHistory += 1;
                if (chain.historyThrows) {
                    throw new Error('no index answered');
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
    async token(): Promise<never> {
        throw new Error('no genesis here');
    },
};

/** Every watch opened this session, so a close can be seen from outside. */
type OpenedWatch = {
    stall: { pubkeyHex?: string; hash?: string };
    hooks: {
        onChanged?: (trigger: import('./net/live').LiveTrigger) => void;
        onBurst?: (txids: readonly string[]) => void;
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
            if (chain.bookThrows) {
                throw new Error('index threw');
            }
            return chain.book ?? ({ kind: 'empty' as const });
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

vi.mock('./net/price', () => ({
    fetchXecPrice: async () => undefined,
}));

/**
 * The last view painted.
 *
 * The event ring is state nothing renders yet, so there is no text on screen to
 * read it back from. The real `renderStall` still runs — every other test in
 * this file asserts on the DOM it produces — and the view it was handed is
 * captured on the way through.
 */
const painted: { view?: StallView } = {};

vi.mock('./ui', async (importOriginal) => {
    const real = await importOriginal<typeof import('./ui')>();
    return {
        ...real,
        renderStall: (root: HTMLElement, view: StallView, handlers: never) => {
            painted.view = view;
            return real.renderStall(root, view, handlers);
        },
    };
});

const { boot } = await import('./app');
type State = import('./app').AppState;

/** Let the queued promise chains run. Several helpers await in sequence. */
async function flush(times = 8): Promise<void> {
    for (let i = 0; i < times; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 0));
    }
}

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
        outputs: opts.outputs.map((outputScript) => ({ outputScript })),
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

function bootStall(state: State): { root: HTMLElement; loads: number } {
    const root = document.createElement('div');
    const counter = { root, loads: 0 };
    boot(root, async () => {
        counter.loads += 1;
        return state;
    });
    return counter;
}

beforeEach(() => {
    window.history.replaceState(null, '', stallPath(PK));
    resetChain();
    watches.length = 0;
    painted.view = undefined;
    localStorage.clear();
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
                overlay: { kind: 'buy', outpoint: OFFER.outpoint },
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
        expect(root.textContent).toContain(UNRESOLVABLE_TITLE);

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
        expect(root.textContent).not.toContain(UNRESOLVABLE_TITLE);
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
        expect(root.textContent).toContain(UNRESOLVABLE_TITLE);
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
        expect(root.textContent).toContain(UNRESOLVABLE_TITLE);
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
        bootStall(stallEmpty());
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

        const events = painted.view?.events;
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
        bootStall(stallEmpty());
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

        const events = painted.view?.events ?? [];
        expect(events.filter((event) => event.txid === settingsTxid)).toHaveLength(1);
        expect(events, 'a confirmation is not a second event').toHaveLength(1);
    });

    it('starts a new ring when the visitor opens another stall', async () => {
        const { root } = bootStall(stallEmpty());
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
        expect(painted.view?.events?.length ?? 0, 'the payment was recorded').toBe(1);

        // These are transactions at one address. Carrying them to the next
        // stall would attribute one seller's traffic to another.
        window.history.pushState(null, '', stallPath('02' + 'bb'.repeat(32)));
        window.dispatchEvent(new PopStateEvent('popstate'));
        await flush(20);

        // **The last watch, not `watches[1]`.** `boot` never removes its
        // `popstate` listener, so every instance booted earlier in this file
        // refreshes on this event too and opens a watch of its own. Listeners
        // fire in registration order and this test booted last, so the watch it
        // owns is the one at the end — anything else asserts on another test's
        // app, which is how this test passed while proving nothing.
        const mine = watches.at(-1)!;

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
        mine.hooks.onBurst?.([second]);
        await flush(20);

        const events = painted.view?.events ?? [];
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
        expect(painted.view?.events?.length).toBe(1);
        const url = location.href;

        const toActivity = counter.root.querySelector(
            '[data-role="tab-activity"]',
        ) as HTMLButtonElement;
        expect(toActivity).not.toBeNull();
        toActivity.click();
        await flush();

        expect(counter.loads, 'a tab is a paint, not a load').toBe(1);
        expect(location.href, 'no navigation').toBe(url);
        expect(painted.view?.panel).toBe('activity');
        expect(painted.view?.events?.length, 'the ring survives').toBe(1);
        expect(watches[0]!.closed, 'the socket stays open').toBe(false);

        const toShop = counter.root.querySelector(
            '[data-role="tab-shop"]',
        ) as HTMLButtonElement;
        toShop.click();
        await flush();
        expect(painted.view?.panel).toBe('shop');
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
        bootStall(stallEmpty());
        await flush();
        watches[0]!.hooks.onReestablished?.();
        await flush();
        expect(painted.view?.activityGaps).toBe(1);
        chain.txThrows = true;
        watches[0]!.hooks.onBurst?.(['0b'.repeat(32)]);
        await flush();
        expect(painted.view?.activityGaps).toBe(2);
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
        bootStall(stallEmpty());
        await flush();
        const proof = publish(consumedTx('1a'.repeat(32)));
        watches[0]!.hooks.onBurst?.([proof]);
        await flush();
        // The ring named it for what the entries prove — never a sale.
        expect(painted.view?.events?.[0]?.book).toBe('consumed');

        chain.book = { kind: 'offers', offers: [OFFER] };
        watches[0]!.hooks.onChanged?.('message');
        await flush();
        expect(
            painted.view?.justChanged?.has(TOKEN),
            'a proven message re-read pulses the changed card',
        ).toBe(true);

        // Any later paint shows it consumed: the flourish never replays.
        watches[0]!.hooks.onBurst?.([
            publish(signedTx({ txid: '1b'.repeat(32), outputs: [STRANGER_SCRIPT] })),
        ]);
        await flush();
        expect(painted.view?.justChanged).toBeUndefined();
    });

    it('a-reconnect-read-does-not-animate-a-sale', async () => {
        bootStall(stallEmpty());
        await flush();
        watches[0]!.hooks.onBurst?.([publish(consumedTx('2a'.repeat(32)))]);
        await flush();
        chain.book = { kind: 'offers', offers: [OFFER] };
        // The same proof stands — but this read is a recheck, whose diff is
        // replica skew as often as news.
        watches[0]!.hooks.onChanged?.('recheck');
        await flush();
        expect(painted.view?.fetch?.kind, 'the book itself is applied').toBe('offers');
        expect(painted.view?.justChanged).toBeUndefined();
    });

    it('a-partial-refetch-that-lost-one-row-does-not-animate-a-clear', async () => {
        bootStall(stallEmpty());
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
            painted.view?.justChanged,
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
        expect(painted.view?.broadcast).toEqual({
            preset: 'corner',
            mode: 'rail',
            transparent: true,
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
        bootOverlay(stallOffers([OFFER, OFFER_B], { broadcastCursor: 1 }));
        await flush();
        expect(painted.view?.broadcastCursor).toBe(1);

        chain.book = { kind: 'offers', offers: [OFFER, OFFER_B] };
        watches[0]!.hooks.onChanged?.('recheck');
        await flush();
        expect(painted.view?.broadcastCursor, 'a same-size book leaves the cursor').toBe(
            1,
        );
        expect(painted.view?.broadcast).toEqual(BROADCAST_FIXED);
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
        bootOverlay(stallOffers([OFFER, OFFER_B, third], { broadcastCursor: 2 }));
        await flush();
        expect(painted.view?.broadcastCursor).toBe(2);

        chain.book = { kind: 'offers', offers: [OFFER, OFFER_B] };
        watches[0]!.hooks.onChanged?.('recheck');
        await flush();
        expect(painted.view?.broadcastCursor, '2 mod 2 is 0').toBe(0);
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
            painted.view?.justChanged?.has(TOKEN),
            'the shop flourish still names the token',
        ).toBe(true);
        expect(painted.view?.broadcastPulse, 'the overlay does not borrow it').toBeUndefined();
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
            painted.view?.justChanged,
            'a recheck does not stage the shop flourish',
        ).toBeUndefined();
        expect(painted.view?.broadcastPulse).toBe(true);
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
        expect(painted.view?.broadcastPulse, 'a drop is still this card\'s price').toBe(
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
        expect(painted.view?.route.kind).toBe('home');
        expect(painted.view?.broadcast, 'the door is not a stall').toBeUndefined();
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
        expect(painted.view?.broadcastStepped, 'a new card fades').toBe(true);
        expect(painted.view?.broadcastPulse, 'a swap is not a price change').toBeUndefined();
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
        const cursor = painted.view?.broadcastCursor ?? 0;
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
        expect(painted.view?.broadcastCursor ?? 0, 'the carousel was cleared').toBe(
            cursor,
        );
    });

    it('a live re-read that answers unreachable keeps the card and marks stale', async () => {
        const root = await bootLiveOverlay();
        const cursor = painted.view?.broadcastCursor ?? 0;
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
        expect(painted.view?.broadcastCursor ?? 0, 'the carousel was cleared').toBe(
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
        expect(painted.view?.broadcastState, 'fixed mode returns to live').toBe('live');
        expect(
            root.querySelector('[data-role="broadcast"]')?.getAttribute('data-state'),
        ).toBe('live');
        expect(root.querySelector('.bc-item')).not.toBeNull();
    });
});

describe('fiat-hint-is-a-hint', () => {
    /**
     * The seller's suggestion (manifest tag 0x04) fills silence and nothing
     * else: a visitor who ever chose a currency keeps it, and painting is
     * always from the visitor's side of that line.
     */
    it('adopts the hint only when the visitor never chose', async () => {
        bootStall(stallEmpty({ fiatHint: 'vnd' }));
        await flush();
        expect(painted.view?.fiatCode).toBe('vnd');
    });

    it('never overrides a saved choice', async () => {
        localStorage.setItem('stall.fiat', 'eur');
        bootStall(stallEmpty({ fiatHint: 'vnd' }));
        await flush();
        expect(painted.view?.fiatCode).toBe('eur');
    });
});
