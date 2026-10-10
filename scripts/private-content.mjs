/**
 * No file of this repository is a private look's file (step 8g-pre; the 8g
 * plan's v2.7, as its critic's re-review corrected it, N1, and as the
 * step's own critic widened it): read as git object ids — the same SHA-1
 * blob format on both sides, so equal ids are equal bytes — under a
 * private-look selection, and naming the tracked path of a match, never the
 * private path or a byte of the private file.
 *
 * **The public side** (`publicBlobs`), everything a commit or a push from
 * this repository could carry: in **every worktree** (`git worktree list
 * --porcelain`, the step critic's item 7 — a copy staged in one worktree
 * while the selected run happens in another; one git lists as `prunable`,
 * whose directory or `.git` is gone, holds nothing to read and is skipped),
 * every blob in the index (`git ls-files --stage`, gitlinks skipped), the
 * working bytes of every tracked path (a copy written over a tracked file
 * and not staged is seen whatever git's stat cache says), and every
 * untracked file git does not ignore (`git ls-files --others
 * --exclude-standard`); and every blob a push could add to `origin`
 * (`readUnpushedBlobs`, `scripts/git-unpushed.mjs`: `git rev-list --objects
 * --branches --tags HEAD --not --remotes=origin`, replace objects off — so a
 * commit a replace ref hides, a tag at a blob and a tag at a tree are read,
 * item 3). A shallow clone or a missing `origin/main` fails rather than
 * passing over nothing. Working bytes are hashed as `git hash-object
 * --no-filters` hashes them (`blobId`); a link as the text git stores for
 * it; a file gone between git's listing and its read is no file. A worktree
 * that cannot be read fails with a sentence naming it and the way to mend it
 * (`git worktree repair`, `git worktree prune`), never git's command line
 * (the re-review's R1).
 *
 * **The private side** (`privateBlobIds`), the same in every worktree of the
 * selected repository — its index, the working bytes of its tracked paths,
 * its untracked files (item 4: an uncommitted draft copied out is seen), and
 * its ignored files too (`git ls-files --others --ignored
 * --exclude-standard`, the re-review's R4: a draft under an ignored
 * directory; never a path under a `.git` directory) — and every blob
 * reachable from a ref (`git rev-list --objects --all`) or from a reflog
 * entry (`--reflog`: a draft amended or reset away, and every stash entry
 * past `stash@{0}`), replace objects off, location variables dropped; plus
 * each SVG's re-serialisation by the build's own sanitizer (`sanitizeSvg`,
 * `scripts/svg-allow.mjs`) hashed as a blob, the form a build emits. **A
 * failure on this side names no private path, no entry and none of git's
 * own words** (which name its directories): only the selected private
 * repository, which of its worktrees, and which read failed (the
 * re-review's R3).
 *
 * **Exempt**: every blob of the canary, computed from the public recipe
 * (`canaryFiles`, `scripts/private-looks-plant.mjs`), with its SVGs'
 * re-serialisations (N1: three canary files are tracked files byte for
 * byte, so a guard that counted them would fail the very dispatch that
 * carries the canary); the empty blob, which is no evidence of anything;
 * and — the only blobs the reflog alone reaches (the step critic's item 5,
 * option (b)) — one whose public copy `origin/main`'s history already
 * holds. That is public bytes copied *into* the private repository, which
 * the guard cannot otherwise tell from private bytes copied out: the
 * owner's canary clone keeps a reset-away draft that held one of Stall's
 * served faces byte for byte. A reflog-only draft of new bytes is caught,
 * and nothing a ref, an index or a working tree holds is exempted this way.
 * `origin/main`'s objects are listed only when such a match happens. Any
 * other match is a problem whichever way the copy went, and its sentence
 * names both ways and the way out of each (the re-review's R2): a private
 * file copied here comes out, and a private file that is a byte copy of a
 * public one is made to differ.
 *
 * **Stated limits**: whole-file copies only — a pasted fragment of a sheet, a
 * picture redrawn by hand, a shot or a plate of a private look, or the
 * minified CSS a build serves are the words rule's and the reviews'. And
 * equality is on stored bytes: a clean filter, `core.autocrlf` or a
 * `text`/`eol` attribute (`.git/info/attributes` included) on either side
 * changes what git stores, so a file normalised by `git add` is another blob
 * once committed, seen here only while its working copy stands.
 *
 * Node built-ins, git and this repository's own modules. Test:
 * `no-tracked-file-is-a-private-look-file` (`scripts/private-content.test.mjs`).
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readlinkSync, realpathSync } from 'node:fs';
import { basename, join } from 'node:path';
import { readUnpushedBlobs } from './git-unpushed.mjs';
import { GITLINK_MODE } from './licence-map-lib.mjs';
import { REQUIRED_ENV, SELECTION_ENV, selectionFromEnv, selectionRequired } from './looks-selection.mjs';
import { selectedTree } from './private-looks-build.mjs';
import { canaryFiles } from './private-looks-plant.mjs';
import { GIT_LOCATION_VARS } from './private-looks.mjs';
import { sanitizeSvg } from './svg-allow.mjs';

/** The test's name, which every line this guard prints opens with. */
export const CONTENT_GUARD = 'no-tracked-file-is-a-private-look-file';

