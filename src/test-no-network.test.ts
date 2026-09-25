// @vitest-environment happy-dom
/**
 * `no-test-reaches-the-network`: the guard `src/test-no-network.ts` sets up
 * before every test file (`vite.config.ts`'s `test.setupFiles`). Every
 * address here is 127.0.0.1:9 (the discard port): were a layer to fail, the
 * request would go nowhere off this machine. `strict` makes the socket
 * layer refuse loopback too, which is how its refusal is proved without an
 * address anywhere else.
 *
 * The guard is read off the global and never imported: an import would
 * install it for this file alone, and this file would pass with the setup
 * line gone and every other file unguarded.
 */
import http from 'node:http';
import net from 'node:net';
import { describe, expect, it, vi } from 'vitest';
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
const settle = async (): Promise<void> => {
    for (let i = 0; i < 20; i++) {
        await new Promise((resolve) => setTimeout(resolve, 0));
    }
};
const strictly = <T>(run: () => T): T => {
    guard().strict = true;
    try {
        return run();
    } finally {
        guard().strict = false;
    }
};
const anchorTo = (href: string): HTMLAnchorElement => {
    const a = document.createElement('a');
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.append(a);
    return a;
};

describe('no-test-reaches-the-network', () => {
    it('is installed by the setup file before this file runs, both layers', () => {
        const installed = guard();
        expect(installed.reached).toEqual([]);
        expect(installed.strict).toBe(false);
        const interceptor = (
            globalThis as unknown as {
                happyDOM?: { settings: { fetch: { interceptor: Record<string, unknown> | null } } };
            }
        ).happyDOM?.settings.fetch.interceptor;
        expect(typeof interceptor?.beforeAsyncRequest).toBe('function');
        expect(typeof interceptor?.beforeSyncRequest).toBe('function');
        const proto = net.Socket.prototype as unknown as Record<string | symbol, unknown>;
        expect(proto.connect).toBe(proto[KEY]);
    });

    it('refuses the navigation a _blank link starts, which a window.open spy never sees', async () => {
        const spy = vi.spyOn(window, 'open').mockImplementation(() => null);
        try {
            anchorTo('http://127.0.0.1:9/anchor').click();
            await settle();
            expect(spy, 'happy-dom calls its own Window instance, not the global').not.toHaveBeenCalled();
        } finally {
            spy.mockRestore();
        }
        expect(drain()).toContain('happy-dom http://127.0.0.1:9/anchor');
    });

    it('refuses an unstubbed window.open', async () => {
        window.open('http://127.0.0.1:9/open', '_blank', 'noopener,noreferrer');
        await settle();
        expect(drain()).toContain('happy-dom http://127.0.0.1:9/open');
    });

    it('refuses fetch() and answers it with a 599', async () => {
        const res = await fetch('http://127.0.0.1:9/fetch');
        expect(res.status).toBe(599);
        expect(drain()).toEqual(['happy-dom http://127.0.0.1:9/fetch']);
    });

    it('refuses a synchronous XHR, which runs outside the socket layer', () => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', 'http://127.0.0.1:9/sync', false);
        xhr.send();
        expect(xhr.status).toBe(599);
        expect(drain()).toEqual(['happy-dom sync http://127.0.0.1:9/sync']);
    });

    it('refuses net.connect and http.get before any connect', () => {
        strictly(() => {
            expect(() => net.connect({ host: '127.0.0.1', port: 9 })).toThrow(
                'a test reached the network: socket 127.0.0.1:9',
            );
            expect(() => http.get('http://127.0.0.1:9/')).toThrow('a test reached the network: socket 127.0.0.1:9');
        });
        expect(drain()).toEqual(['socket 127.0.0.1:9', 'socket 127.0.0.1:9']);
    });

    it('fails a test that left a request, naming the URL, and forgets it once said', async () => {
        anchorTo('http://127.0.0.1:9/left').click();
        await settle();
        expect(() => guard().check()).toThrow('a test reached the network: happy-dom http://127.0.0.1:9/left');
        expect(guard().reached).toEqual([]);
        expect(() => guard().check()).not.toThrow();
    });
});
