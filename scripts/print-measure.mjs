#!/usr/bin/env node
/**
 * Print media is not measured by anything else in this repo (PROBE-RULES,
 * "Print media is not measured"): the layout probe runs under screen media,
 * and the `@media print` block — A4, `position: fixed`, no pagination — is
 * read only by tests that read declarations. This paints the poster screens
 * the probe already fixtures, switches the tab to emulated print media at A4
 * (794×1123 CSS px), and reports whether every node of the printed page sits
 * inside the sheet. A manual check, run by hand and recorded in
 * `private/MANUAL-CHECKS.md`; not part of `pnpm test:layout`, because the
 * print block changes rarely and the run costs a build. It builds and
 * previews from the probe's own config, `vite.probe.config.ts`, and never
 * writes the app's.
 *
 * Usage: `node scripts/print-measure.mjs [screen ...]` (default: `pay-tag`
 * and `studio`'s poster is not a screen — the stall poster is measured as
 * `print` through the same fixture with its format forced).
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
    earlyExit,
    interruptedCode,
    onTeardown,
    refuseTakenPort,
    spawnGroup,
    stopGroups,
    stopOnSignals,
    waitUntil,
} from './process-groups.mjs';

const PORT = process.env.LAYOUT_PORT ?? '4321';
const DEVTOOLS_PORT = process.env.LAYOUT_CDP_PORT ?? '9341';
const CHROMES = ['google-chrome', 'chromium', 'chromium-browser', 'google-chrome-stable'];
const A4 = { width: 794, height: 1123 };
const screens = process.argv.slice(2).length > 0 ? process.argv.slice(2) : ['pay-tag'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The preview and Chrome are process groups stopped whole on Ctrl-C and on
// every other way out, on ports nothing else answered on — `layout-check.mjs`'s
// rule and its reason (`process-groups.mjs`).
stopOnSignals('print-measure');

/*
 * Read, never written — `layout-check.mjs`'s tripwire and its reason: if the
 * app's config differs on the way out, something wrote it while this run built
 * from it, and the run fails saying so. Every way out but a signal runs the
 * `exit` listener, and `exitCode` set there overrides `process.exit`'s code.
 */
const APP_CONFIG = 'vite.config.ts';
const PROBE_CONFIG = 'vite.probe.config.ts';
const appConfigAtStart = readFileSync(APP_CONFIG);
process.on('exit', () => {
    let now;
    try {
        now = readFileSync(APP_CONFIG);
    } catch {
        now = undefined;
    }
    if (now === undefined || !now.equals(appConfigAtStart)) {
        console.error(
            `print-measure: FAILED — ${APP_CONFIG} changed while this run built from it. ` +
                'Nothing here writes it; find what did before trusting this run.',
        );
        process.exitCode = 1;
    }
});

function findChrome() {
    for (const bin of CHROMES) {
        if (spawnSync('which', [bin]).status === 0) return bin;
    }
    return undefined;
}

function devtools(url) {
    const ws = new WebSocket(url);
    let nextId = 1;
    const waiting = new Map();
    ws.addEventListener('message', (ev) => {
        const msg = JSON.parse(ev.data);
        const pending = msg.id !== undefined ? waiting.get(msg.id) : undefined;
        if (pending === undefined) return;
        waiting.delete(msg.id);
        if (msg.error) pending.reject(new Error(JSON.stringify(msg.error)));
        else pending.resolve(msg.result);
    });
    return {
        opened: new Promise((resolve, reject) => {
            ws.addEventListener('open', resolve, { once: true });
            ws.addEventListener('error', reject, { once: true });
        }),
        send(method, params = {}, sessionId) {
            const id = nextId++;
            return new Promise((resolve, reject) => {
                waiting.set(id, { resolve, reject });
                ws.send(JSON.stringify({ id, method, params, sessionId }));
            });
        },
        close: () => ws.close(),
    };
}

async function devtoolsUrl(watch) {
    return waitUntil(
        'Chrome\'s DevTools endpoint',
        async () => {
            const res = await fetch(`http://127.0.0.1:${DEVTOOLS_PORT}/json/version`);
            return res.ok ? (await res.json()).webSocketDebuggerUrl : undefined;
        },
        { watch, timeoutMs: 12_000 },
    );
}

async function evaluate(cdp, sessionId, expression) {
    const r = await cdp.send(
        'Runtime.evaluate',
        { expression, awaitPromise: true, returnByValue: true },
        sessionId,
    );
    if (r.exceptionDetails) {
        throw new Error(`page threw: ${JSON.stringify(r.exceptionDetails)}`);
    }
    return r.result.value;
}

async function waitForFlag(cdp, sessionId, flag) {
    for (let i = 0; i < 150; i += 1) {
        if ((await evaluate(cdp, sessionId, `window.${flag} === true`)) === true) return;
        await sleep(100);
    }
    throw new Error(`${flag} never became true`);
}

const chromeBin = findChrome();
if (chromeBin === undefined) {
    console.error('print-measure: no Chrome found.');
    process.exit(1);
}

