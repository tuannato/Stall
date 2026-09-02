import { ChronikClient } from 'chronik-client';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';
import type { FetchStatus } from '../domain/state';
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

const require = createRequire(import.meta.url);

/** 20 bytes of lowercase hex, which is all `subscribeToScript` accepts. */
const HASH = 'ab'.repeat(20);
const TXID_A = 'a1'.repeat(32);
const TXID_B = 'b2'.repeat(32);

/**
 * Models the two chronik behaviours this module exists to survive.
 *
 * **A socket that opens, drops, and opens again.** `openNow` is a fresh
 * establish, which is what chronik reports through `onConnect` every time —
 * including after a reconnect, when `_resubscribeAll` re-sends every
 * remembered subscription through the private senders.
 *
 * **Nothing here connects itself**, because the library does not. `ws()`
 * returns an endpoint that has dialled nothing; `waitForOpen` is what reaches
 * `connectWs`, and only then does `onConnect` fire. A fake that opened on its
 * own was the camouflage over a stall whose socket never connected on a fresh
 * load — every test stayed green because each one called `openNow` by hand.
 *
 * **Replay is send-only.** chronik-client 4.3.1's `ws.onopen` calls
 * `_resubscribeAll`, which walks `this.subs` and sends — scripts, plugins,
 * and the rest — without pushing back onto the list. Public `subscribeTo*`
 * still push-then-send. Counting those public calls therefore counts what
 * Stall asked for, not what the library replayed.
 */
