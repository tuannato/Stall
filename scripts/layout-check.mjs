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
import { inflateSync } from 'node:zlib';

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

/** Evaluate an expression in the page and parse its JSON result. */
async function evalJson(cdp, sessionId, expression) {
    const r = await cdp.send(
        'Runtime.evaluate',
        { expression: `JSON.stringify(${expression})`, returnByValue: true },
        sessionId,
    );
    if (r.exceptionDetails) {
        throw new Error(`page threw: ${JSON.stringify(r.exceptionDetails)}`);
    }
    return JSON.parse(r.result.value);
}

async function waitForFlag(cdp, sessionId, flag) {
    for (let i = 0; i < 150; i += 1) {
        const r = await cdp.send(
            'Runtime.evaluate',
            { expression: `window.${flag} === true`, returnByValue: true },
            sessionId,
        );
        if (r.result.value === true) return;
        await sleep(100);
    }
    throw new Error(`${flag} never became true`);
}

/*
 * A minimal PNG reader for Chrome screenshots: 8-bit, RGB or RGBA,
 * non-interlaced — which is what `Page.captureScreenshot` emits. Node's zlib
 * does the heavy half, so this stays dependency-free like the CDP client
 * above. Anything outside that shape throws rather than guessing.
 */
function decodePng(buf) {
    let pos = 8;
    let width = 0;
    let height = 0;
    let bpp = 0;
    const idat = [];
    while (pos + 8 <= buf.length) {
        const len = buf.readUInt32BE(pos);
        const type = buf.toString('ascii', pos + 4, pos + 8);
        const data = buf.subarray(pos + 8, pos + 8 + len);
        if (type === 'IHDR') {
            width = data.readUInt32BE(0);
            height = data.readUInt32BE(4);
            const bitDepth = data[8];
            const colorType = data[9];
            const interlace = data[12];
            if (bitDepth !== 8 || interlace !== 0 || (colorType !== 6 && colorType !== 2)) {
                throw new Error(
                    `unexpected PNG shape: depth ${bitDepth}, colour ${colorType}, interlace ${interlace}`,
                );
            }
            bpp = colorType === 6 ? 4 : 3;
        } else if (type === 'IDAT') {
            idat.push(data);
        } else if (type === 'IEND') {
            break;
        }
        pos += 12 + len;
    }
    if (width === 0 || bpp === 0) throw new Error('PNG carried no IHDR');
    const raw = inflateSync(Buffer.concat(idat));
    const stride = width * bpp;
    const out = Buffer.alloc(height * stride);
    for (let y = 0; y < height; y += 1) {
        const filter = raw[y * (stride + 1)];
        const line = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
        const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : undefined;
        const cur = out.subarray(y * stride, (y + 1) * stride);
        for (let x = 0; x < stride; x += 1) {
            const a = x >= bpp ? cur[x - bpp] : 0;
            const b = prev !== undefined ? prev[x] : 0;
            const c = x >= bpp && prev !== undefined ? prev[x - bpp] : 0;
            let v = line[x];
            switch (filter) {
                case 0:
                    break;
                case 1:
                    v = (v + a) & 0xff;
                    break;
                case 2:
                    v = (v + b) & 0xff;
                    break;
                case 3:
                    v = (v + ((a + b) >> 1)) & 0xff;
                    break;
                case 4: {
                    const p = a + b - c;
                    const pa = Math.abs(p - a);
                    const pb = Math.abs(p - b);
                    const pc = Math.abs(p - c);
                    v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xff;
                    break;
                }
                default:
                    throw new Error(`PNG filter ${filter}`);
            }
            cur[x] = v;
        }
    }
    return { width, height, bpp, data: out };
}

