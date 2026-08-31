import { ChronikClient } from 'chronik-client';
import { describe, expect, it, vi } from 'vitest';
import type { FetchStatus } from '../domain/state';
import { CHRONIK_HOSTS } from './hosts';
import {
    BURST_MS,
    AGORA_PLUGIN,
    MAX_BURST_TXIDS,
    MIN_REREAD_MS,
    UNKNOWN_TXID,
    isDefiniteResult,
    stallGroup,
    watchStall,
} from './live';

/** 20 bytes of lowercase hex, which is all `subscribeToScript` accepts. */
const HASH = 'ab'.repeat(20);
const TXID_A = 'a1'.repeat(32);
const TXID_B = 'b2'.repeat(32);

/**
 * Models the two chronik behaviours this module exists to survive.
 *
 * **A socket that opens, drops, and opens again.** `openNow` is a fresh
 * establish, which is what chronik reports through `onConnect` every time —
 * including after a reconnect, when it re-sends the subscriptions it remembers
 * and plugin subscriptions are not among them.
 *
 * **Nothing here connects itself**, because the library does not. `ws()`
 * returns an endpoint that has dialled nothing; `waitForOpen` is what reaches
 * `connectWs`, and only then does `onConnect` fire. A fake that opened on its
 * own was the camouflage over a stall whose socket never connected on a fresh
 * load — every test stayed green because each one called `openNow` by hand.
 *
 * **And a replay that pushes back into the list it replayed from.** Script
 * subscriptions *are* re-sent on every open, by calling the endpoint's own
 * public `subscribeToScript` — which appends. So the remembered list doubles
 * per open unless something trims it. `subs` here is the same object the guard
 * reaches into, and `scriptFrames` is what the wire would have carried.
 */
function fakeChronik() {
    /**
     * Plugin subscribes, in order. Kept apart from the script ones so the
     * exact-equality assertions in `plugin-sub-is-restored-on-reconnect` keep
     * pinning exactly what they pinned.
     */
    const calls: Array<[string, string]> = [];
    /** Script subscribe frames that would have gone out on an open socket. */
    const scriptFrames: Array<[string, string]> = [];
    /** The library's own memory of what to replay. */
    const subs = { scripts: [] as Array<{ scriptType: string; payload: string }> };
    let opened = false;
    let waits = 0;
    let onMessage: ((m: { type: string; txid?: string }) => void) | undefined;
    let onConnect: (() => void) | undefined;
    let onReconnect: (() => void) | undefined;

    const socket = {
        subs,
        subscribeToPlugin: (p: string, g: string) => calls.push([p, g]),
        subscribeToScript: (scriptType: string, payload: string) => {
            // As `isValidWsSubscription` does: the library throws rather than
            // remembering a subscription it cannot send.
            if (scriptType === 'p2pkh' && !/^[0-9a-f]{40}$/.test(payload)) {
                throw new Error('Invalid length');
            }
            subs.scripts.push({ scriptType, payload });
            if (opened) {
                scriptFrames.push([scriptType, payload]);
            }
        },
        close: () => undefined,
        // The whole connection lives here, exactly as in the library: `ws()`
        // below only remembered the handlers.
        waitForOpen: () => {
            waits += 1;
            return Promise.resolve().then(openNow);
        },
    };

    const openNow = (): void => {
        opened = true;
        // `ws.onopen` replays the remembered scripts through the public method,
        // which pushes each one back onto the list being read. Copied first,
        // because `forEach` visits the length the array had when it started.
        for (const sub of [...subs.scripts]) {
            socket.subscribeToScript(sub.scriptType, sub.payload);
        }
        // After the replay, which is where the guard has to sit.
        onConnect?.();
    };

    return {
        calls,
        scriptFrames,
        subs,
        /** How many times the watch asked the library to dial. */
        waits: () => waits,
        fire: (type: string, txid?: string) => onMessage?.({ type, txid }),
        /** The socket went away. chronik reports this at the drop, not at the return. */
        drop: () => {
            opened = false;
            onReconnect?.();
        },
        /** A drop: chronik reports it, then opens a new socket. */
        reconnect: () => {
            opened = false;
            onReconnect?.();
            openNow();
        },
        openNow,
        /**
         * Let a queued establish actually happen. `watchStall` starts the
         * connection without awaiting it, so nothing has opened by the time it
         * returns and a test that wants the subscribe has to yield first.
         */
        settle: async () => {
            await Promise.resolve();
            await Promise.resolve();
        },
        chronik: {
            ws(config: {
                onMessage: (m: { type: string; txid?: string }) => void;
                onConnect?: () => void;
                onReconnect?: () => void;
            }) {
                onMessage = config.onMessage;
                onConnect = config.onConnect;
                onReconnect = config.onReconnect;
                return socket;
            },
        },
    };
}

