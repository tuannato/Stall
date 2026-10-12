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
 * while the selected run happens in another; one git lists as `prunable`
 * is skipped here, on this side alone: it cannot commit until it is
 * repaired, and once repaired it is read again), every blob in the index
 * (`git ls-files --stage`, gitlinks skipped), the working bytes of every
 * tracked path (a copy written over a tracked file and not staged is seen
 * whatever git's stat cache says), and every untracked file git does not
 * ignore (`git ls-files --others --exclude-standard`); and every blob a
 * push could add to `origin` (`readUnpushedBlobs`,
 * `scripts/git-unpushed.mjs`: every local branch, every tag, HEAD and each
 * detached worktree's HEAD, less what `origin/*` reaches, replace objects
 * off — so a commit a replace ref hides, a tag at a blob or a tree, and a
 * commit made on a detached HEAD in another worktree are read, item 3 and
 * the fences-followup critic's item 5). A shallow clone or a missing
 * `origin/main` fails rather than passing over nothing. Working bytes are
 * hashed as `git hash-object --no-filters` hashes them (`workingBlob`;
 * a file of `WHOLE_UNDER` bytes or more in chunks, so no size is too big to
 * read); a link as the text git stores for it; a file gone between git's
 * listing and its read is no file, and any other failure to read one — its
 * `lstat` included — fails. A listing git warns about (a directory it could
 * not open, whose files it therefore never listed) fails too. A worktree
 * that cannot be read fails with a sentence naming it and the way to mend
 * it (`git worktree repair`, `git worktree prune`), never git's command
 * line (the re-review's R1).
 *
 * **The private side** (`privateBlobIds`): what the selected repository
 * **holds** — the selected commit's tree (the selection's commit, else
 * HEAD), every worktree's index (`git rev-list --objects
 * --indexed-objects`, a prunable worktree's included) and, in every
 * worktree, the working bytes of its tracked paths, its untracked files
 * (item 4: an uncommitted draft copied out is seen) and its ignored files
 * (`git ls-files --others --ignored --exclude-standard`, the re-review's
 * R4; never a path under a `.git` directory) — and what only its
 * **history** reaches: every blob on a ref or in a reflog entry (`git
 * rev-list --objects --all --reflog`: another branch, an older commit, a
 * draft amended or reset away, every stash entry) that it does not hold;
 * replace objects off, location variables dropped; plus each SVG's
 * re-serialisation by the build's own sanitizer (`sanitizeSvg`,
 * `scripts/svg-allow.mjs`) hashed as a blob, the form a build emits. A
 * linked worktree git lists as `prunable` while its directory still stands
 * fails the run (the fences-followup critic's P2): its index is read, but
 * its files cannot be read through git, and a draft left there is a
 * private byte on this machine. **A failure on this side names no private
 * path, no entry and none of git's own words** (which name its
 * directories): only the selected private repository, which of its
 * worktrees, which read failed and — for a file it lists and cannot read —
 * the listing to run there to find it (the re-review's R3).
 *
 * **Exempt**: every blob of the canary, computed from the public recipe
 * (`canaryFiles`, `scripts/private-looks-plant.mjs`), with its SVGs'
 * re-serialisations (N1: three canary files are tracked files byte for
 * byte, so a guard that counted them would fail the very dispatch that
 * carries the canary); the empty blob, which is no evidence of anything;
 * and — among the blobs only the private history reaches (the step
 * critic's item 5, option (b), widened from the reflog by the
 * fences-followup critic's item 2) — one whose public copy `origin/main`'s
 * history already holds. That is public bytes copied *into* the private
 * repository, which the guard cannot otherwise tell from private bytes
 * copied out: the owner's canary clone keeps a reset-away draft that held
 * one of Stall's served faces byte for byte, and a port that starts by
 * committing a copy of a public file and then edits it leaves the copy in
 * its history for good. A history-only blob of new bytes is caught, and
 * nothing the selected commit, an index or a working tree holds is
 * exempted this way. `origin/main`'s objects are listed only when such a
 * match happens. Any other match is a problem whichever way the copy went,
 * and its sentence names both ways and the way out of each
 * (`COPY_BOTH_WAYS`, the re-review's R2).
 *
 * **Stated limits**: whole-file copies only — a pasted fragment of a sheet, a
 * picture redrawn by hand, a shot or a plate of a private look, or the
 * minified CSS a build serves are the words rule's and the reviews'. And
 * equality is on stored bytes: a clean filter, `core.autocrlf` or a
 * `text`/`eol` attribute (`.git/info/attributes` included) on either side
 * changes what git stores, so a file normalised by `git add` is another blob
 * once committed, seen here only while its working copy stands. Not read,
 * on either side: the files of a worktree that was moved (git lists it as
 * prunable at its old path; its index is read on the private side, through
 * `--indexed-objects`, and on the public side not at all), a worktree whose
 * administrative `gitdir` file is gone (git does not list it), a repository
 * nested inside the selected one or this one, and an SVG of `WHOLE_UNDER`
 * bytes or more as its re-serialisation. The private repository's objects
 * are read in one `git cat-file --batch` stream of at most 1 GiB: a history
 * past that fails, with a sentence.
 *
 * Node built-ins, git and this repository's own modules. Test:
 * `no-tracked-file-is-a-private-look-file` (`scripts/private-content.test.mjs`).
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { closeSync, existsSync, fstatSync, lstatSync, openSync, readFileSync, readSync, readlinkSync, realpathSync } from 'node:fs';
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
 * of git's own words, which name its directories — the re-review's R3),
 * `mend` what to do when it cannot be read as a worktree, and `find` where
 * on the quiet side its owner runs a listing to find a file this guard
 * names nowhere.
 */
const THIS_CHECKOUT = Object.freeze({ where: 'this checkout', quiet: false });
const SELECTED = Object.freeze({ where: 'the selected private repository', quiet: true, find: 'in its main worktree' });
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
    find: 'in each of its linked worktrees (`git worktree list` names them)',
});

/** The mend for a private worktree git lists as prunable while its directory still stands (the fences-followup critic's P2). */
const PRUNABLE_MEND = 'run `git worktree list` in that repository to find it, then `git worktree repair <its directory>`, or move its files out and `git worktree prune`';

/** A read that failed, as a sentence: who could not be read, what failed, and the way to mend it (`mend: false` for none). */
function unreadable(who, what, { mend = who.mend } = {}) {
    return new Error(`${CONTENT_GUARD}: ${who.where} could not be read: ${what}${typeof mend === 'string' ? ` — ${mend}` : ''}`);
}

/** The first line git wrote to stderr, or undefined. */
function gitSaid(stderr) {
    const text = Buffer.isBuffer(stderr) ? stderr.toString('utf8') : typeof stderr === 'string' ? stderr : '';
    return text.split('\n').find((line) => line.trim() !== '')?.trim();
}

/**
 * A git runner in `dir`: replace objects off, location variables dropped,
 * bytes out. A failure throws `unreadable(who, …)`: the subcommand and its
 * options (never the `-C` directory), the exit status, and — on a side that
 * is not quiet — git's first line on stderr. `warned`, where a listing's
 * warning means files it never listed, turns any stderr of a run that
 * succeeded into a failure too (`warned(said)` its sentence, `said` git's
 * line where the side is not quiet).
 */
function gitIn(dir, who, { git = 'git', env = process.env } = {}) {
    const clean = cleanEnv(env);
    return (args, input, { warned } = {}) => {
        const out = spawnSync(git, ['--no-replace-objects', '-C', dir, ...args], {
            env: clean,
            input,
            maxBuffer: 1024 * 1024 * 1024,
            stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
        });
        if (out.error !== undefined || out.status !== 0) {
            const status = out.error !== undefined ? ` (${out.error.code ?? 'an error'})` : out.status === null ? ` (${out.signal})` : ` (exit ${out.status})`;
            const said = who.quiet ? undefined : gitSaid(out.stderr);
            throw unreadable(who, `git ${args.join(' ')} failed${status}${said === undefined ? '' : `: ${said}`}`);
        }
        if (warned !== undefined && gitSaid(out.stderr) !== undefined) {
            throw unreadable(who, warned(who.quiet ? undefined : gitSaid(out.stderr)), { mend: false });
        }
        return out.stdout;
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
 * The worktrees of the repository `run` reads whose files can be read, as
 * `git worktree list --porcelain -z` lists them: the checked-out ones whose
 * directory stands. A bare entry, one whose directory is gone and one git
 * lists as `prunable` are left out — but on the private side a prunable
 * worktree whose directory still stands fails the run (the fences-followup
 * critic's P2): its index is read with every index (`--indexed-objects`),
 * its files cannot be read through git, and a draft left there is still a
 * private byte on this machine. On the public side it cannot commit until
 * it is repaired, and once repaired it is read again.
 */
function worktreesOf(run, side) {
    const out = run(['worktree', 'list', '--porcelain', '-z']).toString('utf8');
    const trees = [];
    for (const block of out.split('\0\0')) {
        const fields = block.split('\0').filter((field) => field !== '');
        const path = fields.find((field) => field.startsWith('worktree '))?.slice('worktree '.length);
        if (path === undefined || fields.includes('bare')) {
            continue;
        }
        if (fields.some((field) => field === 'prunable' || field.startsWith('prunable '))) {
            if (side === 'private' && existsSync(path)) {
                throw unreadable(PRIVATE_WORKTREE, 'git lists it as prunable while its directory still stands, so its files cannot be read through git', { mend: PRUNABLE_MEND });
            }
            continue;
        }
        if (existsSync(path)) {
            trees.push(path);
        }
    }
    return trees;
}

/** The read errors that mean the file went away between git's listing and the read: no file, not a failure (the re-review's R1). */
const GONE = new Set(['ENOENT', 'ENOTDIR', 'EISDIR']);

/** A file of this many bytes or more is hashed in chunks and never read whole (`readFileSync` refuses one over 2 GiB). */
export const WHOLE_UNDER = 64 * 1024 * 1024;

/** The chunk a big file is read in. */
const CHUNK = 8 * 1024 * 1024;

/** Node's own file system calls, as `workingBlob` reads through them. */
const NODE_FS = Object.freeze({
    lstat: lstatSync,
    readFile: readFileSync,
    readlink: (path) => readlinkSync(path, { encoding: 'buffer' }),
    open: (path) => openSync(path, 'r'),
    fstat: fstatSync,
    read: readSync,
    close: closeSync,
});

/** The blob id of the file at `full`, read in chunks; throws `{ code: 'ECHANGED' }` when it is not the size it was opened at. */
function streamedBlobId(full, fs) {
    const fd = fs.open(full);
    try {
        const size = fs.fstat(fd).size;
        const hash = createHash('sha1').update(`blob ${size}\0`);
        const chunk = Buffer.alloc(CHUNK);
        let read = 0;
        for (;;) {
            const got = fs.read(fd, chunk, 0, CHUNK, read);
            if (got === 0) {
                break;
            }
            hash.update(got === CHUNK ? chunk : chunk.subarray(0, got));
            read += got;
        }
        if (read !== size) {
            throw Object.assign(new Error('the file changed while it was read'), { code: 'ECHANGED' });
        }
        return hash.digest('hex');
    } finally {
        fs.close(fd);
    }
}

/**
 * The working file at `full` as git would store it: `{ id, svg }` (`svg`
 * the sanitizer's id of bytes that read as an SVG), a link as its text — or
 * undefined when there is no file there: nothing at all, something that is
 * not a file or a link, or one that went away between git's listing and
 * the read (`GONE`, at the `lstat` or at the read). Any other failure, at
 * either, throws `unreadable(who, …)`: naming the path where `who` is not
 * quiet, and on the quiet side naming `listing`, the git command whose
 * output holds the file, to run there to find it. A file of `wholeUnder`
 * bytes or more is hashed in chunks (no size is too big) and never read as
 * an SVG. `fs` stands in for Node's own calls.
 */
export function workingBlob(full, who, { listing = 'git ls-files', fs = NODE_FS, wholeUnder = WHOLE_UNDER } = {}) {
    const fail = (error) => {
        if (GONE.has(error?.code)) {
            return undefined;
        }
        const code = error?.code ?? 'an error';
        throw unreadable(who, who.quiet ? `a file it lists could not be read (${code}) — run \`${listing}\` ${who.find} and look for one you cannot read` : `a file could not be read (${code}): ${full}`, { mend: false });
    };
    let stat;
    try {
        stat = fs.lstat(full);
    } catch (error) {
        return fail(error);
    }
    try {
        if (stat.isSymbolicLink()) {
            const bytes = Buffer.from(fs.readlink(full));
            return { id: blobId(bytes), svg: svgIdOf(bytes) };
        }
        if (!stat.isFile()) {
            return undefined;
        }
        if (stat.size < wholeUnder) {
            const bytes = fs.readFile(full);
            return { id: blobId(bytes), svg: svgIdOf(bytes) };
        }
        return { id: streamedBlobId(full, fs), svg: undefined };
    } catch (error) {
        return fail(error);
    }
}

