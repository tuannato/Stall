/**
 * Which terms each part of this repository is under, as data — and the pure
 * checks `scripts/licence-map.test.mjs` holds the tree to. No file system,
 * no git, no build here: the test reads the facts (git's file list, the
 * installed packages, the licence texts) and hands them in, so every check
 * can be proved red on an in-memory plant.
 *
 * The map is descriptive. LICENSE is the authority on this repository's own
 * terms; nothing here grants or changes a licence.
 */

/**
 * The directory reserved for look files, compared in lower case: this
 * checkout sits on a case-insensitive disk with `core.ignorecase` unset, so
 * `src/Looks/` is the same directory to the disk and a different path to git.
 */
export const LOOK_ART_ROOT = 'src/looks/';

/**
 * Each row: the path prefix it covers (`''` is everything no longer prefix
 * covers), what the files there are, and the licence-looking files that row
 * may carry. The fonts row's licence files are the ones `FONTS` in
 * `scripts/notices.mjs` names, each beside its own faces.
 */
export const LICENCE_MAP = [
    {
        path: 'vendor/',
        kind: 'third-party',
        terms: 'Packages by other authors, pinned as tarballs, each under its own MIT licence; vendor/NOTICE.md names every tarball and its holders.',
        licenceFiles: ['vendor/NOTICE.md'],
    },
    {
        path: 'src/ui/fonts/',
        kind: 'fonts',
        terms: 'Font files under the SIL Open Font License 1.1, each beside the licence FONTS names for it.',
        licenceFiles: [],
    },
    {
        path: 'public/licenses.txt',
        kind: 'notices',
        terms: 'The notices this site serves for the third-party code and fonts it sends, written by scripts/notices.mjs.',
        licenceFiles: ['public/licenses.txt'],
    },
    {
        path: LOOK_ART_ROOT,
        kind: 'reserved',
        terms: 'Reserved, empty until LICENSE maps it.',
        licenceFiles: [],
    },
    {
        path: '',
        kind: 'repository',
        terms: 'The MIT License, in LICENSE.',
        licenceFiles: ['LICENSE'],
    },
];

/** The row covering a path: the longest prefix, compared in lower case. */
export function rowFor(path, map = LICENCE_MAP) {
    const lower = path.toLowerCase();
    let best;
    for (const row of map) {
        if (lower.startsWith(row.path.toLowerCase()) && (best === undefined || row.path.length > best.path.length)) {
            best = row;
        }
    }
    return best;
}

/**
 * A file whose name says it carries licence terms: LICENSE, LICENCE,
 * COPYING, NOTICE or OFL, in any case, singular or plural, with an optional
 * `-suffix`, and no extension or `.md` / `.txt` — so `LICENSE-OFL.txt` and
 * `licenses.txt` are licence files, and `notices.mjs` or a future
 * `src/ui/notice.ts` are not.
 */
export const LICENCE_LOOKING = /^(licen[cs]es?|copying|notices?|ofl)(-[^/.]*)?(\.(md|txt))?$/i;

const baseName = (path) => path.slice(path.lastIndexOf('/') + 1);

/**
 * Every tracked licence-looking file must be one a map row names or one of
 * the `fontLicences`.
 */
export function licenceFileProblems({ tracked, fontLicences, map = LICENCE_MAP }) {
    const named = new Set([...map.flatMap((row) => row.licenceFiles), ...fontLicences]);
    const problems = [];
    for (const path of tracked) {
        if (!LICENCE_LOOKING.test(baseName(path)) || named.has(path)) {
            continue;
        }
        problems.push(`${path}: a licence-looking file no row of the licence map names`);
    }
    for (const path of named) {
        if (!tracked.includes(path)) {
            problems.push(`${path}: the licence map names it and git does not track it`);
        }
    }
    return problems;
}

/** The files the look-art guard is about: anything under `src/looks`, any case. */
export function isLookArt(path) {
    const lower = path.toLowerCase();
    return lower === LOOK_ART_ROOT.slice(0, -1) || lower.startsWith(LOOK_ART_ROOT);
}

