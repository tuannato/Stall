import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { artNamedBy } from './check-dist-looks.mjs';
import {
    LOOK_FONTS_FILE,
    canonicalOflBody,
    lookFaceProblems,
    lookFontNotices,
    oflBodyOf,
    readReservations,
    reservedFontNames,
    woff2NameRecords,
} from './look-faces.mjs';
import { PLANTED_CLASS, beforeReduce, oflText, plantLooks, removePlants, syntheticWoff2 } from './private-looks-plant.mjs';
import { guardSheets, privateRows, servedSheets } from './served-sheets.mjs';

/**
 * A private look's faces (`scripts/look-faces.mjs`, step 8e1): each named in
 * the look's `fonts.json`, served by its sheet, with the OFL 1.1 text beside
 * it, presenting no name that licence reserves — over every private look a
 * run reads (the tracked fixture always, the selection when one is named),
 * and proved red over in-memory looks and a repository planted from the
 * fixture with a synthetic face. No real font is tracked for this: the face
 * is a WOFF2 holding a name table and nothing else
 * (`scripts/private-looks-plant.mjs`).
 *
 * `node --test`, like the other scripts' tests: a TypeScript test importing
 * these `.mjs` modules breaks `tsc` (TS7016).
 */

after(removePlants);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FACE = 'plant-serif-latin.woff2';
const LICENCE = 'LICENSE-OFL-plant-serif.txt';
const face = (family = 'Plant Serif') =>
    syntheticWoff2([
        { id: 0, text: 'Copyright 2024 The Plant Type Authors' },
        { id: 1, text: family },
        { id: 4, text: `${family} Regular` },
    ]);
const fontsOf = (...fonts) => JSON.stringify({ fonts });
const ENTRY = { name: 'Plant Serif', files: { [FACE]: 'Latin' }, licence: LICENCE };
const goodArt = (licence = oflText('The Plant Type Authors')) => [
    { name: 'ground.svg', bytes: Buffer.from('<svg/>') },
    { name: FACE, bytes: face() },
    { name: LICENCE, bytes: Buffer.from(licence) },
];
/** The problems of the good look with `input`'s parts in place of its own (`fonts: undefined` is a look with no fonts.json). */
const problemsOf = (input = {}) =>
    lookFaceProblems({
        fontsText: 'fonts' in input ? input.fonts : fontsOf(ENTRY),
        art: input.art ?? goodArt(),
        named: input.named ?? new Set([FACE]),
    });

