/**
 * The private-look join, at build time (step 8b2): which private looks a
 * build carries, read from git at a commit, validated, linted, their art
 * re-serialised, and handed to the app as `virtual:stall-private-looks`.
 *
 * **A build carries a private look only when it is told to, by name.** The
 * selection is three environment variables (`scripts/looks-selection.mjs`,
 * which every harness command uses to refuse one until 8e2), never a
 * directory found on the disk (the step-8 critic's items 4 and 12):
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
 * A build that carries a look says so in one line on stderr, whatever the
 * log level, so a forgotten shell export is on screen.
 *
 * **The public lists decide; the index only agrees** (the critic's item 1,
 * the 8a critic's item 11(i)): `includedEntries` reads `RELEASED_LOOK_IDS`
 * and never the index's `stage` or `paid`, and `privateLooksProblems`
 * refuses an index whose copies disagree with `theme.ts` — so a release is a
 * reviewable public diff, and a private commit cannot free or release an id.
 * Whether a look is paid reaches the app the same way: the gate reads
 * `PAID_LOOK_IDS` (`lookTable.ts`); nothing paid travels in the module.
 *
 * **Then every sheet at once** (`crossSheetProblems`, step 8e1): the flash
 * rule and the worn-only rules over the public table and the carried
 * sheets, as the kit's commands run them before they build. And under
 * `STALL_LOOKS_REQUIRED` (the deploy job's) a build that selects nothing
 * fails.
 *
 * Every included look, before Vite reads a byte of it (the critic's item 25):
 * its `look.json` through the app's own validator (`lookDataProblems`,
 * handed in by `vite.config.ts`, under the look's place, rows mintable); its
 * `sheet.css` through the look rules as a worn-only sheet over its own art
 * (`lintLookSheet`, `font-display` for a face included); every `art/*.svg`
 * through the allow-list (`svg-allow.mjs`, the critic's item 8); and its art
 * budget (`lookBudgetVerdict`: under the target, or under the cap with its
 * id in `OVER_TARGET_LOOK_IDS` and a `budgetReason` in its index — the two
 * held to each other by the index check), the same reading the weight guard prints, so a
 * road that builds without running the suite still refuses a look past it
 * (the weight-buckets critic's item 9). Any problem
 * fails the build, every problem listed. Then the sheet and the art are
 * written — the SVGs as **re-serialised**, never as given, and every file as
 * the commit's blob, never through an eol or attribute filter (the 8a
 * critic's item 11(iii)) — to a directory of this build's own in the OS's
 * temporary directory (`MATERIALISED_PREFIX`; never under `node_modules/`,
 * where a module-to-package reader filed the sheet as a package named
 * `.cache`), removed when the build closes, and the module imports each
 * sheet from there with `?url`: emitted alone, minified, hashed, its
 * `url()`s rewritten to the built art, never in the entry CSS — and, last,
 * opened with the copyright line (`LOOK_COPYRIGHT_LINE`, put back by
 * `stampCarriedSheets` in this plugin's `generateBundle`, since Vite's
 * minifier drops every `/*!` comment; the dist check holds it there once,
 * `the-served-sheet-carries-the-copyright-line`). The module
 * resolves to `\0stall:private-looks`, a Stall virtual module to the
 * notices' classifier; its data is `JSON.parse` of a string literal
 * (`privateLooksModuleCode`): a key named `__proto__` stays a key the
 * runtime validator refuses, and no character in a label can end the
 * literal. **A build that selected anything and wrote to the disk checks
 * what it wrote** (`checkSelectedDist`, `check-dist-looks.mjs`'s core) and
 * fails on a problem, so a hand-run preview build is held as a deploy's is —
 * only once `writeBundle` saw the dist written, so an error thrown after the
 * build phase (the stamp's, say) is the error the build ends with
 * (`a-build-whose-stamp-fails-says-why`).
 *
 * **The faces a carried look serves are named in the notices it serves**
 * (step 8e1): each is checked before the build (`lookFaceProblems`: named in
 * the look's `fonts.json`, its OFL text beside it, served, presenting no
 * name its licence reserves), and the build writes `dist/licenses.txt` as
 * the public file followed by those faces (`noticesWithLookFonts`) — the
 * tracked `public/licenses.txt` stays the public build's.
 *
 * What this does not do, stated: it reads no pin. The commit is the
 * selection's (`STALL_LOOKS_COMMIT`, or the repository's HEAD); the pin
 * (`deploy/looks.commit`, `scripts/looks-pin.mjs`) is the deploy road's to
 * check — the `looks` job's pin and pack steps and the build job's unwrap
 * (`scripts/looks-artifact.mjs`), which leaves a repository whose one
 * commit carries the pinned tree, never the pinned commit itself — and a
 * harness run says whether the commit it measured is the pinned pair's. A
 * look's og card is 8j's. Node built-ins and one pure `src/domain` module
 * (`moodClass.ts`'s `sameOwner`, loaded by Node's type stripping and by the
 * config bundler); a `.d.mts` beside it. Tests:
 * `scripts/private-looks-build.test.mjs`.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';
import { artNamedBy, distFiles, distLooksProblems, lookFilesOf, lookSheetNames } from './check-dist-looks.mjs';
import { LOOK_FONTS_FILE, lookFaceProblems, lookFontNotices } from './look-faces.mjs';
import { packedTreeOf } from './looks-pin.mjs';
import { FIXTURE_LOOKS_DIR, LOOKS_TARGETS, REQUIRED_ENV, selectionFromEnv, selectionRequired } from './looks-selection.mjs';
import { noticesWithLookFonts } from './notices-lib.mjs';
import {
    LOOK_COPYRIGHT_LINE,
    PRIVATE_FACE_LICENCE,
    PRIVATE_FILE_MODE,
    PRIVATE_INDEX,
    gitBlobAt,
    gitCommitOf,
    gitTextAt,
    gitTopOf,
    parsePrivateIndex,
    readPrivateLooksAt,
} from './private-looks.mjs';
import { SERVED_SHEETS } from './sheet-roles.mjs';
import { sanitizeSvg } from './svg-allow.mjs';
import { lookArtBudget, lookBudgetVerdict, privateLookRows } from './weight-buckets.mjs';
import { flashReport, lintLookSheet, wornSheetProblems } from './workshop-css.mjs';
import { sameOwner } from '../src/domain/moodClass.ts';

export { FIXTURE_LOOKS_DIR, LOOKS_TARGETS, REQUIRED_ENV, SELECTION_ENV, selectionFromEnv } from './looks-selection.mjs';

/** The module a build answers, as the app imports it. */
export const PRIVATE_LOOKS_MODULE = 'virtual:stall-private-looks';

