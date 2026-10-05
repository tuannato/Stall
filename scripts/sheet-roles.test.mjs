import { strict as assert } from 'node:assert';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { privateLooksModuleCode } from './private-looks-build.mjs';
import { guardSheets, privateRows } from './served-sheets.mjs';
import { SERVED_SHEETS, SHEET_LOADS, SHEET_ROLE_NAMES, appSheets, lookSheets, sheetsWithRole, wornSheets } from './sheet-roles.mjs';
import { parseSheet, splitTopLevel } from './workshop-css.mjs';

/**
 * The role table (`sheet-roles.mjs`) against the tree: a sheet the app, the
 * kit or Pages serves and the table does not name is a sheet no guard reads.
 *
 * `node --test` rather than vitest: the table is an `.mjs`, and the TS
 * readers (`theme-sheets.test.ts`) reach it through its `.d.mts`.
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const rel = (path) => relative(ROOT, path).replaceAll('\\', '/');
const inTable = new Set(SERVED_SHEETS.map((sheet) => sheet.path));

/**
 * The tracked fixture of a private look repository (step 8,
 * `scripts/private-looks.mjs`): its sheets are a private look's, served by
 * no build until a run selects that directory, so they are no row of this
 * table — they are the merged list's (`scripts/served-sheets.mjs`), which
 * reads them through the fixture's index at HEAD, as every static guard
 * does. Exactly the `<slug>/sheet.css` its index names: any other
 * stylesheet under it is one the table must name, and is not.
 */
const PRIVATE_FIXTURE = 'layout/fixture-private-looks';
const privateFixtureSheets = privateRows(await guardSheets())
    .filter((row) => row.look.source === 'fixture')
    .map((row) => row.path);

function walk(dir, keep) {
    const out = [];
    if (!existsSync(dir)) return out;
    for (const name of readdirSync(dir)) {
        if (name === 'node_modules' || name.startsWith('.')) continue;
        const path = join(dir, name);
        if (statSync(path).isDirectory()) out.push(...walk(path, keep));
        else if (keep(path)) out.push(path);
    }
    return out;
}

