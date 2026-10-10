import { strict as assert } from 'node:assert';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
    LOOKS_PIN_BYTES,
    LOOKS_PIN_FILE,
    PACKED_OUT,
    PACKED_TREE_SCRIPT,
    PIN_SCRIPT,
    looksPinCommand,
    packedTreeOf,
    pinLineFor,
    pinProblem,
    readLooksPin,
} from './looks-pin.mjs';
import { plantCanary, plantLooks, removePlants } from './private-looks-plant.mjs';
import { CANARY_COMMIT, CANARY_TREE, PREVIEW_SLUGS, publicLookFacts } from './private-looks.mjs';

/**
 * The pin (`scripts/looks-pin.mjs`, step 8c1): `deploy/looks.commit` is read
 * the same way by the deploy workflow's shell and by every script, and the
 * packed tree it pins is computed the same way by both.
 *
 * The shell runs as the workflow runs a `shell: bash` step — `bash
 * --noprofile --norc -eo pipefail <file>` — with `$GITHUB_OUTPUT` pointed at
 * a scratch file (the 8c critic's item 7: a script proved under another
 * shell is proved under a shell production does not use). Over scratch
 * directories and repositories outside this checkout, and the tracked pin;
 * never over a `looks/` clone that may or may not be on this disk. Git runs
 * locally and only locally.
 *
 * `node --test`: a TypeScript test importing an `.mjs` breaks `tsc` (TS7016).
 */
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const scratch = [];
after(() => {
    for (const dir of scratch) {
        rmSync(dir, { recursive: true, force: true });
    }
});

/** A fresh directory outside this checkout, removed after the file's tests. */
function scratchDir(name) {
    const dir = realpathSync(mkdtempSync(join(tmpdir(), `stall-looks-pin-${name}-`)));
    scratch.push(dir);
    return dir;
}

/**
 * `script` run as a `shell: bash` step: written to a file, run by `bash
 * --noprofile --norc -eo pipefail` in `cwd`, `$GITHUB_OUTPUT` a fresh empty
 * file. Answers the exit status, what it wrote to `$GITHUB_OUTPUT`, and its
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
        env: { PATH: process.env.PATH, HOME: dir, GITHUB_OUTPUT: output, ...env },
        encoding: 'utf8',
    });
    return { status: run.status, output: readFileSync(output, 'utf8'), stdout: run.stdout, stderr: run.stderr };
}

/** A directory holding `bytes` as its `deploy/looks.commit` — or no pin at all for `undefined`. */
function pinIn(bytes) {
    const dir = scratchDir('pin');
    mkdirSync(join(dir, 'deploy'));
    if (bytes !== undefined) {
        writeFileSync(join(dir, LOOKS_PIN_FILE), bytes);
    }
    return dir;
}

const C = '0123456789abcdef0123456789abcdef01234567';
const T = 'fedcba9876543210fedcba9876543210fedcba98';
const GOOD = `${C} ${T}\n`;

/** What the shape check prints when it refuses, last: `refuse()`'s sentence. */
const REFUSED = `${LOOKS_PIN_FILE} is not one commit and its packed tree: two runs of 40 lower-case hex, one space, one newline, ${LOOKS_PIN_BYTES} bytes, a plain file\n`;

/** What the commit gate prints when it refuses: no shape plant may print it. */
const GATED = "the pin names another commit than the canary's (CANARY_COMMIT): until a release a preview fetches that commit and no other\n";

/**
 * `PIN_SCRIPT` without its commit gate (the step 8g-pre critic's item 2):
 * the shape tests run it, so a plant whose commit half is malformed is
 * refused by the shape or not at all — run whole, the gate refuses every
 * commit but one, and a widened shape for the commit half passed every
 * shape test unseen. The gate's own tests run `PIN_SCRIPT` itself.
 */
function withoutGate(script = PIN_SCRIPT) {
    const lines = script.split('\n');
    const kept = lines.filter((line) => !line.includes(CANARY_COMMIT));
    assert.equal(kept.length, lines.length - 1, 'the pin step names the canary commit on one line');
    return kept.join('\n');
}

/**
 * A step's refusal is the shape's: its last line is `refuse()`'s sentence
 * (bash may print its own words before it — a missing file, or bash 4.4's
 * warning that command substitution dropped a NUL), and the gate's never.
 */
function refusedByShape(step, name) {
    assert.ok(step.stderr.endsWith(REFUSED), `${name}: not refused by the shape check: ${JSON.stringify(step.stderr)}`);
    assert.ok(!step.stderr.includes(GATED), `${name}: refused by the commit gate`);
}

