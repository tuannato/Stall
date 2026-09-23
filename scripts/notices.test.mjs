import { strict as assert } from 'node:assert';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { before, describe, it } from 'node:test';
import { NOTICES_PATH, ROOT, bundleInventory, composeNotices } from './notices.mjs';

/**
 * `public/licenses.txt` against what the bundle actually ships.
 *
 * `node --test` rather than vitest, like `pay-screens.test.mjs` beside it:
 * a TypeScript test importing this `.mjs` from `src/` breaks `pnpm build`'s
 * `tsc` (TS7016), and vitest never type-checks, so it would pass there and
 * fail the deploy.
 *
 * One build for the file: an in-memory `vite build` is the only witness of
 * which modules and assets reach a browser, and every test below reads it.
 */
let inventory;
before(
    async () => {
        inventory = await bundleInventory();
    },
    { timeout: 300_000 },
);

const LICENCE_ALLOW = new Set(['MIT', 'ISC', 'BSD-2-Clause', 'BSD-3-Clause', 'Apache-2.0', '0BSD']);

/** Formatting aside: the file's words, compared with a source's words. */
const flat = (text) => text.replace(/\s+/g, ' ').trim();

/** Folded the one way the file folds a curly quote, for comparing words only. */
const plain = (text) => flat(text.replace(/[“”]/g, '"').replace(/[‘’]/g, "'"));

/**
 * The package folders the bundle ships code from, derived here and NOT
 * through `scripts/notices-lib.mjs`: a module's path, its `\0` markers and
 * `?query` dropped, cut after its last `/node_modules/<name>` — the
 * folder's own `package.json` names it.
 */
function shippedPackages() {
    const out = new Map();
    for (const { id, renderedLength } of inventory.modules) {
        if (!(renderedLength > 0)) {
            continue;
        }
        const path = id.replace(/^\0+/, '').split('?')[0];
        const at = path.lastIndexOf('/node_modules/');
        if (at < 0) {
            continue;
        }
        const parts = path.slice(at + '/node_modules/'.length).split('/');
        const name = parts[0].startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
        const dir = `${path.slice(0, at)}/node_modules/${name}`;
        const json = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
        out.set(`${json.name}@${json.version}`, { dir, licence: json.license });
    }
    return out;
}

/** "name version" off every "- name version - holder" line of the file. */
function listedPackages(text) {
    return new Set([...text.matchAll(/^- (\S+) (\d\S*) - /gm)].map((m) => `${m[1]}@${m[2]}`));
}

const FONT_FILE = /\.(woff2?|ttf|otf|eot)$/i;

