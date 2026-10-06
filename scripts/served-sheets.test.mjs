import { strict as assert } from 'node:assert';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { formatReport, shadowingReport } from './audit-shadowing.mjs';
import { REQUIRED_ENV, SELECTION_ENV, withoutSelection } from './looks-selection.mjs';
import { PLANTED_CLASS, beforeReduce, plantLooks, removePlants } from './private-looks-plant.mjs';
import { PRIVATE_ROLE, guardLine, guardSheets, lookRows, privateLookReads, privateRows, servedSheets } from './served-sheets.mjs';
import { SERVED_SHEETS } from './sheet-roles.mjs';

/**
 * The one list of every sheet a run serves (`scripts/served-sheets.mjs`,
 * step 8e1), what it reads, and that every static guard over stylesheets
 * reads it — so a private look's sheet cannot be skipped by one guard while
 * another reads it. Also the audit's private half, which reads the same
 * list. Planted repositories outside this checkout; git runs locally and
 * only locally.
 *
 * `node --test`, like the other scripts' tests: a TypeScript test importing
 * these `.mjs` modules breaks `tsc` (TS7016).
 */

after(removePlants);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURE = 'layout/fixture-private-looks';
const head = () => execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
const atHead = (path) => execFileSync('git', ['show', `HEAD:${path}`], { cwd: ROOT, encoding: 'utf8' });

