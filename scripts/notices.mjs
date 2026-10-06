/**
 * Writes `public/licenses.txt`: the notices for every third-party package
 * and font this site actually sends to a browser.
 *
 *     node scripts/notices.mjs
 *
 * "Actually sends" is measured, not declared: an in-memory `vite build`
 * (`write: false`, the app's own `vite.config.ts`) with a collector over
 * `generateBundle`. A module counts when Rollup rendered some of it
 * (`renderedLength > 0`) — tree-shaking and the key-derivation stubs in
 * `vite.config.ts` both decide that, and `package.json` does not. Each
 * module's package is the folder up to the last `/node_modules/<name>` in
 * its path, and that folder's own `package.json`, LICENSE and NOTICE are
 * the only things read about it — never a lookup by name, which in a pnpm
 * tree can find a different copy (two versions of `long` ship today, one
 * through `chronik-client` and one through `protobufjs`).
 *
 * Emitted assets are attributed too: a font must be in `FONTS`, an asset
 * from `node_modules` belongs to its package, and everything else is the
 * app's own. `scripts/notices.test.mjs` fails when the committed file is
 * not byte-for-byte what this writes.
 *
 * **The file is the public build's, whatever the shell selects** (8e2):
 * `bundleInventory` builds with no private look unless it is handed an
 * environment that names one, so `public/licenses.txt` is written from the
 * public build under a selection too. A private look's faces are its own
 * look's to name, in the notices a deploy build writes beside this file
 * (`noticesWithLookFonts`, `a-deploy-build-names-every-face-it-serves`).
 * **Under a selection** (`harnessSelection`) the script also builds what
 * the selection carries and holds it to that: the build ships no package
 * this file does not name — a look is data, and brings no code — and every
 * face it emits is a tracked face (`FONTS`) or one a carried look's
 * `fonts.json` names (`selectedNoticesProblems`); it says which faces the
 * deploy build's notices will add.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { LOOK_FONTS_FILE } from './look-faces.mjs';
import { LOOKS_ENV, harnessSelection } from './looks-selection.mjs';
import { classifyModule, noticesText } from './notices-lib.mjs';
import { MATERIALISED_PREFIX } from './private-looks-build.mjs';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const NOTICES_PATH = join(ROOT, 'public', 'licenses.txt');

/**
 * Holders for a package whose licence file names none, **keyed by
 * name@version** and read from that version's source headers, the years
 * spanning every header it ships. A version bump misses its key and stops
 * the script until somebody reads the new headers; an entry the bundle no
 * longer uses stops it too.
 */
export const COPYRIGHT_OVERRIDES = {
    // Headers in dist/ span "(c) 2023-2024", "(c) 2024" and "(c) 2025".
    'chronik-client@4.3.1': ['Copyright (c) 2023-2025 The Bitcoin developers'],
    // Headers span "(c) 2023-2024" through "(c) 2026".
    'ecash-lib@4.13.0': ['Copyright (c) 2023-2026 The Bitcoin developers'],
    // Headers span "(c) 2024" through "(c) 2026".
    'ecash-agora@4.2.5': ['Copyright (c) 2024-2026 The Bitcoin developers'],
    // dist/index.js and index.ts: "(c) 2024 The Bitcoin developers".
    'b58-ts@0.1.0': ['Copyright (c) 2024 The Bitcoin developers'],
    // qrcode.js: "Copyright (c) 2009 Kazuhiko Arase", MIT per the same header.
    'qrcode-generator@1.4.4': ['Copyright (c) 2009 Kazuhiko Arase'],
    // No header in src/long.js; the package's `author` field, mailbox removed.
    'long@4.0.0': ['Copyright (c) Daniel Wirtz'],
    // umd/index.js's @license header, both lines.
    'long@5.3.2': [
        'Copyright 2009 The Closure Library Authors',
        'Copyright 2020 Daniel Wirtz / The long.js Authors',
    ],
};

/**
 * The fonts this site serves, by the source file each emitted asset came
 * from, and the licence file that travels with them. An emitted font whose
 * source is not listed here stops the script.
 */
export const FONTS = [
    {
        name: 'Inter',
        files: {
            'src/ui/fonts/inter-latin.woff2': 'Latin',
            'src/ui/fonts/inter-vietnamese.woff2': 'Vietnamese',
        },
        licence: 'src/ui/fonts/LICENSE-OFL.txt',
    },
    {
        name: 'Stall Serif (Lora, renamed as its Reserved Font Name requires)',
        files: {
            'src/ui/fonts/stall-serif-latin.woff2': 'Latin roman',
            'src/ui/fonts/stall-serif-latin-italic.woff2': 'Latin italic',
            'src/ui/fonts/stall-serif-vietnamese.woff2': 'Vietnamese roman',
            'src/ui/fonts/stall-serif-vietnamese-italic.woff2': 'Vietnamese italic',
        },
        licence: 'src/ui/fonts/LICENSE-OFL-stall-serif.txt',
    },
    {
        name: 'JetBrains Mono',
        files: {
            'src/ui/fonts/jetbrains-mono-latin.woff2': 'Latin',
            'src/ui/fonts/jetbrains-mono-vietnamese.woff2': 'Vietnamese',
        },
        licence: 'src/ui/fonts/LICENSE-OFL-jetbrains-mono.txt',
    },
];

