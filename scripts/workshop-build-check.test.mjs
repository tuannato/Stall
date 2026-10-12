import { strict as assert } from 'node:assert';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { LOOKS_ENV } from './looks-selection.mjs';
import { plantFace, removePlants } from './private-looks-plant.mjs';
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

// The kit's builds are the public app's beside the kit: a private-look
// selection in the shell running the suite is not this test's subject.
for (const name of LOOKS_ENV) {
    delete process.env[name];
}
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
    removePlants();
    for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

/** A scratch kit folder holding `art/a.svg` and the sheet `sheetFor(dir)` writes. */
function kit(sheetFor) {
    // The real path: Vite resolves the sheet's `?transform-only` twin to it
    // (macOS's temporary directory sits behind the `/var` link), and the
    // `?url` import must name the same module or its CSS is not found.
    const dir = realpathSync(mkdtempSync(join(tmpdir(), 'stall-kit-plant-')));
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
                    // The kit's pages import the sheet with `?url` (8d1): the
                    // query rides on to the planted file.
                    const [path, query] = source.split('?');
                    if (!/[/\\]workshop[/\\]theme-workshop\.css$/.test(path)) return undefined;
                    return query === undefined ? sheet : `${sheet}?${query}`;
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

describe('the-kit-check-holds-the-deploy-notices-to-the-selection', () => {
    /**
     * The private-looks plugin writes `licenses.txt` into a build's outDir as
     * the public notices followed by the faces the carried looks serve
     * (`noticesWithLookFonts`) — in `writeBundle`, which the baseline's
     * in-memory build (`write: false`) never runs. Under a selection whose
     * look serves a face the file is neither a byte copy of `public/` nor a
     * baseline output, so the check refused it and deleted the outDir:
     * `pnpm workshop:shots` could not run (the 8g0 critic's P2-3). The kit
     * check accepts that one file when it is byte for byte what
     * `noticesWithLookFonts` makes of the public notices and the faces the
     * baseline's own selection carries, and nothing else.
     *
     * The subject is a real kit build under a planted look serving a
     * synthetic face — the machinery of `a-deploy-build-names-every-face-it-serves`
     * (`plantFace`) — with the selection in this process's environment, as
     * `scripts/workshop.mjs` leaves it (`Object.assign(process.env, looks.env)`).
     */
    let selected;
    let outDir;
    let served;
    let publicNotices;

    /** The kit's config, built for real into `outDir` with the sheet it ships. */
    async function kitBuild(into) {
        const { build } = await import('vite');
        await build({ root: ROOT, configFile: CONFIG, logLevel: 'silent', build: { outDir: into, emptyOutDir: true } });
    }

    /** Run `fn` with `selection` in the environment, and the environment as it was after. */
    async function selecting(selection, fn) {
        const was = Object.fromEntries(LOOKS_ENV.map((name) => [name, process.env[name]]));
        Object.assign(process.env, selection);
        try {
            return await fn();
        } finally {
            for (const [name, value] of Object.entries(was)) {
                if (value === undefined) delete process.env[name];
                else process.env[name] = value;
            }
        }
    }

    /** A copy of the selected build's outDir with `licenses.txt` replaced by `bytes`. */
    function withNotices(bytes) {
        const copy = join(realpathSync(mkdtempSync(join(tmpdir(), 'stall-kit-notices-'))), 'out');
        scratch.push(join(copy, '..'));
        cpSync(outDir, copy, { recursive: true });
        writeFileSync(join(copy, 'licenses.txt'), bytes);
        return copy;
    }

    const problemsOf = (dir, over = selected) => kitBuildProblems({ outDir: dir, artDir: 'workshop/art', baseline: over });
    const noticesProblems = (problems) => problems.filter((p) => p.startsWith('licenses.txt:'));

    before(async () => {
        const repo = plantFace();
        outDir = join(realpathSync(mkdtempSync(join(tmpdir(), 'stall-kit-selected-'))), 'out');
        scratch.push(join(outDir, '..'));
        await selecting(repo.selection, async () => {
            selected = await kitBaseline({ configFile: CONFIG });
            await kitBuild(outDir);
        });
        served = readFileSync(join(outDir, 'licenses.txt'));
        publicNotices = readFileSync(join(ROOT, 'public', 'licenses.txt'));
    });

    it('is a subject: the deploy build wrote more than the public notices', () => {
        assert.ok(served.length > publicNotices.length, 'the deploy notices name the planted face after the public ones');
        assert.ok(served.subarray(0, publicNotices.length).equals(publicNotices), 'and begin with the public notices byte for byte');
        assert.ok(served.toString('utf8').includes('Plant Serif'), 'the planted face is named');
    });

    it('accepts the notices the deploy build writes for the selection it was built under', async () => {
        assert.deepEqual(problemsOf(outDir), []);
        await requireCleanKitBuild({ configFile: CONFIG, artDir: 'workshop/art', outDir, baseline: selected });
        assert.ok(existsSync(join(outDir, 'licenses.txt')), 'an accepted build is kept');
    });

    it('refuses the same file one byte longer, one byte shorter and one byte different', () => {
        const longer = Buffer.concat([served, Buffer.from('x')]);
        const shorter = served.subarray(0, served.length - 1);
        const different = Buffer.from(served);
        const at = different.indexOf('Plant Serif');
        different[at] = different[at] ^ 0x01;
        for (const [name, bytes] of [['longer', longer], ['shorter', shorter], ['different', different]]) {
            const problems = noticesProblems(problemsOf(withNotices(bytes)));
            assert.equal(problems.length, 1, `${name}: ${problems.join('\n')}`);
            assert.match(problems[0], /^licenses\.txt: /, name);
        }
    });

    it('refuses the public notices followed by anything but the selection\'s faces', () => {
        const extra = Buffer.concat([served, Buffer.from('\nA face this selection does not carry.\n')]);
        assert.equal(noticesProblems(problemsOf(withNotices(extra))).length, 1);
        // Nothing of the faces: the public notices alone are still a byte copy of public/.
        assert.deepEqual(noticesProblems(problemsOf(withNotices(publicNotices))), []);
    });

    it('does not vouch for a file the baseline\'s own selection does not make', () => {
        // A baseline built with no selection carries no faces: the deploy
        // text is a stranger to it, and so is anything else with the public
        // notices as a prefix.
        const none = baseline;
        assert.equal(none.notices, undefined);
        assert.equal(noticesProblems(problemsOf(outDir, none)).length, 1);
    });
});