/**
 * The id it resolves to: a `\0stall:` virtual module, the shape the notices'
 * module classifier already reads as Stall's own (`isAllowedVirtual`), so a
 * build that carries a look is attributed like any other (the 8b2 critic's
 * item 2).
 */
export const RESOLVED_MODULE = '\0stall:private-looks';

/**
 * Where a build writes the files it read from git: a directory of its own in
 * the OS's temporary directory, removed when the build closes — never under
 * the checkout's `node_modules/`, where a module-to-package reader would file
 * the look's sheet as a package named `.cache` (the 8b2 critic's item 2).
 */
export const MATERIALISED_PREFIX = 'stall-private-looks-';

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
    // The tree a deploy pins beside the commit (`packedTreeOf`, the commit's
    // tree less its root README and log): one value on the owner's clone at
    // the pin and on the repository the deploy road carries, whose own
    // commit is another — so a public log that names the read commit names
    // the pinned tree beside it (the 8c2 critic's item 4).
    const packedTree = packedTreeOf({ dir: read.dir, commit, prefix: read.prefix, git, env });
    return { commit, packedTree, read, files: repo.files, index: parsePrivateIndex(repo.indexText).index };
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
export function readSelectedLooks({ root, selection, facts, validateLook, vars, git, env }) {
    if (vars === null || typeof vars !== 'object') {
        throw new TypeError("private looks: the cross-sheet checks read the theme table's values (`vars`, `themeVarValues`), and none were given");
    }
    const { commit, packedTree, read, files, index } = selectedIndex({ root, selection, facts, git, env });
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
        // Its faces: each named in fonts.json with the OFL text beside it,
        // served, and presenting no name its licence reserves
        // (`scripts/look-faces.mjs`) — what the deploy build's notices say.
        const fontsText = files.some((file) => file.path === at(LOOK_FONTS_FILE) && file.mode === PRIVATE_FILE_MODE)
            ? gitTextAt({ ...read, path: at(LOOK_FONTS_FILE) })
            : undefined;
        const faceArt = [
            ...art.filter((file) => file.name.endsWith('.woff2')),
            ...artFiles.filter((name) => PRIVATE_FACE_LICENCE.test(name)).map((name) => ({ name, bytes: gitBlobAt({ ...read, path: at(`art/${name}`) }) })),
        ];
        const faceProblems = lookFaceProblems({ fontsText, art: faceArt, named: artNamedBy(sheet) });
        for (const why of faceProblems) {
            problems.push(`${entry.slug}/${why}`);
        }
        const fonts = faceProblems.length === 0 ? lookFontNotices({ fontsText, art: faceArt }) : [];
        // Its art budget (D-2026-10-06-08, the weight-buckets critic's item
        // 9): the reading `each-look-keeps-its-art-budget` prints, over the
        // sheet as written and the art as this build writes it — so a road
        // that builds without running the suite still refuses a look past
        // the cap, or between the target and the cap with no stated reason.
        // An SVG the allow-list refused is not read here; it fails the build
        // above.
        if (art.length === sheetArt.length) {
            let parsed;
            try {
                parsed = JSON.parse(lookText);
            } catch {
                parsed = undefined;
            }
            try {
                const reading = lookArtBudget({
                    sheet,
                    sheetFile: 'sheet.css',
                    files: new Map(art.map((file) => [`art/${file.name}`, file.bytes])),
                    rows: privateLookRows({ look: parsed }),
                });
                // A build log may be public: a refusal never carries a reason's text anyway.
                const verdict = lookBudgetVerdict({
                    look: entry.cls,
                    total: reading.total,
                    reason: entry.budgetReason,
                    listed: facts.overTarget.includes(entry.id),
                    publicLog: true,
                });
                if (!verdict.admitted) {
                    problems.push(`${entry.slug}: its art budget — ${verdict.line}`);
                }
            } catch (error) {
                problems.push(`${entry.slug}: its art budget could not be read (${error.message})`);
            }
        }
        looks.push({ entry, lookText, sheet, art, fonts });
    }
    problems.push(...sharedRowClasses(looks));
    problems.push(...crossSheetProblems({ root, looks, vars }));
    if (problems.length > 0) {
        throw new Error(`private looks at ${commit}:\n  - ${problems.join('\n  - ')}`);
    }
    return { commit, packedTree, index, looks };
}