const FONT_FILE = /\.(woff2?|ttf|otf|eot)$/i;

/**
 * Run `fn` with this process's private-look variables as `env` names them
 * and none else, and put them back after: the private-look plugin reads the
 * selection from `process.env` when a build starts, and an in-process build
 * has no environment of its own.
 */
async function withLooksEnv(env, fn) {
    const saved = Object.fromEntries(LOOKS_ENV.map((name) => [name, process.env[name]]));
    for (const name of LOOKS_ENV) {
        if (env[name] === undefined) delete process.env[name];
        else process.env[name] = env[name];
    }
    try {
        return await fn();
    } finally {
        for (const [name, value] of Object.entries(saved)) {
            if (value === undefined) delete process.env[name];
            else process.env[name] = value;
        }
    }
}

/**
 * What the bundle ships: every chunk module with its rendered length, and
 * every emitted asset with the source files it came from. **The public
 * build** unless `env` names a selection (8e2): the variables the shell set
 * are set aside for the build and put back after, so the notices are never
 * a selected look's by accident — the one road to a carrying inventory is a
 * caller that hands its selection's variables over.
 */
export async function bundleInventory({ env = {} } = {}) {
    const modules = [];
    const assets = [];
    await withLooksEnv(env, () => build({
        root: ROOT,
        logLevel: 'silent',
        build: { write: false },
        plugins: [
            {
                name: 'stall-notices-inventory',
                generateBundle(_options, bundle) {
                    for (const part of Object.values(bundle)) {
                        if (part.type === 'chunk') {
                            for (const [id, info] of Object.entries(part.modules)) {
                                modules.push({ id, renderedLength: info.renderedLength });
                            }
                        } else {
                            assets.push({
                                fileName: part.fileName,
                                originalFileNames: [...(part.originalFileNames ?? [])],
                            });
                        }
                    }
                },
            },
        ],
    }));
    return { modules, assets };
}

/**
 * The package folders an inventory ships code from (a module's rendered
 * length over zero). A carried look's sheet, imported `?url` from the
 * directory the build writes it to (`MATERIALISED_PREFIX`), is a module too:
 * the look's data, never a package, and set aside here.
 */
function packageDirs(inventory) {
    const dirs = new Set();
    for (const { id, renderedLength } of inventory.modules) {
        if (renderedLength > 0 && !id.includes(`/${MATERIALISED_PREFIX}`)) {
            const kind = classifyModule(id, ROOT);
            if (kind.kind === 'package') dirs.add(kind.dir);
        }
    }
    return dirs;
}

/**
 * Why a build carrying a selection does not ship what the public notices and
 * its looks' own `fonts.json` name, as sentences (8e2): a package the public
 * build does not ship — a look is data and brings no code — or a face that
 * is neither a tracked face (`FONTS`) nor one a carried look serves, as the
 * build writes it (under its materialised directory, `MATERIALISED_PREFIX`)
 * and its `fonts.json` names. Also answers the carried faces, by file. Pure:
 * inventories and the looks' face lists in.
 */
export function selectedNoticesProblems({ publicInventory, selectedInventory, lookFaces }) {
    const problems = [];
    const known = packageDirs(publicInventory);
    for (const dir of packageDirs(selectedInventory)) {
        if (!known.has(dir)) {
            problems.push(`the selection's build ships ${dir.slice(ROOT.length + 1)}, which the public build does not — a look brings no code`);
        }
    }
    const faces = new Set();
    for (const asset of selectedInventory.assets) {
        for (const source of asset.originalFileNames) {
            if (!FONT_FILE.test(source) || source.includes('node_modules/')) continue;
            if (FONTS.some((font) => font.files[source] !== undefined)) continue;
            const carried = source.includes(`/${MATERIALISED_PREFIX}`) && lookFaces.includes(basename(source));
            if (carried) {
                faces.add(basename(source));
            } else {
                problems.push(`the selection's build emits a face no notice names: ${source} (${asset.fileName})`);
            }
        }
    }
    return { problems, faces: [...faces].sort() };
}

