/**
 * `no-test-reaches-the-network`, under the node environment most of this
 * suite runs in: no happy-dom, so the Node half of the guard
 * (`scripts/no-network-guard.mjs`) is the whole of it. Loopback alone
 * (see the happy-dom half, `src/test-no-network.test.ts`): 127.0.0.1 under
 * `strict`, or 0.0.0.0 and ::, which the guard refuses as not loopback and
 * which, were a road to fail, reach this machine and nothing else; the one
 * name looked up besides `localhost` is 127.1, which the C library reads as
 * a number (127.0.0.1) and never asks a server for; and every DNS query is
 * aimed at a resolver on 127.0.0.1:9. Node's fetch refuses port 9 itself
 * (the fetch standard's bad-port list), so it would never reach a socket:
 * its case asks 127.0.0.1:2, not on that list.
 *
 * This file imports the Node half for three pure helpers and the staged
 * late switch, which installs its roads here too; the facade the setup file
 * alone publishes (`guard()`) is what the first case reads, so a setup line
 * gone still fails it.
 */
import { spawn, spawnSync } from 'node:child_process';
import dgram from 'node:dgram';
import dns from 'node:dns';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';
import { describe, expect, it } from 'vitest';
import { guardState, isLoopbackAddress, mayEmpty } from '../scripts/no-network-guard.mjs';
import type { NoNetwork } from './test-no-network';

const KEY = Symbol.for('stall.noNetwork');
const guard = (): NoNetwork => {
    const found = (globalThis as unknown as Record<symbol, NoNetwork | undefined>)[KEY];
    if (found === undefined) {
        throw new Error('the no-network guard is not installed: vite.config.ts test.setupFiles');
    }
    return found;
};
const drain = (): string[] => guard().drain();
const strictly = <T>(run: () => T): T => {
    guard().strict = true;
    try {
        return run();
    } finally {
        guard().strict = false;
    }
};
const settle = (ms = 50): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
/** A lookup that answers somewhere that is not loopback: 0.0.0.0, which is this machine were it ever connected to. */
const elsewhere = (_host: string, options: { all?: boolean }, cb: (...args: unknown[]) => void): void => {
    if (options.all === true) {
        cb(null, [{ address: '0.0.0.0', family: 4 }]);
    } else {
        cb(null, '0.0.0.0', 4);
    }
};
/** This repo carries no Node typings, and those it borrows give a Worker or a ChildProcess no events. */
type Emitter = { once: (event: string, listener: (...args: unknown[]) => void) => unknown };
const next = (target: unknown, event: string): Promise<unknown> =>
    new Promise((resolve, reject) => {
        (target as Emitter).once(event, (value) => resolve(value));
        (target as Emitter).once('error', (error) => reject(error));
    });
const lookupError = (hostname: string, options?: object): Promise<string> =>
    new Promise((resolve) => {
        dns.lookup(hostname, options ?? {}, (err) => resolve(String(err?.message)));
    });

