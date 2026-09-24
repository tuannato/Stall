#!/usr/bin/env node
/**
 * `pnpm looks:diff <ref> [--expect <screen,screen,…>]` — what a change moved
 * on screen, in pixels.
 *
 * A CSS change that says "nothing a visitor sees moves" is a claim, and the
 * probe cannot back it: its rules are about covering, cutting and contrast,
 * and its clip and contrast counts are tallies, not pictures (the step-2
 * critic's item 11). This builds the showroom twice — `<ref>` from
 * `git archive` in a temporary directory (the working tree's `node_modules`
 * linked in), and the working tree as it stands — paints the same fixture
 * on both, screen by screen, and compares the two captures pixel for pixel.
 *
 * - **What is shot** is the working tree's `diffPlan` (`layout/shotPlan.ts`,
 *   published by the showroom as `__diffPlan()`): every shipped look on every
 *   screen the probe measures it on, at the width the probe measures it — 390
 *   and 1280 for the page screens, 1920 for the canvas screens, and the shop
 *   window's two portrait sizes — bare and fully worn (`wornOf(look, 0xffff)`,
 *   the probe's `wornAll`). The door is shot under the default look alone.
 * - **A screen one side does not have** is not compared, and is listed with
 *   the number of shots it would have taken.
 * - **One origin for both.** Every link this app composes is built from
 *   `location.origin`, so the two builds are served one after the other on
 *   the same port, each in its own browser context and window (`openSide`).
 *   Both sides paint the same neutral screen first or neither does
 *   (`neutral`), decided before either side is shot.
 * - **Deterministic by construction.** Chrome is off the network
 *   (`--host-resolver-rules`, so icons are letters on both sides) and
 *   rasters every tile whole (`--disable-partial-raster`: with partial
 *   raster on, one Neo pixel and a Rural card's corner came out in one of two
 *   states per page load — measured, 12 loads of each shot identical with it
 *   off); the viewport comes from CDP; every job paints a screen with no
 *   running line first (`invalid`) so a marquee starts its cycle again; every
 *   animation is paused `AT_MS` into its active phase with its delay zeroed;
 *   `Date` runs from one fixed instant on every load (`FIXED_CLOCK` in
 *   `browser.mjs`, which the probe's contrast passes share); a
 *   capture is believed once two in a row agree (`settledShot`); the door is
 *   shot under reduced motion (its paste box types on a timer, not on an
 *   animation); each page is reloaded every minute, so a pay sheet's rate —
 *   stamped at page load in the fixtures — never ages past its two-minute
 *   window; and the ticker's moving ribbon (`[data-ribbon="moving"]`) is
 *   masked, because no pause puts a ribbon that has been running since the
 *   page loaded in the same place twice.
 * - **A page is thrown away after `LOADS_PER_PAGE` loads** and a fresh one
 *   opened in a fresh browser context (`openPage`): a renderer that reloads
 *   the showroom keeps its old documents alive, and after ~130–250 loads it
 *   crashed or stopped answering — which the recheck phase, reloading before
 *   every shot, reached once a change moved ~400 shots (measured 2026-09-24,
 *   `looks-diff-lib.mjs` has the numbers). The count of renewals is printed.
 *   A fresh context starts with a cold HTTP cache and no fonts loaded; each
 *   shot still waits for `document.fonts.ready` and two agreeing captures,
 *   and a shot that came out different anyway is re-shot on both sides and
 *   can only land as inconclusive, never as a pass.
 * - **Every shot that differs is judged on a second pair.** Both sides are
 *   shot again on freshly loaded pages, and `classify`
 *   (`looks-diff-lib.mjs`) calls the shot **real** when some pixel differs in
 *   both pairs while each side agrees with itself there — whatever its size;
 *   **noise** when only one pair differs, by at most `NOISE_PX`; and
 *   **inconclusive** otherwise. Nothing is dropped: every non-identical shot
 *   is listed under its verdict, with its before / after / diff PNGs.
 * - **`--expect`** names the screens the change is meant to move. A run whose
 *   real differences are all on those screens, and on every one of them,
 *   passes with them listed as expected.
 * - **What is written**: every non-identical shot as `<stem>-before.png`
 *   (`<ref>`), `<stem>-after.png` (the working tree) and `<stem>-diff.png`
 *   (the after, faded, with every differing pixel of the first pair in red),
 *   under `.looks-diff/shots/` — gitignored, and emptied at the start of a
 *   run.
 *
 * Exit 0: nothing differs but what was expected. Exit 1: a real difference
 * somewhere not expected, or an expected screen that did not differ or was
 * not compared. Exit 2: a shot is inconclusive (and nothing earns a 1) — no
 * pass. Exit 3: the run itself failed. Its own ports (`LOOKS_DIFF_PORT`,
 * `LOOKS_DIFF_CDP_PORT`), refused when taken, and the same process-group
 * cleanup as the probe and the kit (`process-groups.mjs`).
 *
 * What it cannot see: a difference the fixtures never paint, an animation at
 * any other instant than the one it pauses on, whatever moves under the
 * ribbon's mask, and a `<ref>` whose dependencies differ from the working
 * tree's `node_modules` (both builds use the working tree's).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHROMES, FIXED_CLOCK, decodePng, devtools, encodePng, findChrome } from './browser.mjs';
import { LOADS_PER_PAGE, classify, diffMap, pageIsSpent, summarize } from './looks-diff-lib.mjs';
import {
    earlyExit,
    interruptedCode,
    onTeardown,
    refuseTakenPort,
    spawnGroup,
    stopGroup,
    stopGroups,
    stopOnSignals,
    waitUntil,
} from './process-groups.mjs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
process.chdir(ROOT);

/** The showroom's build: the app's own config plus the gallery entry. Any command it knows will do. */
const CONFIG = 'vite.workshop.config.ts';
const CONFIG_CMD = 'shots';
const OUT = '.looks-diff';
const SHOTS = join(OUT, 'shots');
const WORK_BUILD = join(OUT, 'build');
const REF_BUILD = '.looks-diff-build';
/** One port for both builds, one after the other: two ports are two origins (see `openSide`). */
const PORT = process.env.LOOKS_DIFF_PORT ?? '4351';
const CDP_PORT = process.env.LOOKS_DIFF_CDP_PORT ?? '9351';
/** The ref's first captures, waiting for the same job in the working tree. */
const STASH = join(OUT, 'stash');
/** The screen painted before every job: no marquee, no ticker, no sheet. */
const NEUTRAL = 'invalid';
/**
 * The instant every animation is paused at — the probe's contrast pass's —
 * counted from the start of its active phase, never from its delay. A
 * marquee and the ticker continue a run across repaints through a NEGATIVE
 * delay equal to the time since the run began, which is wall-clock time and
 * differs between two runs: paused at `currentTime = AT_MS`, the ticker's
 * ribbon stood a few pixels apart between a tree and itself, and a
 * `currentTime` below zero to cancel the delay is not taken. So each
 * animation's delay is set to zero before it is paused `AT_MS` in.
 */
