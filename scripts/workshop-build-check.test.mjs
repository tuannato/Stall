import { strict as assert } from 'node:assert';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { kitBaseline, kitBuildProblems, requireCleanKitBuild } from './workshop-build-check.mjs';

/**
 * `the-kit-build-emits-no-file-it-was-not-given`: the guard after every kit
 * build, proved on a build the lint never saw.
 *
 * The harness builds the kit's own config with its sheet import pointed at a
 * scratch sheet (a `resolveId` plugin here, never in the config) — which is
 * what a sheet that got past the lint is — and plants `/etc/hosts` in it
 * (Linux and macOS both have one; macOS has no `/etc/hostname`, which this
 * test planted until the move to a Mac, 2026-09-26), with enough `../` to
 * reach the root from wherever the scratch folder sits,
 * next to a real art file and an `?inline` of it. The check must name the
 * copied file and the `data:` URL, pass the art, and delete the build.
 *
 * `node --test` rather than vitest, like `workshop-lint.test.mjs` beside it:
 * a TypeScript test importing this `.mjs` breaks `pnpm build`'s `tsc`.
 */

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CONFIG = join(ROOT, 'vite.workshop.config.ts');
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 4"><rect width="4" height="4"/></svg>\n';
const REDUCE = '@media (prefers-reduced-motion: reduce) {}\n';

const scratch = [];
let baseline;

before(async () => {
    process.chdir(ROOT);
    // The kit config refuses to build without a command named, as
    // `scripts/workshop.mjs` names it.
    process.env.STALL_WORKSHOP_CMD = 'probe';
    baseline = await kitBaseline({ configFile: CONFIG });
});
after(() => {
    for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

/** A scratch kit folder holding `art/a.svg` and the sheet `sheetFor(dir)` writes. */
function kit(sheetFor) {
    const dir = mkdtempSync(join(tmpdir(), 'stall-kit-plant-'));
    scratch.push(dir);
    mkdirSync(join(dir, 'art'));
    writeFileSync(join(dir, 'art', 'a.svg'), SVG);
    writeFileSync(join(dir, 'theme-workshop.css'), sheetFor(dir));
    return dir;
}

/** The kit's config, built for real into `outDir` with its sheet import pointed at `dir`'s. */
async function plantedBuild(dir, outDir) {
    const { build } = await import('vite');
    const sheet = join(dir, 'theme-workshop.css');
    await build({
        root: ROOT,
        configFile: CONFIG,
        logLevel: 'silent',
        build: { outDir, emptyOutDir: true },
        plugins: [
            {
                name: 'test:plant-sheet',
                enforce: 'pre',
                resolveId(source) {
                    return /[/\\]workshop[/\\]theme-workshop\.css$/.test(source) ? sheet : undefined;
                },
            },
        ],
    });
}

describe('the-kit-build-emits-no-file-it-was-not-given', () => {
    it('names /etc/hosts and an inlined file, passes the art, and deletes the build', async () => {
        assert.ok(existsSync('/etc/hosts'), 'this test plants /etc/hosts and needs one to exist');
        const dir = kit(
            (at) =>
                '.t-workshop .a { background: url(art/a.svg); }\n' +
                // Enough `../` to reach the root from the sheet, whatever the depth.
                `.t-workshop .b { background: url(${'../'.repeat(resolve(at).split(sep).length)}etc/hosts); }\n` +
                '.t-workshop .c { background: url(art/a.svg?inline); }\n' +
                REDUCE,
        );
        const outDir = join(dir, 'out');
        await plantedBuild(dir, outDir);
        assert.ok(existsSync(outDir), 'the planted build wrote its output');

        const problems = kitBuildProblems({ outDir, artDir: join(dir, 'art'), baseline });
        assert.equal(problems.length, 2, problems.join('\n'));
        assert.ok(
            problems.some((p) => /^assets\/hosts-[A-Za-z0-9_-]{8}\.?: neither a file/.test(p)),
            problems.join('\n'),
        );
        assert.ok(problems.some((p) => /\.css: carries 1 data: URL/.test(p)), problems.join('\n'));
        assert.ok(!problems.some((p) => p.startsWith('assets/a-')), 'the art file is accounted for');

        await assert.rejects(
            requireCleanKitBuild({ configFile: CONFIG, outDir, artDir: join(dir, 'art'), baseline }),
            /emitted 2 files it was not given[\s\S]*assets\/hosts-[\s\S]*has been deleted/,
        );
        assert.equal(existsSync(outDir), false, 'the refused build is deleted');
    });

    it('passes a build whose sheet reaches only its own art', async () => {
        const dir = kit(() => `.t-workshop .a { background: url(art/a.svg); }\n${REDUCE}`);
        const outDir = join(dir, 'out');
        await plantedBuild(dir, outDir);
        assert.deepEqual(kitBuildProblems({ outDir, artDir: join(dir, 'art'), baseline }), []);
        // The same bytes named as art the folder does not list are a stranger.
        rmSync(join(dir, 'art', 'a.svg'));
        const unlisted = kitBuildProblems({ outDir, artDir: join(dir, 'art'), baseline });
        assert.equal(unlisted.length, 1, unlisted.join('\n'));
        assert.match(unlisted[0], /^assets\/a-[A-Za-z0-9_-]{8}\.svg: neither a file/);
    });
});
