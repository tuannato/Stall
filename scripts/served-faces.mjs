/**
 * The faces Stall serves and what the app prints in them, read statically
 * (the probe-fonts critic's P2-1, 2026-10-06).
 *
 * The probe waits until every declared face is `loaded`
 * (`every-face-is-loaded-before-the-probe-measures`), and a `loaded` face
 * says the file arrived, not that a line was drawn in it. Two things still
 * paint in the reader's own fonts with every face loaded, and both are
 * static facts this module reads:
 *
 * - **a family name no served face declares** — a stack opening with a
 *   misspelt or renamed family (`"Intr"`, the Lora → Stall Serif rename)
 *   skips every served face and paints the next family in the stack, which
 *   is the machine's (`every-font-family-opens-with-a-served-face`);
 * - **a code point no served face holds** — a face's `unicode-range`
 *   declares what it may draw, its file's `cmap` what it can; a character
 *   outside both falls back, per glyph, to a font of the machine's, so it is
 *   drawn differently on every OS (`every-glyph-the-app-prints-is-in-its-face`).
 *
 * "What the app prints" is read from the source, never from a list written
 * here: every string and template literal of the app's own TypeScript
 * (`src/`, tests and declarations aside, and the withheld list's generated
 * data, which is compared and never painted), every `content` string of a
 * sheet the app serves, the generated text any look may print
 * (`GENERATED_TEXT`), and printable ASCII, which figures are made of. A
 * seller's own words, names and descriptions are not the app's and are not
 * read; nor is text an `Intl` formatter writes at runtime.
 *
 * Node built-ins, the TypeScript compiler's parser (a devDependency, used
 * only to find literals), and the WOFF2 reader every face check shares
 * (`woff2CodePoints`, `scripts/look-faces.mjs`). Tests:
 * `scripts/served-faces.test.mjs`.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { woff2CodePoints } from './look-faces.mjs';
import { STALL_CSS, declaredStallFaces, rangePairs } from './probe-faces.mjs';
import { GENERATED_TEXT, blankComments, decodeEscapes } from './workshop-css.mjs';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** App source whose strings no screen prints: the withheld list's generated data is compared against, never painted (CLAUDE §4). */
export const NOT_PRINTED = Object.freeze(['src/domain/withheld-data.ts']);

/** The sheet roles whose `content` strings the app paints: the base, the looks, the screens, the kit and every private look a run reads. */
export const PRINTING_ROLES = Object.freeze(['base', 'look', 'screen', 'kit', 'private']);

/** Characters that draw no glyph of their own: controls, format characters (the describe picker's directional isolates), line and paragraph separators. */
const NO_GLYPH = /^[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]$/u;

/** Every app TypeScript file under `dir`, as a repository path: tests, declarations and `NOT_PRINTED` aside. */
export function appSourceFiles(dir = 'src') {
    const out = [];
    for (const name of readdirSync(join(ROOT, dir)).sort()) {
        const path = `${dir}/${name}`;
        if (statSync(join(ROOT, path)).isDirectory()) {
            out.push(...appSourceFiles(path));
        } else if (name.endsWith('.ts') && !name.endsWith('.test.ts') && !name.endsWith('.d.ts') && !NOT_PRINTED.includes(path)) {
            out.push(path);
        }
    }
    return out;
}

/** The text of every string and template literal in one TypeScript source (cooked, so `→` is `→`). */
export function literalsOf(source, fileName = 'source.ts') {
    const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.ES2022, true);
    const out = [];
    const visit = (node) => {
        if (
            ts.isStringLiteral(node) ||
            ts.isNoSubstitutionTemplateLiteral(node) ||
            ts.isTemplateHead(node) ||
            ts.isTemplateMiddle(node) ||
            ts.isTemplateTail(node)
        ) {
            out.push(node.text);
        }
        ts.forEachChild(node, visit);
    };
    visit(file);
    return out;
}

