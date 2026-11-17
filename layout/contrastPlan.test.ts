// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME_ID, NEO_CITY_THEME_ID } from '../src/domain/theme';
import { WINDOW_MIN_PX } from '../src/ui/render';
import { CONTRAST_VIEWPORTS, COPIED_JOBS, RAIN_JOBS, STEP_JOBS, TIDE_SCREENS, WORN_ALL, contrastOwed, contrastPlan, contrastScreens, moodOwed, wearsMood, type ContrastJob } from './contrastPlan';
import { CANVAS_SCREENS, GEOMETRY_ONLY_SCREENS, NO_DECOR_SCREENS, SCREENS } from './fixtures';
import { SKELETON_LOOK_ID, measuredLooks, shippedLooks, wornAllFlags, wornOf, type Look } from './looks';
import { lookFromJson } from './workshopLook';
import { KIT_SKELETON } from './workshopStarter';
import { CANVAS, CONTRAST_PASS } from '../scripts/probe-passes.mjs';

/** The shipped run's jobs that wear a mood, pinned by value: Modern's 80 all-worn jobs and Rural's 82 (its two stilled `unbuyable` jobs among them). */
const MOOD_JOBS = 162;

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
        // does (`layout/honestDisplay.ts`). Round 3 of the narrow phone: +7 a
        // page viewport, `quote-row-longest-figure` sampled (the critic's
        // P2-1), the one screen whose broken figure is read digit by digit.
        // Round 4: +28 a page viewport, the listing face, both pay sheets and
        // the selection strip at long figures sampled too (the critic's
        // P2-2), so every surface that breaks a figure is read digit by digit.
        // The Cycle card's ladder (2026-10-13): +7 at the desk, the wall's
        // eight-byte listing where it wraps (`shop-window-cycle-longest-figure`,
        // three looks bare and worn, the skeleton bare), read digit by digit.
        expect(looks.map((look) => look.id)).toEqual([1, 2, 3, SKELETON_LOOK_ID]);
        expect({
            mobile: count(jobs, 'mobile'),
            desktop: count(jobs, 'desktop'),
            canvas: count(jobs, 'canvas'),
            total: jobs.length,
        }).toEqual({ mobile: 284, desktop: 321, canvas: 29, total: 634 });
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

    it('owes every job that wears a mood its page art read at its worst, derived from the plan and the rows (a-mood-art-layer-is-read-at-its-worst)', () => {
        // `moodOwed`, which the page publishes as `__contrastOwed().mood`:
        // on the shipped run, Modern's and Rural's all-worn jobs, where each
        // wears its one mood — Neo has none, and the skeleton no rows. Read
        // here from the looks' own rows, not from the function.
        const owed = moodOwed(jobs, looks);
        const withMood = new Set(looks.filter((look) => look.rows.some((row) => row.slot === 'mood')).map((look) => look.id));
        expect([...withMood]).toEqual([1, 3]);
        expect(owed).toEqual(jobs.filter((job) => withMood.has(job.look) && job.flags === WORN_ALL).map((job) => job.key));
        expect(owed.length).toBe(MOOD_JOBS);
        expect(jobs.filter((job) => job.tide !== undefined || job.flags === 0).some((job) => wearsMood(looks.find((l) => l.id === job.look)!, job.flags))).toBe(false);
    });

    it('walks the runner’s own viewports', () => {
        expect(CONTRAST_VIEWPORTS.map((vp) => [vp.name, vp.width, vp.height, vp.canvas])).toEqual([
            ['mobile', 390, 844, false],
            ['desktop', 1280, 900, false],
            ['canvas', 1920, 1080, true],
        ]);
        // The runner's contrast pass walks the module's viewports
        // (`CONTRAST_PASS` in `probe-passes.mjs`), read by value.
        expect(CONTRAST_PASS.viewports.map((vp) => [vp.name, vp.width, vp.height, vp === CANVAS])).toEqual(
            CONTRAST_VIEWPORTS.map((vp) => [vp.name, vp.width, vp.height, vp.canvas]),
        );
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

/**
 * The fifth review's ranked item 4: `addr-shown` and `addr-copied` are
 * geometry only, so a custom property a rule under `[data-copied='true']`
 * sets, if it feeds a paint, was read by no contrast job. They are sampled,
 * at the phone and the desk, for each measured look whose sheet names the
 * attribute (`NamesCopied`: the probe answers it from the loaded sheets,
 * `layout/sheetNaming.ts`) — and for no other look, so the plan of a run
 * that measures none is unchanged.
 */
describe('the-staged-address-screens-are-sampled-for-the-looks-that-name-them', () => {
    const looks = measuredLooks();
    const neo = looks.find((look) => look.id === NEO_CITY_THEME_ID)!;
    const rural = looks.find((look) => look.id === 3)!;
    const named = (...ids: number[]) => (look: Look): boolean => ids.includes(look.id);

    it('is two geometry-only page screens, and plans nothing when no look names the attribute', () => {
        expect([...COPIED_JOBS]).toEqual(['addr-shown', 'addr-copied']);
        for (const screen of COPIED_JOBS) {
            expect(GEOMETRY_ONLY_SCREENS.has(screen), `${screen} is geometry only`).toBe(true);
            expect(CANVAS_SCREENS.has(screen), `${screen} is a page screen`).toBe(false);
        }
        const none = contrastPlan(looks);
        expect(none.some((job) => COPIED_JOBS.includes(job.screen))).toBe(false);
        // Nothing named, nothing different: the screens and the plan are the plan the ordinary run has.
        expect(contrastPlan(looks, () => false)).toEqual(none);
        for (const vp of CONTRAST_VIEWPORTS) {
            expect(contrastScreens(vp.width, vp.canvas, looks, () => false)).toEqual(contrastScreens(vp.width, vp.canvas, looks));
        }
    });

    it('plans both screens, bare and fully worn, at the phone and the desk, for a look that names it and for no other', () => {
        const jobs = contrastPlan(looks, named(NEO_CITY_THEME_ID));
        const copied = jobs.filter((job) => COPIED_JOBS.includes(job.screen));
        expect(copied.map((job) => job.key)).toEqual(
            ['mobile', 'desktop'].flatMap((vp) => COPIED_JOBS.flatMap((screen) => [0, WORN_ALL].map((flags) => `${vp}/${screen}/${NEO_CITY_THEME_ID}/${flags}`))),
        );
        expect(copied.every((job) => job.look === neo.id && job.sheetClass === neo.theme.sheetClass && job.reduced === undefined && job.tide === undefined)).toBe(true);
        // Everything else is the plan it was, in its order: the new jobs are appended after the rain's, before the tide's.
        expect(jobs.filter((job) => !COPIED_JOBS.includes(job.screen))).toEqual(contrastPlan(looks));
        expect(new Set(jobs.map((job) => job.key)).size).toBe(jobs.length);
        // Two looks naming it are each planned; a look that does not is not.
        const two = contrastPlan(looks, named(NEO_CITY_THEME_ID, 3)).filter((job) => COPIED_JOBS.includes(job.screen));
        expect(new Set(two.map((job) => job.look))).toEqual(new Set([NEO_CITY_THEME_ID, rural.id]));
        expect(two.length).toBe(copied.length * 2);
    });

    it('lists the screens the page samples at each width, in the order the plan walks them', () => {
        const names = named(NEO_CITY_THEME_ID);
        const jobs = contrastPlan(looks, names);
        for (const vp of CONTRAST_VIEWPORTS) {
            const planned = [...new Set(jobs.filter((job) => job.viewport === vp.name).map((job) => job.screen))];
            expect(contrastScreens(vp.width, vp.canvas, looks, names), vp.name).toEqual(planned);
        }
        // The canvas paints no page screen: nothing is added there.
        expect(contrastScreens(1920, true, looks, names)).toEqual(contrastScreens(1920, true, looks));
    });

    it('adds the rain\'s all-worn jobs on its own screens only, though a look names the attribute and carries the rain', () => {
        // Neo carries the rain and names [data-copied] in this case: its rain jobs are RAIN_JOBS' alone.
        const jobs = contrastPlan(looks, named(NEO_CITY_THEME_ID));
        expect(jobs.filter((job) => RAIN_JOBS.includes(job.screen) && job.tide === undefined).map((job) => job.key)).toEqual(
            ['mobile', 'desktop'].flatMap((vp) => RAIN_JOBS.map((screen) => `${vp}/${screen}/${NEO_CITY_THEME_ID}/${WORN_ALL}`)),
        );
    });
});

/**
 * Step 8g3-honest (D-2026-11-10-18): the pay screens at figure steps 2 to 5
 * are sampled for contrast, at the phone and the desk, bare and fully worn,
 * only for a measured look whose sheet names `data-figure-step`
 * (`NamesCopied`'s twin: the probe answers it from the loaded sheets,
 * `layout/sheetNaming.ts`) — and for no other look, so the plan of a run that
 * measures none is exactly the plan it was (796 jobs with the tracked
 * fixture, 634 public).
 */
describe('the-pay-screens-at-figure-steps-are-sampled-for-the-looks-that-name-the-step', () => {
    const looks = measuredLooks();
    const neo = looks.find((look) => look.id === NEO_CITY_THEME_ID)!;
    const rural = looks.find((look) => look.id === 3)!;
    const named = (...ids: number[]) => (look: Look): boolean => ids.includes(look.id);
    const never = () => false;

    it('is eight geometry-only page screens, and plans nothing when no look names the attribute', () => {
        expect([...STEP_JOBS]).toEqual([
            'pay-inr',
            'pay-figure-14',
            'pay-figure-17',
            'pay-long-figure',
            'pay-several-figure-2',
            'pay-several-figure-3',
            'pay-several-figure-4',
            'pay-several-figure-5',
        ]);
        for (const screen of STEP_JOBS) {
            expect(GEOMETRY_ONLY_SCREENS.has(screen), `${screen} is geometry only`).toBe(true);
            expect(CANVAS_SCREENS.has(screen), `${screen} is a page screen`).toBe(false);
        }
        const none = contrastPlan(looks);
        expect(none.length).toBe(634);
        expect(none.some((job) => STEP_JOBS.includes(job.screen))).toBe(false);
        expect(contrastPlan(looks, never, never)).toEqual(none);
        for (const vp of CONTRAST_VIEWPORTS) {
            expect(contrastScreens(vp.width, vp.canvas, looks, never, never)).toEqual(contrastScreens(vp.width, vp.canvas, looks));
        }
    });

    it('plans the eight screens, bare and fully worn, at both widths, for a look that names the attribute and for no other', () => {
        const jobs = contrastPlan(looks, never, named(NEO_CITY_THEME_ID));
        const stepped = jobs.filter((job) => STEP_JOBS.includes(job.screen));
        expect(stepped.map((job) => job.key)).toEqual(
            ['mobile', 'desktop'].flatMap((vp) => STEP_JOBS.flatMap((screen) => [0, WORN_ALL].map((flags) => `${vp}/${screen}/${NEO_CITY_THEME_ID}/${flags}`))),
        );
        // 8 screens x 2 widths x (bare + worn) = 32 jobs, and nothing else moves.
        expect(stepped.length).toBe(32);
        expect(stepped.every((job) => job.look === neo.id && job.sheetClass === neo.theme.sheetClass && job.reduced === undefined && job.tide === undefined)).toBe(true);
        expect(jobs.filter((job) => !STEP_JOBS.includes(job.screen))).toEqual(contrastPlan(looks));
        expect(new Set(jobs.map((job) => job.key)).size).toBe(jobs.length);
        const two = contrastPlan(looks, never, named(NEO_CITY_THEME_ID, 3)).filter((job) => STEP_JOBS.includes(job.screen));
        expect(new Set(two.map((job) => job.look))).toEqual(new Set([NEO_CITY_THEME_ID, rural.id]));
        expect(two.length).toBe(stepped.length * 2);
        // A look that also names `[data-copied]` gets both, each in its own place.
        const both = contrastPlan(looks, named(NEO_CITY_THEME_ID), named(NEO_CITY_THEME_ID));
        expect(both.length).toBe(634 + 8 + 32);
    });

    it('lists the screens the page samples at each width, after the staged address ones', () => {
        for (const vp of CONTRAST_VIEWPORTS.filter((v) => !v.canvas)) {
            const plain = contrastScreens(vp.width, vp.canvas, looks);
            expect(contrastScreens(vp.width, vp.canvas, looks, never, named(NEO_CITY_THEME_ID))).toEqual([...plain, ...STEP_JOBS]);
        }
    });
});
