/**
 * The private looks a harness command measures (8e2): what a build with the
 * selection carries, read exactly as the build reads it, and the environment
 * that hands the same commit to every build the command makes.
 *
 * `harnessLooks(selection)` answers, for a whole selection
 * (`harnessSelection`, `scripts/looks-selection.mjs`):
 *
 * - `commit` — the private repository's commit the selection names, or its
 *   HEAD read **once**, here: a command that makes two builds (the probe's
 *   one build and its preview, `looks:diff`'s two sides) hands each the
 *   same commit, so the looks it measures are one commit's, never two;
 * - `looks` — the entries a build for the selection's target carries
 *   (`includedEntries`, which reads the public lists and never the index's
 *   own stage), each `{ id, slug, cls, paid }` (`paid` from the public
 *   list): the classes a command expects to see painted, derived and never
 *   listed by hand;
 * - `env` — the selection's three variables as a build reads them, the
 *   directory absolute and the commit pinned;
 * - `line` — one sentence naming what it measures, for the command to print
 *   before it builds, so a run's selection is on screen.
 *
 * With no selection it answers no looks, no git, and an empty `env`: the
 * command is the public one. Node built-ins and the private-look readers.
 * Test: `the-harness-reads-the-looks-a-selection-carries`
 * (`scripts/harness-looks.test.mjs`).
 */
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SELECTION_ENV } from './looks-selection.mjs';
import { publicLookFacts } from './private-looks.mjs';
import { includedEntries, selectedIndex, selectedTree } from './private-looks-build.mjs';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** What `selection` carries, read once (the docblock above). */
export async function harnessLooks(selection, { root = ROOT, facts, git, env = process.env } = {}) {
    if (selection === undefined) {
        return { commit: undefined, fixture: false, looks: [], env: {}, line: 'no private look selected — the public build' };
    }
    const known = facts ?? (await publicLookFacts());
    const tree = selectedTree({ root, selection, git, env });
    const { commit, index } = selectedIndex({ root, selection, facts: known, git, env });
    const looks = includedEntries(index, selection.target, known).map(({ id, slug, cls }) => ({ id, slug, cls, paid: known.paid.includes(id) }));
    const pinned = {
        [SELECTION_ENV.target]: selection.target,
        [SELECTION_ENV.dir]: resolve(root, selection.dir),
        [SELECTION_ENV.commit]: commit,
    };
    const what = looks.length === 0 ? 'no look' : looks.map((look) => `${look.slug} (${look.cls})`).join(', ');
    return {
        commit,
        fixture: tree.fixture,
        looks,
        env: pinned,
        line: `a ${selection.target} selection at ${tree.fixture ? 'the tracked fixture' : 'a private repository'}, commit ${commit.slice(0, 12)}: ${what}`,
    };
}
