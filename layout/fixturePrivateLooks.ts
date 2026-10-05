/**
 * The tracked private-look fixture (`layout/fixture-private-looks/`, step 8)
 * as the build hands it to the app: the entries `virtual:stall-private-looks`
 * exports when a build selects that directory at `preview` — its index's id
 * and class, a sheet URL, and its `look.json` parsed.
 *
 * **For tests that mock the module**, never for a page: a vitest run selects
 * no private look whatever the shell says (`scripts/private-looks-build.mjs`),
 * so a test that wants one says so —
 *
 *     vi.mock('virtual:stall-private-looks', async () =>
 *         (await import('../layout/fixturePrivateLooks')).fixturePrivateLooksModule(),
 *     );
 *
 * — and reads the fixture as the working tree holds it (`?raw`), the same
 * bytes a build of the committed fixture reads from git. The sheet URL is the
 * shape a build's is and names no file: a test that tries the look on, where
 * the renderer asks the loader for that sheet (8d1), records the ask rather
 * than sending it (`render.private.test.ts`), since a connected stylesheet
 * link is a request. Imported by tests alone (`gallery-is-not-served` holds
 * the production build clean of `layout/`).
 */
import type { PrivateLookSource } from '../src/domain/lookData';
import indexText from './fixture-private-looks/index.json?raw';
import lookText from './fixture-private-looks/fixture/look.json?raw';

/** The fixture's entries, freshly parsed on every call so no test can edit another's. */
export function fixturePrivateLooks(): PrivateLookSource[] {
    const index = JSON.parse(indexText) as { looks: { id: number; slug: string; cls: `t-${string}` }[] };
    const entry = index.looks.find((look) => look.slug === 'fixture');
    if (entry === undefined || index.looks.length !== 1) {
        throw new Error('the tracked fixture index names one look, "fixture"');
    }
    return [{ id: entry.id, sheetClass: entry.cls, sheetUrl: '/assets/sheet-fixture.css', look: JSON.parse(lookText) as unknown }];
}

/** The whole module a build that selects the fixture at `preview` answers: the literal switch, and the entries. */
export function fixturePrivateLooksModule(): { carriesPrivateLooks: boolean; privateLooks: PrivateLookSource[] } {
    return { carriesPrivateLooks: true, privateLooks: fixturePrivateLooks() };
}
