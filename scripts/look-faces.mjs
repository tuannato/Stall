/**
 * A private look's faces (step 8e1): which of its files are faces, the OFL
 * text each travels with, and the name a deploy build's notices give them —
 * plus the WOFF2 name-table reader every face check shares (the tracked
 * faces' `stall-serif-carries-no-reserved-name` reads them with it).
 *
 * **A look that serves a face says so in `<slug>/fonts.json`**, never in its
 * `look.json`: the look's data is the runtime's, carried into the bundle as
 * the file's text and refused whole by the app's validator on an unknown
 * field, while what a face is called and which licence it travels with is
 * the build's alone (its notices and this check). The shape mirrors the
 * tracked faces' `FONTS` (`scripts/notices.mjs`):
 *
 *     { "fonts": [ { "name": "Noto Serif",
 *                    "files": { "noto-serif-latin.woff2": "Latin" },
 *                    "licence": "LICENSE-OFL-noto-serif.txt" } ] }
 *
 * What `lookFaceProblems` holds, over the files of one look's `art/` as git
 * holds them:
 *
 * - **every face is named once**: each `art/*.woff2` in exactly one entry,
 *   and each entry's files faces that are there;
 * - **every face is served**: its sheet names it (`url(./art/<face>)`) —
 *   Vite emits only what a sheet names, so a face nothing names is in no
 *   build, and a notice naming it would claim a face this site does not
 *   send;
 * - **its licence is beside it and is the OFL 1.1, whole**:
 *   `art/LICENSE-OFL*.txt` (`PRIVATE_FACE_LICENCE`), stating "SIL Open Font
 *   License, Version 1.1", naming a copyright holder, carried into the ASCII
 *   notices as it is (`ascii` folds or refuses), and **carrying the licence
 *   itself** — from "SIL OPEN FONT LICENSE Version 1.1" to its end, equal to
 *   the tracked `src/ui/fonts/LICENSE-OFL.txt`'s once typography, whitespace,
 *   rule lengths and `&`/`AND` are folded (`oflBodyOf`): condition 2 has the
 *   licence travel with the font, and a text that only names the OFL is not
 *   it (the 8e1 critic's item 1); no licence beside the faces that no entry
 *   uses;
 * - **a Reserved Font Name stays reserved**: a name the licence reserves, or
 *   the face's own copyright notice or licence description (name IDs 0 and
 *   13) reserves, is presented by no name record of its faces but the
 *   copyright notice (ID 0) — a subset is a Modified Version, and condition
 *   3 bars one from presenting a reserved name as its primary name (Lora's
 *   rename to Stall Serif, `scripts/stall-serif.py`). **Read fail-closed**
 *   (`readReservations`): the text is folded first (every quote mark, every
 *   dash and space, line breaks), a reservation is read in straight, curly or
 *   single quotes, after a colon, as a list, or unquoted as one name; and a
 *   "Reserved Font Name" this reader cannot read a name from is a problem,
 *   never a pass. Only the licence's header — before its body — states
 *   reservations; the body's own "Reserved Font Name(s)" and the quoted term
 *   are the licence's words, not a reservation;
 * - **the notice names the face it serves**: each face's family (name ID
 *   16, or 1 without it) is its `fonts.json` entry's `name`, and every holder
 *   its copyright notice (ID 0) names is among the licence's copyright
 *   holders — so the notices never name a font or a holder the face does not;
 * - **every face is a WOFF2 this reader can read**, with a name table and a
 *   copyright notice.
 *
 * Read by the build before Vite reads a byte (`readSelectedLooks`), by the
 * static guard over every private look a run reads
 * (`a-private-face-carries-its-licence`, `scripts/look-faces.test.mjs`, with
 * `a-reserved-font-name-is-read-in-any-quoting`,
 * `a-face-that-reserves-its-own-name-is-held-whatever-licence-sits-beside-it`,
 * `a-licence-that-only-names-the-ofl-is-refused` and
 * `a-notice-names-the-face-it-serves`) and by the deploy build's notices
 * (`lookFontNotices`, `a-deploy-build-names-every-face-it-serves`). Node built-ins and the
 * notices' own pure text helpers; a `.d.mts` beside it.
 */
