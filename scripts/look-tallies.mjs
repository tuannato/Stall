/**
 * What a carried private look is held to on its own tallies (8e2, the 8e2
 * critic's item 1). The probe's vacuity guards were one number per pass
 * across every look it measured — line targets clipped out of view, points
 * behind a clip, codes whose quiet zone was read, wall controls read whole —
 * so the shipped looks satisfied each of them for a carried look that
 * measured nothing. Measured by the critic: the tracked fixture planted with
 * `.fine, .stall-sub { max-height: 0; overflow: hidden }` lost every
 * fine-print line and the sign's state line on the phone and the desk, and
 * the run passed.
 *
 * So the runner counts each tally per look's class, holds the **public
 * looks** (the shipped three and the skeleton) to exactly the effective
 * ceilings they had — over their own jobs and points, so a carried look can
 * neither mask nor trip them — and holds **every carried look** to its own:
 *
 * - **line skips** (`LINE_SKIP_CEILING`'s rule, per look **and per
 *   variant**, `skipVariantOf`): a ceiling of its own in
 *   `CARRIED_LINE_SKIP_CEILING`, by value and with its reason, exact when
 *   set; **a carried look with no entry, a variant its entry does not
 *   name, or a variant it names that the run measured no job of, fails the
 *   run**, so a new look's or a new mood's numbers arrive by
 *   a reviewed diff that names what is clipped and why, never by a run that
 *   read them and said nothing;
 * - **points behind a clip** (`CLIP_SKIP_CEILING`'s rule): the same ratio on
 *   its own points of 1a (`nothing-covers-money-or-a-protected-box`, its
 *   `coverByClass`; since 7a, `coveredBy`'s before), on every pass that read
 *   1a — every geometry pass but the short ones, and the contrast pass —
 *   the two wall scrollers' points apart (`WALL_SCROLLERS`), and a pass
 *   that hit-tested none of its points measured nothing of it;
 * - **the codes owed by name** (`CODES_REQUIRED`): every one read on its own
 *   jobs, but the record sheet's code under a paid look — the name sheet
 *   composes no record naming a paid look in step 8 (8b2), so under the
 *   look the sheet shows its refusal and no code (`PAID_LOOK_UNPAINTED_CODES`);
 * - **the wall's controls** (`WALL_ROLES`): owed on its own walls, in
 *   `probe-coverage.mjs` beside the public count;
 * - **1c's characters** (7d, `every-money-character-reads-where-a-mover-is-near`):
 *   on each viewport where its own contrast jobs triggered 1c, characters
 *   read there (`charsOwedFaults` in `char-read.mjs`, the public looks' rule).
 *
 * Pure: tallies in, sentences out. It imports `char-read.mjs` alone, pure
 * too; no `.d.mts`, no TS test imports it. Test: `a-carried-look-is-held-to-its-own-skip-ceilings`
 * (`scripts/look-tallies.test.mjs`).
 */

import { charsOwedFaults } from './char-read.mjs';

/** The two kinds of line skip the contrast pass counts (`LINE_SKIP_CEILING`'s). */
export const LINE_SKIP_KINDS = Object.freeze(['clipped-away', 'not-rendered']);

/** The contrast pass's viewports, whose skips a ceiling states. */
export const SKIP_VIEWPORTS = Object.freeze(['mobile', 'desktop', 'canvas']);

/**
 * The variant a contrast job paints, by its flags, as the probe names it
 * everywhere it prints one: `bare` (no row worn), `worn` (`0xffff`: every
 * row, with the look's lowest-bit mood) and `flags <n>` for each further
 * mood's all-worn state (`wornAllFlags`, `layout/looks.ts`: `0xffff` with
 * every other mood's bit cleared). A carried look's line-skip ceiling is
 * kept per variant, so a mood's skips can neither hide a bare look's new
 * one nor stand in for it.
 */
export function skipVariantOf(flags) {
    return flags === 0 ? 'bare' : flags === 0xffff ? 'worn' : `flags ${flags}`;
}