/** A blob's id as git writes it: SHA-1 over `blob <size>\0` and the bytes — `git hash-object --no-filters`, never through a filter. */
export function blobId(bytes) {
    const body = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
    return createHash('sha1').update(`blob ${body.length}\0`).update(body).digest('hex');
}

/** The empty blob: no evidence of anything, on either side. */
export const EMPTY_BLOB = blobId(Buffer.alloc(0));

/** The id of an SVG's re-serialisation by the build's sanitizer, or undefined when the sanitizer refuses it (the build would emit nothing). */
export function sanitizedSvgId(text) {
    const { svg } = sanitizeSvg(text);
    return svg === undefined ? undefined : blobId(Buffer.from(svg, 'utf8'));
}

/** Bytes that may be an SVG: the sanitizer's id of them, or undefined. */
function svgIdOf(bytes) {
    return bytes.includes('<svg') ? sanitizedSvgId(bytes.toString('utf8')) : undefined;
}

/**
 * The canary's blob ids, from the public recipe (`canaryFiles`): each file
 * of its packed tree and each SVG's re-serialisation — what a run over the
 * canary may hold without a single private byte in it.
 */
export function canaryBlobIds() {
    const ids = new Set();
    for (const contents of Object.values(canaryFiles())) {
        const bytes = Buffer.isBuffer(contents) ? contents : Buffer.from(contents, 'utf8');
        ids.add(blobId(bytes));
        const svg = svgIdOf(bytes);
        if (svg !== undefined) {
            ids.add(svg);
        }
    }
    return ids;
}

/** `env` with the variables that tell git where a repository is dropped, and replace objects off — as every private-look read runs. */
function cleanEnv(env) {
    const clean = { ...env, GIT_NO_REPLACE_OBJECTS: '1' };
    for (const name of GIT_LOCATION_VARS) {
        delete clean[name];
    }
    return clean;
}

/**
 * Who a read is, in a message: `where` its name, `quiet` whether a message
 * may name nothing it holds (the private side: no path, no entry and none
 * of git's own words, which name its directories — the re-review's R3), and
 * `mend` what to do when it cannot be read, if anything.
 */
const THIS_CHECKOUT = Object.freeze({ where: 'this checkout', quiet: false });
const SELECTED = Object.freeze({ where: 'the selected private repository', quiet: true });
const publicWorktree = (dir) =>
    Object.freeze({
        where: `the worktree at ${dir}`,
        quiet: false,
        mend: 'if it moved, run `git worktree repair` in this checkout; if it is gone, `git worktree prune`',
    });
const PRIVATE_WORKTREE = Object.freeze({
    where: 'a linked worktree of the selected private repository',
    quiet: true,
    mend: 'if it moved, run `git worktree repair` in that repository; if it is gone, `git worktree prune` there',
});

/** A read that failed, as a sentence: who could not be read, what failed, and the way to mend it. */
function unreadable(who, what) {
    return new Error(`${CONTENT_GUARD}: ${who.where} could not be read: ${what}${who.mend === undefined ? '' : ` — ${who.mend}`}`);
}

/** The first line of what git wrote to stderr, or nothing. */
function gitSaid(error) {
    const text = Buffer.isBuffer(error?.stderr) ? error.stderr.toString('utf8') : typeof error?.stderr === 'string' ? error.stderr : '';
    return text.split('\n').find((line) => line.trim() !== '')?.trim();
}