describe('a-fresh-stall-opens-its-socket-without-a-visibility-change', () => {
    /**
     * `chronik.ws()` constructs an endpoint and dials nothing — `connectWs`
     * runs from `waitForOpen`, from `resume`, or from the auto-reconnect of an
     * already-established socket. So a watch that only called `ws()` held a
     * socket that never opened: no `onConnect`, no plugin subscription, no live
     * message, on every first page load. The one path that worked was leaving
     * the tab and coming back, which is what `resume` is for and is not
     * something a visitor should have to do.
     */
    it('dials on its own, with no reconnect and no resume', async () => {
        const f = fakeChronik();
        const pk = '02'.repeat(33);
        watchStall(f.chronik as never, { pubkeyHex: pk });

        // Asked synchronously, so this fails loudly rather than timing out if
        // the call goes away again.
        expect(f.waits(), 'the watch asks the library to connect').toBe(1);

        // Nothing below simulates a drop or a return from the background: the
        // only establish is the one the watch started itself.
        await f.settle();
        expect(f.calls, 'subscribed on that first establish').toEqual([
            [AGORA_PLUGIN, `50${pk}`],
        ]);
    });
});

describe('live-group-is-the-maker-prefix', () => {
    it('subscribes to the agora group the plugin actually indexes', async () => {
        const f = fakeChronik();
        const pk = '02'.repeat(33);
        watchStall(f.chronik as never, { pubkeyHex: pk });
        await f.settle();
        // The plugin groups offers under b"P" + maker_pk; "50" is hex for "P".
        expect(stallGroup(pk)).toBe(`50${pk}`);
        expect(f.calls).toEqual([[AGORA_PLUGIN, `50${pk}`]]);
    });
});

describe('plugin-sub-is-restored-on-reconnect', () => {
    /**
     * chronik-client re-sends the subscriptions it remembers when a socket
     * opens — scripts, lokad ids, token ids, txids, blocks, txs — and not
     * plugins, the only kind this app uses. Subscribing once after the first
     * open therefore bought exactly one connection's worth of updates: after
     * a drop the socket reconnected, looked alive, and carried nothing.
     */
    it('re-subscribes on every establish, and never twice for one', async () => {
        const f = fakeChronik();
        const pk = '03'.repeat(33);
        const group = `50${pk}`;
        watchStall(f.chronik as never, { pubkeyHex: pk });

        await f.settle();
        expect(f.calls, 'first connect').toEqual([[AGORA_PLUGIN, group]]);

        // A phone changing network. The socket comes back; the subscription
        // must come back with it.
        f.reconnect();
        expect(f.calls, 'after a reconnect').toEqual([
            [AGORA_PLUGIN, group],
            [AGORA_PLUGIN, group],
        ]);

        // One send per establish, not two: `subscribeToPlugin` appends to the
        // list chronik remembers without checking for a duplicate, so a second
        // subscribe site would grow that list on every drop.
        f.reconnect();
        expect(f.calls, 'one send per establish').toHaveLength(3);
    });

    it('says nothing once the visitor has left the stall', async () => {
        const f = fakeChronik();
        const handle = watchStall(f.chronik as never, { pubkeyHex: '02'.repeat(33) });
        handle.close();
        // The establish the watch started arrives after the visitor left, which
        // is the ordinary case: it is queued before `close` and lands after.
        await f.settle();
        f.openNow();
        f.reconnect();
        expect(f.calls).toEqual([]);
    });
});