/**
 * **1a's points, summed and held to the clip ceiling** (7a; the critic's
 * third review, its checklist item 8). A tally is 1a's per look on a pass
 * (`coverByClass` in the page's verdict, `coverTally` in the probe): its
 * reads (`paints`), the points hit-tested (`checked`), behind a clip a
 * scroller brings them out from (`clipSkips`), and behind one of the two
 * wall scrollers (`wallScroll`, `WALL_SCROLLERS` in `layout/coverPoints.ts`),
 * which scroll by design and are counted apart, outside the ratio.
 */
export const COVER_TALLY_KEYS = Object.freeze(['paints', 'nodes', 'points', 'checked', 'below', 'offSide', 'above', 'clipSkips', 'wallScroll', 'appHidden', 'failed']);

/** 1a's tallies of `classes` (or every class) on one pass, summed. */
export function coverTally(byClass, classes = Object.keys(byClass ?? {})) {
    const sum = Object.fromEntries(COVER_TALLY_KEYS.map((key) => [key, 0]));
    for (const cls of classes) {
        const at = Object.hasOwn(byClass ?? {}, cls) ? byClass[cls] : undefined;
        if (at === undefined) continue;
        for (const key of COVER_TALLY_KEYS) sum[key] += at[key] ?? 0;
    }
    return sum;
}

/**
 * **1b's tallies, summed** (7b): a look's 1b reads on a pass
 * (`reachByClass` in the page's verdict, `ReachTally` in the probe) — its
 * paints read, elements and look pseudos read, reachers with a paint that
 * reaches, targets held, pairs judged, keyframe seeks (`wide`: those that read
 * every reacher against every target), animations left out (`needless`,
 * `unmoved`: a move of a box that holds nothing 1b reads, and `offSurface`: a
 * box under an open sheet's scrim, its paints read from its keyframes) or
 * read from their keyframes' own values (`fromValues`), failures (`would`),
 * meets accepted by name (`accepted`), a blurred layer's core alone
 * (`softCore`, not counted), and the paints it threw on (`throws`, each a
 * failure).
 */
export const REACH_TALLY_KEYS = Object.freeze([
    'paints',
    'elements',
    'contents',
    'pseudos',
    'reachers',
    'targets',
    'pairs',
    'seeks',
    'wide',
    'unmoved',
    'offSurface',
    'needless',
    'fromValues',
    'would',
    'accepted',
    'softCore',
    'throws',
]);

/** 1b's tallies of `classes` (or every class) on one pass, summed. */
export function reachTally(byClass, classes = Object.keys(byClass ?? {})) {
    const sum = Object.fromEntries(REACH_TALLY_KEYS.map((key) => [key, 0]));
    for (const cls of classes) {
        const at = Object.hasOwn(byClass ?? {}, cls) ? byClass[cls] : undefined;
        if (at === undefined) continue;
        for (const key of REACH_TALLY_KEYS) sum[key] += at[key] ?? 0;
    }
    return sum;
}

/** 3a's tallies of `classes` (or every class) on one pass, summed (`walkByClass`, D-2026-10-28-01): figures' elements read, failures, throws. */
export function walkTally(byClass, classes = Object.keys(byClass ?? {})) {
    const sum = { elements: 0, failed: 0, thrown: 0 };
    for (const cls of classes) {
        const at = Object.hasOwn(byClass ?? {}, cls) ? byClass[cls] : undefined;
        if (at === undefined) continue;
        for (const key of Object.keys(sum)) sum[key] += at[key] ?? 0;
    }
    return sum;
}

/**
 * Why a tally breaks the clip ceiling, as a sentence, or undefined: a tally
 * that read but hit-tested no point ran over nothing; one whose points
 * behind a clip (the wall scrollers' apart) are more than `ceiling` of
 * those and the points hit-tested is a tolerance eating the check.
 */
