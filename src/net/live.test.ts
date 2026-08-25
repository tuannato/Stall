import { describe, expect, it, vi } from 'vitest';
import type { FetchStatus } from '../domain/state';
import { isDefiniteResult, stallGroup, watchStall, AGORA_PLUGIN } from './live';

function fakeChronik() {
    const calls: Array<[string, string]> = [];
    let onMessage: ((m: { type: string }) => void) | undefined;
    let onReconnect: (() => void) | undefined;
    let opened: () => void = () => undefined;
    const open = new Promise<void>((resolve) => {
        opened = resolve;
    });
    return {
        calls,
        fire: (type: string) => onMessage?.({ type }),
        reconnect: () => onReconnect?.(),
        openNow: () => {
            opened();
            return open;
        },
        chronik: {
            ws(config: {
                onMessage: (m: { type: string }) => void;
                onReconnect?: () => void;
            }) {
                onMessage = config.onMessage;
                onReconnect = config.onReconnect;
                return {
                    waitForOpen: () => open,
                    subscribeToPlugin: (p: string, g: string) => calls.push([p, g]),
                    close: () => undefined,
                };
            },
        },
    };
}

describe('live-group-is-the-maker-prefix', () => {
    it('subscribes to the agora group the plugin actually indexes', async () => {
        const f = fakeChronik();
        const pk = '02'.repeat(33);
        watchStall(f.chronik as never, pk, () => undefined);
        await f.openNow();
        await Promise.resolve();
        // The plugin groups offers under b"P" + maker_pk; "50" is hex for "P".
        expect(stallGroup(pk)).toBe(`50${pk}`);
        expect(f.calls).toEqual([[AGORA_PLUGIN, `50${pk}`]]);
    });
});

describe('failed-refetch-is-not-empty', () => {
    /**
     * A socket message means the book moved, so the book is re-read. If that
     * read fails, the visitor keeps the last good list: turning a working stall
     * into an error — or worse, into an empty one — because a node blinked
     * would be a statement about the seller made from our own failure.
     */
    it('applies only chain facts, never our own failure', () => {
        expect(isDefiniteResult({ kind: 'offers', offers: [] })).toBe(true);
        expect(isDefiniteResult({ kind: 'empty' })).toBe(true);

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
