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
 * and every commit reachable from HEAD and not from `origin/main` — what a
 * push of HEAD would publish — that touches `src/looks` in any case.
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
    const pathspec = `:(icase)${LOOK_ART_ROOT.slice(0, -1)}`;
    const unpushed = [];
    if (upstream !== undefined) {
        const commits = run(['rev-list', '--full-history', 'HEAD', '--not', upstream, '--', pathspec])
            .split('\n')
            .filter((line) => line !== '');
        for (const commit of commits) {
            const paths = list([
                'diff-tree',
                '-z',
                '-r',
                '-m',
                '--root',
                '--no-renames',
                '--no-commit-id',
                '--name-only',
                commit,
                '--',
                pathspec,
            ]);
            unpushed.push({ commit, paths: [...new Set(paths)] });
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
 * above it. `--frozen-lockfile` is what keeps that tree the lockfile's.
 */
function productionPackages(root) {
    const lookup = (from, name) => {
        for (let dir = from; ; dir = dirname(dir)) {
            const json = join(dir, 'node_modules', name, 'package.json');
            if (existsSync(json)) {
                return realpathSync(dirname(json));
            }
            if (dirname(dir) === dir) {
                return undefined;
            }
        }
    };
    const packages = new Map();
    const missing = [];
    const uninstalledOptional = [];
    const rootJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    const queue = Object.keys(rootJson.dependencies ?? {}).map((name) => ({ from: root, by: 'the root', name, kind: 'dependency' }));
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
        for (const planted of ['src/looks/x/LICENSE', 'src/licence.txt', 'COPYING', 'docs/notice.md', 'src/ui/fonts/OFL.txt']) {
            assert.equal(licenceFileProblems({ tracked: [...tracked, planted], fontLicences }).length, 1, planted);
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
        assert.deepEqual(readGitFacts(dir).unpushed.map((c) => c.paths), [['src/looks/a.svg']]);
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

    it('finds src/looks empty in this checkout and in every commit a push of HEAD would publish', () => {
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

    it('tells a creator that a public fork puts their files under its MIT licence', () => {
        const readme = readFileSync(join(ROOT, 'workshop', 'README.md'), 'utf8').replace(/\s+/g, ' ');
        assert.ok(readme.includes("sits under that fork's MIT LICENSE"), 'the kit README does not say it');
    });
});
