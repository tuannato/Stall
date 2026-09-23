/**
 * The preview servers and headless Chromes that `layout-check.mjs`,
 * `print-measure.mjs`, the workshop kit (`workshop.mjs`) and `looks-diff.mjs`
 * start: each one its own process group, stopped whole on every way out, on
 * a port nothing else answered on.
 *
 * A child spawned `detached` leads its own process group, so the terminal's
 * Ctrl-C — sent to the foreground group — never reaches it. With cleanup only
 * in a `finally`, a Ctrl-C killed the script and left `vite preview` and a
 * `--no-sandbox` Chrome with its DevTools port open, on the ports the next
 * run uses; and a `--strictPort` preview that lost its port died silently
 * behind `stdio: 'ignore'` while the run measured whatever else was listening
 * there (the intake critic's item 2, 2026-09-23). So:
 *
 * - `refuseTakenPort` is asked before every spawn and throws, naming the
 *   port and how to find its holder, when something already answers there;
 * - `spawnGroup` keeps the tail of a child's stderr, and `earlyExit` says
 *   when a child is gone before it was asked to go, with that tail;
 * - `stopGroups` sends each group SIGTERM, then SIGKILL after `GRACE_MS`,
 *   waits until no process of any group is left, then runs the `onTeardown`
 *   cleanups (a Chrome profile) — one teardown, however many callers ask;
 * - `stopOnSignals` makes SIGINT, SIGTERM and SIGHUP do that and exit
 *   130 / 143 / 129, and a second signal while it runs changes nothing;
 * - and an `exit` listener SIGKILLs any group still up on every other way
 *   out (`process.exit`, an uncaught throw).
 *
 * What nothing can cover: a SIGKILL of the script itself runs no handler, so
 * its groups outlive it — the next run's `refuseTakenPort` is what says so.
 */
import { spawn } from 'node:child_process';
import { connect } from 'node:net';

const GRACE_MS = 2000;
/** How much of a child's stderr is kept for the sentence that says it died. */
const TAIL_CHARS = 4000;

const groups = new Set();
const cleanups = [];
let teardown;
let interrupted;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** True while any process of the group led by `pid` is left. */
function groupUp(pid) {
    try {
        process.kill(-pid, 0);
        return true;
    } catch (err) {
        return err.code === 'EPERM';
    }
}

function up(group) {
    return group.child.pid !== undefined && groupUp(group.child.pid);
}

function signalGroup(group, signal) {
    if (group.child.pid === undefined) return;
    try {
        process.kill(-group.child.pid, signal);
    } catch {
        // Already gone.
    }
}

/** A child's own words, fit for a terminal: controls escaped but the line breaks. */
function plain(text) {
    return text.replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g, (c) => `\\x${c.charCodeAt(0).toString(16).padStart(2, '0')}`);
}

/**
 * Start `command` as the leader of its own process group, in `cwd` when
 * given. stdin is never the terminal (a background group that reads it is
 * stopped by SIGTTIN);
 * stdout is `'ignore'` or `'inherit'`; stderr is kept as a tail
 * (`'tail'`, the default), or `'ignore'` / `'inherit'`.
 */
export function spawnGroup(name, command, args, { env = process.env, cwd, stdout = 'ignore', stderr = 'tail' } = {}) {
    const child = spawn(command, args, {
        detached: true,
        env,
        cwd,
        stdio: ['ignore', stdout, stderr === 'tail' ? 'pipe' : stderr],
    });
    const group = { name, child, tail: '', exit: undefined, stopping: false };
    if (stderr === 'tail') {
        child.stderr.setEncoding('utf8');
        child.stderr.on('data', (text) => {
            group.tail = (group.tail + text).slice(-TAIL_CHARS);
        });
    }
    child.on('error', (err) => {
        group.exit = `could not start (${err.code ?? err.message})`;
    });
    child.on('exit', (code, signal) => {
        group.exit = signal !== null ? `was killed by ${signal}` : `exited with code ${code}`;
    });
    groups.add(group);
    return group;
}

/** Why `group` is gone before it was asked to go, with the tail of its stderr — or undefined. */
export function earlyExit(group) {
    if (group === undefined || group.exit === undefined || group.stopping) return undefined;
    const tail = plain(group.tail.trim());
    return (
        `${group.name} ${group.exit} before the run was done` +
        (tail === '' ? '' : `; its stderr ended:\n${tail.replace(/^/gm, '    ')}`)
    );
}

