/**
 * The pin (step 8c1): which commit of the private look repository a deploy
 * reads, and the tree that commit carries — `deploy/looks.commit`, a public
 * file in this repository, so a look change is a private commit plus a
 * public commit bumping it, and a deploy is always the pair (this
 * repository's commit, the pin at that commit).
 *
 * **The file is exactly `<commit> <tree>\n`**: two runs of 40 lower-case hex,
 * one space, one newline, `LOOKS_PIN_BYTES` (82) bytes and nothing else
 * (STEP-8C-PLAN v2, V3). `<commit>` is the private commit; `<tree>` is that
 * commit's root tree with the root `README.md` and `LOG.md` taken out
 * (`PACKED_OUT`) — the tree every road carries (the design log never leaves
 * the runner, D-2026-10-06-06). Pinning the tree beside the commit is what
 * lets a later step check the files it received against a hash reviewed in
 * a public commit, not only against a value from the same run (the 8c
 * critic's item 10).
 *
 * **Two readers, one plant list.** The deploy workflow's `looks` job reads
 * the pin in shell (`PIN_SCRIPT`, held verbatim by the workflow test from
 * 8c3), and every script reads it with `readLooksPin`; both refuse the same
 * malformed files and accept the same one
 * (`the-pin-is-read-the-same-way-by-the-shell-and-the-scripts`). The shell
 * counts bytes first because `$(cat …)` strips every trailing newline, and
 * compares the whole file with the line it parsed last because command
 * substitution also drops a NUL (the 8c critic's item 8).
 *
 * **The packed tree is computed, never written** (`packedTreeOf`): the
 * pinned commit's root entries less `PACKED_OUT`, hashed as git hashes a
 * tree, so asking for it on the owner's machine leaves no object in the
 * clone — and computed independently of the shell's `git mktree`
 * (`PACKED_TREE_SCRIPT`, the line the `looks` job computes its tree with,
 * 8c2), which `the-packed-tree-is-the-same-in-the-shell-and-the-scripts`
 * holds it to. `pinLineFor` is what the window writes when it bumps the pin:
 * the line for a commit, refused when a file of that commit is one the
 * build's allow-list refuses (`privateFileProblems`).
 *
 * **The pinned pair is a sentence, not a refusal** (STEP-8C-PLAN v1 §3,
 * kept by v2): since 8a the private files are read from git at a commit and
 * the selection is explicit, so a harness run over an unpinned commit
 * measures exactly the commit it names — what is left to prevent is a
 * verdict cited for the wrong pair. `pinnedPair` answers whether a run
 * measured the pinned pair — the selection's commit is the pin's, the pin's
 * tree is that commit's packed tree, and this repository's tree is clean —
 * and `harnessLooks` prints it on the line every harness command prints
 * before it builds (`the-harness-says-whether-it-measured-the-pinned-pair`,
 * `scripts/harness-looks.test.mjs`).
 *
 * Node built-ins and git; a `.d.mts` beside it. Run as a script, it prints
 * the pin line for a private repository's HEAD (`node scripts/looks-pin.mjs
 * [dir]`, `looks` by default) — the window's road to the file.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FULL_COMMIT, GIT_LOCATION_VARS, gitCommitOf, gitFilesAt, gitTopOf, privateFileProblems } from './private-looks.mjs';

/** The pin, from this repository's root. */
export const LOOKS_PIN_FILE = 'deploy/looks.commit';

/** Its size: two runs of 40 hex, one space, one newline. */
export const LOOKS_PIN_BYTES = 82;

/** The root files of a private look repository the packed tree leaves out: its README and its design log. */
export const PACKED_OUT = Object.freeze(['README.md', 'LOG.md']);

const PIN_SHAPE = /^[0-9a-f]{40} [0-9a-f]{40}\n$/;

/**
 * Why `bytes` (a Buffer, or a string read as bytes) is not a pin, or
 * undefined when it is one. Exact: the byte count, then the shape over every
 * byte — a BOM, a CR, a NUL, a tab, upper case or a second line each refuse.
 */
export function pinProblem(bytes) {
    const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(String(bytes), 'utf8');
    if (buf.length !== LOOKS_PIN_BYTES) {
        return `${LOOKS_PIN_FILE} is ${buf.length} bytes, where a pin is ${LOOKS_PIN_BYTES}: <commit> <tree> and one newline`;
    }
    if (!PIN_SHAPE.test(buf.toString('latin1'))) {
        return `${LOOKS_PIN_FILE} is not <commit> <tree> and one newline: two runs of 40 lower-case hex, one space`;
    }
    return undefined;
}

