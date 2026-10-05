/**
 * A private look repository, as data (step 8): the files it may hold, the
 * index that names its looks, and how both are read — from git at a commit,
 * never from the disk.
 *
 * A private look is one whose files live in a repository this one does not
 * publish, cloned at the top-level `looks/` of a checkout that builds it
 * (ignored by exactly `/looks/` and refused by the look-art guard if forced in
 * — `scripts/licence-map-lib.mjs`). **Data only**: nothing in that repository
 * runs, so it may hold the index, its README and design log, and per look a
 * `look.json`, a `sheet.css`, an `og.png` and an `art/` directory of SVGs,
 * faces and the faces' OFL texts — no script, no page, no symlink, no
 * gitlink, no executable bit (`privateFileProblems`).
 *
 * **The public lists decide, the index only agrees** (the step-8 critic's
 * item 1): which ids a private look may take, which are paid and which may
 * reach production are literals in `src/domain/theme.ts`
 * (`PRIVATE_LOOK_IDS`, `PAID_LOOK_IDS`, `RELEASED_LOOK_IDS`), and an index
 * whose `paid` or `stage` disagrees with them is refused, so a release is a
 * reviewable public diff and never an opaque pin bump.
 *
 * **Read from git, never the disk** (the critic's item 25): the files are
 * the tree of one commit (`gitFilesAt`), so a `.DS_Store` Finder drops into
 * the clone, or anything else untracked there, is not a file of the look.
 * The pin that names that commit (`deploy/looks.commit`) and the clean check
 * arrive with the deploy road (8c); the reader here takes the commit as an
 * argument.
 *
 * Pure checks over facts the caller reads, plus the two git readers — Node
 * built-ins only. A `.d.mts` beside it, because a TypeScript test importing
 * an untyped `.mjs` breaks `tsc` (TS7016). Tests:
 * `a-private-file-outside-the-allow-list-fails`,
 * `a-private-look-id-is-reserved-and-unshared`,
 * `a-private-index-cannot-free-a-reserved-id`, `a-release-is-a-public-diff`,
 * `private-files-are-read-from-git-at-a-commit` (`scripts/private-looks.test.mjs`).
 */
import { execFileSync } from 'node:child_process';
import { OWN_ART_NAME } from './workshop-css.mjs';

/** The index at the repository's root. */
export const PRIVATE_INDEX = 'index.json';

/** The index's one schema; a later one is a new number and a new reader. */
export const PRIVATE_INDEX_SCHEMA = 1;

/** Where a look stands: `preview` builds carry it, `release` builds may (with its id in `RELEASED_LOOK_IDS`). */
export const PRIVATE_LOOK_STAGES = Object.freeze(['preview', 'release']);

/** The fields of one index entry, every one required, nothing else. */
export const PRIVATE_INDEX_FIELDS = Object.freeze(['id', 'slug', 'cls', 'stage', 'paid']);

/** A look's directory name: lower-case words joined by hyphens. */
export const PRIVATE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const PRIVATE_SLUG_MAX = 32;

