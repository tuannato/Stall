/**
 * **What each `--looks` mode of `layout-check.mjs` decides**, as one pinned
 * table (the probe-split critic's P3): the look run's branches
 * (`--looks carried`, D-2026-11-11-04) read a field here and nothing else,
 * so a refactor that turns one on in the default run (`shipped`) has to
 * change this table, which `the-default-run-turns-no-look-run-branch-on`
 * pins by value — or write a condition of its own, which the same test's
 * static half refuses (no `CARRIED_RUN`, and no `'carried'` in the runner but
 * at the mode's own parse).
 *
 * - `carried`: the page is asked for the look run (`?looks=carried`) and its
 *   echo held; the transparency pass and every pass that measured no listed
 *   screen expect the carried looks alone; the plan holds no public job off a
 *   listed screen.
 * - `witnesses`: the public looks are painted on the listed screens alone —
 *   left out of every per-look owe, the shipped rows and the skeleton's
 *   ladder owed by nobody, the sign names owed by the carried looks, Grid
 *   horizon's worst read on a carried look's job as a kit run reads it.
 * - `publicTogether`: the public looks' together-owes — `CODES_REQUIRED` and
 *   their 1d modules on the public looks' jobs, their 1a clip ratio.
 * - `recordsGreen`: a green run records its public inputs (`probe-inputs.mjs`).
 * - `saysGreen`: the run's first line names the last green ordinary run.
 */
export const LOOK_MODES = Object.freeze(['shipped', 'workshop', 'carried']);

/** The mode's decisions, or undefined for a mode the runner has none of. */
export function lookMode(looks) {
    if (!LOOK_MODES.includes(looks)) return undefined;
    const carried = looks === 'carried';
    return Object.freeze({
        looks,
        carried,
        witnesses: carried,
        publicTogether: !carried,
        recordsGreen: looks === 'shipped',
        saysGreen: carried,
    });
}