describe('script-sub-does-not-double-on-reconnect', () => {
    /**
     * The library replays script subscriptions on every open by calling its own
     * **public** `subscribeToScript`, which pushes the subscription back onto
     * the list it was just read from. One entry becomes two, two become four,
     * and by open N the wire carries 2^(N-1) copies of one subscribe frame. The
     * trigger is not only a network drop: `pause()` closes the socket and
     * `resume()` opens it, so every visibility change doubles it again.
     *
     * Idempotent at the far end — chronik removes before it inserts — so what
     * this costs is wire bytes and client memory. That is why the guard trims
     * the list rather than the vendored tarball being patched.
     */
    it('sends one frame per establish, and the remembered list stays at one', async () => {
        const f = fakeChronik();
        watchStall(f.chronik as never, { pubkeyHex: '02'.repeat(33), hash: HASH });
        await f.settle();
        expect(f.scriptFrames, 'sent once the socket was open').toEqual([['p2pkh', HASH]]);
        expect(f.subs.scripts, 'trimmed back after the replay').toHaveLength(1);

        f.reconnect();
        f.reconnect();
        f.reconnect();
        expect(f.scriptFrames, 'one per open, never 1 + 2 + 4').toHaveLength(4);
        expect(f.subs.scripts, "the library's own list does not grow").toHaveLength(1);
        expect(f.subs.scripts[0]).toEqual({ scriptType: 'p2pkh', payload: HASH });
    });

    it('subscribes to no script when there is no address to watch', async () => {
        // The waiting screens are the other way round — a hash and no pubkey.
        const f = fakeChronik();
        watchStall(f.chronik as never, { pubkeyHex: '02'.repeat(33) });
        await f.settle();
        expect(f.scriptFrames).toEqual([]);
        expect(f.subs.scripts).toEqual([]);
    });

    it('subscribes to no plugin when there is no maker key yet', async () => {
        const f = fakeChronik();
        watchStall(f.chronik as never, { hash: HASH });
        await f.settle();
        expect(f.calls, 'no pubkey means no agora group to ask for').toEqual([]);
        expect(f.scriptFrames).toEqual([['p2pkh', HASH]]);
    });

    it('does not take the book down when the hash cannot be subscribed to', async () => {
        // `subscribeToScript` throws on a payload that is not 20 bytes of
        // lowercase hex. A stall we cannot watch the address of still has a
        // book worth watching.
        const f = fakeChronik();
        const pk = '02'.repeat(33);
        watchStall(f.chronik as never, { pubkeyHex: pk, hash: 'NOT-A-HASH' });
        await f.settle();
        expect(f.calls).toEqual([[AGORA_PLUGIN, `50${pk}`]]);
        expect(f.scriptFrames).toEqual([]);
    });
});

describe('script-sub-dedupe-notices-when-the-library-changes-shape', () => {
    /**
     * The guard reaches into a library internal, and it fails **open**: a shape
     * it does not recognise is left alone, because trimming a list this module
     * does not understand would be worse than the duplicates. That safety is
     * also how a vendored upgrade could turn the guard into a silent no-op, so
     * the shape itself is asserted here against a real endpoint rather than
     * against the fake above.
     *
     * No connection is made: `new ChronikClient(...)` is documented as creating
     * an object and nothing else, and `ws()` returns an endpoint that has
     * dialled nothing.
     */
    it('finds subs.scripts on a real endpoint, with the two fields the guard keys on', () => {
        const endpoint = new ChronikClient([...CHRONIK_HOSTS]).ws({
            onMessage: () => undefined,
        });
        const subs = (endpoint as unknown as { subs?: { scripts?: unknown } }).subs;
        expect(subs, 'WsEndpoint no longer exposes `subs`').toBeDefined();
        expect(Array.isArray(subs?.scripts), '`subs.scripts` is no longer an array').toBe(
            true,
        );

        endpoint.subscribeToScript('p2pkh', HASH);
        expect(subs?.scripts, 'a remembered subscription changed shape').toEqual([
            { scriptType: 'p2pkh', payload: HASH },
        ]);
    });
});

