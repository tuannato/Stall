/**
 * The third-party notices, as text — pure: no file system, no build, no
 * clock. `scripts/notices.mjs` collects what the bundle ships and reads each
 * package's own files; everything here is what those facts become.
 *
 * Three properties the served file keeps, and each has a test in
 * `scripts/notices.test.mjs`:
 *
 * - **ASCII only.** Pages serves `.txt` with no charset a browser must
 *   honour, so a curly quote in a licence would arrive as mojibake. Known
 *   typographic characters are folded (`ascii`); anything else stops the
 *   script rather than being dropped in silence.
 * - **Byte-stable.** No date, packages sorted by name then version, so the
 *   file changes only when what the bundle ships changes — and the diff says
 *   what did.
 * - **Nothing personal.** A mailbox in a licence or an `author` field is
 *   stripped (AGENTS §8), and no path from this machine is ever written.
 */

/** The licences this site may ship code under. Anything else stops the script. */
export const LICENCE_ALLOW = ['MIT', 'ISC', 'BSD-2-Clause', 'BSD-3-Clause', 'Apache-2.0', '0BSD'];

/**
 * Each family's heading, and the words its licence text opens with — the
 * text printed once per section starts there, so a package's own title line
 * and copyright lines above it are never mistaken for the licence.
 */
const FAMILIES = {
    MIT: { title: 'the MIT License', opens: 'Permission is hereby granted' },
    ISC: { title: 'the ISC License', opens: 'Permission to use, copy, modify' },
    'BSD-2-Clause': { title: 'the BSD 2-Clause License', opens: 'Redistribution and use' },
    'BSD-3-Clause': { title: 'the BSD 3-Clause License', opens: 'Redistribution and use' },
    'Apache-2.0': { title: 'the Apache License 2.0', opens: 'Apache License' },
    '0BSD': { title: 'the Zero-Clause BSD License', opens: 'Permission to use, copy, and/or distribute' },
};

/**
 * Virtual modules the build may carry that belong to no package: Stall's own
 * stubs (`\0stall:*`, e.g. the `ecash-wallet` stand-in in `vite.config.ts`)
 * and Rollup's CommonJS helper. Any other virtual id stops the script — a
 * plugin that injects code is code this list must be able to name.
 */
export function isAllowedVirtual(cleanId) {
    return cleanId.startsWith('stall:') || cleanId === 'commonjsHelpers.js';
}

/** A Rollup module id without its `\0` markers and its `?query`. */
export function cleanModuleId(id) {
    const bare = id.replace(/^\0+/, '');
    const q = bare.indexOf('?');
    return q < 0 ? bare : bare.slice(0, q);
}

/**
 * The package folder a module path sits in: the path up to the LAST
 * `/node_modules/<name>` (or `<@scope>/<name>`). Never parsed out of pnpm's
 * `.pnpm/<dir>` name, which reads `file+vendor+...tgz` for a vendored
 * tarball and `4.0.1_ws@8.21.3` for a peer-resolved one — the folder's own
 * `package.json` is the only authority on a name and a version.
 */
export function packageDirOf(path) {
    const marker = '/node_modules/';
    const at = path.lastIndexOf(marker);
    if (at < 0) {
        return undefined;
    }
    const rest = path.slice(at + marker.length).split('/');
    const name = rest[0]?.startsWith('@') ? `${rest[0]}/${rest[1] ?? ''}` : rest[0];
    if (name === undefined || name === '' || name.endsWith('/')) {
        return undefined;
    }
    return path.slice(0, at + marker.length) + name;
}

/**
 * What one bundled module is: a file of a package, Stall's own source, or an
 * allowed virtual module. Anything else throws, because a list that skips
 * what it cannot classify is a list that is quietly incomplete.
 */
export function classifyModule(id, root) {
    const clean = cleanModuleId(id);
    const dir = packageDirOf(clean);
    if (dir !== undefined) {
        return { kind: 'package', dir };
    }
    if (clean.startsWith(`${root}/src/`) || clean === `${root}/index.html`) {
        return { kind: 'own' };
    }
    if (id.startsWith('\0') && isAllowedVirtual(clean)) {
        return { kind: 'virtual' };
    }
    throw new Error(`notices: a bundled module this script cannot attribute: ${JSON.stringify(clean)}`);
}

