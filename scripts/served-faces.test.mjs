import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { themeVarValues } from './look-flash.mjs';
import { declaredFaces, declaredStallFaces } from './probe-faces.mjs';
import { PLANTED_CLASS, beforeReduce, canaryFiles, plantCanary, plantLooks, removePlants, syntheticWoff2 } from './private-looks-plant.mjs';
import { CANARY_TREE } from './private-looks.mjs';
import { PINNED_RANGELESS_FACES, PINNED_STACKS, ownFaceSet, privateFacesLine, rangeProblems, rootStackOf, scriptReport, servedFamilies, sheetParts, stackMatchesPin, stackReport } from './private-faces.mjs';
import { guardSheets, privateRows, servedSheets } from './served-sheets.mjs';
import {
    ROOT,
    appSourceFiles,
    contentStringsOf,
    cpName,
    declaredNotHeld,
    descriptorProblems,
    drawsItself,
    glyphsNotHeld,
    lettersOfAnotherScript,
    MAX_RANGE_CODE_POINTS,
    literalsOf,
    printedCodePoints,
    scriptOfSubset,
    servedFaceSets,
    subsetScript,
} from './served-faces.mjs';
import { SERVED_FAMILIES, familyListProblem, sheetFontProblems } from './workshop-css.mjs';

/**
 * The faces Stall serves, held to what the app names and prints (the
 * probe-fonts critic's P2-1, 2026-10-06; `scripts/served-faces.mjs` says
 * why). The probe proves every declared face was LOADED before it measured;
 * these prove the app never names a face that is not served, and say which
 * glyphs it prints that no served face draws — each one drawn by a font of
 * the reader's machine, so differently on every OS, and measured by the
 * probe as this machine's.
 *
 * `node --test`, like the other face checks: the WOFF2 reader is
 * `scripts/look-faces.mjs`'s, and `src/domain/theme.ts` is read through
 * Node's own type stripping (it imports nothing — `themeVarValues`).
 */

const theme = await import('../src/domain/theme.ts');
const SERVED = await guardSheets();
const read = (path) => readFileSync(join(ROOT, path), 'utf8');

describe('every-font-family-opens-with-a-served-face', () => {
    it('serves exactly the families stall.css declares, and no other public sheet declares a face', () => {
        const declared = [...new Set(declaredStallFaces().map((face) => face.family))].sort();
        assert.deepEqual([...SERVED_FAMILIES].sort(), declared);
        // A private look may declare its own, namespaced face (the look lint's `fontFaceProblems`).
        for (const sheet of SERVED.filter((s) => s.role !== 'private' && s.path !== 'src/ui/stall.css')) {
            assert.deepEqual(declaredFaces(sheet.css), [], `${sheet.path} declares an @font-face`);
        }
    });

    it('opens every stack the theme table offers with a served face', () => {
        assert.equal(theme.FONT_STACKS.length, 3);
        for (const stack of theme.FONT_STACKS) {
            assert.equal(familyListProblem(stack), undefined, stack);
        }
    });

    it('opens every --s-font value the theme table emits, on every shipped look, with a served face', async () => {
        const vars = Object.entries(await themeVarValues()).filter(([name]) => name.startsWith('--s-font'));
        assert.ok(vars.length > 0, 'the table emits a --s-font');
        for (const [name, values] of vars) {
            for (const value of values) assert.equal(familyListProblem(value), undefined, `${name}: ${value}`);
        }
    });

    it('opens every font declaration of every sheet the app paints with a served face, inherit or var(--s-font)', () => {
        // The documents (`/stream`, `/guide`, `/404`) load no app face by
        // design (CLAUDE §6) and the harness's showroom chrome is not the app.
        const painted = SERVED.filter((s) => !['document', 'harness'].includes(s.role));
        assert.ok(painted.some((s) => s.role === 'private'), 'a private look sheet is read');
        for (const sheet of painted) {
            assert.deepEqual(sheetFontProblems(sheet.css, { worn: sheet.load === 'worn' }), [], sheet.path);
        }
        assert.ok(privateRows(SERVED).length > 0);
    });

    it('goes red on a face renamed on one side, a misspelt stack, and a system face', () => {
        // stall.css renaming its face: the served list no longer matches it.
        const stall = SERVED.find((s) => s.path === 'src/ui/stall.css').css;
        const renamed = stall.replaceAll("font-family: 'Stall Serif';", "font-family: 'Lora';");
        assert.notDeepEqual(
            [...new Set(declaredFaces(renamed).map((face) => face.family))].sort(),
            [...SERVED_FAMILIES].sort(),
        );
        // A stack renaming it: the critic's "Intr", Lora, and a system face.
        for (const stack of ['"Intr", ui-sans-serif, system-ui, sans-serif', '"Lora", Georgia, serif', 'Georgia, serif', 'serif']) {
            assert.match(familyListProblem(stack) ?? '', /a family no served sheet declares/, stack);
        }
        assert.match(sheetFontProblems('.x { font-family: "Stal Serif"; }').join('\n'), /opens with "Stal Serif"/);
    });
});

/** Every face set stall.css declares, as the exceptions name them. */
const EVERY_FACE = ['Inter', 'Stall Serif', 'Stall Serif italic', 'JetBrains Mono'];
const quoteIn = (code) =>
    `the seller's own figure (\`seller-price\`, a money node) on every quote surface, for a quote in ${code} (\`FIAT_CURRENCIES\`' symbol, through \`QUOTE_UNITS\`)`;

/**
 * The code points `scripts/subset-faces.py` cuts into every Latin face whose
 * upstream font draws them (its `WANTED`), read strictly: exactly one line
 * assigns it, and that line is `WANTED = [0x…, 0x…]` — hex literals and
 * commas and nothing else, so a reformatted list or a comment holding a hex
 * number cannot widen or narrow what this test reads; and no other line
 * changes the list. Anything else throws at module load, which fails the
 * file (a throw in a `describe` body would not).
 */
