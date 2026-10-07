/**
 * The private looks a preview deploy carries, from the `looks` job to the
 * build job (step 8c2; STEP-8C-PLAN v2, V2 and V3): the shell the `looks`
 * job runs, and the unwrap the build job runs before anything is installed.
 *
 * **The `looks` job runs no project code** — only `actions/checkout`,
 * `actions/upload-artifact` and two inline shell steps, each held to a
 * string here verbatim by the workflow test (8c3): `PIN_SCRIPT` (re-exported
 * from `scripts/looks-pin.mjs`, where it lives beside `readLooksPin`, the
 * reader it agrees with) and `PACK_SCRIPT`. Both open with `set -euo
 * pipefail`, so they hold under any bash invocation and not only under
 * `shell: bash`, and neither carries a blank line, so the workflow
 * grammar's `run: |` block holds it as it is.
 *
 * **`PACK_SCRIPT` refuses before it archives.** In the job's root, with the
 * private clone at `looks`, `$PIN` and `$PINNED_TREE` the two hashes the pin
 * step read, and `$RUNNER_TEMP` the runner's: the clone must be at the pinned
 * commit; then **every entry of the pinned tree** (`git ls-tree -r -t
 * --full-tree`, replace objects off) goes through one awk program,
 * `PACK_ALLOW_PROGRAM`, which admits exactly the files the build's own
 * `privateFileProblems` admits (`scripts/private-looks.mjs`: mode `100644`,
 * the root files, a look's four files, `<slug>/art/<name>` by `OWN_ART_NAME`
 * and `PRIVATE_FACE_LICENCE`, the slug by `PRIVATE_SLUG` and
 * `PRIVATE_SLUG_MAX`) **under a slug `PREVIEW_SLUGS` names** — (c′): until a
 * release only the canary travels — and the directories those files stand
 * in, and nothing else, so an unsold look, a gitlink, a link, an
 * executable bit, a `.gitattributes`,
 * a note, a design log inside a look, a folder of shots or a script stops
 * the job **before anything is archived or uploaded** (the 8c critic's item
 * 1). A refusal prints a count, never a path: the log is public. Then the
 * root `README.md` and `LOG.md` are left out (`PACKED_TREE_SCRIPT`, held
 * verbatim), the tree `git mktree` wrote must be the tree
 * `deploy/looks.commit` pins (`$PINNED_TREE`, reviewed in a public commit),
 * and **that tree id is archived, never the commit**: `git archive
 * <commit>` writes a pax header naming the commit and, under an
 * `export-subst` attribute, the author's mailbox and the subject into the
 * archive; a tree id carries neither. The artifact is `looks.tar` and
 * `pin`, the stamp `<commit> <tree>\n` — the pin's own 82 bytes.
 *
 * **What the pack does not refuse, stated**: it holds files to their
 * shapes and modes, not the index to the files. The build's index-level
 * refusals (`privateLooksProblems`: a look directory the index does not
 * name, an index the public lists refuse, a named look without its
 * required files) run in the build job, after the upload; at pin time
 * `pinLineFor` (`node scripts/looks-pin.mjs --write`) refuses all three,
 * and a pin written by hand skips it (the 8c2 critic's items 1 and 2).
 *
 * **The program is built from the build's own constants** and refuses to
 * load when one of them changes shape (`shapeOf`): a pack written for one
 * allow-list and run against another is the hole this step closes. The
 * test runs the shell itself over a corpus generated from those constants
 * and the build's predicate, both directions — every path the shell admits
 * `privateFileProblems` admits, and every path it admits the shell admits
 * (`the-pack-admits-exactly-the-files-privateFileProblems-admits`,
 * `the-pack-refuses-a-file-the-build-would-refuse`). Lengths are checked
 * with `length()`, never an interval expression, and every character class
 * is an explicit list, never a range: Ubuntu's awk is mawk, this Mac's is
 * BWK awk. `ls-tree` without `-z` C-quotes an unusual path, which the
 * program then refuses — fail closed.
 *
 * **The unwrap** (`unwrapLooksArtifact`, the build job's first step after
 * the download; Node built-ins and git, nothing installed): the artifact is
 * exactly `looks.tar` and `pin`, plain files; the stamp is a pin line
 * (`pinProblem`) and **byte for byte `deploy/looks.commit`**; the tar is read
 * here, never by a `tar` binary — strict ustar as `git archive` writes a
 * tree (a regular file, a directory, nothing else: no link, no device, no
 * pax or GNU header, every checksum right, zeros after the end), no member
 * absolute, none with a `.`, `..` or `.git` component or a byte outside
 * `[A-Za-z0-9._-]`, none named `pin`, no two that fold to one name — and
 * written by this code alone into a directory it creates, so what is
 * checked is what is written. Then the directory is walked with `lstat`
 * (a regular file or a directory, nothing else; no empty directory) and
 * **its tree is hashed here, as git hashes one, from the files on disk** —
 * never from git objects the artifact could carry — and must be the pinned
 * tree; only then does git run there: a repository made with no template,
 * no global or system config, the files added and written as a tree (the
 * pinned tree again, by git's own count) and committed with a fixed
 * identity and date, so one pin always carries as one commit. The build
 * reads that repository through `STALL_LOOKS_DIR` as it reads a clone.
 * A refusal names no member and leaves no directory behind.
 *
 * What the unwrap does not check, on purpose: the shape of the files —
 * `privateFileProblems` and every other check of the build read the
 * repository the unwrap leaves, as they read a clone. And what holds the
 * artifact to this run, stated (the 8c critic's item 10): only this run's
 * `looks` job can upload an artifact this run's build job downloads; the
 * stamp and the tree hash then tie its files to the hashes reviewed in a
 * public commit.
 *
 * Node built-ins and git; a `.d.mts` beside it. Run from the checkout root:
 * `node scripts/looks-artifact.mjs unwrap <artifact-dir> <dest>`.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { closeSync, fchmodSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, rmSync, writeSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LOOKS_PIN_FILE, PACKED_TREE_SCRIPT, PIN_SCRIPT, pinProblem, readLooksPin } from './looks-pin.mjs';
import {
    GIT_LOCATION_VARS,
    PRIVATE_FACE_LICENCE,
    PRIVATE_FILE_MODE,
    PREVIEW_SLUGS,
    PRIVATE_LOOK_FILES,
    PRIVATE_ROOT_FILES,
    PRIVATE_SLUG,
    PRIVATE_SLUG_MAX,
} from './private-looks.mjs';
import { OWN_ART_NAME } from './workshop-css.mjs';

export { PIN_SCRIPT };

/** What the pack writes into `$RUNNER_TEMP`, and what the build job downloads. */
export const ARTIFACT_DIR = 'looks-artifact';
export const ARTIFACT_TAR = 'looks.tar';
export const ARTIFACT_STAMP = 'pin';

