/**
 * Every pass `layout-check.mjs` runs, as values: its name, its viewport, its
 * kind, the screens it measures and the plan the geometry walk hands out
 * (`walkPlan`, `plan-walk.mjs`) — and the contrast and transparency passes
 * after it. Side-effect free and importing nothing, so the runner and the
 * tests read one list: the runner builds every pass from it, and
 * `every-pass-the-runner-runs-is-in-a-coverage-table`
 * (`probe-coverage.test.mjs`) holds it to `GEOMETRY_PASSES` and
 * `PASSES_OWING_NO_GEOMETRY` (`probe-coverage.mjs`) by value, both ways.
 *
 * **Adding a pass is one entry here and its rows in those tables.** A pass of
 * a kind the runner already runs (`PASS_KINDS`) needs nothing else: the
 * runner turns every entry of `geometryPlan` into a pass by its kind and
 * refuses a kind it has no runner for before it builds anything. Until
 * 2026-10-20 the passes were object literals in the runner, and the test read
 * them back out of its text with a pattern a viewport written another way —
 * width first, height before width, a spread, a template literal, double
 * quotes — slipped past (the money-guards critic, round 5).
 */

/**
 * The kinds of pass the runner knows how to run, and whether a pass of the
 * kind is a geometry pass in the coverage tables' sense — one whose page
 * report is held to what it owes (`probeCoverageGaps`), which every page,
 * wall and narrow pass's is. The runner has one runner per kind and refuses
 * a plan entry whose kind it does not run.
 *
 * - `page`: the probe page over every screen the page split gives the
 *   viewport (`screensForViewport` in `layout/probe.ts`).
 * - `wall`: the shop-window screens (`screens`) at a wall size, the page
 *   echoing the window block it entered (`block`: `portraitTall`,
 *   `portraitShort` or `landscapeShort`), or the pass fails as one that would
 *   certify a layout it did not paint.
 * - `narrow`: the money screens at the narrow phone (`screens`).
 * - `short`: a short screen, for the looks the page pass it names (`from`,
 *   `after`) found a sticky sign on.
 * - `reduced`: the animating screens (`screens`) under
 *   `prefers-reduced-motion: reduce`.
 * - `worn-only`: the worn-only road under the production policy, once.
 * - `contrast`, `transparency`: the pixel passes after the geometry walk.
 */
export const PASS_KINDS = Object.freeze({
    page: Object.freeze({ geometry: true }),
    wall: Object.freeze({ geometry: true }),
    narrow: Object.freeze({ geometry: true }),
    short: Object.freeze({ geometry: false }),
    reduced: Object.freeze({ geometry: false }),
    'worn-only': Object.freeze({ geometry: false }),
    contrast: Object.freeze({ geometry: false }),
    transparency: Object.freeze({ geometry: false }),
});

/** What each window block a `wall` pass may name is called in its failure. */
export const WALL_BLOCKS = Object.freeze({
    portraitTall: 'tall-portrait',
    portraitShort: 'short-portrait',
    landscapeShort: 'short-landscape',
});

export const VIEWPORTS = [
    { name: 'mobile', width: 390, height: 844 },
    { name: 'desktop', width: 1280, height: 900 },
];
/**
 * The OBS Browser Source, and the only viewport the broadcast screens are
 * measured at. The overlay is sized for it — plate 252px, QR 204px, price
 * 39px — so certifying that chrome at 390px measures pixels nobody paints,
 * and the page widths skip it for the same reason in reverse. The page owns
 * the split (`screensForViewport` in `layout/probe.ts`); the runner passes the
 * flag and then checks the answer, because a filter nobody audits is how a pass
 * measures nothing and prints a tick.
 */
export const CANVAS = { name: 'canvas', width: 1920, height: 1080 };
/**
 * A television hung the tall way, which is what a shop window often is.
 *
 * `window.css` carries three layouts for the cycle card and only two were
 * ever measured: landscape, and `(orientation: portrait) and (max-height:
 * 1200px)` — the counter tablet, which the `TABLET` pass
 * matches. The third, `portrait` with that max-height NOT matching, is the
 * stacked column a wall-mounted portrait screen paints, and **no viewport
 * reached it**: a whole half of the layout this feature was asked for
 * (owner, 2026-09-18: "Cũng thiết kế để hỗ trợ màn hình dọc") sat behind a
 * media query the probe could not enter, so every run printed a tick over
 * CSS nothing had executed.
 *
 * It runs the shop-window screens alone, through `?screens=`, the way the
 * reduced-motion pass runs the animating ones: the rest of the app has no
 * portrait-only rule and re-measuring it would double the run for nothing.
 * The verdict echoes the media condition back (`portraitTall`) so a pass
 * that silently stayed landscape fails instead of passing.
 */