/** A look's scoping class, one token under `t-` (`dressLook` adds it with `classList.add`). */
export const PRIVATE_LOOK_CLASS = /^t-[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const PRIVATE_LOOK_CLASS_MAX = 40;

/**
 * The classes the harness paints and no private look may take: the kit's,
 * the skeleton's and the step-6 fixture look's (`layout/workshopLook.ts`,
 * `layout/looks.ts`; held to them by `layout/looks.test.ts`). The shipped
 * looks' classes come from the theme table (`publicLookFacts`).
 */
export const HARNESS_LOOK_CLASSES = Object.freeze(['t-workshop', 't-skeleton', 't-fixture-worn']);

/** Files at the repository's root: the index, what the repository is, and the design log. */
export const PRIVATE_ROOT_FILES = Object.freeze([PRIVATE_INDEX, 'README.md', 'LOG.md']);

/** Files in a look's directory; the first two are required. */
export const PRIVATE_LOOK_FILES = Object.freeze(['look.json', 'sheet.css', 'og.png']);
export const PRIVATE_LOOK_REQUIRED = Object.freeze(['look.json', 'sheet.css']);

/** A face's licence text beside the face, in `art/`. */
export const PRIVATE_FACE_LICENCE = /^LICENSE-OFL(?:-[a-z0-9-]{1,64})?\.txt$/;

/** The one mode a file of a private look may have: a plain, non-executable blob. */
export const PRIVATE_FILE_MODE = '100644';

const MODE_WHY = {
    100755: 'an executable file',
    120000: 'a symlink',
    160000: 'a gitlink (another repository)',
};

const SHAPES =
    'index.json, README.md or LOG.md at the root; <slug>/look.json, <slug>/sheet.css or <slug>/og.png; <slug>/art/<name>.svg, <name>.woff2 or LICENSE-OFL-<name>.txt';

/** Why `path` is not a file a private look repository may hold, or undefined. */
function shapeProblem(path) {
    const parts = path.split('/');
    const slugOk = (slug) => PRIVATE_SLUG.test(slug) && slug.length <= PRIVATE_SLUG_MAX;
    if (parts.length === 1 && PRIVATE_ROOT_FILES.includes(parts[0])) {
        return undefined;
    }
    if (parts.length === 2 && slugOk(parts[0]) && PRIVATE_LOOK_FILES.includes(parts[1])) {
        return undefined;
    }
    if (parts.length === 3 && slugOk(parts[0]) && parts[1] === 'art' && (OWN_ART_NAME.test(parts[2]) || PRIVATE_FACE_LICENCE.test(parts[2]))) {
        return undefined;
    }
    return `not a file a private look repository holds (data only: ${SHAPES})`;
}

/**
 * Every file is one of the shapes above, a plain blob. `files`: `{ path,
 * mode }[]`, paths from the repository's root with forward slashes, modes as
 * git writes them. A script, a page, a stylesheet outside a look's
 * `sheet.css`, a nested directory, a symlink, a gitlink or an executable bit
 * is refused — nothing in the repository is ever run, and nothing reaches the
 * build that the shapes do not name.
 */
export function privateFileProblems(files) {
    const problems = [];
    for (const { path, mode } of files) {
        const shape = shapeProblem(path);
        if (shape !== undefined) {
            problems.push(`${JSON.stringify(path)}: ${shape}`);
        }
        if (mode !== PRIVATE_FILE_MODE) {
            problems.push(`${JSON.stringify(path)}: ${MODE_WHY[mode] ?? `mode ${mode}`}, where a private look holds plain files only`);
        }
    }
    return problems;
}

const isPlainObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * The index, parsed and shaped: `{ schema: 1, looks: [{ id, slug, cls,
 * stage, paid }] }`, no field missing and none beside them. Answers `{
 * index, problems }`; `index` is undefined whenever a problem was found, so
 * nothing downstream reads half an index.
 */
export function parsePrivateIndex(text) {
    let json;
    try {
        json = JSON.parse(text);
    } catch (error) {
        return { index: undefined, problems: [`${PRIVATE_INDEX}: not JSON (${error.message})`] };
    }
    const problems = [];
    if (!isPlainObject(json)) {
        return { index: undefined, problems: [`${PRIVATE_INDEX}: not an object`] };
    }
    for (const key of Object.keys(json)) {
        if (key !== 'schema' && key !== 'looks') {
            problems.push(`${PRIVATE_INDEX}: an unknown field ${JSON.stringify(key)}`);
        }
    }
    if (json.schema !== PRIVATE_INDEX_SCHEMA) {
        problems.push(`${PRIVATE_INDEX}: schema ${JSON.stringify(json.schema)}, where this reader knows ${PRIVATE_INDEX_SCHEMA}`);
    }
    if (!Array.isArray(json.looks)) {
        problems.push(`${PRIVATE_INDEX}: looks is not a list`);
        return { index: undefined, problems };
    }
    json.looks.forEach((entry, at) => {
        const where = `${PRIVATE_INDEX}: looks[${at}]`;
        if (!isPlainObject(entry)) {
            problems.push(`${where}: not an object`);
            return;
        }
        for (const key of Object.keys(entry)) {
            if (!PRIVATE_INDEX_FIELDS.includes(key)) {
                problems.push(`${where}: an unknown field ${JSON.stringify(key)}`);
            }
        }
        if (!Number.isInteger(entry.id) || entry.id < 0 || entry.id > 0xff) {
            problems.push(`${where}: id ${JSON.stringify(entry.id)} is not a one-byte theme id`);
        }
        if (typeof entry.slug !== 'string' || !PRIVATE_SLUG.test(entry.slug) || entry.slug.length > PRIVATE_SLUG_MAX) {
            problems.push(`${where}: slug ${JSON.stringify(entry.slug)} is not lower-case words joined by hyphens, at most ${PRIVATE_SLUG_MAX}`);
        }
        if (typeof entry.cls !== 'string' || !PRIVATE_LOOK_CLASS.test(entry.cls) || entry.cls.length > PRIVATE_LOOK_CLASS_MAX) {
            problems.push(`${where}: cls ${JSON.stringify(entry.cls)} is not one class token under t-, at most ${PRIVATE_LOOK_CLASS_MAX}`);
        }
        if (!PRIVATE_LOOK_STAGES.includes(entry.stage)) {
            problems.push(`${where}: stage ${JSON.stringify(entry.stage)} is not one of ${PRIVATE_LOOK_STAGES.join(', ')}`);
        }
        if (typeof entry.paid !== 'boolean') {
            problems.push(`${where}: paid ${JSON.stringify(entry.paid)} is not true or false`);
        }
    });
    return problems.length > 0 ? { index: undefined, problems } : { index: json, problems };
}

/**
 * The index against the public lists. `facts`: `{ reserved, paid, released,
 * shippedClasses }` — `PRIVATE_LOOK_IDS`, `PAID_LOOK_IDS`,
 * `RELEASED_LOOK_IDS` and the shipped rows' classes (`publicLookFacts`).
 *
 * - **Reserved and unshared**: an entry's id is one `PRIVATE_LOOK_IDS`
 *   reserves, and no two entries share an id, a slug or a class.
 * - **The index cannot free or release a reserved id**: `paid` is exactly
 *   whether `PAID_LOOK_IDS` names the id, and `stage` is `release` exactly
 *   when `RELEASED_LOOK_IDS` does — both directions, so the public list and
 *   the private index move in one reviewed pair.
 * - **Its own class**: never a shipped look's or the harness's.
 */
export function privateIndexProblems(index, { reserved, paid, released, shippedClasses }) {
    const problems = [];
    const taken = new Set([...shippedClasses, ...HARNESS_LOOK_CLASSES]);
    const seen = { id: new Map(), slug: new Map(), cls: new Map() };
    index.looks.forEach((entry, at) => {
        const where = `${PRIVATE_INDEX}: looks[${at}] (${entry.slug})`;
        if (!reserved.includes(entry.id)) {
            problems.push(`${where}: id 0x${entry.id.toString(16).padStart(2, '0')} is not reserved for a private look (PRIVATE_LOOK_IDS)`);
        }
        if (entry.paid !== paid.includes(entry.id)) {
            problems.push(
                `${where}: paid is ${entry.paid}, and PAID_LOOK_IDS says ${paid.includes(entry.id)} — whether a look is paid is the public list's to say`,
            );
        }
        if ((entry.stage === 'release') !== released.includes(entry.id)) {
            problems.push(
                `${where}: stage ${entry.stage}, and RELEASED_LOOK_IDS ${released.includes(entry.id) ? 'names' : 'does not name'} the id — a release is the public list's to make`,
            );
        }
        if (taken.has(entry.cls)) {
            problems.push(`${where}: cls ${entry.cls} is a shipped or harness look's class`);
        }
        for (const field of ['id', 'slug', 'cls']) {
            const first = seen[field].get(entry[field]);
            if (first !== undefined) {
                problems.push(`${where}: ${field} ${JSON.stringify(entry[field])} is looks[${first}]'s too`);
            } else {
                seen[field].set(entry[field], at);
            }
        }
    });
    return problems;
}

/**
 * The whole repository at one commit: its files (`privateFileProblems`), an
 * index there and valid (`parsePrivateIndex`, `privateIndexProblems`), every
 * look directory one the index names, and every look the index names with
 * its `look.json` and `sheet.css`. `files`: `{ path, mode }[]`; `indexText`:
 * the index's text, or undefined when there is none; `facts`: as
 * `privateIndexProblems` takes them. What `look.json` and `sheet.css` say is
 * read by the look's own validators, not here.
 */
export function privateLooksProblems({ files, indexText, facts }) {
    const problems = privateFileProblems(files);
    const paths = new Set(files.map((file) => file.path));
    if (!paths.has(PRIVATE_INDEX) || indexText === undefined) {
        problems.push(`no ${PRIVATE_INDEX} at the root: nothing names a look`);
        return problems;
    }
    const { index, problems: shape } = parsePrivateIndex(indexText);
    problems.push(...shape);
    if (index === undefined) {
        return problems;
    }
    problems.push(...privateIndexProblems(index, facts));
    const named = new Set(index.looks.map((entry) => entry.slug));
    const dirs = new Set([...paths].filter((path) => path.includes('/')).map((path) => path.slice(0, path.indexOf('/'))));
    for (const dir of [...dirs].sort()) {
        if (!named.has(dir)) {
            problems.push(`${dir}/: a directory the index does not name`);
        }
    }
    for (const entry of index.looks) {
        for (const file of PRIVATE_LOOK_REQUIRED) {
            if (!paths.has(`${entry.slug}/${file}`)) {
                problems.push(`${entry.slug}/${file}: the index names the look and the file is not there`);
            }
        }
    }
    return problems;
}

/**
 * The public lists a private index is held to, read from the theme table by
 * Node's own type stripping (`src/domain/theme.ts` imports nothing, the road
 * `scripts/look-flash.mjs` takes).
 */
export async function publicLookFacts() {
    const theme = await import('../src/domain/theme.ts');
    return {
        reserved: [...theme.PRIVATE_LOOK_IDS],
        paid: [...theme.PAID_LOOK_IDS],
        released: [...theme.RELEASED_LOOK_IDS],
        shippedClasses: theme.SHIPPED_THEMES.map(({ id }) => theme.decodeTheme(id).sheetClass),
    };
}

/** A commit named in full: 40 lower-case hex, never a ref or anything git could read as an option. */
export const FULL_COMMIT = /^[0-9a-f]{40}$/;

function requireCommit(commit) {
    if (typeof commit !== 'string' || !FULL_COMMIT.test(commit)) {
        throw new TypeError(`a private look repository is read at a full commit (40 lower-case hex), not ${JSON.stringify(commit)}`);
    }
}

const gitRun = (dir, args, { git = 'git', env = process.env } = {}) =>
    execFileSync(git, ['-C', dir, ...args], {
        env,
        encoding: 'utf8',
        maxBuffer: 256 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'pipe'],
    });

