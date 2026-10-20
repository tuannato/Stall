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
    ANGLE_CAP_DEG,
    MASK_COMPOSITE_LEGACY,
    MAX_FLASHES_PER_SECOND,
    MONEY_NODE_CLASSES,
    STATE_ALLOWED,
    STATE_ATTRIBUTES,
    STATE_OPAQUE_ROLES,
    STATE_OUTLINE_MAX_PX,
    STATE_SHADOW_MAX_PX,
    decodeEscapes,
    declarationsOf,
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

/**
 * The critic's plants (`scripts/look-lint-plants.json`), read at the module's
 * top: a describe body registers and never computes
 * (`no-node-test-computes-in-a-describe-body`).
 */
const PLANTS = JSON.parse(read('scripts/look-lint-plants.json'));
const PLANT_SETS = Object.entries(PLANTS);

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
        // The Cycle card's figure is fitted after the paint (2026-10-14,
        // `wallFit.ts`): its shape (`data-wall-wrap`) is the fit's, its size
        // the money node's inline font-size, and neither is a look's to read.
        // The step a table once wrote is gone, and is no state a look reads.
        assert.equal(STATE_ATTRIBUTES['data-wall-tier'], undefined);
        assert.equal(STATE_ATTRIBUTES['data-wall-wrap'], undefined);
        assert.ok(!PRESENCE_ATTRIBUTES.includes('data-wall-wrap'));
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

