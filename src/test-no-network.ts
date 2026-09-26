/**
 * No test reaches the network. Registered in `vite.config.ts`'s
 * `test.setupFiles`, so it runs before every test file vitest collects.
 *
 * Two layers, both recording, and a test that left a record fails in the
 * `afterEach` below, naming the URL — and, for a request a test started and
 * that fired after it returned (a timer, a promise it never awaited), the
 * test that started it, since the test that is running is not the one to
 * blame. A request after the file's last hook fails the file.
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
 * 2. Node (`scripts/no-network-guard.mjs`, its own docblock says each road):
 *    sockets, `dns`, `dgram`, and every worker thread and Node child process
 *    a test starts, which load the same guard and report back through a
 *    file this worker reads at every check.
 *
 * **Which test started a request** rides an `AsyncLocalStorage` entered at
 * each test's start (and a marker for the hooks between them), so a timer or
 * a promise a test left keeps its test's name; a child or a worker is handed
 * the name at its spawn.
 *
 * **The record is not a test's to empty.** `reached` is a copy; `drain` and
 * `check` answer only inside the guard's own self-tests
 * (`SELF_TESTS`), and nothing else in the tree names the guard's key, its
 * Node half, happy-dom's interceptor or a socket prototype
 * (`nothing-but-the-guard-touches-the-guard`).
 *
 * **After the file's last hook** nothing checks again, so a refusal then is
 * thrown on the next tick, where vitest's own handler reports it as an
 * unhandled error of this file and the run fails. The worker is torn down a
 * few milliseconds after that hook (measured: alive at 5 ms, gone by 20 ms),
 * and a request that would fire later never fires.
 *
 * What this deliberately does not do: set happy-dom's
 * `navigation.disableChildPageNavigation`, `disableMainFrameNavigation` or
 * `disableJavaScriptFileLoading`. Each stops the road before the interceptor
 * sees it, so a test that clicks a live link would stay green and the road
 * would stay unseen.
 *
 * Proof: `no-test-reaches-the-network` (`src/test-no-network.test.ts` under
 * happy-dom, `src/test-no-network-node.test.ts` under node), on loopback
 * alone — 127.0.0.1:9, or 0.0.0.0 and ::, which the guard refuses as not
 * loopback and which, were a layer to fail, go nowhere off this machine.
 * `strict` makes layer 2 refuse loopback too.
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, expect } from 'vitest';
import {
    collectReports,
    installNoNetwork,
    mayEmpty,
    REPORT_ENV,
    refuse,
    SELF_TESTS,
    type Refusal,
} from '../scripts/no-network-guard.mjs';

export type Reached = Refusal;

export type NoNetwork = {
    /** Every request refused since the last check, oldest first: a copy. */
    readonly reached: readonly Reached[];
    /** Every road refuses loopback too (the self-tests' switch). */
    strict: boolean;
    /** Empties the record and says what was in it. The guard's own self-tests alone. */
    drain: () => string[];
    /** Throws, naming every URL, when anything was refused; empties the record. The self-tests alone. */
    check: () => void;
};

const KEY = Symbol.for('stall.noNetwork');

const guard = installNoNetwork();
guard.reader = true;
// A process that runs a second file keeps its state: this file is open again.
guard.closed = false;
if (guard.reportFile === undefined) {
    guard.reportFile = path.join(os.tmpdir(), `stall-no-network-${process.pid}-${Date.now()}.jsonl`);
}
process.env[REPORT_ENV] = guard.reportFile;

/** Between tests, and in `beforeAll` / `afterAll`: no test is running. */
const IN_A_HOOK = '\u0000hook';
const running = new AsyncLocalStorage<string>();
guard.originOf = () => {
    const test = running.getStore();
    return test === undefined || test === IN_A_HOOK ? undefined : test;
};
let current: string | undefined;

const take = (): Reached[] => {
    collectReports();
    return guard.records.splice(0);
};
const said = (refusal: Reached, test: string | undefined): string =>
    refusal.origin !== undefined && refusal.origin !== test
        ? `${refusal.road} ${refusal.to} (started by "${refusal.origin}", after it returned)`
        : `${refusal.road} ${refusal.to}`;
const checkFor = (test: string | undefined): void => {
    const made = take();
    if (made.length > 0) {
        throw new Error(`a test reached the network: ${made.map((r) => said(r, test)).join(', ')}`);
    }
};
/** Only the guard's own self-tests may empty the record by hand (`mayEmpty`). */
const selfTestOnly = (what: string): void => {
    if (!mayEmpty(expect.getState().testPath)) {
        throw new Error(`the no-network record is not a test's to ${what}: only ${SELF_TESTS.join(' and ')} may`);
    }
};
/**
 * After the file's last hook (`closed`), a refusal is thrown on the next
 * tick: vitest's own handler reports it as an unhandled error of this file,
 * and the run fails.
 */
guard.onLate = (refusal) => {
    process.nextTick(() => {
        throw new Error(`a request reached the network after this file's last hook: ${said(refusal, undefined)}`);
    });
};

const facade: NoNetwork = {
    get reached(): readonly Reached[] {
        collectReports();
        return Object.freeze(guard.records.map((r) => Object.freeze({ ...r })));
    },
    get strict(): boolean {
        return guard.strict;
    },
    set strict(value: boolean) {
        guard.strict = value;
    },
    drain(): string[] {
        selfTestOnly('drain');
        return take().map((r) => `${r.road} ${r.to}`);
    },
    check(): void {
        selfTestOnly('check');
        checkFor(current);
    },
};
(globalThis as unknown as Record<symbol, NoNetwork>)[KEY] = facade;

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
            refuse('happy-dom', request.url);
            return new window.Response('', { status: 599, statusText: refused });
        },
        beforeSyncRequest: ({
            request,
            window,
        }: {
            request: { url: string };
            window: { Headers: new () => unknown };
        }): unknown => {
            refuse('happy-dom sync', request.url);
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

beforeAll(() => {
    running.enterWith(IN_A_HOOK);
});
beforeEach(() => {
    current = expect.getState().currentTestName ?? '(unnamed test)';
    running.enterWith(current);
});
// Registered first, so vitest runs it last among the afterEach hooks, after
// the test's own (`sequence.hooks: 'stack'`), and this afterAll last of all.
afterEach(() => {
    try {
        checkFor(current);
    } finally {
        current = undefined;
        running.enterWith(IN_A_HOOK);
    }
});
afterAll(() => {
    try {
        checkFor(undefined);
    } finally {
        guard.closed = true;
        if (guard.reportFile !== undefined) {
            fs.rmSync(guard.reportFile, { force: true });
            guard.readAt = 0;
        }
    }
});
