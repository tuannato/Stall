// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME_ID, NEO_CITY_THEME_ID } from '../src/domain/theme';
import { WINDOW_MIN_PX } from '../src/ui/render';
import { CONTRAST_VIEWPORTS, RAIN_JOBS, TIDE_SCREENS, WORN_ALL, contrastOwed, contrastPlan, type ContrastJob } from './contrastPlan';
import { CANVAS_SCREENS, GEOMETRY_ONLY_SCREENS, NO_DECOR_SCREENS, SCREENS } from './fixtures';
import { SKELETON_LOOK_ID, measuredLooks, shippedLooks, wornAllFlags, wornOf, type Look } from './looks';
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
        // 8e2 (CRITIC-STEP-8E2 item 11): +21 a viewport, from 228 / 258 /
        // 515 — `pay-xec` and `pay-moved` sampled again and `pay-gone` new,
        // seven jobs each (three looks bare and worn, the skeleton bare),
        // because each paints an honest-display line no other sampled screen
        // does (`layout/honestDisplay.ts`).
        expect(looks.map((look) => look.id)).toEqual([1, 2, 3, SKELETON_LOOK_ID]);
        expect({
            mobile: count(jobs, 'mobile'),
            desktop: count(jobs, 'desktop'),
            canvas: count(jobs, 'canvas'),
            total: jobs.length,
        }).toEqual({ mobile: 249, desktop: 279, canvas: 29, total: 557 });
    });

    it('samples Grid horizon worn alone on the offers screen, at the phone and the desk', () => {
        // SOLO_JOBS: the all-worn job reads the sign under every Neo row at
        // once, and the horizon alone was a combination nothing read.
        const solo = jobs.filter((j) => j.flags !== 0 && j.flags !== WORN_ALL && j.tide === undefined);
        expect(solo.map((j) => j.key).sort()).toEqual(['desktop/offers/2/4', 'mobile/offers/2/4']);
    });

    it('owes the rain and the horizon at their worst on Neo’s named jobs, pinned by value', () => {
        // What the runner holds the walk to (`__contrastOwed`), derived from
        // the rows a look carries; on the shipped run, Neo's — the list the
        // runner kept by hand until 2026-10-06, so a job that left the plan
        // or a fixture that stopped wearing the rain fails by name.
        const owed = contrastOwed(looks);
        expect(owed.rain).toEqual([
            ...['mobile', 'desktop'].flatMap((viewport) =>
                [
                    'activity',
                    'plugin-missing',
                    'empty',
                    'quotes-failed',
                    'nothing-quoted',
                    'quotes-truncated',
                    'first-stall',
                    'sparse-pasted',
                    'item-listing',
                    'item-quote',
                ].map((screen) => `${viewport}/${screen}/2/65535`),
            ),
            'desktop/shop-window-cycle/2/65535',
        ]);
        expect(owed.horizon).toEqual([
            'mobile/offers/2/4',
            'desktop/offers/2/4',
            'mobile/offers/2/65535',
            'desktop/offers/2/65535',
            'canvas/shop-window-wall/2/65535',
        ]);
        // Every owed job is a job the plan does.
        const keys = new Set(jobs.map((job) => job.key));
        expect([...owed.rain, ...owed.horizon].filter((key) => !keys.has(key))).toEqual([]);
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
        // The solo jobs (SOLO_JOBS) are held in their own case above.
        const isSolo = (j: ContrastJob): boolean => j.flags !== 0 && j.flags !== WORN_ALL;
        for (const job of jobs.filter((j) => j.reduced !== true && j.tide === undefined && !RAIN_JOBS.includes(j.screen) && !isSolo(j))) {
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
        // Bare, all worn, or one of SOLO_JOBS' rows alone.
        expect(jobs.filter((job) => job.flags !== 0 && job.flags !== WORN_ALL && job.tide === undefined).map((j) => j.key).sort()).toEqual([
            'desktop/offers/2/4',
            'mobile/offers/2/4',
        ]);
        // The rain's own jobs: Neo worn alone, at the phone and the desk, on
        // the five geometry-only screens whose lines stand on the ground.
        expect(RAIN_JOBS.every((screen) => GEOMETRY_ONLY_SCREENS.has(screen))).toBe(true);
        expect(jobs.filter((j) => RAIN_JOBS.includes(j.screen) && j.tide === undefined).map((j) => j.key)).toEqual(
            ['mobile', 'desktop'].flatMap((vp) => RAIN_JOBS.map((screen) => `${vp}/${screen}/${NEO_CITY_THEME_ID}/${WORN_ALL}`)),
        );
    });

    it('reads the aurora worn alone at both ends of its tide, where lines stand on Neo’s ground (the-aurora-is-read-at-both-ends-of-its-tide)', () => {
        const neo = looks.find((look) => look.id === NEO_CITY_THEME_ID)!;
        const aurora = neo.rows.find((row) => row.cls === 'att-aurora')!;
        const tide = jobs.filter((j) => j.tide !== undefined);
        expect(tide.every((j) => j.look === NEO_CITY_THEME_ID && j.flags === 1 << aurora.bit && j.reduced !== true)).toBe(true);
        const expected = (['mobile', 'desktop', 'canvas'] as const).flatMap((vp) => {
            const here = new Set(jobs.filter((j) => j.viewport === vp && j.tide === undefined).map((j) => j.screen));
            return TIDE_SCREENS.filter((screen) => here.has(screen)).flatMap((screen) => [0, 1].map((t) => `${vp}/${screen}/2/${1 << aurora.bit}/tide${t}`));
        });
        expect(tide.map((j) => j.key)).toEqual(expected);
        // Every tide screen is read somewhere, the wall's Cycle at the desk.
        expect(new Set(tide.map((j) => j.screen))).toEqual(new Set(TIDE_SCREENS));
        expect(tide.length).toBe(46);
    });

    it('paints one all-worn variant per mood, and a shipped look has one (D11)', () => {
        // Every shipped look has one mood at most, so `WORN_ALL` is its only
        // all-worn state and the size pinned above did not move.
        for (const look of looks) {
            expect(wornAllFlags(look), look.label).toEqual([WORN_ALL]);
        }
        // A harness look with two moods (Ink wash's shape), each with a
        // class: `WORN_ALL` wears the lower-bit mood alone, so the second is
        // all-worn under its own flags on every screen that samples worn.
        const rural = looks.find((look) => look.id === 3)!;
        const sunFaded = rural.rows.find((row) => row.slot === 'mood')!;
        const dusk = { ...sunFaded, bit: 9, label: 'Harness dusk', cls: 'att-harness-dusk' };
        const two: Look = { ...rural, rows: [...rural.rows.map((row) => (row === sunFaded ? { ...row, cls: 'att-harness-fade' } : row)), dusk] };
        const flags = wornAllFlags(two);
        expect(flags).toEqual([WORN_ALL, WORN_ALL & ~((1 << sunFaded.bit) | (1 << 9)) | (1 << 9)]);
        expect(wornOf(two, flags[0]!).filter((row) => row.slot === 'mood').map((row) => row.label)).toEqual([sunFaded.label]);
        expect(wornOf(two, flags[1]!).filter((row) => row.slot === 'mood').map((row) => row.label)).toEqual(['Harness dusk']);
        // The rest of the dress is the same under either mood.
        expect(wornOf(two, flags[1]!).length).toBe(wornOf(two, flags[0]!).length);
        const once = contrastPlan([rural]);
        const twice = contrastPlan([two]);
        const worn = once.filter((job) => job.flags === WORN_ALL && job.reduced !== true);
        expect(worn.length).toBeGreaterThan(0);
        expect(twice.length).toBe(once.length + worn.length + once.filter((j) => j.flags === WORN_ALL && j.reduced === true).length);
        expect(twice.filter((job) => job.flags === flags[1]).map((job) => job.key.replace(`/${flags[1]}`, `/${WORN_ALL}`))).toEqual(
            once.filter((job) => job.flags === WORN_ALL).map((job) => job.key),
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