export const PORTRAIT = { name: 'portrait', width: 1080, height: 1920 };
/*
 * The counter tablet stood on end — the SHORT portrait block.
 *
 * `(orientation: portrait) and (max-height: 1200px)` was entered by one
 * viewport in the whole matrix, 390x844, and only because the wall fixtures
 * ran there. Taking them out of the narrow pass was right — the app cannot
 * paint a wall at 390 — and it left that block measured by nothing while
 * two documents went on describing it as covered (QA, 2026-09-20, measured
 * against the real `window.css` in Chrome). 768 is over the wall's floor
 * and CLAUDE §4 names the counter tablet, so the screen is real; this pass
 * is what the mobile one was standing in for.
 */
export const TABLET = { name: 'tablet', width: 768, height: 1024 };
/*
 * The narrow phone (2026-10-13; the 8g1 critic's P2-3 and P2-4, the owner's
 * D-2026-10-13-02): 360x800, the narrowest phone the matrix measures, for
 * the screens that carry money and nothing else — geometry only, no
 * contrast. Every page pass ran at 390 and wider, so a figure, a pay code or
 * a row that holds at 390 and not at 360 went unseen: the item face's figure
 * spilled at 16 characters on Neo, and every pay code painted narrower than
 * the gate was told.
 *
 * The list (`NARROW_SCREENS`), and why each is on it:
 * - the rows: `unbuyable` (listing rows and the row's "Not buyable" label)
 *   and the selection strip with its quote rows and steppers
 *   (`pay-several-strip`, `pay-several-strip-xec`, `pay-several-ask`);
 * - the item faces: `item-listing`, `item-quote`, `item-unbuyable-fold`
 *   (a figure beside a fold that lists a refused take) and the two long
 *   figures (`item-listing-long-figure`, `item-quote-long-figure`);
 * - the pay sheet: `pay`, `pay-xec`, `pay-moved` (the restated figure on
 *   the control), `pay-dust`, `pay-long-figure`, `pay-longest-figure` (the
 *   eight-byte quote, its figure broken; round 4);
 * - Pay several: `pay-several`, `pay-several-long-figure`,
 *   `pay-several-longest-figure` (both items this stall's, every figure
 *   broken; round 4);
 * - the rest of the money set on a phone: `activity` (the receipt's
 *   amount), `describe` (the seller's figure read back and the record's
 *   hex), `publish-name` (the stall record's hex), `pay-tag` (the figure
 *   on paper);
 * - the card ladder's every step at its widest (`item-listing-figure-14`,
 *   `-17`, `-21`; `item-quote-figure-14`, `-17`, `-21`; `pay-figure-14`,
 *   `-17`; `pay-several-figure-lines`) and the rows at the longest figures
 *   (`row-longest-figure`, `quote-row-longest-figure`), round 2;
 * - the shop's rows on every look (round 3): `offers`,
 *   `plugin-missing-quotes`, `quotes-signs` and `pay-inr`, off this pass in
 *   round 2 while Rural's name column fell under its 64px floor at 360 (224
 *   failures) and 375 (14), back since Rural's tier-1 and tier-2 tags take
 *   a row of their own below 390 (`narrowTag`, D-2026-10-13-04); the rows
 *   either side of the re-flow's cut (`quote-row-1m`, `row-15-16`,
 *   `row-17`, `quote-row-18`, `row-21`); and the selection strip at the
 *   longest total (`pay-several-strip-long-figure`) and at 18 and 21
 *   characters (`pay-several-strip-18`, `-21`, round 4).
 * The QR gate's rule reads every pay sheet's code here
 * (`PAY_QR_NARROWEST_PX`). `layout/PROBE-RULES.md`, "The narrow phone".
 */
