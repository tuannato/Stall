import { strict as assert } from 'node:assert';
import { after, before, describe, it } from 'node:test';
import { BRAND_ROWS, SEAL_SUBJECTS, sealPlacementProblems, sealProblems, sealSubjectProblem, servedBytes, sha256, sheetTargets } from './look-seals.mjs';
import { selectionFromEnv } from './looks-selection.mjs';
import { PLANTED_CLASS, beforeReduce, plantLooks, removePlants } from './private-looks-plant.mjs';
import { LOOK_SEALS, PRIVATE_LOOK_CLASS } from './private-looks.mjs';
import { guardSheets, privateRows, servedSheets } from './served-sheets.mjs';

/**
 * A private look's seal, pinned by hash, and where it may paint (step 8g6;
 * STEP-8G-PLAN §4.3; `scripts/look-seals.mjs` says what each reader holds).
 * The seal itself is in no file of this repository: the red proofs plant a
 * look under the pinned class from the tracked fixture, with a stand-in
 * seal made here from public bytes, and pin that stand-in where a proof
 * needs a pin it can match.
 */

/** The class `LOOK_SEALS` pins, which a planted look takes in place of the fixture's. */
const SEALED = 't-inkwash';

/** Two stand-in seals, public bytes: never the private look's. */
const STAND_IN = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 58"><rect width="40" height="58"/></svg>');
const OTHER = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 58"><rect x="4" y="4" width="32" height="50"/></svg>');
/** The stand-in as a source file would hold it: the same element, other whitespace, so the same served bytes. */
const STAND_IN_SPACED = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 58">\n  <rect width="40" height="58"/>\n</svg>\n');

/** A pin of the stand-in under the sealed class: what a proof that must match a pin reads in place of `LOOK_SEALS`. */
const STAND_IN_SEALS = Object.freeze({ [SEALED]: Object.freeze({ file: 'seal.svg', sha256: sha256(servedBytes('seal.svg', STAND_IN)) }) });

/** The rules a sealed look paints its seal with: the page's sign, the wall's sign, the overlay's head plate. */
const ON_THE_SIGN = [
    `.${SEALED}:not(.shop-window) .stall-head::after { -webkit-mask-image: url(./art/seal.svg); mask-image: url(./art/seal.svg); }`,
    `.stall.${SEALED}.shop-window .stall-head::after { mask-image: url(./art/seal.svg); }`,
    `.stall.${SEALED}.broadcast .bc-head::after { mask-image: url(./art/seal.svg); }`,
].join('\n');

/**
 * The fixture planted under the sealed class, with `rules` before its
 * reduce block and `art` (`{ name: bytes }`) beside its own, read through
 * the merged list beside the tracked fixture.
 */
async function sealedRows(rules = '', art = {}) {
    const add = Object.fromEntries(Object.entries(art).map(([name, bytes]) => [`fixture/art/${name}`, bytes]));
    const repo = plantLooks((path, text) => {
        const renamed = text.replaceAll(PLANTED_CLASS, SEALED);
        return path === 'fixture/sheet.css' && rules !== '' ? beforeReduce(renamed, rules) : renamed;
    }, add);
    const sheets = await servedSheets({ env: repo.selection, fixture: true, gitEnv: repo.env });
    const rows = privateRows(sheets);
    assert.ok(rows.some((r) => r.lookClass === SEALED) && rows.some((r) => r.look.source === 'fixture'), 'the planted look and the fixture are both read');
    return sheets;
}

after(removePlants);

