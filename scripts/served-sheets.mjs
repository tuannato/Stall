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
 *   the checkout's HEAD — a selection naming the fixture at HEAD is read
 *   once, and one naming it at another commit is refused — so every guard's
 *   private half has a subject in public CI and is never green over nothing
 *   (CLAUDE §6: a guard that quietly does not run is counted as coverage).
 *   The fixture is served by no build unless a run selects it; a command
 *   that measures what a build serves (the audit, a kit command's flash
 *   rule) reads the selection alone (`servedSheets()`), and with nothing
 *   selected runs no git at all.
 *
 * A half selection, an unknown target, an index the public lists refuse, a
 * `look.json` that is not JSON or a commit that is not there throws, as the
 * build does: a guard never reads half a look. Read once per process for the
 * guards (`guardSheets`), which says on stderr which private looks it read
 * and, under `STALL_LOOKS_REQUIRED`, refuses a run that did not read the
 * looks the build carries.
 * Node built-ins and the private-look readers; a `.d.mts` beside it. Test:
 * `every-whole-sheet-guard-reads-the-served-sheets`
 * (`scripts/served-sheets.test.mjs`).
 */
import { readFileSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LOOK_FONTS_FILE } from './look-faces.mjs';
import { FIXTURE_LOOKS_DIR, REQUIRED_ENV, selectionFromEnv, selectionRequired } from './looks-selection.mjs';
import { PRIVATE_FILE_MODE, gitBlobAt, gitCommitOf, gitTextAt, publicLookFacts } from './private-looks.mjs';
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
    const { commit, packedTree, read, files, index } = selectedIndex({ root, selection, facts, git, env: gitEnv });
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
        } catch (error) {
            // The build refuses it (`validateLook`); a guard that read it as
            // a look with no rows would check less and say nothing (the 8e1
            // critic's item 6).
            throw new Error(`private looks: ${base}/${entry.slug}/look.json at ${commit} is not JSON (${error.message})`);
        }
        return Object.freeze({
            source,
            commit,
            packedTree,
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
 * build carries), and with `fixture` the tracked fixture whole, at HEAD.
 * `gitEnv` is the environment git runs in (a planted repository's, in a
 * test).
 *
 * - **A selection of the fixture at another commit is refused** with
 *   `fixture` (the 8e1 critic's item 7): the guards read the tracked fixture
 *   at HEAD, and one look under one class read twice, or at a commit other
 *   than HEAD in its place, would be neither. Without `fixture` — what a
 *   build serves — it is read at its commit as any selection is.
 * - **`required`** (`STALL_LOOKS_REQUIRED`, the deploy job's): a run with no
 *   selection throws, and so does one that did not read, at the selection's
 *   commit, every look a build with that selection carries — the guards hold
 *   the looks the build ships, or the run fails (the critic's item 2).
 */
export async function privateLookReads({ root = ROOT, env = process.env, fixture = false, required = false, git, gitEnv = process.env, facts } = {}) {
    const known = facts ?? (await publicLookFacts());
    const selection = selectionFromEnv(env);
    if (required && selection === undefined) {
        throw new Error(
            `private looks: ${REQUIRED_ENV} is set and this run selects no private look — the guards read the looks the build carries, so the run names them (STALL_LOOKS_TARGET, STALL_LOOKS_DIR)`,
        );
    }
    const selectsFixture = selection !== undefined && selectedTree({ root, selection, git, env: gitEnv }).fixture;
    if (fixture && selectsFixture && selection.commit !== undefined && selection.commit !== gitCommitOf({ dir: root, git, env: gitEnv })) {
        throw new Error(
            `private looks: the selection names the tracked fixture at ${selection.commit}, and the guards read the fixture at HEAD — select a copy of it in a repository of its own to read another commit`,
        );
    }
    const out = [];
    if (fixture) {
        out.push(...readLooks({ root, selection: { target: 'preview', dir: FIXTURE_LOOKS_DIR }, facts: known, source: 'fixture', git, gitEnv }));
    }
    if (selection !== undefined && !(fixture && selectsFixture)) {
        out.push(...readLooks({ root, selection, facts: known, source: 'selection', git, gitEnv }));
    }
    if (required) {
        const { commit, index } = selectedIndex({ root, selection, facts: known, git, env: gitEnv });
        for (const entry of includedEntries(index, selection.target, known)) {
            if (!out.some((look) => look.entry.cls === entry.cls && look.commit === commit)) {
                throw new Error(`private looks: ${REQUIRED_ENV} is set and this run did not read ${entry.slug} (${entry.cls}) at ${commit}, which the build carries`);
            }
        }
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
export async function servedSheets({ root = ROOT, env = process.env, fixture = false, required = false, git, gitEnv } = {}) {
    const rows = SERVED_SHEETS.map((sheet) => Object.freeze({ ...sheet, css: readFileSync(join(root, sheet.path), 'utf8') }));
    const looks = await privateLookReads({ root, env, fixture, required, git, gitEnv });
    return Object.freeze([...rows, ...looks.map(privateRow)]);
}

/**
 * The line the guards say which private looks they read with: each class,
 * where it came from, its commit and its packed tree — the tree a pin names
 * beside its commit, so a deploy's public log, where the commit read is the
 * one the road carried and not the pinned one, still names the pin's tree on
 * this line (the 8c2 critic's item 4).
 */
export function guardLine(sheets) {
    const rows = privateRows(sheets);
    return `guards read private looks: ${rows.length === 0 ? 'none' : rows.map((row) => `${row.lookClass} (${row.look.source} @${row.look.commit.slice(0, 12)}, tree ${row.look.packedTree.slice(0, 12)})`).join(', ')}\n`;
}

let guard;

/**
 * What the static guards read: `servedSheets({ fixture: true })` from this
 * checkout and this process's environment, once — `required` when
 * `STALL_LOOKS_REQUIRED` is set — saying on stderr which private looks it
 * read (`guardLine`), so a run that read only the fixture where a look was
 * meant says so on screen.
 */
export function guardSheets() {
    guard ??= servedSheets({ fixture: true, required: selectionRequired(process.env) }).then((sheets) => {
        process.stderr.write(guardLine(sheets));
        return sheets;
    });
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
