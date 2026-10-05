import { strict as assert } from 'node:assert';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { woff2NameRecords } from './look-faces.mjs';
import { guardSheets, privateRows } from './served-sheets.mjs';

/**
 * `stall-serif-carries-no-reserved-name`: Rural's serif is Lora, whose OFL
 * reserves the name "Lora". A subset is a Modified Version, and a Modified
 * Version may not present a Reserved Font Name as its primary name
 * (condition 3), so `scripts/stall-serif.py` renames Fontsource's files to
 * "Stall Serif" and keeps the copyright notice (condition 2). This reads the
 * name table out of every served woff2 and holds both halves — so a Lora file
 * copied in again by hand, or a CSS family that says 'Lora', turns red.
 *
 * `node --test`, like the other scripts' tests: WOFF2 is parsed with Node's
 * own brotli, and nothing else (`woff2NameRecords`, `scripts/look-faces.mjs`,
 * which a private look's faces are read with too). The stylesheets are the
 * ones a run serves (`guardSheets`): a private look's sheet names no Lora
 * either.
 */

const nameRecords = (file) => woff2NameRecords(readFileSync(file));

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const FONTS = join(ROOT, 'src', 'ui', 'fonts');

describe('stall-serif-carries-no-reserved-name', () => {
    const serif = readdirSync(FONTS).filter((f) => f.startsWith('stall-serif-') && f.endsWith('.woff2'));

    it('ships the four renamed subsets and no file named for Lora', () => {
        assert.deepEqual(serif.sort(), [
            'stall-serif-latin-italic.woff2',
            'stall-serif-latin.woff2',
            'stall-serif-vietnamese-italic.woff2',
            'stall-serif-vietnamese.woff2',
        ]);
        assert.deepEqual(
            readdirSync(FONTS).filter((f) => /lora/i.test(f)),
            [],
        );
    });

    it('presents "Stall Serif" and keeps the Lora copyright notice', () => {
        for (const file of serif) {
            const records = nameRecords(join(FONTS, file));
            // Every record but the copyright notice (ID 0), which must keep
            // it: the primary names, ID 25's variations prefix and the
            // fvar/STAT instance names alike.
            for (const r of records.filter((rec) => rec.id !== 0)) {
                assert.ok(!/lora/i.test(r.text), `${file}: name ID ${r.id} says "${r.text}"`);
            }
            assert.ok(
                records.some((r) => r.id === 1 && r.text === 'Stall Serif'),
                `${file}: family is not "Stall Serif"`,
            );
            assert.ok(
                records.some((r) => r.id === 0 && r.text.includes('The Lora Project Authors')),
                `${file}: the copyright notice was not kept`,
            );
        }
    });

    it('names no family "Lora" in any served stylesheet or font stack', async () => {
        const sheets = await guardSheets();
        assert.ok(privateRows(sheets).length > 0, 'a private look sheet is read');
        for (const { path, css } of sheets) {
            assert.doesNotMatch(css, /font-family:[^;]*\bLora\b/i, `${path} names Lora as a family`);
            assert.doesNotMatch(css, /\bfont:[^;]*\bLora\b/i, `${path} names Lora in a font shorthand`);
        }
        const theme = readFileSync(join(ROOT, 'src', 'domain', 'theme.ts'), 'utf8');
        const stacks = theme.slice(theme.indexOf('export const FONT_STACKS'), theme.indexOf('] as const;'));
        assert.doesNotMatch(stacks, /Lora/);
        assert.match(stacks, /"Stall Serif"/);
    });

    it('holds the licence beside the files, and the other faces reserve no name', () => {
        const serifLicence = readFileSync(join(FONTS, 'LICENSE-OFL-stall-serif.txt'), 'utf8');
        assert.match(serifLicence, /SIL Open Font License, Version 1\.1/);
        for (const other of ['LICENSE-OFL.txt', 'LICENSE-OFL-jetbrains-mono.txt']) {
            const text = readFileSync(join(FONTS, other), 'utf8');
            assert.doesNotMatch(text, /with Reserved Font Name "/, `${other} reserves a name`);
        }
    });
});
