import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { FIXTURE_LOOKS_DIR, REQUIRED_ENV, SELECTION_ENV } from './looks-selection.mjs';
import { CONTENT_GUARD, EMPTY_BLOB, blobId, canaryBlobIds, contentGuard, privateBlobIds, publicBlobs } from './private-content.mjs';
import { plantCanary, plantLooks, removePlants } from './private-looks-plant.mjs';
import { sanitizeSvg } from './svg-allow.mjs';

/**
 * `no-tracked-file-is-a-private-look-file` (step 8g-pre; the 8g plan's
 * v2.7, as its critic's re-review corrected it, N1): under a private-look
 * selection, no blob this checkout could carry into a commit or a push — in
 * the index, in the working tree over a tracked path, untracked and not
 * ignored, or added by an unpushed commit — is a blob the selected private
 * repository holds anywhere in its history, or the re-serialisation the
 * build emits for one of its SVGs (`scripts/private-content.mjs`). The
 * canary's blobs (public bytes, from the recipe) and the empty blob are no
 * evidence. A match names the tracked path, never the private one.
 *
 * Without a selection the first case says so on stderr and passes; under
 * `STALL_LOOKS_REQUIRED` with none it fails, as the guards over sheets do.
 * The red proofs plant a private repository and a public one, both outside
 * this checkout; the twins that stay green are the canary from public bytes
 * over this checkout (three of its files are tracked ones, byte for byte)
 * and the empty blob. Whole-file copies only: a fragment or a redrawn
 * picture is the words rule's and the reviews'.
 *
 * `node --test`: a TypeScript test importing an `.mjs` breaks `tsc` (TS7016).
 * Git runs locally and only locally.
 */
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const scratch = [];
after(() => {
    for (const dir of scratch) {
        rmSync(dir, { recursive: true, force: true });
    }
    removePlants();
});

/**
 * A repository standing for this one, outside this checkout: two committed
 * files, `origin/main` at that commit, no global, system or user config.
 */
function publicRepo({ upstream = true } = {}) {
    const dir = realpathSync(mkdtempSync(join(tmpdir(), 'stall-content-public-')));
    const xdg = realpathSync(mkdtempSync(join(tmpdir(), 'stall-content-public-xdg-')));
    scratch.push(dir, xdg);
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
    const write = (path, bytes) => {
        mkdirSync(join(dir, dirname(path)), { recursive: true });
        writeFileSync(join(dir, path), bytes);
    };
    git('init', '-q', '-b', 'main', '.');
    write('a.txt', 'a public file\n');
    write('docs/readme.txt', 'public words\n');
    git('add', '-A');
    git('commit', '-q', '-m', 'base');
    if (upstream) {
        git('update-ref', 'refs/remotes/origin/main', 'HEAD');
    }
    return { dir, env, git, write };
}

/** A private file's bytes, under a name that must never be printed. */
const SECRET_PATH = 'fixture/art/secret-mark.svg';
const SECRET = '<svg xmlns="http://www.w3.org/2000/svg">\n  <!-- a private drawing -->\n  <path d="M0 0h4v4z"/>\n</svg>\n';

/** A private look repository (the fixture, planted) holding `SECRET` at `SECRET_PATH`. */
const privateRepo = () => plantLooks(undefined, { [SECRET_PATH]: SECRET });

/** The guard over `pub` with `priv` selected, git run in the planted environment; `exempt` the canary's ids unless given. */
const guard = (pub, priv, exempt) => contentGuard({ root: pub.dir, env: priv.selection, gitEnv: pub.env, ...(exempt === undefined ? {} : { exempt }) });

/** The one problem a plant must yield: its tracked path and where it stands, and neither the private path nor a byte of the private file. */
function assertCaught(result, path, where) {
    assert.equal(result.selected, true);
    const hits = result.problems.filter((problem) => problem.startsWith(`${JSON.stringify(path)} (${where})`));
    assert.equal(hits.length, 1, `${path} (${where}) is not named:\n  ${result.problems.join('\n  ') || '(no problem)'}`);
    for (const problem of result.problems) {
        assert.ok(!problem.includes('secret-mark') && !problem.includes('private drawing') && !problem.includes('M0 0h4'), `a problem prints the private file: ${problem}`);
    }
}

