import { strict as assert } from 'node:assert';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, lstatSync, mkdirSync, mkdtempSync, realpathSync, rmSync, truncateSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { UNPUSHED_LOG_ARGS, UNPUSHED_LOG_OPTIONS, UNPUSHED_REVS, unpushedRevs } from './git-unpushed.mjs';
import { FIXTURE_LOOKS_DIR, REQUIRED_ENV, SELECTION_ENV } from './looks-selection.mjs';
import {
    CONTENT_GUARD,
    COPY_BOTH_WAYS,
    EMPTY_BLOB,
    blobId,
    canaryBlobIds,
    contentGuard,
    privateBlobIds,
    privateContentProblems,
    publicBlobs,
    WHOLE_UNDER,
    workingBlob,
} from './private-content.mjs';
import { plantCanary, plantLooks, removePlants } from './private-looks-plant.mjs';
import { sanitizeSvg } from './svg-allow.mjs';

/**
 * `no-tracked-file-is-a-private-look-file` (step 8g-pre; the 8g plan's
 * v2.7, as its critic's re-review corrected it, N1, and as the step's own
 * critic widened it): under a private-look selection, no blob this
 * repository could carry into a commit or a push — in any worktree's index,
 * over a tracked path in any worktree, untracked and not ignored in any
 * worktree, or anywhere a push could add to `origin` (a commit, a commit a
 * replace ref hides, a tag at a blob or a tree) — is a blob the selected
 * private repository holds: on a ref, in a reflog entry or a stash, in its
 * index or working trees, or as the re-serialisation the build emits for
 * one of its SVGs (`scripts/private-content.mjs`). The canary's blobs
 * (public bytes, from the recipe), the empty blob, and a blob only the
 * private history reaches whose copy `origin/main` already holds are no
 * evidence (the fences-followup critic's item 2). A match names the tracked
 * path, never the private one, and says both ways the copy may have gone
 * and the way out of each (the step critic's re-review, R2). The private
 * side reads its ignored files too (R4); a worktree git lists as
 * `prunable` is skipped on the public side, one that cannot be read is
 * named with the way to mend it, and a file gone between git's listing and
 * its read is no file (R1); on the private side a prunable worktree whose
 * directory stands fails, and its index is read (the fences-followup
 * critic's P2); no failure on the private side prints a private path, an
 * entry or git's own words (R3); a file that cannot be read fails, its
 * `lstat` included, a listing git warns about fails, and a file of any size
 * is hashed (that critic's items 3 and 4); and a detached worktree's
 * commits are walked (its item 5).
 *
 * Without a selection the first case says so on stderr and passes; under
 * `STALL_LOOKS_REQUIRED` with none it fails, as the guards over sheets do.
 * The red proofs plant a private repository and a public one, both outside
 * this checkout; the twins that stay green are the canary from public bytes
 * over this checkout (three of its files are tracked ones, byte for byte),
 * the empty blob, and a history-only private copy of a public file
 * `origin/main` holds (the owner's canary clone's case). Whole-file copies
 * only: a fragment or a redrawn picture is the words rule's and the
 * reviews'. With no selection, no case here reads a worktree of this
 * checkout but its own: the canary twin reads the root's own worktree
 * alone (`worktrees: 'own'`), and the worktree reader is held on planted
 * repositories; only the first case, under a selection, reads every
 * worktree on the machine, which is the guard's job.
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

/**
 * A git that answers `ls-files --stage` with an entry no git writes —
 * naming a path a private repository could hold — and is git for every
 * other command.
 */
function strangeGit() {
    const dir = realpathSync(mkdtempSync(join(tmpdir(), 'stall-content-git-')));
    scratch.push(dir);
    const path = join(dir, 'git-standin');
    writeFileSync(path, `#!/bin/sh\nfor arg in "$@"; do\n  if [ "$arg" = "--stage" ]; then printf '100644 not-an-id 0\\tsecret-look/draft.css\\000'; exit 0; fi\ndone\nexec git "$@"\n`, { mode: 0o755 });
    return path;
}

