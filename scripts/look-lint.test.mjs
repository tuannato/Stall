import { strict as assert } from 'node:assert';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { servedFlashReport, servedSheets, themeVarValues } from './look-flash.mjs';
import { appSheets, sheetsWithRole } from './sheet-roles.mjs';
import {
    GENERATED_TEXT,
    LOOK_MEDIA,
    MAX_FLASHES_PER_SECOND,
    STATE_ATTRIBUTES,
    decodeEscapes,
    flashReport,
    keyframeFlashes,
    lintLookSheet,
    lintSheet,
    PRESENCE_ATTRIBUTES,
    parseSheet,
    rescopeSheet,
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
                assert.ok(app.valued.get(name)?.has(value), `listed, and matched by no served sheet: [${name}="${value}"]`);
            }
        }
        for (const name of PRESENCE_ATTRIBUTES) {
            assert.ok(app.bare.has(name) && !app.valued.has(name), `listed as presence-only: ${name}`);
        }
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
        const { report, problems } = await servedFlashReport();
        assert.deepEqual(problems, []);
        assert.ok(report.length > 10, 'the report read the served keyframes');
        const worst = Math.max(...report.map((row) => row.flashes));
        assert.ok(worst <= MAX_FLASHES_PER_SECOND, `worst ${worst}`);
        // The theme table's animations are read through their vars.
        assert.ok(report.some((row) => row.name === 'neo-flick' && row.seconds === 6), 'neo-flick through --s-name-anim');
    });

    it('reads att-hum at the boundary: three flashes, six changes, at its shipped 7 s', async () => {
        const { report } = await servedFlashReport();
        const hum = report.filter((row) => row.name === 'att-hum-gutter');
        assert.deepEqual(
            hum.map((row) => [row.seconds, row.iterations, row.alternate, row.changes, row.flashes]),
            [[7, Infinity, false, 6, 3]],
        );
    });

    it('refuses a strobe, a re-timed lamp, and a flashing keyframe run for a time it cannot read', async () => {
        const vars = await themeVarValues();
        const withNeo = (css) =>
            servedSheets().map((sheet) => (sheet.name === NEO.path ? { name: sheet.name, css } : sheet));
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