/** Every string a sheet's `content` declarations hold, escapes decoded. */
export function contentStringsOf(css) {
    const out = [];
    for (const m of blankComments(css).matchAll(/(?<![\w-])content\s*:([^;}]*)/gi)) {
        for (const s of m[1].matchAll(/(["'])((?:\\[\s\S]|(?!\1)[^\\])*)\1/g)) out.push(decodeEscapes(s[2]));
    }
    return out;
}

/**
 * Every code point the app prints, each with where it was found: a source
 * path, a sheet path, `GENERATED_TEXT`, or `printable ASCII`. Characters
 * that draw no glyph (`NO_GLYPH`) are left out. `sheets` is the served list
 * as `scripts/served-sheets.mjs` reads it (`{ path, role, css }`), so a
 * private look's sheet is read like the rest.
 */
export function printedCodePoints(sheets) {
    const out = new Map();
    const add = (text, where) => {
        for (const ch of text) {
            if (NO_GLYPH.test(ch)) continue;
            const cp = ch.codePointAt(0);
            if (!out.has(cp)) out.set(cp, new Set());
            out.get(cp).add(where);
        }
    };
    for (const path of appSourceFiles()) {
        for (const text of literalsOf(readFileSync(join(ROOT, path), 'utf8'), path)) add(text, path);
    }
    for (const sheet of sheets.filter((s) => PRINTING_ROLES.includes(s.role))) {
        for (const text of contentStringsOf(sheet.css)) add(text, sheet.path);
    }
    for (const text of GENERATED_TEXT) add(text, 'GENERATED_TEXT');
    for (let cp = 0x20; cp <= 0x7e; cp += 1) add(String.fromCodePoint(cp), 'printable ASCII');
    return out;
}

/** A face as the checks name it: its family, and its style when not normal. */
export const faceSetName = (face) => (face.style.trim() === 'normal' ? face.family : `${face.family} ${face.style.trim()}`);

/**
 * Every face `stall.css` declares, with its file and the code points the file
 * holds, grouped by family and style (`Inter`, `Stall Serif`, `Stall Serif
 * italic`, `JetBrains Mono`): `{ name, faces: [{ file, ranges, held }] }`.
 */
export function servedFaceSets() {
    const sets = new Map();
    for (const face of declaredStallFaces()) {
        const file = relative(ROOT, fileURLToPath(new URL(face.src, STALL_CSS)));
        const ranges = rangePairs(face.unicodeRange);
        if (ranges === undefined) throw new Error(`${file}: an unreadable unicode-range`);
        const name = faceSetName(face);
        if (!sets.has(name)) sets.set(name, { name, faces: [] });
        sets.get(name).faces.push({ file, ranges, held: woff2CodePoints(readFileSync(join(ROOT, file))) });
    }
    return [...sets.values()];
}

const inRanges = (ranges, cp) => ranges.some(([lo, hi]) => cp >= lo && cp <= hi);

/** True when a face set draws `cp` itself: a face whose range covers it holds a glyph for it. */
export function drawsItself(set, cp) {
    return set.faces.some((face) => inRanges(face.ranges, cp) && face.held.has(cp));
}

/**
 * Every printed code point some face set does not draw itself, as
 * `Map<cp, string[]>` of the sets that do not — each such glyph is drawn by
 * a font of the reader's machine wherever that set is the face.
 */
export function glyphsNotHeld(printed, sets = servedFaceSets()) {
    const out = new Map();
    for (const cp of [...printed.keys()].sort((a, b) => a - b)) {
        const missing = sets.filter((set) => !drawsItself(set, cp)).map((set) => set.name);
        if (missing.length > 0) out.set(cp, missing);
    }
    return out;
}

/**
 * The single code points a face's `unicode-range` names on its own (never a
 * span) that its file holds no glyph for, as `{ file, cp }`: a range wider
 * than the file — Fontsource's family ranges, not the subset's own. A
 * character that draws no glyph (`NO_GLYPH`: U+FEFF) is not counted.
 */
export function declaredNotHeld(sets = servedFaceSets()) {
    const out = [];
    for (const set of sets) {
        for (const face of set.faces) {
            for (const [lo, hi] of face.ranges) {
                if (lo === hi && !face.held.has(lo) && !NO_GLYPH.test(String.fromCodePoint(lo))) out.push({ file: face.file, cp: lo });
            }
        }
    }
    return out;
}

/** `U+2248 ≈`, for a message. */
export const cpName = (cp) => `U+${cp.toString(16).toUpperCase().padStart(4, '0')} ${String.fromCodePoint(cp)}`;