function fakeChronik() {
    /** Public `subscribeToPlugin` calls, in order — Stall's, not the replay. */
    const calls: Array<[string, string]> = [];
    /** Public `subscribeToScript` calls, in order — Stall's, not the replay. */
    const scriptCalls: Array<[string, string]> = [];
    /** Plugin subscribe frames that would have gone out on an open socket. */
    const pluginFrames: Array<[string, string]> = [];
    /** Script subscribe frames that would have gone out on an open socket. */
    const scriptFrames: Array<[string, string]> = [];
    /** The library's own memory of what to replay. */
    const subs = {
        scripts: [] as Array<{ scriptType: string; payload: string }>,
        plugins: [] as Array<{ pluginName: string; group: string }>,
    };
    let opened = false;
    let waits = 0;
    let connects = 0;
    let onMessage: ((m: { type: string; txid?: string }) => void) | undefined;
    let onConnect: (() => void) | undefined;
    let onReconnect: (() => void) | undefined;

    const socket = {
        subs,
        subscribeToPlugin: (p: string, g: string) => {
            calls.push([p, g]);
            subs.plugins.push({ pluginName: p, group: g });
            if (opened) {
                pluginFrames.push([p, g]);
            }
        },
        subscribeToScript: (scriptType: string, payload: string) => {
            // As `isValidWsSubscription` does: the library throws rather than
            // remembering a subscription it cannot send.
            if (scriptType === 'p2pkh' && !/^[0-9a-f]{40}$/.test(payload)) {
                throw new Error('Invalid length');
            }
            scriptCalls.push([scriptType, payload]);
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
        // `_resubscribeAll`: send every remembered sub without pushing.
        for (const sub of subs.plugins) {
            pluginFrames.push([sub.pluginName, sub.group]);
        }
        for (const sub of subs.scripts) {
            scriptFrames.push([sub.scriptType, sub.payload]);
        }
        connects += 1;
        onConnect?.();
    };

    return {
        calls,
        scriptCalls,
        pluginFrames,
        scriptFrames,
        subs,
        /** How many times `onConnect` fired, including the first establish. */
        connects: () => connects,
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

describe('subscriptions-are-sent-once-and-the-library-replays-them', () => {
    /**
     * chronik-client 4.3.1 replays every remembered subscription on open
     * through `_resubscribeAll` — private senders, no push onto `this.subs`.
     * Stall therefore sends each kind once, when the watch starts, and
     * `onConnect` does not subscribe again. Three reconnects fire `onConnect`
     * three more times; the public methods stay at one call each.
     */
    it('calls each public subscribe once across three reconnects', async () => {
        const f = fakeChronik();
        const pk = '03'.repeat(33);
        const group = `50${pk}`;
        watchStall(f.chronik as never, { pubkeyHex: pk, hash: HASH });
        await f.settle();

        expect(f.connects(), 'first establish').toBe(1);
        expect(f.calls, 'plugin, once').toEqual([[AGORA_PLUGIN, group]]);
        expect(f.scriptCalls, 'script, once').toEqual([['p2pkh', HASH]]);
        expect(f.pluginFrames, 'library put the plugin on the wire at open').toEqual([
            [AGORA_PLUGIN, group],
        ]);
        expect(f.scriptFrames, 'library put the script on the wire at open').toEqual([
            ['p2pkh', HASH],
        ]);

        f.reconnect();
        f.reconnect();
        f.reconnect();

        expect(f.connects(), 'onConnect fired three reconnects plus the first').toBe(4);
        expect(f.calls, 'Stall asked once; the library replayed').toEqual([
            [AGORA_PLUGIN, group],
        ]);
        expect(f.scriptCalls, 'Stall asked once; the library replayed').toEqual([
            ['p2pkh', HASH],
        ]);
        expect(f.pluginFrames, 'one plugin frame per open').toHaveLength(4);
        expect(f.scriptFrames, 'one script frame per open').toHaveLength(4);
        expect(f.subs.plugins, 'replay does not grow the plugin list').toHaveLength(1);
        expect(f.subs.scripts, 'replay does not grow the script list').toHaveLength(1);
    });

    it('does not subscribe again after the visitor has left', async () => {
        const f = fakeChronik();
        const handle = watchStall(f.chronik as never, {
            pubkeyHex: '02'.repeat(33),
            hash: HASH,
        });
        handle.close();
        // The establish the watch started arrives after the visitor left, which
        // is the ordinary case: it is queued before `close` and lands after.
        await f.settle();
        f.openNow();
        f.reconnect();
        expect(f.calls, 'subscribed at watch start, not on later establishes').toHaveLength(
            1,
        );
        expect(f.scriptCalls).toHaveLength(1);
    });

    it('subscribes to no script when there is no address to watch', async () => {
        const f = fakeChronik();
        watchStall(f.chronik as never, { pubkeyHex: '02'.repeat(33) });
        await f.settle();
        expect(f.scriptCalls).toEqual([]);
        expect(f.scriptFrames).toEqual([]);
        expect(f.subs.scripts).toEqual([]);
    });

    it('subscribes to no plugin when there is no maker key yet', async () => {
        const f = fakeChronik();
        watchStall(f.chronik as never, { hash: HASH });
        await f.settle();
        expect(f.calls, 'no pubkey means no agora group to ask for').toEqual([]);
        expect(f.scriptCalls).toEqual([['p2pkh', HASH]]);
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
        expect(f.scriptCalls).toEqual([]);
        expect(f.scriptFrames).toEqual([]);
    });
});

describe('the-vendored-client-carries-d20536', () => {
    /**
     * A contract against the real library, not the fake. `_resubscribeAll`
     * re-sends a plugin subscription through the private sender and does not
     * push onto `subs.plugins`. A tarball that drops plugin replay, or that
     * starts pushing again, fails here rather than as a silent live-update hole.
     *
     * The version pin moves with every deliberate bump.
     */
    it('replays a plugin sub without growing the list, and the pin is 4.3.1', () => {
        expect(require('chronik-client/package.json').version).toBe('4.3.1');

        const endpoint = new ChronikClient(['https://chronik.example.com']).ws({
            onMessage: () => undefined,
        });
        const sent: unknown[] = [];
        // isomorphic-ws / browser WebSocket.OPEN. No connection is made:
        // `ws()` returns an endpoint that has dialled nothing, and this stub
        // stands in for an already-open socket so `send` is the only I/O.
        endpoint.ws = {
            readyState: 1,
            send: (frame: unknown) => {
                sent.push(frame);
            },
        } as never;

        const group = stallGroup('02'.repeat(33));
        endpoint.subscribeToPlugin(AGORA_PLUGIN, group);
        expect(sent, 'the public method sent a frame').toHaveLength(1);
        expect(endpoint.subs.plugins).toHaveLength(1);

        endpoint._resubscribeAll();
        expect(sent, 'a plugin subscribe frame was sent again').toHaveLength(2);
        expect(endpoint.subs.plugins, 'replay does not push').toHaveLength(1);
        expect(endpoint.subs.plugins[0]).toEqual({
            pluginName: AGORA_PLUGIN,
            group,
        });
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