/** The directory under a look that holds its art and faces (`shapeProblem` in `scripts/private-looks.mjs`). */
const ART_DIR = 'art';

/**
 * The parts of a constant the program is written for, or a throw naming the
 * constant: a pack whose allow-list was written for one shape and run
 * against another is a pack that admits what the build refuses.
 */
function shapeOf(re, pattern, name) {
    const m = re instanceof RegExp && re.flags === '' ? pattern.exec(re.source) : null;
    if (m === null) {
        throw new Error(
            `looks-artifact: PACK_SCRIPT's allow-list was written for ${name} in another shape, and it is now ${String(re)} — rewrite the program and its test together`,
        );
    }
    return m;
}

/** A name that may sit in an awk string literal, or a regular expression, as it is. */
function plainName(name) {
    if (typeof name !== 'string' || !/^[A-Za-z0-9._-]+$/.test(name)) {
        throw new Error(`looks-artifact: ${JSON.stringify(name)} is not a name the pack's program can hold as it is`);
    }
    return name;
}

/** Lower-case letters and digits, listed — never a range a locale could widen. */
const LD = 'abcdefghijklmnopqrstuvwxyz0123456789';
const HEX = '0123456789abcdef';
const anyOf = (variable, names) => names.map((name) => `${variable} == "${plainName(name)}"`).join(' || ');

