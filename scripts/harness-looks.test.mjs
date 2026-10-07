import { strict as assert } from 'node:assert';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { after, describe, it } from 'node:test';
import { join } from 'node:path';
import { ROOT, harnessLooks } from './harness-looks.mjs';
import { LOOKS_PIN_FILE, pairVerdict, pinLineFor } from './looks-pin.mjs';
import { FIXTURE_LOOKS_DIR, SELECTION_ENV } from './looks-selection.mjs';
import { plantLooks, removePlants } from './private-looks-plant.mjs';
import { publicLookFacts } from './private-looks.mjs';

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

/**
 * `the-harness-says-whether-it-measured-the-pinned-pair` (8c1, after its
 * critic): the line a harness command prints before it builds says, for a
 * preview selection, whether the private commit it measures is the pinned
 * pair's — the pin as this repository's HEAD holds it and the disk the same,
 * the selection's commit the pin's, the pin's tree that commit's packed
 * tree, this repository's tree clean — and says only that: whether the
 * private commit is on GitHub and this one is `main` is the dispatch's to
 * find out. A sentence, never a refusal: every read is of a commit, so a run
 * over an unpinned commit measures exactly what it names. It names this
 * repository's HEAD tree, never its commit, so it stays true in the body of
 * the commit that bumps the pin. Over a private repository planted from the
 * fixture and a public one planted beside it, both outside this checkout; a
 * production selection (a production build reads nothing private until step
 * 9) and the tracked fixture get no pair.
 */
