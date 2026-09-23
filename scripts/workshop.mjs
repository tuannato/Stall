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
 * Every command that builds validates `workshop/look.json` and lints
 * `workshop/theme-workshop.css` first (`requireKit`), printing every fault
 * and building nothing while there is one, so a creator reads the list here
 * rather than meeting a blank page; builds from `vite.workshop.config.ts`
 * into its own outDir under `.workshop-dist/`, then holds that outDir
 * against what the build was given and deletes it if it holds anything else
 * (`workshop-build-check.mjs` — the guard that does not trust the lint);
 * and never writes `vite.config.ts` — it fails if that file changed while it
 * ran, `layout-check.mjs`'s tripwire and its reason.
 *
 * The preview server and Chrome it starts are process groups stopped whole
 * on Ctrl-C and every other way out, never started on a port that already
 * answers (`process-groups.mjs`); `workshop:probe` hands a signal on to
 * `layout-check.mjs`, which does the same for its own.
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
import { CHROMES, devtools, findChrome } from './browser.mjs';
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
import { readArt, requireCleanKitBuild } from './workshop-build-check.mjs';
import { lintSheet, rescopeSheet, sheetHasRules } from './workshop-css.mjs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
process.chdir(ROOT);

const BASES = ['modern', 'neo', 'rural'];
const WORKSHOP_CONFIG = 'vite.workshop.config.ts';
const KIT_LOOK_ID = 0xff;
const SHOTS_OUT = '.workshop-dist/shots-out';
const CDP_PORT = process.env.WORKSHOP_CDP_PORT ?? '9342';

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

/**
 * Stop with every fault the kit's two files have, or return: `look.json`
 * read, then the sheet linted against the art folder beside it — the same
 * read `pnpm workshop:lint` makes. Nothing is built while either says no.
 */
async function requireKit() {
    await requireReadableLook();
    const sheet = join('workshop', 'theme-workshop.css');
    let css;
    try {
        css = readFileSync(sheet, 'utf8');
    } catch (err) {
        console.error(`workshop: cannot read ${sheet}: ${err.message}`);
        process.exit(1);
    }
    const problems = lintSheet(css, { art: readArt(join('workshop', 'art')) });
    if (problems.length > 0) {
        console.error(
            `✗ ${sheet} has ${problems.length} problem${problems.length === 1 ? '' : 's'} ` +
                '(the pnpm workshop:lint read) — nothing is built until it has none:',
        );
        for (const problem of problems) console.error(`    ${problem}`);
        process.exit(1);
    }
}

async function commandSettings(command) {
    const { WORKSHOP_COMMANDS } = await tsModule(`./${WORKSHOP_CONFIG}`);
    return WORKSHOP_COMMANDS[command];
}

/** Build for `command`, then hold the output against what the build was given. */
async function buildFor(command) {
    const r = spawnSync('npx', ['vite', 'build', '--config', WORKSHOP_CONFIG, '--logLevel', 'error'], {
        stdio: 'inherit',
        env: { ...process.env, STALL_WORKSHOP_CMD: command },
    });
    if (r.status !== 0) {
        throw new Error(`the ${command} build failed (vite exited ${r.status})`);
    }
    process.env.STALL_WORKSHOP_CMD = command;
    await requireCleanKitBuild({ configFile: WORKSHOP_CONFIG, artDir: join('workshop', 'art') });
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
    const cssProblems = lintSheet(css, { art: readArt(join(dir, 'art')) });
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
    stopOnSignals('workshop');
    await requireKit();
    const { port } = await commandSettings('serve');
    await buildFor('serve');
    await refuseTakenPort(port, "showroom's preview server");
    const server = spawnGroup('the preview server', 'npx', ['vite', 'preview', '--config', WORKSHOP_CONFIG], {
        env: { ...process.env, STALL_WORKSHOP_CMD: 'serve' },
        stdout: 'inherit',
        stderr: 'inherit',
    });
    const url = `http://localhost:${port}/layout/gallery.html?look=${KIT_LOOK_ID}`;
    await waitUntil('the preview server', async () => (await fetch(url)).ok, { watch: [server] });
    console.log(`\n  Showroom: ${url}\n  (Ctrl-C to stop.)\n`);
    if (server.exit === undefined) {
        await new Promise((resolve) => server.child.once('exit', resolve));
    }
    if (interruptedCode() !== undefined) return;
    // It stopped on its own: say so, and leave nothing of its group behind.
    const why = earlyExit(server) ?? 'the preview server stopped';
    await stopGroups();
    throw new Error(why);
}

/* ---------- probe ---------- */

async function probe() {
    await requireKit();
    const { port } = await commandSettings('probe');
    // Not detached: a Ctrl-C at the terminal reaches `layout-check.mjs`
    // directly, and a signal sent to this process alone is handed on, so the
    // probe's own handler stops its preview and Chrome either way.
    const child = spawn(
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
    let caught;
    for (const [signal, code] of [
        ['SIGINT', 130],
        ['SIGTERM', 143],
        ['SIGHUP', 129],
    ]) {
        process.on(signal, () => {
            caught ??= code;
            child.kill(signal);
        });
    }
    const status = await new Promise((resolve) => {
        child.once('error', () => resolve(1));
        child.once('exit', (code) => resolve(code ?? 1));
    });
    process.exitCode = caught ?? status;
}

/* ---------- shots ---------- */

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
    stopOnSignals('workshop');
    await requireKit();
    const chrome = findChrome();
    if (chrome === undefined) {
        console.error(`workshop:shots: no Chrome found. Install one of: ${CHROMES.join(', ')}`);
        process.exit(1);
    }
    const { port } = await commandSettings('shots');
    const startedAt = Date.now();
    await buildFor('shots');
    let server;
    let browser;
    try {
        await refuseTakenPort(port, 'preview server');
        await refuseTakenPort(CDP_PORT, 'Chrome DevTools endpoint');
        server = spawnGroup('the preview server', 'npx', ['vite', 'preview', '--config', WORKSHOP_CONFIG], {
            env: { ...process.env, STALL_WORKSHOP_CMD: 'shots' },
        });
        const profile = mkdtempSync(join(tmpdir(), 'stall-workshop-'));
        onTeardown(() => {
            try {
                rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
            } catch {
                console.error(`workshop:shots: left a temp profile behind at ${profile}`);
            }
        });
        browser = spawnGroup(
            'Chrome',
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
            { stderr: 'ignore' },
        );
        const watch = [server, browser];
        const wsUrl = await waitUntil(
            'Chrome',
            async () => {
                const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
                return res.ok ? (await res.json()).webSocketDebuggerUrl : undefined;
            },
            { watch },
        );
        const gallery = `http://localhost:${port}/layout/gallery.html`;
        await waitUntil('the preview server', async () => (await fetch(gallery)).ok, { watch });
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
        await waitUntil('the showroom', () => evaluate(cdp, sessionId, 'window.__galleryReady === true'), { watch });
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
    } catch (err) {
        for (const group of [server, browser]) {
            const why = earlyExit(group);
            if (why !== undefined && !err.message.includes(why)) console.error(`workshop:shots: ${why}`);
        }
        throw err;
    } finally {
        // Every process of both groups is gone before the profile is removed.
        await stopGroups();
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
    process.exitCode = interruptedCode() ?? 1;
}
