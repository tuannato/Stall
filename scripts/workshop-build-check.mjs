/**
 * A kit build's output, held against what the build was given — the guard
 * that does not trust `pnpm workshop:lint`.
 *
 * The lint (`lintSheet` in `workshop-css.mjs`) refuses every `url()` that is
 * not `art/<name>.svg`, but a lint is a reading of the text and a build is
 * what reads the disk: a sheet that once passed it made a kit build copy
 * `/etc/hostname` into `assets/` and inline a file as a `data:` URL (the
 * intake critic's item 1, 2026-09-23). So every kit command that builds —
 * `pnpm workshop`, `workshop:shots`, `workshop:probe` — then holds the
 * outDir against a **baseline**: the same config built in memory
 * (`write: false`, which in Vite 7 neither empties nor writes the outDir)
 * with the kit's sheet swapped for a one-rule stand-in, so it names no art.
 *
 * The baseline is the kit config and not the app's, because the kit emits
 * its own pages and chunks (`gallery`, `probeWorkshop`, the shared ones)
 * that no production build has; comparing against production would have to
 * wave every `.js` through by extension, and a `url()` can emit a `.js`.
 * What is compared:
 *
 * - a file the baseline emits under the same name, byte for byte — every
 *   font, decoration and deck picture the app ships;
 * - an output the creator's files legitimately change (a chunk, a CSS
 *   bundle, an HTML entry), matched by its name with the content hash
 *   stripped, **as a multiset**: a stranger named like a real chunk
 *   (`url(…/render.js)` emits `assets/render-<hash>.js`) finds its name
 *   already taken;
 * - a copy of a file in `public/`, byte for byte;
 * - a copy of a plain file in `workshop/art/` (`readArt`: no link, one hard
 *   link), byte for byte under that file's own name;
 * - and no `data:` URL in the kit's CSS that the baseline's CSS does not
 *   carry — `?inline` puts a file's bytes inside the CSS bundle, where a
 *   listing of names cannot see them.
 *
 * Anything else fails the command and deletes the outDir. What it does not
 * read: the content of JS chunks (no CSS construct emits into one; the
 * creator's other file, `look.json`, enters them as a string through
 * `?raw`) and the HTML entries (built from `layout/`, never from the kit's
 * files). Test: `the-kit-build-emits-no-file-it-was-not-given`.
 */
import { lstatSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { ART_NAME, echo } from './workshop-css.mjs';

/** The kit's sheet, as the kit's pages import it. */
const KIT_SHEET = 'workshop/theme-workshop.css';

/**
 * What the baseline builds in the sheet's place: one real rule, so the kit's
 * CSS bundle exists in the baseline whatever the creator's sheet compiles to.
 */
const BASELINE_SHEET = '.t-workshop{outline-color:currentColor}\n@media (prefers-reduced-motion: reduce){}\n';

/** How many problems a failure prints before it counts the rest. */
const SHOWN = 20;

/**
 * The plain files a sheet may name: entries of `dir` matching `ART_NAME`
 * that are regular files with one link. A symlink, or a hard link, named
 * `kite.svg` is how a file from elsewhere would pass for art, so neither is
 * listed; a folder that is itself a link lists nothing.
 */
export function readArt(dir) {
    const names = new Set();
    let stat;
    try {
        stat = lstatSync(dir);
    } catch {
        return names;
    }
    if (!stat.isDirectory()) return names;
    for (const name of readdirSync(dir)) {
        if (!ART_NAME.test(name)) continue;
        const file = lstatSync(join(dir, name));
        if (file.isFile() && file.nlink === 1) names.add(name);
    }
    return names;
}

/** A hashed output name with its hash taken out: `assets/render-BBwUnGHe.js` → `assets/render.js`. */
function unhashed(fileName) {
    return fileName.startsWith('assets/') ? fileName.replace(/-[A-Za-z0-9_-]{8}(\.[^./]*)?$/, '$1') : fileName;
}

/** A path for a message: relative when it is inside the working directory, its last parts otherwise. */
function shown(path) {
    const rel = relative(process.cwd(), path);
    return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel) ? rel : `…/${path.split(/[/\\]/).slice(-2).join('/')}`;
}

/**
 * The baseline: the kit config built in memory with the sheet swapped for
 * `BASELINE_SHEET`. `STALL_WORKSHOP_CMD` must name the command, as it does
 * for the build being checked. Returns every output with its bytes and
 * whether the creator's files may change it, the resolved outDir and
 * publicDir, and the baseline's CSS text.
 */
