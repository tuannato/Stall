#!/usr/bin/env node
/**
 * The rendered-output guard. `CLAUDE.md` §6 says the rule that nothing we ship
 * may cover the asked amount "needs a test that reads rendered output, and
 * happy-dom does not lay out — it wants a real browser in the loop."
 *
 * This is that loop. It builds the app with `layout/probe.html` as a second
 * entry, serves `dist`, and drives headless Chrome at each viewport. The page
 * measures itself and writes a verdict; this reads it back out of the page.
 * No new dependency: Chrome is the only thing it needs, and a missing Chrome is
 * a failure rather than a skip — a guard that silently does not run is counted
 * as coverage while protecting nothing.
 *
 * **The viewport comes from CDP, not from `--window-size`.** New headless
 * refuses a window narrower than about 500px, silently: asking for 390 measured
 * 500 while this script printed "mobile (390px)", so the phone width where the
 * unthemed-edge defect §6 records was found (375x812) was never being measured.
 * `Emulation.setDeviceMetricsOverride` sets the real thing, media queries
 * included. Node 22 ships `WebSocket` and `fetch`, so speaking CDP costs no
 * dependency — which is the only reason this is not puppeteer.
 */
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const VIEWPORTS = [
    { name: 'mobile', width: 390, height: 844 },
    { name: 'desktop', width: 1280, height: 900 },
];
const PORT = process.env.LAYOUT_PORT ?? '4319';
const DEVTOOLS_PORT = process.env.LAYOUT_CDP_PORT ?? '9339';
const CHROMES = ['google-chrome', 'chromium', 'chromium-browser', 'google-chrome-stable'];

function findChrome() {
    for (const bin of CHROMES) {
        if (spawnSync('which', [bin]).status === 0) return bin;
    }
    return undefined;
}

/**
 * Throws rather than exits. `process.exit` skips `finally`, and everything this
 * script does after patching `vite.config.ts` has to unwind through it — a
 * failed build used to leave the patched config on disk.
 */
function run(cmd, args, opts = {}) {
    const r = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
    if (r.status !== 0) {
        throw new Error(`${cmd} ${args.join(' ')} exited ${r.status}`);
    }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The smallest CDP client that does this job: request/response plus events. */
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
    throw new Error('layout-check: Chrome never opened its DevTools endpoint.');
}

/**
 * Navigate and wait for the probe's own verdict rather than for `load`: the
 * page writes `#layout-result` while its module evaluates, and an icon request
 * that never answers must not be able to hang the run.
 */
async function readVerdict(cdp, sessionId, url) {
    await cdp.send('Page.navigate', { url }, sessionId);
    for (let i = 0; i < 150; i += 1) {
        const r = await cdp.send(
            'Runtime.evaluate',
            {
                expression: "document.getElementById('layout-result')?.textContent ?? null",
                returnByValue: true,
            },
            sessionId,
        );
        if (typeof r.result.value === 'string') return JSON.parse(r.result.value);
        await sleep(100);
    }
    throw new Error('the probe never reported. It threw, or never ran.');
}

const chromeBin = findChrome();
if (chromeBin === undefined) {
    console.error(
        'layout-check: no Chrome found. Install one of: ' +
            CHROMES.join(', ') +
            '\nThis guard reads rendered geometry, so it cannot be skipped — see CLAUDE.md §6.',
    );
    process.exit(1);
}

// A second build entry, added for this run only and removed after.
const configPath = 'vite.config.ts';
const original = readFileSync(configPath, 'utf8');
const anchor = 'modulePreload: { polyfill: false },';
if (!original.includes(anchor)) {
    console.error('layout-check: could not find the build config anchor.');
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
    run('npx', ['vite', 'build', '--logLevel', 'error']);
    server = spawn('npx', ['vite', 'preview', '--port', PORT, '--strictPort'], {
        stdio: 'ignore',
        detached: true,
    });
    profile = mkdtempSync(join(tmpdir(), 'stall-layout-'));
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
    await sleep(3000); // The preview server is still coming up.

    for (const vp of VIEWPORTS) {
        await cdp.send(
            'Emulation.setDeviceMetricsOverride',
            { width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: false },
            sessionId,
        );
        let report;
        try {
            report = await readVerdict(cdp, sessionId, `http://localhost:${PORT}/layout/probe.html`);
        } catch (err) {
            console.error(`✗ ${vp.name}: ${err.message}`);
            failed = true;
            continue;
        }
        // The page's own measurement, not the width we asked for: a runner that
        // prints the request rather than the result is how 500px passed as 390.
        const measured = `${report.viewport}px`;
        if (report.viewport !== vp.width) {
            console.error(
                `✗ ${vp.name}: asked for ${vp.width}px and the page measured ${measured}.`,
            );
            failed = true;
            continue;
        }
        if (report.failures.length === 0) {
            console.log(`✓ ${vp.name} (${measured}): every screen, every look`);
            continue;
        }
        failed = true;
        console.error(`✗ ${vp.name} (${measured}): ${report.failures.length} failure(s)`);
        for (const f of report.failures) {
            console.error(`    ${f.screen} / ${f.theme}: ${f.check} — ${f.detail}`);
        }
    }
    cdp.close();
} catch (err) {
    failed = true;
    console.error(`\nlayout-check: ${err.message}`);
} finally {
    writeFileSync(configPath, original);
    for (const child of [server, browser]) {
        if (child?.pid === undefined) continue;
        try {
            process.kill(-child.pid);
        } catch {
            child.kill();
        }
    }
    // Chrome writes to its profile on the way down, so wait for it before the
    // directory is removed rather than racing it.
    if (browser?.pid !== undefined) {
        await new Promise((resolve) => {
            browser.once('exit', resolve);
            setTimeout(resolve, 3000);
        });
    }
    // Best effort, and never the reason a run goes red: Chrome keeps writing to
    // its profile for a moment after the kill, and a leftover temp directory is
    // not a layout defect. A cleanup that can fail the guard is a false red.
    if (profile !== undefined) {
        try {
            rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
        } catch {
            console.error(`layout-check: left a temp profile behind at ${profile}`);
        }
    }
}

console.log(failed ? '\nlayout-check: FAILED' : '\nlayout-check: passed');
process.exit(failed ? 1 : 0);