export function clipCeilingFault(tally, ceiling) {
    if (!(tally.checked > 0)) {
        return tally.clipSkips + tally.wallScroll > 0
            ? `every one of its ${tally.clipSkips + tally.wallScroll} points inside the viewport was behind a clip — the cover check ran over nothing`
            : 'it hit-tested no point — the cover check ran over nothing';
    }
    const ratio = tally.clipSkips / (tally.clipSkips + tally.checked);
    if (ratio > ceiling) {
        return (
            `${tally.clipSkips}/${tally.clipSkips + tally.checked} points behind a clip (${(ratio * 100).toFixed(0)}%), ` +
            `above the ${(ceiling * 100).toFixed(0)}% ceiling — the clip tolerance is eating the cover check`
        );
    }
    return undefined;
}

/** A tally's clip arithmetic as it is printed: behind a clip over behind or hit-tested, and the wall scrollers' apart. */
export function clipLine(tally) {
    const all = tally.clipSkips + tally.checked;
    return (
        `${tally.clipSkips}/${all} points behind a clip (${all === 0 ? 0 : ((tally.clipSkips / all) * 100).toFixed(0)}%)` +
        `, ${tally.wallScroll} behind a wall scroller, apart`
    );
}

/**
 * Each carried look's line skips, per variant (`skipVariantOf`) and
 * viewport, as measured — exact ceilings, `LINE_SKIP_CEILING`'s rule: more
 * fails and names the count; fewer says so, and the entry comes down with
 * the change that lowered it. A carried class with no entry fails the run,
 * and so does a variant measured that its entry does not name
 * (`carriedTallyFaults`). **Per variant, not one sum per viewport**
 * (D-2026-11-11-18): a look's moods each add a worn variant of every
 * contrast job, and a sum let a mood's skips absorb a bare-look regression
 * (one more clipped line on the bare look hidden by one fewer under a
 * mood) or a mood's own new clip ride under the bare look's count. The
 * ceiling holds sums over screens; the run prints each carried look's skips
 * per screen beside them on every run (`skipsByScreen`), so an entry's
 * reason can be checked against the screens that make it.
 */