/**
 * The pin `root` (this repository's checkout) holds: `{ commit, tree }`.
 * Throws when the file is missing or is not exactly a pin (`pinProblem`) —
 * never a guess at what a malformed pin meant.
 */
export function readLooksPin(root) {
    const path = join(root, LOOKS_PIN_FILE);
    if (!existsSync(path)) {
        throw new Error(`no ${LOOKS_PIN_FILE}: nothing pins a private commit`);
    }
    const bytes = readFileSync(path);
    const why = pinProblem(bytes);
    if (why !== undefined) {
        throw new Error(why);
    }
    const [commit, tree] = bytes.toString('latin1').slice(0, -1).split(' ');
    return { commit, tree };
}

/**
 * The pin read in shell, as the deploy workflow's `looks` job runs it
 * (`shell: bash`, i.e. `bash --noprofile --norc -eo pipefail`, from the
 * checkout's root): the byte count first, the shape (an explicit character
 * list, never a range a locale could widen), then the whole file against the
 * line it parsed — then **one** write to `$GITHUB_OUTPUT` carrying `commit=`
 * and `tree=`. A refusal writes nothing and names no private thing: the
 * file is public. The workflow test holds the step to this string verbatim
 * (8c3).
 */
export const PIN_SCRIPT = `pin=${LOOKS_PIN_FILE}
refuse() { echo "$pin is not one commit and its packed tree: two runs of 40 lower-case hex, one space, one newline, ${LOOKS_PIN_BYTES} bytes" >&2; exit 1; }
[ "$(wc -c < "$pin")" -eq ${LOOKS_PIN_BYTES} ] || refuse
line="$(cat "$pin")"
shape='^[0123456789abcdef]{40} [0123456789abcdef]{40}$'
[[ "$line" =~ $shape ]] || refuse
commit="\${line%% *}"
tree="\${line##* }"
printf '%s %s\\n' "$commit" "$tree" | cmp -s - "$pin" || refuse
printf 'commit=%s\\ntree=%s\\n' "$commit" "$tree" >> "$GITHUB_OUTPUT"
`;

/**
 * The line the deploy workflow's `looks` job computes its packed tree with
 * (8c2's `PACK_SCRIPT` holds it verbatim): the root entries of the pinned
 * commit `$PIN` in the clone at `looks`, less the root `README.md` and
 * `LOG.md`, written by `git mktree` — into `$tree`.
 */
export const PACKED_TREE_SCRIPT = `tree="$(git -C looks ls-tree "$PIN" | awk -F '\\t' '$2 != "README.md" && $2 != "LOG.md"' | git -C looks mktree)"`;

/** `env` with the variables that tell git where a repository is dropped, and replace objects off — as every private-look read runs. */
function gitEnv(env) {
    const clean = { ...env, GIT_NO_REPLACE_OBJECTS: '1' };
    for (const name of GIT_LOCATION_VARS) {
        delete clean[name];
    }
    return clean;
}

/** A git runner over the repository whose root is `dir`, or a throw when `dir` is not a repository's own root. */
function gitAt({ dir, git = 'git', env = process.env }) {
    const top = gitTopOf({ dir, git, env });
    if (realpathSync(top) !== realpathSync(dir)) {
        throw new Error(`${dir} is not a repository's root (git reads ${top})`);
    }
    const clean = gitEnv(env);
    return (args, encoding = 'utf8') =>
        execFileSync(git, ['--no-replace-objects', ...args], {
            cwd: dir,
            env: clean,
            encoding,
            maxBuffer: 256 * 1024 * 1024,
            stdio: ['ignore', 'pipe', 'pipe'],
        });
}

/**
 * The packed tree of `commit` in the private repository whose root is `dir`
 * — its root entries (`git ls-tree -z`, not recursive) less `PACKED_OUT`,
 * hashed as git hashes a tree object (`tree <size>\0`, then per entry the
 * mode without its leading zero, the name, a NUL and the 20-byte id, in the
 * commit's own order) — as 40 lower-case hex. Writes nothing: no object
 * enters the clone. Throws when git cannot run, `dir` is not a repository's
 * root, or the commit is not there.
 */
