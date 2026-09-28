import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
    FONT_FILE,
    KIT_TRACKED,
    LICENCE_MAP,
    LOOK_ART_ROOT,
    caseVariantProblems,
    dependencyProblems,
    fontProblems,
    isLookArt,
    kitProblems,
    licenceFileProblems,
    lookArtProblems,
    rowFor,
    vendorNoticeProblems,
} from './licence-map-lib.mjs';
import { FONTS } from './notices.mjs';
import { LICENCE_ALLOW } from './notices-lib.mjs';

/**
 * The licence map (`scripts/licence-map-lib.mjs`) against this checkout.
 *
 * `node --test`, like `notices.test.mjs`: a TypeScript test importing an
 * `.mjs` breaks `pnpm build`'s `tsc` (TS7016). Every fact is read here —
 * git's file lists and history, the installed packages, the licence texts —
 * and handed to the lib's pure checks, each of which is first proved red on
 * an in-memory plant. Git runs locally and only locally; a git that cannot
 * be run fails the test, never skips it.
 */
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * What git says about a checkout: the tracked files, the tree (tracked plus
 * untracked and not ignored), whether the clone is shallow, `origin/main`,
 * and every commit a push could publish — reachable from a local branch, a
 * tag or HEAD and from no `origin/*` ref, so `push --all` and `push --tags`
 * are covered as well as HEAD's own — with every path each one touches.
 * No pathspec narrows the list: the lib's test is applied to each path,
 * because a pathspec folds case the way git does and a disk may fold more.
 */
function readGitFacts(root, git = 'git') {
    const run = (args) =>
        execFileSync(git, args, {
            cwd: root,
            encoding: 'utf8',
            maxBuffer: 256 * 1024 * 1024,
            stdio: ['ignore', 'pipe', 'pipe'],
        });
    const list = (args) => run(args).split('\0').filter((path) => path !== '');
    const shallow = run(['rev-parse', '--is-shallow-repository']).trim() === 'true';
    const tracked = list(['ls-files', '-z', '--cached']);
    const tree = list(['ls-files', '-z', '--cached', '--others', '--exclude-standard']);
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
    // One record per commit (and per parent of a merge, -m): "\x01<hash>",
    // then its paths, NUL-terminated, the first after a newline git adds.
    const unpushed = [];
    const out = run([
        'log',
        '-z',
        '-m',
        '--full-history',
        '--no-renames',
        '--name-only',
        '--format=%x01%H',
        '--branches',
        '--tags',
        'HEAD',
        '--not',
        '--remotes=origin',
    ]);
    let current;
    let first = false;
    for (const token of out.split('\0')) {
        if (token.startsWith('\x01')) {
            current = unpushed.find((entry) => entry.commit === token.slice(1));
            if (current === undefined) {
                current = { commit: token.slice(1), paths: [] };
                unpushed.push(current);
            }
            first = true;
        } else if (token !== '' && current !== undefined) {
            current.paths.push(first && token.startsWith('\n') ? token.slice(1) : token);
            first = false;
        }
    }
    return { tracked, tree, shallow, upstream, unpushed };
}

/**
 * The production closure by Node's own resolution: from the root's
 * `dependencies`, each package's `dependencies`, `optionalDependencies` and
 * `peerDependencies` (a peer its `peerDependenciesMeta` marks optional
 * counts as optional), each looked up the way `require` looks — the
 * `node_modules/<name>` of the dependent's real folder and every folder
 * above it, up to the checkout. `--frozen-lockfile` is what keeps that tree
 * the lockfile's.
 */
