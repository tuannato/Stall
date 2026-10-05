import { strict as assert } from 'node:assert';
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { artNamedBy, checkDist, distFiles, distLooksProblems, lookSheetNames } from './check-dist-looks.mjs';
import { publicLookFacts } from './private-looks.mjs';
import {
    FIXTURE_LOOKS_DIR,
    LOOKS_TARGETS,
    MATERIALISED_PREFIX,
    PRIVATE_LOOKS_MODULE,
    RESOLVED_MODULE,
    SELECTION_ENV,
    crossSheetProblems,
    includedEntries,
    jsString,
    privateLooksModuleCode,
    privateLooksPlugin,
    readSelectedLooks,
    selectedTree,
    selectionFromEnv,
} from './private-looks-build.mjs';
import { MAX_SVG_ELEMENTS, SVG_ELEMENTS, sanitizeSvg } from './svg-allow.mjs';
import { LOOK_FONTS_HEADING, noticedLicence } from './notices-lib.mjs';
import { LOOKS_ENV, REQUIRED_ENV } from './looks-selection.mjs';
import { PLANTED_CLASS, beforeReduce, oflText, plantLooks, removePlants, syntheticWoff2 } from './private-looks-plant.mjs';

/**
 * The private-look join at build time (`scripts/private-looks-build.mjs`,
 * step 8b2): the selection, the public lists, the reads from git, the
 * checks before Vite reads a byte, the module's source, the SVG allow-list,
 * byte identity and the dist check.
 *
 * `node --test`, beside `private-looks.test.mjs`: a TypeScript test
 * importing an `.mjs` breaks `tsc` (TS7016). The subjects are the tracked
 * fixture (`layout/fixture-private-looks/`, read from this checkout's HEAD
 * through the `prefix` road, as a build reads it) and repositories planted
 * outside this checkout — never a `looks/` clone that may or may not be on
 * this disk. The builds are real `vite build`s of this checkout, spawned with
 * the selection in their environment, as the deploy job will run them; they
 * reach no network (nothing in a build does). Git and the builds run locally
 * and only locally.
 */
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const VITE = join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
const facts = await publicLookFacts();
const { runnerImport } = await import('vite');
const { module: lookData } = await runnerImport(join(ROOT, 'src/domain/lookData.ts'), { configFile: false, logLevel: 'silent' });
/** The theme table's values, as `vite.config.ts` hands them to the plugin for the flash rule. */
const vars = await (await import('./look-flash.mjs')).themeVarValues();
/** The app's own validator, as `vite.config.ts` hands it to the plugin. */
const validateLook = (text, place) => lookData.lookDataProblems(text, place);

const scratch = [];
after(() => {
    for (const dir of scratch) {
        rmSync(dir, { recursive: true, force: true });
    }
});
const tempDir = (name) => {
    const dir = realpathSync(mkdtempSync(join(tmpdir(), `stall-${name}-`)));
    scratch.push(dir);
    return dir;
};

/** The tracked fixture's files as HEAD holds them, from the fixture's root. */
function trackedFixturePaths() {
    return execFileSync('git', ['ls-tree', '-r', '-z', '--name-only', 'HEAD', '--', FIXTURE_LOOKS_DIR], { cwd: ROOT, encoding: 'utf8' })
        .split('\0')
        .filter((path) => path !== '')
        .map((path) => path.slice(FIXTURE_LOOKS_DIR.length + 1));
}

/**
 * A private repository outside this checkout: the tracked fixture's files,
 * its class renamed to `t-planted-look` so it is an ordinary private look's
 * (the fixture's class is the fixture's alone), each file passed through
 * `edit(path, text)` before the commit. No global or system config.
 */
