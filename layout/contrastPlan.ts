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
 *   flag, so a variant per mood is a new value and not a new schema — and
 *   it is one (D11): a look's second mood is all-worn under its own flags
 *   (`wornAllFlags`), since `WORN_ALL` wears the first mood alone. No
 *   shipped look has two, so no job was added.
 * - **The decorations' own jobs follow the rows a look carries, never its
 *   id.** The rain's ground jobs (`RAIN_JOBS`), the horizon worn alone
 *   (`SOLO_JOBS`) and the aurora's tide (`TIDE_SCREENS`) are planned for
 *   every measured look whose rows carry that decoration's class, and the
 *   stilled paint (`REDUCED_JOBS`) for every look whose row sets its price
 *   moving — so a look re-scoped under another class and id (the kit's
 *   starter, `pnpm workshop:start neo`, is Neo's rows under `0xff`) is
 *   planned exactly as the look it copies. Until 2026-10-06 they were keyed
 *   to Neo's and Rural's ids, and the Neo starter's outlined lines on the
 *   rain's own screens were never ring-read.
 *
 * Tests: `the-contrast-plan-is-every-job-the-pass-owes`,
 * `every-starter-is-measured-as-its-shipped-look`.
 */
import { GEOMETRY_ONLY_SCREENS, NO_DECOR_SCREENS, paintsBareOnly } from './fixtures';
import { canWear, wornAllFlags, type Look } from './looks';
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
    /** Painted under `prefers-reduced-motion: reduce` (`REDUCED_JOBS`). */
    readonly reduced?: boolean;
    /** The aurora worn alone with its tide held at one end (`TIDE_SCREENS`). */
    readonly tide?: 0 | 1;
};

/** The rain's class: what a look's rows carry when it can wear the rain. */
export const RAIN_CLASS = 'att-rainfall';

/** Grid horizon's class. */
export const HORIZON_CLASS = 'att-horizon';

/** Whether `look`'s own rows carry the decoration `cls` — the key every decoration's job is planned on, never the look's id. */
export function carries(look: Look, cls: string): boolean {
    return look.rows.some((row) => row.cls === cls);
}

/**
 * Whether `look`'s row sets its price moving (`shape.priceAnim`, which the
 * renderer hands the price as `--s-price-anim`): Rural's craft-fair tag
 * sways, and so does the tag of a look that starts from Rural's row.
 */
export function movesItsPrice(look: Look): boolean {
    const anim = look.theme.shape.priceAnim;
    return anim !== undefined && anim.trim() !== '' && anim.trim() !== 'none';
}

/**
 * Screens sampled a second time under reduced motion, for the looks `when`
 * names: a box the sampler cannot read while it moves. Rural's price tag
 * sways (its row's `priceAnim`, and `t-rural-tag` in its sheet), and a box
 * inside a transform is padded 8px a side (`insideTransform`), which leaves
 * nothing of the 14px "Not buyable" label that is all an unbuyable row's
 * price cell says — so its ink was measured by nothing (the critic,
 * 2026-09-24). Stilled, the tag has no transform and the label is read
 * whole. Keyed on the row's own `priceAnim` (`movesItsPrice`), never on
 * Rural's id: a look that starts from Rural's row sways the same tag.
 * Stated limit: a sheet that sets a price moving with no `priceAnim` on its
 * row is not seen here.
 */
export const REDUCED_JOBS: ReadonlyArray<{ screen: string; when: (look: Look) => boolean }> = [
    { screen: 'unbuyable', when: movesItsPrice },
];

/**
 * Screens sampled with every decoration worn on each look that carries the
 * rain, and nowhere else (2026-09-24, the owner's condition on the rain
 * ground; Neo's today, and the kit's when it starts from Neo): geometry-only
 * screens whose failure and empty sentences, notes and checklist stand on
 * the stall's own ground, which is where the rain falls — the quotes rail
 * that did not finish, the one with nothing quoted yet, the one stopped at
 * our cap, the first-stall checklist, the notice invite a pasted
 * navigation paints (`sparse-pasted`), and the quote's face, whose pointer
 * to the other rail stands on the ground (`item-quote`, round 8). The rain
 * is sampled at its brightest drop there
 * (`a-line-on-the-ground-reads-wherever-a-drop-falls`), and every line it
 * outlines is read in the ring around its glyphs.
 */
export const RAIN_JOBS: readonly string[] = [
    'quotes-failed',
    'nothing-quoted',
    'quotes-truncated',
    'first-stall',
    'sparse-pasted',
    'item-quote',
];