let server;
let browser;
let failed = false;
try {
    const built = spawnSync('npx', ['vite', 'build', '--config', PROBE_CONFIG, '--logLevel', 'error'], {
        stdio: 'inherit',
    });
    if (built.status !== 0) throw new Error('build failed');
    await refuseTakenPort(PORT, 'preview server');
    await refuseTakenPort(DEVTOOLS_PORT, 'Chrome DevTools endpoint');
    server = spawnGroup('the preview server', 'npx', [
        'vite',
        'preview',
        '--config',
        PROBE_CONFIG,
        '--port',
        PORT,
        '--strictPort',
    ]);
    const profile = mkdtempSync(join(tmpdir(), 'stall-print-'));
    onTeardown(() => rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }));
    browser = spawnGroup(
        'Chrome',
        chromeBin,
        [
            '--headless=new',
            // Off the network, the layout probe's own rule (2026-09-20): a tag
            // page asks the icon host for a picture it must paint without.
            '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost',
            '--disable-gpu',
            '--no-sandbox',
            '--hide-scrollbars',
            `--user-data-dir=${profile}`,
            `--remote-debugging-port=${DEVTOOLS_PORT}`,
            'about:blank',
        ],
        { stderr: 'ignore' },
    );
    const cdp = devtools(await devtoolsUrl([server, browser]));
    await cdp.opened;
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    await waitUntil(
        'the preview server',
        async () => (await fetch(`http://localhost:${PORT}/layout/probe.html`)).ok,
        { watch: [server, browser] },
    );

    await cdp.send(
        'Emulation.setDeviceMetricsOverride',
        { width: A4.width, height: A4.height, deviceScaleFactor: 1, mobile: false },
        sessionId,
    );
    await cdp.send(
        'Page.navigate',
        { url: `http://localhost:${PORT}/layout/probe.html?viewport=page&screens=${screens.join(',')}` },
        sessionId,
    );
    await waitForFlag(cdp, sessionId, '__probeReady');
    const themes = await evaluate(cdp, sessionId, 'JSON.stringify(window.__themes)');

    for (const screen of screens) {
        for (const { id: theme } of JSON.parse(themes)) {
            await evaluate(
                cdp,
                sessionId,
                // Bare (flags 0), from the neutral screen, under a nonce of its own.
                `(async () => { window.__contrastPrepare(${JSON.stringify(screen)}, ${theme}, 0, true, 'print-measure'); ` +
                    `await document.fonts.ready; ` +
                    `await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res))); })()`,
            );
            await cdp.send('Emulation.setEmulatedMedia', { media: 'print' }, sessionId);
            const report = await evaluate(
                cdp,
                sessionId,
                `(async () => { await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));` +
                    `const page = document.querySelector('.poster-page');` +
                    `if (!page) return JSON.stringify({ page: null });` +
                    `const box = page.getBoundingClientRect();` +
                    `const kids = [...page.children].map((k) => { const r = k.getBoundingClientRect(); return { cls: k.className.baseVal ?? k.className, top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), h: Math.round(r.height) }; });` +
                    `return JSON.stringify({ page: { top: Math.round(box.top), bottom: Math.round(box.bottom), h: Math.round(box.height), scrollH: page.scrollHeight, pos: getComputedStyle(page).position, gap: getComputedStyle(page).gap }, kids }); })()`,
            );
            await cdp.send('Emulation.setEmulatedMedia', { media: '' }, sessionId);
            const r = JSON.parse(report);
            if (r.page === null) {
                console.log(`✗ ${screen} @ theme ${theme}: no .poster-page mounted`);
                failed = true;
                continue;
            }
            const first = r.kids[0];
            const last = r.kids[r.kids.length - 1];
            const used = last.bottom - first.top;
            const inside = first.top >= 0 && last.bottom <= A4.height && r.page.scrollH <= A4.height;
            const mark = inside ? '✓' : '✗';
            if (!inside) failed = true;
            console.log(
                `${mark} ${screen} @ theme ${theme}: ${r.kids.length} nodes, content ${first.top}→${last.bottom} (${used}px of ${A4.height}), page scrollHeight ${r.page.scrollH}, gap ${r.page.gap}`,
            );
            for (const k of r.kids) {
                const clip = k.top < 0 || k.bottom > A4.height ? '  ← outside the sheet' : '';
                console.log(`    ${String(k.cls).padEnd(16)} ${String(k.top).padStart(5)}→${String(k.bottom).padEnd(5)} h${k.h}${clip}`);
            }
        }
    }
    cdp.close();
} catch (err) {
    console.error(`print-measure: ${err.message}`);
    for (const group of [server, browser]) {
        const why = earlyExit(group);
        if (why !== undefined && !err.message.includes(why)) console.error(`print-measure: ${why}`);
    }
    failed = true;
} finally {
    await stopGroups();
}
process.exit(interruptedCode() ?? (failed ? 1 : 0));
