#!/usr/bin/env node
/**
 * The rendered-output guard. `CLAUDE.md` §6 says the rule that nothing we ship
 * may cover the asked amount "needs a test that reads rendered output, and
 * happy-dom does not lay out — it wants a real browser in the loop."
 *
 * This is that loop. It builds the app with `layout/probe.html` as a second
 * entry, serves `dist`, and drives headless Chrome at each viewport. The page
 * measures itself and writes a verdict; this reads it back out of the dumped
 * DOM. No new dependency: Chrome is the only thing it needs, and a missing
 * Chrome is a failure rather than a skip — a guard that silently does not run
 * is counted as coverage while protecting nothing.
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
const CHROMES = ['google-chrome', 'chromium', 'chromium-browser', 'google-chrome-stable'];

function findChrome() {
    for (const bin of CHROMES) {
        if (spawnSync('which', [bin]).status === 0) return bin;
    }
    return undefined;
}

function run(cmd, args, opts = {}) {
    const r = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
    if (r.status !== 0) {
        console.error(`\n${cmd} ${args.join(' ')} exited ${r.status}`);
        process.exit(1);
    }
}

const chrome = findChrome();
if (chrome === undefined) {
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
let failed = false;
try {
    run('npx', ['vite', 'build', '--logLevel', 'error']);
    server = spawn('npx', ['vite', 'preview', '--port', PORT, '--strictPort'], {
        stdio: 'ignore',
        detached: true,
    });
    await new Promise((r) => setTimeout(r, 4000));

    for (const vp of VIEWPORTS) {
        const dir = mkdtempSync(join(tmpdir(), 'stall-layout-'));
        const dump = spawnSync(
            chrome,
            [
                '--headless=new',
                '--disable-gpu',
                '--no-sandbox',
                '--hide-scrollbars',
                `--user-data-dir=${dir}`,
                `--window-size=${vp.width},${vp.height}`,
                '--virtual-time-budget=6000',
                '--dump-dom',
                `http://localhost:${PORT}/layout/probe.html`,
            ],
            { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
        );
        rmSync(dir, { recursive: true, force: true });

        const html = dump.stdout ?? '';
        const match = html.match(/<pre id="layout-result">([\s\S]*?)<\/pre>/);
        if (match === null) {
            console.error(`✗ ${vp.name}: the probe never reported. It threw, or never ran.`);
            failed = true;
            continue;
        }
        const decoded = match[1]
            .replaceAll('&quot;', '"')
            .replaceAll('&amp;', '&')
            .replaceAll('&lt;', '<')
            .replaceAll('&gt;', '>');
        const report = JSON.parse(decoded);
        if (report.failures.length === 0) {
            console.log(`✓ ${vp.name} (${vp.width}px): every screen, every look`);
            continue;
        }
        failed = true;
        console.error(`✗ ${vp.name} (${vp.width}px): ${report.failures.length} failure(s)`);
        for (const f of report.failures) {
            console.error(`    ${f.screen} / ${f.theme}: ${f.check} — ${f.detail}`);
        }
    }
} finally {
    writeFileSync(configPath, original);
    if (server?.pid !== undefined) {
        try {
            process.kill(-server.pid);
        } catch {
            server.kill();
        }
    }
}

console.log(failed ? '\nlayout-check: FAILED' : '\nlayout-check: passed');
process.exit(failed ? 1 : 0);