/** Throw `earlyExit`'s sentence for the first of `list` that died early. */
export function requireAlive(list) {
    for (const group of list) {
        const why = earlyExit(group);
        if (why !== undefined) throw new Error(why);
    }
}

/**
 * Poll `check` until it answers something other than `undefined` / `false`,
 * failing at once when one of `groups` died and after `timeoutMs` otherwise.
 * A throw from `check` is "not up yet".
 */
export async function waitUntil(what, check, { watch = [], timeoutMs = 30_000, every = 200 } = {}) {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
        requireAlive(watch);
        try {
            const value = await check();
            if (value !== undefined && value !== false) return value;
        } catch {
            // Not up yet.
        }
        if (Date.now() > deadline) throw new Error(`${what} never came up`);
        await sleep(every);
    }
}

function answers(host, port) {
    return new Promise((resolve) => {
        const socket = connect({ host, port });
        const done = (value) => {
            socket.destroy();
            resolve(value);
        };
        // On loopback a port accepts or refuses at once; one that does
        // neither is not a port to start a server on either.
        socket.setTimeout(1000, () => done(true));
        socket.once('connect', () => done(true));
        socket.once('error', () => done(false));
    });
}

/**
 * Throw when `port` already answers on 127.0.0.1 or ::1 — a preview or a
 * Chrome an earlier run left behind, or anything else — rather than start a
 * server that would lose the port or a run that would talk to the holder.
 * Asked just before the spawn; a port taken in the moment between is the
 * spawned child's own failure, which `earlyExit` then reports.
 */
export async function refuseTakenPort(port, what) {
    for (const host of ['127.0.0.1', '::1']) {
        if (await answers(host, Number(port))) {
            throw new Error(
                `port ${port}, which the ${what} needs, already answers on ${host === '::1' ? '[::1]' : host} — ` +
                    'something is listening there, perhaps a preview or a Chrome an earlier run left behind. ' +
                    `See what holds it: ss -ltnp 'sport = :${port}'`,
            );
        }
    }
}

/** Run `fn` after every group is down (a Chrome profile to remove). */
export function onTeardown(fn) {
    cleanups.push(fn);
}

/** SIGTERM `list`, SIGKILL whatever outlives the grace, and forget every group that is down. */
async function stopList(list) {
    for (const group of list) {
        group.stopping = true;
        signalGroup(group, 'SIGTERM');
    }
    const graceEnds = Date.now() + GRACE_MS;
    while (list.some(up) && Date.now() < graceEnds) await sleep(50);
    for (const group of list) {
        if (up(group)) signalGroup(group, 'SIGKILL');
    }
    const killEnds = Date.now() + 2000;
    while (list.some(up) && Date.now() < killEnds) await sleep(50);
    for (const group of list) {
        if (!up(group)) groups.delete(group);
    }
}

/**
 * Stop one group mid-run — a preview whose port the next one needs — the
 * way `stopGroups` stops them all, and throw if any of it is still up.
 */
export async function stopGroup(group) {
    await stopList([group]);
    if (up(group)) throw new Error(`${group.name} would not stop`);
}

/** Stop every group — SIGTERM, then SIGKILL after the grace — and run the cleanups. One teardown at a time. */
export function stopGroups() {
    teardown ??= (async () => {
        await stopList([...groups]);
        for (const fn of cleanups.splice(0)) {
            try {
                await fn();
            } catch {
                // A cleanup is best effort; the groups are what must stop.
            }
        }
    })().finally(() => {
        teardown = undefined;
    });
    return teardown;
}

/** The exit code a caught signal asked for, or undefined. */
export function interruptedCode() {
    return interrupted;
}

/** SIGINT, SIGTERM and SIGHUP stop every group, then exit non-zero; `label` names the script. */
export function stopOnSignals(label) {
    for (const [signal, code] of [
        ['SIGINT', 130],
        ['SIGTERM', 143],
        ['SIGHUP', 129],
    ]) {
        process.on(signal, () => {
            if (interrupted !== undefined) return;
            interrupted = code;
            process.exitCode = code;
            console.error(`\n${label}: ${signal} — stopping what this run started, then exiting.`);
            stopGroups().finally(() => process.exit(code));
        });
    }
}

process.on('exit', () => {
    for (const group of groups) signalGroup(group, 'SIGKILL');
});