describe('the-notices-name-every-package-the-bundle-ships', () => {
    it('lists exactly the packages whose code the bundle renders, both ways', () => {
        const shipped = shippedPackages();
        assert.ok(shipped.size > 5, `the build shipped only ${shipped.size} packages`);
        const listed = listedPackages(readFileSync(NOTICES_PATH, 'utf8'));
        const missing = [...shipped.keys()].filter((key) => !listed.has(key)).sort();
        const extra = [...listed].filter((key) => !shipped.has(key)).sort();
        assert.deepEqual(missing, [], `shipped but not in public/licenses.txt: ${missing.join(', ')}`);
        assert.deepEqual(extra, [], `in public/licenses.txt but not shipped: ${extra.join(', ')}`);
    });

    it('ships nothing under a licence off the allow-list', () => {
        for (const [key, { licence }] of shippedPackages()) {
            assert.ok(LICENCE_ALLOW.has(licence), `${key} is under ${String(licence)}`);
        }
    });

    it('carries each shipped family’s full licence text', () => {
        const text = flat(readFileSync(NOTICES_PATH, 'utf8'));
        const families = new Set([...shippedPackages().values()].map((pkg) => pkg.licence));
        // The words each text opens and closes on, as the licence writes them.
        const anchors = {
            MIT: [
                'Permission is hereby granted, free of charge, to any person obtaining a copy',
                'The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.',
                'OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.',
            ],
            'BSD-3-Clause': [
                'Redistribution and use in source and binary forms, with or without modification',
                'Neither the name of',
                'EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.',
            ],
        };
        for (const family of families) {
            if (family === 'Apache-2.0') {
                // Fixed text: every shipped Apache package's LICENSE, whole.
                for (const [key, pkg] of shippedPackages()) {
                    if (pkg.licence !== 'Apache-2.0') {
                        continue;
                    }
                    const licence = readdirSync(pkg.dir).find((name) => /^licen[cs]e/i.test(name));
                    assert.ok(licence !== undefined, `${key} ships no LICENSE`);
                    assert.ok(
                        text.includes(plain(readFileSync(join(pkg.dir, licence), 'utf8'))),
                        `the Apache text of ${key} is not in the file whole`,
                    );
                }
                continue;
            }
            const words = anchors[family];
            assert.ok(words !== undefined, `no anchors for ${family}: add them here`);
            for (const sentence of words) {
                assert.ok(text.includes(sentence), `${family}: missing "${sentence}"`);
            }
        }
    });

    it('names every font the bundle serves, with its licence beside it', () => {
        const text = readFileSync(NOTICES_PATH, 'utf8');
        const fonts = inventory.assets.filter((asset) => FONT_FILE.test(asset.fileName));
        assert.ok(fonts.length > 0, 'no font was emitted: the fonts half proves nothing');
        for (const asset of fonts) {
            for (const source of asset.originalFileNames) {
                const base = source.slice(source.lastIndexOf('/') + 1);
                assert.ok(text.includes(base), `${base} is served and not named`);
                // The licence that travels with a font sits beside it.
                const dir = join(ROOT, dirname(source));
                const licence = readdirSync(dir).find((name) => /licen[cs]e|ofl/i.test(name));
                assert.ok(licence !== undefined, `${source} has no licence beside it`);
                const words = plain(readFileSync(join(dir, licence), 'utf8'));
                assert.ok(flat(text).includes(words), `${source}: its licence is not in the file whole`);
            }
        }
        assert.ok(text.includes('Copyright (c) 2016 The Inter Project Authors'));
        assert.ok(text.includes('SIL OPEN FONT LICENSE Version 1.1'));
    });
});

describe('the-notices-file-is-what-the-script-writes', () => {
    it('is byte for byte what scripts/notices.mjs composes from this build', () => {
        const composed = composeNotices(inventory);
        const onDisk = readFileSync(NOTICES_PATH, 'utf8');
        assert.ok(
            composed === onDisk,
            'public/licenses.txt is stale: run node scripts/notices.mjs and commit the diff',
        );
    });
});

describe('the-notices-are-ascii-and-carry-no-mailbox-or-local-path', () => {
    it('is ASCII, dateless, and names no mailbox and no path on this machine', () => {
        const text = readFileSync(NOTICES_PATH, 'utf8');
        assert.match(text, /^[\x00-\x7f]*$/, 'a non-ASCII byte: Pages serves .txt with no charset promise');
        assert.doesNotMatch(text, /[\w.+-]+@[\w-]+\.[\w.-]+/, 'a mailbox reached the file');
        assert.doesNotMatch(text, /<[^<>\s]*@[^<>\s]*>/, 'a bracketed mailbox reached the file');
        assert.ok(!text.includes('/home/'), 'a home directory path reached the file');
        assert.ok(!text.includes(ROOT), 'this checkout’s path reached the file');
        assert.ok(!text.includes('.pnpm') && !text.includes('file+vendor'), 'a store path reached the file');
        // Byte-stable: a date would change the file on every run.
        assert.doesNotMatch(text, /\b20\d\d-\d\d-\d\d\b/, 'a date reached the file');
        assert.ok(text.endsWith('\n') && !text.endsWith('\n\n'), 'one newline at the end');
    });
});
