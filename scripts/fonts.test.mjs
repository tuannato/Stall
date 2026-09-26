import { strict as assert } from 'node:assert';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { brotliDecompressSync } from 'node:zlib';

/**
 * `stall-serif-carries-no-reserved-name`: Rural's serif is Lora, whose OFL
 * reserves the name "Lora". A subset is a Modified Version, and a Modified
 * Version may not present a Reserved Font Name as its primary name
 * (condition 3), so `scripts/stall-serif.py` renames Fontsource's files to
 * "Stall Serif" and keeps the copyright notice (condition 2). This reads the
 * name table out of every served woff2 and holds both halves — so a Lora file
 * copied in again by hand, or a CSS family that says 'Lora', turns red.
 *
 * `node --test`, like the other scripts' tests: WOFF2 is parsed here with
 * Node's own brotli, and nothing else.
 */

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const FONTS = join(ROOT, 'src', 'ui', 'fonts');

/** WOFF2 UIntBase128 (the spec's §4.1). */
function base128(buf, at) {
    let value = 0;
    for (let i = 0; i < 5; i += 1) {
        const byte = buf[at.i];
        at.i += 1;
        value = value * 128 + (byte & 0x7f);
        if ((byte & 0x80) === 0) {
            return value;
        }
    }
    throw new Error('bad UIntBase128');
}

/** Every name record of a single-font WOFF2, as { id, platform, text }. */
function nameRecords(file) {
    const buf = readFileSync(file);
    assert.equal(buf.toString('latin1', 0, 4), 'wOF2', `${file} is not WOFF2`);
    const numTables = buf.readUInt16BE(12);
    const compressedSize = buf.readUInt32BE(20);
    const at = { i: 48 };
    const tables = [];
    for (let t = 0; t < numTables; t += 1) {
        const flags = buf[at.i];
        at.i += 1;
        const known = flags & 0x3f;
        let tag = known;
        if (known === 0x3f) {
            tag = buf.toString('latin1', at.i, at.i + 4);
            at.i += 4;
        }
        const version = (flags >> 6) & 3;
        const origLength = base128(buf, at);
        // glyf (10) and loca (11) are transformed at version 0; every other
        // table is transformed at any other version.
        const transformed = known === 10 || known === 11 ? version === 0 : version !== 0;
        const length = transformed ? base128(buf, at) : origLength;
        tables.push({ tag, length });
    }
    const stream = brotliDecompressSync(buf.subarray(at.i, at.i + compressedSize));
    let offset = 0;
    let name;
    for (const table of tables) {
        if (table.tag === 5) {
            name = stream.subarray(offset, offset + table.length);
        }
        offset += table.length;
    }
    assert.ok(name !== undefined, `${file} has no name table`);
    const count = name.readUInt16BE(2);
    const strings = name.readUInt16BE(4);
    const out = [];
    for (let r = 0; r < count; r += 1) {
        const rec = 6 + r * 12;
        const platform = name.readUInt16BE(rec);
        const id = name.readUInt16BE(rec + 6);
        const length = name.readUInt16BE(rec + 8);
        const start = strings + name.readUInt16BE(rec + 10);
        const raw = name.subarray(start, start + length);
        const text =
            platform === 3 || platform === 0
                ? Buffer.from(raw).swap16().toString('utf16le')
                : raw.toString('latin1');
        out.push({ id, platform, text });
    }
    return out;
}

const PRIMARY = [1, 3, 4, 6, 16, 17];

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
            const primary = records.filter((r) => PRIMARY.includes(r.id));
            assert.ok(primary.length > 0, `${file}: no primary name`);
            for (const r of primary) {
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

    it('names no family "Lora" in any served stylesheet or font stack', () => {
        const css = readFileSync(join(ROOT, 'src', 'ui', 'stall.css'), 'utf8');
        assert.doesNotMatch(css, /font-family:\s*['"]?Lora/);
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