export const CARRIED_LINE_SKIP_CEILING = Object.freeze({
    /*
     * The tracked fixture (`layout/fixture-private-looks/`), measured
     * 2026-10-06 over the contrast targets as they stand: its sheet clips
     * nothing, so its skips are the base sheets' on the skeleton's markup —
     * the wall's rows past its strip and the ticker's ribbon past its cell
     * (the canvas's 205), the halves a phone hides (the desk-only controls,
     * a closed switch's row), the same reasons the public looks' own
     * counts carry. Lowered with the change that lowers them; raised only
     * by a reviewed diff that names what the fixture now clips and why.
     * Canvas 205 → 207 (8f2, after its critic): the fixture's name box
     * leaves room above and below for stacked marks (`padding-block:
     * 0.2em`, 22px at the wall's 54px), so the wall's sign is that much
     * taller and the 35-line payment's scroller shows one line fewer — one
     * more line scrolled out of view, on each of its two jobs.
     */
    't-fixture-private': Object.freeze({
        // Split per variant 2026-11-11 from the default run's dump (the
        // sums were mobile 16/10, desktop 4/8, canvas 207/0): every skip
        // falls on both variants alike but the ticker's 3, which is painted
        // bare only (`paintsBareOnly`).
        bare: Object.freeze({
            mobile: Object.freeze({ 'clipped-away': 8, 'not-rendered': 5 }),
            desktop: Object.freeze({ 'clipped-away': 2, 'not-rendered': 4 }),
            canvas: Object.freeze({ 'clipped-away': 105, 'not-rendered': 0 }),
        }),
        worn: Object.freeze({
            mobile: Object.freeze({ 'clipped-away': 8, 'not-rendered': 5 }),
            desktop: Object.freeze({ 'clipped-away': 2, 'not-rendered': 4 }),
            canvas: Object.freeze({ 'clipped-away': 102, 'not-rendered': 0 }),
        }),
    }),
    /*
     * The private look at 0x04, per variant, measured 2026-11-11 by the
     * look run over the contrast targets as they stand, with its two moods
     * (8h): `bare`, `worn` (`0xffff`, its bit-7 mood) and `flags 65407`
     * (its bit-8 mood's all-worn state). The counts fall on these screens,
     * alike under each variant but the ticker's, which is painted bare
     * only (`paintsBareOnly`):
     *
     * - mobile clipped-away 8: `studio-items`;
     * - mobile not-rendered 5, desktop not-rendered 4: `shop-window-sheet`,
     *   the halves a phone hides (the desk-only controls, a closed
     *   switch's row);
     * - desktop clipped-away 3: `shop-window-browse` 1 and `studio-items`
     *   2 (7 → 3 on the bare look since 2026-10-12, when the 5 on
     *   `studio-items` were provisional);
     * - canvas clipped-away 104 bare, 101 under each mood: the wall
     *   payment's lines past its plate's scroller (99 on
     *   `shop-window-touch-quotes-pay-35`, 2 on the one-item
     *   `shop-window-touch-quotes-pay`) and, bare, the ticker's ribbon
     *   past its cell (3).
     *
     * Lowered as the port changes the screens they fall on, with the
     * change that lowers them; raised only by a reviewed diff that names
     * what now clips and why. A new mood is a new variant, with an entry of
     * its own.
     */
    't-inkwash': Object.freeze({
        bare: Object.freeze({
            mobile: Object.freeze({ 'clipped-away': 8, 'not-rendered': 5 }),
            desktop: Object.freeze({ 'clipped-away': 3, 'not-rendered': 4 }),
            canvas: Object.freeze({ 'clipped-away': 104, 'not-rendered': 0 }),
        }),
        worn: Object.freeze({
            mobile: Object.freeze({ 'clipped-away': 8, 'not-rendered': 5 }),
            desktop: Object.freeze({ 'clipped-away': 3, 'not-rendered': 4 }),
            canvas: Object.freeze({ 'clipped-away': 101, 'not-rendered': 0 }),
        }),
        'flags 65407': Object.freeze({
            mobile: Object.freeze({ 'clipped-away': 8, 'not-rendered': 5 }),
            desktop: Object.freeze({ 'clipped-away': 3, 'not-rendered': 4 }),
            canvas: Object.freeze({ 'clipped-away': 101, 'not-rendered': 0 }),
        }),
    }),
});

/** A carried look's skips summed over its variants, per viewport: what the run prints beside the per-variant ceilings. */
export function sumVariants(byVariant = {}) {
    const out = {};
    for (const skips of Object.values(byVariant)) {
        for (const vp of SKIP_VIEWPORTS) {
            for (const why of LINE_SKIP_KINDS) {
                const at = (out[vp] ??= { 'clipped-away': 0, 'not-rendered': 0 });
                at[why] += skips[vp]?.[why] ?? 0;
            }
        }
    }
    return out;
}

/**
 * A carried look's line skips by viewport and screen, from the contrast
 * pass's job records (`{ viewport, screen, classes, skips }`, the dump's
 * `jobs`): a job counts for `cls` when the stall it painted wore it. Only
 * screens with a skip are named. What the run prints beside the sums the
 * ceiling holds (`skipsByScreenLine`), so a count that holds while the
 * screens behind it change is on screen (the 8g1 critic's P3-1): a new
 * clipped line on one screen hidden by one fewer on another reads the
 * same sum and a different line.
 */
export function skipsByScreen(records, cls) {
    const out = {};
    for (const record of records) {
        if (!(record.classes ?? []).includes(cls)) continue;
        for (const why of LINE_SKIP_KINDS) {
            const n = record.skips?.[why] ?? 0;
            if (n === 0) continue;
            const at = ((out[record.viewport] ??= {})[record.screen] ??= { 'clipped-away': 0, 'not-rendered': 0 });
            at[why] += n;
        }
    }
    return out;
}

