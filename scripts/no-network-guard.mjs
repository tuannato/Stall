/**
 * The Node half of `no-test-reaches-the-network` (`src/test-no-network.ts` is
 * the vitest half, and the only importer besides the guard's own self-tests).
 *
 * Plain Node ESM and no vitest, because it runs in three places:
 * 1. the vitest worker, installed by the setup file before any test file;
 * 2. every Node child process a test starts, through `NODE_OPTIONS`
 *    (`--require` of this file: Node 22 loads an ES module with no top-level
 *    await synchronously, before the child's own entry, CommonJS or ESM);
 * 3. every worker thread a test starts, through the worker's `execArgv`
 *    (`--require` again: an `--import` does not run before an `eval` worker).
 *
 * Every road refuses before anything is sent, and records what it refused:
 * - sockets (`net.Socket.prototype.connect`, under http, https, tls, http2,
 *   Node's `fetch` and `WebSocket`): a host that is a loopback IP literal
 *   goes through; the name `localhost` goes through only when every address
 *   it resolves to is loopback, checked on the lookup's own answer (a
 *   `lookup` option included); any other host is refused;
 * - `dns.lookup` (and its promise form): a loopback literal, or `localhost`
 *   answered with loopback only; every other name or address is refused.
 *   `resolve*`, `reverse`, `lookupService` and every `Resolver` query a DNS
 *   server whatever they are asked, and are refused outright;
 * - `dgram` (UDP): `send` and `connect` to a loopback literal, or to
 *   `localhost`, which is sent to the socket family's own loopback literal;
 *   every other address is refused;
 * - worker threads and Node child processes: this file is injected into
 *   each (`execArgv`, `NODE_OPTIONS`), with where to report and which test
 *   started it, and every spawn road re-injects it however its `env` was
 *   passed.
 *
 * A child or a worker has no test to fail: it appends each refusal to the
 * report file the vitest worker named (`STALL_NO_NETWORK_REPORT`) and the
 * vitest half reads it at its next check; and a child left with a refusal
 * exits non-zero, saying so on stderr.
 *
 * `strict` refuses loopback too, which is how the self-tests prove each
 * road refused without one address off this machine.
 */
import childProcess from 'node:child_process';
import dgram from 'node:dgram';
import dns from 'node:dns';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import workerThreads from 'node:worker_threads';

/** Where a child or a worker appends what it refused, one JSON line each. */
export const REPORT_ENV = 'STALL_NO_NETWORK_REPORT';
/** The test that started a child or a worker, so its refusal names it. */
export const ORIGIN_ENV = 'STALL_NO_NETWORK_ORIGIN';

const SELF = fileURLToPath(import.meta.url);
const REQUIRE_FLAG = SELF.includes(' ') ? `--require="${SELF}"` : `--require=${SELF}`;

/** Process- (or thread-) wide state, found again by a second instance of this module. */
const STATE = Symbol.for('stall.noNetwork.state');

/**
 * @typedef {{ road: string, to: string, origin?: string }} Refusal
 * @typedef {{
 *   records: Refusal[],
 *   strict: boolean,
 *   closed: boolean,
 *   reader: boolean,
 *   reportFile: string | undefined,
 *   readAt: number,
 *   originOf: () => string | undefined,
 *   onLate: (refusal: Refusal) => void,
 *   installed: boolean,
 * }} GuardState
 */

/** @returns {GuardState} */
function state() {
    const store = /** @type {Record<symbol, GuardState | undefined>} */ (/** @type {unknown} */ (globalThis));
    return (store[STATE] ??= {
        records: [],
        strict: false,
        closed: false,
        reader: false,
        reportFile: process.env[REPORT_ENV] || undefined,
        readAt: 0,
        originOf: () => process.env[ORIGIN_ENV] || undefined,
        onLate: () => undefined,
        installed: false,
    });
}

/** The only files that may empty the record by hand: the guard's own self-tests. */
export const SELF_TESTS = Object.freeze(['src/test-no-network.test.ts', 'src/test-no-network-node.test.ts']);

/** Whether the test file at `testPath` may empty the record (`SELF_TESTS`). */
export function mayEmpty(testPath) {
    if (typeof testPath !== 'string') {
        return false;
    }
    const file = testPath.replace(/\\/g, '/');
    return SELF_TESTS.some((self) => file.endsWith(`/${self}`));
}