export async function kitBaseline({ configFile, root = process.cwd() }) {
    const { build } = await import('vite');
    const sheet = resolve(root, KIT_SHEET);
    let resolved;
    const result = await build({
        root,
        configFile,
        logLevel: 'silent',
        build: { write: false },
        plugins: [
            {
                name: 'stall:kit-baseline',
                enforce: 'pre',
                configResolved(config) {
                    resolved = config;
                },
                load(id) {
                    return id.split('?')[0] === sheet ? BASELINE_SHEET : undefined;
                },
            },
        ],
    });
    const outputs = (Array.isArray(result) ? result : [result]).flatMap((r) => r.output);
    const css = new Set();
    for (const part of outputs) {
        if (part.type === 'chunk') {
            for (const name of part.viteMetadata?.importedCss ?? []) css.add(name);
        }
    }
    const files = new Map();
    let cssText = '';
    for (const part of outputs) {
        const bytes = Buffer.from(part.type === 'chunk' ? part.code : part.source);
        const isCss = css.has(part.fileName);
        const mayDiffer = part.type === 'chunk' || isCss || part.fileName.endsWith('.html');
        files.set(part.fileName, { bytes, mayDiffer });
        if (isCss) cssText += `${bytes.toString('utf8')}\n`;
    }
    return {
        files,
        cssText,
        outDir: resolve(resolved.root, resolved.build.outDir),
        publicDir: resolved.publicDir,
    };
}

function walk(dir, base = dir, out = []) {
    for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        const stat = lstatSync(path);
        if (stat.isDirectory()) walk(path, base, out);
        else out.push({ rel: relative(base, path).split(/[/\\]/).join('/'), path, stat });
    }
    return out;
}

function sameBytes(path, bytes) {
    try {
        const stat = lstatSync(path);
        return stat.isFile() && readFileSync(path).equals(bytes);
    } catch {
        return false;
    }
}

/**
 * Every file in `outDir` that `baseline` and `artDir` do not account for,
 * as sentences — empty when the build emitted only what it was given.
 */
export function kitBuildProblems({ outDir, artDir, baseline }) {
    const problems = [];
    const art = readArt(artDir);
    const open = new Map();
    for (const [fileName, entry] of baseline.files) {
        if (!entry.mayDiffer) continue;
        const key = unhashed(fileName);
        open.set(key, (open.get(key) ?? 0) + 1);
    }
    const take = (key) => {
        const left = open.get(key) ?? 0;
        if (left === 0) return false;
        open.set(key, left - 1);
        return true;
    };
    const files = walk(outDir);
    const rest = [];
    // First every file the baseline emits under the very same name, so a
    // stranger shaped like a real chunk is the one left without a place.
    for (const file of files) {
        const known = baseline.files.get(file.rel);
        if (!file.stat.isFile()) {
            problems.push(`${echo(file.rel)}: not a plain file`);
        } else if (known === undefined) {
            rest.push(file);
        } else if (known.mayDiffer) {
            take(unhashed(file.rel));
        } else if (!readFileSync(file.path).equals(known.bytes)) {
            problems.push(`${echo(file.rel)}: not the bytes the app's build emits under that name`);
        }
    }
    const copies = new Set();
    for (const file of rest) {
        const bytes = readFileSync(file.path);
        if (baseline.publicDir && sameBytes(join(baseline.publicDir, file.rel), bytes)) {
            copies.add(file.rel);
            continue;
        }
        const key = unhashed(file.rel);
        if (take(key)) continue;
        const artName = key.startsWith('assets/') ? key.slice('assets/'.length) : undefined;
        if (artName !== undefined && art.has(artName) && sameBytes(join(artDir, artName), bytes)) continue;
        problems.push(`${echo(file.rel)}: neither a file the app's build emits nor one in workshop/art/`);
    }
    const baselineData = new Set(baseline.cssText.match(/data:[^\s"')]{0,64}/gi) ?? []);
    for (const file of files) {
        if (!file.rel.endsWith('.css') || !file.stat.isFile() || copies.has(file.rel)) continue;
        const found = readFileSync(file.path, 'utf8').match(/data:[^\s"')]{0,64}/gi) ?? [];
        const stray = found.filter((url) => !baselineData.has(url));
        if (stray.length > 0) {
            problems.push(
                `${echo(file.rel)}: carries ${stray.length} data: URL${stray.length === 1 ? '' : 's'} ` +
                    `the app's CSS does not (${echo(stray[0], 32)})`,
            );
        }
    }
    return problems;
}

/**
 * The gate the kit's commands run after every build: build the baseline,
 * hold the outDir against it, and on any problem delete the outDir and
 * throw with the list. `outDir` defaults to the config's own; `baseline`
 * may be passed in when one is already built.
 */
export async function requireCleanKitBuild({ configFile, artDir = 'workshop/art', outDir, baseline }) {
    const base = baseline ?? (await kitBaseline({ configFile }));
    const dir = outDir ?? base.outDir;
    const problems = kitBuildProblems({ outDir: dir, artDir, baseline: base });
    if (problems.length === 0) return;
    rmSync(dir, { recursive: true, force: true });
    const listed = problems.slice(0, SHOWN).map((p) => `    ${p}`);
    if (problems.length > SHOWN) listed.push(`    … and ${problems.length - SHOWN} more`);
    throw new Error(
        `the kit build emitted ${problems.length} file${problems.length === 1 ? '' : 's'} it was not given — ` +
            `a sheet reaches only url(art/<name>.svg):\n${listed.join('\n')}\n` +
            `  ${shown(dir)} has been deleted; nothing from this build is served.`,
    );
}
