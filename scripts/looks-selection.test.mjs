import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { FIXTURE_LOOKS_DIR, REQUIRED_ENV, SELECTION_ENV, harnessSelectionRefusal, selectionFromEnv, selectionRefusal, withoutSelection } from './looks-selection.mjs';

/**
 * A run selects private looks by name (`scripts/looks-selection.mjs`), and
 * every harness command reads a selection or refuses it, and says which
 * (8e2; the 8b2 critic's item 2: measured before 8e2, `pnpm test:layout`
 * passed green over the fixture look a forgotten shell export had put in
 * the probe's bundle, and said nothing).
 *
 * `node --test`: a TypeScript test importing an `.mjs` breaks `tsc`
 * (TS7016). The spawned commands stop before they build anything, so no
 * browser starts and no build runs.
 */
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * The commands that build through the app's config — and the kit's lint,
 * which reads the served sheets as they do — the name each reads or refuses
 * under, and its first statement: a reader takes the selection whole
 * (`harnessSelection`), a refuser stops on any of it (`refuseSelection`).
 */
const READERS = [
    ['scripts/layout-check.mjs', 'test:layout'],
    ['scripts/looks-diff.mjs', 'looks:diff'],
    ['scripts/workshop.mjs', 'workshop'],
    ['scripts/workshop-lint.mjs', 'workshop:lint'],
];
const REFUSERS = [['scripts/print-measure.mjs', 'print-measure', "refuseSelection('print-measure', 'the print measurement measures the public build only');"]];

/** The text without comments, as a reader of statements wants it. */
const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');

/** The first statement after a module's import block. */
function firstStatement(text) {
    const lines = code(text).split('\n');
    let inImport = false;
    for (const line of lines) {
        const t = line.trim();
        if (t === '' || t.startsWith('#!')) {
            continue;
        }
        if (inImport) {
            if (/from\s+'[^']+';$/.test(t)) {
                inImport = false;
            }
            continue;
        }
        if (t.startsWith('import ')) {
            inImport = !/from\s+'[^']+';$/.test(t) && !/^import\s+'[^']+';$/.test(t);
            continue;
        }
        return t;
    }
    return undefined;
}

describe('a-harness-command-reads-a-selection-or-refuses-it', () => {
    const whole = { [SELECTION_ENV.target]: 'preview', [SELECTION_ENV.dir]: FIXTURE_LOOKS_DIR };
    const run = (args, env) =>
        spawnSync(process.execPath, args, { cwd: ROOT, env: { ...withoutSelection(process.env), ...env }, encoding: 'utf8', timeout: 60_000 });

    it('refuses on any of the variables set, whole or not, naming them and what it measures instead', () => {
        assert.equal(selectionRefusal('x', {}), undefined);
        assert.equal(selectionRefusal('x', { [SELECTION_ENV.target]: '' }), undefined);
        for (const name of Object.values(SELECTION_ENV)) {
            const refusal = selectionRefusal('print-measure', { [name]: 'anything' });
            assert.match(refusal, new RegExp(`^print-measure: ${name} is set — this command measures the public build only; run it with none of`));
        }
        assert.match(selectionRefusal('workshop:probe', whole, "the kit's probe measures the kit's look alone"), /STALL_LOOKS_TARGET, STALL_LOOKS_DIR are set — the kit's probe measures the kit's look alone;/);
        assert.equal(selectionFromEnv(withoutSelection({ ...whole, HOME: '/h' })), undefined);
        assert.deepEqual(withoutSelection({ ...whole, HOME: '/h' }), { HOME: '/h' });
    });

    it('reads a whole selection or none, and refuses half of one or a required one that names nothing', () => {
        assert.equal(harnessSelectionRefusal('x', {}), undefined);
        assert.equal(harnessSelectionRefusal('x', whole), undefined);
        assert.match(harnessSelectionRefusal('test:layout', { [SELECTION_ENV.target]: 'preview' }), /^test:layout: private looks: the selection is not whole/);
        assert.match(harnessSelectionRefusal('test:layout', { ...whole, [SELECTION_ENV.target]: 'staging' }), /STALL_LOOKS_TARGET is "staging"/);
        assert.match(harnessSelectionRefusal('looks:diff', { ...whole, [SELECTION_ENV.commit]: 'HEAD' }), /STALL_LOOKS_COMMIT is "HEAD"/);
        assert.match(harnessSelectionRefusal('workshop', { [REQUIRED_ENV]: '1' }), /^workshop: STALL_LOOKS_REQUIRED is set and nothing is selected/);
        assert.equal(harnessSelectionRefusal('workshop', { ...whole, [REQUIRED_ENV]: '1' }), undefined);
    });

    it('is the first statement of every command that builds, and the first of the notices’ own run', () => {
        for (const [path, name] of READERS) {
            const text = readFileSync(join(ROOT, path), 'utf8');
            assert.equal(firstStatement(text), `const SELECTION = harnessSelection('${name}');`, path);
        }
        for (const [path, , statement] of REFUSERS) {
            assert.equal(firstStatement(readFileSync(join(ROOT, path), 'utf8')), statement, path);
        }
        // The notices: the module is imported by tests for `FONTS`, so its
        // own run, not its top, reads the selection — first.
        const notices = code(readFileSync(join(ROOT, 'scripts/notices.mjs'), 'utf8'));
        const body = notices.slice(notices.indexOf('if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {'));
        const first = body.split('\n').slice(1).find((line) => line.trim() !== '').trim();
        assert.equal(first, "const selection = harnessSelection('notices');");
    });

    it('stops each reader on half a selection, before it builds, naming the problem', () => {
        for (const [path, name] of [...READERS, ['scripts/notices.mjs', 'notices']]) {
            const out = run([path, 'main'], { [SELECTION_ENV.target]: 'preview' });
            assert.equal(out.status, 2, `${path}: ${out.stderr}`);
            assert.match(out.stderr, new RegExp(`^${name}: private looks: the selection is not whole`, 'm'), path);
        }
    });

    it('stops a refuser, and the kit’s probe, on a whole selection, before it builds', () => {
        for (const [path, name] of REFUSERS) {
            const out = run([path], whole);
            assert.equal(out.status, 2, `${path}: ${out.stderr}`);
            assert.match(out.stderr, new RegExp(`^${name}: STALL_LOOKS_TARGET, STALL_LOOKS_DIR are set`, 'm'), path);
        }
        for (const args of [['scripts/workshop.mjs', 'probe'], ['scripts/layout-check.mjs', '--looks', 'workshop']]) {
            const out = run(args, whole);
            assert.equal(out.status, 2, `${args.join(' ')}: ${out.stderr}`);
            assert.match(out.stderr, /^workshop:probe: STALL_LOOKS_TARGET, STALL_LOOKS_DIR are set — the kit's probe measures the kit's look alone/m, args.join(' '));
        }
    });
});