const AT_MS = 400;
const TWO_FRAMES =
    '(async () => { await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res))); })()';
const HOLD =
    '(async () => { for (const a of document.getAnimations()) { a.pause(); ' +
    'try { a.effect?.updateTiming?.({ delay: 0 }); } catch { /* not ours to time */ } ' +
    `try { a.currentTime = ${AT_MS}; } catch { /* finished */ } } ` +
    'await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res))); ' +
    // What is masked: the ticker's running ribbon, as its cell clips it.
    'return [...document.querySelectorAll(\'[data-ribbon="moving"]\')].map((n) => { ' +
    'const r = n.getBoundingClientRect(); ' +
    'return { x: Math.floor(r.x), y: Math.floor(r.y), w: Math.ceil(r.width) + 1, h: Math.ceil(r.height) + 1 }; }); })()';
/** Captures taken until two in a row agree, at most, before a shot is reported as unsettled. */
const SETTLE_TRIES = 3;
/** Reload a page this often: the pay fixtures stamp their rate at load, and it ages at 120 s. */
const RELOAD_MS = 60_000;
/** Never grow a capture past this; a longer page is shot to here on both sides. */
const MAX_H = 12_000;
/** Past this, a page that has not answered is stuck, and the run says so rather than waiting for ever. */
const STEP_TIMEOUT_MS = 60_000;

