/**
 * The private-look join, at build time (step 8b2): which private looks a
 * build carries, read from git at a commit, validated, linted, their art
 * re-serialised, and handed to the app as `virtual:stall-private-looks`.
 *
 * **A build carries a private look only when it is told to, by name.** The
 * selection is three environment variables, never a directory found on the
 * disk (the step-8 critic's items 4 and 12):
 *
 * - `STALL_LOOKS_TARGET` — `preview` (every look the index names) or
 *   `production` (only the looks whose id `RELEASED_LOOK_IDS` names);
 * - `STALL_LOOKS_DIR` — the private repository's root, or the tracked
 *   fixture's directory `layout/fixture-private-looks` (the one directory
 *   inside this checkout a build may read, through 8a's `prefix` road);
 * - `STALL_LOOKS_COMMIT` — optional, 40 lower-case hex; the repository's
 *   HEAD when absent. The files are the tree of that commit, never the disk:
 *   what the working tree holds beside it is not built.
 *
 * No variable set: no private look at all — the virtual module is an empty
 * list, which is the public build, byte for byte
 * (`a-build-with-no-released-look-is-the-public-build`). A selection that
 * names one of target and directory without the other, an unknown target or
 * a malformed commit fails the build rather than guessing. **A vitest run
 * selects nothing whatever the shell says** (`VITEST` is set there): the
 * suite reads the same on every machine, `looks/` on the disk or not, and a
 * test that wants a private look mocks the module with the tracked fixture.
 *
 * **The public lists decide; the index only agrees** (the critic's item 1,
 * the 8a critic's item 11(i)): `includedEntries` reads `RELEASED_LOOK_IDS`
 * and never the index's `stage` or `paid`, and `privateLooksProblems`
 * refuses an index whose copies disagree with `theme.ts` — so a release is a
 * reviewable public diff, and a private commit cannot free or release an id.
 * Whether a look is paid reaches the app the same way: the gate reads
 * `PAID_LOOK_IDS` (`lookTable.ts`); nothing paid travels in the module.
 *
 * Every included look, before Vite reads a byte of it (the critic's item 25):
 * its `look.json` through the app's own validator (`lookDataProblems`,
 * handed in by `vite.config.ts`, under the look's place, rows mintable); its
 * `sheet.css` through the look rules as a worn-only sheet over its own art
 * (`lintLookSheet`, `font-display` for a face included); every `art/*.svg`
 * through the allow-list (`svg-allow.mjs`, the critic's item 8). Any problem
 * fails the build, every problem listed. Then the sheet and the art are
 * written — the SVGs as **re-serialised**, never as given, and every file as
 * the commit's blob, never through an eol or attribute filter (the 8a
 * critic's item 11(iii)) — to a directory of this build's own under
 * `node_modules/.cache/stall-private-looks/`, removed when the build closes,
 * and the module imports each sheet from there with `?url`: emitted alone,
 * minified, hashed, its `url()`s rewritten to the built art, never in the
 * entry CSS. The module's data is `JSON.parse` of a string literal
 * (`privateLooksModuleCode`): a key named `__proto__` stays a key the
 * runtime validator refuses, and no character in a label can end the
 * literal.
 *
 * What this does not do yet, stated: the pin and the clean check
 * (`deploy/looks.commit`, `STALL_LOOKS_REQUIRED`) are 8c's; a look's faces'
 * notices, its og card and every whole-sheet guard over private sheets are
 * 8e's and 8j's. Node built-ins only; a `.d.mts` beside it. Tests:
 * `scripts/private-looks-build.test.mjs`.
 */
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import {
    FULL_COMMIT,
    PRIVATE_FILE_MODE,
    PRIVATE_INDEX,
    gitBlobAt,
    gitCommitOf,
    gitTextAt,
    gitTopOf,
    parsePrivateIndex,
    readPrivateLooksAt,
} from './private-looks.mjs';
import { sanitizeSvg } from './svg-allow.mjs';
import { lintLookSheet } from './workshop-css.mjs';

