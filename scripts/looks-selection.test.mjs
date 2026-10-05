import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { SELECTION_ENV, selectionFromEnv, selectionRefusal, withoutSelection } from './looks-selection.mjs';

/**
 * A run selects private looks by name (`scripts/looks-selection.mjs`), and
 * every harness command refuses a selection until 8e2 teaches it one (the
 * 8b2 critic's item 2: measured, `pnpm test:layout` passed green over the
 * fixture look a forgotten shell export had put in the probe's bundle, and
 * said nothing).
 *
 * `node --test`: a TypeScript test importing an `.mjs` breaks `tsc`
 * (TS7016). The spawned commands stop before they build anything, so no
 * browser starts and no build runs.
 */
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** The commands that build through the app's config — and the kit's lint, which reads the served sheets as they do — the name each refuses under. */
const COMMANDS = [
    ['scripts/layout-check.mjs', 'test:layout'],
    ['scripts/looks-diff.mjs', 'looks:diff'],
    ['scripts/workshop.mjs', 'workshop'],
    ['scripts/print-measure.mjs', 'print-measure'],
    ['scripts/workshop-lint.mjs', 'workshop:lint'],
];

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

describe('a-harness-command-refuses-a-selection-until-it-reads-one', () => {
    it('refuses when any of the three variables is set, whole or not, and names them', () => {
        assert.equal(selectionRefusal('x', {}), undefined);
        assert.equal(selectionRefusal('x', { [SELECTION_ENV.target]: '' }), undefined);
        for (const name of Object.values(SELECTION_ENV)) {
            const refusal = selectionRefusal('test:layout', { [name]: 'anything' });
            assert.match(refusal, new RegExp(`^test:layout: ${name} is set — until 8e2 this command measures the public build only`));
        }
        const whole = { [SELECTION_ENV.target]: 'preview', [SELECTION_ENV.dir]: 'layout/fixture-private-looks' };
        assert.match(selectionRefusal('looks:diff', whole), /STALL_LOOKS_TARGET, STALL_LOOKS_DIR are set/);
        assert.equal(selectionFromEnv(withoutSelection({ ...whole, HOME: '/h' })), undefined);
        assert.deepEqual(withoutSelection({ ...whole, HOME: '/h' }), { HOME: '/h' });
    });

    it('is the first statement of every command that builds, and the first of the notices’ build', () => {
        for (const [path, name] of COMMANDS) {
            const text = readFileSync(join(ROOT, path), 'utf8');
            assert.equal(firstStatement(text), `refuseSelection('${name}');`, path);
            assert.match(text, /^import \{ refuseSelection \} from '\.\/looks-selection\.mjs';$/m, path);
        }
        const notices = code(readFileSync(join(ROOT, 'scripts/notices.mjs'), 'utf8'));
        const body = notices.slice(notices.indexOf('export async function bundleInventory() {'));
        const first = body.split('\n').slice(1).find((line) => line.trim() !== '').trim();
        assert.equal(first, "const refusal = selectionRefusal('notices', process.env);");
    });

    it('stops each command before it builds, naming the variables', () => {
        const env = { ...withoutSelection(process.env), [SELECTION_ENV.target]: 'preview', [SELECTION_ENV.dir]: 'layout/fixture-private-looks' };
        for (const [path, name] of COMMANDS) {
            const out = spawnSync(process.execPath, [path, 'main'], { cwd: ROOT, env, encoding: 'utf8', timeout: 60_000 });
            assert.equal(out.status, 2, `${path}: ${out.stderr}`);
            assert.match(out.stderr, new RegExp(`^${name}: STALL_LOOKS_TARGET, STALL_LOOKS_DIR are set`, 'm'), path);
        }
    });
});