describe('the-seal-is-the-pinned-seal', () => {
    let guard;
    let carried;
    let unsealed;
    let rewritten;
    before(async () => {
        guard = await guardSheets();
        carried = await sealedRows(ON_THE_SIGN, { 'seal.svg': OTHER });
        unsealed = await sealedRows();
        rewritten = await sealedRows(ON_THE_SIGN, { 'seal.svg': STAND_IN_SPACED });
    });

    it('pins the seals by value, keyed by class', () => {
        assert.deepEqual(LOOK_SEALS, { 't-inkwash': { file: 'seal.svg', sha256: 'f6304c7adf9df768c4f36aea6bfd3f1e8316479696565b7d29a7ac6412c9a379' } });
        for (const [cls, seal] of Object.entries(LOOK_SEALS)) {
            assert.match(cls, PRIVATE_LOOK_CLASS, `${cls} is a private look's class`);
            assert.match(seal.file, /^[a-z0-9-]{1,64}\.svg$/, 'the seal is one SVG of its look’s art');
            assert.match(seal.sha256, /^[0-9a-f]{64}$/);
        }
    });

    it('holds every private look this run reads under a pinned class to its seal, and says which it did not read', () => {
        const { problems, unread } = sealProblems(guard);
        assert.deepEqual(problems, []);
        for (const cls of unread) {
            process.stderr.write(`the-seal-is-the-pinned-seal: ${cls} was not read on this run (no selection carries it), so its seal is not checked\n`);
        }
        if (selectionFromEnv(process.env) === undefined) {
            assert.deepEqual(unread, Object.keys(LOOK_SEALS), 'with no selection, every pinned class is said to be unread');
        }
    });

    it('fails a planted look under the pinned class whose seal is another file', () => {
        const { problems, read } = sealProblems(carried);
        assert.deepEqual(read, [SEALED]);
        assert.equal(problems.length, 1, problems.join('\n'));
        assert.match(problems[0], /seal\.svg: its served bytes hash to [0-9a-f]{64}, and LOOK_SEALS pins f6304c7a/);
    });

    it('fails a planted look under the pinned class that carries no seal', () => {
        const { problems } = sealProblems(unsealed);
        assert.equal(problems.length, 1, problems.join('\n'));
        assert.match(problems[0], /^t-inkwash \(selection @[0-9a-f]{12}\) carries no art\/seal\.svg, and LOOK_SEALS pins one$/);
    });

    it('passes a planted seal against a pin of its own served bytes, whatever its source whitespace', () => {
        assert.deepEqual(sealProblems(rewritten, STAND_IN_SEALS), { problems: [], read: [SEALED], unread: [] });
        assert.notEqual(sha256(STAND_IN_SPACED), STAND_IN_SEALS[SEALED].sha256, 'the source bytes differ from the served ones');
        assert.equal(sealProblems(carried, STAND_IN_SEALS).problems.length, 1, 'another file is still refused under that pin');
    });
});