/** The module a build answers, and its resolved id. */
export const PRIVATE_LOOKS_MODULE = 'virtual:stall-private-looks';
const RESOLVED_MODULE = `\0${PRIVATE_LOOKS_MODULE}`;

/** The two targets a selection may name. */
export const LOOKS_TARGETS = Object.freeze(['preview', 'production']);

/** The environment variables that select a build's private looks. */
export const SELECTION_ENV = Object.freeze({
    target: 'STALL_LOOKS_TARGET',
    dir: 'STALL_LOOKS_DIR',
    commit: 'STALL_LOOKS_COMMIT',
});

/** The tracked fixture's directory, from the checkout's root: the one place inside this checkout a build reads a look from. */
export const FIXTURE_LOOKS_DIR = 'layout/fixture-private-looks';

/** Where a build writes the files it read from git, under the checkout's root. */
export const MATERIALISED_ROOT = 'node_modules/.cache/stall-private-looks';

const present = (value) => value !== undefined && value !== '';

/**
 * The selection `env` names: `undefined` when it names none, `{ target,
 * dir, commit? }` when it names one. Throws on half a selection, an unknown
 * target or a commit that is not 40 lower-case hex — a build that guessed
 * would carry the wrong looks to the wrong place.
 */
export function selectionFromEnv(env) {
    const target = env[SELECTION_ENV.target];
    const dir = env[SELECTION_ENV.dir];
    const commit = env[SELECTION_ENV.commit];
    if (!present(target) && !present(dir) && !present(commit)) {
        return undefined;
    }
    const problems = [];
    if (!LOOKS_TARGETS.includes(target)) {
        problems.push(`${SELECTION_ENV.target} is ${JSON.stringify(target ?? null)}, where a selection names one of ${LOOKS_TARGETS.join(', ')}`);
    }
    if (!present(dir)) {
        problems.push(`${SELECTION_ENV.dir} is not set, where a selection names the private repository's root (or ${FIXTURE_LOOKS_DIR})`);
    }
    if (present(commit) && !FULL_COMMIT.test(commit)) {
        problems.push(`${SELECTION_ENV.commit} is ${JSON.stringify(commit)}, where it is a full commit, 40 lower-case hex`);
    }
    if (problems.length > 0) {
        throw new Error(`private looks: the selection is not whole:\n  - ${problems.join('\n  - ')}`);
    }
    return { target, dir, ...(present(commit) ? { commit } : {}) };
}

/**
 * The entries of `index` a build for `target` carries — decided by the
 * public list, never the index's copies: `preview` carries every entry,
 * `production` only those whose id `facts.released` names. An entry whose
 * `stage` says `release` while the public list does not is not carried, and
 * one the public list releases is carried whatever its `stage` says (the
 * agreement check refuses both before this runs; this never relies on it).
 */
export function includedEntries(index, target, facts) {
    if (target === 'preview') {
        return [...index.looks];
    }
    if (target === 'production') {
        return index.looks.filter((entry) => facts.released.includes(entry.id));
    }
    throw new TypeError(`a build's target is one of ${LOOKS_TARGETS.join(', ')}, not ${JSON.stringify(target)}`);
}

/**
 * Where `selection.dir` is read from, relative to `root` (the checkout):
 * `{ dir, prefix, fixture }`. A repository's own root is read whole; the one
 * directory inside this checkout that may be selected is the tracked
 * fixture, read as a subtree of the checkout's commit (`fixture: true`, so
 * its class is its own). Anything else — a directory inside some
 * repository but not its root — is refused.
 */
export function selectedTree({ root, selection, git, env }) {
    const dir = resolve(root, selection.dir);
    const top = realpathSync(gitTopOf({ dir, git, env }));
    const here = realpathSync(dir);
    if (top === here) {
        return { dir: here, prefix: undefined, fixture: false };
    }
    const prefix = relative(top, here).split(sep).join('/');
    if (top !== realpathSync(root) || prefix !== FIXTURE_LOOKS_DIR) {
        throw new Error(
            `private looks: ${selection.dir} is inside a repository and not its root — a private look repository is read from its own root, and the one directory inside this checkout a build reads is ${FIXTURE_LOOKS_DIR}`,
        );
    }
    return { dir: top, prefix, fixture: true };
}

