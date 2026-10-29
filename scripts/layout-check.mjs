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
import { cpus, loadavg, tmpdir, totalmem } from 'node:os';
import { join } from 'node:path';
import { CHROMES, FIXED_CLOCK, decodePng, devtools, findChrome } from './browser.mjs';
import { boxKey, dumpKindOf, dumpValue, jobKey, writeDump } from './contrast-dump.mjs';
import { payScreensMissingQuote } from './pay-screens.mjs';
import { GEOMETRY_PASSES as OWING_GEOMETRY, TRACKED_FIXTURE_CLASS, owedFaults, probeCoverageGaps, probeCoverageLine, wornSheetJobFaults } from './probe-coverage.mjs';
import { FACES_CHECK, declaredStallFaces, facesFaults, facesLine } from './probe-faces.mjs';
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
import { QUIET_ZONE_FLOOR, quietReadingLine, readQuietZones } from './quiet-zone.mjs';
import { MODULE_CHECK, MODULE_DARK_MAX, MODULE_LIGHT_MIN, foldStats, moduleReadingLine, moduleReport, moduleSnapLines, moduleSnapVerdict, readCodeModules, readTurnedUpright, withMatrices } from './code-modules.mjs';
import { charReport, charsFault, foldShares, mergeShares, readCharsAgain, readMoneyChars } from './char-read.mjs';
import { HORIZON_WORST, horizonWorstVerdict } from './horizon-worst.mjs';
import { FIXTURE_LOOKS_DIR, harnessSelection, refuseSelection } from './looks-selection.mjs';
import { harnessLooks } from './harness-looks.mjs';
import { walkPlan } from './plan-walk.mjs';
import {
    ALL_VIEWPORTS,
    CANVAS,
    CONTRAST_PASS,
    GEOMETRY_CANARY,
    MODULE_SNAP_VIEWPORT,
    PASS_KINDS,
    TRANSPARENCY_PASS,
    VIEWPORTS,
    WALL_BLOCKS,
    geometryPlan,
    passesNotRun,
    runnerPasses,
    viewportOffPlan,
} from './probe-passes.mjs';
import { COVER_TALLY_KEYS, carriedTallyFaults, clipCeilingFault, clipLine, coverTally, reachTally, skipsByScreen, skipsByScreenLine } from './look-tallies.mjs';
import { SERVED_SHEETS } from './sheet-roles.mjs';
import { privateRows, servedSheets } from './served-sheets.mjs';
import { sheetMasksWithAFile } from './workshop-css.mjs';
import { sheetNamesAttribute } from './workshop-css.mjs';

/*
 * The private looks this run measures (8e2): the selection the shell names,
 * whole, or none — half a selection stops the run before it builds
 * (`harnessSelection`). With one, the probe's build carries what a build
 * with it carries, every pass measures those looks beside the shipped ones,
 * and every class they paint is expected below; with none, the run is the
 * public one it was before 8e2.
 */
const SELECTION = harnessSelection('test:layout');

// `npx` (and npm under it) asks the npm registry for a newer npm unless told
// not to: the one network call a probe run made, found 2026-10-20. Every
// child this command spawns inherits these.
process.env.npm_config_update_notifier = 'false';
process.env.NO_UPDATE_NOTIFIER = '1';

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
if (LOOKS === 'workshop') {
    // The kit's probe judges a creator's look alone (`measuredLooks`), so a
    // selection would put a look in its build that no pass reads.
    refuseSelection('workshop:probe', "the kit's probe measures the kit's look alone and reads no private look");
}
/*
 * **With no selection the probe measures the tracked fixture** (8e2, the 8e2
 * critic's item 2; STEP-8-PLAN v2: tests run on the tracked fixture always):
 * a run that carried no private look would hold every private-look rule —
 * the record road, a carried look's own tallies, its row, its name — to
 * nothing, and 8f's rules proved on the fixture once would regress unseen in
 * every default run. An explicit selection replaces it; the kit's probe
 * measures the kit's look alone and carries none. Test:
 * `the-default-probe-carries-the-tracked-fixture`.
 */
const MEASURED_SELECTION = LOOKS === 'workshop' ? undefined : (SELECTION ?? { target: 'preview', dir: FIXTURE_LOOKS_DIR });
/*
 * What it carries, read once, with its commit pinned: the build below is
 * handed that commit (`CARRIED.env`), so the looks this run expects are the
 * looks its build carries, one commit's (`harness-looks.mjs`).
 */
const CARRIED = await harnessLooks(MEASURED_SELECTION);
if (MEASURED_SELECTION !== undefined) {
    console.log(
        `  test:layout measures the private looks of ${CARRIED.line}` +
            (SELECTION === undefined ? ' — the tracked fixture, measured by default; a selection replaces it' : ''),
    );
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
 * by id and read as a skeleton that passed. **Derived, never listed** (8e2):
 * the shipped looks are the role table's look rows (`sheet-roles.mjs`, held
 * to the theme table by `every-look-row-loads-its-sheet-the-way-its-role-says`),
 * so a fourth shipped look is expected the day its row lands, and the
 * private looks are what the selection carries (`CARRIED`). `t-skeleton` is
 * the harness's own look (the default row under a class no sheet styles,
 * `layout/looks.ts`), measured beside the shipped three since step 2d. Tests:
 * `the-workshop-probe-measures-the-workshop-look`,
 * `the-skeleton-is-the-default-row-under-a-class-no-sheet-styles`,
 * `the-runner-expects-the-classes-it-derives`.
 */
const SHIPPED_SHEET_CLASSES =
    LOOKS === 'workshop' ? [] : SERVED_SHEETS.filter((sheet) => sheet.role === 'look').map((sheet) => sheet.lookClass);
/** The private looks the selection carries, by class: none without a selection. */
const PRIVATE_SHEET_CLASSES = CARRIED.looks.map((look) => look.cls);
/** The paid ones, whose record road the probe holds to the default (`the-record-road-paints-a-locked-look-as-the-default`). */
const PAID_PRIVATE_CLASSES = CARRIED.looks.filter((look) => look.paid).map((look) => look.cls);
const EXPECTED_SHEET_CLASSES =
    LOOKS === 'workshop' ? ['t-workshop'] : [...SHIPPED_SHEET_CLASSES, ...PRIVATE_SHEET_CLASSES, 't-skeleton'];

/*
 * The faces every probe page owes before it measures
 * (`every-face-is-loaded-before-the-probe-measures`, `probe-faces.mjs`):
 * read from `src/ui/stall.css`'s `@font-face` rules, never listed here. The
 * page echoes each face's status when its measuring began
 * (`layout/faces.ts`), and a page whose echo is not every one of these
 * loaded is refused — on every pass whose verdict this reads, and on every
 * contrast and transparency page before its first job.
 */
const DECLARED_FACES = declaredStallFaces();
if (DECLARED_FACES.length === 0) {
    // A list read as empty would hold every page to nothing.
    console.error('layout-check: src/ui/stall.css declares no @font-face — the faces every page owes cannot be read');
    process.exit(1);
}

/** The face faults of a page's echo, as the probe's own failure records. */
function faceFailures(echo) {
    return facesFaults(echo, DECLARED_FACES).map((detail) => ({
        screen: 'probe page',
        theme: '-',
        check: FACES_CHECK,
        detail,
    }));
}

/** Why the private looks a page's build carries are not the ones the selection names, or undefined (8e2). */
function privateLooksWrong(carried) {
    if (LOOKS === 'workshop') return undefined;
    const got = [...(carried ?? [])].sort();
    const want = [...PRIVATE_SHEET_CLASSES].sort();
    if (got.join(' ') === want.join(' ')) return undefined;
    return (
        `the page's build carries ${got.length === 0 ? 'no private look' : got.join(', ')} where the selection carries ` +
        `${want.length === 0 ? 'none' : want.join(', ')} (${CARRIED.line})`
    );
}

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

/*
 * Every pass this run makes — its viewport, its kind, the screens it
 * measures and the order the geometry walk hands it out — is a value in
 * `probe-passes.mjs`, which the tests read too
 * (`every-pass-the-runner-runs-is-in-a-coverage-table`). Nothing here names
 * a viewport of its own: a pass is an entry there, run here by its kind
 * (`GEOMETRY_KINDS_RUN`), and a kind this run has no runner for stops it
 * before it builds.
 *
 * The coverage tables are held to the module's list (`runnerPasses`), and
 * this run builds from the plan and the two pixel passes, so before it
 * builds it holds that list to what it will run (`passesNotRun`): an entry
 * there this run would not run, or a pass this run runs the list does not
 * name, stops it (`the-runner-runs-every-pass-the-module-lists`; the
 * probe-shard critic's B1, whose planted `lap-wall` and `contrast-tablet`
 * passes were certified by the tables and measured by nothing).
 */