describe('the-harness-says-whether-it-measured-the-pinned-pair', () => {
    after(removePlants);
    const scratch = [];
    after(() => {
        for (const dir of scratch) {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    /** A repository standing for this one: `deploy/looks.commit` holding `pin`, committed. */
    function publicRepo(pin) {
        const dir = realpathSync(mkdtempSync(join(tmpdir(), 'stall-planted-public-')));
        scratch.push(dir);
        const env = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', XDG_CONFIG_HOME: dir, GIT_AUTHOR_NAME: 'plant', GIT_AUTHOR_EMAIL: '', GIT_COMMITTER_NAME: 'plant', GIT_COMMITTER_EMAIL: '' };
        const git = (...args) => execFileSync('git', args, { cwd: dir, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
        git('init', '-q', '-b', 'main', '.');
        mkdirSync(join(dir, 'deploy'));
        writeFileSync(join(dir, LOOKS_PIN_FILE), pin);
        git('add', '-A');
        git('commit', '-q', '-m', 'planted');
        return { dir, git, tree: git('rev-parse', 'HEAD^{tree}') };
    }

    const facts = publicLookFacts();
    const measure = async (looks, publicDir, { commit, target = 'preview' } = {}) =>
        harnessLooks({ target, dir: looks.dir, ...(commit === undefined ? {} : { commit }) }, { root: publicDir, facts: await facts, env: looks.env });
    const PAIR = /^a preview selection at a private repository, commit [0-9a-f]{12}: canary \(t-planted-look\) · /;
    const lineFor = async (looks) => pinLineFor({ dir: looks.dir, env: looks.env, facts: await facts });

    it('says the pinned pair when it measures the pin from a clean tree, naming the public tree', async () => {
        const looks = plantLooks(undefined, { 'README.md': 'r\n', 'LOG.md': 'l\n' }, { slug: 'canary' });
        const pub = publicRepo(await lineFor(looks));
        const carried = await measure(looks, pub.dir);
        assert.equal(carried.pair.pinned, true);
        assert.match(carried.line, PAIR);
        assert.ok(carried.line.endsWith(` · the pin, with Stall tree ${pub.tree.slice(0, 12)} clean — the pinned pair`), carried.line);
        assert.doesNotMatch(carried.line, /deployable/);
        // A message amend keeps the tree, and with it the line.
        pub.git('commit', '-q', '--amend', '-m', 'the pin bump, its body carrying the line');
        assert.equal((await measure(looks, pub.dir)).line, carried.line);
    });

    it('says not the pinned pair when the commit it measures is not the pin', async () => {
        const looks = plantLooks(undefined, {}, { slug: 'canary' });
        const pinned = looks.head();
        const pub = publicRepo(await lineFor(looks));
        writeFileSync(join(looks.dir, 'index.json'), `${readFileSync(join(looks.dir, 'index.json'), 'utf8')}\n`);
        looks.git('commit', '-q', '-am', 'later');
        const carried = await measure(looks, pub.dir);
        assert.equal(carried.pair.pinned, false);
        assert.ok(carried.line.endsWith(` · not the pin ${pinned.slice(0, 12)} — not the pinned pair`), carried.line);
        // The pinned commit, named, is the pair again.
        assert.equal((await measure(looks, pub.dir, { commit: pinned })).pair.pinned, true);
    });

    it('reads the pin HEAD holds: a skip-worktree file naming the measured commit is not the pinned pair', async () => {
        const looks = plantLooks(undefined, {}, { slug: 'canary' });
        const first = looks.head();
        const pub = publicRepo(await lineFor(looks));
        writeFileSync(join(looks.dir, 'index.json'), `${readFileSync(join(looks.dir, 'index.json'), 'utf8')}\n`);
        looks.git('commit', '-q', '-am', 'later');
        // The disk names the later commit; HEAD's pin names the first; git status sees nothing.
        pub.git('update-index', '--skip-worktree', LOOKS_PIN_FILE);
        writeFileSync(join(pub.dir, LOOKS_PIN_FILE), await lineFor(looks));
        assert.equal(pub.git('status', '--porcelain'), '');
        const carried = await measure(looks, pub.dir);
        assert.equal(carried.pair.pinned, false);
        assert.ok(carried.line.endsWith(' · not the pinned pair: deploy/looks.commit on the disk differs from HEAD\'s'), carried.line);
        // And the commit HEAD pins, measured, is still told the disk is not HEAD's.
        assert.equal((await measure(looks, pub.dir, { commit: first })).pair.pinned, false);
    });

    it('says not the pinned pair when the pin’s tree is not its commit’s packed tree', async () => {
        const looks = plantLooks(undefined, {}, { slug: 'canary' });
        const pub = publicRepo(`${looks.head()} ${'a'.repeat(40)}\n`);
        const carried = await measure(looks, pub.dir);
        assert.equal(carried.pair.pinned, false);
        assert.match(carried.line, /· the pin's commit, and the pin's tree a{12} is not its packed tree [0-9a-f]{12} — not the pinned pair$/);
    });

    it('says not the pinned pair when this repository’s tree has uncommitted changes', async () => {
        const looks = plantLooks(undefined, {}, { slug: 'canary' });
        const pub = publicRepo(await lineFor(looks));
        writeFileSync(join(pub.dir, 'scratch.txt'), 'not committed\n');
        const carried = await measure(looks, pub.dir);
        assert.equal(carried.pair.pinned, false);
        assert.ok(carried.line.endsWith(` · the pin, with Stall tree ${pub.tree.slice(0, 12)} — not the pinned pair: the public tree has uncommitted changes`), carried.line);
    });

    it('says the private repository’s uncommitted changes are not measured, and the pair stands', async () => {
        const looks = plantLooks(undefined, {}, { slug: 'canary' });
        const pub = publicRepo(await lineFor(looks));
        writeFileSync(join(looks.dir, 'canary', 'sheet.css'), 'an edit no build reads\n');
        const carried = await measure(looks, pub.dir);
        assert.equal(carried.pair.pinned, true);
        assert.ok(carried.line.endsWith(' — the pinned pair (uncommitted changes in the private repository are not measured)'), carried.line);
    });

    it('says not the pinned pair, and goes on, when HEAD’s pin does not read as one', async () => {
        const looks = plantLooks(undefined, {}, { slug: 'canary' });
        for (const pin of [(await lineFor(looks)).replace('\n', '\r\n'), '']) {
            const pub = publicRepo(pin);
            const carried = await measure(looks, pub.dir);
            assert.equal(carried.pair.pinned, false);
            assert.match(carried.line, /· deploy\/looks\.commit at HEAD does not read as a pin — not the pinned pair \(deploy\/looks\.commit is \d+ bytes/);
        }
    });

    it('gives a production selection no pair: a production build reads nothing private until step 9', async () => {
        const looks = plantLooks(undefined, {}, { slug: 'canary' });
        const pub = publicRepo(await lineFor(looks));
        const carried = await measure(looks, pub.dir, { target: 'production' });
        assert.equal(carried.pair, undefined);
        assert.match(carried.line, /^a production selection at a private repository, commit [0-9a-f]{12}: no look$/);
    });

    it('gives the tracked fixture no pair: no deploy reads it', async () => {
        const carried = await harnessLooks({ target: 'preview', dir: FIXTURE_LOOKS_DIR });
        assert.equal(carried.pair, undefined);
        assert.match(carried.line, /the tracked fixture/);
        assert.doesNotMatch(carried.line, /pin|pair/);
    });

    it('is decided from facts alone, in the order a reader needs them', () => {
        const base = { commit: 'c'.repeat(40), pin: { commit: 'c'.repeat(40), tree: 't'.repeat(40) }, diskDiffers: false, packedTree: 't'.repeat(40), publicTree: 'h'.repeat(40), publicClean: true, privateClean: true };
        assert.deepEqual(pairVerdict(base), { pinned: true, sentence: `the pin, with Stall tree ${'h'.repeat(12)} clean — the pinned pair` });
        assert.equal(pairVerdict({ ...base, commit: 'd'.repeat(40), publicClean: false }).sentence, `not the pin ${'c'.repeat(12)} — not the pinned pair`);
        assert.equal(pairVerdict({ ...base, diskDiffers: true, commit: 'd'.repeat(40) }).sentence, "not the pinned pair: deploy/looks.commit on the disk differs from HEAD's");
        assert.equal(pairVerdict({ ...base, pin: undefined, pinError: 'why' }).pinned, false);
        assert.equal(pairVerdict({ ...base, privateClean: false }).pinned, true);
    });
});