/** `skipsByScreen`'s answer as one line: per viewport, each screen's clipped-away/not-rendered, screens sorted. */
export function skipsByScreenLine(byScreen) {
    const parts = SKIP_VIEWPORTS.map((vp) => {
        const screens = Object.entries(byScreen[vp] ?? {}).sort(([a], [b]) => a.localeCompare(b));
        return `${vp} ${screens.length === 0 ? 'none' : screens.map(([screen, at]) => `${screen} ${at['clipped-away']}/${at['not-rendered']}`).join(', ')}`;
    });
    return parts.join('; ');
}

/**
 * The codes owed by name (`CODES_REQUIRED`) that a paid look cannot paint
 * in step 8: the name sheet composes no record naming a paid look
 * (`PUBLISH_LOOK_NOT_UNLOCKED`, 8b2), and the harness paints a paid look by
 * try-on, so the publish screen under it shows the refusal and no code.
 * Step 9's licence check brings the record — and the code — back.
 */
export const PAID_LOOK_UNPAINTED_CODES = Object.freeze(['desktop/publish-name:publish-qr']);

/**
 * Why each carried look's own tallies fail, as sentences, and what the run
 * should print beside them (`notes`):
 *
 * - `carried`: `[{ cls, paid }]`, every private look the run carries;
 * - `lineSkips`: `{ [cls]: { [variant]: { [viewport]: { 'clipped-away', 'not-rendered' } } } }`,
 *   the variant `skipVariantOf`'s name;
 * - `cover`: `{ [pass]: coverByClass }`, 1a's tallies per look on every pass
 *   that read it (`coverTally`'s shape);
 * - `reach`: `{ [pass]: reachByClass }`, 1b's tallies per look on every
 *   geometry pass that owes it (`reachTally`'s shape): a carried look owes a
 *   read that held a target on each (7b);
 * - `walk`: `{ [pass]: walkByClass }`, 3a's tallies per look on every geometry
 *   pass that owes it (`walkTally`'s shape): a carried look owes a figure's
 *   element read to its stall on each (D-2026-10-28-01);
 * - `clipCeiling`: the ratio the public looks are held to (`CLIP_SKIP_CEILING`);
 * - `codesRead`: `{ [cls]: Set<'viewport/screen:code'> }`, the quiet-zone reads;
 * - `moduleCodesRead`: the same, 1d's reads (`a-codes-modules-read-as-its-matrix`,
 *   7c), owed on the same codes;
 * - `codesRequired`: the codes owed by name (`CODES_REQUIRED`);
 * - `chars`: 1c's fold by viewport and look (`vp cls` → `triggered`, `chars`,
 *   …; 7d): a carried look owes characters read on each viewport where its
 *   jobs triggered (`charsOwedFaults`);
 * - `ceilings`: the table (`CARRIED_LINE_SKIP_CEILING` by default).
 */
