#!/usr/bin/env node
/**
 * The workshop kit's commands (`package.json`):
 *
 *   pnpm workshop:start <modern|neo|rural>   start from one of Stall's looks
 *   pnpm workshop                            build and serve the showroom
 *   pnpm workshop:shots                      screenshot every probed screen
 *   pnpm workshop:probe                      the layout probe on the kit's look
 *   pnpm workshop:lint                       (its own script: workshop-lint.mjs)
 *
 * Every command that builds validates `workshop/look.json` first and prints
 * every fault in it, so a creator reads the list here rather than meeting a
 * blank page; builds from `vite.workshop.config.ts` into its own outDir under
 * `.workshop-dist/`; and never writes `vite.config.ts` — it fails if that file
 * changed while it ran, `layout-check.mjs`'s tripwire and its reason.
 *
 * Offline after one `pnpm install`: the preview serves a policy with no icon
 * host, and the headless Chrome for shots and the probe resolves nothing but
 * localhost.
 *
 * The look's TypeScript half (the validator, the starter's row) is loaded
 * through Vite's `runnerImport`, because Node cannot import the extensionless
 * `src/` modules it rests on; the CSS half is `workshop-css.mjs`.
 */
import { spawn, spawnSync } from 'node:child_process';
import {
    existsSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    readdirSync,
    rmSync,
    statSync,
    writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lintSheet, rescopeSheet, sheetHasRules } from './workshop-css.mjs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
process.chdir(ROOT);

const BASES = ['modern', 'neo', 'rural'];
const WORKSHOP_CONFIG = 'vite.workshop.config.ts';
const KIT_LOOK_ID = 0xff;
const SHOTS_OUT = '.workshop-dist/shots-out';
const CDP_PORT = process.env.WORKSHOP_CDP_PORT ?? '9342';
const CHROMES = ['google-chrome', 'chromium', 'chromium-browser', 'google-chrome-stable'];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function usage(message) {
    if (message !== undefined) console.error(`workshop: ${message}\n`);
    console.error(
        'Usage:\n' +
            '  pnpm workshop:start <modern|neo|rural>   start from one of Stall\'s looks\n' +
            '  pnpm workshop                            build and serve the showroom\n' +
            '  pnpm workshop:shots                      screenshot every probed screen\n' +
            '  pnpm workshop:probe                      the layout probe on your look\n' +
            '  pnpm workshop:lint                       the static read of your sheet',
    );
    process.exit(1);
}

/* ---------- the app's config is read, never written ---------- */

const APP_CONFIG = 'vite.config.ts';
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
            `\nworkshop: FAILED — ${APP_CONFIG} changed while this ran. ` +
                'Nothing here writes it; find what did before trusting this run.',
        );
        process.exitCode = 1;
    }
});

/* ---------- the TypeScript half ---------- */

async function tsModule(path) {
    const { runnerImport } = await import('vite');
    const { module } = await runnerImport(path, { configFile: false, logLevel: 'silent' });
    return module;
}

/** Stop with every fault `look.json` has, or return. */
async function requireReadableLook(dir = 'workshop') {
    const { workshopLookProblems } = await tsModule('./layout/workshopLook.ts');
    const path = join(dir, 'look.json');
    let text;
    try {
        text = readFileSync(path, 'utf8');
    } catch (err) {
        console.error(`workshop: cannot read ${path}: ${err.message}`);
        process.exit(1);
    }
    const problems = workshopLookProblems(text);
    if (problems.length > 0) {
        console.error(`✗ ${path} has ${problems.length} problem${problems.length === 1 ? '' : 's'}:`);
        for (const problem of problems) console.error(`    ${problem}`);
        process.exit(1);
    }
}

async function commandSettings(command) {
    const { WORKSHOP_COMMANDS } = await tsModule(`./${WORKSHOP_CONFIG}`);
    return WORKSHOP_COMMANDS[command];
}

function buildFor(command) {
    const r = spawnSync('npx', ['vite', 'build', '--config', WORKSHOP_CONFIG, '--logLevel', 'error'], {
        stdio: 'inherit',
        env: { ...process.env, STALL_WORKSHOP_CMD: command },
    });
    if (r.status !== 0) {
        throw new Error(`the ${command} build failed (vite exited ${r.status})`);
    }
}

/* ---------- start ---------- */

