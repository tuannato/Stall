#!/usr/bin/env node
/**
 * The rendered-output guard. `CLAUDE.md` §6 says the rule that nothing we ship
 * may cover the asked amount "needs a test that reads rendered output, and
 * happy-dom does not lay out — it wants a real browser in the loop."
 *
 * This is that loop. It builds from `vite.probe.config.ts` — the app's own
 * config with `layout/probe.html` as a second entry, into `.probe-dist` (or
 * from the config `--config` names: the workshop kit's, below) — serves that, and drives headless Chrome at each viewport. The page
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
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CHROMES, decodePng, devtools, findChrome } from './browser.mjs';
import { payScreensMissingQuote } from './pay-screens.mjs';
import { probeCoverageGaps, probeCoverageLine } from './probe-coverage.mjs';
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
import { requireCleanKitBuild } from './workshop-build-check.mjs';

/*
 * `--config <file>` names the build (default `vite.probe.config.ts`, the
 * ordinary probe) and `--looks workshop` measures the workshop kit's look
 * alone, on its own probe entry — `pnpm workshop:probe` passes both, with
 * `vite.workshop.config.ts`. Same passes, same rules, same ceiling.
 */
function flag(name, fallback) {
    const at = process.argv.indexOf(name);
    if (at < 0) return fallback;
    const value = process.argv[at + 1];
    if (value === undefined || value.startsWith('--')) {
        console.error(`layout-check: ${name} needs a value`);
        process.exit(1);
    }
    return value;
}
const PROBE_CONFIG = flag('--config', 'vite.probe.config.ts');
const LOOKS = flag('--looks', 'shipped');
if (LOOKS !== 'shipped' && LOOKS !== 'workshop') {
    console.error(`layout-check: --looks is "shipped" or "workshop", not "${LOOKS}"`);
    process.exit(1);
}
const PROBE_PAGE = LOOKS === 'workshop' ? 'layout/probe-workshop.html' : 'layout/probe.html';
/*
 * The preview server and Chrome this run starts are process groups of their
 * own, stopped whole on Ctrl-C, SIGTERM, SIGHUP and every other way out, and
 * never started on a port that already answers (`process-groups.mjs`, the
 * intake critic's item 2): a run that left them up used to hand the next run
 * a stale build on the same port.
 */
stopOnSignals('layout-check');
/*
 * The look classes this run exists to measure, stated here rather than asked
 * of the page: the page reports what it PAINTED (`sheetClasses`, every `t-*`
 * class on every `.stall`) and the runner refuses any pass whose set is not
 * exactly this one — the workshop critic's P1, a kit page that painted Modern
 * by id and read as a skeleton that passed. A fourth shipped look adds its
 * class to this line. `t-skeleton` is the harness's own look (the default row
 * under a class no sheet styles, `layout/looks.ts`), measured beside the
 * shipped three since step 2d. Tests:
 * `the-workshop-probe-measures-the-workshop-look`,
 * `the-skeleton-is-the-default-row-under-a-class-no-sheet-styles`.
 */
const SHIPPED_SHEET_CLASSES = LOOKS === 'workshop' ? [] : ['t-modern', 't-neo', 't-rural'];
const EXPECTED_SHEET_CLASSES =
    LOOKS === 'workshop' ? ['t-workshop'] : [...SHIPPED_SHEET_CLASSES, 't-skeleton'];

/** Why a painted class set is not the one this run measures, or undefined. */
function sheetClassesWrong(painted) {
    const got = [...new Set(painted ?? [])].sort();
    const want = [...EXPECTED_SHEET_CLASSES].sort();
    if (got.join(' ') === want.join(' ')) return undefined;
    return (
        `painted ${got.length === 0 ? 'no look class' : got.join(', ')} where this run measures ` +
        `${want.join(', ')} (the-workshop-probe-measures-the-workshop-look)`
    );
}

/*
 * The app's config is read by this run and never written: the probe builds and
 * previews from its own, `vite.probe.config.ts`. This used to patch its entry
 * into `vite.config.ts` and write the file back on the way out, so a killed run
 * left the app's config patched. What stays is a tripwire: if the bytes differ
 * on the way out — an editor, or another script writing the file while this
 * run built from it — the run fails and says so. An `exit` listener runs on
 * every way out but a signal, a throw included, and setting `exitCode` there
 * overrides the code `process.exit` was handed; a run killed by a signal has
 * written nothing, so it leaves nothing behind.
 */