export function carriedTallyFaults({
    carried,
    lineSkips = {},
    cover = {},
    reach = {},
    walk = {},
    clipCeiling,
    codesRead = {},
    moduleCodesRead = {},
    codesRequired = [],
    chars = {},
    ceilings = CARRIED_LINE_SKIP_CEILING,
}) {
    const faults = [];
    const notes = [];
    // A class is a key of each map, never a property it inherits.
    const own = (map, key) => (Object.hasOwn(map, key) ? map[key] : undefined);
    for (const { cls, paid } of carried) {
        const table = own(ceilings, cls);
        const byVariant = own(lineSkips, cls) ?? {};
        const measuredLine = (skips) =>
            SKIP_VIEWPORTS.map((vp) => `${vp} ${skips[vp]?.['clipped-away'] ?? 0}/${skips[vp]?.['not-rendered'] ?? 0}`).join(', ');
        if (table === undefined) {
            const read = Object.keys(byVariant).length === 0 ? measuredLine({}) : Object.entries(byVariant).map(([variant, skips]) => `${variant}: ${measuredLine(skips)}`).join('; ');
            faults.push(
                `${cls} is carried and has no line-skip ceiling of its own (CARRIED_LINE_SKIP_CEILING, scripts/look-tallies.mjs) — ` +
                    `measured clipped-away/not-rendered: ${read}; a look's ceiling is a reviewed entry that says what is clipped and why`,
            );
        } else {
            // Every variant the run measured and every variant the entry names.
            const variants = [...new Set([...Object.keys(table), ...Object.keys(byVariant)])];
            for (const variant of variants) {
                const ceiling = own(table, variant);
                const skips = own(byVariant, variant) ?? {};
                if (ceiling === undefined) {
                    faults.push(
                        `${cls}: its ${variant} variant was measured and has no line-skip ceiling of its own (CARRIED_LINE_SKIP_CEILING) — ` +
                            `measured clipped-away/not-rendered: ${measuredLine(skips)}; a variant's ceiling is a reviewed entry, so a mood's skips cannot hide another variant's`,
                    );
                    continue;
                }
                // A variant the entry names and the run measured no job of:
                // its jobs went missing (a mood dropped from the plan), and
                // every count reading under its ceiling would say so only as
                // notes (the critic's P3-1).
                if (!Object.hasOwn(byVariant, variant)) {
                    faults.push(
                        `${cls}: its ${variant} variant has a line-skip ceiling (CARRIED_LINE_SKIP_CEILING) and the run measured no job of it — ` +
                            `a variant's jobs gone from the plan read as no skips; remove the entry with the change that removed the variant`,
                    );
                    continue;
                }
                for (const vp of SKIP_VIEWPORTS) {
                    for (const why of LINE_SKIP_KINDS) {
                        const most = ceiling[vp]?.[why] ?? 0;
                        const n = skips[vp]?.[why] ?? 0;
                        if (n > most) {
                            faults.push(
                                `${cls} (${variant}): ${n} line target(s) ${why} at ${vp}, over its own ${most} (CARRIED_LINE_SKIP_CEILING) — a line clipped out of view reads green unless this is held`,
                            );
                        } else if (n < most) {
                            notes.push(`${cls} (${variant}): ${n} line target(s) ${why} at ${vp}, under its own ${most} — lower it`);
                        }
                    }
                }
            }
        }
        for (const pass of Object.keys(cover)) {
            const why = clipCeilingFault(coverTally(cover[pass], [cls]), clipCeiling);
            if (why !== undefined) faults.push(`${cls} at ${pass}: ${why}`);
        }
        for (const pass of Object.keys(reach)) {
            const t = reachTally(reach[pass], [cls]);
            if (t.paints === 0) faults.push(`${cls} at ${pass}: a-paint-with-no-hit-area-reaches-no-money read no paint of it`);
            else if (t.targets === 0) faults.push(`${cls} at ${pass}: a-paint-with-no-hit-area-reaches-no-money held no target on it`);
        }
        for (const pass of Object.keys(walk)) {
            if (walkTally(walk[pass], [cls]).elements === 0) faults.push(`${cls} at ${pass}: the-ground-walk-reaches-the-stall read no figure of it`);
        }
        const owed = codesRequired.filter((code) => !(paid && PAID_LOOK_UNPAINTED_CODES.includes(code)));
        const read = own(codesRead, cls) ?? new Set();
        const unread = owed.filter((code) => !read.has(code));
        if (unread.length > 0) {
            faults.push(`${cls}: a-code-keeps-its-quiet-zone-white read no quiet zone on ${unread.join(', ')} under it`);
        }
        const modulesRead = own(moduleCodesRead, cls) ?? new Set();
        const modulesUnread = owed.filter((code) => !modulesRead.has(code));
        if (modulesUnread.length > 0) {
            faults.push(`${cls}: a-codes-modules-read-as-its-matrix read no module of ${modulesUnread.join(', ')} under it`);
        }
        for (const why of charsOwedFaults(chars, [cls])) faults.push(`${cls}: ${why}`);
    }
    return { faults, notes };
}
