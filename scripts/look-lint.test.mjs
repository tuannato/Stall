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
    PREFIXED_TWINS,
    OUTLINE_OFFSET_MAX_PX,
    OUTLINE_OFFSET_MIN_PX,
    OUTLINE_WIDTH_MAX_PX,
    DECORATION_THICKNESS_MAX_PX,
    FILTER_BLUR_MAX_PX,
    STATE_ALLOWED,
    STATE_ATTRIBUTES,
    STATE_EXCEPT_PAINTED,
    STATE_OPAQUE_ROLES,
    STATE_PSEUDO_ALLOWED,
    STATE_SHADOW_BLUR_MAX_PX,
    STATE_SHADOW_MAX_PX,
    STATE_SHADOW_OUTER_LAYERS_MAX,
    STRUCTURAL_PSEUDO_CLASSES,
    blankComments,
    decodeEscapes,
    declarationsOf,
    flashReport,
    isPseudoUnderState,
    keyframeFlashes,
    lintLookSheet,
    lintSheet,
    masksWithAFile,
    namesAState,
    sheetMasksWithAFile,
    sheetNamesAttribute,
    PRESENCE_ATTRIBUTES,
    SERVED_FAMILIES,
    STICKY_BOXES,
    STROKE_WIDTH_MAX,
    UNDERLINE_OFFSET_MAX_PX,
    parseSheet,
    foreignNamingProblems,
    rescopeSheet,
    splitTopLevel,
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
/** The critic's PAN (`a1:0`, the seventh review's B1) on a copy of Neo, for `a-look-never-positions-against-an-anchor`. */
const ANCHOR_PAN = PLANTS.a1[0].rule.replaceAll('$C', 't-neo');

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
     * box that is no money node. Three sources, all read from the tree: the
     * class selectors `layout/moneySet.ts` names; every node `src/ui/*.ts`
     * gives a role of `MONEY_SET` (`el('tag', 'classes')`, then
     * `.setAttribute('data-role', …)`), the classes of a conditional
     * (`el('span', chosen ? 'sel-sub in' : 'sel-sub')`) read as both; and
     * every call of `quoteSurchargeNode(price, 'tag', 'classes')`, whose
     * node takes the role `quote-surcharge` inside the function from the
     * class its caller hands it (the third review's P3: `pay-line-s`,
     * `face-surcharge` and `sel-sub` were missed by a scan that read neither).
     * A node built any other way — a class name held in a variable — is read
     * by none, and is the scan's stated gap. Shared with other boxes and so
     * not listed: `another` (the pay sheets' hand-off button is `mini
     * another`, and the one money control that wears either; listed with
     * `mini` or with neither, and neither), `fine`, `in` (a chosen row's
     * state), `mini`, `pay-sub`.
     */
    const SHARED_WITH_OTHER_BOXES = ['another', 'fine', 'in', 'mini', 'pay-sub'];
    const moneyRoles = () => [...read('layout/moneySet.ts').matchAll(/\[data-role="([^"]+)"\]/g)].map((m) => m[1]);
    const classesOf = (argument) => [...argument.matchAll(/'([^']*)'/g)].flatMap((m) => m[1].split(/\s+/)).filter(Boolean);
    const moneyNodesInTheApp = () => {
        const roles = moneyRoles();
        const found = [];
        for (const name of readdirSync(join(ROOT, 'src/ui')).filter((n) => n.endsWith('.ts') && !n.endsWith('.test.ts'))) {
            const src = read(`src/ui/${name}`);
            // The role is a literal, or one of two a conditional chooses (`chosen ? 'selection-figure' : 'selection-sub'`).
            for (const m of src.matchAll(/(\w+)\.setAttribute\('data-role',\s*('[^']+'|[^,()]*\?\s*'[^']+'\s*:\s*'[^']+')\)/g)) {
                const named = [...m[2].matchAll(/'([^']+)'/g)].map((role) => role[1]).filter((role) => roles.includes(role));
                if (named.length === 0) continue;
                m[2] = named[0];
                const before = src.slice(0, m.index);
                const decl = [...before.matchAll(new RegExp(`(?:const|let)\\s+${m[1]}\\s*=\\s*([^;]*?);`, 'gs'))].pop();
                const made =
                    decl === undefined
                        ? null
                        : /^el\(\s*(?:'[\w-]+'|\w+)\s*,\s*('[^']*'|undefined|[^,()]*\?\s*'[^']*'\s*:\s*'[^']*')/s.exec(decl[1].trim());
                if (made !== null) found.push({ file: name, role: m[2], classes: classesOf(made[1]) });
            }
            for (const m of src.matchAll(/quoteSurchargeNode\(\s*[\w.]+,\s*'[a-z]+',\s*('[^']*')\s*\)/g)) {
                found.push({ file: name, role: 'quote-surcharge', classes: classesOf(m[1]) });
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
        // The third review's P3: a class handed to quoteSurchargeNode as an argument, and one a conditional chooses.
        const classesRead = new Set(nodes.flatMap((node) => node.classes));
        for (const cls of ['pay-line-s', 'face-surcharge', 'sel-sub', 'sw-pay-s', 'quote-surcharge', 'in']) assert.ok(classesRead.has(cls), `the scan reads .${cls}`);
        for (const cls of ['pay-line-s', 'face-surcharge', 'sel-sub']) assert.ok(MONEY_NODE_CLASSES.includes(cls), cls);
        assert.ok(!MONEY_NODE_CLASSES.includes('another'), 'another is shared like mini, and listed with neither');
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
     * D-2026-10-20-08 (the owner, "Ok b"), narrowed by D-2026-10-20-10 and
     * D-2026-10-20-11 after the third review: the probe measures every
     * screen at rest and paints no hover, no focus, no press and no turned
     * wall, so a first-party look sheet's rule whose selector names a state
     * sets colour, ground, border and outline colour, a bounded shadow, a
     * keyword cursor, transitions and the no-transform values, and nothing
     * else. **What names a state fails closed**: any pseudo-class but the
     * sixteen structural ones (`STRUCTURAL_PSEUDO_CLASSES`), `[open]`,
     * `[hidden]` and `[data-turn]`, anywhere in the selector. It replaced a
     * blocklist (D5 (a) of D-2026-10-20-06) that the lint-belts critic found
     * a hole in on each of three rounds. All 16 state rules the shipped
     * looks have (Modern 5, Neo 5, Rural 6) are inside the list, and the
     * list's every reader is proved by the plants below. First party only:
     * the workshop README says a pointer's hover is Stall's at intake, not
     * the kit's, so the kit lint is unchanged. Red: the belt taken out of
     * lintLook (every refusal below fails, and the sixteen pass), and each
     * refusal on its own by the plants.
     *
     * A pseudo-element under a state is held to a shorter list
     * (`STATE_PSEUDO_ALLOWED`: cursor, transitions, the identity
     * transforms; not colour), because the probe measures one only by its
     * paint at rest: a pseudo-element moved over a figure at rest with a
     * clear ground, and given a ground by `:hover`, was the open candidate
     * for a hidden figure. None of the sheets a run serves has one under a
     * state, so the shorter list costs the tree nothing (the last tests
     * below). Red: the pseudo list taken out of `stateBeltProblems` (the
     * plant `w1` and the two pseudo-element tests below fail, and nothing
     * else).
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
        'box-shadow',
        'cursor',
        'transform',
        'rotate',
        'scale',
        'translate',
        'outline-color',
        'transition',
        'transition-property',
        'transition-duration',
        'transition-delay',
        'transition-timing-function',
        'transition-behavior',
        '-webkit-tap-highlight-color',
    ];
    const OPAQUE_PINNED = ['--s-bg', '--s-surface', '--s-text', '--s-shade', '--s-muted', '--s-accent', '--s-danger', '--s-accent-2'];

    it('pins what a state may set, the opaque palette roles and the shadow bounds, by value', () => {
        assert.deepEqual([...STATE_ALLOWED], STATE_ALLOWED_PINNED);
        assert.deepEqual([...STATE_OPAQUE_ROLES], OPAQUE_PINNED);
        assert.equal(STATE_SHADOW_MAX_PX, 8);
        assert.equal(STATE_SHADOW_BLUR_MAX_PX, 16);
        assert.equal(STATE_SHADOW_OUTER_LAYERS_MAX, 2);
        assert.equal(new Set(STATE_ALLOWED).size, STATE_ALLOWED.length, 'no property twice');
        // Every listed property has a reader: none is refused as a property a state may not set.
        for (const prop of STATE_ALLOWED) {
            const decl = prop === '-webkit-tap-highlight-color' ? `${prop}: transparent` : written(prop, 'initial');
            const problems = problemsOf(`.t-neo .item:hover { ${decl}; }`);
            assert.ok(!problems.some((p) => /is not a property a state rule may set/.test(p)), `${prop}:\n  ${problems.join('\n  ')}`);
        }
        // And one that is not listed is: the list is the whole of it. The border and the outline are colour only (D-2026-10-20-11).
        for (const prop of [
            'border-width',
            'font-size',
            'opacity',
            'caret-color',
            'border-image',
            'text-decoration-color',
            'border',
            'border-top',
            'border-style',
            'border-left-style',
            'border-block-end-style',
            'outline',
            'outline-style',
            'outline-width',
            'outline-offset',
        ]) {
            assert.ok(!STATE_ALLOWED.includes(prop), prop);
            refusedProperty(`.t-neo .item:hover { ${prop}: inherit; }`, prop);
        }
    });

    const PSEUDO_ALLOWED_PINNED = [
        'cursor',
        'transform',
        'rotate',
        'scale',
        'translate',
        'transition',
        'transition-property',
        'transition-duration',
        'transition-delay',
        'transition-timing-function',
        'transition-behavior',
    ];
    const ON_A_PSEUDO = /is not a property a state rule may set on a pseudo-element \(cursor, transitions and the no-transform values only: the probe measures a pseudo-element only by its paint at rest\)/;

    it('pins what a pseudo-element under a state may set by value, inside the element list, and refuses every other property of that list on one', () => {
        assert.deepEqual([...STATE_PSEUDO_ALLOWED], PSEUDO_ALLOWED_PINNED);
        assert.equal(new Set(STATE_PSEUDO_ALLOWED).size, STATE_PSEUDO_ALLOWED.length, 'no property twice');
        for (const prop of STATE_PSEUDO_ALLOWED) assert.ok(STATE_ALLOWED.includes(prop), `${prop} is on the element list too`);
        // Each listed property has a reader, as on an element: none is refused as a property a pseudo-element may not set.
        for (const prop of STATE_PSEUDO_ALLOWED) {
            const problems = problemsOf(`.t-neo .item:hover::after { ${written(prop, 'inherit')}; }`);
            assert.ok(!problems.some((p) => /is not a property a state rule may set/.test(p)), `${prop}:\n  ${problems.join('\n  ')}`);
        }
        // Every other property an element may set is refused on a pseudo-element, by name and by the reason.
        for (const prop of STATE_ALLOWED.filter((name) => !STATE_PSEUDO_ALLOWED.includes(name))) {
            const decl = prop === '-webkit-tap-highlight-color' ? `${prop}: transparent` : written(prop, 'inherit');
            const problems = problemsOf(`.t-neo .item:hover::after { ${decl}; }`);
            const name = prop.replace(/^-webkit-/, '');
            const sentence = problems.map((p) => p.replace(/^line \d+: /, '')).find((p) => p.startsWith(`${prop}: `));
            assert.ok(sentence !== undefined && sentence.includes(` — ${name} is not a property`) && ON_A_PSEUDO.test(sentence), `${prop}:\n  ${problems.join('\n  ') || '(no problem)'}`);
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
        // No seventeenth: every rule of the three sheets whose selector names a state (the lint's own reading, fail closed) is one of these.
        let found = 0;
        for (const cls of ['t-modern', 't-neo', 't-rural']) {
            const walk = (nodes) => {
                for (const node of nodes) {
                    if (node.kind === 'rule' && splitTopLevel(node.prelude, ',').some(namesAState)) found += 1;
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
    });

    /** The sixteen structural pseudo-classes, written out: the pin of `STRUCTURAL_PSEUDO_CLASSES` (D-2026-10-20-11). */
    const STRUCTURAL_PINNED = [
        'not',
        'is',
        'where',
        'has',
        'nth-child',
        'nth-last-child',
        'nth-of-type',
        'nth-last-of-type',
        'first-child',
        'last-child',
        'only-child',
        'first-of-type',
        'last-of-type',
        'only-of-type',
        'empty',
        'root',
    ];

    it('fails closed (D-2026-10-20-11): every pseudo-class is a state but the sixteen structural ones, written out', () => {
        assert.deepEqual([...STRUCTURAL_PSEUDO_CLASSES], STRUCTURAL_PINNED);
        assert.equal(new Set(STRUCTURAL_PSEUDO_CLASSES).size, 16);
        // Each structural one names no state, alone, in capitals, with an argument and with nothing else in the selector.
        const argument = { 'nth-child': '(2n + 1)', 'nth-last-child': '(2)', 'nth-of-type': '(odd)', 'nth-last-of-type': '(even)', not: '(.open)', is: '(.open, .shut)', where: '(.open)', has: '(.open)' };
        for (const name of STRUCTURAL_PINNED) {
            for (const cased of [name, name.toUpperCase()]) {
                const selector = `.t-neo .item:${cased}${argument[name] ?? ''} .item-x`;
                assert.ok(!namesAState(selector), selector);
                accepted(`${selector} { opacity: 0.2; }`);
            }
        }
        accepted('.t-neo .items :nth-child(3n + 1 of .item) .item-x { opacity: 0.2; }');
        accepted('.t-neo:not(.shop-window) .stall-head:first-child { opacity: 0.2; }');
        // Every other pseudo-class is a state: the nine the owner named, the ones the first version left to the rest, and names this list has never met.
        for (const state of [
            ...NAMED_STATES,
            ':checked',
            ':open',
            ':popover-open',
            ':visited',
            ':any-link',
            ':link',
            ':fullscreen',
            ':disabled',
            ':enabled',
            ':placeholder-shown',
            ':read-only',
            ':required',
            ':invalid',
            ':valid',
            ':user-valid',
            ':in-range',
            ':out-of-range',
            ':indeterminate',
            ':default',
            ':defined',
            ':paused',
            ':playing',
            ':target-current',
            ':scope',
            ':host',
            ':lang(en)',
            ':dir(rtl)',
            ':nth-col(2)',
            ':a-name-no-list-has-met',
            ':--open',
            ':--a-custom-selector',
            ':-webkit-autofill',
            ':-moz-focusring',
        ]) {
            const selector = `.t-neo .item-x${state}`;
            assert.ok(namesAState(selector), selector);
            refusedProperty(`${selector} { opacity: 0.2; }`, 'opacity');
            refusedProperty(`.t-neo .item:not(${state}) .item-x { opacity: 0.2; }`, 'opacity');
        }
        // The critic's plants of the third review (P1): a fold's closed default, a hidden box, a placeholder showing.
        refusedProperty('.t-neo .sheet:has(details:not([open])) .pay-x { opacity: 0; }', 'opacity');
        refusedProperty('.t-neo .sheet:has(details:not([hidden])) .pay-x { opacity: 0; }', 'opacity');
        refusedProperty('.t-neo:has(.shop-find:not(:placeholder-shown)) .item-x { opacity: 0; }', 'opacity');
        refusedProperty('.t-neo .sheet:has(details:not(:open)) .pay-x { opacity: 0; }', 'opacity');
        // A state the lint cannot read, in a list, beside a rule at rest, or under a media block, is still read.
        refusedProperty('.t-neo .item-x, .t-neo .item-x:placeholder-shown { opacity: 0.2; }', 'opacity');
        refusedProperty('@media (min-width: 680px) { .t-neo .item-x:checked { opacity: 0.2; } }', 'opacity');
    });

    const ESCAPED_ATTRIBUTE = {
        open: '\\6f pen',
        hidden: '\\68 idden',
        'data-turn': '\\64 ata-turn',
        'data-state': '\\64 ata-state',
        'aria-disabled': '\\61 ria-disabled',
        'data-over': '\\64 ata-over',
    };

    it('reads [open], [hidden], [data-turn], [data-state], [aria-disabled] and [data-over] as states in any form and case: bare, with a value, spaced, in capitals, escaped, with a namespace, inside :has() and :not()', () => {
        for (const attribute of ['open', 'hidden', 'data-turn', 'data-state', 'aria-disabled', 'data-over']) {
            for (const written of [
                `[${attribute}]`,
                `[ ${attribute} ]`,
                `[${attribute.toUpperCase()}]`,
                `[${attribute}=""]`,
                `[${attribute}='x']`,
                `[${attribute}="until-found"]`,
                `[${attribute}="" i]`,
                `[${attribute}=x]`,
                `[*|${attribute}]`,
                `[|${attribute}]`,
                `[ns|${attribute}]`,
                `[${attribute}~=x]`,
                `[${attribute}|=x]`,
                `[${attribute}^=x]`,
                `[${ESCAPED_ATTRIBUTE[attribute]}]`,
            ]) {
                for (const selector of [`.t-neo .sheet${written} .pay-x`, `.t-neo .sheet:has(${written}) .pay-x`, `.t-neo .sheet:not(${written}) .pay-x`, `.t-neo ${written}`]) {
                    assert.ok(namesAState(selector), selector);
                    refusedProperty(`${selector} { opacity: 0; }`, 'opacity');
                }
            }
        }
        // The fourth review's B3: the three a look may match and no fixture paints, by the values STATE_ATTRIBUTES lists, in the critic's own selectors.
        for (const selector of [".t-neo .bc[data-state='stale'] .bc-p", ".t-neo:has([aria-disabled='true']) .item-x", ".t-neo:has([data-over='true']) .publish-hex", ".t-neo .buy[aria-disabled='true']"]) {
            assert.ok(namesAState(selector), selector);
            refusedProperty(`${selector} { opacity: 0; }`, 'opacity');
            accepted(`${selector} { color: #000; }`);
        }
        // An attribute the fixtures paint, or one that only sounds like it, is a rule at rest (the probe measures it): `data-copied` both ways, since `addr-shown` and `addr-copied` stage them.
        for (const written of ["[aria-pressed='true']", "[aria-current='page']", '[disabled]', "[data-copied='true']", "[data-copied='shown']", '[data-open]', '[openx]', '[data-hidden]', "[data-role='price']", '[role=open]', '[data-states]', '[data-overs]', '[aria-disabledx]']) {
            const selector = `.t-neo .sheet${written} .pay-x`;
            assert.ok(!namesAState(selector), selector);
        }
        accepted(".t-neo [data-role='price'] { opacity: 0.2; }");
        // A string that holds the word is not an attribute.
        assert.ok(!namesAState(".t-neo .item[aria-label='[open]']"));
    });

    it('reads :--open, a custom selector no browser reads, as the state it fails closed on, and leaves the kit as it was (the fourth review)', () => {
        for (const selector of ['.t-neo .item:--open .item-x', '.t-neo .item:/**/--open .item-x', '.t-neo .item:not(:--open) .item-x', '.t-neo .item:--OPEN .item-x']) {
            assert.ok(namesAState(blankComments(selector)), selector);
            refusedProperty(`${selector} { opacity: 0; }`, 'opacity');
            refused(`${selector} { opacity: 0; }`, /:--open is one engine's selector/i);
        }
        // `--` alone and a dashed name that is not a state are not read as pseudo-classes by the structural list.
        assert.ok(!namesAState('.t-neo .item .item-x'));
        const kit = lintSheet(plantedKit('.t-neo .item:--open .item-x { opacity: 0; }'));
        assert.ok(!kit.some((p) => /--open|engine's selector/.test(p)), kit.join('\n'));
    });

    it('a-comment-inside-a-pseudo-class-is-still-the-pseudo-class: a comment between the colon and the name is read through (B1), in the belt and in the older refusals', () => {
        // The belt: a browser reads a colon, a comment and `hover` as :hover.
        for (const selector of [
            '.t-neo .item:/**/hover .item-x',
            '.t-neo .item:/* x */hover .item-x',
            '.t-neo .item:/**/FOCUS-VISIBLE .item-x',
            '.t-neo .item:/**//**/hover .item-x',
            '.t-neo .item:has(:/**/hover) .item-x',
            '.t-neo .item:/**/placeholder-shown .item-x',
            '.t-neo .item:/**/not(:/**/hover) .item-x',
        ]) {
            refusedProperty(`${selector} { opacity: 0; }`, 'opacity');
        }
        refused('.t-neo .buy:/**/focus-visible { outline: 200px solid #000; outline-offset: -100px; }', /outline is not a property a state rule may set/);
        // A comment inside a structural name does not make it a state.
        accepted('.t-neo .item:/**/first-child .item-x { opacity: 0.2; }');
        // Under a pseudo-element: still a pseudo-element under a state.
        assert.ok(isPseudoUnderState(blankComments('.t-neo .item:/**/hover::after')));
        assert.ok(isPseudoUnderState(blankComments('.t-neo .item:hover:/**/:after')));
        refused('.t-neo .item:/**/hover::after { position: relative; background: #000; }', ON_A_PSEUDO);
        // The older pseudo-element refusals, which the kit lint reaches too: a comment between the colons and the name got past them on main (a fix of a hole on main).
        for (const [selector, pattern] of [
            ['.t-neo .face-x::/**/first-letter', /::first-letter restyles part of a line of text/],
            ['.t-neo .face-x:/**/:first-letter', /::first-letter restyles part of a line of text/],
            ['.t-neo .face-x::/**/first-line', /::first-line restyles part of a line of text/],
            ['.t-neo .face-x::/**/marker', /::marker is a list marker/],
            ['.t-neo .item-x::/**/selection', /::selection is not ::before or ::after/],
            ['.t-neo .item-x::/**/placeholder', /::placeholder is not ::before or ::after/],
            ['.t-neo .item-x::/**/-webkit-scrollbar', /one engine's selector/],
        ]) {
            const rule = `${selector} { color: transparent; }`;
            const first = lintLookSheet(plantedNeo(rule), { lookClass: 't-neo' });
            assert.ok(first.some((p) => pattern.test(p)), `first party, ${selector}:\n  ${first.join('\n  ') || '(no problem)'}`);
            const kit = lintSheet(plantedKit(rule));
            assert.ok(kit.some((p) => pattern.test(p)), `kit, ${selector}:\n  ${kit.join('\n  ') || '(no problem)'}`);
        }
        // The older state list, which the file-mask refusal reads in the kit as in a first-party sheet, takes the whitespace too: a comment hid the state from it on main.
        const MASK = /a file's mask or clip in a state rule/;
        for (const state of [':hover', ':/**/hover', ':/* x */focus-visible', ':/**/checked']) {
            const rule = `.t-neo .item${state} { mask-image: url(art/x.svg); }`;
            const first = lintLookSheet(plantedNeo(rule), { lookClass: 't-neo' });
            assert.ok(first.some((p) => MASK.test(p)), `first party, ${state}:\n  ${first.join('\n  ') || '(no problem)'}`);
            const kit = lintSheet(plantedKit(rule), { art: ['x.svg'] });
            assert.ok(kit.some((p) => MASK.test(p)), `kit, ${state}:\n  ${kit.join('\n  ') || '(no problem)'}`);
        }
        // `content` is read on the pseudo-element it lands in, comment or no comment.
        const text = lintLookSheet(plantedNeo(".t-neo .item-x::/**/after { content: '9'; }"), { lookClass: 't-neo' });
        assert.ok(!text.some((p) => /only ::before and ::after may carry content/.test(p)), text.join('\n'));
        assert.ok(text.some((p) => /a look prints only/.test(p)), text.join('\n'));
        // The same selector without the comment stands as it did.
        accepted(".t-neo .item-x::after { content: ''; }");
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
        'border: solid red',
        'border: solid',
        'border: 0',
        'border: inherit',
        'border-top: solid red',
        'border-style: none',
        'border-style: solid',
        'border-left-style: hidden',
        'border-block-end-style: none',
        'outline: none',
        'outline: 2px solid red',
        'outline-style: none',
        'outline-style: solid',
        'outline-width: 2px',
        'outline-offset: 2px',
        'outline-offset: -100px',
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
    // Written out, both: a describe body registers and never computes (`no-node-test-computes-in-a-describe-body`).
    const ELEMENT_SUBJECTS = ['.t-neo .item-x:hover', '.t-neo .buy:focus-visible', '.t-neo .item:hover', '.t-neo [data-turn] .item-p', '.t-neo .mini:active'];
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

    it('reads an ink at alpha 1, and no other: a literal colour or an opaque palette role with no fallback; inherit and currentColor are refused (B2)', () => {
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
            ...OPAQUE_PINNED.map((role) => `var(${role})`),
            'var( --s-accent )',
        ]) {
            accepted(`.t-neo .item-x:hover { color: ${value}; }`);
        }
        // B2: either keyword hands the ink to whatever the parent paints, and a parent a rule at rest drew clear fades the figure.
        const HANDS_ON = /hands the ink to whatever the parent paints, and a parent a rule at rest drew clear fades the figure/;
        for (const value of ['currentColor', 'CURRENTCOLOR', 'currentcolor', 'inherit', 'INHERIT']) {
            refused(`.t-neo .item-x:hover { color: ${value}; }`, HANDS_ON);
        }
        // The critic's plants: a parent drawn clear at rest, the figure given its ink, then handed the parent's under a state.
        refused('.t-neo .item-a { color: transparent; }\n.t-neo .item-x, .t-neo .item-from, .t-neo .item-u { color: #fff; }\n.t-neo .item:hover .item-x { color: inherit; }', HANDS_ON);
        refused('.t-neo .item-a { color: transparent; }\n.t-neo .item-x, .t-neo .item-from, .t-neo .item-u { color: #fff; }\n.t-neo .item:hover .item-x { color: currentColor; }', HANDS_ON);
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
        for (const subject of SUBJECTS.filter((subject) => !subject.endsWith('::after'))) accepted(`${subject} { color: #dff6ff; }`);
        // A pseudo-element under a state sets no colour at all (B3): the ink is the pseudo-element list's to refuse.
        refusedProperty('.t-neo .item-x:hover::after { color: #dff6ff; }', 'color');
    });

    it('reads a ground of any alpha, a gradient and nothing that is a picture, and never currentColor as a ground', () => {
        for (const rule of [
            '.t-neo .buy:hover { background: rgba(37, 99, 235, 0.1); }',
            '.t-neo .buy:hover { background: transparent; }',
            '.t-neo .buy:hover { background-color: rgba(44, 233, 224, 0.18); }',
            '.t-neo .buy:hover { background-color: var(--s-addr-bg); }',
            '.t-neo .buy:hover { background-color: color-mix(in srgb, var(--s-accent) 12%, transparent); }',
            '.t-neo .buy:hover { background-color: color-mix(in oklch, red 30%, rgb(0 0 0 / 0.5) 70%); }',
            '.t-neo .buy:hover { background-color: initial; }',
            '.t-neo .buy:hover { background-color: unset; }',
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
        // The ground the colour of the ink it holds hides the figure — a gradient of it too (B2).
        for (const rule of [
            '.t-neo .item-x:hover { background-color: currentColor; }',
            '.t-neo .item-x:hover { background: currentcolor; }',
            '.t-neo .item-x:hover { background: color-mix(in srgb, currentcolor 50%, red); }',
            '.t-neo .item-x:hover { background: linear-gradient(currentColor, currentColor); }',
            '.t-neo .item-x:hover { background-image: repeating-linear-gradient(45deg, red 0 2px, currentcolor 2px 4px); }',
        ]) {
            refused(rule, /currentcolor as a ground is the colour of the ink it holds/);
        }
        // B2: inherit takes the background the parent paints, a picture a rule at rest sized to nothing included.
        const NO_INHERIT = /inherit takes the background the parent paints, a picture a rule at rest sized to nothing included/;
        for (const rule of [
            '.t-neo .item-a { background: url(decor/rain-near.svg) no-repeat 0 0 / 0 0; }\n.t-neo .item:hover .item-x { background: inherit; }',
            '.t-neo .item-a { background-image: url(decor/rain-near.svg); background-size: 0 0; }\n.t-neo .item:hover .item-x { background-image: inherit; }',
            '.t-neo .item:hover .item-x { background-color: inherit; }',
            '.t-neo .item:hover .item-x { background: red inherit; }',
            '.t-neo .item:hover .item-x { background: INHERIT; }',
        ]) {
            const problems = refused(rule, /inherit takes the (?:background|colour) the parent paints/);
            assert.ok(problems.some((p) => NO_INHERIT.test(p) || /inherit takes the colour the parent paints/.test(p)), problems.join('\n'));
        }
        // Colours this lint cannot read as a ground: a function it does not know, a fallback, a system word it takes for a keyword stands.
        refused('.t-neo .buy:hover { background-color: rgb(from red r g b); }', /is not a colour this lint reads/);
        refused('.t-neo .buy:hover { background-color: var(--wash); }', /is not a colour this lint reads/);
        refused('.t-neo .buy:hover { background-color: var(--s-bg, red); }', /is not a colour this lint reads/);
    });

    it('lets a border and an outline change colour and nothing else (D-2026-10-20-11): no style, no width, no offset, no shorthand', () => {
        for (const rule of [
            '.t-neo .buy:hover { border-color: red; }',
            '.t-neo .buy:hover { border-color: red blue; }',
            '.t-neo .buy:hover { border-color: rgba(255, 77, 122, 0.85); }',
            '.t-neo .buy:hover { border-color: var(--s-accent) transparent; }',
            '.t-neo .buy:hover { border-color: color-mix(in srgb, var(--s-accent) 50%, transparent); }',
            '.t-neo .buy:hover { border-top-color: red; border-inline-end-color: blue; }',
            '.t-neo .buy:focus-visible { outline-color: red; }',
            '.t-neo .buy:focus-visible { outline-color: var(--s-accent); }',
            '.t-neo .buy:focus-visible { outline-color: transparent; }',
        ]) {
            accepted(rule);
        }
        // B2: currentColor and inherit follow the ink or the parent, and initial and unset are currentColor on an edge.
        const EDGE = /inherit takes the colour the parent paints|is currentcolor on an edge or a shadow|currentcolor is the ink of the box/;
        for (const value of ['currentColor', 'inherit', 'initial', 'unset', 'red currentcolor', 'red blue inherit']) {
            for (const prop of ['border-color', 'border-left-color', 'outline-color']) refused(`.t-neo .buy:hover { ${prop}: ${value}; }`, EDGE);
        }
        refused('.t-neo .buy:hover { border-color: var(--wash, red); }', /is not a colour this lint reads/);
        refused('.t-neo .buy:hover { border-color: red blue red blue red; }', /a border colour is one to four colours/);
        // The style, the width and the offset are not a state's: the cascade defeats any rule that states them beside the colour.
        for (const decl of [
            'border: solid red',
            'border: dashed var(--s-accent)',
            'border: none',
            'border: inherit',
            'border: 1px solid red',
            'border: thin solid red',
            'border: 0',
            'border-top: solid red',
            'border-bottom: solid var(--s-muted)',
            'border-left: 9999px solid transparent',
            'border-style: none',
            'border-style: hidden',
            'border-style: solid',
            'border-style: inherit',
            'border-left-style: none',
            'border-block-end-style: hidden',
            'border-width: 40px',
            'border-image: linear-gradient(red, blue) 1',
            'border-image-source: url(./x.svg)',
            'border-image-outset: 9999px',
            'border-radius: 0',
            'outline: none',
            'outline: 0 none',
            'outline: 2px solid var(--s-accent)',
            'outline: solid red',
            'outline: auto',
            'outline: inherit',
            'outline-style: none',
            'outline-style: solid',
            'outline-style: auto',
            'outline-width: 2px',
            'outline-offset: 2px',
            'outline-offset: -100px',
        ]) {
            refusedProperty(`.t-neo .buy:hover { ${decl}; }`, decl.slice(0, decl.indexOf(':')));
        }
        // The owner's plants: a ring turned on under a state over a width and an offset a later, more specific rule at rest wrote — the sentence "written in the same rule" was false, the cascade defeats it.
        for (const rule of [
            '.t-neo .item:hover .item-x { outline: solid 2px; outline-offset: 0; }\n.t-neo .item .item-a .item-x { outline-width: 200px; outline-offset: -100px; outline-color: #000; }',
            '.t-neo.t-neo .item .item-x { outline-width: 200px; outline-offset: -100px; outline-color: #000; }\n.t-neo .item:hover .item-x { outline: solid 2px; outline-offset: 0; }',
            '.t-neo .item-x { outline-width: 200px; outline-offset: -100px; outline-color: #000; }\n.t-neo .item:hover .item-x { outline-style: solid; }',
            '.t-neo .buy { outline: 300px none #000; outline-offset: -150px; }\n.t-neo .buy:focus-visible { outline-style: solid; }',
            '.t-neo .buy:focus-visible { outline: 2px solid red; outline-offset: 2px; }',
            // The border version of the same trick, and the shorthand's own width.
            '.t-neo .item .item-a .item-x { border-width: 40px; border-color: #000; }\n.t-neo .item:hover .item-x { border: solid; }',
            '.t-neo .item:hover .item-x { border: solid; }\n.t-neo .item .item-a .item-x { border-width: 40px; border-color: #000; }',
            '.t-neo .item-x { border: 40px none; }\n.t-neo .item:hover .item-x { border-style: solid; }',
            '.t-neo .item:hover .item-x { border: solid; }',
        ]) {
            const problems = problemsOf(rule);
            assert.ok(problems.some((p) => /(?:outline|border)(?:-style)?: .* under ".+" — (?:outline|border)(?:-style)? is not a property a state rule may set/.test(p)), `${rule}:\n  ${problems.join('\n  ') || '(no problem)'}`);
        }
        // The reason is on the sentence, so a reader of the lint's output learns why.
        const sentence = problemsOf('.t-neo .buy:hover { outline: 2px solid red; }').find((p) => p.includes('outline: 2px solid red'));
        assert.match(sentence, /a state sets an edge's colour and nothing else: a style, a width or an offset written at rest is defeated by the cascade, and the shorthand adds the padding it resets/);
        // A colour written beside them does not rescue them, and they stand at rest.
        refusedProperty('.t-neo .buy:hover { border: solid red; border-color: red; }', 'border');
        accepted('.t-neo .buy { border: 1px solid red; outline: 2px solid red; outline-offset: 2px; }');
    });

    it('lets a shadow stand and not a fill: each layer names one colour, at most two outer layers, no blur past 16px; an outer one with no spread and an offset of 8px at most', () => {
        for (const value of [
            '0 0 16px rgba(44, 233, 224, 0.35)',
            '0 0 10px #2ce9e0, 0 0 16px #ff4d7a',
            '0 8px 16px rgba(0, 0, 0, 0.2)',
            '8px 8px 0 #000',
            '-8px -8px 0 #000',
            '0 0 0 -4px red',
            'inset 0 0 0 4000px red',
            'inset 0 0 16px var(--s-accent)',
            'inset 0 0 0 4000px #000, inset 0 0 16px #fff, inset 0 0 16px #000',
            '0 0 8px var(--s-accent)',
            'none',
            'initial',
            'unset',
            '0 2px 0 0 rgb(0 0 0 / 0.35)',
            '0 0 8px red, 0 0 16px blue, inset 0 0 4px red',
        ]) {
            for (const subject of ELEMENT_SUBJECTS) accepted(`${subject} { box-shadow: ${value}; }`);
        }
        const FILL = /an outer shadow with a spread, or an offset past 8px, is a fill the size of a box and not a shadow/;
        // The critic's plant: a 4000px spread paints over the rows beside it.
        refused('.t-neo .item:hover { box-shadow: 0 0 0 4000px #000; }', FILL);
        for (const value of ['0 0 0 1px red', '0 0 0 2px var(--s-accent)', '9px 0 0 #000', '0 9px 0 #000', '0 4000px 0 #000', '-9px 0 8px red', '0 8px 16px rgba(0, 0, 0, 0.2), 0 0 0 1px red', '0 0 0 4000px var(--s-text)']) {
            refused(`.t-neo .item:hover { box-shadow: ${value}; }`, FILL);
        }
        // The cap on the blur (the third review's P2): a blur is not a fade that dies with distance, and layers add.
        const BLUR = /a shadow blur past 16px is a haze the size of a box, and layers add: twenty of 0 -8px 120px #000 come to about 99\.8% black/;
        for (const value of ['0 0 17px red', '0 0 4000px #000', '0 -8px 120px #000', 'inset 0 0 17px red', 'inset 0 0 0 4000px #000, inset 0 0 120px #000', '0 0 8px red, 0 0 24px blue']) {
            refused(`.t-neo .item:hover { box-shadow: ${value}; }`, BLUR);
        }
        const twenty = Array.from({ length: 20 }, () => '0 -8px 120px #000').join(', ');
        refused(`.t-neo .item:hover { box-shadow: ${twenty}; }`, BLUR);
        // Twenty layers inside the blur cap are the layer cap's: more than two outer layers.
        const LAYERS = /more than 2 outer shadow layers: they add, and a stack of them is a fill the size of a box/;
        const stack = Array.from({ length: 20 }, () => '0 -8px 16px #000').join(', ');
        refused(`.t-neo .item:hover { box-shadow: ${stack}; }`, LAYERS);
        refused('.t-neo .item:hover { box-shadow: 0 0 8px red, 0 0 8px blue, 0 0 8px green; }', LAYERS);
        // Inset layers are free of the count.
        accepted(`.t-neo .item:hover { box-shadow: ${Array.from({ length: 20 }, () => 'inset 0 0 16px #000').join(', ')}; }`);
        // B2: a layer that names no colour is drawn in the ink (currentColor), and so is one that says so; an inset one fills the box with it.
        const NO_COLOUR = /a shadow layer that names no colour is drawn in the ink of the box, which a state may change; an inset one fills the box with it/;
        for (const value of ['inset 0 0 0 4000px', '0 0 8px', '8px 8px', '0 0 8px red, 0 0 8px']) refused(`.t-neo .item:hover { box-shadow: ${value}; }`, NO_COLOUR);
        for (const value of ['0 0 8px currentColor', 'inset 0 0 0 4000px currentcolor', '0 0 8px red, 0 0 8px CURRENTCOLOR']) {
            refused(`.t-neo .item:hover { box-shadow: ${value}; }`, /box-shadow this lint cannot size/);
        }
        const READS = /a box-shadow this lint cannot size/;
        for (const value of ['var(--s-card-shadow)', '0 0 1em red', '0 0 0 1rem red', '0 0 5% red', '1 1 red', '0 red', '0 0 0 0 0 red', '0 0 -4px red', '0 0 8px notacolour', '0 0 8px red red', 'inherit', '0 0 8px var(--wash)']) {
            refused(`.t-neo .item:hover { box-shadow: ${value}; }`, READS);
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

    it('holds a pseudo-element under a state to cursor, transitions and the identity transforms: no ink, ground, border, shadow or outline, in any form it is written', () => {
        // The open candidate: a pseudo-element a rule at rest moved over a figure, its ground clear, given a ground by a state.
        const AT_REST = ".t-neo .item-p::after { content: ''; position: relative; left: -80px; background: transparent; }";
        accepted(AT_REST);
        for (const state of ['.item:hover', '.item:focus-within', '.buy:active', '[data-turn] .item', '.item:not(:hover)', '.item:is(:focus-visible, .open)']) {
            for (const pseudo of ['::after', '::before', ':after', ':before']) {
                for (const decl of [
                    'background: #000',
                    'background: transparent',
                    'background-color: red',
                    'background-image: linear-gradient(red, blue)',
                    'border-color: red',
                    'border: solid red',
                    'border-style: none',
                    'box-shadow: 0 0 8px red',
                    'box-shadow: inset 0 0 0 4000px red',
                    'outline: 2px solid red; outline-offset: 2px',
                    'outline-style: none',
                ]) {
                    refused(`${AT_REST}\n.t-neo ${state} .item-p${pseudo} { ${decl}; }`, ON_A_PSEUDO);
                }
            }
        }
        // The plant's own sentence names the property and says why, and the belt's tail follows it.
        const sentence = problemsOf(`${AT_REST}\n.t-neo .item:hover .item-p::after { background: #000; }`);
        assert.equal(sentence.length, 1, sentence.join('\n'));
        assert.match(sentence[0], /^line \d+: background: #000 under "\.t-neo \.item:hover \.item-p::after" — background is not a property a state rule may set on a pseudo-element \(/);
        assert.match(sentence[0], BELT);
        // Two properties in a rule of other, allowed ones are refused alone, and the allowed ones stand.
        const mixed = problemsOf('.t-neo .item:hover::after { color: red; background: #000; cursor: pointer; transition: color 0.2s; }');
        assert.equal(mixed.length, 2, mixed.join('\n'));
        assert.match(mixed[0], /color: red under/);
        assert.match(mixed[1], /background: #000 under/);
        // A list that holds a pseudo-element under a state holds the whole rule, the element's selector too: the declarations reach both.
        refused('.t-neo .buy:hover, .t-neo .item:hover .item-p::after { background: #000; }', ON_A_PSEUDO);
        // What stands on a pseudo-element under a state: a cursor, transitions and the identity transforms. Not an ink (B3): a generated glyph at a large size would appear over a figure when its colour changed.
        for (const decl of ['cursor: pointer', 'transition: color 0.2s ease', '-webkit-transition: color 0.2s; transition: color 0.2s', 'transition-property: color', 'rotate: 0deg', 'scale: 1', 'translate: 0', 'transform: none', 'transform: translateZ(0)']) {
            accepted(`${AT_REST}\n.t-neo .item:hover .item-p::after { ${decl}; }`);
            accepted(`.t-neo .item:hover::before { ${decl}; }`);
        }
        for (const decl of ['color: #dff6ff', 'color: currentColor', 'color: inherit', 'color: var(--s-accent)', 'color: rgba(0, 0, 0, 0.1)']) {
            refused(`${AT_REST}\n.t-neo .item:hover .item-p::after { ${decl}; }`, ON_A_PSEUDO);
            refused(`.t-neo .item:hover::before { ${decl}; }`, ON_A_PSEUDO);
        }
        // The same declarations on the same pseudo-element at rest, which the probe measures, stand — and so do they on an element under a state.
        accepted(".t-neo .item-p::after { content: ''; background: #000; border: 1px solid red; box-shadow: 0 0 0 4px red; outline: 2px solid red; }");
        accepted('.t-neo .item:hover .item-p { background: #000; border-color: red; box-shadow: 0 0 8px red; }');
        // A pseudo-element at rest in a list beside a state selector with no pseudo-element in it is the pseudo-element at rest: measured.
        accepted('.t-neo .item:hover, .t-neo .item-p::after { background: #000; }');
        // The old critic's plant: a positioned pseudo-element over the figure, with a ground.
        const problems = problemsOf(".t-neo .item:hover::after { content: ''; position: absolute; inset: 0; background: #000; }");
        for (const prop of ['content', 'position', 'inset', 'background']) {
            assert.ok(problems.some((p) => new RegExp(`^line \\d+: ${prop}: .* — ${prop} is not a property a state rule may set`).test(p)), problems.join('\n'));
        }
        for (const decl of ["content: ''", 'position: absolute', 'inset: 0', 'display: block', 'opacity: 0.5', 'backdrop-filter: blur(30px)', 'width: 100%', 'height: 100%', 'transform: scale(2)', 'z-index: 1']) {
            refused(`.t-neo .item:hover::after { ${decl}; }`);
        }
        // An outline is refused by the property, on a pseudo-element's shorter list: both of its declarations, by name.
        const ring = problemsOf('.t-neo .item:hover::after { outline: 2px solid red; outline-offset: 2px; }');
        assert.deepEqual(ring.map((p) => p.replace(/^line \d+: /, '').split(' under ')[0]), ['outline: 2px solid red', 'outline-offset: 2px']);
    });

    it('reads a pseudo-element under a state in the selector, whatever its colon, its state or its place in the list', () => {
        for (const selector of [
            '.t-neo .item:hover::after',
            '.t-neo .item:hover .item-p::before',
            '.t-neo .item:hover .item-p:after',
            '.t-neo .item:HOVER::AFTER',
            '.t-neo .item-p::after:hover',
            '.t-neo .item:has(:focus-visible) .item-p::before',
            '.t-neo [data-turn] .item::after',
            ".t-neo [data-turn='cw'] .item::after",
            '.t-neo .item:not(:hover)::after',
            '.t-neo .item:hover::first-line',
            '.t-neo .item:hover::selection',
        ]) {
            assert.ok(isPseudoUnderState(selector), selector);
        }
        for (const selector of ['.t-neo .item:hover', '.t-neo .item-p::after', '.t-neo .item-p:after', '.t-neo .item:first-child::before', '.t-neo .item:hover .item-p', '.t-neo [data-turn] .item', ".t-neo .item[aria-label='::after:hover']"]) {
            assert.ok(!isPseudoUnderState(selector), selector);
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
            ['background-color', 'background-image', 'color', 'rotate', 'scale', 'transform', 'translate'],
            'the probe holds these and a state may set them: each is read, not blanket-allowed (the outline longhands are refused since D-2026-10-20-11)',
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
            ".t-neo .item-p::after { content: ''; position: relative; left: -80px; background: transparent; }\n.t-neo .item:hover .item-p::after { background: #000; box-shadow: 0 0 0 4000px #000; border: solid red; outline: 3000px solid #000; }",
            '@keyframes t-neo-fade { to { opacity: 0; } }\n.t-neo .item:hover .item-x { animation-name: t-neo-fade; }',
            '@keyframes t-neo-g { 0% { --g: 0em; } 100% { --g: .3em; } }',
        ]) {
            const kit = lintSheet(plantedKit(rule));
            assert.ok(!kit.some((p) => BELT.test(p) || /a custom property in a keyframe|palette role/.test(p)), `kit, ${rule}:\n  ${kit.join('\n  ')}`);
        }
        // The kit's own refusals stand — and nothing is added to them.
        assert.deepEqual(lintSheet(plantedKit('.t-neo .buy:hover { outline: 3000px solid #000; }')), []);
        // D-2026-10-20-10 and -11 are first party too: a picture for a cursor, a keyframe that sets display, a pseudo-element painted from its host, a state the belt names.
        const FIRST_PARTY = /a cursor that is not a keyword|in a keyframe takes a box|takes its paint from its host|prints text and states no colour|names no colour|is its host's ink|reads a custom property that is not a palette role|all re-states every property|names a side by the writing mode|it reaches past its box, where a state that changes the ink|an outline's ring reaches over the boxes beside its box|all in a keyframe re-states every property/;
        for (const rule of [
            '.t-neo .item:hover { cursor: image-set(url(art/x.svg) 1x) 0 0, pointer; }',
            '.t-neo .item { cursor: pointer; }\n@keyframes wk-gone { 0%, 100% { display: none; } }',
            ".t-neo .item-b::after { content: ''; background: inherit; box-shadow: 0 0 4px; border: 1px solid; }",
            ".t-neo .wearing::before { content: '// '; }",
            '.t-neo .sheet:has(details:not([open])) .pay-x { opacity: 0; }',
            '.t-neo .item-x:placeholder-shown { opacity: 0; }',
            '.t-neo .item-x:hover { color: currentColor; background-image: inherit; border: solid; }',
            // The fourth review: visibility and all in a keyframe, a paint past its box in no colour, an outline past its cap, a pseudo-element's mask, variable, logical border and all.
            '@keyframes wk-gone { to { visibility: hidden; } }',
            '@keyframes wk-z { to { all: unset; } }',
            '.t-neo .item { box-shadow: 0 0 0 4000px currentColor; text-shadow: 300px 0 0; filter: drop-shadow(0 400px 0); border-image: linear-gradient(currentColor, red) 1; }',
            '.t-neo .item { outline: 4000px solid; outline-offset: -100px; }',
            ".t-neo .item-p::after { content: ''; mask-image: linear-gradient(currentColor, currentColor); background: var(--g); border-block: 40px solid; border-top: 40px solid; all: unset; }",
        ]) {
            const kit = lintSheet(plantedKit(rule));
            assert.ok(!kit.some((p) => FIRST_PARTY.test(p) || BELT.test(p)), `kit, ${rule}:\n  ${kit.join('\n  ')}`);
        }
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

    it('no-sheet-a-run-serves-has-a-pseudo-element-under-a-state: the shorter list costs the shipped looks, the starters, the fixtures and the canary nothing', () => {
        const rulesOf = (css) => {
            const out = [];
            const walk = (nodes) => {
                for (const node of nodes) {
                    if (node.kind === 'rule') out.push(node.prelude);
                    else if (node.children !== undefined) walk(node.children);
                }
            };
            walk(parseSheet(css).nodes);
            return out;
        };
        const sheets = lookRows(SERVED)
            .filter((row) => row.role !== 'kit')
            .map((row) => ({ name: `${row.role}: ${row.path}`, css: row.css }));
        const roles = new Set(lookRows(SERVED).filter((row) => row.role !== 'kit').map((row) => row.role));
        for (const role of ['look', 'fixture', 'private']) assert.ok(roles.has(role), `a ${role} sheet is read`);
        // The three kit starters, as `workshop:start` writes them.
        for (const cls of ['t-modern', 't-neo', 't-rural']) sheets.push({ name: `starter: ${cls}`, css: rescopeSheet(read(sheetOf(cls).path), cls.slice(2), carried) });
        // The canary, rebuilt from public bytes.
        sheets.push({ name: 'canary', css: canaryFiles()['canary/sheet.css'] });
        assert.ok(sheets.length >= 9, `${sheets.length} sheets read`);
        let stateRules = 0;
        for (const { name, css } of sheets) {
            const rules = rulesOf(css);
            assert.ok(rules.length > 0, `${name}: the walk read rules`);
            for (const prelude of rules) {
                const selectors = splitTopLevel(prelude, ',');
                stateRules += selectors.some(namesAState) ? 1 : 0;
                assert.deepEqual(selectors.filter(isPseudoUnderState), [], `${name}: a pseudo-element under a state in "${prelude.replace(/\s+/g, ' ')}"`);
            }
        }
        // The walk sees state rules and pseudo-elements, so the zero is a reading and not a blind walk: 16 state rules in the three looks, 16 more in their starters.
        assert.ok(stateRules >= 32, `${stateRules} state rules read`);
        const pseudoRules = sheets.flatMap(({ css }) => rulesOf(css)).filter((prelude) => /::?(?:before|after)(?![\w-])/i.test(prelude));
        assert.ok(pseudoRules.length >= 4, `${pseudoRules.length} rules naming a pseudo-element read (Neo's four at the least)`);
        // Positive control: the reading finds one in a sheet that has it.
        const planted = rulesOf(plantedNeo('.t-neo .item:hover .item-p::after { color: red; }'));
        assert.equal(planted.flatMap((prelude) => splitTopLevel(prelude, ',')).filter(isPseudoUnderState).length, 1);
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

describe('a-prefixed-twin-is-a-property-that-exists', () => {
    /**
     * G4's twin, before 8g2, the fifth review's side finding to item 6: the
     * twin rule read a prefixed property's twin as its name less the prefix,
     * so the critic's PQM wrote `mask-box-image:`, which nothing reads,
     * beside `-webkit-mask-box-image:` and stood. In a first-party sheet the
     * twin is one that exists (`PREFIXED_TWINS`, measured in headless Chrome
     * 156): the mask border's is `mask-border`, a logical side's its logical
     * property, and a prefixed property with none is refused outright. The
     * kit keeps the plain rule the workshop README states.
     */
    const PQM = '.t-neo .qr { mask-box-image: linear-gradient(#0000, #0000) 1; -webkit-mask-box-image: linear-gradient(#0000, #0000) 1; }';

    it('refuses a twin that is no property in a first-party sheet, and names the one that exists', () => {
        const problems = lintLookSheet(plantedNeo(PQM), { lookClass: 't-neo' });
        assert.ok(problems.some((p) => /-webkit-mask-box-image: .* write mask-border: with the same value beside it/.test(p)), problems.join('\n'));
        accepts('.t-neo .qr { mask-border: linear-gradient(#0000, #0000) 1; -webkit-mask-box-image: linear-gradient(#0000, #0000) 1; }');
        const none = lintLookSheet(plantedNeo('.t-neo .item-n { -webkit-font-smoothing: antialiased; font-smoothing: antialiased; }'), { lookClass: 't-neo' });
        assert.ok(none.some((p) => /font-smoothing names no property Chrome reads, and -webkit-font-smoothing has no unprefixed twin there/.test(p)), none.join('\n'));
    });

    it('maps every twin to a property, or to none, and leaves out the two every engine reads under the prefix', () => {
        for (const [prop, twin] of Object.entries(PREFIXED_TWINS)) {
            assert.match(prop, /^-webkit-/, prop);
            assert.ok(twin === null || (typeof twin === 'string' && !twin.startsWith('-') && twin !== prop.slice('-webkit-'.length)), `${prop} → ${twin}`);
        }
        assert.equal(PREFIXED_TWINS['-webkit-mask-box-image'], 'mask-border');
        assert.ok(!Object.hasOwn(PREFIXED_TWINS, '-webkit-line-clamp') && !Object.hasOwn(PREFIXED_TWINS, '-webkit-box-orient'));
        // Every prefixed property a served first-party sheet writes has a twin that is its name less the prefix.
        for (const sheet of LOOKS) {
            for (const [, prop] of read(sheet.path).matchAll(/(?:^|[;{\s])(-webkit-[a-z-]+)\s*:/g)) assert.ok(!Object.hasOwn(PREFIXED_TWINS, prop), `${sheet.path} writes ${prop}`);
        }
    });

    it('leaves the kit on the plain rule, as the README states it', () => {
        // The kit reads the twin as the name less its prefix, a twin nothing reads included: a README line for the owner.
        assert.deepEqual(lintSheet(plantedKit(PQM)), []);
    });
});

describe('a-cursor-is-a-keyword', () => {
    /**
     * D-2026-10-20-11 (the lint-belts critic's third review, P2): `cursor:
     * url(…)` and `image-set(…)` stand a picture of up to 128px at the
     * pointer, over whatever the pointer is over, a figure among them, where
     * no pass paints it. A first-party sheet writes a keyword, at rest and
     * under a state alike. No first-party sheet sets a cursor today: Neo's
     * `.invite-cursor` is a class name.
     */
    const CURSOR = /a cursor that is not a keyword stands a picture of up to 128px at the pointer/;
    const PICTURES = [
        'url(decor/rain-near.svg) 0 64, pointer',
        'image-set(url(decor/rain-near.svg) 1x) 0 0, pointer',
        '-webkit-image-set(url(x.svg) 1x), auto',
        'url(x.svg) 2 2',
        'URL(x.svg) 0 0, pointer',
        'pointer, url(x.svg) 0 0, auto',
        'var(--c)',
        'var(--c, pointer)',
        'u\\72l(x.svg), pointer',
        'pointer 2 2',
    ];

    it('refuses anything but a keyword list as a cursor: at rest, under a state, in a media block and in a keyframe', () => {
        for (const value of PICTURES) {
            for (const rule of [
                `.t-neo .item { cursor: ${value}; }`,
                `.t-neo .item:hover { cursor: ${value}; }`,
                `.t-neo .item-x:focus-visible::after { cursor: ${value}; }`,
                `@media (min-width: 680px) { .t-neo .item { cursor: ${value}; } }`,
                `@keyframes t-neo-c { to { cursor: ${value}; } }`,
            ]) {
                const problems = lintLookSheet(plantedNeo(rule), { lookClass: 't-neo' });
                assert.ok(problems.some((p) => CURSOR.test(p)), `${rule}:\n  ${problems.join('\n  ') || '(no problem)'}`);
            }
        }
    });

    it('takes a keyword, or a list of them, wherever it is written', () => {
        for (const value of ['pointer', 'not-allowed', 'grab', 'grabbing', 'auto', 'default', 'text', 'zoom-in', 'inherit', 'pointer, auto', 'POINTER']) {
            accepts(`.t-neo .item { cursor: ${value}; }`);
            accepts(`.t-neo .item:hover { cursor: ${value}; }`);
            accepts(`.t-neo .item:hover::after { cursor: ${value}; }`);
        }
    });

    it('leaves the kit lint as it was, and no first-party sheet a run serves sets a cursor', () => {
        const kit = lintSheet(plantedKit('.t-neo .item { cursor: image-set(url(art/x.svg) 1x) 0 0, pointer; }'));
        assert.ok(!kit.some((p) => CURSOR.test(p)), kit.join('\n'));
        let seen = 0;
        for (const sheet of lookRows(SERVED).filter((row) => row.role !== 'kit')) {
            const rules = [];
            const walk = (nodes) => {
                for (const node of nodes) {
                    if (node.kind === 'rule') rules.push(node);
                    else if (node.children !== undefined) walk(node.children);
                }
            };
            walk(parseSheet(sheet.css).nodes);
            for (const rule of rules) {
                for (const decl of declarationsOf(rule.body)) {
                    if (decl.prop === 'cursor') assert.ok(/^[a-z, -]+$/i.test(decl.value), `${sheet.path}: ${decl.value}`);
                }
            }
            seen += rules.length;
        }
        assert.ok(seen > 200, `${seen} rules read`);
        // The naive search for the word finds Neo's class name, which is no cursor property.
        assert.match(NEO_CSS, /\.t-neo \.invite-cursor \{/);
        assert.ok(!/(?:^|[{;\s])cursor\s*:/.test(NEO_CSS));
    });
});

describe('a-keyframe-never-takes-a-box-out-of-the-layout', () => {
    /**
     * D-2026-10-20-10: a first-party look's keyframes may not set `display`
     * or `content-visibility`, and (D-2026-10-20-13 (3), the fourth review's
     * PT) `visibility` or `all`. A keyframe that sets one takes a box (a money
     * node, or the card that holds one) out of the layout, leaves it
     * unrendered or leaves it unseen for part of a cycle, and the probe reads
     * one frozen instant of an animation. The critic's plants: T2c, `0%,
     * 100% { display: none }` run on a quote's `.item-a`, and PT,
     * `visibility: hidden` in a keyframe delayed 120s and filled forwards, so
     * the probe's instant is never inside it. `all` re-states every property,
     * these among them. The kit is unchanged.
     */
    const GONE = /(?:display|content-visibility|visibility) in a keyframe takes a box \(a money node, or the card that holds one\) out of the layout, or leaves it unrendered or unseen, for part of a cycle/;
    const ALL_STOP = /all in a keyframe re-states every property/;

    it('refuses display and content-visibility in any keyframe, on the critic\'s plant and in every position', () => {
        for (const rule of [
            '@keyframes t-neo-gone { 0%, 100% { display: none; } }\n.t-neo .item-a { animation: t-neo-gone 2s infinite; }',
            '@keyframes t-neo-gone { 0%, 100% { display: none; } }',
            '@keyframes t-neo-gone { from { display: none; } to { display: block; } }',
            '@keyframes t-neo-gone { 50% { display: none !important; } }',
            '@keyframes t-neo-gone { 50% { content-visibility: hidden; } }',
            '@keyframes t-neo-gone { 50% { content-visibility: auto; } }',
            '@media (min-width: 680px) { @keyframes t-neo-gone { 50% { display: none; } } }',
            // PT (D-2026-10-20-13 (3)): visibility, the critic's plant, and every form of it the display refusal reads.
            '@keyframes t-neo-gone { from { visibility: visible; } to { visibility: hidden; } }\n.t-neo .item-a { animation: t-neo-gone 1s 120s forwards; }',
            '@keyframes t-neo-gone { to { visibility: hidden; } }',
            '@keyframes t-neo-gone { to { visibility: collapse; } }',
            '@keyframes t-neo-gone { to { VISIBILITY: hidden; } }',
            '@keyframes t-neo-gone { to { visibility: hidden !important; } }',
            '@keyframes t-neo-gone { to { visibility: var(--v); } }',
            '@keyframes t-neo-gone { 0%, 49% { visibility: visible; } 50%, 100% { visibility: hidden; } }',
            '@media (min-width: 680px) { @keyframes t-neo-gone { to { visibility: hidden; } } }',
            '@media (max-width: 679.98px) { @keyframes t-neo-gone { to { visibility: hidden; } } }',
        ]) {
            const problems = lintLookSheet(plantedNeo(rule), { lookClass: 't-neo' });
            assert.ok(problems.some((p) => GONE.test(p)), `${rule}:\n  ${problems.join('\n  ') || '(no problem)'}`);
        }
        // Through a custom property: the property is refused in a keyframe whatever reads it.
        const viaProperty = lintLookSheet(plantedNeo('@keyframes t-neo-gone { to { --v: hidden; } }\n.t-neo .item-a { visibility: var(--v); animation: t-neo-gone 1s 120s forwards; }'), { lookClass: 't-neo' });
        assert.ok(viaProperty.some((p) => /a custom property in a keyframe/.test(p)), viaProperty.join('\n'));
    });

    it('refuses all in a keyframe, whatever its value (the fourth review): all: unset and all: inherit stand at rest and not in a stop', () => {
        for (const value of ['unset', 'inherit', 'initial', 'revert', 'revert-layer']) {
            const problems = lintLookSheet(plantedNeo(`@keyframes t-neo-z { to { all: ${value}; } }`), { lookClass: 't-neo' });
            assert.ok(problems.some((p) => ALL_STOP.test(p)), `${value}:\n  ${problems.join('\n  ') || '(no problem)'}`);
        }
        const kit = lintSheet(plantedKit('@keyframes wk-z { to { all: unset; } }'));
        assert.ok(!kit.some((p) => ALL_STOP.test(p)), kit.join('\n'));
    });

    it('leaves display and visibility at rest and in a state-free rule alone, and other keyframes', () => {
        accepts('.t-neo .item-a { display: grid; }');
        accepts('.t-neo .tool { display: none; }');
        accepts('.t-neo .tool { visibility: hidden; }');
        accepts('.t-neo .item-a { visibility: visible; }');
        accepts('@keyframes t-neo-glow { from { opacity: 0.5; } to { opacity: 1; } }');
        accepts('@keyframes t-neo-lift { from { transform: translateY(0); } to { transform: translateY(-2px); } }');
    });

    it('leaves the kit lint as it was, and no first-party sheet a run serves does it', () => {
        for (const stop of ['0%, 100% { display: none; }', 'to { visibility: hidden; }']) {
            const kit = lintSheet(plantedKit(`@keyframes wk-gone { ${stop} }`));
            assert.ok(!kit.some((p) => GONE.test(p)), kit.join('\n'));
        }
        for (const sheet of lookRows(SERVED).filter((row) => row.role !== 'kit')) {
            const options = sheet.role === 'private' ? { lookClass: sheet.lookClass, load: 'worn', ownArt: sheet.ownArt } : { lookClass: sheet.lookClass, load: sheet.load, ownArt: sheet.load === 'worn' ? ownArtOf(sheet) : undefined };
            assert.ok(!lintLookSheet(sheet.css, options).some((p) => GONE.test(p)), sheet.path);
        }
    });
});

describe('a-keyframe-never-sets-an-inherited-ink', () => {
    /**
     * Before 8g2 (the critic's third review, item 1, the belt beside PT2;
     * D-2026-10-26-03): a first-party look's keyframes may not set an
     * inherited longhand that paints text — the ink, a text shadow, the
     * caret, the emphasis marks and their prefixed twins, the paint order, a
     * colour font's palette (`KEYFRAME_INK` in `scripts/workshop-css.mjs`).
     * A keyframe that sets one on a box changes how the text of every box
     * below it is painted, a money figure's among them, for part of a cycle:
     * PT2's shape with a real property, `color: transparent` from 25% to 68%
     * of a loop on a quote's `.item-a`, was accepted until this belt (the
     * plant `g1:130`, `color: red`, with it), since the custom-property
     * refusal reads only `--` names. The probe reads the held dress at every
     * keyframe offset (`offsetDressFaults`, `layout/probe.ts`); this refuses
     * the road where it is written. The text's fill colour and stroke
     * (`-webkit-text-fill-color`, `-webkit-text-stroke*`) are refused
     * everywhere already, SVG `fill` and `stroke` off a drawn icon and in a
     * keyframe (`svg-paint-stands-only-on-a-drawn-icon`), and the tap
     * highlight is `transparent` everywhere. The kit is unchanged.
     */
    const INK = /in a keyframe is inherited: it changes how the text of every box below the one that runs it is painted, a money figure's among them, for part of a cycle/;

    it('refuses every inherited ink, shadow and mark in a keyframe, on PT2\'s shape and in every position the keyframe refusals read', () => {
        for (const rule of [
            '@keyframes t-neo-ink { 25%, 68% { color: transparent; } }\n.t-neo .item-head-q .item-a { animation: t-neo-ink 100s linear infinite; }',
            '@keyframes t-neo-ink { to { color: transparent; } }',
            '@keyframes t-neo-ink { from { color: #fff; } to { color: #000; } }',
            '@keyframes t-neo-ink { 50% { COLOR: rgba(0, 0, 0, 0.05); } }',
            '@keyframes t-neo-ink { 50% { color: var(--s-bg); } }',
            '@keyframes t-neo-ink { 50% { color: currentColor; } }',
            '@keyframes t-neo-ink { 50% { color: transparent !important; } }',
            '@keyframes t-neo-ink { 50% { text-shadow: 0 0 0 #000; } }',
            '@keyframes t-neo-ink { 50% { caret-color: transparent; } }',
            '@keyframes t-neo-ink { 50% { text-emphasis: none; } }',
            '@keyframes t-neo-ink { 50% { text-emphasis-color: #000; } }',
            '@keyframes t-neo-ink { 50% { text-emphasis-style: none; } }',
            '@keyframes t-neo-ink { 50% { text-emphasis-position: under right; } }',
            '@keyframes t-neo-ink { 50% { -webkit-text-emphasis-color: #000; text-emphasis-color: #000; } }',
            '@keyframes t-neo-ink { 50% { paint-order: stroke; } }',
            '@keyframes t-neo-ink { 50% { font-palette: dark; } }',
            // A pseudo-element runs it: the keyframe is refused wherever a rule runs it.
            "@keyframes t-neo-ink { to { color: red; } }\n.t-neo .item-p::after { content: ''; animation: t-neo-ink 1s; }",
            // Inside a media block (refused there on its own too) and beside a longhand a keyframe may set.
            '@media (min-width: 680px) { @keyframes t-neo-ink { to { color: transparent; } } }',
            '@keyframes t-neo-ink { 0% { opacity: 1; } 50% { color: transparent; opacity: 1; } 100% { opacity: 1; } }',
        ]) {
            const problems = lintLookSheet(plantedNeo(rule), { lookClass: 't-neo' });
            assert.ok(problems.some((p) => INK.test(p)), `${rule}:\n  ${problems.join('\n  ') || '(no problem)'}`);
        }
        // The text's fill colour and stroke (`-webkit-text-fill-color`, `-webkit-text-stroke*`) stay refused everywhere, by their own rule.
        for (const stop of ['-webkit-text-fill-color: transparent', '-webkit-text-stroke-color: #000', '-webkit-text-stroke-width: 1px']) {
            const problems = lintLookSheet(plantedNeo(`@keyframes t-neo-ink { 50% { ${stop}; } }`), { lookClass: 't-neo' });
            assert.ok(problems.some((p) => /contrast pass never reads/.test(p)) && !problems.some((p) => INK.test(p)), `${stop}:\n  ${problems.join('\n  ')}`);
        }
    });

    it('leaves an ink at rest, a keyframe that sets none, and the kit as they were', () => {
        accepts('.t-neo .item-x { color: #fff; }');
        accepts('@keyframes t-neo-ink { from { opacity: 0.5; } to { opacity: 1; } }');
        accepts('@keyframes t-neo-ink { to { background-position: 100% 0; } }');
        // A ground and not an ink: refused by the ground belt, never as an ink (`a-keyframe-never-sets-a-ground-or-a-shadow`).
        const ground = lintLookSheet(plantedNeo('@keyframes t-neo-ink { to { background-color: red; } }\n.t-neo .item-a { animation: t-neo-ink 1s; }'), { lookClass: 't-neo' });
        assert.ok(!ground.some((p) => INK.test(p)) && ground.some((p) => /a ground or a shadow in a keyframe/.test(p)), ground.join('\n'));
        for (const stop of ['25%, 68% { color: transparent; }', '50% { text-shadow: 0 0 0 #000; }', '50% { caret-color: transparent; }']) {
            const kit = lintSheet(plantedKit(`@keyframes wk-ink { ${stop} }`));
            assert.ok(!kit.some((p) => INK.test(p)), kit.join('\n'));
        }
    });

    it('costs nothing: no first-party sheet a run serves, no starter and the canary sets one in a keyframe', () => {
        const sheets = lookRows(SERVED)
            .filter((row) => row.role !== 'kit')
            .map((row) => ({
                name: `${row.role}: ${row.path}`,
                css: row.css,
                options: row.role === 'private' ? { lookClass: row.lookClass, load: 'worn', ownArt: row.ownArt } : { lookClass: row.lookClass, load: row.load, ownArt: row.load === 'worn' ? ownArtOf(row) : undefined },
            }));
        const roles = new Set(lookRows(SERVED).filter((row) => row.role !== 'kit').map((row) => row.role));
        for (const role of ['look', 'fixture', 'private']) assert.ok(roles.has(role), `a ${role} sheet is read`);
        for (const cls of ['t-modern', 't-neo', 't-rural']) {
            sheets.push({ name: `starter: ${cls}`, css: rescopeSheet(read(LOOKS.find((sheet) => sheet.lookClass === cls).path), cls.slice(2), carried), options: { lookClass: 't-workshop' } });
        }
        sheets.push({ name: 'canary', css: canaryFiles()['canary/sheet.css'], options: { lookClass: 't-canary' } });
        let stops = 0;
        for (const { name, css, options } of sheets) {
            stops += everyRule(css).filter((rule) => rule.selectors === undefined).length;
            assert.deepEqual(lintLookSheet(css, options).filter((p) => INK.test(p)), [], name);
        }
        // The shipped looks' keyframes and the starters' renamed copies, read stop by stop.
        assert.ok(stops >= 30, `${stops} keyframe stops read`);
    });
});

describe('a-keyframe-never-sets-a-ground-or-a-shadow', () => {
    /**
     * Before 8g2 (the fourth review's item 2, the critic's PG;
     * D-2026-10-26-04 (a)): a first-party look's keyframes may not set a
     * background's colour or image, the `background` shorthand, or a box
     * shadow with its prefixed twin (`KEYFRAME_GROUND` in
     * `scripts/workshop-css.mjs`). PG, `background-color: var(--s-text)` from
     * 25% to 68% of a loop on Rural's quote `.item-a`, set the figure on its
     * own ink for most of the cycle and passed the whole runner and both
     * lints: the probe read the ground at rest and at the frozen instant
     * alone. The probe reads it at every keyframe offset now
     * (`offsetGroundFaults`, `layout/probe.ts`), the kit's road; this refuses
     * the road where it is written. A background that moves stays accepted;
     * the kit is unchanged.
     */
    const GROUND = /a ground or a shadow in a keyframe lays a ground under every box inside the one that runs it, a money figure's among them, for part of a cycle/;

    it('refuses a background\'s colour or image, the shorthand and a box shadow in a keyframe, on PG\'s shape and in every position the keyframe refusals read', () => {
        for (const rule of [
            '@keyframes t-neo-ground { 0% { background-color: transparent; } 25%, 68% { background-color: var(--s-text); } 80%, 100% { background-color: transparent; } }\n.t-neo .item-head-q .item-a { animation: t-neo-ground 100s linear infinite; }',
            '@keyframes t-neo-ground { to { background-color: red; } }',
            '@keyframes t-neo-ground { 50% { BACKGROUND-COLOR: #000; } }',
            '@keyframes t-neo-ground { 50% { background-color: currentColor; } }',
            '@keyframes t-neo-ground { 50% { background: #000; } }',
            '@keyframes t-neo-ground { 50% { background: linear-gradient(#000, #000); } }',
            '@keyframes t-neo-ground { 50% { background-image: linear-gradient(var(--s-text), var(--s-text)); } }',
            '@keyframes t-neo-ground { 50% { background-image: none; } }',
            '@keyframes t-neo-ground { 50% { box-shadow: inset 0 0 0 100px var(--s-text); } }',
            '@keyframes t-neo-ground { 50% { box-shadow: 0 0 0 4px #000; } }',
            '@keyframes t-neo-ground { 50% { -webkit-box-shadow: inset 0 0 0 100px #000; box-shadow: inset 0 0 0 100px #000; } }',
            // A pseudo-element runs it: the keyframe is refused wherever a rule runs it.
            "@keyframes t-neo-ground { to { background-color: red; } }\n.t-neo .item-p::after { content: ''; animation: t-neo-ground 1s; }",
            // Inside a media block (refused there on its own too) and beside a longhand a keyframe may set.
            '@media (min-width: 680px) { @keyframes t-neo-ground { to { background-color: #000; } } }',
            '@keyframes t-neo-ground { 0% { opacity: 1; } 50% { background-color: #000; opacity: 1; } 100% { opacity: 1; } }',
        ]) {
            const problems = lintLookSheet(plantedNeo(rule), { lookClass: 't-neo' });
            assert.ok(problems.some((p) => GROUND.test(p)), `${rule}:\n  ${problems.join('\n  ') || '(no problem)'}`);
        }
    });

    it('leaves a ground at rest, a background that moves and the kit as they were', () => {
        accepts('.t-neo .item-a { background-color: var(--s-surface); }');
        accepts('@keyframes t-neo-ground { to { background-position: 100% 0; } }');
        accepts('@keyframes t-neo-ground { from { background-size: 100% 100%; } to { background-size: 220% 100%; } }');
        accepts('@keyframes t-neo-ground { from { opacity: 0.5; } to { opacity: 1; } }');
        for (const stop of ['25%, 68% { background-color: #000; }', '50% { background: #000; }', '50% { box-shadow: inset 0 0 0 100px #000; }']) {
            const kit = lintSheet(plantedKit(`@keyframes wk-ground { ${stop} }`));
            assert.ok(!kit.some((p) => GROUND.test(p)), kit.join('\n'));
        }
    });

    it('costs nothing: no first-party sheet a run serves, no starter and the canary sets one in a keyframe', () => {
        const sheets = lookRows(SERVED)
            .filter((row) => row.role !== 'kit')
            .map((row) => ({
                name: `${row.role}: ${row.path}`,
                css: row.css,
                options: row.role === 'private' ? { lookClass: row.lookClass, load: 'worn', ownArt: row.ownArt } : { lookClass: row.lookClass, load: row.load, ownArt: row.load === 'worn' ? ownArtOf(row) : undefined },
            }));
        const roles = new Set(lookRows(SERVED).filter((row) => row.role !== 'kit').map((row) => row.role));
        for (const role of ['look', 'fixture', 'private']) assert.ok(roles.has(role), `a ${role} sheet is read`);
        for (const cls of ['t-modern', 't-neo', 't-rural']) {
            sheets.push({ name: `starter: ${cls}`, css: rescopeSheet(read(LOOKS.find((sheet) => sheet.lookClass === cls).path), cls.slice(2), carried), options: { lookClass: 't-workshop' } });
        }
        sheets.push({ name: 'canary', css: canaryFiles()['canary/sheet.css'], options: { lookClass: 't-canary' } });
        let stops = 0;
        for (const { name, css, options } of sheets) {
            stops += everyRule(css).filter((rule) => rule.selectors === undefined).length;
            assert.deepEqual(lintLookSheet(css, options).filter((p) => GROUND.test(p)), [], name);
        }
        // The shipped looks' keyframes and the starters' renamed copies, read stop by stop.
        assert.ok(stops >= 30, `${stops} keyframe stops read`);
    });
});

describe('svg-paint-stands-only-on-a-drawn-icon', () => {
    /**
     * Before 8g2 (the fourth review's item 4, the critic's PFQ;
     * D-2026-10-26-04 (b)): `qrSvg` colours a code by presentation
     * attributes, which an author rule beats, so `.t-modern .qr path { fill:
     * #fff }` blanked every code on the look and passed the whole runner and
     * both lints. A first-party look sheet sets `fill`, `stroke` and every
     * `fill-*` and `stroke-*` longhand only on a rule whose every selector's
     * subject is a drawn icon — the `.ic` svg, or a shape under it by a
     * descendant or child combinator (`isIconRule` in
     * `scripts/workshop-css.mjs`), the shape the shipped looks write. The probe
     * holds every code to black on white (`a-code-is-drawn-black-on-white`),
     * the kit's road. The kit is unchanged.
     */
    const SVG = /SVG paint stands only on a drawn icon/;

    it('refuses SVG paint on a code, on any rule that is not a drawn icon\'s, and in a keyframe', () => {
        for (const rule of [
            '.t-neo .qr path { fill: #fff; }',
            '.t-neo .qr rect { fill: #000; }',
            '.t-neo .qr { fill: #fff; }',
            '.t-neo .qr path { fill-opacity: 0; }',
            '.t-neo .qr path { FILL: #fff; }',
            '.t-neo .qr path { stroke: #fff; stroke-width: 3; }',
            '.t-neo .qr path { stroke-dasharray: 1; }',
            '.t-neo .qr path { fill-rule: evenodd; }',
            '.t-neo .ic, .t-neo .qr path { fill: #fff; }',
            '.t-neo :is(.ic, .qr) path { fill: #fff; }',
            '.t-neo .ic + path { stroke: #fff; }',
            '.t-neo .ic ~ path { stroke: #fff; }',
            '.t-neo .ic:hover { stroke-width: 2; }',
            '.t-neo .ic[hidden] { stroke-width: 2; }',
            '.t-neo .item-caret { stroke-width: 2; }',
            ".t-neo .item-p::after { content: ''; fill: #fff; }",
            '@keyframes t-neo-fill { to { fill: #fff; } }',
            '@media (min-width: 680px) { .t-neo .qr path { fill: #fff; } }',
        ]) {
            const problems = lintLookSheet(plantedNeo(rule), { lookClass: 't-neo' });
            assert.ok(problems.some((p) => SVG.test(p)), `${rule}:\n  ${problems.join('\n  ') || '(no problem)'}`);
        }
    });

    it('takes the shape the shipped looks write, and a drawn icon\'s own shapes under it', () => {
        for (const rule of [
            '.t-neo .ic { stroke-width: 2; stroke-linecap: square; }',
            '.t-neo .pay-pointer .ic { stroke-width: 2; }',
            '.t-neo .ic path { stroke-linejoin: round; }',
            '.t-neo .ic > path { stroke-width: 1.5; }',
            '.t-neo svg.ic { fill: none; }',
            '.t-neo .item-caret.ic { stroke-width: 1.5; }',
            '.t-neo .ic.item-caret, .t-neo .fold-caret .ic { stroke-width: 1.5; }',
            '@media (min-width: 680px) { .t-neo .ic { stroke-width: 2; } }',
        ]) {
            accepts(rule);
        }
    });

    it('is first party only, and costs nothing: every first-party sheet a run serves, every starter and the canary set SVG paint on .ic alone', () => {
        for (const rule of ['.t-neo .qr path { fill: #fff; }', '@keyframes wk-fill { to { fill: #fff; } }']) {
            const kit = lintSheet(plantedKit(rule));
            assert.ok(!kit.some((p) => SVG.test(p)), `kit, ${rule}:\n  ${kit.join('\n  ')}`);
        }
        const sheets = lookRows(SERVED)
            .filter((row) => row.role !== 'kit')
            .map((row) => ({
                name: `${row.role}: ${row.path}`,
                css: row.css,
                options: row.role === 'private' ? { lookClass: row.lookClass, load: 'worn', ownArt: row.ownArt } : { lookClass: row.lookClass, load: row.load, ownArt: row.load === 'worn' ? ownArtOf(row) : undefined },
            }));
        for (const cls of ['t-modern', 't-neo', 't-rural']) {
            sheets.push({ name: `starter: ${cls}`, css: rescopeSheet(read(LOOKS.find((sheet) => sheet.lookClass === cls).path), cls.slice(2), carried), options: { lookClass: 't-workshop' } });
        }
        sheets.push({ name: 'canary', css: canaryFiles()['canary/sheet.css'], options: { lookClass: 't-canary' } });
        let painted = 0;
        for (const { name, css, options } of sheets) {
            painted += everyRule(css).filter((rule) => rule.decls.some((decl) => /^(?:fill|stroke)(?:-|$)/.test(decl.prop))).length;
            assert.deepEqual(lintLookSheet(css, options).filter((p) => SVG.test(p)), [], name);
        }
        // The shipped looks' `.ic` rules and the starters' copies of them, read.
        assert.ok(painted >= 6, `${painted} rules setting SVG paint read`);
    });
});

describe('a-pseudo-element-paints-its-own-ground-and-ink', () => {
    /**
     * D-2026-10-20-08's B3 (the lint-belts critic's third review): the probe
     * measures a pseudo-element by its paint at rest. One a rule at rest
     * moved over a figure, whose paint is its host's (a ground through
     * `inherit`, an edge, a shadow or an underline through `currentColor`,
     * which is also what a shadow, a border or an outline that names no
     * colour is drawn in), is clear while its host is, and covers the figure
     * the moment a state gives the host a ground or an ink: the host is an
     * element, and an element may change both under a state. So a
     * first-party rule whose selector list holds a pseudo-element takes no
     * paint from its host. Red: `pseudoHostPaintProblems` out of `lintLook`
     * (every refusal below fails, and the shipped sheets pass).
     */
    const HOST = /takes its paint from its host, which is an element and may change its ground or its ink under a state/;
    const NO_COLOUR = /names no colour, and is drawn in currentColor, the ink of its host, which a state may change/;
    const HOST_INK = /is its host's ink, which a state may change: a glyph or an underline in it is clear while the host's ink is clear/;
    const PRINTS = /prints text and states no colour of its own in this rule \(a literal colour or a palette role\)/;
    const ON_A_PSEUDO_ELEMENT = /color is not a property a state rule may set on a pseudo-element/;
    const OVER = ".t-neo .item-b::after { content: ''; position: relative; left: 160px; top: -24px; width: 120px; height: 40px; ";
    const refusedWith = (rule, pattern) => {
        const problems = lintLookSheet(plantedNeo(rule), { lookClass: 't-neo' });
        assert.ok(problems.some((p) => pattern.test(p)), `${rule}:\n  ${problems.join('\n  ') || '(no problem)'}`);
    };

    it('refuses inherit and currentColor in any paint of a pseudo-element at rest: ground, border, outline, shadow, underline, filter', () => {
        for (const decl of [
            'background: inherit',
            'background-color: inherit',
            'background-image: inherit',
            'background: currentColor',
            'background-color: CURRENTCOLOR',
            'background: linear-gradient(currentColor, red)',
            'box-shadow: inset 0 0 0 60px currentColor',
            'box-shadow: 0 0 4px currentcolor',
            'box-shadow: inherit',
            'text-shadow: 0 0 2px currentColor',
            'border: 1px solid currentColor',
            'border-color: inherit',
            'border-top-color: currentColor',
            'border-image-source: inherit',
            'outline: 2px solid currentcolor',
            'outline-color: inherit',
            'text-decoration: underline currentColor',
            'text-decoration-color: currentColor',
            'column-rule: 1px solid currentColor',
            'filter: drop-shadow(0 0 2px currentColor)',
        ]) {
            for (const selector of ['.t-neo .item-b::after', '.t-neo .item-b::before', '.t-neo .item-b:after', '.t-neo .item-b::after, .t-neo .item-c']) {
                refusedWith(`${selector} { ${decl}; }`, HOST);
            }
        }
        // initial and unset are currentColor on an edge.
        for (const decl of ['border-color: initial', 'border-left-color: unset', 'outline-color: initial', 'text-decoration-color: unset', 'column-rule-color: unset']) {
            refusedWith(`.t-neo .item-b::after { ${decl}; }`, /is currentcolor on an edge, and it takes its paint from its host/);
        }
    });

    it('refuses a shadow, a border, an outline, an underline and a drop shadow that names no colour', () => {
        for (const decl of [
            'box-shadow: 0 0 4px',
            'box-shadow: inset 0 0 0 60px',
            'box-shadow: 0 0 4px red, 0 0 4px',
            'text-shadow: 0 0 2px',
            'filter: drop-shadow(0 0 4px)',
            'filter: blur(2px) drop-shadow(1px 1px)',
        ]) {
            refusedWith(`.t-neo .item-b::after { ${decl}; }`, NO_COLOUR);
        }
        for (const rule of [
            '.t-neo .item-b::after { border: 1px solid; }',
            '.t-neo .item-b::after { border-top: 2px dashed; }',
            '.t-neo .item-b::after { border-style: solid; border-width: 2px; }',
            '.t-neo .item-b::after { outline: 2px solid; }',
            '.t-neo .item-b::after { outline-style: solid; outline-width: 2px; }',
            '.t-neo .item-b::after { text-decoration: underline; }',
            '.t-neo .item-b::after { text-decoration-line: underline; }',
            '.t-neo .item-b::after { column-rule: 1px solid; }',
        ]) {
            refusedWith(rule, /draws an edge or a line that names no colour/);
        }
    });

    it('refuses the host\'s ink as the pseudo-element\'s own, and a glyph that states none', () => {
        for (const value of ['inherit', 'unset', 'currentColor', 'CURRENTCOLOR']) refusedWith(`.t-neo .item-b::after { color: ${value}; }`, HOST_INK);
        // Printed text takes its host's ink unless the rule states a literal colour or a palette role of its own.
        refusedWith(".t-neo .wearing-x::before { content: '// '; }", PRINTS);
        refusedWith(".t-neo .wearing-x::before { content: '\\25c6'; font-size: 200px; }", PRINTS);
        refusedWith(".t-neo .wearing-x::before { content: '// '; color: color-mix(in srgb, red, blue); }", PRINTS);
        refusedWith(".t-neo .wearing-x::before { content: '// '; color: var(--s-addr-bg); }", PRINTS);
        refusedWith(".t-neo .wearing-x::before { content: '// '; color: inherit; }", HOST_INK);
        // The critic's B3 plants (n7): the pseudo-element over the figure, painted from its host.
        refusedWith(`${OVER}background: inherit; }\n.t-neo .item:hover .item-b { background: #000; }`, HOST);
        refusedWith(`.t-neo .item-b { color: transparent; }\n.t-neo .item-n { color: #fff; }\n${OVER}background: currentColor; }\n.t-neo .item:hover .item-b { color: #000; }`, HOST);
        refusedWith(`${OVER}box-shadow: inset 0 0 0 60px currentColor; }\n.t-neo .item-b { color: transparent; }\n.t-neo .item:hover .item-b { color: #000; }`, HOST);
        // And a glyph's colour under a state is refused on the pseudo-element list itself: the other half of the same road.
        refusedWith(`${OVER}background: #000; }\n.t-neo .item:hover .item-b::after { color: #000; }`, ON_A_PSEUDO_ELEMENT);
    });

    /*
     * The lint-belts critic's fourth review, B1: "a pseudo-element's paint is
     * its own" was false by five roads — one edge colour cleared every edge
     * (one flag for four families and four sides), `revert` and `revert-layer`
     * on an edge colour, `all: inherit`, a mask in `currentColor`, and a
     * custom property the host set to `currentColor`. Each is a plant below
     * (`m2`, `m3` and `m9` pin the critic's own, `b1` the builder's). Red:
     * `pseudoHostPaintProblems` as the third review left it (the flag, no
     * `revert`, no `all`, no mask, no `var()` rule) fails every test below.
     */
    const VAR = /reads a custom property that is not a palette role/;
    const ALL = /all re-states every property from the host's or the initial value/;
    const LOGICAL = /names a side by the writing mode/;

    it('reads a colour for each side of a border and for each family: one coloured edge does not clear the others (B1 a)', () => {
        const SIDE = /draws an edge or a line that names no colour, and is drawn in currentColor, the ink of its host, which a state may change \(the (\w+) side of its border: each side names its own colour\)/;
        for (const [decls, side] of [
            ['border: 40px solid; border-top-color: red', 'right'],
            ['border: 40px solid; border-left-color: red; border-bottom-color: red', 'top'],
            ['border-left: 40px solid red; border-right: 40px solid', 'right'],
            ['border: 40px solid red; border-top: 40px solid', 'top'],
            ['border: 40px solid red; border-right-color: initial', 'right'],
            ['border-width: 40px; border-style: solid', 'top'],
            ['border-top-style: solid; border-right-color: red', 'top'],
            ['border-style: none solid; border-width: 40px; border-color: red', undefined],
        ]) {
            const problems = lintLookSheet(plantedNeo(`.t-neo .item-b::after { content: ''; ${decls}; }`), { lookClass: 't-neo' });
            if (side === undefined) {
                assert.deepEqual(problems, [], decls);
                continue;
            }
            const found = problems.map((p) => SIDE.exec(p)).find(Boolean);
            assert.ok(found, `${decls}:\n  ${problems.join('\n  ') || '(no problem)'}`);
            assert.equal(found[1], side, decls);
        }
        // The other families: a coloured edge of another family clears none of these.
        for (const [decls, family] of [
            ['border: 40px solid; outline-color: red', 'top side of its border'],
            ['border: 40px solid; text-decoration-color: red', 'top side of its border'],
            ['border: 40px solid; column-rule-color: red', 'top side of its border'],
            ['outline: 40px solid; border-left-color: red', 'its outline'],
            ['outline-style: solid; outline-width: 4px; text-decoration-color: red', 'its outline'],
            ['column-rule-style: solid; column-rule-width: 40px; outline-color: red', 'its column-rule'],
            ['text-decoration: underline 40px; border-color: red', 'its text-decoration'],
            ['text-decoration-line: underline; outline-color: red', 'its text-decoration'],
            ['box-shadow: 0 0 4px red, 0 0 40px', 'a layer'],
            ['text-shadow: 0 0 4px red, 0 0 2px', 'a layer'],
            ['filter: drop-shadow(0 0 2px red) drop-shadow(0 0 40px)', 'a drop-shadow()'],
        ]) {
            const problems = lintLookSheet(plantedNeo(`.t-neo .item-b::after { content: ''; ${decls}; }`), { lookClass: 't-neo' });
            assert.ok(problems.some((p) => NO_COLOUR.test(p) && p.includes(family)), `${decls}:\n  ${problems.join('\n  ') || '(no problem)'}`);
        }
        // What names its colour on every side it draws, in the order it writes, stands.
        for (const decls of [
            'border: 40px solid red; border-top-style: none; border-bottom-width: 0',
            'border: 40px solid transparent; border-color: red transparent',
            'border: 40px solid var(--s-accent)',
            'border-top: 2px solid red; border-right: 2px solid blue; border-bottom: 2px solid red; border-left: 2px solid blue',
            'border-width: 2px; border-style: solid; border-color: red blue',
            'border-color: red; border: 0 solid',
            'border: none',
            'outline: 2px solid red; column-rule: 2px solid blue; text-decoration: underline red',
            'text-decoration-line: underline; text-decoration-color: red',
            'outline: 0 dashed; column-rule: 0 solid',
        ]) {
            accepts(`.t-neo .item-b::after { content: ''; ${decls}; }`);
        }
    });

    it('refuses revert and revert-layer in any paint of a pseudo-element, and all in any value (B1 b and c)', () => {
        for (const decl of [
            'border-color: revert',
            'border-bottom-color: revert-layer',
            'border-top-color: REVERT',
            'outline-color: revert',
            'text-decoration-color: revert-layer',
            'column-rule-color: revert',
            'box-shadow: 0 0 0 40px revert',
            'text-shadow: 0 0 2px revert',
            'background: revert',
            'background-color: revert-layer',
            'background-image: revert',
            'border: 40px solid revert',
            'outline: 2px solid revert-layer',
            'border-image-source: revert',
            'filter: drop-shadow(0 0 2px revert)',
            'mask-image: revert',
            '-webkit-mask: revert-layer',
        ]) {
            refusedWith(`.t-neo .item-b::after { content: ''; ${decl}; }`, HOST);
        }
        // The critic's roads: the pseudo-element's own rule is clean, a later rule rolls its colour back.
        refusedWith(".t-neo .item-b::after { content: ''; border: solid 40px red; }\n.t-neo .item-b::after { border-bottom-color: revert; }", HOST);
        refusedWith(".t-neo .item-b::after { content: ''; border: solid 40px #000; }\n.t-neo .stall .item-b::after { border-color: revert-layer; }", HOST);
        for (const value of ['revert', 'revert-layer']) refusedWith(`.t-neo .item-b::after { content: '◆'; color: ${value}; }`, HOST_INK);
        for (const value of ['unset', 'inherit', 'initial', 'revert', 'revert-layer', 'currentColor']) {
            refusedWith(`.t-neo .item-b::after { all: ${value}; content: ''; }`, ALL);
            refusedWith(`.t-neo .stall .item-b::after { all: ${value}; }`, ALL);
        }
        refusedWith(".t-neo .item-b::after { content: ''; position: relative; left: -80px; border: 40px solid red; ALL: unset; }", ALL);
        // On an element `all` stays what it was: inherit and unset only, so this is the pseudo-element's refusal.
        accepts('.t-neo .item-b { all: inherit; }');
    });

    it('reads a mask: no currentColor or inherit inside its image, prefixed or not (B1 d)', () => {
        for (const decl of [
            'mask-image: linear-gradient(currentColor, currentColor)',
            '-webkit-mask-image: linear-gradient(currentColor, currentColor)',
            'mask: linear-gradient(currentcolor, currentcolor)',
            '-webkit-mask: linear-gradient(CURRENTCOLOR, red) center / 60% 40% no-repeat',
            'mask: url(art/x.svg) center / 100% 100% no-repeat, linear-gradient(currentColor, currentColor) center / 60% 40% no-repeat',
            'mask-image: inherit',
            'mask-border-source: linear-gradient(currentColor, red)',
            '-webkit-mask-box-image-source: linear-gradient(currentColor, currentColor)',
            'mask-image: radial-gradient(color-mix(in srgb, currentColor 50%, red), red)',
        ]) {
            refusedWith(`.t-neo .item-b::after { content: ''; background: #000; ${decl}; }`, HOST);
        }
        for (const decl of ['mask-image: var(--m)', 'mask: var(--m) center / 100% 100% no-repeat', '-webkit-mask-image: var(--m)']) {
            refusedWith(`.t-neo .item-b::after { content: ''; background: #000; ${decl}; }`, VAR);
        }
        // A mask in colours of its own, or from a file, stands, as the tracked fixture's and the canary's do.
        for (const decl of [
            'mask-image: linear-gradient(#000, #000)',
            'mask: url(./art/under-name.svg) center / 100% 100% no-repeat, linear-gradient(#000, #000) center / 60% 40% no-repeat',
            'mask-composite: add',
            'mask-image: linear-gradient(var(--s-text), transparent)',
        ]) {
            const problems = lintLookSheet(plantedNeo(`.t-neo .item-b::after { content: ''; background: #000; ${decl}; }`), { lookClass: 't-neo' });
            assert.ok(!problems.some((p) => HOST.test(p) || VAR.test(p)), `${decl}:\n  ${problems.join('\n  ')}`);
        }
    });

    /*
     * The window's selected check after the fourth fix round: judgement 14
     * refused any non-role `var()` anywhere in a pseudo-element's mask, and
     * the private look at 0x04, read under its selection, was refused on
     * `var()` calls that stand as lengths. B1 (d) and (e) are about a mask
     * *colour* that follows the host's ink, and a length carries none. Red:
     * the old rule back (`maskColourVar` as `nonRoleVar`): the first case
     * below fails, and with it the nine accepted plants `c1:0`–`c1:8`.
     */
    it('reads a var() in a mask only where it stands as a colour or as the picture: a length, a percentage or a calc() in a size, a position or a stop\'s place carries none', () => {
        const masked = (decl) => `.t-neo .item-b::after { content: ''; background: #000; ${decl}; }`;
        // The lengths: the longhands that hold no picture, a stop's place, the shorthand's slash and its positions.
        for (const decl of [
            'mask-size: var(--x) var(--y)',
            'mask-size: var(--x) var(--y), 100% calc(100% / 0.22), var(--x) 2px',
            'mask-position: var(--x) 0',
            'mask-position: calc(100% - var(--r)) 0, var(--x) var(--y)',
            'mask-position-x: var(--x); mask-position-y: calc(100% - var(--y))',
            'mask-repeat: var(--x); mask-composite: var(--x); mask-mode: var(--x); mask-origin: var(--x); mask-clip: var(--x)',
            'mask-border-slice: var(--x); mask-border-width: var(--x); mask-border-outset: var(--x)',
            '-webkit-mask-size: var(--x) var(--y); mask-size: var(--x) var(--y)',
            '-webkit-mask-position: var(--x) 0; mask-position: var(--x) 0',
            'mask-image: linear-gradient(#000 calc(100% - var(--r)), transparent 0)',
            'mask-image: linear-gradient(#000 calc(100% - var(--r) - 4px), transparent calc(100% - var(--r)))',
            'mask-image: linear-gradient(to right, #000 var(--r), transparent)',
            'mask-image: linear-gradient(var(--r) #000, transparent)',
            'mask-image: linear-gradient(#000 var(--a) var(--b), transparent)',
            'mask-image: linear-gradient(#000, 30%, transparent)',
            'mask-image: linear-gradient(to right, var(--s-text) var(--r), transparent)',
            'mask-image: radial-gradient(circle at var(--x) var(--y), #000, transparent)',
            'mask-image: conic-gradient(from var(--a) at 50% 50%, #000, transparent)',
            'mask-image: repeating-linear-gradient(#000 0 var(--r), transparent var(--r) calc(var(--r) * 2))',
            '-webkit-mask-image: linear-gradient(#000 calc(100% - var(--r)), transparent 0); mask-image: linear-gradient(#000 calc(100% - var(--r)), transparent 0)',
            'mask: linear-gradient(#000 var(--r), transparent) calc(100% - var(--r)) 0 / var(--w) var(--h) no-repeat',
            'mask: url(./art/under-name.svg) var(--p) / var(--w) 100% no-repeat, linear-gradient(#000, #000) center / var(--w) 60% no-repeat',
            'mask: linear-gradient(#000, transparent) 0 0 / min(100%, var(--w)) clamp(1px, var(--h), 9px)',
        ]) {
            const problems = lintLookSheet(plantedNeo(masked(decl)), { lookClass: 't-neo' });
            assert.deepEqual(problems, [], decl);
        }
        // A colour, or the picture: a stop's colour, a colour function's argument, a lone var(), a bare var() as the picture.
        for (const decl of [
            'mask-image: linear-gradient(var(--x), transparent)',
            'mask-image: linear-gradient(#000, var(--x) 50%)',
            'mask-image: linear-gradient(#000, 50% var(--x))',
            'mask-image: radial-gradient(var(--x) 10%, #000)',
            'mask-image: linear-gradient(var(--a) var(--b), transparent)',
            'mask-image: linear-gradient(var(--a), #000, transparent)',
            'mask-image: linear-gradient(to right, #000, transparent, var(--x))',
            'mask-image: linear-gradient(to right, var(--x) calc(100% - var(--r)), transparent)',
            'mask-image: linear-gradient(#000, rgb(0 0 0 / var(--a)))',
            'mask-image: linear-gradient(color-mix(in srgb, var(--g) 50%, red), red)',
            'mask-image: linear-gradient(#000 calc(100% - var(--r)), var(--x) calc(100% - var(--r)))',
            'mask-image: conic-gradient(from 0deg, var(--x), #000)',
            'mask-image: var(--m)',
            'mask-image: var(--s-text, red)',
            'mask-image: linear-gradient(#000, #000), var(--m)',
            'mask-border-source: var(--m)',
            '-webkit-mask-image: linear-gradient(var(--x) 50%, #000); mask-image: linear-gradient(var(--x) 50%, #000)',
            'mask: var(--m) center / 100% 100% no-repeat',
            'mask: var(--m)',
            'mask: url(art/x.svg) center / var(--w) 100% no-repeat, linear-gradient(var(--g) 0, #000) center / 60% 40% no-repeat',
            'mask: url(art/x.svg) center / var(--w) 100% no-repeat, var(--m) center / 60% 40% no-repeat',
            'mask: image-set(var(--m) 1x) center / 100% 100% no-repeat',
        ]) {
            refusedWith(masked(decl), VAR);
        }
        // Whatever stands beside a length, currentColor, inherit and revert are refused anywhere in a mask.
        for (const decl of [
            'mask-image: linear-gradient(#000 calc(100% - var(--r)), currentColor)',
            'mask-image: linear-gradient(to right, #000 var(--r), color-mix(in srgb, currentColor 50%, red))',
            'mask-position: inherit',
            'mask-size: revert',
            'mask: linear-gradient(#000, transparent) calc(100% - var(--r)) 0 / var(--w) 100% no-repeat, inherit',
        ]) {
            refusedWith(masked(decl), HOST);
        }
        // A role stands as a colour and a length stands beside it; a sentence names what a mask may hold.
        const sentence = lintLookSheet(plantedNeo(masked('mask-image: linear-gradient(var(--x), transparent)')), { lookClass: 't-neo' }).join('\n');
        assert.match(sentence, /a length, a percentage or a calc\(\) of them, in a size, a position or a stop's place, is none/);
        // On an element, and in the kit, a var() in a mask is nobody's concern here.
        accepts('.t-neo .item-b { mask-image: var(--m); mask-size: var(--x) var(--y); }');
        const kit = lintSheet(plantedKit(masked('mask-image: linear-gradient(var(--x), transparent); mask-size: var(--x) var(--y)')));
        assert.ok(!kit.some((p) => VAR.test(p)), kit.join('\n'));
    });

    it('reads a var() in a pseudo-element\'s paint only as a palette role, so a custom property the host set to currentColor is refused (B1 e)', () => {
        for (const decl of [
            'background: var(--g)',
            'background-color: var(--c)',
            'background-image: var(--s-grain)',
            'background: var(--s-text, red)',
            'border: 40px solid var(--g)',
            'border-color: var(--g)',
            'border-image-source: var(--g)',
            'box-shadow: inset 0 0 0 40px var(--g)',
            'box-shadow: 0 0 0 40px var(--s-addr-bg)',
            'text-shadow: 0 0 2px var(--g)',
            'outline: 2px solid var(--g)',
            'text-decoration: underline var(--g)',
            'column-rule: 2px solid var(--g)',
            'filter: drop-shadow(0 0 4px var(--g))',
            'background: color-mix(in srgb, var(--g) 50%, red)',
        ]) {
            refusedWith(`.t-neo .item-b::after { content: ''; ${decl}; }`, VAR);
        }
        // The critic's three roads: the host sets `--g` to currentColor and inherit, the pseudo-element reads it.
        refusedWith(".t-neo .item-p { --g: currentColor; }\n.t-neo .item-p::after { content: ''; position: relative; left: -80px; background: var(--g); }", VAR);
        refusedWith(".t-neo .item-p { --g: currentColor; }\n.t-neo .item-p::after { content: ''; position: relative; left: -80px; border: 40px solid var(--g); }", VAR);
        refusedWith(".t-neo .item-p { --c: inherit; }\n.t-neo .item-p::after { content: ''; background: var(--c); }", VAR);
        // A palette role standing alone, anywhere in the value, stands.
        for (const role of STATE_OPAQUE_ROLES) {
            accepts(`.t-neo .item-b::after { content: ''; background: var(${role}); border: 2px solid var(${role}); box-shadow: 0 0 4px var(${role}); }`);
        }
        accepts(".t-neo .item-b::after { content: ''; background: color-mix(in srgb, var(--s-accent) 10%, var(--s-bg)); }");
        // The glyph's colour is read the same way: a role stands, any other variable does not state an ink of its own.
        accepts(".t-neo .wearing-x::before { content: '// '; color: var(--s-text); }");
        refusedWith(".t-neo .wearing-x::before { content: '// '; color: var(--g); }", PRINTS);
    });

    it('refuses a logical border property on a pseudo-element: its side is the writing mode\'s, and a write to it may land on any of the four', () => {
        for (const decl of [
            'border-block: 40px solid red',
            'border-inline-start: 40px solid red',
            'border-block-start-style: solid; border-color: red',
            'border-top-style: solid; border-block-color: red',
            'border-inline-end-width: 40px',
            'border-inline: 0',
        ]) {
            refusedWith(`.t-neo .item-b::after { content: ''; ${decl}; }`, LOGICAL);
        }
        // On an element they stand as they did, and a radius is not a border side.
        accepts('.t-neo .item-b { border-block: 1px solid red; }');
        accepts(".t-neo .item-b::after { content: ''; border-start-start-radius: 4px; border-radius: 4px; }");
    });

    it('takes a pseudo-element with its own paint, and an element painted from its host, and shapes inherited', () => {
        for (const rule of [
            ".t-neo .item-b::after { content: ''; background: #000; border: 1px solid red; box-shadow: 0 0 4px red; outline: 2px solid red; }",
            ".t-neo .item-b::after { content: ''; background: var(--s-accent); box-shadow: inset 0 0 0 4px var(--s-text); text-shadow: 0 0 2px #fff; }",
            ".t-neo .item-b::after { content: ''; border: 1px solid rgba(0, 0, 0, 0.4); text-decoration: underline red; filter: drop-shadow(0 0 2px #000); }",
            ".t-neo .item-b::after { content: ''; border-style: solid; border-width: 2px; border-color: red; }",
            ".t-neo .item-b::after { content: ''; border-radius: inherit; background-clip: inherit; }",
            ".t-neo .item-b::after { content: ''; border: 0; box-shadow: none; text-shadow: none; outline: none; text-decoration: none; border-style: none; }",
            ".t-neo .item-b::after { content: ''; border: 2px red; }",
            ".t-neo .item-b::after { content: ''; border: 0 solid; outline: 0 dashed; }",
            ".t-neo .item-b::after { content: none; }",
            ".t-neo .wearing-x::before { content: '// '; color: #3df2ea; }",
            ".t-neo .wearing-x::before { content: '\\25c6'; color: var(--s-accent); }",
            ".t-neo .wearing-x::before { content: '// '; color: rgba(0, 0, 0, 0.5); }",
            ".t-neo .item-b::after { color: #3df2ea; }",
            // An element at rest paints from its host as it always did: this is a rule about pseudo-elements.
            '.t-neo .item-b { background: inherit; box-shadow: 0 0 4px red; border: 1px solid; color: inherit; text-decoration: underline; }',
            // A list that holds no pseudo-element holds no pseudo-element.
            '.t-neo .item-b, .t-neo .item-c { background: inherit; }',
        ]) {
            accepts(rule);
        }
    });

    it('reads the whole rule when a list holds a pseudo-element, and stays at rest: the kit lint is unchanged', () => {
        refusedWith('.t-neo .item-c, .t-neo .item-b::after { background: inherit; }', HOST);
        refusedWith('@media (min-width: 680px) { .t-neo .item-b::after { background: inherit; } }', HOST);
        for (const rule of [
            `${OVER}background: inherit; }`,
            ".t-neo .wearing-x::before { content: '// '; }",
            '.t-neo .item-b::after { box-shadow: 0 0 4px; border: 1px solid; color: inherit; }',
        ]) {
            const kit = lintSheet(plantedKit(rule));
            assert.ok(!kit.some((p) => HOST.test(p) || NO_COLOUR.test(p) || HOST_INK.test(p) || PRINTS.test(p) || /draws an edge or a line that names no colour/.test(p)), `kit, ${rule}:\n  ${kit.join('\n  ')}`);
        }
    });

    it('costs the shipped looks, the starters, the fixtures and the canary nothing: Neo\'s four pseudo rules, the fixture\'s, and no other', () => {
        let pseudoRules = 0;
        let printing = 0;
        const sheets = lookRows(SERVED).filter((row) => row.role !== 'kit').map((row) => ({ name: `${row.role}: ${row.path}`, css: row.css }));
        sheets.push({ name: 'canary', css: canaryFiles()['canary/sheet.css'] });
        for (const { name, css } of sheets) {
            const walk = (nodes) => {
                for (const node of nodes) {
                    if (node.kind === 'rule' && splitTopLevel(node.prelude, ',').some((selector) => /::?(?:before|after)(?![\w-])/i.test(selector))) {
                        pseudoRules += 1;
                        const decls = declarationsOf(node.body);
                        if (decls.some((d) => d.prop === 'content' && /^["'][^"']/.test(d.value))) {
                            printing += 1;
                            assert.ok(decls.some((d) => d.prop === 'color'), `${name}: a pseudo-element that prints text states its colour`);
                        }
                    } else if (node.children !== undefined) walk(node.children);
                }
            };
            walk(parseSheet(css).nodes);
        }
        assert.ok(pseudoRules >= 5, `${pseudoRules} pseudo-element rules read (Neo's four and the fixture's)`);
        assert.ok(printing >= 1, "Neo's wearing line prints '// ' in a colour of its own");
    });
});

/**
 * Every first-party sheet a run serves, the shipped looks and the fixtures and
 * the canary among them, as `{ name, css }` (the kit is the kit's, and linted
 * apart). Built at the module's top for the two tests below that count what
 * the fourth review's rules read.
 */
const FIRST_PARTY_SHEETS = [
    ...lookRows(SERVED)
        .filter((row) => row.role !== 'kit')
        .map((row) => ({ name: `${row.role}: ${row.path}`, css: row.css })),
    { name: 'canary', css: canaryFiles()['canary/sheet.css'] },
];

/** The rules of a sheet, with the media blocks entered and the keyframes' stops read as rules with no selector. */
function everyRule(css) {
    const out = [];
    const walk = (nodes) => {
        for (const node of nodes) {
            if (node.kind === 'rule') out.push({ selectors: splitTopLevel(node.prelude, ','), decls: declarationsOf(node.body) });
            else if (node.name === 'keyframes' && node.body !== undefined) {
                for (const stop of parseSheet(node.body).nodes) if (stop.kind === 'rule') out.push({ selectors: undefined, decls: declarationsOf(stop.body) });
            } else if (node.children !== undefined) walk(node.children);
        }
    };
    walk(parseSheet(css).nodes);
    return out;
}

describe('a-paint-past-its-box-names-its-own-colour', () => {
    /**
     * The lint-belts critic's fourth review, B2: a colour change under a state
     * reveals any paint, written at rest, that reaches past its box — a shadow
     * with a 4000px spread in `currentColor` or in no colour (which is drawn in
     * it), `outline: 4000px solid`, a `border-image` with an outset, a
     * `drop-shadow()` — and none of them needs a move: a box at rest with a
     * clear ink is invisible, and `color` under `:hover` fills the page. So in
     * a first-party sheet, at rest, in a media block and in a keyframe, each
     * outer `box-shadow` layer, every `text-shadow` layer, every
     * `drop-shadow()`, `outline` and `outline-color`, and a `border-image`
     * source names a literal colour or a palette role. An inset layer and the
     * border's own band lie inside their box and are left to the existing
     * rules. Red: `pastTheBoxProblems` out of `lintLook` (every refusal below
     * fails and the sheets pass).
     */
    const REACH = /it reaches past its box, where a state that changes the ink of its box shows it/;
    const refusedReach = (rule, pattern = REACH) => {
        const problems = lintLookSheet(plantedNeo(rule), { lookClass: 't-neo' });
        assert.ok(problems.some((p) => pattern.test(p)), `${rule}:\n  ${problems.join('\n  ') || '(no problem)'}`);
    };

    it('refuses an outer shadow, a text shadow, a drop shadow, an outline and a border image in currentColor, inherit, revert, no colour or a variable that is not a role', () => {
        for (const decl of [
            'box-shadow: 0 0 0 4000px',
            'box-shadow: 0 0 0 4000px currentColor',
            'box-shadow: 0 0 0 4000px CURRENTCOLOR',
            'box-shadow: 0 0 4px red, 0 0 8px',
            'box-shadow: 0 0 4px red, 0 0 8px currentcolor',
            'box-shadow: inset 0 0 4px red, 0 0 40px',
            'box-shadow: 0 0 4px initial',
            'box-shadow: 0 0 4px unset',
            'box-shadow: 0 0 4px revert',
            'box-shadow: 0 0 4px revert-layer',
            'box-shadow: 0 0 4px inherit',
            'box-shadow: 0 0 4px var(--g)',
            'box-shadow: 0 0 4px var(--s-addr-bg)',
            'box-shadow: 0 0 4px var(--s-text, red)',
            'box-shadow: 0 0 4px color-mix(in srgb, currentColor 50%, red)',
            'box-shadow: 0 0 4px Canvas',
            'box-shadow: inherit',
            'box-shadow: revert-layer',
            '-webkit-box-shadow: 0 0 4px; box-shadow: 0 0 4px',
            'text-shadow: 300px 0 0',
            'text-shadow: 0 0 4px red, 0 0 2px',
            'text-shadow: 0 0 4px currentColor',
            'text-shadow: revert',
            'filter: drop-shadow(0 400px 0)',
            'filter: blur(1px) drop-shadow(0 4px 4px)',
            'filter: drop-shadow(0 0 4px currentColor)',
            'filter: drop-shadow(0 0 4px red) drop-shadow(0 0 4px inherit)',
            'filter: drop-shadow(0 0 4px var(--g))',
            '-webkit-filter: drop-shadow(0 4px 4px); filter: drop-shadow(0 4px 4px)',
            'filter: inherit',
            'outline: 4px solid',
            'outline: 4px dashed currentColor',
            'outline: 2px solid color-mix(in srgb, currentColor 50%, red)',
            'outline: 2px solid var(--g)',
            'outline: 2px solid inherit',
            'outline-style: solid',
            'outline-style: auto',
            'outline-color: currentColor',
            'outline-color: CURRENTCOLOR',
            'outline-color: inherit',
            'outline-color: initial',
            'outline-color: unset',
            'outline-color: revert',
            'outline-color: revert-layer',
            'outline-color: var(--g)',
            'outline: inherit',
            'border-image: linear-gradient(currentColor, currentColor) 1',
            'border-image-source: linear-gradient(red, CURRENTCOLOR)',
            'border-image: linear-gradient(var(--s-addr-bg), red) 1',
            'border-image: var(--g) 1',
            'border-image-source: inherit',
            'border-image-source: revert-layer',
            'border-image: linear-gradient(color-mix(in srgb, currentColor 50%, red), red) 1',
        ]) {
            refusedReach(`.t-neo .mark-shelf { ${decl}; }`);
        }
        // The critic's plants (m8): a state changes the ink of a box at rest, and the paint it wrote in it reaches over the page.
        refusedReach(".t-neo .mark-shelf { display: block; position: relative; color: transparent; box-shadow: 0 0 0 4000px currentColor; }\n.t-neo .items:hover .mark-shelf { color: #000; }");
        refusedReach(".t-neo .item-b { position: relative; color: transparent; text-shadow: 300px 0 0; }\n.t-neo .item-n { color: #fff; }\n.t-neo .item:hover .item-b { color: #000; }");
        refusedReach(".t-neo .mark-shelf { display: block; position: relative; color: transparent; border: 1px solid; border-image: linear-gradient(currentColor, currentColor) 1; border-image-outset: 400px; }\n.t-neo .items:hover .mark-shelf { color: #000; }");
    });

    it('reads a media block and a keyframe stop as a rule at rest, and a state rule by the belt alone', () => {
        refusedReach('@media (min-width: 680px) { .t-neo .mark-shelf { box-shadow: 0 0 0 4000px currentColor; } }');
        refusedReach('@media (max-width: 679.98px) { .t-neo .mark-shelf { outline-color: currentColor; } }');
        for (const stop of ['box-shadow: 0 0 0 40px', 'text-shadow: 40px 0 0', 'filter: drop-shadow(0 0 4px)', 'outline-color: currentColor', 'outline: 2px solid', 'border-image: linear-gradient(currentColor, red) 1']) {
            refusedReach(`@keyframes t-neo-ring { 0%, 100% { ${stop}; } 50% { ${stop}; } }\n.t-neo .item-b { animation: t-neo-ring 1s infinite; }`);
            refusedReach(`@media (min-width: 680px) { @keyframes t-neo-ring { to { ${stop}; } } }`);
        }
        // Under a state the belt reads what it allows (a shadow, an outline's colour) and refuses the rest by name: not twice.
        const hover = lintLookSheet(plantedNeo('.t-neo .item:hover { box-shadow: 0 0 4px currentColor; text-shadow: 0 0 2px; outline-color: currentColor; }'), { lookClass: 't-neo' });
        assert.ok(hover.length > 0 && !hover.some((p) => REACH.test(p)), hover.join('\n'));
    });

    it('leaves an inset layer, none, a literal colour, a palette role, a mix of those, and the border\'s own band alone', () => {
        for (const rule of [
            '.t-neo .mark-shelf { box-shadow: inset 0 0 0 4000px; }',
            '.t-neo .mark-shelf { box-shadow: inset 0 0 0 4000px currentColor; }',
            '.t-neo .mark-shelf { box-shadow: 0 0 4px red; -webkit-box-shadow: 0 0 4px red; }',
            '.t-neo .mark-shelf { box-shadow: inset 0 2px 0 0 rgba(198, 255, 253, 0.92), 0 0 0 1px rgba(44, 233, 224, 0.1), 0 10px 34px rgba(44, 233, 224, 0.3); }',
            '.t-neo .mark-shelf { box-shadow: 0 0 4px var(--s-text), 0 0 8px color-mix(in srgb, var(--s-accent) 40%, transparent); }',
            '.t-neo .mark-shelf { box-shadow: 0 0 4px transparent; text-shadow: 0 0 4px #fff, 0 1px 0 rgba(0, 0, 0, 0.35); }',
            '.t-neo .mark-shelf { text-shadow: none; box-shadow: none; filter: none; outline: none; border-image: none; }',
            '.t-neo .mark-shelf { text-shadow: initial; box-shadow: unset; filter: initial; outline: 0; }',
            '.t-neo .mark-shelf { filter: drop-shadow(0 4px 4px rgba(0, 0, 0, 0.4)) blur(1px); }',
            '.t-neo .mark-shelf { filter: sepia(0.35) saturate(0.75) drop-shadow(0 1px 0 rgba(255, 246, 230, 0.4)) drop-shadow(0 -1px 1px var(--s-text)); }',
            '.t-neo .mark-shelf { filter: blur(2px); }',
            '.t-neo .mark-shelf { outline: 2px solid red; }',
            '.t-neo .mark-shelf { outline-style: solid; outline-color: red; }',
            '.t-neo .mark-shelf { outline: 0; outline-style: solid; }',
            '.t-neo .mark-shelf { outline: 2px dashed color-mix(in srgb, var(--s-muted) 35%, transparent); outline-offset: -5px; }',
            '.t-neo .mark-shelf { outline: 2px solid var(--s-text); }',
            '.t-neo .mark-shelf { outline-color: #3df2ea; }',
            '.t-neo .mark-shelf { border-image-source: linear-gradient(red, blue); border-image-slice: 1; }',
            '.t-neo .mark-shelf { border-image: url(decor/rain-near.svg) 1; }',
            '.t-neo .mark-shelf { border-image: linear-gradient(var(--s-text), var(--s-accent)) 1; }',
            '.t-neo .mark-shelf { border: 1px solid currentColor; border-color: currentColor; border-top-color: inherit; }',
            '.t-neo .mark-shelf { background: currentColor; border-width: 40px; border-style: solid; }',
        ]) {
            accepts(rule);
        }
        // A shadow that names its colour passes this rule in a keyframe too; the ground belt refuses a box shadow in a keyframe on its own (`a-keyframe-never-sets-a-ground-or-a-shadow`).
        const glow = lintLookSheet(plantedNeo('@keyframes t-neo-glow { from { box-shadow: 0 0 4px red; } to { box-shadow: 0 0 12px red; } }'), { lookClass: 't-neo' });
        assert.ok(!glow.some((p) => /it reaches past its box, where a state that changes the ink/.test(p)) && glow.some((p) => /a ground or a shadow in a keyframe/.test(p)), glow.join('\n'));
    });

    it('is first party only, and reads a pseudo-element\'s rule once, by pseudoHostPaintProblems', () => {
        for (const rule of ['.t-neo .item { box-shadow: 0 0 0 4000px currentColor; outline: 2px solid; }', '@keyframes wk-ring { to { box-shadow: 0 0 0 40px; } }']) {
            const kit = lintSheet(plantedKit(rule));
            assert.ok(!kit.some((p) => REACH.test(p)), `kit, ${rule}:\n  ${kit.join('\n  ')}`);
        }
        const pseudo = lintLookSheet(plantedNeo(".t-neo .item-b::after { content: ''; box-shadow: 0 0 4px currentColor; }"), { lookClass: 't-neo' });
        assert.equal(pseudo.length, 1, pseudo.join('\n'));
        assert.ok(!REACH.test(pseudo[0]), pseudo[0]);
    });

    it('costs the shipped looks, the starters, the fixtures and the canary nothing: it reads their shadows, their drop shadows and Rural\'s outline, and every one names its colour', () => {
        const count = { box: 0, text: 0, drop: 0, outline: 0, image: 0 };
        for (const { name, css } of FIRST_PARTY_SHEETS) {
            for (const { decls } of everyRule(css)) {
                for (const { prop, value } of decls) {
                    if (prop === 'box-shadow') count.box += splitTopLevel(value, ',').filter((layer) => !/\binset\b/i.test(layer) && !/^none$/i.test(layer)).length;
                    else if (prop === 'text-shadow' && !/^none$/i.test(value)) count.text += splitTopLevel(value, ',').length;
                    else if (prop === 'filter') count.drop += (value.match(/drop-shadow\(/gi) ?? []).length;
                    else if (/^outline(?:-color)?$/.test(prop) && !/^none$/i.test(value)) count.outline += 1;
                    else if (prop.startsWith('border-image')) count.image += 1;
                }
            }
            assert.ok(!lintLookSheet(css, { lookClass: (/--look-sheet:\s*([\w-]+)/.exec(css) ?? [])[1], load: 'worn', ownArt: undefined }).some((p) => REACH.test(p)), name);
        }
        assert.ok(count.box >= 12 && count.text >= 6 && count.drop >= 4 && count.outline >= 1, JSON.stringify(count));
        for (const cls of ['t-modern', 't-neo', 't-rural']) {
            const starter = rescopeSheet(read(LOOKS.find((sheet) => sheet.lookClass === cls).path), cls.slice(2), carried);
            assert.ok(!lintLookSheet(starter, { lookClass: 't-workshop' }).some((p) => REACH.test(p)), `${cls} starter`);
        }
    });
});

describe('an-outline-is-capped-per-longhand', () => {
    /**
     * The lint-belts critic's fourth review, ranked item 1 (decided by the
     * window): an outline's ring reaches past its box over the boxes beside
     * it, and the probe reads an outline at rest only across the glyphs of its
     * own box and of the boxes above a figure. A cap on the sum in one rule
     * was split by the cascade (`outline: 8px solid transparent` in one rule,
     * `outline-offset: 8px` in another), and a keyframe can carry the widths.
     * So in a first-party sheet each declaration is capped where it stands, at
     * rest, in a media block and in a keyframe: `outline-width` (and the
     * shorthand's width) is px or `thin` or `medium` and at most 4px,
     * `outline-offset` is px from -8px to 4px, and neither takes a `var()` or a
     * `calc()`. Red: `outlineCapProblems` out of `lintLook` (every refusal
     * below fails).
     */
    const CAP = /an outline's ring reaches over the boxes beside its box/;
    const refusedCap = (rule) => {
        const problems = lintLookSheet(plantedNeo(rule), { lookClass: 't-neo' });
        assert.ok(problems.some((p) => CAP.test(p)), `${rule}:\n  ${problems.join('\n  ') || '(no problem)'}`);
    };

    it('pins the cap by value', () => {
        assert.equal(OUTLINE_WIDTH_MAX_PX, 4);
        assert.equal(OUTLINE_OFFSET_MIN_PX, -8);
        assert.equal(OUTLINE_OFFSET_MAX_PX, 4);
    });

    it('refuses the critic\'s plants: the cascade split, the offset-only rule and the keyframe that carries the widths (m8)', () => {
        // The shorthand in one rule and the offset in another: each declaration is over the cap on its own.
        refusedCap(".t-neo .mark-shelf { display: block; position: relative; outline: 8px solid transparent; }\n.t-neo .mark-shelf { outline-offset: 8px; }\n.t-neo .items:hover .mark-shelf { outline-color: #000; }");
        // The width in one rule, the style and the offset in a more specific one.
        refusedCap(".t-neo .mark-shelf { display: block; position: relative; outline-width: 8px; }\n.t-neo .stall .mark-shelf { outline-offset: 8px; outline-style: solid; outline-color: transparent; }\n.t-neo .items:hover .mark-shelf { outline-color: #000; }");
        // An offset alone, with the width inside the cap: the ring's reach is the offset's.
        refusedCap('.t-neo .mark-shelf { outline: 2px solid red; }\n.t-neo .stall .mark-shelf { outline-offset: 100px; }');
        // The keyframe that carries the widths, run on a box with a clear ring.
        refusedCap("@keyframes t-neo-ring { 0%, 100% { outline-width: 200px; outline-offset: -100px; } }\n.t-neo .item-b { outline: 1px solid transparent; animation: t-neo-ring 1s infinite; }");
        // The plant `w2:11` the round before left as a stated gap: a ring of 200px at -100px, shown by a colour.
        refusedCap('.t-neo .item-x { outline: 200px solid transparent; outline-offset: -100px; }\n.t-neo .item:hover .item-x { outline-color: #000; }');
    });

    it('refuses a width past 4px or not in px, an offset outside -8px to 4px or not in px, and a var() or a calc(), in every position', () => {
        for (const decl of [
            'outline-width: 4.01px',
            'outline-width: 5px',
            'outline-width: 200px',
            'outline-width: 1E1px',
            'outline-width: thick',
            'outline-width: THICK',
            'outline-width: 1em',
            'outline-width: 1rem',
            'outline-width: 1vw',
            'outline-width: 0.1in',
            'outline-width: 3pt',
            'outline-width: 1ex',
            'outline-width: 2',
            'outline-width: var(--w)',
            'outline-width: calc(2px)',
            'outline-width: min(2px, 3px)',
            'outline-width: inherit',
            'outline-width: revert',
            'outline-width: revert-layer',
            'outline: 4.01px solid red',
            'outline: thick solid red',
            'outline: 1em solid red',
            'outline: calc(1px) solid red',
            'outline: var(--w) solid red',
            'outline: 2px solid red; outline: 5px solid red',
            'outline: inherit',
            'outline-offset: 4.01px',
            'outline-offset: -8.01px',
            'outline-offset: 100px',
            'outline-offset: -100px',
            'outline-offset: 1em',
            'outline-offset: 5',
            'outline-offset: var(--o)',
            'outline-offset: calc(-9px)',
            'outline-offset: calc(2px)',
            'outline-offset: inherit',
            'outline-offset: revert-layer',
        ]) {
            refusedCap(`.t-neo .mark-shelf { ${decl}; }`);
            refusedCap(`@media (min-width: 680px) { .t-neo .mark-shelf { ${decl}; } }`);
            refusedCap(`@keyframes t-neo-ring { to { ${decl}; } }`);
        }
        // A property the lint reads by name, in capitals and with a prefix.
        refusedCap('.t-neo .mark-shelf { OUTLINE-OFFSET: 100px; }');
    });

    it('takes Rural\'s one outline (1px at -5px), the edges of the cap, and a zero', () => {
        const rural = read(LOOKS.find((sheet) => sheet.lookClass === 't-rural').path);
        assert.match(rural, /outline: 1px dashed color-mix/);
        assert.match(rural, /outline-offset: -5px/);
        assert.deepEqual(lintLookSheet(rural, { lookClass: 't-rural' }), []);
        for (const decl of [
            'outline-width: 4px',
            'outline-width: 0',
            'outline-width: 0px',
            'outline-width: thin',
            'outline-width: medium',
            'outline-width: 3.9999px',
            'outline-width: initial',
            'outline-width: unset',
            'outline: 4px solid red',
            'outline: medium dashed red',
            'outline: thin solid var(--s-text)',
            'outline: 1px solid color-mix(in srgb, var(--s-muted) 35%, transparent)',
            'outline: none',
            'outline: 0',
            'outline-offset: 4px',
            'outline-offset: -8px',
            'outline-offset: 0',
            'outline-offset: -0',
            'outline-offset: -5px',
            'outline-offset: initial',
            'outline-offset: unset',
        ]) {
            accepts(`.t-neo .mark-shelf { ${decl}; }`);
        }
        accepts('@media (min-width: 680px) { .t-neo .mark-shelf { outline: 4px solid red; outline-offset: 4px; } }');
        accepts('@keyframes t-neo-ring { from { outline-width: 1px; outline-offset: -8px; } to { outline-width: 4px; outline-offset: 4px; } }');
    });

    it('is first party only, leaves a state rule to the belt, and costs the sheets a run serves nothing', () => {
        for (const rule of ['.t-neo .item { outline: 4000px solid red; outline-offset: -100px; }', '@keyframes wk-ring { to { outline-width: 200px; } }']) {
            const kit = lintSheet(plantedKit(rule));
            assert.ok(!kit.some((p) => CAP.test(p)), `kit, ${rule}:\n  ${kit.join('\n  ')}`);
        }
        // Under a state the belt refuses the property by name, so the cap does not say it again.
        const hover = lintLookSheet(plantedNeo('.t-neo .item:hover { outline-width: 200px; outline-offset: -100px; }'), { lookClass: 't-neo' });
        assert.ok(hover.length > 0 && !hover.some((p) => CAP.test(p)), hover.join('\n'));
        let outlines = 0;
        for (const { name, css } of FIRST_PARTY_SHEETS) {
            for (const { decls } of everyRule(css)) outlines += decls.filter((d) => /^outline(?:-width|-offset)?$/.test(d.prop)).length;
            assert.ok(!lintLookSheet(css, { lookClass: (/--look-sheet:\s*([\w-]+)/.exec(css) ?? [])[1], load: 'worn', ownArt: undefined }).some((p) => CAP.test(p)), name);
        }
        assert.ok(outlines >= 2, `${outlines} outline declarations read (Rural's two)`);
    });
});

/** A rule or keyframe-stop whose declarations a test reads, with the at-rules entered; `selectors` is undefined in a keyframe. */
function declarationsIn(css) {
    return everyRule(css).flatMap(({ selectors, decls }) => decls.map((decl) => ({ ...decl, selectors })));
}

describe('a-line-and-a-stroke-are-capped-per-declaration', () => {
    /**
     * The lint-belts critic's fifth review, B1: an underline, a strike and an
     * SVG stroke are drawn in the ink of their box, and each reaches past it
     * with one number — `text-underline-offset: 300px` with
     * `text-decoration-thickness: 60px` on a link stall.css already
     * underlines, or `stroke-width: 300` on a glyph (`.ic` is `stroke:
     * currentColor`). A state that changes the ink reveals it with no move.
     * So in a first-party sheet, wherever a declaration stands (at rest, in a
     * media block and in a keyframe) the offset is within 4px of its line,
     * the thickness at most 3px, the stroke at most 3 wide, each in px or a
     * keyword with no `var()` or `calc()`, and the `d` property is not
     * written. Red: `inkReachProblems` out of `lintLook` (every refusal below
     * fails, the sheets pass).
     */
    const INK = /is drawn in the ink of its box and reaches past it, where a state that changes the ink shows it/;
    const refusedInk = (rule) => {
        const problems = lintLookSheet(plantedNeo(rule), { lookClass: 't-neo' });
        assert.ok(problems.some((p) => INK.test(p)), `${rule}:\n  ${problems.join('\n  ') || '(no problem)'}`);
    };

    it('pins the caps by value', () => {
        assert.equal(UNDERLINE_OFFSET_MAX_PX, 4);
        assert.equal(DECORATION_THICKNESS_MAX_PX, 3);
        assert.equal(STROKE_WIDTH_MAX, 3);
    });

    it('refuses the critic\'s plants: the bar 300px below a base-underlined link, the shorthand, the keyframe, the stroke and the path (f2, f8)', () => {
        // The look writes only the offset and the thickness, on a link stall.css underlines; a colour under :hover recolours the bar.
        refusedInk('.t-neo .guide-link { text-underline-offset: 300px; text-decoration-thickness: 60px; }\n.t-neo .guide-link:hover { color: #000000; }');
        refusedInk('.t-neo .stall-sub { text-decoration: underline 60px; text-underline-offset: 300px; }\n.t-neo .stall-head:hover .stall-sub { color: #ff00aa; }');
        refusedInk('.t-neo .stall-sub { text-decoration: underline currentColor 60px; text-underline-offset: 300px; }');
        refusedInk('@keyframes t-neo-td { 50% { text-underline-offset: 300px; } }');
        refusedInk('.t-neo .item-caret { overflow: visible; stroke-width: 300; pointer-events: none; color: transparent; }\n.t-neo .item-caret:hover { color: #ff00aa; }');
        refusedInk(".t-neo .item-caret { overflow: visible; }\n.t-neo .item-caret path { d: path('M -400 -400 L 400 400'); }");
    });

    it('refuses an offset past 4px either side or not in px, a thickness past 3px or not in px, a stroke past 3, a var() or calc(), and d, in every position', () => {
        for (const decl of [
            'text-underline-offset: 4.01px',
            'text-underline-offset: -4.01px',
            'text-underline-offset: 300px',
            'text-underline-offset: 1em',
            'text-underline-offset: 10%',
            'text-underline-offset: 1rem',
            'text-underline-offset: 2',
            'text-underline-offset: var(--o)',
            'text-underline-offset: calc(2px)',
            'text-underline-offset: min(2px, 3px)',
            'text-decoration-thickness: 3.01px',
            'text-decoration-thickness: 60px',
            'text-decoration-thickness: 0.2em',
            'text-decoration-thickness: 5%',
            'text-decoration-thickness: var(--t)',
            'text-decoration-thickness: calc(1px)',
            'text-decoration: underline 3.01px',
            'text-decoration: underline 60px red',
            'text-decoration: underline wavy 4px',
            'text-decoration: underline 50%',
            'text-decoration: underline var(--t)',
            'text-decoration: underline calc(2px)',
            // The sixth review's M1: a function the old reader did not know (Chrome draws a 30px bar for the first three).
            'text-decoration: underline abs(60px)',
            'text-decoration: underline round(60px, 1px)',
            'text-decoration: underline hypot(60px)',
            'text-decoration: underline exp(4px)',
            'text-decoration: underline sign(60px)',
            'text-decoration: underline min(1px, 2px)',
            'text-decoration: underline 1e3px',
            'text-decoration: underline 60PX',
            'text-decoration: underline env(x)',
            'text-decoration: underline attr(x)',
            // Not a line or style keyword, a colour this lint reads or a palette role.
            'text-decoration: underline CanvasText 2px',
            'text-decoration: underline spelling-error',
            'text-decoration: underline color-mix(in srgb, red, blue)',
            'text-decoration: underline rgb(from red r g b)',
            'text-decoration: underline rgb(abs(255) 0 0)',
            'text-decoration: underline inherit',
            'stroke-width: 3.01',
            'stroke-width: 3.01px',
            'stroke-width: 300',
            'stroke-width: 1em',
            'stroke-width: 50%',
            'stroke-width: var(--w)',
            'stroke-width: calc(2)',
            "d: path('M 0 0 L 8 8')",
            'd: none',
        ]) {
            refusedInk(`.t-neo .guide-link { ${decl}; }`);
            refusedInk(`@media (min-width: 680px) { .t-neo .guide-link { ${decl}; } }`);
            refusedInk(`@keyframes t-neo-ring { to { ${decl}; } }`);
            refusedInk(`.t-neo .item-caret::after { content: ''; ${decl}; }`);
        }
        // The property in capitals.
        refusedInk('.t-neo .guide-link { TEXT-UNDERLINE-OFFSET: 300px; }');
        // The prefixed shorthand's twin is a different fault; its thickness is read as the shorthand's.
        refusedInk('.t-neo .guide-link { -webkit-text-decoration: underline 60px; }');
    });

    it('takes the edges of the caps, a keyword, a zero, a CSS-wide keyword, a palette role and the sheets\' own widths', () => {
        for (const decl of [
            'text-underline-offset: 4px',
            'text-underline-offset: -4px',
            'text-underline-offset: +4.0PX',
            'text-underline-offset: 0',
            'text-underline-offset: auto',
            'text-underline-offset: from-font',
            'text-underline-offset: initial',
            'text-underline-offset: unset',
            'text-underline-offset: inherit',
            'text-underline-offset: revert',
            'text-decoration-thickness: 3px',
            'text-decoration-thickness: 0',
            'text-decoration-thickness: auto',
            'text-decoration-thickness: from-font',
            'text-decoration-thickness: inherit',
            'text-decoration: underline 3px red',
            'text-decoration: underline wavy 2px var(--s-text)',
            'text-decoration: underline var(--s-accent)',
            'text-decoration: underline from-font',
            'text-decoration: underline solid red 2px',
            'text-decoration: overline double #fff',
            'text-decoration: underline dotted rgb(1 2 3) 2px',
            'text-decoration: UNDERLINE WAVY transparent',
            'text-decoration: blink',
            'text-decoration: underline currentColor 1px',
            'text-decoration: underline 0',
            'text-decoration: line-through auto',
            'text-decoration: none',
            'text-decoration: revert',
            'text-decoration: inherit',
            'stroke-width: 3',
            'stroke-width: 3px',
            'stroke-width: 1.75',
            'stroke-width: 2',
            'stroke-width: 0',
            'stroke-width: initial',
            'stroke-width: inherit',
        ]) {
            // A stroke stands on a drawn icon alone (`svg-paint-stands-only-on-a-drawn-icon`): the cap is read there.
            accepts(`${decl.startsWith('stroke') ? '.t-neo .ic' : '.t-neo .guide-link'} { ${decl}; }`);
        }
        accepts('@keyframes t-neo-ring { from { text-underline-offset: -2px; text-decoration-thickness: 1px; } to { text-underline-offset: 4px; text-decoration-thickness: 3px; } }');
        accepts('@media (min-width: 680px) { .t-neo .ic { stroke-width: 2; } }');
        // A stroke within the cap in a keyframe passes the cap and is refused as SVG paint off a drawn icon.
        const ring = lintLookSheet(plantedNeo('@keyframes t-neo-ring { from { stroke-width: 1; } to { stroke-width: 3; } }'), { lookClass: 't-neo' });
        assert.ok(!ring.some((p) => /is drawn in the ink of its box and reaches past it/.test(p)) && ring.some((p) => /SVG paint stands only on a drawn icon/.test(p)), ring.join('\n'));
    });

    it('is first party only, leaves a state rule to the belt, and costs the shipped looks, the starters, the fixtures and the canary nothing: they set a stroke of 1.75 to 2 and no underline', () => {
        for (const rule of [
            '.t-neo .guide-link { text-underline-offset: 300px; text-decoration-thickness: 60px; stroke-width: 300; }',
            "@keyframes wk-ring { to { text-underline-offset: 300px; } }\n.t-neo .item-caret path { d: path('M 0 0'); }",
        ]) {
            const kit = lintSheet(plantedKit(rule));
            assert.ok(!kit.some((p) => INK.test(p)), `kit, ${rule}:\n  ${kit.join('\n  ')}`);
        }
        // Under a state the belt refuses the property by name, so the cap does not say it again.
        const hover = lintLookSheet(plantedNeo('.t-neo .guide-link:hover { text-underline-offset: 300px; stroke-width: 300; }'), { lookClass: 't-neo' });
        assert.ok(hover.length > 0 && !hover.some((p) => INK.test(p)), hover.join('\n'));
        const strokes = [];
        let reach = 0;
        for (const { name, css } of FIRST_PARTY_SHEETS) {
            for (const { prop, value } of declarationsIn(css)) {
                if (prop === 'stroke-width') strokes.push(Number.parseFloat(value));
                if (/^(?:text-underline-offset|text-decoration-thickness|d|column-rule(?:-.*)?)$/.test(prop) || (prop === 'text-decoration' && /\d/.test(value))) reach += 1;
            }
            assert.ok(!lintLookSheet(css, { lookClass: (/--look-sheet:\s*([\w-]+)/.exec(css) ?? [])[1], load: 'worn', ownArt: undefined }).some((p) => INK.test(p)), name);
        }
        // The three shipped looks set a stroke width (Modern and Neo 2, Rural 1.75) and nothing else on these lines.
        assert.deepEqual([...strokes].sort(), [1.75, 2, 2]);
        assert.equal(reach, 0, 'no served first-party sheet writes an underline offset or thickness, d or a column rule');
    });
});

describe('a-blur-is-capped', () => {
    /**
     * The sixth review's judgement on `filter: blur()`, decided by the window.
     * A blur spreads the paint of a box, its ink included, far past the box,
     * and a colour under a state then shows it with no move; the fifth review
     * stated it as a gap (`f2:32`). So in a first-party sheet, wherever a
     * `filter` stands (at rest, in a media block and in a keyframe,
     * `-webkit-filter` read as `filter`) a `blur()` is px only and at most 4px,
     * there is at most one to a list, no `var()`, `calc()` or other function
     * stands in it, and no `var()` stands elsewhere in the list (a custom
     * property can hold a whole `blur(80px)`). `backdrop-filter` is left
     * alone. Red: `blurCapProblems` out of `lintLook` (every refusal below
     * fails, and so do the `h1` plants and `f2:32`).
     */
    const BLUR = /a blur\(\) spreads the box's paint, its ink included, past the box/;
    const refusedBlur = (rule) => {
        const problems = lintLookSheet(plantedNeo(rule), { lookClass: 't-neo' });
        assert.ok(problems.some((p) => BLUR.test(p)), `${rule}:\n  ${problems.join('\n  ') || '(no problem)'}`);
    };

    it('pins the cap by value', () => {
        assert.equal(FILTER_BLUR_MAX_PX, 4);
    });

    it('refuses a blur past 4px, not in px, two to a list, with a var() or any function in it, and a var() in the list, in every position', () => {
        for (const decl of [
            'filter: blur(40px)',
            'filter: blur(4.01px)',
            'filter: BLUR(40PX)',
            'filter: blur(1e2px)',
            'filter: blur(1em)',
            'filter: blur(1rem)',
            'filter: blur(10%)',
            'filter: blur(2)',
            'filter: blur(var(--b))',
            'filter: blur(var(--b, 2px))',
            'filter: blur(calc(2px))',
            'filter: blur(min(2px, 3px))',
            'filter: blur(abs(2px))',
            'filter: blur(round(2px, 1px))',
            'filter: blur(hypot(2px))',
            'filter: blur(2px) blur(2px)',
            'filter: blur(1px) sepia(1) blur(1px)',
            'filter: sepia(0.35) blur(40px)',
            'filter: drop-shadow(0 0 2px red) blur(40px)',
            'filter: var(--f)',
            'filter: var(--f) sepia(1)',
            'filter: sepia(1) var(--f)',
            '-webkit-filter: blur(40px)',
            '-webkit-filter: var(--f)',
            'FILTER: blur(40px)',
            'filter: blur(40px) !important',
        ]) {
            refusedBlur(`.t-neo .item-n { ${decl}; }`);
            refusedBlur(`@media (min-width: 680px) { .t-neo .item-n { ${decl}; } }`);
            refusedBlur(`@keyframes t-neo-bl { to { ${decl}; } }`);
            refusedBlur(`.t-neo .item-n::after { content: ''; ${decl}; }`);
        }
    });

    it('takes a blur within the cap, the looks\' own filter functions, a drop-shadow() with a palette role, a CSS-wide keyword and backdrop-filter', () => {
        for (const decl of [
            'filter: blur(4px)',
            'filter: blur(0)',
            'filter: blur(0.5px)',
            'filter: blur()',
            'filter: BLUR(+4.0PX)',
            'filter: blur(2px) sepia(0.35) saturate(0.75)',
            'filter: sepia(0.35) saturate(0.75) drop-shadow(0 1px 0 rgba(255, 246, 230, 0.4)) blur(2px)',
            'filter: sepia(1) saturate(0.5) brightness(0.45) contrast(1.15)',
            'filter: drop-shadow(0 0 6px rgba(255, 77, 122, 0.8))',
            'filter: drop-shadow(0 0 4px var(--s-accent))',
            'filter: none',
            'filter: initial',
            'backdrop-filter: blur(40px)',
            'backdrop-filter: blur(40px); -webkit-backdrop-filter: blur(40px)',
            'backdrop-filter: var(--f)',
        ]) {
            accepts(`.t-neo .item-n { ${decl}; }`);
        }
        accepts('@keyframes t-neo-bl { from { filter: blur(0); } to { filter: blur(4px); } }');
    });

    it('is first party only, leaves a state rule to the belt, and costs the sheets a run serves nothing: none blurs its own paint', () => {
        const kit = lintSheet(plantedKit('.t-neo .item-n { filter: blur(40px) blur(40px); -webkit-filter: var(--f); }'));
        assert.ok(!kit.some((p) => BLUR.test(p)), kit.join('\n'));
        // Under a state the belt refuses the property by name: one sentence, not two.
        const hover = lintLookSheet(plantedNeo('.t-neo .item-n:hover { filter: blur(40px); }'), { lookClass: 't-neo' });
        assert.ok(hover.some((p) => /is not a property a state rule may set/.test(p)) && !hover.some((p) => BLUR.test(p)), hover.join('\n'));
        const sheets = [...FIRST_PARTY_SHEETS];
        for (const cls of ['t-modern', 't-neo', 't-rural']) {
            sheets.push({ name: `starter ${cls}`, css: rescopeSheet(read(LOOKS.find((sheet) => sheet.lookClass === cls).path), cls.slice(2), carried) });
        }
        let filters = 0;
        for (const { name, css } of sheets) {
            for (const { prop, value } of declarationsIn(css)) {
                if (prop.replace(/^-webkit-/, '') !== 'filter') continue;
                filters += 1;
                assert.ok(!/(?<![\w-])blur\s*\(/i.test(value) && !/(?<![\w-])var\s*\(/i.test(value.replace(/drop-shadow\([^)]*\)/gi, '')), `${name}: filter: ${value}`);
            }
            const problems = lintLookSheet(css, { lookClass: (/--look-sheet:\s*([\w-]+)/.exec(css) ?? [])[1], load: 'worn', ownArt: undefined });
            assert.ok(!problems.some((p) => BLUR.test(p)), name);
        }
        // Rural writes two filters and Neo three, and the starters carry them again.
        assert.ok(filters >= 5, `${filters} filter declarations read`);
    });
});

describe('the-column-rule-names-its-own-colour', () => {
    /**
     * The fifth review's B1 (the column rule's half): a column rule wider
     * than its gap reaches past the box, and with no colour it is drawn in
     * the ink. So, like an outline (`a-paint-past-its-box-names-its-own-colour`),
     * `column-rule` and `column-rule-color` name a literal colour or a palette
     * role, and a rule that draws (`column-rule-style`) names one in the same
     * rule. Red: `column-rule` out of `REACH_PROPS` (every refusal below
     * fails).
     */
    const REACH = /it reaches past its box, where a state that changes the ink of its box shows it/;
    const refusedRule = (rule) => {
        const problems = lintLookSheet(plantedNeo(rule), { lookClass: 't-neo' });
        assert.ok(problems.some((p) => REACH.test(p)), `${rule}:\n  ${problems.join('\n  ') || '(no problem)'}`);
    };

    it('refuses a column rule in currentColor, inherit, revert, no colour or a variable that is not a role, at rest, in a media block and in a keyframe', () => {
        for (const decl of [
            'column-rule: 4000px solid currentColor',
            'column-rule: 4000px solid CURRENTCOLOR',
            'column-rule: 2px solid',
            'column-rule: 2px dashed',
            'column-rule: 2px solid inherit',
            'column-rule: 2px solid var(--g)',
            'column-rule: 2px solid color-mix(in srgb, currentColor 50%, red)',
            'column-rule: inherit',
            'column-rule-color: currentColor',
            'column-rule-color: inherit',
            'column-rule-color: initial',
            'column-rule-color: unset',
            'column-rule-color: revert',
            'column-rule-color: revert-layer',
            'column-rule-color: var(--g)',
            'column-rule-style: solid',
            'column-rule-style: dashed',
        ]) {
            refusedRule(`.t-neo .item-n { column-count: 2; ${decl}; }`);
            refusedRule(`@media (min-width: 680px) { .t-neo .item-n { ${decl}; } }`);
            refusedRule(`@keyframes t-neo-cr { to { ${decl}; } }`);
        }
    });

    it('takes a column rule that names its colour, a rule that draws nothing, a zero width and a palette role', () => {
        for (const decl of [
            'column-rule: 2px solid red',
            'column-rule: 2px solid var(--s-text)',
            'column-rule: 2px dashed color-mix(in srgb, var(--s-muted) 35%, transparent)',
            'column-rule: none',
            'column-rule: 0 solid',
            'column-rule: initial',
            'column-rule-color: red',
            'column-rule-color: var(--s-accent)',
            'column-rule-color: red; column-rule-style: solid; column-rule-width: 2px',
            'column-rule-style: none',
        ]) {
            accepts(`.t-neo .item-n { column-count: 2; ${decl}; }`);
        }
    });

    it('is first party only, and costs the sheets nothing: none writes a column rule', () => {
        const kit = lintSheet(plantedKit('.t-neo .item-n { column-count: 2; column-rule: 4000px solid currentColor; }'));
        assert.ok(!kit.some((p) => REACH.test(p)), kit.join('\n'));
        for (const { name, css } of FIRST_PARTY_SHEETS) {
            assert.equal(declarationsIn(css).filter((d) => d.prop.startsWith('column-rule')).length, 0, name);
        }
    });
});

describe('no-custom-property-holds-the-ink', () => {
    /**
     * The fifth review's B2. `var()` is substituted as tokens, so wherever it
     * stands it can carry a comma and then a stop, a layer or a whole value
     * in the ink of the box that reads it: a stop's place (`#000 var(--x)`
     * with `--x: 50%, currentColor`), the `mask` position slot, the size
     * after a `/`, a radial gradient's `at`, a conic gradient's `from`.
     * Chrome confirms all five (the critic's page). The reader
     * of a position cannot tell, so the closure is at the declaration: in a
     * first-party sheet no custom property holds `currentColor` or `inherit`
     * anywhere in its value, nor is `revert`, `revert-layer` or `unset` its
     * whole value (`unset` on a custom property is `inherit`, which is
     * inherited: the sixth review's smaller item). That closes the class
     * `c1:8` stated as a gap, and backs up the
     * pseudo-element reader's palette-role-only rule. Red: the custom-property
     * block out of `declarationProblems` (every refusal below fails, and so
     * do `c1:8`, `m2:0` and the mask plants `f5:0` to `f5:2`).
     */
    const HOLDS = /a custom property that holds (?:currentcolor|inherit|revert|unset)/;
    const refusedHolds = (rule) => {
        const problems = lintLookSheet(plantedNeo(rule), { lookClass: 't-neo' });
        assert.ok(problems.some((p) => HOLDS.test(p)), `${rule}:\n  ${problems.join('\n  ') || '(no problem)'}`);
    };

    it('refuses currentColor and inherit anywhere in a value, and revert, revert-layer and unset as the whole value, at rest, in a media block, on the root and on a pseudo-element', () => {
        for (const decl of [
            '--x: currentColor',
            '--x: CurrentColor',
            '--x: 50%, currentColor',
            '--x: 0 0, linear-gradient(currentColor, currentColor)',
            '--x: color-mix(in srgb, currentColor 50%, red)',
            '--x: 1px solid currentColor',
            '--x: inherit',
            '--x: INHERIT',
            '--x: 1px solid inherit',
            '--x: revert',
            '--x: revert-layer',
            '--x: REVERT-LAYER',
            '--x: unset',
            '--x: UNSET',
            '--s-addr-bg: currentColor',
            '--look-extra: inherit',
        ]) {
            refusedHolds(`.t-neo .item-p { ${decl}; }`);
            refusedHolds(`@media (min-width: 680px) { .t-neo .item-p { ${decl}; } }`);
            refusedHolds(`.t-neo { ${decl}; }`);
            refusedHolds(`.t-neo .item-p::after { content: ''; ${decl}; }`);
        }
    });

    it('closes the five roads the critic confirmed in Chrome (f5:0 to f5:2, c1:8): the custom property is refused where it is declared', () => {
        for (const rule of [
            ".t-neo .item-p { --p: 0 0, linear-gradient(currentColor, currentColor); }\n.t-neo .item-p::after { content: ''; background: #000; mask: linear-gradient(#000, #000) var(--p); }",
            ".t-neo .item-p { --w: auto, linear-gradient(currentColor, currentColor); }\n.t-neo .item-p::after { content: ''; background: #000; mask: linear-gradient(#000, #000) 0 0 / var(--w); }",
            ".t-neo .item-p { --y: 50%, currentColor 0 100%; }\n.t-neo .item-p::after { content: ''; background: #000; mask-image: radial-gradient(circle at 50% var(--y), #000, transparent); }",
            ".t-neo .item-p { --a: 0deg, currentColor 0 100%; }\n.t-neo .item-p::after { content: ''; background: #000; mask-image: conic-gradient(from var(--a), #000, transparent); }",
            ".t-neo .item-p { --x: 50%, currentColor; }\n.t-neo .item-p::after { content: ''; background: #000; mask-image: linear-gradient(#000 var(--x), transparent); }",
        ]) {
            refusedHolds(rule);
        }
    });

    it('takes a value that only starts like the keyword, a string, a reference to another property, a palette role and a literal colour', () => {
        for (const decl of ['--x: currentcolorful', '--x: "currentColor"', "--x: 'inherit'", '--x: 1px revert', '--x: var(--y)', '--x: var(--s-text)', '--x: red', '--x: 50%, red', '--x: initial', '--x: 1px unset', '--inherit-currentcolor: 1px']) {
            accepts(`.t-neo .item-p { ${decl}; }`);
        }
    });

    it('is first party only, leaves a state rule and a keyframe to their own sentences, and reads the kit as before', () => {
        const kit = lintSheet(plantedKit('.t-neo .item-p { --x: 50%, currentColor; --y: inherit; }'));
        assert.ok(!kit.some((p) => HOLDS.test(p)), kit.join('\n'));
        // Under a state the belt refuses a custom property by name: one sentence, not two.
        const hover = lintLookSheet(plantedNeo('.t-neo .item:hover { --x: currentColor; }'), { lookClass: 't-neo' });
        assert.ok(hover.some((p) => /a custom property set under a state/.test(p)) && !hover.some((p) => HOLDS.test(p)), hover.join('\n'));
    });

    it('costs nothing: no served stylesheet the app loads declares such a custom property, and the theme table emits none', async () => {
        const roles = new Set(['base', 'screen', 'look', 'kit', 'fixture', 'private']);
        const rows = SERVED.filter((row) => roles.has(row.role));
        const seen = new Set(rows.map((row) => row.role));
        for (const role of roles) assert.ok(seen.has(role), `a ${role} sheet is read`);
        let declared = 0;
        for (const row of rows) {
            for (const { prop, value } of declarationsIn(row.css)) {
                if (!prop.startsWith('--')) continue;
                declared += 1;
                assert.ok(!/(?<![\w-])(?:currentcolor|inherit)(?![\w-])/i.test(value) && !/^(?:revert|revert-layer|unset)$/i.test(value), `${row.path}: ${prop}: ${value}`);
            }
        }
        assert.ok(declared >= 80, `${declared} custom properties read (the look rows' own, stall.css's, the screens')`);
        // The starters (the shipped looks re-scoped for the kit) and the canary carry the same.
        for (const cls of ['t-modern', 't-neo', 't-rural']) {
            const starter = rescopeSheet(read(LOOKS.find((sheet) => sheet.lookClass === cls).path), cls.slice(2), carried);
            assert.deepEqual(declarationsIn(starter).filter((d) => d.prop.startsWith('--') && /(?<![\w-])(?:currentcolor|inherit)(?![\w-])/i.test(d.value)), [], `${cls} starter`);
        }
        const canary = canaryFiles()['canary/sheet.css'];
        assert.deepEqual(declarationsIn(canary).filter((d) => d.prop.startsWith('--') && /(?<![\w-])(?:currentcolor|inherit)(?![\w-])/i.test(d.value)), [], 'the canary');
        // The inline custom properties the app writes: the theme table, under every shipped look and mood, and none the code sets by hand holds the ink.
        const { runnerImport } = await import('vite');
        const { module: attachments } = await runnerImport(join(ROOT, 'src/domain/attachments.ts'), { configFile: false, logLevel: 'silent' });
        const theme = await import('../src/domain/theme.ts');
        let vars = 0;
        for (const { id } of theme.SHIPPED_THEMES) {
            const worn = [[], ...attachments.SHIPPED_ATTACHMENTS.filter((a) => a.themeId === id && a.slot === 'mood').map((a) => [a])];
            for (const set of worn) {
                for (const [name, value] of Object.entries(theme.themeVars(attachments.withMood(theme.decodeTheme(id), set)))) {
                    vars += 1;
                    assert.ok(!/(?<![\w-])(?:currentcolor|inherit|revert|revert-layer|unset|light-dark)(?![\w-])/i.test(value), `${id} ${name}: ${value}`);
                }
            }
        }
        assert.ok(vars >= 200, `${vars} theme variables read`);
    });
});

describe('a-rule-runs-only-the-keyframes-its-own-sheet-declares', () => {
    /**
     * The fifth review's B3. `@keyframes` names are global, and stall.css
     * ships keyframes of its own: `animation: pin-demo-land 1s 120s reverse
     * forwards` on a quote's `.item-a` runs a base keyframe that holds
     * `visibility: hidden` from 0 to 44% (the critic's PT, reopened);
     * `animation: sel-bump 1s infinite` on a money node scales it by 1.18,
     * which the size lint refuses in a look's own keyframes and never reads in
     * a base sheet's; `animation-name: var(--an)` does the same. So in a
     * first-party sheet each rule's `animation` and `animation-name` name
     * `none` or a keyframe the same sheet declares, and never through a
     * `var()`. Red: `animationNameProblems` out of `lintLook` (every refusal
     * below fails, and the plants `f4:0` to `f4:4`, `f4:6`).
     */
    const FOREIGN = /a rule of a look sheet runs only a keyframe its own sheet declares/;
    const refusedName = (rule) => {
        const problems = lintLookSheet(plantedNeo(rule), { lookClass: 't-neo' });
        assert.ok(problems.some((p) => FOREIGN.test(p)), `${rule}:\n  ${problems.join('\n  ') || '(no problem)'}`);
    };

    it('refuses the critic\'s plants: the base sheet\'s hide, fade, scale and roam by name, and a name through a var() (f4)', () => {
        refusedName('.t-neo .item-a { animation: pin-demo-land 1s 120s reverse forwards; }');
        refusedName('.t-neo .item-a { animation-name: pin-demo-land; animation-duration: 1s; animation-delay: 120s; animation-direction: reverse; animation-fill-mode: forwards; }');
        refusedName('.t-neo .item-x { animation: sel-fade 1s 120s reverse forwards; }');
        refusedName('.t-neo .item-x { animation: sel-bump 1s 120s infinite; }');
        refusedName('.t-neo .item-x { animation: att-beetle-roam 24s 120s infinite; }');
        refusedName('.t-neo .item-a { --an: pin-demo-land; animation-name: var(--an); animation-duration: 1s; animation-delay: 120s; animation-direction: reverse; animation-fill-mode: forwards; }');
    });

    it('refuses a name this sheet does not declare in every spelling: quoted, one of several, in a media block, on a pseudo-element, prefixed, in another case, behind a var(), or taken from the parent', () => {
        for (const decl of [
            'animation: pin-demo-land 1s',
            'animation: 1s 120s reverse forwards pin-demo-land',
            'animation: "pin-demo-land" 1s',
            "animation: 'pin-demo-land' 1s",
            'animation: t-neo-cur 1s, pin-demo-land 1s',
            'animation: pin-demo-land 1s, t-neo-cur 1s',
            'animation-name: sel-bump',
            'animation-name: t-neo-cur, sel-bump',
            'animation-name: "sel-bump"',
            'animation: T-NEO-CUR 1s',
            'animation: t-neo-cu 1s',
            'animation: ease 1s ease',
            'animation: var(--a)',
            'animation: t-neo-cur var(--d)',
            'animation: t-neo-cur 1s var(--e)',
            'animation-name: var(--an)',
            'animation-name: t-neo-cur, var(--an)',
            'animation: inherit',
            'animation: revert',
            'animation: revert-layer',
            'animation-name: inherit',
            'animation-name: revert-layer',
            '-webkit-animation: pin-demo-land 1s; animation: pin-demo-land 1s',
            'ANIMATION: pin-demo-land 1s',
        ]) {
            refusedName(`.t-neo .item-a { ${decl}; }`);
            refusedName(`@media (min-width: 680px) { .t-neo .item-a { ${decl}; } }`);
            refusedName(`.t-neo .item-a::after { content: ''; ${decl}; }`);
        }
    });

    it('takes none, initial and unset, a name with no keyframe to run, the sheet\'s own keyframes (a media block\'s too) and a longhand that names none', () => {
        for (const decl of [
            'animation: none',
            'animation: initial',
            'animation: unset',
            'animation: 1s linear infinite',
            'animation-name: none',
            'animation-name: NONE',
            'animation-name: initial',
            'animation-name: unset',
            'animation-duration: 3s; animation-delay: 1s; animation-fill-mode: forwards',
            'animation: t-neo-cur 1s infinite',
            'animation: 1s infinite t-neo-astep',
            'animation: t-neo-cur 1s, t-neo-astep 2s',
            'animation-name: t-neo-cur, t-neo-astep',
        ]) {
            accepts(`.t-neo .item-a { ${decl}; }`);
        }
        // A background that moves, no ink and no ground: an inherited ink in a keyframe is the ink belt's (`a-keyframe-never-sets-an-inherited-ink`), a ground or a shadow the ground belt's (`a-keyframe-never-sets-a-ground-or-a-shadow`).
        accepts('@keyframes t-neo-here { to { background-position: 100% 0; } }\n.t-neo .item-a { animation: t-neo-here 1s; }');
        accepts('@keyframes t-neo-here { to { background-position: 100% 0; } }\n@media (min-width: 680px) { .t-neo .item-a { animation: t-neo-here 1s; } }');
    });

    it('counts only a top-level keyframe as the sheet\'s own, and refuses one inside a media block, quoted or not, or with no block (the sixth review\'s M2)', () => {
        // Inside a media block a keyframe applies only while the condition does; below it a base sheet's keyframe of the name runs.
        const NESTED = /stands inside another at-rule/;
        for (const rule of [
            '@media (min-width: 680px) { @keyframes t-neo-here { to { color: red; } } }\n.t-neo .item-a { animation: t-neo-here 1s; }',
            '@media (min-width: 680px) { @keyframes "sel-bump" { 0% { transform: scale(1); } 50% { transform: scale(1.18); } } }\n.t-neo .item-x { animation: sel-bump 1s infinite; }',
            '@media (min-width: 680px) { @keyframes "pin-demo-land" { 0% { visibility: hidden; } 100% { visibility: visible; } } }\n.t-neo .item-a { animation: pin-demo-land 1s 120s reverse forwards; }',
            "@media (min-width: 680px) { @keyframes 't-neo-here' { to { color: red; } } }",
        ]) {
            const problems = lintLookSheet(plantedNeo(rule), { lookClass: 't-neo' });
            assert.ok(problems.some((p) => NESTED.test(p)), `${rule}:\n  ${problems.join('\n  ') || '(no problem)'}`);
        }
        // The rule that runs a keyframe declared only inside a media block runs a name the sheet does not declare.
        refusedName('@media (min-width: 680px) { @keyframes t-neo-here { to { color: red; } } }\n.t-neo .item-a { animation: t-neo-here 1s; }');
        // A statement is no keyframes at all: a browser drops it, and the base sheet's keyframe of the name is the one that runs.
        refusedName('@keyframes pin-demo-land;\n.t-neo .item-a { animation: pin-demo-land 1s 120s reverse forwards; }');
        // A top-level keyframe stands, quoted or not, and the rule that runs it is the sheet's own.
        accepts('@keyframes "t-neo-here" { to { background-position: 100% 0; } }\n.t-neo .item-a { animation: t-neo-here 1s; }');
        accepts("@keyframes 't-neo-here' { to { background-position: 100% 0; } }\n.t-neo .item-a { animation: t-neo-here 1s; }");
        // The kit keeps its own reading: its keyframes are `wk-…` and the README states the rest.
        const kit = lintSheet(plantedKit('@media (min-width: 680px) { @keyframes wk-here { to { color: red; } } }'));
        assert.ok(!kit.some((p) => NESTED.test(p)), kit.join('\n'));
    });

    it('is first party only and leaves a state rule to the belt', () => {
        const kit = lintSheet(plantedKit('.t-neo .item-a { animation: pin-demo-land 1s; animation-name: var(--an); }'));
        assert.ok(!kit.some((p) => FOREIGN.test(p)), kit.join('\n'));
        const hover = lintLookSheet(plantedNeo('.t-neo .item:hover .item-a { animation: pin-demo-land 1s; }'), { lookClass: 't-neo' });
        assert.ok(hover.length > 0 && !hover.some((p) => FOREIGN.test(p)), hover.join('\n'));
    });

    it('costs nothing: every shipped look, the fixtures, the canary and every starter run only their own keyframes', () => {
        // Every keyframe a sheet declares, at any depth; `nested` lists the ones inside an at-rule (the sixth review: none does).
        const nested = [];
        const keyframesOf = (css) => {
            const names = new Set();
            const walk = (nodes, depth) => {
                for (const node of nodes) {
                    if (node.kind === 'rule') continue;
                    if (node.name === 'keyframes') {
                        names.add(node.prelude.replace(/^@keyframes\s*/i, '').trim());
                        if (depth > 0) nested.push(node.prelude);
                    } else if (node.children !== undefined) walk(node.children, depth + 1);
                }
            };
            walk(parseSheet(css).nodes, 0);
            return names;
        };
        const sheets = [...FIRST_PARTY_SHEETS];
        for (const cls of ['t-modern', 't-neo', 't-rural']) {
            sheets.push({ name: `starter ${cls}`, css: rescopeSheet(read(LOOKS.find((sheet) => sheet.lookClass === cls).path), cls.slice(2), carried) });
        }
        let named = 0;
        let declared = 0;
        for (const { name, css } of sheets) {
            const own = keyframesOf(css);
            declared += own.size;
            for (const { prop, value } of declarationsIn(css)) {
                if (prop !== 'animation' && prop !== 'animation-name') continue;
                for (const token of value.split(/[\s,]+/)) {
                    if (own.has(token)) named += 1;
                }
                assert.ok(!/var\(/.test(value), `${name}: ${prop}: ${value}`);
            }
        }
        // Neo declares three, Rural two, Modern two, and the starters re-name each `wk-…`: the walk sees them run.
        assert.ok(declared >= 7 + 7 && named >= 8, `${declared} keyframes declared, ${named} names run`);
        assert.deepEqual(nested, [], 'no first-party sheet, a starter included, declares a keyframe inside an at-rule');
        // The starters run only the keyframes they declare, renamed.
        for (const cls of ['t-modern', 't-neo', 't-rural']) {
            const starter = rescopeSheet(read(LOOKS.find((sheet) => sheet.lookClass === cls).path), cls.slice(2), carried);
            assert.ok([...keyframesOf(starter)].every((name) => name.startsWith('wk-')), cls);
            assert.deepEqual(lintLookSheet(starter, { lookClass: 't-workshop' }).filter((p) => FOREIGN.test(p)), [], `${cls} starter`);
        }
    });
});

describe('the-os-colour-scheme-is-not-a-looks-to-paint', () => {
    /**
     * The fifth review's ranked item 3 (older than this branch).
     * `color-scheme: light dark` with `light-dark(#000, transparent)` leaves a
     * figure invisible in a dark scheme, and system colours (`Canvas`,
     * `CanvasText`) flip the same way; the probe paints one scheme only. So
     * in a first-party sheet `light-dark()` is not written, and `color-scheme`
     * is `normal` or `light`. Red: the two blocks out of
     * `declarationProblems` (every refusal below fails, and the plants `f6:0`
     * and `f6:1`).
     */
    const SCHEME = /light-dark\(\) paints one colour in a light colour scheme|color-scheme other than normal or light/;
    const refusedScheme = (rule) => {
        const problems = lintLookSheet(plantedNeo(rule), { lookClass: 't-neo' });
        assert.ok(problems.some((p) => SCHEME.test(p)), `${rule}:\n  ${problems.join('\n  ') || '(no problem)'}`);
    };

    it('refuses light-dark() anywhere in a value and a color-scheme other than normal or light', () => {
        refusedScheme('.t-neo { color-scheme: light dark; }\n.t-neo .item-x { color: light-dark(#ffffff, transparent); }');
        for (const decl of [
            'color: light-dark(#fff, #000)',
            'color: LIGHT-DARK(#fff, #000)',
            'background: light-dark(red, blue)',
            'border-color: light-dark(red, blue)',
            'box-shadow: 0 0 4px light-dark(red, blue)',
            '--x: light-dark(red, blue)',
            'color: light-dark (red, blue)',
            'color-scheme: dark',
            'color-scheme: light dark',
            'color-scheme: dark light',
            'color-scheme: only light',
            'color-scheme: light only',
            'color-scheme: only dark',
            'color-scheme: inherit',
            'color-scheme: unset',
            'color-scheme: revert',
            'color-scheme: var(--s)',
            'COLOR-SCHEME: dark',
        ]) {
            refusedScheme(`.t-neo .item-x { ${decl}; }`);
            refusedScheme(`@media (min-width: 680px) { .t-neo .item-x { ${decl}; } }`);
            refusedScheme(`@keyframes t-neo-sc { to { ${decl}; } }`);
        }
    });

    it('takes normal, light and initial, and a string that spells the function', () => {
        for (const decl of ['color-scheme: normal', 'color-scheme: light', 'color-scheme: LIGHT', 'color-scheme: initial']) accepts(`.t-neo { ${decl}; }`);
        accepts(".t-neo .item-p::before { content: ''; color: red; }");
        accepts(".t-neo .item-p { --x: 'light-dark(red, blue)'; }");
    });

    it('is first party only, and costs nothing: no first-party sheet writes either, and no base sheet of the app sets a scheme', () => {
        const kit = lintSheet(plantedKit('.t-neo { color-scheme: light dark; }\n.t-neo .item-x { color: light-dark(#fff, #000); }'));
        assert.ok(!kit.some((p) => SCHEME.test(p)), kit.join('\n'));
        for (const { name, css } of FIRST_PARTY_SHEETS) {
            assert.deepEqual(declarationsIn(css).filter((d) => d.prop === 'color-scheme' || /light-dark\s*\(/i.test(d.value)), [], name);
        }
        // The base and screen sheets the app loads set no scheme either, so a look cannot meet one it did not choose (the documents `/404` and `/stream` are pages of their own).
        for (const row of SERVED.filter((r) => ['base', 'screen'].includes(r.role))) {
            assert.deepEqual(declarationsIn(row.css).filter((d) => d.prop === 'color-scheme' || /light-dark\s*\(/i.test(d.value)), [], row.path);
        }
    });
});

describe('a-partly-painted-attribute-is-a-state-except-for-the-values-painted', () => {
    /**
     * The fifth review's ranked item 1. `data-format` is the poster sheet's
     * format: the fixtures paint `tag` and none of `square`, `story` and
     * `stream`; `data-code='false'` is the shop window sheet with its pay code
     * off, and no fixture sets `paycode=off`. A rule under a value no screen
     * paints is read by no pass, so the belt treats it as a state
     * (`STATE_EXCEPT_PAINTED`): a selector on the name that is not an exact
     * match on a painted value fails closed. `layout/stateAttributes.test.ts`
     * holds each painted value to a screen. Red: `STATE_EXCEPT_PAINTED` emptied
     * (the four states, the fail-closed forms and the plants `g1` fail).
     */
    const stateRule = (selector, decl) => lintLookSheet(plantedNeo(`.t-neo ${selector} { ${decl}; }`), { lookClass: 't-neo' });

    it('pins the list by value', () => {
        assert.deepEqual(JSON.parse(JSON.stringify(STATE_EXCEPT_PAINTED)), { 'data-code': [], 'data-format': ['tag'] });
        // Every value it leaves a look to match is a value STATE_ATTRIBUTES lists.
        for (const [name, painted] of Object.entries(STATE_EXCEPT_PAINTED)) {
            for (const value of painted) assert.ok(STATE_ATTRIBUTES[name].includes(value), `${name}=${value}`);
        }
    });

    it('makes the unpainted formats and the pay code off states: a rule under one sets only what a state may', () => {
        for (const selector of [".stall-sub[data-format='square']", ".stall-sub[data-format='story']", ".stall-sub[data-format='stream']", ".stall-sub[data-code='false']", ".item-x:has([data-code='false'])", ":is([data-format='stream'], .item-n)"]) {
            assert.equal(namesAState(selector), true, selector);
            const problems = stateRule(selector, 'width: 10px');
            assert.ok(problems.some((p) => /is not a property a state rule may set/.test(p)), `${selector}:\n  ${problems.join('\n  ')}`);
            assert.deepEqual(stateRule(selector, 'color: #ffffff'), [], selector);
        }
    });

    it('reads a painted value under :not() as a state: it matches every format but the painted one (the sixth review\'s P3)', () => {
        for (const selector of [
            ".stall-sub:not([data-format='tag'])",
            ":not([data-format='tag']) > .stall-sub",
            ".stall-sub:not(:not([data-format='tag']))",
            ".stall-sub:not(.x, [data-code='false'])",
            ".stall-sub:is(:not([data-format='tag']))",
            ".stall-sub:has(:not([data-format='tag']))",
            ".stall-sub:not( [data-format = 'tag' ] )",
            ".stall-sub:not([data-format='tag']):hover",
        ]) {
            assert.equal(namesAState(selector), true, selector);
        }
        const problems = stateRule(".stall-sub:not([data-format='tag'])", 'width: 10px');
        assert.ok(problems.some((p) => /is not a property a state rule may set/.test(p)), problems.join('\n'));
        assert.deepEqual(stateRule(".stall-sub:not([data-format='tag'])", 'color: #ffffff'), []);
        // A positive match stays a rule at rest, inside :is() and :has() too, and a negation of something else is no state.
        for (const selector of [".stall-sub:is([data-format='tag'])", ".stall-sub:has([data-format='tag'])", ".stall-sub:not(.x)[data-format='tag']", ".stall-sub:not([data-copied='true'])", ".stall-sub:not([data-tier='2'])"]) {
            assert.equal(namesAState(selector), false, selector);
        }
    });

    it('leaves the format that is painted a rule at rest, and fails closed on every other form of either name', () => {
        assert.equal(namesAState("[data-format='tag']"), false);
        assert.equal(namesAState('[data-format=tag]'), false);
        assert.deepEqual(stateRule(".stall-sub[data-format='tag']", 'width: 10px'), []);
        for (const selector of ['[data-format]', '[data-code]', "[data-format='tag' i]", "[data-format*='tag']", "[data-format~='tag']", "[data-format|='tag']", "[data-format^='t']", "[data-format='Tag']", "[data-FORMAT='story']", '[data-format="story"]', '[ data-format = story ]', "[data-code='true']"]) {
            assert.equal(namesAState(selector), true, selector);
        }
        // The other attributes the fixtures paint are not states: the list is these two names and the six before them.
        for (const selector of ["[data-copied='true']", "[data-copied='shown']", "[data-tier='2']", "[data-price-tier='3']", "[data-mode='browse']", "[aria-pressed='true']"]) {
            assert.equal(namesAState(selector), false, selector);
        }
    });

    it('costs nothing: no sheet a run serves, a starter or the canary names either attribute', () => {
        for (const { name, css } of FIRST_PARTY_SHEETS) {
            assert.equal(sheetNamesAttribute(css, 'data-format'), false, name);
            assert.equal(sheetNamesAttribute(css, 'data-code'), false, name);
        }
    });
});

describe('a-sheet-names-an-attribute-for-the-contrast-plan', () => {
    /**
     * The fifth review's ranked item 4: the contrast plan samples the staged
     * address screens for each measured look whose sheet names `[data-copied]`.
     * The page derives the list from the stylesheets it loaded
     * (`layout/sheetNaming.ts`) and the runner from the served text with this
     * reader, and fails a run whose two differ. This holds the reader.
     */
    it('finds the attribute in any selector, form, case and nesting, and nowhere else', () => {
        for (const css of [
            ".t-x .addr[data-copied='true'] { color: red; }",
            '.t-x .addr[data-copied] { color: red; }',
            '.t-x .addr[DATA-COPIED=shown] { color: red; }',
            '@media (min-width: 680px) { .t-x .a, .t-x .addr[data-copied="true"] { color: red; } }',
            '.t-x .sign:has(.addr[data-copied]) { color: red; }',
            '.t-x .sign:not([data-copied="true"]) { color: red; }',
            '.t-x .addr[data\\-copied] { color: red; }',
        ]) {
            assert.equal(sheetNamesAttribute(css, 'data-copied'), true, css);
        }
        for (const css of [
            '.t-x .addr { color: red; }',
            ".t-x .addr[data-copied-not='1'] { color: red; }",
            ".t-x .addr[data-code='false'] { color: red; }",
            ".t-x .addr { --x: '[data-copied]'; }",
            '@keyframes t-x-a { to { color: red; } }',
            '',
        ]) {
            assert.equal(sheetNamesAttribute(css, 'data-copied'), false, css);
        }
    });

    it('finds no shipped look, no fixture and no starter naming it, and the rule it plants in Neo', () => {
        // The public tree names it nowhere: the shipped looks, the harness's fixture look, the tracked private fixture and the canary.
        // A run that selects the private look at 0x04 reads that look's sheet too, which names it, and that sheet is no test's to state.
        const publicSheets = FIRST_PARTY_SHEETS.filter(({ name }) => name.startsWith('look:') || name.startsWith('fixture:') || name === 'canary' || name.includes('layout/fixture-private-looks/'));
        assert.ok(publicSheets.length >= 6, `${publicSheets.length} public first-party sheets read`);
        for (const { name, css } of publicSheets) assert.equal(sheetNamesAttribute(css, 'data-copied'), false, name);
        assert.equal(sheetNamesAttribute(plantedNeo(".t-neo .addr[data-copied='true'] { --x: 4px; }"), 'data-copied'), true);
        assert.equal(sheetNamesAttribute(NEO_CSS, 'data-copied'), false);
    });
});

describe('a-private-look-palette-role-is-opaque-by-construction', () => {
    /**
     * `STATE_OPAQUE_ROLES` are the colours `themeVars` writes as `rgb(r, g,
     * b)`. The shipped looks and moods are proved opaque by
     * `the-state-opaque-roles-are-the-opaque-colours-the-theme-table-emits`; a
     * private look's palette comes from a `look.json`, which `lookFromData`
     * reads as RGB triples of whole numbers 0 to 255 and builds into the same
     * `Rgb` values `rgbCss` prints. This proves it over the tracked private
     * fixture (D-2026-10-20-08's P3 (9)): the fixture's own look and mood,
     * the same look with every role the file may move set to an extreme, and
     * every shape of colour the file may not carry refused.
     */
    const ROLES = ['--s-bg', '--s-surface', '--s-text', '--s-shade', '--s-muted', '--s-accent', '--s-danger', '--s-accent-2'];
    const OPAQUE = /^rgb\(\d{1,3}, \d{1,3}, \d{1,3}\)$/;
    const FIXTURE = 'layout/fixture-private-looks/fixture/look.json';
    const PLACE = { id: 0x04, sheetClass: 't-fixture-private', file: 'layout/fixture-private-looks/fixture/look.json', mintable: true };

    it('builds every role as rgb(r, g, b) from whole-number triples, under the look and under its mood', async () => {
        const { runnerImport } = await import('vite');
        const { module: lookData } = await runnerImport(join(ROOT, 'src/domain/lookData.ts'), { configFile: false, logLevel: 'silent' });
        const { module: attachments } = await runnerImport(join(ROOT, 'src/domain/attachments.ts'), { configFile: false, logLevel: 'silent' });
        const theme = await import('../src/domain/theme.ts');
        const fixture = JSON.parse(read(FIXTURE));
        const keys = [...lookData.PALETTE_KEYS];
        assert.deepEqual(keys.sort(), ['accent', 'accentTwo', 'bg', 'muted', 'shade', 'surface', 'text']);
        const readsOpaque = (look, what) => {
            const moods = look.rows.filter((row) => row.slot === 'mood');
            const worn = [[], ...moods.map((mood) => [mood])];
            for (const set of worn) {
                const vars = theme.themeVars(attachments.withMood(look.theme, set));
                for (const role of ROLES) assert.match(vars[role], OPAQUE, `${what} ${set.length === 0 ? 'bare' : 'under its mood'}: ${role}`);
            }
            return moods.length;
        };
        // The fixture as it is tracked: a palette of one role, and a mood that moves one.
        assert.equal(readsOpaque(lookData.lookFromData(fixture, PLACE), 'the fixture'), 1);
        // Every role the file may move, at the extremes, in the look and in a mood.
        for (const triple of [[0, 0, 0], [255, 255, 255], [0, 255, 0], [128, 7, 249]]) {
            const palette = Object.fromEntries(keys.map((key) => [key, triple]));
            const look = { ...fixture, palette, moods: fixture.moods.map((mood) => ({ ...mood, palette })) };
            assert.equal(readsOpaque(lookData.lookFromData(look, PLACE), `every role at ${triple}`), 1);
        }
    });

    it('refuses every colour that is not three whole numbers 0 to 255: an alpha, a fraction, a string, a function, a variable', async () => {
        const { runnerImport } = await import('vite');
        const { module: lookData } = await runnerImport(join(ROOT, 'src/domain/lookData.ts'), { configFile: false, logLevel: 'silent' });
        const fixture = JSON.parse(read(FIXTURE));
        for (const bad of [
            [0, 0, 0, 0],
            [0, 0, 0, 1],
            [0, 0, 0.5],
            [1.5, 0, 0],
            [-1, 0, 0],
            [256, 0, 0],
            [0, 0],
            ['0', '0', '0'],
            ['rgb(0 0 0 / 0)'],
            'rgb(0 0 0 / 0)',
            '#00000000',
            'transparent',
            'var(--s-text)',
            null,
            { r: 0, g: 0, b: 0, a: 0 },
            [Number.NaN, 0, 0],
            [1e400, 0, 0],
        ]) {
            for (const place of ['palette', 'mood']) {
                const look =
                    place === 'palette'
                        ? { ...fixture, palette: { bg: bad } }
                        : { ...fixture, moods: fixture.moods.map((mood) => ({ ...mood, palette: { bg: bad } })) };
                assert.throws(() => lookData.lookFromData(look, PLACE), /must be three whole numbers 0–255/, `${JSON.stringify(bad)} in the ${place}`);
            }
        }
        // And a role the file may not move: the danger ink is the base row's.
        assert.throws(() => lookData.lookFromData({ ...fixture, palette: { danger: [0, 0, 0] } }, PLACE), /danger/);
    });
});

describe('the-lint-belts-critics-plants-are-pinned', () => {
    /**
     * Every rule the lint-belts critic planted on a copy of Neo (the three
     * rounds' plant files `p1`–`p10`, `q1`–`q7`, and the third review's
     * `n1`–`n9`, `$C` for the look's class), and the window's (`w1`: the
     * pseudo-element the probe measures only at rest, given a ground by a
     * state; `w2`: the keyframe, the glyph, the shadow and the cursor of this
     * round), each with its outcome under the allow-list pinned: `refused` and
     * by which kind of sentence (`by`), or `accepted` and why that is not a
     * figure hidden, or the gap it is (the reason says which). A plant whose
     * outcome moves turns this red, so a relaxation of a reader, or a hole it
     * closed, is a decision.
     */
    const WAYS = [
        // The fourth review's sentences end in a reach or a ring and embed the colour readers' own, so they are told first.
        ['paint-reach', /it reaches past its box, where a state that changes the ink of its box shows it/],
        ['outline-cap', /an outline's ring reaches over the boxes beside its box/],
        // The fifth review's four: a line or a stroke past its box, a custom property holding the ink, a keyframe from another sheet, the OS colour scheme.
        ['ink-reach', /is drawn in the ink of its box and reaches past it/],
        ['custom-property:ink', /a custom property that holds (?:currentcolor|inherit|revert|unset)/],
        // The sixth review's: a blur past its cap, a keyframe inside an at-rule.
        ['blur-cap', /a blur\(\) spreads the box's paint, its ink included, past the box/],
        ['keyframe:nested', /stands inside another at-rule/],
        ['keyframe:foreign', /a rule of a look sheet runs only a keyframe its own sheet declares/],
        ['colour-scheme', /light-dark\(\) paints one colour in a light colour scheme|color-scheme other than normal or light/],
        ['keyframe:all', /all in a keyframe re-states every property/],
        ['state:custom-property', /a custom property set under a state/],
        ['state:property', /is not a property a state rule may set/],
        ['state:transform', /a state sets the no-transform values only|a value this lint cannot take apart may move, turn or scale the box/],
        ['state:ink', /an ink under alpha 1|is not an ink this lint reads|not a palette role proved opaque|a mix of an ink|a var\(\) with a fallback, or inside another value|hands the ink to whatever the parent paints/],
        ['state:edge', /inherit takes the colour the parent paints|is currentcolor on an edge or a shadow|currentcolor is the ink of the box|a border colour is one to four colours/],
        ['state:shadow', /box-shadow this lint cannot size|an outer shadow with a spread|a shadow blur past|more than 2 outer shadow layers|a shadow layer that names no colour/],
        ['state:background', /a state's background is a colour or a gradient|is not a part of a background|a background-image layer|currentcolor as a ground|in a state's background|a var\(\) here is read only as var|inherit takes the background|is not a colour this lint reads/],
        ['cursor', /a cursor that is not a keyword/],
        ['keyframe:display', /in a keyframe takes a box/],
        [
            'pseudo:host-paint',
            /takes its paint from its host|names no colour, and is drawn in currentColor|prints text and states no colour of its own|is its host's ink, which a state may change|reads a custom property that is not a palette role|all re-states every property from the host's or the initial value|names a side by the writing mode/,
        ],
        ['size:transition', /which may be a money node — the wall fits its figure by its size/],
        ['size:keyframe', /animates .* — any box a rule runs it on, a money node among them/],
        ['keyframe:custom-property', /a custom property in a keyframe/],
        // The ink belt beside the probe's keyframe-offset read (before 8g2, the critic's third review, item 1; D-2026-10-26-03).
        ['keyframe:ink', /in a keyframe is inherited: it changes how the text of every box below/],
        // The ground belt beside the probe's keyframe-offset ground read (before 8g2, the fourth review's item 2, PG; D-2026-10-26-04 (a)).
        ['keyframe:ground', /a ground or a shadow in a keyframe lays a ground under every box inside the one that runs it/],
        // SVG paint off a drawn icon (before 8g2, the fourth review's item 4, PFQ; D-2026-10-26-04 (b)).
        ['svg-paint', /SVG paint stands only on a drawn icon/],
        ['role-redeclared', /palette role the theme table writes on the stall/],
        ['tap-highlight', /a tap highlight paints a colour/],
        ['file-mask', /a file's mask or clip in a/],
        ['selector', /an attribute selector this lint does not read|a partial match|is not one of the state attributes/],
        ['pseudo-element', /restyles part of a line of text|is a list marker|is not ::before or ::after, the only pseudo-elements/],
        ['important', /!important outranks/],
        ['nested', /holds a nested rule/],
        ['at-rule', /is not a condition the probe enters|is not allowed in a look sheet/],
        ['escape', /a CSS escape outside a string/],
        // A prefixed property whose name less the prefix is no property (before 8g2, the fifth review's PQM: `mask-box-image` stood as `-webkit-mask-box-image`'s twin).
        ['twin:none', /names no property Chrome reads, and .* has no unprefixed twin there/],
        ['twin', /a prefixed property paints only in the engines/],
        // Anchor positioning (before 8g2, the seventh review's B1, PAN; D-2026-10-27-01).
        ['anchor', /— anchor positioning: a box placed against an anchor follows/],
        ['other', /./],
    ];
    const waysOf = (problems) => [...new Set(problems.map((p) => WAYS.find(([, re]) => re.test(p))[0]))].sort();

    it('holds the critic\'s forty-three plant files, 857 plants, the window\'s thirteen, the builder\'s 108, 158, 40 (`h1`, the sixth round), 22 (`i1`, the ink belt), 16 (`j1`, the ground belt), 20 (`k1`, the SVG paint belt), 9 (`l1`, a twin that exists) and 34 (`a1`, anchor positioning) and the selected check\'s 24, with an outcome each', () => {
        assert.deepEqual(Object.keys(PLANTS), [
            'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8', 'n9', 'w1', 'w2',
            'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'b1', 'c1', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'g1', 'h1', 'i1', 'j1', 'k1', 'l1', 'a1',
        ]);
        assert.equal(Object.values(PLANTS).flat().length, 1301);
        // `a1`: anchor positioning (the seventh review's B1): thirty refused, PAN's sheet first, and four controls. It moved no older plant.
        assert.equal(PLANTS.a1.length, 34);
        assert.equal(PLANTS.a1.filter((entry) => entry.expect === 'accepted').length, 4);
        assert.match(PLANTS.a1[0].rule, /anchor-name: --\$C-pan; animation: \$C-pan 100s linear infinite;/);
        assert.match(PLANTS.a1[0].rule, /translate: -600px 0;/);
        // `l1`: a prefixed property's twin is a property that exists (five refused, PQM's shape first, and four accepted: the mask border's standard twin, a logical twin,
        // a prefixed property Chrome does not list, and the stated gap of a `-moz-` property's twin).
        assert.equal(PLANTS.l1.length, 9);
        assert.equal(PLANTS.l1.filter((entry) => entry.expect === 'accepted').length, 4);
        assert.match(PLANTS.l1[0].rule, /mask-box-image: linear-gradient\(#0000, #0000\) 1; -webkit-mask-box-image:/);
        // It moved three older plants, each refused before for its twin as well as for its host's paint, and for its host's paint alone now: `f1:11`, `-webkit-border-before`
        // beside `border-block-start` (the rule asked for `border-before`, which nothing reads), and `f1:33` and `f1:34`, the mask border and its source beside
        // `mask-border` and `mask-border-source` (it asked for `mask-box-image` and `mask-box-image-source`).
        for (const i of [11, 33, 34]) assert.deepEqual(PLANTS.f1[i].by, ['pseudo:host-paint']);
        // `i1`: an inherited ink, shadow or mark in a keyframe (eighteen refused, PT2's shape first, and four controls). The belt moved five older plants with it: `g1:130`, the
        // sheet's own keyframe setting `color` on a quote's `.item-a`, accepted until it, and `f2:18`, `g1:131`, `g1:139` and `h1:9`, each refused by the belt as well.
        // The ground belt (`j1`, the fourth review's PG) moved three: `i1:21`, the ink belt's control, a keyframe `background-color` on `.item-a`, accepted until it, and
        // `b1:78` and `f2:19`, a keyframe box shadow refused by the paint reach before and by the ground belt as well.
        assert.equal(PLANTS.i1.length, 22);
        assert.equal(PLANTS.i1.filter((entry) => entry.expect === 'accepted').length, 3);
        assert.deepEqual(PLANTS.i1[21].by, ['keyframe:ground']);
        assert.deepEqual(PLANTS.b1[78].by, ['keyframe:ground', 'paint-reach']);
        assert.deepEqual(PLANTS.f2[19].by, ['keyframe:ground', 'paint-reach']);
        // `j1`: a ground or a shadow in a keyframe (thirteen refused, PG's shape first, and three controls: a background that moves or grows, and a ground at rest).
        assert.equal(PLANTS.j1.length, 16);
        assert.equal(PLANTS.j1.filter((entry) => entry.expect === 'accepted').length, 3);
        assert.match(PLANTS.j1[0].rule, /^@keyframes \$C-ground \{ 0% \{ background-color: transparent; \} 25%, 68% \{ background-color: var\(--s-text\); \}/);
        // `k1`: SVG paint off a drawn icon (fourteen refused, PFQ's shape first, and six controls in the shape the shipped looks write). The belt moved sixteen older plants:
        // `g1:39`–`g1:52` and `f2:5` set a stroke on `.item-caret`, a drawn icon whose rule does not name `.ic` (five of them the stroke cap's controls, accepted until it), and
        // `f1:35` a fill and a stroke on a pseudo-element, accepted until it.
        assert.equal(PLANTS.k1.length, 20);
        assert.equal(PLANTS.k1.filter((entry) => entry.expect === 'accepted').length, 6);
        assert.equal(PLANTS.k1[0].rule, '.$C .qr path { fill: #fff; }');
        for (const i of [39, 40, 41, 42, 50]) assert.deepEqual(PLANTS.g1[i].by, ['svg-paint']);
        for (const i of [43, 44, 45, 46, 47, 48, 49, 51, 52]) assert.deepEqual(PLANTS.g1[i].by, ['ink-reach', 'svg-paint']);
        assert.deepEqual(PLANTS.f2[5].by, ['ink-reach', 'svg-paint']);
        assert.deepEqual(PLANTS.f1[35].by, ['svg-paint']);
        assert.match(PLANTS.i1[0].rule, /^@keyframes \$C-ink \{ 25%, 68% \{ color: transparent; \} \}/);
        assert.deepEqual(PLANTS.g1[130].by, ['keyframe:ink']);
        // The sixth review's round: `h1`, the shorthand's thickness through a math function (M1), a keyframe inside an at-rule or a statement (M2), a negated painted value, a blur past its cap and `unset` on a custom property.
        assert.equal(PLANTS.h1.length, 40);
        // The fifth review's eight plant files (`f1`–`f8`: per-side colours, past the box, the outline cap, keyframes, the mask reader, the colour scheme and a custom property, the states, the underline) and the builder's own (`g1`).
        assert.deepEqual(
            ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'g1'].map((set) => PLANTS[set].length),
            [36, 33, 25, 10, 26, 5, 15, 3, 158],
        );
        // The fourth review's nine plant files (`m1`–`m9`, 224 plants, the control among them) and the builder's own (`b1`).
        assert.deepEqual(
            ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'b1'].map((set) => PLANTS[set].length),
            [48, 45, 11, 6, 40, 25, 27, 9, 13, 108],
        );
        // c1: the window's selected check after the fourth fix round, a var() in a mask where it is a length (eight accepted) and where it is a colour or the picture (sixteen refused:
        // the fifteen, and `c1:8`, the custom property that held 'currentColor', which the fifth review's B2 refuses where it is declared).
        assert.equal(PLANTS.c1.length, 24);
        assert.equal(PLANTS.c1.filter((entry) => entry.expect === 'accepted').length, 8);
        assert.equal(PLANTS.c1[8].expect, 'refused');
        assert.deepEqual(PLANTS.c1[8].by, ['custom-property:ink']);
        // `c1:5` and `c1:7` stay accepted, now for the reason that is true: a var() as a place may carry a stop, but no custom property holds the ink.
        for (const i of [5, 7]) {
            assert.equal(PLANTS.c1[i].expect, 'accepted');
            assert.match(PLANTS.c1[i].why, /no first-party custom property holds currentColor, inherit or revert/);
            assert.doesNotMatch(PLANTS.c1[i].why, /stated gap/);
        }
        // w1: a pseudo-element a rule at rest moved over a figure with its ground clear, given a ground under :hover.
        assert.equal(PLANTS.w1.length, 1);
        assert.match(PLANTS.w1[0].rule, /::after \{ content: ''; position: relative; left: -80px; background: transparent;/);
        assert.match(PLANTS.w1[0].rule, /:hover \.item-p::after \{ background: #000;/);
        assert.deepEqual(PLANTS.w1[0].by, ['state:property']);
        // w2 holds the owner's T2c (a display in a keyframe) first.
        assert.equal(PLANTS.w2.length, 12);
        assert.match(PLANTS.w2[0].rule, /^@keyframes \$C-gone \{ 0%, 100% \{ display: none; \} \}/);
        assert.deepEqual(PLANTS.w2[0].by, ['keyframe:display']);
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

    it('accepts, of the 1,301, only the 308 whose reason is written beside them: each a control, a form that sets nothing, or a stated gap', () => {
        const accepted = Object.values(PLANTS).flat().filter((entry) => entry.expect === 'accepted');
        assert.equal(accepted.length, 308);
        assert.equal(Object.values(PLANTS).flat().length - accepted.length, 993, 'and refuses the other 993');
        // The stated gaps are the ones whose reason says so, and each is in the belt\'s docblock or the size lint\'s.
        const gaps = accepted.filter((entry) => /\(stated\)|stated gap|a stated gap|belt\'s stated gap/.test(entry.why));
        assert.ok(gaps.length >= 12, `${gaps.length} stated gaps`);
        // `w2:11`, the ring written clear and shown by a colour, was a stated gap until the at-rest cap (the fourth review): it is refused now.
        assert.equal(PLANTS.w2[11].expect, 'refused');
        assert.deepEqual(PLANTS.w2[11].by, ['outline-cap']);
        // The element road stays a stated gap: the six `m4` plants, each accepted for the same reason.
        assert.ok(PLANTS.m4.every((entry) => entry.expect === 'accepted' && /stated gap/.test(entry.why)));
    });

    it('closes the fourth review\'s roads: the five of B1, the floods of B2, the unpainted states of B3, and visibility (PT) in a keyframe', () => {
        const refusedIn = (set, indexes) => {
            for (const i of indexes) assert.equal(PLANTS[set][i].expect, 'refused', `${set}:${i} ${JSON.stringify(PLANTS[set][i].rule)}`);
        };
        // B1: (a) one coloured edge clearing the rest, (b) revert and revert-layer, (c) all, (d) a mask in currentColor, (e) a variable the host set.
        refusedIn('m3', [0, 1, 2, 3, 5, 6, 9, 10]);
        refusedIn('m2', [0, 1, 2, 3, 4, 5, 9, 10, 24, 25, 26, 44]);
        refusedIn('m9', [8, 9, 10, 11, 12]);
        // B2: the floods in no colour, in currentColor, an outline of 4000px, a border image, the cascade split, a keyframe, a drop shadow.
        refusedIn('m8', [0, 1, 2, 3, 4, 5, 6, 7, 8]);
        // B3: the states, in the critic's own selectors; the copied state stays a rule at rest.
        refusedIn('m1', [40, 42, 43]);
        assert.equal(PLANTS.m1[41].expect, 'accepted');
        // The smaller items: `:--open`, all in a keyframe.
        refusedIn('m1', [11]);
        refusedIn('m7', [15, 16]);
        refusedIn('m9', [4, 5]);
        // PT (D-2026-10-20-13 (3)): visibility in a keyframe, in every form the display refusal reads, delayed and forwards or not.
        refusedIn('m7', [7, 8]);
        const pt = PLANTS.b1.filter((entry) => /@keyframes \$C-pt/.test(entry.rule));
        assert.equal(pt.length, 6);
        assert.deepEqual(
            pt.map((entry) => entry.expect),
            ['refused', 'refused', 'refused', 'refused', 'refused', 'refused'],
        );
        assert.match(pt[0].rule, /visibility: hidden[\s\S]*animation: \$C-pt 1s 120s forwards/);
        assert.ok(PLANTS.b1.some((entry) => entry.rule === '.$C .item-a { visibility: hidden; }' && entry.expect === 'accepted'));
    });

    it('closes the roads the owner named (D-2026-10-20-10 and D-2026-10-20-11): the fold, the hidden box, the placeholder, the ring, the frame, the cursor, the stack of shadows, the display', () => {
        const refusedPlant = (set, i) => {
            const entry = PLANTS[set][i];
            assert.equal(entry.expect, 'refused', `${set}:${i} ${JSON.stringify(entry.rule)}`);
        };
        // n5: the fold, the placeholder and [hidden]; n3: the ring turned on under a state, and the border version; n4: the cursor and twenty layers; w2: display.
        for (const i of [4, 5, 6, 7, 26, 27, 28, 29]) refusedPlant('n5', i);
        for (const i of [3, 13, 14, 15, 16]) refusedPlant('n3', i);
        for (const i of [0, 1, 2, 3]) refusedPlant('n4', i);
        for (const i of [0, 1]) refusedPlant('w2', i);
        for (const i of [0, 1, 2]) refusedPlant('n7', i);
        // `border: solid` under a state.
        assert.ok(PLANTS.n3.some((entry) => entry.rule === '.$C .item:hover .item-x { border: solid; }' && entry.expect === 'refused'));
    });

    it('leaves the kit lint as main had it for every plant that is not a first-party rule: the plants add no kit problem', () => {
        for (const entry of Object.values(PLANTS).flat()) {
            let kit;
            try {
                kit = lintSheet(plantedKit(entry.rule.replaceAll('$C', 't-neo')));
            } catch {
                continue; // a rule the re-scoping cannot take (nesting): there is no kit sheet to lint
            }
            assert.ok(
                !kit.some((p) => /is not a property a state rule may set|palette role the theme table|a custom property set under a state|may be a money node — the wall fits|a cursor that is not a keyword|in a keyframe takes a box|takes its paint from its host|prints text and states no colour|names no colour, and is drawn in currentColor|is its host's ink, which a state may change|reads a custom property that is not a palette role|all re-states every property from the host's or the initial value|names a side by the writing mode|it reaches past its box, where a state that changes the ink|an outline's ring reaches over the boxes beside its box|all in a keyframe re-states every property|a ground or a shadow in a keyframe lays a ground|SVG paint stands only on a drawn icon/.test(p)),
                `${JSON.stringify(entry.rule)}:\n  ${kit.join('\n  ')}`,
            );
        }
    });

    it('the-older-pseudo-element-refusals-read-through-a-comment-in-the-kit-too: the one kit-visible change of this round (B1), a fix of a hole on main', () => {
        // `::/**/first-letter`, `::/**/marker` and `::/**/selection` got past the kit's refusals on main; each is refused now, as its plain spelling always was.
        for (const entry of PLANTS.n9) {
            const kit = lintSheet(plantedKit(entry.rule.replaceAll('$C', 't-neo')));
            assert.ok(kit.length > 0, entry.rule);
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
        // (round 8) kept "most of this" on this paragraph and the money one
        // while a box moved over a figure by a relative offset, or a target's
        // glyph scaled over it, passed the probe (the critic's PC2, SVs and
        // PW on round 7). Step 10 of before-8g2 (D4(b) of D-2026-10-20-06)
        // took "most" off both: the reads bound (1a, 1b, 1c, 1d, 3a). The
        // piece paragraph keeps its label, true as written. The eighteenth
        // review split the money label by what each read reaches
        // (D-2026-11-09-07): cutting and fading on every screen, covering on
        // the first screen, what stands below it on the sampled screens.
        const whole =
            '**The whole price is never dressed to misread:** no clip, mask, filter, fade, shrink, turn, line through it, far shadow, ground in its own colour or spacing that makes its digits touch, and a box around it may tilt up to 10° and take any shape only clear of its digits. *(The kit — `workshop:probe`, on the screens and states it paints; Stall at intake for the rest, such as a pointer\'s hover, a turned wall and a screen the kit does not measure.)*';
        // The money paragraph's label, pinned since round 8 (the critic's
        // P3-2 on round 7: reverted, it kept this test green), and the lint
        // sentence folded into it.
        const moneyLabel =
            "*(The kit — `workshop:probe` reads whether anything cuts or fades the prices and text here on every screen and state it paints, and whether anything covers them on the first screen there; and, at 390, 1280 and 1920 wide on the screens it samples, what stands below the first screen, the codes, the contrast, and the digits where a box is moved near a figure or a figure is broken; Stall checks the rest at intake, such as a pointer's hover, a turned wall and a screen the kit does not measure. And `workshop:lint` refuses the ways to paint text in a colour the probe does not read: `-webkit-text-fill-color`, `-webkit-text-stroke`, `background-clip: text`.)*";
        assert.ok(readme.includes(piece), 'the workshop README does not carry the piece line');
        assert.ok(readme.includes(whole), 'the workshop README does not carry the whole-price line');
        assert.ok(readme.includes(moneyLabel), 'the workshop README does not carry the money paragraph\'s label');
        // D4(b) of D-2026-10-20-06, at step 10: the QR paragraph keeps "most"
        // for covering (a pay code below the first screen is hit-tested only
        // where a contrast job's taller shot brings it on screen, not at 360
        // nor on a geometry-only screen), and says what the kit reads of a
        // code; the eighteenth review's scope (D-2026-11-09-07): its margin
        // and modules are read on the contrast jobs alone.
        const qr =
            "**QR codes stay black on white, with their quiet margin.** Only the box around a code may take your look. *(The kit — `workshop:probe` catches most of what could cover a code on the screens and states it paints, and reads a code's colours, and on the screens it samples its margin and modules; Stall checks the rest at intake.)*";
        assert.ok(readme.includes(qr), 'the workshop README does not carry the QR paragraph');
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
        // Printed text states a colour of its own in the same rule (D-2026-10-20-08's B3, `a-pseudo-element-paints-its-own-ground-and-ink`).
        accepts(".t-neo .item-p::before { content: '// '; color: #3df2ea; }");
        accepts(".t-neo .item-p:after { content: '\\25c6'; color: var(--s-accent); }");
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

    it('reads a keyframe name without its quotes: a quoted twin of a base keyframe, at the top level or inside a media block, is also declared (the sixth review\'s M2)', () => {
        for (const twin of [
            '@keyframes "om-flick" { from { rotate: 0deg; } to { rotate: 1deg; } }',
            "@keyframes 'om-flick' { from { rotate: 0deg; } to { rotate: 1deg; } }",
            '@media (min-width: 680px) { @keyframes "om-flick" { from { rotate: 0deg; } to { rotate: 1deg; } } }',
        ]) {
            const kf = wornSheetProblems(servedWith({ [FIXTURE.path]: plantedFixture(twin) }));
            assert.ok(kf.some((p) => /@keyframes om-flick is also declared in src\/ui\/stall\.css/.test(p)), `${twin}\n${kf.join('\n')}`);
        }
        // And the other way: a base sheet that quotes the name of a worn sheet's keyframe.
        const [row] = PRIVATE;
        const quoted = wornSheetProblems(
            servedWith({ 'src/ui/stall.css': `${read('src/ui/stall.css')}\n@keyframes "t-fixture-worn-twin" { from { rotate: 0deg; } to { rotate: 1deg; } }\n`, [FIXTURE.path]: plantedFixture('@keyframes t-fixture-worn-twin { from { rotate: 0deg; } to { rotate: 1deg; } }') }),
        );
        assert.ok(quoted.some((p) => /@keyframes t-fixture-worn-twin is also declared in src\/ui\/stall\.css/.test(p)), quoted.join('\n'));
        assert.ok(row !== undefined, 'a private look is read');
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

describe('a-look-never-positions-against-an-anchor', () => {
    /**
     * Before 8g2, the seventh review's B1 (D-2026-10-27-01, "Probe đọc +
     * chặn trong lint"): a box placed by `anchor()` follows its anchor's
     * transform, motion path and offsets in Chrome 156, and the critic's PAN
     * — the pay figure the wallet signs anchored to its unit sibling, which a
     * keyframe `translate` from 30% to 40% of a 100s loop carried 600px out
     * of its row's clip — passed the first-party lint with no problem and the
     * whole runner green. The probe reads the road since (`anchorCanFollow`
     * in `layout/probe.ts`), on the kit's side; a first-party look sheet
     * writes no anchor positioning at all (`ANCHOR_PROPERTIES`, the
     * `anchor()` and `anchor-size()` functions in any value, `anchor-center`;
     * `@position-try` is an at-rule G4 refuses). The kit is unchanged.
     */
    const WHY = /— anchor positioning: a box placed against an anchor follows the anchor's transform/;

    it('refuses PAN, and each anchor property, function and keyword, in every case, with !important, in a media block, in a keyframe and through a custom property', () => {
        assert.match(ANCHOR_PAN, /anchor-name: --t-neo-pan;/);
        assert.match(ANCHOR_PAN, /right: anchor\(left\);/);
        const problems = lintLookSheet(plantedNeo(ANCHOR_PAN), { lookClass: 't-neo' });
        assert.ok(problems.length > 0 && problems.every((p) => WHY.test(p)), problems.join('\n') || '(no problem)');
        for (const rule of [
            '.t-neo .item-u { anchor-name: --t-neo-a; }',
            '.t-neo .pay-x { anchor-scope: all; }',
            '.t-neo .pay-x-n { position-anchor: --t-neo-a; }',
            '.t-neo .pay-x-n { position-area: top; }',
            '.t-neo .pay-x-n { inset-area: top; }',
            '.t-neo .pay-x-n { position-try: --t-neo-t; }',
            '.t-neo .pay-x-n { position-try-fallbacks: flip-block; }',
            '.t-neo .pay-x-n { position-try-order: most-height; }',
            '.t-neo .pay-x-n { position-try-options: flip-block; }',
            '.t-neo .pay-x-n { position-visibility: anchors-visible; }',
            '.t-neo .pay-x-n { position-fallback: --t-neo-t; }',
            '.t-neo .pay-x-n { position: absolute; right: anchor(left); }',
            '.t-neo .pay-x-n { position: absolute; top: anchor(--t-neo-a top); }',
            '.t-neo .pay-x-n { width: anchor-size(width); }',
            '.t-neo .pay-x-n { margin-left: calc(anchor-size(width) * 2); }',
            '.t-neo .pay-x-n { position: absolute; inset: anchor(top) auto auto anchor(left); }',
            '.t-neo .pay-x-n { justify-self: anchor-center; }',
            '.t-neo .pay-x { align-items: anchor-center; }',
            '.t-neo .item-u { ANCHOR-NAME: --t-neo-a; }',
            '.t-neo .pay-x-n { position: absolute; Right: ANCHOR(left); }',
            '.t-neo .pay-x-n { width: Anchor-Size(Width); }',
            '.t-neo .item-u { anchor-name: --t-neo-a !important; }',
            '@media (min-width: 680px) { .t-neo .item-u { anchor-name: --t-neo-a; } }',
            '@keyframes t-neo-an { to { anchor-name: --t-neo-a; } }',
            '@keyframes t-neo-an { to { right: anchor(left); } }',
            '.t-neo .pay-x-n { --t-neo-x: anchor(left); }',
            '.t-neo .pay-x-n { --t-neo-x: anchor-size(width); width: var(--t-neo-x); }',
            '.t-neo .pay-x-n { position: absolute; right: var(--t-neo-y, anchor(left)); }',
            '.t-neo .item-u { --t-neo-n: --t-neo-a; anchor-name: var(--t-neo-n); }',
        ]) {
            const found = lintLookSheet(plantedNeo(rule), { lookClass: 't-neo' });
            assert.ok(found.some((p) => WHY.test(p)), `${rule}:\n  ${found.join('\n  ') || '(no problem)'}`);
        }
        // `@position-try` is refused as an at-rule a look sheet may not hold (G4), as every at-rule but `@media` and `@keyframes` is.
        const tried = lintLookSheet(plantedNeo('@position-try --t-neo-t { top: anchor(bottom); }'), { lookClass: 't-neo' });
        assert.ok(tried.some((p) => /@position-try is not allowed in a look sheet/.test(p)), tried.join('\n'));
    });

    it('leaves alone what only looks like it, and the transforms and offsets with no anchor', () => {
        accepts('.t-neo .item { --t-neo-anchor: 4px; }');
        accepts('.t-neo .item-anchor { color: red; }');
        accepts('.t-neo .item { position: relative; left: 4px; }');
        accepts('.t-neo .item { translate: 0 2px; }');
        accepts('@keyframes t-neo-move { to { translate: 0 2px; } }');
    });

    it('is refused for the kit by its probe, as the workshop README says (D-2026-10-27-02)', () => {
        // The kit's lint admits anchor positioning (below); its probe refuses every paint of the
        // kit's look while the kit's sheet declares anchor-name (`kitAnchorFaults`), and every
        // geometry pass of the kit's probe owes that rule a read (`probeCoverageGaps`' `kit`).
        const readme = read('workshop/README.md').replace(/\s+/g, ' ');
        assert.ok(
            readme.includes('**No anchor positioning.** A box placed against an anchor follows it wherever it moves, so a sheet that names one (`anchor-name`) is refused. *(The kit — `workshop:probe`.)*'),
            'the workshop README states the kit refuses anchor positioning, checked by workshop:probe',
        );
        const probe = read('layout/probe.ts');
        assert.ok(probe.includes("const KIT_ANCHOR_CHECK = 'the-kit-takes-no-anchor-positioning';"));
        assert.match(probe, /failures\.push\(\.\.\.lookSheetFaults\(screen, label\)\);\n\s+failures\.push\(\.\.\.kitAnchorFaults\(screen, label, look\)\);/);
        assert.match(probe, /: named\n\s+\? `the kit's sheet declares anchor-name/);
        assert.ok(probe.includes("const value = style.getPropertyValue('anchor-name').trim();\n        if (value !== '' && value !== 'none') named = true;"));
        assert.ok(read('scripts/probe-coverage.mjs').includes("the-kit-takes-no-anchor-positioning read no paint of the kit's look"));
        assert.ok(/kit: LOOKS === 'workshop'/.test(read('scripts/layout-check.mjs')));
    });

    it('leaves the kit as it was: PAN and each road pass the kit lint', () => {
        assert.deepEqual(lintSheet(plantedKit(ANCHOR_PAN)), [], 'PAN in the kit');
        for (const rule of ['.t-neo .item-u { anchor-name: --t-neo-a; }', '.t-neo .pay-x-n { position: absolute; right: anchor(left); width: anchor-size(width); }', '.t-neo .pay-x-n { justify-self: anchor-center; }']) {
            assert.ok(!lintSheet(plantedKit(rule)).some((p) => WHY.test(p)), `the kit, ${rule}`);
        }
    });

    it('costs nothing: no first-party sheet a run serves, no starter and the canary writes any of it', () => {
        const sheets = lookRows(SERVED)
            .filter((row) => row.role !== 'kit')
            .map((row) => ({
                name: `${row.role}: ${row.path}`,
                css: row.css,
                options: row.role === 'private' ? { lookClass: row.lookClass, load: 'worn', ownArt: row.ownArt } : { lookClass: row.lookClass, load: row.load, ownArt: row.load === 'worn' ? ownArtOf(row) : undefined },
            }));
        const roles = new Set(lookRows(SERVED).filter((row) => row.role !== 'kit').map((row) => row.role));
        for (const role of ['look', 'fixture', 'private']) assert.ok(roles.has(role), `a ${role} sheet is read`);
        for (const cls of ['t-modern', 't-neo', 't-rural']) {
            sheets.push({ name: `starter: ${cls}`, css: rescopeSheet(read(LOOKS.find((sheet) => sheet.lookClass === cls).path), cls.slice(2), carried), options: { lookClass: 't-workshop' } });
        }
        sheets.push({ name: 'canary', css: canaryFiles()['canary/sheet.css'], options: { lookClass: 't-canary' } });
        for (const { name, css, options } of sheets) {
            assert.deepEqual(lintLookSheet(css, options).filter((p) => WHY.test(p)), [], name);
            // Not a lint but a grep, comments out: a comment may say "anchored", as one does.
            assert.doesNotMatch(css.replace(/\/\*[\s\S]*?\*\//g, ''), /(?<![\w-])(?:anchor-name|anchor-scope|position-anchor|position-area|inset-area|position-try[\w-]*|position-visibility|position-fallback)\s*:|(?<![\w-])anchor(?:-size)?\s*\(|anchor-center|@position-try/i, name);
        }
    });
});
