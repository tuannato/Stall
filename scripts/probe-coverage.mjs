/**
 * What the step-2 probe rules owe a pass, held by the runner
 * (`layout-check.mjs`) the way `pay-screens.mjs` holds the pay screens: the
 * page reports what it compared, and a rule that compared nothing is a green
 * pass over nothing — a renamed fixture or a var that stopped reading would
 * otherwise leave it quiet.
 *
 * - **`an-unbuyable-offer-paints-no-figure-and-says-so`** reads an unbuyable
 *   offer's label in each place one is painted: `row` and `face` at a phone
 *   and a desk, and the wall's Browse (`wall-browse`) at the desk — the wall
 *   does not paint below its floor. The wall's Cycle card and the stream's
 *   card and ticker paint no label: they skip such a listing (2026-09-24),
 *   so what the desk pass owes there is a Cycle card seen skipping one, and
 *   the canvas pass a stream card and a ticker item (`skipChecks`).
 * - **`a-shipped-row-states-the-sizes-its-sheet-paints`** reads every shipped
 *   look's row, at both widths.
 * - **`a-door-mini-paints-as-its-own-look`** compares every shipped look's
 *   deck mini with that look's own shop, at both widths.
 * - **`the-skeletons-ladder-steps-the-rows-size`** reads a tier-1, a tier-2
 *   and a tier-3 figure on the skeleton, at a phone, where the ladder applies.
 *
 * Only the phone, desk and canvas passes owe anything; the others measure
 * other screens (`mobile`, `desktop` and `canvas` are the runner's pass
 * names). The canvas owes only the overlay's places: the step-2 row rules
 * read page screens.
 */

const UNBUYABLE_PLACES = {
    mobile: ['row', 'face'],
    desktop: ['row', 'face', 'wall-browse'],
    canvas: [],
};
/** The skips each pass owes: the surfaces that step through one card at a time. */
const SKIP_SURFACES = {
    desktop: ['wall-cycle'],
    canvas: ['stream-card', 'stream-ticker'],
};
/** The passes the row-size and ladder rules read: page screens only. */
const PAGE_PASSES = new Set(['mobile', 'desktop']);

/**
 * Why a pass compared less than it owes, as sentences — empty when it owes
 * nothing or compared everything. `shippedClasses` are the classes of the
 * looks whose rows must be read; `skeleton` is whether the skeleton was
 * measured (the ordinary run, not the kit's).
 */
export function probeCoverageGaps(pass, report, { shippedClasses = [], skeleton = false } = {}) {
    const places = UNBUYABLE_PLACES[pass];
    if (places === undefined) return [];
    const gaps = [];
    const read = report.unbuyableChecks ?? {};
    for (const place of places) {
        if (!((read[place] ?? 0) > 0)) {
            gaps.push(`an-unbuyable-offer-paints-no-figure-and-says-so read no label on a ${place}`);
        }
    }
    for (const surface of SKIP_SURFACES[pass] ?? []) {
        if (!(((report.skipChecks ?? {})[surface] ?? 0) > 0)) {
            gaps.push(`an-unbuyable-offer-paints-no-figure-and-says-so saw no ${surface} skip an unbuyable listing`);
        }
    }
    if (!PAGE_PASSES.has(pass)) return gaps;
    const rows = new Set(report.rowSizeClasses ?? []);
    const minis = new Set(report.doorMiniClasses ?? []);
    for (const cls of shippedClasses) {
        if (!rows.has(cls)) {
            gaps.push(`a-shipped-row-states-the-sizes-its-sheet-paints read no row for ${cls}`);
        }
        if (!minis.has(cls)) {
            gaps.push(`a-door-mini-paints-as-its-own-look compared no ${cls} mini with its shop`);
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
    if (UNBUYABLE_PLACES[pass] === undefined) return '';
    const read = Object.entries(report.unbuyableChecks ?? {})
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([place, n]) => `${place} ${n}`)
        .join(', ');
    const tiers = Object.entries(report.ladderTiers ?? {})
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([tier, n]) => `tier ${tier} ${n}`)
        .join(', ');
    const skips = Object.entries(report.skipChecks ?? {})
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([surface, n]) => `${surface} ${n}`)
        .join(', ');
    const skipped = (SKIP_SURFACES[pass] ?? []).length === 0 ? '' : ` · skips seen: ${skips || 'none'}`;
    if (!PAGE_PASSES.has(pass)) return `unbuyable labels read: ${read || 'none'}${skipped}`;
    return (
        `unbuyable labels read: ${read || 'none'}` +
        skipped +
        ` · rows read: ${(report.rowSizeClasses ?? []).join(', ') || 'none'}` +
        ` · door minis: ${(report.doorMiniClasses ?? []).join(', ') || 'none'}` +
        (tiers === '' ? '' : ` · skeleton ladder: ${tiers}`)
    );
}