import { readFileSync } from 'node:fs';
import { brotliDecompressSync } from 'node:zlib';
import { ascii } from './notices-lib.mjs';
import { PRIVATE_FACE_LICENCE } from './private-looks.mjs';

/** The file in a look's directory that names its faces, beside `look.json`. */
export const LOOK_FONTS_FILE = 'fonts.json';

/** A face, by its name in the look's `art/`. */
export const FACE_FILE = /^[a-z0-9-]{1,64}\.woff2$/;

/** The sentence an OFL 1.1 licence text states. */
export const OFL_STATEMENT = /SIL Open Font License, Version 1\.1/;

/** A name a notice prints: printable ASCII, as the notices are. */
const PRINTABLE = /^[\x20-\x7e]+$/;
export const FONT_NAME_MAX = 80;
export const SUBSET_MAX = 40;

/** WOFF2 UIntBase128 (the spec's §4.1). */
function base128(buf, at) {
    let value = 0;
    for (let i = 0; i < 5; i += 1) {
        if (at.i >= buf.length) {
            throw new Error('a UIntBase128 runs past the end of the file');
        }
        const byte = buf[at.i];
        at.i += 1;
        value = value * 128 + (byte & 0x7f);
        if ((byte & 0x80) === 0) {
            return value;
        }
    }
    throw new Error('a UIntBase128 longer than five bytes');
}

/**
 * The decompressed tables of a single-font WOFF2, keyed by their known-tag
 * index (the spec's table of 63 tags: 0 is `cmap`, 5 is `name`) or, for a
 * tag outside it, its four letters. A transformed table (`glyf`, `loca`, a
 * transformed `hmtx`) is its transformed bytes; the readers here read only
 * tables WOFF2 never transforms. Throws when `buf` is not a WOFF2 or its
 * stream does not decompress.
 */
function woff2Tables(buf) {
    if (buf.length < 48 || buf.toString('latin1', 0, 4) !== 'wOF2') {
        throw new Error('not a WOFF2 file (no wOF2 signature)');
    }
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
    const out = new Map();
    let offset = 0;
    for (const table of tables) {
        out.set(table.tag, stream.subarray(offset, offset + table.length));
        offset += table.length;
    }
    return out;
}

/**
 * Every name record of a single-font WOFF2, as `{ id, platform, text }`.
 * Throws when `buf` is not a WOFF2, its stream does not decompress, or it
 * holds no name table — never an empty list for a file it could not read.
 */
export function woff2NameRecords(buf) {
    const name = woff2Tables(buf).get(5);
    if (name === undefined || name.length < 6) {
        throw new Error('no name table');
    }
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
        const text = platform === 3 || platform === 0 ? Buffer.from(raw).swap16().toString('utf16le') : raw.toString('latin1');
        out.push({ id, platform, text });
    }
    return out;
}

/**
 * Every code point a single-font WOFF2 maps to a glyph other than
 * `.notdef`, read from its `cmap`: a Unicode subtable of format 12 when the
 * face has one, else of format 4 (platform 0, or platform 3 encoding 1 or
 * 10). The face's own coverage, which its `@font-face` `unicode-range` only
 * declares — a range may claim a code point the file holds no glyph for
 * (`every-glyph-the-app-prints-is-in-its-face`, `scripts/served-faces.mjs`).
 * Throws when the file holds no Unicode subtable this reader reads.
 */
