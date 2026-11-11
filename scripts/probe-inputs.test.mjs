import { strict as assert } from 'node:assert';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';
import { FIXED_INPUTS, greenLine, hashFiles, inputsDiffer, inputsRecord, isPublicInput, runnerClosure } from './probe-inputs.mjs';

const scratch = mkdtempSync(join(tmpdir(), 'probe-inputs-test-'));
after(() => rmSync(scratch, { recursive: true, force: true }));

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

    it('says what moved, and nothing when nothing did', () => {
        const root = mkdtempSync(join(scratch, 'root-'));
        mkdirSync(join(root, 'scripts'));
        writeFileSync(join(root, 'scripts', 'layout-check.mjs'), "import { x } from './a.mjs';\n");
        writeFileSync(join(root, 'scripts', 'a.mjs'), 'export const x = 1;\n');
        writeFileSync(join(root, 'm.ts'), 'one');
        for (const name of FIXED_INPUTS) writeFileSync(join(root, name), name);
        const then = inputsRecord({ modules: ['m.ts'], root, chrome: 'Chrome 1', tabs: 3 });
        assert.deepEqual(inputsDiffer(then, inputsRecord({ modules: ['m.ts'], root, chrome: 'Chrome 1', tabs: 3 })), []);
        writeFileSync(join(root, 'scripts', 'a.mjs'), 'export const x = 2;\n');
        const moved = inputsDiffer(then, inputsRecord({ modules: ['m.ts'], root, chrome: 'Chrome 2', tabs: 3 }));
        assert.match(moved[0], /1 file\(s\) changed \(scripts\/a\.mjs\)/);
        assert.ok(moved.some((line) => line === 'chrome Chrome 1 → Chrome 2'));
        // Before the build: the recorded files re-hashed, nothing called gone.
        assert.match(greenLine({ at: 'then', rev: 'abc', selection: 's', inputs: then }, { hashes: hashFiles(Object.keys(then.hashes), root) }), /differ.*scripts\/a\.mjs/);
        assert.match(greenLine(undefined, { hashes: {} }), /no green pnpm test:layout is recorded/);
    });
});