function plantRepo(edit = (_path, text) => text) {
    const dir = tempDir('planted-looks');
    const xdg = tempDir('planted-looks-xdg');
    const env = {
        ...process.env,
        GIT_CONFIG_GLOBAL: '/dev/null',
        GIT_CONFIG_NOSYSTEM: '1',
        XDG_CONFIG_HOME: xdg,
        GIT_AUTHOR_NAME: 'plant',
        GIT_AUTHOR_EMAIL: '',
        GIT_COMMITTER_NAME: 'plant',
        GIT_COMMITTER_EMAIL: '',
    };
    const git = (...args) => execFileSync('git', args, { cwd: dir, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    git('init', '-q', '-b', 'main', '.');
    for (const path of trackedFixturePaths()) {
        mkdirSync(join(dir, dirname(path)), { recursive: true });
        // As HEAD holds it: the commit the build and the guards read the fixture at.
        const text = execFileSync('git', ['show', `HEAD:${FIXTURE_LOOKS_DIR}/${path}`], { cwd: ROOT, encoding: 'utf8' }).replaceAll('t-fixture-private', 't-planted-look');
        writeFileSync(join(dir, path), edit(path, text));
    }
    git('add', '-A');
    git('commit', '-q', '-m', 'planted');
    return { dir, env, git, head: () => git('rev-parse', 'HEAD') };
}

const readPlanted = (repo, over = {}) =>
    readSelectedLooks({ root: ROOT, selection: { target: 'preview', dir: repo.dir, ...over }, facts, validateLook, vars, env: repo.env });

/** A `vite build` of this checkout into `outDir`, with `selection` (env names) and nothing else selected. */
function build(outDir, selection = {}) {
    const env = { ...process.env, ...selection };
    for (const name of ['VITEST', ...LOOKS_ENV]) {
        if (!(name in selection)) {
            delete env[name];
        }
    }
    const out = spawnSync(process.execPath, [VITE, 'build', '--outDir', outDir, '--emptyOutDir', '--logLevel', 'error'], {
        cwd: ROOT,
        env,
        encoding: 'utf8',
    });
    return { status: out.status, stderr: out.stderr };
}

const FIXTURE = { [SELECTION_ENV.dir]: FIXTURE_LOOKS_DIR };
const PREVIEW = { ...FIXTURE, [SELECTION_ENV.target]: 'preview' };
const PRODUCTION = { ...FIXTURE, [SELECTION_ENV.target]: 'production' };

describe('an-unnamed-selection-carries-no-private-look', () => {
    /**
     * The step-8 critic's items 4 and 12: a build carries a private look
     * only when the environment names one — never because a directory is on
     * the disk — and half a selection, an unknown target or a malformed
     * commit fails the build rather than guessing. A vitest run selects
     * nothing whatever the shell says.
     */
    it('reads no selection from an empty environment, and a whole one as named', () => {
        assert.equal(selectionFromEnv({}), undefined);
        assert.equal(selectionFromEnv({ [SELECTION_ENV.target]: '', [SELECTION_ENV.dir]: '' }), undefined);
        assert.deepEqual(LOOKS_TARGETS, ['preview', 'production']);
        for (const target of LOOKS_TARGETS) {
            assert.deepEqual(selectionFromEnv({ ...FIXTURE, [SELECTION_ENV.target]: target }), { target, dir: FIXTURE_LOOKS_DIR });
        }
        const commit = 'ab'.repeat(20);
        assert.deepEqual(selectionFromEnv({ ...PREVIEW, [SELECTION_ENV.commit]: commit }), { target: 'preview', dir: FIXTURE_LOOKS_DIR, commit });
    });

    it('refuses half a selection, an unknown target and a malformed commit', () => {
        for (const env of [
            { [SELECTION_ENV.target]: 'preview' },
            { ...FIXTURE },
            { [SELECTION_ENV.commit]: 'ab'.repeat(20) },
            { ...FIXTURE, [SELECTION_ENV.target]: 'release' },
            { ...FIXTURE, [SELECTION_ENV.target]: 'Production' },
            { ...PREVIEW, [SELECTION_ENV.commit]: 'HEAD' },
            { ...PREVIEW, [SELECTION_ENV.commit]: 'AB'.repeat(20) },
        ]) {
            assert.throws(() => selectionFromEnv(env), /the selection is not whole/, JSON.stringify(env));
        }
    });

    it('answers an empty module with nothing selected, and under vitest whatever is selected', () => {
        for (const env of [{}, { ...PREVIEW, VITEST: 'true' }]) {
            const plugin = privateLooksPlugin({ facts, validateLook, vars, env });
            plugin.configResolved({ root: ROOT, build: { outDir: 'dist', write: false } });
            try {
                plugin.buildStart();
                const id = plugin.resolveId(PRIVATE_LOOKS_MODULE);
                // A `\0stall:` id, which the notices' module classifier reads as Stall's own.
                assert.equal(id, RESOLVED_MODULE);
                assert.equal(id, '\0stall:private-looks');
                assert.equal(plugin.load(id), 'export const carriesPrivateLooks = false;\nexport const privateLooks = [];\n', JSON.stringify(env));
            } finally {
                // What a build's close does: a red here leaves nothing written.
                plugin.closeBundle();
            }
        }
        const half = privateLooksPlugin({ facts, validateLook, vars, env: { [SELECTION_ENV.target]: 'preview' } });
        half.configResolved({ root: ROOT, build: { outDir: 'dist', write: false } });
        assert.throws(() => half.buildStart(), /the selection is not whole/);
    });

    it('fails a build that must carry its looks and selects none, and only that one', () => {
        // `STALL_LOOKS_REQUIRED` (the deploy job's, 8c): a build with no
        // selection under it fails; one with a selection, or under vitest,
        // or with the variable empty or 0, does not.
        const start = (env) => {
            const plugin = privateLooksPlugin({ facts, validateLook, vars, env });
            plugin.configResolved({ root: ROOT, build: { outDir: 'dist', write: false } });
            try {
                plugin.buildStart();
            } finally {
                plugin.closeBundle();
            }
        };
        assert.throws(() => start({ [REQUIRED_ENV]: '1' }), /STALL_LOOKS_REQUIRED is set and this build selects no private look/);
        for (const env of [{ [REQUIRED_ENV]: '1', VITEST: 'true' }, { [REQUIRED_ENV]: '0' }, { [REQUIRED_ENV]: '' }, { ...PRODUCTION, [REQUIRED_ENV]: '1' }]) {
            assert.doesNotThrow(() => start(env), JSON.stringify(env));
        }
        assert.deepEqual(LOOKS_ENV, ['STALL_LOOKS_TARGET', 'STALL_LOOKS_DIR', 'STALL_LOOKS_COMMIT', 'STALL_LOOKS_REQUIRED']);
    });

    it('reads a repository from its root, and inside this checkout the tracked fixture alone', () => {
        assert.deepEqual(selectedTree({ root: ROOT, selection: { target: 'preview', dir: FIXTURE_LOOKS_DIR } }), {
            dir: realpathSync(ROOT),
            prefix: FIXTURE_LOOKS_DIR,
            fixture: true,
        });
        for (const dir of ['layout', 'layout/fixture-private-looks/fixture', 'src']) {
            assert.throws(() => selectedTree({ root: ROOT, selection: { target: 'preview', dir } }), /read from its own root/, dir);
        }
        const repo = plantRepo();
        assert.deepEqual(selectedTree({ root: ROOT, selection: { target: 'preview', dir: repo.dir }, env: repo.env }), {
            dir: repo.dir,
            prefix: undefined,
            fixture: false,
        });
    });
});

describe('the-public-lists-decide-what-a-build-carries', () => {
    /**
     * The step-8 critic's item 1, the 8a critic's item 11(i): which looks a
     * production build carries is `RELEASED_LOOK_IDS`'s to say, never the
     * index's `stage`; a disagreeing index is refused before this is asked,
     * and the filter never relies on that.
     */
    const index = (looks) => ({ schema: 1, looks });
    const entry = (over) => ({ id: 4, slug: 'a-look', cls: 't-a-look', stage: 'preview', paid: true, ...over });

    it('carries every look to a preview, and to production only an id the public list releases', () => {
        const disagreeing = index([entry({ stage: 'release', paid: false })]);
        assert.deepEqual(includedEntries(disagreeing, 'production', { released: [] }), []);
        assert.deepEqual(includedEntries(index([entry()]), 'production', { released: [4] }).map((e) => e.slug), ['a-look']);
        assert.deepEqual(includedEntries(disagreeing, 'preview', { released: [] }).map((e) => e.slug), ['a-look']);
        assert.deepEqual(facts.released, [], 'step 8 releases nothing');
        assert.throws(() => includedEntries(index([entry()]), 'release', facts), TypeError);
    });

    it('refuses an index whose copies disagree with the public lists, at the build', () => {
        for (const [from, to, pattern] of [
            ['"stage": "preview"', '"stage": "release"', /RELEASED_LOOK_IDS/],
            ['"paid": true', '"paid": false', /PAID_LOOK_IDS/],
        ]) {
            const repo = plantRepo((path, text) => (path === 'index.json' ? text.replace(from, to) : text));
            assert.throws(() => readPlanted(repo), pattern, to);
        }
    });
});

describe('a-private-svg-outside-the-element-list-fails-the-build', () => {
    /**
     * The step-8 critic's item 8 (PROPOSAL §13.4): every SVG a private look
     * ships is parsed, held to an element and attribute list with local
     * references only, and written out again — the build emits the
     * re-serialisation, never the bytes it was given.
     */
    const svg = (inner, attrs = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"${attrs}>${inner}</svg>`;

    it('passes the fixture art and writes it back the same way twice', () => {
        const given = readFileSync(join(ROOT, FIXTURE_LOOKS_DIR, 'fixture/art/ground.svg'), 'utf8');
        const { svg: once, problems } = sanitizeSvg(given);
        assert.deepEqual(problems, []);
        assert.equal(sanitizeSvg(once).svg, once);
        const busy = `\uFEFF<?xml version="1.0" encoding="UTF-8"?>\n<!-- a comment -->\n${svg('\n  <defs><linearGradient id="g"><stop offset="0" stop-color="#000"/></linearGradient></defs>\n  <rect width="8" height="8" fill="url(#g)" style="mix-blend-mode: multiply"/>\n')}`;
        const cleaned = sanitizeSvg(busy);
        assert.deepEqual(cleaned.problems, []);
        assert.equal(
            cleaned.svg,
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><defs><linearGradient id="g"><stop offset="0" stop-color="#000"/></linearGradient></defs><rect width="8" height="8" fill="url(#g)" style="mix-blend-mode:multiply"/></svg>',
        );
        assert.ok(SVG_ELEMENTS.includes('feGaussianBlur') && !SVG_ELEMENTS.includes('script'));
    });

    /**
     * The 8b2 critic's plant E, as measured: six groups deep, ten `<use>` of
     * the group before in each — 1,247 bytes, a million instances, and no
     * screenshot from headless Chrome in 90 s. `use` is off the list; the
     * plant is kept so a list that grows it back meets the bomb first.
     */
    const USE_BOMB = (() => {
        const groups = ['<g id="g0"><rect width="1" height="1"/></g>'];
        for (let n = 1; n <= 6; n += 1) {
            groups.push(`<g id="g${n}">${Array.from({ length: 10 }, () => `<use href="#g${n - 1}"/>`).join('')}</g>`);
        }
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><defs>${groups.join('')}</defs><use href="#g6"/></svg>`;
    })();

    it('refuses every road §13.4 closes, and the elements it named and no art uses', () => {
        assert.ok(USE_BOMB.length < 1_400, `the bomb is small: ${USE_BOMB.length} bytes`);
        for (const element of ['use', 'feTurbulence', 'feDisplacementMap']) {
            assert.ok(!SVG_ELEMENTS.includes(element), element);
        }
        for (const [planted, pattern] of [
            [svg('<script>alert(1)</script>'), /<script> is not an element/],
            [svg('<style>rect{fill:red}</style>'), /<style> is not an element/],
            [svg('<foreignObject><div/></foreignObject>'), /<foreignObject> is not an element/],
            [svg('<image href="x.png"/>'), /<image> is not an element/],
            [svg('<filter id="f"><feImage href="#a"/></filter>'), /<feImage> is not an element/],
            [svg('<a href="#x"><rect/></a>'), /<a> is not an element/],
            [svg('<text>hi</text>'), /<text> is not an element/],
            [svg('<rect><animate attributeName="x"/></rect>'), /<animate> is not an element/],
            [svg('<rect><set attributeName="x"/></rect>'), /<set> is not an element/],
            [svg('<rect onclick="x()"/>'), /onclick: not an attribute/],
            [svg('<rect xml:base="https://x"/>'), /xml:base: not an attribute/],
            [svg('<use href="#a"/>'), /<use> is not an element/],
            [svg('<linearGradient id="b" href="#a"/>'), /href: not an attribute/],
            [svg('<linearGradient id="b" xlink:href="#a"/>'), /xlink:href: not an attribute/],
            [svg('<filter id="f"><feTurbulence baseFrequency=".1"/></filter>'), /<feTurbulence> is not an element/],
            [svg('<filter id="f"><feDisplacementMap scale="9"/></filter>'), /<feDisplacementMap> is not an element/],
            [svg('<rect fill="url(https://example.com/x#a)"/>'), /names something outside the file/],
            [svg('<rect fill="url(data:image/png;base64,AAAA)"/>'), /names something outside the file/],
            [svg('<rect fill="u&#x72;l(http://x)"/>'), /names something outside the file/],
            [svg('<rect fill="javascript:x"/>'), /holds a scheme/],
            [svg('<rect style="background:url(#a)"/>'), /style takes only/],
            [svg('<rect fill="&ext;"/>'), /a reference other than/],
            [`<!DOCTYPE svg [<!ENTITY ext SYSTEM "file:///etc/hosts">]>${svg('')}`, /a declaration, a DOCTYPE/],
            [svg('<![CDATA[x]]>'), /a declaration, a DOCTYPE or a CDATA/],
            [`${svg('')}<?php x ?>`, /a processing instruction/],
            [svg('loose text'), /text outside an element/],
            [svg('<svg:rect/>'), /is not an element/],
            [svg('<rect id="a"/><rect id="a"/>'), /used twice/],
            [svg('<rect x="1" x="2"/>'), /carries x twice/],
            ['<g xmlns="http://www.w3.org/2000/svg"/>', /the root is <g>/],
            [`${svg('')}${svg('')}`, /more than one root/],
            [svg('', ' xmlns:xlink="http://www.w3.org/1999/xlink"'), /xmlns:xlink: not an attribute/],
            ['<svg viewBox="0 0 1 1"/>', /carries no xmlns/],
            [svg(Array.from({ length: MAX_SVG_ELEMENTS }, () => '<rect/>').join('')), /more than 4000 elements/],
            [USE_BOMB, /<use> is not an element/],
        ]) {
            const { svg: out, problems } = sanitizeSvg(planted);
            assert.equal(out, undefined, planted.slice(0, 80));
            assert.ok(problems.some((p) => pattern.test(p)), `${planted.slice(0, 80)}:\n  ${problems.join('\n  ') || '(no problem)'}`);
        }
    });

    it('fails the build on a private look whose art holds one, naming the file', () => {
        const repo = plantRepo((path, text) =>
            path.endsWith('ground.svg') ? text.replace('</svg>', '<foreignObject><p>x</p></foreignObject></svg>') : text,
        );
        assert.throws(() => readPlanted(repo), /fixture\/art\/ground\.svg: <foreignObject> is not an element/);
    });
});

describe('a-private-look-is-read-from-git-and-checked-before-vite-reads-it', () => {
    /**
     * The step-8 critic's item 25 and the 8a critic's item 11(iii): the
     * files are the commit's blobs, never the disk beside them, and every
     * included look's data, sheet and art is checked before a byte reaches
     * Vite — the build fails listing every problem.
     */
    it('reads the commit and not the working tree, and the commit it is named', () => {
        const repo = plantRepo();
        const first = repo.head();
        const sheet = join(repo.dir, 'fixture/sheet.css');
        writeFileSync(sheet, readFileSync(sheet, 'utf8').replace('24px 24px', '25px 25px'));
        const read = readPlanted(repo);
        assert.equal(read.commit, first);
        assert.equal(read.looks.length, 1);
        assert.match(read.looks[0].sheet, /24px 24px/);
        assert.doesNotMatch(read.looks[0].sheet, /25px/);
        // The art is the re-serialisation.
        assert.equal(read.looks[0].art[0].name, 'ground.svg');
        assert.equal(read.looks[0].art[0].bytes.toString('utf8'), sanitizeSvg(readFileSync(join(repo.dir, 'fixture/art/ground.svg'), 'utf8')).svg);
        repo.git('commit', '-q', '-am', 'second');
        assert.match(readPlanted(repo).looks[0].sheet, /25px 25px/);
        assert.match(readPlanted(repo, { commit: first }).looks[0].sheet, /24px 24px/);
    });

    it('fails on a look.json the app refuses, a sheet the look rules refuse, and a face that blocks', () => {
        for (const [edit, pattern] of [
            [(path, text) => (path.endsWith('look.json') ? text.replace('"label"', '"script": "x", "label"') : text), /fixture\/look\.json: script: unknown field/],
            [(path, text) => (path.endsWith('look.json') ? text.replace('"f1f1', '"F1F1') : text), /fixture\/look\.json: decorations\[0\]\.tokenId/],
            [(path, text) => (path.endsWith('sheet.css') ? text.replace('@media (prefers-reduced-motion: reduce) {\n}', '') : text), /fixture\/sheet\.css: /],
            [
                (path, text) =>
                    path.endsWith('sheet.css')
                        ? text.replace('@media (prefers', '@font-face { font-family: t-planted-look-serif; src: url(./art/ground.svg); }\n\n@media (prefers')
                        : text,
                /fixture\/sheet\.css: .*@font-face states font-display/,
            ],
        ]) {
            const repo = plantRepo(edit);
            assert.throws(() => readPlanted(repo), pattern, String(pattern));
        }
    });

    it('reads this checkout’s tracked fixture at HEAD, as a build and public CI do', () => {
        const read = readSelectedLooks({ root: ROOT, selection: { target: 'preview', dir: FIXTURE_LOOKS_DIR }, facts, validateLook, vars });
        assert.deepEqual(read.looks.map((look) => look.entry.cls), ['t-fixture-private']);
        const production = readSelectedLooks({ root: ROOT, selection: { target: 'production', dir: FIXTURE_LOOKS_DIR }, facts, validateLook, vars });
        assert.deepEqual(production.looks, [], 'the fixture is at preview and nothing is released');
    });
});

describe('a-build-refuses-a-carried-look-that-strobes', () => {
    /**
     * The 8e1 critic's item 2: a carried sheet reached `dist` held only by
     * its own lint, and the checks that need every sheet at once — the flash
     * rule, and a worn sheet's keyframe or face name replacing another
     * sheet's — ran only in a test run that may not have read it. The build
     * runs them itself over the public table and the carried sheets
     * (`crossSheetProblems`) and fails, as the kit's commands do.
     */
    const strobe =
        '@keyframes t-planted-look-strobe { 0%, 20%, 40%, 60%, 80% { opacity: 1; } 10%, 30%, 50%, 70%, 90% { opacity: 0; } }\n' +
        '.t-planted-look .stall-name { animation: t-planted-look-strobe 1s steps(1) infinite; }\n';
    const planted = (rule) => plantRepo((path, text) => (path === 'fixture/sheet.css' ? beforeReduce(text, rule) : text));

    it('fails a real build of a look whose sheet strobes, naming the rule', () => {
        const repo = planted(strobe);
        const out = build(tempDir('dist-strobe'), { [SELECTION_ENV.target]: 'preview', [SELECTION_ENV.dir]: repo.dir });
        assert.notEqual(out.status, 0, 'a strobing look built');
        assert.match(out.stderr, /the flash rule: @keyframes t-planted-look-strobe .* flashes 5 times in one second/);
    });

    it('fails on a keyframe another served sheet declares, and on a public sheet naming the look; passes the look as it is', () => {
        assert.throws(
            () => readPlanted(planted('@keyframes om-flick { from { rotate: 0deg; } to { rotate: 1deg; } }')),
            /fixture\/sheet\.css: @keyframes om-flick is also declared in src\/ui\/stall\.css/,
        );
        assert.doesNotThrow(() => readPlanted(planted('.t-planted-look .item-n { letter-spacing: 0.02em; }')));
        const looks = readPlanted(plantRepo()).looks;
        assert.deepEqual(crossSheetProblems({ root: ROOT, looks, vars }), []);
        assert.deepEqual(crossSheetProblems({ root: ROOT, looks: [], vars }), []);
        assert.throws(() => readSelectedLooks({ root: ROOT, selection: { target: 'preview', dir: FIXTURE_LOOKS_DIR }, facts, validateLook }), /cross-sheet checks read the theme table/);
    });
});

describe('a-private-row-class-is-its-looks-own', () => {
    /**
     * The 8b2 critic's item 4, at the build: two included looks may not
     * share a row class, or one own the other's child — a class one look's
     * sheet paints would dress the other's row. One id is reserved today, so
     * the public lists are planted with a second for this case. A shipped
     * row's class is the validator's to refuse (`lookData.test.ts`).
     */
    const twoIds = { ...facts, reserved: [4, 5], paid: [4, 5] };
    function plantTwo(secondTrim) {
        const repo = plantRepo((path, text) =>
            path === 'index.json'
                ? text.replace(
                      ']',
                      ', { "id": 5, "slug": "other", "cls": "t-other-look", "stage": "preview", "paid": true }]',
                  )
                : text,
        );
        for (const path of trackedFixturePaths().filter((p) => p.startsWith('fixture/'))) {
            const to = join(repo.dir, path.replace(/^fixture\//, 'other/'));
            mkdirSync(dirname(to), { recursive: true });
            let text = execFileSync('git', ['show', `HEAD:${FIXTURE_LOOKS_DIR}/${path}`], { cwd: ROOT, encoding: 'utf8' })
                .replaceAll('t-fixture-private', 't-other-look')
                .replaceAll('att-fixture-dusk', 'att-other-dusk');
            if (path.endsWith('look.json')) {
                text = text
                    .replaceAll('f1f1', 'e1e1')
                    .replaceAll('f2f2', 'e2e2')
                    .replace('"att-fixture-trim"', JSON.stringify(secondTrim))
                    .replace('"att-fixture-crest"', '"att-other-crest"');
            }
            writeFileSync(to, text);
        }
        repo.git('add', '-A');
        repo.git('commit', '-q', '-m', 'two looks');
        return repo;
    }
    const read = (repo) =>
        readSelectedLooks({ root: ROOT, selection: { target: 'preview', dir: repo.dir }, facts: twoIds, validateLook, vars, env: repo.env });

    it('carries two looks whose row classes are their own', () => {
        assert.deepEqual(read(plantTwo('att-other-trim')).looks.map((look) => look.entry.slug), ['fixture', 'other']);
    });

    it('fails on a row class two looks share, or one owns the other’s child', () => {
        for (const trim of ['att-fixture-trim', 'att-fixture-trim-wide', 'att-fixture']) {
            assert.throws(() => read(plantTwo(trim)), /share an owner — a row class is its look's own/, trim);
        }
    });

    it('fails on a decoration named after a shipped row, through the validator', () => {
        const repo = plantRepo((path, text) => (path.endsWith('look.json') ? text.replace('"att-fixture-trim"', '"att-rainfall"') : text));
        assert.throws(() => readPlanted(repo), /class att-rainfall: is att-rainfall .* a private look's row classes are its own/);
    });
});

describe('a-deploy-build-names-every-face-it-serves', () => {
    /**
     * Step 8e1. `public/licenses.txt` stays the public build's notices — what
     * `scripts/notices.mjs` writes, byte for byte — and a build that carries
     * a private look serving a face writes `dist/licenses.txt` as that file,
     * unchanged and first, followed by the face and its licence text whole
     * (`noticesWithLookFonts`); the dist check holds the same
     * (`check-dist-looks.mjs`). Before Vite reads a byte the face is checked
     * (`lookFaceProblems`): named in the look's `fonts.json`, its OFL text
     * beside it, served by its sheet, presenting no name its licence
     * reserves. No real font is tracked for this: the face is a synthetic
     * WOFF2 holding a name table, in a repository planted from the fixture
     * (`scripts/private-looks-plant.mjs`). Real `vite build`s, ~1 s each.
     */
    after(removePlants);
    const FACE = 'plant-serif-latin.woff2';
    const LICENCE = 'LICENSE-OFL-plant-serif.txt';
    const PUBLIC_NOTICES = readFileSync(join(ROOT, 'public', 'licenses.txt'));
    const face = (family = 'Plant Serif') =>
        syntheticWoff2([
            { id: 0, text: 'Copyright 2024 The Plant Type Authors' },
            { id: 1, text: family },
        ]);
    const fontFace = `@font-face { font-family: ${PLANTED_CLASS}-serif; src: url(./art/${FACE}) format("woff2"); font-display: swap; }`;
    /** A planted look serving one synthetic face; `licence` the OFL text beside it, or `null` for none. */
    const plantFace = ({ licence = oflText('The Plant Type Authors'), family } = {}) =>
        plantLooks((path, text) => (path === 'fixture/sheet.css' ? beforeReduce(text, fontFace) : text), {
            [`fixture/art/${FACE}`]: face(family),
            ...(licence === null ? {} : { [`fixture/art/${LICENCE}`]: licence }),
            'fixture/fonts.json': JSON.stringify({ fonts: [{ name: 'Plant Serif', files: { [FACE]: 'Latin' }, licence: LICENCE }] }),
        });

    let repo;
    let dist;
    before(() => {
        repo = plantFace();
        dist = tempDir('dist-face');
        const { status, stderr } = build(dist, repo.selection);
        assert.equal(status, 0, stderr);
    });

    it('serves the public notices first and unchanged, then the face and its licence whole', () => {
        const served = readFileSync(join(dist, 'licenses.txt'));
        assert.ok(served.subarray(0, PUBLIC_NOTICES.length).equals(PUBLIC_NOTICES), 'the public notices come first, byte for byte');
        const added = served.subarray(PUBLIC_NOTICES.length).toString('utf8');
        assert.match(added, new RegExp(`^\n${LOOK_FONTS_HEADING.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\n`));
        assert.ok(added.includes(`- Plant Serif, the Latin subset this site serves for a look it carries (${FACE})`), added);
        assert.ok(added.includes(noticedLicence(oflText('The Plant Type Authors'))), 'the licence text, whole');
        assert.match(served.toString('latin1'), /^[\x00-\x7f]*$/, 'ASCII, as the public notices are');
        assert.ok(served.toString('utf8').endsWith('\n') && !served.toString('utf8').endsWith('\n\n'));
        // The tracked file is untouched by the build.
        assert.ok(readFileSync(join(ROOT, 'public', 'licenses.txt')).equals(PUBLIC_NOTICES));
    });

    it('emits the face it names, and every emitted face is named', () => {
        const files = distFiles(dist);
        const faces = [...files].filter(([path]) => path.endsWith('.woff2'));
        assert.ok(faces.some(([, bytes]) => bytes.equals(face())), 'the planted face is emitted');
        const notices = files.get('licenses.txt').toString('utf8');
        for (const [path, bytes] of faces) {
            if (bytes.equals(face())) {
                assert.ok(notices.includes(FACE), `${path} is the planted face and the notices name it`);
            }
        }
    });

    it('passes the dist check, which goes red when the notices drop the face', async () => {
        assert.deepEqual(await checkDist({ dir: dist, env: repo.selection }), []);
        const files = distFiles(dist).set('licenses.txt', PUBLIC_NOTICES);
        const look = (await import('./check-dist-looks.mjs')).lookFilesOf(
            { dir: repo.dir, commit: repo.head(), prefix: undefined },
            execFileSync('git', ['ls-tree', '-r', '--full-tree', 'HEAD'], { cwd: repo.dir, encoding: 'utf8' })
                .trim()
                .split('\n')
                .map((line) => /^(\d{6}) \w+ [0-9a-f]+\t(.*)$/.exec(line))
                .map((m) => ({ path: m[2], mode: m[1] })),
            { id: 4, slug: 'fixture', cls: PLANTED_CLASS },
        );
        assert.equal(look.fonts.length, 1, 'the dist check reads the face');
        const problems = distLooksProblems({ files, shippedClasses: facts.shippedClasses, included: [look], excluded: [] });
        assert.ok(problems.some((p) => p === `fixture: it serves art/${FACE} and licenses.txt does not name it`), problems.join('\n'));
        assert.ok(problems.some((p) => p === 'fixture: it serves Plant Serif and licenses.txt does not carry its licence whole'), problems.join('\n'));
    });

    it('fails the build on a face with no licence beside it, and on one presenting a name its licence reserves', () => {
        const bare = plantFace({ licence: null });
        const out = build(tempDir('dist-face-bare'), bare.selection);
        assert.notEqual(out.status, 0, 'a face with no licence built');
        assert.match(out.stderr, /fixture\/fonts\.json: fonts\[0\] \(Plant Serif\): its licence art\/LICENSE-OFL-plant-serif\.txt is not beside its faces/);
        const reserved = plantFace({ licence: oflText('The Plant Type Authors', 'Plant Serif') });
        const out2 = build(tempDir('dist-face-reserved'), reserved.selection);
        assert.notEqual(out2.status, 0, 'a face presenting its reserved name built');
        assert.match(out2.stderr, /fixture\/art\/plant-serif-latin\.woff2: name ID 1 presents "Plant Serif", a Reserved Font Name/);
    });
});

describe('the-private-looks-module-is-json-and-nothing-else', () => {
    /**
     * The step-8 critic's item 8: the module's data is `JSON.parse` of a
     * string literal, so no character a look's file holds can end the
     * literal or reach the source as code, and a key named `__proto__` stays
     * a key the runtime validator refuses.
     */
    const evaluate = (code) =>
        new Function(
            code
                .replace(/^import (\w+) from .*;$/gm, 'const $1 = "u";')
                .replace('export const carriesPrivateLooks = true;', '')
                .replace('export const privateLooks =', 'return'),
        )();

    it('is the empty list and a false switch, byte for byte, when nothing is carried', () => {
        // The switch is a literal so a build that carries no look drops the
        // table's runtime validator: Rollup removes the branch that reads it.
        assert.equal(privateLooksModuleCode([]), 'export const carriesPrivateLooks = false;\nexport const privateLooks = [];\n');
        assert.match(
            privateLooksModuleCode([{ id: 4, sheetClass: 't-a', sheetPath: '/s.css', lookText: '{}' }]),
            /^export const carriesPrivateLooks = true;$/m,
        );
    });

    it('carries the file’s text through characters that end a literal, a template or a script', () => {
        const label = 'a ${x} `y` </script><!-- \u2028\u2029 "z" \\ end';
        const lookText = JSON.stringify({ label, nested: { proto: 1 } }) + '\n';
        const code = privateLooksModuleCode([{ id: 4, sheetClass: 't-a-look', sheetPath: '/x/a-look/sheet.css', lookText }]);
        // Inside a double-quoted literal a backtick and `${` are characters;
        // what could end it or a script around it is escaped.
        assert.doesNotMatch(code, /<\/script|<!--|\u2028|\u2029/);
        assert.match(code, /^import sheet0 from "\/x\/a-look\/sheet\.css\?url";$/m);
        const [entry] = evaluate(code);
        assert.deepEqual(entry, { id: 4, sheetClass: 't-a-look', sheetUrl: 'u', look: JSON.parse(lookText) });
        assert.equal(entry.look.label, label);
        // A `__proto__` key is an own key after the parse, never a prototype.
        const [proto] = evaluate(
            privateLooksModuleCode([{ id: 4, sheetClass: 't-a-look', sheetPath: '/s.css', lookText: '{"__proto__": {"label": "x"}}' }]),
        );
        assert.ok(Object.hasOwn(proto.look, '__proto__'));
        assert.equal(Object.getPrototypeOf(proto.look), Object.prototype);
        assert.equal(jsString('<\u2028>'), '"\\u003c\\u2028\\u003e"');
        assert.throws(() => privateLooksModuleCode([{ id: 256, sheetClass: 't-a', sheetPath: '/s.css', lookText: '{}' }]), TypeError);
    });
});

describe('a-build-with-no-released-look-is-the-public-build', () => {
    /**
     * Plan §2.3: a build whose selection carries no look — the fixture at
     * `preview`, built for `production`, with `RELEASED_LOOK_IDS` empty — is
     * the public build, file for file and byte for byte. That is what lets
     * the production road be proven with nothing visible. The same selection
     * at `preview` differs: the look is there.
     */
    let publicDist;
    let productionDist;
    let previewDist;
    before(() => {
        publicDist = tempDir('dist-public');
        productionDist = tempDir('dist-production');
        previewDist = tempDir('dist-preview');
        for (const [dir, selection] of [
            [publicDist, {}],
            [productionDist, PRODUCTION],
            [previewDist, PREVIEW],
        ]) {
            const { status, stderr } = build(dir, selection);
            assert.equal(status, 0, stderr);
        }
    });

    it('emits the same files with the same bytes as the public build', () => {
        const a = distFiles(publicDist);
        const b = distFiles(productionDist);
        assert.deepEqual([...b.keys()].sort(), [...a.keys()].sort());
        for (const [path, bytes] of a) {
            assert.ok(bytes.equals(b.get(path)), path);
        }
        assert.ok([...a.keys()].some((path) => path.endsWith('.js')));
    });

    /**
     * `the-worn-only-loader-ships-only-with-a-worn-only-look` (8d1): the
     * loader (`src/ui/lookSheets.ts`) is reached from the renderer only
     * behind `lookSheetOf`, which a build carrying no private look answers
     * from the module's literal switch — so Rollup folds the ask away and
     * drops the loader, and the public build is the bytes it was before the
     * loader existed (measured: `dist` identical to 90b266e's). A build that
     * carries the fixture carries the loader and names its look's sheet
     * file. Red: a second `return` in `lookSheetOf`, which Rollup cannot
     * read as a literal.
     */
    it('the-worn-only-loader-ships-only-with-a-worn-only-look', () => {
        const LOADER = 'is not a sheet naming';
        const js = (dir) =>
            [...distFiles(dir)]
                .filter(([path]) => path.endsWith('.js'))
                .map(([, bytes]) => bytes.toString('utf8'))
                .join('\n');
        assert.ok(!js(publicDist).includes(LOADER), 'the public build carries the worn-only loader');
        assert.ok(!js(productionDist).includes(LOADER), 'a build that carries no look carries the loader');
        const preview = js(previewDist);
        assert.ok(preview.includes(LOADER), 'a build carrying a look carries no loader for it');
        const sheet = [...distFiles(previewDist)].find(
            ([path, bytes]) => path.endsWith('.css') && lookSheetNames(bytes.toString('utf8')).includes('t-fixture-private'),
        );
        assert.ok(sheet !== undefined && preview.includes(`/${sheet[0]}`), "the script names the look's built sheet");
    });

    it('carries the look at preview, in its own sheet, its art beside it', () => {
        const files = distFiles(previewDist);
        const sheets = [...files].filter(([path, bytes]) => path.endsWith('.css') && lookSheetNames(bytes.toString('utf8')).includes('t-fixture-private'));
        assert.equal(sheets.length, 1);
        assert.ok(!distFiles(publicDist).has(sheets[0][0]));
        // The fixture serves no face, so the notices are the public file as it is.
        assert.ok(files.get('licenses.txt').equals(readFileSync(join(ROOT, 'public', 'licenses.txt'))), 'a look with no face leaves the notices alone');
    });

    describe('the-dist-holds-what-the-index-names', () => {
        /**
         * `scripts/check-dist-looks.mjs` (plan §2.5): `dist` holds the looks
         * its selection carries and nothing of the ones it does not — by the
         * index, not a count. Each red by a build checked under another
         * selection, or a plant on a built `dist`.
         */
        const env = (selection) => ({ ...selection });

        it('passes each build under its own selection', async () => {
            assert.deepEqual(await checkDist({ dir: publicDist, env: {} }), []);
            assert.deepEqual(await checkDist({ dir: productionDist, env: env(PRODUCTION) }), []);
            assert.deepEqual(await checkDist({ dir: previewDist, env: env(PREVIEW) }), []);
        });

        it('refuses a preview look in a production build, and one missing from a preview build', async () => {
            const asProduction = await checkDist({ dir: previewDist, env: env(PRODUCTION) });
            assert.ok(asProduction.some((p) => /t-fixture-private: a look sheet .* this build's selection does not carry/.test(p)), asProduction.join('\n'));
            assert.ok(asProduction.some((p) => /fixture: .* carries its module entry \(sheetClass t-fixture-private\)/.test(p)), asProduction.join('\n'));
            assert.ok(asProduction.some((p) => /fixture: assets\/ground-.*\.svg is one of its files, and this build does not carry the look/.test(p)), asProduction.join('\n'));
            const unselected = await checkDist({ dir: previewDist, env: {} });
            assert.ok(unselected.some((p) => /does not carry/.test(p)), unselected.join('\n'));
            const missing = await checkDist({ dir: publicDist, env: env(PREVIEW) });
            assert.ok(missing.some((p) => /fixture: the build carries it, and 0 files name its sheet/.test(p)), missing.join('\n'));
        });

        it('refuses a planted extra sheet, a second copy of the look’s, and its art gone', () => {
            const shipped = facts.shippedClasses;
            const base = distFiles(previewDist);
            const [sheetPath, sheetBytes] = [...base].find(
                ([path, bytes]) => path.endsWith('.css') && lookSheetNames(bytes.toString('utf8')).includes('t-fixture-private'),
            );
            const look = {
                cls: 't-fixture-private',
                slug: 'fixture',
                art: [{ name: 'ground.svg', bytes: Buffer.from(sanitizeSvg(readFileSync(join(ROOT, FIXTURE_LOOKS_DIR, 'fixture/art/ground.svg'), 'utf8')).svg) }],
                named: new Set(['ground.svg']),
            };
            const check = (files) => distLooksProblems({ files, shippedClasses: shipped, included: [look], excluded: [] });
            assert.deepEqual(check(base), []);
            const extra = new Map(base).set('assets/planted.css', Buffer.from('.t-planted{--look-sheet:t-planted}'));
            assert.ok(check(extra).some((p) => /t-planted: a look sheet in assets\/planted\.css/.test(p)));
            const twice = new Map(base).set('assets/sheet-copy.css', sheetBytes);
            assert.ok(check(twice).some((p) => /2 files name its sheet/.test(p)));
            const artPath = /url\(\/?([^)]+)\)/.exec(sheetBytes.toString('utf8'))[1];
            const gone = new Map(base);
            gone.delete(artPath.replace(/^\//, ''));
            const problems = check(gone);
            assert.ok(problems.some((p) => /its sheet names .* which is not in the dist/.test(p)), problems.join('\n'));
            assert.ok(problems.some((p) => /art\/ground\.svg is named by its sheet and is not in the dist/.test(p)), problems.join('\n'));
            assert.ok(sheetPath.startsWith('assets/'));
        });

        /**
         * The 8b2 critic's item 7: a carried sheet's every target — a
         * `url()` or an `image-set()` entry — is one of the look's own
         * files, so a stray target the lint missed is red; a private file no
         * carried sheet names is red; a built stylesheet beside the entry CSS
         * that is no look's is red; and a look the build does not carry is
         * matched by its files and its module entry, never by its class
         * appearing anywhere.
         */
        it('holds every target to the look’s own files, and nothing of a private look beside them', () => {
            const shipped = facts.shippedClasses;
            const base = distFiles(previewDist);
            const [sheetPath, sheetBytes] = [...base].find(
                ([path, bytes]) => path.endsWith('.css') && lookSheetNames(bytes.toString('utf8')).includes('t-fixture-private'),
            );
            const ground = Buffer.from(sanitizeSvg(readFileSync(join(ROOT, FIXTURE_LOOKS_DIR, 'fixture/art/ground.svg'), 'utf8')).svg);
            const look = { cls: 't-fixture-private', slug: 'fixture', art: [{ name: 'ground.svg', bytes: ground }], named: new Set(['ground.svg']) };
            const check = (files, over = {}) => distLooksProblems({ files, shippedClasses: shipped, included: [look], excluded: [], ...over });
            const decor = [...base.keys()].find((path) => /^assets\/rain-near-.*\.svg$/.test(path));
            assert.ok(decor !== undefined, 'a shipped decoration is in the build to stray to');
            // A stray target, by url() and by image-set().
            const stray = new Map(base).set(sheetPath, Buffer.from(`${sheetBytes}.x{background:url(/${decor})}`));
            assert.ok(check(stray).some((p) => p.includes(`its sheet names /${decor}, which is none of the look's own files`)), check(stray).join('\n'));
            const set = new Map(base).set(sheetPath, Buffer.from(`${sheetBytes}.x{background-image:image-set("/${decor}" 1x)}`));
            assert.ok(check(set).some((p) => p.includes(`its sheet names /${decor}, which is none of the look's own files`)), check(set).join('\n'));
            // A piece of its art no carried sheet names.
            const loose = new Map(base).set('assets/loose.svg', ground);
            assert.ok(check(loose).some((p) => p === 'fixture: assets/loose.svg is one of its files, and no carried sheet names it'), check(loose).join('\n'));
            // A built stylesheet that is no look's.
            const plain = new Map(base).set('assets/extra.css', Buffer.from('.a{color:red}'));
            assert.ok(check(plain).some((p) => p.startsWith('assets/extra.css: a built stylesheet')), check(plain).join('\n'));
            // A public file that merely names a class the index holds is not the look.
            const named = new Map(distFiles(publicDist)).set('assets/sticky.js', Buffer.from('const STICKY = ["t-fixture-private"];'));
            assert.deepEqual(distLooksProblems({ files: named, shippedClasses: shipped, included: [], excluded: [look] }), []);
            // The art named by image-set() in a source sheet counts as named.
            assert.deepEqual([...artNamedBy('.x{background-image:image-set("art/a.svg" 1x, url(./art/b.svg) 2x)}')].sort(), ['a.svg', 'b.svg']);
        });

        it('fails the build that wrote a dist its selection does not hold, and leaves nothing written', () => {
            // The plugin runs the check itself on every build that selected
            // anything and wrote to the disk (the critic's item 7a): planted
            // here over the public build's dist, under a preview selection.
            const plugin = privateLooksPlugin({ facts, validateLook, vars, env: PREVIEW });
            plugin.configResolved({ root: ROOT, build: { outDir: publicDist, write: true } });
            const writes = [];
            const write = process.stderr.write;
            process.stderr.write = (chunk) => writes.push(String(chunk)) > 0;
            try {
                plugin.buildStart();
            } finally {
                process.stderr.write = write;
            }
            assert.ok(writes.some((line) => /^private looks: this preview build carries fixture \(private commit [0-9a-f]{12}\)\n$/.test(line)), writes.join(''));
            const written = readdirSync(tmpdir()).filter((name) => name.startsWith(MATERIALISED_PREFIX));
            assert.ok(written.length > 0, 'the build wrote its files to the temporary directory');
            assert.throws(() => plugin.closeBundle(), /does not hold what its selection carries:\n {2}- fixture: the build carries it, and 0 files name its sheet/);
            const after = readdirSync(tmpdir()).filter((name) => name.startsWith(MATERIALISED_PREFIX));
            assert.ok(after.length < written.length, 'and removed them, failing or not');
        });

        it('says on stderr which looks a build carries, and says nothing when it carries none', () => {
            const out = build(tempDir('dist-say'), PREVIEW);
            assert.equal(out.status, 0, out.stderr);
            assert.match(out.stderr, /^private looks: this preview build carries fixture \(private commit [0-9a-f]{12}\)$/m);
            const quiet = build(tempDir('dist-quiet'), PRODUCTION);
            assert.equal(quiet.status, 0, quiet.stderr);
            assert.doesNotMatch(quiet.stderr, /private looks/);
        });
    });
});