function readWanted(python) {
    const lines = python.split('\n');
    const assigns = lines.filter((line) => /^WANTED\b/.test(line));
    if (assigns.length !== 1) throw new Error(`scripts/subset-faces.py: ${assigns.length} lines start with WANTED; the test reads exactly one`);
    const m = /^WANTED = \[(0x[0-9A-F]{4,6}(?:, 0x[0-9A-F]{4,6})*)\]$/.exec(assigns[0]);
    if (m === null) throw new Error(`scripts/subset-faces.py: WANTED must be one line of upper-case hex literals and commas, "WANTED = [0x2248, …]"; read: ${assigns[0]}`);
    const changed = lines.filter((line) => line !== assigns[0] && /\bWANTED\s*(?:[-+*|&]?=(?!=)|\.\w+\s*\(|\[)/.test(line));
    if (changed.length > 0) throw new Error(`scripts/subset-faces.py: a line changes WANTED after it is assigned: ${changed[0].trim()}`);
    return m[1].split(', ').map((hex) => Number.parseInt(hex, 16));
}
const RE_SUBSET = readWanted(read('scripts/subset-faces.py'));

/**
 * **What the app prints that a served face does not draw** — pinned, each
 * with where it prints and the face sets that lack it (`faces`). Wherever
 * one of those is the face, the glyph is drawn by a font of the reader's
 * machine, so it differs per OS, and the probe measures this machine's.
 * The owner decided the faces draw what a page prints (2026-10-06, PLAN §
 * Decided "Glyphs a page prints are drawn by Stall's own faces"), and
 * `scripts/subset-faces.py` cut every Latin subset again from its upstream
 * font with each of these that font draws — `≈` and RUB's `₽` are drawn by
 * all four. What Lora and JetBrains Mono do not draw (`→ ◆ ₹ ₪ ₩ ₦ ₱`, and
 * `₺` in JetBrains Mono) stall.css draws from Inter's Latin file in those
 * families' names, one segment each (`a-segment-names-exactly-what-its-familys-own-files-lack`),
 * so no face set lacks them. What is left is no
 * face's: a CJK ideograph (`元`; a CJK face is not shipped for one sign). A
 * glyph leaves this list, or a face leaves its `faces`, only when a face
 * gains it; a glyph joins it only with a line saying where it prints.
 */
const PRINTED_NOT_HELD = [{ cp: 0x5143, in: ['src/domain/fiat.ts'], faces: EVERY_FACE, where: quoteIn('CNY') }];

/**
 * **Code points a face's `unicode-range` names on its own that its file
 * holds no glyph for** — Fontsource's family ranges, wider than the
 * subsets. None is printed by the app today (held below); a range that
 * claims a glyph the file lacks makes the browser load the face for it and
 * then draw it from the machine's fonts.
 */
const DECLARED_NOT_HELD = [
    'src/ui/fonts/inter-latin.woff2 U+0329',
    'src/ui/fonts/inter-latin.woff2 U+2215',
    'src/ui/fonts/inter-latin.woff2 U+FFFD',
    'src/ui/fonts/inter-vietnamese.woff2 U+0329',
    'src/ui/fonts/jetbrains-mono-latin.woff2 U+0329',
    'src/ui/fonts/jetbrains-mono-latin.woff2 U+FFFD',
    'src/ui/fonts/jetbrains-mono-vietnamese.woff2 U+0329',
    'src/ui/fonts/stall-serif-latin-italic.woff2 U+0329',
    'src/ui/fonts/stall-serif-latin-italic.woff2 U+2191',
    'src/ui/fonts/stall-serif-latin-italic.woff2 U+2193',
    'src/ui/fonts/stall-serif-latin-italic.woff2 U+FFFD',
    'src/ui/fonts/stall-serif-latin.woff2 U+0329',
    'src/ui/fonts/stall-serif-latin.woff2 U+2191',
    'src/ui/fonts/stall-serif-latin.woff2 U+2193',
    'src/ui/fonts/stall-serif-latin.woff2 U+FFFD',
    'src/ui/fonts/stall-serif-vietnamese-italic.woff2 U+0329',
    'src/ui/fonts/stall-serif-vietnamese-italic.woff2 U+20AB',
    'src/ui/fonts/stall-serif-vietnamese.woff2 U+0329',
    'src/ui/fonts/stall-serif-vietnamese.woff2 U+20AB',
];

describe('every-glyph-the-app-prints-is-in-its-face', () => {
    let printed;
    let sets;
    before(() => {
        printed = printedCodePoints(SERVED);
        sets = servedFaceSets();
    });

    it('reads the four face sets stall.css declares, from their own files', () => {
        assert.deepEqual(sets.map((set) => set.name), EVERY_FACE);
        for (const set of sets) {
            // A Latin subset and a Vietnamese one each, and for the two
            // families whose fonts lack glyphs the app prints, one segment
            // of Inter's Latin file (`a-segment-names-exactly-what-its-familys-own-files-lack`).
            assert.equal(set.faces.length, set.name === 'Inter' ? 2 : 3, set.name);
            for (const face of set.faces) assert.ok(face.held.size > 100, `${face.file} holds ${face.held.size} code points`);
        }
    });

    it('reads what the app prints from its own source: the copy, every currency symbol, the sheets\' generated text', () => {
        assert.ok(appSourceFiles().includes('src/ui/copy.ts'));
        assert.ok(!appSourceFiles().includes('src/domain/withheld-data.ts'));
        const fiat = read('src/domain/fiat.ts');
        const symbols = [...fiat.matchAll(/symbol: '([^']+)'/g)].map((m) => m[1]);
        assert.ok(symbols.length >= 28, 'FIAT_CURRENCIES is read');
        for (const symbol of symbols) {
            for (const ch of symbol) {
                const where = printed.get(ch.codePointAt(0));
                assert.ok(where?.has('src/domain/fiat.ts') || ch.codePointAt(0) < 0x80, `${cpName(ch.codePointAt(0))} of "${symbol}"`);
            }
        }
        assert.ok(printed.get(0x2248)?.has('src/ui/copy.ts'), 'the rate line');
        assert.ok(printed.get(0x25c6)?.has('src/ui/broadcast.css'), "the ticker's separator");
        for (let cp = 0x20; cp <= 0x7e; cp += 1) assert.ok(printed.has(cp));
        // The describe picker's directional isolates draw no glyph and are not read.
        assert.ok(!printed.has(0x2066) && !printed.has(0x2069));
        assert.deepEqual(literalsOf('const a = `x→${1}≈y`; const b = "\\u25c6";'), ['x→', '≈y', '◆']);
        assert.deepEqual(contentStringsOf(".a::after { content: '\\25c6'; } .b { justify-content: center; }"), ['◆']);
    });

    it('draws every glyph the app prints in its own faces, but the pinned exceptions', () => {
        const missing = glyphsNotHeld(printed, sets);
        const pinned = new Map(PRINTED_NOT_HELD.map((e) => [e.cp, e]));
        const unexplained = [...missing.keys()].filter((cp) => !pinned.has(cp));
        assert.deepEqual(
            unexplained.map((cp) => `${cpName(cp)} (${missing.get(cp).join(', ')}) from ${[...printed.get(cp)].join(', ')}`),
            [],
            'printed in no served face — re-subset the face, or pin it here with where it prints (the owner\'s call)',
        );
        for (const exception of PRINTED_NOT_HELD) {
            const name = cpName(exception.cp);
            assert.ok(exception.where.length > 0, `${name} says where it prints`);
            for (const where of exception.in) {
                assert.ok(printed.get(exception.cp)?.has(where), `${name} is no longer printed from ${where} — say where it prints now, or take it off`);
            }
            assert.deepEqual(missing.get(exception.cp) ?? [], exception.faces, `${name}: the faces that lack it moved — a face holds it now, or lost it`);
        }
    });

    it('a-segment-names-exactly-what-its-familys-own-files-lack', () => {
        // The segment is a rule in the family's name over Inter's Latin file.
        // Its range is derived here and not copied: the code points
        // `subset-faces.py` cuts in (`WANTED`) that Inter draws and the
        // family's own files do not. A range wider than that claims a glyph
        // the family draws itself (the segment, declared later, would take
        // it from the family); a range narrower leaves a glyph to the
        // machine's fonts; and the family's own ranges may not name one of
        // them (where two ranges name a code point, which rule draws it
        // would rest on the order of the sheet).
        const interFile = 'src/ui/fonts/inter-latin.woff2';
        const isInter = (face) => face.file.startsWith('src/ui/fonts/inter-');
        const inter = sets.find((set) => set.name === 'Inter');
        for (const set of sets.filter((s) => s.name !== 'Inter')) {
            const segments = set.faces.filter(isInter);
            const own = { name: set.name, faces: set.faces.filter((face) => !isInter(face)) };
            assert.deepEqual(segments.map((face) => face.file), [interFile], `${set.name}: one segment, of Inter's Latin file`);
            const claimed = segments[0].ranges.flatMap(([lo, hi]) => {
                assert.ok(hi - lo < 16, `${set.name}: a segment range ${cpName(lo)}–${cpName(hi)} that wide is not a sign`);
                return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
            });
            const expected = RE_SUBSET.filter((cp) => !drawsItself(own, cp) && drawsItself(inter, cp)).sort((a, b) => a - b);
            assert.deepEqual(claimed.map(cpName), expected.map(cpName), set.name);
            for (const cp of claimed) {
                assert.ok(!own.faces.some((face) => face.ranges.some(([lo, hi]) => cp >= lo && cp <= hi)), `${set.name}: its own files' ranges also name ${cpName(cp)}`);
            }
        }
    });

    it('pins the code points a range declares and its file lacks, and the app prints none of them', () => {
        const found = declaredNotHeld(sets).map(({ file, cp }) => `${file} ${cpName(cp).split(' ')[0]}`).sort();
        assert.deepEqual(found, [...DECLARED_NOT_HELD].sort());
        for (const line of DECLARED_NOT_HELD) {
            const cp = Number.parseInt(line.split('U+')[1], 16);
            assert.ok(!printed.has(cp), `${line}: the app prints it now`);
        }
    });

    it("names in a face's range only the re-subset glyphs its own file holds", () => {
        // `declaredNotHeld` counts only a code point a range names on its
        // own, and `rangePairs` merges neighbours (U+20B9, U+20BA is one
        // span), so the glyphs scripts/subset-faces.py cuts in (its `WANTED`)
        // are held here one by one, on every face: a range naming one its file
        // lacks would load the face for it and draw it from the machine's fonts.
        assert.ok(RE_SUBSET.includes(0x2248) && RE_SUBSET.length >= 11, 'WANTED is read from scripts/subset-faces.py');
        // RUB prints ₽, which every face draws; `р` (U+0440) is a Cyrillic letter and no Latin face takes it.
        assert.ok(RE_SUBSET.includes(0x20bd) && !RE_SUBSET.includes(0x0440));
        for (const exception of PRINTED_NOT_HELD) assert.ok(RE_SUBSET.includes(exception.cp), cpName(exception.cp));
        const claimed = [];
        for (const set of sets) {
            for (const face of set.faces) {
                for (const cp of RE_SUBSET) {
                    if (face.ranges.some(([lo, hi]) => cp >= lo && cp <= hi) && !face.held.has(cp)) claimed.push(`${face.file} ${cpName(cp)}`);
                }
            }
        }
        assert.deepEqual(claimed, []);
    });

    it('reads WANTED strictly, and refuses a list it could misread', () => {
        const real = read('scripts/subset-faces.py');
        assert.deepEqual(readWanted(real), RE_SUBSET);
        const line = real.split('\n').find((l) => l.startsWith('WANTED = ['));
        // A reformatted list whose comment holds a hex number: the old read took 0x0440 from the comment.
        const multi = real.replace(line, 'WANTED = [\n    0x2248,  # not 0x0440\n]');
        assert.throws(() => readWanted(multi), /one line of upper-case hex literals/);
        assert.throws(() => readWanted(real.replace(line, `${line}  # and 0x0440`)), /one line of upper-case hex literals/);
        assert.throws(() => readWanted(real.replace(line, line.replace('0x2248', '0x2248 + 1'))), /one line of upper-case hex literals/);
        assert.throws(() => readWanted(real.replace(line, `${line}\nWANTED = WANTED + [0x0440]`)), /2 lines start with WANTED/);
        assert.throws(() => readWanted(real.replace(line, `${line}\n    WANTED.append(0x0440)`)), /changes WANTED/);
        assert.throws(() => readWanted(real.replace(line, `${line}\nif True:\n    WANTED += [0x0440]`)), /changes WANTED/);
        assert.throws(() => readWanted(real.replace(line, '')), /0 lines start with WANTED/);
    });

    it('goes red on a glyph printed in no face', () => {
        const planted = new Map(printed);
        planted.set(0x2605, new Set(['planted']));
        assert.deepEqual(glyphsNotHeld(planted, sets).get(0x2605), EVERY_FACE);
    });
});

describe('a-face-range-never-takes-one-letter-of-another-script', () => {
    // The glyph re-subset first put `р` (U+0440, for RUB's "р.") in every
    // Latin range, so a seller's Cyrillic word drew its `р` in the shipped
    // face and every other letter in the machine's (the critic's P2-1,
    // 2026-10-09). RUB prints ₽ now; this holds every range to letters whose
    // Script_Extensions hold its subset's script, or are Common or Inherited
    // (the re-review's P3-7: `Script` alone passed `ー`, Common by script and
    // Japanese by use). Everything is computed inside an `it`: a describe
    // body only registers.
    it("names in every face's unicode-range only letters of its subset's script, Common or Inherited", () => {
        const sets = servedFaceSets();
        const faces = sets.flatMap((set) => set.faces);
        // Eight subsets, and the segment of Inter's file in each of the other three families' names.
        assert.equal(faces.length, 11);
        // A face with no range is refused by name, before anything walks it (P3-8).
        assert.deepEqual(
            faces.filter((face) => face.declared.trim() === '').map((face) => face.file),
            [],
            'a served face declares no unicode-range: it would be asked for every character, every script included',
        );
        for (const face of faces) assert.equal(subsetScript(face.file), 'Latin', face.file);
        const { count, letters, unbounded } = lettersOfAnotherScript(sets);
        assert.deepEqual(unbounded, [], `a range wider than ${MAX_RANGE_CODE_POINTS} code points is not walked`);
        assert.equal(
            letters.length,
            0,
            `${letters.length} letters of another script; the first 20: ${letters.slice(0, 20).map(({ file, cp }) => `${file} ${cpName(cp)}`).join('; ')}`,
        );
        assert.ok(count > 8 * 100, `${count} code points read`);
    });

    it('allows a Common letter and a Latin one, and refuses a letter another script owns, by script or by use', () => {
        // µ (U+00B5) has scx Common and ª (U+00AA) Latin; both sit in U+0000-00FF.
        const inter = servedFaceSets().find((set) => set.name === 'Inter').faces.find((face) => face.file.endsWith('inter-latin.woff2'));
        assert.ok(inter.ranges.some(([lo, hi]) => lo <= 0xb5 && 0xb5 <= hi && lo <= 0xaa && 0xaa <= hi));
        const plant = (cps) => [{ name: 'Inter', faces: [{ file: inter.file, ranges: [...inter.ranges, ...cps.map((cp) => [cp, cp])] }] }];
        // ₽ is a sign; ʼ (U+02BC) is Script=Common with scx holding Latin.
        assert.deepEqual(lettersOfAnotherScript(plant([0x20bd, 0x02bc])).letters, []);
        // р Cyrillic, μ Greek, 元 Han by script; ー (U+30FC) and ｰ (U+FF70)
        // Hiragana and Katakana, and ـ (U+0640) Arabic, by Script_Extensions
        // alone — each is Script=Common, which `Script` would have passed.
        const refused = [0x0440, 0x03bc, 0x5143, 0x30fc, 0xff70, 0x0640];
        assert.deepEqual(lettersOfAnotherScript(plant(refused)).letters.map(({ cp }) => cp), refused);
    });

    it('refuses a face with no range by name and without walking it', () => {
        const planted = [{ name: 'JetBrains Mono', faces: [{ file: 'src/ui/fonts/jetbrains-mono-latin.woff2', ranges: [[0, 0x10ffff]] }] }];
        const { count, letters, unbounded } = lettersOfAnotherScript(planted);
        assert.deepEqual(unbounded, [{ file: 'src/ui/fonts/jetbrains-mono-latin.woff2', size: 0x110000 }]);
        assert.equal(count, 0);
        assert.equal(letters.length, 0);
    });

    it('knows the script of every subset it is handed, or refuses it', () => {
        assert.equal(subsetScript('src/ui/fonts/stall-serif-vietnamese-italic.woff2'), 'Latin');
        assert.equal(subsetScript('src/ui/fonts/jetbrains-mono-latin.woff2'), 'Latin');
        assert.throws(() => subsetScript('src/ui/fonts/inter-cyrillic.woff2'), /SUBSET_SCRIPTS does not name/);
        assert.throws(() => subsetScript('src/ui/fonts/inter-constructor.woff2'), /SUBSET_SCRIPTS does not name/);
    });
});

// ---------------------------------------------------------------------------
// A private look's own faces (`scripts/private-faces.mjs`, the 8g-pre row of
// the step-8 plan, "by recommendation"): the shipped faces' range and
// stack checks, applied to every private look a run reads — the tracked
// fixture always, the selection when one is named — and proved red over
// repositories planted outside this checkout (`scripts/private-looks-plant.mjs`)
// holding a synthetic face with a `cmap`. Everything computed is computed in
// a `before()` hook, an `it` or at module top: a describe body only registers.
// ---------------------------------------------------------------------------

after(removePlants);

/** The pinned list as the stack guard reads it: code point to the entry naming the face sets that lack it. */
const PINNED = new Map(PRINTED_NOT_HELD.map((entry) => [entry.cp, entry]));
const PRIVATE_ROWS = privateRows(SERVED);

const ASCII = Array.from({ length: 0x7f - 0x20 }, (_, i) => 0x20 + i);
const PLANT_FACE = 'plant-serif-latin.woff2';
const PLANT_FAMILY = `${PLANTED_CLASS}-serif`;
/** A synthetic face holding `codePoints`; its name table is a plant's own. */
const faceBytes = (codePoints) => syntheticWoff2([{ id: 1, text: 'Plant Serif' }, { id: 0, text: 'Copyright 2024 The Plant Type Authors' }], { codePoints });
/** An `@font-face` for `file` in `family`, with the extra descriptors given. */
const faceRule = (file, family, extra = '') => `@font-face { font-family: ${family}; src: url(./art/${file}) format("woff2"); font-display: swap;${extra} }`;
const withRange = (range) => (range === undefined ? '' : ` unicode-range: ${range};`);
/** A packed tree no look has, for a read that is not a look of a repository. */
const TREE = 'a'.repeat(40);
/** A look's `fonts.json` naming one family's faces, `files` as `{ "<face>.woff2": "<subset>" }`. */
const fontsJson = (files, name = 'Plant Serif') => JSON.stringify({ fonts: [{ name, files, licence: 'LICENSE-OFL-plant.txt' }] });

/** A planted private look (the fixture, renamed, with `rules` before its reduce block and `art` beside its own), read through the merged list. */
async function plantedRow(rules, art) {
    const repo = plantLooks((path, text) => (path === 'fixture/sheet.css' ? beforeReduce(text, rules) : text), art);
    const rows = privateRows(await servedSheets({ env: repo.selection, fixture: true, gitEnv: repo.env }));
    const row = rows.find((r) => r.lookClass === PLANTED_CLASS);
    assert.ok(row !== undefined && rows.some((r) => r.look.source === 'fixture'), 'the planted look and the fixture are both read');
    return row;
}

let canaryRead;
/** The canary from public bytes (`plantCanary`: a JetBrains Mono face on its tagline), read once through the merged list. */
function canaryRow() {
    canaryRead ??= (async () => {
        const repo = plantCanary();
        const rows = privateRows(await servedSheets({ env: repo.selection, fixture: true, gitEnv: repo.env }));
        const row = rows.find((r) => r.lookClass === 't-canary');
        assert.ok(row !== undefined, 'the canary is read');
        return row;
    })();
    return canaryRead;
}

const mem = (codePoints, name = 'mem.woff2') => ({ name, bytes: faceBytes(codePoints) });
/** A face standing in for the canary's own (`t-canary-mono`): ASCII and nothing else, no served face after it. */
const CANARY_FACE = faceRule('mem.woff2', 't-canary-mono');
const CANARY_ART = [mem(ASCII)];

/** The `content` declarations of a sheet that print text: every one but `none`, `normal` and an empty string. */
const printingContent = (css) =>
    sheetParts(css).rules.flatMap((rule) =>
        rule.decls.filter((decl) => decl.prop === 'content' && !/^(?:none|normal|''|"")$/i.test(decl.value.trim())).map((decl) => `${rule.selectors?.join(', ') ?? 'a keyframe stop'} { content: ${decl.value} }`),
    );

describe('a-private-face-claims-only-what-its-file-draws', () => {
    let reads;
    before(() => {
        reads = PRIVATE_ROWS.map((row) => {
            const read = ownFaceSet({ css: row.css, art: row.look.art });
            return { cls: row.lookClass, source: row.look.source, read, count: read.faces.length };
        });
        process.stderr.write(privateFacesLine('private face range guard (a-private-face-claims-only-what-its-file-draws)', reads, 'face'));
    });

    it('reads every @font-face of every private look a run reads, the tracked fixture among them, and none claims a code point its file lacks', () => {
        assert.ok(reads.some((r) => r.source === 'fixture'), 'the fixture is read');
        for (const r of reads) assert.deepEqual(rangeProblems(r.read), [], r.cls);
    });

    it('passes the canary from public bytes, whose face states no range at all', async () => {
        const row = await canaryRow();
        const read = ownFaceSet({ css: row.css, art: row.look.art });
        assert.equal(read.faces.length, 1);
        assert.equal(read.faces[0].family, 't-canary-mono');
        assert.equal(read.faces[0].declared, '');
        assert.ok(read.faces[0].held.size > 100);
        assert.deepEqual(rangeProblems(read), []);
    });

    it('goes red on a planted look whose range names ≈ on its own where its file has no glyph for it, and passes the same look without that token', async () => {
        const art = { [`fixture/art/${PLANT_FACE}`]: faceBytes(ASCII) };
        const red = await plantedRow(faceRule(PLANT_FACE, PLANT_FAMILY, withRange('U+20-7E, U+2248')), art);
        const problems = rangeProblems(ownFaceSet({ css: red.css, art: red.look.art }));
        assert.equal(problems.length, 1, problems.join('\n'));
        assert.match(problems[0], /art\/plant-serif-latin\.woff2: unicode-range names U\+2248 ≈ on its own and the file holds no glyph for it/);
        // It says what happens and what to do, not that the character falls to the machine (a served face follows, guard 2 holds that).
        assert.match(problems[0], /the browser fetches this face for it and goes on to the next family: remove the token, or cut the glyph in/);
        assert.doesNotMatch(problems[0], /machine/);
        const green = await plantedRow(faceRule(PLANT_FACE, PLANT_FAMILY, withRange('U+20-7E')), art);
        const read = ownFaceSet({ css: green.css, art: green.look.art });
        assert.equal(read.faces.length, 1);
        assert.deepEqual(rangeProblems(read), []);
    });

    it('reads each token of the range, so two neighbouring single code points are two claims, and counts a span or a wildcard for none', () => {
        const art = [mem(ASCII)];
        const css = (range) => faceRule('mem.woff2', 't-mem-serif', withRange(range));
        const claimed = rangeProblems(ownFaceSet({ css: css('U+20-7E, U+2248, U+2249'), art })).join('\n');
        assert.match(claimed, /U\+2248 ≈, U\+2249 ≉ on their own/);
        // The shipped check merges neighbours, so it cannot see this pair as singles.
        for (const range of ['U+0-FF', 'U+2??', 'U+20-7E', 'U+41', '']) assert.deepEqual(rangeProblems(ownFaceSet({ css: css(range), art })), [], range);
        assert.match(rangeProblems(ownFaceSet({ css: css('U+20-7E, U+FEFF, U+263A'), art })).join('\n'), /U\+263A ☺ on its own/);
        assert.doesNotMatch(rangeProblems(ownFaceSet({ css: css('U+FEFF, U+263A'), art })).join('\n'), /FEFF/, 'a character that draws no glyph is not a claim');
    });

    it('reads an @font-face inside an at-rule as one at the top of the sheet', () => {
        const nested = `@media (min-width: 680px) { ${faceRule('mem.woff2', 't-mem-serif', withRange('U+20-7E, U+2248'))} }`;
        const read = ownFaceSet({ css: nested, art: [mem(ASCII)] });
        assert.deepEqual(read.faces.map((face) => face.family), ['t-mem-serif']);
        assert.match(rangeProblems(read).join('\n'), /U\+2248 ≈ on its own/);
    });

    it('refuses what it cannot read: a face the art lacks, a file that is no WOFF2 or holds no cmap, a src outside art/, a range it cannot parse', () => {
        const rule = (src, range = '') => `@font-face { font-family: t-mem-serif; src: url(${src}); font-display: swap;${range} }`;
        const cases = [
            [rule('./art/gone.woff2'), [mem(ASCII)], /art\/gone\.woff2 is not there/],
            [rule('./art/mem.woff2'), [{ name: 'mem.woff2', bytes: Buffer.from('not a font at all, just some bytes ...........................') }], /its cmap cannot be read/],
            [rule('./art/mem.woff2'), [{ name: 'mem.woff2', bytes: syntheticWoff2([{ id: 1, text: 'No cmap' }]) }], /its cmap cannot be read \(no cmap table\)/],
            [rule('https://example.test/mem.woff2'), [mem(ASCII)], /is not a file in the look's art\//],
            [rule('./art/mem.woff2', ' unicode-range: U+zz;'), [mem(ASCII)], /unicode-range token "U\+zz" is not one this reader parses/],
        ];
        for (const [css, art, pattern] of cases) {
            const problems = rangeProblems(ownFaceSet({ css, art }));
            assert.ok(problems.some((p) => pattern.test(p)), `${pattern}:\n  ${problems.join('\n  ') || '(no problem)'}`);
        }
    });
});

describe('a-private-face-range-is-refused-as-published-or-malformed', () => {
    // The critic's P3-3: guard 1 is strict, and says so. Everything computed is computed in an `it`.
    it('refuses the project\'s own faces declared with their own published ranges, as a private look would copy them', () => {
        // A segment (a rule over Inter's file in another family's name, stall.css) states a range Stall trimmed itself, not a published one.
        const isSegment = (set, face) => set.name !== 'Inter' && face.file.startsWith('src/ui/fonts/inter-');
        const sets = servedFaceSets();
        const fonts = sets.flatMap((set) => set.faces.filter((face) => !isSegment(set, face)));
        assert.equal(fonts.length, 8);
        const copied = (face) => {
            const name = face.file.replace(/^.*\//, '');
            return rangeProblems(ownFaceSet({ css: faceRule(name, 't-mem-copy', withRange(face.declared)), art: [{ name, bytes: readFileSync(join(ROOT, face.file)) }] }));
        };
        const refused = new Map(fonts.map((face) => [face.file.replace(/^.*\//, ''), copied(face).join('\n')]));
        // U+0329 is named by all eight and held by none: a range published with a family is refused as published.
        for (const [name, text] of refused) assert.match(text, /U\+0329/, name);
        assert.match(refused.get('inter-latin.woff2'), /U\+2215/);
        assert.match(refused.get('stall-serif-vietnamese.woff2'), /U\+20AB ₫/);
        // The segments, copied the same way, pass: their singles are each a sign Inter's file holds, the range a private look should state.
        const segments = sets.flatMap((set) => set.faces.filter((face) => isSegment(set, face)));
        assert.ok(segments.length > 0, 'stall.css declares a segment');
        for (const face of segments) assert.deepEqual(copied(face), [], face.declared);
    });

    it('refuses a token a browser would drop the whole descriptor for, with a sentence and never an exception', () => {
        const art = [mem(ASCII)];
        const css = (range) => faceRule('mem.woff2', 't-mem-serif', withRange(range));
        for (const [range, pattern] of [
            ['U+110000', /token "U\+110000" names a code point past U\+10FFFF/],
            ['U+20-110000', /names a code point past U\+10FFFF/],
            ['U+7E-20', /token "U\+7E-20" ends before it starts/],
            ['U+20, 41', /token "41" is not one this reader parses/],
            ['U+1234567', /token "U\+1234567" is not one this reader parses/],
            ['U+4???????', /is not one this reader parses/],
            ['U+20zz', /token "U\+20zz" is not one this reader parses/],
            // Seven positions: a browser takes at most six, and the second reads in range, so only the length cap refuses it.
            ['U+12345??', /token "U\+12345\?\?" is not one this reader parses/],
            ['U+00001??', /token "U\+00001\?\?" is not one this reader parses/],
        ]) {
            const read = ownFaceSet({ css: css(range), art });
            assert.equal(read.faces.length, 0, `${range}: the face is left out, not read with a lenient range`);
            const problems = rangeProblems(read);
            assert.ok(problems.some((p) => pattern.test(p) && /drops the whole descriptor/.test(p)), `${range}:\n  ${problems.join('\n  ') || '(no problem)'}`);
        }
        // The last code point itself is a token a browser accepts: a claim, said as one. A span up to it and a wildcard claim nothing on their own.
        assert.match(rangeProblems(ownFaceSet({ css: css('U+10FFFF'), art })).join('\n'), /unicode-range names U\+10FFFF .* on its own/);
        for (const range of ['U+20-10FFFF', 'U+4??', 'U+0-7F, U+A0-FF']) assert.deepEqual(rangeProblems(ownFaceSet({ css: css(range), art })), [], range);
    });
});

describe('a-private-face-range-never-takes-one-letter-of-another-script', () => {
    // The 8g0 critic's P3-3. `a-face-range-never-takes-one-letter-of-another-script`
    // reads stall.css's faces alone, so a private look's face whose range took
    // `р` (U+0440) — the glyph re-subset's own first cut — passed every guard.
    // The same reading over every face a private look's sheet declares, the
    // subset the look's own word (`fonts.json`). Everything computed is
    // computed in a `before()` hook, an `it` or at module top.
    let reads;
    before(() => {
        reads = PRIVATE_ROWS.map((row) => {
            const read = ownFaceSet({ css: row.css, art: row.look.art });
            const report = scriptReport({ path: row.path, read, fontsText: row.look.fontsText, cls: row.lookClass, tree: row.look.packedTree });
            return { cls: row.lookClass, source: row.look.source, report, count: read.faces.length };
        });
        process.stderr.write(privateFacesLine('private face script guard (a-private-face-range-never-takes-one-letter-of-another-script)', reads, 'face'));
    });

    /** The report for one face `mem.woff2` with `range`, named in `fonts.json` as `subset` (or by `fonts` as given, `undefined` for none). */
    const report = (range, { subset = 'Latin', ...more } = {}) =>
        scriptReport({
            path: 'mem.css',
            read: ownFaceSet({ css: faceRule('mem.woff2', 't-mem-serif', withRange(range)), art: [mem(ASCII)] }),
            fontsText: Object.hasOwn(more, 'fonts') ? more.fonts : fontsJson({ 'mem.woff2': subset }),
            cls: 't-mem',
            tree: TREE,
            pins: more.pins ?? PINNED_RANGELESS_FACES,
        });

    it('reads every private look a run reads, the tracked fixture among them, and each face names only letters of its subset\'s script', () => {
        assert.ok(reads.some((r) => r.source === 'fixture'), 'the fixture is read');
        for (const r of reads) assert.deepEqual(r.report.problems, [], r.cls);
    });

    it('goes red on a planted look whose Latin face names р (U+0440) in its range — the glyph re-subset\'s own first cut — and passes the same look without it', async () => {
        const cut = (range) => faceRule(PLANT_FACE, PLANT_FAMILY, withRange(range));
        const art = { [`fixture/art/${PLANT_FACE}`]: faceBytes([...ASCII, 0x440, 0x20bd]), 'fixture/fonts.json': fontsJson({ [PLANT_FACE]: 'Latin' }) };
        const of = async (range) => {
            const row = await plantedRow(cut(range), art);
            const read = ownFaceSet({ css: row.css, art: row.look.art });
            return { read, report: scriptReport({ path: row.path, read, fontsText: row.look.fontsText, cls: row.lookClass, tree: row.look.packedTree }) };
        };
        const red = await of('U+20-7E, U+440, U+20BD');
        // Every guard the branch had passes it: the file holds р, so guard 1 has nothing to say.
        assert.deepEqual(rangeProblems(red.read), []);
        assert.equal(red.report.problems.length, 1, red.report.problems.join('\n'));
        assert.match(red.report.problems[0], /unicode-range names U\+0440 р, letters of another script than its Latin subset's Latin/);
        assert.match(red.report.problems[0], /draw those letters in this face and the rest in a font of the reader's machine: remove the tokens/);
        // The shipped reading, handed this face, refuses the same letter.
        const shipped = lettersOfAnotherScript([{ name: PLANT_FAMILY, faces: [{ file: red.read.faces[0].file, ranges: red.read.faces[0].ranges, script: 'Latin' }] }]);
        assert.deepEqual(shipped.letters.map(({ cp }) => cp), [0x440]);
        const green = await of('U+20-7E, U+20BD');
        assert.deepEqual(green.report.problems, []);
        assert.ok(green.report.count > 0 && green.report.faces === 1, 'the face was read');
    });

    it('re-cuts the canary\'s own face with a range that takes р: the packed tree moves, the pin goes with it, the letter is refused', async () => {
        const repo = plantCanary((path, text) => {
            if (path !== 'canary/sheet.css') return text;
            const ranged = text.replace("format('woff2');\n", "format('woff2');\n    unicode-range: U+20-7E, U+440;\n");
            assert.notEqual(ranged, text, 'the canary face CSS has the line the plant edits');
            return ranged;
        });
        const rows = privateRows(await servedSheets({ env: repo.selection, fixture: true, gitEnv: repo.env }));
        const row = rows.find((r) => r.lookClass === 't-canary');
        assert.ok(row !== undefined, 'the re-cut canary is read');
        assert.notEqual(row.look.packedTree, CANARY_TREE, 'another packed tree');
        const result = scriptReport({ path: row.path, read: ownFaceSet({ css: row.css, art: row.look.art }), fontsText: row.look.fontsText, cls: row.lookClass, tree: row.look.packedTree });
        assert.equal(result.problems.length, 1, result.problems.join('\n'));
        assert.match(result.problems[0], /art\/jetbrains-mono-latin\.woff2.* unicode-range names U\+0440 р, letters of another script than its Latin subset's Latin/);
        assert.deepEqual(result.excused, []);
    });

    it('reads the script as Script_Extensions: a Common or Latin letter passes, another script\'s is refused by script and by use', () => {
        // µ (U+00B5) and ʼ (U+02BC) are Common or hold Latin, ª (U+00AA) is Latin; ₽ and ≈ are signs.
        assert.deepEqual(report('U+20-7E, U+AA, U+B5, U+2BC, U+20BD, U+2248').problems, []);
        const refused = [0x03bc, 0x0440, 0x0640, 0x30fc, 0x5143, 0xff70];
        const problems = report(`U+20-7E, ${refused.map((cp) => `U+${cp.toString(16)}`).join(', ')}`).problems;
        assert.equal(problems.length, 1, problems.join('\n'));
        for (const cp of refused) assert.ok(problems[0].includes(cpName(cp)), cpName(cp));
        // More than a sentence shows are counted, not listed.
        assert.match(report('U+400-4FF').problems.join('\n'), /and \d+ more, letters of another script/);
    });

    it('reads the subset the look names in fonts.json, case-blind: Latin and Vietnamese are Latin, and the script check walks the range', () => {
        for (const subset of ['Latin', 'latin', 'LATIN', 'Vietnamese', 'vietnamese']) {
            const result = report('U+20-7E, U+1EA0-1EF9', { subset });
            assert.deepEqual(result.problems, [], subset);
            assert.ok(result.count > 100, `${subset}: ${result.count} code points read`);
            assert.match(report('U+20-7E, U+440', { subset }).problems.join('\n'), /U\+0440 р/, subset);
        }
        assert.equal(scriptOfSubset('latin'), 'Latin');
        assert.equal(scriptOfSubset('Latin'), undefined, 'the table is exact; the private guard lower-cases first');
    });

    it('refuses a subset SUBSET_SCRIPTS does not name, a fonts.json it cannot use and a face fonts.json does not name, each with a sentence', () => {
        for (const subset of ['Cyrillic', 'Latin Extended', 'CJK', '__proto__', 'constructor']) {
            const result = report('U+20-7E', { subset });
            assert.equal(result.problems.length, 1, `${subset}: ${result.problems.join('\n')}`);
            assert.match(result.problems[0], new RegExp(`its subset "${subset}" in fonts\\.json is one whose script SUBSET_SCRIPTS does not name \\(latin, vietnamese\\)`));
            assert.match(result.problems[0], /added there with its own script, on purpose/);
            assert.equal(result.count, 0, 'a face of an unknown script is not walked');
        }
        const cases = [
            [{ fonts: undefined }, /the look has no fonts\.json — this reader cannot tell which script the face is cut for/],
            [{ fonts: 'not json {' }, /fonts\.json cannot be read \(fonts\.json: not JSON/],
            [{ fonts: JSON.stringify({ fonts: [] }) }, /fonts\.json cannot be read \(fonts\.json: fonts is not a list/],
            [{ fonts: fontsJson({ 'other.woff2': 'Latin' }) }, /fonts\.json names no subset for it — this reader cannot tell which script the face is cut for/],
            [{ fonts: fontsJson({ 'mem.woff2': 5 }) }, /fonts\.json cannot be read \(fonts\.json: fonts\[0\]: the subset of "mem\.woff2", 5, is not printable ASCII/],
        ];
        for (const [more, pattern] of cases) {
            const result = report('U+20-7E', more);
            assert.ok(result.problems.some((p) => pattern.test(p)), `${pattern}:\n  ${result.problems.join('\n  ') || '(no problem)'}`);
        }
    });

    it('refuses a face with no range, or one the descriptor does not make a range of, by name and without walking it', () => {
        for (const [range, pattern] of [
            [undefined, /unicode-range is not declared, so the face is asked for every character/],
            ['', /unicode-range is not declared/],
            ['U+0-10FFFF', /unicode-range names 1114112 code points, more than the 65536 this reader walks/],
            ['U+0-10000', /unicode-range names 65537 code points, more than the 65536 this reader walks/],
            [',', /unicode-range names no code point \(a browser drops a descriptor it cannot read/],
        ]) {
            const result = report(range);
            assert.equal(result.problems.length, 1, `${range}:\n  ${result.problems.join('\n  ') || '(no problem)'}`);
            assert.match(result.problems[0], pattern, String(range));
            assert.match(result.problems[0], /state the range of the Latin subset/);
            assert.equal(result.count, 0, `${range}: not walked`);
        }
        // A whole plane up to the cap is a range, and a wide one: walked, and its other-script letters are the refusal.
        const wide = report('U+0-FFFF');
        assert.ok(wide.count >= 0x10000 && /letters of another script/.test(wide.problems.join('\n')), wide.problems.join('\n'));
    });

    it('excuses the canary\'s rangeless face by name and holds the pin live: bound to the class, the packed tree, the family and the file', async () => {
        const row = await canaryRow();
        assert.equal(row.look.packedTree, CANARY_TREE);
        const read = ownFaceSet({ css: row.css, art: row.look.art });
        const args = { path: row.path, read, fontsText: row.look.fontsText, cls: row.lookClass, tree: row.look.packedTree };
        const pinned = scriptReport(args);
        assert.deepEqual(pinned.problems, []);
        assert.equal(pinned.excused.length, 1);
        assert.equal(pinned.excused[0].face.family, 't-canary-mono');
        assert.equal(PINNED_RANGELESS_FACES.length, 1);
        assert.equal(PINNED_RANGELESS_FACES[0].tree, CANARY_TREE);
        // Without the pin the face is refused as any rangeless face is.
        assert.match(scriptReport({ ...args, pins: [] }).problems.join('\n'), /art\/jetbrains-mono-latin\.woff2 \("t-canary-mono"\): unicode-range is not declared, so the face is asked for every character/);
        // The same sheet under another packed tree, or another class, is another look: walked, and no pin said to be dead.
        for (const other of [{ tree: 'f'.repeat(40) }, { cls: 't-other' }]) {
            const walked = scriptReport({ ...args, ...other });
            assert.equal(walked.problems.length, 1, walked.problems.join('\n'));
            assert.match(walked.problems[0], /unicode-range is not declared/);
            assert.deepEqual(walked.excused, []);
        }
        // A pin is for one family and one file: a pin that names others excuses nothing, and is said to match nothing.
        for (const pin of [{ ...PINNED_RANGELESS_FACES[0], family: 't-canary-sans' }, { ...PINNED_RANGELESS_FACES[0], file: 'art/other.woff2' }]) {
            const dead = scriptReport({ ...args, pins: [pin] });
            assert.ok(dead.problems.some((p) => /unicode-range is not declared/.test(p)), dead.problems.join('\n'));
            assert.ok(dead.problems.some((p) => /the pin for .* matches no face of this sheet that fonts\.json names a subset for/.test(p)), dead.problems.join('\n'));
        }
    });

    it('says a pin that excuses a face which states a range, or one that excuses a wider range, is not live', () => {
        const pin = { cls: 't-mem', tree: TREE, family: 't-mem-serif', file: 'art/mem.woff2', why: 'a test' };
        const ranged = report('U+20-7E', { pins: [pin] });
        assert.equal(ranged.problems.length, 1, ranged.problems.join('\n'));
        assert.match(ranged.problems[0], /the pin for art\/mem\.woff2 excuses a face that states a range; remove the pin \(a test\)/);
        // The pin excuses the missing range only: a range too wide to walk is still refused, and says why the pin does not help.
        const wide = report('U+0-10FFFF', { pins: [pin] });
        assert.equal(wide.problems.length, 1, wide.problems.join('\n'));
        assert.match(wide.problems[0], /names 1114112 code points.*\[the pin for this face excuses only a face that declares no unicode-range at all\]/);
        const bare = report(undefined, { pins: [pin] });
        assert.deepEqual(bare.problems, []);
        assert.equal(bare.excused.length, 1);
    });

    it('reads a face the sheet declares inside an at-rule and reports a face it cannot read first', () => {
        const nested = `@media (min-width: 680px) { ${faceRule('mem.woff2', 't-mem-serif', withRange('U+20-7E, U+440'))} }`;
        const result = scriptReport({ path: 'mem.css', read: ownFaceSet({ css: nested, art: [mem(ASCII)] }), fontsText: fontsJson({ 'mem.woff2': 'Latin' }), cls: 't-mem', tree: TREE });
        assert.match(result.problems.join('\n'), /U\+0440 р/);
        const gone = scriptReport({ path: 'mem.css', read: ownFaceSet({ css: faceRule('gone.woff2', 't-mem-serif'), art: [mem(ASCII)] }), fontsText: fontsJson({ 'gone.woff2': 'Latin' }), cls: 't-mem', tree: TREE });
        assert.match(gone.problems.join('\n'), /art\/gone\.woff2 is not there/);
        assert.equal(gone.faces, 0);
    });
});

describe('a-private-stack-falls-to-a-served-face-for-what-its-faces-lack', () => {
    let printed;
    let served;
    before(() => {
        printed = printedCodePoints(SERVED);
        served = servedFamilies();
    });

    /** The report for a sheet whose face `t-mem-serif` holds `codePoints` (ASCII unless given) and whose rules are `rules`. */
    const report = (rules, { codePoints = ASCII, rootStack, face = faceRule('mem.woff2', 't-mem-serif') } = {}) =>
        stackReport({ path: 'mem.css', css: `${face}\n${rules}`, art: [mem(codePoints)], rootStack, printed, pinned: PINNED, served });
    const SERIF = 't-mem-serif';
    /** Every code point some walked reading of the report leaves to the machine. */
    const gapCps = (result) => new Set(result.gaps.flatMap((gap) => gap.cps));

    it('reads every private look a run reads, the tracked fixture among them, and each ends its stacks in a served face', () => {
        const results = PRIVATE_ROWS.map((row) => {
            const rootStack = rootStackOf(row.look.look, theme);
            const result = rootStack === undefined ? undefined : stackReport({ path: row.path, css: row.css, art: row.look.art, rootStack, printed, pinned: PINNED, served, cls: row.lookClass, tree: row.look.packedTree });
            return { row, rootStack, result };
        });
        // What it read is said before anything is asserted: a red run names the looks too.
        const reads = results.map(({ row, result }) => ({
            cls: row.lookClass,
            source: row.look.source,
            count: result?.read ?? 0,
            note: result === undefined || result.excused.length === 0 ? undefined : `${result.excused.length} excused by name`,
        }));
        process.stderr.write(privateFacesLine('private stack guard (a-private-stack-falls-to-a-served-face-for-what-its-faces-lack)', reads, 'font stack'));
        assert.ok(reads.some((r) => r.source === 'fixture'), 'the fixture is read');
        for (const { row, rootStack, result } of results) {
            assert.ok(rootStack !== undefined, `${row.lookClass}: the theme's stack for its row is read`);
            assert.deepEqual(result.problems, [], row.lookClass);
        }
        // The tracked fixture sets one stack with no face of its own, so the guard has a subject in public CI.
        const fixture = results.find(({ row }) => row.look.source === 'fixture');
        assert.equal(fixture.result.read, 1, 'the fixture sets one stack');
        assert.equal(fixture.result.walked, 1);
        assert.equal(fixture.result.excused.length, 0, 'no pin is the fixture\'s');
    });

    it('excuses by name the canary\'s one stack and nothing else, and holds the pin live: the canary from public bytes goes red without it', async () => {
        const row = await canaryRow();
        const input = { path: row.path, css: row.css, art: row.look.art, rootStack: rootStackOf(row.look.look, theme), printed, pinned: PINNED, served, cls: 't-canary', tree: row.look.packedTree };
        // The pins are pinned by value, the canary's packed tree among them: a second is a public diff of this test.
        assert.deepEqual(
            PINNED_STACKS.map((pin) => [pin.cls, pin.tree, pin.prop, pin.selector, pin.stack]),
            [['t-canary', CANARY_TREE, 'font-family', '.t-canary .stall-tagline', 't-canary-mono']],
        );
        assert.equal(row.look.packedTree, CANARY_TREE, 'the canary from public bytes is the canary\'s packed tree');
        for (const pin of PINNED_STACKS) assert.ok(pin.why.length > 40 && Object.isFrozen(pin), pin.selector);
        const pinned = stackReport(input);
        assert.deepEqual(pinned.problems, []);
        assert.equal(pinned.read, 1, 'the canary sets one stack');
        assert.equal(pinned.walked, 1);
        assert.equal(pinned.excused.length, 1);
        assert.equal(pinned.failures.length, 1);
        // The tripwire: without the pin the pinned stack fails, for both reasons, and a pin that matches no failing stack is a failure of this test.
        const bare = stackReport({ ...input, pins: [] });
        for (const pin of PINNED_STACKS) assert.ok(bare.failures.some((f) => stackMatchesPin(pin, { cls: 't-canary', tree: row.look.packedTree }, f)), `the pin for ${pin.selector} excuses no failing stack`);
        assert.equal(bare.problems.length, 1, bare.problems.join('\n'));
        assert.ok(bare.gaps[0].structure, 'it names no served family');
        assert.ok(gapCps(bare).has(0x2248) && gapCps(bare).has(0x20bd), 'and leaves ≈ and ₽ to the machine');
        // A pin for another class, or for this class in another tree, excuses nothing here; the second says why.
        assert.equal(stackReport({ ...input, cls: 't-other' }).problems.length, 1);
        const untreed = stackReport({ ...input, tree: undefined });
        assert.equal(untreed.problems.length, 1);
        assert.match(untreed.problems[0], /the pin for this rule excuses it only in the canary's packed tree 1a92f4fc0ed2, and this look's is not given/);
        // What the pin excuses is everything the face lacks on whatever its line paints (the re-review's R-3): today the seller's
        // words alone, because the canary's sheet prints no text of its own — read over the whole sheet, since a selector that
        // never names the tagline reaches its pseudo-elements (the critic's E1–E5). A canary that prints some fails here.
        assert.deepEqual(printingContent(row.css), [], 'the canary prints no generated text');
        for (const rule of [".t-canary .stall-tagline::after { content: '\\25c6'; }", ".t-canary .stall-headings > h1 + div::after { content: '\\25c6'; }"]) {
            assert.equal(printingContent(beforeReduce(row.css, rule)).length, 1, rule);
        }
    });

    it('binds the pin to the canary\'s packed tree and to font-family: the canary\'s names over other bytes, or the stack in another property, are walked', async () => {
        // The re-review's R-2: a pin held by names would excuse any look whose index names t-canary over any face.
        const row = await canaryRow();
        assert.equal(row.look.packedTree, CANARY_TREE, 'the canary from public bytes is the canary\'s packed tree');
        const read = async (repo) => privateRows(await servedSheets({ env: repo.selection, fixture: true, gitEnv: repo.env })).find((r) => r.lookClass === 't-canary');
        const reportOf = (look) => stackReport({ path: look.path, css: look.css, art: look.art ?? look.look.art, rootStack: rootStackOf(look.look.look, theme), printed, pinned: PINNED, served, cls: 't-canary', tree: look.look.packedTree });
        // The canary's sheet over a face holding one glyph, under the canary's class and file name; and the canary's own bytes beside one art file nothing names.
        const oneGlyph = await read(plantCanary((path, contents) => (path === 'canary/art/jetbrains-mono-latin.woff2' ? faceBytes([0x41]) : contents)));
        const extra = await read(plantCanary(undefined, { 'canary/art/extra.svg': canaryFiles()['canary/art/ground.svg'] }));
        for (const [name, look] of [['one glyph', oneGlyph], ['an extra file', extra]]) {
            assert.notEqual(look.look.packedTree, CANARY_TREE, name);
            const result = reportOf(look);
            assert.equal(result.excused.length, 0, `${name}: excused by names alone`);
            assert.ok(result.problems.some((p) => /font-family: t-canary-mono/.test(p) && /names no served family/.test(p)), `${name}:\n  ${result.problems.join('\n  ') || '(no problem)'}`);
        }
        // The pinned selector and stack in a custom property: the pin names font-family, so it excuses neither.
        for (const prop of ['--s-font', '--s-font-x']) {
            const result = stackReport({ path: 'canary.css', css: `${CANARY_FACE}\n.t-canary .stall-tagline { ${prop}: t-canary-mono; }`, art: CANARY_ART, rootStack: theme.FONT_STACKS[0], printed, pinned: PINNED, served, cls: 't-canary', tree: CANARY_TREE });
            assert.equal(result.excused.length, 0, prop);
            assert.ok(result.problems.some((p) => /names no served family/.test(p)), `${prop}:\n  ${result.problems.join('\n  ') || '(no problem)'}`);
        }
    });

    it('lets the pin excuse that stack alone: another selector, another stack, another class or a second copy of it is walked', () => {
        // The canary's packed tree stands in for an in-memory sheet, so what is tested here is the names; the tree is the test above.
        const stack = (css, options = {}) => stackReport({ path: 'canary.css', css: `${CANARY_FACE}\n${css}`, art: CANARY_ART, rootStack: theme.FONT_STACKS[0], printed, pinned: PINNED, served, cls: 't-canary', tree: CANARY_TREE, ...options });
        const pinnedRule = '.t-canary .stall-tagline { font-family: t-canary-mono; }';
        const ok = stack(pinnedRule);
        assert.deepEqual([ok.problems, ok.excused.length], [[], 1]);
        // The same stack on another line of the sign.
        for (const other of ['.t-canary .stall-sub', '.t-canary .stall-name', '.t-canary .stall-tagline::before', '.t-canary .stall-tagline, .t-canary .stall-sub', '.stall-tagline']) {
            const result = stack(`${pinnedRule}\n${other} { font-family: t-canary-mono; }`);
            assert.equal(result.excused.length, 1, other);
            assert.equal(result.problems.length, 1, `${other}:\n  ${result.problems.join('\n  ')}`);
            assert.match(result.problems[0], /names no served family/, other);
        }
        // The pinned selector with another stack: the pin matches nothing and the stack is walked.
        for (const changed of ["t-canary-mono, 'JetBrains Mono'", 't-canary-mono, serif', "'Stall Serif'"]) {
            const result = stack(`.t-canary .stall-tagline { font-family: ${changed}; }`);
            assert.ok(result.problems.some((p) => /matches no stack of this sheet/.test(p)), changed);
            assert.equal(result.excused.length, 0, changed);
        }
        // Moving the stack to a passing one is the pin leaving in the same diff: a pin that excuses a stack that passes is a failure.
        assert.match(stack(".t-canary .stall-tagline { font-family: 'Stall Serif'; }", { pins: [{ ...PINNED_STACKS[0], stack: "'Stall Serif'" }] }).problems.join('\n'), /excuses a stack that passes; remove the pin/);
        // The tagline stack of any other look is walked like any other: nothing about the line excuses it.
        const other = stack('.t-mem .stall-tagline { font-family: t-canary-mono; }', { cls: 't-mem' });
        assert.equal(other.problems.length, 1);
        assert.deepEqual([other.excused.length, other.failures.length], [0, 1]);
        const served2 = stack(".t-mem .stall-tagline { font-family: t-canary-mono, 'Stall Serif'; }", { cls: 't-mem' });
        assert.deepEqual(served2.problems, []);
        // A pin a caller hands in works the same way, and is live or a failure.
        const mine = { cls: 't-mem', tree: 'mem-tree', prop: 'font-family', selector: '.x', stack: 't-canary-mono', why: 'a test' };
        assert.deepEqual(stack('.x { font-family: t-canary-mono; }', { cls: 't-mem', tree: 'mem-tree', pins: [mine] }).problems, []);
        assert.match(stack('.y { font-family: t-canary-mono; }', { cls: 't-mem', tree: 'mem-tree', pins: [mine] }).problems.join('\n'), /matches no stack of this sheet/);
    });

    it('goes red on a planted look whose stack names only its own face, which lacks ≈, and passes the same stack with \'Stall Serif\' after it', async () => {
        const art = { [`fixture/art/${PLANT_FACE}`]: faceBytes(ASCII) };
        const stackOf = (families) => `${faceRule(PLANT_FACE, PLANT_FAMILY)}\n.${PLANTED_CLASS} .stall-body { --s-font: ${families}; }`;
        const bare = await plantedRow(stackOf(PLANT_FAMILY), art);
        const red = stackReport({ path: bare.path, css: bare.css, art: bare.look.art, rootStack: rootStackOf(bare.look.look, theme), printed, pinned: PINNED, served });
        assert.equal(red.problems.length, 1, red.problems.join('\n'));
        assert.match(red.problems[0], /--s-font: t-planted-look-serif names no served family before a family the machine supplies.*; and leaves .*\(src\/ui\/copy\.ts/);
        assert.ok(red.gaps[0].structure);
        assert.ok(gapCps(red).has(0x2248), 'the rate line\'s ≈ is left to the machine');
        assert.deepEqual(printed.get(0x2248) !== undefined && [...printed.get(0x2248)].includes('src/ui/copy.ts'), true);
        const served2 = await plantedRow(stackOf(`${PLANT_FAMILY}, 'Stall Serif', 'Iowan Old Style', serif`), art);
        const green = stackReport({ path: served2.path, css: served2.css, art: served2.look.art, rootStack: rootStackOf(served2.look.look, theme), printed, pinned: PINNED, served });
        assert.deepEqual(green.problems, []);
        assert.ok(green.walked >= 1, 'a stack was walked');
    });

    it('walks a stack as a browser does: a family the machine supplies before a served face leaves the character to the machine', () => {
        assert.deepEqual(report(`.x { font-family: ${SERIF}, 'Stall Serif', serif; }`).problems, []);
        const system = report(`.x { font-family: ${SERIF}, Georgia, 'Stall Serif', serif; }`);
        assert.equal(system.problems.length, 1, system.problems.join('\n'));
        assert.ok(gapCps(system).has(0x2248));
        for (const stack of [`${SERIF}, 'Stall Serif'`, `${SERIF}, Inter, sans-serif`, `${SERIF}, 'JetBrains Mono', monospace`]) {
            assert.deepEqual(report(`.x { font-family: ${stack}; }`).problems, [], stack);
        }
    });

    it('excuses a pinned glyph for a served family the stack names whose every face lacks it, and for no stack that names none', () => {
        // 元 is pinned for every served face (no shipped font draws it): the shipped situation.
        const named = report(`.x { font-family: ${SERIF}, 'Stall Serif', serif; }`);
        assert.deepEqual(named.problems, []);
        assert.equal(named.walked, 1);
        // The pins are the list's: with none, the same stack leaves to the machine exactly what the list pins for a Stall Serif face, derived and not copied.
        const unpinned = stackReport({ path: 'mem.css', css: `${faceRule('mem.woff2', 't-mem-serif')}\n.x { font-family: ${SERIF}, 'Stall Serif'; }`, art: [mem(ASCII)], printed, pinned: new Map(), served });
        const forSerif = PRINTED_NOT_HELD.filter((entry) => entry.faces.some((face) => face.startsWith('Stall Serif'))).map((entry) => entry.cp);
        assert.ok(forSerif.length > 0, 'the list pins a glyph for Stall Serif');
        const sorted = (cps) => [...cps].sort((a, b) => a - b).map(cpName);
        assert.deepEqual(sorted(gapCps(unpinned)), sorted(forSerif));
        // What Stall Serif draws through its segments of Inter's file (stall.css) is drawn: the guard reads a segment as a face of the family it is declared for.
        const serifSets = servedFaceSets().filter((set) => set.name.startsWith('Stall Serif'));
        const segmentOf = (set) => set.faces.find((face) => face.file.startsWith('src/ui/fonts/inter-'));
        const viaSegment = [...printed.keys()].filter((cp) => serifSets.every((set) => segmentOf(set)?.ranges.some(([lo, hi]) => cp >= lo && cp <= hi) && segmentOf(set).held.has(cp)));
        assert.ok(viaSegment.length > 0 && viaSegment.includes(0x2192), 'Stall Serif draws → through its segment');
        for (const cp of viaSegment) assert.ok(!gapCps(unpinned).has(cp), cpName(cp));
        // With no served family the stack has no excuse and no segment: the look's ASCII face leaves all of them.
        const none = gapCps(report(`.x { font-family: ${SERIF}, serif; }`));
        for (const cp of [...forSerif, ...viaSegment]) assert.ok(none.has(cp), cpName(cp));
        assert.ok(!gapCps(named).has(0x5143));
        // A pin excuses a family only when it names every variant of it: the italic left out, 元 is a gap again.
        const romanOnly = new Map([[0x5143, { faces: ['Stall Serif'] }]]);
        const partial = stackReport({ path: 'mem.css', css: `${faceRule('mem.woff2', 't-mem-serif')}\n.x { font-family: ${SERIF}, 'Stall Serif'; }`, art: [mem(ASCII)], printed, pinned: romanOnly, served });
        assert.deepEqual(sorted(gapCps(partial)), sorted([0x5143]));
        // Inter draws what the segments draw, and 元 (pinned for every face) is excused by any served family.
        assert.deepEqual(report(`.x { font-family: ${SERIF}, Inter; }`).problems, []);
        assert.deepEqual(report(`.x { font-family: ${SERIF}, Inter, 'Stall Serif'; }`).problems, []);
        // The pin is not a reason to leave an unpinned glyph: ≈ stays red with 'Georgia' standing in for a served face.
        assert.ok(gapCps(report(`.x { font-family: ${SERIF}, Georgia; }`)).has(0x2248));
    });

    it('reads a face by its range and its cmap together, and a family by every one of its variants', () => {
        // The range names ≈ and the file holds no glyph for it: the browser goes on to the next family.
        const claims = faceRule('mem.woff2', 't-mem-serif', withRange('U+20-7E, U+2248'));
        assert.ok(gapCps(report(`.x { font-family: ${SERIF}; }`, { face: claims })).has(0x2248));
        assert.deepEqual(report(`.x { font-family: ${SERIF}, 'Stall Serif'; }`, { face: claims }).problems, []);
        // The file holds ≈ and the range does not name it.
        const outside = faceRule('mem.woff2', 't-mem-serif', withRange('U+20-7E'));
        assert.ok(gapCps(report(`.x { font-family: ${SERIF}; }`, { face: outside, codePoints: [...ASCII, 0x2248] })).has(0x2248));
        // Both: drawn by the look's own face, with no served face in the stack.
        const both = faceRule('mem.woff2', 't-mem-serif', withRange('U+20-7E, U+2248'));
        const own = report(`.x { font-family: ${SERIF}; }`, { face: both, codePoints: [...ASCII, 0x2248] });
        assert.ok(own.gaps.length === 1 && !gapCps(own).has(0x2248), 'drawn by the look\'s own face');
        // A family draws a character only if every variant of it does: the italic lacks ≈.
        const italic = `${faceRule('mem.woff2', 't-mem-serif')}\n${faceRule('mem-italic.woff2', 't-mem-serif', ' font-style: italic;')}`;
        const art = [mem([...ASCII, 0x2248]), mem(ASCII, 'mem-italic.woff2')];
        const variants = stackReport({ path: 'mem.css', css: `${italic}\n.x { font-family: ${SERIF}; }`, art, printed, pinned: PINNED, served });
        assert.ok(gapCps(variants).has(0x2248));
    });

    it('requires a served family before any family the machine supplies, the look\'s own families not counted wherever they stand, whatever its own face draws', () => {
        // A face that holds every code point the app prints and its case forms: nothing is left to the machine, and the stack is still refused.
        const everything = [...new Set([...printed.keys(), ...ASCII, 0x110, 0x1ed2])];
        const alone = report(`.x { font-family: ${SERIF}; }`, { codePoints: everything });
        assert.equal(alone.gaps.length, 1);
        assert.deepEqual([alone.gaps[0].structure, alone.gaps[0].cps], [true, []]);
        assert.match(alone.problems[0], /names no served family before a family the machine supplies, so a letter its own face lacks, a seller's included, is drawn per OS — end the stack in a served face/);
        assert.doesNotMatch(alone.problems[0], /leaves/);
        for (const ok of [`${SERIF}, 'Stall Serif'`, `${SERIF}, Inter, Georgia`, `'Stall Serif', ${SERIF}`, `${SERIF}, ${SERIF}, 'JetBrains Mono', monospace`]) {
            assert.deepEqual(report(`.x { font-family: ${ok}; }`, { codePoints: everything }).problems, [], ok);
        }
        for (const bad of [`${SERIF}, serif`, `${SERIF}, Georgia, 'Stall Serif'`, `Georgia, 'Stall Serif'`, 'serif', `${SERIF}, ui-sans-serif, Inter`]) {
            const result = report(`.x { font-family: ${bad}; }`, { codePoints: everything });
            assert.ok(result.gaps.length === 1 && result.gaps[0].structure, bad);
        }
        // The structure is the stack's own, read from the family names: a font shorthand and a --s-font… are stacks too.
        assert.ok(report(`.x { font: 12px ${SERIF}, serif; }`, { codePoints: everything }).gaps[0].structure);
        assert.ok(report(`.x { --s-font: ${SERIF}; }`, { codePoints: everything }).gaps[0].structure);
        // The roads a stack is read on beside a plain rule: a block of @media (every desk-width stack) and a keyframe stop.
        for (const rule of [`@media (min-width: 680px) { .x { font-family: ${SERIF}; } }`, `@keyframes k { to { font-family: ${SERIF}; } }`]) {
            const result = report(rule, { codePoints: everything });
            assert.equal(result.read, 1, rule);
            assert.ok(result.gaps.length === 1 && result.gaps[0].structure, `${rule}:\n  ${result.problems.join('\n  ') || '(no problem)'}`);
        }
        // Only inherit is skipped: initial is the browser's default family, and unset is refused as the look rules refuse it.
        for (const keyword of ['initial', 'unset', 'INITIAL !important']) {
            const result = report(`.x { font-family: ${keyword}; }`, { codePoints: everything });
            assert.ok(result.gaps.length === 1 && result.gaps[0].structure, keyword);
        }
    });

    it('walks the upper and lower case forms of what the app prints, since a look may uppercase a line', () => {
        // The app prints đ and ồ (a quote in VND); a look that uppercases paints Đ and Ồ.
        const lowercaseOnly = [...printed.keys()];
        assert.ok(printed.has(0x111) && printed.has(0x1ed3) && !printed.has(0x110) && !printed.has(0x1ed2));
        const result = report(`.x { font-family: ${SERIF}; }`, { codePoints: lowercaseOnly });
        assert.deepEqual([...gapCps(result)].sort((a, b) => a - b), [0x110, 0x1ed2]);
        assert.match(result.problems.join('\n'), /U\+0110 Đ \(case form of U\+0111 đ\); U\+1ED2 Ồ \(case form of U\+1ED3 ồ\)/);
        // A served face after it draws both, and a face holding the capitals leaves nothing.
        assert.deepEqual(report(`.x { font-family: ${SERIF}, Inter; }`, { codePoints: lowercaseOnly }).problems, []);
        assert.deepEqual(gapCps(report(`.x { font-family: ${SERIF}; }`, { codePoints: [...lowercaseOnly, 0x110, 0x1ed2] })).size, 0);
    });

    it('reads a var fallback as one more reading, even where a rule defines the property', () => {
        // The critic's case: below .stall-body the property is defined; everywhere else the fallback is the value.
        const defined = '.t-x .stall-body { --s-font-x: t-mem-serif, Inter; }\n.t-x .item-x { font-family: var(--s-font-x, Georgia); }';
        const result = report(defined);
        assert.equal(result.problems.length, 1, result.problems.join('\n'));
        assert.match(result.problems[0], /font-family: var\(--s-font-x, Georgia\) \[read as Georgia\]/);
        assert.equal(report('.t-x .item-x { font-family: var(--s-font-x, Georgia); }').problems.length, 1);
        assert.deepEqual(report(defined.replace('Georgia', "'Stall Serif'")).problems, []);
        // --s-font is the theme's, set inline on the root: it is always defined, and its fallback is never the value.
        assert.deepEqual(report(`.x { font-family: ${SERIF}, var(--s-font, Georgia); }`, { rootStack: theme.FONT_STACKS[2] }).problems, []);
    });

    it('holds the theme\'s own three stacks to the rule, so the pinned list and the rule agree on what the shipped looks leave to the machine', () => {
        assert.equal(theme.FONT_STACKS.length, 3);
        for (const rootStack of theme.FONT_STACKS) {
            const result = report('.x { font-family: var(--s-font); }', { rootStack });
            assert.deepEqual(result.problems, [], rootStack);
            assert.equal(result.walked, 1);
        }
    });

    it('reads var(--s-font) as every value the sheet gives it and the theme\'s own, and refuses what it cannot resolve', () => {
        const serif = theme.FONT_STACKS[2];
        assert.deepEqual(report(`.x { font-family: ${SERIF}, var(--s-font); }`, { rootStack: serif }).problems, []);
        const sys = report(`.x { font-family: ${SERIF}, var(--s-font); }`, { rootStack: 'Georgia, serif' });
        assert.equal(sys.problems.length, 1, sys.problems.join('\n'));
        assert.match(sys.problems[0], /\[read as t-mem-serif, Georgia, serif\]/);
        // A restatement is one more reading: the root's value stays one, because the theme sets it inline and a sheet cannot override it on the same element.
        const restated = (value) => `.b { --s-font: ${value}; }\n.c { font-family: ${SERIF}, var(--s-font); }`;
        assert.deepEqual(report(restated("'Stall Serif'"), { rootStack: serif }).problems, []);
        assert.match(report(restated('Georgia, serif'), { rootStack: serif }).problems.join('\n'), /\[read as t-mem-serif, Georgia, serif\]/);
        // A fallback stands in for a --s-font… nothing sets; without one it is a refusal, as is a var the theme does not own.
        assert.deepEqual(report(`.x { font-family: ${SERIF}, var(--s-font-body, 'Stall Serif'); }`).problems, []);
        const refusals = [
            [`.x { font-family: ${SERIF}, var(--s-font-body); }`, {}, /var\(--s-font-body\) is set by no rule of the sheet/],
            [`.x { font-family: ${SERIF}, var(--other-font); }`, {}, /only the theme's --s-font… is resolved here/],
            [`.x { --s-font: ${SERIF}, var(--s-font); }`, { rootStack: serif }, /--s-font refers to itself/],
            [`.x { font-family: ${SERIF}, var(--s-font); }`, {}, /names no stack this reader can read/],
            [`.a { --s-font-a: ${SERIF}, var(--s-font-b); } .b { --s-font-b: ${SERIF}, var(--s-font-a); } .x { font-family: var(--s-font-a); }`, {}, /refers to itself/],
        ];
        for (const [rules, options, pattern] of refusals) {
            const problems = report(rules, options).problems;
            assert.ok(problems.some((p) => pattern.test(p) && /cannot decide/.test(p)), `${pattern}:\n  ${problems.join('\n  ') || '(no problem)'}`);
        }
        // Too many readings is a refusal, not a long walk.
        const many = Array.from({ length: 5 }, (_, i) => `.d${i} { --s-font-k: 'Stall Serif'; } .e${i} { --s-font-k: Inter; }`).join('\n');
        assert.ok(report(`${many} .x { font-family: var(--s-font-k), var(--s-font-k), var(--s-font-k), var(--s-font-k), var(--s-font-k); }`).problems.some((p) => /more than 16 readings/.test(p)));
    });

    it('refuses an all that resets font-family to the browser\'s default, on the canary from public bytes and in memory', async () => {
        // The re-review's R-1: `all: initial` sets no family list, and resets font-family to its initial value, a font of the reader's machine.
        const WHY = /all: initial — resets font-family to the browser's default, a font of the reader's machine/;
        for (const rule of ['.t-canary .item-x { all: initial; }', ".t-canary .stall-name::after { all: initial; content: '\\25c6'; }"]) {
            const repo = plantCanary((path, contents) => (path === 'canary/sheet.css' ? beforeReduce(contents, rule) : contents));
            const row = privateRows(await servedSheets({ env: repo.selection, fixture: true, gitEnv: repo.env })).find((r) => r.lookClass === 't-canary');
            const result = stackReport({ path: row.path, css: row.css, art: row.look.art, rootStack: rootStackOf(row.look.look, theme), printed, pinned: PINNED, served, cls: 't-canary', tree: row.look.packedTree });
            assert.ok(result.problems.some((p) => WHY.test(p)), `${rule}:\n  ${result.problems.join('\n  ') || '(no problem)'}`);
        }
        for (const rule of ['.t-mem .x { all: initial; }', ".t-mem .x::after { all: initial; content: '\\25c6'; }", '.t-mem .x { all: INITIAL !important; }', '@keyframes k { to { all: initial; } }']) {
            assert.ok(report(rule).problems.some((p) => /resets font-family to the browser's default/.test(p)), rule);
        }
        // `inherit` and `unset` let font-family inherit.
        assert.deepEqual(report('.t-mem .x { all: inherit; } .t-mem .y { all: unset; }').problems, []);
    });

    it('reads the family list of a font shorthand, and refuses one it cannot read', () => {
        assert.deepEqual(report(`.x { font: 600 12px/1.2 ${SERIF}, 'Stall Serif', serif; }`).problems, []);
        const bare = report(`.x { font: 12px ${SERIF}; }`);
        assert.match(bare.problems.join('\n'), /font: 12px t-mem-serif/);
        assert.ok(gapCps(bare).has(0x2248));
        assert.match(report('.x { font: caption; }').problems.join('\n'), /a font shorthand whose family this reader cannot read/);
        assert.deepEqual(report('.x { font: inherit; font-family: inherit; }').problems, []);
    });

    it('refuses a look whose face it cannot read, and reads the theme\'s stack for a look\'s row', () => {
        const unread = stackReport({ path: 'mem.css', css: `${faceRule('gone.woff2', 't-mem-serif')}\n.x { font-family: ${SERIF}, 'Stall Serif'; }`, art: [], printed, pinned: PINNED, served });
        assert.ok(unread.problems.some((p) => /art\/gone\.woff2 is not there/.test(p)));
        assert.equal(rootStackOf({ base: 'rural' }, theme), theme.FONT_STACKS[2]);
        assert.equal(rootStackOf({ base: 'neo' }, theme), theme.FONT_STACKS[1]);
        assert.equal(rootStackOf({ base: 'modern', fontIndex: 2 }, theme), theme.FONT_STACKS[2]);
        assert.equal(rootStackOf({ base: 'modern' }, theme), theme.FONT_STACKS[0]);
        assert.equal(rootStackOf({ base: 'constructor' }, theme), undefined);
        assert.equal(rootStackOf(undefined, theme), undefined);
        // The base names the reader takes are the ones the look data takes.
        assert.match(read('src/domain/lookData.ts'), /modern: DEFAULT_THEME_ID,\s*neo: NEO_CITY_THEME_ID,\s*rural: RURAL_THEME_ID,/);
    });
});

describe('every-face-of-a-family-shares-its-descriptors', () => {
    // A segment of Inter's file in another family's name (stall.css) is only
    // safe while it states what the family states. Declared `400 700` beside
    // JetBrains Mono's `100 800`, it made Chrome 154 pick the segment's
    // descriptor group and drop the family's own Latin face at the weights
    // inside it: Neo's weight-400 and 700 text drew in Menlo (800 did not)
    // with every face `loaded`, which the probe's status check cannot see
    // (the glyph-subset critic's item 4). Computed in `before`: a
    // describe body only registers.
    let css;
    before(() => {
        css = read('src/ui/stall.css');
    });

    /** `css` with `change` applied to the one @font-face block `pick` selects. */
    const planted = (pick, change) => {
        let hit = 0;
        const out = css.replace(/@font-face\s*\{[^}]*\}/g, (block) => {
            if (!pick(block)) return block;
            hit += 1;
            return change(block);
        });
        assert.equal(hit, 1, 'the plant selects exactly one rule');
        assert.notEqual(out, css);
        return out;
    };
    const segmentOf = (family) => (block) => block.includes(`'${family}'`) && block.includes('inter-latin.woff2');
    const ownLatinOf = (family) => (block) => block.includes(`'${family}'`) && /fonts\/(?!inter-)[a-z-]*latin\.woff2/.test(block);

    it('holds on stall.css, over every rule of the four groups it reads', () => {
        assert.deepEqual(descriptorProblems(css), []);
        const counts = new Map();
        for (const face of declaredStallFaces()) {
            const key = `${face.family} ${face.style.trim()}`;
            counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        // Two subsets each, and a segment of Inter's file in the two other families' names.
        assert.deepEqual([...counts].sort(), [['Inter normal', 2], ['JetBrains Mono normal', 3], ['Stall Serif italic', 3], ['Stall Serif normal', 3]]);
    });

    it("goes red on the footgun: a JetBrains Mono segment declared 400 700 beside the family's 100 800", () => {
        const problems = descriptorProblems(planted(segmentOf('JetBrains Mono'), (block) => block.replace('font-weight: 100 800', 'font-weight: 400 700')));
        assert.equal(problems.length, 1);
        assert.match(problems[0], /^JetBrains Mono normal: font-weight differs between its rules/);
        assert.match(problems[0], /"400 700" on inter-latin\.woff2/);
        assert.match(problems[0], /"100 800" on jetbrains-mono-latin\.woff2/);
    });

    it('goes red the other way round too: the family moved and its segment did not', () => {
        const problems = descriptorProblems(planted(ownLatinOf('Stall Serif'), (block) => block.replace('font-weight: 400 700', 'font-weight: 400 800')));
        assert.equal(problems.length, 1);
        assert.match(problems[0], /^Stall Serif normal: font-weight differs/);
    });

    it('reads a descriptor left out as its initial value, and a different display as a difference', () => {
        const italicSegment = (b) => segmentOf('Stall Serif')(b) && b.includes('font-style: italic');
        const noDisplay = descriptorProblems(planted(italicSegment, (b) => b.replace(/\s*font-display: swap;/, '')));
        assert.equal(noDisplay.length, 1, noDisplay.join('\n'));
        assert.match(noDisplay[0], /^Stall Serif italic: font-display differs/);
        assert.match(noDisplay[0], /"auto" on inter-latin\.woff2/);
        const block = descriptorProblems(planted(ownLatinOf('JetBrains Mono'), (b) => b.replace('font-display: swap', 'font-display: block')));
        assert.equal(block.length, 1);
        assert.match(block[0], /^JetBrains Mono normal: font-display differs/);
    });

    it('does not read a respelling as a difference, and does not let one hide a difference', () => {
        // Extra space, a keyword, and the other quote mark: the same descriptors.
        assert.deepEqual(descriptorProblems(planted(segmentOf('JetBrains Mono'), (block) => block.replace('font-weight: 100 800', 'font-weight:   100   800').replace("'JetBrains Mono'", '"JetBrains Mono"'))), []);
        assert.deepEqual(descriptorProblems(planted(ownLatinOf('Stall Serif'), (block) => block.replace('font-weight: 400 700', 'font-weight: normal 700'))), []);
        // The footgun in the other quote mark, and in another case, is still the footgun: the group is the family, not its spelling.
        const quoted = planted(segmentOf('JetBrains Mono'), (block) => block.replace('font-weight: 100 800', 'font-weight: 400 700').replace("'JetBrains Mono'", '"jetbrains mono"'));
        assert.equal(descriptorProblems(quoted).length, 1);
    });
});