const FOLDS = [
    [/[‘’‚′]/g, "'"],
    [/[“”„″]/g, '"'],
    [/[‐-―−]/g, '-'],
    [/…/g, '...'],
    [/[  -  ]/g, ' '],
    [/©/g, '(c)'],
    [/•/g, '*'],
];

/** Typographic characters folded to ASCII; anything else left is an error. */
export function ascii(text) {
    let out = text;
    for (const [pattern, to] of FOLDS) {
        out = out.replace(pattern, to);
    }
    const stray = out.match(/[^\x00-\x7f]/);
    if (stray !== null) {
        const at = stray.index ?? 0;
        throw new Error(
            `notices: a character this file cannot carry as ASCII: U+${stray[0]
                .codePointAt(0)
                .toString(16)
                .toUpperCase()
                .padStart(4, '0')} near ${JSON.stringify(out.slice(Math.max(0, at - 30), at + 30))}`,
        );
    }
    return out;
}

const BRACKETED_MAILBOX = /[ \t]*<[^<>\s]*@[^<>\s]*>/g;
const BARE_MAILBOX = /[ \t]*\(?\b[\w.+-]+@[\w-]+(\.[\w-]+)+\b\)?/g;

/**
 * No mailbox, bracketed or bare (AGENTS §8), in a text of any length. Only
 * the address and the space before it go: the licence's own spacing is its
 * author's, and nothing else on the line is touched.
 */
export function stripMailboxes(text) {
    return text
        .split('\n')
        .map((line) => line.replace(BRACKETED_MAILBOX, '').replace(BARE_MAILBOX, '').replace(/\s+$/, ''))
        .join('\n');
}

/** One holder line: no mailbox, one space between words. */
function holderLine(line) {
    return stripMailboxes(line).replace(/\s+/g, ' ').trim();
}

/** CRLF to LF, trailing spaces off every line, no blank lines at either end. */
function tidy(text) {
    return text
        .replace(/\r\n?/g, '\n')
        .split('\n')
        .map((line) => line.replace(/\s+$/, ''))
        .join('\n')
        .replace(/^\n+/, '')
        .replace(/\n+$/, '');
}

/**
 * The copyright lines a licence file states for its holder: lines that open
 * with "Copyright" and then a year or a "(c)". The Apache text's own
 * "Copyright [yyyy] [name of copyright owner]" is a placeholder and does not
 * count, nor does any sentence that merely mentions copyright.
 */
