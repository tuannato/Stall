import { mkdirSync, mkdtempSync, readdirSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build, type PluginOption } from 'vite';
import { afterAll, describe, expect, it } from 'vitest';
import { loadKitLook } from '../layout/workshopKit';
import { KIT_SKELETON } from '../layout/workshopStarter';
import { PLANTED_CLASS, beforeReduce, plantLooks, removePlants } from '../scripts/private-looks-plant.mjs';
import { guardSheets, privateRows, servedSheets } from '../scripts/served-sheets.mjs';
import { wornSheets } from '../scripts/sheet-roles.mjs';
import { FIXTURE_LOOKS_DIR, SELECTION_ENV, selectionFromEnv, withoutSelection } from '../scripts/looks-selection.mjs';
import {
    LOOK_ART_BUDGET_GZIP,
    bytesOf,
    lookArtBudget,
    privateLookArtBudget,
    privateLookRows,
    weightBuckets,
    type BuiltPart as WeighedPart,
} from '../scripts/weight-buckets.mjs';
import { attachmentsForTheme } from './domain/attachments';
import { SHIPPED_THEMES, decodeTheme } from './domain/theme';

/** Structural, because `rollup` is not a dependency of this app to import types from. */
type BuiltPart = {
    type: string;
    code?: string;
    fileName?: string;
    source?: string | Uint8Array;
};
type BuiltOutput = { output: readonly BuiltPart[] };

function partsOf(result: unknown): readonly BuiltPart[] {
    const outputs = Array.isArray(result)
        ? (result as readonly BuiltOutput[])
        : [result as BuiltOutput];
    return outputs.flatMap((o) => o.output);
}

/**
 * What the origin actually serves, not what `src/` imports.
 *
 * `directory-walls` greps source for an import of the wallet package and will
 * never see this: the key code arrived through a CommonJS `require` inside a
 * dependency, where no import of ours appears. `CLAUDE.md` said that package was
 * "vendored but unused" and the served script carried `Wallet.fromMnemonic`,
 * `mnemonicToSeed` and `HdNode.fromSeed` for every visitor.
 *
 * So this builds the app and reads the bytes. It cannot pass vacuously against
 * a stale or missing `dist/`, and it cannot be satisfied by a comment.
 */
describe('built-bundle-has-no-key-derivation', () => {
    /**
     * Implementations, not export names. The stubs in `vite.config.ts` must
     * keep the names `ecash-lib`'s barrel re-exports, so forbidding
     * `mnemonicToSeed` outright would forbid the fix. These strings appear only
     * in the real bodies.
     */
    const FORBIDDEN = [
        'fromMnemonic',
        'derivePath',
        'WatchOnlyWallet',
        'DEFAULT_GAP_LIMIT',
        /*
         * `eccScalar.js`, which `ecash-lib`'s barrel re-exports and which
         * `pedersen.js` sits on. Stubbing the mnemonic and HD modules left
         * `randomScalarBytes` — entropy to a valid secp256k1 private key by
         * rejection sampling — in the script every visitor downloads, and
         * this list could not see it: it grepped four names, none of which
         * is in that module (read out of the built bytes, 2026-09-20).
         *
         * These two and not `randomScalarBytes`, because the bundle is
         * minified: a local function's NAME does not survive, and the stub
         * keeps the export name anyway, so grepping for it would be green
         * either way. `CURVE_ORDER` is a property on `exports` and
         * `getRandomValues` is a platform call — both survive minification,
         * both were present before the stub and absent after. This origin
         * holds no key and has nothing to randomise, so a hit on either is
         * a conversation worth forcing.
         */
        'CURVE_ORDER',
        'getRandomValues',
    ] as const;

    /** Proof the stubs are wired, so an empty result cannot read as a pass. */
    const REFUSAL = 'Stall holds no key: key derivation is not bundled';

    it('serves no path from a mnemonic to a private key', async () => {
        const result = (await build({
            logLevel: 'silent',
            build: { write: false },
        })) as unknown as BuiltOutput;

        const scripts = result.output.filter((part) => part.type === 'chunk');
        expect(scripts.length, 'no script chunk was emitted').toBeGreaterThan(0);
        const code = scripts.map((chunk) => chunk.code ?? '').join('\n');

        expect(code).toContain(REFUSAL);
        for (const symbol of FORBIDDEN) {
            expect(code, `${symbol} is in the served script`).not.toContain(symbol);
        }

        // The 1.2 MB wasm was base64-inlined and ran through `initSync` at
        // import — 80% of the script, for one hash. It must not come back: a
        // `.wasm` re-fetch would need `wasm-unsafe-eval`, and an inline blob is
        // the weight `@noble/hashes` replaced.
        expect(code, 'the wasm base64 is back in the bundle').not.toContain(
            'ECASH_LIB_WASM_BASE64',
        );
        expect(code, 'wasm is being instantiated at runtime').not.toContain('initSync');
    }, 120_000);
});

/**
 * Nothing this origin serves may be a `data:` URL. Vite inlines any asset
 * under 4096 bytes unless told otherwise, and the deployed CSP refuses
 * `data:` in both `font-src` and `img-src` — so a small font subset or icon
 * would ship, pass every test that reads code, and silently fail to render in
 * the one place that matters. `assetsInlineLimit: 0` in vite.config.ts is the
 * setting; this proves the output.
 */
