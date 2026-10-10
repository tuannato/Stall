/**
 * No file of this repository is a private look's file (step 8g-pre; the 8g
 * plan's v2.7, as its critic's re-review corrected it, N1): read as git
 * object ids — the same SHA-1 blob format on both sides, so equal ids are
 * equal bytes — under a private-look selection, and naming the tracked
 * path of a match, never the private path or a byte of the private file.
 *
 * **The public side**, everything a commit or a push from this checkout
 * could carry (`publicBlobs`): every blob in the index (`git ls-files
 * --stage`, gitlinks skipped); the working bytes of every tracked path, so
 * a copy written over a tracked file and not yet staged is seen; every
 * untracked file git does not ignore (`git ls-files --others
 * --exclude-standard`); and every blob an unpushed commit adds
 * (`readUnpushed`, `scripts/git-unpushed.mjs`, the reader the look-art
 * guard uses, with its stated options — so a copy committed and then
 * deleted in a later commit is still seen, and a shallow clone or a missing
 * `origin/main` fails rather than passing over nothing). Working bytes are
 * hashed as `git hash-object --no-filters` hashes them (`blobId`); a link
 * as the text git stores for it.
 *
 * **The private side** (`privateBlobIds`): every blob reachable from a
 * ref of the selected private repository (`git rev-list --objects --all`,
 * replace objects off as every private-look read) — so an earlier draft's
 * file, which the selection's commit no longer holds, is seen — and each
 * SVG's re-serialisation by the build's own sanitizer (`sanitizeSvg`,
 * `scripts/svg-allow.mjs`) hashed as a blob, the form a build emits. **Not
 * the reflog**, stated: a draft amended or reset away is reached by no ref,
 * so no push or build carries it, and counting it failed the owner's own
 * canary clone, whose reflog keeps a draft that held one of Stall's served
 * faces byte for byte — public bytes copied into the private repository,
 * the direction this guard cannot tell from the other.
 *
 * **Exempt** (N1): every blob of the canary, computed from the public
 * recipe (`canaryFiles`, `scripts/private-looks-plant.mjs`) and its SVGs'
 * re-serialisations — the canary is public bytes by definition, and three
 * of its files are byte for byte tracked ones, so a guard that counted
 * them would fail the very dispatch that carries it — and the empty blob,
 * which is no evidence of anything.
 *
 * **Stated limit**: whole-file copies only. A pasted fragment of a sheet,
 * a picture redrawn by hand, a shot or a plate of a private look, or the
 * minified CSS a build serves are not whole private files; those are the
 * words rule's and the reviews'.
 *
 * Node built-ins, git and this repository's own modules. Test:
 * `no-tracked-file-is-a-private-look-file` (`scripts/private-content.test.mjs`).
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, readlinkSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { readUnpushed } from './git-unpushed.mjs';
import { GITLINK_MODE } from './licence-map-lib.mjs';
import { selectionFromEnv, selectionRequired, REQUIRED_ENV } from './looks-selection.mjs';
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

/** The modes of a file whose bytes are a blob: a plain file, an executable one and a link. */
const BLOB_MODES = Object.freeze(['100644', '100755', '120000']);

/** The id of an SVG's re-serialisation by the build's sanitizer, or undefined when the sanitizer refuses it (the build would emit nothing). */
export function sanitizedSvgId(text) {
    const { svg } = sanitizeSvg(text);
    return svg === undefined ? undefined : blobId(Buffer.from(svg, 'utf8'));
}

/**
 * The canary's blob ids, from the public recipe (`canaryFiles`): each file
 * of its packed tree and each SVG's re-serialisation — what a run over the
 * canary may hold without a single private byte in it.
 */
export function canaryBlobIds() {
    const ids = new Set();
    for (const [path, contents] of Object.entries(canaryFiles())) {
        const bytes = Buffer.isBuffer(contents) ? contents : Buffer.from(contents, 'utf8');
        ids.add(blobId(bytes));
        if (path.endsWith('.svg')) {
            const id = sanitizedSvgId(bytes.toString('utf8'));
            if (id !== undefined) {
                ids.add(id);
            }
        }
    }
    return ids;
}

/** `env` with the variables that tell git where a repository is dropped, and replace objects off — as every private-look read runs. */
function privateEnv(env) {
    const clean = { ...env, GIT_NO_REPLACE_OBJECTS: '1' };
    for (const name of GIT_LOCATION_VARS) {
        delete clean[name];
    }
    return clean;
}