/** A failure's message, which must match `pattern` and name none of `hidden`: the private repository's directories and what it holds. */
function assertSaysNothingPrivate(fn, hidden, pattern) {
    assert.throws(fn, (error) => {
        assert.match(error.message, pattern);
        assert.ok(!error.message.includes('Command failed') && !error.message.includes('--no-replace-objects'), `a raw command line: ${error.message}`);
        for (const word of hidden) {
            assert.ok(!error.message.includes(word), `the message names ${JSON.stringify(word)}: ${error.message}`);
        }
        return true;
    });
}

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
        assert.ok(added.length === 40, 'the plant: the commit that added it');
        assertCaught(guard(pub, priv), 'copied/mark.svg', 'unpushed');
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
     * The step critic's item 3: what a push packs, read with replace
     * objects off — `rev-list --objects --branches --tags HEAD --not
     * --remotes=origin` — so a commit a replace ref hides, and a blob a tag
     * points at straight or through a tree, are read as a push sends them.
     */
    it('(g) catches a copy in a commit a replace ref hides', () => {
        const priv = privateRepo();
        const pub = publicRepo();
        const base = pub.git('rev-parse', 'HEAD');
        pub.write('copied/mark.svg', SECRET);
        pub.git('add', 'copied/mark.svg');
        pub.git('commit', '-q', '-m', 'add');
        const added = pub.git('rev-parse', 'HEAD');
        pub.git('rm', '-q', 'copied/mark.svg');
        pub.git('commit', '-q', '-m', 'remove');
        const clean = pub.git('commit-tree', `${base}^{tree}`, '-p', base, '-m', 'clean');
        pub.git('replace', added, clean);
        const secret = blobId(Buffer.from(SECRET));
        assert.ok(!pub.git('rev-list', '--objects', '--branches').includes(secret), 'the plant: through the replace ref, no commit holds it');
        assert.ok(pub.git('--no-replace-objects', 'rev-list', '--objects', '--branches').includes(secret), 'the plant: the real commit does');
        assertCaught(guard(pub, priv), 'copied/mark.svg', 'unpushed');
    });

    it('(h) catches a copy a lightweight tag points at, one an annotated tag points at, and one in a tree an annotated tag points at', () => {
        const priv = privateRepo();
        const plant = (tag) => {
            const pub = publicRepo();
            const blob = execFileSync('git', ['hash-object', '-w', '--stdin'], { cwd: pub.dir, env: pub.env, input: SECRET, encoding: 'utf8' }).trim();
            tag(pub, blob);
            assert.equal(pub.git('status', '--porcelain'), '', 'the plant: no worktree holds it');
            return pub;
        };
        assertCaught(guard(plant((pub, blob) => pub.git('tag', 'light', blob)), priv), 'refs/tags/light', 'unpushed');
        assertCaught(guard(plant((pub, blob) => pub.git('tag', '-a', 'ann', blob, '-m', 'a tag at a blob')), priv), 'refs/tags/ann', 'unpushed');
        const tree = plant((pub, blob) => {
            const at = execFileSync('git', ['mktree'], { cwd: pub.dir, env: pub.env, input: `100644 blob ${blob}\tin-tree.svg\n`, encoding: 'utf8' }).trim();
            pub.git('tag', '-a', 'tree', at, '-m', 'a tag at a tree');
        });
        assertCaught(guard(tree, priv), 'in-tree.svg', 'unpushed');
    });

    /* The step critic's item 4: a draft in the private repository's index or working tree, never committed. */
    it('(i) catches a private draft staged, written over a tracked file, or left untracked, never committed', () => {
        const priv = privateRepo();
        const staged = '.t-planted-look .stall-tagline { letter-spacing: 0.02em; }\n';
        const over = SECRET.replace('M0 0h4', 'M1 1h2');
        const loose = '.t-planted-look .stall-sub { letter-spacing: 0.04em; }\n';
        writeFileSync(join(priv.dir, 'fixture', 'staged.css'), staged);
        priv.git('add', 'fixture/staged.css');
        writeFileSync(join(priv.dir, SECRET_PATH), over);
        writeFileSync(join(priv.dir, 'fixture', 'loose.css'), loose);
        const pub = publicRepo();
        pub.write('notes/staged.css', staged);
        pub.write('notes/over.svg', over);
        pub.write('notes/loose.css', loose);
        const result = guard(pub, priv);
        assertCaught(result, 'notes/staged.css', 'untracked');
        assertCaught(result, 'notes/over.svg', 'untracked');
        assertCaught(result, 'notes/loose.css', 'untracked');
    });

    /* The step critic's item 7: a copy staged or left untracked in another worktree of this repository. */
    it('(j) catches a copy staged in another worktree and one left untracked there', () => {
        const priv = privateRepo();
        const pub = publicRepo();
        const other = join(realpathSync(mkdtempSync(join(tmpdir(), 'stall-content-worktree-'))), 'other-tree');
        scratch.push(dirname(other));
        pub.git('worktree', 'add', '-q', '-b', 'other', other);
        mkdirSync(join(other, 'copied'));
        writeFileSync(join(other, 'copied', 'mark.svg'), SECRET);
        execFileSync('git', ['add', 'copied/mark.svg'], { cwd: other, env: pub.env });
        writeFileSync(join(other, 'copied', 'loose.svg'), sanitizeSvg(SECRET).svg);
        assert.equal(pub.git('status', '--porcelain'), '', 'the plant: this worktree holds nothing of it');
        const result = guard(pub, priv);
        assertCaught(result, 'copied/mark.svg', 'index (worktree other-tree)');
        assertCaught(result, 'copied/loose.svg', 'untracked (worktree other-tree)');
    });

    /*
     * The step critic's item 5, option (b): the reflog is read — a draft
     * amended away, and every stash past `stash@{0}` — and a reflog-only
     * private blob is no evidence only when `origin/main`'s history already
     * holds its public copy: public bytes copied into the private
     * repository, which is what the owner's canary clone keeps (a reset-away
     * draft holding one of Stall's served faces byte for byte).
     */
    it('(k) catches a draft only the private reflog reaches, and an older stash entry', () => {
        const priv = privateRepo();
        const amended = '.t-planted-look .stall-name { letter-spacing: 0.05em; }\n';
        writeFileSync(join(priv.dir, 'fixture', 'amended.css'), amended);
        priv.git('add', '-A');
        priv.git('commit', '-q', '-m', 'a draft');
        priv.git('rm', '-q', 'fixture/amended.css');
        priv.git('commit', '-q', '--amend', '--allow-empty', '-m', 'amended away');
        const stashed = SECRET.replace('M0 0h4', 'M2 2h3');
        writeFileSync(join(priv.dir, SECRET_PATH), stashed);
        priv.git('stash', '-q');
        writeFileSync(join(priv.dir, SECRET_PATH), SECRET.replace('M0 0h4', 'M3 3h1'));
        priv.git('stash', '-q');
        for (const bytes of [amended, stashed]) {
            assert.ok(!priv.git('rev-list', '--objects', '--all').includes(blobId(Buffer.from(bytes))), 'the plant: no ref reaches it');
            assert.ok(priv.git('rev-list', '--objects', '--all', '--reflog').includes(blobId(Buffer.from(bytes))), 'the plant: a reflog does');
        }
        const pub = publicRepo();
        pub.write('notes/amended.css', amended);
        pub.write('notes/stashed.svg', stashed);
        const result = guard(pub, priv);
        assertCaught(result, 'notes/amended.css', 'untracked');
        assertCaught(result, 'notes/stashed.svg', 'untracked');
    });

    it('(l) spares a history-only private copy of a file origin/main holds, and nothing else', () => {
        const published = 'public words\n';
        const pending = 'public words not yet pushed\n';
        // The canary clone's case: public files copied into private drafts that were reset away.
        const reset = privateRepo();
        for (const [name, bytes] of [['copied.txt', published], ['pending.txt', pending]]) {
            writeFileSync(join(reset.dir, 'fixture', name), bytes);
            reset.git('add', '-A');
            reset.git('commit', '-q', '-m', 'a draft holding a public file');
            reset.git('reset', '-q', '--hard', 'HEAD~1');
            assert.ok(!reset.git('rev-list', '--objects', '--all').includes(blobId(Buffer.from(bytes))), 'the plant: only the reflog holds it');
        }
        const pub = publicRepo();
        assert.deepEqual(guard(pub, reset).problems, [], 'docs/readme.txt is on origin/main: public bytes copied in');
        // The other draft's bytes, committed here and not yet on origin/main: no exemption until they are.
        pub.write('notes/pending.txt', pending);
        pub.git('add', 'notes/pending.txt');
        pub.git('commit', '-q', '-m', 'pending');
        const before = guard(pub, reset);
        assertCaught(before, 'notes/pending.txt', 'index');
        assertCaught(before, 'notes/pending.txt', 'unpushed');
        pub.git('update-ref', 'refs/remotes/origin/main', 'HEAD');
        assert.deepEqual(guard(pub, reset).problems, [], 'once origin/main holds it, a reflog-only copy is no evidence (which came first is not something this guard can tell)');
        // The selected commit, not only the history, holding a copy of a published file: no exemption.
        const kept = privateRepo();
        writeFileSync(join(kept.dir, 'fixture', 'copied.txt'), published);
        kept.git('add', '-A');
        kept.git('commit', '-q', '-m', 'a public file kept');
        assertCaught(guard(pub, kept), 'docs/readme.txt', 'index');
    });

    it('asks origin/main only for a history-only match, so a run with none never lists its history', () => {
        const never = () => {
            throw new Error('origin/main asked');
        };
        const base = { shallow: false, upstream: 'u', exempt: new Set(), published: never };
        assert.deepEqual(privateContentProblems({ ...base, entries: [{ path: 'a', id: 'x', where: 'index' }], privateIds: new Set(), historyOnly: new Set() }), []);
        assert.equal(privateContentProblems({ ...base, entries: [{ path: 'a', id: 'x', where: 'index' }], privateIds: new Set(['x']), historyOnly: new Set() }).length, 1);
        assert.throws(() => privateContentProblems({ ...base, entries: [{ path: 'a', id: 'x', where: 'index' }], privateIds: new Set(), historyOnly: new Set(['x']) }), /origin\/main asked/);
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
        // This checkout's own worktree alone: this case holds the exemption, and the worktree reader is (j)'s and R1's.
        const pub = publicBlobs({ root: ROOT, worktrees: 'own' });
        assert.ok(!pub.entries.some((entry) => entry.where.includes('(worktree ')), 'the plant reads this worktree alone');
        const shared = pub.entries.filter((entry) => priv.ids.has(entry.id) && entry.id !== EMPTY_BLOB);
        assert.ok(shared.length >= 3, `the plant: the canary shares files with this checkout (${shared.map((e) => e.path).join(', ')})`);
        assert.ok(shared.every((entry) => canaryBlobIds().has(entry.id)), 'every shared file is one of the recipe’s');
        const env = { ...canary.selection };
        assert.deepEqual(contentGuard({ root: ROOT, env, gitEnv: canary.env, worktrees: 'own' }).problems, []);
        assert.ok(contentGuard({ root: ROOT, env, gitEnv: canary.env, worktrees: 'own', exempt: new Set() }).problems.length >= 3);
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
    /* The step critic's re-review, R2: a copy either way is one match, and its sentence says both ways and the way out of each. */
    it('(m) says both ways a copy may have gone, and the way out of each, when a private worktree holds a byte copy of a tracked public file', () => {
        const priv = privateRepo();
        const pub = publicRepo();
        // A port's natural first move: a tracked public file copied into the private clone, untracked and not yet edited.
        writeFileSync(join(priv.dir, 'fixture', 'template.txt'), 'a public file\n');
        assert.deepEqual(guard(pub, priv).problems, [`"a.txt" (index): ${COPY_BOTH_WAYS}`]);
        assert.match(COPY_BOTH_WAYS, /a private file was copied here \(take it out of this repository\)/);
        assert.match(COPY_BOTH_WAYS, /the private repository holds a byte copy of this public file \(make the private file differ: a copy then left only in the private repository's history is spared once origin\/main holds this public file\)/);
        assert.doesNotMatch(COPY_BOTH_WAYS, /its bytes are a private look's file/, 'the sentence no longer calls a public file a private one');
    });

    /* R4: the private side reads its ignored files, so a draft under an ignored directory copied out is seen. */
    it('(n) catches a draft under a directory the private repository ignores', () => {
        const priv = plantLooks(undefined, { '.gitignore': 'drafts/\n' });
        const draft = SECRET.replace('M0 0h4', 'M5 5h1');
        mkdirSync(join(priv.dir, 'drafts'));
        writeFileSync(join(priv.dir, 'drafts', 'draft.svg'), draft);
        assert.equal(priv.git('status', '--porcelain'), '', 'the plant: git sees nothing to add');
        assert.match(priv.git('status', '--porcelain', '--ignored'), /^!! drafts\/$/m, 'the plant: the draft is ignored');
        const pub = publicRepo();
        pub.write('notes/draft.svg', draft);
        assertCaught(guard(pub, priv), 'notes/draft.svg', 'untracked');
    });

    /* R1: a worktree git lists as prunable holds nothing to read; one that cannot be read is named, with the way to mend it, never git's command line. */
    it('skips a worktree git lists as prunable, and names one it cannot read with the way to mend it', () => {
        const priv = privateRepo();
        const pub = publicRepo();
        const base = realpathSync(mkdtempSync(join(tmpdir(), 'stall-content-worktrees-')));
        scratch.push(base);
        const gone = join(base, 'gone-tree');
        pub.git('worktree', 'add', '-q', '-b', 'gone', gone);
        rmSync(join(gone, '.git'));
        assert.match(pub.git('worktree', 'list', '--porcelain'), /^prunable /m, 'the plant: git lists it as prunable');
        assert.deepEqual(guard(pub, priv).problems, [], 'a prunable worktree is skipped, not a failure');
        const broken = join(base, 'broken-tree');
        pub.git('worktree', 'add', '-q', '-b', 'broken', broken);
        writeFileSync(join(broken, '.git'), 'gitdir: /nonexistent/stall-content-worktree\n');
        const listed = pub
            .git('worktree', 'list', '--porcelain')
            .split('\n\n')
            .find((block) => block.startsWith(`worktree ${broken}\n`));
        assert.ok(listed !== undefined && !/^prunable/m.test(listed), `the plant: git lists it, and not as prunable: ${listed}`);
        assert.throws(
            () => guard(pub, priv),
            (error) => {
                assert.ok(error.message.startsWith(`${CONTENT_GUARD}: the worktree at ${broken} could not be read: git ls-files -z --stage failed (exit 128)`), error.message);
                assert.match(error.message, /`git worktree repair`/);
                assert.match(error.message, /`git worktree prune`/);
                assert.ok(!error.message.includes('Command failed') && !error.message.includes('--no-replace-objects'), `a raw command line: ${error.message}`);
                return true;
            },
        );
    });

    it('reads a file gone between git’s listing and the read as no file, and words any other failure, of the lstat or the read, by who it is', () => {
        const file = { isSymbolicLink: () => false, isFile: () => true, size: 5 };
        const link = { isSymbolicLink: () => true, isFile: () => false, size: 5 };
        const failing = (code) => () => {
            throw Object.assign(new Error(`${code}: open '/secret-look/art/x.svg'`), { code });
        };
        const quiet = { where: 'the selected private repository', quiet: true, find: 'in its main worktree' };
        const loud = { where: 'this checkout', quiet: false };
        for (const code of ['ENOENT', 'ENOTDIR', 'EISDIR']) {
            for (const stat of [file, link]) {
                assert.equal(workingBlob('/secret-look/art/x.svg', quiet, { fs: { lstat: () => stat, readFile: failing(code), readlink: failing(code) } }), undefined, code);
            }
            assert.equal(workingBlob('/nowhere', quiet, { fs: { lstat: failing(code), readFile: failing('EACCES'), readlink: failing('EACCES') } }), undefined, `nothing there (${code} at the lstat)`);
        }
        // The read, and the lstat (the critic's item 3: a directory set to mode 000 made the lstat fail, which read as no file).
        for (const [at, fs] of [
            ['the read', { lstat: () => file, readFile: failing('EACCES'), readlink: failing('EACCES') }],
            ['the lstat', { lstat: failing('EACCES'), readFile: () => Buffer.from('bytes'), readlink: failing('EINVAL') }],
        ]) {
            assert.throws(
                () => workingBlob('/secret-look/art/x.svg', quiet, { listing: 'git ls-files --others --ignored --exclude-standard', fs }),
                (error) => {
                    assert.equal(
                        error.message,
                        `${CONTENT_GUARD}: the selected private repository could not be read: a file it lists could not be read (EACCES) — run \`git ls-files --others --ignored --exclude-standard\` in its main worktree and look for one you cannot read`,
                        at,
                    );
                    return true;
                },
            );
            assert.throws(() => workingBlob('/public/a.txt', loud, { fs }), /this checkout could not be read: a file could not be read \(EACCES\): \/public\/a\.txt$/, at);
        }
        assert.deepEqual(workingBlob('/a', loud, { fs: { lstat: () => file, readFile: () => Buffer.from('bytes'), readlink: failing('EINVAL') } }), { id: blobId(Buffer.from('bytes')), svg: undefined });
    });

    /* The critic's item 4: a file of any size is hashed — in chunks from `WHOLE_UNDER` bytes, where `readFileSync` would refuse one over 2 GiB. */
    it('hashes a big file in chunks as git does, past the 2 GiB a whole read refuses', () => {
        const dir = realpathSync(mkdtempSync(join(tmpdir(), 'stall-content-big-')));
        scratch.push(dir);
        const small = join(dir, 'chunked.bin');
        writeFileSync(small, Buffer.from(Array.from({ length: 300_000 }, (_, i) => (i * 7) % 251)));
        const hashed = execFileSync('git', ['hash-object', '--no-filters', small], { encoding: 'utf8' }).trim();
        const loud = { where: 'this checkout', quiet: false };
        assert.deepEqual(workingBlob(small, loud, { wholeUnder: 1024 }), { id: hashed, svg: undefined }, 'read in chunks, the id git writes');
        assert.ok(WHOLE_UNDER < 2 ** 31 - 1, 'a whole read stays under what readFileSync takes');
        // A sparse file one byte past 2 GiB: no disk, and a size a whole read refuses.
        const big = join(dir, 'past-two-gib.bin');
        const size = 2 ** 31 + 1;
        writeFileSync(big, '');
        truncateSync(big, size);
        assert.equal(lstatSync(big).size, size, 'the plant');
        const zeros = Buffer.alloc(8 * 1024 * 1024);
        const expected = createHash('sha1').update(`blob ${size}\0`);
        for (let left = size; left > 0; left -= Math.min(left, zeros.length)) {
            expected.update(left >= zeros.length ? zeros : zeros.subarray(0, left));
        }
        assert.deepEqual(workingBlob(big, loud), { id: expected.digest('hex'), svg: undefined });
    });

    /* R3: no failure on the private side prints a private path, an entry, or git's own words. */
    it('names no private path when a private worktree’s index is corrupt, a private entry is one it does not know, or the selection is no repository', () => {
        const priv = privateRepo();
        const pub = publicRepo();
        const base = realpathSync(mkdtempSync(join(tmpdir(), 'stall-content-private-wt-')));
        scratch.push(base);
        const draft = join(base, 'secret-look-draft-wt');
        priv.git('worktree', 'add', '-q', '-b', 'draft', draft);
        const gitDir = execFileSync('git', ['rev-parse', '--absolute-git-dir'], { cwd: draft, env: priv.env, encoding: 'utf8' }).trim();
        writeFileSync(join(gitDir, 'index'), 'not an index\n');
        const privatePaths = [priv.dir, draft, gitDir, 'secret-look-draft-wt', 'secret-mark'];
        assertSaysNothingPrivate(() => guard(pub, priv), privatePaths, /a linked worktree of the selected private repository could not be read: git ls-files -z --stage failed \(exit 128\) — if it moved, run `git worktree repair` in that repository/);
        rmSync(join(gitDir, 'index'));
        priv.git('worktree', 'remove', '--force', draft);
        // An index entry this reader does not know: on the private side its path is not printed, on the public side it is.
        const git = strangeGit();
        assertSaysNothingPrivate(() => privateBlobIds({ dir: priv.dir, env: priv.env, git }), [...privatePaths, 'secret-look/draft.css', 'not-an-id'], /the selected private repository could not be read: git ls-files --stage printed an entry this reader does not know$/);
        assert.throws(() => publicBlobs({ root: pub.dir, env: pub.env, git }), /this checkout could not be read: git ls-files --stage printed an entry this reader does not know: "100644 not-an-id 0\\tsecret-look\/draft\.css"/);
        // A selection that names no repository: the build's own read of it would print the directory and git's command line.
        const nowhere = realpathSync(mkdtempSync(join(tmpdir(), 'stall-content-secret-look-')));
        scratch.push(nowhere);
        assertSaysNothingPrivate(
            () => contentGuard({ root: pub.dir, env: { [SELECTION_ENV.target]: 'preview', [SELECTION_ENV.dir]: nowhere }, gitEnv: pub.env }),
            [nowhere, 'secret-look'],
            /the selected private repository could not be read: STALL_LOOKS_DIR names no repository root git can read/,
        );
        // And a private root git cannot read at all.
        assertSaysNothingPrivate(() => privateBlobIds({ dir: nowhere, env: pub.env }), [nowhere, 'secret-look'], /the selected private repository could not be read: git rev-parse --show-toplevel failed \(exit 128\)$/);
    });

    /* R5: the look-art guard's walk and this one are one definition; each detached worktree's HEAD goes before `--not` (the critic's item 5). */
    it('walks the refs a push could publish exactly as the look-art guard walks them', () => {
        assert.deepEqual([...UNPUSHED_LOG_ARGS], [...UNPUSHED_LOG_OPTIONS, ...UNPUSHED_REVS], 'the log walk ends with the revs the blob walk reads');
        assert.deepEqual([...UNPUSHED_REVS], unpushedRevs([]));
        assert.deepEqual(unpushedRevs(['c0ffee']), ['--branches', '--tags', 'HEAD', 'c0ffee', '--not', '--remotes=origin'], 'a worktree HEAD is walked, never negated');
        // The look-art guard's arguments where no other worktree is detached, as they stood before the walk was shared: byte for byte the same.
        assert.deepEqual(
            [...UNPUSHED_LOG_ARGS],
            [
                'log',
                '-z',
                '--root',
                '--diff-merges=separate',
                '--ignore-submodules=none',
                '--no-show-signature',
                '--full-history',
                '--no-renames',
                '--raw',
                '--no-abbrev',
                '--format=%x01%H',
                '--branches',
                '--tags',
                'HEAD',
                '--not',
                '--remotes=origin',
            ],
        );
        assert.ok(Object.isFrozen(UNPUSHED_LOG_ARGS) && Object.isFrozen(UNPUSHED_REVS) && Object.isFrozen(UNPUSHED_LOG_OPTIONS));
    });

    /* The critic's item 5: a commit made on a detached HEAD in another worktree, which `git push origin HEAD:<branch>` from there publishes. */
    it('catches a copy committed on a detached HEAD in another worktree, read from this one', () => {
        const priv = privateRepo();
        const pub = publicRepo();
        const other = join(realpathSync(mkdtempSync(join(tmpdir(), 'stall-content-detached-'))), 'detached-tree');
        scratch.push(dirname(other));
        pub.git('worktree', 'add', '-q', '--detach', other);
        const there = (...args) => execFileSync('git', args, { cwd: other, env: pub.env, encoding: 'utf8' }).trim();
        mkdirSync(join(other, 'copied'));
        writeFileSync(join(other, 'copied', 'mark.svg'), SECRET);
        there('add', 'copied/mark.svg');
        there('commit', '-q', '-m', 'add');
        there('rm', '-q', 'copied/mark.svg');
        there('commit', '-q', '-m', 'remove');
        assert.equal(there('status', '--porcelain'), '', 'the plant: that worktree holds nothing of it now');
        assert.equal(pub.git('branch', '--contains', there('rev-parse', 'HEAD')), '', 'the plant: no branch reaches it');
        assertCaught(guard(pub, priv), 'copied/mark.svg', 'unpushed');
    });

    /* The fences-followup critic's P2: on the private side a prunable worktree is read where it can be, and fails where its files stand. */
    it('fails on a private worktree git lists as prunable while its directory stands, and reads the index of one whose directory is gone', () => {
        const priv = privateRepo();
        const pub = publicRepo();
        const base = realpathSync(mkdtempSync(join(tmpdir(), 'stall-content-private-prunable-')));
        scratch.push(base);
        // A draft left untracked in a linked worktree whose .git file is then deleted: the critic's plant.
        const standing = join(base, 'secret-look-standing-wt');
        priv.git('worktree', 'add', '-q', '-b', 'standing', standing);
        const draft = SECRET.replace('M0 0h4', 'M6 6h1');
        writeFileSync(join(standing, 'fixture', 'draft.svg'), draft);
        pub.write('notes/draft.svg', draft);
        assertCaught(guard(pub, priv), 'notes/draft.svg', 'untracked');
        rmSync(join(standing, '.git'));
        assert.match(priv.git('worktree', 'list', '--porcelain'), /^prunable /m, 'the plant: git lists it as prunable');
        assertSaysNothingPrivate(
            () => guard(pub, priv),
            [priv.dir, standing, 'secret-look-standing-wt', 'secret-mark'],
            /a linked worktree of the selected private repository could not be read: git lists it as prunable while its directory still stands, so its files cannot be read through git — run `git worktree list` in that repository to find it, then `git worktree repair <its directory>`, or move its files out and `git worktree prune`$/,
        );
        // Repaired, it is read again (git 2.50 writes the .git file back and still exits 1, so its status is not read).
        spawnSync('git', ['worktree', 'repair', standing], { cwd: priv.dir, env: priv.env, stdio: 'ignore' });
        assert.doesNotMatch(priv.git('worktree', 'list', '--porcelain'), /^prunable /m, 'the plant: repaired');
        assertCaught(guard(pub, priv), 'notes/draft.svg', 'untracked');
        rmSync(standing, { recursive: true, force: true });
        // Removed with its index left behind: the index is still read.
        const gone = join(base, 'secret-look-gone-wt');
        priv.git('worktree', 'add', '-q', '-b', 'gone', gone);
        const staged = SECRET.replace('M0 0h4', 'M7 7h1');
        writeFileSync(join(gone, 'fixture', 'staged.svg'), staged);
        execFileSync('git', ['add', 'fixture/staged.svg'], { cwd: gone, env: priv.env });
        rmSync(gone, { recursive: true, force: true });
        assert.match(priv.git('worktree', 'list', '--porcelain'), /^prunable /m, 'the plant: git lists it as prunable, its directory gone');
        pub.write('notes/staged.svg', staged);
        assertCaught(guard(pub, priv), 'notes/staged.svg', 'untracked');
    });

    /*
     * The critic's item 2: a copy of a public file committed in the private
     * repository stays in its history whatever follows, so the reflog's
     * history-only rule is the history's: spared once origin/main holds the
     * public file, never while the selected commit or a worktree holds it.
     */
    it('spares a committed copy of a public file once the private file differs and origin/main holds the public one, and nothing else', () => {
        const pub = publicRepo();
        const template = 'a public template\n';
        pub.write('layout/template.css', template);
        pub.git('add', 'layout/template.css');
        pub.git('commit', '-q', '-m', 'template');
        // Not yet on origin/main: a port starts from it, commits the copy, then edits it.
        const priv = privateRepo();
        writeFileSync(join(priv.dir, 'fixture', 'started.css'), template);
        priv.git('add', '-A');
        priv.git('commit', '-q', '-m', 'start from the public template');
        const copied = priv.head();
        assertCaught(guard(pub, priv), 'layout/template.css', 'index');
        writeFileSync(join(priv.dir, 'fixture', 'started.css'), '.t-planted-look .stall-name { letter-spacing: 0.06em; }\n');
        priv.git('commit', '-q', '-am', 'made its own');
        assert.ok(priv.git('rev-list', '--objects', '--all').includes(blobId(Buffer.from(template))), 'the plant: the history still holds the copy');
        assertCaught(guard(pub, priv), 'layout/template.css', 'index');
        // Once origin/main holds the public file, a copy only the private history reaches is no evidence.
        pub.git('update-ref', 'refs/remotes/origin/main', 'HEAD');
        assert.deepEqual(guard(pub, priv).problems, []);
        // A selection that names the commit holding it: the selected commit holds it, and it fails.
        const atCopied = { ...priv.selection, [SELECTION_ENV.commit]: copied };
        assertCaught(contentGuard({ root: pub.dir, env: atCopied, gitEnv: pub.env }), 'layout/template.css', 'index');
        // New bytes only the history reaches still fail: a private draft never published.
        const draft = '.t-planted-look .stall-tagline { letter-spacing: 0.01em; }\n';
        writeFileSync(join(priv.dir, 'fixture', 'draft.css'), draft);
        priv.git('add', '-A');
        priv.git('commit', '-q', '-m', 'a draft');
        priv.git('rm', '-q', 'fixture/draft.css');
        priv.git('commit', '-q', '-m', 'the draft gone');
        pub.write('notes/draft.css', draft);
        assertCaught(guard(pub, priv), 'notes/draft.css', 'untracked');
    });

    /* The critic's item 3: a file under a directory set to mode 000 failed its lstat and read as no file; and git, warned, lists nothing under such a directory. */
    it('fails on a private file its directory will not let it read, and on a listing git warns it could not finish', (t) => {
        if (process.getuid?.() === 0) {
            t.skip('root reads through a mode-000 directory, so the plant denies nothing');
            return;
        }
        const priv = privateRepo();
        const pub = publicRepo();
        const edited = SECRET.replace('M0 0h4', 'M8 8h1');
        writeFileSync(join(priv.dir, SECRET_PATH), edited);
        pub.write('notes/edited.svg', edited);
        assertCaught(guard(pub, priv), 'notes/edited.svg', 'untracked');
        const art = join(priv.dir, dirname(SECRET_PATH));
        const lstatFails = /the selected private repository could not be read: a file it lists could not be read \(EACCES\) — run `git ls-files` in its main worktree and look for one you cannot read$/;
        // Readable and not searchable: git lists the directory's names and warns of nothing, and the lstat of the tracked file fails.
        chmodSync(art, 0o444);
        try {
            assert.throws(() => lstatSync(join(priv.dir, SECRET_PATH)), { code: 'EACCES' }, 'the plant: its lstat fails');
            assertSaysNothingPrivate(() => guard(pub, priv), [priv.dir, 'secret-mark', 'fixture/art'], lstatFails);
        } finally {
            chmodSync(art, 0o755);
        }
        // Mode 000, the critic's plant: the lstat fails first.
        chmodSync(art, 0o000);
        try {
            assertSaysNothingPrivate(() => guard(pub, priv), [priv.dir, 'secret-mark', 'fixture/art'], lstatFails);
        } finally {
            chmodSync(art, 0o755);
        }
        // An untracked draft in a directory git cannot open: the listing warns, and the run fails rather than passing over it.
        const drafts = join(priv.dir, 'drafts');
        mkdirSync(drafts);
        writeFileSync(join(drafts, 'loose.svg'), SECRET.replace('M0 0h4', 'M9 9h1'));
        chmodSync(drafts, 0o000);
        try {
            assertSaysNothingPrivate(
                () => guard(pub, priv),
                [priv.dir, 'drafts', 'loose.svg'],
                /the selected private repository could not be read: `git ls-files --others --exclude-standard` warned that it could not read part of the tree, so the files there were never listed — run it in its main worktree to see which, and make it readable$/,
            );
        } finally {
            chmodSync(drafts, 0o755);
        }
    });
});