export function woff2CodePoints(buf) {
    const cmap = woff2Tables(buf).get(0);
    if (cmap === undefined || cmap.length < 4) {
        throw new Error('no cmap table');
    }
    const records = [];
    for (let r = 0; r < cmap.readUInt16BE(2); r += 1) {
        const rec = 4 + r * 8;
        const platform = cmap.readUInt16BE(rec);
        const encoding = cmap.readUInt16BE(rec + 2);
        const offset = cmap.readUInt32BE(rec + 4);
        const unicode = platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10));
        if (unicode) records.push({ offset, format: cmap.readUInt16BE(offset) });
    }
    const out = new Set();
    const twelve = records.find((r) => r.format === 12);
    if (twelve !== undefined) {
        const groups = cmap.readUInt32BE(twelve.offset + 12);
        for (let g = 0; g < groups; g += 1) {
            const at = twelve.offset + 16 + g * 12;
            const start = cmap.readUInt32BE(at);
            const end = cmap.readUInt32BE(at + 4);
            const glyph = cmap.readUInt32BE(at + 8);
            for (let c = start; c <= end; c += 1) {
                if (glyph + (c - start) !== 0) out.add(c);
            }
        }
        return out;
    }
    const four = records.find((r) => r.format === 4);
    if (four === undefined) {
        throw new Error('no Unicode cmap subtable of format 4 or 12');
    }
    const base = four.offset;
    const segments = cmap.readUInt16BE(base + 6) / 2;
    const ends = base + 14;
    const starts = ends + segments * 2 + 2;
    const deltas = starts + segments * 2;
    const rangeOffsets = deltas + segments * 2;
    for (let s = 0; s < segments; s += 1) {
        const end = cmap.readUInt16BE(ends + s * 2);
        const start = cmap.readUInt16BE(starts + s * 2);
        const delta = cmap.readInt16BE(deltas + s * 2);
        const rangeOffset = cmap.readUInt16BE(rangeOffsets + s * 2);
        for (let c = start; c <= end && c !== 0xffff; c += 1) {
            let glyph;
            if (rangeOffset === 0) {
                glyph = (c + delta) & 0xffff;
            } else {
                const at = rangeOffsets + s * 2 + rangeOffset + (c - start) * 2;
                const raw = cmap.readUInt16BE(at);
                glyph = raw === 0 ? 0 : (raw + delta) & 0xffff;
            }
            if (glyph !== 0) out.add(c);
        }
    }
    return out;
}

/** The line the OFL's own body opens with. */
export const OFL_BODY_START = 'SIL OPEN FONT LICENSE Version 1.1';