/** The index of the private repository `selection` names, at the selection's commit, with the tree it was read from. */
export function selectedIndex({ root, selection, facts, git, env }) {
    const tree = selectedTree({ root, selection, git, env });
    const commit = selection.commit ?? gitCommitOf({ dir: tree.dir, git, env });
    const read = { dir: tree.dir, commit, prefix: tree.prefix, git, env };
    const repo = readPrivateLooksAt({ ...read, facts, fixture: tree.fixture });
    if (repo.problems.length > 0 || repo.indexText === undefined) {
        throw new Error(`private looks at ${commit}:\n  - ${[...repo.problems, ...(repo.indexText === undefined ? [`no ${PRIVATE_INDEX}`] : [])].join('\n  - ')}`);
    }
    return { commit, read, files: repo.files, index: parsePrivateIndex(repo.indexText).index };
}

/**
 * Every included look of `selection`, read and checked: `{ commit, index,
 * looks }`, each look `{ entry, lookText, sheet, art }` with `art` the files
 * a build writes (`{ name, bytes }`, SVGs re-serialised). Throws one error
 * listing every problem — the repository's shape and index, then each
 * included look's data, sheet and art — or none.
 *
 * `validateLook(text, place)` is the app's own validator over a `look.json`
 * (`lookDataProblems` from `src/domain/lookData.ts`, handed in by
 * `vite.config.ts`, which can import TypeScript); it answers a list of
 * problems.
 */
export function readSelectedLooks({ root, selection, facts, validateLook, git, env }) {
    const { commit, read, files, index } = selectedIndex({ root, selection, facts, git, env });
    const problems = [];
    const looks = [];
    for (const entry of includedEntries(index, selection.target, facts)) {
        const at = (path) => `${entry.slug}/${path}`;
        const lookText = gitTextAt({ ...read, path: at('look.json') });
        for (const why of validateLook(lookText, { id: entry.id, sheetClass: entry.cls, file: at('look.json'), mintable: true })) {
            problems.push(`${at('look.json')}: ${why}`);
        }
        const artFiles = files
            .filter((file) => file.mode === PRIVATE_FILE_MODE && file.path.startsWith(at('art/')))
            .map((file) => file.path.slice(at('art/').length));
        const sheet = gitTextAt({ ...read, path: at('sheet.css') });
        const sheetArt = artFiles.filter((name) => !name.endsWith('.txt'));
        for (const why of lintLookSheet(sheet, { lookClass: entry.cls, load: 'worn', ownArt: { dir: 'art', files: sheetArt } })) {
            problems.push(`${at('sheet.css')}: ${why}`);
        }
        const art = [];
        for (const name of sheetArt) {
            if (name.endsWith('.svg')) {
                const { svg, problems: refused } = sanitizeSvg(gitTextAt({ ...read, path: at(`art/${name}`) }));
                for (const why of refused) {
                    problems.push(`${at(`art/${name}`)}: ${why}`);
                }
                if (svg !== undefined) {
                    art.push({ name, bytes: Buffer.from(svg, 'utf8') });
                }
            } else {
                art.push({ name, bytes: gitBlobAt({ ...read, path: at(`art/${name}`) }) });
            }
        }
        looks.push({ entry, lookText, sheet, art });
    }
    if (problems.length > 0) {
        throw new Error(`private looks at ${commit}:\n  - ${problems.join('\n  - ')}`);
    }
    return { commit, index, looks };
}

/**
 * Write `looks` (from `readSelectedLooks`) under `into`: `<slug>/sheet.css`
 * and `<slug>/art/<name>`, the bytes the reader produced. Answers the
 * module's entries, each with the absolute path of its sheet.
 */