async function start(args) {
    let dir = 'workshop';
    const rest = [];
    for (let i = 0; i < args.length; i += 1) {
        if (args[i] === '--dir') {
            dir = args[i + 1];
            i += 1;
        } else {
            rest.push(args[i]);
        }
    }
    const base = rest[0];
    if (!BASES.includes(base)) usage(`start needs one of ${BASES.join(', ')}`);
    const sheetPath = join(dir, 'theme-workshop.css');
    const lookPath = join(dir, 'look.json');
    if (existsSync(sheetPath) && sheetHasRules(readFileSync(sheetPath, 'utf8'))) {
        console.error(
            `workshop:start: ${sheetPath} already has rules in it, and they are yours. ` +
                'Move it aside (or empty it) to start again.',
        );
        process.exit(1);
    }
    const starter = await tsModule('./layout/workshopStarter.ts');
    if (existsSync(lookPath)) {
        let current;
        try {
            current = JSON.parse(readFileSync(lookPath, 'utf8'));
        } catch {
            current = undefined;
        }
        if (!starter.isSkeleton(current)) {
            console.error(
                `workshop:start: ${lookPath} is not the untouched skeleton, and what you wrote there is yours. ` +
                    'Move it aside to start again.',
            );
            process.exit(1);
        }
    }
    // The look's own sheet, and whatever another shipped sheet keeps for this
    // look (broadcast.css's plate rules today) — the look whole, re-scoped.
    const carried = readdirSync('src/ui')
        .filter((name) => name.endsWith('.css') && !name.startsWith('theme-'))
        .sort()
        .map((name) => ({ from: `src/ui/${name}`, css: readFileSync(join('src/ui', name), 'utf8') }));
    const css = rescopeSheet(readFileSync(`src/ui/theme-${base}.css`, 'utf8'), base, carried);
    const cssProblems = lintSheet(css);
    const lookText = starter.lookFileText(starter.starterLook(base));
    const { workshopLookProblems } = await tsModule('./layout/workshopLook.ts');
    const lookProblems = workshopLookProblems(lookText);
    if (cssProblems.length > 0 || lookProblems.length > 0) {
        // The starter is Stall's, not the creator's: a starter that fails its
        // own lint is a defect here, and writing it would teach them red.
        throw new Error(
            `the ${base} starter does not pass its own checks:\n    ${[...cssProblems, ...lookProblems].join('\n    ')}`,
        );
    }
    mkdirSync(join(dir, 'art'), { recursive: true });
    writeFileSync(sheetPath, css);
    writeFileSync(lookPath, lookText);
    console.log(
        `✓ workshop:start ${base}: ${sheetPath} (${css.length} bytes, re-scoped to .t-workshop) and ${lookPath}.\n` +
            '  Next: pnpm workshop (the showroom), pnpm workshop:probe (the rules).',
    );
}

/* ---------- serve ---------- */

async function serve() {
    await requireReadableLook();
    const { port } = await commandSettings('serve');
    buildFor('serve');
    const server = spawn('npx', ['vite', 'preview', '--config', WORKSHOP_CONFIG], {
        stdio: 'inherit',
        env: { ...process.env, STALL_WORKSHOP_CMD: 'serve' },
    });
    const url = `http://localhost:${port}/layout/gallery.html?look=${KIT_LOOK_ID}`;
    setTimeout(() => {
        console.log(`\n  Showroom: ${url}\n  (Ctrl-C to stop.)\n`);
    }, 1500);
    for (const signal of ['SIGINT', 'SIGTERM']) {
        process.on(signal, () => server.kill(signal));
    }
    await new Promise((resolve) => server.on('exit', resolve));
}

/* ---------- probe ---------- */

async function probe() {
    await requireReadableLook();
    const { port } = await commandSettings('probe');
    const r = spawnSync(
        'node',
        ['scripts/layout-check.mjs', '--config', WORKSHOP_CONFIG, '--looks', 'workshop'],
        {
            stdio: 'inherit',
            env: {
                ...process.env,
                STALL_WORKSHOP_CMD: 'probe',
                LAYOUT_PORT: process.env.LAYOUT_PORT ?? String(port),
                LAYOUT_CDP_PORT: process.env.LAYOUT_CDP_PORT ?? '9343',
            },
        },
    );
    process.exitCode = r.status ?? 1;
}

/* ---------- shots ---------- */

function findChrome() {
    for (const bin of CHROMES) {
        if (spawnSync('which', [bin]).status === 0) return bin;
    }
    return undefined;
}

/** The smallest CDP client that does this job — `layout-check.mjs` carries the same. */
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

async function waitFor(what, probeFn, tries = 150, every = 200) {
    for (let i = 0; i < tries; i += 1) {
        try {
            const value = await probeFn();
            if (value !== undefined && value !== false) return value;
        } catch {
            // Not up yet.
        }
        await sleep(every);
    }
    throw new Error(`${what} never came up`);
}

