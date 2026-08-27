import { describe, expect, it, vi } from 'vitest';
import type { FetchStatus } from '../domain/state';
import { isDefiniteResult, stallGroup, watchStall, AGORA_PLUGIN } from './live';

/**
 * Models the one chronik behaviour this module exists to survive: a socket
 * that opens, drops, and opens again. `openNow` is a fresh establish, which is
 * what chronik reports through `onConnect` every time — including after a
 * reconnect, when it re-sends the subscriptions it remembers and plugin
 * subscriptions are not among them.
 */
function fakeChronik() {
    const calls: Array<[string, string]> = [];
    let onMessage: ((m: { type: string }) => void) | undefined;
    let onConnect: (() => void) | undefined;
    let onReconnect: (() => void) | undefined;
    return {
        calls,
        fire: (type: string) => onMessage?.({ type }),
        /** A drop: chronik reports it, then opens a new socket. */
        reconnect: () => {
            onReconnect?.();
            onConnect?.();
        },
        openNow: () => {
            onConnect?.();
        },
        chronik: {
            ws(config: {
                onMessage: (m: { type: string }) => void;
                onConnect?: () => void;
                onReconnect?: () => void;
            }) {
                onMessage = config.onMessage;
                onConnect = config.onConnect;
                onReconnect = config.onReconnect;
                return {
                    subscribeToPlugin: (p: string, g: string) => calls.push([p, g]),
                    close: () => undefined,
                };
            },
        },
    };
}

describe('live-group-is-the-maker-prefix', () => {
    it('subscribes to the agora group the plugin actually indexes', () => {
        const f = fakeChronik();
        const pk = '02'.repeat(33);
        watchStall(f.chronik as never, pk, () => undefined);
        f.openNow();
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
    it('re-subscribes on every establish, and never twice for one', () => {
        const f = fakeChronik();
        const pk = '03'.repeat(33);
        const group = `50${pk}`;
        watchStall(f.chronik as never, pk, () => undefined);

        f.openNow();
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

    it('says nothing once the visitor has left the stall', () => {
        const f = fakeChronik();
        const handle = watchStall(f.chronik as never, '02'.repeat(33), () => undefined);
        handle.close();
        f.openNow();
        f.reconnect();
        expect(f.calls).toEqual([]);
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
        const f = fakeChronik();
        const changed = vi.fn();
        const handle = watchStall(f.chronik as never, '03'.repeat(33), changed);
        await f.openNow();

        f.fire('Tx');
        expect(changed).toHaveBeenCalledTimes(1);
        f.reconnect();
        expect(changed).toHaveBeenCalledTimes(2);

        // A closed watch is silent, so a stale socket cannot paint over a
        // stall the visitor has already left.
        handle.close();
        f.fire('Tx');
        f.reconnect();
        expect(changed).toHaveBeenCalledTimes(2);
    });
});