const GEOMETRY_PLAN = geometryPlan({ looks: LOOKS });
const GEOMETRY_KINDS_RUN = new Set(['page', 'wall', 'narrow', 'short', 'reduced', 'worn-only']);
{
    const faults = [];
    for (const kind of Object.keys(PASS_KINDS)) {
        if (!GEOMETRY_KINDS_RUN.has(kind) && kind !== CONTRAST_PASS.kind && kind !== TRANSPARENCY_PASS.kind) {
            faults.push(`the pass kind ${kind} has no runner here`);
        }
    }
    for (const pass of GEOMETRY_PLAN) {
        if (!GEOMETRY_KINDS_RUN.has(pass.kind)) faults.push(`the geometry pass ${pass.key} is of kind ${pass.kind}, which no runner here runs`);
        if (pass.kind === 'wall' && !Object.hasOwn(WALL_BLOCKS, pass.block)) {
            faults.push(`the wall pass ${pass.key} names the block ${pass.block}, which is not one of ${Object.keys(WALL_BLOCKS).join(', ')}`);
        }
    }
    for (const key of GEOMETRY_CANARY.flat()) {
        if (!GEOMETRY_PLAN.some((pass) => pass.key === key)) faults.push(`the geometry canary reads ${key} again, and the plan has no such pass`);
    }
    faults.push(
        ...passesNotRun(runnerPasses({ looks: LOOKS }), {
            geometry: GEOMETRY_PLAN,
            contrast: CONTRAST_PASS,
            transparency: TRANSPARENCY_PASS,
            kindsRun: GEOMETRY_KINDS_RUN,
        }),
    );
    if (faults.length > 0) {
        console.error(`layout-check: probe-passes.mjs plans a pass this run cannot make —\n${faults.map((f) => `  ${f}`).join('\n')}`);
        process.exit(1);
    }
}

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
    // Bounded like everything else this run waits on: a build blocks the
    // event loop, so the watchdog below cannot fire during one.
    const r = spawnSync(cmd, args, { stdio: 'inherit', timeout: RUNTIME_CEILING_S * 1000, ...opts });
    if (r.status !== 0) {
        throw new Error(
            `${cmd} ${args.join(' ')} ${r.signal === null ? `exited ${r.status}` : `was stopped by ${r.signal}`}`,
        );
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
 * How long one ask for the verdict may wait (`readVerdict`). The page
 * measures a pass in one synchronous task, and the ask queues behind it, so
 * it answers when the pass is done: 10.9–12.6s for the phone and desk passes
 * on one tab at load 2, 23.6–26.5s on two tabs at load 14, and 38.1s for the
 * phone pass on one tab under a 2× CPU throttle (2026-10-19). Under the run's
 * 30s command bound (`CDP_TIMEOUT_MS`) such a pass failed as a page that hung
 * (a phone pass read again at 30.3s, `PROBE-RULES.md`, "The geometry passes
 * walk on two tabs"). Still a bound, and the watchdog holds the run.
 */
const VERDICT_TIMEOUT_MS = 120_000;
/**
 * Navigate and wait for the probe's own verdict rather than for `load`: the
 * page writes `#layout-result` while its module evaluates, and an icon request
 * that never answers must not be able to hang the run.
 *
 * `pass` is the plan entry the verdict is read for, the object the plan holds
 * (`GEOMETRY_PLAN`): one that is not refuses the read before it navigates,
 * and a page whose size is not that entry's viewport fails the pass
 * (`every-viewport-the-runner-measures-is-a-module-pass`, `viewportOffPlan`;
 * the probe-shard critic's N1). This is the run-time half of "the runner
 * names no viewport of its own": the text check
 * (`runnerViewportLiterals`, `probe-coverage.test.mjs`) reads the shapes it
 * was written for, and a size built from constants or a spread went past it.
 * What it does not see: a pass that never asks this function for a verdict.
 */
async function readVerdict(cdp, sessionId, pass, url) {
    const notInPlan = viewportOffPlan(pass, GEOMETRY_PLAN, pass?.vp === undefined ? undefined : [pass.vp.width, pass.vp.height]);
    if (notInPlan !== undefined) throw new Error(`${notInPlan} (every-viewport-the-runner-measures-is-a-module-pass)`);
    currentStep = `the probe page's verdict at ${url.replace(/^http:\/\/localhost:\d+\//, '')}`;
    await cdp.send('Page.navigate', { url }, sessionId);
    for (let i = 0; i < 150; i += 1) {
        const r = await cdp.send(
            'Runtime.evaluate',
            {
                expression: "document.getElementById('layout-result')?.textContent ?? null",
                returnByValue: true,
            },
            sessionId,
            { timeoutMs: VERDICT_TIMEOUT_MS },
        );
        if (typeof r.result.value === 'string') {
            const report = JSON.parse(r.result.value);
            report.failures.push(...(await lateRefusals(cdp, sessionId, report)));
            // Measured in the faces it owes, or the pass is refused — every
            // pass that reads a verdict, the reduced-motion ones included.
            report.failures.push(...faceFailures(report.faces));
            // And measured as a visitor's page paints, on whichever tab it
            // ran (the geometry passes walk on the contrast pass's tabs): a
            // hidden page runs no animation frame, an unfocused one is not
            // the page the first tab measures. A belt no real run has
            // tripped; its red proof is a tab whose `document.hasFocus` is
            // made to answer false (the probe-shard critic's P1d), which
            // fails every pass that tab runs.
            report.failures.push(...(await unshownFailures(cdp, sessionId)));
            // And at the size the plan entry names, as the page measured it.
            const offPlan = viewportOffPlan(pass, GEOMETRY_PLAN, await evalJson(cdp, sessionId, '[innerWidth, innerHeight]'));
            if (offPlan !== undefined) {
                report.failures.push({
                    screen: 'probe page',
                    theme: '-',
                    check: 'every-viewport-the-runner-measures-is-a-module-pass',
                    detail: offPlan,
                });
            }
            return report;
        }
        await sleep(100);
    }
    throw new Error('the probe never reported. It threw, or never ran.');
}

/** A page that is not visible and focused, as the probe's own failure record. */
async function unshownFailures(cdp, sessionId) {
    const shown = await evalJson(cdp, sessionId, '[document.visibilityState, document.hasFocus()]');
    if (shown[0] === 'visible' && shown[1] === true) return [];
    return [
        {
            screen: 'probe page',
            theme: '-',
            check: 'the page paints as a visitor\'s does',
            detail: `the page is ${shown[0]}${shown[1] ? '' : ' and unfocused'} — it would not measure what the first tab measures`,
        },
    ];
}

/*
 * The policy's refusals the page met after writing its verdict — a picture's
 * request is refused as it is made, and the event lands as a task — as
 * failures of `the-probe-page-meets-no-csp-refusal`, on every pass whose
 * verdict this runner reads (the phone, desk and canvas passes, the portrait
 * and tablet walls, the reduced-motion passes; the step-6 critic's P3).
 */
async function lateRefusals(cdp, sessionId, report) {
    await sleep(50);
    const r = await cdp.send(
        'Runtime.evaluate',
        { expression: 'JSON.stringify(window.__cspRefusals?.() ?? [])', returnByValue: true },
        sessionId,
    );
    const all = typeof r.result?.value === 'string' ? JSON.parse(r.result.value) : [];
    return refusalFailures(all.slice((report.cspRefusals ?? []).length), ' (after the verdict)');
}

/** Refusals as the probe's own failure records. */
function refusalFailures(refusals, when = '') {
    return refusals.map((r) => ({
        screen: 'probe page',
        theme: '-',
        check: 'the-probe-page-meets-no-csp-refusal',
        detail: `${r.directive} refused ${r.blocked || '(inline)'}${r.source === '' ? '' : ` at ${r.source}`}${when}`,
    }));
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
/** A count per tab (`{ 0: 2, 2: 1 }`) said as `tab 0 2, tab 2 1`, or `none`. */
const byTabSaid = (byTab) =>
    Object.entries(byTab)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([tab, n]) => `tab ${tab} ${n}`)
        .join(', ') || 'none';
/**
 * How far a channel may move inside a protected box between the frame with
 * the look's pseudos and the frame without them before it counts as their
 * paint (D6(i)): two levels, the capture's own noise across two frames of
 * one still page (measured: none on the day it landed).
 */
const LOOK_PSEUDO_LEVELS = 2;
/**
 * The line targets that yield no line rect on screen, per viewport, as
 * measured when step 5b landed (the critic, 2026-09-27): a line target
 * whose every fragment is clipped away, or that is not rendered at this
 * width, is counted and never failed — it is not on screen — so a change
 * that clipped a whole line out of view would read green. These are
 * ceilings, exact today: a pass that finds more fails and names the count;
 * one that finds fewer says so, and the number here should come down with
 * the change that lowered it. **Over the public run's jobs** — the shipped
 * looks and the skeleton, what was measured: a private look a selection
 * carries (8e2) has its own count, printed and pinned by nobody yet.
 */
const LINE_SKIP_CEILING = {
    mobile: { 'clipped-away': 63, 'not-rendered': 35 },
    desktop: { 'clipped-away': 23, 'not-rendered': 28 },
    canvas: { 'clipped-away': 726, 'not-rendered': 0 },
};
/**
 * `LAYOUT_LEGACY=1` reads every line-read target the pre-5b way too, on the
 * same capture, and writes the old value and — for a fall — its bucket into
 * the dump (`legacy`, `at`, `bucket`): the measurement step 5b's commit body
 * carries, and the way to ask it again.
 */
const LEGACY = process.env.LAYOUT_LEGACY === '1';
/*
 * The contrast jobs that must have had the rain at its brightest drop
 * (`a-line-on-the-ground-reads-wherever-a-drop-falls`), and the jobs that
 * must read Grid horizon at its worst (step 5a″), are the page's to say:
 * `window.__contrastOwed()` (`contrastOwed` in `layout/contrastPlan.ts`)
 * names them by key for every measured look whose rows carry the rain or
 * the horizon — Neo's on the ordinary probe, the kit's when it starts from
 * Neo — and the shipped keys are pinned by value in
 * `the-contrast-plan-is-every-job-the-pass-owes`. Until 2026-10-06 they were
 * a list here keyed to Neo's id and asked of the shipped run alone, so the
 * kit's Neo starter owed nothing.
 */

// Grid horizon at its worst: the owner's numbers and their verdict (`horizon-worst.mjs`).
/*
 * **Read on the three jobs the owner's numbers were read on, and no other**
 * (D-2026-10-20-13, the owner's D2(a)): a shipped run reads the sign at the
 * horizon's worst on `HORIZON_WORST`'s three jobs alone, where it read
 * every job that wore the horizon (94 on the default plan) to hold that no
 * other job read lower. What is lost, stated: that guard against a
 * regression on the other jobs — a change that lowers the name, the tagline
 * or the state line at the horizon's worst on a job that is not one of the
 * three passes the run. The ring read over the horizon as painted, on every
 * job that wears it, is the failing guard and is unchanged. A kit run pins
 * nothing and still reads every job the page owes (`__contrastOwed`).
 */
const HORIZON_PINNED_JOBS = new Set(Object.values(HORIZON_WORST).map((at) => at.job));
const readsHorizonWorst = (key) => LOOKS !== 'shipped' || HORIZON_PINNED_JOBS.has(key);

/*
 * **The ring read** (round 8, 2026-09-25). A line that wears the outline
 * (`outlineOf` in the probe: `text-shadow` in one opaque colour — the ground
 * it stands on, round 10 — at zero blur, one or two pixels wide) is not read
 * over its box — the rain
 * between its strokes is in the box, and what a reader needs is the ground
 * right against every stroke. So the job is captured once more with the
 * outlined glyphs shown (`__contrastGlyphs`, the job's one shown frame,
 * which the broken-figure read shares), and for each line of each outlined
 * target:
 *
 * - the **glyph mask** is every pixel inside the line's rect (its text
 *   node's characters on one line box, clipped like the box) where the
 *   glyphs-shown capture moved at least halfway from the glyphs-blanked one
 *   toward the line's ink (`RING_MASK_ALPHA`) — the letter's own painted
 *   edge. A fainter antialiased pixel is the letter's fringe, which is read
 *   as ring. Drawn icons are not text: their boxes are left out of both.
 * - the **ring** is every pixel the outline's own offsets reach from the
 *   mask and the mask does not hold — exactly where the outline paints a
 *   copy of a glyph pixel at least half covered — inside the target's ring
 *   box (its box, the outline's width wider, inside its clip) — **and only
 *   its solid part**: the one-pixel offsets of the two-pixel set, the whole
 *   of the one-pixel set. The two-pixel offsets reach the outline's own
 *   antialiased rim, a pixel the outline covers exactly as much as the
 *   glyph pixel it copies — half, at the mask's edge — so a verdict there
 *   would rest on where the mask's threshold sits, not on the paint (round
 *   8, the window's decision: 2.97:1 on Neo's muted at the rim, 5.88:1 or
 *   better one pixel in). The rim is read and reported per kind, never
 *   judged (the summary's `rim` figure).
 * - the **worst ring pixel of the blanked capture** against the line's ink
 *   must clear the 3:1 floor: every one, no percentile. That is the proof
 *   the outline is present and a solid dark border at least one device
 *   pixel wide around every glyph, with the rain at its brightest behind it.
 * - a line whose mask holds fewer than `RING_MASK_PER_CHAR` pixels for each
 *   letter or digit it shows, or none at all, fails too: a ring around
 *   nothing proves nothing ("no ring to read"). Punctuation is held to one
 *   pixel, because a lone middle dot is two.
 * - and a line whose glyphs are there but whose ring holds no pixel at all
 *   fails as well ("no ring around its glyphs"): the ring is counted per
 *   line, because a pixel outside the target's ring box is dropped, and a
 *   line whose whole ring fell outside it was carried by its neighbours'
 *   (the critic's eighth pass, item 7).
 *
 * Every other target keeps the box read. A failing ring is read again on a
 * fresh pair of captures before it is believed, like a failing box.
 */
const RING_MASK_ALPHA = 0.5;
/**
 * Every contrast target an outlined line was found in, by the geometry
 * passes (`outlinedTargets` in the probe's verdict): each must be read in
 * the ring on some contrast job, or the outline is one nobody reads.
 */
const outlinedTargetsSeen = new Set();
/** Every look class whose geometry passes showed a mark (`marksShownByClass`): each owes a mark-hide frame (8f2). */
const marksShownSeen = new Set();
/** The look classes each page pass found a sticky sign on (`stickyByClass`): the short pass's looks (`SHORT_VIEWPORTS`). */
const stickySeen = { mobile: [], desktop: [] };
/**
 * The carried looks whose own sheet names a file in a mask or clip property
 * (8f2, the 8f2 critic's P3-8), read from the sheet as the build reads it:
 * each owes the art-off read a pending frame, so a computed miss in the
 * probe's `markFileArt` fails the run rather than reading as no art. The
 * reader is the look rules' own (`sheetMasksWithAFile`,
 * `scripts/workshop-css.mjs`): every file target a mask names — a `url()`,
 * an `image-set()` entry — in any rule, media block or keyframe (step 8g-pre,
 * the critic's P2-1: the regex this replaced read `url(` alone;
 * `the-owed-art-off-frame-reads-every-file-a-mask-names`).
 */
const CARRIED_FILE_ART =
    MEASURED_SELECTION === undefined
        ? []
        : privateRows(await servedSheets({ env: CARRIED.env }))
              .filter((row) => sheetMasksWithAFile(row.css))
              .map((row) => row.lookClass);
/**
 * The measured looks whose own sheet names `[data-copied]` (the lint-belts
 * critic's fifth review, ranked item 4), read from the sheets as served and
 * with the look lint's reader (`sheetNamesAttribute`): the contrast plan
 * samples the staged address screens for exactly these (`COPIED_JOBS`,
 * `layout/contrastPlan.ts`), and the page derives the same list from the
 * stylesheets it loaded (`layout/sheetNaming.ts`). The contrast pass holds
 * the page's list and the plan's to this one. No public look names it, so a
 * public run's plan is unchanged; any carried look whose sheet names it gets the jobs.
 */
const NAMES_COPIED = (await servedSheets({ env: CARRIED.env }))
    .filter((row) => ['look', 'kit', 'private'].includes(row.role) && EXPECTED_SHEET_CLASSES.includes(row.lookClass) && sheetNamesAttribute(row.css, 'data-copied'))
    .map((row) => row.lookClass)
    .sort();
/**
 * Every decoration class a geometry pass painted worn (the probe's
 * `wornClasses`): the contrast pass's owed jobs must follow it
 * (`owed-follows-what-a-pass-wore`, `owedFaults`).
 */
const wornClassesSeen = new Set();
/**
 * 1a's tallies per look on every pass that read it (`coverByClass` in the
 * page's verdict; the contrast pass's own under `contrast`), by pass: each
 * carried private look is held to the clip ceiling on its own points
 * (`look-tallies.mjs`, 8e2) where the public looks keep the ratio over
 * theirs on each pass (`coverClip`). A pass that read 1a on no look (the
 * short passes) is not here.
 */
const coverSeen = {};
/**
 * Every code a geometry pass painted, as `pass/screen:name` (the probe's
 * `codesPainted`): the contrast pass lists which of them it read the quiet
 * zone of and which it did not (D4, `a-code-keeps-its-quiet-zone-white`).
 */
const codesPaintedSeen = new Set();
/**
 * The codes the quiet-zone read and 1d owe by name: every code that pays —
 * the pay sheet's and "Pay several"'s at a phone and a desk, the wall's
 * payment plate — and one of each other kind: a record sheet's, the share
 * code, the overlay's and the wall's shop code. Owed on the public looks'
 * jobs together, on each carried look's own (`look-tallies.mjs`), and on the
 * kit's look on its probe (the owner's D-2026-10-29-01).
 */
const CODES_REQUIRED = [
    'mobile/pay:pay-qr',
    'desktop/pay:pay-qr',
    'mobile/pay-several:pay-qr',
    'desktop/pay-several:pay-qr',
    'canvas/shop-window-touch-quotes-pay:window-paying',
    'desktop/publish-name:publish-qr',
    'desktop/describe:describe-qr',
    'mobile/studio:copy-link',
    'desktop/studio:copy-link',
    'canvas/broadcast:broadcast',
    'canvas/shop-window-wall:shop-window',
];

/**
 * The screens the contrast pass reads broken figures on, every job of each,
 * and the figures each job owes by role (round 3, the critic's P2-1; every
 * surface that breaks a figure since round 4, the critic's P2-2;
 * `a-broken-figure-paints-every-digit`): the quote row's eight-byte XEC
 * quote, the listing face's asked amount, the pay sheet's XEC the wallet
 * signs over the eight-byte quote (`pay-longest-figure`), Pay several's
 * (`pay-several-longest-figure`: its figure, lines and total),
 * the selection strip's total, and the wall's Cycle card where it wraps
 * (`shop-window-cycle-longest-figure`, 2026-10-13: the eight-byte listing at
 * 1280x900) — broken after their commas at the phone and the desk, every
 * look bare and worn. The wall's Browse rows are not on it: the canvas pass
 * samples no long-figure wall row (`shop-window-browse`'s ink), stated in
 * PROBE-RULES.
 */
const BROKEN_FIGURE_SCREENS = {
    'quote-row-longest-figure': ['seller-price'],
    'item-listing-long-figure': ['price'],
    'pay-longest-figure': ['price'],
    'pay-several-longest-figure': ['price', 'pay-lines', 'pay-total'],
    'pay-several-strip-long-figure': ['selection-total'],
    // The wall's Cycle card where it wraps (2026-10-13): the eight-byte
    // listing at 1280x900, two lines on Modern and the skeleton, three on Neo and Rural.
    'shop-window-cycle-longest-figure': ['price'],
};

/**
 * Glyph pixels a line's mask must hold per letter or digit. The least any
 * outlined target read in round 8 was 13.7 a character (the pass prints
 * it: "at least N glyph pixels a character"); 10 sits under that with room
 * for a thinner face at the 11px floor, and refuses a ring around a sliver
 * that 3 let through (the critic's eighth pass, item 7).
 */
const RING_MASK_PER_CHAR = 10;

/** A computed colour as rgb and alpha: `rgb()`, `rgba()` or `color(srgb …)`. */
function rgbaOf(value) {
    const m = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (m !== null) return [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? 1 : Number(m[4])];
    const f = value.match(/color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)/);
    if (f !== null) return [...[f[1], f[2], f[3]].map((v) => Math.round(Number(v) * 255)), f[4] === undefined ? 1 : Number(f[4])];
    throw new Error(`unreadable computed colour "${value}"`);
}

/**
 * One outlined target read in the ring around its glyphs: the worst ring
 * pixel's contrast against its line's ink, how many ring pixels were read,
 * the lines that showed too few glyph pixels for their characters, and the
 * lines whose glyphs showed and whose ring held no pixel.
 */
function ringRead(blank, shown, target) {
    const W = blank.width;
    const H = blank.height;
    const bpp = blank.bpp;
    const icons = target.icons ?? [];
    const inIcon = (x, y) => icons.some((o) => x >= o.x && x < o.x + o.w && y >= o.y && y < o.y + o.h);
    const rb = target.ringBox;
    const rx0 = Math.max(0, Math.ceil(rb.x));
    const ry0 = Math.max(0, Math.ceil(rb.y));
    const rx1 = Math.min(W - 1, Math.floor(rb.x + rb.w) - 1);
    const ry1 = Math.min(H - 1, Math.floor(rb.y + rb.h) - 1);
    let worst = Infinity;
    // Reported, never judged: the worst pixel of the two-pixel outline's own
    // antialiased rim, per kind in the pass's summary.
    let worstRim = Infinity;
    let ringPx = 0;
    let rimPx = 0;
    let maskPx = 0;
    let chars = 0;
    const thin = [];
    const bare = [];
    let why;
    for (const line of target.lines ?? []) {
        const [ir, ig, ib, ia] = rgbaOf(line.ink);
        if (ia === 0) continue;
        const inkLum = luminance(ir, ig, ib);
        const x0 = Math.max(0, Math.floor(line.x));
        const y0 = Math.max(0, Math.floor(line.y));
        const x1 = Math.min(W - 1, Math.ceil(line.x + line.w) - 1);
        const y1 = Math.min(H - 1, Math.ceil(line.y + line.h) - 1);
        chars += line.chars;
        if (x1 < x0 || y1 < y0) {
            thin.push({ ...line, mask: 0 });
            continue;
        }
        const mw = x1 - x0 + 1;
        const mask = new Uint8Array(mw * (y1 - y0 + 1));
        const held = [];
        for (let y = y0; y <= y1; y += 1) {
            for (let x = x0; x <= x1; x += 1) {
                if (inIcon(x, y)) continue;
                const i = (y * W + x) * bpp;
                const dr = ir - blank.data[i];
                const dg = ig - blank.data[i + 1];
                const db = ib - blank.data[i + 2];
                const den = dr * dr + dg * dg + db * db;
                if (den < 1) continue;
                const a =
                    ((shown.data[i] - blank.data[i]) * dr +
                        (shown.data[i + 1] - blank.data[i + 1]) * dg +
                        (shown.data[i + 2] - blank.data[i + 2]) * db) /
                    den;
                if (a >= RING_MASK_ALPHA) {
                    mask[(y - y0) * mw + (x - x0)] = 1;
                    held.push(x, y);
                }
            }
        }
        maskPx += held.length / 2;
        if (held.length === 0 || held.length / 2 < RING_MASK_PER_CHAR * line.chars) {
            thin.push({ ...line, mask: held.length / 2 });
        }
        const inMask = (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1 && mask[(y - y0) * mw + (x - x0)] === 1;
        const seen = new Set();
        // The solid offsets first, so a pixel a solid offset and a rim offset
        // both reach is read as solid: the outline covers it whole.
        const solid = ([dx, dy]) => target.ring === 1 || Math.max(Math.abs(dx), Math.abs(dy)) < target.ring;
        const offsets = [...target.offsets.filter(solid), ...target.offsets.filter((o) => !solid(o))];
        // This line's own solid ring, counted whether or not a line before
        // it reached the same pixel: a line with none is refused below.
        const lineRing = new Set();
        for (const [dx, dy] of offsets) {
            const inRim = !solid([dx, dy]);
            for (let k = 0; k < held.length; k += 2) {
                const x = held[k] + dx;
                const y = held[k + 1] + dy;
                if (x < rx0 || x > rx1 || y < ry0 || y > ry1 || inMask(x, y) || inIcon(x, y)) continue;
                const key = y * W + x;
                if (!inRim) lineRing.add(key);
                if (seen.has(key)) continue;
                seen.add(key);
                const i = key * bpp;
                const c = contrast(inkLum, luminance(blank.data[i], blank.data[i + 1], blank.data[i + 2]));
                if (inRim) {
                    rimPx += 1;
                    worstRim = Math.min(worstRim, c);
                    continue;
                }
                ringPx += 1;
                if (c < worst) {
                    worst = c;
                    why = `worst ${c.toFixed(2)} at ${x},${y} ground rgb(${blank.data[i]},${blank.data[i + 1]},${blank.data[i + 2]}) ink ${line.ink}`;
                }
            }
        }
        if (held.length > 0 && lineRing.size === 0) {
            bare.push({ ...line, mask: held.length / 2 });
        }
    }
    return { worst, worstRim, ringPx, rimPx, maskPx, chars, thin, bare, why };
}

/**
 * The worst contrast between a text colour and any sampled background pixel
 * inside its box. The page turned the glyphs transparent before the shot, so
 * every pixel in the box is background — gradients, scanlines and decorations
 * included, which is the whole point: `legibleOn` proves the flat palette
 * roles, and nothing else proves what is actually painted behind a figure.
 */
function worstContrastInBox(img, target, textColor, { legacy = false } = {}) {
    /*
     * A money figure broken over lines (`.fig-say`) is read whole, line box
     * by line box (round 4): the union of an inline figure's lines is a
     * rectangle that holds what stands beside its first and last lines —
     * the face's "from", unblanked — and the listing face's eight-byte asked
     * amount read 1.18–2.46:1 against glyphs that were not its ground. Every
     * line box is read whole, as one box would be; the worst of them is the
     * figure's.
     */
    if (!legacy && target.lineBoxes !== undefined) {
        let worst;
        for (const lb of target.lineBoxes) {
            const w = worstContrastInBox(img, { ...target, ...lb, r: 0, lineBoxes: undefined }, textColor);
            if (w !== undefined && (worst === undefined || w < worst)) worst = w;
        }
        return worst;
    }
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
    // The pad for a box inside a turned frame was a fixed 8px until step 5b
    // (`legacyPad`, kept for the legacy read the bucketing compares
    // against); a turned money box is now read at the lattice points inside
    // its own turned box (`frame`, below), and dropped a Rural price figure
    // at 17px tall no more.
    const bw = (target.bw ?? 0) + (target.bw ? 1 : 0) + (legacy ? (target.legacyPad ?? 0) : (target.pad ?? 0));
    const frame = legacy ? undefined : target.frame;
    const cos = Math.cos(target.angle ?? 0);
    const sin = Math.sin(target.angle ?? 0);
    const inset = (target.bw ?? 0) + (target.bw ? 1 : 0) + 1;
    const inFrame = (x, y) => {
        if (frame === undefined) return true;
        const dx = x + 0.5 - frame.cx;
        const dy = y + 0.5 - frame.cy;
        return Math.abs(dx * cos + dy * sin) <= frame.w / 2 - r - inset && Math.abs(-dx * sin + dy * cos) <= frame.h / 2 - inset;
    };
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
    for (let y = y0; y <= y1; y += stepY) {
        for (let x = x0; x <= x1; x += stepX) {
            if (!inFrame(x, y)) {
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
    // A turned frame whose every lattice point fell outside it read nothing.
    return worst === Infinity && frame !== undefined ? undefined : worst;
}

/**
 * The band `worstContrastInBox` walks for a target read the way it was read
 * before step 5b — the box less its radius, its border and its fixed
 * transform pad — for the bucketing to ask whether a line read's worst
 * pixel was one the old read could have seen.
 */
function legacyBand(img, target) {
    const r = target.r ?? 0;
    const bw = (target.bw ?? 0) + (target.bw ? 1 : 0) + (target.legacyPad ?? 0);
    return {
        x0: Math.max(0, Math.floor(target.x + r + bw) + 1),
        y0: Math.max(0, Math.floor(target.y + bw) + 1),
        x1: Math.min(img.width - 1, Math.floor(target.x + target.w - r - bw) - 1),
        y1: Math.min(img.height - 1, Math.floor(target.y + target.h - bw) - 1),
    };
}

/**
 * **A broken figure paints every digit** (round 3, the critic's P2-1; a
 * contrast read since round 4, the critic's P2-2): a money figure broken
 * after its commas (`.fig-say`, its pieces `aria-hidden` under one
 * `role="img"` name) is a figure a screen reader hears whole whatever the
 * pieces paint, so a look that hid a piece, or made one transparent or
 * faint, would show no digit while the money box's own read — the node's
 * computed ink against the blanked ground — stayed green. Read on a capture
 * with the broken figures' glyphs shown (`__contrastGlyphs`, the job's one
 * shown frame, which the ring read shares) against the blanked capture (the
 * job's own), which is the painted ground: for every line of every
 * piece, the glyph pixels (those that moved at least halfway from the
 * ground toward the FIGURE's own ink, never the piece's), each read for its
 * contrast against its own ground pixel the way the line read reads a
 * ground against an ink. A line holds at least `RING_MASK_PER_CHAR` glyph
 * pixels a letter or digit (round 3's presence), and its reading — the
 * contrast its strongest glyph pixel per letter or digit reaches (the
 * line's `chars`-th strongest) — clears `PIXEL_CONTRAST_FLOOR`, the floor
 * every money figure is held to: a piece painted faint enough to read under
 * it fails though its pixels moved toward the ink. And every letter and
 * digit of the figure stands on some line. Returns the lines that fail,
 * their reading and how many characters the lines held.
 */
function digitRead(blank, shown, target) {
    const W = blank.width;
    const H = blank.height;
    const bpp = blank.bpp;
    const thin = [];
    let found = 0;
    let maskPx = 0;
    let least = Infinity;
    for (const line of target.digits ?? []) {
        const [ir, ig, ib] = rgbaOf(line.ink);
        const x0 = Math.max(0, Math.floor(line.x));
        const y0 = Math.max(0, Math.floor(line.y));
        const x1 = Math.min(W - 1, Math.ceil(line.x + line.w) - 1);
        const y1 = Math.min(H - 1, Math.ceil(line.y + line.h) - 1);
        found += line.chars;
        const glyph = [];
        for (let y = y0; y <= y1; y += 1) {
            for (let x = x0; x <= x1; x += 1) {
                const i = (y * W + x) * bpp;
                const dr = ir - blank.data[i];
                const dg = ig - blank.data[i + 1];
                const db = ib - blank.data[i + 2];
                const den = dr * dr + dg * dg + db * db;
                if (den < 1) continue;
                const a =
                    ((shown.data[i] - blank.data[i]) * dr +
                        (shown.data[i + 1] - blank.data[i + 1]) * dg +
                        (shown.data[i + 2] - blank.data[i + 2]) * db) /
                    den;
                if (a < RING_MASK_ALPHA) continue;
                glyph.push(
                    contrast(
                        luminance(shown.data[i], shown.data[i + 1], shown.data[i + 2]),
                        luminance(blank.data[i], blank.data[i + 1], blank.data[i + 2]),
                    ),
                );
            }
        }
        maskPx += glyph.length;
        if (line.chars === 0) continue;
        glyph.sort((p, q) => q - p);
        const reading = glyph.length >= line.chars ? glyph[line.chars - 1] : 0;
        if (reading < least) least = reading;
        if (glyph.length < RING_MASK_PER_CHAR * line.chars || reading < PIXEL_CONTRAST_FLOOR) {
            thin.push({ ...line, mask: glyph.length, reading, best: glyph[0] ?? 0 });
        }
    }
    return { thin, found, maskPx, least };
}

/**
 * **The line read** (D7, step 5b; `PROBE-RULES.md`, "The sampler reads
 * text"). Every target outside the money set that wears no outline is read
 * over its own text's line rects (`lineRectsOf` in the probe), never over
 * its box: every pixel wholly inside a rect — no lattice, no radius or
 * border inset, since a line rect holds no border and no arc — and, where
 * the line's frame is turned, only the pixels inside the turned line box.
 * Each rect is read against its own ink, so a muted name inside an ink
 * control is read against the muted ink. Returns the worst contrast, the pixels read,
 * and where the worst one was.
 */
function lineRead(img, target) {
    let worst = Infinity;
    let px = 0;
    let at;
    for (const rect of target.rects) {
        const [ir, ig, ib] = rgbaOf(rect.ink);
        const inkLum = luminance(ir, ig, ib);
        const x0 = Math.max(0, Math.ceil(rect.x));
        const y0 = Math.max(0, Math.ceil(rect.y));
        const x1 = Math.min(img.width - 1, Math.floor(rect.x + rect.w) - 1);
        const y1 = Math.min(img.height - 1, Math.floor(rect.y + rect.h) - 1);
        const turned = Math.abs(rect.angle) > 1e-9;
        const cos = Math.cos(rect.angle);
        const sin = Math.sin(rect.angle);
        for (let y = y0; y <= y1; y += 1) {
            for (let x = x0; x <= x1; x += 1) {
                if (turned) {
                    const dx = x + 0.5 - rect.cx;
                    const dy = y + 0.5 - rect.cy;
                    if (Math.abs(dx * cos + dy * sin) > rect.rw / 2 - 0.5 || Math.abs(-dx * sin + dy * cos) > rect.rh / 2 - 0.5) continue;
                }
                const i = (y * img.width + x) * img.bpp;
                px += 1;
                const c = contrast(inkLum, luminance(img.data[i], img.data[i + 1], img.data[i + 2]));
                if (c < worst) {
                    worst = c;
                    at = { x, y, ink: rect.ink, glyph: rect.glyph === true, ground: [img.data[i], img.data[i + 1], img.data[i + 2]] };
                }
            }
        }
    }
    return { worst, px, at };
}

/**
 * Where a line read's worst pixel was, against the read before step 5b on
 * the same capture (`LAYOUT_LEGACY=1`): only asked of a fall. `ink` when the
 * worst pixel's line wears another ink than the target's own (a nested
 * element's colour, which the box read never compared); `lattice` when it
 * lies inside the old band, where only the old lattice's spacing missed it;
 * `spill` when it lies past the box's side, `content-area` past its top or
 * bottom (a font's content area is taller than a tight line box); `inset`
 * inside the box and outside the band — the radius, the border, the old
 * 8px transform pad. A line cut by a clip only ever shrinks the read, so a
 * clip causes no fall.
 */
function bucketOf(img, target, at) {
    if (at === undefined) return 'dropped';
    if (at.ink !== target.color) return 'ink';
    const band = legacyBand(img, target);
    if (at.x >= band.x0 && at.x <= band.x1 && at.y >= band.y0 && at.y <= band.y1) return 'lattice';
    if (at.x < target.x || at.x >= target.x + target.w) return 'spill';
    if (at.y < target.y || at.y >= target.y + target.h) return 'content-area';
    return 'inset';
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

/**
 * One painted combination, with the glyphs blanked and the frame settled.
 * `neutral` paints the neutral screen first (a job's first paint; its
 * re-prepare at the grown size repaints the same screen, as a live update
 * would), so no job is measured after whichever job ran before it.
 */
async function contrastPrepare(cdp, sessionId, screen, theme, flags, neutral, nonce, heightOnly = false, tide = undefined) {
    const args = `${JSON.stringify(screen)}, ${theme}, ${flags}, ${neutral}, ${JSON.stringify(nonce)}`;
    const tideArg = tide === undefined ? 'undefined' : String(tide);
    if (heightOnly) {
        // The paint and its height, and nothing to wait for: no box is
        // collected and no glyph blanked on a paint the grow throws away.
        return evalJson(cdp, sessionId, `window.__contrastPrepare(${args}, true, ${tideArg})`);
    }
    const r = await cdp.send(
        'Runtime.evaluate',
        {
            expression:
                `(async () => { ` +
                `const out = window.__contrastPrepare(${args}, false, ${tideArg}); ` +
                // The self-hosted face swaps metrics when it lands and the
                // fit-content dock re-centres with it — boxes taken before the
                // swap sample a neighbour's ground.
                `await document.fonts.ready; ` +
                // The marquee measures again once the face has landed, and
                // may arm a line then: frozen with everything else.
                `window.__contrastFreeze(); ` +
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

/*
 * The per-job echo checks (step 3a, the step-3 critic's P1 2). Each answer
 * the page gives a contrast job is held to the job before anything in it is
 * sampled: the nonce of the prepare it answers for, the combination it
 * painted, the viewport it measured, and the look classes this one paint
 * wore — exactly the one class everywhere, and none on the door, which
 * wears the default look's values and no look class of its own since
 * 2026-09-24 (`paintHome`; its deck minis are not counted, `sheetClassesOn`).
 * Each returns why the answer is not the job's, or nothing; a refused job
 * fails the run and says which check refused it.
 */
function paintEcho(job, out, nonce, width, height) {
    const why = [];
    if (out.nonce !== nonce) {
        why.push(`the prepare answered for ${out.nonce} where it was asked as ${nonce}`);
    }
    const painted = out.painted ?? {};
    if (painted.screen !== job.screen || painted.look !== job.look || painted.flags !== job.flags) {
        why.push(`it painted ${painted.screen}/${painted.look}/${painted.flags}`);
    }
    if (out.vw !== width || out.vh !== height) {
        why.push(`the page measured ${out.vw}x${out.vh} where the job is ${width}x${height}`);
    }
    // `a-line-on-the-ground-reads-wherever-a-drop-falls`: every stall that
    // wore Neo's rain had it replaced by the brightest drop, or the job read
    // one instant of a moving decoration (`PROBE-RULES.md`).
    const rain = out.rain ?? { worn: 0, flattened: 0 };
    if (rain.worn !== rain.flattened) {
        why.push(`${rain.worn} stall(s) wore the rain and ${rain.flattened} had it at its brightest`);
    }
    // Grid horizon is read as painted (the owner's C, 2026-09-27): a
    // prepare that flattened it would read the report's frame as the job's.
    const horizon = out.horizon ?? { worn: 0, flattened: 0 };
    if (horizon.flattened !== 0) {
        why.push(`${horizon.flattened} sign(s) had Grid horizon flattened in the prepare, where the job reads it as painted`);
    }
    // The aurora worn alone at one end of its tide (`TIDE_JOBS`): every
    // stall wearing it had the tide held there, and a job that asked for no
    // tide held none.
    const tide = out.tide ?? { worn: 0, held: 0 };
    if (job.tide !== undefined && !(tide.worn > 0 && tide.held === tide.worn)) {
        why.push(`${tide.worn} stall(s) wore the aurora and ${tide.held} had its tide held at ${job.tide}`);
    }
    if (job.tide === undefined && tide.held > 0) {
        why.push(`${tide.held} stall(s) had the aurora's tide held on a job that asked for none`);
    }
    const classes = out.sheetClasses ?? [];
    if (job.screen === 'door') {
        if (classes.length > 0) {
            why.push(`the door wore ${classes.join(', ')} where it wears no look class of its own`);
        }
    } else if (!(classes.length === 1 && classes[0] === job.sheetClass)) {
        why.push(`the paint wore ${classes.join(', ') || 'no look class'} where the job's look is ${job.sheetClass}`);
    }
    return why;
}

function liveEcho(live, nonce, width, height) {
    const why = [];
    if (live.nonce !== nonce) {
        why.push(`the boxes were re-read from prepare ${live.nonce} where the job's last was ${nonce}`);
    }
    if (live.vw !== width || live.vh !== height) {
        why.push(`the boxes were re-read at ${live.vw}x${live.vh} where the job is ${width}x${height}`);
    }
    return why;
}

let prepareSerial = 0;
/** What the run is doing now, for the watchdog's last sentence. */
let currentStep = 'starting';
/** The contrast pass's tabs while it walks, each with the step it is on (`tab.step`), for the same sentence. */
let watchedTabs = [];

/**
 * The shot as PNG bytes, not yet decoded — the contrast pass times the two
 * apart. `optimizeForSpeed` has Chrome encode the PNG with its fastest
 * settings: the same pixels, a larger file, half the time (step 3a, measured
 * by the per-box dump — every box's worst value identical — and pass 5 still
 * gets its alpha channel, which it refuses to run without).
 */
async function captureRaw(cdp, sessionId) {
    const shot = await cdp.send(
        'Page.captureScreenshot',
        { format: 'png', fromSurface: true, optimizeForSpeed: true },
        sessionId,
    );
    return Buffer.from(shot.data, 'base64');
}

async function captureShot(cdp, sessionId) {
    return decodePng(await captureRaw(cdp, sessionId));
}

/*
 * What a quiet-zone reading was taken on (`readQuietZones`, said by
 * `quietReadingLine` when a code reads dark): the capture's size, that it
 * has no clip (`captureRaw` shoots the whole surface) at the emulated device
 * scale of 1, how long after the capture the zones were read, and the page
 * as it is now — its device pixel ratio, its size, its scroll and its visual
 * viewport. A layout that moved between the capture and the read is one
 * suspect, a stale raster another; this is what tells them apart.
 */
const QUIET_PAGE = `(() => {
    const vv = window.visualViewport;
    return {
        dpr: devicePixelRatio,
        inner: [innerWidth, innerHeight],
        scroll: [scrollX, scrollY],
        visual: vv === null ? null : [vv.offsetLeft, vv.offsetTop, vv.pageLeft, vv.pageTop, vv.width, vv.height, vv.scale],
        focus: document.activeElement === null ? null : document.activeElement.tagName.toLowerCase() + (document.activeElement.getAttribute('data-role') === null ? '' : '[' + document.activeElement.getAttribute('data-role') + ']'),
    };
})()`;
async function quietContext(cdp, sessionId, shot, msAfterCapture) {
    return {
        shot: [shot.width, shot.height],
        clip: 'none',
        scale: 1,
        readMsAfterCapture: Math.round(msAfterCapture),
        page: await evalJson(cdp, sessionId, QUIET_PAGE),
    };
}

/** The sign's name or tagline, by a target's description (D14). */
const isName = (sel) => /(^|\.)stall-(?:name|tagline)(\.|$)/.test(sel);
const signPart = (sel) => (/(^|\.)stall-name(\.|$)/.test(sel) ? 'name' : 'tagline');

/**
 * One contrast job, on one of the pass's tabs: the walk's body, as it was, with
 * everything it accumulates kept in job-local names and handed back in
 * `out` when it ends — normally, early (a refused job) or by a throw.
 * Nothing here reads or writes the walk's totals: the walk folds every
 * job's `out` into them in plan order (`commitContrastJob`), so what a run
 * prints and dumps does not depend on which tab ran which job, or when.
 */
async function contrastJob(tab, vp, plannedJob, honestOwed, out) {
    const { cdp, sessionId } = tab;
    const dumpJobs = [];
    const dumpBoxes = [];
    const refused = [];
    const dim = [];
    const contrastClasses = new Set();
    let tideJobs = 0;
    let rainJobs = 0;
    const rainKeys = new Set();
    const uncoveredKinds = new Map();
    const skipTotals = new Map();
    const lineSkips = {};
    const privateLineSkips = {};
    let boxes = 0;
    let lineTargets = 0;
    const nameLeast = new Map();
    const nameChromeSeen = new Set();
    const codesUnread = new Map();
    const codesRead = new Map();
    const codesReadByClass = {};
    let quietPixels = 0;
    const quietReadAgain = [];
    // 1d (bound since 7c): the module read's tallies, by viewport and look, and its failures.
    const modules = {
        byVpClass: {},
        stats: {},
        would: [],
        // Its failures, each a line (a code read wrong after the fresh pair, a code its read failed closed on, a throw).
        failures: [],
        readAgain: [],
        faults: [],
        // Throws caught in 1d's own read, said, counted, and each a failure.
        thrown: [],
        read: new Map(),
        // The codes it read by look (`vp/screen:name`), for the codes owed by name.
        readByClass: {},
        // The codes it failed closed on by look — a code not read whole, a turned code not read upright among them: already failures, not owed again.
        faultedByClass: {},
        // The codes in a turned frame it read upright, every transform above them held off (B1), by look: said by name.
        uprightByClass: {},
        unread: new Map(),
        payloadChecked: 0,
        leastModule: Infinity,
    };
    // 1c(c) (report-only): the per-character read's tallies, by viewport and look (`char-read.mjs`).
    const digits = {
        byVpClass: {},
        triggers: [],
        would: [],
        readAgain: [],
        faults: [],
        shares: {},
        smallKinds: {},
        movers: 0,
        elements: 0,
        triggerMs: 0,
        readMs: 0,
        frames: 0,
        shared: 0,
    };
    let ringTargets = 0;
    let ringPixels = 0;
    let ringLeastPerChar = Infinity;
    let moneyRingRead = 0;
    const ringKinds = new Map();
    const horizonKeys = new Set();
    const horizonWorst = new Map();
    const horizonUnread = [];
    const brokenKeys = new Set();
    let brokenFigures = 0;
    const brokenRoles = new Map();
    let brokenLeast = Infinity;
    let lookPseudoPixels = 0;
    let lookPseudoJobs = 0;
    let lookMarkJobs = 0;
    const lookMarkJobsByClass = {};
    let shownApartJobs = 0;
    let cover;
    const artOffFrames = {};
    let artOffTargets = 0;
    let artOffJobs = 0;
    const artOffJobsByClass = {};
    let honestUnrendered = 0;
    const honestReads = new Map();
    const honestJobs = new Map();
    try {
        await (async () => {
            currentStep = `contrast job ${plannedJob.key}`;
            tab.step = currentStep;
            const { screen, look: theme, flags } = plannedJob;
            const reduced = plannedJob.reduced === true;
            const tideHeld = plannedJob.tide;
            // How a line names the job's decorations: all worn, a solo
            // row's bits, the aurora's tide held (`TIDE_SCREENS`).
            const wornLabel =
                (flags === 0 ? '' : flags === 0xffff ? ' + worn' : ` + flags ${flags}`) +
                (tideHeld === undefined ? '' : ` tide ${tideHeld}`);
            const job = {
                pass: 'contrast',
                viewport: vp.name,
                screen,
                look: theme,
                flags,
                ...(reduced ? { reduced } : {}),
                ...(tideHeld === undefined ? {} : { tide: tideHeld }),
            };
            // A job of `REDUCED_JOBS` is painted under reduced motion: a
            // box the sampler cannot read while it moves (Rural's swaying
            // tag) is read stilled. Switched per job, and back after it.
            if (reduced !== tab.reducedNow) {
                await cdp.send(
                    'Emulation.setEmulatedMedia',
                    { features: reduced ? [{ name: 'prefers-reduced-motion', value: 'reduce' }] : [] },
                    sessionId,
                );
                tab.reducedNow = reduced;
            }
            const record = { key: jobKey(job), ...job };
            dumpJobs.push(record);
            // A job whose echo is not the job is refused before anything
            // is sampled, and says why; the run fails.
            const refuse = (why) => {
                record.refused = why;
                refused.push(`${plannedJob.key}: ${why.join('; ')}`);
            };
            // Two animation frames between hiding the glyphs and the
            // shot: the style change needs a composited frame, and a
            // screenshot taken before one still shows the text — which
            // read as 1.00:1 wherever a sample point landed on a glyph.
            // Every prepare carries a nonce of its own, echoed back by
            // the prepare and by every box re-read after it.
            let nonce;
            const prepare = (neutral, heightOnly = false) => {
                nonce = `${plannedJob.key}#${(prepareSerial += 1)}`;
                return contrastPrepare(cdp, sessionId, screen, theme, flags, neutral, nonce, heightOnly, plannedJob.tide);
            };
            // First paint tells us how tall the page is — the document,
            // and the viewport it takes for the shell's region and an
            // open sheet to hide nothing (`pageHeight` in the probe) —
            // and a page taller than its viewport is grown to hold all
            // of it and painted again at that size, because
            // `captureBeyondViewport` does not reliably paint
            // backgrounds below the fold: a below-fold buy control
            // sampled as near-white. A page that fits is shot at its
            // own size and prepared afresh from the neutral screen —
            // the same paint, by hermeticity. That first paint is asked
            // for its height alone (step 3a): the boxes, the blanking,
            // the font wait and the frames belong to the paint that is
            // shot. Until 2026-09-24 no page fit, because the probe's
            // verdict `<pre>` sat under the app and padded every shot
            // by 313px (`PROBE-RULES.md`, "Shot at the real height").
            const first = await timed('height', () => prepare(true, true));
            for (const cls of first.sheetClasses ?? []) contrastClasses.add(cls);
            record.classes = first.sheetClasses ?? [];
            let why = paintEcho(plannedJob, first, nonce, vp.width, vp.height);
            if (why.length > 0) {
                refuse(why);
                return;
            }
            let shotH = Math.max(vp.height, first.pageH);
            const grew = shotH !== vp.height;
            record.pageH = first.pageH;
            record.grew = grew;
            let grown = false;
            const growTo = (height) =>
                timed('grow', () =>
                    cdp.send(
                        'Emulation.setDeviceMetricsOverride',
                        { width: vp.width, height, deviceScaleFactor: 1, mobile: false },
                        sessionId,
                    ),
                );
            try {
                if (grew) {
                    await growTo(shotH);
                    grown = true;
                }
                let prep = await timed('prepare', () => prepare(!grew));
                /*
                 * The grow is held to the paint it was for. A sheet's
                 * share of a grown viewport is read off the paint, not
                 * known, and the first paint above did not wait for the
                 * self-hosted face — so when the prepared page says it
                 * is still taller than the shot, the shot grows again,
                 * twice at most, and a job that still does not fit is
                 * refused rather than shot with its foot behind a clip.
                 * With the verdict out of the flow nothing pads the
                 * shot past either (`PROBE-RULES.md`, "Shot at the real
                 * height").
                 */
                for (let round = 0; prep.pageH > shotH && round < 2; round += 1) {
                    shotH = prep.pageH;
                    await growTo(shotH);
                    grown = true;
                    prep = await timed('prepare', () => prepare(false));
                }
                record.shotH = shotH;
                if (prep.pageH > shotH) {
                    refuse([`the page is ${prep.pageH}px tall at a ${shotH}px shot after two more grows`]);
                    return;
                }
                for (const cls of prep.sheetClasses ?? []) contrastClasses.add(cls);
                if ((prep.tide?.held ?? 0) > 0) {
                    tideJobs += 1;
                }
                if ((prep.rain?.flattened ?? 0) > 0) {
                    rainJobs += 1;
                    rainKeys.add(plannedJob.key);
                }
                record.prepared = prep.targets.length;
                record.nodes = prep.nodes;
                record.classes = prep.sheetClasses ?? [];
                why = paintEcho(plannedJob, prep, nonce, vp.width, shotH);
                if (why.length === 0 && prep.targets.length === 0) {
                    why = ['the prepare collected no contrast targets — a planned job that measures nothing'];
                }
                if (why.length > 0) {
                    refuse(why);
                    return;
                }
                // The boxes are re-read at the last moment before every
                // shot: anything that lands between prepare and capture
                // (a late face, an image) moves the layout under
                // coordinates already taken.
                const liveBoxes = () => evalJson(cdp, sessionId, 'window.__contrastBoxes()');
                // The shot, and the re-read after it, each held to the
                // job: the image its width by the grown height, the
                // re-read from this job's last prepare at that viewport.
                const capture = async () => {
                    const png = await timed('capture', () => captureRaw(cdp, sessionId));
                    const capturedAt = performance.now();
                    const shot = await timed('decode', async () => decodePng(png));
                    const bad = shot.width !== vp.width || shot.height !== shotH;
                    return {
                        shot,
                        capturedAt,
                        why: bad ? [`the shot is ${shot.width}x${shot.height} where the job is ${vp.width}x${shotH}`] : [],
                    };
                };
                const reread = async () => {
                    const live = await liveBoxes();
                    return { live, why: liveEcho(live, nonce, vp.width, shotH) };
                };
                let { shot: img, why: shotWhy, capturedAt: imgAt } = await capture();
                if (shotWhy.length > 0) {
                    refuse(shotWhy);
                    return;
                }
                const firstRead = await timed('boxes', reread);
                if (firstRead.why.length > 0) {
                    refuse(firstRead.why);
                    return;
                }
                let targets = firstRead.live.boxes;
                // Every prepared node that gave no box, by the reason the
                // page gave (step 5b: no silent drop) — per job in the
                // dump, summed on the pass's line.
                for (const kind of prep.uncovered ?? []) uncoveredKinds.set(kind, (uncoveredKinds.get(kind) ?? 0) + 1);
                record.skips = firstRead.live.skips ?? {};
                for (const [why, n] of Object.entries(record.skips)) skipTotals.set(why, (skipTotals.get(why) ?? 0) + n);
                // The ceiling is the public run's own count (it was
                // measured over the shipped looks and the skeleton); a
                // private look's jobs are counted apart and printed —
                // pinned by nobody yet, as a kit run's are (8e2).
                const skipsHere = PRIVATE_SHEET_CLASSES.includes(plannedJob.sheetClass)
                    ? (privateLineSkips[plannedJob.sheetClass] ??= {})
                    : lineSkips;
                for (const why of ['clipped-away', 'not-rendered']) {
                    const at = (skipsHere[vp.name] ??= { 'clipped-away': 0, 'not-rendered': 0 });
                    at[why] += record.skips[why] ?? 0;
                }
                // A failing box is re-shot once before it is believed:
                // capture right after an emulated resize can raster a
                // stale frame — measured: the live DOM held transparent
                // glyphs and unmoved boxes while the shot showed the text
                // still painted. A real defect is steady state (the
                // planted-colour falsification fails both shots); a stale
                // surface is not. (Step 3a found what most of those
                // shots were: the prepare's own blanking starting a
                // 0.2 s `color` transition on a `.mini`, 89 retries a
                // run. The prepare starts none now and the retries went
                // to zero; the re-shot stays for whatever else is late.)
                let retried = false;
                if (targets.length === 0) {
                    refuse([`prepared ${record.prepared} targets and the re-read found none`]);
                    return;
                }
                record.live = targets.length;
                record.image = [img.width, img.height];
                let sampled = 0;
                let dropped = 0;
                // The honest-display roles this job READ: a verdict, on
                // the line read or in the ring.
                const honestRead = new Set();
                const sampleStart = performance.now();
                let retryMs = 0;
                let retryWhy = [];
                /*
                 * One target's read: a money box or a box with no line
                 * rects whole (`worstContrastInBox`), every other target
                 * over its line rects (`lineRead`, D7). `undefined` when
                 * the read found no pixel — never a silent drop (step
                 * 5b): the target is named below and the job fails.
                 */
                const readOne = (image, t) => {
                    if (t.rects === undefined) {
                        return { worst: worstContrastInBox(image, t, t.color), px: undefined, at: undefined };
                    }
                    const r = lineRead(image, t);
                    return { worst: r.px > 0 ? r.worst : undefined, px: r.px, at: r.at };
                };
                for (let ti = 0; ti < targets.length; ti += 1) {
                    let t = targets[ti];
                    // An outlined line is read in its ring, below.
                    if (t.ring > 0) continue;
                    let read = readOne(img, t);
                    let worst = read.worst;
                    const kind = t.rects === undefined ? 'box' : 'line';
                    if (worst === undefined) {
                        dropped += 1;
                        dumpBoxes.push({ key: boxKey(job, t), job: record.key, i: t.i, sel: t.sel, x: t.x, y: t.y, w: t.w, h: t.h, color: t.color, worst: null, read: kind });
                        dim.push(
                            `${screen} @${vp.name} / theme ${theme}${wornLabel}: ${t.sel} at ${Math.round(t.x)},${Math.round(t.y)} ` +
                                (kind === 'line'
                                    ? `has ${t.rects.length} line rect(s) on screen and no pixel wholly inside one — a target with text and no sample`
                                    : `is ${t.money ? 'money' : 'a box'} the whole-box read found no pixel of — a target with no sample`),
                        );
                        continue;
                    }
                    boxes += 1;
                    sampled += 1;
                    if (kind === 'line') lineTargets += 1;
                    let firstWorst;
                    if (worst < PIXEL_CONTRAST_FLOOR && !retried) {
                        const retryStart = performance.now();
                        firstWorst = worst;
                        await sleep(250);
                        const again = await capture();
                        const againRead = await reread();
                        retryWhy = [...again.why, ...againRead.why];
                        if (retryWhy.length > 0) break;
                        img = again.shot;
                        imgAt = again.capturedAt;
                        if (againRead.live.boxes.length === targets.length) {
                            targets = againRead.live.boxes;
                            t = targets[ti];
                        }
                        retried = true;
                        read = readOne(img, t);
                        worst = read.worst;
                        retryMs += performance.now() - retryStart;
                    }
                    const entry = {
                        key: boxKey(job, t),
                        job: record.key,
                        i: t.i,
                        sel: t.sel,
                        x: t.x,
                        y: t.y,
                        w: t.w,
                        h: t.h,
                        color: t.color,
                        worst: dumpValue(worst),
                        read: kind,
                        ...(firstWorst === undefined ? {} : { first: dumpValue(firstWorst) }),
                        ...(t.role === undefined ? {} : { role: t.role }),
                    };
                    if (t.role !== undefined && worst !== undefined) honestRead.add(t.role);
                    if (kind === 'line') {
                        entry.rects = t.rects.length;
                        entry.px = read.px;
                        if (LEGACY) {
                            // The read before step 5b on this same
                            // capture, and — for a fall — where the new
                            // read's worst pixel lies against it.
                            const legacy = t.legacyDropped ? undefined : worstContrastInBox(img, t, t.color, { legacy: true });
                            entry.legacy = dumpValue(legacy);
                            entry.at = read.at === undefined ? null : [read.at.x, read.at.y];
                            if (legacy !== undefined && worst !== undefined && worst < legacy) {
                                entry.bucket = bucketOf(img, t, read.at);
                            }
                        }
                    }
                    dumpBoxes.push(entry);
                    if (worst !== undefined && isName(t.sel)) {
                        const at = `${signPart(t.sel)} ${plannedJob.sheetClass}${wornLabel}`;
                        nameLeast.set(at, Math.min(nameLeast.get(at) ?? Infinity, worst));
                    }
                    if (worst !== undefined && worst < PIXEL_CONTRAST_FLOOR) {
                        dim.push(
                            `${screen} @${vp.name} / theme ${theme}${wornLabel}: ` +
                                `${t.sel} at ${Math.round(t.x)},${Math.round(t.y)} sits on paint at ${worst.toFixed(2)}:1` +
                                (kind === 'line' && read.at !== undefined
                                    ? ` (line read: the worst of ${read.px} px at ${read.at.x},${read.at.y}, ground rgb(${read.at.ground.join(',')}), ink ${read.at.ink})`
                                    : '') +
                                (process.env.LAYOUT_WHY && kind === 'box' ? `\n        ${globalThis.__why ?? ''}` : ''),
                        );
                    }
                }
                {
                    // The sampling itself, net of any retry inside it
                    // (whose capture and decode are their own phases).
                    const entry = phases.get('sample') ?? { calls: 0, ms: 0 };
                    entry.calls += 1;
                    entry.ms += performance.now() - sampleStart - retryMs;
                    phases.set('sample', entry);
                }
                /*
                 * D4, `a-code-keeps-its-quiet-zone-white`: every code the
                 * job's scope paints, its quiet zone read on the capture
                 * the boxes were read on (`quiet-zone.mjs`). The prepare
                 * blanks text and nothing else, so the code and its plate
                 * are painted as a buyer sees them.
                 */
                if (retryWhy.length === 0) {
                    for (const line of prep.nameChrome ?? []) nameChromeSeen.add(line);
                    /*
                     * A code that reads dark is read again on a fresh pair
                     * before it is believed, the ring read's own rule
                     * (`readQuietZones`): a new capture, the zones read just
                     * before and just after it. The reading that decides is
                     * the fresh pair's — when the code stood still from the
                     * job's capture through it and it read at least the ring
                     * the first did, or the
                     * first stands — and both readings are said — on the
                     * failure, and on the pass's `quiet zone, read again`
                     * line when the second is white — with the code's box,
                     * what above it was scrolled, and the page and capture
                     * as they were (`quietContext`): the flake this is for
                     * has no known cause yet.
                     */
                    const zonesAt = performance.now();
                    const zones = await evalJson(cdp, sessionId, 'window.__quietZones()');
                    /*
                     * 1d's matrices, read right after the zones they pair with
                     * and before anything else asks the page (the tenth
                     * critic's item 5: they were read after the quiet zone's
                     * read, so after its fresh pair whenever a ring read dark).
                     * Guarded (item 6): a page that throws answering for its
                     * matrices fails each code closed for 1d alone
                     * (`withMatrices`' `thrown`; each a failure of 1d since
                     * 7c), is counted and said, and never takes the quiet
                     * zone's read or the job with it — in the fresh pair below
                     * as here.
                     */
                    const codeMatrices = async () => {
                        try {
                            return await evalJson(cdp, sessionId, 'window.__codeMatrices()');
                        } catch (err) {
                            // Every code then fails closed for 1d (`withMatrices`' `thrown`), each a failure of its own below.
                            modules.thrown.push(`${screen} @${vp.name} / theme ${theme}${wornLabel}: the page threw answering for the codes' matrices: ${err.message.slice(0, 200)}`);
                            return { thrown: err.message.slice(0, 200) };
                        }
                    };
                    const matrices = zones.length === 0 ? [] : await timed('modules-dom', codeMatrices);
                    const firstAt = zones.length === 0 ? undefined : await quietContext(cdp, sessionId, img, zonesAt - imgAt);
                    // The fresh pair is made once a job, for the quiet zone's
                    // read and 1d's alike (`readAgainOnFreshPair`), and each
                    // decides by its own rule; its zones carry their matrices.
                    let pair;
                    const again = () =>
                        (pair ??= (async () => {
                            await sleep(250);
                            const before = await evalJson(cdp, sessionId, 'window.__quietZones()');
                            const fresh = await capture();
                            const readAt = performance.now();
                            const after = await evalJson(cdp, sessionId, 'window.__quietZones()');
                            if (fresh.why.length > 0) return { why: fresh.why };
                            const freshMatrices = await codeMatrices();
                            return {
                                img: fresh.shot,
                                zones: withMatrices(after, freshMatrices),
                                before,
                                at: await quietContext(cdp, sessionId, fresh.shot, readAt - fresh.capturedAt),
                            };
                        })());
                    const reads = await readQuietZones({ img, zones, at: firstAt }, again);
                    /*
                     * **A turned code read upright** (the thirteenth review's
                     * B1, the owner's D-2026-10-29-01): a code whose frame is
                     * turned is read by both reads on a frame captured with
                     * every transform above it held off (`__codeTurnsHeldOff`,
                     * `readTurnedUpright`), with a fresh pair of its own held
                     * the same way, and fails closed where it cannot be — never
                     * passed over. One more capture a job with a turned code.
                     */
                    const heldOff = async (on) => {
                        const r = await cdp.send('Runtime.evaluate', { expression: `window.__codeTurnsHeldOff(${on})`, awaitPromise: true, returnByValue: true }, sessionId);
                        if (r.exceptionDetails) throw new Error(`page threw: ${JSON.stringify(r.exceptionDetails).slice(0, 300)}`);
                        return r.result.value;
                    };
                    // The frame held upright, or why it could not be had; the turns are put back whatever happens, and a page that will not put them back is a failure of the job.
                    const heldFrame = async (withBefore) => {
                        let held;
                        try {
                            held = await heldOff(true);
                            const before = withBefore ? await evalJson(cdp, sessionId, 'window.__quietZones()') : undefined;
                            const shot = await capture();
                            const readAt = performance.now();
                            const after = await evalJson(cdp, sessionId, 'window.__quietZones()');
                            if (shot.why.length > 0) return { why: shot.why };
                            return {
                                img: shot.shot,
                                zones: withMatrices(after, await codeMatrices()),
                                ...(before === undefined ? {} : { before }),
                                at: { ...(await quietContext(cdp, sessionId, shot.shot, readAt - shot.capturedAt)), heldOff: held },
                            };
                        } catch (err) {
                            return { why: [`the page threw holding the turns off: ${String(err?.message ?? err).slice(0, 200)}`] };
                        } finally {
                            try {
                                await heldOff(false);
                            } catch (err) {
                                const line = `${screen} @${vp.name} / theme ${theme}${wornLabel}: the page threw putting back the turns it held off above its codes: ${String(err?.message ?? err).slice(0, 200)}`;
                                modules.thrown.push(line);
                                modules.failures.push(`${line} — ${MODULE_CHECK}`);
                            }
                        }
                    };
                    const upright = !zones.some((z) => z.turned)
                        ? new Map()
                        : await timed('codes upright', () =>
                              readTurnedUpright(zones, () => heldFrame(false), async () => {
                                  await sleep(250);
                                  return heldFrame(true);
                              }),
                          );
                    for (const [i, read] of upright) reads[i] = { ...read.quiet, upright: true };
                    for (const { z, r, turned, retry, upright: readUpright } of reads) {
                        const code = `${vp.name}/${screen}:${z.name}`;
                        const at = `${screen} @${vp.name} / theme ${theme}${wornLabel}: the code ${z.name} at ${Math.round(z.x)},${Math.round(z.y)}${readUpright ? ' (in a turned frame, read upright: every transform above it held off)' : ''}`;
                        if (turned) {
                            // Unreachable while every turned code is read upright or failed closed: said as a failure, never passed over.
                            dim.push(`${at} — its frame is turned and it was not read upright — a-code-keeps-its-quiet-zone-white`);
                            continue;
                        }
                        if (r.fault !== undefined) {
                            dim.push(`${at} — ${r.fault} — a-code-keeps-its-quiet-zone-white`);
                            continue;
                        }
                        if (r.px === 0) {
                            codesUnread.set(code, 'wholly outside a clip or the shot');
                            continue;
                        }
                        codesRead.set(code, (codesRead.get(code) ?? 0) + 1);
                        (codesReadByClass[plannedJob.sheetClass] ??= new Set()).add(code);
                        quietPixels += r.px;
                        const readings =
                            retry === undefined
                                ? ''
                                : `\n        first capture: ${quietReadingLine(retry.first)}` +
                                  (retry.again !== undefined
                                      ? `\n        fresh pair: ${quietReadingLine(retry.again, retry.again.before)}`
                                      : retry.unbelieved !== undefined
                                        ? `\n        fresh pair, not believed (${retry.why.join('; ')}): ${quietReadingLine(retry.unbelieved, retry.unbelieved.before)}`
                                        : `\n        not read again: ${retry.why.join('; ')}`);
                        if (r.bad > 0) {
                            dim.push(
                                `${at} has ${r.bad} of ${r.px} quiet-zone pixel(s) under ${QUIET_ZONE_FLOOR} on a channel ` +
                                    `(the first at ${r.first.x},${r.first.y}, rgb(${r.first.rgb.join(',')}))` +
                                    (retry?.again === undefined ? '' : ' on the fresh pair too') +
                                    ` — a-code-keeps-its-quiet-zone-white${readings}`,
                            );
                        } else if (retry !== undefined) {
                            quietReadAgain.push(`${at}: dark on the first capture, white on a fresh pair (on tab ${tab.index} of ${CONTRAST_TABS})${readings}`);
                        }
                    }
                    /*
                     * 1d (before 8g2, bound since step 7c; `code-modules.mjs`,
                     * `a-codes-modules-read-as-its-matrix`): every code the
                     * quiet-zone read reads, each module's centre on the same
                     * capture held to the matrix the code was drawn from
                     * (`__codeMatrices`, off the path's `d`), and a code read
                     * wrong read again on the job's one fresh pair by the quiet
                     * zone's own rule: it fails where the decided reading — the
                     * fresh pair's where the pair is believed, the first where it
                     * cannot be — reads wrong, where the read fails closed (a
                     * module under `MODULE_MIN_PX`, a matrix it cannot read or
                     * pair, a code not read whole: any of its module centres off
                     * screen or clipped away, the thirteenth review's item 8),
                     * and where 1d throws. A code in a turned frame is read
                     * upright, every transform above it held off (B1, above), or
                     * fails closed.
                     */
                    if (zones.length > 0) {
                        // Guarded whole (item 6): a throw in 1d's own read is counted, said, and fails the job; the quiet zone's read stands.
                        let moduleReads = [];
                        try {
                            moduleReads = await timed('modules', () => readCodeModules({ img, zones: withMatrices(zones, matrices), at: firstAt }, again));
                            // The turned codes, read upright above (B1).
                            for (const [i, read] of upright) moduleReads[i] = { ...read.modules, upright: true };
                        } catch (err) {
                            const line = `${screen} @${vp.name} / theme ${theme}${wornLabel}: 1d threw reading the codes' modules: ${String(err?.message ?? err).slice(0, 200)}`;
                            modules.thrown.push(line);
                            modules.failures.push(`${line} — ${MODULE_CHECK}`);
                        }
                        const variant = flags === 0 ? 'bare' : flags === 0xffff ? 'worn' : `flags ${flags}`;
                        const tally = (modules.byVpClass[`${vp.name} ${plannedJob.sheetClass}`] ??= { jobs: 0, codes: 0, modules: 0, wrong: 0, wouldCodes: 0, unread: 0 });
                        tally.jobs += 1;
                        for (const { z, r, turned, retry, upright: readUpright } of moduleReads) {
                            const code = `${vp.name}/${screen}:${z.name}`;
                            const at = `${screen} @${vp.name} / theme ${theme}${wornLabel}: the code ${z.name} at ${Math.round(z.x)},${Math.round(z.y)}${readUpright ? ' (in a turned frame, read upright: every transform above it held off)' : ''}`;
                            if (turned) {
                                // Unreachable while every turned code is read upright or failed closed: a failure, never passed over.
                                const why = 'its frame is turned and it was not read upright';
                                modules.faults.push(`${at} — ${why}`);
                                modules.failures.push(`${at} — ${why} — ${MODULE_CHECK}`);
                                modules.unread.set(code, why);
                                (modules.faultedByClass[plannedJob.sheetClass] ??= new Set()).add(code);
                                tally.unread += 1;
                                continue;
                            }
                            if (r.fault !== undefined) {
                                // Fails closed: a module too small to read, a matrix it cannot read or pair.
                                modules.faults.push(`${at} — ${r.fault}`);
                                modules.failures.push(`${at} — ${r.fault} — ${MODULE_CHECK}`);
                                modules.unread.set(code, r.fault);
                                (modules.faultedByClass[plannedJob.sheetClass] ??= new Set()).add(code);
                                tally.unread += 1;
                                continue;
                            }
                            if (z.payload === 'checked') modules.payloadChecked += 1;
                            if (readUpright) (modules.uprightByClass[plannedJob.sheetClass] ??= new Set()).add(code);
                            modules.read.set(code, (modules.read.get(code) ?? 0) + 1);
                            (modules.readByClass[plannedJob.sheetClass] ??= new Set()).add(code);
                            tally.codes += 1;
                            tally.modules += r.px;
                            modules.leastModule = Math.min(modules.leastModule, z.module);
                            foldStats((modules.stats[`${plannedJob.sheetClass} ${variant} ${screen} @${vp.name}`] ??= {}), r.stats);
                            const readings =
                                retry === undefined
                                    ? ''
                                    : `\n        first capture: ${moduleReadingLine(retry.first)}` +
                                      (retry.again !== undefined
                                          ? `\n        fresh pair: ${moduleReadingLine(retry.again, retry.again.before)}`
                                          : retry.unbelieved !== undefined
                                            ? `\n        fresh pair, not believed (${retry.why.join('; ')}): ${moduleReadingLine(retry.unbelieved, retry.unbelieved.before)}`
                                            : `\n        not read again: ${retry.why.join('; ')}`);
                            if (r.bad > 0) {
                                tally.wrong += r.bad;
                                tally.wouldCodes += 1;
                                const line =
                                    `${at} has ${r.bad} of ${r.px} module centre(s) wrong (${r.wrongDark} dark read light past ${MODULE_DARK_MAX}, ` +
                                    `${r.wrongLight} light read dark under ${MODULE_LIGHT_MIN}; the first at row ${r.first.r} column ${r.first.c}, ` +
                                    `${r.first.x},${r.first.y} rgb(${r.first.rgb.join(',')}))` +
                                    (retry?.again === undefined ? '' : ' on the fresh pair too');
                                modules.would.push(`${line}${readings}`);
                                modules.failures.push(`${line} — ${MODULE_CHECK}${readings}`);
                            } else if (retry !== undefined) {
                                modules.readAgain.push(`${at}: wrong on the first capture, right on a fresh pair (on tab ${tab.index} of ${CONTRAST_TABS})${readings}`);
                            }
                        }
                    }
                }
                /*
                 * **The job's one "shown" frame** (before 8g2, commit 2):
                 * the ring read and the broken-figure read are both read
                 * against the job's own capture (`img`), which is the
                 * blank, on one capture with their glyphs shown
                 * (`__contrastGlyphs`: the outlined targets' and the broken
                 * figures' alike). It was two frames until then — the ring
                 * read's shown capture, and the broken-figure read's own
                 * blank and shown pair — on the same blanked, frozen paint.
                 * Each read keeps its own retry: a failing ring is read
                 * again on a fresh blank and a fresh shown frame, sharing
                 * the box read's one re-shot per job (the job's capture is
                 * replaced, so the broken-figure read after it reads the
                 * fresh pair); a failing broken figure on a fresh blank and
                 * a fresh shown frame of its own, as it always was.
                 */
                const glyphs = async (show, which, money = false) => {
                    const r = await cdp.send(
                        'Runtime.evaluate',
                        { expression: `window.__contrastGlyphs(${show}, ${JSON.stringify(which)}, ${money})`, awaitPromise: true, returnByValue: true },
                        sessionId,
                    );
                    if (r.exceptionDetails) throw new Error(`page threw: ${JSON.stringify(r.exceptionDetails)}`);
                    return r.result.value;
                };
                const outlinedOf = () => targets.filter((t) => t.ring > 0);
                const brokenOf = () => targets.filter((t) => (t.digitsOwed ?? 0) > 0);
                /*
                 * **One frame, unless one read's glyphs could stand in the
                 * other's** (before 8g2, item 8): the ring read takes every
                 * glyph pixel inside an outlined line's rect for that line's,
                 * and reads its ring up to its outline's width past it; the
                 * broken-figure read takes every glyph pixel inside a piece's
                 * rect for the figure's. Where an outlined line's rect, grown
                 * by its ring and a pixel, meets a piece of another target's
                 * broken figure, a glyph of one shown beside the other would be
                 * read as the other's, so each read takes a shown frame of its
                 * own: the outlined glyphs alone, then the figures' alone.
                 */
                const framesApart = () => {
                    const pieces = brokenOf().flatMap((t) => (t.digits ?? []).map((d) => ({ t, d })));
                    return outlinedOf().some((o) =>
                        (o.lines ?? []).some((l) => {
                            const grow = o.ring + 1;
                            return pieces.some(
                                ({ t, d }) => t !== o && l.x - grow < d.x + d.w && d.x < l.x + l.w + grow && l.y - grow < d.y + d.h && d.y < l.y + l.h + grow,
                            );
                        }),
                    );
                };
                /**
                 * The glyphs shown (`which`: both reads', one's, or `none`;
                 * `money`: every money node's too, for 1c(c)), one capture,
                 * the boxes re-read (and, with money, its characters), the
                 * glyphs blanked again: `{ shot, why, chars }`.
                 */
                const shownFrame = async (which, money = moneyShared && which === 'both') => {
                    const shownStart = performance.now();
                    const n = await glyphs(true, which, money);
                    const shownCap = await capture();
                    const shownRead = await reread();
                    const chars = money ? await evalJson(cdp, sessionId, 'window.__moneyChars()') : undefined;
                    await glyphs(false, which, money);
                    const why = [...shownCap.why, ...shownRead.why];
                    if (shownRead.live.boxes.length !== targets.length) {
                        why.push(`${shownRead.live.boxes.length} boxes with the glyphs shown where the blanked read had ${targets.length}`);
                    }
                    const wantOutlined = which === 'both' || which === 'ring' ? outlinedOf().length : 0;
                    const wantFigures = which === 'both' || which === 'figures' ? brokenOf().length : 0;
                    if (n.outlined !== wantOutlined) {
                        why.push(`${n.outlined} outlined targets shown where the read has ${wantOutlined}`);
                    }
                    if (n.figures !== wantFigures) {
                        why.push(`${n.figures} broken figures shown where the read has ${wantFigures}`);
                    }
                    if (money && n.money !== (chars?.targets?.length ?? -1)) {
                        why.push(`${n.money} money nodes shown where the page answered the characters of ${chars?.targets?.length ?? 'none'}`);
                    }
                    const entry = phases.get('shown frame') ?? { calls: 0, ms: 0 };
                    entry.calls += 1;
                    entry.ms += performance.now() - shownStart;
                    phases.set('shown frame', entry);
                    return { shot: shownCap.shot, why, chars };
                };
                /*
                 * 1c(c) (report-only; `char-read.mjs`): a job whose paint
                 * holds a mover near money (`digitTrigger` in the probe, on
                 * the prepared paint) reads every money character. Its
                 * glyphs join the job's one shown frame, unless a money box
                 * meets an outlined line (grown by its ring) or a broken
                 * figure's piece of another target, where one read would
                 * take the other's glyphs for its own: then they take a
                 * frame of their own (`moneyApart`), as the two reads above
                 * do. A job that triggers nothing shows no money glyph and
                 * is captured as it was.
                 */
                const digitTrig = prep.digitTrigger ?? { reasons: [], count: 0, movers: 0, elements: 0, ms: 0 };
                digits.movers += digitTrig.movers;
                digits.elements += digitTrig.elements;
                digits.triggerMs += digitTrig.ms;
                const digitsKey = `${vp.name} ${plannedJob.sheetClass}`;
                const digitsAt = (digits.byVpClass[digitsKey] ??= { jobs: 0, triggered: 0, by1a: 0, chars: 0, held: 0, small: 0, skipped: 0, would: 0, readAgain: 0 });
                digitsAt.jobs += 1;
                const digitsOwed = digitTrig.count > 0;
                const moneyOf = () => targets.filter((t) => t.money);
                const moneyApart = () => {
                    const others = [
                        ...outlinedOf().flatMap((o) => (o.lines ?? []).map((l) => ({ t: o, x: l.x - o.ring - 1, y: l.y - o.ring - 1, w: l.w + 2 * o.ring + 2, h: l.h + 2 * o.ring + 2 }))),
                        ...brokenOf().flatMap((b) => (b.digits ?? []).map((d) => ({ t: b, ...d }))),
                    ];
                    return moneyOf().some(
                        (m) => m.ring === 0 && (m.digitsOwed ?? 0) === 0 && others.some(({ t, x, y, w, h }) => t !== m && m.x < x + w && x < m.x + m.w && m.y < y + h && y < m.y + m.h),
                    );
                };
                const apart = framesApart();
                const moneyShared = digitsOwed && !apart && !moneyApart();
                if (apart) {
                    // Said in the dump only where it happens, so a tree on
                    // which no read meets the other dumps as it did.
                    record.shownApart = true;
                    shownApartJobs += 1;
                }
                let shown;
                if (retryWhy.length === 0 && (apart ? outlinedOf().length > 0 : outlinedOf().length > 0 || brokenOf().length > 0)) {
                    shown = await shownFrame(apart ? 'ring' : 'both');
                    if (shown.why.length > 0) {
                        retryWhy = shown.why.map((w) => `with the glyphs shown, ${w}`);
                    }
                }
                /*
                 * The ring read (`ringRead`): every outlined target, on the
                 * shown frame. A failing ring is read again on a fresh pair
                 * before it is believed — the box read's own rule, and it
                 * shares that rule's one re-shot per job.
                 */
                if (retryWhy.length === 0 && outlinedOf().length > 0) {
                    const ringStart = performance.now();
                    const readAll = (shot) => outlinedOf().map((t) => ({ t, r: ringRead(img, shot, t) }));
                    const bad = ({ r }) => r.worst < PIXEL_CONTRAST_FLOOR || r.thin.length > 0 || r.bare.length > 0;
                    let results = readAll(shown.shot);
                    if (results.some(bad) && !retried) {
                        await sleep(250);
                        const again = await capture();
                        const againRead = await reread();
                        const whyAgain = [...again.why, ...againRead.why];
                        if (whyAgain.length === 0 && againRead.live.boxes.length === targets.length) {
                            img = again.shot;
                            imgAt = again.capturedAt;
                            targets = againRead.live.boxes;
                            retried = true;
                            shown = await shownFrame(apart ? 'ring' : 'both');
                            results = shown.why.length === 0 ? readAll(shown.shot) : [];
                        } else {
                            shown = { why: whyAgain.length > 0 ? whyAgain : ['the re-read after a failing ring moved the boxes'] };
                        }
                    }
                    if (shown.why.length > 0) {
                        retryWhy = shown.why.map((w) => `with the glyphs shown, ${w}`);
                    }
                    sampled += results.length;
                    for (const { t, r } of results) {
                        ringTargets += 1;
                        if (t.role !== undefined) honestRead.add(t.role);
                        if (t.money) {
                            /*
                             * A money box is never read by a weaker
                             * verdict (step 5b; PROPOSAL §12 as amended):
                             * a figure outlined on a decoration's bare
                             * ground is read in its ring — every solid
                             * ring pixel, no percentile — and only with
                             * the decoration at its worst. The outline
                             * is worn only where the rain is, and a job
                             * whose rain was not flattened is refused
                             * by its echo (`paintEcho`); this holds the
                             * money half to it by name.
                             */
                            moneyRingRead += 1;
                            if (!((prep.rain?.flattened ?? 0) > 0)) {
                                dim.push(
                                    `${screen} @${vp.name} / theme ${theme}${wornLabel}: ${t.sel} is money, wears the outline and was ring-read with no decoration at its worst — an-outlined-money-figure-is-ring-read-at-its-worst`,
                                );
                            }
                        }
                        ringPixels += r.ringPx;
                        if (isName(t.sel)) {
                            const at = `${signPart(t.sel)} ${plannedJob.sheetClass}${wornLabel} (ring)`;
                            nameLeast.set(at, Math.min(nameLeast.get(at) ?? Infinity, r.worst));
                        }
                        if (r.chars > 0) ringLeastPerChar = Math.min(ringLeastPerChar, r.maskPx / r.chars);
                        const kind = ringKinds.get(t.sel) ?? { least: Infinity, rim: Infinity, n: 0, ring: t.ring };
                        kind.n += 1;
                        kind.least = Math.min(kind.least, r.worst);
                        kind.rim = Math.min(kind.rim, r.worstRim);
                        ringKinds.set(t.sel, kind);
                        dumpBoxes.push({
                            key: boxKey(job, t),
                            job: record.key,
                            i: t.i,
                            sel: t.sel,
                            x: t.x,
                            y: t.y,
                            w: t.w,
                            h: t.h,
                            color: t.color,
                            worst: dumpValue(r.worst),
                            ring: t.ring,
                            ringPx: r.ringPx,
                            rimPx: r.rimPx,
                            rim: dumpValue(r.worstRim),
                            maskPx: r.maskPx,
                            chars: r.chars,
                            bareLines: r.bare.length,
                        });
                        const at = `${screen} @${vp.name} / theme ${theme}${wornLabel}: ${t.sel} at ${Math.round(t.x)},${Math.round(t.y)}`;
                        if (r.ringPx === 0 || r.thin.length > 0) {
                            const line = r.thin[0];
                            dim.push(
                                `${at} wears the ${t.ring}px outline and shows no ring to read` +
                                    (line === undefined
                                        ? ''
                                        : ` — a line of ${line.chars} letter(s) at ${Math.round(line.x)},${Math.round(line.y)} showed ${line.mask} glyph pixel(s)`),
                            );
                        } else if (r.bare.length > 0) {
                            const line = r.bare[0];
                            dim.push(
                                `${at} wears the ${t.ring}px outline and a line of ${line.chars} letter(s) at ` +
                                    `${Math.round(line.x)},${Math.round(line.y)} shows ${line.mask} glyph pixel(s) and no ring around them`,
                            );
                        } else if (r.worst < PIXEL_CONTRAST_FLOOR) {
                            dim.push(
                                `${at} wears the ${t.ring}px outline and its ring reads ${r.worst.toFixed(2)}:1` +
                                    (process.env.LAYOUT_WHY ? `\n        ${r.why ?? ''}` : ''),
                            );
                        }
                    }
                    const entry = phases.get('ring') ?? { calls: 0, ms: 0 };
                    entry.calls += 1;
                    entry.ms += performance.now() - ringStart;
                    phases.set('ring', entry);
                }
                /*
                 * A broken figure paints every digit (`digitRead`, round 3):
                 * the figures broken after a comma, on the shown frame
                 * against the job's own capture, each piece's glyphs read
                 * in the figure's own ink. A failing read is taken again on
                 * a fresh pair — a fresh blank and a fresh shown frame —
                 * before it is believed, like a failing box.
                 */
                const broken = brokenOf();
                if (retryWhy.length === 0 && broken.length > 0) {
                    const brokenStart = performance.now();
                    const readOn = (blank, shot) => broken.map((t) => ({ t, r: digitRead(blank, shot, t) }));
                    const readFresh = async () => {
                        const blankCap = await capture();
                        const fresh = await shownFrame(apart ? 'figures' : 'both');
                        const why = [...blankCap.why, ...fresh.why];
                        return { why, results: why.length > 0 ? [] : readOn(blankCap.shot, fresh.shot) };
                    };
                    const bad = ({ t, r }) => r.thin.length > 0 || r.found < t.digitsOwed;
                    // The figures' own shown frame where the reads stand apart.
                    const figuresShown = apart ? await shownFrame('figures') : shown;
                    let pass = figuresShown.why.length > 0 ? { why: figuresShown.why, results: [] } : { why: [], results: readOn(img, figuresShown.shot) };
                    if (pass.results.some(bad)) {
                        await sleep(250);
                        pass = await readFresh();
                    }
                    if (pass.why.length > 0) {
                        retryWhy = pass.why.map((w) => `for the broken figures, ${w}`);
                    } else {
                        // The readings themselves, in the dump: a change to
                        // how they are taken is compared reading by reading
                        // (`contrast-dump.mjs` holds the boxes; these ride
                        // the job's record).
                        record.broken = pass.results.map(({ t, r }) => ({
                            i: t.i,
                            sel: t.sel,
                            found: r.found,
                            maskPx: r.maskPx,
                            least: dumpValue(r.least),
                            thin: r.thin.length,
                        }));
                        brokenKeys.add(plannedJob.key);
                        for (const { t, r } of pass.results) {
                            brokenFigures += 1;
                            const roles = brokenRoles.get(plannedJob.key) ?? new Set();
                            roles.add(t.digitsRole);
                            brokenRoles.set(plannedJob.key, roles);
                            if (r.least < brokenLeast) brokenLeast = r.least;
                            const at = `${screen} @${vp.name} / theme ${theme}${wornLabel}: ${t.sel} at ${Math.round(t.x)},${Math.round(t.y)}`;
                            if (r.found < t.digitsOwed) {
                                dim.push(
                                    `${at} is a figure broken after its commas and ${t.digitsOwed - r.found} of its ${t.digitsOwed} letters and digits stand on no line of it — a-broken-figure-paints-every-digit`,
                                );
                            } else if (r.thin.length > 0) {
                                const line = r.thin[0];
                                dim.push(
                                    `${at} is a figure broken after its commas and a piece of ${line.chars} digit(s) at ${Math.round(line.x)},${Math.round(line.y)} ` +
                                        (line.mask < RING_MASK_PER_CHAR * line.chars
                                            ? `paints ${line.mask} glyph pixel(s) toward the figure's ink, under ${RING_MASK_PER_CHAR} a digit`
                                            : `reads ${line.reading.toFixed(2)}:1 against its ground at its strongest pixel a digit (the strongest ${line.best.toFixed(2)}:1), under ${PIXEL_CONTRAST_FLOOR}:1`) +
                                        ` — a-broken-figure-paints-every-digit`,
                                );
                            }
                        }
                    }
                    const entry = phases.get('broken figures') ?? { calls: 0, ms: 0 };
                    entry.calls += 1;
                    entry.ms += performance.now() - brokenStart;
                    phases.set('broken figures', entry);
                }
                /*
                 * 1c(c), every digit where a mover is near (report-only;
                 * `char-read.mjs`): on a triggered job, every money
                 * character on the shown frame — the job's shared one where
                 * its glyphs joined it, else a frame of their own — against
                 * the job's own capture, each held to its own reference. A
                 * job whose characters read wrong is read again on a fresh
                 * pair (`readCharsAgain`): where the pair is believed, a
                 * would-be failure stands if the pair fails it too; where it
                 * cannot be believed, the first read stands, with the
                 * reason. It fails nothing: its sentences go to the run's
                 * report.
                 */
                const readDigits = async (why) => {
                    const start = performance.now();
                    digitsAt.triggered += 1;
                    if (why === '1a') digitsAt.by1a += 1;
                    const at = `${screen} @${vp.name} / theme ${theme}${wornLabel}`;
                    digits.triggers.push(
                        why === '1a'
                            ? `${at}: by 1a's ${cover.faults.length} failure(s) on this job`
                            : `${at}: ${digitTrig.count} meet(s), ${digitTrig.reasons.join('; ')}${digitTrig.count > digitTrig.reasons.length ? '; …' : ''}`,
                    );
                    let first;
                    if (why !== '1a' && shown?.chars !== undefined) {
                        digits.shared += 1;
                        first = { blank: img, shown: shown.shot, chars: shown.chars, why: shown.why };
                    } else {
                        digits.frames += 1;
                        const blankCap = why === '1a' ? await capture() : { shot: img, why: [] };
                        const own = await shownFrame('none', true);
                        first = { blank: blankCap.shot, shown: own.shot, chars: own.chars, why: [...blankCap.why, ...own.why] };
                    }
                    const fault = first.why.length > 0 ? first.why : charsFault(first.chars, moneyOf());
                    if (fault.length > 0) {
                        for (const w of fault) digits.faults.push(`${at}: ${w}`);
                    } else {
                        const read = readMoneyChars(first.blank, first.shown, first.chars);
                        const settled = await readCharsAgain({ read, chars: first.chars }, async () => {
                            await sleep(250);
                            const blankCap = await capture();
                            const fresh = await shownFrame('none', true);
                            return { why: [...blankCap.why, ...fresh.why], blank: blankCap.shot, shown: fresh.shot, chars: fresh.chars };
                        });
                        const r = settled.read;
                        let skipped = 0;
                        for (const t of first.chars.targets) skipped += Object.values(t.skipped).reduce((n, k) => n + k, 0);
                        digitsAt.chars += r.chars;
                        digitsAt.held += r.held;
                        digitsAt.small += r.small;
                        digitsAt.skipped += skipped;
                        digitsAt.would += r.would.length;
                        digitsAt.readAgain += settled.readAgain.length;
                        // A turned frame's shares apart from the upright ones (`turnRef`: its reference is the phase its shown pixels match best).
                        for (const sh of read.shares) foldShares((digits.shares[sh.turned ? `${digitsKey} turned` : digitsKey] ??= {}), [sh], at);
                        for (const [kind, n] of Object.entries(read.smallKinds)) digits.smallKinds[kind] = (digits.smallKinds[kind] ?? 0) + n;
                        record.digits = { by: why, chars: r.chars, held: r.held, small: r.small, skipped, would: r.would.length };
                        for (const w of r.would) {
                            digits.would.push(
                                `${at}: ${w.sel} "${w.c}" at ${Math.round(w.x)},${Math.round(w.y)}: ${w.why}` +
                                    (settled.unbelieved !== undefined ? ` (read again on a fresh pair that cannot be believed: ${settled.unbelieved})` : read.would.length > 0 ? ' — on the fresh pair too' : ''),
                            );
                        }
                        for (const w of settled.readAgain) {
                            digits.readAgain.push(`${at}: ${w.sel} "${w.c}" at ${Math.round(w.x)},${Math.round(w.y)}: ${w.why} on the first pair, kept on a fresh pair (on tab ${tab.index} of ${CONTRAST_TABS})`);
                        }
                    }
                    digits.readMs += performance.now() - start;
                    const entry = phases.get('digits (1c)') ?? { calls: 0, ms: 0 };
                    entry.calls += 1;
                    entry.ms += performance.now() - start;
                    phases.set('digits (1c)', entry);
                };
                if (retryWhy.length === 0 && digitsOwed) await readDigits('trigger');
                /*
                 * Grid horizon at its worst, reported (step 5a″; the
                 * owner's C, 2026-09-27): the art flattened to its
                 * brightest paint (`__horizonAtItsWorst`), a frame with
                 * the glyphs blanked and one with them shown, the sign's
                 * outlined lines ring-read and its other lines line-read
                 * on them, the art put back. Held to `HORIZON_WORST`, a
                 * regression guard and not a floor: the ring read on the
                 * horizon as painted, above, is the failing guard.
                 */
                if (retryWhy.length === 0 && (prep.horizon?.worn ?? 0) > 0 && readsHorizonWorst(plannedJob.key)) {
                    const worstStart = performance.now();
                    const page = async (expression) => {
                        const r = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId);
                        if (r.exceptionDetails) throw new Error(`page threw: ${JSON.stringify(r.exceptionDetails)}`);
                        return r.result.value;
                    };
                    const flat = await page('window.__horizonAtItsWorst(true)');
                    const blankCap = await capture();
                    const flatRead = await reread();
                    await page("window.__contrastGlyphs(true, 'ring')");
                    const shownCap = await capture();
                    await page("window.__contrastGlyphs(false, 'ring')");
                    const back = await page('window.__horizonAtItsWorst(false)');
                    const why = [...blankCap.why, ...shownCap.why, ...flatRead.why];
                    if (flat.worn !== flat.flattened || flat.worn !== prep.horizon.worn || back.worn !== flat.worn) {
                        why.push(`${prep.horizon.worn} sign(s) wore Grid horizon and ${flat.flattened} had its art at its brightest`);
                    }
                    if (why.length > 0) {
                        retryWhy = why.map((w) => `for the horizon's worst, ${w}`);
                    } else {
                        horizonKeys.add(plannedJob.key);
                        for (const t of flatRead.live.boxes) {
                            const part = /(^|\.)stall-(name|tagline|sub)(\.|$)/.exec(t.sel)?.[2];
                            if (part === undefined) continue;
                            const least =
                                t.ring > 0
                                    ? ringRead(blankCap.shot, shownCap.shot, t).worst
                                    : t.rects === undefined
                                      ? worstContrastInBox(blankCap.shot, t, t.color)
                                      : lineRead(blankCap.shot, t).worst;
                            if (least === undefined || !Number.isFinite(least)) {
                                // A line read with no sample is named,
                                // never skipped (5b's rule; the critic,
                                // step 5a″ item 3).
                                horizonUnread.push(`${plannedJob.key} ${t.sel}`);
                                continue;
                            }
                            const byJob = horizonWorst.get(part) ?? new Map();
                            byJob.set(plannedJob.key, Math.min(byJob.get(plannedJob.key) ?? Infinity, least));
                            horizonWorst.set(part, byJob);
                        }
                        // This job's least per sign line, in the dump beside
                        // the boxes (the run prints only the least of all).
                        record.horizonWorst = Object.fromEntries([...horizonWorst].map(([part, byJob]) => [part, dumpValue(byJob.get(plannedJob.key))]));
                    }
                    const entry = phases.get('horizon worst') ?? { calls: 0, ms: 0 };
                    entry.calls += 1;
                    entry.ms += performance.now() - worstStart;
                    phases.set('horizon worst', entry);
                }
                /*
                 * D6(i), `no-look-pseudo-paints-inside-a-protected-box`
                 * (step 5b; the probe's `markLookPseudos`), and since
                 * 8f2 `no-look-mark-paints-inside-a-protected-box` (the
                 * probe's `shownLookMarks`): where the job's scope holds
                 * a look pseudo or a mark a look shows, a frame with
                 * every one of them hidden against a fresh frame with
                 * them shown, compared inside every protected box a
                 * device pixel in from each edge. A pixel that moved is
                 * a look's paint over money, a code or a control. One
                 * frame hides both where a job has both; a frame that
                 * moved is taken again with each hidden alone, to say
                 * which painted there. No capture where neither exists.
                 */
                const pseudosHere = (prep.lookPseudos ?? 0) > 0;
                const marksHere = (prep.lookMarks ?? 0) > 0;
                if (retryWhy.length === 0 && (pseudosHere || marksHere)) {
                    const lpStart = performance.now();
                    const hidden = async (which) => {
                        const r = await cdp.send(
                            'Runtime.evaluate',
                            { expression: `window.__lookPaintHidden(${JSON.stringify(which)})`, awaitPromise: true, returnByValue: true },
                            sessionId,
                        );
                        if (r.exceptionDetails) throw new Error(`page threw: ${JSON.stringify(r.exceptionDetails)}`);
                        return r.result.value;
                    };
                    /** The protected boxes whose pixels moved between two frames: [{ b, changed, first }]. */
                    const movedIn = (on, off, shields) => {
                        const out = [];
                        for (const b of shields) {
                            const x0 = Math.max(0, Math.ceil(b.x) + 1);
                            const y0 = Math.max(0, Math.ceil(b.y) + 1);
                            const x1 = Math.min(on.width - 1, Math.floor(b.x + b.w) - 2);
                            const y1 = Math.min(on.height - 1, Math.floor(b.y + b.h) - 2);
                            let changed = 0;
                            let first;
                            for (let y = y0; y <= y1; y += 1) {
                                for (let x = x0; x <= x1; x += 1) {
                                    const i = (y * on.width + x) * on.bpp;
                                    lookPseudoPixels += 1;
                                    if (
                                        Math.abs(on.data[i] - off.data[i]) > LOOK_PSEUDO_LEVELS ||
                                        Math.abs(on.data[i + 1] - off.data[i + 1]) > LOOK_PSEUDO_LEVELS ||
                                        Math.abs(on.data[i + 2] - off.data[i + 2]) > LOOK_PSEUDO_LEVELS
                                    ) {
                                        changed += 1;
                                        first ??= [x, y];
                                    }
                                }
                            }
                            if (changed > 0) out.push({ b, changed, first });
                        }
                        return out;
                    };
                    const both = pseudosHere && marksHere ? 'both' : pseudosHere ? 'pseudos' : 'marks';
                    // The "shown" frame is the job's own capture (8f2, the
                    // critic's P2-4): the same blanked, frozen paint, and
                    // every step since put back what it changed. Only a
                    // frame that moved is shot fresh before it is believed.
                    let on = { shot: img, why: [] };
                    await hidden(both);
                    const off = await capture();
                    await hidden('none');
                    const shields = await evalJson(cdp, sessionId, 'window.__protectedBoxes()');
                    if (off.why.length === 0 && movedIn(on.shot, off.shot, shields).length > 0) {
                        on = await capture();
                    }
                    const why = [...on.why, ...off.why];
                    if (why.length > 0) {
                        retryWhy = why.map((w) => `for the look-paint frames, ${w}`);
                    } else {
                        if (pseudosHere) lookPseudoJobs += 1;
                        if (marksHere) {
                            lookMarkJobs += 1;
                            lookMarkJobsByClass[plannedJob.sheetClass] = (lookMarkJobsByClass[plannedJob.sheetClass] ?? 0) + 1;
                        }
                        const moved = movedIn(on.shot, off.shot, shields);
                        // Who painted there, asked only of a frame that moved.
                        const byKind = { pseudos: moved, marks: moved };
                        if (moved.length > 0 && both === 'both') {
                            for (const kind of ['pseudos', 'marks']) {
                                await hidden(kind);
                                const alone = await capture();
                                await hidden('none');
                                byKind[kind] = alone.why.length === 0 ? movedIn(on.shot, alone.shot, shields) : moved;
                            }
                        }
                        const say = (kind, rule, words) => {
                            if (both !== 'both' && both !== kind) return;
                            for (const { b, changed, first } of byKind[kind]) {
                                dim.push(
                                    `${screen} @${vp.name} / theme ${theme}${wornLabel}: ${b.sel} at ${Math.round(b.x)},${Math.round(b.y)} ` +
                                        `changes ${changed} px (the first at ${first.join(',')}) when ${words} hidden — ${rule}`,
                                );
                            }
                        };
                        say('pseudos', 'no-look-pseudo-paints-inside-a-protected-box', "the look's pseudo-elements are");
                        say('marks', 'no-look-mark-paints-inside-a-protected-box', "the look's marks are");
                        record.lookPseudos = {
                            marked: prep.lookPseudos ?? 0,
                            marks: prep.lookMarks ?? 0,
                            boxes: shields.length,
                            changed: moved.reduce((n, m) => n + m.changed, 0),
                        };
                    }
                    const entry = phases.get('look pseudos') ?? { calls: 0, ms: 0 };
                    entry.calls += 1;
                    entry.ms += performance.now() - lpStart;
                    phases.set('look pseudos', entry);
                }
                /*
                 * `a-word-reads-when-the-art-does-not-load` (8f2; the
                 * step-8 critic's item 11 and the 8f2 critic's P1-2, the
                 * probe's `markFileArt`): where the job's scope paints
                 * file art — a mask image, a mask border or a `clip-path`
                 * naming a file — every target is read again in the two
                 * states the engines paint (`__artOff`): **pending**,
                 * each such box painting nothing, and — where it differs,
                 * a mask stack mixing file and other layers or a file
                 * clip (`fileArtMixed`) — **failed**, each file layer
                 * skipped and the rest kept. Each target by the reader it
                 * was read by, on the boxes the job read (the art moves
                 * no box): a line by its line rects, money whole, an
                 * outlined line in its ring on a second frame with its
                 * glyphs shown. Every one must clear the floor; a frame
                 * that failed is taken again once before it is believed.
                 */
                if (retryWhy.length === 0 && (prep.fileArt ?? 0) > 0) {
                    const artStart = performance.now();
                    const page = async (expression) => {
                        const r = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId);
                        if (r.exceptionDetails) throw new Error(`page threw: ${JSON.stringify(r.exceptionDetails)}`);
                        return r.result.value;
                    };
                    const artRead = async (state) => {
                        await page(`window.__artOff(${JSON.stringify(state)})`);
                        const blank = await capture();
                        const why = [...blank.why];
                        let shown;
                        if (why.length === 0 && targets.some((t) => t.ring > 0)) {
                            await page("window.__contrastGlyphs(true, 'ring')");
                            shown = await capture();
                            await page("window.__contrastGlyphs(false, 'ring')");
                            why.push(...shown.why);
                        }
                        await page("window.__artOff('off')");
                        if (why.length > 0) return { why };
                        const reads = targets.map((t) => ({
                            t,
                            worst: t.ring > 0 ? ringRead(blank.shot, shown.shot, t).worst : readOne(blank.shot, t).worst,
                        }));
                        return { why, reads };
                    };
                    const states = (prep.fileArtMixed ?? 0) > 0 ? ['pending', 'failed'] : ['pending'];
                    const leastBy = {};
                    for (const state of states) {
                        let art = await artRead(state);
                        if (art.why.length === 0 && art.reads.some((r) => r.worst !== undefined && r.worst < PIXEL_CONTRAST_FLOOR)) {
                            await sleep(250);
                            art = await artRead(state);
                        }
                        if (art.why.length > 0) {
                            retryWhy = art.why.map((w) => `for the art-${state} frame, ${w}`);
                            break;
                        }
                        (artOffFrames[state] ??= {})[plannedJob.sheetClass] = ((artOffFrames[state] ?? {})[plannedJob.sheetClass] ?? 0) + 1;
                        let least = Infinity;
                        for (const { t, worst } of art.reads) {
                            // A target with no sample is named by the
                            // read above, on the same layout: the art
                            // moves no box.
                            if (worst === undefined || !Number.isFinite(worst)) continue;
                            artOffTargets += 1;
                            least = Math.min(least, worst);
                            if (worst < PIXEL_CONTRAST_FLOOR) {
                                dim.push(
                                    `${screen} @${vp.name} / theme ${theme}${wornLabel}: ${t.sel} at ${Math.round(t.x)},${Math.round(t.y)} ` +
                                        `reads ${worst.toFixed(2)}:1 with the look's file art ${state === 'pending' ? 'still loading (each box it masks painting nothing)' : 'failed (each failed layer skipped, the rest kept)'} — ` +
                                        `a-word-reads-when-the-art-does-not-load`,
                                );
                            }
                        }
                        leastBy[state] = dumpValue(least);
                    }
                    if (retryWhy.length === 0) {
                        artOffJobs += 1;
                        artOffJobsByClass[plannedJob.sheetClass] = (artOffJobsByClass[plannedJob.sheetClass] ?? 0) + 1;
                        record.artOff = { art: prep.fileArt, mixed: prep.fileArtMixed ?? 0, read: targets.length, least: leastBy };
                    }
                    const entry = phases.get('art off') ?? { calls: 0, ms: 0 };
                    entry.calls += 1;
                    entry.ms += performance.now() - artStart;
                    phases.set('art off', entry);
                }
                /*
                 * 1a (`nothing-covers-money-or-a-protected-box`; `coverScan`
                 * in the probe), bound since 7a: the hit test with
                 * `pointer-events` forced on, once on the job's paint at its
                 * full height — every frame above put back what it changed.
                 * Below the first screen stands only what a wall, shot at
                 * its own screen's size, holds inside its own scrollers;
                 * those points are counted, not asked. Every failure fails
                 * the pass; the tallies are folded per look and held to the
                 * clip ceiling, and every job not refused owes its read.
                 */
                const scan = await timed('cover (1a)', () => evalJson(cdp, sessionId, 'window.__coverFaults()'));
                if (!Array.isArray(scan?.faults) || COVER_TALLY_KEYS.some((key) => key !== 'paints' && key !== 'failed' && !Number.isFinite(scan[key]))) {
                    throw new Error(`the page's 1a read (__coverFaults) answered no tally a job can be held to: ${JSON.stringify(scan)?.slice(0, 120)}`);
                }
                cover = {
                    cls: plannedJob.sheetClass,
                    ...scan,
                    faults: scan.faults.map((w) => `${screen} @${vp.name} / theme ${theme}${wornLabel}: ${w} — ${COVER_CHECK}`),
                };
                // 1c(c)'s second trigger: 1a's own failures on this job, read on a frame of their own.
                if (retryWhy.length === 0 && !digitsOwed && cover.faults.length > 0) await readDigits('1a');
                record.sampled = sampled;
                record.dropped = dropped;
                record.retried = retried;
                /*
                 * `the-honest-display-sentences-are-read` (8e2): every
                 * role this screen owes at this width was read on this
                 * job, or the job fails naming it.
                 */
                honestUnrendered += prep.honestUnrendered ?? 0;
                for (const role of honestRead) honestReads.set(role, (honestReads.get(role) ?? 0) + 1);
                const owedHere = honestOwed?.[screen]?.[vp.name];
                if (owedHere !== undefined && retryWhy.length === 0) {
                    const at = `${screen}|${vp.name}`;
                    honestJobs.set(at, (honestJobs.get(at) ?? 0) + 1);
                    record.honest = [...honestRead].sort();
                    for (const role of owedHere) {
                        if (!honestRead.has(role)) {
                            dim.push(
                                `${screen} @${vp.name} / theme ${theme}${wornLabel}: the honest-display line [data-role="${role}"] is owed here and was not read ` +
                                    `— collapsed, clipped out of view, hidden or gone (the-honest-display-sentences-are-read, layout/honestDisplay.ts)`,
                            );
                        }
                    }
                }
                if (retryWhy.length > 0) {
                    refuse(retryWhy.map((w) => `on the re-shot, ${w}`));
                } else if (sampled === 0) {
                    // Every box fell outside the shot — a stale capture
                    // from before the viewport grew is the shape — and a
                    // job that sampled nothing proved nothing.
                    refuse([`${targets.length} boxes and none sampled — every one fell outside the ${img.width}x${img.height} shot`]);
                }
            } finally {
                if (grown) {
                    await timed('shrink', () =>
                        cdp.send(
                            'Emulation.setDeviceMetricsOverride',
                            {
                                width: vp.width,
                                height: vp.height,
                                deviceScaleFactor: 1,
                                mobile: false,
                            },
                            sessionId,
                        ),
                    );
                }
            }
        })();
    } finally {
        Object.assign(out, {
            // The tab the job ran on: its sightings are counted by tab and by the run's tab count (the tenth critic's item 4).
            tab: tab.index,
            dumpJobs,
            dumpBoxes,
            refused,
            dim,
            contrastClasses,
            tideJobs,
            rainJobs,
            rainKeys,
            uncoveredKinds,
            skipTotals,
            lineSkips,
            privateLineSkips,
            boxes,
            lineTargets,
            nameLeast,
            nameChromeSeen,
            codesUnread,
            codesRead,
            codesReadByClass,
            quietPixels,
            quietReadAgain,
            modules,
            digits,
            ringTargets,
            ringPixels,
            ringLeastPerChar,
            moneyRingRead,
            ringKinds,
            horizonKeys,
            horizonWorst,
            horizonUnread,
            brokenKeys,
            brokenFigures,
            brokenRoles,
            brokenLeast,
            lookPseudoPixels,
            lookPseudoJobs,
            lookMarkJobs,
            lookMarkJobsByClass,
            shownApartJobs,
            artOffFrames,
            artOffTargets,
            artOffJobs,
            artOffJobsByClass,
            honestUnrendered,
            honestReads,
            honestJobs,
            cover,
        });
    }
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
 * stops meaning anything. A point behind a clip a scroller brings it out
 * from is counted and not hit-tested, because it is reachable by scrolling
 * and nothing outside the clip can cover it — correct, and also the one way
 * this guard can be widened into a green run over nothing.
 *
 * Measured 2026-09-19 on `coveredBy`'s points, the first run that printed a
 * denominator: mobile 1,830 of 13,118 (14%), desktop 1,582 of 11,319 (14%),
 * canvas 0 of 825. The ceiling is a little over twice that — drift
 * protection, not a target: it catches a tolerance that has started eating
 * the pass while leaving room for a screen or two more. Headroom is jitter,
 * not an invitation. If a legitimate change pushes past it, the question to
 * answer first is which points stopped being checked, not what the number
 * should be.
 *
 * **On 1a's points since 7a** (the critic's third review, its checklist
 * item 8; `coverClip`, `look-tallies.mjs`): every geometry pass that read 1a
 * and the contrast pass, the public looks' sum on each, and every carried
 * look on its own. The two wall scrollers (`WALL_SCROLLERS` in
 * `layout/coverPoints.ts`, the touch wall's list and a payment's lines)
 * scroll by design, took the counter tablet to 34% and the narrow wall to
 * 33% on the clean tree before 7a, and are counted apart, outside the
 * ratio; a point behind a clip that cuts and does not scroll is no longer
 * counted at all, but failed (`clipVerdict`). The ceiling stays 30%, and a
 * pass that hit-tested no point fails.
 */
const CLIP_SKIP_CEILING = 0.3;

/**
 * The clip ceiling on one pass's 1a tallies (`coverByClass`): the public
 * looks' sum, as the line the pass says (` · 1a: …`, empty where 1a read
 * nothing) and the faults. Each carried look is held on its own at the end
 * of the run (`carriedTallyFaults`), from `coverSeen`.
 */
function coverClip(byClass) {
    const publicTally = coverTally(
        byClass,
        Object.keys(byClass ?? {}).filter((cls) => !PRIVATE_SHEET_CLASSES.includes(cls)),
    );
    if (publicTally.paints === 0) return { line: '', faults: [] };
    const why = clipCeilingFault(publicTally, CLIP_SKIP_CEILING);
    return { line: ` · 1a: ${clipLine(publicTally)}`, faults: why === undefined ? [] : [`the public looks' 1a points: ${why}`] };
}

/*
 * How many tabs of the one Chrome the geometry passes and the contrast pass
 * walk on (`LAYOUT_CONTRAST_TABS`, 1–4; the name is the contrast pass's,
 * which walked on them first). Measured before it was built, 2026-10-06
 * on the Mac: Chrome's captures on two targets overlap rather than queue,
 * and a job's frame waits are idle time another tab can paint in — two tabs
 * took the run from ~182s to ~131s, three to 119s once (`PROBE-RULES.md`,
 * "The contrast pass walks on two tabs"). The geometry passes followed on
 * 2026-10-19 (D-2026-10-19-02 (3), "The geometry passes walk on two tabs"):
 * each pass is one page on one tab, and two renderers measure at once. One
 * tab is the walk as it always ran; the answers are the same at any count
 * (`commitGeometryPass`, `commitContrastJob`), and every run with more than
 * one tab re-reads a few passes and jobs on another tab to say so
 * (`the-geometry-passes-read-the-same-on-every-tab`,
 * `the-contrast-pass-reads-the-same-on-every-tab`).
 *
 * Unasked, it is 3 on a machine of at least `CONTRAST_TABS_THREE_CORES`
 * cores and `CONTRAST_TABS_MIN_MEMORY` of memory (D-2026-10-27-04: three tabs
 * measured twice more on this Mac, 6 cores and 8 GiB, every canary green and
 * memory pressure normal; `PROBE-RULES.md`, "Three tabs as the default"),
 * 2 on at least `CONTRAST_TABS_MIN_CORES` cores and that memory, and 1
 * elsewhere (the critic's P3-7: on two cores the gain is not there, and no
 * machine smaller than this Mac has run two tabs). The count and why are
 * printed with the pass. `workshop:probe` runs this file, so the kit's probe
 * takes the same count by the same rule; CI's layout job sets its own
 * (`ci.yml`).
 */
const CONTRAST_TABS_MIN_CORES = 4;
const CONTRAST_TABS_THREE_CORES = 6;
const CONTRAST_TABS_MIN_MEMORY = 8 * 1024 ** 3;
const { count: CONTRAST_TABS, why: CONTRAST_TABS_WHY } = (() => {
    const asked = process.env.LAYOUT_CONTRAST_TABS;
    if (asked !== undefined) {
        if (!/^[1-4]$/.test(asked)) {
            console.error(`layout-check: LAYOUT_CONTRAST_TABS is a count of 1 to 4, not "${asked}"`);
            process.exit(1);
        }
        return { count: Number(asked), why: 'set by LAYOUT_CONTRAST_TABS' };
    }
    const cores = cpus().length;
    const memory = totalmem();
    const machine = `${cores} cores, ${(memory / 1024 ** 3).toFixed(1)} GiB`;
    if (cores < CONTRAST_TABS_MIN_CORES || memory < CONTRAST_TABS_MIN_MEMORY) {
        return { count: 1, why: `the default under ${CONTRAST_TABS_MIN_CORES} cores or ${CONTRAST_TABS_MIN_MEMORY / 1024 ** 3} GiB, here ${machine}` };
    }
    if (cores >= CONTRAST_TABS_THREE_CORES) return { count: 3, why: `the default on ${CONTRAST_TABS_THREE_CORES} cores or more and ${CONTRAST_TABS_MIN_MEMORY / 1024 ** 3} GiB, here ${machine}` };
    return { count: 2, why: `the default on ${CONTRAST_TABS_MIN_CORES} to ${CONTRAST_TABS_THREE_CORES - 1} cores and ${CONTRAST_TABS_MIN_MEMORY / 1024 ** 3} GiB, here ${machine}` };
})();

/*
 * One geometry pass's answer (`GEOMETRY_PASSES` in the run): the lines it
 * says, in order and each to the stream it names, whether it failed, the
 * page's report it read, and what it adds to the run's totals — the
 * contrast plan's owed decorations (`worn`), the outlines and marks the
 * contrast pass must read, the codes painted, a page pass's sticky looks and
 * a carried look's clip points. A pass writes none of the totals itself:
 * `commitGeometryPass` folds the records in plan order, so the run says the
 * same whichever tab ran which pass. Its time is its own, from the moment
 * its tab took it.
 */
function geometryRecord(key, tab) {
    const startedAt = performance.now();
    const g = {
        key,
        tab: tab.index,
        lines: [],
        failed: false,
        report: undefined,
        outlined: [],
        marksShown: [],
        sticky: undefined,
        worn: [],
        codes: [],
        log: (text) => g.lines.push({ err: false, text }),
        error: (text) => g.lines.push({ err: true, text }),
        took: () => `${((performance.now() - startedAt) / 1000).toFixed(1)}s`,
    };
    return g;
}
/*
 * Where a pass read again differs from the walk's answer, or undefined: the
 * page's whole report, byte for byte; the lines it says, less the time each
 * prints; whether it failed; and every total it adds. Said as the first
 * thing that differs, with the report's keys that differ named.
 */
function geometryRecordDiffers(walked, again) {
    if (again?.key !== walked.key) return `it came back with ${again?.key === undefined ? 'no record' : `the record of ${again.key}`}`;
    if (again.report === undefined) {
        return `it read no report (${again.lines.find((line) => line.err)?.text ?? 'and said nothing'})`;
    }
    // The page's report as a verdict: everything it says but how long its
    // font wait took (`faces.waitedMs`), which is a clock, not a reading.
    const verdictOf = (report) => {
        if (report === undefined || report === null) return report;
        // 1a's own time is a clock too (before 8g2), and so is `coveredBy`'s (7a), its end-state read's and the dress rule's keyframe-offset read's.
        const untimed = { ...report, coverMs: undefined, coveredByMs: undefined, coverEndMs: undefined, dressSeekMs: undefined, reachMs: undefined, reachSeekMs: undefined, reachSeekNames: undefined, outOfFlowMs: undefined, walkMs: undefined };
        return untimed.faces === undefined || untimed.faces === null ? untimed : { ...untimed, faces: { ...untimed.faces, waitedMs: undefined } };
    };
    const reportOf = (g) => (g.report === undefined ? '' : JSON.stringify(verdictOf(g.report)));
    if (reportOf(walked) !== reportOf(again)) {
        const a = verdictOf(walked.report) ?? {};
        const b = verdictOf(again.report) ?? {};
        const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((key) => JSON.stringify(a[key]) !== JSON.stringify(b[key]));
        const shown = (value) => {
            const text = JSON.stringify(value) ?? 'absent';
            return text.length > 80 ? `${text.slice(0, 77)}…` : text;
        };
        return (
            `its report differs at ${keys.length} key(s): ` +
            keys
                .slice(0, 4)
                .map((key) => `${key} (${shown(a[key])} → ${shown(b[key])})`)
                .join(', ') +
            (keys.length > 4 ? ', …' : '')
        );
    }
    // Less the clocks a line prints: the pass's time and the font wait's.
    const untimed = (g) =>
        JSON.stringify(g.lines.map(({ err, text }) => [err, text.replace(/— \d+\.\ds/g, '— (time)').replace(/asked, \d+ ms/g, 'asked, (time)')]));
    if (untimed(walked) !== untimed(again)) return 'the lines it says differ';
    for (const field of ['failed', 'outlined', 'marksShown', 'sticky', 'worn', 'codes']) {
        if (JSON.stringify(walked[field]) !== JSON.stringify(again[field])) return `what it adds to the totals differs at ${field}`;
    }
    return undefined;
}

/*
 * What a tab's page is (`the-geometry-passes-read-the-same-on-every-tab`):
 * the probe page at the desk's size with no screen measured, and everything
 * about it a tab could make different — its size and density, the screen,
 * the root's and the body's own `style` attribute and the spacing, size,
 * face and writing direction text on them computes to, every media feature
 * a sheet could ask, whether it is visible and focused, its sheets and their
 * rule counts, any sheet adopted onto it, its globals, the natives a probe
 * reads time and layout through, its locale and its faces. Read on the first tab before the walk and on every tab after it,
 * and every one after must be the one before. The passes read again
 * (`GEOMETRY_CANARY`) catch a tab state that moves a verdict on the passes
 * they are; this catches a page one tab alone is handed — a sheet or a
 * script — whatever pass it would move, and an emulation the walk left on
 * every tab alike. Measured first: a rule adopted onto one tab's pages moved
 * the desk pass's clip count and no pass the canary reads (`PROBE-RULES.md`).
 */
const TAB_PRINT = `(() => {
    const media = [
        '(prefers-reduced-motion: reduce)', '(prefers-color-scheme: dark)', '(prefers-contrast: more)',
        '(prefers-reduced-transparency: reduce)', '(prefers-reduced-data: reduce)', '(forced-colors: active)',
        '(inverted-colors: inverted)', '(pointer: fine)', '(pointer: coarse)', '(hover: hover)', '(any-pointer: coarse)',
        '(orientation: portrait)', '(display-mode: browser)', '(scripting: enabled)', '(update: fast)',
        '(dynamic-range: high)', '(color-gamut: p3)', '(monochrome)', 'print',
    ].map((q) => q + ' ' + matchMedia(q).matches);
    const native = (f) => Function.prototype.toString.call(f);
    // The root's and the body's own style, set on the element rather than
    // by a sheet (the probe-shard critic's N2: a letter-spacing set on one
    // tab's <html> by script moved verdicts and no key of the print), and
    // what text on them computes to.
    const own = (el) => {
        if (el === null || el === undefined) return null;
        const cs = getComputedStyle(el);
        return [el.getAttribute('style'), cs.letterSpacing, cs.wordSpacing, cs.fontSize, cs.lineHeight, cs.fontFamily,
            cs.fontKerning, cs.fontVariantLigatures, cs.textRendering, cs.zoom, cs.writingMode, cs.direction];
    };
    return {
        size: [innerWidth, innerHeight, devicePixelRatio, visualViewport?.scale ?? 1],
        root: own(document.documentElement),
        body: own(document.body),
        screen: [screen.width, screen.height, screen.colorDepth, screen.orientation?.type ?? ''],
        media,
        shown: [document.visibilityState, document.hasFocus()],
        sheets: [...document.styleSheets].map((sheet) => (sheet.href ?? 'inline').replace(location.origin, '') + ' ' + sheet.cssRules.length),
        adopted: document.adoptedStyleSheets.map((sheet) => sheet.cssRules.length),
        globals: Object.getOwnPropertyNames(window).sort(),
        natives: [Date, Date.now, Math.random, performance.now, requestAnimationFrame, setTimeout, matchMedia, getComputedStyle,
            Element.prototype.getBoundingClientRect, Element.prototype.getClientRects, Range.prototype.getClientRects,
            Document.prototype.elementFromPoint, Element.prototype.getAnimations, Document.prototype.getAnimations].map(native),
        locale: [navigator.language, navigator.languages.join(','), Intl.DateTimeFormat().resolvedOptions().timeZone, navigator.userAgent],
        fonts: [...document.fonts].map((face) => [face.family, face.style, face.weight, face.unicodeRange, face.status].join(' ')),
    };
})()`;
/** Where one tab's page print differs from another's, or undefined: the keys whose values differ. */
function tabPrintDiffers(a, b) {
    const keys = [...new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})])].filter((key) => JSON.stringify(a?.[key]) !== JSON.stringify(b?.[key]));
    if (keys.length === 0) return undefined;
    return keys
        .map((key) => {
            if (!Array.isArray(a?.[key]) || !Array.isArray(b?.[key])) return `${key} (${JSON.stringify(a?.[key])} → ${JSON.stringify(b?.[key])})`;
            const only = (x, y) => x.filter((v) => !y.some((w) => JSON.stringify(w) === JSON.stringify(v)));
            const lost = only(a[key], b[key]);
            const gained = only(b[key], a[key]);
            const said = (list) => list.slice(0, 3).map((v) => JSON.stringify(v)).join(', ') + (list.length > 3 ? ', …' : '');
            return `${key} (${lost.length === 0 ? '' : `only before: ${said(lost)}`}${lost.length > 0 && gained.length > 0 ? '; ' : ''}${gained.length === 0 ? '' : `only after: ${said(gained)}`}${lost.length + gained.length === 0 ? 'the same values in another order' : ''})`;
        })
        .join(', ');
}

const RUNTIME_CEILING_S = 300;
const startedAt = Date.now();
/*
 * Every CDP command this run sends is bounded (`devtools`' `timeoutMs`): one
 * that has not answered in this long — a page that hung, a target that
 * crashed, a box in swap — fails its pass, naming the method, instead of
 * holding the run open. The longest a healthy command takes here is a
 * capture of a grown 1920-wide page, well under a second — but for the ask
 * that waits out a geometry pass's one synchronous task, which has its own
 * bound (`VERDICT_TIMEOUT_MS`).
 */
const CDP_TIMEOUT_MS = 30_000;
/*
 * And the ceiling is a watchdog, not only a line at the end: once the wall
 * clock passes it the run stops — every process group it started killed
 * (`process-groups.mjs`) — and says what it was doing. A run that crawls
 * past the ceiling used to finish every pass first, however long that took,
 * and only then print the red line.
 */
const watchdog = setTimeout(() => {
    console.error(
        `\n✗ runtime: past the ${RUNTIME_CEILING_S}s ceiling while on ${currentStep}` +
            (watchedTabs.length > 1 ? ` (${watchedTabs.map((tab) => `tab ${tab.index} on ${tab.step ?? 'nothing yet'}`).join('; ')})` : '') +
            ' — the watchdog stops the run.',
    );
    stopGroups().finally(() => process.exit(interruptedCode() ?? 1));
}, RUNTIME_CEILING_S * 1000);
watchdog.unref();
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
/*
 * Where the contrast pass spends its time, phase by phase (the step-3
 * critic's item 4: measure before making anything cheaper or parallel).
 * `timed` adds the wall clock of one awaited step to its phase; the table is
 * printed under the pass's own line, with what no phase accounts for.
 */
const phases = new Map();
async function timed(phase, fn) {
    const t0 = performance.now();
    try {
        return await fn();
    } finally {
        const entry = phases.get(phase) ?? { calls: 0, ms: 0 };
        entry.calls += 1;
        entry.ms += performance.now() - t0;
        phases.set(phase, entry);
    }
}
function phaseTable(passMs, tabs = 1) {
    // With more than one tab a phase's total is its time summed over the
    // tabs, so the share is of the tabs' time — the pass's wall time once
    // per tab — and what no phase accounts for includes a tab's idle time.
    const tabMs = passMs * tabs;
    const rows = [...phases].map(([phase, { calls, ms }]) => ({ phase, calls, ms }));
    const accounted = rows.reduce((sum, row) => sum + row.ms, 0);
    rows.push({ phase: '(unaccounted)', calls: 0, ms: Math.max(0, tabMs - accounted) });
    const lines = [
        tabs === 1
            ? `    phase             calls     total   share     mean`
            : `    phase             calls     total   share     mean   (summed over ${tabs} tabs; share of ${tabs} × the pass)`,
    ];
    for (const { phase, calls, ms } of rows) {
        lines.push(
            `    ${phase.padEnd(16)} ${String(calls || '').padStart(6)} ${(ms / 1000).toFixed(1).padStart(8)}s` +
                ` ${((ms / tabMs) * 100).toFixed(0).padStart(6)}%` +
                ` ${calls === 0 ? '' : `${(ms / calls).toFixed(0).padStart(6)}ms`}`,
        );
    }
    return lines;
}
/*
 * The per-box dump (`contrast-dump.mjs`): every job each contrast pass ran
 * and every box it sampled, with the worst value it found, written to
 * `.layout-dump/` on every run. It is how a change to the passes' machinery
 * is shown to move nothing — or exactly what it moved. Named apart from
 * `contrastJob`'s own `dumpJobs` and `dumpBoxes`, so a job that lost one of
 * its locals would name an undeclared array (`tsc --checkJs` says so)
 * rather than write here out of plan order.
 */
const runDumpJobs = [];
const runDumpBoxes = [];
/*
 * **1a, `nothing-covers-money-or-a-protected-box`** (before 8g2; `coverScan`
 * in the probe), bound since 7a: the hit test with `pointer-events` and
 * `interactivity` forced on, over every money node, every protected box and
 * the unbuyable label, on every geometry pass (each paint, at rest) and once
 * a contrast job at its full height. A geometry pass's failures are in its
 * own failure list, beside every other rule's; a contrast job's fail the
 * contrast pass (`coverFailed`), and a job not refused that read nothing is
 * named (`coverUnread`). What it read is printed per pass and per look,
 * with its own time, and `coveredBy`'s — still bound at rest and at the six
 * instants for the price and "You pay" (and at the last instant for the
 * unbuyable label), under its own check names — per phase beside it.
 */
const COVER_CHECK = 'nothing-covers-money-or-a-protected-box';
const coverGeometry = [];
const coverContrast = {};
const coverFailed = [];
const coverUnread = [];
function coverLines(label, byClass, ms, coveredBy, end, seek) {
    const classes = Object.keys(byClass).sort();
    const sum = (key) => classes.reduce((n, cls) => n + (byClass[cls][key] ?? 0), 0);
    const tally = coverTally(byClass);
    const line =
        `    ${label}: ${sum('failed')} failure(s) (${classes.map((cls) => `${cls} ${byClass[cls].failed}`).join(', ') || 'no look'}) · ` +
        `${sum('paints')} read(s) over ${sum('nodes')} node(s), ${sum('points')} point(s): ${sum('checked')} hit-tested, ` +
        `${sum('below')} below the screen, ${sum('offSide')} past a side edge, ${sum('above')} above the top, ` +
        `${clipLine(tally)}, ${sum('appHidden')} node(s) the app hides skipped · ${(ms / 1000).toFixed(2)}s` +
        (coveredBy?.calls === undefined
            ? ''
            : ` · coveredBy ${['rest', 'instants', 'label']
                  .map((phase) => `${phase} ${coveredBy.calls[phase] ?? 0} in ${((coveredBy.ms?.[phase] ?? 0) / 1000).toFixed(2)}s`)
                  .join(', ')}`) +
        (end === undefined ? '' : ` · at the end of a lasting animation: ${end.reads} read(s), ${end.skipped ?? 0} paint(s) left out (every lasting animation a transform inside a clip that meets nothing asked), ${end.failed} failure(s) in ${(end.ms / 1000).toFixed(2)}s`) +
        (seek === undefined
            ? ''
            : ` · the dress rule's keyframe offsets: ${seek.anims} animation(s) (${seek.layout ?? 0} for the self-clip read alone; ${seek.anchored ?? 0} counted as moving another box because an anchor can follow them), ${seek.seeks} seek(s), ${seek.reads} figure read(s), ${seek.grounds ?? 0} ground(s) read again where a seek changed them, ${seek.clips ?? 0} self-clip read(s), ${seek.faults} fault(s) in ${(seek.ms / 1000).toFixed(2)}s`);
    return [line];
}
/*
 * **1b, `a-paint-with-no-hit-area-reaches-no-money`, bound since step 7b**
 * (before 8g2; `reachAtRest` in the probe, the pure half
 * `layout/paintReach.ts`): the reach of every paint with no hit area — an
 * outer box-shadow, an outline, a border image's outset, a text-shadow, a
 * drop shadow or a blur in a filter, a decoration line, a look pseudo's
 * region — held to every money node's line boxes and every protected box,
 * on every geometry pass, once a paint at rest and at the keyframes of every
 * animation that is not needless. Its failures are in the pass's own list
 * (a throw that stopped it on a paint is one); here they are printed per
 * pass, per look and per kind, grouped by source up to `REACH_PRINTED`, and
 * beside them the meets the owner accepted by name (`REACH_ACCEPTED`, counted
 * and never failed), the blur policy's measurement — the most each soft
 * paint reached over a target — and what a blurred layer would add with its
 * offset and spread counted in full, as a sharp one's is (not counted).
 */
const REACH_CHECK = 'a-paint-with-no-hit-area-reaches-no-money';
const reachGeometry = [];
/** 1b's tallies per look on every geometry pass that owes it (`OWING_GEOMETRY`), for each carried look's own (`carriedTallyFaults`). */
const reachSeen = {};
/** `holds-out-of-flow-agrees-with-this-chrome`, per geometry pass: the page's record of it (`outOfFlowCheck`) and its time. */
const outOfFlowGeometry = [];
/** How many grouped failure sentences of 1b a pass prints word for word (1b fails since 7b; the rest are counted). */
const REACH_PRINTED = 60;
function reachLines(pass, r) {
    const classes = Object.keys(r.byClass).sort();
    const total = reachTally(r.byClass, classes);
    const sum = (key) => total[key];
    const kinds = {};
    for (const cls of classes) for (const [kind, n] of Object.entries(r.byClass[cls].byKind ?? {})) kinds[kind] = (kinds[kind] ?? 0) + n;
    const lines = [
        `    ${pass}: ${sum('would')} failure(s) (${classes.map((cls) => `${cls} ${r.byClass[cls].would}`).join(', ') || 'no look'})` +
            `${Object.keys(kinds).length === 0 ? '' : `, by kind ${Object.entries(kinds).map(([k, n]) => `${k} ${n}`).join(', ')}`}, ` +
            `${sum('accepted')} accepted by name (${classes.filter((cls) => (r.byClass[cls].accepted ?? 0) > 0).map((cls) => `${cls} ${r.byClass[cls].accepted}`).join(', ') || 'none'}) · ` +
            `${sum('paints')} paint(s), ${sum('elements')} element(s) (${sum('contents')} a display: contents text owner) and ${sum('pseudos')} look pseudo(s) read, ${sum('reachers')} with a paint that reaches, ` +
            `${sum('targets')} target(s), ${sum('pairs')} pair(s) judged, ${sum('seeks')} keyframe seek(s) (${sum('wide')} reading every reacher against every target; ${sum('needless')} animation(s) left out: nothing that reaches or moves; ${sum('unmoved')} more: a move of a box that holds nothing 1b reads; ${sum('offSurface')} more: a box under an open sheet's scrim) · ` +
            `a blurred layer's offset and spread counted in full would add ${sum('softCore')} · ${(r.ms / 1000).toFixed(2)}s (seeks ${(r.seekMs / 1000).toFixed(2)}s)`,
    ];
    // A source said on many screens is one line: the sentence less its screen, its look and its place.
    const grouped = new Map();
    for (const w of r.would) {
        const key = w.replace(/^[^:]*: /, '').replace(/ at -?\d+,-?\d+ \(\d+x\d+\)/, '').replace(/, composite [\d.]+/, '');
        const g = grouped.get(key) ?? { n: 0, first: w };
        g.n += 1;
        grouped.set(key, g);
    }
    let printed = 0;
    for (const [, g] of [...grouped].sort((a, b) => b[1].n - a[1].n)) {
        if (printed === REACH_PRINTED) {
            lines.push(`      … and ${grouped.size - printed} more source(s)`);
            break;
        }
        lines.push(`      ${g.first}${g.n > 1 ? ` (×${g.n} on this pass)` : ''}`);
        printed += 1;
    }
    if (r.would.length < sum('would')) lines.push(`      (${sum('would') - r.would.length} more counted and not kept word for word)`);
    // The meets accepted by name (`REACH_ACCEPTED`): grouped as the failures are, each with the entry that accepted it.
    const accepted = new Map();
    for (const w of r.accepted ?? []) {
        const key = w.replace(/^[^:]*: /, '').replace(/ at -?\d+,-?\d+ \(\d+x\d+\)/, '').replace(/, composite [\d.]+/, '');
        const g = accepted.get(key) ?? { n: 0, first: w };
        g.n += 1;
        accepted.set(key, g);
    }
    for (const [, g] of [...accepted].sort((a, b) => b[1].n - a[1].n).slice(0, REACH_PRINTED)) lines.push(`      accepted: ${g.first}${g.n > 1 ? ` (×${g.n} on this pass)` : ''}`);
    // A throw ends 1b on its paint and fails the paint: said here too, so a 1b that read nothing is not read as a 1b that found nothing.
    if (sum('throws') > 0) {
        lines.push(`      1b threw on ${sum('throws')} paint(s) and stopped there (each a failure):`);
        for (const w of (r.thrown ?? []).slice(0, 8)) lines.push(`        ${w}`);
    }
    return lines;
}
/*
 * **3a, `the-ground-walk-reaches-the-stall`, report-only** (before 8g2;
 * `groundWalkRead` in the probe, the pure half in `layout/groundStack.ts`):
 * the ground under every money figure's glyphs read to the stall — a box
 * that paints nothing (`visibility` not `visible`, `display: contents`)
 * skipped, a box above's gradient layers read as the figure's own are, its
 * pictures named where one shows — beside the bound read
 * (`groundStackFault`), which stops at the first opaque background colour.
 * Printed per pass and per look: its would-be failures grouped by the paints
 * new to it that made them (`sources`), up to `WALK_PRINTED` groups a pass
 * with the first sentence of each; the bound read's failures it would not
 * make; and what it could not read, grouped. It moves no verdict.
 */
const WALK_CHECK = 'the-ground-walk-reaches-the-stall';
const walkGeometry = [];
/** How many grouped sources, unread kinds and dropped sentences a pass prints. */
const WALK_PRINTED = 40;
function walkLines(pass, r) {
    const classes = Object.keys(r.byClass).sort();
    const sum = (key) => classes.reduce((n, cls) => n + (r.byClass[cls][key] ?? 0), 0);
    const lines = [
        `    ${pass}: ${sum('would')} would-be failure(s) (${classes.map((cls) => `${cls} ${r.byClass[cls].would}`).join(', ') || 'no look'}), ` +
            `${sum('both')} failing in both, ${sum('dropped')} the bound read makes and this one would not · ` +
            `${sum('elements')} element(s) read: ${sum('past')} reading a paint past the bound stop, ${sum('layers')} a box above's gradient, ${sum('pictures')} a box above's picture, ` +
            `${sum('skipped')} skipping a box that paints nothing; ${sum('unread')} with something unread (${sum('tooMany')} of too many choices) · ${(r.ms / 1000).toFixed(2)}s`,
    ];
    const group = (items, keyOf) => {
        const out = new Map();
        for (const it of items) {
            const key = keyOf(it);
            const g = out.get(key) ?? { n: 0, first: it, screens: new Set() };
            g.n += 1;
            g.screens.add(it.screen);
            out.set(key, g);
        }
        return [...out].sort((a, b) => b[1].n - a[1].n || (a[0] < b[0] ? -1 : 1));
    };
    const print = (title, groups, say) => {
        if (groups.length === 0) return;
        lines.push(`      ${title}:`);
        for (const [key, g] of groups.slice(0, WALK_PRINTED)) lines.push(`        ${say(key, g)}`);
        if (groups.length > WALK_PRINTED) lines.push(`        … and ${groups.length - WALK_PRINTED} more`);
    };
    print('would-be, by look and source', group(r.would, (w) => `${w.cls} · ${w.sources.join(' + ')}`), (key, g) =>
        `${key} ×${g.n} on ${g.screens.size} screen(s) — first: ${g.first.screen} ${g.first.look}: ${g.first.el} "${g.first.text}": ${g.first.fault}`,
    );
    print('unread, by look and what', group(r.unread, (u) => `${u.cls} · ${u.what}`), (key, g) => `${key} ×${g.n} on ${g.screens.size} screen(s) — first: ${g.first.screen} ${g.first.look}: ${g.first.el}`);
    print('the bound read fails and this one would not', group(r.dropped, (d) => `${d.cls} · ${d.bound}`), (key, g) => `${key} ×${g.n} — first: ${g.first.screen} ${g.first.look}: ${g.first.el} "${g.first.text}"`);
    if (r.would.length < sum('would')) lines.push(`      (${sum('would') - r.would.length} more would-be counted and not kept)`);
    if (r.thrown.length > 0) {
        lines.push(`      3a threw on ${r.thrown.length} element(s) (it fails nothing):`);
        for (const w of r.thrown.slice(0, 8)) lines.push(`        ${w}`);
    }
    return lines;
}
/*
 * How the contrast pass was walked, for the dump's `meta` and never its
 * `jobs` or `boxes` (which stay comparable byte for byte at any tab count):
 * the tab count and why, the tab each job ran on, and the canary's reads.
 */
const contrastRun = { tabs: CONTRAST_TABS, tabsWhy: CONTRAST_TABS_WHY, ranOn: {}, canary: [] };
function gitRev() {
    const head = spawnSync('git', ['rev-parse', '--short=7', 'HEAD'], { encoding: 'utf8' });
    if (head.status !== 0) return undefined;
    const dirty = spawnSync('git', ['status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' });
    return `${head.stdout.trim()}${dirty.status === 0 && dirty.stdout.trim() !== '' ? '+' : ''}`;
}
try {
    currentStep = 'the build';
    // The selection's own commit, pinned (`CARRIED.env`): the build carries
    // the looks this run expects, and nothing read twice can differ.
    run('npx', ['vite', 'build', '--config', PROBE_CONFIG, '--logLevel', 'error'], {
        env: { ...process.env, ...CARRIED.env },
    });
    if (LOOKS === 'workshop') {
        // The kit's build is held against what it was given before anything
        // serves it (`workshop-build-check.mjs`); the ordinary probe builds
        // Stall's own sheets and skips this.
        await requireCleanKitBuild({ configFile: PROBE_CONFIG });
    }
    currentStep = 'starting the preview server and Chrome';
    await refuseTakenPort(PORT, 'preview server');
    await refuseTakenPort(DEVTOOLS_PORT, 'Chrome DevTools endpoint');
    server = spawnGroup(
        'the preview server',
        'npx',
        ['vite', 'preview', '--config', PROBE_CONFIG, '--port', PORT, '--strictPort'],
        { env: { ...process.env, ...CARRIED.env } },
    );
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
            // Every tile rastered whole (step 5b, D6): with partial raster on,
            // a frame could carry a tile from before a style change, and the
            // look-pseudo check compares two frames pixel for pixel —
            // `looks-diff.mjs` measured the same flag's absence as a Neo
            // pixel and a Rural card corner in one of two states per load.
            '--disable-partial-raster',
            `--user-data-dir=${profile}`,
            `--remote-debugging-port=${DEVTOOLS_PORT}`,
            'about:blank',
        ],
        { stderr: 'ignore' },
    );

    const cdp = devtools(await devtoolsUrl([server, browser]), { timeoutMs: CDP_TIMEOUT_MS });
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
    /*
     * The tabs the geometry passes and the contrast pass walk on
     * (`CONTRAST_TABS`): the first is the session the transparency pass also
     * uses, the rest are targets of the same Chrome, each in a window of its
     * own (the contrast pass's reason, below). Every tab's page is asked to
     * be focused (`Emulation.setFocusEmulationEnabled`), so a pass cannot read
     * one way on the first tab and another on the second. Measured since
     * (the probe-shard critic, Chrome 154 `--headless=new`): every target
     * reports itself visible and focused without it too — a second window,
     * a background tab in the first's window, the first tab — so it is kept
     * as a belt, beside the check every verdict read makes
     * (`unshownFailures`), whose red proof is a page whose
     * `document.hasFocus` answers false. Each tab has its own page, viewport
     * and emulated media; nothing a pass reads is another tab's.
     */
    const tabs = [{ index: 0, cdp, sessionId, targetId: undefined }];
    for (let index = 1; index < CONTRAST_TABS; index += 1) {
        const target = await cdp.send('Target.createTarget', { url: 'about:blank', newWindow: true });
        const attached = await cdp.send('Target.attachToTarget', { targetId: target.targetId, flatten: true });
        tabs.push({ index, cdp, sessionId: attached.sessionId, targetId: target.targetId });
    }
    for (const tab of tabs) {
        Object.assign(tab, { step: undefined, geometry: [] });
        await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: true }, tab.sessionId);
    }

    /*
     * Pass 1: the page passes, one per viewport (`ALL_VIEWPORTS`). Every
     * geometry pass below is a function of the tab it runs on and the
     * answers it depends on, and hands back its record (`geometryRecord`):
     * the lines it says and what it adds to the run's totals, which only
     * `commitGeometryPass` writes, in plan order.
     */
    const pagePass = (pass) => async (tab) => {
        const vp = pass.vp;
        const g = geometryRecord(pass.key, tab);
        await cdp.send(
            'Emulation.setDeviceMetricsOverride',
            { width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: false },
            tab.sessionId,
        );
        let report;
        try {
            report = await readVerdict(cdp, tab.sessionId, pass, probeUrl(vp));
        } catch (err) {
            g.error(`✗ ${vp.name}: ${err.message}`);
            g.failed = true;
            return g;
        }
        g.report = report;
        // The page's own measurement, not the width we asked for: a runner that
        // prints the request rather than the result is how 500px passed as 390.
        const measured = `${report.viewport}px`;
        if (report.viewport !== vp.width) {
            g.error(
                `✗ ${vp.name}: asked for ${vp.width}px and the page measured ${measured}.`,
            );
            g.failed = true;
            return g;
        }
        // The private looks the page's build carries are the ones the
        // selection names (8e2): a build that dropped one, or carried one
        // nobody selected, is refused before any of its verdict is believed —
        // and before the class audit, whose sentence would only say a class
        // was not painted.
        const wrongPrivate = privateLooksWrong(report.privateClasses);
        if (wrongPrivate !== undefined) {
            g.error(`✗ ${vp.name} (${measured}): ${wrongPrivate}`);
            g.failed = true;
            return g;
        }
        const wrongLook = sheetClassesWrong(report.sheetClasses);
        if (wrongLook !== undefined) {
            g.error(`✗ ${vp.name} (${measured}): ${wrongLook}`);
            g.failed = true;
            return g;
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
        const canvasScreens = await evalJson(cdp, tab.sessionId, 'window.__canvasScreens');
        g.canvasScreens = canvasScreens;
        const ran = report.screensMeasured ?? [];
        const isCanvas = vp === CANVAS;
        const strays = ran.filter((name) => canvasScreens.includes(name) !== isCanvas);
        if (ran.length === 0 || strays.length > 0 || (isCanvas && ran.length !== canvasScreens.length)) {
            g.failed = true;
            g.error(
                `✗ ${vp.name} (${measured}): measured ${ran.length} screen(s)` +
                    (strays.length > 0 ? ` including ${strays.join(', ')}` : '') +
                    ` — the viewport split measured the wrong set.`,
            );
            return g;
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
            g.failed = true;
            g.error(
                `✗ ${vp.name} (${measured}): ${noQuote.join(', ')} mounted no` +
                    ' [data-role="seller-price"] — a pay screen that measured no figure' +
                    ' is a green pass over nothing.',
            );
            return g;
        }
        /*
         * The step-2 rules, audited the same way: each reports what it
         * compared, and a pass that compared nothing where it owes a
         * comparison is refused (`probe-coverage.mjs`).
         */
        g.outlined.push(...(report.outlinedTargets ?? []));
        for (const [cls, n] of Object.entries(report.marksShownByClass ?? {})) if (n > 0) g.marksShown.push(cls);
        if (Object.hasOwn(stickySeen, vp.name)) {
            g.sticky = {
                viewport: vp.name,
                classes: Object.entries(report.stickyByClass ?? {})
                    .filter(([, at]) => at.paints > 0)
                    .map(([cls]) => cls)
                    .sort(),
            };
        }
        g.worn.push(...(report.wornClasses ?? []));
        for (const code of report.codesPainted ?? []) g.codes.push(`${vp.name}/${code}`);
        const gaps = probeCoverageGaps(pass.coverage, report, {
            shippedClasses: SHIPPED_SHEET_CLASSES,
            privateClasses: PRIVATE_SHEET_CLASSES,
            paidPrivateClasses: PAID_PRIVATE_CLASSES,
            skeleton: EXPECTED_SHEET_CLASSES.includes('t-skeleton'),
            sheetedClasses: EXPECTED_SHEET_CLASSES.filter((cls) => cls !== 't-skeleton'),
            kit: LOOKS === 'workshop',
        });
        if (gaps.length > 0) {
            g.failed = true;
            g.error(`✗ ${vp.name} (${measured}): a rule compared nothing it owes —`);
            for (const gap of gaps) g.error(`    ${gap}`);
        }
        const spent = g.took();
        /*
         * The clip tolerance's own arithmetic, on every run rather than only
         * on a passing one, over 1a's points (7a; `coverClip`): a read that
         * skipped every point would be indistinguishable from one that found
         * nothing wrong — §6's complaint about a guard that quietly does not
         * run — and the skip count on its own has no denominator to say
         * which it was. So the ratio is what is printed and what is held,
         * the public looks' here and each carried look's on its own
         * (`look-tallies.mjs`), and a pass that hit-tested no point proved
         * nothing at all whatever its failure list says.
         */
        const { line: clipSaid, faults: clipFaults } = coverClip(report.coverByClass);
        if (clipFaults.length > 0) {
            g.failed = true;
            for (const why of clipFaults) g.error(`✗ ${vp.name} (${measured}): ${why}`);
        }
        const compared = probeCoverageLine(pass.coverage, report);
        if (report.failures.length === 0) {
            if (gaps.length === 0 && clipFaults.length === 0) {
                g.log(
                    `✓ ${vp.name} (${measured}): ${ran.length} screens, every look — ${spent}` +
                        clipSaid +
                        (compared === '' ? '' : `\n    compared: ${compared}`) +
                        `\n    faces: ${facesLine(report.faces)}`,
                );
            }
            return g;
        }
        g.failed = true;
        g.error(
            `✗ ${vp.name} (${measured}): ${report.failures.length} failure(s) — ${spent}${clipSaid}` +
                `\n    faces: ${facesLine(report.faces)}`,
        );
        for (const f of report.failures) {
            g.error(`    ${f.screen} / ${f.theme}: ${f.check} — ${f.detail}`);
        }
        return g;
    };

    /*
     * The worn-only road, once, under the production policy
     * (`a-worn-only-sheet-loads-under-the-production-policy`, step 6): the
     * harness's fixture look (`layout/fixtureLook.ts`) painted, then its
     * sheet put on the page by the app's own loader, `src/ui/lookSheets.ts`
     * (`window.__wornSheetJob`). The
     * ordinary run only: the kit's page is built from the same probe, and
     * the road is the app's, not the look's.
     */
    const wornOnlyPass = (pass) => async (tab) => {
        const vp = pass.vp;
        const g = geometryRecord(pass.key, tab);
        const label = 'worn-only sheet (a-worn-only-sheet-loads-under-the-production-policy)';
        try {
            await cdp.send(
                'Emulation.setDeviceMetricsOverride',
                { width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: false },
                tab.sessionId,
            );
            await cdp.send('Page.navigate', { url: probeUrl(vp, '&screens=') }, tab.sessionId);
            await waitForFlag(cdp, tab.sessionId, '__probeReady');
            const missing = `/assets/no-such-look-sheet-${Date.now().toString(36)}.css`;
            const r = await cdp.send(
                'Runtime.evaluate',
                {
                    expression: `window.__wornSheetJob(${JSON.stringify(missing)}).then((v) => JSON.stringify(v))`,
                    awaitPromise: true,
                    returnByValue: true,
                },
                tab.sessionId,
            );
            if (r.exceptionDetails) throw new Error(`page threw: ${JSON.stringify(r.exceptionDetails)}`);
            const job = JSON.parse(r.result.value);
            g.report = job;
            const faults = wornSheetJobFaults(job);
            if (faults.length === 0) {
                g.log(
                    `✓ ${label}: ${job.url} loaded by the app's loader, last, same origin, named itself (${job.after}), ` +
                        `held ${job.state} and linked once; its art ${job.art.join(', ')}; ` +
                        `a missing sheet (answered ${job.missingStatus}) rejected and held ${job.missingState}: ${job.missingWhy}; no refusal`,
                );
            } else {
                g.failed = true;
                g.error(`✗ ${label}:`);
                for (const fault of faults) g.error(`    ${fault}`);
            }
        } catch (err) {
            g.failed = true;
            g.error(`✗ ${label}: ${err.message}`);
        }
        return g;
    };

    /*
     * Pass 2b, 2c and 2c″: the shop window at a wall size (the `wall` passes
     * of `probe-passes.mjs`: the tall wall `PORTRAIT`, the counter tablet
     * `TABLET`, the two desk walls `DESK_WALL` and `SHORT_WALL`, and since
     * 2026-10-14 the four off-size walls `OFF_SIZE_WALLS`). Each
     * measures its own list of wall screens (`screens`), and the page echoes
     * the window block it entered: a pass whose block (`block`,
     * `WALL_BLOCKS`) the page did not enter would certify a layout it never
     * painted — `portraitTall` because one viewport in the whole matrix used
     * to reach the tall portrait column, `portraitShort` because taking the
     * wall fixtures off the 390 pass took the short-portrait block's only
     * reader with them, and `landscapeShort` for the desk and off-size
     * landscape walls, where the Cycle card's code stands beside its figure.
     * Each
     * owes what the wall passes owe (`probe-coverage.mjs`), the Cycle card's
     * every step on every look among it.
     */
    const wallPass = (pass) => async (tab) => {
        const vp = pass.vp;
        const g = geometryRecord(pass.key, tab);
        await cdp.send(
            'Emulation.setDeviceMetricsOverride',
            { width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: false },
            tab.sessionId,
        );
        const wanted = pass.screens.split(',').length;
        const label = `${vp.name} (${vp.width}x${vp.height}, shop window)`;
        try {
            const wv = await readVerdict(cdp, tab.sessionId, pass, probeUrl(vp, `&screens=${pass.screens}`));
            g.report = wv;
            if (wv.viewport !== vp.width) {
                g.failed = true;
                g.error(`✗ ${label}: asked for ${vp.width}px and the page measured ${wv.viewport}px.`);
            } else if (sheetClassesWrong(wv.sheetClasses) !== undefined) {
                g.failed = true;
                g.error(`✗ ${label}: ${sheetClassesWrong(wv.sheetClasses)}`);
            } else if (wv[pass.block] !== true) {
                // The emulation applied a size and the media query still did
                // not match: the pass would measure another layout and print
                // a tick for this one.
                g.failed = true;
                g.error(
                    `✗ ${label}: the page never entered the ${WALL_BLOCKS[pass.block]} block —` +
                        ' this pass would certify a layout it did not paint.',
                );
            } else if ((wv.screensMeasured ?? []).length !== wanted) {
                g.failed = true;
                g.error(`✗ ${label}: measured ${(wv.screensMeasured ?? []).length} of ${wanted} screens — vacuous green.`);
            } else {
                // Both halves, always: a coverage gap printed in place of the
                // failures hid them (the critic, 2026-09-24). The wall rule
                // owes every one of the touch wall's roles here — a fixture
                // that stopped mounting its controls would leave it green
                // over nothing (`probe-coverage.mjs`).
                g.outlined.push(...(wv.outlinedTargets ?? []));
                g.worn.push(...(wv.wornClasses ?? []));
                for (const code of wv.codesPainted ?? []) g.codes.push(`${vp.name}/${code}`);
                const gaps = probeCoverageGaps(pass.coverage, wv, { privateClasses: PRIVATE_SHEET_CLASSES, kit: LOOKS === 'workshop' });
                const compared = probeCoverageLine(pass.coverage, wv);
                const { line: clipSaid, faults: clipFaults } = coverClip(wv.coverByClass);
                if (wv.failures.length === 0 && gaps.length === 0 && clipFaults.length === 0) {
                    g.log(
                        `✓ ${label}: ${wanted} screens, every look — ${g.took()}${clipSaid}\n    compared: ${compared}` +
                            `\n    faces: ${facesLine(wv.faces)}`,
                    );
                } else {
                    g.failed = true;
                    for (const why of clipFaults) g.error(`✗ ${label}: ${why}`);
                    if (wv.failures.length > 0) {
                        g.error(`✗ ${label}: ${wv.failures.length} failure(s) — ${g.took()}${clipSaid}`);
                        for (const f of wv.failures) {
                            g.error(`    ${f.screen} / ${f.theme}: ${f.check} — ${f.detail}`);
                        }
                    }
                    if (gaps.length > 0) {
                        g.error(`✗ ${label}: a rule compared nothing it owes —`);
                        for (const gap of gaps) g.error(`    ${gap}`);
                    }
                    g.error(`    compared: ${compared}`);
                }
            }
        } catch (err) {
            g.failed = true;
            g.error(`✗ ${label}: ${err.message}`);
        }
        return g;
    };

    /*
     * Pass 2c′: the narrow phone (`NARROW` in `probe-passes.mjs`). Geometry
     * only, the money screens alone. The page's own width is the measurement (`viewport`),
     * as on every pass: an emulation that applied another width would
     * certify a phone nobody measured. Its cost is printed on its line.
     */
    const narrowPass = (pass) => async (tab) => {
        const vp = pass.vp;
        const g = geometryRecord(pass.key, tab);
        await cdp.send(
            'Emulation.setDeviceMetricsOverride',
            { width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: false },
            tab.sessionId,
        );
        const wanted = pass.screens.split(',').length;
        const label = `${vp.name} (${vp.width}x${vp.height}, the money screens)`;
        try {
            const nv = await readVerdict(cdp, tab.sessionId, pass, probeUrl(vp, `&screens=${pass.screens}`));
            g.report = nv;
            const spent = g.took();
            const wrongPrivate = privateLooksWrong(nv.privateClasses);
            const noQuote = payScreensMissingQuote(nv.screensMeasured ?? [], nv.screensWithQuote ?? []);
            if (nv.viewport !== vp.width) {
                g.failed = true;
                g.error(`✗ ${label}: asked for ${vp.width}px and the page measured ${nv.viewport}px.`);
            } else if (wrongPrivate !== undefined) {
                g.failed = true;
                g.error(`✗ ${label}: ${wrongPrivate}`);
            } else if (sheetClassesWrong(nv.sheetClasses) !== undefined) {
                g.failed = true;
                g.error(`✗ ${label}: ${sheetClassesWrong(nv.sheetClasses)}`);
            } else if ((nv.screensMeasured ?? []).length !== wanted) {
                g.failed = true;
                g.error(
                    `✗ ${label}: measured ${(nv.screensMeasured ?? []).length} of ${wanted} screens — vacuous green.`,
                );
            } else if (noQuote.length > 0) {
                g.failed = true;
                g.error(`✗ ${label}: ${noQuote.join(', ')} mounted no seller's figure — a green pass over nothing.`);
            } else {
                g.outlined.push(...(nv.outlinedTargets ?? []));
                g.worn.push(...(nv.wornClasses ?? []));
                for (const code of nv.codesPainted ?? []) g.codes.push(`${vp.name}/${code}`);
                const gaps = probeCoverageGaps(pass.coverage, nv, {
                    privateClasses: PRIVATE_SHEET_CLASSES,
                    sheetedClasses: EXPECTED_SHEET_CLASSES.filter((cls) => cls !== 't-skeleton'),
                    kit: LOOKS === 'workshop',
                });
                const compared = probeCoverageLine(pass.coverage, nv);
                const { line: clipSaid, faults: clipFaults } = coverClip(nv.coverByClass);
                if (nv.failures.length === 0 && gaps.length === 0 && clipFaults.length === 0) {
                    g.log(
                        `✓ ${label}: ${wanted} screens, every look — ${spent}${clipSaid}\n    compared: ${compared}` +
                            `\n    faces: ${facesLine(nv.faces)}`,
                    );
                } else {
                    g.failed = true;
                    for (const why of clipFaults) g.error(`✗ ${label}: ${why}`);
                    if (nv.failures.length > 0) {
                        g.error(`✗ ${label}: ${nv.failures.length} failure(s) — ${spent}${clipSaid}`);
                        for (const f of nv.failures) {
                            g.error(`    ${f.screen} / ${f.theme}: ${f.check} — ${f.detail}`);
                        }
                    }
                    if (gaps.length > 0) {
                        g.error(`✗ ${label}: a rule compared nothing it owes —`);
                        for (const gap of gaps) g.error(`    ${gap}`);
                    }
                    g.error(`    compared: ${compared}`);
                }
            }
        } catch (err) {
            g.failed = true;
            g.error(`✗ ${label}: ${err.message}`);
        }
        return g;
    };

    /*
     * Pass 2d: the short screens (`SHORT_VIEWPORTS` in `probe-passes.mjs`), for the looks a page
     * pass found a sticky sign on. The page reads `?sticky=` and measures
     * those looks alone, and on each paint only where the sign is sticky:
     * the scroll pass, `a-sticky-sign-fits-its-region` and
     * `the-sellers-name-stands-whole`. Its cost is printed on its line. It
     * runs after the page pass it reads (`after`), on whichever tab is free:
     * the looks are that pass's own answer, never the run's totals.
     */
    const shortPass = (pass) => async (tab, [from]) => {
        const vp = pass.vp;
        const g = geometryRecord(pass.key, tab);
        const classes = from?.sticky?.classes ?? [];
        const label = `short (${vp.width}x${vp.height}, sticky signs)`;
        if (classes.length === 0) {
            g.log(`· ${label}: no look has a sticky sign at the ${vp.from} pass's width — nothing to measure`);
            return g;
        }
        await cdp.send(
            'Emulation.setDeviceMetricsOverride',
            { width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: false },
            tab.sessionId,
        );
        try {
            const sv = await readVerdict(cdp, tab.sessionId, pass, probeUrl(vp, `&sticky=${classes.join(',')}`));
            g.report = sv;
            const spent = g.took();
            const echoed = JSON.stringify(sv.stickyOnly ?? null);
            if (sv.viewport !== vp.width) {
                g.failed = true;
                g.error(`✗ ${label}: asked for ${vp.width}px and the page measured ${sv.viewport}px.`);
            } else if (echoed !== JSON.stringify(classes)) {
                g.failed = true;
                g.error(`✗ ${label}: asked for ${classes.join(', ')} and the page read ${echoed} — it measured another set.`);
            } else {
                // Owed: every look handed here found sticky and its name read
                // at this size — a look the page pass found sticky and this
                // pass never did measured nothing of it here.
                const gaps = [];
                for (const cls of classes) {
                    if (!(((sv.stickyByClass ?? {})[cls]?.paints ?? 0) > 0)) {
                        gaps.push(`found no sticky sign on a ${cls} stall at ${vp.width}x${vp.height}, where the ${vp.from} pass found one`);
                    }
                    if (!(((sv.nameLinesByClass ?? {})[cls] ?? 0) > 0)) {
                        gaps.push(`the-sellers-name-stands-whole read no line of the sign on a ${cls} stall`);
                    }
                }
                const tally = classes
                    .map((cls) => {
                        const at = (sv.stickyByClass ?? {})[cls] ?? { paints: 0, scrolled: 0, stops: 0 };
                        return `${cls} ${at.paints}/${at.scrolled}/${at.stops}`;
                    })
                    .join(', ');
                const line = `${sv.shortPass?.measured ?? 0} paints measured, ${sv.shortPass?.notSticky ?? 0} set aside (no sticky sign there) · sticky signs (paints/scrolled/stops): ${tally}`;
                if (sv.failures.length === 0 && gaps.length === 0) {
                    g.log(`✓ ${label}: ${(sv.screensMeasured ?? []).length} screens — ${spent}\n    compared: ${line}\n    faces: ${facesLine(sv.faces)}`);
                } else {
                    g.failed = true;
                    if (sv.failures.length > 0) {
                        g.error(`✗ ${label}: ${sv.failures.length} failure(s) — ${spent}`);
                        for (const f of sv.failures) {
                            g.error(`    ${f.screen} / ${f.theme}: ${f.check} — ${f.detail}`);
                        }
                    }
                    if (gaps.length > 0) {
                        g.error(`✗ ${label}: a rule compared nothing it owes —`);
                        for (const gap of gaps) g.error(`    ${gap}`);
                    }
                    g.error(`    compared: ${line}`);
                }
            }
        } catch (err) {
            g.failed = true;
            g.error(`✗ ${label}: ${err.message}`);
        }
        return g;
    };

    /*
     * Pass 3: reduced motion (`REDUCED` in `probe-passes.mjs`, which says
     * why each screen is there): the animating screens again, each at the
     * width it is painted at, under `prefers-reduced-motion: reduce`.
     *
     * Each pass sets the media feature on its own tab and takes it off again
     * whatever happens, so the next pass that tab runs is measured without it.
     */
    const reducedPass = (pass) => async (tab) => {
        const g = geometryRecord(pass.key, tab);
        await cdp.send(
            'Emulation.setEmulatedMedia',
            { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] },
            tab.sessionId,
        );
        try {
            await cdp.send(
                'Emulation.setDeviceMetricsOverride',
                { width: pass.vp.width, height: pass.vp.height, deviceScaleFactor: 1, mobile: false },
                tab.sessionId,
            );
            const wanted = pass.screens.split(',').length;
            const label = `reduced-motion (${pass.screens.replace(/,/g, ', ')} @${pass.vp.name})`;
            try {
                const rm = await readVerdict(cdp, tab.sessionId, pass, probeUrl(pass.vp, `&screens=${pass.screens}`));
                g.report = rm;
                // The page's own answer, not the request: emulation that silently
                // did not apply is how 500px once passed as 390, and a screen list
                // that measured the wrong width is the same failure.
                if (rm.reducedMotion !== true) {
                    g.failed = true;
                    g.error(`✗ ${label}: the page never saw the media feature.`);
                } else if (sheetClassesWrong(rm.sheetClasses) !== undefined) {
                    g.failed = true;
                    g.error(`✗ ${label}: ${sheetClassesWrong(rm.sheetClasses)}`);
                } else if (rm.viewport !== pass.vp.width) {
                    g.failed = true;
                    g.error(
                        `✗ ${label}: asked for ${pass.vp.width}px and the page measured ${rm.viewport}px.`,
                    );
                } else if ((rm.screensMeasured ?? []).length !== wanted) {
                    g.failed = true;
                    g.error(`✗ ${label}: the pass measured nothing — vacuous green.`);
                } else if (
                    payScreensMissingQuote(rm.screensMeasured ?? [], rm.screensWithQuote ?? [])
                        .length > 0
                ) {
                    // This pass names a pay screen on each side (the sheet, and the
                    // overlay's quote card), and stilling a figure that was never
                    // mounted is the same vacuous green one line up.
                    g.failed = true;
                    g.error(
                        `✗ ${label}: ${payScreensMissingQuote(
                            rm.screensMeasured ?? [],
                            rm.screensWithQuote ?? [],
                        ).join(', ')} mounted no [data-role="seller-price"].`,
                    );
                } else {
                    const { line: clipSaid, faults: clipFaults } = coverClip(rm.coverByClass);
                    if (rm.failures.length === 0 && clipFaults.length === 0) {
                        g.log(`✓ ${label}: every look — ${g.took()}${clipSaid}\n    faces: ${facesLine(rm.faces)}`);
                    } else {
                        g.failed = true;
                        for (const why of clipFaults) g.error(`✗ ${label}: ${why}`);
                        if (rm.failures.length > 0) {
                            g.error(`✗ ${label}: ${rm.failures.length} failure(s) — ${g.took()}${clipSaid}`);
                            for (const f of rm.failures) {
                                g.error(`    ${f.screen} / ${f.theme}: ${f.check} — ${f.detail}`);
                            }
                        }
                    }
                }
            } catch (err) {
                g.failed = true;
                g.error(`✗ ${label}: ${err.message}`);
            }
        } finally {
            await cdp.send('Emulation.setEmulatedMedia', { features: [] }, tab.sessionId);
        }
        return g;
    };

    /*
     * The geometry passes, in the order they are said (`GEOMETRY_PASSES`):
     * the plan `probe-passes.mjs` lays out (`GEOMETRY_PLAN`), each entry run
     * by its kind. A short pass reads the page pass it names in `after`, and
     * waits for it.
     */
    const RUN_KIND = {
        page: pagePass,
        'worn-only': wornOnlyPass,
        wall: wallPass,
        narrow: narrowPass,
        short: shortPass,
        reduced: reducedPass,
    };
    if (Object.keys(RUN_KIND).sort().join() !== [...GEOMETRY_KINDS_RUN].sort().join()) {
        throw new Error(`the runners here (${Object.keys(RUN_KIND).join(', ')}) are not the kinds GEOMETRY_KINDS_RUN says (${[...GEOMETRY_KINDS_RUN].join(', ')})`);
    }
    const GEOMETRY_PASSES = GEOMETRY_PLAN.map((pass) => ({ key: pass.key, after: pass.after, run: RUN_KIND[pass.kind](pass) }));
    /*
     * One pass's answer folded into the run's totals, and its lines said.
     * Called in plan order, as each answer and every answer before it is in,
     * it leaves the totals and the output exactly as one tab running the
     * passes one after another left them: a set is added to in the order the
     * passes are planned, the page passes' sticky looks and clip points are
     * written under their own viewport, and the lines go to the stream each
     * named.
     */
    const commitGeometryPass = (g) => {
        if (g.report?.coverByClass !== undefined) {
            coverGeometry.push({
                pass: g.key,
                byClass: g.report.coverByClass,
                ms: g.report.coverMs ?? 0,
                coveredBy: { calls: g.report.coveredByCalls, ms: g.report.coveredByMs },
                end: g.report.coverEnd === undefined ? undefined : { ...g.report.coverEnd, ms: g.report.coverEndMs ?? 0 },
                seek: g.report.dressSeek === undefined ? undefined : { ...g.report.dressSeek, ms: g.report.dressSeekMs ?? 0 },
            });
            if (coverTally(g.report.coverByClass).paints > 0) coverSeen[g.key] = g.report.coverByClass;
        }
        if (g.report?.reachByClass !== undefined) {
            // Every pass whose page ran 1b ran its containing-block check too (the worn-only pass's report is its own job's, and runs neither).
            outOfFlowGeometry.push({ pass: g.key, check: g.report.outOfFlowCheck, ms: g.report.outOfFlowMs ?? 0 });
            reachGeometry.push({
                pass: g.key,
                byClass: g.report.reachByClass,
                would: g.report.reachWould ?? [],
                accepted: g.report.reachAccepted ?? [],
                literal: g.report.reachLiteral ?? [],
                thrown: g.report.reachThrown ?? [],
                soft: g.report.reachSoft ?? {},
                ms: g.report.reachMs ?? 0,
                seekMs: g.report.reachSeekMs ?? 0,
                policy: g.report.reachBlurOpacity,
            });
            if (OWING_GEOMETRY.has(g.key)) reachSeen[g.key] = g.report.reachByClass;
        }
        if (g.report?.walkByClass !== undefined) {
            walkGeometry.push({
                pass: g.key,
                byClass: g.report.walkByClass,
                would: g.report.walkWould ?? [],
                dropped: g.report.walkDropped ?? [],
                unread: g.report.walkUnread ?? [],
                thrown: g.report.walkThrown ?? [],
                ms: g.report.walkMs ?? 0,
            });
        }
        for (const { err, text } of g.lines) (err ? console.error : console.log)(text);
        if (g.failed) failed = true;
        for (const kind of g.outlined) outlinedTargetsSeen.add(kind);
        for (const cls of g.marksShown) marksShownSeen.add(cls);
        if (g.sticky !== undefined) stickySeen[g.sticky.viewport] = g.sticky.classes;
        for (const cls of g.worn) wornClassesSeen.add(cls);
        for (const code of g.codes) codesPaintedSeen.add(code);
    };
    /*
     * The walk, on every tab at once (`CONTRAST_TABS`, the contrast pass's
     * own rule; `walkPlan`, `scripts/plan-walk.mjs`). The passes are handed
     * out one at a time in plan order to whichever tab is free — the plan
     * ends on its smallest passes, so the tabs come out of it close together
     * — and each pass reads its own tab's page and nothing else, and hands
     * back its record. The records
     * are said and folded in plan order as they come in (`commitGeometryPass`):
     * the run says the same lines, in the same order, whichever tab ran which
     * pass, and a pass's own time and its tab are said after the walk
     * (`geometry:`). The first tab to throw stops the hand-out; the others
     * finish the pass they hold, the throw of the earliest pass in the plan
     * is the run's, and only the passes before it are said — the same passes
     * at any tab count.
     *
     * `the-geometry-passes-read-the-same-on-every-tab`: the fold proves
     * nothing about the answers it folds — that a pass reads the same
     * whichever tab ran it, after whatever that tab ran before, is the
     * passes' hermeticity, and this holds it on every run with more than one
     * tab, as `the-contrast-pass-reads-the-same-on-every-tab` holds the
     * contrast jobs'. A sample of passes (`GEOMETRY_CANARY`, two picks) is
     * read again on a tab other than the one that ran it — by a tab whose
     * hand-out has run out, so the reads fill the time it would stand
     * waiting for the others — and each must hand back the same verdict as
     * the walk's answer: the page's whole report, the lines it says less
     * their clocks, and what it adds to the totals, byte for byte
     * (`geometryRecordDiffers`), or the run fails naming the pass and both
     * tabs. Read again, compared, never folded. A pass whose walk measured
     * nothing (a short pass with no sticky sign) is not read again: its
     * pick's next key is, so a run reads two passes again whatever looks it
     * carries.
     */
    currentStep = 'the geometry passes';
    watchedTabs = tabs;
    const geometryStartedAt = performance.now();
    /*
     * What a tab's page is (`TAB_PRINT`): read once on the first tab before
     * the walk, a page no pass has touched, and on every tab once its walk
     * and its reads are done. Every one after must be the one before: a tab
     * handed a sheet or a script of its own differs from the rest, and an
     * emulation a pass left on its tab — or on every tab alike — differs
     * from the page before the walk.
     */
    const readTabPrint = async (tab) => {
        tab.step = 'geometry canary: the page print';
        await cdp.send(
            'Emulation.setDeviceMetricsOverride',
            { width: VIEWPORTS[1].width, height: VIEWPORTS[1].height, deviceScaleFactor: 1, mobile: false },
            tab.sessionId,
        );
        await cdp.send('Page.navigate', { url: probeUrl(VIEWPORTS[1], '&screens=') }, tab.sessionId);
        await waitForFlag(cdp, tab.sessionId, '__probeReady');
        return evalJson(cdp, tab.sessionId, TAB_PRINT);
    };
    const printBefore = tabs.length > 1 ? await readTabPrint(tabs[0]) : undefined;
    const tabPrints = new Map();
    const geometry = await walkPlan({
        tabs,
        plan: GEOMETRY_PASSES,
        keyOf: (pass) => pass.key,
        afterOf: (pass) => pass.after ?? [],
        run: (tab, pass, deps) => pass.run(tab, deps),
        commit: commitGeometryPass,
        picks: tabs.length > 1 ? GEOMETRY_CANARY : [],
        // A pass whose walk measured nothing (the short pass with no sticky
        // sign) is not read again; its pick's next key is, in its place.
        measured: (answer) => answer?.report !== undefined,
        tabIndex: (tab) => tab.index,
        onStart: (tab, pass, n, again) => {
            tab.step = `geometry ${again ? 'canary' : 'pass'} ${pass.key}`;
        },
        onEnd: (tab, pass, n, ms, again) => {
            if (!again) tab.geometry.push({ key: pass.key, ms });
            tab.step = 'between geometry passes';
        },
        // And what each tab's page is, once its walk and its reads are done.
        tail:
            tabs.length > 1
                ? async (tab) => {
                      tabPrints.set(tab.index, await readTabPrint(tab));
                      tab.step = 'the end of the geometry passes';
                  }
                : undefined,
    });
    const geometryWallMs = performance.now() - geometryStartedAt;
    if (geometry.fault !== undefined) {
        if (geometry.lostAfterFault > 0) {
            console.error(
                `    ${geometry.lostAfterFault} geometry pass(es) after it in the plan ran on other tabs before the hand-out stopped, and are not reported`,
            );
        }
        currentStep = `geometry pass ${geometry.fault.key} on tab ${geometry.fault.tab}`;
        throw geometry.fault.err;
    }
    /*
     * Every pass handed out came back with its own record — a tab that took
     * a pass and never ran it, or answered another pass's, would otherwise
     * have said nothing for it and counted it done.
     */
    if (geometry.unanswered.length > 0) {
        throw new Error(
            `${geometry.unanswered.length} geometry pass(es) handed to a tab came back with no record of their own: ${geometry.unanswered.join(', ')}`,
        );
    }
    if (geometry.readFault !== undefined) {
        currentStep = 'the geometry passes: the cross-tab canary';
        throw geometry.readFault;
    }
    const geometryCanary = [];
    const tabPrintFaults = [];
    if (printBefore !== undefined) {
        for (const tab of tabs) {
            const differ = tabPrintDiffers(printBefore, tabPrints.get(tab.index));
            if (differ !== undefined) tabPrintFaults.push({ tab: tab.index, differ });
        }
    }
    for (const fault of tabPrintFaults) {
        failed = true;
        console.error(
            `✗ geometry: the-geometry-passes-read-the-same-on-every-tab: tab ${fault.tab}'s page after the walk is not the page before it — ${fault.differ}`,
        );
    }
    for (const n of geometry.picks) {
        if (geometry.answers[n].report === undefined) continue;
        const read = geometry.readAgain.get(n);
        const differ = read === undefined ? 'no other tab read it again' : geometryRecordDiffers(geometry.answers[n], read.answer);
        geometryCanary.push({ key: GEOMETRY_PASSES[n].key, ranOn: geometry.ranOn[n], readOn: read?.tab, ms: read?.ms ?? 0, differ });
        if (differ !== undefined) {
            failed = true;
            console.error(
                `✗ geometry: the-geometry-passes-read-the-same-on-every-tab: ${GEOMETRY_PASSES[n].key} ran on tab ${geometry.ranOn[n]}` +
                    (read === undefined ? '' : ` and read again on tab ${read.tab}`) +
                    `: ${differ}`,
            );
        }
    }
    /*
     * What each pass cost and the tab it ran on, in plan order, and each
     * tab's share — printed whatever the verdict, as the contrast pass's
     * `contrast tabs:` line is.
     */
    console.log(
        `  geometry: ${GEOMETRY_PASSES.length} passes in ${(geometryWallMs / 1000).toFixed(1)}s on ${tabs.length} tab(s) (${CONTRAST_TABS_WHY}) — ` +
            tabs
                .map((tab) => {
                    const canary = geometryCanary.filter((c) => c.readOn === tab.index);
                    return (
                        `tab ${tab.index} ${tab.geometry.length} passes, ${(tab.geometry.reduce((ms, at) => ms + at.ms, 0) / 1000).toFixed(1)}s` +
                        (canary.length === 0 ? '' : ` and ${canary.length} read again, ${(canary.reduce((ms, c) => ms + c.ms, 0) / 1000).toFixed(1)}s`)
                    );
                })
                .join('; '),
    );
    console.log(
        `    geometry passes: ` +
            GEOMETRY_PASSES.map((pass, n) => {
                const at = tabs[geometry.ranOn[n]].geometry.find((spent) => spent.key === pass.key);
                return `${pass.key} ${(at.ms / 1000).toFixed(1)}s (tab ${geometry.ranOn[n]})`;
            }).join(', '),
    );
    console.log(
        `    the-geometry-passes-read-the-same-on-every-tab: ` +
            (tabs.length === 1
                ? 'not asked — one tab'
                : `${geometryCanary.filter((c) => c.differ === undefined).length} of ${geometryCanary.length} pass(es) read again on another tab, the same verdict byte for byte: ` +
                  geometryCanary
                      .map((c) => `${c.key} (tab ${c.ranOn} → ${c.readOn}, ${(c.ms / 1000).toFixed(1)}s${c.differ === undefined ? '' : ', differs'})`)
                      .join(', ') +
                  (tabPrintFaults.length === 0
                      ? `; every tab's page after the walk the page before it (${Object.keys(printBefore ?? {}).join(', ')})`
                      : `; ${tabPrintFaults.length} of ${tabs.length} tab(s) on a page that is not the page before the walk`)),
    );
    console.log(
        `  1a (nothing-covers-money-or-a-protected-box), bound: what it read on each geometry pass, its failures in the pass's own list; ` +
            `coveredBy (asked amount is covered, you-pay figure is covered, and the unbuyable label's) bound beside it, its calls and time per phase`,
    );
    for (const { pass, byClass, ms, coveredBy, end, seek } of coverGeometry) for (const line of coverLines(pass, byClass, ms, coveredBy, end, seek)) console.log(line);
    console.log(
        `  1b (${REACH_CHECK}), bound: what it read on each geometry pass — a paint with no hit area (a box-shadow, an outline, a border image's outset, ` +
            `a text-shadow, a drop shadow or a blur, a decoration line, a look pseudo's region) reaching a money node's line boxes or a protected box; its failures in the pass's own list, ` +
            `the meets accepted by name (REACH_ACCEPTED) counted apart`,
    );
    for (const r of reachGeometry) for (const line of reachLines(r.pass, r)) console.log(line);
    console.log(
        `  3a (${WALK_CHECK}), report-only: the ground under a money figure's glyphs read to the stall on each geometry pass — a box that paints nothing skipped, ` +
            `a box above's gradients read, its pictures named — beside the bound read, which stops at the first opaque ground; it fails nothing`,
    );
    for (const r of walkGeometry) for (const line of walkLines(r.pass, r)) console.log(line);
    {
        /*
         * `holds-out-of-flow-agrees-with-this-chrome` (the tenth critic's item
         * 2): every geometry pass's page held 1b's containing-block list to
         * where this Chrome places an absolute and a fixed child. A
         * disagreement is already one of that pass's failures; a page that
         * read 1b and ran no check is a failure here, since 1b would then
         * read its out-of-flow boxes' clips on a list nothing held.
         */
        const unchecked = outOfFlowGeometry.filter((o) => o.check === undefined || typeof o.check.cases !== 'number' || o.check.cases === 0).map((o) => o.pass);
        const disagreed = outOfFlowGeometry.filter((o) => (o.check?.disagree?.length ?? 0) > 0);
        const ms = outOfFlowGeometry.reduce((n, o) => n + o.ms, 0);
        const first = outOfFlowGeometry.find((o) => o.check !== undefined)?.check;
        if (unchecked.length > 0) {
            failed = true;
            console.error(`✗ holds-out-of-flow-agrees-with-this-chrome: no check on the page of ${unchecked.join(', ')}`);
        }
        console.log(
            `    1b's containing blocks held to this Chrome (holds-out-of-flow-agrees-with-this-chrome): ` +
                (first === undefined
                    ? 'no page ran the check'
                    : `${first.cases} wrapper(s), each with an absolute and a fixed child, on ${outOfFlowGeometry.length - unchecked.length} page(s); ` +
                      `Chrome held ${first.held.absolute} absolute and ${first.held.fixed} fixed child(ren) a page; ` +
                      (disagreed.length === 0 ? 'holdsOutOfFlow agreed on every one' : `disagreed on ${disagreed.map((o) => `${o.pass} (${o.check.disagree.length})`).join(', ')}`)) +
                ` · ${ms.toFixed(1)}ms over the passes`,
        );
    }
    {
        // The blur policy's measurement: the most each soft paint reached over a target past its own box, over every pass.
        const soft = {};
        for (const r of reachGeometry) for (const [source, c] of Object.entries(r.soft)) soft[source] = Math.max(soft[source] ?? 0, c);
        const top = Object.entries(soft).sort((a, b) => b[1] - a[1]);
        console.log(
            `    the blur policy (a blurred tail counts at a composite of ${reachGeometry[0]?.policy ?? '?'} or more): the most each soft paint reached over a target past its own box, over every pass — ` +
                (top.length === 0 ? 'none came within reach of a target' : top.slice(0, 16).map(([source, c]) => `${source} ${c.toFixed(3)}`).join('; ')),
        );
        const literal = new Map();
        for (const r of reachGeometry) {
            for (const l of r.literal) {
                const key = l.replace(/^[^:]*: /, '').replace(/ at -?\d+,-?\d+ \(\d+x\d+\)/, '');
                literal.set(key, (literal.get(key) ?? 0) + 1);
            }
        }
        if (literal.size > 0) {
            console.log(`    what a blurred layer's offset and spread counted in full (the literal reading, not the policy) would add, by source, not counted:`);
            for (const [key, n] of [...literal].sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`      ${key} (×${n} kept)`);
        }
    }
    took();

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
    const contrastStartedAt = performance.now();
    // The contrast pass's viewports (`CONTRAST_PASS` in `probe-passes.mjs`).
    const CONTRAST_VIEWPORTS = CONTRAST_PASS.viewports;
    /*
     * Both contrast passes run on a page whose clock is fixed
     * (`FIXED_CLOCK`, shared with `looks-diff.mjs`): the pay fixtures stamp
     * their rate at load and a sheet prints it to the second, the quote's age
     * and the wall's freshness are read against "now", and the pay code turns
     * stale 120 s after that stamp. Installed here, on every tab the pass
     * drives, so the geometry passes above keep the real clock they were
     * written against.
     *
     * The page is focused whether or not its window is: `render.ts` focuses a
     * sheet's close and a face's back control, and `:focus-visible` paints a
     * ring only in a focused page. One headless window is focused already
     * (measured: `document.hasFocus()` true with and without this, and the
     * per-box dump identical, 4575 of 4575), and so, measured since (the
     * probe-shard critic), is a second window and a background tab; every
     * tab asks for it anyway, as a belt, and each page load is held to it
     * (`loadContrastPage`).
     */
    const readyTab = async (tabSession) => {
        await cdp.send('Page.enable', {}, tabSession);
        await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: FIXED_CLOCK }, tabSession);
        await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: true }, tabSession);
    };
    /*
     * The tabs the contrast pass walks its plan on are the geometry passes'
     * (`CONTRAST_TABS`, made before them): the first is the session the
     * transparency pass uses too, the rest are targets of the same Chrome,
     * each in a window of its own — by choice: measured (the critic,
     * 2026-10-06, Chrome 154 `--headless=new`), a background tab in one
     * window is visible too, runs its animation frames and answers a
     * capture as quickly, so the windows buy nothing that tabs would not;
     * the runs that proved the dumps identical used windows. Each tab has
     * its own page, viewport, emulated media and page age; nothing a job
     * reads or paints is another tab's.
     */
    for (const tab of tabs) {
        Object.assign(tab, { vp: undefined, loadedAt: 0, reducedNow: false, faces: [], refusals: [], jobs: 0, busyMs: 0, step: undefined });
        await readyTab(tab.sessionId);
    }
    watchedTabs = tabs;
    /*
     * And no page older than a minute: the rate stamp ages out at 120 s,
     * and a pay sheet arms a timer that repaints it then. A page is loaded
     * per viewport and again whenever it has lived longer than this.
     */
    const PAGE_MAX_AGE_MS = 60_000;
    // How long a freshly loaded page may take to answer its first capture
    // (`loadContrastPage`): a grown 1920 page answers in well under a second.
    const TAB_PAINT_CHECK_MS = 5_000;
    /*
     * The policy's refusals on every contrast page, asked before the page
     * is left and once more at the end: its jobs paint after the verdict
     * the page wrote, so the verdict's own list cannot carry them
     * (`the-probe-page-meets-no-csp-refusal`, `cspWatch.ts`). Kept per tab
     * and said tab by tab, so the order is not the order the tabs ran in.
     */
    const collectRefusals = async (tab) => {
        if (tab.loadedAt === 0) return;
        tab.refusals.push(...(await evalJson(cdp, tab.sessionId, 'window.__cspRefusals()')));
    };
    // One faces line per contrast page loaded, printed with the pass's verdict.
    const loadContrastPage = async (tab, vp, phase = 'load') => {
        await collectRefusals(tab);
        await timed(`${phase}: navigate`, () =>
            cdp.send('Page.navigate', { url: probeUrl(vp, '&screens=') }, tab.sessionId),
        );
        await timed(`${phase}: ready`, () => waitForFlag(cdp, tab.sessionId, '__probeReady'));
        tab.loadedAt = performance.now();
        // Every face loaded before the first job on this page
        // (`every-face-is-loaded-before-the-probe-measures`): a job paints
        // after the page's own wait, so one check per page covers its jobs.
        const echo = await evalJson(cdp, tab.sessionId, 'window.__faces ?? null');
        const faults = facesFaults(echo, DECLARED_FACES);
        if (faults.length > 0) {
            throw new Error(`the ${vp.name} page was not measured in its faces (${FACES_CHECK}): ${faults.join('; ')}`);
        }
        /*
         * Every tab's page paints as a visitor's would. Visible and focused —
         * a hidden page runs no animation frame, an unfocused one paints no
         * focus ring — a belt this headless Chrome has never tripped: every
         * tab reads visible and focused, in a window of its own or not, with
         * focus emulation off, and in a minimised window (measured
         * 2026-10-06). The minimised window is the failure that does happen:
         * its page stays visible, focused and running frames, and answers no
         * capture, so a job there sat out the 30 s CDP bound. So each page
         * is also asked for one capture, bounded short, before any job — the
         * check a minimised window turns red.
         */
        const shown = await evalJson(cdp, tab.sessionId, '[document.visibilityState, document.hasFocus()]');
        if (shown[0] !== 'visible' || shown[1] !== true) {
            throw new Error(`contrast tab ${tab.index}'s ${vp.name} page is ${shown[0]}${shown[1] ? '' : ' and unfocused'} — it would not paint as a visitor's does`);
        }
        await timed('paint check', async () => {
            try {
                await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true, optimizeForSpeed: true }, tab.sessionId, {
                    timeoutMs: TAB_PAINT_CHECK_MS,
                });
            } catch (err) {
                throw new Error(
                    `contrast tab ${tab.index}'s ${vp.name} page answered no capture within ${TAB_PAINT_CHECK_MS / 1000}s — its window paints nothing a job could read (${err.message})`,
                );
            }
        });
        tab.faces.push(facesLine(echo));
    };
    /*
     * A tab's page at a viewport, held to the plan: the screens the plan
     * walks at this width are the ones the page itself samples there.
     */
    const openViewport = async (tab, vp, plan) => {
        currentStep = `contrast: loading the ${vp.name} page on tab ${tab.index}`;
        tab.step = currentStep;
        await timed('metrics', () =>
            cdp.send(
                'Emulation.setDeviceMetricsOverride',
                { width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: false },
                tab.sessionId,
            ),
        );
        await loadContrastPage(tab, vp);
        tab.vp = vp;
        if (plan !== undefined) await holdScreensToPlan(tab, vp, plan);
    };
    const holdScreensToPlan = async (tab, vp, plan) => {
        const pageScreens = await timed('plan reads', () => evalJson(cdp, tab.sessionId, 'window.__contrastScreens'));
        const planScreens = [...new Set(plan.filter((j) => j.viewport === vp.name).map((j) => j.screen))];
        if (planScreens.join(',') !== pageScreens.join(',')) {
            throw new Error(
                `the plan's ${vp.name} screens are not the ones the page samples at ${vp.width}px: ` +
                    `plan ${planScreens.join(',')}; page ${pageScreens.join(',')}`,
            );
        }
    };
    // Jobs refused by their echo checks, one line each — said whatever else
    // the pass does, a pass that threw later included.
    const refused = [];
    // The least ring read per kind of outlined line (`ringRead`), printed
    // whatever the verdict.
    const ringKindsOut = new Map();
    // The prepared nodes that gave no box, summed by reason (step 5b).
    const skipTotals = new Map();
    // Visible text no contrast target reads, by element kind, and on how many jobs.
    const uncoveredKinds = new Map();
    // D4: the codes whose quiet zone was read (`pass/screen:name` → jobs),
    // the ones a job painted and could not read, and why.
    const codesRead = new Map();
    // The same reads per look's class (8e2): what a carried look owes by
    // name is read on its own jobs (`look-tallies.mjs`).
    const codesReadByClass = {};
    const codesUnread = new Map();
    let quietPixels = 0;
    // The codes read dark on a job's capture and white on a fresh pair (`readQuietZones`), said whatever the verdict.
    const quietReadAgain = [];
    // How many of those each tab read (`out.tab`), and of the canary's reads again: said and dumped with the run's tab count, since
    // the flake they are for is a capture's (the tenth critic's item 4: count sightings per tab count before 1d binds).
    const quietByTab = {};
    const canaryQuietByTab = {};
    // The same, on the jobs the cross-tab canary read again (the probe-shard
    // critic's N6): those reads are compared and never folded, so their
    // sightings were lost.
    const canaryQuietReadAgain = [];
    // 1d (before 8g2, bound since 7c; `code-modules.mjs`): every job's
    // module read folded — its failures fail the pass — and the canary's
    // reads again of it, said under the pass and never failed (the walk's
    // read of each job decides).
    const modulesRun = {
        byVpClass: {},
        stats: {},
        would: [],
        failures: [],
        readAgain: [],
        readAgainByTab: {},
        tabs: CONTRAST_TABS,
        faults: [],
        thrown: [],
        read: new Map(),
        readByClass: {},
        faultedByClass: {},
        uprightByClass: {},
        unread: new Map(),
        payloadChecked: 0,
        leastModule: Infinity,
    };
    // 1c(c) (report-only): every job's `digits`, folded (`char-read.mjs`'s `charReport` says it).
    const digitsRun = { byVpClass: {}, triggers: [], would: [], readAgain: [], faults: [], shares: {}, smallKinds: {}, movers: 0, elements: 0, triggerMs: 0, readMs: 0, frames: 0, shared: 0 };
    const canaryModules = { would: [], readAgain: [], readAgainByTab: {}, thrown: [] };
    // 1d's cut held to this Chrome (`the-module-read-agrees-with-this-chrome`): its readings, said with 1d's lines.
    let moduleSnapRead;
    // D14: the least the sign's name read per look and decoration state
    // (line read, or ring read where it wears the outline), and how the
    // name was painted where it was read (`nameChrome`).
    const nameLeast = new Map();
    const nameChromeSeen = new Set();
    // Line targets with no line rect on screen, per viewport (`LINE_SKIP_CEILING`):
    // the public run's jobs, and a carried private look's apart (8e2).
    const lineSkips = {};
    const privateLineSkips = {};
    try {
        let boxes = 0;
        // Jobs whose rain was sampled at its brightest drop, by key: the rule
        // owes the screens whose lines stand on the ground (`RAIN_REQUIRED`).
        let rainJobs = 0;
        const rainKeys = new Set();
        // Jobs whose Grid horizon was flattened to its brightest paint, by key
        // (`HORIZON_REQUIRED`).
        const horizonKeys = new Set();
        // Each sign line's least read per job at the horizon's worst, and
        // the lines that gave no sample there.
        const horizonWorst = new Map();
        const horizonUnread = [];
        // Jobs whose broken figures were read digit by digit, and how many
        // figures (`a-broken-figure-paints-every-digit`, round 3).
        const brokenKeys = new Set();
        let brokenFigures = 0;
        const brokenRoles = new Map();
        let brokenLeast = Infinity;
        const dim = [];
        // The ring read (`ringRead`): outlined targets read, ring pixels
        // read, and the least ring contrast per kind of line, for the report.
        let ringTargets = 0;
        let ringPixels = 0;
        let ringLeastPerChar = Infinity;
        // Outlined money figures ring-read, each on a job whose rain was at
        // its brightest (`an-outlined-money-figure-is-ring-read-at-its-worst`).
        let moneyRingRead = 0;
        // D6(i): jobs whose look pseudos were hidden and compared, and the
        // protected-box pixels compared.
        let lookPseudoJobs = 0;
        let shownApartJobs = 0;
        let lookPseudoPixels = 0;
        // 8f2: jobs whose shown marks were hidden and compared, and the jobs
        // read again with the look's file art failed, each per look class.
        let lookMarkJobs = 0;
        const lookMarkJobsByClass = {};
        let artOffJobs = 0;
        let artOffTargets = 0;
        const artOffJobsByClass = {};
        // The art-off frames read, by state and look class (`pending`,
        // `failed`): a carried look whose sheet names a file mask owes a
        // pending one, and the tracked fixture a failed one too.
        const artOffFrames = {};
        // Jobs with the aurora worn alone and its tide held at an end
        // (`the-aurora-is-read-at-both-ends-of-its-tide`, `TIDE_SCREENS`).
        let tideJobs = 0;
        let lineTargets = 0;
        const ringKinds = ringKindsOut;
        // Every class the prepares painted: each one must be a class this run
        // measures, and together they must be all of them.
        const contrastClasses = new Set();
        /*
         * The walk is the page's plan (`__contrastPlan()`, `contrastPlan.ts`),
         * read once: every job of every viewport, in order. The runner counts
         * each job as it is handed to a tab (`done`), and at the end every
         * planned job must have been handed out exactly once — a job that
         * fell out of the walk, or was handed out twice, fails the pass rather
         * than printing a smaller number. That the tab then ran it is the
         * answers' check: each job's answer must carry its own record, under
         * its own key (`unanswered`).
         */
        let plan;
        // The jobs that owe the rain and the horizon at their worst, by key.
        let owed;
        /*
         * The honest-display lines each sampled sheet screen owes, per
         * viewport (`__honestOwed()`, `layout/honestDisplay.ts`; 8e2,
         * CRITIC-STEP-8E2 item 11): every job of that screen and viewport
         * must READ each one — a line a look collapses or clips out of view
         * is a role owed and not read, never a skip that hides. The jobs
         * checked per screen and viewport, the reads per role, and the
         * honest lines in scope that were not rendered at a job's width.
         */
        let honestOwed;
        const honestJobs = new Map();
        const honestReads = new Map();
        let honestUnrendered = 0;
        /*
         * One job's answer folded into the pass's totals (`contrastJob`).
         * Called in plan order, it leaves every total exactly as the walk
         * left it when one tab ran the jobs one after another: a count is a
         * sum, a least a `Math.min`, a set a union, a list a concatenation,
         * and a map's keys land in the order their first job put them there
         * (a later job's value replaces an earlier one where the walk's did:
         * `codesUnread`). A job that never reached its body (its tab threw
         * opening a page) hands back nothing.
         */
        const sumInto = (into, from) => {
            for (const [key, n] of Object.entries(from)) into[key] = (into[key] ?? 0) + n;
        };
        const countInto = (into, from) => {
            for (const [key, n] of from) into.set(key, (into.get(key) ?? 0) + n);
        };
        const commitContrastJob = (out) => {
            if (out.dumpJobs === undefined) return;
            runDumpJobs.push(...out.dumpJobs);
            runDumpBoxes.push(...out.dumpBoxes);
            refused.push(...out.refused);
            dim.push(...out.dim);
            for (const cls of out.contrastClasses) contrastClasses.add(cls);
            tideJobs += out.tideJobs;
            rainJobs += out.rainJobs;
            for (const key of out.rainKeys) rainKeys.add(key);
            countInto(uncoveredKinds, out.uncoveredKinds);
            countInto(skipTotals, out.skipTotals);
            const skipsInto = (into, from) => {
                for (const [viewport, at] of Object.entries(from)) {
                    sumInto((into[viewport] ??= { 'clipped-away': 0, 'not-rendered': 0 }), at);
                }
            };
            skipsInto(lineSkips, out.lineSkips);
            for (const [cls, byViewport] of Object.entries(out.privateLineSkips)) {
                skipsInto((privateLineSkips[cls] ??= {}), byViewport);
            }
            boxes += out.boxes;
            lineTargets += out.lineTargets;
            for (const [at, least] of out.nameLeast) nameLeast.set(at, Math.min(nameLeast.get(at) ?? Infinity, least));
            for (const line of out.nameChromeSeen) nameChromeSeen.add(line);
            for (const [code, why] of out.codesUnread) codesUnread.set(code, why);
            countInto(codesRead, out.codesRead);
            for (const [cls, codes] of Object.entries(out.codesReadByClass)) {
                const into = (codesReadByClass[cls] ??= new Set());
                for (const code of codes) into.add(code);
            }
            quietPixels += out.quietPixels;
            quietReadAgain.push(...out.quietReadAgain);
            if (out.quietReadAgain.length > 0) quietByTab[out.tab] = (quietByTab[out.tab] ?? 0) + out.quietReadAgain.length;
            if (out.modules.readAgain.length > 0) modulesRun.readAgainByTab[out.tab] = (modulesRun.readAgainByTab[out.tab] ?? 0) + out.modules.readAgain.length;
            for (const [key, t] of Object.entries(out.modules.byVpClass)) {
                const into = (modulesRun.byVpClass[key] ??= { jobs: 0, codes: 0, modules: 0, wrong: 0, wouldCodes: 0, unread: 0 });
                for (const k of Object.keys(into)) into[k] += t[k];
            }
            for (const [key, st] of Object.entries(out.modules.stats)) foldStats((modulesRun.stats[key] ??= {}), st);
            modulesRun.would.push(...out.modules.would);
            modulesRun.failures.push(...out.modules.failures);
            modulesRun.readAgain.push(...out.modules.readAgain);
            modulesRun.faults.push(...out.modules.faults);
            modulesRun.thrown.push(...out.modules.thrown);
            countInto(modulesRun.read, out.modules.read);
            for (const key of ['readByClass', 'faultedByClass', 'uprightByClass']) {
                for (const [cls, codes] of Object.entries(out.modules[key])) {
                    const into = (modulesRun[key][cls] ??= new Set());
                    for (const code of codes) into.add(code);
                }
            }
            for (const [code, why] of out.modules.unread) modulesRun.unread.set(code, why);
            modulesRun.payloadChecked += out.modules.payloadChecked;
            modulesRun.leastModule = Math.min(modulesRun.leastModule, out.modules.leastModule);
            for (const [key, t] of Object.entries(out.digits.byVpClass)) {
                const into = (digitsRun.byVpClass[key] ??= { jobs: 0, triggered: 0, by1a: 0, chars: 0, held: 0, small: 0, skipped: 0, would: 0, readAgain: 0 });
                for (const k of Object.keys(into)) into[k] += t[k];
            }
            for (const key of ['triggers', 'would', 'readAgain', 'faults']) digitsRun[key].push(...out.digits[key]);
            for (const [key, byKind] of Object.entries(out.digits.shares)) mergeShares((digitsRun.shares[key] ??= {}), byKind);
            for (const [kind, n] of Object.entries(out.digits.smallKinds)) digitsRun.smallKinds[kind] = (digitsRun.smallKinds[kind] ?? 0) + n;
            for (const key of ['movers', 'elements', 'triggerMs', 'readMs', 'frames', 'shared']) digitsRun[key] += out.digits[key];
            ringTargets += out.ringTargets;
            ringPixels += out.ringPixels;
            ringLeastPerChar = Math.min(ringLeastPerChar, out.ringLeastPerChar);
            moneyRingRead += out.moneyRingRead;
            for (const [sel, kind] of out.ringKinds) {
                const into = ringKinds.get(sel);
                if (into === undefined) {
                    ringKinds.set(sel, { ...kind });
                } else {
                    into.n += kind.n;
                    into.least = Math.min(into.least, kind.least);
                    into.rim = Math.min(into.rim, kind.rim);
                }
            }
            for (const key of out.horizonKeys) horizonKeys.add(key);
            for (const key of out.brokenKeys) brokenKeys.add(key);
            brokenFigures += out.brokenFigures;
            for (const [key, roles] of out.brokenRoles) brokenRoles.set(key, new Set([...(brokenRoles.get(key) ?? []), ...roles]));
            if (out.brokenLeast < brokenLeast) brokenLeast = out.brokenLeast;
            for (const [part, byJob] of out.horizonWorst) {
                const into = horizonWorst.get(part) ?? new Map();
                for (const [key, least] of byJob) into.set(key, Math.min(into.get(key) ?? Infinity, least));
                horizonWorst.set(part, into);
            }
            horizonUnread.push(...out.horizonUnread);
            lookPseudoPixels += out.lookPseudoPixels;
            lookPseudoJobs += out.lookPseudoJobs;
            shownApartJobs += out.shownApartJobs;
            if (out.cover !== undefined) {
                const into = (coverContrast[out.cover.cls] ??= Object.fromEntries(COVER_TALLY_KEYS.map((key) => [key, 0])));
                into.paints += 1;
                for (const key of COVER_TALLY_KEYS) if (key !== 'paints' && key !== 'failed') into[key] += out.cover[key];
                into.failed += out.cover.faults.length;
                coverFailed.push(...out.cover.faults);
            } else if ((out.dumpJobs ?? []).some((record) => record.refused === undefined)) {
                // Every job not refused owes its read (7a): one that ended
                // without it read nothing a verdict can stand on.
                coverUnread.push(out.dumpJobs.find((record) => record.refused === undefined).key);
            }
            lookMarkJobs += out.lookMarkJobs;
            sumInto(lookMarkJobsByClass, out.lookMarkJobsByClass);
            for (const [state, byClass] of Object.entries(out.artOffFrames)) sumInto((artOffFrames[state] ??= {}), byClass);
            artOffTargets += out.artOffTargets;
            artOffJobs += out.artOffJobs;
            sumInto(artOffJobsByClass, out.artOffJobsByClass);
            honestUnrendered += out.honestUnrendered;
            countInto(honestReads, out.honestReads);
            countInto(honestJobs, out.honestJobs);
        };
        const done = new Map();
        /*
         * Every tab opens the first viewport's page at once, and the plan
         * is read from the first tab's. Every open is settled before a
         * failure is said: no tab is left loading behind the pass's error.
         */
        for (const opened of await Promise.allSettled(tabs.map((tab) => openViewport(tab, CONTRAST_VIEWPORTS[0])))) {
            if (opened.status === 'rejected') throw opened.reason;
        }
        await timed('plan reads', async () => {
            plan ??= await evalJson(cdp, sessionId, 'window.__contrastPlan()');
            owed ??= await evalJson(cdp, sessionId, 'window.__contrastOwed()');
            honestOwed ??= await evalJson(cdp, sessionId, 'window.__honestOwed()');
        });
        for (const vp of CONTRAST_VIEWPORTS) {
            // The plan's viewport is this one.
            const planned = plan.find((j) => j.viewport === vp.name);
            if (planned !== undefined && (planned.width !== vp.width || planned.height !== vp.height)) {
                throw new Error(
                    `the plan's ${vp.name} is ${planned.width}x${planned.height}, this run's ${vp.width}x${vp.height}`,
                );
            }
        }
        for (const tab of tabs) await holdScreensToPlan(tab, CONTRAST_VIEWPORTS[0], plan);
        /*
         * The staged address screens are planned for the looks whose sheet
         * names `[data-copied]`: the page's reading of its loaded stylesheets,
         * the plan's jobs and the served sheets' text (`NAMES_COPIED`) must
         * name the same looks, or a CSSOM that serialised a selector another
         * way would plan nothing and read green over it.
         */
        {
            const copiedScreens = await evalJson(cdp, sessionId, 'window.__copiedScreens');
            const planned = [...new Set(plan.filter((job) => copiedScreens.includes(job.screen)).map((job) => job.sheetClass))].sort();
            const pageNames = await evalJson(cdp, sessionId, 'window.__namesCopied()');
            if (pageNames.join(' ') !== NAMES_COPIED.join(' ') || planned.join(' ') !== NAMES_COPIED.join(' ')) {
                throw new Error(
                    `the-plan-follows-the-sheets-that-name-data-copied: the served sheets name it on [${NAMES_COPIED.join(', ')}], the page reads it on [${pageNames.join(', ')}] and the plan samples ${copiedScreens.join(' and ')} for [${planned.join(', ')}]`,
                );
            }
        }
        /*
         * The walk, on every tab at once (`CONTRAST_TABS`). The jobs are
         * handed out one at a time in plan order — viewport by viewport, as
         * the plan lists them — to whichever tab is free; a tab whose next
         * job is at another viewport opens that viewport's page first, and
         * one whose page is past its age loads it again. A job reads and
         * paints its own tab's page and nothing else, and hands back what it
         * found (`contrastJob`); the totals are folded from those answers in
         * plan order once every tab has stopped, so a green run says and
         * dumps the same thing whichever tab ran which job
         * (`commitContrastJob`), and which tab ran each is written beside the
         * dump (`meta.ranOn`). The first tab to throw stops the hand-out; the
         * others finish the job they hold, the throw of the earliest job in
         * the plan is the pass's, and only the jobs before it in the plan are
         * folded — the same jobs at any tab count.
         */
        const viewportNamed = new Map(CONTRAST_VIEWPORTS.map((vp) => [vp.name, vp]));
        const queue = CONTRAST_VIEWPORTS.flatMap((vp) => plan.filter((planned) => planned.viewport === vp.name));
        const answers = new Array(queue.length);
        const ranOn = new Array(queue.length);
        let handedOut = 0;
        let fault;
        // A tab's page at the job's viewport and under its age, then the job.
        const runOn = async (tab, plannedJob, out) => {
            const vp = viewportNamed.get(plannedJob.viewport);
            if (tab.vp !== vp) {
                await openViewport(tab, vp, plan);
            } else if (performance.now() - tab.loadedAt > PAGE_MAX_AGE_MS) {
                await loadContrastPage(tab, vp, 'reload');
            }
            await contrastJob(tab, vp, plannedJob, honestOwed, out);
        };
        const walkTab = async (tab) => {
            while (fault === undefined && handedOut < queue.length) {
                const n = handedOut;
                handedOut += 1;
                const plannedJob = queue[n];
                done.set(plannedJob.key, (done.get(plannedJob.key) ?? 0) + 1);
                const out = {};
                answers[n] = out;
                ranOn[n] = tab.index;
                const started = performance.now();
                try {
                    await runOn(tab, plannedJob, out);
                } catch (err) {
                    if (fault === undefined || n < fault.n) fault = { n, key: plannedJob.key, tab: tab.index, err };
                } finally {
                    tab.jobs += 1;
                    tab.busyMs += performance.now() - started;
                }
            }
            tab.step = 'the end of the walk';
        };
        await Promise.all(tabs.map(walkTab));
        const folded = fault === undefined ? queue.length : fault.n;
        for (let n = 0; n < folded; n += 1) commitContrastJob(answers[n]);
        contrastRun.ranOn = Object.fromEntries(queue.slice(0, folded).map((j, n) => [j.key, ranOn[n]]));
        if (fault !== undefined) {
            const later = answers.filter((out, n) => n > fault.n && out !== undefined).length;
            if (later > 0) {
                console.error(`    ${later} job(s) after it in the plan ran on other tabs before the hand-out stopped, and are not reported`);
            }
            currentStep = `contrast job ${fault.key} on tab ${fault.tab}`;
            throw fault.err;
        }
        /*
         * Every job handed out came back with its own record, under its own
         * key: a tab that took a job and never ran it — or answered another
         * job's — would otherwise count as done (`done` counts hand-outs).
         */
        currentStep = 'contrast: the answers';
        const keyOf = (planned) =>
            jobKey({
                pass: 'contrast',
                viewport: planned.viewport,
                screen: planned.screen,
                look: planned.look,
                flags: planned.flags,
                reduced: planned.reduced === true ? true : undefined,
                tide: planned.tide,
            });
        const unanswered = queue
            .filter((planned, n) => !(answers[n]?.dumpJobs?.length === 1 && answers[n].dumpJobs[0].key === keyOf(planned)))
            .map((j) => j.key);
        if (unanswered.length > 0) {
            throw new Error(`${unanswered.length} job(s) handed to a tab came back with no record of their own: ${unanswered.join(', ')}`);
        }
        /*
         * `the-contrast-pass-reads-the-same-on-every-tab` (the critic's P2-1):
         * the fold proves nothing about the answers it folds — that a job
         * reads the same whichever tab ran it, after whatever that tab ran
         * before, is the jobs' hermeticity, and this holds it on every run
         * with more than one tab. A handful of jobs are read again on a tab
         * other than the one that ran them — the first job of each viewport,
         * the first read at Grid horizon's worst, the first that hid a look's
         * marks or read its file art away, and the one holding the least box
         * — and each must hand back the same record and the same boxes, byte
         * for byte, or the pass fails naming the job and both tabs. The
         * answers read again are compared and never folded.
         */
        const canaryFaults = [];
        if (tabs.length > 1) {
            currentStep = 'contrast: the cross-tab canary';
            const picks = new Map();
            const pick = (n, why) => {
                if (n >= 0 && !picks.has(n)) picks.set(n, why);
            };
            for (const vp of CONTRAST_VIEWPORTS) pick(queue.findIndex((j) => j.viewport === vp.name), `the first ${vp.name} job`);
            pick(answers.findIndex((out) => out.horizonKeys.size > 0), "the first read at Grid horizon's worst");
            pick(
                answers.findIndex((out) => (out.dumpJobs[0].lookPseudos?.marks ?? 0) > 0 && out.dumpJobs[0].artOff !== undefined),
                "the first with a look's marks hidden and its file art read away",
            );
            let least;
            answers.forEach((out, n) => {
                for (const box of out.dumpBoxes) {
                    if (typeof box.worst === 'number' && (least === undefined || box.worst < least.worst)) least = { n, worst: box.worst };
                }
            });
            if (least !== undefined) pick(least.n, `the job holding the least box (${least.worst.toFixed(3)}:1)`);
            // Each pick on the next tab round from the one that ran it, the
            // tabs at once, each walking its picks from the last viewport
            // back (where the walk left it).
            const byTab = new Map(tabs.map((tab) => [tab, []]));
            for (const n of picks.keys()) byTab.get(tabs[(ranOn[n] + 1) % tabs.length]).push(n);
            const viewportAt = (n) => CONTRAST_VIEWPORTS.findIndex((vp) => vp.name === queue[n].viewport);
            const readAgain = new Map();
            const settled = await Promise.allSettled(
                [...byTab].map(async ([tab, ns]) => {
                    for (const n of ns.sort((a, b) => viewportAt(b) - viewportAt(a) || a - b)) {
                        const again = {};
                        readAgain.set(n, { tab: tab.index, again });
                        await runOn(tab, queue[n], again);
                    }
                    tab.step = 'the end of the canary';
                }),
            );
            for (const result of settled) {
                if (result.status === 'rejected') throw result.reason;
            }
            const boxesOf = (out) => new Map(out.dumpBoxes.map((box) => [box.key, JSON.stringify(box)]));
            contrastRun.canary = [...picks].sort(([a], [b]) => a - b).map(([n, why]) => {
                const { tab, again } = readAgain.get(n);
                for (const line of again.quietReadAgain ?? []) canaryQuietReadAgain.push(`(the canary's read of ${queue[n].key} on tab ${tab}) ${line}`);
                for (const line of again.modules?.readAgain ?? []) canaryModules.readAgain.push(`(the canary's read of ${queue[n].key} on tab ${tab}) ${line}`);
                if ((again.quietReadAgain?.length ?? 0) > 0) canaryQuietByTab[tab] = (canaryQuietByTab[tab] ?? 0) + again.quietReadAgain.length;
                if ((again.modules?.readAgain?.length ?? 0) > 0) canaryModules.readAgainByTab[tab] = (canaryModules.readAgainByTab[tab] ?? 0) + again.modules.readAgain.length;
                for (const line of again.modules?.would ?? []) canaryModules.would.push(`(the canary's read of ${queue[n].key} on tab ${tab}) ${line}`);
                for (const line of again.modules?.thrown ?? []) canaryModules.thrown.push(`(the canary's read of ${queue[n].key} on tab ${tab}) ${line}`);
                const sameRecord = JSON.stringify(again.dumpJobs) === JSON.stringify(answers[n].dumpJobs);
                const sameBoxes = JSON.stringify(again.dumpBoxes) === JSON.stringify(answers[n].dumpBoxes);
                const said = { key: queue[n].key, why, ranOn: ranOn[n], readOn: tab, same: sameRecord && sameBoxes };
                if (!said.same) {
                    const before = boxesOf(answers[n]);
                    const after = boxesOf(again);
                    const differ = [...new Set([...before.keys(), ...after.keys()])].filter((key) => before.get(key) !== after.get(key));
                    said.boxesDiffer = differ.length;
                    canaryFaults.push(
                        `the-contrast-pass-reads-the-same-on-every-tab: ${queue[n].key} (${why}) ran on tab ${ranOn[n]} and read again on tab ${tab}: ` +
                            (sameRecord ? '' : 'its record differs; ') +
                            `${differ.length} of ${before.size} box(es) differ` +
                            (differ.length === 0 ? '' : ` (the first: ${differ[0]} — ${before.get(differ[0]) ?? 'absent'} → ${after.get(differ[0]) ?? 'absent'})`),
                    );
                }
                return said;
            });
        }
        for (const tab of tabs) {
            if (tab.reducedNow) {
                await cdp.send('Emulation.setEmulatedMedia', { features: [] }, tab.sessionId);
                tab.reducedNow = false;
            }
        }
        /*
         * **`the-module-read-agrees-with-this-chrome`** (the tenth critic's
         * item 1, decided by the window): 1d's cut held to the Chrome this run
         * measures in. Once a run, on the first tab and after the walk and its
         * canary, the page draws a sheet of codes with `qrSvg` at fractional
         * module sizes under the cut and over it, each at seven sub-pixel
         * offsets (`__moduleSnap`), on a white ground over everything at DPR 1,
         * and the sheet is captured as a job is and read by 1d's own reader
         * (`moduleSnapVerdict`): every code under `MODULE_MIN_PX` refused,
         * every code from it up read right on every centre. A disagreement is
         * read again once on a fresh capture after 250ms, the quiet zone's
         * flake in mind, and believed only when the fresh capture reads every
         * code as the cut says; otherwise the run fails, with both readings.
         * It fails the run as 1d's own failures do: it holds the instrument,
         * not a look.
         */
        currentStep = 'contrast: 1d held to this Chrome';
        const moduleSnap = await timed('module snap', async () => {
            const tab = tabs[0];
            await cdp.send(
                'Emulation.setDeviceMetricsOverride',
                { width: MODULE_SNAP_VIEWPORT.width, height: MODULE_SNAP_VIEWPORT.height, deviceScaleFactor: 1, mobile: false },
                tab.sessionId,
            );
            // Its page is at another size now: a later job on this tab would reopen its viewport.
            tab.vp = undefined;
            let sheet;
            const read = async () => {
                const img = await captureShot(cdp, tab.sessionId);
                const zones = await evalJson(cdp, tab.sessionId, 'window.__quietZones()');
                const matrices = await evalJson(cdp, tab.sessionId, 'window.__codeMatrices()');
                const verdict = moduleSnapVerdict(img, withMatrices(zones, matrices));
                if (sheet.bottom > MODULE_SNAP_VIEWPORT.height) verdict.faults.unshift(`the sheet reaches ${sheet.bottom}px down a ${MODULE_SNAP_VIEWPORT.height}px viewport`);
                if (zones.length !== sheet.codes) verdict.faults.unshift(`the sheet drew ${sheet.codes} codes and the page read ${zones.length}`);
                return verdict;
            };
            // A page that throws drawing or reading the sheet is a disagreement, said as one, never a pass that stops (the eleventh critic's P3: the draw stood outside the guard).
            const threw = (err, doing = 'reading') => ({ codes: 0, under: 0, over: 0, centres: 0, below: { codes: 0, centres: 0, wrong: 0 }, faults: [`the page threw ${doing} the sheet: ${String(err?.message ?? err).slice(0, 200)}`] });
            const readOrSay = async () => {
                try {
                    return await read();
                } catch (err) {
                    return threw(err);
                }
            };
            const drawAndRead = async () => {
                try {
                    sheet = await evalJson(cdp, tab.sessionId, 'window.__moduleSnap(true)');
                } catch (err) {
                    return { first: threw(err, 'drawing') };
                }
                const first = await readOrSay();
                if (first.faults.length === 0) return { first };
                await sleep(250);
                return { first, again: await readOrSay() };
            };
            let out;
            try {
                out = await drawAndRead();
            } finally {
                try {
                    await evalJson(cdp, tab.sessionId, 'window.__moduleSnap(false)');
                } catch (err) {
                    // Said on the reading that decides, so it fails the run as a disagreement does.
                    if (out !== undefined) (out.again ?? out.first).faults.push(`the page threw taking the sheet away: ${String(err?.message ?? err).slice(0, 200)}`);
                }
            }
            return out;
        });
        moduleSnapRead = moduleSnap;
        currentStep = 'contrast: the verdict';
        const planKeys = new Set(plan.map((j) => j.key));
        const missing = plan.filter((j) => !done.has(j.key)).map((j) => j.key);
        const twice = [...done].filter(([, n]) => n !== 1).map(([key, n]) => `${key} (${n}x)`);
        const stray = [...done.keys()].filter((key) => !planKeys.has(key));
        const walkOk = missing.length + twice.length + stray.length === 0;
        if (!walkOk) {
            failed = true;
            console.error(
                `✗ contrast: the walk did not do every planned job exactly once ` +
                    `(${plan.length} planned, ${done.size} done; ${boxes} boxes sampled; ${took()}) —` +
                    (missing.length === 0 ? '' : ` never done: ${missing.join(', ')};`) +
                    (twice.length === 0 ? '' : ` done more than once: ${twice.join(', ')};`) +
                    (stray.length === 0 ? '' : ` not in the plan: ${stray.join(', ')};`),
            );
        }
        // Every rule that failed says so, one line each: a run that fails
        // for one reason still names the others (round 8 — a missing rain
        // key used to hide the figures under the floor).
        const verdicts = [...canaryFaults];
        {
            const decided = moduleSnap.again ?? moduleSnap.first;
            for (const fault of decided.faults) verdicts.push(`the-module-read-agrees-with-this-chrome: ${fault}`);
        }
        // A refusal is said once, with how many times the pages met it: a
        // page-level one is met on every page every tab loads.
        for (const tab of tabs) await collectRefusals(tab);
        const refusalsMet = new Map();
        for (const r of tabs.flatMap((tab) => tab.refusals)) {
            const line = `the-probe-page-meets-no-csp-refusal: ${r.directive} refused ${r.blocked || '(inline)'}${r.source === '' ? '' : ` at ${r.source}`}`;
            refusalsMet.set(line, (refusalsMet.get(line) ?? 0) + 1);
        }
        for (const [line, n] of [...refusalsMet].sort(([a], [b]) => a.localeCompare(b))) {
            verdicts.push(n === 1 ? line : `${line} (${n} times)`);
        }
        if (boxes === 0) {
            verdicts.push('no figure boxes were sampled — vacuous green.');
        }
        // A target in a frame turned 45° or more that the sampler cannot read
        // (round 4, the critic's P3-1): said, never a thrown page.
        if ((skipTotals.get('turned-too-far') ?? 0) > 0) {
            verdicts.push(
                `${skipTotals.get('turned-too-far')} contrast target(s) stand in a frame turned 45° or more, whose lines the sampler cannot solve from their bounds`,
            );
        }
        if (sheetClassesWrong([...contrastClasses]) !== undefined) {
            verdicts.push(sheetClassesWrong([...contrastClasses]));
        }
        // Every run owes what its measured looks carry (`contrastOwed`): a
        // look that wears the rain owes it flattened on the screens whose
        // lines stand on the ground — named, so a door mini flattened alone
        // can never stand in for them (the critic's third pass) — and one
        // that wears the horizon owes it read at its worst. The shipped run
        // also owes the job each of the owner's horizon numbers was read on,
        // and owes the rain somewhere at all.
        // The page's answer is held against what the geometry passes wore,
        // on every run (`owed-follows-what-a-pass-wore`): a malformed answer,
        // or a decoration worn and owed on no job, fails rather than owing
        // nothing.
        for (const fault of owedFaults(owed, [...wornClassesSeen])) verdicts.push(fault);
        // The honest-display lines (8e2): the page owes some, and every
        // screen and width that owes them was sampled — a sheet screen moved
        // to the geometry-only list would otherwise owe its lines to no job.
        const honestScreens = Object.entries(honestOwed ?? {});
        if (honestScreens.length === 0) {
            verdicts.push('the page owes no honest-display line (__honestOwed) — the four money sheets carry them by role');
        }
        for (const [screen, byViewport] of honestScreens) {
            for (const [viewport, roles] of Object.entries(byViewport)) {
                const planned = plan.filter((j) => j.screen === screen && j.viewport === viewport).length;
                const checked = honestJobs.get(`${screen}|${viewport}`) ?? 0;
                if (planned === 0 || checked === 0) {
                    verdicts.push(
                        `${screen} @${viewport} owes ${roles.length} honest-display line(s) and ${planned === 0 ? 'is in no contrast job' : 'no job of it was checked'} ` +
                            `(the-honest-display-sentences-are-read, layout/honestDisplay.ts)`,
                    );
                }
            }
        }
        const RAIN_REQUIRED = Array.isArray(owed?.rain) ? owed.rain : [];
        // A shipped run owes the horizon's worst on the owner's three jobs
        // (`HORIZON_PINNED_JOBS`), which it reads alone; a kit run owes it on
        // every job the page names.
        const HORIZON_REQUIRED = LOOKS === 'shipped' ? [...HORIZON_PINNED_JOBS] : [...new Set(Array.isArray(owed?.horizon) ? owed.horizon : [])];
        if (LOOKS === 'shipped' && (RAIN_REQUIRED.length === 0 || (owed?.horizon ?? []).length === 0)) {
            verdicts.push(
                `the page owes the rain on ${RAIN_REQUIRED.length} and the horizon on ${(owed?.horizon ?? []).length} job(s) — a shipped run measures Neo, which carries both (__contrastOwed)`,
            );
        }
        if (RAIN_REQUIRED.some((key) => !rainKeys.has(key))) {
            // A run that did not flatten the rain on the screens whose lines
            // stand on the ground read the moving decoration at one instant
            // again, or not at all.
            verdicts.push(
                `a-line-on-the-ground-reads-wherever-a-drop-falls had the rain at its brightest on ${rainJobs} job(s) but not on ${RAIN_REQUIRED.filter((key) => !rainKeys.has(key)).join(', ')}`,
            );
        }
        if (horizonUnread.length > 0) {
            verdicts.push(`${horizonUnread.length} sign line(s) at Grid horizon's worst gave no sample: ${horizonUnread.join(', ')}`);
        }
        if (LOOKS === 'shipped') {
            // At the horizon's worst, held to the owner's numbers
            // (`horizonWorstVerdict`): the job each was read on is owed and
            // must read it again, and no other job is read. They are Neo's
            // as shipped; a kit look's are printed and not pinned.
            for (const line of horizonWorstVerdict(horizonWorst)) verdicts.push(line);
        }
        if (horizonWorst.size > 0) {
            const said = [...horizonWorst].map(([part, byJob]) => {
                const [job, least] = [...byJob].sort((a, b) => a[1] - b[1])[0];
                const pinned = LOOKS === 'shipped' ? `; pinned ${HORIZON_WORST[part]?.least.toFixed(2)} on ${HORIZON_WORST[part]?.job}` : '';
                return `${part} ${least.toFixed(4)} (${job}${pinned})`;
            });
            console.log(`  Grid horizon at its worst, least per sign line (a known limit, the owner's C, 2026-09-27): ${said.join('; ')}`);
        }
        // Every job of every broken-figure screen read the figures it owes,
        // digit by digit (round 3, the critic's P2-1; every surface since
        // round 4, P2-2): a screen that stopped breaking its figure, or a
        // read that stopped finding one, is a gap.
        const brokenGaps = [];
        for (const [screen, roles] of Object.entries(BROKEN_FIGURE_SCREENS)) {
            const jobs = plan.filter((job) => job.screen === screen);
            if (jobs.length === 0) {
                brokenGaps.push(`any job of ${screen}`);
            }
            for (const job of jobs) {
                const read = brokenRoles.get(job.key) ?? new Set();
                const missing = roles.filter((role) => !read.has(role));
                if (missing.length > 0) brokenGaps.push(`${job.key} (${missing.join(', ')})`);
            }
        }
        if (brokenGaps.length > 0) {
            verdicts.push(
                `a-broken-figure-paints-every-digit read broken figures on ${brokenKeys.size} job(s) but not on ${brokenGaps.join(', ')}`,
            );
        }
        if (HORIZON_REQUIRED.some((key) => !horizonKeys.has(key))) {
            verdicts.push(
                `the sign's lines over Grid horizon were read at its worst on ${horizonKeys.size} job(s) but not on ${HORIZON_REQUIRED.filter((key) => !horizonKeys.has(key)).join(', ')}`,
            );
        }
        const unread = [...outlinedTargetsSeen].filter((kind) => !ringKinds.has(kind));
        if (unread.length > 0) {
            // Every target an outlined line stands in was read in its ring
            // somewhere, or the outline on it is one nobody reads: a screen
            // no rain job samples paints it (`RAIN_JOBS`).
            verdicts.push(`an outline nobody reads — outlined on a screen the pass paints and never ring-read: ${unread.join(', ')}`);
        }
        if (LOOKS === 'shipped') {
            for (const [viewport, ceiling] of Object.entries(LINE_SKIP_CEILING)) {
                for (const [why, most] of Object.entries(ceiling)) {
                    const n = lineSkips[viewport]?.[why] ?? 0;
                    if (n > most) {
                        verdicts.push(
                            `${n} line target(s) ${why} at ${viewport}, over the ${most} measured when step 5b landed — a line clipped out of view reads green unless this is held (LINE_SKIP_CEILING)`,
                        );
                    } else if (n < most) {
                        console.log(`  ${viewport}: ${n} line target(s) ${why}, under the ${most} LINE_SKIP_CEILING holds — lower it`);
                    }
                }
            }
        }
        if (LOOKS === 'shipped' && lookPseudoJobs === 0) {
            // Neo's sheet generates pseudos on every screen with a heading or
            // a Wearing line: a shipped run that compared no frame proved
            // nothing.
            verdicts.push('no-look-pseudo-paints-inside-a-protected-box compared no frame — vacuous green');
        }
        /*
         * The two 8f2 frames owe their subject on every look that has one
         * (the 8f2 critic's P3-8): a look whose geometry passes showed a mark
         * owes a mark-hide frame, and a carried look whose sheet names a file
         * in a mask or clip property (`CARRIED_FILE_ART`, read from the sheet
         * itself — a computed miss in `markFileArt` must not read as nothing
         * to fail) owes a pending art-off frame. The tracked fixture paints a
         * mixed mask stack, so it owes a failed frame too: the failed state's
         * one committed subject.
         */
        for (const cls of marksShownSeen) {
            if (!((lookMarkJobsByClass[cls] ?? 0) > 0)) {
                verdicts.push(`no-look-mark-paints-inside-a-protected-box hid no mark on a ${cls} job, and ${cls} shows marks — vacuous green`);
            }
        }
        for (const cls of CARRIED_FILE_ART) {
            if (!(((artOffFrames.pending ?? {})[cls] ?? 0) > 0)) {
                verdicts.push(`a-word-reads-when-the-art-does-not-load read no ${cls} job with its file art pending, and its sheet names a file mask — vacuous green`);
            }
        }
        if (PRIVATE_SHEET_CLASSES.includes(TRACKED_FIXTURE_CLASS) && !(((artOffFrames.failed ?? {})[TRACKED_FIXTURE_CLASS] ?? 0) > 0)) {
            verdicts.push(`a-word-reads-when-the-art-does-not-load read no ${TRACKED_FIXTURE_CLASS} job with its file art failed — its mixed stack is the failed state's subject`);
        }
        if (tideJobs !== plan.filter((j) => j.tide !== undefined).length) {
            // Every planned tide job held the tide (a job that did not is
            // refused by its echo); a count that differs is a walk that lost
            // some, said by name.
            verdicts.push(`the-aurora-is-read-at-both-ends-of-its-tide held the tide on ${tideJobs} of ${plan.filter((j) => j.tide !== undefined).length} planned job(s)`);
        }
        if (LOOKS === 'shipped' && plan.every((j) => j.tide === undefined)) {
            verdicts.push('the-aurora-is-read-at-both-ends-of-its-tide: the plan holds no tide job — vacuous green');
        }
        if ((LOOKS === 'shipped' || RAIN_REQUIRED.length > 0) && moneyRingRead === 0) {
            // The Activity fold's receipt amount is outlined wherever the
            // rain is worn: a run that owed the rain and ring-read no money
            // figure proved the rule over nothing.
            verdicts.push('an-outlined-money-figure-is-ring-read-at-its-worst read no outlined money figure — vacuous green');
        }
        if (codesRead.size === 0) {
            verdicts.push('a-code-keeps-its-quiet-zone-white read no code — vacuous green');
        }
        {
            // The codes a buyer pays by are owed by name (the critic, step
            // 5a″ item 7): a fixture that stopped painting one would leave
            // the rule green over the rest.
            // Read on the public looks' own jobs (8e2): a carried look's codes
            // are its own to owe (`look-tallies.mjs`), and never stand in.
            // On the kit's probe (`--looks workshop`), the kit's look's jobs
            // owe them the same (the thirteenth review, the owner's
            // D-2026-10-29-01: until then the kit owed no code by name, and a
            // turn of 0.01° took every pay code out of both reads, KQT).
            const publicCodes = new Set(
                Object.entries(codesReadByClass)
                    .filter(([cls]) => !PRIVATE_SHEET_CLASSES.includes(cls))
                    .flatMap(([, codes]) => [...codes]),
            );
            const unreadCodes = CODES_REQUIRED.filter((code) => !publicCodes.has(code));
            if (unreadCodes.length > 0) {
                verdicts.push(`a-code-keeps-its-quiet-zone-white read no quiet zone on ${unreadCodes.join(', ')}`);
            }
            // 1d owes the same codes by name on the public looks' own jobs (7c).
            const publicModules = new Set(
                Object.entries(modulesRun.readByClass)
                    .filter(([cls]) => !PRIVATE_SHEET_CLASSES.includes(cls))
                    .flatMap(([, codes]) => [...codes]),
            );
            const unreadModules = CODES_REQUIRED.filter((code) => !publicModules.has(code));
            if (unreadModules.length > 0) verdicts.push(`${MODULE_CHECK} read no module of ${unreadModules.join(', ')}`);
        }
        /*
         * 1d once a contrast job (7c): every failure fails the pass; and on
         * every look, every code whose quiet zone was read on its jobs has its
         * modules read there too — save one it failed closed on, a failure
         * already (a code not read whole, every centre on screen inside its
         * clips, is one since the thirteenth review's item 8). A code in a
         * turned frame is read upright by both, every transform above it held
         * off (B1), and is said by name in 1d's lines below (`moduleReport`).
         */
        if (modulesRun.failures.length > 0) verdicts.push(`${modulesRun.failures.length} failure(s) of ${MODULE_CHECK}`);
        for (const [cls, codes] of Object.entries(codesReadByClass)) {
            const owed = [...codes]
                .filter((code) => !['readByClass', 'faultedByClass'].some((key) => modulesRun[key][cls]?.has(code) ?? false))
                .sort();
            if (owed.length > 0) verdicts.push(`${MODULE_CHECK} read no module centre of ${owed.join(', ')} on a ${cls} stall, where its quiet zone was read`);
        }
        /*
         * 1a once a contrast job (7a): every failure fails the pass; every
         * job not refused owes its read; and its points are held to the clip
         * ceiling, the public looks' here and each carried look's below.
         */
        if (coverFailed.length > 0) {
            verdicts.push(`${coverFailed.length} failure(s) of ${COVER_CHECK} once a job, at its full height`);
        }
        if (coverUnread.length > 0) {
            verdicts.push(`${COVER_CHECK} read nothing on ${coverUnread.length} job(s) not refused: ${coverUnread.slice(0, 5).join(', ')}${coverUnread.length > 5 ? ', …' : ''}`);
        }
        const contrastClip = coverClip(coverContrast);
        verdicts.push(...contrastClip.faults.map((why) => `${COVER_CHECK}: ${why}`));
        if (coverTally(coverContrast).paints > 0) coverSeen.contrast = coverContrast;
        if (PRIVATE_SHEET_CLASSES.length > 0) {
            // Every carried look on its own tallies (8e2, the 8e2 critic's
            // item 1): its line skips against its own ceiling, its points
            // of 1a behind a clip on every pass that read it (7a), a read of
            // 1b that held a target on every geometry pass (7b), the codes
            // owed by name on its own jobs, their quiet zones and (7c) their
            // modules. A carried look with no ceiling of its own fails here.
            const { faults, notes } = carriedTallyFaults({
                carried: CARRIED.looks,
                lineSkips: privateLineSkips,
                cover: coverSeen,
                reach: reachSeen,
                clipCeiling: CLIP_SKIP_CEILING,
                codesRead: codesReadByClass,
                moduleCodesRead: modulesRun.readByClass,
                codesRequired: CODES_REQUIRED,
            });
            verdicts.push(...faults);
            for (const note of notes) console.log(`  ${note}`);
            // Per screen, on every run (the 8g1 critic's P3-1): the ceiling
            // holds sums, and a sum that holds while its screens change is
            // only on screen here.
            for (const cls of PRIVATE_SHEET_CLASSES) {
                console.log(`  ${cls} line skips by screen (clipped-away/not-rendered): ${skipsByScreenLine(skipsByScreen(runDumpJobs, cls))}`);
            }
            if (faults.length === 0) {
                const said = PRIVATE_SHEET_CLASSES.map((cls) =>
                    ['mobile', 'desktop', 'canvas']
                        .map((vp) => `${vp} ${privateLineSkips[cls]?.[vp]?.['clipped-away'] ?? 0}/${privateLineSkips[cls]?.[vp]?.['not-rendered'] ?? 0}`)
                        .join(', ') +
                    ' · 1a points behind a clip ' +
                    Object.keys(coverSeen)
                        .map((pass) => {
                            const t = coverTally(coverSeen[pass], [cls]);
                            return `${pass} ${t.clipSkips}/${t.clipSkips + t.checked} (wall scrollers ${t.wallScroll} apart)`;
                        })
                        .join(', '),
                );
                console.log(`  carried looks on their own tallies (a-carried-look-is-held-to-its-own-skip-ceilings): ${PRIVATE_SHEET_CLASSES.map((cls, i) => `${cls}: line skips ${said[i]}`).join('; ')}`);
            }
        }
        if (LOOKS === 'shipped') {
            // The sign's name is read on every shipped look, bare and worn
            // (D14): a name the pass stopped reading on one is named.
            const read = new Set([...nameLeast.keys()].map((at) => at.replace(/ \(ring\)$/, '')));
            // Every carried private look's sign too (8e2): bare always, and
            // all worn wherever the plan wears it (a look with no rows has
            // no worn job to read).
            const wornInPlan = new Set(plan.filter((j) => j.flags === 0xffff).map((j) => j.sheetClass));
            const owed = [
                ...SHIPPED_SHEET_CLASSES.flatMap((cls) => [`name ${cls}`, `name ${cls} + worn`]),
                ...PRIVATE_SHEET_CLASSES.flatMap((cls) => [`name ${cls}`, ...(wornInPlan.has(cls) ? [`name ${cls} + worn`] : [])]),
            ];
            const unreadNames = owed.filter((at) => !read.has(at));
            if (unreadNames.length > 0) {
                verdicts.push(`the-sellers-name-on-the-sign-reads read no name on ${unreadNames.join(', ')}`);
            }
        }
        if ((LOOKS === 'shipped' || RAIN_REQUIRED.length > 0) && ringTargets === 0) {
            // The ring read has to have read something, or its green is
            // vacuous: the rain outlines lines on every worn screen the pass
            // samples, Neo's and any look's that carries it.
            verdicts.push('the ring read read no outlined line — vacuous green');
        }
        if (dim.length > 0) {
            verdicts.push(`${dim.length} figure(s) on paint below ${PIXEL_CONTRAST_FLOOR}:1 — ${took()}`);
        }
        if (verdicts.length === 0) {
            // No tick over a walk that missed or repeated a job, or refused one.
            if (walkOk && refused.length === 0) {
                console.log(
                    `✓ contrast: ${plan.length} planned jobs done once each, ${boxes} figure boxes ` +
                        `sampled against rendered pixels, the rain at its brightest on ${rainJobs}, ` +
                        `${lookPseudoJobs} job(s) with look pseudos and ${lookMarkJobs} with a look's marks hidden and compared (${lookPseudoPixels} protected pixels), ` +
                        `${artOffJobs} job(s) read again with the look's file art pending (${Object.values(artOffFrames.pending ?? {}).reduce((a, b) => a + b, 0)}) or failed (${Object.values(artOffFrames.failed ?? {}).reduce((a, b) => a + b, 0)}; ${artOffTargets} reads), ` +
                        `the aurora's tide held at an end on ${tideJobs}, ` +
                        `${lineTargets} of them over their line rects, ` +
                        `${ringTargets} outlined line(s) ring-read (${moneyRingRead} of them money; ${ringPixels} ring pixels, ` +
                        `at least ${Number.isFinite(ringLeastPerChar) ? ringLeastPerChar.toFixed(1) : '-'} glyph pixels a character), ` +
                        `${brokenFigures} broken figure(s) read digit by digit on ${brokenKeys.size} job(s) ` +
                        `(the ring and the figures shown on frames of their own on ${shownApartJobs}, where an outlined line met a piece) ` +
                        `(the faintest piece ${Number.isFinite(brokenLeast) ? brokenLeast.toFixed(2) : '-'}:1; ${phases.get('broken figures')?.ms !== undefined ? `${(phases.get('broken figures').ms / 1000).toFixed(1)}s` : '-'}) — ${took()}` +
                        `\n    faces: every face loaded before the first job on all ${tabs.reduce((n, tab) => n + tab.faces.length, 0)} contrast pages` +
                        ` (the first: ${tabs[0].faces[0] ?? 'none'})` +
                        `\n    honest-display: ${[...honestJobs.values()].reduce((a, b) => a + b, 0)} job(s) on ${honestScreens.length} sheet screens read every line they owe; ` +
                        `${honestReads.size} role(s) read ${[...honestReads.values()].reduce((a, b) => a + b, 0)} times; ` +
                        `${honestUnrendered} line(s) not rendered at their job's width, not targets there`,
                );
            }
        } else {
            failed = true;
            for (const line of verdicts) console.error(`✗ contrast: ${line}`);
            for (const line of dim) {
                console.error(`    ${line}`);
            }
            for (const line of coverFailed) {
                console.error(`    ${line}`);
            }
            for (const line of modulesRun.failures) {
                console.error(`    ${line}`);
            }
        }
    } catch (err) {
        failed = true;
        console.error(`✗ contrast: ${err.message} (on ${currentStep}) — ${took()}`);
    }
    // The tabs past the first are the contrast pass's own: closed before
    // the transparency pass, which runs on the first.
    for (const tab of tabs.slice(1)) {
        try {
            await cdp.send('Target.closeTarget', { targetId: tab.targetId });
        } catch {
            // A tab that is already gone is not a layout defect.
        }
    }
    watchedTabs = [];
    if (refused.length > 0) {
        failed = true;
        console.error(`✗ contrast: ${refused.length} job(s) refused — what the page answered is not the job:`);
        for (const line of refused) console.error(`    ${line}`);
    }
    if (Object.keys(coverContrast).length > 0) {
        console.log(`  1a (nothing-covers-money-or-a-protected-box), bound: what it read once a contrast job, at its full height`);
        for (const line of coverLines('contrast (its time summed over the tabs)', coverContrast, phases.get('cover (1a)')?.ms ?? 0)) console.log(line);
    }
    // The least ring read per kind of outlined line, whatever the verdict:
    // what the outline buys each kind at the rain's worst, and
    // what its antialiased rim reads, reported and never judged.
    if (ringKindsOut.size > 0) {
        console.log(
            `  ring, least per kind (the solid ring; the rim reported): ` +
                [...ringKindsOut]
                    .sort((a, b) => a[1].least - b[1].least)
                    .map(
                        ([sel, k]) =>
                            `${sel} ${k.least.toFixed(2)}` +
                            (Number.isFinite(k.rim) ? ` (rim ${k.rim.toFixed(2)})` : '') +
                            ` (${k.ring}px, ${k.n})`,
                    )
                    .join('; '),
        );
    }
    // D14: the sign's name, the least per look and decoration state, and
    // the instant it was read at (its animations and opacity, frozen).
    if (nameLeast.size > 0) {
        console.log(
            `  sign name and tagline, least per look (the-sellers-name-on-the-sign-reads): ` +
                [...nameLeast]
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([at, least]) => `${at} ${least.toFixed(2)}`)
                    .join('; '),
        );
        console.log(
            `  sign name, as it was read (its own glow blanked with the glyph; the lamp's dip is G7): ` +
                [...nameChromeSeen].sort().join('; '),
        );
    }
    // D4: the codes whose quiet zone was read, and the codes a geometry pass
    // painted that no contrast job read, whatever the verdict.
    if (codesRead.size > 0 || codesPaintedSeen.size > 0) {
        console.log(
            `  quiet zone, codes read (a-code-keeps-its-quiet-zone-white; jobs; ${quietPixels} px): ` +
                [...codesRead].sort(([a], [b]) => a.localeCompare(b)).map(([code, n]) => `${code} ${n}`).join(', '),
        );
        const notRead = [...codesPaintedSeen].filter((code) => !codesRead.has(code)).sort();
        console.log(
            `  quiet zone, codes painted and not read: ` +
                (notRead.length === 0 ? 'none' : notRead.map((code) => (codesUnread.has(code) ? `${code} (${codesUnread.get(code)})` : code)).join(', ')),
        );
        console.log(
            `  quiet zone, read again on a fresh pair and white there, at ${CONTRAST_TABS} tab(s): ` +
                (quietReadAgain.length === 0
                    ? 'none'
                    : `${quietReadAgain.length} (by tab: ${byTabSaid(quietByTab)})${quietReadAgain.map((line) => `\n    ${line}`).join('')}`) +
                (canaryQuietReadAgain.length === 0
                    ? `; on the canary's reads again: none`
                    : `; on the canary's reads again: ${canaryQuietReadAgain.length} (by tab: ${byTabSaid(canaryQuietByTab)})${canaryQuietReadAgain.map((line) => `\n    ${line}`).join('')}`),
        );
    }
    // 1d (bound since 7c): what the module read read and failed, whatever
    // the verdict; its failures are the contrast pass's too.
    if (Object.keys(modulesRun.byVpClass).length > 0 || codesPaintedSeen.size > 0) {
        for (const line of moduleReport(modulesRun, canaryModules, codesPaintedSeen)) console.log(`  ${line}`);
    }
    if (Object.keys(digitsRun.byVpClass).length > 0) {
        for (const line of charReport(digitsRun)) console.log(`  ${line}`);
    }
    if (moduleSnapRead !== undefined) {
        for (const line of moduleSnapLines(moduleSnapRead)) console.log(`  ${line}`);
    }
    // Every prepared node that gave no box, by the page's reason, whatever
    // the verdict (step 5b: no silent drop): a picture tile, a box that
    // draws nothing, a whole-box read cut to a sliver, text scrolled wholly
    // behind a clip, text not rendered at this width.
    if (skipTotals.size > 0) {
        console.log(
            `  nodes that gave no box: ` +
                [...skipTotals]
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([why, n]) => `${why} ${n}`)
                    .join(', '),
        );
    }
    // Visible text no target reads (a report, never a verdict): each element
    // kind and on how many jobs it stood unread.
    if (uncoveredKinds.size > 0) {
        console.log(
            `  text no target reads (${uncoveredKinds.size} kinds; jobs): ` +
                [...uncoveredKinds]
                    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
                    .map(([kind, n]) => `${kind} ${n}`)
                    .join(', '),
        );
    }
    // Printed whatever the verdict, a pass that threw included: a slow red
    // run is exactly the one whose phases someone needs to read. With more
    // than one tab the phases are each tab's time summed, so they add up to
    // more than the pass took; each tab's own share is said first.
    console.log(
        `    contrast tabs: ${tabs.length} (${CONTRAST_TABS_WHY}) — ` +
            tabs.map((tab) => `tab ${tab.index} ${tab.jobs} jobs, ${(tab.busyMs / 1000).toFixed(1)}s, ${tab.faces.length} page(s)`).join('; '),
    );
    console.log(
        `    the-contrast-pass-reads-the-same-on-every-tab: ` +
            (tabs.length === 1
                ? 'not asked — one tab'
                : contrastRun.canary.length === 0
                  ? 'not read — the walk did not finish'
                  : `${contrastRun.canary.filter((c) => c.same).length} of ${contrastRun.canary.length} job(s) read again on another tab, the same record and boxes byte for byte: ` +
                    contrastRun.canary.map((c) => `${c.key} (tab ${c.ranOn} → ${c.readOn}${c.same ? '' : `, ${c.boxesDiffer} box(es) differ`})`).join(', ')),
    );
    for (const line of phaseTable(performance.now() - contrastStartedAt, tabs.length)) console.log(line);

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
     * plate and its ink. Its palette only: since D11 a mood may carry a
     * class, and the broadcast branch strips it
     * (`a-mood-class-never-reaches-the-overlay`). One worn job per mood.
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
     * Every clear screen, not one (`TRANSPARENCY_PASS` in `probe-passes.mjs`
     * says why), at the canvas.
     */
    const CLEAR_SCREENS = TRANSPARENCY_PASS.screens.split(',');
    const clearVp = TRANSPARENCY_PASS.vp;
    try {
        await cdp.send(
            'Emulation.setDeviceMetricsOverride',
            { width: clearVp.width, height: clearVp.height, deviceScaleFactor: 1, mobile: false },
            sessionId,
        );
        currentStep = 'transparency: loading the canvas page';
        await cdp.send('Page.navigate', { url: probeUrl(clearVp, '&screens=') }, sessionId);
        await waitForFlag(cdp, sessionId, '__probeReady');
        // Every face loaded before the first job (`every-face-is-loaded-before-the-probe-measures`).
        const faceEcho = await evalJson(cdp, sessionId, 'window.__faces ?? null');
        const faceFaults = facesFaults(faceEcho, DECLARED_FACES);
        if (faceFaults.length > 0) {
            throw new Error(`the canvas page was not measured in its faces (${FACES_CHECK}): ${faceFaults.join('; ')}`);
        }
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
            for (const { id: theme, rows, sheetClass, wornAll: allFlags } of themes) {
                // Bare, and one all-worn state per mood (D11: `wornAllFlags`,
                // which the page publishes) — `0xffff` alone for every look
                // with one mood at most.
                if (rows > 0 && (!Array.isArray(allFlags) || allFlags[0] !== 0xffff)) {
                    throw new Error(`theme ${theme}: the page published no all-worn flags — refusing a pass that could skip a mood`);
                }
                for (const flags of rows === 0 ? [0] : [0, ...allFlags]) {
                    const wornAll = flags !== 0;
                    currentStep = `transparency job ${screen}/${theme}/${flags}`;
                    const nonce = `transparency/${screen}/${theme}/${flags}#${(prepareSerial += 1)}`;
                    const prep = await contrastPrepare(cdp, sessionId, screen, theme, flags, true, nonce);
                    for (const cls of prep.sheetClasses ?? []) clearClasses.add(cls);
                    // The same echo checks as pass 4's, thrown: this pass
                    // stops at its first problem.
                    const echo = (why) => {
                        if (why.length > 0) throw new Error(`${screen} / theme ${theme}: ${why.join('; ')}`);
                    };
                    echo(paintEcho({ screen, look: theme, flags, sheetClass }, prep, nonce, clearVp.width, clearVp.height));
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
                    const sized = (shot) =>
                        shot.width === clearVp.width && shot.height === clearVp.height
                            ? []
                            : [`the shot is ${shot.width}x${shot.height} where the job is ${clearVp.width}x${clearVp.height}`];
                    let img = await clearShot();
                    echo(sized(img));
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
                    const firstRead = await evalJson(cdp, sessionId, 'window.__contrastBoxes()');
                    echo(liveEcho(firstRead, nonce, clearVp.width, clearVp.height));
                    let targets = firstRead.boxes;
                    const job = { pass: 'transparency', viewport: 'canvas', screen, look: theme, flags };
                    const record = {
                        key: jobKey(job),
                        ...job,
                        nodes: prep.nodes,
                        prepared: prep.targets.length,
                        classes: prep.sheetClasses ?? [],
                        live: targets.length,
                        image: [img.width, img.height],
                    };
                    runDumpJobs.push(record);
                    const sample = (shot) => {
                        const found = [];
                        const values = [];
                        let counted = 0;
                        for (const [ground, level] of [
                            ['black', 0],
                            ['white', 255],
                        ]) {
                            const flat = compositeOver(shot, level);
                            for (const t of targets) {
                                const worst = worstContrastInBox(flat, t, t.color);
                                values.push({ t, ground, worst });
                                if (worst === undefined) continue;
                                counted += 1;
                                if (worst < PIXEL_CONTRAST_FLOOR) {
                                    found.push(
                                        `${screen} @canvas / theme ${theme}${wornAll ? (flags === 0xffff ? ' + worn' : ` + worn ${flags}`) : ''} ` +
                                            `over ${ground}: ${t.sel} at ${Math.round(t.x)},${Math.round(t.y)} ` +
                                            `sits on paint at ${worst.toFixed(2)}:1`,
                                    );
                                }
                            }
                        }
                        return { found, counted, values };
                    };
                    let { found, counted, values } = sample(img);
                    // A failing box is re-shot once before it is believed — the same
                    // rule pass 4 learned: a real defect is steady state.
                    record.retried = found.length > 0;
                    if (found.length > 0) {
                        await sleep(250);
                        img = await clearShot();
                        echo(sized(img));
                        const again = await evalJson(cdp, sessionId, 'window.__contrastBoxes()');
                        echo(liveEcho(again, nonce, clearVp.width, clearVp.height));
                        if (again.boxes.length === targets.length) targets = again.boxes;
                        ({ found, values } = sample(img));
                    }
                    for (const { t, ground, worst } of values) {
                        runDumpBoxes.push({
                            key: boxKey(job, { ...t, ground }),
                            job: record.key,
                            i: t.i,
                            sel: t.sel,
                            ground,
                            x: t.x,
                            y: t.y,
                            w: t.w,
                            h: t.h,
                            color: t.color,
                            worst: dumpValue(worst),
                        });
                    }
                    record.sampled = values.filter((v) => v.worst !== undefined).length;
                    record.dropped = values.length - record.sampled;
                    if (targets.length > 0 && record.sampled === 0) {
                        echo([`${targets.length} boxes and none sampled over either ground`]);
                    }
                    boxes += counted;
                    dim.push(...found);
                }
            }
        }
        const clearPct = (clearRatio * 100).toFixed(0);
        // The policy's refusals on the transparency page, over its whole life
        // (`the-probe-page-meets-no-csp-refusal`).
        const clearRefusals = refusalFailures(await evalJson(cdp, sessionId, 'window.__cspRefusals()'));
        if (clearRefusals.length > 0) {
            failed = true;
            for (const f of clearRefusals) console.error(`✗ transparency: ${f.check}: ${f.detail}`);
        }
        if (sheetClassesWrong([...clearClasses]) !== undefined) {
            failed = true;
            console.error(`✗ transparency: ${sheetClassesWrong([...clearClasses])}`);
        } else if (dim.length === 0 && clearRefusals.length === 0) {
            console.log(
                `✓ transparency (${CLEAR_SCREENS.join(', ')} @canvas): RGBA capture, ${clearPct}% of the frame ` +
                    `outside the plates at alpha 0; ${boxes} figure boxes over black and white — ${took()}` +
                    `\n    faces: ${facesLine(faceEcho)}`,
            );
        } else if (dim.length > 0) {
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
        console.error(`✗ transparency: ${err.message} (on ${currentStep})`);
    }
    cdp.close();
    {
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rev = gitRev();
        // A run that carried private looks is its own kind of run (8e2, the
        // 8e2 critic's item 7): its dump names them, never overwrites the
        // public run's latest, and is never compared with it
        // (`dumpKindOf`, `contrast-dump.mjs`).
        const kind = dumpKindOf(LOOKS, PRIVATE_SHEET_CLASSES);
        const path = writeDump(
            {
                meta: {
                    looks: LOOKS,
                    kind,
                    carried: PRIVATE_SHEET_CLASSES,
                    selection: MEASURED_SELECTION === undefined ? null : CARRIED.line,
                    privateCommit: CARRIED.commit ?? null,
                    rev: rev ?? null,
                    at: new Date().toISOString(),
                    loadavg: loadavg(),
                    argv: process.argv.slice(2),
                    // How the contrast pass was walked (P2-1): the tab count
                    // and why, the tab each folded job ran on, the canary.
                    contrastTabs: contrastRun.tabs,
                    contrastTabsWhy: contrastRun.tabsWhy,
                    ranOn: contrastRun.ranOn,
                    canary: contrastRun.canary,
                    // The codes read dark and then white on a fresh pair
                    // (`readQuietZones`), on the walk's jobs and on the
                    // canary's reads again: how many, and which (each
                    // sighting's first line), so a reader comparing runs can
                    // find a code that recurs (the probe-shard critic's N6).
                    // 1d (bound since 7c): how many code reads failed the
                    // module read, and how many read wrong and then right on a
                    // fresh pair, on the walk and on the canary's reads again.
                    // Both counted by the run's tab count and by the tab that read
                    // each (the tenth critic's item 4: a flake that hits both
                    // captures is a false red now 1d is bound, so step 7c read
                    // these counts first).
                    codeModules: {
                        tabs: CONTRAST_TABS,
                        would: modulesRun.would.length,
                        readAgain: modulesRun.readAgain.length,
                        readAgainByTab: modulesRun.readAgainByTab,
                        canaryWould: canaryModules.would.length,
                        canaryReadAgain: canaryModules.readAgain.length,
                        canaryReadAgainByTab: canaryModules.readAgainByTab,
                        sightings: [...modulesRun.readAgain, ...canaryModules.readAgain].map((line) => line.split('\n')[0]),
                    },
                    quietReadAgain: {
                        tabs: CONTRAST_TABS,
                        walk: quietReadAgain.length,
                        walkByTab: quietByTab,
                        canary: canaryQuietReadAgain.length,
                        canaryByTab: canaryQuietByTab,
                        sightings: [...quietReadAgain, ...canaryQuietReadAgain].map((line) => line.split('\n')[0]),
                    },
                },
                jobs: runDumpJobs,
                boxes: runDumpBoxes,
            },
            { looks: kind, stamp, rev },
        );
        console.log(`  contrast dump: ${runDumpBoxes.length} boxes over ${runDumpJobs.length} jobs → ${path}`);
    }
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
