import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { themeVarValues } from './look-flash.mjs';
import { declaredFaces, declaredStallFaces } from './probe-faces.mjs';
import { guardSheets, privateRows } from './served-sheets.mjs';
import {
    ROOT,
    appSourceFiles,
    contentStringsOf,
    cpName,
    declaredNotHeld,
    glyphsNotHeld,
    literalsOf,
    printedCodePoints,
    servedFaceSets,
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
 * **What the app prints today that no served face draws** — pinned, each
 * with where it prints. Every one is drawn by a font of the reader's
 * machine, so it differs per OS, and the probe measures this machine's. The
 * owner's call is whether to re-subset the faces for them (a product
 * change) or keep them stated here; until then a glyph leaves this list
 * only when a face gains it, and joins it only with a line saying where it
 * prints.
 */
const PRINTED_NOT_HELD = [
    {
        cp: 0x2248,
        in: ['src/ui/copy.ts'],
        where: 'the unit rate under a listing ("≈ 1,200 XEC/token", `tokenRate`) and the pay sheets\' rate row ("≈ at 1 XEC = $…", `payRateLine`): `[data-role="rate"]`, a money node',
    },
    {
        cp: 0x2192,
        in: ['src/ui/copy.ts', 'src/ui/obsGuide.ts'],
        where: '`DESC_SUB` on the describe sheet, the first-stall checklist\'s "Share your link" step, and `OBS_RECIPE_SOURCE` on the stream sheet',
    },
    {
        cp: 0x25c6,
        in: ['src/ui/broadcast.css', 'GENERATED_TEXT'],
        where: "the ticker's separator between items, and any look's generated text (`GENERATED_TEXT`)",
    },
    { cp: 0x0440, in: ['src/domain/fiat.ts'], where: quoteIn('RUB ("р.")') },
    { cp: 0x20a6, in: ['src/domain/fiat.ts'], where: quoteIn('NGN') },
    { cp: 0x20a9, in: ['src/domain/fiat.ts'], where: quoteIn('KRW') },
    { cp: 0x20aa, in: ['src/domain/fiat.ts'], where: quoteIn('ILS') },
    { cp: 0x20b1, in: ['src/domain/fiat.ts'], where: quoteIn('PHP') },
    { cp: 0x20b9, in: ['src/domain/fiat.ts'], where: quoteIn('INR') },
    { cp: 0x20ba, in: ['src/domain/fiat.ts'], where: quoteIn('TRY') },
    { cp: 0x5143, in: ['src/domain/fiat.ts'], where: quoteIn('CNY') },
];

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
    const printed = printedCodePoints(SERVED);
    const sets = servedFaceSets();

    it('reads the four face sets stall.css declares, from their own files', () => {
        assert.deepEqual(sets.map((set) => set.name), EVERY_FACE);
        for (const set of sets) {
            // A Latin subset and a Vietnamese one each.
            assert.equal(set.faces.length, 2, set.name);
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
            assert.deepEqual(missing.get(exception.cp) ?? [], EVERY_FACE, `${name}: a face holds it now — take it off the list`);
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

    it('goes red on a glyph printed in no face', () => {
        const planted = new Map(printed);
        planted.set(0x2605, new Set(['planted']));
        assert.deepEqual(glyphsNotHeld(planted, sets).get(0x2605), EVERY_FACE);
    });
});
