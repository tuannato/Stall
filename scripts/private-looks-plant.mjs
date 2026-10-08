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
 * `PRIVATE_MODES_REFUSED`).
 *
 * **And the canary, from public bytes** (`canaryFiles`, `plantCanary`):
 * the recipe that rebuilds `CANARY_TREE` from this repository at the
 * commit the canary was made from (`CANARY_MADE_FROM`) — what
 * `the-canary-is-public-bytes` holds the literal to, and the one repository
 * the deploy road's gates admit, for the tests that need a canary that
 * packs. Node built-ins only; a `.d.mts` beside it.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync } from 'node:zlib';
import { FIXTURE_LOOKS_DIR, SELECTION_ENV } from './looks-selection.mjs';
import { gitBlobAt, gitCommitOf, gitFilesAt, gitTextAt } from './private-looks.mjs';

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
    const files = {};
    for (const file of fixtureAtHead()) {
        const path = file.path.startsWith('fixture/') ? `${slug}/${file.path.slice('fixture/'.length)}` : file.path;
        let text = file.text.replaceAll('t-fixture-private', PLANTED_CLASS).replaceAll('att-fixture-', PLANTED_ROW_PREFIX);
        if (path === 'index.json') {
            text = text.replace('"slug": "fixture"', `"slug": "${slug}"`);
        }
        files[path] = edit(path, text);
    }
    return committed({ ...files, ...add });
}

/**
 * `files` (`{ path: text | Buffer }`) committed once into a fresh repository
 * under the OS's temporary directory, on `main`, by a planted identity with
 * no mailbox — no global or system config, no user exclude file.
 */