export function copyrightLines(licenceText) {
    const out = [];
    for (const raw of tidy(licenceText).split('\n')) {
        const line = raw.replace(/^[\s#*]+/, '');
        if (/^Copyright\s+(\(c\)|©|\d)/i.test(line)) {
            out.push(holderLine(line));
        }
    }
    return out;
}

/** The family's licence text, from the words it opens with to the end. */
export function licenceBody(licenceText, licence) {
    const family = FAMILIES[licence];
    if (family === undefined) {
        throw new Error(`notices: no licence family for ${licence}`);
    }
    const lines = tidy(licenceText).split('\n');
    const start = lines.findIndex((line) => line.trim().startsWith(family.opens));
    if (start < 0) {
        throw new Error(`notices: a ${licence} licence file that does not open with "${family.opens}"`);
    }
    return lines.slice(start).join('\n');
}

/**
 * The holders of one package: its licence file's own copyright lines, or —
 * only when that file names none — the override for exactly this
 * `name@version`, read from the package's source headers. Neither is an
 * error: a version bump without a fresh read must stop the script, not
 * print an old year or no holder at all.
 */
export function holdersOf(pkg, overrides) {
    const key = `${pkg.name}@${pkg.version}`;
    const fromFile = pkg.licenceText === undefined ? [] : copyrightLines(pkg.licenceText);
    if (fromFile.length > 0) {
        if (overrides[key] !== undefined) {
            throw new Error(`notices: ${key} names its holder in its licence file; drop its override`);
        }
        return fromFile;
    }
    const override = overrides[key];
    if (override === undefined || override.length === 0) {
        throw new Error(
            `notices: ${key} names no copyright holder. Read its source headers and add ` +
                `COPYRIGHT_OVERRIDES['${key}'] in scripts/notices.mjs.`,
        );
    }
    return override.map((line) => holderLine(line));
}

function byNameThenVersion(a, b) {
    if (a.name !== b.name) {
        return a.name < b.name ? -1 : 1;
    }
    return a.version < b.version ? -1 : a.version > b.version ? 1 : 0;
}

/**
 * The whole file.
 *
 * `packages`: `{ name, version, licence, licenceText?, noticeText? }`, one
 * per package folder the bundle ships code from. `fonts`: `{ name, files,
 * subsets, licenceText }`. `overrides`: `COPYRIGHT_OVERRIDES`, and every key
 * in it must be used — an entry nobody reads is a stale claim about a
 * version this site no longer ships.
 */
export function noticesText({ packages, fonts, overrides }) {
    const used = new Set();
    const sorted = [...packages].sort(byNameThenVersion);
    const out = [];
    out.push('Stall - third-party software and fonts');
    out.push('');
    out.push('This site sends the open-source software and the fonts listed below to');
    out.push('your browser as part of its pages. Their licences ask that these notices');
    out.push('travel with them, and here they are. Stall\'s own code is under the MIT');
    out.push('License, in the LICENSE file of its source repository.');
    out.push('');
    out.push('The list is made from the packages the build actually bundles, by');
    out.push('scripts/notices.mjs, and a test fails when it falls behind.');

    for (const licence of LICENCE_ALLOW) {
        const members = sorted.filter((pkg) => pkg.licence === licence);
        if (members.length === 0) {
            continue;
        }
        const source = members.find((pkg) => pkg.licenceText !== undefined);
        if (source === undefined) {
            throw new Error(`notices: no package under ${licence} ships its licence text`);
        }
        out.push('');
        out.push('');
        out.push(`== Software under ${FAMILIES[licence].title} ==`);
        out.push('');
        for (const pkg of members) {
            const key = `${pkg.name}@${pkg.version}`;
            if (overrides[key] !== undefined) {
                used.add(key);
            }
            out.push(`- ${pkg.name} ${pkg.version} - ${holdersOf(pkg, overrides).join('; ')}`);
        }
        for (const pkg of members) {
            if (pkg.noticeText !== undefined) {
                out.push('');
                out.push(`NOTICE distributed with ${pkg.name} ${pkg.version}:`);
                out.push('');
                out.push(stripMailboxes(tidy(pkg.noticeText)));
            }
        }
        out.push('');
        out.push(stripMailboxes(licenceBody(source.licenceText, licence)));
    }

    const stray = sorted.filter((pkg) => !LICENCE_ALLOW.includes(pkg.licence));
    if (stray.length > 0) {
        throw new Error(
            `notices: a licence not on the allow-list: ${stray
                .map((pkg) => `${pkg.name}@${pkg.version} (${String(pkg.licence)})`)
                .join(', ')}`,
        );
    }
    const unused = Object.keys(overrides).filter((key) => !used.has(key));
    if (unused.length > 0) {
        throw new Error(`notices: overrides for packages the bundle does not ship: ${unused.join(', ')}`);
    }

    if (fonts.length > 0) {
        out.push('');
        out.push('');
        out.push('== Fonts under the SIL Open Font License 1.1 ==');
        for (const font of [...fonts].sort((a, b) => (a.name < b.name ? -1 : 1))) {
            out.push('');
            out.push(`- ${font.name}, the ${font.subsets} this site serves (${font.files.join(', ')})`);
            out.push('');
            out.push(stripMailboxes(tidy(font.licenceText)));
        }
    }

    const text = ascii(`${out.join('\n')}\n`);
    if (text.includes('/home/') || text.includes('.pnpm')) {
        throw new Error('notices: a local path reached the text');
    }
    return text;
}
