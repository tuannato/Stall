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
/**
 * The OBS Browser Source, and the only viewport the broadcast screens are
 * measured at. The overlay is sized for it — plate 252px, QR 204px, price
 * 39px — so certifying that chrome at 390px measures pixels nobody paints,
 * and the page widths skip it for the same reason in reverse. The page owns
 * the split (`screensForViewport` in `layout/probe.ts`); this passes the flag
 * and then checks the answer, because a filter nobody audits is how a pass
 * measures nothing and prints a tick.
 */
const CANVAS = { name: 'canvas', width: 1920, height: 1080 };
const ALL_VIEWPORTS = [...VIEWPORTS, CANVAS];

const probeUrl = (vp, extra = '') =>
    `http://localhost:${PORT}/layout/probe.html?viewport=${vp === CANVAS ? 'canvas' : 'page'}${extra}`;
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
    // Browsers serialize a color-mix() result as color(srgb r g b) with
    // 0-1 floats; plain colours stay rgb(). Read both.
    let cr;
    let cg;
    let cb;
    const m = textColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    const f = textColor.match(/color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)/);
    if (m !== null) {
        [cr, cg, cb] = [Number(m[1]), Number(m[2]), Number(m[3])];
    } else if (f !== null) {
        [cr, cg, cb] = [f[1], f[2], f[3]].map((v) => Math.round(Number(v) * 255));
    } else {
        throw new Error(`unreadable computed colour "${textColor}"`);
    }
    const textLum = luminance(cr, cg, cb);
    // Narrowed by the corner radius: outside it the pixels are the page
    // behind the control, not the control. See ContrastTarget.r in the probe.
    //
    // Horizontal only, and that is not an oversight: inside [x+r, x+w-r]
    // every y of a rounded rect is box paint. A vertical inset was tried on
    // 2026-09-04 and reverted — it silently dropped 400 of 2,267 sampled
    // boxes (every control shorter than its own two arcs), and the box that
    // motivated it turned out to be a control flexbox had crushed to 20px,
    // which is a defect this guard is supposed to report rather than skip.
    const r = target.r ?? 0;
    // The border's own pixels are chrome, never the text's ground: a dashed
    // pill edge blended to 2.2:1 against its ink is not a reading surface.
    const bw = (target.bw ?? 0) + (target.bw ? 1 : 0) + (target.pad ?? 0);
    const x0 = Math.max(0, Math.floor(target.x + r + bw) + 1);
    const y0 = Math.max(0, Math.floor(target.y + bw) + 1);
    const x1 = Math.min(img.width - 1, Math.ceil(target.x + target.w - r - bw) - 1);
    const y1 = Math.min(img.height - 1, Math.ceil(target.y + target.h - bw) - 1);
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

/**
 * Flatten a capture that kept its alpha onto one flat ground — what OBS does
 * with the stream running behind the overlay, at the two extremes a streamer
 * can hand it. PNG alpha is unpremultiplied (measured: a 92% plate comes back
 * `255,255,255,235`, not `235,235,235,235`), so this is the ordinary
 * source-over blend and nothing has to be undone first.
 */
function compositeOver(img, level) {
    const out = Buffer.allocUnsafe(img.data.length);
    for (let i = 0; i < img.data.length; i += 4) {
        const a = img.data[i + 3] / 255;
        out[i] = Math.round(img.data[i] * a + level * (1 - a));
        out[i + 1] = Math.round(img.data[i + 1] * a + level * (1 - a));
        out[i + 2] = Math.round(img.data[i + 2] * a + level * (1 - a));
        out[i + 3] = 255;
    }
    return { ...img, data: out };
}

/**
 * The alpha the capture actually carries outside the plates. This is the
 * assertion that keeps the composite from being theatre: with no background
 * override Chrome emits colour type 2 flattened onto white (measured), and
 * every "over black" figure would then be sampled against a white page while
 * the line said otherwise.
 */
function alphaOutside(img, opaque) {
    let min = 255;
    let clear = 0;
    let total = 0;
    for (let y = 0; y < img.height; y += 4) {
        for (let x = 0; x < img.width; x += 4) {
            if (
                opaque.some(
                    (b) => x >= b.x - 2 && x <= b.x + b.w + 2 && y >= b.y - 2 && y <= b.y + b.h + 2,
                )
            ) {
                continue;
            }
            const a = img.data[(y * img.width + x) * 4 + 3];
            min = Math.min(min, a);
            total += 1;
            if (a === 0) clear += 1;
        }
    }
    return { min, clear, total };
}