export const NARROW = { name: 'narrow', width: 360, height: 800 };
export const NARROW_SCREENS = [
    'unbuyable',
    'pay-several-strip',
    'pay-several-strip-xec',
    'pay-several-ask',
    'item-listing',
    'item-quote',
    'item-unbuyable-fold',
    'item-listing-long-figure',
    'item-quote-long-figure',
    'pay',
    'pay-xec',
    'pay-moved',
    'pay-dust',
    'pay-long-figure',
    'pay-longest-figure',
    'pay-several',
    'pay-several-long-figure',
    'pay-several-longest-figure',
    'activity',
    'describe',
    'publish-name',
    'pay-tag',
    // Round 2: the card ladder's every step at its widest, and the rows at
    // the longest figures (the critic's P2-2 and P2-6).
    'item-listing-figure-14',
    'item-listing-figure-17',
    'item-listing-figure-21',
    'item-quote-figure-14',
    'item-quote-figure-17',
    'item-quote-figure-21',
    'pay-figure-14',
    'pay-figure-17',
    'pay-several-figure-lines',
    'row-longest-figure',
    'quote-row-longest-figure',
    // Round 3: the shop's rows on every look, Rural's narrow tags included;
    // the rows either side of the re-flow's cut; the strip's longest total.
    'offers',
    'plugin-missing-quotes',
    'quotes-signs',
    'pay-inr',
    'quote-row-1m',
    'row-15-16',
    'row-17',
    'quote-row-18',
    'row-21',
    'pay-several-strip-long-figure',
    // Round 4 (the critic's P3-4): the strip's total at 18 and 21
    // characters, either side of where ` XEC` stood alone on its line.
    'pay-several-strip-18',
    'pay-several-strip-21',
].join(',');
/*
 * The short screens (the 8g1 critic's P2-2): two heights shorter than the
 * page passes' 844 and 900, where a sign that fits those first stops
 * fitting. A sticky sign stays at its inset while its region scrolls, so on
 * a short screen a tall one keeps its address, and then its name, off
 * screen at every scroll but the end. Run for the looks each page pass
 * found a sticky sign on (`from`), and only there (`?sticky=`,
 * `layout/probe.ts`): a look with no sticky sign costs nothing, and a run
 * with none skips the pass.
 *
 * **What these sizes are, and what the pass does not measure.** 375x667 and
 * 1280x720 are device screen sizes, not browser viewports: the probe
 * emulates no browser chrome (`mobile: false`), so a viewport with its
 * toolbars up is shorter than either (the critic's figure for an iPhone SE
 * with Safari's toolbars is about 548px tall; unmeasured here). Not
 * measured: a landscape phone (844x390), which takes the desk rules, where
 * the tracked fixture `t-fixture-private` would fail (the critic's reading
 * through the probe page, not a runner pass); and a look that is sticky
 * only under a condition the phone and desk passes do not enter (a
 * reduced-motion block, say), because the pass measures only the looks
 * those two passes found sticky (`stickySeen`).
 */