describe('the-served-sheets-are-the-role-table-and-the-private-looks-a-run-reads', () => {
    it('is the role table, each sheet with its text from the disk, when nothing is selected', async () => {
        const sheets = await servedSheets({ env: {} });
        assert.deepEqual(
            sheets.map((sheet) => [sheet.path, sheet.role]),
            SERVED_SHEETS.map((sheet) => [sheet.path, sheet.role]),
        );
        for (const sheet of sheets) {
            assert.equal(sheet.css, readFileSync(join(ROOT, sheet.path), 'utf8'), sheet.path);
        }
        assert.deepEqual(privateRows(sheets), []);
    });

    it('adds the tracked fixture for the guards, read from git at HEAD as a worn-only look sheet', async () => {
        const rows = privateRows(await servedSheets({ env: {}, fixture: true }));
        const index = JSON.parse(atHead(`${FIXTURE}/index.json`));
        assert.deepEqual(
            rows.map((row) => [row.path, row.role, row.lookClass, row.load, row.look.source, row.look.commit]),
            index.looks.map((entry) => [`${FIXTURE}/${entry.slug}/sheet.css`, PRIVATE_ROLE, entry.cls, 'worn', 'fixture', head()]),
        );
        const [row] = rows;
        assert.equal(row.css, atHead(`${FIXTURE}/fixture/sheet.css`));
        assert.equal(row.look.lookText, atHead(`${FIXTURE}/fixture/look.json`));
        assert.deepEqual(row.ownArt, { dir: 'art', files: ['ground.svg'] });
        assert.equal(row.artDir, `${FIXTURE}/fixture/art`);
        assert.equal(row.look.fontsText, undefined);
        assert.deepEqual(lookRows([row]), [row]);
    });

    it('adds the looks a selection carries, beside the fixture, and none its target leaves out', async () => {
        const repo = plantLooks();
        const preview = privateRows(await servedSheets({ env: repo.selection, fixture: true, gitEnv: repo.env }));
        assert.deepEqual(
            preview.map((row) => [row.lookClass, row.look.source]),
            [
                ['t-fixture-private', 'fixture'],
                [PLANTED_CLASS, 'selection'],
            ],
        );
        assert.equal(preview[1].look.commit, repo.head());
        assert.equal(preview[1].path, `${repo.dir}/fixture/sheet.css`);
        // The planted look is at `preview` and nothing releases its id: a production selection carries none of it.
        const production = { ...repo.selection, [SELECTION_ENV.target]: 'production' };
        const rows = privateRows(await servedSheets({ env: production, fixture: true, gitEnv: repo.env }));
        assert.deepEqual(rows.map((row) => row.look.source), ['fixture']);
        // Without the fixture, the selection alone: what a build with it serves.
        assert.deepEqual(
            (await privateLookReads({ env: repo.selection, gitEnv: repo.env })).map((look) => look.entry.cls),
            [PLANTED_CLASS],
        );
    });

    it('reads the fixture once when the selection names it, and refuses one at another commit beside the guards\' HEAD', async () => {
        const selected = { [SELECTION_ENV.target]: 'production', [SELECTION_ENV.dir]: FIXTURE, [SELECTION_ENV.commit]: head() };
        const rows = privateRows(await servedSheets({ env: selected, fixture: true }));
        assert.deepEqual(rows.map((row) => [row.lookClass, row.look.source, row.look.commit]), [['t-fixture-private', 'fixture', head()]]);
        // The 8e1 critic's item 7: a selected commit would have replaced the
        // HEAD fixture every guard reads. Refused for the guards; what a build
        // with it serves (no `fixture`) still reads it at its commit.
        const elsewhere = { ...selected, [SELECTION_ENV.commit]: 'ab'.repeat(20) };
        await assert.rejects(servedSheets({ env: elsewhere, fixture: true }), /the guards read the fixture at HEAD/);
        // Selected alone at production, the fixture is carried by no build: none.
        assert.deepEqual(privateRows(await servedSheets({ env: selected })), []);
        // At preview, alone: the fixture, as the selection.
        const preview = { ...selected, [SELECTION_ENV.target]: 'preview' };
        assert.deepEqual(privateRows(await servedSheets({ env: preview })).map((row) => row.look.source), ['selection']);
    });

    it('throws on half a selection, a repository the public lists refuse and a look.json that is not JSON — a guard never reads half a look', async () => {
        await assert.rejects(servedSheets({ env: { [SELECTION_ENV.target]: 'preview' } }), /the selection is not whole/);
        const freed = plantLooks((path, text) => (path === 'index.json' ? text.replace('"paid": true', '"paid": false') : text));
        await assert.rejects(servedSheets({ env: freed.selection, gitEnv: freed.env }), /paid is false, and PAID_LOOK_IDS says true/);
        // The 8e1 critic's item 6: read as a look with no rows, it was checked less, silently.
        const broken = plantLooks((path, text) => (path === 'fixture/look.json' ? text.slice(0, -2) : text));
        await assert.rejects(servedSheets({ env: broken.selection, gitEnv: broken.env, fixture: true }), /fixture\/look\.json at [0-9a-f]{40} is not JSON/);
    });

    it('requires the selection the build carries when STALL_LOOKS_REQUIRED is set, and says which looks the guards read', async () => {
        // The 8e1 critic's item 2: a run whose selection was dropped read the fixture alone, green.
        await assert.rejects(servedSheets({ env: {}, fixture: true, required: true }), /STALL_LOOKS_REQUIRED is set and this run selects no private look/);
        const repo = plantLooks();
        const rows = privateRows(await servedSheets({ env: repo.selection, gitEnv: repo.env, fixture: true, required: true }));
        assert.deepEqual(rows.map((row) => row.lookClass), ['t-fixture-private', PLANTED_CLASS]);
        assert.equal(
            guardLine(rows),
            `guards read private looks: t-fixture-private (fixture @${head().slice(0, 12)}), ${PLANTED_CLASS} (selection @${repo.head().slice(0, 12)})\n`,
        );
        assert.equal(guardLine([]), 'guards read private looks: none\n');
        // Through guardSheets itself, in a process of its own: the line on stderr, and the refusal.
        const run = (env) =>
            spawnSync(process.execPath, ['--input-type=module', '-e', "await (await import('./scripts/served-sheets.mjs')).guardSheets();"], {
                cwd: ROOT,
                env: { ...withoutSelection(process.env), ...env },
                encoding: 'utf8',
            });
        const said = run(repo.selection);
        assert.equal(said.status, 0, said.stderr);
        assert.match(said.stderr, new RegExp(`^guards read private looks: t-fixture-private \\(fixture @[0-9a-f]{12}\\), ${PLANTED_CLASS} \\(selection @[0-9a-f]{12}\\)$`, 'm'));
        const required = run({ [REQUIRED_ENV]: '1' });
        assert.notEqual(required.status, 0, 'a required run with no selection read the guards');
        assert.match(required.stderr, /STALL_LOOKS_REQUIRED is set and this run selects no private look/);
        assert.equal(run({ ...repo.selection, [REQUIRED_ENV]: '1' }).status, 0);
    });

    it('is what the guards read, once per process', async () => {
        assert.equal(await guardSheets(), await guardSheets());
        assert.ok(privateRows(await guardSheets()).some((row) => row.look.source === 'fixture'));
    });
});