describe('no-tracked-file-is-a-private-look-file', () => {
    it('holds this checkout under this run’s selection, and says so when there is none', () => {
        const result = contentGuard({ root: ROOT });
        if (!result.selected) {
            process.stderr.write(`${CONTENT_GUARD}: no private look is selected, so no file of this checkout was compared\n`);
            return;
        }
        if (result.fixture) {
            process.stderr.write(`${CONTENT_GUARD}: the selection is the tracked fixture, this checkout's own files: nothing private to compare\n`);
            return;
        }
        process.stderr.write(
            `${CONTENT_GUARD}: compared ${result.compared.public} blobs of this checkout with ${result.compared.private} of the selection's (${result.compared.spared} the canary's or empty, exempt)\n`,
        );
        assert.deepEqual(result.problems, []);
    });

    it('fails under STALL_LOOKS_REQUIRED with nothing selected, as the guards over sheets do, and names the fixture as nothing private', () => {
        assert.throws(() => contentGuard({ root: ROOT, env: { [REQUIRED_ENV]: '1' } }), new RegExp(`${REQUIRED_ENV} is set and this run selects no private look`));
        assert.deepEqual(contentGuard({ root: ROOT, env: {} }), { selected: false });
        assert.deepEqual(contentGuard({ root: ROOT, env: { [SELECTION_ENV.target]: 'preview', [SELECTION_ENV.dir]: FIXTURE_LOOKS_DIR } }), { selected: true, fixture: true });
        assert.throws(() => contentGuard({ root: ROOT, env: { [SELECTION_ENV.target]: 'preview', [SELECTION_ENV.dir]: '.' } }), /names this checkout itself/);
    });

    it('hashes the working bytes as git hash-object --no-filters does, and the empty blob as git does', () => {
        const pub = publicRepo();
        pub.git('config', 'core.autocrlf', 'true');
        const bytes = Buffer.from('a line\r\nanother\r\n');
        const hashed = execFileSync('git', ['hash-object', '--no-filters', '--stdin'], { cwd: pub.dir, env: pub.env, input: bytes, encoding: 'utf8' }).trim();
        assert.equal(blobId(bytes), hashed);
        assert.equal(EMPTY_BLOB, 'e69de29bb2d1d6434b8b29ae775ad8c2e48c5391');
    });

    it('(a) catches a private file copied into the tree and staged', () => {
        const priv = privateRepo();
        const pub = publicRepo();
        assert.deepEqual(guard(pub, priv).problems, [], 'the public repository starts clean');
        pub.write('copied/mark.svg', SECRET);
        pub.git('add', 'copied/mark.svg');
        assertCaught(guard(pub, priv), 'copied/mark.svg', 'index');
    });

    it('(b) catches one copied and left untracked', () => {
        const priv = privateRepo();
        const pub = publicRepo();
        pub.write('copied/mark.svg', SECRET);
        assertCaught(guard(pub, priv), 'copied/mark.svg', 'untracked');
    });

    it('(c) catches one written over a tracked file and not staged', () => {
        const priv = privateRepo();
        const pub = publicRepo();
        pub.write('a.txt', SECRET);
        assertCaught(guard(pub, priv), 'a.txt', 'working tree');
    });

    it('(d) catches one committed and deleted in a later commit, both unpushed', () => {
        const priv = privateRepo();
        const pub = publicRepo();
        pub.write('copied/mark.svg', SECRET);
        pub.git('add', 'copied/mark.svg');
        pub.git('commit', '-q', '-m', 'add');
        const added = pub.git('rev-parse', 'HEAD');
        pub.git('rm', '-q', 'copied/mark.svg');
        pub.git('commit', '-q', '-m', 'remove');
        assert.equal(pub.git('status', '--porcelain'), '', 'the tree holds nothing of it');
        assertCaught(guard(pub, priv), 'copied/mark.svg', `commit ${added.slice(0, 12)}`);
        // Pushed, it is the remote's already: nothing a push from here adds.
        pub.git('update-ref', 'refs/remotes/origin/main', 'HEAD');
        assert.deepEqual(guard(pub, priv).problems, []);
    });

    it('(e) catches a file only an earlier private commit holds, on any branch', () => {
        const priv = privateRepo();
        const earlier = '.t-planted-look .stall-name { letter-spacing: 0.03em; }\n';
        writeFileSync(join(priv.dir, 'fixture', 'draft.css'), earlier);
        priv.git('add', '-A');
        priv.git('commit', '-q', '-m', 'a draft');
        priv.git('rm', '-q', 'fixture/draft.css');
        priv.git('commit', '-q', '-m', 'the draft gone');
        const branched = '.t-planted-look .stall-name { letter-spacing: 0.07em; }\n';
        priv.git('switch', '-q', '-c', 'another-draft');
        writeFileSync(join(priv.dir, 'fixture', 'branched.css'), branched);
        priv.git('add', '-A');
        priv.git('commit', '-q', '-m', 'a draft on a branch');
        priv.git('switch', '-q', 'main');
        assert.ok(!priv.git('ls-tree', '-r', 'HEAD').includes(blobId(Buffer.from(earlier))), 'the plant: the selection’s commit does not hold it');
        assert.ok(!priv.git('ls-tree', '-r', 'HEAD').includes(blobId(Buffer.from(branched))), 'the plant: nor the branch’s');
        const pub = publicRepo();
        pub.write('notes/one.css', earlier);
        pub.write('notes/two.css', branched);
        const result = guard(pub, priv);
        assertCaught(result, 'notes/one.css', 'untracked');
        assertCaught(result, 'notes/two.css', 'untracked');
    });

    /*
     * The reflog is not read, stated: a draft amended away is reached by no
     * ref, so no push or build carries it — and the owner's own canary clone
     * keeps such a draft holding one of Stall's served faces byte for byte,
     * public bytes copied into the private repository, which a guard
     * counting the reflog called a leak.
     */
    it('does not read a draft only the private reflog reaches', () => {
        const priv = privateRepo();
        const amended = '.t-planted-look .stall-name { letter-spacing: 0.05em; }\n';
        writeFileSync(join(priv.dir, 'fixture', 'amended.css'), amended);
        priv.git('add', '-A');
        priv.git('commit', '-q', '-m', 'a draft');
        priv.git('rm', '-q', 'fixture/amended.css');
        priv.git('commit', '-q', '--amend', '--allow-empty', '-m', 'amended away');
        assert.ok(!priv.git('rev-list', '--objects', '--all').includes(blobId(Buffer.from(amended))), 'the plant: no ref reaches the amended draft');
        assert.ok(priv.git('rev-list', '--objects', '--all', '--reflog').includes(blobId(Buffer.from(amended))), 'the plant: the reflog does');
        const pub = publicRepo();
        pub.write('notes/amended.css', amended);
        assert.deepEqual(guard(pub, priv).problems, []);
    });

    it('(f) catches the sanitizer’s re-serialisation of a private SVG, the form a build emits', () => {
        const priv = privateRepo();
        const { svg } = sanitizeSvg(SECRET);
        assert.ok(svg !== undefined && svg !== SECRET, 'the plant: the re-serialisation is other bytes than the file');
        const pub = publicRepo();
        pub.write('copied/served.svg', svg);
        assertCaught(guard(pub, priv), 'copied/served.svg', 'untracked');
    });

    it('fails rather than passing over unread commits: no origin/main, or a shallow clone', () => {
        const priv = privateRepo();
        const pub = publicRepo({ upstream: false });
        assert.ok(guard(pub, priv).problems.includes('no origin/main to compare with: the commits a push would publish are unknown'));
        const deep = publicRepo();
        deep.write('b.txt', 'a second commit\n');
        deep.git('add', 'b.txt');
        deep.git('commit', '-q', '-m', 'second');
        const shallow = realpathSync(mkdtempSync(join(tmpdir(), 'stall-content-shallow-')));
        scratch.push(shallow);
        execFileSync('git', ['clone', '-q', '--depth', '1', `file://${deep.dir}`, shallow], { env: deep.env, stdio: 'ignore' });
        const problems = guard({ dir: shallow, env: deep.env }, priv).problems;
        assert.ok(problems.includes('a shallow clone: the commits a push would publish cannot all be read'), problems.join('\n'));
    });

    /*
     * N1's false positive, measured on this checkout: the canary carries
     * files byte for byte tracked ones, so a guard that counted them would
     * fail the deploy job that carries the canary. Its blobs are computed
     * from the public recipe, and exempt; without the exemption the same
     * run is red.
     */
    it('stays green on the canary over this checkout, though its files are tracked ones, and is red there without the exemption', () => {
        const canary = plantCanary();
        const priv = privateBlobIds({ dir: canary.dir, env: canary.env });
        const pub = publicBlobs({ root: ROOT });
        const shared = pub.entries.filter((entry) => priv.ids.has(entry.id) && entry.id !== EMPTY_BLOB);
        assert.ok(shared.length >= 3, `the plant: the canary shares files with this checkout (${shared.map((e) => e.path).join(', ')})`);
        assert.ok(shared.every((entry) => canaryBlobIds().has(entry.id)), 'every shared file is one of the recipe’s');
        const env = { ...canary.selection };
        assert.deepEqual(contentGuard({ root: ROOT, env, gitEnv: canary.env }).problems, []);
        assert.ok(contentGuard({ root: ROOT, env, gitEnv: canary.env, exempt: new Set() }).problems.length >= 3);
    });

    it('treats the empty blob as no evidence, on either side', () => {
        const priv = plantLooks(undefined, { 'fixture/art/empty.svg': '' });
        const pub = publicRepo();
        pub.write('empty.txt', '');
        pub.git('add', 'empty.txt');
        assert.ok(privateBlobIds({ dir: priv.dir, env: priv.env }).ids.has(EMPTY_BLOB), 'the plant: the private repository holds the empty blob');
        assert.deepEqual(guard(pub, priv).problems, []);
        assert.ok(guard(pub, priv, new Set()).problems.length === 0, 'the empty blob is spared without any exemption too');
    });

    it('sees whole files only: one byte off is not a copy (the words rule’s and the reviews’, stated)', () => {
        const priv = privateRepo();
        const pub = publicRepo();
        pub.write('copied/mark.svg', SECRET.replace('M0 0h4', 'M0 0h5'));
        pub.git('add', 'copied/mark.svg');
        assert.deepEqual(guard(pub, priv).problems, []);
    });
});
