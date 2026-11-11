// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';

/**
 * **`the-contrast-plan-splits-by-look`** (the probe-prune critic's item 4;
 * D-2026-11-11-04). The ordinary run's contrast plan over every look a
 * build carrying the tracked fixture measures is exactly the public looks'
 * plan and each carried look's plan put together, by job key, with no job in
 * two of them — so the look run (`--looks carried`, `carriedContrastPlan`)
 * and the ordinary run cannot leave a job between them. The plan's
 * sheet-naming inputs (`namesCopied`, `namesStep`: which looks' sheets name
 * `[data-copied]` and `data-figure-step`, read by the probe from the loaded
 * stylesheets) are arguments here, every way round, since a look that names
 * one gets jobs no other look has.
 *
 * And the look run's own plan is, of the ordinary plan, the carried looks'
 * jobs and every public look's job on a listed screen (`CARRIED_SCREENS`),
 * each the very job the ordinary plan holds, in its order.
 */
vi.mock('virtual:stall-private-looks', async () => (await import('./fixturePrivateLooks')).fixturePrivateLooksModule());

const { carriedContrastPlan, contrastPlan } = await import('./contrastPlan');
const { measuredLooks, privateLooks, publicLooks } = await import('./looks');
const { CARRIED_SCREEN_SET } = await import('./carriedScreens');
type Look = ReturnType<typeof measuredLooks>[number];

const all = measuredLooks();
const carried = privateLooks();
const pub = publicLooks();
const never = (): boolean => false;
const always = (): boolean => true;
const privately = (look: Look): boolean => look.carried === 'private';
const publicly = (look: Look): boolean => look.carried !== 'private';
const NAMINGS: ReadonlyArray<readonly [string, (look: Look) => boolean]> = [
    ['no look', never],
    ['every look', always],
    ['the carried looks', privately],
    ['the public looks', publicly],
];

describe('the-contrast-plan-splits-by-look', () => {
    it('measures a build that carries the fixture beside the public looks', () => {
        expect(carried.map((look) => look.theme.sheetClass)).toEqual(['t-fixture-private']);
        expect(all.map((look) => look.id).sort()).toEqual([...pub, ...carried].map((look) => look.id).sort());
    });

    for (const [copiedSaid, copied] of NAMINGS) {
        for (const [stepSaid, step] of NAMINGS) {
            it(`splits by look when ${copiedSaid} name [data-copied] and ${stepSaid} name data-figure-step`, () => {
                const whole = contrastPlan(all, copied, step).map((job) => job.key);
                const parts = [contrastPlan(pub, copied, step), ...carried.map((look) => contrastPlan([look], copied, step))].flat().map((job) => job.key);
                expect(new Set(whole).size, 'a key is one job').toBe(whole.length);
                expect(new Set(parts).size, 'no job in two parts').toBe(parts.length);
                expect([...parts].sort()).toEqual([...whole].sort());
                // The look run's plan: the carried looks' jobs and the public looks' on the listed screens, the ordinary plan's own jobs in its order.
                const look = carriedContrastPlan(all, carried, CARRIED_SCREEN_SET, copied, step);
                const ordinary = contrastPlan(all, copied, step);
                expect(look).toEqual(ordinary.filter((job) => carried.some((c) => c.id === job.look) || CARRIED_SCREEN_SET.has(job.screen)));
                const carriedKeys = new Set(carried.flatMap((c) => contrastPlan([c], copied, step)).map((job) => job.key));
                const witnessKeys = new Set(contrastPlan(pub, copied, step).filter((job) => CARRIED_SCREEN_SET.has(job.screen)).map((job) => job.key));
                expect(look.map((job) => job.key).sort()).toEqual([...carriedKeys, ...witnessKeys].sort());
            });
        }
    }

    it('gives the look run public jobs on the listed screens, and only there', () => {
        const look = carriedContrastPlan(all, carried, CARRIED_SCREEN_SET);
        const witness = look.filter((job) => !carried.some((c) => c.id === job.look));
        expect(witness.length).toBeGreaterThan(0);
        expect([...new Set(witness.map((job) => job.screen))].every((screen) => CARRIED_SCREEN_SET.has(screen))).toBe(true);
    });
});