const SINGLE_QUOTES = /[‘’‚‛′´`＇]/g;
const DOUBLE_QUOTES = /[“”„‟″«»‹›「」『』〝〞＂]/g;
const DASHES = /[‐-―−﹘﹣－]/g;
const SPACES = /[   -​  　﻿]/g;

/**
 * A text folded for reading, never for printing: every quote mark to `'` or
 * `"`, every dash to `-`, every space to a space, CRLF to LF. Lenient where
 * the notices' `ascii` refuses — a reader that met a mark it did not know
 * would read nothing, and reading nothing is how a reservation passed.
 */
export function foldForReading(text) {
    return String(text)
        .replace(/\r\n?/g, '\n')
        .replace(SINGLE_QUOTES, "'")
        .replace(DOUBLE_QUOTES, '"')
        .replace(DASHES, '-')
        .replace(SPACES, ' ');
}

/** Where an OFL text's body starts in its folded form, or -1. */
const bodyAt = (folded) => folded.indexOf(OFL_BODY_START);

/**
 * An OFL text's body as compared: from "SIL OPEN FONT LICENSE Version 1.1"
 * to its end, folded, rules of three or more dashes as one, `&` as `AND`
 * (both spellings ship — Stall Serif's and JetBrains Mono's say `&`, Inter's
 * `AND`), whitespace collapsed. Undefined for a text with no body.
 */
export function oflBodyOf(text) {
    const folded = foldForReading(text);
    const at = bodyAt(folded);
    if (at < 0) {
        return undefined;
    }
    return folded
        .slice(at)
        .replace(/-{3,}/g, '---')
        .replace(/ & /g, ' AND ')
        .replace(/\s+/g, ' ')
        .trim();
}

let canonicalBody;

/** The OFL 1.1 body every private face's licence carries: the tracked `src/ui/fonts/LICENSE-OFL.txt`'s. */
export function canonicalOflBody() {
    canonicalBody ??= oflBodyOf(readFileSync(new URL('../src/ui/fonts/LICENSE-OFL.txt', import.meta.url), 'utf8'));
    if (canonicalBody === undefined) {
        throw new Error('src/ui/fonts/LICENSE-OFL.txt carries no OFL body');
    }
    return canonicalBody;
}

/** A licence text's header: what precedes its body (all of it, with no body), where its copyright statements and reservations are. */
function headerOf(text) {
    const folded = foldForReading(text);
    const at = bodyAt(folded);
    return at < 0 ? folded : folded.slice(0, at);
}

const QUOTED_LIST = /^(?:(["'])([^"'\n]{1,64})\1(?:\s*(?:,|and|&)\s*)?)+/i;
const UNQUOTED_NAME = /^([A-Za-z0-9][A-Za-z0-9 \-]{0,63}?)\s*(?=[.;,)]|$)/;

/**
 * Every reservation `text` states: `{ names, unreadable }`. `text` is folded
 * first and read with any whitespace — a line break included — between the
 * words of "Reserved Font Name(s)"; after it an optional colon, then a list
 * of names in straight or single quotes (curly ones fold to them), joined by
 * commas, "and" or "&", or one unquoted name up to a full stop, a comma, a
 * semicolon or the end. Not a reservation: "Reserved Font Name(s)" (the
 * body's condition 3) and the term in quotes (its definition). Every other
 * occurrence that yields no name is `unreadable` — the caller refuses it.
 */
export function readReservations(text) {
    const folded = foldForReading(text).replace(/\s+/g, ' ');
    const names = [];
    const unreadable = [];
    for (const m of folded.matchAll(/reserved\s+font\s+names?/gi)) {
        const before = folded[m.index - 1];
        const after = folded.slice(m.index + m[0].length);
        if (/^\s*\(s\)/i.test(after)) {
            continue;
        }
        if ((before === '"' || before === "'") && /^["']/.test(after)) {
            continue;
        }
        const rest = after.replace(/^\s*[:=]?\s*/, '');
        const quoted = QUOTED_LIST.exec(rest);
        const found = [];
        if (quoted !== null) {
            for (const q of quoted[0].matchAll(/(["'])([^"'\n]{1,64})\1/g)) {
                found.push(q[2].trim());
            }
        } else {
            const bare = UNQUOTED_NAME.exec(rest);
            if (bare !== null && !/\b(?:and|or)\b|&/i.test(bare[1])) {
                found.push(bare[1].trim());
            }
        }
        if (found.length === 0 || found.some((name) => name === '')) {
            unreadable.push(folded.slice(m.index, m.index + m[0].length + 40).trim());
            continue;
        }
        for (const name of found) {
            if (!names.includes(name)) {
                names.push(name);
            }
        }
    }
    return { names, unreadable };
}

/** The names a licence text reserves in its header (`readReservations` over what precedes its body). */
export function reservedFontNames(licenceText) {
    return readReservations(headerOf(licenceText)).names;
}

/**
 * The holder a copyright statement names, lower-cased: what follows
 * "Copyright", a "(c)" or "©" and its years, up to a parenthesis, a comma, a
 * semicolon, a full stop that ends it, or "with". Undefined when nothing is
 * left.
 */
function holderOf(statement) {
    const rest = statement
        .replace(/^copyright\s*/i, '')
        .replace(/^(?:\(c\)|©)\s*/i, '')
        .replace(/^[\d\s,\-]+/, '');
    const m = /^(.+?)(?=\s*(?:\(|,|;|\.(?:\s|$)|\bwith\b|$))/i.exec(rest);
    const holder = m?.[1].replace(/\s+/g, ' ').trim().toLowerCase();
    return holder === undefined || holder === '' ? undefined : holder;
}

/** Every holder `text`'s copyright statements name ("Copyright <years> <holder>", any number of them). */
export function holdersIn(text) {
    const folded = foldForReading(text).replace(/\s+/g, ' ');
    return folded
        .split(/(?=\bcopyright\b)/i)
        .filter((part) => /^copyright\s+(?:\(c\)|©|\d)/i.test(part))
        .map(holderOf)
        .filter((holder) => holder !== undefined);
}

/** The family a face presents: its typographic family (name ID 16) or, without one, its family (ID 1), the Windows record first. */
function familyOf(records) {
    for (const id of [16, 1]) {
        const found = records.filter((r) => r.id === id);
        const record = found.find((r) => r.platform === 3) ?? found[0];
        if (record !== undefined) {
            return record.text.replace(/\s+/g, ' ').trim();
        }
    }
    return undefined;
}

const isPlainObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * A look's `fonts.json`, parsed and shaped: `{ fonts: [{ name, files,
 * licence }] }`, every field required and none beside them. Answers `{
 * fonts, problems }`; `fonts` is undefined whenever a problem was found.
 */
export function parseLookFonts(text) {
    let json;
    try {
        json = JSON.parse(text);
    } catch (error) {
        return { fonts: undefined, problems: [`${LOOK_FONTS_FILE}: not JSON (${error.message})`] };
    }
    if (!isPlainObject(json)) {
        return { fonts: undefined, problems: [`${LOOK_FONTS_FILE}: not an object`] };
    }
    const problems = [];
    for (const key of Object.keys(json)) {
        if (key !== 'fonts') {
            problems.push(`${LOOK_FONTS_FILE}: an unknown field ${JSON.stringify(key)}`);
        }
    }
    if (!Array.isArray(json.fonts) || json.fonts.length === 0) {
        problems.push(`${LOOK_FONTS_FILE}: fonts is not a list naming at least one face`);
        return { fonts: undefined, problems };
    }
    json.fonts.forEach((font, at) => {
        const where = `${LOOK_FONTS_FILE}: fonts[${at}]`;
        if (!isPlainObject(font)) {
            problems.push(`${where}: not an object`);
            return;
        }
        for (const key of Object.keys(font)) {
            if (!['name', 'files', 'licence'].includes(key)) {
                problems.push(`${where}: an unknown field ${JSON.stringify(key)}`);
            }
        }
        if (typeof font.name !== 'string' || !PRINTABLE.test(font.name) || font.name.length > FONT_NAME_MAX || font.name.trim() !== font.name) {
            problems.push(`${where}: name ${JSON.stringify(font.name)} is not printable ASCII, 1 to ${FONT_NAME_MAX} characters, unpadded — the notices print it`);
        }
        if (!isPlainObject(font.files) || Object.keys(font.files).length === 0) {
            problems.push(`${where}: files is not an object naming at least one face`);
        } else {
            for (const [file, subset] of Object.entries(font.files)) {
                if (!FACE_FILE.test(file)) {
                    problems.push(`${where}: ${JSON.stringify(file)} is not a face's name in art/ (<name>.woff2, lower-case letters, digits and hyphens)`);
                }
                if (typeof subset !== 'string' || !PRINTABLE.test(subset) || subset.length > SUBSET_MAX || subset.trim() !== subset) {
                    problems.push(`${where}: the subset of ${JSON.stringify(file)}, ${JSON.stringify(subset)}, is not printable ASCII, 1 to ${SUBSET_MAX} characters, unpadded`);
                }
            }
        }
        if (typeof font.licence !== 'string' || !PRIVATE_FACE_LICENCE.test(font.licence)) {
            problems.push(`${where}: licence ${JSON.stringify(font.licence)} is not an OFL text's name in art/ (LICENSE-OFL.txt or LICENSE-OFL-<name>.txt)`);
        }
    });
    return problems.length > 0 ? { fonts: undefined, problems } : { fonts: json.fonts, problems };
}