export const SHORT_VIEWPORTS = [
    { name: 'short-phone', width: 375, height: 667, from: 'mobile' },
    { name: 'short-desk', width: 1280, height: 720, from: 'desktop' },
];
export const WINDOW_SCREENS =
    'shop-window-cycle,shop-window-browse,shop-window-quotes,shop-window-wall,' +
    // The touch wall (2026-09-21): the strip and its steppers, and the
    // payment the press froze. Every wall pass but the desk wall reads this
    // list, so the portrait screen and the counter tablet measure them.
    'shop-window-touch-quotes,shop-window-touch-quotes-pay,' +
    // A payment of several items, and of the cap (2026-09-24, the critic,
    // P1): the tablet band held for one item and was cut again at three.
    'shop-window-touch-quotes-pay-3,shop-window-touch-quotes-pay-35,' +
    // An unbuyable offer on a wall (2026-09-23), in a Browse row, and the
    // Cycle card that skips it (since 2026-09-24): the tall wall and the
    // tablet lay both out on their own.
    'shop-window-unbuyable,shop-window-cycle-unbuyable,' +
    // The sign under stress (8f2): a 32-byte name on the Cycle card and in
    // Browse, at the desk width and at a wall size, a name in stacked-mark
    // capitals and a CJK name (`the-sellers-name-stands-whole`).
    'shop-window-long-name,shop-window-browse-long-name,shop-window-stacked-name,shop-window-cjk-name,' +
    'shop-window-wall-long-name,shop-window-wall-browse-long-name,' +
    // The rows of the wall at long figures (round 3, P2-3 of the critic):
    // the counter tablet is where a 14-character listing and a 17-character
    // quote first failed to fit on main.
    'shop-window-browse-long-figures,shop-window-quotes-long-figures,' +
    'shop-window-wall-browse-long-figures,shop-window-touch-quotes-long-figures,shop-window-touch-quotes-16,' +
    // The Cycle card at the rows cuts (round 4) and at the widest figure of
    // each step of its own ladder, and the eight-byte listing as a page
    // screen: every one measured on every wall pass since the card has a
    // ladder.
    'shop-window-cycle-listing-16,shop-window-cycle-listing-17,shop-window-cycle-listing-18,shop-window-cycle-quote-16,' +
    'shop-window-cycle-quote-17,shop-window-cycle-quote-18,shop-window-cycle-quote-19,shop-window-cycle-listing-5,' +
    'shop-window-cycle-listing-6,shop-window-cycle-listing-7,shop-window-cycle-listing-9,shop-window-cycle-listing-11,' +
    'shop-window-cycle-listing-14,shop-window-cycle-listing-20,shop-window-cycle-listing-24,shop-window-cycle-listing-26,' +
    'shop-window-cycle-quote-8,shop-window-cycle-quote-9,shop-window-cycle-quote-10,shop-window-cycle-quote-13,' +
    'shop-window-cycle-quote-22,shop-window-cycle-quote-26,shop-window-cycle-quote-30,shop-window-cycle-usd-5,' +
    'shop-window-cycle-usd-7,shop-window-cycle-usd-9,shop-window-cycle-usd-11,shop-window-cycle-usd-13,shop-window-cycle-usd-22,' +
    'shop-window-cycle-usd-27,shop-window-cycle-cny-27,' +
    'shop-window-cycle-longest-figure';
/*
 * The two desk wall passes (the Cycle card's ladder, 2026-10-13). A wall is
 * also a 1280-wide panel: 1280x900 is the desk pass's own size and 1280x800
 * the landscape tablet's, and the Cycle card printed a figure that was not
 * the covenant's at both — at 1280x900 Neo's `.78 XEC` under the code, at
 * 1280x800 the card over the status line — while no pass measured a wall
 * screen there but the page screens the desk pass reaches by the canvas
 * split. So the desk wall pass measures, at 1280x900, every wall screen the
 * canvas split keeps off the desk pass (`DESK_WALL_SCREENS`: the touch wall,
 * the Cycle ladder and the canvas twins; `deskWallScreens()` in
 * layout/screenSplit.ts), and the short wall pass measures every wall screen
 * at 1280x800 (`WINDOW_SCREENS`). Both are held to the shot plan by
 * `the-shots-cover-every-probed-screen-and-variant`, which imports both.
 */
export const DESK_WALL = { name: 'desk-wall', width: 1280, height: 900 };
export const SHORT_WALL = { name: 'short-wall', width: 1280, height: 800 };
export const DESK_WALL_SCREENS =
    'shop-window-wall,shop-window-wall-long-name,shop-window-wall-browse-long-name,shop-window-wall-browse-long-figures,' +
    'shop-window-touch-quotes-long-figures,shop-window-touch-quotes-16,shop-window-cycle-listing-16,shop-window-cycle-listing-17,' +
    'shop-window-cycle-listing-18,' +
    'shop-window-cycle-quote-16,shop-window-cycle-quote-17,shop-window-cycle-quote-18,shop-window-cycle-quote-19,' +
    'shop-window-cycle-listing-5,shop-window-cycle-listing-6,shop-window-cycle-listing-7,shop-window-cycle-listing-9,' +
    'shop-window-cycle-listing-11,shop-window-cycle-listing-14,shop-window-cycle-listing-20,shop-window-cycle-listing-24,' +
    'shop-window-cycle-listing-26,shop-window-cycle-quote-8,shop-window-cycle-quote-9,shop-window-cycle-quote-10,' +
    'shop-window-cycle-quote-13,shop-window-cycle-quote-22,shop-window-cycle-quote-26,shop-window-cycle-quote-30,' +
    'shop-window-cycle-usd-5,shop-window-cycle-usd-7,shop-window-cycle-usd-9,shop-window-cycle-usd-11,shop-window-cycle-usd-13,' +
    'shop-window-cycle-usd-22,shop-window-cycle-usd-27,shop-window-cycle-cny-27,shop-window-touch-quotes,' +
    'shop-window-touch-quotes-pay,shop-window-touch-quotes-pay-3,shop-window-touch-quotes-pay-35';