/**
 * A path the guard refuses, and why: anything that is not printable ASCII
 * (APFS folds more than capitals — `src/lookſ/` with U+017F is `src/looks/`
 * to the disk, and neither lower-casing nor git's `:(icase)` sees it), and
 * anything under `src/looks` in any case.
 */
export function refusedPath(path) {
    if (!/^[\x20-\x7e]+$/.test(path)) {
        return 'a path that is not printable ASCII (a disk that folds case may fold it into another)';
    }
    if (isLookArt(path)) {
        return `${LOOK_ART_ROOT} is reserved, empty until LICENSE maps it`;
    }
    return undefined;
}

/**
 * `src/looks` stays empty — in the tree (tracked, or untracked and not
 * ignored) and in every commit a push would publish — until LICENSE maps it,
 * and no path anywhere is one a case-folding disk could turn into it.
 *
 * `facts`: `{ tree: string[], shallow: boolean, upstream: string | undefined,
 * unpushed: { commit: string, paths: string[] }[] }`. `unpushed` is every
 * commit reachable from a local branch, a tag or HEAD and from no
 * `origin/*` ref, with EVERY path it touches: the test is applied here, not
 * by a git pathspec. `upstream` undefined means there is no `origin/main`,
 * which fails rather than passing on an empty list.
 */
export function lookArtProblems({ tree, shallow, upstream, unpushed }) {
    const problems = [];
    for (const path of tree) {
        const why = refusedPath(path);
        if (why !== undefined) {
            problems.push(`${JSON.stringify(path)}: ${why}`);
        }
    }
    if (shallow) {
        problems.push('a shallow clone: the commits a push would publish cannot all be read');
    }
    if (upstream === undefined) {
        problems.push('no origin/main to compare with: the commits a push would publish are unknown');
    }
    for (const { commit, paths } of unpushed) {
        const refused = [...new Set(paths)].filter((path) => refusedPath(path) !== undefined);
        if (refused.length > 0) {
            problems.push(
                `commit ${commit}, on no origin/* ref, touches ${refused.map((p) => JSON.stringify(p)).join(', ')}: ${refusedPath(refused[0])}`,
            );
        }
    }
    return problems;
}

/**
 * Two paths — files or the directories above them — that differ only in
 * capitals. On a case-insensitive disk they are one place, and to git two.
 */
export function caseVariantProblems(tree) {
    const spellings = new Map();
    for (const path of tree) {
        const parts = path.split('/');
        for (let i = 1; i <= parts.length; i += 1) {
            const prefix = parts.slice(0, i).join('/');
            const key = prefix.toLowerCase();
            const seen = spellings.get(key) ?? new Set();
            seen.add(prefix);
            spellings.set(key, seen);
        }
    }
    const problems = [];
    for (const seen of spellings.values()) {
        if (seen.size > 1) {
            problems.push(`one path spelled ${seen.size} ways: ${[...seen].sort().join(', ')}`);
        }
    }
    return problems;
}

/** A font file, by its extension. */
export const FONT_FILE = /\.(woff2?|ttf|otf|eot)$/i;

const dirOf = (path) => path.slice(0, path.lastIndexOf('/') + 1);

/**
 * Every tracked font file is one `FONTS` names, under the map's fonts row,
 * in the same directory as the licence its entry names; that licence is
 * tracked and states the SIL Open Font License, Version 1.1.
 *
 * `fonts`: `FONTS` from `scripts/notices.mjs` (`{ name, files: { path:
 * subset }, licence }`). `licenceTexts`: the text of each licence path that
 * exists, by path.
 */