/**
 * A decoration sampled worn on its own, beside the bare and all-worn jobs
 * (2026-09-26, the critic on Grid horizon v6): the all-worn job puts the
 * sign's text under every Neo row at once — The sign hums' glow in place of
 * Neo's own, its failing lamp dimming one letter — so a seller holding the
 * horizon alone, whose name and tagline stand over the lit skyline and the
 * stars, wore a combination no job read. `cls` names the row, on every look
 * that carries it; its bit is read off that look's own table, so a row's bit
 * is never restated here.
 */
export const SOLO_JOBS: ReadonlyArray<{ screen: string; cls: string }> = [{ screen: 'offers', cls: HORIZON_CLASS }];

/**
 * **The aurora worn alone, at both ends of its tide** (step 5b, the
 * moving-decoration table's reader for `att-aurora`; `movingDecor.ts`), on
 * every look that carries it.
 * The aurora is two washes on the stall's own ground whose colour turns
 * over four seconds (`--au-tide`, 0 → 1): the cyan wash at its strongest at
 * one end, the pink at the other. The pass froze it at one instant, and
 * the all-worn job wears the rain with it, where every line on the ground
 * wears the outline; worn alone, no line does. So each screen whose lines
 * stand on Neo's bare ground — the rain's own list, the offers screen and
 * the wall's Cycle — is painted with the aurora and nothing else, its tide
 * held at 0 and again at 1. Each channel of the wash's paint is a convex
 * function of the tide (one wash's alpha grows as the other's falls, and
 * the two blend multiplicatively), so the lightest ground a line meets is
 * at one end or the other, never between.
 */
export const TIDE_SCREENS: readonly string[] = [
    'offers',
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
    'shop-window-cycle',
];

/** The aurora's class: its bit is read off each look's own table, never restated here. */
export const TIDE_CLASS = 'att-aurora';

/**
 * Where a look that carries the rain owes it at its brightest drop
 * (`a-line-on-the-ground-reads-wherever-a-drop-falls`), all worn: at the
 * phone and the desk, the screens whose lines stand on the stall's own
 * ground — the Activity panel, two failure screens, the empty stall, the
 * quotes rail's own three, the first-stall checklist, the notice invite a
 * pasted navigation paints, and the two faces (the back control, and the
 * quote's pointer to the other rail, round 8) — and a wall: the shop window
 * wears every decoration the seller chose, and its status line stands on
 * the ground at 19px.
 */
export const RAIN_OWED: ReadonlyArray<{ viewport: ContrastViewport['name']; screen: string }> = [
    ...(['mobile', 'desktop'] as const).flatMap((viewport) =>
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
        ].map((screen) => ({ viewport, screen })),
    ),
    { viewport: 'desktop', screen: 'shop-window-cycle' },
];

/**
 * Where a look that carries Grid horizon owes it read at its worst (step
 * 5a″): the name on the sign over the horizon alone at a phone and a desk,
 * and all worn at a phone, a desk and the 1920 wall, where the tagline
 * stands in the sky.
 */
export const HORIZON_OWED: ReadonlyArray<{ viewport: ContrastViewport['name']; screen: string; alone: boolean }> = [
    { viewport: 'mobile', screen: 'offers', alone: true },
    { viewport: 'desktop', screen: 'offers', alone: true },
    { viewport: 'mobile', screen: 'offers', alone: false },
    { viewport: 'desktop', screen: 'offers', alone: false },
    { viewport: 'canvas', screen: 'shop-window-wall', alone: false },
];

/**
 * The jobs the runner holds to having worn a decoration at its worst, by
 * key, for every look given whose rows carry it: the rain flattened to its
 * brightest drop (`RAIN_OWED`) and Grid horizon flattened to its brightest
 * paint (`HORIZON_OWED`). Named jobs, so a door mini flattened alone can
 * never stand in for them (the critic's third pass) — and derived from the
 * rows, so a look re-scoped under another class and id owes what the look
 * it copies owes. The page publishes it (`window.__contrastOwed()`); the
 * shipped keys are pinned by value in
 * `the-contrast-plan-is-every-job-the-pass-owes`.
 */
export function contrastOwed(looks: readonly Look[]): { rain: string[]; horizon: string[] } {
    const rain = looks
        .filter((look) => carries(look, RAIN_CLASS))
        .flatMap((look) => RAIN_OWED.map(({ viewport, screen }) => `${viewport}/${screen}/${look.id}/${WORN_ALL}`));
    const horizon = looks.flatMap((look) => {
        const row = look.rows.find((r) => r.cls === HORIZON_CLASS);
        return row === undefined
            ? []
            : HORIZON_OWED.map(({ viewport, screen, alone }) => `${viewport}/${screen}/${look.id}/${alone ? 1 << row.bit : WORN_ALL}`);
    });
    return { rain, horizon };
}

