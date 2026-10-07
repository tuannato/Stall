/**
 * The pin (step 8c1): which commit of the private look repository a deploy
 * reads, and the tree that commit carries — `deploy/looks.commit`, a public
 * file in this repository, so a look change is a private commit plus a
 * public commit bumping it, and a deploy is always the pair (this
 * repository's commit, the pin at that commit).
 *
 * **The file is exactly `<commit> <tree>\n`**: two runs of 40 lower-case hex,
 * one space, one newline, `LOOKS_PIN_BYTES` (82) bytes and nothing else
 * (STEP-8C-PLAN v2, V3), tracked as a plain file. `<commit>` is the private
 * commit; `<tree>` is that commit's root tree with the root `README.md` and
 * `LOG.md` taken out (`PACKED_OUT`) — the tree every road carries (the
 * design log never leaves the runner, D-2026-10-06-06). Pinning the tree
 * beside the commit is what lets a later step check the files it received
 * against a hash reviewed in a public commit, not only against a value from
 * the same run (the 8c critic's item 10).
 *
 * **Two readers, one plant list.** The deploy workflow's `looks` job reads
 * the pin in shell (`PIN_SCRIPT`, held verbatim by the workflow test from
 * 8c3), and every script reads it with `readLooksPin`; both refuse the same
 * malformed files and accept the same one
 * (`the-pin-is-read-the-same-way-by-the-shell-and-the-scripts`). The shell
 * refuses a link before it reads (`wc` on a link to a device would hang),
 * counts bytes first because `$(cat …)` strips every trailing newline, and
 * compares the whole file with the line it parsed last because command
 * substitution also drops a NUL (the 8c critic's item 8).
 *
 * **The packed tree is computed, never written** (`packedTreeOf`): the
 * pinned commit's root entries less `PACKED_OUT`, hashed as git hashes a
 * tree, so asking for it on the owner's machine leaves no object in the
 * clone — and computed independently of the shell's `git mktree`
 * (`PACKED_TREE_SCRIPT`, the line the `looks` job's `PACK_SCRIPT`
 * computes its tree with), which `the-packed-tree-is-the-same-in-the-shell-and-the-scripts`
 * holds it to, replace objects off on both sides. `pinLineFor` is what the
 * window writes when it bumps the pin (`node scripts/looks-pin.mjs --write`):
 * the line for a commit, refused when the build's own read of that commit
 * — its files, its index against the public lists, its directories and
 * required files (`readPrivateLooksAt`, as `selectedIndex` reads it) —
 * refuses it, or when it names no look.
 *
 * **The pinned pair is a sentence, not a refusal** (STEP-8C-PLAN v1 §3,
 * kept by v2): since 8a the private files are read from git at a commit and
 * the selection is explicit, so a harness run over an unpinned commit
 * measures exactly the commit it names — what is left to prevent is a
 * verdict cited for the wrong pair. `pinnedPair` answers, for a preview
 * selection (a production build reads no private repository until step 9,
 * V1), whether a run measured **the pinned pair** — and nothing more: the
 * pin as this repository's HEAD holds it (and the file on the disk the
 * same), the selection's commit the pin's, the pin's tree that commit's
 * packed tree, and this repository's tree clean. Whether the private commit
 * is on GitHub and this one is `main` is the dispatch's to find out, loudly.
 * It names this repository's HEAD **tree**, never its commit, so the line
 * stays true in the body of the very commit that bumps the pin.
 * `harnessLooks` prints it on the line every harness command prints before
 * it builds (`the-harness-says-whether-it-measured-the-pinned-pair`,
 * `scripts/harness-looks.test.mjs`).
 *
 * Node built-ins and git; a `.d.mts` beside it. Run as a script from the
 * checkout's root, it prints the pin line for a private repository's HEAD
 * (`node scripts/looks-pin.mjs [dir]`, `looks` by default), or with
 * `--write` writes it to `deploy/looks.commit` — only once the line is
 * computed, so a refusal leaves the old pin in place.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, realpathSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    FULL_COMMIT,
    GIT_LOCATION_VARS,
    gitCommitOf,
    gitTopOf,
    parsePrivateIndex,
    publicLookFacts,
    readPrivateLooksAt,
} from './private-looks.mjs';

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

/** The pin's two hashes, from bytes `pinProblem` accepts. */
function pinOf(bytes) {
    const [commit, tree] = bytes.toString('latin1').slice(0, -1).split(' ');
    return { commit, tree };
}

/**
 * The pin `root` (this repository's checkout) holds on the disk: `{ commit,
 * tree }`. Throws when the file is missing, is not a plain file (a link is
 * refused before it is read), or is not exactly a pin (`pinProblem`) — never
 * a guess at what a malformed pin meant.
 */