/** The page passes' viewports, and the contrast pass's. */
export const ALL_VIEWPORTS = [...VIEWPORTS, CANVAS];

/*
 * Pass 3: reduced motion. Three `prefers-reduced-motion` blocks ship in
 * `stall.css` and no guard had ever run under them. Only the animating
 * screens are re-measured — the media doubles a run, and a still page is
 * the page already measured above.
 *
 * The animating screens, each at the width it is painted at. `broadcast`
 * is here because `broadcast.css` is a fifth sheet with its own reduce
 * block and its own two keyframes (`bc-in`, `bc-pulse`) — a block nothing
 * had ever executed — and it is measured on the canvas because that is the
 * only viewport its screens run at. The fixture carries `broadcastStepped`
 * and `broadcastPulse` so both classes are on the tree; without them this
 * pass would still print a tick while stilling nothing.
 *
 * `broadcast-quotes` is the second card the sheet animates: the pulse sits
 * on `[data-role="seller-price"]` there, a different selector in the same
 * reduce block, and a block that stilled only the other role would pass
 * this pass while a stream kept moving.
 */
export const REDUCED = [
    // Renamed with the fixture 2026-09-04: the one publish screen became
    // two record sheets, and both are measured — they share `.sheet`'s
    // transition but not their contents, and a still page is only proved
    // still for the tree that was actually painted.
    // `plugin-missing-quotes` since 2026-09-09: the populated quote rail,
    // whose name button and words line carry the marquee — without it the
    // kill for those two would be proved on no screen at all.
    { vp: VIEWPORTS[0], screens: 'offers,plugin-missing-quotes,publish-name,describe,pay' },
    // `broadcast-ticker-live` since 2026-09-21: the ribbon's own
    // keyframe (`tk-run`), running in this fixture and killed in the
    // sheet's last block — the pinned ticker screens animate nothing
    // and would prove nothing here.
    { vp: CANVAS, screens: 'broadcast,broadcast-quotes,broadcast-ticker-live' },
];
/*
 * Pass 5's screens, the transparent wire (the pass itself is in the runner).
 * **Every clear screen, not one.** Each carries a different figure over the
 * stream — the covenant's asked amount on one, the seller's own quote on the
 * other — and a card this pass never shot is a card nobody proved legible
 * over video.
 */
export const CLEAR_SCREENS = ['broadcast-clear', 'broadcast-quotes-clear', 'broadcast-ticker-clear'];

/**
 * The geometry passes, in the order the walk hands them out and the run says
 * them. Each entry: `key` (the walk's name for it, said on the `geometry
 * passes:` line), `kind` (`PASS_KINDS`), `coverage` (its name in the coverage
 * tables — the reduced-motion passes share one), and what its kind reads:
 * `vp`, `screens`, `block`, `after`. The worn-only road runs on the ordinary
 * probe alone (`looks: 'shipped'`): the kit's page is built from the same
 * probe, and the road is the app's, not the look's.
 */
export function geometryPlan({ looks = 'shipped' } = {}) {
    return [
        ...ALL_VIEWPORTS.map((vp) => ({ key: vp.name, kind: 'page', coverage: vp.name, vp })),
        ...(looks === 'shipped' ? [{ key: 'worn-only sheet', kind: 'worn-only', coverage: 'worn-only-sheet', vp: VIEWPORTS[1] }] : []),
        { key: PORTRAIT.name, kind: 'wall', coverage: PORTRAIT.name, vp: PORTRAIT, screens: WINDOW_SCREENS, block: 'portraitTall' },
        { key: TABLET.name, kind: 'wall', coverage: TABLET.name, vp: TABLET, screens: WINDOW_SCREENS, block: 'portraitShort' },
        { key: DESK_WALL.name, kind: 'wall', coverage: DESK_WALL.name, vp: DESK_WALL, screens: DESK_WALL_SCREENS, block: 'landscapeShort' },
        { key: SHORT_WALL.name, kind: 'wall', coverage: SHORT_WALL.name, vp: SHORT_WALL, screens: WINDOW_SCREENS, block: 'landscapeShort' },
        { key: NARROW.name, kind: 'narrow', coverage: NARROW.name, vp: NARROW, screens: NARROW_SCREENS },
        ...SHORT_VIEWPORTS.map((vp) => ({ key: vp.name, kind: 'short', coverage: vp.name, vp, after: [vp.from] })),
        ...REDUCED.map((pass) => ({
            key: `reduced-motion @${pass.vp.name}`,
            kind: 'reduced',
            coverage: 'reduced-motion',
            vp: pass.vp,
            screens: pass.screens,
        })),
    ];
}

