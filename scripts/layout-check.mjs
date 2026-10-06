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
import { loadavg, tmpdir } from 'node:os';
import { join } from 'node:path';
import { CHROMES, FIXED_CLOCK, decodePng, devtools, findChrome } from './browser.mjs';
import { boxKey, dumpKindOf, dumpValue, jobKey, writeDump } from './contrast-dump.mjs';
import { payScreensMissingQuote } from './pay-screens.mjs';
import { TRACKED_FIXTURE_CLASS, owedFaults, probeCoverageGaps, probeCoverageLine, wornSheetJobFaults } from './probe-coverage.mjs';
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
import { QUIET_ZONE_FLOOR, readQuietZone } from './quiet-zone.mjs';
import { HORIZON_WORST, horizonWorstVerdict } from './horizon-worst.mjs';
import { FIXTURE_LOOKS_DIR, harnessSelection, refuseSelection } from './looks-selection.mjs';
import { harnessLooks } from './harness-looks.mjs';
import { carriedTallyFaults } from './look-tallies.mjs';
import { SERVED_SHEETS } from './sheet-roles.mjs';
import { privateRows, servedSheets } from './served-sheets.mjs';

/*
 * The private looks this run measures (8e2): the selection the shell names,
 * whole, or none — half a selection stops the run before it builds
 * (`harnessSelection`). With one, the probe's build carries what a build
 * with it carries, every pass measures those looks beside the shipped ones,
 * and every class they paint is expected below; with none, the run is the
 * public one it was before 8e2.
 */
const SELECTION = harnessSelection('test:layout');

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
    // A payment of several items, and of the cap (2026-09-24, the critic,
    // P1): the tablet band held for one item and was cut again at three.
    'shop-window-touch-quotes-pay-3,shop-window-touch-quotes-pay-35,' +
    // An unbuyable offer on a wall (2026-09-23), in a Browse row, and the
    // Cycle card that skips it (since 2026-09-24): the tall wall and the
    // tablet lay both out on their own.
    'shop-window-unbuyable,shop-window-cycle-unbuyable,' +
    // The sign under stress (8f2): a 32-byte name on the Cycle card and in
    // Browse, at the desk width and at a wall size, a name in stacked-mark
    // capitals and a CJK name (`the-sellers-name-stands-whole`).
    'shop-window-long-name,shop-window-browse-long-name,shop-window-stacked-name,shop-window-cjk-name,' +
    'shop-window-wall-long-name,shop-window-wall-browse-long-name';
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
 * Navigate and wait for the probe's own verdict rather than for `load`: the
 * page writes `#layout-result` while its module evaluates, and an icon request
 * that never answers must not be able to hang the run.
 */
async function readVerdict(cdp, sessionId, url) {
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
        );
        if (typeof r.result.value === 'string') {
            const report = JSON.parse(r.result.value);
            report.failures.push(...(await lateRefusals(cdp, sessionId, report)));
            // Measured in the faces it owes, or the pass is refused — every
            // pass that reads a verdict, the reduced-motion ones included.
            report.failures.push(...faceFailures(report.faces));
            return report;
        }
        await sleep(100);
    }
    throw new Error('the probe never reported. It threw, or never ran.');
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
 * **The ring read** (round 8, 2026-09-25). A line that wears the outline
 * (`outlineOf` in the probe: `text-shadow` in one opaque colour — the ground
 * it stands on, round 10 — at zero blur, one or two pixels wide) is not read
 * over its box — the rain
 * between its strokes is in the box, and what a reader needs is the ground
 * right against every stroke. So the job is captured once more with the
 * outlined glyphs shown (`__contrastGlyphs`), and for each line of each
 * outlined target:
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
/**
 * The carried looks whose own sheet names a file in a mask or clip property
 * (8f2, the 8f2 critic's P3-8), read from the sheet as the build reads it:
 * each owes the art-off read a pending frame, so a computed miss in the
 * probe's `markFileArt` fails the run rather than reading as no art.
 */