/**
 * A git runner in `dir`: replace objects off, location variables dropped,
 * bytes out. A failure throws `unreadable(who, …)`: the subcommand and its
 * options (never the `-C` directory), the exit status, and — on a side that
 * is not quiet — git's first line on stderr.
 */
function gitIn(dir, who, { git = 'git', env = process.env } = {}) {
    const clean = cleanEnv(env);
    return (args, input) => {
        try {
            return execFileSync(git, ['--no-replace-objects', '-C', dir, ...args], {
                env: clean,
                input,
                maxBuffer: 1024 * 1024 * 1024,
                stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
            });
        } catch (error) {
            const status = typeof error?.status === 'number' ? ` (exit ${error.status})` : error?.code === undefined ? '' : ` (${error.code})`;
            const said = who.quiet ? undefined : gitSaid(error);
            throw unreadable(who, `git ${args.join(' ')} failed${status}${said === undefined ? '' : `: ${said}`}`);
        }
    };
}

/** A repository's object format must be the one `blobId` writes, or no id here would mean equal bytes. */
function requireSha1(run, where) {
    const format = run(['rev-parse', '--show-object-format']).toString('utf8').trim();
    if (format !== 'sha1') {
        throw new Error(`${CONTENT_GUARD}: ${where} stores ${format} objects, and the ids compared here are SHA-1`);
    }
}

/**
 * Every worktree of the repository `run` reads, as `git worktree list
 * --porcelain -z` lists them: the checked-out ones whose directory stands —
 * a bare entry, one whose directory is gone and one git lists as `prunable`
 * (its directory or its `.git` gone: the re-review's R1) hold no index or
 * working tree to read.
 */
function worktreesOf(run) {
    const out = run(['worktree', 'list', '--porcelain', '-z']).toString('utf8');
    const trees = [];
    for (const block of out.split('\0\0')) {
        const fields = block.split('\0').filter((field) => field !== '');
        const path = fields.find((field) => field.startsWith('worktree '))?.slice('worktree '.length);
        const prunable = fields.some((field) => field === 'prunable' || field.startsWith('prunable '));
        if (path !== undefined && !fields.includes('bare') && !prunable && existsSync(path)) {
            trees.push(path);
        }
    }
    return trees;
}

/** The read errors that mean the file went away between git's listing and the read: no file, not a failure (the re-review's R1). */
const GONE = new Set(['ENOENT', 'ENOTDIR', 'EISDIR']);

/** Node's own file system calls, as `workingBytes` reads through them. */
const NODE_FS = Object.freeze({ lstat: lstatSync, readFile: readFileSync, readlink: (path) => readlinkSync(path, { encoding: 'buffer' }) });

/**
 * The working bytes at `full`: a link as its text, a file as its bytes, or
 * undefined when there is no file there — nothing at all, something that is
 * not a file or a link, or one that went away between the `lstat` and the
 * read (`GONE`). Any other failure throws `unreadable(who, …)`, naming the
 * path only where `who` is not quiet. `fs` stands in for Node's own calls.
 */
export function workingBytes(full, who, fs = NODE_FS) {
    let stat;
    try {
        stat = fs.lstat(full);
    } catch {
        return undefined;
    }
    if (!stat.isSymbolicLink() && !stat.isFile()) {
        return undefined;
    }
    try {
        const bytes = stat.isSymbolicLink() ? fs.readlink(full) : fs.readFile(full);
        return Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
    } catch (error) {
        if (GONE.has(error?.code)) {
            return undefined;
        }
        throw unreadable(who, `a file could not be read (${error?.code ?? 'an error'})${who.quiet ? '' : `: ${full}`}`);
    }
}

/** Whether `path` lies under a `.git` directory: never read, on either side. */
const underGit = (path) => path.split('/').includes('.git');

/**
 * What one worktree at `dir` holds outside its commits: `{ entries,
 * indexIds }` — each entry `{ path, id, where, svg? }` (`svg` the
 * sanitizer's id of working bytes that read as an SVG), `indexIds` the
 * index's blob ids, whose bytes a caller may read from the object store.
 * `label` says which worktree, in `where`; `who` names it in a failure;
 * `ignored` reads its ignored files too (the private side, R4).
 */