function productionPackages(root) {
    // Climb no higher than the checkout (or, where `node_modules` is a
    // link, the checkout it points into): a package above the repository is
    // not one this repository installs.
    const tops = new Set([realpathSync(root), dirname(realpathSync(join(root, 'node_modules')))]);
    const lookup = (from, name) => {
        for (let dir = from; ; dir = dirname(dir)) {
            const json = join(dir, 'node_modules', name, 'package.json');
            if (existsSync(json)) {
                return realpathSync(dirname(json));
            }
            if (tops.has(dir) || dirname(dir) === dir) {
                return undefined;
            }
        }
    };
    const packages = new Map();
    const missing = [];
    const uninstalledOptional = [];
    const rootJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    const queue = Object.keys(rootJson.dependencies ?? {}).map((name) => ({ from: realpathSync(root), by: 'the root', name, kind: 'dependency' }));
    while (queue.length > 0) {
        const { from, by, name, kind } = queue.shift();
        const dir = lookup(from, name);
        if (dir === undefined) {
            (kind.startsWith('optional') ? uninstalledOptional : missing).push(`${name} (${kind} of ${by})`);
            continue;
        }
        if (packages.has(dir)) {
            continue;
        }
        const json = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
        const id = `${json.name}@${json.version}`;
        packages.set(dir, { name: json.name, version: json.version, licence: json.license });
        for (const dep of Object.keys(json.dependencies ?? {})) {
            queue.push({ from: dir, by: id, name: dep, kind: 'dependency' });
        }
        for (const dep of Object.keys(json.optionalDependencies ?? {})) {
            queue.push({ from: dir, by: id, name: dep, kind: 'optional dependency' });
        }
        for (const dep of Object.keys(json.peerDependencies ?? {})) {
            const optional = json.peerDependenciesMeta?.[dep]?.optional === true;
            queue.push({ from: dir, by: id, name: dep, kind: optional ? 'optional peer' : 'peer' });
        }
    }
    return { packages: [...packages.values()], missing, uninstalledOptional };
}

const facts = readGitFacts(ROOT);

describe('the-licence-allow-list-is-the-owners', () => {
    it('is the literal the owner set, and the one list both checks read', () => {
        assert.deepEqual(LICENCE_ALLOW, ['MIT', 'ISC', 'BSD-2-Clause', 'BSD-3-Clause', 'Apache-2.0', '0BSD']);
    });
});

describe('every-production-dependency-is-on-the-allow-list', () => {
    const closure = productionPackages(ROOT);

    it('refuses a licence off the list and a licence that is not a string', () => {
        assert.deepEqual(dependencyProblems([{ name: 'a', version: '1.0.0', licence: 'MIT' }], LICENCE_ALLOW), []);
        assert.equal(dependencyProblems([{ name: 'g', version: '1.0.0', licence: 'GPL-3.0' }], LICENCE_ALLOW).length, 1);
        assert.equal(dependencyProblems([{ name: 'o', version: '1.0.0', licence: { type: 'MIT' } }], LICENCE_ALLOW).length, 1);
        assert.equal(dependencyProblems([{ name: 'e', version: '1.0.0', licence: '(MIT OR GPL-3.0)' }], LICENCE_ALLOW).length, 1);
    });

    it('walks the whole production closure and finds every required package installed', () => {
        assert.deepEqual(closure.missing, [], `required and not installed: ${closure.missing.join(', ')}`);
        const names = new Set(closure.packages.map((pkg) => pkg.name));
        const rootJson = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
        for (const name of Object.keys(rootJson.dependencies)) {
            assert.ok(names.has(name), `${name} is a dependency and the walk did not reach it`);
        }
        // The walk goes past the root's own list: protobufjs arrives through
        // chronik-client and nowhere in package.json.
        assert.ok(names.has('protobufjs'), 'the walk stopped at the root');
        assert.ok(!names.has('vite') && !names.has('vitest'), 'the walk followed a dev dependency');
    });

    it('names every optional package it did not find, rather than skipping it', () => {
        assert.deepEqual(closure.uninstalledOptional.sort(), [
            'bufferutil (optional peer of ws@8.21.3)',
            'utf-8-validate (optional peer of ws@8.21.3)',
        ]);
    });

    it('finds every installed package under a licence on the allow-list', () => {
        assert.deepEqual(dependencyProblems(closure.packages, LICENCE_ALLOW), []);
    });
});