/** Whether `path` lies under a `.git` directory: never read, on either side. */
const underGit = (path) => path.split('/').includes('.git');

/** The two listings of files outside the index, as a reader of a failure types them. */
const UNTRACKED = 'git ls-files --others --exclude-standard';
const IGNORED = 'git ls-files --others --ignored --exclude-standard';

/** What a listing that warned says: git could not open a directory, so the files in it were never listed. */
const listingWarned = (listing, who) => (said) =>
    `\`${listing}\` warned that it could not read part of the tree, so the files there were never listed${said === undefined ? ` — run it ${who.find} to see which, and make it readable` : `: ${said}`}`;

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
    const list = (args, options) =>
        run(args, undefined, options)
            .toString('utf8')
            .split('\0')
            .filter((entry) => entry !== '');
    const entries = [];
    const indexIds = [];
    const fromDisk = (path, where, listing) => {
        const blob = workingBlob(join(dir, path), who, { listing });
        if (blob !== undefined) {
            entries.push({ path, id: blob.id, where: `${where}${at}`, svg: blob.svg });
        }
        return blob;
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
        const blob = workingBlob(join(dir, m[3]), who, { listing: 'git ls-files' });
        if (blob !== undefined && blob.id !== m[2]) {
            entries.push({ path: m[3], id: blob.id, where: `working tree${at}`, svg: blob.svg });
        }
    }
    for (const path of list(['ls-files', '-z', '--others', '--exclude-standard'], { warned: listingWarned(UNTRACKED, who) })) {
        // A repository embedded in the tree lists as `dir/`: not a file, and the look-art guard's to refuse.
        if (!path.endsWith('/') && !underGit(path)) {
            fromDisk(path, 'untracked', UNTRACKED);
        }
    }
    if (ignored) {
        for (const path of list(['ls-files', '-z', '--others', '--ignored', '--exclude-standard'], { warned: listingWarned(IGNORED, who) })) {
            if (!path.endsWith('/') && !underGit(path)) {
                fromDisk(path, 'ignored', IGNORED);
            }
        }
    }
    return { entries, indexIds };
}