/**
 * The allow-list program, written from the build's constants (`constants`:
 * `slug`, `slugMax`, `artName`, `faceLicence`, `rootFiles`, `lookFiles`,
 * `fileMode`, `previewSlugs` — `PRIVATE_SLUG`, `PRIVATE_SLUG_MAX`,
 * `OWN_ART_NAME`, `PRIVATE_FACE_LICENCE`, `PRIVATE_ROOT_FILES`,
 * `PRIVATE_LOOK_FILES`, `PRIVATE_FILE_MODE` and `PREVIEW_SLUGS`): a length
 * or a list that moves moves the program with it, and a regular expression
 * in another shape than the one this was written for throws (`shapeOf`),
 * so the module refuses to load rather than pack against an allow-list it
 * does not know.
 *
 * **A look directory is admitted only under a preview slug**
 * (`PREVIEW_SLUGS`, (c′) made mechanical): the program compares the first
 * component with each, exactly — never a prefix, a suffix or a case
 * folded — so an unsold look, indexed or not, stops the job like any other
 * refused entry, by a count. Each preview slug must itself be a slug
 * `PRIVATE_SLUG` and `PRIVATE_SLUG_MAX` admit, or the module refuses to
 * load; what it admits is then exactly what `privateFileProblems` admits
 * at the root or under a preview slug.
 *
 * One awk program over `git ls-tree -r -t --full-tree` lines (`<mode>
 * <type> <object>\t<path>`, split on the tab; a line that is not exactly
 * those two fields is refused, though git quotes every tab in a name): a
 * blob of the file mode at a path `privateFileProblems` admits is a file
 * this road carries; a tree is admitted only where such a file stands under
 * it — which makes it a look's directory or its `art/` — so an empty or
 * file-less subtree, which the build's file list cannot see, is refused
 * too. It prints how many entries it refused, and nothing else.
 */
export function packAllowProgram({ slug, slugMax, artName, faceLicence, rootFiles, lookFiles, fileMode, previewSlugs }) {
    shapeOf(slug, /^\^\[a-z0-9\]\+\(\?:-\[a-z0-9\]\+\)\*\$$/, 'PRIVATE_SLUG');
    const art = shapeOf(artName, /^\^\[a-z0-9-\]\{1,(\d+)\}\\\.\(\?:([a-z0-9]+(?:\|[a-z0-9]+)*)\)\$$/, 'OWN_ART_NAME');
    const licence = shapeOf(faceLicence, /^\^([A-Z][A-Z-]*)\(\?:-\[a-z0-9-\]\{1,(\d+)\}\)\?\\\.txt\$$/, 'PRIVATE_FACE_LICENCE');
    if (!Number.isInteger(slugMax) || slugMax < 1 || !/^[0-7]{6}$/.test(fileMode)) {
        throw new Error('looks-artifact: PRIVATE_SLUG_MAX or PRIVATE_FILE_MODE is not what the pack was written for');
    }
    if (!Array.isArray(previewSlugs) || previewSlugs.length === 0 || previewSlugs.some((name) => typeof name !== 'string' || !slug.test(name) || name.length > slugMax)) {
        throw new Error(`looks-artifact: PREVIEW_SLUGS is ${JSON.stringify(previewSlugs)}, where it lists slugs PRIVATE_SLUG admits, at least one`);
    }
    const stem = plainName(licence[1]);
    return `NF != 2 { bad++; next }
{
  n = split($2, p, "/")
  s = ${anyOf('p[1]', previewSlugs)}
  if ($1 ~ /^040000 tree [${HEX}]+$/) { tree[$2] = 1; next }
  ok = 0
  if ($1 ~ /^${fileMode} blob [${HEX}]+$/) {
    if (n == 1) ok = ${anyOf('$2', rootFiles)}
    else if (s && n == 2) ok = ${anyOf('p[2]', lookFiles)}
    else if (s && n == 3 && p[2] == "${ART_DIR}") {
      m = split(p[3], q, /[.]/)
      ok = m == 2 && q[1] ~ /^[${LD}-]+$/ && length(q[1]) <= ${Number(art[1])} && (${anyOf('q[2]', art[2].split('|'))})
      if (p[3] == "${stem}.txt") ok = 1
      if (m == 2 && q[2] == "txt" && q[1] ~ /^${stem}-[${LD}-]+$/ && length(q[1]) <= ${stem.length + 1 + Number(licence[2])}) ok = 1
    }
  }
  if (!ok) { bad++; next }
  if (n > 1) has[p[1]] = 1
  if (n > 2) has[p[1] "/" p[2]] = 1
}
END {
  for (d in tree) if (!(d in has)) bad++
  print bad + 0
}`;
}