/** Why a licence text cannot travel with a face, or none. */
function licenceProblems(name, text) {
    const out = [];
    if (!OFL_STATEMENT.test(foldForReading(text).replace(/\s+/g, ' '))) {
        out.push(`art/${name}: does not state "SIL Open Font License, Version 1.1" — a look's face is under the OFL 1.1, as every face this site serves`);
    }
    const body = oflBodyOf(text);
    if (body === undefined || body !== canonicalOflBody()) {
        out.push(
            `art/${name}: does not carry the OFL 1.1 whole, from "${OFL_BODY_START}" to its end — condition 2 has the licence travel with the font, and a text that names the OFL is not the licence`,
        );
    }
    try {
        ascii(text);
    } catch (error) {
        out.push(`art/${name}: ${error.message.replace(/^notices: /, '')} — the notices carry it as ASCII`);
    }
    if (holdersIn(headerOf(text)).length === 0) {
        out.push(`art/${name}: names no copyright holder ("Copyright <year> …") — the notices name the holder with the face`);
    }
    for (const what of readReservations(headerOf(text)).unreadable) {
        out.push(`art/${name}: a reservation this reader cannot read ("${what}") — a reserved name it cannot name is one it cannot hold`);
    }
    return out;
}

/**
 * Every problem one look's faces have: `fontsText` its `fonts.json` (or
 * undefined when there is none), `art` every plain file of its `art/` as
 * `{ name, bytes }`, `named` the art names its sheet names (`artNamedBy`).
 * None for a look that serves no face and carries no fonts.json.
 */