export function readLooksPin(root) {
    const path = join(root, LOOKS_PIN_FILE);
    if (!existsSync(path) && !isLink(path)) {
        throw new Error(`no ${LOOKS_PIN_FILE}: nothing pins a private commit`);
    }
    if (!lstatSync(path).isFile()) {
        throw new Error(`${LOOKS_PIN_FILE} is not a plain file (a link or a directory): a pin is read where it is`);
    }
    const bytes = readFileSync(path);
    const why = pinProblem(bytes);
    if (why !== undefined) {
        throw new Error(why);
    }
    return pinOf(bytes);
}

function isLink(path) {
    try {
        return lstatSync(path).isSymbolicLink();
    } catch {
        return false;
    }
}

/**
 * The pin read in shell, as the deploy workflow's `looks` job runs it, from
 * the checkout's root. It opens with `set -euo pipefail`, so it is safe
 * under any bash invocation and not only under `shell: bash` (the 8c1
 * critic's item 3; `PACK_SCRIPT`, in `scripts/looks-artifact.mjs`, which
 * re-exports this one, opens with the same line). Then: a link refused
 * before anything reads it, the byte count, the shape (an explicit
 * character list, never a range a locale could widen), the whole file
 * against the line it parsed — and **one** write to `$GITHUB_OUTPUT`
 * carrying `commit=` and `tree=`. A refusal writes nothing and names no
 * private thing: the file is public. No blank line, so the workflow
 * grammar's `run: |` block holds it as it is (V5). The workflow test holds
 * the step to this string verbatim (8c3).
 */
export const PIN_SCRIPT = `set -euo pipefail
pin=${LOOKS_PIN_FILE}
refuse() { echo "$pin is not one commit and its packed tree: two runs of 40 lower-case hex, one space, one newline, ${LOOKS_PIN_BYTES} bytes, a plain file" >&2; exit 1; }
[ ! -L "$pin" ] || refuse
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
 * (`PACK_SCRIPT` in `scripts/looks-artifact.mjs` holds it verbatim, after
 * its own `set -euo pipefail`, which this line needs: without `pipefail`
 * an unreadable `$PIN` assigns the empty tree and carries on): the root
 * entries of the pinned commit `$PIN` in the clone at `looks`, read with
 * replace objects off and from the tree's root whatever the directory
 * (`--no-replace-objects`, `--full-tree`, as every private-look read),
 * less the root `README.md` and `LOG.md`, written by `git mktree` — into
 * `$tree`.
 */
export const PACKED_TREE_SCRIPT = `tree="$(git --no-replace-objects -C looks ls-tree --full-tree "$PIN" | awk -F '\\t' '$2 != "README.md" && $2 != "LOG.md"' | git -C looks mktree)"`;

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
 * Refuses — one error listing every problem — what the build's own read of
 * that commit refuses (`readPrivateLooksAt` over the public lists `facts`,
 * read from the theme table when not given, as `selectedIndex` reads it:
 * every file's shape and mode, an index there and valid and agreeing with
 * the public lists, every directory one the index names, every named look's
 * required files) and an index that names no look, which carries nothing:
 * a pin never names a commit the road would carry and the build refuse to
 * read. **Not read here**, stated: a look's own files against their
 * validators (`look.json`, the sheet's lint, the SVG allow-list, its faces,
 * its budget) — the build and `pnpm test` read those under the selection.
 */
export async function pinLineFor({ dir, commit, facts, git, env }) {
    const at = commit ?? gitCommitOf({ dir, git, env });
    const known = facts ?? (await publicLookFacts());
    const repo = readPrivateLooksAt({ dir, commit: at, facts: known, git, env });
    const problems = [...repo.problems];
    if (problems.length === 0 && parsePrivateIndex(repo.indexText).index.looks.length === 0) {
        problems.push('the index names no look: a pin names a commit that carries one');
    }
    if (problems.length > 0) {
        throw new Error(`private looks at ${at}: a pin names no commit the build would refuse:\n  - ${problems.join('\n  - ')}`);
    }
    return `${at} ${packedTreeOf({ dir, commit: at, git, env })}\n`;
}

/**
 * Write `line` (a pin `pinProblem` accepts) to `root`'s `deploy/looks.commit`
 * through a file beside it renamed into place, so the pin is the old one or
 * the new one and never half of either.
 */
export function writeLooksPin(root, line) {
    const why = pinProblem(line);
    if (why !== undefined) {
        throw new Error(why);
    }
    const path = join(root, LOOKS_PIN_FILE);
    const next = `${path}.next`;
    writeFileSync(next, line);
    renameSync(next, path);
}

/**
 * The verdict on one harness run's pair, from facts read elsewhere (pure):
 * `commit` the private commit the run measured; `pin` the pin as this
 * repository's HEAD holds it (`{ commit, tree }`), or `pinError` why it
 * could not be read there; `diskDiffers` whether the file on the disk is
 * other bytes than HEAD's (a `--skip-worktree` or `--assume-unchanged` file
 * that `git status` would not show); `packedTree` the packed tree of
 * `commit`; `publicTree` this repository's HEAD tree; `publicClean` and
 * `privateClean` whether each working tree has no uncommitted change.
 * **The pinned pair** is exactly: the pin at HEAD and on the disk alike, the
 * run's commit the pin's, the pin's tree that commit's packed tree, and a
 * clean public tree; uncommitted changes in the private repository are said
 * and do not count against it, since every read is of the commit and none
 * of the disk. Answers `{ pinned, sentence }`.
 */
export function pairVerdict({ commit, pin, pinError, diskDiffers, packedTree, publicTree, publicClean, privateClean }) {
    const short = (hex) => hex.slice(0, 12);
    const notMeasured = privateClean ? '' : ' (uncommitted changes in the private repository are not measured)';
    let pinned = false;
    let sentence;
    if (pin === undefined) {
        sentence = `${LOOKS_PIN_FILE} at HEAD does not read as a pin — not the pinned pair (${pinError ?? 'no pin'})`;
    } else if (diskDiffers) {
        sentence = `not the pinned pair: ${LOOKS_PIN_FILE} on the disk differs from HEAD's`;
    } else if (commit !== pin.commit) {
        sentence = `not the pin ${short(pin.commit)} — not the pinned pair`;
    } else if (packedTree !== pin.tree) {
        sentence = `the pin's commit, and the pin's tree ${short(pin.tree)} is not its packed tree ${short(packedTree)} — not the pinned pair`;
    } else if (!publicClean) {
        sentence = `the pin, with Stall tree ${short(publicTree)} — not the pinned pair: the public tree has uncommitted changes`;
    } else {
        pinned = true;
        sentence = `the pin, with Stall tree ${short(publicTree)} clean — the pinned pair`;
    }
    return { pinned, sentence: `${sentence}${notMeasured}` };
}

