import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
    BUDGET_REASON_MAX,
    FIXTURE_PRIVATE_LOOK_CLASS,
    FULL_COMMIT,
    GIT_LOCATION_VARS,
    HARNESS_LOOK_CLASSES,
    PRIVATE_FILE_MODE,
    PRIVATE_INDEX,
    budgetReasonProblem,
    gitFilesAt,
    gitPathsListedTwice,
    gitTextAt,
    parsePrivateIndex,
    privateFileProblems,
    privateIndexProblems,
    privateLooksProblems,
    publicLookFacts,
    readPrivateLooksAt,
} from './private-looks.mjs';
import { PRIVATE_MODES_REFUSED, PRIVATE_PATHS_ADMITTED, PRIVATE_PATHS_REFUSED } from './private-looks-plant.mjs';

/**
 * A private look repository's shape (`scripts/private-looks.mjs`), over
 * in-memory plants, the tracked fixture (`layout/fixture-private-looks/`) and
 * planted git repositories outside this checkout — never over a `looks/`
 * clone that may or may not be on this disk, so the suite reads the same on
 * every machine (the step-8 critic's item 12).
 *
 * `node --test`, like `licence-map.test.mjs`: a TypeScript test importing an
 * `.mjs` breaks `tsc` (TS7016). Git runs locally and only locally.
 */
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURE = 'layout/fixture-private-looks';

const facts = await publicLookFacts();

/** An index text over `looks`, each entry `{ id, slug, cls, stage, paid }` with a neutral look's fields as defaults. */
const indexOf = (...looks) =>
    JSON.stringify({
        schema: 1,
        looks: looks.map((look) => ({ id: 4, slug: 'some-look', cls: 't-some-look', stage: 'preview', paid: true, ...look })),
    });
const plain = (...paths) => paths.map((path) => ({ path, mode: PRIVATE_FILE_MODE }));
/** A whole repository: the index, and every look it names with its two required files. */
const repoOf = (...looks) => {
    const { index } = parsePrivateIndex(indexOf(...looks));
    return {
        files: plain(PRIVATE_INDEX, ...index.looks.flatMap((look) => [`${look.slug}/look.json`, `${look.slug}/sheet.css`])),
        indexText: indexOf(...looks),
    };
};

/** The tracked fixture as git's index has it: every file under the prefix, with its mode, from the fixture's root. */
function trackedFixture() {
    const out = execFileSync('git', ['ls-files', '-z', '--stage', '--', FIXTURE], { cwd: ROOT, encoding: 'utf8' });
    const files = out
        .split('\0')
        .filter((entry) => entry !== '')
        .map((entry) => {
            const m = /^(\d{6}) [0-9a-f]+ \d\t(.*)$/s.exec(entry);
            return { path: m[2].slice(FIXTURE.length + 1), mode: m[1] };
        });
    return { files, indexText: readFileSync(join(ROOT, FIXTURE, PRIVATE_INDEX), 'utf8') };
}

const scratch = [];
after(() => {
    for (const dir of scratch) {
        rmSync(dir, { recursive: true, force: true });
    }
});

/**
 * A repository outside this checkout holding a copy of the tracked fixture,
 * committed — at its root, or `under` a subdirectory beside a file of its
 * own; no global or system config, and no user exclude file (git reads
 * `$XDG_CONFIG_HOME/git/ignore` whatever `GIT_CONFIG_GLOBAL` says, and a Mac's
 * often names `.DS_Store`). `read` reads it as the fixture it is.
 */
