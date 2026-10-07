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
 * - **every included look is there whole, and nothing beside it**: its
 *   sheet; every target its built sheet names — a `url()` or an
 *   `image-set()` entry — resolves to a file in `dist` that IS one of the
 *   look's own files (the SVGs as the build re-serialised them), so a stray
 *   target the lint missed is red; and every piece of art the source sheet
 *   names is there;
 * - **nothing of a private look's beside what a carried sheet names**: a
 *   built stylesheet (`assets/*.css`) that is not the entry CSS is an
 *   included look's sheet, and a file
 *   that is any private look's file — given or re-serialised — is a target
 *   of an included look's sheet, so an unnamed piece of art, or any file of
 *   a look the build does not carry, is red;
 * - **nothing of a look the build does not carry names it**: no sheet
 *   declares its `--look-sheet`, no script carries the module's
 *   `sheetClass` literal for it — matched by the naming rule and the
 *   module's own shape, never by the class appearing anywhere, so a public
 *   file that names a reserved class (a sticky-sign table, say) does not
 *   turn every production check red (the 8b2 critic's item 7) — and none of
 *   its files is in `dist`;
 * - **every face a carried look serves is in the notices**: `licenses.txt`
 *   names its file and carries its licence text whole (step 8e1);
 * - **every carried look's sheet opens with the copyright line, once, and
 *   no other stylesheet carries it** (`LOOK_COPYRIGHT_LINE`, step 8c1b):
 *   the build puts it there (`stampCarriedSheets`, finding the sheet by the
 *   same `--look-sheet` this check reads), since Vite's minifier drops every
 *   `/*!` comment.
 *
 * No selection: the build carried no private look, and `dist` may hold no
 * look sheet but the shipped ones. Run by the build itself whenever it
 * selected anything and wrote to the disk (`privateLooksPlugin`'s
 * `closeBundle`), and by hand with the selection the build had. Not checked
 * yet, stated: a look's og card (8j). Pure core
 * (`distLooksProblems`) over a map of files, so the test plants on it; the
 * CLI reads the disk and git. Test: `the-dist-holds-what-the-index-names`
 * (`scripts/private-looks-build.test.mjs`).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, posix, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LOOK_FONTS_FILE, lookFontNotices } from './look-faces.mjs';
import { selectionFromEnv } from './looks-selection.mjs';
import { noticedLicence } from './notices-lib.mjs';
import { LOOK_COPYRIGHT_LINE, PRIVATE_FACE_LICENCE, PRIVATE_FILE_MODE, gitBlobAt, gitTextAt, publicLookFacts } from './private-looks.mjs';
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