/** The allow-list the pack runs: `packAllowProgram` over the build's own constants. */
export const PACK_ALLOW_PROGRAM = packAllowProgram({
    slug: PRIVATE_SLUG,
    slugMax: PRIVATE_SLUG_MAX,
    artName: OWN_ART_NAME,
    faceLicence: PRIVATE_FACE_LICENCE,
    rootFiles: PRIVATE_ROOT_FILES,
    lookFiles: PRIVATE_LOOK_FILES,
    fileMode: PRIVATE_FILE_MODE,
    previewSlugs: PREVIEW_SLUGS,
});

/**
 * The pack, as the deploy workflow's `looks` job runs it (see the module's
 * docblock): the clone at the pin, the allow-list, `PACKED_TREE_SCRIPT`
 * verbatim, the tree against the pin's second hash, then the archive of
 * the tree id and the stamp into `$RUNNER_TEMP/looks-artifact`. Every
 * refusal comes before `mkdir` — **before anything is archived**, not
 * before anything is written: the tree check reads the tree `git mktree`
 * has just written into the clone's objects — so a refused pack leaves no
 * artifact directory, and none prints a path.
 */
export const PACK_SCRIPT = `set -euo pipefail
[ "$(git --no-replace-objects -C looks rev-parse --verify HEAD)" = "$PIN" ] || { echo 'the private checkout is not at the pinned commit' >&2; exit 1; }
refused="$(git --no-replace-objects -C looks ls-tree -r -t --full-tree "$PIN" | awk -F '\\t' '${PACK_ALLOW_PROGRAM}')"
[ "$refused" = 0 ] || { echo "$refused entries of the pinned tree are not files this road carries (their names are not printed in a public log)" >&2; exit 1; }
${PACKED_TREE_SCRIPT}
[ "$tree" = "$PINNED_TREE" ] || { echo 'the pinned commit, without its README and log, is not the tree ${LOOKS_PIN_FILE} pins' >&2; exit 1; }
out="$RUNNER_TEMP/${ARTIFACT_DIR}"
mkdir "$out"
git --no-replace-objects -C looks archive --format=tar "$tree" > "$out/${ARTIFACT_TAR}"
printf '%s %s\\n' "$PIN" "$tree" > "$out/${ARTIFACT_STAMP}"
`;

/** The largest tar the unwrap reads: far above any look a budget admits (`LOOK_ART_CAP_GZIP`), far below a runner's memory. */
export const ARTIFACT_TAR_MAX_BYTES = 64 * 1024 * 1024;

const BLOCK = 512;

/** A refusal: the message names no member, so a public log never carries a private path. */
class Refusal extends Error {}

const refuse = (why) => {
    throw new Refusal(`looks-artifact: ${why}`);
};

/** A NUL-terminated field, as its bytes up to the first NUL. */
function field(header, at, size) {
    const bytes = header.subarray(at, at + size);
    const end = bytes.indexOf(0);
    return end < 0 ? bytes : bytes.subarray(0, end);
}