/**
 * Every file in the tree of `commit` in the repository at `dir`, with its
 * mode: `git ls-tree -r -z --full-tree`, so what the disk holds beside the
 * commit — untracked, ignored or uncommitted — is not a file of the look.
 * Throws when git cannot run or the commit is not there; never an empty
 * list for a failure.
 */
export function gitFilesAt({ dir, commit, git, env }) {
    requireCommit(commit);
    const out = gitRun(dir, ['ls-tree', '-r', '-z', '--full-tree', commit], { git, env });
    const files = [];
    for (const entry of out.split('\0')) {
        if (entry === '') {
            continue;
        }
        // "<mode> <type> <object>\t<path>"
        const m = /^(\d{6}) (\w+) [0-9a-f]+\t(.*)$/s.exec(entry);
        if (m === null) {
            throw new Error(`git ls-tree: an entry this reader does not know: ${JSON.stringify(entry)}`);
        }
        files.push({ path: m[3], mode: m[1] });
    }
    return files;
}

/** The text of `path` in the tree of `commit`: `git cat-file blob <commit>:<path>`. */
export function gitTextAt({ dir, commit, path, git, env }) {
    requireCommit(commit);
    return gitRun(dir, ['cat-file', 'blob', `${commit}:${path}`], { git, env });
}

/**
 * The private look repository at `dir`, at `commit`: its files and the
 * problems `privateLooksProblems` finds with `facts`. The index is read only
 * when the tree holds one as a plain file.
 */
export function readPrivateLooksAt({ dir, commit, facts, git, env }) {
    const files = gitFilesAt({ dir, commit, git, env });
    const index = files.find((file) => file.path === PRIVATE_INDEX && file.mode === PRIVATE_FILE_MODE);
    const indexText = index === undefined ? undefined : gitTextAt({ dir, commit, path: PRIVATE_INDEX, git, env });
    return { files, indexText, problems: privateLooksProblems({ files, indexText, facts }) };
}