/** The overlay screens the pass samples; every other overlay screen is geometry. */
export const OVERLAY_SAMPLED: ReadonlySet<string> = new Set(['broadcast', 'broadcast-ticker']);

/**
 * The screens the pass samples at one viewport, for the given looks: every
 * look's (`sampledScreens`), then the rain's own (`RAIN_JOBS`) where a look
 * that carries the rain is measured — in the order the plan walks them,
 * which the runner compares.
 */
export function contrastScreens(width: number, canvas: boolean, looks: readonly Look[]): string[] {
    const regular = sampledScreens(width, canvas, looks);
    const rainy = looks.filter((look) => carries(look, RAIN_CLASS));
    const at = screensAt(width, canvas);
    const rain = RAIN_JOBS.filter(
        (screen) => at.includes(screen) && rainy.some((look) => canWear(look, screen)) && !regular.includes(screen),
    );
    return [...regular, ...rain];
}

/** The screens every measured look is sampled on at one viewport. */
function sampledScreens(width: number, canvas: boolean, looks: readonly Look[]): string[] {
    return screensAt(width, canvas).filter(
        (name) =>
            looks.some((look) => canWear(look, name)) &&
            // `broadcast-ticker` since 2026-09-21: the ribbon's figures are
            // the first money on a moving node, sampled at the pinned offset
            // the fixture holds them at. The other ticker screens are
            // geometry (`PROBE-RULES.md`, "The ticker").
            (!NO_DECOR_SCREENS.has(name) || OVERLAY_SAMPLED.has(name)) &&
            !GEOMETRY_ONLY_SCREENS.has(name),
    );
}

/** Every job of the pass over `looks`, viewport by viewport, in the order the runner walks them. */
export function contrastPlan(looks: readonly Look[]): ContrastJob[] {
    const jobs: ContrastJob[] = [];
    for (const viewport of CONTRAST_VIEWPORTS) {
        for (const screen of sampledScreens(viewport.width, viewport.canvas, looks)) {
            for (const look of looks) {
                if (!canWear(look, screen)) {
                    continue;
                }
                const solo = SOLO_JOBS.filter((j) => j.screen === screen).flatMap((j) => {
                    const row = look.rows.find((r) => r.cls === j.cls);
                    return row === undefined ? [] : [1 << row.bit];
                });
                const variants =
                    look.rows.length === 0 || paintsBareOnly(screen) ? [0] : [0, ...wornAllFlags(look), ...solo];
                for (const flags of variants) {
                    const job = {
                        viewport: viewport.name,
                        width: viewport.width,
                        height: viewport.height,
                        screen,
                        look: look.id,
                        sheetClass: look.theme.sheetClass,
                        flags,
                    };
                    jobs.push({ key: `${viewport.name}/${screen}/${look.id}/${flags}`, ...job });
                    if (REDUCED_JOBS.some((r) => r.screen === screen && r.when(look))) {
                        jobs.push({ key: `${viewport.name}/${screen}/${look.id}/${flags}/reduce`, ...job, reduced: true });
                    }
                }
            }
        }
        // The rain's own screens, all worn, on every look that carries the
        // rain (`RAIN_JOBS`).
        const regular = sampledScreens(viewport.width, viewport.canvas, looks);
        const pageScreens = contrastScreens(viewport.width, viewport.canvas, looks);
        for (const screen of pageScreens.filter((name) => !regular.includes(name))) {
            for (const look of looks.filter((l) => carries(l, RAIN_CLASS) && canWear(l, screen))) {
                jobs.push({
                    key: `${viewport.name}/${screen}/${look.id}/${WORN_ALL}`,
                    viewport: viewport.name,
                    width: viewport.width,
                    height: viewport.height,
                    screen,
                    look: look.id,
                    sheetClass: look.theme.sheetClass,
                    flags: WORN_ALL,
                });
            }
        }
        // The aurora alone at both ends of its tide, last in the viewport and
        // only on screens this viewport already samples, so the screens the
        // page publishes are unchanged (`TIDE_SCREENS`) — on every look that
        // carries it.
        for (const look of looks) {
            const aurora = look.rows.find((row) => row.cls === TIDE_CLASS);
            if (aurora === undefined) {
                continue;
            }
            for (const screen of TIDE_SCREENS.filter((name) => pageScreens.includes(name) && canWear(look, name))) {
                for (const tide of [0, 1] as const) {
                    jobs.push({
                        key: `${viewport.name}/${screen}/${look.id}/${1 << aurora.bit}/tide${tide}`,
                        viewport: viewport.name,
                        width: viewport.width,
                        height: viewport.height,
                        screen,
                        look: look.id,
                        sheetClass: look.theme.sheetClass,
                        flags: 1 << aurora.bit,
                        tide,
                    });
                }
            }
        }
    }
    return jobs;
}