/**
 * The checks that need every sheet a build serves at once, over the public
 * table read from `root` and the carried looks' sheets (the 8e1 critic's
 * item 2: a carried sheet reached `dist` without them, held only by a test
 * run that may not have read it): the flash rule (`flashReport`, with the
 * theme table's `vars`) — a rule in one sheet can re-time a keyframe another
 * declares — and the worn-only rules (`wornSheetProblems`: no keyframe or
 * face name another sheet declares, which a worn sheet loading after the
 * entry CSS would replace on every stall; no other sheet naming its class).
 * The kit's commands hold a creator's sheet to the same before they build
 * (`requireKit`). None for a build that carries nothing.
 */
export function crossSheetProblems({ root, looks, vars }) {
    if (looks.length === 0) {
        return [];
    }
    const sheets = [
        ...SERVED_SHEETS.map((sheet) => ({ ...sheet, css: readFileSync(join(root, sheet.path), 'utf8') })),
        ...looks.map((look) => ({ path: `${look.entry.slug}/sheet.css`, css: look.sheet, load: 'worn', lookClass: look.entry.cls })),
    ];
    return [
        ...flashReport(sheets.map((sheet) => ({ name: sheet.path, css: sheet.css })), { vars }).problems.map((why) => `the flash rule: ${why}`),
        ...wornSheetProblems(sheets),
    ];
}

/**
 * Every row class two included looks share, or one owns the other's child
 * (`sameOwner`): a row class is its look's own
 * (`a-private-row-class-is-its-looks-own`; a shipped row's class is the
 * validator's to refuse). Over each look's `look.json` as parsed JSON; a
 * file that does not parse has said so already.
 */
