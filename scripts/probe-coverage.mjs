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
 *   walls (8e2: `wallControlRolesByClass`) — on every pass that paints it
 *   (`WALL_PASS_NAMES`): the canvas (1920x1080), the portrait wall
 *   (1080x1920), the counter tablet (768x1024), the two desk walls (1280x900,
 *   1280x800; 2026-10-13) and the four off-size walls (1024x768, 1366x768,
 *   800x1280, 680x1000; 2026-10-14) — every one
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
 *   on every wall pass.
 * - **`a-cycle-card-shows-every-digit-at-every-wall-size`** (2026-10-13)
 *   reads the Cycle card's figure at every step of its ladder
 *   (`CYCLE_STEPS_OWED`) on every look each wall pass painted: the canvas
 *   (1920x1080), the two desk walls (1280x900, 1280x800), the tall wall
 *   (1080x1920), the counter tablet (768x1024) and the four off-size walls.
 * - **`the-bunting-never-swings-into-the-ornament-label`** sweeps Rural's
 *   bunting on the phone and desk passes wherever Rural is measured or any
 *   look wore the bunting.
 * - **`a-halo-never-reaches-a-neighbours-text`** runs on every geometry
 *   pass; the phone and desk passes owe halos asked (the sticky sheet
 *   head's slab among them).
 * - **`small-text-is-at-least-11px`** reads the raised small-text nodes on
 *   the phone and desk passes; what it only reports (text under 11px inside
 *   an aria-hidden subtree) is printed on the pass's `compared:` line.
 * - **The stream card's money tiers** (the fifth and sixth reviews' ranked
 *   item 1) are counted per look and per rail (`streamTierByClass`) and the
 *   canvas pass owes each look the tiers in `STREAM_TIERS_OWED`: for the
 *   listing card tier 2 on every look and tier 1 on Rural, for the quote card
 *   tiers 1, 2 and 3 on every look.
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
 *   every geometry pass owes, on every look it painted, a broken figure read
 *   on every surface it paints one (`FIGURE_SURFACES_OWED`,
 *   `figureInkByClass`, per look and per surface; round 2, the critic's
 *   P3-3: one read a look let a surface stop being read, or a plant hide
 *   every figure on one, and stay green).
 * - **`a-money-figure-never-clips-itself`** (CRITIC-WALL-CYCLE P2-1): every
 *   geometry pass owes, on every look it painted, money figures asked
 *   (`selfClipByClass`).
 * - **`nothing-covers-money-or-a-protected-box`** (1a, bound since 7a):
 *   every geometry pass owes, on every look it painted, a read of 1a on its
 *   paints that hit-tested at least one point (`coverByClass`): a look whose
 *   every point stood behind a clip, below the screen or past its side, or
 *   that was never read, certified nothing about what covers its money. The
 *   contrast pass owes a read on every job it did not refuse (the runner,
 *   `coverUnread`), and both are held to the clip ceiling (`look-tallies.mjs`).
 * - **`a-paint-with-no-hit-area-reaches-no-money`** (1b, bound since 7b):
 *   every geometry pass owes, on every look it painted, a read of 1b on its
 *   paints that held at least one target (`reachByClass`: a money node's line
 *   boxes or a protected box, read past its clips): a look never read, or
 *   read with every target cut away, certified nothing about what reaches its
 *   money. A paint on which 1b threw is a failure of its own (`reachAtRest`).
 * - **`the-ground-walk-reaches-the-stall`** (3a, bound since D-2026-10-28-01):
 *   every geometry pass owes, on every look it painted, money figures' elements
 *   read to the stall (`walkByClass`: an element read, its fails the dress
 *   rule's): a look read on no figure certified nothing about what lies under
 *   its money. A throw is a failure of its own.
 * - **`the-kit-takes-no-anchor-positioning`** (D-2026-10-27-02): on the
 *   kit's probe (`kit`), every geometry pass owes a read of the kit's look
 *   (`kitAnchorPaints`); the ordinary probe owes nothing here.
 * - **`a-money-figure-is-never-misdressed`** (D-2026-10-19-01): every
 *   geometry pass owes, on every look it painted, money figures held to
 *   their dress on every surface it paints one (`DRESS_SURFACES_OWED`,
 *   `dressByClass`, per look and per surface since round 4), and, where it
 *   painted Rural, a money
 *   figure read under a box's `clip-path` on Rural (`dressClipByClass`) —
 *   Rural's notched tag is the subject, so a pass that read none stopped
 *   measuring the half of the rule that reads a clip's shape against the
 *   ink.
 * - **`a-code-is-drawn-black-on-white`** (before 8g2, the fourth review's
 *   item 4, the critic's PFQ): every geometry pass owes, on every look it
 *   painted a code on, the colours of every code it painted read
 *   (`qrColourByClass`: painted and read, per look), and a pass whose page
 *   listed codes painted (`codesPainted`) and reported no such read owes one;
 *   and, per screen (the fifth review's item 10: the per-look owe counted
 *   painted and read under one filter, so a look that took a code's box
 *   away owed nothing), every look whose paints of a screen built as many
 *   codes painted as many of them with a box as the most any such look did
 *   (`qrByScreen`: screen, look, codes built, the fewest and most over its
 *   variants; a paid look's try-on builds no code on the name sheet), and a
 *   report with no such count owes one.
 * - **`a-card-figure-stands-inside-its-row`** (2026-10-13; round 2): the
 *   narrow pass (360x800) and the phone pass owe, on every look they
 *   painted, a read of every step of the face's figure, "You pay", a pay
 *   sheet's figure and a Pay several line (`CARD_FIGURES_OWED`,
 *   `cardFigureByClass`, per look and per place:tier), and
 *   **`a-card-figure-steps-down-on-every-look`** the four figures' painted
 *   ladders compared (`CARD_LADDERS_OWED`, `cardLadderByClass`); and, since
 *   step 8g3-pre, every length step of the face, "You pay", a pay sheet's
 *   figure and the strip total read (`FIGURE_STEPS_OWED`,
 *   `cardFigureStepByClass`) and those figures' step ladders compared over
 *   all six (`CARD_STEP_LADDERS_OWED`, `cardStepLadderByClass`).
 *
 * The phone and desk passes owe the page rules, the canvas the overlay's
 * places and the wall's controls and Cycle steps, the portrait, tablet, two
 * desk wall and four off-size wall passes the wall's controls and Cycle
 * steps, and the narrow pass the card figures (the phone pass owes them
 * too); the reduced-motion and contrast passes owe nothing here (`mobile`,
 * `desktop`, `canvas`, `narrow` and `WALL_PASS_NAMES` are the runner's pass
 * names).
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
export const PAGE_PASSES = new Set(['mobile', 'desktop']);
/**
 * The passes that paint the touch wall, whose controls the wall rule reads:
 * the canvas, the tall wall, the counter tablet, since the Cycle card's
 * ladder the two desk wall passes (1280x900, 1280x800), and since the fit
 * the four off-size walls (`OFF_SIZE_WALLS` in probe-passes.mjs: 1024x768,
 * 1366x768, 800x1280, 680x1000). Held to the plan's wall passes by
 * `the-wall-passes-owe-the-cycle-cards-every-step`.
 */
export const WALL_PASS_NAMES = Object.freeze([
    'canvas',
    'portrait',
    'tablet',
    'desk-wall',
    'short-wall',
    'side-tablet',
    'hd-wall',
    'tall-tablet',
    'narrow-wall',
]);
export const WALL_PASSES = new Set(WALL_PASS_NAMES);
/** The wall passes but the canvas, which paints the stream beside the wall and owes its places too. */
const WALLS_BUT_CANVAS = WALL_PASS_NAMES.filter((pass) => pass !== 'canvas');
/**
 * Every geometry pass: the two page passes, every wall pass
 * (`WALL_PASS_NAMES`: the canvas and the eight others) and the narrow
 * phone. Each paints a broken money figure on every look
 * (`a-broken-figure-wears-the-figures-own-ink`) and money figures
 * (`a-money-figure-never-clips-itself`). Derived from `WALL_PASS_NAMES`, as
 * the two surface tables below are, so a wall pass named there is owed the
 * money rules here (the wall-offsize critic's item 2: written out, the four
 * off-size walls auto-merged out of all three); pinned by value in
 * `the-money-rules-are-owed-on-every-look-of-every-geometry-pass`.
 */
export const GEOMETRY_PASSES = new Set(['mobile', 'desktop', ...WALL_PASS_NAMES, 'narrow']);
/**
 * The runner's other passes, each with why it owes nothing these tables
 * name (round 5, the critic's P3 on round 4: a pass the tables do not name
 * owed nothing — `FIGURE_SURFACES_OWED[pass] ?? []` — so a pass added to
 * the runner and not here would read nothing and stay green). A pass in
 * neither is a gap (`probeCoverageGaps`), and every pass the runner runs
 * (`runnerPasses` in `probe-passes.mjs`, which the runner holds to the
 * passes it builds before it builds, `passesNotRun`) is held to the two
 * lists, both ways, by
 * `every-pass-the-runner-runs-is-in-a-coverage-table`.
 */
export const PASSES_OWING_NO_GEOMETRY = Object.freeze({
    'short-phone': 'a short screen (375x667) measured for the sticky signs the phone pass found, and nothing else; the runner holds it to its own owed reads',
    'short-desk': 'a short screen (1280x720) measured for the sticky signs the desk pass found, and nothing else; the runner holds it to its own owed reads',
    'reduced-motion': 'the reduced-motion pass measures the animating screens again under the reduce block; the geometry passes owe the money rules',
    'worn-only-sheet': "one job, the worn-only road under the production policy, held to its own faults (`wornSheetJobFaults`); it paints no screen's money",
    contrast: 'the contrast pass reads pixels on its own plan and owes its own jobs',
    transparency: 'the transparent wire reads the clear overlay screens over black and white on its own jobs; the canvas pass owes their geometry',
});
/**
 * The surfaces each geometry pass paints a broken figure on, every look
 * (`figureSurface` in `layout/probe.ts`; measured 2026-10-14): the page and
 * narrow passes the item face (`face`), its "You pay" (`paid`), the pay
 * sheet (`pay`), Pay several's line and total (`line`, `total`), the
 * selection strip's total and chosen line (`strip`, `chosen`) and a shop row
 * (`row`); the desk also the wall's Browse row (`wall`) and Cycle card
 * (`cycle`), which every wall pass (`WALL_PASS_NAMES`) paints alone.
 */
const PAGE_SURFACES = Object.freeze(['face', 'paid', 'pay', 'line', 'total', 'strip', 'chosen', 'row']);
const WALL_SURFACES = Object.freeze(['wall', 'cycle']);
export const FIGURE_SURFACES_OWED = Object.freeze({
    mobile: PAGE_SURFACES,
    narrow: PAGE_SURFACES,
    desktop: Object.freeze([...PAGE_SURFACES, ...WALL_SURFACES]),
    ...Object.fromEntries(WALL_PASS_NAMES.map((pass) => [pass, WALL_SURFACES])),
});
/**
 * The surfaces each geometry pass paints a money figure on, every look
 * (`dressSurface` in `layout/probe.ts`; measured 2026-10-19): the page
 * passes the sign, a shop row, an item face, a sheet, the selection strip, a
 * printed tag, an Activity receipt, the Studio and a card (the first
 * stall's); the desk also the wall's rows and Cycle card; the narrow phone
 * its money screens' seven; the canvas the wall, its payment plate, its
 * Cycle card and the stream's card and ticker; every other wall pass
 * (`WALL_PASS_NAMES`) the wall, the plate and the Cycle card. The door's
 * open control is Modern's alone (the door wears the default look) and is
 * owed nowhere.
 */
const DRESS_PAGE_SURFACES = Object.freeze(['activity', 'card', 'face', 'row', 'sheet', 'sign', 'strip', 'studio', 'tag']);
const DRESS_WALL_SURFACES = Object.freeze(['cycle', 'plate', 'wall']);
export const DRESS_SURFACES_OWED = Object.freeze({
    mobile: DRESS_PAGE_SURFACES,
    desktop: Object.freeze([...DRESS_PAGE_SURFACES, 'cycle', 'wall']),
    narrow: Object.freeze(['activity', 'face', 'row', 'sheet', 'sign', 'strip', 'tag']),
    canvas: Object.freeze([...DRESS_WALL_SURFACES, 'stream', 'ticker']),
    ...Object.fromEntries(WALLS_BUT_CANVAS.map((pass) => [pass, DRESS_WALL_SURFACES])),
});
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
/**
 * The figure steps the same passes owe on every look (step 8g3-pre,
 * D-2026-11-10-16): `data-figure-step` '1'–'6' (`FIGURE_STEP_CEILINGS` in
 * src/ui/render.ts) on every place that carries it — the face, "You pay", a
 * pay sheet's figure and the strip total — each painted at its widest
 * (`item-listing-figure-11`, `item-quote-figure-11`, `pay-several-figure-steps`,
 * `pay-several-strip-11` and `-17` beside the ladder's own fixtures). A look
 * may size a figure by its step, so a step no fixture paints is a rule no
 * pass measures, and a gap.
 */
export const FIGURE_STEPS_OWED = Object.freeze(
    ['face', 'paid', 'pay', 'strip'].flatMap((place) => ['1', '2', '3', '4', '5', '6'].map((step) => `${place}:${step}`)),
);
/**
 * The figure steps the pay sheets' honest-display sentences are owed at
 * (step 8g3-honest, D-2026-11-10-17/18): `pay` and `pay-several` at
 * `data-figure-step` '1'–'6'. On the contrast pass, some job must have READ
 * `pay-final` ("a payment is final") with the sheet's figure at the step
 * (`honestFigureStep` in the probe's prepare). **Per look**: every look owes
 * the steps in `HONEST_STEPS_EVERY_LOOK` (1 and 6: the screens read for every
 * look), and a look whose sheet names `data-figure-step` owes all six, because
 * only such a look can dress a step and the screens for steps 2 to 5 are
 * sampled for those looks alone (`STEP_JOBS`, `layout/contrastPlan.ts`).
 */
export const HONEST_STEPS_OWED = Object.freeze(
    ['pay', 'pay-several'].flatMap((sheet) => ['1', '2', '3', '4', '5', '6'].map((step) => `${sheet}:${step}`)),
);
/** The steps every look owes, whatever its sheet names. */
export const HONEST_STEPS_EVERY_LOOK = Object.freeze(['1', '6']);
/**
 * The gaps in what a contrast pass read of `pay-final` per figure step:
 * `read` is `{ [sheetClass]: { 'pay:3': jobs } }`, `classes` the looks
 * measured and `stepClasses` those among them whose sheet names
 * `data-figure-step`.
 */
export function honestStepGaps(read, classes, stepClasses = []) {
    const gaps = [];
    for (const cls of classes) {
        const owed = stepClasses.includes(cls)
            ? HONEST_STEPS_OWED
            : HONEST_STEPS_OWED.filter((place) => HONEST_STEPS_EVERY_LOOK.includes(place.split(':')[1]));
        for (const place of owed) {
            if (!(((read?.[cls] ?? {})[place] ?? 0) > 0)) {
                gaps.push(
                    `the honest-display line pay-final was read at no ${place.replace(':', ' figure at step ')} job on a ${cls} stall` +
                        `${stepClasses.includes(cls) ? ', whose sheet names data-figure-step' : ''} (the-honest-display-sentences-are-read, HONEST_STEPS_OWED)`,
                );
            }
        }
    }
    return gaps;
}
/** The step ladders owed compared over all six steps: the four card ladders and the strip total, by name. */
export const CARD_STEP_LADDERS_OWED = Object.freeze([...CARD_LADDERS_OWED, 'strip:selection-total']);
/**
 * The money tiers the stream card's price row (`data-tier` on `.bc-p`) is
 * owed on each look the canvas pass paints, **per rail** (the lint-belts
 * critic's fifth and sixth reviews, ranked item 1). `listings` is the
 * covenant's asked amount (`[data-role='price']`): tier 2 on every look and
 * tier 1 on Rural, which `broadcast-from-123456` (`from 123,456`) and
 * `broadcast-from-1234567` (`from 1,234,567`) paint with the older cards'
 * tiers 1 and 3. `quotes` is the seller's own figure
 * (`[data-role='seller-price']`): tiers 1, 2 and 3 on every look, which
 * `broadcast-quote-7`, `-9`, `-11` and `-13` (an XEC quote of 7, 9, 11 and 13
 * characters) paint. Keyed by the ladder the look's row states
 * (`overlayTierCeilings`: Modern, Neo and the skeleton 5, 7, 9; Rural 8, 10,
 * 12) and pinned by value. A look not named here (the kit's, a carried
 * private look's, whose ceilings are its own) owes nothing.
 */
export const STREAM_TIERS_OWED = Object.freeze({
    't-modern': Object.freeze({ listings: Object.freeze(['2']), quotes: Object.freeze(['1', '2', '3']) }),
    't-neo': Object.freeze({ listings: Object.freeze(['2']), quotes: Object.freeze(['1', '2', '3']) }),
    't-rural': Object.freeze({ listings: Object.freeze(['1', '2']), quotes: Object.freeze(['1', '2', '3']) }),
    't-skeleton': Object.freeze({ listings: Object.freeze(['2']), quotes: Object.freeze(['1', '2', '3']) }),
});
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
 * measured (the ordinary run, not the kit's); `witnessClasses` are the look
 * run's public looks, painted on its listed screens alone and owing no
 * per-look read there (`--looks carried`, D-2026-11-11-04).
 */
export function probeCoverageGaps(
    pass,
    report,
    { shippedClasses = [], privateClasses = [], paidPrivateClasses = [], skeleton = false, sheetedClasses = [], witnessClasses = [], kit = false } = {},
) {
    const gaps = [];
    /*
     * The looks a pass owes per-look reads of: every look it painted, less
     * the look run's witnesses (`witnessClasses`, `--looks carried`): the
     * public looks it paints on the listed screens alone, which owe what
     * they owe in the ordinary run — painted on one screen, they would owe
     * a wall's Cycle steps or a pass's broken figures they were never asked.
     */
    const owing = (report.sheetClasses ?? []).filter((cls) => !witnessClasses.includes(cls));
    // The kit's probe (`--looks workshop`): every geometry pass owes the kit's anchor refusal a read of the kit's look.
    if (kit && GEOMETRY_PASSES.has(pass) && !((report.kitAnchorPaints?.read ?? 0) > 0)) {
        gaps.push("the-kit-takes-no-anchor-positioning read no paint of the kit's look");
    }
    if (!GEOMETRY_PASSES.has(pass) && !Object.hasOwn(PASSES_OWING_NO_GEOMETRY, pass)) {
        gaps.push(`the ${pass} pass is in no coverage table: name it in GEOMETRY_PASSES (and the surfaces it owes) or in PASSES_OWING_NO_GEOMETRY with why`);
    }
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
    for (const cls of owing.filter((c) => !privateClasses.includes(c))) {
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
        // The public looks' sum is the ordinary run's: the look run paints no public look on a wall.
        for (const role of witnessClasses.length > 0 ? [] : WALL_ROLES) {
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
        for (const cls of owing) {
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
            for (const cls of owing) {
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
    // The two address states (`addr-shown`, the 8g1 critic's P1-1;
    // `addr-copied`, the fourth review's B3, so that a rule under
    // `[data-copied='true']` is measured at rest) owe an address in their
    // state on every look a pass painted.
    for (const [screen, state] of Object.entries({ 'addr-shown': 'shown', 'addr-copied': 'copied' })) {
        if (!(report.screensMeasured ?? []).includes(screen)) continue;
        for (const cls of owing) {
            if (!((staged[cls]?.[screen] ?? 0) > 0)) {
                gaps.push(`${screen} put no address in its ${state} state on a ${cls} stall`);
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
    // The wall's code held to its floor (STEP-WALL-CONTAINER): on every look a wall pass painted, some code read.
    if (WALL_PASSES.has(pass)) {
        const floor = report.wallCodeFloorByClass ?? {};
        for (const cls of owing) {
            if (!((floor[cls] ?? 0) > 0)) gaps.push(`the-wall-code-never-paints-below-its-floor read no code on a ${cls} wall`);
        }
    }
    // The Cycle card's ladder (2026-10-13): every step at its widest figure,
    // on every look a wall pass painted.
    if (WALL_PASSES.has(pass)) {
        const read = report.cycleFigureByClass ?? {};
        for (const cls of owing) {
            for (const step of CYCLE_STEPS_OWED) {
                if (!(((read[cls] ?? {})[step] ?? 0) > 0)) {
                    gaps.push(`a-cycle-card-shows-every-digit-at-every-wall-size read no step-${step} Cycle figure on a ${cls} wall`);
                }
            }
        }
    }
    // A broken figure's pieces held to the figure's own ink, on every surface
    // the pass paints one, and money figures asked whether they clip
    // themselves (D-2026-10-14-02): on every look a geometry pass painted.
    if (GEOMETRY_PASSES.has(pass)) {
        const ink = report.figureInkByClass ?? {};
        const clip = report.selfClipByClass ?? {};
        for (const cls of owing) {
            for (const surface of FIGURE_SURFACES_OWED[pass] ?? []) {
                if (!(((ink[cls] ?? {})[surface] ?? 0) > 0)) {
                    gaps.push(`a-broken-figure-wears-the-figures-own-ink read no broken figure on a ${cls} stall's ${surface}`);
                }
            }
            if (!((clip[cls] ?? 0) > 0)) {
                gaps.push(`a-money-figure-never-clips-itself asked no money figure on a ${cls} stall`);
            }
        }
        // A money figure held to its dress on every surface the pass paints,
        // on every look, and — where the pass painted Rural — one read under
        // its tag's clip-path (D-2026-10-19-01; per surface since round 4).
        const dress = report.dressByClass ?? {};
        for (const cls of owing) {
            for (const surface of DRESS_SURFACES_OWED[pass] ?? []) {
                if (!(((dress[cls] ?? {})[surface] ?? 0) > 0)) {
                    gaps.push(`a-money-figure-is-never-misdressed read no money figure on a ${cls} stall's ${surface}`);
                }
            }
        }
        // 1a (7a): every look a pass painted read, and a point hit-tested on
        // it — a read that hit-tested nothing on a look covered nothing.
        const cover = report.coverByClass ?? {};
        for (const cls of owing) {
            const read = Object.hasOwn(cover, cls) ? cover[cls] : undefined;
            if (!((read?.paints ?? 0) > 0)) {
                gaps.push(`nothing-covers-money-or-a-protected-box read no paint of a ${cls} stall`);
            } else if (!((read?.checked ?? 0) > 0)) {
                gaps.push(`nothing-covers-money-or-a-protected-box hit-tested no point on a ${cls} stall`);
            }
        }
        // 1b (7b): every look a pass painted read, and a target held on it —
        // a read that held no target on a look reached nothing it could fail.
        const reach = report.reachByClass ?? {};
        for (const cls of owing) {
            const read = Object.hasOwn(reach, cls) ? reach[cls] : undefined;
            if (!((read?.paints ?? 0) > 0)) {
                gaps.push(`a-paint-with-no-hit-area-reaches-no-money read no paint of a ${cls} stall`);
            } else if (!((read?.targets ?? 0) > 0)) {
                gaps.push(`a-paint-with-no-hit-area-reaches-no-money held no target on a ${cls} stall`);
            }
        }
        // 3a (D-2026-10-28-01): every look a pass painted, read to its stall on some figure's element.
        const walk = report.walkByClass ?? {};
        for (const cls of owing) {
            const read = Object.hasOwn(walk, cls) ? walk[cls] : undefined;
            if (!((read?.elements ?? 0) > 0)) gaps.push(`the-ground-walk-reaches-the-stall read no figure of a ${cls} stall`);
        }
        // A code drawn black on white (before 8g2's fourth review, item 4,
        // the critic's PFQ): every code a pass painted on a look has its
        // colours read — a pass that painted codes and read fewer read
        // nothing about the ones it skipped.
        const codes = report.qrColourByClass;
        if (codes === undefined) {
            if ((report.codesPainted ?? []).length > 0) gaps.push('a-code-is-drawn-black-on-white reported no read of a code on a pass that painted codes');
        } else {
            for (const cls of owing) {
                const q = Object.hasOwn(codes, cls) ? codes[cls] : undefined;
                const painted = q?.painted ?? 0;
                const read = q?.read ?? 0;
                if (painted > 0 && read !== painted) {
                    gaps.push(`a-code-is-drawn-black-on-white read the colours of ${read} of the ${painted} codes a ${cls} stall painted`);
                }
            }
            // And per screen (the fifth review's item 10): a look's owe
            // compares its painted codes with its read ones under one filter,
            // so a look that took a code's box away owed nothing for it.
            // Among the looks whose paints of a screen built as many codes in
            // the tree (the name sheet draws none for a paid look), every
            // paint shows as many with a box as the most any of them showed
            // (`qrByScreen`: screen, look, codes built, the fewest and most).
            const byScreen = report.qrByScreen;
            if (byScreen === undefined) {
                gaps.push('a-code-is-drawn-black-on-white reported no per-screen count of the codes each look painted');
            } else {
                for (const screen of Object.keys(byScreen).sort()) {
                    const looks = byScreen[screen];
                    const classes = Object.keys(looks).sort();
                    const builds = [...new Set(classes.flatMap((cls) => Object.keys(looks[cls])))].sort((a, b) => Number(a) - Number(b));
                    for (const built of builds) {
                        const these = classes.filter((cls) => Object.hasOwn(looks[cls], built));
                        const most = Math.max(0, ...these.map((cls) => looks[cls][built].max));
                        const top = these.find((cls) => looks[cls][built].max === most);
                        for (const cls of these) {
                            if (looks[cls][built].min < most) {
                                gaps.push(
                                    `a-code-is-drawn-black-on-white counted ${looks[cls][built].min} code(s) with a box a ${cls} stall painted on ${screen}, of the ${built} it built, where a ${top} stall painted ${most}`,
                                );
                            }
                        }
                    }
                }
            }
        }
        // Rural's tag is a notched polygon on the figure's column: a pass that
        // painted Rural and read no figure under it read no clip's shape.
        if (owing.includes('t-rural') && !(((report.dressClipByClass ?? {})['t-rural'] ?? 0) > 0)) {
            gaps.push('a-money-figure-is-never-misdressed read no money figure under a clip-path on a t-rural stall');
        }
    }
    // The card figures' ladder (2026-10-13): a pass that measures the long
    // figures owes each a read on every look it painted — a fixture that
    // stopped mounting one would leave the rule green over nothing.
    if (CARD_FIGURE_PASSES.has(pass)) {
        const read = report.cardFigureByClass ?? {};
        const ladders = report.cardLadderByClass ?? {};
        for (const cls of owing) {
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
            for (const place of FIGURE_STEPS_OWED) {
                if (!((((report.cardFigureStepByClass ?? {})[cls] ?? {})[place] ?? 0) > 0)) {
                    gaps.push(`a-card-figure-stands-inside-its-row read no ${place.replace(':', ' figure at step ')} on a ${cls} stall`);
                }
            }
            for (const figure of CARD_STEP_LADDERS_OWED) {
                const steps = ((report.cardStepLadderByClass ?? {})[cls] ?? {})[figure] ?? '';
                if (steps !== '123456') {
                    gaps.push(
                        `a-card-figure-steps-down-on-every-look compared the ${figure} step ladder over ${steps === '' ? 'no step' : `steps ${steps.split('').join(', ')}`} on a ${cls} stall, not all six`,
                    );
                }
            }
        }
    }
    // The stream card's money tiers (the fifth and sixth reviews): the canvas pass owes each look the tiers its ladder is painted at, per rail.
    if (pass === 'canvas') {
        const read = report.streamTierByClass ?? {};
        for (const cls of owing) {
            for (const [rail, tiers] of Object.entries(STREAM_TIERS_OWED[cls] ?? {})) {
                for (const tier of tiers) {
                    if (!((((read[cls] ?? {})[rail] ?? {})[tier] ?? 0) > 0)) {
                        const role = rail === 'quotes' ? 'seller-price' : 'price';
                        gaps.push(`the stream card's ${rail} money tier ${tier} was painted by no fixture on a ${cls} stall: a look's rule under [data-tier='${tier}'] for [data-role='${role}'] would be measured by no pass`);
                    }
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
    const stepSums = {};
    for (const read of Object.values(report.cardFigureStepByClass ?? {})) {
        for (const [place, n] of Object.entries(read)) stepSums[place] = (stepSums[place] ?? 0) + n;
    }
    const stepLadderSum = Object.values(report.cardStepLadderByClass ?? {}).reduce(
        (a, figures) => a + Object.values(figures).filter((steps) => steps === '123456').length,
        0,
    );
    const cards = CARD_FIGURE_PASSES.has(pass)
        ? ` · card figures read: ${Object.entries(cardSums).sort(([a], [b]) => a.localeCompare(b)).map(([place, n]) => `${place} ${n}`).join(', ') || 'none'}` +
          ` · ladders compared: ${ladderSum}` +
          (report.cardFigureStepByClass === undefined
              ? ''
              : ` · figure steps read: ${Object.entries(stepSums).sort(([a], [b]) => a.localeCompare(b)).map(([place, n]) => `${place} ${n}`).join(', ') || 'none'}` +
                ` · step ladders compared: ${stepLadderSum}`)
        : '';
    // The money rules of D-2026-10-14-02, on every geometry pass whose page reported them.
    const money =
        (report.figureInkByClass === undefined && report.selfClipByClass === undefined
            ? ''
            : ` · broken figures held to their ink: ${perClass(report.figureInkByClass)}` +
              ` · money figures asked about a self-clip: ${perClass(report.selfClipByClass)}`) +
        (report.dressByClass === undefined
            ? ''
            : ` · money figures held to their dress: ${perClass(report.dressByClass)}` +
              ` · under a clip: ${perClass(report.dressClipByClass)}`) +
        (report.qrColourByClass === undefined
            ? ''
            : ` · codes held to black on white: ${perClass(Object.fromEntries(Object.entries(report.qrColourByClass).map(([cls, q]) => [cls, q.read])))}`) +
        (report.wallCodeFloorByClass === undefined || Object.keys(report.wallCodeFloorByClass).length === 0
            ? ''
            : ` · wall codes held to their floor: ${perClass(report.wallCodeFloorByClass)}`);
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
    // The stream card's money tiers the canvas pass read, per look and tier (`STREAM_TIERS_OWED`).
    const streamTiers =
        Object.keys(report.streamTierByClass ?? {}).length === 0
            ? ''
            : ` · stream card tiers read: ${Object.entries(report.streamTierByClass)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([cls, rails]) => `${cls} ${Object.entries(rails).sort(([a], [b]) => a.localeCompare(b)).map(([rail, tiers]) => `${rail} ${Object.entries(tiers).map(([tier, n]) => `${tier}:${n}`).join('/')}`).join(' ')}`)
                  .join(', ')}`;
    if (!PAGE_PASSES.has(pass)) {
        return [`unbuyable labels read: ${read || 'none'}${skipped}${streamTiers}`, wall || (money + hiddenSmall + marks).replace(/^ · /, '')]
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