/** One painted combination, with the glyphs blanked and the frame settled. */
async function contrastPrepare(cdp, sessionId, screen, theme, wornAll) {
    const r = await cdp.send(
        'Runtime.evaluate',
        {
            expression:
                `(async () => { ` +
                `const out = window.__contrastPrepare(` +
                `${JSON.stringify(screen)}, ${theme}, ${wornAll}); ` +
                // The self-hosted face swaps metrics when it lands and the
                // fit-content dock re-centres with it — boxes taken before the
                // swap sample a neighbour's ground.
                `await document.fonts.ready; ` +
                `await new Promise((res) => ` +
                `requestAnimationFrame(() => requestAnimationFrame(res))); ` +
                `return JSON.stringify(out); })()`,
            awaitPromise: true,
            returnByValue: true,
        },
        sessionId,
    );
    if (r.exceptionDetails) {
        throw new Error(`page threw: ${JSON.stringify(r.exceptionDetails)}`);
    }
    return JSON.parse(r.result.value);
}

async function captureShot(cdp, sessionId) {
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true }, sessionId);
    return decodePng(Buffer.from(shot.data, 'base64'));
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
// The ceiling is enforcement, not a sentence in a plan: the second command in
// CLAUDE.md §11 has to stay something everyone actually runs. Raised 60 → 150
// on 2026-08-30 when the contrast pass took on the desktop width — that one
// run found the translucent-dock defect and three sampler holes, so the
// doubling is paid for; measured 107–120s, and the headroom is jitter, not an
// invitation. If this grows again, prune the matrix instead.
const RUNTIME_CEILING_S = 150;
const startedAt = Date.now();
/*
 * Each pass says what it cost. The budget rule is "prune the matrix before
 * raising the number", and the first session to hit the ceiling had to guess
 * which pass to prune — these are the numbers that guess should have been.
 */