export function sharedRowClasses(looks) {
    const rows = looks.flatMap(({ entry, lookText }) => {
        let json;
        try {
            json = JSON.parse(lookText);
        } catch {
            return [];
        }
        return [...(json?.moods ?? []), ...(json?.decorations ?? [])]
            .map((row) => row?.cls)
            .filter((cls) => typeof cls === 'string')
            .map((cls) => ({ slug: entry.slug, cls }));
    });
    const out = [];
    rows.forEach((a, i) => {
        for (const b of rows.slice(i + 1)) {
            if (a.slug !== b.slug && sameOwner(a.cls, b.cls)) {
                out.push(`${a.slug}/look.json: class ${a.cls} and ${b.slug}/look.json's ${b.cls} share an owner — a row class is its look's own`);
            }
        }
    });
    return out;
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
 * `css` with `LOOK_COPYRIGHT_LINE` and a newline at its head, once: a sheet
 * that already opens with the line (a minifier that kept it) has that one
 * taken off first, so the line is never doubled, and the rest of the sheet
 * is never touched. Idempotent.
 */
export function withCopyrightLine(css) {
    const body = css.startsWith(LOOK_COPYRIGHT_LINE) ? css.slice(LOOK_COPYRIGHT_LINE.length).replace(/^\r?\n/, '') : css;
    return `${LOOK_COPYRIGHT_LINE}\n${body}`;
}

/**
 * Put the copyright line at the head of each carried look's emitted sheet
 * (PLAN § Decided, owner 2026-10-07): in `bundle` (Rollup's output, as
 * `generateBundle` hands it), the one CSS asset that names each entry's
 * class as its look (`--look-sheet`, read by `lookSheetNames` — the key the
 * dist check finds a carried sheet by, so the stamp and the check agree by
 * construction; every look sheet names itself once, on its bare class, and
 * the minifier keeps it) gets `withCopyrightLine`. Nothing else in the
 * bundle is touched. Answers the stamped file names. Throws when an entry's
 * class is named by no asset, or by more than one: a build that cannot find
 * the sheet it carries fails rather than serve it without the line (and
 * says so in its own words — `closeBundle` checks no dist this build never
 * wrote). No path is compared: Vite names a module's file with
 * `realpathSync.native`, whose spelling on a case-insensitive disk can
 * differ from any path this build holds (CRITIC-STEP-8C1B item 2).
 *
 * **The file name was computed before the line was added** (Vite's CSS
 * plugin emits the sheet with its name during `renderChunk`, from the
 * minified text; nothing later can move the name without renaming every
 * chunk that names it). The hash still identifies the content: the line is
 * a constant prefix, so two served sheets differ exactly when the two hashed
 * texts do. Vite does the same to every CSS asset already — it hashes a
 * sheet with `/*$vite$:1*\/` appended and strips that marker in its own
 * `generateBundle`. What the name does not follow is a change to the line
 * itself, which would serve new bytes under the old name to a cache that
 * kept the old ones — the line is a constant, changed only by an edit here.
 */
export function stampCarriedSheets(bundle, entries) {
    const stamped = [];
    for (const entry of entries) {
        const textOf = (file) => (typeof file.source === 'string' ? file.source : Buffer.from(file.source).toString('utf8'));
        const assets = Object.values(bundle).filter(
            (file) => file.type === 'asset' && file.fileName.endsWith('.css') && lookSheetNames(textOf(file)).includes(entry.sheetClass),
        );
        if (assets.length !== 1) {
            throw new Error(
                `private looks: ${assets.length} emitted stylesheets name ${entry.sheetClass} as their look (--look-sheet), where one does — the build cannot open its served sheet with ${LOOK_COPYRIGHT_LINE}`,
            );
        }
        const [asset] = assets;
        asset.source = withCopyrightLine(textOf(asset));
        stamped.push(asset.fileName);
    }
    return stamped;
}

/**
 * The dist check, under a build's own selection: `checkDist`'s core
 * (`check-dist-looks.mjs`) over the index at the selection's commit,
 * filtered by the target and the public lists as the build filtered it.
 * Answers every problem, or none.
 */
export function checkSelectedDist({ dir, selection, root, facts, git, env, harnessClasses = [] }) {
    const files = distFiles(dir);
    if (selection === undefined) {
        return distLooksProblems({ files, shippedClasses: facts.shippedClasses, included: [], excluded: [], harnessClasses });
    }
    const { read, files: repoFiles, index } = selectedIndex({ root, selection, facts, git, env });
    const carried = new Set(includedEntries(index, selection.target, facts).map((entry) => entry.slug));
    const looks = index.looks.map((entry) => lookFilesOf(read, repoFiles, entry));
    return distLooksProblems({
        files,
        shippedClasses: facts.shippedClasses,
        included: looks.filter((look) => carried.has(look.slug)),
        excluded: looks.filter((look) => !carried.has(look.slug)),
        harnessClasses,
    });
}

/**
 * The Vite plugin: answers `virtual:stall-private-looks`. `facts` are the
 * public lists (`PRIVATE_LOOK_IDS`, `PAID_LOOK_IDS`, `RELEASED_LOOK_IDS`,
 * `OVER_TARGET_LOOK_IDS`, the shipped classes); `validateLook` the app's validator; `env` where the
 * selection is read (`process.env`). The selection is read in `buildStart`,
 * so each build reads its own; a build that carries a look says so in one
 * line on stderr, whatever the log level, so a forgotten shell export is on
 * screen; each carried look's emitted sheet opens with the copyright line
 * (`stampCarriedSheets`, in `generateBundle`); and a build that selected
 * anything and wrote to the disk runs the dist check over what it wrote
 * (once `writeBundle` ran), and fails on a problem
 * (`the-dist-holds-what-the-index-names`). `harnessClasses` is a harness
 * build's alone (8e2: the layout probe's and the kit's configs hand
 * `HARNESS_LOOK_CLASSES`): the looks that build carries of the harness's
 * own, which the dist check reads as the harness's (`distLooksProblems`).
 */
export function privateLooksPlugin({ facts, validateLook, vars, env = process.env, git, harnessClasses = [] } = {}) {
    let root = process.cwd();
    let outDir;
    let wrote = false;
    let selection;
    let entries = [];
    let carried = [];
    let publicDir;
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
            outDir = resolve(config.root, config.build.outDir);
            publicDir = config.publicDir;
        },
        buildStart() {
            cleanup();
            wrote = false;
            entries = [];
            carried = [];
            selection = undefined;
            if (env.VITEST !== undefined) {
                return;
            }
            const wanted = selectionFromEnv(env);
            if (wanted === undefined) {
                if (selectionRequired(env)) {
                    throw new Error(`private looks: ${REQUIRED_ENV} is set and this build selects no private look — a run that must carry its looks names them (STALL_LOOKS_TARGET, STALL_LOOKS_DIR)`);
                }
                return;
            }
            const { commit, packedTree, looks } = readSelectedLooks({ root, selection: wanted, facts, validateLook, vars, git, env });
            // Held at the close only once read whole: a build that fails on
            // a look's check says why, not the dist check's complaint over a
            // dist it never wrote (which is what it said until 8e1).
            selection = wanted;
            if (looks.length === 0) {
                return;
            }
            written = mkdtempSync(join(tmpdir(), MATERIALISED_PREFIX));
            entries = materialise(looks, written);
            carried = looks.map((look) => ({ fonts: look.fonts }));
            process.stderr.write(
                `private looks: this ${selection.target} build carries ${looks.map((look) => look.entry.slug).join(', ')} (private commit ${commit.slice(0, 12)}, tree ${packedTree.slice(0, 12)})\n`,
            );
        },
        resolveId(id) {
            return id === PRIVATE_LOOKS_MODULE ? RESOLVED_MODULE : null;
        },
        load(id) {
            return id === RESOLVED_MODULE ? privateLooksModuleCode(entries) : null;
        },
        buildEnd(error) {
            if (error !== undefined) {
                selection = undefined;
                cleanup();
            }
        },
        // The copyright line at the head of each carried look's served
        // sheet (`stampCarriedSheets`), after every other plugin's own
        // `generateBundle` — Vite's CSS plugin strips its hash marker in
        // its — so the line is the last edit before the sheet is written
        // or handed back in memory. A build that carries no look has no
        // entry and touches nothing: the public build, byte for byte.
        generateBundle: {
            order: 'post',
            handler(_options, bundle) {
                stampCarriedSheets(bundle, entries);
            },
        },
        writeBundle() {
            // The notices this build serves name every face its looks serve
            // (`a-deploy-build-names-every-face-it-serves`): the public file,
            // which Vite copied before writing, unchanged and first, then the
            // carried faces. A build whose looks serve no face leaves the
            // public file as it is.
            if (carried.some((look) => look.fonts.length > 0) && outDir !== undefined) {
                const source = publicDir ? join(publicDir, 'licenses.txt') : undefined;
                if (source === undefined || !existsSync(source)) {
                    throw new Error('private looks: this build serves a look\'s faces and has no public/licenses.txt to name them beside');
                }
                writeFileSync(join(outDir, 'licenses.txt'), noticesWithLookFonts(readFileSync(source, 'utf8'), carried));
            }
            // The dist is on the disk, this plugin's own writes included:
            // the one state in which `closeBundle` checks it.
            wrote = true;
        },
        closeBundle() {
            // Only a dist this build wrote is checked (CRITIC-STEP-8C1B item
            // 1): Rollup calls `writeBundle` once the files are on the disk,
            // and nothing hears an error thrown after the build phase — in
            // `generateBundle` (the stamp's), `renderChunk` or a write —
            // before Vite's `finally` closes the bundle, so a check here over
            // the `public/` copy Vite left would throw its own complaint in
            // place of that error. A build-phase error clears `selection` in
            // `buildEnd` as well.
            try {
                if (selection !== undefined && wrote && outDir !== undefined) {
                    const problems = checkSelectedDist({ dir: outDir, selection, root, facts, git, env, harnessClasses });
                    if (problems.length > 0) {
                        throw new Error(`private looks: ${outDir} does not hold what its selection carries:\n  - ${problems.join('\n  - ')}`);
                    }
                }
            } finally {
                cleanup();
            }
        },
    };
}