/** An octal number field as `git archive` writes one (digits, then NULs or spaces), or a refusal. */
function octal(header, at, size, what) {
    const text = header.subarray(at, at + size).toString('latin1').replace(/[\0 ]+$/, '');
    if (!/^[0-7]+$/.test(text)) {
        refuse(`a tar header's ${what} is not an octal number`);
    }
    return Number.parseInt(text, 8);
}

/** A member path's safety, before anything is written: relative, plain components, none that names git or the stamp. */
function memberProblem(path) {
    if (path === '' || path.startsWith('/')) {
        return 'an absolute or empty member';
    }
    const parts = path.split('/');
    for (const part of parts) {
        if (part === '' || part === '.' || part === '..') {
            return 'a member with an empty, . or .. component';
        }
        if (!/^[A-Za-z0-9._-]+$/.test(part)) {
            return 'a member whose name holds a byte outside letters, digits, dot, hyphen and underscore';
        }
        if (part.toLowerCase() === '.git') {
            return 'a member inside a .git directory: the artifact carries files, never a repository';
        }
    }
    if (path === ARTIFACT_STAMP) {
        return `a member named ${ARTIFACT_STAMP}, like the stamp beside the tar`;
    }
    return undefined;
}

/**
 * The members of a tar as `git archive` writes a tree, read strictly:
 * `{ path, dir, exec, data }[]`, in order. Anything else is a refusal that
 * names no member.
 */
export function readArtifactTar(tar) {
    if (tar.length % BLOCK !== 0 || tar.length < 2 * BLOCK) {
        refuse('the tar is not whole 512-byte blocks ending in two zero blocks');
    }
    const members = [];
    const seen = new Set();
    const dirs = new Set();
    let at = 0;
    for (;;) {
        if (at + BLOCK > tar.length) {
            refuse('the tar ends before its end-of-archive block');
        }
        const header = tar.subarray(at, at + BLOCK);
        if (header.every((byte) => byte === 0)) {
            if (!tar.subarray(at).every((byte) => byte === 0) || tar.length - at < 2 * BLOCK) {
                refuse('the tar carries bytes after its end, or ends without two zero blocks');
            }
            return members;
        }
        let sum = 0;
        for (let i = 0; i < BLOCK; i += 1) {
            sum += i >= 148 && i < 156 ? 0x20 : header[i];
        }
        if (octal(header, 148, 8, 'checksum') !== sum) {
            refuse('a tar header whose checksum is wrong');
        }
        if (header.subarray(257, 263).toString('latin1') !== 'ustar\0' || header.subarray(263, 265).toString('latin1') !== '00') {
            refuse('a tar header that is not ustar as git archive writes it');
        }
        const type = String.fromCharCode(header[156]);
        if (type !== '0' && type !== '5') {
            refuse('a tar member that is neither a regular file nor a directory (a link, a device, a pax or GNU header)');
        }
        const size = octal(header, 124, 12, 'size');
        const mode = octal(header, 100, 8, 'mode');
        const name = field(header, 0, 100);
        const prefix = field(header, 345, 155);
        const bytes = prefix.length > 0 ? Buffer.concat([prefix, Buffer.from('/'), name]) : name;
        if (bytes.some((byte) => byte < 0x21 || byte > 0x7e)) {
            refuse('a member whose name holds a byte outside printable ASCII');
        }
        let path = bytes.toString('latin1');
        const dir = type === '5';
        if (dir) {
            if (size !== 0 || !path.endsWith('/')) {
                refuse('a directory member with a size, or without its trailing slash');
            }
            path = path.slice(0, -1);
        }
        const why = memberProblem(path);
        if (why !== undefined) {
            refuse(why);
        }
        const folded = path.toLowerCase();
        if (seen.has(folded)) {
            refuse('two members that name one file, case folded');
        }
        const parent = path.includes('/') ? path.slice(0, path.lastIndexOf('/')).toLowerCase() : undefined;
        if (parent !== undefined && !dirs.has(parent)) {
            refuse('a member whose directory the tar did not write before it');
        }
        seen.add(folded);
        if (dir) {
            dirs.add(folded);
        }
        const start = at + BLOCK;
        const end = start + size;
        if (end > tar.length) {
            refuse('a member whose data runs past the end of the tar');
        }
        members.push({ path, dir, exec: !dir && (mode & 0o100) !== 0, data: dir ? undefined : tar.subarray(start, end) });
        at = start + Math.ceil(size / BLOCK) * BLOCK;
    }
}