function checkoutBlobs(run, dir, label, who, { ignored = false } = {}) {
    const at = label === '' ? '' : ` (${label})`;
    const list = (args) =>
        run(args)
            .toString('utf8')
            .split('\0')
            .filter((entry) => entry !== '');
    const onDisk = (path) => workingBytes(join(dir, path), who);
    const entries = [];
    const indexIds = [];
    const fromDisk = (path, where) => {
        const bytes = onDisk(path);
        if (bytes !== undefined) {
            entries.push({ path, id: blobId(bytes), where: `${where}${at}`, svg: svgIdOf(bytes) });
        }
        return bytes;
    };
    for (const entry of list(['ls-files', '-z', '--stage'])) {
        // "<mode> <object> <stage>\t<path>"; a line this reader does not know throws.
        const m = /^(\d{6}) ([0-9a-f]{40}) \d\t(.+)$/s.exec(entry);
        if (m === null) {
            throw unreadable(who, `git ls-files --stage printed an entry this reader does not know${who.quiet ? '' : `: ${JSON.stringify(entry)}`}`);
        }
        if (m[1] === GITLINK_MODE) {
            continue;
        }
        entries.push({ path: m[3], id: m[2], where: `index${at}` });
        indexIds.push(m[2]);
        const bytes = onDisk(m[3]);
        if (bytes !== undefined && blobId(bytes) !== m[2]) {
            entries.push({ path: m[3], id: blobId(bytes), where: `working tree${at}`, svg: svgIdOf(bytes) });
        }
    }
    for (const path of list(['ls-files', '-z', '--others', '--exclude-standard'])) {
        // A repository embedded in the tree lists as `dir/`: not a file, and the look-art guard's to refuse.
        if (!path.endsWith('/') && !underGit(path)) {
            fromDisk(path, 'untracked');
        }
    }
    if (ignored) {
        for (const path of list(['ls-files', '-z', '--others', '--ignored', '--exclude-standard'])) {
            if (!path.endsWith('/') && !underGit(path)) {
                fromDisk(path, 'ignored');
            }
        }
    }
    return { entries, indexIds };
}

/**
 * Every worktree of the repository at `root` (or, with `worktrees: 'own'`,
 * its own alone): the entries of each, the root's own unlabelled. `side` is
 * `public` or `private`: who each worktree is in a failure, and whether its
 * ignored files are read.
 */
function everyCheckout(run, root, { git, env, side, worktrees = 'every' }) {
    const entries = [];
    const indexIds = [];
    const here = realpathSync(root);
    const own = side === 'private' ? SELECTED : THIS_CHECKOUT;
    for (const tree of worktreesOf(run)) {
        let real;
        try {
            real = realpathSync(tree);
        } catch {
            // Gone between the listing and now: nothing to read.
            continue;
        }
        const isOwn = real === here;
        if (!isOwn && worktrees === 'own') {
            continue;
        }
        const who = isOwn ? own : side === 'private' ? PRIVATE_WORKTREE : publicWorktree(tree);
        const read = checkoutBlobs(isOwn ? run : gitIn(tree, who, { git, env }), tree, isOwn ? '' : `worktree ${basename(tree)}`, who, { ignored: side === 'private' });
        entries.push(...read.entries);
        indexIds.push(...read.indexIds);
    }
    return { entries, indexIds };
}

/** The objects `rev-list --objects` lists for `revs` in `run`'s repository, as ids. */
function objectsOf(run, revs) {
    const ids = new Set();
    for (const line of run(['rev-list', '--objects', ...revs]).toString('utf8').split('\n')) {
        if (line === '') {
            continue;
        }
        const id = line.slice(0, 40);
        if (!/^[0-9a-f]{40}$/.test(id)) {
            throw new Error(`${CONTENT_GUARD}: git rev-list printed a line this reader does not know`);
        }
        ids.add(id);
    }
    return ids;
}

/**
 * The blob ids among `objects` in `run`'s repository, each with the
 * sanitizer's id of it when it reads as an SVG: `Map(id → svgId | undefined)`,
 * read in one `git cat-file --batch` stream.
 */