describe('every-font-sits-beside-its-own-licence', () => {
    const licenceTexts = Object.fromEntries(
        FONTS.filter((font) => existsSync(join(ROOT, font.licence))).map((font) => [
            font.licence,
            readFileSync(join(ROOT, font.licence), 'utf8'),
        ]),
    );
    const ofl = 'This Font Software is licensed under the SIL Open Font License, Version 1.1.';

    it('refuses a font FONTS does not name, a licence elsewhere, and a licence that is not the OFL', () => {
        const fonts = [{ name: 'F', files: { 'src/ui/fonts/f.woff2': 'Latin' }, licence: 'src/ui/fonts/LICENSE-F.txt' }];
        const tracked = ['src/ui/fonts/f.woff2', 'src/ui/fonts/LICENSE-F.txt'];
        const texts = { 'src/ui/fonts/LICENSE-F.txt': ofl };
        assert.deepEqual(fontProblems({ tracked, fonts, licenceTexts: texts }), []);
        // A face nobody listed, in src/ or in public/.
        assert.equal(fontProblems({ tracked: [...tracked, 'src/ui/fonts/g.woff2'], fonts, licenceTexts: texts }).length, 1);
        assert.equal(fontProblems({ tracked: [...tracked, 'public/g.ttf'], fonts, licenceTexts: texts }).length, 2);
        // The licence in another directory than its face.
        const away = [{ ...fonts[0], licence: 'src/LICENSE-F.txt' }];
        assert.ok(
            fontProblems({ tracked: [...tracked, 'src/LICENSE-F.txt'], fonts: away, licenceTexts: { 'src/LICENSE-F.txt': ofl } })
                .some((problem) => problem.includes('not in the directory')),
        );
        // A licence that is not the OFL 1.1, or is not there.
        assert.equal(fontProblems({ tracked, fonts, licenceTexts: { 'src/ui/fonts/LICENSE-F.txt': 'MIT' } }).length, 1);
        assert.equal(fontProblems({ tracked: ['src/ui/fonts/f.woff2'], fonts, licenceTexts: {} }).length, 1);
        // A listed face git does not track.
        assert.equal(fontProblems({ tracked: ['src/ui/fonts/LICENSE-F.txt'], fonts, licenceTexts: texts }).length, 1);
    });

    it('holds every tracked font file in this checkout to its own licence', () => {
        assert.ok(facts.tracked.filter((path) => FONT_FILE.test(path)).length >= 8, 'the check saw no fonts');
        assert.deepEqual(fontProblems({ tracked: facts.tracked, fonts: FONTS, licenceTexts }), []);
    });
});

describe('every-licence-file-is-on-the-map', () => {
    const fontLicences = FONTS.map((font) => font.licence);

    it('refuses a licence-looking file in any case that no row names', () => {
        const tracked = ['LICENSE', 'vendor/NOTICE.md', 'public/licenses.txt', ...fontLicences];
        assert.deepEqual(licenceFileProblems({ tracked, fontLicences }), []);
        for (const planted of [
            'src/looks/x/LICENSE',
            'src/licence.txt',
            'COPYING',
            'docs/notice.md',
            'src/ui/fonts/OFL.txt',
            'Licenses-MIT',
            'NOTICES.TXT',
        ]) {
            assert.equal(licenceFileProblems({ tracked: [...tracked, planted], fontLicences }).length, 1, planted);
        }
        // A name that only starts like one: code, not a licence.
        for (const code of ['scripts/notices.mjs', 'scripts/notices-lib.mjs', 'scripts/licence-map-lib.mjs', 'src/ui/notice.ts', 'src/offline.ts']) {
            assert.deepEqual(licenceFileProblems({ tracked: [...tracked, code], fontLicences }), [], code);
        }
        // A row's licence file that git does not track.
        assert.equal(licenceFileProblems({ tracked: tracked.filter((p) => p !== 'LICENSE'), fontLicences }).length, 1);
    });

    it('finds every licence-looking file in this checkout named by the map', () => {
        assert.deepEqual(licenceFileProblems({ tracked: facts.tracked, fontLicences }), []);
    });

    it('covers every path by exactly one row, the reserved one included', () => {
        assert.equal(rowFor('src/looks/ink-wash/art/a.svg').kind, 'reserved');
        assert.equal(rowFor('SRC/Looks/a.svg').kind, 'reserved');
        assert.equal(rowFor('src/ui/fonts/inter-latin.woff2').kind, 'fonts');
        assert.equal(rowFor('vendor/ecash-lib-4.13.0.tgz').kind, 'third-party');
        assert.equal(rowFor('src/app.ts').kind, 'repository');
        assert.equal(new Set(LICENCE_MAP.map((row) => row.path.toLowerCase())).size, LICENCE_MAP.length);
        // The reserved row is worded as a reservation, and nothing more.
        assert.equal(rowFor(LOOK_ART_ROOT).terms, 'Reserved, empty until LICENSE maps it.');
    });
});

