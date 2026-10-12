import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { before, describe, it } from 'node:test';
import { themeVarValues } from './look-flash.mjs';
import { declaredFaces, declaredStallFaces } from './probe-faces.mjs';
import { guardSheets, privateRows } from './served-sheets.mjs';
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