export function fontProblems({ tracked, fonts, licenceTexts, map = LICENCE_MAP }) {
    const problems = [];
    const owner = new Map();
    for (const font of fonts) {
        for (const file of Object.keys(font.files)) {
            owner.set(file, font);
        }
    }
    for (const path of tracked.filter((file) => FONT_FILE.test(file))) {
        if (!owner.has(path)) {
            problems.push(`${path}: a font file FONTS does not name`);
        }
        if (rowFor(path, map)?.kind !== 'fonts') {
            problems.push(`${path}: a font file outside the licence map's fonts row`);
        }
    }
    for (const font of fonts) {
        const text = licenceTexts[font.licence];
        if (!tracked.includes(font.licence) || text === undefined) {
            problems.push(`${font.name}: its licence ${font.licence} is not a tracked file`);
        } else if (!/SIL Open Font License/i.test(text) || !/Version 1\.1/.test(text)) {
            problems.push(`${font.name}: ${font.licence} does not state the SIL Open Font License, Version 1.1`);
        }
        for (const file of Object.keys(font.files)) {
            if (!tracked.includes(file)) {
                problems.push(`${font.name}: ${file} is not a tracked file`);
            }
            if (dirOf(file) !== dirOf(font.licence)) {
                problems.push(`${font.name}: ${file} is not in the directory of its licence ${font.licence}`);
            }
        }
    }
    return problems;
}

/**
 * The licences a production dependency may be under: `LICENCE_ALLOW` from
 * `scripts/notices-lib.mjs`, passed in so there is one authority.
 *
 * `packages`: `{ name, version, licence }` per installed package folder.
 */
export function dependencyProblems(packages, allow) {
    const problems = [];
    for (const pkg of packages) {
        if (typeof pkg.licence !== 'string') {
            problems.push(`${pkg.name}@${pkg.version}: states no SPDX licence string`);
        } else if (!allow.includes(pkg.licence)) {
            problems.push(`${pkg.name}@${pkg.version}: ${pkg.licence} is not on the allow-list`);
        }
    }
    return problems;
}

/**
 * The files the kit tracks: its rulebook, the skeleton sheet, the skeleton
 * `look.json` and the empty art folder's placeholder. A creator's work stays
 * out of this repository, whose every tracked file is under its licence.
 */
export const KIT_TRACKED = ['workshop/README.md', 'workshop/art/.gitkeep', 'workshop/look.json', 'workshop/theme-workshop.css'];

export function kitProblems(tracked) {
    const kit = tracked.filter((path) => path.toLowerCase().startsWith('workshop/')).sort();
    const problems = [];
    for (const path of kit) {
        if (!KIT_TRACKED.includes(path)) {
            problems.push(`${path}: the kit tracks only ${KIT_TRACKED.join(', ')}`);
        }
    }
    for (const path of KIT_TRACKED) {
        if (!kit.includes(path)) {
            problems.push(`${path}: the kit's own file is not tracked`);
        }
    }
    return problems;
}

/**
 * `vendor/NOTICE.md` names every vendored tarball, one `- \`<file>\` ...`
 * line each with its copyright holders, and carries the MIT text; it names
 * no tarball that is not there.
 */
export function vendorNoticeProblems({ tarballs, noticeText }) {
    const problems = [];
    const lines = new Map();
    for (const match of noticeText.matchAll(/^- `([^`]+\.tgz)`(.*)$/gm)) {
        lines.set(match[1], match[2]);
    }
    for (const tarball of tarballs) {
        const line = lines.get(tarball);
        if (line === undefined) {
            problems.push(`vendor/${tarball}: no line in vendor/NOTICE.md`);
        } else if (!/Copyright \(c\) \d{4}/.test(line)) {
            problems.push(`vendor/${tarball}: its line names no copyright holder`);
        }
    }
    for (const listed of lines.keys()) {
        if (!tarballs.includes(listed)) {
            problems.push(`vendor/NOTICE.md names ${listed}, which is not in vendor/`);
        }
    }
    for (const sentence of [
        'Permission is hereby granted, free of charge, to any person obtaining a copy',
        'The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.',
        'OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.',
    ]) {
        if (!noticeText.replace(/\s+/g, ' ').includes(sentence)) {
            problems.push(`vendor/NOTICE.md does not carry the MIT text ("${sentence}")`);
        }
    }
    if (/[\w.+-]+@[\w-]+\.[\w.-]+/.test(noticeText)) {
        problems.push('vendor/NOTICE.md carries a mailbox');
    }
    return problems;
}