describe('the-seal-paints-only-under-its-own-look', () => {
    let guard;
    let sealed;
    let offTheSign;
    let secondName;
    let besideBrand;
    before(async () => {
        guard = await guardSheets();
        sealed = await sealedRows(ON_THE_SIGN, { 'seal.svg': STAND_IN });
        offTheSign = await sealedRows(
            [
                `.${SEALED}.att-planted-trim .stall-head::after { mask-image: url(./art/seal.svg); }`,
                `.${SEALED} .stall-name { background-image: url(./art/seal.svg); }`,
                `.${SEALED} .stall-sign::after { --iw-seal: url(./art/seal.svg); }`,
                `@keyframes iw-planted { to { mask-image: url(./art/seal.svg); } }`,
                `.${SEALED} .stall-head:not(.att-planted-crest)::before { mask-image: url(./art/seal.svg); }`,
            ].join('\n'),
            { 'seal.svg': STAND_IN },
        );
        besideBrand = await sealedRows(
            [
                `.stall.${SEALED}.broadcast .bc-head .bc-brand::after { mask-image: url(./art/seal.svg); }`,
                `.stall.${SEALED}.broadcast .tk-lab .tk-brand::before { mask-image: url(./art/seal.svg); }`,
            ].join('\n'),
            { 'seal.svg': STAND_IN },
        );
        secondName = await sealedRows(`.${SEALED} .item::after { mask-image: url(./art/stamp.svg); }`, { 'seal.svg': STAND_IN, 'stamp.svg': STAND_IN });
    });

    it('pins the sign’s subjects by value', () => {
        assert.deepEqual(
            SEAL_SUBJECTS.map((s) => s.cls),
            ['stall-head', 'stall-sign', 'stall-headings', 'bc-head', 'tk-lab'],
        );
        assert.equal(sealSubjectProblem('.t-inkwash .stall-head::after'), undefined);
        assert.equal(sealSubjectProblem('.t-inkwash .stall-headings:before'), undefined);
        assert.equal(sealSubjectProblem('.stall.t-inkwash.broadcast .tk-lab::after'), undefined);
        assert.deepEqual(BRAND_ROWS, ['bc-brand', 'tk-brand']);
        assert.equal(sealSubjectProblem('.t-inkwash .stall-he\\61 d::after'), undefined, 'escapes are read decoded');
        assert.match(sealSubjectProblem('.t-inkwash .stall-head'), /no ::before or ::after/);
        assert.match(sealSubjectProblem('.t-inkwash .stall-head .stall-name::after'), /does not have the sign as its subject/);
        assert.match(sealSubjectProblem('.t-inkwash :is(.stall-head)::after'), /does not have the sign as its subject/, 'a class inside :is() is not the subject');
        assert.match(sealSubjectProblem('.t-inkwash .stall-head::after:hover'), /no ::before or ::after/);
    });

    it('finds the sheets this run serves clean', () => {
        const { problems, uses } = sealPlacementProblems(guard);
        assert.deepEqual(problems, []);
        if (privateRows(guard).some((r) => Object.hasOwn(LOOK_SEALS, r.lookClass))) {
            assert.ok(uses > 0, 'a sealed look the run reads paints its seal somewhere the scan saw');
        }
    });

    it('admits the seal on the page’s sign, the wall’s and the overlay’s head plate', () => {
        assert.deepEqual(sealPlacementProblems(sealed, { seals: STAND_IN_SEALS }), { problems: [], uses: 4 });
    });

    it('refuses it on a decoration, on a line, in a custom property and in a keyframe', () => {
        const { problems } = sealPlacementProblems(offTheSign, { seals: STAND_IN_SEALS });
        assert.equal(problems.length, 5, problems.join('\n'));
        assert.equal(problems.filter((p) => /names a decoration's class/.test(p)).length, 2, problems.join('\n'));
        assert.ok(problems.some((p) => /\.stall-name" has no ::before or ::after/.test(p)));
        assert.ok(problems.some((p) => /custom property --iw-seal/.test(p)));
        assert.ok(problems.some((p) => /inside @keyframes/.test(p)));
    });

    it('refuses it beside Stall’s brand word, where it would read as Stall’s own stamp', () => {
        const { problems } = sealPlacementProblems(besideBrand, { seals: STAND_IN_SEALS });
        assert.equal(problems.length, 2, problems.join('\n'));
        assert.ok(problems.some((p) => /\.bc-head \.bc-brand::after" puts the seal on \.bc-brand, beside Stall's brand word, where a look's seal would read as Stall's own stamp/.test(p)), problems.join('\n'));
        assert.ok(problems.some((p) => /puts the seal on \.tk-brand, beside Stall's brand word/.test(p)), problems.join('\n'));
        assert.match(sealSubjectProblem('.t-inkwash .bc-head.bc-brand::after'), /would read as Stall's own stamp/, 'even where the subject also names the plate');
    });

    it('refuses the seal under a second name, read by its bytes', () => {
        const { problems } = sealPlacementProblems(secondName, { seals: STAND_IN_SEALS });
        assert.equal(problems.length, 1, problems.join('\n'));
        assert.match(problems[0], /url\(\.\/art\/stamp\.svg\): .*\.item::after" does not have the sign as its subject/);
    });

    it('refuses it in a shipped sheet', () => {
        const planted = guard.map((sheet) =>
            sheet.path === 'src/ui/theme-modern.css' ? { ...sheet, css: `${sheet.css}\n.t-modern .stall-head::after { mask-image: url(./decor/planted-seal.svg); }\n` } : sheet,
        );
        assert.ok(planted.some((sheet) => sheet.css.includes('planted-seal.svg')), 'the shipped sheet is in the list');
        const readPublic = (sheetPath, target) => (target === './decor/planted-seal.svg' ? { name: 'planted-seal.svg', bytes: STAND_IN_SPACED } : undefined);
        const { problems } = sealPlacementProblems(planted, { seals: STAND_IN_SEALS, readPublic });
        assert.deepEqual(problems, ["src/ui/theme-modern.css: url(./decor/planted-seal.svg) names t-inkwash's seal, which only t-inkwash's own sheet may paint"]);
    });

    it('refuses a copy in the tracked fixture, named or only held', () => {
        const fixture = (sheets, rule) =>
            sheets.map((sheet) =>
                sheet.role === 'private' && sheet.look.source === 'fixture'
                    ? { ...sheet, css: `${sheet.css}\n${rule}\n`, look: { ...sheet.look, art: [...sheet.look.art, { name: 'copy.svg', bytes: STAND_IN }] } }
                    : sheet,
            );
        const named = sealPlacementProblems(fixture(guard, '.t-fixture-private .stall-head::after { mask-image: url(./art/copy.svg); }'), { seals: STAND_IN_SEALS });
        assert.equal(named.problems.length, 2, named.problems.join('\n'));
        assert.ok(named.problems.some((p) => /url\(\.\/art\/copy\.svg\) names t-inkwash's seal/.test(p)));
        assert.ok(named.problems.some((p) => /copy\.svg is t-inkwash's seal, held by t-fixture-private/.test(p)));
        const held = sealPlacementProblems(fixture(guard, ''), { seals: STAND_IN_SEALS });
        assert.equal(held.problems.length, 1, held.problems.join('\n'));
    });

    it('reads every target: inside @media and @container, an image-set entry, and an at-rule’s', () => {
        const targets = sheetTargets(
            `@media (min-width: 680px) { .a .stall-head::after { mask: image-set("./art/x.svg" 1x); } }\n@container sw (orientation: portrait) { .a .bc-head::after { mask-image: url(./art/y.svg); } }\n@font-face { font-family: x; src: url(./art/f.woff2); }`,
        );
        assert.deepEqual(
            targets.map((t) => [t.value, t.selectors, t.at]),
            [
                ['./art/x.svg', ['.a .stall-head::after'], undefined],
                ['./art/y.svg', ['.a .bc-head::after'], undefined],
                ['./art/f.woff2', [], '@font-face'],
            ],
        );
    });
});