/** A repository's object format must be the one `blobId` writes, or no id here would mean equal bytes. */
function requireSha1(format, where) {
    if (format.trim() !== 'sha1') {
        throw new Error(`${CONTENT_GUARD}: ${where} stores ${format.trim()} objects, and the ids compared here are SHA-1`);
    }
}

/**
 * The blob ids reachable from a ref of the private repository whose root
 * is `dir`, and each SVG's re-serialisation:
 * `{ ids, blobs, svgs }`. Throws when git cannot run, `dir` is not a
 * repository's own root, or a listing is one this reader does not know:
 * never an empty set for a failure.
 */
export function privateBlobIds({ dir, git = 'git', env = process.env }) {
    const clean = privateEnv(env);
    const run = (args, input) => {
        const result = spawnSync(git, ['--no-replace-objects', '-C', dir, ...args], {
            env: clean,
            input,
            maxBuffer: 1024 * 1024 * 1024,
            stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
        });
        if (result.error !== undefined || result.status !== 0) {
            throw new Error(`${CONTENT_GUARD}: git ${args[0]} in the private repository failed: ${result.error?.message ?? result.stderr.toString('utf8').trim()}`);
        }
        return result.stdout;
    };
    const top = run(['rev-parse', '--show-toplevel']).toString('utf8').trim();
    if (top !== realpathSync(dir)) {
        throw new Error(`${CONTENT_GUARD}: the selection is not a repository's own root (git reads another)`);
    }
    requireSha1(run(['rev-parse', '--show-object-format']).toString('utf8'), 'the private repository');
    const listed = run(['rev-list', '--objects', '--all']).toString('utf8');
    const objects = [...new Set(listed.split('\n').filter((line) => line !== '').map((line) => line.slice(0, 40)))];
    for (const id of objects) {
        if (!/^[0-9a-f]{40}$/.test(id)) {
            throw new Error(`${CONTENT_GUARD}: git rev-list printed a line this reader does not know`);
        }
    }
    const ids = new Set();
    let svgs = 0;
    if (objects.length === 0) {
        return { ids, blobs: 0, svgs };
    }
    // Every object's contents, one stream: "<id> <type> <size>\n<bytes>\n".
    const out = run(['cat-file', '--batch'], `${objects.join('\n')}\n`);
    let at = 0;
    while (at < out.length) {
        const eol = out.indexOf(0x0a, at);
        const head = /^([0-9a-f]{40}) (blob|tree|commit|tag) (\d+)$/.exec(out.subarray(at, eol < 0 ? out.length : eol).toString('latin1'));
        if (eol < 0 || head === null) {
            throw new Error(`${CONTENT_GUARD}: git cat-file printed a record this reader does not know`);
        }
        const size = Number(head[3]);
        const body = out.subarray(eol + 1, eol + 1 + size);
        at = eol + 1 + size + 1;
        if (head[2] !== 'blob') {
            continue;
        }
        ids.add(head[1]);
        if (body.includes('<svg')) {
            const id = sanitizedSvgId(body.toString('utf8'));
            if (id !== undefined) {
                ids.add(id);
                svgs += 1;
            }
        }
    }
    return { ids, blobs: objects.length, svgs };
}

/**
 * Every blob the checkout at `root` could carry into a commit or a push,
 * each `{ path, id, where }` (`where`: `index`, `working tree`,
 * `untracked`, or `commit <hash>`), with the facts a guard over unpushed
 * commits needs: `{ entries, shallow, upstream }`. Read with git as the
 * look-art guard reads it.
 */