/** A loopback IP literal: 127/8, ::1, or 127/8 mapped into IPv6. Never a name, never 0.0.0.0 or ::. */
export function isLoopbackAddress(address) {
    const bare = String(address).replace(/^\[|\]$/g, '');
    const family = net.isIP(bare);
    if (family === 4) {
        return bare.startsWith('127.');
    }
    if (family === 6) {
        const lower = bare.toLowerCase();
        if (lower === '::1' || lower === '0:0:0:0:0:0:0:1') {
            return true;
        }
        const mapped = /^(?:0:0:0:0:0:|::)ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(lower);
        return mapped !== null && mapped[1].startsWith('127.');
    }
    return false;
}

/**
 * Record a refusal and return the error the road throws or hands back. In
 * a child or a worker, the refusal is appended to the report file too. After
 * the vitest file's last hook (`closed`), nothing checks the record again,
 * so the late refusal is handed to `onLate`, which fails the file.
 */
export function refuse(road, to) {
    const s = state();
    const origin = s.originOf();
    /** @type {Refusal} */
    const refusal = origin === undefined ? { road, to } : { road, to, origin };
    s.records.push(refusal);
    if (!s.reader && s.reportFile !== undefined) {
        try {
            fs.appendFileSync(s.reportFile, `${JSON.stringify(refusal)}\n`);
        } catch {
            // The exit hook below still says so.
        }
    }
    if (s.closed) {
        s.onLate(refusal);
    }
    return new Error(`a test reached the network: ${road} ${to}`);
}

/**
 * The name `localhost`, trusted only when its lookup answers loopback: the
 * lookup is wrapped, and an answer holding any other address is refused
 * before a connect or a packet.
 */
function checkedLookup(lookup, road) {
    return function (hostname, options, callback) {
        const cb = typeof options === 'function' ? options : callback;
        const opts = typeof options === 'function' ? {} : options;
        return lookup.call(this, hostname, opts, (err, address, family) => {
            if (err) {
                cb(err, address, family);
                return;
            }
            const all = Array.isArray(address) ? address.map((a) => a.address) : [address];
            const off = all.filter((a) => !isLoopbackAddress(a));
            if (off.length > 0) {
                cb(refuse(road, `${hostname} -> ${off.join(', ')}`));
                return;
            }
            cb(err, address, family);
        });
    };
}

function installSockets(s) {
    const proto = /** @type {Record<string | symbol, unknown>} */ (/** @type {unknown} */ (net.Socket.prototype));
    const original = /** @type {(...args: unknown[]) => unknown} */ (proto.connect);
    proto.connect = function guardedConnect(...args) {
        // `net.connect()` hands the method its normalised `[options, cb]`;
        // otherwise Node's own rule: an object is the options, a string
        // that is not a number is a pipe, anything else a port with an
        // optional host after it.
        const first = Array.isArray(args[0]) ? args[0][0] : args[0];
        const opts =
            typeof first === 'object' && first !== null
                ? first
                : typeof first === 'string' && !(Number(first) >= 0)
                  ? { path: first }
                  : { port: first, host: typeof args[1] === 'string' ? args[1] : undefined };
        // A Unix socket only when `path` is a non-empty string: Node's http
        // passes `path: null` beside the host.
        const pipe = typeof opts.path === 'string' && opts.path !== '';
        if (!pipe) {
            const host = String(opts.host ?? 'localhost').replace(/^\[|\]$/g, '');
            const to = `${host}:${String(opts.port)}`;
            if (s.strict) {
                throw refuse('socket', to);
            }
            if (net.isIP(host) !== 0) {
                if (!isLoopbackAddress(host)) {
                    throw refuse('socket', to);
                }
            } else if (host.toLowerCase() === 'localhost') {
                // Trusted only on its answer: a `lookup` option decides the
                // address, and the positional form goes through `dns.lookup`,
                // which is wrapped below.
                if (typeof first === 'object' && first !== null) {
                    first.lookup = checkedLookup(first.lookup ?? dns.lookup, 'socket');
                }
            } else {
                throw refuse('socket', to);
            }
        }
        return original.apply(this, args);
    };
    // The mark the self-tests read: the connect in place is this guard's.
    proto[Symbol.for('stall.noNetwork')] = proto.connect;
}