async function evaluate(cdp, sessionId, expression) {
    const r = await cdp.send(
        'Runtime.evaluate',
        { expression, awaitPromise: true, returnByValue: true },
        sessionId,
    );
    if (r.exceptionDetails) {
        throw new Error(`the showroom threw: ${JSON.stringify(r.exceptionDetails.exception?.description ?? r.exceptionDetails)}`);
    }
    return r.result.value;
}

function escapeHtml(text) {
    return text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

function contactSheet(shots) {
    const byViewport = new Map();
    for (const shot of shots) {
        const key = `${shot.viewport.name} · ${shot.viewport.width}×${shot.viewport.height}`;
        if (!byViewport.has(key)) byViewport.set(key, []);
        byViewport.get(key).push(shot);
    }
    const sections = [...byViewport]
        .map(
            ([title, list]) =>
                `<h2>${escapeHtml(title)}</h2>\n<div class="grid">\n` +
                list
                    .map(
                        (shot) =>
                            `<figure><a href="${escapeHtml(shot.file)}"><img loading="lazy" src="${escapeHtml(shot.file)}" alt=""></a>` +
                            `<figcaption>${escapeHtml(shot.screen)} · ${escapeHtml(shot.variant)}` +
                            `${shot.ground ? ` · over ${shot.ground}` : ''}${shot.at !== undefined ? ` · ${shot.at} ms` : ''}</figcaption></figure>`,
                    )
                    .join('\n') +
                '\n</div>',
        )
        .join('\n');
    return (
        '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>Workshop shots</title>\n' +
        '<style>body{font:13px/1.4 system-ui,sans-serif;margin:24px;background:#f4f4f2;color:#14171a}' +
        '.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}' +
        'figure{margin:0}img{width:100%;height:auto;border:1px solid #ccc;background:#fff}' +
        'figcaption{margin-top:4px;color:#5f6975}</style></head><body>\n' +
        `<h1>Workshop shots — ${shots.length}</h1>\n${sections}\n</body></html>\n`
    );
}

async function shots() {
    await requireReadableLook();
    const chrome = findChrome();
    if (chrome === undefined) {
        console.error(`workshop:shots: no Chrome found. Install one of: ${CHROMES.join(', ')}`);
        process.exit(1);
    }
    const { port } = await commandSettings('shots');
    const startedAt = Date.now();
    buildFor('shots');
    let server;
    let browser;
    let profile;
    try {
        server = spawn('npx', ['vite', 'preview', '--config', WORKSHOP_CONFIG], {
            stdio: 'ignore',
            detached: true,
            env: { ...process.env, STALL_WORKSHOP_CMD: 'shots' },
        });
        profile = mkdtempSync(join(tmpdir(), 'stall-workshop-'));
        browser = spawn(
            chrome,
            [
                '--headless=new',
                '--disable-gpu',
                // Off the network, like the probe's browser: icons are letters
                // here, and nothing a sheet names can load from elsewhere.
                '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost',
                '--no-sandbox',
                '--hide-scrollbars',
                `--user-data-dir=${profile}`,
                `--remote-debugging-port=${CDP_PORT}`,
                'about:blank',
            ],
            { stdio: 'ignore', detached: true },
        );
        const wsUrl = await waitFor('Chrome', async () => {
            const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
            return res.ok ? (await res.json()).webSocketDebuggerUrl : undefined;
        });
        const gallery = `http://localhost:${port}/layout/gallery.html`;
        await waitFor('the preview server', async () => (await fetch(gallery)).ok);
        const cdp = devtools(wsUrl);
        await cdp.opened;
        const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
        const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
        const metrics = (width, height) =>
            cdp.send(
                'Emulation.setDeviceMetricsOverride',
                { width, height, deviceScaleFactor: 1, mobile: false },
                sessionId,
            );
        await metrics(390, 844);
        await cdp.send('Page.navigate', { url: `${gallery}?look=${KIT_LOOK_ID}&chrome=0` }, sessionId);
        await waitFor('the showroom', () => evaluate(cdp, sessionId, 'window.__galleryReady === true'));
        const plan = await evaluate(cdp, sessionId, 'window.__shotPlan()');
        const viewports = new Set(plan.map((job) => job.viewport.name)).size;
        console.log(
            `  workshop:shots: ${plan.length} paints over ${viewports} viewports; a screen with a running ` +
                `animation takes a second instant, so up to ${plan.length * 2} PNGs.`,
        );
        rmSync(SHOTS_OUT, { recursive: true, force: true });
        const written = [];
        let current = '';
        const settle = (job) =>
            evaluate(
                cdp,
                sessionId,
                `(async () => { window.__paint(${JSON.stringify(job.screen)}, ${KIT_LOOK_ID}, ${job.flags}); ` +
                    'await document.fonts.ready; ' +
                    'await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res))); ' +
                    'const running = document.getAnimations().filter((a) => a.playState === "running"); ' +
                    'const longest = running.reduce((ms, a) => { const d = a.effect?.getComputedTiming().duration; ' +
                    'return Math.max(ms, typeof d === "number" ? d : 0); }, 0); ' +
                    'const scroll = document.querySelector(".stall-scroll"); ' +
                    'return { classes: window.__sheetClasses(), longest, ' +
                    'pageH: Math.max(document.documentElement.scrollHeight, scroll?.scrollHeight ?? 0) }; })()',
            );
        for (const job of plan) {
            const { width, height } = job.viewport;
            if (current !== job.viewport.name) {
                await metrics(width, height);
                current = job.viewport.name;
            }
            if (job.ground !== undefined) {
                const level = job.ground === 'dark' ? 0 : 255;
                await cdp.send(
                    'Emulation.setDefaultBackgroundColorOverride',
                    { color: { r: level, g: level, b: level, a: 1 } },
                    sessionId,
                );
            } else {
                await cdp.send('Emulation.setDefaultBackgroundColorOverride', {}, sessionId);
            }
            let state = await settle(job);
            // The whole page, as the probe's contrast pass shoots it: the
            // viewport grows to hold it and the paint is redone at that size.
            const grownH = Math.min(Math.max(height, state.pageH), 12_000);
            if (grownH !== height) {
                await metrics(width, grownH);
                state = await settle(job);
            }
            if (state.classes.length !== 1 || state.classes[0] !== 't-workshop') {
                throw new Error(
                    `${job.screen} painted ${state.classes.join(', ') || 'no look class'} — ` +
                        'these shots would not be of the workshop look',
                );
            }
            const instants = state.longest > 0 ? [400, Math.max(800, Math.round(state.longest / 2))] : [undefined];
            for (const at of instants) {
                if (at !== undefined) {
                    await evaluate(
                        cdp,
                        sessionId,
                        `(async () => { window.__seek(${at}); await new Promise((res) => ` +
                            'requestAnimationFrame(() => requestAnimationFrame(res))); })()',
                    );
                }
                const shot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true }, sessionId);
                const file = at === undefined ? job.file : job.file.replace(/\.png$/, `--t${at}.png`);
                mkdirSync(dirname(join(SHOTS_OUT, file)), { recursive: true });
                writeFileSync(join(SHOTS_OUT, file), Buffer.from(shot.data, 'base64'));
                written.push({ ...job, file, ...(at === undefined ? {} : { at }) });
            }
            if (grownH !== height) {
                await metrics(width, height);
            }
        }
        await cdp.send('Emulation.setDefaultBackgroundColorOverride', {}, sessionId);
        writeFileSync(join(SHOTS_OUT, 'index.html'), contactSheet(written));
        cdp.close();
        const bytes = written.reduce((sum, shot) => sum + statSync(join(SHOTS_OUT, shot.file)).size, 0);
        console.log(
            `✓ workshop:shots: ${written.length} PNGs, ${(bytes / 1e6).toFixed(1)} MB, in ` +
                `${((Date.now() - startedAt) / 1000).toFixed(1)}s — open ${join(SHOTS_OUT, 'index.html')}`,
        );
    } finally {
        for (const child of [server, browser]) {
            if (child?.pid === undefined) continue;
            try {
                process.kill(-child.pid);
            } catch {
                child.kill();
            }
        }
        if (browser?.pid !== undefined) {
            await new Promise((resolve) => {
                browser.once('exit', resolve);
                setTimeout(resolve, 3000);
            });
        }
        if (profile !== undefined) {
            try {
                rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
            } catch {
                console.error(`workshop:shots: left a temp profile behind at ${profile}`);
            }
        }
    }
}

/* ---------- dispatch ---------- */

const [command, ...args] = process.argv.slice(2);
try {
    if (command === 'start') await start(args);
    else if (command === 'serve') await serve();
    else if (command === 'shots') await shots();
    else if (command === 'probe') await probe();
    else usage(command === undefined ? undefined : `no command "${command}"`);
} catch (err) {
    console.error(`\nworkshop: ${err.message}`);
    process.exitCode = 1;
}
