/**
 * The built `dist` holds exactly the private looks its selection carries
 * (step 8b2; plan §2.5, the step-7B critic's item 5: the index, not a
 * count). Run after a build, with the same selection the build had —
 * `STALL_LOOKS_TARGET`, `STALL_LOOKS_DIR`, `STALL_LOOKS_COMMIT`
 * (`scripts/private-looks-build.mjs`) — and the directory it wrote:
 *
 *     node scripts/check-dist-looks.mjs [dist]
 *
 * What it holds, from the private index at the selection's commit, filtered
 * by the target and the public lists exactly as the build filters it
 * (`includedEntries`):
 *
 * - **every look sheet in `dist` is one the build may carry**: a shipped
 *   look's, in the entry CSS, or an included private look's, in a file of
 *   its own and never the entry CSS — each named by the `--look-sheet` it
 *   declares (`every-look-sheet-names-itself`), once across `dist`;
 * - **every included look is there whole**: its sheet, and every `url()` the
 *   built sheet names resolves to a file in `dist`, which holds the bytes of
 *   every piece of art the look's source sheet names (the SVGs as the build
 *   re-serialised them);
 * - **nothing of a look the build does not carry is anywhere in `dist`**: no
 *   file holds its class, and no file is any of its art, as given or as
 *   re-serialised — so a `preview` look in a `production` build is red, by
 *   the index and not by a count of sheets.
 *
 * No selection: the build carried no private look, and `dist` may hold no
 * look sheet but the shipped ones. Not checked yet, stated: a look's og card
 * (8j) and its faces' notices (8e). Pure core (`distLooksProblems`) over a
 * map of files, so the test plants on it; the CLI reads the disk and git.
 * Test: `the-dist-holds-what-the-index-names`
 * (`scripts/private-looks-build.test.mjs`).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, posix, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRIVATE_FILE_MODE, gitBlobAt, gitTextAt, publicLookFacts } from './private-looks.mjs';
import { includedEntries, selectedIndex, selectionFromEnv } from './private-looks-build.mjs';
import { sanitizeSvg } from './svg-allow.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Every file under `dir`, by its path from `dir` with forward slashes. */
export function distFiles(dir) {
    const out = new Map();
    const walk = (at) => {
        for (const name of readdirSync(at)) {
            const path = join(at, name);
            if (statSync(path).isDirectory()) {
                walk(path);
            } else {
                out.set(relative(dir, path).split(sep).join('/'), readFileSync(path));
            }
        }
    };
    walk(dir);
    return out;
}

/** The classes a stylesheet's text names itself under, in order. */
export function lookSheetNames(css) {
    return [...css.matchAll(/--look-sheet\s*:\s*([A-Za-z0-9_-]+)/g)].map((m) => m[1]);
}