/** The face files a carried look's `fonts.json` names (8e1's shape), by file name. */
export function lookFaceFiles(fontsText) {
    if (fontsText === undefined) return [];
    const json = JSON.parse(fontsText);
    return (json?.fonts ?? []).flatMap((font) => Object.keys(font?.files ?? {}));
}

function licenceFile(dir, pattern) {
    const found = readdirSync(dir)
        .filter((name) => pattern.test(name))
        .sort();
    return found.length === 0 ? undefined : readFileSync(join(dir, found[0]), 'utf8');
}

function readPackage(dir) {
    const json = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    if (typeof json.name !== 'string' || typeof json.version !== 'string') {
        throw new Error(`notices: a package.json with no name or version under ${dir}`);
    }
    if (typeof json.license !== 'string') {
        throw new Error(`notices: ${json.name}@${json.version} states no SPDX licence string`);
    }
    return {
        name: json.name,
        version: json.version,
        licence: json.license,
        licenceText: licenceFile(dir, /^(licen[cs]e|copying)(\.(md|txt))?$/i),
        noticeText: licenceFile(dir, /^notice(\.(md|txt))?$/i),
    };
}

/** The file's text, from an inventory. Pure apart from reading package folders. */
export function composeNotices(inventory) {
    const dirs = new Set();
    for (const { id, renderedLength } of inventory.modules) {
        if (!(renderedLength > 0)) {
            continue;
        }
        const kind = classifyModule(id, ROOT);
        if (kind.kind === 'package') {
            dirs.add(kind.dir);
        }
    }

    const served = new Map();
    for (const asset of inventory.assets) {
        const sources = asset.originalFileNames;
        if (sources.length === 0) {
            throw new Error(`notices: an emitted asset with no source file: ${asset.fileName}`);
        }
        for (const source of sources) {
            if (source.includes('node_modules/')) {
                const at = source.lastIndexOf('node_modules/');
                const rest = source.slice(at + 'node_modules/'.length).split('/');
                const name = rest[0].startsWith('@') ? `${rest[0]}/${rest[1]}` : rest[0];
                dirs.add(join(ROOT, source.slice(0, at + 'node_modules/'.length) + name));
                continue;
            }
            if (!FONT_FILE.test(source)) {
                continue;
            }
            const font = FONTS.find((f) => f.files[source] !== undefined);
            if (font === undefined) {
                throw new Error(`notices: a font this list does not name: ${source} (${asset.fileName})`);
            }
            const files = served.get(font) ?? new Set();
            files.add(source);
            served.set(font, files);
        }
    }

    const packages = [...dirs].map(readPackage);
    const fonts = [...served].map(([font, files]) => {
        const listed = Object.keys(font.files).filter((file) => files.has(file));
        const subsets = listed.map((file) => font.files[file]);
        return {
            name: font.name,
            files: listed.map((file) => file.slice(file.lastIndexOf('/') + 1)),
            subsets:
                subsets.length === 1
                    ? `${subsets[0]} subset`
                    : `${subsets.slice(0, -1).join(', ')} and ${subsets[subsets.length - 1]} subsets`,
            licenceText: readFileSync(join(ROOT, font.licence), 'utf8'),
        };
    });
    return noticesText({ packages, fonts, overrides: COPYRIGHT_OVERRIDES });
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
    const selection = harnessSelection('notices');
    const publicInventory = await bundleInventory();
    const text = composeNotices(publicInventory);
    writeFileSync(NOTICES_PATH, text);
    const count = (text.match(/^- /gm) ?? []).length;
    console.log(`wrote public/licenses.txt: ${text.length} bytes, ${count} entries${selection === undefined ? '' : ' (the public build)'}`);
    if (selection !== undefined) {
        const { harnessLooks } = await import('./harness-looks.mjs');
        const { privateLookReads } = await import('./served-sheets.mjs');
        const carried = await harnessLooks(selection);
        console.log(`  notices: and the build of ${carried.line}`);
        const reads = await privateLookReads({ env: carried.env });
        const lookFaces = reads.flatMap((look) => lookFaceFiles(look.fontsText));
        const selectedInventory = await bundleInventory({ env: carried.env });
        const { problems, faces } = selectedNoticesProblems({ publicInventory, selectedInventory, lookFaces });
        if (problems.length > 0) {
            console.error(`✗ notices: the selection's build ships what no notice names:\n    ${problems.join('\n    ')}`);
            process.exit(1);
        }
        console.log(
            `✓ notices: the selection's build ships the public notices' packages and no other; ` +
                (faces.length === 0
                    ? 'it serves no face of a look\'s own'
                    : `the deploy build's own licenses.txt adds ${faces.join(', ')} (named in ${LOOK_FONTS_FILE})`),
        );
    }
}
