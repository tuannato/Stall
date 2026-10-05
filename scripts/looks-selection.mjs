/**
 * Which private looks a run selects, by name (step 8b2): the three
 * environment variables `scripts/private-looks-build.mjs` reads, and the
 * refusal every harness command makes until it is taught to read them.
 *
 * - `STALL_LOOKS_TARGET` — `preview` or `production`;
 * - `STALL_LOOKS_DIR` — the private repository's root, or the tracked
 *   fixture's directory;
 * - `STALL_LOOKS_COMMIT` — optional, 40 lower-case hex.
 *
 * **A harness command measures the public build until 8e2 teaches it a
 * private look** (the 8b2 critic's item 2): `pnpm test:layout`,
 * `looks:diff`, the workshop's commands, the print measurement and the
 * notices each build through the app's config, which would carry whatever
 * the shell names — and a verdict over a bundle nobody asked for is worse
 * than none (measured: the probe passed green over the fixture look, and
 * said nothing). So each calls `refuseSelection` before it builds anything
 * and stops, naming the three variables, when any is set
 * (`a-harness-command-refuses-a-selection-until-it-reads-one`). A test that
 * starts one of them, or builds in-process, takes the variables out of its
 * environment (`withoutSelection`). Node built-ins only; a `.d.mts` beside it.
 */

/** The environment variables that select a build's private looks. */
export const SELECTION_ENV = Object.freeze({
    target: 'STALL_LOOKS_TARGET',
    dir: 'STALL_LOOKS_DIR',
    commit: 'STALL_LOOKS_COMMIT',
});

/**
 * Set by a run that must carry private looks — the deploy job (8c), on the
 * job, so its build and its tests share it: a build that selects none fails,
 * and the static guards refuse to read anything but the selection the build
 * carries (`guardSheets`, `scripts/served-sheets.mjs`). Any value but empty
 * or `0` sets it.
 */
export const REQUIRED_ENV = 'STALL_LOOKS_REQUIRED';

/** Whether `env` requires a private-look selection. */
export function selectionRequired(env) {
    const value = env[REQUIRED_ENV];
    return value !== undefined && value !== '' && value !== '0';
}

/** The two targets a selection may name. */
export const LOOKS_TARGETS = Object.freeze(['preview', 'production']);

/** The tracked fixture's directory, from the checkout's root: the one place inside this checkout a build reads a look from. */
export const FIXTURE_LOOKS_DIR = 'layout/fixture-private-looks';

const FULL_COMMIT = /^[0-9a-f]{40}$/;
const present = (value) => value !== undefined && value !== '';

/**
 * The selection `env` names: `undefined` when it names none, `{ target,
 * dir, commit? }` when it names one. Throws on half a selection, an unknown
 * target or a commit that is not 40 lower-case hex — a build that guessed
 * would carry the wrong looks to the wrong place.
 */
export function selectionFromEnv(env) {
    const target = env[SELECTION_ENV.target];
    const dir = env[SELECTION_ENV.dir];
    const commit = env[SELECTION_ENV.commit];
    if (!present(target) && !present(dir) && !present(commit)) {
        return undefined;
    }
    const problems = [];
    if (!LOOKS_TARGETS.includes(target)) {
        problems.push(`${SELECTION_ENV.target} is ${JSON.stringify(target ?? null)}, where a selection names one of ${LOOKS_TARGETS.join(', ')}`);
    }
    if (!present(dir)) {
        problems.push(`${SELECTION_ENV.dir} is not set, where a selection names the private repository's root (or ${FIXTURE_LOOKS_DIR})`);
    }
    if (present(commit) && !FULL_COMMIT.test(commit)) {
        problems.push(`${SELECTION_ENV.commit} is ${JSON.stringify(commit)}, where it is a full commit, 40 lower-case hex`);
    }
    if (problems.length > 0) {
        throw new Error(`private looks: the selection is not whole:\n  - ${problems.join('\n  - ')}`);
    }
    return { target, dir, ...(present(commit) ? { commit } : {}) };
}

/** Every variable a selection run carries: the three that name it, and the one that requires it. */
export const LOOKS_ENV = Object.freeze([...Object.values(SELECTION_ENV), REQUIRED_ENV]);

/** `env` with the selection's variables taken out, `STALL_LOOKS_REQUIRED` included: what a test hands a command it starts, or a build it runs. */
export function withoutSelection(env) {
    const out = { ...env };
    for (const name of LOOKS_ENV) {
        delete out[name];
    }
    return out;
}

/** Why `command` will not run under `env`, or undefined: any of the selection's variables set, whole or not, or the one that requires one. */
export function selectionRefusal(command, env) {
    const set = LOOKS_ENV.filter((name) => present(env[name]));
    if (set.length === 0) {
        return undefined;
    }
    return `${command}: ${set.join(', ')} ${set.length === 1 ? 'is' : 'are'} set — until 8e2 this command measures the public build only; run it with none of ${LOOKS_ENV.join(', ')} set`;
}

/** Stop `command` here, before it builds anything, when `env` selects a private look. */
export function refuseSelection(command, env = process.env) {
    const refusal = selectionRefusal(command, env);
    if (refusal !== undefined) {
        process.stderr.write(`${refusal}\n`);
        process.exit(2);
    }
}