/** Git's object id of `type` `body`: sha1 over `<type> <size>\0<body>`. */
function objectId(type, body) {
    return createHash('sha1').update(Buffer.concat([Buffer.from(`${type} ${body.length}\0`, 'latin1'), body])).digest();
}

/**
 * The tree id of the directory `dir` as git would write it from these
 * files, read from the disk with `lstat`: a regular file is a blob (mode
 * `100755` when its owner may run it, `100644` otherwise), a directory a
 * subtree, sorted as git sorts (a directory's name compared with a slash
 * after it). Anything else on the disk, or an empty directory (which no git
 * tree carries), is a refusal. Answers `{ id, files }`.
 */
export function treeOfDisk(dir) {
    const entries = [];
    let files = 0;
    for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        const st = lstatSync(path);
        if (st.isFile()) {
            entries.push({ key: name, mode: (st.mode & 0o100) !== 0 ? '100755' : '100644', name, id: objectId('blob', readFileSync(path)) });
            files += 1;
        } else if (st.isDirectory()) {
            const sub = treeOfDisk(path);
            entries.push({ key: `${name}/`, mode: '40000', name, id: Buffer.from(sub.id, 'hex') });
            files += sub.files;
        } else {
            refuse('the unwrapped tree holds an entry that is neither a regular file nor a directory');
        }
    }
    if (entries.length === 0) {
        refuse('the unwrapped tree holds an empty directory, which no git tree carries');
    }
    entries.sort((a, b) => Buffer.compare(Buffer.from(a.key, 'latin1'), Buffer.from(b.key, 'latin1')));
    const body = Buffer.concat(entries.flatMap((entry) => [Buffer.from(`${entry.mode} ${entry.name}\0`, 'latin1'), entry.id]));
    return { id: objectId('tree', body).toString('hex'), files };
}

/**
 * Git's environment for the carried repository: **no global or system
 * config and no global or system attributes** — `GIT_CONFIG_GLOBAL` at
 * `/dev/null` (`~/.gitconfig` and the XDG config unread),
 * `GIT_CONFIG_NOSYSTEM` and `GIT_ATTR_NOSYSTEM` (the system config and the
 * system attributes file unread; the 8c2 critic's item 5), and `SAME`'s
 * `core.attributesFile` and `core.excludesFile` at `/dev/null` (the global
 * attributes and ignore files) — no configuration handed down in the
 * environment (`GIT_CONFIG`, `GIT_CONFIG_PARAMETERS`, `GIT_CONFIG_COUNT`;
 * `GIT_CONFIG_SYSTEM`, the system file's path, is git's to ignore under
 * `GIT_CONFIG_NOSYSTEM`), neither variable that changes what this carries
 * (`GIT_DEFAULT_HASH`, which makes `git init` write another object format,
 * and `GIT_ATTR_SOURCE`, which reads attributes from a tree), no location
 * inherited, replace objects off, and a fixed identity and date. `git init
 * --template=` copies no template either. Test:
 * `the-carried-repository-reads-no-global-or-system-git-setting`, every
 * setting but one proved by a plant: the global ignore file is a belt
 * (`add -A -f` adds what it names anyway).
 */