export function lookFaceProblems({ fontsText, art, named }) {
    const problems = [];
    const faces = art.filter((file) => file.name.endsWith('.woff2'));
    const licences = art.filter((file) => PRIVATE_FACE_LICENCE.test(file.name));
    const byName = new Map(art.map((file) => [file.name, file]));
    if (fontsText === undefined) {
        if (faces.length > 0) {
            problems.push(
                `art/ holds ${faces.map((f) => f.name).join(', ')} and the look has no ${LOOK_FONTS_FILE} — every face is named, with the licence it travels with, for the notices`,
            );
        }
        for (const licence of licences) {
            problems.push(`art/${licence.name}: a licence no face of the look travels with (no ${LOOK_FONTS_FILE})`);
        }
        return problems;
    }
    const { fonts, problems: shape } = parseLookFonts(fontsText);
    problems.push(...shape);
    if (fonts === undefined) {
        return problems;
    }
    const claimed = new Map();
    const usedLicences = new Set();
    fonts.forEach((font, at) => {
        const where = `${LOOK_FONTS_FILE}: fonts[${at}] (${font.name})`;
        const licence = byName.get(font.licence);
        if (licence === undefined) {
            problems.push(`${where}: its licence art/${font.licence} is not beside its faces`);
        } else if (!usedLicences.has(font.licence)) {
            usedLicences.add(font.licence);
            problems.push(...licenceProblems(font.licence, licence.bytes.toString('utf8')));
        }
        const licenceText = licence === undefined ? undefined : licence.bytes.toString('utf8');
        const licenceHolders = licenceText === undefined ? [] : holdersIn(headerOf(licenceText));
        for (const file of Object.keys(font.files)) {
            const first = claimed.get(file);
            if (first !== undefined) {
                problems.push(`${where}: art/${file} is fonts[${first}]'s too — a face is named once`);
                continue;
            }
            claimed.set(file, at);
            const face = byName.get(file);
            if (face === undefined) {
                problems.push(`${where}: art/${file} is not there`);
                continue;
            }
            let records;
            try {
                records = woff2NameRecords(face.bytes);
            } catch (error) {
                problems.push(`art/${file}: not a WOFF2 this reader can read (${error.message})`);
                continue;
            }
            // Reserved by its licence, or by the face's own notice or licence description.
            const own = readReservations(records.filter((r) => r.id === 0 || r.id === 13).map((r) => r.text).join('\n'));
            for (const what of own.unreadable) {
                problems.push(`art/${file}: a reservation in its own name table this reader cannot read ("${what}")`);
            }
            const reserved = [...new Set([...(licenceText === undefined ? [] : reservedFontNames(licenceText)), ...own.names])];
            for (const name of reserved) {
                for (const record of records.filter((r) => r.id !== 0 && foldForReading(r.text).toLowerCase().includes(name.toLowerCase()))) {
                    problems.push(
                        `art/${file}: name ID ${record.id} presents "${name}", a Reserved Font Name of ${own.names.includes(name) ? 'its own copyright notice' : `art/${font.licence}`} — a subset is a Modified Version and takes another name (OFL condition 3)`,
                    );
                }
            }
            // The notice names the face it serves: its family, and its holders.
            const family = familyOf(records);
            if (family === undefined) {
                problems.push(`art/${file}: presents no family name (name ID 16 or 1) for the notices to name`);
            } else if (family !== font.name) {
                problems.push(`${where}: names "${font.name}", and art/${file} presents the family "${family}" — the notices name the face they serve`);
            }
            const faceHolders = holdersIn(records.filter((r) => r.id === 0).map((r) => r.text).join(' '));
            if (faceHolders.length === 0) {
                problems.push(`art/${file}: carries no copyright notice (name ID 0) naming a holder — condition 2 keeps it, and the notices tie the licence to it`);
            }
            for (const holder of faceHolders) {
                if (licence !== undefined && !licenceHolders.includes(holder)) {
                    problems.push(`art/${file}: its copyright notice names "${holder}", whom art/${font.licence} does not — the licence beside a face is the face's own`);
                }
            }
            if (!named.has(file)) {
                problems.push(`art/${file}: a face the sheet names nowhere — it is in no build, and a notice would name a face this site does not send`);
            }
        }
    });
    for (const face of faces) {
        if (!claimed.has(face.name)) {
            problems.push(`art/${face.name}: a face ${LOOK_FONTS_FILE} does not name — every face is named, with the licence it travels with`);
        }
    }
    for (const licence of licences) {
        if (!fonts.some((font) => font.licence === licence.name)) {
            problems.push(`art/${licence.name}: a licence no entry of ${LOOK_FONTS_FILE} travels with`);
        }
    }
    return problems;
}

