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
 *   look's row, at both widths — and every private look the run's selection
 *   carries (8e2: `privateClasses`), whose row the build ships beside them.
 * - **`the-record-road-paints-a-locked-look-as-the-default`** paints the
 *   record road once for every paid private look the run carries
 *   (`paidPrivateClasses`, 8e2), at both widths: the harness measures such a
 *   look through the try-on under its own licence, and this is what holds
 *   the app's gate to the default while it does.
 * - **`a-door-mini-paints-as-its-own-look`** compares every shipped look's
 *   deck mini with that look's own shop, at both widths.
 * - **`nothing-on-the-wall-is-cut-from-below`** reads the touch wall's
 *   controls — on the public looks, and on each carried private look's own
 *   walls (8e2: `wallControlRolesByClass`) — on the five passes that paint it: the canvas (1920x1080),
 *   the portrait wall (1080x1920), the counter tablet (768x1024) and the two
 *   desk walls (1280x900, 1280x800; 2026-10-13) — every one
 *   of its five controls on each, and the payment's two lines outside its
 *   scroller, "+N more" and the borrowed-token sentence (`WALL_ROLES`), each
 *   read WHOLE: a stepper cut to a sliver is printed on the pass's line and
 *   counts as nothing read. A "+N more" read whole is also the
 *   `a-payment-list-that-scrolls-says-how-many-lines-it-hides` rule
 *   comparing a nonzero count.
 * - **`an-outline-where-the-text-has-its-own-ground`** reads the lines the
 *   rain outlines, on the phone and desk passes wherever Neo is measured or
 *   any look wore the rain (`wornClasses`: the kit's Neo starter as much as
 *   Neo).
 * - **`the-money-set-is-every-protected-contrast-target`** runs on every
 *   geometry pass; the phone and desk passes owe nodes asked (a canvas or
 *   wall pass may paint none of one kind, so it owes nothing here).
 * - **`an-outline-that-shows-at-rest`** reads the rain-wearing root's
 *   layers by what they are, on the phone and desk passes wherever Neo is
 *   measured or any look wore the rain: the rain is set aside there by
 *   name, or no root was read.
 * - **`nothing-in-the-body-reaches-the-status-line`** asks the wall's body
 *   on the five wall passes.
 * - **`a-cycle-card-shows-every-digit-at-every-wall-size`** (2026-10-13)
 *   reads the Cycle card's figure at every step of its ladder
 *   (`CYCLE_STEPS_OWED`) on every look each wall pass painted: the canvas
 *   (1920x1080), the two desk walls (1280x900, 1280x800), the tall wall
 *   (1080x1920) and the counter tablet (768x1024).
 * - **`the-bunting-never-swings-into-the-ornament-label`** sweeps Rural's
 *   bunting on the phone and desk passes wherever Rural is measured or any
 *   look wore the bunting.
 * - **`a-halo-never-reaches-a-neighbours-text`** runs on every geometry
 *   pass; the phone and desk passes owe halos asked (the sticky sheet
 *   head's slab among them).
 * - **`small-text-is-at-least-11px`** reads the raised small-text nodes on
 *   the phone and desk passes; what it only reports (text under 11px inside
 *   an aria-hidden subtree) is printed on the pass's `compared:` line.
 * - **`the-skeletons-ladder-steps-the-rows-size`** reads a tier-1, a tier-2
 *   and a tier-3 figure on the skeleton, at a phone, where the ladder applies.
 *
 * - **`no-word-is-clipped-by-a-file`** asks, on the phone and desk passes,
 *   every element with words of its own whether it or an ancestor is masked
 *   or clipped by a file.
 * - **`no-shipped-look-shows-a-mark`** reads, on every pass, every mark a
 *   look this build does not carry as a private one painted (`markChecksByClass`,
 *   per class of the pass's `sheetClasses`): each computes `display: none`.
 * - **`a-look-is-measured-with-its-sheet`** reads, on every pass, the name
 *   each look's sheet gives a painted stall (`sheetedClasses`: every look the
 *   run measures but the sheetless skeleton) — a look this pass painted and
 *   never read was measured with its sheet unproved.
 * - **`the-sellers-name-stands-whole`** (8f2) reads, on every page and wall
 *   pass, a line of the sign on every look the pass painted
 *   (`nameLinesByClass`), and on the page passes the stress names on a
 *   try-on of every carried private look (`tryOnNamesByClass`).
 * - **`a-sticky-sign-covers-nothing-as-the-region-scrolls`** (8f2): a page
 *   pass that found a sticky sign owes it a region that scrolled
 *   (`stickyByClass`).
 * - **The tracked fixture's subjects** (8f2, `TRACKED_FIXTURE_CLASS`): a run
 *   that carries it owes a region scrolled under its sticky sign, a mark it
 *   shows and a vertical name at the desk, a rung its long name climbed on
 *   both page passes and the last rung on the phone, and a line read under
 *   its own clip on both (the 8g1 critic's P2-3); the runner owes its
 *   art-off frames, pending and failed, on the contrast pass, and a
 *   mark-hide and pending frame for any carried look with marks or file art.
 * - **`a-cjk-name-is-set-in-a-cjk-face`** (8f2): a pass that measured
 *   `cjk-name` owes the advance it read (`cjkFaces`).
 * - **`a-broken-figure-wears-the-figures-own-ink`** (D-2026-10-14-02):
 *   every geometry pass owes, on every look it painted, a broken figure
 *   whose pieces were held to the figure's own computed style
 *   (`figureInkByClass`): each pass paints one — the long card and row
 *   figures on the page and narrow passes, the Cycle card's break steps on
 *   the canvas and the four wall passes.
 * - **`a-card-figure-stands-inside-its-row`** (2026-10-13; round 2): the
 *   narrow pass (360x800) and the phone pass owe, on every look they
 *   painted, a read of every step of the face's figure, "You pay", a pay
 *   sheet's figure and a Pay several line (`CARD_FIGURES_OWED`,
 *   `cardFigureByClass`, per look and per place:tier), and
 *   **`a-card-figure-steps-down-on-every-look`** the four figures' painted
 *   ladders compared (`CARD_LADDERS_OWED`, `cardLadderByClass`).
 *
 * The phone and desk passes owe the page rules, the canvas the overlay's
 * places and the wall's controls and Cycle steps, the portrait, tablet and
 * two desk wall passes the wall's controls and Cycle steps, and the narrow
 * pass the card figures (the phone pass owes them too); the reduced-motion
 * and contrast passes owe nothing here (`mobile`, `desktop`, `canvas`,
 * `portrait`, `tablet`, `desk-wall`, `short-wall` and `narrow` are the
 * runner's pass names).
 */

import { FIXTURE_PRIVATE_LOOK_CLASS } from './private-looks.mjs';

/**
 * The tracked fixture's class (`layout/fixture-private-looks/`, measured by
 * every default run): the look that gives each 8f2 rule a subject in public
 * CI — a sticky sign in its own column at the desk, a mark it shows, file
 * art under the sign's name, and a name ladder a long name climbs. A run
 * that carries it owes each one (`probeCoverageGaps`, and the runner's
 * contrast verdicts), so a fixture edit that took a subject away fails the
 * run rather than leaving the rule green over nothing.
 */
export const TRACKED_FIXTURE_CLASS = FIXTURE_PRIVATE_LOOK_CLASS;

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
 * The passes that paint the touch wall, whose controls the wall rule reads:
 * the canvas, the tall wall, the counter tablet, and since the Cycle card's
 * ladder the two desk wall passes (1280x900, 1280x800).
 */
const WALL_PASSES = new Set(['canvas', 'portrait', 'tablet', 'desk-wall', 'short-wall']);
/**
 * Every geometry pass: the two page passes, the canvas, the four wall passes
 * and the narrow phone. Each paints a broken money figure on every look
 * (`a-broken-figure-wears-the-figures-own-ink`).
 */
const GEOMETRY_PASSES = new Set(['mobile', 'desktop', 'canvas', 'portrait', 'tablet', 'desk-wall', 'short-wall', 'narrow']);
/**
 * The Cycle card's steps each wall pass owes read on every look it painted
 * (`a-cycle-card-shows-every-digit-at-every-wall-size`): tier 0 and every
 * step of `WALL_FIGURE_CEILINGS` (src/ui/window.ts; nine ceilings, ten steps),
 * each at its widest figure (`shop-window-cycle-*` in layout/fixtures.ts). A
 * step no fixture paints at a wall size is a gap, not a pass. Pinned to the
 * table by `the-cycle-steps-owed-are-the-ladders-own`.
 */
export const CYCLE_STEPS_OWED = Object.freeze(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
/**
 * The passes that owe the card figures' every step: the narrow phone at 360,
 * whose job they are, and the phone at 390, which measures the same screens
 * (round 2, the critic's P2-2).
 */
const CARD_FIGURE_PASSES = new Set(['mobile', 'narrow']);
/**
 * The card figures each of those passes owes on every look it painted, as
 * `place:tier` (`a-card-figure-stands-inside-its-row`): every step of the
 * face's figure, the face's "You pay" figure and a pay sheet's figure, each
 * at its widest (round 2: `item-listing-figure-14`, `-17`, `-21`,
 * `item-listing-long-figure` and the quote faces, whose fold carries "You
 * pay" at the same tier; `pay-figure-14`, `-17`, `pay-long-figure`,
 * `pay-several-long-figure`), and a Pay several line on the three dresses it
 * has: beside its name (`line:0`, up to 17 characters — a line carries a
 * tier only from 18, so it has no `line:1`), on a row of its own (`line:2`)
 * and broken after a comma (`line:3`; `pay-several`,
 * `pay-several-figure-lines`, `pay-several-long-figure`). A step no fixture
 * paints is a gap, not a pass.
 */
export const CARD_FIGURES_OWED = Object.freeze([
    ...['face', 'paid', 'pay'].flatMap((place) => ['0', '1', '2', '3'].map((tier) => `${place}:${tier}`)),
    'line:0',
    'line:2',
    'line:3',
]);
/**
 * The figures whose painted ladder each of those passes owes compared on
 * every look, over all four tiers (`a-card-figure-steps-down-on-every-look`):
 * the face's two by role, "You pay" (no role) and a pay sheet's — named,
 * never counted, so a fifth figure can never stand in for a missing one.
 */
export const CARD_LADDERS_OWED = Object.freeze(['face:price', 'face:seller-price', 'paid:figure', 'pay:price']);
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
export function probeCoverageGaps(
    pass,
    report,
    { shippedClasses = [], privateClasses = [], paidPrivateClasses = [], skeleton = false, sheetedClasses = [] } = {},
) {
    const gaps = [];
    const sheetsRead = new Set(report.lookSheetsRead ?? []);
    for (const cls of sheetedClasses) {
        if (!sheetsRead.has(cls)) {
            gaps.push(`a-look-is-measured-with-its-sheet read no sheet's name on a ${cls} stall`);
        }
    }
    // Every look a pass painted that is not a private look's owes a mark
    // read hidden (step 8f1 after its critic, item 2): a pass that read no
    // mark on a look certified nothing about its marks.
    const marks = report.markChecksByClass ?? {};
    for (const cls of (report.sheetClasses ?? []).filter((c) => !privateClasses.includes(c))) {
        if (!((marks[cls] ?? 0) > 0)) {
            gaps.push(`no-shipped-look-shows-a-mark read no mark on a ${cls} stall`);
        }
    }
    if (WALL_PASSES.has(pass)) {
        // The public looks' own reads, and each carried look's on its own
        // walls (8e2, the 8e2 critic's item 1): one count across looks let
        // the shipped looks owe a carried look's controls for it.
        const byClass = report.wallControlRolesByClass;
        const roles =
            byClass === undefined
                ? (report.wallControlRoles ?? {})
                : Object.entries(byClass)
                      .filter(([cls]) => !privateClasses.includes(cls))
                      .reduce((sum, [, read]) => {
                          for (const [role, n] of Object.entries(read)) sum[role] = (sum[role] ?? 0) + n;
                          return sum;
                      }, {});
        for (const role of WALL_ROLES) {
            if (!((roles[role] ?? 0) > 0)) {
                gaps.push(`nothing-on-the-wall-is-cut-from-below read no ${role} on a wall`);
            }
        }
        for (const cls of privateClasses) {
            const mine = byClass?.[cls] ?? {};
            for (const role of WALL_ROLES) {
                if (!((mine[role] ?? 0) > 0)) {
                    gaps.push(`nothing-on-the-wall-is-cut-from-below read no ${role} on a ${cls} wall`);
                }
            }
        }
    }
    // Every look a page or wall pass painted owes sign lines read whole
    // (`the-sellers-name-stands-whole`, 8f2): a pass that read no line of a
    // look's name certified nothing about it.
    if (PAGE_PASSES.has(pass) || WALL_PASSES.has(pass)) {
        const lines = report.nameLinesByClass ?? {};
        for (const cls of report.sheetClasses ?? []) {
            if (!((lines[cls] ?? 0) > 0)) {
                gaps.push(`the-sellers-name-stands-whole read no line of the sign on a ${cls} stall`);
            }
        }
        // Every look a page pass painted owes pairs of sign lines compared
        // (`the-signs-words-never-stand-on-each-other`, the 8g1 critic's
        // P2-4), and a pass that measured `empty-pasted` the tagline invite
        // read in the sign beside the state line it exists to stand beside.
        if (PAGE_PASSES.has(pass)) {
            const words = report.signWordsByClass ?? {};
            for (const cls of report.sheetClasses ?? []) {
                if (!((words[cls]?.pairs ?? 0) > 0)) {
                    gaps.push(`the-signs-words-never-stand-on-each-other compared no two lines of the sign on a ${cls} stall`);
                }
                if ((report.screensMeasured ?? []).includes('empty-pasted') && !((words[cls]?.invites ?? 0) > 0)) {
                    gaps.push(`the-signs-words-never-stand-on-each-other read no tagline invite in the sign on a ${cls} stall`);
                }
            }
        }
        // A sticky sign whose region never scrolled on a pass was measured at
        // rest alone (`a-sticky-sign-covers-nothing-as-the-region-scrolls`).
        for (const [cls, at] of Object.entries(report.stickyByClass ?? {})) {
            if (PAGE_PASSES.has(pass) && at.paints > 0 && !(at.scrolled > 0)) {
                gaps.push(`a-sticky-sign-covers-nothing-as-the-region-scrolls found a sticky sign on a ${cls} stall and no region it scrolled`);
            }
        }
    }
    // Every carried private look owes its stress names measured on the name
    // sheet's try-on, on a page pass (8f2).
    if (PAGE_PASSES.has(pass)) {
        for (const cls of privateClasses) {
            if (!(((report.tryOnNamesByClass ?? {})[cls] ?? 0) > 0)) {
                gaps.push(`the-sellers-name-stands-whole measured no stress name on a try-on of ${cls}`);
            }
        }
    }
    // The tracked fixture's subjects (8f2): what it carries for each rule.
    if (privateClasses.includes(TRACKED_FIXTURE_CLASS)) {
        const fx = TRACKED_FIXTURE_CLASS;
        if (pass === 'desktop' && !(((report.stickyByClass ?? {})[fx]?.scrolled ?? 0) > 0)) {
            gaps.push(`a-sticky-sign-covers-nothing-as-the-region-scrolls scrolled no region under the ${fx} sign`);
        }
        if (pass === 'desktop' && !(((report.marksShownByClass ?? {})[fx] ?? 0) > 0)) {
            gaps.push(`no-look-mark-paints-inside-a-protected-box has no subject: the ${fx} stall showed no mark`);
        }
        if (PAGE_PASSES.has(pass) && Object.keys((report.nameTiersByClass ?? {})[fx] ?? {}).length === 0) {
            gaps.push(`the-sellers-name-stands-whole read no ${fx} name on a rung of its ladder`);
        }
        if (pass === 'mobile' && !(Number(Object.keys((report.nameTiersByClass ?? {})[fx] ?? {}).sort().at(-1) ?? 0) >= 2)) {
            gaps.push(`the-sellers-name-stands-whole read no ${fx} name on the last rung of its ladder`);
        }
        if (pass === 'desktop' && !(((report.nameVerticalByClass ?? {})[fx] ?? 0) > 0)) {
            gaps.push(`the-sellers-name-stands-whole read no vertical ${fx} name`);
        }
        // Its name clips itself, so the strict read of a line's own clip
        // (the 8g1 critic's P2-3) has a subject on both page passes.
        if (PAGE_PASSES.has(pass) && !(((report.nameOwnClipByClass ?? {})[fx] ?? 0) > 0)) {
            gaps.push(`the-sellers-name-stands-whole read no ${fx} line under its own clip`);
        }
    }
    // A staged screen (`STAGED` in `layout/fixtures.ts`, the 8g1 critic's
    // P1-1) owes, on every look a pass painted it on, a node it pressed: a
    // screen named for a state that staged nothing measured the plain paint.
    const staged = report.stagedByClass ?? {};
    for (const [cls, screens] of Object.entries(staged)) {
        for (const [screen, n] of Object.entries(screens)) {
            if (!(n > 0)) gaps.push(`${screen} staged nothing on a ${cls} stall — its state was never on the tree it measured`);
        }
    }
    if ((report.screensMeasured ?? []).includes('addr-shown')) {
        for (const cls of report.sheetClasses ?? []) {
            if (!((staged[cls]?.['addr-shown'] ?? 0) > 0)) {
                gaps.push(`addr-shown put no address in its shown state on a ${cls} stall`);
            }
        }
    }
    // A pass that measured the CJK screen owes the face it was set in (8f2).
    if ((report.screensMeasured ?? []).includes('cjk-name') && !((report.cjkFaces ?? []).length > 0)) {
        gaps.push('a-cjk-name-is-set-in-a-cjk-face read no CJK sign line on a pass that measured cjk-name');
    }
    if (WALL_PASSES.has(pass) && !((report.statusLineChecks ?? 0) > 0)) {
        gaps.push('nothing-in-the-body-reaches-the-status-line asked nothing on a wall');
    }
    // The Cycle card's ladder (2026-10-13): every step at its widest figure,
    // on every look a wall pass painted.
    if (WALL_PASSES.has(pass)) {
        const read = report.cycleFigureByClass ?? {};
        for (const cls of report.sheetClasses ?? []) {
            for (const step of CYCLE_STEPS_OWED) {
                if (!(((read[cls] ?? {})[step] ?? 0) > 0)) {
                    gaps.push(`a-cycle-card-shows-every-digit-at-every-wall-size read no step-${step} Cycle figure on a ${cls} wall`);
                }
            }
        }
    }
    // A broken figure's pieces held to the figure's own ink
    // (D-2026-10-14-02): on every look a geometry pass painted, since every
    // one of them paints one.
    if (GEOMETRY_PASSES.has(pass)) {
        const ink = report.figureInkByClass ?? {};
        for (const cls of report.sheetClasses ?? []) {
            if (!((ink[cls] ?? 0) > 0)) {
                gaps.push(`a-broken-figure-wears-the-figures-own-ink read no broken figure on a ${cls} stall`);
            }
        }
    }
    // The card figures' ladder (2026-10-13): a pass that measures the long
    // figures owes each a read on every look it painted — a fixture that
    // stopped mounting one would leave the rule green over nothing.
    if (CARD_FIGURE_PASSES.has(pass)) {
        const read = report.cardFigureByClass ?? {};
        const ladders = report.cardLadderByClass ?? {};
        for (const cls of report.sheetClasses ?? []) {
            for (const place of CARD_FIGURES_OWED) {
                if (!(((read[cls] ?? {})[place] ?? 0) > 0)) {
                    gaps.push(`a-card-figure-stands-inside-its-row read no ${place} figure on a ${cls} stall`);
                }
            }
            for (const figure of CARD_LADDERS_OWED) {
                const tiers = (ladders[cls] ?? {})[figure] ?? '';
                if (tiers !== '0123') {
                    gaps.push(
                        `a-card-figure-steps-down-on-every-look compared the ${figure} ladder over ${tiers === '' ? 'no tier' : `tiers ${tiers.split('').join(', ')}`} on a ${cls} stall, not all four`,
                    );
                }
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
    if (!((report.fileClipChecks ?? 0) > 0)) {
        gaps.push('no-word-is-clipped-by-a-file asked no element with words');
    }
    if (!((report.haloChecks ?? 0) > 0)) {
        gaps.push('a-halo-never-reaches-a-neighbours-text asked no halo');
    }
    if (!((report.moneyChecks ?? 0) > 0)) {
        gaps.push('the-money-set-is-every-protected-contrast-target asked no node');
    }
    if (!((report.floorNamedChecks ?? 0) > 0)) {
        gaps.push('small-text-is-at-least-11px read no named small-text node');
    }
    // What a pass owes follows what it wore (`wornClasses`), and the shipped
    // run's own classes besides, which the runner states rather than asks
    // of the page: a look that copies Neo's rows under another class (the
    // kit's starter) owes what Neo owes.
    const wore = new Set(report.wornClasses ?? []);
    // Rural's bunting sways in its ornament strip; a pass that wore it and
    // swept no row swept none of them (`movingDecor.ts`).
    if ((shippedClasses.includes('t-rural') || wore.has('att-bunting')) && !((report.buntingChecks ?? 0) > 0)) {
        gaps.push('the-bunting-never-swings-into-the-ornament-label swept no bunting');
    }
    // The rain outlines every line on its bare ground, so a pass that wore
    // it and read no outline read none of them.
    const rain = shippedClasses.includes('t-neo') || wore.has('att-rainfall');
    if (rain && !((report.outlineChecks ?? 0) > 0)) {
        gaps.push('an-outline-where-the-text-has-its-own-ground read no outlined line');
    }
    // The at-rest rule reads the rain-wearing root's layers by what they
    // are: a pass that wore the rain and set it aside nowhere read no root
    // at all (`a-new-root-layer-is-not-exempt-by-position`).
    if (rain && !(((report.atRestSetAside ?? {})['the rain'] ?? 0) > 0)) {
        gaps.push('an-outline-that-shows-at-rest read no rain-wearing root');
    }
    const rows = new Set(report.rowSizeClasses ?? []);
    const minis = new Set(report.doorMiniClasses ?? []);
    for (const cls of [...shippedClasses, ...privateClasses]) {
        if (!rows.has(cls)) {
            gaps.push(`a-shipped-row-states-the-sizes-its-sheet-paints read no row for ${cls}`);
        }
    }
    // The door's deck is the three shipped looks by design (Q8): a private
    // look owes no mini.
    for (const cls of shippedClasses) {
        if (!minis.has(cls)) {
            gaps.push(`a-door-mini-paints-as-its-own-look compared no ${cls} mini with its shop`);
        }
    }
    if ((report.recordRoadChecks ?? 0) !== paidPrivateClasses.length) {
        gaps.push(
            `the-record-road-paints-a-locked-look-as-the-default painted ${report.recordRoadChecks ?? 0} record(s) ` +
                `where the run carries ${paidPrivateClasses.length} paid look(s)${paidPrivateClasses.length === 0 ? '' : ` (${paidPrivateClasses.join(', ')})`}`,
        );
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

/**
 * The decorations whose worst the contrast pass owes by name, by the class a
 * pass wears them by and the list in the page's owed jobs that names them
 * (`contrastOwed` in `layout/contrastPlan.ts`, `window.__contrastOwed()`).
 */
const OWED_BY_CLASS = [
    ['att-rainfall', 'rain'],
    ['att-horizon', 'horizon'],
];

/**
 * **`owed-follows-what-a-pass-wore`** (the critic on `neo-starter-probe`,
 * item 4). Outside the shipped run nothing but the page says what the
 * contrast pass owes, and the page derives it from the same rows it paints
 * from — so an answer that is malformed, or a rename that reaches the paint
 * and not the owed list, would owe nothing and pass green. Held against the
 * classes the geometry passes actually wore (`wornClasses`): the answer must
 * carry both lists, and a decoration a pass wore must be owed on some job.
 * Sentences, empty when it holds.
 */
export function owedFaults(owed, wornClasses) {
    if (owed === null || typeof owed !== 'object' || !OWED_BY_CLASS.every(([, list]) => Array.isArray(owed[list]))) {
        return ['owed-follows-what-a-pass-wore: the page answered no rain list and horizon list (__contrastOwed)'];
    }
    const worn = new Set(wornClasses);
    return OWED_BY_CLASS.filter(([cls, list]) => worn.has(cls) && owed[list].length === 0).map(
        ([cls, list]) => `owed-follows-what-a-pass-wore: a pass wore ${cls} and the page owes its ${list} on no contrast job (__contrastOwed)`,
    );
}

/** What a pass compared, in one line for the runner to print — empty for a pass that owes nothing. */
export function probeCoverageLine(pass, report) {
    // Text under 11px that no reader is given (aria-hidden) is reported,
    // never failed — on every pass that paints some, not the page ones only.
    const hiddenSmall = (report.smallText ?? []).length === 0 ? '' : ` · under 11px, aria-hidden: ${report.smallText.join('; ')}`;
    // Marks read hidden, per look (`no-shipped-look-shows-a-mark`), on every
    // pass whose page reported them.
    const marks =
        report.markChecksByClass === undefined
            ? ''
            : ` · marks read hidden: ${
                  Object.entries(report.markChecksByClass)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([cls, n]) => `${cls} ${n}`)
                      .join(', ') || 'none'
              }`;
    const perClass = (table) =>
        Object.entries(table ?? {})
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([cls, n]) => `${cls} ${typeof n === 'number' ? n : Object.entries(n).map(([k, v]) => `${k}:${v}`).join('/')}`)
            .join(', ') || 'none';
    // 8f2: the sign's lines read whole, the rungs a name climbed, the marks a
    // carried look showed and the sticky signs scrolled under, per look.
    const signs =
        (report.nameLinesByClass === undefined ? '' : ` · sign lines read whole: ${perClass(report.nameLinesByClass)}`) +
        (Object.keys(report.nameTiersByClass ?? {}).length === 0 ? '' : ` · name rungs: ${perClass(report.nameTiersByClass)}`) +
        (Object.keys(report.marksShownByClass ?? {}).length === 0 ? '' : ` · marks shown: ${perClass(report.marksShownByClass)}`) +
        (Object.keys(report.stickyByClass ?? {}).length === 0 ? '' : ` · sticky signs (paints/scrolled/stops): ${perClass(report.stickyByClass)}`) +
        (Object.keys(report.tryOnNamesByClass ?? {}).length === 0 ? '' : ` · stress names tried on: ${perClass(report.tryOnNamesByClass)}`) +
        (Object.keys(report.nameVerticalByClass ?? {}).length === 0 ? '' : ` · vertical sign lines: ${perClass(report.nameVerticalByClass)}`) +
        ((report.cjkFaces ?? []).length === 0 ? '' : ` · CJK advance: ${report.cjkFaces.join(', ')}`);
    // The card figures read, summed over the looks, per place and step (`a-card-figure-stands-inside-its-row`).
    const cardSums = {};
    for (const read of Object.values(report.cardFigureByClass ?? {})) {
        for (const [place, n] of Object.entries(read)) if (!place.startsWith('total')) cardSums[place] = (cardSums[place] ?? 0) + n;
    }
    const ladderSum = Object.values(report.cardLadderByClass ?? {}).reduce(
        (a, figures) => a + Object.values(figures).filter((tiers) => tiers === '0123').length,
        0,
    );
    const cards = CARD_FIGURE_PASSES.has(pass)
        ? ` · card figures read: ${Object.entries(cardSums).sort(([a], [b]) => a.localeCompare(b)).map(([place, n]) => `${place} ${n}`).join(', ') || 'none'}` +
          ` · ladders compared: ${ladderSum}`
        : '';
    // The money rule of D-2026-10-14-02, on every geometry pass whose page reported it.
    const money = report.figureInkByClass === undefined ? '' : ` · broken figures held to their ink: ${perClass(report.figureInkByClass)}`;
    if (pass === 'narrow') {
        return `${cards.replace(/^ · /, '')}${money}${hiddenSmall}${marks}`;
    }
    const cycleSums = {};
    for (const read of Object.values(report.cycleFigureByClass ?? {})) {
        for (const [step, n] of Object.entries(read)) cycleSums[step] = (cycleSums[step] ?? 0) + n;
    }
    // The Cycle card's figures read, summed over the looks, per step, on every
    // wall pass whose page reported them (2026-10-13).
    const cycle =
        report.cycleFigureByClass === undefined
            ? ''
            : ` · Cycle figures read by step: ${Object.entries(cycleSums).sort(([a], [b]) => Number(a) - Number(b)).map(([step, n]) => `${step}:${n}`).join(' ') || 'none'}`;
    const wall = WALL_PASSES.has(pass)
        ? `wall controls read: ${report.wallControlChecks ?? 0} · status line asked: ${report.statusLineChecks ?? 0}` + cycle + money + sliverLine(report.wallSlivers ?? []) + hiddenSmall + marks + signs
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
        return [`unbuyable labels read: ${read || 'none'}${skipped}`, wall || (money + hiddenSmall + marks).replace(/^ · /, '')]
            .filter(Boolean)
            .join(' · ');
    }
    return (
        `unbuyable labels read: ${read || 'none'}` +
        skipped +
        ` · rows read: ${(report.rowSizeClasses ?? []).join(', ') || 'none'}` +
        marks +
        ` · door minis: ${(report.doorMiniClasses ?? []).join(', ') || 'none'}` +
        ((report.recordRoadChecks ?? 0) === 0 ? '' : ` · locked records painted as the default: ${report.recordRoadChecks}`) +
        ` · small text read: ${report.floorNamedChecks ?? 0}` +
        ` (under 11px, aria-hidden: ${(report.smallText ?? []).join('; ') || 'none'})` +
        ` · outlined lines read: ${report.outlineChecks ?? 0}` +
        ` · money nodes asked: ${report.moneyChecks ?? 0}` +
        ` · halos asked: ${report.haloChecks ?? 0}` +
        ` · words asked about a mask from a file: ${report.fileClipChecks ?? 0}` +
        ` · at rest, set aside: ${Object.entries(report.atRestSetAside ?? {}).sort(([a], [b]) => a.localeCompare(b)).map(([why, n]) => `${why} ${n}`).join(', ') || 'none'}` +
        ` · bunting rows swept: ${report.buntingChecks ?? 0}` +
        (tiers === '' ? '' : ` · skeleton ladder: ${tiers}`) +
        cards +
        money +
        signs
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

/**
 * Why the worn-only road's job failed, as sentences — empty when it held
 * (`a-worn-only-sheet-loads-under-the-production-policy`, step 6). `job` is
 * what the page's `window.__wornSheetJob` answered:
 *
 * - `before` is empty: the fixture look named no sheet before its sheet was
 *   appended, so the sheet is not in the entry CSS (and `inEntryCss` agrees);
 * - the link `loaded`, landed `last` among the page's sheets (a worn sheet
 *   lands after the entry CSS, which is what its cascade assumes) and was
 *   `sameOrigin` (the policy's `style-src 'self'`);
 * - `after` is the fixture's class: the loaded sheet names the look;
 * - its own art was fetched and answered 200 (`art`, one status per fetch;
 *   under `img-src 'self'`);
 * - the app's loader (`src/ui/lookSheets.ts`, 8d1, which the page loaded
 *   it through) holds it as `ready`, answered a second ask with the same
 *   link (`askedAgain`) and put one link for it on the page (`links`);
 * - a sheet URL that does not exist `missingRejected` rather than loading,
 *   is held as `failed`, rejected again when asked again and is linked
 *   once (`missingLinks`): a failure is sticky, never a second fetch;
 * - the policy refused nothing (`refusals`).
 */
export function wornSheetJobFaults(job, { lookClass = 't-fixture-worn' } = {}) {
    const faults = [];
    if (job.before !== '') faults.push(`the look named "${job.before}" before its sheet was appended — the sheet is in the entry CSS`);
    if (job.inEntryCss) faults.push(`a sheet already on the page carries .${lookClass}`);
    if (!job.loaded) faults.push(`the sheet did not load: ${job.error || 'no reason given'}`);
    if (job.loaded && !job.last) faults.push('the sheet did not land after every other sheet on the page');
    if (job.loaded && !job.sameOrigin) faults.push('the sheet is not same-origin');
    if (job.after !== lookClass) faults.push(`after loading, the look names "${job.after}", not ${lookClass}`);
    if ((job.art ?? []).length === 0) faults.push("the look's own art was never fetched");
    for (const status of job.art ?? []) {
        if (status !== 200) faults.push(`the look's own art answered ${status}`);
    }
    if (job.loaded && job.state !== 'ready') faults.push(`the loader holds the loaded sheet as "${job.state}", not ready`);
    if (job.loaded && !job.askedAgain) faults.push('asked again, the loader did not answer the same link');
    if (job.links !== 1) faults.push(`${job.links} links on the page for one sheet — a sheet is fetched once per page`);
    if (!job.missingRejected) faults.push('a sheet URL that does not exist did not reject');
    if (job.missingState !== 'failed') faults.push(`the loader holds a sheet that does not exist as "${job.missingState}", not failed`);
    if (!job.missingAgainRejected) faults.push('asked again, a sheet that does not exist did not reject');
    if (job.missingLinks !== 1) faults.push(`${job.missingLinks} links on the page for a sheet that does not exist — a failure is not fetched again`);
    for (const r of job.refusals ?? []) {
        faults.push(`the policy refused ${r.blocked || '(inline)'} under ${r.directive}`);
    }
    return faults;
}