const FILE_ART_IN_SHEET = /(?:^|[;{\s])(?:-webkit-)?(?:mask(?:-image|-border(?:-source)?|-box-image(?:-source)?)?|clip-path)\s*:[^;{}]*url\(/i;
const CARRIED_FILE_ART =
    MEASURED_SELECTION === undefined
        ? []
        : privateRows(await servedSheets({ env: CARRIED.env }))
              .filter((row) => FILE_ART_IN_SHEET.test(row.css.replace(/\/\*[\s\S]*?\*\//g, '')))
              .map((row) => row.lookClass);
/**
 * Every decoration class a geometry pass painted worn (the probe's
 * `wornClasses`): the contrast pass's owed jobs must follow it
 * (`owed-follows-what-a-pass-wore`, `owedFaults`).
 */
const wornClassesSeen = new Set();
/**
 * Each carried private look's points behind a clip and hit-tested, per
 * geometry pass (`clipByClass` in the page's verdict, 8e2): held to the
 * clip ceiling on its own (`look-tallies.mjs`) where the public looks keep
 * the ratio over theirs.
 */
const clipSeen = {};
/**
 * Every code a geometry pass painted, as `pass/screen:name` (the probe's
 * `codesPainted`): the contrast pass lists which of them it read the quiet
 * zone of and which it did not (D4, `a-code-keeps-its-quiet-zone-white`).
 */
const codesPaintedSeen = new Set();
/**
 * The codes the quiet-zone read owes by name: every code that pays — the
 * pay sheet's and "Pay several"'s at a phone and a desk, the wall's payment
 * plate — and one of each other kind: a record sheet's, the share code, the
 * overlay's and the wall's shop code.
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
 * Every CDP command this run sends is bounded (`devtools`' `timeoutMs`): one
 * that has not answered in this long — a page that hung, a target that
 * crashed, a box in swap — fails its pass, naming the method, instead of
 * holding the run open. The longest a healthy command takes here is a
 * capture of a grown 1920-wide page, well under a second.
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
        `\n✗ runtime: past the ${RUNTIME_CEILING_S}s ceiling while on ${currentStep} — ` +
            'the watchdog stops the run.',
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
function phaseTable(passMs) {
    const rows = [...phases].map(([phase, { calls, ms }]) => ({ phase, calls, ms }));
    const accounted = rows.reduce((sum, row) => sum + row.ms, 0);
    rows.push({ phase: '(unaccounted)', calls: 0, ms: Math.max(0, passMs - accounted) });
    const lines = [`    phase             calls     total   share     mean`];
    for (const { phase, calls, ms } of rows) {
        lines.push(
            `    ${phase.padEnd(16)} ${String(calls || '').padStart(6)} ${(ms / 1000).toFixed(1).padStart(8)}s` +
                ` ${((ms / passMs) * 100).toFixed(0).padStart(6)}%` +
                ` ${calls === 0 ? '' : `${(ms / calls).toFixed(0).padStart(6)}ms`}`,
        );
    }
    return lines;
}
/*
 * The per-box dump (`contrast-dump.mjs`): every job each contrast pass ran
 * and every box it sampled, with the worst value it found, written to
 * `.layout-dump/` on every run. It is how a change to the passes' machinery
 * is shown to move nothing — or exactly what it moved.
 */
const dumpJobs = [];
const dumpBoxes = [];
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
        // The private looks the page's build carries are the ones the
        // selection names (8e2): a build that dropped one, or carried one
        // nobody selected, is refused before any of its verdict is believed —
        // and before the class audit, whose sentence would only say a class
        // was not painted.
        const wrongPrivate = privateLooksWrong(report.privateClasses);
        if (wrongPrivate !== undefined) {
            console.error(`✗ ${vp.name} (${measured}): ${wrongPrivate}`);
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
        for (const kind of report.outlinedTargets ?? []) outlinedTargetsSeen.add(kind);
        for (const [cls, n] of Object.entries(report.marksShownByClass ?? {})) if (n > 0) marksShownSeen.add(cls);
        for (const cls of report.wornClasses ?? []) wornClassesSeen.add(cls);
        for (const code of report.codesPainted ?? []) codesPaintedSeen.add(`${vp.name}/${code}`);
        const gaps = probeCoverageGaps(vp.name, report, {
            shippedClasses: SHIPPED_SHEET_CLASSES,
            privateClasses: PRIVATE_SHEET_CLASSES,
            paidPrivateClasses: PAID_PRIVATE_CLASSES,
            skeleton: EXPECTED_SHEET_CLASSES.includes('t-skeleton'),
            sheetedClasses: EXPECTED_SHEET_CLASSES.filter((cls) => cls !== 't-skeleton'),
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
        // The public looks' own points (8e2): a carried look's are held to
        // the same ceiling on their own (`look-tallies.mjs`), and neither can
        // mask nor trip the other.
        const carriedClip = PRIVATE_SHEET_CLASSES.map((cls) => report.clipByClass?.[cls] ?? { skips: 0, checks: 0 });
        for (const cls of PRIVATE_SHEET_CLASSES) {
            (clipSeen[cls] ??= {})[vp.name] = report.clipByClass?.[cls] ?? { skips: 0, checks: 0 };
        }
        const skipped = (report.clipSkips ?? 0) - carriedClip.reduce((n, at) => n + at.skips, 0);
        const checked = (report.clipChecks ?? 0) - carriedClip.reduce((n, at) => n + at.checks, 0);
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
                        (compared === '' ? '' : `\n    compared: ${compared}`) +
                        `\n    faces: ${facesLine(report.faces)}`,
                );
            }
            continue;
        }
        failed = true;
        console.error(
            `✗ ${vp.name} (${measured}): ${report.failures.length} failure(s) — ${spent}${clipLine}` +
                `\n    faces: ${facesLine(report.faces)}`,
        );
        for (const f of report.failures) {
            console.error(`    ${f.screen} / ${f.theme}: ${f.check} — ${f.detail}`);
        }
    }

    /*
     * The worn-only road, once, under the production policy
     * (`a-worn-only-sheet-loads-under-the-production-policy`, step 6): the
     * harness's fixture look (`layout/fixtureLook.ts`) painted, then its
     * sheet put on the page by the app's own loader, `src/ui/lookSheets.ts`
     * (`window.__wornSheetJob`). The
     * ordinary run only: the kit's page is built from the same probe, and
     * the road is the app's, not the look's.
     */
    if (LOOKS === 'shipped') {
        const label = 'worn-only sheet (a-worn-only-sheet-loads-under-the-production-policy)';
        try {
            await cdp.send(
                'Emulation.setDeviceMetricsOverride',
                { width: VIEWPORTS[1].width, height: VIEWPORTS[1].height, deviceScaleFactor: 1, mobile: false },
                sessionId,
            );
            await cdp.send('Page.navigate', { url: probeUrl(VIEWPORTS[1], '&screens=') }, sessionId);
            await waitForFlag(cdp, sessionId, '__probeReady');
            const missing = `/assets/no-such-look-sheet-${Date.now().toString(36)}.css`;
            const r = await cdp.send(
                'Runtime.evaluate',
                {
                    expression: `window.__wornSheetJob(${JSON.stringify(missing)}).then((v) => JSON.stringify(v))`,
                    awaitPromise: true,
                    returnByValue: true,
                },
                sessionId,
            );
            if (r.exceptionDetails) throw new Error(`page threw: ${JSON.stringify(r.exceptionDetails)}`);
            const job = JSON.parse(r.result.value);
            const faults = wornSheetJobFaults(job);
            if (faults.length === 0) {
                console.log(
                    `✓ ${label}: ${job.url} loaded by the app's loader, last, same origin, named itself (${job.after}), ` +
                        `held ${job.state} and linked once; its art ${job.art.join(', ')}; ` +
                        `a missing sheet (answered ${job.missingStatus}) rejected and held ${job.missingState}: ${job.missingWhy}; no refusal`,
                );
            } else {
                failed = true;
                console.error(`✗ ${label}:`);
                for (const fault of faults) console.error(`    ${fault}`);
            }
        } catch (err) {
            failed = true;
            console.error(`✗ ${label}: ${err.message}`);
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
            } else {
                // Both halves, always: a coverage gap printed in place of the
                // failures hid them (the critic, 2026-09-24). The wall rule
                // owes every one of the touch wall's roles here — a fixture
                // that stopped mounting its controls would leave it green
                // over nothing (`probe-coverage.mjs`).
                for (const kind of pv.outlinedTargets ?? []) outlinedTargetsSeen.add(kind);
                for (const cls of pv.wornClasses ?? []) wornClassesSeen.add(cls);
                for (const code of pv.codesPainted ?? []) codesPaintedSeen.add(`${PORTRAIT.name}/${code}`);
                const gaps = probeCoverageGaps(PORTRAIT.name, pv, { privateClasses: PRIVATE_SHEET_CLASSES });
                const compared = probeCoverageLine(PORTRAIT.name, pv);
                if (pv.failures.length === 0 && gaps.length === 0) {
                    console.log(
                        `✓ ${label}: ${wanted} screens, every look — ${took()}\n    compared: ${compared}` +
                            `\n    faces: ${facesLine(pv.faces)}`,
                    );
                } else {
                    failed = true;
                    if (pv.failures.length > 0) {
                        console.error(`✗ ${label}: ${pv.failures.length} failure(s) — ${took()}`);
                        for (const f of pv.failures) {
                            console.error(`    ${f.screen} / ${f.theme}: ${f.check} — ${f.detail}`);
                        }
                    }
                    if (gaps.length > 0) {
                        console.error(`✗ ${label}: a rule compared nothing it owes —`);
                        for (const gap of gaps) console.error(`    ${gap}`);
                    }
                    console.error(`    compared: ${compared}`);
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
            } else {
                // Both halves, always: a coverage gap printed in place of the
                // failures hid them (the critic, 2026-09-24). The wall rule
                // owes every one of the touch wall's roles here — a fixture
                // that stopped mounting its controls would leave it green
                // over nothing (`probe-coverage.mjs`).
                for (const kind of tv.outlinedTargets ?? []) outlinedTargetsSeen.add(kind);
                for (const cls of tv.wornClasses ?? []) wornClassesSeen.add(cls);
                for (const code of tv.codesPainted ?? []) codesPaintedSeen.add(`${TABLET.name}/${code}`);
                const gaps = probeCoverageGaps(TABLET.name, tv, { privateClasses: PRIVATE_SHEET_CLASSES });
                const compared = probeCoverageLine(TABLET.name, tv);
                if (tv.failures.length === 0 && gaps.length === 0) {
                    console.log(
                        `✓ ${label}: ${wanted} screens, every look — ${took()}\n    compared: ${compared}` +
                            `\n    faces: ${facesLine(tv.faces)}`,
                    );
                } else {
                    failed = true;
                    if (tv.failures.length > 0) {
                        console.error(`✗ ${label}: ${tv.failures.length} failure(s) — ${took()}`);
                        for (const f of tv.failures) {
                            console.error(`    ${f.screen} / ${f.theme}: ${f.check} — ${f.detail}`);
                        }
                    }
                    if (gaps.length > 0) {
                        console.error(`✗ ${label}: a rule compared nothing it owes —`);
                        for (const gap of gaps) console.error(`    ${gap}`);
                    }
                    console.error(`    compared: ${compared}`);
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
                console.log(`✓ ${label}: every look — ${took()}\n    faces: ${facesLine(rm.faces)}`);
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
    const contrastStartedAt = performance.now();
    /*
     * Both contrast passes run on a page whose clock is fixed
     * (`FIXED_CLOCK`, shared with `looks-diff.mjs`): the pay fixtures stamp
     * their rate at load and a sheet prints it to the second, the quote's age
     * and the wall's freshness are read against "now", and the pay code turns
     * stale 120 s after that stamp. Installed here, so the geometry passes
     * above keep the real clock they were written against.
     */
    await cdp.send('Page.enable', {}, sessionId);
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: FIXED_CLOCK }, sessionId);
    /*
     * The page is focused whether or not its window is: `render.ts` focuses a
     * sheet's close and a face's back control, and `:focus-visible` paints a
     * ring only in a focused page. One headless window is focused already
     * (measured: `document.hasFocus()` true with and without this, and the
     * per-box dump identical, 4575 of 4575); a second window, which a sharded
     * pass would open, is not.
     */
    await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: true }, sessionId);
    /*
     * And no page older than a minute: the rate stamp ages out at 120 s,
     * and a pay sheet arms a timer that repaints it then. A page is loaded
     * per viewport and again whenever it has lived longer than this.
     */
    const PAGE_MAX_AGE_MS = 60_000;
    let loadedAt = 0;
    /*
     * The policy's refusals on every contrast page, asked before the page
     * is left and once more at the end: its jobs paint after the verdict
     * the page wrote, so the verdict's own list cannot carry them
     * (`the-probe-page-meets-no-csp-refusal`, `cspWatch.ts`).
     */
    const contrastRefusals = [];
    const collectRefusals = async () => {
        if (loadedAt === 0) return;
        contrastRefusals.push(...(await evalJson(cdp, sessionId, 'window.__cspRefusals()')));
    };
    // One faces line per contrast page loaded, printed with the pass's verdict.
    const contrastFacePages = [];
    const loadContrastPage = async (vp, phase = 'load') => {
        await collectRefusals();
        await timed(`${phase}: navigate`, () =>
            cdp.send('Page.navigate', { url: probeUrl(vp, '&screens=') }, sessionId),
        );
        await timed(`${phase}: ready`, () => waitForFlag(cdp, sessionId, '__probeReady'));
        loadedAt = performance.now();
        // Every face loaded before the first job on this page
        // (`every-face-is-loaded-before-the-probe-measures`): a job paints
        // after the page's own wait, so one check per page covers its jobs.
        const echo = await evalJson(cdp, sessionId, 'window.__faces ?? null');
        const faults = facesFaults(echo, DECLARED_FACES);
        if (faults.length > 0) {
            throw new Error(`the ${vp.name} page was not measured in its faces (${FACES_CHECK}): ${faults.join('; ')}`);
        }
        contrastFacePages.push(facesLine(echo));
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
    // D14: the least the sign's name read per look and decoration state
    // (line read, or ring read where it wears the outline), and how the
    // name was painted where it was read (`nameChrome`).
    const nameLeast = new Map();
    const nameChromeSeen = new Set();
    const isName = (sel) => /(^|\.)stall-(?:name|tagline)(\.|$)/.test(sel);
    const signPart = (sel) => (/(^|\.)stall-name(\.|$)/.test(sel) ? 'name' : 'tagline');
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
         * read once: every job of every viewport, in order. The runner keeps
         * its own count of what it did, and at the end every planned job must
         * have been done exactly once — a job that fell out of the walk, or
         * ran twice, fails the pass rather than printing a smaller number.
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
        const done = new Map();
        let reducedNow = false;
        for (const vp of ALL_VIEWPORTS) {
            currentStep = `contrast: loading the ${vp.name} page`;
            await timed('metrics', () =>
                cdp.send(
                    'Emulation.setDeviceMetricsOverride',
                    { width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: false },
                    sessionId,
                ),
            );
            await loadContrastPage(vp);
            const pageScreens = await timed('plan reads', async () => {
                plan ??= await evalJson(cdp, sessionId, 'window.__contrastPlan()');
                owed ??= await evalJson(cdp, sessionId, 'window.__contrastOwed()');
                honestOwed ??= await evalJson(cdp, sessionId, 'window.__honestOwed()');
                return evalJson(cdp, sessionId, 'window.__contrastScreens');
            });
            const jobsHere = plan.filter((planned) => planned.viewport === vp.name);
            // The plan's viewport is this one, and its screens are the ones
            // the page itself would sample at this width.
            const planned = jobsHere[0];
            if (planned !== undefined && (planned.width !== vp.width || planned.height !== vp.height)) {
                throw new Error(
                    `the plan's ${vp.name} is ${planned.width}x${planned.height}, this run's ${vp.width}x${vp.height}`,
                );
            }
            const planScreens = [...new Set(jobsHere.map((j) => j.screen))];
            if (planScreens.join(',') !== pageScreens.join(',')) {
                throw new Error(
                    `the plan's ${vp.name} screens are not the ones the page samples at ${vp.width}px: ` +
                        `plan ${planScreens.join(',')}; page ${pageScreens.join(',')}`,
                );
            }
            for (const plannedJob of jobsHere) {
                currentStep = `contrast job ${plannedJob.key}`;
                done.set(plannedJob.key, (done.get(plannedJob.key) ?? 0) + 1);
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
                if (reduced !== reducedNow) {
                    await cdp.send(
                        'Emulation.setEmulatedMedia',
                        { features: reduced ? [{ name: 'prefers-reduced-motion', value: 'reduce' }] : [] },
                        sessionId,
                    );
                    reducedNow = reduced;
                }
                const record = { key: jobKey(job), ...job };
                dumpJobs.push(record);
                // A job whose echo is not the job is refused before anything
                // is sampled, and says why; the run fails.
                const refuse = (why) => {
                    record.refused = why;
                    refused.push(`${plannedJob.key}: ${why.join('; ')}`);
                };
                if (performance.now() - loadedAt > PAGE_MAX_AGE_MS) {
                    await loadContrastPage(vp, 'reload');
                }
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
                    continue;
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
                        continue;
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
                        continue;
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
                        const shot = await timed('decode', async () => decodePng(png));
                        const bad = shot.width !== vp.width || shot.height !== shotH;
                        return {
                            shot,
                            why: bad ? [`the shot is ${shot.width}x${shot.height} where the job is ${vp.width}x${shotH}`] : [],
                        };
                    };
                    const reread = async () => {
                        const live = await liveBoxes();
                        return { live, why: liveEcho(live, nonce, vp.width, shotH) };
                    };
                    let { shot: img, why: shotWhy } = await capture();
                    if (shotWhy.length > 0) {
                        refuse(shotWhy);
                        continue;
                    }
                    const firstRead = await timed('boxes', reread);
                    if (firstRead.why.length > 0) {
                        refuse(firstRead.why);
                        continue;
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
                        continue;
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
                        const zones = await evalJson(cdp, sessionId, 'window.__quietZones()');
                        for (const z of zones) {
                            const code = `${vp.name}/${screen}:${z.name}`;
                            if (z.turned) {
                                codesUnread.set(code, 'its frame is turned');
                                continue;
                            }
                            const r = readQuietZone(img, z);
                            const at = `${screen} @${vp.name} / theme ${theme}${wornLabel}: the code ${z.name} at ${Math.round(z.x)},${Math.round(z.y)}`;
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
                            if (r.bad > 0) {
                                dim.push(
                                    `${at} has ${r.bad} of ${r.px} quiet-zone pixel(s) under ${QUIET_ZONE_FLOOR} on a channel ` +
                                        `(the first at ${r.first.x},${r.first.y}, rgb(${r.first.rgb.join(',')})) — a-code-keeps-its-quiet-zone-white`,
                                );
                            }
                        }
                    }
                    /*
                     * The ring read (`ringRead`): every outlined target, on a
                     * second capture with its glyphs shown. A failing ring is
                     * read again on a fresh pair before it is believed — the
                     * box read's own rule, and it shares that rule's one
                     * re-shot per job.
                     */
                    if (retryWhy.length === 0 && targets.some((t) => t.ring > 0)) {
                        const ringStart = performance.now();
                        const glyphs = async (show) => {
                            const r = await cdp.send(
                                'Runtime.evaluate',
                                { expression: `window.__contrastGlyphs(${show})`, awaitPromise: true, returnByValue: true },
                                sessionId,
                            );
                            if (r.exceptionDetails) throw new Error(`page threw: ${JSON.stringify(r.exceptionDetails)}`);
                            return r.result.value;
                        };
                        const shownPair = async () => {
                            const n = await glyphs(true);
                            const shownCap = await capture();
                            const shownRead = await reread();
                            await glyphs(false);
                            const why = [...shownCap.why, ...shownRead.why];
                            if (shownRead.live.boxes.length !== targets.length) {
                                why.push(`${shownRead.live.boxes.length} boxes with the glyphs shown where the blanked read had ${targets.length}`);
                            }
                            if (n !== targets.filter((t) => t.ring > 0).length) {
                                why.push(`${n} outlined targets shown where the read has ${targets.filter((t) => t.ring > 0).length}`);
                            }
                            return { shot: shownCap.shot, why };
                        };
                        const readAll = (shown) =>
                            targets.filter((t) => t.ring > 0).map((t) => ({ t, r: ringRead(img, shown, t) }));
                        const bad = ({ r }) => r.worst < PIXEL_CONTRAST_FLOOR || r.thin.length > 0 || r.bare.length > 0;
                        let pair = await shownPair();
                        let results = pair.why.length === 0 ? readAll(pair.shot) : [];
                        if (pair.why.length === 0 && results.some(bad) && !retried) {
                            await sleep(250);
                            const again = await capture();
                            const againRead = await reread();
                            const whyAgain = [...again.why, ...againRead.why];
                            if (whyAgain.length === 0 && againRead.live.boxes.length === targets.length) {
                                img = again.shot;
                                targets = againRead.live.boxes;
                                retried = true;
                                pair = await shownPair();
                                results = pair.why.length === 0 ? readAll(pair.shot) : [];
                            } else {
                                pair = { why: whyAgain.length > 0 ? whyAgain : ['the re-read after a failing ring moved the boxes'] };
                            }
                        }
                        if (pair.why.length > 0) {
                            retryWhy = pair.why.map((w) => `with the glyphs shown, ${w}`);
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
                     * Grid horizon at its worst, reported (step 5a″; the
                     * owner's C, 2026-09-27): the art flattened to its
                     * brightest paint (`__horizonAtItsWorst`), a frame with
                     * the glyphs blanked and one with them shown, the sign's
                     * outlined lines ring-read and its other lines line-read
                     * on them, the art put back. Held to `HORIZON_WORST`, a
                     * regression guard and not a floor: the ring read on the
                     * horizon as painted, above, is the failing guard.
                     */
                    if (retryWhy.length === 0 && (prep.horizon?.worn ?? 0) > 0) {
                        const worstStart = performance.now();
                        const page = async (expression) => {
                            const r = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId);
                            if (r.exceptionDetails) throw new Error(`page threw: ${JSON.stringify(r.exceptionDetails)}`);
                            return r.result.value;
                        };
                        const flat = await page('window.__horizonAtItsWorst(true)');
                        const blankCap = await capture();
                        const flatRead = await reread();
                        await page('window.__contrastGlyphs(true)');
                        const shownCap = await capture();
                        await page('window.__contrastGlyphs(false)');
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
                                await page('window.__contrastGlyphs(true)');
                                shown = await capture();
                                await page('window.__contrastGlyphs(false)');
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
            }
        }
        if (reducedNow) {
            await cdp.send('Emulation.setEmulatedMedia', { features: [] }, sessionId);
            reducedNow = false;
        }
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
        const verdicts = [];
        await collectRefusals();
        for (const r of contrastRefusals) {
            verdicts.push(`the-probe-page-meets-no-csp-refusal: ${r.directive} refused ${r.blocked || '(inline)'}${r.source === '' ? '' : ` at ${r.source}`}`);
        }
        if (boxes === 0) {
            verdicts.push('no figure boxes were sampled — vacuous green.');
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
        const HORIZON_REQUIRED = [
            ...new Set([...(Array.isArray(owed?.horizon) ? owed.horizon : []), ...(LOOKS === 'shipped' ? Object.values(HORIZON_WORST).map((at) => at.job) : [])]),
        ];
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
            // must read it again, and no job may read lower. They are Neo's
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
        if (LOOKS === 'shipped' && codesRead.size === 0) {
            verdicts.push('a-code-keeps-its-quiet-zone-white read no code — vacuous green');
        }
        if (LOOKS === 'shipped') {
            // The codes a buyer pays by are owed by name (the critic, step
            // 5a″ item 7): a fixture that stopped painting one would leave
            // the rule green over the rest.
            // Read on the public looks' own jobs (8e2): a carried look's codes
            // are its own to owe (`look-tallies.mjs`), and never stand in.
            const publicCodes = new Set(
                Object.entries(codesReadByClass)
                    .filter(([cls]) => !PRIVATE_SHEET_CLASSES.includes(cls))
                    .flatMap(([, codes]) => [...codes]),
            );
            const unreadCodes = CODES_REQUIRED.filter((code) => !publicCodes.has(code));
            if (unreadCodes.length > 0) {
                verdicts.push(`a-code-keeps-its-quiet-zone-white read no quiet zone on ${unreadCodes.join(', ')}`);
            }
        }
        if (PRIVATE_SHEET_CLASSES.length > 0) {
            // Every carried look on its own tallies (8e2, the 8e2 critic's
            // item 1): its line skips against its own ceiling, its points
            // behind a clip, the codes owed by name on its own jobs. A
            // carried look with no ceiling of its own fails here.
            const { faults, notes } = carriedTallyFaults({
                carried: CARRIED.looks,
                lineSkips: privateLineSkips,
                clip: clipSeen,
                clipCeiling: CLIP_SKIP_CEILING,
                codesRead: codesReadByClass,
                codesRequired: CODES_REQUIRED,
            });
            verdicts.push(...faults);
            for (const note of notes) console.log(`  ${note}`);
            if (faults.length === 0) {
                const said = PRIVATE_SHEET_CLASSES.map((cls) =>
                    ['mobile', 'desktop', 'canvas']
                        .map((vp) => `${vp} ${privateLineSkips[cls]?.[vp]?.['clipped-away'] ?? 0}/${privateLineSkips[cls]?.[vp]?.['not-rendered'] ?? 0}`)
                        .join(', ') +
                    ' · points behind a clip ' +
                    ['mobile', 'desktop', 'canvas']
                        .map((vp) => `${vp} ${clipSeen[cls]?.[vp]?.skips ?? 0}/${(clipSeen[cls]?.[vp]?.skips ?? 0) + (clipSeen[cls]?.[vp]?.checks ?? 0)}`)
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
                        `at least ${Number.isFinite(ringLeastPerChar) ? ringLeastPerChar.toFixed(1) : '-'} glyph pixels a character) — ${took()}` +
                        `\n    faces: every face loaded before the first job on all ${contrastFacePages.length} contrast pages` +
                        ` (the first: ${contrastFacePages[0] ?? 'none'})` +
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
        }
    } catch (err) {
        failed = true;
        console.error(`✗ contrast: ${err.message} (on ${currentStep}) — ${took()}`);
    }
    if (refused.length > 0) {
        failed = true;
        console.error(`✗ contrast: ${refused.length} job(s) refused — what the page answered is not the job:`);
        for (const line of refused) console.error(`    ${line}`);
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
    // run is exactly the one whose phases someone needs to read.
    for (const line of phaseTable(performance.now() - contrastStartedAt)) console.log(line);

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
        currentStep = 'transparency: loading the canvas page';
        await cdp.send('Page.navigate', { url: probeUrl(CANVAS, '&screens=') }, sessionId);
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
                    echo(paintEcho({ screen, look: theme, flags, sheetClass }, prep, nonce, CANVAS.width, CANVAS.height));
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
                        shot.width === CANVAS.width && shot.height === CANVAS.height
                            ? []
                            : [`the shot is ${shot.width}x${shot.height} where the job is ${CANVAS.width}x${CANVAS.height}`];
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
                    echo(liveEcho(firstRead, nonce, CANVAS.width, CANVAS.height));
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
                    dumpJobs.push(record);
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
                        echo(liveEcho(again, nonce, CANVAS.width, CANVAS.height));
                        if (again.boxes.length === targets.length) targets = again.boxes;
                        ({ found, values } = sample(img));
                    }
                    for (const { t, ground, worst } of values) {
                        dumpBoxes.push({
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
                },
                jobs: dumpJobs,
                boxes: dumpBoxes,
            },
            { looks: kind, stamp, rev },
        );
        console.log(`  contrast dump: ${dumpBoxes.length} boxes over ${dumpJobs.length} jobs → ${path}`);
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