const EXIT_FAILED = 3;

function usage(message) {
    console.error(
        `looks:diff: ${message}\n\n` +
            'Usage: pnpm looks:diff <ref> [--expect <screen,screen,…>]\n' +
            '  Builds <ref> (a commit, tag or branch) and the working tree, shoots every shipped look\n' +
            '  on the probe\'s screens on both, and lists every shot whose pixels differ. --expect names\n' +
            '  the screens the change is meant to move.',
    );
    process.exit(EXIT_FAILED);
}

const args = process.argv.slice(2);
let expected = [];
const positional = [];
for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--expect') {
        const list = args[i + 1];
        if (list === undefined || list.startsWith('--')) usage('--expect needs a comma-separated list of screens.');
        expected = list.split(',').map((s) => s.trim()).filter((s) => s !== '');
        i += 1;
    } else if (args[i].startsWith('-')) {
        usage(`no option "${args[i]}".`);
    } else {
        positional.push(args[i]);
    }
}
const ref = positional[0];
if (ref === undefined) usage('a ref is required — there is no default to compare against.');
if (positional.length > 1) usage(`one ref, not ${positional.length}.`);

function git(gitArgs, opts = {}) {
    const r = spawnSync('git', gitArgs, { encoding: 'buffer', maxBuffer: 1 << 30, ...opts });
    if (r.status !== 0) {
        throw new Error(`git ${gitArgs.join(' ')} exited ${r.status}: ${r.stderr?.toString().trim() ?? ''}`);
    }
    return r.stdout;
}

const shaRun = spawnSync('git', ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], { encoding: 'utf8' });
if (shaRun.status !== 0) usage(`"${ref}" names no commit here.`);
const sha = shaRun.stdout.trim();

const chrome = findChrome();
if (chrome === undefined) {
    console.error(`looks:diff: no Chrome found. Install one of: ${CHROMES.join(', ')}`);
    process.exit(EXIT_FAILED);
}

stopOnSignals('looks:diff');

function build(cwd, outDir, what) {
    const r = spawnSync('npx', ['vite', 'build', '--config', CONFIG, '--outDir', outDir, '--logLevel', 'error'], {
        cwd,
        stdio: 'inherit',
        env: { ...process.env, STALL_WORKSHOP_CMD: CONFIG_CMD },
    });
    if (r.status !== 0) throw new Error(`the ${what} build failed (vite exited ${r.status})`);
    if (!existsSync(join(cwd, outDir, 'layout', 'gallery.html'))) {
        throw new Error(`the ${what} build has no showroom (layout/gallery.html): looks:diff needs a tree that has one`);
    }
}

function preview(cwd, outDir, name) {
    return spawnGroup(
        name,
        'npx',
        ['vite', 'preview', '--config', CONFIG, '--outDir', outDir, '--port', PORT, '--strictPort'],
        { env: { ...process.env, STALL_WORKSHOP_CMD: CONFIG_CMD }, cwd },
    );
}

async function evaluate(cdp, sessionId, expression) {
    let timer;
    const stuck = new Promise((_, reject) => {
        timer = setTimeout(
            () => reject(new Error(`a page did not answer within ${STEP_TIMEOUT_MS / 1000}s: ${expression.slice(0, 80)}`)),
            STEP_TIMEOUT_MS,
        );
    });
    const r = await Promise.race([
        cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId),
        stuck,
    ]).finally(() => clearTimeout(timer));
    if (r.exceptionDetails) {
        throw new Error(`the showroom threw: ${r.exceptionDetails.exception?.description ?? JSON.stringify(r.exceptionDetails)}`);
    }
    return r.result.value;
}