/** Every source file under the directories that hold guards: `.ts` and `.mjs`, no declaration file. */
function sources() {
    const out = [];
    const walk = (dir) => {
        if (!existsSync(dir)) return;
        for (const name of readdirSync(dir)) {
            if (name === 'node_modules' || name.startsWith('.')) continue;
            const path = join(dir, name);
            if (statSync(path).isDirectory()) walk(path);
            else if (/\.(ts|mjs)$/.test(name) && !/\.d\.(ts|mts)$/.test(name)) out.push(relative(ROOT, path).split('\\').join('/'));
        }
    };
    for (const dir of ['scripts', 'src', 'layout', 'workshop', 'functions']) walk(join(ROOT, dir));
    return out;
}

const importsOf = (path, module) =>
    new RegExp(`from\\s+['"](?:\\.{1,2}/)+(?:scripts/)?${module.replace('.', '\\.')}['"]`).test(readFileSync(join(ROOT, path), 'utf8'));

/**
 * Whether a source reads a stylesheet by itself: a `readFileSync(` or
 * `readdirSync(` whose call — up to the end of its statement — names `.css`
 * or `theme-` (the 8e1 critic's item 3: the first version saw only an
 * import of the role table, and a test reading `theme-${look}.css` by path
 * held three looks' ladders where a private look's went unread).
 */