/**
 * Every pin both readers refuse: the 8c critic's item 8 (a `$(cat …)` strips
 * every trailing newline, so the shell alone read "no final newline" and
 * "two newlines" as good) and V3's list, plus what command substitution
 * drops silently (a NUL) and the shapes that keep 82 bytes.
 */
const PLANTS = [
    ['no final newline', `${C} ${T}`],
    ['two newlines', `${C} ${T}\n\n`],
    ['a CRLF', `${C} ${T}\r\n`],
    ['a BOM', `﻿${C} ${T}\n`],
    ['upper case', `${C.toUpperCase()} ${T}\n`],
    ['upper case in the tree', `${C} ${T.toUpperCase()}\n`],
    ['a trailing space', `${C} ${T} \n`],
    ['a tab for the space', `${C}\t${T}\n`],
    ['a newline for the space', `${C}\n${T}\n`],
    ['two spaces, still 82 bytes', `${C}  ${T.slice(1)}\n`],
    ['a NUL for the newline', `${C} ${T}\0`],
    ['one hash only', `${C}\n`],
    ['three hashes', `${C} ${T} ${C}\n`],
    ['39 hex then 41', `${C.slice(1)} ${T}a\n`],
    ['41 hex then 39', `${C}a ${T.slice(1)}\n`],
    ['39 hex', `${C.slice(1)} ${T}\n`],
    ['41 hex', `${C} ${T}0\n`],
    ['not hex', `${C.slice(0, -1)}g ${T}\n`],
    ['empty', ''],
];

describe('the-pin-is-read-the-same-way-by-the-shell-and-the-scripts', () => {
    it('accepts the tracked pin, and the shell writes the two hashes the script reads, once', () => {
        const pin = readLooksPin(ROOT);
        assert.match(pin.commit, /^[0-9a-f]{40}$/);
        assert.match(pin.tree, /^[0-9a-f]{40}$/);
        assert.equal(readFileSync(join(ROOT, LOOKS_PIN_FILE)).length, LOOKS_PIN_BYTES);
        const step = runStep(PIN_SCRIPT, ROOT);
        assert.equal(step.status, 0, step.stderr);
        assert.equal(step.output, `commit=${pin.commit}\ntree=${pin.tree}\n`);
    });

    it('accepts a well-formed pin both ways', () => {
        const dir = pinIn(GOOD);
        assert.equal(pinProblem(Buffer.from(GOOD)), undefined);
        assert.deepEqual(readLooksPin(dir), { commit: C, tree: T });
        const step = runStep(withoutGate(), dir);
        assert.equal(step.status, 0, step.stderr);
        assert.equal(step.output, `commit=${C}\ntree=${T}\n`);
    });

    it('refuses every plant both ways, and the shell writes nothing and names no hash', () => {
        for (const [name, text] of [...PLANTS, ['no pin at all', undefined]]) {
            const dir = pinIn(text);
            assert.throws(() => readLooksPin(dir), /deploy\/looks\.commit/, `readLooksPin admits ${name}`);
            const step = runStep(withoutGate(), dir);
            assert.notEqual(step.status, 0, `the shell admits ${name}`);
            assert.equal(step.output, '', `the shell wrote an output over ${name}`);
            assert.doesNotMatch(step.stdout + step.stderr, /[0-9a-f]{40}/, `the shell printed a hash over ${name}`);
            refusedByShape(step, name);
            // The whole step refuses it at the shape too, before the gate is reached.
            const whole = runStep(PIN_SCRIPT, dir);
            assert.notEqual(whole.status, 0, `the whole step admits ${name}`);
            refusedByShape(whole, `${name}, the whole step`);
        }
    });

    it('opens with set -euo pipefail, refuses a link and counts the bytes before it reads, and writes $GITHUB_OUTPUT in one place', () => {
        assert.ok(PIN_SCRIPT.startsWith(`set -euo pipefail\npin=${LOOKS_PIN_FILE}\n`), 'safe under any bash invocation, not only under shell: bash');
        assert.ok(PIN_SCRIPT.indexOf('-L "$pin"') < PIN_SCRIPT.indexOf('wc -c'), 'a link is refused before wc reads through it');
        assert.ok(PIN_SCRIPT.indexOf('wc -c') < PIN_SCRIPT.indexOf('cat "$pin"'), 'the byte count is first: it bounds what $(cat …) reads');
        assert.equal(PIN_SCRIPT.split('GITHUB_OUTPUT').length - 1, 1);
        assert.doesNotMatch(PIN_SCRIPT, /\n\s*\n/, 'no blank line: the workflow grammar holds a run: | block as it is');
    });

    it('refuses a pin that is a link, both ways, and the tracked pin is a plain file in git', () => {
        const dir = pinIn(undefined);
        writeFileSync(join(dir, 'deploy', 'real'), GOOD);
        symlinkSync('real', join(dir, LOOKS_PIN_FILE));
        assert.throws(() => readLooksPin(dir), /not a plain file/);
        const step = runStep(withoutGate(), dir);
        assert.notEqual(step.status, 0, 'the shell admits a link');
        refusedByShape(step, 'a link');
        assert.equal(step.output, '');
        const tracked = execFileSync('git', ['ls-files', '-s', '--', LOOKS_PIN_FILE], { cwd: ROOT, encoding: 'utf8' });
        assert.match(tracked, /^100644 [0-9a-f]{40} 0\tdeploy\/looks\.commit\n$/, 'deploy/looks.commit is tracked as a plain, non-executable file');
    });

    it('stops on an unset $GITHUB_OUTPUT, writing nothing anywhere', () => {
        const dir = pinIn(GOOD);
        const file = join(scratchDir('unset'), 'step.sh');
        writeFileSync(file, withoutGate());
        const run = spawnSync('bash', [file], { cwd: dir, env: { PATH: process.env.PATH }, encoding: 'utf8' });
        assert.notEqual(run.status, 0, 'an unset $GITHUB_OUTPUT is not a file named ""');
    });

    /*
     * The two checks after the byte count are each load-bearing, proved by
     * taking one out: without the shape, upper case passes (the whole-file
     * compare rebuilds the line from the same characters); without the
     * compare, a NUL where the newline goes passes ($(cat …) drops it, and
     * the line then has the shape). The byte count is the first, cheap
     * refusal — it bounds what $(cat …) reads — and the compare alone would
     * hold every length plant: not provable red, and said so.
     */
    it('needs its shape check and its whole-file compare: without either, a plant gets through', () => {
        const without = (needle, script) => {
            const lines = script.split('\n');
            const at = lines.findIndex((line) => line.includes(needle));
            assert.ok(at >= 0, needle);
            return [...lines.slice(0, at), ...lines.slice(at + 1)].join('\n');
        };
        const noShape = runStep(without('=~ $shape', withoutGate()), pinIn(`${C.toUpperCase()} ${T}\n`));
        assert.equal(noShape.status, 0, 'without the shape check, upper case is refused anyway — the plant proves nothing');
        const noCompare = runStep(without('cmp -s', withoutGate()), pinIn(`${C} ${T}\0`));
        assert.equal(noCompare.status, 0, 'without the whole-file compare, a NUL is refused anyway — the plant proves nothing');
        assert.equal(noCompare.output, `commit=${C}\ntree=${T}\n`);
    });
});