function blobsAmong(run, objects) {
    const blobs = new Map();
    if (objects.size === 0) {
        return blobs;
    }
    // Every object's contents, one stream: "<id> <type> <size>\n<bytes>\n".
    const out = run(['cat-file', '--batch'], `${[...objects].join('\n')}\n`);
    let at = 0;
    while (at < out.length) {
        const eol = out.indexOf(0x0a, at);
        const line = out.subarray(at, eol < 0 ? out.length : eol).toString('latin1');
        if (eol >= 0 && /^[0-9a-f]{40} missing$/.test(line)) {
            // An index entry whose object was never written (`git add -N` records the empty blob's id): no bytes to read.
            at = eol + 1;
            continue;
        }
        const head = /^([0-9a-f]{40}) (blob|tree|commit|tag) (\d+)$/.exec(line);
        if (eol < 0 || head === null) {
            throw new Error(`${CONTENT_GUARD}: git cat-file printed a record this reader does not know`);
        }
        const size = Number(head[3]);
        const body = out.subarray(eol + 1, eol + 1 + size);
        at = eol + 1 + size + 1;
        if (head[2] === 'blob') {
            blobs.set(head[1], svgIdOf(body));
        }
    }
    return blobs;
}

/**
 * The private repository whose root is `dir`, as ids: `{ ids, reflogOnly,
 * counted }` — `ids` every blob a ref, an index or a working tree holds (and
 * the sanitizer's id of each SVG among them), `reflogOnly` those only a
 * reflog entry reaches. Throws when git cannot run, `dir` is not a
 * repository's own root, or a listing is one this reader does not know:
 * never an empty set for a failure, and never a message naming a path,
 * an entry or git's own words (`SELECTED`, `PRIVATE_WORKTREE`).
 */
export function privateBlobIds({ dir, git, env = process.env }) {
    const run = gitIn(dir, SELECTED, { git, env });
    const top = run(['rev-parse', '--show-toplevel']).toString('utf8').trim();
    let here;
    try {
        here = realpathSync(dir);
    } catch (error) {
        throw unreadable(SELECTED, `its directory could not be resolved (${error?.code ?? 'an error'})`);
    }
    if (top !== here) {
        throw new Error(`${CONTENT_GUARD}: the selection is not a repository's own root (git reads another)`);
    }
    requireSha1(run, 'the private repository');
    const refObjects = objectsOf(run, ['--all']);
    const reflogObjects = objectsOf(run, ['--all', '--reflog']);
    const checkouts = everyCheckout(run, dir, { git, env, side: 'private' });
    const indexIds = new Set(checkouts.indexIds);
    const blobs = blobsAmong(run, new Set([...reflogObjects, ...indexIds]));
    const ids = new Set();
    const add = (set, id, svg) => {
        set.add(id);
        if (svg !== undefined) {
            set.add(svg);
        }
    };
    for (const [id, svg] of blobs) {
        if (refObjects.has(id) || indexIds.has(id)) {
            add(ids, id, svg);
        }
    }
    for (const entry of checkouts.entries) {
        add(ids, entry.id, entry.svg ?? blobs.get(entry.id));
    }
    const reflogOnly = new Set();
    for (const [id, svg] of blobs) {
        if (!ids.has(id)) {
            reflogOnly.add(id);
        }
        if (svg !== undefined && !ids.has(svg)) {
            reflogOnly.add(svg);
        }
    }
    return { ids, reflogOnly, counted: { blobs: blobs.size, entries: checkouts.entries.length } };
}

/**
 * Every blob the repository at `root` could carry into a commit or a push,
 * each `{ path, id, where }` (`where`: `index`, `working tree`, `untracked`
 * — each with its worktree when it is another — or `unpushed`), with the
 * facts a guard over unpushed history needs: `{ entries, shallow, upstream,
 * published }`, `published(id)` whether `origin/main`'s history holds the
 * blob, its objects listed on the first ask. `worktrees: 'own'` reads the
 * root's own worktree alone, for a test that holds something else than the
 * worktree reader and must not depend on every worktree on the machine (the
 * re-review's R1); the guard reads every one.
 */
export function publicBlobs({ root, git, env = process.env, worktrees = 'every' }) {
    const run = gitIn(root, THIS_CHECKOUT, { git, env });
    requireSha1(run, 'this repository');
    const { entries } = everyCheckout(run, root, { git, env, side: 'public', worktrees });
    const pushed = readUnpushedBlobs({ root, git, env: cleanEnv(env) });
    for (const blob of pushed.blobs) {
        entries.push({ path: blob.name === '' ? '(a blob no path or ref names)' : blob.name, id: blob.id, where: 'unpushed' });
    }
    let onOrigin;
    const published = (id) => {
        onOrigin ??= pushed.upstream === undefined ? new Set() : objectsOf(run, [pushed.upstream]);
        return onOrigin.has(id);
    };
    return { entries: entries.map(({ path, id, where }) => ({ path, id, where })), shallow: pushed.shallow, upstream: pushed.upstream, published };
}