describe('failed-refetch-is-not-empty', () => {
    /**
     * A socket message means the book moved, so the book is re-read. If that
     * read fails, the visitor keeps the last good list: turning a working stall
     * into an error — or worse, into an empty one — because a node blinked
     * would be a statement about the seller made from our own failure.
     *
     * `empty` is on the dropped side, and that is the whole point. A take
     * spends the old UTXO and re-creates the remainder; the socket fires
     * between the two, and a replica that has seen only the spend answers 200
     * with no rows. On this path an empty answer cannot be told apart from
     * that race, so it is never painted as the seller having nothing.
     */
    it('applies only chain facts, never our own failure', () => {
        expect(isDefiniteResult({ kind: 'offers', offers: [] })).toBe(true);
        expect(isDefiniteResult({ kind: 'empty' })).toBe(false);

        const ours: FetchStatus[] = [
            { kind: 'unreachable', triedAtMs: 0, hosts: [] },
            { kind: 'plugin-missing', triedAtMs: 0, hosts: [] },
            { kind: 'unreadable', triedAtMs: 0, returned: 3 },
        ];
        for (const status of ours) {
            expect(isDefiniteResult(status), status.kind).toBe(false);
        }
    });

    it('re-reads on reconnect, because what was missed while down is unknown', async () => {
        vi.useFakeTimers();
        const f = fakeChronik();
        const changed = vi.fn();
        const handle = watchStall(
            f.chronik as never,
            { pubkeyHex: '03'.repeat(33) },
            { onChanged: changed },
        );
        await f.settle();

        f.fire('Tx', TXID_A);
        // One transaction arrives as several messages, so the read waits out
        // the burst — see `rereadCoalesced`. The reconnect below is not
        // deferred and is not floored by it.
        await vi.advanceTimersByTimeAsync(BURST_MS);
        expect(changed).toHaveBeenCalledTimes(1);
        f.reconnect();
        expect(changed).toHaveBeenCalledTimes(2);

        // A closed watch is silent, so a stale socket cannot paint over a
        // stall the visitor has already left.
        handle.close();
        f.fire('Tx', TXID_A);
        await vi.advanceTimersByTimeAsync(BURST_MS);
        f.reconnect();
        expect(changed).toHaveBeenCalledTimes(2);
        vi.useRealTimers();
    });

    it('reads once per burst, not once per message', async () => {
        vi.useFakeTimers();
        const f = fakeChronik();
        const changed = vi.fn();
        const bursts: string[][] = [];
        const handle = watchStall(
            f.chronik as never,
            { pubkeyHex: '03'.repeat(33), hash: HASH },
            { onChanged: changed, onBurst: (ids) => bursts.push([...ids]) },
        );
        await f.settle();

        // One sale, three messages: mempool, confirmed, and the same again
        // after a block is disconnected. Each used to be a full re-read behind
        // a fresh failover client.
        f.fire('Tx', TXID_A);
        f.fire('Tx', TXID_A);
        f.fire('Tx', TXID_A);
        expect(changed).toHaveBeenCalledTimes(0);
        await vi.advanceTimersByTimeAsync(BURST_MS);
        expect(changed).toHaveBeenCalledTimes(1);
        expect(bursts, 'one transaction, named once').toEqual([[TXID_A]]);

        // A later sale is its own burst, not swallowed by the first.
        f.fire('Tx', TXID_B);
        await vi.advanceTimersByTimeAsync(BURST_MS);
        expect(changed).toHaveBeenCalledTimes(2);
        expect(bursts[1]).toEqual([TXID_B]);

        handle.close();
        vi.useRealTimers();
    });

    it('a-flood-degrades-to-one-unknown-not-a-fetch-storm', async () => {
        /**
         * The script subscription hears every payment to the stall, dust
         * included, and each named txid costs the consumer one serial
         * `chronik.tx` in every open tab. `seen` was the app's one unbounded
         * buffer. Past the cap the burst carries `UNKNOWN_TXID` instead of
         * more names — the shape the consumer already reads as "wake every
         * fact reader and mark the gap", so a flood buys one grouped re-read,
         * never a fetch per dust output.
         */
        vi.useFakeTimers();
        const f = fakeChronik();
        const bursts: string[][] = [];
        const handle = watchStall(
            f.chronik as never,
            { pubkeyHex: '03'.repeat(33), hash: HASH },
            { onChanged: () => undefined, onBurst: (ids) => bursts.push([...ids]) },
        );
        await f.settle();

        // A duplicate is one entry, not two toward the cap: the same sale
        // arriving as mempool and confirmed must not spend the budget.
        for (let i = 0; i < MAX_BURST_TXIDS; i += 1) {
            const txid = i.toString(16).padStart(2, '0').repeat(32);
            f.fire('Tx', txid);
            f.fire('Tx', txid);
        }
        await vi.advanceTimersByTimeAsync(BURST_MS);
        expect(bursts, 'at the cap, every txid is still named').toHaveLength(1);
        expect(bursts[0]).toHaveLength(MAX_BURST_TXIDS);
        expect(bursts[0]).not.toContain(UNKNOWN_TXID);

        // Ten distinct txids past the cap: one UNKNOWN stands for all of
        // them, and the set stops growing.
        for (let i = 0; i < MAX_BURST_TXIDS + 10; i += 1) {
            f.fire('Tx', i.toString(16).padStart(2, '0').repeat(32));
        }
        await vi.advanceTimersByTimeAsync(BURST_MS);
        expect(bursts).toHaveLength(2);
        const flood = bursts[1]!;
        expect(flood, 'capped names plus one stand-in').toHaveLength(MAX_BURST_TXIDS + 1);
        expect(flood.filter((id) => id === UNKNOWN_TXID)).toHaveLength(1);

        handle.close();
        vi.useRealTimers();
    });

    it('names a message that carried no txid rather than dropping it', async () => {
        vi.useFakeTimers();
        const f = fakeChronik();
        const bursts: string[][] = [];
        const handle = watchStall(
            f.chronik as never,
            { pubkeyHex: '03'.repeat(33), hash: HASH },
            { onChanged: () => undefined, onBurst: (ids) => bursts.push([...ids]) },
        );
        await f.settle();

        f.fire('Tx');
        await vi.advanceTimersByTimeAsync(BURST_MS);
        // Not a txid on purpose: the caller's 64-hex gate refuses it and asks
        // every reader, which is what a message we could not read is owed.
        expect(bursts).toEqual([[UNKNOWN_TXID]]);
        expect(UNKNOWN_TXID).not.toMatch(/^[0-9a-f]{64}$/);

        handle.close();
        vi.useRealTimers();
    });
});

