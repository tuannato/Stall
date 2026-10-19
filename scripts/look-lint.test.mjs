import { strict as assert } from 'node:assert';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { flashSheets, servedFlashReport, themeVarValues } from './look-flash.mjs';
import { PLANTED_CLASS, beforeReduce, canaryFiles, plantLooks, removePlants } from './private-looks-plant.mjs';
import { FIXTURE_PRIVATE_LOOK_CLASS } from './private-looks.mjs';
import { guardSheets, lookRows, privateRows, servedSheets } from './served-sheets.mjs';
import { appSheets, lookSheets, sheetsWithRole, wornSheets } from './sheet-roles.mjs';
import {
    FACE_DISPLAY,
    GENERATED_TEXT,
    LOOK_HOOK_ATTRIBUTES,
    LOOK_MEDIA,
    MASK_COMPOSITE_LEGACY,
    MAX_FLASHES_PER_SECOND,
    STATE_ATTRIBUTES,
    decodeEscapes,
    flashReport,
    keyframeFlashes,
    lintLookSheet,
    lintSheet,
    masksWithAFile,
    sheetMasksWithAFile,
    PRESENCE_ATTRIBUTES,
    SERVED_FAMILIES,
    STICKY_BOXES,
    parseSheet,
    foreignNamingProblems,
    rescopeSheet,
    wornSheetProblems,
} from './workshop-css.mjs';

/**
 * The rules every look sheet obeys — the shipped ones under their own class,
 * the kit's under `.t-workshop` — over the REAL shipped sheets, each rule
 * proved red by a plant on a copy of one (build step 4a; the step-4
 * critic's items 7, 8, 9 and 12, 2026-09-24).
 *
 * `node --test` rather than vitest, like `workshop-lint.test.mjs` beside it:
 * a TypeScript test importing these `.mjs` modules breaks `tsc` (TS7016).
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOOKS = sheetsWithRole('look');
/**
 * Every sheet a run serves (`scripts/served-sheets.mjs`): the role table's,
 * and every private look's the run reads — the tracked fixture always, the
 * selection when the environment names one — so each rule over every sheet
 * below reads a private look's sheet too (step 8e1).
 */
const SERVED = await guardSheets();
const PRIVATE = privateRows(SERVED);
after(removePlants);
const read = (path) => readFileSync(join(ROOT, path), 'utf8');

const NEO = LOOKS.find((sheet) => sheet.lookClass === 't-neo');
const NEO_CSS = read(NEO.path);
const REDUCE_AT = NEO_CSS.lastIndexOf('@media (prefers-reduced-motion: reduce)');

/** A copy of theme-neo.css with `rule` planted before its reduce block, as `.t-neo` wrote it. */
const plantedNeo = (rule) => `${NEO_CSS.slice(0, REDUCE_AT)}${rule}\n\n${NEO_CSS.slice(REDUCE_AT)}`;

/** The same plant in the Neo starter — the shipped sheet re-scoped for the kit, as `workshop:start neo` writes it. */
const carried = readdirSync(join(ROOT, 'src/ui'))
    .filter((name) => name.endsWith('.css') && !name.startsWith('theme-'))
    .map((name) => ({ from: `src/ui/${name}`, css: read(`src/ui/${name}`) }));
const plantedKit = (rule) => rescopeSheet(plantedNeo(rule), 'neo', carried);

/**
 * Lint the plant both ways and return the problems the plant added to each
 * — the shipped sheet and its starter are green, so every problem is the
 * plant's — asserting both saw it: a rule the looks obey is a rule the kit
 * obeys.
 */
function plant(rule, pattern) {
    const shipped = lintLookSheet(plantedNeo(rule), { lookClass: 't-neo' });
    const kit = lintSheet(plantedKit(rule));
    assert.ok(shipped.some((p) => pattern.test(p)), `shipped, ${rule}:\n  ${shipped.join('\n  ') || '(no problem)'}`);
    assert.ok(kit.some((p) => pattern.test(p)), `kit, ${rule}:\n  ${kit.join('\n  ') || '(no problem)'}`);
    return shipped;
}

/** A rule the lint must accept: the plant adds no problem to the shipped sheet. */
function accepts(rule) {
    const shipped = lintLookSheet(plantedNeo(rule), { lookClass: 't-neo' });
    assert.deepEqual(shipped, [], rule);
}

describe('the-shipped-look-sheets-pass-the-look-rules', () => {
    it('reads every shipped look sheet, and each passes under its own class', () => {
        assert.deepEqual(LOOKS.map((s) => s.lookClass).sort(), ['t-modern', 't-neo', 't-rural']);
        for (const sheet of LOOKS) {
            assert.deepEqual(lintLookSheet(read(sheet.path), { lookClass: sheet.lookClass }), [], sheet.path);
        }
    });

    it('reads a look sheet under its own class and no other', () => {
        const problems = lintLookSheet(read(NEO.path), { lookClass: 't-rural' });
        assert.ok(problems.some((p) => /is not under \.t-rural/.test(p)), problems.join('\n'));
    });
});

describe('a-mood-class-rule-is-read-under-its-look', () => {
    /**
     * D11 (step 5c): a mood may name one class, which lands on the stall
     * root beside the look's own. Its rules live in the look's sheet, so the
     * look rules read them like every other: compounded with the look's
     * class they pass, and a selector that reaches the class outside the
     * look is refused — the sheet's half of "look-scoped" (the decor gate's
     * `a-mood-class-is-look-scoped` reads every served sheet for the same).
     */
    it('accepts a mood class compounded with the look, in the sheet and the starter', () => {
        const rule = '.t-neo.att-harness-dusk .item-n { letter-spacing: 0.02em; }';
        accepts(rule);
        assert.deepEqual(lintSheet(plantedKit(rule)), []);
    });

    it('refuses one read outside the look', () => {
        plant('.stall.att-harness-dusk .item-n { letter-spacing: 0.02em; }', /is not under \.t-(neo|workshop)/);
    });
});

