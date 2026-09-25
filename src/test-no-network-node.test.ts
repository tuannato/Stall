/**
 * `no-test-reaches-the-network`, under the node environment most of this
 * suite runs in: no happy-dom, so the socket layer of
 * `src/test-no-network.ts` is the whole guard, and Node's own `fetch` is the
 * road a `src/net` test would take. Loopback alone, refused through
 * `strict` (see the happy-dom half, `src/test-no-network.test.ts`). Node's
 * fetch refuses port 9 itself (the fetch standard's bad-port list), so it
 * would never reach a socket: its case asks 127.0.0.1:2, not on that list.
 */
import net from 'node:net';
import { describe, expect, it } from 'vitest';
import type { NoNetwork } from './test-no-network';

const KEY = Symbol.for('stall.noNetwork');
const guard = (): NoNetwork => {
    const found = (globalThis as unknown as Record<symbol, NoNetwork | undefined>)[KEY];
    if (found === undefined) {
        throw new Error('the no-network guard is not installed: vite.config.ts test.setupFiles');
    }
    return found;
};
const drain = (): string[] => guard().reached.splice(0).map((r) => `${r.road} ${r.to}`);

describe('no-test-reaches-the-network', () => {
    it('is installed by the setup file under node too, as the socket layer alone', () => {
        expect(guard().reached).toEqual([]);
        expect('happyDOM' in globalThis).toBe(false);
        const proto = net.Socket.prototype as unknown as Record<string | symbol, unknown>;
        expect(proto.connect).toBe(proto[KEY]);
    });

    it("refuses Node's own fetch before any connect", async () => {
        guard().strict = true;
        let failed: unknown;
        try {
            await fetch('http://127.0.0.1:2/node-fetch');
        } catch (error) {
            failed = error;
        } finally {
            guard().strict = false;
        }
        expect(String((failed as { cause?: unknown } | undefined)?.cause)).toContain(
            'a test reached the network: socket 127.0.0.1:2',
        );
        expect(drain()).toEqual(['socket 127.0.0.1:2']);
    });
});