function carriedGitEnv(env) {
    const clean = {
        ...env,
        GIT_CONFIG_GLOBAL: '/dev/null',
        GIT_CONFIG_NOSYSTEM: '1',
        GIT_ATTR_NOSYSTEM: '1',
        GIT_NO_REPLACE_OBJECTS: '1',
        GIT_AUTHOR_NAME: 'Stall deploy',
        GIT_AUTHOR_EMAIL: '',
        GIT_AUTHOR_DATE: '@0 +0000',
        GIT_COMMITTER_NAME: 'Stall deploy',
        GIT_COMMITTER_EMAIL: '',
        GIT_COMMITTER_DATE: '@0 +0000',
    };
    for (const name of [
        ...GIT_LOCATION_VARS,
        'GIT_CONFIG',
        'GIT_CONFIG_PARAMETERS',
        'GIT_CONFIG_COUNT',
        'GIT_DEFAULT_HASH',
        'GIT_ATTR_SOURCE',
    ]) {
        delete clean[name];
    }
    return clean;
}

const SAME = [
    '-c',
    'core.autocrlf=false',
    '-c',
    'core.eol=lf',
    '-c',
    'core.fileMode=true',
    '-c',
    'core.safecrlf=false',
    '-c',
    'core.attributesFile=/dev/null',
    '-c',
    'core.excludesFile=/dev/null',
];

/**
 * Unwrap the artifact at `artifact` into a new repository at `dest`, for
 * the build to read through `STALL_LOOKS_DIR`; `root` is this checkout's
 * root, whose `deploy/looks.commit` the stamp must equal. See the module's
 * docblock for every check. Answers `{ commit, tree, carried, files }`: the
 * pinned commit and tree, the commit the carried repository's `main` names
 * (the same for one pin, every time), and how many files it holds. Throws a
 * refusal that names no member; a refusal after `dest` was made removes it.
 */
