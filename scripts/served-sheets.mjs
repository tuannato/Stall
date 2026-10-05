/**
 * The sheets a build serves, with their text — the one list every static
 * guard over stylesheets reads (step 8e1), so a private look's sheet cannot
 * be skipped by one guard while another reads it.
 *
 * `servedSheets()` is the role table's `SERVED_SHEETS`
 * (`scripts/sheet-roles.mjs`, which keeps its public meaning: the sheets
 * this repository holds), each with its text read from the disk, **and one
 * row per private look a run reads**, with role `private` — a look sheet no
 * build bundles (`load: 'worn'`), scoped under its index's class, its text
 * the commit's blob and never the disk (`scripts/private-looks.mjs`). Which
 * private looks a run reads:
 *
 * - **the selection**, when the environment names one
 *   (`STALL_LOOKS_TARGET`, `STALL_LOOKS_DIR`, `STALL_LOOKS_COMMIT` —
 *   `scripts/looks-selection.mjs`): the looks a build with that selection
 *   carries (`includedEntries`), read exactly as the build reads them
 *   (`selectedIndex`). This is how a deploy job's `pnpm test`, run with the
 *   build's own selection, holds the real look to every static guard. **A
 *   vitest run reads it too**: what selects nothing under vitest is the
 *   app's virtual module (`private-looks-build.mjs`), so app-level tests
 *   read the same on every machine; a guard over sheets reads what the run
 *   names, and a red there is about the look named;
 * - **the tracked fixture, always, for the static guards**
 *   (`{ fixture: true }`, `guardSheets()`): every look its index names, at
 *   the checkout's HEAD — or at the selection's commit when the selection
 *   names the fixture, so one look is never read twice — so every guard's
 *   private half has a subject in public CI and is never green over nothing
 *   (CLAUDE §6: a guard that quietly does not run is counted as coverage).
 *   The fixture is served by no build unless a run selects it; a command
 *   that measures what a build serves (the audit, a kit command) reads the
 *   selection alone.
 *
 * A half selection, an unknown target, an index the public lists refuse or
 * a commit that is not there throws, as the build does: a guard never reads
 * half a look. Read once per process for the guards (`guardSheets`).
 * Node built-ins and the private-look readers; a `.d.mts` beside it. Test:
 * `every-whole-sheet-guard-reads-the-served-sheets`
 * (`scripts/served-sheets.test.mjs`).
 */
import { readFileSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LOOK_FONTS_FILE } from './look-faces.mjs';
import { FIXTURE_LOOKS_DIR, selectionFromEnv } from './looks-selection.mjs';
import { PRIVATE_FILE_MODE, gitBlobAt, gitTextAt, publicLookFacts } from './private-looks.mjs';
import { includedEntries, selectedIndex, selectedTree } from './private-looks-build.mjs';
import { SERVED_SHEETS } from './sheet-roles.mjs';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** A private look's sheet's role in the merged list: none of `SERVED_SHEETS`' roles, so every public pin keeps its meaning. */
export const PRIVATE_ROLE = 'private';

/** Where a read's files sit, for messages: the subtree inside this checkout, a path under it, or the repository's own root. */
function displayDir(root, read) {
    if (read.prefix !== undefined) {
        return read.prefix;
    }
    const from = relative(realpathSync(root), read.dir);
    return from !== '' && !from.startsWith('..') && !isAbsolute(from) ? from.split(sep).join('/') : read.dir;
}

/** The looks `entries` of one repository read at `selection`, each with its files as git holds them. */
function readLooks({ root, selection, facts, source, git, gitEnv }) {
    const { commit, read, files, index } = selectedIndex({ root, selection, facts, git, env: gitEnv });
    const entries = source === 'fixture' ? index.looks : includedEntries(index, selection.target, facts);
    const base = displayDir(root, read);
    return entries.map((entry) => {
        const at = (path) => `${entry.slug}/${path}`;
        const plain = files.filter((file) => file.mode === PRIVATE_FILE_MODE);
        const text = (path) => gitTextAt({ ...read, path });
        const art = plain
            .filter((file) => file.path.startsWith(at('art/')))
            .map((file) => ({ name: file.path.slice(at('art/').length), bytes: gitBlobAt({ ...read, path: file.path }) }));
        const lookText = text(at('look.json'));
        let look;
        try {
            look = JSON.parse(lookText);
        } catch {
            look = undefined;
        }
        return Object.freeze({
            source,
            commit,
            entry,
            sheetPath: `${base}/${entry.slug}/sheet.css`,
            artDir: `${base}/${entry.slug}/art`,
            css: text(at('sheet.css')),
            lookText,
            look,
            art,
            fontsText: plain.some((file) => file.path === at(LOOK_FONTS_FILE)) ? text(at(LOOK_FONTS_FILE)) : undefined,
        });
    });
}

/**
 * The private looks a run reads: the selection `env` names (the looks its
 * build carries), and with `fixture` the tracked fixture whole. `gitEnv` is
 * the environment git runs in (a planted repository's, in a test).
 */
export async function privateLookReads({ root = ROOT, env = process.env, fixture = false, git, gitEnv = process.env, facts } = {}) {
    const known = facts ?? (await publicLookFacts());
    const selection = selectionFromEnv(env);
    const selectsFixture = selection !== undefined && selectedTree({ root, selection, git, env: gitEnv }).fixture;
    const out = [];
    if (fixture) {
        const at = { target: 'preview', dir: FIXTURE_LOOKS_DIR, ...(selectsFixture && selection.commit !== undefined ? { commit: selection.commit } : {}) };
        out.push(...readLooks({ root, selection: at, facts: known, source: 'fixture', git, gitEnv }));
    }
    if (selection !== undefined && !(fixture && selectsFixture)) {
        out.push(...readLooks({ root, selection, facts: known, source: 'selection', git, gitEnv }));
    }
    return out;
}

/** The art files a private look's sheet may name (`ownArt` for the look rules): every plain file of its `art/` but a licence text. */
export function ownArtOf(look) {
    return { dir: 'art', files: look.art.map((file) => file.name).filter((name) => !name.endsWith('.txt')) };
}

/** One private look as a row of the merged list. */
function privateRow(look) {
    return Object.freeze({
        path: look.sheetPath,
        role: PRIVATE_ROLE,
        lookClass: look.entry.cls,
        load: 'worn',
        artDir: look.artDir,
        css: look.css,
        ownArt: ownArtOf(look),
        look,
    });
}

/**
 * Every sheet a run serves, with its text: `SERVED_SHEETS` from the disk,
 * then each private look `privateLookReads` reads, as a `private` row.
 */
export async function servedSheets({ root = ROOT, env = process.env, fixture = false, git, gitEnv } = {}) {
    const rows = SERVED_SHEETS.map((sheet) => Object.freeze({ ...sheet, css: readFileSync(join(root, sheet.path), 'utf8') }));
    const looks = await privateLookReads({ root, env, fixture, git, gitEnv });
    return Object.freeze([...rows, ...looks.map(privateRow)]);
}

let guard;

/** What the static guards read: `servedSheets({ fixture: true })` from this checkout and this process's environment, once. */
export function guardSheets() {
    guard ??= servedSheets({ fixture: true });
    return guard;
}

/** The private rows of a merged list. */
export function privateRows(sheets) {
    return sheets.filter((sheet) => sheet.role === PRIVATE_ROLE);
}

/** Every look sheet of a merged list: the shipped looks', the kit's, the harness's fixture's and the private looks'. */
export function lookRows(sheets) {
    return sheets.filter((sheet) => ['look', 'kit', 'fixture', PRIVATE_ROLE].includes(sheet.role));
}
