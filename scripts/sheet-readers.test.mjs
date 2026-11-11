import { strict as assert } from 'node:assert';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

/**
 * `every-sheet-reader-descends-a-container-block` (STEP-WALL-CONTAINER): a
 * first-party look sheet may now hold `@container sw` blocks, so a reader
 * of a sheet that descends `@media` and skips other at-rules reads a look's
 * container rules as nothing — `ladderRules` glued a container block's
 * first selector to its prelude, and `audit-shadowing.mjs` skipped all of
 * window.css's container blocks. The census: every file under `scripts/`,
 * `layout/` and every `src/**\/*.test.ts` holding an `@media` literal or a
 * `'media'` node-name test is listed here, either as one that descends a
 * `@container` block (and then it names `container` somewhere, the least a
 * reader that descends one must do) or as not relevant, with the reason. An
 * unlisted file fails, and so does a listed file that no longer holds one.
 * "Not relevant" is allowed only where the reader reads no look sheet's
 * rules, or reads only what a container block may not hold
 * (`CONTAINER_LAYOUT`: no colour, ground, face, mask, motion or word).
 */
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SELF = 'scripts/sheet-readers.test.mjs';
const READS_MEDIA = /@media|'media'|"media"/;

/** Where a reader stands with `@container`: `descends`, or `not relevant: <reason>`. */
const SHEET_READERS = Object.freeze({
    'layout/cardLadder.test.ts': "not relevant: reads stall.css's own phone block for the card ladder, a base sheet with no container block",
    'layout/probe.ts':
        "descends: every CSSOM walk descends a grouping rule (`'cssRules' in rule`), a CSSContainerRule among them; `hideRulesNow` reads a rule under a container query as in force, which is conservative for a look's rule (read as the look's), stated and not changed",
    'layout/sheetNaming.test.ts': "not relevant: tests `sheetNamesAttribute` (workshop-css.mjs, listed), which walks every grouping node's children, a container block's among them",
    'layout/workshopStarter.test.ts': 'not relevant: the kit starter; the kit refuses @container (REFUSED_AT_RULES)',
    'scripts/audit-shadowing.mjs': 'descends: `parseRules` descends @media and @container as conditional (fixed in STEP-WALL-CONTAINER)',
    'scripts/look-lint.test.mjs': 'descends: the look lint walks a container block\'s rules like a top-level rule\'s (`lintLook`)',
    'scripts/looks-artifact.test.mjs': 'not relevant: counts "@" in an archive, reading no rule',
    'scripts/print-measure.mjs': 'not relevant: a docblock naming @media print; measures the print page, reading no sheet',
    'scripts/private-looks-build.test.mjs': 'not relevant: plants edit the reduce block by its text',
    'scripts/private-looks-plant.mjs': "not relevant: `beforeReduce` finds the reduce block by its text",
    'scripts/served-faces.test.mjs':
        "not relevant: tests the face readers (`private-faces.mjs`), which walk every grouping node's children; a face or a font-family cannot stand in a container block (the lint refuses both there)",
    'scripts/served-sheets.test.mjs': "descends: holds the audit's reading of a base sheet's @container blocks as conditional consumers",
    'scripts/workshop-build-check.mjs': 'not relevant: a baseline sheet literal, never a look\'s rules',
    'scripts/workshop-build-check.test.mjs': 'not relevant: a reduce-block literal in planted kits',
    'scripts/workshop-css.mjs': "descends: `parseSheet`'s GROUPING holds container, and the lint walks a first-party container block (`containerBlockProblems`)",
    'scripts/workshop-lint.mjs': 'not relevant: a docblock; the kit refuses @container',
    'scripts/workshop-lint.test.mjs': 'not relevant: the kit lint, which refuses @container',
    'src/bundle.test.ts': 'not relevant: a reduce-block literal in a planted kit',
    'src/ui/decor-gate.test.ts':
        "not relevant: a decoration's grounds, outlines, marks, masks and motion cannot stand in a container block (CONTAINER_LAYOUT refuses every one), and its rule readers take every innermost rule anyway, skipping only at-rule heads",
    'src/ui/decor-ground-inks.test.ts':
        'not relevant: reads stall.css and the root rules a decoration paints, every innermost rule; no ground or ink can stand in a container block — no container rule here',
    'src/ui/render.test.ts': "not relevant: reads stall.css's own named blocks by their text, a base sheet with no container block",
    'src/ui/theme-sheets.test.ts':
        "descends: `parseRules` descends @media and @container; `ladderRules` unwraps @container as well as @media (fixed in STEP-WALL-CONTAINER); the out-ranked test keeps a container head as the rule's condition",
    'src/ui/window.test.ts': "descends: reads window.css's own container blocks by their conditions",
});