/**
 * What a match says, whichever way the copy went (the re-review's R2): the
 * guard cannot tell a private file copied here from a public file copied
 * into the private repository, so it names both, and the way out of each.
 */
export const COPY_BOTH_WAYS =
    'its bytes equal a file of the selected private repository: either a private file was copied here (take it out of this repository), or the private repository holds a byte copy of this public file (make the private file differ)';

/**
 * The problems: a shallow clone or no `origin/main` (the unpushed history
 * cannot all be read), and every public entry whose id is a private blob's
 * — less the exempt ids, the empty blob, and a reflog-only private blob
 * `origin/main` already holds (`published`, asked only for such a match) —
 * named by its tracked path and where it stands, never by the private file.
 */
export function privateContentProblems({ entries, shallow, upstream, published, privateIds, reflogOnly, exempt }) {
    if (!(privateIds instanceof Set) || !(reflogOnly instanceof Set) || !(exempt instanceof Set) || typeof published !== 'function') {
        throw new TypeError(`${CONTENT_GUARD}: the private ids, the reflog-only ids, the exempt ids and the published reader were not all read`);
    }
    const problems = [];
    if (shallow) {
        problems.push('a shallow clone: the commits a push would publish cannot all be read');
    }
    if (upstream === undefined) {
        problems.push('no origin/main to compare with: the commits a push would publish are unknown');
    }
    for (const { path, id, where } of entries) {
        if (id === EMPTY_BLOB || exempt.has(id)) {
            continue;
        }
        if (!privateIds.has(id) && !(reflogOnly.has(id) && !published(id))) {
            continue;
        }
        const problem = `${JSON.stringify(path)} (${where}): ${COPY_BOTH_WAYS}`;
        if (!problems.includes(problem)) {
            problems.push(problem);
        }
    }
    return problems;
}

/**
 * The guard over the repository at `root` under `env`'s selection:
 * `{ selected: false }` with none (and a throw under `STALL_LOOKS_REQUIRED`,
 * as the guards over sheets throw); `{ selected: true, fixture: true }` for
 * the tracked fixture, which is this checkout's own files; otherwise
 * `{ selected: true, problems, compared }`. `exempt` is the canary's ids
 * unless a test hands another set; `gitEnv` the environment git runs in;
 * `worktrees` as `publicBlobs` takes it.
 */
export function contentGuard({ root, env = process.env, gitEnv = process.env, git, exempt, worktrees }) {
    const selection = selectionFromEnv(env);
    if (selection === undefined) {
        if (selectionRequired(env)) {
            throw new Error(`${CONTENT_GUARD}: ${REQUIRED_ENV} is set and this run selects no private look — the guards read the looks the build carries, so the run names them`);
        }
        return { selected: false };
    }
    let tree;
    try {
        tree = selectedTree({ root, selection, git, env: gitEnv });
    } catch {
        // The build's own read words its failures with the selection's directory and git's command line: neither is said here (R3).
        throw unreadable(SELECTED, `${SELECTION_ENV.dir} names no repository root git can read (the build's own read of the selection says more)`);
    }
    if (tree.fixture) {
        return { selected: true, fixture: true };
    }
    if (tree.dir === realpathSync(root)) {
        throw new Error(`${CONTENT_GUARD}: the selection names this checkout itself, which is no private look repository`);
    }
    const priv = privateBlobIds({ dir: tree.dir, git, env: gitEnv });
    const pub = publicBlobs({ root, git, env: gitEnv, ...(worktrees === undefined ? {} : { worktrees }) });
    const exemptIds = exempt ?? canaryBlobIds();
    const problems = privateContentProblems({ ...pub, privateIds: priv.ids, reflogOnly: priv.reflogOnly, exempt: exemptIds });
    const matched = pub.entries.filter((entry) => priv.ids.has(entry.id) || priv.reflogOnly.has(entry.id));
    const spared = matched.filter((entry) => entry.id === EMPTY_BLOB || exemptIds.has(entry.id) || (!priv.ids.has(entry.id) && pub.published(entry.id))).length;
    return { selected: true, problems, compared: { public: pub.entries.length, private: priv.ids.size + priv.reflogOnly.size, spared } };
}
