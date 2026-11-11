/**
 * **What the probe's public verdict is a function of, and whether it moved**
 * (the probe-prune critic's item 6; D-2026-11-11-04). The look run (`pnpm
 * test:layout:look`, `--looks carried`) measures the private looks a build
 * carries and leaves the public looks to the ordinary run (`pnpm
 * test:layout`). It refuses nothing on that account; its first line says
 * which green ordinary run of this checkout the public looks rest on, and
 * whether the probe's public inputs have moved since — never the HEAD tree,
 * which a commit touching only a manual moves.
 *
 * The inputs:
 * - **the probe build's public modules**: every real file Rollup loaded for
 *   the probe build (`probeInputsPlugin`, in `vite.probe.config.ts`, which
 *   writes the list where the runner asks, `STALL_PROBE_INPUTS`), the
 *   app's sources, the harness's, the stylesheets, the faces and every
 *   `node_modules` file the bundle took — less the private parts: the
 *   selection's directory, the files the private-looks build writes for the
 *   looks it carries (`MATERIALISED_PREFIX`) and the virtual module that
 *   names them;
 * - the configs and the lockfile, named (`FIXED_INPUTS`);
 * - **the runner's own scripts**: `layout-check.mjs` and every module it
 *   reaches by a relative import (`runnerClosure`);
 * - the Chrome, the Node and the tab count the run measured with.
 *
 * A green ordinary run records them (`.layout-dump/public-green.json`,
 * ignored by git, so any process on this machine can write it — it is a
 * printed pointer, never a gate), and the look run re-hashes the recorded
 * files from the disk before its build — a module added to the graph needs
 * an import added to a file already in it, so a change to the list is a
 * change to a recorded file — and compares the fresh list after it.
 *
 * Not held, stated: the machine's own fonts (a CJK fallback the
 * `a-cjk-name-is-set-in-a-cjk-face` rule reads), Chrome's flags and
 * profile, the load on the machine, and anything a module reads at build
 * time that Rollup does not load as a module. Test: `probe-inputs.test.mjs`.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

/** The files the probe's verdict reads beside its module graph. */
export const FIXED_INPUTS = Object.freeze(['package.json', 'pnpm-lock.yaml', 'vite.config.ts', 'vite.probe.config.ts']);

/** Where a green ordinary run's inputs are recorded. */
export const GREEN_RECORD = join('.layout-dump', 'public-green.json');

/** The prefix of the directories the private-looks build writes its checked files to (`scripts/private-looks-build.mjs`). */
const MATERIALISED = 'stall-private-looks-';

function real(path) {
    try {
        return realpathSync(path);
    } catch {
        return resolve(path);
    }
}

/**
 * Whether a module id is one of the probe build's public inputs: a real
 * file, not a virtual module, not under the selection's directory and not
 * one the private-looks build wrote.
 */
export function isPublicInput(id, { looksDir, tmp = tmpdir() } = {}) {
    if (id.startsWith('\0') || id.startsWith('virtual:')) return false;
    const file = id.split('?')[0];
    if (!isAbsolute(file) || !existsSync(file)) return false;
    const at = real(file);
    const under = (dir) => at === dir || at.startsWith(dir.endsWith(sep) ? dir : dir + sep);
    if (looksDir !== undefined && under(real(looksDir))) return false;
    const t = real(tmp);
    if (under(t) && relative(t, at).split(sep)[0].startsWith(MATERIALISED)) return false;
    return true;
}

/**
 * The Vite plugin: lists the build's public inputs, relative to the root,
 * sorted, into the file `STALL_PROBE_INPUTS` names — and does nothing when
 * it names none (every build but the runner's).
 */
export function probeInputsPlugin({ env = process.env, root = process.cwd() } = {}) {
    return {
        name: 'stall:probe-inputs',
        apply: 'build',
        generateBundle() {
            const out = env.STALL_PROBE_INPUTS;
            if (out === undefined || out === '') return;
            const looksDir = env.STALL_LOOKS_DIR === undefined || env.STALL_LOOKS_DIR === '' ? undefined : resolve(root, env.STALL_LOOKS_DIR);
            const files = new Set();
            for (const id of this.getModuleIds()) {
                if (!isPublicInput(id, { looksDir })) continue;
                const at = real(id.split('?')[0]);
                const rel = relative(real(root), at);
                files.add(rel.startsWith('..') ? at : rel.split(sep).join('/'));
            }
            writeFileSync(out, `${JSON.stringify([...files].sort(), null, 1)}\n`);
        },
    };
}

