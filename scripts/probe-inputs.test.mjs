import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';
import { FIXED_INPUTS, greenLine, hashFiles, inputsDiffer, inputsRecord, isPublicInput, isTrackedInput, runnerClosure, trackedInputs } from './probe-inputs.mjs';

const scratch = mkdtempSync(join(tmpdir(), 'probe-inputs-test-'));
after(() => rmSync(scratch, { recursive: true, force: true }));

/** A git repository of the probe's shape: a runner and its import, a face, a picture, a fixture file, a manual and a test, committed. */
function plantedTree() {
    const root = mkdtempSync(join(scratch, 'root-'));
    const files = {
        'scripts/layout-check.mjs': "import { x } from './a.mjs';\n",
        'scripts/a.mjs': 'export const x = 1;\n',
        'src/ui/fonts/inter-latin.woff2': 'a face',
        'src/ui/decor/horizon-moon.svg': '<svg>moon</svg>',
        'src/a.test.ts': 'test',
        'layout/fixture-private-looks/fixture/sheet.css': '.t-x {}',
        'layout/PROBE-RULES.md': 'rules',
        ...Object.fromEntries(FIXED_INPUTS.map((name) => [name, name])),
    };
    for (const [path, text] of Object.entries(files)) {
        mkdirSync(join(root, path, '..'), { recursive: true });
        writeFileSync(join(root, path), text);
    }
    const git = (...args) => spawnSync('git', ['-C', root, ...args], { encoding: 'utf8', env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' } });
    git('init', '-q');
    git('add', '-A');
    return root;
}

describe("probe-inputs (what the probe's public verdict is a function of)", () => {
    it("leaves out virtual modules, the selection's directory and the private-looks build's own files", () => {
        const looks = join(scratch, 'looks');
        const made = join(scratch, 'stall-private-looks-abc');
        const pub = join(scratch, 'pub.ts');
        mkdirSync(looks);
        mkdirSync(made);
        writeFileSync(join(looks, 'sheet.css'), 'x');
        writeFileSync(join(made, 'sheet.css'), 'x');
        writeFileSync(pub, 'x');
        assert.equal(isPublicInput('\0stall:private-looks'), false);
        assert.equal(isPublicInput('virtual:stall-private-looks'), false);
        assert.equal(isPublicInput(join(looks, 'sheet.css'), { looksDir: looks, tmp: scratch }), false);
        assert.equal(isPublicInput(`${join(made, 'sheet.css')}?url`, { tmp: scratch }), false);
        assert.equal(isPublicInput(`${pub}?raw`, { tmp: scratch }), true);
        assert.equal(isPublicInput(join(scratch, 'nope.ts'), { tmp: scratch }), false);
    });

    it("reads the runner's own scripts by their relative imports", () => {
        const closure = runnerClosure();
        assert.ok(closure.includes('scripts/layout-check.mjs'));
        assert.ok(closure.includes('scripts/probe-coverage.mjs'));
        assert.ok(closure.includes('scripts/probe-inputs.mjs'));
        assert.ok(closure.includes('scripts/look-timing.mjs'));
        assert.ok(!closure.includes('scripts/deploy-workflow.test.mjs'));
    });

    it('says what moved, and nothing when nothing did — a planted face and a planted piece of art among them', () => {
        const root = plantedTree();
        const then = inputsRecord({ modules: [], root, chrome: 'Chrome 1', tabs: 3 });
        assert.deepEqual(inputsDiffer(then, inputsRecord({ root, chrome: 'Chrome 1', tabs: 3 })), []);
        // A face and a CSS-only picture: no module of the build, read by the probe all the same.
        writeFileSync(join(root, 'src/ui/fonts/inter-latin.woff2'), 'another face');
        writeFileSync(join(root, 'src/ui/decor/horizon-moon.svg'), '<svg>another moon</svg>');
        const moved = inputsDiffer(then, inputsRecord({ root, chrome: 'Chrome 1', tabs: 3 }));
        assert.match(moved[0], /2 file\(s\) changed \(src\/ui\/decor\/horizon-moon\.svg, src\/ui\/fonts\/inter-latin\.woff2\)/);
        // Before the build: the tracked list hashed as it stands.
        assert.match(greenLine({ at: 'then', rev: 'abc', selection: 's', inputs: then }, { hashes: hashFiles(trackedInputs(root), root) }), /differ.*horizon-moon/);
        assert.match(greenLine(undefined, { hashes: {} }), /no green pnpm test:layout is recorded/);
    });

    it('reads nothing of the fixture’s private-look repository, the manuals or the tests', () => {
        const root = plantedTree();
        const then = inputsRecord({ root, chrome: 'Chrome 1', tabs: 3 });
        writeFileSync(join(root, 'layout/fixture-private-looks/fixture/sheet.css'), '.t-x { color: red }');
        writeFileSync(join(root, 'layout/PROBE-RULES.md'), 'more');
        writeFileSync(join(root, 'src/a.test.ts'), 'more');
        assert.deepEqual(inputsDiffer(then, inputsRecord({ root, chrome: 'Chrome 1', tabs: 3 })), []);
        writeFileSync(join(root, 'scripts/a.mjs'), 'export const x = 2;\n');
        const moved = inputsDiffer(then, inputsRecord({ root, chrome: 'Chrome 2', tabs: 3 }));
        assert.match(moved[0], /1 file\(s\) changed \(scripts\/a\.mjs\)/);
        assert.ok(moved.some((line) => line === 'chrome Chrome 1 → Chrome 2'));
        assert.equal(isTrackedInput('layout/fixture-look/ground.svg'), true);
        assert.equal(isTrackedInput('README.md'), false);
    });

    it('lists this checkout’s faces and its CSS-only art', () => {
        const files = trackedInputs();
        assert.ok(files.some((path) => path.endsWith('.woff2')), 'a face');
        assert.ok(files.includes('src/ui/decor/horizon-moon.svg'), 'the moon');
        assert.ok(files.some((path) => path.startsWith('layout/fixture-look/')), "the fixture look's art");
        assert.ok(!files.some((path) => path.startsWith('layout/fixture-private-looks/')));
    });

});