/*
 * The commit gate (step 8g-pre; the 8g plan's v2.4, its critic's N2 and
 * N3): until a release the pin's commit half is the canary's
 * (`CANARY_COMMIT`) and no other. The deploy workflow's private checkout
 * runs between the pin step and the pack and prints the commit's subject,
 * so a hand-edited pin naming another commit of the private repository
 * beside the canary's tree used to fetch that commit onto a public runner
 * before the pack's tree check refused it. The gate is a line of its own
 * in `PIN_SCRIPT`, written from the constant (as the pack's first line is
 * from `CANARY_TREE`), after the shape and before the outputs; the shape
 * readers `readLooksPin` and `pinProblem` stay without it, since the
 * harness's pinned-pair reads share them over planted canaries; and
 * `pinLineFor` requires the commit and the tree at once.
 */
describe('the-pin-step-fetches-only-the-canary-commit', () => {
    after(removePlants);
    const OTHER = '89abcdef0123456789abcdef0123456789abcdef';
    const GATE = "the pin names another commit than the canary's (CANARY_COMMIT): until a release a preview fetches that commit and no other\n";
    let facts;
    before(async () => {
        facts = await publicLookFacts();
    });

    it('is the literal, pinned by value, and the tracked pin names it', () => {
        assert.equal(CANARY_COMMIT, '760237c8e9f246c7b7f28a8a91ce933832100930');
        assert.equal(readLooksPin(ROOT).commit, CANARY_COMMIT);
    });

    it('is a line of its own, written from the constant, after the shape is read and before the outputs are written', () => {
        const lines = PIN_SCRIPT.split('\n');
        const gate = `[ "$commit" = "${CANARY_COMMIT}" ] || { echo "${GATE.slice(0, -1)}" >&2; exit 1; }`;
        assert.equal(lines.filter((line) => line === gate).length, 1, 'the gate, one line, as the constant writes it');
        assert.equal(PIN_SCRIPT.split(CANARY_COMMIT).length, 2, 'the pin step names the canary commit once');
        const at = (needle) => lines.findIndex((line) => line.includes(needle));
        assert.ok(at('cmp -s') < lines.indexOf(gate), 'after the whole-file compare: the shape is read whole first, as readLooksPin reads it');
        assert.ok(lines.indexOf(gate) < at('GITHUB_OUTPUT'), 'before the one write the private checkout reads');
        assert.doesNotMatch(GATE, /[0-9a-f]{40}|deploy\/|looks\.commit/, 'its refusal names no hash and no path');
    });

    it('refuses a pin whose tree is the canary’s and whose commit is another, writing nothing, and readLooksPin still reads its shape', () => {
        const pin = `${OTHER} ${CANARY_TREE}\n`;
        const dir = pinIn(pin);
        const step = runStep(PIN_SCRIPT, dir);
        assert.equal(step.status, 1);
        assert.equal(step.stderr, GATE);
        assert.equal(step.stdout, '');
        assert.equal(step.output, '', 'no output: the checkout has no commit to fetch');
        assert.equal(pinProblem(Buffer.from(pin)), undefined, 'the shape reader admits it: the gate is not pinProblem’s');
        assert.deepEqual(readLooksPin(dir), { commit: OTHER, tree: CANARY_TREE }, 'nor readLooksPin’s');
    });

    it('needs its gate line: without it, that pin is written to the outputs', () => {
        const lines = PIN_SCRIPT.split('\n');
        const open = lines.filter((line) => !line.includes(CANARY_COMMIT)).join('\n');
        assert.equal(open.split('\n').length, lines.length - 1);
        const step = runStep(open, pinIn(`${OTHER} ${CANARY_TREE}\n`));
        assert.equal(step.status, 0, 'without the gate the pin is refused anyway — the plant proves nothing');
        assert.equal(step.output, `commit=${OTHER}\ntree=${CANARY_TREE}\n`);
    });

    it('reads the commit half alone: the canary’s commit beside another tree passes it, for the pack’s first line to refuse', () => {
        const step = runStep(PIN_SCRIPT, pinIn(`${CANARY_COMMIT} ${T}\n`));
        assert.equal(step.status, 0, step.stderr);
        assert.equal(step.output, `commit=${CANARY_COMMIT}\ntree=${T}\n`);
    });

    it('keeps the gate out of the shape readers the harness’s pinned-pair reads share', () => {
        for (const fn of [pinProblem, readLooksPin]) {
            assert.doesNotMatch(String(fn), /CANARY/, `${fn.name} reads the canary's commit`);
        }
    });

    it('refuses, in pinLineFor, a canary planted under another commit for its commit alone, and admits it when that is the commit it is told', async () => {
        const looks = plantCanary();
        assert.equal(packedTreeOf({ dir: looks.dir, commit: looks.head(), env: looks.env }), CANARY_TREE, 'the plant: the canary’s own tree');
        await assert.rejects(pinLineFor({ dir: looks.dir, env: looks.env, facts }), (error) => {
            const problems = error.message.split('\n').slice(1);
            return problems.length === 1 && problems[0].startsWith(`  - it is not CANARY_COMMIT ${CANARY_COMMIT.slice(0, 12)}, the canary's commit`);
        });
        assert.equal(await pinLineFor({ dir: looks.dir, env: looks.env, facts, canaryCommit: looks.head() }), `${looks.head()} ${CANARY_TREE}\n`);
    });

    it('requires both literals at once: the canary’s commit with another tree is said to be the two literals drifting apart', async () => {
        const looks = plantLooks(undefined, {}, { slug: PREVIEW_SLUGS[0] });
        await assert.rejects(pinLineFor({ dir: looks.dir, env: looks.env, facts, canaryCommit: looks.head() }), (error) => {
            const problems = error.message.split('\n').slice(1);
            return problems.length === 1 && problems[0].includes('is not CANARY_TREE') && problems[0].includes('the commit is CANARY_COMMIT: the two literals no longer name one canary');
        });
        await assert.rejects(pinLineFor({ dir: looks.dir, env: looks.env, facts }), (error) => {
            const problems = error.message.split('\n').slice(1);
            return problems.length === 2 && !error.message.includes('the two literals');
        }, 'another commit with another tree is refused for both, and is no drift');
    });

    it('refuses a canary commit that is not a full commit', async () => {
        const looks = plantCanary();
        for (const canaryCommit of [looks.head().slice(0, 12), looks.head().toUpperCase(), 'HEAD', '']) {
            await assert.rejects(pinLineFor({ dir: looks.dir, env: looks.env, facts, canaryCommit }), /the canary's commit is a full commit/, canaryCommit);
        }
    });
});

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
 * A repository at `<scratch>/looks` holding `files` (`{ path: text }`, or `{
 * path: { text, exec } | { link } }`), `gitlinks` (`{ path: commit }`) and
 * `blobs` (`{ path: text }`, put in git's index alone — a name this disk
 * folds into another, like `readme.md` beside `README.md` on a
 * case-insensitive one), committed once. Answers the scratch directory the
 * workflow's shell runs in, the repository, its HEAD and git.
 */
function looksRepo(files, gitlinks = {}, blobs = {}) {
    const work = scratchDir('repo');
    const dir = join(work, 'looks');
    mkdirSync(dir);
    const env = gitEnv(work);
    const git = (...args) => execFileSync('git', args, { cwd: dir, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    git('init', '-q', '-b', 'main', '.');
    for (const [path, spec] of Object.entries(files)) {
        mkdirSync(join(dir, dirname(path)), { recursive: true });
        if (typeof spec === 'object' && spec.link !== undefined) {
            symlinkSync(spec.link, join(dir, path));
            continue;
        }
        writeFileSync(join(dir, path), typeof spec === 'string' ? spec : spec.text);
        if (typeof spec === 'object' && spec.exec) {
            chmodSync(join(dir, path), 0o755);
        }
    }
    git('add', '-A');
    for (const [path, commit] of Object.entries(gitlinks)) {
        git('update-index', '--add', '--cacheinfo', `160000,${commit},${path}`);
    }
    for (const [path, text] of Object.entries(blobs)) {
        const blob = execFileSync('git', ['hash-object', '-w', '--stdin'], { cwd: dir, env, input: text, encoding: 'utf8' }).trim();
        git('update-index', '--add', '--cacheinfo', `100644,${blob},${path}`);
    }
    git('commit', '-q', '-m', 'planted');
    return { work, dir, env, git, head: git('rev-parse', 'HEAD') };
}

/** The tree `PACKED_TREE_SCRIPT` computes for `repo`'s HEAD, run as the workflow runs it. */
function shellTree(repo) {
    const step = runStep(`set -euo pipefail\nPIN=${repo.head}\n${PACKED_TREE_SCRIPT}\nprintf '%s' "$tree"\n`, repo.work, {
        GIT_CONFIG_GLOBAL: '/dev/null',
        GIT_CONFIG_NOSYSTEM: '1',
    });
    assert.equal(step.status, 0, step.stderr);
    assert.match(step.stdout, /^[0-9a-f]{40}$/);
    return step.stdout;
}

const LOOK = { 'index.json': '{}\n', 'a-look/look.json': '{}\n', 'a-look/sheet.css': '.t-a-look {}\n', 'a-look/art/x.svg': '<svg/>\n' };

describe('the-packed-tree-is-the-same-in-the-shell-and-the-scripts', () => {
    it('leaves the root README and design log out, computed by both, and the script writes no object', () => {
        const repo = looksRepo({ ...LOOK, 'README.md': 'what this is\n', 'LOG.md': 'design notes\n' });
        const tree = packedTreeOf({ dir: repo.dir, commit: repo.head, env: repo.env });
        assert.throws(() => repo.git('cat-file', '-e', tree), undefined, 'packedTreeOf wrote the tree into the clone');
        assert.equal(shellTree(repo), tree);
        assert.equal(repo.git('cat-file', '-t', tree), 'tree');
        assert.deepEqual(repo.git('ls-tree', '-r', '--name-only', tree).split('\n').sort(), Object.keys(LOOK).sort());
        assert.notEqual(tree, repo.git('rev-parse', 'HEAD^{tree}'));
    });

    it('is the commit’s own tree when there is no README or log to leave out', () => {
        const repo = looksRepo(LOOK);
        const tree = packedTreeOf({ dir: repo.dir, commit: repo.head, env: repo.env });
        assert.equal(tree, repo.git('rev-parse', 'HEAD^{tree}'));
        assert.equal(shellTree(repo), tree);
    });

    it('leaves out the root names exactly, and agrees on every mode and every name git quotes', () => {
        const repo = looksRepo(
            {
                ...LOOK,
                'README.md': 'r\n',
                'LOG.md': 'l\n',
                'LOG.MD.txt': 'kept\n',
                'a-look/README.md': 'kept: the filter reads the root alone\n',
                'a-look/LOG.md': 'kept\n',
                'run.sh': { text: '#!/bin/sh\n', exec: true },
                'hosts': { link: '/etc/hosts' },
                'tab\there': 'a name git quotes\n',
                'line\nbreak': 'a name git quotes\n',
                'café.txt': 'a name git quotes\n',
                '"quoted"': 'a name git quotes\n',
            },
            { sub: 'f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1' },
            { 'readme.md': 'kept: the filter is exact\n', 'Log.md': 'kept\n' },
        );
        const tree = packedTreeOf({ dir: repo.dir, commit: repo.head, env: repo.env });
        assert.equal(shellTree(repo), tree);
        const root = repo.git('ls-tree', '--name-only', '-z', tree).split('\0').filter((name) => name !== '');
        for (const name of PACKED_OUT) {
            assert.ok(!root.includes(name), `${name} is in the packed tree`);
        }
        for (const name of ['readme.md', 'Log.md', 'LOG.MD.txt', 'run.sh', 'hosts', 'tab\there', 'line\nbreak', '"quoted"', 'sub', 'index.json', 'a-look']) {
            assert.ok(root.includes(name), `${JSON.stringify(name)} is not in the packed tree`);
        }
        assert.match(repo.git('ls-tree', '-r', '--name-only', tree), /^a-look\/README\.md$/m);
    });

    /*
     * A local refs/replace/* makes a plain `git ls-tree <commit>` read
     * another tree while the commit is the pin (the 8c1 critic's item 3):
     * both sides read with replace objects off, and agree on the commit's
     * own tree.
     */
    it('reads the commit’s own tree under a replace ref, on both sides', () => {
        const repo = looksRepo({ ...LOOK, 'README.md': 'r\n' });
        const own = packedTreeOf({ dir: repo.dir, commit: repo.head, env: repo.env });
        const root = repo.git('rev-parse', 'HEAD^{tree}');
        const other = repo.git('mktree', '--missing');
        repo.git('replace', '-f', root, other);
        assert.notEqual(repo.git('ls-tree', repo.head), repo.git('--no-replace-objects', 'ls-tree', repo.head), 'the plant: the replace ref changes what a plain read sees');
        assert.equal(packedTreeOf({ dir: repo.dir, commit: repo.head, env: repo.env }), own);
        assert.equal(shellTree(repo), own);
    });

    /*
     * Why PACK_SCRIPT (`scripts/looks-artifact.mjs`) opens with `set -euo pipefail` before this line:
     * without pipefail, `git ls-tree` failing on an unreadable `$PIN` leaves
     * `mktree` to write the empty tree, and the step carries on with it.
     */
    it('needs pipefail: an unreadable commit stops the step, where without it the empty tree is packed', () => {
        const repo = looksRepo(LOOK);
        const script = (opener) => `${opener}\nPIN=${'0'.repeat(40)}\n${PACKED_TREE_SCRIPT}\nprintf '%s' "$tree"\n`;
        const step = runStep(script('set -euo pipefail'), repo.work);
        assert.notEqual(step.status, 0);
        assert.equal(step.stdout, '');
        const unsafe = spawnSync('bash', ['--noprofile', '--norc', '-c', script('set -eu')], { cwd: repo.work, env: { PATH: process.env.PATH, HOME: repo.work }, encoding: 'utf8' });
        assert.equal(unsafe.status, 0, 'the hazard this guards against is gone: the plant proves nothing');
        assert.equal(unsafe.stdout, '4b825dc642cb6eb9a060e54bf8d69288fbee4904');
    });

    it('refuses anything but a full commit, and a directory that is not a repository’s root', () => {
        const repo = looksRepo(LOOK);
        for (const commit of ['HEAD', repo.head.slice(0, 12), `--output=${repo.head}`, repo.head.toUpperCase()]) {
            assert.throws(() => packedTreeOf({ dir: repo.dir, commit, env: repo.env }), /full commit/, commit);
        }
        assert.throws(() => packedTreeOf({ dir: join(repo.dir, 'a-look'), commit: repo.head, env: repo.env }), /not a repository's root/);
    });
});

/**
 * `the-pin-line-refuses-a-repository-the-build-refuses`: what the window
 * writes when it bumps the pin (`pinLineFor`, `node scripts/looks-pin.mjs
 * --write`) refuses what the build's own read of the commit refuses — its
 * files, its index against the public lists, its directories, every named
 * look's required files (`readPrivateLooksAt`, as `selectedIndex` reads it)
 * — and an index naming no look (the 8c1 critic's item 4: a README-and-log
 * commit got a pin to the empty tree); and, before a release, any commit
 * whose packed tree is not `CANARY_TREE` (the gate), behind it the slug
 * belt. The plants start from the canary from public bytes
 * (`plantCanary`): the one tree every check admits, under a commit of the
 * plant's own, never `CANARY_COMMIT` — so each pin is asked with
 * `canaryCommit` set to that commit, and the commit gate is
 * `the-pin-step-fetches-only-the-canary-commit`'s. A look's own
 * validators are the build's and `pnpm test`'s, not this test's. `--write`
 * writes only once the line is computed: a refusal leaves the old pin,
 * byte for byte.
 */
describe('the-pin-line-refuses-a-repository-the-build-refuses', () => {
    after(removePlants);
    let facts;
    let CANARY;
    before(async () => {
        facts = await publicLookFacts();
        CANARY = PREVIEW_SLUGS[0];
    });
    // A planted canary's commit is its own, never `CANARY_COMMIT`: each pin is asked as were that commit the canary's, so what these plants prove is the rest (the commit gate is `the-pin-step-fetches-only-the-canary-commit`'s).
    const lineOf = async (looks, commit, released) =>
        pinLineFor({ dir: looks.dir, env: looks.env, commit, canaryCommit: commit ?? looks.head(), facts: { ...facts, ...(released === undefined ? {} : { released }) } });
    const canary = (edit, add) => plantCanary(edit, add);

    it('is the commit and its packed tree, 82 bytes, at HEAD or at a commit named', async () => {
        const looks = canary();
        const line = await lineOf(looks);
        assert.equal(line, `${looks.head()} ${CANARY_TREE}\n`);
        assert.equal(packedTreeOf({ dir: looks.dir, commit: looks.head(), env: looks.env }), CANARY_TREE);
        assert.equal(pinProblem(line), undefined);
        assert.equal(await lineOf(looks, looks.head()), line);
    });

    it('refuses what the build refuses to read, and a commit that carries no look, naming each', async () => {
        const plants = [
            ['a README and a log alone', undefined, (dir) => ['index.json', CANARY].forEach((path) => rmSync(join(dir, path), { recursive: true })), { 'README.md': 'r\n', 'LOG.md': 'l\n' }, /no index\.json at the root/],
            ['a note at the root', undefined, undefined, { 'NOTES.md': 'n\n' }, /"NOTES\.md": not a file/],
            ['a design log inside a look', undefined, undefined, { [`${CANARY}/LOG.md`]: 'l\n' }, /"canary\/LOG\.md": not a file/],
            ['a directory the index does not name', undefined, undefined, { 'other/look.json': '{}\n' }, /other\/: a directory the index does not name/],
            ['an index that frees the reserved id', (path, text) => (path === 'index.json' ? text.replace('"paid": true', '"paid": false') : text), undefined, undefined, /PAID_LOOK_IDS says true/],
            ['an index that releases it', (path, text) => (path === 'index.json' ? text.replace('"preview"', '"release"') : text), undefined, undefined, /RELEASED_LOOK_IDS does not name/],
            ['an index naming no look', (path, text) => (path === 'index.json' ? '{ "schema": 1, "looks": [] }\n' : text), (dir) => rmSync(join(dir, CANARY), { recursive: true }), undefined, /the index names no look/],
            ['a look without its sheet', undefined, (dir) => rmSync(join(dir, CANARY, 'sheet.css')), undefined, /canary\/sheet\.css: the index names the look and the file is not there/],
            // (c′): the 8c2 critic's road (i), an unsold look's directory beside the canary, unindexed.
            ['an unindexed look beside the canary', undefined, undefined, { 'ink-wash/look.json': '{}\n', 'ink-wash/sheet.css': '.t-ink-wash {}\n' }, /ink-wash\/: a look directory PREVIEW_SLUGS does not name/],
        ];
        for (const [name, edit, remove, add, why] of plants) {
            const looks = canary(edit ?? ((_path, text) => text), add ?? {});
            if (remove !== undefined) {
                remove(looks.dir);
                looks.git('add', '-A');
                looks.git('commit', '-q', '-m', 'removed');
            }
            await assert.rejects(lineOf(looks), (error) => /a pin names no commit the build would refuse/.test(error.message) && why.test(error.message), name);
        }
    });

    /*
     * (c′), mechanically: the 8c2 critic's road (ii) — the index naming Ink
     * wash at 0x04, the canary's place — and slugs one edit from the
     * canary, each a look the build would read whole, are refused at pin
     * time; and once a release names an id no pin is written until step 9
     * rewrites the rule.
     */
    it('refuses a look indexed under a slug PREVIEW_SLUGS does not name, and every pin once a release names an id', async () => {
        for (const slug of ['ink-wash', CANARY.slice(0, -1), CANARY.slice(1), `${CANARY}-x`, `x${CANARY}`]) {
            await assert.rejects(lineOf(plantLooks(undefined, {}, { slug })), (error) => error.message.includes(`the index names ${slug}, which PREVIEW_SLUGS does not`) && error.message.includes(`${slug}/: a look directory PREVIEW_SLUGS does not name`), slug);
        }
        const upper = plantLooks(undefined, {}, { slug: `${CANARY[0].toUpperCase()}${CANARY.slice(1)}` });
        await assert.rejects(lineOf(upper), /Canary\/: a look directory PREVIEW_SLUGS does not name/);
        await assert.rejects(lineOf(canary(), undefined, [0x04]), /a release carries a private look: step 9 rewrites the preview road and this rule/);
        assert.equal(pinProblem(await lineOf(canary())), undefined, 'the canary itself is pinned');
    });

    /*
     * The gate (the owner's (a′), the second 8c2 critic's item 1): a
     * commit the build would read whole and the slug belt admits — the
     * fixture's own bytes under `canary/`, as the 8c2 pin tests planted the
     * canary until then — is refused for its tree, and for nothing else.
     */
    it('refuses a commit the build and the slug belt admit, for its packed tree alone', async () => {
        const looks = plantLooks(undefined, {}, { slug: CANARY });
        await assert.rejects(lineOf(looks), (error) => {
            const problems = error.message.split('\n').slice(1);
            return problems.length === 1 && problems[0].startsWith(`  - its packed tree ${packedTreeOf({ dir: looks.dir, commit: looks.head(), env: looks.env }).slice(0, 12)} is not CANARY_TREE ${CANARY_TREE.slice(0, 12)}, the canary's`);
        });
    });

    /*
     * The command line pins the canary's own commit or nothing: it never
     * sets `pinLineFor`'s `canaryCommit`, so a canary planted under another
     * commit is refused by the real CLI, the old pin standing; the write
     * itself is driven in-process (`looksPinCommand`, the CLI's whole body)
     * with the planted commit as the fact.
     */
    it('writes deploy/looks.commit with --write only once the line is computed, and a refusal leaves the old pin', async () => {
        const run = (cwd, ...args) => spawnSync(process.execPath, [join(ROOT, 'scripts', 'looks-pin.mjs'), ...args], { cwd, env: { ...process.env }, encoding: 'utf8' });
        const work = scratchDir('cli');
        mkdirSync(join(work, 'deploy'));
        writeFileSync(join(work, LOOKS_PIN_FILE), GOOD);
        // A refusal: `looks` is a README-and-log repository.
        const bare = looksRepo({ 'README.md': 'r\n', 'LOG.md': 'l\n' });
        execFileSync('git', ['clone', '-q', bare.dir, join(work, 'looks')], { env: bare.env });
        const refused = run(work, '--write');
        assert.equal(refused.status, 1, refused.stderr);
        assert.match(refused.stderr, /a pin names no commit the build would refuse/);
        assert.equal(readFileSync(join(work, LOOKS_PIN_FILE), 'utf8'), GOOD, 'the old pin stands');
        // A canary planted under its own commit: the real command line refuses it for that commit alone.
        const good = canary();
        const planted = run(work, '--write', good.dir);
        assert.equal(planted.status, 1, planted.stderr);
        assert.match(planted.stderr, /- it is not CANARY_COMMIT [0-9a-f]{12}, the canary's commit/);
        assert.doesNotMatch(planted.stderr, /is not CANARY_TREE/);
        assert.equal(readFileSync(join(work, LOOKS_PIN_FILE), 'utf8'), GOOD, 'the old pin stands');
        // Told that commit is the canary's: printed without --write, written with it.
        const printed = await looksPinCommand([good.dir], { cwd: work, canaryCommit: good.head() });
        assert.equal(printed.status, 0, printed.stderr);
        assert.equal(pinProblem(printed.stdout), undefined);
        assert.equal(readFileSync(join(work, LOOKS_PIN_FILE), 'utf8'), GOOD, 'printing writes nothing');
        const wrote = await looksPinCommand(['--write', good.dir], { cwd: work, canaryCommit: good.head() });
        assert.equal(wrote.status, 0, wrote.stderr);
        assert.equal(wrote.stdout, '');
        assert.equal(readFileSync(join(work, LOOKS_PIN_FILE), 'utf8'), printed.stdout);
    });
});