describe('a-look-never-animates-a-money-nodes-size', () => {
    /**
     * D-2026-10-19-03 (1), the owner's "as recommended" (the wall-offsize
     * critic's item 3): the wall's Cycle figure is sized by the fit's inline
     * `font-size`, which a running transition and an animation's keyframe
     * both out-rank. The fit holds transitions off while it reads
     * (`holdStill`); a first-party look sheet may not transition a size on a
     * box that may be a money node, nor name a size in any keyframe. Red: the
     * critic's two plants, and the shapes a subject reaches a money node by
     * (a role, a bare type, `:is()`, a `transition` naming no property, a
     * `var()`); green: a size transitioned on a box that is not one, a
     * pseudo-element, and every shipped sheet.
     *
     * **Widened by D-2026-10-20-07** (the wall-offsize critic's re-review,
     * item 5): the same rule refuses `letter-spacing`, `word-spacing`,
     * `zoom` and `scale` by name, and `transform` when it scales — a keyframe
     * on `letter-spacing` (0 to 0.12em) or `zoom` (1 to 1.25) of
     * `.t-neo.shop-window .item-x` passed the font-size-only rule and moved
     * the figure 44–97px past its column. Each case below is red on the old
     * rule (the rule at b6a9e91, run by hand: a keyframe naming only
     * `font-size` or `font`, a transition naming only `font-size`, `font` or
     * `all`), green on the new one.
     */
    const MOVES = /may be a money node — the wall fits its figure by its size/;
    const KEYFRAME = /animates font(?:-size)? — any box a rule runs it on, a money node among them/;
    const KEYFRAME_OF = (what) => new RegExp(`animates ${what} — any box a rule runs it on, a money node among them`);
    const refusesPlant = (rule, pattern) => {
        const shipped = lintLookSheet(plantedNeo(rule), { lookClass: 't-neo' });
        assert.ok(shipped.some((p) => pattern.test(p)), `${rule}:\n  ${shipped.join('\n  ') || '(no problem)'}`);
    };
    it('refuses the critic\'s two plants', () => {
        for (const [rule, pattern] of [
            ['.t-neo.shop-window .item-x { transition: all .4s; }', MOVES],
            ['@keyframes t-neo-grow { from { font-size: 40px; } to { font-size: 64px; } }\n.t-neo.shop-window .item-x { animation: t-neo-grow 2s infinite; }', KEYFRAME],
        ]) {
            const shipped = lintLookSheet(plantedNeo(rule), { lookClass: 't-neo' });
            assert.ok(shipped.some((p) => pattern.test(p)), `${rule}:\n  ${shipped.join('\n  ') || '(no problem)'}`);
        }
    });

    it('refuses every shape a size transition reaches a money node by, and a size in any keyframe', () => {
        for (const rule of [
            '.t-neo .item-x { transition: font-size 0.4s ease; }',
            '.t-neo [data-role="seller-price"] { transition-property: font-size; }',
            '.t-neo .row.big dd { transition: font 0.2s; }',
            '.t-neo .item-a span { transition: all 0.2s; }',
            '.t-neo .item-a > * { transition: 0.3s; }',
            '.t-neo :is(.item-x, .bc-p) { transition: all 0.2s; }',
            '.t-neo .x { transition-property: var(--moves); }',
            '.t-neo .buy { transition: background 0.2s, font-size 0.2s; }',
            '.t-neo .item-x { transition-property: inherit; }',
        ]) {
            const shipped = lintLookSheet(plantedNeo(rule), { lookClass: 't-neo' });
            assert.ok(shipped.some((p) => MOVES.test(p)), `${rule}:\n  ${shipped.join('\n  ') || '(no problem)'}`);
        }
        const shipped = lintLookSheet(plantedNeo('@keyframes t-neo-pop { 50% { font: 700 30px Inter; } }'), { lookClass: 't-neo' });
        assert.ok(shipped.some((p) => KEYFRAME.test(p)), shipped.join('\n'));
    });

    it('refuses the critic\'s two plants of D-2026-10-20-07: a letter-spacing and a zoom keyframe on the money node', () => {
        refusesPlant(
            '@keyframes t-neo-track { from { letter-spacing: 0; } to { letter-spacing: 0.12em; } }\n.t-neo.shop-window .item-x { animation: t-neo-track 2s infinite; }',
            KEYFRAME_OF('letter-spacing'),
        );
        refusesPlant(
            '@keyframes t-neo-zoom { from { zoom: 1; } to { zoom: 1.25; } }\n.t-neo.shop-window .item-x { animation: t-neo-zoom 2s infinite; }',
            KEYFRAME_OF('zoom'),
        );
    });

    it('refuses word-spacing and scale in a keyframe, and a transform that scales however it is written', () => {
        refusesPlant('@keyframes t-neo-gap { from { word-spacing: 0; } to { word-spacing: 0.5em; } }', KEYFRAME_OF('word-spacing'));
        refusesPlant('@keyframes t-neo-grow { from { scale: 1; } to { scale: 1.2; } }', KEYFRAME_OF('scale \\(scale 1.2 scales it\\)'));
        refusesPlant('@keyframes t-neo-grow { from { scale: 100%; } to { scale: 125% 125%; } }', KEYFRAME_OF('scale \\(scale 1.25 scales it\\)'));
        for (const stop of [
            'transform: scale(1.25)',
            'transform: scale(1.2, 0.8)',
            'transform: translateY(2px) scaleX(1.1)',
            'transform: scale(-1)',
            'transform: matrix(1.2, 0, 0, 1.2, 0, 0)',
            'transform: rotateY(80deg)',
            'transform: perspective(300px) translateZ(40px)',
            'transform: var(--pop)',
            'transform: inherit',
            'transform: pop(2)',
            'rotate: y 80deg',
            'rotate: var(--r)',
            'scale: var(--s)',
        ]) {
            refusesPlant(`@keyframes t-neo-pop { from { transform: none; } to { ${stop}; } }`, KEYFRAME_OF('(?:transform|rotate|scale) \\(.*\\)'));
        }
        // The vendor alias is the same property: the twin rule asks for both, the size rule reads either.
        refusesPlant(
            '@keyframes t-neo-pop { to { -webkit-transform: scale(1.3); transform: scale(1.3); } }',
            KEYFRAME_OF('-webkit-transform \\(scale 1.3 scales it\\)'),
        );
    });

    it('refuses a transition of letter-spacing, word-spacing, zoom or scale on every shape a money node is reached by', () => {
        for (const name of ['letter-spacing', 'word-spacing', 'zoom', 'scale']) {
            for (const rule of [
                `.t-neo .item-x { transition: ${name} 0.4s ease; }`,
                `.t-neo [data-role="seller-price"] { transition-property: ${name}; }`,
                `.t-neo .row.big dd { transition: color 0.2s, ${name} 0.2s linear; }`,
                `.t-neo .buy { transition: ${name} 0.2s cubic-bezier(0.2, 0, 0, 1) 0.1s; }`,
                `.t-neo :is(.item-x, .bc-p) { transition-property: opacity, ${name}; }`,
            ]) {
                refusesPlant(rule, MOVES);
            }
        }
        // A property the lint cannot read is `all`, which covers every name above.
        refusesPlant('.t-neo .item-x { transition-property: var(--moves); }', MOVES);
        refusesPlant('.t-neo .item-x { transition: letter-spacing 0.2s, var(--more); }', MOVES);
    });

    it('reads a transition\'s time as CSS reads a number: a sign and an exponent do not make it a property name (P1.2)', () => {
        // Red on the old rule: `^-?[\\d.]+m?s$` took "+.4s" and "1e3ms" for the property, which no list names.
        for (const rule of [
            '.t-neo .item-x { transition: +.4s letter-spacing; }',
            '.t-neo .item-x { transition: 1e3ms letter-spacing; }',
            '.t-neo .item-x { transition: +.4s font-size; }',
            '.t-neo .item-x { transition: 4E-1s zoom; }',
            '.t-neo .item-x { transition: letter-spacing 1e3ms +.1s ease; }',
            '.t-neo .item-x { transition: color 1s, +.4s word-spacing; }',
            '.t-neo .item-x { -webkit-transition: +.4s scale; transition: +.4s scale; }',
        ]) {
            refusesPlant(rule, MOVES);
        }
        // The same time in front of a property that moves no width stands.
        for (const rule of ['.t-neo .item-x { transition: +.4s color; }', '.t-neo .item-x { transition: 1e3ms opacity +.1s ease-in; }', '.t-neo .item-x { transition: 4E-1s background-color; }']) {
            accepts(rule);
        }
    });

    it('refuses a custom property in a keyframe, which every check that reads the names a keyframe sets passes (P2.4)', () => {
        const CUSTOM = /a custom property in a keyframe/;
        // The critic's plant: a rule reads --g as the figure's letter-spacing.
        refusesPlant('@keyframes t-neo-g { 0% { --g: 0em; } 100% { --g: .3em; } }\n.t-neo .item-x { letter-spacing: var(--g); animation: t-neo-g 2s infinite; }', CUSTOM);
        refusesPlant('@keyframes t-neo-g { to { --s-price-clip: inset(0 100% 0 0); } }', CUSTOM);
        refusesPlant('@media (min-width: 680px) { @keyframes t-neo-g { to { --g: 1; } } }', CUSTOM);
        // Nothing a first-party look sheet a run serves does it, nor sets one under a state: the belt costs the tree nothing.
        for (const sheet of lookRows(SERVED).filter((row) => row.role !== 'kit')) {
            const options = sheet.role === 'private' ? { lookClass: sheet.lookClass, load: 'worn', ownArt: sheet.ownArt } : { lookClass: sheet.lookClass, load: sheet.load, ownArt: sheet.load === 'worn' ? ownArtOf(sheet) : undefined };
            const problems = lintLookSheet(sheet.css, options).filter((p) => CUSTOM.test(p) || /a custom property set under a state/.test(p));
            assert.deepEqual(problems, [], sheet.path);
        }
        // The kit keeps the rules its README states.
        assert.ok(!lintSheet(plantedKit('@keyframes t-neo-g { 0% { --g: 0em; } 100% { --g: .3em; } }')).some((p) => CUSTOM.test(p)));
    });

    it('reads a matrix that shears or mirrors, and a skew, as more than a turn and a shift (B1)', () => {
        // Red on the old rule: scalingOf read the columns' lengths alone, so these passed a docblock that said they did not.
        for (const [stop, what] of [
            ['transform: matrix(0.6, 0.8, 0.8, 0.6, 0, 0)', 'a matrix shears it'],
            ['transform: matrix(1, 0, 0, -1, 0, 0)', 'a matrix mirrors it'],
            ['transform: matrix(-1, 0, 0, 1, 0, 0)', 'a matrix mirrors it'],
            ['transform: matrix(1, 0, 0.5, 1, 0, 0)', 'a matrix scales it'],
            ['transform: skewX(60deg)', 'a skew shears it'],
            ['transform: translateY(1px) skewY(3deg)', 'a skew shears it'],
            ['transform: skew(2deg, 1deg)', 'a skew shears it'],
        ]) {
            refusesPlant(`@keyframes t-neo-pop { to { ${stop}; } }`, KEYFRAME_OF(`transform \\(${what}\\)`));
        }
        // A pure turn and shift stands, however it is written.
        accepts('@keyframes t-neo-spin { to { transform: matrix(0.866, 0.5, -0.5, 0.866, 10, -4); } }');
        accepts('@keyframes t-neo-spin { to { transform: matrix(1, 0, 0, 1, 0, 0); } }');
        // And a shear in a transition's end state makes a transform transition one of a size.
        refusesPlant('.t-neo .item-x { transition: transform 0.3s; }\n.t-neo .item-x[data-price-tier="2"] { transform: matrix(0.6, 0.8, 0.8, 0.6, 0, 0); }', MOVES);
        refusesPlant('.t-neo .item-x { transition: transform 0.3s; }\n.t-neo .item-x[data-price-tier="2"] { transform: skewX(20deg); }', MOVES);
    });

    it('refuses a transition of transform only where the sheet scales (a transition names a property, not its end value)', () => {
        const SCALING = [
            '.t-neo .item-x[data-price-tier="2"] { transform: scale(0.8); }',
            '@media (min-width: 680px) { .t-neo .item-x { transform: matrix(1.1, 0, 0, 1.1, 0, 0); } }',
            '.t-neo .item-x:hover { transform: var(--lift); }',
            '.t-neo .item-x { -webkit-transform: rotateY(60deg); transform: rotateY(60deg); }',
        ];
        for (const scaling of SCALING) {
            refusesPlant(`.t-neo .item-x { transition: transform 0.3s; }\n${scaling}`, MOVES);
            refusesPlant(`.t-neo .item-x { -webkit-transition: -webkit-transform 0.3s; transition: transform 0.3s; }\n${scaling}`, MOVES);
        }
        // Turning or shifting is not a size: with no scaling anywhere in the sheet the same transition stands.
        accepts('.t-neo .item-x { transition: transform 0.3s; }');
        // (A state-free selector: a state may set no transform but the identity, which is the belt's, below.)
        accepts('.t-neo .item-x { transition: transform 0.3s; }\n.t-neo .item-x[data-price-tier="2"] { transform: rotate(3deg) translateY(-1px); }');
        accepts('.t-neo .buy { transition: transform 0.3s; }\n.t-neo .buy[disabled] { transform: translateX(2px) rotate(-4deg); }');
        accepts('.t-neo .buy { transition: transform 0.3s; }\n.t-neo .buy[disabled] { transform: translate3d(2px, 0, 0) rotate(-4deg); }');
        // A scaling transform on a box that transitions nothing of the kind is not a money node's size moving.
        accepts('.t-neo .tool { transition: transform 0.3s; }\n.t-neo .tool:first-child { transform: scale(1.1); }');
        accepts('.t-neo .item-x { transition: color 0.3s; }\n.t-neo .item-x:first-child { transform: scale(1.1); }');
    });

    it('leaves a keyframe that only turns or shifts, and an identity, alone', () => {
        accepts('@keyframes t-neo-swing { 0%, 100% { transform: rotate(-0.6deg); } 50% { transform: rotate(0.6deg); } }\n.t-neo .stall-head { animation: t-neo-swing 7s infinite; }');
        accepts('@keyframes t-neo-lift { from { transform: translateY(0); } to { transform: translate(2px, -3px) rotate(4deg); } }');
        accepts('@keyframes t-neo-turn { from { rotate: 0deg; } to { rotate: z 8deg; } }');
        accepts('@keyframes t-neo-slide { from { translate: 0 0; } to { translate: 4px -2px; } }');
        accepts('@keyframes t-neo-still { from { transform: none; scale: 1; } to { transform: scale(1) matrix(1, 0, 0, 1, 4, 0); scale: 100%; } }');
        accepts('@keyframes t-neo-spin { to { transform: matrix(0.5, 0.866, -0.866, 0.5, 0, 0); } }');
    });

    it('leaves a size moving on a box that is not a money node, and every other transition, alone', () => {
        accepts('.t-neo .tool { transition: all 0.2s; }');
        accepts('.t-neo .stall-name { transition: font-size 0.2s; }');
        accepts('.t-neo .item-x::after { transition: all 0.2s; }');
        accepts('.t-neo .tool { transition: letter-spacing 0.2s, word-spacing 0.2s, zoom 0.2s, scale 0.2s; }');
        accepts('.t-neo .item-x::after { transition: letter-spacing 0.2s, zoom 0.2s; }');
        accepts('.t-neo .item-x { transition: translate 0.2s, rotate 0.2s, opacity 0.2s; }');
        accepts('.t-neo .item-x { transition: color 0.2s, background 0.2s; }');
        accepts('.t-neo .buy { transition: none; }');
        accepts('@keyframes t-neo-glow { from { opacity: 0.5; } to { opacity: 1; } }');
    });

    it('reads a custom property in a transition list as all (P3-6): a registered one animates by its type and may drive any width', () => {
        for (const rule of [
            '.t-neo .item-x { transition: --au-tide 1s; }',
            '.t-neo .item-x { transition: color 1s, --au-tide 1s ease; }',
            '.t-neo .item-x { transition: 1s --g; }',
            '.t-neo .item-x { transition-property: --au-tide; }',
            '.t-neo .item-x { transition-property: color, --au-tide; }',
            '.t-neo .item-x { -webkit-transition: --au-tide 1s; transition: --au-tide 1s; }',
        ]) {
            refusesPlant(rule, MOVES);
        }
        accepts('.t-neo .tool { transition: --au-tide 1s; }');
    });

    /**
     * The classes a money node wears (P2-4): `MONEY_NODE_CLASSES` is read by
     * the transition rule, so a class missing from it is a rule read as a
     * box that is no money node. Two sources, both read from the tree: the
     * class selectors `layout/moneySet.ts` names, and every node
     * `src/ui/*.ts` gives a role of `MONEY_SET` (`el('tag', 'classes')`, then
     * `.setAttribute('data-role', …)`). A node built another way — a class
     * name passed in as an argument — is read by neither, and
     * `quote-surcharge` (passed to `quoteSurchargeLine`'s node) is listed by
     * hand. Shared with other boxes and so not listed: `fine`, `mini`,
     * `pay-sub`.
     */
    const SHARED_WITH_OTHER_BOXES = ['fine', 'mini', 'pay-sub'];
    const moneyRoles = () => [...read('layout/moneySet.ts').matchAll(/\[data-role="([^"]+)"\]/g)].map((m) => m[1]);
    const moneyNodesInTheApp = () => {
        const roles = moneyRoles();
        const found = [];
        for (const name of readdirSync(join(ROOT, 'src/ui')).filter((n) => n.endsWith('.ts') && !n.endsWith('.test.ts'))) {
            const src = read(`src/ui/${name}`);
            for (const m of src.matchAll(/(\w+)\.setAttribute\('data-role',\s*'([^']+)'\)/g)) {
                if (!roles.includes(m[2])) continue;
                const before = src.slice(0, m.index);
                const decl = [...before.matchAll(new RegExp(`(?:const|let)\\s+${m[1]}\\s*=\\s*([^;]*?);`, 'gs'))].pop();
                const made = decl === undefined ? null : /^el\(\s*(?:'[\w-]+'|\w+)\s*,\s*(?:'([^']*)'|undefined)/s.exec(decl[1].trim());
                if (made !== null) found.push({ file: name, role: m[2], classes: (made[1] ?? '').split(/\s+/).filter(Boolean) });
            }
        }
        return found;
    };

    it('the-money-node-classes-are-the-classes-of-the-money-nodes: MONEY_SET\'s own classes, and every class of a node the app gives a money role', () => {
        // The critic's five, and by value.
        for (const cls of ['listing-x', 'tk-x', 'pay-eq', 'pay-total', 'pay-btn']) assert.ok(MONEY_NODE_CLASSES.includes(cls), cls);
        assert.equal(new Set(MONEY_NODE_CLASSES).size, MONEY_NODE_CLASSES.length);
        assert.deepEqual([...MONEY_NODE_CLASSES], [...MONEY_NODE_CLASSES].sort(), 'listed in order');
        // 1. The class selectors MONEY_SET names (its last compound); `.row.big dd` is a `dd`, read by its type.
        const literals = [...read('layout/moneySet.ts').matchAll(/^\s*'([^']+)',\s*$/gm)].map((m) => m[1]);
        assert.ok(literals.length >= 20, 'MONEY_SET parsed whole');
        for (const literal of literals.filter((l) => !l.includes('[data-role'))) {
            const subject = literal.split(' ').pop();
            for (const [, cls] of subject.matchAll(/\.([\w-]+)/g)) {
                if (subject === literal || literal.split(' ').length === 1) assert.ok(MONEY_NODE_CLASSES.includes(cls), `${literal}: ${cls}`);
            }
            if (/^[a-z]+$/.test(subject)) refusesPlant(`.t-neo ${literal} { transition: font-size 1s; }`, MOVES);
        }
        // 2. Every class of a node the sources give a money role.
        const nodes = moneyNodesInTheApp();
        assert.ok(nodes.length >= 30, `the scan reads ${nodes.length} money nodes: it has gone blind`);
        assert.ok(new Set(nodes.map((n) => n.role)).size >= 12, 'the scan reads the roles of MONEY_SET');
        for (const node of nodes) {
            for (const cls of node.classes) {
                assert.ok(MONEY_NODE_CLASSES.includes(cls) || SHARED_WITH_OTHER_BOXES.includes(cls), `${node.file}: a node of the role ${node.role} wears .${cls}, which MONEY_NODE_CLASSES lacks`);
            }
        }
        // Every listed class is one the sources use (a typo here guards nothing).
        const used = read('src/ui/render.ts') + read('src/ui/window.ts') + read('src/ui/broadcast.ts');
        for (const cls of MONEY_NODE_CLASSES) assert.ok(new RegExp(`['" ]${cls}['" ]`).test(used), `${cls} is in none of render.ts, window.ts and broadcast.ts`);
    });

    it('reads a transition on every money class the app has, by its class alone (P2-4)', () => {
        for (const cls of MONEY_NODE_CLASSES) {
            refusesPlant(`.t-neo .${cls} { transition: letter-spacing 1s; }`, MOVES);
            refusesPlant(`.t-neo .stall .${cls}:hover { transition: font-size 1s; }`, MOVES);
        }
        for (const cls of ['listing-x', 'tk-x', 'pay-eq', 'pay-total', 'pay-btn']) refusesPlant(`.t-neo .${cls} { transition: zoom 1s; }`, MOVES);
        // The shared classes name no money node alone.
        for (const cls of SHARED_WITH_OTHER_BOXES) accepts(`.t-neo .${cls} { transition: letter-spacing 1s; }`);
    });

    it('leaves the kit lint as it was: a kit rule is a line of the workshop README', () => {
        const kit = lintSheet(plantedKit('.t-neo.shop-window .item-x { transition: all .4s; }'));
        assert.ok(!kit.some((p) => MOVES.test(p)), kit.join('\n'));
        for (const rule of [
            '.t-neo.shop-window .item-x { transition: letter-spacing .4s, zoom .4s, scale .4s; }',
            '@keyframes wk-track { from { letter-spacing: 0; } to { letter-spacing: 0.12em; } }\n.t-neo.shop-window .item-x { animation: wk-track 2s infinite; }',
            '@keyframes wk-zoom { from { zoom: 1; } to { zoom: 1.25; } }',
            '@keyframes wk-grow { to { transform: scale(1.2); scale: 1.2; } }',
        ]) {
            const widened = lintSheet(plantedKit(rule));
            assert.ok(!widened.some((p) => MOVES.test(p) || /animates (?:letter-spacing|zoom|transform|scale)/.test(p)), `kit, ${rule}:\n  ${widened.join('\n  ')}`);
        }
    });
});

describe('a-look-state-rule-sets-only-what-a-state-may', () => {
    /**
     * D-2026-10-20-08 (the owner, "Ok b"): the probe measures every screen at
     * rest and paints no hover, no focus, no press and no turned wall, so a
     * first-party look sheet's rule whose selector names a state (:hover,
     * :focus, :focus-visible, :focus-within, :active, :target, :user-invalid,
     * :autofill, :modal, [data-turn], anywhere in the selector) sets colour,
     * ground, border colour and style, shadow, cursor, outline, transitions
     * and the no-transform values, and nothing else. It replaced a blocklist
     * (D5 (a) of D-2026-10-20-06) that the lint-belts critic found a hole in
     * on each of three rounds. All 16 state rules the shipped looks have
     * (Modern 5, Neo 5, Rural 6) are inside the list, and the list's every
     * reader is proved by the plants below. First party only: the workshop
     * README says a pointer's hover is Stall's at intake, not the kit's, so
     * the kit lint is unchanged. Red: the belt taken out of lintLook (every
     * refusal below fails, and the sixteen pass), and each refusal on its own
     * by the plants.
     */
    const BELT = /under ".+" — .+; the probe measures every screen at rest and paints no hover, focus, press or turned wall/;
    const sheetOf = (cls) => LOOKS.find((s) => s.lookClass === cls);
    const plantedIn = (cls, rule) => {
        const css = read(sheetOf(cls).path);
        const at = css.lastIndexOf('@media (prefers-reduced-motion: reduce)');
        return `${css.slice(0, at)}${rule}\n\n${css.slice(at)}`;
    };
    const problemsOf = (rule) => lintLookSheet(plantedNeo(rule), { lookClass: 't-neo' });
    /** The rule is refused, and by a sentence the pattern reads. */
    const refused = (rule, pattern = BELT) => {
        const problems = problemsOf(rule);
        assert.ok(problems.some((p) => pattern.test(p)), `${rule}:\n  ${problems.join('\n  ') || '(no problem)'}`);
        return problems;
    };
    const refusedIn = (cls, rule, pattern = BELT) => {
        const problems = lintLookSheet(plantedIn(cls, rule), { lookClass: cls });
        assert.ok(problems.some((p) => pattern.test(p)), `${cls}: ${rule}:\n  ${problems.join('\n  ') || '(no problem)'}`);
    };
    /** Refused by the sentence that names this property as one a state may not set. */
    const refusedProperty = (rule, prop) => {
        const problems = problemsOf(rule);
        const re = new RegExp(`^${prop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}: .* under ".+" — [\\w-]+ is not a property a state rule may set`);
        assert.ok(problems.some((p) => re.test(p.replace(/^line \d+: /, ''))), `${rule}:\n  ${problems.join('\n  ') || '(no problem)'}`);
    };
    /** Refused by the belt, on a declaration of this property (a value one of its readers reads, not a property the list lacks). */
    const refusedUnder = (rule, prop) => {
        const problems = problemsOf(rule);
        const re = new RegExp(`^line \\d+: ${prop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}: .* under ".+" — `);
        assert.ok(problems.some((p) => re.test(p) && BELT.test(p)), `${rule}:\n  ${problems.join('\n  ') || '(no problem)'}`);
    };
    const accepted = (rule) => assert.deepEqual(problemsOf(rule), [], rule);

    const STATE_ALLOWED_PINNED = [
        'color',
        'background',
        'background-color',
        'background-image',
        'border',
        'border-top',
        'border-right',
        'border-bottom',
        'border-left',
        'border-color',
        'border-top-color',
        'border-right-color',
        'border-bottom-color',
        'border-left-color',
        'border-block-color',
        'border-inline-color',
        'border-block-start-color',
        'border-block-end-color',
        'border-inline-start-color',
        'border-inline-end-color',
        'border-style',
        'border-top-style',
        'border-right-style',
        'border-bottom-style',
        'border-left-style',
        'border-block-style',
        'border-inline-style',
        'border-block-start-style',
        'border-block-end-style',
        'border-inline-start-style',
        'border-inline-end-style',
        'box-shadow',
        'cursor',
        'transform',
        'rotate',
        'scale',
        'translate',
        'outline',
        'outline-color',
        'outline-style',
        'outline-width',
        'outline-offset',
        'transition',
        'transition-property',
        'transition-duration',
        'transition-delay',
        'transition-timing-function',
        'transition-behavior',
        '-webkit-tap-highlight-color',
    ];
    const OPAQUE_PINNED = ['--s-bg', '--s-surface', '--s-text', '--s-shade', '--s-muted', '--s-accent', '--s-danger', '--s-accent-2'];

    it('pins what a state may set, the opaque palette roles and the two reaches, by value', () => {
        assert.deepEqual([...STATE_ALLOWED], STATE_ALLOWED_PINNED);
        assert.deepEqual([...STATE_OPAQUE_ROLES], OPAQUE_PINNED);
        assert.equal(STATE_OUTLINE_MAX_PX, 8);
        assert.equal(STATE_SHADOW_MAX_PX, 8);
        assert.equal(new Set(STATE_ALLOWED).size, STATE_ALLOWED.length, 'no property twice');
        // Every listed property has a reader: none is refused as a property a state may not set.
        for (const prop of STATE_ALLOWED) {
            const decl = prop === '-webkit-tap-highlight-color' ? `${prop}: transparent` : written(prop, 'inherit');
            const problems = problemsOf(`.t-neo .item:hover { ${decl}; }`);
            assert.ok(!problems.some((p) => /is not a property a state rule may set/.test(p)), `${prop}:\n  ${problems.join('\n  ')}`);
        }
        // And one that is not listed is: the list is the whole of it.
        for (const prop of ['border-width', 'font-size', 'opacity', 'caret-color', 'border-image', 'text-decoration-color']) {
            assert.ok(!STATE_ALLOWED.includes(prop), prop);
            refusedProperty(`.t-neo .item:hover { ${prop}: inherit; }`, prop);
        }
    });

    /** The 16 state rules the shipped looks have, each with the properties it sets: what it is to be inside the list. */
    const SIXTEEN = [
        ['t-modern', '.t-modern .tagline-invite:hover', ['background', 'border-color']],
        ['t-modern', '.t-modern .notice-invite:hover', ['background', 'border-color']],
        ['t-modern', '.t-modern .cta:hover', ['background']],
        ['t-modern', '.t-modern .mini:hover', ['background', 'border-color', 'color']],
        ['t-modern', '.t-modern .tab:hover', ['background']],
        ['t-neo', '.t-neo .mini:hover', ['background', 'box-shadow']],
        ['t-neo', '.t-neo .tab:hover', ['color']],
        ['t-neo', '.t-neo .tagline-invite:hover', ['background', 'border-color']],
        ['t-neo', '.t-neo .notice-invite:hover', ['background', 'border-color']],
        ['t-neo', '.t-neo .cta:hover', ['box-shadow']],
        ['t-rural', '.t-rural .mini:hover', ['background', 'color']],
        ['t-rural', '.t-rural .tab:hover', ['color']],
        ['t-rural', '.t-rural .tagline-invite:hover', ['background', 'border-color']],
        ['t-rural', '.t-rural .notice-invite:hover', ['background', 'border-color']],
        ['t-rural', '.t-rural .cta:hover', ['background']],
        ['t-rural', '.t-rural .items .item:hover, .t-rural .items .item.open', ['rotate']],
    ];

    it('takes all 16 shipped state rules, shows each sets only what a state may, and reads each of them', () => {
        assert.equal(SIXTEEN.length, 16);
        // No seventeenth: every rule of the three sheets whose selector names a state is one of these.
        const stateWords = /:(?:hover|focus|focus-visible|focus-within|active|target|user-invalid|autofill|modal)(?![\w-])|\[\s*data-turn/i;
        let found = 0;
        for (const cls of ['t-modern', 't-neo', 't-rural']) {
            const walk = (nodes) => {
                for (const node of nodes) {
                    if (node.kind === 'rule' && stateWords.test(node.prelude)) found += 1;
                    else if (node.children !== undefined) walk(node.children);
                }
            };
            walk(parseSheet(read(sheetOf(cls).path)).nodes);
        }
        assert.equal(found, 16, 'a seventeenth state rule is in a shipped sheet: add it here, and say what it sets');
        for (const [cls, selector, props] of SIXTEEN) {
            const css = read(sheetOf(cls).path);
            const { text, nodes } = parseSheet(css);
            assert.equal(text.length, css.length, "the parse keeps the sheet's offsets");
            const rule = nodes.find((n) => n.kind === 'rule' && n.prelude.replace(/\s+/g, ' ') === selector);
            assert.ok(rule !== undefined, `${cls} has no rule ${selector}`);
            const set = declarationsOf(rule.body).map((d) => d.prop);
            assert.deepEqual(set, props, `${selector} sets exactly these`);
            for (const prop of set) assert.ok(STATE_ALLOWED.includes(prop), `${selector}: ${prop} is on the list`);
            assert.deepEqual(lintLookSheet(css, { lookClass: cls }), [], `${cls}, as shipped`);
            // The belt reads this very rule: the same rule with one property more is refused, by name.
            const faded = `${css.slice(0, rule.end - 1)}\n    opacity: 0.2;\n${css.slice(rule.end - 1)}`;
            const problems = lintLookSheet(faded, { lookClass: cls });
            assert.ok(problems.some((p) => /opacity: 0\.2 under .* — opacity is not a property a state rule may set/.test(p)), `${cls}, ${selector}:\n  ${problems.join('\n  ') || '(no problem)'}`);
        }
    });

    it('refuses the owner\'s plants: a clip on Modern\'s price, a fade under Neo\'s focus, a filter under a turned wall on Rural', () => {
        refusedIn('t-modern', '.t-modern .item-x:hover { clip-path: inset(0 50% 0 0); }');
        refusedIn('t-neo', '.t-neo .pay-x:focus-within { opacity: .2; }');
        refusedIn('t-rural', '.t-rural [data-turn] .item-p { filter: blur(4px); }');
    });

    const NAMED_STATES = [':hover', ':focus', ':focus-visible', ':focus-within', ':active', ':target', ':user-invalid', ':autofill', ':modal'];

    it('reads every state the owner named, anywhere in the selector: inside :is(), :where(), :has() and :not(), in a list, in capitals, in a media block', () => {
        for (const state of [...NAMED_STATES, ...NAMED_STATES.map((s) => s.toUpperCase())]) {
            for (const subject of [
                `.t-neo .item-x${state}`,
                `.t-neo .item${state} .item-x`,
                `.t-neo .item:is(${state}, .open) .item-x`,
                `.t-neo .item:where(${state}) .item-x`,
                `.t-neo .item:has(${state}) .item-x`,
                `.t-neo .item:not(${state}) .item-x`,
                `.t-neo .item-x:not(:is(${state}))`,
                `.t-neo .item-x, .t-neo .item-x${state}`,
                `.t-neo .item-x${state}::after`,
            ]) {
                refusedProperty(`${subject} { opacity: 0.2; }`, 'opacity');
            }
        }
        for (const subject of [
            '.t-neo [data-turn] .item-x',
            '.t-neo .item-x[data-turn="cw"]',
            ".t-neo [DATA-TURN='ccw'] .item-x",
            '.t-neo[data-turn] .item-x',
            '.t-neo:is([data-turn]) .item-x',
            '.t-neo:not([data-turn]) .item-x',
            '.t-neo :has([ data-turn ]) .item-x',
        ]) {
            refusedProperty(`${subject} { opacity: 0.2; }`, 'opacity');
        }
        refusedProperty('@media (min-width: 680px) { .t-neo .item-x:hover { filter: blur(2px); } }', 'filter');
        refusedUnder('@media (max-width: 679.98px) { .t-neo .buy:active { transform: scale(0.9); } }', 'transform');
        // A state this list does not name is the stated gap: it is read as a rule at rest, which the probe measures.
        for (const state of [':checked', ':open', ':popover-open', ':visited', ':any-link', ':fullscreen', ':disabled', ':first-child', "[aria-pressed='true']"]) {
            accepted(`.t-neo .item-x${state} { opacity: 0.2; }`);
        }
    });

    /** What no state may set, named so their tests stay. Each is refused by name, at every state, on a figure, a holder and a pseudo-element. */
    const REFUSED = [
        'all: inherit',
        'all: unset',
        'all: initial',
        '--s-price-clip: inset(0 100% 0 0)',
        '--anything: 0',
        'animation: t-neo-x 1s',
        'animation-name: t-neo-x',
        'animation-name: inherit',
        'animation-name: none',
        'animation: unset',
        'animation-duration: 1s',
        'animation-composition: add',
        'animation-play-state: running',
        'content: ""',
        'position: relative',
        'position: absolute',
        'z-index: 0',
        'z-index: 9',
        'display: none',
        'display: block',
        'top: 1px',
        'left: -9999px',
        'inset: 0',
        'font-size: 0',
        'font-size: 12px',
        'font: 700 30px Inter',
        'font-weight: 700',
        'font-family: inherit',
        'line-height: 0',
        'letter-spacing: 0',
        'letter-spacing: -1em',
        'word-spacing: 0',
        'text-indent: 0',
        'text-indent: -9999px',
        'text-transform: uppercase',
        'text-shadow: 0 0 1px red',
        'text-align: center',
        'white-space: nowrap',
        'padding: 0',
        'padding-left: 9999px',
        'margin: 0',
        'margin-left: -9999px',
        'width: 0',
        'height: 0',
        'min-width: 0',
        'max-width: 0',
        'border-width: 40px',
        'border-left-width: 1px',
        'border-radius: 0',
        'border-image: linear-gradient(red, blue) 1',
        'border-image-outset: 9999px',
        'opacity: 1',
        'opacity: 0.2',
        'visibility: visible',
        'visibility: hidden',
        'filter: none',
        'filter: blur(4px)',
        'backdrop-filter: blur(4px)',
        'backdrop-filter: none',
        'clip-path: none',
        'clip-path: inset(0 50% 0 0)',
        'clip: auto',
        'mask: none',
        'mask-image: none',
        'mask-image: linear-gradient(#000, transparent)',
        'mix-blend-mode: normal',
        'mix-blend-mode: difference',
        'background-blend-mode: normal',
        'text-decoration: none',
        'text-decoration: underline',
        'text-decoration-line: underline',
        'text-decoration-line: line-through',
        'text-decoration-thickness: 1em',
        'text-decoration-color: red',
        'text-underline-offset: 2px',
        'zoom: 1',
        'zoom: 0.01',
        'writing-mode: horizontal-tb',
        'writing-mode: vertical-rl',
        'font-size-adjust: none',
        'font-size-adjust: 0.01',
        'line-clamp: 2',
        'offset-path: none',
        "offset-path: path('M 0 0 L 1 0')",
        'offset-rotate: 180deg',
        "offset: path('M 0 0 L 1 0') 0 180deg",
        'overflow: hidden',
        'contain: paint',
        'isolation: isolate',
        'fill: red',
        'stroke: red',
        'caret-color: red',
        'accent-color: red',
        'pointer-events: none',
        'will-change: transform',
    ];
    const SUBJECTS = ['.t-neo .item-x:hover', '.t-neo .buy:focus-visible', '.t-neo .item:hover', '.t-neo [data-turn] .item-p', '.t-neo .mini:active', '.t-neo .item-x:hover::after'];

    it('refuses everything else a state could set, by name: all, custom properties, animation, content, position, display, text and spacing, font, boxes, opacity, filters, clips, masks, decoration', () => {
        for (const decl of REFUSED) {
            const prop = decl.slice(0, decl.indexOf(':'));
            for (const subject of SUBJECTS) {
                if (prop.startsWith('--')) refused(`${subject} { ${decl}; }`, /a custom property set under a state re-states, where no property here reads it/);
                else refusedProperty(`${subject} { ${decl}; }`, prop);
            }
        }
    });

    it('refuses a non-identity transform in every form, a value it cannot read, and a number or an angle past what a double holds', () => {
        for (const decl of [
            'transform: rotate(25deg)',
            'transform: rotate(0.5turn)',
            'transform: rotate(360deg)',
            'transform: rotate(8deg) rotate(8deg)',
            'transform: scale(0.8)',
            'transform: scale(1.0005)',
            'transform: scale(1.06)',
            'transform: scale(1, 1.4)',
            'transform: scaleX(-1)',
            'transform: skewX(4deg)',
            'transform: matrix(0.8, 0, 0, 0.8, 0, 0)',
            'transform: matrix(1, 0, 0, -1, 0, 0)',
            'transform: matrix(1, 0, 0, 1, 4, 0)',
            'transform: translateY(-1px)',
            'transform: translate3d(0, -1px, 0)',
            'transform: translateZ(5px)',
            'transform: rotateY(40deg)',
            'transform: perspective(200px)',
            'transform: pop(2)',
            'transform: inherit',
            'transform: var(--t)',
            'transform: rotate(var(--a))',
            'transform: rotate(1e400deg)',
            'transform: rotate(1e300deg)',
            'transform: scale(1e400)',
            'transform: matrix(1e400, 0, 0, 1, 0, 0)',
            'rotate: 25deg',
            'rotate: 1deg',
            'rotate: 360deg',
            'rotate: y 40deg',
            'rotate: 1 0 0 40deg',
            'rotate: calc(5deg * 3)',
            'rotate: inherit',
            'rotate: var(--r)',
            'rotate: 11turn',
            'scale: 0.9',
            'scale: 1.05',
            'scale: 1 2',
            'scale: 1 1 2',
            'scale: 50% 50%',
            'scale: calc(0.5)',
            'scale: 1e400',
            'scale: var(--s)',
            'translate: 0 -2px',
            'translate: -200vw 0',
            'translate: 0 0 40px',
            'translate: 1px 0',
            'translate: var(--x) 0',
        ]) {
            for (const subject of SUBJECTS) refusedUnder(`${subject} { ${decl}; }`, decl.slice(0, decl.indexOf(':')));
        }
        // Rural's straightening of a tilted row under a hand, and the other identities.
        for (const decl of [
            'transform: none',
            'transform: initial',
            'transform: unset',
            'transform: translateZ(0)',
            'transform: translate3d(0, 0, 0)',
            'transform: rotate(0deg) scale(1) translate(0, 0)',
            'transform: matrix(1, 0, 0, 1, 0, 0)',
            'rotate: 0deg',
            'rotate: 0',
            'rotate: -0deg',
            'rotate: 0turn',
            'rotate: none',
            'rotate: z 0deg',
            'scale: 1',
            'scale: 100%',
            'scale: 1 1',
            'scale: none',
            'translate: none',
            'translate: 0',
            'translate: 0 0',
            'translate: 0px 0px 0',
        ]) {
            for (const subject of SUBJECTS) accepted(`${subject} { ${decl}; }`);
        }
        accepted('.t-neo .items .item:hover, .t-neo .items .item.open { rotate: 0deg; }');
    });

    it('reads an ink at alpha 1, and no other: a literal colour, currentColor, inherit, or an opaque palette role with no fallback', () => {
        for (const value of [
            '#dff6ff',
            '#fff',
            '#ffffff',
            '#ffff',
            '#ffffffff',
            'white',
            'RebeccaPurple',
            'rgb(0 0 0)',
            'rgb(0 0 0 / 100%)',
            'rgb(0 0 0 / 1)',
            'rgba(0, 0, 0, 1)',
            'rgba(0, 0, 0, 100%)',
            'hsl(200 50% 50%)',
            'hsl(200, 50%, 50%)',
            'oklch(0.5 0.1 200)',
            'color(srgb 1 0 0)',
            'currentColor',
            'CURRENTCOLOR',
            'inherit',
            ...OPAQUE_PINNED.map((role) => `var(${role})`),
            'var( --s-accent )',
        ]) {
            accepted(`.t-neo .item-x:hover { color: ${value}; }`);
        }
        for (const value of [
            'transparent',
            '#ffffff10',
            '#fff1',
            '#fff8',
            'rgb(0 0 0 / 5%)',
            'rgb(0 0 0 / 0.05)',
            'rgba(0, 0, 0, 0.05)',
            'rgba(0, 0, 0, 0)',
            'hsl(200 50% 50% / 0)',
            'oklch(0.5 0.1 200 / 0.3)',
            'rgb(0 0 0 / var(--a))',
            'rgb(0 0 0 / none)',
            'rgb(calc(1) 0 0)',
            'rgb(from red r g b / 0.2)',
            'color-mix(in srgb, red, transparent)',
            'color-mix(in srgb, red 100%, blue 0%)',
            'color-mix(in srgb, currentcolor 2%, var(--s-bg))',
            'light-dark(red, blue)',
            // A theme token that is not a palette role can carry an alpha: --s-addr-bg is 5% on Neo, --s-tab-active-bg 14%, Modern's --s-head-bg 74%.
            'var(--s-addr-bg)',
            'var(--s-tab-active-bg)',
            'var(--s-head-bg)',
            'var(--s-sub-ink)',
            'var(--wash)',
            'var(--s-text, red)',
            'var(--s-bg, rgba(0, 0, 0, 0))',
            'var(--S-TEXT)',
            // A colour this lint cannot read as a literal.
            'Canvas',
            'ButtonText',
            'CanvasText',
            'initial',
            'unset',
            'revert',
            'notacolour',
            '#ff',
            '#fffff',
        ]) {
            refused(`.t-neo .item-x:hover { color: ${value}; }`);
        }
        // Same word for the ink wherever the state stands.
        for (const subject of SUBJECTS) accepted(`${subject} { color: #dff6ff; }`);
    });

    it('reads a ground of any alpha, a gradient and nothing that is a picture, and never currentColor as a ground', () => {
        for (const rule of [
            '.t-neo .buy:hover { background: rgba(37, 99, 235, 0.1); }',
            '.t-neo .buy:hover { background: transparent; }',
            '.t-neo .buy:hover { background-color: rgba(44, 233, 224, 0.18); }',
            '.t-neo .buy:hover { background-color: var(--s-addr-bg); }',
            '.t-neo .buy:hover { background-color: color-mix(in srgb, var(--s-accent) 12%, transparent); }',
            '.t-neo .buy:hover { background-color: color-mix(in oklch, red 30%, rgb(0 0 0 / 0.5) 70%); }',
            '.t-neo .buy:hover { background-color: inherit; }',
            '.t-neo .buy:hover { background: linear-gradient(90deg, red, rgba(0, 0, 0, 0.2) 50%, var(--s-accent)); }',
            '.t-neo .buy:hover { background: radial-gradient(circle at 20% 0, #fff, transparent 60%), #000; }',
            '.t-neo .buy:hover { background-image: repeating-linear-gradient(45deg, red 0 2px, blue 2px 4px); }',
            '.t-neo .buy:hover { background-image: conic-gradient(red, blue), linear-gradient(red, blue); }',
            '.t-neo .buy:hover { background-image: none; }',
            '.t-neo .buy:hover { background-image: var(--s-card-sheen); }',
            '.t-neo .buy:hover { background: var(--s-card-sheen); }',
            '.t-neo .buy:hover { background: var(--s-surface) no-repeat center / cover; }',
            '.t-neo .buy:hover { background: red 0 0 / calc(100% - 2px) 100% no-repeat; }',
            '.t-neo .item:hover { background: #2563eb; }',
        ]) {
            accepted(rule);
        }
        const NOT_A_PICTURE = /a picture \(url\(\), image-set\(\), cross-fade\(\), element\(\), paint\(\)\) is a ground the probe cannot read/;
        for (const value of ['url(./x.svg)', 'linear-gradient(red, blue), url(./x.svg)', 'image-set("./x.svg" 1x)', 'cross-fade(url(./x.svg), red, 50%)', 'element(#a)', 'paint(x)']) {
            for (const prop of ['background-image', 'background']) {
                for (const subject of ['.t-neo .buy:hover', '.t-neo .item:hover']) refused(`${subject} { ${prop}: ${value}; }`, NOT_A_PICTURE);
            }
        }
        refused('.t-neo .buy:hover { background: url(./x.svg) no-repeat; }', NOT_A_PICTURE);
        refused('.t-neo .buy:hover { background-image: var(--pic, url(./x.svg)); }', /background-image: .* under ".+" — a var\(\) here is read only as var\(--s-…\) with no fallback/);
        refused('.t-neo .buy:hover { background-image: red; }', /background-image: red under ".+" — a background-image layer is `none`, a gradient or a var\(--s-…\)/);
        refused('.t-neo .buy:hover { background-image: rgb(0 0 0); }', /a background-image layer is `none`, a gradient or a var/);
        refused('.t-neo .buy:hover { background: var(--wash); }', /a var\(\) here is read only as var\(--s-…\)/);
        refused('.t-neo .buy:hover { background: attr(x); }', /is a function this lint does not read in a state's background/);
        // The ground the colour of the ink it holds hides the figure.
        for (const rule of ['.t-neo .item-x:hover { background-color: currentColor; }', '.t-neo .item-x:hover { background: currentcolor; }', '.t-neo .item-x:hover { background: color-mix(in srgb, currentcolor 50%, red); }']) {
            refused(rule, /currentcolor as a ground is the colour of the ink it holds/);
        }
        // Colours this lint cannot read as a ground: a function it does not know, a fallback, a system word it takes for a keyword stands.
        refused('.t-neo .buy:hover { background-color: rgb(from red r g b); }', /is not a colour this lint reads/);
        refused('.t-neo .buy:hover { background-color: var(--wash); }', /is not a colour this lint reads/);
        refused('.t-neo .buy:hover { background-color: var(--s-bg, red); }', /is not a colour this lint reads/);
    });

    it('lets a border change colour, and its style only to off; the shorthand shows one and writes no width', () => {
        for (const rule of [
            '.t-neo .buy:hover { border-color: red; }',
            '.t-neo .buy:hover { border-color: red blue; }',
            '.t-neo .buy:hover { border-color: rgba(255, 77, 122, 0.85); }',
            '.t-neo .buy:hover { border-color: var(--s-accent) transparent; }',
            '.t-neo .buy:hover { border-color: color-mix(in srgb, var(--s-accent) 50%, transparent); }',
            '.t-neo .buy:hover { border-color: currentColor; }',
            '.t-neo .buy:hover { border-top-color: red; border-inline-end-color: blue; }',
            '.t-neo .buy:hover { border-style: none; }',
            '.t-neo .buy:hover { border-style: none hidden; }',
            '.t-neo .buy:hover { border-left-style: none; border-block-end-style: hidden; }',
            '.t-neo .buy:hover { border: solid red; }',
            '.t-neo .buy:hover { border: dashed var(--s-accent); }',
            '.t-neo .buy:hover { border: none; }',
            '.t-neo .buy:hover { border-bottom: solid var(--s-muted); }',
            '.t-neo .buy:hover { border: inherit; }',
        ]) {
            accepted(rule);
        }
        // border-style: solid shows a border at the width a rule at rest wrote — the armed border (critic, round 3).
        const ARMED = /border style longhand shows a border at the width a rule at rest wrote/;
        refused('.t-neo .item-x { border: 40px none; }\n.t-neo .item:hover .item-x { border-style: solid; }', ARMED);
        for (const decl of ['border-style: solid', 'border-style: dashed', 'border-top-style: solid', 'border-inline-style: double', 'border-style: none solid']) {
            refused(`.t-neo .buy:hover { ${decl}; }`, ARMED);
        }
        for (const decl of ['border: 1px solid red', 'border: thin solid red', 'border: 0', 'border-left: 9999px solid transparent', 'border: solid calc(1px) red']) {
            refused(`.t-neo .buy:hover { ${decl}; }`, /a width in the border shorthand/);
        }
        refused('.t-neo .buy:hover { border: dashed var(--s-card-border); }', /--s-card-border is not a palette role/);
        refused('.t-neo .buy:hover { border: dashed var(--s-accent, 300px); }', /a var\(\) with a fallback in the border shorthand/);
        refused('.t-neo .buy:hover { border-color: var(--wash, red); }', /is not a colour this lint reads/);
        refused('.t-neo .buy:hover { border-color: red blue red blue red; }', /a border colour is one to four colours/);
        refusedProperty('.t-neo .buy:hover { border-width: 40px; }', 'border-width');
        refusedProperty('.t-neo .buy:hover { border-image: linear-gradient(red, blue) 1; }', 'border-image');
        refusedProperty('.t-neo .buy:hover { border-image-source: url(./x.svg); }', 'border-image-source');
        refusedProperty('.t-neo .buy:hover { border-radius: 0; }', 'border-radius');
    });

    it('lets a shadow stand and not a fill: an inset one whole, an outer one with no spread and an offset of 8px at most; a glow is free', () => {
        for (const value of [
            '0 0 16px rgba(44, 233, 224, 0.35)',
            '0 0 10px #2ce9e0, 0 0 20px #ff4d7a',
            '0 8px 24px rgba(0, 0, 0, 0.2)',
            '8px 8px 0 #000',
            '-8px -8px 0 #000',
            '0 0 0 -4px red',
            '0 0 4000px red',
            'inset 0 0 0 4000px red',
            'inset 0 0 16px var(--s-accent)',
            '0 0 8px var(--s-accent)',
            'none',
            'initial',
            'unset',
            '0 2px 0 0 rgb(0 0 0 / 0.35)',
        ]) {
            for (const subject of SUBJECTS) accepted(`${subject} { box-shadow: ${value}; }`);
        }
        const FILL = /an outer shadow with a spread, or an offset past 8px, is a fill the size of a box and not a shadow/;
        // The critic's plant: a 4000px spread paints over the rows beside it.
        refused('.t-neo .item:hover { box-shadow: 0 0 0 4000px #000; }', FILL);
        for (const value of ['0 0 0 1px red', '0 0 0 2px var(--s-accent)', '9px 0 0 #000', '0 9px 0 #000', '0 4000px 0 #000', '-9px 0 8px red', '0 8px 24px rgba(0, 0, 0, 0.2), 0 0 0 1px red', '0 0 0 4000px var(--s-text)']) {
            refused(`.t-neo .item:hover { box-shadow: ${value}; }`, FILL);
        }
        const READS = /a box-shadow this lint cannot size/;
        for (const value of ['var(--s-card-shadow)', '0 0 1em red', '0 0 0 1rem red', '0 0 5% red', '1 1 red', '0 red', '0 0 0 0 0 red', '0 0 -4px red', '0 0 8px notacolour', '0 0 8px red red', 'inherit', '0 0 8px var(--wash)']) {
            refused(`.t-neo .item:hover { box-shadow: ${value}; }`, READS);
        }
    });

    it('reads an outline only when the rule writes a width and an offset, both in px or a keyword, together at most 8px; outline-style: none alone stands', () => {
        for (const rule of [
            '.t-neo .buy:focus-visible { outline: 2px solid var(--s-accent); outline-offset: 2px; }',
            '.t-neo .buy:focus-visible { outline: thick solid red; outline-offset: 3px; }',
            '.t-neo .buy:focus-visible { outline: medium auto; outline-offset: 5px; }',
            '.t-neo .buy:focus-visible { outline: thin solid red; outline-offset: 0; }',
            '.t-neo .buy:focus-visible { outline-offset: 2px; outline: 2px solid red; }',
            '.t-neo .buy:focus-visible { outline-width: 2px; outline-offset: 2px; outline-style: solid; outline-color: red; }',
            '.t-neo .buy:focus-visible { outline: 8px solid red; outline-offset: 0px; }',
            '.t-neo .buy:focus-visible { outline: 0 solid red; outline-offset: 8px; }',
            '.t-neo .buy:focus-visible { outline: 2px var(--s-x); outline-offset: 2px; }',
            // The shorthand states both numbers even to switch the ring off; the style alone, off, needs nothing beside it.
            '.t-neo .buy:focus-visible { outline: 0 none; outline-offset: 0; }',
            '.t-neo .buy:focus-visible { outline-style: none; }',
            '.t-neo .buy:focus-visible { outline-style: initial; }',
            '.t-neo .buy:focus-visible { outline-color: red; outline-width: 2px; outline-offset: 2px; }',
        ]) {
            accepted(rule);
        }
        const OWN = /an outline declaration under a state states its own width and its own offset in the same rule/;
        for (const rule of [
            // The critic's arming plant: a ring written at rest, switched on by a state.
            '.t-neo .item-x { outline-width: 200px; outline-offset: -100px; outline-color: #000; }\n.t-neo .item:hover .item-x { outline-style: solid; }',
            '.t-neo .buy { outline: 300px none #000; outline-offset: -150px; }\n.t-neo .buy:focus-visible { outline-style: solid; }',
            '.t-neo .buy:focus-visible { outline: 2px solid red; }',
            '.t-neo .buy:focus-visible { outline: 3000px solid #000; }',
            '.t-neo .buy:focus-visible { outline: solid red; outline-offset: 2px; }',
            '.t-neo .buy:focus-visible { outline-style: auto; }',
            '.t-neo .buy:focus-visible { outline-width: 2px; }',
            '.t-neo .buy:focus-visible { outline-offset: 2px; }',
            '.t-neo .buy:focus-visible { outline: auto; outline-offset: 2px; }',
            // The shorthand off, a colour alone, a width or an offset alone: a ring written at rest, armed (the colour) or sized (the others) by a state.
            '.t-neo .buy:focus-visible { outline: none; }',
            '.t-neo .buy:focus-visible { outline: 0 none; }',
            '.t-neo .buy:focus-visible { outline: initial; }',
            '.t-neo .buy:focus-visible { outline-color: red; }',
            '.t-neo .buy:focus-visible { outline-color: var(--s-accent); }',
            '.t-neo .buy:focus-visible { outline-style: none; outline-offset: 100px; }',
            '.t-neo .buy:focus-visible { outline-style: none; outline-color: red; }',
            // The critic's round-3 arming, by colour: a ring drawn transparent at rest, a colour under a state.
            '.t-neo .item-x { outline: 200px solid transparent; outline-offset: 0; }\n.t-neo .item:hover .item-x { outline-color: #000; }',
            // The shorthand resets the width the longhand wrote before it.
            '.t-neo .buy:focus-visible { outline-width: 2px; outline: solid red; outline-offset: 2px; }',
            // A var() could carry the style the shorthand does not write.
            '.t-neo .buy:focus-visible { outline: solid var(--s-accent); }',
            '.t-neo .buy:focus-visible { outline: var(--s-x) 2px; }',
        ]) {
            refused(rule, OWN);
        }
        const TOO_FAR = /paints \d+px beyond the box, over a neighbour's figure when it stands that close/;
        for (const rule of [
            '.t-neo .buy:focus-visible { outline: 8px solid #000; outline-offset: 8px; }',
            '.t-neo .buy:focus-visible { outline: 9px solid red; outline-offset: 0; }',
            '.t-neo .buy:focus-visible { outline: thick solid red; outline-offset: 4px; }',
            '.t-neo .buy:focus-visible { outline: 2px solid red; outline-offset: 7px; }',
            '.t-neo .buy:focus-visible { outline-width: 4000px; outline-offset: 0; outline-style: solid; }',
        ]) {
            refused(rule, TOO_FAR);
        }
        refused('.t-neo .buy:focus-visible { outline: var(--ring); outline-offset: 2px; }', /is not a colour this lint reads/);
        refused('.t-neo .buy:focus-visible { outline: 2px solid red; outline-offset: -2px; }', /a negative outline width or offset draws the ring inside the box/);
        refused('.t-neo .buy:focus-visible { outline-width: -1px; outline-offset: 0; outline-style: solid; }', /an outline width this lint cannot size|a negative outline width or offset/);
        const UNSIZED = /an outline (?:width|offset) this lint cannot size/;
        for (const rule of [
            '.t-neo .buy:focus-visible { outline: 0.5em solid red; outline-offset: 2px; }',
            '.t-neo .buy:focus-visible { outline: calc(100vw) solid red; outline-offset: 2px; }',
            '.t-neo .buy:focus-visible { outline-width: var(--w); outline-offset: 2px; outline-style: solid; }',
            '.t-neo .buy:focus-visible { outline: 2px solid red; outline-offset: 1em; }',
            '.t-neo .buy:focus-visible { outline: 2px solid red; outline-offset: var(--o); }',
            '.t-neo .buy:focus-visible { outline: 2px solid red; outline-offset: calc(1px); }',
        ]) {
            refused(rule, UNSIZED);
        }
    });

    it('lets a transition stand under a state, and reads a custom property in its list as all', () => {
        accepted('.t-neo .buy:hover { transition: color 0.2s ease, background-color 0.2s; }');
        accepted('.t-neo .buy:hover { transition-property: color; transition-duration: .2s; transition-delay: 0s; transition-timing-function: ease; transition-behavior: normal; }');
        accepted('.t-neo .buy:hover { -webkit-transition: color 0.2s; transition: color 0.2s; }');
        accepted('.t-neo .item:hover .item-x { transition: opacity 1s; }');
        // The size lint reads them on a money node, a custom property for all (the lint-belts critic's P3: @property tokens animate).
        const MOVES = /which may be a money node — the wall fits its figure by its size/;
        refused('.t-neo .item-x:hover { transition: letter-spacing .2s; }', MOVES);
        refused('.t-neo .item-x:hover { transition: --au-tide 1s; }', MOVES);
        refused('.t-neo .item-x { transition: color 1s, --au-tide 1s; }', MOVES);
        refused('.t-neo .item-x { transition-property: --au-tide; }', MOVES);
        refused('.t-neo .item-x { transition: 1s --g; }', MOVES);
        accepted('.t-neo .tool { transition: --au-tide 1s; }');
    });

    it('holds a pseudo-element under a state to the same list, and gives it no content, position or display', () => {
        accepted('.t-neo .item:hover::after { background: #000; }');
        accepted('.t-neo .item:hover::before { border-color: red; box-shadow: 0 0 8px red; }');
        for (const decl of ["content: ''", 'position: absolute', 'inset: 0', 'display: block', 'opacity: 0.5', 'backdrop-filter: blur(30px)', 'width: 100%', 'height: 100%', 'transform: scale(2)', 'z-index: 1']) {
            refused(`.t-neo .item:hover::after { ${decl}; }`);
        }
        // The critic's plant: a positioned pseudo-element over the figure, with a ground.
        const problems = problemsOf(".t-neo .item:hover::after { content: ''; position: absolute; inset: 0; background: #000; }");
        for (const prop of ['content', 'position', 'inset']) {
            assert.ok(problems.some((p) => new RegExp(`^line \\d+: ${prop}: .* — ${prop} is not a property a state rule may set`).test(p)), problems.join('\n'));
        }
    });

    it('refuses a tap highlight in any colour but transparent, at rest, under a state, in a media block and in a keyframe', () => {
        const TAP = /a tap highlight paints a colour over whatever is tapped, a money control among them, where no pass looks; only transparent stands/;
        for (const value of ['red', 'rgba(0, 0, 0, 0.2)', 'inherit', 'initial', 'currentcolor', 'var(--tap)', '#0000']) {
            refused(`.t-neo .buy { -webkit-tap-highlight-color: ${value}; }`, TAP);
            refused(`.t-neo .buy:active { -webkit-tap-highlight-color: ${value}; }`, TAP);
            refused(`@media (min-width: 680px) { .t-neo .item-x { -webkit-tap-highlight-color: ${value}; } }`, TAP);
        }
        refused('@keyframes t-neo-tap { from { -webkit-tap-highlight-color: transparent; } to { -webkit-tap-highlight-color: red; } }', TAP);
        accepted('.t-neo .buy { -webkit-tap-highlight-color: transparent; }');
        accepted('.t-neo .buy:active { -webkit-tap-highlight-color: TRANSPARENT; }');
        // It has no unprefixed twin, so the twin rule would refuse the one value that stands.
        const problems = problemsOf('.t-neo .buy { -webkit-tap-highlight-color: red; }');
        assert.ok(!problems.some((p) => /write tap-highlight-color/.test(p)), problems.join('\n'));
    });

    it('lets no first-party sheet re-declare a palette role: the proof that a role is opaque is about the value a rule reads', () => {
        for (const role of OPAQUE_PINNED) {
            refused(`.t-neo .item { ${role}: 300px solid red; }`, new RegExp(`${role} is a palette role the theme table writes on the stall`));
            refused(`.t-neo { ${role}: red; }`, new RegExp(`${role} is a palette role the theme table writes on the stall`));
        }
        // The other custom properties stand at rest.
        accepted('.t-neo .item { --s-price-clip: none; --wash: red; --s-addr-bg: red; }');
        // The kit keeps the rules its README states.
        assert.ok(!lintSheet(plantedKit('.t-neo .item { --s-text: red; }')).some((p) => /palette role/.test(p)));
        // And no served first-party sheet does it.
        for (const sheet of lookRows(SERVED).filter((row) => row.role !== 'kit')) {
            for (const role of OPAQUE_PINNED) {
                assert.ok(!new RegExp(`(?:^|[{;\\s])${role}\\s*:`).test(sheet.css), `${sheet.path} declares ${role}`);
            }
        }
    });

    it('the-state-opaque-roles-are-the-opaque-colours-the-theme-table-emits: under every shipped look, bare and under every mood', async () => {
        const { runnerImport } = await import('vite');
        const { module: attachments } = await runnerImport(join(ROOT, 'src/domain/attachments.ts'), { configFile: false, logLevel: 'silent' });
        const theme = await import('../src/domain/theme.ts');
        const OPAQUE = /^rgb\(\d{1,3}, \d{1,3}, \d{1,3}\)$/;
        const seen = new Map();
        let moods = 0;
        let paints = 0;
        for (const { id } of theme.SHIPPED_THEMES) {
            const worn = [[], ...attachments.SHIPPED_ATTACHMENTS.filter((a) => a.themeId === id && a.slot === 'mood').map((a) => [a])];
            moods += worn.length - 1;
            for (const set of worn) {
                paints += 1;
                const vars = theme.themeVars(attachments.withMood(theme.decodeTheme(id), set));
                for (const [name, value] of Object.entries(vars)) {
                    const everyOpaque = (seen.get(name) ?? true) && OPAQUE.test(value);
                    seen.set(name, everyOpaque);
                }
            }
        }
        assert.ok(moods >= 2, `the shipped moods were read (${moods})`);
        assert.ok(paints >= 5, `${paints} paints read`);
        // The pinned list is exactly the vars that are an opaque colour under every one of them: a new opaque role is a decision, a role that stops being one turns this red.
        const opaque = [...seen].filter(([, all]) => all).map(([name]) => name);
        assert.deepEqual([...opaque].sort(), [...OPAQUE_PINNED].sort());
        for (const role of OPAQUE_PINNED) assert.ok(seen.get(role), `${role} is opaque under every look and mood`);
        // And the tokens the critic named are not on it: --s-addr-bg (5% on Neo), --s-tab-active-bg (14%), --s-head-bg (74% on Modern).
        for (const name of ['--s-addr-bg', '--s-tab-active-bg', '--s-head-bg', '--s-sub-bg', '--s-chip-bg']) assert.ok(!opaque.includes(name), name);
        // A palette delta a mood hands is an Rgb, so a role stays rgb(r, g, b) however a mood moves it.
        assert.ok(attachments.SHIPPED_ATTACHMENTS.filter((a) => a.slot === 'mood').every((a) => a.palette === undefined || Object.values(a.palette).every((c) => typeof c === 'object' && 'r' in c)));
    });

    /**
     * The lint reads what the probe holds: the longhands of its `DRESS_HELD`
     * set are either on the allow-list (and read, above) or refused under a
     * state. The set is parsed out of `layout/probe.ts` strictly — a list
     * body that is anything but single-quoted strings fails the parse, so a
     * double-quoted, spread or computed member cannot be missed in silence
     * (the lint-belts critic's P3-7).
     */
    const probeSet = (name) => {
        const probe = read('layout/probe.ts');
        const m = new RegExp(`const ${name}\\b[^=]*=\\s*(?:new Set\\()?\\[([\\s\\S]*?)\\]`).exec(probe);
        assert.ok(m !== null, `layout/probe.ts no longer states ${name} as a list`);
        const items = m[1].split(',').map((item) => item.trim()).filter((item) => item !== '');
        for (const item of items) assert.match(item, /^'[^'\\\n]+'$/, `${name} holds ${item}, which is not a single-quoted string: this parse cannot read it`);
        return items.map((item) => item.slice(1, -1));
    };
    /** A declaration as a sheet writes it: a vendor-prefixed property beside its twin, as the twin rule asks (the line clamp stands alone). */
    const written = (prop, value) =>
        /^-webkit-/.test(prop) && prop !== '-webkit-line-clamp' ? `${prop}: ${value}; ${prop.replace(/^-webkit-/, '')}: ${value}` : `${prop}: ${value}`;

    it('the-state-belt-reads-every-longhand-the-probe-holds-or-refuses-it: DRESS_HELD, parsed strictly', () => {
        const held = probeSet('DRESS_HELD');
        const box = probeSet('BOX_HELD');
        assert.ok(held.length > 40, 'DRESS_HELD parsed whole');
        assert.ok(box.length > 8, 'BOX_HELD parsed whole');
        for (const prop of box) assert.ok(held.includes(prop), `BOX_HELD names ${prop}, which DRESS_HELD does not`);
        // The members the allow-list reads, by value: each has its reader and its plants above.
        const read = held.filter((prop) => STATE_ALLOWED.includes(prop.replace(/^-(?:webkit|moz|ms|o)-/, '')));
        assert.deepEqual(
            [...read].sort(),
            ['background-color', 'background-image', 'color', 'outline-offset', 'outline-style', 'outline-width', 'rotate', 'scale', 'transform', 'translate'],
            'the probe holds these and a state may set them: each is read, not blanket-allowed',
        );
        // Every other member is refused under a state, by name, whatever the value.
        for (const prop of held.filter((p) => !read.includes(p))) {
            for (const subject of ['.t-neo .item-x:hover', '.t-neo .item:hover']) {
                const problems = problemsOf(`${subject} { ${written(prop, 'initial')}; }`);
                assert.ok(problems.some((p) => /is not a property a state rule may set/.test(p)), `${prop} under ${subject}:\n  ${problems.join('\n  ') || '(no problem)'}`);
            }
        }
    });

    it('the-state-belt-is-first-party-only: the kit lint carries none of these, because a pointer\'s hover is checked at intake', () => {
        for (const rule of [
            '.t-neo .item-x:hover { clip-path: inset(0 50% 0 0); }',
            '.t-neo .pay-x:focus-within { opacity: .2; }',
            '.t-neo [data-turn] .item-p { filter: blur(4px); }',
            '.t-neo .buy:hover { transform: scale(0.8); mix-blend-mode: difference; visibility: hidden; }',
            '.t-neo .buy:hover { offset-path: path("M 0 0 L 1 0"); offset-rotate: 180deg; }',
            '.t-neo .item-x:hover { text-decoration: line-through 1em; }',
            '.t-neo .item-x:hover { text-indent: -9999px; word-spacing: -2em; font-size-adjust: 0.01; writing-mode: vertical-rl; }',
            '.t-neo .buy:focus-visible { outline: 3000px solid #000; }',
            '.t-neo .item-x:hover { z-index: -1; position: relative; }',
            '.t-neo .item:hover { --s-price-clip: inset(0 100% 0 0); }',
            '.t-neo .item-x:hover { rotate: 10deg; translate: -200vw 0; }',
            '.t-neo .item-x:hover { color: rgba(0, 0, 0, 0.05); text-shadow: 490px 0 0 #000; }',
            '.t-neo .item:hover { box-shadow: 0 0 0 4000px #000; }',
            '.t-neo .item:hover { border-style: solid; }',
            '@keyframes t-neo-fade { to { opacity: 0; } }\n.t-neo .item:hover .item-x { animation-name: t-neo-fade; }',
            '@keyframes t-neo-g { 0% { --g: 0em; } 100% { --g: .3em; } }',
        ]) {
            const kit = lintSheet(plantedKit(rule));
            assert.ok(!kit.some((p) => BELT.test(p) || /a custom property in a keyframe|palette role/.test(p)), `kit, ${rule}:\n  ${kit.join('\n  ')}`);
        }
        // The kit's own refusals stand — and nothing is added to them.
        assert.deepEqual(lintSheet(plantedKit('.t-neo .buy:hover { outline: 3000px solid #000; }')), []);
        // The choice rests on the README's own words: when it states the rule for the kit, this fails and the kit belt follows.
        const readme = read('workshop/README.md').replace(/\s+/g, ' ');
        assert.ok(readme.includes("such as a pointer's hover"), "the workshop README no longer says a pointer's hover is Stall's at intake");
        assert.ok(!/(?::hover|:focus|:active|\[data-turn\])/.test(readme), 'the workshop README now names a state; decide whether the kit belt follows it');
    });

    it('the-three-starters-pass-the-belt: each shipped look re-scoped for the kit passes the first-party lint under .t-workshop', () => {
        for (const cls of ['t-modern', 't-neo', 't-rural']) {
            const starter = rescopeSheet(read(sheetOf(cls).path), cls.slice(2), carried);
            assert.deepEqual(lintLookSheet(starter, { lookClass: 't-workshop' }), [], `${cls} starter, first-party`);
            assert.deepEqual(lintSheet(starter), [], `${cls} starter, kit`);
        }
    });

    it('the-fixtures-the-canary-and-every-first-party-sheet-a-run-serves-pass-the-belt: the shipped looks, the harness fixture look, the tracked private fixture, the canary from public bytes', () => {
        const rows = lookRows(SERVED).filter((row) => row.role !== 'kit');
        const roles = new Set(rows.map((row) => row.role));
        for (const role of ['look', 'fixture', 'private']) assert.ok(roles.has(role), `a ${role} sheet is read`);
        for (const sheet of rows) {
            const options = sheet.role === 'private' ? { lookClass: sheet.lookClass, load: 'worn', ownArt: sheet.ownArt } : { lookClass: sheet.lookClass, load: sheet.load, ownArt: sheet.load === 'worn' ? ownArtOf(sheet) : undefined };
            assert.deepEqual(lintLookSheet(sheet.css, options), [], sheet.path);
        }
        const files = canaryFiles();
        const ownArt = { dir: 'art', files: Object.keys(files).filter((path) => path.startsWith('canary/art/') && !path.endsWith('.txt')).map((path) => path.slice('canary/art/'.length)) };
        assert.deepEqual(lintLookSheet(files['canary/sheet.css'], { lookClass: 't-canary', load: 'worn', ownArt }), [], 'the canary');
    });

    it('the-kit-twin-rule-passes-the-tap-highlight-beside-an-unread-twin: the kit refuses it only when it stands without a twin of the same value (B1)', () => {
        const rule = '.t-neo .buy { -webkit-tap-highlight-color: red; tap-highlight-color: red; }';
        // The kit accepts it: a twin naming a property nothing reads satisfies the twin rule.
        assert.deepEqual(lintSheet(plantedKit(rule)), []);
        // The first-party lint refuses it, twin or no twin.
        const shipped = problemsOf(rule);
        assert.ok(shipped.some((p) => /only transparent stands/.test(p)), shipped.join('\n'));
        // The kit's tap-highlight is the twin rule's, whatever the value written alone: the README states that rule.
        for (const value of ['transparent', 'red']) {
            const kit = lintSheet(plantedKit(`.t-neo .buy { -webkit-tap-highlight-color: ${value}; }`));
            assert.ok(kit.some((p) => /a prefixed property paints only in the engines that read the prefix/.test(p)), `kit, ${value}:\n  ${kit.join('\n  ') || '(no problem)'}`);
            assert.ok(!kit.some((p) => /only transparent stands/.test(p)), kit.join('\n'));
        }
    });
});

describe('the-lint-belts-critics-plants-are-pinned', () => {
    /**
     * Every rule the lint-belts critic planted on a copy of Neo (the three
     * rounds' plant files `p1`–`p10` and `q1`–`q7`, `$C` for the look's
     * class), each with its outcome under the allow-list pinned: `refused`
     * and by which kind of sentence (`by`), or `accepted` and why that is
     * not a figure hidden. A plant whose outcome moves turns this red, so a
     * relaxation of a reader, or a hole it closed, is a decision.
     */
    const WAYS = [
        ['state:custom-property', /a custom property set under a state/],
        ['state:property', /is not a property a state rule may set/],
        ['state:transform', /a state sets the no-transform values only|a value this lint cannot take apart may move, turn or scale the box/],
        ['state:ink', /an ink under alpha 1|is not an ink this lint reads|not a palette role proved opaque|a mix of an ink|a var\(\) with a fallback, or inside another value/],
        ['state:outline', /an outline declaration under a state|beyond the box|a negative outline width or offset|an outline (?:width|offset) this lint cannot size/],
        ['state:shadow', /box-shadow this lint cannot size|an outer shadow with a spread/],
        ['state:border', /border style longhand|a width in the border shorthand|in the border shorthand a var/],
        ['state:background', /a state's background is a colour or a gradient|is not a part of a background|a background-image layer|currentcolor as a ground|in a state's background|a var\(\) here is read only as var/],
        ['size:transition', /which may be a money node — the wall fits its figure by its size/],
        ['size:keyframe', /animates .* — any box a rule runs it on, a money node among them/],
        ['keyframe:custom-property', /a custom property in a keyframe/],
        ['role-redeclared', /palette role the theme table writes on the stall/],
        ['tap-highlight', /a tap highlight paints a colour/],
        ['file-mask', /a file's mask or clip in a/],
        ['selector', /an attribute selector this lint does not read|a partial match|is not one of the state attributes/],
        ['important', /!important outranks/],
        ['nested', /holds a nested rule/],
        ['at-rule', /is not a condition the probe enters|is not allowed in a look sheet/],
        ['escape', /a CSS escape outside a string/],
        ['twin', /a prefixed property paints only in the engines/],
        ['other', /./],
    ];
    const waysOf = (problems) => [...new Set(problems.map((p) => WAYS.find(([, re]) => re.test(p))[0]))].sort();

    it('holds the critic\'s seventeen plant files, 242 plants, with an outcome each', () => {
        assert.deepEqual(Object.keys(PLANTS), ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7']);
        assert.equal(Object.values(PLANTS).flat().length, 242);
        for (const entry of Object.values(PLANTS).flat()) {
            assert.ok(entry.expect === 'refused' ? Array.isArray(entry.by) && entry.by.length > 0 : typeof entry.why === 'string' && entry.why.length > 20, JSON.stringify(entry.rule));
        }
    });

    for (const [set, list] of PLANT_SETS) {
        it(`${set}: each plant is refused by the sentence kind it is pinned to, or accepted for the reason it is pinned with`, () => {
            list.forEach((entry, i) => {
                const rule = entry.rule.replaceAll('$C', 't-neo');
                const problems = lintLookSheet(plantedNeo(rule), { lookClass: 't-neo' });
                const where = `${set}:${i} ${JSON.stringify(rule)}\n  ${problems.join('\n  ') || '(no problem)'}`;
                if (entry.expect === 'accepted') assert.deepEqual(problems, [], where);
                else assert.deepEqual(waysOf(problems), entry.by, where);
            });
        });
    }

    it('accepts, of the 242, only the 23 whose reason is written beside them, and each hides no figure', () => {
        const accepted = Object.values(PLANTS).flat().filter((entry) => entry.expect === 'accepted');
        assert.equal(accepted.length, 23);
    });

    it('leaves the kit lint as main had it for every plant that is not a first-party rule: the plants add no kit problem', () => {
        for (const entry of Object.values(PLANTS).flat()) {
            let kit;
            try {
                kit = lintSheet(plantedKit(entry.rule.replaceAll('$C', 't-neo')));
            } catch {
                continue; // a rule the re-scoping cannot take (nesting): there is no kit sheet to lint
            }
            assert.ok(!kit.some((p) => /is not a property a state rule may set|palette role the theme table|a custom property set under a state|may be a money node — the wall fits/.test(p)), `${JSON.stringify(entry.rule)}:\n  ${kit.join('\n  ')}`);
        }
    });
});

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

    it('is stated in the workshop README, in the words the owner approved (D-2026-10-14-06, D-2026-10-19-02, D-2026-10-20-01, D-2026-10-20-02)', () => {
        const readme = read('workshop/README.md').replace(/\s+/g, ' ');
        // D-2026-10-14-06, its "shadow and everything around it" narrowed to
        // "the box around it" by D-2026-10-19-02: the probe holds a far
        // shadow and every box around the figure since D-2026-10-19-01.
        const piece =
            "**A price is dressed as one piece.** When a long price is too wide for its box, the app breaks it after its commas (`184,467,` / `440,737,` / `095,516.15 XEC`). Style the price as a whole — its colour, face, size, weight and the box around it are yours — but never one part of it apart from the rest: every part keeps the price's own colour, opacity, face, size and spacing, with no mask, clip, filter or transform of its own. A part styled on its own could hide a digit while every other check stays green. *(The kit — `workshop:probe`, on the screens and states it paints; Stall at intake for the rest, such as a pointer's hover, a turned wall and a screen the kit does not measure.)*";
        // D-2026-10-19-02: what `a-money-figure-is-never-misdressed` holds
        // the whole figure to, in the kit's words. D-2026-10-20-01 split
        // both labels: the probe paints no hover, no turned wall and not
        // every screen, so the rest is Stall's at intake. D-2026-10-20-02
        // (round 8): the probe catches "most of this" there, not all — a box
        // moved over a figure by a relative offset, or a target's glyph
        // scaled over it, passes it (the critic's PC2, SVs and PW on round
        // 7) — on this paragraph and the money one; the piece paragraph keeps
        // its label, true as written.
        const whole =
            '**The whole price is never dressed to misread:** no clip, mask, filter, fade, shrink, turn, line through it, far shadow, ground in its own colour or spacing that makes its digits touch, and a box around it may tilt up to 10° and take any shape only clear of its digits. *(The kit — `workshop:probe` catches most of this on the screens and states it paints; Stall checks the rest at intake, such as a pointer\'s hover, a turned wall and a screen the kit does not measure.)*';
        // The money paragraph's label, pinned since round 8 (the critic's
        // P3-2 on round 7: reverted, it kept this test green), and the lint
        // sentence folded into it.
        const moneyLabel =
            "*(The kit — `workshop:probe` catches most of this on the screens and states it paints; Stall checks the rest at intake, such as a pointer's hover, a turned wall and a screen the kit does not measure. And `workshop:lint` refuses the ways to paint text in a colour the probe does not read: `-webkit-text-fill-color`, `-webkit-text-stroke`, `background-clip: text`.)*";
        assert.ok(readme.includes(piece), 'the workshop README does not carry the piece line');
        assert.ok(readme.includes(whole), 'the workshop README does not carry the whole-price line');
        assert.ok(readme.includes(moneyLabel), 'the workshop README does not carry the money paragraph\'s label');
        assert.ok(!readme.includes('shadow and everything around it are yours'), 'the README still says a shadow and everything around the price are a look\'s');
        const money = readme.indexOf('**Money is never covered, cut or faded.**');
        const at = readme.indexOf(piece);
        const after = readme.indexOf(whole);
        const next = readme.indexOf('**QR codes stay black on white');
        assert.ok(money >= 0 && money < at, 'the piece line stands after the money paragraph');
        // The label closes the money paragraph, and the piece line follows it.
        assert.equal(readme.indexOf(moneyLabel), at - moneyLabel.length - 1, 'the money paragraph ends with its label, right before the piece line');
        assert.ok(readme.indexOf(moneyLabel) > money, 'the money label stands in the money paragraph');
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
            // A keyframe named after an animation keyword (the lint-belts critic's P2-5): the keyword goes to the property that has no value yet, and the second one is the name.
            [
                '@keyframes ease { 0%, 20%, 40%, 60%, 80% { opacity: 1; } 10%, 30%, 50%, 70%, 90% { opacity: 0; } }\n' +
                    '.t-neo .stall-name { animation: ease 1s ease infinite; }',
                /@keyframes ease .* flashes 5 times in one second/,
            ],
            [
                '@keyframes forwards { 0%, 20%, 40%, 60%, 80% { opacity: 1; } 10%, 30%, 50%, 70%, 90% { opacity: 0; } }\n' +
                    '.t-neo .stall-name { animation: forwards 1s forwards infinite; }',
                /@keyframes forwards .* flashes 5 times in one second/,
            ],
            [
                '@keyframes infinite { 0%, 20%, 40%, 60%, 80% { opacity: 1; } 10%, 30%, 50%, 70%, 90% { opacity: 0; } }\n' +
                    '.t-neo .stall-name { animation: infinite 1s infinite; }',
                /@keyframes infinite .* flashes 5 times in one second/,
            ],
            // A quoted name is the name, whatever word it is, and it is the same keyframes unquoted.
            [
                '@keyframes ease { 0%, 20%, 40%, 60%, 80% { opacity: 1; } 10%, 30%, 50%, 70%, 90% { opacity: 0; } }\n' +
                    '.t-neo .stall-name { animation: "ease" 1s infinite; }',
                /@keyframes ease .* flashes 5 times in one second/,
            ],
            [
                '@keyframes t-neo-q { 0%, 20%, 40%, 60%, 80% { opacity: 1; } 10%, 30%, 50%, 70%, 90% { opacity: 0; } }\n' +
                    ".t-neo .stall-name { animation-name: 't-neo-q'; animation-duration: 1s; animation-iteration-count: infinite; }",
                /@keyframes t-neo-q .* flashes 5 times in one second/,
            ],
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

    it('accepts a file mask at rest, and leaves a mask with no file or a clip shape under a state to the state belt', () => {
        // Accepted by this rule: a mask or a clip with no file names nothing for
        // it to read. A state rule that sets a clip or a mask of any kind is
        // `a-look-state-rule-sets-only-what-a-state-may`'s, in a first-party
        // sheet (the property is not on its list); the kit lint, which the file-mask
        // refusal runs in too and which these two (naming no file) give nothing
        // to refuse, is unchanged and still takes both.
        for (const rule of [
            '.t-neo .item-n:hover { mask-image: linear-gradient(#000, transparent); }',
            '.t-neo .item-n:hover { clip-path: inset(0 2px); }',
        ]) {
            const shipped = lintLookSheet(plantedNeo(rule), { lookClass: 't-neo' });
            assert.ok(!shipped.some((p) => /a file's mask or clip/.test(p)), `${rule}:\n  ${shipped.join('\n  ')}`);
            assert.ok(shipped.some((p) => /under "\.t-neo \.item-n:hover" — (?:mask-image|clip-path) is not a property a state rule may set/.test(p)), `${rule}:\n  ${shipped.join('\n  ') || '(no problem)'}`);
            assert.deepEqual(lintSheet(plantedKit(rule)), [], `kit, ${rule}`);
        }
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