const APP_CONFIG = 'vite.config.ts';
const appConfigAtStart = readFileSync(APP_CONFIG);
let tripwireSaid = false;
/** True, and said once, when the app's config is not the bytes this run began with. */
function appConfigMoved() {
    let now;
    try {
        now = readFileSync(APP_CONFIG);
    } catch {
        now = undefined;
    }
    const moved = now === undefined || !now.equals(appConfigAtStart);
    if (moved && !tripwireSaid) {
        tripwireSaid = true;
        console.error(
            `\nlayout-check: ${APP_CONFIG} changed while this run built from it. ` +
                'Nothing here writes it; find what did before trusting this run.',
        );
    }
    return moved;
}
process.on('exit', () => {
    if (appConfigMoved()) process.exitCode = 1;
});

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
/**
 * A television hung the tall way, which is what a shop window often is.
 *
 * `window.css` carries three layouts for the cycle card and only two were
 * ever measured: landscape, and `(orientation: portrait) and (max-height:
 * 1200px)` — the counter tablet, which the `TABLET` pass below
 * matches. The third, `portrait` with that max-height NOT matching, is the
 * stacked column a wall-mounted portrait screen paints, and **no viewport
 * reached it**: a whole half of the layout this feature was asked for
 * (owner, 2026-09-18: "Cũng thiết kế để hỗ trợ màn hình dọc") sat behind a
 * media query the probe could not enter, so every run printed a tick over
 * CSS nothing had executed.
 *
 * It runs the shop-window screens alone, through `?screens=`, the way the
 * reduced-motion pass runs the animating ones: the rest of the app has no
 * portrait-only rule and re-measuring it would double the run for nothing.
 * The verdict echoes the media condition back (`portraitTall`) so a pass
 * that silently stayed landscape fails instead of passing.
 */
const PORTRAIT = { name: 'portrait', width: 1080, height: 1920 };
/*
 * The counter tablet stood on end — the SHORT portrait block.
 *
 * `(orientation: portrait) and (max-height: 1200px)` was entered by one
 * viewport in the whole matrix, 390x844, and only because the wall fixtures
 * ran there. Taking them out of the narrow pass was right — the app cannot
 * paint a wall at 390 — and it left that block measured by nothing while
 * two documents went on describing it as covered (QA, 2026-09-20, measured
 * against the real `window.css` in Chrome). 768 is over the wall's floor
 * and CLAUDE §4 names the counter tablet, so the screen is real; this pass
 * is what the mobile one was standing in for.
 */
const TABLET = { name: 'tablet', width: 768, height: 1024 };
const WINDOW_SCREENS =
    'shop-window-cycle,shop-window-browse,shop-window-quotes,shop-window-wall,' +
    // The touch wall (2026-09-21): the strip and its steppers, and the
    // payment the press froze. Both passes below read this list, so both
    // the portrait screen and the counter tablet measure them.
    'shop-window-touch-quotes,shop-window-touch-quotes-pay,' +
    // The unbuyable dash on a wall (2026-09-23), in a Browse row and on the
    // Cycle card: the tall wall re-cuts both sizes.
    'shop-window-unbuyable,shop-window-cycle-unbuyable';
const ALL_VIEWPORTS = [...VIEWPORTS, CANVAS];

const probeUrl = (vp, extra = '') =>
    `http://localhost:${PORT}/${PROBE_PAGE}?viewport=${vp === CANVAS ? 'canvas' : 'page'}${extra}`;
const PORT = process.env.LAYOUT_PORT ?? '4319';
const DEVTOOLS_PORT = process.env.LAYOUT_CDP_PORT ?? '9339';
/**
 * Throws rather than exits. `process.exit` skips `finally`, and the preview
 * server and Chrome this script starts are stopped there — a failed build must
 * unwind through it like any other failure.
 */
