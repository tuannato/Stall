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
 * - **its licence is beside it and is the OFL 1.1**: `art/LICENSE-OFL*.txt`
 *   (`PRIVATE_FACE_LICENCE`), stating "SIL Open Font License, Version 1.1",
 *   naming a copyright holder, and carried into the ASCII notices as it is
 *   (`ascii` folds or refuses); no licence beside the faces that no entry
 *   uses;
 * - **a Reserved Font Name stays reserved**: when the licence reserves a
 *   name (`with Reserved Font Name "X"`), no name record of its faces but
 *   the copyright notice (ID 0) presents it — a subset is a Modified
 *   Version, and condition 3 bars one from presenting a reserved name as
 *   its primary name (Lora's rename to Stall Serif, `scripts/stall-serif.py`);
 * - **every face is a WOFF2 this reader can read**, with a name table.
 *
 * Read by the build before Vite reads a byte (`readSelectedLooks`), by the
 * static guard over every private look a run reads
 * (`a-private-face-carries-its-licence`, `scripts/look-faces.test.mjs`) and
 * by the deploy build's notices (`lookFontNotices`,
 * `a-deploy-build-names-every-face-it-serves`). Node built-ins and the
 * notices' own pure text helpers; a `.d.mts` beside it.
 */
import { brotliDecompressSync } from 'node:zlib';
import { ascii, copyrightLines } from './notices-lib.mjs';
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
 * Every name record of a single-font WOFF2, as `{ id, platform, text }`.
 * Throws when `buf` is not a WOFF2, its stream does not decompress, or it
 * holds no name table — never an empty list for a file it could not read.
 */
export function woff2NameRecords(buf) {
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
    let offset = 0;
    let name;
    for (const table of tables) {
        if (table.tag === 5) {
            name = stream.subarray(offset, offset + table.length);
        }
        offset += table.length;
    }
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
 * The names a licence text reserves: every quoted name after "with Reserved
 * Font Name" (or "Names", a list joined by commas or "and") in its copyright
 * statements. The licence's own definition — `"Reserved Font Name" refers
 * to …` — quotes the term before it, and is not a reservation.
 */
export function reservedFontNames(licenceText) {
    const out = [];
    for (const m of licenceText.matchAll(/Reserved Font Names?\s+((?:"[^"\n]+"(?:\s*(?:,|and|&)\s*)?)+)/gi)) {
        for (const q of m[1].matchAll(/"([^"\n]+)"/g)) {
            if (!out.includes(q[1])) {
                out.push(q[1]);
            }
        }
    }
    return out;
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
    if (!OFL_STATEMENT.test(text)) {
        out.push(`art/${name}: does not state "SIL Open Font License, Version 1.1" — a look's face is under the OFL 1.1, as every face this site serves`);
    }
    try {
        ascii(text);
    } catch (error) {
        out.push(`art/${name}: ${error.message.replace(/^notices: /, '')} — the notices carry it as ASCII`);
    }
    if (copyrightLines(text).length === 0) {
        out.push(`art/${name}: names no copyright holder ("Copyright <year> …") — the notices name the holder with the face`);
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
        const reserved = licence === undefined ? [] : reservedFontNames(licence.bytes.toString('utf8'));
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
            for (const name of reserved) {
                for (const record of records.filter((r) => r.id !== 0 && r.text.toLowerCase().includes(name.toLowerCase()))) {
                    problems.push(
                        `art/${file}: name ID ${record.id} presents "${name}", a Reserved Font Name of art/${font.licence} — a subset is a Modified Version and takes another name (OFL condition 3)`,
                    );
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
