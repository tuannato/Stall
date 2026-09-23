/**
 * What the step-2 probe rules owe a pass, held by the runner
 * (`layout-check.mjs`) the way `pay-screens.mjs` holds the pay screens: the
 * page reports what it compared, and a rule that compared nothing is a green
 * pass over nothing — a renamed fixture or a var that stopped reading would
 * otherwise leave it quiet.
 *
 * - **`the-dash-is-the-size-of-the-figure`** compares a dash with a buyable
 *   figure in each place one is painted: `row` and `face` at a phone and a
 *   desk, and the wall's two modes (`wall-browse`, `wall-cycle`) at the desk
 *   — the wall does not paint below its floor.
 * - **`a-shipped-row-states-the-sizes-its-sheet-paints`** reads every shipped
 *   look's row, at both widths.
 * - **`the-skeletons-ladder-steps-the-rows-size`** reads a tier-1, a tier-2
 *   and a tier-3 figure on the skeleton, at a phone, where the ladder applies.
 *
 * Only the phone and desk passes owe anything; the others measure other
 * screens (`mobile` and `desktop` are the runner's pass names).
 */

const DASH_PLACES = {
    mobile: ['row', 'face'],
    desktop: ['row', 'face', 'wall-browse', 'wall-cycle'],
};

/**
 * Why a pass compared less than it owes, as sentences — empty when it owes
 * nothing or compared everything. `shippedClasses` are the classes of the
 * looks whose rows must be read; `skeleton` is whether the skeleton was
 * measured (the ordinary run, not the kit's).
 */
export function probeCoverageGaps(pass, report, { shippedClasses = [], skeleton = false } = {}) {
    const places = DASH_PLACES[pass];
    if (places === undefined) return [];
    const gaps = [];
    const dash = report.dashChecks ?? {};
    for (const place of places) {
        if (!((dash[place] ?? 0) > 0)) {
            gaps.push(`the-dash-is-the-size-of-the-figure compared no dash with a figure on a ${place}`);
        }
    }
    const rows = new Set(report.rowSizeClasses ?? []);
    for (const cls of shippedClasses) {
        if (!rows.has(cls)) {
            gaps.push(`a-shipped-row-states-the-sizes-its-sheet-paints read no row for ${cls}`);
        }
    }
    if (skeleton && pass === 'mobile') {
        const tiers = report.ladderTiers ?? {};
        for (const tier of ['1', '2', '3']) {
            if (!((tiers[tier] ?? 0) > 0)) {
                gaps.push(`the-skeletons-ladder-steps-the-rows-size read no tier-${tier} figure`);
            }
        }
    }
    return gaps;
}

/** What a pass compared, in one line for the runner to print — empty for a pass that owes nothing. */
export function probeCoverageLine(pass, report) {
    if (DASH_PLACES[pass] === undefined) return '';
    const dash = Object.entries(report.dashChecks ?? {})
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([place, n]) => `${place} ${n}`)
        .join(', ');
    const tiers = Object.entries(report.ladderTiers ?? {})
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([tier, n]) => `tier ${tier} ${n}`)
        .join(', ');
    return (
        `dash against figure: ${dash || 'none'} · rows read: ${(report.rowSizeClasses ?? []).join(', ') || 'none'}` +
        (tiers === '' ? '' : ` · skeleton ladder: ${tiers}`)
    );
}