export function packedTreeOf({ dir, commit, git, env }) {
    if (typeof commit !== 'string' || !FULL_COMMIT.test(commit)) {
        throw new TypeError(`a packed tree is read at a full commit (40 lower-case hex), not ${JSON.stringify(commit)}`);
    }
    const out = gitAt({ dir, git, env })(['ls-tree', '-z', '--full-tree', commit], 'buffer').toString('latin1');
    const parts = [];
    for (const entry of out.split('\0')) {
        if (entry === '') {
            continue;
        }
        // "<mode> <type> <object>\t<name>", the name as git stores its bytes.
        const m = /^(\d{6}) (\w+) ([0-9a-f]{40})\t([\s\S]+)$/.exec(entry);
        if (m === null) {
            throw new Error(`git ls-tree: an entry this reader does not know: ${JSON.stringify(entry)}`);
        }
        if (PACKED_OUT.includes(m[4])) {
            continue;
        }
        parts.push(Buffer.from(`${m[1].replace(/^0+/, '')} ${m[4]}\0`, 'latin1'), Buffer.from(m[3], 'hex'));
    }
    const body = Buffer.concat(parts);
    return createHash('sha1').update(Buffer.concat([Buffer.from(`tree ${body.length}\0`, 'latin1'), body])).digest('hex');
}

/**
 * The pin line for `commit` (the repository's HEAD by default) in the
 * private repository whose root is `dir`: `<commit> <packed tree>\n`.
 * Throws, listing every file, when the commit holds one the build's
 * allow-list refuses (`privateFileProblems`): a pin never names a tree the
 * road would carry and the build refuse.
 */
export function pinLineFor({ dir, commit, git, env }) {
    const at = commit ?? gitCommitOf({ dir, git, env });
    const problems = privateFileProblems(gitFilesAt({ dir, commit: at, git, env }));
    if (problems.length > 0) {
        throw new Error(`private looks at ${at}: a pin names no commit the build would refuse:\n  - ${problems.join('\n  - ')}`);
    }
    return `${at} ${packedTreeOf({ dir, commit: at, git, env })}\n`;
}

/**
 * The verdict on one harness run's pair, from facts read elsewhere (pure):
 * `commit` the private commit the run measured; `pin` the pin read
 * (`{ commit, tree }`) or `pinError` why it could not be; `packedTree` the
 * packed tree of `commit`; `publicHead` this repository's HEAD;
 * `publicClean` and `privateClean` whether each working tree has no
 * uncommitted change. A **deployable pair** is the pin's commit, its tree
 * the pin's, measured from a clean public tree; uncommitted changes in the
 * private repository are said and do not count against it, since every read
 * is of the commit and none of the disk. Answers `{ deployable, sentence }`.
 */
export function pairVerdict({ commit, pin, pinError, packedTree, publicHead, publicClean, privateClean }) {
    const short = (hex) => hex.slice(0, 12);
    const notMeasured = privateClean ? '' : ' (uncommitted changes in the private repository are not measured)';
    let deployable = false;
    let sentence;
    if (pin === undefined) {
        sentence = `${LOOKS_PIN_FILE} does not read as a pin — not a deployable pair (${pinError ?? 'no pin'})`;
    } else if (commit !== pin.commit) {
        sentence = `not the pin ${short(pin.commit)} — not a deployable pair`;
    } else if (packedTree !== pin.tree) {
        sentence = `the pin's commit, and the pin's tree ${short(pin.tree)} is not its packed tree ${short(packedTree)} — not a deployable pair`;
    } else if (!publicClean) {
        sentence = `the pin, with Stall ${short(publicHead)} — not a deployable pair: the public tree has uncommitted changes`;
    } else {
        deployable = true;
        sentence = `the pin, with Stall ${short(publicHead)} clean — a deployable pair`;
    }
    return { deployable, sentence: `${sentence}${notMeasured}` };
}

/** Whether the working tree of the repository whose root is `dir` has no uncommitted change, untracked files included (ignored ones not). */
function cleanAt({ dir, git, env }) {
    return gitAt({ dir, git, env })(['--no-optional-locks', 'status', '--porcelain', '--untracked-files=normal']).trim() === '';
}

/**
 * Whether a run that measured `commit` of the private repository at `dir`
 * measured the pinned pair of this repository at `root` (`pairVerdict`,
 * over the facts read here). A pin that does not read is a verdict, not a
 * throw: the harness says so and goes on.
 */
export function pinnedPair({ root, dir, commit, git, env }) {
    let pin;
    let pinError;
    try {
        pin = readLooksPin(root);
    } catch (error) {
        pinError = error.message;
    }
    return pairVerdict({
        commit,
        pin,
        pinError,
        packedTree: pin !== undefined && pin.commit === commit ? packedTreeOf({ dir, commit, git, env }) : undefined,
        publicHead: gitCommitOf({ dir: root, git, env }),
        publicClean: cleanAt({ dir: root, git, env }),
        privateClean: cleanAt({ dir, git, env }),
    });
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try {
        process.stdout.write(pinLineFor({ dir: resolve(process.argv[2] ?? 'looks') }));
    } catch (error) {
        process.stderr.write(`looks-pin: ${error.message}\n`);
        process.exit(1);
    }
}