describe('a-look-cannot-target-one-seller', () => {
    /**
     * G3. A value selector is how one look paints one stall differently:
     * `[aria-label*="qpjq…"]` is the copy control of exactly one seller's
     * address, `[data-focus-key="pin:…"]` their pin, `[href$=…]` their
     * link. Only exact values of the state attributes the app writes pass.
     */
    it('refuses every partial match, a seller-carrying attribute, and anything off the lists', () => {
        for (const [rule, pattern] of [
            ['.t-neo [aria-label*="qpjq"] { color: transparent; }', /partial match \(\*=\)/],
            ['.t-neo [data-role^="pri"] { color: transparent; }', /partial match \(\^=\)/],
            ['.t-neo [data-role$="ice"] { color: transparent; }', /partial match \(\$=\)/],
            ['.t-neo [data-role~="price"] { color: transparent; }', /partial match \(~=\)/],
            ['.t-neo [data-role|="price"] { color: transparent; }', /partial match \(\|=\)/],
            ['.t-neo [aria-label="Copy the address"] { color: transparent; }', /aria-label carries a seller/],
            ['.t-neo a[href="/s/qpjq"] { display: none; }', /href carries a seller/],
            ['.t-neo [data-focus-key="pin:qpjq"] { display: none; }', /data-focus-key carries a seller/],
            ['.t-neo [data-token-id] { display: none; }', /data-token-id carries a seller/],
            ['.t-neo img[src] { display: none; }', /src carries a seller/],
            ['.t-neo .item:has([title]) { display: none; }', /title carries a seller/],
            ['.t-neo [data-pay-uri] { display: none; }', /data-pay-uri carries a seller/],
            ['.t-neo [data-mq-key], .t-neo [data-tk-key] { display: none; }', /data-mq-key carries a seller/],
            ['.t-neo [alt="Fittings"] { display: none; }', /alt carries a seller/],
            ['.t-neo [data-bit="3"] { display: none; }', /data-bit is not one of the state attributes/],
            ['.t-neo [data-price-tier="4"] { color: red; }', /"4" is not a value of data-price-tier/],
            ['.t-neo [data-role="price" i] { color: red; }', /no "i" flag/],
            ['.t-neo [open="open"] { color: red; }', /open is matched by its presence alone/],
            ['.t-neo [svg|href] { color: red; }', /does not read \(a namespace/],
            ['@container style(--x: 1) { .t-neo .item { color: red; } }', /@container .*style\(\)/],
        ]) {
            plant(rule, pattern);
        }
    });

    it('accepts the state attributes the shipped sheets match, exactly', () => {
        accepts('.t-neo .item-p[data-price-tier="1"] { color: red; }');
        accepts(".t-neo .tab[aria-current='page'] { color: red; }");
        accepts('.t-neo details[open] > summary { color: red; }');
        accepts('.t-neo [data-role] { color: red; }');
        accepts('.t-neo .item:not([aria-pressed="true"]) { color: red; }');
        // An escape inside the string is decoded before it is compared.
        accepts('.t-neo [data-role="pr\\69 ce"] { color: red; }');
        assert.equal(decodeEscapes('pr\\69 ce'), 'price');
    });

    it('was built from the served sheets: every value a look matches is listed, and nothing listed is unused', () => {
        // The inventory the lists were built from, re-read (the step-4
        // critic's item 7). Two inclusions rather than an equality: a base
        // sheet matching a new attribute does not by that put it within a
        // look's reach.
        const inventory = (sheets) => {
            const valued = new Map();
            const bare = new Set();
            const visit = (list) => {
                for (const node of list) {
                    if (node.kind === 'rule') {
                        for (const m of node.prelude.matchAll(/\[([\w-]+)(?:=(['"]?)([^'"\]]*)\2)?\]/g)) {
                            if (m[3] === undefined) {
                                bare.add(m[1]);
                            } else {
                                const values = valued.get(m[1]) ?? new Set();
                                values.add(m[3]);
                                valued.set(m[1], values);
                            }
                        }
                    } else if (node.children !== undefined) visit(node.children);
                }
            };
            for (const { css } of sheets) visit(parseSheet(css).nodes);
            return { valued, bare };
        };
        const app = inventory(appSheets().map((s) => ({ css: read(s.path) })));
        const looks = inventory(LOOKS.map((s) => ({ css: read(s.path) })));
        assert.ok(looks.valued.size > 0 && app.valued.size > looks.valued.size, 'both inventories read');
        for (const [name, values] of looks.valued) {
            for (const value of values) {
                assert.ok(STATE_ATTRIBUTES[name]?.includes(value), `a look matches [${name}="${value}"]`);
            }
        }
        for (const [name, values] of Object.entries(STATE_ATTRIBUTES)) {
            for (const value of values) {
                if (LOOK_HOOK_ATTRIBUTES[name]?.includes(value)) continue;
                assert.ok(app.valued.get(name)?.has(value), `listed, and matched by no served sheet: [${name}="${value}"]`);
            }
        }
        // The hook attributes (step 8f1) are the app's state for a look to
        // read, matched by no base sheet: each is held to the module that
        // writes it — the name ladder's rungs to its `NAME_TIER_MAX`, the
        // script to `scriptOf`'s one answer — and each is in the lists.
        const hooks = read('src/ui/lookHooks.ts');
        const max = Number(/export const NAME_TIER_MAX = (\d+);/.exec(hooks)?.[1]);
        assert.ok(hooks.includes("'data-name-tier'") && max > 0, 'lookHooks.ts writes data-name-tier up to NAME_TIER_MAX');
        assert.deepEqual(LOOK_HOOK_ATTRIBUTES['data-name-tier'], Array.from({ length: max }, (_, i) => String(i + 1)));
        assert.ok(read('src/ui/render.ts').includes("setAttribute('data-script', 'cjk')"), 'render.ts writes data-script');
        assert.match(read('src/domain/text.ts'), /export function scriptOf\(text: string\): 'cjk' \| undefined/);
        assert.deepEqual(LOOK_HOOK_ATTRIBUTES['data-script'], ['cjk']);
        // The narrow row dress (D-2026-10-13-04) is held to what writes it: a
        // look row's `narrowTag`, whose one value render.ts writes on the root
        // (and nothing else writes it: `the-narrow-tag-has-one-writer`, a parsed
        // census of every naming of it in code, round 4).
        assert.match(read('src/domain/theme.ts'), /narrowTag\?: 'own-row';/);
        assert.ok(read('src/ui/render.ts').includes("node.setAttribute('data-narrow-tag', 'own-row')"), 'render.ts writes data-narrow-tag');
        assert.deepEqual(STATE_ATTRIBUTES['data-narrow-tag'], ['own-row']);
        // The Cycle card's steps (2026-10-13), held to the table that writes
        // them: one value per step past 0, as many as window.ts has ceilings.
        const ceilings = /export const WALL_FIGURE_CEILINGS = \[([^\]]*)\] as const;/.exec(read('src/ui/window.ts'));
        assert.ok(ceilings !== null && read('src/ui/window.ts').includes("head.setAttribute('data-wall-tier', String(tier))"), 'window.ts writes data-wall-tier');
        assert.deepEqual(STATE_ATTRIBUTES['data-wall-tier'], Array.from({ length: ceilings[1].split(',').length }, (_, i) => String(i + 1)));
        for (const [name, values] of Object.entries(LOOK_HOOK_ATTRIBUTES)) {
            assert.deepEqual(STATE_ATTRIBUTES[name], values, `${name} is a state attribute`);
            assert.ok(!app.valued.has(name), `${name} is read by a served sheet now: list it as an ordinary state attribute`);
        }
        for (const name of PRESENCE_ATTRIBUTES) {
            assert.ok(app.bare.has(name) && !app.valued.has(name), `listed as presence-only: ${name}`);
        }
    });
});

describe('a-look-may-make-only-its-sign-sticky', () => {
    /**
     * Step 8f1 (the step-8 critic's item 20): the one sticky box a look
     * sheet may hold is the sign's own, written as a shape any look may use
     * (`STICKY_BOXES`), never as one look's class. Every other sticky box,
     * every fixed box and a sticky sign in a state rule stay refused; the
     * kit refuses them all, as the workshop README says. Red: the lint
     * without `isStickyBox`.
     */
    it('lists the sign alone', () => {
        assert.deepEqual(STICKY_BOXES.map((box) => box.subject), ['stall-head']);
    });

    it('accepts the sign sticky in a look sheet, off the wall, plainly or on its header, in a media block too', () => {
        accepts('.t-neo:not(.shop-window) .stall-head { position: sticky; top: 0; }');
        accepts('.t-neo:not(.shop-window) .stall-scroll > header.stall-head { position: sticky; top: 0; }');
        accepts('.stall.t-neo:not(.shop-window) .stall-head { position: sticky; top: 0; }');
        accepts('@media (min-width: 680px) { .t-neo:not(.shop-window) .stall-head { position: sticky; top: 0; } }');
    });

    it('refuses the sign sticky where it could be on the wall, a turned wall above all (8f2)', () => {
        for (const rule of [
            '.t-neo .stall-head { position: sticky; top: 0; }',
            '.t-neo .stall-head:not(.shop-window) { position: sticky; top: 0; }',
            '.t-neo:not(.shop-window) .stall-head, .t-neo .stall-head { position: sticky; top: 0; }',
        ]) {
            const problems = lintLookSheet(plantedNeo(rule), { lookClass: 't-neo' });
            assert.ok(problems.some((p) => /off the wall/.test(p)), `${rule}:\n  ${problems.join('\n  ') || '(no problem)'}`);
        }
    });

    it('refuses any other sticky box, a sticky sign in a state, a prefixed sticky, and every fixed box — and the kit refuses the sign', () => {
        for (const rule of [
            '.t-neo:not(.shop-window) .item { position: sticky; top: 0; }',
            '.t-neo:not(.shop-window) .stall-head .stall-name { position: sticky; top: 0; }',
            '.t-neo:not(.shop-window) .stall-head, .t-neo:not(.shop-window) .tabs { position: sticky; top: 0; }',
            '.t-neo:not(.shop-window) .stall-head.open { position: sticky; top: 0; }',
            '.t-neo:not(.shop-window) .stall-head:hover { position: sticky; top: 0; }',
            '.t-neo:not(.shop-window) .stall-head[data-x] { position: sticky; top: 0; }',
            '.t-neo:not(.shop-window) .stall-head { position: -webkit-sticky; top: 0; }',
            '.t-neo:not(.shop-window) .stall-head { position: fixed; top: 0; }',
        ]) {
            plant(rule, /a fixed or sticky box follows the scroll/);
        }
        assert.ok(
            lintSheet(plantedKit('.t-neo .stall-head { position: sticky; top: 0; }')).some((p) => /a fixed or sticky box/.test(p)),
            'the kit refuses the sticky sign',
        );
    });
});

describe('the-scroll-pass-measures-what-the-lint-admits', () => {
    /**
     * Step 8f2: the look rules admit one sticky box in a look sheet, the
     * sign's own (`STICKY_BOXES`), and the probe's scroll pass
     * (`a-sticky-sign-covers-nothing-as-the-region-scrolls`) scrolls the
     * region under every subject `layout/stickyBoxes.ts` lists. The two are
     * one list: a box the lint admitted that no pass scrolled under is a
     * sticky box nobody measured — which is why, until the pass landed, a
     * fence (`a-sticky-sign-waits-for-the-scroll-pass`) refused one in every
     * served sheet. The tracked fixture makes its sign sticky, so the pass
     * has a subject in every default run (the runner owes one at the desk,
     * `probe-coverage.mjs`); no shipped look, the kit or the harness's
     * worn-only fixture does. Red: a subject added to either list alone, or
     * the fixture's sticky rule taken out.
     */
    const stickyIn = (rows) =>
        rows.filter((row) => /position\s*:\s*sticky/i.test(row.css.replace(/\/\*[\s\S]*?\*\//g, ''))).map((row) => row.path);

    it('lists the subjects the look rules admit, and no other', async () => {
        const { STICKY_SUBJECTS } = await import('../layout/stickyBoxes.ts');
        assert.deepEqual([...STICKY_SUBJECTS], STICKY_BOXES.map((box) => box.subject));
    });

    it('finds the sign sticky in the tracked fixture, and in no public look sheet', () => {
        const looks = lookRows(SERVED);
        const fixture = looks.filter((row) => row.lookClass === FIXTURE_PRIVATE_LOOK_CLASS);
        assert.equal(fixture.length, 1, 'the tracked fixture is read');
        const sticky = stickyIn(looks);
        assert.ok(sticky.includes(fixture[0].path), 'the tracked fixture makes its sign sticky');
        assert.deepEqual(
            sticky.filter((path) => !PRIVATE.some((row) => row.path === path)),
            [],
            'no shipped look, the kit or the harness fixture is sticky',
        );
        assert.deepEqual(lintLookSheet(fixture[0].css, { lookClass: fixture[0].lookClass, load: 'worn', ownArt: fixture[0].ownArt }), []);
    });
});

describe('a-legacy-mask-composite-is-the-same-value', () => {
    /**
     * Step 8f1: `-webkit-mask-composite` takes the legacy compositing
     * keywords, `mask-composite` the standard ones, and four pairs name one
     * operation. In a look sheet the prefixed one stands beside its twin
     * when the two agree layer for layer through `MASK_COMPOSITE_LEGACY`;
     * any other pairing is still a prefix with no twin. The kit keeps the
     * plain rule the README states. Red: the twin check without
     * `compositesAgree`.
     */
    it('lists the four pairs', () => {
        assert.deepEqual(MASK_COMPOSITE_LEGACY, { 'source-over': 'add', 'source-out': 'subtract', 'source-in': 'intersect', xor: 'exclude' });
    });

    it('accepts a legacy keyword beside its standard twin, layer for layer, and the same keyword on both', () => {
        accepts('.t-neo .item { -webkit-mask-composite: source-out; mask-composite: subtract; }');
        accepts('.t-neo .item { -webkit-mask-composite: source-out, source-over; mask-composite: subtract, add; }');
        accepts('.t-neo .item { -webkit-mask-composite: XOR; mask-composite: exclude; }');
        accepts('.t-neo .item { -webkit-mask-composite: subtract; mask-composite: subtract; }');
    });

    it('refuses a pair that composes differently, a layer count that differs, and the kit’s legacy pair', () => {
        for (const rule of [
            '.t-neo .item { -webkit-mask-composite: source-out; mask-composite: add; }',
            '.t-neo .item { -webkit-mask-composite: source-out, source-over; mask-composite: subtract; }',
            '.t-neo .item { -webkit-mask-composite: source-out; }',
            '.t-neo .item { -webkit-mask-composite: copy; mask-composite: add; }',
        ]) {
            plant(rule, /write mask-composite: with the same value/);
        }
        assert.ok(
            lintSheet(plantedKit('.t-neo .item { -webkit-mask-composite: source-out; mask-composite: subtract; }')).some((p) =>
                /write mask-composite: with the same value/.test(p),
            ),
            'the kit keeps the plain twin rule',
        );
    });
});

describe('the-kit-refuses-the-first-party-hooks', () => {
    /**
     * Step 8f1's hooks (the marks, `data-script`, `data-name-tier`,
     * `--name-rungs`) are a first-party look's (the 8f1 critic's item 3):
     * no fixture the kit's probe paints carries a CJK name or a name that
     * climbs a rung, and nothing measures a mark shown, so the kit refuses
     * them until the workshop README names them. A look sheet takes them.
     * Red: `selectorProblems` without its `kit` half.
     */
    const HOOKS = [
        '.t-neo .stall-name[data-script="cjk"] { letter-spacing: 0.2em; }',
        '.t-neo .stall-name[data-name-tier="3"] { font-size: 20px; }',
        '.t-neo .stall-name { --name-rungs: 3; }',
        '.t-neo .mark-figure { display: block; }',
        '.t-neo .item-ic .mark-tile { display: block; }',
        '.t-neo .items > .look-mark { display: block; }',
    ];
    // By attribute a mark is matched by no look sheet at all: `data-look-mark`
    // is on neither state list, so a look dresses a mark by its class.

    it('takes each in a look sheet', () => {
        for (const rule of HOOKS) accepts(rule);
    });

    it('refuses each in the kit', () => {
        for (const rule of HOOKS) {
            const kit = lintSheet(plantedKit(rule));
            assert.ok(kit.some((p) => /first-party hook/.test(p)), `kit, ${rule}:\n  ${kit.join('\n  ') || '(no problem)'}`);
        }
    });
});

/**
 * The critic's three plants on a broken figure's last group (CRITIC-NARROW-PHONE
 * round 4, P2-1), and a rule on each of the two piece classes.
 */
const FIGURE_PIECE_RULES = [
    '.t-neo .face-x .fig-end { -webkit-mask-image: linear-gradient(to right, #000 30%, transparent 30%); mask-image: linear-gradient(to right, #000 30%, transparent 30%); }',
    '.t-neo .pay-x .fig-end { clip-path: inset(0 60% 0 0); }',
    '.t-neo .sel-total .fig-end { letter-spacing: -0.5em; }',
    '.t-neo .fig-say { color: #ff00aa; }',
    '.t-neo .x .fig-say > span { font-weight: 300; }',
];

describe('a-look-may-not-dress-a-figures-pieces', () => {
    /**
     * D-2026-10-14-02 (the owner: "Theo khuyến nghị"): a look dresses a money
     * figure only as a whole. The probe holds every piece of a broken figure
     * to what an untouched piece computes, whatever selector reaches it
     * (`a-broken-figure-wears-the-figures-own-ink`); this is the static belt:
     * a first-party look sheet names neither piece class, `.fig-say` nor
     * `.fig-end` — the shipped looks and every private look a run reads are
     * linted with it (`the-shipped-look-sheets-pass-the-look-rules`,
     * `every-private-look-sheet-passes-the-look-rules`). `.fig-wraps` and
     * `.fig-narrow` mark the whole figure's box in its re-flow, which a look
     * may dress (round 2, the critic's P3-3). The kit lint is unchanged: the
     * workshop README states the rule, with `workshop:probe` as its check
     * (D-2026-10-14-06). Red: `selectorProblems` without its `FIGURE_PIECE`
     * half.
     */
    it('refuses each piece class in a look sheet, and leaves a figure dressed whole alone', () => {
        for (const rule of FIGURE_PIECE_RULES) {
            const shipped = lintLookSheet(plantedNeo(rule), { lookClass: 't-neo' });
            assert.ok(
                shipped.some((p) => /a piece of a money figure the app breaks after its commas — a look dresses a figure only as a whole/.test(p)),
                `shipped, ${rule}:\n  ${shipped.join('\n  ') || '(no problem)'}`,
            );
        }
        accepts('.t-neo .face-x .x { letter-spacing: -0.01em; }');
        accepts('.t-neo .item-x { color: #ff00aa; }');
        accepts('.t-neo .item-a.fig-wraps .item-x { font-size: 12px; }');
        accepts('.t-neo .item-a:not(.fig-narrow) { color: #ff00aa; }');
        accepts('.t-neo .item-a.fig-ending { color: #ff00aa; }');
    });

    it('leaves the kit lint as it was: the README states the rule and the kit probe checks it', () => {
        for (const rule of FIGURE_PIECE_RULES) {
            const kit = lintSheet(plantedKit(rule));
            assert.ok(!kit.some((p) => /a piece of a money figure/.test(p)), `kit, ${rule}:\n  ${kit.join('\n  ')}`);
        }
    });

    it('is stated in the workshop README, in the words the owner approved (D-2026-10-14-06, D-2026-10-19-02)', () => {
        const readme = read('workshop/README.md').replace(/\s+/g, ' ');
        // D-2026-10-14-06, its "shadow and everything around it" narrowed to
        // "the box around it" by D-2026-10-19-02: the probe holds a far
        // shadow and every box around the figure since D-2026-10-19-01.
        const piece =
            "**A price is dressed as one piece.** When a long price is too wide for its box, the app breaks it after its commas (`184,467,` / `440,737,` / `095,516.15 XEC`). Style the price as a whole — its colour, face, size, weight and the box around it are yours — but never one part of it apart from the rest: every part keeps the price's own colour, opacity, face, size and spacing, with no mask, clip, filter or transform of its own. A part styled on its own could hide a digit while every other check stays green. *(The kit — `workshop:probe`.)*";
        // D-2026-10-19-02: what `a-money-figure-is-never-misdressed` holds
        // the whole figure to, in the kit's words.
        const whole =
            '**The whole price is never dressed to misread:** no clip, mask, filter, fade, shrink, turn, line through it, far shadow, ground in its own colour or spacing that makes its digits touch, and a box around it may tilt up to 10° and take any shape only clear of its digits. *(The kit — `workshop:probe`.)*';
        assert.ok(readme.includes(piece), 'the workshop README does not carry the piece line');
        assert.ok(readme.includes(whole), 'the workshop README does not carry the whole-price line');
        assert.ok(!readme.includes('shadow and everything around it are yours'), 'the README still says a shadow and everything around the price are a look\'s');
        const money = readme.indexOf('**Money is never covered, cut or faded.**');
        const at = readme.indexOf(piece);
        const after = readme.indexOf(whole);
        const next = readme.indexOf('**QR codes stay black on white');
        assert.ok(money >= 0 && money < at, 'the piece line stands after the money paragraph');
        // The whole-price line follows the piece line directly, then the QR paragraph.
        assert.equal(after, at + piece.length + 1, 'the whole-price line stands right after the piece line');
        assert.equal(next, after + whole.length + 1, 'the QR paragraph stands right after the whole-price line');
    });
});

describe('a-look-never-hands-a-link-its-browser-colour', () => {
    /**
     * The 8e1 critic's item 10: `color: revert` (or `revert-layer`, or
     * either on `all`) in a look sheet gives a link the browser's blue and
     * visited purple back, the defect `every-anchor-the-app-builds-sets-its-own-colour`
     * exists for and cannot see in a look's sheet. Refused for every look,
     * shipped, kit or private; `unset` and `inherit` keep an author colour.
     */
    it('refuses revert and revert-layer on color and all, in the shipped sheet and its starter', () => {
        for (const rule of [
            '.t-neo .cashtab-link { color: revert; }',
            '.t-neo .guide-link { color: revert-layer; }',
            '.t-neo a { all: revert; }',
            '.t-neo .x a { all: REVERT-LAYER; }',
        ]) {
            plant(rule, /reverting the colour hands a link back to the browser/);
        }
    });

    it('accepts an inherited or unset colour, and revert on another property', () => {
        accepts('.t-neo .cashtab-link { color: inherit; }');
        accepts('.t-neo .cashtab-link { color: unset; }');
        accepts('.t-neo .cashtab-link { text-decoration: revert; }');
    });
});

describe('generated-text-in-a-look-is-listed', () => {
    /**
     * G2. A stylesheet can print text — a "5" beside a figure reads as the
     * figure — and every road it has to print, reorder or hide text is shut:
     * `content` only on `::before` / `::after`, only from `GENERATED_TEXT`
     * once its escapes are decoded.
     */
    it('lists what the shipped sheets print, decoded', () => {
        assert.deepEqual([...GENERATED_TEXT], ['', '// ', '\u25c6']);
        assert.equal(decodeEscapes('\\25c6'), '\u25c6');
    });

    it('refuses printed text, content on an element, and every other text road', () => {
        for (const [rule, pattern] of [
            ['.t-neo .item-p::before { content: "5"; }', /a look prints only/],
            [".t-neo .item-p::after { content: '\\35'; }", /a look prints only/],
            ['.t-neo .item-p::after { content: "$"; }', /a look prints only/],
            ['.t-neo .item-p::after { content: "" "5"; }', /a look prints only/],
            ['.t-neo .item-p::after { content: url(x.svg); }', /a look prints only/],
            ['.t-neo .item-p::after { content: open-quote; quotes: "5" ""; }', /quotes is the text/],
            ['.t-neo .item-p { content: ""; }', /content on "\.t-(neo|workshop) \.item-p"/],
            ['.t-neo .item-p::after { content: attr(data-role); }', /attr\(\) prints text/],
            ['.t-neo .item-p::after { content: counter(list-item); }', /counter\(\) prints text/],
            ['.t-neo .item-p::after { content: counters(list-item, "."); }', /counters\(\) prints text/],
            ['.t-neo .item-p::marker { color: red; }', /::marker is a list marker/],
            ['.t-neo .item-p::first-letter { color: transparent; }', /::first-letter restyles part/],
            ['.t-neo .item-p:first-line { color: transparent; }', /::first-line restyles part/],
            ['.t-neo .item-p::scroll-marker { color: red; }', /::scroll-marker is not ::before or ::after/],
            [".t-neo .items { list-style-type: '$'; }", /a list marker prints/],
            ['.t-neo .items { list-style: decimal inside; }', /a list marker prints/],
            ['.t-neo .item-p { display: list-item; }', /grows a marker/],
            ['.t-neo .items { counter-reset: list-item 5000; }', /a counter is text/],
            ['@counter-style five { system: fixed; symbols: "5"; }', /@counter-style/],
            ['.t-neo .item-p { unicode-bidi: bidi-override; direction: rtl; }', /overriding the bidi order/],
            ['.t-neo .item-p { direction: rtl; }', /right-to-left/],
            ['.t-neo .item-p { -webkit-text-security: disc; }', /draws a disc/],
            ['.t-neo .item-p { -webkit-box-reflect: below; }', /mirrored copy/],
            ['.t-neo .item-p { text-overflow: "5"; }', /a string here is text/],
            ['.t-neo .item-p { hyphens: auto; hyphenate-character: "5"; }', /hyphenate-character prints a glyph/],
            ['.t-neo .item-p { text-emphasis: filled dot; }', /text-emphasis prints a glyph/],
            ['.t-neo .item-p { -webkit-text-emphasis-style: "5"; }', /-webkit-text-emphasis-style prints a glyph/],
            // A property this list never named, carrying a string: refused by where strings may stand.
            ['.t-neo .item-p { speak-as: "5"; }', /a string here is text the look would print/],
            ['@keyframes t-neo-say { to { content: "5"; } }', /content in a keyframe/],
        ]) {
            plant(rule, pattern);
        }
    });

    it('accepts the three listed strings, none and normal, on ::before and ::after', () => {
        accepts(".t-neo .item-p::before { content: '// '; }");
        accepts(".t-neo .item-p:after { content: '\\25c6'; }");
        accepts('.t-neo .item-p::after { content: none; }');
        accepts('.t-neo .item-p::before, .t-neo .item-h::after { content: ""; }');
        accepts('.t-neo .items { list-style: none; }');
    });
});

describe('every-media-block-in-a-look-is-one-the-probe-enters', () => {
    /**
     * G4, the at-rules. A look must paint in a reader's browser what Chrome
     * painted for the probe: no rule gated on an engine feature, a container
     * size, a cascade layer or a registered property, and no media
     * condition the probe's passes do not enter.
     */
    it('lists exactly the conditions the shipped look sheets use', () => {
        const used = new Set();
        for (const sheet of LOOKS) {
            for (const m of read(sheet.path).replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/@media\s*([^{]+)\{/g)) {
                used.add(m[1].trim().replace(/\s+/g, ' '));
            }
        }
        assert.deepEqual([...used].sort(), [...LOOK_MEDIA].sort());
    });

    it('refuses every other condition, feature query, container, layer and registered property', () => {
        for (const [rule, pattern] of [
            ['@supports (display: grid) { .t-neo .item { color: red; } }', /@supports gates rules/],
            ['@container (min-width: 400px) { .t-neo .item { color: red; } }', /@container sizes rules/],
            ['@layer look { .t-neo .item { color: red; } }', /@layer re-orders/],
            ['@property --t-neo-x { syntax: "<number>"; inherits: false; initial-value: 0; }', /@property changes/],
            ['@media (hover: none) { .t-neo .item { color: red; } }', /\(hover: none\) is not a condition the probe enters/],
            ['@media (pointer: coarse) { .t-neo .item { color: red; } }', /is not a condition the probe enters/],
            ['@media (min-width: 900px) { .t-neo .item { color: red; } }', /is not a condition the probe enters/],
            ['@media print { .t-neo .item { color: red; } }', /print is not a condition the probe enters/],
            ['@media screen and (min-width: 680px) { .t-neo .item { color: red; } }', /is not a condition the probe enters/],
            ['@media (prefers-color-scheme: dark) { .t-neo .item { color: red; } }', /is not a condition the probe enters/],
            ['@scope (.t-neo) { .item { color: red; } }', /@scope is not allowed/],
            ['.t-neo .item { -webkit-mask: none; }', /write mask: with the same value/],
            ['.t-neo .item { -webkit-backdrop-filter: blur(2px); backdrop-filter: blur(3px); }', /write backdrop-filter: with the same value/],
            ['.t-neo .item:-moz-focusring { color: red; }', /:-moz-focusring is one engine's selector/],
            ['.t-neo .items::-webkit-scrollbar { display: none; }', /::-webkit-scrollbar is one engine's selector/],
        ]) {
            plant(rule, pattern);
        }
    });

    it('accepts the three conditions, and a prefix beside its twin or one every engine reads', () => {
        accepts('@media (min-width:680px) { .t-neo .item { color: red; } }');
        accepts('@media (max-width: 679.98px) { .t-neo .item { color: red; } }');
        accepts('.t-neo .item { -webkit-mask: none; mask: none; }');
        accepts('.t-neo .item { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }');
    });
});

describe('a-look-cannot-paint-around-what-the-probe-reads', () => {
    /**
     * G4, the rest: `!important` outranks the look's own inline values (the
     * contrast fence, a mood); a fixed or sticky box stands over a figure at
     * a scroll position the probe never took; and the ink roads paint text
     * in a colour the contrast pass does not read (it reads `color`).
     */
    it('refuses !important, a fixed or sticky box, and every ink road', () => {
        for (const [rule, pattern] of [
            ['.t-neo .item { --s-text: #000 !important; }', /!important outranks/],
            ['.t-neo .item { color: red ! important; }', /!important outranks/],
            ['.t-neo .item { position: fixed; }', /a fixed or sticky box/],
            ['.t-neo .item { position: sticky; }', /a fixed or sticky box/],
            ['.t-neo .item { -webkit-text-fill-color: transparent; }', /contrast pass never reads/],
            ['.t-neo .item { -webkit-text-stroke: 1px red; }', /outlines text/],
            ['.t-neo .item { background-clip: text; }', /clipped to the text/],
            ['.t-neo .item { -webkit-background-clip: text; background-clip: text; }', /clipped to the text/],
            ['.t-neo .item { background: linear-gradient(red, blue) text; }', /clipped to the text/],
            // … and the same keywords carried in a variable.
            ['.t-neo .item { --t-neo-p: fixed; position: var(--t-neo-p); }', /write position plainly/],
            ['.t-neo .item { direction: var(--t-neo-d, rtl); }', /write direction plainly/],
            ['.t-neo .item { --t-neo-c: text; background: red var(--t-neo-c); }', /custom property holding "text"/],
        ]) {
            plant(rule, pattern);
        }
    });

    it('accepts the positions the shipped looks use, and a background that only names text inside a function', () => {
        accepts('.t-neo .item { position: relative; } .t-neo .item-h { position: absolute; }');
        accepts('.t-neo .item { background: var(--s-text) linear-gradient(red, var(--text, blue)); }');
    });
});

describe('no-shipped-keyframe-flashes-more-than-three-times-a-second', () => {
    /**
     * G6, static (WCAG 2.3.1): every `@keyframes` in every served sheet, at
     * every timing a rule gives it — the theme table's `--s-*-anim` values
     * included, and a rule that re-times whatever runs on its element — holds
     * at most three flashes (pairs of opposing changes) in any one second.
     * `att-hum`'s failing lamp is the named boundary: three dips inside
     * ~0.22 s of a 7 s cycle, exactly three.
     */
    it('finds no served keyframe over three flashes a second, and no flashing one it cannot time', async () => {
        const { report, problems } = await servedFlashReport({ sheets: SERVED });
        assert.deepEqual(problems, []);
        assert.ok(report.length > 10, 'the report read the served keyframes');
        const worst = Math.max(...report.map((row) => row.flashes));
        assert.ok(worst <= MAX_FLASHES_PER_SECOND, `worst ${worst}`);
        // The theme table's animations are read through their vars.
        assert.ok(report.some((row) => row.name === 'neo-flick' && row.seconds === 6), 'neo-flick through --s-name-anim');
    });

    it('reads att-hum at the boundary: three flashes, six changes, at its shipped 7 s', async () => {
        const { report } = await servedFlashReport({ sheets: SERVED });
        const hum = report.filter((row) => row.name === 'att-hum-gutter');
        assert.deepEqual(
            hum.map((row) => [row.seconds, row.iterations, row.alternate, row.changes, row.flashes]),
            [[7, Infinity, false, 6, 3]],
        );
    });

    it('reads every private look a run reads beside the served sheets, and goes red on a strobe in one', async () => {
        assert.ok(PRIVATE.length > 0, 'a private look sheet is read');
        const names = (await flashSheets({ sheets: SERVED })).map((sheet) => sheet.name);
        for (const row of PRIVATE) {
            assert.ok(names.includes(row.path), `${row.path} is read by the flash rule`);
        }
        // A planted look whose sheet strobes: red through the served sheets.
        const strobe =
            `@keyframes ${PLANTED_CLASS}-strobe { 0%, 20%, 40%, 60%, 80% { opacity: 1; } 10%, 30%, 50%, 70%, 90% { opacity: 0; } }\n` +
            `.${PLANTED_CLASS} .stall-name { animation: ${PLANTED_CLASS}-strobe 1s steps(1) infinite; }`;
        const repo = plantLooks((path, text) => (path === 'fixture/sheet.css' ? beforeReduce(text, strobe) : text));
        const sheets = await servedSheets({ env: repo.selection, fixture: true, gitEnv: repo.env });
        const { problems } = await servedFlashReport({ sheets });
        assert.ok(problems.some((p) => new RegExp(`${PLANTED_CLASS}-strobe .* flashes 5 times`).test(p)), problems.join('\n'));
    });

    it('refuses a strobe, a re-timed lamp, and a flashing keyframe run for a time it cannot read', async () => {
        const vars = await themeVarValues();
        const served = await flashSheets({ sheets: SERVED });
        const withNeo = (css) => served.map((sheet) => (sheet.name === NEO.path ? { name: sheet.name, css } : sheet));
        for (const [rule, pattern] of [
            [
                '@keyframes t-neo-strobe { 0%, 20%, 40%, 60%, 80% { opacity: 1; } 10%, 30%, 50%, 70%, 90% { opacity: 0; } }\n' +
                    '.t-neo .stall-name { animation: t-neo-strobe 1s steps(1) infinite; }',
                /t-neo-strobe .* flashes 5 times in one second/,
            ],
            // A longhand that names no keyframe re-times the lamp on its element.
            ['.t-neo .sign-lamp { animation-duration: 1s; }', /att-hum-gutter .* flashes 4 times .* at 1s/],
            // … and one whose element names no class re-times everything.
            ['.t-neo h1 span { animation-duration: 0.5s; }', /att-hum-gutter .* flashes \d+ times .* at 0\.5s/],
            // A shorthand naming another sheet's keyframe at its own pace.
            ['.t-neo .item-p { animation: om-flick 0.8s steps(1) infinite; }', /om-flick .* flashes \d+ times/],
            ['.t-neo .stall-name { animation: t-neo-cur var(--t-neo-nowhere) infinite; }', /t-neo-cur .* a time this reader cannot work out/],
        ]) {
            const { problems } = flashReport(withNeo(plantedNeo(rule)), { vars });
            assert.ok(problems.some((p) => pattern.test(p)), `${rule}:\n  ${problems.join('\n  ') || '(no problem)'}`);
        }
    });

    it('refuses a scroll-driven animation in a look sheet, which no duration bounds', () => {
        plant(
            '.t-neo .stall-name { animation: t-neo-cur 1s infinite; animation-timeline: scroll(); }',
            /animation-timeline — ties an animation to the scroll/,
        );
        plant('.t-neo .items { view-timeline: --t-neo-v block; }', /view-timeline — defines a scroll timeline/);
    });

    it('counts a change as a change: pairs of opposing ones are flashes, a ramp one way is one, a jump back is another', () => {
        const stops = (list) => list.map(([at, decls]) => ({ at, decls: decls.map(([prop, value]) => ({ prop, value })) }));
        // Opacity 1 → 0 → 1 → 0 … five times in one second: ten changes.
        const strobe = stops(
            Array.from({ length: 11 }, (_, i) => [i / 10, [['opacity', i % 2 === 0 ? '1' : '0']]]),
        );
        assert.deepEqual(keyframeFlashes(strobe, { seconds: 1, iterations: 1 }), { changes: 10, flashes: 5 });
        // A ramp 0 → 0.3 → 0.6 → 1 is one change, and the jump back to 0 another.
        const ramp = stops([
            [0, [['opacity', '0']]],
            [0.3, [['opacity', '0.3']]],
            [0.6, [['opacity', '0.6']]],
            [1, [['opacity', '1']]],
        ]);
        assert.deepEqual(keyframeFlashes(ramp, { seconds: 0.25, iterations: 1 }), { changes: 1, flashes: 0 });
        assert.equal(keyframeFlashes(ramp, { seconds: 0.25, iterations: Infinity }).changes, 8);
        // Alternating, the same ramp has no jump: four changes a second.
        assert.equal(keyframeFlashes(ramp, { seconds: 0.25, iterations: Infinity, alternate: true }).changes, 4);
        // Two properties changing at one instant are one change; movement is none.
        const both = stops([
            [0, [['color', 'red'], ['text-shadow', 'none'], ['transform', 'none']]],
            [0.5, [['color', 'blue'], ['text-shadow', '0 0 2px red'], ['transform', 'scale(2)']]],
            [1, [['color', 'red'], ['text-shadow', 'none'], ['transform', 'none']]],
        ]);
        assert.deepEqual(keyframeFlashes(both, { seconds: 1, iterations: 1 }), { changes: 2, flashes: 1 });
        const moving = stops([
            [0, [['transform', 'none']]],
            [1, [['transform', 'scale(2)']]],
        ]);
        assert.deepEqual(keyframeFlashes(moving, { seconds: 0.01 }), { changes: 0, flashes: 0 });
    });
});

/* ---------- step 6: a look sheet names itself; a worn-only sheet keeps to itself ---------- */

/** A worn sheet's own directory, relative to the sheet, and the plain files in it. */
function ownArtOf(sheet) {
    const dir = join(ROOT, sheet.artDir);
    return {
        dir: relative(dirname(join(ROOT, sheet.path)), dir).replaceAll('\\', '/'),
        files: readdirSync(dir).filter((name) => statSync(join(dir, name)).isFile()),
    };
}

const FIXTURE = sheetsWithRole('fixture')[0];
const FIXTURE_CSS = read(FIXTURE.path);
const FIXTURE_ART = ownArtOf(FIXTURE);
const FIXTURE_REDUCE = FIXTURE_CSS.lastIndexOf('@media (prefers-reduced-motion: reduce)');
/** A copy of the fixture's worn-only sheet with `rule` planted before its reduce block. */
const plantedFixture = (rule) => `${FIXTURE_CSS.slice(0, FIXTURE_REDUCE)}${rule}\n\n${FIXTURE_CSS.slice(FIXTURE_REDUCE)}`;
const lintFixture = (css, ownArt = FIXTURE_ART) =>
    lintLookSheet(css, { lookClass: FIXTURE.lookClass, load: 'worn', ownArt });

/** Every served sheet — a private look's among them — as `wornSheetProblems` reads it, with `swap` replacing one path's text. */
function servedWith(swap = {}, sheets = SERVED) {
    return sheets.map((sheet) => ({
        path: sheet.path,
        css: swap[sheet.path] ?? sheet.css,
        load: sheet.load,
        lookClass: sheet.lookClass,
    }));
}

describe('every-private-look-sheet-passes-the-look-rules', () => {
    /**
     * A private look's sheet is a worn-only look sheet like the fixture
     * look's: under its own class, naming itself, its `url()`s reaching only
     * its own `art/`, its faces stating `font-display`, its reduce block last
     * — every look rule, read over every private look a run reads (the
     * tracked fixture always, the selection when one is named), from git at
     * the commit, as the build lints it before Vite reads a byte
     * (`private-looks-build.mjs`). Red over a planted look whose rule
     * reaches outside its class.
     */
    it('passes every private look sheet a run reads, the tracked fixture among them', () => {
        assert.ok(PRIVATE.some((row) => row.look.source === 'fixture'), 'the fixture is read');
        for (const row of PRIVATE) {
            assert.deepEqual(lintLookSheet(row.css, { lookClass: row.lookClass, load: 'worn', ownArt: row.ownArt }), [], row.path);
        }
    });

    it('goes red on a planted look whose rule reaches outside its class', async () => {
        const repo = plantLooks((path, text) => (path === 'fixture/sheet.css' ? beforeReduce(text, '.stall .item-n { color: red; }') : text));
        const rows = privateRows(await servedSheets({ env: repo.selection, fixture: true, gitEnv: repo.env }));
        const row = rows.find((r) => r.lookClass === PLANTED_CLASS);
        assert.ok(row !== undefined, 'the planted look is read');
        const problems = lintLookSheet(row.css, { lookClass: row.lookClass, load: 'worn', ownArt: row.ownArt });
        assert.ok(problems.some((p) => new RegExp(`is not under \\.${PLANTED_CLASS}`).test(p)), problems.join('\n'));
    });
});

describe('every-look-sheet-names-itself', () => {
    /**
     * `.t-x { --look-sheet: t-x; }`, once, on the bare class: what the probe
     * and looks:diff read on every painted stall to know the look was
     * measured with its sheet (`a-look-is-measured-with-its-sheet`). Every
     * look sheet carries it — the shipped three, the kit's (the skeleton and
     * every starter) and the fixture's worn-only one.
     */
    it('passes every look sheet in the table', () => {
        assert.deepEqual(lookSheets().map((s) => s.lookClass).sort(), ['t-fixture-worn', 't-modern', 't-neo', 't-rural', 't-workshop']);
        for (const sheet of sheetsWithRole('look')) {
            assert.deepEqual(lintLookSheet(read(sheet.path), { lookClass: sheet.lookClass }), [], sheet.path);
        }
        assert.deepEqual(lintSheet(read('workshop/theme-workshop.css')), []);
        assert.deepEqual(lintFixture(FIXTURE_CSS), []);
    });

    it('refuses a sheet that does not name itself, in the shipped sheet and its starter', () => {
        const bare = NEO_CSS.replace('--look-sheet: t-neo;', '');
        assert.notEqual(bare, NEO_CSS, 'the plant found the sentinel');
        const shipped = lintLookSheet(bare, { lookClass: 't-neo' });
        assert.ok(shipped.some((p) => /does not name itself/.test(p)), shipped.join('\n'));
        const kit = lintSheet(rescopeSheet(bare, 'neo', carried));
        assert.ok(kit.some((p) => /does not name itself/.test(p)), kit.join('\n'));
    });

    it('lets no sheet but a look\'s declare the name, in the base, a screen sheet or a document', () => {
        assert.deepEqual(foreignNamingProblems(servedWith()), []);
        for (const path of ['src/ui/stall.css', 'src/ui/window.css', 'public/guide.css', 'layout/gallery.css']) {
            const problems = foreignNamingProblems(servedWith({ [path]: `${read(path)}\n.t-neo { --look-sheet: t-neo; }\n` }));
            assert.ok(problems.some((p) => p.startsWith(`${path}: declares --look-sheet`)), `${path}: ${problems.join('; ') || '(none)'}`);
        }
    });

    it('refuses a second naming, a naming off the bare class, and the wrong name', () => {
        plant('.t-neo .item-n { --look-sheet: t-neo; }', /declared 2 times/);
        const moved = NEO_CSS.replace('.t-neo {\n    --look-sheet: t-neo;\n}', '.stall.t-neo {\n    --look-sheet: t-neo;\n}');
        assert.notEqual(moved, NEO_CSS);
        assert.ok(lintLookSheet(moved, { lookClass: 't-neo' }).some((p) => /on its bare class/.test(p)));
        const media = NEO_CSS.replace('.t-neo {\n    --look-sheet: t-neo;\n}', '@media (min-width: 680px) { .t-neo { --look-sheet: t-neo; } }');
        assert.ok(lintLookSheet(media, { lookClass: 't-neo' }).some((p) => /on its bare class/.test(p)));
        const wrong = NEO_CSS.replace('--look-sheet: t-neo;', '--look-sheet: t-rural;');
        assert.ok(lintLookSheet(wrong, { lookClass: 't-neo' }).some((p) => /holds "t-rural"/.test(p)));
    });
});

describe('a-worn-only-sheet-names-only-its-own-art', () => {
    /**
     * A worn-only sheet and its art are one download, counted together
     * (`each-look-keeps-its-art-budget`): every `url()` is a file in the
     * look's own directory (`artDir` in the role table). Reaching into the
     * shared decorations would make one file two buckets'.
     */
    it('passes the fixture, which names its own art', () => {
        assert.ok(wornSheets().length > 0, 'a worn-only sheet is on the table');
        for (const sheet of wornSheets()) {
            assert.ok(sheet.artDir !== undefined, `${sheet.path} names its art directory`);
            assert.deepEqual(lintLookSheet(read(sheet.path), { lookClass: sheet.lookClass, load: 'worn', ownArt: ownArtOf(sheet) }), [], sheet.path);
        }
        assert.match(FIXTURE_CSS, /url\(\.\/fixture-look\/ground\.svg\)/);
    });

    it('refuses a shared decoration, a missing file, a data: URL, another site and src()', () => {
        for (const [rule, pattern] of [
            ['.t-fixture-worn .a { background-image: url(../src/ui/decor/rain-near.svg); }', /names only its own art/],
            ['.t-fixture-worn .a { background-image: url(./fixture-look/nothing.svg); }', /no plain file fixture-look\/nothing\.svg/],
            ['.t-fixture-worn .a { background-image: url(data:image/svg+xml,%3Csvg%3E); }', /a data: URL/],
            ['.t-fixture-worn .a { background-image: url(https://example.com/a.svg); }', /another site/],
            ['.t-fixture-worn .a { background-image: url(/assets/a.svg); }', /names only its own art/],
            ['.t-fixture-worn .a { background-image: image-set("../src/ui/decor/rain-near.svg" 1x); }', /names only its own art/],
            ['.t-fixture-worn .a { background-image: src("./fixture-look/ground.svg"); }', /src\(\) is not allowed/],
        ]) {
            const problems = lintFixture(plantedFixture(rule));
            assert.ok(problems.some((p) => pattern.test(p)), `${rule}:\n  ${problems.join('\n  ') || '(no problem)'}`);
        }
    });

    it('leaves a bundled look sheet under its own url rules: the worn road is the worn sheet\'s', () => {
        // A shipped look names no url() today; the plant is read without the worn rule.
        const shipped = lintLookSheet(plantedNeo('.t-neo .a { background-image: url(../ui/decor/rain-near.svg); }'), { lookClass: 't-neo' });
        assert.ok(!shipped.some((p) => /its own art/.test(p)), shipped.join('\n'));
    });
});

describe('a-worn-only-sheet-replaces-no-keyframes', () => {
    /**
     * Keyframe names and `@font-face` families are global, and a worn-only
     * sheet lands after the entry CSS: a name it shares with any other sheet
     * replaces that sheet's on every stall of the page once it loads.
     */
    it('passes every served sheet, the private looks a run reads among them', () => {
        assert.ok(servedWith().some((sheet) => PRIVATE.some((row) => row.path === sheet.path)), 'a private look sheet is read');
        assert.deepEqual(wornSheetProblems(servedWith()), []);
    });

    it('refuses a private look that declares a keyframe another sheet declares, and a public sheet that names its class', () => {
        const [row] = PRIVATE;
        const kf = wornSheetProblems(servedWith({ [row.path]: beforeReduce(row.css, '@keyframes om-flick { from { rotate: 0deg; } to { rotate: 1deg; } }') }));
        assert.ok(kf.some((p) => p.startsWith(`${row.path}: @keyframes om-flick is also declared in src/ui/stall.css`)), kf.join('\n'));
        const named = wornSheetProblems(servedWith({ 'src/ui/broadcast.css': `${read('src/ui/broadcast.css')}\n.${row.lookClass} .bc-card { color: red; }\n` }));
        assert.ok(named.some((p) => p.startsWith('src/ui/broadcast.css: ') && p.includes(`names .${row.lookClass}, a worn-only look`)), named.join('\n'));
    });

    it('refuses a keyframe name or a face family another sheet declares', () => {
        const kf = wornSheetProblems(servedWith({ [FIXTURE.path]: plantedFixture('@keyframes om-flick { from { rotate: 0deg; } to { rotate: 1deg; } }') }));
        assert.ok(kf.some((p) => /@keyframes om-flick is also declared in src\/ui\/stall\.css/.test(p)), kf.join('\n'));
        const face = '@font-face { font-family: t-fixture-worn-serif; src: url(./fixture-look/ground.svg) format("woff2"); }';
        const clash = wornSheetProblems(
            servedWith({
                [FIXTURE.path]: plantedFixture(face),
                // In another case: family names match without regard to it.
                'src/ui/stall.css': `${read('src/ui/stall.css')}\n@font-face { font-family: "T-Fixture-Worn-Serif"; src: url(./fonts/inter-latin.woff2) format("woff2"); }\n`,
            }),
        );
        assert.ok(clash.some((p) => /family "t-fixture-worn-serif" is also declared in src\/ui\/stall\.css/.test(p)), clash.join('\n'));
    });

    it('lets a worn-only sheet carry its own namespaced face, from its own directory, and nothing else', () => {
        const art = { dir: FIXTURE_ART.dir, files: [...FIXTURE_ART.files, 'serif.woff2'] };
        assert.deepEqual(
            lintFixture(plantedFixture('@font-face { font-family: "t-fixture-worn-serif"; src: url(./fixture-look/serif.woff2) format("woff2"); font-display: swap; }'), art),
            [],
        );
        for (const [face, pattern] of [
            ['@font-face { font-family: Inter; src: url(./fixture-look/serif.woff2) format("woff2"); font-display: swap; }', /not namespaced to the look/],
            ['@font-face { font-family: t-fixture-worn-serif; src: local("Georgia"), url(./fixture-look/serif.woff2); font-display: swap; }', /no local\(\)/],
            ['@font-face { font-family: t-fixture-worn-serif; src: url(../src/ui/fonts/inter-latin.woff2); font-display: swap; }', /names only its own art/],
        ]) {
            const problems = lintFixture(plantedFixture(face), art);
            assert.ok(problems.some((p) => pattern.test(p)), `${face}:\n  ${problems.join('\n  ') || '(no problem)'}`);
        }
        // A bundled look carries no face at all, as before.
        plant('@font-face { font-family: t-neo-serif; src: url(./x.woff2); }', /@font-face is not allowed/);
    });
});

describe('a-look-face-never-hides-a-figure-while-it-loads', () => {
    /**
     * The step-8 critic's item 9 (step 8b2): a face that does not say
     * `font-display` takes the browser's `auto`, which in Chrome hides text
     * in a face still loading for up to three seconds — and a look that sets
     * its figures in its own face paints the asked amount blank on a slow
     * line, after the loader has let the stall paint. Every look face states
     * `swap` or `fallback`, once, as `stall.css`'s own faces state `swap`.
     * Red by plants in the fixture's worn-only sheet and in the private-look
     * fixture's (the subject the build lints, `private-looks-build.mjs`).
     */
    let art;
    before(() => {
        art = { dir: FIXTURE_ART.dir, files: [...FIXTURE_ART.files, 'serif.woff2'] };
    });
    const face = (display) =>
        `@font-face { font-family: t-fixture-worn-serif; src: url(./fixture-look/serif.woff2) format("woff2");${display} }`;

    it('takes swap or fallback, once', () => {
        assert.deepEqual(FACE_DISPLAY, ['swap', 'fallback']);
        for (const display of [' font-display: swap;', ' font-display: fallback;', ' font-display: SWAP;']) {
            assert.deepEqual(lintFixture(plantedFixture(face(display)), art), [], display);
        }
    });

    it('refuses a face that says nothing, or blocks, or hides text another way, or says it twice', () => {
        for (const display of ['', ' font-display: auto;', ' font-display: block;', ' font-display: optional;', ' font-display: swap; font-display: block;']) {
            const problems = lintFixture(plantedFixture(face(display)), art);
            assert.ok(problems.some((p) => /font-display: swap or fallback, once/.test(p)), `${display}:\n  ${problems.join('\n  ') || '(no problem)'}`);
        }
    });

    it('refuses it in the private-look fixture, the sheet a build lints', () => {
        // As HEAD holds it, which is what a build and every guard read.
        const css = PRIVATE.find((row) => row.look.source === 'fixture').css;
        const reduce = css.lastIndexOf('@media (prefers-reduced-motion: reduce)');
        const planted = `${css.slice(0, reduce)}@font-face { font-family: t-fixture-private-serif; src: url(./art/serif.woff2) format("woff2"); }\n\n${css.slice(reduce)}`;
        const problems = lintLookSheet(planted, { lookClass: 't-fixture-private', load: 'worn', ownArt: { dir: 'art', files: ['ground.svg', 'serif.woff2'] } });
        assert.deepEqual(problems.filter((p) => /font-display/.test(p)).length, 1, problems.join('\n'));
        assert.deepEqual(lintLookSheet(css, { lookClass: 't-fixture-private', load: 'worn', ownArt: { dir: 'art', files: ['ground.svg', 'under-name.svg'] } }), []);
    });
});

describe('no-bundled-sheet-names-a-worn-only-look', () => {
    /**
     * A rule for a worn-only look in a bundled sheet paints before that
     * look's sheet arrives and stays when it fails — the look half-dressed —
     * so every rule of a worn-only look lives in its own file.
     */
    it('refuses a rule for the worn-only look in the base, a screen sheet and a document', () => {
        for (const path of ['src/ui/stall.css', 'src/ui/broadcast.css', 'public/stream.css']) {
            const problems = wornSheetProblems(servedWith({ [path]: `${read(path)}\n.stall.t-fixture-worn .item-n { color: red; }\n` }));
            assert.ok(
                problems.some((p) => p.startsWith(`${path}: `) && /names \.t-fixture-worn, a worn-only look/.test(p)),
                `${path}:\n  ${problems.join('\n  ') || '(no problem)'}`,
            );
        }
    });
});

describe('a-file-mask-arrives-at-rest', () => {
    /**
     * `no-word-is-clipped-by-a-file` reads the probe's paints, at rest and
     * frozen at one instant: a file's mask or clip written in a state rule
     * or a keyframe is refused here instead (the step-6 critic's P3). A mask
     * or clip with no file, or a file mask on a box at rest, is the probe's.
     */
    it('refuses a file mask or clip in a state rule and in a keyframe, shipped and kit', () => {
        for (const rule of [
            '.t-neo .item-n:hover { mask-image: url(./x.svg); }',
            '.t-neo .item-n:focus-visible { -webkit-mask-image: url(./x.svg); mask-image: url(./x.svg); }',
            '.t-neo .mini[aria-pressed="true"] { clip-path: url(./x.svg); }',
            '.t-neo details[open] .x { mask: url(./x.svg) no-repeat; }',
            '.t-neo .addr[data-copied="true"] { -webkit-mask-box-image-source: url(./x.svg); }',
            // Step 8g-pre, the critic's P2-1: a file named through image-set(), which the url-only test let through.
            '.t-neo .item-n:hover { mask-image: image-set("./x.svg" 1x); }',
            '.t-neo .item-n:hover { mask: image-set("./x.svg" 1x) no-repeat; }',
            '.t-neo .item-n:hover { mask-image: var(--x, url(./x.svg)); }',
        ]) {
            plant(rule, /a file's mask or clip in a state rule/);
        }
        plant('@keyframes t-neo-veil { from { mask-image: url(./x.svg); } to { mask-image: none; } }', /a file's mask or clip in a keyframe/);
        plant('@keyframes t-neo-veil { from { mask-image: image-set("./x.svg" 1x); } to { mask-image: none; } }', /a file's mask or clip in a keyframe/);
    });

    it('accepts a mask with no file, a clip shape, and a file mask at rest', () => {
        accepts('.t-neo .item-n:hover { mask-image: linear-gradient(#000, transparent); }');
        accepts('.t-neo .item-n:hover { clip-path: inset(0 2px); }');
        accepts('.t-neo .item-n { mask-image: url(./x.svg); }');
        accepts('.t-neo [data-role="price"] { mask-image: url(./x.svg); }');
        accepts('.t-neo .item-n { mask-image: image-set("./x.svg" 1x); }');
    });
});

describe('the-owed-art-off-frame-reads-every-file-a-mask-names', () => {
    /**
     * Step 8g-pre (the critic's P2-1): one reader for "this masking value
     * names a file" — `masksWithAFile`, the lint's own `urlTargets` (every
     * `url()` and `image-set()` entry, prefixed forms included) over a
     * masking property — asked by the look rules' state-rule and keyframe
     * refusal above and, over a whole sheet (`sheetMasksWithAFile`), by the
     * probe runner for the carried looks that owe a pending art-off frame
     * (`CARRIED_FILE_ART`, `scripts/layout-check.mjs`), whose own regex read
     * `url(` alone: a look whose only file mask is an `image-set()` owed no
     * frame. The runner is not run here (it needs a browser); its source is
     * held to the reader.
     */
    it('reads a file in a mask wherever it is written: a state rule, the shorthand, a keyframe, at rest, in a media block, through image-set()', () => {
        const sheet = (rule) => `.t-x {\n    --look-sheet: t-x;\n}\n\n${rule}\n\n@media (prefers-reduced-motion: reduce) {\n}\n`;
        for (const rule of [
            '.t-x .stall-name:hover { mask-image: image-set("./art/ground.svg" 1x); }',
            '.t-x .stall-name:hover { mask: image-set("./art/ground.svg" 1x) no-repeat; }',
            '@keyframes t-x-veil { from { mask-image: image-set("./art/ground.svg" 1x); } to { mask-image: none; } }',
            '.t-x .stall-name { mask-image: image-set("./art/ground.svg" 1x); }',
            '.t-x .stall-name { -webkit-mask-image: -webkit-image-set(url(./art/ground.svg) 1x); mask-image: image-set(url(./art/ground.svg) 1x); }',
            '@media (min-width: 680px) { .t-x .stall-name { clip-path: url(./art/ground.svg#c); } }',
            '.t-x .stall-name { mask-border-source: url(./art/ground.svg); }',
            '.t-x .stall-name { mask-image: var(--x, url(./art/ground.svg)); }',
            '.t-x .stall-name { mask-image: u\\72l(./art/ground.svg); }',
        ]) {
            assert.equal(sheetMasksWithAFile(sheet(rule)), true, rule);
        }
        for (const rule of [
            '.t-x .stall-name { mask-image: linear-gradient(#000, #0000); }',
            '.t-x .stall-name { clip-path: inset(0 2px); }',
            '.t-x .stall-name { background-image: url(./art/ground.svg); }',
            '@font-face { font-family: t-x-face; src: url(./art/face.woff2) format("woff2"); font-display: swap; }',
            '/* .t-x .stall-name { mask-image: url(./art/ground.svg); } */',
        ]) {
            assert.equal(sheetMasksWithAFile(sheet(rule)), false, rule);
        }
        assert.equal(masksWithAFile('mask-image', 'image-set("./a.svg" 1x)'), true);
        assert.equal(masksWithAFile('background-image', 'url(./a.svg)'), false);
    });

    it('finds a file mask in the tracked fixture’s sheet, and in no shipped look’s or the kit’s', () => {
        const fixture = PRIVATE.find((row) => row.look.source === 'fixture');
        assert.equal(sheetMasksWithAFile(fixture.css), true, 'the tracked fixture owes its frame');
        for (const sheet of LOOKS) {
            assert.equal(sheetMasksWithAFile(read(sheet.path)), false, sheet.path);
        }
        assert.equal(sheetMasksWithAFile(read('workshop/theme-workshop.css')), false);
    });

    it('is the reader the probe runner’s owed frame is computed with', () => {
        const runner = read('scripts/layout-check.mjs');
        assert.match(runner, /^import \{ sheetMasksWithAFile \} from '\.\/workshop-css\.mjs';$/m);
        assert.match(runner, /\.filter\(\(row\) => sheetMasksWithAFile\(row\.css\)\)/);
        assert.doesNotMatch(runner, /FILE_ART_IN_SHEET/, 'the url-only regex is gone');
        assert.doesNotMatch(runner, /clip-path\)\\s\*:/, 'no second reader of a mask declaration in the runner');
    });
});

describe('a-look-writes-each-url-in-the-property-that-paints-it', () => {
    /**
     * Step 8g-pre (the 8g plan's critic, P2-2): a first-party look sheet —
     * a shipped look's, the harness's fixture look's, a private look's —
     * writes every `url()` and `image-set()` in the property that paints
     * it, never in a custom property. Carried through `var()`, a file
     * switches off two belts that read the painting property's own value:
     * the art-off frames the probe owes a look whose sheet names a file in a
     * mask or a clip (`CARRIED_FILE_ART`, `scripts/layout-check.mjs`, over
     * `sheetMasksWithAFile`), and
     * the look rules' refusal of a file mask in a state rule or a keyframe.
     * Inert today: no served sheet, and not the tracked private fixture's,
     * carries the shape. Proved red on a copy of the private fixture's sheet
     * (its art is `./art/`), plainly, escaped and quoted; the kit keeps its
     * own rules, which its README states.
     */
    const WHY = /a file named in a custom property/;
    let PRIVATE_FIXTURE;
    before(() => {
        PRIVATE_FIXTURE = PRIVATE.find((row) => row.look.source === 'fixture');
    });
    const lintPrivate = (css) => lintLookSheet(css, { lookClass: PRIVATE_FIXTURE.lookClass, load: 'worn', ownArt: PRIVATE_FIXTURE.ownArt });
    const plantedPrivate = (rule) => lintPrivate(beforeReduce(PRIVATE_FIXTURE.css, rule));

    it('finds the shape in no first-party look sheet a run serves, the private looks it reads among them', () => {
        const firstParty = lookRows(SERVED).filter((sheet) => sheet.role !== 'kit');
        assert.ok(firstParty.some((sheet) => sheet.role === 'look') && firstParty.some((sheet) => sheet.role === 'private'), 'the shipped looks and a private look are read');
        for (const sheet of firstParty) {
            const options = sheet.role === 'private' ? { lookClass: sheet.lookClass, load: 'worn', ownArt: sheet.ownArt } : { lookClass: sheet.lookClass, load: sheet.load, ownArt: sheet.load === 'worn' ? ownArtOf(sheet) : undefined };
            const problems = lintLookSheet(sheet.css, options).filter((p) => WHY.test(p));
            assert.deepEqual(problems, [], sheet.path);
        }
    });

    it('refuses a file carried into a mask by var(), plainly, escaped, quoted, through image-set() and in a keyframe', () => {
        for (const rule of [
            `.${PRIVATE_FIXTURE.lookClass} .stall-name { --m: url(./art/ground.svg); mask-image: var(--m); }`,
            `.${PRIVATE_FIXTURE.lookClass} .stall-name { --m: u\\72l(./art/ground.svg); mask-image: var(--m); }`,
            `.${PRIVATE_FIXTURE.lookClass} .stall-name { --m: URL("./art/ground.svg"); mask-image: var(--m); }`,
            `.${PRIVATE_FIXTURE.lookClass} .stall-name { --m: "u\\72l(./art/ground.svg)"; }`,
            `.${PRIVATE_FIXTURE.lookClass} .stall-name { --m: image-set("./art/ground.svg" 1x); mask-image: var(--m); }`,
            `.${PRIVATE_FIXTURE.lookClass} .stall-name { --m: -webkit-image-set(url(./art/ground.svg) 1x); }`,
            `.${PRIVATE_FIXTURE.lookClass} .stall-name { --layer: linear-gradient(#000, #0000), url(./art/ground.svg); background: var(--layer); }`,
            `@keyframes ${PRIVATE_FIXTURE.lookClass}-veil { from { --m: url(./art/ground.svg); } to { --m: none; } }`,
        ]) {
            const problems = plantedPrivate(rule);
            assert.ok(problems.some((p) => WHY.test(p)), `${rule}:\n  ${problems.join('\n  ') || '(no problem)'}`);
        }
    });

    it('accepts the same file written in the property that paints it, and a custom property that names no file', () => {
        assert.deepEqual(lintPrivate(PRIVATE_FIXTURE.css), [], 'the fixture itself passes');
        assert.deepEqual(plantedPrivate(`.${PRIVATE_FIXTURE.lookClass} .stall-name { mask-image: url(./art/ground.svg); }`), []);
        assert.deepEqual(plantedPrivate(`.${PRIVATE_FIXTURE.lookClass} .stall-name { --m: linear-gradient(#000, #0000); mask-image: var(--m); }`), []);
    });

    it('leaves the kit under its own rules', () => {
        const kit = lintSheet(plantedKit('.t-neo .item-n { --m: url(art/x.svg); mask-image: var(--m); }'));
        assert.ok(!kit.some((p) => WHY.test(p)), kit.join('\n'));
    });
});

describe('a-look-names-only-a-served-face', () => {
    /**
     * The probe-fonts critic's P2-2: a look sheet could name any family, so
     * a kit look set in this machine's Georgia, or in a one-letter misspelling
     * of a served face, painted in whatever each reader's machine has while
     * `workshop:probe` printed every face loaded. A `font-family`, a `font`
     * shorthand's family and a `--s-font…` value open with `inherit`, a
     * `var(--s-font…)`, a family Stall serves (`SERVED_FAMILIES`, held to
     * `stall.css` by `every-font-family-opens-with-a-served-face`) or, in a
     * worn-only sheet, the family its own `@font-face` declares. Red by the
     * critic's two plants, in the Neo sheet and its starter.
     */
    it('refuses the critic\'s plants, shipped and kit', () => {
        plant('.t-neo .item-x { font-family: Georgia, "Comic Sans MS", serif; }', /opens with "Georgia".*\(a-look-names-only-a-served-face\)/);
        plant('.t-neo .item-x { font-family: "Stal Serif"; }', /opens with "Stal Serif".*\(a-look-names-only-a-served-face\)/);
    });

    it('refuses a stack of generics alone, a shorthand, a var and a --s-font naming another face, and a keyframe', () => {
        for (const [rule, pattern] of [
            ['.t-neo .item-x { font-family: serif; }', /opens with "serif"/],
            ['.t-neo .item-x { font: 700 14px/1 Georgia, serif; }', /font: .*opens with "Georgia"/],
            ['.t-neo .item-x { font: var(--x); }', /a font shorthand whose family this lint cannot read/],
            ['.t-neo .item-x { font-family: var(--x); }', /opens with "var\(--x\)"/],
            ['.t-neo .item-x { --s-font: Georgia, serif; }', /--s-font: .*opens with "Georgia"/],
            ['.t-neo .item-x { font-family: inherit, serif; }', /inherit stands alone/],
            ['@keyframes t-neo-face { from { font-family: Georgia; } to { font-family: inherit; } }', /opens with "Georgia"/],
        ]) {
            plant(rule, pattern);
        }
    });

    it('accepts inherit, the theme\'s own var, and every family Stall serves', () => {
        assert.deepEqual([...SERVED_FAMILIES].sort(), ['Inter', 'JetBrains Mono', 'Stall Serif']);
        for (const rule of [
            '.t-neo .item-x { font-family: inherit; }',
            '.t-neo .item-x { font-family: var(--s-font); }',
            '.t-neo .item-x { font-family: var(--s-font, serif); }',
            '.t-neo .item-x { font-family: "Stall Serif", Georgia, serif; }',
            '.t-neo .item-x { font-family: Inter, sans-serif; }',
            ".t-neo .item-x { font-family: 'JetBrains Mono', monospace; }",
            '.t-neo .item-x { font-family: stall serif; }',
            '.t-neo .item-x { font: 700 14px/1 var(--s-font); }',
            // Unquoted: a string in a shorthand is refused on its own (a string stands only in content, a font's names and features, the grid templates).
            '.t-neo .item-x { font: italic 600 1.2em / 1.4 Stall Serif, serif; }',
            '.t-neo .item-x { font: inherit; }',
        ]) {
            accepts(rule);
        }
    });

    it('accepts a worn-only sheet\'s own face there, and only there', () => {
        const art = { dir: FIXTURE_ART.dir, files: [...FIXTURE_ART.files, 'brush.woff2'] };
        const own =
            '@font-face { font-family: t-fixture-worn-brush; font-display: swap; src: url(./fixture-look/brush.woff2) format("woff2"); }\n' +
            '.t-fixture-worn .item-n { font-family: t-fixture-worn-brush, serif; }';
        assert.deepEqual(lintFixture(plantedFixture(own), art), []);
        // Named without the face that declares it, the family is a face nobody serves.
        const problems = lintFixture(plantedFixture('.t-fixture-worn .item-n { font-family: t-fixture-worn-brush, serif; }'), art);
        assert.ok(problems.some((p) => /opens with "t-fixture-worn-brush".*\(a-look-names-only-a-served-face\)/.test(p)), problems.join('\n'));
    });

    it('refuses an all that resets font-family to the browser\'s default in a first-party sheet, the canary\'s own among them, and leaves the kit under its own rules', () => {
        // The private face guards' re-review, R-1: `all: initial` puts the line in a font of the reader's machine and writes no family list for these rules to read.
        const WHY = /resets font-family to the browser's default, a font of the reader's machine/;
        const files = canaryFiles();
        const canary = { css: files['canary/sheet.css'], ownArt: { dir: 'art', files: Object.keys(files).filter((path) => path.startsWith('canary/art/') && !path.endsWith('.txt')).map((path) => path.slice('canary/art/'.length)) } };
        const lintCanary = (css) => lintLookSheet(css, { lookClass: 't-canary', load: 'worn', ownArt: canary.ownArt });
        assert.deepEqual(lintCanary(canary.css), [], 'the canary from public bytes passes');
        for (const rule of ['.t-canary .item-x { all: initial; }', ".t-canary .stall-name::after { all: initial; content: '\\25c6'; }"]) {
            const problems = lintCanary(beforeReduce(canary.css, rule));
            assert.ok(problems.some((p) => WHY.test(p)), `${rule}:\n  ${problems.join('\n  ') || '(no problem)'}`);
        }
        for (const rule of ['.t-neo .item-x { all: initial; }', '.t-neo .item-x { all: INITIAL !important; }', '.t-neo .item-x { all: var(--x); }', '@keyframes t-neo-all { to { all: initial; } }']) {
            const problems = lintLookSheet(plantedNeo(rule), { lookClass: 't-neo' });
            assert.ok(problems.some((p) => WHY.test(p)), `${rule}:\n  ${problems.join('\n  ') || '(no problem)'}`);
        }
        // `inherit` and `unset` leave font-family to inherit.
        accepts('.t-neo .item-x { all: inherit; }');
        accepts('.t-neo .item-x { all: unset; }');
        assert.ok(!lintSheet(plantedKit('.t-neo .item-x { all: initial; }')).some((p) => WHY.test(p)), 'the kit keeps the rules its README states');
    });

    it('refuses text-transform: full-width and full-size-kana in a first-party sheet, by any road, and leaves the kit under its own rules', () => {
        // The re-review's R-6: they paint the fullwidth forms and the full-size kana, which no served face draws, so the line falls to a font of the reader's machine.
        const WHY = /full-width and full-size-kana paint characters no served face draws/;
        for (const rule of [
            '.t-neo .item-x { text-transform: full-width; }',
            '.t-neo .item-x { text-transform: uppercase FULL-WIDTH; }',
            '.t-neo .item-n { text-transform: full-size-kana; }',
            // stall.css sets text-transform: var(--s-sign-case) on the sign, so the keyword in a custom property reaches it.
            '.t-neo .stall-head { --s-sign-case: full-width; }',
            '.t-neo .item-x { text-transform: var(--case, full-width); }',
            '@keyframes t-neo-case { to { text-transform: full-width; } }',
        ]) {
            const problems = lintLookSheet(plantedNeo(rule), { lookClass: 't-neo' });
            assert.ok(problems.some((p) => WHY.test(p)), `${rule}:\n  ${problems.join('\n  ') || '(no problem)'}`);
        }
        const files = canaryFiles();
        const ownArt = { dir: 'art', files: Object.keys(files).filter((path) => path.startsWith('canary/art/') && !path.endsWith('.txt')).map((path) => path.slice('canary/art/'.length)) };
        const canary = lintLookSheet(beforeReduce(files['canary/sheet.css'], '.t-canary .stall-name { text-transform: full-width; }'), { lookClass: 't-canary', load: 'worn', ownArt });
        assert.ok(canary.some((p) => WHY.test(p)), canary.join('\n'));
        accepts('.t-neo .item-x { text-transform: uppercase; }');
        accepts('.t-neo .item-x { text-transform: none; }');
        assert.ok(!lintSheet(plantedKit('.t-neo .item-x { text-transform: full-width; }')).some((p) => WHY.test(p)), 'the kit keeps the rules its README states');
    });

    it('holds every shipped look sheet, the kit and every private look sheet a run reads', () => {
        for (const sheet of LOOKS) {
            assert.deepEqual(lintLookSheet(read(sheet.path), { lookClass: sheet.lookClass }).filter((p) => /served-face/.test(p)), [], sheet.path);
        }
        assert.deepEqual(lintSheet(read('workshop/theme-workshop.css')).filter((p) => /served-face/.test(p)), []);
        for (const row of PRIVATE) {
            assert.deepEqual(
                lintLookSheet(row.css, { lookClass: row.lookClass, load: 'worn', ownArt: row.ownArt }).filter((p) => /served-face/.test(p)),
                [],
                row.path,
            );
        }
    });
});

describe('a-look-names-no-container-of-its-own', () => {
    /**
     * The 8g0 critic's P2-2. `@container` is refused in a look sheet for
     * sizing rules to a box the probe does not choose, and
     * `container-name`, `container-type` and the `container` shorthand were
     * the same door from the other side: `window.css` makes the shop
     * window's frame the one size container, named `sw`, and its
     * `@container sw` conditions and bare `cqw` / `cqh` units resolve
     * against the nearest container, so a look that made any box below the
     * frame one answered them with a box of its own. A first-party sheet's
     * rule (a shipped look's, the fixture's, a private look's); the kit
     * keeps the rules its README states.
     */
    const WHY = /would re-point the wall's container queries .* at a box the look picks/;

    it('reads the frame window.css makes the wall\'s one container, which is the premise of the refusal', () => {
        const window = read('src/ui/window.css');
        assert.match(window, /container-type:\s*size;/);
        assert.match(window, /container-name:\s*sw;/);
        assert.match(window, /@container sw \(/);
    });

    it('refuses each of the three, on any value, in any rule, on a copy of Neo under its class', () => {
        for (const rule of [
            '.t-neo.shop-window .stall-body { container-type: size; }',
            '.t-neo .item { container-type: inline-size; }',
            '.t-neo .item { container-type: normal; }',
            '.t-neo .item { container-name: sw; }',
            '.t-neo .item { container: sw / size; }',
            '.t-neo .item { container: inline-size; }',
            '.t-neo .item { Container-Type: SIZE; }',
            '.t-neo .item { container-type: size !important; }',
            '.t-neo .item { --t-neo-c: size; container-type: var(--t-neo-c); }',
            '@media (min-width: 680px) { .t-neo .item { container-type: size; } }',
            '@keyframes t-neo-box { to { container-type: size; } }',
        ]) {
            const problems = lintLookSheet(plantedNeo(rule), { lookClass: 't-neo' });
            assert.ok(problems.some((p) => WHY.test(p)), `${rule}:\n  ${problems.join('\n  ') || '(no problem)'}`);
        }
        // The sentence names the property that was written, and says what it would do.
        const problems = lintLookSheet(plantedNeo('.t-neo .item { container-name: sw; }'), { lookClass: 't-neo' });
        assert.ok(problems.some((p) => /^line \d+: container-name: sw — container-name would re-point the wall's container queries/.test(p)), problems.join('\n'));
    });

    it('leaves alone what only looks like it: a custom property, a class, the containment it is not', () => {
        accepts('.t-neo .item { --container: size; }');
        accepts('.t-neo .item-container { color: red; }');
        accepts('.t-neo .item { contain: layout; }');
        accepts('.t-neo .item { content-visibility: visible; }');
    });

    it('refuses it in a worn-only look the way it refuses it in a shipped one: the canary from public bytes', () => {
        const files = canaryFiles();
        const ownArt = { dir: 'art', files: Object.keys(files).filter((path) => path.startsWith('canary/art/') && !path.endsWith('.txt')).map((path) => path.slice('canary/art/'.length)) };
        const lintCanary = (css) => lintLookSheet(css, { lookClass: 't-canary', load: 'worn', ownArt });
        assert.deepEqual(lintCanary(files['canary/sheet.css']), [], 'the canary from public bytes passes');
        for (const rule of ['.t-canary .stall-body { container-type: size; }', '.t-canary .stall-body { container-name: sw; }', '.t-canary .stall-body { container: sw / size; }']) {
            const problems = lintCanary(beforeReduce(files['canary/sheet.css'], rule));
            assert.ok(problems.some((p) => WHY.test(p)), `${rule}:\n  ${problems.join('\n  ') || '(no problem)'}`);
        }
    });

    it('refuses it in a planted private look, read through the merged list as a build reads it', async () => {
        for (const rule of [
            `.${PLANTED_CLASS} .stall-body { container-type: size; }`,
            `.${PLANTED_CLASS} .stall-body { container-name: sw; }`,
            `.${PLANTED_CLASS} .stall-body { container: sw / size; }`,
        ]) {
            const repo = plantLooks((path, text) => (path === 'fixture/sheet.css' ? beforeReduce(text, rule) : text));
            const rows = privateRows(await servedSheets({ env: repo.selection, fixture: true, gitEnv: repo.env }));
            const row = rows.find((r) => r.lookClass === PLANTED_CLASS);
            assert.ok(row !== undefined && rows.some((r) => r.look.source === 'fixture'), 'the planted look and the fixture are both read');
            const problems = lintLookSheet(row.css, { lookClass: row.lookClass, load: 'worn', ownArt: row.ownArt });
            assert.ok(problems.some((p) => WHY.test(p)), `${rule}:\n  ${problems.join('\n  ') || '(no problem)'}`);
        }
    });

    it('finds the shape in no look sheet a run serves, and leaves the kit under its own rules', () => {
        for (const sheet of LOOKS) {
            assert.deepEqual(lintLookSheet(read(sheet.path), { lookClass: sheet.lookClass }).filter((p) => WHY.test(p)), [], sheet.path);
        }
        for (const row of PRIVATE) {
            assert.deepEqual(lintLookSheet(row.css, { lookClass: row.lookClass, load: 'worn', ownArt: row.ownArt }).filter((p) => WHY.test(p)), [], row.path);
        }
        // Not a lint but a grep over every look sheet a run serves, the harness's fixture look and the kit's skeleton among them.
        for (const row of lookRows(SERVED)) {
            assert.doesNotMatch(row.css.replace(/\/\*[\s\S]*?\*\//g, ''), /(?<![\w-])container(?:-name|-type)?\s*:/i, row.path);
        }
        // The kit keeps the rules its README states: a line there is the owner's to write.
        for (const rule of ['.t-neo .item { container-type: size; }', '.t-neo .item { container-name: sw; }', '.t-neo .item { container: sw / size; }']) {
            assert.ok(!lintSheet(plantedKit(rule)).some((p) => WHY.test(p)), `the kit, ${rule}`);
        }
    });
});