/** A throwaway repository, outside this checkout, with no global or system config. */
const scratch = [];
after(() => {
    for (const dir of scratch) {
        rmSync(dir, { recursive: true, force: true });
    }
});
function plantRepo() {
    const dir = realpathSync(mkdtempSync(join(tmpdir(), 'stall-licence-map-')));
    scratch.push(dir);
    const env = {
        ...process.env,
        GIT_CONFIG_GLOBAL: '/dev/null',
        GIT_CONFIG_NOSYSTEM: '1',
        GIT_AUTHOR_NAME: 'plant',
        GIT_AUTHOR_EMAIL: '',
        GIT_COMMITTER_NAME: 'plant',
        GIT_COMMITTER_EMAIL: '',
    };
    const git = (...args) => execFileSync('git', args, { cwd: dir, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    git('init', '-q', '-b', 'main', '.');
    // This checkout's own setting: unset, on a disk that ignores case.
    try {
        git('config', '--unset', 'core.ignorecase');
    } catch {
        // Not set on a case-sensitive disk.
    }
    writeFileSync(join(dir, 'a.txt'), 'a\n');
    git('add', 'a.txt');
    git('commit', '-q', '-m', 'base');
    git('update-ref', 'refs/remotes/origin/main', 'HEAD');
    /** A file at exactly this spelling, whatever the disk does with case. */
    const plant = (path) => {
        const blob = execFileSync('git', ['hash-object', '-w', '--stdin'], { cwd: dir, env, input: 'x\n', encoding: 'utf8' }).trim();
        git('update-index', '--add', '--cacheinfo', `100644,${blob},${path}`);
    };
    return { dir, git, plant };
}

describe('look-art-waits-for-its-licence', () => {
    const clean = { tree: ['src/app.ts'], shallow: false, upstream: 'abc', unpushed: [] };

    it('refuses a file under the directory, in any case, and every file is listed', () => {
        assert.deepEqual(lookArtProblems(clean), []);
        const planted = lookArtProblems({ ...clean, tree: ['src/looks/ink-wash/look.json', 'SRC/LOOKS/a.svg', 'src/looks'] });
        assert.equal(planted.length, 3);
        assert.ok(isLookArt('src/Looks/art/x.svg') && !isLookArt('src/looksmith.ts') && !isLookArt('layout/src/looks/x'));
    });

    it('refuses a commit a push would publish, a shallow clone, and no origin/main', () => {
        assert.equal(lookArtProblems({ ...clean, unpushed: [{ commit: 'c1', paths: ['src/looks/a.svg'] }] }).length, 1);
        assert.equal(lookArtProblems({ ...clean, shallow: true }).length, 1);
        assert.equal(lookArtProblems({ ...clean, upstream: undefined }).length, 1);
    });

    it('reads a planted repository: the tree, the unpushed commits, a removal that came after, a rename', () => {
        const { dir, git, plant } = plantRepo();
        assert.deepEqual(lookArtProblems(readGitFacts(dir)), []);
        // Added in one commit and removed in the next: nothing in the tree,
        // and both commits would still be published.
        plant('src/looks/ink-wash/look.json');
        git('commit', '-q', '-m', 'add');
        assert.equal(lookArtProblems(readGitFacts(dir)).length, 2, 'in the tree and in one unpushed commit');
        git('update-index', '--force-remove', 'src/looks/ink-wash/look.json');
        git('commit', '-q', '-m', 'remove');
        const removed = readGitFacts(dir);
        assert.deepEqual(removed.tree.filter(isLookArt), []);
        assert.equal(removed.unpushed.length, 2);
        assert.equal(lookArtProblems(removed).length, 2);
        // Once origin/main has them, they are published already: the guard
        // is about what the next push adds.
        git('update-ref', 'refs/remotes/origin/main', 'HEAD');
        assert.deepEqual(lookArtProblems(readGitFacts(dir)), []);
        // A rename out of the directory names the old path.
        plant('src/looks/a.svg');
        git('commit', '-q', '-m', 'add');
        git('update-ref', 'refs/remotes/origin/main', 'HEAD');
        git('update-index', '--force-remove', 'src/looks/a.svg');
        plant('art/a.svg');
        git('commit', '-q', '-m', 'move');
        const moved = readGitFacts(dir);
        assert.deepEqual(moved.unpushed.map((c) => c.paths.sort()), [['art/a.svg', 'src/looks/a.svg']]);
        assert.equal(lookArtProblems(moved).length, 1);
    });

    it('reads a merge that brings the directory in and an untracked file under it', () => {
        const { dir, git, plant } = plantRepo();
        git('checkout', '-q', '-b', 'side');
        plant('src/looks/b.svg');
        git('commit', '-q', '-m', 'side');
        git('checkout', '-q', 'main');
        git('merge', '-q', '--no-ff', '-m', 'merge', 'side');
        const merged = readGitFacts(dir);
        assert.equal(merged.unpushed.length, 2, 'the side commit and the merge');
        assert.ok(merged.tree.includes('src/looks/b.svg'));
        const untracked = plantRepo();
        mkdirSync(join(untracked.dir, 'src', 'looks'), { recursive: true });
        writeFileSync(join(untracked.dir, 'src', 'looks', 'c.svg'), 'c\n');
        assert.equal(lookArtProblems(readGitFacts(untracked.dir)).length, 1, 'untracked and not ignored is in the tree');
    });

    it('reads a commit on another local branch and under a tag, which HEAD does not reach', () => {
        const { dir, git, plant } = plantRepo();
        git('checkout', '-q', '-b', 'other');
        plant('src/looks/o.svg');
        git('commit', '-q', '-m', 'other');
        git('update-index', '--force-remove', 'src/looks/o.svg');
        git('checkout', '-q', 'main');
        const branch = readGitFacts(dir);
        assert.deepEqual(branch.tree, ['a.txt'], 'HEAD is clean');
        assert.equal(lookArtProblems(branch).length, 1, 'push --all would publish the other branch');
        git('tag', 'kept', 'other');
        git('branch', '-q', '-D', 'other');
        assert.equal(lookArtProblems(readGitFacts(dir)).length, 1, 'push --tags would publish the tag');
        git('tag', '-d', 'kept');
        assert.deepEqual(lookArtProblems(readGitFacts(dir)), []);
    });

    it('fails on a shallow clone, with no origin/main, and when git cannot run', () => {
        const { dir, git } = plantRepo();
        git('commit', '-q', '--allow-empty', '-m', 'second');
        const shallow = realpathSync(mkdtempSync(join(tmpdir(), 'stall-licence-map-')));
        scratch.push(shallow);
        execFileSync('git', ['clone', '-q', '--depth', '1', `file://${dir}`, shallow], {
            env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' },
            stdio: 'ignore',
        });
        assert.ok(readGitFacts(shallow).shallow);
        assert.ok(lookArtProblems(readGitFacts(shallow)).some((p) => p.includes('shallow')));
        git('update-ref', '-d', 'refs/remotes/origin/main');
        assert.ok(lookArtProblems(readGitFacts(dir)).some((p) => p.includes('no origin/main')));
        assert.throws(() => readGitFacts(dir, join(dir, 'no-such-git')), /ENOENT/);
    });

    it('finds src/looks empty in this checkout and in every commit a push would publish', () => {
        assert.deepEqual(lookArtProblems(facts), []);
    });
});

describe('a-case-variant-of-the-look-art-directory-is-refused', () => {
    it('refuses two spellings of one file or one directory', () => {
        assert.deepEqual(caseVariantProblems(['src/ui/a.ts', 'src/ui/b.ts']), []);
        assert.equal(caseVariantProblems(['src/ui/A.ts', 'src/ui/a.ts']).length, 1);
        assert.equal(caseVariantProblems(['src/UI/x.ts', 'src/ui/y.ts']).length, 1);
    });

    it('reads src/Looks in a planted repository as the reserved directory', () => {
        const { dir, git, plant } = plantRepo();
        plant('src/Looks/art.svg');
        git('commit', '-q', '-m', 'capitals');
        const planted = readGitFacts(dir);
        assert.deepEqual(planted.tree, ['a.txt', 'src/Looks/art.svg']);
        assert.equal(lookArtProblems(planted).length, 2, 'in the tree and in the unpushed commit');
        plant('src/looks/art.svg');
        assert.equal(caseVariantProblems(readGitFacts(dir).tree).length, 2, 'the directory and the file, two ways each');
    });

    it('finds no path in this checkout spelled two ways', () => {
        assert.deepEqual(caseVariantProblems(facts.tree), []);
    });
});

describe('a-path-that-folds-to-src-looks-is-refused', () => {
    // U+017F LATIN SMALL LETTER LONG S: APFS folds it to "s", lower-casing
    // and git's :(icase) do not.
    const folded = 'src/look\u017f/a.svg';
    const clean = { tree: ['src/app.ts'], shallow: false, upstream: 'abc', unpushed: [] };

    it('refuses a path that is not printable ASCII, in the tree and in a commit', () => {
        assert.equal(folded.toLowerCase().startsWith(LOOK_ART_ROOT), false, 'lower-casing does not see it');
        assert.equal(lookArtProblems({ ...clean, tree: [folded] }).length, 1);
        assert.equal(lookArtProblems({ ...clean, unpushed: [{ commit: 'c1', paths: ['src/app.ts', folded] }] }).length, 1);
        assert.equal(lookArtProblems({ ...clean, tree: ['src/caf\u00e9.ts', 'src/a\tb.ts'] }).length, 2);
        assert.deepEqual(lookArtProblems({ ...clean, unpushed: [{ commit: 'c1', paths: ['src/app.ts'] }] }), []);
    });

    it('reads one planted and removed again in a repository, where no pathspec would', () => {
        const { dir, git, plant } = plantRepo();
        plant(folded);
        git('commit', '-q', '-m', 'folded');
        assert.equal(lookArtProblems(readGitFacts(dir)).length, 2, 'in the tree and in the commit');
        git('update-index', '--force-remove', folded);
        git('commit', '-q', '-m', 'gone');
        const facts2 = readGitFacts(dir);
        assert.deepEqual(facts2.tree, ['a.txt']);
        assert.equal(lookArtProblems(facts2).length, 2, 'both commits touch it');
        assert.equal(git('log', '--format=%H', 'HEAD', '--not', '--remotes=origin', '--', ':(icase)src/looks'), '', 'the pathspec misses it');
    });

    it('finds every path in this checkout printable ASCII', () => {
        assert.deepEqual(facts.tree.filter((path) => !/^[\x20-\x7e]+$/.test(path)), []);
    });
});

describe('every-vendored-package-is-named-with-its-holders', () => {
    const noticeText = readFileSync(join(ROOT, 'vendor', 'NOTICE.md'), 'utf8');
    const tarballs = facts.tracked.filter((path) => /^vendor\/[^/]+\.tgz$/.test(path)).map((path) => path.slice('vendor/'.length));

    it('refuses a tarball with no line, a line with no holder, a stale line and a missing MIT text', () => {
        const mit =
            'Permission is hereby granted, free of charge, to any person obtaining a copy\n' +
            'The above copyright notice and this permission notice shall be included in all\n' +
            'copies or substantial portions of the Software.\n' +
            'OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.\n';
        const line = '- `a-1.0.0.tgz` — a 1.0.0: Copyright (c) 2024 Someone\n';
        assert.deepEqual(vendorNoticeProblems({ tarballs: ['a-1.0.0.tgz'], noticeText: line + mit }), []);
        assert.equal(vendorNoticeProblems({ tarballs: ['a-1.0.0.tgz', 'b-1.0.0.tgz'], noticeText: line + mit }).length, 1);
        assert.equal(vendorNoticeProblems({ tarballs: [], noticeText: line + mit }).length, 1);
        assert.equal(vendorNoticeProblems({ tarballs: ['a-1.0.0.tgz'], noticeText: '- `a-1.0.0.tgz` — a\n' + mit }).length, 1);
        assert.equal(vendorNoticeProblems({ tarballs: ['a-1.0.0.tgz'], noticeText: line }).length, 3);
    });

    it('names all eight tarballs in vendor/NOTICE.md', () => {
        assert.equal(tarballs.length, 8);
        assert.deepEqual(vendorNoticeProblems({ tarballs, noticeText }), []);
    });

    it('is where the root README sends a reader for vendor/', () => {
        const readme = readFileSync(join(ROOT, 'README.md'), 'utf8');
        const section = readme.slice(readme.indexOf('## Licence'));
        assert.ok(section.includes('vendor/NOTICE.md'), 'the README does not point at vendor/NOTICE.md');
        assert.ok(!section.includes('belong to the Bitcoin'), 'the README still gives every package one holder');
    });
});

describe('no-creator-art-is-tracked-in-the-kit', () => {
    it('refuses a kit file beyond the skeleton, and a skeleton file that is gone', () => {
        assert.deepEqual(kitProblems(KIT_TRACKED), []);
        assert.equal(kitProblems([...KIT_TRACKED, 'workshop/art/sun.svg']).length, 1);
        assert.equal(kitProblems([...KIT_TRACKED, 'Workshop/shots/a.png']).length, 1);
        assert.equal(kitProblems(KIT_TRACKED.filter((p) => p !== 'workshop/look.json')).length, 1);
    });

    it('tracks the four skeleton files in this checkout and nothing else under workshop/', () => {
        assert.deepEqual(kitProblems(facts.tracked), []);
    });

    it('warns a creator that a public fork is read as MIT', () => {
        const readme = readFileSync(join(ROOT, 'workshop', 'README.md'), 'utf8').replace(/\s+/g, ' ');
        assert.ok(
            readme.includes(
                'Anyone reading a public fork will take every file in it to be under its MIT LICENSE; keep a look you mean to send out of any public repository.',
            ),
            'the kit README does not say it',
        );
    });
});