/**
 * What a deploy build's notices say about one look's faces, from a look
 * `lookFaceProblems` passes: `{ name, files, subsets, licenceText }` per
 * entry, files by their names in `art/`, in the order `fonts.json` lists
 * them — the shape `noticesText` takes for the tracked faces. None for a
 * look with no `fonts.json`.
 */
export function lookFontNotices({ fontsText, art }) {
    if (fontsText === undefined) {
        return [];
    }
    const { fonts, problems } = parseLookFonts(fontsText);
    if (fonts === undefined) {
        throw new Error(`${LOOK_FONTS_FILE}: ${problems.join('; ')}`);
    }
    const byName = new Map(art.map((file) => [file.name, file]));
    return fonts.map((font) => {
        const files = Object.keys(font.files);
        const subsets = files.map((file) => font.files[file]);
        const licence = byName.get(font.licence);
        if (licence === undefined) {
            throw new Error(`${LOOK_FONTS_FILE}: art/${font.licence} is not beside its faces`);
        }
        return {
            name: font.name,
            files,
            subsets:
                subsets.length === 1
                    ? `${subsets[0]} subset`
                    : `${subsets.slice(0, -1).join(', ')} and ${subsets[subsets.length - 1]} subsets`,
            licenceText: licence.bytes.toString('utf8'),
        };
    });
}