/**
 * Every worktree of the repository at `root` (or, with `worktrees: 'own'`,
 * its own alone): the entries of each, the root's own unlabelled. `side` is
 * `public` or `private`: who each worktree is in a failure, what a
 * prunable one does, and whether its ignored files are read.
 */
function everyCheckout(run, root, { git, env, side, worktrees = 'every' }) {
    const own = side === 'private' ? SELECTED : THIS_CHECKOUT;
    let here;
    try {
        here = realpathSync(root);
    } catch (error) {
        throw unreadable(own, `its directory could not be resolved (${error?.code ?? 'an error'})`, { mend: false });
    }
    const entries = [];
    const indexIds = [];
    for (const tree of worktreesOf(run, side)) {
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
 * The private repository whose root is `dir`, as ids: `{ ids, historyOnly,
 * counted }` — `ids` every blob it holds (the tree of `commit`, else HEAD's;
 * every worktree's index; every worktree's tracked, untracked and ignored
 * files) and the sanitizer's id of each SVG among them, `historyOnly` the
 * blobs (and their SVG forms) only its history reaches — another ref, an
 * older commit, a reflog entry, a stash. Throws when git cannot run, `dir`
 * is not a repository's own root, a prunable linked worktree's directory
 * still stands, or a listing is one this reader does not know: never an
 * empty set for a failure, and never a message naming a path, an entry or
 * git's own words (`SELECTED`, `PRIVATE_WORKTREE`).
 */
export function privateBlobIds({ dir, commit, git, env = process.env }) {
    const run = gitIn(dir, SELECTED, { git, env });
    const top = run(['rev-parse', '--show-toplevel']).toString('utf8').trim();
    let here;
    try {
        here = realpathSync(dir);
    } catch (error) {
        throw unreadable(SELECTED, `its directory could not be resolved (${error?.code ?? 'an error'})`, { mend: false });
    }
    if (top !== here) {
        throw new Error(`${CONTENT_GUARD}: the selection is not a repository's own root (git reads another)`);
    }
    requireSha1(run, 'the private repository');
    // The worktrees first, so one that cannot be read is named as itself.
    const checkouts = everyCheckout(run, dir, { git, env, side: 'private' });
    const selected = commit ?? run(['rev-parse', '--verify', 'HEAD^{commit}']).toString('utf8').trim();
    if (!/^[0-9a-f]{40}$/.test(selected)) {
        throw new Error(`${CONTENT_GUARD}: the selected private repository names a commit this reader does not know`);
    }
    // Its commit, its tree and every blob in it; every worktree's index; every ref and reflog entry.
    const atSelected = objectsOf(run, ['--no-walk', selected]);
    const indexed = objectsOf(run, ['--indexed-objects']);
    const history = objectsOf(run, ['--all', '--reflog']);
    const indexIds = new Set(checkouts.indexIds);
    const blobs = blobsAmong(run, new Set([...history, ...atSelected, ...indexed, ...indexIds]));
    const ids = new Set();
    const add = (set, id, svg) => {
        set.add(id);
        if (svg !== undefined) {
            set.add(svg);
        }
    };
    for (const [id, svg] of blobs) {
        if (atSelected.has(id) || indexed.has(id) || indexIds.has(id)) {
            add(ids, id, svg);
        }
    }
    for (const entry of checkouts.entries) {
        add(ids, entry.id, entry.svg ?? blobs.get(entry.id));
    }
    const historyOnly = new Set();
    for (const [id, svg] of blobs) {
        if (!ids.has(id)) {
            historyOnly.add(id);
        }
        if (svg !== undefined && !ids.has(svg)) {
            historyOnly.add(svg);
        }
    }
    return { ids, historyOnly, counted: { blobs: blobs.size, entries: checkouts.entries.length } };
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
 * What a match says, whichever way the copy went (the re-review's R2, and
 * the fences-followup critic's item 2): the guard cannot tell a private file
 * copied here from a public file copied into the private repository, so it
 * names both, and the way out of each — true for a copy only staged or
 * written there and for one already committed, since a copy the private
 * repository then keeps only in its history is spared once `origin/main`
 * holds the public file.
 */
export const COPY_BOTH_WAYS =
    "its bytes equal a file of the selected private repository: either a private file was copied here (take it out of this repository), or the private repository holds a byte copy of this public file (make the private file differ: a copy then left only in the private repository's history is spared once origin/main holds this public file)";

/**
 * The problems: a shallow clone or no `origin/main` (the unpushed history
 * cannot all be read), and every public entry whose id is a private blob's
 * — less the exempt ids, the empty blob, and a blob only the private
 * history reaches whose copy `origin/main` already holds (`published`,
 * asked only for such a match) — named by its tracked path and where it
 * stands, never by the private file.
 */
export function privateContentProblems({ entries, shallow, upstream, published, privateIds, historyOnly, exempt }) {
    if (!(privateIds instanceof Set) || !(historyOnly instanceof Set) || !(exempt instanceof Set) || typeof published !== 'function') {
        throw new TypeError(`${CONTENT_GUARD}: the private ids, the history-only ids, the exempt ids and the published reader were not all read`);
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
        if (!privateIds.has(id) && !(historyOnly.has(id) && !published(id))) {
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
    const priv = privateBlobIds({ dir: tree.dir, commit: selection.commit, git, env: gitEnv });
    const pub = publicBlobs({ root, git, env: gitEnv, ...(worktrees === undefined ? {} : { worktrees }) });
    const exemptIds = exempt ?? canaryBlobIds();
    const problems = privateContentProblems({ ...pub, privateIds: priv.ids, historyOnly: priv.historyOnly, exempt: exemptIds });
    const matched = pub.entries.filter((entry) => priv.ids.has(entry.id) || priv.historyOnly.has(entry.id));
    const spared = matched.filter((entry) => entry.id === EMPTY_BLOB || exemptIds.has(entry.id) || (!priv.ids.has(entry.id) && pub.published(entry.id))).length;
    return { selected: true, problems, compared: { public: pub.entries.length, private: priv.ids.size + priv.historyOnly.size, spared } };
}