export function unwrapLooksArtifact({ artifact, dest, root, git = 'git', env = process.env }) {
    const pin = readLooksPin(root);
    const pinBytes = readFileSync(join(root, LOOKS_PIN_FILE));
    const members = quietly('reading the artifact', () => artifactMembers(artifact, pinBytes, pin));
    const target = resolve(dest);
    if (quietly('looking for the destination', () => present(target))) {
        refuse('the destination is already there: the unwrap makes it, and never writes into what it did not make');
    }
    quietly('making the destination', () => mkdirSync(target));
    try {
        quietly('writing the members', () => writeMembers(target, members));
        const disk = quietly('hashing the unwrapped files', () => treeOfDisk(target));
        if (disk.id !== pin.tree) {
            refuse(`the unwrapped files hash to tree ${disk.id.slice(0, 12)}, and ${LOOKS_PIN_FILE} pins ${pin.tree.slice(0, 12)}: a file changed, missing or extra, or a mode that moved`);
        }
        const clean = carriedGitEnv(env);
        const run = (args) =>
            quietly(`git ${args[0]}`, () =>
                execFileSync(git, ['--no-replace-objects', ...SAME, ...args], { cwd: target, env: clean, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim(),
            );
        run(['init', '-q', '--template=', '--initial-branch=main', '.']);
        run(['add', '-A', '-f', '.']);
        const written = run(['write-tree']);
        if (written !== pin.tree) {
            refuse(`git writes the unwrapped files as tree ${written.slice(0, 12)}, and ${LOOKS_PIN_FILE} pins ${pin.tree.slice(0, 12)}`);
        }
        const carried = run(['commit-tree', written, '-m', `looks at ${pin.commit}`]);
        run(['update-ref', 'refs/heads/main', carried]);
        if (run(['rev-parse', '--verify', 'HEAD^{tree}']) !== pin.tree || run(['status', '--porcelain', '--untracked-files=all']) !== '') {
            refuse('the carried repository is not its pinned tree, clean');
        }
        return { commit: pin.commit, tree: pin.tree, carried, files: disk.files };
    } catch (error) {
        rmSync(target, { recursive: true, force: true });
        throw error;
    }
}

/**
 * `fn()`, with anything it throws that is not already a refusal turned into
 * one that says what failed and its code — never the error's message, which
 * for a file system or git error names a path.
 */
function quietly(what, fn) {
    try {
        return fn();
    } catch (error) {
        if (error instanceof Refusal) {
            throw error;
        }
        refuse(`${what} failed (${error?.code ?? (error?.status === undefined ? 'error' : `exit ${error.status}`)})`);
    }
}

/** Whether anything, a link included, stands at `path`. */
function present(path) {
    try {
        lstatSync(path);
        return true;
    } catch (error) {
        if (error.code === 'ENOENT') {
            return false;
        }
        throw error;
    }
}

/** The artifact directory's members, once its two files are what they must be (see `unwrapLooksArtifact`). */
function artifactMembers(artifact, pinBytes, pin) {
    if (!present(artifact) || !lstatSync(artifact).isDirectory()) {
        refuse('the artifact is not a directory');
    }
    const names = readdirSync(artifact).sort();
    if (names.length !== 2 || names[0] !== ARTIFACT_TAR || names[1] !== ARTIFACT_STAMP) {
        refuse(`the artifact holds ${names.length} entries, where it is exactly ${ARTIFACT_TAR} and ${ARTIFACT_STAMP}`);
    }
    for (const name of names) {
        if (!lstatSync(join(artifact, name)).isFile()) {
            refuse(`the artifact's ${name} is not a plain file`);
        }
    }
    const stamp = readFileSync(join(artifact, ARTIFACT_STAMP));
    const why = pinProblem(stamp);
    if (why !== undefined) {
        refuse(`the artifact's ${ARTIFACT_STAMP} is not a pin line: ${why.replace(LOOKS_PIN_FILE, 'it')}`);
    }
    if (!stamp.equals(pinBytes)) {
        const [commit, tree] = stamp.toString('latin1').trim().split(' ');
        refuse(`the artifact was packed at ${commit.slice(0, 12)}, tree ${tree.slice(0, 12)}, and ${LOOKS_PIN_FILE} pins ${pin.commit.slice(0, 12)}, tree ${pin.tree.slice(0, 12)}`);
    }
    const tar = join(artifact, ARTIFACT_TAR);
    if (lstatSync(tar).size > ARTIFACT_TAR_MAX_BYTES) {
        refuse(`the tar is over ${ARTIFACT_TAR_MAX_BYTES} bytes`);
    }
    return readArtifactTar(readFileSync(tar));
}

/** Write `members` (read by `readArtifactTar`) under `target`, which this code made: never over anything, never through a link. */
function writeMembers(target, members) {
    for (const member of members) {
        const path = join(target, ...member.path.split('/'));
        if (member.dir) {
            mkdirSync(path, { mode: 0o755 });
            continue;
        }
        const fd = openSync(path, 'wx', 0o644);
        try {
            fchmodSync(fd, member.exec ? 0o755 : 0o644);
            for (let at = 0; at < member.data.length; ) {
                at += writeSync(fd, member.data, at);
            }
        } finally {
            closeSync(fd);
        }
    }
}

/** The one line the build job's log carries for the unwrap: hashes and a count, nothing private. */
export function unwrapLine({ commit, tree, carried, files }) {
    return `private looks: pinned commit ${commit.slice(0, 12)}, tree ${tree.slice(0, 12)} (its README and log left behind), carried as ${carried.slice(0, 12)}, ${files} files`;
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const [verb, artifact, dest, ...rest] = process.argv.slice(2);
    try {
        if (verb !== 'unwrap' || artifact === undefined || dest === undefined || rest.length > 0) {
            throw new Error('usage: node scripts/looks-artifact.mjs unwrap <artifact-dir> <dest>, from the checkout root');
        }
        const result = unwrapLooksArtifact({ artifact: resolve(artifact), dest: resolve(dest), root: process.cwd() });
        process.stdout.write(`${unwrapLine(result)}\n`);
    } catch (error) {
        process.stderr.write(`${error instanceof Refusal ? error.message : `looks-artifact: ${error.message}`}\n`);
        process.exit(1);
    }
}