function run(cmd, args, opts = {}) {
    const r = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
    if (r.status !== 0) {
        throw new Error(`${cmd} ${args.join(' ')} exited ${r.status}`);
    }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
    /*
     * Both far edges use `floor`, not `ceil` (2026-09-22). A box rarely
     * lands on whole pixels: at `y + h = 340.5` the last row Chrome paints
     * is half the element and half the page behind it, and `ceil(340.5) - 1`
     * is 340 — that partial row. The near edges never had the bug, because
     * `floor(y) + 1` steps past their partial row by construction; the far
     * ones were asymmetric with them for as long as this sampler existed.
     *
     * Found by `.notice-chip` joining `CONTRAST_TEXT`: Neo sets it as near
     * black on `#ff4d7a` — 6.10:1 — and four figures reported **1.20 to
     * 2.84:1**, every one of them at the box's own bottom row, on grounds
     * `rgb(42,28,42)` and `rgb(147,53,83)` that are the pink blended into
     * the look's near-black page. An antialiased edge is the element's own
     * boundary, not a reading surface, which is the reason `bw` already
     * steps around a border. It surfaced here and not earlier because most
     * targets sit on the same ground as the page behind them, or carry a
     * border whose `bw + 1` was covering for this.
     */
    const x0 = Math.max(0, Math.floor(target.x + r + bw) + 1);
    const y0 = Math.max(0, Math.floor(target.y + bw) + 1);
    const x1 = Math.min(img.width - 1, Math.floor(target.x + target.w - r - bw) - 1);
    const y1 = Math.min(img.height - 1, Math.floor(target.y + target.h - bw) - 1);
    if (x1 <= x0 || y1 <= y0) return undefined;
    let worst = Infinity;
    const stepX = Math.max(1, Math.floor((x1 - x0) / 12));
    const stepY = Math.max(1, Math.floor((y1 - y0) / 8));
    // Chrome laid over the box (the face's cue on the hero tile's corner)
    // is stepped around like the border: see CHROME_ON_TEXT in the probe.
    const holes = target.holes ?? [];
    for (let y = y0; y <= y1; y += stepY) {
        for (let x = x0; x <= x1; x += stepX) {
            if (holes.some((o) => x >= o.x && x < o.x + o.w && y >= o.y && y < o.y + o.h)) {
                continue;
            }
            const i = (y * img.width + x) * img.bpp;
            const lum = luminance(img.data[i], img.data[i + 1], img.data[i + 2]);
            const c = contrast(textLum, lum);
            if (c < worst) {
                worst = c;
                // `LAYOUT_WHY=1` names the worst pixel: its position, the
                // ground rgb found there, the ink compared against, and the
                // band that was walked. A contrast figure with no pixel
                // behind it cannot be told from a sampler bug — which is
                // exactly what the two defects of 2026-09-22 turned out to
                // be — and this repository's rule is that a false red is as
                // useless as a false green.
                if (process.env.LAYOUT_WHY) {
                    globalThis.__why = `worst ${c.toFixed(2)} at ${x},${y} ground rgb(${img.data[i]},${img.data[i + 1]},${img.data[i + 2]}) ink ${textColor} band x[${x0}..${x1}] y[${y0}..${y1}]`;
                }
            }
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

let server;
let browser;
let failed = false;
// The ceiling is enforcement, not a sentence in a plan: the second command in
// CLAUDE.md §11 has to stay something everyone actually runs. Raised 60 → 150
// on 2026-08-30 when the contrast pass took on the desktop width — that one
// run found the translucent-dock defect and three sampler holes, so the
// doubling is paid for; measured 107–120s, and the headroom is jitter, not an
// invitation. Raised 150 → 200 on 2026-09-19, the owner's call: the shop
// window added four screens that each paint at a 1920 canvas with every
// decoration on (`CANVAS_SCREENS`), which is the most expensive cell in the
// matrix, and the run measured 183s with every rule green — a command that
// fails for its own cost is a command people stop running, which is the one
// thing this number exists to prevent. Raised 200 → 300 on 2026-09-22, the
// owner's call, after the basket round left 2.9s of margin (197.1s measured;
// the memo's fixtures paint a real pay code on every pay screen now and the
// touch wall's two screens ride the portrait and tablet passes): the
// alternative was pruning screens that had each earned their place that
// week. Still enforcement: the per-pass costs printed below are how to choose
// what to prune the next time, and the contrast pass (140s of it) is where
// the cost is.
/*
 * How much of the cover check the clip tolerance may eat before the pass
 * stops meaning anything. `clipsOf` skips a point outside every clipping
 * ancestor because it is reachable by scrolling and nothing outside the clip
 * can cover it — correct, and also the one way this guard can be widened into
 * a green run over nothing.
 *
 * Measured 2026-09-19, the first run that printed a denominator: mobile
 * 1,830 of 13,118 (14%), desktop 1,582 of 11,319 (14%), canvas 0 of 825.
 * The ceiling is a little over twice that — drift protection, not a target:
 * it catches a tolerance that has started eating the pass while leaving room
 * for a screen or two more. Headroom is jitter, not an invitation. If a
 * legitimate change pushes past it, the question to answer first is which
 * points stopped being checked, not what the number should be.
 */
const CLIP_SKIP_CEILING = 0.3;

const RUNTIME_CEILING_S = 300;
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
    run('npx', ['vite', 'build', '--config', PROBE_CONFIG, '--logLevel', 'error']);
    if (LOOKS === 'workshop') {
        // The kit's build is held against what it was given before anything
        // serves it (`workshop-build-check.mjs`); the ordinary probe builds
        // Stall's own sheets and skips this.
        await requireCleanKitBuild({ configFile: PROBE_CONFIG });
    }
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
    const profile = mkdtempSync(join(tmpdir(), 'stall-layout-'));
    // Best effort, and never the reason a run goes red: Chrome keeps writing
    // to its profile for a moment after the kill, and a leftover temp
    // directory is not a layout defect. A cleanup that can fail the guard is
    // a false red. Run once every group is down, on every way out.
    onTeardown(() => {
        try {
            rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
        } catch {
            console.error(`layout-check: left a temp profile behind at ${profile}`);
        }
    });
    browser = spawnGroup(
        'Chrome',
        chromeBin,
        [
            '--headless=new',
            '--disable-gpu',
            // The probe's browser reaches nothing but the preview. Without this
            // the item face's hero tile asked the icon Worker over the real
            // network, and whatever came back — and when — landed in the
            // contrast capture: `item-listing`'s tile read 1.16–1.65:1 in four
            // of nine runs on 2026-09-20 and 3:1+ in the rest, on code that
            // had not touched it. A guard that depends on the network is not
            // a guard; icons are letters here, deterministically.
            '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost',
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
    // The preview answering the probe page, or its own last words if it died
    // (a port it lost, a build it could not read) — never a fixed sleep that
    // measured whatever else answered there.
    await waitUntil('the preview server', async () => (await fetch(probeUrl(VIEWPORTS[0]))).ok, {
        watch: [server, browser],
    });

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
        const wrongLook = sheetClassesWrong(report.sheetClasses);
        if (wrongLook !== undefined) {
            console.error(`✗ ${vp.name} (${measured}): ${wrongLook}`);
            failed = true;
            continue;
        }
        /*
         * The split, audited rather than trusted. The overlay screens belong to
         * the canvas pass and nothing else does; a filter that quietly answered
         * "no screens" would print a tick for a pass that measured nothing, and
         * one that answered "all of them" would certify 252px plates at 390px.
         */
        // The set the SPLIT is about, which is not the set the decorations
        // are about: a shop window is a 1920 canvas and wears every decoration
        // the seller chose, where an overlay is a 1920 canvas and wears none.
        const canvasScreens = await evalJson(cdp, sessionId, 'window.__canvasScreens');
        const ran = report.screensMeasured ?? [];
        const isCanvas = vp === CANVAS;
        const strays = ran.filter((name) => canvasScreens.includes(name) !== isCanvas);
        if (ran.length === 0 || strays.length > 0 || (isCanvas && ran.length !== canvasScreens.length)) {
            failed = true;
            console.error(
                `✗ ${vp.name} (${measured}): measured ${ran.length} screen(s)` +
                    (strays.length > 0 ? ` including ${strays.join(', ')}` : '') +
                    ` — the viewport split measured the wrong set.`,
            );
            continue;
        }
        /*
         * And the subject, audited the same way. Every rule about the seller's
         * own figure runs over whatever the fixture mounted, so a screen named
         * for the pay rail that mounts no `[data-role="seller-price"]` leaves
         * all of them green while measuring nothing. The names are the
         * convention (`pay-screens.mjs`, tested on its own); the page reports
         * only what it saw.
         */
        const noQuote = payScreensMissingQuote(ran, report.screensWithQuote ?? []);
        if (noQuote.length > 0) {
            failed = true;
            console.error(
                `✗ ${vp.name} (${measured}): ${noQuote.join(', ')} mounted no` +
                    ' [data-role="seller-price"] — a pay screen that measured no figure' +
                    ' is a green pass over nothing.',
            );
            continue;
        }
        /*
         * The step-2 rules, audited the same way: each reports what it
         * compared, and a pass that compared nothing where it owes a
         * comparison is refused (`probe-coverage.mjs`).
         */
        const gaps = probeCoverageGaps(vp.name, report, {
            shippedClasses: SHIPPED_SHEET_CLASSES,
            skeleton: EXPECTED_SHEET_CLASSES.includes('t-skeleton'),
        });
        if (gaps.length > 0) {
            failed = true;
            console.error(`✗ ${vp.name} (${measured}): a rule compared nothing it owes —`);
            for (const gap of gaps) console.error(`    ${gap}`);
        }
        const spent = took();
        /*
         * The clip tolerance's own arithmetic, on every run rather than only
         * on a passing one. A `coveredBy` that skipped every point would be
         * indistinguishable from one that found nothing wrong — §6's
         * complaint about a guard that quietly does not run — and the skip
         * count on its own has no denominator to say which it was. So the
         * ratio is what is printed and what is held: `clipChecks` is the
         * points this pass actually hit-tested, and a pass with none of them
         * proved nothing at all whatever its failure list says.
         */
        const skipped = report.clipSkips ?? 0;
        const checked = report.clipChecks ?? 0;
        const clipLine =
            skipped + checked === 0
                ? ''
                : ` · ${skipped}/${skipped + checked} points behind a clip` +
                  ` (${((skipped / (skipped + checked)) * 100).toFixed(0)}%)`;
        if (skipped > 0 && checked === 0) {
            failed = true;
            console.error(
                `✗ ${vp.name} (${measured}): every hit-test point was behind a clip —` +
                    ' the cover check ran over nothing',
            );
        } else if (skipped + checked > 0 && skipped / (skipped + checked) > CLIP_SKIP_CEILING) {
            failed = true;
            console.error(
                `✗ ${vp.name} (${measured}): ${clipLine.trim()} —` +
                    ` above the ${(CLIP_SKIP_CEILING * 100).toFixed(0)}% ceiling;` +
                    ' the clip tolerance is eating the cover check',
            );
        }
        const compared = probeCoverageLine(vp.name, report);
        if (report.failures.length === 0) {
            if (gaps.length === 0) {
                console.log(
                    `✓ ${vp.name} (${measured}): ${ran.length} screens, every look — ${spent}` +
                        clipLine +
                        (compared === '' ? '' : `\n    compared: ${compared}`),
                );
            }
            continue;
        }
        failed = true;
        console.error(
            `✗ ${vp.name} (${measured}): ${report.failures.length} failure(s) — ${spent}${clipLine}`,
        );
        for (const f of report.failures) {
            console.error(`    ${f.screen} / ${f.theme}: ${f.check} — ${f.detail}`);
        }
    }

    /*
     * Pass 2b: the shop window hung the tall way. See `PORTRAIT` above for
     * why this is a pass of its own and not another entry in ALL_VIEWPORTS —
     * it measures four screens, not the matrix.
     */
    {
        await cdp.send(
            'Emulation.setDeviceMetricsOverride',
            { width: PORTRAIT.width, height: PORTRAIT.height, deviceScaleFactor: 1, mobile: false },
            sessionId,
        );
        const wanted = WINDOW_SCREENS.split(',').length;
        const label = `portrait (${PORTRAIT.width}x${PORTRAIT.height}, shop window)`;
        try {
            const pv = await readVerdict(
                cdp,
                sessionId,
                probeUrl(PORTRAIT, `&screens=${WINDOW_SCREENS}`),
            );
            if (pv.viewport !== PORTRAIT.width) {
                failed = true;
                console.error(
                    `✗ ${label}: asked for ${PORTRAIT.width}px and the page measured ${pv.viewport}px.`,
                );
            } else if (sheetClassesWrong(pv.sheetClasses) !== undefined) {
                failed = true;
                console.error(`✗ ${label}: ${sheetClassesWrong(pv.sheetClasses)}`);
            } else if (pv.portraitTall !== true) {
                // The emulation applied a size and the media query still did
                // not match: the pass would measure the landscape or the
                // short-portrait layout and print a tick for the tall one.
                failed = true;
                console.error(
                    `✗ ${label}: the page never entered the tall-portrait block —` +
                        ' this pass would certify a layout it did not paint.',
                );
            } else if ((pv.screensMeasured ?? []).length !== wanted) {
                failed = true;
                console.error(
                    `✗ ${label}: measured ${(pv.screensMeasured ?? []).length} of ${wanted}` +
                        ' screens — vacuous green.',
                );
            } else if (pv.failures.length === 0) {
                console.log(`✓ ${label}: ${wanted} screens, every look — ${took()}`);
            } else {
                failed = true;
                console.error(`✗ ${label}: ${pv.failures.length} failure(s) — ${took()}`);
                for (const f of pv.failures) {
                    console.error(`    ${f.screen} / ${f.theme}: ${f.check} — ${f.detail}`);
                }
            }
        } catch (err) {
            failed = true;
            console.error(`✗ ${label}: ${err.message}`);
        }
    }

    /*
     * Pass 2c: the counter tablet stood on end. See `TABLET` above — this
     * exists because removing the wall fixtures from the 390px pass took
     * the short-portrait block's only reader with them.
     */
    {
        await cdp.send(
            'Emulation.setDeviceMetricsOverride',
            { width: TABLET.width, height: TABLET.height, deviceScaleFactor: 1, mobile: false },
            sessionId,
        );
        const wanted = WINDOW_SCREENS.split(',').length;
        const label = `tablet (${TABLET.width}x${TABLET.height}, shop window)`;
        try {
            const tv = await readVerdict(
                cdp,
                sessionId,
                probeUrl(TABLET, `&screens=${WINDOW_SCREENS}`),
            );
            if (tv.viewport !== TABLET.width) {
                failed = true;
                console.error(
                    `✗ ${label}: asked for ${TABLET.width}px and the page measured ${tv.viewport}px.`,
                );
            } else if (sheetClassesWrong(tv.sheetClasses) !== undefined) {
                failed = true;
                console.error(`✗ ${label}: ${sheetClassesWrong(tv.sheetClasses)}`);
            } else if (tv.portraitShort !== true) {
                // The same guard `portraitTall` gives the pass above: an
                // emulation that applied a size while the query did not
                // match would certify a layout this pass never painted.
                failed = true;
                console.error(
                    `✗ ${label}: the page never entered the short-portrait block —` +
                        ' this pass would certify a layout it did not paint.',
                );
            } else if ((tv.screensMeasured ?? []).length !== wanted) {
                failed = true;
                console.error(
                    `✗ ${label}: measured ${(tv.screensMeasured ?? []).length} of ${wanted}` +
                        ' screens — vacuous green.',
                );
            } else if (tv.failures.length === 0) {
                console.log(`✓ ${label}: ${wanted} screens, every look — ${took()}`);
            } else {
                failed = true;
                console.error(`✗ ${label}: ${tv.failures.length} failure(s) — ${took()}`);
                for (const f of tv.failures) {
                    console.error(`    ${f.screen} / ${f.theme}: ${f.check} — ${f.detail}`);
                }
            }
        } catch (err) {
            failed = true;
            console.error(`✗ ${label}: ${err.message}`);
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
     *
     * `broadcast-quotes` is the second card the sheet animates: the pulse sits
     * on `[data-role="seller-price"]` there, a different selector in the same
     * reduce block, and a block that stilled only the other role would pass
     * this pass while a stream kept moving.
     */
    const REDUCED = [
        // Renamed with the fixture 2026-09-04: the one publish screen became
        // two record sheets, and both are measured — they share `.sheet`'s
        // transition but not their contents, and a still page is only proved
        // still for the tree that was actually painted.
        // `plugin-missing-quotes` since 2026-09-09: the populated quote rail,
        // whose name button and words line carry the marquee — without it the
        // kill for those two would be proved on no screen at all.
        { vp: VIEWPORTS[0], screens: 'offers,plugin-missing-quotes,publish-name,describe,pay' },
        // `broadcast-ticker-live` since 2026-09-21: the ribbon's own
        // keyframe (`tk-run`), running in this fixture and killed in the
        // sheet's last block — the pinned ticker screens animate nothing
        // and would prove nothing here.
        { vp: CANVAS, screens: 'broadcast,broadcast-quotes,broadcast-ticker-live' },
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
            } else if (sheetClassesWrong(rm.sheetClasses) !== undefined) {
                failed = true;
                console.error(`✗ ${label}: ${sheetClassesWrong(rm.sheetClasses)}`);
            } else if (rm.viewport !== pass.vp.width) {
                failed = true;
                console.error(
                    `✗ ${label}: asked for ${pass.vp.width}px and the page measured ${rm.viewport}px.`,
                );
            } else if ((rm.screensMeasured ?? []).length !== wanted) {
                failed = true;
                console.error(`✗ ${label}: the pass measured nothing — vacuous green.`);
            } else if (
                payScreensMissingQuote(rm.screensMeasured ?? [], rm.screensWithQuote ?? [])
                    .length > 0
            ) {
                // This pass names a pay screen on each side (the sheet, and the
                // overlay's quote card), and stilling a figure that was never
                // mounted is the same vacuous green one line up.
                failed = true;
                console.error(
                    `✗ ${label}: ${payScreensMissingQuote(
                        rm.screensMeasured ?? [],
                        rm.screensWithQuote ?? [],
                    ).join(', ')} mounted no [data-role="seller-price"].`,
                );
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
        // Every class the prepares painted: each one must be a class this run
        // measures, and together they must be all of them.
        const contrastClasses = new Set();
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
                for (const { id: theme, rows } of themes) {
                    // A look with no decoration rows (the skeleton) wears
                    // nothing when worn: its worn half is the bare paint again.
                    for (const wornAll of rows === 0 ? [false] : wornStates) {
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
                        for (const cls of first.sheetClasses ?? []) contrastClasses.add(cls);
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
                                        `${t.sel} at ${Math.round(t.x)},${Math.round(t.y)} sits on paint at ${worst.toFixed(2)}:1` +
                                        (process.env.LAYOUT_WHY ? `\n        ${globalThis.__why ?? ''}` : ''),
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
        } else if (sheetClassesWrong([...contrastClasses]) !== undefined) {
            failed = true;
            console.error(`✗ contrast: ${sheetClassesWrong([...contrastClasses])}`);
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
     *
     * **Every clear screen, not one.** Each carries a different figure over
     * the stream — the covenant's asked amount on one, the seller's own quote
     * on the other — and a card this pass never shot is a card nobody proved
     * legible over video.
     */
    const CLEAR_SCREENS = ['broadcast-clear', 'broadcast-quotes-clear', 'broadcast-ticker-clear'];
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
        // The line prints the LEAST clear frame of the set: an average would
        // let one screen that painted a ground hide behind another that did
        // not.
        let clearRatio = 1;
        const clearClasses = new Set();
        for (const screen of CLEAR_SCREENS) {
            for (const { id: theme, rows } of themes) {
                for (const wornAll of rows === 0 ? [false] : [false, true]) {
                    const prep = await contrastPrepare(cdp, sessionId, screen, theme, wornAll);
                    for (const cls of prep.sheetClasses ?? []) clearClasses.add(cls);
                    if (prep.targets.length === 0) {
                        throw new Error(`${screen} prepared no figure boxes — vacuous green.`);
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
                    clearRatio = Math.min(clearRatio, alpha.clear / alpha.total);
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
                                        `${screen} @canvas / theme ${theme}${wornAll ? ' + worn' : ''} ` +
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
        }
        const clearPct = (clearRatio * 100).toFixed(0);
        if (sheetClassesWrong([...clearClasses]) !== undefined) {
            failed = true;
            console.error(`✗ transparency: ${sheetClassesWrong([...clearClasses])}`);
        } else if (dim.length === 0) {
            console.log(
                `✓ transparency (${CLEAR_SCREENS.join(', ')} @canvas): RGBA capture, ${clearPct}% of the frame ` +
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
    for (const group of [server, browser]) {
        const why = earlyExit(group);
        if (why !== undefined && !err.message.includes(why)) console.error(`layout-check: ${why}`);
    }
} finally {
    // Every process of both groups is gone before the profile is removed:
    // Chrome writes to it on the way down.
    await stopGroups();
}

// Asked before the verdict as well as on the way out, so a moved config never
// prints "passed" above the line that fails it.
if (appConfigMoved()) failed = true;
if (interruptedCode() !== undefined) failed = true;
console.log(failed ? '\nlayout-check: FAILED' : '\nlayout-check: passed');
process.exit(interruptedCode() ?? (failed ? 1 : 0));