/** `layout-check.mjs` and every module it reaches by a relative import, as paths relative to the root, sorted. */
export function runnerClosure(entry = 'scripts/layout-check.mjs', root = process.cwd()) {
    const seen = new Set();
    const walk = (rel) => {
        if (seen.has(rel)) return;
        seen.add(rel);
        const text = readFileSync(join(root, rel), 'utf8');
        for (const m of text.matchAll(/(?:^|\n)\s*(?:import|export)\b[^'"`;]*?from\s*['"](\.\.?\/[^'"]+)['"]|import\(\s*['"](\.\.?\/[^'"]+)['"]\s*\)/g)) {
            const spec = m[1] ?? m[2];
            const next = relative(root, resolve(root, dirname(rel), spec)).split(sep).join('/');
            if (existsSync(join(root, next))) walk(next);
        }
    };
    walk(entry);
    return [...seen].sort();
}

/** Each file's sha-256, by path (`missing` for a file not on the disk). */
export function hashFiles(paths, root = process.cwd()) {
    const out = {};
    for (const path of paths) {
        const at = isAbsolute(path) ? path : join(root, path);
        out[path] = existsSync(at) ? createHash('sha256').update(readFileSync(at)).digest('hex') : 'missing';
    }
    return out;
}

/** The record a run makes of its inputs: the module list it was built from, every file's hash, and the instruments. */
export function inputsRecord({ modules, root = process.cwd(), chrome, node = process.version, tabs }) {
    const files = [...new Set([...modules, ...FIXED_INPUTS, ...runnerClosure('scripts/layout-check.mjs', root)])].sort();
    return { modules: [...modules].sort(), hashes: hashFiles(files, root), chrome, node, tabs };
}

/**
 * How `now` differs from `then`, as short phrases — empty when the inputs
 * are the same. `then` and `now` are `inputsRecord`s; `now.modules` may be
 * absent (before the build: only the recorded files re-hashed).
 */
export function inputsDiffer(then, now) {
    const out = [];
    const changed = Object.keys(then.hashes).filter((path) => now.hashes[path] !== undefined && now.hashes[path] !== then.hashes[path]);
    const added = Object.keys(now.hashes).filter((path) => then.hashes[path] === undefined);
    const gone = now.modules === undefined ? [] : Object.keys(then.hashes).filter((path) => now.hashes[path] === undefined);
    const list = (paths) => `${paths.slice(0, 6).join(', ')}${paths.length > 6 ? `, and ${paths.length - 6} more` : ''}`;
    if (changed.length > 0) out.push(`${changed.length} file(s) changed (${list(changed)})`);
    if (added.length > 0) out.push(`${added.length} file(s) added (${list(added)})`);
    if (gone.length > 0) out.push(`${gone.length} file(s) no longer read (${list(gone)})`);
    for (const field of ['chrome', 'node', 'tabs']) {
        if (now[field] !== undefined && then[field] !== now[field]) out.push(`${field} ${then[field]} → ${now[field]}`);
    }
    return out;
}

/** The recorded green ordinary run, or undefined (none, or not readable as one). */
export function readGreen(root = process.cwd()) {
    try {
        const green = JSON.parse(readFileSync(join(root, GREEN_RECORD), 'utf8'));
        return green !== null && typeof green === 'object' && green.inputs?.hashes !== undefined ? green : undefined;
    } catch {
        return undefined;
    }
}

/** The look run's line about the public looks, before its build: the last green ordinary run, and whether the recorded inputs moved since. */
export function greenLine(green, now) {
    if (green === undefined) {
        return 'the public looks: no green pnpm test:layout is recorded in this checkout (.layout-dump/public-green.json) — this run measures the carried looks, and the public looks are pnpm test:layout\'s';
    }
    const differ = inputsDiffer(green.inputs, now);
    return (
        `the public looks: the last green pnpm test:layout of this checkout was ${green.at} (${green.rev ?? 'no git'}, ${green.selection ?? 'its selection not recorded'}); ` +
        (differ.length === 0 ? "the probe's public inputs are the same as that run's" : `the probe's public inputs differ from that run's: ${differ.join('; ')}`) +
        ' — this run measures the carried looks and refuses nothing on it'
    );
}