export function publicBlobs({ root, git = 'git', env = process.env }) {
    const run = (args) =>
        execFileSync(git, args, {
            cwd: root,
            env,
            encoding: 'utf8',
            maxBuffer: 256 * 1024 * 1024,
            stdio: ['ignore', 'pipe', 'pipe'],
        });
    const list = (args) => run(args).split('\0').filter((entry) => entry !== '');
    requireSha1(run(['rev-parse', '--show-object-format']), 'this repository');
    /** The working bytes at `path` as a blob id — a link as its text — or undefined when there is no file there. */
    const onDisk = (path) => {
        const full = join(root, path);
        let stat;
        try {
            stat = lstatSync(full);
        } catch {
            return undefined;
        }
        if (stat.isSymbolicLink()) {
            return blobId(Buffer.from(readlinkSync(full, { encoding: 'buffer' })));
        }
        return stat.isFile() ? blobId(readFileSync(full)) : undefined;
    };
    const entries = [];
    for (const entry of list(['ls-files', '-z', '--stage'])) {
        // "<mode> <object> <stage>\t<path>"; a line this reader does not know throws.
        const m = /^(\d{6}) ([0-9a-f]{40}) \d\t(.+)$/s.exec(entry);
        if (m === null) {
            throw new Error(`git ls-files --stage: an entry this reader does not know: ${JSON.stringify(entry)}`);
        }
        if (m[1] === GITLINK_MODE) {
            continue;
        }
        entries.push({ path: m[3], id: m[2], where: 'index' });
        const disk = onDisk(m[3]);
        if (disk !== undefined && disk !== m[2]) {
            entries.push({ path: m[3], id: disk, where: 'working tree' });
        }
    }
    for (const path of list(['ls-files', '-z', '--others', '--exclude-standard'])) {
        // A repository embedded in the tree lists as `dir/`: not a file, and the look-art guard's to refuse.
        const id = path.endsWith('/') ? undefined : onDisk(path);
        if (id !== undefined) {
            entries.push({ path, id, where: 'untracked' });
        }
    }
    const { shallow, upstream, unpushed } = readUnpushed({ root, git, env });
    for (const { commit, changes } of unpushed) {
        for (const change of changes) {
            if (BLOB_MODES.includes(change.newMode) && !/^0+$/.test(change.newObject)) {
                entries.push({ path: change.path, id: change.newObject, where: `commit ${commit.slice(0, 12)}` });
            }
        }
    }
    return { entries, shallow, upstream };
}

/**
 * The problems (pure): a shallow clone or no `origin/main` (the unpushed
 * commits cannot all be read), and every public entry whose id is a
 * private blob's — less the exempt ids and the empty blob — named by its
 * tracked path and where it stands, never by the private file.
 */
export function privateContentProblems({ entries, shallow, upstream, privateIds, exempt }) {
    if (!(privateIds instanceof Set) || !(exempt instanceof Set)) {
        throw new TypeError(`${CONTENT_GUARD}: the private ids and the exempt ids were not read`);
    }
    const problems = [];
    if (shallow) {
        problems.push('a shallow clone: the commits a push would publish cannot all be read');
    }
    if (upstream === undefined) {
        problems.push('no origin/main to compare with: the commits a push would publish are unknown');
    }
    for (const { path, id, where } of entries) {
        if (id === EMPTY_BLOB || exempt.has(id) || !privateIds.has(id)) {
            continue;
        }
        const problem = `${JSON.stringify(path)} (${where}): its bytes are a private look's file, whole — a private look's bytes never enter this repository`;
        if (!problems.includes(problem)) {
            problems.push(problem);
        }
    }
    return problems;
}

/**
 * The guard over the checkout at `root` under `env`'s selection:
 * `{ selected: false }` with none (and a throw under `STALL_LOOKS_REQUIRED`,
 * as the guards over sheets throw); `{ selected: true, fixture: true }` for
 * the tracked fixture, which is this checkout's own files; otherwise
 * `{ selected: true, problems, compared }`. `exempt` is the canary's ids
 * unless a test hands another set; `gitEnv` the environment git runs in.
 */
export function contentGuard({ root, env = process.env, gitEnv = process.env, git, exempt }) {
    const selection = selectionFromEnv(env);
    if (selection === undefined) {
        if (selectionRequired(env)) {
            throw new Error(`${CONTENT_GUARD}: ${REQUIRED_ENV} is set and this run selects no private look — the guards read the looks the build carries, so the run names them`);
        }
        return { selected: false };
    }
    const tree = selectedTree({ root, selection, git, env: gitEnv });
    if (tree.fixture) {
        return { selected: true, fixture: true };
    }
    if (tree.dir === realpathSync(root)) {
        throw new Error(`${CONTENT_GUARD}: the selection names this checkout itself, which is no private look repository`);
    }
    const priv = privateBlobIds({ dir: tree.dir, git, env: gitEnv });
    const pub = publicBlobs({ root, git, env: gitEnv });
    const exemptIds = exempt ?? canaryBlobIds();
    const problems = privateContentProblems({ ...pub, privateIds: priv.ids, exempt: exemptIds });
    const spared = pub.entries.filter((entry) => priv.ids.has(entry.id) && (entry.id === EMPTY_BLOB || exemptIds.has(entry.id))).length;
    return { selected: true, problems, compared: { public: pub.entries.length, private: priv.ids.size, spared } };
}