/*
 * The geometry passes read again on another tab on every run with more
 * than one (`the-geometry-passes-read-the-same-on-every-tab`), each compared
 * with the walk's own answer: two picks, the cheapest passes where a tab's
 * state could reach a verdict. Each pick is a list of keys tried in order
 * (`walkPlan`'s `picks`): the first whose walk measured something is read
 * again. The first pick is the short pass at the desk, a page pass with no
 * media feature, where a sticky sign gave it something to measure — and,
 * where no look has a sticky desk sign (the workshop's probe, a selection
 * with none), the reduced-motion pass at the phone instead (2.9–4.2s), so a
 * run reads two passes again whatever it carries (the probe-shard critic's
 * N4: until 2026-10-20 such a run read one). The second is the
 * reduced-motion pass on the canvas, which sets an emulated media feature on
 * its tab and takes it off again. Every pass was read again on the other
 * tab, byte for byte, before these were chosen, and the others cost 4–35s
 * each to read again (`PROBE-RULES.md`, "The geometry passes walk on two
 * tabs"). What a pass the sample does not read could still differ by is held
 * by the page print (`TAB_PRINT`, in the runner). Each is a key of
 * `geometryPlan`'s, which `every-pass-the-runner-runs-is-in-a-coverage-table`
 * holds and the runner checks before it builds: a key the plan no longer has
 * would be read again on no tab, and the walk drops it in silence.
 */
export const GEOMETRY_CANARY = Object.freeze([
    Object.freeze(['short-desk', 'reduced-motion @mobile']),
    Object.freeze(['reduced-motion @canvas']),
]);

/** Pass 4, the rendered-pixel contrast pass, at the page passes' viewports, on its own plan (`layout/contrastPlan.ts`). */
export const CONTRAST_PASS = Object.freeze({ key: 'contrast', kind: 'contrast', coverage: 'contrast', viewports: ALL_VIEWPORTS });

/** Pass 5, the transparent wire, at the canvas over the clear screens. */
export const TRANSPARENCY_PASS = Object.freeze({
    key: 'transparency',
    kind: 'transparency',
    coverage: 'transparency',
    vp: CANVAS,
    screens: CLEAR_SCREENS.join(','),
});

/**
 * Every pass the module lists, in the order the runner runs them: the list
 * the coverage tables are held to (`every-pass-the-runner-runs-is-in-a-coverage-table`).
 * The runner does not build from this list — it builds the geometry walk
 * from `geometryPlan` and the two pixel passes from `CONTRAST_PASS` and
 * `TRANSPARENCY_PASS` — so before it builds anything it holds this list to
 * those (`passesNotRun`) and stops on any difference: an entry here the
 * runner would not run is a pass the tables certify and no run measures
 * (the probe-shard critic's B1, 2026-10-20).
 */
export function runnerPasses({ looks = 'shipped' } = {}) {
    return [...geometryPlan({ looks }), CONTRAST_PASS, TRANSPARENCY_PASS];
}

/** A value as one string, its object keys sorted, for comparing passes by value. */
function canonical(value) {
    if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
    if (value !== null && typeof value === 'object') {
        return `{${Object.keys(value)
            .sort()
            .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
            .join(',')}}`;
    }
    return JSON.stringify(value) ?? 'undefined';
}

/**
 * Where the passes the module lists (`listed`, `runnerPasses`) and the
 * passes the runner builds disagree, one sentence each; none when they are
 * the same passes, by value, in the same order (the probe-shard critic's B1:
 * the coverage tables were held to `runnerPasses`, which the runner never
 * read, so an entry there was certified and never run).
 *
 * `built` is what the runner builds its passes from: `geometry`, the plan
 * its walk hands out (`geometryPlan`, in order); `contrast` and
 * `transparency`, the one pass of each it runs after the walk; `kindsRun`,
 * the geometry kinds it has a runner for. Refused, each by name:
 * - an entry the runner will not run — a geometry entry the plan does not
 *   hold, a second contrast or transparency pass, an entry of a kind the
 *   runner has no runner for;
 * - an entry the runner runs otherwise than listed (the same key, another
 *   value: a viewport, a screen list, a block);
 * - a pass the runner runs that the list does not name;
 * - and an order the runner does not run them in (the geometry passes in
 *   plan order, then the contrast pass, then the transparency pass).
 *
 * Pure (`the-runner-runs-every-pass-the-module-lists`).
 */