describe('a-txid-arriving-mid-read-starts-the-next-burst-not-this-one', () => {
    /**
     * The set is drained synchronously, before either callback can await
     * anything. A drain that happened after the book read would put a
     * transaction that arrived *during* that read into the burst that had
     * already been reported — classified, acted on, and then cleared with the
     * rest, so the settings publish that landed half a second after a sale
     * would never be looked at.
     */
    it('reports the burst that fired, and carries the newcomer into the next', async () => {
        vi.useFakeTimers();
        const f = fakeChronik();
        const bursts: string[][] = [];
        let reads = 0;
        const handle = watchStall(
            f.chronik as never,
            { pubkeyHex: '03'.repeat(33), hash: HASH },
            {
                onChanged: () => {
                    reads += 1;
                    if (reads === 1) {
                        // A second transaction lands while the first read is in
                        // flight. Fired from inside the read for exactly that.
                        f.fire('Tx', TXID_B);
                    }
                },
                onBurst: (ids) => bursts.push([...ids]),
            },
        );
        await f.settle();

        f.fire('Tx', TXID_A);
        await vi.advanceTimersByTimeAsync(BURST_MS);
        expect(bursts, 'the burst that fired names only what it collected').toEqual([
            [TXID_A],
        ]);

        await vi.advanceTimersByTimeAsync(BURST_MS);
        expect(bursts[1], 'and the newcomer is not lost').toEqual([TXID_B]);
        expect(reads, 'two bursts, two reads').toBe(2);

        handle.close();
        vi.useRealTimers();
    });
});

describe('a-reconnect-spin-still-re-reads-the-facts-once-it-is-back', () => {
    /**
     * `MIN_REREAD_MS` **drops**, which is right for the book — the next message
     * on the group corrects it — and wrong for the facts, because a settings
     * publish is one transaction and nothing announces it twice. And
     * `onReconnect` fires at the moment of the *drop*, before the network is
     * back, so a catch-up hung on it would ask an index that is not there.
     *
     * The catch-up therefore rides the establish, on a trailing timer of its
     * own, and the clock never moves in this test: everything below happens
     * inside the floor that the book read is subject to.
     */
    it('asks once per establish while the floored book read is dropped', async () => {
        vi.useFakeTimers();
        const f = fakeChronik();
        const changed = vi.fn();
        const facts = vi.fn();
        const clock = 1_000_000;
        const handle = watchStall(
            f.chronik as never,
            { pubkeyHex: '03'.repeat(33), hash: HASH },
            { onChanged: changed, onReestablished: facts, now: () => clock },
        );
        await f.settle();
        await vi.advanceTimersByTimeAsync(BURST_MS);
        expect(facts, 'the first establish is the page load, which read them').not
            .toHaveBeenCalled();

        // Fifty refused connections. chronik reconnects with no backoff at all.
        for (let i = 0; i < 50; i += 1) {
            f.drop();
        }
        await vi.advanceTimersByTimeAsync(BURST_MS);
        expect(facts, 'a drop is not an establish').not.toHaveBeenCalled();

        f.reconnect();
        await vi.advanceTimersByTimeAsync(BURST_MS);
        expect(facts, 'back, so ask').toHaveBeenCalledTimes(1);

        f.reconnect();
        await vi.advanceTimersByTimeAsync(BURST_MS);
        expect(facts, 'and the floor does not drop the second one').toHaveBeenCalledTimes(2);
        expect(changed, 'while the book read is floored, on a frozen clock').toHaveBeenCalledTimes(
            1,
        );

        handle.close();
        vi.useRealTimers();
    });

    it('says nothing after the visitor has left', async () => {
        vi.useFakeTimers();
        const f = fakeChronik();
        const facts = vi.fn();
        const handle = watchStall(
            f.chronik as never,
            { pubkeyHex: '03'.repeat(33), hash: HASH },
            { onReestablished: facts },
        );
        await f.settle();
        f.reconnect();
        handle.close();
        await vi.advanceTimersByTimeAsync(BURST_MS);
        expect(facts).not.toHaveBeenCalled();
        vi.useRealTimers();
    });
});

