/**
 * Test support, never imported by a build or the app: a private look
 * repository planted outside this checkout, from the tracked fixture
 * (`layout/fixture-private-looks/`), for the guards that read private looks
 * to prove their private half red (step 8e1) — and a synthetic WOFF2, so a
 * face check has a face to read without a real font ever being tracked.
 *
 * `plantLooks(edit, add)` copies the fixture as HEAD holds it (the commit
 * the guards read it at) into a fresh repository under the OS's temporary
 * directory, its class renamed to
 * `t-planted-look` (the fixture's class is the fixture's alone,
 * `FIXTURE_PRIVATE_LOOK_CLASS`) and its rows' `att-fixture-…` to
 * `att-planted-…` (two looks share no row class), its directory and index
 * slug `fixture` to `slug` when one is given (a preview slug, for the
 * deploy road's gates), each text passed through
 * `edit(path, text)`
 * and the files of `add` (`{ path: text | Buffer }`) beside them, and
 * commits once — no global or system config, no user exclude file. It
 * answers the directory, the environment git ran in, and `selection`: the
 * environment variables that select it at `preview`, for `servedSheets` or a
 * build. `removePlants()` deletes every repository planted in the process.
 * And the paths the build's allow-list test and the deploy pack's share
 * (`PRIVATE_PATHS_ADMITTED`, `PRIVATE_PATHS_REFUSED`,
 * `PRIVATE_MODES_REFUSED`). Node built-ins only; a `.d.mts` beside it.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync } from 'node:zlib';
import { FIXTURE_LOOKS_DIR, SELECTION_ENV } from './looks-selection.mjs';
import { gitCommitOf, gitFilesAt, gitTextAt } from './private-looks.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * The paths `a-private-file-outside-the-allow-list-fails`
 * (`scripts/private-looks.test.mjs`) holds the build's allow-list to — one
 * list for that test and the deploy pack's
 * (`the-pack-admits-what-privateFileProblems-admits-at-the-root-or-under-a-preview-slug`,
 * `scripts/looks-artifact.test.mjs`), so a plant added here is held against
 * both: paths a private look repository may hold as plain files, paths it
 * may not hold at all, and the modes no path may have.
 */
export const PRIVATE_PATHS_ADMITTED = Object.freeze([
    'index.json',
    'README.md',
    'LOG.md',
    'some-look/look.json',
    'some-look/sheet.css',
    'some-look/og.png',
    'some-look/fonts.json',
    'some-look/art/mark.svg',
    'some-look/art/face-latin.woff2',
    'some-look/art/LICENSE-OFL.txt',
    'some-look/art/LICENSE-OFL-face.txt',
    'a/look.json',
]);

export const PRIVATE_PATHS_REFUSED = Object.freeze([
    'some-look/look.ts',
    'some-look/look.js',
    'some-look/script.mjs',
    'some-look/page.html',
    'some-look/art/tool.mjs',
    'some-look/art/mark.svg.js',
    'some-look/extra.css',
    'some-look/README.md',
    'some-look/og.jpg',
    'some-look/art/shot.png',
    'some-look/art/face.ttf',
    'some-look/art/face.woff',
    'some-look/art/sub/mark.svg',
    'some-look/art/Mark.svg',
    'some-look/art/a mark.svg',
    'some-look/LICENSE-OFL.txt',
    'Some-Look/look.json',
    'some_look/look.json',
    '-look/look.json',
    'look.json',
    'sheet.css',
    'package.json',
    '.gitignore',
    '.gitmodules',
    '.DS_Store',
    'some-look/.DS_Store',
    'notes/plan.md',
    'some-look/art/../look.json',
    `${'a'.repeat(33)}/look.json`,
]);

export const PRIVATE_MODES_REFUSED = Object.freeze(['120000', '160000', '100755']);

/** The class a planted look takes in place of the fixture's. */
export const PLANTED_CLASS = 't-planted-look';

/** The prefix its rows' classes take in place of the fixture's (`att-fixture-trim` → `att-planted-trim`): a row class is its look's own. */
export const PLANTED_ROW_PREFIX = 'att-planted-';

const planted = [];

/** Delete every repository this process planted. */
export function removePlants() {
    for (const dir of planted.splice(0)) {
        rmSync(dir, { recursive: true, force: true });
    }
}

/**
 * The tracked fixture as HEAD holds it: every file of its subtree, by its
 * path from the fixture's root, with its text — the commit every guard reads
 * the fixture at (`guardSheets`), so a red proof planted from it and the
 * passing half beside it read one fixture, whatever the working tree holds
 * (the 8e1 critic's item 5).
 */
function fixtureAtHead() {
    const commit = gitCommitOf({ dir: ROOT });
    return gitFilesAt({ dir: ROOT, commit, prefix: FIXTURE_LOOKS_DIR }).map(({ path }) => ({
        path,
        text: gitTextAt({ dir: ROOT, commit, prefix: FIXTURE_LOOKS_DIR, path }),
    }));
}

/**
 * A private look repository outside this checkout: the fixture, renamed,
 * edited and added to, committed once. See the module's docblock.
 */