/** The stylesheets one HTML file links, by path from `dist`'s root. */
function linkedCss(html) {
    return [...html.matchAll(/<link\b[^>]*\brel=["']?stylesheet["']?[^>]*>/gi)]
        .map((m) => /\bhref=["']?([^"' >]+)/i.exec(m[0])?.[1])
        .filter((href) => href !== undefined)
        .map((href) => href.replace(/^\//, ''));
}

/** The stylesheets `index.html` links: the entry CSS every visitor downloads. */
export function entryCss(files) {
    return new Set(linkedCss(files.get('index.html')?.toString('utf8') ?? ''));
}

/**
 * The stylesheets the harness's own pages link (8e2): every HTML file under
 * `layout/` in a harness build's `dist` — the showroom's chrome, the
 * probe's — each its page's entry CSS, never a look's.
 */
export function harnessPageCss(files) {
    const out = new Set();
    for (const [path, bytes] of files) {
        if (path.startsWith('layout/') && path.endsWith('.html')) {
            for (const href of linkedCss(bytes.toString('utf8'))) out.add(href);
        }
    }
    return out;
}

/** Every file a stylesheet's text names: each `url()` target, and each quoted `image-set()` entry. */
export function cssTargets(css) {
    const out = [];
    for (const m of css.matchAll(/url\(\s*(['"]?)([^'")\s]+)\1\s*\)/g)) {
        out.push(m[2]);
    }
    for (const m of css.matchAll(/image-set\(([^;{}]*)\)/g)) {
        for (const q of m[1].matchAll(/(['"])([^'"]+)\1/g)) {
            out.push(q[2]);
        }
    }
    return out;
}

/** The art names a source sheet reaches, `./art/<name>` or `art/<name>`, by `url()` or `image-set()`. */
export function artNamedBy(sheet) {
    return new Set(
        cssTargets(sheet).flatMap((target) => {
            const m = /^(?:\.\/)?art\/([a-z0-9-]+\.(?:svg|woff2))$/.exec(target);
            return m === null ? [] : [m[1]];
        }),
    );
}

/**
 * Every problem `files` (a built `dist`, path → bytes) has against what its
 * selection carries. `shippedClasses`: the shipped looks' classes;
 * `included` and `excluded`: the index's looks the build carries and does
 * not, each `{ cls, slug, art: [{ name, bytes, given? }], named: Set<name>,
 * fonts? }` — its art as the build writes it (and as given, for an SVG the
 * build re-serialises), the art its source sheet names, and what the
 * notices say of its faces (`lookFontNotices`).
 *
 * **A carried look's faces are named in the notices it serves** (step 8e1,
 * `a-deploy-build-names-every-face-it-serves`): `licenses.txt` names every
 * face file of every included look and carries each face's licence text
 * whole, as the build writes it (`noticesWithLookFonts`).
 *
 * **A carried look's sheet opens with the copyright line, once** (PLAN §
 * Decided, owner 2026-10-07; `the-served-sheet-carries-the-copyright-line`):
 * its text begins with `LOOK_COPYRIGHT_LINE` and a newline, carries the line
 * nowhere else, and no other stylesheet in `dist` carries it — it is a
 * carried look's alone.
 *
 * **A harness build carries the harness's own looks** (8e2): the layout
 * probe's build and the workshop kit's (`vite.probe.config.ts`,
 * `vite.workshop.config.ts`) emit the step-6 fixture look's sheet and the
 * kit's beside the app — sheets naming a harness class
 * (`HARNESS_LOOK_CLASSES`) — and the fixture look's art, whose bytes the
 * tracked private fixture copies. `harnessClasses` names those classes for
 * such a build alone: a sheet naming one is the harness's, outside the entry
 * CSS, and a file it names is the harness's too, never a private look's
 * stray; and a stylesheet a harness page under `layout/` links (the
 * showroom's chrome) is that page's entry CSS, never a look's
 * (`harnessPageCss`). Everything else holds on a harness build as on a deploy build. A
 * deploy build hands none (`vite.config.ts`), so a harness class in its
 * dist is the stray it always was. Test:
 * `the-dist-check-knows-a-harness-builds-own-looks`.
 */
export function distLooksProblems({ files, shippedClasses, included, excluded, harnessClasses = [] }) {
    const problems = [];
    const entry = entryCss(files);
    // A harness build's own pages link their own entry CSS (8e2): never a
    // look's, and read as theirs only in a harness build.
    const harnessPages = harnessClasses.length > 0 ? harnessPageCss(files) : new Set();
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
        } else if (harnessClasses.includes(cls)) {
            if (paths.some((path) => entry.has(path))) {
                problems.push(`${cls}: a harness look's sheet in the entry CSS (${paths.join(', ')})`);
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
    // The files a harness look's sheet names: the harness's own (above).
    const harnessTargets = new Set();
    for (const [cls, paths] of declared) {
        if (!harnessClasses.includes(cls)) {
            continue;
        }
        for (const path of paths) {
            for (const target of cssTargets(files.get(path).toString('utf8'))) {
                harnessTargets.add(target.startsWith('/') ? target.slice(1) : posix.normalize(posix.join(posix.dirname(path), target)));
            }
        }
    }
    const sameBytes = (a, b) => a.length === b.length && a.equals(b);
    const isFileOf = (bytes, look) => look.art.some((art) => sameBytes(bytes, art.bytes) || (art.given !== undefined && sameBytes(bytes, art.given)));
    const sheets = new Set();
    const targeted = new Set();
    for (const look of included) {
        const paths = declared.get(look.cls) ?? [];
        if (paths.length !== 1) {
            problems.push(`${look.slug}: the build carries it, and ${paths.length} files name its sheet (${look.cls}), where one does`);
            continue;
        }
        const [path] = paths;
        sheets.add(path);
        if (entry.has(path)) {
            problems.push(`${look.slug}: its sheet is in the entry CSS (${path}), where a private look's sheet is its own file`);
        }
        const served = files.get(path).toString('utf8');
        if (!served.startsWith(`${LOOK_COPYRIGHT_LINE}\n`)) {
            problems.push(`${look.slug}: its sheet (${path}) does not open with the copyright line ${LOOK_COPYRIGHT_LINE}`);
        }
        const lines = copyrightLines(served);
        if (lines > 1) {
            problems.push(`${look.slug}: its sheet (${path}) carries the copyright line ${lines} times, where it carries it once`);
        }
        for (const target of cssTargets(files.get(path).toString('utf8'))) {
            const resolved = target.startsWith('/') ? target.slice(1) : posix.normalize(posix.join(posix.dirname(path), target));
            const bytes = files.get(resolved);
            if (bytes === undefined) {
                problems.push(`${look.slug}: its sheet names ${target}, which is not in the dist`);
            } else if (!isFileOf(bytes, look)) {
                problems.push(`${look.slug}: its sheet names ${target}, which is none of the look's own files`);
            } else {
                targeted.add(resolved);
            }
        }
        for (const art of look.art) {
            if (look.named.has(art.name) && ![...files.values()].some((file) => sameBytes(file, art.bytes))) {
                problems.push(`${look.slug}: art/${art.name} is named by its sheet and is not in the dist as the build writes it`);
            }
        }
        const notices = files.get('licenses.txt')?.toString('utf8');
        const flat = (text) => text.replace(/\s+/g, ' ');
        for (const font of look.fonts ?? []) {
            if (notices === undefined) {
                problems.push(`${look.slug}: it serves ${font.name} and the dist holds no licenses.txt`);
                continue;
            }
            for (const file of font.files) {
                if (!notices.includes(file)) {
                    problems.push(`${look.slug}: it serves art/${file} and licenses.txt does not name it`);
                }
            }
            if (!flat(notices).includes(flat(noticedLicence(font.licenceText)))) {
                problems.push(`${look.slug}: it serves ${font.name} and licenses.txt does not carry its licence whole`);
            }
        }
    }
    for (const [path, bytes] of files) {
        // The copyright line is a carried look's sheet's alone: no other
        // stylesheet a build emits or copies carries it.
        if (path.endsWith('.css') && !sheets.has(path) && copyrightLines(bytes.toString('utf8')) > 0) {
            problems.push(`${path}: carries the copyright line ${LOOK_COPYRIGHT_LINE}, which only a carried look's sheet carries`);
        }
        // Vite emits every stylesheet it builds under `assets/`; the root's
        // are `public/`'s documents, copied as they are.
        if (
            path.startsWith('assets/') &&
            path.endsWith('.css') &&
            !entry.has(path) &&
            !harnessPages.has(path) &&
            !sheets.has(path) &&
            lookSheetNames(bytes.toString('utf8')).length === 0
        ) {
            problems.push(`${path}: a built stylesheet outside the entry CSS that is no carried look's sheet`);
        }
        if (targeted.has(path) || harnessTargets.has(path)) {
            continue;
        }
        for (const look of [...included, ...excluded]) {
            if (isFileOf(bytes, look)) {
                problems.push(
                    `${look.slug}: ${path} is one of its files, and ${carried.has(look.cls) ? 'no carried sheet names it' : 'this build does not carry the look'}`,
                );
            }
        }
        if (path.endsWith('.js')) {
            const text = bytes.toString('utf8');
            for (const look of excluded) {
                if (new RegExp(`sheetClass:\\s*["'\`]${look.cls}["'\`]`).test(text)) {
                    problems.push(`${look.slug}: ${path} carries its module entry (sheetClass ${look.cls}), and this build does not carry it`);
                }
            }
        }
    }
    return problems;
}

/** How many times `text` carries the copyright line (`LOOK_COPYRIGHT_LINE`). */
export function copyrightLines(text) {
    return text.split(LOOK_COPYRIGHT_LINE).length - 1;
}

/** One index entry's art and sheet, as the build reads and writes them, from git at the selection's commit. */
export function lookFilesOf(read, files, entry) {
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
    const plain = (path) => files.some((file) => file.path === path && file.mode === PRIVATE_FILE_MODE);
    const fontsText = plain(at(LOOK_FONTS_FILE)) ? gitTextAt({ ...read, path: at(LOOK_FONTS_FILE) }) : undefined;
    const licences = files
        .filter((file) => file.mode === PRIVATE_FILE_MODE && file.path.startsWith(at('art/')) && PRIVATE_FACE_LICENCE.test(file.path.slice(at('art/').length)))
        .map((file) => ({ name: file.path.slice(at('art/').length), bytes: gitBlobAt({ ...read, path: file.path }) }));
    let fonts = [];
    try {
        fonts = lookFontNotices({ fontsText, art: [...art, ...licences] });
    } catch {
        // A fonts.json the build refused never reached a dist; nothing to hold it to.
    }
    return { cls: entry.cls, slug: entry.slug, art, named, fonts };
}

/**
 * The problems of the dist at `dir` against `env`'s selection: the core over
 * the index at the selection's commit (`checkSelectedDist`, which the build
 * runs itself), with the public lists read from the theme table.
 */
export async function checkDist({ dir, env = process.env, root = ROOT }) {
    const { checkSelectedDist } = await import('./private-looks-build.mjs');
    return checkSelectedDist({ dir, selection: selectionFromEnv(env), root, facts: await publicLookFacts(), env });
}

async function main() {
    const dir = resolve(process.argv[2] ?? 'dist');
    const problems = await checkDist({ dir });
    if (problems.length > 0) {
        process.stderr.write(`check-dist-looks: ${dir} does not hold what its selection carries:\n  - ${problems.join('\n  - ')}\n`);
        process.exit(1);
    }
    process.stdout.write(`check-dist-looks: ${dir} holds what its selection carries\n`);
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main().catch((error) => {
        process.stderr.write(`check-dist-looks: ${error.message}\n`);
        process.exit(1);
    });
}
