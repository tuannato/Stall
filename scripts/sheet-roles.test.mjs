import { strict as assert } from 'node:assert';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { SERVED_SHEETS, SHEET_ROLE_NAMES, appSheets, sheetsWithRole } from './sheet-roles.mjs';
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
        for (const m of text.matchAll(/(?:import\s*(?:[\w{}\s,*]+from\s*)?|import\(\s*)['"]([^'"]+\.css)(?:\?[a-z]+)?['"]/g)) {
            found.push({ from: rel(file), path: rel(resolve(dirname(file), m[1])) });
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
        assert.deepEqual(
            sheets.filter((path) => !inTable.has(path)),
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

    it('holds a well-formed table: every path exists once, every role is known, every look names its class', () => {
        assert.equal(inTable.size, SERVED_SHEETS.length, 'a path listed twice');
        for (const sheet of SERVED_SHEETS) {
            assert.ok(existsSync(join(ROOT, sheet.path)), `${sheet.path} is on disk`);
            assert.ok(SHEET_ROLE_NAMES.includes(sheet.role), `${sheet.path}: role ${sheet.role}`);
            const scoped = sheet.role === 'look' || sheet.role === 'kit';
            assert.equal(sheet.lookClass !== undefined, scoped, `${sheet.path}: a class exactly on a look or the kit`);
            if (sheet.role === 'look') {
                assert.equal(sheet.path, `src/ui/theme-${sheet.lookClass.replace(/^t-/, '')}.css`, sheet.path);
            }
        }
        assert.deepEqual(
            sheetsWithRole('kit').map((s) => s.path),
            ['workshop/theme-workshop.css'],
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