describe('a-reconnect-spin-does-not-become-a-request-storm', () => {
    /**
     * Reproduced from a tab reopened after sleep: a loading indicator that never
     * settled and a warm machine. chronik-client reconnects with **no backoff**
     * — its `ws.onclose` calls `onReconnect` and then `connectWs` immediately —
     * so a network that refuses connections spins as fast as it can refuse them.
     * Asking for the offers on reconnect is right, because anything missed while
     * down is unknown; asking once per spin is the storm.
     */
    function socketDouble() {
        let handlers: {
            onConnect?: () => void;
            onReconnect?: () => void;
            onMessage: (m: { type: string; txid?: string }) => void;
        };
        const calls = { subscribed: 0, scripts: 0, paused: 0, resumed: 0, dialled: 0 };
        const chronik = {
            ws(config: never) {
                handlers = config as never;
                return {
                    subscribeToPlugin: () => {
                        calls.subscribed += 1;
                    },
                    subscribeToScript: () => {
                        calls.scripts += 1;
                    },
                    close: () => {},
                    // As in the library: `ws()` dialled nothing, and this is
                    // the call that does. The spin below is driven by firing
                    // `onReconnect` by hand, so the first establish only has to
                    // be asked for, not awaited.
                    waitForOpen: () => {
                        calls.dialled += 1;
                        return Promise.resolve().then(() => handlers.onConnect?.());
                    },
                    pause: () => {
                        calls.paused += 1;
                    },
                    resume: () => {
                        calls.resumed += 1;
                        return Promise.resolve();
                    },
                };
            },
        };
        return { chronik, calls, fire: () => handlers };
    }

    it('re-reads once for a burst of reconnects, then again after the floor', () => {
        const { chronik, fire } = socketDouble();
        let changed = 0;
        let clock = 1_000_000;
        watchStall(
            chronik as never,
            { pubkeyHex: 'ab'.repeat(33) },
            {
                onChanged: () => {
                    changed += 1;
                },
                now: () => clock,
            },
        );

        for (let i = 0; i < 50; i += 1) {
            fire().onReconnect?.();
        }
        expect(changed, 'fifty failed reconnects are not fifty reads').toBe(1);

        clock += MIN_REREAD_MS - 1;
        fire().onReconnect?.();
        expect(changed, 'still inside the floor').toBe(1);

        clock += 2;
        fire().onReconnect?.();
        expect(changed, 'a real gap asks again').toBe(2);
    });

    it('pauses instead of closing, so the socket can come back', () => {
        const { chronik, calls } = socketDouble();
        let changed = 0;
        let clock = 2_000_000;
        const handle = watchStall(
            chronik as never,
            { pubkeyHex: 'ab'.repeat(33) },
            {
                onChanged: () => {
                    changed += 1;
                },
                now: () => clock,
            },
        );

        handle.pause();
        expect(calls.paused).toBe(1);
        // `close()` marks the socket manually closed and it never returns;
        // `pause` is the library's own idle mode.
        clock += MIN_REREAD_MS;
        handle.resume();
        expect(calls.resumed).toBe(1);
        expect(changed, 'catch up once on return').toBe(1);

        // Flapping in and out of the background is not a request per flap.
        handle.pause();
        handle.resume();
        expect(changed).toBe(1);
    });

    it('does nothing on a handle that was closed for good', () => {
        const { chronik, calls, fire } = socketDouble();
        let changed = 0;
        const handle = watchStall(
            chronik as never,
            { pubkeyHex: 'ab'.repeat(33) },
            {
                onChanged: () => {
                    changed += 1;
                },
            },
        );
        handle.close();
        handle.resume();
        fire().onReconnect?.();
        expect(changed).toBe(0);
        expect(calls.resumed).toBe(0);
    });
});