export function plantLooks(edit = (_path, text) => text, add = {}, { slug = 'fixture' } = {}) {
    const dir = realpathSync(mkdtempSync(join(tmpdir(), 'stall-planted-looks-')));
    const xdg = realpathSync(mkdtempSync(join(tmpdir(), 'stall-planted-looks-xdg-')));
    planted.push(dir, xdg);
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
    for (const file of fixtureAtHead()) {
        const path = file.path.startsWith('fixture/') ? `${slug}/${file.path.slice('fixture/'.length)}` : file.path;
        mkdirSync(join(dir, dirname(path)), { recursive: true });
        let text = file.text.replaceAll('t-fixture-private', PLANTED_CLASS).replaceAll('att-fixture-', PLANTED_ROW_PREFIX);
        if (path === 'index.json') {
            text = text.replace('"slug": "fixture"', `"slug": "${slug}"`);
        }
        writeFileSync(join(dir, path), edit(path, text));
    }
    for (const [path, contents] of Object.entries(add)) {
        mkdirSync(join(dir, dirname(path)), { recursive: true });
        writeFileSync(join(dir, path), contents);
    }
    git('add', '-A');
    git('commit', '-q', '-m', 'planted');
    return {
        dir,
        env,
        git,
        head: () => git('rev-parse', 'HEAD'),
        selection: { [SELECTION_ENV.target]: 'preview', [SELECTION_ENV.dir]: dir },
    };
}

/** `css` with `rule` placed before its reduce block — where a look sheet's rules go. */
export function beforeReduce(css, rule) {
    const at = css.lastIndexOf('@media (prefers-reduced-motion: reduce)');
    if (at < 0) {
        throw new Error('the sheet has no reduce block to plant before');
    }
    return `${css.slice(0, at)}${rule}\n\n${css.slice(at)}`;
}

/** WOFF2 UIntBase128 (the spec's §4.1), encoded. */
function base128(value) {
    const bytes = [];
    let n = value;
    do {
        bytes.unshift(n & 0x7f);
        n = Math.floor(n / 128);
    } while (n > 0);
    for (let i = 0; i < bytes.length - 1; i += 1) {
        bytes[i] |= 0x80;
    }
    return Buffer.from(bytes);
}

/**
 * A WOFF2 holding one table, `name`, with `records` (`{ id, text }`, each
 * a Windows-platform UTF-16BE string): enough for the face checks' reader,
 * nothing a browser would draw a glyph from. Deterministic.
 */
export function syntheticWoff2(records) {
    const strings = records.map((record) => Buffer.from(record.text, 'utf16le').swap16());
    const storage = 6 + records.length * 12;
    const table = Buffer.alloc(storage + strings.reduce((sum, s) => sum + s.length, 0));
    table.writeUInt16BE(0, 0);
    table.writeUInt16BE(records.length, 2);
    table.writeUInt16BE(storage, 4);
    let offset = 0;
    records.forEach((record, i) => {
        const at = 6 + i * 12;
        table.writeUInt16BE(3, at);
        table.writeUInt16BE(1, at + 2);
        table.writeUInt16BE(0x409, at + 4);
        table.writeUInt16BE(record.id, at + 6);
        table.writeUInt16BE(strings[i].length, at + 8);
        table.writeUInt16BE(offset, at + 10);
        strings[i].copy(table, storage + offset);
        offset += strings[i].length;
    });
    const stream = brotliCompressSync(table);
    // One directory entry: flags 5 is the known tag `name`, version 0 (untransformed).
    const directory = Buffer.concat([Buffer.from([5]), base128(table.length)]);
    const head = Buffer.alloc(48);
    head.write('wOF2', 0, 'latin1');
    head.writeUInt32BE(0x00010000, 4);
    head.writeUInt32BE(48 + directory.length + stream.length, 8);
    head.writeUInt16BE(1, 12);
    head.writeUInt32BE(12 + 16 + table.length, 16);
    head.writeUInt32BE(stream.length, 20);
    head.writeUInt16BE(1, 24);
    return Buffer.concat([head, directory, stream]);
}

/**
 * An OFL 1.1 text of the shape a font project ships, for `holder`,
 * reserving `reserved` when given: a header of its own, then the licence's
 * body whole, from the tracked `src/ui/fonts/LICENSE-OFL.txt` (a face's
 * licence carries the OFL itself, not a mention of it).
 */
export function oflText(holder, reserved) {
    const tracked = readFileSync(join(ROOT, 'src', 'ui', 'fonts', 'LICENSE-OFL.txt'), 'utf8');
    const body = tracked.slice(tracked.indexOf('SIL OPEN FONT LICENSE Version 1.1'));
    return [
        `Copyright 2024 ${holder}${reserved === undefined ? '' : `, with Reserved Font Name "${reserved}"`}.`,
        '',
        'This Font Software is licensed under the SIL Open Font License, Version 1.1.',
        'This license is copied below, and is also available with a FAQ at:',
        'https://openfontlicense.org',
        '',
        '',
        '-----------------------------------------------------------',
        body,
    ].join('\n');
}
