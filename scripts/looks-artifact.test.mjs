import { strict as assert } from 'node:assert';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
    ARTIFACT_DIR,
    ARTIFACT_STAMP,
    ARTIFACT_TAR,
    PACK_ALLOW_PROGRAM,
    PACK_SCRIPT,
    PIN_SCRIPT,
    packAllowProgram,
    readArtifactTar,
    unwrapLine,
    unwrapLooksArtifact,
} from './looks-artifact.mjs';
import { LOOKS_PIN_FILE, PACKED_OUT, PACKED_TREE_SCRIPT, PIN_SCRIPT as PIN_SCRIPT_ITSELF, packedTreeOf } from './looks-pin.mjs';
import { PRIVATE_MODES_REFUSED, PRIVATE_PATHS_ADMITTED, PRIVATE_PATHS_REFUSED, plantLooks, removePlants } from './private-looks-plant.mjs';
import {
    PREVIEW_SLUGS,
    PRIVATE_FACE_LICENCE,
    PRIVATE_FILE_MODE,
    PRIVATE_LOOK_FILES,
    PRIVATE_ROOT_FILES,
    PRIVATE_SLUG,
    PRIVATE_SLUG_MAX,
    gitFilesAt,
    privateFileProblems,
    previewRoadProblem,
    publicLookFacts,
    readPrivateLooksAt,
} from './private-looks.mjs';
import { OWN_ART_NAME } from './workshop-css.mjs';

/**
 * The deploy road's artifact (`scripts/looks-artifact.mjs`, step 8c2): the
 * `looks` job's pack refuses, before anything is archived, every entry the
 * build's allow-list would refuse; it archives the packed tree, never the
 * commit; and the build job's unwrap carries exactly the pinned tree, or
 * nothing.
 *
 * The shell runs as the workflow runs a `shell: bash` step — `bash
 * --noprofile --norc -eo pipefail <file>`, in a job root holding the
 * private clone at `looks` — with git's global and system config off, over
 * repositories planted outside this checkout; never over a `looks/` clone
 * that may or may not be on this disk. Git runs locally and only locally.
 *
 * `node --test`: a TypeScript test importing an `.mjs` breaks `tsc` (TS7016).
 */
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const scratch = [];
after(() => {
    for (const dir of scratch) {
        rmSync(dir, { recursive: true, force: true });
    }
    removePlants();
});

/** A fresh directory outside this checkout, removed after the file's tests. */
function scratchDir(name) {
    const dir = realpathSync(mkdtempSync(join(tmpdir(), `stall-looks-artifact-${name}-`)));
    scratch.push(dir);
    return dir;
}

/** Git, run locally with no global, system or user config. */
function gitEnv(home) {
    return {
        ...process.env,
        GIT_CONFIG_GLOBAL: '/dev/null',
        GIT_CONFIG_NOSYSTEM: '1',
        XDG_CONFIG_HOME: home,
        HOME: home,
        GIT_AUTHOR_NAME: 'plant',
        GIT_AUTHOR_EMAIL: '',
        GIT_COMMITTER_NAME: 'plant',
        GIT_COMMITTER_EMAIL: '',
    };
}

/**
 * `script` run as a `shell: bash` step in `cwd`: written to a file and run
 * by `bash --noprofile --norc -eo pipefail`, with `$GITHUB_OUTPUT` a fresh
 * empty file, git's global and system config off, and `env` beside them.
 * Answers the exit status, what it wrote to `$GITHUB_OUTPUT`, and its
 * stdout and stderr.
 */
function runStep(script, cwd, env = {}) {
    const dir = scratchDir('step');
    const file = join(dir, 'step.sh');
    const output = join(dir, 'github-output');
    writeFileSync(file, script);
    writeFileSync(output, '');
    const run = spawnSync('bash', ['--noprofile', '--norc', '-eo', 'pipefail', file], {
        cwd,
        env: { PATH: process.env.PATH, HOME: dir, XDG_CONFIG_HOME: dir, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GITHUB_OUTPUT: output, ...env },
        encoding: 'utf8',
    });
    return { status: run.status, output: readFileSync(output, 'utf8'), stdout: run.stdout, stderr: run.stderr };
}

