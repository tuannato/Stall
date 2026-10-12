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
 * - **line skips** (`LINE_SKIP_CEILING`'s rule, per look): a ceiling of its
 *   own in `CARRIED_LINE_SKIP_CEILING`, by value and with its reason, exact
 *   when set; **a carried look with no entry fails the run**, so a new
 *   look's numbers arrive by a reviewed diff that names what is clipped and
 *   why, never by a run that read them and said nothing;
 * - **points behind a clip** (`CLIP_SKIP_CEILING`'s rule): the same ratio on
 *   its own points, on every geometry pass, and a pass that hit-tested none
 *   of its points measured nothing of it;
 * - **the codes owed by name** (`CODES_REQUIRED`): every one read on its own
 *   jobs, but the record sheet's code under a paid look — the name sheet
 *   composes no record naming a paid look in step 8 (8b2), so under the
 *   look the sheet shows its refusal and no code (`PAID_LOOK_UNPAINTED_CODES`);
 * - **the wall's controls** (`WALL_ROLES`): owed on its own walls, in
 *   `probe-coverage.mjs` beside the public count.
 *
 * Pure: tallies in, sentences out. Node built-ins only; no `.d.mts`, no TS
 * test imports it. Test: `a-carried-look-is-held-to-its-own-skip-ceilings`
 * (`scripts/look-tallies.test.mjs`).
 */

/** The two kinds of line skip the contrast pass counts (`LINE_SKIP_CEILING`'s). */
export const LINE_SKIP_KINDS = Object.freeze(['clipped-away', 'not-rendered']);

/** The contrast pass's viewports, whose skips a ceiling states. */
export const SKIP_VIEWPORTS = Object.freeze(['mobile', 'desktop', 'canvas']);

/** The geometry passes whose points a carried look is held to. */
export const CLIP_PASSES = Object.freeze(['mobile', 'desktop', 'canvas']);

/**
 * Each carried look's line skips, per viewport, as measured — exact
 * ceilings, `LINE_SKIP_CEILING`'s rule: more fails and names the count;
 * fewer says so, and the entry comes down with the change that lowered it.
 * A carried class with no entry fails the run (`carriedTallyFaults`). The
 * ceiling holds sums; the run prints each carried look's skips per screen
 * beside them on every run (`skipsByScreen`), so an entry's reason can be
 * checked against the screens that make it.
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
        mobile: Object.freeze({ 'clipped-away': 16, 'not-rendered': 10 }),
        desktop: Object.freeze({ 'clipped-away': 4, 'not-rendered': 8 }),
        canvas: Object.freeze({ 'clipped-away': 207, 'not-rendered': 0 }),
    }),
    /*
     * The private look at 0x04, measured 2026-10-12 over the contrast
     * targets as they stand, on its bare variant alone (it carries no
     * worn variant yet, so each count is about half the fixture's). The
     * counts are measured, and fall on these screens, from the run's own
     * dump:
     *
     * - mobile clipped-away 8: `studio-items`;
     * - mobile not-rendered 5, desktop not-rendered 4: `shop-window-sheet`,
     *   the halves a phone hides (the desk-only controls, a closed
     *   switch's row);
     * - desktop clipped-away 7: `shop-window-browse` 2 and `studio-items`
     *   5 (2 → 7, 2026-10-12; the 5 are provisional);
     * - canvas clipped-away 104: the wall payment's lines past its
     *   plate's scroller (99 on `shop-window-touch-quotes-pay-35`, 2 on
     *   the one-item `shop-window-touch-quotes-pay`) and the ticker's
     *   ribbon past its cell (3).
     *
     * Lowered as the port changes the screens they fall on, with the
     * change that lowers them; raised only by a reviewed diff that names
     * what now clips and why.
     */
    't-inkwash': Object.freeze({
        mobile: Object.freeze({ 'clipped-away': 8, 'not-rendered': 5 }),
        desktop: Object.freeze({ 'clipped-away': 7, 'not-rendered': 4 }),
        canvas: Object.freeze({ 'clipped-away': 104, 'not-rendered': 0 }),
    }),
});

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
 * - `lineSkips`: `{ [cls]: { [viewport]: { 'clipped-away', 'not-rendered' } } }`;
 * - `clip`: `{ [cls]: { [pass]: { skips, checks } } }`, the geometry passes';
 * - `clipCeiling`: the ratio the public looks are held to (`CLIP_SKIP_CEILING`);
 * - `codesRead`: `{ [cls]: Set<'viewport/screen:code'> }`, the quiet-zone reads;
 * - `codesRequired`: the codes owed by name (`CODES_REQUIRED`);
 * - `ceilings`: the table (`CARRIED_LINE_SKIP_CEILING` by default).
 */
export function carriedTallyFaults({
    carried,
    lineSkips = {},
    clip = {},
    clipCeiling,
    codesRead = {},
    codesRequired = [],
    ceilings = CARRIED_LINE_SKIP_CEILING,
}) {
    const faults = [];
    const notes = [];
    // A class is a key of each map, never a property it inherits.
    const own = (map, key) => (Object.hasOwn(map, key) ? map[key] : undefined);
    for (const { cls, paid } of carried) {
        const table = own(ceilings, cls);
        const skips = own(lineSkips, cls) ?? {};
        if (table === undefined) {
            const read = SKIP_VIEWPORTS.map(
                (vp) => `${vp} ${skips[vp]?.['clipped-away'] ?? 0}/${skips[vp]?.['not-rendered'] ?? 0}`,
            ).join(', ');
            faults.push(
                `${cls} is carried and has no line-skip ceiling of its own (CARRIED_LINE_SKIP_CEILING, scripts/look-tallies.mjs) — ` +
                    `measured clipped-away/not-rendered: ${read}; a look's ceiling is a reviewed entry that says what is clipped and why`,
            );
        } else {
            for (const vp of SKIP_VIEWPORTS) {
                for (const why of LINE_SKIP_KINDS) {
                    const most = table[vp]?.[why] ?? 0;
                    const n = skips[vp]?.[why] ?? 0;
                    if (n > most) {
                        faults.push(
                            `${cls}: ${n} line target(s) ${why} at ${vp}, over its own ${most} (CARRIED_LINE_SKIP_CEILING) — a line clipped out of view reads green unless this is held`,
                        );
                    } else if (n < most) {
                        notes.push(`${cls}: ${n} line target(s) ${why} at ${vp}, under its own ${most} — lower it`);
                    }
                }
            }
        }
        for (const pass of CLIP_PASSES) {
            const at = own(clip, cls)?.[pass] ?? { skips: 0, checks: 0 };
            const all = at.skips + at.checks;
            if (at.checks === 0) {
                faults.push(`${cls}: the ${pass} pass hit-tested none of its points — the cover check ran over nothing of it`);
            } else if (at.skips / all > clipCeiling) {
                faults.push(
                    `${cls}: ${at.skips}/${all} of its points behind a clip at ${pass} (${((at.skips / all) * 100).toFixed(0)}%), ` +
                        `above the ${(clipCeiling * 100).toFixed(0)}% ceiling — the clip tolerance is eating the cover check`,
                );
            }
        }
        const owed = codesRequired.filter((code) => !(paid && PAID_LOOK_UNPAINTED_CODES.includes(code)));
        const read = own(codesRead, cls) ?? new Set();
        const unread = owed.filter((code) => !read.has(code));
        if (unread.length > 0) {
            faults.push(`${cls}: a-code-keeps-its-quiet-zone-white read no quiet zone on ${unread.join(', ')} under it`);
        }
    }
    return { faults, notes };
}