let lastStamp = Date.now();
const took = () => {
    const now = Date.now();
    const s = (now - lastStamp) / 1000;
    lastStamp = now;
    return `${s.toFixed(1)}s`;
};
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

    console.log(`  build, preview and browser: ${took()}`);
    for (const vp of ALL_VIEWPORTS) {
        await cdp.send(
            'Emulation.setDeviceMetricsOverride',
            { width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: false },
            sessionId,
        );
        let report;
        try {
            report = await readVerdict(cdp, sessionId, probeUrl(vp));
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
        /*
         * The split, audited rather than trusted. The overlay screens belong to
         * the canvas pass and nothing else does; a filter that quietly answered
         * "no screens" would print a tick for a pass that measured nothing, and
         * one that answered "all of them" would certify 252px plates at 390px.
         */
        const overlayScreens = await evalJson(cdp, sessionId, 'window.__noDecorScreens');
        const ran = report.screensMeasured ?? [];
        const isCanvas = vp === CANVAS;
        const strays = ran.filter((name) => overlayScreens.includes(name) !== isCanvas);
        if (ran.length === 0 || strays.length > 0 || (isCanvas && ran.length !== overlayScreens.length)) {
            failed = true;
            console.error(
                `✗ ${vp.name} (${measured}): measured ${ran.length} screen(s)` +
                    (strays.length > 0 ? ` including ${strays.join(', ')}` : '') +
                    ` — the viewport split measured the wrong set.`,
            );
            continue;
        }
        const spent = took();
        if (report.failures.length === 0) {
            console.log(`✓ ${vp.name} (${measured}): ${ran.length} screens, every look — ${spent}`);
            continue;
        }
        failed = true;
        console.error(`✗ ${vp.name} (${measured}): ${report.failures.length} failure(s) — ${spent}`);
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
    await cdp.send(
        'Emulation.setEmulatedMedia',
        { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] },
        sessionId,
    );
    /*
     * The animating screens, each at the width it is painted at. `broadcast`
     * is here because `broadcast.css` is a fifth sheet with its own reduce
     * block and its own two keyframes (`bc-in`, `bc-pulse`) — a block nothing
     * had ever executed — and it is measured on the canvas because that is the
     * only viewport its screens run at. The fixture carries `broadcastStepped`
     * and `broadcastPulse` so both classes are on the tree; without them this
     * pass would still print a tick while stilling nothing.
     */
    const REDUCED = [
        // Renamed with the fixture 2026-09-04: the one publish screen became
        // two record sheets, and both are measured — they share `.sheet`'s
        // transition but not their contents, and a still page is only proved
        // still for the tree that was actually painted.
        { vp: VIEWPORTS[0], screens: 'offers,publish-name,describe,pay' },
        { vp: CANVAS, screens: 'broadcast' },
    ];
    for (const pass of REDUCED) {
        await cdp.send(
            'Emulation.setDeviceMetricsOverride',
            { width: pass.vp.width, height: pass.vp.height, deviceScaleFactor: 1, mobile: false },
            sessionId,
        );
        const wanted = pass.screens.split(',').length;
        const label = `reduced-motion (${pass.screens.replace(/,/g, ', ')} @${pass.vp.name})`;
        try {
            const rm = await readVerdict(cdp, sessionId, probeUrl(pass.vp, `&screens=${pass.screens}`));
            // The page's own answer, not the request: emulation that silently
            // did not apply is how 500px once passed as 390, and a screen list
            // that measured the wrong width is the same failure.
            if (rm.reducedMotion !== true) {
                failed = true;
                console.error(`✗ ${label}: the page never saw the media feature.`);
            } else if (rm.viewport !== pass.vp.width) {
                failed = true;
                console.error(
                    `✗ ${label}: asked for ${pass.vp.width}px and the page measured ${rm.viewport}px.`,
                );
            } else if ((rm.screensMeasured ?? []).length !== wanted) {
                failed = true;
                console.error(`✗ ${label}: the pass measured nothing — vacuous green.`);
            } else if (rm.failures.length === 0) {
                console.log(`✓ ${label}: every look — ${took()}`);
            } else {
                failed = true;
                console.error(`✗ ${label}: ${rm.failures.length} failure(s) — ${took()}`);
                for (const f of rm.failures) {
                    console.error(`    ${f.screen} / ${f.theme}: ${f.check} — ${f.detail}`);
                }
            }
        } catch (err) {
            failed = true;
            console.error(`✗ ${label}: ${err.message}`);
        }
    }
    await cdp.send('Emulation.setEmulatedMedia', { features: [] }, sessionId);

    /*
     * Pass 4: rendered-pixel contrast. `legibleOn` proves text against the two
     * flat palette roles; this proves it against what is actually painted
     * behind every money figure — gradients, scanlines and worn decorations
     * included. The page hides the glyphs, the shot samples the boxes.
     *
     * Both widths, since the 2026-08-30 review: the desktop chrome is its own
     * set of grounds (the fd head panels, the 860px column), and a
     * mobile-only pass certifies pixels nobody paints at 1280.
     */
    try {
        let boxes = 0;
        const dim = [];
        for (const vp of ALL_VIEWPORTS) {
            await cdp.send(
                'Emulation.setDeviceMetricsOverride',
                { width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: false },
                sessionId,
            );
            await cdp.send('Page.navigate', { url: probeUrl(vp, '&screens=') }, sessionId);
            await waitForFlag(cdp, sessionId, '__probeReady');
            const screens = await evalJson(cdp, sessionId, 'window.__contrastScreens');
            const themes = await evalJson(cdp, sessionId, 'window.__themes');
            const overlayScreens = await evalJson(cdp, sessionId, 'window.__noDecorScreens');
            for (const screen of screens) {
                /*
                 * The overlay wears nothing, so its worn half is the same paint
                 * measured twice — and the loop is SKIPPED rather than allowed
                 * to `continue` on zero targets, because `__contrastPrepare` is
                 * where the cost is: a full paint, `document.fonts.ready` and
                 * two frames. Door-under-Neo is the pattern that pays it.
                 */
                const wornStates = overlayScreens.includes(screen) ? [false] : [false, true];
                for (const theme of themes) {
                    for (const wornAll of wornStates) {
                        // Two animation frames between hiding the glyphs and the
                        // shot: the style change needs a composited frame, and a
                        // screenshot taken before one still shows the text — which
                        // read as 1.00:1 wherever a sample point landed on a glyph.
                        const prepare = () =>
                            contrastPrepare(cdp, sessionId, screen, theme, wornAll);
                        // First paint tells us how tall the page is; the viewport
                        // grows to hold all of it and the paint is redone at that
                        // size, because `captureBeyondViewport` does not reliably
                        // paint backgrounds below the fold — a below-fold buy
                        // control sampled as near-white.
                        //
                        // **Only when it actually grows.** A page that already
                        // fits was being painted, font-settled and frame-settled a
                        // second time at a size identical to the first, for every
                        // screen, look and worn state that fits its viewport —
                        // the largest single cost in this guard, buying nothing.
                        // Nothing repaints between the two, so the first prepare's
                        // tree is the tree that gets shot.
                        const first = await prepare();
                        if (first.targets.length === 0) continue;
                        const shotH = Math.max(vp.height, first.pageH);
                        const grew = shotH !== vp.height;
                        if (grew) {
                            await cdp.send(
                                'Emulation.setDeviceMetricsOverride',
                                { width: vp.width, height: shotH, deviceScaleFactor: 1, mobile: false },
                                sessionId,
                            );
                        }
                        const prep = grew ? await prepare() : first;
                        // The boxes are re-read at the last moment before every
                        // shot: anything that lands between prepare and capture
                        // (a late face, an image) moves the layout under
                        // coordinates already taken.
                        const liveBoxes = () => evalJson(cdp, sessionId, 'window.__contrastBoxes()');
                        const capture = () => captureShot(cdp, sessionId);
                        let img = await capture();
                        let targets = await liveBoxes();
                        // A failing box is re-shot once before it is believed:
                        // capture right after an emulated resize can raster a
                        // stale frame — measured: the live DOM held transparent
                        // glyphs and unmoved boxes while the shot showed the text
                        // still painted. A real defect is steady state (the
                        // planted-colour falsification fails both shots); a stale
                        // surface is not.
                        let retried = false;
                        if (prep.targets.length !== 0 && targets.length === 0) {
                            throw new Error(`${screen}: prepared targets but re-read none`);
                        }
                        for (let ti = 0; ti < targets.length; ti += 1) {
                            let t = targets[ti];
                            let worst = worstContrastInBox(img, t, t.color);
                            if (worst === undefined) continue;
                            boxes += 1;
                            if (worst < PIXEL_CONTRAST_FLOOR && !retried) {
                                await sleep(250);
                                img = await capture();
                                const again = await liveBoxes();
                                if (again.length === targets.length) {
                                    targets = again;
                                    t = targets[ti];
                                }
                                retried = true;
                                worst = worstContrastInBox(img, t, t.color);
                            }
                            if (worst !== undefined && worst < PIXEL_CONTRAST_FLOOR) {
                                dim.push(
                                    `${screen} @${vp.name} / theme ${theme}${wornAll ? ' + worn' : ''}: ` +
                                        `${t.sel} at ${Math.round(t.x)},${Math.round(t.y)} sits on paint at ${worst.toFixed(2)}:1`,
                                );
                            }
                        }
                        if (grew) {
                            await cdp.send(
                                'Emulation.setDeviceMetricsOverride',
                                {
                                    width: vp.width,
                                    height: vp.height,
                                    deviceScaleFactor: 1,
                                    mobile: false,
                                },
                                sessionId,
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
            console.log(
                `✓ contrast: ${boxes} figure boxes sampled against rendered pixels — ${took()}`,
            );
        } else {
            failed = true;
            console.error(
                `✗ contrast: ${dim.length} figure(s) on paint below ${PIXEL_CONTRAST_FLOOR}:1 — ${took()}`,
            );
            for (const line of dim) {
                console.error(`    ${line}`);
            }
        }
    } catch (err) {
        failed = true;
        console.error(`✗ contrast: ${err.message}`);
    }

    /*
     * Pass 5: the transparent wire, in pixels.
     *
     * `bg=transparent` means the page paints nothing behind the plates and OBS
     * composites it over the stream. Nothing in this repository can see that:
     * the pass above shoots the overlay against the themed ground, and
     * `a-theme-rule-never-pairs-a-literal-ink-with-a-token-ground` skips a
     * ground whose value is `transparent` outright, so plate-ink-over-video is
     * the one contrast question with no reader at all.
     *
     * So: capture the overlay with its alpha kept, assert the alpha is really
     * there, and flatten the frame onto the two grounds a streamer can hand it
     * — black and white — before running the same sampler as pass 4. `wornAll`
     * is measured here even though the contrast pass skips it for these
     * screens: a mood is the ONE worn row that reaches the overlay
     * (`renderStall` keeps `slot: 'mood'`), and After hours moves both the
     * plate and its ink.
     *
     * The alpha assertion is what keeps this honest. Measured 2026-09-02:
     * `Page.captureScreenshot { fromSurface: true }` with no override returns
     * colour type 2, flattened onto white — the composite would have been
     * theatre, sampling a white page and calling it black.
     * `Emulation.setDefaultBackgroundColorOverride` with `a: 0` set any time
     * before the shot returns colour type 6 with alpha 0 outside the plates,
     * `fromSurface: true` included, and PNG alpha is unpremultiplied
     * (`255,255,255,235` for a 92% white plate).
     */
    try {
        await cdp.send(
            'Emulation.setDeviceMetricsOverride',
            { width: CANVAS.width, height: CANVAS.height, deviceScaleFactor: 1, mobile: false },
            sessionId,
        );
        await cdp.send('Page.navigate', { url: probeUrl(CANVAS, '&screens=') }, sessionId);
        await waitForFlag(cdp, sessionId, '__probeReady');
        const themes = await evalJson(cdp, sessionId, 'window.__themes');
        const dim = [];
        let boxes = 0;
        let alpha;
        for (const theme of themes) {
            for (const wornAll of [false, true]) {
                const prep = await contrastPrepare(cdp, sessionId, 'broadcast-clear', theme, wornAll);
                if (prep.targets.length === 0) {
                    throw new Error('broadcast-clear prepared no figure boxes — vacuous green.');
                }
                const clearShot = async () => {
                    await cdp.send(
                        'Emulation.setDefaultBackgroundColorOverride',
                        { color: { r: 0, g: 0, b: 0, a: 0 } },
                        sessionId,
                    );
                    try {
                        return await captureShot(cdp, sessionId);
                    } finally {
                        await cdp.send('Emulation.setDefaultBackgroundColorOverride', {}, sessionId);
                    }
                };
                let img = await clearShot();
                if (img.bpp !== 4) {
                    // Measured with the transparency longhands removed: an
                    // overlay that paints a ground over the whole frame comes
                    // back as colour type 2 as well, so this message names both
                    // causes rather than blaming the override.
                    throw new Error(
                        `the capture came back flattened (colour type ${img.bpp === 3 ? 2 : '?'}): ` +
                            'either the overlay painted an opaque ground over the frame, or the ' +
                            'background override did not apply. Both make every "over black" line a lie.',
                    );
                }
                const opaque = await evalJson(cdp, sessionId, 'window.__opaqueBoxes()');
                alpha = alphaOutside(img, opaque);
                if (alpha.total === 0) {
                    throw new Error('the plates cover the whole frame — nothing outside them to sample.');
                }
                if (alpha.min === 255) {
                    throw new Error(
                        'every pixel outside the plates is fully opaque — the overlay painted a ground.',
                    );
                }
                let targets = await evalJson(cdp, sessionId, 'window.__contrastBoxes()');
                const sample = (shot) => {
                    const found = [];
                    let counted = 0;
                    for (const [ground, level] of [
                        ['black', 0],
                        ['white', 255],
                    ]) {
                        const flat = compositeOver(shot, level);
                        for (const t of targets) {
                            const worst = worstContrastInBox(flat, t, t.color);
                            if (worst === undefined) continue;
                            counted += 1;
                            if (worst < PIXEL_CONTRAST_FLOOR) {
                                found.push(
                                    `broadcast-clear @canvas / theme ${theme}${wornAll ? ' + worn' : ''} ` +
                                        `over ${ground}: ${t.sel} at ${Math.round(t.x)},${Math.round(t.y)} ` +
                                        `sits on paint at ${worst.toFixed(2)}:1`,
                                );
                            }
                        }
                    }
                    return { found, counted };
                };
                let { found, counted } = sample(img);
                // A failing box is re-shot once before it is believed — the same
                // rule pass 4 learned: a real defect is steady state.
                if (found.length > 0) {
                    await sleep(250);
                    img = await clearShot();
                    const again = await evalJson(cdp, sessionId, 'window.__contrastBoxes()');
                    if (again.length === targets.length) targets = again;
                    ({ found } = sample(img));
                }
                boxes += counted;
                dim.push(...found);
            }
        }
        const clearPct = ((alpha.clear / alpha.total) * 100).toFixed(0);
        if (dim.length === 0) {
            console.log(
                `✓ transparency (broadcast-clear @canvas): RGBA capture, ${clearPct}% of the frame ` +
                    `outside the plates at alpha 0; ${boxes} figure boxes over black and white — ${took()}`,
            );
        } else {
            failed = true;
            console.error(
                `✗ transparency: ${dim.length} figure(s) below ${PIXEL_CONTRAST_FLOOR}:1 ` +
                    `once the stream is behind them — ${took()}`,
            );
            for (const line of dim) {
                console.error(`    ${line}`);
            }
        }
    } catch (err) {
        failed = true;
        console.error(`✗ transparency: ${err.message}`);
    }
    cdp.close();
    const elapsedS = (Date.now() - startedAt) / 1000;
    if (elapsedS > RUNTIME_CEILING_S) {
        failed = true;
        console.error(
            `✗ runtime: ${elapsedS.toFixed(1)}s > ${RUNTIME_CEILING_S}s — prune the matrix before it stops being run`,
        );
    } else {
        console.log(`✓ runtime: ${elapsedS.toFixed(1)}s (ceiling ${RUNTIME_CEILING_S}s)`);
    }
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