/** The after image faded to grey, every pixel of `map` in red. */
function diffPicture(after, map) {
    const { width, height } = map;
    const data = Buffer.alloc(width * height * 4);
    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const o = (y * width + x) * 4;
            if (map.bits[y * width + x] === 1) {
                data[o] = 255;
                data[o + 1] = 0;
                data[o + 2] = 0;
            } else {
                let grey = 255;
                if (x < after.width && y < after.height) {
                    const b = (y * after.width + x) * after.bpp;
                    grey = Math.round((after.data[b] + after.data[b + 1] + after.data[b + 2]) / 3);
                }
                const faded = 200 + Math.round(grey * 0.2);
                data[o] = faded;
                data[o + 1] = faded;
                data[o + 2] = faded;
            }
            data[o + 3] = 255;
        }
    }
    return encodePng({ width, height, data });
}

let code = 0;
/** The groups this run started, for the sentence that says one died early. */
const started = [];
/** Sides that handed back a shot whose captures never agreed twice in a row. */
const unsettled = new Set();
/** Pages closed and opened afresh after `LOADS_PER_PAGE` loads (`load`), reported with the tally. */
let pagesRenewed = 0;
const startedAt = Date.now();
try {
    rmSync(SHOTS, { recursive: true, force: true });
    rmSync(STASH, { recursive: true, force: true });
    const tree = mkdtempSync(join(tmpdir(), 'stall-looks-diff-'));
    onTeardown(() => {
        rmSync(STASH, { recursive: true, force: true });
        try {
            rmSync(tree, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
        } catch {
            console.error(`looks:diff: left a temporary tree behind at ${tree}`);
        }
    });
    const archive = git(['archive', '--format=tar', sha]);
    const untar = spawnSync('tar', ['-x', '-C', tree], { input: archive, maxBuffer: 1 << 30 });
    if (untar.status !== 0) throw new Error(`tar exited ${untar.status}: ${untar.stderr?.toString().trim()}`);
    // The link, not a copy: `fs.rm` removes a link without following it.
    symlinkSync(join(ROOT, 'node_modules'), join(tree, 'node_modules'), 'dir');
    const kitMoved =
        spawnSync('git', ['diff', '--quiet', sha, '--', 'workshop'], { stdio: 'ignore' }).status !== 0 ||
        git(['status', '--porcelain', '--', 'workshop']).length > 0;
    if (kitMoved) {
        console.log(
            `  note: workshop/ differs from ${ref}. Both showrooms build the kit's own sheet, and its ` +
                'selectors reach only `.t-workshop`, which no shipped look wears.',
        );
    }

    console.log(`  building ${ref} (${sha.slice(0, 12)}) …`);
    build(tree, REF_BUILD, ref);
    console.log('  building the working tree …');
    build(ROOT, WORK_BUILD, 'working tree');

    await refuseTakenPort(CDP_PORT, 'Chrome DevTools endpoint');
    const profile = mkdtempSync(join(tmpdir(), 'stall-looks-diff-chrome-'));
    onTeardown(() => {
        try {
            rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
        } catch {
            console.error(`looks:diff: left a temp profile behind at ${profile}`);
        }
    });
    const browser = spawnGroup(
        'Chrome',
        chrome,
        [
            '--headless=new',
            '--disable-gpu',
            // Every tile rastered whole — see the docblock's "Deterministic".
            '--disable-partial-raster',
            // Off the network, like the probe's and the kit's: icons are
            // letters on both sides, and nothing a sheet names loads.
            '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost',
            '--no-sandbox',
            '--hide-scrollbars',
            `--user-data-dir=${profile}`,
            `--remote-debugging-port=${CDP_PORT}`,
            'about:blank',
        ],
        { stderr: 'ignore' },
    );
    started.push(browser);
    const wsUrl = await waitUntil(
        'Chrome',
        async () => {
            const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
            return res.ok ? (await res.json()).webSocketDebuggerUrl : undefined;
        },
        { watch: [browser] },
    );
    const cdp = devtools(wsUrl);
    await cdp.opened;
    const gallery = `http://localhost:${PORT}/layout/gallery.html`;

    /*
     * One side at a time, on ONE port. The two builds cannot be served side
     * by side: every link this app composes is built from `location.origin`
     * — the share code, the stream card's code, a printed tag's, the embed
     * snippet — so two ports are two origins and every code on every screen
     * differs (measured: 218 of 700 shots of one tree against itself, all of
     * them codes and links, when the first version served the two builds on
     * two ports at once). Each side gets its own browser context, so neither
     * storage nor the HTTP cache carries from one build to the other, and its
     * own window — a second tab of one window is hidden, and a hidden page
     * runs no animation frame (the paint below would wait for ever).
     */
    const sides = {
        ref: { cwd: tree, outDir: REF_BUILD, name: ref },
        work: { cwd: ROOT, outDir: WORK_BUILD, name: 'working tree' },
    };
    async function openSide(which) {
        const { cwd, outDir, name } = sides[which];
        await refuseTakenPort(PORT, `${name} preview server`);
        const server = preview(cwd, outDir, `the ${name} preview server`);
        started.push(server);
        const watch = [server, browser];
        await waitUntil(`the ${name} preview`, async () => (await fetch(gallery)).ok, { watch });
        const side = { name, server, watch };
        await openPage(side);
        return side;
    }
    /*
     * A side's page: its own browser context and window, the fixed clock, and
     * nothing emulated yet. Opened with the side and again whenever the page
     * has taken `LOADS_PER_PAGE` loads (`load` below), because a renderer
     * that reloads the showroom hundreds of times keeps the old documents
     * alive until it crashes — the recheck phase reloads before every shot.
     */
    async function openPage(side) {
        const { browserContextId } = await cdp.send('Target.createBrowserContext', {});
        const { targetId } = await cdp.send('Target.createTarget', {
            url: 'about:blank',
            browserContextId,
            newWindow: true,
        });
        const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
        await cdp.send('Page.enable', {}, sessionId);
        await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: FIXED_CLOCK }, sessionId);
        Object.assign(side, { browserContextId, targetId, sessionId, width: 0, height: 0, reduced: false, loadedAt: 0, loads: 0 });
    }
    async function closePage(side) {
        await cdp.send('Target.closeTarget', { targetId: side.targetId });
        await cdp.send('Target.disposeBrowserContext', { browserContextId: side.browserContextId });
    }
    async function closeSide(side) {
        await closePage(side);
        await stopGroup(side.server);
    }
    const metrics = async (side, width, height) => {
        if (side.width === width && side.height === height) return;
        await cdp.send(
            'Emulation.setDeviceMetricsOverride',
            { width, height, deviceScaleFactor: 1, mobile: false },
            side.sessionId,
        );
        side.width = width;
        side.height = height;
    };
    const reduce = async (side, on) => {
        if (side.reduced === on) return;
        await cdp.send(
            'Emulation.setEmulatedMedia',
            { features: on ? [{ name: 'prefers-reduced-motion', value: 'reduce' }] : [] },
            side.sessionId,
        );
        side.reduced = on;
    };
    const load = async (side, query = 'look=1&chrome=0') => {
        if (pageIsSpent(side.loads)) {
            await closePage(side);
            await openPage(side);
            pagesRenewed += 1;
        }
        side.loads += 1;
        await cdp.send('Page.navigate', { url: `${gallery}?${query}` }, side.sessionId);
        // Its own loop rather than `waitUntil`, so a showroom that never comes
        // up says what the page last answered.
        const deadline = Date.now() + 30_000;
        let last = 'nothing';
        for (;;) {
            for (const group of side.watch) {
                const why = earlyExit(group);
                if (why !== undefined) throw new Error(why);
            }
            try {
                const state = await evaluate(
                    cdp,
                    side.sessionId,
                    "JSON.stringify({ ready: window.__galleryReady === true, doc: document.readyState, at: location.href })",
                );
                if (JSON.parse(state).ready) break;
                last = state;
            } catch (err) {
                last = err.message;
            }
            if (Date.now() > deadline) throw new Error(`the ${side.name} showroom never came up; it last answered ${last}`);
            await new Promise((resolve) => setTimeout(resolve, 200));
        }
        side.loadedAt = Date.now();
    };
    // The screens a side can paint. A tree from before `__screens` names them
    // only in the control panel's picker, so that side is read with the
    // panel on.
    const screensOf = async (side) => {
        await load(side, 'look=1');
        const screens = new Set(
            await evaluate(
                cdp,
                side.sessionId,
                "typeof window.__screens === 'function' ? window.__screens() : " +
                    "[...(document.querySelector('#gallery-ui select')?.options ?? [])].map((o) => o.value)",
            ),
        );
        // That page carries the control panel: the next shot loads one without.
        side.loadedAt = 0;
        return screens;
    };
    const paint = (side, job, neutral) =>
        evaluate(
            cdp,
            side.sessionId,
            `(async () => { ` +
                (neutral ? `window.__paint(${JSON.stringify(NEUTRAL)}, ${job.look}, 0); ` : '') +
                `window.__paint(${JSON.stringify(job.screen)}, ${job.look}, ${job.flags}); ` +
                'await document.fonts.ready; ' +
                'await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res))); ' +
                'const scroll = document.querySelector(".stall-scroll"); ' +
                'return { classes: window.__sheetClasses(), ' +
                'pageH: Math.max(document.documentElement.scrollHeight, scroll?.scrollHeight ?? 0) }; })()',
        );
    /*
     * A capture is believed once two in a row agree. Right after a resize
     * and a repaint, Chrome can hand back a frame with a stale tile in it —
     * the probe's contrast pass met the same (`layout-check.mjs`).
     */
    async function settledShot(side) {
        const capture = async () =>
            Buffer.from(
                (await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true }, side.sessionId)).data,
                'base64',
            );
        let last = await capture();
        for (let tries = 0; tries < SETTLE_TRIES; tries += 1) {
            await evaluate(cdp, side.sessionId, TWO_FRAMES);
            const next = await capture();
            if (next.equals(last)) return next;
            last = next;
        }
        unsettled.add(side.name);
        return last;
    }
    /** One job on one side: its capture as PNG bytes, the masks, and the look classes it painted. */
    async function shoot(side, job, neutral, fresh = false) {
        if (fresh || side.loadedAt === 0 || Date.now() - side.loadedAt > RELOAD_MS) {
            await load(side);
        }
        const { width, height } = job.viewport;
        await metrics(side, width, height);
        await reduce(side, job.screen === 'door');
        let state = await paint(side, job, neutral);
        const grown = Math.min(MAX_H, Math.max(height, state.pageH));
        if (grown !== height) {
            await metrics(side, width, grown);
            state = await paint(side, job, neutral);
        }
        const masks = await evaluate(cdp, side.sessionId, HOLD);
        return { png: await settledShot(side), masks, classes: state.classes.join(' ') };
    }
    const progress = (label, done, total) => {
        if (done % 100 === 0) {
            console.log(`  … ${label} ${done} of ${total} — ${((Date.now() - startedAt) / 1000).toFixed(0)}s`);
        }
    };

    // A. The working tree's plan and screens; the ref's screens. Both sides
    //    paint the neutral screen first, or neither does.
    let side = await openSide('work');
    const workScreens = await screensOf(side);
    const only = (process.env.LOOKS_DIFF_SCREENS ?? '').split(',').filter((name) => name !== '');
    const plan = (await evaluate(cdp, side.sessionId, 'window.__diffPlan()')).filter(
        // LOOKS_DIFF_SCREENS narrows a run to named screens, to look into one.
        (job) => only.length === 0 || only.includes(job.screen),
    );
    await closeSide(side);
    side = await openSide('ref');
    const refScreens = await screensOf(side);
    if (refScreens.size === 0) throw new Error(`the ${ref} showroom named no screens — nothing would be compared`);
    const neutral = workScreens.has(NEUTRAL) && refScreens.has(NEUTRAL);
    const toShoot = plan.filter((job) => refScreens.has(job.screen));
    const onlyWork = new Map();
    for (const job of plan.filter((j) => !refScreens.has(j.screen))) {
        onlyWork.set(job.screen, (onlyWork.get(job.screen) ?? 0) + 1);
    }
    console.log(
        `  ${plan.length} shots over ${new Set(plan.map((job) => job.viewport.name)).size} viewports; ` +
            `${toShoot.length} on screens both sides paint.`,
    );

    // B. The ref's first captures, stashed.
    const firstRef = new Map();
    let done = 0;
    for (const job of toShoot) {
        const shot = await shoot(side, job, neutral);
        const at = join(STASH, `${job.file}.png`);
        mkdirSync(dirname(at), { recursive: true });
        writeFileSync(at, shot.png);
        firstRef.set(job.file, { masks: shot.masks, classes: shot.classes });
        progress(ref, (done += 1), toShoot.length);
    }
    await closeSide(side);

    // C. The working tree's first captures, each compared as it lands.
    const differing = [];
    side = await openSide('work');
    done = 0;
    for (const job of toShoot) {
        const shot = await shoot(side, job, neutral);
        const before = readFileSync(join(STASH, `${job.file}.png`));
        const first = firstRef.get(job.file);
        const masks = [...first.masks, ...shot.masks];
        const classNote =
            first.classes === shot.classes
                ? ''
                : ` (painted ${first.classes || 'no look class'} at ${ref}, ${shot.classes || 'no look class'} now)`;
        if (!before.equals(shot.png) || classNote !== '') {
            const d1 = diffMap(decodePng(before), decodePng(shot.png), masks);
            if (d1.count > 0 || classNote !== '') {
                differing.push({ job, before1: before, after1: shot.png, masks, classNote });
            }
        }
        progress('working tree', (done += 1), toShoot.length);
    }
    await closeSide(side);

    // D. Every shot that differed, again, on freshly loaded pages.
    if (differing.length > 0) {
        side = await openSide('ref');
        for (const entry of differing) {
            const shot = await shoot(side, entry.job, neutral, true);
            entry.before2 = shot.png;
            entry.masks.push(...shot.masks);
        }
        await closeSide(side);
        side = await openSide('work');
        for (const entry of differing) {
            const shot = await shoot(side, entry.job, neutral, true);
            entry.after2 = shot.png;
            entry.masks.push(...shot.masks);
        }
        await closeSide(side);
    }
    cdp.close();

    // E. The verdicts, and the pictures behind every one that is not identical.
    const verdicts = [];
    for (const entry of differing) {
        const images = {
            before1: decodePng(entry.before1),
            after1: decodePng(entry.after1),
            before2: decodePng(entry.before2),
            after2: decodePng(entry.after2),
            masks: entry.masks,
        };
        const result = classify(images);
        // A look class that moved is never noise, whatever the pixels say.
        const verdict = entry.classNote !== '' && result.verdict !== 'real' ? 'inconclusive' : result.verdict;
        verdicts.push({ screen: entry.job.screen, verdict, entry, result });
        if (verdict !== 'identical') {
            const stem = join(SHOTS, entry.job.file);
            mkdirSync(dirname(stem), { recursive: true });
            writeFileSync(`${stem}-before.png`, entry.before1);
            writeFileSync(`${stem}-after.png`, entry.after1);
            writeFileSync(`${stem}-diff.png`, diffPicture(images.after1, diffMap(images.before1, images.after1, entry.masks)));
        }
    }

    // F. What the run says.
    const compared = new Set(toShoot.map((job) => job.screen));
    const out = summarize(
        verdicts.filter((v) => v.verdict !== 'identical'),
        { expected, compared },
    );
    const line = ({ entry, result }) =>
        `${entry.job.viewport.name} ${entry.job.screen} × ${entry.job.lookLabel} × ${entry.job.variant}: ` +
        `${result.count} px (first pair ${result.d1}, second ${result.d2}; ` +
        `${ref} against itself ${result.selfRef}, working tree ${result.selfWork})${entry.classNote}`;
    const group = (title, verdict, mark) => {
        const list = verdicts.filter((v) => v.verdict === verdict);
        if (list.length === 0) return;
        console.log(`\n  ${title}:`);
        for (const v of list) console.log(`  ${mark} ${line(v)}`);
    };
    const expectedList = verdicts.filter((v) => v.verdict === 'real' && expected.includes(v.screen));
    const unexpectedList = verdicts.filter((v) => v.verdict === 'real' && !expected.includes(v.screen));
    if (expectedList.length > 0) {
        console.log('\n  real, and expected (--expect):');
        for (const v of expectedList) console.log(`  = ${line(v)}`);
    }
    if (unexpectedList.length > 0) {
        console.log('\n  real, and NOT expected:');
        for (const v of unexpectedList) console.log(`  ✗ ${line(v)}`);
    }
    group('inconclusive — both pairs differ only where a side does not agree with itself, or one pair differs by more than a flicker', 'inconclusive', '?');
    group('noise — one pair only, a few pixels', 'noise', '~');
    console.log('');
    console.log(`  pages renewed after ${LOADS_PER_PAGE} loads each: ${pagesRenewed}`);
    for (const [screen, n] of onlyWork) {
        console.log(`  only in the working tree, not compared: ${screen} (${n} shot${n === 1 ? '' : 's'})`);
    }
    for (const screen of [...refScreens].filter((name) => !workScreens.has(name))) {
        console.log(`  only at ${ref}, not compared: ${screen}`);
    }
    for (const screen of out.notCompared) {
        console.log(`  ✗ expected to differ, and not compared (not painted on both sides): ${screen}`);
    }
    for (const screen of out.unmet) {
        console.log(`  ✗ expected to differ, and did not: ${screen}`);
    }
    if (unsettled.size > 0) {
        console.log(
            `  note: some captures never agreed twice in a row (${[...unsettled].join(', ')}); ` +
                'their shots are judged like any other, on two pairs.',
        );
    }
    if (toShoot.length === 0) throw new Error('no shot was compared');
    const identical = toShoot.length - out.unexpected.length - out.expectedReal.length - out.inconclusive.length - out.noise.length;
    const spent = ((Date.now() - startedAt) / 1000).toFixed(1);
    const tally =
        `${identical} identical, ${out.expectedReal.length} real and expected, ${out.unexpected.length} real and ` +
        `not expected, ${out.inconclusive.length} inconclusive, ${out.noise.length} noise — of ${toShoot.length} shots, ${spent}s`;
    code = out.code;
    if (code === 0) {
        console.log(`\n✓ looks:diff ${ref}: ${tally}`);
    } else {
        console.log(
            `\n✗ looks:diff ${ref}: ${tally}. ` +
                (code === 2 ? 'Inconclusive, so no pass. ' : '') +
                `Before, after and diff PNGs: ${SHOTS}/`,
        );
    }
} catch (err) {
    code = EXIT_FAILED;
    console.error(`\nlooks:diff: ${err.message}`);
    for (const group of started) {
        const why = earlyExit(group);
        if (why !== undefined && !err.message.includes(why)) console.error(`looks:diff: ${why}`);
    }
} finally {
    await stopGroups();
}
process.exit(interruptedCode() ?? code);