/** Whether the working tree of the repository whose root is `dir` has no uncommitted change, untracked files included (ignored ones not). */
function cleanAt(run) {
    return run(['--no-optional-locks', 'status', '--porcelain', '--untracked-files=normal']).trim() === '';
}

/**
 * The pin as `root`'s HEAD holds it — a plain file there, read as git
 * stores it — and whether the disk's file is other bytes:
 * `{ pin, pinError, diskDiffers }`.
 */
function pinAtHead(run, root) {
    const entry = run(['ls-tree', '-z', '--full-tree', 'HEAD', '--', LOOKS_PIN_FILE]).split('\0')[0];
    const m = /^(\d{6}) blob ([0-9a-f]{40})\t/.exec(entry ?? '');
    if (m === null) {
        return { pinError: `no ${LOOKS_PIN_FILE} at HEAD` };
    }
    if (m[1] !== '100644') {
        return { pinError: `${LOOKS_PIN_FILE} at HEAD is mode ${m[1]}, where a pin is a plain file` };
    }
    const bytes = run(['cat-file', 'blob', m[2]], 'buffer');
    const why = pinProblem(bytes);
    if (why !== undefined) {
        return { pinError: why };
    }
    const path = join(root, LOOKS_PIN_FILE);
    let disk;
    try {
        disk = lstatSync(path).isFile() ? readFileSync(path) : undefined;
    } catch {
        disk = undefined;
    }
    return { pin: pinOf(bytes), diskDiffers: disk === undefined || !disk.equals(bytes) };
}

/**
 * Whether a run that measured `commit` of the private repository at `dir`
 * measured the pinned pair of this repository at `root` (`pairVerdict`,
 * over the facts read here). A pin that does not read is a verdict, not a
 * throw: the harness says so and goes on.
 */
export function pinnedPair({ root, dir, commit, git, env }) {
    const pub = gitAt({ dir: root, git, env });
    const { pin, pinError, diskDiffers } = pinAtHead(pub, root);
    return pairVerdict({
        commit,
        pin,
        pinError,
        diskDiffers,
        packedTree: pin !== undefined && pin.commit === commit ? packedTreeOf({ dir, commit, git, env }) : undefined,
        publicTree: pub(['rev-parse', '--verify', 'HEAD^{tree}']).trim(),
        publicClean: cleanAt(pub),
        privateClean: cleanAt(gitAt({ dir, git, env })),
    });
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const args = process.argv.slice(2);
    const write = args.includes('--write');
    const dirs = args.filter((arg) => arg !== '--write');
    try {
        if (dirs.length > 1 || dirs.some((arg) => arg.startsWith('-'))) {
            throw new Error('usage: node scripts/looks-pin.mjs [--write] [dir], from the checkout root');
        }
        const line = await pinLineFor({ dir: resolve(dirs[0] ?? 'looks') });
        if (write) {
            writeLooksPin(process.cwd(), line);
            process.stderr.write(`looks-pin: wrote ${LOOKS_PIN_FILE}: ${line}`);
        } else {
            process.stdout.write(line);
        }
    } catch (error) {
        process.stderr.write(`looks-pin: ${error.message}\n`);
        process.exit(1);
    }
}