function installDns(s) {
    const lookup = dns.lookup;
    const refusedLookup = (hostname) =>
        s.strict || (net.isIP(String(hostname)) !== 0 ? !isLoopbackAddress(hostname) : String(hostname).toLowerCase() !== 'localhost');
    dns.lookup = function guardedLookup(hostname, options, callback) {
        const cb = typeof options === 'function' ? options : callback;
        if (refusedLookup(hostname)) {
            const error = refuse('dns', String(hostname));
            process.nextTick(() => cb(error));
            return {};
        }
        return checkedLookup(lookup, 'dns').call(this, hostname, typeof options === 'function' ? {} : options, cb);
    };
    const promises = dns.promises;
    const promiseLookup = promises.lookup;
    promises.lookup = function guardedPromiseLookup(hostname, options) {
        if (refusedLookup(hostname)) {
            return Promise.reject(refuse('dns', String(hostname)));
        }
        return promiseLookup.call(this, hostname, options).then((answer) => {
            const all = Array.isArray(answer) ? answer.map((a) => a.address) : [answer.address];
            const off = all.filter((a) => !isLoopbackAddress(a));
            if (off.length > 0) {
                throw refuse('dns', `${hostname} -> ${off.join(', ')}`);
            }
            return answer;
        });
    };
    // Every query a DNS server answers, whatever it is asked.
    const queries = Object.keys(dns).filter((name) => /^resolve|^reverse$|^lookupService$/.test(name));
    for (const name of queries) {
        dns[name] = (...args) => {
            const error = refuse('dns', `${name} ${String(args[0])}`);
            const cb = args.find((a) => typeof a === 'function');
            if (cb !== undefined) {
                process.nextTick(() => cb(error));
                return undefined;
            }
            throw error;
        };
    }
    for (const name of Object.keys(promises).filter((n) => /^resolve|^reverse$|^lookupService$/.test(n))) {
        promises[name] = (...args) => Promise.reject(refuse('dns', `${name} ${String(args[0])}`));
    }
    for (const Resolver of [dns.Resolver, promises.Resolver]) {
        for (const name of Object.getOwnPropertyNames(Resolver.prototype)) {
            if (/^resolve|^reverse$/.test(name)) {
                Resolver.prototype[name] = function (...args) {
                    const error = refuse('dns', `${name} ${String(args[0])}`);
                    const cb = args.find((a) => typeof a === 'function');
                    if (cb !== undefined) {
                        process.nextTick(() => cb(error));
                        return undefined;
                    }
                    return Promise.reject(error);
                };
            }
        }
    }
}

function installDgram(s) {
    const proto = dgram.Socket.prototype;
    /** The address a datagram goes to: `localhost` becomes the family's own loopback literal. */
    const aimed = (socket, address) => {
        if (address === undefined || address === null || address === '') {
            return { address, to: undefined };
        }
        const bare = String(address);
        if (net.isIP(bare) !== 0) {
            return { address, to: isLoopbackAddress(bare) ? undefined : bare };
        }
        if (bare.toLowerCase() === 'localhost') {
            return { address: socket.type === 'udp6' ? '::1' : '127.0.0.1', to: undefined };
        }
        return { address, to: bare };
    };
    const send = proto.send;
    proto.send = function guardedSend(msg, ...rest) {
        // send(msg, [offset, length,] port [, address] [, callback]): the
        // address is the first string after the port.
        const index = rest.findIndex((a) => typeof a === 'string');
        const target = index === -1 ? { address: undefined, to: undefined } : aimed(this, rest[index]);
        if (s.strict || target.to !== undefined) {
            const port = rest.find((a) => typeof a === 'number');
            throw refuse('udp', `${target.to ?? rest[index] ?? 'loopback'}:${String(port)}`);
        }
        if (index !== -1) {
            rest[index] = target.address;
        }
        return send.call(this, msg, ...rest);
    };
    const connect = proto.connect;
    proto.connect = function guardedConnect(port, address, callback) {
        const given = typeof address === 'string' ? address : undefined;
        const target = aimed(this, given);
        if (s.strict || target.to !== undefined) {
            throw refuse('udp', `${target.to ?? given ?? 'loopback'}:${String(port)}`);
        }
        return typeof address === 'string'
            ? connect.call(this, port, target.address, callback)
            : connect.call(this, port, address, callback);
    };
}