describe('a-private-face-carries-its-licence', () => {
    it('passes every private look a run reads, the tracked fixture among them', async () => {
        const rows = privateRows(await guardSheets());
        assert.ok(rows.some((row) => row.look.source === 'fixture'), 'the fixture is read');
        for (const row of rows) {
            assert.deepEqual(lookFaceProblems({ fontsText: row.look.fontsText, art: row.look.art, named: artNamedBy(row.css) }), [], row.path);
        }
    });

    it('passes a face named once, served, with its OFL text beside it, and a look with no face at all', () => {
        assert.deepEqual(problemsOf(), []);
        assert.deepEqual(lookFaceProblems({ fontsText: undefined, art: [{ name: 'ground.svg', bytes: Buffer.from('<svg/>') }], named: new Set() }), []);
        // Two subsets of one family under one licence, and the notice it makes.
        const two = fontsOf({ ...ENTRY, files: { [FACE]: 'Latin', 'plant-serif-vietnamese.woff2': 'Vietnamese' } });
        const art = [...goodArt(), { name: 'plant-serif-vietnamese.woff2', bytes: face() }];
        assert.deepEqual(problemsOf({ fonts: two, art, named: new Set([FACE, 'plant-serif-vietnamese.woff2']) }), []);
        const [notice] = lookFontNotices({ fontsText: two, art });
        assert.deepEqual(
            { ...notice, licenceText: notice.licenceText.slice(0, 20) },
            { name: 'Plant Serif', files: [FACE, 'plant-serif-vietnamese.woff2'], subsets: 'Latin and Vietnamese subsets', licenceText: 'Copyright 2024 The P' },
        );
    });

    it('refuses a face with no fonts.json, a named face not there, a licence missing, not the OFL, with no holder or not ASCII', () => {
        const cases = [
            [{ fonts: undefined }, /has no fonts\.json/],
            [{ art: goodArt().filter((f) => f.name !== FACE) }, /art\/plant-serif-latin\.woff2 is not there/],
            [{ art: goodArt().filter((f) => f.name !== LICENCE) }, /its licence art\/LICENSE-OFL-plant-serif\.txt is not beside its faces/],
            [{ art: goodArt('Copyright 2024 The Plant Type Authors.\nAll rights reserved.\n') }, /does not state "SIL Open Font License, Version 1\.1"/],
            [{ art: goodArt(oflText('The Plant Type Authors').replace(/^Copyright 2024 /, 'By ')) }, /names no copyright holder/],
            [{ art: goodArt(oflText('The Plant Type Authors ☃')) }, /U\+2603 .*the notices carry it as ASCII/],
        ];
        for (const [input, pattern] of cases) {
            const problems = problemsOf(input);
            assert.ok(problems.some((p) => pattern.test(p)), `${pattern}:\n  ${problems.join('\n  ') || '(no problem)'}`);
        }
    });

    it('refuses a face nobody names, one named twice, one the sheet does not serve, and a licence no face travels with', () => {
        const extraFace = [...goodArt(), { name: 'plant-serif-bold.woff2', bytes: face() }];
        assert.ok(problemsOf({ art: extraFace, named: new Set([FACE, 'plant-serif-bold.woff2']) }).some((p) => /plant-serif-bold\.woff2: a face fonts\.json does not name/.test(p)));
        const twice = fontsOf(ENTRY, { ...ENTRY, name: 'Plant Serif again' });
        assert.ok(problemsOf({ fonts: twice }).some((p) => /is fonts\[0\]'s too/.test(p)));
        assert.ok(problemsOf({ named: new Set() }).some((p) => /a face the sheet names nowhere/.test(p)));
        const stray = [...goodArt(), { name: 'LICENSE-OFL-other.txt', bytes: Buffer.from(oflText('Others')) }];
        assert.ok(problemsOf({ art: stray }).some((p) => /LICENSE-OFL-other\.txt: a licence no entry of fonts\.json travels with/.test(p)));
        // No fonts.json and a licence alone.
        const lone = lookFaceProblems({ fontsText: undefined, art: [{ name: LICENCE, bytes: Buffer.from(oflText('x')) }], named: new Set() });
        assert.ok(lone.some((p) => /a licence no face of the look travels with/.test(p)), lone.join('\n'));
    });

    it('refuses a fonts.json that is not one: not JSON, an unknown field, a bad name, subset, file or licence', () => {
        for (const [fonts, pattern] of [
            ['{', /not JSON/],
            [JSON.stringify({ fonts: [ENTRY], faces: [] }), /an unknown field "faces"/],
            [JSON.stringify({ fonts: [] }), /fonts is not a list naming at least one face/],
            [fontsOf({ ...ENTRY, family: 'x' }), /an unknown field "family"/],
            [fontsOf({ ...ENTRY, name: 'Plant Sérif' }), /is not printable ASCII/],
            [fontsOf({ ...ENTRY, name: ' Plant' }), /is not printable ASCII/],
            [fontsOf({ ...ENTRY, files: {} }), /files is not an object naming at least one face/],
            [fontsOf({ ...ENTRY, files: { 'Plant.woff2': 'Latin' } }), /is not a face's name in art\//],
            [fontsOf({ ...ENTRY, files: { [FACE]: '' } }), /the subset of .* is not printable ASCII/],
            [fontsOf({ ...ENTRY, licence: 'OFL.txt' }), /is not an OFL text's name in art\//],
        ]) {
            const problems = problemsOf({ fonts });
            assert.ok(problems.some((p) => pattern.test(p)), `${fonts}:\n  ${problems.join('\n  ') || '(no problem)'}`);
        }
    });

    it('refuses a face that presents a name its licence reserves, the copyright notice aside, and one it cannot read', () => {
        const reserving = goodArt(oflText('The Plant Type Authors', 'Plant'));
        const problems = problemsOf({ art: reserving });
        assert.ok(problems.some((p) => /name ID 1 presents "Plant", a Reserved Font Name/.test(p)), problems.join('\n'));
        assert.ok(problems.some((p) => /name ID 4 presents "Plant"/.test(p)));
        assert.ok(!problems.some((p) => /name ID 0 /.test(p)), 'the copyright notice keeps the name');
        // Renamed, as Lora's subsets were: green.
        const renamed = reserving.map((file) => (file.name === FACE ? { name: FACE, bytes: face('Leaf Serif') } : file));
        assert.ok(!problemsOf({ art: renamed }).some((p) => /Reserved Font Name/.test(p)));
        // Not a WOFF2.
        const junk = goodArt().map((file) => (file.name === FACE ? { name: FACE, bytes: Buffer.from('not a font at all, just some bytes ...........................') } : file));
        assert.ok(problemsOf({ art: junk }).some((p) => /not a WOFF2 this reader can read/.test(p)));
    });

    it('reads a planted look\'s faces through the served sheets, and goes red on a face without its licence', async () => {
        const fontFace = `@font-face { font-family: ${PLANTED_CLASS}-serif; src: url(./art/${FACE}) format("woff2"); font-display: swap; }`;
        const withFace = (path, text) => (path === 'fixture/sheet.css' ? beforeReduce(text, fontFace) : text);
        const good = plantLooks(withFace, {
            [`fixture/art/${FACE}`]: face(),
            [`fixture/art/${LICENCE}`]: oflText('The Plant Type Authors'),
            [`fixture/${LOOK_FONTS_FILE}`]: fontsOf(ENTRY),
        });
        const bare = plantLooks(withFace, { [`fixture/art/${FACE}`]: face() });
        for (const [repo, red] of [
            [good, false],
            [bare, true],
        ]) {
            const rows = privateRows(await servedSheets({ env: repo.selection, fixture: true, gitEnv: repo.env }));
            const row = rows.find((r) => r.lookClass === PLANTED_CLASS);
            assert.ok(row !== undefined && rows.some((r) => r.look.source === 'fixture'), 'the planted look and the fixture are both read');
            const problems = lookFaceProblems({ fontsText: row.look.fontsText, art: row.look.art, named: artNamedBy(row.css) });
            assert.equal(problems.length > 0, red, problems.join('\n'));
        }
    });
});

/** A synthetic face holding `records` (`[id, text]` pairs). */
const faceOf = (...records) => syntheticWoff2(records.map(([id, text]) => ({ id, text })));
/** The good look with `licence` beside a face of `records`, named `name`. */
const lookWith = ({ records = [[0, 'Copyright 2024 The Plant Type Authors'], [1, 'Plant Serif']], licence = oflText('The Plant Type Authors'), name = 'Plant Serif' } = {}) =>
    lookFaceProblems({
        fontsText: fontsOf({ ...ENTRY, name }),
        art: [
            { name: FACE, bytes: faceOf(...records) },
            { name: LICENCE, bytes: Buffer.from(licence) },
        ],
        named: new Set([FACE]),
    });
/** An OFL text whose header reserves as `reservation` says (the words after the holder), the body whole. */
const reserving = (reservation) => oflText('The Plant Type Authors').replace('Copyright 2024 The Plant Type Authors.', `Copyright 2024 The Plant Type Authors, ${reservation}`);

describe('a-reserved-font-name-is-read-in-any-quoting', () => {
    /**
     * The 8e1 critic's item 1: a reservation was read only in straight double
     * quotes right after the phrase, so curly quotes (which the notices
     * themselves fold to straight ones), Adobe's single quotes, a line break
     * inside the phrase, a colon and an unquoted name each read as no
     * reservation at all. The text is folded first; a phrase no name can be
     * read from fails closed.
     */
    it('reads every quoting, a line break, a colon, a list and one unquoted name', () => {
        for (const [text, names] of [
            ['with Reserved Font Name “Lora”.', ['Lora']],
            ["with Reserved Font Name 'Source'.", ['Source']],
            ['with Reserved Font Name ‘Source’.', ['Source']],
            ['with Reserved\nFont   Name "Lora".', ['Lora']],
            ['with Reserved Font Name: "Lora".', ['Lora']],
            ['with Reserved Font Name Lora.', ['Lora']],
            ['with Reserved Font Names "Alpha", “Beta” and \'Gamma\'.', ['Alpha', 'Beta', 'Gamma']],
        ]) {
            assert.deepEqual(readReservations(text), { names, unreadable: [] }, text);
        }
    });

    it('reads no reservation in the licence\'s own words, and fails closed on a phrase it cannot read', () => {
        assert.deepEqual(readReservations('"Reserved Font Name" refers to any names specified as such').names, []);
        assert.deepEqual(readReservations('may use the Reserved Font Name(s) unless explicit written permission'), { names: [], unreadable: [] });
        for (const text of ['with Reserved Font Name.', 'with Reserved Font Names Alpha and Beta.', 'with Reserved Font Name "Lora\'.']) {
            assert.equal(readReservations(text).unreadable.length, 1, text);
        }
    });

    it('holds a face that presents a name its licence reserves in any of those forms, and refuses one it cannot read', () => {
        for (const reservation of [
            'with Reserved Font Name “Plant”.',
            "with Reserved Font Name 'Plant'.",
            'with Reserved\nFont Name "Plant".',
            'with Reserved Font Name: "Plant".',
            'with Reserved Font Name Plant.',
        ]) {
            const problems = lookWith({ licence: reserving(reservation) });
            assert.ok(problems.some((p) => /name ID 1 presents "Plant", a Reserved Font Name of art\/LICENSE-OFL-plant-serif\.txt/.test(p)), `${reservation}\n  ${problems.join('\n  ')}`);
        }
        const unreadable = lookWith({ licence: reserving('with Reserved Font Names Plant and Leaf.') });
        assert.ok(unreadable.some((p) => /a reservation this reader cannot read/.test(p)), unreadable.join('\n'));
    });
});

describe('a-face-that-reserves-its-own-name-is-held-whatever-licence-sits-beside-it', () => {
    it('reads the reservation in the face\'s own copyright notice, beside a licence that reserves nothing', () => {
        const problems = lookWith({
            records: [
                [0, 'Copyright 2024 The Plant Type Authors, with Reserved Font Name "Plant".'],
                [1, 'Plant Serif'],
            ],
        });
        assert.ok(problems.some((p) => /name ID 1 presents "Plant", a Reserved Font Name of its own copyright notice/.test(p)), problems.join('\n'));
    });

    it('passes the tracked faces with their own licences: Stall Serif keeps "Lora" in its copyright notice, as condition 2 asks', () => {
        const fonts = join(ROOT, 'src', 'ui', 'fonts');
        for (const [name, file, licence] of [
            ['Stall Serif', 'stall-serif-latin.woff2', 'LICENSE-OFL-stall-serif.txt'],
            ['Inter', 'inter-latin.woff2', 'LICENSE-OFL.txt'],
            ['JetBrains Mono', 'jetbrains-mono-latin.woff2', 'LICENSE-OFL-jetbrains-mono.txt'],
        ]) {
            const problems = lookFaceProblems({
                fontsText: fontsOf({ name, files: { [file]: 'Latin' }, licence }),
                art: [
                    { name: file, bytes: readFileSync(join(fonts, file)) },
                    { name: licence, bytes: readFileSync(join(fonts, licence)) },
                ],
                named: new Set([file]),
            });
            assert.deepEqual(problems, [], name);
        }
        // Stall Serif's licence and face both reserve Lora, read either way.
        assert.deepEqual(reservedFontNames(readFileSync(join(fonts, 'LICENSE-OFL-stall-serif.txt'), 'utf8')), ['Lora']);
        const records = woff2NameRecords(readFileSync(join(fonts, 'stall-serif-latin.woff2')));
        assert.deepEqual(readReservations(records.find((r) => r.id === 0).text).names, ['Lora']);
    });
});

describe('a-licence-that-only-names-the-ofl-is-refused', () => {
    it('refuses two lines that name the OFL, and a header with no body; takes the body whole in either spelling', () => {
        const mention = 'Copyright 2024 The Plant Type Authors.\nThis Font Software is licensed under the SIL Open Font License, Version 1.1.\n';
        const header = oflText('The Plant Type Authors').slice(0, oflText('The Plant Type Authors').indexOf('SIL OPEN FONT LICENSE'));
        for (const licence of [mention, header]) {
            assert.ok(lookWith({ licence }).some((p) => /does not carry the OFL 1\.1 whole/.test(p)), licence.slice(0, 40));
        }
        // A sentence added to the body, or one taken out: not the licence.
        const whole = oflText('The Plant Type Authors');
        assert.ok(lookWith({ licence: `${whole}\nAnd one more condition.\n` }).some((p) => /does not carry the OFL 1\.1 whole/.test(p)));
        assert.ok(lookWith({ licence: whole.replace(/\n4\) The name\(s\)[\s\S]*?\n\n/, '\n\n') }).some((p) => /does not carry the OFL 1\.1 whole/.test(p)));
        // Whole, with CRLF, "&" for "AND" and curly quotes: the same licence.
        assert.deepEqual(lookWith({ licence: whole }), []);
        const spelled = whole.replace(/\n/g, '\r\n').replace('PERMISSION AND CONDITIONS', 'PERMISSION & CONDITIONS');
        assert.equal(oflBodyOf(spelled), canonicalOflBody());
        assert.deepEqual(lookWith({ licence: spelled }), []);
    });
});

describe('a-notice-names-the-face-it-serves', () => {
    it('ties fonts.json\'s name to the face\'s family, and the face\'s holder to the licence\'s', () => {
        assert.ok(lookWith({ name: 'Totally Different Font' }).some((p) => /names "Totally Different Font", and art\/plant-serif-latin\.woff2 presents the family "Plant Serif"/.test(p)));
        assert.ok(
            lookWith({ licence: oflText('Some Other Foundry') }).some((p) => /its copyright notice names "the plant type authors", whom art\/LICENSE-OFL-plant-serif\.txt does not/.test(p)),
        );
        assert.ok(lookWith({ records: [[1, 'Plant Serif']] }).some((p) => /carries no copyright notice \(name ID 0\)/.test(p)));
        // The typographic family (ID 16) is the family, before a weight's own (ID 1).
        assert.deepEqual(
            lookWith({ records: [[0, 'Copyright 2024 The Plant Type Authors'], [1, 'Plant Serif Light'], [16, 'Plant Serif']] }),
            [],
        );
    });
});

describe('reserved-font-names-are-read-from-the-copyright-statement', () => {
    it('reads Lora from Stall Serif\'s licence, none from the others, and not the licence\'s own definition', () => {
        const fonts = join(ROOT, 'src', 'ui', 'fonts');
        assert.deepEqual(reservedFontNames(readFileSync(join(fonts, 'LICENSE-OFL-stall-serif.txt'), 'utf8')), ['Lora']);
        assert.deepEqual(reservedFontNames(readFileSync(join(fonts, 'LICENSE-OFL.txt'), 'utf8')), []);
        assert.deepEqual(reservedFontNames(readFileSync(join(fonts, 'LICENSE-OFL-jetbrains-mono.txt'), 'utf8')), []);
        assert.deepEqual(reservedFontNames('"Reserved Font Name" refers to any names specified as such'), []);
        assert.deepEqual(reservedFontNames('Copyright 2020 X, with Reserved Font Names "Alpha", "Beta" and "Gamma".'), ['Alpha', 'Beta', 'Gamma']);
    });
});

describe('the-woff2-reader-reads-a-name-table', () => {
    it('reads the synthetic face back, a tracked face, and refuses what is not one', () => {
        assert.deepEqual(
            woff2NameRecords(face()).map((r) => [r.id, r.text]),
            [
                [0, 'Copyright 2024 The Plant Type Authors'],
                [1, 'Plant Serif'],
                [4, 'Plant Serif Regular'],
            ],
        );
        const tracked = woff2NameRecords(readFileSync(join(ROOT, 'src', 'ui', 'fonts', 'stall-serif-latin.woff2')));
        assert.ok(tracked.some((r) => r.id === 1 && r.text === 'Stall Serif'));
        assert.throws(() => woff2NameRecords(Buffer.from('wOFFnot-a-woff2')), /not a WOFF2/);
    });
});
