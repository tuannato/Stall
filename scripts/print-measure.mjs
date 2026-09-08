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
 * print block changes rarely and the run costs a build.
 *
 * Usage: `node scripts/print-measure.mjs [screen ...]` (default: `pay-tag`
 * and `studio`'s poster is not a screen — the stall poster is measured as
 * `print` through the same fixture with its format forced).
 */
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = process.env.LAYOUT_PORT ?? '4321';
const DEVTOOLS_PORT = process.env.LAYOUT_CDP_PORT ?? '9341';
const CHROMES = ['google-chrome', 'chromium', 'chromium-browser', 'google-chrome-stable'];
const A4 = { width: 794, height: 1123 };
const screens = process.argv.slice(2).length > 0 ? process.argv.slice(2) : ['pay-tag'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

async function devtoolsUrl() {
    for (let i = 0; i < 60; i += 1) {
        try {
            const res = await fetch(`http://127.0.0.1:${DEVTOOLS_PORT}/json/version`);
            if (res.ok) return (await res.json()).webSocketDebuggerUrl;
        } catch {
            // Not listening yet.
        }
        await sleep(200);
    }
    throw new Error('print-measure: Chrome never opened its DevTools endpoint.');
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

const configPath = 'vite.config.ts';
const original = readFileSync(configPath, 'utf8');
const anchor = 'modulePreload: { polyfill: false },';
if (!original.includes(anchor)) {
    console.error('print-measure: could not find the build config anchor.');
    process.exit(1);
}
writeFileSync(
    configPath,
    original.replace(
        anchor,
        `${anchor}\n        rollupOptions: { input: { main: 'index.html', layoutProbe: 'layout/probe.html' } },`,
    ),
);

let server;
let browser;
let profile;
let failed = false;
try {
    const built = spawnSync('npx', ['vite', 'build', '--logLevel', 'error'], { stdio: 'inherit' });
    if (built.status !== 0) throw new Error('build failed');
    server = spawn('npx', ['vite', 'preview', '--port', PORT, '--strictPort'], {
        stdio: 'ignore',
        detached: true,
    });
    profile = mkdtempSync(join(tmpdir(), 'stall-print-'));
    browser = spawn(
        chromeBin,
        [
            '--headless=new',
            '--disable-gpu',
            '--no-sandbox',
            '--hide-scrollbars',
            `--user-data-dir=${profile}`,
            `--remote-debugging-port=${DEVTOOLS_PORT}`,
            'about:blank',
        ],
        { stdio: 'ignore', detached: true },
    );
    const cdp = devtools(await devtoolsUrl());
    await cdp.opened;
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    await sleep(3000);

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
        for (const theme of JSON.parse(themes)) {
            await evaluate(
                cdp,
                sessionId,
                `(async () => { window.__contrastPrepare(${JSON.stringify(screen)}, ${theme}, false); ` +
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
    failed = true;
} finally {
    writeFileSync(configPath, original);
    if (browser) {
        try {
            process.kill(-browser.pid);
        } catch {
            // Already gone.
        }
    }
    if (server) {
        try {
            process.kill(-server.pid);
        } catch {
            // Already gone.
        }
    }
    if (profile) rmSync(profile, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);