/** Every code file of `root`'s `scripts/` and `layout/`, and every `src/**\/*.test.ts`, by its path from `root`. */
function codeFiles(root) {
    const out = [];
    const walk = (dir, keep) => {
        for (const name of readdirSync(join(root, dir))) {
            if (name === 'node_modules') continue;
            const path = dir === '' ? name : `${dir}/${name}`;
            if (statSync(join(root, path)).isDirectory()) walk(path, keep);
            else if (keep(path)) out.push(path);
        }
    };
    walk('scripts', (path) => /\.(?:m?js|m?ts)$/.test(path) && !path.endsWith('.d.mts'));
    walk('layout', (path) => /\.(?:m?js|m?ts)$/.test(path));
    walk('src', (path) => path.endsWith('.test.ts'));
    return out.sort();
}

/**
 * The census over `files` (`{ path: text }`): a reader of `@media` the list
 * does not name, a listed one that holds no `@media` read any more, a
 * listed one whose entry is neither `descends` nor `not relevant: …`, and
 * one listed as descending that never names `container`.
 */
function censusProblems(files, list = SHEET_READERS) {
    const out = [];
    const readers = Object.keys(files).filter((path) => path !== SELF && READS_MEDIA.test(files[path]));
    for (const path of readers) {
        if (!Object.hasOwn(list, path)) out.push(`${path} reads @media and says nothing of @container — list it in SHEET_READERS as "descends" or "not relevant: <reason>"`);
    }
    for (const [path, entry] of Object.entries(list)) {
        if (!readers.includes(path)) {
            out.push(`${path} is listed and holds no @media read any more (or is gone) — take it off the list`);
            continue;
        }
        const descends = /^descends(?::|$)/.test(entry);
        if (!descends && !/^not relevant: \S/.test(entry)) out.push(`${path}: "${entry.slice(0, 60)}…" is neither "descends" nor "not relevant: <reason>"`);
        if (descends && !/container/i.test(files[path])) out.push(`${path} is listed as descending @container and never names container`);
    }
    return out;
}

const FILES = Object.fromEntries(codeFiles(ROOT).map((path) => [path, readFileSync(join(ROOT, path), 'utf8')]));

describe('every-sheet-reader-descends-a-container-block', () => {
    it('lists every reader of @media in scripts/, layout/ and the src tests, each descending @container or not relevant with its reason', () => {
        assert.ok(Object.keys(FILES).length > 50, `read only ${Object.keys(FILES).length} files`);
        assert.deepEqual(censusProblems(FILES), []);
    });

    it('is red on an unlisted reader, a stale entry, an entry with no reason, and a descending reader that names no container', () => {
        const files = { 'scripts/a.mjs': "if (node.name === 'media') walk(node);", 'scripts/b.mjs': 'const x = 1;', 'scripts/c.mjs': '/* @media */', 'scripts/d.mjs': '@media' };
        const problems = censusProblems(files, { 'scripts/b.mjs': 'descends', 'scripts/c.mjs': 'it is fine', 'scripts/d.mjs': 'descends: it says so' });
        assert.ok(problems.some((p) => p.startsWith('scripts/a.mjs reads @media and says nothing')), problems.join('\n'));
        assert.ok(problems.some((p) => p.startsWith('scripts/b.mjs is listed and holds no @media')), problems.join('\n'));
        assert.ok(problems.some((p) => p.startsWith('scripts/c.mjs: "it is fine')), problems.join('\n'));
        assert.ok(problems.some((p) => p.startsWith('scripts/d.mjs is listed as descending @container and never names container')), problems.join('\n'));
    });
});
