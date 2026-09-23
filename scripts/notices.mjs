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
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { classifyModule, noticesText } from './notices-lib.mjs';

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
];

const FONT_FILE = /\.(woff2?|ttf|otf|eot)$/i;

/**
 * What the bundle ships: every chunk module with its rendered length, and
 * every emitted asset with the source files it came from.
 */
export async function bundleInventory() {
    const modules = [];
    const assets = [];
    await build({
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
    });
    return { modules, assets };
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
    const text = composeNotices(await bundleInventory());
    writeFileSync(NOTICES_PATH, text);
    const count = (text.match(/^- /gm) ?? []).length;
    console.log(`wrote public/licenses.txt: ${text.length} bytes, ${count} entries`);
}