function readsSheetsByFs(path) {
    const text = readFileSync(join(ROOT, path), 'utf8');
    for (const m of text.matchAll(/\b(?:readFileSync|readdirSync)\(/g)) {
        const call = text.slice(m.index, m.index + 240).split(/;\n|\n\s*\n/)[0];
        if (/\.css|theme-/.test(call)) {
            return true;
        }
    }
    return false;
}

describe('every-whole-sheet-guard-reads-the-served-sheets', () => {
    /**
     * Every file that reads stylesheets as a guard reads them through
     * `served-sheets.mjs` (and holds that it read a private look's), and
     * every file that reads the public role table, or a stylesheet by its
     * path, without it does so for a reason written here — the public table
     * is the public build's, and reading it alone is a choice, never a
     * default a new guard falls into.
     */
    const GUARDS = [
        'layout/lookMarks.test.ts',
        'layout/looks.test.ts',
        'scripts/audit-shadowing.mjs',
        'scripts/fonts.test.mjs',
        'scripts/look-faces.test.mjs',
        'scripts/look-flash.mjs',
        'scripts/look-lint.test.mjs',
        'scripts/served-faces.test.mjs',
        'scripts/sheet-roles.test.mjs',
        'src/bundle.test.ts',
        'src/ui/decor-gate.test.ts',
        'src/ui/theme-sheets.test.ts',
    ];
    const READS_ALONE = {
        'scripts/served-sheets.mjs': 'the merged list itself: the role table, then the private looks',
        'scripts/served-sheets.test.mjs': 'holds the merged list to the public table it starts with',
        'scripts/sheet-roles.test.mjs': 'holds the public table to the tree, and admits the private fixture by the merged list',
        'scripts/look-lint.test.mjs': 'pins the shipped looks, the kit and the harness fixture by value, beside its served-sheet reads',
        'scripts/private-looks-build.mjs':
            'the build: the public table from the disk beside the looks it carries, for the checks that need every sheet at once (`crossSheetProblems`) — the merged list imports the build, so the build reads its own',
        'scripts/private-looks.test.mjs': "compares the fixture's sheet read from git with the disk: a test of the reader, no guard",
        'scripts/workshop.mjs': 'builds a kit starter out of a shipped look and the screen sheets it carries: no guard',
        'scripts/layout-check.mjs':
            "derives the shipped look classes it expects to see painted from the table's look rows, beside the private ones the selection carries (8e2): no guard over a sheet's text",
        'scripts/workshop-lint.test.mjs': "the kit's own sheet and a creator's scratch sheet, the kit lint's subjects",
        'layout/workshopStarter.test.ts': "the kit's starters, the kit's subject",
        'layout/auroraTide.test.ts': "stall.css's aurora rules, a shipped row's",
        'layout/anchorColour.test.ts':
            'renders the shipped looks; no look sheet, shipped or private, brings the browser\'s link colour back (the look lint refuses `revert` and `revert-layer` on `color` and `all`), and an anchor under a private look is read by the probe\'s contrast pass under every look a selection carries (8e2: the guide and wearing links are contrast targets)',
        'src/bundle.test.ts':
            "the built buckets: a vitest build carries no private look (the virtual module is empty under vitest), so its worn sheets are the table's; every private look the merged list reads is weighed from its source and on a deploy build of its own (8e2)",
        'src/ui/theme-sheets.test.ts': "the emit side of the var table is the public build's: a var only a private sheet read is dead there",
        'src/ui/decor-ground-inks.test.ts':
            "the confetti and the rays are Rural's and Modern's rows; a private sheet's rules sit under its own class (the look lint), which never stands beside them",
        'src/ui/obsGuide.test.ts':
            "obsGuide.css's own declarations for its own screen; what a look sheet restates over a base sheet is the audit's to list (`shadowingReport`) and the probe's to measure",
        'src/ui/window.test.ts': "window.css's own declarations for the wall; the same",
        'src/ui/render.hooks.test.ts': "stall.css's zoom reset, the base's own declarations for the zoom it renders; the same",
        'src/ui/render.test.ts':
            "the base and screen sheets' own declarations for the screens it renders; the per-look ladders it held moved to theme-sheets.test.ts over the served sheets (8e1)",
    };

    it('finds every guard reading the served sheets', () => {
        for (const path of GUARDS) {
            assert.ok(importsOf(path, 'served-sheets.mjs') || importsOf(path, 'look-flash.mjs'), `${path} reads the served sheets`);
        }
        assert.ok(importsOf('scripts/look-flash.mjs', 'served-sheets.mjs'));
    });

    it('lets the public table, or a stylesheet by its path, be read alone only where a reason is written', () => {
        const all = sources();
        const tableReaders = all.filter((path) => importsOf(path, 'sheet-roles.mjs'));
        const fsReaders = all.filter((path) => readsSheetsByFs(path));
        assert.ok(tableReaders.includes('scripts/served-sheets.mjs'), 'the import scan is not blind');
        assert.ok(fsReaders.includes('src/ui/render.test.ts') && fsReaders.includes('layout/looks.test.ts') === false, 'the read scan is not blind, and a guard that moved off the disk is not one');
        const servesItself = (path) => importsOf(path, 'served-sheets.mjs') || importsOf(path, 'look-flash.mjs');
        const unexplained = [
            ...tableReaders.filter((path) => READS_ALONE[path] === undefined),
            ...fsReaders.filter((path) => !servesItself(path) && READS_ALONE[path] === undefined),
        ];
        assert.deepEqual([...new Set(unexplained)], [], 'a reader of the public table, or of a stylesheet by its path, with no reason written');
        const readers = new Set([...tableReaders, ...fsReaders]);
        assert.deepEqual(Object.keys(READS_ALONE).filter((path) => !readers.has(path)), [], 'a reason for a reader that is gone');
    });

});

describe('the-audit-counts-a-private-look-as-a-look', () => {
    /**
     * `audit-shadowing.mjs` names deletion candidates: a var every look's
     * sheet overrides at every consumer. A private look is a look a deploy
     * build carries, so it is counted — a var it does not override, or reads
     * itself, is never a candidate — and a worn look's restatement of
     * `broadcast.css` is listed, since it lands after that sheet.
     */
    it('reports candidates over the public sheets, and none once a look that overrides nothing is counted', async () => {
        const publicOnly = shadowingReport(await servedSheets({ env: {} }));
        assert.ok(publicOnly.SHADOWED.length > 0, 'the public sheets have deletion candidates');
        assert.match(formatReport(publicOnly)[0], /^Private looks read: none/);
        const withFixture = shadowingReport(await servedSheets({ env: {}, fixture: true }));
        assert.deepEqual(withFixture.SHADOWED, [], 'the fixture overrides nothing, so nothing is a candidate');
        assert.match(formatReport(withFixture)[0], /^Private looks read: t-fixture-private\.$/);
    });

    it('marks a var a private look reads as read, and lists what a worn look restates of broadcast.css', async () => {
        const name = shadowingReport(await servedSheets({ env: {} })).SHADOWED[0].name;
        const repo = plantLooks((path, text) =>
            path === 'fixture/sheet.css'
                ? beforeReduce(text, `.${PLANTED_CLASS} .x { color: var(${name}); }\n.stall.${PLANTED_CLASS}.broadcast .plate { background: red; }`)
                : text,
        );
        const report = shadowingReport(await servedSheets({ env: repo.selection, gitEnv: repo.env }));
        const entry = [...report.SHADOWED, ...report.PARTIAL, ...report.CLEAN].find((e) => e.name === name);
        assert.ok(entry.read?.includes('sheet.css'), `${name} is read by the planted look: ${JSON.stringify(entry)}`);
        const worn = report.wornOverBroadcast.find((look) => look.path.endsWith('/fixture/sheet.css'));
        // Its `background` cancels the overlay's `background-color` on the same plate.
        assert.ok(worn.pairs.includes('.stall.broadcast .plate background-color'), JSON.stringify(worn));
    });
});