/** `runStep`, without blocking: the corpus runs its hundreds of steps a few at a time. */
function runStepAsync(script, cwd, env = {}) {
    const dir = scratchDir('step');
    const file = join(dir, 'step.sh');
    const output = join(dir, 'github-output');
    writeFileSync(file, script);
    writeFileSync(output, '');
    return new Promise((done, fail) => {
        const child = spawn('bash', ['--noprofile', '--norc', '-eo', 'pipefail', file], {
            cwd,
            env: { PATH: process.env.PATH, HOME: dir, XDG_CONFIG_HOME: dir, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GITHUB_OUTPUT: output, ...env },
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (chunk) => (stdout += chunk));
        child.stderr.on('data', (chunk) => (stderr += chunk));
        child.on('error', fail);
        child.on('close', (status) => done({ status, output: readFileSync(output, 'utf8'), stdout, stderr }));
    });
}

/** The refusal the pack prints for `n` entries, and nothing else: a count, never a path. */
const countLine = /^([1-9][0-9]*) entries of the pinned tree are not files this road carries \(their names are not printed in a public log\)\n$/;

/**
 * `PACK_SCRIPT` (or `script`) run in `work` — the job root holding the
 * clone at `looks` — with `$PIN` and `$PINNED_TREE` given and `$RUNNER_TEMP`
 * a fresh directory. Answers the step and the artifact directory it would
 * have written.
 */
function pack(work, { pin, tree, script = PACK_SCRIPT, env = {} }) {
    const runner = scratchDir('runner');
    const step = runStep(script, work, { PIN: pin, PINNED_TREE: tree, RUNNER_TEMP: runner, ...env });
    return { ...step, artifact: join(runner, ARTIFACT_DIR) };
}

/** `PACK_SCRIPT` without its allow-list — the awk step, all its lines, and the refusal after it: a mutation. */
function withoutAllowList(script) {
    const start = script.indexOf('refused="$(');
    const end = script.indexOf('[ "$refused" = 0 ]', start);
    assert.ok(start > 0 && end > start);
    return script.slice(0, start) + script.slice(script.indexOf('\n', end) + 1);
}

/** `script` without its lines that hold each of `needles`: a mutation, to prove a check is what refuses. */
function without(script, ...needles) {
    const lines = script.split('\n');
    const kept = lines.filter((line) => !needles.some((needle) => line.includes(needle)));
    assert.equal(kept.length, lines.length - needles.length, `each of ${needles.join(', ')} is one line`);
    return kept.join('\n');
}

/*
 * The corpus, generated from the build's own constants and its own
 * predicate: the boundaries are found by asking `privateFileProblems`, the
 * shapes are the constants' lists, and every mutation's verdict is the
 * build's. Git itself refuses a path with an empty, `.`, `..` or `.git`
 * component (`fast-import`'s `invalid path`), so such a path never reaches
 * the pack; the build refuses each anyway (asserted).
 */
const fileAdmitted = (path, mode) => privateFileProblems([{ path, mode }]).length === 0;
/** (c′): a look directory travels only under a slug `PREVIEW_SLUGS` names, exactly. */
const previewGate = (path) => !path.includes('/') || PREVIEW_SLUGS.includes(path.slice(0, path.indexOf('/')));
/** What the pack must admit: what the build admits, at the root or under a preview slug. */
const admitsAs = (path, mode) => fileAdmitted(path, mode) && previewGate(path);
const admits = (path) => admitsAs(path, PRIVATE_FILE_MODE);

/** The largest `k` for which `make(k)` is admitted, and `k + 1` refused. */
function boundary(make) {
    let largest = 0;
    for (let k = 1; k <= 256; k += 1) {
        if (fileAdmitted(make(k), PRIVATE_FILE_MODE)) {
            largest = k;
        }
    }
    assert.ok(largest > 0 && !fileAdmitted(make(largest + 1), PRIVATE_FILE_MODE), 'a boundary the build admits up to and refuses past');
    return largest;
}

const SLUG_MAX = boundary((k) => `${'a'.repeat(k)}/look.json`);
const ART_MAX = boundary((k) => `a/art/${'b'.repeat(k)}.svg`);
const LICENCE_MAX = boundary((k) => `a/art/LICENSE-OFL-${'c'.repeat(k)}.txt`);
const CANARY = PREVIEW_SLUGS[0];
/** Slugs one edit away from a preview slug: a prefix, a suffix, upper case, one more letter either side. */
const NEAR_CANARY = [CANARY.slice(0, -1), CANARY.slice(1), CANARY.toUpperCase(), `${CANARY[0].toUpperCase()}${CANARY.slice(1)}`, `${CANARY}x`, `x${CANARY}`, `${CANARY}-x`, `x-${CANARY}`];
const MAX_SLUG = 'a'.repeat(SLUG_MAX);
const HYPHENED_SLUG = `${'a-'.repeat(Math.floor((SLUG_MAX - 2) / 2))}aa`.slice(0, SLUG_MAX);

const gitRefuses = (path) => path.split('/').some((part) => part === '' || part === '.' || part === '..' || part.toLowerCase() === '.git');

function corpusPaths() {
    const slugs = [CANARY, ...NEAR_CANARY, 'a', '0', 'a1', 'some-look', 'a-b-c', '9-9', MAX_SLUG, HYPHENED_SLUG];
    const artNames = [
        'x.svg',
        'x.woff2',
        '-.svg',
        'a-b.woff2',
        '0.svg',
        `${'b'.repeat(ART_MAX)}.svg`,
        `${'b'.repeat(ART_MAX)}.woff2`,
        `${'b'.repeat(ART_MAX + 1)}.svg`,
        `${'b'.repeat(ART_MAX + 1)}.woff2`,
        'LICENSE-OFL.txt',
        'LICENSE-OFL-x.txt',
        'LICENSE-OFL--.txt',
        `LICENSE-OFL-${'c'.repeat(LICENCE_MAX)}.txt`,
        `LICENSE-OFL-${'c'.repeat(LICENCE_MAX + 1)}.txt`,
        'LICENSE-OFL-.txt',
        'LICENSE-OFLx.txt',
        'xLICENSE-OFL.txt',
        'LICENSE-OFL.md',
        'LICENSE.txt',
        'x.png',
        'x.svg.svg',
        'x.y.svg',
        '.svg',
        'x.',
        'x',
        'X.svg',
        'x.SVG',
        'license-ofl.txt',
        'LICENSE-OFL-X.txt',
        'x.woff',
        'x.ttf',
    ];
    const base = [
        ...PRIVATE_ROOT_FILES,
        ...PRIVATE_PATHS_ADMITTED,
        ...PRIVATE_PATHS_REFUSED,
        ...slugs.map((slug) => `${slug}/look.json`),
        ...[CANARY, 'some-look', MAX_SLUG].flatMap((slug) => PRIVATE_LOOK_FILES.map((file) => `${slug}/${file}`)),
        ...[CANARY, MAX_SLUG].flatMap((slug) => artNames.map((name) => `${slug}/art/${name}`)),
        `${'a'.repeat(SLUG_MAX + 1)}/look.json`,
        `${'a'.repeat(SLUG_MAX + 1)}/art/x.svg`,
        // The 8c2 critic's roads: an unsold look beside the canary, or in its place.
        'ink-wash/look.json',
        'ink-wash/sheet.css',
        'ink-wash/art/mask.svg',
        `${CANARY}/README.md`,
        // The 8c critic's plants, and the plan's (V2).
        'NOTES.md',
        'fixture/README.md',
        '.gitattributes',
        'some-look/.gitattributes',
        'log.md',
        'ink-wash/LOG.md',
        'shots/1.png',
        'gen.mjs',
        'art/x.svg',
        'some-look/x.svg',
        'some-look/art/x.svg/y.svg',
        'some-look/ART/x.svg',
        'some-look/sub/look.json',
        'a/b/c/d',
        'some.look/look.json',
        'a--b/look.json',
        'a-/look.json',
        'a_b/look.json',
        'index.json/look.json',
        // Names git quotes: each turns the path into a C string the program refuses.
        'some-look/art/tab\there.svg',
        'some-look/art/line\nbreak.svg',
        'some-look/art/"quoted".svg',
        'some-look/art/back\\slash.svg',
        'café/look.json',
        'some-look/art/é.svg',
        'some-look/art/a b.svg',
    ];
    const mutations = (path) => {
        const parts = path.split('/');
        const last = parts.at(-1);
        const head = parts.slice(0, -1);
        return [
            path.toUpperCase(),
            path.toLowerCase(),
            [...head, `.${last}`].join('/'),
            `${path}.txt`,
            `${path}.svg`,
            path.replaceAll('-', '_'),
            [...head, `${last} `].join('/'),
            [...head, 'sub', last].join('/'),
            last,
            `x/${path}`,
            `${parts[0]}-/${parts.slice(1).join('/')}`,
            `-${path}`,
            path.replace('a', 'á'),
            ...(parts.length > 1 ? NEAR_CANARY.map((near) => [near, ...parts.slice(1)].join('/')) : []),
        ];
    };
    const all = [...base, ...base.filter(admits).flatMap(mutations)];
    return [...new Set(all)].filter((path) => path !== '' && !path.endsWith('/'));
}

/** The mutations git cannot write into a tree, each refused by the build anyway. */
function gitWritable(paths) {
    for (const path of paths.filter(gitRefuses)) {
        assert.ok(!admits(path), `the build admits ${JSON.stringify(path)}, which git cannot write`);
    }
    return paths.filter((path) => !gitRefuses(path));
}

/** A path as `git fast-import` reads it: C-quoted when it holds a quote, a backslash, a control byte or non-ASCII. */
function fastImportPath(path) {
    if (!/["\\\x00-\x1f\x7f-￿]/.test(path) && !path.startsWith('"')) {
        return path;
    }
    const bytes = Buffer.from(path, 'utf8');
    let out = '"';
    for (const byte of bytes) {
        if (byte === 0x22 || byte === 0x5c) {
            out += `\\${String.fromCharCode(byte)}`;
        } else if (byte === 0x0a) {
            out += '\\n';
        } else if (byte === 0x09) {
            out += '\\t';
        } else if (byte < 0x20 || byte >= 0x7f) {
            out += `\\${byte.toString(8).padStart(3, '0')}`;
        } else {
            out += String.fromCharCode(byte);
        }
    }
    return `${out}"`;
}

/**
 * A job root at `<scratch>/work` whose `looks` clone holds one root commit
 * per entry (`{ path, mode }`), each tree that entry alone, written in one
 * `git fast-import`; answers the root, the repository's git, and per entry
 * its commit. `select(commit)` points the clone's HEAD at a commit, as
 * `actions/checkout` leaves it at the pin.
 */
function corpusRepo(entries) {
    const work = scratchDir('corpus');
    const dir = join(work, 'looks');
    mkdirSync(dir);
    const env = gitEnv(work);
    const git = (args, input) => execFileSync('git', args, { cwd: dir, env, input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    git(['init', '-q', '-b', 'main', '.']);
    const stream = ['blob', 'mark :1', 'data 2', 'x', ''];
    entries.forEach(({ path, mode }, i) => {
        stream.push(`commit refs/corpus/${i}`, 'committer plant <> 0 +0000', 'data 0');
        const ref = mode === '160000' ? 'f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1' : ':1';
        stream.push(`M ${mode} ${ref} ${fastImportPath(path)}`, '');
    });
    git(['fast-import', '--quiet'], `${stream.join('\n')}\n`);
    const empty = git(['mktree'], '');
    const refs = new Map(
        git(['for-each-ref', '--format=%(refname) %(objectname) %(tree)', 'refs/corpus'])
            .split('\n')
            .map((line) => line.split(' '))
            .map(([ref, commit, tree]) => [Number(ref.slice('refs/corpus/'.length)), { commit, tree }]),
    );
    // One entry per tree: its packed tree is the tree, or the empty tree when the entry is one the pack leaves out.
    const packed = entries.map(({ path }, i) => (PACKED_OUT.includes(path) ? empty : refs.get(i).tree));
    const select = (commit) => writeFileSync(join(dir, '.git', 'HEAD'), `${commit}\n`);
    return { work, dir, env, git, commits: entries.map((_, i) => refs.get(i).commit), packed, select };
}

/**
 * Commits in `repo` whose trees hold a subtree with no file in it — which
 * `git add` cannot make and `mktree` can: an empty `junk/`, an empty look
 * directory, an empty `art/` beside a look's `look.json`, and a look
 * directory holding only an empty `art/`.
 */
function fileLessSubtrees(repo) {
    const mk = (...lines) => repo.git(['mktree'], `${lines.join('\n')}\n`);
    const empty = repo.git(['mktree'], '');
    const blob = repo.git(['hash-object', '-w', '--stdin'], 'x\n');
    const roots = [
        mk(`040000 tree ${empty}\tjunk`),
        mk(`040000 tree ${empty}\t${CANARY}`),
        mk(`040000 tree ${mk(`040000 tree ${empty}\tart`, `100644 blob ${blob}\tlook.json`)}\t${CANARY}`),
        mk(`040000 tree ${mk(`040000 tree ${empty}\tart`)}\t${CANARY}`),
    ];
    return roots.map((root) => repo.git(['commit-tree', root, '-m', 'planted']));
}

describe('the-pack-admits-exactly-the-files-privateFileProblems-admits', () => {
    it('finds the build’s boundaries from its own predicate, and the program is written for them and for the preview slugs', () => {
        assert.equal(SLUG_MAX, PRIVATE_SLUG_MAX);
        assert.ok(PACK_ALLOW_PROGRAM.includes(`\n  s = ${PREVIEW_SLUGS.map((slug) => `p[1] == "${slug}"`).join(' || ')}\n`), 'the slug gate is the preview slugs, exactly');
        assert.match(PACK_ALLOW_PROGRAM, new RegExp(`length\\(q\\[1\\]\\) <= ${ART_MAX} `));
        assert.match(PACK_ALLOW_PROGRAM, new RegExp(`length\\(q\\[1\\]\\) <= ${'LICENSE-OFL-'.length + LICENCE_MAX}\\)`));
        assert.doesNotMatch(PACK_ALLOW_PROGRAM, /\{\d/, 'no interval expression: mawk and BWK awk read them differently');
        assert.doesNotMatch(PACK_ALLOW_PROGRAM, /\[[^\]]*[a-z0-9]-[a-z0-9][^\]]*\]/, 'no range in a character class: every class is a list');
        assert.doesNotMatch(PACK_ALLOW_PROGRAM, /'/, 'no single quote: the program sits in single quotes in the shell');
    });

    /*
     * Both directions, over every corpus path at the plain file mode and
     * every admitted path at each refused mode, each the only entry of its
     * commit's tree, through the whole pack: a path the shell admits is
     * packed (exit 0, a tar), one it refuses stops the job with the count
     * line and nothing else — and the verdict is the build's
     * (`privateFileProblems`) for every one.
     */
    it('admits a path exactly when the build admits it, at every mode, through the whole pack', async () => {
        const paths = gitWritable(corpusPaths());
        const entries = [
            ...paths.map((path) => ({ path, mode: PRIVATE_FILE_MODE })),
            ...paths.filter(admits).flatMap((path) => PRIVATE_MODES_REFUSED.map((mode) => ({ path, mode }))),
        ];
        assert.ok(paths.filter(admits).length >= 15 && entries.length >= 300, `a corpus of ${entries.length} entries, ${paths.filter(admits).length} admitted`);
        assert.ok(paths.some((path) => fileAdmitted(path, PRIVATE_FILE_MODE) && !previewGate(path)), 'the corpus holds files the build admits under a slug no preview carries');
        const SHARDS = 8;
        const disagree = [];
        await Promise.all(
            Array.from({ length: SHARDS }, async (_, shard) => {
                const mine = entries.filter((_entry, i) => i % SHARDS === shard);
                const repo = corpusRepo(mine);
                for (const [i, entry] of mine.entries()) {
                    const commit = repo.commits[i];
                    if (i % 40 === 0) {
                        assert.equal(repo.packed[i], packedTreeOf({ dir: repo.dir, commit, env: repo.env }), 'the corpus’s packed tree is packedTreeOf’s');
                    }
                    repo.select(commit);
                    const runner = scratchDir('runner');
                    const step = await runStepAsync(PACK_SCRIPT, repo.work, { PIN: commit, PINNED_TREE: repo.packed[i], RUNNER_TEMP: runner, LANG: 'C.UTF-8' });
                    const artifact = join(runner, ARTIFACT_DIR);
                    const build = admitsAs(entry.path, entry.mode);
                    const shell = step.status === 0;
                    const what = `${JSON.stringify(entry.path)} ${entry.mode}`;
                    if (shell !== build) {
                        disagree.push(`${what}: the build ${build ? 'admits' : 'refuses'}, the shell ${shell ? 'admits' : 'refuses'} (${step.stderr.trim()})`);
                    } else if (shell) {
                        // What git archive wrote for every admitted shape — the longest paths included — is a tar the unwrap reads.
                        const tar = readArtifactTar(readFileSync(join(artifact, ARTIFACT_TAR)));
                        assert.equal(tar.some((member) => member.path === entry.path), !PACKED_OUT.includes(entry.path), `${what}: admitted, packed and read`);
                    } else {
                        assert.match(step.stderr, countLine, `${what}: refused by the allow-list, by a count alone`);
                        assert.equal(step.stdout, '');
                        assert.ok(!existsSync(artifact), `${what}: refused and nothing written`);
                    }
                }
            }),
        );
        assert.deepEqual(disagree, []);
    });

    /*
     * A subtree with no file in it is invisible to the build's file list and
     * carries nothing but its name; the pack refuses it, so what it admits
     * is exactly a set of files the build admits and the directories they
     * stand in. A stated departure from "exactly the build's": stricter.
     */
    it('refuses a subtree that holds no file it admits, which the build cannot see', () => {
        const repo = corpusRepo([{ path: 'index.json', mode: PRIVATE_FILE_MODE }]);
        for (const commit of fileLessSubtrees(repo)) {
            const files = gitFilesAt({ dir: repo.dir, commit, env: repo.env });
            assert.deepEqual(privateFileProblems(files), [], 'the build sees no file it refuses');
            repo.select(commit);
            const step = pack(repo.work, { pin: commit, tree: packedTreeOf({ dir: repo.dir, commit, env: repo.env }) });
            assert.notEqual(step.status, 0, repo.git(['ls-tree', '-r', '-t', '--name-only', commit]));
            assert.match(step.stderr, countLine);
            assert.ok(!existsSync(step.artifact));
        }
    });

    /*
     * Lines git does not write — a path with a raw tab cannot reach the
     * program, since git quotes it — fed to the program itself: a line that
     * is not one entry and one path is refused, never read as its first two
     * fields; and a tree no admitted file stands in counts, file or not.
     */
    it('refuses a line it cannot read as one entry and one path, and counts every refusal', () => {
        const hex = 'f'.repeat(40);
        const run = (lines) => {
            const awk = spawnSync('awk', ['-F', '\t', PACK_ALLOW_PROGRAM], { input: lines.map((line) => `${line}\n`).join(''), encoding: 'utf8' });
            assert.equal(awk.status, 0, awk.stderr);
            return awk.stdout;
        };
        assert.equal(run([`100644 blob ${hex}\tindex.json`, `040000 tree ${hex}\t${CANARY}`, `100644 blob ${hex}\t${CANARY}/look.json`]), '0\n');
        assert.equal(run([`040000 tree ${hex}\tink-wash`, `100644 blob ${hex}\tink-wash/look.json`]), '2\n');
        assert.equal(run([`100644 blob ${hex}\tindex.json\tjunk`]), '1\n');
        assert.equal(run([`100644 blob ${hex} index.json`]), '1\n');
        assert.equal(run([`040000 tree ${hex}\t${CANARY}`, `040000 tree ${hex}\t${CANARY}/art`, `100644 blob ${hex}\t${CANARY}/art/NOTES.md`]), '3\n');
        assert.equal(run([]), '0\n');
    });

    it('is written from the constants: a length or a list that moves moves it, and another shape refuses to load', () => {
        const constants = {
            slug: PRIVATE_SLUG,
            slugMax: PRIVATE_SLUG_MAX,
            artName: OWN_ART_NAME,
            faceLicence: PRIVATE_FACE_LICENCE,
            rootFiles: PRIVATE_ROOT_FILES,
            lookFiles: PRIVATE_LOOK_FILES,
            fileMode: PRIVATE_FILE_MODE,
            previewSlugs: PREVIEW_SLUGS,
        };
        assert.equal(packAllowProgram(constants), PACK_ALLOW_PROGRAM);
        assert.match(packAllowProgram({ ...constants, previewSlugs: [CANARY, 'ink-wash'] }), /s = p\[1\] == "canary" \|\| p\[1\] == "ink-wash"\n/);
        for (const previewSlugs of [[], [CANARY.toUpperCase()], ['a'.repeat(PRIVATE_SLUG_MAX + 1)], [`${CANARY}/art`], [`"${CANARY}"`], undefined]) {
            assert.throws(() => packAllowProgram({ ...constants, previewSlugs }), /PREVIEW_SLUGS is/, JSON.stringify(previewSlugs));
        }
        const moved = packAllowProgram({ ...constants, slugMax: 40, artName: /^[a-z0-9-]{1,80}\.(?:svg|woff2|png)$/, lookFiles: [...PRIVATE_LOOK_FILES, 'card.png'] });
        assert.match(moved, /length\(q\[1\]\) <= 80 /);
        assert.match(moved, /q\[2\] == "png"/);
        assert.match(moved, /p\[2\] == "card\.png"/);
        for (const [name, change] of [
            ['PRIVATE_SLUG', { slug: /^[a-z0-9_]+$/ }],
            ['PRIVATE_SLUG', { slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/i }],
            ['OWN_ART_NAME', { artName: /^[a-z0-9_-]{1,64}\.(?:svg|woff2)$/ }],
            ['OWN_ART_NAME', { artName: /^[a-z0-9-]+\.svg$/ }],
            ['PRIVATE_FACE_LICENCE', { faceLicence: /^LICENSE-OFL(?:-[a-z0-9.-]{1,64})?\.txt$/ }],
            ['PRIVATE_FACE_LICENCE', { faceLicence: /^LICENSE-OFL\.(?:txt|md)$/ }],
        ]) {
            assert.throws(() => packAllowProgram({ ...constants, ...change }), new RegExp(`written for ${name} in another shape`), String(Object.values(change)[0]));
        }
        assert.throws(() => packAllowProgram({ ...constants, rootFiles: [...PRIVATE_ROOT_FILES, 'a"b'] }), /not a name the pack's program can hold/);
    });
});

/**
 * A planted look (the tracked fixture renamed, `plantLooks`) with `plant`
 * applied and committed, cloned to `<scratch>/work/looks` as the job's
 * checkout clones it.
 */
function plantedWork(plant = () => {}, slug = CANARY) {
    const looks = plantLooks(undefined, {}, { slug });
    looks.git('add', '-A');
    plant(looks);
    looks.git('add', '-A', '--', '.', ':!vendor');
    looks.git('commit', '-q', '--allow-empty', '-m', 'plant');
    const work = scratchDir('work');
    execFileSync('git', ['clone', '-q', looks.dir, join(work, 'looks')], { env: looks.env, stdio: 'ignore' });
    const head = looks.head();
    return { looks, work, head, files: gitFilesAt({ dir: looks.dir, commit: head, env: looks.env }), tree: packedTreeOf({ dir: looks.dir, commit: head, env: looks.env }) };
}

const write = (looks, path, text) => {
    mkdirSync(dirname(join(looks.dir, path)), { recursive: true });
    writeFileSync(join(looks.dir, path), text);
};

/** Every plant the 8c critic named (item 1) and the plan's V2 lists, on a real look, each with the names it must never print. */
const PLANTS = [
    ['a note at the root', (l) => write(l, 'NOTES.md', 'notes\n'), ['NOTES']],
    ['a README inside a look', (l) => write(l, `${CANARY}/README.md`, 'r\n'), ['README']],
    ['a link to /etc/hosts', (l) => symlinkSync('/etc/hosts', join(l.dir, 'hosts')), ['hosts']],
    ['a link at a path the build admits', (l) => symlinkSync('ground.svg', join(l.dir, CANARY, 'art', 'linked.svg')), ['linked']],
    ['an executable look.json', (l) => chmodSync(join(l.dir, CANARY, 'look.json'), 0o755), ['look.json']],
    ['a .gitattributes', (l) => write(l, '.gitattributes', '* export-subst\n'), ['gitattributes']],
    ['a .gitattributes inside a look', (l) => write(l, `${CANARY}/art/.gitattributes`, '* export-ignore\n'), ['gitattributes']],
    ['a gitlink', (l) => l.git('update-index', '--add', '--cacheinfo', '160000,f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1,vendor'), ['vendor']],
    ['a lower-case log.md', (l) => write(l, 'log.md', 'l\n'), ['log.md']],
    ['a design log inside a new look', (l) => write(l, 'ink-wash/LOG.md', 'l\n'), ['ink-wash', 'LOG']],
    ['a folder of shots', (l) => write(l, 'shots/1.png', 'p\n'), ['shots', 'png']],
    ['a script', (l) => write(l, 'gen.mjs', 'export {};\n'), ['gen', 'mjs']],
    ['a nested art folder', (l) => write(l, `${CANARY}/art/sub/x.svg`, '<svg/>\n'), ['sub/']],
    // The 8c2 critic's road (i): an unsold look's directory beside the canary, unindexed.
    [
        'an unindexed look beside the canary',
        (l) => {
            write(l, 'ink-wash/look.json', '{}\n');
            write(l, 'ink-wash/sheet.css', '/* a draft note that must not travel */\n.t-ink-wash {}\n');
            write(l, 'ink-wash/art/mask.svg', '<svg/>\n');
        },
        ['ink-wash', 'mask', 'draft'],
    ],
];

/** Every slug but the preview ones a look may sit under, indexed under it: the 8c2 critic's road (ii) (`ink-wash` at `0x04`) and the slugs one edit from the canary. */
const UNSOLD_SLUGS = ['ink-wash', ...NEAR_CANARY.filter((slug) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slug))];

describe('the-pack-refuses-a-file-the-build-would-refuse', () => {
    it('packs the planted look itself', () => {
        const { work, head, tree, files } = plantedWork();
        assert.deepEqual(privateFileProblems(files), []);
        const step = pack(work, { pin: head, tree });
        assert.equal(step.status, 0, step.stderr);
        assert.deepEqual(readdirSync(step.artifact).sort(), [ARTIFACT_TAR, ARTIFACT_STAMP].sort());
    });

    for (const locale of ['C', 'C.UTF-8']) {
        it(`refuses each plant before it archives, prints a count and no name, writes nothing (LC_ALL=${locale})`, () => {
            for (const [name, plant, names] of PLANTS) {
                const { work, head, tree, files } = plantedWork(plant);
                assert.ok(privateFileProblems(files).length > 0 || files.some((file) => !previewGate(file.path)), `${name}: neither the build's file list nor the preview gate refuses it`);
                const step = pack(work, { pin: head, tree, env: { LC_ALL: locale } });
                assert.notEqual(step.status, 0, `${name}: packed`);
                assert.match(step.stderr, countLine, name);
                assert.equal(step.stdout, '', name);
                for (const word of names) {
                    assert.ok(!step.stderr.includes(word), `${name}: printed ${word}`);
                }
                assert.ok(!existsSync(join(step.artifact, ARTIFACT_TAR)) && !existsSync(step.artifact), `${name}: a tar or an artifact directory was written`);
            }
        });
    }

    /*
     * (c′) on the road: a look indexed under any slug but a preview one —
     * the 8c2 critic's road (ii), Ink wash at 0x04 in the canary's place,
     * and slugs one edit from the canary — is a look the build would carry
     * and the pack refuses, by a count.
     */
    it('refuses a look under any slug PREVIEW_SLUGS does not name, indexed or not, by a count', () => {
        for (const slug of UNSOLD_SLUGS) {
            const { work, head, tree, files } = plantedWork(() => {}, slug);
            const step = pack(work, { pin: head, tree });
            assert.notEqual(step.status, 0, `${slug}: packed`);
            assert.match(step.stderr, countLine, slug);
            assert.ok(!step.stderr.includes(slug) && !existsSync(step.artifact), `${slug}: named or written`);
            if (/^[a-z0-9-]+$/.test(slug)) {
                assert.deepEqual(privateFileProblems(files), [], `${slug}: the build's file list admits it — only the preview gate refuses`);
            }
        }
    });

    /* The allow-list is what refuses: without its two lines, a note at the root is packed and archived. */
    it('needs its allow-list: without it, a plant is archived', () => {
        const { work, head, tree } = plantedWork(PLANTS[0][1]);
        const step = pack(work, { pin: head, tree, script: withoutAllowList(PACK_SCRIPT) });
        assert.equal(step.status, 0, 'without the allow-list, the plant is refused anyway — the plant proves nothing');
        assert.ok(readArtifactTar(readFileSync(join(step.artifact, ARTIFACT_TAR))).some((member) => member.path === 'NOTES.md'));
    });

    /*
     * A local replace ref of the root tree that hides a plant: a plain read
     * sees a clean tree, while every other read of the pack — replace
     * objects off — packs and archives the commit's own, plant and all. The
     * allow-list reads with replace objects off too, so it sees the plant.
     */
    it('sees a plant a local replace ref hides, as every other read of the pack does', () => {
        const { work, head, tree, looks } = plantedWork(PLANTS[0][1]);
        const clone = join(work, 'looks');
        const git = (...args) => execFileSync('git', ['-C', clone, ...args], { env: looks.env, encoding: 'utf8' }).trim();
        const root = git('rev-parse', `${head}^{tree}`);
        const clean = git('rev-parse', `${head}~1^{tree}`);
        git('replace', root, clean);
        assert.notEqual(git('ls-tree', '-r', '--name-only', head).split('\n').includes('NOTES.md'), true, 'the plant: a plain read does not see the note');
        const step = pack(work, { pin: head, tree });
        assert.notEqual(step.status, 0);
        assert.match(step.stderr, countLine);
        assert.ok(!existsSync(step.artifact));
        const blind = pack(work, { pin: head, tree, script: PACK_SCRIPT.replace('refused="$(git --no-replace-objects -C looks ls-tree', 'refused="$(git -C looks ls-tree') });
        assert.equal(blind.status, 0, 'without the flag the allow-list sees the note anyway — the plant proves nothing');
        assert.ok(readArtifactTar(readFileSync(join(blind.artifact, ARTIFACT_TAR))).some((member) => member.path === 'NOTES.md'), 'and the pack archives it');
    });

    it('refuses a clone that is not at the pin, and a pinned tree that is not the commit’s packed tree, before it archives', () => {
        const { work, head, tree, looks } = plantedWork();
        const other = execFileSync('git', ['-C', join(work, 'looks'), 'commit-tree', `${head}^{tree}`, '-m', 'another'], { env: looks.env, encoding: 'utf8' }).trim();
        const moved = pack(work, { pin: other, tree });
        assert.notEqual(moved.status, 0);
        assert.equal(moved.stderr, 'the private checkout is not at the pinned commit\n');
        assert.ok(!existsSync(moved.artifact));
        const wrongTree = pack(work, { pin: head, tree: tree.replace(/^./, (c) => (c === '0' ? '1' : '0')) });
        assert.notEqual(wrongTree.status, 0);
        assert.equal(wrongTree.stderr, `the pinned commit, without its README and log, is not the tree ${LOOKS_PIN_FILE} pins\n`);
        assert.ok(!existsSync(wrongTree.artifact));
        const unchecked = pack(work, { pin: head, tree: tree.replace(/^./, (c) => (c === '0' ? '1' : '0')), script: without(PACK_SCRIPT, '[ "$tree" = "$PINNED_TREE" ]') });
        assert.equal(unchecked.status, 0, 'without the tree check, a tree the pin does not name is packed anyway — the plant proves nothing');
        for (const unset of ['PIN', 'PINNED_TREE', 'RUNNER_TEMP']) {
            const step = pack(work, { pin: head, tree, env: { [unset]: undefined } });
            assert.notEqual(step.status, 0, `an unset $${unset} stops the step`);
            assert.ok(!existsSync(step.artifact));
        }
    });

    it('opens with set -euo pipefail, holds the packed-tree line verbatim, checks before it writes, and archives the tree id', () => {
        assert.equal(PIN_SCRIPT, PIN_SCRIPT_ITSELF);
        const source = readFileSync(join(ROOT, 'scripts', 'looks-artifact.mjs'), 'utf8');
        assert.match(source, /^export \{ PIN_SCRIPT \};$/m, 'the pin step is looks-pin.mjs’s, re-exported');
        for (const own of ['pin=${LOOKS_PIN_FILE}', 'ls-tree --full-tree "$PIN" | awk']) {
            assert.ok(!source.includes(own), `looks-artifact.mjs writes ${own} itself, where it reuses looks-pin.mjs’s`);
        }
        const lines = PACK_SCRIPT.split('\n');
        assert.equal(lines[0], 'set -euo pipefail');
        assert.ok(lines.includes(PACKED_TREE_SCRIPT), 'PACKED_TREE_SCRIPT, verbatim, as one line');
        assert.doesNotMatch(PACK_SCRIPT, /\n\s*\n[^]/, 'no blank line: the workflow grammar holds a run: | block as it is');
        assert.doesNotMatch(PACK_SCRIPT, /\$\{\{|GITHUB_OUTPUT|GITHUB_ENV|GITHUB_PATH/);
        const at = (needle) => {
            const i = PACK_SCRIPT.indexOf(needle);
            assert.ok(i >= 0, needle);
            return i;
        };
        assert.ok(at('rev-parse --verify HEAD') < at('ls-tree -r -t --full-tree'));
        assert.ok(at('ls-tree -r -t --full-tree') < at(PACKED_TREE_SCRIPT), 'the allow-list runs before mktree');
        assert.ok(at(PACKED_TREE_SCRIPT) < at('[ "$tree" = "$PINNED_TREE" ]'));
        assert.ok(at('[ "$tree" = "$PINNED_TREE" ]') < at('mkdir "$out"'), 'every refusal before anything is written');
        const archive = lines.filter((line) => line.includes(' archive '));
        assert.deepEqual(archive, [`git --no-replace-objects -C looks archive --format=tar "$tree" > "$out/${ARTIFACT_TAR}"`]);
        assert.equal(lines.filter((line) => /\bgit\b/.test(line) && !line.includes('--no-replace-objects') && line !== PACKED_TREE_SCRIPT).length, 0, 'every private read with replace objects off');
    });
});

/** The subject and the mailbox a commit of the private repository carries, and the design log's words: none may leave the runner. */
const SUBJECT = 'a subject that never leaves the runner';
const MAILBOX = ['nobody', 'example.invalid'].join('@'); // a reserved domain, built here so no mailbox sits in this file
const LOG_WORDS = 'design notes that never leave the runner';
const REPLACED = 'a replacement the pinned commit does not hold';

/**
 * The road on a planted look as the workflow runs it: a README and a log
 * at the root, a sheet holding an `export-subst` placeholder under a local
 * `info/attributes` that substitutes it, a commit with a mailbox and a
 * subject; `deploy/looks.commit` in the job root; the pin step, then the
 * pack. Answers the job root, the artifact, the pin line and the clone.
 */
function packedRoad() {
    const looks = plantLooks((path, text) => (path === `${CANARY}/sheet.css` ? `${text}\n/* $Format:%ae %s$ */\n` : text), { 'README.md': 'what this is\n', 'LOG.md': `${LOG_WORDS}\n` }, { slug: CANARY });
    execFileSync('git', ['commit', '-q', '--allow-empty', '-m', SUBJECT], {
        cwd: looks.dir,
        env: { ...looks.env, GIT_AUTHOR_EMAIL: MAILBOX, GIT_COMMITTER_EMAIL: MAILBOX },
        stdio: 'ignore',
    });
    const work = scratchDir('road');
    const clone = join(work, 'looks');
    execFileSync('git', ['clone', '-q', looks.dir, clone], { env: looks.env, stdio: 'ignore' });
    writeFileSync(join(clone, '.git', 'info', 'attributes'), '* export-subst\n');
    const head = looks.head();
    // A local replace ref (the 8c1 critic's item 3): a plain read of the sheet's blob answers other bytes than the commit holds.
    const sheet = execFileSync('git', ['-C', clone, 'rev-parse', `${head}:${CANARY}/sheet.css`], { env: looks.env, encoding: 'utf8' }).trim();
    const other = execFileSync('git', ['-C', clone, 'hash-object', '-w', '--stdin'], { env: looks.env, input: `${REPLACED}\n`, encoding: 'utf8' }).trim();
    execFileSync('git', ['-C', clone, 'replace', sheet, other], { env: looks.env });
    const line = `${head} ${packedTreeOf({ dir: looks.dir, commit: head, env: looks.env })}\n`;
    mkdirSync(join(work, 'deploy'));
    writeFileSync(join(work, LOOKS_PIN_FILE), line);
    const pinStep = runStep(PIN_SCRIPT, work);
    assert.equal(pinStep.status, 0, pinStep.stderr);
    const out = Object.fromEntries(pinStep.output.trim().split('\n').map((kv) => kv.split('=')));
    const step = pack(work, { pin: out.commit, tree: out.tree });
    assert.equal(step.status, 0, step.stderr);
    return { looks, work, head, line, artifact: step.artifact, out };
}

/*
 * The build job runs the unwrap after setup-node and before `pnpm install`,
 * so nothing installed has run when the private files land: the module and
 * everything it may load take Node's built-ins and this repository's own
 * files, nothing from node_modules. Every kind of import is read — `import
 * … from` and `export … from`, a side-effect `import '…'`, and `import()`
 * with a literal module (one the unwrap never reaches: `publicLookFacts`'
 * `../src/domain/theme.ts`) — and an `import()` of anything but a literal
 * fails the test, since what it loads cannot be read here. Not seen,
 * stated: `require()` (no file here uses it) and a module a dependency of
 * Node itself loads.
 */
describe('the-unwrap-runs-before-anything-is-installed', () => {
    it('imports only node: modules and this repository’s own files, all the way down, static, side-effect and dynamic', () => {
        const seen = new Set();
        const walk = (file) => {
            if (seen.has(file)) {
                return;
            }
            seen.add(file);
            const source = readFileSync(file, 'utf8');
            const specs = [
                ...source.matchAll(/^\s*(?:import|export)\b[^;]*?\bfrom\s*(['"])([^'"]+)\1/gm),
                ...source.matchAll(/^\s*import\s*(['"])([^'"]+)\1/gm),
                ...source.matchAll(/\bimport\s*\(\s*(['"])([^'"]+)\1\s*\)/g),
            ].map((m) => m[2]);
            const dynamic = [...source.matchAll(/\bimport\s*\(/g)].length;
            const literal = [...source.matchAll(/\bimport\s*\(\s*(['"])([^'"]+)\1\s*\)/g)].length;
            assert.equal(dynamic, literal, `${file} has an import() whose module is not a literal`);
            for (const spec of specs) {
                assert.ok(/^(?:node:|\.\.?\/)/.test(spec), `${file} imports ${spec}`);
                if (!spec.startsWith('node:')) {
                    walk(join(dirname(file), spec));
                }
            }
        };
        walk(join(ROOT, 'scripts', 'looks-artifact.mjs'));
        assert.deepEqual([...seen].map((file) => file.slice(ROOT.length + 1)).sort(), [
            'scripts/looks-artifact.mjs',
            'scripts/looks-pin.mjs',
            'scripts/private-looks.mjs',
            'scripts/workshop-css.mjs',
            'src/domain/theme.ts',
        ]);
    });
});

describe('the-looks-artifact-is-the-pinned-tree-without-its-log', () => {
    const road = packedRoad();

    it('is a tar and a stamp, the stamp the pin byte for byte, and the tar the packed tree without the README, the log or a repository', () => {
        assert.deepEqual(readdirSync(road.artifact).sort(), [ARTIFACT_TAR, ARTIFACT_STAMP].sort());
        assert.equal(readFileSync(join(road.artifact, ARTIFACT_STAMP), 'latin1'), road.line);
        const tar = readFileSync(join(road.artifact, ARTIFACT_TAR));
        const paths = readArtifactTar(tar)
            .filter((member) => !member.dir)
            .map((member) => member.path)
            .sort();
        const packed = execFileSync('git', ['--no-replace-objects', 'ls-tree', '-r', '--name-only', road.out.tree], { cwd: join(road.work, 'looks'), encoding: 'utf8' })
            .trim()
            .split('\n')
            .sort();
        assert.deepEqual(paths, packed);
        for (const name of ['README.md', 'LOG.md', '.git']) {
            assert.ok(!paths.some((path) => path.split('/').includes(name)), name);
        }
        assert.ok(!tar.includes(LOG_WORDS), 'the design log left the runner');
    });

    /*
     * The `export-subst` plant (the 8c critic's measurement): archiving the
     * commit would write the author's mailbox and the subject into the tar,
     * and a pax header naming the commit; the tree id carries neither.
     */
    it('archives the tree id: no mailbox, no subject, the placeholder left as it is', () => {
        const tar = readFileSync(join(road.artifact, ARTIFACT_TAR));
        const ats = (bytes) => bytes.toString('latin1').split('@').length - 1;
        const own = readArtifactTar(tar).reduce((sum, member) => sum + (member.dir ? 0 : ats(member.data)), 0);
        assert.equal(ats(tar), own, 'an @ in the tar that no file of the look holds (a sheet’s own @media is the look’s)');
        assert.ok(!tar.includes(MAILBOX), 'the mailbox in the tar');
        assert.ok(!tar.includes(SUBJECT), 'the subject in the tar');
        assert.ok(tar.includes('$Format:%ae %s$'), 'the placeholder was substituted');
        const mutant = pack(road.work, { pin: road.out.commit, tree: road.out.tree, script: PACK_SCRIPT.replace('archive --format=tar "$tree"', 'archive --format=tar "$PIN"') });
        assert.equal(mutant.status, 0, mutant.stderr);
        const leaked = readFileSync(join(mutant.artifact, ARTIFACT_TAR));
        assert.ok(leaked.includes(MAILBOX) && leaked.includes(SUBJECT), 'archiving the commit leaks nothing here — the plant proves nothing');
        assert.throws(() => readArtifactTar(leaked), /neither a regular file nor a directory/, 'and the unwrap refuses a commit’s archive by its pax header');
    });

    it('reads the commit’s own bytes under a local replace ref, and the unwrap refuses a pack that did not', () => {
        const tar = readFileSync(join(road.artifact, ARTIFACT_TAR));
        assert.ok(!tar.includes(REPLACED), 'the replacement was archived');
        const mutant = pack(road.work, { pin: road.out.commit, tree: road.out.tree, script: PACK_SCRIPT.replace('git --no-replace-objects -C looks archive', 'git -C looks archive') });
        assert.equal(mutant.status, 0, mutant.stderr);
        assert.ok(readFileSync(join(mutant.artifact, ARTIFACT_TAR)).includes(REPLACED), 'without the flag the replacement is not archived — the plant proves nothing');
        assert.throws(() => unwrapLooksArtifact({ artifact: mutant.artifact, dest: join(scratchDir('replaced'), 'looks'), root: road.work }), /hash to tree/);
    });

    it('unwraps to a repository whose tree is the pinned tree, which the build reads, one commit for one pin', () => {
        const dest = join(scratchDir('unwrap'), 'looks');
        const result = unwrapLooksArtifact({ artifact: road.artifact, dest, root: road.work });
        assert.equal(result.commit, road.out.commit);
        assert.equal(result.tree, road.out.tree);
        const git = (...args) => execFileSync('git', args, { cwd: dest, env: gitEnv(dest), encoding: 'utf8' }).trim();
        assert.equal(git('rev-parse', 'HEAD'), result.carried);
        assert.equal(git('rev-parse', 'HEAD^{tree}'), road.out.tree);
        assert.equal(git('rev-parse', '--show-toplevel'), realpathSync(dest));
        assert.equal(git('status', '--porcelain', '--untracked-files=all'), '');
        assert.equal(git('log', '--format=%an <%ae> %at %s'), `Stall deploy <> 0 looks at ${road.out.commit}`);
        assert.equal(result.files, gitFilesAt({ dir: dest, commit: result.carried }).length);
        assert.match(unwrapLine(result), new RegExp(`^private looks: pinned commit ${road.out.commit.slice(0, 12)}, tree ${road.out.tree.slice(0, 12)} \\(its README and log left behind\\), carried as ${result.carried.slice(0, 12)}, ${result.files} files$`));
        return publicLookFacts().then((facts) => {
            const read = readPrivateLooksAt({ dir: dest, commit: result.carried, facts });
            assert.deepEqual(read.problems, []);
            assert.ok(read.files.some((file) => file.path === `${CANARY}/sheet.css`));
            const again = unwrapLooksArtifact({ artifact: road.artifact, dest: join(scratchDir('again'), 'looks'), root: road.work });
            assert.equal(again.carried, result.carried, 'one pin carries as one commit');
        });
    });

    it('runs from the command line, from the checkout root, and refuses there with exit 1', () => {
        const dest = join(scratchDir('cli'), 'looks');
        const cli = (...args) => spawnSync(process.execPath, [join(ROOT, 'scripts', 'looks-artifact.mjs'), ...args], { cwd: road.work, encoding: 'utf8' });
        const good = cli('unwrap', road.artifact, dest);
        assert.equal(good.status, 0, good.stderr);
        assert.match(good.stdout, /^private looks: pinned commit [0-9a-f]{12}, tree [0-9a-f]{12} \(its README and log left behind\), carried as [0-9a-f]{12}, \d+ files\n$/);
        const again = cli('unwrap', road.artifact, dest);
        assert.equal(again.status, 1);
        assert.match(again.stderr, /^looks-artifact: the destination is already there/);
        const usage = cli('pack', road.artifact, dest);
        assert.equal(usage.status, 1);
        assert.match(usage.stderr, /^looks-artifact: usage:/);
    });
});

/* A tar written as `git archive` writes one, member by member, with the fields a test turns. */
function header({ name, prefix = '', type = '0', size = 0, mode = type === '5' ? 0o775 : 0o664, magic = 'ustar\0', version = '00', linkname = '', checksum }) {
    const h = Buffer.alloc(512);
    const put = (at, length, value) => (Buffer.isBuffer(value) ? value : Buffer.from(value, 'latin1')).copy(h, at, 0, length);
    put(0, 100, name);
    put(100, 8, `${mode.toString(8).padStart(7, '0')}\0`);
    put(108, 8, '0000000\0');
    put(116, 8, '0000000\0');
    put(124, 12, `${size.toString(8).padStart(11, '0')}\0`);
    put(136, 12, '15261322200\0');
    h[156] = type.charCodeAt(0);
    put(157, 100, linkname);
    put(257, 6, magic);
    put(263, 2, version);
    put(265, 32, 'root');
    put(297, 32, 'root');
    put(345, 155, prefix);
    let sum = 0;
    for (let i = 0; i < 512; i += 1) {
        sum += i >= 148 && i < 156 ? 0x20 : h[i];
    }
    put(148, 8, `${(checksum ?? sum).toString(8).padStart(7, '0')}\0`);
    return h;
}

/** `members` (`{ name, data?, ...header fields }`) as a tar, data padded, closed by zero blocks to a multiple of 10240 as git closes one. */
function tarOf(members, { end = true } = {}) {
    const blocks = [];
    for (const member of members) {
        const data = member.data === undefined ? Buffer.alloc(0) : Buffer.from(member.data);
        blocks.push(header({ ...member, size: member.size ?? data.length }), data, Buffer.alloc((512 - (data.length % 512)) % 512));
    }
    let tar = Buffer.concat(blocks);
    if (end) {
        tar = Buffer.concat([tar, Buffer.alloc(1024)]);
        tar = Buffer.concat([tar, Buffer.alloc((10240 - (tar.length % 10240)) % 10240)]);
    }
    return tar;
}

describe('an-unwrapped-artifact-that-is-not-the-pinned-tree-is-refused', () => {
    const road = packedRoad();
    const goodTar = readFileSync(join(road.artifact, ARTIFACT_TAR));
    const members = readArtifactTar(goodTar);

    /** A copy of the good artifact, with `change(dir)` applied; answers its directory. */
    function artifactWith(change) {
        const dir = join(scratchDir('artifact'), ARTIFACT_DIR);
        cpSync(road.artifact, dir, { recursive: true });
        change(dir);
        return dir;
    }

    /** The unwrap of `artifact` refuses, matching `why`, naming none of `names`, and leaves no destination. */
    function refused(artifact, why, names = [], root = road.work, label = String(why)) {
        const parent = scratchDir('dest');
        const dest = join(parent, 'looks');
        assert.throws(
            () => unwrapLooksArtifact({ artifact, dest, root }),
            (error) => {
                assert.match(error.message, /^looks-artifact: /, label);
                assert.match(error.message, why, label);
                for (const name of names) {
                    assert.ok(!error.message.includes(name), `the refusal names ${name}: ${error.message}`);
                }
                return true;
            },
        );
        assert.deepEqual(readdirSync(parent), [], 'a refusal leaves nothing behind');
    }

    it('reads the good artifact as git archive wrote it, every member a file or a directory written before its files', () => {
        assert.ok(members.length >= 6);
        assert.ok(members.every((member) => /^[A-Za-z0-9._/-]+$/.test(member.path)));
        assert.deepEqual(readArtifactTar(tarOf(members.map((m) => ({ name: m.dir ? `${m.path}/` : m.path, type: m.dir ? '5' : '0', data: m.data })))).map((m) => m.path), members.map((m) => m.path), 'the test’s tar writer writes what git archive writes');
    });

    it('refuses a stamp that is not deploy/looks.commit byte for byte, and a pin it does not match', () => {
        const [commit, tree] = road.line.trim().split(' ');
        const flip = (hex) => hex.replace(/^./, (c) => (c === '0' ? '1' : '0'));
        refused(artifactWith((dir) => writeFileSync(join(dir, ARTIFACT_STAMP), `${flip(commit)} ${tree}\n`)), /was packed at .* and deploy\/looks\.commit pins/);
        refused(artifactWith((dir) => writeFileSync(join(dir, ARTIFACT_STAMP), `${commit} ${flip(tree)}\n`)), /was packed at/);
        for (const bad of [`${commit} ${tree}`, `${commit} ${tree}\r\n`, `${commit.toUpperCase()} ${tree}\n`, `${commit}\n`, `${commit} ${tree}\n\n`, `﻿${commit} ${tree}\n`, '']) {
            refused(artifactWith((dir) => writeFileSync(join(dir, ARTIFACT_STAMP), bad)), /is not a pin line/);
        }
        const root = scratchDir('root');
        mkdirSync(join(root, 'deploy'));
        writeFileSync(join(root, LOOKS_PIN_FILE), `${flip(commit)} ${tree}\n`);
        refused(road.artifact, /was packed at/, [], root);
        writeFileSync(join(root, LOOKS_PIN_FILE), `${commit} ${tree}`);
        assert.throws(() => unwrapLooksArtifact({ artifact: road.artifact, dest: join(root, 'looks'), root }), /deploy\/looks\.commit is 81 bytes/);
    });

    it('refuses an artifact that is not exactly a tar and a stamp, plain files', () => {
        refused(artifactWith((dir) => writeFileSync(join(dir, '.DS_Store'), 'x')), /holds 3 entries/);
        refused(artifactWith((dir) => rmSync(join(dir, ARTIFACT_TAR))), /holds 1 entries/);
        refused(artifactWith((dir) => rmSync(join(dir, ARTIFACT_STAMP))), /holds 1 entries/);
        refused(
            artifactWith((dir) => {
                writeFileSync(join(dir, 'real'), readFileSync(join(dir, ARTIFACT_STAMP)));
                rmSync(join(dir, ARTIFACT_STAMP));
                symlinkSync('real', join(dir, ARTIFACT_STAMP));
                rmSync(join(dir, 'real'));
            }),
            /not a plain file/,
        );
        refused(join(scratchDir('none'), 'missing'), /not a directory/);
    });

    /* A tar the pack could have written for another tree: the files hash to another tree, so nothing is carried. */
    it('refuses a tar whose files are not the pinned tree: a byte changed, a file missing, a file added, a mode moved', () => {
        const at = goodTar.indexOf('"schema"');
        assert.ok(at > 0);
        refused(artifactWith((dir) => writeFileSync(join(dir, ARTIFACT_TAR), Buffer.concat([goodTar.subarray(0, at), Buffer.from("'"), goodTar.subarray(at + 1)]))), /hash to tree/);
        const files = members.filter((m) => !m.dir);
        const as = (list) => list.map((m) => ({ name: m.dir ? `${m.path}/` : m.path, type: m.dir ? '5' : '0', data: m.data, mode: m.exec ? 0o775 : undefined }));
        refused(artifactWith((dir) => writeFileSync(join(dir, ARTIFACT_TAR), tarOf(as(members.filter((m) => m !== files.at(-1)))))), /hash to tree/);
        refused(artifactWith((dir) => writeFileSync(join(dir, ARTIFACT_TAR), tarOf([...as(members), { name: 'added.json', data: '{}\n' }]))), /hash to tree/, ['added']);
        refused(artifactWith((dir) => writeFileSync(join(dir, ARTIFACT_TAR), tarOf(as(members).map((m) => (m.name === files[0].path ? { ...m, mode: 0o775 } : m))))), /a mode that moved/);
        refused(artifactWith((dir) => writeFileSync(join(dir, ARTIFACT_TAR), tarOf([...as(members), { name: 'vacant/', type: '5' }]))), /empty directory/, ['vacant']);
    });

    /*
     * Every member a tar could carry that is not a plain relative file or a
     * directory, refused before anything is written — nothing lands beside
     * the destination, and the refusal names no member.
     */
    it('refuses a member that is a link, a device, a header, outside, or git’s own — before it writes anything', () => {
        const first = members.map((m) => ({ name: m.dir ? `${m.path}/` : m.path, type: m.dir ? '5' : '0', data: m.data }));
        const tars = [
            ['a .. member', [{ name: '../escape.json', data: 'x' }], /\.\. component/, ['escape']],
            ['a .. inside', [{ name: 'a/', type: '5' }, { name: 'a/../escape.json', data: 'x' }], /\.\. component/, ['escape']],
            ['an absolute member', [{ name: '/tmp/escape.json', data: 'x' }], /absolute/, ['escape', '/tmp']],
            ['a . member', [{ name: './index.json', data: 'x' }], /\. or \.\. component/, []],
            ['a symlink', [{ name: 'hosts', type: '2', linkname: '/etc/hosts' }], /neither a regular file nor a directory/, ['hosts', '/etc']],
            ['a hard link', [{ name: 'hardlink0', type: '1', linkname: 'index.json' }], /neither a regular file/, ['hardlink0']],
            ['a character device', [{ name: 'tty0', type: '3' }], /neither a regular file/, ['tty0']],
            ['a fifo', [{ name: 'pipe0', type: '6' }], /neither a regular file/, ['pipe0']],
            ['a pax global header', [{ name: 'pax_global_header', type: 'g', data: '52 comment=f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1\n' }], /pax or GNU header/, ['comment']],
            ['a pax header', [{ name: 'x.paxheader', type: 'x', data: '19 path=../escape\n' }, { name: 'x.data', data: 'x' }], /pax or GNU header/, ['escape']],
            ['a GNU long name', [{ name: '././@LongLink', type: 'L', data: 'escape\0' }, { name: 'x', data: 'x' }], /pax or GNU header/, ['escape']],
            ['a member named like the stamp', [{ name: ARTIFACT_STAMP, data: road.line }], /named pin/, []],
            ['a .git directory', [{ name: '.git/', type: '5' }, { name: '.git/config', data: '[core]\n' }], /\.git directory/, ['config']],
            ['a .GIT directory', [{ name: '.GIT/', type: '5' }], /\.git directory/, []],
            ['two members that fold to one', [{ name: 'Index.json', data: '{}' }, { name: 'index.json', data: '{}' }], /case folded/, ['ndex']],
            ['a member twice', [{ name: 'index.json', data: '{}' }, { name: 'index.json', data: '{}' }], /case folded/, ['ndex']],
            ['a file before its directory', [{ name: 'some/look.json', data: '{}' }], /did not write before it/, ['some']],
            ['a space in a name', [{ name: 'x y.json', data: '{}' }], /printable ASCII/, ['x y']],
            ['a non-ASCII name', [{ name: Buffer.from('café.json', 'utf8'), data: '{}' }], /printable ASCII/, ['caf']],
            ['a backslash', [{ name: 'a\\b.json', data: '{}' }], /outside letters/, ['a\\b']],
            ['a directory with a size', [{ name: 'd/', type: '5', size: 1, data: 'x' }], /directory member with a size/, []],
            ['a checksum that is wrong', [{ name: 'index.json', data: '{}', checksum: 1 }], /checksum is wrong/, []],
            ['an old GNU magic', [{ name: 'index.json', data: '{}', magic: 'ustar ', version: ' \0' }], /not ustar/, []],
        ];
        for (const [name, list, why, names] of tars) {
            refused(artifactWith((dir) => writeFileSync(join(dir, ARTIFACT_TAR), tarOf(list))), why, names, road.work, name);
        }
        const valid = tarOf(first);
        refused(artifactWith((dir) => writeFileSync(join(dir, ARTIFACT_TAR), tarOf(first, { end: false }))), /ends before its end-of-archive block/);
        refused(artifactWith((dir) => writeFileSync(join(dir, ARTIFACT_TAR), Buffer.concat([tarOf(first, { end: false }), Buffer.alloc(512)]))), /without two zero blocks/);
        refused(artifactWith((dir) => writeFileSync(join(dir, ARTIFACT_TAR), Buffer.concat([valid, Buffer.from('trailing'), Buffer.alloc(504)]))), /bytes after its end/);
        refused(artifactWith((dir) => writeFileSync(join(dir, ARTIFACT_TAR), valid.subarray(0, 700))), /whole 512-byte blocks/);
        refused(artifactWith((dir) => writeFileSync(join(dir, ARTIFACT_TAR), tarOf([{ name: 'index.json', data: 'x'.repeat(100), size: 4096 }], { end: false }))), /past the end/);
    });

    /*
     * The tree is checked twice: hashed here from the bytes on disk, and
     * written by git from the same files. A tree whose own attributes make
     * git store a file as other bytes than it holds — a CRLF file under
     * `* text` — passes the first and is refused by the second, so the
     * carried repository is never a tree other than the one pinned.
     */
    it('refuses files git would store as another tree than their bytes hash to', () => {
        const work = scratchDir('attributes');
        const env = gitEnv(work);
        const git = (args, input) => execFileSync('git', args, { cwd: work, env, input, encoding: 'utf8' }).trim();
        git(['init', '-q', '.']);
        const blob = (text) => git(['hash-object', '-w', '--stdin'], text);
        const tree = git(['mktree'], `100644 blob ${blob('* text\n')}\t.gitattributes\n100644 blob ${blob('a\r\nb\r\n')}\ta.txt\n`);
        const line = `${'c'.repeat(40)} ${tree}\n`;
        mkdirSync(join(work, 'deploy'));
        writeFileSync(join(work, LOOKS_PIN_FILE), line);
        const artifact = join(work, ARTIFACT_DIR);
        mkdirSync(artifact);
        writeFileSync(join(artifact, ARTIFACT_STAMP), line);
        writeFileSync(join(artifact, ARTIFACT_TAR), tarOf([{ name: '.gitattributes', data: '* text\n' }, { name: 'a.txt', data: 'a\r\nb\r\n' }]));
        refused(artifact, /git writes the unwrapped files as tree/, [], work);
    });

    it('never writes into a destination that is already there, a link to one included', () => {
        const parent = scratchDir('there');
        const dest = join(parent, 'looks');
        mkdirSync(dest);
        writeFileSync(join(dest, 'kept'), 'k');
        assert.throws(() => unwrapLooksArtifact({ artifact: road.artifact, dest, root: road.work }), /the destination is already there/);
        assert.deepEqual(readdirSync(dest), ['kept'], 'what was there stands');
        const linkParent = scratchDir('link');
        const target = scratchDir('target');
        symlinkSync(target, join(linkParent, 'looks'));
        assert.throws(() => unwrapLooksArtifact({ artifact: road.artifact, dest: join(linkParent, 'looks'), root: road.work }), /the destination is already there/);
        assert.deepEqual(readdirSync(target), []);
        symlinkSync(join(linkParent, 'nowhere'), join(linkParent, 'dangling'));
        assert.throws(() => unwrapLooksArtifact({ artifact: road.artifact, dest: join(linkParent, 'dangling'), root: road.work }), /the destination is already there/);
    });
});

/*
 * The 8c2 critic's item 5: the unwrap's git reads no global or system
 * setting — config or attributes — and takes none from the environment
 * that would change what it carries. Each plant is shown to bite first
 * (a git that reads it does something it should not), then the unwrap,
 * handed the same plant, carries exactly the pinned tree and leaves the
 * plant untouched. Git here offers no variable to move the system
 * attributes file (`git var GIT_ATTR_SYSTEM` stays `/etc/gitattributes`,
 * which needs root to write), so that plant is a stand-in: a `git` that
 * reads a planted file as its system attributes unless `GIT_ATTR_NOSYSTEM`
 * is true, the variable git's own documentation names, handed to the
 * unwrap as its git.
 */
describe('the-carried-repository-reads-no-global-or-system-git-setting', () => {
    /** An artifact whose pinned tree stores a CRLF file as it is — what a `* text` attribute read on add would change. */
    function crlfArtifact() {
        const work = scratchDir('settings');
        const env = gitEnv(work);
        const git = (args, input) => execFileSync('git', args, { cwd: work, env, input, encoding: 'utf8' }).trim();
        git(['init', '-q', '.']);
        const blob = (text) => git(['hash-object', '-w', '--stdin'], text);
        const tree = git(['mktree'], `100644 blob ${blob('{}\n')}\tindex.json\n100644 blob ${blob(CRLF)}\tnotes.txt\n`);
        const line = `${'c'.repeat(40)} ${tree}\n`;
        mkdirSync(join(work, 'deploy'));
        writeFileSync(join(work, LOOKS_PIN_FILE), line);
        const artifact = join(work, ARTIFACT_DIR);
        mkdirSync(artifact);
        writeFileSync(join(artifact, ARTIFACT_STAMP), line);
        writeFileSync(join(artifact, ARTIFACT_TAR), tarOf([{ name: 'index.json', data: '{}\n' }, { name: 'notes.txt', data: CRLF }]));
        return { work, artifact, tree };
    }
    const CRLF = 'a\r\nb\r\n';

    /** The unwrap of `art` under `env` (and `git`), which must carry the pinned tree. */
    function carries(art, env, git) {
        const dest = join(scratchDir('carried'), 'looks');
        const result = unwrapLooksArtifact({ artifact: art.artifact, dest, root: art.work, env, git });
        assert.equal(result.tree, art.tree);
        return result;
    }

    /** `env` with `names` taken out — a variable a test plants must not be shadowed by one the runner's shell carries. */
    const minus = (env, ...names) => {
        const out = { ...env };
        for (const name of names) {
            delete out[name];
        }
        return out;
    };

    /** The blob `git add` stores for the CRLF file in a fresh repository under `env` (and `git`, and `args` before `add`). */
    function storedUnder(env, git = 'git', args = []) {
        const dir = scratchDir('stored');
        execFileSync('git', ['init', '-q', '.'], { cwd: dir, env });
        writeFileSync(join(dir, 'notes.txt'), CRLF);
        execFileSync(git, [...args, 'add', 'notes.txt'], { cwd: dir, env, stdio: 'ignore' });
        return execFileSync('git', ['rev-parse', ':notes.txt'], { cwd: dir, env, encoding: 'utf8' }).trim();
    }
    const raw = () => execFileSync('git', ['hash-object', '--stdin'], { input: CRLF, encoding: 'utf8' }).trim();

    it('reads neither the system nor the global config: a trace2 target planted in each is never written', () => {
        const art = crlfArtifact();
        const dir = scratchDir('config');
        const systemMark = join(dir, 'system-trace');
        const globalMark = join(dir, 'global-trace');
        const system = join(dir, 'system-config');
        writeFileSync(system, `[trace2]\n\tnormalTarget = ${systemMark}\n`);
        const home = join(dir, 'home');
        mkdirSync(join(home, '.config', 'git'), { recursive: true });
        writeFileSync(join(home, '.gitconfig'), `[trace2]\n\tnormalTarget = ${globalMark}\n`);
        writeFileSync(join(home, '.config', 'git', 'config'), `[trace2]\n\tnormalTarget = ${globalMark}\n`);
        const base = minus(process.env, 'GIT_CONFIG_GLOBAL', 'GIT_CONFIG_NOSYSTEM', 'GIT_CONFIG_SYSTEM', 'GIT_TRACE2', 'GIT_TRACE2_EVENT', 'GIT_TRACE2_PERF');
        const planted = { ...base, HOME: home, XDG_CONFIG_HOME: join(home, '.config'), GIT_CONFIG_SYSTEM: system };
        // The plants bite: a git that reads the system config, or the global one, writes its trace.
        execFileSync('git', ['version'], { env: { ...planted, GIT_CONFIG_GLOBAL: '/dev/null' }, stdio: 'ignore' });
        assert.ok(existsSync(systemMark), 'a git that reads the system config does not trace — the plant proves nothing');
        execFileSync('git', ['version'], { env: { ...planted, GIT_CONFIG_NOSYSTEM: '1' }, stdio: 'ignore' });
        assert.ok(existsSync(globalMark), 'a git that reads the global config does not trace — the plant proves nothing');
        rmSync(systemMark);
        rmSync(globalMark);
        carries(art, planted);
        assert.ok(!existsSync(systemMark), 'the unwrap read the system config');
        assert.ok(!existsSync(globalMark), 'the unwrap read the global config');
    });

    it('reads neither the system nor the global attributes: a CRLF file under a planted `* text` is carried as its bytes', () => {
        const art = crlfArtifact();
        const dir = scratchDir('attributes');
        const text = join(dir, 'text-attributes');
        writeFileSync(text, '* text\n');
        // The global attributes file: `$XDG_CONFIG_HOME/git/attributes`, read whatever `GIT_CONFIG_GLOBAL` says.
        const home = join(dir, 'home');
        mkdirSync(join(home, '.config', 'git'), { recursive: true });
        writeFileSync(join(home, '.config', 'git', 'attributes'), '* text\n');
        const base = { ...minus(process.env, 'GIT_ATTR_NOSYSTEM', 'GIT_ATTR_SOURCE'), GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' };
        const globalPlant = { ...base, HOME: home, XDG_CONFIG_HOME: join(home, '.config') };
        assert.notEqual(storedUnder(globalPlant), raw(), 'a git that reads the global attributes stores the bytes anyway — the plant proves nothing');
        carries(art, globalPlant);
        // The system attributes file, by its stand-in: a git that reads `text` as its system file unless GIT_ATTR_NOSYSTEM is true.
        const realGit = execFileSync('sh', ['-c', 'command -v git'], { encoding: 'utf8' }).trim();
        const wrapper = join(dir, 'git');
        writeFileSync(
            wrapper,
            [
                '#!/bin/bash',
                '# A git whose system attributes file is $PLANT_SYSTEM_ATTRIBUTES, read unless GIT_ATTR_NOSYSTEM is true.',
                'pre=()',
                'while [ $# -gt 0 ]; do',
                '  case "$1" in',
                '    -c) pre+=("$1" "$2"); shift 2 ;;',
                '    --*) pre+=("$1"); shift ;;',
                '    *) break ;;',
                '  esac',
                'done',
                'case "$(printf %s "${GIT_ATTR_NOSYSTEM:-}" | tr "[:upper:]" "[:lower:]")" in',
                '  1|true|yes|on) exec "$REAL_GIT" ${pre[@]+"${pre[@]}"} "$@" ;;',
                'esac',
                'exec "$REAL_GIT" ${pre[@]+"${pre[@]}"} -c "core.attributesFile=$PLANT_SYSTEM_ATTRIBUTES" "$@"',
                '',
            ].join('\n'),
        );
        chmodSync(wrapper, 0o755);
        const systemPlant = { ...base, REAL_GIT: realGit, PLANT_SYSTEM_ATTRIBUTES: text };
        assert.notEqual(storedUnder(systemPlant, wrapper, ['-c', 'core.attributesFile=/dev/null']), raw(), 'the stand-in reads no system attributes — the plant proves nothing');
        assert.equal(storedUnder({ ...systemPlant, GIT_ATTR_NOSYSTEM: '1' }, wrapper), raw(), 'the stand-in reads its system attributes under GIT_ATTR_NOSYSTEM');
        carries(art, systemPlant, wrapper);
    });

    it('takes from the environment nothing that changes what it carries: GIT_DEFAULT_HASH, GIT_ATTR_SOURCE', () => {
        const art = crlfArtifact();
        const base = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' };
        const dir = scratchDir('hash');
        execFileSync('git', ['init', '-q', '.'], { cwd: dir, env: { ...base, GIT_DEFAULT_HASH: 'sha256' } });
        assert.equal(execFileSync('git', ['rev-parse', '--show-object-format'], { cwd: dir, encoding: 'utf8' }).trim(), 'sha256', 'GIT_DEFAULT_HASH does not move git init — the plant proves nothing');
        carries(art, { ...base, GIT_DEFAULT_HASH: 'sha256' });
        assert.throws(() => storedUnder({ ...base, GIT_ATTR_SOURCE: 'HEAD' }), undefined, 'GIT_ATTR_SOURCE=HEAD in a fresh repository does not stop git add — the plant proves nothing');
        carries(art, { ...base, GIT_ATTR_SOURCE: 'HEAD' });
    });
});

/*
 * (c′) made mechanical (the owner's call on the 8c2 critic's item 1): until
 * a look is sold, only the looks `PREVIEW_SLUGS` names travel — the pack's
 * slug gate and `pinLineFor` both read that list. This holds the list to
 * its literal value, and goes red the day `RELEASED_LOOK_IDS` names an id,
 * read from the theme table by type stripping (`publicLookFacts`): a
 * release carries a private look, and the release commit must then decide
 * the preview road and rewrite this rule, never inherit it.
 */
describe('a-preview-carries-only-the-preview-slugs-until-a-release', () => {
    it('is the canary alone, frozen, and the pack’s slug gate is that list', () => {
        assert.deepEqual([...PREVIEW_SLUGS], ['canary']);
        assert.ok(Object.isFrozen(PREVIEW_SLUGS));
        assert.ok(PACK_ALLOW_PROGRAM.includes('\n  s = p[1] == "canary"\n'));
    });

    it('holds while RELEASED_LOOK_IDS is empty, and says what to do the day it is not', async () => {
        const { released } = await publicLookFacts();
        const why = previewRoadProblem(released);
        assert.equal(why, undefined, why);
        assert.equal(
            previewRoadProblem([0x04]),
            "a release carries a private look: step 9 rewrites the preview road and this rule (PREVIEW_SLUGS, the pack's slug gate, pinLineFor)",
        );
        assert.throws(() => previewRoadProblem(undefined), /RELEASED_LOOK_IDS/);
    });
});