export function passesNotRun(listed, { geometry, contrast, transparency, kindsRun }) {
    const faults = [];
    const pixel = { contrast, transparency };
    const geometryAt = new Map(geometry.map((pass, n) => [pass.key, n]));
    const keys = new Set();
    const order = [];
    for (const pass of listed) {
        if (keys.has(pass.key)) faults.push(`the module lists two passes keyed ${pass.key}`);
        keys.add(pass.key);
        if (Object.hasOwn(pixel, pass.kind)) {
            const run = pixel[pass.kind];
            if (canonical(pass) !== canonical(run)) {
                faults.push(
                    `the module lists a ${pass.kind} pass, ${pass.key}, the runner will not run: it runs one ${pass.kind} pass, ` +
                        `${run.key} (${canonical(run)}), and this is ${canonical(pass)}`,
                );
                continue;
            }
            order.push(pass.kind === 'contrast' ? geometry.length : geometry.length + 1);
            continue;
        }
        if (!kindsRun.has(pass.kind)) {
            faults.push(`the module lists ${pass.key}, a ${pass.kind} pass, and the runner has no runner for that kind`);
            continue;
        }
        const n = geometryAt.get(pass.key);
        if (n === undefined) {
            faults.push(`the module lists ${pass.key}, a ${pass.kind} pass, and the runner's geometry walk has no such pass: it would never run`);
            continue;
        }
        if (canonical(pass) !== canonical(geometry[n])) {
            faults.push(`the module lists ${pass.key} as ${canonical(pass)} and the runner runs it as ${canonical(geometry[n])}`);
            continue;
        }
        order.push(n);
    }
    for (const pass of geometry) {
        if (!listed.some((at) => at.key === pass.key && !Object.hasOwn(pixel, at.kind))) {
            faults.push(`the runner runs the geometry pass ${pass.key} and the module does not list it`);
        }
    }
    for (const [kind, run] of Object.entries(pixel)) {
        const named = listed.filter((pass) => pass.kind === kind && canonical(pass) === canonical(run));
        if (named.length === 0) faults.push(`the runner runs the ${kind} pass ${run.key} and the module does not list it`);
        else if (named.length > 1) faults.push(`the module lists the ${kind} pass ${run.key} ${named.length} times; the runner runs it once`);
    }
    if (order.some((at, i) => i > 0 && at <= order[i - 1])) {
        faults.push('the module lists the passes in another order than the runner runs them (the geometry walk in plan order, then contrast, then transparency)');
    }
    return faults;
}

/**
 * Why a page a geometry pass read a verdict on is not one the module names,
 * or undefined (`every-viewport-the-runner-measures-is-a-module-pass`, the
 * probe-shard critic's N1). `pass` must be an entry of the runner's own plan
 * (`plan`, `geometryPlan` as the runner holds it: the same object, never a
 * copy or a spread of one), and the page's size as the page measured it
 * (`measured`, `[innerWidth, innerHeight]`) that entry's viewport. A verdict
 * read at a size the module does not name — a viewport built from
 * constants, a spread of another, arithmetic — is refused here, at run time,
 * where the runner's text check (`runnerViewportLiterals`) catches only the
 * shapes it was written for. Pure.
 */
export function viewportOffPlan(pass, plan, measured) {
    if (pass === undefined || pass === null || !plan.includes(pass)) {
        return `a verdict was read for ${pass?.key ?? 'a pass'} (${canonical(pass?.vp ?? null)}), which is not an entry of the plan probe-passes.mjs lays out`;
    }
    const [width, height] = Array.isArray(measured) ? measured : [];
    if (width !== pass.vp.width || height !== pass.vp.height) {
        return `the page measured ${width}x${height} where the plan's ${pass.key} pass names ${pass.vp.width}x${pass.vp.height}`;
    }
    return undefined;
}