describe('nothing-is-served-as-a-data-url', () => {
    it('emits no data: url in its stylesheets, and no cross-origin font', async () => {
        const result = await build({ logLevel: 'silent', build: { write: false } });
        const parts = partsOf(result);
        expect(parts.length, 'nothing was built').toBeGreaterThan(0);
        // The stylesheets specifically: an inlined asset lands in the emitted
        // CSS as `url(data:...)`. Scanning script text instead reads library
        // string constants — a dependency legitimately contains "data:image"
        // as prose, and that is not an asset this origin serves.
        const css = parts
            .filter((part) => (part.fileName ?? '').endsWith('.css'))
            .map((part) => (typeof part.source === 'string' ? part.source : ''))
            .join('\n');
        expect(css.length, 'no stylesheet was emitted').toBeGreaterThan(0);
        expect(css).not.toMatch(/url\(\s*['"]?data:/);
        // Self-hosted means self-hosted: a font fetched from a CDN would need
        // the CSP to grow and hands a third party every visitor.
        expect(css).not.toMatch(/url\(\s*['"]?https?:/);
        // The faces are actually in the output, so an empty CSS file cannot
        // read as a pass.
        const woff = parts.filter((p) => (p.fileName ?? '').endsWith('.woff2'));
        // Inter's two subsets, Stall Serif's four (roman and italic) and JetBrains
        // Mono's two (2026-09-26).
        expect(woff.length, 'every self-hosted subset is emitted as a file').toBe(8);
    }, 120_000);
});

/*
 * The weight guard, split by who pays (step 6, 6.1 of the step-6 plan v2):
 * `scripts/weight-buckets.mjs` puts every emitted file in one bucket —
 * every visitor, one worn-only look, or on demand — and each ceiling reads
 * the bucket it is about. One production build and one probe build (the
 * app's config plus `layout/probe.html`, which carries the harness's
 * worn-only fixture look), each built once for this file.
 */
let appBuild: Promise<readonly WeighedPart[]> | undefined;
let probeBuild: Promise<readonly WeighedPart[]> | undefined;
const builtParts = (configFile?: string): Promise<readonly WeighedPart[]> =>
    build({ configFile, logLevel: 'silent', build: { write: false } }).then(
        (result) => partsOf(result) as unknown as readonly WeighedPart[],
    );
const appParts = (): Promise<readonly WeighedPart[]> => (appBuild ??= builtParts());
const probeParts = (): Promise<readonly WeighedPart[]> => (probeBuild ??= builtParts('vite.probe.config.ts'));

/**
 * The workshop kit's build (`vite.workshop.config.ts`, which refuses to
 * build without a command named — `scripts/workshop.mjs` names one), with
 * `plugins` added: the kit's sheet is worn-only since 8d1, so its weight is
 * a look's budget, read here on a real build of the kit.
 */
async function workshopBuiltParts(plugins: PluginOption[] = []): Promise<readonly WeighedPart[]> {
    const before = process.env['STALL_WORKSHOP_CMD'];
    process.env['STALL_WORKSHOP_CMD'] = 'probe';
    try {
        const result = await build({ configFile: 'vite.workshop.config.ts', logLevel: 'silent', plugins, build: { write: false } });
        return partsOf(result) as unknown as readonly WeighedPart[];
    } finally {
        if (before === undefined) delete process.env['STALL_WORKSHOP_CMD'];
        else process.env['STALL_WORKSHOP_CMD'] = before;
    }
}

/** The worn-only look sheets the role table names, as the buckets read them. */
const WORN = wornSheets().map((sheet) => ({ lookClass: sheet.lookClass!, source: sheet.path }));

/** Every emitted CSS file's text, by file name. */
function cssText(parts: readonly WeighedPart[], names: readonly string[]): string {
    return parts
        .filter((part) => names.includes(part.fileName) && part.fileName.endsWith('.css'))
        .map((part) => (typeof part.source === 'string' ? part.source : ''))
        .join('\n');
}

/**
 * A deploy build carrying the private looks `selection` names (8e2), in
 * memory: the app's own config with its private-look plugin made to read
 * that selection (`privateLooks({ env })` in `vite.config.ts`) — a vitest
 * worker selects nothing (`VITEST`), so the selection is handed over rather
 * than read from this process. The one difference from `appParts`.
 */
async function deployParts(selection: Readonly<Record<string, string>>): Promise<readonly WeighedPart[]> {
    const { default: config, privateLooks } = await import('../vite.config');
    const env: Record<string, string | undefined> = { ...withoutSelection(process.env), ...selection };
    delete env['VITEST'];
    let swapped = 0;
    const plugins = (config.plugins ?? []).map((plugin) => {
        if (typeof plugin === 'object' && plugin !== null && (plugin as { name?: string }).name === 'stall-private-looks') {
            swapped += 1;
            return privateLooks({ env });
        }
        return plugin;
    });
    expect(swapped, 'the app config carries one private-look plugin to swap').toBe(1);
    const result = await build({ ...config, configFile: false, plugins, logLevel: 'silent', build: { ...config.build, write: false } });
    return partsOf(result) as unknown as readonly WeighedPart[];
}

/**
 * What a visitor's first load costs, held on the public build and — since
 * 8e2 — on a deploy build carrying the private looks a run reads: the
 * merged rows and the loader ride the entry, a look's sheet and art never do.
 */
const EVERY_VISITOR_CEILING_BYTES = 895_000;

describe('every-visitor-weight-has-a-ceiling', () => {
    /*
     * What a first visit to any page of the app downloads before anything
     * is painted: index.html, its entry chunk and every chunk that imports
     * statically, and the CSS they link (`weightBuckets`' every-visitor
     * bucket). Faces, decoration art and pictures a script imports are on
     * demand, and a worn-only look's sheet and art are that look's alone,
     * so neither is here. Measured 860,043 bytes on 2026-09-27 (the three
     * look sheets naming themselves included); the ceiling is that plus the
     * same deliberate 4% the served ceiling's readings have been given.
     * The number to watch is the delta a raise records; the ceiling is the
     * alarm. Red: a ~40 KB static import from render.ts.
     *
     * 861,724 at 8e2 (main 1c95aa0) and 864,512 after step 8f1's hooks and
     * its critic's fixes, measured in a vitest worker with no private look;
     * 866,176 after 8f2 and its critic's fixes (+1,664: the name ladder's
     * fit read by ink, `src/ui/signInk.ts`, its own box only); 866,652 after
     * the critic's re-check (+476: the line measured as painted — its
     * `text-transform`, small caps and width).
     * **This alarm can no longer fire first** (the 8f1 critic's item 5): on
     * demand is 262,846, so `served-weight-has-a-ceiling` trips once this
     * bucket passes about 867,154 — 30 KB under this ceiling. Not re-based
     * here; the owner's question before 8g (below).
     */

    it(`keeps every visitor's download under ${EVERY_VISITOR_CEILING_BYTES} bytes`, async () => {
        const buckets = weightBuckets(await appParts(), { worn: WORN });
        expect(buckets.problems).toEqual([]);
        const files = buckets.everyVisitor.files;
        expect(files).toContain('index.html');
        expect(files.filter((name) => name.endsWith('.js')).length, 'no entry chunk').toBeGreaterThan(0);
        expect(files.filter((name) => name.endsWith('.css')).length, 'no entry CSS').toBeGreaterThan(0);
        expect(buckets.everyVisitor.bytes, 'nothing was measured').toBeGreaterThan(500_000);
        expect(
            buckets.everyVisitor.bytes,
            `every visitor downloads ${buckets.everyVisitor.bytes} bytes against ${EVERY_VISITOR_CEILING_BYTES}`,
        ).toBeLessThan(EVERY_VISITOR_CEILING_BYTES);
    }, 120_000);
});

/**
 * The served weight has a ceiling. The wasm removal (§9) took the script from
 * ~2.05 MB to ~0.39 MB, and nothing since has watched the sum — a third font
 * subset or a careless dependency would land unnoticed. Raising this number
 * is allowed and must be a deliberate diff, not a surprise.
 *
 * Since step 6 it counts UTF-8 BYTES (it counted `code.length`, ~660 under)
 * and everything a visitor to a stall in a BUNDLED look can be served —
 * every-visitor and on demand — but no worn-only look's sheet or art: those
 * are that look's, under its own budget (`each-look-keeps-its-art-budget`),
 * and a fifth look must not eat this ceiling's headroom for the others.
 */
describe('served-weight-has-a-ceiling', () => {
    // Measured 564,858 the day the two Inter subsets landed, 649,559 the day
    // the three design stylesheets applied directly (the owner's ruling), and
    // 710,198 the day the direct-payment rail shipped — 691,199 the commit
    // before it, so the whole rail is about 19 KB of code, copy and CSS —
    // and 760,548 on the evening of 2026-09-07, when the D round, the
    // second price feed with its sentence tables, and the embed box landed
    // together and crossed the 760,000 line by 548 bytes. Raised to 800,000
    // as the deliberate diff this docblock asks for; the margin is for
    // ordinary growth, and an 85 KB latin-ext subset re-added by accident
    // still lands past this and fails.
    //
    // Measured 799,933 at the commit before the shop window — 67 bytes of
    // headroom, which is not a margin, it is a coincidence. Raised to 840,000
    // for that feature: a second render path, its own stylesheet, an options
    // sheet and the drivers, against the direct-payment rail's measured 19 KB
    // for a whole rail. Deliberate, and the number to watch is the delta this
    // docblock records rather than the ceiling, which is only ever the alarm.
    // The 85 KB subset still fails, which is what the alarm is for.
    //
    // Measured 842,838 after round 16 (2026-09-20): the door's deck and
    // tiles, the studio's four doors and the two sheets that took the recipe
    // and the embed code off the card — about 12 KB over the previous
    // reading, most of it the door. Raised to 860,000 as the deliberate diff
    // this docblock asks for; the delta is the number, the ceiling the alarm.
    // Measured 872,918 on 2026-09-21 with the surcharge round and "Pay
    // several" in — the strip, the rows' three modes, a second pay sheet and
    // the selection's domain module: 30,080 bytes over the previous reading
    // of 842,838, about 1.6× the direct-payment rail's 19 KB. Raised to
    // 900,000 as the deliberate diff; the delta is the number, the ceiling
    // the alarm.
    // 2026-09-22: the ticker preset and the touch wall took it to 900,403 —
    // +27,485 over the basket round's 872,918, of which the ticker is a
    // renderer, a scheduler and a stylesheet block and the wall is a second
    // render branch with five controls and a frozen payment. Raised to
    // 940,000, which is the same deliberate 4% headroom the last two
    // readings were given; the delta is the number, the ceiling the alarm.
    // 2026-09-26: Stall Serif, a renamed Lora (Rural), and JetBrains Mono (Neo and every mono line)
    // self-hosted, the owner's call, so every OS paints one font: six woff2
    // files, 148,264 bytes, took it to 1,085,256. A visitor fetches only the
    // subsets the look on screen uses. Raised to 1,130,000, the same 4%.
    // 2026-09-27 (step 6): 1,122,889 in bytes (1,122,220 characters), no
    // worn-only look shipped; the ceiling unchanged.
    // 2026-10-06, steps 8a–8f1, measured in a vitest worker with no private
    // look: 1,124,570 at 8e2 (main 1c95aa0), +1,681 over step 6 for the
    // join, the loader and the paid gate; 1,127,358 after 8f1's shared
    // hooks and its critic's fixes, +2,788 more — `lookMark`,
    // `applyNameTiers`, `scriptOf`, `chooseAttachment`, the two new mounts,
    // `shelf()`, the printed tag's clean-up and the picker's not-worn line
    // (`lookData`'s new messages are not in the bundle). 2,642 bytes under,
    // and on demand is 262,846 on both sides, so this ceiling now trips
    // before the every-visitor one can. NOT raised (the 8f1 critic's item
    // 5): before 8g the owner decides between the usual 4% and re-basing
    // every-visitor to served minus on demand, so the two alarms stop
    // shadowing each other. The 8f1 critic read 99 bytes more at 68fb1a9 in
    // a plain build; not explained.
    // 8f2 and its critic's fixes: 1,129,022, +1,664 for the name ladder's
    // fit read by ink (`inkFits` in src/ui/signInk.ts, the line's measured
    // glyphs in its own box) — the probe's new rules are harness code and
    // ship nothing. The `clip-path` shapes the probe resolves stay out of
    // the app's bundle for this ceiling: with them it read 1,131,689. The
    // critic's re-check: 1,129,498, +476 for the line measured as painted
    // (its `text-transform`, small caps and width). 502 bytes under; not
    // raised — the owner approved splitting the ceilings by bucket
    // (D-2026-10-06-07), which retires this sum, and lands first.
    const CEILING_BYTES = 1_130_000;

    it(`keeps the built output under ${CEILING_BYTES} bytes, worn-only looks apart`, async () => {
        const parts = await appParts();
        const buckets = weightBuckets(parts, { worn: WORN });
        expect(buckets.problems).toEqual([]);
        const total = buckets.everyVisitor.bytes + buckets.onDemand.bytes;
        expect(total, 'nothing was built').toBeGreaterThan(100_000);
        const worn = Object.values(buckets.worn).reduce((sum, bucket) => sum + bucket.bytes, 0);
        expect(total + worn, 'a file fell out of every bucket').toBe(
            parts.reduce((sum, part) => sum + bytesOf(part), 0),
        );
        expect(total, 'the served weight grew past the stated ceiling').toBeLessThan(CEILING_BYTES);
    }, 120_000);
});

describe('every-emitted-file-is-in-one-weight-bucket', () => {
    /*
     * Every file a build emits lands in exactly one bucket, and a worn-only
     * look's file named anywhere else — the entry CSS, a shared decoration
     * another sheet names, another look's sheet — is a refusal: counted in
     * two places it is either under-counted by the look's budget or dropped
     * by the served ceiling where a visitor still pays for it. The
     * production build carries no worn-only look yet; the probe build
     * carries the harness's fixture (`layout/fixture-look.css`), which is
     * the subject until one ships. Red: the fixture sheet naming
     * `../src/ui/decor/rain-near.svg`, which `stall.css` also names.
     */
    for (const [name, parts] of [
        ['the production build', appParts],
        ['the probe build (the fixture look)', probeParts],
    ] as const) {
        it(`puts every file of ${name} in one bucket`, async () => {
            const built = await parts();
            const buckets = weightBuckets(built, { worn: WORN });
            expect(buckets.problems).toEqual([]);
            const all = [
                ...buckets.everyVisitor.files,
                ...buckets.onDemand.files,
                ...Object.values(buckets.worn).flatMap((bucket) => bucket.files),
            ];
            expect(new Set(all).size, 'a file is in two buckets').toBe(all.length);
            expect([...all].sort()).toEqual(built.map((part) => part.fileName).sort());
        }, 120_000);
    }

    it('files the fixture look under its own bucket, sheet and art, on the probe build', async () => {
        const buckets = weightBuckets(await probeParts(), { worn: WORN });
        const fixture = buckets.worn['t-fixture-worn'];
        expect(fixture, 'the probe build emitted no fixture sheet').toBeDefined();
        expect(fixture!.sheet).toMatch(/^assets\/fixture-look-[\w-]+\.css$/);
        expect(fixture!.art).toEqual([expect.stringMatching(/^assets\/ground-[\w-]+\.svg$/)]);
    }, 120_000);

    it('refuses a worn-only file another sheet names, and a worn sheet built into another file', () => {
        const sheet = (fileName: string, source: string, from: string): WeighedPart => ({
            type: 'asset',
            fileName,
            source,
            originalFileNames: [from],
        });
        const entry: WeighedPart = {
            type: 'chunk',
            fileName: 'assets/index.js',
            code: 'x',
            isEntry: true,
            facadeModuleId: '/r/index.html',
            imports: [],
            viteMetadata: { importedCss: new Set(['assets/index.css']) },
        };
        const html = sheet('index.html', '<!doctype html>', '/r/index.html');
        const rain = sheet('assets/rain.svg', '<svg/>', 'src/ui/decor/rain.svg');
        const shared = weightBuckets(
            [
                entry,
                html,
                sheet('assets/index.css', '.a{background:url(/assets/rain.svg)}', 'index.html'),
                sheet('assets/look.css', '.t-x{background:url(/assets/rain.svg)}', 'src/looks/x/look.css'),
                rain,
            ],
            { worn: [{ lookClass: 't-x', source: 'src/looks/x/look.css' }] },
        );
        expect(shared.problems.join('\n')).toMatch(/assets\/rain\.svg is in more than one weight bucket/);
        const inlined = weightBuckets(
            [
                { ...entry, moduleIds: ['/r/src/looks/x/look.css'] },
                html,
                sheet('assets/index.css', '.t-x{--look-sheet:t-x}', 'index.html'),
            ],
            { worn: [{ lookClass: 't-x', source: 'src/looks/x/look.css' }] },
        );
        expect(inlined.problems.join('\n')).toMatch(/built into another file rather than its own sheet/);
    });
});

describe('a-worn-only-look-sheet-is-not-in-the-entry-css', () => {
    /*
     * A worn-only look's sheet is its own file, fetched for a stall that
     * wears it — never in the CSS every visitor downloads, where it would
     * cost every visitor and paint before any stall asked for it. Read by
     * the sheet's own name (`--look-sheet`), so a side-effect import that
     * inlined it anywhere in the every-visitor CSS is caught however it got
     * there. Red: `import '../../layout/fixture-look.css'` in render.ts.
     */
    for (const [name, parts] of [
        ['the production build', appParts],
        ['the probe build', probeParts],
    ] as const) {
        it(`keeps every worn-only sheet out of ${name}'s every-visitor CSS`, async () => {
            const built = await parts();
            const buckets = weightBuckets(built, { worn: WORN });
            const css = cssText(built, buckets.everyVisitor.files);
            expect(css.length, 'no every-visitor CSS was read').toBeGreaterThan(10_000);
            expect(css, 'the shipped looks name themselves in the entry CSS').toMatch(/--look-sheet:\s*t-neo/);
            for (const worn of WORN) {
                expect(css, `${worn.lookClass} is in the every-visitor CSS`).not.toMatch(
                    new RegExp(`--look-sheet:\\s*${worn.lookClass}(?![\\w-])`),
                );
                expect(css, `${worn.lookClass} has a rule in the every-visitor CSS`).not.toContain(`.${worn.lookClass}`);
            }
        }, 120_000);
    }
});

describe('each-look-keeps-its-art-budget', () => {
    /*
     * What one visitor to a stall in a worn-only look downloads for it, in
     * gzip -9 bytes (Node zlib): the look's sheet and the art its bare rules
     * name, plus the largest row of each decoration slot
     * (`lookArtBudget`), under `LOOK_ART_BUDGET_GZIP` — whose number and
     * reason (Ink wash as drawn, 164,872 before its face) are in
     * `scripts/weight-buckets.mjs`. The bundled looks are the every-visitor
     * ceiling's, not this budget's. No shipped look is worn only yet, so
     * the real subject is the harness's fixture look on the probe build,
     * and a synthetic look holds the arithmetic: two rows in one slot count
     * the larger, a second slot adds its own, and 600 KB of art is refused.
     */
    const budgetOf = (parts: readonly WeighedPart[], lookClass: string, rows: readonly { cls?: string; slot: string }[]) => {
        const buckets = weightBuckets(parts, { worn: WORN });
        const bucket = buckets.worn[lookClass];
        if (bucket === undefined) throw new Error(`${lookClass}: no worn-only bucket`);
        const byName = new Map(parts.map((part) => [part.fileName, part]));
        const bytes = (name: string): string | Uint8Array => byName.get(name)?.source ?? '';
        return lookArtBudget({
            sheet: String(bytes(bucket.sheet)),
            sheetFile: bucket.sheet,
            files: new Map(bucket.art.map((name) => [name, bytes(name)])),
            rows,
        });
    };

    it(`keeps every worn-only look under ${LOOK_ART_BUDGET_GZIP} gzip bytes`, async () => {
        const production = await appParts();
        for (const sheet of wornSheets().filter((s) => s.role === 'look')) {
            const row = SHIPPED_THEMES.map(({ id }) => decodeTheme(id)).find((t) => t.sheetClass === sheet.lookClass)!;
            const reading = budgetOf(production, sheet.lookClass!, attachmentsForTheme(row.id));
            expect(reading.total, `${sheet.lookClass}: ${JSON.stringify(reading)}`).toBeLessThan(LOOK_ART_BUDGET_GZIP);
        }
        const fixture = budgetOf(await probeParts(), 't-fixture-worn', []);
        expect(fixture.total, 'the fixture look was not read').toBeGreaterThan(100);
        expect(fixture.total).toBeLessThan(LOOK_ART_BUDGET_GZIP);
    }, 120_000);

    /*
     * The workshop kit's look, on the kit's own build (8d1; STEP-6-PLAN v2
     * item 6.8): the kit loads its sheet the worn-only way, so what a
     * creator's look costs one visitor is a look's budget — the sheet and
     * its art as the kit build emits them, the rows from `look.json`. The
     * committed kit is the skeleton, a few dozen bytes; red over a planted
     * kit whose sheet names ~600 KB of art gzip cannot shrink, in a folder
     * shaped like the kit's (`…/workshop/theme-workshop.css`, the path the
     * weight guard knows the kit's sheet by). Not covered, stated: the kit's
     * commands do not run this budget; a creator meets it in `pnpm test`.
     */
    it(`keeps the workshop kit's look under ${LOOK_ART_BUDGET_GZIP} gzip bytes, on the kit's own build`, async () => {
        const parts = await workshopBuiltParts();
        const buckets = weightBuckets(parts, { worn: WORN });
        expect(buckets.problems).toEqual([]);
        expect(buckets.worn['t-workshop'], 'the kit build emitted no sheet of the kit’s own').toBeDefined();
        const reading = budgetOf(parts, 't-workshop', loadKitLook().rows);
        expect(reading.total, 'the kit look was not read').toBeGreaterThan(20);
        expect(reading.total, JSON.stringify(reading)).toBeLessThan(LOOK_ART_BUDGET_GZIP);

        const dir = realpathSync(mkdtempSync(join(tmpdir(), 'stall-kit-budget-')));
        try {
            mkdirSync(join(dir, 'workshop', 'art'), { recursive: true });
            let seed = 0x2545f491;
            const digits = Array.from({ length: 1_400_000 }, () => {
                seed ^= seed << 13;
                seed ^= seed >>> 17;
                seed ^= seed << 5;
                return String((seed >>> 0) % 10);
            }).join('');
            writeFileSync(
                join(dir, 'workshop', 'art', 'heavy.svg'),
                `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0L${digits.replace(/(\d{6})/g, '$1 ')}"/></svg>`,
            );
            const sheet = join(dir, 'workshop', 'theme-workshop.css');
            writeFileSync(
                sheet,
                '.t-workshop { --look-sheet: t-workshop; background-image: url(art/heavy.svg); }\n' +
                    '@media (prefers-reduced-motion: reduce) {}\n',
            );
            const heavy = await workshopBuiltParts([
                {
                    name: 'test:plant-kit-sheet',
                    enforce: 'pre',
                    resolveId(source) {
                        const [path, query] = source.split('?');
                        if (!/[/\\]workshop[/\\]theme-workshop\.css$/.test(path!)) return undefined;
                        return query === undefined ? sheet : `${sheet}?${query}`;
                    },
                },
            ]);
            const planted = budgetOf(heavy, 't-workshop', []);
            expect(planted.total, `a heavy kit look passed the budget: ${JSON.stringify(planted)}`).toBeGreaterThan(LOOK_ART_BUDGET_GZIP);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    }, 180_000);

    /*
     * Every private look a run reads (`scripts/served-sheets.mjs`: the
     * tracked fixture always, the selection when the environment names one
     * — the real look in a deploy job's `pnpm test`), from its source: its
     * sheet as written (the build only minifies it, so never under), its
     * art as the build writes it (SVGs re-serialised), its rows from its
     * `look.json` (`privateLookArtBudget`). A deploy build's own worn bucket
     * is 8e2's. Red over a planted look carrying ~600 KB of art gzip cannot
     * shrink.
     */
    it(`keeps every private look a run reads under ${LOOK_ART_BUDGET_GZIP} gzip bytes, from its source`, async () => {
        const rows = privateRows(await guardSheets());
        expect(rows.some((row) => row.look.source === 'fixture'), 'the fixture is read').toBe(true);
        for (const row of rows) {
            const reading = privateLookArtBudget(row.look);
            expect(reading.total, `${row.path}: the look was not read`).toBeGreaterThan(100);
            expect(reading.total, `${row.path}: ${JSON.stringify(reading)}`).toBeLessThan(LOOK_ART_BUDGET_GZIP);
        }
        // Digits from a fixed-seed generator: an SVG the allow-list passes and gzip cannot shrink much.
        let seed = 0x2545f491;
        const digits = Array.from({ length: 1_400_000 }, () => {
            seed ^= seed << 13;
            seed ^= seed >>> 17;
            seed ^= seed << 5;
            return String((seed >>> 0) % 10);
        }).join('');
        const heavy = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0L${digits.replace(/(\d{6})/g, '$1 ')}"/></svg>`;
        const repo = plantLooks(
            (path, text) => (path === 'fixture/sheet.css' ? beforeReduce(text, `.${PLANTED_CLASS} .item-n { background-image: url(./art/heavy.svg); }`) : text),
            { 'fixture/art/heavy.svg': heavy },
        );
        const planted = privateRows(await servedSheets({ env: repo.selection, fixture: true, gitEnv: repo.env })).find(
            (row) => row.lookClass === PLANTED_CLASS,
        )!;
        const reading = privateLookArtBudget(planted.look);
        expect(reading.total, `a heavy private look passed the budget: ${JSON.stringify(reading)}`).toBeGreaterThan(LOOK_ART_BUDGET_GZIP);
    }, 60_000);
    afterAll(removePlants);

    /*
     * And on a deploy build's own worn bucket (8e2): every private look a run
     * reads — the tracked fixture always, the selection when the
     * environment names one, each built as a deploy build of it would carry
     * it (`deployParts`, the fixture at the commit the guards read it) — is
     * weighed from the bytes the build emits: its own sheet as built and
     * every file that sheet's `url()`s name, through `weightBuckets` like
     * any worn-only look, its rows from its `look.json`. The bucket is the
     * look's alone (no file of it in the every-visitor bucket, no problem
     * over the build), and the build's every-visitor download stays under
     * the public ceiling. Red over the planted heavy look above, built.
     */
    it(`keeps every private look a run reads under ${LOOK_ART_BUDGET_GZIP} gzip bytes, on a deploy build's own worn bucket`, async () => {
        const rows = privateRows(await guardSheets());
        expect(rows.some((row) => row.look.source === 'fixture'), 'the fixture is read').toBe(true);
        const selected = selectionFromEnv(process.env);
        for (const row of rows) {
            const selection =
                row.look.source === 'fixture' || selected === undefined
                    ? { [SELECTION_ENV.target]: 'preview', [SELECTION_ENV.dir]: FIXTURE_LOOKS_DIR, [SELECTION_ENV.commit]: row.look.commit }
                    : {
                          [SELECTION_ENV.target]: selected.target,
                          [SELECTION_ENV.dir]: selected.dir,
                          [SELECTION_ENV.commit]: row.look.commit,
                      };
            const parts = await deployParts(selection);
            const worn = [...WORN, { lookClass: row.lookClass, source: `${row.look.entry.slug}/sheet.css` }];
            const buckets = weightBuckets(parts, { worn });
            expect(buckets.problems, row.path).toEqual([]);
            const bucket = buckets.worn[row.lookClass];
            expect(bucket, `${row.path}: the deploy build emitted no sheet of the look's own`).toBeDefined();
            expect(buckets.everyVisitor.files.some((name) => name === bucket!.sheet || bucket!.art.includes(name))).toBe(false);
            const byName = new Map(parts.map((part) => [part.fileName, part]));
            const bytes = (name: string): string | Uint8Array => byName.get(name)?.source ?? '';
            const reading = lookArtBudget({
                sheet: String(bytes(bucket!.sheet)),
                sheetFile: bucket!.sheet,
                files: new Map(bucket!.art.map((name) => [name, bytes(name)])),
                rows: privateLookRows(row.look),
            });
            expect(reading.total, `${row.path}: the built look was not read`).toBeGreaterThan(100);
            expect(reading.total, `${row.path}: ${JSON.stringify(reading)}`).toBeLessThan(LOOK_ART_BUDGET_GZIP);
            expect(
                buckets.everyVisitor.bytes,
                `a deploy build of ${row.path} costs every visitor ${buckets.everyVisitor.bytes} bytes against ${EVERY_VISITOR_CEILING_BYTES}`,
            ).toBeLessThan(EVERY_VISITOR_CEILING_BYTES);
        }
        // Red: the fixture planted with ~600 KB of art gzip cannot shrink, built.
        let seed = 0x2545f491;
        const digits = Array.from({ length: 1_400_000 }, () => {
            seed ^= seed << 13;
            seed ^= seed >>> 17;
            seed ^= seed << 5;
            return String((seed >>> 0) % 10);
        }).join('');
        const heavy = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0L${digits.replace(/(\d{6})/g, '$1 ')}"/></svg>`;
        const repo = plantLooks(
            (path, text) => (path === 'fixture/sheet.css' ? beforeReduce(text, `.${PLANTED_CLASS} .item-n { background-image: url(./art/heavy.svg); }`) : text),
            { 'fixture/art/heavy.svg': heavy },
        );
        const planted = await deployParts({ ...repo.selection, [SELECTION_ENV.commit]: repo.head() });
        const plantedBuckets = weightBuckets(planted, { worn: [...WORN, { lookClass: PLANTED_CLASS, source: 'fixture/sheet.css' }] });
        const plantedBucket = plantedBuckets.worn[PLANTED_CLASS]!;
        const byName = new Map(planted.map((part) => [part.fileName, part]));
        const plantedReading = lookArtBudget({
            sheet: String(byName.get(plantedBucket.sheet)?.source ?? ''),
            sheetFile: plantedBucket.sheet,
            files: new Map(plantedBucket.art.map((name) => [name, byName.get(name)?.source ?? ''])),
            rows: [],
        });
        expect(plantedReading.total, `a heavy private look passed the budget built: ${JSON.stringify(plantedReading)}`).toBeGreaterThan(LOOK_ART_BUDGET_GZIP);
    }, 180_000);

    it('counts the bare look and the largest row of each slot, and refuses 600 KB of art', () => {
        // Bytes gzip cannot shrink: a fixed-seed generator, so the reading is the same every run.
        let seed = 0x2545f491;
        const noise = (n: number): Uint8Array =>
            Uint8Array.from({ length: n }, () => {
                seed ^= seed << 13;
                seed ^= seed >>> 17;
                seed ^= seed << 5;
                return (seed >>> 0) & 0xff;
            });
        const sheet =
            '.t-x{--look-sheet:t-x;background:url(/assets/paper.svg)}' +
            '.t-x.att-a .b{background:url(/assets/a.svg)}' +
            '.t-x.att-b .b{background:url(/assets/b.svg)}' +
            '.t-x.att-c .c{background:url(/assets/c.svg)}';
        const rows = [
            { cls: 'att-a', slot: 'yard' },
            { cls: 'att-b', slot: 'yard' },
            { cls: 'att-c', slot: 'trim' },
        ];
        const files = new Map<string, Uint8Array>([
            ['assets/paper.svg', noise(10_000)],
            ['assets/a.svg', noise(40_000)],
            ['assets/b.svg', noise(20_000)],
            ['assets/c.svg', noise(5_000)],
        ]);
        const reading = lookArtBudget({ sheet, sheetFile: 'assets/look.css', files, rows });
        expect(reading.slots.yard!.cls).toBe('att-a');
        expect(reading.slots.trim!.cls).toBe('att-c');
        expect(reading.total).toBe(reading.bare + reading.slots.yard!.gzip + reading.slots.trim!.gzip);
        // Incompressible, so gzip adds a little and removes nothing.
        expect(reading.bare).toBeGreaterThan(10_000);
        expect(reading.slots.yard!.gzip).toBeGreaterThan(40_000);
        expect(reading.slots.yard!.gzip).toBeLessThan(40_000 + 200);
        expect(reading.total).toBeLessThan(LOOK_ART_BUDGET_GZIP);

        // A row's class only inside `:not()`, `:is()` or `:where()` does not
        // scope a rule to that row: its art counts as bare.
        for (const wrapped of [':not(.att-c)', ':is(.att-c)', ':where(.att-c)']) {
            const hidden = lookArtBudget({
                sheet: sheet.replace('.t-x.att-c .c', `.t-x${wrapped} .c`),
                sheetFile: 'assets/look.css',
                files,
                rows,
            });
            expect(hidden.slots.trim, `${wrapped} scoped a rule to its row`).toBeUndefined();
            expect(hidden.bare, `${wrapped}: the art left the bare count`).toBeGreaterThan(reading.bare + 5_000);
        }

        files.set('assets/paper.svg', noise(600_000));
        const heavy = lookArtBudget({ sheet, sheetFile: 'assets/look.css', files, rows });
        expect(heavy.total, 'a 600 KB look passed the budget').toBeGreaterThan(LOOK_ART_BUDGET_GZIP);
    });
});

/**
 * The showroom is a workshop tool, not a page this origin serves.
 *
 * `layout/gallery.html` paints the fixture stall with seekable animations and
 * a control strip — exactly the kind of page that must never ride along into
 * production, where its fixture shop would be one route-typo away from looking
 * like a real seller. The build has a single entry (`index.html`), so the
 * gallery is excluded by construction; this reads the emitted output so that a
 * future second entry cannot bring it in silently.
 */
describe('gallery-is-not-served', () => {
    /**
     * The showroom and the workshop kit are dev-only: `vite.workshop.config.ts`
     * builds them for `pnpm workshop`, and the production build must carry
     * nothing of either — no gallery or kit file, no module under `layout/` or
     * `workshop/`, no showroom hook, no kit class, and not the kit's skeleton
     * label, which is the string a look.json leaking in would bring with it.
     */
    it('emits no gallery or workshop file and no showroom or kit code', async () => {
        const result = (await build({
            logLevel: 'silent',
            build: { write: false },
        })) as unknown as BuiltOutput | readonly BuiltOutput[];
        const outputs = Array.isArray(result) ? result : [result as BuiltOutput];
        const parts = outputs.flatMap((o) => o.output) as readonly (BuiltPart & {
            moduleIds?: readonly string[];
            originalFileNames?: readonly string[];
        })[];
        expect(parts.length, 'nothing was built').toBeGreaterThan(0);

        for (const part of parts) {
            expect(part.fileName ?? '', 'a gallery file is in the build').not.toContain(
                'gallery',
            );
            expect(part.fileName ?? '', 'a workshop file is in the build').not.toContain(
                'workshop',
            );
            for (const source of [...(part.moduleIds ?? []), ...(part.originalFileNames ?? [])]) {
                expect(source, 'a layout/ or workshop/ source is in the build').not.toMatch(
                    /(^|[/\\])(layout|workshop)[/\\]/,
                );
            }
        }
        const code = parts
            .filter((part) => part.type === 'chunk')
            .map((part) => part.code ?? '')
            .join('\n');
        expect(code, 'showroom code is in the served script').not.toContain(
            '__galleryReady',
        );
        expect(code, 'the shot plan is in the served script').not.toContain('__shotPlan');
        expect(code, 'the kit look is in the served script').not.toContain(KIT_SKELETON.label);
        const text = parts
            .map((part) =>
                part.type === 'chunk'
                    ? (part.code ?? '')
                    : typeof part.source === 'string'
                      ? part.source
                      : new TextDecoder().decode(part.source ?? new Uint8Array()),
            )
            .join('\n');
        expect(text, 'the kit class is in the served files').not.toContain('t-workshop');
        // The harness's worn-only look (`layout/fixture-look.css`): never served.
        expect(text, 'the fixture look is in the served files').not.toContain('t-fixture-worn');
        // The tracked private-look fixture (`layout/fixture-private-looks/`,
        // step 8): joined only when a run selects it, never by this build.
        expect(text, 'the private fixture look is in the served files').not.toContain('t-fixture-private');
    }, 120_000);
});

/**
 * A chronik request that never returns is how a stall hangs forever.
 *
 * `chronik-client` calls axios with no `timeout`, and axios defaults to `0` —
 * wait indefinitely. Its own `_request` loop is written to fail over to the
 * next host on an error carrying a `code`, but a half-open socket, which is
 * what sleeping a laptop leaves behind, never returns *and never throws*: the
 * loop never advances, the load never settles, and the page sits on `opening`
 * with the browser's spinner running. `src/net/errors.ts` already sorts
 * `ETIMEDOUT` and `ECONNABORTED` onto the unreachable screen — the machinery
 * to report this existed and nothing ever started a clock.
 *
 * `chronikRequestTimeout` in `vite.config.ts` injects one at build time, the
 * same way key derivation is stubbed out. A grep of `src/` cannot see that
 * either, so this reads the bytes the origin actually serves.
 */
describe('built-bundle-times-out-a-chronik-request', () => {
    it('gives both axios calls a timeout, beside the request they belong to', async () => {
        const result = (await build({
            logLevel: 'silent',
            build: { write: false },
        })) as unknown as BuiltOutput | readonly BuiltOutput[];
        const outputs = Array.isArray(result) ? result : [result as BuiltOutput];
        const code = outputs
            .flatMap((o) => o.output)
            .filter((part) => part.type === 'chunk')
            .map((part) => part.code ?? '')
            .join('\n');

        expect(code.length, 'nothing was built').toBeGreaterThan(0);
        // The proxy is in the bundle at all, so an absent match cannot read as
        // a pass because chronik was tree-shaken away.
        expect(code, 'the chronik request path is not in the bundle').toContain(
            'arraybuffer',
        );

        // Minified: 5000 becomes 5e3. Both call sites — the GET the app uses
        // and the POST beside it — must carry it, and it must sit in the same
        // options object as the request, not merely somewhere in the bundle.
        const paired = code.match(/timeout:\s*5e3\s*,\s*responseType:\s*["']arraybuffer["']/g);
        expect(paired?.length, 'both chronik axios calls need the clock').toBe(2);

        // And nothing in the chronik path is left waiting forever.
        expect(code).not.toMatch(/timeout:\s*0\s*,\s*responseType:\s*["']arraybuffer["']/);
    }, 120_000);
});

describe('public-weight-has-a-ceiling', () => {
    /**
     * `served-weight-has-a-ceiling` builds with `write: false`, so nothing in
     * `public/` is counted — Pages serves every file there whether or not
     * anything links it (`_redirects` names no assets). Measured 947,955
     * bytes on 2026-09-05 and 962,399 on 2026-09-20 against 1,000,000.
     * Raised to 1,120,000 the same evening for round 16's two guide figures
     * (`public/guide/*.jpg`, ~102 KB together) — a deliberate diff, and a
     * trade the owner made knowingly: the headroom this eats is the room a
     * fourth look's og card (~200 KB) would have needed, so that card now
     * needs its own raise. Measured 1,108,312 after the round (the hero is
     * 146 KB now, composed from `broadcast-hero`): about 12 KB of headroom,
     * deliberately tight, so the next image is noticed the day it lands.
     *
     * **Raised to 1,340,000 on 2026-09-22 — the raise that paragraph asked
     * for, taken by the owner** for the fourth look (round 17, `Ink wash`).
     * The three shipped og cards are 195 / 222 / 245 KB, so the reserve is
     * one card of the same order plus the jitter a re-shoot brings. It is
     * still enforcement and still tight on purpose: a FIFTH look needs the
     * next raise, and the question that raise asks is whether four cards of
     * a quarter of a megabyte each are what `public/` should be for, or
     * whether the cards should be generated smaller.
     *
     * **Raised by 20,000 to 1,360,000 on 2026-09-23 for `licenses.txt`**
     * (20,274 bytes: the third-party notices, `scripts/notices.mjs`) — the
     * deliberate diff, so the file does not eat the room the fourth look's
     * card was given. Measured 1,128,248 with it in (and the `_headers` and
     * `/guide` lines beside it), against 1,107,823 before. Emitting the file from the build instead was weighed and
     * refused: it would move the weight onto `served-weight-has-a-ceiling`
     * and take every licence change out of the diffs a reviewer reads.
     */
    const PUBLIC_CEILING_BYTES = 1_360_000;

    function sizeOf(dir: string): number {
        let total = 0;
        for (const name of readdirSync(dir)) {
            const p = join(dir, name);
            total += statSync(p).isDirectory() ? sizeOf(p) : statSync(p).size;
        }
        return total;
    }

    it(`keeps public/ under ${PUBLIC_CEILING_BYTES} bytes`, () => {
        const total = sizeOf(join(import.meta.dirname, '..', 'public'));
        expect(total, 'nothing was measured').toBeGreaterThan(100_000);
        expect(
            total,
            `public/ weighs ${total} bytes against a ceiling of ${PUBLIC_CEILING_BYTES}`,
        ).toBeLessThan(PUBLIC_CEILING_BYTES);
    });
});