/** The environment a child or a worker gets: this guard injected, where to report, and who started it. */
function guardedEnv(env) {
    const s = state();
    const base = { ...env };
    const options = String(base.NODE_OPTIONS ?? '');
    base.NODE_OPTIONS = options.includes(REQUIRE_FLAG) ? options : `${options} ${REQUIRE_FLAG}`.trim();
    if (s.reportFile !== undefined) {
        base[REPORT_ENV] = s.reportFile;
    }
    const origin = s.originOf();
    if (origin !== undefined) {
        base[ORIGIN_ENV] = origin;
    } else {
        delete base[ORIGIN_ENV];
    }
    return base;
}

function installChildren() {
    // The asynchronous roads (spawn, exec, execFile, fork) all end in this
    // method, handed the environment as `envPairs` however `env` was given.
    const ChildProcess = childProcess.ChildProcess;
    const spawn = ChildProcess.prototype.spawn;
    ChildProcess.prototype.spawn = function guardedSpawn(options) {
        if (options !== null && typeof options === 'object' && Array.isArray(options.envPairs)) {
            const env = {};
            for (const pair of options.envPairs) {
                const at = String(pair).indexOf('=');
                if (at > 0) {
                    env[String(pair).slice(0, at)] = String(pair).slice(at + 1);
                }
            }
            options.envPairs = Object.entries(guardedEnv(env)).map(([key, value]) => `${key}=${value}`);
        }
        return spawn.call(this, options);
    };
    // The synchronous ones do not: each takes its options where they are
    // given, and an `env` passed there replaces the process's.
    for (const name of ['spawnSync', 'execSync', 'execFileSync']) {
        const run = childProcess[name];
        childProcess[name] = function (...args) {
            const at = args.findIndex(
                (a, i) => i > 0 && typeof a === 'object' && a !== null && !Array.isArray(a),
            );
            if (at === -1) {
                args.splice(name === 'execSync' ? 1 : Array.isArray(args[1]) ? 2 : 1, 0, { env: guardedEnv(process.env) });
            } else {
                args[at] = { ...args[at], env: guardedEnv(args[at].env ?? process.env) };
            }
            return run.apply(this, args);
        };
    }
}

function installWorkers() {
    const Worker = workerThreads.Worker;
    class GuardedWorker extends Worker {
        constructor(filename, options = {}) {
            const execArgv = options.execArgv ?? process.execArgv;
            const env =
                options.env === workerThreads.SHARE_ENV ? options.env : guardedEnv(options.env ?? process.env);
            super(filename, {
                ...options,
                execArgv: execArgv.includes(REQUIRE_FLAG) ? execArgv : [...execArgv, REQUIRE_FLAG],
                env,
            });
        }
    }
    workerThreads.Worker = GuardedWorker;
}

/**
 * Install every road once in this process or thread. The vitest half calls
 * it with `reader` set; a child or a worker gets it by loading this file.
 */
export function installNoNetwork() {
    const s = state();
    if (!s.installed) {
        s.installed = true;
        installSockets(s);
        installDns(s);
        installDgram(s);
        installChildren();
        installWorkers();
        syncBuiltinESMExports();
    }
    return s;
}

/** The vitest half's handle: the state, and every refusal a child or a worker reported since the last read. */
export function guardState() {
    return state();
}

/** Move what children and workers appended to the report file into the record. */
export function collectReports() {
    const s = state();
    if (!s.reader || s.reportFile === undefined) {
        return;
    }
    let text = '';
    try {
        text = fs.readFileSync(s.reportFile, 'utf8');
    } catch {
        return;
    }
    const fresh = text.slice(s.readAt);
    s.readAt = text.length;
    for (const line of fresh.split('\n')) {
        if (line.trim() !== '') {
            try {
                const refusal = JSON.parse(line);
                s.records.push({ road: `${String(refusal.road)} (child)`, to: String(refusal.to), ...(refusal.origin ? { origin: String(refusal.origin) } : {}) });
            } catch {
                s.records.push({ road: 'child', to: line });
            }
        }
    }
}

// Loaded by `--require` into a child or a worker: installed, and a child
// left with a refusal fails, saying so on stderr. Imported by the vitest
// half, it installs too; that half then marks itself the reader, and a
// reader's record is its own tests' to fail.
const loaded = installNoNetwork();
if (!loaded.reader && workerThreads.isMainThread) {
    process.on('exit', (code) => {
        if (loaded.reader || loaded.records.length === 0 || code !== 0) {
            return;
        }
        process.stderr.write(
            `a test reached the network: ${loaded.records.map((r) => `${r.road} ${r.to}`).join(', ')}\n`,
        );
        process.exitCode = 1;
    });
}
