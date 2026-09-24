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
 * - **`nothing-on-the-wall-is-cut-from-below`** reads the touch wall's
 *   controls on the three passes that paint it: the canvas (1920x1080), the
 *   portrait wall (1080x1920) and the counter tablet (768x1024) — every one
 *   of its five controls on each, and the payment's two lines outside its
 *   scroller, "+N more" and the borrowed-token sentence (`WALL_ROLES`), each
 *   read WHOLE: a stepper cut to a sliver is printed on the pass's line and
 *   counts as nothing read. A "+N more" read whole is also the
 *   `a-payment-list-that-scrolls-says-how-many-lines-it-hides` rule
 *   comparing a nonzero count.
 * - **`small-text-is-at-least-11px`** reads the raised small-text nodes on
 *   the phone and desk passes; what it only reports (text under 11px inside
 *   an aria-hidden subtree) is printed on the pass's `compared:` line.
 * - **`the-skeletons-ladder-steps-the-rows-size`** reads a tier-1, a tier-2
 *   and a tier-3 figure on the skeleton, at a phone, where the ladder applies.
 *
 * The phone and desk passes owe the page rules, the canvas the overlay's
 * places and the wall's controls, and the portrait and tablet passes the
 * wall's controls; the reduced-motion and contrast passes owe nothing here
 * (`mobile`, `desktop`, `canvas`, `portrait` and `tablet` are the runner's
 * pass names).
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
/** The passes that paint the touch wall, whose controls the wall rule reads. */
const WALL_PASSES = new Set(['canvas', 'portrait', 'tablet']);
/** The touch wall's controls and held lines, by role: a pass that read none of one read nothing of it. */
const WALL_ROLES = [
    'window-back',
    'window-pay',
    'window-clear',
    'window-step-fewer',
    'window-step-more',
    'pay-lines-more',
    'pay-borrowed',
];

/**
 * Why a pass compared less than it owes, as sentences — empty when it owes
 * nothing or compared everything. `shippedClasses` are the classes of the
 * looks whose rows must be read; `skeleton` is whether the skeleton was
 * measured (the ordinary run, not the kit's).
 */
export function probeCoverageGaps(pass, report, { shippedClasses = [], skeleton = false } = {}) {
    const gaps = [];
    if (WALL_PASSES.has(pass)) {
        const roles = report.wallControlRoles ?? {};
        for (const role of WALL_ROLES) {
            if (!((roles[role] ?? 0) > 0)) {
                gaps.push(`nothing-on-the-wall-is-cut-from-below read no ${role} on a wall`);
            }
        }
    }
    const places = UNBUYABLE_PLACES[pass];
    if (places === undefined) return gaps;
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
    if (!((report.floorNamedChecks ?? 0) > 0)) {
        gaps.push('small-text-is-at-least-11px read no named small-text node');
    }
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
    // Text under 11px that no reader is given (aria-hidden) is reported,
    // never failed — on every pass that paints some, not the page ones only.
    const hiddenSmall = (report.smallText ?? []).length === 0 ? '' : ` · under 11px, aria-hidden: ${report.smallText.join('; ')}`;
    const wall = WALL_PASSES.has(pass)
        ? `wall controls read: ${report.wallControlChecks ?? 0}` + sliverLine(report.wallSlivers ?? []) + hiddenSmall
        : '';
    if (UNBUYABLE_PLACES[pass] === undefined) return wall;
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
    if (!PAGE_PASSES.has(pass)) {
        return [`unbuyable labels read: ${read || 'none'}${skipped}`, wall || hiddenSmall.replace(/^ · /, '')]
            .filter(Boolean)
            .join(' · ');
    }
    return (
        `unbuyable labels read: ${read || 'none'}` +
        skipped +
        ` · rows read: ${(report.rowSizeClasses ?? []).join(', ') || 'none'}` +
        ` · door minis: ${(report.doorMiniClasses ?? []).join(', ') || 'none'}` +
        ` · small text read: ${report.floorNamedChecks ?? 0}` +
        ` (under 11px, aria-hidden: ${(report.smallText ?? []).join('; ') || 'none'})` +
        (tiers === '' ? '' : ` · skeleton ladder: ${tiers}`)
    );
}

/**
 * The slivers the wall rule printed rather than failed, by role: how many,
 * and the least of each that showed. An entry is
 * `<screen> <look>: <role> <shown>/<need>px <axis>`.
 */
function sliverLine(slivers) {
    if (slivers.length === 0) return '';
    const byRole = new Map();
    for (const entry of slivers) {
        const m = /: (\S+) (\d+)\/(\d+)px/.exec(entry);
        if (m === null) continue;
        const [, role, shown, need] = m;
        const at = byRole.get(role) ?? { n: 0, least: Infinity, need: Number(need) };
        at.n += 1;
        at.least = Math.min(at.least, Number(shown));
        byRole.set(role, at);
    }
    const parts = [...byRole].sort(([a], [b]) => a.localeCompare(b)).map(([role, at]) => `${role} ×${at.n} (least ${at.least}/${at.need}px)`);
    return ` · shown only in part inside a scroller: ${parts.join(', ')}`;
}