describe('no-test-reaches-the-network', () => {
    it('is installed by the setup file under node too, as the Node half alone', () => {
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

    it('refuses a socket to an address that is not loopback, 0.0.0.0 and :: included', () => {
        expect(() => net.connect({ host: '0.0.0.0', port: 9 })).toThrow('a test reached the network: socket 0.0.0.0:9');
        expect(() => net.connect({ host: '::', port: 9 })).toThrow('a test reached the network: socket :::9');
        expect(drain()).toEqual(['socket 0.0.0.0:9', 'socket :::9']);
    });

    it('lets a Unix-domain socket through as this machine, and refuses it under strict', () => {
        // CRITIC-CARRYOVER-9 item 4: it passed unrecorded even under
        // strict. Refused before any connect, so no file need exist.
        const at = join(tmpdir(), `stall-no-network-${process.pid}.sock`);
        const sockets: net.Socket[] = [];
        try {
            strictly(() => {
                expect(() => sockets.push(net.connect({ path: at }))).toThrow(`a test reached the network: socket unix:${at}`);
                expect(() => sockets.push(net.connect(at))).toThrow(`a test reached the network: socket unix:${at}`);
            });
        } finally {
            for (const socket of sockets) {
                socket.on('error', () => undefined);
                socket.destroy();
            }
        }
        expect(drain()).toEqual([`socket unix:${at}`, `socket unix:${at}`]);
    });

    it('trusts localhost only when it resolves to loopback, a lookup option included', async () => {
        const errors: string[] = [];
        const socket = net.connect({ host: 'localhost', port: 9, lookup: elsewhere } as net.NetConnectOpts);
        socket.on('error', (e) => errors.push(e.message));
        const request = http.get({ host: 'localhost', port: 9, lookup: elsewhere } as http.RequestOptions);
        request.on('error', (e) => errors.push(e.message));
        await settle();
        expect(errors).toEqual([
            'a test reached the network: socket localhost -> 0.0.0.0',
            'a test reached the network: socket localhost -> 0.0.0.0',
        ]);
        expect(drain()).toEqual(['socket localhost -> 0.0.0.0', 'socket localhost -> 0.0.0.0']);
    });

    it('refuses dns.lookup for a name that is not localhost and an address that is not loopback', async () => {
        expect(await lookupError('127.1')).toBe('a test reached the network: dns 127.1');
        expect(await lookupError('0.0.0.0')).toBe('a test reached the network: dns 0.0.0.0');
        expect(await lookupError('::', { all: true })).toBe('a test reached the network: dns ::');
        await expect(dns.promises.lookup('127.1')).rejects.toThrow('a test reached the network: dns 127.1');
        guard().strict = true;
        try {
            expect(await lookupError('localhost')).toBe('a test reached the network: dns localhost');
        } finally {
            guard().strict = false;
        }
        expect(drain()).toEqual(['dns 127.1', 'dns 0.0.0.0', 'dns ::', 'dns 127.1', 'dns localhost']);
        // Loopback answers pass, a name read as loopback included.
        await expect(dns.promises.lookup('127.0.0.1')).resolves.toMatchObject({ address: '127.0.0.1' });
        expect(guard().reached).toEqual([]);
    });

    it('refuses every DNS query, whatever it asks', async () => {
        const servers = dns.getServers();
        const resolver = new dns.Resolver();
        resolver.setServers(['127.0.0.1:9']);
        dns.setServers(['127.0.0.1:9']);
        try {
            const viaModule = await new Promise<string>((resolve) =>
                dns.resolve4('localhost', (err) => resolve(String(err?.message))),
            );
            const viaResolver = await new Promise<string>((resolve) =>
                resolver.resolve4('localhost', (err) => resolve(String(err?.message))),
            );
            await expect(dns.promises.resolve4('localhost')).rejects.toThrow('a test reached the network: dns');
            expect(viaModule).toBe('a test reached the network: dns resolve4 localhost');
            expect(viaResolver).toBe('a test reached the network: dns resolve4 localhost');
        } finally {
            dns.setServers(servers);
        }
        expect(drain()).toEqual(['dns resolve4 localhost', 'dns resolve4 localhost', 'dns resolve4 localhost']);
    });

    it('refuses UDP to an address that is not loopback, and to loopback under strict', () => {
        const socket = dgram.createSocket('udp4');
        try {
            expect(() => socket.send(Buffer.from('x'), 9, '0.0.0.0')).toThrow('a test reached the network: udp 0.0.0.0:9');
            strictly(() => {
                expect(() => socket.send(Buffer.from('x'), 9, '127.0.0.1')).toThrow('a test reached the network: udp');
                expect(() => socket.send(Buffer.from('x'), 9, 'localhost')).toThrow('a test reached the network: udp');
            });
            expect(() => socket.connect(9, '0.0.0.0')).toThrow('a test reached the network: udp 0.0.0.0:9');
        } finally {
            socket.close();
        }
        expect(drain()).toEqual(['udp 0.0.0.0:9', 'udp 127.0.0.1:9', 'udp localhost:9', 'udp 0.0.0.0:9']);
    });

    it('refuses a multicast join but on a loopback interface named outright, and that too under strict', () => {
        // CRITIC-CARRYOVER-9 item 4: a join sends a membership report on
        // the interface it joins on. Strict first, on the loopback
        // interface: were the road open, that join is the one that stays on
        // this machine, and the case stops there.
        const socket = dgram.createSocket('udp4');
        try {
            strictly(() => {
                expect(() => socket.addMembership('239.255.0.9', '127.0.0.1')).toThrow(
                    'a test reached the network: udp-join 239.255.0.9 on 127.0.0.1',
                );
            });
            expect(() => socket.addMembership('239.255.0.9')).toThrow('a test reached the network: udp-join 239.255.0.9');
            expect(() => socket.addMembership('239.255.0.9', '0.0.0.0')).toThrow(
                'a test reached the network: udp-join 239.255.0.9 on 0.0.0.0',
            );
            expect(() => socket.addSourceSpecificMembership('127.0.0.1', '232.0.0.9')).toThrow(
                'a test reached the network: udp-join 232.0.0.9',
            );
        } finally {
            socket.close();
        }
        expect(drain()).toEqual([
            'udp-join 239.255.0.9 on 127.0.0.1',
            'udp-join 239.255.0.9',
            'udp-join 239.255.0.9 on 0.0.0.0',
            'udp-join 232.0.0.9',
        ]);
    });

    it('is loaded into a worker thread, however its execArgv and env are given, and reports back', async () => {
        const code = [
            "const { parentPort } = require('node:worker_threads');",
            "const net = require('node:net');",
            'let said = "";',
            "try { net.connect({ host: '0.0.0.0', port: 9 }); } catch (e) { said = e.message; }",
            "parentPort.postMessage([net.Socket.prototype.connect === net.Socket.prototype[Symbol.for('stall.noNetwork')], said]);",
        ].join('\n');
        for (const options of [{}, { execArgv: [], env: {} }]) {
            const worker = new Worker(code, { eval: true, ...options });
            const answer = await next(worker, 'message');
            void worker.terminate();
            expect(answer).toEqual([true, 'a test reached the network: socket 0.0.0.0:9']);
        }
        const name = 'no-test-reaches-the-network > is loaded into a worker thread, however its execArgv and env are given, and reports back';
        expect(guard().reached.map((r) => [r.road, r.to, r.origin])).toEqual([
            ['socket (child)', '0.0.0.0:9', name],
            ['socket (child)', '0.0.0.0:9', name],
        ]);
        drain();
    });

    it('is loaded into a Node child process, however it is spawned and its env given, and reports back', async () => {
        const code = "require('node:net').connect({ host: '0.0.0.0', port: 9 })";
        const sync = spawnSync(process.execPath, ['-e', code], { encoding: 'utf8' });
        expect(sync.status).not.toBe(0);
        expect(sync.stderr).toContain('a test reached the network: socket 0.0.0.0:9');
        // An env that names no NODE_OPTIONS at all.
        const bare = spawnSync(process.execPath, ['-e', code], { encoding: 'utf8', env: { PATH: process.env.PATH } });
        expect(bare.stderr).toContain('a test reached the network: socket 0.0.0.0:9');
        const async = await next(spawn(process.execPath, ['-e', code], { env: {}, stdio: 'ignore' }), 'exit');
        expect(async).not.toBe(0);
        expect(guard().reached.map((r) => `${r.road} ${r.to}`)).toEqual([
            'socket (child) 0.0.0.0:9',
            'socket (child) 0.0.0.0:9',
            'socket (child) 0.0.0.0:9',
        ]);
        drain();
    });

    it('keeps the record out of a test’s reach: a copy to read, and only these two files may empty it', () => {
        strictly(() => {
            expect(() => net.connect({ host: '127.0.0.1', port: 9 })).toThrow();
        });
        const copy = guard().reached as unknown as unknown[];
        expect(Object.isFrozen(copy)).toBe(true);
        expect(() => copy.splice(0)).toThrow(TypeError);
        expect(guard().reached).toHaveLength(1);
        expect(mayEmpty('/repo/src/test-no-network-node.test.ts')).toBe(true);
        expect(mayEmpty('/repo/src/test-no-network.test.ts')).toBe(true);
        expect(mayEmpty('/repo/src/app.test.ts')).toBe(false);
        expect(mayEmpty('/repo/layout/src/test-no-network.test.ts.bak')).toBe(false);
        expect(mayEmpty(undefined)).toBe(false);
        expect(drain()).toEqual(['socket 127.0.0.1:9']);
    });

    it('a request started by a test that returned', () => {
        // Fired after this test returns; the next test names it.
        setTimeout(() => {
            try {
                net.connect({ host: '0.0.0.0', port: 9 });
            } catch {
                // Refused, and recorded.
            }
        }, 10);
    });

    it('is reported against the test that started it', async () => {
        await settle();
        expect(() => guard().check()).toThrow(
            'a test reached the network: socket 0.0.0.0:9 (started by "no-test-reaches-the-network > a request started by a test that returned", after it returned)',
        );
    });

    it('after the file’s last hook, a request fails the file through vitest’s own handler', async () => {
        // The switch the setup file's last hook throws is staged here, in
        // place: the late handler throws on the next tick, and this test
        // stands in for vitest's handler to read it.
        const state = guardState();
        const thrown = new Promise<string>((resolve) => {
            process.once('uncaughtException', (error) => resolve(error.message));
        });
        state.closed = true;
        try {
            expect(() => net.connect({ host: '0.0.0.0', port: 9 })).toThrow();
        } finally {
            state.closed = false;
        }
        expect(await Promise.race([thrown, settle(1_000).then(() => 'nothing was thrown')])).toBe(
            "a request reached the network after this file's last hook: socket 0.0.0.0:9 (started by \"no-test-reaches-the-network > after the file’s last hook, a request fails the file through vitest’s own handler\", after it returned)",
        );
        drain();
    });
});

describe('nothing-but-the-guard-touches-the-guard', () => {
    /**
     * The record is drained, and the roads unwrapped, only by the guard and
     * its self-tests: no other file names the guard's key, imports its Node
     * half or its environment, or touches happy-dom's interceptor, a socket
     * prototype or the builtin export sync the guard relies on.
     */
    const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
    const GUARD = new Set([
        'src/test-no-network.ts',
        'src/test-no-network.test.ts',
        'src/test-no-network-node.test.ts',
        'scripts/no-network-guard.mjs',
        'scripts/no-network-guard.d.mts',
    ]);
    const TOUCHES = /stall\.noNetwork|no-network-guard|STALL_NO_NETWORK|fetch\.interceptor|Socket\.prototype|ChildProcess\.prototype|syncBuiltinESMExports/;
    const walk = (dir: string): string[] =>
        readdirSync(join(ROOT, dir)).flatMap((name) => {
            const rel = `${dir}/${name}`;
            if (name === 'node_modules' || name.startsWith('.')) {
                return [];
            }
            return statSync(join(ROOT, rel)).isDirectory() ? walk(rel) : /\.(?:[cm]?[jt]s|tsx)$/.test(name) ? [rel] : [];
        });

    it('finds them in the guard alone', () => {
        const files = [
            ...['src', 'layout', 'scripts', 'functions', 'worker-icons', 'workshop'].flatMap(walk),
            ...readdirSync(ROOT).filter((name) => /^vite.*\.ts$/.test(name)),
        ];
        expect(files.length).toBeGreaterThan(100);
        const touching = files.filter((file) => !GUARD.has(file) && TOUCHES.test(readFileSync(join(ROOT, file), 'utf8')));
        expect(touching).toEqual([]);
        for (const file of GUARD) {
            expect(files, 'the walk sees the guard itself').toContain(file);
        }
    });

    it('sees a file that touches them', () => {
        for (const line of [
            "const g = globalThis[Symbol.for('stall.noNetwork')];",
            "import { guardState } from '../scripts/no-network-guard.mjs';",
            'happyDOM.settings.fetch.interceptor = null;',
            'net.Socket.prototype.connect = connect;',
            "process.env.STALL_NO_NETWORK_REPORT = '';",
        ]) {
            expect(line).toMatch(TOUCHES);
        }
    });

    it('reads a loopback literal as loopback and nothing else', () => {
        for (const yes of ['127.0.0.1', '127.1.2.3', '::1', '[::1]', '::ffff:127.0.0.1']) {
            expect(isLoopbackAddress(yes), yes).toBe(true);
        }
        for (const no of ['localhost', '0.0.0.0', '::', '10.0.0.1', '::ffff:10.0.0.1', '127.1', '']) {
            expect(isLoopbackAddress(no), no).toBe(false);
        }
    });
});
