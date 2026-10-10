/**
 * Every commit a push could publish, as git's own log says it — the reader
 * the look-art guard has used since step 8a (`lookArtProblems`,
 * `scripts/licence-map.test.mjs`), moved here in step 8g-pre so the content
 * guard (`scripts/private-content.mjs`) reads the same commits with the same
 * stated options rather than a second reader that could drift from it.
 *
 * `readUnpushed({ root })` answers whether the clone is shallow, the commit
 * `origin/main` names (undefined when there is none — a guard then fails
 * rather than passing over an empty list), and every commit reachable from a
 * local branch, a tag or HEAD and from no `origin/*` ref — so `push --all`
 * and `push --tags` are covered as well as HEAD's own — with every path each
 * one touches (`paths`), which of them were gitlinks on either side
 * (`gitlinks`), and each change whole (`changes`: the path, both modes and
 * both object ids — what the content guard compares). No pathspec narrows
 * the list: the guards apply their tests to each path, because a pathspec
 * folds case the way git does and a disk may fold more.
 *
 * Node built-ins and git; git runs locally and only locally.
 */
import { execFileSync } from 'node:child_process';
import { GITLINK_MODE } from './licence-map-lib.mjs';

/**
 * The log arguments, each option a repository's or a user's config would
 * otherwise decide stated: `--root` (log.showRoot false hides a root
 * commit's files), `--ignore-submodules=none` (diff.ignoreSubmodules all
 * hides every gitlink), `--diff-merges=separate` (log.diffMerges narrows or
 * combines a merge's diff), `--no-show-signature` (log.showSignature prints
 * lines this reader does not know). `--no-renames` keeps every status to one
 * path; `--no-abbrev` keeps every object id whole.
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
    '--branches',
    '--tags',
    'HEAD',
    '--not',
    '--remotes=origin',
]);

/**
 * What git says about the commits a push from `root` could publish:
 * `{ shallow, upstream, unpushed }`, each unpushed commit `{ commit, paths,
 * gitlinks, changes }`. A record this reader does not know throws: a log it
 * misread would be a check that passes over nothing.
 */
export function readUnpushed({ root, git = 'git', env = process.env }) {
    const run = (args) =>
        execFileSync(git, args, {
            cwd: root,
            env,
            encoding: 'utf8',
            maxBuffer: 256 * 1024 * 1024,
            stdio: ['ignore', 'pipe', 'pipe'],
        });
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
    // One record per commit (and per parent of a merge): "\x01<hash>", then
    // per path a raw header ":<old mode> <new mode> <old> <new> <status>" and
    // the path, each NUL-terminated, the first header after a newline git
    // adds.
    const unpushed = [];
    const out = run([...UNPUSHED_LOG_ARGS]);
    let current;
    let header;
    for (const raw of out.split('\0')) {
        const token = header === undefined && raw.startsWith('\n') ? raw.slice(1) : raw;
        if (header !== undefined) {
            // The path that follows a raw header, whatever it starts with.
            current.paths.push(token);
            if (header.oldMode === GITLINK_MODE || header.newMode === GITLINK_MODE) {
                current.gitlinks.push(token);
            }
            current.changes.push({ path: token, ...header });
            header = undefined;
        } else if (token.startsWith('\x01')) {
            current = unpushed.find((entry) => entry.commit === token.slice(1));
            if (current === undefined) {
                current = { commit: token.slice(1), paths: [], gitlinks: [], changes: [] };
                unpushed.push(current);
            }
        } else if (token.startsWith(':') && current !== undefined) {
            const m = /^:(\d{6}) (\d{6}) ([0-9a-f]+) ([0-9a-f]+) ([A-Z])$/.exec(token);
            if (m === null) {
                throw new Error(`git log --raw: a record this reader does not know: ${JSON.stringify(token)}`);
            }
            header = { oldMode: m[1], newMode: m[2], oldObject: m[3], newObject: m[4], status: m[5] };
        } else if (token !== '') {
            throw new Error(`git log --raw: an unexpected token ${JSON.stringify(token)}`);
        }
    }
    return { shallow, upstream, unpushed };
}