/** The stylesheets `index.html` links: the entry CSS every visitor downloads. */
export function entryCss(files) {
    const html = files.get('index.html')?.toString('utf8') ?? '';
    return new Set(
        [...html.matchAll(/<link\b[^>]*\brel=["']?stylesheet["']?[^>]*>/gi)]
            .map((m) => /\bhref=["']?([^"' >]+)/i.exec(m[0])?.[1])
            .filter((href) => href !== undefined)
            .map((href) => href.replace(/^\//, '')),
    );
}

/** The art names a source sheet's `url()`s reach, `./art/<name>` or `art/<name>`. */
export function artNamedBy(sheet) {
    return new Set([...sheet.matchAll(/url\(\s*['"]?(?:\.\/)?art\/([a-z0-9-]+\.(?:svg|woff2))['"]?\s*\)/g)].map((m) => m[1]));
}

/**
 * Every problem `files` (a built `dist`, path → bytes) has against what its
 * selection carries. `shippedClasses`: the shipped looks' classes;
 * `included` and `excluded`: the index's looks the build carries and does
 * not, each `{ cls, slug, art: [{ name, bytes }], named: Set<name> }` — its
 * art as the build writes it, and the art its source sheet names.
 */
export function distLooksProblems({ files, shippedClasses, included, excluded }) {
    const problems = [];
    const entry = entryCss(files);
    if (!files.has('index.html')) {
        problems.push('no index.html: this is not a built dist');
    }
    const declared = new Map();
    for (const [path, bytes] of files) {
        if (!path.endsWith('.css')) {
            continue;
        }
        for (const cls of lookSheetNames(bytes.toString('utf8'))) {
            declared.set(cls, [...(declared.get(cls) ?? []), path]);
        }
    }
    const carried = new Map(included.map((look) => [look.cls, look]));
    for (const [cls, paths] of declared) {
        if (shippedClasses.includes(cls)) {
            if (!paths.every((path) => entry.has(path))) {
                problems.push(`${cls}: a shipped look's sheet outside the entry CSS (${paths.join(', ')})`);
            }
        } else if (!carried.has(cls)) {
            problems.push(`${cls}: a look sheet in ${paths.join(', ')} that this build's selection does not carry`);
        }
    }
    for (const cls of shippedClasses) {
        if (!declared.has(cls)) {
            problems.push(`${cls}: no shipped look's sheet in the entry CSS — is this the dist the build wrote?`);
        }
    }
    const holds = (bytes) => [...files.values()].some((file) => file.equals(bytes));
    for (const look of included) {
        const paths = declared.get(look.cls) ?? [];
        if (paths.length !== 1) {
            problems.push(`${look.slug}: the build carries it, and ${paths.length} files name its sheet (${look.cls}), where one does`);
            continue;
        }
        const [path] = paths;
        if (entry.has(path)) {
            problems.push(`${look.slug}: its sheet is in the entry CSS (${path}), where a private look's sheet is its own file`);
        }
        const css = files.get(path).toString('utf8');
        for (const m of css.matchAll(/url\(\s*['"]?([^'")\s]+)['"]?\s*\)/g)) {
            const target = m[1];
            const resolved = target.startsWith('/') ? target.slice(1) : posix.normalize(posix.join(posix.dirname(path), target));
            if (!files.has(resolved)) {
                problems.push(`${look.slug}: its sheet names ${target}, which is not in the dist`);
            }
        }
        for (const art of look.art) {
            if (look.named.has(art.name) && !holds(art.bytes)) {
                problems.push(`${look.slug}: art/${art.name} is named by its sheet and is not in the dist as the build writes it`);
            }
        }
    }
    for (const look of excluded) {
        const needle = Buffer.from(look.cls, 'utf8');
        for (const [path, bytes] of files) {
            if (bytes.includes(needle)) {
                problems.push(`${look.slug}: ${path} holds its class ${look.cls}, and this build does not carry it`);
            }
        }
        for (const art of look.art) {
            if (holds(art.bytes) || (art.given !== undefined && holds(art.given))) {
                problems.push(`${look.slug}: art/${art.name} is in the dist, and this build does not carry the look`);
            }
        }
    }
    return problems;
}

/** One index entry's art and sheet, as the build reads and writes them, from git at the selection's commit. */
function lookFilesOf(read, files, entry) {
    const at = (path) => `${entry.slug}/${path}`;
    const art = files
        .filter((file) => file.mode === PRIVATE_FILE_MODE && file.path.startsWith(at('art/')) && !file.path.endsWith('.txt'))
        .map((file) => {
            const name = file.path.slice(at('art/').length);
            const given = gitBlobAt({ ...read, path: file.path });
            if (!name.endsWith('.svg')) {
                return { name, bytes: given };
            }
            const { svg } = sanitizeSvg(given.toString('utf8'));
            return { name, bytes: svg === undefined ? given : Buffer.from(svg, 'utf8'), given };
        });
    const sheetFile = files.find((file) => file.path === at('sheet.css'));
    const named = sheetFile === undefined ? new Set() : artNamedBy(gitTextAt({ ...read, path: at('sheet.css') }));
    return { cls: entry.cls, slug: entry.slug, art, named };
}

/** The problems of the dist at `dir` against `env`'s selection. */
export async function checkDist({ dir, env = process.env, root = ROOT }) {
    const facts = await publicLookFacts();
    const files = distFiles(dir);
    const selection = selectionFromEnv(env);
    if (selection === undefined) {
        return distLooksProblems({ files, shippedClasses: facts.shippedClasses, included: [], excluded: [] });
    }
    const { read, files: repoFiles, index } = selectedIndex({ root, selection, facts, env });
    const carried = new Set(includedEntries(index, selection.target, facts).map((entry) => entry.slug));
    const looks = index.looks.map((entry) => lookFilesOf(read, repoFiles, entry));
    return distLooksProblems({
        files,
        shippedClasses: facts.shippedClasses,
        included: looks.filter((look) => carried.has(look.slug)),
        excluded: looks.filter((look) => !carried.has(look.slug)),
    });
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const dir = resolve(process.argv[2] ?? 'dist');
    const problems = await checkDist({ dir });
    if (problems.length > 0) {
        process.stderr.write(`check-dist-looks: ${dir} does not hold what its selection carries:\n  - ${problems.join('\n  - ')}\n`);
        process.exit(1);
    }
    process.stdout.write(`check-dist-looks: ${dir} holds what its selection carries\n`);
}