/** Every stylesheet a source file loads: `import './x.css'` (with or without `?url`, `?inline`, `?raw`), `<link rel="stylesheet">`, `@import`. */
function loadedSheets() {
    const found = [];
    const scripts = ['src', 'layout', 'functions'].flatMap((dir) =>
        walk(join(ROOT, dir), (p) => /\.(ts|mts|js|mjs)$/.test(p) && !/\.test\.(ts|mjs)$/.test(p)),
    );
    for (const file of scripts) {
        const text = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
        for (const m of text.matchAll(/(?:import\s*(?:[\w{}\s,*]+from\s*)?|import\(\s*)['"]([^'"]+\.css)(?:\?([a-z]+))?['"]/g)) {
            found.push({ from: rel(file), path: rel(resolve(dirname(file), m[1])), query: m[2] ?? '' });
        }
    }
    const pages = [join(ROOT, 'index.html'), ...walk(join(ROOT, 'layout'), (p) => p.endsWith('.html')), ...walk(join(ROOT, 'public'), (p) => p.endsWith('.html'))];
    for (const file of pages) {
        const text = readFileSync(file, 'utf8');
        for (const m of text.matchAll(/<link\b[^>]*\brel=["']stylesheet["'][^>]*>/gi)) {
            const href = /\bhref=["']([^"']+)["']/i.exec(m[0])?.[1];
            if (href === undefined) continue;
            // A root path is the app's own origin: `public/` in production,
            // the repository root under the kit's Vite server.
            const path = href.startsWith('/')
                ? existsSync(join(ROOT, 'public', href)) ? `public${href}` : href.slice(1)
                : rel(resolve(dirname(file), href));
            found.push({ from: rel(file), path });
        }
    }
    for (const sheet of SERVED_SHEETS) {
        const { nodes } = parseSheet(readFileSync(join(ROOT, sheet.path), 'utf8'));
        for (const node of nodes) {
            if (node.kind === 'at' && node.name === 'import') {
                const target = /['"]([^'"]+)['"]/.exec(node.prelude)?.[1] ?? node.prelude;
                found.push({ from: sheet.path, path: rel(resolve(dirname(join(ROOT, sheet.path)), target)) });
            }
        }
    }
    return found;
}

describe('every-served-sheet-is-on-the-guard-list', () => {
    it('names every stylesheet in the tree, with a role', () => {
        const sheets = ['src', 'layout', 'workshop', 'public', 'functions']
            .flatMap((dir) => walk(join(ROOT, dir), (p) => p.endsWith('.css')))
            .map(rel);
        assert.ok(sheets.includes('src/ui/stall.css'), 'the walk found the base sheet');
        // The private fixture's own sheet is in the walk, or the exception
        // below is an exception for nothing.
        assert.ok(privateFixtureSheets.length > 0 && privateFixtureSheets.every((path) => path.startsWith(`${PRIVATE_FIXTURE}/`) && sheets.includes(path)), 'the walk found the private fixture sheet');
        assert.ok(privateFixtureSheets.every((path) => !inTable.has(path)), 'a private look sheet is not a served one');
        assert.deepEqual(
            sheets.filter((path) => !inTable.has(path) && !privateFixtureSheets.includes(path)),
            [],
            'a stylesheet the role table does not name',
        );
    });

    it('names every stylesheet the app, the kit or a page loads', () => {
        const loaded = loadedSheets();
        // The app's own imports and the kit's are all found, or the scan is blind.
        for (const path of ['src/ui/stall.css', 'src/ui/window.css', 'src/ui/obsGuide.css', 'workshop/theme-workshop.css', 'layout/gallery.css', 'public/stream.css']) {
            assert.ok(loaded.some((l) => l.path === path), `the scan found ${path} loaded`);
        }
        assert.deepEqual(
            loaded.filter((l) => !inTable.has(l.path)).map((l) => `${l.from} loads ${l.path}`),
            [],
        );
    });

    /**
     * A look sheet is loaded the way its `load` says, and no other: a
     * bundled one only as a side-effect import (into its page's entry CSS), a
     * worn-only one only as `?url` (its own built file, never inlined into
     * the CSS every visitor downloads — `?inline` and `?raw` would put it in
     * a script, a side effect in the entry CSS). The weight guard holds the
     * same in the built bytes (`a-worn-only-look-sheet-is-not-in-the-entry-css`).
     */
    it('loads each look sheet the way its load says: bundled as a side effect, worn only by ?url', () => {
        const loaded = loadedSheets();
        const wrong = [];
        for (const sheet of lookSheets()) {
            const loads = loaded.filter((l) => l.path === sheet.path);
            assert.ok(loads.length > 0, `${sheet.path} is loaded somewhere`);
            for (const l of loads) {
                if (l.query === undefined) continue; // a <link> or @import, read by path alone
                const ok = sheet.load === 'worn' ? l.query === 'url' : l.query === '';
                if (!ok) wrong.push(`${l.from} loads ${sheet.path}${l.query === '' ? ' as a side effect' : `?${l.query}`}, a ${sheet.load} sheet`);
            }
        }
        assert.deepEqual(wrong, []);
    });

    /**
     * A private look's sheet is loaded by no source file: its one road is
     * the build's virtual module, which imports each carried sheet by `?url`
     * (`privateLooksModuleCode`) — its own built file, never the entry CSS,
     * the worn-only road.
     */
    it("loads a private look's sheet by the virtual module's ?url import alone", () => {
        const loaded = loadedSheets();
        assert.deepEqual(loaded.filter((l) => privateFixtureSheets.includes(l.path)).map((l) => `${l.from} loads ${l.path}`), []);
        const code = privateLooksModuleCode([{ id: 4, sheetClass: 't-fixture-private', sheetPath: '/tmp/x/fixture/sheet.css', lookText: '{}' }]);
        assert.match(code, /^import sheet0 from "\/tmp\/x\/fixture\/sheet\.css\?url";$/m);
        assert.doesNotMatch(code, /import\s+["'][^"']+\.css["']/, 'never a side-effect import');
    });

    it('holds a well-formed table: every path exists once, every role is known, every look names its class', () => {
        assert.equal(inTable.size, SERVED_SHEETS.length, 'a path listed twice');
        for (const sheet of SERVED_SHEETS) {
            assert.ok(existsSync(join(ROOT, sheet.path)), `${sheet.path} is on disk`);
            assert.ok(SHEET_ROLE_NAMES.includes(sheet.role), `${sheet.path}: role ${sheet.role}`);
            const scoped = ['look', 'kit', 'fixture'].includes(sheet.role);
            assert.equal(sheet.lookClass !== undefined, scoped, `${sheet.path}: a class exactly on a look, the kit or the fixture`);
            assert.equal(sheet.load !== undefined, scoped, `${sheet.path}: a load exactly on a look sheet`);
            if (scoped) assert.ok(SHEET_LOADS.includes(sheet.load), `${sheet.path}: load ${sheet.load}`);
            assert.equal(sheet.artDir !== undefined, sheet.load === 'worn', `${sheet.path}: an art directory exactly on a worn-only sheet`);
            if (sheet.artDir !== undefined) {
                assert.ok(existsSync(join(ROOT, sheet.artDir)) && statSync(join(ROOT, sheet.artDir)).isDirectory(), `${sheet.artDir} is a directory`);
            }
            if (sheet.role === 'look') {
                assert.equal(sheet.path, `src/ui/theme-${sheet.lookClass.replace(/^t-/, '')}.css`, sheet.path);
            }
        }
        assert.deepEqual(
            sheetsWithRole('kit').map((s) => s.path),
            ['workshop/theme-workshop.css'],
        );
        // The harness's worn-only look: one sheet, under `layout/`, which the
        // production build never reaches (`gallery-is-not-served`).
        assert.deepEqual(
            sheetsWithRole('fixture').map((s) => [s.path, s.lookClass, s.load]),
            [['layout/fixture-look.css', 't-fixture-worn', 'worn']],
        );
        assert.deepEqual(
            appSheets().map((s) => s.role),
            SERVED_SHEETS.filter((s) => ['base', 'look', 'screen'].includes(s.role)).map((s) => s.role),
        );
    });

    it('lists a look sheet for every shipped look, by the class the theme table paints', async () => {
        const theme = await import('../src/domain/theme.ts');
        const classes = theme.SHIPPED_THEMES.map(({ id }) => theme.decodeTheme(id).sheetClass).sort();
        assert.deepEqual(
            sheetsWithRole('look').map((s) => s.lookClass).sort(),
            classes,
        );
    });

    /**
     * `every-look-row-loads-its-sheet-the-way-its-role-says`: a shipped
     * look's `load` in this table is its theme row's `sheetLoad`, so the
     * weight guard (which reads the table) and the renderer (which reads the
     * row) cannot disagree about which sheet every visitor downloads. The
     * kit is loaded with the showroom and the probe, bundled, until step 8;
     * the fixture is the one worn-only sheet, and it is no row.
     */
    it('every-look-row-loads-its-sheet-the-way-its-role-says', async () => {
        const theme = await import('../src/domain/theme.ts');
        for (const { id } of theme.SHIPPED_THEMES) {
            const row = theme.decodeTheme(id);
            const sheet = sheetsWithRole('look').find((s) => s.lookClass === row.sheetClass);
            assert.ok(sheet !== undefined, `${row.sheetClass} has a sheet`);
            assert.equal(sheet.load, row.sheetLoad, `${row.sheetClass}: the table says ${sheet.load}, the row ${row.sheetLoad}`);
        }
        assert.deepEqual(lookSheets().map((s) => s.role).sort(), ['fixture', 'kit', 'look', 'look', 'look']);
        assert.deepEqual(wornSheets().map((s) => s.path), ['layout/fixture-look.css']);
        const shippedClasses = theme.SHIPPED_THEMES.map(({ id }) => theme.decodeTheme(id).sheetClass);
        assert.ok(!shippedClasses.includes('t-fixture-worn'), 'the fixture is never a row');
    });

    it('marks shadowedByLooks exactly on the base and screen sheets that carry no per-look rule', () => {
        // The flag is audit-shadowing.mjs's base list; held to the sheets'
        // own selectors so it cannot drift from what it claims.
        const looks = sheetsWithRole('look').map((s) => s.lookClass);
        const perLook = new RegExp(`\\.(${looks.join('|')})(?![\\w-])`);
        for (const sheet of sheetsWithRole('base', 'screen')) {
            const { nodes } = parseSheet(readFileSync(join(ROOT, sheet.path), 'utf8'));
            const selectors = [];
            const visit = (list) => {
                for (const node of list) {
                    if (node.kind === 'rule') selectors.push(...splitTopLevel(node.prelude, ','));
                    else if (node.children !== undefined) visit(node.children);
                }
            };
            visit(nodes);
            const dresses = selectors.some((selector) => perLook.test(selector));
            assert.equal(sheet.shadowedByLooks === true, !dresses, `${sheet.path}: shadowedByLooks`);
        }
        for (const sheet of SERVED_SHEETS.filter((s) => !['base', 'screen'].includes(s.role))) {
            assert.equal(sheet.shadowedByLooks, undefined, `${sheet.path}: only a base or screen sheet is audited`);
        }
    });
});
