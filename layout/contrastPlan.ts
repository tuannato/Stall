/**
 * What the pixel-contrast pass (`pnpm test:layout`'s pass 4) paints and
 * samples: one job per viewport, screen, look and decoration state, in the
 * order the runner walks them.
 *
 * Computed here and published by the probe page (`window.__contrastPlan()`),
 * for `shotPlan.ts`'s reason: the screen list is `layout/fixtures.ts` and
 * Node cannot import it (the step-3 critic's item 7). The runner walks this
 * list and nothing else, and at the end it holds the jobs it did against
 * it — every planned job exactly once — so a job that silently fell out of
 * the walk, or ran twice, is a failure and not a smaller number on a green
 * line.
 *
 * - **Viewports.** The phone and the desk for the page screens, the 1920
 *   canvas for the canvas screens (`screensAt`, the probe's own split).
 * - **Screens.** The ones that put a figure on a ground no other screen
 *   does: every screen at that width a measured look can wear, less the
 *   overlay's (it shares one head plate and one card — `broadcast` and the
 *   pinned ticker carry every figure the others do) and less
 *   `GEOMETRY_ONLY_SCREENS`.
 * - **Looks.** Every look the page measures that can wear the screen
 *   (`canWear`: the door wears the default look alone).
 * - **Decorations, as a bitmask.** `0`, and every decoration at once
 *   (`WORN_ALL`, the picker's all-worn state) where decorations paint — never
 *   on an overlay screen (`NO_DECOR_SCREENS`) and never for a look with no
 *   rows, whose worn paint is its bare paint again. A bitmask rather than a
 *   flag, so a variant per mood is a new value and not a new schema.
 *
 * Test: `the-contrast-plan-is-every-job-the-pass-owes`.
 */
import { GEOMETRY_ONLY_SCREENS, NO_DECOR_SCREENS } from './fixtures';
import { canWear, type Look } from './looks';
import { screensAt } from './screenSplit';

export type ContrastViewport = {
    readonly name: 'mobile' | 'desktop' | 'canvas';
    readonly width: number;
    readonly height: number;
    readonly canvas: boolean;
};

/** The pass's three viewports; the runner refuses a list of its own that differs. */
export const CONTRAST_VIEWPORTS: readonly ContrastViewport[] = [
    { name: 'mobile', width: 390, height: 844, canvas: false },
    { name: 'desktop', width: 1280, height: 900, canvas: false },
    { name: 'canvas', width: 1920, height: 1080, canvas: true },
];

/** Every decoration at once — `wornOf(look, WORN_ALL)`, one per slot, as the picker produces. */
export const WORN_ALL = 0xffff;

export type ContrastJob = {
    /** `viewport/screen/look/flags`: unique in a plan. */
    readonly key: string;
    readonly viewport: ContrastViewport['name'];
    readonly width: number;
    readonly height: number;
    readonly screen: string;
    /** The look's id, as `__contrastPrepare` takes it. */
    readonly look: number;
    /** The `t-*` class that look paints, for the runner's per-job audit. */
    readonly sheetClass: string;
    /** The decoration bits `__contrastPrepare` is handed. */
    readonly flags: number;
};

/** The screens the pass samples at one viewport, for the given looks. */
export function contrastScreens(width: number, canvas: boolean, looks: readonly Look[]): string[] {
    return screensAt(width, canvas).filter(
        (name) =>
            looks.some((look) => canWear(look, name)) &&
            // `broadcast-ticker` since 2026-09-21: the ribbon's figures are
            // the first money on a moving node, sampled at the pinned offset
            // the fixture holds them at. The other ticker screens are
            // geometry (`PROBE-RULES.md`, "The ticker").
            (!NO_DECOR_SCREENS.has(name) || name === 'broadcast' || name === 'broadcast-ticker') &&
            !GEOMETRY_ONLY_SCREENS.has(name),
    );
}

/** Every job of the pass over `looks`, viewport by viewport, in the order the runner walks them. */
export function contrastPlan(looks: readonly Look[]): ContrastJob[] {
    const jobs: ContrastJob[] = [];
    for (const viewport of CONTRAST_VIEWPORTS) {
        for (const screen of contrastScreens(viewport.width, viewport.canvas, looks)) {
            for (const look of looks) {
                if (!canWear(look, screen)) {
                    continue;
                }
                const variants = look.rows.length === 0 || NO_DECOR_SCREENS.has(screen) ? [0] : [0, WORN_ALL];
                for (const flags of variants) {
                    jobs.push({
                        key: `${viewport.name}/${screen}/${look.id}/${flags}`,
                        viewport: viewport.name,
                        width: viewport.width,
                        height: viewport.height,
                        screen,
                        look: look.id,
                        sheetClass: look.theme.sheetClass,
                        flags,
                    });
                }
            }
        }
    }
    return jobs;
}
