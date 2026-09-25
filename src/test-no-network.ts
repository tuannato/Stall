/**
 * No test reaches the network. Registered in `vite.config.ts`'s
 * `test.setupFiles`, so it runs before every test file vitest collects.
 *
 * Two layers, both recording, and a test that left a record fails in the
 * `afterEach` below, naming the URL; a request that fires after a file's
 * last test fails that file's `afterAll`.
 *
 * 1. happy-dom. Every request a document makes goes through
 *    `settings.fetch.interceptor`: `fetch()`, an XHR, a script or a
 *    stylesheet, and the navigation an anchor or `window.open` starts. The
 *    interceptor runs at the top of happy-dom's `Fetch.send` and
 *    `SyncFetch.send`, answers a 599 refusal and nothing is sent.
 *    `happyDOM.settings` is the browser's own settings object, shared by
 *    every page a link or `window.open` creates. This is the only layer that
 *    sees a navigation happy-dom starts from its own Window instance: a
 *    `vi.spyOn(window, 'open')` replaces the global vitest copied out of that
 *    window, and an anchor's default action calls the instance's `open`,
 *    which the spy never sees (the road that reached cashtab.com). And
 *    `beforeSyncRequest` is required: a synchronous XHR runs its request in
 *    a child process, out of reach of layer 2.
 * 2. Node's sockets (http, https, `ws`, Node's own `fetch`): a connect to any
 *    host that is not loopback throws before a lookup or a packet. A call is
 *    a Unix socket only when `path` is a non-empty string; Node's http passes
 *    `path: null` beside the host.
 *
 * What this deliberately does not do: set happy-dom's
 * `navigation.disableChildPageNavigation`, `disableMainFrameNavigation` or
 * `disableJavaScriptFileLoading`. Each stops the road before the interceptor
 * sees it, so a test that clicks a live link would stay green and the road
 * would stay unseen.
 *
 * Proof: `no-test-reaches-the-network` (`src/test-no-network.test.ts` under
 * happy-dom, `src/test-no-network-node.test.ts` under node), on 127.0.0.1:9
 * alone. `strict` makes layer 2 refuse loopback too, so the socket cases are
 * proved without a single address off this machine.
 */
import net from 'node:net';
import { afterAll, afterEach } from 'vitest';

export type Reached = { road: string; to: string };

export type NoNetwork = {
    /** Every request refused since the last check, oldest first. */
    reached: Reached[];
    /** Layer 2 refuses loopback too (the self-test's switch). */
    strict: boolean;
    /** Throws, naming every URL, when anything was refused; empties the list. */
    check: () => void;
};

const KEY = Symbol.for('stall.noNetwork');
const LOOPBACK = /^(localhost|127(?:\.\d{1,3}){3}|::1|::ffff:127(?:\.\d{1,3}){3})$/i;

const store = globalThis as unknown as Record<symbol, NoNetwork | undefined>;
const guard: NoNetwork = (store[KEY] ??= {
    reached: [],
    strict: false,
    check(): void {
        if (this.reached.length > 0) {
            const made = this.reached.splice(0);
            throw new Error(`a test reached the network: ${made.map((r) => `${r.road} ${r.to}`).join(', ')}`);
        }
    },
});

type ConnectOptions = { host?: unknown; port?: unknown; path?: unknown };

/** Layer 2, once per process: a reused worker keeps the first wrapper. */
const proto = net.Socket.prototype as unknown as Record<string | symbol, unknown>;
if (proto[KEY] === undefined) {
    const original = proto.connect as (...args: unknown[]) => unknown;
    const guarded = function (this: net.Socket, ...args: unknown[]): unknown {
        // `net.connect()` hands the method its normalised `[options, cb]`;
        // otherwise Node's own rule: an object is the options, a string that
        // is not a number is a pipe, anything else a port with an optional
        // host after it.
        const first = Array.isArray(args[0]) ? (args[0] as unknown[])[0] : args[0];
        const opts: ConnectOptions =
            typeof first === 'object' && first !== null
                ? (first as ConnectOptions)
                : typeof first === 'string' && !(Number(first) >= 0)
                  ? { path: first }
                  : { port: first, host: typeof args[1] === 'string' ? args[1] : undefined };
        const pipe = typeof opts.path === 'string' && opts.path !== '';
        if (!pipe) {
            const host = String(opts.host ?? 'localhost').replace(/^\[|\]$/g, '');
            if (guard.strict || !LOOPBACK.test(host)) {
                const to = `${host}:${String(opts.port)}`;
                guard.reached.push({ road: 'socket', to });
                throw new Error(`a test reached the network: socket ${to}`);
            }
        }
        return original.apply(this, args);
    };
    proto.connect = guarded;
    proto[KEY] = guarded;
}

/** Layer 1, per file: each happy-dom file has its own browser. */
type Interceptable = {
    happyDOM?: { settings: { fetch: { interceptor: unknown } } };
};
const happy = (globalThis as unknown as Interceptable).happyDOM;
if (happy !== undefined) {
    const refused = 'refused by the no-network test guard';
    happy.settings.fetch.interceptor = {
        beforeAsyncRequest: async ({
            request,
            window,
        }: {
            request: { url: string };
            window: { Response: new (body: string, init: object) => unknown };
        }): Promise<unknown> => {
            guard.reached.push({ road: 'happy-dom', to: request.url });
            return new window.Response('', { status: 599, statusText: refused });
        },
        beforeSyncRequest: ({
            request,
            window,
        }: {
            request: { url: string };
            window: { Headers: new () => unknown };
        }): unknown => {
            guard.reached.push({ road: 'happy-dom sync', to: request.url });
            return {
                status: 599,
                statusText: refused,
                ok: false,
                url: request.url,
                redirected: false,
                headers: new window.Headers(),
                body: null,
            };
        },
    };
}

afterEach(() => guard.check());
afterAll(() => guard.check());
