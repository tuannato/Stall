// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME_ID, NEO_CITY_THEME_ID } from '../src/domain/theme';
import { WINDOW_MIN_PX } from '../src/ui/render';
import { CONTRAST_VIEWPORTS, RAIN_JOBS, WORN_ALL, contrastPlan, type ContrastJob } from './contrastPlan';
import { CANVAS_SCREENS, GEOMETRY_ONLY_SCREENS, NO_DECOR_SCREENS, SCREENS } from './fixtures';
import { SKELETON_LOOK_ID, measuredLooks, shippedLooks, type Look } from './looks';
import { lookFromJson } from './workshopLook';
import { KIT_SKELETON } from './workshopStarter';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function count(jobs: readonly ContrastJob[], viewport: string): number {
    return jobs.filter((job) => job.viewport === viewport).length;
}

/**
 * What the contrast pass owes, held to the fixture table and the runner
 * rather than to `contrastPlan` itself — and its size pinned by value, so a
 * screen, a look or a variant that joins or leaves the pass is a line in a
 * diff someone reads, not a number that drifted on a green run.
 */
describe('the-contrast-plan-is-every-job-the-pass-owes', () => {
    const looks = measuredLooks();
    const jobs = contrastPlan(looks);

    it('holds the pass’s size by value, viewport by viewport', () => {
        // Three shipped looks and the skeleton. A change here is a change to
        // what the guard samples — and, at ~0.4 s a job, to what it costs.
        expect(looks.map((look) => look.id)).toEqual([1, 2, 3, SKELETON_LOOK_ID]);
        expect({
            mobile: count(jobs, 'mobile'),
            desktop: count(jobs, 'desktop'),
            canvas: count(jobs, 'canvas'),
            total: jobs.length,
        }).toEqual({ mobile: 197, desktop: 225, canvas: 29, total: 451 });
    });

    it('walks the runner’s own viewports', () => {
        expect(CONTRAST_VIEWPORTS.map((vp) => [vp.name, vp.width, vp.height, vp.canvas])).toEqual([
            ['mobile', 390, 844, false],
            ['desktop', 1280, 900, false],
            ['canvas', 1920, 1080, true],
        ]);
        const runner = readFileSync(join(ROOT, 'scripts/layout-check.mjs'), 'utf8');
        expect(runner).toContain("{ name: 'mobile', width: 390, height: 844 }");
        expect(runner).toContain("{ name: 'desktop', width: 1280, height: 900 }");
        expect(runner).toContain("const CANVAS = { name: 'canvas', width: 1920, height: 1080 }");
        expect(WINDOW_MIN_PX).toBeGreaterThan(390);
        expect(WINDOW_MIN_PX).toBeLessThanOrEqual(1280);
    });

    it('samples every screen a look can wear, where the probe measures it, less the overlay’s and the geometry-only', () => {
        // Derived from the fixture table, not through `screensAt`. The rain's
        // own jobs (Neo worn on five geometry-only screens) are held below.
        const sampled = (name: string): boolean =>
            (!NO_DECOR_SCREENS.has(name) ||
                ['broadcast', 'broadcast-ticker'].includes(name)) &&
            !GEOMETRY_ONLY_SCREENS.has(name);
        const page = Object.keys(SCREENS).filter((name) => !CANVAS_SCREENS.has(name) && sampled(name));
        const at = (viewport: string): string[] => [
            ...new Set(
                jobs
                    .filter((job) => job.viewport === viewport && !RAIN_JOBS.includes(job.screen))
                    .map((job) => job.screen),
            ),
        ];
        expect(at('desktop').sort()).toEqual([...page].sort());
        expect(at('mobile').sort()).toEqual(page.filter((name) => SCREENS[name]!.window === undefined).sort());
        expect(at('canvas').sort()).toEqual([...CANVAS_SCREENS].filter(sampled).sort());
    });

    it('paints each screen under every look that can wear it, bare and fully worn where decorations paint', () => {
        const byCell = new Map<string, ContrastJob[]>();
        // The reduced-motion jobs are a second paint of a planned one, held
        // below; the rest are one job per look and variant.
        for (const job of jobs.filter((j) => j.reduced !== true && !RAIN_JOBS.includes(j.screen))) {
            const cell = `${job.viewport}/${job.screen}`;
            byCell.set(cell, [...(byCell.get(cell) ?? []), job]);
        }
        // The door wears nothing since 2026-09-24, so it is painted bare
        // alone, like the overlay.
        const variantsOf = (look: Look, screen: string): string[] =>
            look.rows.length === 0 || NO_DECOR_SCREENS.has(screen) || screen === 'door'
                ? [`${look.id}:0`]
                : [`${look.id}:0`, `${look.id}:${WORN_ALL}`];
        for (const [cell, list] of byCell) {
            const screen = cell.split('/')[1]!;
            const wearers = screen === 'door' ? looks.filter((look) => look.id === DEFAULT_THEME_ID) : looks;
            expect(list.map((job) => `${job.look}:${job.flags}`), cell).toEqual(
                wearers.flatMap((look) => variantsOf(look, screen)),
            );
            for (const job of list) {
                expect(job.sheetClass, cell).toBe(looks.find((look) => look.id === job.look)!.theme.sheetClass);
            }
        }
        // One key per job: the runner's exactly-once check counts by key.
        expect(new Set(jobs.map((job) => job.key)).size).toBe(jobs.length);
        // Rural's swaying price tag, read stilled: `unbuyable` a second time,
        // under reduced motion, bare and worn, at the phone and the desk.
        expect(jobs.filter((j) => j.reduced === true).map((j) => j.key)).toEqual([
            'mobile/unbuyable/3/0/reduce',
            `mobile/unbuyable/3/${WORN_ALL}/reduce`,
            'desktop/unbuyable/3/0/reduce',
            `desktop/unbuyable/3/${WORN_ALL}/reduce`,
        ]);
        expect(jobs.every((job) => job.flags === 0 || job.flags === WORN_ALL)).toBe(true);
        // The rain's own jobs: Neo worn alone, at the phone and the desk, on
        // the five geometry-only screens whose lines stand on the ground.
        expect(RAIN_JOBS.every((screen) => GEOMETRY_ONLY_SCREENS.has(screen))).toBe(true);
        expect(jobs.filter((j) => RAIN_JOBS.includes(j.screen)).map((j) => j.key)).toEqual(
            ['mobile', 'desktop'].flatMap((vp) => RAIN_JOBS.map((screen) => `${vp}/${screen}/${NEO_CITY_THEME_ID}/${WORN_ALL}`)),
        );
    });

    it('measures a workshop look alone, and never on the door', () => {
        const kit = (() => {
            const { theme, rows } = lookFromJson(KIT_SKELETON);
            return { id: theme.id, label: theme.label, theme, rows };
        })();
        const kitJobs = contrastPlan([kit]);
        expect(kitJobs.some((job) => job.screen === 'door')).toBe(false);
        expect(kitJobs.every((job) => job.look === kit.id && job.flags === 0)).toBe(true);
        // The skeleton's own jobs in the ordinary plan are the same cells.
        expect(kitJobs.map((job) => `${job.viewport}/${job.screen}`)).toEqual(
            jobs.filter((job) => job.look === SKELETON_LOOK_ID).map((job) => `${job.viewport}/${job.screen}`),
        );
        expect(shippedLooks().length).toBe(3);
    });
});