export function materialise(looks, into) {
    return looks.map(({ entry, lookText, sheet, art }) => {
        const dir = join(into, entry.slug);
        mkdirSync(join(dir, 'art'), { recursive: true });
        const sheetPath = join(dir, 'sheet.css');
        writeFileSync(sheetPath, sheet, 'utf8');
        for (const { name, bytes } of art) {
            writeFileSync(join(dir, 'art', name), bytes);
        }
        return { id: entry.id, sheetClass: entry.cls, sheetPath, lookText };
    });
}

/**
 * `value` as a JavaScript string literal safe anywhere a module's source
 * goes: `JSON.stringify`'s, with `<`, `>`, U+2028 and U+2029 written as
 * escapes.
 */
export function jsString(value) {
    return JSON.stringify(String(value)).replace(
        /[<>\u2028\u2029]/g,
        (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`,
    );
}

/**
 * The module's source for `entries` (`{ id, sheetClass, sheetPath, lookText }`):
 * `export const privateLooks = [];` for none — the public build's module,
 * the same bytes whether nothing was selected or the selection carries
 * nothing — and otherwise one `?url` import per sheet and one entry per
 * look, its `look.json` re-parsed at run time from a string literal (so
 * every key, `__proto__` included, is the validator's to refuse, and the
 * data is the file's text, unchanged).
 */
export function privateLooksModuleCode(entries) {
    if (entries.length === 0) {
        return 'export const carriesPrivateLooks = false;\nexport const privateLooks = [];\n';
    }
    const imports = entries.map((entry, i) => `import sheet${i} from ${jsString(`${entry.sheetPath}?url`)};`);
    const items = entries.map((entry, i) => {
        if (!Number.isInteger(entry.id) || entry.id < 0 || entry.id > 0xff) {
            throw new TypeError(`a private look's id is one byte, not ${JSON.stringify(entry.id)}`);
        }
        return `{ id: ${entry.id}, sheetClass: ${jsString(entry.sheetClass)}, sheetUrl: sheet${i}, look: JSON.parse(${jsString(entry.lookText)}) }`;
    });
    return `${imports.join('\n')}\nexport const carriesPrivateLooks = true;\nexport const privateLooks = [\n    ${items.join(',\n    ')},\n];\n`;
}

/**
 * The Vite plugin: answers `virtual:stall-private-looks`. `facts` are the
 * public lists (`PRIVATE_LOOK_IDS`, `PAID_LOOK_IDS`, `RELEASED_LOOK_IDS`,
 * the shipped classes); `validateLook` the app's validator; `env` where the
 * selection is read (`process.env`). The selection is read in `buildStart`,
 * so each build reads its own.
 */
export function privateLooksPlugin({ facts, validateLook, env = process.env, git } = {}) {
    let root = process.cwd();
    let entries = [];
    let written;
    const cleanup = () => {
        if (written !== undefined) {
            rmSync(written, { recursive: true, force: true });
            written = undefined;
        }
    };
    return {
        name: 'stall-private-looks',
        enforce: 'pre',
        configResolved(config) {
            root = config.root;
        },
        buildStart() {
            cleanup();
            entries = [];
            const selection = env.VITEST === undefined ? selectionFromEnv(env) : undefined;
            if (selection === undefined) {
                return;
            }
            const { looks } = readSelectedLooks({ root, selection, facts, validateLook, git, env });
            if (looks.length === 0) {
                return;
            }
            const parent = join(root, MATERIALISED_ROOT);
            mkdirSync(parent, { recursive: true });
            written = mkdtempSync(join(parent, 'build-'));
            entries = materialise(looks, written);
        },
        resolveId(id) {
            return id === PRIVATE_LOOKS_MODULE ? RESOLVED_MODULE : null;
        },
        load(id) {
            return id === RESOLVED_MODULE ? privateLooksModuleCode(entries) : null;
        },
        buildEnd(error) {
            if (error !== undefined) {
                cleanup();
            }
        },
        closeBundle() {
            cleanup();
        },
    };
}

