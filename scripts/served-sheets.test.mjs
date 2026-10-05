import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { formatReport, shadowingReport } from './audit-shadowing.mjs';
import { SELECTION_ENV } from './looks-selection.mjs';
import { PLANTED_CLASS, beforeReduce, plantLooks, removePlants } from './private-looks-plant.mjs';
import { PRIVATE_ROLE, guardSheets, lookRows, privateLookReads, privateRows, servedSheets } from './served-sheets.mjs';
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

    it('reads the fixture once when the selection names it, at the selection\'s commit', async () => {
        const selected = { [SELECTION_ENV.target]: 'production', [SELECTION_ENV.dir]: FIXTURE, [SELECTION_ENV.commit]: head() };
        const rows = privateRows(await servedSheets({ env: selected, fixture: true }));
        assert.deepEqual(rows.map((row) => [row.lookClass, row.look.source, row.look.commit]), [['t-fixture-private', 'fixture', head()]]);
        // Selected alone at production, the fixture is carried by no build: none.
        assert.deepEqual(privateRows(await servedSheets({ env: selected })), []);
        // At preview, alone: the fixture, as the selection.
        const preview = { ...selected, [SELECTION_ENV.target]: 'preview' };
        assert.deepEqual(privateRows(await servedSheets({ env: preview })).map((row) => row.look.source), ['selection']);
    });

    it('throws on half a selection, and on a repository the public lists refuse — a guard never reads half a look', async () => {
        await assert.rejects(servedSheets({ env: { [SELECTION_ENV.target]: 'preview' } }), /the selection is not whole/);
        const freed = plantLooks((path, text) => (path === 'index.json' ? text.replace('"paid": true', '"paid": false') : text));
        await assert.rejects(servedSheets({ env: freed.selection, gitEnv: freed.env }), /paid is false, and PAID_LOOK_IDS says true/);
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

describe('every-whole-sheet-guard-reads-the-served-sheets', () => {
    /**
     * Every file that reads stylesheets as a guard reads them through
     * `served-sheets.mjs` (and holds that it read a private look's), and
     * every file that imports the public role table does so for a reason
     * written here — the public table is the public build's, and reading it
     * alone is a choice, never a default a new guard falls into.
     */
    const GUARDS = [
        'scripts/audit-shadowing.mjs',
        'scripts/fonts.test.mjs',
        'scripts/look-flash.mjs',
        'scripts/look-lint.test.mjs',
        'scripts/sheet-roles.test.mjs',
        'src/bundle.test.ts',
        'src/ui/decor-gate.test.ts',
        'src/ui/theme-sheets.test.ts',
    ];
    const PUBLIC_TABLE = {
        'scripts/served-sheets.mjs': 'the merged list itself: the role table, then the private looks',
        'scripts/served-sheets.test.mjs': 'holds the merged list to the public table it starts with',
        'scripts/sheet-roles.test.mjs': 'holds the public table to the tree, and admits the private fixture by the merged list',
        'scripts/look-lint.test.mjs': 'pins the shipped looks, the kit and the harness fixture by value, beside its served-sheet reads',
        'src/bundle.test.ts':
            'the built buckets: a vitest build carries no private look (the virtual module is empty under vitest), so its worn sheets are the table\'s; the private look\'s source budget reads the merged list',
        'src/ui/theme-sheets.test.ts': 'the emit side of the var table is the public build\'s: a var only a private sheet read is dead there',
        'src/ui/decor-ground-inks.test.ts':
            'the confetti and the rays are Rural\'s and Modern\'s rows; a private sheet\'s rules sit under its own class (the look lint), which never stands beside them',
        'layout/anchorColour.test.ts': 'renders the shipped looks; an anchor under a private look is the harness\'s to paint (8e2)',
    };

    it('finds every guard reading the served sheets', () => {
        for (const path of GUARDS) {
            assert.ok(importsOf(path, 'served-sheets.mjs') || importsOf(path, 'look-flash.mjs'), `${path} reads the served sheets`);
        }
        assert.ok(importsOf('scripts/look-flash.mjs', 'served-sheets.mjs'));
    });

    it('lets the public role table be read alone only where a reason is written', () => {
        const readers = sources().filter((path) => importsOf(path, 'sheet-roles.mjs'));
        assert.ok(readers.includes('scripts/served-sheets.mjs'), 'the scan is not blind');
        assert.deepEqual(readers.filter((path) => PUBLIC_TABLE[path] === undefined), [], 'a reader of the public table with no reason written');
        assert.deepEqual(Object.keys(PUBLIC_TABLE).filter((path) => !readers.includes(path)), [], 'a reason for a reader that is gone');
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
