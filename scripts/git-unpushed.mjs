/**
 * What a push from a checkout could publish, as git itself says it — read
 * with replace objects off, since a local `refs/replace/*` makes every read
 * see another commit while a push still sends the real one (the step-8g-pre
 * critic's item 3: a replaced commit's private blob reached a bare remote
 * the guard had called clean).
 *
 * - **`readUnpushed({ root })`** — the reader the look-art guard has used
 *   since step 8a (`lookArtProblems`, `scripts/licence-map.test.mjs`), moved
 *   here in step 8g-pre: whether the clone is shallow, the commit
 *   `origin/main` names (undefined when there is none — a guard then fails
 *   rather than passing over an empty list), and every commit reachable from
 *   a local branch, a tag or HEAD and from no `origin/*` ref — so `push
 *   --all` and `push --tags` are covered as well as HEAD's own — with every
 *   path each one touches and which of them were gitlinks on either side. No
 *   pathspec narrows the list: the guard applies its tests to each path,
 *   because a pathspec folds case the way git does and a disk may fold more.
 * - **`readUnpushedBlobs({ root })`** — the content guard's
 *   (`scripts/private-content.mjs`): every blob those refs reach that no
 *   `origin/*` ref does (`git rev-list --objects --branches --tags HEAD --not
 *   --remotes=origin`, blobs kept by `git cat-file --batch-check`) — the set
 *   a push packs, so a blob a tag points at, directly or through a tree, is
 *   read as well as one a commit adds.
 *
 * Node built-ins and git; git runs locally and only locally.
 */
import { execFileSync } from 'node:child_process';
import { GITLINK_MODE } from './licence-map-lib.mjs';

/**
 * The refs a push could publish from, and the ones it would not: the one
 * walk both readers make — `UNPUSHED_LOG_ARGS` ends with it, so the
 * look-art guard's walk and the content guard's cannot drift apart (the
 * step-8g-pre critic's re-review, R5).
 */
export const UNPUSHED_REVS = Object.freeze(['--branches', '--tags', 'HEAD', '--not', '--remotes=origin']);

/**
 * The log arguments, each option a repository's or a user's config would
 * otherwise decide stated: `--root` (log.showRoot false hides a root
 * commit's files), `--ignore-submodules=none` (diff.ignoreSubmodules all
 * hides every gitlink), `--diff-merges=separate` (log.diffMerges narrows or
 * combines a merge's diff), `--no-show-signature` (log.showSignature prints
 * lines this reader does not know). `--no-renames` keeps every status to one
 * path; `--no-abbrev` keeps every object id whole. Then `UNPUSHED_REVS`.
 */
export const UNPUSHED_LOG_ARGS = Object.freeze([
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
    ...UNPUSHED_REVS,
]);

/** A git runner over `root`, replace objects off on every command. */
function runnerAt({ root, git = 'git', env = process.env }) {
    return (args, input) =>
        execFileSync(git, ['--no-replace-objects', ...args], {
            cwd: root,
            env,
            input,
            encoding: 'utf8',
            maxBuffer: 256 * 1024 * 1024,
            stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
        });
}

/** Whether the clone is shallow, and the commit `origin/main` names (undefined when there is none). */
function pushFacts(run) {
    const shallow = run(['rev-parse', '--is-shallow-repository']).trim() === 'true';
    let upstream;
    try {
        upstream = run(['rev-parse', '--verify', '--quiet', 'refs/remotes/origin/main^{commit}']).trim();
    } catch (error) {
        // --verify --quiet exits 1 for a ref that is not there; anything
        // else (no git, not a repository) is not an answer.
        if (error?.status !== 1) {
            throw error;
        }
    }
    return { shallow, upstream };
}

/**
 * What git says about the commits a push from `root` could publish:
 * `{ shallow, upstream, unpushed }`, each unpushed commit `{ commit, paths,
 * gitlinks }`. A record this reader does not know throws: a log it misread
 * would be a check that passes over nothing.
 */