/* The same WCAG arithmetic as `contrastRatio` in src/domain/theme.ts. */
function channelLum(v) {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(r, g, b) {
    return 0.2126 * channelLum(r) + 0.7152 * channelLum(g) + 0.0722 * channelLum(b);
}

function contrast(la, lb) {
    const hi = Math.max(la, lb);
    const lo = Math.min(la, lb);
    return (hi + 0.05) / (lo + 0.05);
}

/** `MIN_CONTRAST` in src/domain/theme.ts — below it a colour is a disappearance. */
const PIXEL_CONTRAST_FLOOR = 3;

/**
 * The worst contrast between a text colour and any sampled background pixel
 * inside its box. The page turned the glyphs transparent before the shot, so
 * every pixel in the box is background — gradients, scanlines and decorations
 * included, which is the whole point: `legibleOn` proves the flat palette
 * roles, and nothing else proves what is actually painted behind a figure.
 */
function worstContrastInBox(img, target, textColor) {
    const m = textColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (m === null) {
        throw new Error(`unreadable computed colour "${textColor}"`);
    }
    const textLum = luminance(Number(m[1]), Number(m[2]), Number(m[3]));
    // Narrowed by the corner radius: outside it the pixels are the page
    // behind the control, not the control. See ContrastTarget.r in the probe.
    const r = target.r ?? 0;
    const x0 = Math.max(0, Math.floor(target.x + r) + 1);
    const y0 = Math.max(0, Math.floor(target.y) + 1);
    const x1 = Math.min(img.width - 1, Math.ceil(target.x + target.w - r) - 1);
    const y1 = Math.min(img.height - 1, Math.ceil(target.y + target.h) - 1);
    if (x1 <= x0 || y1 <= y0) return undefined;
    let worst = Infinity;
    const stepX = Math.max(1, Math.floor((x1 - x0) / 12));
    const stepY = Math.max(1, Math.floor((y1 - y0) / 8));
    for (let y = y0; y <= y1; y += stepY) {
        for (let x = x0; x <= x1; x += stepX) {
            const i = (y * img.width + x) * img.bpp;
            const lum = luminance(img.data[i], img.data[i + 1], img.data[i + 2]);
            worst = Math.min(worst, contrast(textLum, lum));
        }
    }
    return worst;
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

    /*
     * Pass 3: reduced motion. Three `prefers-reduced-motion` blocks ship in
     * `stall.css` and no guard had ever run under them. Only the animating
     * screens are re-measured — the media doubles a run, and a still page is
     * the page already measured above.
     */
    const mobile = VIEWPORTS[0];
    await cdp.send(
        'Emulation.setDeviceMetricsOverride',
        { width: mobile.width, height: mobile.height, deviceScaleFactor: 1, mobile: false },
        sessionId,
    );
    await cdp.send(
        'Emulation.setEmulatedMedia',
        { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] },
        sessionId,
    );
    try {
        const rm = await readVerdict(
            cdp,
            sessionId,
            `http://localhost:${PORT}/layout/probe.html?screens=offers,publish`,
        );
        // The page's own answer, not the request: emulation that silently did
        // not apply is how 500px once passed as 390.
        if (rm.reducedMotion !== true) {
            failed = true;
            console.error('✗ reduced-motion: the page never saw the media feature.');
        } else if ((rm.screensMeasured ?? []).length !== 2) {
            failed = true;
            console.error('✗ reduced-motion: the pass measured nothing — vacuous green.');
        } else if (rm.failures.length === 0) {
            console.log('✓ reduced-motion (offers, publish): every look');
        } else {
            failed = true;
            console.error(`✗ reduced-motion: ${rm.failures.length} failure(s)`);
            for (const f of rm.failures) {
                console.error(`    ${f.screen} / ${f.theme}: ${f.check} — ${f.detail}`);
            }
        }
    } catch (err) {
        failed = true;
        console.error(`✗ reduced-motion: ${err.message}`);
    }
    await cdp.send('Emulation.setEmulatedMedia', { features: [] }, sessionId);

    /*
     * Pass 4: rendered-pixel contrast. `legibleOn` proves text against the two
     * flat palette roles; this proves it against what is actually painted
     * behind every money figure — gradients, scanlines and worn decorations
     * included. The page hides the glyphs, the shot samples the boxes.
     */
    try {
        await cdp.send(
            'Page.navigate',
            { url: `http://localhost:${PORT}/layout/probe.html?screens=` },
            sessionId,
        );
        await waitForFlag(cdp, sessionId, '__probeReady');
        const screens = await evalJson(cdp, sessionId, 'window.__screens');
        const themes = await evalJson(cdp, sessionId, 'window.__themes');
        let boxes = 0;
        const dim = [];
        for (const screen of screens) {
            for (const theme of themes) {
                for (const wornAll of [false, true]) {
                    // Two animation frames between hiding the glyphs and the
                    // shot: the style change needs a composited frame, and a
                    // screenshot taken before one still shows the text — which
                    // read as 1.00:1 wherever a sample point landed on a glyph.
                    const prepare = async () => {
                        const r = await cdp.send(
                            'Runtime.evaluate',
                            {
                                expression:
                                    `new Promise((res) => { ` +
                                    `const out = JSON.stringify(window.__contrastPrepare(` +
                                    `${JSON.stringify(screen)}, ${theme}, ${wornAll})); ` +
                                    `requestAnimationFrame(() => requestAnimationFrame(() => res(out))); })`,
                                awaitPromise: true,
                                returnByValue: true,
                            },
                            sessionId,
                        );
                        if (r.exceptionDetails) {
                            throw new Error(`page threw: ${JSON.stringify(r.exceptionDetails)}`);
                        }
                        return JSON.parse(r.result.value);
                    };
                    // First paint tells us how tall the page is; the viewport
                    // grows to hold all of it and the paint is redone at that
                    // size, because `captureBeyondViewport` does not reliably
                    // paint backgrounds below the fold — a below-fold buy
                    // control sampled as near-white.
                    const first = await prepare();
                    if (first.targets.length === 0) continue;
                    const shotH = Math.max(mobile.height, first.pageH);
                    await cdp.send(
                        'Emulation.setDeviceMetricsOverride',
                        { width: mobile.width, height: shotH, deviceScaleFactor: 1, mobile: false },
                        sessionId,
                    );
                    const prep = await prepare();
                    const shot = await cdp.send(
                        'Page.captureScreenshot',
                        { format: 'png', fromSurface: true },
                        sessionId,
                    );
                    await cdp.send(
                        'Emulation.setDeviceMetricsOverride',
                        {
                            width: mobile.width,
                            height: mobile.height,
                            deviceScaleFactor: 1,
                            mobile: false,
                        },
                        sessionId,
                    );
                    const img = decodePng(Buffer.from(shot.data, 'base64'));
                    for (const t of prep.targets) {
                        const worst = worstContrastInBox(img, t, t.color);
                        if (worst === undefined) continue;
                        boxes += 1;
                        if (worst < PIXEL_CONTRAST_FLOOR) {
                            dim.push(
                                `${screen} / theme ${theme}${wornAll ? ' + worn' : ''}: ` +
                                    `${t.sel} at ${Math.round(t.x)},${Math.round(t.y)} sits on paint at ${worst.toFixed(2)}:1`,
                            );
                        }
                    }
                }
            }
        }
        if (boxes === 0) {
            failed = true;
            console.error('✗ contrast: no figure boxes were sampled — vacuous green.');
        } else if (dim.length === 0) {
            console.log(`✓ contrast: ${boxes} figure boxes sampled against rendered pixels`);
        } else {
            failed = true;
            console.error(`✗ contrast: ${dim.length} figure(s) on paint below ${PIXEL_CONTRAST_FLOOR}:1`);
            for (const line of dim) {
                console.error(`    ${line}`);
            }
        }
    } catch (err) {
        failed = true;
        console.error(`✗ contrast: ${err.message}`);
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