function plantPrivateRepo({ under } = {}) {
    const dir = realpathSync(mkdtempSync(join(tmpdir(), 'stall-private-looks-')));
    const xdg = realpathSync(mkdtempSync(join(tmpdir(), 'stall-private-looks-xdg-')));
    scratch.push(dir, xdg);
    const env = {
        ...process.env,
        GIT_CONFIG_GLOBAL: '/dev/null',
        GIT_CONFIG_NOSYSTEM: '1',
        XDG_CONFIG_HOME: xdg,
        GIT_AUTHOR_NAME: 'plant',
        GIT_AUTHOR_EMAIL: '',
        GIT_COMMITTER_NAME: 'plant',
        GIT_COMMITTER_EMAIL: '',
    };
    const git = (...args) => execFileSync('git', args, { cwd: dir, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    git('init', '-q', '-b', 'main', '.');
    const at = under === undefined ? dir : join(dir, under);
    for (const { path } of trackedFixture().files) {
        mkdirSync(join(at, dirname(path)), { recursive: true });
        copyFileSync(join(ROOT, FIXTURE, path), join(at, path));
    }
    if (under !== undefined) {
        writeFileSync(join(dir, 'app.ts'), 'export {};\n');
    }
    git('add', '-A');
    git('commit', '-q', '-m', 'fixture');
    const head = () => git('rev-parse', 'HEAD');
    const read = (options = {}) => readPrivateLooksAt({ dir, commit: head(), facts, fixture: true, env, ...options });
    return { dir, git, env, head, read };
}

describe('a-private-file-outside-the-allow-list-fails', () => {
    /**
     * A private look repository is data: the index, its README and design
     * log, and per look a `look.json`, a `sheet.css`, an `og.png`, a
     * `fonts.json` naming its faces and an
     * `art/` of SVGs, faces and the faces' OFL texts. Nothing else, nothing
     * nested deeper, and nothing that is not a plain file — a script, a page,
     * a symlink, a gitlink or an executable bit is refused, because nothing in
     * that repository is ever run.
     */
    const allowed = PRIVATE_PATHS_ADMITTED;

    it('passes every shape it allows', () => {
        assert.deepEqual(privateFileProblems(plain(...allowed)), []);
    });

    it('refuses code, pages, other files and other places, one problem each', () => {
        for (const path of PRIVATE_PATHS_REFUSED) {
            assert.equal(privateFileProblems(plain(path)).length, 1, path);
        }
    });

    it('refuses a symlink, a gitlink and an executable bit on a path it allows', () => {
        for (const mode of PRIVATE_MODES_REFUSED) {
            const problems = privateFileProblems([{ path: 'some-look/art/mark.svg', mode }]);
            assert.equal(problems.length, 1, mode);
            assert.match(problems[0], /plain files only/);
        }
    });

    it('passes the tracked fixture, file by file, as git tracks it', () => {
        const { files } = trackedFixture();
        assert.ok(files.length >= 4, 'the fixture is tracked');
        assert.deepEqual(privateFileProblems(files), []);
    });
});

describe('a-private-look-id-is-reserved-and-unshared', () => {
    /**
     * A private look takes an id `PRIVATE_LOOK_IDS` reserves — never a
     * shipped look's, the kit's, the skeleton's or the fixture look's — and
     * two private looks share no id, no slug and no class; nor may one take a
     * shipped or harness look's class. Held against the public lists from the
     * theme table (`publicLookFacts`).
     */
    it('reads the public lists from the theme table', () => {
        assert.deepEqual(facts.reserved, [0x04]);
        assert.deepEqual(facts.shippedClasses.sort(), ['t-modern', 't-neo', 't-rural']);
    });

    it('passes the tracked fixture whole, read as the fixture: its index, its id and its files', () => {
        assert.deepEqual(privateLooksProblems({ ...trackedFixture(), facts, fixture: true }), []);
        const { index } = parsePrivateIndex(trackedFixture().indexText);
        // The fixture is the real reserved, paid id (the critic's item 14),
        // under the class reserved for it, which no other private look may take.
        assert.deepEqual(index.looks, [{ id: 4, slug: 'fixture', cls: FIXTURE_PRIVATE_LOOK_CLASS, stage: 'preview', paid: true }]);
        assert.equal(FIXTURE_PRIVATE_LOOK_CLASS, 't-fixture-private');
        // Not read as the fixture, it is refused for taking that class.
        assert.equal(privateLooksProblems({ ...trackedFixture(), facts }).length, 1);
    });

    it('refuses an id that is not reserved', () => {
        assert.deepEqual(privateLooksProblems({ ...repoOf({}), facts }), []);
        for (const id of [0x01, 0x02, 0x03, 0x05, 0xff, 0xfe, 0xfd, 0x00]) {
            const problems = privateLooksProblems({ ...repoOf({ id, paid: false }), facts });
            assert.ok(problems.some((p) => /is not reserved/.test(p)), `0x${id.toString(16)}: ${problems.join('; ')}`);
        }
    });

    it('refuses two looks on one id, one slug or one class', () => {
        const wider = { ...facts, reserved: [4, 5], paid: [4, 5] };
        assert.deepEqual(privateLooksProblems({ ...repoOf({}, { id: 5, slug: 'second', cls: 't-second' }), facts: wider }), []);
        const shared = (second, pattern) => {
            const problems = privateLooksProblems({ ...repoOf({}, { id: 5, slug: 'second', cls: 't-second', ...second }), facts: wider });
            assert.equal(problems.length, 1, problems.join('; '));
            assert.match(problems[0], pattern);
        };
        shared({ id: 4 }, /id 4 is looks\[0\]'s too/);
        shared({ slug: 'some-look' }, /slug "some-look" is looks\[0\]'s too/);
        shared({ cls: 't-some-look' }, /cls "t-some-look" is looks\[0\]'s too/);
    });

    it("refuses a shipped look's class, the harness's and the fixture's", () => {
        for (const cls of [...facts.shippedClasses, ...HARNESS_LOOK_CLASSES, FIXTURE_PRIVATE_LOOK_CLASS]) {
            const problems = privateLooksProblems({ ...repoOf({ cls }), facts });
            assert.deepEqual(problems, [`${PRIVATE_INDEX}: looks[0] (some-look): cls ${cls} is a shipped, harness or fixture look's class`]);
        }
        // Read as the fixture on purpose, the fixture's class is its own.
        assert.deepEqual(privateLooksProblems({ ...repoOf({ cls: FIXTURE_PRIVATE_LOOK_CLASS }), facts, fixture: true }), []);
        assert.equal(privateLooksProblems({ ...repoOf({ cls: 't-modern' }), facts, fixture: true }).length, 1);
    });

    it('refuses an index that is not one: not JSON, another schema, a missing or unknown field, a bad slug or class', () => {
        assert.equal(parsePrivateIndex('{').problems.length, 1);
        assert.equal(parsePrivateIndex('[]').problems.length, 1);
        assert.equal(parsePrivateIndex('{"schema":2,"looks":[]}').problems.length, 1);
        assert.equal(parsePrivateIndex('{"schema":1,"looks":[],"extra":1}').problems.length, 1);
        assert.equal(parsePrivateIndex('{"schema":1}').problems.length, 1);
        assert.deepEqual(parsePrivateIndex('{"schema":1,"looks":[]}').problems, []);
        const one = (entry) => parsePrivateIndex(JSON.stringify({ schema: 1, looks: [entry] }));
        const good = { id: 4, slug: 'some-look', cls: 't-some-look', stage: 'preview', paid: true };
        assert.deepEqual(one(good).problems, []);
        for (const field of Object.keys(good)) {
            const { [field]: _, ...missing } = good;
            assert.equal(one(missing).problems.length, 1, `missing ${field}`);
        }
        for (const bad of [
            { label: 'Some look' },
            { id: 256 },
            { id: '4' },
            { id: 4.5 },
            { slug: 'Some-Look' },
            { slug: '../x' },
            { slug: 'a'.repeat(33) },
            { cls: 'somelook' },
            { cls: 't-some look' },
            { cls: 't-some.look' },
            { stage: 'draft' },
            { paid: 'true' },
        ]) {
            const { index, problems } = one({ ...good, ...bad });
            assert.equal(problems.length, 1, JSON.stringify(bad));
            assert.equal(index, undefined, 'no half an index downstream');
        }
    });

    it('refuses a look directory the index does not name, and a named look without its files', () => {
        const { files, indexText } = repoOf({});
        assert.deepEqual(
            privateLooksProblems({ files: [...files, ...plain('stray/look.json')], indexText, facts }),
            ['stray/: a directory the index does not name'],
        );
        assert.deepEqual(
            privateLooksProblems({ files: files.filter((f) => f.path !== 'some-look/sheet.css'), indexText, facts }),
            ['some-look/sheet.css: the index names the look and the file is not there'],
        );
        assert.deepEqual(privateLooksProblems({ files: plain('README.md'), indexText: undefined, facts }), [
            `no ${PRIVATE_INDEX} at the root: nothing names a look`,
        ]);
    });
});

describe('a-private-index-cannot-free-a-reserved-id', () => {
    /**
     * Whether a reserved id is paid is `PAID_LOOK_IDS`'s to say, in public
     * (the critic's item 1): an index whose `paid` disagrees, either way, is
     * refused, so a private commit cannot make a paid look free behind a pin
     * bump.
     */
    it('refuses paid false on a paid id, and paid true on an id the public list does not call paid', () => {
        assert.deepEqual(facts.paid, [0x04]);
        const problems = privateLooksProblems({ ...repoOf({ paid: false }), facts });
        assert.equal(problems.length, 1);
        assert.match(problems[0], /paid is false, and PAID_LOOK_IDS says true/);
        const free = { ...facts, paid: [] };
        assert.match(privateLooksProblems({ ...repoOf({ paid: true }), facts: free })[0], /paid is true, and PAID_LOOK_IDS says false/);
        assert.deepEqual(privateLooksProblems({ ...repoOf({ paid: false }), facts: free }), []);
    });
});

describe('a-budget-reason-is-one-plain-sentence-or-nothing', () => {
    /**
     * `budgetReason` (D-2026-10-06-08) is the one optional field of an index
     * entry: the stated reason a look may weigh more than the art budget's
     * soft target and still be admitted under its hard cap
     * (`each-look-keeps-its-art-budget`, `src/bundle.test.ts`). Fail closed:
     * absent is no reason; a string with something to read is one; anything
     * else — not a string, empty, only whitespace, over
     * `BUDGET_REASON_MAX`, a control, format, line or paragraph separator,
     * surrogate, private-use or unassigned character — refuses the whole
     * index, so a look is never admitted on a reason no single printed line
     * could show.
     */
    const one = (entry) => parsePrivateIndex(indexOf(entry));
    const reason = 'Ink wash draws its ground as four masks the owner refused to raster.';

    it('reads an entry without one, and one with a sentence, and carries the sentence', () => {
        assert.deepEqual(one({}).problems, []);
        const { index, problems } = one({ budgetReason: reason });
        assert.deepEqual(problems, []);
        assert.equal(index.looks[0].budgetReason, reason);
        assert.deepEqual(privateLooksProblems({ ...repoOf({ budgetReason: reason }), facts: { ...facts, overTarget: [0x04] } }), []);
        assert.equal(budgetReasonProblem(reason), undefined);
        assert.equal(budgetReasonProblem('é'.repeat(BUDGET_REASON_MAX)), undefined);
    });

    it('refuses a reason that is not one plain sentence, and the whole index with it', () => {
        for (const bad of [
            '',
            ' ',
            '\t\n ',
            '\u00a0\u3000',
            null,
            42,
            true,
            ['a reason'],
            { why: 'a reason' },
            'é'.repeat(BUDGET_REASON_MAX + 1),
            'two\nlines',
            'an escape \u001b[31m sequence',
            'a bidi \u202e override',
            'a zero\u200bwidth space',
            // One printed line only: the line and paragraph separators (the critic's item 4).
            'ok\u2028look budget \u00b7 t-x: 1 gzip -9 bytes, within',
            'two\u2029paragraphs',
            'a next-line\u0085control',
            'a vertical\u000btab',
            'a lone \ud800 surrogate',
            'a private \ue000 use',
            'an unassigned \u0378 point',
        ]) {
            const { index, problems } = one({ budgetReason: bad });
            assert.equal(problems.length, 1, JSON.stringify(bad));
            assert.match(problems[0], /looks\[0\]: budgetReason/, JSON.stringify(bad));
            assert.equal(index, undefined, 'no half an index downstream');
            assert.notEqual(budgetReasonProblem(bad), undefined, JSON.stringify(bad));
        }
        // Any other field beside the required ones is still an unknown one.
        assert.match(one({ budgetreason: reason }).problems[0], /an unknown field "budgetreason"/);
    });
});

describe('an-over-target-look-is-a-public-diff', () => {
    /**
     * The owner's OK on CRITIC-WEIGHT-BUCKETS item 1 (2026-10-06): a look
     * admitted between its art budget's target and its cap is named in
     * `OVER_TARGET_LOOK_IDS` (`src/domain/theme.ts`), a reviewable public
     * diff, and states its reason privately (`budgetReason`). The two agree
     * both ways, every listed id is reserved, and the tracked fixture — a
     * public index — states no reason.
     */
    const reason = 'Ink wash draws its ground as four masks the owner refused to raster.';
    const listed = { ...facts, overTarget: [0x04] };

    it('reads the public list from the theme table, empty', () => {
        assert.deepEqual(facts.overTarget, []);
    });

    it('passes a listed look that states a reason, and one neither listed nor stating one', () => {
        assert.deepEqual(privateLooksProblems({ ...repoOf({ budgetReason: reason }), facts: listed }), []);
        assert.deepEqual(privateLooksProblems({ ...repoOf({}), facts }), []);
    });

    it('refuses a reason the public list does not name, and a listed look with no reason', () => {
        const unlisted = privateLooksProblems({ ...repoOf({ budgetReason: reason }), facts });
        assert.equal(unlisted.length, 1);
        assert.match(unlisted[0], /looks\[0\] \(some-look\): states a budgetReason, and OVER_TARGET_LOOK_IDS does not name the id/);
        const unreasoned = privateLooksProblems({ ...repoOf({}), facts: listed });
        assert.equal(unreasoned.length, 1);
        assert.match(unreasoned[0], /OVER_TARGET_LOOK_IDS names the id, and its entry states no budgetReason/);
    });

    it('refuses a listed id that is not reserved, and facts that carry no list', () => {
        const stray = privateLooksProblems({ ...repoOf({}), facts: { ...facts, overTarget: [0x07] } });
        assert.deepEqual(stray, ['OVER_TARGET_LOOK_IDS names 0x07, which PRIVATE_LOOK_IDS does not reserve']);
        const { overTarget: _, ...without } = facts;
        assert.throws(() => privateLooksProblems({ ...repoOf({}), facts: without }), /OVER_TARGET_LOOK_IDS/);
    });

    it('refuses a reason on the tracked fixture, listed or not, and passes the fixture as tracked', () => {
        const fixtureEntry = { cls: FIXTURE_PRIVATE_LOOK_CLASS, budgetReason: reason };
        for (const over of [facts, listed]) {
            const problems = privateLooksProblems({ ...repoOf(fixtureEntry), facts: over, fixture: true });
            assert.equal(problems.length, 1, JSON.stringify(over.overTarget));
            assert.match(problems[0], /the tracked fixture states a budgetReason/);
        }
        const tracked = trackedFixture();
        assert.deepEqual(privateLooksProblems({ ...tracked, facts, fixture: true }), []);
        assert.equal(parsePrivateIndex(tracked.indexText).index.looks.some((entry) => Object.hasOwn(entry, 'budgetReason')), false);
    });
});

describe('a-release-is-a-public-diff', () => {
    /**
     * A look reaches production only when `RELEASED_LOOK_IDS` names its id,
     * in public; the index's `stage` must agree, either way, so the release is
     * one reviewed pair — a public diff and the private stage — and never the
     * private index alone. Empty for the whole of step 8.
     */
    it('refuses a release the public list does not name, and a preview it does', () => {
        assert.deepEqual(facts.released, []);
        const problems = privateLooksProblems({ ...repoOf({ stage: 'release' }), facts });
        assert.equal(problems.length, 1);
        assert.match(problems[0], /stage release, and RELEASED_LOOK_IDS does not name the id/);
        const released = { ...facts, released: [0x04] };
        assert.deepEqual(privateLooksProblems({ ...repoOf({ stage: 'release' }), facts: released }), []);
        assert.match(privateLooksProblems({ ...repoOf({ stage: 'preview' }), facts: released })[0], /stage preview, and RELEASED_LOOK_IDS names the id/);
    });
});

describe('private-files-are-read-from-git-at-a-commit', () => {
    /**
     * The files of a private look are the tree of one commit (the critic's
     * item 25): what the disk holds beside it — a `.DS_Store` Finder drops in,
     * an uncommitted file, anything untracked — is not a file of the look, and
     * what the commit holds is refused as git records it, mode and all.
     */
    it('reads the fixture back from a planted repository, and not the disk beside it', () => {
        const repo = plantPrivateRepo();
        const clean = repo.read();
        assert.deepEqual(clean.problems, []);
        assert.deepEqual(
            clean.files.map((f) => f.path).sort(),
            trackedFixture().files.map((f) => f.path).sort(),
        );
        writeFileSync(join(repo.dir, '.DS_Store'), 'x');
        writeFileSync(join(repo.dir, 'fixture', 'art', 'new.svg'), '<svg/>');
        writeFileSync(join(repo.dir, 'fixture', 'script.mjs'), 'export {};\n');
        assert.deepEqual(repo.read(), clean, 'nothing untracked is read');
    });

    it('refuses what a commit holds: a .DS_Store, a script, a symlink, a gitlink', () => {
        const repo = plantPrivateRepo();
        writeFileSync(join(repo.dir, '.DS_Store'), 'x');
        writeFileSync(join(repo.dir, 'fixture', 'script.mjs'), 'export {};\n');
        symlinkSync('ground.svg', join(repo.dir, 'fixture', 'art', 'linked.svg'));
        repo.git('add', '-A');
        const blob = repo.git('hash-object', '-w', join(repo.dir, 'index.json'));
        repo.git('update-index', '--add', '--cacheinfo', `160000,${blob},fixture/art/sub.svg`);
        repo.git('commit', '-q', '-m', 'more');
        const problems = repo.read().problems;
        assert.equal(problems.length, 4, problems.join('\n'));
        assert.ok(problems.some((p) => p.startsWith('".DS_Store": not a file')));
        assert.ok(problems.some((p) => p.startsWith('"fixture/script.mjs": not a file')));
        assert.ok(problems.some((p) => p.startsWith('"fixture/art/linked.svg": a symlink')));
        assert.ok(problems.some((p) => p.startsWith('"fixture/art/sub.svg": a gitlink')));
    });

    /*
     * The third 8c2 critic's item 3: `git mktree` takes a tree that lists
     * one name twice, and a file list read from it shows one look whose
     * sheet has two sources — or, when the second entry holds a file the
     * first does not, nothing amiss at all. The gate keeps such a tree off
     * the deploy road before a release (the hash); the build's own reader
     * refuses it too, so the gap does not come back when step 9 rewrites
     * the gate. Case folded, as a case-insensitive disk folds it.
     */
    it('refuses a tree that lists one path twice, as git mktree writes one', () => {
        const repo = plantPrivateRepo();
        assert.deepEqual(gitPathsListedTwice({ dir: repo.dir, commit: repo.head(), env: repo.env }), []);
        const twice = (name, entries) => {
            const sub = execFileSync('git', ['mktree'], { cwd: repo.dir, env: repo.env, input: entries, encoding: 'utf8' }).trim();
            const root = execFileSync('git', ['mktree'], { cwd: repo.dir, env: repo.env, input: `${repo.git('ls-tree', 'HEAD')}\n040000 tree ${sub}\t${name}\n`, encoding: 'utf8' }).trim();
            return repo.git('commit-tree', root, '-p', 'HEAD', '-m', 'twice');
        };
        const blob = (text) => execFileSync('git', ['hash-object', '-w', '--stdin'], { cwd: repo.dir, env: repo.env, input: text, encoding: 'utf8' }).trim();
        const read = (commit) => readPrivateLooksAt({ dir: repo.dir, commit, facts, fixture: true, env: repo.env });
        // The critic's plant: a second `fixture` holding a draft sheet.
        const draft = twice('fixture', `100644 blob ${blob('/* a draft sheet */\n')}\tsheet.css\n`);
        assert.equal(gitFilesAt({ dir: repo.dir, commit: draft, env: repo.env }).filter((file) => file.path === 'fixture/sheet.css').length, 2, 'the plant: the file list shows one path twice');
        assert.deepEqual(read(draft).problems, [
            '"fixture": listed twice in the tree (one name, two entries), which no checkout holds',
            '"fixture/sheet.css": listed twice in the tree (one name, two entries), which no checkout holds',
        ]);
        // A second `fixture` holding a file the first does not: the file list shows nothing twice.
        const og = twice('fixture', `100644 blob ${blob('png\n')}\tog.png\n`);
        assert.deepEqual(privateFileProblems(gitFilesAt({ dir: repo.dir, commit: og, env: repo.env })), [], 'the plant: the file list alone sees nothing');
        assert.deepEqual(read(og).problems, ['"fixture": listed twice in the tree (one name, two entries), which no checkout holds']);
        // Two spellings of one name, which a case-insensitive disk holds as one.
        const folded = twice('Fixture', `100644 blob ${blob('{}\n')}\tlook.json\n`);
        assert.ok(read(folded).problems.some((problem) => /^"[Ff]ixture": listed twice in the tree/.test(problem)), read(folded).problems.join('\n'));
    });

    it('reads no index that is not a plain file', () => {
        const repo = plantPrivateRepo();
        repo.git('rm', '-q', 'index.json');
        symlinkSync('fixture/look.json', join(repo.dir, 'index.json'));
        repo.git('add', 'index.json');
        repo.git('commit', '-q', '-m', 'linked index');
        const { indexText, problems } = repo.read();
        assert.equal(indexText, undefined);
        assert.deepEqual(problems, [
            '"index.json": a symlink, where a private look holds plain files only',
            `no ${PRIVATE_INDEX} at the root: nothing names a look`,
        ]);
    });

    it('takes a full commit only, and throws for one that is not there', () => {
        const repo = plantPrivateRepo();
        const head = repo.git('rev-parse', 'HEAD');
        assert.ok(FULL_COMMIT.test(head));
        for (const commit of ['HEAD', 'main', head.slice(0, 12), head.toUpperCase(), `--output=${join(repo.dir, 'x')}`, '']) {
            assert.throws(() => gitFilesAt({ dir: repo.dir, commit, env: repo.env }), TypeError, commit);
        }
        assert.throws(() => gitFilesAt({ dir: repo.dir, commit: '0'.repeat(40), env: repo.env }));
    });

    it("reads a repository's root only, whatever the inherited environment points at", () => {
        const repo = plantPrivateRepo();
        // A directory inside it: git would read the enclosing repository.
        assert.throws(() => gitFilesAt({ dir: join(repo.dir, 'fixture'), commit: repo.head(), env: repo.env }), /not a repository's root/);
        // A directory in no repository of its own, inside another: the same.
        const other = plantPrivateRepo({ under: 'layout/fixture-private-looks' });
        assert.throws(() => repo.read({ dir: join(other.dir, 'layout') }), /not a repository's root/);
        // Location variables a hook would carry, naming the other repository:
        // dropped, so the read is the planted one's.
        const pointed = { ...repo.env, GIT_DIR: join(other.dir, '.git'), GIT_WORK_TREE: other.dir, GIT_INDEX_FILE: join(other.dir, '.git', 'index') };
        assert.deepEqual(repo.read({ env: pointed }).problems, []);
        assert.deepEqual(GIT_LOCATION_VARS.filter((name) => ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE'].includes(name)).length, 3);
    });

    it('a-replace-ref-does-not-change-what-a-commit-holds', () => {
        // The 8b2 critic's item 8: a `refs/replace/*` in the clone would make
        // `cat-file blob <commit>:<path>` answer another blob while the
        // commit — and so the pin — stays the same. The reader turns replace
        // objects off; red without `--no-replace-objects` and
        // `GIT_NO_REPLACE_OBJECTS`.
        const repo = plantPrivateRepo();
        const original = repo.git('rev-parse', `${repo.head()}:fixture/sheet.css`);
        const planted = execFileSync('git', ['hash-object', '-w', '--stdin'], {
            cwd: repo.dir,
            env: repo.env,
            input: '.t-fixture-private { --look-sheet: t-fixture-private; }\n/* replaced */\n',
            encoding: 'utf8',
        }).trim();
        repo.git('replace', original, planted);
        assert.match(repo.git('cat-file', 'blob', `${repo.head()}:fixture/sheet.css`), /replaced/, 'the plant takes');
        const text = gitTextAt({ dir: repo.dir, commit: repo.head(), path: 'fixture/sheet.css', env: repo.env });
        assert.doesNotMatch(text, /replaced/);
        assert.equal(text, readFileSync(join(ROOT, FIXTURE, 'fixture', 'sheet.css'), 'utf8'));
    });

    it('reads a subtree of a commit, which is how a build reads the tracked fixture', () => {
        const repo = plantPrivateRepo({ under: 'layout/fixture-private-looks' });
        const read = repo.read({ prefix: 'layout/fixture-private-looks' });
        assert.deepEqual(read.problems, []);
        assert.deepEqual(read.files.map((f) => f.path).sort(), trackedFixture().files.map((f) => f.path).sort());
        // The whole tree is not a private look repository: it holds app.ts.
        assert.ok(repo.read().problems.some((p) => p.startsWith('"app.ts": not a file')));
        for (const prefix of ['../x', 'layout//fixture-private-looks', '/layout', 'Layout', '', 'layout/']) {
            assert.throws(() => repo.read({ prefix }), TypeError, prefix);
        }
        // This checkout's own fixture, at HEAD: the road 8b's public-CI join takes.
        const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
        const own = readPrivateLooksAt({ dir: ROOT, commit: head, prefix: FIXTURE, facts, fixture: true });
        assert.ok(own.files.length >= 4);
        assert.deepEqual(own.problems, []);
    });
});