export function readUnpushed({ root, git, env }) {
    const run = runnerAt({ root, git, env });
    const { shallow, upstream } = pushFacts(run);
    // One record per commit (and per parent of a merge): "\x01<hash>", then
    // per path a raw header ":<old mode> <new mode> <old> <new> <status>" and
    // the path, each NUL-terminated, the first header after a newline git
    // adds.
    const unpushed = [];
    const out = run([...UNPUSHED_LOG_ARGS]);
    let current;
    let modes;
    for (const raw of out.split('\0')) {
        const token = modes === undefined && raw.startsWith('\n') ? raw.slice(1) : raw;
        if (modes !== undefined) {
            // The path that follows a raw header, whatever it starts with.
            current.paths.push(token);
            if (modes.includes(GITLINK_MODE)) {
                current.gitlinks.push(token);
            }
            modes = undefined;
        } else if (token.startsWith('\x01')) {
            current = unpushed.find((entry) => entry.commit === token.slice(1));
            if (current === undefined) {
                current = { commit: token.slice(1), paths: [], gitlinks: [] };
                unpushed.push(current);
            }
        } else if (token.startsWith(':') && current !== undefined) {
            const header = /^:(\d{6}) (\d{6}) [0-9a-f]+ [0-9a-f]+ [A-Z]$/.exec(token);
            if (header === null) {
                throw new Error(`git log --raw: a record this reader does not know: ${JSON.stringify(token)}`);
            }
            modes = [header[1], header[2]];
        } else if (token !== '') {
            throw new Error(`git log --raw: an unexpected token ${JSON.stringify(token)}`);
        }
    }
    return { shallow, upstream, unpushed };
}

/**
 * Every blob a push from `root` could add to `origin`: `{ shallow,
 * upstream, blobs }`, each blob `{ id, name }` — the path `rev-list` names
 * it by, else the ref that points at it straight (a tag at a blob), else
 * `''`. Throws on a line this reader does not know.
 */
export function readUnpushedBlobs({ root, git, env }) {
    const run = runnerAt({ root, git, env });
    const { shallow, upstream } = pushFacts(run);
    const names = new Map();
    for (const line of run(['rev-list', '--objects', ...UNPUSHED_REVS]).split('\n')) {
        if (line === '') {
            continue;
        }
        const m = /^([0-9a-f]{40,64})(?: (.*))?$/s.exec(line);
        if (m === null) {
            throw new Error(`git rev-list --objects: a line this reader does not know: ${JSON.stringify(line)}`);
        }
        if (!names.has(m[1]) || (names.get(m[1]) === '' && m[2])) {
            names.set(m[1], m[2] ?? '');
        }
    }
    if (names.size === 0) {
        return { shallow, upstream, blobs: [] };
    }
    const blobs = [];
    for (const line of run(['cat-file', '--batch-check=%(objectname) %(objecttype)'], `${[...names.keys()].join('\n')}\n`).split('\n')) {
        if (line === '') {
            continue;
        }
        const m = /^([0-9a-f]{40,64}) (blob|tree|commit|tag)$/.exec(line);
        if (m === null) {
            throw new Error(`git cat-file --batch-check: a line this reader does not know: ${JSON.stringify(line)}`);
        }
        if (m[2] === 'blob') {
            blobs.push({ id: m[1], name: names.get(m[1]) });
        }
    }
    // A blob a ref points at straight, which rev-list names by nothing: name it by that ref.
    if (blobs.some((blob) => blob.name === '')) {
        for (const line of run(['for-each-ref', '--format=%(objectname) %(*objectname) %(refname)']).split('\n')) {
            const [object, peeled, ref] = line.split(' ');
            for (const blob of blobs) {
                if (blob.name === '' && ref !== undefined && (blob.id === object || blob.id === peeled)) {
                    blob.name = ref;
                }
            }
        }
    }
    return { shallow, upstream, blobs };
}
