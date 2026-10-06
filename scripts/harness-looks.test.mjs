import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';
import { join } from 'node:path';
import { ROOT, harnessLooks } from './harness-looks.mjs';
import { FIXTURE_LOOKS_DIR, SELECTION_ENV } from './looks-selection.mjs';

/**
 * `the-harness-reads-the-looks-a-selection-carries` (8e2): what a harness
 * command measures under a selection is what a build with it carries, read
 * as the build reads it — the classes it expects are derived, never listed —
 * and the commit is read once and pinned into every build the command makes.
 * Over the tracked fixture at this checkout's HEAD, as the build reads it.
 *
 * `node --test`: a TypeScript test importing an `.mjs` breaks `tsc` (TS7016).
 */
const HEAD = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim();

describe('the-harness-reads-the-looks-a-selection-carries', () => {
    it('reads nothing, and runs no git, with no selection', async () => {
        const none = await harnessLooks(undefined, { git: '/nonexistent/git' });
        assert.deepEqual(none.looks, []);
        assert.deepEqual(none.env, {});
        assert.equal(none.commit, undefined);
        assert.match(none.line, /the public build/);
    });

    it('reads what a preview build of the fixture carries, its commit pinned and its directory absolute', async () => {
        const carried = await harnessLooks({ target: 'preview', dir: FIXTURE_LOOKS_DIR });
        assert.equal(carried.fixture, true);
        assert.equal(carried.commit, HEAD);
        assert.deepEqual(carried.looks, [{ id: 4, slug: 'fixture', cls: 't-fixture-private', paid: true }]);
        assert.deepEqual(carried.env, {
            [SELECTION_ENV.target]: 'preview',
            [SELECTION_ENV.dir]: join(ROOT, FIXTURE_LOOKS_DIR),
            [SELECTION_ENV.commit]: HEAD,
        });
        assert.match(carried.line, /^a preview selection at the tracked fixture, commit [0-9a-f]{12}: fixture \(t-fixture-private\)$/);
    });

    it('reads what the public lists let a production build carry — nothing, while no look is released', async () => {
        const carried = await harnessLooks({ target: 'production', dir: FIXTURE_LOOKS_DIR, commit: HEAD });
        assert.deepEqual(carried.looks, []);
        assert.equal(carried.env[SELECTION_ENV.commit], HEAD);
        assert.match(carried.line, /: no look$/);
    });

    it('throws over a selection the build would refuse', async () => {
        await assert.rejects(harnessLooks({ target: 'preview', dir: 'layout' }), /inside a repository and not its root/);
    });
});