function committed(files) {
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
    for (const [path, contents] of Object.entries(files)) {
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

/**
 * The commit of this repository the canary was made from (step 8c1): its
 * tracked fixture and its JetBrains Mono Latin subset and licence are what
 * the canary's bytes are made of. Read there, never at HEAD, so a later
 * edit of the fixture does not move the canary — the fixture is the
 * guards' subject and changes with them; the canary is a pinned tree and
 * changes only with a new pin.
 */
export const CANARY_MADE_FROM = '6ca82d513b2f364e63948e6d5002f3a8bc888399';

/**
 * Where the fixture stood at `CANARY_MADE_FROM`, written here rather than
 * read from HEAD's `FIXTURE_LOOKS_DIR`: the recipe reads one fixed commit,
 * its paths included, so a later move of the fixture moves nothing here
 * (the third 8c2 critic's item 5b).
 */
const CANARY_FIXTURE_DIR = 'layout/fixture-private-looks';

/** The canary's sheet opens with the copyright line, as the canary carries it (PLAN § Decided, owner 2026-10-07). */
const CANARY_COPYRIGHT_LINE = '/*! © 2026 tuannato (stall.cash) */\n';

/** The canary's own CSS beyond the fixture's, renamed: a face of its own on the tagline, placed after the rule that names the sheet. */
const CANARY_FACE_CSS = `@font-face {
    font-family: t-canary-mono;
    src: url(./art/jetbrains-mono-latin.woff2) format('woff2');
    font-display: swap;
}

.t-canary .stall-tagline {
    font-family: t-canary-mono;
}

`;

/** Where the face's CSS goes: after the rule that names the sheet, once. */
const CANARY_SHEET_NAMED = '.t-canary {\n    --look-sheet: t-canary;\n}\n\n';

/** The canary's `fonts.json`: the face it serves, named, with its licence. */
const CANARY_FONTS_JSON = `{
    "fonts": [
        {
            "name": "JetBrains Mono",
            "files": { "jetbrains-mono-latin.woff2": "Latin" },
            "licence": "LICENSE-OFL-jetbrains-mono.txt"
        }
    ]
}
`;

/**
 * The byte of the face the canary changes, and to what: offset 115, the
 * first byte of the brotli stream, 0x5B to 0x5F (the stream's window field
 * 22 to 24) — a face of its own whose font tables are the tracked file's
 * (CLAUDE.md §6, "A look's face is never the bytes of a face Stall serves").
 */
const CANARY_FACE_BYTE = Object.freeze({ at: 115, from: 0x5b, to: 0x5f });

/**
 * The canary's packed tree, as files (`{ path: text | Buffer }`): every
 * byte read from this repository at `at` (`CANARY_MADE_FROM`), by the paths
 * that commit holds them at (`CANARY_FIXTURE_DIR`), git's own
 * bytes with replace objects off (`gitBlobAt`), the tracked fixture renamed
 * (`t-fixture-private` to `t-canary`, `att-fixture-` to `att-canary-`, its
 * labels' "Fixture " to "Canary ", the index's slug), the sheet opened by
 * the copyright line and given the face's CSS, the tracked JetBrains Mono
 * Latin subset with one byte changed, its tracked OFL licence and the
 * `fonts.json` naming them. No `README.md` or `LOG.md`: the packed tree
 * leaves them out. Throws when the commit no longer holds what the recipe
 * reads in the shape it reads it.
 */
export function canaryFiles({ at = CANARY_MADE_FROM } = {}) {
    const read = (path) => gitBlobAt({ dir: ROOT, commit: at, path });
    const text = (path) => read(path).toString('utf8');
    const rename = (from) =>
        from.replaceAll('t-fixture-private', 't-canary').replaceAll('att-fixture-', 'att-canary-').replaceAll('"Fixture ', '"Canary ').replace('"slug": "fixture"', '"slug": "canary"');
    const sheet = rename(text(`${CANARY_FIXTURE_DIR}/fixture/sheet.css`));
    if (sheet.split(CANARY_SHEET_NAMED).length !== 2) {
        throw new Error(`the fixture's sheet at ${at.slice(0, 12)} does not name itself once in the shape the canary recipe reads`);
    }
    const face = Buffer.from(read('src/ui/fonts/jetbrains-mono-latin.woff2'));
    if (face[CANARY_FACE_BYTE.at] !== CANARY_FACE_BYTE.from) {
        throw new Error(`the tracked JetBrains Mono Latin subset at ${at.slice(0, 12)} is not the face the canary changed one byte of`);
    }
    face[CANARY_FACE_BYTE.at] = CANARY_FACE_BYTE.to;
    return {
        'index.json': rename(text(`${CANARY_FIXTURE_DIR}/index.json`)),
        'canary/look.json': rename(text(`${CANARY_FIXTURE_DIR}/fixture/look.json`)),
        'canary/sheet.css': `${CANARY_COPYRIGHT_LINE}${sheet.replace(CANARY_SHEET_NAMED, `${CANARY_SHEET_NAMED}${CANARY_FACE_CSS}`)}`,
        'canary/fonts.json': CANARY_FONTS_JSON,
        'canary/art/ground.svg': read(`${CANARY_FIXTURE_DIR}/fixture/art/ground.svg`),
        'canary/art/under-name.svg': read(`${CANARY_FIXTURE_DIR}/fixture/art/under-name.svg`),
        'canary/art/jetbrains-mono-latin.woff2': face,
        'canary/art/LICENSE-OFL-jetbrains-mono.txt': read('src/ui/fonts/LICENSE-OFL-jetbrains-mono.txt'),
    };
}

/**
 * A private look repository holding the canary from public bytes
 * (`canaryFiles`) and a planted `README.md` and `LOG.md`, which its packed
 * tree leaves out — so its packed tree is `CANARY_TREE`. `edit(path,
 * contents)` sees each canary file (a string, or a Buffer for the face) and
 * answers what to commit, or `undefined` to leave it out; `add` puts files
 * beside them. Committed once, as `plantLooks` commits.
 */
export function plantCanary(edit = (_path, contents) => contents, add = {}) {
    const files = { 'README.md': 'a planted canary repository\n', 'LOG.md': 'a planted log\n' };
    for (const [path, contents] of Object.entries(canaryFiles())) {
        const kept = edit(path, contents);
        if (kept !== undefined) {
            files[path] = kept;
        }
    }
    return committed({ ...files, ...add });
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
